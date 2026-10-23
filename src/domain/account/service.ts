// Export my data (JSON) and delete my account (hard delete, confirmed).
import { z } from "zod";
import { DomainError } from "@/domain/shared/types";
import * as repo from "./repo";

export const deleteInput = z.object({ confirm: z.literal("DELETE", { error: "Type DELETE to confirm." }) });

export async function exportMyData(userId: string): Promise<Record<string, unknown>> {
  const rows = await repo.exportRows(userId);
  if (!rows.user) throw new DomainError("NOT_FOUND", "Account not found.");
  return { exportedAt: new Date().toISOString(), format: "alter-ego-export-v1", ...rows };
}

export async function deleteMyAccount(userId: string): Promise<void> {
  await repo.eraseUser(userId);
}
