import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { track } from "@/domain/analytics/service";
import { clientEventInput, EVENT_NAMES } from "@/domain/analytics/types";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({ currentUserId: async () => current }));

beforeAll(async () => { await resetDb(); });

describe("analytics events", () => {
  it("browsers can't send the server-side events that feed the KPIs", () => {
    for (const name of ["call_locked", "call_graded", "review_viewed"]) expect(clientEventInput.safeParse({ name, props: {} }).success, name).toBe(false);
    expect(clientEventInput.safeParse({ name: "moment_viewed", props: { momentId: "m" } }).success).toBe(true);
  });

  it("covers exactly the events in the spec (plus server-side call_graded)", () => {
    expect([...EVENT_NAMES].sort()).toEqual(["alter_ego_revealed", "call_graded", "call_locked", "depth_changed", "language_changed", "moment_viewed", "next_read_started", "receipt_opened", "review_viewed", "share_clicked"]);
  });

  it("stores a valid event with user and props", async () => {
    const u = await makeUser();
    const { id } = await track("call_locked", { momentId: "m1", callId: "c1", confidence: 70 }, u.id);
    const row = await prisma.analyticsEvent.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ userId: u.id, name: "call_locked", props: { momentId: "m1", callId: "c1", confidence: 70 } });
  });

  it("allows anonymous events", async () => {
    const { id } = await track("moment_viewed", { momentId: "m2" }, null);
    expect((await prisma.analyticsEvent.findUniqueOrThrow({ where: { id } })).userId).toBeNull();
  });

  it("rejects unexpected props (e.g. personal data) and out-of-range values", async () => {
    // @ts-expect-error email is not an allowed prop
    await expect(track("review_viewed", { callId: "c1", email: "a@b.com" }, null)).rejects.toMatchObject({ code: "INVALID" });
    await expect(track("call_locked", { momentId: "m", callId: "c", confidence: 100 }, null)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("the events API records client events under the session user and rejects unknown names", async () => {
    const { POST } = await import("@/app/api/events/route");
    current = (await makeUser()).id;
    const ok = await POST(new Request("http://x/api/events", { method: "POST", body: JSON.stringify({ name: "depth_changed", props: { from: "quick", to: "analyst" } }) }));
    expect(ok.status).toBe(201);
    expect(await prisma.analyticsEvent.count({ where: { userId: current, name: "depth_changed" } })).toBe(1);
    const bad = await POST(new Request("http://x/api/events", { method: "POST", body: JSON.stringify({ name: "purchase", props: {} }) }));
    expect(bad.status).toBe(400);
  });
});
