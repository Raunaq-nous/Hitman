# Reliability

- Honest states everywhere: `loading`, `empty`, `stale (with age)`, `error (with retry)`, `source pending`. Never show a number without a timestamp and source class.
- Freshness SLOs (future live mode): feed-to-screen ≤ 2 s p95; stale after 30 s for live, 24 h for historical replays (not applicable).
- Structured logs (JSON) with request ids; errors captured server-side; no PII in logs.
- Health route `/api/health` reports database connectivity and build version.
- Caches are keyed and bounded (TTL + size); no unkeyed module globals.
