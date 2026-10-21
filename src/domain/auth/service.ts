// Registration and credential checks. Password hashes never leave this module.
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { DomainError } from "@/domain/shared/types";
import { RateLimiter } from "@/providers/rateLimit";
import type { RegisterInput } from "./types";
import * as repo from "./repo";

const FIFTEEN_MIN = 15 * 60_000;
export const limits = {
  loginByEmail: new RateLimiter({ limit: 10, windowMs: FIFTEEN_MIN }),
  loginByIp: new RateLimiter({ limit: 30, windowMs: FIFTEEN_MIN }),
  registerByIp: new RateLimiter({ limit: 5, windowMs: 60 * 60_000 }),
};

let dummy: Promise<string> | undefined;
const dummyHash = (): Promise<string> => (dummy ??= bcrypt.hash("timing-equaliser-not-a-password", 12));

const GENERIC_REGISTER_ERROR = "Couldn’t create an account with those details. If you already have one, sign in.";

export async function register(input: RegisterInput, ip: string): Promise<{ id: string }> {
  if (!limits.registerByIp.hit(ip).ok) throw new DomainError("RATE_LIMITED", "Too many sign-ups from this network. Try again later.");
  try {
    return await repo.insertUser({ name: input.name, email: input.email, password: await bcrypt.hash(input.password, 12) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DomainError("CONFLICT", GENERIC_REGISTER_ERROR);
    throw e;
  }
}

/** Returns the user for valid credentials, null otherwise; throws RATE_LIMITED after too many attempts. */
export async function verifyCredentials(emailRaw: string, password: string, ip: string): Promise<{ id: string; name: string; email: string } | null> {
  const email = emailRaw.trim().toLowerCase();
  const byEmail = limits.loginByEmail.hit(email);
  const byIp = limits.loginByIp.hit(ip);
  if (!byEmail.ok || !byIp.ok) throw new DomainError("RATE_LIMITED", "Too many sign-in attempts. Wait a few minutes and try again.");
  const user = await repo.findCredentials(email);
  // compare against a dummy hash when the user doesn't exist, so timing doesn't reveal accounts
  const ok = await bcrypt.compare(password, user?.password ?? (await dummyHash()));
  if (!user || !ok) return null;
  limits.loginByEmail.reset(email);
  return { id: user.id, name: user.name, email: user.email };
}
