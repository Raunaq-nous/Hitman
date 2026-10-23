// Anti-cheat basics (F-T-05). Locks are judged by the server's clock against the feed: a live call must be locked
// before the feed's cutoff for the decision. Historical golden moments never reveal anything before a lock, so their
// lock is always allowed (D-040). Anomaly flags are a stub: they are recorded for review, never acted on automatically.

export type LockMode = "live" | "historical";

export function lockAllowed(a: { mode: LockMode; serverNow: string; feedCutoff: string }): { ok: true } | { ok: false; reason: string } {
  const now = Date.parse(a.serverNow), cutoff = Date.parse(a.feedCutoff);
  if (Number.isNaN(now) || Number.isNaN(cutoff)) throw new RangeError("times must be ISO 8601");
  if (a.mode === "historical" || now <= cutoff) return { ok: true };
  return { ok: false, reason: "The moment has passed: the feed shows the ball was bowled." };
}

export interface FlagCall { lockedAt: string; confidence: number; hit: boolean | null }
export interface Flag { kind: "burst" | "streak" | "max-confidence"; detail: string }

/** Thresholds: 10 locks inside 60 s; 15 best picks in a row; 90%+ of 20 or more calls at 99%. */
const BURST = { calls: 10, windowMs: 60_000 }, STREAK = 15, MAXED = { calls: 20, share: 0.9 };

export function anomalyFlags(calls: FlagCall[]): Flag[] {
  const flags: Flag[] = [];
  const times = calls.map((c) => Date.parse(c.lockedAt)).sort((a, b) => a - b);
  for (let i = 0; i + BURST.calls - 1 < times.length; i++) {
    if (times[i + BURST.calls - 1] - times[i] < BURST.windowMs) {
      flags.push({ kind: "burst", detail: `${BURST.calls} calls locked within ${BURST.windowMs / 1000} seconds.` });
      break;
    }
  }
  let run = 0, best = 0;
  for (const c of calls) { run = c.hit === true ? run + 1 : 0; best = Math.max(best, run); }
  if (best >= STREAK) flags.push({ kind: "streak", detail: `${best} best picks in a row.` });
  const maxed = calls.filter((c) => c.confidence >= 0.99).length;
  if (calls.length >= MAXED.calls && maxed >= MAXED.share * calls.length) flags.push({ kind: "max-confidence", detail: `${maxed} of ${calls.length} calls at 99% confidence.` });
  return flags;
}
