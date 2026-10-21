// Gemini via @google/genai. Structured JSON output, parsed with the request's Zod schema.
import { z } from "zod";
import type { GenerateRequest, GenerateResult, LlmProvider, ModelTier } from "./provider";

/** The subset of the @google/genai client we use (injectable so tests never touch the network). */
export interface GeminiClient {
  models: {
    generateContent(args: {
      model: string;
      contents: string;
      config: { systemInstruction: string; responseMimeType: string; responseJsonSchema: unknown; maxOutputTokens: number; temperature: number };
    }): Promise<{ text?: string; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }>;
  };
}

/** USD per million tokens, from env; when unset the cost is reported as null rather than guessed. */
export interface Prices { inputPerMTok: number; outputPerMTok: number }

export interface GeminiOptions {
  client: GeminiClient;
  models: Record<ModelTier, string>;
  prices?: Partial<Record<ModelTier, Prices>>;
}

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini" as const;

  constructor(private readonly opts: GeminiOptions) {
    for (const tier of ["fast", "deep"] as const) if (!opts.models[tier]) throw new Error(`GEMINI_MODEL_${tier.toUpperCase()} is not set`);
  }

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const model = this.opts.models[req.model];
    const t0 = performance.now();
    const res = await this.opts.client.models.generateContent({
      model,
      contents: JSON.stringify({ task: req.task, input: req.input }),
      config: { systemInstruction: req.system, responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(req.schema), maxOutputTokens: req.maxTokens, temperature: 0.2 },
    });
    const latencyMs = performance.now() - t0;
    if (!res.text) throw new Error(`Gemini returned no text for ${req.task}`);
    const output = req.schema.parse(JSON.parse(res.text));
    const usage = { inputTokens: res.usageMetadata?.promptTokenCount ?? 0, outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0 };
    const price = this.opts.prices?.[req.model];
    const costUsd = price ? (usage.inputTokens * price.inputPerMTok + usage.outputTokens * price.outputPerMTok) / 1e6 : null;
    return { output, provider: "gemini", model, usage, latencyMs, costUsd };
  }
}
