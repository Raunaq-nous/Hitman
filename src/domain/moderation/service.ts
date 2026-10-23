// Moderation basics: report a member, block someone, owner removes members and hands the crew over.
import { DomainError } from "@/domain/shared/types";
import { getCrewForMember, removeMember, requireMembership, transferOwnership } from "@/domain/crews/service";
import type { ReportDTO, ReportInput } from "./types";
import * as repo from "./repo";

export async function reportMember(reporterId: string, crewId: string, input: ReportInput): Promise<{ id: string }> {
  await requireMembership(reporterId, crewId);
  if (input.userId === reporterId) throw new DomainError("INVALID", "You can’t report yourself.");
  await requireMembership(input.userId, crewId).catch(() => {
    throw new DomainError("NOT_FOUND", "That person isn’t in this crew.");
  });
  return repo.insertReport({ crewId, reporterId, reportedId: input.userId, reason: input.reason, note: input.note ?? null });
}

/** Open reports for a crew, owner only. */
export async function listReports(ownerId: string, crewId: string): Promise<ReportDTO[]> {
  const crew = await getCrewForMember(ownerId, crewId);
  if (!crew.isOwner) throw new DomainError("FORBIDDEN", "Only the crew owner can see reports.");
  const rows = await repo.openReports(crewId);
  const nameOf = new Map((await repo.names(rows.flatMap((r) => [r.reporterId, r.reportedId]))).map((u) => [u.id, u.name]));
  return rows.map((r) => ({ id: r.id, reporterName: nameOf.get(r.reporterId) ?? "Former member", reportedName: nameOf.get(r.reportedId) ?? "Former member", reason: r.reason, note: r.note, createdAt: r.createdAt.toISOString() }));
}

export async function resolveReport(ownerId: string, crewId: string, reportId: string): Promise<void> {
  const crew = await getCrewForMember(ownerId, crewId);
  if (!crew.isOwner) throw new DomainError("FORBIDDEN", "Only the crew owner can resolve reports.");
  if ((await repo.resolveReport(reportId, crewId)).count === 0) throw new DomainError("NOT_FOUND", "Report not found.");
}

/** Block: hides the blocked person from you, keeps them out of crews you own (and removes them from those crews). */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) throw new DomainError("INVALID", "You can’t block yourself.");
  if (!(await repo.userExists(blockedId))) throw new DomainError("NOT_FOUND", "User not found.");
  await repo.insertBlock(blockerId, blockedId);
  for (const crewId of await repo.ownedCrewIds(blockerId)) {
    await removeMember(blockerId, crewId, blockedId).catch(() => undefined);
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await repo.deleteBlock(blockerId, blockedId);
}

export const blockedIds = (userId: string): Promise<string[]> => repo.blockedBy(userId);

export async function handOver(ownerId: string, crewId: string, newOwnerId: string): Promise<void> {
  await transferOwnership(ownerId, crewId, newOwnerId);
}
