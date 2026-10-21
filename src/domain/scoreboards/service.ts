// The four scoreboards (Trust, Product, Learning, Business). Admin only. Honest "no data yet" instead of zeros.
import { kpisForWeek } from "@/domain/analytics/service";
import type { WeeklyKpis } from "@/domain/analytics/kpi";
import * as repo from "./repo";

export interface Scoreboards {
  generatedAt: string;
  trust: { freshness: { sourceId: string; lastObservedAt: string; incidents: number }[]; corrections: number; leakageTests: string; verifierPassRate: { passed: number; checked: number; value: number | null } };
  product: { week: WeeklyKpis };
  learning: { calibration: string; comprehension: string };
  business: { arpu: string; dataCostPerUser: string; modelCostPerRead: { reads: number; pricedReads: number; usd: number | null }; users: number };
}

export async function buildScoreboards(now: Date = new Date()): Promise<Scoreboards> {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const [fresh, corrections, calls, week, users] = await Promise.all([repo.latestIncidentBySource(), repo.correctionCount(), repo.llmStats(since), kpisForWeek(now, now), repo.userCount()]);
  const checked = calls.filter((c) => c.verified !== null);
  const priced = calls.filter((c) => c.costUsd !== null);
  return {
    generatedAt: now.toISOString(),
    trust: {
      freshness: fresh.map((f) => ({ sourceId: f.sourceId, lastObservedAt: f._max.observedAt?.toISOString() ?? "", incidents: f._count._all })),
      corrections,
      leakageTests: "Run in CI on every push (tests named “leakage”); see the latest CI run.",
      verifierPassRate: { passed: checked.filter((c) => c.verified).length, checked: checked.length, value: checked.length ? checked.filter((c) => c.verified).length / checked.length : null },
    },
    product: { week },
    learning: {
      calibration: "No graded calls yet: the Decision Lab opens once Cricsheet data is ingested.",
      comprehension: "Comprehension prompts are not collected yet.",
    },
    business: {
      arpu: "Not applicable: ALTER EGO is free and has no revenue.",
      dataCostPerUser: "Not tracked yet: all current data sources are free.",
      modelCostPerRead: { reads: calls.length, pricedReads: priced.length, usd: priced.length ? priced.reduce((a, c) => a + (c.costUsd ?? 0), 0) / priced.length : null },
      users,
    },
  };
}
