const freeSpinService = require("../services/freeSpinService");

// @desc    Start a free spin session
// @route   POST /api/free-spins/start
// @access  Private (User)
exports.startFreeSpinSession = async (req, res) => {
  try {
    const { gameId, spins } = req.body;
    const userId = req.user.id;

    // Validation
    if (!gameId || !spins || spins <= 0) {
      return res.status(400).json({
        success: false,
        message: "gameId and spins (> 0) are required",
      });
    }

    const result = await freeSpinService.startFreeSpinSession(
      userId,
      gameId,
      spins,
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
    console.error("Start free spin session error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while starting free spin session",
    });
  }
};

// @desc    Complete a free spin session with winnings
// @route   POST /api/free-spins/:sessionId/complete
// @access  Private (User)
exports.completeFreeSpinSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { winnings = 0 } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const result = await freeSpinService.completeFreeSpinSession(
      sessionId,
      winnings,
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
    console.error("Complete free spin session error:", {
      message: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
      body: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Server error while completing free spin session",
    });
  }
};

// @desc    Cancel a free spin session
// @route   POST /api/free-spins/:sessionId/cancel
// @access  Private (User)
exports.cancelFreeSpinSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const result = await freeSpinService.cancelFreeSpinSession(sessionId);

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
    console.error("Cancel free spin session error:", {
      message: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
    });

    res.status(500).json({
      success: false,
      message: "Server error while cancelling free spin session",
    });
  }
};

// @desc    Get user's active free spin sessions
// @route   GET /api/free-spins/active
// @access  Private (User)
exports.getUserActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await freeSpinService.getUserActiveSessions(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get user active sessions error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Server error while fetching active sessions",
    });
  }
};

// @desc    Admin expire old free spin sessions (cron job)
// @route   POST /api/free-spins/admin/expire
// @access  Private (Admin only)
exports.expireSessions = async (req, res) => {
  try {
    const result = await freeSpinService.expireOldSessions();

    res.status(200).json({
      success: true,
      message: `Expiry check completed. ${result.expiredCount} sessions expired.`,
      data: result,
    });
  } catch (error) {
    console.error("Expire free spin sessions error:", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Server error while expiring sessions",
    });
  }
};
