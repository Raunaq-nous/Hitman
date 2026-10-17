---
name: doc-gardening
description: Bring docs back in line with the code. Use every 10 features and at every gate.
---

# Doc gardening
1. For each doc in `docs/index.md`, compare claims with the code (routes, schema, scripts, flags). Fix drift in the same commit.
2. Regenerate `docs/generated/db-schema.md` from `prisma/schema.prisma`.
3. Update `docs/QUALITY_SCORE.md` grades and gaps; add debt to `docs/exec-plans/tech-debt-tracker.md`.
4. Check links between docs; remove stale statements.
5. Commit as `docs(gardening): ...`.
