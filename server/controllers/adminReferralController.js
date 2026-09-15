const adminReferralService = require("../services/adminReferralService");

const handleReferralAdminError = (res, error, fallbackMessage) => {
  if (error.name === "AdminReferralError") {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

exports.getConfig = async (req, res) => {
  try {
    const data = await adminReferralService.getConfig();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while fetching referral configuration",
    );
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const data = await adminReferralService.updateConfig(req.body, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Referral configuration saved successfully.",
      data,
    });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while saving referral configuration",
    );
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const data = await adminReferralService.getAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while fetching referral analytics",
    );
  }
};

exports.getHistory = async (req, res) => {
  try {
    const data = await adminReferralService.getHistory(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while fetching referral history",
    );
  }
};

exports.getHistoryDetails = async (req, res) => {
  try {
    const data = await adminReferralService.getHistoryDetails(
      req.params.relationshipId,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while fetching referral details",
    );
  }
};

exports.getPendingClaims = async (req, res) => {
  try {
    const data = await adminReferralService.getPendingClaims(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralAdminError(
      res,
      error,
      "Server error while fetching referral pending claims",
    );
  }
};
