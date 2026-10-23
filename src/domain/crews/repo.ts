// Crew persistence.
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/domain/users/types";

const memberSelect = { userId: true, joinedAt: true, user: { select: PUBLIC_USER_SELECT } } as const;

export function findCrewWithMembers(crewId: string) {
  return prisma.crew.findUnique({ where: { id: crewId }, select: { id: true, name: true, inviteCode: true, ownerId: true, members: { select: memberSelect, orderBy: { joinedAt: "asc" } } } });
}

export function findCrew(crewId: string) {
  return prisma.crew.findUnique({ where: { id: crewId }, select: { id: true, name: true, ownerId: true } });
}

export function findCrewByCode(inviteCode: string) {
  return prisma.crew.findUnique({ where: { inviteCode }, select: { id: true, name: true, ownerId: true } });
}

export function findMembership(userId: string, crewId: string) {
  return prisma.crewMember.findUnique({ where: { userId_crewId: { userId, crewId } }, select: { id: true } });
}

export function listCrewsForUser(userId: string) {
  return prisma.crew.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, ownerId: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listMemberIds(crewId: string): Promise<string[]> {
  return prisma.crewMember.findMany({ where: { crewId }, select: { userId: true } }).then((rows) => rows.map((r) => r.userId));
}

export function countMembers(crewId: string): Promise<number> {
  return prisma.crewMember.count({ where: { crewId } });
}

export function insertCrew(ownerId: string, name: string, inviteCode: string) {
  return prisma.crew.create({ data: { name, inviteCode, ownerId, members: { create: { userId: ownerId } } }, select: { id: true } });
}

export function insertMember(userId: string, crewId: string) {
  return prisma.crewMember.create({ data: { userId, crewId }, select: { id: true } });
}

export function deleteMember(userId: string, crewId: string) {
  return prisma.crewMember.delete({ where: { userId_crewId: { userId, crewId } } });
}

export function deleteCrew(crewId: string) {
  return prisma.crew.delete({ where: { id: crewId } });
}

export function setInviteCode(crewId: string, inviteCode: string) {
  return prisma.crew.update({ where: { id: crewId }, data: { inviteCode }, select: { inviteCode: true } });
}

export function setOwner(crewId: string, ownerId: string) {
  return prisma.crew.update({ where: { id: crewId }, data: { ownerId }, select: { id: true } });
}

export function isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
  return prisma.userBlock.count({ where: { blockerId, blockedId } }).then((n) => n > 0);
}

export function blockedIdsFor(blockerId: string): Promise<string[]> {
  return prisma.userBlock.findMany({ where: { blockerId }, select: { blockedId: true } }).then((r) => r.map((b) => b.blockedId));
}
