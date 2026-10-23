import type { SportSlug } from "@/domain/facts/types";

export interface Story {
  sport: SportSlug;
  kind: string;
  /** English title, built only from `params` (TITLES in config.ts has every language) */
  title: string;
  /** the values the title is built from */
  params: Record<string, string | number>;
  /** the size of the thing the threshold measures (ΔWP, wickets, runs, xG, seconds) */
  magnitude: number;
  priority: number;
  observedAt: string;
  sourceId: string;
  /** sourceRefs of the incidents the story rests on */
  receipts: string[];
}
