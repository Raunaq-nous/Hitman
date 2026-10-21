// A contest is one match inside one crew.
import { z } from "zod";
import type { PublicUserDTO } from "@/domain/users/types";

export interface MatchDTO { id: string; team1: string; team2: string; date: string; status: string; tossCompleted: boolean }
export interface TeamPlayerDTO { id: string; playerId: string; player: { name: string; role: string; credits: number } }
export interface FantasyTeamDTO { id: string; captainId: string; viceCaptainId: string; totalPoints: number; players: TeamPlayerDTO[] }
export interface ContestEntryDTO { user: PublicUserDTO; team: FantasyTeamDTO }
export interface StandingDTO { user: PublicUserDTO; points: number }

export const submitTeamInput = z.object({
  matchId: z.string().min(1, "Choose a match."),
  playerIds: z.array(z.string().min(1)).min(1, "Pick your players."),
  captainId: z.string().min(1, "Choose a captain."),
  viceCaptainId: z.string().min(1, "Choose a vice-captain."),
});
export type SubmitTeamInput = z.infer<typeof submitTeamInput>;
