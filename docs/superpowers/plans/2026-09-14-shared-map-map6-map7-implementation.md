# Shared Map MAP6 + MAP7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, read-only cinematic mode to the shared map and certify the complete MAP0–MAP7 migration across mobile, accessibility, performance, browser, and Android build paths.

**Architecture:** A pure shared timeline converts existing pins/routes into deterministic reveal frames; the detailed renderer consumes those frames without invoking selection callbacks. Commission Cut and Team Planning opt into that presentation mode with their already-computed cities/facilities. MAP7 adds a pure pin-label priority/collision selector and closes the rollout with real-screen browser, bundle, TypeScript, build, and Android verification.

**Tech Stack:** React 19, TypeScript, Vite, SVG, existing `InteractiveRegionMap`, Node assertion audits, esbuild, Playwright, Capacitor/Gradle.

**Spec:** `docs/superpowers/specs/2026-09-14-shared-interactive-world-map-v2-design.md`

## Global Constraints

- Preserve unrelated dirty work and do not stage, commit, merge, or push.
- Cinematics consume existing committed cities, facility ids, and routes; they do not create, reroll, charge, save, select, or mutate them.
- Manual map controls and selection callbacks are disabled in cinematic mode.
- Reduced motion lands on the complete final network without animated movement or route pulses.
- Background/resume resolves from elapsed time and cannot replay side effects.
- MAP7 changes presentation and verification only. Any gameplay-model delta blocks completion.
- Preserve the existing lazy 50m atlas boundary and module-level geometry caches.
- Keep the founding `WORLD_MASK` code while its separate founding-map consumer remains live.
- Verify 393×600 and 393×852, keyboard, touch targets, reduced motion, background/resume, multiple maps, production build, and Android packaging.

---

### Task 1: Deterministic read-only cinematic contract

**Files:**
- Create: `views/lifestyle/business/components/regionMapCinematic.ts`
- Modify: `views/lifestyle/business/components/regionMapView.ts`
- Modify: `views/lifestyle/business/components/InteractiveRegionMapLegacy.tsx`
- Modify: `views/lifestyle/business/components/InteractiveRegionMapV2.tsx`
- Modify: `views/lifestyle/business/components/interactiveRegionMap.css`
- Test: `scripts/audit-map6-region-map-cinematic.tsx`

**Interfaces:**
- Consumes: `RegionMapLocationPin[]`, `RegionMapLocationRoute[]`, `durationMs`, `replayKey`.
- Produces: `createRegionMapCinematicTimeline(...)`, `resolveRegionMapCinematicFrame(...)`, `useRegionMapCinematicFrame(...)`, `interaction: 'cinematic'`, and optional `cinematic` configuration.

- [x] **Step 1: Write the failing timeline and renderer audit**

Assert a literal three-site network begins at World with no revealed sites, focuses each site's country as it is revealed, reveals only routes whose endpoints are visible, and finishes at World with every committed site/route. Assert elapsed-time resume selects the correct frame and reduced motion selects the complete final frame. Render the detailed map and assert cinematic regions, countries, and pins have no button roles, tab stops, or selection callbacks.

- [x] **Step 2: Run the MAP6 shared audit and observe RED**

```bash
./node_modules/.bin/esbuild scripts/audit-map6-region-map-cinematic.tsx --bundle --platform=node --format=cjs --loader:.css=text --outfile=/tmp/audit-map6-region-map-cinematic.cjs
node /tmp/audit-map6-region-map-cinematic.cjs
```

Expected: fail because the cinematic timeline module and renderer mode do not exist.

- [x] **Step 3: Implement the pure timeline and read-only renderer mode**

Create deterministic frames from input order, with a World opening frame, one country/region reveal frame per pin, and a World final frame. Use wall-clock elapsed time when a visibility change resumes the page. In the detailed renderer, filter pins/routes through the active frame, drive the existing viewport from the frame's view, omit breadcrumb/manual handlers/button semantics, and suppress route pulses for reduced motion. Make the lazy fallback read-only in cinematic mode as well, so a loading boundary cannot temporarily expose actions.

- [x] **Step 4: Run MAP6 plus MAP0–MAP5 renderer/view audits and observe GREEN**

Expected: the new contract passes and all existing toggle/drilldown behavior remains unchanged.

---

### Task 2: Commission Cut and Team Planning integration

**Files:**
- Modify: `components/studio-finance/components/build/WorldMap.tsx`
- Modify: `components/studio-finance/components/build/TeamPlanningCinematic.tsx`
- Modify: `components/studio-finance/components/cine/CommissionCut.tsx`
- Test: `scripts/audit-map6-read-only-cinematics.tsx`

**Interfaces:**
- Consumes: existing `BuildData`, `BuildDraft`, `BuildTeamProposal`, Commission Cut `City[]`, and existing cutscene beat duration.
- Produces: presentation-only `cinematic`/`cinematicDurationMs` props and committed-site route reveals.

- [x] **Step 1: Write the failing real-caller audit**

Render Team Planning map beats and Commission Cut's final map beat with real catalogue city ids. Assert both request cinematic mode, preserve exact city/facility ids, expose no interactive location buttons, and build routes only between supplied committed cities. Invoke any captured callbacks twice and assert no finance/draft mutation is possible through the map surface.

- [x] **Step 2: Run the real-caller audit and observe RED**

```bash
./node_modules/.bin/esbuild scripts/audit-map6-read-only-cinematics.tsx --bundle --platform=node --format=cjs --loader:.css=text --loader:.csv=text --outfile=/tmp/audit-map6-read-only-cinematics.cjs
node /tmp/audit-map6-read-only-cinematics.cjs
```

Expected: fail because the live callers still use ordinary production-map presentation.

- [x] **Step 3: Opt the existing callers into cinematic presentation**

Add a presentation-only cinematic option to Studio Finance `WorldMap`. Use it for Team Planning's map beats. Enrich Commission Cut pins from `getProductionLocation`, derive routes from the supplied committed city order, and render the final `WorldWake` in cinematic mode. Do not change `commissionBeats`, `Cutscene` completion, treasury settlement, proposal creation, or save state.

- [x] **Step 4: Run MAP6, Commission Cut, Team Planning, and Studio Finance audits and observe GREEN**

Expected: cinematic markup and existing completion/economy behavior both pass.

---

### Task 3: MAP7 label priority and collision closure

**Files:**
- Create: `views/lifestyle/business/components/regionMapLabels.ts`
- Modify: `views/lifestyle/business/components/InteractiveRegionMapV2.tsx`
- Modify: `views/lifestyle/business/components/interactiveRegionMap.css`
- Test: `scripts/audit-map7-region-map-closure.tsx`

**Interfaces:**
- Consumes: resolved visible pin ids, screen points, pin state/variant/selection, and current view level.
- Produces: `regionMapPinPriority(pin)` and `selectRegionMapPinLabelIds(candidates, level)`.

- [x] **Step 1: Write the failing collision/priority audit**

Assert active beats origin, origin beats built, built beats planned, planned beats recommended, and idle loses collisions. Assert separated labels remain, selected labels survive, geometry helpers reuse their module caches, the detailed atlas remains lazy, and production map sources contain no ZIP-demo player/count copy.

- [x] **Step 2: Run the MAP7 closure audit and observe RED**

```bash
./node_modules/.bin/esbuild scripts/audit-map7-region-map-closure.tsx --bundle --platform=node --format=cjs --external:esbuild --loader:.css=text --outfile=node_modules/.cache/audit-map7-region-map-closure.cjs
node node_modules/.cache/audit-map7-region-map-closure.cjs
```

Expected: fail because the shared label selector does not exist.

- [x] **Step 3: Implement presentation-only pin label selection**

Rank labels by state/role and retain only non-colliding labels at each view level. Keep every pin and hit target present; hide only lower-priority text labels. Preserve active/selected labels, existing country labels, minimum 24px mobile facility hit targets, and existing zoom bounds.

- [x] **Step 4: Run MAP7 and MAP0–MAP6 audits and observe GREEN**

Expected: collision behavior passes without callback, geometry, viewport, or cinematic regressions.

---

### Task 4: Final owner review and production certification

**Files:**
- Modify: `artifacts/map-v2/review.tsx`
- Modify: `artifacts/map-v2/review.html`
- Modify: `scripts/audit-map2-map3-browser.mjs`
- Update: `docs/superpowers/reports/2026-09-14-shared-map-map0-baseline.md`
- Create screenshots under: `artifacts/map-v2/map6-map7-after/`

**Interfaces:**
- Consumes: real Commission Cut/Team Planning cinematic presentation, MAP0–MAP5 review surfaces, browser reduced-motion emulation, and production bundle output.
- Produces: MAP6 cinematic and MAP7 closure tabs plus final technical evidence.

- [x] **Step 1: Add MAP6 and MAP7 owner-review tabs**

MAP6 replays a deterministic committed-site reveal using the real shared renderer. MAP7 shows simultaneous release, finance, and streaming maps plus a concise certification panel; it is not a new gameplay screen.

- [x] **Step 2: Extend browser verification**

At 393×600 and 393×852 assert MAP6 starts read-only, reveals only committed city ids/routes, finishes on the whole network, reduced motion lands immediately on the final frame, and simulated background/resume selects the elapsed frame. Assert MAP7 has no horizontal overflow, at least 24px facility targets, keyboard-safe migrated maps, collision-pruned labels, and no page errors with multiple maps mounted.

- [x] **Step 3: Run complete certification**

Run MAP0–MAP7 focused audits, existing Greenlight/Release/Studio Finance/Streaming/save/migration audits, `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit`, `npm run build`, the lazy-boundary audit, `git diff --check`, `npm run cap:sync`, and Android `assembleDebug`. Compare initial and lazy-map bundle sizes against MAP0 and resolve any startup regression.

- [x] **Step 4: Update the report and stop at the final owner gate**

Record exact results, bundle sizes, Android artifact, screenshot paths, known environmental warnings, and any unverified physical-device gesture item. Present MAP6 and MAP7 together. Do not declare the shared-map migration complete until the owner approves the real game presentation.
