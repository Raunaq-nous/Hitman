// Legal-ball primitives. Cricket overs are base-6: "10.4" means 10 overs and 4 legal balls = 64 balls.
// Wides and no-balls are not legal balls and never advance the count.

export const BALLS_PER_OVER = 6;

const OVERS_PATTERN = /^(\d+)(?:\.(\d))?$/;

/** Parse an overs string or number such as "10.4" or 10.4 into legal balls (64). Throws on invalid input like "10.6". */
export function parseOvers(overs: string | number): number {
  const text = typeof overs === "number" ? String(overs) : overs.trim();
  const match = OVERS_PATTERN.exec(text);
  if (!match) throw new RangeError(`invalid overs "${text}": expected whole overs and 0-5 balls, e.g. "10.4"`);
  const balls = match[2] === undefined ? 0 : Number(match[2]);
  if (balls >= BALLS_PER_OVER) throw new RangeError(`invalid overs "${text}": the ball part must be 0-5`);
  return Number(match[1]) * BALLS_PER_OVER + balls;
}

/** Format legal balls as overs: 64 → "10.4", 60 → "10". */
export function formatOvers(legalBalls: number): string {
  if (!Number.isInteger(legalBalls) || legalBalls < 0) throw new RangeError(`legal balls must be a non-negative integer, got ${legalBalls}`);
  const whole = Math.floor(legalBalls / BALLS_PER_OVER);
  const rest = legalBalls % BALLS_PER_OVER;
  return rest === 0 ? String(whole) : `${whole}.${rest}`;
}

/** Runs per six legal balls. Returns null before the first legal ball (no rate exists yet). */
export function runRate(runs: number, legalBalls: number): number | null {
  if (legalBalls < 0 || runs < 0) throw new RangeError("runs and legal balls must be non-negative");
  if (legalBalls === 0) return null;
  return (runs * BALLS_PER_OVER) / legalBalls;
}

/** Required run rate for a chase. Null when no legal balls remain. */
export function requiredRunRate(runsRequired: number, legalBallsLeft: number): number | null {
  if (legalBallsLeft < 0) throw new RangeError("legal balls left must be non-negative");
  if (legalBallsLeft === 0) return null;
  return (Math.max(0, runsRequired) * BALLS_PER_OVER) / legalBallsLeft;
}
