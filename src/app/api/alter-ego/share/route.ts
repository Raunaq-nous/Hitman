import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { shareAlterEgo, stopSharingAlterEgo } from "@/domain/lab/service";

/** Opt in to sharing the Alter Ego card: returns the share image's URL (F-R-04). */
export const POST = route(async () => {
  const { token } = await shareAlterEgo(await requireUserId());
  return NextResponse.json({ url: `/api/og/alter-ego/${token}` }, { status: 201 });
});

/** Stop sharing: the old link stops working. */
export const DELETE = route(async () => {
  await stopSharingAlterEgo(await requireUserId());
  return new NextResponse(null, { status: 204 });
});
