# Quality score (kept current by doc gardening)

| Domain | Grade | Gaps |
|---|---|---|
| Harness and CI | A | Quiet gates, structural layering test, test DB schema, screenshot script, CI on GitHub (F-H-08), data courier workflow for real data |
| Foundations (env, DTOs, auth) | A | Zod env, DTOs, membership, keyed cache, source authority, scoring ledger, auth hardening, no-money audit, strict TS |
| Data and rights | B | Real data via the data courier: Cricsheet IPL (1,245 match files) ingested and derived to `data/derived/`, fixtures for Cricsheet, OpenF1 and StatsBomb with `data/manifest.json`; adapters for five sports (basketball, tennis source-pending); bitemporal reads, leakage tests, SSE replay. Gap: OpenF1 has no pit records for session 7953 |
| Engine (WP, leverage, calibration, grading) | C | Outcome model fitted on IPL 2008–2023 (held out 2024–2026), exact chase WP with free-disposal styles, leverage/swing, tennis Pressure Index. Calibration gate F-E-04 fails for documented reasons (D-022: real drift, underpowered gate); grader, Read Rating, option-conditioned WP, golden moments and DR check (F-E-05..09) not yet passing |
| Decision Lab | D | Swing Seismograph and Leverage Meter components only (F-L-08); call, lock, review, Notebook pending (blocked on F-E-04..08) |
| Crews | B | Crews with invites, owner controls, moderation; timing tower and share cards pending (need Read Rating) |
| Desk | C | `/desk` brief from recorded replays ranked by swing, rules-first story detector, query planner; football/F1 swing "not modelled"; Receipt Drawer, depth switch, Hindi, Event Rooms pending |
| LLM contract | A | Provider interface, claim verifier, production prompt, injection tests, retrieval with temporal and rights filters (F-G-04) |
| Roster and Alter Ego | C | Five personas and Persona Switchboard (F-R-01); persona tools, Alter Ego identity, Dossier Reveal, Season File pending |
| Design system and accessibility | B | Tokens, fonts, components, gallery, pictograms, onboarding, nav, landing; axe on every route; performance budgets (F-U-07) unmeasured; legacy contest screens still old-styled |
| Trust, legal, privacy | B | Legal pages, export/delete, 18+ gate, AI labels; anti-cheat basics (F-T-05) pending; pages await counsel review |
| Analytics and scoreboards | A | Event log, KPI queries with fixture tests, `/admin/scoreboards` |
Grades: A (complete, tested, documented) · B (works, minor gaps) · C (partial) · D (stub) · — (not started). Feature status: 57 of 85 passing in `harness/feature_list.json` at this gardening.

## Measured drift in IPL chases (data/models/calibration-v2.json)
| Season | Chases | Chase win rate | Mean target | Chase runs per legal ball |
|---|---|---|---|---|
| 2019 | 57 | 61.4% | 169.3 | 1.341 |
| 2020 | 56 | 51.8% | 170.2 | 1.297 |
| 2021 | 59 | 62.7% | 160.3 | 1.306 |
| 2022 | 74 | 50.0% | 172.1 | 1.345 |
| 2023 | 71 | 45.1% | 184 | 1.404 |
| 2024 | 70 | 51.4% | 191.1 | 1.531 |
| 2025 | 68 | 51.5% | 193.4 | 1.552 |
| 2026 | 70 | 64.3% | 197.4 | 1.584 |

Scoring rose from about 1.30–1.40 runs per legal ball before 2024 to 1.53–1.58 in 2024–2026, and mean targets from about 170 to 191–197. In 2026 chasers won **64.3%** of matches against 45–51% in 2023–2025. A map fitted on the three previous seasons under-predicts 2026 chasers by up to 26 points (D-029).

