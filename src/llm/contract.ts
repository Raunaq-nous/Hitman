// Generation contract (docs/design-docs/llm-generation-contract.md): every generated item is a list of typed, sourced claims.
import { z } from "zod";

export const CLAIM_KINDS = ["OBSERVED", "DERIVED", "MODEL_ESTIMATE", "EDITORIAL"] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export const claimSchema = z.object({
  text: z.string().min(1).max(400),
  kind: z.enum(CLAIM_KINDS),
  source_ids: z.array(z.string().min(1)).max(12),
  confidence: z.number().min(0).max(1).optional(),
}).strict();
export type Claim = z.infer<typeof claimSchema>;

export const claimsSchema = z.object({ claims: z.array(claimSchema).min(1).max(8) }).strict();
export type Claims = z.infer<typeof claimsSchema>;

/** A verified fact handed to the generator. `value` is what the text may quote. */
export interface Fact {
  id: string;
  value: number | string;
  sourceId: string;
  observedAt: string;
  kind: "OBSERVED" | "DERIVED" | "MODEL_ESTIMATE";
}
