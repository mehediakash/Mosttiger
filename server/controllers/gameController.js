const axios = require("axios");
const Game = require("../models/Game");
const BettingHistory = require("../models/BettingHistory");
const igamingService = require("../services/igamingService");
const WalletService = require("../services/walletService");

const GGRService = require("../services/GGRService");
// Constants for providers and categories
const PROVIDERS = [
  "JILI",
  "PGSoft",
  "Evolution",
  "Spribe",
  "Pragmatic",
  "NetEnt",
  "Microgaming",
  "Betsoft",
  "Playtech",
  "Yggdrasil",
];

const PROMOTION_CATEGORIES = [
  "ALL",
  "Sports",
  "Casino",
  "Slots",
  "Fishing",
  "Lottery",
  "Arcade",
  "Crash",
];

// Utility: escape regex special characters for safe regex construction
function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// @desc    Get all games with filtering
// @route   GET /api/games
// @access  Private
exports.getGames = async (req, res) => {
  try {
    const {
      category,
      brand,
      search,
      page = 1,
      limit = 20,
      featured,
      is_hot,
      is_active,
    } = req.query;

    const query = {};

    // Apply is_active filter - if not specified, show all games
    if (is_active !== undefined) {
      query.is_active = is_active === "true";
    }

    // Apply category/featured/hot filters
    if (category) query.category = category;
    if (featured !== undefined) query.featured = featured === "true";
    if (is_hot !== undefined) query.is_hot = is_hot === "true";

    // Build search and brand conditions carefully to avoid overwriting $or
    const andClauses = [];

    if (search) {
      const s = String(search);
      andClauses.push({
        $or: [
          { game_name: { $regex: s, $options: "i" } },
          { brand: { $regex: s, $options: "i" } },
        ],
      });
    }

    // Support both 'brand' and 'provider' query params (comma-separated)
    const brandParam = brand || req.query.provider;
    if (brandParam) {
      const items = String(brandParam)
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      if (items.length === 1) {
        const b = items[0];
        andClauses.push({
          brand: { $regex: `^${escapeRegex(b)}$`, $options: "i" },
        });
      } else if (items.length > 1) {
        andClauses.push({
          $or: items.map((b) => ({
            brand: { $regex: `^${escapeRegex(b)}$`, $options: "i" },
          })),
        });
      }
    }

    // Attach andClauses to query if any
    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    // lean() reduces memory usage by ~40% per document
    const games = await Game.find(query)
      .sort({ popularity: -1, featured: -1, game_name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const total = await Game.countDocuments(query);

    // Get unique categories and brands for filters (from all games)
    const categories = await Game.distinct("category");
    const brands = await Game.distinct("brand");

    res.status(200).json({
      success: true,
      data: {
        games,
        filters: {
          categories,
          brands,
        },
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get games error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching games",
    });
  }
};

// @desc    Get game categories
// @route   GET /api/games/categories
// @access  Private
exports.getGameCategories = async (req, res) => {
  try {
    const categories = await Game.distinct("category", { is_active: true });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get game categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching game categories",
    });
  }
};

// @desc    Get providers list
// @route   GET /api/games/providers
// @access  Public
exports.getProviders = async (req, res) => {
  try {
    // Pull distinct brand names from Game collection
    const brands = await Game.distinct("brand");

    // Defensive: filter falsy, sort
    const providers = Array.from(
      new Set((brands || []).filter(Boolean)),
    ).sort();

    res.status(200).json({
      success: true,
      data: {
        providers,
      },
    });
  } catch (error) {
    console.error("Get providers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching providers",
    });
  }
};

// @desc    Get game by ID
// @route   GET /api/games/:id
// @access  Private
exports.getGameById = async (req, res) => {
  try {
    // lean() reduces memory usage for read-only lookup
    const game = await Game.findById(req.params.id).lean();

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    console.error("Get game by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching game",
    });
  }
};

// @desc    Launch casino game
// @route   POST /api/games/launch/:gameId
// @access  Private
exports.launchGame = async (req, res) => {
  try {
    const canLaunch = await GGRService.canLaunchGame();

    if (!canLaunch) {
      return res.status(403).json({
        success: false,
        code: "LOW_GGR",
        message: "Low GGR. Please contact GameBetX.",
      });
    }

    const { gameId } = req.params;
    const { currency = "BDT", language = "en" } = req.body;

    const gameCode = String(gameId).trim();

    const game = await Game.findOne({
      game_code: gameCode,
      is_active: true,
    })
      .select("_id game_code game_name brand category image_url")
      .lean();

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    const result = await igamingService.launchGame(req.user, game, {
      currency,
      language,
    });

    return res.status(200).json({
      success: true,
      message: "Game launched successfully",
      data: result,
    });
  } catch (error) {
    console.error("[GAMECONTROLLER][launchGame]", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Handle game callback from provider
// @route   POST /api/games/callback
// @access  Public
exports.handleGameCallback = async (req, res) => {
  try {
    const result = await igamingService.handleGameCallback(req.body);
    res.json({
      credit_amount: result.credit_amount,
      timestamp: result.timestamp || Date.now(),
    });
  } catch (error) {
    throw error;
  }
};

// bet -

// @desc    Get user game history
// @route   GET /api/games/history
// @access  Private
exports.getGameHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      gameId,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await igamingService.getUserGameHistory(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      gameId,
      status,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get game history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching game history",
    });
  }
};

// @desc    Get active game sessions
// @route   GET /api/games/active-sessions
// @access  Private
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await igamingService.getActiveSessions(req.user.id);

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Get active sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching active sessions",
    });
  }
};

// @desc    Close game session
// @route   POST /api/games/close-session
// @access  Private
exports.closeGameSession = async (req, res) => {
  try {
    const { gameCode } = req.body;

    if (!gameCode) {
      return res.status(400).json({
        success: false,
        message: "Game code is required",
      });
    }

    const GameSession = require("../models/GameSession");
    const WalletService = require("../services/walletService");

    // Find active session for this user and game
    const session = await GameSession.findOne({
      user: req.user.id,
      providerGameCode: gameCode,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "No active session found for this game",
      });
    }

    // Get current wallet balance
    // 🔧 FIX: Round to 2 decimal places to prevent floating point bugs
    const wallet = await WalletService.getWalletBalance(req.user.id);
    const currentBalance = Math.round((wallet.main || 0) * 100) / 100;

    // Update session with final balance
    session.endBalance = currentBalance;
    session.status = "closed";
    session.endedAt = new Date();
    await session.save();

    // Settle all related betting history rows for this game session
    await BettingHistory.updateMany(
      {
        gameSession: session._id,
        status: "unsettled",
      },
      {
        $set: {
          status: "settled",
          settledAt: new Date(),
        },
      },
    );

    // 🔧 FIX: Round netChange to prevent float precision bugs
    const netChange =
      Math.round((session.endBalance - session.startBalance) * 100) / 100;

    res.status(200).json({
      success: true,
      message: "Game session closed successfully",
      data: {
        sessionId: session._id,
        startBalance: session.startBalance,
        endBalance: session.endBalance,
        netChange: netChange,
      },
    });
  } catch (error) {
    console.error("Close game session error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while closing game session",
    });
  }
};

// @desc    Close all active game sessions
// @route   POST /api/games/close-all-sessions
// @access  Private
exports.closeAllGameSessions = async (req, res) => {
  try {
    const GameSession = require("../models/GameSession");
    const WalletService = require("../services/walletService");

    // Find all active sessions for this user
    const activeSessions = await GameSession.find({
      user: req.user.id,
      status: "active",
    });

    if (activeSessions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active sessions to close",
        data: {
          closedCount: 0,
        },
      });
    }

    // Get current wallet balance
    // 🔧 FIX: Round to 2 decimal places to prevent floating point bugs
    const wallet = await WalletService.getWalletBalance(req.user.id);
    const currentBalance = Math.round((wallet.main || 0) * 100) / 100;

    // Close all active sessions
    const closedSessions = [];
    const sessionIds = [];
    for (const session of activeSessions) {
      session.endBalance = currentBalance;
      session.status = "closed";
      session.endedAt = new Date();
      await session.save();
      sessionIds.push(session._id);
      closedSessions.push({
        sessionId: session._id,
        gameCode: session.providerGameCode,
        startBalance: session.startBalance,
        endBalance: session.endBalance,
      });
    }

    // Settle all related betting history rows for all closed sessions
    if (sessionIds.length > 0) {
      await BettingHistory.updateMany(
        {
          gameSession: { $in: sessionIds },
          status: "unsettled",
        },
        {
          $set: {
            status: "settled",
            settledAt: new Date(),
          },
        },
      );
    }

    res.status(200).json({
      success: true,
      message: `${closedSessions.length} game session(s) closed successfully`,
      data: {
        closedCount: closedSessions.length,
        sessions: closedSessions,
      },
    });
  } catch (error) {
    console.error("Close all game sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while closing game sessions",
    });
  }
};

// @desc    Get all providers for admin promotion system
// @route   GET /api/games/admin/providers-list
// @access  Private (Admin only)
exports.getAdminProvidersList = async (req, res) => {
  try {
    // Get providers from database (actual brands from games)
    const dbBrands = await Game.distinct("brand", { is_active: true });
    const databaseProviders = Array.from(
      new Set((dbBrands || []).filter(Boolean)),
    ).sort();

    // Combine with static list, removing duplicates
    const allProviders = Array.from(
      new Set([...PROVIDERS, ...databaseProviders]),
    ).sort();

    res.status(200).json({
      success: true,
      data: {
        providers: allProviders,
        total: allProviders.length,
      },
    });
  } catch (error) {
    console.error("Get admin providers list error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching providers list",
    });
  }
};

// @desc    Get all categories for admin promotion system
// @route   GET /api/games/admin/categories-list
// @access  Private (Admin only)
exports.getAdminCategoriesList = async (req, res) => {
  try {
    // Get categories from database
    const dbCategories = await Game.distinct("category", { is_active: true });
    const databaseCategories = (dbCategories || [])
      .filter(Boolean)
      .map((cat) => String(cat).trim())
      .sort();

    // Combine with promotion categories, removing duplicates
    const allCategories = Array.from(
      new Set([...PROMOTION_CATEGORIES, ...databaseCategories]),
    ).sort();

    res.status(200).json({
      success: true,
      data: {
        categories: allCategories,
        total: allCategories.length,
        promotionCategories: PROMOTION_CATEGORIES,
      },
    });
  } catch (error) {
    console.error("Get admin categories list error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching categories list",
    });
  }
};

// @desc    Get providers and categories (combined for promotion form)
// @route   GET /api/games/admin/promotion-data
// @access  Private (Admin only)
exports.getPromotionFormData = async (req, res) => {
  try {
    // Get providers
    const dbBrands = await Game.distinct("brand", { is_active: true });
    const providers = Array.from(
      new Set([...PROVIDERS, ...(dbBrands || []).filter(Boolean)]),
    ).sort();

    // Get categories
    const dbCategories = await Game.distinct("category", { is_active: true });
    const categories = Array.from(
      new Set([
        ...PROMOTION_CATEGORIES,
        ...(dbCategories || [])
          .filter(Boolean)
          .map((cat) => String(cat).trim()),
      ]),
    ).sort();

    res.status(200).json({
      success: true,
      data: {
        providers,
        categories,
        promotionCategories: PROMOTION_CATEGORIES,
      },
    });
  } catch (error) {
    console.error("Get promotion form data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promotion data",
    });
  }
};
