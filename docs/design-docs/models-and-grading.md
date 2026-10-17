# Models and grading (deterministic code; every formula has tests)

## Legal balls
Overs are strings like `10.4`; internally use integer legal balls: `parseOvers("10.4") = 64`, `formatOvers(64) = "10.4"`, `runRate(85, 64) ≈ 7.97`. Wides and no-balls add runs without consuming a legal ball.

## Exact chase win probability (leverage and swing)
State `s = (b, w, r)`: legal balls remaining, wickets in hand, runs required. Terminal: `r ≤ 0` win (1); `w = 0` with `r > 0` loss (0); `b = 0` with `r > 1` loss (0); `b = 0, r = 1` tie (0.5).
Per-ball outcome distribution over `{0,1,2,3,4,5,6,W}` estimated by state bucket (balls-remaining band × wickets × required-rate band) with Laplace/hierarchical smoothing and era weighting (recent seasons weighted higher). Extras folded into runs; run-outs counted as wickets; rain-affected matches excluded.
`WP(s) = Σ_o p(o|s) · WP(next(s, o))`, computed by backward induction (memoised DP). The construction is a martingale: tests check that the expected next-ball WP equals current WP within 1e-9 on the model’s own distribution.
**Leverage** at `s` = standard deviation of next-ball WP. **Swing** of a window = |WP_end − WP_start|.

## Calibration (grading uses the recalibrated model)
The exact model is known to be miscalibrated on IPL chases (published 2026 analysis: a band rated 18% won 29% of the time, persisting out of sample), because balls are not independent given the scoreboard. So: fit isotonic regression mapping exact WP → observed win rate on training seasons; evaluate on held-out seasons (latest three in the data). **CI gate: every 10-point bucket with ≥ 200 samples is within 5 percentage points.** Store the calibration map as a versioned artifact.

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
