import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDrCheck } from "../../../scripts/dr-check";

// data/models/dr-check-v1.json: the offline doubly robust check on real IPL death overs (npm run model:dr).
const file = JSON.parse(readFileSync("data/models/dr-check-v1.json", "utf8")) as { hash: string } & ReturnType<typeof buildDrCheck>;

describe("offline doubly robust check of scenario estimates (dr)", () => {
  it("is versioned and reproducible from the committed data and models", () => {
    const { hash, ...rest } = file;
    expect(createHash("sha256").update(JSON.stringify(rest)).digest("hex")).toBe(hash);
    expect(buildDrCheck()).toEqual(rest);
  });

  it("logs real decisions with valid propensities and reports the disagreement with its interval", () => {
    expect(file.loggedDecisions).toBe(file.pace + file.spin);
    expect(file.pace).toBeGreaterThan(0);
    expect(file.spin).toBeGreaterThan(0);
    for (const a of ["pace", "spin"] as const) {
      const e = file.estimates[a];
      expect(e.disagreementPts).toBeCloseTo((e.dr - e.model) * 100, 1);
      expect(e.ci95Pts[0]).toBeLessThanOrEqual(e.ci95Pts[1]);
    }
    expect(file.note).toMatch(/never shown as what would have happened/);
    expect(file.status).toBe("exploratory");
  });
});
