import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/domain/shared/types";
import { createCrew, getCrewForMember, joinCrew, listMyCrews, memberIds } from "@/domain/crews/service";
import { builderPlayers, contestEntries, crewStandings, getContest, openMatchesForCrew } from "@/domain/contests/service";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({
  currentUserId: async () => current,
  requireUserId: async () => {
    if (!current) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
    return current;
  },
}));

let owner: { id: string }, member: { id: string }, outsider: { id: string }, crewId: string, matchId: string, code: string;

beforeAll(async () => {
  await resetDb();
  owner = await makeUser("Owner"); member = await makeUser("Member"); outsider = await makeUser("Outsider");
  crewId = (await createCrew(owner.id, "Crew A")).id;
  code = (await prisma.crew.findUniqueOrThrow({ where: { id: crewId } })).inviteCode;
  await joinCrew(member.id, code);
  matchId = (await prisma.match.create({ data: { team1: "AAA", team2: "BBB", date: new Date("2024-04-01T14:00:00Z") } })).id;
});

const notFound = expect.objectContaining({ code: "NOT_FOUND", status: 404 });

describe("authz: crew and contest membership", () => {
  it("members can read the crew and its contests", async () => {
    expect((await getCrewForMember(member.id, crewId)).members).toHaveLength(2);
    expect(await memberIds(member.id, crewId)).toHaveLength(2);
    expect((await getContest(member.id, crewId, matchId)).match.id).toBe(matchId);
    await expect(openMatchesForCrew(member.id, crewId)).resolves.toHaveLength(1);
  });

  it("non-members get 404 on every crew and contest read", async () => {
    for (const call of [
      () => getCrewForMember(outsider.id, crewId),
      () => memberIds(outsider.id, crewId),
      () => openMatchesForCrew(outsider.id, crewId),
      () => getContest(outsider.id, crewId, matchId),
      () => contestEntries(outsider.id, crewId, matchId),
      () => crewStandings(outsider.id, crewId),
      () => builderPlayers(outsider.id, crewId, matchId),
    ]) await expect(call()).rejects.toEqual(notFound);
  });

  it("a crew that doesn't exist looks the same as one you're not in", async () => {
    await expect(getCrewForMember(outsider.id, "does-not-exist")).rejects.toEqual(notFound);
  });

  it("crew lists only show your own crews", async () => {
    expect(await listMyCrews(outsider.id)).toEqual([]);
    expect((await listMyCrews(member.id)).map((c) => c.id)).toEqual([crewId]);
  });

  it("joining twice is a conflict, an unknown code is 404", async () => {
    await expect(joinCrew(member.id, code)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    await expect(joinCrew(outsider.id, "ZZZZZZ")).rejects.toEqual(notFound);
  });

  it("route handlers require a session and scope results to the caller", async () => {
    const { GET, POST } = await import("@/app/api/crews/route");
    current = null;
    expect((await GET()).status).toBe(401);
    current = outsider.id;
    expect(await (await GET()).json()).toEqual({ crews: [] });
    const bad = await POST(new Request("http://x/api/crews", { method: "POST", body: JSON.stringify({ name: "" }) }));
    expect(bad.status).toBe(400);
    const made = await POST(new Request("http://x/api/crews", { method: "POST", body: JSON.stringify({ name: "Outsiders" }) }));
    expect(made.status).toBe(201);
    current = member.id;
    expect((await (await GET()).json()).crews.map((c: { name: string }) => c.name)).toEqual(["Crew A"]);
  });

  it("pages turn a non-member's request into a 404, not a redirect or a leak", async () => {
    const { orNotFound } = await import("@/providers/page");
    await expect(orNotFound(getCrewForMember(outsider.id, crewId))).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });
});
