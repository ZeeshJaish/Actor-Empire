# Project A Phase A4 Completion Report

**Phase:** A4 — Rights Calendar, Expiry, and Renewal Market
**Completed:** 2026-08-31
**Next phase:** A5 — Catalogue Packages and Portfolio Licensing
**Status:** Complete and verified; A5 has not started

## Outcome

A4 turns every eligible streaming licence into a persistent, deterministic contract lifecycle. The game now watches the canonical A1 contract, opens one saved renewal case at the configured notice boundary, values the next window from realized results, applies the player's control mandate, and either renews, returns the exact window to market, or lets it expire. The Production House, EMPIRE+, Platform AI, weekly loop, save system, and project detail all read that same authority.

## Simulation changes

- Rights remain active through the listed expiry week and expire at the beginning of the following week.
- A renewal begins at `old expiry + 1`; it cannot erase the incumbent's final valid week or create a gap.
- Permanent purchases never enter the renewal clock.
- One deterministic case and idempotency key exist per source contract and next window.
- Renewal valuation persists attributed revenue, viewing, subscriber impact, royalties, quality, awards, market demand, relationship, rival interest, and buyer affordability.
- Strong titles can improve, weak titles can receive reduced terms, and restricted or insolvent buyers can decline. The old fixed 8% uplift is no longer the renewal authority.
- Strategy, Custom, and Full Control use one saved management state. Custom remains the migration-safe default.
- Protected worldwide exclusives, franchises, material commitments, and explicitly controlled titles require the player. Routine bounded cases may follow the saved mandate after a one-week takeover grace period.
- Accepting a renewal reruns A3 compatibility, creates one exact-scope A1 replacement, settles the guarantee once, records lineage, and synchronizes owned/AI projections.
- Expired owned-platform rights leave the licensed catalogue and launch slate only when no valid replacement covers the title. Future signed renewals no longer invalidate an already scheduled AI title before the new window starts.
- Weekly changes create one grouped digest. Only unresolved protected cases within one week of deadline create one grouped, replay-safe Rights Desk inbox message.

## Player-facing result

- Production House has a wide **Rights Calendar** division card with decision and approaching-expiry counts.
- EMPIRE+ Rights Exchange has a fourth **Calendar** tab using the same component and actions.
- The Vault displays truthful states such as renewal opening, decision required, renewal secured, leaving catalogue, expired, or permanent. Renew is disabled with a factual explanation before the notice window.
- Calendar cases show current scope, buyer, exact expiry, next-window timing, guarantee, backend, duration, protection reasons, and the valid actions: accept, return to market, let expire, or take control.
- Project detail shows one restrained line such as `Netflix · Worldwide exclusive · 8 weeks remaining` instead of adding another competing badge.
- Large libraries are presented as grouped queues and summaries rather than one popup per title.

## Existing systems reused

- `WorldState.streamingRightsContracts` remains the only canonical contract registry from A1.
- A2 contract economics and active bidding remain the market/deal authority; A4 does not create a second auction engine.
- A3 compatibility performs the final exact-country, exact-window conflict check before renewal registration.
- Existing royalty settlements, owned-platform attribution, Platform AI release memory, project quality, awards, relationships, and platform finances feed valuation.
- Existing owned-platform marketplace signing, catalogue, launch slate, Platform AI slate, game-loop stages, inbox, migration, and compaction paths were extended rather than duplicated.
- The legacy Platform AI renewal queue defers whenever an A4 case exists.

## Saved data and migration

- Added `Player.streamingRightsManagement` with control mode, standing policy, protected project IDs, manual contract IDs, and update week.
- Added `WorldState.streamingRightsCalendar` with normalized case registry, bounded digest history, urgent-notice keys, and last processed week.
- Missing or invalid saves normalize to Custom Control, an eight-week notice window, empty registries, and safe thresholds.
- Digests are bounded to 20 and urgent keys to 100 during normalization/compaction.
- Saved offers and performance facts reload without rerolling.

## Fresh verification

The following passed after the final implementation:

- `npm run audit:streaming-rights-calendar-phase4`
- `npm run audit:streaming-contract-foundation-phase1`
- `npm run audit:streaming-active-bidding-phase2`
- `npm run audit:streaming-contract-economics-phase2`
- `npm run audit:streaming-rights-compatibility-phase3`
- `npm run audit:streaming-rights-marketplace-phase16`
- `npm run audit:platform-ai-rights-lifecycle`
- `npm run audit:platform-ai-economy`
- `npm run audit:platform-ai-release`
- `npm run audit:save-migration`
- `npm run audit:save-transfer`
- `npm run build`

The A4 audit also server-renders both Studio and EMPIRE+ contexts with live renewal data. A headless Chromium run used the real startup, save-slot, career creation, onboarding, internal Studio gate, Production House navigation, and Rights Calendar at `http://127.0.0.1:3000/`; the page returned HTTP 200, rendered the expected control/empty-portfolio surface, and produced no console or page errors.

The production build retained pre-existing non-fatal Vite warnings about mixed static/dynamic imports and large chunks.

`npm run lint` (`tsc --noEmit`) was also run. Every A4-local type error was fixed; the command still exits 2 only because older owned-platform audit fixtures remain stale against later schema additions (`publicManifesto`, `networkPlacements`, expanded rival profiles, one removed facility field, and obsolete enum literals). Those baseline fixture files were outside A4 and were not rewritten here.

## Intentionally deferred

- A5 catalogue packages, package bidding, and bulk package approval. Future-output deals were deferred by the 2026-09-01 roadmap correction.
- A6 complete two-sided resale synchronization.
- A7 full Rights Office reporting and broader portfolio delegation.
- A8 final hardening and long-run Project A exit audit.
- Shared news, X, Instagram, and industry-reaction templates.
- Legal disputes, lawsuits, actor replacement litigation, and contract enforcement packs.

## Key implementation files

- `services/streamingRightsCalendar.ts`
- `components/StreamingRightsCalendar.tsx`
- `styles/streaming-rights-calendar.css`
- `components/StreamingRightsExchange.tsx`
- `views/lifestyle/business/ProductionHouseGame.tsx`
- `views/lifestyle/business/components/ProjectDashboardModal.tsx`
- `services/gameLoop.ts`
- `services/streamingRightsMarketplace.ts`
- `services/streamingContractSettlement.ts`
- `services/platformAi/platformAiRightsLifecycle.ts`
- `services/saveMigration.ts`
- `services/saveCompaction.ts`
- `scripts/audit-streaming-rights-calendar-phase4.ts`
