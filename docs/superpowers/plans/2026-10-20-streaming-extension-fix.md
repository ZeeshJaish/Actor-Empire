# Streaming catalogue extension repair

Checkpoint: `9d770f3`, tag `checkpoint-lazy-load-extension-fix`, pushed before edits.

Approved scope: retain 1,040 real title entitlements through normalization, migration and auction updates; remove repeated programme/forecast and market-search preparation; keep Build catalogue reads warm while current network gates stay fresh. No economy changes, deferred saves or caches shared across transactions/mutations.

- [x] Retention: failing 1,000/1,001/1,040 boundary checks, durable entitlement/reference repair, reload and acquisition/renewal safety.
- [x] Programme/forecast: one explicit read batch, no unused route matrices, equivalent outputs and fresh grant/window validation.
- [x] Build: reuse catalogue-only results across immutable uncommissioned draft edits, invalidate other inputs, keep network/rehearsal gates current.
- [x] Search: one prepared platform/compatibility snapshot per query, same results and live transaction validation.
- [x] Verify targeted regression/safety suites, TypeScript and production build; retest production browser at 104 and 1,040 retained titles with post-paint long tasks.
- [x] Record before/after, independent review, leave Anshu local game ready. Final integration follows the user's authorized feature-branch push workflow.

Baseline and limits: `../reports/2026-10-20-streaming-1040-stress.md`. Existing economy audit has one independently reproduced pre-existing failure; do not broaden into economy tuning. Previously truncated licence economics cannot be invented from a partial local projection.

Review follow-ups: terminal licence history must not resurrect removed references; preserve legacy country-string validation and financial rows while removing the 80-country truncation; resolved build-country IDs, not draft existence, govern legacy forecast invalidation. Worldwide route reuse is limited to canonical GLOBAL licensed positions within one current read batch, partitioned by route/plan and market activity.

Final evidence: `../reports/2026-10-20-streaming-extension-fix.md` and its JSON companion. All 1,040 rights records retained, Build entry 5,442.1→396.4 ms, repeated rack tasks 601–709→61–84 ms. Cold stress entry remains measurable; one pre-existing economy audit failure is disclosed.
