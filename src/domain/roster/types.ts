import type { Receipt } from "@/domain/sources/types";

/** A persona's signature tool, shown on the Roster: live (Lab), on open data, or on labelled illustrative data. */
export type PersonaTool =
  | { kind: "live"; title: string; note: string; links: { href: string; label: string }[] }
  | { kind: "open-data"; title: string; note: string; rows: { label: string; value: string }[]; receipt: Receipt; attribution: string }
  | { kind: "illustrative"; title: string; note: string; rows: { label: string; value: string }[] }
  | { kind: "pending"; title: string; note: string };
