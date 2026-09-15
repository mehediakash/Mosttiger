const Game = require("../models/Game");
const GameConfig = require("../models/GameConfig");
const igamingService = require("./igamingService");

class GameHealthService {
  static async checkGame(game) {
    try {
      const testUser = {
        _id: process.env.TEST_USER_ID,
        userId: process.env.TEST_MEMBER_ACCOUNT,
      };

      await igamingService.launchGame(testUser, game);

      return true;
    } catch (error) {
      const msg = String(
        error?.response?.data?.message || error.message || "",
      ).toLowerCase();

      if (msg.includes("maintenance") || msg.includes("under maintenance")) {
        try {
          // Delete related config first
          await GameConfig.deleteMany({
            game: game._id,
          });

          // Delete game
          await Game.deleteOne({
            _id: game._id,
          });

          console.log(
            `[GAME DELETE] ${game.game_name} (${game.game_code}) removed from database`,
          );
        } catch (deleteError) {
          console.error(`[GAME DELETE ERROR] ${game.game_name}`, deleteError);
        }
      }

      return false;
    }
  }
}

module.exports = GameHealthService;
