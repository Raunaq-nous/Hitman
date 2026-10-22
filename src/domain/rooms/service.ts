// Event Rooms: one room per recorded event, five sports. Every number comes from the recorded incidents or the
// exact chase model; sports without a model or a source say so.
import type { ParsedEvent } from "@/adapters/types";
import type { SportSlug } from "@/domain/facts/types";
import { replays } from "@/domain/desk/service";
import { chaseSeries, cricketWp, detectStories } from "@/domain/stories/service";
import { createChaseModel, type ChaseState } from "@/engine/chaseWp";
import { predictStyles } from "@/engine/outcomeModel";
import { getPolicy } from "@/providers/rights";
import type { EventRoom, RoomSummary, SportRooms } from "./types";

const slugOf = (e: ParsedEvent): string => `${e.sourceId}-${e.sourceRef}`;
const summary = (e: ParsedEvent): RoomSummary => ({ slug: slugOf(e), name: e.name, competition: e.competition.name, season: e.season });

export function sportRooms(sport: SportSlug): SportRooms {
  const { events, pending } = replays();
  const mine = events.filter((e) => e.sport === sport);
  return { sport, events: mine.map(summary), pending: mine.length ? null : pending.find((p) => p.sport === sport)?.reason ?? "No recorded events yet." };
}

/** "17.3": the ball about to be bowled after `bowled` legal balls. */
const ballLabel = (bowled: number): string => `${Math.floor(bowled / 6)}.${(bowled % 6) + 1}`;

export function eventRoom(sport: SportSlug, slug: string): EventRoom | null {
  const { events, artifact, model } = replays();
  const e = events.find((x) => x.sport === sport && slugOf(x) === slug);
  if (!e) return null;
  const at = e.incidents.map((i) => i.observedAt.toISOString()).sort();
  const receiptOf = (observedAt: string) => ({ sourceId: e.sourceId, sourceClass: "VERIFIED_DELAYED" as const, observedAt });
  const chase = chaseSeries(e, cricketWp(artifact));
  let wp: EventRoom["wp"] = null;
  let leverage: EventRoom["leverage"] = null;
  if (chase) {
    wp = { points: [{ t: 0, wp: chase.start }, ...chase.series.map((p) => ({ t: 120 - Math.max(0, p.s.b), wp: p.wp }))], model };
    const m = createChaseModel((st) => predictStyles(artifact, st, chase.target));
    // leverage before every legal ball still to be bowled (the start and each non-terminal state)
    const states: ChaseState[] = [{ b: 120, w: 10, r: chase.target }, ...chase.series.map((p) => p.s).filter((s) => s.b > 0 && s.w > 0 && s.r > 0)];
    for (const s of states) {
      const v = m.leverage(s);
      if (!leverage || v > leverage.value) leverage = { value: v, at: ballLabel(120 - s.b) };
    }
  }
  const noModel = chase ? null : sport === "cricket" ? "Rain-affected or no chase: no exact win probability." : "No win-probability model for this sport yet.";
  return {
    ...summary(e),
    sport,
    wp,
    leverage,
    noModel,
    stories: detectStories(e, { wp: cricketWp(artifact) }).map((s) => ({ ...s, receipt: receiptOf(s.observedAt) })),
    observedFrom: at[0],
    observedTo: at[at.length - 1],
    receipt: receiptOf(at[at.length - 1]),
    attribution: getPolicy(e.sourceId)?.attribution_text ?? e.sourceId,
  };
}

/** Every room, for static generation. */
export function allRooms(): { sport: SportSlug; slug: string }[] {
  return replays().events.map((e) => ({ sport: e.sport, slug: slugOf(e) }));
}
