# Streaming commercial C2 — rights-aware title access

Date: 2026-09-23
Status: design approved in conversation; implementation plan pending review
Parent: `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`

## Outcome and boundary

One canonical decision answers whether a platform may offer and a viewer may play a given title, in a given country and game week, by subscription, free advertising, rental, or purchase. It explains denials. C2 connects that decision to player catalogue availability and plan-based weekly viewing, and makes configured early access correspond to actual playable titles. C2 does not create free-viewer, renter, or purchaser cohorts, an individual account database, or a new revenue settlement system; those belong to C3–C4.

The user approved this promise rule: a six-week rental cannot be sold unless rights cover the full six weeks, and a permanent purchase cannot be sold unless the platform can continue fulfilling that customer's playback. An ad-free pass suppresses advertising on an otherwise valid access route but grants no title rights.

## Current seams

- `StreamingRightsContract` and `OwnedStreamingCatalogLicense` carry title, territory, start/end, status, and transfer lineage, but not explicit subscription/ad/rental/purchase permissions.
- `getStreamingContentAvailability` currently resolves broad availability. `worldStreamingViewing.ts` selects title candidates before checking any per-plan title entitlement and calculates commercial transactions from broad title attributes.
- `worldStreamingOffers.ts` awards the `early` feature an appeal bonus without proving an early title can actually play. `streamingAccessPolicy.ts` controls access to the player's *streaming feature*, not a viewer's entitlement to a title; C2 must not reuse it for title playback.

## Rights grants

Add an optional, versioned `accessGrant` to buyer-local licences and canonical contracts. The canonical normalized form contains `modes` (a subset of `SUBSCRIPTION`, `AD_SUPPORTED`, `RENTAL`, `PURCHASE`), `earlyWindowWeeks` (0–4), `purchaseFulfillment` (`NONE` or `PERPETUAL`), and provenance (`EXPLICIT` or `LEGACY_SNAPSHOT`). The parent contract schema remains version 2; the nested grant has schema version 1. A missing or malformed grant is not a wildcard at playback.

New signed terms must state permitted modes. The default request can reflect the buyer's current service offer, but signing freezes the modes into the contract; later pricing switches never widen it. A seller with an upstream contract may grant only the intersection of its own modes, territory, time, early window, and purchase fulfillment. A renewal or transfer preserves these limits unless a genuinely new rights grant is negotiated. For owned-studio titles, derive an internal position from existing ownership and exclusive-rights conflicts; ownership alone must not override an exclusive grant elsewhere.

Old saves receive a one-time, deterministic snapshot of title access already configured or evidenced for that contract and buyer, including player and AI positions. Preserve previously playable subscription/ad routes; preserve configured rental use only inside the old contract's window. Do not grant early weeks because an old plan displayed `early`, and do not infer perpetual purchase fulfillment from a finite licence. Historical views, royalties, and cash are not replayed or erased. Persist the snapshot in both canonical and buyer-local projections where they coexist, so a later pricing change cannot expand it. Production-release imports use their existing title/window/territory position with a conservative subscription default if no prior mode evidence exists.

## Shared decision

The pure title-access kernel consumes a normalized title/rights-position snapshot, country ID, absolute week, C1 commercial-offer projection, and route. The offerability decision returns `allowed`, stable reason code, controlling contract/position ID, earliest playable week, latest permitted week, price source, and ad eligibility. A playback decision adds proof of the viewer's subscription plan, free-ad access, rental purchase week, or durable purchase entitlement. The evaluator never moves money, writes to saves, mutates a rights registry, or decides how many households buy.

The order of checks is deterministic: title readiness and general/early schedule; active market and territory; contract status and legal window; permitted access mode; offer benefit and plan; viewer entitlement; then rental/purchase promise duration. A missing route is denied, not silently converted into a subscription. Reason codes distinguish production/schedule, market, rights missing or expired, wrong territory, mode not granted, early window denied, plan/transaction missing, rental expired, and purchase fulfillment missing. Existing callers may format these codes into copy without duplicating the decision rules.

Early playback starts no earlier than the maximum of title production readiness, contract start, and scheduled general release minus the minimum of offer lead and granted lead. It ends no later than the controlling rights window. For a rental bought in week W, rights must cover `[W, W + configuredWindowWeeks)` before sale. A viewer's rental entitlement expires at W + configuredWindowWeeks even when platform rights continue. A permanent purchase requires a durable fulfillment grant; any contract transfer must retain the pre-existing customer's fulfillment obligation. Before C3 introduces actual buyer records, C2 tests that rule with entitlement fixtures and prevents new ineligible synthetic title transactions, without inventing historical buyer records.

## Integration and player/AI parity

Build a rights-position adapter from canonical contracts and owned-title rights; do not make the pure evaluator search the entire `Player` object. `getStreamingContentAvailability` and opening-catalogue reports expose offer-specific availability and reasons while retaining compatible broad status for older callers. In `worldStreamingViewing.ts`, evaluate candidate access per existing plan cell, not once for a whole country: only eligible cells can see early titles, and country/title totals must still reconcile. Piracy remains separately classified and is never counted as a legitimate entitlement. Legacy synthetic free/store accounts are not recast as subscribers; their cohort redesign remains C3.

Both player and AI offer/rights fixtures use the same evaluator. The existing AI simulation does not yet have title-level free/store buyer cohorts, so C2 must not claim live AI transaction parity. `worldStreamingOffers.ts` may award early-feature appeal only for a route with at least one actually playable early title; no future title means no bonus. Existing billing-path mathematics, base population, ad fill/CPM, sponsorship/patron legacy fields, and cash settlement are not redesigned in C2.

## Acceptance and balance gate

Test territory, active/expired/transfer status, contract dates, mode permissions, 0–4 early weeks, title production timing, plan-specific early viewing, rental full-term and expiry, durable purchase, pass-as-overlay, sublicence subset, player/AI fixtures, and old-save double migration. A controlled country/week fixture must show explicit denial reasons and no paid playback on a denied route. Save migration must be idempotent, finite, and preserve historical ledgers.

Run the C0/C1 commercial audits, rights-transaction and finalization audits, opening-catalogue audit, WE6 viewing audit, save integrity, targeted TypeScript, and build. Record before/after title viewing and revenue by route. Any C0 controlled fixed-input numerical change is a regression unless deliberately explained; any live reference-week gross revenue change above 5% pauses for user balance review before further tuning. Do not change coefficients to hide a rights correction. C2 can explain a corrected difference; C3–C4 still own cohort and settlement design.
