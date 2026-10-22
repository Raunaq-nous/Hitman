// The Decision Lab's moments. Before lock a fan sees only the pre-lock state: the reveal and the model's option
// estimates stay on the server until the call is locked (F-L-02/F-L-03).
import { namedCache } from "@/providers/cache";
import * as repo from "./repo";
import type { PrelockMoment } from "./types";

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
