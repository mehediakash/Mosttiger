const BettingHistory = require("../../models/BettingHistory");
const redis = require("../redisService");

const DUPLICATE_TTL_SECONDS = Number(
  process.env.CALLBACK_DUPLICATE_TTL_SECONDS || 86400,
);

function duplicateKey({ gameRound, bet, win }) {
  return `callback:${String(gameRound || "")}:${Number(bet || 0)}:${Number(win || 0)}`;
}

async function acquire({ gameRound, bet, win }) {
  const key = duplicateKey({ gameRound, bet, win });
  const acquired = await redis.setNX(key, "1", DUPLICATE_TTL_SECONDS);
  return {
    key,
    acquired,
    redisAvailable: acquired !== null,
  };
}

async function release(key) {
  if (key) await redis.del(key);
}

async function existsInMongo({ userId, gameRound, bet, win }) {
  const existing = await BettingHistory.findOne({
    user: userId,
    gameRound,
    betAmount: bet,
    winAmount: win,
  })
    .select("_id")
    .lean();

  return Boolean(existing);
}

module.exports = {
  DUPLICATE_TTL_SECONDS,
  acquire,
  release,
  duplicateKey,
  existsInMongo,
};
