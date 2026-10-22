// Golden moments (F-E-08): data/fixtures/moments/golden-moments.json, committed and hashed.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface StoredMoment {
  id: string; matchId: string; season: number; date: string; observedCutoff: string; leverage: number;
  prelock: { battingTeam: string; bowlingTeam: string; venue: string; target: number; ballsLeft: number; wicketsInHand: number; runsRequired: number; overs: string; phase: "powerplay" | "middle" | "death"; requiredRate: number; striker: string; bowler: string; recent: { deliveries: number; runs: number; wickets: number } };
  decision: { type: string; question: string; options: { option: string; label: string; wp: number; n: number }[]; best: string | null; gapPts: number; calibration: "provisional" };
  reveal: { chaseWon: 0 | 1; winner: string };
}

export function storedMoments(): StoredMoment[] {
  return (JSON.parse(readFileSync(join(process.cwd(), "data/fixtures/moments/golden-moments.json"), "utf8")) as { moments: StoredMoment[] }).moments;
}
