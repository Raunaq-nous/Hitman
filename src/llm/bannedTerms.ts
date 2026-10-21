// no-money-audit: deny-list (this file lists the terms the claim verifier rejects; the audit skips it)
// Rule 9 (no money, odds, betting or prizes) and leaks or echoes of instructions/secrets.
export const BANNED: { re: RegExp; why: string }[] = [
  { re: /\b(bets?|betting|wagers?|odds|prizes?|jackpots?|payouts?|cash|money|rupees?|deposits?|wallets?|upi)\b|₹|\$\d/i, why: "mentions money, odds, betting or prizes" },
  { re: /\b[A-Z][A-Z0-9]*_(SECRET|KEY|TOKEN|PASSWORD|URL)\b|\bapi[_ -]?key\b|\bpassword\b/i, why: "mentions a secret or credential" },
  { re: /\b(system prompt|developer mode|ignore (all |any )?(previous|prior|above) instructions|as instructed|jailbreak)\b/i, why: "echoes instructions instead of facts" },
];

