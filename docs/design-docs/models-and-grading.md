# Models and grading (deterministic code; every formula has tests)

## Legal balls
Overs are strings like `10.4`; internally use integer legal balls: `parseOvers("10.4") = 64`, `formatOvers(64) = "10.4"`, `runRate(85, 64) ≈ 7.97`. Wides and no-balls add runs without consuming a legal ball.

## Exact chase win probability (leverage and swing)
State `s = (b, w, r)`: legal balls remaining, wickets in hand, runs required. Terminal: `r ≤ 0` win (1); `w = 0` with `r > 0` loss (0); `b = 0` with `r > 1` loss (0); `b = 0, r = 1` tie (0.5).
Per-ball outcome distribution over `{0,1,2,3,4,5,6,W}` estimated by state bucket (target band × balls × wickets × required rate; `bucketKey` in `src/engine/outcomeModel.ts`) with hierarchical shrinkage (pseudo-counts 200 bucket / 500 parent) and era weighting (half-life 4 years). Extras folded into runs; run-outs counted as wickets; rain-affected (revised target), tied and no-result matches excluded (`scripts/fit-outcomes.ts`). The chaser may play the style of any state with fewer wickets in hand ("free disposal", `predictStyles`) and the exact model in `src/engine/chaseWp.ts` plays the best style, which keeps WP monotonic in wickets and runs (D-021). Artifact: `data/models/outcomes-v1.json` (`npm run model:outcomes`; trained on IPL 2008–2023, held out 2024–2026).
`WP(s) = Σ_o p(o|s) · WP(next(s, o))`, computed by backward induction (memoised DP). The construction is a martingale: tests check that the expected next-ball WP equals current WP within 1e-9 on the model’s own distribution.
**Leverage** at `s` = standard deviation of next-ball WP. **Swing** of a window = |WP_end − WP_start|.

## Calibration (grading uses the recalibrated model)
The exact model is known to be miscalibrated on IPL chases (published 2026 analysis: a band rated 18% won 29% of the time, persisting out of sample), because balls are not independent given the scoreboard. So the exact WP is mapped to an observed win rate by isotonic regression.

**Rolling-origin recalibration (owner decision D-027).** For a season S the outcome model is fitted on seasons before S and the isotonic map on S−3..S−1 only (each match counts once); S is never seen while fitting. **Production recalibrates the same way before every season**: `npm run model:calibration` writes `data/models/outcomes-v2.json` (outcome model fitted through the latest season) and `data/models/calibration-v2.json` (`production.map`, fitted on the latest three seasons, for the next season). Choices (outcome era half-life, target-band conditioning, isotonic era weights) are tuned on 2024 only (lowest match-weighted Brier; chosen: half-life 4 y, target-band conditioning on, unweighted isotonic map).

**Gate (D-027), per evaluated season (2025, 2026), the match is the sample unit:** adjacent 10-point buckets are merged until each holds ≥ 40 matches; each bucket's 95% match-level cluster-bootstrap interval of the observed chase win rate must contain the bucket's mean prediction; match-weighted calibration error ≤ 5 points (the original intent: every bucket within 5 points); the recalibrated Brier score must beat the exact model and a required-run-rate logistic baseline; and simulation on the same matches (whole chases played under the season's own model, so its WP is calibrated by construction) must show a calibrated model passing ≥ 90% of runs and an 8-point-shifted one failing ≥ 80%. Engine: `matchCalibrationTest`, `matchBrier`, `fitLogistic`, `simulateChase` in `src/engine/matchCalibration.ts`.

**Status (D-029): the gate fails.** 2025: buckets covered, calibration error 6.2 points, Brier 0.128981 vs exact 0.172141 and run-rate logistic 0.128824. 2026: four of five buckets missed, error 15.3 points (chasers won 64.3%), Brier 0.11491 vs 0.190169 and 0.12709. The fairness simulation (200 runs) shows the test as specified isn't fair and strict at ~70 matches a season (calibrated pass / +8 fail / −8 fail — 2025: 0.725 / 0.925 / 0.575; 2026: 0.650 / 0.940 / 0.645), nor are simultaneous intervals or a debiased calibration error (recorded in the artifact). See `docs/HUMAN_TODO.md`.

## Option-conditioned WP
For a decision type, estimate the per-ball outcome distribution conditioned on the option (e.g., pace vs spin in overs 17–20) from data-rich splits, shrunk toward the unconditional distribution. Compute WP under each option. Label confidence by sample size; below the threshold, show “insufficient data”.

## Grader
`read_points = WP_cal(pick|s) − max WP_cal(other|s)` (percentage points). Coin-flip band: |best − second| < 2 points → no grade. Calibration score: `brier = (confidence − happened)²`; example: confidence 0.7, didn’t happen → 0.49.

## Read Rating (difficulty-weighted Elo for decisions)
Expected score from the rating gap between the user and the moment’s difficulty rating (difficulty from option gap and leverage); actual score from read quality mapped to [0, 1]; K = 40 for the first 20 graded calls, then 24; floor 100. Moments’ difficulty ratings update slowly (K = 8).

## Counterfactuals
Scenario estimates for the option not taken are **model estimates**, labelled “scenario model estimate”, never “what would have happened”. Offline, check them with a doubly robust estimator (Jiang & Li, ICML 2016: combines a fitted outcome model with propensity weighting; unbiased, often lower variance than importance sampling) on historical decisions; report disagreements in `docs/QUALITY_SCORE.md`.

## Tennis Pressure Index (engine only)
iid point model: hold probability from serve-point win probability `p` (e.g., p = 0.65 → hold ≈ 0.83). Point importance = P(win match | win point) − P(win match | lose point). Klaassen & Magnus (JASA 2001) found points are not exactly iid but close enough for a good approximation.
