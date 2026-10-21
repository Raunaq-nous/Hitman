// Keyed, bounded TTL cache. Use this instead of module-level variables: every entry has a key, an age and an expiry,
// and the cache never grows past maxEntries (least recently used entries are evicted first).
export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}

export interface CacheHit<V> {
  value: V;
  storedAt: number;
  ageMs: number;
  fresh: boolean;
}

export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; storedAt: number }>();
  private readonly now: () => number;

  constructor(private readonly opts: CacheOptions) {
    if (!(opts.ttlMs > 0) || !(opts.maxEntries > 0)) throw new RangeError("ttlMs and maxEntries must be positive");
    this.now = opts.now ?? Date.now;
  }

  /** A fresh value, or undefined when missing or expired. */
  get(key: string): V | undefined {
    const hit = this.peek(key);
    return hit?.fresh ? hit.value : undefined;
  }

  /** The stored value with its age, even when expired (for honest "stale · 3 min" states). */
  peek(key: string): CacheHit<V> | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    this.entries.delete(key);
    this.entries.set(key, e);
    const ageMs = this.now() - e.storedAt;
    return { value: e.value, storedAt: e.storedAt, ageMs, fresh: ageMs < this.opts.ttlMs };
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });
    while (this.entries.size > this.opts.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

const registry = new Map<string, TtlCache<unknown>>();

/** Named caches shared per server instance (e.g. "live-score"). Same name, same cache. */
export function namedCache<V>(name: string, opts: CacheOptions): TtlCache<V> {
  let c = registry.get(name);
  if (!c) {
    c = new TtlCache<unknown>(opts);
    registry.set(name, c);
  }
  return c as TtlCache<V>;
}
