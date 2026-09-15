const crypto = require("crypto");
const { createQueue } = require("../config/queue");
const logger = require("../utils/logger");

const historyQueue = createQueue("historyQueue");
const turnoverQueue = createQueue("turnoverQueue");
const ggrQueue = createQueue("ggrQueue");
const promotionQueue = createQueue("promotionQueue");
const analyticsQueue = createQueue("analyticsQueue");

const queues = {
  historyQueue,
  turnoverQueue,
  ggrQueue,
  promotionQueue,
  analyticsQueue,
};

function amountToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function buildDeterministicJobId(queueName, payload) {
  const raw = [
    queueName,
    String(payload.gameRound || ""),
    String(payload.userId || ""),
    String(payload.gameSessionId || ""),
    String(amountToCents(payload.bet)),
    String(amountToCents(payload.win)),
  ].join("|");

  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `${queueName}_${hash}`;
}

async function addSafe(queue, name, payload, options = {}) {
  const timeoutMs = Number(process.env.QUEUE_ENQUEUE_TIMEOUT_MS || 50);
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    const enqueue = queue
      .add(name, payload, options)
      .then(() => true)
      .catch((error) => {
        logger.warn("[QUEUE] enqueue failed", {
          queue: queue.name,
          name,
          jobId: options.jobId,
          message: error.message,
        });
        return false;
      });

    return await Promise.race([enqueue, timeout]);
  } catch (error) {
    logger.warn("[QUEUE] enqueue failed", {
      queue: queue.name,
      name,
      jobId: options.jobId,
      message: error.message,
    });
    return false;
  }
}

async function enqueueCallbackJobs(payload) {
  const jobs = [
    addSafe(ggrQueue, "process-game-result", payload, {
      jobId: buildDeterministicJobId("ggrQueue", payload),
    }),
    addSafe(historyQueue, "create-betting-history", payload, {
      jobId: buildDeterministicJobId("historyQueue", payload),
    }),
  ];

  if (payload.bet > 0) {
    jobs.push(
      addSafe(turnoverQueue, "record-turnover", payload, {
        jobId: buildDeterministicJobId("turnoverQueue", payload),
      }),
      addSafe(promotionQueue, "process-promotion-progress", payload, {
        jobId: buildDeterministicJobId("promotionQueue", payload),
      }),
    );
  }

  jobs.push(
    addSafe(analyticsQueue, "record-callback-analytics", payload, {
      jobId: buildDeterministicJobId("analyticsQueue", payload),
    }),
  );

  const results = await Promise.all(jobs);
  return results.every(Boolean);
}

async function closeQueues() {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
}

module.exports = {
  queues,
  historyQueue,
  turnoverQueue,
  ggrQueue,
  promotionQueue,
  analyticsQueue,
  enqueueCallbackJobs,
  buildDeterministicJobId,
  closeQueues,
};
