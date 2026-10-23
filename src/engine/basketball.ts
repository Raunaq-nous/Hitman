// The Closer's clutch-time leverage (illustrative tool): a textbook win-probability model for basketball — the final
// margin is the current margin plus normal noise whose spread grows with the square root of time left — and the
// leverage of one possession (a 2-point swing either way) at a given margin and time.

/** Spread of the final margin over a full 48-minute game, in points (illustrative). */
const SIGMA_FULL_GAME = 13;
const GAME_SECONDS = 2880;

function phi(z: number): number {
  // Abramowitz–Stegun 7.1.26 erf approximation (max error 1.5e-7)
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** P(the leading-by-`margin` side wins) with `secondsLeft` to play; level at the buzzer counts as 0.5 (overtime). */
export function basketballWp(margin: number, secondsLeft: number): number {
  if (!(secondsLeft >= 0)) throw new RangeError("seconds left must be ≥ 0");
  if (secondsLeft === 0) return margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
  const sd = SIGMA_FULL_GAME * Math.sqrt(secondsLeft / GAME_SECONDS);
  return phi(margin / sd);
}

/** Win-probability swing between scoring and conceding the next possession (±2 points). */
export const clutchLeverage = (margin: number, secondsLeft: number): number => basketballWp(margin + 2, secondsLeft) - basketballWp(margin - 2, secondsLeft);
