# Quality score (kept current by doc gardening)

| Domain | Grade | Gaps |
|---|---|---|
| Harness and CI | A | Quiet gates, structural layering test, test DB schema, screenshot script, CI on GitHub (F-H-08), data courier workflow for real data |
| Foundations (env, DTOs, auth) | A | Zod env, DTOs, membership, keyed cache, source authority, scoring ledger, auth hardening, no-money audit, strict TS |
| Data and rights | B | Real data via the data courier: Cricsheet IPL (1,245 match files) ingested and derived to `data/derived/`, fixtures for Cricsheet, OpenF1 and StatsBomb with `data/manifest.json`; adapters for five sports (basketball, tennis source-pending); bitemporal reads, leakage tests, SSE replay. Gap: OpenF1 has no pit records for session 7953 |
| Engine (WP, leverage, calibration, grading) | C | Outcome model fitted on IPL 2008–2023 (held out 2024–2026), exact chase WP with free-disposal styles, leverage/swing, tennis Pressure Index. Walk-forward calibration gate F-E-04 passes narrowly (D-038); grader, Read Rating, option-conditioned WP, golden moments and DR check (F-E-05..09) pass |
| Decision Lab | D | 50 golden moments (death 40, middle 10; answers balanced 25/25 so no fixed answer or phase rule does well: D-039), Ticket Call screen (F-L-01), Swing Seismograph and Leverage Meter (F-L-08); lock API, review, Notebook pending |
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

## Calibration gate F-E-04 (D-030, D-038): passes
Walk-forward recalibration (η = 0, tuned on 2023–2024) on 2025+2026 pooled (138 matches, match-clustered bootstrap of 1,000): (a) joint intercept/slope test **not rejected** (intercept 0.34, slope 1.13, Wald 2.11 < 5.99); (b) Brier 0.116307 beats the exact model (0.181286) and the run-rate logistic (0.127944); (c) a perfectly calibrated model passes 96% of 200 simulated seasons; (d) minimum shift detected with 80% power: **15 points** (the limit; power at a 15-point shift: 1.00 up, 0.84 down; at 12 points the downward power is only 0.66).

| Season | Matches | Chase win rate | Brier (walk-forward / exact / run-rate logistic) | Intercept, slope | Wald (5% critical 5.99) |
|---|---|---|---|---|---|
| 2025 | 68 | 51.5% | 0.127275 / 0.172141 / 0.128824 | 0.00, 0.79 | 0.15 |
| 2026 | 70 | 64.3% | 0.105652 / 0.190169 / 0.12709 | 0.85, 1.74 | 5.09 |

History: the first run under D-030 failed (a) (Wald 7.45, D-032). The Gate 2 review found the map's window seasons were scored with an outcome model that had seen them, which made the map overconfident; each window season is now scored by a model fitted only on earlier seasons (the production method), and simulated shifts are clamped to [0.01, 0.99]. The per-season gates aren't used (D-030); 2026's slope of 1.74 is the drift to watch: the pass is narrow and the gate can't see shifts under about 15 points.

Grades still use the exact model's option differences and stay labelled "provisional calibration", as do win probabilities on the Desk and in Event Rooms (D-038).

## Doubly robust check of scenario estimates (F-E-09, offline only)
`npm run model:dr` → `data/models/dr-check-v1.json`. Logged decisions: 225 death overs of IPL chases (2008–2026) whose bowler has a recorded style (32 pace, 193 spin; names two register entries share are dropped; Wikidata via the courier, D-036); reward = the chasing side won; propensity of pace from the required rate (clipped to 0.05–0.95).

| Option | Model scenario estimate | Doubly robust estimate | Disagreement (95% match-bootstrap interval) |
|---|---|---|---|
| Pace | 0.455 | 0.544 | +8.9 pts (-0.1 to +19.5) |
| Spin | 0.462 | 0.583 | +12.0 pts (+7.8 to +16.5) |

Both options' scenario estimates sit about 9–12 points below the doubly robust estimates — the same under-prediction of chasers by the exact model that the walk-forward map corrects (D-038). The check is exploratory: the death-bowling decision is never graded (too few labelled pace balls). The pace sample is small (wide interval). Scenario estimates stay labelled "scenario model estimate" and "provisional calibration" and are never shown as what would have happened.

