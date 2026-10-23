// The Decision Lab's moments. Before lock a fan sees only the pre-lock state: the reveal and the model's option
// estimates stay on the server until the call is locked (F-L-02/F-L-03).
import { namedCache } from "@/providers/cache";
import { DomainError } from "@/domain/shared/types";
import * as repo from "./repo";
import type { LockedCall, LockInput, PrelockMoment } from "./types";

const cache = namedCache<repo.StoredMoment[]>("lab-moments", { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1 });
const moments = (): repo.StoredMoment[] => {
  const hit = cache.get("all");
  if (hit) return hit;
  const all = repo.storedMoments();
  cache.set("all", all);
  return all;
};

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
