const mongoose = require("mongoose");
const BettingHistory = require("../models/BettingHistory");
const QueueJobLedger = require("../models/QueueJobLedger");
const Game = require("../models/Game");
const TurnoverTrackingService = require("./turnoverTrackingService");
const GGRService = require("./GGRService");
const affiliateTrackingService = require("./affiliateTrackingService");
const referralService = require("./referralService");
const logger = require("../utils/logger");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function markCompletedOnce(queueName, jobKey, session = null) {
  try {
    const options = session ? { session } : {};
    await QueueJobLedger.create(
      [
        {
          queueName,
          jobKey,
          status: "completed",
        },
      ],
      options,
    );
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
}

async function getGame(gameId, gameCode = null) {
  if (gameId) {
    try {
      if (mongoose.Types.ObjectId.isValid(gameId)) {
        const game = await Game.findById(gameId).lean();
        if (game) return game;
      }
    } catch {}
  }
  if (gameCode) {
    try {
      const game = await Game.findOne({ game_code: String(gameCode) }).lean();
      if (game) return game;
    } catch {}
  }
  return null;
}

function buildHistoryDocument(payload, fullGame) {
  const status = payload.status || "unsettled";
  const settledAt = payload.settledAt
    ? new Date(payload.settledAt)
    : status === "settled"
      ? new Date()
      : null;

  return {
    user: payload.userId,
    gameSession: payload.gameSessionId,
    game: payload.gameId || fullGame?._id,
    provider: fullGame?.brand || payload.provider || "Unknown",
    category: fullGame?.category || payload.category || "Slot",
    gameName: fullGame?.game_name || payload.gameName || "Unknown Game",
    providerGameCode: payload.providerGameCode,
    gameRound: payload.gameRound,
    status,
    betAmount: payload.bet,
    winAmount: payload.win,
    netResult:
      payload.netResult !== undefined
        ? payload.netResult
        : r2(payload.win - payload.bet),
    turnoverAmount:
      payload.turnoverAmount !== undefined
        ? payload.turnoverAmount
        : payload.bet,
    currency: payload.currency || "BDT",
    isFreeSpin: payload.isFreeSpin || false,
    isBonusBet: payload.isBonusBet || false,
    startBalance: payload.startBalance,
    endBalance: payload.endBalance,
    playedAt: payload.playedAt ? new Date(payload.playedAt) : new Date(),
    settledAt,
    metadata: {
      providerSessionId: payload.providerSessionId,
      sessionId: String(payload.gameSessionId),
      symbol: payload.symbol,
      gameUid: payload.gameUid || payload.providerGameCode,
      ...(payload.metadata || {}),
    },
  };
}

async function createBettingHistory(payload) {
  if (!payload.gameRound) return { skipped: true };

  const fullGame = await getGame(payload.gameId, payload.providerGameCode);
  const doc = buildHistoryDocument(payload, fullGame);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const firstRun = await markCompletedOnce(
      "historyQueue",
      `history:${payload.idempotencyKey}`,
      session,
    );
    if (!firstRun) {
      await session.abortTransaction();
      return { duplicate: true };
    }

    await BettingHistory.create([doc], { session });
    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    if (error?.code === 11000) {
      return { duplicate: true };
    }
    throw error;
  } finally {
    session.endSession();
  }
}

async function recordTurnover(payload) {
  if (!(payload.bet > 0)) return { skipped: true };

  const alreadyDone = !(await markCompletedOnce(
    "turnoverQueue",
    `turnover:${payload.idempotencyKey}`,
  ));
  if (alreadyDone) return { duplicate: true };

  const fullGame = (await getGame(
    payload.gameId,
    payload.providerGameCode,
  )) || {
    brand: "9wickets",
    category: "Sports",
    game_name: "9Wicket",
    game_code: payload.providerGameCode || "11539",
  };
  const result = await TurnoverTrackingService.recordBet(
    payload.userId,
    fullGame,
    payload.bet,
  );

  affiliateTrackingService
    .recordTurnoverChanged(payload.userId)
    .catch((error) => {
      logger.error("Affiliate turnover tracking failed", {
        user: payload.userId?.toString(),
        error: error.message,
      });
    });
  referralService.recordTurnoverChanged(payload.userId).catch((error) => {
    logger.error("Referral turnover tracking failed", {
      user: payload.userId?.toString(),
      error: error.message,
    });
  });
  referralService
    .recordReferralTurnover(payload.userId, payload.bet, {
      source:
        payload.source ||
        (fullGame?.category?.toLowerCase() === "sports" ? "sports" : "casino"),
      gameId: payload.gameId || fullGame?._id,
      gameRound: payload.gameRound,
      idempotencyKey: payload.idempotencyKey,
    })
    .catch((error) => {
      logger.error("Referral claim turnover update failed", {
        user: payload.userId?.toString(),
        error: error.message,
      });
    });

  return result;
}

async function processGGR(payload) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const firstRun = await markCompletedOnce(
      "ggrQueue",
      `ggr:${payload.idempotencyKey}`,
      session,
    );
    if (!firstRun) {
      await session.abortTransaction();
      return { duplicate: true };
    }

    await GGRService.processGameResult(
      {
        betAmount: payload.bet,
        winAmount: payload.win,
      },
      { session },
    );

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function processPromotion(payload) {
  const alreadyDone = !(await markCompletedOnce(
    "promotionQueue",
    `promotion:${payload.idempotencyKey}`,
  ));
  if (alreadyDone) return { duplicate: true };

  return {
    success: true,
    message:
      "Promotion progress is handled by turnover tracking to preserve existing behavior",
  };
}

async function recordAnalytics(payload) {
  const alreadyDone = !(await markCompletedOnce(
    "analyticsQueue",
    `analytics:${payload.idempotencyKey}`,
  ));
  if (alreadyDone) return { duplicate: true };
  return { success: true };
}

async function processInline(payload) {
  try {
    await processGGR(payload);
    await createBettingHistory(payload);
    if (payload.bet > 0) {
      await recordTurnover(payload);
      await processPromotion(payload);
    }
    await recordAnalytics(payload);
  } catch (error) {
    logger.error("[CALLBACK_SIDE_EFFECTS] inline processing failed", {
      idempotencyKey: payload.idempotencyKey,
      message: error.message,
    });
  }
}

module.exports = {
  createBettingHistory,
  recordTurnover,
  processGGR,
  processPromotion,
  recordAnalytics,
  processInline,
  buildHistoryDocument,
};
