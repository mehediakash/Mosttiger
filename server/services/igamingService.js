const mongoose = require("mongoose");
const axios = require("axios");
const EncryptionUtil = require("../utils/encryption");
const GameSession = require("../models/GameSession");
const User = require("../models/User");
const WalletService = require("./walletService");
const https = require("https");
const SessionCache = require("./cache/sessionCacheManager");
const WalletCache = require("./cache/walletCacheManager");
const UserIdentityCache = require("./cache/userIdentityCacheManager");
const DuplicateCallback = require("./cache/duplicateCallbackManager");
const RedisLock = require("./cache/redisLockManager");
const Transaction = require("../models/Transaction");
const WalletReconciliationService = require("./walletReconciliationService");
const { enqueueCallbackJobs } = require("../queues/callbackQueues");
const { retryTransientTransaction } = require("../utils/mongoTransientRetry");
const logger = require("../utils/logger");

const PROVIDER_LAUNCH_TIMEOUT_MS = Number(
  process.env.IGAMING_LAUNCH_TIMEOUT_MS || 15000,
);

const providerClient = axios.create({
  timeout: PROVIDER_LAUNCH_TIMEOUT_MS,
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

function isTransientNetworkError(error) {
  if (!error) return false;

  // Never retry if a server response was received (e.g. 4xx, 5xx, or provider business response)
  if (error.response) return false;

  const code = error.code;
  const message = String(error.message || "").toLowerCase();

  // Axios/Node timeout errors
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return true;
  // Connection drops / DNS / reset errors
  if (code === "ECONNRESET" || code === "ENOTFOUND" || code === "EAI_AGAIN")
    return true;
  // Axios timeout message pattern
  if (message.includes("timeout")) return true;
  if (message.includes("network error") || message.includes("socket hang up"))
    return true;

  return false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchProviderLaunchWithRetry(client, launchUrl, context = {}) {
  const { gameCode, provider, userId } = context;
  const maxAttempts = 2;
  const retryDelayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();

    if (attempt === 1) {
      logger.info("[GAME_PROVIDER] launch request started", {
        gameCode,
        provider,
        attempt,
        userId,
      });
    } else {
      logger.info("[GAME_PROVIDER] retrying launch request", {
        gameCode,
        provider,
        attempt,
        userId,
        delayMs: retryDelayMs,
      });
    }

    try {
      const response = await client.get(launchUrl);
      const elapsedMs = Date.now() - startedAt;

      logger.info("[GAME_PROVIDER] launch request succeeded", {
        gameCode,
        provider,
        attempt,
        elapsedMs,
      });

      return response;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const errorCode =
        error.code ||
        (error.response ? `HTTP_${error.response.status}` : "NETWORK_ERROR");
      const isTransient = isTransientNetworkError(error);

      if (attempt < maxAttempts && isTransient) {
        logger.warn("[GAME_PROVIDER] launch request timeout", {
          gameCode,
          provider,
          attempt,
          elapsedMs,
          errorCode,
          message: error.message,
        });

        await sleep(retryDelayMs);
        continue;
      }

      if (attempt > 1) {
        logger.error("[GAME_PROVIDER] launch request failed after retry", {
          gameCode,
          provider,
          attempts: attempt,
          elapsedMs,
          errorCode,
          message: error.message,
        });
      } else {
        logger.error("[GAME_PROVIDER] launch request failed", {
          gameCode,
          provider,
          attempt,
          elapsedMs,
          errorCode,
          message: error.message,
        });
      }

      throw error;
    }
  }
}

// Round to 2 decimal places using central BDT poisha standard
const { roundBDT } = require("../utils/money");
const r2 = roundBDT;

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
      const response = await fetchProviderLaunchWithRetry(
        providerClient,
        launchUrl,
        {
          gameCode: providerGameCode,
          provider: game.brand || "Unknown",
          userId: String(user.userId || user._id),
        },
      );

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
    let userWalletLock = null;
    let userId = null;
    const startedAt = process.hrtime.bigint();
    let lastMark = startedAt;
    const perfEnabled = process.env.CALLBACK_PERF_LOG !== "false";

    const elapsedMs = (from = startedAt) =>
      Number(process.hrtime.bigint() - from) / 1e6;

    const mark = (label) => {
      if (!perfEnabled) return;
      const now = process.hrtime.bigint();
      logger.info(
        `[CALLBACK_PERF] ${label}: ${Number(now - lastMark) / 1e6}ms`,
      );
      lastMark = now;
    };

    const buildProviderBalanceResponse = async (preferredBalance = null) => {
      if (preferredBalance !== null && preferredBalance !== undefined) {
        return {
          credit_amount: r2(preferredBalance),
          timestamp: Date.now(),
        };
      }

      const targetUserId = userId || gameSession?.userId || gameSession?.user;
      if (!targetUserId) {
        return { credit_amount: -1, error: "Failed", timestamp: Date.now() };
      }

      const wallet = await WalletCache.getBalance(targetUserId);
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

      const rawMember =
        callbackData.member_account ??
        callbackData.memberAccount ??
        callbackData.data?.member_account ??
        callbackData.data?.memberAccount ??
        null;
      const memberAccount =
        rawMember !== null &&
        rawMember !== undefined &&
        String(rawMember).trim() !== ""
          ? String(rawMember).trim()
          : null;

      const serialNumber =
        callbackData.serial_number ||
        callbackData.serialNumber ||
        callbackData.data?.serial_number ||
        callbackData.data?.serialNumber ||
        null;

      const effectiveGameUid =
        game_uid ||
        callbackData.game_code ||
        callbackData.gameCode ||
        callbackData.gameUid ||
        callbackData.game_id ||
        callbackData.data?.game_uid ||
        callbackData.data?.game_code ||
        null;

      const providerCreditAmount =
        WalletReconciliationService.extractProviderCreditAmount(callbackData);

      // Round immediately - prevents float drift in all downstream math.
      const bet = r2(Number(bet_amount) || 0);
      const win = r2(Number(win_amount) || 0);

      // If callback explicitly provides a session ID, validate that it matches
      if (callbackSessionId) {
        const sessionById = await GameSession.findOne({
          providerSessionId: String(callbackSessionId).trim(),
        }).lean();
        if (sessionById) {
          if (
            (effectiveGameUid &&
              sessionById.providerGameCode &&
              sessionById.providerGameCode !== effectiveGameUid) ||
            (memberAccount &&
              sessionById.memberAccount &&
              sessionById.memberAccount !== memberAccount)
          ) {
            logger.warn(
              "[SESSION_LOOKUP] providerSessionId matched but providerGameCode or memberAccount mismatched",
              {
                expectedGame: sessionById.providerGameCode,
                actualGame: effectiveGameUid,
                expectedMember: sessionById.memberAccount,
                actualMember: memberAccount,
              },
            );
            throw new Error("Game session not found");
          }
        }
      }

      // 1. Resolve player identity directly from member_account (SoftAPI standard)
      let user = null;
      if (memberAccount) {
        user = await UserIdentityCache.resolveUserIdentity(memberAccount);
      }

      // 2. Optional GameSession lookup - contextual enrichment only.
      // A missing, closed, or ambiguous GameSession MUST NOT block wallet callback execution.
      gameSession = await SessionCache.findActiveSession({
        providerSessionId: callbackSessionId,
        providerGameCode: effectiveGameUid || game_uid,
        memberAccount: memberAccount,
        gameRound: game_round ? String(game_round) : null,
      }).catch((sessionErr) => {
        logger.warn("[IGAMING] Optional session lookup failed", {
          message: sessionErr.message,
          memberAccount,
          gameRound: game_round,
        });
        return null;
      });
      mark("Session lookup");

      // Fallback: If user was not resolved by memberAccount alone, check if session was resolved deterministically
      if (!user && gameSession) {
        const sessionUserId = gameSession.userId || gameSession.user;
        if (sessionUserId) {
          user = await User.findById(sessionUserId).lean();
        }
      }

      // If player cannot be identified, fail safely without wallet mutation
      if (!user) {
        throw new Error("Game session not found");
      }

      userId = user._id;
      const effectiveGameRound = game_round
        ? String(game_round)
        : gameSession?.gameRound || null;

      logger.info("[CALLBACK_SESSION_OPTIONAL]", {
        userId: String(userId),
        memberAccount,
        sessionResolved: Boolean(gameSession),
        sessionId: gameSession
          ? String(gameSession.gameSessionId || gameSession._id)
          : null,
        sessionStatus: gameSession?.status || null,
        providerGameCode: effectiveGameUid || game_uid,
        gameRound: effectiveGameRound,
        serialNumber: serialNumber ? String(serialNumber) : null,
      });

      userWalletLock = await RedisLock.acquireUserWalletLock({
        userId,
      });

      logger.info("[CALLBACK_WALLET_LOCK]", {
        userId: String(userId),
        gameRound: effectiveGameRound,
        serialNumber: serialNumber ? String(serialNumber) : null,
        lockKey: userWalletLock?.key,
        acquired: userWalletLock?.acquired,
        redisAvailable: userWalletLock?.redisAvailable,
      });

      if (!userWalletLock?.acquired) {
        mark("User wallet lock timeout");
        logger.error("[CALLBACK_LOCK] User wallet lock acquisition timed out", {
          userId: String(userId),
          gameRound: effectiveGameRound,
          serialNumber: serialNumber ? String(serialNumber) : null,
        });
        return { credit_amount: -1, error: "Failed", timestamp: Date.now() };
      }
      mark("User wallet lock");

      duplicateReservation = await DuplicateCallback.acquire({
        serialNumber,
        userId,
        gameRound: game_round,
        bet,
        win,
      });
      mark("Duplicate lock");

      const isRedisDuplicate =
        duplicateReservation.redisAvailable && !duplicateReservation.acquired;

      let isMongoDuplicate = false;
      if (!duplicateReservation.redisAvailable) {
        isMongoDuplicate = await DuplicateCallback.existsInMongo({
          serialNumber,
          userId,
          gameRound: game_round,
          bet,
          win,
        });
        mark("Duplicate Mongo fallback");
      }

      const isDuplicate = isRedisDuplicate || isMongoDuplicate;

      logger.info("[CALLBACK_IDEMPOTENCY]", {
        userId: String(userId),
        gameRound: game_round ? String(game_round) : null,
        serialNumber: serialNumber ? String(serialNumber) : null,
        duplicate: isDuplicate,
      });

      if (isDuplicate) {
        const response = await buildProviderBalanceResponse();
        mark("Response build");
        logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
        return response;
      }

      const netChange = r2(win - bet);
      let walletUpdateResult = null;
      let realBalance = null;

      if (netChange !== 0) {
        walletUpdateResult = await retryTransientTransaction(
          async () => {
            const walletSession = await mongoose.startSession();
            try {
              walletSession.startTransaction();
              const updateResult = await WalletService.updateWallet(
                userId,
                netChange,
                "main",
                netChange > 0 ? "win" : "bet",
                {
                  gameRound: game_round,
                  gameName: game_name,
                  betAmount: bet,
                  winAmount: win,
                  serialNumber,
                },
                walletSession,
              );
              await walletSession.commitTransaction();
              return updateResult;
            } catch (error) {
              if (walletSession.inTransaction()) {
                await walletSession.abortTransaction().catch(() => {});
              }
              throw error;
            } finally {
              await walletSession.endSession();
            }
          },
          {
            label: `wallet-update:${userId}`,
          },
        );

        realBalance = r2(walletUpdateResult.newBalance);
        mark("Wallet update");
        await WalletCache.setBalance(userId, { main: realBalance });
        mark("Redis update");
      } else {
        const wallet = await WalletCache.getBalance(userId);
        realBalance = r2(wallet.main || 0);
        mark("Wallet update");
        mark("Redis update");
      }

      const walletBefore = walletUpdateResult
        ? walletUpdateResult.previousBalance
        : realBalance;
      const walletAfter = realBalance;

      const reconciliationReport = await WalletReconciliationService.reconcile({
        userId,
        gameRound: effectiveGameRound,
        serialNumber,
        providerCreditAmount,
        walletBefore,
        walletAfter,
        transactionId: walletUpdateResult?.transactionId || null,
        sessionStartTime: gameSession?.createdAt || null,
      });

      if (walletUpdateResult?.transactionId) {
        Transaction.updateOne(
          { _id: walletUpdateResult.transactionId },
          { $set: { "metadata.reconciliation": reconciliationReport } },
        ).catch((err) => {
          logger.warn(
            "[WALLET_RECONCILIATION] Failed to update transaction metadata",
            {
              transactionId: walletUpdateResult.transactionId,
              message: err.message,
            },
          );
        });
      }

      if (gameSession) {
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
      }

      const idempotencyKey =
        duplicateReservation?.key ||
        DuplicateCallback.duplicateKey({
          serialNumber,
          userId,
          gameRound: effectiveGameRound,
          bet,
          win,
        });

      const sideEffectPayload = {
        idempotencyKey,
        userId,
        gameSessionId: gameSession
          ? gameSession.gameSessionId || gameSession._id
          : null,
        gameId: gameSession?.gameId || gameSession?.game || null,
        providerGameCode:
          effectiveGameUid || game_uid || gameSession?.providerGameCode || null,
        providerSessionId:
          gameSession?.providerSessionId || callbackSessionId || null,
        gameRound: effectiveGameRound,
        gameName: game_name || null,
        bet,
        win,
        currency: gameSession?.currency || "BDT",
        startBalance: gameSession?.startBalance ?? walletBefore,
        endBalance: realBalance,
        isFreeSpin: gameSession?.isFreeSpin || false,
        isBonusBet: gameSession?.isBonusBet || false,
        status: "settled",
        settledAt: callbackReceivedAt.toISOString(),
        playedAt: callbackReceivedAt.toISOString(),
        metadata: {
          serialNumber: serialNumber ? String(serialNumber) : null,
          reconciliation: reconciliationReport,
        },
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
              gameSessionId: sideEffectPayload.gameSessionId
                ? String(sideEffectPayload.gameSessionId)
                : null,
            });
          }
        })
        .catch((error) => {
          logger.warn("[IGAMING] callback side-effect enqueue failed", {
            gameRound: sideEffectPayload.gameRound,
            gameSessionId: sideEffectPayload.gameSessionId
              ? String(sideEffectPayload.gameSessionId)
              : null,
            message: error.message,
          });
        });
      mark("Queue enqueue scheduled");

      const response = await buildProviderBalanceResponse(realBalance);
      mark("Response build");
      logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
      return response;
    } catch (err) {
      if (duplicateReservation?.key && duplicateReservation?.acquired) {
        try {
          await DuplicateCallback.release(duplicateReservation.key);
        } catch (releaseErr) {
          logger.warn("[IGAMING] duplicate callback release failed", {
            key: duplicateReservation.key,
            message: releaseErr.message,
          });
        }
      }

      const effectiveUserId =
        userId || gameSession?.userId || gameSession?.user || null;
      const effectiveGameRound = callbackData?.game_round
        ? String(callbackData.game_round)
        : gameSession?.gameRound || null;
      const effectiveSerialNumber =
        callbackData?.serial_number ||
        callbackData?.serialNumber ||
        callbackData?.data?.serial_number ||
        callbackData?.data?.serialNumber ||
        null;

      logger.error(
        "[IGAMING_CALLBACK_FAILED] Wallet callback processing failed",
        {
          userId: effectiveUserId ? String(effectiveUserId) : null,
          gameRound: effectiveGameRound,
          serialNumber: effectiveSerialNumber
            ? String(effectiveSerialNumber)
            : null,
          error: err.message,
          providerNotified: true,
        },
      );

      logger.info(`[CALLBACK_PERF] TOTAL CALLBACK: ${elapsedMs()}ms`);
      return {
        credit_amount: -1,
        error: err.message || "Failed",
        timestamp: Date.now(),
      };
    } finally {
      if (userWalletLock) {
        try {
          await RedisLock.releaseUserWalletLock(userWalletLock);
        } catch (error) {
          logger.warn("[IGAMING] user wallet lock release failed", {
            key: userWalletLock?.key,
            message: error.message,
          });
        }
      }
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

const igamingService = new IGamingService();
igamingService._isTransientNetworkError = isTransientNetworkError;
igamingService._fetchProviderLaunchWithRetry = fetchProviderLaunchWithRetry;
igamingService._providerClient = providerClient;

module.exports = igamingService;
