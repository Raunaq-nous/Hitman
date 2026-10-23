import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { answer, plan } from "@/domain/planner/service";
import { createCrew, joinCrew } from "@/domain/crews/service";
import { makeUser, resetDb } from "../../helpers/db";

describe("query planner: routing", () => {
  it("routes known shapes to structured queries and the rest to retrieval", () => {
    expect(plan("Who is in Night Owls?")).toEqual({ kind: "structured", intent: "crew_members", crewName: "Night Owls" });
    expect(plan("who's leading my crew Night Owls")).toEqual({ kind: "structured", intent: "crew_leader", crewName: "Night Owls" });
    expect(plan("Which crews am I in?")).toEqual({ kind: "structured", intent: "my_crews" });
    expect(plan("Why did the chase collapse?")).toEqual({ kind: "retrieval", query: "Why did the chase collapse?" });
    expect(plan("   ")).toMatchObject({ kind: "unsupported" });
    expect(plan("x".repeat(301))).toMatchObject({ kind: "unsupported" });
  });
});

describe("query planner: answers from the database, phrased by the verified contract", () => {
  let asha: { id: string }, bilal: { id: string }, outsider: { id: string };
  beforeAll(async () => {
    await resetDb();
    asha = await makeUser("Asha"); bilal = await makeUser("Bilal"); outsider = await makeUser("Chen");
    const { id } = await createCrew(asha.id, "Night Owls");
    await joinCrew(bilal.id, (await prisma.crew.findUniqueOrThrow({ where: { id } })).inviteCode);
  });

  it("answers structured questions with sourced sentences", async () => {
    const r = await answer(asha.id, "Who is in Night Owls?");
    expect(r.sentences).toEqual(["Night Owls has 2: Asha, Bilal."]);
    expect(r.sources).toEqual(["alterego"]);
    expect((await answer(bilal.id, "Which crews am I in?")).sentences).toEqual(["You’re in 1: Night Owls."]);
  });

  it("is honest when there is nothing to say, and never reveals crews you're not in", async () => {
    expect((await answer(asha.id, "Who is leading Night Owls?")).honestEmpty).toMatch(/No completed matches/);
    expect(await answer(outsider.id, "Who is in Night Owls?")).toMatchObject({ sentences: [], honestEmpty: expect.stringMatching(/not in a crew called/) });
    expect((await answer(outsider.id, "Which crews am I in?")).honestEmpty).toMatch(/not in any crews/);
  });

  it("open questions don't reach a model without indexed sources", async () => {
    expect(await answer(asha.id, "Why did the chase collapse?")).toMatchObject({ plan: { kind: "retrieval" }, sentences: [], honestEmpty: expect.stringMatching(/aren’t indexed yet/) });
  });

  it("leader answers come from scored completed matches", async () => {
    const match = await prisma.match.create({ data: { team1: "AAA", team2: "BBB", date: new Date("2024-04-01T14:00:00Z"), status: "COMPLETED" } });
    await prisma.fantasyTeam.create({ data: { userId: bilal.id, matchId: match.id, captainId: "c", viceCaptainId: "v", totalPoints: 57 } });
    expect((await answer(asha.id, "Who is leading Night Owls?")).sentences).toEqual(["Bilal leads with 57 points."]);
  });
});
