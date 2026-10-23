# Design system: Dossier × Munich ’72

Calm, dense and legible, like a well-kept case file, with the clarity of Otl Aicher’s Munich 1972 system (whose palette avoided the nationalistic red and black of 1936 and was dominated by light blue and white).

## Tokens (CSS variables; light and dark)
| Token | Hex | Use |
|---|---|---|
| `--alpine` | #8CC6E8 | Primary surface accent |
| `--snow` | #F5F7FA | Light background |
| `--ink` | #13233A | Text and dark background (never pure black) |
| `--opener` | #1E9A55 | The Opener |
| `--closer` | #E06A10 | The Closer |
| `--architect` | #2C58D4 | The Architect |
| `--professor` | #7540CC | The Professor / timing purple |
| `--iceman` | #1F8FC4 | The Iceman |
| `--call` | #FFD23F | The one hero colour: only where a decision is made or graded |
| `--receipt` | #6B7A8F light, #A9B4C2 dark | Receipts and metadata |
| `--brick` | #B5523B light, #FF8C75 dark (contrast checked) | Errors and losses (never pure red) |
Rules: no pure black or pure red; one hero colour (call yellow); each persona owns its colour; all text meets WCAG AA contrast in both themes.

## Type (self-hosted via fontsource)
Archivo (condensed, black weights) for headlines and numerals in UI; Literata for long reading; JetBrains Mono for receipts only. Tabular numerals for all scores and ratings.

## Components
Ticket (call card) · Stamp (“LOCKED”, “GRADED”, “CLASSIFIED”) · Receipt and Receipt Drawer · Leverage Meter · Swing Seismograph (WP chart with counterfactual ghost) · Timing Tower (leaderboard) · Persona Chip · Pictograms (original, on one grid) · Angled panels (sparingly) · Data-state badge · Stream-Delay Honesty Badge · Split-flap language toggle · Share card.

## The twelve screens
1 Ticket Call · 2 Swing Seismograph · 3 Receipt Drawer · 4 Timing-Tower League · 5 Dossier Reveal · 6 Pictogram Onboarding · 7 Counterfactual Ghost (in Review) · 8 Leverage Meter · 9 Persona Switchboard · 10 “Called it” share cards · 11 Split-flap language toggle · 12 Stream-Delay Honesty Badge.

## Motion and accessibility
Motion explains state changes (lock, reveal, rank change) and respects `prefers-reduced-motion`. Every interactive element is keyboard reachable with a visible focus ring. Automated axe checks run in e2e. Mobile-first (390 px) and desktop (1280 px) screenshots are evidence for every UI feature.

## Inspiration (study, don’t copy)
The Lando Norris site by OFF+BRAND (motion with restraint), Munich ’72 pictograms and grid, F1 timing-tower graphics, Persona-style bold angled panels used sparingly, editorial sports magazines (MUNDIAL, Racquet), The Pudding (explanatory visuals), Linear (calm hierarchy), Spotify Wrapped and Strava Year in Sport (personal recaps). See `docs/research/` for the dossier.
