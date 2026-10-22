// Rules-first story detector: explicit thresholds over a parsed event's incidents, no model output in the text.
import type { ParsedEvent } from "@/adapters/types";
import type { IncidentInput } from "@/domain/facts/types";
import { createChaseModel, type ChaseModel, type ChaseState } from "@/engine/chaseWp";
import { predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { PRIORITY, THRESHOLDS, TITLES } from "./config";
import type { Story } from "./types";

export type WinProbability = (target: number, s: ChaseState) => number;

/** Exact chase WP from a fitted outcome artifact; one model per target, the most recent few kept. */
export function cricketWp(artifact: OutcomeArtifact): WinProbability {
  const models = new Map<number, ChaseModel>();
  return (target, s) => {
    let m = models.get(target);
    if (!m) {
      m = createChaseModel((st) => predictStyles(artifact, st, target));
      models.set(target, m);
      if (models.size > 8) models.delete(models.keys().next().value as number);
    }
    return m.wp(s);
  };
}

export interface ChasePoint { wp: number; i: IncidentInput; s: ChaseState }

/** WP after every legal ball of the chase (and after the ball that ends it); null when there is no exact WP. */
export function chaseSeries(e: ParsedEvent, wp: WinProbability): { team: string; target: number; start: number; series: ChasePoint[] } | null {
  // rain-affected chases (revised targets) and shortened chases have no exact WP
  if (e.sport !== "cricket" || typeof e.outcome.method === "string") return null;
  const chase = e.incidents.filter((i) => i.type === "ball" && i.payload.innings === 2 && i.payload.superOver !== true);
  const target = chase.find((i) => typeof i.payload.target === "number")?.payload.target as number | undefined;
  if (target === undefined) return null;
  // a chase over fewer than 20 overs (shortened without a recorded method) is not a 120-ball chase
  const overs = chase.find((i) => typeof i.payload.targetOvers === "number")?.payload.targetOvers as number | undefined;
  if (overs !== undefined && overs < 20) return null;
  let s: ChaseState = { b: 120, w: 10, r: target };
  const series: ChasePoint[] = [];
  for (const i of chase) {
    const p = i.payload as { runs: number; extras: number; extraType: string | null; wicket: boolean };
    const legal = p.extraType !== "wides" && p.extraType !== "noballs";
    s = { b: s.b - (legal ? 1 : 0), w: s.w - (p.wicket ? 1 : 0), r: s.r - p.runs - p.extras };
    if (legal || s.r <= 0 || s.w <= 0) series.push({ wp: wp(target, { b: Math.max(0, s.b), w: Math.max(0, s.w), r: s.r }), i, s });
  }
  return { team: chase[0].payload.team as string, target, start: wp(target, { b: 120, w: 10, r: target }), series };
}

/** The biggest |ΔWP| over any window of `window` legal balls, with the incidents it spans. */
export function maxSwing(c: NonNullable<ReturnType<typeof chaseSeries>>, window = THRESHOLDS.cricket.swingWindowBalls): { from: number; to: number; swing: number; incidents: IncidentInput[] } {
  let best = { from: c.start, to: c.start, swing: 0, incidents: [] as IncidentInput[] };
  c.series.forEach((x, k) => {
    const from = k < window ? c.start : c.series[k - window].wp;
    const d = Math.abs(x.wp - from);
    if (d > best.swing) best = { from, to: x.wp, swing: d, incidents: c.series.slice(Math.max(0, k - window + 1), k + 1).map((p) => p.i) };
  });
  return best;
}

/** A story's title in a language. */
export function storyTitle(s: Pick<Story, "kind" | "params">, lang: "en" | "hi"): string {
  return TITLES[lang][s.kind](s.params);
}

function story(e: ParsedEvent, kind: string, params: Story["params"], magnitude: number, incidents: IncidentInput[]): Story {
  const p = PRIORITY[kind];
  const last = incidents[incidents.length - 1];
  return { sport: e.sport, kind, title: TITLES.en[kind](params), params, magnitude, priority: p.base + p.scale * magnitude, observedAt: last.observedAt.toISOString(), sourceId: e.sourceId, receipts: incidents.map((i) => i.sourceRef) };
}

const pct = (x: number): number => Math.round(x * 100);

interface Ball { i: IncidentInput; innings: number; team: string; over: number; runs: number; legal: boolean; wicket: boolean; target?: number }

function cricketStories(e: ParsedEvent, wp: WinProbability): Story[] {
  const T = THRESHOLDS.cricket;
  const balls: Ball[] = e.incidents.filter((i) => i.type === "ball" && i.payload.superOver !== true).map((i) => {
    const p = i.payload as { innings: number; team: string; over: number; runs: number; extras: number; extraType: string | null; wicket: boolean; target?: number };
    return { i, innings: p.innings, team: p.team, over: p.over, runs: p.runs + p.extras, legal: p.extraType !== "wides" && p.extraType !== "noballs", wicket: p.wicket, target: p.target };
  });
  const out: Story[] = [];
  for (const inn of [...new Set(balls.map((b) => b.innings))]) {
    const bs = balls.filter((b) => b.innings === inn);
    const team = bs[0].team;
    for (const over of [...new Set(bs.map((b) => b.over))]) {
      const ob = bs.filter((b) => b.over === over);
      const runs = ob.reduce((a, b) => a + b.runs, 0);
      if (runs >= T.bigOverRuns) out.push(story(e, "big-over", { team, runs, over: over + 1 }, runs, ob.map((b) => b.i)));
    }
    // collapses: merge overlapping windows of ≥ collapseWickets wickets within collapseWindowBalls legal balls
    const legalIdx = bs.map((b, k) => bs.slice(0, k + 1).filter((x) => x.legal).length);
    const wk = bs.map((b, k) => ({ b, k })).filter((x) => x.b.wicket);
    let start = 0;
    while (start < wk.length) {
      let end = start;
      while (end + 1 < wk.length && legalIdx[wk[end + 1].k] - legalIdx[wk[start].k] < T.collapseWindowBalls) end++;
      const n = end - start + 1;
      if (n >= T.collapseWickets) {
        const span = bs.slice(wk[start].k, wk[end].k + 1);
        out.push(story(e, "collapse", { team, wickets: n, balls: legalIdx[wk[end].k] - legalIdx[wk[start].k] + 1 }, n, span.map((b) => b.i)));
        start = end + 1;
      } else start++;
    }
  }
  const chase = chaseSeries(e, wp);
  if (!chase) return out;
  const { team, start, series } = chase;
  const W = T.swingWindowBalls;
  const windows = series.map((x, k) => ({ k, from: k < W ? start : series[k - W].wp, to: x.wp })).map((w) => ({ ...w, d: Math.abs(w.to - w.from) }));
  const taken = new Set<number>();
  for (const w of [...windows].sort((a, b) => b.d - a.d || a.k - b.k)) {
    if (w.d < T.swing || taken.size >= 3 * W) break;
    const ks = Array.from({ length: Math.min(W, w.k + 1) }, (_, j) => w.k - j);
    if (ks.some((k) => taken.has(k))) continue;
    ks.forEach((k) => taken.add(k));
    out.push(story(e, "swing", { team, from: pct(w.from), to: pct(w.to) }, w.d, ks.reverse().map((k) => series[k].i)));
  }
  const tense = series.filter((x) => x.s.b > 0 && x.s.b <= T.tenseBallsLeft && x.s.r > 0 && x.s.w > 0 && x.wp >= T.tenseLo && x.wp <= T.tenseHi).at(-1);
  if (tense) out.push(story(e, "tense-finish", { team, runs: tense.s.r, balls: tense.s.b, wickets: tense.s.w, wp: pct(tense.wp) }, 1, [tense.i]));
  return out;
}

function footballStories(e: ParsedEvent): Story[] {
  const T = THRESHOLDS.football;
  return e.incidents.filter((i) => i.type === "shot").flatMap((i) => {
    const p = i.payload as { minute: number; team: string; player: string | null; goal: boolean; xg: number | null };
    const who = p.player ?? p.team;
    if (p.goal) return [p.minute >= T.lateGoalMinute ? story(e, "late-goal", { who, team: p.team, minute: p.minute }, 1, [i]) : story(e, "goal", { who, team: p.team, minute: p.minute }, 1, [i])];
    if (p.xg !== null && p.xg >= T.bigChanceXg) return [story(e, "big-chance-missed", { who, team: p.team, minute: p.minute, xg: p.xg.toFixed(2) }, p.xg, [i])];
    return [];
  });
}

function f1Stories(e: ParsedEvent): Story[] {
  const laps = e.incidents.filter((i) => i.type === "lap");
  const out = laps.filter((i) => i.payload.pitOutLap === true).map((i) => story(e, "pit-stop", { car: i.payload.driverNumber as number, lap: i.payload.lap as number }, 1, [i]));
  for (const car of [...new Set(laps.map((i) => i.payload.driverNumber as number))]) {
    const timed = laps.filter((i) => i.payload.driverNumber === car && typeof i.payload.lapSeconds === "number");
    if (timed.length === 0) continue;
    const times = timed.map((i) => i.payload.lapSeconds as number).sort((a, b) => a - b);
    const median = times[Math.floor((times.length - 1) / 2)];
    const best = timed.find((i) => i.payload.lapSeconds === times[0]) as IncidentInput;
    const gain = median - times[0];
    if (gain >= THRESHOLDS.f1.quickLapGainSeconds) out.push(story(e, "pace", { car, gain: gain.toFixed(1), lap: best.payload.lap as number }, gain, [best]));
  }
  return out;
}

/** Prioritised stories for an event; sports without a source have none. */
export function detectStories(e: ParsedEvent, deps: { wp: WinProbability }): Story[] {
  const stories = e.sport === "cricket" ? cricketStories(e, deps.wp) : e.sport === "football" ? footballStories(e) : e.sport === "f1" ? f1Stories(e) : [];
  return stories.sort((a, b) => b.priority - a.priority || a.observedAt.localeCompare(b.observedAt));
}
