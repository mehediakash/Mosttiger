/**
 * Safe currency / wallet balance formatter with exactly 2 decimal places.
 * Formats numbers with comma thousands separators and two decimal digits.
 * Examples:
 *   150      -> "150.00"
 *   100      -> "100.00"
 *   0        -> "0.00"
 *   25.5     -> "25.50"
 *   25.55    -> "25.55"
 *   1000     -> "1,000.00"
 *   null     -> "--"
 *   undefined-> "--"
 */
export const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default formatMoney;
