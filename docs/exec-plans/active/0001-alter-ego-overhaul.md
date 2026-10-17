# 0001 — ALTER EGO overhaul (execution plan)

## Purpose
Turn the HITMAN fantasy app into ALTER EGO as specified in `docs/` — Historical Decision Lab first, no money ever, every number with a receipt — built and verified feature by feature, with every commit landing on the default branch.

## Phases and gates
### Phase 0 — Repository safety and harness
Features: F-H-00, F-H-01, F-H-02, F-H-03, F-H-04, F-H-05, F-H-06, F-H-07, F-H-08, F-H-09
- [ ] Gate 0: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-0`; default branch fast-forwarded and pushed; CI green.

### Phase 1 — Foundations (Phase 0.5)
Features: F-F-01, F-F-02, F-F-03, F-F-04, F-F-05, F-F-06, F-F-07, F-F-08, F-F-09, F-F-10, F-F-11, F-F-12, F-U-01, F-U-02, F-U-04, F-A-01
- [ ] Gate 1: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-1`; default branch fast-forwarded and pushed; CI green.

### Phase 2 — Data, rights and cricket engine
Features: F-D-01, F-D-02, F-D-03, F-D-04, F-D-05, F-D-06, F-D-07, F-E-01, F-E-02, F-E-03, F-E-04, F-E-05, F-E-06, F-E-07, F-E-08, F-E-09, F-E-10
- [ ] Gate 2: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-2`; default branch fast-forwarded and pushed; CI green.

### Phase 3 — Historical Decision Lab and Crews
Features: F-L-01, F-L-02, F-L-03, F-L-04, F-L-05, F-L-06, F-L-07, F-L-08, F-C-01, F-C-02, F-C-03, F-C-04
- [ ] Gate 3: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-3`; default branch fast-forwarded and pushed; CI green.

### Phase 4 — Desk and generation contract
Features: F-G-01, F-G-02, F-G-03, F-G-04, F-K-01, F-K-02, F-K-03, F-K-04, F-K-05, F-K-06, F-K-07
- [ ] Gate 4: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-4`; default branch fast-forwarded and pushed; CI green.

### Phase 5 — Design system, Roster and Alter Ego
Features: F-U-03, F-U-05, F-U-06, F-U-07, F-R-01, F-R-02, F-R-03, F-R-04, F-R-05
- [ ] Gate 5: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-5`; default branch fast-forwarded and pushed; CI green.

### Phase 6 — Trust, legal and analytics
Features: F-T-01, F-T-02, F-T-03, F-T-04, F-T-05, F-A-02, F-A-03
- [ ] Gate 6: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-6`; default branch fast-forwarded and pushed; CI green.

### Phase 7 — Release
Features: F-Z-01, F-Z-02, F-Z-03
- [ ] Gate 7: all phase features passing with evidence; `node harness/verify.mjs` green; review-gate findings fixed; tag `gate-7`; default branch fast-forwarded and pushed; CI green.

## DONE criteria
1. Every feature passes with evidence; `node harness/check-features.mjs` exits 0.
2. `node harness/verify.mjs --clean` exits 0.
3. CI green on the default branch.
4. Calibration gate and no-money audit pass.
5. All gates checked; this plan moved to `docs/exec-plans/completed/`.
6. Default branch contains every commit (no squash); `git status` clean; `git log origin/<default>..overhaul` empty.
7. `docs/HUMAN_TODO.md` and `docs/WALKTHROUGH.md` complete.
8. Tag `v0.1.0-beta` pushed.

## Decision log
| Id | Date | Decision | Why |
|---|---|---|---|
| D-001 | kit | No money, prizes or rewards of value | India’s 2025 online gaming law; product thesis |
| D-002 | kit | Historical Decision Lab before any live calls | No licensed live feed yet; validates the north star cheaply |
| D-003 | kit | Two models: exact WP for leverage/swing, recalibrated WP for grades | Exact model is miscalibrated on IPL chases (18% band won 29%) |
| D-004 | kit | Public names only; codenames internal | Third-party trademarks and personality rights |
| D-005 | kit | Gemini API behind a provider interface; templates without a key | Owner preference for Gemini; app must work offline and in tests |
| D-006 | kit | PostgreSQL with migrations; Docker or embedded-postgres locally | Production parity; no manual setup |
| D-007 | kit | Rights control plane enforced in code | Data licences differ by source and use |
| D-008 | kit | Work on `overhaul`, fast-forward default branch at gates, never squash | Safe production deploys; every commit counts on the contribution graph |
| D-009 | kit | Self-hosted fonts | Builds need no network |

## Progress log
<!-- newest first: date, feature, plan, result -->

## Surprises and discoveries

## Outcomes
