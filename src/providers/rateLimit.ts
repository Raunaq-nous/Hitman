// Fixed-window rate limiter on the keyed, bounded cache. Per server instance; enough for a single-region beta.
import { TtlCache } from "./cache";

export interface RateLimitRule { limit: number; windowMs: number }
export interface RateLimitResult { ok: boolean; remaining: number; retryAfterMs: number }

export class RateLimiter {
  private readonly windows: TtlCache<{ count: number; startedAt: number }>;
  private readonly now: () => number;

  constructor(private readonly rule: RateLimitRule, opts: { maxKeys?: number; now?: () => number } = {}) {
    this.now = opts.now ?? Date.now;
    this.windows = new TtlCache({ ttlMs: rule.windowMs, maxEntries: opts.maxKeys ?? 10_000, now: this.now });
  }

  /** Count one attempt for `key`. */
  hit(key: string): RateLimitResult {
    const t = this.now();
    const prev = this.windows.peek(key)?.value;
    // the window is anchored to its first attempt, not refreshed by later ones
    const w = prev && t - prev.startedAt < this.rule.windowMs ? prev : { count: 0, startedAt: t };
    const next = { count: w.count + 1, startedAt: w.startedAt };
    this.windows.set(key, next);
    const retryAfterMs = Math.max(0, w.startedAt + this.rule.windowMs - t);
    return { ok: next.count <= this.rule.limit, remaining: Math.max(0, this.rule.limit - next.count), retryAfterMs };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  clear(): void {
    this.windows.clear();
  }
}

/** Client address for rate limiting (first x-forwarded-for hop, as set by the hosting proxy). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined): string {
  if (!headers) return "unknown";
  const get = (k: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(k) ?? undefined;
    const v = headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return get("x-forwarded-for")?.split(",")[0]?.trim() || get("x-real-ip")?.trim() || "unknown";
}
