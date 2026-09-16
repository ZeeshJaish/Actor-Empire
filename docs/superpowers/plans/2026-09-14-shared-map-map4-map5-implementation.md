# Shared Map MAP4 + MAP5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Studio Finance facility planning and the Streaming Build Network to the approved detailed shared map without moving any financial, construction, capacity, coverage, or facility-selection authority into the renderer.

**Architecture:** Extend the shared pin/route presentation contract with optional facility and network visual metadata. Keep Studio Finance and Streaming as separate typed adapters: MAP4 converts existing `BuildData`/`BuildDraft` into controlled map props, while MAP5 converts existing network nodes into the same shared props and retires only its dot-matrix background. The public lazy boundary continues to isolate the 50m atlas.

**Tech Stack:** React 19, TypeScript, Vite, SVG, existing `InteractiveRegionMap`, Node assertion audits, esbuild, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-14-shared-interactive-world-map-v2-design.md`

## Global Constraints

- Preserve unrelated dirty work and do not stage or commit.
- Preserve existing `BuildData`, `BuildDraft`, facility listings, recommendations, prices, construction state, services, country economics, and city-selection callbacks.
- Preserve Streaming Buildout facility ids, racks, roles, load, built/planned state, selected facility, coverage, unserved regions, costs, build time, resilience, and network outcomes.
- Do not add production, theatrical-release, or player-location controls to Studio Finance or Streaming.
- Keep the 50m atlas behind `InteractiveRegionMap.tsx`'s existing lazy boundary.
- Compact country cards reuse shared geometry but do not pan or zoom.
- Verify 393×600 and 393×852 layouts.

---

### Task 1: Extend the shared facility/network presentation contract

**Files:**
- Modify: `services/regionMap.ts`
- Modify: `views/lifestyle/business/components/regionMapView.ts`
- Modify: `views/lifestyle/business/components/InteractiveRegionMapV2.tsx`
- Modify: `views/lifestyle/business/components/interactiveRegionMap.css`
- Modify: `scripts/audit-region-map-v2-renderer.tsx`

**Interfaces:**
- Consumes: existing `RegionMapLocationPin`, `RegionMapLocationRoute`, `InteractiveRegionMapProps`.
- Produces: optional pin `state`, `size`, `load`, `variant`, and `built`; optional route `animated` and `planned`; optional `warningRegionIds`.

- [x] **Step 1: Add failing renderer assertions**

Render literal facility and network pins, a planned route, and a warning region. Assert the static markup exposes distinct `irm-pin-recommended`, `irm-pin-planned`, `irm-pin-built`, `irm-pin-active`, `irm-pin-origin`, load-ring, planned-route, and warning-region classes. Assert old pins without metadata retain the default markup.

- [x] **Step 2: Run the renderer audit and observe RED**

Run:

```bash
esbuild scripts/audit-region-map-v2-renderer.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-region-map-v2-renderer.cjs
node /tmp/audit-region-map-v2-renderer.cjs
```

Expected: fail because the new visual metadata is not rendered.

- [x] **Step 3: Implement optional shared visual metadata**

Add only optional fields so MAP0–MAP3 callers retain current defaults. Use CSS classes and SVG circles for facility state, network role, load, and planned/built treatment. Routes animate by default; `animated: false` suppresses the pulse. Warning regions receive a warning stroke/tint without changing selection.

- [x] **Step 4: Run the renderer and MAP2/MAP3 contract audits and observe GREEN**

Expected: the extended renderer audit passes and all existing callers retain their behavior.

---

### Task 2: Enable MAP4 Studio Finance focus and state mapping

**Files:**
- Create: `components/studio-finance/components/build/studioFinanceMap.ts`
- Modify: `components/studio-finance/components/build/WorldMap.tsx`
- Modify: `components/studio-finance/components/build/StageSites.tsx`
- Test: `scripts/audit-map4-studio-finance-map.tsx`

**Interfaces:**
- Consumes: `BuildData`, `BuildDraft`, `selectedCityId`, controlled `RegionMapView`, existing region/country/city callbacks.
- Produces: `createStudioFinanceMapModel(data, draft, selectedCityId, view, showNetworkRoutes)`, `financeCountryMapId(data, countryId)`, and a live World → Region → Country → City map.

- [x] **Step 1: Write the failing MAP4 adapter audit**

Use a literal `BuildData` fixture containing recommended, planned, built, market, and active cities. Assert the model returns the same city ids, ISO numeric country ids sourced through the production-location catalogue, separate state values, facility routes, selected/market regions, `interaction: 'drilldown'`, and `maximumViewLevel: 'country'`. Render `WorldMap` and assert its existing accessibility label remains.

- [x] **Step 2: Run the MAP4 audit and observe RED**

Run:

```bash
esbuild scripts/audit-map4-studio-finance-map.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-map4-studio-finance-map.cjs
node /tmp/audit-map4-studio-finance-map.cjs
```

Expected: fail because `studioFinanceMap.ts` and its model do not exist.

- [x] **Step 3: Implement the Studio Finance adapter and controlled focus**

Derive all pins from `data.cities`; derive facility state from `draft.facilities`; derive country numeric ids from the matching production-location id. `WorldMap` owns presentation-only view state and forwards region, country, and city selections to the existing Stage Sites setters. Returning to World changes only view state. Team Planning inherits the new detailed map through its existing `WorldMap` calls. `CountryShape` remains non-interactive shared cutout geometry.

- [x] **Step 4: Run MAP4 and existing Studio Finance audits and observe GREEN**

Run the new audit plus existing streaming build world, country cutout, assisted build, and team-planning audits. Expected: every audit passes without financial-model changes.

---

### Task 3: Enable MAP5 Streaming infrastructure geography

**Files:**
- Create: `components/streaming-transplant/streamingNetworkMap.ts`
- Modify: `components/streaming-transplant/StreamingBrandVisuals.tsx`
- Modify: `components/streaming-transplant/StreamingBuildNetworkMap.tsx`
- Modify: `components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css`
- Test: `scripts/audit-map5-streaming-network-map.tsx`

**Interfaces:**
- Consumes: existing `NetworkMapNode[]`, coverage/unserved region ids, selected facility id, live flag, and `onSelect(facilityId)`.
- Produces: enriched shared-catalogue `City` longitude/latitude/country metadata and `createStreamingNetworkMapModel(nodes, coverage, unserved, selectedFacilityId, live, view)`.

- [x] **Step 1: Write the failing MAP5 adapter audit**

Build literal origin, relay, and cache nodes from real catalogue cities. Assert the model preserves facility ids, maps node radius from rack count, maps ring load from existing load, maps role to origin/relay/cache, maps built/planned state, creates origin routes, marks unserved regions as warnings, and uses `interaction: 'drilldown'`. Render the real network component and assert the same facility accessibility labels and empty state remain.

- [x] **Step 2: Run the MAP5 audit and observe RED**

Run:

```bash
esbuild scripts/audit-map5-streaming-network-map.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-map5-streaming-network-map.cjs
node /tmp/audit-map5-streaming-network-map.cjs
```

Expected: fail because the adapter does not exist and the component still renders `WORLD_MASK` dots.

- [x] **Step 3: Replace only the dot-matrix background**

Enrich `CITIES` directly from `PRODUCTION_LOCATION_CATALOG`. Replace the component's hand-built world dots, links, and nodes with shared map pins/routes and explicit network metadata. Keep the existing empty state, legend, accessible facility label, selected-facility callback, and Buildout facts/detail panel. Clicking a node forwards the same facility id and focuses its country; World reset does not clear facility selection.

- [x] **Step 4: Run MAP5 and existing Streaming Buildout audits and observe GREEN**

Expected: the new audit and existing buildout, infrastructure, pricing, state, and long-network scenario audits pass.

---

### Task 4: Combined owner review and mobile regression

**Files:**
- Modify: `artifacts/map-v2/review.tsx`
- Modify: `artifacts/map-v2/review.html`
- Modify: `scripts/audit-map2-map3-browser.mjs`
- Update: `docs/superpowers/reports/2026-09-14-shared-map-map0-baseline.md`
- Create screenshots under: `artifacts/map-v2/map4-map5-after/`

**Interfaces:**
- Consumes: real MAP4 `WorldMap` and MAP5 `StreamingBuildNetworkMap` components with existing fixtures/models.
- Produces: MAP4 and MAP5 owner-review tabs, keyboard/mobile interaction evidence, screenshots, and updated report.

- [x] **Step 1: Add MAP4 and MAP5 to the owner-review harness**

Use real components and catalogue-backed fixture data. MAP4 must demonstrate region/country/city navigation and recommended/planned/built/active states. MAP5 must demonstrate origin/relay/cache nodes, rack sizing, load rings, planned/built routes, facility selection, and an unserved warning.

- [x] **Step 2: Add and run browser assertions at 393×600 and 393×852**

Verify MAP4 city selection returns the same id, card/map synchronization, route endpoints, readable finance controls, MAP5 facility selection returns the same id, country focus, World reset without deselection, readable legend, and no horizontal overflow or page errors.

- [x] **Step 3: Run the complete focused regression set**

Run MAP0–MAP5 focused audits, TypeScript, production build, `git diff --check`, and `git status --short`. Confirm the detailed atlas remains a separate lazy chunk.

- [x] **Step 4: Update the report and stop at the owner gate**

Record exact commands, results, bundle sizes, and screenshot paths. Present MAP4 and MAP5 together. Do not begin MAP6 until the owner approves both.
