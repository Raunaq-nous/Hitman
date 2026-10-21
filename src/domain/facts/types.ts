import { z } from "zod";
import { SOURCE_CLASSES } from "@/domain/sources/types";

export const SPORTS = ["cricket", "basketball", "football", "f1", "tennis"] as const;
export type SportSlug = (typeof SPORTS)[number];

/** An incident as adapters produce it, before storage. */
export const incidentInput = z.object({
  t: z.number().int().nonnegative(),
  seq: z.number().int().nonnegative().default(0),
  actor: z.string().max(120).nullable().default(null),
  type: z.string().min(1).max(40),
  payload: z.record(z.string(), z.unknown()),
  sourceId: z.string().min(1),
  sourceRef: z.string().min(1),
  sourceClass: z.enum(SOURCE_CLASSES),
  rightsPolicyId: z.string().min(1),
  effectiveAt: z.coerce.date(),
  observedAt: z.coerce.date(),
  supersedesId: z.string().nullable().default(null),
});
export type IncidentInput = z.infer<typeof incidentInput>;
