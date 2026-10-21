import { describe, expect, it } from "vitest";
import { parseEnv } from "@/providers/env";

const DB = "postgresql://alterego:alterego@localhost:5432/alterego";
const SECRET = "x".repeat(32);

describe("env", () => {
  it("requires DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL is required/);
    expect(() => parseEnv({ DATABASE_URL: "file:./dev.db" })).toThrow(/postgresql:\/\//);
    expect(parseEnv({ DATABASE_URL: DB }).DATABASE_URL).toBe(DB);
  });

  it("requires a NEXTAUTH_SECRET of at least 32 characters in production only", () => {
    expect(() => parseEnv({ NODE_ENV: "production", DATABASE_URL: DB })).toThrow(/NEXTAUTH_SECRET: must be set and at least 32/);
    expect(() => parseEnv({ NODE_ENV: "production", DATABASE_URL: DB, NEXTAUTH_SECRET: "short" })).toThrow(/at least 32/);
    expect(parseEnv({ NODE_ENV: "production", DATABASE_URL: DB, NEXTAUTH_SECRET: SECRET }).NEXTAUTH_SECRET).toBe(SECRET);
    expect(parseEnv({ NODE_ENV: "development", DATABASE_URL: DB }).NEXTAUTH_SECRET).toBeUndefined();
  });

  it("accepts NEXTAUTH_URL as a URL or unset, and treats empty as unset", () => {
    expect(parseEnv({ DATABASE_URL: DB, NEXTAUTH_URL: "" }).NEXTAUTH_URL).toBeUndefined();
    expect(parseEnv({ DATABASE_URL: DB, NEXTAUTH_URL: "  " }).NEXTAUTH_URL).toBeUndefined();
    expect(parseEnv({ DATABASE_URL: DB }).NEXTAUTH_URL).toBeUndefined();
    expect(parseEnv({ DATABASE_URL: DB, NEXTAUTH_URL: "https://alterego.example" }).NEXTAUTH_URL).toBe("https://alterego.example");
    expect(() => parseEnv({ DATABASE_URL: DB, NEXTAUTH_URL: "not a url" })).toThrow(/NEXTAUTH_URL must be a full URL/);
  });

  it("parses flags with safe defaults: live calls off, prototype data on, LLM only with a key", () => {
    const e = parseEnv({ DATABASE_URL: DB });
    expect(e.LIVE_CALLS).toBe(false);
    expect(e.PROTOTYPE_DATA).toBe(true);
    expect(e.LLM_ENABLED).toBe(false);
    expect(e.ALLOW_SEED).toBe(false);
    const f = parseEnv({ DATABASE_URL: DB, LIVE_CALLS: "TRUE", PROTOTYPE_DATA: "false", GEMINI_API_KEY: "k" });
    expect([f.LIVE_CALLS, f.PROTOTYPE_DATA, f.LLM_ENABLED]).toEqual([true, false, true]);
    expect(() => parseEnv({ DATABASE_URL: DB, LIVE_CALLS: "maybe" })).toThrow(/LIVE_CALLS/);
  });

  it("splits ADMIN_EMAILS and refuses seeding in production", () => {
    expect(parseEnv({ DATABASE_URL: DB, ADMIN_EMAILS: " A@x.com, b@y.com ,," }).ADMIN_EMAILS).toEqual(["a@x.com", "b@y.com"]);
    expect(() => parseEnv({ NODE_ENV: "production", DATABASE_URL: DB, NEXTAUTH_SECRET: SECRET, ALLOW_SEED: "true" })).toThrow(/ALLOW_SEED: must be false/);
  });

  it("lists every problem in one error", () => {
    expect(() => parseEnv({ NODE_ENV: "production", NEXTAUTH_URL: "nope" })).toThrow(/DATABASE_URL[\s\S]*NEXTAUTH_URL[\s\S]*NEXTAUTH_SECRET/);
  });
});
