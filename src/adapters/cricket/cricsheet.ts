// Cricsheet ball-by-ball JSON (https://cricsheet.org/format/json/) → events and ball incidents.
// observedAt is deterministic for historical replays: match start + 30 s per delivery, so tests are reproducible.
import { z } from "zod";
import type { IncidentInput } from "@/domain/facts/types";
import type { ParsedEvent } from "../types";

const delivery = z.object({
  batter: z.string(),
  bowler: z.string(),
  non_striker: z.string().optional(),
  runs: z.object({ batter: z.number(), extras: z.number(), total: z.number() }),
  extras: z.record(z.string(), z.number()).optional(),
  wickets: z.array(z.object({ player_out: z.string(), kind: z.string() })).optional(),
});

export const cricsheetMatch = z.object({
  meta: z.object({ data_version: z.string() }).passthrough(),
  info: z.object({
    dates: z.array(z.string()).min(1),
    teams: z.array(z.string()).length(2),
    event: z.object({ name: z.string() }).passthrough().optional(),
    season: z.union([z.string(), z.number()]).transform(String),
    venue: z.string().optional(),
    match_type: z.string(),
    outcome: z.record(z.string(), z.unknown()),
  }).passthrough(),
  innings: z.array(z.object({
    team: z.string(),
    overs: z.array(z.object({ over: z.number().int().nonnegative(), deliveries: z.array(delivery) })).default([]),
    target: z.object({ runs: z.number(), overs: z.number() }).optional(),
  }).passthrough()),
});
export type CricsheetMatch = z.infer<typeof cricsheetMatch>;

export const SOURCE_ID = "cricsheet";
const SECONDS_PER_DELIVERY = 30;

/** Parse one match file. `matchId` is the Cricsheet file id (e.g. "1082591"). */
export function parseCricsheet(raw: unknown, matchId: string): ParsedEvent {
  const m = cricsheetMatch.parse(raw);
  const startsAt = new Date(`${m.info.dates[0]}T14:00:00Z`);
  const incidents: IncidentInput[] = [];
  let n = 0;
  m.innings.forEach((inn, i) => {
    for (const over of inn.overs) {
      over.deliveries.forEach((d, j) => {
        const extras = d.extras ?? {};
        const extraType = Object.keys(extras).find((k) => extras[k] > 0) ?? null;
        const at = new Date(startsAt.getTime() + n * SECONDS_PER_DELIVERY * 1000);
        incidents.push({
          t: i * 10_000 + over.over * 100 + j,
          seq: 0,
          actor: d.batter,
          type: "ball",
          payload: { innings: i + 1, team: inn.team, over: over.over, ball: j, batter: d.batter, bowler: d.bowler, runs: d.runs.batter, extras: d.runs.extras, extraType, wicket: (d.wickets?.length ?? 0) > 0, wicketKind: d.wickets?.[0]?.kind ?? null, ...(inn.target ? { target: inn.target.runs } : {}) },
          sourceId: SOURCE_ID,
          sourceRef: `${matchId}:${i + 1}:${over.over}:${j}`,
          sourceClass: "VERIFIED_DELAYED",
          rightsPolicyId: SOURCE_ID,
          effectiveAt: at,
          observedAt: at,
          supersedesId: null,
        });
        n++;
      });
    }
  });
  return {
    sourceId: SOURCE_ID,
    sourceRef: matchId,
    sport: "cricket",
    competition: { slug: (m.info.event?.name ?? m.info.match_type).toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: m.info.event?.name ?? m.info.match_type },
    season: m.info.season,
    name: `${m.info.teams[0]} v ${m.info.teams[1]}`,
    startsAt,
    venue: m.info.venue ?? null,
    participants: m.info.teams.map((name) => ({ name, role: "team" })),
    outcome: m.info.outcome,
    incidents,
  };
}

/** Rain-affected (target revised by a method such as D/L or DLS): excluded from chase win probability. */
export const isRainAffected = (e: ParsedEvent): boolean => typeof e.outcome.method === "string";
export const isTie = (e: ParsedEvent): boolean => e.outcome.result === "tie";
