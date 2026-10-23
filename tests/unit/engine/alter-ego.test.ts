import { describe, expect, it } from "vitest";
import { alterEgo, REVEAL_AFTER, type IdentityCall } from "@/engine/alterEgo";

// Synthetic call histories for testing the identity rules (not user data).
const base: IdentityCall = { relation: "current", phase: "death", decisionType: "next-over-intent", sport: "cricket", confidence: 0.6, hit: true, leverage: 0.06, withCrowd: null };
const calls = (n: number, f: (i: number) => Partial<IdentityCall>): IdentityCall[] => Array.from({ length: n }, (_, i) => ({ ...base, ...f(i) }));

describe("Alter Ego identity model (alter-ego)", () => {
  it("stays hidden until 10 graded calls", () => {
    expect(REVEAL_AFTER).toBe(10);
    expect(alterEgo(calls(9, () => ({})))).toEqual({ revealed: false, graded: 9, remaining: 1 });
  });

  it("is deterministic and explains every axis with its evidence", () => {
    const h = calls(12, (i) => ({ relation: i < 9 ? "higher" : "current", hit: i % 3 !== 0, phase: i % 2 ? "middle" : "death" }));
    const a = alterEgo(h), b = alterEgo([...h]);
    expect(a).toEqual(b);
    if (!a.revealed) throw new Error("should be revealed");
    expect(a.axes.map((x) => x.key)).toEqual(["risk", "timing", "calibration", "contrarianism", "domainMix"]);
    for (const x of a.axes) {
      expect(x.explanation.length).toBeGreaterThan(10);
      if (x.value !== null) { expect(x.value).toBeGreaterThanOrEqual(0); expect(x.value).toBeLessThanOrEqual(1); }
    }
    expect(a.axes[0]).toMatchObject({ value: 0.75, n: 12 });
    expect(a.axes[0].explanation).toBe("You backed the faster-scoring option in 9 of 12 calls.");
    // no crowd data yet: contrarianism is unknown, not guessed
    expect(a.axes[3]).toMatchObject({ value: null, n: 0 });
    expect(a.persona.name).toMatch(/^The (Opener|Closer|Architect|Professor|Iceman)$/);
    expect(a.label).toBe(`${a.persona.name} · ${a.modifier}`);
    expect(a.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("maps calling styles to personas: risk → Professor, death-over timing → Opener, tempo → Architect, calibration → Iceman, clutch → Closer", () => {
    const risky = alterEgo(calls(10, (i) => ({ relation: "higher", hit: i % 4 < 2, phase: i % 2 ? "middle" : "death", confidence: 0.99 })));
    expect(risky.revealed && risky.persona.slug).toBe("professor");
    expect(risky.revealed && risky.modifier).toBe("Bold");
    const timing = alterEgo(calls(12, (i) => ({ phase: i < 6 ? "death" : "middle", hit: i < 6, relation: i % 2 ? "higher" : "current", confidence: 0.75 })));
    expect(timing.revealed && timing.persona.slug).toBe("opener");
    const tempo = alterEgo(calls(10, (i) => ({ decisionType: "chase-tempo", hit: i < 7, relation: i % 2 ? "higher" : "current", phase: i % 2 ? "middle" : "death", confidence: 0.85 })));
    expect(tempo.revealed && tempo.persona.slug).toBe("architect");
    const cool = alterEgo(calls(10, (i) => ({ hit: i < 6, confidence: 0.6, relation: i % 2 ? "higher" : "current", phase: i % 2 ? "middle" : "death", decisionType: i % 2 ? "chase-tempo" : "next-over-intent" })));
    expect(cool.revealed && cool.persona.slug).toBe("iceman");
    const clutch = alterEgo(calls(10, (i) => ({ leverage: i < 5 ? 0.2 : 0.05, hit: i < 5, relation: i % 2 ? "higher" : "current", phase: i % 2 ? "middle" : "death", decisionType: i % 2 ? "chase-tempo" : "next-over-intent", confidence: 0.9 })));
    expect(clutch.revealed && clutch.persona.slug).toBe("closer");
  });

  it("calls you Contrarian when you often go against the crowd", () => {
    const c = alterEgo(calls(10, (i) => ({ withCrowd: i >= 8, relation: i % 2 ? "higher" : "current" })));
    expect(c.revealed && c.axes[3]).toMatchObject({ value: 0.8, n: 10 });
    expect(c.revealed && c.modifier).toBe("Contrarian");
  });

  it("modifiers: Steady for safe pickers, Sharp for well-calibrated ones, Balanced otherwise; any decision type or sport", () => {
    const steady = alterEgo(calls(10, (i) => ({ relation: i < 2 ? "higher" : "current", decisionType: i < 5 ? "future-type" : "next-over-intent", sport: i < 5 ? "cricket" : "tennis" })));
    expect(steady.revealed && steady.modifier).toBe("Steady");
    expect(steady.revealed && steady.axes[4].explanation).toBe("5 of 10 calls were future-type decisions, across 2 sports.");
    const sharp = alterEgo(calls(10, (i) => ({ relation: i % 2 ? "higher" : "current", hit: i < 7, confidence: 0.7 })));
    expect(sharp.revealed && sharp.modifier).toBe("Sharp");
    const balanced = alterEgo(calls(10, (i) => ({ relation: i % 2 ? "higher" : "current", hit: i < 2, confidence: 0.9 })));
    expect(balanced.revealed && balanced.modifier).toBe("Balanced");
    expect(balanced.revealed && balanced.evidence[1]).toBe("Balanced: no single habit dominates your calls.");
  });

  it("never names a persona on no evidence: timing needs 3 calls per phase, and with no standout trait the file opens with the sport's analyst", () => {
    // one lucky middle-over call against a mixed death-over record: timing isn't judged on a sample of one
    const one = alterEgo(calls(10, (i) => ({ phase: i === 0 ? "middle" : "death", hit: i === 0 || i % 2 === 0, confidence: 0.9 })));
    expect(one.revealed && one.axes[1]).toMatchObject({ value: null, explanation: "Needs at least 3 calls in both the middle and the death overs." });
    // cautious, poorly calibrated, all death-over intent calls: no trait scores
    const flat = alterEgo(calls(10, (i) => ({ hit: i < 3, confidence: 0.9 })));
    expect(flat.revealed && flat.persona.slug).toBe("opener");
    expect(flat.revealed && flat.evidence[0]).toBe("No single trait stands out yet, so your file opens with The Opener, the analyst of the sport you call most.");
    const other = alterEgo(calls(10, (i) => ({ hit: i < 3, confidence: 0.9, sport: i < 6 ? "chess" : "tennis" })));
    expect(other.revealed && other.persona.slug).toBe("opener");
    const tennis = alterEgo(calls(10, (i) => ({ hit: i < 3, confidence: 0.9, sport: "tennis" })));
    expect(tennis.revealed && tennis.persona.slug).toBe("iceman");
    // a 50%-always caller is calibrated but not sharp: not The Iceman
    const coin = alterEgo(calls(10, (i) => ({ hit: i < 5, confidence: 0.5, relation: i % 2 ? "higher" : "current" })));
    expect(coin.revealed && coin.persona.slug).not.toBe("iceman");
    expect(coin.revealed && coin.modifier).toBe("Balanced");
  });
});
