const AffiliateClick = require("../models/AffiliateClick");
const AffiliatePlayer = require("../models/AffiliatePlayer");
const Deposit = require("../models/Deposit");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const User = require("../models/User");
const { AFFILIATE_STATUS } = require("../constants/affiliate");
const logger = require("../utils/logger");

const successfulDepositStatuses = ["approved", "completed"];
const completedGameStatuses = ["completed", "closed"];
const settledSportsStatuses = ["won", "lost", "partially_won"];

class AffiliateTrackingService {
  getMarketingUrl(affiliateCode) {
    const baseUrl = process.env.CLIENT_URL || "https://mosttiger.com";
    return `${baseUrl.replace(/\/$/, "")}/register?aff=${affiliateCode}`;
  }

  async trackClick(affiliateCode, requestMeta = {}) {
    const normalizedCode =
      typeof affiliateCode === "string"
        ? affiliateCode.trim().toUpperCase()
        : "";

    if (!normalizedCode) return null;

    const affiliate = await User.findOne({
      "affiliate.affiliateCode": normalizedCode,
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
    }).select("_id affiliate");

    if (!affiliate) return null;

    const click = await AffiliateClick.create({
      affiliate: affiliate._id,
      affiliateCode: normalizedCode,
      ip: requestMeta.ip || "",
      userAgent: requestMeta.userAgent || "",
      metadata: requestMeta.metadata || {},
    });

    await User.updateOne(
      { _id: affiliate._id },
      { $inc: { "affiliate.statistics.totalClicks": 1 } },
    );

    return click;
  }

  async trackRegistration(playerId, affiliateCode) {
    const normalizedCode =
      typeof affiliateCode === "string"
        ? affiliateCode.trim().toUpperCase()
        : "";

    if (!normalizedCode || !playerId) return null;

    const affiliate = await User.findOne({
      "affiliate.affiliateCode": normalizedCode,
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
    }).select("_id affiliate");

    if (!affiliate) return null;

    const existing = await AffiliatePlayer.findOne({ player: playerId })
      .select("_id")
      .lean();
    if (existing) return existing;

    let trackedPlayer;
    let createdTrackedPlayer = false;
    try {
      trackedPlayer = await AffiliatePlayer.create({
        affiliate: affiliate._id,
        player: playerId,
        affiliateCode: normalizedCode,
        registeredAt: new Date(),
      });
      createdTrackedPlayer = true;
    } catch (error) {
      if (error.code !== 11000) throw error;

      trackedPlayer = await AffiliatePlayer.findOne({ player: playerId });
      if (!trackedPlayer) throw error;
    }

    if (!createdTrackedPlayer) return trackedPlayer;

    await User.updateOne(
      {
        _id: playerId,
        "affiliateTracking.affiliate": null,
      },
      {
        $set: {
          "affiliateTracking.affiliate": affiliate._id,
          "affiliateTracking.affiliateCode": normalizedCode,
          "affiliateTracking.registeredAt": new Date(),
        },
      },
    );

    await User.updateOne(
      { _id: affiliate._id },
      {
        $inc: {
          "affiliate.statistics.totalRegistrations": 1,
          "affiliate.statistics.totalPlayers": 1,
        },
      },
    );

    logger.info("Affiliate registration tracked", {
      affiliate: affiliate._id.toString(),
      player: playerId.toString(),
      affiliateCode: normalizedCode,
    });

    return trackedPlayer;
  }

  async refreshTrackedPlayerByUser(playerId) {
    const trackedPlayer = await AffiliatePlayer.findOne({ player: playerId });
    if (!trackedPlayer) return null;

    const affiliate = await User.findById(trackedPlayer.affiliate).select(
      "affiliate",
    );
    if (!affiliate) return null;

    const result = await this.refreshPlayerMetrics(
      trackedPlayer,
      affiliate.affiliate?.config || {},
    );

    if (result.becameQualified) {
      await User.updateOne(
        { _id: trackedPlayer.affiliate },
        { $inc: { "affiliate.statistics.qualifiedPlayers": 1 } },
      );
      logger.info("Affiliate player qualified", {
        affiliate: trackedPlayer.affiliate.toString(),
        player: playerId.toString(),
      });
    }

    return result;
  }

  async syncAffiliatePlayerStatistics(affiliateId, extraFields = {}) {
    const [totals] = await AffiliatePlayer.aggregate([
      { $match: { affiliate: affiliateId } },
      {
        $group: {
          _id: "$affiliate",
          totalPlayers: { $sum: 1 },
          qualifiedPlayers: {
            $sum: {
              $cond: ["$qualified", 1, 0],
            },
          },
          totalDeposits: { $sum: "$totalDeposit" },
          totalTurnover: { $sum: "$turnover" },
          totalNetRevenue: { $sum: "$netLoss" },
          totalCommission: { $sum: "$commissionGenerated" },
        },
      },
    ]);

    await User.updateOne(
      { _id: affiliateId },
      {
        $set: {
          "affiliate.statistics.totalPlayers": totals?.totalPlayers || 0,
          "affiliate.statistics.qualifiedPlayers":
            totals?.qualifiedPlayers || 0,
          "affiliate.statistics.totalDeposits": totals?.totalDeposits || 0,
          "affiliate.statistics.totalTurnover": totals?.totalTurnover || 0,
          "affiliate.statistics.totalNetRevenue": totals?.totalNetRevenue || 0,
          "affiliate.statistics.totalCommission": totals?.totalCommission || 0,
          "affiliate.statistics.lastCalculatedAt": new Date(),
          ...extraFields,
        },
      },
    );
  }

  async recordDepositCompleted(deposit) {
    if (!deposit?.user) return null;

    const result = await this.refreshTrackedPlayerByUser(deposit.user);
    if (!result?.trackedPlayer) return null;

    const player = result.trackedPlayer;
    await this.syncAffiliatePlayerStatistics(player.affiliate);

    logger.info("Affiliate first deposit metrics refreshed", {
      affiliate: player.affiliate.toString(),
      player: player.player.toString(),
      deposit: deposit._id?.toString(),
    });

    return result;
  }

  async recordTurnoverChanged(userId) {
    const result = await this.refreshTrackedPlayerByUser(userId);
    if (!result?.trackedPlayer) return null;

    const player = result.trackedPlayer;
    await this.syncAffiliatePlayerStatistics(player.affiliate);

    return result;
  }

  async getPlayerDepositMetrics(playerId) {
    const deposits = await Deposit.aggregate([
      {
        $match: {
          user: playerId,
          status: { $in: successfulDepositStatuses },
        },
      },
      { $sort: { approvedAt: 1, createdAt: 1 } },
      {
        $group: {
          _id: "$user",
          firstDepositAmount: { $first: "$amount" },
          firstDepositAt: {
            $first: { $ifNull: ["$approvedAt", "$createdAt"] },
          },
          totalDeposit: { $sum: "$amount" },
        },
      },
    ]);

    return (
      deposits[0] || {
        firstDepositAmount: 0,
        firstDepositAt: null,
        totalDeposit: 0,
      }
    );
  }

  async getPlayerTurnoverAndNetLoss(playerId, period = {}) {
    const gameMatch = {
      user: playerId,
      status: { $in: completedGameStatuses },
    };
    const sportsMatch = {
      user: playerId,
      status: { $in: settledSportsStatuses },
    };

    if (period.start || period.end) {
      gameMatch.endedAt = {};
      sportsMatch.settledAt = {};
      if (period.start) {
        gameMatch.endedAt.$gte = period.start;
        sportsMatch.settledAt.$gte = period.start;
      }
      if (period.end) {
        gameMatch.endedAt.$lte = period.end;
        sportsMatch.settledAt.$lte = period.end;
      }
    }

    const [gameTotals, sportsTotals] = await Promise.all([
      GameSession.aggregate([
        { $match: gameMatch },
        {
          $group: {
            _id: "$user",
            turnover: { $sum: "$betAmount" },
            wins: { $sum: "$winAmount" },
          },
        },
      ]),
      SportsBet.aggregate([
        { $match: sportsMatch },
        {
          $group: {
            _id: "$user",
            turnover: { $sum: "$totalStake" },
            wins: { $sum: "$actualWin" },
          },
        },
      ]),
    ]);

    const game = gameTotals[0] || { turnover: 0, wins: 0 };
    const sports = sportsTotals[0] || { turnover: 0, wins: 0 };
    const turnover = Number(game.turnover || 0) + Number(sports.turnover || 0);
    const wins = Number(game.wins || 0) + Number(sports.wins || 0);

    return {
      turnover,
      netLoss: turnover - wins,
    };
  }

  async refreshPlayerMetrics(trackedPlayer, affiliateConfig = {}) {
    const [depositMetrics, playMetrics] = await Promise.all([
      this.getPlayerDepositMetrics(trackedPlayer.player),
      this.getPlayerTurnoverAndNetLoss(trackedPlayer.player),
    ]);

    const wasQualified = Boolean(trackedPlayer.qualified);
    const qualified =
      Number(depositMetrics.firstDepositAmount || 0) >=
        Number(affiliateConfig.minimumDeposit || 0) &&
      Number(playMetrics.turnover || 0) >=
        Number(affiliateConfig.requiredTurnover || 0);

    trackedPlayer.firstDepositAmount = depositMetrics.firstDepositAmount || 0;
    trackedPlayer.firstDepositAt = depositMetrics.firstDepositAt || null;
    trackedPlayer.totalDeposit = depositMetrics.totalDeposit || 0;
    trackedPlayer.turnover = playMetrics.turnover || 0;
    trackedPlayer.netLoss = playMetrics.netLoss || 0;
    trackedPlayer.qualified = qualified;
    trackedPlayer.qualifiedAt =
      qualified && !trackedPlayer.qualifiedAt
        ? new Date()
        : trackedPlayer.qualifiedAt;
    trackedPlayer.lastCalculatedAt = new Date();
    await trackedPlayer.save();

    return {
      trackedPlayer,
      becameQualified: qualified && !wasQualified,
    };
  }

  async refreshAffiliatePlayers(affiliateId) {
    const affiliate = await User.findById(affiliateId).select("affiliate");
    if (!affiliate) return [];

    const players = await AffiliatePlayer.find({ affiliate: affiliateId });
    const results = [];

    for (const player of players) {
      results.push(
        await this.refreshPlayerMetrics(
          player,
          affiliate.affiliate?.config || {},
        ),
      );
    }

    return results;
  }

  async listAffiliatePlayers(affiliateId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = { affiliate: affiliateId };

    if (query.qualified !== undefined) {
      filter.qualified = String(query.qualified) === "true";
    }

    const [players, total] = await Promise.all([
      AffiliatePlayer.find(filter)
        .populate("player", "username fullName phone email createdAt")
        .sort({ registeredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliatePlayer.countDocuments(filter),
    ]);

    return {
      players,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }
}

module.exports = new AffiliateTrackingService();
