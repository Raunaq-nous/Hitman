// Crew rules: private by default, joined by invite code or link. Membership is checked here, so every page and API that goes through the service is protected.
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { DomainError } from "@/domain/shared/types";
import { toPublicUser } from "@/domain/users/types";
import type { CrewDetailDTO, CrewSummaryDTO } from "./types";
import * as repo from "./repo";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newInviteCode = (): string => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** Non-members get NOT_FOUND (404) so a crew's existence never leaks. */
export async function requireMembership(userId: string, crewId: string): Promise<void> {
  if (!(await repo.findMembership(userId, crewId))) throw new DomainError("NOT_FOUND", "Crew not found.");
}

export async function getCrewForMember(userId: string, crewId: string): Promise<CrewDetailDTO> {
  const crew = await repo.findCrewWithMembers(crewId);
  if (!crew || !crew.members.some((m) => m.userId === userId)) throw new DomainError("NOT_FOUND", "Crew not found.");
  const blocked = new Set(await repo.blockedIdsFor(userId));
  // people you blocked stay in shared crews you don't own, but you never see their name
  const shown = (u: { id: string; name: string; avatar: string | null; xp: number }) => (blocked.has(u.id) ? { ...u, name: "Blocked member", avatar: null } : u);
  return {
    id: crew.id,
    name: crew.name,
    inviteCode: crew.inviteCode,
    isOwner: crew.ownerId === userId,
    members: crew.members.map((m) => ({ user: toPublicUser(shown(m.user)), joinedAt: m.joinedAt.toISOString(), isOwner: m.userId === crew.ownerId })),
  };
}

export async function listMyCrews(userId: string): Promise<CrewSummaryDTO[]> {
  const rows = await repo.listCrewsForUser(userId);
  return rows.map((c) => ({ id: c.id, name: c.name, memberCount: c._count.members, isOwner: c.ownerId === userId }));
}

export async function memberIds(userId: string, crewId: string): Promise<string[]> {
  await requireMembership(userId, crewId);
  return repo.listMemberIds(crewId);
}

/** Retry on the (rare) invite-code collision. */
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn(newInviteCode());
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new DomainError("CONFLICT", "Couldn’t create a unique invite code. Try again.");
}

export async function createCrew(userId: string, name: string): Promise<{ id: string }> {
  return withFreshCode((code) => repo.insertCrew(userId, name, code));
}

async function requireOwner(userId: string, crewId: string): Promise<{ id: string; ownerId: string }> {
  const crew = await repo.findCrew(crewId);
  if (!crew || !(await repo.findMembership(userId, crewId))) throw new DomainError("NOT_FOUND", "Crew not found.");
  if (crew.ownerId !== userId) throw new DomainError("FORBIDDEN", "Only the crew owner can do that.");
  return crew;
}

/** Leave a crew. The owner must hand over first, unless they're the last member (then the crew is deleted). */
export async function leaveCrew(userId: string, crewId: string): Promise<{ deleted: boolean }> {
  const crew = await repo.findCrew(crewId);
  if (!crew || !(await repo.findMembership(userId, crewId))) throw new DomainError("NOT_FOUND", "Crew not found.");
  if (crew.ownerId === userId) {
    if ((await repo.countMembers(crewId)) > 1) throw new DomainError("CONFLICT", "Hand the crew to another member before you leave.");
    await repo.deleteCrew(crewId);
    return { deleted: true };
  }
  await repo.deleteMember(userId, crewId);
  return { deleted: false };
}

/** Owner removes a member. */
export async function removeMember(ownerId: string, crewId: string, memberId: string): Promise<void> {
  await requireOwner(ownerId, crewId);
  if (memberId === ownerId) throw new DomainError("INVALID", "Owners can’t remove themselves; hand the crew over first.");
  if (!(await repo.findMembership(memberId, crewId))) throw new DomainError("NOT_FOUND", "That person isn’t in this crew.");
  await repo.deleteMember(memberId, crewId);
}

/** Owner rotates the invite code; old links and codes stop working. */
export async function rotateInviteCode(ownerId: string, crewId: string): Promise<{ inviteCode: string }> {
  await requireOwner(ownerId, crewId);
  return withFreshCode((code) => repo.setInviteCode(crewId, code));
}

/** Owner hands the crew to another member. */
export async function transferOwnership(ownerId: string, crewId: string, newOwnerId: string): Promise<void> {
  await requireOwner(ownerId, crewId);
  if (!(await repo.findMembership(newOwnerId, crewId))) throw new DomainError("NOT_FOUND", "That person isn’t in this crew.");
  await repo.setOwner(crewId, newOwnerId);
}

export async function joinCrew(userId: string, inviteCode: string): Promise<{ id: string; name: string }> {
  const crew = await repo.findCrewByCode(inviteCode);
  if (!crew) throw new DomainError("NOT_FOUND", "No crew has that invite code.");
  // a blocked person gets the same answer as a wrong code
  if (await repo.isBlockedBy(crew.ownerId, userId)) throw new DomainError("NOT_FOUND", "No crew has that invite code.");
  try {
    await repo.insertMember(userId, crew.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DomainError("CONFLICT", "You’re already in this crew.");
    throw e;
  }
  return { id: crew.id, name: crew.name };
}

/** For invite links: join, or just open the crew if already a member (links can be followed twice). */
export async function joinOrOpen(userId: string, inviteCode: string): Promise<{ id: string; joined: boolean }> {
  const crew = await repo.findCrewByCode(inviteCode);
  if (!crew) throw new DomainError("NOT_FOUND", "No crew has that invite code.");
  if (await repo.findMembership(userId, crew.id)) return { id: crew.id, joined: false };
  return { id: (await joinCrew(userId, inviteCode)).id, joined: true };
}
