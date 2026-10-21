import { NextResponse } from "next/server";
import { parseJson, route } from "@/providers/http";
import { clientIp } from "@/providers/rateLimit";
import { register } from "@/domain/auth/service";
import { registerInput } from "@/domain/auth/types";

export const POST = route(async (req: Request) => {
  const input = await parseJson(req, registerInput);
  const user = await register(input, clientIp(req.headers));
  return NextResponse.json({ message: "Account created.", user }, { status: 201 });
});
