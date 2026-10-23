import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { completedOvers, tryParseOvers } from "@/engine/legalBalls";

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});

// Decimal-overs arithmetic: parseFloat/Number on an overs value, or dividing/multiplying something named overs.
const DECIMAL_OVERS = /(parseFloat|Number)\(\s*[\w.?]*overs[\w.]*\s*\)|\b\w*[oO]vers\b\s*[*/]\s*\d|\d\s*[*/]\s*\w*[oO]vers\b|split\(["']\.["']\)/;

describe("legalBalls used everywhere", () => {
  it("lenient parsing and completed overs", () => {
    expect([tryParseOvers("10.4"), tryParseOvers("19.6"), tryParseOvers(undefined), tryParseOvers(null)]).toEqual([64, null, null, null]);
    expect([completedOvers(64), completedOvers(60), completedOvers(5)]).toEqual([10, 10, 0]);
  });

  it("no decimal-overs arithmetic outside src/engine/legalBalls.ts", () => {
    const offenders = walk("src")
      .filter((f) => !f.endsWith(join("engine", "legalBalls.ts")))
      .flatMap((f) => readFileSync(f, "utf8").split("\n").map((line, i) => ({ f, i: i + 1, line })))
      .filter(({ line }) => DECIMAL_OVERS.test(line))
      .map(({ f, i, line }) => `${f}:${i}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});
