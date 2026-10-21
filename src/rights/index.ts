// Rights control plane (docs/design-docs/data-and-rights.md). Software licence ≠ data licence ≠ media rights ≠
// trademark rights ≠ athlete likeness rights: this module covers data licences only.
import { z } from "zod";
import cricketdata from "./policies/cricketdata.json";
import cricsheet from "./policies/cricsheet.json";
import openf1 from "./policies/openf1.json";
import statsbomb from "./policies/statsbomb.json";

export const rightsPolicy = z.object({
  source_id: z.string().regex(/^[a-z0-9-]+$/),
  display_name: z.string().min(1),
  may_display_raw: z.boolean(),
  may_store_history: z.boolean(),
  may_create_derivatives: z.boolean(),
  may_embed_for_retrieval: z.boolean(),
  may_train_models: z.boolean(),
  may_show_video: z.boolean(),
  commercial_use: z.enum(["yes", "no", "unconfirmed"]),
  territories: z.array(z.string()).min(1),
  attribution_required: z.boolean(),
  attribution_text: z.string(),
  prototype_only: z.boolean(),
  notes: z.string(),
}).strict();
export type RightsPolicy = z.infer<typeof rightsPolicy>;

export type RightsAction = "store" | "display" | "derive" | "embed" | "train" | "video";
const FIELD: Record<RightsAction, keyof RightsPolicy> = {
  store: "may_store_history", display: "may_display_raw", derive: "may_create_derivatives",
  embed: "may_embed_for_retrieval", train: "may_train_models", video: "may_show_video",
};

export class RightsError extends Error {
  constructor(readonly sourceId: string, readonly action: RightsAction, reason: string) {
    super(`Rights check failed: ${action} on "${sourceId}" — ${reason}`);
    this.name = "RightsError";
  }
}

const POLICIES: ReadonlyMap<string, RightsPolicy> = new Map([cricsheet, openf1, statsbomb, cricketdata].map((p) => {
  const parsed = rightsPolicy.parse(p);
  return [parsed.source_id, parsed];
}));

export interface RightsContext { prototypeData: boolean }

export function listPolicies(): RightsPolicy[] {
  return [...POLICIES.values()].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function getPolicy(sourceId: string): RightsPolicy | undefined {
  return POLICIES.get(sourceId);
}

/** Whether `action` is allowed on `sourceId`. Unknown sources are denied; prototype-only sources are off without PROTOTYPE_DATA. */
export function checkRight(sourceId: string, action: RightsAction, ctx: RightsContext): { ok: true; policy: RightsPolicy } | { ok: false; reason: string } {
  const policy = POLICIES.get(sourceId);
  if (!policy) return { ok: false, reason: "no rights policy for this source (add one in src/rights/policies/)" };
  if (policy.prototype_only && !ctx.prototypeData) return { ok: false, reason: "prototype-only source while PROTOTYPE_DATA=false" };
  if (!policy[FIELD[action]]) return { ok: false, reason: `policy does not allow ${FIELD[action]}` };
  return { ok: true, policy };
}

/** Throws RightsError unless the action is allowed. Call before storing, displaying, embedding or training. */
export function assertRight(sourceId: string, action: RightsAction, ctx: RightsContext): RightsPolicy {
  const r = checkRight(sourceId, action, ctx);
  if ("reason" in r) throw new RightsError(sourceId, action, r.reason);
  return r.policy;
}
