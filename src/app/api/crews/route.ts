import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { createCrew, listMyCrews } from "@/domain/crews/service";
import { createCrewInput } from "@/domain/crews/types";

export const GET = route(async () => {
  const userId = await requireUserId();
  return NextResponse.json({ crews: await listMyCrews(userId) });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  const { name } = await parseJson(req, createCrewInput);
  return NextResponse.json(await createCrew(userId, name), { status: 201 });
});
