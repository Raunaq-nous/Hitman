// Contest reads, always scoped to a crew the caller belongs to.
import { Prisma } from "@prisma/client";
import { DomainError } from "@/domain/shared/types";
import { validateFantasyTeam } from "@/lib/fantasyRules";
import { toPublicUser } from "@/domain/users/types";
import { memberIds, requireMembership } from "@/domain/crews/service";
import type { ContestEntryDTO, FantasyTeamDTO, MatchDTO, StandingDTO, SubmitTeamInput } from "./types";
import * as repo from "./repo";

type MatchRow = NonNullable<Awaited<ReturnType<typeof repo.findMatch>>>;
type TeamRow = NonNullable<Awaited<ReturnType<typeof repo.findTeam>>>;

const toMatch = (m: MatchRow): MatchDTO => ({ ...m, date: m.date.toISOString() });
const toTeam = (t: TeamRow): FantasyTeamDTO => ({ id: t.id, captainId: t.captainId, viceCaptainId: t.viceCaptainId, totalPoints: t.totalPoints, players: t.players });

export async function openMatchesForCrew(userId: string, crewId: string): Promise<MatchDTO[]> {
  await requireMembership(userId, crewId);
  return (await repo.listOpenMatches()).map(toMatch);
}

export async function getContest(userId: string, crewId: string, matchId: string): Promise<{ match: MatchDTO; myTeam: FantasyTeamDTO | null; memberCount: number }> {
  const ids = await memberIds(userId, crewId);
  const match = await repo.findMatch(matchId);
  if (!match) throw new DomainError("NOT_FOUND", "Match not found.");
  const team = await repo.findTeam(userId, matchId);
  return { match: toMatch(match), myTeam: team ? toTeam(team) : null, memberCount: ids.length };
}

export async function contestEntries(userId: string, crewId: string, matchId: string): Promise<{ match: MatchDTO; entries: ContestEntryDTO[] }> {
  const ids = await memberIds(userId, crewId);
  const match = await repo.findMatch(matchId);
  if (!match) throw new DomainError("NOT_FOUND", "Match not found.");
  const teams = await repo.listTeams(matchId, ids);
  return { match: toMatch(match), entries: teams.map((t) => ({ user: toPublicUser(t.user), team: toTeam(t) })) };
}

export async function crewStandings(userId: string, crewId: string): Promise<StandingDTO[]> {
  const ids = await memberIds(userId, crewId);
  const [sums, users] = await Promise.all([repo.sumCompletedPoints(ids), repo.listUsers(ids)]);
  const points = new Map(sums.map((s) => [s.userId, s._sum.totalPoints ?? 0]));
  return users.map((u) => ({ user: toPublicUser(u), points: points.get(u.id) ?? 0 })).sort((a, b) => b.points - a.points || a.user.name.localeCompare(b.user.name));
}

export async function builderPlayers(userId: string, crewId: string, matchId: string) {
  const { match } = await getContest(userId, crewId, matchId);
  const rows = await repo.listBuilderPlayers([match.team1, match.team2], matchId);
  return rows.map((p) => ({
    id: p.id, name: p.name, team: p.team, role: p.role, credits: p.credits,
    isPlaying: p.matchAppearances[0]?.isPlaying ?? false,
    stats: p.stats.map((s) => ({ season: s.season, matches: s.matchesPlayed, runs: s.runs, wickets: s.wickets, avg: s.avgPoints })),
  }));
}

/** One team per user per match: enforced by a unique index; a second submit is a 409 CONFLICT, even when two race. */
export async function submitTeam(userId: string, input: SubmitTeamInput): Promise<{ teamId: string }> {
  const match = await repo.findMatch(input.matchId);
  if (!match) throw new DomainError("NOT_FOUND", "Match not found.");
  // Selection closes once an admin moves the match out of UPCOMING at the first ball.
  if (match.status !== "UPCOMING") throw new DomainError("CLOSED", "Team selection has closed for this match.");
  const players = await repo.listRulePlayers(input.playerIds);
  const check = validateFantasyTeam(input, players, [match.team1, match.team2]);
  if (!check.ok) throw new DomainError("INVALID", check.error);
  try {
    return { teamId: (await repo.insertTeam(userId, input)).id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DomainError("CONFLICT", "You’ve already submitted a team for this match. Each fan gets one team per match.");
    }
    throw e;
  }
}
