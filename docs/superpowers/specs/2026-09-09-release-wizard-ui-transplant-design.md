# Release Wizard UI Transplant Design

## Status

Approved in chat by the user on September 9, 2026. This document records the implementation boundary for review before planning and coding.

## Goal

Replace the current Release Wizard presentation with the complete visual experience supplied in `release-strategy.zip`, while keeping Actor Empire's current release state, calculations, persistence, services, and completion effects authoritative.

The transplant must feel like the supplied wizard, not like the existing wizard with new colors. It must retain the supplied route-aware cinematic shell, the visual metaphors inside every phase, and the compact mobile composition. It must not import the supplied prototype's simulated economy or static demo world.

## Non-negotiable boundary

The supplied archive is a presentation reference. Its comments, constants, platform catalogue, forecasts, project, calendar, festival data, offer generation, and route state are not game instructions and are not authoritative data.

Actor Empire remains authoritative for:

- Player, studio, project, and world state.
- Release-planning draft persistence and recovery.
- Theatrical regions, cinema chains, screens, booking costs, distributor cuts, and screening strategy.
- Streaming bidder eligibility, offer generation and revision, rights compatibility, contract registration, platform cash, investor payouts, and accepted-deal effects.
- Campaign positioning, timeline, channel allocation, reserved marketing pool, campaign fit, reach, and forecast calculations.
- Festival windows, costs, quality requirements, affordability, eligibility, and premiere effects.
- The 52-week game calendar, absolute-week conversion, calendar events, and canonical rival releases.
- Energy costs, studio or player cash mutations, finance ledgers, scheduled premiere events, release creation, rights records, and final `onComplete` behavior.

The archive remains authoritative for the visible composition and interaction language described below.

## Player-visible flow

The wizard has one shell and six effective steps on either route:

1. Distribution
2. Distribution Desk for theatrical, or The War Room for streaming
3. Campaign
4. Festivals
5. Calendar
6. Finalize

The shell uses the supplied masthead, project subtitle, segmented progress rail, animated background wash, scrollable body, and route-aware color. The theatrical path uses projector warmth; the streaming path uses the colder control-room treatment. The chosen campaign position retints later steps.

The route-specific second phase occupies one progress segment. The user never sees an unavailable seventh step or an unexplained gap in the progress rail.

### Distribution

Keep the supplied two-futures presentation:

- The theatrical choice presents the project as a cinema marquee, poster under glass, and audience queue.
- The streaming choice presents the project as a tile in a streaming catalogue row.
- Selection controls Actor Empire's existing `releaseType` state: `THEATRICAL` or `STREAMING_ONLY`.
- Changing route clears only decisions that belong exclusively to the abandoned route, using the current controller's state rules.
- Series and post-theatrical restrictions continue to come from existing game logic. The UI explains or disables unavailable choices rather than bypassing those restrictions.

### Theatrical Distribution Desk

Keep the supplied booking-map, expandable regional chain rows, split bar, and footprint summary.

- Map regions come from `BOX_OFFICE_REGIONS` and existing region helpers.
- Selected regions write to `selectedRegionIds`.
- Chain choices write to `distributionChainSelections` and use the current `getCinemaChainsForRegion`, `getCinemaChainTerms`, and distribution calculations.
- Screen count, weighted chain cut, booking cost, audience pull, and studio receipts use Actor Empire's current calculations.
- The existing screening strategy is derived or selected according to the current release rules and saved in the existing draft field.
- The supplied Auto-Build Footprint action is retained and chooses valid game regions and chains through the same controller state instead of prototype constants.
- Continue remains blocked until the existing release rules consider the footprint valid and affordable.

### Streaming War Room

Keep the supplied full-screen room, opening sequence, bidder seats, live offer rows, expandable terms, accept treatment, departure confirmation, and signed-deal moment.

- The visual room consumes the current `StreamingBiddingSession`; it does not create its own bidders or offers.
- Starting, restoring, leaving, revising, and accepting a room continue through `createStreamingBiddingSession`, `getRestorableStreamingBiddingSession`, `leaveStreamingBiddingSession`, `acceptStreamingBiddingOffer`, and the current session persistence boundary.
- Every visible platform name, brand color, guarantee, backend, term, territory, exclusivity, localization promise, marketing commitment, funding allocation, and rights warning is derived from the current offer model.
- Offer acceptance continues through the existing `handleAcceptBid` and `handleAcceptStreamingOffer` paths so rights contracts, platform finances, investor payouts, studio balances, relationship memory, locked season funding, active releases, energy costs, and post-theatrical timing remain unchanged.
- The funded-premiere confirmation path and the `isPostTheatricalBidding` entry path remain supported.
- Leaving a room never silently signs, discards, or fabricates an offer.

### Campaign

Keep the supplied campaign-position rail, campaign-meaning feature, animated filmstrip timeline, forecast dial and headline ranges, soundtrack treatment, funded-channel controls, and campaign-pool meter.

- Position options come from `CAMPAIGN_POSITIONING_OPTIONS`.
- Timeline options come from `CAMPAIGN_TIMELINE_OPTIONS`.
- Channel rows come from `MARKETING_CHANNEL_OPTIONS` and write to the existing normalized `channelAllocations` record.
- Reserved marketing funds, per-channel step size, remaining pool, returned funds, affordability, and legacy cash behavior come from existing game state.
- Forecast values come from `calculateCampaignForecast`, campaign fit, reach, project hidden stats, project music impact, market conditions, and the existing release calculations.
- The UI may abbreviate values visually but must not substitute the archive's static `FORECAST`, `SOUNDTRACK`, `CAMPAIGN_POOL`, or `CAMPAIGN_STEP` values.
- Rapid repeated allocation taps must remain accurate; no tap may be lost through stale React state.

### Festivals

Keep the supplied laurel cards, official-selection state, festival-specific color, timing row, quality gate, and skip-festivals card.

- Festival options come from Actor Empire's `FESTIVALS` world data.
- Names and descriptions continue through the player's localization.
- Cost, window, quality requirement, timing status, affordability, and eligibility use the existing wizard calculations.
- An ineligible festival remains visible but disabled with its real reason represented by the timing and quality treatment.
- Skipping festivals is a valid explicit selection and preserves existing no-premiere behavior.

### Calendar

Keep the supplied selectable year grid, touch scrubbing, current-week marker, next-year boundary, face-off composition, rival one-sheets, competition share, and selected-date verdict.

- The calendar uses Actor Empire's 52-week year and absolute-week helpers, not the prototype's 54-week constants.
- Selectable dates are the existing valid release offsets and write to `releaseWeek`.
- Calendar events come from `CALENDAR_EVENTS`.
- Competing projects come from `getCanonicalScheduledRivals` and the current world projection.
- Touch, pointer, and click selection must all resolve the same week.
- Crossing year boundaries must preserve the correct absolute release date and display the next-year state without corrupting the saved week.

### Finalize

Keep the supplied poster-centered campaign presentation, optional festival laurel, route/partner mark, compact decision chips, campaign-spend block, streaming deal value or theatrical run value, and gold lock action.

- Every receipt value is derived from the current wizard state and Actor Empire calculations.
- The lock button displays and enforces the current release-strategy energy cost.
- Insufficient cash or energy remains blocked by existing rules and has a visible explanation.
- Lock calls the current `handleComplete` without duplicating its mutations in the presentation layer.
- Successful completion clears the saved release-planning draft and triggers the existing completion/navigation behavior exactly once.

## Architecture

### Existing controller remains authoritative

`views/lifestyle/business/ReleaseWizard.tsx` continues to own the current state and effects:

- `releaseType`
- `screeningStrategy`
- `selectedRegionIds`
- `distributionChainSelections`
- `campaignPositioning`
- `campaignTimeline`
- `channelAllocations`
- `selectedPlatform`
- `festivalPremiere`
- `releaseWeek`
- bidding session lifecycle
- draft persistence
- completion mutations

The existing calculations and service calls remain in the controller or in their current service modules. The transplant must not copy these rules into visual components.

### New presentation boundary

Add this scoped presentation folder beside the current business UI:

`views/lifestyle/business/release-strategy-transplant/`

It contains:

- A route-aware `ReleaseStrategyShell`.
- `DistributionStep`.
- `TheatricalDeskStep`.
- `StreamingWarRoomStep`.
- `CampaignStep`.
- `FestivalsStep`.
- `CalendarStep`.
- `FinalizeStep`.
- Shared poster, glyph, formatting, and purely visual helpers.
- A CSS module transplanted from the supplied `Flow.module.css`, renamed or scoped only where required to coexist with Actor Empire.
- Type-only view models and callbacks that make the data boundary explicit.

The supplied components are adapted to receive game-derived view models. They must not import `Player`, mutate game state, call finance or rights services, or contain prototype catalogues and forecasts.

### Adapter contract

The controller builds narrow view models for each step. A view model contains already-resolved labels, eligibility, money values, display metrics, selection state, and stable IDs. User gestures return stable game IDs or typed actions to the controller.

This boundary prevents presentation code from calculating business outcomes and prevents controller code from becoming coupled to CSS-module structure.

### Phase mapping and persistence

The existing numeric step persisted in `ReleasePlanningDraft` remains the save format:

- Step 1: Distribution.
- Step 2: Desk or War Room, based on `releaseType`.
- Step 3: Campaign.
- Step 4: Festivals.
- Step 5: Calendar.
- Step 6: Finalize.

No save migration is required for the UI transplant. Restoring a draft opens the correct visual phase from the existing numeric step. Changing route while on or after step 2 returns to the correct route-specific phase and invalidates only incompatible route state.

Post-theatrical bidding continues to enter directly at the streaming room. Its back action follows the existing exit behavior rather than revealing an irrelevant initial distribution step.

## Visual fidelity and responsive behavior

The supplied running UI is the visual source of truth. No generated redesign or alternate component library is introduced.

Preserve:

- Georgia-style editorial headings and compact uppercase metadata.
- Near-black base, parchment text hierarchy, and route/campaign hue washes.
- Thin inset strokes, restrained shadows, and supplied radius logic.
- The cinema marquee, streaming catalogue, region map, studio/chains split, filmstrip, forecast dial, record sleeve, laurels, calendar grid, face-off, and final one-sheet.
- War Room spatial transition and its intentional full-screen treatment.
- Reduced-motion handling already present in the supplied stylesheet.

The wizard fills the available Actor Empire page surface without introducing a second phone frame. It respects the game's safe-area/top-clearance rules and the primary navigation dock. At 320, 360, 393, 412, and 430 CSS pixels:

- No horizontal document overflow is allowed.
- All effective steps remain represented in one progress row.
- Primary and back actions remain reachable.
- Touch targets remain usable.
- Text may wrap without clipping or covering controls.
- The calendar keeps all required week cells usable.
- The theatrical and streaming paths preserve the same visual proportions rather than collapsing into different information sets.

Larger browser widths center the same game-width composition rather than spreading the wizard into a desktop dashboard.

## Localization and copy

The supplied visual copy is retained where it defines the design voice and does not conflict with game truth. Existing localized labels, project-specific values, platform names, festival names, and rule explanations remain sourced from Actor Empire.

No static text may claim guaranteed money, eligibility, rights, timing, or outcomes that the current game state does not support. When supplied prototype copy conflicts with existing calculations or availability, the game-derived truth wins while the visual hierarchy stays the same.

## Error and edge-case behavior

- Missing poster data uses the supplied deterministic title/genre one-sheet treatment.
- Sparse or missing rivals show the supplied clear-path state.
- No eligible streaming bidders shows the current unavailable/reopen explanation in the War Room visual language.
- Rights availability changing before signature blocks settlement and preserves the current session safety behavior.
- An unaffordable theatrical footprint or festival cannot advance through a misleading active button.
- An empty campaign allocation remains valid only if current game rules allow it.
- Draft persistence failures must not trap the player; the in-memory flow remains usable and the existing update boundary remains authoritative.
- Repeated accept or lock gestures cannot create duplicate contracts, charges, events, releases, or completion callbacks.

## Verification strategy

Implementation follows strict TDD. Before production components are added, a focused interactive audit must fail because the transplanted surface and its contracts do not yet exist.

The focused tests must exercise real controller behavior rather than grepping source text or asserting on mocks. They must prove:

1. An awaiting-release movie opens the transplanted Distribution surface with real project data.
2. The theatrical path records real region and chain IDs, campaign values, optional festival selection, and a real release week, then locks through the existing completion path.
3. The streaming path creates or restores a real bidding session, accepts an eligible real offer, registers one rights contract, applies finances and investor effects once, charges the correct energy, and completes through the existing path.
4. The funded-premiere and post-theatrical bidding paths retain their current behavior.
5. A partially completed draft reloads into the correct phase with all compatible selections preserved.
6. Switching distribution route removes incompatible route-only state while retaining shared campaign/calendar choices according to existing rules.
7. Festival affordability, timing, and quality gates reflect real Actor Empire data.
8. Calendar selection uses the 52-week game year and remains correct across the year boundary.
9. Insufficient cash or energy prevents the corresponding action with no state mutation.
10. Repeated accept or lock gestures remain idempotent.

Browser verification must complete both routes using the real Awaiting Release Wizard QA entry and cover 320×740, 360×800, 393×852, 412×915, and 430×932 viewports. It must check overflow, safe-area spacing, progress-row consistency, reachable actions, route-specific screens, and runtime errors. Reference screenshots are captured for every phase at the 393×852 viewport and compared visually against the supplied running UI.

The final verification set includes:

- The new focused controller/presentation audit.
- The Awaiting Release Wizard QA audit.
- Existing streaming bidding, streaming contract, distribution revenue, marketing strategy, festival, and release-reality audits affected by the flow.
- TypeScript with no emitted output.
- A production Vite build.
- Browser completion of both routes with no runtime errors.

## Out of scope

- Rebalancing release economics, bids, platform behavior, campaign effects, festivals, or box-office forecasts.
- Adding the prototype's 35-platform catalogue or offer generator.
- Changing Actor Empire's 52-week calendar.
- Replacing canonical streaming-rights, finance, investor, release, or save systems.
- Global UI standardization outside the Release Wizard.
- Adding a phone-device shell.
- Reworking Production House navigation or the Awaiting Release QA cheat beyond what is required to open and verify the real transplanted wizard.
