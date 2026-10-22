// The LLM enters domains here. Gemini only when GEMINI_API_KEY is set and never under test; templates otherwise.
import { GoogleGenAI } from "@google/genai";
import { GeminiProvider, generateWithFallback, TemplateProvider, type GeminiClient, type GenerateRequest, type GenerateResult, type LlmProvider } from "@/llm";
import { env } from "./env";
import { log } from "./log";

let provider: LlmProvider | undefined;

const price = (input?: string, output?: string) => (input && output ? { inputPerMTok: Number(input), outputPerMTok: Number(output) } : undefined);

export function llmProvider(): LlmProvider {
  if (provider) return provider;
  const e = env();
  if (e.LLM_ENABLED && e.NODE_ENV !== "test" && e.GEMINI_MODEL_FAST && e.GEMINI_MODEL_DEEP) {
    const client = new GoogleGenAI({ apiKey: e.GEMINI_API_KEY }) as unknown as GeminiClient;
    provider = new GeminiProvider({
      client,
      models: { fast: e.GEMINI_MODEL_FAST, deep: e.GEMINI_MODEL_DEEP },
      prices: { fast: price(process.env.GEMINI_PRICE_FAST_IN, process.env.GEMINI_PRICE_FAST_OUT), deep: price(process.env.GEMINI_PRICE_DEEP_IN, process.env.GEMINI_PRICE_DEEP_OUT) },
    });
  } else {
    provider = new TemplateProvider();
  }
  return provider;
}

type Entry = Parameters<Parameters<typeof generateWithFallback>[2]>[0];

/** Log and persist one call (no prompt or output text). Persistence failures never break generation. */
function record(entry: Entry, verified: boolean | null = null): void {
  log.info("llm call", { ...entry, verified });
  void import("@/lib/prisma")
    .then(({ prisma }) => prisma.llmCall.create({ data: { task: entry.task, provider: entry.provider, model: entry.model, inputTokens: entry.inputTokens, outputTokens: entry.outputTokens, latencyMs: entry.latencyMs, costUsd: entry.costUsd, fallback: entry.fallback ?? null, verified } }))
    .catch((e: unknown) => log.warn("llm call not persisted", { error: e instanceof Error ? e.message : String(e) }));
}

export function generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
  return generateWithFallback(llmProvider(), req, (entry) => record(entry));
}

export type { Claims, Fact } from "@/llm";
export type { VerifiedRequest, VerifiedResult } from "@/llm/verified";
export { PRODUCTION_PROMPT } from "@/llm/prompts/production";

/** Verified, sourced claims for the given facts (model phrasing when enabled, deterministic template otherwise). */
export async function generateClaims(req: import("@/llm/verified").VerifiedRequest): Promise<import("@/llm/verified").VerifiedResult> {
  const { generateVerified } = await import("@/llm/verified");
  let entry: Entry | undefined;
  const result = await generateVerified(llmProvider(), req, (e) => { entry = e; });
  // verified = did the model's own claims pass the verifier (null when no model ran)
  if (entry) record(entry, entry.provider === "template" ? null : result.source === "model");
  return result;
}
export { verifyClaims } from "@/llm/verifier";

export { retrieve } from "@/llm/retrieval";
export type { RetrievedText } from "@/llm/prompt";
