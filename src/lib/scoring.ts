import rules from "../../config/scoring.json";

// One versioned scoring config. Points only ever come from real stat lines.
export type StatLine = { runs: number; fours: number; sixes: number; wickets: number; catches: number; runOuts: number };
export type Armband = "captain" | "vice" | "none";

export const SCORING_VERSION: number = rules.version;

const KEYS = ["runs", "fours", "sixes", "wickets", "catches", "runOuts"] as const;

export function parseStatLine(value: unknown): StatLine | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const line = { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0, runOuts: 0 };
  for (const key of KEYS) {
    const n = raw[key] ?? 0;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
    line[key] = Math.floor(n);
  }
  return line;
}

export function basePoints(s: StatLine): number {
  let pts =
    s.runs * rules.RUN + s.fours * rules.BOUNDARY + s.sixes * rules.SIX +
    s.wickets * rules.WICKET + s.catches * rules.CATCH + s.runOuts * rules.RUNOUT;
  if (s.runs >= 100) pts += rules.MILESTONE_100;
  else if (s.runs >= 50) pts += rules.MILESTONE_50;
  else if (s.runs >= 30) pts += rules.MILESTONE_30;
  if (s.wickets >= 5) pts += rules.HAUL_5;
  else if (s.wickets >= 4) pts += rules.HAUL_4;
  return pts;
}

export function playerPoints(s: StatLine, armband: Armband): number {
  const base = basePoints(s);
  if (armband === "captain") return base * rules.CAPTAIN_MULTIPLIER;
  if (armband === "vice") return base * rules.VICE_CAPTAIN_MULTIPLIER;
  return base;
}
