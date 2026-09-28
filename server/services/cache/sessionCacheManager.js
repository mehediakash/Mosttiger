const GameSession = require("../../models/GameSession");
const redis = require("../redisService");
const logger = require("../../utils/logger");

const SESSION_TTL_SECONDS = Number(
  process.env.GAME_SESSION_CACHE_TTL_SECONDS || 7200,
);

function normalizeSession(session) {
  if (!session) return null;

  return {
    _id: String(session._id || session.gameSessionId),
    gameSessionId: String(session._id || session.gameSessionId),
    user: String(session.user || session.userId),
    userId: String(session.user || session.userId),
    game: String(session.game || session.gameId),
    gameId: String(session.game || session.gameId),
    memberAccount: session.memberAccount ? String(session.memberAccount) : null,
    providerGameCode: session.providerGameCode
      ? String(session.providerGameCode)
      : null,
    providerSessionId: session.providerSessionId
      ? String(session.providerSessionId)
      : null,
    gameRound: session.gameRound || null,
    currency: session.currency || "BDT",
    startBalance: Number(session.startBalance || 0),
    endBalance: session.endBalance,
    isFreeSpin: Boolean(session.isFreeSpin || false),
    isBonusBet: Boolean(session.isBonusBet || false),
    status: session.status || "active",
  };
}

function toCachePayload(session) {
  const normalized = normalizeSession(session);
  if (!normalized) return null;

  return {
    gameSessionId: normalized.gameSessionId,
    userId: normalized.userId,
    gameId: normalized.gameId,
    memberAccount: normalized.memberAccount,
    providerGameCode: normalized.providerGameCode,
    providerSessionId: normalized.providerSessionId,
    gameRound: normalized.gameRound,
    currency: normalized.currency,
    startBalance: normalized.startBalance,
    endBalance: normalized.endBalance,
    isFreeSpin: normalized.isFreeSpin,
    isBonusBet: normalized.isBonusBet,
    status: normalized.status,
  };
}

function sessionKey(providerSessionId) {
  return `session:${providerSessionId}`;
}

function memberGameKey(providerGameCode, memberAccount) {
  return `session-member:${providerGameCode}:${memberAccount}`;
}

async function storeSession(session) {
  const payload = toCachePayload(session);
  if (!payload?.providerSessionId) return;

  await redis.setJSON(
    sessionKey(payload.providerSessionId),
    payload,
    SESSION_TTL_SECONDS,
  );

  // ONLY active sessions may populate the member-game cache pointer.
  // Closed/completed sessions must never overwrite an active session pointer.
  if (
    payload.status === "active" &&
    payload.providerGameCode &&
    payload.memberAccount
  ) {
    await redis.setJSON(
      memberGameKey(payload.providerGameCode, payload.memberAccount),
      payload,
      SESSION_TTL_SECONDS,
    );
  }
}

async function getByProviderSessionId(providerSessionId) {
  if (!providerSessionId) return null;
  const cached = await redis.getJSON(sessionKey(providerSessionId));
  return normalizeSession(cached);
}

async function getByMemberGame(providerGameCode, memberAccount) {
  if (!providerGameCode || !memberAccount) return null;
  const cached = await redis.getJSON(
    memberGameKey(providerGameCode, memberAccount),
  );
  return normalizeSession(cached);
}

async function loadFromMongo({
  providerSessionId,
  providerGameCode,
  memberAccount,
  gameRound,
}) {
  const projection =
    "_id user game memberAccount providerGameCode providerSessionId gameRound currency startBalance endBalance isFreeSpin isBonusBet status";

  const safeGameCode = providerGameCode
    ? String(providerGameCode).trim()
    : null;
  const safeMember = memberAccount ? String(memberAccount).trim() : null;
  const safeRound = gameRound ? String(gameRound).trim() : null;

  // PRIORITY A: Exact providerSessionId match (validated against available fields)
  if (providerSessionId) {
    const session = await GameSession.findOne({
      providerSessionId: String(providerSessionId).trim(),
    })
      .select(projection)
      .lean();

    if (session) {
      if (
        safeGameCode &&
        session.providerGameCode &&
        session.providerGameCode !== safeGameCode
      ) {
        logger.warn(
          "[SESSION_LOOKUP] providerSessionId matched but providerGameCode mismatched",
          {
            expected: safeGameCode,
            actual: session.providerGameCode,
          },
        );
        return null;
      }
      if (
        safeMember &&
        session.memberAccount &&
        session.memberAccount !== safeMember
      ) {
        logger.warn(
          "[SESSION_LOOKUP] providerSessionId matched but memberAccount mismatched",
          {
            expected: safeMember,
            actual: session.memberAccount,
          },
        );
        return null;
      }

      await storeSession(session);
      return normalizeSession(session);
    }

    return null;
  }

  // Without providerSessionId, both providerGameCode and memberAccount are strictly required
  if (!safeGameCode || !safeMember) {
    return null;
  }

  // PRIORITY B: Exact gameRound + providerGameCode + memberAccount
  if (safeRound) {
    // 1. Direct match on GameSession.gameRound
    const roundCandidates = await GameSession.find({
      providerGameCode: safeGameCode,
      memberAccount: safeMember,
      gameRound: safeRound,
    })
      .select(projection)
      .lean();

    if (roundCandidates.length === 1) {
      const match = roundCandidates[0];
      await storeSession(match);
      return normalizeSession(match);
    }

    if (roundCandidates.length > 1) {
      logger.warn(
        "[SESSION_LOOKUP] Ambiguous multiple sessions with same gameRound",
        {
          safeGameCode,
          safeMember,
          safeRound,
          count: roundCandidates.length,
        },
      );
      return null;
    }

    // 2. Check BettingHistory if round was previously recorded for this game & member
    const BettingHistory = require("../../models/BettingHistory");
    const historyRecord = await BettingHistory.findOne({
      providerGameCode: safeGameCode,
      gameRound: safeRound,
    })
      .select("gameSession user")
      .lean();

    if (historyRecord?.gameSession) {
      const histSession = await GameSession.findById(historyRecord.gameSession)
        .select(projection)
        .lean();

      if (
        histSession &&
        histSession.memberAccount === safeMember &&
        histSession.providerGameCode === safeGameCode
      ) {
        await storeSession(histSession);
        return normalizeSession(histSession);
      }
    }
  }

  // PRIORITY C: Active providerGameCode + memberAccount only when exactly one safe active candidate exists
  const activeCandidates = await GameSession.find({
    providerGameCode: safeGameCode,
    memberAccount: safeMember,
    status: "active",
  })
    .select(projection)
    .lean();

  if (activeCandidates.length === 1) {
    const match = activeCandidates[0];
    await storeSession(match);
    return normalizeSession(match);
  }

  if (activeCandidates.length > 1) {
    logger.warn(
      "[SESSION_LOOKUP] Ambiguous multiple active sessions for user and game",
      {
        safeGameCode,
        safeMember,
        count: activeCandidates.length,
      },
    );
    return null;
  }

  // PRIORITY D: Closed/completed session only when identity is deterministic.
  // If safeRound was NOT matched above, check if there is exactly ONE closed session for this user and game
  // with no conflicting gameRound.
  const closedCandidates = await GameSession.find({
    providerGameCode: safeGameCode,
    memberAccount: safeMember,
    status: { $in: ["closed", "completed"] },
  })
    .select(projection)
    .lean();

  if (closedCandidates.length === 1) {
    const singleClosed = closedCandidates[0];
    if (
      safeRound &&
      singleClosed.gameRound &&
      singleClosed.gameRound !== safeRound
    ) {
      // Conflict between callback round and session round
      return null;
    }
    await storeSession(singleClosed);
    return normalizeSession(singleClosed);
  }

  if (closedCandidates.length > 1) {
    // Ambiguous: multiple closed sessions exist and no deterministic gameRound or sessionId matched
    logger.warn(
      "[SESSION_LOOKUP] Ambiguous multiple closed sessions without deterministic match",
      {
        safeGameCode,
        safeMember,
        safeRound,
        count: closedCandidates.length,
      },
    );
    return null;
  }

  // PRIORITY E: No deterministic candidate found -> fail safely
  return null;
}

async function findActiveSession({
  providerSessionId,
  providerGameCode,
  memberAccount,
  gameRound,
}) {
  let session = null;

  if (providerSessionId) {
    const cached = await getByProviderSessionId(providerSessionId);
    if (cached) {
      const matchGame =
        !providerGameCode ||
        cached.providerGameCode === String(providerGameCode);
      const matchMember =
        !memberAccount || cached.memberAccount === String(memberAccount);
      if (matchGame && matchMember) {
        session = cached;
      }
    }
  }

  if (!session && providerGameCode && memberAccount) {
    const cached = await getByMemberGame(providerGameCode, memberAccount);
    if (cached && cached.status === "active") {
      session = cached;
    }
  }

  if (session) return session;

  try {
    return await loadFromMongo({
      providerSessionId,
      providerGameCode,
      memberAccount,
      gameRound,
    });
  } catch (error) {
    logger.error("[SESSION_CACHE] Mongo session fallback failed", {
      message: error.message,
      providerSessionId,
      providerGameCode,
      memberAccount,
      gameRound,
    });
    throw error;
  }
}

async function updateCachedSession(providerSessionId, patch) {
  if (!providerSessionId) return;
  const cached = await getByProviderSessionId(providerSessionId);
  if (!cached) return;
  await storeSession({ ...cached, ...patch });
}

module.exports = {
  SESSION_TTL_SECONDS,
  findActiveSession,
  storeSession,
  updateCachedSession,
};
