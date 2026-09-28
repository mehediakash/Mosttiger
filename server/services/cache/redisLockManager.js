const crypto = require("crypto");
const redis = require("../redisService");
const logger = require("../../utils/logger");

const DEFAULT_LOCK_TTL_MS = Number(
  process.env.CALLBACK_ROUND_LOCK_TTL_MS || 2000,
);

const DEFAULT_WALLET_LOCK_TTL_MS = Number(
  process.env.CALLBACK_WALLET_LOCK_TTL_MS || 3000,
);

const DEFAULT_WALLET_LOCK_WAIT_TIMEOUT_MS = Number(
  process.env.CALLBACK_WALLET_LOCK_WAIT_TIMEOUT_MS || 2000,
);

const DEFAULT_WALLET_LOCK_RETRY_INTERVAL_MS = Number(
  process.env.CALLBACK_WALLET_LOCK_RETRY_INTERVAL_MS || 25,
);

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Intra-process lock map for local Node.js process serialization (fallback/coordination)
// Note: This is an intra-process mutex only and is NOT a distributed lock across processes.
const localUserLocks = new Map();

function lockKey({ serialNumber, gameRound, userId = "" }) {
  if (serialNumber) {
    return userId
      ? `lock:sn:${String(userId)}:${String(serialNumber)}`
      : `lock:sn:${String(serialNumber)}`;
  }
  return userId
    ? `lock:round:${String(userId)}:${String(gameRound || "")}`
    : `lock:round:${String(gameRound || "")}`;
}

function userWalletLockKey(userId) {
  return `lock:wallet:${String(userId)}`;
}

/**
 * Acquire a user-scoped wallet lock for serializing wallet-changing callbacks.
 * Uses distributed Redis lock as the primary coordination mechanism across backend instances.
 * Incorporates bounded wait/retry for lock contention, and an in-process mutex fallback if Redis is unavailable.
 */
async function acquireUserWalletLock({
  userId,
  ttlMs = DEFAULT_WALLET_LOCK_TTL_MS,
  waitTimeoutMs = DEFAULT_WALLET_LOCK_WAIT_TIMEOUT_MS,
  retryIntervalMs = DEFAULT_WALLET_LOCK_RETRY_INTERVAL_MS,
} = {}) {
  if (!userId) {
    return {
      acquired: true,
      token: null,
      key: null,
      redisAvailable: true,
      isLocal: false,
    };
  }

  const userKey = String(userId);
  const key = userWalletLockKey(userKey);
  const token = crypto.randomUUID();
  const startTime = Date.now();

  // 1. Intra-process queue serialization
  while (localUserLocks.has(userKey)) {
    const elapsed = Date.now() - startTime;
    const remaining = waitTimeoutMs - elapsed;
    if (remaining <= 0) {
      logger.warn(
        "[USER_WALLET_LOCK] Local process lock acquisition timed out",
        {
          userId: userKey,
          key,
          elapsedMs: elapsed,
        },
      );
      return {
        acquired: false,
        token: null,
        key,
        redisAvailable: true,
        isLocal: true,
        timedOut: true,
      };
    }
    const currentHolder = localUserLocks.get(userKey);
    await Promise.race([
      currentHolder?.promise,
      sleep(Math.min(retryIntervalMs, remaining)),
    ]);
  }

  let localResolve;
  const localPromise = new Promise((resolve) => {
    localResolve = resolve;
  });

  const localTimer = setTimeout(() => {
    if (localUserLocks.get(userKey)?.promise === localPromise) {
      localUserLocks.delete(userKey);
      localResolve();
    }
  }, ttlMs);

  const localRelease = () => {
    clearTimeout(localTimer);
    if (localUserLocks.get(userKey)?.promise === localPromise) {
      localUserLocks.delete(userKey);
    }
    localResolve();
  };

  localUserLocks.set(userKey, {
    promise: localPromise,
    resolve: localRelease,
  });

  // 2. Distributed Redis lock acquisition with bounded contention retry
  let redisAvailable = true;
  let acquiredInRedis = false;

  while (Date.now() - startTime < waitTimeoutMs) {
    const redisResult = await redis.safe(async (client) => {
      const res = await client.set(key, token, "PX", ttlMs, "NX");
      return res === "OK";
    }, null);

    if (redisResult === null) {
      // Redis is unavailable or timed out
      redisAvailable = false;
      logger.warn(
        "[USER_WALLET_LOCK] Redis unavailable; relying on intra-process lock fallback",
        {
          userId: userKey,
          key,
        },
      );
      break;
    }

    if (redisResult === true) {
      acquiredInRedis = true;
      break;
    }

    // Lock is held by another process or concurrent request, wait and retry
    const elapsed = Date.now() - startTime;
    const remaining = waitTimeoutMs - elapsed;
    if (remaining <= 0) {
      break;
    }
    await sleep(Math.min(retryIntervalMs, remaining));
  }

  // Handle outcome
  if (!redisAvailable) {
    // Redis unavailable: Intra-process lock held as fallback to protect Mongo from this process
    return {
      acquired: true,
      token,
      key,
      redisAvailable: false,
      isLocal: true,
      localRelease,
    };
  }

  if (acquiredInRedis) {
    return {
      acquired: true,
      token,
      key,
      redisAvailable: true,
      isLocal: false,
      localRelease,
    };
  }

  // Timed out waiting for Redis lock
  localRelease();
  logger.warn(
    "[USER_WALLET_LOCK] Redis lock acquisition timed out under contention",
    {
      userId: userKey,
      key,
      elapsedMs: Date.now() - startTime,
    },
  );

  return {
    acquired: false,
    token: null,
    key,
    redisAvailable: true,
    isLocal: false,
    timedOut: true,
  };
}

async function releaseUserWalletLock(lock) {
  if (!lock) return;

  // 1. Release intra-process lock
  if (typeof lock.localRelease === "function") {
    try {
      lock.localRelease();
    } catch (err) {
      logger.warn("[USER_WALLET_LOCK] local release failed", {
        message: err.message,
      });
    }
  }

  // 2. Release distributed Redis lock using token validation
  if (lock.key && lock.token && !lock.isLocal) {
    await redis.eval(RELEASE_SCRIPT, [lock.key], [lock.token]);
  }
}

async function acquireRoundLock(
  gameRoundOrOptions,
  userIdOrTtl = DEFAULT_LOCK_TTL_MS,
  maybeTtl = DEFAULT_LOCK_TTL_MS,
) {
  let serialNumber = null;
  let gameRound = null;
  let userId = "";
  let ttlMs = DEFAULT_LOCK_TTL_MS;

  if (typeof gameRoundOrOptions === "object" && gameRoundOrOptions !== null) {
    serialNumber = gameRoundOrOptions.serialNumber || null;
    gameRound = gameRoundOrOptions.gameRound || null;
    userId = gameRoundOrOptions.userId ? String(gameRoundOrOptions.userId) : "";
    ttlMs =
      typeof gameRoundOrOptions.ttlMs === "number"
        ? gameRoundOrOptions.ttlMs
        : typeof userIdOrTtl === "number"
          ? userIdOrTtl
          : DEFAULT_LOCK_TTL_MS;
  } else {
    gameRound = gameRoundOrOptions;
    userId = typeof userIdOrTtl === "number" ? "" : String(userIdOrTtl || "");
    ttlMs =
      typeof userIdOrTtl === "number"
        ? userIdOrTtl
        : typeof maybeTtl === "number"
          ? maybeTtl
          : DEFAULT_LOCK_TTL_MS;
  }

  if (!serialNumber && !gameRound) {
    return { acquired: true, token: null, key: null, redisAvailable: true };
  }

  const key = lockKey({ serialNumber, gameRound, userId });
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
  if (!lock) return;
  if (typeof lock.localRelease === "function") {
    try {
      lock.localRelease();
    } catch {}
  }
  if (!lock?.key || !lock?.token || lock?.isLocal) return;
  await redis.eval(RELEASE_SCRIPT, [lock.key], [lock.token]);
}

module.exports = {
  DEFAULT_LOCK_TTL_MS,
  DEFAULT_WALLET_LOCK_TTL_MS,
  DEFAULT_WALLET_LOCK_WAIT_TIMEOUT_MS,
  DEFAULT_WALLET_LOCK_RETRY_INTERVAL_MS,
  acquireUserWalletLock,
  releaseUserWalletLock,
  acquireRoundLock,
  release,
};
