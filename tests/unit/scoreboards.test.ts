import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildScoreboards } from "@/domain/scoreboards/service";
import { resetDb } from "../helpers/db";

describe("admin scoreboards", () => {
  beforeAll(async () => {
    await resetDb();
    const now = new Date();
    await prisma.llmCall.createMany({ data: [
      { task: "t", provider: "gemini", model: "m", inputTokens: 100, outputTokens: 20, latencyMs: 300, costUsd: 0.0002, verified: true, createdAt: now },
      { task: "t", provider: "template", model: "template", inputTokens: 0, outputTokens: 0, latencyMs: 1, costUsd: 0, fallback: "number 40 is not in the referenced facts", verified: false, createdAt: now },
      { task: "t", provider: "template", model: "template", inputTokens: 0, outputTokens: 0, latencyMs: 1, costUsd: 0, verified: null, createdAt: now },
    ] });
  });

  it("builds Trust, Product, Learning and Business with honest empty states", async () => {
    const s = await buildScoreboards();
    expect(s.trust.verifierPassRate).toEqual({ passed: 1, checked: 2, value: 0.5 });
    expect(s.trust.freshness).toEqual([]);
    expect(s.product.week.reviewToNextRead.value).toBeNull();
    expect(s.learning.calibration).toMatch(/No graded calls yet/);
    expect(s.business.arpu).toMatch(/no revenue/);
    expect(s.business.modelCostPerRead).toEqual({ reads: 3, pricedReads: 3, usd: 0.0002 / 3 });
  });

  it("model calls are persisted without prompt or output text", async () => {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'LlmCall'`;
    expect(cols.map((c) => c.column_name).filter((c) => /prompt|text|content|^output$|^input$/i.test(c))).toEqual([]);
  });
});
