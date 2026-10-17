# Antigravity-specific instructions (overrides AGENTS.md where they conflict)

- You usually run under `/goal`. Do not stop to ask for approval; artifact review is set to Always Proceed. Map every deliverable to evidence before declaring completion.
- Keep Antigravity artifacts in sync with the repo: the Task List mirrors the current phase in `docs/exec-plans/active/0001-alter-ego-overhaul.md`; the Implementation Plan for a feature is copied into the progress log; at each phase gate write a Walkthrough and append it to `docs/WALKTHROUGH.md`.
- Browser: use the browser only on `http://localhost` / `http://127.0.0.1` to verify UI. Capture screenshots at 390 px and 1280 px wide, light and dark, and save them under `docs/evidence/<feature-id>/`. Never log in to third-party sites.
- Reasoning effort: High for planning, gate reviews and engine work; Medium for routine edits and docs.
- Subagents: allowed for read-only research and drafting tests. Only the main agent writes to git, and only one feature is in progress at a time.
- Quota: if you are close to a usage limit, finish the current small step, commit, push, update `harness/progress.md` (STATUS and NEXT PROMPT), touch `harness/.agent-heartbeat`, and stop cleanly.
- Heartbeat: after each commit, write the current UTC time to `harness/.agent-heartbeat` (gitignored). Resume prompts use it to avoid two agents working at once.

- Setup is scripted: `harness/prepare-repo.sh` backs up the old history, removes the old local databases and payment handle from every commit, applies the Phase 0 patches as the owner's commits and creates `overhaul`. Run it once, exactly as the mission prompt says; never improvise history rewriting.
- GitHub sign-in is the only thing you may ask the owner for. Show the one-time code and link, and wait for the command to finish.
