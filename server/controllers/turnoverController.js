const Turnover = require("../models/Turnover");
const User = require("../models/User");

// Create turnover record when a bet is placed
exports.recordTurnover = async (req, res) => {
  try {
    const {
      userId,
      betId,
      amount,
      gameType,
      agentId,
      superAgentId,
      masterAgentId,
      betStatus = "pending",
    } = req.body;

    if (!userId || !betId || amount === undefined || amount < 0) {
      return res.status(400).json({
        message: "Missing required fields: userId, betId, amount",
      });
    }

    // Check if turnover already exists for this bet (prevent duplicates)
    const existingTurnover = await Turnover.findOne({ betId });
    if (existingTurnover) {
      return res.status(400).json({
        message: "Turnover already recorded for this bet",
      });
    }

    // Create turnover record (safely handle missing hierarchy)
    const turnover = new Turnover({
      userId,
      betId,
      amount,
      gameType: gameType || "other",
      agentId: agentId ?? null,
      superAgentId: superAgentId ?? null,
      masterAgentId: masterAgentId ?? null,
      betStatus,
      platformTurnoverDate: new Date(),
    });

    await turnover.save();

    res.status(201).json({
      message: "Turnover recorded successfully",
      data: turnover,
    });
  } catch (error) {
    console.error("Error recording turnover:", error);
    res
      .status(500)
      .json({ message: "Error recording turnover", error: error.message });
  }
};

// Update turnover when bet status changes
exports.updateTurnoverStatus = async (req, res) => {
  try {
    const { betId, betStatus } = req.body;

    if (!betId || !betStatus) {
      return res.status(400).json({
        message: "Missing required fields: betId, betStatus",
      });
    }

    const turnover = await Turnover.findOneAndUpdate(
      { betId },
      { betStatus, updatedAt: new Date() },
      { new: true },
    );

    if (!turnover) {
      return res.status(404).json({ message: "Turnover record not found" });
    }

    res.json({
      message: "Turnover status updated successfully",
      data: turnover,
    });
  } catch (error) {
    console.error("Error updating turnover:", error);
    res
      .status(500)
      .json({ message: "Error updating turnover", error: error.message });
  }
};

// Get user total turnover
exports.getUserTurnover = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const query = { userId, betStatus: { $in: ["won", "lost", "pending"] } };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const totalTurnover = await Turnover.aggregate([
      { $match: query },
      { $group: { _id: "$userId", totalTurnover: { $sum: "$amount" } } },
    ]);

    // Safe access with optional chaining
    const userTurnover = totalTurnover?.[0]?.totalTurnover ?? 0;

    res.json({
      userId,
      totalTurnover: userTurnover,
      dateRange: {
        startDate: startDate || "N/A",
        endDate: endDate || "N/A",
      },
    });
  } catch (error) {
    console.error("Error fetching user turnover:", error);
    res
      .status(500)
      .json({ message: "Error fetching user turnover", error: error.message });
  }
};

// Get agent team turnover (aggregated from all team members)
exports.getAgentTeamTurnover = async (req, res) => {
  try {
    const { agentId, startDate, endDate } = req.query;

    if (!agentId) {
      return res.status(400).json({ message: "agentId is required" });
    }

    const query = { agentId, betStatus: { $in: ["won", "lost", "pending"] } };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const totalTurnover = await Turnover.aggregate([
      { $match: query },
      { $group: { _id: "$agentId", totalTurnover: { $sum: "$amount" } } },
    ]);

    // Safe access - handles no agent turnover
    const teamTurnover = totalTurnover?.[0]?.totalTurnover ?? 0;

    res.json({
      agentId,
      totalTeamTurnover: teamTurnover,
      dateRange: {
        startDate: startDate || "N/A",
        endDate: endDate || "N/A",
      },
    });
  } catch (error) {
    console.error("Error fetching agent turnover:", error);
    res
      .status(500)
      .json({ message: "Error fetching agent turnover", error: error.message });
  }
};

// Get platform-wide statistics
exports.getPlatformTurnoverStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const query = { betStatus: { $in: ["won", "lost", "pending"] } };

    // Total all-time turnover
    const totalTurnover = await Turnover.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Today's turnover
    const todayTurnover = await Turnover.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Weekly turnover
    const weeklyTurnover = await Turnover.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Monthly turnover
    const monthlyTurnover = await Turnover.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalPlatformTurnover: totalTurnover?.[0]?.total ?? 0,
      todayTurnover: todayTurnover?.[0]?.total ?? 0,
      weeklyTurnover: weeklyTurnover?.[0]?.total ?? 0,
      monthlyTurnover: monthlyTurnover?.[0]?.total ?? 0,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching platform turnover stats:", error);
    res
      .status(500)
      .json({ message: "Error fetching platform stats", error: error.message });
  }
};

// Get top active users by turnover
exports.getTopUsersByTurnover = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const query = { betStatus: { $in: ["won", "lost", "pending"] } };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const topUsers = await Turnover.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$userId",
          totalTurnover: { $sum: "$amount" },
          betCount: { $sum: 1 },
          lastBetDate: { $max: "$createdAt" },
        },
      },
      { $sort: { totalTurnover: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: "$_id",
          totalTurnover: 1,
          betCount: 1,
          lastBetDate: 1,
          userName: {
            $cond: [
              {
                $and: [
                  { $ne: ["$userInfo", null] },
                  { $ne: ["$userInfo.username", null] },
                ],
              },
              "$userInfo.username",
              "Unknown User",
            ],
          },
          userEmail: {
            $cond: [
              {
                $and: [
                  { $ne: ["$userInfo", null] },
                  { $ne: ["$userInfo.email", null] },
                ],
              },
              "$userInfo.email",
              "N/A",
            ],
          },
          _id: 0,
        },
      },
    ]);

    res.json({
      topUsers: topUsers ?? [],
      totalRecords: topUsers?.length ?? 0,
    });
  } catch (error) {
    console.error("Error fetching top users:", error);
    res
      .status(500)
      .json({ message: "Error fetching top users", error: error.message });
  }
};

// Get top agents by team turnover
exports.getTopAgentsByTeamTurnover = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const query = {
      agentId: { $exists: true, $ne: null },
      betStatus: { $in: ["won", "lost", "pending"] },
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const topAgents = await Turnover.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$agentId",
          totalTeamTurnover: { $sum: "$amount" },
          betCount: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
          lastBetDate: { $max: "$createdAt" },
        },
      },
      {
        $addFields: {
          uniqueUserCount: { $size: "$uniqueUsers" },
        },
      },
      { $sort: { totalTeamTurnover: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "agents",
          localField: "_id",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          agentId: "$_id",
          totalTeamTurnover: 1,
          betCount: 1,
          uniqueUserCount: 1,
          lastBetDate: 1,
          agentName: {
            $cond: [
              {
                $and: [
                  { $ne: ["$agentInfo", null] },
                  { $ne: ["$agentInfo.name", null] },
                ],
              },
              "$agentInfo.name",
              "Unknown Agent",
            ],
          },
          agentEmail: {
            $cond: [
              {
                $and: [
                  { $ne: ["$agentInfo", null] },
                  { $ne: ["$agentInfo.email", null] },
                ],
              },
              "$agentInfo.email",
              "N/A",
            ],
          },
          _id: 0,
        },
      },
    ]);

    res.json({
      topAgents: topAgents ?? [],
      totalRecords: topAgents?.length ?? 0,
    });
  } catch (error) {
    console.error("Error fetching top agents:", error);
    res
      .status(500)
      .json({ message: "Error fetching top agents", error: error.message });
  }
};

// Get filtered turnover data
exports.getFilteredTurnoverData = async (req, res) => {
  try {
    const {
      filterType = "today",
      userId,
      agentId,
      page = 1,
      limit = 50,
    } = req.query;

    const now = new Date();
    let startDate;

    switch (filterType) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        break;
      case "last7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "last30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const query = {
      createdAt: { $gte: startDate },
      betStatus: { $in: ["won", "lost", "pending"] },
    };

    if (userId) query.userId = userId;
    if (agentId) query.agentId = agentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch turnover data with user information
    const turnoverData = await Turnover.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enhance with user details (populate manually for better control)
    const User = require("../models/User");
    const enrichedData = await Promise.all(
      turnoverData.map(async (record) => {
        try {
          const user = await User.findById(record.userId)
            .select("username email name")
            .lean();
          return {
            ...record,
            userId: {
              _id: record.userId,
              username: user?.username || "Unknown User",
              email: user?.email || "N/A",
              name: user?.name || "Unknown User",
            },
          };
        } catch (err) {
          return {
            ...record,
            userId: {
              _id: record.userId,
              username: "Unknown User",
              email: "N/A",
              name: "Unknown User",
            },
          };
        }
      }),
    );

    const [, total] = await Promise.all([
      Promise.resolve(enrichedData),
      Turnover.countDocuments(query),
    ]);

    const aggregateStats = await Turnover.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTurnover: { $sum: "$amount" },
          totalBets: { $sum: 1 },
          avgBetAmount: { $avg: "$amount" },
        },
      },
    ]);

    res.json({
      data: enrichedData ?? [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total ?? 0,
        pages: Math.ceil((total ?? 0) / parseInt(limit)),
      },
      stats: aggregateStats?.[0] ?? {
        totalTurnover: 0,
        totalBets: 0,
        avgBetAmount: 0,
      },
      filterType,
    });
  } catch (error) {
    console.error("Error fetching filtered data:", error);
    res
      .status(500)
      .json({ message: "Error fetching filtered data", error: error.message });
  }
};

// Get user list with turnover column data
exports.getUsersWithTurnover = async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = "turnover" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.aggregate([
      {
        $lookup: {
          from: "turnovers",
          localField: "_id",
          foreignField: "userId",
          as: "turnoverRecords",
        },
      },
      {
        $addFields: {
          totalTurnover: { $sum: "$turnoverRecords.amount" },
          betCount: { $size: "$turnoverRecords" },
        },
      },
      {
        $sort: {
          ...(sortBy === "turnover"
            ? { totalTurnover: -1 }
            : { createdAt: -1 }),
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          totalTurnover: 1,
          betCount: 1,
          createdAt: 1,
          turnoverRecords: 0,
        },
      },
    ]);

    const total = await User.countDocuments();

    res.json({
      data: users ?? [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total ?? 0,
        pages: Math.ceil((total ?? 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching users with turnover:", error);
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};
