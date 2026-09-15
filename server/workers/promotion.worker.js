require("dotenv").config();

const { createCallbackWorker } = require("./_createWorker");
const sideEffects = require("../services/callbackSideEffectsService");

createCallbackWorker({
  queueName: "promotionQueue",
  concurrency: Number(process.env.PROMOTION_WORKER_CONCURRENCY || 10),
  processor: (job) => sideEffects.processPromotion(job.data),
});
