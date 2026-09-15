const withdrawalValidationService = require("../services/withdrawalValidationService");

// @desc    Check withdrawal eligibility before form submission
// @route   GET /api/withdrawals/check-eligibility
// @access  Private (User)
exports.checkWithdrawalEligibility = async (req, res) => {
  try {
    const userId = req.user.id;

    const result =
      await withdrawalValidationService.checkWithdrawalLock(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Check withdrawal eligibility error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while checking withdrawal eligibility",
    });
  }
};

// @desc    Get available withdrawal balance (main wallet only)
// @route   GET /api/withdrawals/available-balance
// @access  Private (User)
exports.getAvailableBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const result =
      await withdrawalValidationService.getAvailableBalance(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get available balance error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while fetching available balance",
    });
  }
};

// @desc    Validate withdrawal before processing
// @route   POST /api/withdrawals/validate
// @access  Private (User)
exports.validateWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, processingFee = 0 } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const result = await withdrawalValidationService.validateWithdrawalRequest(
      userId,
      amount,
      processingFee,
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason,
        data: result,
      });
    }

    res.status(200).json({
      success: true,
      message: result.reason,
      data: result,
    });
  } catch (error) {
    console.error("Validate withdrawal error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error validating withdrawal",
    });
  }
};

// @desc    Admin check user's withdrawal lock status
// @route   GET /api/withdrawals/admin/user/:userId/lock-status
// @access  Private (Admin only)
exports.adminCheckWithdrawalLock = async (req, res) => {
  try {
    const { userId } = req.params;

    const result =
      await withdrawalValidationService.checkWithdrawalLock(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Admin check withdrawal lock error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Server error checking user withdrawal lock",
    });
  }
};

// @desc    Admin check user's available balance
// @route   GET /api/withdrawals/admin/user/:userId/balance
// @access  Private (Admin only)
exports.adminCheckUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const result =
      await withdrawalValidationService.getAvailableBalance(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Admin check user balance error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Server error fetching user balance",
    });
  }
};
