import { describe, expect, it } from "vitest";
import { anomalyFlags, lockAllowed } from "@/engine/anticheat";

// Synthetic timings and call histories for testing the rules (not user data).
const t = (s: number) => new Date(Date.UTC(2026, 9, 23, 12, 0, s)).toISOString();

describe("anti-cheat basics (anticheat)", () => {
  it("feed-time locks: a live call must lock before the feed's cutoff; a historical moment never reveals before lock (D-040)", () => {
    expect(lockAllowed({ mode: "live", serverNow: t(10), feedCutoff: t(12) })).toEqual({ ok: true });
    expect(lockAllowed({ mode: "live", serverNow: t(12), feedCutoff: t(12) })).toEqual({ ok: true });
    expect(lockAllowed({ mode: "live", serverNow: t(13), feedCutoff: t(12) })).toEqual({ ok: false, reason: "The moment has passed: the feed shows the ball was bowled." });
    expect(lockAllowed({ mode: "historical", serverNow: t(99), feedCutoff: t(12) })).toEqual({ ok: true });
    expect(() => lockAllowed({ mode: "live", serverNow: "nope", feedCutoff: t(12) })).toThrow(RangeError);
  });

  it("flags anomalies without acting on them: burst locking, implausible streaks, always-maximum confidence", () => {
    const quiet = Array.from({ length: 12 }, (_, i) => ({ lockedAt: t(i * 30), confidence: 0.6 + (i % 3) * 0.1, hit: i % 2 === 0 }));
    expect(anomalyFlags(quiet)).toEqual([]);
    const burst = Array.from({ length: 10 }, (_, i) => ({ lockedAt: t(i * 2), confidence: 0.7, hit: i % 2 === 0 }));
    expect(anomalyFlags(burst).map((f) => f.kind)).toEqual(["burst"]);
    const streak = Array.from({ length: 15 }, (_, i) => ({ lockedAt: t(i * 60), confidence: 0.8, hit: true }));
    expect(anomalyFlags(streak).map((f) => f.kind)).toEqual(["streak"]);
    const maxed = Array.from({ length: 20 }, (_, i) => ({ lockedAt: t(i * 60), confidence: 0.99, hit: i % 2 === 0 }));
    expect(anomalyFlags(maxed).map((f) => f.kind)).toEqual(["max-confidence"]);
    expect(anomalyFlags(maxed)[0].detail).toBe("20 of 20 calls at 99% confidence.");
    // one call at 98% doesn't dodge the flag; a fan who varies confidence isn't flagged
    const mostly = maxed.map((c, i) => (i === 0 ? { ...c, confidence: 0.98 } : c));
    expect(anomalyFlags(mostly).map((f) => f.kind)).toEqual(["max-confidence"]);
    const varied = maxed.map((c, i) => (i < 3 ? { ...c, confidence: 0.7 } : c));
    expect(anomalyFlags(varied)).toEqual([]);
    expect(anomalyFlags([])).toEqual([]);
  });
});
