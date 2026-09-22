const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { NineWicketApiClient } = require("../services/nineWicketApiClient");
const { readNineWicketConfig } = require("../config/nineWicket");
const {
  NineWicketService,
  parseProviderAmount,
  NineWicketProviderError,
} = require("../services/nineWicketService");
const WalletService = require("../services/walletService");
const NineWicketSession = require("../models/NineWicketSession");
const NineWicketTransfer = require("../models/NineWicketTransfer");
const NineWicketCallbackEvent = require("../models/NineWicketCallbackEvent");
const BettingHistory = require("../models/BettingHistory");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const config = {
  apiBaseUrl: "https://operator.example",
  token: "provider-token",
  secret: "12345678901234567890123456789012",
  callbackUrl: "https://server.example/api/9wicket/callback",
  returnUrl: "https://client.example/casino",
  currency: "BDT",
  timeoutMs: 100,
  gameCacheTtlSeconds: 1,
};

function restoreAll(restores) {
  for (const restore of restores.reverse()) restore();
}

function replace(object, key, value, restores) {
  const old = object[key];
  object[key] = value;
  restores.push(() => {
    object[key] = old;
  });
}

function fakeDb(restores) {
  replace(
    mongoose,
    "startSession",
    async () => ({
      startTransaction() {},
      commitTransaction() {},
      abortTransaction() {},
      async withTransaction(fn) {
        return fn();
      },
      endSession() {},
    }),
    restores,
  );

  replace(
    WalletService,
    "getWalletBalance",
    async () => ({ main: 100, bonus: 0, freeBets: 0 }),
    restores,
  );
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => ({
      success: true,
      previousBalance: amount < 0 ? 100 : 0,
      newBalance: amount < 0 ? 100 + amount : amount,
      transactionId: new mongoose.Types.ObjectId(),
    }),
    restores,
  );
  replace(
    NineWicketSession,
    "create",
    async ([doc]) => [{ ...doc, _id: new mongoose.Types.ObjectId() }],
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => {
      const item = Array.isArray(doc) ? doc[0] : doc;
      return Array.isArray(doc)
        ? [{ ...item, _id: new mongoose.Types.ObjectId() }]
        : { ...item, _id: new mongoose.Types.ObjectId() };
    },
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "findOneAndUpdate",
    async () => ({ acknowledged: true }),
    restores,
  );
  const mockNullQuery = () => ({
    select: () => ({ lean: async () => null, then: (r) => r(null) }),
    sort: () => ({ lean: async () => null, then: (r) => r(null) }),
    lean: async () => null,
    then: (r) => r(null),
  });
  replace(NineWicketTransfer, "findOne", mockNullQuery, restores);
  replace(Transaction, "findOne", mockNullQuery, restores);
  const mockUserQuery = () => ({
    select: () => ({ lean: async () => user, then: (r) => r(user) }),
    lean: async () => user,
    then: (r) => r(user),
  });
  replace(User, "findById", mockUserQuery, restores);
  replace(User, "findOne", mockUserQuery, restores);
  const mockHistoryQuery = () => ({
    select: () => ({ lean: async () => null, then: (r) => r(null) }),
    lean: async () => null,
    then: (r) => r(null),
  });
  replace(BettingHistory, "findOne", mockHistoryQuery, restores);
  replace(
    BettingHistory,
    "deleteMany",
    async () => ({ acknowledged: true, deletedCount: 0 }),
    restores,
  );
  replace(
    BettingHistory,
    "create",
    async (doc) => {
      const item = Array.isArray(doc) ? doc[0] : doc;
      return Array.isArray(doc)
        ? [{ ...item, _id: new mongoose.Types.ObjectId() }]
        : { ...item, _id: new mongoose.Types.ObjectId() };
    },
    restores,
  );
}

function serviceWithClient(clientOverrides = {}, sideEffects = null) {
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: {
        url: "https://sportsbook.example/session",
        session_id: "S1",
        before_amount: 0,
        after_amount: 50,
        transfer_amount: 50,
      },
    }),
    decryptPayload: (payload) =>
      JSON.parse(Buffer.from(payload, "base64").toString("utf8")),
    ...clientOverrides,
  };
  return new NineWicketService(client, sideEffects);
}

const user = {
  _id: new mongoose.Types.ObjectId(),
  userId: 369001,
};

test("encryption/decryption uses AES-256-ECB PKCS7 Base64", () => {
  const client = new NineWicketApiClient({
    configReader: () => config,
    http: {},
  });
  const payload = { user_id: "369001", balance: "50", timestamp: 1 };
  const encrypted = client.encryptPayload(payload);
  assert.equal(typeof encrypted, "string");
  assert.deepEqual(client.decryptPayload(encrypted), payload);
});

test("invalid Secret is rejected", () => {
  const client = new NineWicketApiClient({
    configReader: () => ({ ...config, secret: "short" }),
    http: {},
  });
  assert.throws(() => client.encryptPayload({ ok: true }), /32 characters/);
});

test("valid launch debits wallet and returns data.url only", async () => {
  const restores = [];
  fakeDb(restores);
  try {
    const result = await serviceWithClient().launch(user, { amount: 50 });
    assert.equal(result.url, "https://sportsbook.example/session");
    assert.equal(result.sessionId, "S1");
  } finally {
    restoreAll(restores);
  }
});

test("failed launch rolls wallet back and does not return URL", async () => {
  const restores = [];
  const walletCalls = [];
  fakeDb(restores);
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount, _wallet, type) => {
      walletCalls.push({ amount, type });
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => ({ code: 9, msg: "Game not available" }),
      }).launch(user, { amount: 50 }),
      /Game not available/,
    );
    assert.deepEqual(
      walletCalls.map((call) => call.amount),
      [-50, 50],
    );
  } finally {
    restoreAll(restores);
  }
});

test("insufficient wallet balance blocks launch before provider call", async () => {
  const restores = [];
  fakeDb(restores);
  replace(
    WalletService,
    "getWalletBalance",
    async () => ({ main: 10 }),
    restores,
  );
  let called = false;
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => {
          called = true;
        },
      }).launch(user, { amount: 50 }),
      (error) => {
        assert.equal(error.code, "INSUFFICIENT_BALANCE");
        assert.equal(error.requiresDeposit, true);
        assert.equal(error.availableBalance, 10);
        assert.equal(error.requiredAmount, 50);
        return true;
      },
    );
    assert.equal(called, false);
  } finally {
    restoreAll(restores);
  }
});

test("negative wallet balance blocks new launch before provider call", async () => {
  const restores = [];
  fakeDb(restores);
  replace(
    WalletService,
    "getWalletBalance",
    async () => ({ main: -10 }),
    restores,
  );
  let called = false;
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => {
          called = true;
        },
      }).launch(user),
      (error) => {
        assert.equal(error.code, "INSUFFICIENT_BALANCE");
        assert.equal(error.requiresDeposit, true);
        assert.equal(error.message, "Please deposit funds to start playing.");
        return true;
      },
    );
    assert.equal(called, false);
  } finally {
    restoreAll(restores);
  }
});

test("provider timeout triggers rollback", async () => {
  const restores = [];
  const walletCalls = [];
  fakeDb(restores);
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCalls.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => {
          throw new Error("timeout");
        },
      }).launch(user, { amount: 25 }),
      /launch request failed/,
    );
    assert.deepEqual(walletCalls, [-25, 25]);
  } finally {
    restoreAll(restores);
  }
});

test("provider error is surfaced safely", async () => {
  const restores = [];
  fakeDb(restores);
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => ({ code: 403, msg: "IP not allowed" }),
      }).launch(user, { amount: 10 }),
      /IP not allowed/,
    );
  } finally {
    restoreAll(restores);
  }
});

test("data.url is required after code === 0", async () => {
  const restores = [];
  fakeDb(restores);
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => ({ code: 0, msg: "OK", data: {} }),
      }).launch(user, { amount: 10 }),
      /missing url/,
    );
  } finally {
    restoreAll(restores);
  }
});

test("game_uid is resolved from provider games API symbol 9W", async () => {
  const http = {
    get: async () => ({
      data: {
        games: [
          { symbol: "ABC", game_uid: "OTHER" },
          { symbol: "9W", game_uid: "REAL_9W_UID" },
        ],
      },
    }),
  };
  const client = new NineWicketApiClient({
    configReader: () => config,
    http,
  });
  const redis = require("../services/redisService");
  const restores = [];
  replace(redis, "getJSON", async () => null, restores);
  replace(redis, "setJSON", async () => true, restores);
  try {
    assert.equal(await client.resolveGameUid(), "REAL_9W_UID");
  } finally {
    restoreAll(restores);
  }
});

test("game_uid is resolved from provider data.games response shape", async () => {
  const http = {
    get: async () => ({
      data: {
        code: 0,
        data: {
          currency_filter: true,
          games: [
            { provider: "other", name: "Other Game", game_uid: "OTHER" },
            { provider: "9wickets", name: "9Wicket", game_uid: "11539" },
          ],
          play_currency: "BDT",
        },
        msg: "success",
      },
    }),
  };
  const client = new NineWicketApiClient({
    configReader: () => config,
    http,
  });
  const redis = require("../services/redisService");
  const restores = [];
  replace(redis, "getJSON", async () => null, restores);
  replace(redis, "setJSON", async () => true, restores);
  try {
    assert.equal(await client.resolveGameUid(), "11539");
  } finally {
    restoreAll(restores);
  }
});

test("game_uid resolver does not invent uid when provider data.games has no 9Wicket row", async () => {
  const http = {
    get: async () => ({
      data: {
        code: 0,
        data: {
          games: [{ provider: "other", name: "Other Game", game_uid: "OTHER" }],
        },
      },
    }),
  };
  const client = new NineWicketApiClient({
    configReader: () => config,
    http,
  });
  const redis = require("../services/redisService");
  const restores = [];
  replace(redis, "getJSON", async () => null, restores);
  replace(redis, "setJSON", async () => true, restores);
  try {
    await assert.rejects(
      client.resolveGameUid(),
      /9Wicket game_uid could not be resolved/,
    );
  } finally {
    restoreAll(restores);
  }
});

test("USDT currency is rejected by backend-only config", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://operator.example";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL =
    "https://server.example/api/9wicket/callback";
  process.env.NINEWICKET_RETURN_URL = "https://client.example/casino";
  process.env.NINEWICKET_CURRENCY = "USDT";
  try {
    assert.throws(() => readNineWicketConfig(), /cannot be USDT/);
  } finally {
    process.env = oldEnv;
  }
});

test("non-HTTPS callback URL is rejected by backend-only config", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://operator.example";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL =
    "http://server.example/api/9wicket/callback";
  process.env.NINEWICKET_RETURN_URL = "https://client.example/casino";
  process.env.NINEWICKET_CURRENCY = "BDT";
  try {
    assert.throws(() => readNineWicketConfig(), /must use HTTPS/);
  } finally {
    process.env = oldEnv;
  }
});

test("sportsbook play URL is rejected as API Base URL", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://igamingapis.live/9w/play";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL =
    "https://server.example/api/9wicket/callback";
  process.env.NINEWICKET_RETURN_URL = "https://client.example/casino";
  process.env.NINEWICKET_CURRENCY = "BDT";
  try {
    assert.throws(
      () => readNineWicketConfig(),
      /not the 9Wicket sportsbook play URL/,
    );
  } finally {
    process.env = oldEnv;
  }
});

test("callback URL must point to actual 9Wicket backend route", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://operator.example";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL = "https://server.example";
  process.env.NINEWICKET_RETURN_URL = "https://client.example/casino";
  process.env.NINEWICKET_CURRENCY = "BDT";
  try {
    assert.throws(
      () => readNineWicketConfig(),
      /backend \/api\/9wicket\/callback route/,
    );
  } finally {
    process.env = oldEnv;
  }
});

test("valid config normalizes API Base URL and keeps frontend casino return", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://operator.example/api/";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL =
    "https://server.example/api/9wicket/callback";
  process.env.NINEWICKET_RETURN_URL = "https://client.example/casino";
  process.env.NINEWICKET_CURRENCY = "BDT";
  try {
    const resolved = readNineWicketConfig();
    assert.equal(resolved.apiBaseUrl, "https://operator.example/api");
    assert.equal(resolved.returnUrl, "https://client.example/casino");
  } finally {
    process.env = oldEnv;
  }
});

test("return URL must point to existing casino lobby route", () => {
  const oldEnv = { ...process.env };
  process.env.NINEWICKET_API_BASE_URL = "https://operator.example";
  process.env.NINEWICKET_TOKEN = "token";
  process.env.NINEWICKET_SECRET = config.secret;
  process.env.NINEWICKET_CALLBACK_URL =
    "https://server.example/api/9wicket/callback";
  process.env.NINEWICKET_RETURN_URL = "https://client.example";
  process.env.NINEWICKET_CURRENCY = "BDT";
  try {
    assert.throws(
      () => readNineWicketConfig(),
      /frontend \/casino lobby route/,
    );
  } finally {
    process.env = oldEnv;
  }
});

test("same callback with changed timestamp remains idempotent", async () => {
  const restores = [];
  let created = 0;
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
        }),
      }),
    }),
    restores,
  );
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      created += 1;
      if (created > 1) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
    },
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  try {
    const svc = serviceWithClient();
    assert.deepEqual(
      await svc.handleCallback({
        event: "session_end",
        session_id: "S1",
        timestamp: Date.now(),
      }),
      { success: true },
    );
    assert.deepEqual(
      await svc.handleCallback({
        event: "session_end",
        session_id: "S1",
        timestamp: Date.now() + 1,
      }),
      { duplicate: true },
    );
  } finally {
    restoreAll(restores);
  }
});

test("decrypt failed callback is rejected before persistence", async () => {
  const restores = [];
  let persisted = false;
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      persisted = true;
    },
    restores,
  );
  try {
    await assert.rejects(
      serviceWithClient({
        decryptPayload: () => {
          throw new Error("decrypt failed");
        },
      }).handleCallback({ payload: "bad" }),
      /decrypt failed/,
    );
    assert.equal(persisted, false);
  } finally {
    restoreAll(restores);
  }
});

test("inquiry reads after_amount and successful debit credits wallet", async () => {
  const restores = [];
  const walletCredits = [];
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      then: undefined,
      sort: async () => null,
    }),
    restores,
  );
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
    }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(Transaction, "findOne", () => ({ lean: async () => null }), restores);
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );
  try {
    let count = 0;
    const result = await serviceWithClient({
      postEncrypted: async () => {
        count += 1;
        return count === 1
          ? { code: 0, msg: "OK", data: { after_amount: 42 } }
          : {
              code: 0,
              msg: "OK",
              data: {
                before_amount: 42,
                after_amount: 0,
                transfer_amount: -42,
              },
            };
      },
    }).settleSession({ sessionId: "S1", userId: user._id });
    assert.equal(result.returnedAmount, 42);
    assert.deepEqual(walletCredits, [42]);
  } finally {
    restoreAll(restores);
  }
});

test("inquiry accepts camelCase afterAmount and credits wallet", async () => {
  const restores = [];
  const walletCredits = [];
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
    }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(Transaction, "findOne", () => ({ lean: async () => null }), restores);
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );
  try {
    let count = 0;
    const result = await serviceWithClient({
      postEncrypted: async () => {
        count += 1;
        return count === 1
          ? { code: 0, msg: "OK", data: { afterAmount: 65 } }
          : {
              code: 0,
              msg: "OK",
              data: { beforeAmount: 65, afterAmount: 0, transferAmount: -65 },
            };
      },
    }).settleSession({ sessionId: "S1", userId: user._id });
    assert.equal(result.returnedAmount, 65);
    assert.deepEqual(walletCredits, [65]);
  } finally {
    restoreAll(restores);
  }
});

test("inquiry missing after_amount does not complete session or credit wallet", async () => {
  const restores = [];
  let credited = false;
  let sessionPatch = null;
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
    }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, update) => {
      sessionPatch = update;
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );
  replace(
    WalletService,
    "updateWallet",
    async () => {
      credited = true;
    },
    restores,
  );
  try {
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => ({
          code: 0,
          msg: "OK",
          data: { balance: 650 },
        }),
      }).settleSession({ sessionId: "S1", userId: user._id }),
      /missing after_amount/,
    );
    assert.equal(credited, false);
    assert.equal(sessionPatch.$set.status, "reconciliation_required");
    assert.equal(sessionPatch.$set.cashoutStatus, "failed");
  } finally {
    restoreAll(restores);
  }
});

test("failed debit does not credit wallet and marks reconciliation", async () => {
  const restores = [];
  let credited = false;
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
    }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    WalletService,
    "updateWallet",
    async () => {
      credited = true;
    },
    restores,
  );
  try {
    let count = 0;
    await assert.rejects(
      serviceWithClient({
        postEncrypted: async () => {
          count += 1;
          return count === 1
            ? { code: 0, msg: "OK", data: { after_amount: 30 } }
            : { code: 55, msg: "Low GGR Balance" };
        },
      }).settleSession({ sessionId: "S1", userId: user._id }),
      /Low GGR/,
    );
    assert.equal(credited, false);
  } finally {
    restoreAll(restores);
  }
});

test("completed session settlement does not inquiry, debit, or credit again", async () => {
  const restores = [];
  let providerCalls = 0;
  let walletCredits = 0;
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
      status: "completed",
      cashoutStatus: "debited",
    }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCredits += 1;
    },
    restores,
  );
  try {
    const result = await serviceWithClient({
      postEncrypted: async () => {
        providerCalls += 1;
      },
    }).settleSession({ sessionId: "S1", userId: user._id });
    assert.equal(result.status, "already_completed");
    assert.equal(providerCalls, 0);
    assert.equal(walletCredits, 0);
  } finally {
    restoreAll(restores);
  }
});

test("settlement processing claim prevents concurrent duplicate cashout", async () => {
  const restores = [];
  let providerCalls = 0;
  replace(
    NineWicketSession,
    "findOne",
    async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
      status: "active",
      cashoutStatus: "not_started",
    }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ modifiedCount: 0 }),
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  try {
    const result = await serviceWithClient({
      postEncrypted: async () => {
        providerCalls += 1;
      },
    }).settleSession({ sessionId: "S1", userId: user._id });
    assert.equal(result.status, "settlement_in_progress");
    assert.equal(providerCalls, 0);
  } finally {
    restoreAll(restores);
  }
});

test("settle-active settles selected active session _id when provider session_id is reused", async () => {
  const restores = [];
  const olderSessionId = new mongoose.Types.ObjectId();
  const activeSessionId = new mongoose.Types.ObjectId();
  const queries = [];
  const walletCredits = [];
  const activeSession = {
    _id: activeSessionId,
    user: user._id,
    sessionId: "648",
    memberAccount: String(user.userId),
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "active",
    cashoutStatus: "not_started",
  };

  replace(
    NineWicketSession,
    "findOne",
    (query) => {
      queries.push(query);
      if (query?.status) {
        return {
          sort: async () => activeSession,
        };
      }
      if (String(query?._id || "") === String(activeSessionId)) {
        return Promise.resolve(activeSession);
      }
      if (query?.sessionId === "648") {
        return {
          sort: async () => ({
            ...activeSession,
            _id: olderSessionId,
            status: "completed",
            cashoutStatus: "none",
          }),
        };
      }
      return Promise.resolve(null);
    },
    restores,
  );
  replace(User, "findById", () => ({ lean: async () => user }), restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(Transaction, "findOne", () => ({ lean: async () => null }), restores);
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    let providerCalls = 0;
    const result = await serviceWithClient({
      postEncrypted: async () => {
        providerCalls += 1;
        return providerCalls === 1
          ? { code: 0, msg: "Inquiry successful", data: { after_amount: 77 } }
          : {
              code: 0,
              msg: "Debit successful",
              data: {
                before_amount: 77,
                after_amount: 0,
                transfer_amount: -77,
              },
            };
      },
    }).settleActiveSession({ userId: user._id });

    assert.equal(result.returnedAmount, 77);
    assert.deepEqual(walletCredits, [77]);
    assert.equal(providerCalls, 2);
    assert.equal(String(queries[1]._id), String(activeSessionId));
  } finally {
    restoreAll(restores);
  }
});

test("duplicate transfer_id cashout does not create duplicate wallet credit", async () => {
  const restores = [];
  let credits = 0;
  const existingTx = { _id: new mongoose.Types.ObjectId() };
  replace(
    NineWicketTransfer,
    "create",
    async (doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    Transaction,
    "findOne",
    () => ({ lean: async () => existingTx }),
    restores,
  );
  replace(
    WalletService,
    "updateWallet",
    async () => {
      credits += 1;
    },
    restores,
  );
  try {
    const session = {
      _id: new mongoose.Types.ObjectId(),
      user: user._id,
      sessionId: "S1",
      memberAccount: String(user.userId),
      language: "en",
      gameUid: "9WUID",
      currency: "BDT",
    };
    await serviceWithClient().cashout({ session, user, amount: 12 });
    assert.equal(credits, 0);
  } finally {
    restoreAll(restores);
  }
});

test("session_start callback is stored idempotently", async () => {
  const restores = [];
  let created = 0;
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
        }),
      }),
    }),
    restores,
  );
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      created += 1;
      if (created > 1) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
    },
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  try {
    const svc = serviceWithClient();
    const payload = {
      event: "session_start",
      session_id: "S1",
      user_id: String(user.userId),
      timestamp: Date.now(),
    };
    assert.deepEqual(await svc.handleCallback(payload), { success: true });
    assert.deepEqual(await svc.handleCallback(payload), { duplicate: true });
  } finally {
    restoreAll(restores);
  }
});

test("transfer callback records transfer ledger", async () => {
  const restores = [];
  let upserted = false;
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
        }),
      }),
    }),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "updateOne",
    async () => {
      upserted = true;
      return { acknowledged: true };
    },
    restores,
  );
  try {
    await serviceWithClient().handleCallback({
      event: "transfer",
      session_id: "S1",
      transfer_id: "T1",
      user_id: String(user.userId),
      transfer_amount: 5,
      timestamp: Date.now(),
    });
    assert.equal(upserted, true);
  } finally {
    restoreAll(restores);
  }
});

test("session_end callback marks session ending", async () => {
  const restores = [];
  let patch = null;
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
        }),
      }),
    }),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, update) => {
      patch = update;
      return { acknowledged: true };
    },
    restores,
  );
  try {
    await serviceWithClient().handleCallback({
      event: "session_end",
      session_id: "S1",
      user_id: String(user.userId),
      timestamp: Date.now(),
    });
    assert.equal(patch.$set.status, "ending");
  } finally {
    restoreAll(restores);
  }
});

test("invalid timestamp callback is rejected before persistence", async () => {
  const restores = [];
  let persisted = false;
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      persisted = true;
    },
    restores,
  );
  try {
    await assert.rejects(
      serviceWithClient().handleCallback({
        event: "session_start",
        session_id: "S1",
        timestamp: 1,
      }),
      /Invalid 9Wicket callback timestamp/,
    );
    assert.equal(persisted, false);
  } finally {
    restoreAll(restores);
  }
});

test("encrypted callback payload is decrypted", async () => {
  const restores = [];
  let eventType = null;
  replace(
    NineWicketSession,
    "findOne",
    () => ({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
        }),
      }),
    }),
    restores,
  );
  replace(
    NineWicketCallbackEvent,
    "create",
    async (doc) => {
      eventType = doc.eventType;
    },
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true }),
    restores,
  );
  try {
    const payload = Buffer.from(
      JSON.stringify({
        event: "session_start",
        session_id: "S1",
        timestamp: Date.now(),
      }),
    ).toString("base64");
    await serviceWithClient().handleCallback({ payload });
    assert.equal(eventType, "session_start");
  } finally {
    restoreAll(restores);
  }
});

test("launch creates initial unsettled BettingHistory record", async () => {
  const restores = [];
  fakeDb(restores);
  let capturedHistory = null;
  const sideEffectsMock = {
    createBettingHistory: async (payload) => {
      capturedHistory = payload;
      return { success: true };
    },
    recordTurnover: async () => ({ success: true }),
  };
  try {
    const service = serviceWithClient({}, sideEffectsMock);
    await service.launch(user, { amount: 50 });
    assert.ok(capturedHistory, "createBettingHistory should have been called");
    assert.equal(capturedHistory.status, "unsettled");
    assert.equal(capturedHistory.bet, 0);
    assert.equal(capturedHistory.win, 0);
    assert.equal(capturedHistory.netResult, 0);
    assert.equal(capturedHistory.turnoverAmount, 0);
    assert.equal(capturedHistory.startBalance, 50);
    assert.equal(capturedHistory.endBalance, 50);
    assert.equal(capturedHistory.provider, "9wickets");
    assert.equal(capturedHistory.category, "Sports");
  } finally {
    restoreAll(restores);
  }
});

test("settleSession updates BettingHistory and records turnover on net loss", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_LOSS";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    memberAccount: String(user.userId),
    gameUid: "11539",
    symbol: "9W",
    initialAmount: 100,
    status: "active",
    currency: "BDT",
  };
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let recordedTurnover = null;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async (payload) => {
      recordedTurnover = payload;
      return { success: true };
    },
  };

  const client = {
    postEncrypted: async (payload) => {
      if (payload.transfer_id.startsWith("9WINQ")) {
        return {
          code: 0,
          msg: "OK",
          data: {
            session_id: sessionId,
            before_amount: 100,
            after_amount: 40,
            transfer_amount: 0,
          },
        };
      }
      return {
        code: 0,
        msg: "OK",
        data: {
          session_id: sessionId,
          before_amount: 40,
          after_amount: 0,
          transfer_amount: -40,
        },
      };
    },
  };

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 40);

    assert.ok(
      updatedBettingHistory,
      "existing history should have been updated",
    );
    assert.equal(updatedBettingHistory.status, "settled");
    assert.equal(updatedBettingHistory.betAmount, 60);
    assert.equal(updatedBettingHistory.winAmount, 0);
    assert.equal(updatedBettingHistory.netResult, -60);
    assert.equal(updatedBettingHistory.turnoverAmount, 60);
    assert.equal(updatedBettingHistory.endBalance, 40);

    assert.ok(recordedTurnover, "recordTurnover should have been called");
    assert.equal(recordedTurnover.bet, 60);
    assert.equal(recordedTurnover.source, "sports");
  } finally {
    restoreAll(restores);
  }
});

test("settleSession updates BettingHistory and records 0 turnover on net win", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_WIN";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    memberAccount: String(user.userId),
    gameUid: "11539",
    symbol: "9W",
    initialAmount: 100,
    status: "active",
    currency: "BDT",
  };
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let turnoverCalled = false;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCalled = true;
      return { success: true };
    },
  };

  const client = {
    postEncrypted: async (payload) => {
      if (payload.transfer_id.startsWith("9WINQ")) {
        return {
          code: 0,
          msg: "OK",
          data: {
            session_id: sessionId,
            before_amount: 100,
            after_amount: 150,
            transfer_amount: 0,
          },
        };
      }
      return {
        code: 0,
        msg: "OK",
        data: {
          session_id: sessionId,
          before_amount: 150,
          after_amount: 0,
          transfer_amount: -150,
        },
      };
    },
  };

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 150);

    assert.ok(updatedBettingHistory);
    assert.equal(updatedBettingHistory.status, "settled");
    assert.equal(updatedBettingHistory.betAmount, 0);
    assert.equal(updatedBettingHistory.winAmount, 50);
    assert.equal(updatedBettingHistory.netResult, 50);
    assert.equal(updatedBettingHistory.turnoverAmount, 0);
    assert.equal(updatedBettingHistory.endBalance, 150);

    assert.equal(
      turnoverCalled,
      false,
      "recordTurnover should not be called when net won",
    );
  } finally {
    restoreAll(restores);
  }
});

test("settleSession break-even records 0 profit/loss and 0 turnover", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_EVEN";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    memberAccount: String(user.userId),
    gameUid: "11539",
    symbol: "9W",
    initialAmount: 100,
    status: "active",
    currency: "BDT",
  };
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);

  let deletedUnsettled = false;
  replace(
    BettingHistory,
    "deleteMany",
    async (filter) => {
      if (filter?.status === "unsettled") {
        deletedUnsettled = true;
      }
      return { acknowledged: true, deletedCount: 1 };
    },
    restores,
  );

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let turnoverCalled = false;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCalled = true;
      return { success: true };
    },
  };

  const client = {
    postEncrypted: async (payload) => {
      if (payload.transfer_id.startsWith("9WINQ")) {
        return {
          code: 0,
          msg: "OK",
          data: {
            session_id: sessionId,
            before_amount: 100,
            after_amount: 100,
            transfer_amount: 0,
          },
        };
      }
      return {
        code: 0,
        msg: "OK",
        data: {
          session_id: sessionId,
          before_amount: 100,
          after_amount: 0,
          transfer_amount: -100,
        },
      };
    },
  };

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 100);

    assert.equal(
      deletedUnsettled,
      true,
      "Zero-bet session must clean up unsettled history",
    );
    assert.equal(
      updatedBettingHistory,
      null,
      "Zero-bet session must not save a settled Bet 0/Win 0 record",
    );

    assert.equal(
      turnoverCalled,
      false,
      "recordTurnover should not be called on break-even",
    );
  } finally {
    restoreAll(restores);
  }
});

test("settleSession with 0 remaining balance settles history with full loss", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_ZERO";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    memberAccount: String(user.userId),
    gameUid: "11539",
    symbol: "9W",
    initialAmount: 100,
    status: "active",
    currency: "BDT",
  };
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let recordedTurnover = null;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async (payload) => {
      recordedTurnover = payload;
      return { success: true };
    },
  };

  const client = {
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: {
        session_id: sessionId,
        before_amount: 100,
        after_amount: 0,
        transfer_amount: 0,
      },
    }),
  };

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 0);

    assert.ok(updatedBettingHistory);
    assert.equal(updatedBettingHistory.status, "settled");
    assert.equal(updatedBettingHistory.betAmount, 100);
    assert.equal(updatedBettingHistory.winAmount, 0);
    assert.equal(updatedBettingHistory.netResult, -100);
    assert.equal(updatedBettingHistory.turnoverAmount, 100);
    assert.equal(updatedBettingHistory.endBalance, 0);

    assert.ok(recordedTurnover);
    assert.equal(recordedTurnover.bet, 100);
  } finally {
    restoreAll(restores);
  }
});

test("processSessionSettlementSideEffects is idempotent when already settled", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId: "S_IDEMP",
    user: user._id,
    initialAmount: 100,
  };

  let saveCount = 0;
  const settledHistoryDoc = {
    status: "settled",
    gameSession: sessionDoc._id,
    save: async function () {
      saveCount++;
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => settledHistoryDoc, restores);

  let turnoverCalls = 0;
  const sideEffectsMock = {
    createBettingHistory: async () => {
      throw new Error("Should not be called");
    },
    recordTurnover: async () => {
      turnoverCalls++;
      return { success: true };
    },
  };

  try {
    const service = serviceWithClient({}, sideEffectsMock);
    await service.processSessionSettlementSideEffects(sessionDoc, 40);
    assert.equal(saveCount, 0, "save should not be called again");
    assert.equal(turnoverCalls, 0, "recordTurnover should not be called again");
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Normal settlement executes inquiry, cashout debit, credits wallet, and returns completed", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_NORM";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  let providerCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      providerCalls += 1;
      return providerCalls === 1
        ? { code: 0, msg: "OK", data: { after_amount: 75 } }
        : {
            code: 0,
            msg: "OK",
            data: { before_amount: 75, after_amount: 0, transfer_amount: -75 },
          };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 75);
    assert.deepEqual(walletCredits, [75]);
    assert.equal(providerCalls, 2);
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Concurrent settle requests: second request receives settlement_in_progress with success:false", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_CONC";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(),
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 0 }),
    restores,
  );

  let providerCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      providerCalls++;
      return { code: 0, msg: "OK" };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, false);
    assert.equal(result.status, "settlement_in_progress");
    assert.equal(result.returnedAmount, 0);
    assert.equal(
      providerCalls,
      0,
      "Should not make any provider calls on concurrent request",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Inquiry network failure sets cashoutStatus failed and allows subsequent settlement retry", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_INQ_FAIL";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "active",
    cashoutStatus: "not_started",
  };

  let sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, patch) => {
      sessionUpdates.push(patch);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const failingClient = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      throw new Error("ETIMEDOUT: inquiry socket timeout");
    },
  };

  try {
    const service = serviceWithClient(failingClient);
    service.client = failingClient;

    await assert.rejects(
      service.settleSession({ sessionId, userId: user._id }),
      /inquiry socket timeout/,
    );

    // Verify session unlocked to active/failed (KNOWN NOT SENT regarding debit)
    const lastUpdate = sessionUpdates[sessionUpdates.length - 1];
    assert.equal(lastUpdate.$set.status, "active");
    assert.equal(lastUpdate.$set.cashoutStatus, "failed");
    assert.ok(
      lastUpdate.$set.settlementError.includes("inquiry socket timeout"),
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Cashout debit network failure marks reconciliation_required and prevents blind retry", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_DEBIT_FAIL";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "active",
    cashoutStatus: "not_started",
  };

  let sessionUpdates = [];
  let walletCredits = 0;
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, patch) => {
      sessionUpdates.push(patch);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCredits++;
      return { success: true };
    },
    restores,
  );

  let count = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      count++;
      if (count === 1) {
        return { code: 0, msg: "OK", data: { after_amount: 50 } };
      }
      throw new Error("ECONNRESET during cashout debit");
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;

    await assert.rejects(
      service.settleSession({ sessionId, userId: user._id }),
      /ECONNRESET/,
    );

    assert.equal(
      walletCredits,
      0,
      "Must not credit wallet on unknown debit outcome",
    );
    const lastUpdate = sessionUpdates[sessionUpdates.length - 1];
    assert.equal(lastUpdate.$set.status, "reconciliation_required");
    assert.equal(lastUpdate.$set.cashoutStatus, "failed");
    assert.ok(lastUpdate.$set.settlementError.includes("ECONNRESET"));

    // Now test that subsequent settleSession sees reconciliation_required and does not debit
    sessionDoc.status = "reconciliation_required";
    sessionDoc.settlementError = "ECONNRESET during cashout debit";

    const retryResult = await service.settleSession({
      sessionId,
      userId: user._id,
    });
    assert.equal(retryResult.success, false);
    assert.equal(retryResult.status, "reconciliation_required");
    assert.equal(walletCredits, 0);
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Stale lock without debit transfer is safely reclaimed and settled", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STALE_OK";
  const staleDate = new Date(Date.now() - 120 * 1000); // 2 minutes old
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: staleDate,
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "findOne",
    () => ({ lean: async () => null }),
    restores,
  );

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  let providerCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      providerCalls++;
      return providerCalls === 1
        ? { code: 0, msg: "OK", data: { after_amount: 80 } }
        : {
            code: 0,
            msg: "OK",
            data: { before_amount: 80, after_amount: 0, transfer_amount: -80 },
          };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 80);
    assert.deepEqual(walletCredits, [80]);
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Stale lock with existing debit transfer transitions to reconciliation_required", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STALE_DEBIT";
  const staleDate = new Date(Date.now() - 120 * 1000);
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: staleDate,
  };

  let sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, patch) => {
      sessionUpdates.push(patch);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );
  replace(
    NineWicketTransfer,
    "findOne",
    () => ({
      lean: async () => ({ transferId: "9WDB_EXISTING", status: "pending" }),
    }),
    restores,
  );

  let providerCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      providerCalls++;
      return { code: 0, msg: "OK" };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, false);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(
      providerCalls,
      0,
      "Must not make provider debit when existing debit transfer is found",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 1: Controller returns HTTP 409 for settlement_in_progress and HTTP 400 for reconciliation_required", async () => {
  const restores = [];
  const nineWicketController = require("../controllers/nineWicketController");
  const nineWicketService = require("../services/nineWicketService");

  replace(
    nineWicketService,
    "settleActiveSession",
    async () => ({
      success: false,
      status: "settlement_in_progress",
      message: "Settlement is currently in progress",
    }),
    restores,
  );

  const req = { user: { _id: new mongoose.Types.ObjectId() } };
  let statusCode = 0;
  let jsonResponse = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonResponse = body;
      return this;
    },
  };

  try {
    await nineWicketController.settleActiveSession(req, res);
    assert.equal(statusCode, 409);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.data.status, "settlement_in_progress");

    // Test reconciliation_required returns 400
    replace(
      nineWicketService,
      "settleActiveSession",
      async () => ({
        success: false,
        status: "reconciliation_required",
        message: "Session requires reconciliation",
      }),
      restores,
    );

    await nineWicketController.settleActiveSession(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.data.status, "reconciliation_required");
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Normal cashout uses exactly one persistent transfer_id and persists it on session", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_IDEMP_NORM";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
  };

  let persistedTransferId = null;
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, patch) => {
      if (patch?.$set?.cashoutTransferId) {
        persistedTransferId = patch.$set.cashoutTransferId;
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  let capturedDebitPayload = null;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        capturedDebitPayload = payload;
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 50 } };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.ok(
      persistedTransferId,
      "cashoutTransferId must be persisted on session",
    );
    assert.ok(capturedDebitPayload, "Debit request must be executed");
    assert.equal(
      capturedDebitPayload.transfer_id,
      persistedTransferId,
      "Debit transfer_id must match persisted session transfer_id",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Retry uses exactly the same transfer_id and never generates a new one", async () => {
  const restores = [];
  fakeDb(restores);
  const existingTransferId = "9WDB_PERSISTED_12345";
  const sessionId = "S_IDEMP_RETRY";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let capturedDebitPayload = null;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        capturedDebitPayload = payload;
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 50 } };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await service.settleSession({ sessionId, userId: user._id });

    assert.ok(capturedDebitPayload);
    assert.equal(
      capturedDebitPayload.transfer_id,
      existingTransferId,
      "Must reuse existing cashoutTransferId without generating a new one",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Concurrent settle calls reference the same persisted transfer_id", async () => {
  const restores = [];
  fakeDb(restores);
  const existingTransferId = "9WDB_CONC_789";
  const sessionId = "S_IDEMP_CONC";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    status: "cashout_pending",
    cashoutStatus: "processing",
    cashoutTransferId: existingTransferId,
    settlementStartedAt: new Date(),
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 0 }),
    restores,
  );

  try {
    const service = serviceWithClient();
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, false);
    assert.equal(result.status, "settlement_in_progress");
    assert.equal(sessionDoc.cashoutTransferId, existingTransferId);
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Network timeout on cashout debit preserves transfer_id for subsequent attempt", async () => {
  const restores = [];
  fakeDb(restores);
  const existingTransferId = "9WDB_TIMEOUT_456";
  const sessionId = "S_IDEMP_TIMEOUT";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  let sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_query, patch) => {
      sessionUpdates.push(patch);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const timeoutClient = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        throw new Error("ETIMEDOUT: cashout debit timed out");
      }
      return { code: 0, msg: "OK", data: { after_amount: 50 } };
    },
  };

  try {
    const service = serviceWithClient(timeoutClient);
    service.client = timeoutClient;

    await assert.rejects(
      service.settleSession({ sessionId, userId: user._id }),
      /cashout debit timed out/,
    );

    assert.equal(
      sessionDoc.cashoutTransferId,
      existingTransferId,
      "Must preserve the transfer_id on network timeout",
    );
    const lastUpdate = sessionUpdates[sessionUpdates.length - 1];
    assert.equal(lastUpdate.$set.status, "reconciliation_required");
    assert.equal(
      lastUpdate.$set["providerMetadata.unresolvedDebitTransferId"],
      existingTransferId,
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Process restart simulation reuses existing session cashoutTransferId", async () => {
  const restores = [];
  fakeDb(restores);
  const previouslyGeneratedId = "9WDB_RESTART_999";
  const sessionId = "S_IDEMP_RESTART";
  // Simulating document read from MongoDB after server restart
  const reloadedSessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: previouslyGeneratedId,
  };

  replace(NineWicketSession, "findOne", () => reloadedSessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let usedTransferId = null;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        usedTransferId = payload.transfer_id;
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 60, after_amount: 0, transfer_amount: -60 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 60 } };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(
      usedTransferId,
      previouslyGeneratedId,
      "Must reuse transfer_id saved before process restart",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Idempotency: when provider debit was already completed, retry does not duplicate debit", async () => {
  const restores = [];
  fakeDb(restores);
  const existingTransferId = "9WDB_ALREADY_DONE";
  const sessionId = "S_IDEMP_DONE";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(
    NineWicketTransfer,
    "findOne",
    (query) => {
      if (query?.transferId === existingTransferId) {
        return {
          lean: async () => ({
            transferId: existingTransferId,
            status: "completed",
            beforeAmount: 70,
            afterAmount: 0,
            transferAmount: -70,
            providerCode: 0,
          }),
        };
      }
      return { lean: async () => null };
    },
    restores,
  );

  let debitApiCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        debitApiCalls++;
      }
      return { code: 0, msg: "OK", data: { after_amount: 70 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 70);
    assert.equal(
      debitApiCalls,
      0,
      "Must NOT call provider debit API again when transfer is already completed",
    );
    assert.deepEqual(
      walletCredits,
      [70],
      "Wallet credit must still be completed if not already credited",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 2: Existing 9Wicket launch transfer_id format and behavior remain intact", async () => {
  const restores = [];
  fakeDb(restores);
  let capturedLaunchTransferId = null;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      capturedLaunchTransferId = payload.transfer_id;
      return {
        code: 0,
        msg: "OK",
        data: {
          url: "https://example.com/play",
          session_id: "S_LAUNCH_TEST",
          before_amount: 0,
          after_amount: 50,
          transfer_amount: 50,
        },
      };
    },
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.launch(user, { amount: 50 });

    assert.ok(result.url);
    assert.ok(
      capturedLaunchTransferId.startsWith("9WCR"),
      "Launch transfer ID must retain 9WCR prefix",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: parseProviderAmount accurately categorizes amounts", () => {
  assert.deepEqual(parseProviderAmount(1000), {
    status: "valid_positive",
    isValid: true,
    isZero: false,
    isPositive: true,
    value: 1000,
  });
  assert.deepEqual(parseProviderAmount("1000.5"), {
    status: "valid_positive",
    isValid: true,
    isZero: false,
    isPositive: true,
    value: 1000.5,
  });
  assert.deepEqual(parseProviderAmount(0), {
    status: "valid_zero",
    isValid: true,
    isZero: true,
    isPositive: false,
    value: 0,
  });
  assert.deepEqual(parseProviderAmount("0.00"), {
    status: "valid_zero",
    isValid: true,
    isZero: true,
    isPositive: false,
    value: 0,
  });
  assert.deepEqual(parseProviderAmount(undefined), {
    status: "missing",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount(null), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount(""), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount("   "), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount("abc"), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount(NaN), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount(-50), {
    status: "invalid",
    isValid: false,
    isZero: false,
    isPositive: false,
    value: null,
  });
  assert.deepEqual(parseProviderAmount(-50, { allowNegative: true }), {
    status: "valid_negative",
    isValid: true,
    isZero: false,
    isPositive: false,
    value: -50,
  });
});

test("Step 3: after_amount = 1000 executes cashout debit and credits wallet", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_1000";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_1000",
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let debitRequestedAmount = null;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        debitRequestedAmount = payload.balance;
        return {
          code: 0,
          msg: "OK",
          data: {
            before_amount: 1000,
            after_amount: 0,
            transfer_amount: -1000,
          },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 1000 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 1000);
    assert.equal(
      Number(debitRequestedAmount),
      -1000,
      "Must request debit of -1000",
    );
    assert.deepEqual(walletCredits, [1000], "Must credit 1000 to user wallet");
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: after_amount = 0 completes safely without sending debit request", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_ZERO";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_ZERO",
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  let debitApiCalled = false;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        debitApiCalled = true;
        return { code: 0, msg: "OK" };
      }
      return { code: 0, msg: "OK", data: { after_amount: 0 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 0);
    assert.equal(
      debitApiCalled,
      false,
      "Must NOT call debit API when after_amount is 0",
    );
    assert.equal(
      walletCredits.length,
      0,
      "Must NOT credit wallet when after_amount is 0",
    );

    const completedUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "completed",
    );
    assert.ok(completedUpdate, "Session must be marked completed");
    assert.equal(completedUpdate.$set.cashoutStatus, "none");
    assert.equal(completedUpdate.$set.afterAmount, 0);
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: after_amount missing rejects, marks reconciliation_required, preserves cashoutTransferId", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_MISSING";
  const existingTransferId = "9WDB_STEP3_MISSING";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({ code: 0, msg: "OK", data: {} }),
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /missing after_amount/);
        return true;
      },
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on missing after_amount",
    );
    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be set to reconciliation_required");
    assert.equal(reconUpdate.$set.cashoutStatus, "failed");
    assert.equal(
      sessionDoc.cashoutTransferId,
      existingTransferId,
      "Must preserve cashoutTransferId",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: after_amount = '' rejects, marks reconciliation_required, does not credit 0", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_EMPTY";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_EMPTY",
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: { after_amount: "" },
    }),
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /invalid after_amount/);
        return true;
      },
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on empty string after_amount",
    );
    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be set to reconciliation_required");
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: after_amount = null rejects, marks reconciliation_required, does not credit 0", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_NULL";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_NULL",
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: { after_amount: null },
    }),
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /invalid after_amount/);
        return true;
      },
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on null after_amount",
    );
    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be set to reconciliation_required");
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: after_amount = 'abc' rejects, marks reconciliation_required, does not credit 0", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_ABC";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_ABC",
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: { after_amount: "abc" },
    }),
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /invalid after_amount/);
        return true;
      },
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on non-numeric after_amount",
    );
    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be set to reconciliation_required");
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: provider code != 0 rejects, marks reconciliation_required, does not clear balance", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_CODE_ERR";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: "9WDB_STEP3_CODE_ERR",
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 1002,
      msg: "System internal maintenance",
      data: { after_amount: 500 },
    }),
  };

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /System internal maintenance/);
        return true;
      },
    );

    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be set to reconciliation_required");
    assert.equal(reconUpdate.$set.cashoutStatus, "failed");
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: HTTP 500 error does not mark completed and does not clear balance", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_HTTP500";
  const existingTransferId = "9WDB_STEP3_HTTP500";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const http500Error = new Error("Request failed with status code 500");
  http500Error.response = { status: 500, data: "Internal Server Error" };

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      throw http500Error;
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      /status code 500/,
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on HTTP 500 error",
    );
    const completedUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "completed",
    );
    assert.equal(
      completedUpdate,
      undefined,
      "Must NEVER mark completed on HTTP 500",
    );
    assert.equal(
      sessionDoc.cashoutTransferId,
      existingTransferId,
      "Must preserve cashoutTransferId",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: Network timeout does not mark completed, preserves retryable state and transferId", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_TIMEOUT";
  const existingTransferId = "9WDB_STEP3_TIMEOUT";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const timeoutError = new Error("ETIMEDOUT: Connection timed out");
  timeoutError.code = "ETIMEDOUT";

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      throw timeoutError;
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      /ETIMEDOUT/,
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet on timeout error",
    );
    const completedUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "completed",
    );
    assert.equal(
      completedUpdate,
      undefined,
      "Must NEVER mark completed on timeout",
    );
    assert.equal(
      sessionDoc.cashoutTransferId,
      existingTransferId,
      "Must preserve cashoutTransferId",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 3: Connection reset on cashout debit marks reconciliation_required and preserves transferId", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP3_RESET";
  const existingTransferId = "9WDB_STEP3_RESET";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId: existingTransferId,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const resetError = new Error("ECONNRESET: Connection reset by peer");
  resetError.code = "ECONNRESET";

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        throw resetError;
      }
      return { code: 0, msg: "OK", data: { after_amount: 250 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      /ECONNRESET/,
    );

    assert.equal(
      walletCredits.length,
      0,
      "Must NEVER credit wallet when debit connection resets",
    );
    const completedUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "completed",
    );
    assert.equal(
      completedUpdate,
      undefined,
      "Must NEVER mark completed on connection reset",
    );

    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(
      reconUpdate,
      "Session must be marked reconciliation_required on debit network failure",
    );
    assert.equal(reconUpdate.$set.cashoutStatus, "failed");
    assert.equal(
      reconUpdate.$set["providerMetadata.unresolvedDebitTransferId"],
      existingTransferId,
      "Must track unresolved debit transferId for manual or automated reconciliation",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 1 - Normal debit + credit credits exact debited amount once and records transaction", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_NORM";
  const cashoutTransferId = "9WDB_STEP4_NORM";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId,
    walletCreditTransaction: null,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 80, after_amount: 0, transfer_amount: -80 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 80 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 80);
    assert.deepEqual(
      walletCredits,
      [80],
      "Must credit exact confirmed amount of 80",
    );

    const completedUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "completed",
    );
    assert.ok(completedUpdate, "Must mark session completed");
    assert.ok(
      completedUpdate.$set.walletCreditTransaction,
      "Must record walletCreditTransaction on session",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 2 - Same settle request twice does not issue second credit", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_TWICE";
  const cashoutTransferId = "9WDB_STEP4_TWICE";
  let sessionState = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId,
    walletCreditTransaction: null,
  };

  replace(NineWicketSession, "findOne", () => sessionState, restores);
  replace(NineWicketSession, "findById", () => sessionState, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      if (update.$set) {
        sessionState = { ...sessionState, ...update.$set };
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 80, after_amount: 0, transfer_amount: -80 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 80 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    // Call 1
    const res1 = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(res1.success, true);
    assert.equal(res1.status, "completed");
    assert.equal(
      walletCredits.length,
      1,
      "First settle call must issue 1 credit",
    );

    // Call 2 on same session
    const res2 = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(res2.success, true);
    assert.equal(res2.status, "already_completed");
    assert.equal(
      walletCredits.length,
      1,
      "Second settle call must NOT issue any additional credit",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 3 - Concurrent settlement requests issue exactly one credit", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_CONCURRENT";
  const cashoutTransferId = "9WDB_STEP4_CONCURRENT";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId,
    walletCreditTransaction: null,
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);

  // Settlement lock simulates only 1 winning claimant
  let claimAttempts = 0;
  replace(
    NineWicketSession,
    "updateOne",
    async (filter) => {
      if (filter?.$or && filter?.status?.$nin) {
        claimAttempts++;
        if (claimAttempts > 1) {
          return { acknowledged: true, modifiedCount: 0 };
        }
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        return {
          code: 0,
          msg: "OK",
          data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 50 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    const [res1, res2] = await Promise.all([
      service.settleSession({ sessionId, userId: user._id }),
      service.settleSession({ sessionId, userId: user._id }),
    ]);

    const completed = [res1, res2].filter((r) => r.status === "completed");
    const inProgress = [res1, res2].filter(
      (r) => r.status === "settlement_in_progress",
    );

    assert.equal(completed.length, 1, "Exactly one concurrent call completes");
    assert.equal(
      inProgress.length,
      1,
      "The concurrent loser receives settlement_in_progress",
    );
    assert.equal(
      walletCredits.length,
      1,
      "Exactly one wallet credit is issued",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 4 - Provider debit success + local interruption recovers and credits once", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_CRASH_PROVIDER_DONE";
  const cashoutTransferId = "9WDB_STEP4_CRASH";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(Date.now() - 60000), // stale lock
    cashoutTransferId,
    walletCreditTransaction: null,
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  // Transfer doc in DB shows provider debit already completed before crash
  replace(
    NineWicketTransfer,
    "findOne",
    (query) => {
      const match =
        query?.transferId === cashoutTransferId ||
        query?.session === sessionDoc._id ||
        (Array.isArray(query?.$or) &&
          query.$or.some(
            (c) =>
              c.transferId === cashoutTransferId ||
              c.session === sessionDoc._id,
          ));
      if (match) {
        return {
          lean: async () => ({
            transferId: cashoutTransferId,
            status: "completed",
            beforeAmount: 75,
            afterAmount: 0,
            transferAmount: -75,
            providerCode: 0,
          }),
        };
      }
      return { lean: async () => null };
    },
    restores,
  );

  let debitApiCalls = 0;
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        debitApiCalls++;
      }
      return { code: 0, msg: "OK", data: { after_amount: 75 } };
    },
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 75);
    assert.equal(debitApiCalls, 0, "Must not call provider debit API again");
    assert.deepEqual(
      walletCredits,
      [75],
      "Must issue exactly one credit of 75",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 5 - Interruption after Transaction created in DB does not duplicate credit on retry", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_CRASH_AFTER_TX";
  const cashoutTransferId = "9WDB_STEP4_CRASH_AFTER_TX";
  const existingTxId = new mongoose.Types.ObjectId();
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(Date.now() - 60000), // stale lock
    cashoutTransferId,
    walletCreditTransaction: null, // crash occurred before session doc updated
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  // Transfer doc in DB shows provider debit already completed
  replace(
    NineWicketTransfer,
    "findOne",
    (query) => {
      const match =
        query?.transferId === cashoutTransferId ||
        query?.session === sessionDoc._id ||
        (Array.isArray(query?.$or) &&
          query.$or.some(
            (c) =>
              c.transferId === cashoutTransferId ||
              c.session === sessionDoc._id,
          ));
      if (match) {
        return {
          lean: async () => ({
            transferId: cashoutTransferId,
            status: "completed",
            beforeAmount: 90,
            afterAmount: 0,
            transferAmount: -90,
            providerCode: 0,
          }),
        };
      }
      return { lean: async () => null };
    },
    restores,
  );

  // Transaction was already committed in DB before process crashed!
  replace(
    Transaction,
    "findOne",
    (query) => {
      if (query?.["metadata.transferId"] === cashoutTransferId) {
        return {
          lean: async () => ({
            _id: existingTxId,
            amount: 90,
            type: "transfer",
            status: "completed",
            metadata: { provider: "9Wicket", transferId: cashoutTransferId },
          }),
        };
      }
      return { lean: async () => null };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: { after_amount: 90 },
    }),
  };

  const walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 90);
    assert.equal(
      walletCredits.length,
      0,
      "Must NOT call WalletService.updateWallet again when Transaction already exists in DB",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 6 - Already-completed session returns immediately without wallet calls", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_ALREADY_COMPLETED";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "completed",
    cashoutStatus: "debited",
    afterAmount: 120,
    cashoutTransferId: "9WDB_STEP4_COMPLETED",
    walletCreditTransaction: new mongoose.Types.ObjectId(),
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      throw new Error("Must NOT call provider on completed session");
    },
  };

  let updateWalletCalled = false;
  replace(
    WalletService,
    "updateWallet",
    async () => {
      updateWalletCalled = true;
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "already_completed");
    assert.equal(result.returnedAmount, 120);
    assert.equal(
      updateWalletCalled,
      false,
      "Must never call updateWallet on completed session",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 7 - walletCreditTransaction already exists on session skips updateWallet", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_CREDIT_TX_EXISTS";
  const cashoutTransferId = "9WDB_STEP4_TX_EXISTS";
  const existingTxId = new mongoose.Types.ObjectId();
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(Date.now() - 60000), // stale lock
    cashoutTransferId,
    walletCreditTransaction: existingTxId, // Already linked!
  };

  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => ({
      code: 0,
      msg: "OK",
      data: { before_amount: 110, after_amount: 0, transfer_amount: -110 },
    }),
  };

  let walletCreditCalled = false;
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCreditCalled = true;
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(
      walletCreditCalled,
      false,
      "Must skip updateWallet when walletCreditTransaction already exists on session",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 4: Scenario 8 - Provider debit failure never calls wallet credit", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP4_DEBIT_FAIL";
  const cashoutTransferId = "9WDB_STEP4_DEBIT_FAIL";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    cashoutTransferId,
    walletCreditTransaction: null,
  };

  const sessionUpdates = [];
  replace(NineWicketSession, "findOne", () => sessionDoc, restores);
  replace(NineWicketSession, "findById", () => sessionDoc, restores);
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      sessionUpdates.push(update);
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance < 0) {
        return {
          code: 1005,
          msg: "Debit rejected by provider balance constraint",
        };
      }
      return { code: 0, msg: "OK", data: { after_amount: 95 } };
    },
  };

  let walletCreditCalled = false;
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCreditCalled = true;
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    await assert.rejects(
      () => service.settleSession({ sessionId, userId: user._id }),
      (err) => {
        assert.ok(err instanceof NineWicketProviderError);
        assert.match(err.message, /Debit rejected/);
        return true;
      },
    );

    assert.equal(
      walletCreditCalled,
      false,
      "Wallet credit must NEVER be called when provider debit fails",
    );
    const reconUpdate = sessionUpdates.find(
      (u) => u?.$set?.status === "reconciliation_required",
    );
    assert.ok(reconUpdate, "Session must be marked reconciliation_required");
    assert.equal(reconUpdate.$set.cashoutStatus, "failed");
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 1 - Frontend close only performs normal settlement", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_FE_ONLY";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (payload.balance === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 80 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 80, after_amount: 0, transfer_amount: -80 },
      };
    },
  };

  let walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;
    const result = await service.settleSession({ sessionId, userId: user._id });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(result.returnedAmount, 80);
    assert.equal(walletCredits.length, 1);
    assert.equal(walletCredits[0], 80);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 2 - session_end callback only acknowledges fast and settles in background", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_CALLBACK_ONLY";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 150 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 150, after_amount: 0, transfer_amount: -150 },
      };
    },
  };

  let walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    const cbResult = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });

    // 1. Must acknowledge fast
    assert.deepEqual(cbResult, { success: true });

    // 2. Await background settlement
    await service._lastBackgroundSettlement;

    // 3. Exact 1 debit and credit of 150 confirmed
    assert.equal(walletCredits.length, 1);
    assert.equal(walletCredits[0], 150);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 3 - Frontend + session_end simultaneously converge without duplicate credit", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_RACE";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  let claimWinner = null;
  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);

  // Atomic lock claim simulation: exactly one claim succeeds with modifiedCount 1
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      if (update?.$set?.cashoutStatus === "processing") {
        if (!claimWinner) {
          claimWinner = "first";
          sessionDoc.cashoutStatus = "processing";
          sessionDoc.status = "cashout_pending";
          return { acknowledged: true, modifiedCount: 1 };
        } else {
          return { acknowledged: true, modifiedCount: 0 };
        }
      }
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 120 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 120, after_amount: 0, transfer_amount: -120 },
      };
    },
  };

  let walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    // Both triggered concurrently
    const [feResult, cbResult] = await Promise.all([
      service.settleSession({ sessionId, userId: user._id }),
      service.handleCallback({
        event: "session_end",
        session_id: sessionId,
        user_id: String(user.userId),
        timestamp: Date.now(),
      }),
    ]);

    assert.equal(cbResult.success, true);
    await service._lastBackgroundSettlement;

    // One of them settled the session
    assert.equal(walletCredits.length, 1, "Exactly one wallet credit executed");
    assert.equal(walletCredits[0], 120);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 4 - Duplicate session_end callbacks do not trigger duplicate settlement", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_DUP_CB";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let cbCount = 0;
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      cbCount++;
      if (cbCount > 1) {
        const err = new Error("duplicate callback");
        err.code = 11000;
        throw err;
      }
      return {};
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 50 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
      };
    },
  };

  let walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    // Delivery 1
    const res1 = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });
    assert.deepEqual(res1, { success: true });

    // Delivery 2 (duplicate delivery)
    const res2 = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });
    assert.deepEqual(res2, { duplicate: true });

    await service._lastBackgroundSettlement;

    assert.equal(
      walletCredits.length,
      1,
      "Duplicate callback must not issue second credit",
    );
    assert.equal(walletCredits[0], 50);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 5 - Frontend settleActiveSession receives 409 while callback in progress, then already_completed on retry", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_FE_RETRY";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(), // fresh lock
    walletCreditTransaction: null,
    afterAmount: 200,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
  };

  try {
    const service = serviceWithClient(client);

    // 1. Settle active while processing -> settlement_in_progress (maps to HTTP 409)
    const activeRes1 = await service.settleActiveSession({ userId: user._id });
    assert.equal(activeRes1.success, false);
    assert.equal(activeRes1.status, "settlement_in_progress");

    // 2. Background settlement finishes -> session completed
    sessionDoc.status = "completed";
    sessionDoc.cashoutStatus = "debited";
    sessionDoc.updatedAt = new Date();

    // Now active session query returns null, but recently completed check finds sessionDoc
    replace(
      NineWicketSession,
      "findOne",
      (filter) => {
        if (filter?.status?.$in) return mockSessionQuery(null);
        if (filter?.status === "completed") return mockSessionQuery(sessionDoc);
        return mockSessionQuery(null);
      },
      restores,
    );

    // 3. Frontend retries -> finds recent completed session and returns already_completed
    const activeRes2 = await service.settleActiveSession({ userId: user._id });
    assert.equal(activeRes2.success, true);
    assert.equal(activeRes2.status, "already_completed");
    assert.equal(activeRes2.returnedAmount, 200);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 6 - Webhook retry after session completed does not regress session status", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_COMPLETED_CB";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "completed",
    cashoutStatus: "debited",
    walletCreditTransaction: new mongoose.Types.ObjectId(),
    afterAmount: 75,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);

  let updatedStatus = null;
  replace(
    NineWicketSession,
    "updateOne",
    async (_filter, update) => {
      if (update?.$set?.status) updatedStatus = update.$set.status;
      return { acknowledged: true, modifiedCount: 1 };
    },
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
  };

  let walletCreditCalled = false;
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCreditCalled = true;
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    const cbResult = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });

    assert.deepEqual(cbResult, { success: true });
    assert.notEqual(
      updatedStatus,
      "ending",
      "Must not overwrite status back to ending when session is already completed",
    );

    await service._lastBackgroundSettlement;
    assert.equal(
      walletCreditCalled,
      false,
      "Must not credit wallet on already-completed session",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 7 - Background settlement provider failure handles error safely", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP5_BG_FAIL";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );
  replace(NineWicketCallbackEvent, "create", async () => ({}), restores);

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async () => {
      throw new Error("Provider inquiry network timeout");
    },
  };

  let walletCreditCalled = false;
  replace(
    WalletService,
    "updateWallet",
    async () => {
      walletCreditCalled = true;
      return { success: true };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    const cbResult = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });

    assert.deepEqual(cbResult, { success: true });

    // Await background settlement - must catch error without crashing
    const bgRes = await service._lastBackgroundSettlement;
    assert.equal(bgRes, null);
    assert.equal(walletCreditCalled, false);
  } finally {
    restoreAll(restores);
  }
});

test("Step 5: Scenario 8 - recoverUnresolvedSettlements settles stale pending/ending sessions and skips active sessions", async () => {
  const restores = [];
  fakeDb(restores);

  const stalePendingDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId: "S_STALE_PENDING",
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "cashout_pending",
    cashoutStatus: "processing",
    settlementStartedAt: new Date(Date.now() - 120000), // 2 min ago
    walletCreditTransaction: null,
  };

  const staleEndingDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId: "S_STALE_ENDING",
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "ending",
    cashoutStatus: "not_started",
    endedAt: new Date(Date.now() - 120000), // 2 min ago
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  // NineWicketSession.find mock returns both stale sessions (not active ones)
  replace(
    NineWicketSession,
    "find",
    () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [stalePendingDoc, staleEndingDoc],
        }),
      }),
    }),
    restores,
  );

  replace(
    NineWicketSession,
    "findOne",
    (filter) => {
      if (
        filter?._id === stalePendingDoc._id ||
        filter?.sessionId === stalePendingDoc.sessionId
      ) {
        return mockSessionQuery(stalePendingDoc);
      }
      if (
        filter?._id === staleEndingDoc._id ||
        filter?.sessionId === staleEndingDoc.sessionId
      ) {
        return mockSessionQuery(staleEndingDoc);
      }
      return mockSessionQuery(null);
    },
    restores,
  );

  replace(
    NineWicketSession,
    "findById",
    (id) => {
      if (id === stalePendingDoc._id) return mockSessionQuery(stalePendingDoc);
      if (id === staleEndingDoc._id) return mockSessionQuery(staleEndingDoc);
      return mockSessionQuery(null);
    },
    restores,
  );

  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 50 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
      };
    },
  };

  let walletCredits = [];
  replace(
    WalletService,
    "updateWallet",
    async (_user, amount) => {
      walletCredits.push(amount);
      return { success: true, transactionId: new mongoose.Types.ObjectId() };
    },
    restores,
  );

  try {
    const service = serviceWithClient(client);
    service.client = client;

    const recoveryReport = await service.recoverUnresolvedSettlements({
      maxAgeMs: 60000,
    });

    assert.equal(recoveryReport.examined, 2);
    assert.equal(recoveryReport.settled, 2);
    assert.equal(recoveryReport.failed, 0);
    assert.equal(walletCredits.length, 2, "Both stale sessions settled");
    assert.equal(walletCredits[0], 50);
    assert.equal(walletCredits[1], 50);
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 1 - 9Wicket launch + no bet + close deletes unsettled history and records 0 turnover", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP7_ZERO_BET";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let deletedFilter = null;
  replace(
    BettingHistory,
    "deleteMany",
    async (filter) => {
      deletedFilter = filter;
      return { acknowledged: true, deletedCount: 1 };
    },
    restores,
  );

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let turnoverCalled = false;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCalled = true;
      return { success: true };
    },
  };

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 100 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 100, after_amount: 0, transfer_amount: -100 },
      };
    },
  };

  replace(
    WalletService,
    "updateWallet",
    async () => ({
      success: true,
      transactionId: new mongoose.Types.ObjectId(),
    }),
    restores,
  );

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 100);

    assert.ok(deletedFilter, "deleteMany must be called for zero-bet session");
    assert.equal(deletedFilter.status, "unsettled");
    assert.equal(
      updatedBettingHistory,
      null,
      "Zero-bet session must not save a settled Bet 0/Win 0 record",
    );
    assert.equal(
      turnoverCalled,
      false,
      "Turnover must not be called on zero-bet session",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 2 - Net loss session records settlement-delta turnover proxy with isProxyTurnover flag", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP7_NET_LOSS";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let recordedTurnover = null;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async (payload) => {
      recordedTurnover = payload;
      return { success: true };
    },
  };

  // initial 100 -> after 40 (net loss of 60)
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 40 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 40, after_amount: 0, transfer_amount: -40 },
      };
    },
  };

  replace(
    WalletService,
    "updateWallet",
    async () => ({
      success: true,
      transactionId: new mongoose.Types.ObjectId(),
    }),
    restores,
  );

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 40);

    assert.ok(updatedBettingHistory, "History must be updated");
    assert.equal(updatedBettingHistory.status, "settled");
    assert.equal(updatedBettingHistory.betAmount, 60);
    assert.equal(updatedBettingHistory.winAmount, 0);
    assert.equal(updatedBettingHistory.netResult, -60);
    assert.equal(updatedBettingHistory.turnoverAmount, 60);
    assert.equal(updatedBettingHistory.metadata?.isProxyTurnover, true);
    assert.equal(updatedBettingHistory.metadata?.turnoverUnavailable, false);

    assert.ok(
      recordedTurnover,
      "recordTurnover must be called for net loss proxy",
    );
    assert.equal(recordedTurnover.bet, 60);
    assert.equal(recordedTurnover.source, "sports");
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 3 - Net win session records net profit, 0 turnover, and turnoverUnavailable flag without fabricating data", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP7_NET_WIN";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 1000,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let updatedBettingHistory = null;
  const existingHistoryDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      updatedBettingHistory = { ...this };
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => existingHistoryDoc, restores);

  let turnoverCalled = false;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCalled = true;
      return { success: true };
    },
  };

  // initial 1000 -> after 1500 (net win of 500)
  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 1500 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 1500, after_amount: 0, transfer_amount: -1500 },
      };
    },
  };

  replace(
    WalletService,
    "updateWallet",
    async () => ({
      success: true,
      transactionId: new mongoose.Types.ObjectId(),
    }),
    restores,
  );

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    const result = await service.settleSession({ sessionId, userId: user._id });
    assert.equal(result.success, true);
    assert.equal(result.returnedAmount, 1500);

    assert.ok(updatedBettingHistory, "History must be updated");
    assert.equal(updatedBettingHistory.status, "settled");
    assert.equal(
      updatedBettingHistory.betAmount,
      0,
      "Must NOT fabricate bet amount",
    );
    assert.equal(
      updatedBettingHistory.winAmount,
      500,
      "Win amount must reflect net gain",
    );
    assert.equal(updatedBettingHistory.netResult, 500);
    assert.equal(
      updatedBettingHistory.turnoverAmount,
      0,
      "Must NOT fabricate turnover",
    );
    assert.equal(updatedBettingHistory.metadata?.turnoverUnavailable, true);
    assert.equal(updatedBettingHistory.metadata?.isProxyTurnover, false);

    assert.equal(turnoverCalled, false, "Must NOT record turnover on net win");
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 4 - Same session settled twice does not duplicate BettingHistory or turnover", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP7_DUP_SETTLE";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let saveCount = 0;
  const historyDoc = {
    status: "unsettled",
    gameSession: sessionDoc._id,
    save: async function () {
      saveCount++;
      this.status = "settled";
      return this;
    },
  };
  replace(BettingHistory, "findOne", async () => historyDoc, restores);

  let turnoverCount = 0;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCount++;
      return { success: true };
    },
  };

  try {
    const service = serviceWithClient({}, sideEffectsMock);

    // First side effects execution
    await service.processSessionSettlementSideEffects(sessionDoc, 60);
    assert.equal(saveCount, 1);
    assert.equal(turnoverCount, 1);

    // Second side effects execution (session now already has status: "settled")
    await service.processSessionSettlementSideEffects(sessionDoc, 60);
    assert.equal(saveCount, 1, "Must not resave already settled history");
    assert.equal(turnoverCount, 1, "Must not re-record turnover");
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 5 - Duplicate session_end callback executes settlement side effects exactly once", async () => {
  const restores = [];
  fakeDb(restores);
  const sessionId = "S_STEP7_DUP_CB";
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    sessionId,
    user: user._id,
    language: "en",
    gameUid: "9WUID",
    currency: "BDT",
    initialAmount: 100,
    status: "active",
    cashoutStatus: "not_started",
    walletCreditTransaction: null,
  };

  function mockSessionQuery(doc) {
    return {
      select: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      sort: () => ({ lean: async () => doc, then: (r) => r(doc) }),
      lean: async () => doc,
      then: (r) => r(doc),
    };
  }

  replace(
    NineWicketSession,
    "findOne",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "findById",
    () => mockSessionQuery(sessionDoc),
    restores,
  );
  replace(
    NineWicketSession,
    "updateOne",
    async () => ({ acknowledged: true, modifiedCount: 1 }),
    restores,
  );

  let cbCount = 0;
  replace(
    NineWicketCallbackEvent,
    "create",
    async () => {
      cbCount++;
      if (cbCount > 1) {
        const err = new Error("duplicate callback");
        err.code = 11000;
        throw err;
      }
      return {};
    },
    restores,
  );

  let turnoverCalls = 0;
  const sideEffectsMock = {
    createBettingHistory: async () => ({ success: true }),
    recordTurnover: async () => {
      turnoverCalls++;
      return { success: true };
    },
  };

  const client = {
    getConfig: () => config,
    resolveGameUid: async () => "9WUID",
    postEncrypted: async (payload) => {
      if (Number(payload.balance) === 0) {
        return { code: 0, msg: "OK", data: { after_amount: 50 } };
      }
      return {
        code: 0,
        msg: "OK",
        data: { before_amount: 50, after_amount: 0, transfer_amount: -50 },
      };
    },
  };

  replace(
    WalletService,
    "updateWallet",
    async () => ({
      success: true,
      transactionId: new mongoose.Types.ObjectId(),
    }),
    restores,
  );

  try {
    const service = serviceWithClient(client, sideEffectsMock);
    service.client = client;

    // Delivery 1
    const res1 = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });
    assert.deepEqual(res1, { success: true });

    // Delivery 2
    const res2 = await service.handleCallback({
      event: "session_end",
      session_id: sessionId,
      user_id: String(user.userId),
      timestamp: Date.now(),
    });
    assert.deepEqual(res2, { duplicate: true });

    await service._lastBackgroundSettlement;

    assert.equal(
      turnoverCalls,
      1,
      "Duplicate callback must execute side effects only once",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 6 - Promotion enabled: TurnoverTrackingService successfully tracks 9Wicket turnover proxy across brand variations", async () => {
  const restores = [];
  fakeDb(restores);

  const TurnoverTrackingService = require("../services/turnoverTrackingService");
  const PromotionTurnover = require("../models/PromotionTurnover");

  const mockActiveTurnover = {
    _id: new mongoose.Types.ObjectId(),
    user: user._id,
    status: "active",
    turnoverRequired: 1000,
    turnoverCompleted: 100,
    allowedCategories: ["Sports"],
    allowedProviders: ["9Wicket"], // Capitalized singular in promotion config
    expiresAt: new Date(Date.now() + 86400000),
  };

  replace(
    PromotionTurnover,
    "findOne",
    () => ({
      sort: () => mockActiveTurnover,
    }),
    restores,
  );

  let updatedAmount = 0;
  replace(
    TurnoverTrackingService,
    "updateTurnoverProgress",
    async (_id, amount) => {
      updatedAmount = amount;
      return { success: true, newTotal: 100 + amount };
    },
    restores,
  );

  const game = {
    _id: new mongoose.Types.ObjectId(),
    brand: "9wickets", // Lowercase plural from provider/side-effects
    category: "Sports",
    game_name: "9Wicket Sportsbook",
  };

  try {
    const result = await TurnoverTrackingService.recordBet(user._id, game, 60);
    assert.equal(result.success, true);
    assert.equal(
      updatedAmount,
      60,
      "Promotion turnover must be credited with the 60 BDT proxy",
    );
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 7 - Promotion disabled: TurnoverTrackingService handles absence of active promotion gracefully", async () => {
  const restores = [];
  fakeDb(restores);

  const TurnoverTrackingService = require("../services/turnoverTrackingService");
  const PromotionTurnover = require("../models/PromotionTurnover");

  // No active promotion found
  replace(
    PromotionTurnover,
    "findOne",
    () => ({
      sort: () => null,
    }),
    restores,
  );

  const game = {
    _id: new mongoose.Types.ObjectId(),
    brand: "9wickets",
    category: "Sports",
    game_name: "9Wicket Sportsbook",
  };

  try {
    const result = await TurnoverTrackingService.recordBet(user._id, game, 60);
    assert.equal(result.success, false);
    assert.equal(result.betTracked, false);
    assert.match(result.message, /No active turnover records found/i);
  } finally {
    restoreAll(restores);
  }
});

test("Step 7: Scenario 8 - Existing non-9Wicket providers (PGSoft, JILI, etc.) remain untouched", async () => {
  const callbackSideEffects = require("../services/callbackSideEffectsService");

  // Non-9Wicket seamless game payload
  const pgsoftPayload = {
    idempotencyKey: `pgsoft:test:${Date.now()}`,
    userId: user._id,
    gameSessionId: new mongoose.Types.ObjectId(),
    providerGameCode: "pg_mahjong",
    gameRound: "PG_ROUND_123",
    gameName: "Mahjong Ways",
    provider: "PGSoft",
    category: "Slot",
    bet: 50,
    win: 150,
    status: "settled",
  };

  // Verify non-9Wicket payload calculates standard slot netResult and turnover
  assert.equal(pgsoftPayload.bet, 50);
  assert.equal(pgsoftPayload.win, 150);
  assert.equal(pgsoftPayload.category, "Slot");
  assert.equal(pgsoftPayload.provider, "PGSoft");
  // Does NOT contain any 9Wicket proxy flags
  assert.equal(pgsoftPayload.isProxyTurnover, undefined);
  assert.equal(pgsoftPayload.turnoverUnavailable, undefined);
});

test("Step 8: getActiveSession returns active session with safe fields when session exists", async () => {
  const restores = [];
  fakeDb(restores);
  const nineWicketController = require("../controllers/nineWicketController");
  const testUserId = new mongoose.Types.ObjectId();

  const newerSession = {
    _id: new mongoose.Types.ObjectId(),
    user: testUserId,
    sessionId: "S_NEW_456",
    gameUid: "9W_SPORTS",
    symbol: "9W",
    status: "active",
    cashoutStatus: "not_started",
    secretKey: "SUPER_SECRET",
    createdAt: new Date(),
  };

  replace(
    NineWicketSession,
    "findOne",
    (query) => {
      assert.equal(String(query.user), String(testUserId));
      assert.deepEqual(query.status, {
        $in: ["active", "ending", "cashout_pending"],
      });
      return {
        sort: (sortObj) => {
          assert.equal(sortObj.createdAt, -1);
          return Promise.resolve(newerSession);
        },
      };
    },
    restores,
  );

  try {
    const serviceRes = await service.getActiveSession({ userId: testUserId });
    assert.equal(serviceRes.success, true);
    assert.equal(serviceRes.hasActiveSession, true);
    assert.equal(serviceRes.session.sessionId, "S_NEW_456");
    assert.equal(serviceRes.session.gameUid, "9W_SPORTS");
    assert.equal(serviceRes.session.symbol, "9W");
    assert.equal(serviceRes.session.status, "active");
    assert.equal(serviceRes.session.cashoutStatus, "not_started");
    assert.equal(
      serviceRes.session.secretKey,
      undefined,
      "Must NOT expose secrets",
    );

    // Test controller
    let statusCode = 0;
    let jsonResponse = null;
    const req = { user: { _id: testUserId } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonResponse = body;
        return this;
      },
    };

    await nineWicketController.getActiveSession(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.success, true);
    assert.equal(jsonResponse.hasActiveSession, true);
    assert.equal(jsonResponse.session.sessionId, "S_NEW_456");
  } finally {
    restoreAll(restores);
  }
});

test("Step 8: getActiveSession returns hasActiveSession: false when no active session exists", async () => {
  const restores = [];
  fakeDb(restores);
  const nineWicketController = require("../controllers/nineWicketController");
  const testUserId = new mongoose.Types.ObjectId();

  replace(
    NineWicketSession,
    "findOne",
    () => ({
      sort: () => Promise.resolve(null),
    }),
    restores,
  );

  try {
    const serviceRes = await service.getActiveSession({ userId: testUserId });
    assert.equal(serviceRes.success, true);
    assert.equal(serviceRes.hasActiveSession, false);
    assert.equal(serviceRes.session, undefined);

    let statusCode = 0;
    let jsonResponse = null;
    const req = { user: { _id: testUserId } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonResponse = body;
        return this;
      },
    };

    await nineWicketController.getActiveSession(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.success, true);
    assert.equal(jsonResponse.hasActiveSession, false);
  } finally {
    restoreAll(restores);
  }
});
