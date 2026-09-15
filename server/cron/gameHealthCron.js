const cron = require("node-cron");

const Game = require("../models/Game");
const GameHealthService = require("../services/GameHealthService");

// MANUAL RUN FUNCTION
const runGameHealthCheck = async () => {
  console.log("[GAME HEALTH] Started");

  try {
    const games = await Game.find({}).select("_id game_code game_name").lean();

    const BATCH_SIZE = 20;

    for (let i = 0; i < games.length; i += BATCH_SIZE) {
      const batch = games.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map((game) => GameHealthService.checkGame(game)),
      );
    }

    console.log("[GAME HEALTH] Completed");
  } catch (err) {
    console.error("[GAME HEALTH] Failed", err);
  }
};

// OPTIONAL CRON
const startGameHealthCron = () => {
  cron.schedule("0 3 * * *", async () => {
    await runGameHealthCheck();
  });
};

module.exports = {
  startGameHealthCron,
  runGameHealthCheck,
};
