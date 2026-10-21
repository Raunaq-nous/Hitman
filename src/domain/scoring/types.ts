import { z } from "zod";

export const scoreMatchInput = z.object({
  matchId: z.string().min(1, "matchId is required."),
  stats: z.record(z.string(), z.unknown()).refine((s) => Object.keys(s).length > 0, "Provide per-player stats from the real scorecard. Points are never generated."),
});
export type ScoreMatchInput = z.infer<typeof scoreMatchInput>;

export interface ScoreMatchResult {
  teams: number;
  eventsWritten: number;
  eventsAlreadyPresent: number;
  scoringVersion: number;
}
