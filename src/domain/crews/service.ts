// Crew rules. Membership is checked here, so every page and API that goes through the service is protected.
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
  return {
    id: crew.id,
    name: crew.name,
    inviteCode: crew.inviteCode,
    isOwner: crew.ownerId === userId,
    members: crew.members.map((m) => ({ user: toPublicUser(m.user), joinedAt: m.joinedAt.toISOString(), isOwner: m.userId === crew.ownerId })),
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

export async function createCrew(userId: string, name: string): Promise<{ id: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await repo.insertCrew(userId, name, newInviteCode());
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new DomainError("CONFLICT", "Couldn’t create a unique invite code. Try again.");
}

export async function joinCrew(userId: string, inviteCode: string): Promise<{ id: string; name: string }> {
  const crew = await repo.findCrewByCode(inviteCode);
  if (!crew) throw new DomainError("NOT_FOUND", "No crew has that invite code.");
  try {
    await repo.insertMember(userId, crew.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DomainError("CONFLICT", "You’re already in this crew.");
    throw e;
  }
  return { id: crew.id, name: crew.name };
}
