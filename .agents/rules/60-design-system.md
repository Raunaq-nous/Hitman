---
trigger: always_on
description: Visual and interaction rules for every screen
---

# Design system rules
- Use tokens from `src/ui/tokens.css` only; no raw hex in components. No pure black (#000) or pure red.
- Call yellow (`--call`) appears only where a decision is made or graded.
- Archivo for headlines and UI numerals (tabular), Literata for long reading, JetBrains Mono for receipts only; all self-hosted.
- Mobile-first at 390 px; verify 1280 px. Light and dark themes.
- WCAG AA contrast, visible focus, keyboard support, `prefers-reduced-motion` respected; axe checks pass.
- Every number shows its receipt affordance; every data panel has a data-state badge.
