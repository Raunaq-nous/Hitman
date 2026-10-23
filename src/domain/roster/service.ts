// Persona Switchboard: the same verified facts, re-voiced by each analyst with deterministic templates.
import { pointImportance, pressureIndex, type TennisModel, type TennisState } from "@/engine/tennis";
import { clutchLeverage } from "@/engine/basketball";
import { degradation, pitWindow } from "@/engine/f1";
import { listMoments } from "@/domain/lab/service";
import { replays } from "@/domain/desk/service";
import { getPolicy } from "@/providers/rights";
import type { PersonaTool } from "./types";
import { verifyClaims, type Claims, type Fact } from "@/providers/llm";
import { PERSONAS, PERSONA_SLUGS, type PersonaSlug } from "@/personas";

/** A labelled, hypothetical example state (not a real match): the facts are the engine's computations on it. */
export const EXAMPLE = {
  label: "Illustrative example, not a real match: two players who each win 64% of points on serve, deciding set at 5–5, the server down 30–40.",
  model: { pA: 0.64, pB: 0.64, bestOf: 3 } satisfies TennisModel,
  big: { setsA: 1, setsB: 1, gamesA: 5, gamesB: 5, pointsA: 2, pointsB: 3, serverA: true } satisfies TennisState,
  first: { setsA: 0, setsB: 0, gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, serverA: true } satisfies TennisState,
};

const OBSERVED_AT = "2026-01-01T00:00:00.000Z";

export function switchboardFacts(): Fact[] {
  const pct = (s: TennisState): number => Math.round(pointImportance(EXAMPLE.model, s) * 1000) / 10;
  return [
    { id: "big", value: pct(EXAMPLE.big), sourceId: "engine:tennis-iid", observedAt: OBSERVED_AT, kind: "MODEL_ESTIMATE" },
    { id: "first", value: pct(EXAMPLE.first), sourceId: "engine:tennis-iid", observedAt: OBSERVED_AT, kind: "MODEL_ESTIMATE" },
  ];
}

type Voice = (big: Fact["value"], first: Fact["value"]) => string[];

const VOICES: Record<PersonaSlug, Voice> = {
  opener: (b, f) => [`Timing is everything here: this point moves ${b} points of match-win chance.`, `The first point of the match moved ${f}. Same game, very different moment.`],
  closer: (b, f) => [`This is the last-shot moment: ${b} points of match-win chance on one rally.`, `Compare that with ${f} on the opening point. Prepare for the big one.`],
  architect: (b, f) => [`The shape of the match funnels into this point: ${b} points of match-win chance.`, `At the start the same rally was worth ${f}. Structure builds pressure.`],
  professor: (b, f) => [`Risk and reward: ${b} points of match-win chance ride on this point.`, `The opening point carried only ${f}. Spend your risk where it pays.`],
  iceman: (b, f) => [`Big point. ${b} points of match-win chance.`, `First point: ${f}. Same routine.`],
};

export interface Voicing { persona: PersonaSlug; name: string; sentences: string[] }

/** Every persona's voicing of the same facts, each checked by the claim verifier (a failing template is a bug). */
export function switchboard(): { label: string; facts: Fact[]; voicings: Voicing[] } {
  const facts = switchboardFacts();
  const [big, first] = facts;
  const voicings = PERSONA_SLUGS.map((slug) => {
    const sentences = VOICES[slug](big.value, first.value);
    const claims: Claims = { claims: sentences.map((text) => ({ text, kind: "MODEL_ESTIMATE", source_ids: ["big", "first"] })) };
    const verdict = verifyClaims(claims.claims, facts, OBSERVED_AT);
    if (!verdict.ok) throw new Error(`${slug} voicing fails verification: ${verdict.rejections.map((r) => r.reason).join("; ")}`);
    return { persona: slug, name: PERSONAS[slug].name, sentences };
  });
  return { label: EXAMPLE.label, facts, voicings };
}

const pp = (x: number): string => `${(x * 100).toFixed(1)} pts`;
/** Illustrative pit-lane loss (a typical figure, not measured for this race). */
const PIT_LOSS_SECONDS = 22;

/** Each persona's signature tool (F-R-02): the Opener's Over Call is live in the Lab; the others are demos. */
export function personaTool(slug: PersonaSlug): PersonaTool {
  if (slug === "opener") {
    const over = listMoments().filter((m) => m.decisionType === "next-over-intent").slice(0, 3);
    return {
      kind: "live", title: "Over Call", note: "Live in the Decision Lab: at a real IPL chase moment, call the next over — attack, hold or ease off — and get graded on the read.",
      links: over.map((m) => ({ href: `/lab/${m.id}`, label: `${m.battingTeam} need ${m.runsRequired} off ${m.ballsLeft} (IPL ${m.season})` })),
    };
  }
  if (slug === "iceman") {
    const model = EXAMPLE.model;
    const states: [string, TennisState][] = [
      ["First point of the match", EXAMPLE.first],
      ["Deciding set 5–5, server down 30–40", EXAMPLE.big],
      ["Deciding-set tiebreak at 5–5", { setsA: 1, setsB: 1, gamesA: 6, gamesB: 6, pointsA: 5, pointsB: 5, serverA: true }],
    ];
    return { kind: "illustrative", title: "Pressure Index", note: "Illustrative example, not a real match: two players who each win 64% of points on serve, best of three sets. Pressure Index = how much one point moves the match-win probability (0–100).", rows: states.map(([label, st]) => ({ label, value: String(pressureIndex(model, st)) })) };
  }
  if (slug === "closer") {
    const at: [string, number, number][] = [["Up 1, 30 seconds left", 1, 30], ["Up 1, 5 minutes left", 1, 300], ["Up 10, 30 seconds left", 10, 30], ["Level, first quarter", 0, 2400]];
    return { kind: "illustrative", title: "Clutch-time leverage", note: "Illustrative model, not a real game: the final margin is today's margin plus noise that shrinks as the clock runs down. Leverage = how much one possession (score or concede 2) moves the win probability.", rows: at.map(([label, m, s]) => ({ label, value: pp(clutchLeverage(m, s)) })) };
  }
  const { events, pending } = replays();
  if (slug === "architect") {
    const e = events.find((x) => x.sport === "football");
    if (!e) return { kind: "pending", title: "Possession value", note: pending.find((p) => p.sport === "football")?.reason ?? "No football data yet." };
    const shots = e.incidents.filter((i) => i.type === "shot").map((i) => i.payload as { team: string; minute: number; xg: number | null });
    const teams = [...new Set(shots.map((s) => s.team))];
    const rows = teams.flatMap((t) => [0, 30, 60].map((from) => {
      const xg = shots.filter((s) => s.team === t && s.minute >= from && (from === 60 || s.minute < from + 30)).reduce((a, s) => a + (s.xg ?? 0), 0);
      return { label: `${t}, ${from === 60 ? "60+" : `${from}–${from + 30}`} min`, value: `${xg.toFixed(2)} xG` };
    }));
    const last = e.incidents.map((i) => i.observedAt.toISOString()).sort().at(-1) as string;
    return { kind: "open-data", title: "Possession value", note: `Demo on StatsBomb open data, ${e.name} (${e.competition.name} ${e.season}): chance quality created in each phase of the match (expected goals), a simple stand-in for the value of possessions.`, rows, receipt: { sourceId: e.sourceId, sourceClass: "VERIFIED_DELAYED", observedAt: last, clock: "replay" }, attribution: getPolicy(e.sourceId)?.attribution_text ?? e.sourceId };
  }
  // professor: the pit window on OpenF1 open data
  const e = events.find((x) => x.sport === "f1");
  if (!e) return { kind: "pending", title: "Pit window", note: pending.find((p) => p.sport === "f1")?.reason ?? "No F1 data yet." };
  const laps = e.incidents.filter((i) => i.type === "lap").map((i) => i.payload as { driverNumber: number; lap: number; lapSeconds: number | null; pitOutLap: boolean });
  const drivers = [...new Set(laps.map((l) => l.driverNumber))].sort((a, b) => a - b);
  // cars are lettered, not numbered: no real driver is identified (public names only)
  const rows = drivers.slice(0, 5).flatMap((d, idx) => {
    const own = laps.filter((l) => l.driverNumber === d && l.lapSeconds !== null).sort((a, b) => a.lap - b.lap);
    const firstStop = own.find((l) => l.pitOutLap && l.lap > 1)?.lap;
    // lap 1 (standing start) is left out of the stint
    const stint = own.filter((l) => l.lap > 1 && (!firstStop || l.lap < firstStop)).map((l) => ({ lap: l.lap, seconds: l.lapSeconds as number, pitOut: false }));
    if (stint.length < 5) return [];
    const deg = degradation(stint);
    const w = pitWindow({ slopePerLap: deg.slopePerLap, stintStartLap: stint[0].lap - 1, pitLossSeconds: PIT_LOSS_SECONDS });
    const car = `Car ${String.fromCharCode(65 + idx)}`;
    const trend = deg.slopePerLap > 0 ? `${deg.slopePerLap.toFixed(3)} s slower each lap` : `${Math.abs(deg.slopePerLap).toFixed(3)} s faster each lap`;
    const verdict = w ? `window opens lap ${w.opensOnLap}` : "no window from wear (lap times fell as fuel burned off)";
    return [{ label: `${car}: first stint ${trend}`, value: `${verdict}${firstStop ? ` · pitted lap ${firstStop - 1}` : ""}` }];
  });
  const last = e.incidents.map((i) => i.observedAt.toISOString()).sort().at(-1) as string;
  return { kind: "open-data", title: "Pit window", note: `Demo on OpenF1 open data, ${e.name} (${e.season}): tyre wear from each car's first-stint lap times, and the lap where the time lost to wear passes an illustrative ${PIT_LOSS_SECONDS}-second pit-lane loss.`, rows, receipt: { sourceId: e.sourceId, sourceClass: "VERIFIED_DELAYED", observedAt: last, clock: "replay" }, attribution: getPolicy(e.sourceId)?.attribution_text ?? e.sourceId };
}
