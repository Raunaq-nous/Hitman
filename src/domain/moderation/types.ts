import { z } from "zod";

export const REPORT_REASONS = ["abuse", "spam", "impersonation", "other"] as const;
export const reportInput = z.object({
  userId: z.string().min(1),
  reason: z.enum(REPORT_REASONS, { error: "Choose a reason: abuse, spam, impersonation or other." }),
  note: z.string().trim().max(280, "Keep the note under 280 characters.").optional(),
});
export type ReportInput = z.infer<typeof reportInput>;
export const transferInput = z.object({ userId: z.string().min(1) });

export interface ReportDTO { id: string; reporterName: string; reportedName: string; reason: string; note: string | null; createdAt: string }
