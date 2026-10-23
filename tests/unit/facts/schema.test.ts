import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { incidentInput, SPORTS } from "@/domain/facts/types";
import { resetDb } from "../../helpers/db";

let eventId: string;
const base = { t: 1, type: "ball", payload: { runs: 1 }, sourceId: "test", sourceClass: "VERIFIED_DELAYED", rightsPolicyId: "test", effectiveAt: new Date("2024-01-01T10:00:00Z"), observedAt: new Date("2024-01-01T10:00:05Z") };

beforeAll(async () => {
  await resetDb();
  const comp = await prisma.competition.create({ data: { sportId: "cricket", slug: "test-league", name: "Test League" } });
  const season = await prisma.season.create({ data: { competitionId: comp.id, label: "2024" } });
  eventId = (await prisma.event.create({ data: { seasonId: season.id, sourceId: "test", sourceRef: "e1", name: "A v B", startsAt: new Date("2024-01-01T10:00:00Z"), rightsPolicyId: "test" } })).id;
});

describe("multi-sport domain schema", () => {
  it("seeds the five sports", async () => {
    expect((await prisma.sport.findMany({ orderBy: { id: "asc" } })).map((s) => s.id)).toEqual([...SPORTS].sort());
  });

  it("stores incidents with both clocks, source and rights", async () => {
    const i = await prisma.incident.create({ data: { ...base, eventId, sourceRef: "e1:1" } });
    expect(i).toMatchObject({ t: 1, sourceClass: "VERIFIED_DELAYED", rightsPolicyId: "test" });
    expect(i.observedAt.getTime()).toBeGreaterThan(i.effectiveAt.getTime());
  });

  it("is append-only: updates and deletes are refused; corrections supersede", async () => {
    const original = await prisma.incident.create({ data: { ...base, eventId, sourceRef: "e1:2", t: 2 } });
    await expect(prisma.incident.update({ where: { id: original.id }, data: { t: 3 } })).rejects.toThrow(/append-only/);
    await expect(prisma.incident.delete({ where: { id: original.id } })).rejects.toThrow(/append-only/);
    const fix = await prisma.incident.create({ data: { ...base, eventId, sourceRef: "e1:2:fix", t: 2, payload: { runs: 4 }, supersedesId: original.id } });
    expect((await prisma.incident.findUniqueOrThrow({ where: { id: original.id }, include: { supersededBy: true } })).supersededBy?.id).toBe(fix.id);
    await expect(prisma.incident.create({ data: { ...base, eventId, sourceRef: "e1:2:fix2", supersedesId: original.id } })).rejects.toThrow();
  });

  it("the same source record can't be stored twice", async () => {
    await expect(prisma.incident.create({ data: { ...base, eventId, sourceRef: "e1:1" } })).rejects.toThrow();
  });

  it("parses adapter output at the boundary", () => {
    expect(incidentInput.parse({ ...base, sourceRef: "x" })).toMatchObject({ seq: 0, actor: null, supersedesId: null });
    expect(incidentInput.safeParse({ ...base, sourceRef: "x", sourceClass: "RUMOUR" }).success).toBe(false);
  });
});
