# Tech-debt tracker
| Id | Debt | Impact | Plan | Status |
|---|---|---|---|---|
| TD-001 | Legacy fantasy surfaces (team builder, /leagues, /schedule, /teams, /commentary, /api/seed with a hand-typed 2026 schedule) still exist alongside the new product | Users can reach fantasy flows that the specs replace | Migrate leagues → crews (F-C-01); remove or archive fantasy routes when the Lab ships (F-L-*, F-U-05) | Open |
| TD-002 | `any` on legacy live-score payload types in `LiveMatchCenter.tsx` carries justified disables | Weak typing on an unlicensed third-party feed | Replace with adapter DTOs when the adapters land (F-D-06) | Open |
| TD-003 | `League`/`LeagueMember` table names back the crews domain | Naming drift between DB and domain | Rename with a migration in F-C-01 | Open |
