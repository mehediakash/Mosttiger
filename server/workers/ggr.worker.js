require("dotenv").config();

const { createCallbackWorker } = require("./_createWorker");
const sideEffects = require("../services/callbackSideEffectsService");

createCallbackWorker({
  queueName: "ggrQueue",
  concurrency: Number(process.env.GGR_WORKER_CONCURRENCY || 10),
  processor: (job) => sideEffects.processGGR(job.data),
});
