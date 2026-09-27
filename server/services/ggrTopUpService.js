const GGR = require("../models/GGR");

class GGRTopUpService {
  async getLatestGGR() {
    const latest = await GGR.findOne({})
      .sort({ updatedAt: -1 })
      .select(
        "totalGGR totalBets totalPlayerLoss totalPlayerWin ggrRate appliedGgrRate periodBets periodWins periodNetGGR periodGGRCharge updatedAt",
      )
      .lean();

    if (!latest) {
      return null;
    }

    return {
      totalGGR: Number(latest.totalGGR || 0),
      totalBets: Number(latest.totalBets || 0),
      totalPlayerLoss: Number(latest.totalPlayerLoss || 0),
      totalPlayerWin: Number(latest.totalPlayerWin || 0),
      ggrRate: Number(latest.ggrRate ?? 10),
      appliedGgrRate: Number(latest.appliedGgrRate ?? latest.ggrRate ?? 10),
      periodBets: Number(latest.periodBets || 0),
      periodWins: Number(latest.periodWins || 0),
      periodNetGGR: Number(latest.periodNetGGR || 0),
      periodGGRCharge: Number(latest.periodGGRCharge || 0),
      updatedAt: latest.updatedAt,
    };
  }
}

module.exports = new GGRTopUpService();
