// Ingest Cricsheet JSON files into the incident store.
//   tsx scripts/ingest-cricsheet.ts [--from data/raw/cricsheet/ipl_json]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { ingestEvent } from "@/domain/facts/ingest";
import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  const i = process.argv.indexOf("--from");
  const dir = i > 0 ? process.argv[i + 1] : "data/raw/cricsheet/ipl_json";
  const files = readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort();
  let events = 0, incidents = 0;
  for (const f of files) {
    const r = await ingestEvent(parseCricsheet(JSON.parse(readFileSync(join(dir, f), "utf8")), f.replace(/\.json$/, "")));
    events++;
    incidents += r.incidentsAdded;
  }
  console.log(`cricsheet ingest: ${events} matches, ${incidents} new ball incidents from ${dir} (attribution: Data from Cricsheet (cricsheet.org))`);
  await prisma.$disconnect();
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
