import { beforeAll, describe, expect, it, vi } from "vitest";
import { log } from "@/providers/log";
import { prisma } from "@/lib/prisma";
import { integrityFlags, listMoments, lockCall } from "@/domain/lab/service";
import { makeUser, resetDb } from "../helpers/db";

beforeAll(async () => { await resetDb(); });

// Real golden moments; locks through the service as test fans (anticheat).
describe("anti-cheat in the Lock API (anticheat)", () => {
  it("one pick per call: a second lock is refused and the first stands", async () => {
    const fan = await makeUser("Cheat One");
    const m = listMoments()[0];
    await lockCall(fan.id, { momentId: m.id, option: m.options[0].option, confidence: 0.6 });
    await expect(lockCall(fan.id, { momentId: m.id, option: m.options[1].option, confidence: 0.9 })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("ten locks inside a minute raise a burst flag, logged for review and never blocking", async () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => undefined);
    const fan = await makeUser("Cheat Burst");
    const ms = listMoments().slice(0, 10);
    for (const m of ms) await lockCall(fan.id, { momentId: m.id, option: m.options[0].option, confidence: 0.7 });
    expect((await integrityFlags(fan.id)).map((f) => f.kind)).toContain("burst");
    expect(warn).toHaveBeenCalledWith("lab anomaly flags", expect.objectContaining({ userId: fan.id, flags: expect.arrayContaining(["burst"]) }));
    warn.mockRestore();
  });

  it("an old burst isn't re-logged on later locks, and a flag check that fails never fails the saved lock", async () => {
    const fan = await makeUser("Cheat Old Burst");
    const ms = listMoments().slice(0, 11);
    const long = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (const [i, m] of ms.slice(0, 10).entries()) await prisma.labCall.create({ data: { userId: fan.id, momentId: m.id, option: m.options[0].option, confidence: 0.7, lockedAt: new Date(long.getTime() + i * 1000) } });
    expect((await integrityFlags(fan.id)).map((f) => f.kind)).toContain("burst");
    const warn = vi.spyOn(log, "warn").mockImplementation(() => undefined);
    await lockCall(fan.id, { momentId: ms[10].id, option: ms[10].options[0].option, confidence: 0.7 });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    const fan2 = await makeUser("Cheat Flag Error");
    const err = vi.spyOn(log, "error").mockImplementation(() => undefined);
    const spy = vi.spyOn(log, "warn").mockImplementation(() => { throw new Error("log down"); });
    for (const m of listMoments().slice(0, 10)) await lockCall(fan2.id, { momentId: m.id, option: m.options[0].option, confidence: 0.7 });
    expect(await prisma.labCall.count({ where: { userId: fan2.id } })).toBe(10);
    expect(err).toHaveBeenCalledWith("lab anomaly flags failed", { error: "log down" });
    spy.mockRestore(); err.mockRestore();
  });

  it("a fan with a few spaced-out calls has no flags", async () => {
    const fan = await makeUser("Cheat Clean");
    const m = listMoments()[1];
    await lockCall(fan.id, { momentId: m.id, option: m.options[0].option, confidence: 0.6 });
    expect(await integrityFlags(fan.id)).toEqual([]);
  });
});
