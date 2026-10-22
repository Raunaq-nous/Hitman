// The Desk brief: recorded replays from every sport we hold data for, ranked by swing, every number with a receipt.
import { ADAPTERS, cricketAdapter, f1Adapter, footballAdapter } from "@/adapters";
import type { ParsedEvent } from "@/adapters/types";
import type { OutcomeArtifact } from "@/engine/outcomeModel";
import { namedCache } from "@/providers/cache";
import { getPolicy, rightsContext, RightsError } from "@/providers/rights";
import { chaseSeries, cricketWp, detectStories, maxSwing } from "@/domain/stories/service";
import type { SportSlug } from "@/domain/facts/types";
import * as repo from "./repo";
import type { DeskBrief, DeskItem, DeskPending } from "./types";

const receiptOf = (e: ParsedEvent, observedAt: string) => ({ sourceId: e.sourceId, sourceClass: "VERIFIED_DELAYED" as const, observedAt });

function item(e: ParsedEvent, wp: ReturnType<typeof cricketWp>, model: string): DeskItem {
  const stories = detectStories(e, { wp }).slice(0, 3).map((s) => ({ ...s, receipt: receiptOf(e, s.observedAt) }));
  const chase = chaseSeries(e, wp);
  const best = chase ? maxSwing(chase) : null;
  const last = best?.incidents.at(-1);
  return {
    id: `${e.sourceId}:${e.sourceRef}`,
    sport: e.sport,
    name: e.name,
    competition: e.competition.name,
    season: e.season,
    swing: best && last && chase ? { value: best.swing, from: best.from, to: best.to, team: chase.team, receipt: receiptOf(e, last.observedAt.toISOString()), model } : null,
    swingReason: best ? null : e.sport === "cricket" ? "Rain-affected or no chase: no exact win probability." : "No win-probability model for this sport yet.",
    stories,
    attribution: getPolicy(e.sourceId)?.attribution_text ?? e.sourceId,
  };
}

// recorded replays don't change while the server runs; recompute daily at most
const briefs = namedCache<DeskBrief>("desk-brief", { ttlMs: 24 * 60 * 60 * 1000, maxEntries: 2 });

/** Ranked by swing (modelled swings first, biggest first), then by the top story's priority. */
export function deskBrief(): DeskBrief {
  const key = `prototype=${rightsContext().prototypeData}`;
  const hit = briefs.get(key);
  if (hit) return hit;
  const artifact = repo.outcomeModel();
  const wp = cricketWp(artifact as unknown as OutcomeArtifact);
  const model = `Exact chase WP on outcome model ${artifact.version} (sha256 ${artifact.hash.slice(0, 12)})`;
  const ctx = rightsContext();
  const pending: DeskPending[] = [];
  const events: ParsedEvent[] = [];
  const load = (sport: SportSlug, parse: () => ParsedEvent[]): void => {
    try { events.push(...parse()); } catch (err) {
      if (!(err instanceof RightsError)) throw err;
      pending.push({ sport, reason: `Source not usable here: ${err.message.replace(/^Rights check failed: /, "")}` });
    }
  };
  load("cricket", () => repo.cricketReplays().map((d) => cricketAdapter.parse(d, ctx)));
  load("football", () => repo.footballReplays().map((d) => footballAdapter.parse(d, ctx)));
  load("f1", () => repo.f1Replays().map((d) => f1Adapter.parse(d, ctx)));
  for (const a of Object.values(ADAPTERS)) if (a.status === "source-pending") pending.push({ sport: a.sport, reason: a.reason });
  const items = events.map((e) => item(e, wp, model)).sort((a, b) =>
    (b.swing?.value ?? -1) - (a.swing?.value ?? -1) || (b.stories[0]?.priority ?? 0) - (a.stories[0]?.priority ?? 0) || a.id.localeCompare(b.id));
  const brief = { items, pending };
  briefs.set(key, brief);
  return brief;
}
