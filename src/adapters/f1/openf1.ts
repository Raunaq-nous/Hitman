// OpenF1 historical timing (https://openf1.org) → a race session with one incident per lap.
// Prototype-only source (unofficial; see src/rights/policies/openf1.json). Laps with no time stay null.
import { z } from "zod";
import type { IncidentInput } from "@/domain/facts/types";
import type { ParsedEvent } from "../types";

export const SOURCE_ID = "openf1";

const session = z.object({
  session_key: z.number(), session_name: z.string(), date_start: z.string(), year: z.number(),
  country_name: z.string(), location: z.string(), circuit_short_name: z.string().optional(),
}).passthrough();
const lap = z.object({
  session_key: z.number(), driver_number: z.number().int(), lap_number: z.number().int().positive(),
  date_start: z.string().nullable(), lap_duration: z.number().nullable(), is_pit_out_lap: z.boolean().nullable(),
}).passthrough();

export interface OpenF1Doc { sessions: unknown; laps: unknown; ref: string }

/** Parse one session (`ref` = session_key) from the recorded sessions list and its laps. */
export function parseOpenF1(doc: OpenF1Doc): ParsedEvent {
  const s = z.array(session).parse(doc.sessions).find((x) => String(x.session_key) === doc.ref);
  if (!s) throw new RangeError(`session ${doc.ref} not in the sessions list`);
  const startsAt = new Date(s.date_start);
  const ls = z.array(lap).parse(doc.laps).filter((l) => l.session_key === s.session_key);
  // a lap happens when it ends; a lap without a recorded start or time is placed at the session start
  const endOf = (l: z.infer<typeof lap>): Date =>
    l.date_start ? new Date(new Date(l.date_start).getTime() + Math.round((l.lap_duration ?? 0) * 1000)) : startsAt;
  const ordered = [...ls].sort((a, b) => endOf(a).getTime() - endOf(b).getTime() || a.lap_number - b.lap_number || a.driver_number - b.driver_number);
  const incidents: IncidentInput[] = ordered.map((l) => {
    const at = endOf(l);
    return {
      t: Math.max(0, Math.round((at.getTime() - startsAt.getTime()) / 1000)),
      seq: l.driver_number,
      actor: `Car ${l.driver_number}`,
      type: "lap",
      payload: { driverNumber: l.driver_number, lap: l.lap_number, lapSeconds: l.lap_duration, pitOutLap: l.is_pit_out_lap },
      sourceId: SOURCE_ID,
      sourceRef: `${s.session_key}:${l.driver_number}:${l.lap_number}`,
      sourceClass: "VERIFIED_DELAYED",
      rightsPolicyId: SOURCE_ID,
      effectiveAt: at,
      observedAt: at,
      supersedesId: null,
    };
  });
  const cars = [...new Set(ls.map((l) => l.driver_number))].sort((a, b) => a - b);
  return {
    sourceId: SOURCE_ID,
    sourceRef: String(s.session_key),
    sport: "f1",
    competition: { slug: "formula-1", name: "Formula 1" },
    season: String(s.year),
    name: `${s.country_name} ${s.year} ${s.session_name}`,
    startsAt,
    venue: s.location,
    participants: cars.map((n) => ({ name: `Car ${n}`, role: "car" })),
    // the lap feed carries no classification; the result is not inferred from it
    outcome: {},
    incidents,
  };
}
