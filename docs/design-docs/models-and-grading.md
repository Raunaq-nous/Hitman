# Models and grading (deterministic code; every formula has tests)

## Legal balls
Overs are strings like `10.4`; internally use integer legal balls: `parseOvers("10.4") = 64`, `formatOvers(64) = "10.4"`, `runRate(85, 64) ≈ 7.97`. Wides and no-balls add runs without consuming a legal ball.

## Exact chase win probability (leverage and swing)
State `s = (b, w, r)`: legal balls remaining, wickets in hand, runs required. Terminal: `r ≤ 0` win (1); `w = 0` with `r > 0` loss (0); `b = 0` with `r > 1` loss (0); `b = 0, r = 1` tie (0.5).
Per-ball outcome distribution over `{0,1,2,3,4,5,6,W}` estimated by state bucket (target band × balls × wickets × required rate; `bucketKey` in `src/engine/outcomeModel.ts`) with hierarchical shrinkage (pseudo-counts 200 bucket / 500 parent) and era weighting (half-life 4 years). Extras folded into runs; run-outs counted as wickets; rain-affected (revised target), tied and no-result matches excluded (`scripts/fit-outcomes.ts`). The chaser may play the style of any state with fewer wickets in hand ("free disposal", `predictStyles`) and the exact model in `src/engine/chaseWp.ts` plays the best style, which keeps WP monotonic in wickets and runs (D-021). Artifact: `data/models/outcomes-v1.json` (`npm run model:outcomes`; trained on IPL 2008–2023, held out 2024–2026).
`WP(s) = Σ_o p(o|s) · WP(next(s, o))`, computed by backward induction (memoised DP). The construction is a martingale: tests check that the expected next-ball WP equals current WP within 1e-9 on the model’s own distribution.
**Leverage** at `s` = standard deviation of next-ball WP. **Swing** of a window = |WP_end − WP_start|.

## Calibration (production method: walk-forward, D-030)
The exact model is known to be miscalibrated on IPL chases (published 2026 analysis: a band rated 18% won 29% of the time), because balls are not independent given the scoreboard. Production recalibrates it **walk-forward**:
1. Before season S: fit the outcome model on seasons before S and an isotonic map (exact WP → observed chase win rate, every match counting once) on S−3..S−1; set the in-season intercept δ = 0.
2. During S: a prediction is `σ(logit(map(exact WP)) + δ)`. After each completed date, δ += η × Σ (result − adjusted pre-match probability) over that date's matches. A match is only ever scored with matches from earlier dates (the product's temporal rule; same-day matches never inform each other).
3. η is tuned on 2023–2024 only (match-weighted Brier): **η = 0**, because in-season updating didn't help those seasons. `npm run model:calibration` → `data/models/calibration-v3.json`; engine `walkForward`, `calibrationSlopeTest`, `matchBrier` in `src/engine/matchCalibration.ts`.

**Gate (D-030)** on 2025+2026 pooled, the match as the unit: (a) the joint test of calibration intercept = 0 and slope = 1 (Wald statistic, match-clustered bootstrap covariance) is not rejected at 5%; (b) Brier beats the exact model and is within 0.002 of a required-run-rate logistic baseline; (c) a perfectly calibrated model passes ≥ 90% in simulation on the same matches; (d) the 80%-power minimum detectable shift is ≤ 15 points.

**Result (D-038): F-E-04 passes.** The map's window seasons S-3..S-1 are scored out of sample (each by an outcome model fitted only on seasons before it), as production would. (a) Wald 2.11 < 5.99 (intercept 0.34, slope 1.13); per season (not gated): 2025 Wald 0.15, 2026 Wald 5.09 (slope 1.74; chasers won 64.3%). (b) Brier 0.116307 vs exact 0.181286 and run-rate logistic 0.127944. (c) 96% of 200 simulated calibrated seasons pass. (d) Minimum detectable shift 15 points (shifts clamped to [0.01, 0.99]). The first D-030 run scored the window in sample and failed (a) with Wald 7.45 (D-032). Grades keep using the exact model's option differences and stay labelled "provisional calibration" (D-034, D-035, D-038). Earlier gates (D-022, D-027) and their measurements are kept in `data/models/calibration-v1.json` and `calibration-v2.json`.

## Option-conditioned WP
For a decision type, estimate the per-ball outcome distribution conditioned on the option (e.g., pace vs spin in overs 17–20) from data-rich splits, shrunk toward the unconditional distribution. Compute WP under each option. Label confidence by sample size; below the threshold, show “insufficient data”.

## Grader
`read_points = WP_exact(pick|s) − max WP_exact(other|s)` (percentage points, the exact model's option differences while calibration is provisional: D-034). Coin-flip band: |best − second| < 2 points → no grade. Calibration score: `brier = (confidence − happened)²`; example: confidence 0.7, didn’t happen → 0.49.

## Read Rating (difficulty-weighted Elo for decisions)
Expected score from the rating gap between the user and the moment’s difficulty rating (difficulty from option gap and leverage); actual score 1 if the pick was the best option, 0 if not, and each update weighted by the read’s margin (|read_points| / 20, capped at 1), so a wrong pick never gains and the best pick never loses (D-041); K = 40 for the first 20 graded calls, then 24; floor 100. Moments’ difficulty ratings update slowly (K = 8).

## Counterfactuals
Scenario estimates for the option not taken are **model estimates**, labelled “scenario model estimate”, never “what would have happened”. Offline, check them with a doubly robust estimator (Jiang & Li, ICML 2016: combines a fitted outcome model with propensity weighting; unbiased, often lower variance than importance sampling) on historical decisions; report disagreements in `docs/QUALITY_SCORE.md`.

## Tennis Pressure Index (engine only)
iid point model: hold probability from serve-point win probability `p` (e.g., p = 0.65 → hold ≈ 0.83). Point importance = P(win match | win point) − P(win match | lose point). Klaassen & Magnus (JASA 2001) found points are not exactly iid but close enough for a good approximation.
