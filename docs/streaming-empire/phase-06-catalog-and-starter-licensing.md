# Phase 6 — Catalog and Starter Licensing

Phase 6 establishes the first real EMPIRE+ content-business loop without implementing Originals, slate programming, weekly audience simulation, or the later full rights marketplace.

## Player flow

1. Open Content Room and start the catalog setup.
2. Review released titles from player-controlled production houses.
3. Select owned titles to link by canonical project ID.
4. Choose Curated Premiere, Broad Appeal, or Prestige Vault as the opening programming thesis.
5. Select one actual released external project as the anchor license.
6. Negotiate territory, term, exclusivity, minimum guarantee, and platform/licensor revenue split.
7. Respond to a deterministic counteroffer or reach ready-to-sign terms.
8. Review the final agreement and sign it from EMPIRE+ treasury.
9. Return to Content Room to see the canonical catalog and expiry-capable rights ledger.

## State and ownership rules

- `catalogProjectIds` stores project IDs only. Existing project records remain the source of truth for titles, casts, budgets, reviews, and release results.
- Owned-library imports come only from released projects tied to a production house the player controls, including inherited studio-library records.
- Owned imports create no internal sale, revenue, expense, or consolidated profit.
- External licenses charge only `OwnedStreamingPlatformState.treasuryCash`.
- The first external contract persists territory, duration, exclusivity, minimum guarantee, both revenue shares, signing week, start week, and absolute expiry week.
- Negotiation drafts are resumable. Commercial edits invalidate an earlier counter or ready-to-sign state.
- Signing is idempotent: the starter catalog can be established once and treasury cannot be charged twice.
- Unknown ratings or grosses are displayed as unknown, not zero.

## Deferred

- Platform Originals and twelve-week slate programming: Phase 7.
- Launch readiness and the first subscriber forecast: Phase 8.
- Weekly subscribers, churn, engagement, and title performance: later simulation phases.
- Renewals, sublicensing, rotating rights markets, competitive bids, and contract disputes: later rights and competition phases.
