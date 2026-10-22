# Data and rights

## Source classes and priority
`OFFICIAL_LIVE 100 · LICENSED_LIVE 90 · VERIFIED_DELAYED 70 · EDITORIAL_PROJECTION 30 · SIMULATION 0`. Choose the highest-priority source that is fresh for the context; never present SIMULATION or EDITORIAL_PROJECTION as live fact.

## Rights policy (one JSON file per source in `src/rights/policies/`)
```json
{
  "source_id": "cricsheet",
  "display_name": "Cricsheet",
  "may_display_raw": true,
  "may_store_history": true,
  "may_create_derivatives": true,
  "may_embed_for_retrieval": true,
  "may_train_models": true,
  "may_show_video": false,
  "commercial_use": "unconfirmed",
  "territories": ["*"],
  "attribution_required": true,
  "attribution_text": "Data from Cricsheet (cricsheet.org)",
  "prototype_only": false,
  "notes": "Confirm licence on cricsheet.org before commercial launch; third-party descriptions differ."
}
```
Enforcement: `assertRight(sourceId, action)` is called by repos before storing, by services before displaying, and by retrieval before embedding. Tests cover each action. `prototype_only: true` sources (e.g., OpenF1, which describes itself as an unofficial project) are disabled when `PROTOTYPE_DATA=false`.

## Separate the five rights
software licence ≠ data licence ≠ media rights ≠ trademark rights ≠ athlete likeness rights.

## Sources
- **Cricsheet**: IPL ball-by-ball JSON (download `ipl_male_json.zip`, `npm run data:cricsheet`). Raw files go to `data/raw/` (gitignored); `npm run data:fixtures` commits a small subset (7 matches, including a tie and a D/L match) to `data/fixtures/cricsheet/` with its own `MANIFEST.json`. Derived tables `data/derived/ipl-matches.csv.gz` and `ipl-balls.csv.gz` feed model fitting.
- **OpenF1** (historical, prototype only): 18 endpoints; no key for historical data at 3 requests per second; live data requires a paid subscription — not used. Committed sample: 2023 race sessions and laps for session 7953 in `data/fixtures/openf1/`; OpenF1 has no pit records for that session, recorded as missing in `data/manifest.json`, never filled in.
- **StatsBomb open data** (GitHub): event data for selected competitions; attribution required; terms in the repository. Committed sample: competitions, competition 43 season 3 matches and match 7525 events in `data/fixtures/statsbomb/`.
- Adapters: one per source in `src/adapters/{cricket,f1,football}/`, registered in `src/adapters/index.ts`; basketball and tennis return `sourcePending`.

## How real data reaches the repo (D-020)
The agent VM cannot reach these hosts, so `.github/workflows/data-courier.yml` runs on a GitHub runner when a request file is pushed to `data/requests/` (or on manual dispatch). It downloads the sources, runs the ingest and commits back only fixtures, gzipped derived tables and `data/manifest.json` (URL, time, SHA-256, attribution and a `missing` list). Raw downloads never enter git.
- **Basketball and tennis**: no live source in the prototype; honest “source pending” states. Research datasets may be used only for offline model fitting, never displayed, unless their licence allows.
