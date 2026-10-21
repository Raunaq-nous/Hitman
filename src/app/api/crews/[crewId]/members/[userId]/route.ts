import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { removeMember } from "@/domain/crews/service";

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ crewId: string; userId: string }> }) => {
  const ownerId = await requireUserId();
  const { crewId, userId } = await ctx.params;
  await removeMember(ownerId, crewId, userId);
  return new NextResponse(null, { status: 204 });
});
