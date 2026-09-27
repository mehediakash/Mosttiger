const GGR = require("../models/GGR");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

class GGRService {
  static async processGameResult({ betAmount, winAmount }, options = {}) {
    const bet = Math.max(0, Number(betAmount || 0));
    const win = Math.max(0, Number(winAmount || 0));

    const query = GGR.findOne();
    if (options.session) query.session(options.session);
    const ggr = await query;

    if (!ggr) return;

    // Configured rate (editable directly in MongoDB Compass)
    let configuredRate = Number(ggr.ggrRate);
    if (
      !Number.isFinite(configuredRate) ||
      configuredRate < 0 ||
      configuredRate > 100
    ) {
      configuredRate = 10;
    }

    // Active rate applied to current accounting period
    let appliedRate = Number(ggr.appliedGgrRate);
    if (!Number.isFinite(appliedRate) || appliedRate < 0 || appliedRate > 100) {
      appliedRate = configuredRate;
    }

    let periodBets = Number(ggr.periodBets) || 0;
    let periodWins = Number(ggr.periodWins) || 0;
    let periodGGRCharge = Number(ggr.periodGGRCharge) || 0;

    // Dynamic rate change detection from MongoDB Compass
    if (configuredRate !== appliedRate) {
      appliedRate = configuredRate;
      periodBets = 0;
      periodWins = 0;
      periodGGRCharge = 0;
    }

    // Cumulative GGR accounting for the current rate period
    const newPeriodBets = r2(periodBets + bet);
    const newPeriodWins = r2(periodWins + win);
    const newPeriodNetGGR = r2(newPeriodBets - newPeriodWins);

    const targetPeriodCharge =
      newPeriodNetGGR > 0 ? r2(newPeriodNetGGR * (appliedRate / 100)) : 0;

    const deltaCharge = r2(Math.max(0, targetPeriodCharge - periodGGRCharge));

    const update = {
      $set: {
        ggrRate: configuredRate,
        appliedGgrRate: appliedRate,
        periodBets: newPeriodBets,
        periodWins: newPeriodWins,
        periodNetGGR: newPeriodNetGGR,
        periodGGRCharge: r2(periodGGRCharge + deltaCharge),
      },
      $inc: {
        totalBets: bet,
      },
    };

    if (deltaCharge > 0) {
      const currentTotalGGR = Number(ggr.totalGGR) || 0;
      update.$set.totalGGR = r2(Math.max(0, currentTotalGGR - deltaCharge));
    }

    // Maintain legacy reporting metrics for dashboard backwards compatibility
    const playerLoss = bet - win;
    if (playerLoss > 0) {
      update.$inc.totalPlayerLoss = playerLoss;
    }
    if (win > bet) {
      update.$inc.totalPlayerWin = win - bet;
    }

    const updateQuery = GGR.updateOne({ _id: ggr._id }, update);
    if (options.session) updateQuery.session(options.session);
    await updateQuery;
  }

  static async canLaunchGame() {
    const ggr = await GGR.findOne({}).select("totalGGR").lean();

    return !!ggr && Number(ggr.totalGGR) > 0;
  }

  static async ensureInitialized() {
    try {
      const ggr = await GGR.findOne({});
      if (!ggr) return;

      const updates = {};
      if (ggr.ggrRate === undefined) updates.ggrRate = 10;
      if (ggr.appliedGgrRate === undefined) updates.appliedGgrRate = 10;
      if (ggr.periodBets === undefined) updates.periodBets = 0;
      if (ggr.periodWins === undefined) updates.periodWins = 0;
      if (ggr.periodNetGGR === undefined) updates.periodNetGGR = 0;
      if (ggr.periodGGRCharge === undefined) updates.periodGGRCharge = 0;

      if (Object.keys(updates).length > 0) {
        await GGR.updateOne({ _id: ggr._id }, { $set: updates });
      }
    } catch (error) {
      // Non-blocking initialization
    }
  }
}

module.exports = GGRService;
