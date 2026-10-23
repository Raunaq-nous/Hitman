import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const insertEvent = (data: { userId: string | null; name: string; props: Prisma.InputJsonValue }) => prisma.analyticsEvent.create({ data, select: { id: true } });

/** Every event up to `until` (KPI windows need history for first-seen and retention). */
export const eventsUntil = (until: Date) =>
  prisma.analyticsEvent.findMany({ where: { createdAt: { lt: until } }, select: { userId: true, name: true, props: true, createdAt: true }, orderBy: { createdAt: "asc" } });

export const hasEvent = async (userId: string, name: string): Promise<boolean> => (await prisma.analyticsEvent.count({ where: { userId, name } })) > 0;
