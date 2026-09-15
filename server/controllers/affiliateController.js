const affiliateService = require("../services/affiliateService");
const affiliateRevenueService = require("../services/affiliateRevenueService");
const affiliateTrackingService = require("../services/affiliateTrackingService");
const affiliateWithdrawalService = require("../services/affiliateWithdrawalService");

const handleAffiliateError = (res, error, fallbackMessage) => {
  if (error.name === "AffiliateError") {
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

exports.applyAffiliate = async (req, res) => {
  try {
    const application = await affiliateService.submitApplication(
      req.user._id,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Affiliate application submitted successfully.",
      data: application,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while submitting affiliate application",
    );
  }
};

exports.getMyAffiliateStatus = async (req, res) => {
  try {
    const data = await affiliateService.getMyStatus(req.user._id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate status",
    );
  }
};

exports.getMyAffiliateProfile = async (req, res) => {
  try {
    const data = await affiliateService.getMyProfile(req.user._id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate profile",
    );
  }
};

exports.trackAffiliateClick = async (req, res) => {
  try {
    const click = await affiliateTrackingService.trackClick(req.params.code, {
      ip: req.ip || req.clientIP,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: {
        tracked: Boolean(click),
      },
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while tracking affiliate click",
    );
  }
};

exports.getMyAffiliatePlayers = async (req, res) => {
  try {
    const data = await affiliateTrackingService.listAffiliatePlayers(
      req.user._id,
      req.query,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate players",
    );
  }
};

exports.getMyAffiliateStatistics = async (req, res) => {
  try {
    const statistics = await affiliateRevenueService.refreshAffiliateStatistics(
      req.user._id,
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate statistics",
    );
  }
};

exports.getMyAffiliateTransactions = async (req, res) => {
  try {
    const data = await affiliateRevenueService.getAffiliateTransactions(
      req.user._id,
      req.query,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate transactions",
    );
  }
};

exports.requestAffiliateWithdrawal = async (req, res) => {
  try {
    const withdrawal = await affiliateWithdrawalService.requestWithdrawal(
      req.user._id,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Affiliate withdrawal request submitted successfully.",
      data: withdrawal,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while submitting affiliate withdrawal request",
    );
  }
};

exports.getMyAffiliateWithdrawals = async (req, res) => {
  try {
    const data = await affiliateWithdrawalService.listAffiliateWithdrawals(
      req.user._id,
      req.query,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate withdrawals",
    );
  }
};
