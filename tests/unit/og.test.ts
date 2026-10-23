import { beforeAll, describe, expect, it } from "vitest";
import { listMoments, lockCall, reviewCall, shareCard, storedMoment } from "@/domain/lab/service";
import { findMoneyTerms } from "../audit/money-terms";
import { makeUser, resetDb } from "../helpers/db";

const { GET } = await import("@/app/api/og/call/[callId]/route");
const get = (callId: string): Promise<Response> => GET(new Request(`http://test/api/og/call/${callId}`), { params: Promise.resolve({ callId }) });

let callId: string, ungraded: string, fan: { id: string; name: string; email: string };
beforeAll(async () => {
  await resetDb();
  fan = await makeUser("Share Fan");
  const [a, b] = listMoments();
  const best = storedMoment(a.id)!.decision.best as string;
  callId = (await lockCall(fan.id, { momentId: a.id, option: best, confidence: 0.75 })).id;
  await reviewCall(fan.id, a.id);
  ungraded = (await lockCall(fan.id, { momentId: b.id, option: b.options[0].option, confidence: 0.6 })).id;
});

describe("“Called it” share cards (og)", () => {
  it("describes a graded call with the display name only, labelled provisional, with no money language", async () => {
    const card = await shareCard(callId);
    expect(card).not.toBeNull();
    expect(card?.displayName).toBe("Share Fan");
    expect(card?.grade).toMatch(/^[+−]\d+\.\d pts$/);
    expect(card?.heading).toBe("CALLED IT");
    // the pick is never on the card: it would give away the moment's best option
    const m = storedMoment(listMoments()[0].id)!;
    for (const o of m.decision.options) expect(JSON.stringify(card)).not.toContain(`"${o.label}`);
    expect(card?.calibration).toBe("Provisional calibration");
    const text = JSON.stringify(card);
    expect(text).not.toContain(fan.email);
    expect(text).not.toContain(fan.id);
    expect(findMoneyTerms("card", text)).toEqual([]);
  });

  it("renders a 1200×630 PNG for a graded call; nothing for an ungraded or unknown call", async () => {
    const res = await get(callId);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    if (process.env.EVIDENCE) (await import("node:fs")).writeFileSync("docs/evidence/F-C-03/called-it.png", png);
    expect((await get(ungraded)).status).toBe(404);
    expect((await get("nope")).status).toBe(404);
    expect(await shareCard(ungraded)).toBeNull();
  });
});
