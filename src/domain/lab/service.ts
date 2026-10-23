// The Decision Lab's moments. Before lock a fan sees only the pre-lock state: the reveal and the model's option
// estimates stay on the server until the call is locked (F-L-02/F-L-03).
import { namedCache } from "@/providers/cache";
import { DomainError } from "@/domain/shared/types";
import * as repo from "./repo";
import { brier, grade } from "@/engine/grader";
import { momentDifficulty, START, updateRating } from "@/engine/readRating";
import type { CallReview, LockedCall, LockInput, PrelockMoment } from "./types";

const cache = namedCache<repo.MomentsFile>("lab-moments", { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1 });
const file = (): repo.MomentsFile => {
  const hit = cache.get("all");
  if (hit) return hit;
  const f = repo.momentsFile();
  cache.set("all", f);
  return f;
};
const moments = (): repo.StoredMoment[] => file().moments;

export function toPrelock(m: repo.StoredMoment): PrelockMoment {
  const p = m.prelock;
  return {
    id: m.id, season: m.season, battingTeam: p.battingTeam, bowlingTeam: p.bowlingTeam, venue: p.venue, target: p.target,
    ballsLeft: p.ballsLeft, wicketsInHand: p.wicketsInHand, runsRequired: p.runsRequired, overs: p.overs, phase: p.phase,
    requiredRate: p.requiredRate, striker: p.striker, bowler: p.bowler, recent: p.recent, leverage: m.leverage,
    observedCutoff: m.observedCutoff, question: m.decision.question, decisionType: m.decision.type,
    options: m.decision.options.map((o) => ({ option: o.option, label: o.label })),
  };
}

/** Moments in a stable order (highest leverage first). */
export function listMoments(): PrelockMoment[] {
  return [...moments()].sort((a, b) => b.leverage - a.leverage || a.id.localeCompare(b.id)).map(toPrelock);
}

export function getMoment(id: string): PrelockMoment | null {
  const m = moments().find((x) => x.id === id);
  return m ? toPrelock(m) : null;
}

/** Server-side only: the stored moment with its model estimates and reveal (for locking and grading). */
export function storedMoment(id: string): repo.StoredMoment | null {
  return moments().find((x) => x.id === id) ?? null;
}

/**
 * Lock a call (F-L-02): the moment must exist, the pick must be one of its options, confidence 0.50–0.99, and a
 * fan locks each moment once. The lock time is the server's. A historical moment's cutoff is in the past; what
 * keeps a call honest is that the reveal is only served for a locked call (F-L-03) and a lock is final (D-040).
 */
export async function lockCall(userId: string, input: LockInput): Promise<LockedCall> {
  const m = storedMoment(input.momentId);
  if (!m) throw new DomainError("NOT_FOUND", "No such moment.");
  if (!m.decision.options.some((o) => o.option === input.option)) throw new DomainError("INVALID", "Pick one of the moment's options.");
  if (!(input.confidence >= 0.5 && input.confidence <= 0.99)) throw new DomainError("INVALID", "Confidence is between 50% and 99%.");
  const row = await repo.insertCall(userId, { momentId: m.id, option: input.option, confidence: input.confidence });
  if (!row) throw new DomainError("CONFLICT", "You've already locked a call on this moment.");
  return { ...row, lockedAt: row.lockedAt.toISOString() };
}

/** A moment's leverage rank among the golden moments, in [0, 1] (for its difficulty). */
function leveragePercentile(m: repo.StoredMoment): number {
  const all = moments();
  return all.length < 2 ? 0.5 : all.filter((x) => x.leverage < m.leverage).length / (all.length - 1);
}

/**
 * Grade one call (pure): read points from the exact model's option WPs stored with the moment (D-034), "no grade" for
 * a coin flip, calibration hit = the pick was the best option (the decision, not the result: D-041), Read Rating from
 * the user's prior state.
 */
export function gradeCall(m: repo.StoredMoment, call: { option: string; confidence: number }, prior: { rating: number; graded: number }, levPct: number): Omit<repo.ReviewData, "momentId" | "momentsHash" | "outcomesHash" | "optionsHash"> {
  const g = grade(Object.fromEntries(m.decision.options.map((o) => [o.option, o.wp])), call.option);
  const sorted = m.decision.options.map((o) => o.wp).sort((a, b) => b - a);
  const difficulty = momentDifficulty((sorted[0] - sorted[1]) * 100, levPct);
  if (g.coinFlip) return { graded: false, coinFlip: true, best: g.best, readPoints: null, hit: null, brier: null, ratingBefore: prior.rating, ratingAfter: prior.rating, difficulty };
  const hit = call.option === g.best;
  const u = updateRating(prior.rating, prior.graded, difficulty, g.readPoints);
  return { graded: true, coinFlip: false, best: g.best, readPoints: g.readPoints, hit, brier: brier(call.confidence, hit ? 1 : 0), ratingBefore: prior.rating, ratingAfter: u.rating, difficulty };
}

/** Grade every locked, ungraded call of the user, in lock order, so each rating builds on the calls before it. */
async function gradePending(userId: string): Promise<void> {
  const f = file();
  let prior = { rating: START, graded: 0 };
  for (const c of await repo.callsInLockOrder(userId)) {
    if (c.review) {
      prior = { rating: c.review.ratingAfter, graded: prior.graded + (c.review.graded ? 1 : 0) };
      continue;
    }
    const m = storedMoment(c.momentId);
    if (!m) continue;
    const g = gradeCall(m, c, prior, leveragePercentile(m));
    await repo.insertReview(userId, c.id, { momentId: m.id, ...g, momentsHash: f.hash, outcomesHash: f.outcomesHash, optionsHash: f.optionsHash });
    prior = { rating: g.ratingAfter, graded: prior.graded + (g.graded ? 1 : 0) };
  }
}

/** The Review of the user's own locked call: grades pending calls first; no locked call, no reveal. */
export async function reviewCall(userId: string, momentId: string): Promise<CallReview> {
  const m = storedMoment(momentId);
  if (!m || !(await repo.findCall(userId, momentId))) throw new DomainError("NOT_FOUND", "Lock a call on this moment first.");
  await gradePending(userId);
  const c = await repo.findCall(userId, momentId);
  const r = c?.review;
  if (!c || !r) throw new DomainError("NOT_FOUND", "Lock a call on this moment first.");
  return {
    momentId, call: { option: c.option, confidence: c.confidence, lockedAt: c.lockedAt.toISOString() },
    grade: { graded: r.graded, coinFlip: r.coinFlip, best: r.best, readPoints: r.readPoints, hit: r.hit, brier: r.brier, calibration: "provisional" },
    rating: { before: r.ratingBefore, after: r.ratingAfter, difficulty: r.difficulty },
    options: m.decision.options.map((o) => ({ option: o.option, label: o.label, wp: o.wp })),
    reveal: m.reveal,
    receipts: { momentsHash: r.momentsHash, outcomesHash: r.outcomesHash, optionsHash: r.optionsHash },
    gradedAt: r.gradedAt.toISOString(),
  };
}

/** Rebuild every review of the user from the fixtures and their calls (reproducibility check and model upgrades). */
export async function regradeUser(userId: string): Promise<void> {
  await repo.deleteReviews(userId);
  await gradePending(userId);
}
