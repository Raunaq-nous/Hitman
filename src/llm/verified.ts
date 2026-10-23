// Generate claims, verify them, and fall back to the deterministic template when the model's claims fail.
import { claimsSchema, type Claims, type Fact } from "./contract";
import { generateWithFallback, type CallLog } from "./index";
import type { LlmProvider, ModelTier } from "./provider";
import { verifyClaims, type Rejection } from "./verifier";

export interface VerifiedRequest {
  task: string;
  system: string;
  facts: Fact[];
  snapshotCutoff: string;
  model: ModelTier;
  /** Deterministic claims built from the same facts. */
  template: (facts: Fact[]) => Claims;
  extraInput?: Record<string, unknown>;
}

export interface VerifiedResult { claims: Claims; source: "model" | "template"; rejections: Rejection[] }

export async function generateVerified(provider: LlmProvider, req: VerifiedRequest, log: (e: CallLog) => void): Promise<VerifiedResult> {
  const input = { ...req.extraInput, snapshotCutoff: req.snapshotCutoff, facts: req.facts };
  const template = (): Claims => req.template(req.facts);
  const r = await generateWithFallback(provider, { task: req.task, system: req.system, input, schema: claimsSchema, model: req.model, maxTokens: 800, template }, log);
  const verdict = verifyClaims(r.output.claims, req.facts, req.snapshotCutoff);
  if (verdict.ok) return { claims: r.output, source: r.provider === "template" ? "template" : "model", rejections: [] };
  const fallback = template();
  const check = verifyClaims(fallback.claims, req.facts, req.snapshotCutoff);
  if (!check.ok) throw new Error(`template for ${req.task} fails verification: ${check.rejections.map((x) => x.reason).join("; ")}`);
  return { claims: fallback, source: "template", rejections: verdict.rejections };
}
