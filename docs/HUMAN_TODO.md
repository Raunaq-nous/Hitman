# Human-only actions

The agent keeps this list current and never blocks on it. Each item has a safe fallback in code.

- [x] **GitHub write access for the agent session**: resolved 2026-10-22 (pushes and API writes work).
- [x] **Network access for data sources**: worked around 2026-10-22 with the data courier workflow (D-020); no network settings changed.
- [ ] **F-E-04 calibration gate (decide)**: on held-out IPL 2024–26 the recalibrated WP is 17–21 points too low in the 0.4–0.8 buckets (real drift: scoring jumped after 2023), and the gate itself is underpowered: per-ball samples within a match share one outcome, so even a perfectly calibrated model passes all ten 5-point buckets only 2.4% of the time on three seasons (D-022, `data/models/calibration-v1.json` → gatePower). F-E-04 blocks 21 features including release (F-Z-*). Options for the owner: (a) gate on a statistically meaningful tolerance, e.g. within max(5 pts, 2 cluster SE); (b) keep 5 pts but evaluate per match at fixed checkpoints; (c) wait for more seasons. The agent will not change the criterion itself.
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
