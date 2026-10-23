import { PrismaClient } from "@prisma/client";

/** Test-only rows for screens that need a match (e2e never fabricates data shown outside tests). */
export async function seedTestMatch(): Promise<string> {
  const prisma = new PrismaClient();
  try {
    const tag = `${Date.now() % 100000}`;
    const [t1, t2] = [`T${tag}A`, `T${tag}B`];
    const match = await prisma.match.create({ data: { team1: t1, team2: t2, date: new Date(Date.now() + 86_400_000), status: "UPCOMING" } });
    const roles = ["WICKETKEEPER", "BATSMAN", "BATSMAN", "BATSMAN", "ALL_ROUNDER", "BOWLER", "BOWLER"];
    for (const team of [t1, t2]) for (const [i, role] of roles.entries()) await prisma.player.create({ data: { name: `${team} Test Player ${i + 1}`, team, role, credits: 8 } });
    return match.id;
  } finally {
    await prisma.$disconnect();
  }
}
