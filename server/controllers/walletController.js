const WalletService = require("../services/walletService");
const User = require("../models/User");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const PromotionTurnover = require("../models/PromotionTurnover");
const UserPromotion = require("../models/UserPromotion");
const {
  isTurnoverCompleteForWithdrawal,
  logTurnoverValidation,
} = require("../utils/turnoverEligibility");

const buildWalletTimeline = ({ type, status, createdAt, updatedAt, provider }) => {
  const label = type === "deposit" ? "Deposit" : "Withdrawal";
  const baseSteps = [{ text: `${label} Initiated`, at: createdAt }];

  if (type === "deposit") {
    baseSteps.push({ text: "Information Received", at: createdAt });
  }

  if (status === "processing") {
    baseSteps.push({ text: "Processing", at: updatedAt || createdAt });
  } else if (status === "completed" || status === "approved") {
    baseSteps.push({
      text: `Successful${provider ? ` via ${provider}` : ""}`,
      at: updatedAt || createdAt,
    });
  } else if (status === "rejected" || status === "failed" || status === "cancelled") {
    baseSteps.push({ text: status === "cancelled" ? "Cancelled" : "Failed", at: updatedAt || createdAt });
  } else if (status === "pending") {
    baseSteps.push({ text: "Pending", at: createdAt });
  }

  return baseSteps.map((step) => ({
    text: step.text,
    time: step.at ? new Date(step.at).toLocaleString() : "",
    at: step.at,
  }));
};

const normalizeWalletTransaction = (item, type) => {
  const provider =
    item.provider ||
    item.paymentMethod ||
    item.paymentDetails?.bankName ||
    null;
  const gatewayReference =
    item.propayDetails?.orderNo ||
    item.transactionId ||
    item.paymentDetails?.transactionId ||
    item.propayDetails?.gatewayResponse?.reference ||
    null;
  const gatewayStatus =
    item.propayDetails?.gatewayStatus ||
    item.propayDetails?.transactionStatus ||
    item.propayDetails?.gatewayResponse?.status ||
    null;

  return {
    _id: item._id,
    referenceId: item.referenceId,
    type,
    provider,
    paymentProvider:
      item.paymentMethod === "payment24x7" || item.provider === "payment24x7"
        ? "Payment24x7"
        : item.paymentMethod || item.provider || null,
    gatewayReference,
    gatewayStatus,
    amount: item.amount,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    timeline: buildWalletTimeline({
      type,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      provider,
    }),
  };
};

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
exports.getWalletBalance = async (req, res) => {
  try {
    // lean() reduces memory usage by ~40% per doc by skipping Mongoose overhead
    const user = await User.findById(req.user.id).select("wallet").lean();

    res.status(200).json({
      success: true,
      data: user.wallet,
    });
  } catch (error) {
    console.error("Get wallet balance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching wallet balance",
    });
  }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const walletType = req.query.walletType;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const result = await WalletService.getTransactionHistory(req.user.id, {
      page,
      limit,
      type,
      walletType,
      status,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transaction history",
    });
  }
};

// @desc    Get wallet-only transaction records (deposits + withdrawals)
// @route   GET /api/wallet-transactions
// @access  Private
exports.getWalletTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const baseQuery = { user: req.user.id };
    if (status) baseQuery.status = status;

    if (Object.keys(dateFilter).length > 0) {
      baseQuery.createdAt = dateFilter;
    }

    const depositQuery = {
      ...baseQuery,
      ...(status
        ? {}
        : {
            status: {
              $in: [
                "pending",
                "approved",
                "rejected",
                "processing",
                "completed",
                "cancelled",
                "failed",
              ],
            },
          }),
    };
    const withdrawalQuery = {
      ...baseQuery,
      ...(status
        ? {}
        : {
            status: {
              $in: [
                "pending",
                "approved",
                "rejected",
                "processing",
                "completed",
                "failed",
              ],
            },
          }),
    };
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const perCollectionLimit = page * safeLimit;

    const [deposits, withdrawals, depositTotal, withdrawalTotal] = await Promise.all([
      Deposit.find(depositQuery).sort({ createdAt: -1 }).limit(perCollectionLimit).lean(),
      Withdrawal.find(withdrawalQuery).sort({ createdAt: -1 }).limit(perCollectionLimit).lean(),
      Deposit.countDocuments(depositQuery),
      Withdrawal.countDocuments(withdrawalQuery),
    ]);

    const normalizedDeposits = deposits.map((item) =>
      normalizeWalletTransaction(item, "deposit"),
    );
    const normalizedWithdrawals = withdrawals.map((item) =>
      normalizeWalletTransaction(item, "withdrawal"),
    );

    const merged = [...normalizedDeposits, ...normalizedWithdrawals].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const paginated = merged.slice((page - 1) * safeLimit, page * safeLimit);
    const total = depositTotal + withdrawalTotal;

    res.status(200).json({
      success: true,
      data: {
        transactions: paginated,
        total,
        totalPages: Math.ceil(total / safeLimit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching wallet transactions",
    });
  }
};

// @desc    Transfer between wallets
// @route   POST /api/wallet/transfer
// @access  Private
exports.transferBetweenWallets = async (req, res) => {
  try {
    const { fromWallet, toWallet, amount } = req.body;

    if (!fromWallet || !toWallet || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const result = await WalletService.transferBetweenWallets(
      req.user.id,
      fromWallet,
      toWallet,
      amount,
    );

    res.status(200).json({
      success: true,
      message: "Transfer completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Transfer between wallets error:", error);

    if (
      error.message.includes("Insufficient balance") ||
      error.message.includes("Invalid wallet type")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during wallet transfer",
    });
  }
};

// @desc    Get wallet summary
// @route   GET /api/wallet/summary
// @access  Private
exports.getWalletSummary = async (req, res) => {
  try {
    // lean() reduces memory usage by ~40% per doc
    const user = await User.findById(req.user.id).select("wallet").lean();

    const Transaction = require("../models/Transaction");

    // Get today's transactions count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayTransactions = await Transaction.countDocuments({
      user: req.user.id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    // OPTIMIZATION: Combine deposits/withdrawals into single aggregate query
    // Reduces database I/O by 50% compared to separate queries
    const financialSummary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: { $in: ["deposit", "withdrawal"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Extract totals from combined result
    const totalDeposits =
      financialSummary.find((item) => item._id === "deposit")?.total || 0;
    const totalWithdrawals =
      financialSummary.find((item) => item._id === "withdrawal")?.total || 0;

    const summary = {
      wallet: user.wallet,
      todayTransactions,
      totalDeposits: totalDeposits,
      totalWithdrawals: totalWithdrawals,
      netDeposit: totalDeposits - totalWithdrawals,
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get wallet summary error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching wallet summary",
    });
  }
};

// @desc    Get active bonus / promotion info for current user
// @route   GET /api/wallet/active-bonus
// @access  Private
exports.getActiveBonus = async (req, res) => {
  try {
    // 1) Check PromotionTurnover (turnover-based bonuses)
    const lockedTurnover = await PromotionTurnover.findOne({
      user: req.user.id,
      status: { $in: ["active", "pending"] },
      expiresAt: { $gt: new Date() },
    })
      .populate("promotion", "title type promoCode")
      .lean();

    if (lockedTurnover) {
      const canWithdraw = logTurnoverValidation(lockedTurnover);
      const turnoverComplete = isTurnoverCompleteForWithdrawal(lockedTurnover);
      const remainingTurnover = Math.max(
        0,
        lockedTurnover.turnoverRequired - lockedTurnover.turnoverCompleted,
      );

      return res.status(200).json({
        success: true,
        data: {
          source: "turnover",
          bonusAmount: lockedTurnover.bonusAmount || 0,
          totalTurnover: lockedTurnover.turnoverRequired || 0,
          remainingTurnover,
          withdrawBlocked: !canWithdraw,
          bonusStatus:
            turnoverComplete
              ? "completed"
              : lockedTurnover.status === "pending"
              ? "pending"
              : remainingTurnover <= 0
                ? "completed"
                : "active",
          promotion: lockedTurnover.promotion,
          turnoverStatus: lockedTurnover.status,
          status: lockedTurnover.status,
          withdrawLocked: lockedTurnover.withdrawLocked,
          turnoverCompleted: lockedTurnover.turnoverCompleted,
          turnoverRequired: lockedTurnover.turnoverRequired,
          turnoverPercentage: lockedTurnover.turnoverPercentage,
          completedAt: lockedTurnover.completedAt,
          expiresAt: lockedTurnover.expiresAt,
        },
      });
    }

    // 2) Check UserPromotion (generic user-bound promotion balances)
    const activeUserPromotion = await UserPromotion.findOne({
      user: req.user.id,
      status: "active",
      expiresAt: { $gt: new Date() },
      bonusBalance: { $gt: 0 },
    })
      .populate("promotion", "title type promoCode")
      .lean();

    if (activeUserPromotion) {
      return res.status(200).json({
        success: true,
        data: {
          source: "userPromotion",
          bonusAmount: activeUserPromotion.bonusBalance || 0,
          totalTurnover: 0,
          remainingTurnover: 0,
          withdrawBlocked: false,
          bonusStatus: "active",
          promotion: activeUserPromotion.promotion,
          expiresAt: activeUserPromotion.expiresAt,
          remainingFreeSpins: activeUserPromotion.remainingFreeSpins || 0,
          freeSpinValue: activeUserPromotion.freeSpinValue || 0,
        },
      });
    }

    // 3) Check PromoCodeUsage (legacy promo-code bonuses)
    const activeBonus = await PromoCodeUsage.findOne({
      user: req.user.id,
      bonusStatus: "active",
    }).populate(
      "promoCode",
      "code description minDeposit bonusPercentage maxBonus",
    );

    if (activeBonus) {
      const bonusData = {
        source: "promoCode",
        bonusAmount: activeBonus.bonusAmount,
        remainingTurnover: activeBonus.remainingTurnover,
        totalTurnover: activeBonus.turnoverRequirement,
        withdrawBlocked: !!activeBonus.withdrawBlocked,
        bonusStatus: activeBonus.bonusStatus,
        promoCode: activeBonus.promoCode?.code,
        description: activeBonus.promoCode?.description,
        appliedAt: activeBonus.appliedAt,
      };

      return res.status(200).json({ success: true, data: bonusData });
    }

    // No active bonuses - return 200 with null data to avoid 404 noise
    return res.status(200).json({ success: true, data: null });
  } catch (error) {
    console.error("Get active bonus error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching active bonus",
    });
  }
};
