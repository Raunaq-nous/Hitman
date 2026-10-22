// Explicit per-sport thresholds for the rules-first story detector. Changing a number here changes what the Desk
// calls a story, so each one is named and documented.
export const THRESHOLDS = {
  cricket: {
    /** |ΔWP| over a window of `swingWindowBalls` legal balls in a chase */
    swing: 0.15,
    swingWindowBalls: 6,
    /** wickets falling within `collapseWindowBalls` legal balls */
    collapseWickets: 3,
    collapseWindowBalls: 12,
    /** runs off one over (extras included) */
    bigOverRuns: 18,
    /** a chase still in the balance (WP between the bounds) with this many legal balls or fewer left */
    tenseBallsLeft: 12,
    tenseLo: 0.3,
    tenseHi: 0.7,
  },
  football: {
    lateGoalMinute: 80,
    /** a shot this likely to score (StatsBomb xG) that didn't */
    bigChanceXg: 0.3,
  },
  f1: {
    /** a car's fastest lap at least this many seconds under its median lap */
    quickLapGainSeconds: 1.5,
  },
} as const;

/** Priority = base + scale × magnitude, so kinds compare on one scale (higher is shown first). */
export const PRIORITY: Record<string, { base: number; scale: number }> = {
  swing: { base: 0, scale: 100 },
  "tense-finish": { base: 80, scale: 0 },
  collapse: { base: 20, scale: 10 },
  "big-over": { base: 0, scale: 2 },
  "late-goal": { base: 90, scale: 0 },
  goal: { base: 70, scale: 0 },
  "big-chance-missed": { base: 40, scale: 50 },
  "pit-stop": { base: 30, scale: 0 },
  pace: { base: 20, scale: 10 },
};
