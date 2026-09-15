const AffiliateTransaction = require("../models/AffiliateTransaction");
const AffiliateWithdrawal = require("../models/AffiliateWithdrawal");
const User = require("../models/User");
const {
  AFFILIATE_PAYMENT_METHOD,
  AFFILIATE_TRANSACTION_STATUS,
  AFFILIATE_TRANSACTION_TYPE,
  AFFILIATE_WITHDRAWAL_STATUS,
  AFFILIATE_WITHDRAW_APPROVAL,
} = require("../constants/affiliate");
const { AffiliateError } = require("./affiliateService");
const logger = require("../utils/logger");
const {
  sendAffiliateNotification,
} = require("./affiliateNotificationService");

const phoneRegex = /^01[3-9]\d{8}$/;

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const lower = (value) => clean(value).toLowerCase();

const getWallet = (user) => ({
  pendingCommission: Number(user.affiliate?.wallet?.pendingCommission || 0),
  settledCommission: Number(user.affiliate?.wallet?.settledCommission || 0),
  withdrawableBalance: Number(user.affiliate?.wallet?.withdrawableBalance || 0),
  lifetimeEarnings: Number(user.affiliate?.wallet?.lifetimeEarnings || 0),
  lifetimeWithdraw: Number(user.affiliate?.wallet?.lifetimeWithdraw || 0),
});

class AffiliateWithdrawalService {
  validatePayment(payload = {}) {
    const paymentMethod = lower(payload.paymentMethod);

    if (!Object.values(AFFILIATE_PAYMENT_METHOD).includes(paymentMethod)) {
      throw new AffiliateError("Invalid payment method");
    }

    const paymentDetails = {
      toNumber: clean(payload.paymentNumber || payload.toNumber),
      accountName: clean(payload.accountName),
      bankName: clean(payload.bankName),
      branchName: clean(payload.branchName),
      accountNumber: clean(payload.accountNumber),
    };

    if (
      [
        AFFILIATE_PAYMENT_METHOD.BKASH,
        AFFILIATE_PAYMENT_METHOD.NAGAD,
        AFFILIATE_PAYMENT_METHOD.ROCKET,
      ].includes(paymentMethod) &&
      !phoneRegex.test(paymentDetails.toNumber)
    ) {
      throw new AffiliateError("Valid payment number is required");
    }

    if (paymentMethod === AFFILIATE_PAYMENT_METHOD.BANK) {
      if (!paymentDetails.accountName || !paymentDetails.accountNumber) {
        throw new AffiliateError("Bank account name and account number are required");
      }
    }

    return {
      paymentMethod,
      paymentDetails,
    };
  }

  async requestWithdrawal(affiliateId, payload = {}) {
    const affiliate = await User.findById(affiliateId);
    if (!affiliate) throw new AffiliateError("Affiliate not found", 404);

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AffiliateError("Withdrawal amount must be greater than 0");
    }

    const config = affiliate.affiliate?.config || {};
    const minimumWithdraw = Number(config.minimumWithdraw || 0);
    const wallet = getWallet(affiliate);

    if (amount < minimumWithdraw) {
      throw new AffiliateError(`Minimum withdraw amount is ${minimumWithdraw}`);
    }

    if (amount > wallet.withdrawableBalance) {
      throw new AffiliateError("Insufficient affiliate withdrawable balance");
    }

    const pendingWithdrawal = await AffiliateWithdrawal.findOne({
      affiliate: affiliateId,
      status: AFFILIATE_WITHDRAWAL_STATUS.PENDING,
    })
      .select("_id")
      .lean();

    if (pendingWithdrawal) {
      throw new AffiliateError(
        "You already have a pending affiliate withdrawal request.",
        409,
      );
    }

    const { paymentMethod, paymentDetails } = this.validatePayment(payload);
    const approvalMode =
      config.withdrawApproval || AFFILIATE_WITHDRAW_APPROVAL.MANUAL;

    const withdrawal = await AffiliateWithdrawal.create({
      affiliate: affiliateId,
      amount,
      netAmount: amount,
      paymentMethod,
      paymentDetails,
      approvalMode,
      status: AFFILIATE_WITHDRAWAL_STATUS.PENDING,
    });

    await AffiliateTransaction.create({
      affiliate: affiliateId,
      type: AFFILIATE_TRANSACTION_TYPE.WITHDRAW_REQUEST,
      amount,
      balanceBefore: wallet,
      balanceAfter: wallet,
      status: AFFILIATE_TRANSACTION_STATUS.PENDING,
      withdrawal: withdrawal._id,
      description: "Affiliate withdrawal requested",
    });

    logger.info("Affiliate withdrawal requested", {
      affiliate: affiliateId.toString(),
      withdrawal: withdrawal._id.toString(),
      amount,
    });

    return withdrawal;
  }

  async approveWithdrawal(withdrawalId, adminId, payload = {}) {
    const withdrawal = await AffiliateWithdrawal.findOneAndUpdate(
      {
        _id: withdrawalId,
        status: AFFILIATE_WITHDRAWAL_STATUS.PENDING,
      },
      {
        $set: {
          status: AFFILIATE_WITHDRAWAL_STATUS.PROCESSING,
          approvedBy: adminId,
          approvedAt: new Date(),
          processedBy: adminId,
          processedAt: new Date(),
          transactionId: clean(payload.transactionId),
          adminNote: clean(payload.adminNote) || null,
        },
      },
      { new: true },
    );
    if (!withdrawal) {
      const existingWithdrawal = await AffiliateWithdrawal.findById(withdrawalId)
        .select("_id status")
        .lean();
      if (!existingWithdrawal) {
        throw new AffiliateError("Affiliate withdrawal not found", 404);
      }
      throw new AffiliateError("Only pending withdrawals can be approved", 409);
    }

    const affiliate = await User.findById(withdrawal.affiliate);
    if (!affiliate) {
      withdrawal.status = AFFILIATE_WITHDRAWAL_STATUS.PENDING;
      withdrawal.approvedBy = null;
      withdrawal.approvedAt = null;
      withdrawal.processedBy = null;
      withdrawal.processedAt = null;
      await withdrawal.save();
      throw new AffiliateError("Affiliate not found", 404);
    }

    const beforeWallet = getWallet(affiliate);
    if (withdrawal.amount > beforeWallet.withdrawableBalance) {
      withdrawal.status = AFFILIATE_WITHDRAWAL_STATUS.PENDING;
      withdrawal.approvedBy = null;
      withdrawal.approvedAt = null;
      withdrawal.processedBy = null;
      withdrawal.processedAt = null;
      await withdrawal.save();
      throw new AffiliateError("Insufficient affiliate withdrawable balance");
    }

    const updatedAffiliate = await User.findOneAndUpdate(
      {
        _id: withdrawal.affiliate,
        "affiliate.wallet.withdrawableBalance": { $gte: withdrawal.amount },
      },
      {
        $inc: {
          "affiliate.wallet.withdrawableBalance": -withdrawal.amount,
          "affiliate.wallet.lifetimeWithdraw": withdrawal.amount,
          "affiliate.statistics.withdrawableBalance": -withdrawal.amount,
          "affiliate.statistics.lifetimeWithdraw": withdrawal.amount,
          "affiliate.statistics.totalWithdrawn": withdrawal.amount,
        },
      },
      { new: true },
    );

    if (!updatedAffiliate) {
      withdrawal.status = AFFILIATE_WITHDRAWAL_STATUS.PENDING;
      withdrawal.approvedBy = null;
      withdrawal.approvedAt = null;
      withdrawal.processedBy = null;
      withdrawal.processedAt = null;
      await withdrawal.save();
      throw new AffiliateError("Insufficient affiliate withdrawable balance");
    }

    withdrawal.status = AFFILIATE_WITHDRAWAL_STATUS.APPROVED;
    withdrawal.transactionId = clean(payload.transactionId) || withdrawal.referenceId;
    await withdrawal.save();

    await AffiliateTransaction.create({
      affiliate: withdrawal.affiliate,
      type: AFFILIATE_TRANSACTION_TYPE.WITHDRAW_APPROVED,
      amount: withdrawal.amount,
      balanceBefore: beforeWallet,
      balanceAfter: getWallet(updatedAffiliate),
      status: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
      withdrawal: withdrawal._id,
      description: "Affiliate withdrawal approved",
    });

    logger.info("Affiliate withdrawal approved", {
      affiliate: withdrawal.affiliate.toString(),
      withdrawal: withdrawal._id.toString(),
      amount: withdrawal.amount,
    });

    sendAffiliateNotification(
      withdrawal.affiliate,
      "Affiliate withdraw approved",
      "Your affiliate withdraw request has been approved.",
      { withdrawal: withdrawal._id, amount: withdrawal.amount },
    );

    return withdrawal;
  }

  async rejectWithdrawal(withdrawalId, adminId, payload = {}) {
    const withdrawal = await AffiliateWithdrawal.findById(withdrawalId);
    if (!withdrawal) throw new AffiliateError("Affiliate withdrawal not found", 404);

    if (withdrawal.status !== AFFILIATE_WITHDRAWAL_STATUS.PENDING) {
      throw new AffiliateError("Only pending withdrawals can be rejected");
    }

    const reason = clean(payload.rejectionReason || payload.reason);
    if (!reason) throw new AffiliateError("Rejection reason is required");

    const affiliate = await User.findById(withdrawal.affiliate);
    const wallet = affiliate ? getWallet(affiliate) : {};

    withdrawal.status = AFFILIATE_WITHDRAWAL_STATUS.REJECTED;
    withdrawal.approvedBy = adminId;
    withdrawal.approvedAt = new Date();
    withdrawal.rejectionReason = reason;
    withdrawal.adminNote = clean(payload.adminNote) || null;
    await withdrawal.save();

    await AffiliateTransaction.create({
      affiliate: withdrawal.affiliate,
      type: AFFILIATE_TRANSACTION_TYPE.WITHDRAW_REJECTED,
      amount: withdrawal.amount,
      balanceBefore: wallet,
      balanceAfter: wallet,
      status: AFFILIATE_TRANSACTION_STATUS.REJECTED,
      withdrawal: withdrawal._id,
      description: "Affiliate withdrawal rejected",
      metadata: { reason },
    });

    logger.info("Affiliate withdrawal rejected", {
      affiliate: withdrawal.affiliate.toString(),
      withdrawal: withdrawal._id.toString(),
      amount: withdrawal.amount,
    });

    sendAffiliateNotification(
      withdrawal.affiliate,
      "Affiliate withdraw rejected",
      "Your affiliate withdraw request has been rejected.",
      { withdrawal: withdrawal._id, amount: withdrawal.amount, reason },
    );

    return withdrawal;
  }

  async listAffiliateWithdrawals(affiliateId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = { affiliate: affiliateId };
    if (query.status) filter.status = lower(query.status);

    const [withdrawals, total] = await Promise.all([
      AffiliateWithdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateWithdrawal.countDocuments(filter),
    ]);

    return {
      withdrawals,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async listAllWithdrawals(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = {};
    if (query.status) filter.status = lower(query.status);

    const [withdrawals, total] = await Promise.all([
      AffiliateWithdrawal.find(filter)
        .populate("affiliate", "username fullName email phone affiliate")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateWithdrawal.countDocuments(filter),
    ]);

    return {
      withdrawals,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }
}

module.exports = new AffiliateWithdrawalService();
