# Architecture

## The one rule
**Facts first. Models second. Language third.** Data is ingested and stored as facts with provenance; deterministic models compute everything numeric; language models only phrase what the first two layers produced, and a verifier checks them.

## Pipeline
```
Sources ─▶ Adapters (one per source) ─▶ Incident store (append-only, bitemporal) ─▶ Engine (WP, leverage, grading)
   ─▶ Story detector (rules first) ─▶ Significance ranking (swing) ─▶ Query planner ─▶ Retrieval (structured first)
   ─▶ Rights + temporal filter ─▶ LLM (phrasing only) ─▶ Claim verifier ─▶ Surfaces (Desk, Lab, Roster, Notebook)
```
- **Incidents**: `{ id, eventId, t (legal ball / lap / minute / point), actor, type, payload, sourceRef, sourceClass, effectiveAt, observedAt, rightsPolicyId }`. Never update in place; corrections are new incidents that supersede.
- **Bitemporal reads**: every read takes an `observedCutoff`; nothing observed after the cutoff can influence a grade, a review or generated text (temporal-leakage tests enforce this).
- **Source authority**: `OFFICIAL_LIVE 100 > LICENSED_LIVE 90 > VERIFIED_DELAYED 70 > EDITORIAL_PROJECTION 30 > SIMULATION 0`. The highest-priority fresh source wins; stale sources are shown as stale.

## Layering (enforced by lint rules and a structural test)
Inside each domain under `src/domain/<area>/`, code may only depend forward:
`types → config → repo → service → api | ui`
Cross-cutting concerns (auth, rights, telemetry, feature flags, LLM, cache) enter only through `src/providers/`. `src/engine/` is pure (no I/O, no framework imports) and fully unit-tested. `src/ui/` never imports `repo` or Prisma. Lint errors explain the fix in their message.

## Boundaries
- Parse, don't validate: every input (HTTP body, query, env, file, feed) is parsed with Zod at the boundary.
- DTOs cross the server/client boundary; Prisma models never do. Password hashes never leave the auth module.
- Route handlers are thin: parse → call service → map to DTO.

## Stack
Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4 with CSS-variable tokens, Prisma on PostgreSQL, NextAuth (credentials), Zod, Vitest, Playwright (+ axe), GitHub Actions. LLM: Gemini API via `@google/genai` behind `src/llm/provider.ts`, with deterministic templates when no key is set. Fonts self-hosted with fontsource.

## Data sources (prototype vs production)
| Sport | Prototype source | Production |
|---|---|---|
| Cricket | Cricsheet ball-by-ball (historical) | Licensed live feed (procurement) |
| Formula 1 | OpenF1 historical (unofficial; `PROTOTYPE_DATA`) | Licensed F1 data |
| Football | StatsBomb open data (attribution) | Licensed event feed |
| Basketball, Tennis | Honest "source pending" states | Licensed feeds |
Policies live in `src/rights/policies/*.json` (schema in `docs/design-docs/data-and-rights.md`).

## Feature flags
`LIVE_CALLS=false` (no live calls until a licensed feed exists) · `PROTOTYPE_DATA=true` locally, `false` in production builds · `LLM_ENABLED` auto-true only when `GEMINI_API_KEY` is set.
