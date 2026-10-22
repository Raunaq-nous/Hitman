# Human-only actions

The agent keeps this list current and never blocks on it. Each item has a safe fallback in code.

- [x] **GitHub write access for the agent session**: resolved 2026-10-22 (pushes and API writes work).
- [x] **Network access for data sources**: worked around 2026-10-22 with the data courier workflow (D-020); no network settings changed.
- [x] **F-E-04 calibration gate (decide)**: owner decided 2026-10-22 (D-027): rolling-origin calibration with a match-level test.
- [x] **Push the gate tags**: done 2026-10-22 through the tagger workflow (D-028); gate-0, gate-1 and gate-4 exist on GitHub at 109c20c.
- [ ] **F-E-04, second decision (D-029)**: the rolling-origin gate (D-027) was built and run (`npm run model:calibration`, `data/models/calibration-v2.json`). Its own fairness check fails: on the same matches a perfectly calibrated model passes only 72.5% (2025) / 65% (2026) of simulated seasons, and an 8-point downward shift is caught only 57.5% / 64.5%; variants with simultaneous intervals or a debiased error don't reach both bounds either. On real data 2026 fails every variant (chasers won 64.3%; misses up to 26 points), and 2025's recalibrated Brier ties the run-rate logistic (0.1290 vs 0.1288). Options: (a) evaluate 2025 and 2026 pooled (about 140 matches) so the test has the power the bounds need; (b) relax the strictness bound (e.g. detect a 12-point shift) or the fairness bound; (c) accept that 2026 is a regime change and gate on 2025 only. F-E-04 blocks F-E-05..09, the Lab, F-C-02/03, F-R-02..05, F-T-05, F-U-07 and release.
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
