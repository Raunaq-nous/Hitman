// Structural check for the layering in ARCHITECTURE.md. Every violation message says how to fix it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const LAYERS = ["types", "config", "repo", "service", "api", "ui"] as const;
const RANK: Record<string, number> = { types: 0, config: 1, repo: 2, service: 3, api: 4, ui: 4 };

export interface Violation { file: string; specifier: string; message: string }

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

function listFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(listFiles(p));
    else if (/\.(ts|tsx|mts)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Resolve an import to a path relative to the src root ("domain/crews/repo"), or null for packages. */
function target(srcRoot: string, file: string, spec: string): string | null {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (spec.startsWith(".")) return relative(srcRoot, resolve(dirname(file), spec)).split(sep).join("/");
  return null;
}

function domainLayer(path: string): { area: string; layer: string } | null {
  const m = /^domain\/([^/]+)\/([^/.]+)/.exec(path);
  return m && m[2] in RANK ? { area: m[1], layer: m[2] } : null;
}

const ENGINE_ALLOWED_PACKAGES: string[] = [];
const PRISMA = /^(@prisma\/client|prisma)$|(^|\/)lib\/prisma$|(^|\/)repo(\/|$)/;

export function checkFile(srcRoot: string, file: string, source: string): Violation[] {
  const rel = relative(srcRoot, file).split(sep).join("/");
  const found: Violation[] = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const to = target(srcRoot, file, spec);
    const add = (message: string): void => { found.push({ file: rel, specifier: spec, message }); };
    if (rel.startsWith("engine/")) {
      if (to === null ? !ENGINE_ALLOWED_PACKAGES.includes(spec) : !to.startsWith("engine/"))
        add(`src/engine is pure: "${rel}" may not import "${spec}". Move I/O or framework code to a domain service and pass plain data into the engine.`);
      continue;
    }
    if (rel.startsWith("ui/") && (PRISMA.test(spec) || (to !== null && PRISMA.test(to))))
      add(`src/ui never touches the database: "${rel}" imports "${spec}". Fetch through a domain service or route handler and pass DTOs to the component.`);
    const from = domainLayer(rel);
    if (from && to !== null) {
      if (to.startsWith("app/")) add(`"${rel}" imports route code "${spec}". Domains must not depend on src/app; move shared code into the domain.`);
      if (/^(rights|llm)(\/|$)/.test(to)) add(`"${rel}" imports cross-cutting "${spec}" directly. Cross-cutting concerns enter through src/providers/; import from "@/providers/..." instead.`);
      const dest = domainLayer(to);
      if (dest && dest.area === from.area && RANK[dest.layer] > RANK[from.layer])
        add(`layering: "${rel}" (${from.layer}) imports "${spec}" (${dest.layer}). Dependencies flow types → config → repo → service → api|ui; move the shared code down to ${from.layer} or lower.`);
      if (dest && dest.area !== from.area && (dest.layer === "repo" || dest.layer === "config"))
        add(`"${rel}" reaches into another domain's ${dest.layer} ("${spec}"). Call that domain's service (or import its types) instead.`);
    }
  }
  return found;
}

export function checkTree(srcRoot: string): Violation[] {
  return listFiles(srcRoot).flatMap((f) => checkFile(srcRoot, f, readFileSync(f, "utf8")));
}
