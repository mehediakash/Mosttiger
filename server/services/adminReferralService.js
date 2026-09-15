const mongoose = require("mongoose");
const ReferralBonus = require("../models/ReferralBonus");
const ReferralConfig = require("../models/ReferralConfig");
const ReferralRelationship = require("../models/ReferralRelationship");
const ReferralTransaction = require("../models/ReferralTransaction");
const {
  REFERRAL_BONUS_STATUS,
  REFERRAL_CONFIG,
  REFERRAL_RELATIONSHIP_STATUS,
} = require("../constants/referral");

class AdminReferralError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AdminReferralError";
    this.statusCode = statusCode;
  }
}

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const defaultConfig = () => ({
  bonusAmount: REFERRAL_CONFIG.bonusAmount,
  minimumFirstDeposit: REFERRAL_CONFIG.minimumFirstDeposit,
  requiredTurnoverMultiplier: REFERRAL_CONFIG.turnoverMultiplier,
  bonusClaimExpiryDays: 0,
  enabled: true,
  maximumReferralBonusPerUser: 0,
  maximumReferralCount: 0,
  status: "active",
});

const dateFilter = (query = {}, field = "createdAt") => {
  const filter = {};
  const start = query.startDate || query.dateFrom;
  const end = query.endDate || query.dateTo;

  if (start || end) {
    filter[field] = {};
    if (start) filter[field].$gte = new Date(start);
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      filter[field].$lte = endDate;
    }
  }

  return filter;
};

const paginationFromQuery = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const relationshipStatuses = new Set(Object.values(REFERRAL_RELATIONSHIP_STATUS));
const bonusStatuses = new Set(Object.values(REFERRAL_BONUS_STATUS));

class AdminReferralService {
  async getConfig() {
    const config = await ReferralConfig.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: defaultConfig() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return { config };
  }

  async updateConfig(payload = {}, adminId) {
    const update = {};
    const numericFields = [
      "bonusAmount",
      "minimumFirstDeposit",
      "requiredTurnoverMultiplier",
      "bonusClaimExpiryDays",
      "maximumReferralBonusPerUser",
      "maximumReferralCount",
    ];

    numericFields.forEach((field) => {
      if (payload[field] !== undefined) update[field] = Math.max(0, toNumber(payload[field]));
    });

    if (payload.enabled !== undefined) update.enabled = Boolean(payload.enabled);
    if (payload.status !== undefined) {
      if (!["active", "inactive"].includes(payload.status)) {
        throw new AdminReferralError("Invalid referral status", 422);
      }
      update.status = payload.status;
    }
    update.updatedBy = adminId;

    const config = await ReferralConfig.findOneAndUpdate(
      { key: "default" },
      { $set: update, $setOnInsert: defaultConfig() },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return { config };
  }

  async getAnalytics(query = {}) {
    const relationshipMatch = dateFilter(query, "createdAt");
    const bonusMatch = dateFilter(query, "createdAt");

    const [relationshipStats, bonusStats, bonusAmountStats, monthlyReferral, dailyReferral, bonusTrend, qualifiedTrend] =
      await Promise.all([
        ReferralRelationship.aggregate([
          { $match: relationshipMatch },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        ReferralBonus.aggregate([
          { $match: bonusMatch },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        ReferralBonus.aggregate([
          { $match: bonusMatch },
          {
            $group: {
              _id: "$status",
              total: { $sum: "$bonusAmount" },
            },
          },
        ]),
        ReferralRelationship.aggregate([
          { $match: relationshipMatch },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              total: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: "$_id", total: 1 } },
        ]),
        ReferralRelationship.aggregate([
          { $match: relationshipMatch },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", total: 1 } },
        ]),
        ReferralBonus.aggregate([
          { $match: bonusMatch },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              generated: { $sum: "$bonusAmount" },
              claimed: {
                $sum: {
                  $cond: [
                    { $in: ["$status", [REFERRAL_BONUS_STATUS.CLAIMED, REFERRAL_BONUS_STATUS.TURNOVER_ACTIVE, REFERRAL_BONUS_STATUS.COMPLETED]] },
                    "$bonusAmount",
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", generated: 1, claimed: 1 } },
        ]),
        ReferralRelationship.aggregate([
          {
            $match: {
              ...relationshipMatch,
              status: {
                $in: [
                  REFERRAL_RELATIONSHIP_STATUS.QUALIFIED,
                  REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED,
                ],
              },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$qualifiedAt", "$createdAt"] } } },
              qualified: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", qualified: 1 } },
        ]),
      ]);

    const relationshipMap = Object.fromEntries(relationshipStats.map((item) => [item._id, item.count]));
    const bonusMap = Object.fromEntries(bonusStats.map((item) => [item._id, item.count]));
    const amountMap = Object.fromEntries(bonusAmountStats.map((item) => [item._id, item.total]));

    return {
      statistics: {
        totalReferrals: Object.values(relationshipMap).reduce((sum, value) => sum + value, 0),
        pendingDeposit: relationshipMap[REFERRAL_RELATIONSHIP_STATUS.WAITING_DEPOSIT] || 0,
        waitingTurnover: relationshipMap[REFERRAL_RELATIONSHIP_STATUS.WAITING_TURNOVER] || 0,
        qualified:
          (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.QUALIFIED] || 0) +
          (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED] || 0),
        pendingClaim: bonusMap[REFERRAL_BONUS_STATUS.PENDING_CLAIM] || 0,
        claimed: bonusMap[REFERRAL_BONUS_STATUS.CLAIMED] || 0,
        completed: bonusMap[REFERRAL_BONUS_STATUS.COMPLETED] || 0,
        cancelled:
          (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.CANCELLED] || 0) +
          (bonusMap[REFERRAL_BONUS_STATUS.CANCELLED] || 0),
        totalBonusGenerated: Object.values(amountMap).reduce((sum, value) => sum + value, 0),
        totalBonusClaimed:
          (amountMap[REFERRAL_BONUS_STATUS.CLAIMED] || 0) +
          (amountMap[REFERRAL_BONUS_STATUS.TURNOVER_ACTIVE] || 0) +
          (amountMap[REFERRAL_BONUS_STATUS.COMPLETED] || 0),
        totalBonusCompleted: amountMap[REFERRAL_BONUS_STATUS.COMPLETED] || 0,
      },
      charts: {
        monthlyReferral,
        dailyReferral,
        referralBonusTrend: bonusTrend,
        qualifiedPlayersTrend: qualifiedTrend,
      },
    };
  }

  async getHistory(query = {}) {
    const { page, limit, skip } = paginationFromQuery(query);
    const filter = {
      ...dateFilter(query, "createdAt"),
    };
    if (query.status && relationshipStatuses.has(query.status)) {
      filter.status = query.status;
    }
    if (query.referralCode) filter.referralCode = String(query.referralCode).trim().toUpperCase();

    if (query.status && bonusStatuses.has(query.status)) {
      const matchingBonuses = await ReferralBonus.find({ status: query.status })
        .select("relationship")
        .lean();
      filter._id = { $in: matchingBonuses.map((bonus) => bonus.relationship) };
    }

    const sortField = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;

    const [relationships, total] = await Promise.all([
      ReferralRelationship.find(filter)
        .populate("referrer", "username fullName email phone referenceCode")
        .populate("referredUser", "username fullName email phone createdAt")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReferralRelationship.countDocuments(filter),
    ]);

    const relationshipIds = relationships.map((item) => item._id);
    const bonuses = await ReferralBonus.find({ relationship: { $in: relationshipIds } })
      .lean();
    const bonusByRelationship = new Map(
      bonuses.map((bonus) => [bonus.relationship.toString(), bonus]),
    );

    return {
      referrals: relationships.map((relationship) => ({
        ...relationship,
        bonus: bonusByRelationship.get(relationship._id.toString()) || null,
      })),
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getHistoryDetails(relationshipId) {
    if (!mongoose.Types.ObjectId.isValid(relationshipId)) {
      throw new AdminReferralError("Referral relationship not found", 404);
    }

    const relationship = await ReferralRelationship.findById(relationshipId)
      .populate("referrer", "username fullName email phone referenceCode")
      .populate("referredUser", "username fullName email phone createdAt")
      .lean();

    if (!relationship) {
      throw new AdminReferralError("Referral relationship not found", 404);
    }

    const [bonus, transactions] = await Promise.all([
      ReferralBonus.findOne({ relationship: relationship._id }).lean(),
      ReferralTransaction.find({ relationship: relationship._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return { relationship, bonus, transactions };
  }

  async getPendingClaims(query = {}) {
    const { page, limit, skip } = paginationFromQuery(query);
    const filter = {
      status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
      ...dateFilter(query, "createdAt"),
    };
    if (query.referralCode) filter.referralCode = String(query.referralCode).trim().toUpperCase();

    const [bonuses, total] = await Promise.all([
      ReferralBonus.find(filter)
        .populate("referrer", "username fullName email phone referenceCode")
        .populate("referredUser", "username fullName email phone createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReferralBonus.countDocuments(filter),
    ]);

    return {
      pendingClaims: bonuses.map((bonus) => ({
        ...bonus,
        bonus,
      })),
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }
}

module.exports = new AdminReferralService();
module.exports.AdminReferralError = AdminReferralError;
