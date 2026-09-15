require("dotenv").config();

const { createCallbackWorker } = require("./_createWorker");
const sideEffects = require("../services/callbackSideEffectsService");

createCallbackWorker({
  queueName: "historyQueue",
  concurrency: Number(process.env.HISTORY_WORKER_CONCURRENCY || 25),
  processor: (job) => sideEffects.createBettingHistory(job.data),
});
