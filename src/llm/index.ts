// Pick the provider and log every call (task, provider, model, tokens, latency, cost). Never logs inputs or outputs.
import type { GenerateRequest, GenerateResult, LlmProvider } from "./provider";
import { TemplateProvider } from "./template";

export type { GenerateRequest, GenerateResult, LlmProvider, ModelTier } from "./provider";
export { TemplateProvider } from "./template";
export { GeminiProvider, type GeminiClient } from "./gemini";

export interface CallLog { task: string; provider: string; model: string; inputTokens: number; outputTokens: number; latencyMs: number; costUsd: number | null; fallback?: string }

/** Run a request on `provider`; on any failure (network, refusal, schema), fall back to the deterministic template. */
export async function generateWithFallback<T>(provider: LlmProvider, req: GenerateRequest<T>, log: (entry: CallLog) => void): Promise<GenerateResult<T>> {
  const record = (r: GenerateResult<T>, fallback?: string): GenerateResult<T> => {
    log({ task: req.task, provider: r.provider, model: r.model, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens, latencyMs: Math.round(r.latencyMs), costUsd: r.costUsd, ...(fallback ? { fallback } : {}) });
    return r;
  };
  try {
    return record(await provider.generate(req));
  } catch (e) {
    if (provider.name === "template") throw e;
    return record(await new TemplateProvider().generate(req), e instanceof Error ? e.message.slice(0, 120) : "error");
  }
}
export { CLAIM_KINDS, claimSchema, claimsSchema, type Claim, type ClaimKind, type Claims, type Fact } from "./contract";
export { verifyClaims, type Rejection, type Verdict } from "./verifier";
