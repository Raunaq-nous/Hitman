---
name: review-gate
description: Skeptical self-review at a phase gate. Use at every gate in the active exec plan before merging to the default branch.
---

# Review gate
Review the diff since the last gate (`git diff <last-gate-tag>..HEAD --stat`, then file by file) as a demanding reviewer:
- Correctness against each acceptance criterion; maths checked against `docs/design-docs/models-and-grading.md`.
- Invariants: no-money, receipts, rights checks, DTO boundary, authorisation, temporal cutoff, public names only.
- Tests: meaningful assertions, offline, no skipped tests.
- UI: tokens only, accessibility, both widths and themes evidenced.
- Security: secrets, untrusted content, dependency audit (`npm audit --omit=dev`).
- Docs: specs, ARCHITECTURE, QUALITY_SCORE current.
Write findings to the exec plan under the gate, fix them, re-run the full gate, then tag `gate-<n>` and fast-forward the default branch (git-ship).
