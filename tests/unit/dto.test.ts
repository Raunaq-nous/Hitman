import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/domain/users/types";
import { createCrew, getCrewForMember, joinCrew, listMyCrews } from "@/domain/crews/service";
import { contestEntries, crewStandings } from "@/domain/contests/service";
import { makeUser, resetDb } from "../helpers/db";

const LEAK = /password|\$2[aby]\$|@test\.local|"email"/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe("dto: no Prisma model or password hash crosses the server boundary", () => {
  it("toPublicUser drops password and email even when given a full row", () => {
    const row = { id: "u1", name: "Asha", avatar: null, xp: 3, email: "a@x.com", password: "$2b$10$hash" };
    const dto = toPublicUser(row);
    expect(Object.keys(dto).sort()).toEqual(["avatar", "id", "name", "xp"]);
    expect(JSON.stringify(dto)).not.toMatch(LEAK);
  });

  describe("serialised payloads from services", () => {
    let a: { id: string }, b: { id: string }, crewId: string, matchId: string;
    beforeAll(async () => {
      await resetDb();
      a = await makeUser("Asha"); b = await makeUser("Bilal");
      crewId = (await createCrew(a.id, "Night Owls")).id;
      const code = (await prisma.league.findUniqueOrThrow({ where: { id: crewId } })).inviteCode;
      await joinCrew(b.id, code);
      const match = await prisma.match.create({ data: { team1: "AAA", team2: "BBB", date: new Date("2024-04-01T14:00:00Z"), status: "COMPLETED" } });
      matchId = match.id;
      await prisma.fantasyTeam.create({ data: { userId: b.id, matchId, captainId: "c", viceCaptainId: "v", totalPoints: 42 } });
    });

    it("crew detail, crew list, contest entries and standings never contain password fields", async () => {
      const payloads = [
        await getCrewForMember(a.id, crewId),
        await listMyCrews(a.id),
        await contestEntries(a.id, crewId, matchId),
        await crewStandings(a.id, crewId),
      ];
      for (const p of payloads) expect(JSON.stringify(p)).not.toMatch(LEAK);
      const detail = payloads[0] as Awaited<ReturnType<typeof getCrewForMember>>;
      expect(detail.members.map((m) => m.user.name)).toEqual(["Asha", "Bilal"]);
      expect((payloads[3] as Awaited<ReturnType<typeof crewStandings>>)[0]).toMatchObject({ user: { name: "Bilal" }, points: 42 });
    });
  });

  it("no route or component selects whole user rows (include user: true)", () => {
    const offenders = [...files("src/app"), ...files("src/components"), ...files("src/domain")]
      .filter((f) => /\buser:\s*true\b|include:\s*\{\s*user\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
