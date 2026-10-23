// The Desk brief: recorded replays from every sport we hold data for, ranked by swing, every number with a receipt.
import { ADAPTERS, cricketAdapter, f1Adapter, footballAdapter } from "@/adapters";
import type { ParsedEvent } from "@/adapters/types";
import type { OutcomeArtifact } from "@/engine/outcomeModel";
import { namedCache } from "@/providers/cache";
import { generateClaims, PRODUCTION_PROMPT, type Claims, type Fact } from "@/providers/llm";
import { assertRight, getPolicy, rightsContext, RightsError } from "@/providers/rights";
import { chaseSeries, cricketWp, detectStories, maxSwing, storyTitle } from "@/domain/stories/service";
import type { Lang } from "@/i18n";
import type { SportSlug } from "@/domain/facts/types";
import * as repo from "./repo";
import { DEPTHS, type DeskBrief, type DeskItem, type DeskPending, type Depth } from "./types";

export { DEPTHS };

const receiptOf = (e: ParsedEvent, observedAt: string) => ({ sourceId: e.sourceId, sourceClass: "VERIFIED_DELAYED" as const, observedAt, clock: "replay" as const });

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
    swing: best && last && chase ? { value: Math.abs(Math.round(best.to * 100) - Math.round(best.from * 100)) / 100, from: best.from, to: best.to, team: chase.team, receipt: receiptOf(e, last.observedAt.toISOString()), model } : null,
    swingReason: best ? null : e.sport === "cricket" ? "rain" : "no-model",
    stories,
    attribution: getPolicy(e.sourceId)?.attribution_text ?? e.sourceId,
  };
}

// recorded replays don't change while the server runs; recompute daily at most
const DAY = 24 * 60 * 60 * 1000;
const loaded = namedCache<Replays>("desk-replays", { ttlMs: DAY, maxEntries: 2 });
const briefs = namedCache<DeskBrief>("desk-brief", { ttlMs: DAY, maxEntries: 2 });

export interface Replays { events: ParsedEvent[]; pending: DeskPending[]; artifact: OutcomeArtifact & { hash: string; version: string }; model: string }

/** Every recorded replay we may use here (rights checked), plus honest pending entries. */
export function replays(): Replays {
  const ctx = rightsContext();
  const key = `prototype=${ctx.prototypeData}`;
  const hit = loaded.get(key);
  if (hit) return hit;
  const artifact = repo.outcomeModel() as unknown as Replays["artifact"];
  const model = `Exact chase WP on outcome model ${artifact.version} (sha256 ${artifact.hash.slice(0, 12)})`;
  const pending: DeskPending[] = [];
  const events: ParsedEvent[] = [];
  const load = (sport: SportSlug, parse: () => ParsedEvent[]): void => {
    // stored by the adapter's store check; shown here, so the source must also allow display
    try { events.push(...parse().map((e) => { assertRight(e.sourceId, "display"); return e; })); } catch (err) {
      if (!(err instanceof RightsError)) throw err;
      pending.push({ sport, reason: err.message.replace(/^Rights check failed: /, ""), refused: true });
    }
  };
  load("cricket", () => repo.cricketReplays().map((d) => cricketAdapter.parse(d, ctx)));
  load("football", () => repo.footballReplays().map((d) => footballAdapter.parse(d, ctx)));
  load("f1", () => repo.f1Replays().map((d) => f1Adapter.parse(d, ctx)));
  for (const a of Object.values(ADAPTERS)) if (a.status === "source-pending") pending.push({ sport: a.sport, reason: a.reason });
  const r = { events, pending, artifact, model };
  loaded.set(key, r);
  return r;
}

/** Ranked by swing (modelled swings first, biggest first), then by the top story's priority. */
export function deskBrief(): DeskBrief {
  const key = `prototype=${rightsContext().prototypeData}`;
  const hit = briefs.get(key);
  if (hit) return hit;
  const { events, pending, artifact, model } = replays();
  const wp = cricketWp(artifact);
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
export function itemFacts(it: DeskItem, lang: Lang = "en"): Fact[] {
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
  it.stories.forEach((s, k) => facts.push({ id: `story_${k}`, value: storyTitle(s, lang), sourceId: s.sourceId, observedAt: s.observedAt, kind: "OBSERVED" }));
  return facts;
}

const DEPTH_TEXT = {
  en: {
    swing: (v: (id: string) => Fact["value"]) => `${v("team")} went from ${v("from_pct")}% to ${v("to_pct")}% to win in six balls: a ${v("swing_pts")}-point swing.`,
    noSwing: "Swing isn’t modelled for this sport yet, so the stories lead.",
    quickSwing: (v: (id: string) => Fact["value"]) => `${v("event")}: a ${v("swing_pts")}-point swing.`,
    method: (v: (id: string) => Fact["value"]) => `Method: ${v("model")}, from ball-by-ball data.`,
    noMethod: "Method: rules-first story thresholds over the recorded incidents.",
    noStories: "no stories",
    stop: ".",
  },
  hi: {
    swing: (v: (id: string) => Fact["value"]) => `${v("team")} की जीत की संभावना छह गेंदों में ${v("from_pct")}% से ${v("to_pct")}% हुई: ${v("swing_pts")} अंकों का स्विंग।`,
    noSwing: "इस खेल के लिए स्विंग का मॉडल अभी नहीं है, इसलिए कहानियाँ आगे हैं।",
    quickSwing: (v: (id: string) => Fact["value"]) => `${v("event")}: ${v("swing_pts")} अंकों का स्विंग।`,
    method: (v: (id: string) => Fact["value"]) => `तरीका: ${v("model")}, गेंद-दर-गेंद डेटा से।`,
    noMethod: "तरीका: दर्ज घटनाओं पर नियम-आधारित कहानी सीमाएँ।",
    noStories: "कोई कहानी नहीं",
    stop: "।",
  },
} as const;

/** Deterministic claims for each depth: Quick is one line, Tactical adds the swing and stories, Analyst adds the method. */
export function depthTemplate(depth: Depth, it: DeskItem, lang: Lang = "en"): (facts: Fact[]) => Claims {
  const L = DEPTH_TEXT[lang];
  return (facts) => {
    const v = (id: string): Fact["value"] => facts.find((f) => f.id === id)?.value ?? "";
    const stories = facts.filter((f) => f.id.startsWith("story_"));
    const swing = it.swing
      ? { text: L.swing(v), kind: "MODEL_ESTIMATE" as const, source_ids: ["team", "from_pct", "to_pct", "swing_pts"] }
      : { text: L.noSwing, kind: "EDITORIAL" as const, source_ids: [] };
    const story = (f: Fact) => ({ text: `${f.value}${L.stop}`, kind: "OBSERVED" as const, source_ids: [f.id] });
    if (depth === "quick") {
      const lead = it.swing ? L.quickSwing(v) : `${v("event")}: ${stories[0]?.value ?? L.noStories}${L.stop}`;
      return { claims: [{ text: lead, kind: it.swing ? "MODEL_ESTIMATE" : "OBSERVED", source_ids: it.swing ? ["event", "swing_pts"] : ["event", ...(stories[0] ? [stories[0].id] : [])] }] };
    }
    if (depth === "tactical") return { claims: [swing, ...stories.slice(0, 2).map(story)] };
    const method = it.swing
      ? { text: L.method(v), kind: "DERIVED" as const, source_ids: ["model"] }
      : { text: L.noMethod, kind: "EDITORIAL" as const, source_ids: [] };
    return { claims: [swing, ...stories.map(story), method] };
  };
}

/** Verified phrasing for a depth: model phrasing when enabled and it passes the verifier, the template otherwise. */
export async function phraseItem(it: DeskItem, depth: Depth, lang: Lang = "en"): Promise<{ claims: Claims; source: "model" | "template" }> {
  const facts = itemFacts(it, lang);
  const r = await generateClaims({ task: `desk.${depth}`, system: PRODUCTION_PROMPT, facts, snapshotCutoff: snapshotOf(it), model: "fast", template: depthTemplate(depth, it, lang), extraInput: { language: lang } });
  return { claims: r.claims, source: r.source };
}
