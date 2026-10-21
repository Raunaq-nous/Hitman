// LLM provider interface. Facts first, models second, language third: providers only phrase facts they are given.
import type { z } from "zod";

export type ModelTier = "fast" | "deep";

export interface GenerateRequest<T> {
  /** Stable task name, used for logging and template lookup (e.g. "desk.headline"). */
  task: string;
  system: string;
  input: unknown;
  schema: z.ZodType<T>;
  model: ModelTier;
  maxTokens: number;
  /** Deterministic output for the same input: used without a key and as the fallback when output fails checks. */
  template: (input: unknown) => T;
}

export interface Usage { inputTokens: number; outputTokens: number }

export interface GenerateResult<T> {
  output: T;
  provider: "gemini" | "template" | "mock";
  model: string;
  usage: Usage;
  latencyMs: number;
  /** null when no price is configured for the model (never guessed). */
  costUsd: number | null;
}

export interface LlmProvider {
  readonly name: GenerateResult<unknown>["provider"];
  generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>>;
}
