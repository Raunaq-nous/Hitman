// Source authority policy: pick between sources and label the result honestly.
import { FRESHNESS_MS, LIVE_CAPABLE, SOURCE_PRIORITY, type FreshnessContext } from "./config";
import type { DataState, Presented, Sourced } from "./types";

export interface AuthorityOptions {
  now: number;
  context: FreshnessContext;
  /** LIVE_CALLS flag: without it nothing is labelled live. */
  liveEnabled: boolean;
  /** Historical replays are labelled as such, never as live. */
  replay?: boolean;
}

const age = (s: Sourced<unknown>, now: number): number => Math.max(0, now - Date.parse(s.observedAt));

export function isFresh(s: Sourced<unknown>, opts: Pick<AuthorityOptions, "now" | "context">): boolean {
  return age(s, opts.now) <= FRESHNESS_MS[opts.context];
}

export function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} h`;
  return `${Math.round(ms / 86_400_000)} d`;
}

function stateFor<T>(s: Sourced<T>, opts: AuthorityOptions, fresh: boolean): DataState {
  if (s.sourceClass === "SIMULATION") return "simulation";
  if (s.sourceClass === "EDITORIAL_PROJECTION") return "projection";
  if (opts.replay) return "historical-replay";
  if (!fresh) return "stale";
  if (LIVE_CAPABLE.has(s.sourceClass) && opts.liveEnabled && opts.context === "live") return "live";
  return "delayed";
}

const LABELS: Record<DataState, string> = {
  live: "Live", delayed: "Delayed", "historical-replay": "Historical replay", projection: "Projection",
  simulation: "Simulation", stale: "Stale", "source-pending": "Source pending",
};

export function present<T>(s: Sourced<T> | null, opts: AuthorityOptions): Presented<T> {
  if (!s) return { value: null, receipt: null, state: "source-pending", label: LABELS["source-pending"], ageMs: null };
  const ageMs = age(s, opts.now);
  const state = stateFor(s, opts, isFresh(s, opts));
  const label = state === "stale" ? `Stale · ${formatAge(ageMs)}` : LABELS[state];
  return { value: s.value, receipt: { sourceId: s.sourceId, sourceClass: s.sourceClass, observedAt: s.observedAt }, state, label, ageMs };
}

/**
 * Choose between candidate sources: the highest-priority fresh source wins; if none is fresh, the most recent
 * stale value is shown as stale; simulations and projections are only used when nothing factual exists.
 */
export function choose<T>(candidates: Sourced<T>[], opts: AuthorityOptions): Presented<T> {
  const factual = candidates.filter((c) => c.sourceClass !== "SIMULATION" && c.sourceClass !== "EDITORIAL_PROJECTION");
  const byPriority = (a: Sourced<T>, b: Sourced<T>): number =>
    SOURCE_PRIORITY[b.sourceClass] - SOURCE_PRIORITY[a.sourceClass] || Date.parse(b.observedAt) - Date.parse(a.observedAt);
  const fresh = factual.filter((c) => isFresh(c, opts)).sort(byPriority);
  if (fresh.length) return present(fresh[0], opts);
  const newest = [...factual].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  if (newest.length) return present(newest[0], opts);
  const rest = [...candidates].sort(byPriority);
  return present(rest[0] ?? null, opts);
}
