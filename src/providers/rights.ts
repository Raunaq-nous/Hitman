// Rights enter domains through this provider, bound to the current PROTOTYPE_DATA flag.
import { assertRight as assertWith, checkRight as checkWith, type RightsAction, type RightsPolicy } from "@/rights";
import { env } from "./env";

export { RightsError, listPolicies, getPolicy, type RightsAction, type RightsPolicy } from "@/rights";

export const assertRight = (sourceId: string, action: RightsAction): RightsPolicy => assertWith(sourceId, action, { prototypeData: env().PROTOTYPE_DATA });
export const canUse = (sourceId: string, action: RightsAction): boolean => checkWith(sourceId, action, { prototypeData: env().PROTOTYPE_DATA }).ok;
/** The rights context adapters check against, bound to the current PROTOTYPE_DATA flag. */
export const rightsContext = (): { prototypeData: boolean } => ({ prototypeData: env().PROTOTYPE_DATA });
