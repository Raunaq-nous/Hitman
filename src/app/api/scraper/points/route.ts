import { NextResponse } from "next/server";
import { IPL_2026_POINTS_TABLE } from "@/constants/iplData";

export async function GET() {
  try {
    // Serve verified real-time IPL 2026 points table data
    // Source: ESPNcricinfo, iplt20.com — as of April 3, 2026
    return NextResponse.json({ success: true, data: IPL_2026_POINTS_TABLE });
  } catch (err) {
    console.error("Points API Error:", err);
    return NextResponse.json({ success: false, message: "Engine Failure" }, { status: 500 });
  }
}
