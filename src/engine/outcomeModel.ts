// Per-ball outcome model for chases: P(outcome | state bucket) over {0..6, W}, fitted on second innings of older
// seasons with era weights and hierarchical smoothing (bucket → balls×wickets parent → global).
import { OUTCOMES, type ChaseState, type Outcome, type OutcomeDist } from "./chaseWp";

export interface ChaseBall { matchId: string; year: number; innings: number; runsBatter: number; extras: number; extraType: string | null; wicket: boolean; target: number | null }
export interface Sample { matchId: string; year: number; target: number; state: ChaseState; outcome: Outcome }

const BALL_BANDS = [6, 12, 24, 36, 60, 120];
const WICKET_BANDS = [2, 4, 6, 8, 10];
const RATE_BANDS = [6, 8, 10, 12, 15, Infinity];
// the target sets the match's scoring environment (pitch, era): chases of 210 are batted differently from chases of 150
const TARGET_BANDS = [150, 170, 190, 210, Infinity];
const band = (v: number, edges: number[]): number => edges.findIndex((e) => v <= e);

export function bucketKey(s: ChaseState, target: number): string {
  const rate = (s.r * 6) / s.b;
  return `${band(target, TARGET_BANDS)}:${band(s.b, BALL_BANDS)}:${band(s.w, WICKET_BANDS)}:${band(rate, RATE_BANDS)}`;
}
const parentKey = (s: ChaseState, target: number): string => `${band(target, TARGET_BANDS)}:${band(s.b, BALL_BANDS)}:${band(s.w, WICKET_BANDS)}`;

/**
 * Turn one match's second-innings deliveries (in bowling order) into legal-ball samples. Extras from wides and
 * no-balls carry to the next legal ball; a wicket on an illegal delivery (e.g. run out off a wide) becomes that
 * legal ball's W; run-outs count as wickets. Assumes a full 20-over chase (rain-affected matches are excluded upstream).
 */
export function chaseSamples(balls: ChaseBall[], maxBalls = 120): Sample[] {
  const out: Sample[] = [];
  const second = balls.filter((b) => b.innings === 2);
  const target = second.find((b) => b.target !== null)?.target;
  if (!target) return out;
  let legal = 0, score = 0, wickets = 0, pendingRuns = 0, pendingWicket = false;
  for (const b of second) {
    const illegal = b.extraType === "wides" || b.extraType === "noballs";
    if (illegal) {
      pendingRuns += b.runsBatter + b.extras;
      pendingWicket = pendingWicket || b.wicket;
      continue;
    }
    const state = { b: maxBalls - legal, w: 10 - wickets, r: target - score - pendingRuns };
    if (state.b <= 0 || state.w <= 0 || state.r <= 0) break;
    const wicket = b.wicket || pendingWicket;
    const runs = b.runsBatter + b.extras;
    out.push({ matchId: b.matchId, year: b.year, target, state, outcome: wicket ? "W" : (Math.min(6, runs) as Outcome) });
    // the score uses every run (carried extras included); the outcome caps at 6
    score += pendingRuns + runs;
    if (wicket) wickets++;
    legal++;
    pendingRuns = 0;
    pendingWicket = false;
  }
  return out;
}

export interface OutcomeArtifact {
  version: string;
  trainedOnYears: number[];
  heldOutYears: number[];
  halfLifeYears: number;
  pseudoCounts: { bucket: number; parent: number };
  samples: number;
  global: OutcomeDist;
  parents: Record<string, OutcomeDist>;
  buckets: Record<string, OutcomeDist>;
  /** false: one target band for every chase (absent means conditioned on the target band) */
  targetConditioning?: boolean;
}

/** The target the buckets see: the real one, or a fixed one when the artifact isn't target-conditioned. */
const keyTarget = (conditioned: boolean, target: number): number => (conditioned ? target : 0);

const zero = (): Record<Outcome, number> => Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<Outcome, number>;
const normalise = (c: Record<Outcome, number>): OutcomeDist => {
  const total = OUTCOMES.reduce<number>((a, o) => a + c[o], 0);
  return Object.fromEntries(OUTCOMES.map((o) => [o, c[o] / total])) as OutcomeDist;
};
const shrink = (c: Record<Outcome, number>, prior: OutcomeDist, k: number): OutcomeDist => {
  const m = zero();
  for (const o of OUTCOMES) m[o] = c[o] + k * prior[o];
  return normalise(m);
};

/** Fit on samples from `trainYears` only (later seasons can't leak in). Era weight 0.5^((latest − year) / halfLife). */
export function fitOutcomes(samples: Sample[], trainYears: number[], heldOutYears: number[], opts: { halfLifeYears: number; bucketK: number; parentK: number; targetConditioning?: boolean } = { halfLifeYears: 4, bucketK: 200, parentK: 500 }, version = "v1"): OutcomeArtifact {
  const conditioned = opts.targetConditioning !== false;
  const train = new Set(trainYears);
  const latest = Math.max(...trainYears);
  const g = zero();
  const pc: Record<string, Record<Outcome, number>> = {};
  const bc: Record<string, Record<Outcome, number>> = {};
  let n = 0;
  for (const s of samples) {
    if (!train.has(s.year)) continue;
    const w = 0.5 ** ((latest - s.year) / opts.halfLifeYears);
    g[s.outcome] += w;
    const t = keyTarget(conditioned, s.target);
    (pc[parentKey(s.state, t)] ??= zero())[s.outcome] += w;
    (bc[bucketKey(s.state, t)] ??= zero())[s.outcome] += w;
    n++;
  }
  if (n === 0) throw new RangeError("no training samples in the training seasons");
  const global = normalise(g);
  const parents = Object.fromEntries(Object.entries(pc).map(([k, c]) => [k, shrink(c, global, opts.parentK)]));
  const buckets = Object.fromEntries(Object.entries(bc).map(([k, c]) => [k, shrink(c, parents[k.split(":").slice(0, 3).join(":")], opts.bucketK)]));
  return { version, trainedOnYears: [...trainYears].sort(), heldOutYears: [...heldOutYears].sort(), halfLifeYears: opts.halfLifeYears, pseudoCounts: { bucket: opts.bucketK, parent: opts.parentK }, samples: n, global, parents, buckets, ...(conditioned ? {} : { targetConditioning: false }) };
}

/** Distribution for a state in a chase of `target`: its bucket, else its parent, else the global distribution. */
export function predictOutcome(a: OutcomeArtifact, s: ChaseState, target: number): OutcomeDist {
  const t = keyTarget(a.targetConditioning !== false, target);
  return a.buckets[bucketKey(s, t)] ?? a.parents[parentKey(s, t)] ?? a.global;
}

/**
 * Playing styles open to a chaser: its own bucket's distribution plus those of sides with fewer wickets in hand (a
 * side can always bat as if it had fewer wickets). With createChaseModel this keeps WP monotonic in wickets.
 */
export function predictStyles(a: OutcomeArtifact, s: ChaseState, target: number): OutcomeDist[] {
  const own = band(s.w, WICKET_BANDS);
  return [predictOutcome(a, s, target), ...WICKET_BANDS.slice(0, own).map((w) => predictOutcome(a, { ...s, w }, target))];
}
