---
trigger: always_on
description: The one-feature-at-a-time build loop and definition of done
---

# Operating loop
1. Orient: `git status`, `git log --oneline -15`, read `harness/progress.md` NEXT PROMPT and the active exec plan.
2. Select the first feature in `harness/feature_list.json` with `passes: false` whose `depends_on` all pass. Work on exactly one feature.
3. Write a 2–5 line plan in the exec plan’s Progress Log (approach, files, tests).
4. Write or extend tests first where practical; then implement.
5. `node harness/verify.mjs --quick` after each meaningful change; `node harness/verify.mjs` before marking the feature passing.
6. UI features: run the app and check the screen in the browser at 390 px and 1280 px, light and dark; save screenshots to `docs/evidence/<feature-id>/`.
7. Mark `passes: true` only with evidence: commands run, test names, screenshot paths. Never weaken, delete or rewrite acceptance criteria to make a feature pass; if a criterion is wrong, log a decision and add a replacement criterion that is at least as strict.
8. Commit, push, update `harness/progress.md` (STATUS, what changed, NEXT PROMPT), touch `harness/.agent-heartbeat`.
9. Every 10 features: run the doc-gardening skill. At each phase gate: run the review-gate skill and the git-ship skill’s gate procedure.

## Definition of done (per feature)
Acceptance criteria met · tests added and passing · full gate green · no lint or type errors · docs updated if behaviour changed · evidence recorded · committed and pushed.

## If blocked
Spend at most three focused attempts, then: write the blocker and options in the Decision Log, pick the safest option that keeps the product honest, add a `docs/HUMAN_TODO.md` item if a human is truly needed, and move to the next feature whose dependencies are met.
