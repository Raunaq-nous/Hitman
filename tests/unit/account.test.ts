import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteMyAccount, exportMyData } from "@/domain/account/service";
import { createCrew, joinCrew } from "@/domain/crews/service";
import { blockUser, reportMember } from "@/domain/moderation/service";
import { scoreMatch } from "@/domain/scoring/service";
import { track } from "@/domain/analytics/service";
import { makeUser, resetDb } from "../helpers/db";

let leaver: { id: string; email: string }, friend: { id: string }, crewId: string, soloCrew: string;

beforeAll(async () => {
  await resetDb();
  leaver = await makeUser("Leaver"); friend = await makeUser("Friend");
  crewId = (await createCrew(leaver.id, "Shared")).id;
  soloCrew = (await createCrew(leaver.id, "Solo")).id;
  await joinCrew(friend.id, (await prisma.crew.findUniqueOrThrow({ where: { id: crewId } })).inviteCode);
  await reportMember(friend.id, crewId, { userId: leaver.id, reason: "spam" });
  await blockUser(friend.id, leaver.id).catch(() => undefined);
  const match = await prisma.match.create({ data: { team1: "A", team2: "B", date: new Date("2024-01-01"), status: "IN_PROGRESS" } });
  const p = await prisma.player.create({ data: { name: "P", team: "A", role: "BATSMAN" } });
  await prisma.fantasyTeam.create({ data: { userId: leaver.id, matchId: match.id, captainId: p.id, viceCaptainId: p.id, players: { create: [{ playerId: p.id }] } } });
  await scoreMatch({ matchId: match.id, stats: { [p.id]: { runs: 10 } } });
  await track("receipt_opened", { sourceId: "cricsheet", surface: "desk" }, leaver.id);
});

describe("account: export my data", () => {
  it("exports everything held about the user as JSON, without the password hash", async () => {
    const data = await exportMyData(leaver.id);
    expect(data).toMatchObject({ format: "alter-ego-export-v1", user: { email: leaver.email, name: "Leaver" } });
    expect((data.ownedCrews as unknown[]).length).toBe(2);
    expect((data.teams as unknown[]).length).toBe(1);
    expect((data.scoring as unknown[]).length).toBe(1);
    expect((data.events as unknown[]).length).toBe(1);
    expect(JSON.stringify(data)).not.toMatch(/password|\$2[aby]\$/);
  });
});

describe("account: delete my account", () => {
  it("hard-deletes the user and their rows, hands shared crews over and removes solo crews", async () => {
    await deleteMyAccount(leaver.id);
    expect(await prisma.user.findUnique({ where: { id: leaver.id } })).toBeNull();
    for (const n of [
      await prisma.crewMember.count({ where: { userId: leaver.id } }),
      await prisma.fantasyTeam.count({ where: { userId: leaver.id } }),
      await prisma.scoringEvent.count({ where: { userId: leaver.id } }),
      await prisma.analyticsEvent.count({ where: { userId: leaver.id } }),
      await prisma.crewReport.count({ where: { reportedId: leaver.id } }),
      await prisma.userBlock.count({ where: { blockedId: leaver.id } }),
    ]) expect(n).toBe(0);
    expect((await prisma.crew.findUniqueOrThrow({ where: { id: crewId } })).ownerId).toBe(friend.id);
    expect(await prisma.crew.findUnique({ where: { id: soloCrew } })).toBeNull();
  });

  it("outside an erasure the ledger is still append-only", async () => {
    await expect(prisma.$executeRaw`DELETE FROM "ScoringEvent"`).resolves.toBe(0);
    const u = await makeUser();
    const match = await prisma.match.create({ data: { team1: "C", team2: "D", date: new Date("2024-01-02"), status: "IN_PROGRESS" } });
    const p = await prisma.player.create({ data: { name: "Q", team: "C", role: "BATSMAN" } });
    await prisma.fantasyTeam.create({ data: { userId: u.id, matchId: match.id, captainId: p.id, viceCaptainId: p.id, players: { create: [{ playerId: p.id }] } } });
    await scoreMatch({ matchId: match.id, stats: { [p.id]: { runs: 4 } } });
    await expect(prisma.scoringEvent.deleteMany({ where: { userId: u.id } })).rejects.toThrow(/append-only/);
  });
});
