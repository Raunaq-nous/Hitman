// Decision Lab moments as shown before lock: nothing observed after the cutoff, and no model answer.
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
