# Shared Map MAP0–MAP7 Implementation Report

**Date:** 2026-09-14  
**Scope:** MAP0 inventory/baseline, MAP1 shared detailed-renderer foundation, MAP2 Greenlight integration, MAP3 theatrical-release integration, MAP4 Studio Finance integration, MAP5 Streaming Buildout integration, MAP6 read-only cinematics, and MAP7 rollout closure  
**Owner gate:** Visual approval remains with the Actor Empire owner. This report is technical evidence, not creative approval.

## MAP0 baseline

### Focused audits before the change

- `audit-region-map.ts`: passed (`Region map audit passed.`).
- `audit-region-map-ui.mjs`: failed before implementation because the source-only audit still expected `world-atlas/countries-110m.json` inside `InteractiveRegionMap.tsx`; the current worktree had already moved that import into `worldMapGeometry.ts`. This was a stale audit assertion, not a runtime map failure.
- `audit-streaming-build-country-map.tsx`: passed (`Streaming build country map audit passed.`).

The UI audit was updated during MAP1 to follow the public boundary, legacy fallback, detailed renderer, and both bundled geometry modules. It now passes.

### Production build before the change

`npm run build` exited 0 with the existing `/index.css` and mixed dynamic/static import warnings.

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| `index-Bm7xk0dy.js` | 12,785.75 kB | 3,529.82 kB |
| `index-FobtPFFW.css` | 3,317.97 kB | 1,526.48 kB |
| `index.html` | 5.59 kB | 1.84 kB |

### Protected consumer inventory

- Greenlight production-location step: `views/lifestyle/business/components/GreenlightLocationStep.tsx`
- Theatrical release desk: `views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx`
- Studio Finance build world map, including Stage Sites and Team Planning: `components/studio-finance/components/build/WorldMap.tsx`
- Commission Cut infrastructure map: `components/studio-finance/components/cine/CommissionCut.tsx`
- Compact country cutout: `components/studio-finance/components/build/CountryShape.tsx`

`components/streaming-transplant/StreamingBuildNetworkMap.tsx` remained separate through MAP1–MAP4 and was migrated to the shared detailed renderer in MAP5.

Protected behavior:

- Existing selected-region arrays remain authoritative.
- Existing region and location callbacks keep the same ids and signatures.
- Release and production visual tones remain supported.
- Greenlight, release, facility, streaming, save, and economy rules are unchanged.
- No sample player cities, player counts, demo costs, or duplicate production-location catalogue were added.

### MAP0 screenshots

- `artifacts/map-v2/map0-before/map0-393x600.png`
- `artifacts/map-v2/map0-before/map0-393x852.png`

## MAP1 result

### Architecture

- `InteractiveRegionMap.tsx` remains the public import path used by production screens.
- `InteractiveRegionMapLegacy.tsx` preserves the synchronous 110m fallback and current toggle behavior.
- `InteractiveRegionMapV2.tsx` owns the detailed visual renderer and optional world → region → country view API.
- `worldMapDetailedGeometry.ts` owns the local 50m topology and cached geographic helpers.
- `useMapViewport.ts` owns clamped fly-to, pan, pinch, modified-wheel zoom, reduced-motion completion, and identity-scale tap preservation.
- The detailed renderer and stylesheet load as separate lazy assets; the main bundle does not absorb the 50m atlas.

### Production build after the split correction

`npm run build` exited 0.

| Asset | Raw | Gzip | Change from MAP0 |
| --- | ---: | ---: | ---: |
| `index-PKwZYtKx.js` | 12,787.07 kB | 3,530.46 kB | +1.32 kB raw / +0.64 kB gzip |
| `index-FobtPFFW.css` | 3,317.97 kB | 1,526.48 kB | unchanged |
| `InteractiveRegionMapV2-BR3b_ctT.js` | 776.37 kB | 242.30 kB | new lazy map/atlas chunk |
| `InteractiveRegionMapV2-D7tmP-q9.css` | 3.63 kB | 0.97 kB | new lazy map stylesheet |

One rebuild attempt hit a transient Vite cleanup error: `ENOTEMPTY` for `dist/assets`. Inspection found Finder's `.DS_Store` as the only entry and no process holding the directory; an unchanged immediate rebuild passed. No product source change was made for that environmental race.

### Verification evidence

- Region metadata and detailed geometry audit: passed.
- Viewport transform and pointer-capture regression audit: passed.
- Detailed renderer SSR/markup, unique-id, route, pin, tone, and no-player-data audit: passed.
- Lazy-boundary/metafile audit: passed.
- Existing region behavior audit: passed.
- Updated shared-map UI integration audit: passed.
- Streaming build country-map audit: passed.
- TypeScript (`npm run lint`): passed.
- Production build: passed.

Browser verification used the correct repo Vite server at `127.0.0.1:5179`:

- MAP0 and MAP1 inspected at 393×600 and 393×852.
- Phone tap on North America opened the 37-country region layer.
- Keyboard `Enter` opened North America and then Canada.
- Back navigation returned country → region → world.
- The identity-scale pointer-capture bug found during visual QA received a failing regression first, then was fixed; region taps now reach the SVG paths.

### MAP1 screenshots

- `artifacts/map-v2/map1-after/map1-393x600.png`
- `artifacts/map-v2/map1-after/map1-393x852.png`
- `artifacts/map-v2/map1-after/map1-north-america-393x852.png`
- `artifacts/map-v2/map1-after/map1-canada-393x852.png`

## MAP2 Greenlight result

- The real Greenlight location step now opens at World and supports World → Region → Country → production city navigation.
- All 29 existing production locations gained authoritative ISO numeric country ids, two-letter codes, and country names in the existing shared catalogue; no second city list was introduced.
- City pins remain hidden until country focus. Region and country cards are derived from the same catalogue and controlled map view.
- Existing `selectedIds`, immutable multi-location selection, costs, quality, Back, disabled/enabled Next, and project-state callbacks remain authoritative.
- The selected-count badge received a 393×600 overlap regression and responsive fix after browser QA found it beneath the fixed action bar.
- No player counts, sample player cities, or demo costs are present.

Browser path verified at both 393×600 and 393×852:

`World → North America → Canada → Toronto + Vancouver`

The audit confirmed both city pins selected, `SELECTED: 2 LOCATIONS`, Canada-only cards, and enabled `Next: Movie Setup` after selection.

### MAP2 screenshots

- `artifacts/map-v2/map2-map3-after/greenlight/map2-canada-600.png`
- `artifacts/map-v2/map2-map3-after/greenlight/map2-canada-852.png`

## MAP3 theatrical release result

- The real theatrical desk now uses the shared drill-down map in a region-only mode.
- Tapping a world region sends the unchanged region id through the existing `onToggleRegion` authority and focuses that region.
- Country geometry remains visible inside a focused region but has no button role, no country selection, and no city controls.
- Returning to World changes only presentation state; the selected region remains selected.
- Existing cinema partners, screens, booking costs, studio/exhibitor split, Auto-build, Back, and guarded Continue remain wired through the theatrical desk.

Browser path verified at both 393×600 and 393×852:

`World → Europe focus → World reset with Europe still selected → Auto-build → enabled Continue`

### MAP3 screenshots

- `artifacts/map-v2/map2-map3-after/release/map3-europe-600.png`
- `artifacts/map-v2/map2-map3-after/release/map3-europe-852.png`

## MAP2 + MAP3 final verification

- MAP2 location-data audit: passed.
- Shared MAP2/MAP3 tap-intent contract audit: passed.
- Detailed renderer breadcrumb, region-only country semantics, and country-level pin visibility audit: passed.
- Real Greenlight drill-down integration audit: passed.
- Real theatrical region-focus integration audit: passed.
- Existing shared-map, lazy-boundary, geometry, viewport, Greenlight module, release desk, and streaming country-map audits: passed.
- Browser audit: passed at 393×600 and 393×852 with no page errors.
- TypeScript (`npm run lint`): passed.
- Production build (`npm run build`): passed.
- `git diff --check`: passed.

The final production build kept the detailed atlas isolated:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| `index-D6Qqn3Z6.js` | 12,790.56 kB | 3,531.51 kB |
| `InteractiveRegionMapV2-7nwh30iu.js` | 777.02 kB | 242.51 kB |
| `InteractiveRegionMapV2-D7tmP-q9.css` | 3.63 kB | 0.97 kB |

The combined owner review is available in `artifacts/map-v2/review.html`; its tabs switch directly between MAP0–MAP5.

## MAP4 Studio Finance result

- The real Studio Finance `WorldMap` now uses controlled World → Region → Country → City focus through the shared detailed renderer.
- All facility presentation data is adapted from the existing `BuildData` and `BuildDraft`; financial quotes, construction state, recommendations, facilities, and callbacks remain authoritative outside the map.
- City ids are preserved while ISO numeric country ids come from the existing production-location catalogue.
- Recommended, planned, built, and active facilities are visually distinct. Built-to-built routes animate; any route containing a planned site remains dashed and static.
- Stage Sites forwards the existing region, country, and city setters. Returning to World changes only presentation focus and does not alter facilities.
- Team Planning inherits MAP4 through its existing `WorldMap` calls. Compact `CountryShape` cards remain static and continue using shared country geometry.

Browser path verified at both 393×600 and 393×852:

`World → North America → Canada → Toronto → World reset with Toronto and all facility state retained`

The audit also found and fixed a shared zoom regression: country-level pins had inherited an inverse scale despite already being positioned outside the transformed geography. A failing mobile target-size assertion was added first; facility pins now remain at least 24px wide after country focus.

### MAP4 screenshots

- `artifacts/map-v2/map4-map5-after/finance/map4-north-america-600.png`
- `artifacts/map-v2/map4-map5-after/finance/map4-north-america-852.png`
- `artifacts/map-v2/map4-map5-after/finance/map4-toronto-600.png`
- `artifacts/map-v2/map4-map5-after/finance/map4-toronto-852.png`

## MAP5 Streaming Buildout result

- The old `WORLD_MASK` dot matrix, hand-built dependency lines, and duplicated SVG nodes were removed from `StreamingBuildNetworkMap`.
- The real Buildout screen now supplies its existing facility ids, city, rack count, role, load, built/planned state, coverage, unserved regions, live state, and selection callback through a typed shared-map adapter.
- `CITIES` remains generated from `PRODUCTION_LOCATION_CATALOG` and now carries that catalogue's longitude, latitude, ISO numeric country id, and country code.
- Origin, relay, and cache nodes remain distinct; rack count controls node radius, load controls the outer ring, and planned sites/routes remain hollow/static.
- Selecting a facility forwards the same facility id and focuses its country. Returning to World keeps the selected facility intact.
- The existing empty state and compact Origin / Relay / Cache / Drawn legend remain.

Browser path verified at both 393×600 and 393×852:

`World network → London relay → United Kingdom focus → World reset with facility-ldn retained`

### MAP5 screenshots

- `artifacts/map-v2/map4-map5-after/network/map5-london-600.png`
- `artifacts/map-v2/map4-map5-after/network/map5-london-852.png`

## MAP4 + MAP5 final verification

- MAP4 Studio Finance adapter/markup audit: passed.
- MAP5 Streaming network adapter/markup audit: passed.
- Shared renderer facility/network metadata audit: passed.
- Existing MAP0–MAP3 region, geometry, viewport, view-contract, Greenlight, and release audits: passed.
- Existing Studio Finance build-world, country-cutout, assisted-build, and team-planning audits: passed.
- Existing Streaming infrastructure, physical-infrastructure, pricing/world, assisted-state, and resource UI audits: passed.
- Lazy-boundary audit: passed; the 50m atlas remains outside the synchronous entry.
- Browser audit: passed at 393×600 and 393×852 with keyboard input, no page errors, and no horizontal overflow.
- TypeScript (`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit`): passed. A default-heap attempt exhausted Node's 4GB heap before diagnostics, so the verification was rerun with an explicit 8GB heap.
- Production build (`npm run build`): passed on immediate retry after the known `.DS_Store` `dist/assets` cleanup race.
- `git diff --check`: passed.

The final production build kept the detailed atlas isolated:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| `index-CSU7p-7p.js` | 12,792.09 kB | 3,532.04 kB |
| `InteractiveRegionMapV2-BzjUzONr.js` | 777.54 kB | 242.78 kB |
| `InteractiveRegionMapV2-BXo7z4oe.css` | 4.57 kB | 1.21 kB |

## MAP6 read-only cinematic result

- The shared map now accepts `interaction="cinematic"` and a deterministic duration/replay configuration.
- A pure timeline begins at World, visits committed sites in supplied order, exposes a route only when both endpoints have been revealed, and returns to the complete World network.
- The renderer uses wall-clock elapsed time when the document resumes, so backgrounding catches up instead of replaying beats or side effects.
- Regions, countries, and pins expose no button roles, tab stops, map handlers, or selection callbacks in cinematic mode. The 110m lazy fallback follows the same read-only rule.
- Reduced motion resolves immediately to the complete network and suppresses route-head animation.
- Team Planning now sends only proposal facility city ids into its map beats. Uncommitted catalogue cities are excluded.
- Commission Cut enriches its already-committed cities from the canonical production-location catalogue and derives a hub-to-site route set without changing cutscene completion, charges, treasury, saves, or commissioning state.
- The Studio Finance cinematic final shot explicitly keeps revealed facilities visible at World; ordinary scouting retains its Region-first pin rule.

Browser verification at 393×600 and 393×852 covered opening frame, elapsed-time resume to an intermediate frame, complete network, replay isolation, no cinematic controls, reduced motion, no page errors, and no horizontal overflow.

### MAP6 screenshots

- `artifacts/map-v2/map6-map7-after/cinematic/map6-complete-600.png`
- `artifacts/map-v2/map6-map7-after/cinematic/map6-complete-852.png`

## MAP7 closure result

- Pin labels now use deterministic priority and collision pruning: selected, active, origin, built, planned, recommended, then idle.
- Only lower-priority overlapping text is omitted. Every SVG pin, semantic location, and invisible tap target remains present.
- The shared invisible facility target was increased to survive nested 393px layouts at 24px or larger without changing visible dot size.
- The detailed 50m atlas remains lazy. Country, region, and unassigned-land geometry remain cached at module scope.
- The owner review mounts theatrical release, Studio Finance, and Streaming Buildout maps simultaneously and demonstrates dense network labels without ZIP-demo player/count content.
- The founding `WORLD_MASK` remains because the separate founding-map consumer is still live.

Browser verification at 393×600 and 393×852 covered three simultaneous detailed maps, keyboard region navigation, collision-pruned labels, at least 24px facility targets, no page errors, and no horizontal overflow.

### MAP7 screenshots

- `artifacts/map-v2/map6-map7-after/closure/map7-three-maps-600.png`
- `artifacts/map-v2/map6-map7-after/closure/map7-three-maps-852.png`

## MAP6 + MAP7 final certification

- MAP0–MAP7 focused geometry, viewport, renderer, view-contract, Greenlight, theatrical-release, Studio Finance, Streaming Buildout, cinematic, label-priority, cache, and lazy-boundary audits: passed.
- Greenlight module/calculation/validation/project-builder audits: passed.
- Release distribution desk audit: passed.
- Streaming pricing/world, country map, assisted planner/UI/state, Team Planning, infrastructure resource, and linked-budget audits: passed.
- Save integrity, migration, and generation audits: passed.
- Browser audit: passed at 393×600 and 393×852.
- TypeScript (`npm run lint`, 8GB heap): passed.
- Production build: passed with the existing `/index.css`, mixed import, and large-chunk warnings.
- `git diff --check`: passed.
- `npx cap sync`: passed for Android, iOS, and web.
- Android `assembleDebug`: passed; artifact: `android/app/build/outputs/apk/debug/app-debug.apk` (49 MB).
- No Android device or emulator was connected, so physical WebView gesture testing remains unverified.

The production bundle still isolates the detailed atlas:

| Asset | Raw | Gzip | Change from MAP5 |
| --- | ---: | ---: | ---: |
| `index-CrSb1AGV.js` | 12,793.12 kB | 3,532.38 kB | +1.03 kB raw / +0.34 kB gzip |
| `InteractiveRegionMapV2-TOrxscF9.js` | 780.55 kB | 243.96 kB | +3.01 kB raw / +1.18 kB gzip |
| `InteractiveRegionMapV2-D3TvAf2H.css` | 4.71 kB | 1.26 kB | +0.14 kB raw / +0.05 kB gzip |

## Remaining gate

MAP6 and MAP7 are implemented and technically certified. The shared-map migration remains at the owner visual-approval gate; technical evidence does not substitute for approval of the real presentation.
