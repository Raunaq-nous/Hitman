---
name: verify-gate
description: Run and interpret the verification gates. Use before marking any feature passing or when a check fails.
---

# Verify gate
1. `node harness/verify.mjs --quick` (lint, typecheck, unit) during work.
2. `node harness/verify.mjs` (adds build and e2e) before marking a feature passing.
3. `node harness/verify.mjs --clean` at releases: creates a clean git worktree under `.worktrees/`, runs `init` and the full gate there, then removes it.
4. Read the first failure only; fix root causes; re-run. A missing npm script is a missing capability: create it (feature F-H-05).
5. Record the commands and the passing test names as evidence.
