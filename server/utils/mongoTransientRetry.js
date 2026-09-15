const logger = require("./logger");

const DEFAULT_MAX_ATTEMPTS = Number(
  process.env.MONGO_TRANSACTION_RETRY_ATTEMPTS || 5,
);
const DEFAULT_BASE_DELAY_MS = Number(
  process.env.MONGO_TRANSACTION_RETRY_BASE_DELAY_MS || 25,
);

function hasErrorLabel(error, label) {
  return typeof error?.hasErrorLabel === "function"
    ? error.hasErrorLabel(label)
    : Array.isArray(error?.errorLabels) && error.errorLabels.includes(label);
}

function isTransientTransactionError(error) {
  return (
    hasErrorLabel(error, "TransientTransactionError") ||
    error?.code === 112 ||
    error?.codeName === "WriteConflict" ||
    /write conflict/i.test(error?.message || "")
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryTransientTransaction(operation, options = {}) {
  const maxAttempts = Number(options.maxAttempts || DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = Number(options.baseDelayMs || DEFAULT_BASE_DELAY_MS);
  const label = options.label || "mongo-transaction";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isTransientTransactionError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const waitMs = baseDelayMs * attempt;
      logger.warn("[MONGO] transient transaction error; retrying", {
        label,
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        waitMs,
        message: error.message,
        code: error.code,
        codeName: error.codeName,
        errorLabels: error.errorLabels,
      });

      await delay(waitMs);
    }
  }

  return undefined;
}

module.exports = {
  isTransientTransactionError,
  retryTransientTransaction,
};
