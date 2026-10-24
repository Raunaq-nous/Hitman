# Testing ALTER EGO

## Start
1. Open https://codespaces.new/Raunaq-nous/Hitman and create a Codespace on `main`. The devcontainer (`.devcontainer/devcontainer.json`) needs 4 cores and 8 GB, which is the default machine.
2. Wait for the one-time setup (`.devcontainer/setup.sh`, about 3–5 minutes). It runs these steps:
   - installs dependencies;
   - writes `.env.local` with a random `NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to the forwarded port, and `ADMIN_EMAILS="tester@example.com"`;
   - starts Postgres (`npm run db:local`);
   - applies migrations;
   - seeds the committed real fixtures. That is 7 Cricsheet IPL matches, 1 StatsBomb match and 1 OpenF1 race, about 2,700 incidents. No invented rows.
3. When the terminal attaches, `npm run dev` starts the app on port 3000 and the browser opens it. If it doesn't open, use the **Ports** tab: port 3000, "Open in browser".
4. To restart the app: `npm run dev`. If the database is down after a restart: `npm run db:local`.

No API keys are needed. Without `GEMINI_API_KEY`, language comes from templates. `LIVE_CALLS=false`: everything runs on historical, recorded data.

Tip: register **tester@example.com** first. That address is the admin in the Codespace, so you can check the admin scoreboards too. Register a second account (for example in a private window) for the crews journeys.

## Journeys
Each journey gives the steps, then the expected result.

### 1. Sign-up with the 18+ check
1. Open **Join free**, at `/register`.
2. Fill in name, email and password (at least 10 characters).
3. Submit without ticking **I am 18 or over**, then tick it and submit again.

Expected:
- Without the tick, sign-up is refused with "ALTER EGO’s beta is for people aged 18 and over. Please confirm your age to continue."
- With the tick, the account is created and you are signed in.
- Repeated failed attempts are rate-limited.

### 2. Onboarding
1. After sign-up (or at `/onboarding`), go through three pictogram screens using only the keyboard (Tab, then Enter on **Next**).
2. Pick sports and a language, then **Start**.

Expected:
- Three screens: "Make the call before it happens", "We grade the decision, not the luck", and "Your sports and your language".
- Choices are saved to your account, and the language cookie is set.

### 3. A historical call: lock → three-column review → next read
1. Go to **Lab** (`/lab`) and open a moment.
2. Pick an option (attack / hold / ease off, or a run-rate band), move the confidence slider (50–99%), and press **Lock my call**.
3. Press **See your review**, then **Next read**.

Expected:
- Before you lock, the moment shows only the pre-lock state: score, overs as `O.B`, required rate, leverage meter. No result and no model answer appear.
- After the lock: a **LOCKED** stamp.
- The Review shows your grade ("Read: +x.x pts" or "Coin flip — no grade"), the Read Rating change and the Brier score, plus three columns:
  - **What happened**: the next over as played, and the result.
  - **What was reasonable beforehand**: the model's estimate for each option.
  - **What might have happened otherwise**: a scenario model estimate, labelled as not fact.
- Every column has a receipt.
- The win-probability chart has a dashed "ghost" line.
- Every grade and win probability is labelled **Provisional calibration**.
- **Next read** opens a moment you haven't called.
- Locking the same moment again says "You've already locked a call on this moment." and links back to the review.

### 4. Notebook calibration
1. Make 3 or more calls.
2. Open `/lab/notebook` (linked from `/lab`).

Expected:
- A call history table you can filter by decision type.
- A reliability diagram in 10-point confidence buckets; hollow dots mean small samples.
- A chart of the Brier score over time.
- A skill radar.
- Small-sample warnings ("Small sample: N graded calls here…").

### 5. Read Rating
On `/lab/notebook`, look at the **Read Rating** panel.

Expected:
- Starts at 1200.
- A best pick never lowers it, and a wrong pick never raises it.
- Shows "Provisional rating" until 20 graded calls.
- Has a history chart and the **Provisional calibration** badge.

### 6. Crews and invites
1. Go to **Crews** (`/crews`), create a crew, and copy the invite link or code (**Invite friends**).
2. With the second account, open the link (`/crews/join/<code>`).
3. As owner, try rotating the code, removing a member, and reporting a member.

Expected:
- The crew is private.
- The second account joins through the link.
- Only the owner can rotate the code or remove members.
- An old code stops working after a rotation.

### 7. Timing-tower leaderboard
Make calls with both accounts, then open the crew's **Timing tower (Read Rating)** at `/crews/<id>/tower`.

Expected:
- One row per member, showing:
  - rank and Read Rating;
  - Brier score;
  - "N calls this week";
  - form over the last five calls (+ best pick, − not the best, · coin flip);
  - places gained (▲) or lost (▼) since Monday.
- The page is labelled **Provisional calibration**.

### 8. A share card
On a graded call's Review, press **Share card (image)**. For your Alter Ego, see journey 17.

Expected:
- A 1200×630 PNG showing your display name, the question, your confidence, the moment, the read, and **Provisional calibration**.
- The heading reads "CALLED IT" when your pick was the best option, otherwise "MY READ".
- The card never shows the pick itself (so it can't give away a moment's answer), never shows email or ids, and has no prize language.

### 9. Desk receipts
1. Open the **Desk** (`/desk`).
2. On a story, open the **src …** receipt.

Expected:
- The brief is built from recorded replays and ranked by swing.
- A receipt drawer opens with the source, class (verified delayed), date and attribution, plus the historical-replay note.
- Escape closes the drawer and returns focus.

### 10. The depth switch
On the Desk, switch **Depth** between **Quick**, **Tactical** and **Analyst**.

Expected:
- The same stories, with more or less detail.
- Numbers stay identical across depths.

### 11. Hindi
Use the language toggle (**हिन्दी**) in the navigation.

Expected:
- The Desk and navigation switch to Hindi (for example "डेस्क", and "गहराई" with "झटपट / रणनीतिक / विश्लेषक").
- The choice persists across pages.
- Other screens stay in English (a known limitation).

### 12. Source-pending states
1. Open **Rooms** (`/rooms`), then basketball and tennis.
2. Check the Desk for pending sports.

Expected:
- Basketball and tennis show **Source pending**, with the reason (no licensed feed). No invented data appears.
- Football and F1 rooms say "No win-probability model for this sport yet.", and on the Desk their stories show "Swing: not modelled".

### 13. Roster AI labels
Open **Roster** (`/roster`) and each analyst.

Expected:
- Five original analysts: The Opener, The Closer, The Architect, The Professor and The Iceman. Each is labelled **AI analyst** wherever it speaks.
- Each has a signature tool:
  - The Opener's Over Call links into the Lab.
  - The Architect's and The Professor's tools are labelled "Demo on open data", with receipts.
  - The Iceman's and The Closer's tools are labelled "Illustrative data, not a real match".

### 14. Legal pages
Open the footer links: **Terms**, **Privacy**, **Attributions** and **How AI is used**.

Expected:
- Plain-language pages.
- "Free to play. No money, ever. Beta for ages 18+." appears in the footer.
- Attributions list every data source and its licence notes: Cricsheet, StatsBomb, OpenF1, CricketData.org and Wikidata.

### 15. Data export and delete
1. In **Settings** (`/settings`), press **Export my data**.
2. Then type DELETE and press **Delete my account**.

Expected:
- A JSON download with your account, crews, calls, reviews and events. It contains no password hash.
- The delete button stays disabled until you type DELETE.
- After deleting, you are signed out, and your calls, reviews and share link are gone.

### 16. Admin scoreboards
1. Signed in as **tester@example.com**, open `/admin/scoreboards`.
2. Repeat with another account.

Expected:
- As the admin: **Scoreboards**, with Trust, Product (week of …), Learning and Business panels computed from the event log.
- As any other account: a 404.

### 17. Alter Ego and Season File (bonus)
1. After 10 graded calls, open `/lab/alter-ego`.
2. Open `/lab/season-file` and print it.

Expected:
- The Alter Ego file is **CLASSIFIED** until 10 graded calls. Then it is **REVEALED**, with a persona, a modifier and five explained axes.
- Sharing is opt-in and revocable: **Share my Alter Ego**, then **Stop sharing**.
- The Season File prints cleanly and never names a moment's best option.

## Known limitations
- **Historical only:** live calls are off (`LIVE_CALLS=false`) until a licensed live feed exists. Basketball and tennis are "source pending".
- **Provisional calibration:** grades come from the exact model's option differences and are labelled as such. The calibration gate passes narrowly (D-038).
- **Fifty moments:** the Lab has 50 golden IPL moments (2024–2026 chases) and two decision types (next-over intent, chase tempo). Pace-vs-spin is modelled but never offered, because there is too little bowler-style data.
- **Fixed difficulty:** moment difficulty is fixed per moment (D-041).
- **Hindi coverage:** Hindi covers the Desk and navigation only (TD-009).
- **Prototype F1 data:** OpenF1 data is prototype-only and is hidden in production unless `PROTOTYPE_DATA=true`. The Codespace sets it on.
- **Seed is fixtures only:** the seed loads only the committed fixtures. Users, crews and calls are whatever you create while testing.
- **Template language:** with no Gemini key, generated language uses templates.
- **Legacy screens:** `/crews/<id>/match/...` and `/commentary` still exist (TD-001).

## Automated checks
`node harness/verify.mjs` runs lint, typecheck, unit tests on Postgres, the build and e2e (Playwright + axe). `node harness/verify.mjs --clean` repeats it from a fresh clone. The e2e specs in `tests/e2e/` cover each journey above.
