const affiliateService = require("../services/affiliateService");
const affiliateRevenueService = require("../services/affiliateRevenueService");
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

exports.getApplications = async (req, res) => {
  try {
    const data = await affiliateService.getApplications(req.query);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate applications",
    );
  }
};

exports.getApplicationDetails = async (req, res) => {
  try {
    const application = await affiliateService.getApplicationDetails(
      req.params.applicationId,
    );

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate application",
    );
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const data = await affiliateService.approveApplication(
      req.params.applicationId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate application approved successfully.",
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while approving affiliate application",
    );
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const data = await affiliateService.rejectApplication(
      req.params.applicationId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate application rejected successfully.",
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while rejecting affiliate application",
    );
  }
};

exports.suspendAffiliate = async (req, res) => {
  try {
    const affiliate = await affiliateService.suspendAffiliate(
      req.params.userId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate suspended successfully.",
      data: affiliate,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while suspending affiliate",
    );
  }
};

exports.updateAffiliateStatus = async (req, res) => {
  try {
    const affiliate = await affiliateService.updateAffiliateStatus(
      req.params.userId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate status updated successfully.",
      data: affiliate,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while updating affiliate status",
    );
  }
};

exports.getAffiliateConfig = async (req, res) => {
  try {
    const config = await affiliateService.getAffiliateConfig(req.params.userId);

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while fetching affiliate config",
    );
  }
};

exports.updateAffiliateConfig = async (req, res) => {
  try {
    const config = await affiliateService.updateAffiliateConfig(
      req.params.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate config updated successfully.",
      data: config,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while updating affiliate config",
    );
  }
};

exports.runAffiliateSettlement = async (req, res) => {
  try {
    const periodStart = req.body.periodStart
      ? new Date(req.body.periodStart)
      : null;
    const periodEnd = req.body.periodEnd ? new Date(req.body.periodEnd) : null;

    if (!periodStart || !periodEnd || periodStart >= periodEnd) {
      return res.status(400).json({
        success: false,
        message: "Valid periodStart and periodEnd are required",
      });
    }

    const settlement = await affiliateRevenueService.settleAffiliate(
      req.params.userId,
      periodStart,
      periodEnd,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate settlement completed successfully.",
      data: settlement,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while running affiliate settlement",
    );
  }
};

exports.runDueSettlements = async (req, res) => {
  try {
    const data = await affiliateRevenueService.runDueSettlements();

    res.status(200).json({
      success: true,
      message: "Due affiliate settlements completed successfully.",
      data,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while running affiliate settlements",
    );
  }
};

exports.refreshAffiliateStatistics = async (req, res) => {
  try {
    const statistics = await affiliateRevenueService.refreshAffiliateStatistics(
      req.params.userId,
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while refreshing affiliate statistics",
    );
  }
};

exports.getAffiliateTransactions = async (req, res) => {
  try {
    const data = await affiliateRevenueService.getAffiliateTransactions(
      req.params.userId,
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

exports.getWithdrawals = async (req, res) => {
  try {
    const data = await affiliateWithdrawalService.listAllWithdrawals(req.query);

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

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await affiliateWithdrawalService.approveWithdrawal(
      req.params.withdrawalId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate withdrawal approved successfully.",
      data: withdrawal,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while approving affiliate withdrawal",
    );
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await affiliateWithdrawalService.rejectWithdrawal(
      req.params.withdrawalId,
      req.user._id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Affiliate withdrawal rejected successfully.",
      data: withdrawal,
    });
  } catch (error) {
    return handleAffiliateError(
      res,
      error,
      "Server error while rejecting affiliate withdrawal",
    );
  }
};
