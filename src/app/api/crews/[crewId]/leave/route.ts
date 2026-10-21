import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { leaveCrew } from "@/domain/crews/service";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ crewId: string }> }) => {
  const userId = await requireUserId();
  const { crewId } = await ctx.params;
  return NextResponse.json(await leaveCrew(userId, crewId));
});
