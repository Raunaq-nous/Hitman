import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const insertEvent = (data: { userId: string | null; name: string; props: Prisma.InputJsonValue }) => prisma.analyticsEvent.create({ data, select: { id: true } });
