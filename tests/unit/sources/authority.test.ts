import { afterEach, describe, expect, it, vi } from "vitest";
import { choose, formatAge, present } from "@/domain/sources/service";
import { SOURCE_PRIORITY } from "@/domain/sources/config";
import type { SourceClass, Sourced } from "@/domain/sources/types";

const NOW = Date.parse("2026-05-01T14:00:00Z");
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString();
const src = (sourceClass: SourceClass, secondsAgo: number, value = sourceClass): Sourced<string> => ({ value, sourceId: sourceClass.toLowerCase(), sourceClass, observedAt: at(secondsAgo) });
const live = { now: NOW, context: "live" as const, liveEnabled: true };

describe("authority: source priority and honest labels", () => {
  it("implements the priority table", () => {
    expect(SOURCE_PRIORITY).toEqual({ OFFICIAL_LIVE: 100, LICENSED_LIVE: 90, VERIFIED_DELAYED: 70, EDITORIAL_PROJECTION: 30, SIMULATION: 0 });
  });

  it("chooses the highest-priority fresh source", () => {
    const r = choose([src("VERIFIED_DELAYED", 1), src("LICENSED_LIVE", 5), src("SIMULATION", 0)], live);
    expect(r.value).toBe("LICENSED_LIVE");
    expect(r.state).toBe("live");
    expect(r.receipt).toEqual({ sourceId: "licensed_live", sourceClass: "LICENSED_LIVE", observedAt: at(5) });
  });

  it("skips a stale high-priority source for a fresh lower one", () => {
    const r = choose([src("OFFICIAL_LIVE", 120), src("VERIFIED_DELAYED", 10)], live);
    expect(r.value).toBe("VERIFIED_DELAYED");
    expect(r.state).toBe("delayed");
  });

  it("when nothing is fresh, shows the newest factual value as stale with its age", () => {
    const r = choose([src("OFFICIAL_LIVE", 3 * 3600), src("VERIFIED_DELAYED", 400)], live);
    expect(r.value).toBe("VERIFIED_DELAYED");
    expect(r.state).toBe("stale");
    expect(r.label).toBe("Stale · 7 min");
  });

  it("simulated or projected data is never labelled live, even when it is the only, freshest source", () => {
    for (const cls of ["SIMULATION", "EDITORIAL_PROJECTION"] as const) {
      const r = choose([src(cls, 0)], live);
      expect(r.state).not.toBe("live");
      expect(r.label).not.toMatch(/live/i);
    }
    expect(choose([src("SIMULATION", 0), src("VERIFIED_DELAYED", 9000)], live).value).toBe("VERIFIED_DELAYED");
  });

  it("nothing is live while LIVE_CALLS is off, and delayed sources are never live", () => {
    expect(present(src("OFFICIAL_LIVE", 1), { ...live, liveEnabled: false }).state).toBe("delayed");
    expect(present(src("VERIFIED_DELAYED", 1), live).state).toBe("delayed");
  });

  it("labels historical replays and missing sources honestly", () => {
    expect(present(src("VERIFIED_DELAYED", 9e6), { now: NOW, context: "historical", liveEnabled: true, replay: true }).label).toBe("Historical replay");
    expect(choose([], live)).toMatchObject({ value: null, state: "source-pending", label: "Source pending", receipt: null });
  });

  it("formats ages", () => {
    expect([formatAge(500), formatAge(42_000), formatAge(3 * 60_000), formatAge(3 * 3_600_000), formatAge(2 * 86_400_000)]).toEqual(["1 s", "42 s", "3 min", "3 h", "2 d"]);
  });
});

describe("authority: live-score route", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

  it("labels CricketData.org as delayed (never live) and falls back to a stale label, not a fabricated score", async () => {
    vi.stubEnv("CRICKET_API_KEY", "test-key");
    vi.stubEnv("LIVE_CALLS", "true");
    const body = { status: "success", info: {}, data: [{ id: "m1", name: "Team A vs Team B, Indian Premier League", matchType: "t20", teams: ["Team A", "Team B"], matchStarted: true, matchEnded: false, score: [{ r: 85, w: 2, o: "10.4", inning: "Team A Inning 1" }] }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(body)));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/live-score/route");
    const json = await (await GET()).json();
    expect(json.data.presentation).toMatchObject({ state: "delayed", label: "Delayed", receipt: { sourceId: "cricketdata", sourceClass: "VERIFIED_DELAYED" } });
    expect(json.data.primary.dataLabel).toBe("Delayed");
    expect(json.data.primary.innings1.runRate).toBe(7.97);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("with no key, reports source pending instead of inventing data", async () => {
    vi.stubEnv("CRICKET_API_KEY", "");
    const { GET } = await import("@/app/api/live-score/route");
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).presentation).toMatchObject({ state: "source-pending" });
  });
});
