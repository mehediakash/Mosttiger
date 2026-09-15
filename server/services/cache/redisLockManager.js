const crypto = require("crypto");
const redis = require("../redisService");

const DEFAULT_LOCK_TTL_MS = Number(process.env.CALLBACK_ROUND_LOCK_TTL_MS || 5000);
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

function lockKey(gameRound) {
  return `lock:round:${String(gameRound || "")}`;
}

async function acquireRoundLock(gameRound, ttlMs = DEFAULT_LOCK_TTL_MS) {
  if (!gameRound) {
    return { acquired: true, token: null, key: null, redisAvailable: true };
  }

  const key = lockKey(gameRound);
  const token = crypto.randomUUID();
  const acquired = await redis.safe(async (client) => {
    const result = await client.set(key, token, "PX", ttlMs, "NX");
    return result === "OK";
  }, null);

  return {
    acquired: acquired === null ? true : acquired,
    token,
    key,
    redisAvailable: acquired !== null,
  };
}

async function release(lock) {
  if (!lock?.key || !lock?.token) return;
  await redis.eval(RELEASE_SCRIPT, [lock.key], [lock.token]);
}

module.exports = {
  DEFAULT_LOCK_TTL_MS,
  acquireRoundLock,
  release,
};
