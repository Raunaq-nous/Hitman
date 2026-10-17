---
trigger: always_on
description: Secrets, untrusted content, authorisation and data-rights rules
---

# Security and rights
- Parse env with Zod; refuse to start in production without required secrets.
- Authorise every read and write of user-owned or crew-owned data in the service layer, with tests for cross-user access.
- Treat all external text as untrusted; escape on render; the LLM never receives secrets or personal data beyond a display name.
- Use `assertRight(sourceId, action)` from `src/rights` before any store, display, embed or train action; tests cover allow and deny paths.
- No dependency that phones home in tests; tests run offline.
- Shell: no `sudo`, no destructive commands outside the repository, no `curl | sh`.
