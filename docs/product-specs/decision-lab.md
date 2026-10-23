# Decision Lab (Make the Call) — historical first

## User story
As a fan, I see a real moment from a past match exactly as it stood before the decision, choose what should happen, say how sure I am, lock it, then see how good my read was — separated from how things turned out — and I want to do another.

## Moments
- Source: Cricsheet IPL ball-by-ball data. Moments come from IPL 2024–2026 chases (held out from the outcome model), auto-selected by leverage (top decile) and diversified by season, team, phase and answer (D-037, D-039); 50 “golden moments” are curated, validated and committed as fixtures.
- Each moment stores the pre-lock state only (balls left, wickets in hand, runs required, phase, batters/bowler roles, recent overs) and an `observedCutoff`. Nothing after the cutoff may be shown before lock.
- Decision types (start with data-rich ones): batting intent for the next over (attack, hold or ease off; D-039), chase tempo (target required rate bands). Death-over bowling choice (pace vs spin) is modelled but never offered: too few bowlers have a recorded style (D-036). Options per moment: 2–3.

## Call card (“Ticket Call”)
Context strip (score, overs as legal balls formatted `O.B`, required rate, leverage meter), the question, 2–3 option buttons, a confidence slider 50–99% (default 60), a **Lock** button that records server time. After lock the card shows a “LOCKED” stamp. Keyboard and screen-reader accessible.

## Grading (deterministic; see `design-docs/models-and-grading.md`)
- `read_points = WP(pick | s) − max(WP(other options | s))`, in percentage points.
- If the best and second-best options are within the coin-flip band (default 2 points) the call is **“coin flip — no grade”** (shown, not scored).
- Calibration: `brier = (confidence − happened)²` with confidence in [0.5, 0.99] for the chosen option and happened ∈ {0, 1}.
- Grades use the **exact** model’s option-conditioned WP and are labelled “provisional calibration” (D-034, D-035, D-038); leverage and swing use the exact model too.

## Three-column Review
| What happened | What was reasonable beforehand | What might have happened otherwise |
|---|---|---|
| Fact, from incidents (OBSERVED) | Pre-lock model estimate using only data before the cutoff (MODEL_ESTIMATE) | Scenario model estimate for the other option, labelled as an estimate, never as fact |
Each cell has receipts. A “counterfactual ghost” line on the WP chart shows the scenario estimate. The review ends with one learning sentence (template-based; LLM phrasing optional and verified) and a **Next read** button.

## Read Rating
Difficulty-weighted Elo for decisions: start 1200, provisional for the first 20 graded calls (K = 40, then 24); difficulty from the gap between options and the moment’s leverage (fixed per moment). A call’s result is whether the pick was the best option, weighted by the read’s margin, so a wrong pick never gains (D-041). Shown with history in the Notebook.

## Notebook
All calls with filters (decision type; cricket is the only sport so far, and crew filters wait for more crew data), reliability diagram (confidence vs hit rate in 10-point buckets), Brier over time, skill-domain radar, Season File export.

## Acceptance (summary)
Lock is server-validated (one pick per call, before cutoff, authenticated); grades are reproducible from fixtures; the review shows all three columns with receipts; a user can complete call → review → next read in under 60 seconds on mobile.
