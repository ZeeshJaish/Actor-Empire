# Shared Map MAP2 + MAP3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the approved shared-map drill-down in Greenlight production-location selection and regional focus in the theatrical Release Wizard without changing either system's gameplay authority.

**Architecture:** Extend the lightweight map-view contract with explicit region-tap intent and a maximum navigation level. Add ISO country metadata plus a typed Greenlight map adapter around the existing production-location catalogue. Greenlight controls world/region/country navigation while existing location ids remain the selection model; the theatrical desk controls world/region navigation while its existing `onToggleRegion` callback remains the only selection authority.

**Tech Stack:** React 19, TypeScript, Vite, SVG, existing `InteractiveRegionMap`, Node assertion audits, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-14-shared-interactive-world-map-v2-design.md`

## Global Constraints

- Preserve unrelated dirty work and do not stage or commit.
- Reuse `services/productionLocations.ts`; do not create a second production-city catalogue.
- Preserve Greenlight `selectedIds`, multi-location selection, costs, quality, Back, Next, project creation, and save behavior.
- Preserve Release Wizard region ids, `onToggleRegion`, cinema partners, screens, booking costs, revenue, Back, Continue, and auto-build behavior.
- Do not add player counts, demo shoot locations, demo costs, launch-market badges, or country-level theatrical mechanics.
- Keep the 50m atlas behind the existing lazy map boundary.
- Keep ordinary page scrolling functional at world scale; use map gesture capture only after zoom or during pinch.
- Verify 393×600 and 393×852 layouts.

---

### Task 1: Add authoritative country metadata and Greenlight adapter behavior

**Files:**
- Modify: `services/productionLocations.ts`
- Create: `views/lifestyle/business/components/greenlightLocationMap.ts`
- Create: `scripts/audit-map2-greenlight-location-data.ts`

**Interfaces:**
- Consumes: `ProductionLocation`, `PRODUCTION_LOCATION_CATALOG`, `RegionMapView`, existing `selectedIds: string[]`.
- Produces: required `countryId`, `countryCode`, and `countryName` on each production location; `createGreenlightLocationPins(locations, selectedIds)`; `getGreenlightVisibleLocations(locations, selectedContinentId, view)`; `toggleProductionLocationSelection(selectedIds, locationId)`; `createGreenlightLocationMapModel(locations, selectedIds, view)`.

- [x] **Step 1: Write the failing MAP2 data audit**

Assert literal authoritative results:

```ts
assert.deepEqual(
  pick(getProductionLocation('TOR')),
  { countryId: '124', countryCode: 'CA', countryName: 'Canada' },
);
assert.equal(PRODUCTION_LOCATION_CATALOG.every(location => /^\d{3}$/.test(location.countryId)), true);
assert.equal(PRODUCTION_LOCATION_CATALOG.every(location => getRegionIdForCountry(location.countryId) === location.regionId), true);
assert.deepEqual(toggleProductionLocationSelection(['TOR'], 'BOM'), ['TOR', 'BOM']);
assert.deepEqual(toggleProductionLocationSelection(['TOR', 'BOM'], 'TOR'), ['BOM']);
assert.equal(createGreenlightLocationPins(PRODUCTION_LOCATION_CATALOG, ['TOR']).find(pin => pin.id === 'TOR')?.selected, true);
assert.deepEqual(getGreenlightVisibleLocations(PRODUCTION_LOCATION_CATALOG, 'NA', countryView('124')).map(item => item.id), ['VAN', 'TOR']);
assert.deepEqual(createGreenlightLocationMapModel(PRODUCTION_LOCATION_CATALOG, ['TOR'], countryView('124')).visibleLocationIds, ['VAN', 'TOR']);
```

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-map2-greenlight-location-data.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-map2-greenlight-location-data.mjs && node /tmp/audit-map2-greenlight-location-data.mjs
```

Expected: FAIL because country metadata and the Greenlight adapter do not exist.

- [x] **Step 3: Implement the metadata and adapter**

Add exact ISO data for all existing production cities. The adapter must derive pins from the passed catalogue, never from demo constants, and must return new selection arrays without mutating input.

- [x] **Step 4: Run the MAP2 data audit and observe GREEN**

Expected: `MAP2 Greenlight location data audit passed.`

---

### Task 2: Extend the shared drill-down intent contract

**Files:**
- Modify: `views/lifestyle/business/components/regionMapView.ts`
- Modify: `views/lifestyle/business/components/InteractiveRegionMapV2.tsx`
- Modify: `scripts/audit-region-map-v2-renderer.tsx`
- Create: `scripts/audit-map2-map3-view-contract.ts`

**Interfaces:**
- Consumes: `RegionMapView`, `BoxOfficeRegionId`, existing `onSelectRegion`.
- Produces: `drilldownRegionSelection?: 'navigate' | 'toggle'`, `maximumViewLevel?: 'region' | 'country'`, `resolveRegionMapRegionTap(regionId, selectionMode)`, and `resolveRegionMapCountryTap(currentView, countryId, maximumViewLevel)`.

- [x] **Step 1: Write the failing shared-contract audit**

Assert:

```ts
assert.deepEqual(resolveRegionMapRegionTap('EUROPE', 'navigate'), {
  nextView: regionView('EUROPE'), shouldSelectRegion: false,
});
assert.deepEqual(resolveRegionMapRegionTap('EUROPE', 'toggle'), {
  nextView: regionView('EUROPE'), shouldSelectRegion: true,
});
assert.deepEqual(resolveRegionMapCountryTap(regionView('NORTH_AMERICA'), '124', 'country'), countryView('124', 'NORTH_AMERICA'));
assert.deepEqual(resolveRegionMapCountryTap(regionView('NORTH_AMERICA'), '124', 'region'), regionView('NORTH_AMERICA'));
```

- [x] **Step 2: Run the contract audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-map2-map3-view-contract.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-map2-map3-view-contract.mjs && node /tmp/audit-map2-map3-view-contract.mjs
```

Expected: FAIL because the tap-intent helpers and props are missing.

- [x] **Step 3: Implement the shared contract and renderer behavior**

The renderer must call `onSelectRegion` only when `drilldownRegionSelection === 'toggle'`. With `maximumViewLevel === 'region'`, country paths may remain visible as geography but must not be buttons or navigate deeper. Defaults remain `navigate` and `country` so MAP1 and Greenlight semantics stay intact.

- [x] **Step 4: Run contract and renderer audits and observe GREEN**

Expected: both shared audits pass.

---

### Task 3: Enable MAP2 in the real Greenlight location step

**Files:**
- Modify: `views/lifestyle/business/components/GreenlightLocationStep.tsx`
- Create: `scripts/audit-map2-greenlight-drilldown.tsx`

**Interfaces:**
- Consumes: typed production locations, Greenlight adapter helpers, controlled `RegionMapView`, existing `selectedIds`/`onChange`.
- Produces: live `interaction="drilldown"`, `maximumViewLevel="country"`, controlled view state, synchronized region/country cards, and unchanged location-id selection output.

- [x] **Step 1: Write the failing Greenlight integration audit**

Render the real step with the real grouped production catalogue and assert that `Back`, `Next: Movie Setup`, and disabled Next for empty `selectedIds` remain present. Exercise `createGreenlightLocationMapModel` directly and assert its literal world/country models expose the correct selected regions, Toronto pin, and Canada-only cards. This catches missing/wrong adapter wiring without grepping implementation text.

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-map2-greenlight-drilldown.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-map2-greenlight-drilldown.cjs && node /tmp/audit-map2-greenlight-drilldown.cjs
```

Expected: FAIL because the real step still uses legacy toggle interaction.

- [x] **Step 3: Implement the controlled Greenlight flow**

Initialize at `WORLD_VIEW`. On region/country navigation, update only local presentation state. City pin/card activation must call the same `onChange` with adapter-produced location ids. In country view, filter cards to that country; in region view, show the region's current city list. Keep the global production-network and selected-count overlays readable without covering the breadcrumb/back control.

- [x] **Step 4: Run MAP2 audits and observe GREEN**

Expected: data and integration audits pass.

---

### Task 4: Enable MAP3 in the real theatrical desk

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/theatricalRegionMap.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx`
- Create: `scripts/audit-map3-release-region-focus.tsx`

**Interfaces:**
- Consumes: `TheatricalDeskModel.regions`, controlled `RegionMapView`, existing `onToggleRegion`.
- Produces: `createTheatricalRegionMapModel(regions, view)` plus live region-only drill-down where a world-region tap toggles the same region id and focuses it; World/reset changes only presentation state.

- [x] **Step 1: Write the failing MAP3 integration audit**

Exercise `createTheatricalRegionMapModel` and assert a literal model with selected region ids, `interaction: 'drilldown'`, `maximumViewLevel: 'region'`, and `drilldownRegionSelection: 'toggle'`. Render the real desk and assert `AUTO-BUILD FOOTPRINT`, `CINEMA PARTNERS`, `BACK`, and disabled `CONTINUE` at zero screens remain present. The model assertion catches a wrong navigation/selection contract without grepping implementation text.

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-map3-release-region-focus.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-map3-release-region-focus.cjs && node /tmp/audit-map3-release-region-focus.cjs
```

Expected: FAIL because the theatrical desk still uses toggle-only map mode.

- [x] **Step 3: Implement regional focus**

Add local `mapView` state initialized at `WORLD_VIEW`; pass the explicit region-only props. Do not add country/location props and do not replace `onToggleRegion`.

- [x] **Step 4: Run MAP3 and existing release audits and observe GREEN**

Run the new audit plus `node scripts/audit-release-distribution-desk.mjs` and the existing shared-map UI audit.

---

### Task 5: Full MAP2 + MAP3 regression, mobile QA, and owner handoff

**Files:**
- Update: `docs/superpowers/reports/2026-09-14-shared-map-map0-baseline.md`
- Create screenshots: `artifacts/map-v2/map2-map3-after/`
- Modify production files only if a new failure receives its own RED regression first.

**Interfaces:**
- Consumes: completed MAP2 and MAP3 integrations.
- Produces: fresh audit/build/type evidence and real-screen screenshots for owner review.

- [x] **Step 1: Run all MAP2/MAP3 and shared-map focused audits**

Expected: every new audit plus MAP0/MAP1 region, renderer, lazy-boundary, Greenlight module, release desk, and streaming country-map audits pass.

- [x] **Step 2: Run TypeScript, production build, and diff checks**

Run:

```bash
npm run lint
npm run build
git diff --check
git status --short
```

Expected: commands exit 0; the detailed atlas remains a separate lazy chunk; unrelated dirty work remains untouched.

- [x] **Step 3: Browser-check Greenlight at 393×600 and 393×852**

Verify world → North America → Canada → Toronto, Toronto card/pin synchronization, multiple selected locations, breadcrumb/back navigation, ordinary world-scale scrolling, and unchanged Next gating. Save screenshots under `artifacts/map-v2/map2-map3-after/greenlight/`.

- [x] **Step 4: Browser-check theatrical release at 393×600 and 393×852**

Verify world → Europe focus, the same Europe selection state, World/reset without deselection, partner desk/screens/costs unchanged, and no country/city controls. Save screenshots under `artifacts/map-v2/map2-map3-after/release/`.

- [x] **Step 5: Update the report and stop at the owner gate**

Record exact verification results and screenshot paths. Present both real flows together. Do not begin MAP4 until the owner explicitly approves MAP2 and MAP3.
