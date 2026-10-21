import { beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/domain/shared/types";
import { submitTeam } from "@/domain/contests/service";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({
  requireUserId: async () => {
    if (!current) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
    return current;
  },
}));

const ROLES = ["WICKETKEEPER", "BATSMAN", "BATSMAN", "BATSMAN", "BATSMAN", "ALL_ROUNDER", "ALL_ROUNDER", "BOWLER", "BOWLER", "BOWLER", "BOWLER"];
let matchId: string, playerIds: string[];

beforeAll(async () => {
  await resetDb();
  matchId = (await prisma.match.create({ data: { team1: "AAA", team2: "BBB", date: new Date("2030-04-01T14:00:00Z") } })).id;
  playerIds = [];
  for (const [i, role] of ROLES.entries()) {
    playerIds.push((await prisma.player.create({ data: { name: `Test Player ${i}`, team: i % 2 ? "AAA" : "BBB", role, credits: 9 } })).id);
  }
});

const entry = () => ({ matchId, playerIds, captainId: playerIds[0], viceCaptainId: playerIds[1] });

describe("unique: one team per user per match", () => {
  it("the database rejects a second team for the same user and match", async () => {
    const u = await makeUser();
    await prisma.fantasyTeam.create({ data: { userId: u.id, matchId, captainId: "c", viceCaptainId: "v" } });
    await expect(prisma.fantasyTeam.create({ data: { userId: u.id, matchId, captainId: "c", viceCaptainId: "v" } }))
      .rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("the service turns a duplicate into a clear 409 conflict", async () => {
    const u = await makeUser();
    await expect(submitTeam(u.id, entry())).resolves.toHaveProperty("teamId");
    await expect(submitTeam(u.id, entry())).rejects.toMatchObject({ code: "CONFLICT", status: 409, message: expect.stringMatching(/already submitted a team/) });
  });

  it("two concurrent submits produce exactly one team", async () => {
    const u = await makeUser();
    const results = await Promise.allSettled([submitTeam(u.id, entry()), submitTeam(u.id, entry()), submitTeam(u.id, entry())]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.fantasyTeam.count({ where: { userId: u.id, matchId } })).toBe(1);
  });

  it("the API returns 409 with a readable message", async () => {
    const { POST } = await import("@/app/api/team/route");
    current = (await makeUser()).id;
    const send = () => POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify(entry()) }));
    expect((await send()).status).toBe(201);
    const dup = await send();
    expect(dup.status).toBe(409);
    expect(await dup.json()).toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/one team per match/) });
  });
});
