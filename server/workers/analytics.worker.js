require("dotenv").config();

const { createCallbackWorker } = require("./_createWorker");
const sideEffects = require("../services/callbackSideEffectsService");

createCallbackWorker({
  queueName: "analyticsQueue",
  concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY || 20),
  processor: (job) => sideEffects.recordAnalytics(job.data),
});
