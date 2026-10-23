// The adapter registry: one adapter per sport, or an honest source-pending entry. Every adapter checks the
// source's rights policy before it parses anything, so unlicensed data never reaches storage.
import type { SportSlug } from "@/domain/facts/types";
import { assertRight, type RightsContext } from "@/rights";
import { parseCricsheet, SOURCE_ID as CRICSHEET } from "./cricket/cricsheet";
import { parseOpenF1, SOURCE_ID as OPENF1, type OpenF1Doc } from "./f1/openf1";
import { parseStatsBomb, SOURCE_ID as STATSBOMB, type StatsBombDoc } from "./football/statsbomb";
import type { ParsedEvent, SourcePending } from "./types";

export interface SourceAdapter<Doc> {
  status: "available";
  sport: SportSlug;
  sourceId: string;
  parse(doc: Doc, ctx: RightsContext): ParsedEvent;
}

function adapter<Doc>(sport: SportSlug, sourceId: string, parse: (doc: Doc) => ParsedEvent): SourceAdapter<Doc> {
  return { status: "available", sport, sourceId, parse: (doc, ctx) => { assertRight(sourceId, "store", ctx); return parse(doc); } };
}

export const cricketAdapter = adapter<{ raw: unknown; ref: string }>("cricket", CRICSHEET, (d) => parseCricsheet(d.raw, d.ref));
export const f1Adapter = adapter<OpenF1Doc>("f1", OPENF1, parseOpenF1);
export const footballAdapter = adapter<StatsBombDoc>("football", STATSBOMB, parseStatsBomb);

const PENDING_REASON: Partial<Record<SportSlug, string>> = {
  basketball: "No source with display and storage rights yet; a licensed play-by-play feed is needed.",
  tennis: "No source with display and storage rights yet; a licensed point-by-point feed is needed.",
};

export function sourcePending(sport: SportSlug): SourcePending {
  return { status: "source-pending", sport, reason: PENDING_REASON[sport] ?? "No source with the rights we need yet." };
}

export const ADAPTERS: Record<SportSlug, SourceAdapter<never> | SourcePending> = {
  cricket: cricketAdapter as SourceAdapter<never>,
  f1: f1Adapter as SourceAdapter<never>,
  football: footballAdapter as SourceAdapter<never>,
  basketball: sourcePending("basketball"),
  tennis: sourcePending("tennis"),
};

export function liveAdapters(): SourceAdapter<never>[] {
  return Object.values(ADAPTERS).filter((a): a is SourceAdapter<never> => a.status === "available");
}
