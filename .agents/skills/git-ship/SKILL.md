---
name: git-ship
description: Commit, push and merge procedure, including the phase-gate fast-forward to the default branch.
---

# Git ship
- Commit: `git add -A && git commit -m "<type>(<scope>): <summary> [<feature-id>]"` then `git push`.
- Gate merge: `git switch <default> && git pull --ff-only && git merge --ff-only overhaul && git push && git switch overhaul`.
- If fast-forward fails: `git switch overhaul && git rebase <default>`, re-run the full gate, retry.
- Tag: `git tag -a gate-<n> -m "Gate <n> passed" && git push origin gate-<n>`.
- Never squash; never force-push (except Phase 0.0).
