# Streaming Commercial C2 — implementation and verification

Date: 2026-09-23  
Scope: title rights, routes, viewer entitlements, early access, and existing weekly viewing. C3 buyer cohorts and C4 commercial settlement are deliberately excluded.

## Delivered

- A saved, schema-1 `accessGrant` now freezes subscription, ad-supported, rental, purchase, early-window, and durable-purchase permissions on existing canonical contracts and buyer-local licences. Legacy player and AI positions receive one deterministic snapshot; changing pricing after migration does not widen a signed right. Malformed saved grants fail closed.
- New player deal, private offer, package, renewal, transfer and sublicense paths carry the grant. Inherited rights are bounded by the upstream modes, early weeks, country, and remaining term. Exact transfers preserve their fixed source grant; revisions cannot widen it. AI sourcing, renewal and distress-created licences also receive explicit grants. The Rights Exchange and Content Market private-offer editors show access routes and early-week ceilings.
- A pure evaluator now answers title offerability and viewer playback by country, week, rights status, offer route and entitlement proof. It enforces full rental duration, durable purchase fulfillment, and the rule that an ad-free pass changes only ad exposure. Player catalogue reports expose route-specific denial reasons; overlapping licences are checked independently, so an expired newer licence cannot mask a valid older one.
- WE6 weekly viewing now selects titles per existing plan cell. An early title appears only where both that plan and the rights grant permit it. Store rental and purchase eligibility are checked separately by country; a finite licence cannot mint permanent purchases. Early-access appeal is awarded only when a title can actually play early. This does not invent free/store buyer cohorts.

## Balance evidence

The unchanged C0 controlled input still yields $76,531 ad revenue, $8,934 rental revenue, and $4,240 purchase revenue in its respective modes. Its formula was not tuned for C2.

The WE6 reference week compared the actual finite US licence with a deliberately permissive purchase grant on that same licence. Gross was **$757,222 permissive versus $755,763 rights-aware**, a **−0.193%** correction, below the 5% review gate. The US title's viewing accounts stayed 49,553; ad revenue stayed $4,288; rental revenue stayed $3,360. Only its unsupported permanent-purchase line changed, **$1,459 → $0**. The two owned titles' viewing, ad, rental, and purchase lines did not change. This is a controlled permissive reference, not a claim that the whole pre-C2 game had exactly that gross.

## Verification

Passed: `audit:streaming-commercial-c2`, C0, C1, `audit:world-streaming-we6` (including same-week idempotence and 400-year horizon), WE8 save, opening programme domain/UI, opening catalogue, rights transactions/calendar, AI sourcing/rights lifecycle/distress, pricing/world, billing cohorts, targeted C2 TypeScript, production Vite build, and `git diff --check`.

Two existing audit blockers remain outside this integration:

- `audit:streaming-rights-finalization-phase8` fails the 400-year compacted-save budget at **6,104,311 / 3,500,000 bytes**. With C2 grant snapshot temporarily disabled during diagnosis it was **6,102,402 bytes**. The C2 addition is about 1.9 KB, not the cause of the 2.6 MB overage. The temporary diagnostic change was restored.
- `audit:streaming-catalogue-packages-phase5` fails its later routine-automation assertion (`0 !== 1`). The same assertion failed in a diagnostic run with the C2 package grant removed; the C2 grant assertion before it passed. The diagnostic change was restored.

The root `tsc --project tsconfig.json` exceeded Node's 4 GB heap. `tsconfig.streaming-commercial-c2.json` typechecks the C2 audit/import graph successfully; Vite production build also passes. Neither result is a claim that the root typecheck passed.

## Save and next-phase boundary

Migration preserves historical owned-platform weekly history and world-economy snapshots, and a second migration preserves the same grant. New decisions affect future viewing/offerability, not settled cash or royalty history. No commit or push was made.

C3 still needs distinct free-ad, rental and purchaser buyer cohorts and real entitlement ownership rather than synthetic opportunity pools. C4 still needs market-calibrated ad pricing and a single settlement model; the legacy `premium`, day-pass, metered, patron and sponsorship lines remain identified as legacy fields, not silently reclassified as C2 features. The two inherited audit failures should be handled in their own stabilization work, not hidden inside C2.
