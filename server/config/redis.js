const IORedis = require("ioredis");

function buildRedisOptions({ connectionName, bullmq = false } = {}) {
  const url = process.env.REDIS_URL;
  const common = {
    connectionName,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    enableOfflineQueue: bullmq,
    lazyConnect: !bullmq,
    maxRetriesPerRequest: bullmq ? null : Number(process.env.REDIS_MAX_RETRIES || 1),
    connectTimeout: Number(
      bullmq
        ? process.env.REDIS_BULLMQ_CONNECT_TIMEOUT_MS || 10000
        : process.env.REDIS_CONNECT_TIMEOUT_MS || 200,
    ),
    retryStrategy(times) {
      const maxDelay = Number(process.env.REDIS_RETRY_MAX_DELAY_MS || 2000);
      return Math.min(times * 100, maxDelay);
    },
  };

  if (!bullmq) {
    common.commandTimeout = Number(process.env.REDIS_COMMAND_TIMEOUT_MS || 100);
  }

  if (process.env.REDIS_TLS === "true") {
    common.tls = {};
  }

  if (url) return { url, options: common };

  return {
    options: {
      ...common,
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
    },
  };
}

function createRedisConnection(options = {}) {
  const config = buildRedisOptions(options);
  if (config.url) {
    return new IORedis(config.url, config.options);
  }
  return new IORedis(config.options);
}

module.exports = {
  createRedisConnection,
};
