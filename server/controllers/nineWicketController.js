const nineWicketService = require("../services/nineWicketService");
const {
  NineWicketInsufficientBalanceError,
} = require("../services/nineWicketService");

exports.launch = async (req, res) => {
  try {
    const result = await nineWicketService.launch(req.user, {
      amount: req.body.amount,
      language: req.body.language || "en",
    });

    return res.status(200).json({
      success: true,
      code: 0,
      data: {
        code: 0,
        url: result.url,
      },
    });
  } catch (error) {
    if (error instanceof NineWicketInsufficientBalanceError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        requiresDeposit: true,
        data: {
          availableBalance: error.availableBalance,
          requiredAmount: error.requiredAmount,
        },
      });
    }

    const statusCode =
      error.message === "Insufficient wallet balance" ||
      error.message === "Launch amount must be greater than 0"
        ? 400
        : error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "9Wicket launch failed",
    });
  }
};

exports.callback = async (req, res) => {
  try {
    const result = await nineWicketService.handleCallback(req.body);
    return res.status(200).json(result || { success: true });
  } catch (error) {
    return res.status(200).json({ success: false, message: error.message });
  }
};

exports.settleSession = async (req, res) => {
  try {
    const result = await nineWicketService.settleSession({
      sessionId: req.params.sessionId || req.body.sessionId,
      userId: req.user._id,
    });

    if (result.status === "settlement_in_progress") {
      return res.status(409).json({
        success: false,
        message: result.message || "Settlement is currently in progress",
        data: result,
      });
    }

    if (result.status === "reconciliation_required") {
      return res.status(400).json({
        success: false,
        message: result.message || "Session requires reconciliation",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "9Wicket settlement failed",
    });
  }
};

exports.settleActiveSession = async (req, res) => {
  try {
    const result = await nineWicketService.settleActiveSession({
      userId: req.user._id,
    });

    if (result.status === "settlement_in_progress") {
      return res.status(409).json({
        success: false,
        message: result.message || "Settlement is currently in progress",
        data: result,
      });
    }

    if (result.status === "reconciliation_required") {
      return res.status(400).json({
        success: false,
        message: result.message || "Session requires reconciliation",
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "9Wicket settlement failed",
    });
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const result = await nineWicketService.getActiveSession({
      userId: req.user._id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve active 9Wicket session",
    });
  }
};
