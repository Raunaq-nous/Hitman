// Page helpers for Server Components: signed-in user or redirect, and domain errors as 404s.
import { notFound, redirect } from "next/navigation";
import { isDomainError } from "@/domain/shared/types";
import { currentUserId } from "./auth";

export async function pageUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}

/** NOT_FOUND and FORBIDDEN from a service render the 404 page (no existence leak). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isDomainError(e) && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
}
