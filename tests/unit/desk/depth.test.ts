import { describe, expect, it } from "vitest";
import { DEPTHS, depthTemplate, itemFacts, phraseItem, snapshotOf } from "@/domain/desk/service";
import { deskBrief } from "@/domain/desk/service";
import { generateVerified } from "@/llm/verified";
import { verifyClaims, type Claims, type LlmProvider } from "@/llm";

const { items } = deskBrief();

describe("depth switch (depth)", () => {
  it("every item has deterministic, verifier-passing templates at all three depths", () => {
    expect(DEPTHS).toEqual(["quick", "tactical", "analyst"]);
    for (const it of items) {
      const facts = itemFacts(it);
      const sizes = DEPTHS.map((d) => {
        const c = depthTemplate(d, it)(facts);
        expect(verifyClaims(c.claims, facts, snapshotOf(it)), `${it.id} ${d}`).toEqual({ ok: true, rejections: [] });
        expect(depthTemplate(d, it)(facts)).toEqual(c);
        return c.claims.length;
      });
      expect(sizes[0]).toBe(1);
      expect(sizes[1]).toBeGreaterThanOrEqual(sizes[0]);
      expect(sizes[2]).toBeGreaterThan(sizes[1]);
    }
  });

  it("depth changes the wording, never the numbers' sources", () => {
    const top = items[0];
    const [quick, tactical, analyst] = DEPTHS.map((d) => depthTemplate(d, top)(itemFacts(top)).claims.map((c) => c.text).join(" "));
    expect(new Set([quick, tactical, analyst]).size).toBe(3);
    expect(tactical).toMatch(new RegExp(`from ${Math.round((top.swing?.from ?? 0) * 100)}% to ${Math.round((top.swing?.to ?? 0) * 100)}%`));
    expect(analyst).toMatch(/Exact chase WP on outcome model v1/);
    const football = items.find((i) => i.sport === "football");
    expect(football).toBeDefined();
    expect(depthTemplate("tactical", football!)(itemFacts(football!)).claims.map((c) => c.text).join(" ")).toMatch(/isn’t modelled/);
  });

  it("phrasing without a model key is the template", async () => {
    const top = items[0];
    const r = await phraseItem(top, "tactical");
    expect(r.source).toBe("template");
    expect(r.claims).toEqual(depthTemplate("tactical", top)(itemFacts(top)));
  });

  it("optional model phrasing is used only when it passes the verifier", async () => {
    const top = items[0];
    const facts = itemFacts(top);
    const fake = (claims: Claims): LlmProvider => ({ name: "gemini", generate: async (req) => ({ output: req.schema.parse(claims), provider: "gemini", model: "fake", usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1, costUsd: 0 }) }) as LlmProvider;
    const req = { task: "desk.tactical", system: "s", facts, snapshotCutoff: snapshotOf(top), model: "fast" as const, template: depthTemplate("tactical", top) };
    const good = await generateVerified(fake({ claims: [{ text: `A ${Math.round((top.swing?.value ?? 0) * 100)}-point swing.`, kind: "MODEL_ESTIMATE", source_ids: ["swing_pts"] }] }), req, () => undefined);
    expect(good.source).toBe("model");
    const bad = await generateVerified(fake({ claims: [{ text: "A 99-point swing.", kind: "MODEL_ESTIMATE", source_ids: ["swing_pts"] }] }), req, () => undefined);
    expect(bad.source).toBe("template");
    expect(bad.claims).toEqual(depthTemplate("tactical", top)(facts));
  });
});

describe("Hindi depth templates (depth)", () => {
  it("every item × depth in Hindi passes the verifier, quoting the same numbers as English", () => {
    for (const it of items) for (const d of DEPTHS) {
      const facts = itemFacts(it, "hi");
      const hi = depthTemplate(d, it, "hi")(facts);
      expect(verifyClaims(hi.claims, facts, snapshotOf(it)), `${it.id} ${d}`).toEqual({ ok: true, rejections: [] });
      const nums = (c: Claims): string[] => c.claims.flatMap((x) => x.text.match(/\d+(\.\d+)?/g) ?? []).sort();
      expect(nums(hi)).toEqual(nums(depthTemplate(d, it, "en")(itemFacts(it, "en"))));
      expect(hi.claims.map((c) => c.source_ids)).toEqual(depthTemplate(d, it, "en")(itemFacts(it, "en")).claims.map((c) => c.source_ids));
    }
    const top = items[0];
    expect(depthTemplate("tactical", top, "hi")(itemFacts(top, "hi")).claims[0].text).toMatch(/की जीत की संभावना छह गेंदों में \d+% से \d+% हुई/);
  });
});
