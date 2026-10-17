import { NextResponse } from "next/server";
import { IPL_2026_POINTS_TABLE } from "@/constants/iplData";

// A manual snapshot, not live data. Replace with a licensed standings feed.
const AS_OF = "2026-04-03";

export async function GET() {
  return NextResponse.json({ success: true, data: IPL_2026_POINTS_TABLE, source: "Manual snapshot", asOf: AS_OF });
}
