// Environment parsed with Zod at startup. Import `env()` instead of reading process.env directly.
import { z } from "zod";

const flag = (fallback: boolean) =>
  z.preprocess((v) => (v === undefined || v === "" ? fallback : String(v).trim().toLowerCase()), z.union([z.boolean(), z.enum(["true", "false", "1", "0"])]))
    .transform((v) => v === true || v === "true" || v === "1");

const optionalText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().optional());

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string({ error: "DATABASE_URL is required (postgresql://user:pass@host:5432/db); see .env.example" })
    .trim()
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgresql:// connection string"),
  NEXTAUTH_SECRET: optionalText,
  // An empty NEXTAUTH_URL is treated as unset: next-auth would otherwise call new URL("") and break the build.
  NEXTAUTH_URL: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.url({ error: "NEXTAUTH_URL must be a full URL (https://example.com) or unset" }).optional()),
  NEXT_PUBLIC_SITE_URL: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.url({ error: "NEXT_PUBLIC_SITE_URL must be a full URL or unset" }).optional()),
  ADMIN_EMAILS: z.string().default("").transform((s) => s.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  CRON_SECRET: optionalText,
  ALLOW_SEED: flag(false),
  // Component gallery at /design: always on outside production, opt-in in production.
  DESIGN_GALLERY: flag(false),
  LIVE_CALLS: flag(false),
  PROTOTYPE_DATA: flag(true),
  CRICKET_API_KEY: optionalText,
  GEMINI_API_KEY: optionalText,
  GEMINI_MODEL_FAST: optionalText,
  GEMINI_MODEL_DEEP: optionalText,
});

/** Production-only rules, checked on the raw values so they are reported even when other fields are invalid. */
function productionIssues(raw: Record<string, string | undefined>): string[] {
  if (raw.NODE_ENV !== "production") return [];
  const issues: string[] = [];
  const secret = raw.NEXTAUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) issues.push("NEXTAUTH_SECRET: must be set and at least 32 characters in production (generate with: openssl rand -base64 32)");
  if (["true", "1"].includes((raw.ALLOW_SEED ?? "").trim().toLowerCase())) issues.push("ALLOW_SEED: must be false in production: seeding is destructive");
  return issues;
}

export type Env = z.infer<typeof baseSchema> & { LLM_ENABLED: boolean };

/** Parse a raw environment. Throws one error listing every problem and how to fix it. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = baseSchema.safeParse(raw);
  const issues = [
    ...(result.success ? [] : result.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`)),
    ...productionIssues(raw),
  ];
  if (!result.success || issues.length > 0) throw new Error(`Invalid environment:\n${issues.map((l) => `  - ${l}`).join("\n")}`);
  return { ...result.data, LLM_ENABLED: Boolean(result.data.GEMINI_API_KEY) };
}

let cached: Env | undefined;

/** The parsed process environment (parsed once). Also removes an empty NEXTAUTH_URL so next-auth never sees it. */
export function env(): Env {
  if (!cached) {
    if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === "") delete process.env.NEXTAUTH_URL;
    cached = parseEnv(process.env);
  }
  return cached;
}
