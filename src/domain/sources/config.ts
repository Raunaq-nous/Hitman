import type { SourceClass } from "./types";

/** Priority: the highest-priority fresh source wins. */
export const SOURCE_PRIORITY: Record<SourceClass, number> = {
  OFFICIAL_LIVE: 100,
  LICENSED_LIVE: 90,
  VERIFIED_DELAYED: 70,
  EDITORIAL_PROJECTION: 30,
  SIMULATION: 0,
};

/** Only these classes may ever be labelled live, and only while fresh and while live calls are enabled. */
export const LIVE_CAPABLE: ReadonlySet<SourceClass> = new Set(["OFFICIAL_LIVE", "LICENSED_LIVE"]);

/** How old a value may be before it is stale, by context. */
export const FRESHNESS_MS = { live: 30_000, delayed: 15 * 60_000, historical: Number.POSITIVE_INFINITY } as const;
export type FreshnessContext = keyof typeof FRESHNESS_MS;
