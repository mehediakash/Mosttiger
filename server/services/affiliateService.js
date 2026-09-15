const AffiliateApplication = require("../models/AffiliateApplication");
const User = require("../models/User");
const {
  AFFILIATE_APPLICATION_STATUS,
  AFFILIATE_CARRY_RESET,
  AFFILIATE_PAYMENT_METHOD,
  AFFILIATE_REVENUE_SHARE_START_CONDITION,
  AFFILIATE_SETTLEMENT_FREQUENCY,
  AFFILIATE_STATUS,
  AFFILIATE_WITHDRAW_APPROVAL,
  DEFAULT_AFFILIATE_CONFIG,
} = require("../constants/affiliate");
const logger = require("../utils/logger");
const { sendAffiliateNotification } = require("./affiliateNotificationService");

class AffiliateError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AffiliateError";
    this.statusCode = statusCode;
  }
}

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const phoneRegex = /^01[3-9]\d{8}$/;

const toCleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const toLowerString = (value) => toCleanString(value).toLowerCase();

const toPositiveNumber = (value, fieldName, { min = 0, max = null } = {}) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min) {
    throw new AffiliateError(`${fieldName} must be at least ${min}`);
  }

  if (max !== null && numberValue > max) {
    throw new AffiliateError(`${fieldName} must be at most ${max}`);
  }

  return numberValue;
};

const ensureEnumValue = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw new AffiliateError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return value;
};

class AffiliateService {
  getMarketingUrl(affiliateCode) {
    if (!affiliateCode) return null;

    const baseUrl = process.env.DOMAIN_NAME;
    return `${baseUrl.replace(/\/$/, "")}/register?aff=${affiliateCode}`;
  }

  getAffiliateAccess(affiliate = {}) {
    const status = affiliate?.status || null;

    if (status === AFFILIATE_STATUS.APPROVED) {
      return {
        allowed: true,
        status,
        message: "Affiliate dashboard access granted.",
      };
    }

    if (status === AFFILIATE_STATUS.PENDING) {
      return {
        allowed: false,
        status,
        message: "Affiliate application is pending approval.",
      };
    }

    if (status === AFFILIATE_STATUS.REJECTED) {
      return {
        allowed: false,
        status,
        message: "Affiliate application has been rejected.",
      };
    }

    if (status === AFFILIATE_STATUS.SUSPENDED) {
      return {
        allowed: false,
        status,
        message: "Affiliate account has been suspended.",
      };
    }

    return {
      allowed: false,
      status,
      message: "Affiliate application has not been submitted.",
    };
  }

  validateApplicationPayload(payload) {
    const basicInfo = {
      fullName: toCleanString(payload.fullName || payload.basicInfo?.fullName),
      username: toLowerString(payload.username || payload.basicInfo?.username),
      email: toLowerString(payload.email || payload.basicInfo?.email),
      phone: toCleanString(payload.phone || payload.basicInfo?.phone),
      country: toCleanString(payload.country || payload.basicInfo?.country),
    };

    const payment = {
      preferredPaymentMethod: toLowerString(
        payload.preferredPaymentMethod ||
          payload.paymentMethod ||
          payload.payment?.preferredPaymentMethod,
      ),
      paymentNumber: toCleanString(
        payload.paymentNumber || payload.payment?.paymentNumber,
      ),
      bankName: toCleanString(payload.bankName || payload.payment?.bankName),
      accountName: toCleanString(
        payload.accountName || payload.payment?.accountName,
      ),
      accountNumber: toCleanString(
        payload.accountNumber || payload.payment?.accountNumber,
      ),
      branchName: toCleanString(
        payload.branchName || payload.payment?.branchName,
      ),
    };

    const marketing = {
      promotionMethod: toCleanString(
        payload.promotionMethod || payload.marketing?.promotionMethod,
      ),
      trafficSource: toCleanString(
        payload.trafficSource || payload.marketing?.trafficSource,
      ),
      estimatedMonthlyPlayers: toPositiveNumber(
        payload.estimatedMonthlyPlayers ??
          payload.marketing?.estimatedMonthlyPlayers,
        "Estimated monthly players",
      ),
      previousExperience: toCleanString(
        payload.previousExperience || payload.marketing?.previousExperience,
      ),
      previousBettingSite: toCleanString(
        payload.previousBettingSite || payload.marketing?.previousBettingSite,
      ),
    };

    const socialLinks = {
      facebook: toCleanString(
        payload.facebook || payload.socialLinks?.facebook,
      ),
      telegram: toCleanString(
        payload.telegram || payload.socialLinks?.telegram,
      ),
      website: toCleanString(payload.website || payload.socialLinks?.website),
      youtube: toCleanString(payload.youtube || payload.socialLinks?.youtube),
    };

    if (!basicInfo.fullName) throw new AffiliateError("Full name is required");
    if (!basicInfo.username) throw new AffiliateError("Username is required");
    if (!basicInfo.email || !emailRegex.test(basicInfo.email)) {
      throw new AffiliateError("Valid email is required");
    }
    if (!basicInfo.phone || !phoneRegex.test(basicInfo.phone)) {
      throw new AffiliateError("Valid Bangladesh phone number is required");
    }
    if (!basicInfo.country) throw new AffiliateError("Country is required");

    ensureEnumValue(
      payment.preferredPaymentMethod,
      Object.values(AFFILIATE_PAYMENT_METHOD),
      "Preferred payment method",
    );

    if (!payment.paymentNumber) {
      throw new AffiliateError("Payment number is required");
    }

    if (
      [
        AFFILIATE_PAYMENT_METHOD.BKASH,
        AFFILIATE_PAYMENT_METHOD.NAGAD,
        AFFILIATE_PAYMENT_METHOD.ROCKET,
      ].includes(payment.preferredPaymentMethod) &&
      !phoneRegex.test(payment.paymentNumber)
    ) {
      throw new AffiliateError("Valid payment number is required");
    }

    if (!marketing.promotionMethod) {
      throw new AffiliateError("Promotion method is required");
    }
    if (!marketing.trafficSource) {
      throw new AffiliateError("Traffic source is required");
    }

    return {
      basicInfo,
      payment,
      marketing,
      socialLinks,
    };
  }

  validateConfigPayload(payload = {}, existingConfig = {}) {
    const config = {
      revenueSharePercentage:
        payload.revenueSharePercentage ??
        payload.revenueShare ??
        existingConfig.revenueSharePercentage ??
        DEFAULT_AFFILIATE_CONFIG.revenueSharePercentage,
      minimumDeposit:
        payload.minimumDeposit ??
        existingConfig.minimumDeposit ??
        DEFAULT_AFFILIATE_CONFIG.minimumDeposit,
      requiredTurnover:
        payload.requiredTurnover ??
        existingConfig.requiredTurnover ??
        DEFAULT_AFFILIATE_CONFIG.requiredTurnover,
      enableNegativeCarry:
        payload.enableNegativeCarry ??
        existingConfig.enableNegativeCarry ??
        DEFAULT_AFFILIATE_CONFIG.enableNegativeCarry,
      carryReset:
        payload.carryReset ??
        existingConfig.carryReset ??
        DEFAULT_AFFILIATE_CONFIG.carryReset,
      maximumNegativeCarry:
        payload.maximumNegativeCarry ??
        existingConfig.maximumNegativeCarry ??
        DEFAULT_AFFILIATE_CONFIG.maximumNegativeCarry,
      settlementFrequency:
        payload.settlementFrequency ??
        payload.settlement ??
        existingConfig.settlementFrequency ??
        DEFAULT_AFFILIATE_CONFIG.settlementFrequency,
      minimumWithdraw:
        payload.minimumWithdraw ??
        existingConfig.minimumWithdraw ??
        DEFAULT_AFFILIATE_CONFIG.minimumWithdraw,
      withdrawApproval:
        payload.withdrawApproval ??
        existingConfig.withdrawApproval ??
        DEFAULT_AFFILIATE_CONFIG.withdrawApproval,
      revenueShareStartCondition:
        payload.revenueShareStartCondition ??
        existingConfig.revenueShareStartCondition ??
        DEFAULT_AFFILIATE_CONFIG.revenueShareStartCondition,
      metadata: payload.metadata || existingConfig.metadata || {},
    };

    return {
      revenueSharePercentage: toPositiveNumber(
        config.revenueSharePercentage,
        "Revenue share percentage",
        { min: 0, max: 100 },
      ),
      minimumDeposit: toPositiveNumber(
        config.minimumDeposit,
        "Minimum deposit",
      ),
      requiredTurnover: toPositiveNumber(
        config.requiredTurnover,
        "Required turnover",
      ),
      enableNegativeCarry: Boolean(config.enableNegativeCarry),
      carryReset: ensureEnumValue(
        toLowerString(config.carryReset),
        Object.values(AFFILIATE_CARRY_RESET),
        "Carry reset",
      ),
      maximumNegativeCarry: toPositiveNumber(
        config.maximumNegativeCarry,
        "Maximum negative carry",
      ),
      settlementFrequency: ensureEnumValue(
        toLowerString(config.settlementFrequency),
        Object.values(AFFILIATE_SETTLEMENT_FREQUENCY),
        "Settlement frequency",
      ),
      minimumWithdraw: toPositiveNumber(
        config.minimumWithdraw,
        "Minimum withdraw",
      ),
      withdrawApproval: ensureEnumValue(
        toLowerString(config.withdrawApproval),
        Object.values(AFFILIATE_WITHDRAW_APPROVAL),
        "Withdraw approval",
      ),
      revenueShareStartCondition: ensureEnumValue(
        toLowerString(config.revenueShareStartCondition),
        Object.values(AFFILIATE_REVENUE_SHARE_START_CONDITION),
        "Revenue share start condition",
      ),
      metadata:
        config.metadata && typeof config.metadata === "object"
          ? config.metadata
          : {},
    };
  }

  async submitApplication(userId, payload) {
    const user = await User.findById(userId);
    if (!user) throw new AffiliateError("User not found", 404);

    const affiliateAccess = this.getAffiliateAccess(user.affiliate);

    if (affiliateAccess.status === AFFILIATE_STATUS.PENDING) {
      throw new AffiliateError(
        "Affiliate application is pending approval.",
        409,
      );
    }

    if (affiliateAccess.status === AFFILIATE_STATUS.APPROVED) {
      throw new AffiliateError("Affiliate account is already approved.", 409);
    }

    if (affiliateAccess.status === AFFILIATE_STATUS.SUSPENDED) {
      throw new AffiliateError("Affiliate account has been suspended.", 403);
    }

    const existingApplication = await AffiliateApplication.findOne({
      user: userId,
    })
      .select("_id status")
      .lean();

    if (existingApplication) {
      throw new AffiliateError(
        `Affiliate application already exists with status ${existingApplication.status}.`,
        409,
      );
    }

    const applicationData = this.validateApplicationPayload(payload);

    let application;
    try {
      application = await AffiliateApplication.create({
        user: userId,
        ...applicationData,
        status: AFFILIATE_APPLICATION_STATUS.PENDING,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new AffiliateError("Affiliate application already exists.", 409);
      }
      throw error;
    }

    user.affiliate = {
      ...user.affiliate?.toObject?.(),
      status: AFFILIATE_STATUS.PENDING,
      approved: false,
      application: application._id,
    };
    await user.save();

    sendAffiliateNotification(
      userId,
      "Affiliate application submitted",
      "Your affiliate application is pending approval.",
      { application: application._id },
    );

    logger.info("Affiliate application submitted", {
      user: userId.toString(),
      application: application._id.toString(),
    });

    return application;
  }

  async getMyStatus(userId) {
    const user = await User.findById(userId)
      .select("affiliate username fullName email phone")
      .populate("affiliate.application")
      .lean();

    if (!user) throw new AffiliateError("User not found", 404);

    return {
      affiliate: user.affiliate || {},
      access: this.getAffiliateAccess(user.affiliate),
      marketingUrl: this.getMarketingUrl(user.affiliate?.affiliateCode),
    };
  }

  async getMyProfile(userId) {
    const user = await User.findById(userId)
      .select("username fullName email phone affiliate createdAt")
      .populate("affiliate.approvedBy", "username fullName email")
      .populate("affiliate.application")
      .lean();

    if (!user) throw new AffiliateError("User not found", 404);

    return {
      user,
      access: this.getAffiliateAccess(user.affiliate),
      marketingUrl: this.getMarketingUrl(user.affiliate?.affiliateCode),
    };
  }

  async getApplications(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = {};

    if (query.status) {
      filter.status = ensureEnumValue(
        toLowerString(query.status),
        Object.values(AFFILIATE_APPLICATION_STATUS),
        "Status",
      );
    }

    const [applications, total] = await Promise.all([
      AffiliateApplication.find(filter)
        .populate("user", "username fullName email phone affiliate")
        .populate("reviewedBy", "username fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateApplication.countDocuments(filter),
    ]);

    return {
      applications,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getApplicationDetails(applicationId) {
    const application = await AffiliateApplication.findById(applicationId)
      .populate("user", "username fullName email phone affiliate createdAt")
      .populate("reviewedBy", "username fullName email");

    if (!application) {
      throw new AffiliateError("Affiliate application not found", 404);
    }

    return application;
  }

  async generateAffiliateCode(user) {
    const base = (user.username || user.fullName || "AFF")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8)
      .padEnd(3, "A");

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const random = Math.floor(1000 + Math.random() * 9000);
      const code = `${base}${random}`;
      const existing = await User.findOne({ "affiliate.affiliateCode": code })
        .select("_id")
        .lean();

      if (!existing) return code;
    }

    throw new AffiliateError("Unable to generate affiliate code", 500);
  }

  async approveApplication(applicationId, adminId, payload = {}) {
    const application = await AffiliateApplication.findById(applicationId);
    if (!application) {
      throw new AffiliateError("Affiliate application not found", 404);
    }

    const user = await User.findById(application.user);
    if (!user) throw new AffiliateError("Application user not found", 404);

    if (user.affiliate?.status === AFFILIATE_STATUS.SUSPENDED) {
      throw new AffiliateError("Suspended affiliate cannot be approved", 403);
    }

    const config = this.validateConfigPayload(payload.config || payload);
    const affiliateCode =
      user.affiliate?.affiliateCode || (await this.generateAffiliateCode(user));

    application.status = AFFILIATE_APPLICATION_STATUS.APPROVED;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    application.rejectionReason = null;
    application.adminNote = toCleanString(payload.adminNote) || null;
    await application.save();

    user.affiliate = {
      ...user.affiliate?.toObject?.(),
      approved: true,
      status: AFFILIATE_STATUS.APPROVED,
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectedAt: null,
      rejectedBy: null,
      suspendedAt: null,
      suspendedBy: null,
      affiliateCode,
      application: application._id,
      config,
    };

    try {
      await user.save();
    } catch (error) {
      if (error.code === 11000) {
        user.affiliate.affiliateCode = await this.generateAffiliateCode(user);
        await user.save();
      } else {
        throw error;
      }
    }

    sendAffiliateNotification(
      user._id,
      "Affiliate application approved",
      "Your affiliate account has been approved.",
      {
        application: application._id,
        affiliateCode: user.affiliate?.affiliateCode,
      },
    );

    logger.info("Affiliate application approved", {
      user: user._id.toString(),
      application: application._id.toString(),
      approvedBy: adminId.toString(),
      affiliateCode: user.affiliate?.affiliateCode,
    });

    return {
      application,
      affiliate: user,
    };
  }

  async rejectApplication(applicationId, adminId, payload = {}) {
    const application = await AffiliateApplication.findById(applicationId);
    if (!application) {
      throw new AffiliateError("Affiliate application not found", 404);
    }

    const reason = toCleanString(payload.rejectionReason || payload.reason);
    if (!reason) throw new AffiliateError("Rejection reason is required");

    const user = await User.findById(application.user);
    if (!user) throw new AffiliateError("Application user not found", 404);

    application.status = AFFILIATE_APPLICATION_STATUS.REJECTED;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    application.rejectionReason = reason;
    application.adminNote = toCleanString(payload.adminNote) || null;
    await application.save();

    user.affiliate = {
      ...user.affiliate?.toObject?.(),
      approved: false,
      status: AFFILIATE_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: adminId,
      application: application._id,
    };
    await user.save();

    sendAffiliateNotification(
      user._id,
      "Affiliate application rejected",
      "Your affiliate application has been rejected.",
      { application: application._id, reason },
    );

    logger.info("Affiliate application rejected", {
      user: user._id.toString(),
      application: application._id.toString(),
      rejectedBy: adminId.toString(),
    });

    return {
      application,
      affiliate: user,
    };
  }

  async suspendAffiliate(userId, adminId, payload = {}) {
    const user = await User.findById(userId);
    if (!user) throw new AffiliateError("Affiliate user not found", 404);

    if (!user.affiliate?.status) {
      throw new AffiliateError("User is not an affiliate", 404);
    }

    user.affiliate = {
      ...user.affiliate?.toObject?.(),
      approved: false,
      status: AFFILIATE_STATUS.SUSPENDED,
      suspendedAt: new Date(),
      suspendedBy: adminId,
      metadata: {
        ...(user.affiliate?.metadata?.toObject?.() ||
          user.affiliate?.metadata ||
          {}),
        suspensionReason: toCleanString(payload.reason) || null,
      },
    };
    await user.save();

    if (user.affiliate.application) {
      await AffiliateApplication.findByIdAndUpdate(user.affiliate.application, {
        status: AFFILIATE_APPLICATION_STATUS.SUSPENDED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNote: toCleanString(payload.adminNote) || null,
      });
    }

    sendAffiliateNotification(
      user._id,
      "Affiliate account suspended",
      "Your affiliate account has been suspended.",
      { reason: toCleanString(payload.reason) || null },
    );

    logger.info("Affiliate account suspended", {
      user: user._id.toString(),
      suspendedBy: adminId.toString(),
    });

    return user;
  }

  async updateAffiliateStatus(userId, adminId, payload = {}) {
    const status = ensureEnumValue(
      toLowerString(payload.status),
      Object.values(AFFILIATE_STATUS),
      "Affiliate status",
    );

    if (status === AFFILIATE_STATUS.SUSPENDED) {
      return this.suspendAffiliate(userId, adminId, payload);
    }

    const user = await User.findById(userId);
    if (!user) throw new AffiliateError("Affiliate user not found", 404);
    if (!user.affiliate?.status) {
      throw new AffiliateError("User is not an affiliate", 404);
    }

    if (status === AFFILIATE_STATUS.APPROVED) {
      const config = this.validateConfigPayload(
        payload.config || {},
        user.affiliate?.config || {},
      );
      const affiliateCode =
        user.affiliate?.affiliateCode ||
        (await this.generateAffiliateCode(user));

      user.affiliate = {
        ...user.affiliate?.toObject?.(),
        approved: true,
        status,
        approvedAt: user.affiliate?.approvedAt || new Date(),
        approvedBy: user.affiliate?.approvedBy || adminId,
        affiliateCode,
        config,
      };
    } else {
      user.affiliate = {
        ...user.affiliate?.toObject?.(),
        approved: false,
        status,
        rejectedAt:
          status === AFFILIATE_STATUS.REJECTED
            ? new Date()
            : user.affiliate?.rejectedAt,
        rejectedBy:
          status === AFFILIATE_STATUS.REJECTED
            ? adminId
            : user.affiliate?.rejectedBy,
      };
    }

    await user.save();

    logger.info("Affiliate status updated", {
      user: user._id.toString(),
      status,
      updatedBy: adminId.toString(),
    });

    if (user.affiliate.application) {
      const applicationStatus =
        status === AFFILIATE_STATUS.APPROVED
          ? AFFILIATE_APPLICATION_STATUS.APPROVED
          : status === AFFILIATE_STATUS.REJECTED
            ? AFFILIATE_APPLICATION_STATUS.REJECTED
            : AFFILIATE_APPLICATION_STATUS.PENDING;

      await AffiliateApplication.findByIdAndUpdate(user.affiliate.application, {
        status: applicationStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });
    }

    return user;
  }

  async getAffiliateConfig(userId) {
    const user = await User.findById(userId)
      .select("username affiliate")
      .lean();
    if (!user) throw new AffiliateError("Affiliate user not found", 404);
    if (!user.affiliate?.status) {
      throw new AffiliateError("User is not an affiliate", 404);
    }

    return user.affiliate.config || {};
  }

  async updateAffiliateConfig(userId, payload = {}) {
    const user = await User.findById(userId);
    if (!user) throw new AffiliateError("Affiliate user not found", 404);
    if (!user.affiliate?.status) {
      throw new AffiliateError("User is not an affiliate", 404);
    }

    const config = this.validateConfigPayload(
      payload,
      user.affiliate?.config || {},
    );
    user.affiliate.config = config;
    await user.save();

    logger.info("Affiliate config updated", {
      user: user._id.toString(),
    });

    return user.affiliate.config;
  }
}

module.exports = new AffiliateService();
module.exports.AffiliateError = AffiliateError;
