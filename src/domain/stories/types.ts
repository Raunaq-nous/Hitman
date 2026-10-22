import type { SportSlug } from "@/domain/facts/types";

export interface Story {
  sport: SportSlug;
  kind: string;
  /** template text built only from the incidents' own values */
  title: string;
  /** the size of the thing the threshold measures (ΔWP, wickets, runs, xG, seconds) */
  magnitude: number;
  priority: number;
  observedAt: string;
  sourceId: string;
  /** sourceRefs of the incidents the story rests on */
  receipts: string[];
}
