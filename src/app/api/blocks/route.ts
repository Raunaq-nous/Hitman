import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { blockUser } from "@/domain/moderation/service";
import { transferInput as userRef } from "@/domain/moderation/types";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  const { userId: blockedId } = await parseJson(req, userRef);
  await blockUser(userId, blockedId);
  return new NextResponse(null, { status: 204 });
});
