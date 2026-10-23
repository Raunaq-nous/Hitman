import { describe, expect, it } from "vitest";
import { clutchLeverage, basketballWp } from "@/engine/basketball";
import { degradation, pitWindow } from "@/engine/f1";

// Synthetic lap times and game states for testing the maths (not real data).
describe("persona tool maths", () => {
  it("F1 degradation: least-squares seconds lost per lap, ignoring pit-out laps and outliers", () => {
    const laps = [95.0, 95.1, 95.2, 95.3, 120.0, 95.5].map((s, i) => ({ lap: i + 1, seconds: s, pitOut: false }));
    expect(degradation(laps).slopePerLap).toBeCloseTo(0.1, 6);
    expect(degradation(laps).used).toBe(5);
    expect(degradation([{ lap: 1, seconds: 90, pitOut: false }]).slopePerLap).toBe(0);
  });

  it("F1 pit window: opens on the lap when cumulative tyre loss passes the pit-lane loss", () => {
    // 0.5 s/lap: loss after k laps = 0.5·k(k+1)/2 ≥ 20 → k = 9 (22.5 s)
    expect(pitWindow({ slopePerLap: 0.5, stintStartLap: 10, pitLossSeconds: 20 })).toEqual({ opensOnLap: 19, lapsIntoStint: 9, lossAtOpen: 22.5 });
    expect(pitWindow({ slopePerLap: 0, stintStartLap: 1, pitLossSeconds: 20 })).toBeNull();
    expect(() => pitWindow({ slopePerLap: 0.1, stintStartLap: 1, pitLossSeconds: 0 })).toThrow(RangeError);
  });

  it("basketball WP: 50% when level, rises with the lead, sharper late; clutch leverage is biggest in a close, late game", () => {
    expect(basketballWp(0, 600)).toBeCloseTo(0.5, 6);
    expect(basketballWp(5, 600)).toBeGreaterThan(basketballWp(2, 600));
    expect(basketballWp(3, 30)).toBeGreaterThan(basketballWp(3, 1800));
    expect(basketballWp(-3, 0)).toBe(0);
    expect(basketballWp(3, 0)).toBe(1);
    expect(basketballWp(0, 0)).toBe(0.5);
    expect(clutchLeverage(1, 30)).toBeGreaterThan(clutchLeverage(1, 1800));
    expect(clutchLeverage(1, 30)).toBeGreaterThan(clutchLeverage(15, 30));
    expect(() => basketballWp(0, -1)).toThrow(RangeError);
  });
});
