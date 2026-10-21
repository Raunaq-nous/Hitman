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

export function generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
  return generateWithFallback(llmProvider(), req, (entry) => log.info("llm call", { ...entry }));
}
