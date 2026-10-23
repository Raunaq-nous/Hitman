import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { getStateAt } from "@/domain/facts/service";
import { resetDb } from "../../helpers/db";

// Real Cricsheet files fetched by the data-courier workflow (see data/manifest.json).
const FIX = "data/fixtures/cricsheet";
const files = readdirSync(FIX).filter((f) => /^\d+\.json$/.test(f)).sort();
const manifest = JSON.parse(readFileSync("data/manifest.json", "utf8")) as { sources: { sourceId: string; url: string; sha256: string; attribution: string }[]; outputs: { file: string; sha256: string }[] };

describe("cricsheet: real fixtures and attribution", () => {
  it("records the source, hash and attribution for the downloaded archive and every fixture", () => {
    const cs = manifest.sources.find((s) => s.sourceId === "cricsheet");
    expect(cs?.url).toMatch(/^https:\/\/cricsheet\.org\/downloads\/ipl(_male)?_json\.zip$/);
    expect(cs?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(cs?.attribution).toBe("Data from Cricsheet (cricsheet.org)");
    for (const f of files) expect(manifest.outputs.some((o) => o.file === `${FIX}/${f}`)).toBe(true);
    const local = JSON.parse(readFileSync(`${FIX}/MANIFEST.json`, "utf8")) as { attribution: string; files: { file: string }[] };
    expect(local.attribution).toBe("Data from Cricsheet (cricsheet.org)");
    expect(local.files.map((f) => f.file).sort()).toEqual(files);
  });

  it("includes at least 5 matches with a tie and a rain-affected match", () => {
    const outcomes = files.map((f) => parseCricsheet(JSON.parse(readFileSync(`${FIX}/${f}`, "utf8")), f.replace(".json", "")).outcome);
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(outcomes.filter((o) => o.result === "tie")).toHaveLength(1);
    expect(outcomes.some((o) => typeof o.method === "string")).toBe(true);
  });

  describe("ingest script", () => {
    beforeAll(async () => {
      await resetDb();
      // the same script `npm run data:cricsheet` runs after downloading, pointed at the committed fixtures
      execFileSync("npx", ["tsx", "scripts/ingest-cricsheet.ts", "--from", FIX], { env: process.env, stdio: "pipe" });
    }, 120_000);

    it("stores every match as an event with its ball incidents, under the cricsheet rights policy", async () => {
      expect(await prisma.event.count({ where: { sourceId: "cricsheet" } })).toBe(files.length);
      const first = parseCricsheet(JSON.parse(readFileSync(`${FIX}/335982.json`, "utf8")), "335982");
      const ev = await prisma.event.findUniqueOrThrow({ where: { sourceId_sourceRef: { sourceId: "cricsheet", sourceRef: "335982" } } });
      expect(await prisma.incident.count({ where: { eventId: ev.id } })).toBe(first.incidents.length);
      expect(await prisma.incident.count({ where: { rightsPolicyId: { not: "cricsheet" } } })).toBe(0);
    });

    it("the first IPL match reads back: KKR made 222/3 in 20 overs", async () => {
      const ev = await prisma.event.findUniqueOrThrow({ where: { sourceId_sourceRef: { sourceId: "cricsheet", sourceRef: "335982" } } });
      const firstInnings = (await prisma.incident.findMany({ where: { eventId: ev.id } })).filter((i) => (i.payload as { innings: number }).innings === 1);
      const runs = firstInnings.reduce((a, i) => a + (i.payload as { runs: number; extras: number }).runs + (i.payload as { extras: number }).extras, 0);
      const wickets = firstInnings.filter((i) => (i.payload as { wicket: boolean }).wicket).length;
      expect([runs, wickets]).toEqual([222, 3]);
      const end = new Date("2100-01-01");
      expect((await getStateAt(ev.id, end, end)).sources).toEqual(["cricsheet"]);
    });

    it("re-running ingest adds nothing", () => {
      const out = execFileSync("npx", ["tsx", "scripts/ingest-cricsheet.ts", "--from", FIX], { env: process.env, encoding: "utf8" });
      expect(out).toMatch(/0 new ball incidents/);
    });
  });
});
