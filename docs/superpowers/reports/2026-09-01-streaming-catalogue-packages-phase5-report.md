# Project A Phase A5 Completion Report

**Phase:** Catalogue Packages and Portfolio Licensing
**Completed:** 2026-09-01
**Next approval-gated phase:** A6 — Two-Sided Acquisition and Resale Synchronization

## 1. What changed in the simulation

A studio can now group 2–12 real completed catalogue titles into one portfolio negotiation without merging their legal rights or economics. Each package stores immutable A3 component lots, exclusions, valuation facts, the accepted per-title commercial schedule, and the canonical child-contract IDs created at signature.

The package guarantee is allocated with the approved floor-first model:

- `$1M` minimum reserved for every title;
- `15%` equal portfolio weight;
- `60%` independent title-reference weight;
- `25%` bidder-specific fit weight;
- each title bounded to `50%–175%` of its floor-adjusted reference allocation;
- stable largest-remainder rounding so every row reconciles exactly to the package total.

Backend share, recoupment, cap, localization, duration, exclusivity, countries, and expected exposure remain title-specific. Future-output and multi-picture agreements are not part of A5.

## 2. What the player sees and controls

Production House Rights Calendar now has a separate **Packages** tab. The Package Desk shows one film-ledger list of eligible catalogue titles, a compact sale mandate, prepared/live/signed package history, exclusions, and access to the existing timed bidding room.

Package offers show the headline guarantee, title count, territory, term, exclusivity, backend range, and an expandable title schedule. The room never labels a best offer or automatically picks an interactive winner.

EMPIRE+ Market Floor can expose real primary-studio packages with an exact title schedule and one complete-package acquisition action. It does not yet allow platform-to-platform resale or permanent catalogue purchase; those remain A6.

## 3. Existing systems reused

- **A1:** `WorldState.streamingRightsContracts` remains the sole legal authority; one child contract is registered per title.
- **A2:** the existing 15-second room, six-second bidder cooldown, material-event extension, 45-second hard cap, revisions, closing table, and explicit acceptance are reused unchanged.
- **A3:** exact country/window/exclusivity compatibility builds every component lot and revalidates it immediately before signature.
- **A4:** every child contract remains an independent expiry and renewal case; compatible package cases are only grouped for review.
- Existing project archives, investor payout calculations, Production House finance ledger, platform relationships, energy costs, Platform AI runway/controller restrictions, weekly progression, migration, and compaction are reused.

## 4. Control modes and workload

- **Custom Control** remains the safe default and receives bounded package suggestions only.
- **Strategy Mode** may execute routine packages only when `ROUTINE_AUTOMATIC` is enabled and the package stays inside the saved size, duration, exclusivity, global-scope, guarantee, and protection mandate.
- **Full Control** never selects package components for the player.
- Protected titles and packages always require manual approval.
- The Rights Desk proposes at most once per four-week cycle, keeps at most three unresolved packages, and writes one grouped weekly digest instead of title-level inbox spam.

Delegated Strategy execution still runs the real A2 auction and the exact same atomic acceptance service. It cannot use a simplified hidden price path.

## 5. Atomic accounting and failure behavior

Acceptance stages every title contract before changing state. A missing source project, changed right, invalid allocation, missing buyer/seller, insufficient cash, insufficient energy, or malformed session rejects the entire package.

One successful signature applies exactly once:

- one buyer treasury debit;
- one seller gross package receipt, net of project-specific investor payouts;
- one investor payout update per affected project;
- one Production House package ledger event plus factual investor rows;
- one relationship update;
- one rights-deal energy charge;
- one canonical child contract per component;
- matching AI-buyer title cost-basis projections when the buyer is AI-controlled;
- signed package and accepted bidding-session lineage.

Replaying the same acceptance is an exact no-op.

## 6. Platform AI and EMPIRE+

Platform AI's previous equal-split catalogue shortcut has been replaced with the shared A3 lot builder, A5 reference valuation, bidder-fit allocation, and child-contract registration. Its existing candidate ranking, runway, localization, controller restrictions, and weekly cadence remain intact.

The owned platform's Market Floor adds real same-studio package opportunities and one atomic treasury/contract commit. A6 will extend this into the complete two-sided resale market.

## 7. Save migration and compaction

Save migration advanced to version 28. Missing or malformed package state normalizes to a safe empty registry and conservative policy. Historical contracts sharing a valid `cataloguePackageId` may reconstruct only a factual signed package projection; migration creates no new rights, payment, or offer.

Compaction preserves unresolved packages and signed packages referenced by canonical contracts, bounds terminal package history to 80, and bounds package digests to 52.

## 8. Verification evidence

Fresh passing commands:

- `npm run audit:streaming-contract-foundation-phase1`
- `npm run audit:streaming-active-bidding-phase2`
- `npm run audit:streaming-contract-economics-phase2`
- `npm run audit:streaming-rights-compatibility-phase3`
- `npm run audit:streaming-rights-calendar-phase4`
- `npm run audit:streaming-catalogue-packages-phase5`
- `npm run audit:streaming-rights-marketplace-phase16`
- `npm run audit:streaming-contract-state`
- `npm run audit:platform-ai-sourcing`
- `npm run audit:platform-ai-rights-lifecycle`
- `npm run audit:platform-ai-economy`
- `npm run audit:platform-ai-release`
- `npm run audit:platform-ai-scalability`
- `npm run audit:platform-ai-player-commissions`
- `npm run audit:save-migration`
- `npm run audit:save-transfer`
- `npm run audit:week-processing-save-safety`
- `npm run build`
- `git diff --check`

Browser verification used the live `Actor Empire 2.0` Vite app at `127.0.0.1:3000`. The Production House Package Desk rendered at desktop and 390×844 mobile widths, retained a vertical non-table layout, enabled the package action after title selection, and produced no console errors. The package desk and bidding-room server-render checks are part of the focused A5 audit. EMPIRE+ package composition, atomic buying, and UI presence are covered by the marketplace audit without spending an existing player's saved platform treasury.

`npx tsc --noEmit --pretty false` remains non-zero only in older owned-platform audit fixtures. The remaining categories are missing historical `publicManifesto` and `networkPlacements` fixture fields, older acquisition/battlefront enum literals, stale rival-profile fields, and the old rack-group facility fixture. No A5 component, service, audit, or integration path remains in the TypeScript output.

The production build passed with its existing Vite chunk-size and mixed static/dynamic import warnings.

## 9. Intentionally deferred

- platform-to-platform resale and permitted sublicensing;
- permanent catalogue purchase;
- distress resale and change-of-control synchronization;
- future-output and multi-picture deals;
- shared social/news reaction templates;
- lawsuit and contract-dispute systems.

## 10. Next phase

A6 — Two-Sided Acquisition and Resale Synchronization. Do not begin it until the user reviews and approves its final phase design.
