import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

interface FixtureMoment { id: string; decision: { type: string; best: string; options: { option: string; wp: number }[] } }
/** The committed golden moments (data/fixtures/moments/golden-moments.json). */
export const fixtureMoments = (): FixtureMoment[] => (JSON.parse(readFileSync("data/fixtures/moments/golden-moments.json", "utf8")) as { moments: FixtureMoment[] }).moments;

/** Lock calls through the real API as the signed-in page's user. */
export async function lockCalls(page: Page, calls: { momentId: string; option: string; confidence: number }[]): Promise<void> {
  for (const c of calls) {
    const res = await page.request.post("/api/lab/calls", { data: c });
    expect(res.status()).toBe(201);
  }
}
