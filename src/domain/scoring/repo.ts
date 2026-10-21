import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const findMatch = (id: string) => prisma.match.findUnique({ where: { id }, select: { id: true, status: true } });
export const teamsForMatch = (matchId: string) =>
  prisma.fantasyTeam.findMany({ where: { matchId }, select: { id: true, userId: true, captainId: true, viceCaptainId: true, players: { select: { playerId: true } } } });

export type LedgerRow = Prisma.ScoringEventCreateManyInput;

/**
 * Append the events (duplicates by idempotencyKey are skipped), then recompute each team's cached total from the
 * ledger for this version. Returns how many events were new per team, so XP is only awarded once.
 */
export async function appendAndTotal(matchId: string, version: number, rowsByTeam: Map<string, { userId: string; rows: LedgerRow[] }>): Promise<Map<string, number>> {
  return prisma.$transaction(async (tx) => {
    const inserted = new Map<string, number>();
    for (const [teamId, { userId, rows }] of rowsByTeam) {
      const { count } = await tx.scoringEvent.createMany({ data: rows, skipDuplicates: true });
      inserted.set(teamId, count);
      const sum = await tx.scoringEvent.aggregate({ where: { fantasyTeamId: teamId, configVersion: version }, _sum: { points: true } });
      const total = sum._sum.points ?? 0;
      await tx.fantasyTeam.update({ where: { id: teamId }, data: { totalPoints: total } });
      if (count > 0) await tx.user.update({ where: { id: userId }, data: { xp: { increment: Math.floor(total / 10) } } });
    }
    await tx.match.update({ where: { id: matchId }, data: { status: "COMPLETED" } });
    return inserted;
  });
}
