import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { namedCache, TtlCache } from "@/providers/cache";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe("cache: keyed, bounded TTL cache", () => {
  it("expires entries after the TTL but can still report them as stale with their age", () => {
    const c = clock(1_000);
    const cache = new TtlCache<string>({ ttlMs: 100, maxEntries: 10, now: c.now });
    cache.set("a", "x");
    c.advance(99);
    expect(cache.get("a")).toBe("x");
    c.advance(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.peek("a")).toEqual({ value: "x", storedAt: 1_000, ageMs: 100, fresh: false });
  });

  it("isolates keys", () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 10 });
    cache.set("match:1", 1);
    cache.set("match:2", 2);
    expect([cache.get("match:1"), cache.get("match:2"), cache.get("match:3")]).toEqual([1, 2, undefined]);
    cache.delete("match:1");
    expect(cache.get("match:1")).toBeUndefined();
    expect(cache.get("match:2")).toBe(2);
  });

  it("is bounded and evicts the least recently used entry", () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("a", 1); cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.size).toBe(2);
    expect([cache.get("a"), cache.get("b"), cache.get("c")]).toEqual([1, undefined, 3]);
  });

  it("refuses unbounded or zero-TTL configuration", () => {
    expect(() => new TtlCache({ ttlMs: 0, maxEntries: 1 })).toThrow(RangeError);
    expect(() => new TtlCache({ ttlMs: 1, maxEntries: 0 })).toThrow(RangeError);
  });

  it("named caches are shared by name and separate across names", () => {
    const a = namedCache<number>("t-a", { ttlMs: 1000, maxEntries: 2 });
    a.set("k", 1);
    expect(namedCache<number>("t-a", { ttlMs: 1000, maxEntries: 2 }).get("k")).toBe(1);
    expect(namedCache<number>("t-b", { ttlMs: 1000, maxEntries: 2 }).get("k")).toBeUndefined();
  });

  it("no module-level cache variables remain in app or domain code", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
    const offenders = [...walk("src/app"), ...walk("src/domain"), ...walk("src/lib"), ...walk("src/components")]
      .filter((f) => /^(let|var)\s+\w*cache\w*\s*[:=]/im.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
