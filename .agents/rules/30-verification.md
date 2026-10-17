---
trigger: always_on
description: How to prove work: tests, gates, calibration, e2e, screenshots and evidence
---

# Verification
- Unit tests (Vitest) for every pure function in `src/engine/`, `src/rights/`, `src/llm/verifier`, parsers and services. Engine code targets 100% branch coverage.
- Integration tests for route handlers with a test database (schema reset per run).
- E2E (Playwright) for every user journey in the product specs, plus axe accessibility checks on each page.
- Required named tests: legal balls (`10.4 → 64`, `runRate(85,64) ≈ 7.97`), martingale property of the exact WP model, calibration buckets ≤ 5 points on held-out seasons, temporal-leakage tests, claim-verifier rejection tests, prompt-injection tests, no-money audit, DTO no-password test, crew-membership authorisation tests.
- Flakes: re-run once; if it fails again, fix the cause (never `skip` a failing test to pass a gate).
- Evidence entries list the exact commands and test names; screenshots are PNGs under `docs/evidence/<feature-id>/` named `<screen>-<width>-<theme>.png`.
