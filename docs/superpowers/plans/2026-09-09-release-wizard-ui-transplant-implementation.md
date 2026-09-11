# Release Wizard UI Transplant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Actor Empire's current Release Wizard presentation with the complete `release-strategy.zip` visual flow while preserving every existing release calculation, state mutation, save, and backend service.

**Architecture:** Keep `views/lifestyle/business/ReleaseWizard.tsx` as the authoritative controller and completion boundary. Add a scoped `release-strategy-transplant` presentation package whose components receive narrow game-derived view models and return typed user actions; wire those components to the controller only after each presentation slice has passed its own RED/GREEN audit.

**Tech Stack:** React 19, TypeScript, CSS Modules, motion/react, existing Actor Empire release/rights/finance services, esbuild audit scripts, Playwright browser verification, Vite.

**Spec:** `docs/superpowers/specs/2026-09-09-release-wizard-ui-transplant-design.md`

## Global Constraints

- `release-strategy.zip` is a presentation reference only; never import its demo economy, static offers, 35-platform catalogue, forecast constants, festivals, or 54-week calendar.
- Actor Empire's current release controller, 52-week calendar, bidding services, rights contracts, campaign calculations, festival rules, finance mutations, draft persistence, energy costs, and completion callbacks remain authoritative.
- Preserve the supplied visual composition and interaction language across Distribution, Desk/War Room, Campaign, Festivals, Calendar, and Finalize.
- The effective progress rail always contains six steps; phase two is Desk for theatrical and War Room for streaming.
- The wizard must fit 320×740, 360×800, 393×852, 412×915, and 430×932 without horizontal overflow or unreachable actions.
- Keep all custom/project copy and state localized through the existing Actor Empire translation boundary when available.
- Preserve unrelated dirty work. Do not stage, commit, reset, or rewrite unrelated files.
- Follow strict RED/GREEN TDD. Every audit must fail for the intended missing behavior before its production implementation is added.

## File Structure

Create `views/lifestyle/business/release-strategy-transplant/` with these focused units:

- `model.ts`: presentation-only types and phase mapping.
- `adapter.ts`: pure conversion from controller/game values into presentation view models.
- `ReleaseStrategyShell.tsx`: masthead, progress rail, route hue, body, and safe-area layout.
- `FilmSheet.tsx`: supplied deterministic poster/one-sheet treatment.
- `Glyph.tsx`: supplied inline line icons.
- `DistributionStep.tsx`: cinema-marquee and streaming-row route choice.
- `TheatricalDeskStep.tsx`: region map, chain selection, split, and footprint summary.
- `StreamingWarRoomStep.tsx`: current session rendered through the supplied War Room composition.
- `CampaignStep.tsx`: position, timeline, forecast, music, channel allocation, and pool UI.
- `FestivalsStep.tsx`: festival laurels, timing, quality gates, and explicit skip.
- `CalendarStep.tsx`: 52-week grid, touch scrubbing, and rival face-off.
- `FinalizeStep.tsx`: one-sheet, decision chips, costs/value, and lock action.
- `ReleaseStrategy.module.css`: supplied CSS adapted only for scope, safe area, and game dimensions.
- `index.ts`: explicit presentation exports.

Create or update these verification surfaces:

- `scripts/audit-release-wizard-ui-model.ts`: pure phase/adapter contract audit.
- `scripts/fixtures/release-wizard-transplant.tsx`: real-component browser fixture using game-shaped data.
- `scripts/audit-release-wizard-transplant-browser.ts`: both-route and responsive browser audit.
- `package.json`: focused audit commands only.

Modify:

- `views/lifestyle/business/ReleaseWizard.tsx`: replace old JSX with the new presentation components while retaining controller state/effects and completion handlers.
- `views/lifestyle/business/components/StreamingBiddingRoom.tsx` and `styles/streaming-bidding-room.css`: remove only if no longer referenced after the new War Room is verified; otherwise retain as a compatibility wrapper without duplicate UI.
- Existing release UI source-grep audits: replace brittle old-markup expectations with behavioral assertions or retire them when the new browser audit covers the same behavior.

---

### Task 1: Lock the phase and adapter contracts

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Create: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Create: `scripts/audit-release-wizard-ui-model.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ReleaseWizardPhase`, `ReleaseWizardRoute`, `ReleaseFilmArt`, `ReleaseStepMeta`, `getReleaseWizardPhase(step, releaseType, isPostTheatricalBidding)`, `getReleaseWizardProgress(step, releaseType)`, `toReleaseWizardRoute(releaseType)`, and `buildReleaseFilmArt(project)`.
- Consumes: existing `ReleasePlanningDraft['releaseType']` and project name/type/genre fields.

- [x] **Step 1: Write the failing phase/adapter audit**

```ts
import assert from 'node:assert/strict';
import {
  buildReleaseFilmArt,
  getReleaseWizardPhase,
  getReleaseWizardProgress,
  toReleaseWizardRoute,
} from '../views/lifestyle/business/release-strategy-transplant/adapter';

assert.equal(toReleaseWizardRoute('STREAMING_ONLY'), 'STREAMING');
assert.equal(getReleaseWizardPhase(2, 'THEATRICAL', false), 'DESK');
assert.equal(getReleaseWizardPhase(2, 'STREAMING_ONLY', false), 'WAR');
assert.equal(getReleaseWizardPhase(2, 'STREAMING_ONLY', true), 'WAR');
assert.deepEqual(getReleaseWizardProgress(2, 'THEATRICAL').map(item => item.id),
  ['DISTRIBUTION', 'DESK', 'CAMPAIGN', 'FESTIVALS', 'CALENDAR', 'FINALIZE']);
assert.deepEqual(getReleaseWizardProgress(2, 'STREAMING_ONLY').map(item => item.id),
  ['DISTRIBUTION', 'WAR', 'CAMPAIGN', 'FESTIVALS', 'CALENDAR', 'FINALIZE']);
assert.deepEqual(buildReleaseFilmArt({ name: 'Glass City', projectDetails: { genre: 'THRILLER' } }), {
  title: 'Glass City', art: 'thriller', hue: 208, tagline: 'RELEASE READY',
});
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npx esbuild scripts/audit-release-wizard-ui-model.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-release-wizard-ui-model.mjs && node /tmp/audit-release-wizard-ui-model.mjs`

Expected: FAIL because `release-strategy-transplant/adapter` does not exist.

- [x] **Step 3: Add the minimal typed phase mapping and deterministic film-art adapter**

```ts
export type ReleaseWizardPhase = 'DISTRIBUTION' | 'WAR' | 'DESK' | 'CAMPAIGN' | 'FESTIVALS' | 'CALENDAR' | 'FINALIZE';
export type ReleaseWizardRoute = 'THEATRICAL' | 'STREAMING';
export interface ReleaseFilmArt { title: string; art: 'thriller' | 'drama' | 'horror' | 'romance' | 'scifi' | 'action'; hue: number; tagline: string }

export const getReleaseWizardPhase = (step: number, releaseType: 'THEATRICAL' | 'STREAMING_ONLY' | null, post = false): ReleaseWizardPhase => {
  if (post) return 'WAR';
  if (step <= 1) return 'DISTRIBUTION';
  if (step === 2) return releaseType === 'THEATRICAL' ? 'DESK' : 'WAR';
  return (['CAMPAIGN', 'FESTIVALS', 'CALENDAR', 'FINALIZE'] as const)[Math.min(3, step - 3)];
};
```

- [x] **Step 4: Register and rerun the focused audit for GREEN**

Add `audit:release-wizard-ui-model` to `package.json`, run it, and require `Release Wizard UI model audit passed.`

- [x] **Step 5: Review the task diff without staging**

Run: `git diff --check -- package.json views/lifestyle/business/release-strategy-transplant/model.ts views/lifestyle/business/release-strategy-transplant/adapter.ts scripts/audit-release-wizard-ui-model.ts`

### Task 2: Transplant the shell, one-sheet, and Distribution choice

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Create: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategyShell.tsx`
- Create: `views/lifestyle/business/release-strategy-transplant/FilmSheet.tsx`
- Create: `views/lifestyle/business/release-strategy-transplant/Glyph.tsx`
- Create: `views/lifestyle/business/release-strategy-transplant/DistributionStep.tsx`
- Create: `views/lifestyle/business/release-strategy-transplant/index.ts`
- Create: `scripts/fixtures/release-wizard-transplant.tsx`
- Create: `scripts/fixtures/release-wizard-transplant.html`
- Create: `scripts/audit-release-wizard-transplant-browser.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ReleaseFilmArt`, `ReleaseWizardPhase`, `ReleaseWizardRoute`, `ReleaseStepMeta` from Task 1.
- Produces: `ReleaseStrategyShell`, `DistributionStep`, `FilmSheet`, and `Glyph`.
- `DistributionStep` props: `{ film, selected, theatricalDisabled, streamingDisabled, theatricalNote?, streamingNote?, onSelect, onContinue }`.

- [x] **Step 1: Add a browser fixture and failing Distribution audit**

The fixture renders the real new shell and Distribution component at `/release-wizard-transplant.html`. The audit must assert:

```ts
await expectVisible(page, '[data-ui="release-strategy-transplant"]');
assert.equal(await page.getByRole('heading', { name: 'Distribution' }).count(), 1);
assert.equal(await page.getByRole('button', { name: /Theatrical/ }).count(), 1);
assert.equal(await page.getByRole('button', { name: /Streaming/ }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isDisabled(), true);
await page.getByRole('button', { name: /Theatrical/ }).click();
assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isEnabled(), true);
```

- [x] **Step 2: Compile and run the browser audit for RED**

Expected: FAIL because the fixture cannot import `ReleaseStrategyShell` and `DistributionStep`.

- [x] **Step 3: Port the supplied shell, one-sheet, glyphs, and Distribution markup**

Copy the visual structures from `flow.tsx`, `sheet.tsx`, `glyph.tsx`, `distribution.tsx`, and `Flow.module.css`. Remove demo state and static content imports. Add `data-ui="release-strategy-transplant"`, accessible button names, safe-area padding, and CSS-module scoping.

- [x] **Step 4: Run the Distribution browser audit for GREEN**

Run at 393×852 first. Require one progress rail, route selection, enabled continuation, no page errors, and no horizontal overflow.

- [x] **Step 5: Review the task diff without staging**

Run `git diff --check` for the Task 2 files.

### Task 3: Transplant the theatrical Distribution Desk

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx`
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`

**Interfaces:**
- Produces: `TheatricalDeskModel`, `TheatricalRegionModel`, `TheatricalChainModel`, and `TheatricalDeskStep`.
- `TheatricalDeskStep` returns region and chain IDs through `onToggleRegion`, `onToggleChain`, and `onAutoBuild`; it never calculates game finances.

- [x] **Step 1: Extend the browser audit with failing Desk behavior**

```ts
await chooseRoute(page, 'Theatrical');
await page.getByRole('button', { name: 'CONTINUE' }).click();
assert.equal(await page.getByText('WHERE IT OPENS').count(), 1);
await page.getByRole('button', { name: /North America/ }).click();
await page.getByRole('button', { name: /Nova Circuit/ }).click();
assert.match(await page.getByText(/screens/).first().textContent() || '', /[0-9,]+ screens/);
assert.equal(await page.getByRole('button', { name: 'CONTINUE' }).isEnabled(), true);
```

- [x] **Step 2: Verify RED because the Desk step is absent**

- [x] **Step 3: Implement the supplied map, expandable chain rows, split bar, forecast cells, and Auto-Build action**

Build all values in `adapter.ts` from `BOX_OFFICE_REGIONS`, `getCinemaChainsForRegion`, `getCinemaChainTerms`, current selections, and the controller's existing distribution summary. Do not port `REGIONS`, `PARTNERS`, or `footprintOf` from the archive.

- [x] **Step 4: Verify GREEN and run canonical distribution checks**

Run:

```bash
npm run audit:release-wizard-transplant-browser
npm run audit:release-distribution-desk
npm run audit:distribution-revenue
```

- [x] **Step 5: Review the task diff without staging**

### Task 4: Transplant the streaming War Room on the real bidding session

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx`
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`

**Interfaces:**
- Consumes: `StreamingBiddingSession`, `StreamingOfferVersion`, current energy eligibility, rights scope, and controller callbacks.
- Produces: `StreamingWarRoomStep` with `{ session, canStart, canAccept, energyCost, preflightMessage, onStart, onSessionChange, onAccept, onLeave, onBack }`.

- [x] **Step 1: Add the failing real-session War Room audit**

Build a deterministic game-shaped `StreamingBiddingSession`, render it through the fixture, and assert the room uses its real offer values:

```ts
assert.equal(await page.getByText('$120M', { exact: true }).count(), 1);
assert.equal(await page.getByText('18%', { exact: true }).count(), 1);
assert.equal(await page.getByText('104 weeks', { exact: true }).count(), 1);
await page.getByRole('button', { name: /Accept terms/ }).click();
assert.deepEqual(await page.evaluate(() => window.__releaseFixture.acceptedOfferIds), ['offer-netflix-r2']);
```

- [x] **Step 2: Verify RED because the supplied War Room composition is absent**

- [x] **Step 3: Port the War Room presentation around the existing session contract**

Use `advanceStreamingBiddingSession` for the existing one-second room progression and `getStreamingBiddingClosingOffers` for standing contracts. Render real platform states, events, terms, rights scope, funding, localization, and package rows. Do not port `platforms.ts`, `attendanceFor`, `offerFor`, or the archive's timers/economics.

- [x] **Step 4: Verify GREEN and run bidding/contract checks**

Run:

```bash
npm run audit:release-wizard-transplant-browser
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-contract-state
```

- [x] **Step 5: Review the task diff without staging**

### Task 5: Transplant Campaign with real forecasts and allocations

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx`
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`

**Interfaces:**
- Produces: `CampaignStepModel`, `CampaignPositionModel`, `CampaignTimelineModel`, `CampaignChannelModel`, and `CampaignStep`.
- Callbacks use existing `CampaignPositioning`, `CampaignTimeline`, `MarketingChannelId`, and absolute allocation values.

- [x] **Step 1: Add failing Campaign assertions with hand-derived fixture values**

```ts
assert.equal(await page.getByText('$141M–$221M', { exact: true }).count(), 1);
assert.equal(await page.getByText('$88.1M AVAILABLE', { exact: true }).count(), 1);
await page.getByRole('button', { name: 'Increase Trailer Launch' }).click({ clickCount: 3 });
assert.equal(await page.getByTestId('channel-TRAILER_LAUNCH-value').textContent(), '$26.4M');
assert.equal(await page.getByTestId('campaign-remaining').textContent(), '$61.7M');
```

- [x] **Step 2: Verify RED because the campaign filmstrip/forecast/channel UI is absent**

- [x] **Step 3: Port the campaign rail, meaning card, filmstrip, dial, forecast, soundtrack, channels, and pool meter**

Populate the view model from existing options and calculated controller values. Use a ref-backed allocation callback or functional update so rapid taps cannot lose increments. Do not import prototype `FORECAST`, `SOUNDTRACK`, `CAMPAIGN_POOL`, or `CAMPAIGN_STEP`.

- [x] **Step 4: Verify GREEN and run marketing checks**

Run:

```bash
npm run audit:release-wizard-transplant-browser
npm run audit:marketing-strategy
npm run audit:marketing-channel-allocation
npm run audit:marketing-forecast
npm run audit:marketing-timeline
```

- [x] **Step 5: Review the task diff without staging**

### Task 6: Transplant Festivals and the 52-week Calendar

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/FestivalsStep.tsx`
- Create: `views/lifestyle/business/release-strategy-transplant/CalendarStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx`
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`

**Interfaces:**
- Produces: `FestivalStepModel`, `FestivalOptionModel`, `ReleaseCalendarModel`, `ReleaseCalendarSlotModel`, `FestivalsStep`, and `CalendarStep`.
- Festival callbacks return a festival ID or `null`; calendar callbacks return the existing game week/absolute-week selection.

- [x] **Step 1: Add failing festival and year-boundary assertions**

```ts
assert.equal(await page.getByRole('button', { name: /Cannes/ }).isDisabled(), false);
assert.equal(await page.getByRole('button', { name: /Sundance/ }).isDisabled(), true);
await page.getByRole('button', { name: 'Skip Festivals' }).click();
await page.getByRole('button', { name: 'CONTINUE' }).click();
await page.getByRole('button', { name: 'Week 2 next year' }).click();
assert.equal(await page.getByText('NEXT YEAR', { exact: true }).count(), 1);
assert.equal(await page.getByText('YOUR DATE', { exact: true }).count(), 1);
```

- [x] **Step 2: Verify RED because the laurel circuit and 52-week grid are absent**

- [x] **Step 3: Implement festival laurels and quality gates from real festival data**

Use current localized festival labels, price, quality, timing, and affordability. Explicitly represent `null` as Skip Festivals.

- [x] **Step 4: Implement the calendar using 52-week absolute dates and canonical rivals**

Use the current eight valid release offsets, `getAbsoluteWeek`, `CALENDAR_EVENTS`, and `getCanonicalScheduledRivals`. Port the pointer-coordinate scrub behavior, but derive cells from 52 weeks and preserve the controller's existing `releaseWeek` representation.

- [x] **Step 5: Verify GREEN and the cross-year mutation check**

Mutate the adapter locally to use 54 weeks and confirm the test fails, then restore 52 and rerun the browser audit.

- [x] **Step 6: Review the task diff without staging**

### Task 7: Transplant Finalize and wire the real controller

**Files:**
- Create: `views/lifestyle/business/release-strategy-transplant/FinalizeStep.tsx`
- Modify: `views/lifestyle/business/release-strategy-transplant/model.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/adapter.ts`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css`
- Modify: `views/lifestyle/business/release-strategy-transplant/index.ts`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `scripts/audit-release-wizard-ui-model.ts`
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`

**Interfaces:**
- Produces: `FinalizeStepModel` and `FinalizeStep`.
- Consumes: the controller's existing `handleComplete`, `handleBack`, `nextStep`, `prevStep`, bidding callbacks, draft state, energy/cash eligibility, distribution summary, campaign forecast, and all selected IDs.

- [x] **Step 1: Add a failing controller integration audit**

The audit renders the real `ReleaseWizard` with an awaiting-release commitment and proves the old surface is still active before wiring:

```ts
assert.equal(await page.locator('[data-ui="release-strategy-transplant"]').count(), 1);
assert.equal(await page.getByText('CHEAT STUDIO MOVIE (RELEASE READY)').count(), 1);
await completeTheatricalJourney(page);
const state = await page.evaluate(() => window.__releaseFixture.player);
assert.equal(state.commitments[0].projectDetails.releaseStrategy, 'THEATRICAL');
assert.equal(state.commitments[0].projectDetails.releasePlanningDraft, undefined);
const completeCount = await page.evaluate(() => window.__releaseFixture.completeCount);
assert.equal(completeCount, 1);
```

- [x] **Step 2: Verify RED against the existing Release Wizard JSX**

- [x] **Step 3: Build the final receipt solely from controller-derived values**

Port the supplied one-sheet, laurel, route/partner mark, chips, spend/value blocks, and lock button. Expose `disabled` and its real reason; call `onLock` once.

- [x] **Step 4: Replace only the old render tree in `ReleaseWizard.tsx`**

Retain all state declarations, effects, memoized calculations, bidding callbacks, `handleComplete`, draft persistence, and back behavior. Use the phase adapter to render one new step. Do not move finance, rights, investor, or release mutation logic into presentation files.

- [x] **Step 5: Verify GREEN for theatrical and streaming controller journeys**

The test must assert one completion, one energy charge, one release/contract outcome, and a cleared draft. Repeat the final click during the pending transition and assert no duplicate side effect.

- [x] **Step 6: Verify draft restoration and post-theatrical entry**

Load fixtures with saved steps 2–6 and assert the correct phase and selections. Load `isPostTheatricalBidding` and assert direct War Room entry plus the current exit behavior.

- [x] **Step 7: Review the task diff without staging**

### Task 8: Replace brittle legacy UI audits and remove duplicate presentation

**Files:**
- Modify or remove: `scripts/audit-release-campaign-compact-controls.mjs`
- Modify or remove: `scripts/audit-release-channel-row-symmetry.mjs`
- Modify or remove: `scripts/audit-release-channel-mix-ui.mjs`
- Modify or remove: `scripts/audit-release-minimal-channel-controls.mjs`
- Modify or remove: `scripts/audit-release-forecast-panel.mjs`
- Modify or remove: `scripts/audit-release-forecast-gauge.mjs`
- Modify or remove: `scripts/audit-release-campaign-timeline.mjs`
- Modify or remove: `scripts/audit-release-distribution-desk.mjs`
- Modify if unreferenced: `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- Modify if unreferenced: `styles/streaming-bidding-room.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: the real interactive/browser audit from Tasks 2–7.
- Produces: focused audit commands that fail on broken user behavior rather than renamed CSS strings.

- [x] **Step 1: Run every listed legacy UI audit and classify each assertion**

Keep assertions that test business outputs. Replace source-text/layout selectors already covered by the new interactive audit. Do not delete a behavior check merely because markup changed.

- [x] **Step 2: Add missing behavior assertions to the new audit before removing any old assertion**

For each removal, name the break it caught and point to the new browser/controller assertion that catches the same break.

- [x] **Step 3: Remove duplicate old presentation only after `rg` proves it has no imports**

Run:

```bash
rg -n "StreamingBiddingRoom|streaming-bidding-room.css" views components styles scripts
```

If a compatibility consumer remains, keep a thin re-export/wrapper. Do not remove a live surface.

- [x] **Step 4: Run the updated focused audit set for GREEN**

- [x] **Step 5: Review the task diff without staging**

### Task 9: Full responsive and regression verification

**Files:**
- Modify: `scripts/audit-release-wizard-transplant-browser.ts`
- Modify: `package.json`
- Capture: `/tmp/actor-empire-release-wizard-<route>-<phase>-393x852.png`

**Interfaces:**
- Consumes: the completed real Release Wizard and Awaiting Release Wizard QA entry.
- Produces: repeatable proof for both routes and all target dimensions.

- [x] **Step 1: Extend the browser audit to all five viewport sizes**

For 320×740, 360×800, 393×852, 412×915, and 430×932, assert:

```ts
assert.equal(document.documentElement.scrollWidth, document.documentElement.clientWidth);
assert.ok(rootRect.left <= 0.5 && rootRect.right >= viewportWidth - 0.5);
assert.equal(progressSegments.length, 6);
assert.ok(primaryActionRect.bottom <= navigationTop);
assert.deepEqual(pageErrors, []);
```

- [x] **Step 2: Complete the theatrical route at every viewport**

Check Distribution, Desk, Campaign, Festivals, Calendar, Finalize, and completion. Capture every phase at 393×852.

- [x] **Step 3: Complete the streaming route at every viewport**

Check Distribution, War Room, Campaign, Festivals, Calendar, Finalize, accepted contract, and completion. Capture every phase at 393×852.

- [x] **Step 4: Run the targeted release regression suite**

```bash
npm run audit:release-wizard-ui-model
npm run audit:release-wizard-transplant-browser
npm run audit:awaiting-release-cheat
npm run audit:release-distribution-desk
npm run audit:distribution-revenue
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-contract-state
npm run audit:marketing-strategy
npm run audit:marketing-channel-allocation
npm run audit:marketing-forecast
npm run audit:marketing-timeline
npm run audit:release-reality-surfaces
```

If `audit:awaiting-release-cheat` is not yet registered in `package.json`, run its documented esbuild command directly rather than silently skipping it.

- [x] **Step 5: Run project verification**

Run `npm run lint` and require exit 0. Run `npm run build` and require exit 0; existing chunk-size warnings may remain but new compile/runtime errors are not acceptable.

- [x] **Step 6: Inspect every 393×852 phase screenshot**

Compare against the supplied running reference for composition, type hierarchy, color, spacing, metaphor, and control reachability. Fix discrepancies before reporting completion.

- [x] **Step 7: Verify the live server and leave the real wizard open for review**

Confirm the process serving `http://127.0.0.1:5178/` has cwd `/Users/zeesh/Vibe code/Actor empire`, load the Awaiting Release Wizard through the real QA route, and leave the Distribution phase open in the user's in-app browser.

- [x] **Step 8: Final task-scoped diff review**

Run `git diff --check` on every file in this plan and review `git status --short`. Report that no commit was created and distinguish transplant changes from unrelated dirty work.
