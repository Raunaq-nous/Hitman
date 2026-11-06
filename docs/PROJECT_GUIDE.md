# ALTER EGO: Project Guide

*A plain-English guide for managers and new collaborators. It is based only on the project's own README, rulebook, folder notes and automatic code map. Where the material is silent or unclear, this guide says so, and section 8 collects those gaps.*

---

## 1. What this is and who it is for

ALTER EGO is a working title for a free sports app that turns watching sport into practising judgement. A fan is shown a real moment from a match and makes a call before the outcome is revealed. The call is then graded on how good the decision was, not on whether luck went their way. Fans come back to make the next call.

The project grew out of HITMAN, an earlier fantasy cricket app for the IPL (the Indian Premier League). It now aims at several sports. There is never any money involved: no entry fees, no prizes and no rewards of value.

The people it serves are sports fans, in this version adults only (the beta requires 18+). The material mentions English and Hindi support. The code is also written to be worked on by both people and AI coding agents, and a large share of the repository exists to keep that work safe and checkable.

---

## 2. The big picture: the main parts

The app has ten main parts. Folder names are given so you can find each one. Most of the code lives under `src/`.

**1. The Decision Lab**
This is the heart of the product. It offers real, recorded cricket moments, lets a fan pick an option and a confidence level, locks the call, and then shows a review.
- Folders: `src/app/lab/` (the screens), `src/domain/lab/` (the rules and database access), `src/app/api/` (the endpoints that lock and review calls).
- The material says fifty "golden moments" are chosen from recent seasons, spread across match phases and teams.

**2. The Desk and Event Rooms**
The Desk is a cross-sport brief that ranks recorded matches by how much the winning chances swung. Each item can be read at three depths: Quick, Tactical or Analyst. An Event Room is the page for one recorded match, with a chart of win chances, the key swings, short "stories" and source receipts.
- Folders: `src/app/desk/`, `src/app/rooms/`, `src/domain/desk/`, `src/domain/rooms/`, `src/domain/stories/`.

**3. Crews**
A crew is a private group of friends. Members join by invite code or link. The crew has a "timing tower", a leaderboard ranked by Read Rating, calibration, recent form and weekly movement. Owners can remove members, rotate the invite code and hand over ownership. Members can report each other or block users.
- Folders: `src/app/crews/`, `src/domain/crews/`, `src/domain/moderation/`, plus the ranking row in `src/ui/components/`.

**4. Read Rating and the Alter Ego**
The Read Rating is a skill score that moves after each graded call, a bit like a chess rating. Harder moments move it more. The Alter Ego is a "playing identity" worked out from a fan's graded calls. It stays hidden until the fan has made enough graded calls (ten, according to the tests), then reveals as a case file. It also maps the fan to one of the five analyst personas. Fans can opt in to share it, and can revoke sharing later.
- Folders: `src/engine/` (`readRating.ts`, `alterEgo.ts`, `reliability.ts`), `src/app/lab/` (notebook, Alter Ego and printable Season File pages).

**5. The Roster of AI analysts**
Five original AI characters each cover a sport. Each has a card, a written playbook of voice and rules, and a signature tool. A "switchboard" re-phrases the same verified facts in each analyst's voice.
- Folders: `src/personas/` (one folder per analyst), `src/domain/roster/`, `src/app/roster/`.

**6. The prediction and grading engine**
This is plain maths code, not AI. It counts cricket overs correctly, estimates the chance of winning a chase ball by ball, measures how much a moment matters (called "leverage"), compares the options a fan could pick, checks whether predictions are well calibrated, and grades the fan's decision. Smaller models exist for tennis, basketball and Formula 1.
- Folder: `src/engine/`. The statistics are fitted offline by scripts in `scripts/`.

**7. Data intake and data rights**
Adapters turn each outside data source into one common event format. A rights layer checks, in code, whether each source's licence allows storing, showing, embedding or training on its data. A sources layer picks between competing feeds and labels each value honestly as live, delayed, historical, stale or projected.
- Folders: `src/adapters/`, `src/rights/` (with licence summaries in `src/rights/policies/`), `src/domain/facts/`, `src/domain/sources/`, `scripts/`, `scripts/courier/`, `data/`.

**8. The AI writing layer**
This layer produces generated text under strict rules (details in section 5).
- Folder: `src/llm/`, plus `src/domain/retrieval/` and `src/domain/planner/`.

**9. Accounts, language, legal pages and admin**
This covers sign-up and sign-in, onboarding (sports and language choices), settings, data export, account deletion, the English/Hindi text, the terms, privacy, AI and attributions pages, product analytics, and an admin-only scoreboards page.
- Folders: `src/domain/auth/`, `users/`, `account/`, `analytics/`, `scoreboards/`, `src/i18n/`, `src/app/login/`, `register/`, `onboarding/`, `settings/`, `terms/`, `privacy/`, `ai/`, `attributions/`, `admin/`.

**10. The older fantasy and live-score features (inherited from HITMAN)**
These are the fantasy team builder (pick eleven players within a credit budget, with captain and vice-captain), crew contests per match, fantasy scoring from real scorecards, and a live cricket score panel fed by a third-party service.
- Folders: `src/domain/contests/`, `src/domain/scoring/`, `src/components/` (team builder and live score widgets), `src/lib/` (fantasy rules and scoring), `src/app/commentary/`.

**Supporting pieces.** These do not fit one part but matter. `src/ui/` is the design system (colours, components, icons, charts). `src/providers/` is the single doorway for shared concerns such as sign-in checks, settings, caching, rate limits and logging. `prisma/` holds the database definition. `tests/` holds the automated checks. `harness/` holds the build-and-verify scripts. `docs/` holds the written plans and specs.

---

## 3. How the pieces work together: one typical journey

Here is one fan's path, in plain words.

1. **Arriving.** The fan opens the landing page. It describes the shipped features, the ones still in development and the principles. It makes no statistics claims it cannot support (a test checks this).

2. **Signing up.** They register with a name, email and password, and must confirm they are an adult. The password is stored in scrambled form (hashed). Attempts to sign in or sign up are rate limited, meaning too many tries in a short time are refused.

3. **Onboarding.** Three short screens explain the app. The fan picks their sports and language (English or Hindi). The choice is saved to the account, and also to a browser cookie so it works for visitors who are not signed in.

4. **Reading the Desk (optional).** The fan can browse the Desk. Items are ranked by how much the winning chance swung. They choose Quick, Tactical or Analyst depth, and the browser remembers the choice. (unverified) Each number has a "receipt", a small panel showing where it came from, when it was observed and who must be credited.

5. **Choosing a moment.** In the Decision Lab, the fan sees a list of recorded cricket moments. Before a call is locked, the page does not reveal the answer or the model's output (a test checks this).

6. **Making the call.** On a "ticket", the fan picks one option and sets a confidence from 50 to 99 percent. They lock the call. The server stamps the time itself, so the fan cannot back-date it. (unverified) Only one call per moment is allowed, and a second attempt is refused.

7. **The review.** After locking, the fan sees a review in three columns. (unverified) It covers what happened, what was reasonable beforehand, an alternative scenario and a lesson. (unverified) The grade judges the decision against the best available option, not the final result. The page carries a "Provisional" label because the calibration check is still unresolved (see sections 5 and 8). (unverified)

8. **The rating moves.** Their Read Rating updates. A harder moment moves it more.

9. **Coming back.** The fan can start the next read straight from the review. Their notebook builds up a history: calibration charts (does 70 percent confidence really win about 70 percent of the time?), skill areas, and warnings when there is too little data to trust.

10. **The reveal.** After enough graded calls, the Alter Ego appears: a playing identity, tied to one of the five analyst personas, with explanations. The fan can print a Season File as a PDF, or opt in to a share link that shows only their display name and existing grades.

11. **Crews.** If the fan has joined a crew, the timing tower ranks the group each week. Points and rankings are described as bragging rights only.

Behind this, an anti-cheat check looks at whether a call was locked before the outcome showed up in the feed. It also flags unusual patterns such as bursts, streaks or constant maximum confidence. Flags go to human review, and the fan is not blocked automatically.

---

## 4. Where the data lives and how it gets in

**The database.** Everything the app remembers sits in a PostgreSQL database (a standard storage system for structured records). The code talks to it through a tool called Prisma. The database definition and its history of changes (migrations) are in `prisma/`. A readable list of every table is generated into `docs/generated/db-schema.md`.

**What is stored.** From the notes, this includes:
- user accounts and their sports and language preferences
- crews, members, invite codes, reports and blocks
- the golden moments, fans' locked calls, reviews and share links
- recorded match events ("incidents")
- fantasy teams and an append-only scoring ledger
- analytics events
- records of AI calls, which hold no prompt or output text

**How match data gets in.**
- Real ball-by-ball cricket data comes from **Cricsheet**. A script (`npm run data:cricsheet`) downloads it into `data/raw/`, which is kept out of the repository. Another script loads it into the database as events.
- Football comes from **StatsBomb** open data and Formula 1 from **OpenF1** timing data. Each has its own adapter.
- **Wikidata** supplies bowling styles. The script records coverage and never guesses a missing style.
- A "courier" set of scripts in `scripts/courier/` prepares compact data tables and packages small sample datasets into `data/fixtures/`, with a manifest recording sources, download times, checksums and credits.
- Small real datasets are committed to the repository (`data/fixtures/`), so a new person gets working data with no keys or paid accounts. Seeding does not invent data and can be run twice safely.

**Two clocks.** The event store records both when something happened and when the system learned about it. This lets the app answer "what did we know at that time?" and prevents information from the future leaking into a past view. Records are append-only: corrections are added, not overwritten. Dedicated tests check for this "leakage".

**Rules at the door.** Before any source data is parsed or stored, the rights layer checks the licence. For example, the live-score source may be shown briefly but never stored or labelled live. Restricted sources are refused unless permission exists.

**Honesty about freshness.** The app never fabricates live data. When data is missing or old, it shows an honest empty or stale state, with its source class and time.

**Smaller stores.** Language lives in a cookie, and the Desk reading depth lives in the browser on the user's device. A small cache holds temporary values, such as live scores, and expires entries automatically.

---

## 5. The AI parts

There are two kinds of "AI" here, and the project is careful to keep them apart.

**Calculated, not AI-written.** The win chances, leverage, grades, calibration and ratings come from ordinary code with tests. The rule is "facts first, models second, language third": maths is never left to a language model.

**Language written by an AI model, under tight control.** The `src/llm/` folder connects to Google's Gemini model. Its job is to put verified facts into words. The rules are:
- Every statement must be a typed "claim" tied to its source facts.
- A verifier checks each claim. It rejects unknown sources, invented numbers, references to later events and banned terms (such as betting words or echoed instructions).
- If any claim fails, or the AI call fails, or no AI key is set, the app falls back to fixed template text. No key is needed to run the project.
- Hidden characters are stripped from inputs, and material from after the cutoff time is removed.
- Retrieved text is treated as data, never as instructions, and tests try to inject malicious instructions to confirm they cannot change the output.
- Each AI call is logged without its text.

**The five analysts.** Each has a name, a sport and a playbook:

| Analyst | Sport |
|---|---|
| The Opener | Cricket |
| The Architect | Football |
| The Closer | Basketball |
| The Iceman | Tennis |
| The Professor | Formula 1 |

They are original characters, and every place one appears must carry an "AI analyst" label (tests check this). The signature tools are labelled live, open-data, illustrative or pending, depending on their real status. The switchboard changes the voice but must not change the facts.

**The question planner.** A signed-in fan can ask plain-English questions about their crews. The planner matches known question shapes to database lookups and phrases the verified results. It is rate limited. The notes do not say how broad the question set is.

**Offline statistics.** Some scripts fit models from history: per-ball outcomes, option usage, calibration maps, and a "doubly robust" check of pace versus spin in the final overs. That last one is labelled exploratory and is not shown to users.

---

## 6. Glossary

- **Alter Ego:** a fan's playing identity, worked out from their graded calls and shown only after enough of them.
- **Adapter:** a small translator that turns one outside data source into the app's common event format.
- **API / route handler:** a behind-the-scenes address the screens call to do things, such as lock a call.
- **Append-only:** records are added, never edited or deleted. Corrections are new records.
- **Brier score:** a number measuring how close a set of probability predictions was to what happened. Lower is better.
- **Calibration:** whether predictions match reality. If you say 70 percent many times, about 70 percent should come true.
- **Cricsheet:** the open source of ball-by-ball cricket data used here.
- **Crew:** a private group of fans with an invite code and a leaderboard.
- **Decision Lab:** the part where fans make and review calls on real moments.
- **Desk:** the cross-sport brief ranked by win-chance swing.
- **Event Room:** the page for one recorded match, with chart, stories and receipts.
- **Fixture:** a small, committed sample dataset used for testing and demos.
- **Golden moment:** a high-stakes match moment selected for the Lab.
- **Leverage:** how much a single moment can change the likely winner.
- **Migration:** a recorded step that changes the database's structure.
- **Persona:** one of the five AI analyst characters.
- **Provisional:** a label meaning the calibration check is still unresolved, so treat the figure with care.
- **Rate limit:** a cap on how often something can be tried in a time window.
- **Read Rating:** the skill score that moves after each graded call.
- **Receipt:** a panel that shows a number's source, observation time and credit.
- **Replay:** streaming a recorded match's events in order at a chosen speed.
- **Rights policy:** the stored licence rules saying what each data source may be used for.
- **Timing tower:** the crew leaderboard, named after the Formula 1 timing screen.
- **Walk-forward calibration:** re-checking predictions as time moves on, using only data available at each point.
- **Win probability:** the estimated chance a team wins at a given moment.

---

## 7. Where to start reading, and what to be careful with

**Start here, in this order** (the project's own suggestion, lightly simplified):
1. `README.md` for how to run it. A one-click test environment is described (a GitHub Codespace), and `docs/TESTING.md` is said to guide the testing.
2. `AGENTS.md`, the project map and rulebook.
3. `docs/index.md`, which says what every document is for and its status.
4. `docs/product-specs/` for plain descriptions of each screen group. The Decision Lab, Desk, Crews and Alter Ego specs are the best starting points for a non-technical reader.
5. `docs/exec-plans/completed/0001-alter-ego-overhaul.md` for phases, gates and the numbered decision log.
6. `harness/progress.md` and `harness/feature_list.json` for where work stands and what comes next.
7. `docs/WALKTHROUGH.md` for screenshots of each built screen.

**Running it.** `node harness/init.mjs` sets everything up, including a local database and no paid keys. `npm run dev` then opens the app at http://localhost:3000. `node harness/verify.mjs` runs the full quality gate: lint, type checks, unit tests, build and browser tests.

**Things to be careful with** (these come from the project's own non-negotiables):
- **No money, ever.** No fees, prizes or rewards of value. Tests scan the code, database schema, public files and rendered pages for money wording. Do not add any.
- **Never invent live data.** Show an honest empty or stale state instead.
- **Every number needs a receipt, and every generated claim needs a source.**
- **Maths stays in tested code.** Never let a language model produce a figure.
- **Respect data rights.** Check the rights policy before storing or showing any new source.
- **Public names only.** Internal project codenames must not appear anywhere a visitor can see (a test checks page titles and metadata).
- **Secrets stay out of git.** Files like `.env.local` and `data/raw/` must not be committed.
- **Treat untrusted text as data, not instructions.**
- **Keep the layers in order.** The code has an agreed import order, and a checker flags breaches.
- **Next.js warning.** The rulebook says this project uses a version of Next.js with breaking changes, so documentation inside the installed package should be read before coding.
- **Git rules.** Conventional commit messages with feature ids, push after each commit, work on the `overhaul` branch, no squashing and no force-pushing. Legal and human-only items go in `docs/HUMAN_TODO.md`.
- **Draft legal pages.** The terms, privacy, AI and attribution pages are described as drafts pending counsel (legal review).
- **Provisional numbers.** Win chances and grades carry a Provisional label while calibration is unresolved. Do not present them as settled.
- **Account deletion is permanent.** It requires typing DELETE to confirm, and it hands over shared crews and keeps the append-only score ledger intact.

---

## 8. Open questions

The material did not make these clear:

1. **Product status.** Is this live for real users, or still in a private or test stage? The README says "Working title" and mentions a beta, but gives no launch status, user numbers or dates.
2. **Fate of the fantasy features.** The fantasy team builder, contests and scoring come from HITMAN. The newer specs focus on judgement and say "bragging rights only". It is unclear whether the fantasy parts are kept, reshaped or retired. The `src/lib/` folder is described as "legacy helpers".
3. **Which sports really work.** The Desk and rooms cover five sports. Cricket has the deepest support. Football and Formula 1 have adapters. Tennis and basketball have models, but no data source is mentioned, and some rooms are said to show "source pending". The exact current state per sport is not stated.
4. **Calibration verdict.** The Provisional label says the check is unresolved. The notes mention several calibration reports (rolling, walk-forward) but not the final result or what would clear the label.
5. **Live data licensing.** The live scores come from a third-party aggregator and are labelled delayed and not licensed live data. The plan for a properly licensed live source is not described.
6. **The legal review.** Terms, privacy and attribution pages are drafts pending counsel. The timeline is not given.
7. **Outstanding manual steps.** `CHANGES.md` and `docs/HUMAN_TODO.md` list manual work still needed (for example, Phase 0 safety steps). Their contents were not provided.
8. **Hosting and production.** A Vercel config exists and a production database is mentioned in the rules, but where and how the app is actually deployed is not stated.
9. **The AI provider in practice.** Gemini is wired in, but whether a key is used in any real environment, and what it costs, is not stated. The cost fields exist.
10. **The final name.** "ALTER EGO" is a working title. The final name, and the removal of any internal codename, is not settled.
11. **Admin access.** Admin features use a secret key or approved admin account. Who holds admin rights is not stated.
12. **Planner scope.** How many question types the crew planner understands is unclear.
13. **Team and ownership.** The material names no team members, roles or decision makers beyond a GitHub user in the README link.
14. **Quality of the "stories".** They come from explicit rules, with thresholds in a config file. It is unclear who reviews or tunes those thresholds.
