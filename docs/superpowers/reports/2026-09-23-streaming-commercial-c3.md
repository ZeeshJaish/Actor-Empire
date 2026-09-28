# Streaming Commercial C3 — audience choice implementation and verification

Date: 2026-09-23  
Scope: aggregate household access choice and title-transaction entitlement state. **No live revenue activation.**

## Delivered

- `world.worldStreamingAudienceChoice` is a versioned, saved shadow projection built from canonical population, participation, country offers, and the existing monthly/annual paid affordability allocator. It separates paid subscription primary households, secondary subscriptions, free-ad primary households, store-only primary households, and the outside option. Every reachable household has one primary choice; transaction and pass opportunities do not add households.
- The same deterministic allocation function handles player and AI offers. It filters zero-price `FREE`/`OPEN_ACCESS` pseudo-plans out of C3 paid accounts and supports genuinely ad-only and store-only input offers. Higher price sensitivity can divert willing paid households toward free access; ad load, affordability, catalogue, localization, reliability, marketing and reputation influence choices. Existing WE1–WE3 population totals and household budgets are not edited.
- Country totals, player country counts, global platform counts, subscription budget/spend, and bounded pass/rental/purchase *opportunities* are stored. Ad-free-pass opportunities include ad-exposed paid tiers as well as free-ad access. These are intent estimates, not settled sales or extra viewers.
- An explicit, idempotent aggregate title-transaction hook records player rental/purchase ownership only after the C2 country, week, offer, and rights evaluator allows it. Rentals expire at their exclusive end week; durable purchases remain after ordinary license expiry. The ledger rejects overflow rather than silently dropping valid ownership. AI platforms receive opportunity counts but no fabricated title ownership because their per-title rights adapter is not yet connected here.
- Save migration, weekly processing, derived-state repair, deterministic digest, compaction, and save integrity include C3. A changed same-week offer invalidates a stale projection. The save integrity manifest now protects title ownership and country/platform choice counts. No past transaction is fabricated on old saves.

## Gameplay and balance boundary

C3 does **not** switch WE5/WE6 viewing, subscription churn, advertiser impressions, treasury, AI cash, or launch forecast to these new counts. The old live `OPEN_ACCESS` compatibility row remains for one phase. Its known ad-only $0 live-revenue bug is not fixed here. An explicit entitlement hook exists for future settled transactions, but no existing weekly flow invokes it, so ordinary C3 processing records zero purchases and zero settled revenue.

The unchanged C0 fixed-input rows still produce **$76,531 ad**, **$8,934 rental**, and **$4,240 purchase** revenue in their respective modes. The WE6 rights-aware reference remains **$755,763**, versus its permissive reference **$757,222** (−0.193%). These checks establish no C3 cash drift; they do not establish the final ad/subscription/store profitability balance. There was no tuning to force one model to win.

The initial C3 aggregate serializes to **77,901 bytes** in its audit fixture. The known 400-year save-budget audit now reports **6,182,241 / 3,500,000 bytes**, versus **6,104,311** in the previous C2 report: about **77,930 bytes** added by C3, not the cause of the pre-existing roughly 2.6 MB overage. C4/C6 must address the full save budget before release; no entitlement was discarded to make the audit pass.

## Verification

Passed: `audit:streaming-commercial-c3`, C0, C1, C2, `audit:world-streaming-we5`, `audit:world-streaming-we6`, `audit:world-economy-we8-integrity`, WE8 week-transaction, determinism, save, `audit:save-integrity`, pricing/world, billing cohorts, targeted C3 TypeScript, production Vite build, and `git diff --check`. The C3 audit covers mixed/free/store/outside reconciliation, zero-price exclusion, budget and billing paths, player/AI kernel symmetry, changed-offer invalidation, malformed save repair, duplicate transaction, country/right denial, rental expiry, durable purchase, save roundtrip, save-integrity tampering, and state size.

Inherited failures remain: `audit:streaming-rights-finalization-phase8` fails the 400-year compacted-save limit at **6,182,241 / 3,500,000 bytes**; `audit:streaming-catalogue-packages-phase5` still fails routine package automation (`0 !== 1`). Both were already identified in the C2 report. Vite build passes with its existing missing `/index.css`, mixed-import, and large-chunk warnings. The root TypeScript project is not claimed to pass; the targeted C3 graph does.

## C4 handoff and acceptance gate

Before the new cohorts become live, C4 must reconcile existing saved player paid accounts with C3 monthly/annual choice, replace the `OPEN_ACCESS` WE5/WE6 path, validate title-level AI rights rather than invent AI ownership, settle ad-free passes by covered hours, and post each rental/purchase exactly once. The current shadow entitlement ledger intentionally rejects its 1,025th active claim; C4 must introduce an idempotent aggregate compaction/transaction journal before activating routine sales, so a long-running game cannot stop selling titles at that cap. The same country-week advertiser-demand/realized-CPM resolver must drive player, AI, forecast, and treasury. Pure ad/store AI strategies still need actual live configuration rather than only kernel support. Compare profit and retention across ad load and target CPM, including the known ad-only $0 counterexample, before asking for a balance decision. No commit or push was made in C3.
