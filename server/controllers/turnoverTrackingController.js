const turnoverTrackingService = require("../services/turnoverTrackingService");

// @desc    Record a bet towards turnover requirement
// @route   POST /api/turnover-tracking/record-bet
// @access  Private (User)
exports.recordBet = async (req, res) => {
  try {
    const { gameId, betAmount } = req.body;
    const userId = req.user.id;

    // Validation
    if (!gameId || !betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "gameId and betAmount (> 0) are required",
      });
    }

    const result = await turnoverTrackingService.recordBet(
      userId,
      gameId,
      betAmount,
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: result,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Record bet error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while recording bet",
    });
  }
};

// @desc    Get user's turnover status
// @route   GET /api/turnover-tracking/status
// @access  Private (User)
exports.getTurnoverStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await turnoverTrackingService.getUserTurnoverStatus(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get turnover status error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while fetching turnover status",
    });
  }
};

// @desc    Get user's turnover status (admin view)
// @route   GET /api/turnover-tracking/admin/user/:userId
// @access  Private (Admin only)
exports.getAdminUserTurnoverStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await turnoverTrackingService.getUserTurnoverStatus(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get admin user turnover status error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Server error while fetching user turnover status",
    });
  }
};

// @desc    Cancel a turnover (admin action)
// @route   PUT /api/turnover-tracking/admin/:turnoverId/cancel
// @access  Private (Admin only)
exports.cancelTurnover = async (req, res) => {
  try {
    const { turnoverId } = req.params;
    const { reason } = req.body;

    if (!turnoverId) {
      return res.status(400).json({
        success: false,
        message: "turnoverId is required",
      });
    }

    const result = await turnoverTrackingService.cancelTurnover(
      turnoverId,
      reason || "Admin cancelled",
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Cancel turnover error:", {
      message: error.message,
      stack: error.stack,
      turnoverId: req.params.turnoverId,
    });

    res.status(500).json({
      success: false,
      message: "Server error while cancelling turnover",
    });
  }
};

// @desc    Expire old turnovers (cron job endpoint)
// @route   POST /api/turnover-tracking/admin/expire
// @access  Private (Admin only)
exports.expireTurnovers = async (req, res) => {
  try {
    const result = await turnoverTrackingService.expireOldTurnovers();

    res.status(200).json({
      success: true,
      message: `Expiry check completed. ${result.expiredCount} turnovers expired.`,
      data: result,
    });
  } catch (error) {
    console.error("Expire turnovers error:", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Server error while expiring turnovers",
    });
  }
};

// @desc    Manually complete a turnover (admin action)
// @route   PUT /api/turnover-tracking/admin/:turnoverId/complete
// @access  Private (Admin only)
exports.completeTurnoverAdmin = async (req, res) => {
  try {
    const { turnoverId } = req.params;

    if (!turnoverId) {
      return res.status(400).json({
        success: false,
        message: "turnoverId is required",
      });
    }

    // Fetch turnover to get userId and bonusAmount
    const PromotionTurnover = require("../models/PromotionTurnover");
    const turnover = await PromotionTurnover.findById(turnoverId);

    if (!turnover) {
      return res.status(404).json({
        success: false,
        message: "Turnover record not found",
      });
    }

    if (turnover.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Turnover is already completed",
      });
    }

    // Manually complete the turnover
    const result = await turnoverTrackingService.completeTurnover(
      turnoverId,
      turnover.user,
      turnover.bonusAmount,
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Turnover completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Complete turnover admin error:", {
      message: error.message,
      stack: error.stack,
      turnoverId: req.params.turnoverId,
    });

    res.status(500).json({
      success: false,
      message: "Server error while completing turnover",
    });
  }
};
