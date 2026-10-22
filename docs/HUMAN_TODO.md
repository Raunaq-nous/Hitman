# Human-only actions

The agent keeps this list current and never blocks on it. Each item has a safe fallback in code.

- [x] **GitHub write access for the agent session**: resolved 2026-10-22 (pushes and API writes work).
- [x] **Network access for data sources**: worked around 2026-10-22 with the data courier workflow (D-020); no network settings changed.
- [x] **F-E-04 calibration gate (decide)**: owner decided 2026-10-22 (D-027): rolling-origin calibration with a match-level test.
- [x] **Push the gate tags**: done 2026-10-22 through the tagger workflow (D-028); gate-0, gate-1 and gate-4 exist on GitHub at 109c20c.
- [x] **F-E-04, second decision (D-029)**: owner decided D-030/D-031 on 2026-10-22.
- [ ] **Known issue: calibration (F-E-04, D-032)**: under the walk-forward gate (D-030) checks (b), (c), (d) pass but the pooled 2025+2026 intercept/slope test rejects (Wald 7.45 > 5.99), driven by 2026 (chasers won 64.3%); η tuned on 2023–2024 is 0 because updating didn't help those seasons. The product runs on the exact model with "provisional calibration" labels (D-031). Revisit after the 2027 season or with in-match features that explain 2026.
- [ ] **Bowling styles for pace vs spin (D-036)**: Wikidata (CC0) has a style for only 51 of 576 IPL bowlers, so the death-over pace/spin decision says "insufficient data". A licensed bowler-style dataset (or curated Wikidata statements) would enable it; the courier picks up new Wikidata statements on its next run.
- [ ] Rotate `NEXTAUTH_SECRET` in Vercel (Production and Preview) and set `ADMIN_EMAILS` and `CRON_SECRET`.
- [ ] Check `NEXTAUTH_URL` in Vercel: either unset or the full site URL (an empty value breaks builds).
- [ ] Provision or confirm the production PostgreSQL database and set `DATABASE_URL`; run `npx prisma migrate deploy` deliberately after reviewing migrations (never automatic in Vercel builds).
- [ ] Create a Gemini API key (Google AI Studio) and set `GEMINI_API_KEY`, `GEMINI_MODEL_FAST`, `GEMINI_MODEL_DEEP` in Vercel; the app works without them using templates.
- [ ] Notify the five people whose records were in the old committed `dev.db` and ask them to change their passwords (the file has been purged from history).
- [ ] Keep the backup bundle in `~/alter-ego-backups/` somewhere safe (it holds the old history, including the purged files).
- [ ] After the history rewrite: ask GitHub Support to purge cached views of old commits if needed, and add a ruleset on the default branch that blocks force pushes and deletions.
- [ ] Trademark search on “ALTER EGO” and the five persona names in your target markets.
- [ ] Counsel review of terms, privacy, persona lineage copy and any future sponsor reward (India’s 2025 gaming law).
- [ ] Confirm data licences before commercial launch (Cricsheet terms; F1, football, basketball and tennis feeds to be procured).
- [ ] Review `docs/WALKTHROUGH.md` and the screenshot evidence.
