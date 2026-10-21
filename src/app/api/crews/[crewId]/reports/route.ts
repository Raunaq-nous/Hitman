import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { listReports, reportMember } from "@/domain/moderation/service";
import { reportInput } from "@/domain/moderation/types";

type Ctx = { params: Promise<{ crewId: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { crewId } = await ctx.params;
  return NextResponse.json(await reportMember(userId, crewId, await parseJson(req, reportInput)), { status: 201 });
});

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { crewId } = await ctx.params;
  return NextResponse.json({ reports: await listReports(userId, crewId) });
});
