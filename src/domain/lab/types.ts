// Decision Lab moments as shown before lock: nothing observed after the cutoff, and no model answer.
import { z } from "zod";
export interface MomentOption { option: string; label: string }

export interface PrelockMoment {
  id: string;
  season: number;
  battingTeam: string;
  bowlingTeam: string;
  venue: string;
  target: number;
  ballsLeft: number;
  wicketsInHand: number;
  runsRequired: number;
  overs: string;
  phase: "powerplay" | "middle" | "death";
  requiredRate: number;
  striker: string;
  bowler: string;
  recent: { deliveries: number; runs: number; wickets: number };
  leverage: number;
  observedCutoff: string;
  question: string;
  decisionType: string;
  options: MomentOption[];
}

/** A lock request: one option of the moment and a confidence on the 50–99% slider. The server sets the time. */
export const lockInput = z.object({
  momentId: z.string().min(1).max(64),
  option: z.string().min(1).max(32),
  confidence: z.number().min(0.5, "Confidence is between 50% and 99%.").max(0.99, "Confidence is between 50% and 99%."),
});
export type LockInput = z.infer<typeof lockInput>;

export interface LockedCall { id: string; momentId: string; option: string; confidence: number; lockedAt: string }
