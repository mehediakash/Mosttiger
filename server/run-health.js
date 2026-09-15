require("dotenv").config();

const mongoose = require("mongoose");

const { runGameHealthCheck } = require("./cron/gameHealthCron");

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    await runGameHealthCheck();

    console.log("Health Check Finished");

    process.exit(0);
  } catch (err) {
    console.error(err);

    process.exit(1);
  }
}

start();
