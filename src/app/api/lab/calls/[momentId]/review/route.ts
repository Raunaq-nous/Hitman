import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { reviewCall } from "@/domain/lab/service";

/** The Review of the caller's own locked call: grade, rating change, reveal and receipts (F-L-03). */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ momentId: string }> }) => {
  const userId = await requireUserId();
  const { momentId } = await ctx.params;
  return NextResponse.json(await reviewCall(userId, momentId));
});
