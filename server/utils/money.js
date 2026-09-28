/**
 * Central Monetary Normalization Utility for Bangladeshi Taka (BDT)
 *
 * STANDARD:
 * 1 Taka = 100 Poisha.
 * Maximum 2 decimal places for all persisted and calculated monetary amounts.
 *
 * Rounding Convention:
 * Standard half-up (away from zero).
 * Uses exponential notation ("e2" / "e-2") to prevent IEEE 754 floating-point rounding artifacts
 * on boundary values (e.g. 10.005 -> 10.01, 1.005 -> 1.01).
 */

function roundBDT(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  return sign * Number(Math.round(Number(abs + "e2")) + "e-2");
}

function formatBDT(value) {
  return roundBDT(value).toFixed(2);
}

module.exports = {
  roundBDT,
  toBDT: roundBDT,
  r2: roundBDT,
  formatBDT,
};
