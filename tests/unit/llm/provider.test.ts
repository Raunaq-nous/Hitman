import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GeminiProvider, generateWithFallback, TemplateProvider, type CallLog, type GeminiClient, type GenerateRequest, type LlmProvider } from "@/llm";

const schema = z.object({ headline: z.string().min(1) });
const req: GenerateRequest<z.infer<typeof schema>> = {
  task: "desk.headline", system: "Phrase the facts.", input: { runs: 36, balls: 12 }, schema, model: "fast", maxTokens: 200,
  template: (i) => ({ headline: `Needed ${(i as { runs: number }).runs} off ${(i as { balls: number }).balls}` }),
};

function fakeClient(text: string | undefined, usage = { promptTokenCount: 120, candidatesTokenCount: 30 }): GeminiClient & { calls: unknown[] } {
  const calls: unknown[] = [];
  return { calls, models: { generateContent: async (args) => { calls.push(args); return { text, usageMetadata: usage }; } } };
}

describe("llm provider", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

  it("TemplateProvider is deterministic and free", async () => {
    const t = new TemplateProvider();
    const [a, b] = [await t.generate(req), await t.generate(req)];
    expect(a.output).toEqual({ headline: "Needed 36 off 12" });
    expect(b.output).toEqual(a.output);
    expect(a).toMatchObject({ provider: "template", costUsd: 0, usage: { inputTokens: 0, outputTokens: 0 } });
  });

  it("GeminiProvider sends structured JSON requests with the env model id and reports tokens, latency and cost", async () => {
    const client = fakeClient(JSON.stringify({ headline: "36 needed from 12 balls" }));
    const g = new GeminiProvider({ client, models: { fast: "model-fast-id", deep: "model-deep-id" }, prices: { fast: { inputPerMTok: 1, outputPerMTok: 4 } } });
    const r = await g.generate(req);
    expect(r).toMatchObject({ output: { headline: "36 needed from 12 balls" }, provider: "gemini", model: "model-fast-id", usage: { inputTokens: 120, outputTokens: 30 } });
    expect(r.costUsd).toBeCloseTo((120 * 1 + 30 * 4) / 1e6, 12);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(client.calls[0]).toMatchObject({ model: "model-fast-id", config: { systemInstruction: "Phrase the facts.", responseMimeType: "application/json", maxOutputTokens: 200 } });
    expect((client.calls[0] as { config: { responseJsonSchema: { type: string } } }).config.responseJsonSchema.type).toBe("object");
  });

  it("cost is null (not guessed) when no price is configured", async () => {
    const g = new GeminiProvider({ client: fakeClient('{"headline":"x"}'), models: { fast: "f", deep: "d" } });
    expect((await g.generate({ ...req, model: "deep" })).costUsd).toBeNull();
    expect((await g.generate({ ...req, model: "deep" })).model).toBe("d");
  });

  it("requires model ids from env", () => {
    expect(() => new GeminiProvider({ client: fakeClient("{}"), models: { fast: "", deep: "d" } })).toThrow(/GEMINI_MODEL_FAST/);
  });

  it("falls back to the template on empty, invalid or failing output, and logs every call", async () => {
    const logs: CallLog[] = [];
    for (const client of [fakeClient(undefined), fakeClient('{"headline":""}'), fakeClient("not json")]) {
      const r = await generateWithFallback(new GeminiProvider({ client, models: { fast: "f", deep: "d" } }), req, (l) => logs.push(l));
      expect(r.output).toEqual({ headline: "Needed 36 off 12" });
      expect(r.provider).toBe("template");
    }
    const throwing: LlmProvider = { name: "gemini", generate: async () => { throw new Error("network down"); } };
    await generateWithFallback(throwing, req, (l) => logs.push(l));
    expect(logs).toHaveLength(4);
    expect(logs.every((l) => l.task === "desk.headline" && l.fallback)).toBe(true);
    expect(JSON.stringify(logs)).not.toContain("36 off 12");
    const ok: CallLog[] = [];
    await generateWithFallback(new TemplateProvider(), req, (l) => ok.push(l));
    expect(ok[0]).toMatchObject({ provider: "template", inputTokens: 0, outputTokens: 0, costUsd: 0 });
    await expect(generateWithFallback(new TemplateProvider(), { ...req, template: () => ({ headline: "" }) }, () => undefined)).rejects.toThrow();
  });

  it("uses templates without a key and never builds a network client under test, even with a key", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("GEMINI_API_KEY", "");
    const a = await import("@/providers/llm");
    expect(a.llmProvider().name).toBe("template");
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL_FAST", "f");
    vi.stubEnv("GEMINI_MODEL_DEEP", "d");
    const b = await import("@/providers/llm");
    expect(b.llmProvider().name).toBe("template");
    expect((await b.generate(req)).output.headline).toBe("Needed 36 off 12");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
