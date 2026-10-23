# Crews (replaces “leagues”)

- Private by default; created by any user; joined by invite link or code; owner can remove members or rotate the code; anyone can leave.
- Membership is checked on every crew page and API (no data leaks to non-members).
- **Timing-tower leaderboard** (F1-style dense list): rank, name, Read Rating, calibration (Brier), calls this week, form (last five), position change markers. Mobile-first.
- **“Called it” share cards**: an image route (`/api/og/call/[callId]`) rendering a graded call: question, confidence, moment and read, never the pick (D-043), with no personal data beyond display name and no prize language. The heading is “Called it” only when the pick was the best option, otherwise “My read”.
- Moderation basics: report a member, remove, block; owner transfer.
- Old fantasy “leagues” data migrated to crews (`Crew`/`CrewMember`; `/leagues/*` redirects to `/crews`); fee and prize fields were dropped.
