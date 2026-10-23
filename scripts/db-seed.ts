// Seed the local database. Only real, sourced data may be seeded: no invented players, scores or users.
// Historical cricket comes from Cricsheet via `npm run data:cricsheet` and the ingest (feature F-D-03).
import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const [users, matches] = await Promise.all([prisma.user.count(), prisma.match.count()]);
    console.log(`seed: nothing to insert yet (users=${users}, matches=${matches}); data arrives through ingest`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
