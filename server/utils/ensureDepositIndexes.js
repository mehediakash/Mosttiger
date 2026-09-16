const Deposit = require("../models/Deposit");
const logger = require("./logger");

async function ensureDepositIndexes() {
  try {
    const indexes = await Deposit.collection.indexes();
    const legacyIndex = indexes.find(
      (index) => index.name === "propayDetails.orderNo_1",
    );

    // If legacy index exists without partialFilterExpression
    if (
      legacyIndex &&
      (!legacyIndex.partialFilterExpression ||
        !legacyIndex.partialFilterExpression["propayDetails.orderNo"])
    ) {
      await Deposit.collection.dropIndex("propayDetails.orderNo_1");
      logger.info(
        "[MONGO] Dropped legacy non-partial propayDetails.orderNo index",
      );
    }

    // Create the partial unique index if not already created
    await Deposit.collection.createIndex(
      { "propayDetails.orderNo": 1 },
      {
        name: "propayDetails.orderNo_1",
        unique: true,
        partialFilterExpression: {
          "propayDetails.orderNo": { $type: "string" },
        },
        background: true,
      },
    );
    logger.info(
      "[MONGO] Ensured partial unique index on propayDetails.orderNo",
    );
  } catch (error) {
    if (error?.code === 26 || error?.codeName === "NamespaceNotFound") {
      return;
    }

    logger.warn("[MONGO] Deposit index reconciliation warning", {
      message: error.message,
      code: error.code,
    });
  }
}

module.exports = ensureDepositIndexes;
