const GGR = require("../models/GGR");

class GGRTopUpService {
  async getLatestGGR() {
    const latest = await GGR.findOne({})
      .sort({ updatedAt: -1 })
      .select("totalGGR totalBets totalPlayerLoss totalPlayerWin updatedAt")
      .lean();

    if (!latest) {
      return null;
    }

    return {
      totalGGR: Number(latest.totalGGR || 0),
      totalBets: Number(latest.totalBets || 0),
      totalPlayerLoss: Number(latest.totalPlayerLoss || 0),
      totalPlayerWin: Number(latest.totalPlayerWin || 0),
      updatedAt: latest.updatedAt,
    };
  }
}

module.exports = new GGRTopUpService();
