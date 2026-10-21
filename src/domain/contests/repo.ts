import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/domain/users/types";

const matchSelect = { id: true, team1: true, team2: true, date: true, status: true, tossCompleted: true } as const;
const teamSelect = {
  id: true, captainId: true, viceCaptainId: true, totalPoints: true, userId: true,
  players: { select: { id: true, playerId: true, player: { select: { name: true, role: true, credits: true } } } },
} as const;

export const findMatch = (id: string) => prisma.match.findUnique({ where: { id }, select: matchSelect });
export const listOpenMatches = () => prisma.match.findMany({ where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } }, orderBy: { date: "asc" }, select: matchSelect });
export const findTeam = (userId: string, matchId: string) => prisma.fantasyTeam.findFirst({ where: { userId, matchId }, select: teamSelect });
export const listTeams = (matchId: string, userIds: string[]) =>
  prisma.fantasyTeam.findMany({ where: { matchId, userId: { in: userIds } }, select: { ...teamSelect, user: { select: PUBLIC_USER_SELECT } }, orderBy: { totalPoints: "desc" } });
export const sumCompletedPoints = (userIds: string[]) =>
  prisma.fantasyTeam.groupBy({ by: ["userId"], where: { userId: { in: userIds }, match: { status: "COMPLETED" } }, _sum: { totalPoints: true } });
export const listUsers = (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids } }, select: PUBLIC_USER_SELECT });
export const listBuilderPlayers = (teams: string[], matchId: string) =>
  prisma.player.findMany({
    where: { team: { in: teams } },
    select: { id: true, name: true, team: true, role: true, credits: true, matchAppearances: { where: { matchId }, select: { isPlaying: true } }, stats: { orderBy: { season: "desc" }, select: { season: true, matchesPlayed: true, runs: true, wickets: true, avgPoints: true } } },
  });
