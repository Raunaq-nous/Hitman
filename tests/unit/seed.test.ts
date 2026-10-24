import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedFixtures } from "../../scripts/db-seed";
import { resetDb } from "../helpers/db";

beforeAll(async () => { await resetDb(); });

// The committed real fixtures (data/fixtures/{cricsheet,statsbomb,openf1}); no invented rows (seed).
describe("seeding the committed fixtures (seed)", () => {
  it("ingests every committed real fixture through the adapters, and a second run adds nothing", async () => {
    const lines: string[] = [];
    const first = await seedFixtures((l) => lines.push(l));
    expect(first.get("cricket")?.events).toBe(7);
    expect(first.get("cricket")?.incidents).toBeGreaterThan(1000);
    expect([...first.values()].every((s) => s.incidents > 0)).toBe(true);
    expect(lines.some((l) => l.startsWith("seed: basketball not seeded"))).toBe(true);
    const events = await prisma.event.count();
    const again = await seedFixtures(() => undefined);
    expect([...again.values()].every((s) => s.incidents === 0)).toBe(true);
    expect(await prisma.event.count()).toBe(events);
    // no users or invented matches are created
    expect(await prisma.user.count()).toBe(0);
  });
});
