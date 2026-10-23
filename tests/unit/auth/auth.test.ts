import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RateLimiter, clientIp } from "@/providers/rateLimit";
import { securityHeaders } from "@/providers/securityHeaders";
import { registerInput } from "@/domain/auth/types";
import { limits, register, verifyCredentials } from "@/domain/auth/service";
import { resetDb } from "../../helpers/db";

const resetLimits = (): void => { for (const l of Object.values(limits)) l.clear(); };

describe("auth: rate limiter", () => {
  it("allows the limit, blocks after it, and resets when the window ends", () => {
    let t = 0;
    const rl = new RateLimiter({ limit: 3, windowMs: 1000 }, { now: () => t });
    expect([rl.hit("k").ok, rl.hit("k").ok, rl.hit("k").ok]).toEqual([true, true, true]);
    const blocked = rl.hit("k");
    expect(blocked).toMatchObject({ ok: false, remaining: 0 });
    expect(blocked.retryAfterMs).toBe(1000);
    t = 999; expect(rl.hit("k").ok).toBe(false);
    t = 1000; expect(rl.hit("k").ok).toBe(true);
    expect(rl.hit("other").ok).toBe(true);
  });

  it("reads the client address from the proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp({ "x-real-ip": "5.6.7.8" })).toBe("5.6.7.8");
    expect(clientIp(undefined)).toBe("unknown");
  });
});

describe("auth: password policy", () => {
  it("requires at least 10 characters", () => {
    const base = { name: "Asha", email: "Asha@Example.com ", ageConfirmed: true as const };
    expect(registerInput.safeParse({ ...base, password: "123456789" }).success).toBe(false);
    expect(registerInput.safeParse({ ...base, password: "1234567890" }).success).toBe(true);
    expect(registerInput.parse({ ...base, password: "1234567890" }).email).toBe("asha@example.com");
    expect(registerInput.safeParse({ ...base, password: "x".repeat(129) }).success).toBe(false);
  });
});

describe("age: 18+ beta gate", () => {
  it("registration requires an explicit age confirmation", () => {
    const base = { name: "Asha", email: "a@example.com", password: "1234567890" };
    const missing = registerInput.safeParse(base);
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0].message).toMatch(/aged 18 and over/);
    expect(registerInput.safeParse({ ...base, ageConfirmed: false }).success).toBe(false);
    expect(registerInput.safeParse({ ...base, ageConfirmed: "true" }).success).toBe(false);
    expect(registerInput.safeParse({ ...base, ageConfirmed: true }).success).toBe(true);
  });

  it("records when the user confirmed their age", async () => {
    await resetDb();
    const { id } = await register({ name: "Aged", email: "aged@example.com", password: "long enough pw", ageConfirmed: true }, "6.6.6.6");
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).ageConfirmedAt).toBeInstanceOf(Date);
  });
});

describe("auth: registration and sign-in", () => {
  beforeAll(async () => { await resetDb(); });
  beforeEach(() => { resetLimits(); });

  it("hashes passwords with bcrypt and never returns the hash", async () => {
    const r = await register({ name: "Asha", email: "asha@example.com", password: "correct horse", ageConfirmed: true }, "9.9.9.1");
    expect(Object.keys(r)).toEqual(["id"]);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: r.id } });
    expect(await bcrypt.compare("correct horse", row.password)).toBe(true);
    expect(row.password).not.toContain("correct horse");
  });

  it("uses a generic error for an existing email", async () => {
    await expect(register({ name: "Asha 2", email: "asha@example.com", password: "another pass", ageConfirmed: true }, "9.9.9.2")).rejects.toMatchObject({ code: "CONFLICT", message: expect.not.stringMatching(/exists/) });
  });

  it("rate-limits registration per network", async () => {
    for (let i = 0; i < 5; i++) await register({ name: `R${i}`, email: `r${i}@example.com`, password: "long enough pw", ageConfirmed: true }, "8.8.8.8").catch(() => undefined);
    await expect(register({ name: "R6", email: "r6@example.com", password: "long enough pw", ageConfirmed: true }, "8.8.8.8")).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });

  it("verifies credentials and rate-limits sign-in attempts per email", async () => {
    expect(await verifyCredentials("ASHA@example.com", "correct horse", "7.7.7.7")).toMatchObject({ name: "Asha", email: "asha@example.com" });
    expect(await verifyCredentials("asha@example.com", "wrong", "7.7.7.7")).toBeNull();
    expect(await verifyCredentials("nobody@example.com", "whatever", "7.7.7.7")).toBeNull();
    for (let i = 0; i < 9; i++) await verifyCredentials("asha@example.com", "wrong", "7.7.7.8");
    await expect(verifyCredentials("asha@example.com", "correct horse", "7.7.7.9")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("the register route rejects short passwords with 400", async () => {
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(new Request("http://x/api/register", { method: "POST", body: JSON.stringify({ name: "B", email: "b@example.com", password: "short" }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/at least 10 characters/);
  });
});

describe("auth: security headers", () => {
  it("sets CSP, framing, sniffing, referrer, permissions and HSTS headers", () => {
    const h = Object.fromEntries(securityHeaders(false).map((x) => [x.key, x.value]));
    expect(h["Content-Security-Policy"]).toMatch(/frame-ancestors 'none'/);
    expect(h["Content-Security-Policy"]).not.toMatch(/unsafe-eval/);
    expect(securityHeaders(true).find((x) => x.key === "Content-Security-Policy")?.value).toMatch(/unsafe-eval/);
    expect(h).toMatchObject({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin" });
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
  });
});
