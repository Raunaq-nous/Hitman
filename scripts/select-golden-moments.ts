// Fifty golden moments for the Decision Lab (F-E-08), from IPL 2024–2026 chases scored with outcomes-v1 (2008–2023),
// so no pre-lock estimate has seen the moment's season. Steps: rebuild each match from data/derived, keep matches the
// data contract accepts for chase WP (and decided ones: no ties), compute every pre-ball state's leverage, keep the
// top decile, attach a gradeable decision (F-E-05) and pick 50 diversified moments.
//   tsx scripts/select-golden-moments.ts → data/fixtures/moments/golden-moments.json
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { ParsedEvent } from "@/adapters/types";
import { checkCricketContract } from "@/domain/facts/contract";
import { createChaseModel, type ChaseModel, type ChaseState } from "@/engine/chaseWp";
import { diversify, phaseOf, quantile, type Candidate } from "@/engine/moments";
import { chaseSamples, predictOutcome, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { momentDecision, rateBand, type DecisionType, type OptionArtifact } from "@/engine/options";
import { parseCsv } from "./fit-outcomes";

export const SEASONS = [2024, 2025, 2026];
export const N = 50;
// The model's best answer is "higher band" at every gradeable middle-over state and splits between higher and current
// only in the death overs (lower almost never wins; D-039), so most moments come from the death overs and at most half
// share an answer: neither a fixed answer nor a phase rule ("attack in the middle, hold at the death") does well
export const CAPS = { perSeason: 20, perPhase: { powerplay: 12, middle: 10, death: 40 }, perTeam: 16, perAnswer: 25 };
const SECONDS_PER_DELIVERY = 30;
type Row = Record<string, string>;

const csv = (f: string): Row[] => parseCsv(gunzipSync(readFileSync(f)).toString("utf8"));

/** The derived rows of one match as a ParsedEvent (same payload fields and replay clock as the Cricsheet adapter). */
export function eventFromDerived(match: Row, rows: Row[]): ParsedEvent {
  const startsAt = new Date(`${match.date}T14:00:00Z`);
  return {
    sourceId: "cricsheet", sourceRef: match.match_id, sport: "cricket", competition: { slug: "indian-premier-league", name: "Indian Premier League" },
    season: match.season, name: `${match.team1} v ${match.team2}`, startsAt, venue: match.venue || null,
    participants: [{ name: match.team1, role: "team" }, { name: match.team2, role: "team" }],
    outcome: { ...(match.winner ? { winner: match.winner } : {}), ...(match.result ? { result: match.result } : {}), ...(match.method ? { method: match.method } : {}) },
    incidents: rows.map((r, n) => {
      const at = new Date(startsAt.getTime() + n * SECONDS_PER_DELIVERY * 1000);
      return {
        t: n, seq: 0, actor: r.batter, type: "ball",
        payload: { innings: Number(r.innings), superOver: Number(r.innings) > 2, team: r.batting_team, over: Number(r.over), ball: Number(r.ball), batter: r.batter, bowler: r.bowler, runs: Number(r.runs_batter), extras: Number(r.extras), extraType: r.extra_type || null, wicket: r.wicket === "1", ...(r.target ? { target: Number(r.target) } : {}), ...(r.target_overs ? { targetOvers: Number(r.target_overs) } : {}) },
        sourceId: "cricsheet", sourceRef: `${match.match_id}:${r.innings}:${r.over}:${r.ball}`, sourceClass: "VERIFIED_DELAYED" as const, rightsPolicyId: "cricsheet", effectiveAt: at, observedAt: at, supersedesId: null,
      };
    }),
  };
}

/** The best option's required-rate band relative to the state's own: "higher", "current" or "lower". */
export function answerOf(best: string, s: ChaseState): "higher" | "current" | "lower" {
  const d = Number(best.slice("rate:".length)) - rateBand(s);
  return d > 0 ? "higher" : d < 0 ? "lower" : "current";
}

const oversOf = (legalBowled: number): string => `${Math.floor(legalBowled / 6)}.${legalBowled % 6}`;
// decision types tried per phase, in order (death-over pace vs spin lacks style data: D-036)
const DECISIONS_FOR: Record<string, DecisionType[]> = { powerplay: ["chase-tempo", "next-over-intent"], middle: ["next-over-intent", "chase-tempo"], death: ["next-over-intent", "chase-tempo"] };
export const STATES_PER_MATCH_PHASE = 12;
const QUESTION: Record<DecisionType, string> = {
  "next-over-intent": "Next over: should the chasing side attack, hold its rate or ease off?",
  "chase-tempo": "What run rate should the chasing side aim for over the next two overs?",
  "death-bowling": "Death over: pace or spin?",
};

export function buildMoments() {
  const outcomes = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact & { hash: string };
  const options = JSON.parse(readFileSync("data/models/options-v1.json", "utf8")) as OptionArtifact & { hash: string };
  const matches = csv("data/derived/ipl-matches.csv.gz").filter((m) => SEASONS.includes(Number(m.date.slice(0, 4))));
  const balls = csv("data/derived/ipl-balls.csv.gz");
  const rowsOf = new Map<string, Row[]>();
  for (const b of balls) { const l = rowsOf.get(b.match_id); if (l) l.push(b); else rowsOf.set(b.match_id, [b]); }
  const models = new Map<number, ChaseModel>();
  const model = (t: number): ChaseModel => { let m = models.get(t); if (!m) { m = createChaseModel((s) => predictStyles(outcomes, s, t)); models.set(t, m); } return m; };

  type Pre = Candidate & { matchRow: Row; rows: Row[]; deliveryIndex: number; legalBowled: number; state: ChaseState; target: number; chaseWon: 0 | 1 };
  const all: Pre[] = [];
  let excluded = 0;
  for (const m of matches) {
    const rows = rowsOf.get(m.match_id) ?? [];
    const contract = checkCricketContract(eventFromDerived(m, rows));
    if (!contract.chaseEligible || m.result === "tie" || !m.winner) { excluded++; continue; }
    const chaseRows = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.innings === "2");
    const samples = chaseSamples(chaseRows.map(({ r }) => ({ matchId: m.match_id, year: Number(m.date.slice(0, 4)), innings: 2, runsBatter: Number(r.runs_batter), extras: Number(r.extras), extraType: r.extra_type || null, wicket: r.wicket === "1", target: r.target ? Number(r.target) : null })));
    const legalRows = chaseRows.filter(({ r }) => r.extra_type !== "wides" && r.extra_type !== "noballs");
    const chaser = chaseRows[0].r.batting_team, bowling = chaser === m.team1 ? m.team2 : m.team1;
    samples.forEach((s, k) => {
      const lev = model(s.target).leverage(s.state);
      // the moment is just before this legal ball: the delivery index of the first delivery after the previous legal ball
      const prevLegal = k === 0 ? chaseRows[0].i - 1 : legalRows[k - 1].i;
      // a wide or no-ball since the previous legal ball is folded into this ball's state (chaseSamples), so the state
      // would include a delivery bowled after the cutoff: skip it (no pre-lock fact may come from after the cutoff)
      if (legalRows[k].i !== prevLegal + 1) return;
      all.push({ id: `gm-${m.date.slice(0, 4)}-${m.match_id}-${120 - s.state.b}`, match: m.match_id, season: Number(m.date.slice(0, 4)), phase: phaseOf(s.state.b), teams: [chaser, bowling], leverage: lev, matchRow: m, rows, deliveryIndex: prevLegal + 1, legalBowled: 120 - s.state.b, state: s.state, target: s.target, chaseWon: m.winner === chaser ? 1 : 0 });
    });
  }
  const threshold = quantile(all.map((c) => c.leverage), 0.9);
  // gradeable decisions only (enough data, not a coin flip), at the top-decile states
  const top = all.filter((c) => c.leverage >= threshold).sort((a, b) => b.leverage - a.leverage || a.id.localeCompare(b.id));
  const tried = new Map<string, number>();
  const gradeable: (Pre & { decision: NonNullable<ReturnType<typeof momentDecision>> })[] = [];
  for (const c of top) {
    const k = `${c.match}:${c.phase}`;
    if ((tried.get(k) ?? 0) >= STATES_PER_MATCH_PHASE) continue;
    tried.set(k, (tried.get(k) ?? 0) + 1);
    // every gradeable decision type is a candidate; its answer is the best band relative to the current one
    for (const type of DECISIONS_FOR[c.phase]) {
      const d = momentDecision(type, c.state, predictOutcome(outcomes, c.state, c.target), (s) => predictStyles(outcomes, s, c.target), options);
      if (d && !d.insufficient && !d.coinFlip) gradeable.push({ ...c, decision: d, answer: answerOf(d.best as string, c.state) });
    }
  }
  const picked = diversify(gradeable, N, CAPS);

  const moments = picked.map((c) => {
    const r = c.rows, next = r[c.deliveryIndex];
    const before = r.slice(0, c.deliveryIndex).filter((x) => x.innings === "2");
    const recent = before.slice(-12);
    const startsAt = new Date(`${c.matchRow.date}T14:00:00Z`).getTime();
    return {
      id: c.id, sourceId: "cricsheet", matchId: c.match, season: c.season, date: c.matchRow.date,
      // everything a fan sees before lock; nothing here is observed after `observedCutoff`
      prelock: {
        battingTeam: c.teams[0], bowlingTeam: c.teams[1], venue: c.matchRow.venue, target: c.target,
        ballsLeft: c.state.b, wicketsInHand: c.state.w, runsRequired: c.state.r, overs: oversOf(c.legalBowled), phase: c.phase,
        requiredRate: Math.round((c.state.r * 6 / c.state.b) * 100) / 100,
        striker: next.batter, bowler: next.bowler,
        recent: { deliveries: recent.length, runs: recent.reduce((a, x) => a + Number(x.runs_batter) + Number(x.extras), 0), wickets: recent.filter((x) => x.wicket === "1").length },
      },
      observedCutoff: new Date(startsAt + (c.deliveryIndex - 1) * SECONDS_PER_DELIVERY * 1000).toISOString(),
      leverage: Math.round(c.leverage * 1e6) / 1e6,
      decision: {
        type: c.decision.type, question: QUESTION[c.decision.type],
        options: c.decision.options.map((o) => ({ option: o.option, label: c.decision.labels[o.option], wp: Math.round(o.wp * 1e6) / 1e6, n: o.n })),
        best: c.decision.best, answer: c.answer as string, gapPts: Math.round(c.decision.gapPts * 1000) / 1000, calibration: "provisional",
      },
      // shown only after lock
      reveal: { chaseWon: c.chaseWon, winner: c.matchRow.winner },
    };
  });
  return {
    version: "v1", seasons: SEASONS, outcomesHash: outcomes.hash, optionsHash: options.hash, leverageThreshold: Math.round(threshold * 1e6) / 1e6,
    statesScored: all.length, matchesExcluded: excluded, caps: CAPS, moments,
  };
}

if (process.argv[1]?.endsWith("select-golden-moments.ts")) {
  const a = buildMoments();
  const hash = createHash("sha256").update(JSON.stringify(a)).digest("hex");
  mkdirSync("data/fixtures/moments", { recursive: true });
  writeFileSync("data/fixtures/moments/golden-moments.json", JSON.stringify({ hash, source: "Cricsheet IPL ball-by-ball (cricsheet.org)", ...a }, null, 1) + "\n");
  const by = (k: (m: (typeof a.moments)[number]) => string) => JSON.stringify(a.moments.reduce<Record<string, number>>((o, m) => ({ ...o, [k(m)]: (o[k(m)] ?? 0) + 1 }), {}));
  console.log(`golden moments: ${a.moments.length} (threshold ${a.leverageThreshold}, ${a.statesScored} states, ${a.matchesExcluded} matches excluded); seasons ${by((m) => String(m.season))}; phases ${by((m) => m.prelock.phase)}; types ${by((m) => m.decision.type)}; answers ${by((m) => m.decision.answer)}; sha256 ${hash.slice(0, 12)}`);
}
