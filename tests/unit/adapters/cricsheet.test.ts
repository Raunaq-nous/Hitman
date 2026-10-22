import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { isRainAffected, isTie, parseCricsheet } from "@/adapters/cricket/cricsheet";
import { ingestEvent } from "@/domain/facts/ingest";
import { getStateAt } from "@/domain/facts/service";
import { resetDb } from "../../helpers/db";

// A minimal SYNTHETIC document in the Cricsheet JSON schema, for parser tests only (not real match data).
// The real fixture subset comes from cricsheet.org via `npm run data:cricsheet && npm run data:fixtures`.
const doc = {
  meta: { data_version: "1.1.0" },
  info: { dates: ["2030-01-01"], teams: ["Team A", "Team B"], event: { name: "Test League" }, season: "2030", venue: "Test Ground", match_type: "T20", outcome: { winner: "Team B", by: { wickets: 9 } } },
  innings: [
    { team: "Team A", overs: [{ over: 0, deliveries: [
      { batter: "a1", bowler: "b1", runs: { batter: 4, extras: 0, total: 4 } },
      { batter: "a1", bowler: "b1", runs: { batter: 0, extras: 1, total: 1 }, extras: { wides: 1 } },
      { batter: "a1", bowler: "b1", runs: { batter: 0, extras: 0, total: 0 }, wickets: [{ player_out: "a1", kind: "bowled" }] },
    ] }] },
    { team: "Team B", target: { runs: 6, overs: 20 }, overs: [{ over: 0, deliveries: [
      { batter: "b2", bowler: "a3", runs: { batter: 6, extras: 0, total: 6 } },
    ] }] },
  ],
};

describe("cricsheet adapter", () => {
  it("parses deliveries into ball incidents with deterministic clocks and receipts", () => {
    const e = parseCricsheet(doc, "999001");
    expect(e).toMatchObject({ sourceId: "cricsheet", sourceRef: "999001", sport: "cricket", season: "2030", name: "Team A v Team B", competition: { slug: "test-league" } });
    expect(e.incidents).toHaveLength(4);
    expect(e.incidents[1].payload).toMatchObject({ extras: 1, extraType: "wides" });
    expect(e.incidents[2].payload).toMatchObject({ wicket: true, wicketKind: "bowled" });
    expect(e.incidents[3].payload).toMatchObject({ innings: 2, target: 6 });
    expect(e.incidents.map((i) => i.sourceRef)).toEqual(["999001:1:0:0", "999001:1:0:1", "999001:1:0:2", "999001:2:0:0"]);
    expect(e.incidents[1].observedAt.getTime() - e.incidents[0].observedAt.getTime()).toBe(30_000);
    expect(isTie(e)).toBe(false);
    expect(isRainAffected(e)).toBe(false);
    expect(isRainAffected(parseCricsheet({ ...doc, info: { ...doc.info, outcome: { winner: "Team A", method: "D/L" } } }, "2"))).toBe(true);
    expect(isTie(parseCricsheet({ ...doc, info: { ...doc.info, outcome: { result: "tie" } } }, "3"))).toBe(true);
    expect(() => parseCricsheet({ info: {} }, "x")).toThrow();
    // a no-ball that also went for byes is still a no-ball (not a legal ball), whatever order the keys come in
    const nbByes = { batter: "b2", bowler: "a3", runs: { batter: 0, extras: 5, total: 5 }, extras: { byes: 4, noballs: 1 } };
    const withNb = parseCricsheet({ ...doc, innings: [doc.innings[0], { ...doc.innings[1], overs: [{ over: 0, deliveries: [nbByes] }] }] }, "4");
    expect(withNb.incidents[3].payload).toMatchObject({ extraType: "noballs", extras: 5 });
    expect(e.incidents[3].payload).toMatchObject({ target: 6, targetOvers: 20 });
  });

  describe("ingest", () => {
    beforeAll(async () => { await resetDb(); });
    it("stores the event and incidents once (idempotent) and the state reads back", async () => {
      const e = parseCricsheet(doc, "999001");
      const first = await ingestEvent(e);
      expect(first.incidentsAdded).toBe(4);
      expect((await ingestEvent(e)).incidentsAdded).toBe(0);
      expect(await prisma.eventParticipant.count({ where: { eventId: first.eventId } })).toBe(2);
      const state = await getStateAt(first.eventId, new Date("2030-01-02T00:00:00Z"), new Date("2030-01-02T00:00:00Z"));
      expect(state).toMatchObject({ legalBalls: 3, runs: 11, wickets: 1 });
    });
  });
});
