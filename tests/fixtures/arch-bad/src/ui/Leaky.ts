// Deliberately bad: UI importing the Prisma client.
import { PrismaClient } from "@prisma/client";
export const client = (): PrismaClient => new PrismaClient();
