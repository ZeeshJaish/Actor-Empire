# Shared Map MAP0 + MAP1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a verified baseline for every current Actor Empire map consumer and replace the shared map presentation with the v2 detailed, mobile-safe renderer without changing gameplay behavior.

**Architecture:** Keep `InteractiveRegionMap` as the stable public boundary and keep all existing props/callbacks authoritative. Extend the shared region and geometry modules, add an isolated viewport hook and map stylesheet, and load the 50m renderer through a dynamic component boundary with the current 110m renderer as the immediate fallback.

**Tech Stack:** React 19, TypeScript, Vite, SVG, d3-geo, topojson-client, world-atlas, Node assertion audits, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-14-shared-interactive-world-map-v2-design.md`

## Global Constraints

- Preserve unrelated dirty work and do not stage or commit.
- Preserve every existing `InteractiveRegionMap` prop and callback.
- Do not add `SAMPLE_PLAYER_CITIES`, player-count UI, `ProductionLocationPicker`, demo costs, or duplicate production-location data.
- Do not change Greenlight, release, facility, streaming, save, or economy behavior in MAP0 + MAP1.
- The public component must default to current toggle semantics; drill-down is not enabled in real consumers in this plan.
- Keep the 110m renderer available as the synchronous fallback and split the 50m renderer into a map-only lazy chunk.
- Use strict RED-GREEN TDD for each new production behavior.
- Verify phone layouts at 393x600 and 393x852.

---

### Task 1: Capture MAP0 baseline and consumer inventory

**Files:**
- Create: `docs/superpowers/reports/2026-09-14-shared-map-map0-baseline.md`
- Modify: none
- Test: existing `scripts/audit-region-map.ts`, `scripts/audit-region-map-ui.mjs`, and `scripts/audit-streaming-build-country-map.tsx`

**Interfaces:**
- Consumes: current worktree, current build output, all direct `InteractiveRegionMap` and `createWorldCountryCutout` callers.
- Produces: baseline commands, measurements, consumer list, protected behavior list, and pre-change screenshots for comparison.

- [x] **Step 1: Run existing focused audits**

Run:

```bash
npx esbuild scripts/audit-region-map.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-region-map.mjs && node /tmp/audit-region-map.mjs
node scripts/audit-region-map-ui.mjs
npx esbuild scripts/audit-streaming-build-country-map.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-streaming-build-country-map.cjs && node /tmp/audit-streaming-build-country-map.cjs
```

Expected: each audit prints its pass message. If current unrelated work prevents a command from passing, record the exact pre-existing failure in the baseline instead of concealing it.

- [x] **Step 2: Run the current production build and record asset sizes**

Run:

```bash
npm run build
du -h dist/assets/* | sort -h | tail -20
```

Expected: build exit 0, or an exact documented pre-existing failure. Record generated JS/CSS asset names and sizes.

- [x] **Step 3: Record the live consumer inventory**

Run:

```bash
rg -n "<InteractiveRegionMap|createWorldCountryCutout" views components --glob '*.{ts,tsx}'
```

Record these protected consumers in the report: Greenlight Location Step, theatrical Release Wizard desk, Studio Finance WorldMap/Stage Sites/Team Planning, Commission Cut, and compact CountryShape. Record `StreamingBuildNetworkMap` as a separate MAP5 renderer, not a MAP1 consumer.

- [x] **Step 4: Capture pre-change phone screenshots**

Start the correct repo server, verify its process cwd, and capture the shared map at 393x600 and 393x852 through a deterministic audit harness or the real mock flow. Save screenshots under `artifacts/map-v2/map0-before/` and record their paths.

- [x] **Step 5: Write the baseline report**

The report must include exact command outputs/status, consumer inventory, protected behavior, baseline asset sizes, screenshot paths, and any pre-existing blocker. It must not claim visual approval.

---

### Task 2: Extend region metadata and shared geographic geometry

**Files:**
- Modify: `services/regionMap.ts`
- Modify: `views/lifestyle/business/components/worldMapGeometry.ts`
- Create: `scripts/audit-region-map-v2-geometry.ts`

**Interfaces:**
- Consumes: `BoxOfficeRegionId`, `BOX_OFFICE_REGIONS`, bundled 110m topology.
- Produces: `LonLatBox`, `labelLonLat`, `fitBox`, `hubCityId`, `REGION_ID_BY_COUNTRY`, `getRegionIdForCountry`, `MAP_WIDTH`, `MAP_BASE_HEIGHT`, cached paths, region/country bounds, labels, and projected coordinates.

- [x] **Step 1: Write the failing geometry audit**

Create a real behavior audit that imports the desired exports and asserts literal outcomes:

```ts
assert.equal(getRegionIdForCountry('356'), 'ASIA');
assert.equal(getRegionIdForCountry('840'), 'NORTH_AMERICA');
assert.equal(countryDisplayName('356'), 'India');
assert.equal(formatWorldCountryId(36), '036');
assert.ok(getCountryPath('840').length > 1000);
assert.ok(boundsForCountry('840')[1][0] > boundsForCountry('840')[0][0]);
assert.ok(boundsForLonLatBox([[-125, 24], [-66, 50]])[1][1] > boundsForLonLatBox([[-125, 24], [-66, 50]])[0][1]);
assert.equal(REGION_MAP_OVERLAYS.every(region => region.fitBox.length === 2), true);
```

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-region-map-v2-geometry.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-region-map-v2-geometry.mjs && node /tmp/audit-region-map-v2-geometry.mjs
```

Expected: FAIL because the v2 geometry and region APIs are missing.

- [x] **Step 3: Implement the minimum shared geometry and metadata**

Port only the geometry/region fields and helpers needed by the assertions and v2 renderer. Keep the existing normalization/default/summary behavior unchanged. Do not add player or demo-place data.

- [x] **Step 4: Run the geometry audit and observe GREEN**

Run the Step 2 command.

Expected: `Region map v2 geometry audit passed.`

- [x] **Step 5: Re-run existing region and country audits**

Run the three Task 1 focused audit commands.

Expected: all existing behavior remains green.

---

### Task 3: Add the independent viewport engine

**Files:**
- Create: `views/lifestyle/business/components/useMapViewport.ts`
- Create: `scripts/audit-region-map-v2-viewport.ts`

**Interfaces:**
- Consumes: SVG dimensions, frame origin, bounds, min/max scale, pointer/wheel events.
- Produces: `ViewTransform`, `IDENTITY_TRANSFORM`, `clampMapTransform`, `fitMapBoundsTransform`, `applyTransform`, and `useMapViewport`.

- [x] **Step 1: Write the failing viewport audit**

Assert real pure behavior with literal values:

```ts
assert.deepEqual(applyTransform({ k: 2, x: -10, y: 5 }, [20, 30]), [30, 65]);
assert.deepEqual(clampMapTransform({ k: 0.2, x: 50, y: -900 }, { width: 1000, height: 520, originY: 0, minScale: 1, maxScale: 16 }), { k: 1, x: 0, y: 0 });
const fitted = fitMapBoundsTransform([[200, 100], [400, 300]], { width: 1000, height: 520, originY: 0, minScale: 1, maxScale: 16, boundsMaxScale: 6 });
assert.ok(fitted.k > 1 && fitted.k <= 6);
```

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-region-map-v2-viewport.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-region-map-v2-viewport.mjs && node /tmp/audit-region-map-v2-viewport.mjs
```

Expected: FAIL because `useMapViewport.ts` does not exist.

- [x] **Step 3: Implement pure transform helpers and the React hook**

Use the supplied v2 behavior: clamped fly-to, cubic easing, reduced-motion completion, hidden-tab completion, pointer capture, one-pointer pan only after zoom, two-pointer pinch, and modified-wheel zoom. Plain wheel must remain page scroll.

- [x] **Step 4: Run the viewport audit and observe GREEN**

Run the Step 2 command.

Expected: `Region map v2 viewport audit passed.`

---

### Task 4: Build the compatible v2 detailed renderer

**Files:**
- Create: `views/lifestyle/business/components/InteractiveRegionMapV2.tsx`
- Create: `views/lifestyle/business/components/interactiveRegionMap.css`
- Modify: `services/regionMap.ts` only if the shared pin/route types are still local to the old component.
- Create: `scripts/audit-region-map-v2-renderer.tsx`

**Interfaces:**
- Consumes: every existing `InteractiveRegionMap` prop, shared geometry helpers, region metadata, and `useMapViewport`.
- Produces: `InteractiveRegionMapV2`, `RegionMapView`, `WORLD_VIEW`, `regionView`, `countryView`, and `parentView` without player-count or demo-place APIs.

- [x] **Step 1: Write the failing renderer audit**

Render `InteractiveRegionMapV2` directly with current legacy props and assert observable markup:

```ts
assert.match(markup, /class="[^"]*irm-svg/);
assert.match(markup, /aria-label="North America release region"/);
assert.match(markup, /class="irm-region-base irm-hit"/);
assert.match(markup, /class="irm-route-core"/);
assert.match(markup, /Los Angeles/);
assert.doesNotMatch(markup, /players here|SAMPLE_PLAYER_CITIES|ProductionLocationPicker/i);
```

Render two instances and assert their SVG ids differ. Render release and production tones and assert the same selected region and pin ids remain exposed through `aria-pressed`.

- [x] **Step 2: Run the renderer audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-region-map-v2-renderer.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-region-map-v2-renderer.cjs && node /tmp/audit-region-map-v2-renderer.cjs
```

Expected: FAIL because the v2 renderer is missing.

- [x] **Step 3: Implement the minimal compatible detailed renderer**

Port the supplied v2 visual layers, label collision, routes, non-scaling overlays, unique ids, and optional drill-down view API. Keep `interaction='toggle'` as the default. Exclude `mapPlaces`, player cities/counts, shoot-location demo content, and `ProductionLocationPicker`.

- [x] **Step 4: Add the map-owned stylesheet**

Port only `.irm-*` presentation, route animation, touch-action, hover/focus, and reduced-motion rules. Do not introduce global selectors outside `.interactive-region-map`/`.irm-*`.

- [x] **Step 5: Run the renderer audit and observe GREEN**

Run the Step 2 command.

Expected: `Region map v2 renderer audit passed.`

- [x] **Step 6: Re-run geometry, viewport, and legacy audits**

Run all focused commands from Tasks 1-3.

Expected: all focused audits pass.

---

### Task 5: Add the lazy public boundary and verify bundle splitting

**Files:**
- Create: `views/lifestyle/business/components/InteractiveRegionMapLegacy.tsx`
- Modify: `views/lifestyle/business/components/InteractiveRegionMap.tsx`
- Modify: `views/lifestyle/business/components/worldMapGeometry.ts` or create `worldMapDetailedGeometry.ts` if needed to keep the 50m import out of the synchronous fallback.
- Create: `scripts/audit-region-map-v2-lazy.tsx`

**Interfaces:**
- Consumes: current public props/types, legacy fallback renderer, `React.lazy`, `Suspense`, v2 renderer.
- Produces: unchanged `InteractiveRegionMap` import path and exported pin/route/view types, immediate 110m fallback, and lazy 50m detailed renderer.

- [x] **Step 1: Write the failing lazy-boundary audit**

The audit renders the public component synchronously and asserts a usable fallback map, then builds a small entry with an esbuild metafile and asserts `countries-50m.json` is not included in the synchronous entry input set.

- [x] **Step 2: Run the audit and observe RED**

Run:

```bash
npx esbuild scripts/audit-region-map-v2-lazy.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-region-map-v2-lazy.cjs && node /tmp/audit-region-map-v2-lazy.cjs
```

Expected: FAIL because the public component has no lazy v2 boundary.

- [x] **Step 3: Preserve the current renderer as the fallback and add the lazy wrapper**

Move the current implementation mechanically into `InteractiveRegionMapLegacy.tsx`, import shared pin/route prop types, and keep its observable output unchanged. Make `InteractiveRegionMap.tsx` the stable wrapper that lazy-loads `InteractiveRegionMapV2` and renders the legacy component as Suspense fallback.

- [x] **Step 4: Run the lazy-boundary audit and observe GREEN**

Run the Step 2 command.

Expected: `Region map v2 lazy boundary audit passed.`

- [x] **Step 5: Run production build and inspect chunks**

Run:

```bash
npm run build
du -h dist/assets/* | sort -h | tail -30
```

Expected: build exit 0 and a separate detailed-map/atlas chunk rather than forcing the 50m atlas into the initial entry.

---

### Task 6: MAP0 + MAP1 regression and visual closure

**Files:**
- Update: `docs/superpowers/reports/2026-09-14-shared-map-map0-baseline.md`
- Create screenshots: `artifacts/map-v2/map1-after/`
- Modify production files only if a new failure receives its own RED regression test first.

**Interfaces:**
- Consumes: completed shared map foundation and MAP0 baseline.
- Produces: fresh focused audits, full build evidence, bundle comparison, mobile screenshots, and an honest owner-review handoff.

- [x] **Step 1: Run the complete focused audit set**

Run all new MAP0/MAP1 audits plus the three pre-existing focused audits. Expected: every command exits 0 with its pass message.

- [x] **Step 2: Run full build and diff checks**

Run:

```bash
npm run build
git diff --check
git status --short
```

Expected: build exit 0, no whitespace errors, and only scoped map/report/plan files added or modified by this work; pre-existing unrelated entries remain untouched.

- [ ] **Step 3: Browser-check every current shared consumer**

Verify Greenlight Location, theatrical Release Wizard, Studio Finance WorldMap, Team Planning, Commission Cut, and compact CountryShape at phone widths. Existing interaction semantics must remain unchanged. Capture after screenshots under `artifacts/map-v2/map1-after/`.

- [x] **Step 4: Verify accessibility and motion behavior**

Verify keyboard selection, unique accessible names, `aria-pressed`, reduced-motion behavior, page scroll, and that unmodified wheel input does not trap the page.

- [x] **Step 5: Update the report with fresh evidence**

Record exact command results, before/after bundle sizes, screenshot paths, tested consumers, and remaining limitations. State clearly that MAP2 drill-down is not yet enabled in the live Greenlight flow.

- [x] **Step 6: Stop at the owner gate**

Present the actual map screens for owner review. Do not start MAP2 until the owner explicitly approves MAP1.
