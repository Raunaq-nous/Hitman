// The Decision Lab's moments. Before lock a fan sees only the pre-lock state: the reveal and the model's option
// estimates stay on the server until the call is locked (F-L-02/F-L-03).
import { namedCache } from "@/providers/cache";
import { DomainError } from "@/domain/shared/types";
import { track } from "@/domain/analytics/service";
import * as repo from "./repo";
import { brier, grade } from "@/engine/grader";
import { momentDifficulty, START, updateRating } from "@/engine/readRating";
import { brierSeries, domainScores, MIN_SAMPLE, reliabilityBuckets } from "@/engine/reliability";
import { alterEgo as identityOf, MIN_CROWD, type Identity, type IdentityCall } from "@/engine/alterEgo";
import { rateBand } from "@/engine/options";
import { DECISION_TYPE_LABEL, type CallReview, type LockedCall, type LockInput, type Notebook, type NotebookCall, type PrelockMoment, type SeasonFile, type ShareCardData } from "./types";

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
  await track("call_locked", { momentId: m.id, callId: row.id, confidence: Math.round(row.confidence * 100) }, userId);
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

/**
 * Grade every locked, ungraded call of the user, in lock order, so each rating builds on the calls before it. If an
 * ungraded call sits before an already graded one (a lock that committed late), the later reviews are rebuilt so the
 * ratings stay a pure function of the calls (D-041). `call_graded` fires once per call, never on a rebuild.
 */
async function gradePending(userId: string): Promise<void> {
  const f = file();
  let calls = await repo.callsInLockOrder(userId);
  const firstPending = calls.findIndex((c) => !c.review);
  if (firstPending < 0) return;
  const seen = new Set(calls.filter((c) => c.review).map((c) => c.id));
  const later = calls.slice(firstPending).filter((c) => c.review).map((c) => c.id);
  if (later.length) {
    await repo.deleteReviewsFor(later);
    calls = await repo.callsInLockOrder(userId);
  }
  let prior = { rating: START, graded: 0 };
  for (const c of calls) {
    if (c.review) {
      prior = { rating: c.review.ratingAfter, graded: prior.graded + (c.review.graded ? 1 : 0) };
      continue;
    }
    const m = storedMoment(c.momentId);
    if (!m) continue;
    const g = gradeCall(m, c, prior, leveragePercentile(m));
    const inserted = await repo.insertReview(userId, c.id, { momentId: m.id, ...g, momentsHash: f.hash, outcomesHash: f.outcomesHash, optionsHash: f.optionsHash });
    if (inserted && !seen.has(c.id)) await track("call_graded", { callId: c.id, coinFlip: g.coinFlip }, userId);
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
    momentId, callId: c.id, call: { option: c.option, confidence: c.confidence, lockedAt: c.lockedAt.toISOString() },
    grade: { graded: r.graded, coinFlip: r.coinFlip, best: r.best, readPoints: r.readPoints, hit: r.hit, brier: r.brier, calibration: "provisional" },
    rating: { before: r.ratingBefore, after: r.ratingAfter, difficulty: r.difficulty },
    options: m.decision.options.map((o) => ({ option: o.option, label: o.label, wp: o.wp })),
    reveal: m.reveal,
    receipts: { momentsHash: r.momentsHash, outcomesHash: r.outcomesHash, optionsHash: r.optionsHash },
    gradedAt: r.gradedAt.toISOString(),
    moment: toPrelock(m), matchDate: m.date, after: m.after,
    scenario: (({ option, label, wp }) => ({ option, label, wp }))([...m.decision.options].filter((o) => o.option !== c.option).sort((a, b) => b.wp - a.wp)[0]),
  };
}

/** The next moment the user hasn't called, after `afterId` in list order (wrapping); null when every moment is called. */
export async function nextMomentFor(userId: string, afterId: string): Promise<string | null> {
  const ids = listMoments().map((m) => m.id);
  const called = await repo.calledMomentIds(userId);
  const start = ids.indexOf(afterId) + 1;
  return [...ids.slice(start), ...ids.slice(0, start)].find((id) => !called.has(id)) ?? null;
}

/** Rebuild every review of the user from the fixtures and their calls (reproducibility check and model upgrades). */
export async function regradeUser(userId: string): Promise<void> {
  await repo.deleteReviews(userId);
  const f = file();
  let prior = { rating: START, graded: 0 };
  for (const c of await repo.callsInLockOrder(userId)) {
    const m = storedMoment(c.momentId);
    if (!m) continue;
    const g = gradeCall(m, c, prior, leveragePercentile(m));
    await repo.insertReview(userId, c.id, { momentId: m.id, ...g, momentsHash: f.hash, outcomesHash: f.outcomesHash, optionsHash: f.optionsHash });
    prior = { rating: g.ratingAfter, graded: prior.graded + (g.graded ? 1 : 0) };
  }
}

const PROVISIONAL_CALLS = 20;
// every decision type and phase is a domain, so no graded call falls off the radar
const PHASE_DOMAIN: Record<string, string> = { powerplay: "Powerplay", middle: "Middle overs", death: "Death overs" };
const DOMAINS = [...Object.values(DECISION_TYPE_LABEL), ...Object.values(PHASE_DOMAIN)];
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/**
 * The fan's Notebook (F-L-05): every call (filterable by decision type; cricket is the only sport so far), the
 * reliability diagram, Brier over time and skill domains from graded calls, the Read Rating history (F-L-06), and
 * small-sample warnings.
 */
export async function notebook(userId: string, filter: { type?: string | null } = {}): Promise<Notebook> {
  await gradePending(userId);
  const all: NotebookCall[] = [];
  for (const c of await repo.callsInLockOrder(userId)) {
    const m = storedMoment(c.momentId);
    if (!m || !c.review) continue;
    const label = (o: string) => cap(m.decision.options.find((x) => x.option === o)?.label ?? o);
    all.push({
      momentId: m.id, season: m.season, teams: `${m.prelock.battingTeam} v ${m.prelock.bowlingTeam}`, phase: m.prelock.phase, decisionType: m.decision.type, question: m.decision.question,
      pick: label(c.option), best: label(c.review.best), confidence: c.confidence, lockedAt: c.lockedAt.toISOString(),
      graded: c.review.graded, readPoints: c.review.readPoints, hit: c.review.hit, brier: c.review.brier,
    });
  }
  const type = filter.type && DECISION_TYPE_LABEL[filter.type] ? filter.type : null;
  const calls = type ? all.filter((c) => c.decisionType === type) : all;
  const graded = calls.filter((c) => c.graded);
  const scored = graded.map((c) => ({ confidence: c.confidence, hit: c.hit === true }));
  const domains = domainScores(graded.map((c) => ({ domains: [DECISION_TYPE_LABEL[c.decisionType], PHASE_DOMAIN[c.phase]], readPoints: c.readPoints ?? 0, hit: c.hit === true })), DOMAINS);
  // the rating is the user's, across every graded call (filters don't change it)
  const allGraded = all.filter((c) => c.graded).length;
  const reviews = (await repo.callsInLockOrder(userId)).flatMap((c) => (c.review?.graded ? [c.review.ratingAfter] : []));
  const warnings: string[] = [];
  if (graded.length < MIN_SAMPLE) warnings.push(`Small sample: ${graded.length} graded ${graded.length === 1 ? "call" : "calls"} here. Patterns need at least ${MIN_SAMPLE}.`);
  if (allGraded < PROVISIONAL_CALLS) warnings.push(`Your Read Rating is provisional until ${PROVISIONAL_CALLS} graded calls (${allGraded} so far).`);
  return {
    sport: "cricket", filter: { type }, decisionTypes: Object.keys(DECISION_TYPE_LABEL).filter((t) => all.some((c) => c.decisionType === t)),
    calls: [...calls].reverse(), reliability: reliabilityBuckets(scored), brier: brierSeries(scored), domains,
    rating: { current: reviews.at(-1) ?? START, graded: allGraded, provisional: allGraded < PROVISIONAL_CALLS, history: [{ i: 0, rating: START }, ...reviews.map((r, i) => ({ i: i + 1, rating: r }))] },
    warnings,
  };
}

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

type TowerCall = { lockedAt: Date; review: { graded: boolean; hit: boolean | null; brier: number | null; ratingAfter: number } | null };
export interface TowerRow { id: string; rank: number; name: string; readRating: number; brier: number | null; callsThisWeek: number; form: ("good" | "poor" | "none")[]; change: number }

const ratingOf = (calls: TowerCall[]): number => [...calls].reverse().find((c) => c.review)?.review?.ratingAfter ?? START;
const rankBy = (rows: { id: string; name: string; rating: number }[]): Map<string, number> =>
  new Map([...rows].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).map((r, i) => [r.id, i + 1]));

/**
 * The crew timing tower (F-C-02), pure: rank by Read Rating (ties by name), mean Brier over graded calls, calls
 * locked this ISO week, form over the last five calls (good = best pick, poor = not, none = coin flip), and the
 * change in rank since the week began. Calls are in lock order.
 */
export function towerEntries(members: { id: string; name: string; calls: TowerCall[] }[], now: Date): TowerRow[] {
  const start = weekStart(now);
  const nowRank = rankBy(members.map((m) => ({ id: m.id, name: m.name, rating: ratingOf(m.calls) })));
  const before = rankBy(members.map((m) => ({ id: m.id, name: m.name, rating: ratingOf(m.calls.filter((c) => c.lockedAt < start)) })));
  return members.map((m) => {
    const graded = m.calls.filter((c) => c.review?.graded);
    return {
      id: m.id, name: m.name, rank: nowRank.get(m.id) as number, readRating: Math.round(ratingOf(m.calls)),
      brier: graded.length ? graded.reduce((a, c) => a + (c.review?.brier ?? 0), 0) / graded.length : null,
      callsThisWeek: m.calls.filter((c) => c.lockedAt >= start && c.lockedAt <= now).length,
      form: m.calls.filter((c) => c.review).slice(-5).map((c) => (!c.review?.graded ? "none" : c.review.hit ? "good" : "poor")),
      change: (before.get(m.id) as number) - (nowRank.get(m.id) as number),
    };
  }).sort((a, b) => a.rank - b.rank);
}

/** The tower for a crew the viewer belongs to: grades members' pending calls first. */
export async function crewTower(members: { id: string; name: string }[], now = new Date()): Promise<TowerRow[]> {
  const withCalls = await Promise.all(members.map(async (m) => {
    await gradePending(m.id);
    return { ...m, calls: await repo.callsInLockOrder(m.id) };
  }));
  return towerEntries(withCalls, now);
}

/** The share card for a graded call (F-C-03); null when the call doesn't exist or isn't graded yet. */
export async function shareCard(callId: string): Promise<ShareCardData | null> {
  const c = await repo.findCallForShare(callId);
  const m = c ? storedMoment(c.momentId) : null;
  if (!c || !m || !c.review) return null;
  const p = c.review.readPoints ?? 0;
  return {
    displayName: c.user.name,
    heading: c.review.hit ? "CALLED IT" : "MY READ",
    title: m.decision.question,
    confidence: `${Math.round(c.confidence * 100)}% sure`,
    grade: c.review.graded ? `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)} pts` : "Coin flip — no grade",
    moment: `${m.prelock.battingTeam} v ${m.prelock.bowlingTeam}, IPL ${m.season} · needing ${m.prelock.runsRequired} off ${m.prelock.ballsLeft}`,
    calibration: "Provisional calibration",
  };
}

/** The fan's Alter Ego (F-R-03) from their graded calls; hidden until 10 graded calls. */
export async function alterEgoFor(userId: string): Promise<Identity> {
  await gradePending(userId);
  const calls = (await repo.callsInLockOrder(userId)).filter((c) => c.review?.graded);
  const crowd = await repo.crowdCounts(calls.map((c) => c.momentId), userId);
  const input: IdentityCall[] = [];
  for (const c of calls) {
    const m = storedMoment(c.momentId);
    if (!m) continue;
    const others = crowd.filter((x) => x.momentId === c.momentId);
    const total = others.reduce((a, x) => a + x._count._all, 0);
    const same = others.find((x) => x.option === c.option)?._count._all ?? 0;
    const band = c.option.startsWith("rate:") ? Number(c.option.slice(5)) - rateBand({ b: m.prelock.ballsLeft, w: m.prelock.wicketsInHand, r: m.prelock.runsRequired }) : 0;
    input.push({
      relation: band > 0 ? "higher" : band < 0 ? "lower" : "current", phase: m.prelock.phase, decisionType: m.decision.type, sport: "cricket",
      confidence: c.confidence, hit: c.review?.hit === true, leverage: m.leverage, crowdShare: total >= MIN_CROWD ? same / total : null,
    });
  }
  return identityOf(input);
}

/** The Alter Ego share card (F-R-04): display name, persona and the lead evidence; null until revealed. */
export async function alterEgoCard(userId: string): Promise<{ displayName: string; label: string; evidence: string; graded: number; calibration: "Provisional calibration" } | null> {
  const name = await repo.displayName(userId);
  if (!name) return null;
  const id = await alterEgoFor(userId);
  if (!id.revealed) return null;
  return { displayName: name, label: id.label, evidence: id.evidence[0], graded: id.graded, calibration: "Provisional calibration" };
}

/** The Season File (F-R-05): best and worst reads, calibration and rating history, from the fan's Notebook. */
export async function seasonFile(userId: string, now = new Date()): Promise<SeasonFile> {
  const nb = await notebook(userId);
  const graded = nb.calls.filter((c) => c.graded);
  const byRead = [...graded].sort((a, b) => (b.readPoints ?? 0) - (a.readPoints ?? 0) || a.momentId.localeCompare(b.momentId));
  const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null);
  const id = await alterEgoFor(userId);
  return {
    displayName: (await repo.displayName(userId)) ?? "", generatedAt: now.toISOString(),
    calls: nb.calls.length, graded: graded.length, coinFlips: nb.calls.length - graded.length,
    hitRate: mean(graded.map((c) => (c.hit ? 1 : 0))), meanBrier: mean(graded.map((c) => c.brier ?? 0)), meanRead: mean(graded.map((c) => c.readPoints ?? 0)),
    best: byRead.slice(0, 3).filter((c) => (c.readPoints ?? 0) > 0), worst: byRead.slice(-3).reverse().filter((c) => (c.readPoints ?? 0) < 0),
    reliability: nb.reliability, rating: nb.rating, alterEgo: id.revealed ? id.label : null, warnings: nb.warnings,
  };
}
