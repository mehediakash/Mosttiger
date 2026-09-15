const cron = require("node-cron");
const affiliateRevenueService = require("../services/affiliateRevenueService");
const logger = require("../utils/logger");

const runAffiliateSettlementCron = async () => {
  logger.info("[AFFILIATE SETTLEMENT] Started");

  try {
    const result = await affiliateRevenueService.runDueSettlements();
    logger.info("[AFFILIATE SETTLEMENT] Completed", {
      settlementCount: result.settlementCount,
    });
    return result;
  } catch (error) {
    logger.error("[AFFILIATE SETTLEMENT] Failed", { message: error.message });
    throw error;
  }
};

const runAffiliateNegativeCarryResetCron = async () => {
  logger.info("[AFFILIATE CARRY RESET] Started");

  try {
    const result = await affiliateRevenueService.resetNegativeCarryForDueAffiliates();
    logger.info("[AFFILIATE CARRY RESET] Completed", {
      resetCount: result.resetCount,
    });
    return result;
  } catch (error) {
    logger.error("[AFFILIATE CARRY RESET] Failed", { message: error.message });
    throw error;
  }
};

const runAffiliateStatisticsCron = async () => {
  logger.info("[AFFILIATE STATISTICS] Started");

  try {
    const result = await affiliateRevenueService.refreshAllAffiliateStatistics();
    logger.info("[AFFILIATE STATISTICS] Completed", {
      affiliateCount: result.affiliateCount,
    });
    return result;
  } catch (error) {
    logger.error("[AFFILIATE STATISTICS] Failed", { message: error.message });
    throw error;
  }
};

const startAffiliateCrons = () => {
  cron.schedule("5 * * * *", runAffiliateSettlementCron);
  cron.schedule("15 0 * * *", runAffiliateNegativeCarryResetCron);
  cron.schedule("*/30 * * * *", runAffiliateStatisticsCron);
};

module.exports = {
  startAffiliateCrons,
  runAffiliateSettlementCron,
  runAffiliateNegativeCarryResetCron,
  runAffiliateStatisticsCron,
};
