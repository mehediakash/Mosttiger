const adminService = require("../services/adminService");
const promoCodeService = require("../services/promoCodeService");
const promotionService = require("../services/promotionService");
const User = require("../models/User");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const AgentSettings = require("../models/AgentSettings");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const WalletService = require("../services/walletService");
const Commission = require("../models/Commission");
const PromoCode = require("../models/PromoCode");
const Transaction = require("../models/Transaction");

const updateWithdrawalTransactionStatus = async (
  withdrawal,
  status,
  extraFields = {},
) => {
  if (!withdrawal) return;

  const withdrawalId = withdrawal._id.toString();
  const query = {
    type: "withdrawal",
    status: "pending",
    $or: [
      { "metadata.withdrawalId": withdrawalId },
      {
        user: withdrawal.user?._id || withdrawal.user,
        amount: withdrawal.amount,
      },
    ],
  };

  await Transaction.findOneAndUpdate(
    query,
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...extraFields,
      },
    },
    { sort: { createdAt: -1 } },
  );
};

const isPayment24x7Transaction = (transaction) =>
  transaction?.paymentMethod === "payment24x7" ||
  transaction?.provider === "payment24x7";

// @desc    Get admin dashboard overview
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
exports.getDashboard = async (req, res) => {
  try {
    const { period = "today" } = req.query;

    const dashboard = await adminService.getDashboardOverview(period);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Server error while fetching admin dashboard",
    });
  }
};

// @desc    Get financial reports
// @route   GET /api/admin/reports/financial
// @access  Private (Admin only)
exports.getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType = "daily" } = req.query;

    const report = await adminService.getFinancialReport({
      startDate,
      endDate,
      reportType,
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get financial report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while generating financial report",
    });
  }
};

// @desc    Get user management data
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Status filter
    if (status === "active") {
      query.isActive = true;
      query.isBlocked = false;
    } else if (status === "blocked") {
      query.isBlocked = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // Date filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(query)
      .select("-password -otp")
      .populate("hierarchy.masterAgent", "fullName email")
      .populate("hierarchy.agent", "fullName email")
      .populate("hierarchy.subAgent", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Add additional stats for each user
    for (let user of users) {
      user.stats = await this.getUserStats(user._id);
    }

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("+password")
      .populate("hierarchy.masterAgent", "fullName email")
      .populate("hierarchy.agent", "fullName email")
      .populate("hierarchy.subAgent", "fullName email")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add stats
    user.stats = await this.getUserStats(user._id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, password, walletMainBalance } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and phone are required",
      });
    }

    // Check if email or phone is already taken by another user
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
      _id: { $ne: id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number already in use by another user",
      });
    }

    // Find the user first
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare update data
    const updateData = {
      fullName,
      email: email.toLowerCase(),
      phone,
      updatedAt: Date.now(),
    };

    // Update password if provided
    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      user.password = password;
    }

    // Update wallet main balance if provided
    if (walletMainBalance !== undefined && walletMainBalance !== null) {
      const parsedBalance = Number(walletMainBalance);
      if (!isFinite(parsedBalance) || parsedBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Wallet balance must be a valid non-negative number",
        });
      }
      user.wallet.main = parsedBalance;
    }

    // Update basic fields
    user.fullName = updateData.fullName;
    user.email = updateData.email;
    user.phone = updateData.phone;
    user.updatedAt = updateData.updatedAt;

    // Save the user (triggers password hashing if password was modified)
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          wallet: {
            main: user.wallet.main,
            bonus: user.wallet.bonus,
            freeBets: user.wallet.freeBets,
          },
        },
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/admin/users/:id/stats
// @access  Private (Admin only)
exports.getUserStats = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [gameStats, sportsStats, depositStats, withdrawalStats] =
    await Promise.all([
      // Game statistics
      GameSession.aggregate([
        {
          $match: {
            user: userId,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalBets: { $sum: "$betAmount" },
            totalWins: { $sum: "$winAmount" },
            totalSessions: { $sum: 1 },
          },
        },
      ]),
      // Sports statistics
      SportsBet.aggregate([
        {
          $match: {
            user: userId,
          },
        },
        {
          $group: {
            _id: null,
            totalStake: { $sum: "$totalStake" },
            totalWins: { $sum: "$actualWin" },
            totalBets: { $sum: 1 },
          },
        },
      ]),
      // Deposit statistics
      Deposit.aggregate([
        {
          $match: {
            user: userId,
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            totalDeposits: { $sum: "$amount" },
            depositCount: { $sum: 1 },
          },
        },
      ]),
      // Withdrawal statistics
      Withdrawal.aggregate([
        {
          $match: {
            user: userId,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalWithdrawals: { $sum: "$amount" },
            withdrawalCount: { $sum: 1 },
          },
        },
      ]),
    ]);

  return {
    totalBets:
      (gameStats[0]?.totalBets || 0) + (sportsStats[0]?.totalStake || 0),
    totalWins:
      (gameStats[0]?.totalWins || 0) + (sportsStats[0]?.totalWins || 0),
    totalDeposits: depositStats[0]?.totalDeposits || 0,
    totalWithdrawals: withdrawalStats[0]?.totalWithdrawals || 0,
    netProfit:
      (gameStats[0]?.totalBets || 0) -
      (gameStats[0]?.totalWins || 0) +
      ((sportsStats[0]?.totalStake || 0) - (sportsStats[0]?.totalWins || 0)),
  };
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      {
        isActive: isActive !== undefined ? isActive : undefined,
        isBlocked: isBlocked !== undefined ? isBlocked : undefined,
      },
      { new: true, runValidators: true },
    ).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user status",
    });
  }
};

// @desc    Adjust user balance
// @route   POST /api/admin/users/:id/adjust-balance
// @access  Private (Admin only)
exports.adjustUserBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, walletType, reason } = req.body;

    if (
      amount === undefined ||
      walletType === undefined ||
      reason === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount, wallet type and reason are required",
      });
    }

    // Coerce amount to number and validate
    const parsedAmount = Number(amount);
    if (!isFinite(parsedAmount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount value",
      });
    }

    // Validate walletType against allowed enum
    const validWallets = ["main", "bonus", "freeBets"];
    if (!validWallets.includes(walletType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid walletType. Valid values: ${validWallets.join(", ")}`,
      });
    }

    // Use wallet service to update balance
    const result = await WalletService.updateWallet(
      id,
      parsedAmount,
      walletType,
      parsedAmount > 0 ? "bonus" : "refund",
      {
        description: `Admin adjustment: ${reason}`,
        adminId: req.user.id,
      },
    );

    res.status(200).json({
      success: true,
      message: "User balance adjusted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Adjust user balance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adjusting user balance",
    });
  }
};

// @desc    Get pending transactions
// @route   GET /api/admin/transactions/pending
// @access  Private (Admin only)
exports.getPendingTransactions = async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 20,
      provider,
      search,
      startDate,
      endDate,
    } = req.query;

    let Model, populateFields;

    if (type === "deposit") {
      Model = Deposit;
      populateFields = "user";
    } else if (type === "withdrawal") {
      Model = Withdrawal;
      populateFields = "user";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    const query = { status: "pending" };
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    if (normalizedProvider) {
      if (normalizedProvider === "payment24x7") {
        if (type === "deposit") query.paymentMethod = "payment24x7";
        if (type === "withdrawal") query.provider = "payment24x7";
      } else if (normalizedProvider === "uddoktapay") {
        query.paymentMethod = { $ne: "payment24x7" };
        if (type === "withdrawal") query.provider = { $ne: "payment24x7" };
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const searchTerm = String(search || "").trim();
    if (searchTerm) {
      const regex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      const matchedUsers = await User.find({
        $or: [
          { fullName: regex },
          { username: regex },
          { email: regex },
          { phone: regex },
        ],
      })
        .select("_id")
        .limit(100)
        .lean();
      query.$or = [
        ...(matchedUsers.length
          ? [{ user: { $in: matchedUsers.map((user) => user._id) } }]
          : []),
        { referenceId: regex },
        { "propayDetails.orderNo": regex },
        { "paymentDetails.transactionId": regex },
        { transactionId: regex },
      ];
    }

    const transactions = await Model.find(query)
      .populate(populateFields, "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Model.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get pending transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching pending transactions",
    });
  }
};

// @desc    Approve transaction
// @route   PUT /api/admin/transactions/:type/:id/approve
// @access  Private (Admin only)
exports.approveTransaction = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { adminNote } = req.body;

    let Model, updateData;

    if (type === "deposit") {
      Model = Deposit;
      updateData = {
        status: "approved",
        approvedBy: req.user.id,
        approvedAt: new Date(),
        adminNote: adminNote,
      };
    } else if (type === "withdrawal") {
      Model = Withdrawal;
      updateData = {
        status: "approved",
        approvedBy: req.user.id,
        approvedAt: new Date(),
        adminNote: adminNote,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    const existingTransaction = await Model.findById(id);

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (isPayment24x7Transaction(existingTransaction)) {
      return res.status(400).json({
        success: false,
        message: "Payment24x7 transactions are finalized by gateway callback",
      });
    }

    const transaction = await Model.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("user", "fullName email phone");

    // If deposit is approved, add to user's wallet
    if (type === "deposit" && transaction.status === "approved") {
      // Add deposit amount to main wallet
      await WalletService.updateWallet(
        transaction.user._id,
        transaction.amount,
        "main",
        "deposit",
        {
          description: "Deposit approved",
          depositId: transaction._id,
        },
      );

      // Apply promotion if selected
      if (transaction.promotion) {
        const promoResult = await promotionService.applyDepositPromotion(
          transaction.user._id,
          transaction.promotion,
          transaction.amount,
          transaction._id,
        );

        if (promoResult.success) {
          console.log("Promotion applied successfully:", {
            userId: transaction.user._id,
            promotionId: transaction.promotion,
            bonusAmount: promoResult.bonusAmount,
            turnoverRequired: promoResult.turnoverRequired,
          });
        } else {
          console.warn("Promotion apply failed (non-blocking):", promoResult);
        }
      }
    }

    if (type === "withdrawal" && transaction.status === "approved") {
      await updateWithdrawalTransactionStatus(transaction, "approved", {
        approvedBy: req.user.id,
        approvedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction approved successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Approve transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while approving transaction",
    });
  }
};

// @desc    Reject transaction
// @route   PUT /api/admin/transactions/:type/:id/reject
// @access  Private (Admin only)
exports.rejectTransaction = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { rejectionReason, adminNote } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    let Model, updateData;

    if (type === "deposit") {
      Model = Deposit;
      updateData = {
        status: "rejected",
        rejectionReason: rejectionReason,
        adminNote: adminNote,
      };
    } else if (type === "withdrawal") {
      Model = Withdrawal;
      updateData = {
        status: "rejected",
        rejectionReason: rejectionReason,
        adminNote: adminNote,
      };

      // If withdrawal is rejected, refund the amount to user's wallet
      const withdrawal = await Model.findById(id);
      if (withdrawal) {
        if (isPayment24x7Transaction(withdrawal)) {
          return res.status(400).json({
            success: false,
            message:
              "Payment24x7 transactions are finalized by gateway callback",
          });
        }

        await WalletService.updateWallet(
          withdrawal.user,
          withdrawal.amount,
          "main",
          "refund",
          {
            description: "Withdrawal rejection refund",
            withdrawalId: withdrawal._id,
          },
        );
        await updateWithdrawalTransactionStatus(withdrawal, "rejected", {
          rejectionReason,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (type === "deposit") {
      const deposit = await Model.findById(id);
      if (deposit && isPayment24x7Transaction(deposit)) {
        return res.status(400).json({
          success: false,
          message: "Payment24x7 transactions are finalized by gateway callback",
        });
      }
    }

    const transaction = await Model.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("user", "fullName email phone");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction rejected successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Reject transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while rejecting transaction",
    });
  }
};

// @desc    Create promo code
// @route   POST /api/admin/promo-codes
// @access  Private (Admin only)
exports.createPromoCode = async (req, res) => {
  try {
    const promoData = req.body;

    const result = await promoCodeService.createPromoCode(
      promoData,
      req.user.id,
    );

    res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create promo code error:", error);

    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating promo code",
    });
  }
};

// @desc    Get all promo codes
// @route   GET /api/admin/promo-codes
// @access  Private (Admin only)
exports.getPromoCodes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const promoCodes = await PromoCode.find(query)
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await PromoCode.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        promoCodes,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get promo codes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promo codes",
    });
  }
};

// @desc    Update promo code
// @route   PUT /api/admin/promo-codes/:id
// @access  Private (Admin only)
exports.updatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promoCode = await PromoCode.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Promo code updated successfully",
      data: promoCode,
    });
  } catch (error) {
    console.error("Update promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating promo code",
    });
  }
};

// @desc    Delete promo code
// @route   DELETE /api/admin/promo-codes/:id
// @access  Private (Admin only)
exports.deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findByIdAndDelete(id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Promo code deleted successfully",
    });
  } catch (error) {
    console.error("Delete promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting promo code",
    });
  }
};

// @desc    Get system health
// @route   GET /api/admin/system-health
// @access  Private (Admin only)
exports.getSystemHealth = async (req, res) => {
  try {
    const health = await adminService.getSystemHealth();

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("Get system health error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking system health",
    });
  }
};

// @desc    Get agent management data
// @route   GET /api/admin/agents
// @access  Private (Admin only)
exports.getAgents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      status,
      includeStats = false,
    } = req.query;

    const query = {
      role: { $in: ["master_agent", "agent", "sub_agent"] },
    };

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const agents = await User.find(query)
      .select("-password -otp")
      .populate("hierarchy.masterAgent", "fullName email")
      .populate("hierarchy.agent", "fullName email")
      .populate("hierarchy.subAgent", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Only add settings and statistics if explicitly requested
    if (includeStats === "true") {
      for (let agent of agents) {
        const settings = await AgentSettings.findOne({ agent: agent._id });
        agent.settings = settings;

        const stats = await exports.getAgentStats(agent._id);
        agent.stats = stats;
      }
    } else {
      // Just add basic settings without expensive stats
      for (let agent of agents) {
        const settings = await AgentSettings.findOne({
          agent: agent._id,
        }).lean();
        agent.settings = settings;
      }
    }

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        agents,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get agents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching agents",
    });
  }
};

// @desc    Get hierarchy data optimized for admin
// @route   GET /api/admin/hierarchy
// @access  Private (Admin only)
exports.getAdminHierarchy = async (req, res) => {
  try {
    // Fetch all agents and users with minimal fields for hierarchy building
    const agents = await User.find({
      role: { $in: ["master_agent", "agent", "sub_agent"] },
    })
      .select(
        "fullName email phone role referredBy wallet.balance createdAt isActive",
      )
      .lean();

    const users = await User.find({ role: "user" })
      .select(
        "fullName email phone role referredBy wallet.main wallet.bonus createdAt isActive",
      )
      .lean();

    res.status(200).json({
      success: true,
      data: {
        agents,
        users,
        total: {
          agents: agents.length,
          users: users.length,
        },
      },
    });
  } catch (error) {
    console.error("Get admin hierarchy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching hierarchy",
    });
  }
};

// @desc    Get agent statistics
// @route   GET /api/admin/agents/:id/stats
// @access  Private (Admin only)
exports.getAgentStats = async (agentId) => {
  const [downlineCount, commissionStats, turnoverStats] = await Promise.all([
    // Downline user count
    User.countDocuments({
      $or: [
        { "hierarchy.masterAgent": agentId },
        { "hierarchy.agent": agentId },
        { "hierarchy.subAgent": agentId },
      ],
    }),
    // Commission statistics
    Commission.aggregate([
      {
        $match: {
          agent: agentId,
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$amount" },
          pendingCommission: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
        },
      },
    ]),
    // Turnover statistics
    exports.getAgentTurnover(agentId),
  ]);

  return {
    downlineUsers: downlineCount,
    totalCommission: commissionStats[0]?.totalCommission || 0,
    pendingCommission: commissionStats[0]?.pendingCommission || 0,
    totalTurnover: turnoverStats.totalTurnover || 0,
    activeDownline: turnoverStats.activeUsers || 0,
  };
};

// @desc    Get agent turnover
// @route   GET /api/admin/agents/:id/turnover
// @access  Private (Admin only)
exports.getAgentTurnover = async (agentId) => {
  const downlineUsers = await User.find({
    $or: [
      { "hierarchy.masterAgent": agentId },
      { "hierarchy.agent": agentId },
      { "hierarchy.subAgent": agentId },
    ],
  }).select("_id");

  const downlineIds = downlineUsers.map((user) => user._id);

  const [gameTurnover, sportsTurnover] = await Promise.all([
    GameSession.aggregate([
      {
        $match: {
          user: { $in: downlineIds },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalBets: { $sum: "$betAmount" },
          userCount: { $addToSet: "$user" },
        },
      },
    ]),
    SportsBet.aggregate([
      {
        $match: {
          user: { $in: downlineIds },
        },
      },
      {
        $group: {
          _id: null,
          totalStake: { $sum: "$totalStake" },
          userCount: { $addToSet: "$user" },
        },
      },
    ]),
  ]);

  const totalTurnover =
    (gameTurnover[0]?.totalBets || 0) + (sportsTurnover[0]?.totalStake || 0);

  const uniqueUsers = new Set([
    ...(gameTurnover[0]?.userCount || []).map((id) => id.toString()),
    ...(sportsTurnover[0]?.userCount || []).map((id) => id.toString()),
  ]);

  return {
    totalTurnover,
    activeUsers: uniqueUsers.size,
  };
};

// @desc    Update agent commission rates
// @route   PUT /api/admin/agents/:id/commission
// @access  Private (Admin only)
exports.updateAgentCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRates, downlineCommissionRates } = req.body;

    // First, try to find existing agent settings
    let agentSettings = await AgentSettings.findOne({ agent: id });

    if (!agentSettings) {
      // If settings don't exist, create them first
      agentSettings = new AgentSettings({
        agent: id,
        createdBy: req.user.id, // Add the admin who is creating the settings
        commissionRates: commissionRates || {},
        downlineCommissionRates: downlineCommissionRates || {},
      });
    } else {
      // Update existing settings
      agentSettings.commissionRates = commissionRates || {};
      agentSettings.downlineCommissionRates = downlineCommissionRates || {};
    }

    // Save the settings
    await agentSettings.save();

    res.status(200).json({
      success: true,
      message: "Agent commission rates updated successfully",
      data: agentSettings,
    });
  } catch (error) {
    console.error("Update agent commission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating agent commission rates",
    });
  }
};

// @desc    Get gaming analytics
// @route   GET /api/admin/analytics/gaming
// @access  Private (Admin only)
exports.getGamingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, gameId } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = { status: "completed" };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }
    if (gameId) query.game = gameId;

    const analytics = await GameSession.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "games",
          localField: "game",
          foreignField: "_id",
          as: "gameInfo",
        },
      },
      {
        $unwind: "$gameInfo",
      },
      {
        $group: {
          _id: "$game",
          gameName: { $first: "$gameInfo.game_name" },
          brand: { $first: "$gameInfo.brand" },
          totalSessions: { $sum: 1 },
          totalBets: { $sum: "$betAmount" },
          totalWins: { $sum: "$winAmount" },
          uniquePlayers: { $addToSet: "$user" },
          averageBet: { $avg: "$betAmount" },
        },
      },
      {
        $project: {
          gameName: 1,
          brand: 1,
          totalSessions: 1,
          totalBets: 1,
          totalWins: 1,
          netRevenue: { $subtract: ["$totalBets", "$totalWins"] },
          uniquePlayers: { $size: "$uniquePlayers" },
          averageBet: 1,
          rtp: {
            $cond: [
              { $eq: ["$totalBets", 0] },
              0,
              { $multiply: [{ $divide: ["$totalWins", "$totalBets"] }, 100] },
            ],
          },
        },
      },
      {
        $sort: { netRevenue: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        gamePerformance: analytics,
      },
    });
  } catch (error) {
    console.error("Get gaming analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching gaming analytics",
    });
  }
};

// @desc    Get sports analytics
// @route   GET /api/admin/analytics/sports
// @access  Private (Admin only)
exports.getSportsAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, sport } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = {};
    if (Object.keys(dateFilter).length > 0) {
      query.placedAt = dateFilter;
    }
    if (sport) {
      query["matches.sport"] = sport;
    }

    const analytics = await SportsBet.aggregate([
      {
        $match: query,
      },
      {
        $unwind: "$matches",
      },
      {
        $group: {
          _id: "$matches.sport",
          totalBets: { $sum: 1 },
          totalStake: { $sum: "$totalStake" },
          totalWins: { $sum: "$actualWin" },
          uniquePlayers: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          sport: "$_id",
          totalBets: 1,
          totalStake: 1,
          totalWins: 1,
          netRevenue: { $subtract: ["$totalStake", "$totalWins"] },
          uniquePlayers: { $size: "$uniquePlayers" },
          averageStake: { $divide: ["$totalStake", "$totalBets"] },
        },
      },
      {
        $sort: { netRevenue: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        popularSports: analytics,
      },
    });
  } catch (error) {
    console.error("Get sports analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching sports analytics",
    });
  }
};
