// The Desk brief: recorded replays from every sport we hold data for, ranked by swing, every number with a receipt.
import { ADAPTERS, cricketAdapter, f1Adapter, footballAdapter } from "@/adapters";
import type { ParsedEvent } from "@/adapters/types";
import type { OutcomeArtifact } from "@/engine/outcomeModel";
import { namedCache } from "@/providers/cache";
import { generateClaims, PRODUCTION_PROMPT, type Claims, type Fact } from "@/providers/llm";
import { getPolicy, rightsContext, RightsError } from "@/providers/rights";
import { chaseSeries, cricketWp, detectStories, maxSwing } from "@/domain/stories/service";
import type { SportSlug } from "@/domain/facts/types";
import * as repo from "./repo";
import { DEPTHS, type DeskBrief, type DeskItem, type DeskPending, type Depth } from "./types";

export { DEPTHS };

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

/** When the brief item was known: the latest observation it rests on. */
export function snapshotOf(it: DeskItem): string {
  return [it.swing?.receipt.observedAt, ...it.stories.map((s) => s.observedAt)].filter((x): x is string => !!x).sort().at(-1) as string;
}

/** The typed facts a brief item may say, each with its receipt. */
export function itemFacts(it: DeskItem): Fact[] {
  const at = snapshotOf(it);
  const facts: Fact[] = [{ id: "event", value: it.name, sourceId: it.stories[0]?.sourceId ?? it.id.split(":")[0], observedAt: at, kind: "OBSERVED" }];
  if (it.swing) {
    const r = it.swing.receipt;
    facts.push(
      { id: "team", value: it.swing.team, sourceId: r.sourceId, observedAt: r.observedAt, kind: "OBSERVED" },
      { id: "swing_pts", value: Math.round(it.swing.value * 100), sourceId: r.sourceId, observedAt: r.observedAt, kind: "MODEL_ESTIMATE" },
      { id: "from_pct", value: Math.round(it.swing.from * 100), sourceId: r.sourceId, observedAt: r.observedAt, kind: "MODEL_ESTIMATE" },
      { id: "to_pct", value: Math.round(it.swing.to * 100), sourceId: r.sourceId, observedAt: r.observedAt, kind: "MODEL_ESTIMATE" },
      { id: "model", value: it.swing.model, sourceId: r.sourceId, observedAt: r.observedAt, kind: "DERIVED" },
    );
  }
  it.stories.forEach((s, k) => facts.push({ id: `story_${k}`, value: s.title, sourceId: s.sourceId, observedAt: s.observedAt, kind: "OBSERVED" }));
  return facts;
}

/** Deterministic claims for each depth: Quick is one line, Tactical adds the swing and stories, Analyst adds the method. */
export function depthTemplate(depth: Depth, it: DeskItem): (facts: Fact[]) => Claims {
  return (facts) => {
    const v = (id: string): Fact["value"] => facts.find((f) => f.id === id)?.value ?? "";
    const stories = facts.filter((f) => f.id.startsWith("story_"));
    const swing = it.swing
      ? { text: `${v("team")} went from ${v("from_pct")}% to ${v("to_pct")}% to win in six balls: a ${v("swing_pts")}-point swing.`, kind: "MODEL_ESTIMATE" as const, source_ids: ["team", "from_pct", "to_pct", "swing_pts"] }
      : { text: `Swing isn’t modelled for this sport yet, so the stories lead.`, kind: "EDITORIAL" as const, source_ids: [] };
    const story = (f: Fact) => ({ text: `${f.value}.`, kind: "OBSERVED" as const, source_ids: [f.id] });
    if (depth === "quick") {
      const lead = it.swing ? `${v("event")}: a ${v("swing_pts")}-point swing.` : `${v("event")}: ${stories[0]?.value ?? "no stories"}.`;
      return { claims: [{ text: lead, kind: it.swing ? "MODEL_ESTIMATE" : "OBSERVED", source_ids: it.swing ? ["event", "swing_pts"] : ["event", ...(stories[0] ? [stories[0].id] : [])] }] };
    }
    if (depth === "tactical") return { claims: [swing, ...stories.slice(0, 2).map(story)] };
    const method = it.swing
      ? { text: `Method: ${v("model")}, from ball-by-ball data.`, kind: "DERIVED" as const, source_ids: ["model"] }
      : { text: "Method: rules-first story thresholds over the recorded incidents.", kind: "EDITORIAL" as const, source_ids: [] };
    return { claims: [swing, ...stories.map(story), method] };
  };
}

/** Verified phrasing for a depth: model phrasing when enabled and it passes the verifier, the template otherwise. */
export async function phraseItem(it: DeskItem, depth: Depth): Promise<{ claims: Claims; source: "model" | "template" }> {
  const facts = itemFacts(it);
  const r = await generateClaims({ task: `desk.${depth}`, system: PRODUCTION_PROMPT, facts, snapshotCutoff: snapshotOf(it), model: "fast", template: depthTemplate(depth, it) });
  return { claims: r.claims, source: r.source };
}
