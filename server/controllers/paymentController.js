const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Promotion = require("../models/Promotion");
const WalletService = require("../services/walletService");
const affiliateTrackingService = require("../services/affiliateTrackingService");
const referralService = require("../services/referralService");
const promotionService = require("../services/promotionService");
const logger = require("../utils/logger");
const paymentGatewayRoutingService = require("../services/paymentGatewayRoutingService");
const uddoktaPayService = require("../services/uddoktaPayService");
const {
  createDeposit: createPayment24x7Deposit,
  getErrorMessage,
  getPaymentStatus,
  normalizeMethod,
  verifyCallbackSignature,
} = require("../services/payment24x7Service");

const COMPLETED_DEPOSIT_STATUSES = ["completed", "approved"];
const FINAL_WITHDRAWAL_STATUSES = [
  "approved",
  "completed",
  "rejected",
  "failed",
];

const minorToAmount = (minor) =>
  Math.round((Number(minor || 0) / 100) * 100) / 100;

const isValidEmail = (value) => {
  if (!value || typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const resolveGatewayEmail = (user) => {
  const email = typeof user?.email === "string" ? user.email.trim() : "";
  if (isValidEmail(email)) return email.toLowerCase();

  const phone = String(user?.phone || "")
    .replace(/\D/g, "")
    .trim();
  if (phone) return `${phone}@dexwine.local`;

  return `${user?._id || "user"}@dexwine.local`;
};

const buildCallbackUrl = () =>
  process.env.PAYMENT24X7_CALLBACK_URL ||
  `${process.env.BASE_URL || "http://localhost:5000"}/api/payments/webhook`;

const toGatewayHttpStatus = (error) => {
  if (!String(error?.code || "").startsWith("PAYMENT24X7")) return 500;
  if (error?.status === 422) return 422;
  if (error?.status === 504) return 504;
  if (error?.status === 503) return 503;
  if (error?.status >= 400 && error?.status < 500) return 502;
  return 502;
};

const findDepositByPayment24x7Payload = (payload) =>
  Deposit.findOne({
    $or: [
      { referenceId: payload?.merchant_reference },
      { "propayDetails.orderNo": payload?.reference },
    ].filter((item) => Object.values(item)[0]),
  });

const findDepositByReference = (reference, userId = null) => {
  const query = {
    $or: [{ "propayDetails.orderNo": reference }, { referenceId: reference }],
  };

  if (userId) query.user = userId;
  return Deposit.findOne(query);
};

const findWithdrawalByPayment24x7Payload = (payload) => {
  const withdrawalId =
    payload?.metadata?.withdrawalId || payload?.metadata?.withdrawal_id || null;

  const conditions = [
    payload?.merchant_reference
      ? { referenceId: payload.merchant_reference }
      : null,
    payload?.reference ? { "propayDetails.orderNo": payload.reference } : null,
    payload?.reference ? { transactionId: payload.reference } : null,
    withdrawalId ? { _id: withdrawalId } : null,
  ].filter(Boolean);

  if (!conditions.length) return null;
  return Withdrawal.findOne({ $or: conditions });
};

const markDepositTransactionApproved = async (
  depositId,
  transactionId = null,
  session = null,
) => {
  const query = transactionId
    ? { _id: transactionId }
    : {
        type: "deposit",
        "metadata.depositId": String(depositId),
        status: { $in: ["completed", "approved"] },
      };

  const operation = Transaction.findOneAndUpdate(query, {
    $set: {
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (session) operation.session(session);
  await operation;
};

const updateWithdrawalTransactionStatus = async (
  withdrawal,
  status,
  extraFields = {},
  session = null,
) => {
  if (!withdrawal) return null;

  const operation = Transaction.findOneAndUpdate(
    {
      type: "withdrawal",
      status: "pending",
      $or: [
        { "metadata.withdrawalId": withdrawal._id.toString() },
        { user: withdrawal.user, amount: withdrawal.amount },
      ],
    },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...extraFields,
      },
    },
    { sort: { createdAt: -1 }, new: true },
  );

  if (session) operation.session(session);
  return operation;
};

const applySelectedPromotionIfNeeded = async (
  deposit,
  source = "payment24x7",
) => {
  const resolvedPromotionId =
    deposit?.promotion ||
    deposit?.propayDetails?.gatewayResponse?.metadata?.selectedPromotionId ||
    deposit?.propayDetails?.gatewayResponse?.metadata?.promotionId ||
    deposit?.propayDetails?.gatewayResponse?.selectedPromotionId ||
    null;

  if (!resolvedPromotionId) return { applied: false, skipped: true };

  const promotionAppliedAt =
    deposit.promotionAppliedAt ||
    deposit.propayDetails?.gatewayResponse?.promotionAppliedAt ||
    null;

  if (promotionAppliedAt) {
    return { applied: true, alreadyApplied: true };
  }

  const result = await promotionService.applyDepositPromotion(
    deposit.user.toString(),
    resolvedPromotionId.toString(),
    Number(deposit.amount || 0),
    deposit._id.toString(),
  );

  if (!result.success) {
    return {
      applied: false,
      skipped: false,
      success: false,
      message: result.message || "Failed to apply selected promotion",
    };
  }

  deposit.promotionAppliedAt = new Date();
  deposit.propayDetails = deposit.propayDetails || {};
  deposit.propayDetails.gatewayResponse = {
    ...(deposit.propayDetails.gatewayResponse || {}),
    promotionAppliedAt: deposit.promotionAppliedAt,
    promotionResult: {
      source,
      bonusAmount: result.bonusAmount,
      turnoverRequired: result.turnoverRequired,
      promotionTurnoverId: result.promotionTurnoverId,
      userPromotionId: result.userPromotionId,
    },
  };

  await deposit.save();

  return {
    applied: true,
    success: true,
    result,
  };
};

const sendDepositNotificationIfAvailable = async (req, deposit, amount) => {
  const notificationService = req.app.get("notificationService");
  if (!notificationService?.sendDepositNotification) return null;

  return notificationService.sendDepositNotification(
    deposit.user,
    amount,
    "approved",
    deposit._id,
  );
};

const sendWithdrawalNotificationIfAvailable = async (
  req,
  withdrawal,
  status,
) => {
  const notificationService = req.app.get("notificationService");
  if (!notificationService?.sendWithdrawalNotification) return null;

  return notificationService.sendWithdrawalNotification(
    withdrawal.user,
    withdrawal.amount,
    status,
    withdrawal._id,
  );
};

const approvePayment24x7Withdrawal = async (withdrawal, payload, req) => {
  const withdrawalId = withdrawal._id.toString();
  const merchantReference =
    payload.merchant_reference || withdrawal.referenceId;
  const payment24x7Reference =
    payload.reference || withdrawal.propayDetails?.orderNo;
  const session = await User.startSession();
  let updated = null;

  if (FINAL_WITHDRAWAL_STATUSES.includes(withdrawal.status)) {
    logger.info("Payment24x7 duplicate withdrawal callback ignored", {
      withdrawalId,
      merchantReference,
      payment24x7Reference,
      callbackEvent: payload.event,
      processingResult: "already_final",
    });
    return { handled: true, alreadyProcessed: true };
  }

  try {
    await session.withTransaction(async () => {
      updated = await Withdrawal.findOneAndUpdate(
        {
          _id: withdrawal._id,
          status: { $nin: FINAL_WITHDRAWAL_STATUSES },
        },
        {
          $set: {
            status: "approved",
            approvedAt: payload.reviewed_at
              ? new Date(payload.reviewed_at)
              : new Date(),
            processedAt: payload.reviewed_at
              ? new Date(payload.reviewed_at)
              : new Date(),
            adminNote: payload.review_note || "Approved by Payment24x7",
            transactionId: payment24x7Reference,
            "propayDetails.orderNo": payment24x7Reference,
            "propayDetails.transactionStatus": "success",
            "propayDetails.charge": payload.commission ?? null,
            "propayDetails.deductedAmount": payload.total_debit ?? null,
            "propayDetails.lastStatusCheckedAt": new Date(),
            "propayDetails.gatewayResponse": {
              ...(withdrawal.propayDetails?.gatewayResponse || {}),
              callbackResponse: payload,
            },
          },
        },
        { new: true, session },
      );

      if (!updated) return;

      await updateWithdrawalTransactionStatus(
        updated,
        "approved",
        {
          approvedAt: updated.approvedAt,
          "metadata.payment24x7Reference": payment24x7Reference,
          "metadata.merchantReference": merchantReference,
          "metadata.callbackEvent": payload.event,
        },
        session,
      );
    });
  } finally {
    session.endSession();
  }

  if (!updated) {
    return { handled: true, alreadyProcessed: true };
  }

  await sendWithdrawalNotificationIfAvailable(req, updated, "approved").catch(
    (error) => {
      logger.error("Payment24x7 withdrawal notification error", {
        withdrawalId,
        message: error.message,
      });
    },
  );

  logger.info("Payment24x7 withdrawal callback processed", {
    withdrawalId,
    merchantReference,
    payment24x7Reference,
    callbackEvent: payload.event,
    processingResult: "approved",
  });

  return { handled: true, alreadyProcessed: false };
};

const rejectPayment24x7Withdrawal = async (withdrawal, payload, req) => {
  const withdrawalId = withdrawal._id.toString();
  const merchantReference =
    payload.merchant_reference || withdrawal.referenceId;
  const payment24x7Reference =
    payload.reference || withdrawal.propayDetails?.orderNo;
  const session = await User.startSession();
  let updated = null;
  let refunded = false;

  try {
    await session.withTransaction(async () => {
      updated = await Withdrawal.findOneAndUpdate(
        {
          _id: withdrawal._id,
          status: { $nin: FINAL_WITHDRAWAL_STATUSES },
        },
        {
          $set: {
            status: "rejected",
            rejectionReason:
              payload.review_note || "Payment24x7 withdrawal rejected",
            adminNote: payload.review_note || "Rejected by Payment24x7",
            processedAt: payload.reviewed_at
              ? new Date(payload.reviewed_at)
              : new Date(),
            transactionId: payment24x7Reference,
            "propayDetails.orderNo": payment24x7Reference,
            "propayDetails.transactionStatus": "failed",
            "propayDetails.charge": payload.commission ?? null,
            "propayDetails.deductedAmount": payload.total_debit ?? null,
            "propayDetails.lastStatusCheckedAt": new Date(),
            "propayDetails.gatewayResponse": {
              ...(withdrawal.propayDetails?.gatewayResponse || {}),
              callbackResponse: payload,
            },
          },
        },
        { new: true, session },
      );

      if (!updated) return;

      const existingRefund = await Transaction.findOne({
        type: "refund",
        "metadata.withdrawalId": withdrawalId,
      })
        .session(session)
        .lean();

      if (!existingRefund) {
        await WalletService.updateWallet(
          updated.user,
          updated.amount,
          "main",
          "refund",
          {
            description: "Payment24x7 withdrawal rejection refund",
            withdrawalId,
            payment24x7Reference,
            merchantReference,
            paymentMethod: "payment24x7",
            provider: "payment24x7",
            callbackEvent: payload.event,
          },
          session,
        );
        refunded = true;
      }

      await updateWithdrawalTransactionStatus(
        updated,
        "rejected",
        {
          rejectionReason: updated.rejectionReason,
          "metadata.payment24x7Reference": payment24x7Reference,
          "metadata.merchantReference": merchantReference,
          "metadata.callbackEvent": payload.event,
        },
        session,
      );
    });
  } finally {
    session.endSession();
  }

  if (!updated) {
    logger.info("Payment24x7 duplicate withdrawal callback ignored", {
      withdrawalId,
      merchantReference,
      payment24x7Reference,
      callbackEvent: payload.event,
      processingResult: "already_final",
    });
    return { handled: true, alreadyProcessed: true };
  }

  await sendWithdrawalNotificationIfAvailable(req, updated, "rejected").catch(
    (error) => {
      logger.error("Payment24x7 withdrawal notification error", {
        withdrawalId,
        message: error.message,
      });
    },
  );

  logger.info("Payment24x7 withdrawal callback processed", {
    withdrawalId,
    merchantReference,
    payment24x7Reference,
    callbackEvent: payload.event,
    processingResult: "rejected",
    refunded,
  });

  return { handled: true, alreadyProcessed: false, refunded };
};

const completePayment24x7Deposit = async (deposit, payload, req) => {
  const depositId = deposit._id.toString();
  const merchantReference = payload.merchant_reference || deposit.referenceId;
  const payment24x7Reference =
    payload.reference || deposit.propayDetails?.orderNo;
  const session = await User.startSession();
  let updated = null;
  let existingTransaction = null;
  let walletSkipped = false;

  if (COMPLETED_DEPOSIT_STATUSES.includes(deposit.status)) {
    await markDepositTransactionApproved(depositId);
    const promotionResult = await applySelectedPromotionIfNeeded(
      deposit,
      "payment24x7-duplicate-callback",
    );

    logger.info("Payment24x7 duplicate deposit callback ignored", {
      depositId,
      merchantReference,
      payment24x7Reference,
      callbackEvent: payload.event,
      processingResult: "already_completed",
      promotionApplied: !!promotionResult?.applied,
    });
    return { handled: true, alreadyProcessed: true };
  }

  if (!merchantReference) {
    return { handled: false, reason: "Merchant reference missing" };
  }

  const creditedAmount = minorToAmount(payload.amount_minor);
  if (!Number.isFinite(creditedAmount) || creditedAmount <= 0) {
    throw new Error("Invalid Payment24x7 callback amount");
  }

  const provider =
    normalizeMethod(payload.provider) || payload.provider || null;
  const gatewayResponse = {
    ...(deposit.propayDetails?.gatewayResponse || {}),
    callbackResponse: payload,
  };

  try {
    await session.withTransaction(async () => {
      updated = await Deposit.findOneAndUpdate(
        {
          _id: deposit._id,
          status: { $nin: COMPLETED_DEPOSIT_STATUSES },
        },
        {
          $set: {
            amount: creditedAmount,
            status: "completed",
            completedAt: payload.paid_at
              ? new Date(payload.paid_at)
              : new Date(),
            approvedAt: payload.verified_at
              ? new Date(payload.verified_at)
              : new Date(),
            provider,
            paymentMethod: "payment24x7",
            "paymentDetails.transactionId": payload.trx_id || null,
            "propayDetails.orderNo": payment24x7Reference,
            "propayDetails.gatewayStatus": "completed",
            "propayDetails.completedAt": payload.verified_at
              ? new Date(payload.verified_at)
              : new Date(),
            "propayDetails.gatewayResponse": gatewayResponse,
          },
        },
        { new: true, session },
      );

      if (!updated) return;

      existingTransaction = await Transaction.findOne({
        user: updated.user,
        type: "deposit",
        status: { $in: ["completed", "approved"] },
        "metadata.depositId": updated._id.toString(),
      })
        .session(session)
        .lean();

      if (!existingTransaction) {
        const walletUpdate = await WalletService.updateWallet(
          updated.user,
          creditedAmount,
          "main",
          "deposit",
          {
            description: `Payment24x7 Deposit - Reference: ${payment24x7Reference}`,
            depositId: updated._id.toString(),
            invoiceId: payment24x7Reference,
            payment24x7Reference,
            merchantReference,
            paymentMethod: "payment24x7",
            provider,
            amountMinor: payload.amount_minor,
            trxId: payload.trx_id || null,
          },
          session,
        );

        await markDepositTransactionApproved(
          updated._id.toString(),
          walletUpdate?.transactionId,
          session,
        );
      } else {
        walletSkipped = true;
        await markDepositTransactionApproved(
          updated._id.toString(),
          null,
          session,
        );
      }
    });
  } finally {
    session.endSession();
  }

  if (!updated) {
    await markDepositTransactionApproved(depositId);
    logger.info("Payment24x7 callback ignored after atomic duplicate check", {
      depositId,
      merchantReference,
      payment24x7Reference,
      callbackEvent: payload.event,
      processingResult: "already_processed",
    });
    return { handled: true, alreadyProcessed: true };
  }

  if (!existingTransaction) {
    affiliateTrackingService.recordDepositCompleted(updated).catch((error) => {
      logger.error("Affiliate Payment24x7 deposit tracking error", {
        depositId: updated._id.toString(),
        message: error.message,
      });
    });

    referralService.recordFirstDepositCompleted(updated).catch((error) => {
      logger.error("Referral Payment24x7 deposit tracking error", {
        depositId: updated._id.toString(),
        message: error.message,
      });
    });
  }

  const promotionResult = await applySelectedPromotionIfNeeded(
    updated,
    "payment24x7-callback",
  );

  await sendDepositNotificationIfAvailable(req, updated, creditedAmount).catch(
    (error) => {
      logger.error("Payment24x7 deposit notification error", {
        depositId: updated._id.toString(),
        message: error.message,
      });
    },
  );

  logger.info("Payment24x7 deposit callback processed", {
    depositId: updated._id.toString(),
    merchantReference,
    payment24x7Reference,
    callbackEvent: payload.event,
    processingResult: "completed",
    promotionApplied: !!promotionResult?.applied,
    walletSkipped,
  });

  return {
    handled: true,
    alreadyProcessed: false,
    promotionApplied: !!promotionResult?.applied,
  };
};

const completeUddoktaPayDeposit = async (deposit, payload, req) => {
  const depositId = deposit._id.toString();
  const invoiceId =
    payload.invoice_id || payload.invoiceId || deposit.propayDetails?.orderNo;
  const session = await User.startSession();
  let updated = null;
  let existingTransaction = null;
  let walletSkipped = false;

  if (COMPLETED_DEPOSIT_STATUSES.includes(deposit.status)) {
    await markDepositTransactionApproved(depositId);
    const promotionResult = await applySelectedPromotionIfNeeded(
      deposit,
      "uddoktapay-duplicate-callback",
    );

    logger.info("UddoktaPay duplicate deposit callback ignored", {
      depositId,
      invoiceId,
      processingResult: "already_completed",
      promotionApplied: !!promotionResult?.applied,
    });
    return { handled: true, alreadyProcessed: true };
  }

  const creditedAmount = Number(payload.amount || deposit.amount);
  if (!Number.isFinite(creditedAmount) || creditedAmount <= 0) {
    throw new Error("Invalid UddoktaPay callback amount");
  }

  const provider =
    normalizeMethod(payload.payment_method) ||
    payload.payment_method ||
    deposit.provider ||
    "uddoktapay";

  const gatewayResponse = {
    ...(deposit.propayDetails?.gatewayResponse || {}),
    callbackResponse: payload,
  };

  try {
    await session.withTransaction(async () => {
      updated = await Deposit.findOneAndUpdate(
        {
          _id: deposit._id,
          status: { $nin: COMPLETED_DEPOSIT_STATUSES },
        },
        {
          $set: {
            amount: creditedAmount,
            status: "completed",
            completedAt: new Date(),
            approvedAt: new Date(),
            provider,
            paymentMethod: "uddoktapay",
            "paymentDetails.transactionId": payload.transaction_id || null,
            "propayDetails.orderNo": invoiceId,
            "propayDetails.gatewayStatus": "completed",
            "propayDetails.completedAt": new Date(),
            "propayDetails.gatewayResponse": gatewayResponse,
          },
        },
        { new: true, session },
      );

      if (!updated) return;

      existingTransaction = await Transaction.findOne({
        user: updated.user,
        type: "deposit",
        status: { $in: ["completed", "approved"] },
        "metadata.depositId": updated._id.toString(),
      })
        .session(session)
        .lean();

      if (!existingTransaction) {
        const walletUpdate = await WalletService.updateWallet(
          updated.user,
          creditedAmount,
          "main",
          "deposit",
          {
            description: `UddoktaPay Deposit - Invoice: ${invoiceId}`,
            depositId: updated._id.toString(),
            invoiceId,
            paymentMethod: "uddoktapay",
            provider,
            trxId: payload.transaction_id || null,
          },
          session,
        );

        await markDepositTransactionApproved(
          updated._id.toString(),
          walletUpdate?.transactionId,
          session,
        );
      } else {
        walletSkipped = true;
        await markDepositTransactionApproved(
          updated._id.toString(),
          null,
          session,
        );
      }
    });
  } finally {
    session.endSession();
  }

  if (!updated) {
    await markDepositTransactionApproved(depositId);
    logger.info("UddoktaPay callback ignored after atomic duplicate check", {
      depositId,
      invoiceId,
      processingResult: "already_processed",
    });
    return { handled: true, alreadyProcessed: true };
  }

  if (!existingTransaction) {
    affiliateTrackingService.recordDepositCompleted(updated).catch((error) => {
      logger.error("Affiliate UddoktaPay deposit tracking error", {
        depositId: updated._id.toString(),
        message: error.message,
      });
    });

    referralService.recordFirstDepositCompleted(updated).catch((error) => {
      logger.error("Referral UddoktaPay deposit tracking error", {
        depositId: updated._id.toString(),
        message: error.message,
      });
    });
  }

  const promotionResult = await applySelectedPromotionIfNeeded(
    updated,
    "uddoktapay-callback",
  );

  await sendDepositNotificationIfAvailable(req, updated, creditedAmount).catch(
    (error) => {
      logger.error("UddoktaPay deposit notification error", {
        depositId,
        message: error.message,
      });
    },
  );

  logger.info("UddoktaPay deposit callback processed", {
    depositId: updated._id.toString(),
    invoiceId,
    processingResult: "completed",
    promotionApplied: !!promotionResult?.applied,
    walletSkipped,
  });

  return {
    handled: true,
    alreadyProcessed: false,
    promotionApplied: !!promotionResult?.applied,
  };
};

exports.createPaymentController = async (req, res) => {
  try {
    const activeGateway = await paymentGatewayRoutingService.getActiveGateway();
    if (!activeGateway) {
      return res.status(503).json({
        success: false,
        message:
          "Payment service is temporarily unavailable. Please try again later.",
      });
    }

    const { amount } = req.body;
    const isUddokta = activeGateway === "uddoktapay";
    const rawMethod =
      req.body.provider || req.body.method || req.body.paymentMethod;
    const method = isUddokta
      ? normalizeMethod(rawMethod) || "uddoktapay"
      : normalizeMethod(rawMethod);

    const selectedPromotionId =
      req.body.selectedPromotionId ||
      req.body.promotionId ||
      req.body.promotion ||
      null;

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (!isUddokta && !method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    const user = await User.findById(req.user.id).select(
      "_id fullName email phone",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (selectedPromotionId) {
      const promotion = await Promotion.findById(selectedPromotionId);
      if (promotion) {
        const eligibility = await promotionService.validatePromotionEligibility(
          req.user.id,
          promotion,
        );

        if (!eligibility.isEligible) {
          return res.status(400).json({
            success: false,
            message: eligibility.reason,
          });
        }
      }
    }

    const deposit = await Deposit.create({
      user: user._id,
      amount: Number(amount),
      paymentMethod: isUddokta ? "uddoktapay" : "payment24x7",
      provider: method,
      promotion: selectedPromotionId || null,
      status: "pending",
      propayDetails: {
        gatewayStatus: "initiated",
        initiatedAt: new Date(),
      },
    });

    const metadata = {
      user_id: user._id.toString(),
      userId: user._id.toString(),
      depositId: deposit._id.toString(),
      selectedPromotionId: selectedPromotionId
        ? String(selectedPromotionId)
        : null,
    };

    if (isUddokta) {
      try {
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";

        const payment = await uddoktaPayService.createPayment({
          fullName: user.fullName || "Customer",
          email: resolveGatewayEmail(user),
          amount: Number(amount),
          metadata,
          redirectUrl: `${clientUrl}/deposit?status=success&depositId=${deposit._id}`,
          cancelUrl: `${clientUrl}/deposit?status=cancel&depositId=${deposit._id}`,
          webhookUrl: `${baseUrl}/api/payments/uddoktapay/webhook`,
        });

        deposit.propayDetails.orderNo = payment.invoiceId;
        deposit.propayDetails.gatewayStatus = "pending";
        deposit.propayDetails.gatewayResponse = {
          ...payment.raw,
          metadata,
        };
        await deposit.save();

        logger.info("UddoktaPay deposit initiated", {
          depositId: deposit._id.toString(),
          merchantReference: deposit.referenceId,
          invoiceId: payment.invoiceId,
        });

        return res.status(200).json({
          success: true,
          message: "Payment initiated successfully",
          data: {
            depositId: deposit._id,
            paymentUrl: payment.paymentUrl,
            payment_url: payment.paymentUrl,
            invoiceId: payment.invoiceId,
            reference: payment.invoiceId,
            referenceId: deposit.referenceId,
          },
        });
      } catch (paymentError) {
        const errMsg = uddoktaPayService.getErrorMessage(paymentError);
        deposit.status = "rejected";
        deposit.rejectionReason = errMsg;
        deposit.propayDetails.gatewayStatus = "failed";
        deposit.propayDetails.gatewayResponse = {
          error: errMsg,
        };
        await deposit.save();

        logger.error("UddoktaPay deposit initiation failed", {
          depositId: deposit._id.toString(),
          merchantReference: deposit.referenceId,
          message: errMsg,
        });

        return res.status(502).json({
          success: false,
          message: errMsg,
        });
      }
    }

    try {
      const payment = await createPayment24x7Deposit({
        merchantReference: deposit.referenceId,
        amount: Number(amount),
        method,
        customerName: user.fullName,
        customerEmail: resolveGatewayEmail(user),
        callbackUrl: buildCallbackUrl(),
        metadata,
      });

      deposit.propayDetails.orderNo = payment.reference;
      deposit.propayDetails.gatewayStatus = "pending";
      deposit.propayDetails.gatewayResponse = {
        ...payment,
        metadata,
      };
      await deposit.save();

      logger.info("Payment24x7 deposit initiated", {
        depositId: deposit._id.toString(),
        merchantReference: deposit.referenceId,
        payment24x7Reference: payment.reference,
      });

      return res.status(200).json({
        success: true,
        message: "Payment initiated successfully",
        data: {
          depositId: deposit._id,
          paymentUrl: payment.payment_url,
          payment_url: payment.payment_url,
          invoiceId: payment.reference,
          reference: payment.reference,
          referenceId: deposit.referenceId,
        },
      });
    } catch (paymentError) {
      deposit.status = "rejected";
      deposit.rejectionReason = getErrorMessage(paymentError);
      deposit.propayDetails.gatewayStatus = "failed";
      deposit.propayDetails.gatewayResponse = {
        error: getErrorMessage(paymentError),
      };
      await deposit.save();

      logger.error("Payment24x7 deposit initiation failed", {
        depositId: deposit._id.toString(),
        merchantReference: deposit.referenceId,
        message: getErrorMessage(paymentError),
      });

      return res.status(toGatewayHttpStatus(paymentError)).json({
        success: false,
        message: getErrorMessage(paymentError),
      });
    }
  } catch (error) {
    logger.error("Create payment controller error", {
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: "Server error while creating payment",
    });
  }
};

exports.verifyPaymentController = async (req, res) => {
  try {
    const reference =
      req.body.reference ||
      req.body.invoice_id ||
      req.body.invoiceId ||
      req.body.order_no ||
      req.body.orderNo;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment24x7 reference is required",
      });
    }

    const deposit = await findDepositByReference(reference, req.user?.id);

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    if (COMPLETED_DEPOSIT_STATUSES.includes(deposit.status)) {
      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        data: {
          depositId: deposit._id,
          reference,
          alreadyProcessed: true,
        },
      });
    }

    if (deposit.paymentMethod === "uddoktapay") {
      const verifyRes = await uddoktaPayService.verifyPayment(
        deposit.propayDetails?.orderNo || reference,
      );
      const raw = verifyRes?.raw || {};
      const status = String(raw.status || "").toUpperCase();

      deposit.propayDetails = deposit.propayDetails || {};
      deposit.propayDetails.gatewayResponse = {
        ...(deposit.propayDetails.gatewayResponse || {}),
        lastVerifyResponse: raw,
      };

      if (status === "COMPLETED") {
        await completeUddoktaPayDeposit(deposit, raw, req);
        return res.status(200).json({
          success: true,
          message: "Payment verified and credited successfully",
          data: {
            depositId: deposit._id,
            reference,
            status: "completed",
          },
        });
      }

      if (status === "CANCELLED" || status === "FAILED") {
        deposit.status = "rejected";
        deposit.rejectionReason =
          raw.message || `Payment ${status.toLowerCase()}`;
        deposit.propayDetails.gatewayStatus = "failed";
        await deposit.save();

        return res.status(400).json({
          success: false,
          message: deposit.rejectionReason,
        });
      }

      await deposit.save();

      return res.status(202).json({
        success: false,
        message: "Payment is pending completion.",
        data: {
          depositId: deposit._id,
          reference,
          status: status || deposit.status,
        },
      });
    }

    const status = await getPaymentStatus(
      deposit.propayDetails?.orderNo || reference,
    );

    deposit.propayDetails = deposit.propayDetails || {};
    deposit.propayDetails.gatewayResponse = {
      ...(deposit.propayDetails.gatewayResponse || {}),
      lastStatusResponse: status,
    };

    if (status?.status === "failed") {
      deposit.status = "rejected";
      deposit.rejectionReason =
        status?.failure_reason || "Payment24x7 payment failed";
      deposit.propayDetails.gatewayStatus = "failed";
      await deposit.save();

      return res.status(400).json({
        success: false,
        message: deposit.rejectionReason,
      });
    }

    await deposit.save();

    return res.status(202).json({
      success: false,
      message:
        "Payment is awaiting the signed Payment24x7 callback before wallet credit.",
      data: {
        depositId: deposit._id,
        reference,
        status: status?.status || deposit.status,
      },
    });
  } catch (error) {
    logger.error("Verify payment controller error", {
      message: error.message,
    });
    return res.status(toGatewayHttpStatus(error)).json({
      success: false,
      message: error?.message || "Server error while checking payment",
    });
  }
};

exports.handlePaymentWebhookController = async (req, res) => {
  const rawBody =
    typeof req.rawBody === "string"
      ? req.rawBody
      : JSON.stringify(req.body || {});
  const requestUri = req.originalUrl || req.url;

  const signature = verifyCallbackSignature({
    headers: req.headers,
    method: req.method,
    requestUri,
    rawBody,
  });

  if (!signature.valid) {
    logger.warn("Payment24x7 callback rejected", {
      reason: signature.reason,
      requestUri,
    });

    return res.status(401).json({
      success: false,
      message: signature.reason,
    });
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : req.body || {};

    logger.info("Payment24x7 callback received", {
      callbackEvent: payload.event,
      merchantReference: payload.merchant_reference,
      payment24x7Reference: payload.reference,
    });

    const supportedEvents = [
      "deposit.paid",
      "withdrawal.approved",
      "withdrawal.rejected",
    ];

    if (!supportedEvents.includes(payload.event)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported Payment24x7 callback event",
      });
    }

    if (
      payload.event === "withdrawal.approved" ||
      payload.event === "withdrawal.rejected"
    ) {
      const withdrawal = await findWithdrawalByPayment24x7Payload(payload);
      if (!withdrawal) {
        logger.warn("Payment24x7 callback withdrawal not found", {
          callbackEvent: payload.event,
          merchantReference: payload.merchant_reference,
          payment24x7Reference: payload.reference,
        });

        return res.status(200).json({ ok: true });
      }

      const result =
        payload.event === "withdrawal.approved"
          ? await approvePayment24x7Withdrawal(withdrawal, payload, req)
          : await rejectPayment24x7Withdrawal(withdrawal, payload, req);

      return res.status(200).json({
        ok: true,
        alreadyProcessed: !!result.alreadyProcessed,
      });
    }

    const deposit = await findDepositByPayment24x7Payload(payload);
    if (!deposit) {
      logger.warn("Payment24x7 callback deposit not found", {
        callbackEvent: payload.event,
        merchantReference: payload.merchant_reference,
        payment24x7Reference: payload.reference,
      });

      return res.status(200).json({ ok: true });
    }

    const result = await completePayment24x7Deposit(deposit, payload, req);

    return res.status(200).json({
      ok: true,
      alreadyProcessed: !!result.alreadyProcessed,
    });
  } catch (error) {
    logger.error("Payment24x7 callback error", {
      message: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Server error while processing callback",
    });
  }
};

exports.handleUddoktaPayWebhookController = async (req, res) => {
  try {
    const payload = req.body || {};
    const invoiceId =
      payload.invoice_id ||
      payload.invoiceId ||
      payload.metadata?.order_id ||
      payload.metadata?.depositId;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice reference is required in webhook payload",
      });
    }

    const deposit = await findDepositByReference(invoiceId);
    if (!deposit) {
      logger.warn("UddoktaPay webhook deposit not found", {
        invoiceId,
        payload,
      });
      return res.status(200).json({ ok: true });
    }

    const status = String(payload.status || "").toUpperCase();

    if (status === "COMPLETED") {
      const result = await completeUddoktaPayDeposit(deposit, payload, req);
      return res.status(200).json({
        ok: true,
        alreadyProcessed: !!result.alreadyProcessed,
      });
    }

    if (status === "CANCELLED" || status === "FAILED") {
      deposit.status = "rejected";
      deposit.rejectionReason =
        payload.message || `UddoktaPay status: ${status.toLowerCase()}`;
      deposit.propayDetails = deposit.propayDetails || {};
      deposit.propayDetails.gatewayStatus = "failed";
      await deposit.save();

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("UddoktaPay webhook error", {
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: "Server error while processing UddoktaPay callback",
    });
  }
};

exports.cancelPaymentController = async (req, res) => {
  try {
    const referenceId = req.body.referenceId;

    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: "referenceId is required",
      });
    }

    const deposit = await Deposit.findOne({
      referenceId,
      user: req.user?.id || undefined,
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (COMPLETED_DEPOSIT_STATUSES.includes(deposit.status)) {
      return res.status(200).json({
        success: true,
        message: "Payment already completed",
        data: {
          alreadyCompleted: true,
          depositId: deposit._id,
          referenceId,
        },
      });
    }

    if (deposit.status === "cancelled") {
      return res.status(200).json({
        success: true,
        message: "Payment already cancelled",
        data: {
          alreadyCancelled: true,
          depositId: deposit._id,
          referenceId,
        },
      });
    }

    deposit.status = "cancelled";
    deposit.cancelledAt = new Date();
    deposit.propayDetails = deposit.propayDetails || {};
    deposit.propayDetails.gatewayStatus = "cancelled";
    deposit.propayDetails.gatewayResponse = {
      ...(deposit.propayDetails.gatewayResponse || {}),
      cancelResponse: {
        referenceId,
        cancelled_at: new Date().toISOString(),
      },
    };

    await deposit.save();

    return res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      data: {
        depositId: deposit._id,
        referenceId,
        cancelledAt: deposit.cancelledAt,
      },
    });
  } catch (error) {
    logger.error("Cancel payment controller error", {
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: error?.message || "Server error while cancelling payment",
    });
  }
};
