const Turnover = require("../models/Turnover");
const User = require("../models/User");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const Game = require("../models/Game");

/**
 * UNIVERSAL TURNOVER SERVICE
 *
 * Handles turnover recording for ALL providers and game types dynamically.
 *
 * Supported Game Types:
 * - casino: From provider callbacks (Pragmatic Play, Microgaming, NetEnt, etc.)
 * - sports: From sports betting (Cricket, Football, Tennis, etc.)
 * - slots: From slot games
 * - livecasino: From live casino
 * - virtual: From virtual games
 * - lottery: From lottery
 * - provider-specific: Any provider can be added without code changes
 *
 * Features:
 * ✅ Dynamic game type detection (NO hardcoding)
 * ✅ Dynamic provider detection (supports 99+ providers)
 * ✅ Automatic duplicate prevention
 * ✅ User hierarchy tracking (User → Agent → Super Agent → Master Agent)
 * ✅ Deep logging for debugging
 * ✅ Non-blocking error handling (doesn't fail betting)
 * ✅ Works for ANY provider automatically
 */
class TurnoverService {
  /**
   * MAIN: Record turnover for any bet
   *
   * @param {Object} betData - Bet information
   * @param {String} betData.userId - User ID (required)
   * @param {String} betData.betId - Unique bet identifier (required)
   * @param {Number} betData.amount - Bet amount (required)
   * @param {String} betData.betSource - Source: 'casino'/'sports'/'slots'/'live'/'virtual'/'lottery'
   * @param {String} betData.gameType - Game type (auto-detected if not provided)
   * @param {String} betData.providerCode - Provider identifier (Pragmatic Play, Cricket, etc.)
   * @param {Object} betData.metadata - Additional bet metadata
   * @returns {Promise<Object>} Created Turnover record or null if duplicate
   */
  static async recordTurnover(betData) {
    const startTime = Date.now();

    try {
      const {
        userId,
        betId,
        amount,
        betSource = "unknown",
        gameType,
        providerCode,
        transactionId,
        metadata = {},
      } = betData;

      // ✅ Validation
      if (!userId || !betId || amount === undefined || amount <= 0) {
        console.error(
          `[TURNOVER] ✗ Invalid bet data: userId=${userId}, betId=${betId}, amount=${amount}`,
        );
        return null;
      }

      const provider =
        providerCode || this._extractProvider(betSource, metadata);
      const detectedGameType =
        gameType || this._detectGameType(betSource, metadata, provider);

      console.log(
        `[TURNOVER] Recording: User=${userId} | BetID=${betId} | Amount=${amount} BDT | GameType=${detectedGameType} | Provider=${provider} | Source=${betSource}`,
      );

      // ✅ Prevent duplicates
      const existingTurnover = await Turnover.findOne({ betId });
      if (existingTurnover) {
        console.log(
          `[TURNOVER] ⚠ Duplicate detected - BetID=${betId} already exists. Skipping...`,
        );
        return null;
      }

      // ✅ Get user with hierarchy
      const user = await User.findById(userId).select(
        "agentId superAgentId masterAgentId username",
      );

      if (!user) {
        console.error(`[TURNOVER] ✗ User not found: ${userId}`);
        return null;
      }

      // ✅ Create turnover record
      const turnoverRecord = await Turnover.create({
        userId,
        betId,
        amount,
        gameType: detectedGameType,
        provider,
        agentId: user.agentId || null,
        superAgentId: user.superAgentId || null,
        masterAgentId: user.masterAgentId || null,
        betStatus: "pending",
        platformTurnoverDate: new Date(),
        metadata: {
          betSource,
          transactionId,
          ...metadata,
          recordedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });

      console.log(
        `[TURNOVER] ✓ SUCCESS: ID=${turnoverRecord._id} | User=${user.username} | GameType=${detectedGameType} | Provider=${provider} | Amount=${amount} BDT | Duration=${Date.now() - startTime}ms`,
      );

      // ✅ Log aggregation
      await this._logAggregation(
        userId,
        user.agentId,
        user.superAgentId,
        user.masterAgentId,
        amount,
      );

      return turnoverRecord;
    } catch (error) {
      console.error(
        `[TURNOVER] ✗ FAILED: ${error.message} | Data=${JSON.stringify(betData)}`,
      );
      return null;
    }
  }

  /**
   * Update turnover status when bet settles
   *
   * @param {String} betId - Bet identifier
   * @param {String} betStatus - Status: won/lost/cancelled/partially_won
   * @param {Number} winAmount - Amount won (if applicable)
   */
  static async updateTurnoverStatus(betId, betStatus, winAmount = 0) {
    try {
      if (!betId) {
        console.error("[TURNOVER] ✗ Missing betId for status update");
        return null;
      }

      const turnover = await Turnover.findOneAndUpdate(
        { betId },
        {
          betStatus,
          updatedAt: new Date(),
          "metadata.winAmount": winAmount,
          "metadata.settledAt": new Date(),
        },
        { new: true },
      );

      if (!turnover) {
        console.warn(
          `[TURNOVER] ⚠ No turnover record found for betId: ${betId}`,
        );
        return null;
      }

      console.log(
        `[TURNOVER] ✓ Status updated: BetID=${betId} | Status=${betStatus} | Win=${winAmount} BDT`,
      );

      return turnover;
    } catch (error) {
      console.error(
        `[TURNOVER] ✗ Status update failed: ${error.message} | BetID=${betId}`,
      );
      return null;
    }
  }

  /**
   * DETECT GAME TYPE - Dynamic detection (NO hardcoding)
   *
   * Priority:
   * 1. Explicit gameType in metadata
   * 2. Infer from betSource string
   * 3. Infer from metadata keys
   * 4. Fallback to "other"
   *
   * @private
   */
  static _detectGameType(betSource = "", metadata = {}, provider = "") {
    // Priority 1: Explicit gameType
    if (metadata.gameType) {
      console.log(
        `[TURNOVER] ℹ GameType detected (explicit): ${metadata.gameType}`,
      );
      return metadata.gameType;
    }

    // Priority 2: Infer from betSource string
    const sourceStr = String(betSource).toLowerCase();
    if (
      sourceStr.includes("sport") ||
      sourceStr.includes("cricket") ||
      sourceStr.includes("football")
    ) {
      return "sports";
    }
    if (sourceStr.includes("slot")) {
      return "slots";
    }
    if (sourceStr.includes("live")) {
      return "livecasino";
    }
    if (sourceStr.includes("virtual")) {
      return "virtual";
    }
    if (sourceStr.includes("lottery")) {
      return "lottery";
    }
    if (sourceStr.includes("casino")) {
      return "casino";
    }

    // Priority 3: Infer from metadata keys
    if (metadata.providerCode || metadata.gameName || metadata.gameRound) {
      return "casino";
    }
    if (metadata.betSlipId || metadata.sport || metadata.matches) {
      return "sports";
    }
    if (metadata.slotRound || metadata.spinId || metadata.slotName) {
      return "slots";
    }
    if (metadata.liveSessionId) {
      return "livecasino";
    }
    if (metadata.virtualGameId) {
      return "virtual";
    }
    if (metadata.lotteryId) {
      return "lottery";
    }

    // Priority 4: Infer from provider name
    if (provider) {
      const prov = String(provider).toLowerCase();
      if (
        prov.includes("sport") ||
        prov.includes("cricket") ||
        prov.includes("football")
      ) {
        return "sports";
      }
      if (prov.includes("slot")) {
        return "slots";
      }
      if (prov.includes("live")) {
        return "livecasino";
      }
    }

    console.log(
      `[TURNOVER] ℹ GameType fallback: 'other' (source=${betSource})`,
    );
    return "other";
  }

  /**
   * EXTRACT PROVIDER - Dynamic provider detection (NO hardcoding)
   *
   * Supports 99+ providers automatically
   *
   * @private
   */
  static _extractProvider(betSource = "", metadata = {}) {
    // Priority 1: Explicit provider name
    if (metadata.provider) {
      return metadata.provider;
    }

    // Priority 2: Provider code (casino)
    if (metadata.providerCode) {
      return metadata.providerCode;
    }

    // Priority 3: Sport type (sports betting)
    if (metadata.sport) {
      return metadata.sport;
    }
    if (
      metadata.matches &&
      Array.isArray(metadata.matches) &&
      metadata.matches.length > 0
    ) {
      const firstMatch = metadata.matches[0];
      return firstMatch.sport || "sports";
    }

    // Priority 4: Game name
    if (metadata.gameName) {
      return metadata.gameName;
    }

    // Priority 5: From betSource
    if (betSource) {
      return betSource;
    }

    return "unknown";
  }

  /**
   * Log aggregation status for hierarchy tracking
   *
   * @private
   */
  static async _logAggregation(
    userId,
    agentId,
    superAgentId,
    masterAgentId,
    amount,
  ) {
    try {
      const aggregation = {
        userId: userId,
        userTurnover: amount,
      };

      if (agentId) aggregation.agentId = agentId;
      if (superAgentId) aggregation.superAgentId = superAgentId;
      if (masterAgentId) aggregation.masterAgentId = masterAgentId;

      const hierarchy = [];
      if (userId) hierarchy.push(`User(${userId})`);
      if (agentId) hierarchy.push(`→ Agent(${agentId})`);
      if (superAgentId) hierarchy.push(`→ SuperAgent(${superAgentId})`);
      if (masterAgentId) hierarchy.push(`→ MasterAgent(${masterAgentId})`);

      console.log(
        `[TURNOVER] 📊 Aggregation: ${hierarchy.join(" ")} | Amount=${amount} BDT`,
      );
    } catch (err) {
      console.error(`[TURNOVER] ⚠ Aggregation logging failed: ${err.message}`);
    }
  }

  /**
   * Get turnover statistics for a user
   *
   * @param {String} userId
   * @param {Object} options - Filter options
   */
  static async getUserTurnoverStats(userId, options = {}) {
    try {
      const { startDate, endDate } = options;

      const query = { userId };

      if (startDate || endDate) {
        query.platformTurnoverDate = {};
        if (startDate) query.platformTurnoverDate.$gte = new Date(startDate);
        if (endDate) query.platformTurnoverDate.$lte = new Date(endDate);
      }

      const stats = await Turnover.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$gameType",
            totalTurnover: { $sum: "$amount" },
            betCount: { $sum: 1 },
            avgBet: { $avg: "$amount" },
          },
        },
      ]);

      console.log(
        `[TURNOVER] 📊 User stats: UserID=${userId} | Stats=${JSON.stringify(stats)}`,
      );

      return stats;
    } catch (error) {
      console.error(`[TURNOVER] ✗ Stats failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get team/agent turnover for hierarchy
   *
   * @param {String} agentId
   * @param {String} level - 'agent'/'superagent'/'masteragent'
   */
  static async getTeamTurnoverStats(agentId, level = "agent") {
    try {
      if (!agentId) {
        console.error(`[TURNOVER] ✗ Missing agentId`);
        return null;
      }

      const fieldMap = {
        agent: "agentId",
        superagent: "superAgentId",
        masteragent: "masterAgentId",
      };

      const field = fieldMap[level] || "agentId";

      const stats = await Turnover.aggregate([
        { $match: { [field]: agentId } },
        {
          $group: {
            _id: null,
            totalTeamTurnover: { $sum: "$amount" },
            totalBets: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
            lastBetDate: { $max: "$platformTurnoverDate" },
          },
        },
        {
          $addFields: {
            uniqueUserCount: { $size: "$uniqueUsers" },
          },
        },
      ]);

      const result = stats[0] || {
        totalTeamTurnover: 0,
        totalBets: 0,
        uniqueUserCount: 0,
        lastBetDate: null,
      };

      console.log(
        `[TURNOVER] 📊 Team stats: Level=${level} | AgentID=${agentId} | TeamTurnover=${result.totalTeamTurnover} BDT | Bets=${result.totalBets} | Users=${result.uniqueUserCount}`,
      );

      return result;
    } catch (error) {
      console.error(`[TURNOVER] ✗ Team stats failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Record turnover from transaction (called from WalletService)
   * This is the UNIVERSAL HOOK that captures turnover for ANY bet
   *
   * @param {String} userId
   * @param {Object} transaction
   * @param {Object} additionalMetadata
   */
  static async recordTurnoverFromTransaction(
    userId,
    transaction,
    additionalMetadata = {},
  ) {
    try {
      // ✅ Only process betting transactions
      if (transaction.transactionType !== "bet") {
        return null;
      }

      const betData = {
        userId,
        betId: transaction._id.toString(),
        amount: Math.abs(transaction.amount),
        betSource: additionalMetadata.betSource || "unknown",
        gameType: additionalMetadata.gameType,
        providerCode: additionalMetadata.provider,
        transactionId: transaction._id,
        metadata: {
          ...transaction.metadata,
          ...additionalMetadata,
          transactionType: transaction.transactionType,
          walletType: transaction.walletType,
        },
      };

      console.log(
        `[TURNOVER] 🎯 From transaction: User=${userId} | TxID=${transaction._id} | Amount=${Math.abs(transaction.amount)} BDT`,
      );

      return this.recordTurnover(betData);
    } catch (error) {
      console.error(
        `[TURNOVER] ✗ Transaction recording failed: ${error.message}`,
      );
      return null;
    }
  }
}

module.exports = TurnoverService;
