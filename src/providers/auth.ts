// Session access for server code. Everything that needs "who is asking" goes through here.
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DomainError } from "@/domain/shared/types";

export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new DomainError("UNAUTHENTICATED", "Sign in first.");
  return id;
}
