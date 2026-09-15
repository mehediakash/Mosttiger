const mongoose = require("mongoose");
const axios = require("axios");
const EncryptionUtil = require("../utils/encryption");
const GameSession = require("../models/GameSession");
const WalletService = require("./walletService");
const https = require("https");
const SessionCache = require("./cache/sessionCacheManager");
const WalletCache = require("./cache/walletCacheManager");
const DuplicateCallback = require("./cache/duplicateCallbackManager");
const RedisLock = require("./cache/redisLockManager");
const { enqueueCallbackJobs } = require("../queues/callbackQueues");
const logger = require("../utils/logger");

const providerClient = axios.create({
  timeout: 5000,
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 20,
  }),
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  },
});

// Round to 2 decimal places — prevents float drift (e.g. 44.44999999999999)
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

class IGamingService {
  constructor() {
    this.apiToken = process.env.IGAMING_API_TOKEN;
    this.baseUrl = process.env.IGAMING_API_URL;
    this.encryptionUtil = new EncryptionUtil(process.env.ENCRYPTION_KEY);

    // Game detail cache — 5 min TTL, avoids repeated DB hits per callback
    this.gameCache = new Map();
    this.gameCacheTTL = 5 * 60 * 1000;
  }

  // ── Game cache lookup ──────────────────────────────────────────────────────
  async getGameSafe(gameId) {
    if (!gameId) return null;
    const key = String(gameId);
    const cached = this.gameCache.get(key);
    if (cached) return cached;

    try {
      const Game = require("../models/Game");
      const game = await Game.findById(gameId).lean();
      if (game) {
        this.gameCache.set(key, game);
        setTimeout(() => this.gameCache.delete(key), this.gameCacheTTL);
      }
      return game;
    } catch {
      return null;
    }
  }

  // ── Launch a casino game ───────────────────────────────────────────────────
  async launchGame(user, game, options = {}) {
    try {
      const providerGameCode = String(game.game_code).trim();
      const returnUrl = `${process.env.CLIENT_URL}/casino`;
      const callbackUrl = `${process.env.BASE_URL}/api/games/callback`;

      // 1. ALWAYS USE WALLET AS BALANCE SOURCE
      const wallet = await WalletService.getWalletBalance(user._id);
      const balanceToSend = r2(wallet.main || 0);
      await WalletCache.setBalance(user._id, { main: balanceToSend });

      // 2. BUILD PAYLOAD
      const payload = {
        user_id: String(user.userId),
        balance: String(balanceToSend),
        game_uid: String(providerGameCode),
        token: this.apiToken,
        timestamp: Date.now(),
        return: returnUrl,
        callback: callbackUrl,
        currency_code: "BDT",
        language: "en",
      };

      // 3. ENCRYPT PAYLOAD
      const encrypted = this.encryptionUtil.encryptPayload(payload);
      const launchUrl = `${this.baseUrl}?payload=${encodeURIComponent(encrypted)}&token=${this.apiToken}`;

      // 4. CALL PROVIDER API
      const response = await providerClient.get(launchUrl);

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || "Launch failed");
      }

      const gameUrl = response.data.data.url;

      // 5. EXTRACT SESSION ID FROM PROVIDER URL
      // Provider URL format: https://...?ssoKey=XXXX&lang=en-US&...
      let urlParams;
      try {
        urlParams = new URL(gameUrl).searchParams;
      } catch {
        urlParams = new URLSearchParams(gameUrl.split("?")[1] || "");
      }
      const sessionId =
        urlParams.get("ssoKey") ||
        urlParams.get("id") ||
        `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 6. CLOSE PREVIOUS ACTIVE SESSIONS FOR THIS USER + GAME
      await GameSession.updateMany(
        { user: user._id, providerGameCode, status: "active" },
        { status: "closed", endedAt: new Date() },
      );

      // 7. CREATE FRESH SESSION — store memberAccount for safe callback lookup
      const createdSession = await GameSession.create({
        user: user._id,
        game: game._id,
        memberAccount: String(user.userId),
        gameUid:
          `GS${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
        providerGameCode,
        providerSessionId: sessionId,
        status: "active",
        startBalance: balanceToSend,
        endBalance: balanceToSend,
        betAmount: 0,
        winAmount: 0,
        currency: "BDT",
        language: "en",
        returnUrl,
        callbackUrl,
        providerData: response.data,
      });

      await SessionCache.storeSession(createdSession);

      return { success: true, gameUrl, balanceSent: balanceToSend };
    } catch (error) {
      throw error;
    }
  }

  // ── Handle provider game callback ──────────────────────────────────────────
  async handleGameCallback(callbackData) {
    let gameSession = null;
    let duplicateReservation = null;
    let roundLock = null;
    const startedAt = process.hrtime.bigint();
    let lastMark = startedAt;
    const perfEnabled = process.env.CALLBACK_PERF_LOG !== "false";

    const elapsedMs = (from = startedAt) =>
      Number(process.hrtime.bigint() - from) / 1e6;

    const mark = (label) => {
      if (!perfEnabled) return;
      const now = process.hrtime.bigint();
      logger.info(`[CALLBACK_PERF] ${label}: ${Number(now - lastMark) / 1e6}ms`);
      lastMark = now;
    };

    const buildProviderBalanceResponse = async (preferredBalance = null) => {
      if (preferredBalance !== null && preferredBalance !== undefined) {
        return {
          credit_amount: r2(preferredBalance),
          timestamp: Date.now(),
        };
      }

      if (!gameSession?.userId && !gameSession?.user) {
        return { credit_amount: -1, error: "Failed" };
      }

      const wallet = await WalletCache.getBalance(
        gameSession.userId || gameSession.user,
      );
      return {
        credit_amount: r2(wallet?.main || 0),
        timestamp: Date.now(),
      };
    };

    try {
      const { game_uid, game_round, bet_amount, win_amount, game_name } =
        callbackData;
      const callbackReceivedAt = new Date();

      const callbackSessionId =
        callbackData.session_id ||
        callbackData.sessionId ||
        callbackData.providerSessionId ||
        callbackData.provider_session_id ||
        callbackData.data?.session_id ||
        callbackData.data?.sessionId ||
        null;

      const memberAccount = callbackData.member_account || null;

      // Round immediately - prevents float drift in all downstream math.
      const bet = r2(Number(bet_amount) || 0);
      const win = r2(Number(win_amount) || 0);

      gameSession = await SessionCache.findActiveSession({
        providerSessionId: callbackSessionId,
        providerGameCode: game_uid,
        memberAccount: memberAccount ? String(memberAccount) : null,
      });
      mark("Session lookup");

      if (!gameSession) throw new Error("Game session not found");

      const userId = gameSession.userId || gameSession.user;
      const effectiveGameRound = game_round
        ? String(game_round)
        : gameSession.gameRound;

      roundLock = await RedisLock.acquireRoundLock(effectiveGameRound);
      if (!roundLock.acquired) {
        mark("Redis round lock");
        const response = await buildProviderBalanceResponse();
        mark("Response build");
        logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
        return response;
      }
      mark("Redis round lock");

      duplicateReservation = await DuplicateCallback.acquire({
        gameRound: game_round,
        bet,
        win,
      });
      mark("Duplicate lock");

      if (duplicateReservation.redisAvailable && !duplicateReservation.acquired) {
        const response = await buildProviderBalanceResponse();
        mark("Response build");
        logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
        return response;
      }

      if (!duplicateReservation.redisAvailable) {
        const exists = await DuplicateCallback.existsInMongo({
          userId,
          gameRound: game_round,
          bet,
          win,
        });

        if (exists) {
          mark("Duplicate Mongo fallback");
          const response = await buildProviderBalanceResponse();
          mark("Response build");
          logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
          return response;
        }
        mark("Duplicate Mongo fallback");
      }

      const netChange = r2(win - bet);
      let walletUpdateResult = null;
      let realBalance = null;

      if (netChange !== 0) {
        const walletSession = await mongoose.startSession();
        try {
          walletSession.startTransaction();
          walletUpdateResult = await WalletService.updateWallet(
            userId,
            netChange,
            "main",
            netChange > 0 ? "win" : "bet",
            {
              gameRound: game_round,
              gameName: game_name,
              betAmount: bet,
              winAmount: win,
            },
            walletSession,
          );
          await walletSession.commitTransaction();
          realBalance = r2(walletUpdateResult.newBalance);
          mark("Wallet update");
          await WalletCache.setBalance(userId, { main: realBalance });
          mark("Redis update");
        } catch (error) {
          await walletSession.abortTransaction();
          if (duplicateReservation?.key) {
            await DuplicateCallback.release(duplicateReservation.key);
          }
          throw error;
        } finally {
          walletSession.endSession();
        }
      } else {
        const wallet = await WalletCache.getBalance(userId);
        realBalance = r2(wallet.main || 0);
        mark("Wallet update");
        mark("Redis update");
      }

      const sessionPatch = {
        endBalance: realBalance,
        updatedAt: new Date(),
      };

      if (game_round && gameSession.gameRound !== String(game_round)) {
        sessionPatch.gameRound = String(game_round);
        gameSession.gameRound = String(game_round);
      }

      gameSession.endBalance = realBalance;

      GameSession.updateOne(
        { _id: gameSession.gameSessionId || gameSession._id },
        { $set: sessionPatch },
      ).catch((error) => {
        logger.error("[IGAMING] session balance update failed", {
          sessionId: gameSession.gameSessionId || gameSession._id,
          message: error.message,
        });
      });

      SessionCache.updateCachedSession(
        gameSession.providerSessionId || callbackSessionId,
        sessionPatch,
      ).catch((error) => {
        logger.warn("[IGAMING] session cache refresh failed", {
          sessionId: gameSession.gameSessionId || gameSession._id,
          message: error.message,
        });
      });

      const idempotencyKey =
        duplicateReservation?.key ||
        DuplicateCallback.duplicateKey({ gameRound: game_round, bet, win });

      const sideEffectPayload = {
        idempotencyKey,
        userId,
        gameSessionId: gameSession.gameSessionId || gameSession._id,
        gameId: gameSession.gameId || gameSession.game,
        providerGameCode: gameSession.providerGameCode,
        providerSessionId: gameSession.providerSessionId || callbackSessionId,
        gameRound: gameSession.gameRound,
        gameName: game_name,
        bet,
        win,
        currency: gameSession.currency || "BDT",
        startBalance: gameSession.startBalance,
        endBalance: realBalance,
        isFreeSpin: gameSession.isFreeSpin || false,
        isBonusBet: gameSession.isBonusBet || false,
        playedAt: callbackReceivedAt.toISOString(),
      };

      const enqueueStartedAt = process.hrtime.bigint();
      enqueueCallbackJobs(sideEffectPayload)
        .then((queued) => {
          logger.info(
            `[CALLBACK_PERF] Queue enqueue: ${elapsedMs(enqueueStartedAt)}ms`,
          );
          if (!queued) {
            logger.warn("[IGAMING] callback side-effect enqueue incomplete", {
              gameRound: sideEffectPayload.gameRound,
              gameSessionId: String(sideEffectPayload.gameSessionId),
            });
          }
        })
        .catch((error) => {
          logger.warn("[IGAMING] callback side-effect enqueue failed", {
            gameRound: sideEffectPayload.gameRound,
            gameSessionId: String(sideEffectPayload.gameSessionId),
            message: error.message,
          });
        });
      mark("Queue enqueue scheduled");

      const response = await buildProviderBalanceResponse(realBalance);
      mark("Response build");
      logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
      return response;
    } catch (err) {
      if (duplicateReservation?.key) {
        DuplicateCallback.release(duplicateReservation.key).catch((error) => {
          logger.warn("[IGAMING] duplicate callback release failed", {
            key: duplicateReservation.key,
            message: error.message,
          });
        });
      }

      if (gameSession?.userId || gameSession?.user) {
        try {
          const response = await buildProviderBalanceResponse();
          logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
          return response;
        } catch {}
      }
      logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
      return { credit_amount: -1, error: "Failed" }; // original: no timestamp
    } finally {
      RedisLock.release(roundLock).catch((error) => {
        logger.warn("[IGAMING] round lock release failed", {
          key: roundLock?.key,
          message: error.message,
        });
      });
    }
  }


  // ── User game history ──────────────────────────────────────────────────────
  async getUserGameHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      gameId,
      status,
      startDate,
      endDate,
    } = options;

    const query = { user: userId };
    if (gameId) query.game = gameId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Parallel fetch — sessions + count in one round-trip (perf keep)
    const [sessions, total] = await Promise.all([
      GameSession.find(query)
        .populate("game", "game_name brand category image_url")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((page - 1) * limit)
        .lean(),
      GameSession.countDocuments(query),
    ]);

    return {
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    };
  }

  // ── Active sessions ────────────────────────────────────────────────────────
  async getActiveSessions(userId) {
    return GameSession.find({ user: userId, status: "active" })
      .populate("game", "game_name brand category image_url")
      .sort({ createdAt: -1 })
      .lean(); // lean = ~40% less memory (perf keep)
  }
}

module.exports = new IGamingService();
