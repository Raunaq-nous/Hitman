import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStateAt } from "@/domain/facts/service";
import { resetDb } from "../../helpers/db";

// Synthetic test incidents (not real match data) exercising the bitemporal rules.
const start = new Date("2024-04-01T14:00:00Z");
const sec = (n: number) => new Date(start.getTime() + n * 1000);
let eventId: string;

async function ball(t: number, payload: Record<string, unknown>, observedAfterSec: number, extra: Record<string, unknown> = {}) {
  return prisma.incident.create({ data: { eventId, t, type: "ball", payload: payload as object, sourceId: "cricsheet", sourceRef: `test:${t}:${observedAfterSec}:${Math.random()}`, sourceClass: "VERIFIED_DELAYED", rightsPolicyId: "cricsheet", effectiveAt: sec(t * 30), observedAt: sec(t * 30 + observedAfterSec), ...extra } });
}

beforeAll(async () => {
  await resetDb();
  const comp = await prisma.competition.create({ data: { sportId: "cricket", slug: "leak", name: "Leakage test" } });
  const season = await prisma.season.create({ data: { competitionId: comp.id, label: "test" } });
  eventId = (await prisma.event.create({ data: { seasonId: season.id, sourceId: "cricsheet", sourceRef: "leak-1", name: "Test", startsAt: start, rightsPolicyId: "cricsheet" } })).id;
  await ball(1, { runs: 1 }, 5);
  await ball(2, { runs: 4 }, 5);
  await ball(3, { runs: 0, extras: 1, extraType: "wides" }, 5);
  await ball(3, { runs: 0, wicket: true }, 5);
});

describe("bitemporal reads and leakage", () => {
  it("getStateAt folds legal balls, runs (incl. extras) and wickets as known at the cutoff", async () => {
    expect(await getStateAt(eventId, sec(200), sec(200))).toMatchObject({ legalBalls: 3, runs: 6, wickets: 1, sources: ["cricsheet"] });
    expect(await getStateAt(eventId, sec(60), sec(66))).toMatchObject({ legalBalls: 2, runs: 5, wickets: 0 });
    expect(await getStateAt(eventId, sec(60), sec(60))).toMatchObject({ legalBalls: 1, runs: 1 });
  });

  it("an injected post-cutoff incident has no effect on the state at the cutoff", async () => {
    const cutoff = sec(100);
    const before = await getStateAt(eventId, sec(1000), cutoff);
    await ball(4, { runs: 6 }, 5); // happens and is observed after the cutoff
    await ball(2, { runs: 6 }, 900); // effective before the cutoff, but only observed later (late data)
    expect(await getStateAt(eventId, sec(1000), cutoff)).toEqual(before);
  });

  it("a correction applies only from when it was observed", async () => {
    const original = await prisma.incident.findFirstOrThrow({ where: { eventId, t: 1 } });
    await ball(1, { runs: 2 }, 400, { supersedesId: original.id });
    expect((await getStateAt(eventId, sec(1000), sec(100))).runs).toBe(6);
    expect((await getStateAt(eventId, sec(1000), sec(2000))).runs).toBeGreaterThan(6);
  });

  it("sources we may not display are excluded", async () => {
    await prisma.incident.create({ data: { eventId, t: 5, type: "ball", payload: { runs: 4 }, sourceId: "unlicensed-feed", sourceRef: "uf:5", sourceClass: "VERIFIED_DELAYED", rightsPolicyId: "none", effectiveAt: sec(150), observedAt: sec(151) } });
    expect((await getStateAt(eventId, sec(200), sec(200))).sources).toEqual(["cricsheet"]);
  });
});
