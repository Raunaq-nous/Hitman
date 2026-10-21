import { prisma } from "@/lib/prisma";

export const findCredentials = (email: string) => prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, password: true } });
export const insertUser = (data: { name: string; email: string; password: string; ageConfirmedAt: Date }) => prisma.user.create({ data, select: { id: true } });
