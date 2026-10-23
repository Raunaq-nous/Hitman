import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { basePoints, playerPoints, SCORING_VERSION } from "@/lib/scoring";
import { idempotencyKey, scoreMatch } from "@/domain/scoring/service";
import { makeUser, resetDb } from "../../helpers/db";

let matchId: string, teamId: string, userId: string, p1: string, p2: string;
const stats = () => ({ [p1]: { runs: 52, fours: 4, sixes: 2, wickets: 0, catches: 1, runOuts: 0 }, [p2]: { runs: 3, wickets: 4 } });

beforeAll(async () => {
  await resetDb();
  userId = (await makeUser()).id;
  matchId = (await prisma.match.create({ data: { team1: "AAA", team2: "BBB", date: new Date("2024-04-01T14:00:00Z"), status: "IN_PROGRESS" } })).id;
  p1 = (await prisma.player.create({ data: { name: "P One", team: "AAA", role: "BATSMAN" } })).id;
  p2 = (await prisma.player.create({ data: { name: "P Two", team: "BBB", role: "BOWLER" } })).id;
  teamId = (await prisma.fantasyTeam.create({ data: { userId, matchId, captainId: p1, viceCaptainId: p2, players: { create: [{ playerId: p1 }, { playerId: p2 }] } } })).id;
});

describe("scoring ledger: append-only, versioned, idempotent", () => {
  it("writes one versioned event per scored pick and derives the team total from the ledger", async () => {
    const r = await scoreMatch({ matchId, stats: stats() });
    expect(r).toEqual({ teams: 1, eventsWritten: 2, eventsAlreadyPresent: 0, scoringVersion: SCORING_VERSION });
    const events = await prisma.scoringEvent.findMany({ where: { fantasyTeamId: teamId }, orderBy: { playerId: "asc" } });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.configVersion === SCORING_VERSION)).toBe(true);
    expect(events.map((e) => e.idempotencyKey).sort()).toEqual([idempotencyKey(matchId, teamId, p1, SCORING_VERSION), idempotencyKey(matchId, teamId, p2, SCORING_VERSION)].sort());
    const expected = playerPoints({ runs: 52, fours: 4, sixes: 2, wickets: 0, catches: 1, runOuts: 0 }, "captain") + playerPoints({ runs: 3, fours: 0, sixes: 0, wickets: 4, catches: 0, runOuts: 0 }, "vice");
    expect((await prisma.fantasyTeam.findUniqueOrThrow({ where: { id: teamId } })).totalPoints).toBe(expected);
  });

  it("re-running scoring produces no duplicates and awards XP once", async () => {
    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp;
    const r = await scoreMatch({ matchId, stats: stats() });
    expect(r).toMatchObject({ eventsWritten: 0, eventsAlreadyPresent: 2 });
    await Promise.all([scoreMatch({ matchId, stats: stats() }), scoreMatch({ matchId, stats: stats() })]);
    expect(await prisma.scoringEvent.count({ where: { matchId } })).toBe(2);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(xpBefore);
  });

  it("a new config version appends new events and the total follows the latest version", async () => {
    const r = await scoreMatch({ matchId, stats: stats() }, SCORING_VERSION + 1);
    expect(r.eventsWritten).toBe(2);
    expect(await prisma.scoringEvent.count({ where: { matchId } })).toBe(4);
    expect(await prisma.scoringEvent.count({ where: { matchId, configVersion: SCORING_VERSION } })).toBe(2);
  });

  it("the database refuses to update or delete ledger rows", async () => {
    const e = await prisma.scoringEvent.findFirstOrThrow({ where: { matchId } });
    await expect(prisma.scoringEvent.update({ where: { id: e.id }, data: { points: 999 } })).rejects.toThrow(/append-only/);
    await expect(prisma.scoringEvent.delete({ where: { id: e.id } })).rejects.toThrow(/append-only/);
  });

  it("rejects invalid stat lines and unknown matches without writing", async () => {
    await expect(scoreMatch({ matchId, stats: { [p1]: { runs: -1 } } })).rejects.toMatchObject({ code: "INVALID" });
    await expect(scoreMatch({ matchId: "nope", stats: stats() })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.scoringEvent.count({ where: { matchId } })).toBe(4);
  });

  it("base points follow the versioned config", () => {
    expect(basePoints({ runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0, runOuts: 0 })).toBe(0);
    expect(typeof SCORING_VERSION).toBe("number");
  });
});
