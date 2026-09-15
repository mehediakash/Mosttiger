const REFERRAL_RELATIONSHIP_STATUS = Object.freeze({
  WAITING_DEPOSIT: "waiting_deposit",
  WAITING_TURNOVER: "waiting_turnover",
  QUALIFIED: "qualified",
  BONUS_CREATED: "bonus_created",
  CANCELLED: "cancelled",
});

const REFERRAL_BONUS_STATUS = Object.freeze({
  PENDING: "pending",
  QUALIFIED: "qualified",
  PENDING_CLAIM: "pending_claim",
  CLAIMED: "claimed",
  TURNOVER_ACTIVE: "turnover_active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const REFERRAL_TURNOVER_STATUS = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const REFERRAL_TRANSACTION_TYPE = Object.freeze({
  BONUS_CREATED: "bonus_created",
  BONUS_CLAIMED: "bonus_claimed",
  TURNOVER_STARTED: "turnover_started",
  TURNOVER_COMPLETED: "turnover_completed",
  BONUS_COMPLETED: "bonus_completed",
  CANCELLED: "cancelled",
});

const REFERRAL_CONFIG = Object.freeze({
  minimumFirstDeposit: Number(process.env.REFERRAL_MIN_FIRST_DEPOSIT || 1000),
  turnoverMultiplier: Number(process.env.REFERRAL_TURNOVER_MULTIPLIER || 10),
  bonusAmount: Number(process.env.REFERRAL_BONUS_AMOUNT || 500),
  claimTurnoverMultiplier: Number(
    process.env.REFERRAL_CLAIM_TURNOVER_MULTIPLIER || 1,
  ),
});

module.exports = {
  REFERRAL_RELATIONSHIP_STATUS,
  REFERRAL_BONUS_STATUS,
  REFERRAL_TURNOVER_STATUS,
  REFERRAL_TRANSACTION_TYPE,
  REFERRAL_CONFIG,
};
