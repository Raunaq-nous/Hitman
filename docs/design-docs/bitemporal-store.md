# Bitemporal incident store

- `effectiveAt`: when the thing happened in the sport (ball, lap, minute). `observedAt`: when our system learned it.
- Reads take `(eventId, effectiveAt?, observedCutoff)`; the repository filters `observedAt ≤ observedCutoff` and returns the latest non-superseded version of each incident.
- Corrections: a new incident with `supersedes: <id>`; never mutate.
- **Leakage tests**: for every Decision Lab moment, the state shown before lock and the “reasonable beforehand” model input use only incidents with `observedAt ≤ cutoff`; a test injects a post-cutoff incident and asserts it has no effect.
- Historical replays assign `observedAt` deterministically (match start + offset per ball) so tests are reproducible.
