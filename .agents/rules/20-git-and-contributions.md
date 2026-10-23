---
trigger: always_on
description: Commit, push and merge rules so every commit is safe and counts on the owner’s GitHub graph
---

# Git and contributions
- Identity: commits must use an email verified on the owner’s GitHub account (or their GitHub noreply address), otherwise they don’t count on the contribution graph. Check once per session with `git config user.email`.
- Never backdate commits or fake activity. Small, real, verified commits only.
- Conventional Commits with the feature id: `feat(lab): three-column review [F-L-04]`, `fix(engine): ...`, `test(...)`, `docs(...)`, `chore(...)`, `refactor(...)`.
- Work on the `overhaul` branch. Push after every commit (`git push`).
- At each phase gate, fast-forward the default branch: `git switch <default> && git pull --ff-only && git merge --ff-only overhaul && git push && git switch overhaul`. Only commits on the default branch count toward contributions, so **never squash** and never merge with a squash or a rebase that drops authorship. If fast-forward fails, `git rebase <default>` on `overhaul`, re-run the full gate, then merge.
- Never force-push, except the one-time history purge in Phase 0.0 (`--force-with-lease`, after a backup bundle).
- Never commit: `_incoming/`, `.env*` other than `.env.example`, `data/raw/`, `.worktrees/`, `harness/.agent-heartbeat`, build output, local databases, screenshots of anything containing personal data.
- Tag releases with `git tag -a vX.Y.Z -m "..."` and push the tag.
