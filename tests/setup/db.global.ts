// Vitest global setup: point tests at a private "vitest" schema of the local Postgres and migrate it from scratch.
// Tests never touch the dev schema and never use the network (the database is on localhost or the CI service).
import { execFileSync } from "node:child_process";
import { config } from "dotenv";

export default function setup(): void {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set: run `node harness/init.mjs` (or `npm run db:up`) before `npm test`.");
  const url = new URL(base);
  url.searchParams.set("schema", "vitest");
  process.env.DATABASE_URL = url.toString();
  const run = (args: string[], input?: string): void => {
    execFileSync("npx", ["prisma", ...args], { env: process.env, input, stdio: ["pipe", "ignore", "pipe"] });
  };
  try {
    run(["db", "execute", "--stdin", "--url", url.toString()], 'DROP SCHEMA IF EXISTS "vitest" CASCADE; CREATE SCHEMA "vitest";');
    run(["migrate", "deploy"]);
  } catch (e) {
    const err = e as { stderr?: Buffer };
    throw new Error(`Test database setup failed. Is Postgres running (npm run db:up)?\n${err.stderr?.toString() ?? String(e)}`);
  }
}
