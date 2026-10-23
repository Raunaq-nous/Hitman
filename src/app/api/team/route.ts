import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { submitTeam } from "@/domain/contests/service";
import { submitTeamInput } from "@/domain/contests/types";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  const input = await parseJson(req, submitTeamInput);
  const { teamId } = await submitTeam(userId, input);
  return NextResponse.json({ success: true, teamId }, { status: 201 });
});
