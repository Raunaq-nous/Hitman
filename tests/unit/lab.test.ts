import { describe, expect, it } from "vitest";
import { getMoment, listMoments, storedMoment } from "@/domain/lab/service";

describe("lab moments before lock", () => {
  it("lists the fifty golden moments, highest leverage first", () => {
    const ms = listMoments();
    expect(ms).toHaveLength(50);
    for (let i = 1; i < ms.length; i++) expect(ms[i - 1].leverage).toBeGreaterThanOrEqual(ms[i].leverage);
  });

  it("never exposes the reveal or the model's answer before lock", () => {
    for (const m of listMoments()) {
      const json = JSON.stringify(m);
      for (const k of ["reveal", "chaseWon", "winner", "wp", "best", "gapPts", "matchId", "date"]) expect(json).not.toContain(`"${k}"`);
      expect(m.options.length).toBeGreaterThanOrEqual(2);
      expect(m.overs).toMatch(/^\d+\.\d$/);
    }
    const id = listMoments()[0].id;
    expect(getMoment(id)?.id).toBe(id);
    expect(getMoment("nope")).toBeNull();
    // the server keeps the full record for locking and grading
    expect(storedMoment(id)?.reveal).toBeDefined();
    expect(storedMoment("nope")).toBeNull();
  });
});
