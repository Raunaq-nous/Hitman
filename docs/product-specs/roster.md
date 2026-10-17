# The Roster

Five original analyst characters (see the table in `docs/PRODUCT_SENSE.md`). Each persona has `src/personas/<slug>/PLAYBOOK.md` (voice rules, vocabulary, skill words, what it never does) and a JSON card (name, sport, skill domain, colour token, pictogram).

- Every persona is labelled “AI analyst” wherever it speaks. No real athlete names, likenesses, voices or nicknames as features. Lineage is editorial history only (and only verified facts, e.g., Rohit Sharma’s 209 off 158 balls in Bengaluru on 2 November 2013).
- **Persona Switchboard**: a selector that re-voices the same verified facts in each persona’s style (deterministic template variants; LLM phrasing optional and verified).
- Persona tools: The Opener’s Over Call (live in the Lab); the others ship as clearly labelled demos on open data (Architect: possession value on StatsBomb open data; Professor: pit-window reasoning on OpenF1 historical; Iceman: Pressure Index; Closer: clutch-time leverage explainer with illustrative data).
