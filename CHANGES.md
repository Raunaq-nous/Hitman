# Phase 0: safe, honest and rebranded

This is the changelog for the redesign and safety pass on the HITMAN codebase.

## Do these yourself, outside the repo

1. **Purge your UPI ID and the committed database from git history.** The old `TreasurerCard.tsx` hardcoded your personal UPI ID, and `prisma/dev.db` held five user records, with emails and password hashes. Deleting the files doesn’t remove them from history. Using [git-filter-repo](https://github.com/newren/git-filter-repo):
   ```bash
   git filter-repo --invert-paths --path prisma/dev.db --path dev.db --path src/components/TreasurerCard.tsx
   # Put your old UPI ID on the left of ==> in a local file, never in the repo:
   git filter-repo --replace-text ../replacements.txt
   git push --force --all
   ```
   If the repo was ever public, treat both as exposed.
2. **Tell the five users** in that database to change their passwords anywhere they reused them.
3. **Rotate `NEXTAUTH_SECRET`**, then set `ADMIN_EMAILS` and `CRON_SECRET` in Vercel.
4. **Fix the build.** The last recorded build failed on `new URL("")`. The most likely cause is `NEXTAUTH_URL` set to an empty string in `.env.production`: either delete it or set it to the full site URL.
5. Run `npm install`, because the lockfile changed when unused and payment packages were removed. Then run `npx prisma generate`.

## What changed in the code

**Money and integrity**
- The ₹100 entry fee, the UPI QR code, the payout tiers, the Treasurer tab and the payment step in the team builder are all removed.
- Random scoring is gone. `/api/score` now takes real per-player stat lines and scores each match once.
- The cron simulator, which wrote random points into real teams, is deleted along with its button.
- One versioned scoring config (`config/scoring.json` v2) replaces the two that disagreed.

**Access**
- `/api/seed`, `/api/score` and `/api/toss` require an admin through `src/lib/admin.ts`, and seeding also needs `ALLOW_SEED=true`.
- The hardcoded session-secret fallback is removed, and production refuses to start without `NEXTAUTH_SECRET`.
- Registration validates input, stores emails in lowercase and stops leaking error details.
- Invite codes now come from a cryptographic random generator.

**Honest data**
- `/api/live-score` no longer fabricates an 85/2 (10.4) score or returns mock data as a success.
- Batting-side detection matches full team names, so "Royal" no longer collides between RCB and RR.
- Run rate and balls left are now computed from balls, not decimal overs.
- The live centre shows a clear empty state when no match is on.
- The static points table is labelled as a manual snapshot.

**Rules**
- `src/lib/fantasyRules.ts` is shared by the client and the server. The server now checks team size, duplicates, credits, role limits, captain and vice-captain, and that every player belongs to one of the two teams in the match.
- Selection closes once a match leaves UPCOMING.
- The credit cap is 100 on both sides; the client previously allowed 110.

**Brand and design**
- The new landing page is a React port of the published concept, with the working Make the Call demo, and is scoped under `.ae`.
- App pages keep the dark shell for now, but the monospace face is replaced app-wide by Archivo.
- The PWA name, colours, icons and service-worker cache are updated.
- Team logos hot-linked from iplt20.com are replaced by local badges.
- Zoom is no longer disabled.

**Hygiene**
- `node-cron`, `cheerio`, `qrcode` and `@types/qrcode` are removed.
- `*.db` files and the build log are now ignored.
- Seed scripts no longer contain passwords.
- `AGENTS.md` is now a real project map.

## Verification
- `npx tsc --noEmit` passes for the whole project, with Prisma types stubbed.
- The Next.js dev server compiles and serves `/`. In headless Chromium, three calls revealed an alter ego in both the hero and the file card.
- Not exercised: the API routes and `next build`. The sandbox couldn’t download Prisma’s engines, so database-backed routes couldn’t load. Run `npm run build` locally first.

## Known limits
- The live-score cache is still in serverless memory; Redis comes with the Phase 1 ingestion worker.
- The dev seed still invents player credits and playing XIs for local data, behind `ALLOW_SEED`.
- `src/lib/matchEngine.ts` is kept but unused.
