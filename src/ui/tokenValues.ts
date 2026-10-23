// Literal token values for renderers that can't read CSS variables (e.g. next/og share images). Read from
// src/ui/tokens.css (light theme), so tokens.css stays the single source of truth.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The light-theme value of each named token, following var(--x) references. */
export function tokenValues(names: string[]): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/ui/tokens.css"), "utf8");
  const first = (name: string): string | undefined => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
  const resolve = (name: string, depth = 0): string => {
    const v = first(name);
    if (!v) throw new Error(`unknown token --${name}`);
    const ref = /^var\(--([\w-]+)\)$/.exec(v);
    return ref && depth < 5 ? resolve(ref[1], depth + 1) : v;
  };
  return Object.fromEntries(names.map((n) => [n, resolve(n)]));
}
