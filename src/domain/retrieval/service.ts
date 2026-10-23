// Retrieval guardrails: only documents whose source allows embedding may be indexed or returned.
import { canUse } from "@/providers/rights";
import { retrieve, type RetrievedText } from "@/providers/llm";
import type { RetrievalDoc } from "./types";

export function embeddable(docs: RetrievalDoc[]): RetrievalDoc[] {
  return docs.filter((d) => canUse(d.sourceId, "embed"));
}

/** Documents for a generation snapshot: indexable sources only, nothing observed after `observedCutoff`. */
export function retrieveForSnapshot(query: string, docs: RetrievalDoc[], observedCutoff: string, k = 5): RetrievedText[] {
  return retrieve(query, docs, { observedCutoff, k, canUse: (sourceId) => canUse(sourceId, "embed") });
}
