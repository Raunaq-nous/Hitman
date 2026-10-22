# Progress

STATUS: IN PROGRESS
CURRENT PHASE: 1
LAST GATE: none
NEXT PROMPT: Branch `overhaul` (61/85 passing). F-E-04 built per the owner's D-027 gate and FAILS after three measured attempts (D-029, docs/HUMAN_TODO.md): 2026 drift (chasers won 64.3%), 2025 Brier ties the run-rate logistic, and the specified test is not fair and strict at ~70 matches a season. Owner decision needed; F-E-04 blocks F-E-05..09, the Lab, F-C-02/03, F-R-02..05, F-T-05, F-U-07 and release. Tags: gate-0/1/4 exist (tagger workflow, D-028). PR Raunaq-nous/Hitman#1 open. Restart Postgres after a VM restart (`npm run db:up`).

## Session log
<!-- Append newest first: date (UTC), features touched, commits, verification results, blockers, NEXT PROMPT -->
- 2026-10-22 (UTC) | owner decisions D-027/D-028 recorded; gate tags created via tagger workflow; F-E-04 rolling-origin gate implemented (matchCalibration engine, calibration-v2) and failed after 3 attempts (D-029) | verify --quick PASS | NEXT: owner decision on F-E-04
- 2026-10-22 (UTC) | F-K-02..05, review-gate (12 findings + npm audit) fixed, courier re-derive + refit, crews invite-link race fixed, gates 0/1/4 closed (tags pending push), PR #1 opened | verify + verify --clean PASS, CI green 109c20c | blocked on F-E-04 | NEXT: owner decision
- 2026-10-22 (UTC) | F-D-03..07, F-E-01..03, F-G-04, F-K-06, F-K-01..04 passing (62/85) + doc gardening | verify PASS; CI green at b3cbd1c | F-E-04 blocked (D-022, HUMAN_TODO) | note: commit bde1d88 accidentally carries the staged desk page rename (builds only with 830d5bd); history not rewritten | NEXT: F-K-05
- 2026-10-22 (UTC) | 45/85 passing; `node harness/verify.mjs --clean` PASS (all six steps). Stopped: every remaining feature needs a GitHub push/CI or Cricsheet data, both refused by this environment.
- 2026-10-21 (UTC) | pre-built F-D-03 code (not passing: needs real data): Cricsheet adapter (src/adapters/cricket/cricsheet.ts), ingest service, `npm run data:cricsheet` = download + ingest, `npm run data:fixtures` picks ≥5 real fixtures incl. a tie and a rain-affected match. Parser tested on a labelled synthetic doc. To finish once cricsheet.org is reachable: `npm run data:cricsheet && npm run data:fixtures`, commit data/fixtures/cricsheet/, add fixture-based tests, mark F-D-03.
- 2026-10-21 (UTC) | pre-built F-D-05 (not marked passing; F-D-03 fails): getStateAt + asOf + foldCricket in src/domain/facts/service.ts; tests/unit/facts/leakage.test.ts (injected post-cutoff and late incidents have no effect; corrections apply from observation; unlicensed sources excluded) pass on synthetic test incidents.
- 2026-10-21 (UTC) | pre-built engine maths awaiting data (not marked passing; deps fail): F-E-02 exact WP + leverage (src/engine/chaseWp.ts), F-E-03 swing, F-E-04 isotonic + gate (calibration.ts), F-E-06 grader/Brier, F-E-07 Read Rating, F-E-09 DR estimator; tests pass on synthetic distributions/data, engine coverage 100%. Remaining for each: run on Cricsheet-fitted outcomes (F-E-01) and fixtures.
- 2026-10-21 (UTC) | F-U-01/02/04, F-A-01, F-D-01/02, F-E-10, F-L-08, F-C-01/04, F-G-01..03, F-K-07, F-U-03/05 + gardening | verify PASS | blockers unchanged | NEXT: F-U-06
- 2026-10-21 (UTC) | F-H-05..07, F-H-09, F-F-01..09 + doc gardening | verify PASS each | BLOCKER: git push 403 (HUMAN_TODO) | NEXT: F-F-10
- 2026-10-21 (UTC) | audit F-H-00..04 | F-H-00 redone (real lint fixes), others re-verified; verify.mjs quiet | verify --ci PASS | NEXT: F-H-05
- 2026-10-17 (UTC) | F-H-04 | chore(git): verify author identity on overhaul commits [F-H-04] | git log -10 author verified: Raunaq-nous | NEXT: F-H-05
- 2026-10-17 (UTC) | F-H-03 | chore(security): verify history purge for UPI and dev.db [F-H-03] | git log --all -p grep UPI empty, dev.db empty | NEXT: F-H-04

- 2026-10-17 (UTC) | F-H-02 | chore(harness): verify docs in place and update gitignore [F-H-02] | check-features.mjs exits 0, .gitignore updated, verify --ci clean | NEXT: F-H-03

- 2026-10-17 (UTC) | F-H-01 | chore(kit): verify Phase 0 commits and remove _incoming [F-H-01] | git log (8 commits), 0 failed patches, _incoming deleted | NEXT: F-H-02

- 2026-10-17 (UTC) | F-H-00 | fix(ci): configure eslint for clean ci gate [F-H-00] | node harness/verify.mjs --ci (PASS: feature list, lint, build) | NEXT: F-H-01


