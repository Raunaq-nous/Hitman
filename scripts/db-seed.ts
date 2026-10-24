// Seed the local database. Only real, sourced data may be seeded: no invented players, scores or users.
// The committed fixtures (Cricsheet IPL matches, StatsBomb open data, OpenF1 laps) are ingested into the incident
// store through the same adapters and rights checks the app uses. Idempotent: running it again adds nothing.
//   npm run db:seed
import { replays } from "@/domain/desk/service";
import { ingestEvent } from "@/domain/facts/ingest";
import { prisma } from "@/lib/prisma";

/** Ingest every committed fixture the rights allow; returns what was added per sport. */
export async function seedFixtures(log: (line: string) => void = console.log): Promise<Map<string, { events: number; incidents: number }>> {
  const { events, pending } = replays();
  const bySport = new Map<string, { events: number; incidents: number }>();
  for (const e of events) {
    const r = await ingestEvent(e);
    const s = bySport.get(e.sport) ?? { events: 0, incidents: 0 };
    bySport.set(e.sport, { events: s.events + 1, incidents: s.incidents + r.incidentsAdded });
  }
  for (const [sport, s] of bySport) log(`seed: ${sport} ${s.events} events, ${s.incidents} new incidents (committed fixtures)`);
  for (const p of pending) log(`seed: ${p.sport} not seeded — ${p.reason}`);
  log(`seed: ${await prisma.event.count()} events and ${await prisma.incident.count()} incidents in the store`);
  return bySport;
}

if (process.argv[1]?.endsWith("db-seed.ts")) {
  seedFixtures()
    .catch((e: unknown) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
