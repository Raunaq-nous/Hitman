import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { parseJson, route } from "@/providers/http";
import { deleteInput, deleteMyAccount } from "@/domain/account/service";

export const POST = route(async (req: Request) => {
  const userId = await requireUserId();
  await parseJson(req, deleteInput);
  await deleteMyAccount(userId);
  return new NextResponse(null, { status: 204 });
});
