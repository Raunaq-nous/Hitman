// Source classes from docs/design-docs/data-and-rights.md.
export const SOURCE_CLASSES = ["OFFICIAL_LIVE", "LICENSED_LIVE", "VERIFIED_DELAYED", "EDITORIAL_PROJECTION", "SIMULATION"] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

/** Every displayed number carries this receipt. */
export interface Receipt {
  sourceId: string;
  sourceClass: SourceClass;
  observedAt: string;
  /** "replay": a historical replay, whose time of day is a deterministic replay clock, not a real observation time */
  clock?: "replay";
}

export interface Sourced<T> extends Receipt {
  value: T;
}

export type DataState = "live" | "delayed" | "historical-replay" | "projection" | "simulation" | "stale" | "source-pending";

export interface Presented<T> {
  value: T | null;
  receipt: Receipt | null;
  state: DataState;
  /** Human label for the data-state badge, e.g. "Live", "Stale · 3 min", "Historical replay". */
  label: string;
  ageMs: number | null;
}
