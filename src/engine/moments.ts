// Golden-moment selection (docs/product-specs/decision-lab.md): top-decile leverage, diversified by match, season,
// phase and team. Pure and deterministic: candidates are taken in leverage order (ties by id).

export type Phase = "powerplay" | "middle" | "death";
/** Powerplay: the first 6 overs (more than 84 balls left); death: the last 4 (24 or fewer). */
export const phaseOf = (ballsLeft: number): Phase => (ballsLeft > 84 ? "powerplay" : ballsLeft <= 24 ? "death" : "middle");

export interface Candidate { id: string; match: string; season: number; phase: Phase; teams: string[]; leverage: number; answer?: string }

/** The value at quantile `q` (0..1) of `xs`, by nearest rank. */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) throw new RangeError("no values");
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

/**
 * Greedy diversified pick: highest leverage first, at most one moment per match, and per-season, per-phase and
 * per-team caps; with `perAnswer`, at most that many moments share an answer (so no fixed answer scores well).
 * Returns fewer than `n` when the caps can't be met.
 */
export function diversify<C extends Candidate>(candidates: C[], n: number, caps: { perSeason: number; perPhase: Record<Phase, number>; perTeam: number; perAnswer?: number }): C[] {
  const order = [...candidates].sort((a, b) => b.leverage - a.leverage || a.id.localeCompare(b.id));
  const out: C[] = [];
  const matches = new Set<string>(), season = new Map<number, number>(), phase = new Map<Phase, number>(), team = new Map<string, number>(), answer = new Map<string, number>();
  const answerFull = (c: C): boolean => caps.perAnswer !== undefined && c.answer !== undefined && (answer.get(c.answer) ?? 0) >= caps.perAnswer;
  for (const c of order) {
    if (out.length >= n) break;
    if (matches.has(c.match) || (season.get(c.season) ?? 0) >= caps.perSeason || (phase.get(c.phase) ?? 0) >= caps.perPhase[c.phase] || c.teams.some((t) => (team.get(t) ?? 0) >= caps.perTeam) || answerFull(c)) continue;
    out.push(c);
    matches.add(c.match);
    season.set(c.season, (season.get(c.season) ?? 0) + 1);
    phase.set(c.phase, (phase.get(c.phase) ?? 0) + 1);
    for (const t of c.teams) team.set(t, (team.get(t) ?? 0) + 1);
    if (c.answer !== undefined) answer.set(c.answer, (answer.get(c.answer) ?? 0) + 1);
  }
  return out;
}
