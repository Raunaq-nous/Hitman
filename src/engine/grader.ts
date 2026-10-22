// Grade the decision, not the outcome (docs/design-docs/models-and-grading.md).

export const COIN_FLIP_BAND_PTS = 2;

import type { Decision } from "./options";

/** Grades use the exact model's option differences while calibration is a known issue (D-031): always shown as provisional. */
export type CalibrationStatus = "provisional";
export interface Grade { readPoints: number; coinFlip: boolean; best: string; calibration: CalibrationStatus }

/**
 * read_points = WP(pick) − max WP(others), in percentage points, from the exact model's option-conditioned WP
 * (D-031). If the best and second-best options are within the coin-flip band, the call is "coin flip — no grade".
 */
export function grade(wpByOption: Record<string, number>, pick: string): Grade {
  const entries = Object.entries(wpByOption);
  if (entries.length < 2) throw new RangeError("a call needs at least two options");
  if (!(pick in wpByOption)) throw new RangeError(`unknown option ${pick}`);
  for (const [, v] of entries) if (!(v >= 0 && v <= 1)) throw new RangeError("win probabilities must be in [0, 1]");
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const coinFlip = (sorted[0][1] - sorted[1][1]) * 100 < COIN_FLIP_BAND_PTS;
  const otherBest = Math.max(...entries.filter(([k]) => k !== pick).map(([, v]) => v));
  return { readPoints: (wpByOption[pick] - otherBest) * 100, coinFlip, best: sorted[0][0], calibration: "provisional" };
}

/** Grade a pick against a moment's decision (F-E-05); a decision with too little data can't be graded. */
export function gradeDecision(d: Decision, pick: string): Grade | null {
  if (d.insufficient) return null;
  return grade(Object.fromEntries(d.options.map((o) => [o.option, o.wp])), pick);
}

/** Brier score for the chosen option: (confidence − happened)², confidence in [0.5, 0.99]. 0.7 and 0 → 0.49. */
export function brier(confidence: number, happened: 0 | 1): number {
  if (!(confidence >= 0.5 && confidence <= 0.99)) throw new RangeError("confidence must be between 0.5 and 0.99");
  return (confidence - happened) ** 2;
}
