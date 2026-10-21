# Streaming checkpoint — 21 October 2026

This checkpoint preserves the accumulated streaming implementation on `codex/streaming-tap-lag`, including the 17 commits after the previously pushed `d9887b1` checkpoint and the current Build, rehearsal, capacity and developer-shortcut changes. It does not implement the proposed post-launch Operations integration. That work awaits the user's decision.

## Implemented so far

### Catalogue, negotiation and auction results

- Added indexed/batched catalogue reads and compatible forecast/coverage reuse for large libraries. The full catalogue remains available; ownership is not reduced to a small display subset.
- Collection private offers now use delayed replies, counters and atomic signing with frozen package membership and fresh canonical seller/rights validation. Historical world/career sources are supported. Stale, fabricated, reserved or incompatible sources fail without partial charges or ownership.
- Replaced fixed $250K-only private-offer editing with exact whole-dollar amounts, supported term controls and clause explanations. New Marketing controls are removed; existing signed legacy obligations remain enforceable. Individual and collection limits are explicit. Live-auction increment rules still apply.
- Acquisition/no-sale outcomes show the poster, title, outcome and compact terms with a subtle colour bloom. Removed misleading empty badges and stale offer feedback. Continuation uses a small hint after presentation; existing hold/skip behaviour remains.
- Auction clock updates no longer rebuild the complete catalogue. Terminal rooms stop scheduling. Equivalent draft saves no longer create autosave loops, and bounded presentation comparison cursors preserve stable reads while transaction actions still validate current authority.
- Permanent outgoing transfer/sublicensing retains the full canonical perpetual grant, inherited clauses and exactly-once settlement.

Detailed transaction and historical performance evidence: [20 October report](../superpowers/reports/2026-10-20-streaming-offers-performance.md).

### Network suggestions and Build controls

- Suggest network now follows the existing Build spacing, fonts and platform theme.
- Setup budget spans the current treasury with a curved slider and exact whole-dollar input. The UI asks for setup budget and Budget/Balanced/Premium target; weekly running cost is shown as a result. Canonical affordability still reserves unpaid commitments.
- Generation has a darkened comparison dialog, real progress, cancellation and reduced-motion support. Budget movement does not run the search, and no artificial waiting timer was added.
- Results show a compact, aligned coverage summary, setup/running costs and build time. Six region tiles and bounded country details replace an always-expanded 197-country list.
- Use this plan remains actionable after equivalent immutable save refreshes. Genuine money, market, rights-derived availability, request or draft changes still invalidate proposals. Applying updates the drawing only; purchases remain part of commissioning.
- The planner searches bounded candidate combinations. A partial suggestion is possible even with a high budget; global geographic coverage and mathematical optimality are not guaranteed or falsely approved.

See [setup-only flow](2026-10-21-network-suggestions/setup-only-flow/README.md) and [summary polish](2026-10-21-network-suggestions/summary-polish/README.md). Earlier UI-correction screenshots document intermediate versions; their weekly-input/old slider limits are superseded.

### Marketing, delivery and rehearsal

- Marketing uses a treasury-scaled slider plus exact USD input; Lean/Balanced/Heavy/Event is derived from the amount. Drag changes stay local until release. Timing, market allocation, pricing and audience forecasts remain connected.
- Network/Test and rehearsal reuse compatible route evidence. Geographic reach applies to routed demand; global spare compute cannot conceal a missing local delivery route. Startup time and route latency have separate meanings.
- One phase-aware viewer monitor shows the selected country. Partial delivery loss is degraded playback, a missing route is unavailable, and healthy protected-burst playback can remain playing. Duplicate viewer and repeated failure lists were removed.
- Region summaries use 14 equal visual segments with severity proportions and exact country counts. Nonzero severe states remain visible; tiny failed-audience shares do not falsely display as zero.
- Rehearsal capacity wording now states viewers watching, capacity used and spare capacity; the invisible off-chart capacity-line legend is removed. Viewer facts and optional delivery detail are separated.
- Repair actions target the affected region/country or actual limiting resource. Test/return preserves map selection; explicit repair navigation focuses the target.
- Commissioning Schedule A starts with six regional groups, then provider/site details. Canonical contracted room resources drive readiness; valid equality and expanded cloud contracts no longer produce false physical blockers. Real constraints still block.
- Large infrastructure signatures fingerprint the complete configuration before hitting the save-length limit. Existing valid short signatures remain compatible. Real topology edits invalidate evidence, including changes near the tail of a large network; old truncated evidence needs a fresh rehearsal.

See [Build flow report](2026-10-21-build-flow-polish/README.md) and [status polish](2026-10-21-build-status-polish/README.md).

### Final accepted Capacity presentation

The Facility Map/site-tile iteration was removed following user feedback. The final panel uses already-computed demand and capacity totals, with no added forecast/save calls:

- Solid fill represents expected demand; hatching represents unused regular capacity.
- Green below 80% regular utilisation; amber from 80% and during supported burst use; red when demand exceeds regular plus burst, with the actual shortfall.
- Regular headroom and extra burst reserve are separate. Zero/tiny-capacity cases have valid dimensions and honest labels. Regional delivery gaps remain visible separately.

See [final capacity meter](2026-10-21-capacity-meter/README.md). The [Facility Map report](2026-10-21-facility-map/README.md) is retained as superseded design history, not the current shipped presentation.

### Two developer-menu launch shortcuts

1. **Ready to Commission · 197 markets** prepares both wizards, selected/filed/QA-approved markets, identified QA subscription titles and Original, funded test commercial setup, regional infrastructure, real rehearsal and blueprint evidence. Existing real rights/localization assets are preserved. It replaces the unbuilt test plan and stops before Commission; it does not advance time or launch. Already commissioned/live setups are refused.
2. **Fast-forward commissioned build** processes normal game weeks until the actual completion date, including scheduled campaign work. Every week persists before UI publication, with a shared processing lock, UI yields and failure/death stop conditions. It supports at most 52 weeks per run. Completed runs do not add extra weeks; Opening Night remains manual.

A durable pre-cheat checkpoint protects pending career edits. These are developer actions that deliberately modify the selected save when clicked. Verification used disposable fixtures, including a real commission and 15 normal processed weeks to `READY_TO_OPEN` / `canLaunch=true`; the user's Anshu career was not cheated, purchased against, commissioned or advanced by that verification.

See [shortcut implementation and evidence](2026-10-21-streaming-launch-cheats/README.md).

## Performance evidence and limits

The prior controlled 5,000-title comparison used the same pinned synthetic fixture, production browser at 393×852 CSS pixels, and event-to-double-frame samples. These are historical measurements from the 20 October implementation, not freshly rerun timings for this checkpoint:

| Action | Before | After |
| --- | ---: | ---: |
| First Build open | 5,858.9 ms | 1,253.4 ms |
| Add Workhorse | 10,984.9 ms | 628.6 ms |
| First Define open | 9,458.9 ms | 356.4 ms |
| First Ident step | 13,336.8 ms | 977.9 ms |
| Bid amount edits | 70.9–79.3 ms | 13.1–15.3 ms |

Matched five-second auction idle windows fell from 1,192 ms total long-task time to 109 ms. These are short lab samples, not percentiles or a guarantee on every device. The lab excludes the main App's durable save path.

Later 21 October full-HQ browser testing with 5,000 titles still observed a 6,024 ms cold Build open and a 9,185 ms maximum session long task. Warm Test/rehearsal/navigation samples were approximately 13–43 ms. Those sessions exercise different paths from the earlier isolated lab and must not be represented as the same before/after experiment. Full-HQ cold calculation and large save/forecast updates remain work to profile. A 14.9 ms warm capacity SSR render is not a phone tap or cold-open measurement.

No physical Android/iPhone performance certification or complete streaming-economy release approval is implied. Existing production chunk-size warnings remain.

## Verification refreshed for this checkpoint

All checks below ran on the checkpoint source on 21 October, before commit:

- TypeScript: `NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`, exit 0.
- Production: `npm run build`, exit 0, 20.80 seconds; existing large-chunk warning retained.
- Six focused audits passed: network budget, build status polish, final capacity boundaries, network suggestions, build reconciliation and launch cheats.
- Four package audits passed: `audit:streaming-infrastructure-read-forecast`, `audit:streaming-launch-s1-rehearsal`, `audit:streaming-build-test-autosave-gates`, `audit:streaming-physical-infrastructure-phase5`.
- Three additional fixture runs passed: network suggestions with `--scale`, reconciliation on 5,000 titles / 197 countries, and immutable career capacity rendering on both 52- and 5,000-title fixtures.
- Launch cheat lifecycle result: 15 saved normal weeks, `READY_TO_OPEN`, `canLaunch=true`; source rights/localization preservation and fresh/existing preparation passed.
- `git diff --check` passed. New text files had no private-key/GitHub-token/AWS-access-key pattern matches; no raw save JSON or build output is staged.

Fresh Node scale observations (single local runs, concurrent with other checks): 5,000-title / 197-market suggestion generation 1,924.7 ms, validation/apply 7.5 ms, longest measured work slice 21.8 ms; 2-market generation 294.6 ms. Separate full reconciliation generated a plan in 2,731.8 ms and read three scenarios in 5.9 ms. Capacity SSR was 7.1 ms at 52 titles and 10.7 ms at 5,000 titles. These are different operations and fixtures, not a new before/after browser benchmark. Remaining unavailable/degraded countries were retained, not marked operational to pass tests.

Focused audit reproduction:

```sh
# Substitute one of the audit source paths listed in checkpoint-verification.json.
./node_modules/.bin/esbuild scripts/audit-streaming-network-budget.ts \
  --bundle --platform=node --format=cjs --loader:.css=empty \
  --loader:.csv=text --outfile=/tmp/checkpoint-audit.cjs
node /tmp/checkpoint-audit.cjs
# The network-suggestions runner additionally accepts --scale.
# build-reconciliation and facility-map-career accept frozen fixture paths.
```

[Machine-readable verification and audit output](2026-10-21-streaming-checkpoint-verification.json). Earlier browser screenshots remain dated evidence; this checkpoint does not claim a new browser walkthrough.

Audits that use frozen `/tmp` player/baseline fixtures require those local fixtures. Raw career/save JSON is intentionally not committed. This portability limitation remains explicit; a clean checkout does not automatically reproduce fixture-dependent tests.

## Proposed Operations work — not implemented here

Retain the existing four Operations sections and improve them selectively. Reuse familiar visual controls and focused editors with current values; preserve existing good screens rather than replaying the launch wizards.

| Section | Proposed home for ongoing controls |
| --- | --- |
| Audience | Markets/clearance, pricing, analytics with Top 10/regions, campaigns and competition. Use a shared world→region→country map where it clarifies audience or market status. Separate industry, platform and pre-launch forecast figures. |
| Content | Keep Catalogue, Content Market, Originals, Rights, Localization and Slate; integrate relevant ongoing wizard controls into these existing destinations. |
| Platform | Network/revisions/construction/rehearsal, Viewer Experience for ident/storefront, Technology, Product and Incidents. Review and apply revisions through their real save/commission semantics. |
| Boardroom | Finance/treasury/funding/commitments, Leadership, Ownership & IPO and CEO Brief. Network quotes link to Finance; the signed blueprint remains read-only history. |

Known source gaps are still open: live pricing/ident/storefront saves reject after `launchCommit`; Audience's pre-launch HQ omits inner destinations; region actions lack the HQ handler; recommendation choices route without persisting the objective; market management reopens the expansion wizard; network management reopens the Build wizard. Canonical localization persistence has a 320 per-title asset cap. These require deliberate implementation and save/effective-week rules before exposing live editors.

The user will decide whether to proceed after this repository checkpoint. No Operations redesign/integration is claimed complete.
