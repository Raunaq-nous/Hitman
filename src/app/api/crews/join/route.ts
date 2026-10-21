import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { joinCrew } from "@/domain/crews/service";
import { joinCrewInput } from "@/domain/crews/types";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  const { inviteCode } = await parseJson(req, joinCrewInput);
  return NextResponse.json(await joinCrew(userId, inviteCode));
});
