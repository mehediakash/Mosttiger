const { Queue, QueueEvents } = require("bullmq");
const { createRedisConnection } = require("./redis");
const logger = require("../utils/logger");

const connection = createRedisConnection({
  connectionName: "ck369-bullmq",
  bullmq: true,
});

connection.on("error", (error) => {
  logger.warn("[QUEUE] Redis connection error", {
    message: error.message,
    stack: error.stack,
    command: error?.command?.name,
    status: connection.status,
  });
});

connection.on("ready", () => {
  logger.debug("[QUEUE] Redis connection ready", { status: connection.status });
});

connection.on("close", () => {
  logger.debug("[QUEUE] Redis connection closed", {
    status: connection.status,
  });
});

connection.on("reconnecting", (delay) => {
  logger.debug("[QUEUE] Redis connection reconnecting", {
    delay,
    status: connection.status,
  });
});

const defaultJobOptions = {
  attempts: Number(process.env.QUEUE_JOB_ATTEMPTS || 5),
  backoff: {
    type: "exponential",
    delay: Number(process.env.QUEUE_BACKOFF_DELAY_MS || 1000),
  },
  removeOnComplete: {
    age: Number(process.env.QUEUE_REMOVE_COMPLETE_AGE_SECONDS || 3600),
    count: Number(process.env.QUEUE_REMOVE_COMPLETE_COUNT || 10000),
  },
  removeOnFail: false,
};

function createQueue(name) {
  return new Queue(name, {
    connection,
    defaultJobOptions,
  });
}

function createEvents(name) {
  return new QueueEvents(name, {
    connection: createRedisConnection({
      connectionName: `ck369-bullmq-events-${name}`,
      bullmq: true,
    }),
  });
}

module.exports = {
  connection,
  defaultJobOptions,
  createQueue,
  createEvents,
};
