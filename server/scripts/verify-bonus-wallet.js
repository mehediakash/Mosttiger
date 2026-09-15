#!/usr/bin/env node

/**
 * Quick verification script to check if wallet.bonus is being updated after deposits
 * Run this with a user ID to check their wallet state
 *
 * Usage:
 * node verify-bonus-wallet.js userId
 */

const mongoose = require("mongoose");
const User = require("./models/User");
const PromotionTurnover = require("./models/PromotionTurnover");
const Deposit = require("./models/Deposit");
require("dotenv").config();

async function verifyBonusWallet() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/dexwine",
    );
    console.log("✅ Connected to MongoDB\n");

    const userId = process.argv[2];
    if (!userId) {
      console.error("❌ Please provide userId as argument");
      console.log("Usage: node verify-bonus-wallet.js <userId>");
      process.exit(1);
    }

    // Fetch user
    const user = await User.findById(userId).select(
      "wallet _id fullName email",
    );
    if (!user) {
      console.error("❌ User not found");
      process.exit(1);
    }

    console.log("👤 User:", user.fullName, `(${user.email})`);
    console.log("💰 Wallet State:");
    console.log(`   main: ${user.wallet.main || 0}`);
    console.log(`   bonus: ${user.wallet.bonus || 0}`);
    console.log(`   freeBets: ${user.wallet.freeBets || 0}\n`);

    // Check active turnovers
    const activeTurnovers = await PromotionTurnover.find({
      user: userId,
      status: "active",
    })
      .populate("promotion", "title promoCode bonusConfig")
      .select("bonusAmount turnoverRequired turnoverCompleted");

    if (activeTurnovers.length > 0) {
      console.log("🎯 Active Promotions:");
      activeTurnovers.forEach((turnover) => {
        console.log(`   - ${turnover.promotion?.title || "Unknown"}`);
        console.log(`     Bonus: ${turnover.bonusAmount}`);
        console.log(
          `     Turnover Progress: ${turnover.turnoverCompleted} / ${turnover.turnoverRequired}`,
        );
      });
    } else {
      console.log("ℹ️  No active promotions");
    }

    console.log("\n");

    // Check recent deposits
    const recentDeposits = await Deposit.find({
      user: userId,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .limit(5)
      .select("amount promotion promotionAppliedAt status completedAt");

    if (recentDeposits.length > 0) {
      console.log("📊 Recent Completed Deposits:");
      recentDeposits.forEach((deposit) => {
        console.log(`   Amount: ${deposit.amount}`);
        console.log(`   Promotion: ${deposit.promotion ? "Yes" : "No"}`);
        console.log(
          `   Promotion Applied: ${deposit.promotionAppliedAt ? "Yes" : "No"}`,
        );
        console.log(`   Completed: ${deposit.completedAt?.toLocaleString()}`);
        console.log();
      });
    }

    // Verification logic
    console.log("🔍 Verification:");
    if (user.wallet.bonus > 0) {
      console.log("✅ Bonus wallet has funds - promotion was applied");
    } else if (activeTurnovers.length > 0) {
      console.log("❌ ISSUE: Active promotion but wallet.bonus is 0!");
      console.log("   This indicates the bonus update failed");
    } else {
      console.log("ℹ️  No active promotions or bonus balance");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyBonusWallet();
