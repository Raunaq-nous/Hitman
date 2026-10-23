import { beforeAll, describe, expect, it } from "vitest";
import { alterEgoFor, listMoments, lockCall, storedMoment } from "@/domain/lab/service";
import { makeUser, resetDb } from "../helpers/db";

// Real golden moments; calls locked through the service as a test fan (alter-ego).
let fan: { id: string };
beforeAll(async () => {
  await resetDb();
  fan = await makeUser("Ego Fan");
  const others = await Promise.all([1, 2, 3, 4, 5].map((i) => makeUser(`Crowd ${i}`)));
  const ms = listMoments().slice(0, 10);
  for (const [i, m] of ms.entries()) {
    const best = storedMoment(m.id)!.decision.best as string;
    const other = m.options.find((o) => o.option !== best)!.option;
    await lockCall(fan.id, { momentId: m.id, option: i < 7 ? best : other, confidence: 0.7 });
    // the crowd picks the best option on the first moment only
    if (i === 0) for (const o of others) await lockCall(o.id, { momentId: m.id, option: best, confidence: 0.6 });
  }
});

describe("Alter Ego from real calls (alter-ego)", () => {
  it("reveals after 10 graded calls with explained axes and a crowd comparison where 5 others called", async () => {
    const id = await alterEgoFor(fan.id);
    expect(id.revealed).toBe(true);
    if (!id.revealed) return;
    expect(id.graded).toBe(10);
    expect(id.axes.find((a) => a.key === "calibration")?.explanation).toBe("On average 70% sure and right 70% of the time.");
    expect(id.axes.find((a) => a.key === "contrarianism")).toMatchObject({ value: 0, n: 1 });
    expect(id.label).toMatch(/^The (Opener|Closer|Architect|Professor|Iceman) · \w+$/);
  });

  it("stays hidden for a fan with fewer than 10 graded calls", async () => {
    const newcomer = await makeUser("Ego Newcomer");
    const m = listMoments()[0];
    await lockCall(newcomer.id, { momentId: m.id, option: m.options[0].option, confidence: 0.6 });
    expect(await alterEgoFor(newcomer.id)).toEqual({ revealed: false, graded: 1, remaining: 9 });
  });
});
