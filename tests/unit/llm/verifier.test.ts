import { describe, expect, it } from "vitest";
import { verifyClaims, type Claim, type Fact, type GeminiClient } from "@/llm";
import { GeminiProvider, TemplateProvider } from "@/llm";
import { generateVerified } from "@/llm/verified";

const CUTOFF = "2023-05-10T15:30:00Z";
const facts: Fact[] = [
  { id: "f1", value: 36, sourceId: "cricsheet", observedAt: "2023-05-10T15:20:00Z", kind: "OBSERVED" },
  { id: "f2", value: 12, sourceId: "cricsheet", observedAt: "2023-05-10T15:20:00Z", kind: "OBSERVED" },
  { id: "f3", value: 0.184, sourceId: "engine", observedAt: "2023-05-10T15:20:00Z", kind: "MODEL_ESTIMATE" },
  { id: "late", value: 41, sourceId: "cricsheet", observedAt: "2023-05-10T15:45:00Z", kind: "OBSERVED" },
  { id: "rr", value: "required rate 18.00", sourceId: "engine", observedAt: "2023-05-10T15:20:00Z", kind: "DERIVED" },
];
const claim = (c: Partial<Claim>): Claim => ({ text: "x", kind: "EDITORIAL", source_ids: [], ...c });

describe("claim verifier", () => {
  it("accepts sourced claims whose numbers come from the cited facts, with rounding tolerance", () => {
    const v = verifyClaims([
      claim({ text: "They needed 36 off 12 balls.", kind: "OBSERVED", source_ids: ["f1", "f2"] }),
      claim({ text: "The model gave them 18% (about 0.18).", kind: "MODEL_ESTIMATE", source_ids: ["f3"] }),
      claim({ text: "The required rate was 18.", kind: "DERIVED", source_ids: ["rr"] }),
      claim({ text: "A tense finish.", kind: "EDITORIAL" }),
    ], facts, CUTOFF);
    expect(v).toEqual({ ok: true, rejections: [] });
  });

  it("rejects OBSERVED and DERIVED claims without source_ids", () => {
    const v = verifyClaims([claim({ text: "A wicket fell.", kind: "OBSERVED" }), claim({ text: "Rate rose.", kind: "DERIVED" })], facts, CUTOFF);
    expect(v.rejections.map((r) => r.reason)).toEqual(["OBSERVED claim has no source_ids", "DERIVED claim has no source_ids"]);
  });

  it("rejects unknown source ids", () => {
    expect(verifyClaims([claim({ text: "Fine.", kind: "OBSERVED", source_ids: ["nope"] })], facts, CUTOFF).rejections[0].reason).toMatch(/unknown source_ids: nope/);
  });

  it("rejects fabricated numbers, including numbers sourced to the wrong fact and in editorial claims", () => {
    expect(verifyClaims([claim({ text: "They needed 37 off 12.", kind: "OBSERVED", source_ids: ["f1", "f2"] })], facts, CUTOFF).rejections.map((r) => r.reason)).toEqual(["number 37 is not in the referenced facts"]);
    expect(verifyClaims([claim({ text: "Needed 36.", kind: "OBSERVED", source_ids: ["f2"] })], facts, CUTOFF).ok).toBe(false);
    expect(verifyClaims([claim({ text: "Their 7th straight win.", kind: "EDITORIAL" })], facts, CUTOFF).ok).toBe(false);
    expect(verifyClaims([claim({ text: "Chance was 19%.", kind: "MODEL_ESTIMATE", source_ids: ["f3"] })], facts, CUTOFF).ok).toBe(false);
  });

  it("rejects claims about events after SNAPSHOT_CUTOFF", () => {
    expect(verifyClaims([claim({ text: "They reached 41.", kind: "OBSERVED", source_ids: ["late"] })], facts, CUTOFF).rejections[0].reason).toMatch(/after SNAPSHOT_CUTOFF/);
    expect(verifyClaims([claim({ text: "Later, on 2023-05-12, they won the final.", kind: "EDITORIAL" })], facts, CUTOFF).ok).toBe(false);
    expect(verifyClaims([claim({ text: "In 2024 they won.", kind: "EDITORIAL" })], facts, CUTOFF).ok).toBe(false);
    // a date before the cutoff is fine
    expect(verifyClaims([claim({ text: "Earlier, on 2023-05-01, they lost.", kind: "EDITORIAL" })], facts, CUTOFF).ok).toBe(true);
  });
});

describe("verified generation with template fallback", () => {
  const template = (f: Fact[]) => ({ claims: [{ text: `Needed ${f[0].value} off ${f[1].value} balls.`, kind: "OBSERVED" as const, source_ids: ["f1", "f2"] }] });
  const base = { task: "desk.brief", system: "s", facts, snapshotCutoff: CUTOFF, model: "fast" as const, template };
  const client = (text: string): GeminiClient => ({ models: { generateContent: async () => ({ text }) } });

  it("keeps verified model output", async () => {
    const good = JSON.stringify({ claims: [{ text: "36 needed from 12.", kind: "OBSERVED", source_ids: ["f1", "f2"] }] });
    const r = await generateVerified(new GeminiProvider({ client: client(good), models: { fast: "f", deep: "d" } }), base, () => undefined);
    expect(r).toMatchObject({ source: "model", rejections: [] });
    expect(r.claims.claims[0].text).toBe("36 needed from 12.");
  });

  it("falls back to the template when the model fabricates a number", async () => {
    const bad = JSON.stringify({ claims: [{ text: "They needed 40 off 12.", kind: "OBSERVED", source_ids: ["f1", "f2"] }] });
    const r = await generateVerified(new GeminiProvider({ client: client(bad), models: { fast: "f", deep: "d" } }), base, () => undefined);
    expect(r.source).toBe("template");
    expect(r.claims.claims[0].text).toBe("Needed 36 off 12 balls.");
    expect(r.rejections[0].reason).toMatch(/number 40/);
  });

  it("template path without a key, and a broken template is a bug, not silently shown", async () => {
    expect((await generateVerified(new TemplateProvider(), base, () => undefined)).source).toBe("template");
    const broken = { ...base, template: () => ({ claims: [{ text: "Needed 99.", kind: "OBSERVED" as const, source_ids: ["f1"] }] }) };
    await expect(generateVerified(new TemplateProvider(), broken, () => undefined)).rejects.toThrow(/fails verification/);
  });
});
