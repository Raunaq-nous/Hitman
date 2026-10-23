# Tech-debt tracker
| Id | Debt | Impact | Plan | Status |
|---|---|---|---|---|
| TD-001 | Legacy fantasy surfaces (team builder inside crews, /commentary score widget) still exist alongside the new product (schedule/teams/points/seed removed in D-017) | Users can reach fantasy flows that the specs replace | Crews shipped (F-C-01) and the Lab shipped (F-L-*); remaining: remove or archive `/crews/[crewId]/match/[matchId]` and `/commentary` in a post-beta cleanup | Open |
| TD-002 | `any` on legacy live-score payload types in `LiveMatchCenter.tsx` carries justified disables | Weak typing on an unlicensed third-party feed | Adapters exist (F-D-06); replace the legacy payload types with adapter DTOs when the live-score widget is retired with TD-001 | Open |
| TD-003 | `League`/`LeagueMember` table names back the crews domain | Naming drift between DB and domain | Renamed to `Crew`/`CrewMember` in the leagues-to-crews migration (F-C-01) | Closed |
| TD-004 | Legacy dark app shell ignored the light theme | Mixed look in light mode | Rebuilt on tokens in F-U-05 | Closed |
| TD-005 | F-E-04 calibration gate fails on held-out IPL 2024–26 (real drift; gate underpowered per `gatePower`, D-022) | Blocks grading, the Lab and release features that depend on F-E-04 | Owner decisions D-030/D-031; passes after the Gate 2 review fixes (D-038); grades stay labelled provisional | Closed |
| TD-006 | Football and F1 have no win-probability model, so the Desk shows "Swing: not modelled" for them and ranks them after cricket (D-023) | Cross-sport ranking is cricket-first | Add a WP model per sport before ranking them by swing | Open |
| TD-007 | OpenF1 has no pit records for session 7953 (404, recorded as missing in `data/manifest.json`) | Pit-window demo (Professor) has no pit data in the committed sample | Pick a session with pit records via a new `data/requests/` file | Open |
| TD-008 | `/api/health` described in `docs/RELIABILITY.md` does not exist yet | No health check for hosting | Add the route with DB connectivity and build version | Open |
| TD-009 | Hindi covers only the Desk and navigation (D-024) | Other screens (Crews, Roster, onboarding copy, legal) are English-only | Move their strings into `src/i18n` with Hindi messages | Open |
