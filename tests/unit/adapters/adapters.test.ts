import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ADAPTERS, cricketAdapter, f1Adapter, footballAdapter, liveAdapters, sourcePending } from "@/adapters";
import { RightsError } from "@/rights";
import { SPORTS } from "@/domain/facts/types";
import { incidentInput } from "@/domain/facts/types";

// Recorded fixtures only (fetched by the data courier; see data/manifest.json). Tests never use the network.
const json = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const sessions = json("data/fixtures/openf1/sessions-2023-race.json");
const laps = json("data/fixtures/openf1/laps.json");
const matches = json("data/fixtures/statsbomb/matches-43-3.json");
const events = JSON.parse(gunzipSync(readFileSync("data/fixtures/statsbomb/events-7525.json.gz")).toString("utf8"));
const proto = { prototypeData: true };

describe("source adapters (adapters)", () => {
  it("every sport has an adapter or an honest source-pending entry", () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual([...SPORTS].sort());
    for (const sport of ["basketball", "tennis"] as const) {
      const a = ADAPTERS[sport];
      expect(a.status).toBe("source-pending");
      expect(sourcePending(sport)).toEqual(a);
      expect((a as { reason: string }).reason).toMatch(/no source/i);
    }
    expect(liveAdapters().map((a) => a.sport).sort()).toEqual(["cricket", "f1", "football"]);
  });

  it("cricket: Cricsheet fixture → event with ball incidents", () => {
    const e = cricketAdapter.parse({ raw: json("data/fixtures/cricsheet/335982.json"), ref: "335982" }, proto);
    expect(e.name).toBe("Royal Challengers Bangalore v Kolkata Knight Riders");
    expect(e.incidents.length).toBeGreaterThan(200);
  });

  it("F1: OpenF1 Bahrain 2023 race → one incident per completed lap, prototype-only", () => {
    const e = f1Adapter.parse({ sessions, laps, ref: "7953" }, proto);
    expect(e.sport).toBe("f1");
    expect(e.name).toBe("Bahrain 2023 Race");
    expect(e.venue).toBe("Sakhir");
    expect(e.participants).toContainEqual({ name: "Car 1", role: "car" });
    const l1 = e.incidents.find((i) => i.sourceRef === "7953:1:1");
    expect(l1?.payload).toMatchObject({ driverNumber: 1, lap: 1, lapSeconds: 99.359, pitOutLap: false });
    expect(e.incidents.every((i) => i.type === "lap" && i.sourceClass === "VERIFIED_DELAYED")).toBe(true);
    // the source has no time for some laps (e.g. lap 1 of cars that retired); those stay null, never invented
    expect(e.incidents.filter((i) => i.payload.lapSeconds === null).length).toBe((laps as { lap_duration: number | null }[]).filter((l) => l.lap_duration === null).length);
    // incidents are ordered by the time they happened
    for (let i = 1; i < e.incidents.length; i++) expect(e.incidents[i].effectiveAt.getTime()).toBeGreaterThanOrEqual(e.incidents[i - 1].effectiveAt.getTime());
    expect(() => f1Adapter.parse({ sessions, laps, ref: "1" }, proto)).toThrow(/session 1 not in/);
  });

  it("football: StatsBomb Russia v Saudi Arabia (2018) → shots and goals; score agrees with the match record", () => {
    const e = footballAdapter.parse({ matches, events, ref: "7525" }, proto);
    expect(e.name).toBe("Russia v Saudi Arabia");
    expect(e.outcome).toEqual({ home: 5, away: 0, winner: "Russia" });
    const shots = e.incidents.filter((i) => i.type === "shot");
    expect(shots.length).toBe(20);
    expect(shots.filter((i) => i.payload.goal).length).toBe(5);
    expect(shots.filter((i) => i.payload.goal).every((i) => i.payload.team === "Russia")).toBe(true);
    expect(shots[0].payload).toMatchObject({ minute: 5, team: "Saudi Arabia", outcome: "Blocked" });
    expect(e.incidents.some((i) => i.type === "period")).toBe(true);
    expect(() => footballAdapter.parse({ matches, events, ref: "1" }, proto)).toThrow(/match 1 not in/);
  });

  it("every incident from every adapter is a valid incident input", () => {
    const all = [
      cricketAdapter.parse({ raw: json("data/fixtures/cricsheet/1082625.json"), ref: "1082625" }, proto),
      f1Adapter.parse({ sessions, laps, ref: "7953" }, proto),
      footballAdapter.parse({ matches, events, ref: "7525" }, proto),
    ];
    for (const e of all) for (const i of e.incidents) expect(incidentInput.safeParse(i).success).toBe(true);
  });

  it("checks rights before parsing: the prototype-only F1 source is refused without PROTOTYPE_DATA", () => {
    expect(() => f1Adapter.parse({ sessions, laps, ref: "7953" }, { prototypeData: false })).toThrow(RightsError);
    expect(() => footballAdapter.parse({ matches, events, ref: "7525" }, { prototypeData: false })).not.toThrow();
    expect(() => cricketAdapter.parse({ raw: json("data/fixtures/cricsheet/335982.json"), ref: "335982" }, { prototypeData: false })).not.toThrow();
  });
});
