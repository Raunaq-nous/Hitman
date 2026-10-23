// Retrieval for generation. Lexical (IDF-weighted term overlap), deterministic and offline. Temporal filter first:
// nothing observed after the cutoff can be retrieved, so a brief can't know the future of the moment it describes.
import type { RetrievedText } from "./prompt";

export interface RetrievableDoc extends RetrievedText { observedAt: string }

const terms = (text: string): string[] => text.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [];

export function retrieve(query: string, docs: RetrievableDoc[], opts: { observedCutoff: string; canUse: (sourceId: string) => boolean; k?: number }): RetrievedText[] {
  const cutoff = Date.parse(opts.observedCutoff);
  if (Number.isNaN(cutoff)) throw new RangeError(`invalid observedCutoff ${opts.observedCutoff}`);
  const pool = docs.filter((d) => Date.parse(d.observedAt) <= cutoff && opts.canUse(d.sourceId));
  const q = [...new Set(terms(query))];
  if (q.length === 0 || pool.length === 0) return [];
  const docTerms = pool.map((d) => new Set(terms(d.text)));
  const idf = new Map(q.map((t) => [t, Math.log(1 + pool.length / (1 + docTerms.filter((s) => s.has(t)).length))]));
  return pool
    .map((d, i) => ({ d, score: q.reduce((a, t) => a + (docTerms[i].has(t) ? (idf.get(t) as number) : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.d.observedAt) - Date.parse(a.d.observedAt) || a.d.id.localeCompare(b.d.id))
    .slice(0, opts.k ?? 5)
    .map(({ d }) => d);
}
