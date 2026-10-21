// Claim verifier: gates every generated item. Pure and deterministic.
import { BANNED } from "./bannedTerms";
import type { Claim, Fact } from "./contract";

export interface Rejection { claim: number; reason: string }
export interface Verdict { ok: boolean; rejections: Rejection[] }

// numbers, including ordinals ("7th"); not digits inside identifiers like "f1"
const NUMBER = /(?<![\w.])-?\d+(?:\.\d+)?(?=(?:st|nd|rd|th)\b|[^\w]|$)/g;
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const YEAR = /\b(19|20)\d{2}\b/g;

/** Numbers that a fact licenses: its value, numbers inside a string value, and a 0–1 value as a percentage. */
function allowedNumbers(facts: Fact[]): number[] {
  const out: number[] = [];
  for (const f of facts) {
    if (typeof f.value === "number") {
      out.push(f.value);
      if (f.value >= 0 && f.value <= 1) out.push(f.value * 100);
    } else {
      for (const m of f.value.matchAll(NUMBER)) out.push(Number(m[0]));
    }
  }
  return out;
}

/** A quoted number matches a fact when equal at the precision it was written (rounding tolerance). */
function matches(quoted: string, allowed: number[]): boolean {
  const dot = quoted.indexOf(".");
  const decimals = dot < 0 ? 0 : quoted.length - dot - 1;
  const tol = 0.5 * 10 ** -decimals + 1e-9;
  const n = Number(quoted);
  return allowed.some((v) => Math.abs(v - n) <= tol);
}

/**
 * Rejects: OBSERVED/DERIVED claims without valid source ids; any claim citing an unknown id; any number not present in
 * the referenced facts; any claim citing a fact observed after the cutoff or mentioning a date after it.
 */
export function verifyClaims(claims: Claim[], facts: Fact[], snapshotCutoff: string): Verdict {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const cutoff = Date.parse(snapshotCutoff);
  const cutoffYear = new Date(cutoff).getUTCFullYear();
  const rejections: Rejection[] = [];
  claims.forEach((c, i) => {
    const reject = (reason: string): void => { rejections.push({ claim: i, reason }); };
    if ((c.kind === "OBSERVED" || c.kind === "DERIVED") && c.source_ids.length === 0) reject(`${c.kind} claim has no source_ids`);
    const unknown = c.source_ids.filter((id) => !byId.has(id));
    if (unknown.length) reject(`unknown source_ids: ${unknown.join(", ")}`);
    const cited = c.source_ids.flatMap((id) => byId.get(id) ?? []);
    if (cited.some((f) => Date.parse(f.observedAt) > cutoff)) reject("cites a fact observed after SNAPSHOT_CUTOFF");
    for (const m of c.text.matchAll(ISO_DATE)) if (Date.parse(m[0]) > cutoff) reject(`mentions ${m[0]}, after SNAPSHOT_CUTOFF`);
    const text = c.text.replace(ISO_DATE, " ");
    for (const m of text.matchAll(YEAR)) if (Number(m[0]) > cutoffYear) reject(`mentions ${m[0]}, after SNAPSHOT_CUTOFF`);
    for (const b of BANNED) if (b.re.test(c.text)) reject(b.why);
    const allowed = allowedNumbers(cited);
    for (const m of text.matchAll(NUMBER)) if (!matches(m[0], allowed)) reject(`number ${m[0]} is not in the referenced facts`);
  });
  return { ok: rejections.length === 0, rejections };
}
