# Decision Lab (Make the Call) — historical first

## User story
As a fan, I see a real moment from a past match exactly as it stood before the decision, choose what should happen, say how sure I am, lock it, then see how good my read was — separated from how things turned out — and I want to do another.

## Moments
- Source: Cricsheet IPL ball-by-ball data. Moments are auto-selected by leverage (top decile) and diversified by season, team and phase; 50 “golden moments” are curated, validated and committed as fixtures.
- Each moment stores the pre-lock state only (balls left, wickets in hand, runs required, phase, batters/bowler roles, recent overs) and an `observedCutoff`. Nothing after the cutoff may be shown before lock.
- Decision types (start with data-rich ones): death-over bowling choice (pace vs spin), batting intent for the next over (attack vs consolidate), chase tempo (target required rate bands). Options per moment: 2–3.

## Call card (“Ticket Call”)
Context strip (score, overs as legal balls formatted `O.B`, required rate, leverage meter), the question, 2–3 option buttons, a confidence slider 50–99% (default 60), a **Lock** button that records server time. After lock the card shows a “LOCKED” stamp. Keyboard and screen-reader accessible.

## Grading (deterministic; see `design-docs/models-and-grading.md`)
- `read_points = WP(pick | s) − max(WP(other options | s))`, in percentage points.
- If the best and second-best options are within the coin-flip band (default 2 points) the call is **“coin flip — no grade”** (shown, not scored).
- Calibration: `brier = (confidence − happened)²` with confidence in [0.5, 0.99] for the chosen option and happened ∈ {0, 1}.
- Grades use the **recalibrated** WP model; leverage and swing use the **exact** model.

## Three-column Review
| What happened | What was reasonable beforehand | What might have happened otherwise |
|---|---|---|
| Fact, from incidents (OBSERVED) | Pre-lock model estimate using only data before the cutoff (MODEL_ESTIMATE) | Scenario model estimate for the other option, labelled as an estimate, never as fact |
Each cell has receipts. A “counterfactual ghost” line on the WP chart shows the scenario estimate. The review ends with one learning sentence (template-based; LLM phrasing optional and verified) and a **Next read** button.

## Read Rating
Difficulty-weighted Elo for decisions: start 1200, provisional for the first 20 graded calls (K = 40, then 24); difficulty from the gap between options and the moment’s leverage. Shown with history in the Notebook.

## Notebook
All calls with filters (sport, decision type, crew), reliability diagram (confidence vs hit rate in 10-point buckets), Brier over time, skill-domain radar, Season File export.

## Acceptance (summary)
Lock is server-validated (one pick per call, before cutoff, authenticated); grades are reproducible from fixtures; the review shows all three columns with receipts; a user can complete call → review → next read in under 60 seconds on mobile.
