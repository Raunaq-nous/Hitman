import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { ingestEvent } from "@/domain/facts/ingest";
import { planReplay, replayFrames, replayStream, sseEncode } from "@/domain/facts/replay";
import { GET } from "@/app/api/replay/[eventId]/route";
import { resetDb } from "../../helpers/db";

// Real fixture: 2008 KKR v RCB (Cricsheet 335982); observedAt is deterministic (start + 30 s per delivery).
const raw = JSON.parse(readFileSync("data/fixtures/cricsheet/335982.json", "utf8"));
let eventId: string;
beforeAll(async () => { await resetDb(); eventId = (await ingestEvent(parseCricsheet(raw, "335982"))).eventId; });

async function read(stream: ReadableStream<Uint8Array>): Promise<{ id?: string; event: string; data: Record<string, unknown> }[]> {
  const text = await new Response(stream).text();
  return text.trim().split("\n\n").map((block) => {
    const f = Object.fromEntries(block.split("\n").map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 2)]));
    return { id: f.id, event: f.event, data: JSON.parse(f.data) };
  });
}

describe("incident replay (replay)", () => {
  it("plans frames on a replay clock: observed gaps divided by speed, running score per innings", async () => {
    const frames = await replayFrames(eventId, 60);
    expect(frames.length).toBeGreaterThan(200);
    expect(frames[0].at).toBe(0);
    expect(frames[1].at).toBe(500); // 30 s between deliveries at 60× = 0.5 s
    for (let i = 1; i < frames.length; i++) expect(frames[i].at).toBeGreaterThanOrEqual(frames[i - 1].at);
    const firstInnings = frames.filter((f) => f.score?.innings === 1);
    expect(firstInnings.at(-1)?.score).toMatchObject({ runs: 222, wickets: 3 });
    expect(frames.at(-1)?.score).toMatchObject({ innings: 2, runs: 82, wickets: 10 });
    expect(frames[0].incident).toMatchObject({ sourceId: "cricsheet", sourceClass: "VERIFIED_DELAYED" });
    // deterministic: same input, same plan
    expect(await replayFrames(eventId, 60)).toEqual(frames);
    expect(planReplay([], 60)).toEqual([]);
  });

  it("streams SSE frames, sleeping for each gap on the replay clock, and resumes after Last-Event-ID", async () => {
    const frames = await replayFrames(eventId, 60);
    const waits: number[] = [];
    const out = await read(replayStream(frames.slice(0, 4), { from: 0, sleep: async (ms) => { waits.push(ms); } }));
    expect(out.map((o) => o.event)).toEqual(["incident", "incident", "incident", "incident", "end"]);
    expect(out[0].id).toBe("0");
    expect(waits).toEqual([0, 500, 500, 500]);
    const resumed = await read(replayStream(frames.slice(0, 4), { from: 2, sleep: async () => undefined }));
    expect(resumed.map((o) => o.id)).toEqual(["2", "3", undefined]);
    expect(sseEncode("end", { done: true })).toBe('event: end\ndata: {"done":true}\n\n');
  });

  it("GET /api/replay/:eventId is an event stream; unknown events are 404; speed is validated", async () => {
    const res = await GET(new Request(`http://x/api/replay/${eventId}?speed=3600`, { headers: { "Last-Event-ID": String(1e6) } }), { params: Promise.resolve({ eventId }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const out = await read(res.body as ReadableStream<Uint8Array>);
    expect(out).toEqual([{ id: undefined, event: "end", data: { frames: expect.any(Number) } }]);
    expect((await GET(new Request("http://x/api/replay/nope"), { params: Promise.resolve({ eventId: "nope" }) })).status).toBe(404);
    expect((await GET(new Request(`http://x/api/replay/${eventId}?speed=0`), { params: Promise.resolve({ eventId }) })).status).toBe(400);
  });
});
