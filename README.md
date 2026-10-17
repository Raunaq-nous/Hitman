# ALTER EGO

Working title for a multi-sport AI sports desk and game, evolving from HITMAN, an IPL fantasy app. This repo contains the new landing page and the original cricket leagues, which are now free to play.

## Run it

1. `cp .env.example .env` and fill in `DATABASE_URL` and `NEXTAUTH_SECRET`.
2. `npm install`
3. `npx prisma generate && npx prisma db push`
4. `npm run dev`, then open http://localhost:3000

## Where to look

`AGENTS.md` is the project map and rulebook for people and coding agents. `CHANGES.md` records the Phase 0 safety work and the manual steps still outstanding.
