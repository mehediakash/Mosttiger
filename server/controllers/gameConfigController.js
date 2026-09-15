const GameConfig = require("../models/GameConfig");
const Game = require("../models/Game");

class GameConfigController {
  // Update game configuration
  async updateGameConfig(req, res) {
    try {
      const { gameId } = req.params;
      const updates = req.body;

      const game = await Game.findById(gameId);
      if (!game) {
        return res.status(404).json({
          success: false,
          message: "Game not found",
        });
      }

      let gameConfig = await GameConfig.findOne({ game: gameId });

      if (!gameConfig) {
        gameConfig = new GameConfig({
          game: gameId,
          category: game.category,
          provider: game.brand,
          updatedBy: req.user.id,
          ...updates,
        });
      } else {
        Object.keys(updates).forEach((key) => {
          gameConfig[key] = updates[key];
        });
        gameConfig.updatedBy = req.user.id;
      }

      await gameConfig.save();

      // Also update the Game model to reflect changes in game listings
      const gameUpdates = {};
      if (updates.isActive !== undefined)
        gameUpdates.is_active = updates.isActive;
      if (updates.featured !== undefined)
        gameUpdates.featured = updates.featured;
      if (updates.isHot !== undefined) gameUpdates.is_hot = updates.isHot;
      if (updates.minBet !== undefined) gameUpdates.min_bet = updates.minBet;
      if (updates.maxBet !== undefined) gameUpdates.max_bet = updates.maxBet;
      if (updates.rtp !== undefined) gameUpdates.rtp = updates.rtp;

      if (Object.keys(gameUpdates).length > 0) {
        await Game.findByIdAndUpdate(gameId, gameUpdates);
      }

      res.status(200).json({
        success: true,
        message: "Game configuration updated successfully",
        data: gameConfig,
      });
    } catch (error) {
      console.error("Update game config error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating game configuration",
      });
    }
  }

  // Get single game configuration
  async getGameConfig(req, res) {
    try {
      const { gameId } = req.params;

      const game = await Game.findById(gameId);
      if (!game) {
        return res.status(404).json({
          success: false,
          message: "Game not found",
        });
      }

      let gameConfig = await GameConfig.findOne({ game: gameId }).populate(
        "updatedBy",
        "username",
      );

      // If no config exists, return default values
      if (!gameConfig) {
        gameConfig = {
          game: gameId,
          isActive: game.is_active ?? true,
          minBet: game.min_bet ?? 10,
          maxBet: game.max_bet ?? 10000,
          rtp: game.rtp ?? 95,
          commission: 5, // Default commission
          featured: game.featured ?? false,
          isHot: game.is_hot ?? false,
          maintenanceMode: false,
          category: game.category,
          provider: game.brand,
        };
      }

      res.status(200).json({
        success: true,
        data: gameConfig,
      });
    } catch (error) {
      console.error("Get game config error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching game configuration",
      });
    }
  }

  // Get all game configurations
  async getGameConfigs(req, res) {
    try {
      const { page = 1, limit = 20, category, provider, isActive } = req.query;

      const query = {};
      if (isActive !== undefined) query.isActive = isActive === "true";

      // Build aggregation pipeline for proper filtering
      const pipeline = [
        {
          $lookup: {
            from: "games",
            localField: "game",
            foreignField: "_id",
            as: "game",
          },
        },
        {
          $unwind: "$game",
        },
      ];

      // Add match conditions
      const matchConditions = {};
      if (Object.keys(query).length > 0) {
        matchConditions.$and = [query];
      }

      if (category) {
        matchConditions["game.category"] = category;
      }

      if (provider) {
        matchConditions["game.brand"] = provider;
      }

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }

      // Add population for updatedBy
      pipeline.push(
        {
          $lookup: {
            from: "users",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedBy",
          },
        },
        {
          $unwind: { path: "$updatedBy", preserveNullAndEmptyArrays: true },
        },
      );

      // Add explicit projection to ensure all fields are included
      pipeline.push({
        $project: {
          game: 1,
          isActive: 1,
          minBet: 1,
          maxBet: 1,
          rtp: 1,
          commission: 1,
          maintenanceMode: 1,
          featured: 1,
          isHot: 1,
          category: 1,
          provider: 1,
          config: 1,
          updatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      });

      // Add sorting and pagination
      pipeline.push(
        { $sort: { updatedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      );

      const configs = await GameConfig.aggregate(pipeline);

      // Get total count
      const countPipeline = [...pipeline];
      countPipeline.pop(); // Remove limit
      countPipeline.pop(); // Remove skip
      countPipeline.push({ $count: "total" });

      const countResult = await GameConfig.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: {
          configs,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error("Get game configs error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching game configurations",
      });
    }
  }

  // Toggle game maintenance mode
  async toggleMaintenanceMode(req, res) {
    try {
      const { gameId } = req.params;
      const { maintenanceMode } = req.body;

      const gameConfig = await GameConfig.findOneAndUpdate(
        { game: gameId },
        {
          maintenanceMode: maintenanceMode,
          updatedBy: req.user.id,
        },
        { new: true, upsert: true },
      ).populate("game", "game_name brand");

      res.status(200).json({
        success: true,
        message: `Game ${maintenanceMode ? "put in" : "removed from"} maintenance mode`,
        data: gameConfig,
      });
    } catch (error) {
      console.error("Toggle maintenance mode error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating maintenance mode",
      });
    }
  }
}

module.exports = new GameConfigController();
