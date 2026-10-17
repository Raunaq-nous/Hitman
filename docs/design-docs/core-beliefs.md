# Core beliefs (agent-first operating principles)

1. The repository is the system of record; anything not in it doesn’t exist for the agent.
2. A map, not a manual: short entry points, progressive disclosure.
3. Enforce invariants mechanically (lints, structural tests, schema checks) and write error messages that tell the agent how to fix the problem.
4. One feature at a time, verified end to end before it is marked passing; evidence or it didn’t happen.
5. Boring, well-documented technology beats clever dependencies.
6. Parse at boundaries; never build on guessed data shapes.
7. Continuous garbage collection: small refactors and doc gardening every few features, not big rewrites.
8. When the agent struggles, the fix is a missing capability (tool, doc, test, fixture), not “try harder”.
