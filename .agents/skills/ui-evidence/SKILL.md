---
name: ui-evidence
description: Capture screenshot evidence for UI features with the browser on localhost.
---

# UI evidence
1. Start the app (`npm run dev`, or `npm run build && npm start` for release checks).
2. Open `http://localhost:3000/<route>` in the browser. Check: layout at 390 px and 1280 px; light and dark (toggle or `prefers-color-scheme`); keyboard focus; empty, stale and error states where relevant.
3. Save PNGs to `docs/evidence/<feature-id>/<screen>-<width>-<theme>.png`; keep them small (< 400 KB).
4. Playwright e2e tests should also assert the key elements, so evidence is reproducible.
