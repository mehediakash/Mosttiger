const mongoose = require("mongoose");
const PaymentMethod = require("../models/PaymentMethod");
require("dotenv").config();

const seedPaymentMethods = async () => {
  try {
    console.log("🚀 Seeding payment methods...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Payment methods data
    const paymentMethods = [
      {
        name: "bkash",
        type: "mobile",
        accountNumber: "017XXXXXXXX",
        accountName: "ck369bd",
        minDeposit: 100,
        maxDeposit: 50000,
        minWithdraw: 100,
        maxWithdraw: 50000,
        processingFee: 0,
        processingFeeType: "fixed",
        isActive: true,
      },
      {
        name: "nogod",
        type: "mobile",
        accountNumber: "018XXXXXXXX",
        accountName: "ck369bd",
        minDeposit: 100,
        maxDeposit: 50000,
        minWithdraw: 100,
        maxWithdraw: 50000,
        processingFee: 0,
        processingFeeType: "fixed",
        isActive: true,
      },
      {
        name: "rocket",
        type: "mobile",
        accountNumber: "019XXXXXXXX",
        accountName: "ck369bd",
        minDeposit: 100,
        maxDeposit: 50000,
        minWithdraw: 100,
        maxWithdraw: 50000,
        processingFee: 0,
        processingFeeType: "fixed",
        isActive: true,
      },
    ];

    // Insert or update payment methods
    for (const method of paymentMethods) {
      await PaymentMethod.findOneAndUpdate({ name: method.name }, method, {
        upsert: true,
        new: true,
      });
      console.log(`✅ ${method.name} payment method seeded`);
    }

    console.log("\n🎉 Payment methods seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding payment methods:", error);
    process.exit(1);
  }
};

seedPaymentMethods();
