---
name: cricket-engine
description: Implement or change the cricket win-probability, leverage, calibration and grading engine. Use for any work under src/engine.
---

# Cricket engine
Follow `docs/design-docs/models-and-grading.md` exactly.
1. Data contract (from Cricsheet JSON): second innings only for chase WP; state (balls left, wickets in hand, runs required); outcomes {0..6, W}; extras folded; run-outs as wickets; drop rain-affected (target changed) matches; enforce monotonic counters; winner agreement.
2. Split by season: train on older seasons, hold out the latest three for calibration tests.
3. Fit the per-ball outcome distribution by state bucket with smoothing and era weights; serialise as `data/models/outcomes-<version>.json` (small) with a hash.
4. Exact WP by memoised backward induction; tie = 0.5. Tests: terminal states, monotonicity in runs required and wickets, martingale property.
5. Leverage = std dev of next-ball WP; swing = |ΔWP|.
6. Isotonic calibration on training seasons; CI test: held-out buckets (≥ 200 samples) within 5 points.
7. Option-conditioned WP with shrinkage; coin-flip band 2 points; insufficient-data threshold.
8. Grader and Brier; Read Rating (Elo with difficulty). Golden moments: select 50, validate, commit fixtures.
