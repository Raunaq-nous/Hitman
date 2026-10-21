import { prisma } from "@/lib/prisma";

export const savePreferences = (userId: string, favouriteSports: string[], language: string) =>
  prisma.user.update({ where: { id: userId }, data: { favouriteSports, language }, select: { favouriteSports: true, language: true } });
export const loadPreferences = (userId: string) => prisma.user.findUnique({ where: { id: userId }, select: { favouriteSports: true, language: true } });
