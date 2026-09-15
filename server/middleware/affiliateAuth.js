const { AFFILIATE_STATUS } = require("../constants/affiliate");

exports.requireApprovedAffiliate = (req, res, next) => {
  const status = req.user?.affiliate?.status;

  if (status === AFFILIATE_STATUS.APPROVED) {
    return next();
  }

  if (status === AFFILIATE_STATUS.PENDING) {
    return res.status(403).json({
      success: false,
      message: "Affiliate application is pending approval.",
    });
  }

  if (status === AFFILIATE_STATUS.REJECTED) {
    return res.status(403).json({
      success: false,
      message: "Affiliate application has been rejected.",
    });
  }

  if (status === AFFILIATE_STATUS.SUSPENDED) {
    return res.status(403).json({
      success: false,
      message: "Affiliate account has been suspended.",
    });
  }

  return res.status(403).json({
    success: false,
    message: "Affiliate approval is required to access this route.",
  });
};
