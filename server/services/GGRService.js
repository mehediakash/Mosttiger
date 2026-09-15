const GGR = require("../models/GGR");

class GGRService {
  static async processGameResult({ betAmount, winAmount }, options = {}) {
    const bet = Number(betAmount || 0);
    const win = Number(winAmount || 0);

    const playerLoss = bet - win;

    const query = GGR.findOne();
    if (options.session) query.session(options.session);
    const ggr = await query;

    if (!ggr) return;

    const update = {
      $inc: {
        totalBets: bet,
      },
    };

    if (playerLoss > 0) {
      const deduction = playerLoss * 0.1;

      update.$inc.totalPlayerLoss = playerLoss;

      update.$set = {
        totalGGR: Math.max(0, Number(ggr.totalGGR || 0) - deduction),
      };
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
}

module.exports = GGRService;
