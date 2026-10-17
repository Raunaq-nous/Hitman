# Admin and scoreboards

- Server-side event log (`AnalyticsEvent`: id, userId nullable, name, props JSON, createdAt). Events: `moment_viewed`, `call_locked`, `review_viewed`, `next_read_started`, `share_clicked`, `receipt_opened`, `depth_changed`, `language_changed`, `alter_ego_revealed`.
- Queries compute the north star and KPIs weekly; tests use fixtures with known answers.
- `/admin/scoreboards` (admin-gated via ADMIN_EMAILS): Trust (freshness, corrections, leakage test status, verifier pass rate), Product (funnel, Review-to-Next-Read), Learning (calibration buckets, comprehension prompts), Business (placeholders for ARPU, data cost/user, model cost/read with live LLM cost logging).
