import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string): string => readFileSync(p, "utf8");

describe("postgres everywhere with a migration history", () => {
  it("uses the postgresql provider", () => {
    expect(read("prisma/schema.prisma")).toMatch(/datasource db \{\s*provider = "postgresql"/);
    expect(read("prisma/migrations/migration_lock.toml")).toMatch(/provider = "postgresql"/);
  });

  it("commits a baseline migration and keeps migrations ordered", () => {
    const dirs = readdirSync("prisma/migrations").filter((d) => /^\d{14}_/.test(d));
    expect(dirs.length).toBeGreaterThan(0);
    expect([...dirs].sort()).toEqual(dirs);
    for (const d of dirs) expect(existsSync(`prisma/migrations/${d}/migration.sql`)).toBe(true);
    expect(read(`prisma/migrations/${dirs[0]}/migration.sql`)).toMatch(/CREATE TABLE "User"/);
  });

  it("has docker compose and an embedded fallback for local Postgres", () => {
    expect(read("docker-compose.yml")).toMatch(/db:\s*\n\s*image: postgres:16/);
    const up = read("scripts/db-up.mjs");
    expect(up).toMatch(/docker', \['compose', 'up'/);
    expect(up).toMatch(/embedded-postgres/);
  });

  it("never runs migrations during build or install", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    for (const name of ["build", "postinstall", "prebuild", "vercel-build"]) {
      expect(pkg.scripts[name] ?? "").not.toMatch(/migrate|db push/);
    }
    expect(pkg.scripts["db:migrate"]).toMatch(/prisma migrate deploy/);
    expect(existsSync("vercel.json") ? read("vercel.json") : "").not.toMatch(/migrate/);
  });
});
