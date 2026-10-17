# Crews (replaces “leagues”)

- Private by default; created by any user; joined by invite link or code; owner can remove members or rotate the code; anyone can leave.
- Membership is checked on every crew page and API (no data leaks to non-members).
- **Timing-tower leaderboard** (F1-style dense list): rank, name, Read Rating, calibration (Brier), calls this week, form (last five), position change markers. Mobile-first.
- **“Called it” share cards**: an image route (`/api/og/call/[id]`) rendering a call, its grade and the moment, with no personal data beyond display name and no prize language.
- Moderation basics: report a member, remove, block; owner transfer.
- Old fantasy “leagues” data migrates to crews; any fee or prize fields are dropped.
