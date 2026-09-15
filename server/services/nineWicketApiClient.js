const crypto = require("crypto");
const axios = require("axios");
const https = require("https");
const redis = require("./redisService");
const { readNineWicketConfig } = require("../config/nineWicket");

const BLOCK_SIZE = 16;
const GAME_CACHE_KEY = "ninewicket:game_uid";

function pkcs7Pad(buffer) {
  const remainder = buffer.length % BLOCK_SIZE;
  const padLength = remainder === 0 ? BLOCK_SIZE : BLOCK_SIZE - remainder;
  return Buffer.concat([buffer, Buffer.alloc(padLength, padLength)]);
}

function pkcs7Unpad(buffer) {
  if (!buffer.length) throw new Error("Invalid PKCS7 payload");
  const padLength = buffer[buffer.length - 1];
  if (padLength < 1 || padLength > BLOCK_SIZE || padLength > buffer.length) {
    throw new Error("Invalid PKCS7 padding");
  }

  for (
    let index = buffer.length - padLength;
    index < buffer.length;
    index += 1
  ) {
    if (buffer[index] !== padLength) {
      throw new Error("Invalid PKCS7 padding");
    }
  }

  return buffer.subarray(0, buffer.length - padLength);
}

function extractGamesFromProviderResponse(data) {
  if (Array.isArray(data?.data?.games)) return data.data.games;
  if (Array.isArray(data?.games)) return data.games;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

class NineWicketApiClient {
  constructor(options = {}) {
    this.configReader = options.configReader || readNineWicketConfig;
    this.http =
      options.http ||
      axios.create({
        httpsAgent: new https.Agent({
          keepAlive: true,
          maxSockets: 50,
          maxFreeSockets: 10,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "mosttiger-9Wicket/1.0",
        },
      });
  }

  getConfig() {
    return this.configReader();
  }

  encryptPayload(payload, secret = this.getConfig().secret) {
    if (String(secret).length !== 32) {
      throw new Error("9Wicket secret must be exactly 32 characters");
    }

    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const padded = pkcs7Pad(plaintext);
    const cipher = crypto.createCipheriv(
      "aes-256-ecb",
      Buffer.from(secret, "utf8"),
      null,
    );
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString(
      "base64",
    );
  }

  decryptPayload(encryptedPayload, secret = this.getConfig().secret) {
    if (String(secret).length !== 32) {
      throw new Error("9Wicket secret must be exactly 32 characters");
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-ecb",
      Buffer.from(secret, "utf8"),
      null,
    );
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(String(encryptedPayload), "base64")),
      decipher.final(),
    ]);
    return JSON.parse(pkcs7Unpad(decrypted).toString("utf8"));
  }

  async postEncrypted(payload) {
    const config = this.getConfig();
    const encryptedPayload = this.encryptPayload(payload, config.secret);
    const response = await this.http.post(
      config.apiBaseUrl,
      {
        token: config.token,
        payload: encryptedPayload,
      },
      { timeout: config.timeoutMs },
    );
    return response.data;
  }

  async getGames() {
    const config = this.getConfig();
    const response = await this.http.get(`${config.apiBaseUrl}/games`, {
      params: { token: config.token },
      timeout: config.timeoutMs,
    });
    return response.data;
  }

  async resolveGameUid() {
    const config = this.getConfig();
    const cached = await redis.getJSON(GAME_CACHE_KEY);
    if (cached?.gameUid) return cached.gameUid;

    const data = await this.getGames();
    const games = extractGamesFromProviderResponse(data);

    const match = games.find((game) => {
      const symbol = String(
        game.symbol || game.game_symbol || "",
      ).toUpperCase();
      const uid = String(game.game_uid || game.gameUid || game.uid || "");
      const name = String(game.name || game.game_name || game.title || "");
      return (
        symbol === "9W" ||
        uid.toUpperCase() === "9W" ||
        /9\s*wicket/i.test(name)
      );
    });

    const gameUid =
      match?.game_uid ||
      match?.gameUid ||
      match?.uid ||
      match?.game_code ||
      null;

    if (!gameUid) {
      throw new Error(
        "9Wicket game_uid could not be resolved from provider games API",
      );
    }

    await redis.setJSON(
      GAME_CACHE_KEY,
      { gameUid: String(gameUid), resolvedAt: new Date().toISOString() },
      config.gameCacheTtlSeconds,
    );

    return String(gameUid);
  }
}

module.exports = new NineWicketApiClient();
module.exports.NineWicketApiClient = NineWicketApiClient;
module.exports.pkcs7Pad = pkcs7Pad;
module.exports.pkcs7Unpad = pkcs7Unpad;
