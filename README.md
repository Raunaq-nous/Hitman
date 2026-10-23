# ALTER EGO

Working title for a multi-sport AI sports desk and game, evolving from HITMAN, an IPL fantasy app. Free to play, no money ever. The repo holds the Decision Lab (real IPL moments, graded on decision quality), the Desk and Event Rooms, Crews with a Read Rating timing tower, the Roster of five AI analysts, and the Alter Ego.

## Run it

1. `node harness/init.mjs` (installs dependencies, creates `.env.local` from `.env.example`, starts a local Postgres, applies migrations, seeds). No API keys or paid data are needed.
2. `npm run dev`, then open http://localhost:3000
3. `node harness/verify.mjs` runs the full gate (lint, typecheck, unit, build, e2e).

## Where to look

`AGENTS.md` is the project map and rulebook for people and coding agents. `CHANGES.md` records the Phase 0 safety work and the manual steps still outstanding.
