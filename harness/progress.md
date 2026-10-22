# Progress

STATUS: IN PROGRESS
CURRENT PHASE: 1
LAST GATE: none
NEXT PROMPT: Blocked on two human actions (docs/HUMAN_TODO.md): (1) give the Claude GitHub App write access to Raunaq-nous/Hitman, then `git push origin overhaul` (48+ local commits; or fetch them from overhaul.bundle), check CI and mark F-H-08; (2) allow cricsheet.org in the environment network policy, then `npm run data:cricsheet && npm run data:fixtures`, commit fixtures and finish F-D-03 → F-D-04/05/07 → F-E-01.. (engine maths already pre-built). Then continue the feature loop, gates, tag v0.1.0-beta and the overhaul→main PR (merge commit).

## Session log
<!-- Append newest first: date (UTC), features touched, commits, verification results, blockers, NEXT PROMPT -->
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


