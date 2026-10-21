// Retrieval guardrails: only documents whose source allows embedding may be indexed or returned.
import { canUse } from "@/providers/rights";
import type { RetrievalDoc } from "./types";

export function embeddable(docs: RetrievalDoc[]): RetrievalDoc[] {
  return docs.filter((d) => canUse(d.sourceId, "embed"));
}
