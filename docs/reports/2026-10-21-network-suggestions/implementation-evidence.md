# Task 1 — Network Suggestions implementation report

Commit: `1ce8aef` — `feat(streaming): suggest selected-market networks within player limits` (six task-owned files; controller spec/plan left untracked).

Status: DONE_WITH_CONCERNS pending controller TypeScript/build/browser verification and two known baseline SSR audit failures.

## Implementation

- Added `networkSuggestions.ts`: asynchronous bounded planner, exact USD parser, typed request/proposal, canonical evidence derivation, hard budget/treasury/deferred-commitment enforcement, selected-country scoped placement, preserved estate, issued-proposal integrity/cancellation guard, fresh current-input apply validation.
- Added `NetworkSuggestionSheet.tsx`: local blank budget fields, Balanced/Fill gaps defaults, Budget/Balanced/Premium targets 1/1.2/1.5, explicit Generate and Cancel, exact quote/deltas/build-time/country readings/site mix/shortfall warnings, one Apply patch, and existing AccessibleDialog focus/Escape/restore semantics.
- Added compact RegionBoard entry between map and footprint note. No search runs on open/render/typing/manual region editing. Applying patches facilities and rehearsal:null once; existing Build autosave/commission handlers remain authoritative.
- Added scoped styles and retained the existing authorized server label alignment hunk. Self-review fixed specificity against `.sf button` for entry and primary action.
- Added focused behavioral audit and one memory-only fixture helper capturing the actual CAREER adapter through SSR interception. The helper is never imported by production.
- No placer/shared service, save schema, rights, money transaction, commissioning, manual-region semantics, browser, user's save, server, or GitHub changes.

## Final typed API

`NetworkSuggestionMode = 'BUDGET' | 'BALANCED' | 'PREMIUM'`.

`NetworkSuggestionRequest = { mode, upfrontLimit:number, weeklyLimit:number, replaceUnbuilt:boolean }`.

`createNetworkSuggestion(data:BuildData, draft:BuildDraft, request, control?:{signal?:AbortSignal,onProgress?:({evaluated,maximum})=>void}) : Promise<NetworkSuggestionResult>`.

Result discriminator: `status:'READY'` with proposal, `status:'INVALID'` with message, or `status:'CANCELLED'`.

Proposal fields: `draft, request, inputIdentity, totals, money, quote?, services, upfront, weekly, upfrontDelta, weeklyDelta, targetMultiplier, targetCapacity, fullCoverage, launchThresholdMet, complete, capacityTargetMet, warnings, evaluatedCandidates`.

`validateNetworkSuggestion(data,currentDraft,currentRequest,proposal)` returns `{ok:true,patch:{facilities,rehearsal:null}}` or `{ok:false,message}`. Only issued, unmodified, uncancelled ephemeral proposals are accepted; generated proposals are intentionally not a persistent schema. Current data/draft/request identity and fresh canonical quote/coverage must still match. Signal cancellation also invalidates a completed unapplied proposal.

`parseNetworkLimit(text)` returns a safe nonnegative whole number or null. Does not round, clamp, parse exponent notation, or fill blanks.

Sheet props: `{data,draft,onApply:(patch)=>void,onClose:()=>void}`.

Fixture: `captureNetworkBuildData(player,countryCodes?,selectionOverride?) -> {data,draft}` captures actual CAREER StreamingBuildWizardExperience BuildWizard props. It is an isolated fixture using current player catalogue/demand and adapter authority; not a production hook.

## Algorithm and boundaries

Prepare one placement-only scoped BuildData with selected countries/cities; keep the original canonical bridge for all candidate quotes and service evidence. `placeRegion` therefore cannot buy geography in unopened countries (US+IN excludes China), while manual placeRegion behavior remains unchanged. Retain original rooms in Fill gaps; replacement retains built rooms and every data.existing facility, including outside the opening footprint.

Compare eight practical sizes (1/2/4/8/16/32/64/128) across nine alternatives: three server tiers, three cloud providers, Workhorse+Atlas, Titan+Meridian, and a Scout/Workhorse/Titan mix. At most 72 candidates per region / 432 for six regions; yield a task boundary after each candidate and check AbortSignal. Canonical coverage and regional headroom determine improvements. Complete regional plans compare upfront + 26-week operation (52 weeks for Budget); Premium prefers up to two sites before cost comparison when feasible. All retained estate is included in weekly totals. Exact limits and current treasury including deferred commitments reject candidates.

This is a greedy bounded practical comparison, not a global optimum or exhaustive search. Large demand or physically unservable countries can remain partial. No minimum-cost claim is made. Full service coverage and the unchanged canonical geographic launch threshold are separate. Per-region headroom prevents a large unrelated regional installation from substituting for another region's capacity target.

## TDD evidence

Initial RED, before either product file existed:

```
./node_modules/.bin/esbuild scripts/audit-streaming-network-suggestions.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/audit-streaming-network-suggestions.cjs
```

Expected failure: `Could not resolve ../components/studio-finance/finance/networkSuggestions` and `.../NetworkSuggestionSheet` (2 errors).

Additional real RED cases before hardening:
- `Bounded alternatives include fresh mixed server/cloud candidates` failed with false (single-region CAREER evidence observed only pure alternatives); passed after bounded mixed candidates were added.
- `Cancellation invalidates even a completed unapplied result` failed true !== false; passed after issued-proposal AbortSignal validation.

Final GREEN:

```
./node_modules/.bin/esbuild scripts/audit-streaming-network-suggestions.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/audit-streaming-network-suggestions.cjs
node /tmp/audit-streaming-network-suggestions.cjs --scale
```

Output (`/tmp/network-worker-focused-final.log`):

```
US+IN generation=270.6ms validation=2.7ms candidates=144
Canonical 5000 titles / 2 markets: generation=290.7ms apply=4.2ms longest work slice=4.5ms candidates=144
Canonical 5000 titles / 197 markets: generation=1593.3ms apply=6.6ms longest work slice=9.5ms candidates=432
Network suggestions: planner, hard limits, current-input apply, preservation, cancellation, deterministic output and sheet render PASS
```

Coverage: whole/blank/finite/fractional/negative/unsafe budgets; explicit markets; career bridge absence; US+IN/no-CN placement; physical fits; fresh service parity; stale funds/markets/draft/mode/limits refusal; deterministic outputs and unchanged input; tiny-budget partial; no facilities; research-locked facilities; India residency with only China listings; Northwind unavailable in Brazil; deferred funds; Budget/Premium target and cap checks; Fill gaps retaining every room; repeated generation beside previous suggestions; replacement retaining built rooms outside footprint and data.existing; cancellation during work and after completion; real sheet static render; canonical fresh single-region hybrid evidence; actual proposal->validation->adapter->saveStreamingInfrastructureDraft->JSON normalization->adapter reopen with exact quote totals/services and unchanged money/rights/source player.

## Existing checks

- `npm run audit:streaming-build-lab-career-parity` — PASS: `Streaming Build lab/career canonical parity audit passed.`
- `npm run audit:streaming-build-test-autosave-gates` — PASS: `Streaming Build Test, autosave, and launch-gate audit passed.`
- `npm run audit:streaming-infrastructure-phase5` — PASS: `EMPIRE+ Phase 5 infrastructure and subscription setup audit passed.`
- `npm run audit:streaming-region-placer` — same controller-confirmed pre-feature baseline failure: `The page opens empty: nothing is drafted for you.` It expects expanded-row copy while the existing initial board is collapsed/world-first. Assertions preserved.
- `npm run audit:streaming-build-pricing-interaction` — same controller-confirmed pre-feature baseline failure: `server comparison must explain its capability as concurrent viewing capacity`. Same expanded-row SSR mismatch. Assertions preserved.
- `git diff --check` — PASS.
- A worker broad `tsc --noEmit` attempt hit default Node ~4GB heap OOM before diagnostics. Reported immediately to controller; controller owns independent final TypeScript check with appropriate heap and production build. No warning suppression or dependency changes.

Esbuild emits its informational bundled-size warning (9.1MB audit bundle) and an extra CSS output due existing CSS module imports. Audit assertions/output otherwise clean.

## Performance evidence and remaining verification

The controller's frozen `/tmp/network-suggestion-5000-player.json` is 34,904,173 bytes; SHA256 `055c5fdb458d826038cee70b29292017e9003b3d0c128bcda885867cc045269e`. It contains 52 normal acquisitions plus 4,948 distinct synthetic released titles with explicit canonical grants, 5,000 available titles and 197 filed markets. Not 5,000 manual purchases and not the earlier day's pinned fixture. Read only; no production/career data was changed.

CPU times above isolate planner generation and final apply validation after actual CAREER Build capture. The controller separately measured 5k Build capture around 316ms for two markets and 2,284ms global. These are headless CPU measurements, not browser tap-to-paint promises. Search maximum is deterministic and cancellation checks run between candidates; no artificial acceptance delay.

Controller still owns actual disposable browser interaction/focus/Escape, 320/393px layout checks, current career read-only inspection, final TypeScript/build, reviews and local 5174 handoff. Worker did not run browser tests or manipulate tabs/servers.

## Fix round 1 — explicit validation discriminator

Review finding P2 / FIX_BASE `1ce8aef`: under the repository TypeScript configuration, `if (!result.ok)` did not narrow the discriminated validation union before `result.message`. Root RED evidence: `/tmp/network-suggestions-types.log` reported `NetworkSuggestionSheet.tsx(68,41): error TS2339: Property 'message' does not exist on type 'NetworkSuggestionValidation'`.

Changed the single condition to `result.ok === false`. Behavior/design remain unchanged. No browser, server, save or user-tab actions.

Covering audit commands:

```
./node_modules/.bin/esbuild scripts/audit-streaming-network-suggestions.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/audit-streaming-network-suggestions.cjs
node /tmp/audit-streaming-network-suggestions.cjs --scale
```

Exit 0; `/tmp/network-suggestions-fix1-audit.log`:

```
US+IN generation=312.5ms validation=4.8ms candidates=144
Canonical 5000 titles / 2 markets: generation=456.1ms apply=4.6ms longest work slice=7.6ms candidates=144
Canonical 5000 titles / 197 markets: generation=1946.3ms apply=17.7ms longest work slice=22.0ms candidates=432
Network suggestions: planner, hard limits, current-input apply, preservation, cancellation, deterministic output and sheet render PASS
```

These samples ran concurrently with the 8GB TypeScript check; use the prior isolated performance evidence for planner characterization. Existing esbuild audit-bundle size notice remains disclosed, unchanged.

TypeScript command: `NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit --pretty false` (log `/tmp/network-suggestions-fix1-types.log`).

TypeScript result: exit 0, no diagnostics (0-byte log). `git diff --check` also passed. No broader suite/build rerun in this fix round, per controller ownership.

Fix commit: `e88e984` — `fix(streaming): narrow network suggestion validation explicitly`. Fix-round status: DONE; blocking TypeScript finding resolved. Prior unchanged baseline SSR failures remain documented above.
