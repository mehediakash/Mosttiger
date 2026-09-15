const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const BettingHistory = require("../models/BettingHistory");
const User = require("../models/User");
const adminBetsController = require("../controllers/adminBetsController");
const { authorize } = require("../middleware/auth");

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

function replace(object, key, value, restores) {
  const old = object[key];
  object[key] = value;
  restores.push(() => {
    object[key] = old;
  });
}

function restoreAll(restores) {
  for (const restore of restores.reverse()) restore();
}

test("1. All time range: returns records without date bounds", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          summary: [
            { totalBet: 500, totalWin: 350, totalPL: -150, records: 5 },
          ],
          ledger: [
            {
              _id: new mongoose.Types.ObjectId(),
              gameRound: "RND1",
              gameName: "Crazy Time",
              provider: "Evolution",
              category: "Live Casino",
              betAmount: 100,
              winAmount: 70,
              netResult: -30,
              turnoverAmount: 100,
              status: "settled",
              playedAt: new Date(),
              user: {
                _id: new mongoose.Types.ObjectId(),
                userId: 369001,
                username: "player1",
              },
            },
          ],
        },
      ];
    },
    restores,
  );

  try {
    const req = { query: { range: "all" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.summary.totalBet, 500);
    assert.equal(res.body.data.summary.totalWin, 350);
    assert.equal(res.body.data.summary.totalPL, -150);
    assert.equal(res.body.data.summary.records, 5);
    assert.equal(res.body.data.bets.length, 1);
    assert.equal(res.body.data.bets[0].order, "RND1");
    // Date bounds should not be present in match stage
    assert.equal(capturedPipeline[0].$match.playedAt, undefined);
  } finally {
    restoreAll(restores);
  }
});

test("2. Today range: filters playedAt within start and end of today", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          summary: [{ totalBet: 100, totalWin: 120, totalPL: 20, records: 1 }],
          ledger: [],
        },
      ];
    },
    restores,
  );

  try {
    const req = { query: { range: "today" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const dateQuery = capturedPipeline[0].$match.playedAt;
    assert.ok(dateQuery.$gte instanceof Date);
    assert.ok(dateQuery.$lte instanceof Date);

    const now = new Date();
    assert.equal(dateQuery.$gte.getDate(), now.getDate());
    assert.equal(dateQuery.$lte.getDate(), now.getDate());
    assert.equal(dateQuery.$gte.getHours(), 0);
    assert.equal(dateQuery.$lte.getHours(), 23);
  } finally {
    restoreAll(restores);
  }
});

test("3. Yesterday range: filters playedAt within start and end of yesterday", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          summary: [{ totalBet: 200, totalWin: 0, totalPL: -200, records: 2 }],
          ledger: [],
        },
      ];
    },
    restores,
  );

  try {
    const req = { query: { range: "yesterday" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const dateQuery = capturedPipeline[0].$match.playedAt;
    assert.ok(dateQuery.$gte instanceof Date);
    assert.ok(dateQuery.$lte instanceof Date);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    assert.equal(dateQuery.$gte.getDate(), yesterday.getDate());
    assert.equal(dateQuery.$lte.getDate(), yesterday.getDate());
  } finally {
    restoreAll(restores);
  }
});

test("4. Custom date range: filters playedAt with custom startDate and endDate", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [{ summary: [], ledger: [] }];
    },
    restores,
  );

  try {
    const req = {
      query: { startDate: "2026-09-01", endDate: "2026-09-05" },
      user: { role: "admin" },
    };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const dateQuery = capturedPipeline[0].$match.playedAt;
    assert.equal(dateQuery.$gte.toISOString().slice(0, 10), "2026-09-01");
    assert.equal(dateQuery.$lte.toISOString().slice(0, 10), "2026-09-05");
  } finally {
    restoreAll(restores);
  }
});

test("5. Search by user: resolves user and matches user IDs in query", async () => {
  const restores = [];
  let capturedPipeline = null;
  const mockUserId = new mongoose.Types.ObjectId();

  replace(
    User,
    "find",
    () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [{ _id: mockUserId, username: "player99" }],
        }),
      }),
    }),
    restores,
  );

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          summary: [{ totalBet: 50, totalWin: 0, totalPL: -50, records: 1 }],
          ledger: [],
        },
      ];
    },
    restores,
  );

  try {
    const req = { query: { search: "player99" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const orCond = capturedPipeline[0].$match.$or;
    assert.ok(Array.isArray(orCond));
    const userOr = orCond.find((c) => c.user && c.user.$in);
    assert.ok(userOr);
    assert.equal(userOr.user.$in[0].toString(), mockUserId.toString());
  } finally {
    restoreAll(restores);
  }
});

test("6. Search by order: matches gameRound in search $or", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    User,
    "find",
    () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [],
        }),
      }),
    }),
    restores,
  );

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [{ summary: [], ledger: [] }];
    },
    restores,
  );

  try {
    const req = { query: { search: "9WCRMTUC2L" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const orCond = capturedPipeline[0].$match.$or;
    const orderCondition = orCond.find((c) => c.gameRound);
    assert.ok(orderCondition);
    assert.ok(orderCondition.gameRound.$regex);
  } finally {
    restoreAll(restores);
  }
});

test("7. Search by game: matches gameName in search $or", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    User,
    "find",
    () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [],
        }),
      }),
    }),
    restores,
  );

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [{ summary: [], ledger: [] }];
    },
    restores,
  );

  try {
    const req = { query: { search: "9Wicket" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    const orCond = capturedPipeline[0].$match.$or;
    const gameCondition = orCond.find((c) => c.gameName);
    assert.ok(gameCondition);
  } finally {
    restoreAll(restores);
  }
});

test("8. Pagination: passes skip and limit properly to pipeline", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          summary: [
            { totalBet: 1000, totalWin: 900, totalPL: -100, records: 50 },
          ],
          ledger: [],
        },
      ];
    },
    restores,
  );

  try {
    const req = { query: { page: "2", limit: "15" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.pagination.page, 2);
    assert.equal(res.body.data.pagination.limit, 15);
    assert.equal(res.body.data.pagination.total, 50);
    assert.equal(res.body.data.pagination.totalPages, 4);

    const facet = capturedPipeline[1].$facet;
    const skipStage = facet.ledger.find((s) => s.$skip !== undefined);
    const limitStage = facet.ledger.find((s) => s.$limit !== undefined);
    assert.equal(skipStage.$skip, 15); // (page 2 - 1) * 15
    assert.equal(limitStage.$limit, 15);
  } finally {
    restoreAll(restores);
  }
});

test("9. Summary totals: aggregates totalBet, totalWin, totalPL and total records", async () => {
  const restores = [];

  replace(
    BettingHistory,
    "aggregate",
    async () => [
      {
        summary: [
          {
            totalBet: 1250.75,
            totalWin: 1500.25,
            totalPL: 249.5,
            records: 12,
          },
        ],
        ledger: [],
      },
    ],
    restores,
  );

  try {
    const req = { query: {}, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.summary.totalBet, 1250.75);
    assert.equal(res.body.data.summary.totalWin, 1500.25);
    assert.equal(res.body.data.summary.totalPL, 249.5);
    assert.equal(res.body.data.summary.records, 12);
  } finally {
    restoreAll(restores);
  }
});

test("10. P/L calculation: preserves exact win - bet net result", async () => {
  const restores = [];

  replace(
    BettingHistory,
    "aggregate",
    async () => [
      {
        summary: [
          {
            totalBet: 500,
            totalWin: 200,
            totalPL: -300,
            records: 3,
          },
        ],
        ledger: [
          {
            _id: new mongoose.Types.ObjectId(),
            gameRound: "RND_LOSS",
            betAmount: 500,
            winAmount: 200,
            netResult: -300,
            turnoverAmount: 300,
            status: "settled",
          },
        ],
      },
    ],
    restores,
  );

  try {
    const req = { query: {}, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.summary.totalPL, -300);
    assert.equal(res.body.data.bets[0].netResult, -300);
    assert.equal(res.body.data.bets[0].bet, 500);
    assert.equal(res.body.data.bets[0].win, 200);
  } finally {
    restoreAll(restores);
  }
});

test("11. Demo-user handling: does not alter or corrupt records and reads existing database faithfully", async () => {
  const restores = [];

  replace(
    BettingHistory,
    "aggregate",
    async () => [
      {
        summary: [{ totalBet: 100, totalWin: 50, totalPL: -50, records: 1 }],
        ledger: [
          {
            _id: new mongoose.Types.ObjectId(),
            gameRound: "HEALTH_TEST_ROUND",
            betAmount: 100,
            winAmount: 50,
            netResult: -50,
            user: {
              _id: new mongoose.Types.ObjectId(),
              userId: 2,
              username: "health_test_user",
            },
          },
        ],
      },
    ],
    restores,
  );

  try {
    const req = { query: {}, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.bets[0].user.userId, 2);
    assert.equal(res.body.data.bets[0].user.username, "health_test_user");
  } finally {
    restoreAll(restores);
  }
});

test("12. Unauthorized request: authorize middleware blocks non-logged-in requests", () => {
  const authMiddleware = authorize("admin");
  const req = { user: null };
  const res = mockRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("13. Non-admin request: authorize middleware blocks user role", () => {
  const authMiddleware = authorize("admin");
  const req = { user: { role: "user" } };
  const res = mockRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test("14. Empty result: returns safe defaults (0 for numbers, empty array for bets)", async () => {
  const restores = [];

  replace(
    BettingHistory,
    "aggregate",
    async () => [
      {
        summary: [],
        ledger: [],
      },
    ],
    restores,
  );

  try {
    const req = { query: {}, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.summary.totalBet, 0);
    assert.equal(res.body.data.summary.totalWin, 0);
    assert.equal(res.body.data.summary.totalPL, 0);
    assert.equal(res.body.data.summary.records, 0);
    assert.equal(res.body.data.pagination.total, 0);
    assert.equal(res.body.data.pagination.totalPages, 0);
    assert.deepEqual(res.body.data.bets, []);
  } finally {
    restoreAll(restores);
  }
});

test("15. Invalid date: returns 400 with descriptive error message", async () => {
  const req = {
    query: { startDate: "not-a-valid-date" },
    user: { role: "admin" },
  };
  const res = mockRes();
  await adminBetsController.getAdminBets(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Invalid startDate format/i);
});

test("16. Maximum limit: clamps requested limit to 100", async () => {
  const restores = [];
  let capturedPipeline = null;

  replace(
    BettingHistory,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [{ summary: [], ledger: [] }];
    },
    restores,
  );

  try {
    const req = { query: { limit: "5000" }, user: { role: "admin" } };
    const res = mockRes();
    await adminBetsController.getAdminBets(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.pagination.limit, 100);

    const facet = capturedPipeline[1].$facet;
    const limitStage = facet.ledger.find((s) => s.$limit !== undefined);
    assert.equal(limitStage.$limit, 100);
  } finally {
    restoreAll(restores);
  }
});
