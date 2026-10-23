# Alter Ego and the Notebook

- **Identity from calling style**, deterministic and explainable. Axes: risk appetite (share of high-variance picks), timing (performance by phase), calibration (Brier vs confidence), contrarianism (pick vs crowd), domain mix (sports and decision types). The identity maps to one of the five personas plus a modifier (e.g., “The Opener · Contrarian”), with the evidence behind it.
- Revealed after 10 graded calls in a **Dossier Reveal** (case-file motion: “CLASSIFIED” → “REVEALED”), with a share card.
- **Season File**: a printable HTML summary of a season of calls (best reads, worst reads, calibration chart, rating history). No money language.
- Calibration chart: reliability diagram in 10-point buckets with counts; small-sample warnings.

## Identity rules (implemented in `src/engine/alterEgo.ts`; D-045)
- Axes, each 0–1 with its sample size and a plain-language explanation:
  - **Risk appetite:** share of faster-scoring picks.
  - **Timing:** death- vs middle-over hit rate. Needs ≥ 3 calls in each phase.
  - **Calibration:** the mean Brier score against the Brier a perfectly calibrated caller would expect at the same confidences.
  - **Contrarianism:** share of calls against the crowd's favourite option, on moments with ≥ 5 other calls. Unknown, not guessed, without a crowd.
  - **Domain mix:** concentration in one decision type, and the sports played.
- How each persona scores:

  | Persona | Scores on |
  |---|---|
  | The Opener | How far timing is from even |
  | The Closer | How much better the reads are on the higher-leverage half of the calls |
  | The Architect | Chase-tempo share × hit rate |
  | The Professor | Risk above 50% |
  | The Iceman | Calibration × sharpness (a 50%-always caller is calibrated but not sharp) |

  The highest score wins, with ties in that fixed order. With no score above 0, the file opens with the analyst of the sport the fan calls most, and says so.
- Modifier: Contrarian (≥ 60% against the crowd) → Bold (risk ≥ 70%) → Steady (risk ≤ 30%) → Sharp (calibration ≥ 80% and mean confidence ≥ 65%) → Balanced.
- Sharing is opt-in: the share card sits behind a random, revocable token, never the account id.
