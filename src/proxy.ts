// Serve the prerendered Desk in the reader's language (ae_lang cookie) without making the page dynamic.
import { NextResponse, type NextRequest } from "next/server";
import { isLang, LANG_COOKIE } from "@/i18n";

export function proxy(request: NextRequest): NextResponse {
  const v = request.cookies.get(LANG_COOKIE)?.value;
  const url = request.nextUrl.clone();
  url.pathname = `/desk/${isLang(v) ? v : "en"}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: "/desk" };
