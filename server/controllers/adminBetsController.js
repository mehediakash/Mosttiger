const mongoose = require("mongoose");
const BettingHistory = require("../models/BettingHistory");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Escapes characters with special meaning in regular expressions
 */
function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses and returns a date filter object based on period or custom date range
 */
function parseDateFilter({ range, period, startDate, endDate }) {
  const selectedRange = (range || period || "").toLowerCase();
  const dateFilter = {};

  if (selectedRange === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { filter: { $gte: start, $lte: end }, error: null };
  }

  if (selectedRange === "yesterday") {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { filter: { $gte: start, $lte: end }, error: null };
  }

  if (selectedRange === "all" || selectedRange === "alltime") {
    return { filter: null, error: null };
  }

  // Custom date range
  if (startDate) {
    const s = new Date(startDate);
    if (isNaN(s.getTime())) {
      return {
        filter: null,
        error: "Invalid startDate format. Use YYYY-MM-DD or ISO string",
      };
    }
    if (String(startDate).trim().length <= 10) {
      s.setHours(0, 0, 0, 0);
    }
    dateFilter.$gte = s;
  }

  if (endDate) {
    const e = new Date(endDate);
    if (isNaN(e.getTime())) {
      return {
        filter: null,
        error: "Invalid endDate format. Use YYYY-MM-DD or ISO string",
      };
    }
    if (String(endDate).trim().length <= 10) {
      e.setHours(23, 59, 59, 999);
    }
    dateFilter.$lte = e;
  }

  if (dateFilter.$gte && dateFilter.$lte && dateFilter.$gte > dateFilter.$lte) {
    return { filter: null, error: "startDate cannot be after endDate" };
  }

  return {
    filter: Object.keys(dateFilter).length > 0 ? dateFilter : null,
    error: null,
  };
}

/**
 * @desc    Get all users' betting history with summary totals and filters for Admin Dashboard
 * @route   GET /api/admin/bets
 * @access  Private (Admin only)
 */
exports.getAdminBets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      range,
      period,
      startDate,
      endDate,
      search,
      status,
      provider,
      category,
    } = req.query;

    // 1. Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    // 2. Build date filter
    const { filter: dateQuery, error: dateError } = parseDateFilter({
      range,
      period,
      startDate,
      endDate,
    });

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const matchFilter = {};
    if (dateQuery) {
      matchFilter.playedAt = dateQuery;
    }

    // 3. Status filter (settled / unsettled / all)
    if (status && status.toLowerCase() !== "all") {
      const normalizedStatus = status.toLowerCase();
      if (["settled", "unsettled"].includes(normalizedStatus)) {
        matchFilter.status = normalizedStatus;
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status value. Must be 'settled', 'unsettled', or 'all'",
        });
      }
    }

    // 4. Provider and Category filters
    if (provider && provider.toLowerCase() !== "all") {
      matchFilter.provider = {
        $regex: `^${escapeRegex(provider.trim())}$`,
        $options: "i",
      };
    }

    if (category && category.toLowerCase() !== "all") {
      matchFilter.category = {
        $regex: `^${escapeRegex(category.trim())}$`,
        $options: "i",
      };
    }

    // 5. Search filter (username, numeric userId, phone, gameRound, gameName, provider)
    if (typeof search === "string" && search.trim().length > 0) {
      const trimmedSearch = search.trim();
      const escapedSearch = escapeRegex(trimmedSearch);

      // Search users matching username, phone, or numeric userId
      const userConditions = [
        { username: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];

      if (/^\d+$/.test(trimmedSearch)) {
        userConditions.push({ userId: Number(trimmedSearch) });
      }

      const matchedUsers = await User.find({ $or: userConditions })
        .select("_id")
        .limit(100)
        .lean();

      const userIds = matchedUsers.map((u) => u._id);

      const searchOr = [
        { gameRound: { $regex: escapedSearch, $options: "i" } },
        { gameName: { $regex: escapedSearch, $options: "i" } },
        { provider: { $regex: escapedSearch, $options: "i" } },
      ];

      if (userIds.length > 0) {
        searchOr.push({ user: { $in: userIds } });
      }

      if (mongoose.Types.ObjectId.isValid(trimmedSearch)) {
        searchOr.push({ user: new mongoose.Types.ObjectId(trimmedSearch) });
      }

      matchFilter.$or = searchOr;
    }

    // 6. Aggregate summary and paginated ledger in MongoDB
    const [result] = await BettingHistory.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalBet: { $sum: "$betAmount" },
                totalWin: { $sum: "$winAmount" },
                totalPL: { $sum: "$netResult" },
                records: { $sum: 1 },
              },
            },
          ],
          ledger: [
            { $sort: { playedAt: -1, createdAt: -1 } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      userId: 1,
                      username: 1,
                      phone: 1,
                      fullName: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: {
                path: "$userDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                gameRound: 1,
                gameName: 1,
                provider: 1,
                category: 1,
                providerGameCode: 1,
                status: 1,
                betAmount: 1,
                winAmount: 1,
                netResult: 1,
                turnoverAmount: 1,
                currency: 1,
                startBalance: 1,
                endBalance: 1,
                playedAt: 1,
                settledAt: 1,
                createdAt: 1,
                user: {
                  _id: "$userDetails._id",
                  userId: "$userDetails.userId",
                  username: "$userDetails.username",
                  phone: "$userDetails.phone",
                  fullName: "$userDetails.fullName",
                },
              },
            },
          ],
        },
      },
    ]);

    // 7. Format summary values safely
    const rawSummary = result?.summary?.[0] || {};
    const totalBet = Math.round(Number(rawSummary.totalBet || 0) * 100) / 100;
    const totalWin = Math.round(Number(rawSummary.totalWin || 0) * 100) / 100;
    const totalPL =
      Math.round(
        Number(
          rawSummary.totalPL !== undefined
            ? rawSummary.totalPL
            : totalWin - totalBet,
        ) * 100,
      ) / 100;
    const totalRecords = Number(rawSummary.records || 0);
    const totalPages =
      totalRecords > 0 ? Math.ceil(totalRecords / limitNum) : 0;

    // 8. Format ledger rows
    const formattedBets = (result?.ledger || []).map((rec) => ({
      id: rec._id ? rec._id.toString() : "",
      time: rec.playedAt || rec.createdAt,
      order: rec.gameRound || "N/A",
      game: rec.gameName || "Unknown Game",
      provider: rec.provider || "Unknown Provider",
      category: rec.category || "General",
      bet: Math.round(Number(rec.betAmount || 0) * 100) / 100,
      win: Math.round(Number(rec.winAmount || 0) * 100) / 100,
      netResult: Math.round(Number(rec.netResult || 0) * 100) / 100,
      turnover: Math.round(Number(rec.turnoverAmount || 0) * 100) / 100,
      status: rec.status || "settled",
      currency: rec.currency || "BDT",
      playedAt: rec.playedAt || rec.createdAt,
      settledAt: rec.settledAt || null,
      createdAt: rec.createdAt,
      user: rec.user?._id
        ? {
            id: rec.user._id.toString(),
            userId: rec.user.userId ?? null,
            username: rec.user.username || "Unknown",
            phone: rec.user.phone || "",
            fullName: rec.user.fullName || "",
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBet,
          totalWin,
          totalPL,
          records: totalRecords,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalRecords,
          totalPages,
        },
        bets: formattedBets,
      },
    });
  } catch (error) {
    logger.error("[ADMIN_BETS] Error fetching admin betting history:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    return res.status(500).json({
      success: false,
      message: "Server error while fetching betting history",
    });
  }
};
