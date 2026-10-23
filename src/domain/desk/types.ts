import type { SportSlug } from "@/domain/facts/types";
import type { Receipt } from "@/domain/sources/types";
import type { Story } from "@/domain/stories/types";

export interface DeskItem {
  id: string;
  sport: SportSlug;
  name: string;
  competition: string;
  season: string;
  /** the biggest |ΔWP| over six legal balls; null when the sport has no WP model (reason says why) */
  swing: { value: number; from: number; to: number; team: string; receipt: Receipt; model: string } | null;
  /** why there is no swing: "rain" (revised target or no chase) or "no-model" (no WP model for the sport) */
  swingReason: "rain" | "no-model" | null;
  stories: (Story & { receipt: Receipt })[];
  attribution: string;
}

export interface DeskPending { sport: SportSlug; reason: string; /** set when a rights check refused the source */ refused?: boolean }

export interface DeskBrief { items: DeskItem[]; pending: DeskPending[] }

export const DEPTHS = ["quick", "tactical", "analyst"] as const;
export type Depth = (typeof DEPTHS)[number];
