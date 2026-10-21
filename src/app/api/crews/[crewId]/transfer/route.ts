import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { handOver } from "@/domain/moderation/service";
import { transferInput } from "@/domain/moderation/types";

export const POST = route(async (req: Request, ctx: { params: Promise<{ crewId: string }> }) => {
  const userId = await requireUserId();
  const { crewId } = await ctx.params;
  const { userId: newOwnerId } = await parseJson(req, transferInput);
  await handOver(userId, crewId, newOwnerId);
  return new NextResponse(null, { status: 204 });
});
