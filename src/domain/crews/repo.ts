// Crew persistence (currently the legacy League tables; renamed when crews ship in F-C-01).
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/domain/users/types";

const memberSelect = { userId: true, joinedAt: true, user: { select: PUBLIC_USER_SELECT } } as const;

export function findCrewWithMembers(crewId: string) {
  return prisma.league.findUnique({ where: { id: crewId }, select: { id: true, name: true, inviteCode: true, ownerId: true, members: { select: memberSelect, orderBy: { joinedAt: "asc" } } } });
}

export function findCrewByCode(inviteCode: string) {
  return prisma.league.findUnique({ where: { inviteCode }, select: { id: true, name: true, ownerId: true } });
}

export function findMembership(userId: string, crewId: string) {
  return prisma.leagueMember.findUnique({ where: { userId_leagueId: { userId, leagueId: crewId } }, select: { id: true } });
}

export function listCrewsForUser(userId: string) {
  return prisma.league.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, ownerId: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listMemberIds(crewId: string): Promise<string[]> {
  return prisma.leagueMember.findMany({ where: { leagueId: crewId }, select: { userId: true } }).then((rows) => rows.map((r) => r.userId));
}

export function insertCrew(ownerId: string, name: string, inviteCode: string) {
  return prisma.league.create({ data: { name, inviteCode, ownerId, members: { create: { userId: ownerId } } }, select: { id: true } });
}

export function insertMember(userId: string, crewId: string) {
  return prisma.leagueMember.create({ data: { userId, leagueId: crewId }, select: { id: true } });
}
