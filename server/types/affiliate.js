/**
 * @typedef {"pending" | "approved" | "rejected" | "suspended"} AffiliateStatus
 * @typedef {"bkash" | "nagad" | "rocket" | "bank"} AffiliatePaymentMethod
 * @typedef {"monthly" | "quarterly" | "never"} AffiliateCarryReset
 * @typedef {"daily" | "weekly" | "monthly"} AffiliateSettlementFrequency
 * @typedef {"auto" | "manual"} AffiliateWithdrawApproval
 *
 * @typedef {Object} AffiliateConfig
 * @property {number} revenueSharePercentage
 * @property {number} minimumDeposit
 * @property {number} requiredTurnover
 * @property {boolean} enableNegativeCarry
 * @property {AffiliateCarryReset} carryReset
 * @property {number} maximumNegativeCarry
 * @property {AffiliateSettlementFrequency} settlementFrequency
 * @property {number} minimumWithdraw
 * @property {AffiliateWithdrawApproval} withdrawApproval
 * @property {"affiliate_status"} revenueShareStartCondition
 * @property {Object<string, any>} metadata
 *
 * @typedef {Object} AffiliateStatistics
 * @property {number} totalPlayers
 * @property {number} activePlayers
 * @property {number} totalDeposits
 * @property {number} totalTurnover
 * @property {number} totalGrossRevenue
 * @property {number} totalNetRevenue
 * @property {number} totalCommission
 * @property {number} pendingCommission
 * @property {number} totalWithdrawn
 * @property {number} negativeCarryBalance
 * @property {Date | null} lastCalculatedAt
 * @property {Date | null} lastSettlementAt
 */

module.exports = {};
