require("dotenv").config();

const { createCallbackWorker } = require("./_createWorker");
const sideEffects = require("../services/callbackSideEffectsService");

createCallbackWorker({
  queueName: "turnoverQueue",
  concurrency: Number(process.env.TURNOVER_WORKER_CONCURRENCY || 10),
  processor: (job) => sideEffects.recordTurnover(job.data),
});
