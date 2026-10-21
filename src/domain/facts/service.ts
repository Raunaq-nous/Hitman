// Bitemporal reads (docs/design-docs/bitemporal-store.md): nothing observed after the cutoff can influence a state.
import { canUse } from "@/providers/rights";
import * as repo from "./repo";

export type IncidentRow = Awaited<ReturnType<typeof repo.incidentsObservedBy>>[number];

/** The latest non-superseded version of each incident as known at the cutoff (later corrections are ignored). */
export function asOf(rows: IncidentRow[]): IncidentRow[] {
  const superseded = new Set(rows.map((r) => r.supersedesId).filter((id): id is string => id !== null));
  return rows.filter((r) => !superseded.has(r.id));
}

export interface CricketState { legalBalls: number; runs: number; wickets: number; incidents: number; lastObservedAt: string | null; sources: string[] }

/** Fold ball incidents: runs include extras; wides and no-balls are not legal balls; run-outs are wickets. */
export function foldCricket(rows: IncidentRow[]): CricketState {
  const s: CricketState = { legalBalls: 0, runs: 0, wickets: 0, incidents: rows.length, lastObservedAt: null, sources: [] };
  for (const r of rows) {
    if (r.type !== "ball") continue;
    const p = r.payload as { runs?: number; extras?: number; extraType?: string; wicket?: boolean };
    s.runs += (p.runs ?? 0) + (p.extras ?? 0);
    if (p.extraType !== "wides" && p.extraType !== "noballs") s.legalBalls += 1;
    if (p.wicket) s.wickets += 1;
  }
  const last = rows.reduce<Date | null>((m, r) => (m && m > r.observedAt ? m : r.observedAt), null);
  s.lastObservedAt = last?.toISOString() ?? null;
  s.sources = [...new Set(rows.map((r) => r.sourceId))];
  return s;
}

/** getStateAt(eventId, effectiveAt, observedCutoff): only what was known by the cutoff, from sources we may display. */
export async function getStateAt(eventId: string, effectiveAt: Date, observedCutoff: Date): Promise<CricketState> {
  const rows = (await repo.incidentsObservedBy(eventId, observedCutoff, effectiveAt)).filter((r) => canUse(r.sourceId, "display"));
  return foldCricket(asOf(rows));
}
