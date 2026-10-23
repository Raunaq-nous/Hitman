import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findMoneyTerms } from "../audit/money-terms";

const ROOTS = ["src", "public", "prisma", "config", "scripts"];
const TEXT = /\.(ts|tsx|js|mjs|json|prisma|sql|css|html|md|svg|webmanifest)$/;
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : TEXT.test(n) ? [p] : [];
});

describe("no-money audit", () => {
  it("source, schema, config and public assets contain no payment, QR, UPI, wallet, entry-fee or prize language", () => {
    // deny-lists (files whose first line says so) name the terms in order to reject them
    const hits = ROOTS.flatMap(walk).map((f) => [f, readFileSync(f, "utf8")] as const)
      .filter(([, text]) => !text.split("\n", 1)[0].includes("no-money-audit: deny-list"))
      .flatMap(([f, text]) => findMoneyTerms(f, text));
    expect(hits.map((h) => `${h.where}: "${h.term}" in …${h.context}…`)).toEqual([]);
  });

  it("only the verifier's deny-list is exempt", () => {
    const exempt = ROOTS.flatMap(walk).filter((f) => readFileSync(f, "utf8").split("\n", 1)[0].includes("no-money-audit: deny-list"));
    expect(exempt).toEqual(["src/llm/bannedTerms.ts"]);
  });

  it("the schema has no fee, prize, wallet or payment fields", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).not.toMatch(/\b\w*(fee|prize|wallet|payment|balance|payout|deposit|amount)\w*\s+(Int|Float|Decimal|String|BigInt)/i);
  });

  it("the audit itself catches money language and allows disclaimers", () => {
    expect(findMoneyTerms("x", "Win a ₹500 prize! Pay via UPI or scan the QR code.").map((h) => h.term.toLowerCase())).toEqual(["₹", "prize", "upi", "qr code"]);
    expect(findMoneyTerms("x", "Entry fee: 49. Wallet balance.").map((h) => h.term.toLowerCase())).toEqual(["entry fee", "wallet"]);
    expect(findMoneyTerms("x", "No entry fees and no payouts. Never any prizes.")).toEqual([]);
  });
});
