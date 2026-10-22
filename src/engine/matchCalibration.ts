// Match-level calibration test (D-027, docs/design-docs/models-and-grading.md). Balls of one chase share its result,
// so the unit of evidence is the match: buckets need enough distinct matches, intervals come from resampling whole
// matches, and every average counts each match once. Pure and deterministic (seeded).
import { next, OUTCOMES, terminal, type ChaseModel, type ChaseState } from "./chaseWp";

export interface MatchSample { p: number; y: 0 | 1; match: string }

/** Deterministic uniform [0, 1) generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const bin = (p: number): number => Math.min(9, Math.max(0, Math.floor(p * 10)));

/**
 * 10-point bins merged left to right until each bucket holds at least `minMatches` distinct matches; a short
 * remainder joins the last bucket. Returns [lo, hi) bin ranges as probabilities (the last bucket includes 1).
 */
export function mergeBuckets(samples: MatchSample[], minMatches = 40): { lo: number; hi: number }[] {
  const perBin = Array.from({ length: 10 }, () => new Set<string>());
  for (const s of samples) perBin[bin(s.p)].add(s.match);
  const out: { lo: number; hi: number; matches: Set<string> }[] = [];
  let open: { lo: number; matches: Set<string> } | null = null;
  for (let i = 0; i < 10; i++) {
    open ??= { lo: i, matches: new Set() };
    for (const m of perBin[i]) open.matches.add(m);
    if (open.matches.size >= minMatches) { out.push({ lo: open.lo, hi: i + 1, matches: open.matches }); open = null; }
  }
  if (open) {
    const last = out.pop();
    out.push(last ? { lo: last.lo, hi: 10, matches: last.matches } : { lo: open.lo, hi: 10, matches: open.matches });
  }
  return out.map((b) => ({ lo: b.lo / 10, hi: b.hi / 10 }));
}

export interface MatchBucket { lo: number; hi: number; matches: number; balls: number; meanPredicted: number; observed: number; ciLo: number; ciHi: number; covered: boolean }

export interface MatchCalibrationResult { buckets: MatchBucket[]; ece: number; eceDebiased: number; matches: number; pass: boolean }

/**
 * Per bucket: each match contributes once (its mean prediction over its balls in the bucket, and its result).
 * The interval is a match-level cluster bootstrap of the observed win rate (`boot` resamples of whole matches,
 * percentile interval at `level`). Passes when every interval contains its bucket's mean prediction and the
 * match-weighted calibration error is at most `maxEce`.
 */
export function matchCalibrationTest(samples: MatchSample[], opts: { minMatches?: number; boot?: number; level?: number; maxEce?: number; seed?: number; simultaneous?: boolean; debiasedEce?: boolean } = {}): MatchCalibrationResult {
  const { minMatches = 40, boot = 1000, maxEce = 0.05, seed = 1, simultaneous = false, debiasedEce = false } = opts;
  if (samples.length === 0) throw new RangeError("no samples to test");
  const ranges = mergeBuckets(samples, minMatches);
  // simultaneous: Bonferroni, so all the buckets' intervals hold together with probability `level`
  const level = simultaneous ? 1 - (1 - (opts.level ?? 0.95)) / ranges.length : opts.level ?? 0.95;
  const bucketOf = (p: number): number => ranges.findIndex((r, i) => p >= r.lo && (p < r.hi || i === ranges.length - 1));
  // per match: result, and per bucket the sum and count of its predictions
  const matches = new Map<string, { y: 0 | 1; sum: number[]; n: number[] }>();
  for (const s of samples) {
    let m = matches.get(s.match);
    if (!m) { m = { y: s.y, sum: ranges.map(() => 0), n: ranges.map(() => 0) }; matches.set(s.match, m); }
    const b = bucketOf(s.p);
    m.sum[b] += s.p; m.n[b] += 1;
  }
  const list = [...matches.values()];
  const observedOf = (pool: typeof list, b: number): number => {
    let k = 0, ys = 0;
    for (const m of pool) if (m.n[b] > 0) { k++; ys += m.y; }
    return k ? ys / k : NaN;
  };
  const rand = seededRandom(seed);
  const draws: number[][] = ranges.map(() => []);
  for (let r = 0; r < boot; r++) {
    const pool = Array.from({ length: list.length }, () => list[Math.floor(rand() * list.length)]);
    ranges.forEach((_, b) => { const o = observedOf(pool, b); if (!Number.isNaN(o)) draws[b].push(o); });
  }
  const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; };
  const buckets = ranges.map((r, b) => {
    const inB = list.filter((m) => m.n[b] > 0);
    const meanPredicted = inB.reduce((a, m) => a + m.sum[b] / m.n[b], 0) / inB.length;
    const observed = inB.reduce((a, m) => a + m.y, 0) / inB.length;
    const ciLo = q(draws[b], (1 - level) / 2), ciHi = q(draws[b], 1 - (1 - level) / 2);
    return { lo: r.lo, hi: r.hi, matches: inB.length, balls: inB.reduce((a, m) => a + m.n[b], 0), meanPredicted, observed, ciLo, ciHi, covered: ciLo <= meanPredicted && meanPredicted <= ciHi };
  });
  const total = buckets.reduce((a, b) => a + b.matches, 0);
  const ece = buckets.reduce((a, b) => a + (b.matches / total) * Math.abs(b.meanPredicted - b.observed), 0);
  // debiased: remove each bucket's sampling noise (bootstrap standard error) from its squared gap before the root
  const eceDebiased = buckets.reduce((a, b, i) => {
    const d = draws[i], m = d.reduce((x, y) => x + y, 0) / d.length, v = d.reduce((x, y) => x + (y - m) ** 2, 0) / d.length;
    return a + (b.matches / total) * Math.sqrt(Math.max(0, (b.meanPredicted - b.observed) ** 2 - v));
  }, 0);
  return { buckets, ece, eceDebiased, matches: list.length, pass: buckets.every((b) => b.covered) && (debiasedEce ? eceDebiased : ece) <= maxEce };
}

/** Brier score with every match counted once (the mean of its balls' squared errors). */
export function matchBrier(samples: MatchSample[]): number {
  const per = new Map<string, { s: number; n: number }>();
  for (const x of samples) { const m = per.get(x.match) ?? { s: 0, n: 0 }; m.s += (x.p - x.y) ** 2; m.n++; per.set(x.match, m); }
  const ms = [...per.values()];
  return ms.reduce((a, m) => a + m.s / m.n, 0) / ms.length;
}

/** One-feature logistic regression P(y=1) = σ(a + b·x) by weighted Newton–Raphson. */
export function fitLogistic(xs: number[], ys: (0 | 1)[], ws: number[] = xs.map(() => 1), iterations = 50): { a: number; b: number } {
  let a = 0, b = 0;
  for (let it = 0; it < iterations; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    xs.forEach((x, i) => {
      const p = 1 / (1 + Math.exp(-(a + b * x)));
      const w = ws[i], r = ys[i] - p, v = w * p * (1 - p);
      g0 += w * r; g1 += w * r * x; h00 += v; h01 += v * x; h11 += v * x * x;
    });
    const det = h00 * h11 - h01 * h01;
    if (!(det > 1e-12)) break;
    const da = (h11 * g0 - h01 * g1) / det, db = (h00 * g1 - h01 * g0) / det;
    a += da; b += db;
    if (Math.abs(da) + Math.abs(db) < 1e-10) break;
  }
  return { a, b };
}

export const logistic = (m: { a: number; b: number }, x: number): number => 1 / (1 + Math.exp(-(m.a + m.b * x)));

/**
 * Play one chase from `start` under the model's own played distributions. Returns the states before each ball and
 * the result (a tie is settled by a fair coin, as a super over would be). The model's WP along a simulated chase
 * is calibrated by construction, which is what the fairness simulation needs.
 */
export function simulateChase(model: ChaseModel, start: ChaseState, rand: () => number): { states: ChaseState[]; won: 0 | 1 } {
  const states: ChaseState[] = [];
  let s = start;
  for (let t = terminal(s); t === null; t = terminal(s)) {
    states.push(s);
    const d = model.played(s);
    let u = rand(), o: (typeof OUTCOMES)[number] = OUTCOMES[OUTCOMES.length - 1];
    for (const k of OUTCOMES) { if (u < d[k]) { o = k; break; } u -= d[k]; }
    s = next(s, o);
  }
  const end = terminal(s) as number;
  return { states, won: end === 0.5 ? (rand() < 0.5 ? 1 : 0) : (end as 0 | 1) };
}

const clampP = (p: number): number => Math.min(1 - 1e-6, Math.max(1e-6, p));
export const logit = (p: number): number => Math.log(clampP(p) / (1 - clampP(p)));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export interface WalkForwardMatch { match: string; date: string; y: 0 | 1; preds: number[] }

/**
 * Walk-forward recalibration within a season (D-030): predictions are shifted on the logit scale by an intercept δ
 * that starts at 0 and, after each completed date, moves by `eta` × the summed residuals (result − adjusted pre-match
 * probability) of that date's matches. A match is scored with the δ from earlier dates only, so same-day matches
 * never inform each other.
 */
export function walkForward(matches: WalkForwardMatch[], eta: number): { matches: WalkForwardMatch[]; deltas: number[] } {
  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.match.localeCompare(b.match));
  const out: WalkForwardMatch[] = [];
  const deltas: number[] = [];
  let delta = 0;
  for (let i = 0; i < ordered.length;) {
    const day = ordered[i].date;
    let pending = 0;
    for (; i < ordered.length && ordered[i].date === day; i++) {
      const m = ordered[i];
      const preds = m.preds.map((p) => sigmoid(logit(p) + delta));
      out.push({ ...m, preds });
      deltas.push(delta);
      pending += m.y - preds[0];
    }
    delta += eta * pending;
  }
  return { matches: out, deltas };
}

/**
 * Calibration intercept and slope: weighted logistic regression of the result on logit(p), every match weighing 1
 * (its balls share 1/n each). Perfect calibration is intercept 0, slope 1.
 */
export function calibrationLine(samples: MatchSample[]): { a: number; b: number } {
  const n = new Map<string, number>();
  for (const s of samples) n.set(s.match, (n.get(s.match) ?? 0) + 1);
  return fitLogistic(samples.map((s) => logit(s.p)), samples.map((s) => s.y), samples.map((s) => 1 / (n.get(s.match) as number)));
}

/**
 * Joint test of intercept = 0 and slope = 1: Wald statistic with the covariance of (a, b) from a match-clustered
 * bootstrap, compared with the χ²(2) critical value at `alpha` (5.991 at 5%). Rejects when the statistic is larger.
 */
export function calibrationSlopeTest(samples: MatchSample[], opts: { boot?: number; seed?: number } = {}): { a: number; b: number; wald: number; critical: number; reject: boolean } {
  const { boot = 400, seed = 1 } = opts;
  const byMatch = new Map<string, { xs: number[]; y: 0 | 1 }>();
  for (const s of samples) { const g = byMatch.get(s.match) ?? { xs: [], y: s.y }; g.xs.push(logit(s.p)); byMatch.set(s.match, g); }
  const groups = [...byMatch.values()];
  const { a, b } = calibrationLine(samples);
  const rand = seededRandom(seed);
  const as: number[] = [], bs: number[] = [];
  for (let r = 0; r < boot; r++) {
    const xs: number[] = [], ys: (0 | 1)[] = [], ws: number[] = [];
    for (let k = 0; k < groups.length; k++) {
      const g = groups[Math.floor(rand() * groups.length)];
      const w = 1 / g.xs.length;
      for (const x of g.xs) { xs.push(x); ys.push(g.y); ws.push(w); }
    }
    const f = fitLogistic(xs, ys, ws);
    as.push(f.a); bs.push(f.b);
  }
  const mean = (xs: number[]): number => xs.reduce((x, y) => x + y, 0) / xs.length;
  const ma = mean(as), mb = mean(bs);
  const vaa = mean(as.map((x) => (x - ma) ** 2)), vbb = mean(bs.map((x) => (x - mb) ** 2)), vab = mean(as.map((x, i) => (x - ma) * (bs[i] - mb)));
  const det = vaa * vbb - vab * vab;
  const da = a, db = b - 1;
  const wald = det > 0 ? (vbb * da * da - 2 * vab * da * db + vaa * db * db) / det : Infinity;
  const critical = 5.991464547107979;
  return { a, b, wald, critical, reject: wald > critical };
}
