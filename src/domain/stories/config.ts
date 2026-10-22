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

type P = Record<string, string | number>;
const plural = (n: number | string, word: string): string => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;
const possessive = (name: string | number): string => (String(name).endsWith("s") ? `${name}’` : `${name}’s`);

/** Story titles in each language, built only from the story's own parameters. */
export const TITLES: Record<"en" | "hi", Record<string, (p: P) => string>> = {
  en: {
    "big-over": (p) => `${p.team} take ${p.runs} off over ${p.over}`,
    collapse: (p) => `${p.team} lose ${p.wickets} wickets in ${plural(p.balls, "ball")}`,
    swing: (p) => `${possessive(p.team)} chase swings from ${p.from}% to ${p.to}%`,
    "tense-finish": (p) => `${p.team} need ${p.runs} off ${plural(p.balls, "ball")} with ${plural(p.wickets, "wicket")} left (${p.wp}% to win)`,
    "late-goal": (p) => `${p.who} scores late for ${p.team} (${p.minute}')`,
    goal: (p) => `${p.who} scores for ${p.team} (${p.minute}')`,
    "big-chance-missed": (p) => `${p.who} misses a big chance for ${p.team} (${p.minute}', xG ${p.xg})`,
    "pit-stop": (p) => `Car ${p.car} leaves the pits on lap ${p.lap}`,
    pace: (p) => `Car ${p.car} laps ${p.gain} s under its median on lap ${p.lap}`,
  },
  hi: {
    "big-over": (p) => `${p.team} ने ओवर ${p.over} में ${p.runs} रन बनाए`,
    collapse: (p) => `${p.team} ने ${p.balls} गेंदों में ${p.wickets} विकेट गंवाए`,
    swing: (p) => `${p.team} के पीछा करने की जीत की संभावना ${p.from}% से ${p.to}% हुई`,
    "tense-finish": (p) => `${p.team} को ${p.balls} गेंदों में ${p.runs} रन चाहिए, ${p.wickets} विकेट बाकी (जीत की संभावना ${p.wp}%)`,
    "late-goal": (p) => `${p.who} ने ${p.team} के लिए देर से गोल किया (${p.minute}')`,
    goal: (p) => `${p.who} ने ${p.team} के लिए गोल किया (${p.minute}')`,
    "big-chance-missed": (p) => `${p.who} ने ${p.team} के लिए बड़ा मौका गंवाया (${p.minute}', xG ${p.xg})`,
    "pit-stop": (p) => `कार ${p.car} लैप ${p.lap} पर पिट से निकली`,
    pace: (p) => `कार ${p.car} ने लैप ${p.lap} पर अपने मीडियन से ${p.gain} सेकंड कम का लैप लगाया`,
  },
};
