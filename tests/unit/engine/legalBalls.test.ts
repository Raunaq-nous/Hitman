import { describe, expect, it } from "vitest";
import { formatOvers, parseOvers, requiredRunRate, runRate } from "@/engine/legalBalls";

describe("legal balls", () => {
  it("parses 10.4 overs as 64 legal balls", () => {
    expect(parseOvers("10.4")).toBe(64);
    expect(parseOvers(10.4)).toBe(64);
    expect(parseOvers("20")).toBe(120);
    expect(parseOvers(" 0.1 ")).toBe(1);
  });
  it("rejects impossible overs", () => {
    expect(() => parseOvers("10.6")).toThrow(RangeError);
    expect(() => parseOvers("ten")).toThrow(/expected whole overs/);
    expect(() => parseOvers("-1")).toThrow(RangeError);
  });
  it("formats legal balls as overs", () => {
    expect(formatOvers(64)).toBe("10.4");
    expect(formatOvers(60)).toBe("10");
    expect(formatOvers(0)).toBe("0");
    expect(() => formatOvers(1.5)).toThrow(RangeError);
    expect(() => formatOvers(-1)).toThrow(RangeError);
  });
  it("round-trips every ball of an innings", () => {
    for (let b = 0; b <= 120; b++) expect(parseOvers(formatOvers(b))).toBe(b);
  });
  it("computes run rate on legal balls: 85 off 64 ≈ 7.97", () => {
    expect(runRate(85, 64)).toBeCloseTo(7.97, 2);
    expect(runRate(0, 0)).toBeNull();
    expect(() => runRate(-1, 6)).toThrow(RangeError);
    expect(() => runRate(1, -6)).toThrow(RangeError);
  });
  it("computes required run rate", () => {
    expect(requiredRunRate(36, 24)).toBe(9);
    expect(requiredRunRate(-3, 6)).toBe(0);
    expect(requiredRunRate(10, 0)).toBeNull();
    expect(() => requiredRunRate(10, -1)).toThrow(RangeError);
  });
});
