const mongoose = require("mongoose");
const Deposit = require("../models/Deposit");
const GameSession = require("../models/GameSession");
const ReferralBonus = require("../models/ReferralBonus");
const ReferralConfig = require("../models/ReferralConfig");
const ReferralRelationship = require("../models/ReferralRelationship");
const ReferralTransaction = require("../models/ReferralTransaction");
const ReferralTurnover = require("../models/ReferralTurnover");
const SportsBet = require("../models/SportsBet");
const User = require("../models/User");
const WalletService = require("./walletService");
const {
  REFERRAL_BONUS_STATUS,
  REFERRAL_CONFIG,
  REFERRAL_RELATIONSHIP_STATUS,
  REFERRAL_TRANSACTION_TYPE,
  REFERRAL_TURNOVER_STATUS,
} = require("../constants/referral");
const Notification = require("../models/Notification");
const logger = require("../utils/logger");

class ReferralError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ReferralError";
    this.statusCode = statusCode;
  }
}

const cleanCode = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const successfulDepositStatuses = ["approved", "completed"];
const completedGameStatuses = ["completed", "closed"];
const settledSportsStatuses = ["won", "lost", "partially_won"];

class ReferralService {
  async getActiveConfig() {
    const config = await ReferralConfig.findOne({ key: "default" }).lean();

    return {
      minimumFirstDeposit: Number(
        config?.minimumFirstDeposit ?? REFERRAL_CONFIG.minimumFirstDeposit,
      ),
      turnoverMultiplier: Number(
        config?.requiredTurnoverMultiplier ?? REFERRAL_CONFIG.turnoverMultiplier,
      ),
      bonusAmount: Number(config?.bonusAmount ?? REFERRAL_CONFIG.bonusAmount),
      claimTurnoverMultiplier: Number(
        config?.claimTurnoverMultiplier ?? REFERRAL_CONFIG.claimTurnoverMultiplier,
      ),
      enabled: config?.enabled !== false && config?.status !== "inactive",
    };
  }

  async createNotification(userId, title, message, data = {}) {
    try {
      return await Notification.create({
        user: userId,
        type: "bonus",
        title,
        message,
        data: {
          module: "referral",
          ...data,
        },
      });
    } catch (error) {
      logger.error("Referral notification failed", {
        user: userId?.toString(),
        title,
        error: error.message,
      });
      return null;
    }
  }

  async recordTransaction(payload = {}, session = null) {
    const transaction = new ReferralTransaction(payload);
    if (session) return transaction.save({ session });
    return transaction.save();
  }

  async trackRegistration(referredUserId, referralCode) {
    const normalizedCode = cleanCode(referralCode);
    if (!referredUserId || !normalizedCode) return null;

    const [referredUser, existingRelationship, referrer] = await Promise.all([
      User.findById(referredUserId).select("_id referredBy referralCodeUsed"),
      ReferralRelationship.findOne({ referredUser: referredUserId })
        .select("_id")
        .lean(),
      User.findOne({ referenceCode: normalizedCode }).select(
        "_id referenceCode referredBy",
      ),
    ]);

    if (!referredUser || existingRelationship || !referrer) return null;
    if (referrer._id.toString() === referredUser._id.toString()) return null;
    if (referredUser.referredBy) return null;

    if (
      referrer.referredBy &&
      referrer.referredBy.toString() === referredUser._id.toString()
    ) {
      return null;
    }

    let relationship;
    try {
      relationship = await ReferralRelationship.create({
        referrer: referrer._id,
        referredUser: referredUser._id,
        referralCode: normalizedCode,
        registeredAt: new Date(),
      });
    } catch (error) {
      if (error.code === 11000) return null;
      throw error;
    }

    await User.updateOne(
      {
        _id: referredUser._id,
        referredBy: null,
      },
      {
        $set: {
          referredBy: referrer._id,
          referralCodeUsed: normalizedCode,
        },
      },
    );

    logger.info("Referral relationship tracked", {
      referrer: referrer._id.toString(),
      referredUser: referredUser._id.toString(),
      referralCode: normalizedCode,
    });

    return relationship;
  }

  async getFirstDepositMetrics(userId) {
    const [deposit] = await Deposit.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: { $in: successfulDepositStatuses },
        },
      },
      { $sort: { approvedAt: 1, createdAt: 1 } },
      {
        $group: {
          _id: "$user",
          deposit: { $first: "$_id" },
          amount: { $first: "$amount" },
          depositedAt: { $first: { $ifNull: ["$approvedAt", "$createdAt"] } },
        },
      },
    ]);

    return deposit || { deposit: null, amount: 0, depositedAt: null };
  }

  async getTurnoverCompleted(userId) {
    const objectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const [gameTotals, sportsTotals] = await Promise.all([
      GameSession.aggregate([
        {
          $match: {
            user: objectId,
            status: { $in: completedGameStatuses },
          },
        },
        { $group: { _id: "$user", turnover: { $sum: "$betAmount" } } },
      ]),
      SportsBet.aggregate([
        {
          $match: {
            user: objectId,
            status: { $in: settledSportsStatuses },
          },
        },
        { $group: { _id: "$user", turnover: { $sum: "$totalStake" } } },
      ]),
    ]);

    return (
      Number(gameTotals[0]?.turnover || 0) +
      Number(sportsTotals[0]?.turnover || 0)
    );
  }

  async refreshRelationship(relationshipId) {
    const relationship = await ReferralRelationship.findById(relationshipId);
    if (!relationship) return null;

    if (
      [
        REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED,
        REFERRAL_RELATIONSHIP_STATUS.CANCELLED,
      ].includes(relationship.status)
    ) {
      return relationship;
    }

    const firstDeposit = await this.getFirstDepositMetrics(
      relationship.referredUser,
    );
    const config = await this.getActiveConfig();

    if (!config.enabled) return relationship;

    if (
      !firstDeposit.amount ||
      firstDeposit.amount < config.minimumFirstDeposit
    ) {
      relationship.status = REFERRAL_RELATIONSHIP_STATUS.WAITING_DEPOSIT;
      await relationship.save();
      return relationship;
    }

    const requiredTurnover =
      Number(firstDeposit.amount || 0) * config.turnoverMultiplier;
    const turnoverCompleted = await this.getTurnoverCompleted(
      relationship.referredUser,
    );

    relationship.firstDeposit = {
      deposit: firstDeposit.deposit,
      amount: firstDeposit.amount,
      depositedAt: firstDeposit.depositedAt,
    };
    relationship.requiredTurnover = requiredTurnover;
    relationship.turnoverCompleted = turnoverCompleted;
    relationship.status =
      turnoverCompleted >= requiredTurnover
        ? REFERRAL_RELATIONSHIP_STATUS.QUALIFIED
        : REFERRAL_RELATIONSHIP_STATUS.WAITING_TURNOVER;
    relationship.qualifiedAt =
      relationship.status === REFERRAL_RELATIONSHIP_STATUS.QUALIFIED
        ? relationship.qualifiedAt || new Date()
        : relationship.qualifiedAt;

    await relationship.save();

    if (relationship.status === REFERRAL_RELATIONSHIP_STATUS.QUALIFIED) {
      await this.createPendingBonus(relationship);
    }

    return relationship;
  }

  async refreshByReferredUser(userId) {
    const relationship = await ReferralRelationship.findOne({
      referredUser: userId,
    });
    if (!relationship) return null;
    return this.refreshRelationship(relationship._id);
  }

  async recordFirstDepositCompleted(deposit) {
    if (!deposit?.user) return null;
    return this.refreshByReferredUser(deposit.user);
  }

  async recordTurnoverChanged(userId) {
    if (!userId) return null;
    return this.refreshByReferredUser(userId);
  }

  async createPendingBonus(relationship) {
    const existing = await ReferralBonus.findOne({
      relationship: relationship._id,
    });
    if (existing) return existing;

    let bonus;
    try {
      const config = await this.getActiveConfig();
      if (!config.enabled) return null;

      bonus = await ReferralBonus.create({
        referrer: relationship.referrer,
        referredUser: relationship.referredUser,
        relationship: relationship._id,
        referralCode: relationship.referralCode,
        firstDepositAmount: relationship.firstDeposit?.amount || 0,
        requiredTurnover: relationship.requiredTurnover,
        turnoverCompleted: relationship.turnoverCompleted,
        bonusAmount: config.bonusAmount,
        status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
        qualifiedAt: relationship.qualifiedAt || new Date(),
      });
    } catch (error) {
      if (error.code === 11000) {
        return ReferralBonus.findOne({ relationship: relationship._id });
      }
      throw error;
    }

    await ReferralRelationship.updateOne(
      { _id: relationship._id },
      {
        $set: {
          status: REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED,
          bonusCreatedAt: new Date(),
        },
      },
    );

    logger.info("Referral bonus record created", {
      referrer: relationship.referrer.toString(),
      referredUser: relationship.referredUser.toString(),
      relationship: relationship._id.toString(),
      bonus: bonus._id.toString(),
    });

    await this.recordTransaction({
      referrer: relationship.referrer,
      referredUser: relationship.referredUser,
      relationship: relationship._id,
      bonus: bonus._id,
      type: REFERRAL_TRANSACTION_TYPE.BONUS_CREATED,
      amount: bonus.bonusAmount,
      description: "Referral bonus created and pending claim",
    });

    await this.createNotification(
      relationship.referrer,
      "Referral Bonus Ready to Claim",
      "Your referral bonus is ready to claim.",
      { bonus: bonus._id, relationship: relationship._id },
    );

    return bonus;
  }

  async claimBonus(userId, bonusId) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const bonus = await ReferralBonus.findOneAndUpdate(
        {
          _id: bonusId,
          referrer: userId,
          status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
        },
        {
          $set: {
            status: REFERRAL_BONUS_STATUS.CLAIMED,
            claimedAt: new Date(),
          },
        },
        { new: true, session },
      );

      if (!bonus) {
        await session.abortTransaction();
        throw new ReferralError("Referral bonus is not available to claim", 409);
      }

      const bonusAmount = Number(bonus.bonusAmount || 0);
      if (bonusAmount <= 0) {
        await session.abortTransaction();
        throw new ReferralError("Referral bonus amount is invalid", 422);
      }

      const wallet = await WalletService.updateWallet(
        userId,
        bonusAmount,
        "main",
        "bonus",
        {
          description: "Referral bonus claimed to main wallet",
          referralBonusId: bonus._id,
          referralRelationshipId: bonus.relationship,
          referredUser: bonus.referredUser,
          source: "referral_bonus",
        },
        session,
      );

      const config = await this.getActiveConfig();
      const turnoverRequired = Math.round(
        bonusAmount * config.claimTurnoverMultiplier * 100,
      ) / 100;

      let turnover;
      try {
        turnover = await ReferralTurnover.create(
          [
            {
              user: userId,
              referrer: userId,
              referredUser: bonus.referredUser,
              bonus: bonus._id,
              relationship: bonus.relationship,
              bonusAmount,
              turnoverRequired,
              turnoverCompleted: 0,
              turnoverRemaining: turnoverRequired,
              status: REFERRAL_TURNOVER_STATUS.ACTIVE,
              withdrawLocked: true,
              startedAt: new Date(),
            },
          ],
          { session },
        );
        turnover = turnover[0];
      } catch (error) {
        if (error.code !== 11000) throw error;
        await session.abortTransaction();
        throw new ReferralError("Referral bonus already claimed", 409);
      }

      bonus.status = REFERRAL_BONUS_STATUS.TURNOVER_ACTIVE;
      bonus.metadata = {
        ...(bonus.metadata?.toObject?.() || bonus.metadata || {}),
        turnover: turnover._id,
      };
      await bonus.save({ session });

      await this.recordTransaction(
        {
          referrer: userId,
          referredUser: bonus.referredUser,
          relationship: bonus.relationship,
          bonus: bonus._id,
          type: REFERRAL_TRANSACTION_TYPE.BONUS_CLAIMED,
          amount: bonusAmount,
          description: "Referral bonus claimed to main wallet",
          metadata: { walletTransactionId: wallet.transactionId },
        },
        session,
      );

      await this.recordTransaction(
        {
          referrer: userId,
          referredUser: bonus.referredUser,
          relationship: bonus.relationship,
          bonus: bonus._id,
          turnover: turnover._id,
          type: REFERRAL_TRANSACTION_TYPE.TURNOVER_STARTED,
          amount: turnoverRequired,
          description: "Referral turnover activated",
        },
        session,
      );

      await session.commitTransaction();

      await this.createNotification(
        userId,
        "Referral Bonus Claimed Successfully",
        "Your referral bonus has been added to your main wallet.",
        { bonus: bonus._id, amount: bonusAmount },
      );
      await this.createNotification(
        userId,
        "Referral Turnover Activated",
        "Complete referral turnover to unlock withdrawals.",
        { bonus: bonus._id, turnover: turnover._id, turnoverRequired },
      );

      logger.info("Referral bonus claimed", {
        user: userId.toString(),
        bonus: bonus._id.toString(),
        turnover: turnover._id.toString(),
        amount: bonusAmount,
      });

      return { bonus, turnover, wallet };
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async recordReferralTurnover(userId, amount, metadata = {}) {
    const betAmount = Math.round(Number(amount || 0) * 100) / 100;
    if (!userId || betAmount <= 0) return null;

    const turnover = await ReferralTurnover.findOne({
      user: userId,
      status: REFERRAL_TURNOVER_STATUS.ACTIVE,
      withdrawLocked: true,
    }).sort({ createdAt: 1 });

    if (!turnover) return null;

    const previousCompleted = Number(turnover.turnoverCompleted || 0);
    turnover.turnoverCompleted = Math.min(
      Number(turnover.turnoverRequired || 0),
      previousCompleted + betAmount,
    );
    turnover.turnoverRemaining = Math.max(
      0,
      Number(turnover.turnoverRequired || 0) - turnover.turnoverCompleted,
    );

    const completed = turnover.turnoverRemaining <= 0;
    if (completed) {
      turnover.status = REFERRAL_TURNOVER_STATUS.COMPLETED;
      turnover.withdrawLocked = false;
      turnover.completedAt = new Date();
    }

    turnover.metadata = {
      ...(turnover.metadata?.toObject?.() || turnover.metadata || {}),
      lastBet: {
        amount: betAmount,
        recordedAt: new Date(),
        ...metadata,
      },
    };
    await turnover.save();

    if (completed) {
      await ReferralBonus.findByIdAndUpdate(turnover.bonus, {
        $set: {
          status: REFERRAL_BONUS_STATUS.COMPLETED,
          completedAt: new Date(),
        },
      });

      await this.recordTransaction({
        referrer: turnover.referrer,
        referredUser: turnover.referredUser,
        relationship: turnover.relationship,
        bonus: turnover.bonus,
        turnover: turnover._id,
        type: REFERRAL_TRANSACTION_TYPE.TURNOVER_COMPLETED,
        amount: turnover.turnoverRequired,
        description: "Referral turnover completed",
      });

      await this.recordTransaction({
        referrer: turnover.referrer,
        referredUser: turnover.referredUser,
        relationship: turnover.relationship,
        bonus: turnover.bonus,
        turnover: turnover._id,
        type: REFERRAL_TRANSACTION_TYPE.BONUS_COMPLETED,
        amount: turnover.bonusAmount,
        description: "Referral bonus completed",
      });

      await this.createNotification(
        turnover.user,
        "Referral Turnover Completed",
        "Your referral turnover requirement has been completed.",
        { bonus: turnover.bonus, turnover: turnover._id },
      );
      await this.createNotification(
        turnover.user,
        "Withdraw Unlocked",
        "Your referral withdraw lock has been removed.",
        { bonus: turnover.bonus, turnover: turnover._id },
      );

      logger.info("Referral turnover completed", {
        user: turnover.user.toString(),
        turnover: turnover._id.toString(),
        bonus: turnover.bonus.toString(),
      });
    }

    return turnover;
  }

  async getBonusStatus(userId) {
    const [pendingClaim, activeTurnover, latestBonuses] = await Promise.all([
      ReferralBonus.countDocuments({
        referrer: userId,
        status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
      }),
      ReferralTurnover.findOne({
        user: userId,
        status: REFERRAL_TURNOVER_STATUS.ACTIVE,
        withdrawLocked: true,
      }).lean(),
      ReferralBonus.find({ referrer: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("referredUser", "username fullName createdAt")
        .lean(),
    ]);

    return {
      pendingClaim,
      withdrawLocked: Boolean(activeTurnover),
      activeTurnover,
      latestBonuses,
    };
  }

  async getReferralTurnover(userId) {
    const turnovers = await ReferralTurnover.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("bonus")
      .lean();

    return { turnovers };
  }

  async getBonusHistory(userId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const [transactions, total] = await Promise.all([
      ReferralTransaction.find({ referrer: userId })
        .populate("referredUser", "username fullName createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReferralTransaction.countDocuments({ referrer: userId }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  buildRelationshipFilter(userId, query = {}) {
    const filter = { referrer: userId };
    if (query.status) filter.status = query.status;
    return filter;
  }

  async getStatistics(userId) {
    const [relationshipStats, bonusStats] = await Promise.all([
      ReferralRelationship.aggregate([
        { $match: { referrer: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ReferralBonus.aggregate([
        { $match: { referrer: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const relationshipMap = relationshipStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const bonusMap = bonusStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      totalInvited: Object.values(relationshipMap).reduce(
        (sum, value) => sum + value,
        0,
      ),
      waitingDeposit:
        relationshipMap[REFERRAL_RELATIONSHIP_STATUS.WAITING_DEPOSIT] || 0,
      waitingTurnover:
        relationshipMap[REFERRAL_RELATIONSHIP_STATUS.WAITING_TURNOVER] || 0,
      qualified:
        (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.QUALIFIED] || 0) +
        (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED] || 0),
      pendingClaim: bonusMap[REFERRAL_BONUS_STATUS.PENDING_CLAIM] || 0,
      claimed: bonusMap[REFERRAL_BONUS_STATUS.CLAIMED] || 0,
      cancelled:
        (relationshipMap[REFERRAL_RELATIONSHIP_STATUS.CANCELLED] || 0) +
        (bonusMap[REFERRAL_BONUS_STATUS.CANCELLED] || 0),
    };
  }

  async getDashboard(userId) {
    const [statistics, pendingBonuses, latestReferrals] = await Promise.all([
      this.getStatistics(userId),
      ReferralBonus.find({
        referrer: userId,
        status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("referredUser", "username fullName createdAt"),
      ReferralRelationship.find({ referrer: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("referredUser", "username fullName createdAt"),
    ]);

    return {
      statistics,
      pendingBonuses,
      latestReferrals,
    };
  }

  async listReferrals(userId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = this.buildRelationshipFilter(userId, query);

    const [referrals, total] = await Promise.all([
      ReferralRelationship.find(filter)
        .populate("referredUser", "username fullName createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReferralRelationship.countDocuments(filter),
    ]);
    const referralIds = referrals.map((item) => item._id);
    const bonuses = await ReferralBonus.find({ relationship: { $in: referralIds } })
      .lean();
    const bonusByRelationship = new Map(
      bonuses.map((bonus) => [bonus.relationship.toString(), bonus]),
    );

    return {
      referrals: referrals.map((referral) => {
        const data = referral.toObject ? referral.toObject() : referral;
        return {
          ...data,
          bonus: bonusByRelationship.get(data._id.toString()) || null,
        };
      }),
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getReferralDetails(userId, relationshipId) {
    const relationship = await ReferralRelationship.findOne({
      _id: relationshipId,
      referrer: userId,
    }).populate("referredUser", "username fullName createdAt");

    if (!relationship) {
      throw new ReferralError("Referral relationship not found", 404);
    }

    const bonus = await ReferralBonus.findOne({
      relationship: relationship._id,
      referrer: userId,
    });

    return { relationship, bonus };
  }

  async listPendingBonuses(userId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const [bonuses, total] = await Promise.all([
      ReferralBonus.find({
        referrer: userId,
        status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
      })
        .populate("referredUser", "username fullName createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReferralBonus.countDocuments({
        referrer: userId,
        status: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
      }),
    ]);

    return {
      bonuses,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async listQualifiedReferrals(userId, query = {}) {
    return this.listReferrals(userId, {
      ...query,
      status: REFERRAL_RELATIONSHIP_STATUS.BONUS_CREATED,
    });
  }
}

module.exports = new ReferralService();
module.exports.ReferralError = ReferralError;
