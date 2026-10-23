import { prisma } from "@/lib/prisma";

export const latestIncidentBySource = () => prisma.incident.groupBy({ by: ["sourceId"], _max: { observedAt: true }, _count: { _all: true } });
export const correctionCount = () => prisma.incident.count({ where: { supersedesId: { not: null } } });
export const llmStats = (since: Date) => prisma.llmCall.findMany({ where: { createdAt: { gte: since } }, select: { provider: true, verified: true, costUsd: true } });
export const userCount = () => prisma.user.count();
