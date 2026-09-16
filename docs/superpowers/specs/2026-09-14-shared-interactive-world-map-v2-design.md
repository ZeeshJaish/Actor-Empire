# Actor Empire Shared Interactive World Map v2

**Status:** Proposed; no implementation is authorized by this document.

**Goal:** Replace Actor Empire's live map presentation with one high-quality, mobile-safe shared world-map engine while preserving every screen's existing gameplay data, calculations, selections, saves, and callbacks.

## Product boundary

This is a presentation and interaction transplant. Actor Empire remains authoritative for production locations, costs, quality, release regions, cinema terms, facilities, racks, coverage, routes, saves, and all business outcomes.

The supplied `Actor-Empire-Map-v2-TSX.zip` contributes:

- detailed world and country geometry;
- animated world-to-region and region-to-country movement;
- pan, pinch, controlled wheel zoom, and fly-to behavior;
- mobile-sized pins and non-scaling labels;
- animated route presentation;
- map styling and reduced-motion behavior.

The supplied package does not contribute:

- `SAMPLE_PLAYER_CITIES` or any player-count presentation;
- demo Toronto or launch-market gameplay data;
- the complete `ProductionLocationPicker` screen;
- demo costs, selection rules, routes, hubs, or confirmation behavior;
- replacement state, persistence, simulation, or economy logic.

## Shared architecture

The existing `views/lifestyle/business/components/InteractiveRegionMap.tsx` remains the public map component. Existing props and callbacks remain compatible. The detailed geometry is owned by `worldMapGeometry.ts`, navigation gestures by `useMapViewport.ts`, map-only styling by `interactiveRegionMap.css`, and region metadata by `services/regionMap.ts`.

Screen adapters decide what the map means:

- Greenlight uses multi-location selection and full drill-down.
- Release Wizard uses regional selection and regional focus only.
- Studio Finance uses facilities, markets, and network routes.
- Streaming Build uses servers, capacity, coverage, and network health.
- Cinematics use read-only automatic movement.
- Small country cards use detailed static cutouts.

No map renderer may calculate or mutate gameplay outcomes.

## Global requirements

- Preserve `InteractiveRegionMap`'s current props and default behavior until each consumer is migrated.
- Preserve Greenlight's `selectedIds: string[]`; the demo's single-city state must not replace multi-location selection.
- Reuse `services/productionLocations.ts`; do not create a second production-city catalogue.
- Do not display player counts anywhere in this roadmap.
- Keep all map data local and deterministic; no online map API, CDN map tile, or paid service.
- Keep SVG ids unique when more than one map is mounted.
- Respect `prefers-reduced-motion` and provide button/keyboard paths for every map action.
- Keep ordinary page scrolling functional; only pinch or modified-wheel input zooms the map.
- Load the 50m atlas only with map-bearing UI so it does not inflate initial game startup unnecessarily.
- Treat mobile Android WebView at 393x600 and 393x852 as required layouts.

---

## Phase MAP0 — Contract and regression baseline

### Existing-system reuse

- `InteractiveRegionMap` public props and callbacks.
- `services/regionMap.ts` region normalization and release summaries.
- Existing region-map audit scripts and current consumer screens.

### Changes

- Record every live map consumer and its required behavior.
- Add focused contract tests for legacy toggle selection, production pins, routes, active regions, keyboard activation, and unique SVG ids.
- Record baseline bundle size and mobile screenshots before changing the renderer.

### Player-visible surfaces

None. This phase creates the safety net for later visual work.

### Gameplay impact

None.

### Verification

- Current map audits pass without changing production code.
- Consumer inventory covers Greenlight, Release Wizard, Studio Finance, Commission Cut, Streaming Build Network, and compact country shapes.
- Baseline screenshots exist for 393x600 and 393x852.

### Approval gate

Approve the consumer inventory and protected behaviors before the shared renderer changes.

---

## Phase MAP1 — Shared v2 renderer foundation

### Existing-system reuse

- `views/lifestyle/business/components/InteractiveRegionMap.tsx` stays the single public component.
- Existing `BoxOfficeRegionId`, selected-region arrays, location pins, routes, and callbacks remain authoritative.
- Existing 110m map remains available as a lightweight fallback while detailed geometry loads.

### Changes

- Merge the new detailed rendering layers into `InteractiveRegionMap.tsx`.
- Expand `worldMapGeometry.ts` with cached country paths, borders, land, shelf, graticule, labels, and fit bounds.
- Add `useMapViewport.ts` for animated fly-to, pan, and pinch.
- Add `interactiveRegionMap.css` for map-owned styling.
- Extend `services/regionMap.ts` only with geometry/navigation metadata; preserve normalization and summaries.
- Code-split or lazy-load the 50m atlas with map-bearing UI.

### Player-visible surfaces

The existing map gains sharper geography, coastlines, borders, relief, better labels, and route presentation. Existing screens still use their current interaction semantics.

### Gameplay impact

None. Selection and business calculations remain unchanged.

### Verification

- MAP0 contract tests remain green.
- Existing callers compile without prop changes.
- Multiple map instances do not share gradients, clips, or filters.
- Reduced-motion mode removes fly animation without breaking navigation.
- Bundle comparison confirms the detailed atlas is not forced into unrelated startup UI.

### Approval gate

Review the shared map in an isolated legacy-toggle harness and approve its visual direction before any gameplay screen adopts drill-down.

---

## Phase MAP2 — Production House and Greenlight drill-down

### Existing-system reuse

- `services/productionLocations.ts` remains the location catalogue.
- `GreenlightLocationStep.tsx` keeps `selectedIds`, `onChange`, costs, quality, descriptions, Back, and Next.
- `GreenlightWizard.tsx` remains the coordinator and project-creation authority.

### Changes

- Add country ids/codes to the existing production-location records.
- Add controlled world, region, and country view state to `GreenlightLocationStep.tsx`.
- World tap flies to a region; country tap flies to the country; city tap toggles that existing location id.
- Keep the existing location cards below the map, synchronized with map selection.
- Add World/Region/Country breadcrumb and a clear zoom-out path.
- Do not add player counts, launch-market badges, demo shoot spots, or the supplied replacement picker.

### Player-visible surfaces

Production House → New Project → Greenlight → Scout Location.

Players see the world map move into the selected region and country, then select one or more existing production locations such as Toronto, Mumbai, London, or Los Angeles.

### Gameplay impact

No economy change. The same location ids, costs, quality effects, multi-selection rules, and project data are submitted to Greenlight.

### Verification

- Meaningful RED test proves country drill-down is missing before implementation.
- Every existing production city resolves to the correct country.
- Selecting and deselecting multiple locations produces the same `selectedIds` as the current screen.
- Back/Next and budget calculations remain unchanged.
- Touch, pan, pinch, breadcrumb, keyboard, 393x600, and 393x852 tests pass.

### Approval gate

Owner plays the real Greenlight flow and approves movement, readability, multi-location selection, and mobile feel. No other gameplay map migrates before this approval.

---

## Phase MAP3 — Release Wizard regional map

### Existing-system reuse

- `TheatricalDeskStep.tsx` keeps `onToggleRegion` as the only regional-selection authority.
- Release Wizard keeps screening strategy, cinema partners, screens, booking cost, expected footfall, revenue, Back, and Continue logic.

### Changes

- Use the approved v2 visual layers.
- Tapping a region continues to toggle that release region and also animates a regional focus.
- Provide a clear World/reset action without changing selected regions.
- Stop at regional focus; do not expose production cities, player counts, or country-level release mechanics that the game does not model.

### Player-visible surfaces

Release Wizard → Theatrical → Where It Opens.

### Gameplay impact

None. The same region ids drive cinema partner availability and theatrical economics.

### Verification

- Every map tap changes the same selected-region model as before.
- Zooming out does not deselect a region.
- Auto-build footprint, cinema partner selection, screen totals, booking costs, and Continue gating remain unchanged.
- Release Wizard audits, build, keyboard, and mobile layout checks pass.

### Approval gate

Owner approves that the movement improves the release decision without making region selection confusing.

---

## Phase MAP4 — Studio Finance facilities and planning

### Existing-system reuse

- `components/studio-finance/components/build/WorldMap.tsx` remains the adapter from finance data to shared map props.
- Existing `BuildData`, `BuildDraft`, facilities, markets, opening regions, company color, services, recommendations, and selection callbacks remain authoritative.
- `CountryShape.tsx` continues to use shared geometry for compact country cutouts.

### Changes

- Enable controlled map focus for regions, countries, and cities containing facilities.
- Keep facility, market, selected-city, planned/built, and route overlays visually distinct.
- Use the approved map in Stage Sites and Team Planning cinematic surfaces.
- Upgrade compact country cutouts from the same geometry without adding pan or zoom inside small cards.

### Player-visible surfaces

- Studio Finance → Build → Stage Sites.
- Studio Finance → Team Planning cinematic.
- Small infrastructure country cards.

### Gameplay impact

None. Facility costs, recommendations, construction state, service reach, and country economics remain unchanged.

### Verification

- Existing city selection callbacks receive the same ids.
- Recommended, planned, built, market, and active states remain distinguishable.
- Route endpoints match their existing city coordinates.
- Stage Sites, planning cinematic, country-map audit, build, keyboard, and mobile checks pass.

### Approval gate

Owner approves the facility/market readability and confirms the map does not obscure financial decisions.

---

## Phase MAP5 — Streaming infrastructure network

### Existing-system reuse

- `StreamingBuildNetworkMap.tsx` keeps its current nodes, rack counts, roles, load, built/planned state, selected facility, coverage, unserved regions, and selection callback.
- Streaming Buildout remains authoritative for infrastructure economics and network outcomes.

### Changes

- Replace only the dot-matrix geographic background with the shared detailed map.
- Adapt streaming cities to longitude/latitude pins from the existing production-location catalogue.
- Preserve capacity rings, origin-server emphasis, planned/built styling, unserved coverage, route pulses, and node selection.
- Add region/country focus only where it improves inspection; do not add production or release controls.
- Retire the live dependency on `WORLD_MASK` after equivalent behavior is verified.

### Player-visible surfaces

Streaming Platform → Build Network / Sites.

### Gameplay impact

None. Racks, capacity, load, resilience, coverage, costs, build time, outage risk, and service calculations do not move into the map.

### Verification

- The same facility id is selected before and after migration.
- Node radius still represents rack count; ring fill still represents load.
- Built/planned, origin, unserved, and route states remain readable at phone width.
- Streaming build audits, long-network scenarios, build, keyboard, and mobile checks pass.

### Approval gate

Owner approves that the detailed geography improves the network decision and does not weaken the capacity/health read.

---

## Phase MAP6 — Read-only map cinematics

### Existing-system reuse

- Commission Cut and Team Planning continue to receive committed cities and routes from their existing callers.
- Cinematics display existing outcomes; they do not create or reroll them.

### Changes

- Use automatic world-to-network movement for Commission Cut and other read-only map moments.
- Sequence site reveals and route animation from existing committed data.
- Disable manual selection controls in cinematic mode.
- Skip or shorten movement when reduced motion is enabled.

### Player-visible surfaces

- Studio Finance → Commission Cut.
- Approved map-bearing planning/reveal cinematics.

### Gameplay impact

None. This phase changes presentation timing only.

### Verification

- Cinematics show only committed cities and routes.
- Reopening a cinematic cannot change state or charge money twice.
- Reduced-motion and resume-from-background paths land on the correct final view.
- Commission and cinematic audits pass.

### Approval gate

Owner approves pacing and visual impact before final rollout.

---

## Phase MAP7 — Global mobile, performance, and regression closure

### Existing-system reuse

- Existing build, region-map, Greenlight, Release Wizard, Studio Finance, streaming, save, and migration audits.
- Existing Android WebView smooth-mode and recovery behavior.

### Changes

- Tune label collision, pin priority, and zoom bounds using real Actor Empire data.
- Confirm lazy loading and cache map geometry once per session.
- Remove obsolete live dot-map code only after no consumer remains.
- Keep unused prototype-only map code out of the critical path; removal is separate cleanup unless required for the live migration.

### Player-visible surfaces

All migrated map surfaces receive consistent geography, movement language, controls, and accessibility behavior.

### Gameplay impact

None intended. Any gameplay-model delta blocks completion.

### Verification

- Fresh full production build passes.
- Relevant focused audits pass with fresh output.
- `git diff --check` passes.
- Android/WebView and browser tests cover 393x600 and 393x852, tap targets, pinch, pan, page scroll, keyboard, reduced motion, background/resume, and multiple mounted maps.
- No player-count copy or sample map data is present in the production bundle.
- Initial-load and map-open bundle measurements are compared with MAP0; startup regression must be resolved before completion.
- Owner completes final visual QA on the real game.

### Approval gate

Final owner approval is required before declaring the shared map migration complete.

## Rollout order

`MAP0 → MAP1 → MAP2 → MAP3 → MAP4 → MAP5 → MAP6 → MAP7`

Each phase is independently reviewable. A rejected phase is revised and re-verified before the next phase begins.

## Explicit non-goals

- Player population visualization.
- A public player-location map.
- New production locations or location economics.
- Country-level theatrical economics.
- Online map tiles, geocoding, live traffic, or real-world player telemetry.
- Replacing Actor Empire state with demo component state.
- Redesigning unrelated Production House, Release Wizard, Studio Finance, or Streaming UI.
