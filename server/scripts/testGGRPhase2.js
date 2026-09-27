const assert = require("assert");
const GGRService = require("../services/GGRService");
const GGR = require("../models/GGR");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function runGGRPhase2Tests() {
  console.log("====================================================");
  console.log("RUNNING GAMEBETX GGR SYSTEM PHASE 2 TESTS");
  console.log("====================================================\n");

  // Mock Document store
  let mockDoc = null;

  // Intercept GGR.findOne and GGR.updateOne to test GGRService against exact document states
  const originalFindOne = GGR.findOne;
  const originalUpdateOne = GGR.updateOne;

  GGR.findOne = function (filter) {
    return {
      session: function () {
        return this;
      },
      select: function (fields) {
        return {
          lean: function () {
            if (!mockDoc) return null;
            return { totalGGR: mockDoc.totalGGR };
          },
        };
      },
      then: function (resolve) {
        resolve(mockDoc);
      },
    };
  };

  GGR.updateOne = function (filter, update) {
    return {
      session: function () {
        return this;
      },
      then: function (resolve) {
        if (!mockDoc) return resolve({ matchedCount: 0 });
        if (update.$set) {
          Object.assign(mockDoc, update.$set);
        }
        if (update.$inc) {
          for (const [key, val] of Object.entries(update.$inc)) {
            mockDoc[key] = (mockDoc[key] || 0) + val;
          }
        }
        resolve({ matchedCount: 1, modifiedCount: 1 });
      },
    };
  };

  try {
    // ---------------------------------------------------------------
    // TEST 1: Provider Confirmed Example
    // Start fresh: ggrRate = 10
    // Round 1: bet = 1000, win = 10000
    // Round 2: bet = 9000, win = 0
    // ---------------------------------------------------------------
    console.log("TEST 1: Provider Confirmed Example (Loss Recovery)");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 1386.97, // Existing prepaid balance
      totalBets: 50000, // Existing legacy metrics
      totalPlayerLoss: 12000,
      totalPlayerWin: 38000,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 1000, winAmount: 10000 });
    assert.strictEqual(
      mockDoc.periodBets,
      1000,
      "Round 1 periodBets must be 1000",
    );
    assert.strictEqual(
      mockDoc.periodWins,
      10000,
      "Round 1 periodWins must be 10000",
    );
    assert.strictEqual(
      mockDoc.periodNetGGR,
      -9000,
      "Round 1 periodNetGGR must be -9000",
    );
    assert.strictEqual(
      mockDoc.periodGGRCharge,
      0,
      "Round 1 periodGGRCharge must be 0",
    );
    assert.strictEqual(
      mockDoc.totalGGR,
      1386.97,
      "Round 1 totalGGR must remain untouched",
    );

    await GGRService.processGameResult({ betAmount: 9000, winAmount: 0 });
    assert.strictEqual(
      mockDoc.periodBets,
      10000,
      "Round 2 periodBets must be 10000",
    );
    assert.strictEqual(
      mockDoc.periodWins,
      10000,
      "Round 2 periodWins must be 10000",
    );
    assert.strictEqual(
      mockDoc.periodNetGGR,
      0,
      "Round 2 periodNetGGR must be 0",
    );
    assert.strictEqual(
      mockDoc.periodGGRCharge,
      0,
      "Round 2 periodGGRCharge must be 0",
    );
    assert.strictEqual(
      mockDoc.totalGGR,
      1386.97,
      "Round 2 totalGGR must remain untouched",
    );
    console.log(
      "✓ TEST 1 PASSED: Net GGR <= 0 produces 0 charge and zero deduction from totalGGR.\n",
    );

    // ---------------------------------------------------------------
    // TEST 2: Exact Example 2 from User Prompt
    // Round 1: bet 1000, win 10000
    // Round 2: bet 11000, win 0
    // ---------------------------------------------------------------
    console.log("TEST 2: Net Positive Profit (Example 2)");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 1386.97,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 1000, winAmount: 10000 });
    assert.strictEqual(mockDoc.periodNetGGR, -9000);
    assert.strictEqual(mockDoc.periodGGRCharge, 0);
    assert.strictEqual(mockDoc.totalGGR, 1386.97);

    await GGRService.processGameResult({ betAmount: 11000, winAmount: 0 });
    assert.strictEqual(
      mockDoc.periodBets,
      12000,
      "Total period bets must be 12000",
    );
    assert.strictEqual(
      mockDoc.periodWins,
      10000,
      "Total period wins must be 10000",
    );
    assert.strictEqual(mockDoc.periodNetGGR, 2000, "Net GGR must be 2000");
    assert.strictEqual(
      mockDoc.periodGGRCharge,
      200,
      "Period GGR charge must be 200",
    );
    assert.strictEqual(
      mockDoc.totalGGR,
      r2(1386.97 - 200),
      "totalGGR must decrease by exactly 200",
    );
    console.log(
      "✓ TEST 2 PASSED: Net GGR 2000 at 10% rate charges exactly 200 from totalGGR.\n",
    );

    // ---------------------------------------------------------------
    // TEST 3: Progressive Incremental Delta Charge
    // Step 1: bet 10000, win 8000 -> Net GGR 2000, Charge 200
    // Step 2: bet 2000, win 1000 -> Net GGR 3000, Target 300, Delta 100
    // ---------------------------------------------------------------
    console.log("TEST 3: Progressive Incremental Delta Charge");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 2000,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 10000, winAmount: 8000 });
    assert.strictEqual(mockDoc.periodNetGGR, 2000);
    assert.strictEqual(mockDoc.periodGGRCharge, 200);
    assert.strictEqual(mockDoc.totalGGR, 1800);

    await GGRService.processGameResult({ betAmount: 2000, winAmount: 1000 });
    assert.strictEqual(mockDoc.periodBets, 12000);
    assert.strictEqual(mockDoc.periodWins, 9000);
    assert.strictEqual(mockDoc.periodNetGGR, 3000);
    assert.strictEqual(mockDoc.periodGGRCharge, 300);
    assert.strictEqual(
      mockDoc.totalGGR,
      1700,
      "totalGGR must decrease by delta (100), not full 300",
    );
    console.log(
      "✓ TEST 3 PASSED: Delta charge correctly deducts only the incremental difference.\n",
    );

    // ---------------------------------------------------------------
    // TEST 4: Player Win Offset
    // Round 1: bet 10000, win 20000
    // Round 2: bet 10000, win 0
    // Net GGR = 0 -> Charge 0
    // ---------------------------------------------------------------
    console.log("TEST 4: Player Win Offset");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 5000,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 10000, winAmount: 20000 });
    assert.strictEqual(mockDoc.periodNetGGR, -10000);
    assert.strictEqual(mockDoc.periodGGRCharge, 0);

    await GGRService.processGameResult({ betAmount: 10000, winAmount: 0 });
    assert.strictEqual(mockDoc.periodBets, 20000);
    assert.strictEqual(mockDoc.periodWins, 20000);
    assert.strictEqual(mockDoc.periodNetGGR, 0);
    assert.strictEqual(mockDoc.periodGGRCharge, 0);
    assert.strictEqual(mockDoc.totalGGR, 5000);
    console.log(
      "✓ TEST 4 PASSED: Prior player wins offset subsequent operator wins.\n",
    );

    // ---------------------------------------------------------------
    // TEST 5: Rate Change Upward (10% -> 15%)
    // Period 1: Net GGR 5000 -> Charge 500
    // Admin changes ggrRate = 15 in MongoDB Compass
    // Next activity: Net GGR 2000 -> Charge 300
    // Old 500 is NOT recalculated to 750
    // ---------------------------------------------------------------
    console.log("TEST 5: Rate Change Upward (10% -> 15%)");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 5000,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    // Period 1 activity
    await GGRService.processGameResult({ betAmount: 10000, winAmount: 5000 });
    assert.strictEqual(mockDoc.periodNetGGR, 5000);
    assert.strictEqual(mockDoc.periodGGRCharge, 500);
    assert.strictEqual(mockDoc.totalGGR, 4500);

    // Admin edits MongoDB Compass directly:
    mockDoc.ggrRate = 15;

    // Next callback arrives: bet 2000, win 0
    await GGRService.processGameResult({ betAmount: 2000, winAmount: 0 });
    assert.strictEqual(
      mockDoc.appliedGgrRate,
      15,
      "New appliedGgrRate must be 15",
    );
    assert.strictEqual(
      mockDoc.periodBets,
      2000,
      "New periodBets must start at 2000",
    );
    assert.strictEqual(mockDoc.periodWins, 0, "New periodWins must be 0");
    assert.strictEqual(
      mockDoc.periodNetGGR,
      2000,
      "New periodNetGGR must be 2000",
    );
    assert.strictEqual(
      mockDoc.periodGGRCharge,
      300,
      "New period charge must be 300 (15% of 2000)",
    );
    assert.strictEqual(
      mockDoc.totalGGR,
      4200,
      "totalGGR decreased by exactly 300 for the new period (4500 - 300)",
    );
    console.log(
      "✓ TEST 5 PASSED: Rate change detected dynamically, old charge final, new rate applies to new period only.\n",
    );

    // ---------------------------------------------------------------
    // TEST 6: Rate Change Downward (15% -> 8%)
    // Period 1: Net GGR 5000, Charge 750 (at 15%)
    // Admin changes ggrRate = 8
    // Next activity: Net GGR 2000 -> Charge 160
    // No retroactive refund of 750
    // ---------------------------------------------------------------
    console.log("TEST 6: Rate Change Downward (15% -> 8%)");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 5000,
      ggrRate: 15,
      appliedGgrRate: 15,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 10000, winAmount: 5000 });
    assert.strictEqual(mockDoc.periodNetGGR, 5000);
    assert.strictEqual(mockDoc.periodGGRCharge, 750);
    assert.strictEqual(mockDoc.totalGGR, 4250);

    // Admin edits MongoDB Compass directly:
    mockDoc.ggrRate = 8;

    // Next callback arrives: bet 2000, win 0
    await GGRService.processGameResult({ betAmount: 2000, winAmount: 0 });
    assert.strictEqual(mockDoc.appliedGgrRate, 8);
    assert.strictEqual(mockDoc.periodNetGGR, 2000);
    assert.strictEqual(mockDoc.periodGGRCharge, 160);
    assert.strictEqual(
      mockDoc.totalGGR,
      4090,
      "totalGGR is 4250 - 160 = 4090 (no retroactive refund)",
    );
    console.log(
      "✓ TEST 6 PASSED: Downward rate change does not trigger retroactive refund.\n",
    );

    // ---------------------------------------------------------------
    // TEST 7: Zero Rate (ggrRate = 0)
    // ---------------------------------------------------------------
    console.log("TEST 7: Zero Rate (ggrRate = 0)");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 1000,
      ggrRate: 0,
      appliedGgrRate: 0,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    await GGRService.processGameResult({ betAmount: 5000, winAmount: 1000 });
    assert.strictEqual(mockDoc.periodNetGGR, 4000);
    assert.strictEqual(mockDoc.periodGGRCharge, 0);
    assert.strictEqual(
      mockDoc.totalGGR,
      1000,
      "totalGGR must remain 1000 when rate is 0",
    );
    console.log(
      "✓ TEST 7 PASSED: 0% GGR rate causes zero deduction from totalGGR.\n",
    );

    // ---------------------------------------------------------------
    // TEST 8: Duplicate Callback Idempotency Check
    // (Simulating callbackSideEffectsService QueueJobLedger protection)
    // ---------------------------------------------------------------
    console.log("TEST 8: Duplicate Callback Idempotency");
    const processedJobKeys = new Set();
    async function simulateCallback(jobKey, bet, win) {
      if (processedJobKeys.has(jobKey)) {
        return { duplicate: true };
      }
      processedJobKeys.add(jobKey);
      await GGRService.processGameResult({ betAmount: bet, winAmount: win });
      return { success: true };
    }

    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 1000,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    const firstRun = await simulateCallback("key-round-999", 1000, 500);
    assert.strictEqual(firstRun.success, true);
    assert.strictEqual(mockDoc.periodBets, 1000);
    assert.strictEqual(mockDoc.periodGGRCharge, 50);

    const secondRun = await simulateCallback("key-round-999", 1000, 500);
    assert.strictEqual(secondRun.duplicate, true);
    assert.strictEqual(
      mockDoc.periodBets,
      1000,
      "periodBets must not increment on duplicate",
    );
    assert.strictEqual(
      mockDoc.periodGGRCharge,
      50,
      "periodGGRCharge must not charge again on duplicate",
    );
    console.log("✓ TEST 8 PASSED: Duplicate callback idempotency verified.\n");

    // ---------------------------------------------------------------
    // TEST 9: Existing totalGGR Preservation
    // ---------------------------------------------------------------
    console.log("TEST 9: Existing totalGGR Preservation");
    mockDoc = {
      _id: "ggr_singleton",
      totalGGR: 1386.97,
      ggrRate: 10,
      appliedGgrRate: 10,
      periodBets: 0,
      periodWins: 0,
      periodNetGGR: 0,
      periodGGRCharge: 0,
    };

    // Zero charge callback (win > bet)
    await GGRService.processGameResult({ betAmount: 1000, winAmount: 2000 });
    assert.strictEqual(
      mockDoc.totalGGR,
      1386.97,
      "totalGGR must be identical when charge is zero",
    );

    // Charge callback
    await GGRService.processGameResult({ betAmount: 3000, winAmount: 0 });
    // Total period bets: 4000, wins: 2000, net: 2000, charge: 200
    assert.strictEqual(mockDoc.totalGGR, r2(1386.97 - 200));
    console.log(
      "✓ TEST 9 PASSED: totalGGR remains intact on zero charge and decreases strictly by deltaCharge.\n",
    );

    // ---------------------------------------------------------------
    // TEST 10: Game Launch Gate
    // ---------------------------------------------------------------
    console.log("TEST 10: Game Launch Gate (canLaunchGame)");
    mockDoc = { totalGGR: 100 };
    assert.strictEqual(
      await GGRService.canLaunchGame(),
      true,
      "Should allow launch when totalGGR > 0",
    );

    mockDoc = { totalGGR: 0 };
    assert.strictEqual(
      await GGRService.canLaunchGame(),
      false,
      "Should block launch when totalGGR == 0",
    );

    mockDoc = { totalGGR: -5 };
    assert.strictEqual(
      await GGRService.canLaunchGame(),
      false,
      "Should block launch when totalGGR < 0",
    );

    mockDoc = null;
    assert.strictEqual(
      await GGRService.canLaunchGame(),
      false,
      "Should block launch when document is missing",
    );
    console.log("✓ TEST 10 PASSED: canLaunchGame gate logic verified.\n");

    console.log("====================================================");
    console.log("ALL 10 GGR PHASE 2 TESTS PASSED SUCCESSFULLY!");
    console.log("====================================================");
  } finally {
    GGR.findOne = originalFindOne;
    GGR.updateOne = originalUpdateOne;
  }
}

runGGRPhase2Tests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
