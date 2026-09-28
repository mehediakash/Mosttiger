const BettingHistory = require("../../models/BettingHistory");
const redis = require("../redisService");

const DUPLICATE_TTL_SECONDS = Number(
  process.env.CALLBACK_DUPLICATE_TTL_SECONDS || 86400,
);

function duplicateKey({ serialNumber, userId, gameRound, bet, win }) {
  if (serialNumber) {
    return userId
      ? `callback:sn:${String(userId)}:${String(serialNumber)}`
      : `callback:sn:${String(serialNumber)}`;
  }
  return userId
    ? `callback:${String(userId)}:${String(gameRound || "")}:${Number(bet || 0)}:${Number(win || 0)}`
    : `callback:${String(gameRound || "")}:${Number(bet || 0)}:${Number(win || 0)}`;
}

async function acquire({ serialNumber, userId, gameRound, bet, win }) {
  const key = duplicateKey({ serialNumber, userId, gameRound, bet, win });
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

async function existsInMongo({ serialNumber, userId, gameRound, bet, win }) {
  if (serialNumber) {
    const existing = await BettingHistory.findOne({
      user: userId,
      $or: [
        { "metadata.serialNumber": String(serialNumber) },
        { "metadata.serial_number": String(serialNumber) },
      ],
    })
      .select("_id")
      .lean();

    if (existing) return true;
  }

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
