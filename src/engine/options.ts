// Option-conditioned win probability (docs/design-docs/models-and-grading.md, "Option-conditioned WP").
// For a decision, each option has its own per-ball outcome distribution for the decision window (e.g. the next over),
// estimated from data-rich splits and shrunk toward the unconditional distribution; after the window the normal
// model applies. Options with too little data are marked insufficient; options within the coin-flip band aren't graded.
import { createChaseModel, OUTCOMES, type ChaseState, type Outcome, type OutcomeDist, type OutcomeModel } from "./chaseWp";

export type Counts = Record<Outcome, number>;
export const zeroCounts = (): Counts => Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Counts;

/** Shrink option counts toward a prior distribution with `k` pseudo-observations: (n_o + k·prior_o) / (n + k). */
export function shrinkToward(counts: Counts, prior: OutcomeDist, k: number): OutcomeDist {
  const n = OUTCOMES.reduce<number>((a, o) => a + counts[o], 0);
  if (n + k <= 0) throw new RangeError("need observations or a prior weight");
  return Object.fromEntries(OUTCOMES.map((o) => [o, (counts[o] + k * prior[o]) / (n + k)])) as OutcomeDist;
}

export interface OptionInput { option: string; dist: OutcomeDist; n: number }
export interface OptionResult { option: string; wp: number; n: number; sufficient: boolean }
export interface Decision { options: OptionResult[]; best: string | null; gapPts: number; coinFlip: boolean; insufficient: boolean }

/**
 * WP from `start` if the batting side faces `dist` for the next `windowBalls` legal balls (or until the chase ends),
 * then the base model. Exact backward induction, so the window's effect carries through the rest of the chase.
 */
export function optionWp(base: OutcomeModel, dist: OutcomeDist, start: ChaseState, windowBalls: number): number {
  if (!(windowBalls >= 1)) throw new RangeError("the decision window must cover at least one ball");
  const last = start.b - windowBalls;
  return createChaseModel((s) => (s.b > last && s.b <= start.b ? dist : base(s))).wp(start);
}

/** Rank options; a gap under `coinFlip` (probability) between the best two is a coin flip; thin options are flagged. */
export function decide(start: ChaseState, base: OutcomeModel, inputs: OptionInput[], opts: { windowBalls: number; minN: number; coinFlip?: number }): Decision {
  const { windowBalls, minN, coinFlip = 0.02 } = opts;
  if (inputs.length < 2) throw new RangeError("a decision needs at least two options");
  const options = inputs.map((i) => ({ option: i.option, wp: optionWp(base, i.dist, start, windowBalls), n: i.n, sufficient: i.n >= minN }));
  const ranked = [...options].sort((a, b) => b.wp - a.wp);
  const gapPts = (ranked[0].wp - ranked[1].wp) * 100;
  const insufficient = options.some((o) => !o.sufficient);
  const coin = gapPts < coinFlip * 100;
  return { options, best: insufficient || coin ? null : ranked[0].option, gapPts, coinFlip: coin, insufficient };
}

/** Index of the first band edge at or above `v` (the outcome model's banding). */
export const bandOf = (v: number, edges: readonly number[]): number => edges.findIndex((e) => v <= e);

/** Weighted outcome counts per option and situation key, from labelled samples. */
export function fitOptionCounts(samples: { option: string; key: string; outcome: Outcome; w?: number }[]): Record<string, Record<string, Counts>> {
  const out: Record<string, Record<string, Counts>> = {};
  for (const s of samples) ((out[s.option] ??= {})[s.key] ??= zeroCounts())[s.outcome] += s.w ?? 1;
  return out;
}

export const totalCount = (c: Counts | undefined): number => (c ? OUTCOMES.reduce<number>((a, o) => a + c[o], 0) : 0);

// ---- Decision types (docs/product-specs/decision-lab.md) ----
const BALL_EDGES = [6, 12, 24, 36, 60, 120];
const WICKET_EDGES = [2, 4, 6, 8, 10];
export const RATE_EDGES = [6, 8, 10, 12, 15, Infinity];
// intent relative to the current band: one below, the same, one above
const INTENT_LABELS = ["ease off", "hold", "attack"];
const RATE_LABELS = ["up to 6 rpo", "6–8 rpo", "8–10 rpo", "10–12 rpo", "12–15 rpo", "over 15 rpo"];

/** The situation an option's counts are pooled over: balls-left band and wickets-in-hand band. */
export const situationKey = (s: ChaseState): string => `${bandOf(s.b, BALL_EDGES)}:${bandOf(s.w, WICKET_EDGES)}`;
export const rateBand = (s: ChaseState): number => bandOf((s.r * 6) / s.b, RATE_EDGES);

/** Option labels a historical ball contributes to: the required-rate band its side faced, and (death overs) its bowler's style. */
export function sampleOptions(s: ChaseState, bowlerStyle: "pace" | "spin" | null): string[] {
  return [`rate:${rateBand(s)}`, ...(bowlerStyle && s.b <= 24 ? [`style:${bowlerStyle}`] : [])];
}

export const DECISION_TYPES = ["next-over-intent", "chase-tempo", "death-bowling"] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

/**
 * The options a moment offers. Intent: bat like sides one required-rate band above (attack), in (hold) or below
 * (ease off) the current one, for the next over. Tempo: the required-rate band the chaser targets for the next two overs (the
 * current band and its neighbours). Death bowling (overs 17–20): pace or spin for the next over.
 */
export function momentOptions(type: DecisionType, s: ChaseState): { windowBalls: number; options: { option: string; label: string }[] } | null {
  const k = rateBand(s);
  if (type === "next-over-intent") {
    const bands = [k + 1, k, k - 1].filter((b) => b >= 0 && b < RATE_EDGES.length);
    return { windowBalls: Math.min(6, s.b), options: bands.map((b) => ({ option: `rate:${b}`, label: INTENT_LABELS[b - k + 1] })) };
  }
  if (type === "chase-tempo") {
    const bands = [k - 1, k, k + 1].filter((b) => b >= 0 && b < RATE_EDGES.length);
    return { windowBalls: Math.min(12, s.b), options: bands.map((b) => ({ option: `rate:${b}`, label: RATE_LABELS[b] })) };
  }
  if (s.b > 24) return null;
  return { windowBalls: Math.min(6, s.b), options: [{ option: "style:pace", label: "pace" }, { option: "style:spin", label: "spin" }] };
}

export interface OptionArtifact { version: string; trainedOnYears: number[]; shrinkK: number; minN: number; hasStyles: boolean; counts: Record<string, Record<string, Counts>> }

/** A moment's decision from the fitted counts: each option shrunk toward the state's own distribution `prior`. */
export function momentDecision(type: DecisionType, s: ChaseState, prior: OutcomeDist, base: OutcomeModel, a: OptionArtifact, coinFlip = 0.02): (Decision & { type: DecisionType; labels: Record<string, string> }) | null {
  const m = momentOptions(type, s);
  if (!m || (type === "death-bowling" && !a.hasStyles)) return null;
  const key = situationKey(s);
  const inputs = m.options.map((o) => {
    const c = a.counts[o.option]?.[key];
    return { option: o.option, dist: shrinkToward(c ?? zeroCounts(), prior, a.shrinkK), n: totalCount(c) };
  });
  return { ...decide(s, base, inputs, { windowBalls: m.windowBalls, minN: a.minN, coinFlip }), type, labels: Object.fromEntries(m.options.map((o) => [o.option, o.label])) };
}
