import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { resolveReport } from "@/domain/moderation/service";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ crewId: string; reportId: string }> }) => {
  const userId = await requireUserId();
  const { crewId, reportId } = await ctx.params;
  await resolveReport(userId, crewId, reportId);
  return new NextResponse(null, { status: 204 });
});
