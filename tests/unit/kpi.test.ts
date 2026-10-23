import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { weekStart, weeklyKpis, type KpiEvent } from "@/domain/analytics/kpi";
import { kpisForWeek } from "@/domain/analytics/service";
import { resetDb } from "../helpers/db";

const at = (iso: string) => new Date(`${iso}Z`);
const ev = (userId: string | null, name: string, iso: string, props: Record<string, unknown> = {}): KpiEvent => ({ userId, name, props, createdAt: at(iso) });

// Fixture week: Monday 2026-03-02. Known answers are worked out by hand in the comments.
const EVENTS: KpiEvent[] = [
  ev("u1", "moment_viewed", "2026-02-23T09:00:00"), // u1 first seen the week before
  ev("u1", "moment_viewed", "2026-03-02T09:00:00"),
  ev("u1", "call_locked", "2026-03-02T09:05:00"),
  ev("u1", "call_graded", "2026-03-03T20:00:00"),
  ev("u1", "review_viewed", "2026-03-04T08:00:00"),
  ev("u1", "call_locked", "2026-03-04T08:01:00"), // reviewed then made another call → counts for the north star
  ev("u1", "receipt_opened", "2026-03-04T08:02:00", { sourceId: "cricsheet", surface: "review" }),
  ev("u1", "alter_ego_revealed", "2026-03-05T10:00:00", { persona: "opener" }),
  ev("u1", "share_clicked", "2026-03-05T10:01:00", { kind: "alter_ego" }),
  ev("u2", "moment_viewed", "2026-03-02T10:00:00"), // u2 new this week
  ev("u2", "call_locked", "2026-03-02T11:00:00"),
  ev("u2", "call_graded", "2026-03-03T20:00:00"),
  ev("u2", "review_viewed", "2026-03-05T09:00:00"), // reviewed but no later call
  ev("u2", "alter_ego_revealed", "2026-03-06T10:00:00", { persona: "iceman" }),
  ev("u2", "share_clicked", "2026-03-06T10:01:00", { kind: "call", callId: "c9" }),
  ev("u2", "moment_viewed", "2026-03-10T12:00:00"), // day 8: retained at D7
  ev("u3", "moment_viewed", "2026-03-03T09:00:00"), // u3 new this week, never calls
  ev("u3", "moment_viewed", "2026-04-02T12:00:00"), // day 30: retained at D30, not D7
  ev("u4", "moment_viewed", "2026-02-25T09:00:00"),
  ev("u4", "moment_viewed", "2026-03-02T08:00:00"),
  ev("u4", "call_locked", "2026-03-02T08:30:00"),
  ev("u4", "call_graded", "2026-03-02T20:00:00"),
  ev("u4", "review_viewed", "2026-03-03T08:00:00"), // last call was before the review → doesn't count
  ev(null, "moment_viewed", "2026-03-04T12:00:00"), // anonymous: ignored for user metrics
];

describe("kpi: north star and weekly KPIs with known answers", () => {
  const k = weeklyKpis(EVENTS, at("2026-03-04T00:00:00"), at("2026-05-01T00:00:00"));

  it("uses ISO weeks starting Monday 00:00 UTC", () => {
    expect(weekStart(at("2026-03-08T23:59:59")).toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(k.weekStart).toBe("2026-03-02T00:00:00.000Z");
    expect(k.activeUsers).toBe(4);
  });

  it("Review-to-Next-Read = users who reviewed then called again ÷ users with a graded call: 1/3", () => {
    expect(k.reviewToNextRead).toEqual({ numerator: 1, denominator: 3, value: 1 / 3 });
  });

  it("supporting KPIs", () => {
    expect(k.gradedCallsPerActiveFan).toEqual({ numerator: 3, denominator: 4, value: 0.75 });
    expect(k.callParticipation).toEqual({ numerator: 3, denominator: 4, value: 0.75 });
    expect(k.newFanFirstCall).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
    expect(k.d7Retention).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
    expect(k.d30Retention).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
    expect(k.shareRatePerReveal).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
    expect(k.receiptTapThrough).toEqual({ numerator: 1, denominator: 4, value: 0.25 });
  });

  it("reports null, not 0%, when there is no data or the retention window hasn't passed", () => {
    const early = weeklyKpis(EVENTS, at("2026-03-04T00:00:00"), at("2026-03-12T00:00:00"));
    expect(early.d7Retention.value).toBeNull();
    expect(early.d30Retention).toEqual({ numerator: 0, denominator: 0, value: null });
    const empty = weeklyKpis([], at("2026-03-04T00:00:00"));
    expect(empty.reviewToNextRead.value).toBeNull();
    expect(empty.activeUsers).toBe(0);
  });
});

describe("kpi: computed from the event log", () => {
  beforeAll(async () => {
    await resetDb();
    await prisma.analyticsEvent.createMany({ data: EVENTS.map((e) => ({ userId: e.userId, name: e.name, props: e.props as object, createdAt: e.createdAt })) });
  });

  it("the service reads the log and matches the pure computation", async () => {
    const k = await kpisForWeek(at("2026-03-05T00:00:00"), at("2026-05-01T00:00:00"));
    expect(k).toEqual(weeklyKpis(EVENTS, at("2026-03-02T00:00:00"), at("2026-05-01T00:00:00")));
  });
});
