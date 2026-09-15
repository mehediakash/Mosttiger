const GameSession = require("../../models/GameSession");
const redis = require("../redisService");
const logger = require("../../utils/logger");

const SESSION_TTL_SECONDS = Number(process.env.GAME_SESSION_CACHE_TTL_SECONDS || 7200);

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
    providerGameCode: session.providerGameCode,
    providerSessionId: session.providerSessionId,
    gameRound: session.gameRound || null,
    currency: session.currency || "BDT",
    startBalance: Number(session.startBalance || 0),
    endBalance: session.endBalance,
    isFreeSpin: Boolean(session.isFreeSpin || false),
    isBonusBet: Boolean(session.isBonusBet || false),
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

  await redis.setJSON(sessionKey(payload.providerSessionId), payload, SESSION_TTL_SECONDS);

  if (payload.providerGameCode && payload.memberAccount) {
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
  const cached = await redis.getJSON(memberGameKey(providerGameCode, memberAccount));
  return normalizeSession(cached);
}

async function loadFromMongo({ providerSessionId, providerGameCode, memberAccount }) {
  const projection =
    "_id user game memberAccount providerGameCode providerSessionId gameRound currency startBalance endBalance isFreeSpin isBonusBet";

  let session = null;

  if (providerSessionId) {
    session = await GameSession.findOne({
      providerSessionId,
      status: "active",
    })
      .select(projection)
      .lean();
  }

  if (!session && providerGameCode && memberAccount) {
    session = await GameSession.findOne({
      providerGameCode,
      memberAccount: String(memberAccount),
      status: "active",
    })
      .select(projection)
      .sort({ createdAt: -1 })
      .lean();
  }

  if (session) {
    await storeSession(session);
  }

  return normalizeSession(session);
}

async function findActiveSession({ providerSessionId, providerGameCode, memberAccount }) {
  let session = await getByProviderSessionId(providerSessionId);

  if (!session) {
    session = await getByMemberGame(providerGameCode, memberAccount);
  }

  if (session) return session;

  try {
    return await loadFromMongo({ providerSessionId, providerGameCode, memberAccount });
  } catch (error) {
    logger.error("[SESSION_CACHE] Mongo session fallback failed", {
      message: error.message,
      providerSessionId,
      providerGameCode,
      memberAccount,
    });
    throw error;
  }
}

async function updateCachedSession(providerSessionId, patch) {
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
