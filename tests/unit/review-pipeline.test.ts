import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/domain/shared/types";
import { START } from "@/engine/readRating";
import { makeUser, resetDb } from "../helpers/db";

let current: string | null = null;
vi.mock("@/providers/auth", () => ({
  requireUserId: async () => {
    if (!current) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
    return current;
  },
}));
const { GET } = await import("@/app/api/lab/calls/[momentId]/review/route");
const { gradeCall, listMoments, lockCall, regradeUser, reviewCall, storedMoment } = await import("@/domain/lab/service");

// Real golden moments (data/fixtures/moments/golden-moments.json) and their stored exact-model option WPs.
const moments = listMoments();
const get = (momentId: string): Promise<Response> => GET(new Request(`http://test/api/lab/calls/${momentId}/review`), { params: Promise.resolve({ momentId }) });
const bestOf = (id: string) => storedMoment(id)!.decision.best as string;
const worstOf = (id: string) => [...storedMoment(id)!.decision.options].sort((a, b) => a.wp - b.wp)[0].option;
let fan: { id: string }, other: { id: string };

beforeAll(async () => {
  await resetDb();
  fan = await makeUser("Review Fan");
  other = await makeUser("Review Other");
});
beforeEach(() => { current = null; });

describe("reveal and grading pipeline (review-pipeline)", () => {
  it("serves no review (and no reveal) without a locked call, and only to the caller", async () => {
    expect((await get(moments[0].id)).status).toBe(401);
    current = fan.id;
    expect((await get(moments[0].id)).status).toBe(404);
    expect((await get("gm-0000-0-0")).status).toBe(404);
    await lockCall(other.id, { momentId: moments[0].id, option: bestOf(moments[0].id), confidence: 0.8 });
    expect((await get(moments[0].id)).status).toBe(404);
    expect(await prisma.decisionReview.count()).toBe(0);
  });

  it("grades a locked call from the exact model's option differences, with the reveal and receipts", async () => {
    current = fan.id;
    const m = storedMoment(moments[0].id)!;
    await lockCall(fan.id, { momentId: m.id, option: bestOf(m.id), confidence: 0.8 });
    const res = await get(m.id);
    expect(res.status).toBe(200);
    const r = (await res.json()) as Record<string, unknown> & { grade: { graded: boolean; readPoints: number; best: string; hit: boolean; brier: number; calibration: string }; rating: { before: number; after: number }; reveal: { chaseWon: number; winner: string }; options: { option: string; wp: number }[]; receipts: Record<string, string> };
    const wps = m.decision.options.map((o) => o.wp).sort((a, b) => b - a);
    expect(r.grade).toMatchObject({ graded: true, best: m.decision.best, hit: true, calibration: "provisional" });
    expect(r.grade.readPoints).toBeCloseTo((wps[0] - wps[1]) * 100, 6);
    expect(r.grade.brier).toBeCloseTo((0.8 - 1) ** 2, 12);
    expect(r.rating.before).toBe(START);
    expect(r.rating.after).toBeGreaterThan(START);
    expect(r.reveal).toEqual(m.reveal);
    expect(r.options.map((o) => o.option)).toEqual(m.decision.options.map((o) => o.option));
    expect(Object.keys(r.receipts).sort()).toEqual(["momentsHash", "optionsHash", "outcomesHash"]);
    // asking again returns the same stored review
    const again = (await (await get(m.id)).json()) as typeof r;
    expect(again.grade).toEqual(r.grade);
    expect(await prisma.decisionReview.count({ where: { userId: fan.id } })).toBe(1);
  });

  it("a poor read loses points and rating; the rating carries over in lock order", async () => {
    const m = moments[1].id;
    await lockCall(fan.id, { momentId: m, option: worstOf(m), confidence: 0.9 });
    const r = await reviewCall(fan.id, m);
    const first = await prisma.decisionReview.findFirstOrThrow({ where: { userId: fan.id, momentId: moments[0].id } });
    expect(r.grade.readPoints).toBeLessThan(0);
    expect(r.grade.hit).toBe(false);
    expect(r.grade.brier).toBeCloseTo(0.81, 12);
    expect(r.rating.before).toBeCloseTo(first.ratingAfter, 9);
    expect(r.rating.after).toBeLessThan(r.rating.before);
  });

  it("reviewing a later call first still grades earlier locked calls first (ratings follow lock order)", async () => {
    const [a, b] = [moments[2].id, moments[3].id];
    await lockCall(fan.id, { momentId: a, option: bestOf(a), confidence: 0.6 });
    await lockCall(fan.id, { momentId: b, option: bestOf(b), confidence: 0.6 });
    const rb = await reviewCall(fan.id, b);
    const ra = await prisma.decisionReview.findFirstOrThrow({ where: { userId: fan.id, momentId: a } });
    expect(rb.rating.before).toBeCloseTo(ra.ratingAfter, 9);
  });

  it("is reproducible: regrading from the fixtures and calls gives identical reviews", async () => {
    const strip = (rows: Record<string, unknown>[]) => rows.map(({ id: _id, gradedAt: _g, ...rest }) => rest);
    const before = await prisma.decisionReview.findMany({ where: { userId: fan.id }, orderBy: { momentId: "asc" } });
    await regradeUser(fan.id);
    const after = await prisma.decisionReview.findMany({ where: { userId: fan.id }, orderBy: { momentId: "asc" } });
    expect(strip(after)).toEqual(strip(before));
  });

  it("coin-flip calls are marked no grade: no read points, no calibration score, no rating change", () => {
    const m = storedMoment(moments[0].id)!;
    const flat = { ...m, decision: { ...m.decision, options: m.decision.options.map((o, i) => ({ ...o, wp: 0.5 + i * 0.001 })) } };
    const g = gradeCall(flat, { option: flat.decision.options[0].option, confidence: 0.7 }, { rating: 1234, graded: 3 }, 0.5);
    expect(g).toMatchObject({ graded: false, coinFlip: true, readPoints: null, hit: null, brier: null, ratingBefore: 1234, ratingAfter: 1234 });
  });
});
