// Doubly robust estimate of the mean outcome under an action (Jiang & Li, ICML 2016 style): an outcome model plus
// inverse-propensity correction. Unbiased if either the outcome model or the propensities are right. Offline only.

export interface LoggedDecision { action: 0 | 1; reward: number; propensity: number; m0: number; m1: number }

export function drEstimate(rows: LoggedDecision[], action: 0 | 1): number {
  if (rows.length === 0) throw new RangeError("no logged decisions");
  let sum = 0;
  for (const r of rows) {
    if (!(r.propensity > 0 && r.propensity < 1)) throw new RangeError("propensities must be strictly between 0 and 1");
    const m = action === 1 ? r.m1 : r.m0;
    const p = action === 1 ? r.propensity : 1 - r.propensity;
    sum += m + (r.action === action ? (r.reward - m) / p : 0);
  }
  return sum / rows.length;
}
