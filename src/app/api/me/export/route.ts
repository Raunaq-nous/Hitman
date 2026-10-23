import { NextResponse } from "next/server";
import { requireUserId } from "@/providers/auth";
import { route } from "@/providers/http";
import { exportMyData } from "@/domain/account/service";

export const GET = route(async () => {
  const data = await exportMyData(await requireUserId());
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="alter-ego-export.json"', "Cache-Control": "no-store" },
  });
});
