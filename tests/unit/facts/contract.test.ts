import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { checkCricketContract } from "@/domain/facts/contract";

const FIX = "data/fixtures/cricsheet";
const fixtures = existsSync(FIX) ? readdirSync(FIX).filter((f) => /^\d+\.json$/.test(f)) : [];
const load = (f: string) => parseCricsheet(JSON.parse(readFileSync(`${FIX}/${f}`, "utf8")), f.replace(".json", ""));

describe("data contract on real Cricsheet fixtures", () => {
  it("has at least 5 fixtures including a tie and a rain-affected match", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
    const outcomes = fixtures.map((f) => load(f).outcome);
    expect(outcomes.some((o) => o.result === "tie")).toBe(true);
    expect(outcomes.some((o) => typeof o.method === "string")).toBe(true);
  });

  it("every fixture passes ordering, legal-ball, wicket and winner checks", () => {
    for (const f of fixtures) expect(checkCricketContract(load(f)).violations, f).toEqual([]);
  });

  it("rain-affected and tied-then-super-over matches are handled; rain-affected chases are excluded", () => {
    for (const f of fixtures) {
      const e = load(f);
      const r = checkCricketContract(e);
      if (typeof e.outcome.method === "string") {
        expect(r.chaseEligible, f).toBe(false);
        expect(r.reasons.join(" "), f).toMatch(/rain-affected/);
      }
      if (e.outcome.result === "tie") expect(r.ok, f).toBe(true);
    }
  });

  it("detects broken data: reordered deliveries, too many legal balls, wrong winner", () => {
    const e = load(fixtures.find((f) => load(f).outcome.winner && !load(f).outcome.method) as string);
    const swapped = { ...e, incidents: [e.incidents[1], e.incidents[0], ...e.incidents.slice(2)] };
    expect(checkCricketContract(swapped).violations.join(" ")).toMatch(/out of order/);
    const loser = (e.participants.find((p) => p.name !== e.outcome.winner) as { name: string }).name;
    expect(checkCricketContract({ ...e, outcome: { winner: loser } }).violations.join(" ")).toMatch(/disagrees with totals/);
    const extraLegal = { ...e, incidents: [...e.incidents, { ...e.incidents[5], sourceRef: "x" }] };
    expect(checkCricketContract(extraLegal, 20).violations.length).toBeGreaterThan(0);
  });
});
