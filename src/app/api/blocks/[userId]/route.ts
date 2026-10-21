import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { unblockUser } from "@/domain/moderation/service";

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const userId = await requireUserId();
  const { userId: blockedId } = await ctx.params;
  await unblockUser(userId, blockedId);
  return new NextResponse(null, { status: 204 });
});
