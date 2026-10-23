import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/domain/shared/types";
import { createCrew, getCrewForMember, joinCrew, leaveCrew, removeMember } from "@/domain/crews/service";
import { blockUser, handOver, listReports, reportMember, resolveReport, unblockUser } from "@/domain/moderation/service";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({
  currentUserId: async () => current,
  requireUserId: async () => {
    if (!current) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
    return current;
  },
}));

let owner: { id: string }, a: { id: string }, b: { id: string }, outsider: { id: string }, crewId: string;
const code = async (): Promise<string> => (await prisma.crew.findUniqueOrThrow({ where: { id: crewId } })).inviteCode;

beforeAll(async () => {
  await resetDb();
  owner = await makeUser("Owner"); a = await makeUser("Ana"); b = await makeUser("Ben"); outsider = await makeUser("Out");
  crewId = (await createCrew(owner.id, "Mods")).id;
  await joinCrew(a.id, await code());
  await joinCrew(b.id, await code());
});

describe("moderation: report", () => {
  it("members report members; only the owner sees and resolves reports", async () => {
    const { id } = await reportMember(a.id, crewId, { userId: b.id, reason: "spam", note: "links everywhere" });
    await expect(reportMember(a.id, crewId, { userId: a.id, reason: "spam" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(reportMember(outsider.id, crewId, { userId: b.id, reason: "spam" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(reportMember(a.id, crewId, { userId: outsider.id, reason: "spam" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listReports(owner.id, crewId)).toEqual([expect.objectContaining({ id, reporterName: "Ana", reportedName: "Ben", reason: "spam", note: "links everywhere" })]);
    await expect(listReports(a.id, crewId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(resolveReport(a.id, crewId, id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await resolveReport(owner.id, crewId, id);
    expect(await listReports(owner.id, crewId)).toEqual([]);
    await expect(resolveReport(owner.id, crewId, "nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("moderation: remove and block", () => {
  it("owner removes a member", async () => {
    const c = (await createCrew(owner.id, "Removal")).id;
    await joinCrew(outsider.id, (await prisma.crew.findUniqueOrThrow({ where: { id: c } })).inviteCode);
    await removeMember(owner.id, c, outsider.id);
    await expect(getCrewForMember(outsider.id, c)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("blocking hides the name for the blocker, removes them from crews the blocker owns and stops them rejoining", async () => {
    await blockUser(a.id, b.id);
    expect((await getCrewForMember(a.id, crewId)).members.map((m) => m.user.name)).toContain("Blocked member");
    expect((await getCrewForMember(owner.id, crewId)).members.map((m) => m.user.name)).toContain("Ben");
    await blockUser(owner.id, b.id);
    await expect(getCrewForMember(b.id, crewId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(joinCrew(b.id, await code())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await unblockUser(owner.id, b.id);
    await joinCrew(b.id, await code());
    await expect(blockUser(a.id, a.id)).rejects.toMatchObject({ code: "INVALID" });
    await expect(blockUser(a.id, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("moderation: owner transfer", () => {
  it("the owner hands over; the new owner has control and the old owner can then leave", async () => {
    await expect(handOver(a.id, crewId, b.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(handOver(owner.id, crewId, outsider.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await handOver(owner.id, crewId, a.id);
    expect((await getCrewForMember(a.id, crewId)).isOwner).toBe(true);
    expect(await leaveCrew(owner.id, crewId)).toEqual({ deleted: false });
  });

  it("moderation APIs check the session and map errors", async () => {
    const reports = await import("@/app/api/crews/[crewId]/reports/route");
    const params = Promise.resolve({ crewId });
    current = null;
    expect((await reports.GET(new Request("http://x"), { params })).status).toBe(401);
    current = b.id;
    const res = await reports.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ userId: a.id, reason: "bad-reason" }) }), { params });
    expect(res.status).toBe(400);
    expect((await reports.GET(new Request("http://x"), { params })).status).toBe(403);
  });
});
