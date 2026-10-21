import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCrew, getCrewForMember, joinCrew, leaveCrew, removeMember, rotateInviteCode } from "@/domain/crews/service";
import { makeUser, resetDb } from "../helpers/db";

let owner: { id: string }, friend: { id: string }, other: { id: string };
beforeAll(async () => {
  await resetDb();
  owner = await makeUser("Owner"); friend = await makeUser("Friend"); other = await makeUser("Other");
});
const code = async (id: string): Promise<string> => (await prisma.crew.findUniqueOrThrow({ where: { id } })).inviteCode;

describe("crews: create, invite, join, leave", () => {
  it("a new crew is private: only the owner is a member; others can't see it without the code", async () => {
    const { id } = await createCrew(owner.id, "Night Owls");
    expect((await getCrewForMember(owner.id, id)).members.map((m) => m.user.name)).toEqual(["Owner"]);
    await expect(getCrewForMember(friend.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await code(id)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("join by code, then leave", async () => {
    const { id } = await createCrew(owner.id, "Leavers");
    await joinCrew(friend.id, await code(id));
    expect((await getCrewForMember(friend.id, id)).members).toHaveLength(2);
    expect(await leaveCrew(friend.id, id)).toEqual({ deleted: false });
    await expect(getCrewForMember(friend.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("owner controls: rotate the code (old one stops working) and remove members; non-owners can't", async () => {
    const { id } = await createCrew(owner.id, "Controlled");
    const old = await code(id);
    await joinCrew(friend.id, old);
    await expect(rotateInviteCode(friend.id, id)).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    await expect(removeMember(friend.id, id, owner.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { inviteCode } = await rotateInviteCode(owner.id, id);
    expect(inviteCode).not.toBe(old);
    await expect(joinCrew(other.id, old)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeMember(owner.id, id, friend.id);
    await expect(getCrewForMember(friend.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeMember(owner.id, id, owner.id)).rejects.toMatchObject({ code: "INVALID" });
    await expect(removeMember(owner.id, id, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(rotateInviteCode(other.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("the owner must hand over before leaving; a last owner leaving deletes the crew", async () => {
    const { id } = await createCrew(owner.id, "Solo");
    await joinCrew(friend.id, await code(id));
    await expect(leaveCrew(owner.id, id)).rejects.toMatchObject({ code: "CONFLICT" });
    await leaveCrew(friend.id, id);
    expect(await leaveCrew(owner.id, id)).toEqual({ deleted: true });
    expect(await prisma.crew.findUnique({ where: { id } })).toBeNull();
  });

  it("legacy leagues were migrated in place to crews with no fee or prize columns", async () => {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name IN ('Crew', 'CrewMember')`;
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(expect.arrayContaining(["inviteCode", "ownerId", "crewId"]));
    expect(names.filter((n) => /fee|prize|wallet|amount|payout/i.test(n))).toEqual([]);
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename LIKE 'League%'`;
    expect(tables).toEqual([]);
  });
});

describe("crews: invite links", () => {
  it("following a link twice opens the crew instead of failing", async () => {
    const { joinOrOpen } = await import("@/domain/crews/service");
    const { id } = await createCrew(owner.id, "Linked");
    const c = await code(id);
    expect(await joinOrOpen(other.id, c)).toEqual({ id, joined: true });
    expect(await joinOrOpen(other.id, c)).toEqual({ id, joined: false });
    await expect(joinOrOpen(other.id, "ZZZZZZ")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
