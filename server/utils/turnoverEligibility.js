const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const isTurnoverCompleteForWithdrawal = (turnover = {}) => {
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

const canWithdrawWithTurnover = (turnover = null) =>
  !turnover || isTurnoverCompleteForWithdrawal(turnover);

const logTurnoverValidation = (turnover = null) => {
  const canWithdraw = canWithdrawWithTurnover(turnover);

  console.log("TURNOVER RECORD:", turnover);
  console.log("Withdraw Locked:", turnover?.withdrawLocked);
  console.log("Status:", turnover?.status);
  console.log("Completed:", turnover?.turnoverCompleted);
  console.log("Required:", turnover?.turnoverRequired);
  console.log("Percentage:", turnover?.turnoverPercentage);
  console.log("Can Withdraw:", canWithdraw);

  return canWithdraw;
};

module.exports = {
  isTurnoverCompleteForWithdrawal,
  canWithdrawWithTurnover,
  logTurnoverValidation,
};
