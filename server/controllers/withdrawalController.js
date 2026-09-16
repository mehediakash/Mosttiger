const Withdrawal = require("../models/Withdrawal");
const PaymentMethod = require("../models/PaymentMethod");
const WalletService = require("../services/walletService");
const withdrawalValidationService = require("../services/withdrawalValidationService");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");
const paymentGatewayRoutingService = require("../services/paymentGatewayRoutingService");
const {
  createWithdrawal: createPayment24x7Withdrawal,
  getErrorMessage,
  normalizeMethod,
} = require("../services/payment24x7Service");

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

const updatePendingWithdrawalTransaction = async (
  withdrawal,
  status,
  extraFields = {},
  session = null,
) => {
  if (!withdrawal) return;

  const query = {
    type: "withdrawal",
    status: "pending",
    $or: [
      { "metadata.withdrawalId": withdrawal._id.toString() },
      { user: withdrawal.user, amount: withdrawal.amount },
    ],
  };

  const update = {
    $set: {
      status,
      updatedAt: new Date(),
      ...extraFields,
    },
  };

  const operation = Transaction.findOneAndUpdate(query, update, {
    sort: { createdAt: -1 },
  });

  if (session) operation.session(session);
  await operation;
};

const refundFailedGatewayWithdrawal = async (withdrawal, reason) => {
  const session = await User.startSession();

  try {
    await session.withTransaction(async () => {
      const updated = await Withdrawal.findOneAndUpdate(
        {
          _id: withdrawal._id,
          status: "pending",
          provider: "payment24x7",
        },
        {
          $set: {
            status: "failed",
            rejectionReason: reason,
            "propayDetails.transactionStatus": "failed",
            "propayDetails.gatewayResponse": {
              ...(withdrawal.propayDetails?.gatewayResponse || {}),
              error: reason,
            },
            "propayDetails.lastStatusCheckedAt": new Date(),
          },
        },
        { new: true, session },
      );

      if (!updated) return;

      const existingRefund = await Transaction.findOne({
        type: "refund",
        "metadata.withdrawalId": updated._id.toString(),
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
            description: "Payment24x7 withdrawal request failed refund",
            withdrawalId: updated._id.toString(),
            merchantReference: updated.referenceId,
            paymentMethod: "payment24x7",
            provider: "payment24x7",
          },
          session,
        );
      }

      await updatePendingWithdrawalTransaction(
        updated,
        "failed",
        {
          rejectionReason: reason,
          "metadata.gatewayError": reason,
        },
        session,
      );
    });
  } finally {
    session.endSession();
  }
};

const isUncertainPayment24x7Error = (error) =>
  ["PAYMENT24X7_TIMEOUT", "PAYMENT24X7_NETWORK_ERROR"].includes(error?.code);

// @desc    Get withdrawal methods
// @route   GET /api/payments/withdrawal-methods
// @access  Private
exports.getWithdrawalMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({
      isActive: true,
    }).select("-createdBy -updatedAt");

    const methods = paymentMethods.map((item) => ({
      id: String(item.provider || item.name || item._id).toLowerCase(),
      name:
        item.displayName ||
        item.name ||
        String(item.provider || "").replace(/^\w/, (c) => c.toUpperCase()),
      image: item.image || item.logo || item.icon || "",
    }));

    res.status(200).json({
      success: true,
      data: methods,
    });
  } catch (error) {
    console.error("Get withdrawal methods error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching withdrawal methods",
    });
  }
};

// @desc    Create withdrawal request
// @route   POST /api/payments/withdraw
// @access  Private
//
// WALLET STRUCTURE & RULES:
// ========================
// wallet.main      = Withdrawable balance (deposits + completed bonuses)
// wallet.bonus     = Locked promotional balance (requires turnover completion)
// wallet.freeBets  = Free spin/freebet balance
//
// WITHDRAWAL RULES:
// 1. ONLY wallet.main can be withdrawn
// 2. If active turnover exists: REJECT withdrawal
// 3. If wallet.bonus > 0: REJECT withdrawal (turnover not yet completed)
// 4. When turnover completes: bonus moves from wallet.bonus → wallet.main
// 5. Free spin winnings go to wallet.bonus (requires turnover before withdrawal)
exports.createWithdrawal = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    console.log("WITHDRAW BODY:", req.body);

    const { amount, provider, accountNumber } = req.body;
    const withdrawAmount = Number(amount);
    const normalizedProvider = normalizeMethod(provider);
    const trimmedAccountNumber = String(accountNumber || "").trim();

    if (!amount || !provider || !accountNumber) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!normalizedProvider) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (!Number.isFinite(withdrawAmount) || withdrawAmount < 200) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Minimum withdraw amount is 200 BDT",
      });
    }

    // ✅ CHECK WITHDRAWAL LOCK - Reject if user has active turnover
    const withdrawalCheck =
      await withdrawalValidationService.checkWithdrawalLock(req.user.id);

    if (withdrawalCheck.isLocked) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Complete turnover requirement first",
        locked: true,
        turnoverDetails: withdrawalCheck.turnover,
      });
    }

    const paymentMethodDoc = await PaymentMethod.findOne({
      $or: [
        { provider: normalizedProvider },
        { name: new RegExp("^" + normalizedProvider + "$", "i") },
        ...(normalizedProvider === "nagad"
          ? [{ name: /^nogod$/i }, { provider: "nogod" }, { id: "nogod" }]
          : []),
        { id: normalizedProvider },
      ],
      isActive: true,
    }).session(session);

    if (!paymentMethodDoc) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (withdrawAmount < paymentMethodDoc.minWithdraw) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ${paymentMethodDoc.minWithdraw}`,
      });
    }

    if (withdrawAmount > paymentMethodDoc.maxWithdraw) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal amount is ${paymentMethodDoc.maxWithdraw}`,
      });
    }

    let processingFee = paymentMethodDoc.processingFee;
    if (paymentMethodDoc.processingFeeType === "percentage") {
      processingFee = (withdrawAmount * processingFee) / 100;
    }

    const netAmount = withdrawAmount - processingFee;

    if (netAmount < 0) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Amount too small after processing fee",
      });
    }

    const activeGateway = await paymentGatewayRoutingService.getActiveGateway();
    if (!activeGateway) {
      await session.abortTransaction();
      session.endSession();
      return res.status(503).json({
        success: false,
        message: "Payment gateway is currently unavailable.",
      });
    }

    const user = await User.findById(req.user.id).session(session);
    const currentBalance =
      Number(user?.mainWallet ?? user?.wallet?.main ?? 0) || 0;

    if (currentBalance < withdrawAmount) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
    }

    if (user.wallet && typeof user.wallet.main === "number") {
      user.wallet.main -= withdrawAmount;
    }
    if (typeof user.mainWallet === "number") {
      user.mainWallet -= withdrawAmount;
    }

    await user.save({ session });

    const withdrawal = await Withdrawal.create(
      [
        {
          user: req.user.id,
          amount: withdrawAmount,
          netAmount,
          processingFee,
          paymentMethod: normalizedProvider,
          provider: activeGateway,
          status: "pending",
          paymentDetails: {
            toNumber: trimmedAccountNumber,
            accountNumber: trimmedAccountNumber,
            accountName: trimmedAccountNumber,
            bankName: null,
            branchName: null,
          },
        },
      ],
      { session },
    );

    await Transaction.create(
      [
        {
          user: req.user.id,
          type: "withdrawal",
          amount: withdrawAmount,
          walletType: "main",
          previousBalance: currentBalance,
          newBalance: currentBalance - withdrawAmount,
          status: "pending",
          description: `${activeGateway === "uddoktapay" ? "UddoktaPay" : "Payment24x7"} withdrawal request - ${normalizedProvider}`,
          paymentMethod: activeGateway,
          metadata: {
            withdrawalId: withdrawal[0]._id.toString(),
            merchantReference: withdrawal[0].referenceId,
            payment24x7Reference: null,
            paymentMethod: normalizedProvider,
            provider: activeGateway,
            payoutMethod: normalizedProvider,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    if (activeGateway === "uddoktapay") {
      logger.info("UddoktaPay withdrawal submitted for admin approval", {
        withdrawalId: withdrawal[0]._id.toString(),
        merchantReference: withdrawal[0].referenceId,
        amount: withdrawAmount,
        provider: normalizedProvider,
      });

      return res.status(201).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: {
          withdrawalId: withdrawal[0]._id,
          referenceId: withdrawal[0].referenceId,
          amount: withdrawal[0].amount,
          netAmount: withdrawal[0].netAmount,
          processingFee: withdrawal[0].processingFee,
          status: withdrawal[0].status,
        },
      });
    }

    try {
      const payment24x7Withdrawal = await createPayment24x7Withdrawal({
        merchantReference: withdrawal[0].referenceId,
        amount: withdrawAmount,
        method: normalizedProvider,
        accountNumber: trimmedAccountNumber,
        customerName: user?.fullName,
        customerMobile: trimmedAccountNumber,
        callbackUrl: buildCallbackUrl(),
        metadata: {
          user_id: req.user.id,
          userId: req.user.id,
          withdrawalId: withdrawal[0]._id.toString(),
        },
      });

      const updatedWithdrawal = await Withdrawal.findByIdAndUpdate(
        withdrawal[0]._id,
        {
          $set: {
            transactionId: payment24x7Withdrawal.reference || null,
            "propayDetails.orderNo": payment24x7Withdrawal.reference || null,
            "propayDetails.transactionStatus": "payouting",
            "propayDetails.deductedAmount":
              payment24x7Withdrawal.total_debit || null,
            "propayDetails.charge":
              payment24x7Withdrawal.commission || processingFee || null,
            "propayDetails.gatewayResponse": payment24x7Withdrawal,
            "propayDetails.submittedAt": new Date(),
          },
        },
        { new: true },
      );

      await Transaction.findOneAndUpdate(
        {
          type: "withdrawal",
          "metadata.withdrawalId": withdrawal[0]._id.toString(),
          status: "pending",
        },
        {
          $set: {
            paymentMethod: "payment24x7",
            "metadata.payment24x7Reference":
              payment24x7Withdrawal.reference || null,
            updatedAt: new Date(),
          },
        },
        { sort: { createdAt: -1 } },
      );

      logger.info("Payment24x7 withdrawal initiated", {
        withdrawalId: withdrawal[0]._id.toString(),
        merchantReference: withdrawal[0].referenceId,
        payment24x7Reference: payment24x7Withdrawal.reference,
      });

      return res.status(201).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: {
          withdrawalId: updatedWithdrawal?._id || withdrawal[0]._id,
          referenceId:
            updatedWithdrawal?.referenceId || withdrawal[0].referenceId,
          payment24x7Reference: payment24x7Withdrawal.reference || null,
          amount: updatedWithdrawal?.amount || withdrawal[0].amount,
          netAmount: updatedWithdrawal?.netAmount || withdrawal[0].netAmount,
          processingFee:
            updatedWithdrawal?.processingFee || withdrawal[0].processingFee,
          status: updatedWithdrawal?.status || withdrawal[0].status,
        },
      });
    } catch (gatewayError) {
      const errorMessage = getErrorMessage(gatewayError);

      logger.error("Payment24x7 withdrawal initiation failed", {
        withdrawalId: withdrawal[0]._id.toString(),
        merchantReference: withdrawal[0].referenceId,
        code: gatewayError?.code,
        message: errorMessage,
      });

      if (isUncertainPayment24x7Error(gatewayError)) {
        await Withdrawal.findByIdAndUpdate(withdrawal[0]._id, {
          $set: {
            "propayDetails.gatewayResponse": {
              error: errorMessage,
              code: gatewayError?.code,
            },
            "propayDetails.submittedAt": new Date(),
          },
        });

        return res.status(202).json({
          success: true,
          message:
            "Withdrawal request submitted and is awaiting gateway confirmation",
          data: {
            withdrawalId: withdrawal[0]._id,
            referenceId: withdrawal[0].referenceId,
            payment24x7Reference: null,
            amount: withdrawal[0].amount,
            netAmount: withdrawal[0].netAmount,
            processingFee: withdrawal[0].processingFee,
            status: "pending",
          },
        });
      }

      await refundFailedGatewayWithdrawal(withdrawal[0], errorMessage);

      return res.status(toGatewayHttpStatus(gatewayError)).json({
        success: false,
        message: errorMessage,
      });
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    try {
      session.endSession();
    } catch {
      // Session may already be closed after a committed local withdrawal.
    }

    logger.error("Create Payment24x7 withdrawal error", {
      userId: req.user?.id,
      provider: req.body?.provider,
      message: getErrorMessage(error),
    });
    res.status(toGatewayHttpStatus(error)).json({
      success: false,
      message:
        getErrorMessage(error) ||
        "Server error while creating withdrawal request",
    });
  }
};

// @desc    Get user withdrawal history
// @route   GET /api/payments/withdrawals
// @access  Private
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = String(req.query.status || "").trim();
    const provider = String(req.query.provider || "")
      .trim()
      .toLowerCase();
    const search = String(
      req.query.search || req.query.q || req.query.keyword || "",
    ).trim();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Allow admins to fetch all withdrawals across users when scope=all
    const isAdminAll = req.user?.role === "admin" && req.query.scope === "all";
    const query = isAdminAll ? {} : { user: req.user.id };
    if (status) query.status = status;
    if (provider) {
      if (provider === "payment24x7") {
        query.provider = "payment24x7";
      } else if (provider === "uddoktapay") {
        query.provider = { $ne: "payment24x7" };
      } else {
        query.$or = [
          { paymentMethod: provider },
          { provider },
          { "propayDetails.gatewayResponse.method": provider },
        ];
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      const matchedUsers = isAdminAll
        ? await User.find({
            $or: [
              { fullName: regex },
              { username: regex },
              { email: regex },
              { phone: regex },
            ],
          })
            .select("_id")
            .limit(100)
            .lean()
        : [];
      const matchedUserIds = matchedUsers.map((user) => user._id);
      const searchQuery = {
        $or: [
          ...(matchedUserIds.length ? [{ user: { $in: matchedUserIds } }] : []),
          { referenceId: regex },
          { "propayDetails.orderNo": regex },
          { transactionId: regex },
          { "propayDetails.gatewayResponse.reference": regex },
          { "propayDetails.gatewayResponse.merchant_reference": regex },
        ],
      };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchQuery];
        delete query.$or;
      } else {
        Object.assign(query, searchQuery);
      }
    }

    const withdrawals = await Withdrawal.find(query)
      .populate("user", "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v");

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get withdrawal history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching withdrawal history",
    });
  }
};

// @desc    Get withdrawal details
// @route   GET /api/payments/withdrawals/:id
// @access  Private
exports.getWithdrawalDetails = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    console.error("Get withdrawal details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching withdrawal details",
    });
  }
};

// @desc    Cancel pending withdrawal
// @route   PUT /api/payments/withdrawals/:id/cancel
// @access  Private
exports.cancelWithdrawal = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const withdrawal = await Withdrawal.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).session(session);

    if (!withdrawal) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: "Withdrawal not found",
      });
    }

    if (withdrawal.status !== "pending") {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Only pending withdrawals can be cancelled",
      });
    }

    if (withdrawal.provider === "payment24x7") {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Payment24x7 withdrawals are finalized by gateway callback",
      });
    }

    // Refund amount to user's wallet
    const user = await User.findById(req.user.id).session(session);
    user.wallet.main += withdrawal.amount;
    await user.save({ session });

    // Update withdrawal status
    withdrawal.status = "rejected";
    withdrawal.rejectionReason = "Cancelled by user";
    await withdrawal.save({ session });

    // Create transaction record for refund
    await updatePendingWithdrawalTransaction(
      withdrawal,
      "rejected",
      {
        rejectionReason: "Cancelled by user",
      },
      session,
    );

    await Transaction.create(
      [
        {
          user: req.user.id,
          type: "refund",
          amount: withdrawal.amount,
          walletType: "main",
          previousBalance: user.wallet.main - withdrawal.amount,
          newBalance: user.wallet.main,
          status: "completed",
          description: "Withdrawal cancellation refund",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Withdrawal cancelled successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Cancel withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling withdrawal",
    });
  }
};
