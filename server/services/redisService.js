const { createRedisConnection } = require("../config/redis");
const logger = require("../utils/logger");

class RedisService {
  constructor() {
    this.client = createRedisConnection({ connectionName: "ck369-cache" });
    this.connecting = null;
    this.unavailableUntil = 0;
    this.circuitMs = Number(process.env.REDIS_CIRCUIT_BREAKER_MS || 5000);

    this.client.on("error", (error) => {
      this.markUnavailable(error);
    });
  }

  markUnavailable(error) {
    this.unavailableUntil = Date.now() + this.circuitMs;
    logger.warn("[REDIS] temporarily unavailable", {
      message: error?.message || String(error),
    });
  }

  async ensureConnected() {
    if (process.env.REDIS_DISABLED === "true") return false;
    if (Date.now() < this.unavailableUntil) return false;
    if (this.client.status === "ready") return true;

    if (!this.connecting) {
      this.connecting = this.client.connect().finally(() => {
        this.connecting = null;
      });
    }

    await this.connecting;
    return this.client.status === "ready";
  }

  async safe(operation, fallback = null) {
    try {
      const ready = await this.ensureConnected();
      if (!ready) return fallback;
      return await operation(this.client);
    } catch (error) {
      this.markUnavailable(error);
      return fallback;
    }
  }

  async get(key) {
    return this.safe((client) => client.get(key), null);
  }

  async getJSON(key) {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.warn("[REDIS] failed to parse cached JSON", { key });
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    return this.safe((client) => {
      if (ttlSeconds) return client.set(key, value, "EX", ttlSeconds);
      return client.set(key, value);
    }, null);
  }

  async setJSON(key, value, ttlSeconds = null) {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async setNX(key, value, ttlSeconds) {
    return this.safe(async (client) => {
      const result = ttlSeconds
        ? await client.set(key, value, "EX", ttlSeconds, "NX")
        : await client.set(key, value, "NX");
      return result === "OK";
    }, null);
  }

  async del(key) {
    return this.safe((client) => client.del(key), null);
  }

  async eval(script, keys = [], args = []) {
    return this.safe(
      (client) => client.eval(script, keys.length, ...keys, ...args),
      null,
    );
  }

  async quit() {
    try {
      await this.client.quit();
    } catch (error) {
      logger.warn("[REDIS] quit failed", { message: error.message });
    }
  }
}

module.exports = new RedisService();
