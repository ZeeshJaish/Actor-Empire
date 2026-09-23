# Streaming Launch S5 Implementation Plan

> **For agentic workers:** Execute inline in this user-owned worktree. The user approved the S5 design in the stabilization roadmap and requested inline execution; do not dispatch subagents, create a worktree, commit, or push. Use test-driven development and verification before completion.

**Goal:** Make the four Build stages usable and legible on a short phone, make repeated machine increments responsive, and connect listed streaming titles to canonical poster artwork.

**Architecture:** Keep `BuildData`, `BuildDraft`, `placeRegion`, quote, gates, and commissioning untouched. Change presentation in the Build shell and stages, calculate costly optional comparisons only when disclosed, and render title art through a shared custom-poster/production-fallback adapter. Preserve the image-rich Storefront preview.

**Tech Stack:** React/TypeScript, CSS, Vite lab fixture, esbuild audits, local browser.

**Spec:** `docs/superpowers/plans/2026-09-23-streaming-launch-stabilization-roadmap.md`, Phase S5, approved by the user before this plan.

## Global constraints

- No new charge, save field, offer, server capacity, placement rule, or commissioning gate.
- The map and regional summary remain before the controls; the long country list moves behind an accessible disclosure after them.
- All provider, room, and cost details remain available by keyboard and screen reader.
- Use existing streaming visual tokens: ink `#0a1622`, red brand `#ff3038`, warm equipment gold `#e9a644`, mint cloud `#56d3a1`, white text `#f4f6f8`; retain Anton display, Archivo body, and the game's tabular number face. The one new signature is a small fictional hardware/provider crest, not generic floating cards.
- Compare the same lab state and viewport before/after increment work. Browser timings are lab observations, not field INP or device proof.

---

### Task 1: Baseline and test harness

**Files:** `scripts/audit-streaming-launch-s5-ui.tsx` (create), `scripts/audit-streaming-launch-s5-performance.ts` (create), `package.json` (script entry), `lab/lab.tsx` only if a visible test hook is needed.

**Interfaces:** Tests render the real `RegionBoard`, `StageMoney`, and `StageLaunch` with real lab data; the performance probe times an increment-sized `placeRegion` plus Build derived reads. No production API is changed.

- [ ] Capture baseline at 393×600, 393×852, and desktop in `lab.html`, including empty, one-region, 23-country, and many-room states. Record horizontal overflow, clipping, sticky overlap, and console errors.
- [x] Write the S5 UI audit to fail on a long country list appearing before server controls, missing provider comparison and hardware marks, always-open agreement rooms, and listed titles without the shared poster adapter.
- [x] Run it red and retain the exact expected failures. Record repeated server-increment timings in the existing lab state; report median and range rather than a lone number.

### Task 2: Network controls and measured responsiveness

**Files:** `components/studio-finance/components/build/RegionBoard.tsx`, `components/studio-finance/components/build/BuildMachineMarks.tsx` (create), `components/studio-finance/styles/network.css`, `scripts/audit-streaming-launch-s5-ui.tsx`, `scripts/audit-streaming-region-placer.tsx` if an old assertion assumes eager optional comparisons.

**Interfaces:** `RegionBoard` still calls `placeRegion(data, draft, regionId, setup)` through its one write path. The optional alternatives panel alone invokes `coverWithCloud` and `whatIfsFor`; visible provider cards show coverage, ceiling, unit rate, and their fixed trade-off. `BuildMachineMarks` accepts a server tier or cloud provider ID and returns an accessible-hidden vector mark.

- [x] Observe the audit red for country ordering and marks; preserve the old real placement and quote tests.
- [x] Move `Who you are serving` below server/cloud controls into a native `<details>` with count and served summary. Keep the regional served bar and blocked-market warning above.
- [x] Replace shape dots with distinctive fictional SVG/TSX marks. Show all three provider differences in concise, wrapping cards and disclose detailed computed alternatives separately.
- [x] Run the audit green; remeasure repeated server increments in the same lab fixture, then rerun the placer and Build audits.

### Task 3: Build shell and money/agreement scanability

**Files:** `components/studio-finance/components/build/BuildWizard.tsx`, `components/studio-finance/components/build/StageMoney.tsx`, `components/studio-finance/components/build/StageLaunch.tsx`, `components/studio-finance/styles/build.css`, `components/studio-finance/styles/network.css`, `scripts/audit-streaming-launch-s5-ui.tsx`.

**Interfaces:** Stage-specific strip labels remain derived from `bar` in `BuildWizard`; no new money calculation. Money retains all canonical region and room amounts. Agreement provider groups become `<details>` whose summary displays room count, rack count, and group amount; the room schedule is the disclosure body.

- [x] Observe audit red for the uncollapsed agreement rooms; use live responsive checks for header/strip and Money density.
- [x] Give the Build header a two-line-safe layout at narrow widths; make the strip's measure explicit per stage and ensure sticky bars do not cover final controls.
- [x] Put Money's region answer first and detailed rental comparison behind disclosure; preserve the complete bill and every-room breakdown.
- [x] Convert agreement provider groups to keyboard-native disclosures with full room rows; run the UI audit and financial/commissioning audits green.

### Task 4: Canonical title artwork

**Files:** `components/studio-finance/components/StreamingTitleArt.tsx` (create), `components/studio-finance/components/launch/StepCatalogue.tsx`, `components/studio-finance/components/launch/StepBlueprint.tsx`, `components/StreamingDefineLaunchExperience.tsx`, `components/StreamingOpeningCatalogueDesk.tsx`, `components/StreamingContentMarket.tsx`, relevant CSS, `scripts/audit-streaming-launch-s5-ui.tsx`.

**Interfaces:** `StreamingTitleArt` accepts stable ID, title, genre, optional `CustomPoster`, and size. It renders `CustomPosterImage` when real art exists, otherwise the existing `content-market-exact/Poster` one-sheet. The same title keeps the same art across catalogue/listed cards and save reload. Storefront mockups stay image-rich.

- [x] Add a failing title identity/art test for real poster precedence and deterministic fallback.
- [x] Inventory and convert listed-title surfaces, leaving abstract cinematic/mockup art alone. Wire owned/custom poster records into Define Launch's catalogue anchors.
- [ ] Run title UI tests and current content/launch audits green. Verify one custom and one fallback title visually. (Audits passed; a real saved-career custom image was not available for visual confirmation.)

### Task 5: Whole-phase gate and report

**Files:** `docs/superpowers/reports/2026-09-23-streaming-launch-s5.md` (create).

- [ ] Repeat 393×600/852 and desktop checks for empty, partial, 23-country, many-room, blocked, and commissioned states. Check keyboard disclosure, no overflow/clipping/overlap, and unchanged financial lines. (Lab empty, 1/23 market, and many-room states checked; full career and commissioned UI remain S6.)
- [x] Rerun the same increment measurements and report baseline versus after with conditions/uncertainty. Run focused Build, launch, financial, save, pricing, TypeScript, production build, and scoped `git diff --check`.
- [x] Record every failure (new versus inherited), remaining visual limitations, and the S6 handoff. Do not commit or push.
