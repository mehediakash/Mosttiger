const AFFILIATE_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

const AFFILIATE_APPLICATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

const AFFILIATE_PAYMENT_METHOD = Object.freeze({
  BKASH: "bkash",
  NAGAD: "nagad",
  ROCKET: "rocket",
  BANK: "bank",
});

const AFFILIATE_CARRY_RESET = Object.freeze({
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  NEVER: "never",
});

const AFFILIATE_SETTLEMENT_FREQUENCY = Object.freeze({
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
});

const AFFILIATE_WITHDRAW_APPROVAL = Object.freeze({
  AUTO: "auto",
  MANUAL: "manual",
});

const AFFILIATE_WITHDRAWAL_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

const AFFILIATE_SETTLEMENT_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "paid",
  VOID: "void",
});

const AFFILIATE_COMMISSION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SETTLED: "settled",
  PAID: "paid",
});

const AFFILIATE_TRANSACTION_TYPE = Object.freeze({
  COMMISSION: "commission",
  SETTLEMENT: "settlement",
  WITHDRAW_REQUEST: "withdraw_request",
  WITHDRAW_APPROVED: "withdraw_approved",
  WITHDRAW_REJECTED: "withdraw_rejected",
  ADJUSTMENT: "adjustment",
  NEGATIVE_CARRY: "negative_carry",
});

const AFFILIATE_TRANSACTION_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  REJECTED: "rejected",
  FAILED: "failed",
});

const AFFILIATE_REVENUE_SHARE_START_CONDITION = Object.freeze({
  AFFILIATE_STATUS: "affiliate_status",
});

const DEFAULT_AFFILIATE_CONFIG = Object.freeze({
  revenueSharePercentage: 0,
  minimumDeposit: 0,
  requiredTurnover: 0,
  enableNegativeCarry: false,
  carryReset: AFFILIATE_CARRY_RESET.MONTHLY,
  maximumNegativeCarry: 0,
  settlementFrequency: AFFILIATE_SETTLEMENT_FREQUENCY.MONTHLY,
  minimumWithdraw: 0,
  withdrawApproval: AFFILIATE_WITHDRAW_APPROVAL.MANUAL,
  revenueShareStartCondition:
    AFFILIATE_REVENUE_SHARE_START_CONDITION.AFFILIATE_STATUS,
  metadata: {},
});

module.exports = {
  AFFILIATE_STATUS,
  AFFILIATE_APPLICATION_STATUS,
  AFFILIATE_PAYMENT_METHOD,
  AFFILIATE_CARRY_RESET,
  AFFILIATE_SETTLEMENT_FREQUENCY,
  AFFILIATE_WITHDRAW_APPROVAL,
  AFFILIATE_WITHDRAWAL_STATUS,
  AFFILIATE_SETTLEMENT_STATUS,
  AFFILIATE_COMMISSION_STATUS,
  AFFILIATE_TRANSACTION_TYPE,
  AFFILIATE_TRANSACTION_STATUS,
  AFFILIATE_REVENUE_SHARE_START_CONDITION,
  DEFAULT_AFFILIATE_CONFIG,
};
