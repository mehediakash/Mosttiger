const User = require("../../models/User");
const redis = require("../redisService");
const logger = require("../../utils/logger");

const WALLET_TTL_SECONDS = Number(process.env.WALLET_CACHE_TTL_SECONDS || 3600);

function walletKey(userId) {
  return `wallet:${userId}`;
}

function normalizeBalance(balance) {
  const normalized = {};

  if (balance && typeof balance === "object") {
    if (balance.main !== undefined) {
      normalized.main = Math.round(Number(balance.main || 0) * 100) / 100;
    }
    if (balance.bonus !== undefined) {
      normalized.bonus = Math.round(Number(balance.bonus || 0) * 100) / 100;
    }
    if (balance.freeBets !== undefined) {
      normalized.freeBets = Math.round(Number(balance.freeBets || 0) * 100) / 100;
    }
    return normalized;
  }

  return {
    main: Math.round(Number(balance || 0) * 100) / 100,
  };
}

async function setBalance(userId, balance) {
  if (!userId) return;
  const key = walletKey(userId);
  const normalized = normalizeBalance(balance);
  const cached = await redis.getJSON(key);

  await redis.setJSON(
    key,
    {
      ...(cached && typeof cached === "object" ? cached : {}),
      ...normalized,
    },
    WALLET_TTL_SECONDS,
  );
}

async function getCachedBalance(userId) {
  if (!userId) return null;
  const cached = await redis.getJSON(walletKey(userId));
  return cached ? normalizeBalance(cached) : null;
}

async function getBalance(userId) {
  const cached = await getCachedBalance(userId);
  if (cached?.main !== undefined) return cached;

  const user = await User.findById(userId).select("wallet.main").lean();
  if (!user) {
    throw new Error("User not found");
  }

  const balance = normalizeBalance(user.wallet);
  await setBalance(userId, balance);
  return balance;
}

async function getFullBalance(userId) {
  const cached = await getCachedBalance(userId);
  if (
    cached?.main !== undefined &&
    cached?.bonus !== undefined &&
    cached?.freeBets !== undefined
  ) {
    return cached;
  }

  const user = await User.findById(userId)
    .select("wallet.main wallet.bonus wallet.freeBets")
    .lean();
  if (!user) {
    throw new Error("User not found");
  }

  const balance = normalizeBalance(user.wallet);
  await setBalance(userId, balance);
  return balance;
}

async function invalidate(userId) {
  try {
    await redis.del(walletKey(userId));
  } catch (error) {
    logger.warn("[WALLET_CACHE] invalidate failed", {
      userId: String(userId),
      message: error.message,
    });
  }
}

module.exports = {
  WALLET_TTL_SECONDS,
  getBalance,
  getFullBalance,
  getCachedBalance,
  setBalance,
  invalidate,
};
