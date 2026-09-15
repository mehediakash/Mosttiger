const BettingHistory = require("../models/BettingHistory");
const mongoose = require("mongoose");

// @desc    Get grouped betting records summary
// @route   GET /api/betting-records
// @access  Private
exports.getBettingRecords = async (req, res) => {
  try {
    const { status, days = 7, page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Validate inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const daysNum = Math.max(1, parseInt(days) || 7);

    // Build date filter
    const dateFilter = {};
    if (daysNum > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      dateFilter.$gte = startDate;
    }

    // Build status filter
    const statusFilter = {};
    if (status && ["settled", "unsettled"].includes(status)) {
      statusFilter.$eq = status;
    }

    // Aggregation pipeline
    const pipeline = [
      // 1. Match user and date range
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          playedAt: dateFilter,
          ...(statusFilter.$eq && { status: statusFilter }),
        },
      },

      // 2. Group by date, provider, and category
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$playedAt" },
            },
            provider: "$provider",
            category: "$category",
          },
          totalTurnover: { $sum: "$betAmount" },
          totalProfitLoss: { $sum: "$netResult" },
          totalBets: { $sum: 1 },
          gameNames: { $push: "$gameName" },
          records: {
            $push: {
              id: "$_id",
              gameRound: "$gameRound",
              gameName: "$gameName",
              betAmount: "$betAmount",
              winAmount: "$winAmount",
              netResult: "$netResult",
              turnoverAmount: "$turnoverAmount",
              status: "$status",
              playedAt: "$playedAt",
              settledAt: "$settledAt",
            },
          },
        },
      },

      // 3. Sort by date descending (newest first)
      {
        $sort: {
          "_id.date": -1,
          "_id.provider": 1,
        },
      },

      // 4. Facet for pagination and total count
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
        },
      },
    ];

    // Execute aggregation
    const result = await BettingHistory.aggregate(pipeline);

    const total = result[0]?.metadata[0]?.total || 0;
    const records = result[0]?.data || [];

    // Format response
    const formattedRecords = records.map((item) => ({
      date: item._id.date,
      provider: item._id.provider,
      category: item._id.category,
      totalTurnover: parseFloat(item.totalTurnover.toFixed(2)),
      totalProfitLoss: parseFloat(item.totalProfitLoss.toFixed(2)),
      totalBets: item.totalBets,
      details: item.records.map((rec) => ({
        id: rec.id.toString(),
        txnDate: rec.playedAt
          ? new Date(rec.playedAt).toLocaleString("en-BD", {
              year: "2-digit",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "N/A",
        game: rec.gameName,
        turnover: parseFloat(rec.turnoverAmount.toFixed(2)),
        profitLoss: parseFloat(rec.netResult.toFixed(2)),
        status: rec.status,
      })),
    }));

    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        recordsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("[BettingRecords] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch betting records",
    });
  }
};

// @desc    Get betting records summary for specific date
// @route   GET /api/betting-records/date/:date
// @access  Private
exports.getBettingRecordsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user._id;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const startDate = new Date(`${date}T00:00:00Z`);
    const endDate = new Date(`${date}T23:59:59Z`);

    const records = await BettingHistory.find({
      user: userId,
      playedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .lean()
      .sort({ playedAt: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("[BettingRecords] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch betting records",
    });
  }
};

// @desc    Get betting records by provider
// @route   GET /api/betting-records/provider/:provider
// @access  Private
exports.getBettingRecordsByProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const { days = 30, page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const daysNum = Math.max(1, parseInt(days) || 30);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const total = await BettingHistory.countDocuments({
      user: userId,
      provider,
      playedAt: { $gte: startDate },
    });

    const records = await BettingHistory.find({
      user: userId,
      provider,
      playedAt: { $gte: startDate },
    })
      .lean()
      .sort({ playedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Calculate summary
    const summary = records.reduce(
      (acc, rec) => ({
        totalTurnover: acc.totalTurnover + (rec.betAmount || 0),
        totalWin: acc.totalWin + (rec.winAmount || 0),
        totalProfitLoss: acc.totalProfitLoss + (rec.netResult || 0),
        totalBets: acc.totalBets + 1,
      }),
      { totalTurnover: 0, totalWin: 0, totalProfitLoss: 0, totalBets: 0 },
    );

    res.json({
      success: true,
      provider,
      summary: {
        totalTurnover: parseFloat(summary.totalTurnover.toFixed(2)),
        totalWin: parseFloat(summary.totalWin.toFixed(2)),
        totalProfitLoss: parseFloat(summary.totalProfitLoss.toFixed(2)),
        totalBets: summary.totalBets,
      },
      data: records,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        recordsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("[BettingRecords] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch betting records",
    });
  }
};

// @desc    Get betting statistics summary
// @route   GET /api/betting-records/stats
// @access  Private
exports.getBettingStats = async (req, res) => {
  try {
    const { days = 30, status } = req.query;
    const userId = req.user._id;
    const daysNum = Math.max(1, parseInt(days) || 30);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const matchStage = {
      user: new mongoose.Types.ObjectId(userId),
      playedAt: { $gte: startDate },
    };

    if (status && ["settled", "unsettled"].includes(status)) {
      matchStage.status = status;
    }

    const stats = await BettingHistory.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: null,
          totalTurnover: { $sum: "$betAmount" },
          totalWin: { $sum: "$winAmount" },
          totalProfitLoss: { $sum: "$netResult" },
          totalBets: { $sum: 1 },
          averageBet: { $avg: "$betAmount" },
          highestWin: { $max: "$winAmount" },
          highestLoss: { $min: "$netResult" },
          uniqueProviders: { $addToSet: "$provider" },
          uniqueGames: { $addToSet: "$gameName" },
        },
      },
    ]);

    const statData = stats[0] || {
      totalTurnover: 0,
      totalWin: 0,
      totalProfitLoss: 0,
      totalBets: 0,
      averageBet: 0,
      highestWin: 0,
      highestLoss: 0,
      uniqueProviders: [],
      uniqueGames: [],
    };

    res.json({
      success: true,
      data: {
        totalTurnover: parseFloat(statData.totalTurnover.toFixed(2)),
        totalWin: parseFloat(statData.totalWin.toFixed(2)),
        totalProfitLoss: parseFloat(statData.totalProfitLoss.toFixed(2)),
        totalBets: statData.totalBets,
        averageBet: parseFloat(statData.averageBet.toFixed(2)),
        highestWin: parseFloat(statData.highestWin.toFixed(2)),
        highestLoss: parseFloat(statData.highestLoss.toFixed(2)),
        winRate: statData.totalBets
          ? parseFloat(
              ((statData.totalWin / statData.totalBets) * 100).toFixed(2),
            )
          : 0,
        uniqueProvidersCount: statData.uniqueProviders.length,
        uniqueGamesCount: statData.uniqueGames.length,
      },
    });
  } catch (error) {
    console.error("[BettingRecords] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch betting stats",
    });
  }
};

// @desc    Get detailed betting records (individual rounds)
// @route   GET /api/betting-records/details
// @access  Private
exports.getBettingDetails = async (req, res) => {
  try {
    const {
      provider,
      category,
      date,
      status,
      page = 1,
      limit = 50,
    } = req.query;
    const userId = req.user._id;

    // Validate inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

    // Build match filter
    const matchFilter = {
      user: new mongoose.Types.ObjectId(userId),
    };

    // Apply provider filter
    if (provider) {
      matchFilter.provider = provider;
    }

    // Apply category filter
    if (category) {
      matchFilter.category = category;
    }

    // Apply status filter
    if (status && ["settled", "unsettled"].includes(status)) {
      matchFilter.status = status;
    }

    // Apply date filter (date range for single day)
    if (date) {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const startDate = new Date(`${date}T00:00:00Z`);
      const endDate = new Date(`${date}T23:59:59Z`);

      matchFilter.playedAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get total count
    const total = await BettingHistory.countDocuments(matchFilter);

    // Fetch records with select for performance
    const records = await BettingHistory.find(matchFilter)
      .select(
        "createdAt gameName betAmount netResult gameRound status providerGameCode playedAt",
      )
      .lean()
      .sort({ createdAt: -1, playedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Format response
    const formattedRecords = records.map((record) => ({
      id: record._id?.toString(),
      txnDate: record.createdAt
        ? new Date(record.createdAt).toLocaleString("en-BD", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : new Date(record.playedAt).toLocaleString("en-BD", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
      gameName: record.gameName,
      turnover: parseFloat(record.betAmount.toFixed(2)),
      profitLoss: parseFloat(record.netResult.toFixed(2)),
      gameRound: record.gameRound,
      status: record.status,
      providerGameCode: record.providerGameCode,
    }));

    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        recordsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("[BettingRecords] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch betting details",
    });
  }
};

module.exports = exports;
