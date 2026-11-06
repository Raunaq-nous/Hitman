@AGENTS.md

## Compact instructions
When compacting, keep: the current feature id and its plan, the failing checks (from `node harness/verify.mjs` summary), and the next step. Drop full command output, file dumps and finished-feature detail; `harness/progress.md` and `harness/feature_list.json` hold the record.

## Codebase map
- For orientation, read docs/PROJECT_GUIDE.md first.
- If graphify-out/graph.json exists, use `graphify query "<question>"` or `graphify path "<A>" "<B>"` to see how parts connect. Read graphify-out/GRAPH_REPORT.md only for a broad review.
- Use `rg` or a direct file read for exact lookups and for any edit to a known file.
- Never say a function, route or table exists from the map alone; confirm it in the file.
- scripts/graph-refresh.sh rebuilds the map at session start. It is free (no model calls) and quiet; if Graphify cannot be installed, the session simply carries on without it.
- After code changes, run `graphify update .` to refresh the map.
