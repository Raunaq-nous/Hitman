import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { parseOpenF1 } from "@/adapters/f1/openf1";
import { parseStatsBomb } from "@/adapters/football/statsbomb";
import { THRESHOLDS } from "@/domain/stories/config";
import { cricketWp, detectStories } from "@/domain/stories/service";

// Real recorded fixtures only; WP from the fitted outcome model (data/models/outcomes-v1.json).
const json = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const cricket = (id: string) => parseCricsheet(json(`data/fixtures/cricsheet/${id}.json`), id);
const football = parseStatsBomb({ matches: json("data/fixtures/statsbomb/matches-43-3.json"), events: JSON.parse(gunzipSync(readFileSync("data/fixtures/statsbomb/events-7525.json.gz")).toString("utf8")), ref: "7525" });
const f1 = parseOpenF1({ sessions: json("data/fixtures/openf1/sessions-2023-race.json"), laps: json("data/fixtures/openf1/laps.json"), ref: "7953" });
const wp = cricketWp(json("data/models/outcomes-v1.json") as Parameters<typeof cricketWp>[0]);

describe("rules-first story detector (stories)", () => {
  it("thresholds are explicit per sport", () => {
    expect(Object.keys(THRESHOLDS).sort()).toEqual(["cricket", "f1", "football"]);
    expect(THRESHOLDS.cricket.swing).toBeGreaterThan(0);
  });

  it("stories are prioritised, each with receipts pointing at real incidents", () => {
    for (const e of [cricket("1082625"), cricket("335982"), football, f1]) {
      const stories = detectStories(e, { wp });
      expect(stories.length).toBeGreaterThan(0);
      for (let i = 1; i < stories.length; i++) expect(stories[i - 1].priority).toBeGreaterThanOrEqual(stories[i].priority);
      const refs = new Set(e.incidents.map((x) => x.sourceRef));
      for (const s of stories) {
        expect(s.receipts.length).toBeGreaterThan(0);
        for (const r of s.receipts) expect(refs.has(r)).toBe(true);
        expect(s.sourceId).toBe(e.sourceId);
        expect(s.title).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it("cricket: the 2017 tie is a tense, swinging finish; the 2008 opener has big overs and an RCB collapse", () => {
    const tie = detectStories(cricket("1082625"), { wp });
    expect(tie[0]).toMatchObject({ kind: "tense-finish", title: expect.stringMatching(/^Mumbai Indians need 2 off 2 balls with 1 wicket left/) });
    expect(tie.some((s) => s.kind === "swing" && s.title.startsWith("Mumbai Indians’ chase"))).toBe(true);
    const opener = detectStories(cricket("335982"), { wp });
    const collapse = opener.filter((s) => s.kind === "collapse");
    expect(collapse.length).toBeGreaterThan(0);
    expect(collapse.every((s) => s.title.includes("Royal Challengers Bangalore"))).toBe(true);
    expect(opener.filter((s) => s.kind === "big-over").every((s) => s.magnitude >= THRESHOLDS.cricket.bigOverRuns)).toBe(true);
    expect(opener.some((s) => s.title === "Kolkata Knight Riders take 24 off over 15")).toBe(true);
    // chasing 223, RCB never got close enough for the chase to swing
    expect(opener.some((s) => s.kind === "swing")).toBe(false);
  });

  it("football: five goals, two of them late; missed big chances use the xG threshold", () => {
    const stories = detectStories(football, { wp });
    expect(stories.filter((s) => s.kind === "goal" || s.kind === "late-goal")).toHaveLength(5);
    expect(stories.filter((s) => s.kind === "late-goal")).toHaveLength(2);
    const bigMisses = football.incidents.filter((i) => i.type === "shot" && !i.payload.goal && (i.payload.xg as number) >= THRESHOLDS.football.bigChanceXg);
    expect(stories.filter((s) => s.kind === "big-chance-missed")).toHaveLength(bigMisses.length);
    // a late goal outranks an early one
    expect(stories.findIndex((s) => s.kind === "late-goal")).toBeLessThan(stories.findIndex((s) => s.kind === "goal"));
  });

  it("F1: pit-out laps become pit stories; laps far quicker than the car's median are pace stories", () => {
    const stories = detectStories(f1, { wp });
    expect(stories.filter((s) => s.kind === "pit-stop")).toHaveLength(f1.incidents.filter((i) => i.payload.pitOutLap === true).length);
    for (const s of stories.filter((x) => x.kind === "pace")) expect(s.magnitude).toBeGreaterThanOrEqual(THRESHOLDS.f1.quickLapGainSeconds);
  });

  it("sports with no source produce no stories", () => {
    expect(detectStories({ ...football, sport: "tennis" }, { wp })).toEqual([]);
  });
});
