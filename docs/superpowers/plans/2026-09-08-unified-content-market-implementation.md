# Unified Content Market Implementation Plan

> Execution: work inline, phase by phase, using the executing-plans workflow. Preserve existing work and obtain phase approval before starting the next phase. Do not commit or push without an explicit user request.

**Goal:** Let a player build and expand a streaming catalogue through one content market with direct purchases, weekly negotiations, buyer auctions, studio imports, and commissioned productions.

**Architecture:** Extend the current rights marketplace, contract registry, package allocation, production pipeline, and weekly processor. Introduce one shared view of opportunities and separate purchase methods from content sources. Every acquisition must settle into the same rights and catalogue records.

**Tech stack:** React, TypeScript, Vite, existing game-state persistence and weekly simulation, Capacitor delivery.

**Spec:** Accepted conversation design dated September 8, 2026: one Content Desk; Available now, Live auctions, Upcoming, and Your offers; owned-library and Original shortcuts; available countries and contract terms; delayed private responses; competitive buyer auctions; future availability; reuse of existing systems.

**Status:** CM1, CM2, and CM3 implemented and verified on September 8, 2026. CM4 remains proposed and is not part of the current implementation. See the phase reports in this directory for delivered behavior and checks.

## Global constraints

- Keep the original Project A/B/C roadmap numbering intact. Use CM1–CM4 for this work.
- Preserve existing saves, licenses, payments, negotiations, project references, ownership, and existing user edits.
- Distinguish licensed rights from film ownership, franchise ownership, and production commissions.
- A title can have separate non-conflicting territory/window listings. The same exclusive rights cannot settle twice across any purchase method.
- Use existing compatibility checks at discovery and again at commitment. Ownership of a studio does not restore rights granted elsewhere.
- Do not duplicate project records. Every listing, contract, original, and acquired title retains its canonical source project ID.
- Establishing a starter catalogue must not prevent further pre-launch acquisition or studio imports.
- Future rights and unfinished productions do not count as playable opening content.
- Keep counters in private negotiations; live auctions use bids under declared auction rules.
- Fixed financial commitments must respect available treasury after existing reservations. Resolved commitments release their reservation; settlement charges once.
- Rival interest and limits use saved company state and existing AI valuation inputs. Do not simulate a second full company-management loop.
- Use the existing weekly progression for dated events, with persisted outcomes and bounded active queues.
- Present accurate lock reasons. Never substitute a permanent disabled button for a research requirement.
- Keep mobile navigation, readable terms, platform branding, and a direct return to the originating launch step.
- Verify each phase independently. A 400-year endurance run is outside this plan.

## CM1 — Unified catalogue workspace and usable opening market

**Player outcome:** From either an empty or populated Library, Add Content opens the same market. The player can build a multi-title opening catalogue and return directly to the launch wizard.

**Reuse and file responsibilities:**
- `components/StreamingPlatformHQ.tsx`: route destinations and return context.
- `components/StreamingDefineLaunchExperience.tsx` and `components/studio-finance/components/launch/StepCatalogue.tsx`: state-aware primary action and honest readiness projection.
- `components/streaming-transplant/StreamingContentExperience.tsx` and `createCanonicalStreamingPresentation.ts`: permanent Library, explicit source labels, title availability, and market entry.
- `components/StreamingCatalogSetup.tsx`, `components/StreamingOpeningCatalogueDesk.tsx`, and `components/StreamingRightsExchange.tsx`: consolidate acquisition entry while retaining programming, rights, and language workspaces.
- `services/streamingCatalog.ts`, `services/streamingRightsMarketplace.ts`, and `services/streamingRightsCompatibility.ts`: eligible studio imports and pre-launch purchases.
- `services/streamingCataloguePackages.ts`, `services/streamingRightsCore.ts`, and `services/streamingOpeningCatalogue.ts`: shared contracts, allocation, and readiness.
- Create `components/StreamingContentMarket.tsx` for browsing, source shortcuts, and a focused listing detail view; keep domain settlement outside the component.

**Deliverable tasks:**
- [x] Capture regression cases for two distinct catalogue actions, reopening a saved draft, returning from Finance, and importing a new owned release after initial setup.
- [x] Define one opportunity projection consumed by browsing and detail views: stable listing ID, source project IDs, seller, source type, acquisition method, rights scope, dates, asking terms, and availability reason. Existing domain records remain authoritative.
- [x] Route Build/Continue/Review Opening Catalogue directly into the appropriate workspace and preserve the Catalogue return location.
- [x] Enable repeated eligible owned imports and direct external purchases during founding and after launch. Permit individual titles and existing catalogue packages, with a per-title allocation review.
- [x] Keep commissioning connected to its current production workflow. Remove the starter-catalogue prerequisite where it merely enforces old onboarding order; retain actual funding and producer requirements.
- [x] Show only operational buying methods. CM2 adds delayed negotiation; CM3 adds live auctions; CM4 adds Upcoming. Do not publish inactive placeholder tabs.
- [x] Unify Library, launch summary, and blueprint distinctions between owned/licensed/original, acquired/scheduled/playable, and content depth versus legal launch eligibility. Replace fixed two/eight-hour assumptions where canonical duration exists and label fallback estimates.
- [x] Check rights availability for owned imports too. Preserve excluded country rights and show a short reason when an import or purchase is unavailable.

**Acceptance cases:** Empty platform with no studio can acquire available external titles; player can purchase several titles before opening; an owned title with conflicting rights is not presented as globally available; a package pays once and component totals match; returning from funding preserves choices; existing signed contracts survive reload; playable counts exclude unfinished or future titles.

**Verification:** `npm run audit:streaming-catalog-phase6`, `npm run audit:streaming-rights-compatibility-phase3`, `npm run audit:streaming-catalogue-packages-phase5`, `npm run audit:streaming-launch-draft-continuity`, and `npm run build`. Add focused behavioral cases to the relevant audit files. Inspect the empty/populated/pre-launch/post-launch flow at mobile width.

## CM2 — Private offers and weekly seller responses

**Player outcome:** Accept an asking price immediately, or make an offer and receive a dated response through Your Offers and SMS.

**Reuse and file responsibilities:**
- `services/streamingRightsMarketplace.ts`: opening, revising, accepting, and signing negotiations.
- `services/rightsNegotiation.ts` and `services/rightsMarket.ts`: inspect and reuse suitable reservation, tracked opportunity, and negotiation-history patterns without merging production IP rights with streaming rights.
- `services/streamingWeeklyLoop.ts`: process due responses through the existing week pipeline.
- `services/streamingRightsCore.ts` and `services/streamingRightsTransactions.ts`: final compatibility and financial settlement.
- `types.ts` and existing save normalization: add dated pending-response state with backward-compatible defaults.
- `components/StreamingContentMarket.tsx`: Your Offers, response deadline, pending/countered/agreed/declined/expired presentation.

**Deliverable tasks:**
- [x] Persist submission week, response-due week, response status, signing deadline, and proposal version. New private offers use a deterministic two-to-three-week response interval.
- [x] Keep existing ready-to-sign and countered saves valid. Editing a proposal creates a new version; a superseded response cannot resolve the replacement.
- [x] Generate accept/counter/decline decisions from existing valuation, seller priorities, competing interest, and proposed terms when the response is due.
- [x] Private proposals do not grant exclusivity or charge treasury. State whether rights remain on the market. Accepted terms receive an explicit signing deadline, and final signature rechecks availability and funds.
- [x] Publish one actionable SMS per response, linked to the correct offer. Reprocessing or loading cannot reroll a reply, repeat a notification, or duplicate a payment.
- [x] Expire or close incompatible pending negotiations when another valid transaction consumes their rights.

**Acceptance cases:** Week-20 proposal responds only at its persisted Week-22/23 date; a reload preserves timing and outcome; editing invalidates the old proposal version; competing sales close affected offers; expired terms cannot sign; insufficient treasury does not partially settle; duplicate week processing has no repeated effect.

**Verification:** Extend the existing rights-marketplace audit and weekly-loop audit with dated-response fixtures; run `npm run audit:streaming-rights-marketplace-phase16`, `npm run audit:streaming-weekly-loop-phase10`, `npm run audit:streaming-rights-calendar-phase4`, and `npm run build`. Browser-check the SMS-to-offer route.

## CM3 — Live auctions with the player as buyer

**Player outcome:** Enter an auction as a streaming platform and compete with flexible, seller-bounded contract terms for one title or a collection.

**Reuse and file responsibilities:**
- `services/streamingBidding.ts`: saved sessions, timing, offer revisions, rival ceilings, and auction events.
- `views/lifestyle/business/components/StreamingBiddingRoom.tsx`: preserve the existing seller experience; extract reusable presentation only where appropriate.
- `services/streamingCataloguePackages.ts`: package allocation and atomic acceptance patterns.
- `services/streamingRightsTransactions.ts` and `services/streamingRightsCompatibility.ts`: settlement and scope checks.
- Add a focused buyer-auction service and buyer room component, with saved types in `types.ts`, rather than embedding bidding decisions in HQ.

**Deliverable tasks:**
- [x] Define auction lots with fixed country scope, dates, reserve, permitted term ranges, and an explicit seller-value ranking rule. Upfront, backend, marketing, and a supported future-greenlight promise may be revised; scope, window, duration, and exclusivity remain locked.
- [x] Add player bid submission, withdrawal, common countdown/extensions, and a displayed spending limit in a 70/30 live venue and sticky bid console. Reuse timing rules where compatible with buyer commitments.
- [x] Rival entrants and bidding limits consume existing company finances, catalogue demand, audience fit, and valuation inputs. Persist decisions for stable save/resume behavior.
- [x] Reserve each player's standing binding guaranteed exposure against available funds. Release superseded, withdrawn, and losing reservations; settle a winning commitment once. Marketing and future-greenlight promises create enforceable saved obligations.
- [x] Leaving the room or backgrounding the app preserves the session and commitments. Show whether bidding remains binding; do not silently reset or reroll on return.
- [x] Close the lot with a winner or a valid no-sale result. Synchronize competing listing methods so unavailable rights cannot still be purchased elsewhere.
- [x] Support individual-title and collection auctions using the same settlement boundary. Preserve component allocations and remaining rights.

**Acceptance cases:** Rival and player ceilings hold; simultaneous commitments cannot reuse treasury; player loses without being charged; winner pays once; below-reserve bidding can close unsold; repeated ticks cannot extend indefinitely; app background/reload cannot reset the auction; existing seller rooms still function; the same rights cannot sell through a direct listing during settlement.

**Verification:** Add buyer-auction behavioral fixtures and run the existing bidding, package, compatibility, transaction, and rights-finalization audits selected from `package.json`; run `npm run build`. Browser-check countdown, long title/collection display, withdrawal, and resume.

## CM4 — Upcoming event titles, world reactions, and integrated playthrough

**Player outcome:** Follow announced rights sales, prepare for an auction, and see acquisitions reflected in the wider game.

**Reuse and file responsibilities:**
- Existing canonical production/release records and franchise/universe state: future title identity and progress.
- Existing industry event/media publication system: confirmed announcements, completed deals, delays, and attributed speculation.
- `services/streamingWeeklyLoop.ts`: due auction openings and delivery-date changes.
- `services/streamingOpeningCatalogue.ts`, launch/slate services, and the Content Desk presentation: acquired future rights versus playable titles.
- `components/StreamingContentMarket.tsx`: Upcoming and followed listings.

**Deliverable tasks:**
- [ ] Create scheduled sale announcements only for real projects with eligible rights. Use a saved opening week and planned availability date; watchlisting produces a notification when bidding opens.
- [ ] Derive public interest from existing franchise history, talent, marketing, production progress, market demand, and release results. Preserve uncertainty and avoid implying guaranteed success.
- [ ] Pre-release acquisition records future availability and delivery dependency. A delay updates the agreement's availability view and schedule; it never turns an unfinished project into a playable title.
- [ ] Give private submissions, public auction results, rumours, and confirmed events appropriate visibility. Publish through existing bounded news/social machinery; do not expose private bids as public facts without a supported event.
- [ ] Run a full playthrough: empty service, studio import, direct purchase, delayed counter, auction win/loss, future-title delay and delivery, localization, programming, opening, and renewal.
- [ ] Check old-save continuation, suspended-session recovery, bounded active listing/notification queues, and representative busy-save weekly cost. Fix failures within the affected phase boundaries.

**Acceptance cases:** Watchlisted sale opens in the correct week; unavailable rights are excluded; rumours remain attributed; title delays cannot produce premature watch hours; news references actual saved events; repeated processing creates no duplicate stories or transactions; permanent contract history remains available after active listings close.

**Verification:** Run the focused audits introduced by CM1–CM3, relevant existing originals/launch/media audits, and `npm run build`. Finish with a mobile-width browser walkthrough and a measured busy-save check; no 400-year simulation is required.

## Completion and handoff

- Each phase ends with implemented behavior, focused regression results, mobile interaction verification, and a concise player-facing report.
- CM1, CM2, and CM3 are complete. Direct purchases, delayed private offers, and live buyer auctions now settle through the shared rights and catalogue boundaries.
- CM4 remains proposed until its implementation is authorized. Review the exact touched code and test fixtures when beginning it, because this repository contains ongoing work.
