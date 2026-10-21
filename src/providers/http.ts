// Route-handler helpers: parse with Zod, map domain errors to HTTP statuses, never leak internals.
import { NextResponse } from "next/server";
import type { z } from "zod";
import { DomainError, isDomainError } from "@/domain/shared/types";
import { log } from "./log";

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const body: unknown = await req.json().catch(() => {
    throw new DomainError("INVALID", "Send a JSON body.");
  });
  const r = schema.safeParse(body);
  if (!r.success) throw new DomainError("INVALID", r.error.issues[0]?.message ?? "Invalid request.");
  return r.data;
}

export function errorResponse(e: unknown): NextResponse {
  if (isDomainError(e)) return NextResponse.json({ code: e.code, message: e.message }, { status: e.status });
  log.error("unhandled route error", { error: e instanceof Error ? e.message : String(e) });
  return NextResponse.json({ code: "INTERNAL", message: "Something went wrong. Try again." }, { status: 500 });
}

/** Wrap a handler so thrown DomainErrors become JSON responses with the right status. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
