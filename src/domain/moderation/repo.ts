import { prisma } from "@/lib/prisma";

export const insertReport = (data: { crewId: string; reporterId: string; reportedId: string; reason: string; note: string | null }) => prisma.crewReport.create({ data, select: { id: true } });
export const openReports = (crewId: string) => prisma.crewReport.findMany({ where: { crewId, status: "OPEN" }, orderBy: { createdAt: "asc" } });
export const resolveReport = (id: string, crewId: string) => prisma.crewReport.updateMany({ where: { id, crewId }, data: { status: "RESOLVED" } });
export const names = (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
export const insertBlock = (blockerId: string, blockedId: string) => prisma.userBlock.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, update: {}, create: { blockerId, blockedId } });
export const deleteBlock = (blockerId: string, blockedId: string) => prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
export const blockedBy = (blockerId: string) => prisma.userBlock.findMany({ where: { blockerId }, select: { blockedId: true } }).then((r) => r.map((x) => x.blockedId));
export const ownedCrewIds = (ownerId: string) => prisma.crew.findMany({ where: { ownerId }, select: { id: true } }).then((r) => r.map((c) => c.id));
export const userExists = (id: string) => prisma.user.count({ where: { id } }).then((n) => n > 0);
