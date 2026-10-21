import type { GenerateRequest, GenerateResult, LlmProvider } from "./provider";

/** Deterministic templates: the default without GEMINI_API_KEY, and the fallback whenever generated text fails checks. */
export class TemplateProvider implements LlmProvider {
  readonly name = "template" as const;

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const t0 = performance.now();
    const output = req.schema.parse(req.template(req.input));
    return { output, provider: "template", model: "template", usage: { inputTokens: 0, outputTokens: 0 }, latencyMs: performance.now() - t0, costUsd: 0 };
  }
}
