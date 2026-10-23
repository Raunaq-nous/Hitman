import { beforeAll, describe, expect, it, vi } from "vitest";
import { log } from "@/providers/log";
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

  it("a fan with a few spaced-out calls has no flags", async () => {
    const fan = await makeUser("Cheat Clean");
    const m = listMoments()[1];
    await lockCall(fan.id, { momentId: m.id, option: m.options[0].option, confidence: 0.6 });
    expect(await integrityFlags(fan.id)).toEqual([]);
  });
});
