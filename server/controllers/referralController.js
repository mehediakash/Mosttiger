const referralService = require("../services/referralService");

const handleReferralError = (res, error, fallbackMessage) => {
  if (error.name === "ReferralError") {
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

exports.getMyReferralDashboard = async (req, res) => {
  try {
    const data = await referralService.getDashboard(req.user._id);
    return res.status(200).json({
      success: true,
      data: {
        ...data,
        referralCode: req.user.referenceCode,
      },
    });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral dashboard",
    );
  }
};

exports.getMyReferralStatistics = async (req, res) => {
  try {
    const data = await referralService.getStatistics(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral statistics",
    );
  }
};

exports.getMyReferralList = async (req, res) => {
  try {
    const data = await referralService.listReferrals(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referrals",
    );
  }
};

exports.getMyReferralDetails = async (req, res) => {
  try {
    const data = await referralService.getReferralDetails(
      req.user._id,
      req.params.relationshipId,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral details",
    );
  }
};

exports.getMyPendingBonuses = async (req, res) => {
  try {
    const data = await referralService.listPendingBonuses(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching pending referral bonuses",
    );
  }
};

exports.getMyQualifiedReferrals = async (req, res) => {
  try {
    const data = await referralService.listQualifiedReferrals(
      req.user._id,
      req.query,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching qualified referrals",
    );
  }
};

exports.claimReferralBonus = async (req, res) => {
  try {
    const data = await referralService.claimBonus(
      req.user._id,
      req.params.bonusId,
    );

    return res.status(200).json({
      success: true,
      message: "Referral bonus claimed successfully.",
      data,
    });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while claiming referral bonus",
    );
  }
};

exports.getReferralBonusStatus = async (req, res) => {
  try {
    const data = await referralService.getBonusStatus(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral bonus status",
    );
  }
};

exports.getReferralTurnover = async (req, res) => {
  try {
    const data = await referralService.getReferralTurnover(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral turnover",
    );
  }
};

exports.getReferralBonusHistory = async (req, res) => {
  try {
    const data = await referralService.getBonusHistory(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleReferralError(
      res,
      error,
      "Server error while fetching referral bonus history",
    );
  }
};
