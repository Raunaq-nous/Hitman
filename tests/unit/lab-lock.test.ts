import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/domain/shared/types";
import { listMoments } from "@/domain/lab/service";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({
  requireUserId: async () => {
    if (!current) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
    return current;
  },
}));
const { POST } = await import("@/app/api/lab/calls/route");
const { lockCall } = await import("@/domain/lab/service");

// Real golden moments (data/fixtures/moments/golden-moments.json).
const [moment, other] = listMoments();
const post = (body: unknown): Promise<Response> => POST(new Request("http://test/api/lab/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));
let fan: { id: string }, second: { id: string };

beforeAll(async () => {
  await resetDb();
  fan = await makeUser("Lock Fan");
  second = await makeUser("Lock Second");
});
beforeEach(() => { current = null; });

describe("lock API: POST /api/lab/calls (lock)", () => {
  it("refuses anyone not signed in", async () => {
    const res = await post({ momentId: moment.id, option: moment.options[0].option, confidence: 0.6 });
    expect(res.status).toBe(401);
    expect(await prisma.labCall.count()).toBe(0);
  });

  it("locks one pick with the server's time, ignoring any client timestamp or extra fields", async () => {
    current = fan.id;
    const before = Date.now();
    const res = await post({ momentId: moment.id, option: moment.options[1].option, confidence: 0.72, lockedAt: "2000-01-01T00:00:00Z" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; momentId: string; option: string; confidence: number; lockedAt: string };
    expect(body).toMatchObject({ momentId: moment.id, option: moment.options[1].option, confidence: 0.72 });
    expect(Date.parse(body.lockedAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(body.lockedAt)).toBeLessThanOrEqual(Date.now() + 1000);
    // the lock response carries no reveal and no model estimate
    // exactly these fields (a substring search would trip on random ids that happen to contain "wp")
    expect(Object.keys(body).sort()).toEqual(["confidence", "id", "lockedAt", "momentId", "option"]);
    const row = await prisma.labCall.findUniqueOrThrow({ where: { userId_momentId: { userId: fan.id, momentId: moment.id } } });
    expect(row.lockedAt.toISOString()).toBe(body.lockedAt);
  });

  it("a call is final: a second lock on the same moment is refused and the first stays", async () => {
    current = fan.id;
    const res = await post({ momentId: moment.id, option: moment.options[0].option, confidence: 0.99 });
    expect(res.status).toBe(409);
    const row = await prisma.labCall.findUniqueOrThrow({ where: { userId_momentId: { userId: fan.id, momentId: moment.id } } });
    expect(row).toMatchObject({ option: moment.options[1].option, confidence: 0.72 });
    // simultaneous locks: exactly one wins
    const results = await Promise.allSettled([0.6, 0.7, 0.8].map((c) => lockCall(second.id, { momentId: other.id, option: other.options[0].option, confidence: c })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason?.code === "CONFLICT")).toBe(true);
  });

  it("validates the moment, the option and the confidence on the server", async () => {
    current = second.id;
    expect((await post({ momentId: "gm-0000-0-0", option: "rate:1", confidence: 0.6 })).status).toBe(404);
    expect((await post({ momentId: moment.id, option: "style:pace", confidence: 0.6 })).status).toBe(400);
    for (const confidence of [0.49, 1, 0.995, -1, "0.6", null]) expect((await post({ momentId: moment.id, option: moment.options[0].option, confidence })).status).toBe(400);
    expect((await post({ momentId: moment.id, options: [moment.options[0].option, moment.options[1].option], confidence: 0.6 })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(await prisma.labCall.count({ where: { userId: second.id, momentId: moment.id } })).toBe(0);
    // the edges of the 50–99% slider are allowed
    expect((await post({ momentId: moment.id, option: moment.options[0].option, confidence: 0.5 })).status).toBe(201);
  });

  it("rate-limits locking per user", async () => {
    const spammer = await makeUser("Lock Spammer");
    current = spammer.id;
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await post({ momentId: "gm-0000-0-0", option: "rate:1", confidence: 0.6 })).status);
    expect(statuses.slice(0, 20).every((s) => s === 404)).toBe(true);
    expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
  });

  it("calls go with the account: deleting the user deletes their calls", async () => {
    await prisma.user.delete({ where: { id: fan.id } });
    expect(await prisma.labCall.count({ where: { userId: fan.id } })).toBe(0);
  });
});
