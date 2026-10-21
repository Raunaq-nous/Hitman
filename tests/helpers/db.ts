// Helpers for integration tests that hit the "vitest" schema (see tests/setup/db.global.ts).
import { prisma } from "@/lib/prisma";

/** Empty every table except migrations and seeded reference data (the five sports). */
export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename NOT IN ('_prisma_migrations', 'Sport')`;
  if (rows.length === 0) return;
  await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

let n = 0;
/** Create a user with a (fake) bcrypt-shaped hash so tests can prove it never leaks. */
export async function makeUser(name = `Fan ${++n}`): Promise<{ id: string; name: string; email: string }> {
  return prisma.user.create({
    data: { name, email: `${name.toLowerCase().replace(/\s+/g, ".")}.${n}.${Date.now()}@test.local`, password: "$2b$10$SECRETHASHSHOULDNEVERLEAKxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    select: { id: true, name: true, email: true },
  });
}
