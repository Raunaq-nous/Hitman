// One adapter per source. Adapters parse source documents into facts; they never invent values.
import type { IncidentInput, SportSlug } from "@/domain/facts/types";

export interface ParsedEvent {
  sourceId: string;
  sourceRef: string;
  sport: SportSlug;
  competition: { slug: string; name: string };
  season: string;
  name: string;
  startsAt: Date;
  venue: string | null;
  participants: { name: string; role: string }[];
  /** Outcome facts used by the data contract (winner agreement, rain rules). */
  outcome: Record<string, unknown>;
  incidents: IncidentInput[];
}

export interface SourcePending { status: "source-pending"; sport: SportSlug; reason: string }
