// StatsBomb open data (https://github.com/statsbomb/open-data) → a match with shot and period incidents.
import { z } from "zod";
import type { IncidentInput } from "@/domain/facts/types";
import type { ParsedEvent } from "../types";

export const SOURCE_ID = "statsbomb";

const match = z.object({
  match_id: z.number(), match_date: z.string(), kick_off: z.string().nullable(),
  competition: z.object({ competition_name: z.string() }).passthrough(),
  season: z.object({ season_name: z.string() }).passthrough(),
  home_team: z.object({ home_team_name: z.string() }).passthrough(),
  away_team: z.object({ away_team_name: z.string() }).passthrough(),
  home_score: z.number().int(), away_score: z.number().int(),
  stadium: z.object({ name: z.string() }).passthrough().optional(),
}).passthrough();
const event = z.object({
  index: z.number().int(), period: z.number().int(), minute: z.number().int(), second: z.number().int(),
  type: z.object({ name: z.string() }), team: z.object({ name: z.string() }),
  player: z.object({ name: z.string() }).optional(),
  shot: z.object({ statsbomb_xg: z.number().optional(), outcome: z.object({ name: z.string() }) }).passthrough().optional(),
}).passthrough();

export interface StatsBombDoc { matches: unknown; events: unknown; ref: string }

/** Parse one match (`ref` = match_id) from a recorded matches list and its event file. */
export function parseStatsBomb(doc: StatsBombDoc): ParsedEvent {
  const m = z.array(match).parse(doc.matches).find((x) => String(x.match_id) === doc.ref);
  if (!m) throw new RangeError(`match ${doc.ref} not in the matches list`);
  // the source gives a local kick-off time without a zone; it is stored as given (UTC) and only used for ordering
  const startsAt = new Date(`${m.match_date}T${m.kick_off ?? "00:00:00.000"}Z`);
  const home = m.home_team.home_team_name, away = m.away_team.away_team_name;
  const incidents: IncidentInput[] = [];
  const periods = new Set<string>();
  for (const e of z.array(event).parse(doc.events)) {
    const kind = e.type.name === "Shot" ? "shot" : e.type.name === "Half Start" || e.type.name === "Half End" ? "period" : null;
    if (!kind) continue;
    // both teams log each half start and end; keep one
    const periodKey = `${e.period}:${e.type.name}`;
    if (kind === "period") { if (periods.has(periodKey)) continue; periods.add(periodKey); }
    const at = new Date(startsAt.getTime() + (e.minute * 60 + e.second) * 1000);
    incidents.push({
      t: e.minute * 60 + e.second,
      seq: e.index,
      actor: e.player?.name ?? null,
      type: kind,
      payload: kind === "shot"
        ? { period: e.period, minute: e.minute, second: e.second, team: e.team.name, player: e.player?.name ?? null, outcome: e.shot?.outcome.name ?? null, goal: e.shot?.outcome.name === "Goal", xg: e.shot?.statsbomb_xg ?? null }
        : { period: e.period, minute: e.minute, second: e.second, mark: e.type.name === "Half Start" ? "start" : "end" },
      sourceId: SOURCE_ID,
      sourceRef: `${m.match_id}:${e.index}`,
      sourceClass: "VERIFIED_DELAYED",
      rightsPolicyId: SOURCE_ID,
      effectiveAt: at,
      observedAt: at,
      supersedesId: null,
    });
  }
  return {
    sourceId: SOURCE_ID,
    sourceRef: String(m.match_id),
    sport: "football",
    competition: { slug: m.competition.competition_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: m.competition.competition_name },
    season: m.season.season_name,
    name: `${home} v ${away}`,
    startsAt,
    venue: m.stadium?.name ?? null,
    participants: [{ name: home, role: "home" }, { name: away, role: "away" }],
    outcome: { home: m.home_score, away: m.away_score, winner: m.home_score > m.away_score ? home : m.away_score > m.home_score ? away : null },
    incidents,
  };
}
