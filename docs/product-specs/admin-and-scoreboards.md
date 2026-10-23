# Admin and scoreboards

- Server-side event log (`AnalyticsEvent`: id, userId nullable, name, props JSON, createdAt). Events: `moment_viewed`, `call_locked`, `review_viewed`, `next_read_started`, `share_clicked`, `receipt_opened`, `depth_changed`, `language_changed`, `alter_ego_revealed`, plus server-side `call_graded` (a call's grade became available; the north star's denominator).
- Queries compute the north star and KPIs weekly; tests use fixtures with known answers.
- `/admin/scoreboards` (admin-gated via ADMIN_EMAILS): Trust (freshness, corrections, leakage test status, verifier pass rate), Product (funnel, Review-to-Next-Read), Learning (calibration buckets, comprehension prompts), Business (placeholders for ARPU, data cost/user, model cost/read with live LLM cost logging).

## KPI definitions (as implemented in `src/domain/analytics/kpi.ts`)
Weeks are ISO weeks in UTC (Monday 00:00). A user is **active** in a week if they have any event in it.
- **Review-to-Next-Read rate**: of users with a `call_graded` event in the week, the share who have a `review_viewed` and then a later `call_locked` in the same week.
- **Graded calls per weekly active fan**: `call_graded` events ÷ active users.
- **Call participation**: users with `call_locked` ÷ users with `moment_viewed`.
- **New-fan first-call rate**: of users whose first-ever event is in the week, the share who lock a call within 7 days of that first event.
- **D7 / D30 retention**: of users whose first-ever event is in the week, the share active on days 7–13 / 30–36 after it.
- **Share rate per Alter Ego reveal**: `share_clicked` with kind `alter_ego` ÷ `alter_ego_revealed` events.
- **Receipt tap-through**: users with `receipt_opened` ÷ active users.
A rate with a zero denominator is reported as `null` (no data), never as 0%.
