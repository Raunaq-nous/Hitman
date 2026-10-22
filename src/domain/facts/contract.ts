// Data contract for Cricsheet matches (docs/design-docs/models-and-grading.md): ordering, legal-ball and wicket
// bounds, winner agreement, and which matches may feed the chase win-probability model.
import type { ParsedEvent } from "@/adapters/types";

export interface ContractResult { ok: boolean; violations: string[]; chaseEligible: boolean; reasons: string[] }

interface Ball { innings: number; superOver: boolean; team: string; over: number; ball: number; runs: number; extras: number; extraType: string | null; wicket: boolean }

const LEGAL_PER_OVER = 6;

export function checkCricketContract(e: ParsedEvent, maxOvers = 20): ContractResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const balls = e.incidents.filter((i) => i.type === "ball").map((i) => i.payload as unknown as Ball);
  const main = balls.filter((b) => !b.superOver);
  const innings = [...new Set(main.map((b) => b.innings))];
  const totals = new Map<string, number>();
  for (const inn of innings) {
    const bs = main.filter((b) => b.innings === inn);
    let prev = -1, legal = 0, wickets = 0, runs = 0;
    const legalByOver = new Map<number, number>();
    for (const b of bs) {
      const pos = b.over * 100 + b.ball;
      if (pos <= prev) violations.push(`innings ${inn}: deliveries out of order at over ${b.over}`);
      prev = pos;
      const isLegal = b.extraType !== "wides" && b.extraType !== "noballs";
      if (isLegal) { legal++; legalByOver.set(b.over, (legalByOver.get(b.over) ?? 0) + 1); }
      // runs only ever accumulate: a negative delivery would make the score go backwards
      if (b.runs < 0 || b.extras < 0) violations.push(`innings ${inn}: negative runs at over ${b.over}.${b.ball}`);
      if (b.wicket) wickets++;
      runs += b.runs + b.extras;
    }
    for (const [over, n] of legalByOver) if (n > LEGAL_PER_OVER) violations.push(`innings ${inn}: over ${over} has ${n} legal balls`);
    if (legal > maxOvers * LEGAL_PER_OVER) violations.push(`innings ${inn}: ${legal} legal balls exceeds ${maxOvers} overs`);
    if (wickets > 10) violations.push(`innings ${inn}: ${wickets} wickets`);
    totals.set(bs[0].team, runs);
  }
  const o = e.outcome as { winner?: string; result?: string; method?: string };
  const [first, second] = innings.map((inn) => main.find((b) => b.innings === inn)?.team as string);
  if (typeof o.method === "string") reasons.push(`target revised (${o.method}): rain-affected`);
  const overs = (e.incidents.find((i) => typeof i.payload.targetOvers === "number")?.payload.targetOvers as number | undefined);
  if (overs !== undefined && overs < maxOvers) reasons.push(`chase over ${overs} overs, not ${maxOvers}`);
  if (o.result === "no result") reasons.push("no result");
  if (innings.length < 2) reasons.push("no second innings");
  if (!o.method && innings.length === 2) {
    const [t1, t2] = [totals.get(first) ?? 0, totals.get(second) ?? 0];
    if (o.result === "tie" && t1 !== t2) violations.push(`tie recorded but totals differ (${t1} v ${t2})`);
    if (o.winner && o.winner !== (t1 > t2 ? first : t2 > t1 ? second : null)) violations.push(`winner ${o.winner} disagrees with totals (${first} ${t1}, ${second} ${t2})`);
  }
  return { ok: violations.length === 0, violations, chaseEligible: violations.length === 0 && reasons.length === 0, reasons };
}
