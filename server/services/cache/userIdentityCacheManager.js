const mongoose = require("mongoose");
const User = require("../../models/User");
const redis = require("../redisService");
const logger = require("../../utils/logger");

const USER_IDENT_TTL_SECONDS = Number(
  process.env.USER_IDENT_CACHE_TTL_SECONDS || 86400,
);

function identityKey(memberAccount) {
  if (memberAccount === null || memberAccount === undefined) return null;
  const trimmed = String(memberAccount).trim();
  return trimmed ? `user:ident:${trimmed}` : null;
}

/**
 * Resolves user identity from cache (Redis) or falls back to MongoDB.
 * Caches ONLY immutable identity: _id and numeric userId.
 * Never caches financial state, balance, or user status.
 *
 * @param {string|number} memberAccount - The member account identifier from callback
 * @returns {Promise<{ _id: string, id: string, userId: number, _fromCache: boolean } | null>}
 */
async function resolveUserIdentity(memberAccount) {
  if (memberAccount === null || memberAccount === undefined) return null;
  const trimmed = String(memberAccount).trim();
  if (!trimmed) return null;

  const key = identityKey(trimmed);

  // 1. Try Redis lookup first (safe with fallback)
  if (key) {
    try {
      const cached = await redis.getJSON(key);
      if (cached && cached._id && cached.userId !== undefined) {
        return {
          _id: String(cached._id),
          id: String(cached._id),
          userId: Number(cached.userId),
          _fromCache: true,
        };
      }
    } catch (err) {
      logger.warn(
        "[USER_IDENT_CACHE] Redis lookup failed, falling back to MongoDB",
        {
          memberAccount: trimmed,
          error: err.message,
        },
      );
    }
  }

  // 2. Cache MISS or Redis unavailable -> Query MongoDB exactly as before
  let user = null;
  const numericId = Number(trimmed);

  // 2a. Match SoftAPI numeric memberAccount
  if (Number.isInteger(numericId) && numericId > 0) {
    user = await User.findOne({ userId: numericId })
      .select("_id userId")
      .lean();
  }

  // 2b. Match ObjectId memberAccount fallback
  if (!user && mongoose.Types.ObjectId.isValid(trimmed)) {
    user = await User.findById(trimmed).select("_id userId").lean();
  }

  if (!user) {
    return null;
  }

  const identity = {
    _id: String(user._id),
    id: String(user._id),
    userId: user.userId,
  };

  // 3. Populate Redis with 24-hour TTL (safe with error logging)
  if (key) {
    try {
      await redis.setJSON(
        key,
        { _id: identity._id, userId: identity.userId },
        USER_IDENT_TTL_SECONDS,
      );
    } catch (err) {
      logger.warn("[USER_IDENT_CACHE] Failed to set Redis user identity", {
        key,
        error: err.message,
      });
    }
  }

  return {
    ...identity,
    _fromCache: false,
  };
}

/**
 * Invalidate cached user identity if needed
 */
async function invalidate(memberAccount) {
  const key = identityKey(memberAccount);
  if (!key) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn("[USER_IDENT_CACHE] Invalidation failed", {
      key,
      error: err.message,
    });
  }
}

module.exports = {
  USER_IDENT_TTL_SECONDS,
  identityKey,
  resolveUserIdentity,
  invalidate,
};
