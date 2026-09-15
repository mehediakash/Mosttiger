const { Worker, Queue } = require("bullmq");
const crypto = require("crypto");
const { connection, defaultJobOptions } = require("../config/queue");
const { connectMongo, shutdown } = require("./_bootstrap");
const logger = require("../utils/logger");

function createCallbackWorker({ queueName, concurrency, processor }) {
  const deadLetterQueue = new Queue(`${queueName}Dlq`, {
    connection,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  deadLetterQueue.on("error", (error) => {
    logger.warn("[WORKER] dead-letter queue error", {
      queueName,
      message: error.message,
    });
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      await connectMongo();
      return processor(job);
    },
    {
      connection,
      concurrency,
      autorun: true,
    },
  );

  worker.on("completed", (job) => {
    logger.debug("[WORKER] job completed", {
      queueName,
      jobId: job.id,
      name: job.name,
    });
  });

  worker.on("error", (error) => {
    logger.warn("[WORKER] Redis worker error", {
      queueName,
      message: error.message,
      stack: error.stack,
      command: error?.command?.name,
      connectionStatus: connection.status,
    });
  });

  worker.on("failed", async (job, error) => {
    logger.error("[WORKER] job failed", {
      queueName,
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });

    const maxAttempts = job?.opts?.attempts || defaultJobOptions.attempts;
    if (job && job.attemptsMade >= maxAttempts) {
      const deadLetterJobId = `${queueName}Dlq_${crypto
        .createHash("sha256")
        .update(`${queueName}|${job.id}|${job.name}`)
        .digest("hex")}`;

      try {
        await deadLetterQueue.add(
          "dead-letter",
          {
            originalQueue: queueName,
            originalJobId: job.id,
            originalName: job.name,
            data: job.data,
            failedReason: error.message,
            failedAt: new Date().toISOString(),
          },
          { jobId: deadLetterJobId },
        );
      } catch (dlqError) {
        logger.error("[WORKER] dead-letter enqueue failed", {
          queueName,
          jobId: job.id,
          message: dlqError.message,
        });
      }
    }
  });

  process.once("SIGTERM", () => shutdown(worker, deadLetterQueue));
  process.once("SIGINT", () => shutdown(worker, deadLetterQueue));

  return worker;
}

module.exports = {
  createCallbackWorker,
};
