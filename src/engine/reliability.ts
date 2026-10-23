// Notebook maths (docs/product-specs/decision-lab.md, "Notebook"): reliability in 10-point confidence buckets, Brier
// over time and per-domain skill. Pure; small samples are flagged, never hidden.
import { brier } from "./grader";

/** Fewer graded calls than this in a bucket or domain is a small sample. */
export const MIN_SAMPLE = 10;

export interface ScoredCall { confidence: number; hit: boolean }
export interface Bucket { lo: number; hi: number; n: number; meanConfidence: number | null; hitRate: number | null; small: boolean }

/** Confidence buckets 50–59 … 90–99 (percent): how often calls at each confidence were right. */
export function reliabilityBuckets(calls: ScoredCall[]): Bucket[] {
  const buckets = [50, 60, 70, 80, 90].map((lo) => ({ lo, hi: lo + 9, conf: [] as number[], hits: 0 }));
  for (const c of calls) {
    if (!(c.confidence >= 0.5 && c.confidence <= 0.99)) throw new RangeError("confidence must be between 0.5 and 0.99");
    const b = buckets[Math.min(4, Math.floor(Math.round(c.confidence * 100) / 10) - 5)];
    b.conf.push(c.confidence);
    if (c.hit) b.hits++;
  }
  return buckets.map((b) => ({
    lo: b.lo, hi: b.hi, n: b.conf.length,
    meanConfidence: b.conf.length ? b.conf.reduce((a, x) => a + x, 0) / b.conf.length : null,
    hitRate: b.conf.length ? b.hits / b.conf.length : null,
    small: b.conf.length < MIN_SAMPLE,
  }));
}

/** Each call's Brier score in order, with the running mean. */
export function brierSeries(calls: ScoredCall[]): { i: number; brier: number; mean: number }[] {
  let sum = 0;
  return calls.map((c, k) => {
    const b = brier(c.confidence, c.hit ? 1 : 0);
    sum += b;
    return { i: k + 1, brier: b, mean: sum / (k + 1) };
  });
}

export interface DomainScore { domain: string; n: number; meanRead: number | null; hitRate: number | null; small: boolean }

/** Mean read points and hit rate per skill domain (a call counts in each of its domains), in `order`. */
export function domainScores(calls: { domains: string[]; readPoints: number; hit: boolean }[], order: string[]): DomainScore[] {
  return order.map((domain) => {
    const own = calls.filter((c) => c.domains.includes(domain));
    return {
      domain, n: own.length,
      meanRead: own.length ? own.reduce((a, c) => a + c.readPoints, 0) / own.length : null,
      hitRate: own.length ? own.filter((c) => c.hit).length / own.length : null,
      small: own.length < MIN_SAMPLE,
    };
  });
}
