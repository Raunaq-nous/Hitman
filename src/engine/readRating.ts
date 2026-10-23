// Read Rating: difficulty-weighted Elo for decisions; a call's result is whether the pick was the best option, its
// weight the read's margin (D-041). Start 1200; K = 40 for the first 20 graded calls, then 24;
// floor 100. Moments carry their own difficulty rating, updated slowly (K = 8).

export const START = 1200;
export const FLOOR = 100;
const READ_SCALE_PTS = 20;

export const expectedScore = (rating: number, difficulty: number): number => 1 / (1 + 10 ** ((difficulty - rating) / 400));

/** Result of a read: 1 if the pick was the best option, 0 if not, 0.5 for a tie (D-041). */
export function actualScore(readPoints: number): number {
  return readPoints > 0 ? 1 : readPoints < 0 ? 0 : 0.5;
}

/** How much a read counts: its margin in points over READ_SCALE_PTS, capped at 1 (a near tie barely moves anything). */
export const readWeight = (readPoints: number): number => Math.min(1, Math.abs(readPoints) / READ_SCALE_PTS);

/** Difficulty from the gap between options (smaller gap = harder) and leverage (higher = harder). */
export function momentDifficulty(optionGapPts: number, leveragePercentile: number): number {
  if (!(leveragePercentile >= 0 && leveragePercentile <= 1)) throw new RangeError("leverage percentile must be in [0, 1]");
  const gap = Math.min(Math.abs(optionGapPts), 20);
  return Math.round(1000 + 400 * leveragePercentile + 10 * (20 - gap));
}

export interface RatingUpdate { rating: number; difficulty: number; k: number; expected: number; actual: number; weight: number }

export function updateRating(rating: number, gradedCalls: number, difficulty: number, readPoints: number): RatingUpdate {
  if (!Number.isInteger(gradedCalls) || gradedCalls < 0) throw new RangeError("graded calls must be a non-negative integer");
  const k = gradedCalls < 20 ? 40 : 24;
  const expected = expectedScore(rating, difficulty);
  const actual = actualScore(readPoints), weight = readWeight(readPoints);
  // the result decides the direction (a wrong pick never gains, the best pick never loses); the margin the size
  const next = Math.max(FLOOR, rating + k * weight * (actual - expected));
  // the moment moves the other way, slowly
  const nextDifficulty = difficulty - 8 * weight * (actual - expected);
  return { rating: next, difficulty: nextDifficulty, k, expected, actual, weight };
}
