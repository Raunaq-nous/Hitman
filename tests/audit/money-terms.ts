// Shared by the unit and e2e no-money audits. Docs are excluded; disclaimers like "no entry fees" are allowed.
export const MONEY_TERMS = /\b(payments?|pay now|pay to play|qr ?codes?|upi|wallets?|entry[- ]fees?|prizes?|prize pools?|cash(?:back)?|deposits?|payouts?|vouchers?|withdraw(?:al|als)?|jackpots?|betting|bets?|wagers?|odds|razorpay|paytm|phonepe|stripe|rupees?|winnings)\b|₹/gi;
const NEGATION = /\b(no|never|without|zero|not|free of|nor)\b[^.!?]{0,40}$/i;

export interface MoneyHit { where: string; term: string; context: string }

/** Find money language that isn't part of a "no money" disclaimer. */
export function findMoneyTerms(where: string, text: string): MoneyHit[] {
  const hits: MoneyHit[] = [];
  for (const m of text.matchAll(MONEY_TERMS)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index);
    const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 3);
    // "payment=()" in Permissions-Policy *disables* the Payment Request API
    if (NEGATION.test(before) || after === "=()") continue;
    hits.push({ where, term: m[0], context: text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40).replace(/\s+/g, " ") });
  }
  return hits;
}
