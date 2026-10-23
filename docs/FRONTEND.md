# Frontend conventions

## Routes (target)
`/` landing · `/onboarding` · `/login` `/register` · `/lab` (moment list) · `/lab/[momentId]` (call) · `/lab/[momentId]/review` · `/lab/notebook` · `/lab/alter-ego` · `/lab/season-file` · `/crews` `/crews/[crewId]` `/crews/[crewId]/tower` · `/desk` (rewritten by `src/proxy.ts` to `/desk/[lang]`) · `/rooms` `/rooms/[sport]` `/rooms/[sport]/[event]` (Event Rooms) · `/roster` `/roster/[persona]` · `/settings` (language, depth, export, delete) · `/terms` `/privacy` `/attributions` `/ai` · `/admin/scoreboards` · `/design` (component gallery, dev only).
Legacy fantasy routes are migrated or removed; nothing links to money. All target routes are shipped: `/`, `/onboarding`, `/login`, `/register`, `/desk` (brief from recorded replays, ranked by swing), `/rooms*`, `/lab*` (moments, call, review, notebook, alter ego, season file), `/crews`, `/crews/[crewId]` (+ `/tower`, `/leaderboard`, `/match/[matchId]` legacy contest), `/crews/join/[code]`, `/roster`, `/roster/[persona]`, `/settings`, `/terms`, `/privacy`, `/attributions`, `/ai`, `/admin/scoreboards`, `/commentary` (delayed third-party scores), `/design`. `/leagues/*` and `/dashboard` redirect to `/crews`.

API (thin handlers in `src/app/api/`): `GET /api/replay/[eventId]` streams an event's incidents as server-sent events (`?speed=`, default 60; resumes after `Last-Event-ID`; `src/domain/facts/replay.ts`), plus `POST /api/lab/calls` (lock), `GET /api/lab/calls/[momentId]/review`, `GET /api/og/call/[callId]` and `GET /api/og/alter-ego/[token]` (share images), `POST|DELETE /api/alter-ego/share`, auth, crews, blocks, account (`/api/me/*`, including `/api/me/language`), ask, events and legacy score routes.

## Rules
Server Components by default; client components only for interaction. Data via services, mapped to DTOs. i18n: messages in `src/i18n/index.ts` (English and Hindi) with a typed `t()`; locale from the user setting or the `ae_lang` cookie (F-K-04; coverage beyond the Desk and navigation is TD-009). Charts are SVG components without heavy libraries where practical.

## Budgets
LCP ≤ 2.5 s on a mid-range phone profile; route JS ≤ 200 KB gzipped where practical; no layout shift from fonts (self-hosted, `font-display: swap`, size-adjust).
