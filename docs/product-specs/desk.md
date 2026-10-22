# The Desk (Pulse)

## What it is
One brief across sports, ranked by **swing**: the absolute change in win probability over the item’s window. Each item: headline (template or verified LLM phrasing), the swing number with a mini seismograph, why it moved (rules-first story), and a receipts drawer.

## Rules
- Prototype content comes from historical replays (Cricsheet; OpenF1 historical behind `PROTOTYPE_DATA`; StatsBomb open data) clearly labelled “Historical replay” with the source class badge. No fabricated “live” items.
- Basketball and tennis show honest “source pending” states until licensed data exists (the Iceman’s Pressure Index can run on illustrative, labelled examples).
- **Depth switch**: Quick (one line, plain words), Tactical (fan vocabulary), Analyst (coach vocabulary, numbers). Deterministic templates exist for all three; LLM phrasing is optional and must pass the claim verifier.
- **Language**: English and Hindi at launch for UI and templates; a split-flap style toggle.
- **Event Rooms**: one room per event with the WP chart, leverage meter, story list and data-state badge; a **stream-delay honesty badge** explains that feeds and broadcasts run at different delays.
- Story detector is rules-first (like F1 Track Pulse): each sport has explicit thresholds (e.g., cricket: WP swing ≥ 15 points within an over; wicket at leverage ≥ p90; required rate crossing 12) producing prioritised stories.
- Query planner: structured questions go to the database; documents to retrieval; the LLM only phrases results.

## Built so far (F-K-01, F-K-06, F-K-07)
`/desk` (`src/app/desk`, `src/domain/desk`) builds the brief from the committed recorded replays through the adapter registry and the story detector (`src/domain/stories`, thresholds in `config.ts`), ranked by modelled swing (largest six-ball |ΔWP| from the exact chase model). Football and F1 have no WP model, so they show "Swing: not modelled" and rank after, by story priority (D-023). Receipt Drawer, depth switch, Hindi and Event Rooms are not built yet.
