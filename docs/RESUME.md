# Resuming work (any new session)

1. Read `harness/.agent-heartbeat`. If it was updated less than 45 minutes ago, another agent is active: reply “Agent active — no action” and stop.
2. Read `AGENTS.md`, `GEMINI.md`, `.agents/rules/`, the active exec plan, `harness/progress.md` (STATUS and NEXT PROMPT) and `harness/feature_list.json`.
3. Run `git status`, `git fetch --all`, `git switch overhaul`, `git pull --ff-only`. If the working tree is dirty, inspect the diff: finish and commit it if it is coherent and tests pass, otherwise stash it with a descriptive message and note it in the progress log.
4. Run `node harness/verify.mjs --quick`. If it fails, fixing it is the first task.
5. Execute the NEXT PROMPT, then continue the operating loop until the plan’s DONE criteria are met.
