const UserPromotion = require("../models/UserPromotion");
const logger = require("./logger");

const USER_PROMOTION_INDEX_NAME = "user_1_promotion_1";
const USER_PROMOTION_INDEX_KEY = { user: 1, promotion: 1 };

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function ensureUserPromotionIndexes() {
  try {
    const indexes = await UserPromotion.collection.indexes();
    const legacyUniqueIndex = indexes.find(
      (index) =>
        index.unique === true &&
        sameKey(index.key, USER_PROMOTION_INDEX_KEY),
    );

    if (legacyUniqueIndex) {
      await UserPromotion.collection.dropIndex(legacyUniqueIndex.name);
      logger.info("[MONGO] dropped legacy unique UserPromotion index", {
        indexName: legacyUniqueIndex.name,
      });
    }

    await UserPromotion.collection.createIndex(USER_PROMOTION_INDEX_KEY, {
      name: USER_PROMOTION_INDEX_NAME,
      background: true,
    });
  } catch (error) {
    if (error?.code === 26 || error?.codeName === "NamespaceNotFound") {
      return;
    }

    logger.warn("[MONGO] UserPromotion index reconciliation failed", {
      message: error.message,
      code: error.code,
      codeName: error.codeName,
    });
  }
}

module.exports = ensureUserPromotionIndexes;
