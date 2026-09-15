import api from "../axios/axios";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const isTurnoverCompleteForWithdrawal = (turnover = {}) => {
  const turnoverCompleted = toNumber(turnover.turnoverCompleted);
  const turnoverRequired = toNumber(turnover.turnoverRequired);
  const turnoverPercentage = toNumber(turnover.turnoverPercentage);

  return (
    turnover.status === "completed" ||
    turnover.withdrawLocked === false ||
    (turnoverRequired > 0 && turnoverCompleted >= turnoverRequired) ||
    turnoverPercentage >= 100
  );
};

export const logTurnoverValidation = (turnover = null) => {
  const canWithdraw = !turnover || isTurnoverCompleteForWithdrawal(turnover);

  console.log("TURNOVER RECORD:", turnover);
  console.log("Withdraw Locked:", turnover?.withdrawLocked);
  console.log("Status:", turnover?.status);
  console.log("Completed:", turnover?.turnoverCompleted);
  console.log("Required:", turnover?.turnoverRequired);
  console.log("Percentage:", turnover?.turnoverPercentage);
  console.log("Can Withdraw:", canWithdraw);

  return canWithdraw;
};

// Return an aggregated summary for active + pending turnovers
export const getActiveBonus = async () => {
  // Fetch all turnovers (backend provides status per turnover)
  const resp = await api.get("/api/turnover-tracking/status");
  const payload = resp?.data?.data ?? resp?.data;

  if (
    !payload ||
    !Array.isArray(payload.turnovers) ||
    payload.turnovers.length === 0
  ) {
    return { data: null };
  }

  const lockedTurnovers = payload.turnovers.filter((t) => {
    const canWithdraw = logTurnoverValidation(t);
    return (t.status === "active" || t.status === "pending") && !canWithdraw;
  });

  if (!lockedTurnovers.length) return { data: null };

  const lockedBonus = lockedTurnovers.reduce(
    (sum, t) => sum + (t.bonusAmount || t.bonus || 0),
    0,
  );

  const remainingTurnover = lockedTurnovers.reduce(
    (sum, t) => sum + (t.remainingTurnover || t.remaining || 0),
    0,
  );

  const totalTurnover = lockedTurnovers.reduce(
    (sum, t) =>
      sum + (t.turnoverRequired || t.requiredAmount || t.turnover || 0),
    0,
  );

  const withdrawBlocked = lockedTurnovers.some((t) => !!t.withdrawLocked);

  const bonusStatus = lockedTurnovers.some((t) => t.status === "active")
    ? "active"
    : "pending";

  const data = {
    bonusAmount: lockedBonus,
    remainingTurnover,
    totalTurnover,
    withdrawBlocked,
    bonusStatus,
  };

  return { data };
};

export default {
  getActiveBonus,
};
