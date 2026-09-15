const AffiliateCommission = require("../models/AffiliateCommission");
const AffiliatePlayer = require("../models/AffiliatePlayer");
const AffiliateSettlement = require("../models/AffiliateSettlement");
const AffiliateTransaction = require("../models/AffiliateTransaction");
const mongoose = require("mongoose");
const User = require("../models/User");
const {
  AFFILIATE_COMMISSION_STATUS,
  AFFILIATE_SETTLEMENT_FREQUENCY,
  AFFILIATE_SETTLEMENT_STATUS,
  AFFILIATE_STATUS,
  AFFILIATE_TRANSACTION_STATUS,
  AFFILIATE_TRANSACTION_TYPE,
} = require("../constants/affiliate");
const affiliateTrackingService = require("./affiliateTrackingService");
const logger = require("../utils/logger");

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfQuarter = (date) =>
  new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

const getWallet = (user) => ({
  pendingCommission: Number(user.affiliate?.wallet?.pendingCommission || 0),
  settledCommission: Number(user.affiliate?.wallet?.settledCommission || 0),
  withdrawableBalance: Number(user.affiliate?.wallet?.withdrawableBalance || 0),
  lifetimeEarnings: Number(user.affiliate?.wallet?.lifetimeEarnings || 0),
  lifetimeWithdraw: Number(user.affiliate?.wallet?.lifetimeWithdraw || 0),
});

class AffiliateRevenueService {
  getNextPeriodStart(frequency, fromDate) {
    if (frequency === AFFILIATE_SETTLEMENT_FREQUENCY.DAILY) {
      return addDays(startOfDay(fromDate), 1);
    }

    if (frequency === AFFILIATE_SETTLEMENT_FREQUENCY.WEEKLY) {
      return addDays(startOfDay(fromDate), 7);
    }

    return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
  }

  getClosedSettlementPeriod(affiliate, now = new Date()) {
    const config = affiliate.affiliate?.config || {};
    const frequency =
      config.settlementFrequency || AFFILIATE_SETTLEMENT_FREQUENCY.MONTHLY;
    const lastSettlementAt = affiliate.affiliate?.statistics?.lastSettlementAt;
    const approvedAt = affiliate.affiliate?.approvedAt || affiliate.createdAt;
    const periodStart = lastSettlementAt
      ? new Date(lastSettlementAt)
      : startOfDay(new Date(approvedAt));
    const periodEnd = this.getNextPeriodStart(frequency, periodStart);

    if (periodEnd > now) return null;

    return {
      periodStart,
      periodEnd,
      frequency,
    };
  }

  applyNegativeCarry(affiliate, periodNetRevenue) {
    const config = affiliate.affiliate?.config || {};
    const currentCarry = Number(
      affiliate.affiliate?.statistics?.negativeCarryBalance || 0,
    );

    if (!config.enableNegativeCarry) {
      return {
        commissionableRevenue: Math.max(0, periodNetRevenue),
        negativeCarryIn: 0,
        negativeCarryApplied: 0,
        negativeCarryOut: 0,
      };
    }

    const revenueAfterCarry = periodNetRevenue + Math.min(0, currentCarry);
    const maxCarry = Number(config.maximumNegativeCarry || 0);
    const carryFloor = maxCarry > 0 ? -Math.abs(maxCarry) : Number.NEGATIVE_INFINITY;

    if (revenueAfterCarry < 0) {
      return {
        commissionableRevenue: 0,
        negativeCarryIn: currentCarry,
        negativeCarryApplied: Math.abs(Math.min(0, currentCarry)),
        negativeCarryOut: Math.max(revenueAfterCarry, carryFloor),
      };
    }

    return {
      commissionableRevenue: revenueAfterCarry,
      negativeCarryIn: currentCarry,
      negativeCarryApplied: Math.abs(Math.min(0, currentCarry)),
      negativeCarryOut: 0,
    };
  }

  shouldResetCarry(affiliate, now = new Date()) {
    const config = affiliate.affiliate?.config || {};
    const lastResetAt = affiliate.affiliate?.metadata?.negativeCarryResetAt;
    const reset = config.carryReset;

    if (!config.enableNegativeCarry || reset === "never") return false;

    if (!lastResetAt) return true;

    const last = new Date(lastResetAt);

    if (reset === "monthly") {
      return startOfMonth(last).getTime() < startOfMonth(now).getTime();
    }

    if (reset === "quarterly") {
      return startOfQuarter(last).getTime() < startOfQuarter(now).getTime();
    }

    return false;
  }

  async resetNegativeCarryForDueAffiliates(now = new Date()) {
    const affiliates = await User.find({
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
      "affiliate.config.enableNegativeCarry": true,
    });

    let resetCount = 0;

    for (const affiliate of affiliates) {
      if (!this.shouldResetCarry(affiliate, now)) continue;

      const beforeWallet = getWallet(affiliate);
      const previousCarry = Number(
        affiliate.affiliate?.statistics?.negativeCarryBalance || 0,
      );

      affiliate.affiliate.statistics.negativeCarryBalance = 0;
      affiliate.affiliate.metadata = {
        ...(affiliate.affiliate?.metadata?.toObject?.() ||
          affiliate.affiliate?.metadata ||
          {}),
        negativeCarryResetAt: now,
      };
      await affiliate.save();

      await AffiliateTransaction.create({
        affiliate: affiliate._id,
        type: AFFILIATE_TRANSACTION_TYPE.NEGATIVE_CARRY,
        amount: Math.abs(previousCarry),
        balanceBefore: beforeWallet,
        balanceAfter: getWallet(affiliate),
        status: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
        description: "Negative carry reset",
        metadata: {
          previousCarry,
          resetAt: now,
          carryReset: affiliate.affiliate?.config?.carryReset,
        },
      });

      resetCount += 1;
      logger.info("Affiliate negative carry reset", {
        affiliate: affiliate._id.toString(),
        previousCarry,
      });
    }

    return { resetCount };
  }

  async calculateAffiliateCommissions(affiliateId, periodStart, periodEnd) {
    const affiliate = await User.findById(affiliateId);
    if (!affiliate || affiliate.affiliate?.status !== AFFILIATE_STATUS.APPROVED) {
      return { commissions: [], totals: { grossRevenue: 0, netRevenue: 0, amount: 0 } };
    }

    const config = affiliate.affiliate?.config || {};
    const trackedPlayers = await AffiliatePlayer.find({ affiliate: affiliateId });
    const commissions = [];
    let totalPeriodNetRevenue = 0;
    let totalPositiveRevenue = 0;
    let totalCommissionableRevenue = 0;

    for (const trackedPlayer of trackedPlayers) {
      const { trackedPlayer: refreshedPlayer } =
        await affiliateTrackingService.refreshPlayerMetrics(trackedPlayer, config);

      if (!refreshedPlayer.qualified || !refreshedPlayer.qualifiedAt) continue;

      const qualifiedAt = new Date(refreshedPlayer.qualifiedAt);
      const effectiveStart = qualifiedAt > periodStart ? qualifiedAt : periodStart;
      if (effectiveStart >= periodEnd) continue;

      const existing = await AffiliateCommission.findOne({
        affiliate: affiliateId,
        player: refreshedPlayer.player,
        periodStart,
        periodEnd,
      }).select("_id");
      if (existing) continue;

      const playerRevenue = await affiliateTrackingService.getPlayerTurnoverAndNetLoss(
        refreshedPlayer.player,
        { start: effectiveStart, end: periodEnd },
      );

      const playerNetLoss = Number(playerRevenue.netLoss || 0);
      totalPeriodNetRevenue += playerNetLoss;
      if (playerNetLoss > 0) totalPositiveRevenue += playerNetLoss;
    }

    const carryResult = this.applyNegativeCarry(affiliate, totalPeriodNetRevenue);
    totalCommissionableRevenue = carryResult.commissionableRevenue;

    for (const trackedPlayer of trackedPlayers) {
      const player = await AffiliatePlayer.findById(trackedPlayer._id);
      if (!player?.qualified || !player.qualifiedAt) continue;

      const qualifiedAt = new Date(player.qualifiedAt);
      const effectiveStart = qualifiedAt > periodStart ? qualifiedAt : periodStart;
      if (effectiveStart >= periodEnd) continue;

      const existing = await AffiliateCommission.findOne({
        affiliate: affiliateId,
        player: player.player,
        periodStart,
        periodEnd,
      }).select("_id");
      if (existing) continue;

      const playerRevenue = await affiliateTrackingService.getPlayerTurnoverAndNetLoss(
        player.player,
        { start: effectiveStart, end: periodEnd },
      );
      const playerNetLoss = Number(playerRevenue.netLoss || 0);
      if (
        playerNetLoss <= 0 ||
        totalPositiveRevenue <= 0 ||
        totalCommissionableRevenue <= 0
      ) {
        continue;
      }

      const playerCommissionableRevenue =
        totalCommissionableRevenue * (playerNetLoss / totalPositiveRevenue);
      const amount =
        (playerCommissionableRevenue *
          Number(config.revenueSharePercentage || 0)) /
        100;

      if (amount <= 0) continue;

      let commission;
      try {
        commission = await AffiliateCommission.create({
          affiliate: affiliateId,
          player: player.player,
          periodStart,
          periodEnd,
          grossRevenue: playerNetLoss,
          negativeCarryApplied:
            carryResult.negativeCarryApplied * (playerNetLoss / totalPositiveRevenue),
          netRevenue: playerCommissionableRevenue,
          revenueSharePercentage: config.revenueSharePercentage || 0,
          amount,
          status: AFFILIATE_COMMISSION_STATUS.APPROVED,
          approvedAt: new Date(),
          configSnapshot: config,
          metadata: {
            qualifiedAt: player.qualifiedAt,
          },
        });
      } catch (error) {
        if (error.code === 11000) continue;
        throw error;
      }

      player.commissionGenerated += amount;
      await player.save();
      commissions.push(commission);
    }

    const totalAmount = commissions.reduce(
      (sum, commission) => sum + Number(commission.amount || 0),
      0,
    );
    const beforeWallet = getWallet(affiliate);

    affiliate.affiliate.statistics.negativeCarryBalance =
      carryResult.negativeCarryOut;
    affiliate.affiliate.statistics.totalNetRevenue += totalCommissionableRevenue;
    affiliate.affiliate.statistics.totalGrossRevenue += totalPeriodNetRevenue;
    affiliate.affiliate.statistics.totalCommission += totalAmount;
    affiliate.affiliate.statistics.pendingCommission += totalAmount;
    affiliate.affiliate.statistics.lastCalculatedAt = new Date();
    affiliate.affiliate.wallet.pendingCommission += totalAmount;
    affiliate.affiliate.wallet.lifetimeEarnings += totalAmount;
    await affiliate.save();

    if (totalAmount > 0) {
      await AffiliateTransaction.create({
        affiliate: affiliateId,
        type: AFFILIATE_TRANSACTION_TYPE.COMMISSION,
        amount: totalAmount,
        balanceBefore: beforeWallet,
        balanceAfter: getWallet(affiliate),
        status: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
        description: "Affiliate commission generated",
        metadata: {
          periodStart,
          periodEnd,
          commissionCount: commissions.length,
          grossRevenue: totalPeriodNetRevenue,
          commissionableRevenue: totalCommissionableRevenue,
        },
      });
    }

    if (carryResult.negativeCarryOut !== carryResult.negativeCarryIn) {
      await AffiliateTransaction.create({
        affiliate: affiliateId,
        type: AFFILIATE_TRANSACTION_TYPE.NEGATIVE_CARRY,
        amount: Math.abs(carryResult.negativeCarryOut),
        balanceBefore: getWallet(affiliate),
        balanceAfter: getWallet(affiliate),
        status: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
        description: "Negative carry updated",
        metadata: carryResult,
      });
    }

    logger.info("Affiliate commissions calculated", {
      affiliate: affiliateId.toString(),
        commissionCount: commissions.length,
        totalAmount,
        periodStart,
        periodEnd,
    });

    return {
      commissions,
      totals: {
        grossRevenue: totalPeriodNetRevenue,
        netRevenue: totalCommissionableRevenue,
        amount: totalAmount,
        ...carryResult,
      },
    };
  }

  async settleAffiliate(affiliateId, periodStart, periodEnd) {
    const affiliate = await User.findById(affiliateId);
    if (!affiliate || affiliate.affiliate?.status !== AFFILIATE_STATUS.APPROVED) {
      return null;
    }

    const existingSettlement = await AffiliateSettlement.findOne({
      affiliate: affiliateId,
      periodStart,
      periodEnd,
    });
    if (existingSettlement) return existingSettlement;

    let settlement;
    try {
      settlement = await AffiliateSettlement.create({
        affiliate: affiliateId,
        periodStart,
        periodEnd,
        status: AFFILIATE_SETTLEMENT_STATUS.PENDING,
        configSnapshot: affiliate.affiliate?.config || {},
      });
    } catch (error) {
      if (error.code === 11000) {
        return AffiliateSettlement.findOne({
          affiliate: affiliateId,
          periodStart,
          periodEnd,
        });
      }
      throw error;
    }

    let result;
    try {
      result = await this.calculateAffiliateCommissions(
        affiliateId,
        periodStart,
        periodEnd,
      );
    } catch (error) {
      await AffiliateSettlement.deleteOne({ _id: settlement._id });
      throw error;
    }

    const commissionIds = result.commissions.map((commission) => commission._id);
    const totalAmount = result.totals.amount || 0;
    const beforeSettlementAffiliate = await User.findById(affiliateId);
    const beforeWallet = getWallet(beforeSettlementAffiliate || affiliate);

    settlement.totals = {
      grossRevenue: result.totals.grossRevenue,
      negativeCarryIn: result.totals.negativeCarryIn,
      negativeCarryApplied: result.totals.negativeCarryApplied,
      negativeCarryOut: Math.abs(Math.min(0, result.totals.negativeCarryOut)),
      netRevenue: result.totals.netRevenue,
      commissionAmount: totalAmount,
    };
    settlement.commissionCount = commissionIds.length;
    settlement.status = AFFILIATE_SETTLEMENT_STATUS.APPROVED;
    settlement.approvedAt = new Date();
    settlement.paidAt = new Date();
    await settlement.save();

    if (commissionIds.length) {
      await AffiliateCommission.updateMany(
        { _id: { $in: commissionIds } },
        {
          settlement: settlement._id,
          status: AFFILIATE_COMMISSION_STATUS.SETTLED,
          paidAt: new Date(),
        },
      );
    }

    const freshAffiliate = await User.findById(affiliateId);
    freshAffiliate.affiliate.wallet.pendingCommission = Math.max(
      0,
      Number(freshAffiliate.affiliate.wallet.pendingCommission || 0) - totalAmount,
    );
    freshAffiliate.affiliate.wallet.settledCommission += totalAmount;
    freshAffiliate.affiliate.wallet.withdrawableBalance += totalAmount;
    freshAffiliate.affiliate.statistics.pendingCommission = Math.max(
      0,
      Number(freshAffiliate.affiliate.statistics.pendingCommission || 0) -
        totalAmount,
    );
    freshAffiliate.affiliate.statistics.settledCommission += totalAmount;
    freshAffiliate.affiliate.statistics.withdrawableBalance += totalAmount;
    freshAffiliate.affiliate.statistics.lastSettlementAt = periodEnd;
    await freshAffiliate.save();

    await AffiliateTransaction.create({
      affiliate: affiliateId,
      type: AFFILIATE_TRANSACTION_TYPE.SETTLEMENT,
      amount: totalAmount,
      balanceBefore: beforeWallet,
      balanceAfter: getWallet(freshAffiliate),
      status: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
      settlement: settlement._id,
      description: "Affiliate settlement completed",
      metadata: {
        periodStart,
        periodEnd,
        commissionCount: commissionIds.length,
      },
    });

    logger.info("Affiliate settlement completed", {
      affiliate: affiliateId.toString(),
      settlement: settlement._id.toString(),
      amount: totalAmount,
      periodStart,
      periodEnd,
    });

    return settlement;
  }

  async runDueSettlements(now = new Date()) {
    const affiliates = await User.find({
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
    });

    const settlements = [];

    for (const affiliate of affiliates) {
      let safety = 0;
      let currentAffiliate = affiliate;

      while (safety < 24) {
        const period = this.getClosedSettlementPeriod(currentAffiliate, now);
        if (!period) break;

        const settlement = await this.settleAffiliate(
          currentAffiliate._id,
          period.periodStart,
          period.periodEnd,
        );
        if (settlement) settlements.push(settlement);

        currentAffiliate = await User.findById(currentAffiliate._id);
        if (!currentAffiliate) break;
        safety += 1;
      }
    }

    return {
      settlementCount: settlements.length,
      settlements,
    };
  }

  async refreshAffiliateStatistics(affiliateId) {
    await affiliateTrackingService.refreshAffiliatePlayers(affiliateId);
    const affiliateObjectId =
      typeof affiliateId === "string"
        ? new mongoose.Types.ObjectId(affiliateId)
        : affiliateId;

    const [affiliate, playerStats, commissionStats] = await Promise.all([
      User.findById(affiliateId),
      AffiliatePlayer.aggregate([
        { $match: { affiliate: affiliateObjectId } },
        {
          $group: {
            _id: "$affiliate",
            totalPlayers: { $sum: 1 },
            activePlayers: { $sum: { $cond: [{ $gt: ["$turnover", 0] }, 1, 0] } },
            qualifiedPlayers: { $sum: { $cond: ["$qualified", 1, 0] } },
            totalDeposit: { $sum: "$totalDeposit" },
            turnover: { $sum: "$turnover" },
            netLoss: { $sum: "$netLoss" },
            commissionGenerated: { $sum: "$commissionGenerated" },
          },
        },
      ]),
      AffiliateCommission.aggregate([
        { $match: { affiliate: affiliateObjectId } },
        {
          $group: {
            _id: "$affiliate",
            totalCommission: { $sum: "$amount" },
            totalGrossRevenue: { $sum: "$grossRevenue" },
            totalNetRevenue: { $sum: "$netRevenue" },
          },
        },
      ]),
    ]);

    if (!affiliate) return null;

    const players = playerStats[0] || {};
    const commissions = commissionStats[0] || {};
    const wallet = getWallet(affiliate);

    affiliate.affiliate.statistics.totalPlayers = players.totalPlayers || 0;
    affiliate.affiliate.statistics.activePlayers = players.activePlayers || 0;
    affiliate.affiliate.statistics.qualifiedPlayers =
      players.qualifiedPlayers || 0;
    affiliate.affiliate.statistics.totalDeposits = players.totalDeposit || 0;
    affiliate.affiliate.statistics.totalTurnover = players.turnover || 0;
    affiliate.affiliate.statistics.totalGrossRevenue =
      commissions.totalGrossRevenue || 0;
    affiliate.affiliate.statistics.totalNetRevenue =
      commissions.totalNetRevenue || 0;
    affiliate.affiliate.statistics.totalCommission =
      commissions.totalCommission || 0;
    affiliate.affiliate.statistics.pendingCommission = wallet.pendingCommission;
    affiliate.affiliate.statistics.settledCommission = wallet.settledCommission;
    affiliate.affiliate.statistics.withdrawableBalance =
      wallet.withdrawableBalance;
    affiliate.affiliate.statistics.lifetimeWithdraw = wallet.lifetimeWithdraw;
    affiliate.affiliate.statistics.totalWithdrawn = wallet.lifetimeWithdraw;
    affiliate.affiliate.statistics.lastCalculatedAt = new Date();
    await affiliate.save();

    return affiliate.affiliate.statistics;
  }

  async refreshAllAffiliateStatistics() {
    const affiliates = await User.find({
      "affiliate.status": AFFILIATE_STATUS.APPROVED,
    }).select("_id");

    for (const affiliate of affiliates) {
      await this.refreshAffiliateStatistics(affiliate._id);
    }

    return { affiliateCount: affiliates.length };
  }

  async getAffiliateTransactions(affiliateId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = { affiliate: affiliateId };

    if (query.type) filter.type = query.type;

    const [transactions, total] = await Promise.all([
      AffiliateTransaction.find(filter)
        .populate("player", "username fullName phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateTransaction.countDocuments(filter),
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
}

module.exports = new AffiliateRevenueService();
