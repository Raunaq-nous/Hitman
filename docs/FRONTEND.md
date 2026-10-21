# Frontend conventions

## Routes (target)
`/` landing · `/onboarding` · `/login` `/register` · `/lab` (moment list) · `/lab/[momentId]` (call) · `/lab/review/[callId]` · `/notebook` · `/crews` `/crews/[crewId]` · `/desk` · `/desk/[eventId]` (Event Room) · `/roster` `/roster/[persona]` · `/alter-ego` · `/season-file` · `/settings` (language, depth, export, delete) · `/terms` `/privacy` `/attributions` `/ai` · `/admin/scoreboards` · `/design` (component gallery, dev only).
Legacy fantasy routes are migrated or removed; nothing links to money. Shipped so far: `/`, `/onboarding`, `/login`, `/register`, `/crews`, `/crews/[crewId]` (+ `/leaderboard`, `/match/[matchId]` legacy contest), `/crews/join/[code]`, `/commentary` (delayed third-party scores), `/design`. `/leagues/*` and `/dashboard` redirect to `/crews`.

## Rules
Server Components by default; client components only for interaction. Data via services, mapped to DTOs. i18n: `src/i18n/{en,hi}.json` with a typed `t()`; locale from user setting or cookie. Charts are SVG components without heavy libraries where practical.

## Budgets
LCP ≤ 2.5 s on a mid-range phone profile; route JS ≤ 200 KB gzipped where practical; no layout shift from fonts (self-hosted, `font-display: swap`, size-adjust).
