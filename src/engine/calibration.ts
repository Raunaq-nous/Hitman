// Isotonic recalibration (pool-adjacent-violators) and the calibration gate: every 10-point bucket with enough
// samples must be within 5 percentage points of its observed win rate.

export interface Sample { p: number; y: 0 | 1; /** optional weight (e.g. era weight); default 1 */ w?: number }
export interface IsotonicMap { xs: number[]; ys: number[] }

/** Fit a non-decreasing map from predicted probability to observed frequency. */
export function fitIsotonic(samples: Sample[]): IsotonicMap {
  if (samples.length === 0) throw new RangeError("cannot fit calibration on no samples");
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const blocks: { sum: number; n: number; lo: number; hi: number }[] = [];
  for (const s of sorted) {
    const w = s.w ?? 1;
    blocks.push({ sum: s.y * w, n: w, lo: s.p, hi: s.p });
    while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].n > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].n) {
      const b = blocks.pop() as (typeof blocks)[number];
      const a = blocks[blocks.length - 1];
      a.sum += b.sum; a.n += b.n; a.hi = b.hi;
    }
  }
  const xs: number[] = [], ys: number[] = [];
  for (const b of blocks) {
    xs.push(b.lo, b.hi);
    ys.push(b.sum / b.n, b.sum / b.n);
  }
  return { xs, ys };
}

/** Apply a calibration map with linear interpolation between knots, clamped at the ends. */
export function applyIsotonic(map: IsotonicMap, p: number): number {
  const { xs, ys } = map;
  if (p <= xs[0]) return ys[0];
  if (p >= xs[xs.length - 1]) return ys[ys.length - 1];
  let i = 1;
  while (xs[i] < p) i++;
  // here xs[i - 1] < p <= xs[i], so the interval has positive width
  const [x0, x1, y0, y1] = [xs[i - 1], xs[i], ys[i - 1], ys[i]];
  return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
}

export interface Bucket { lo: number; hi: number; n: number; meanPredicted: number | null; observed: number | null; errorPts: number | null }

/** Reliability buckets of width 0.1 (also the Notebook's reliability diagram data). */
export function buckets(samples: Sample[]): Bucket[] {
  return Array.from({ length: 10 }, (_, i) => {
    const lo = i / 10, hi = (i + 1) / 10;
    const inB = samples.filter((s) => s.p >= lo && (i === 9 ? s.p <= hi : s.p < hi));
    if (inB.length === 0) return { lo, hi, n: 0, meanPredicted: null, observed: null, errorPts: null };
    const meanPredicted = inB.reduce((a, s) => a + s.p, 0) / inB.length;
    const observed = inB.reduce((a, s) => a + s.y, 0) / inB.length;
    return { lo, hi, n: inB.length, meanPredicted, observed, errorPts: Math.abs(meanPredicted - observed) * 100 };
  });
}

/** CI gate: buckets with at least `minN` samples must be within `maxErrorPts`. */
export function calibrationGate(bs: Bucket[], minN = 200, maxErrorPts = 5): { ok: boolean; failing: Bucket[]; checked: number } {
  const checked = bs.filter((b) => b.n >= minN);
  const failing = checked.filter((b) => (b.errorPts as number) > maxErrorPts);
  return { ok: failing.length === 0, failing, checked: checked.length };
}

export interface BucketPower { lo: number; hi: number; n: number; clusters: number; sePts: number; pWithin: number }

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 erf, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * How well the gate can tell calibrated from miscalibrated. Samples in one cluster (one match) share an outcome, so
 * under perfect calibration a bucket's observed rate has variance Σ n_c² q_c(1−q_c) / N² over clusters c. Returns
 * each gated bucket's standard error and the chance a perfectly calibrated model lands within `tolerancePts`, and the
 * chance it passes every gated bucket (buckets treated as independent).
 */
export function gatePower(samples: (Sample & { cluster: string })[], tolerancePts = 5, minN = 200): { buckets: BucketPower[]; passProbability: number } {
  const out: BucketPower[] = [];
  for (let i = 0; i < 10; i++) {
    const lo = i / 10, hi = (i + 1) / 10;
    const inB = samples.filter((s) => s.p >= lo && (i === 9 ? s.p <= hi : s.p < hi));
    if (inB.length < minN) continue;
    const per = new Map<string, { n: number; q: number }>();
    for (const s of inB) { const c = per.get(s.cluster) ?? { n: 0, q: 0 }; c.n++; c.q += s.p; per.set(s.cluster, c); }
    let v = 0;
    for (const c of per.values()) { const q = c.q / c.n; v += c.n * c.n * q * (1 - q); }
    const se = Math.sqrt(v) / inB.length;
    const pWithin = se === 0 ? 1 : 2 * normalCdf(tolerancePts / 100 / se) - 1;
    out.push({ lo, hi, n: inB.length, clusters: per.size, sePts: se * 100, pWithin });
  }
  return { buckets: out, passProbability: out.reduce((a, b) => a * b.pWithin, 1) };
}
