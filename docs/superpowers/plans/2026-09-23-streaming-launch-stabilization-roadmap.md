# Streaming Launch Stabilization Roadmap

Date: 2026-09-23  
Status: proposed for user review; no implementation authorized by this document  
Scope: the registration-to-launch journey reported with the 18 screenshots from 2026-09-23

## Outcome we want

A player registers a streaming platform, lands on its dashboard, learns to fund it, chooses and files opening markets, builds a network from an honest blank state, understands its local coverage and costs, rehearses a geographically meaningful opening night, and commissions only a configuration that the canonical game can persist and simulate. Every presented country, discount, poster, budget, and failure must come from the same game state that the weekly loop uses.

The September 22 Claude integration phases 0–8 were a port and verification sequence. This is a **separate post-integration stabilization sequence**, numbered S0–S6. Green build, parity, and responsive audits from that integration do not overrule the live `NaN% served` and flow failures shown here. Each phase below should get its own small, executable implementation plan immediately before work begins; the phase ends only when its gate passes and the user has seen the result. Do not bundle later phases into an earlier fix.

## Non-negotiable contracts

- Canonical `Player`, owned-platform state, market operations, facilities, quotes, pricing offers, rehearsal, construction, and weekly loop remain authoritative. UI adapters may project them but must not invent a competing simulation.
- Planning, opening reports, and read-only previews do not spend cash or energy. Filing and commissioning remain explicit, idempotent transactions with visible costs and failure reasons.
- Existing commissioned infrastructure and old saves must not be erased by a new blank-draft rule. Distinguish an untouched new draft from a saved draft and from a live/change-order network.
- Every numeric projection crossing a UI boundary must be finite. Missing data is an explicit `unknown`/unavailable state, never `NaN`, misleading zero, or a positive health grade.
- “Selected,” “filed/under review,” “approved,” “built,” and “live” are different states. The UI and action gates must use the same definitions.
- Preserve the user’s other dirty work. Do not commit, push, or change Claude source as part of these phases without an explicit request.
- Test the real career route and saved/reloaded state at 393×600, 393×852, and desktop width; lab fixtures alone are insufficient.
- Record every newly observed failure in a named regression ledger with reproduction, expected/actual result, owning phase, and disposition. Do not silently normalize an error into a passing display.

## Evidence and dependency map

| Evidence | Current finding | Owning phase |
|---|---|---|
| Screenshots 7, 8, 11–13 | `NaN% served` at region/country/map level; `Strong` can appear beside invalid coverage. The career adapter omits `coveredPeak` and `coveredShare` expected by the region UI. | S0, S1 |
| Screenshots 16–17 | Global load can be 38% while a market has no regional route. The viewer defaults to a worst market, and the “12 down · 1 buffering · 15 playing” cell counts only hidden monitors. | S1 |
| Registration and screenshots 7–8 | Registration explicitly opens Finance; a default infrastructure draft can seed placements; merely planned markets enter Build. | S2 |
| Screenshots 1–4 | Group rollups and country reports need geography/data audits; 23 badge and summary truncate. Filing is currently 5 energy per submitted country: 13 costs 65, 23 costs 115. | S3 |
| Screenshot 6 | The shown intro offer is Off, so 100% Essential there is not itself proof of a discount bug. Targeted introductory discount is omitted from the first-year revenue helper; player and AI discount parity needs scenario testing. | S4 |
| Screenshots 9–10, 14–15, 18 | Header clipping, sparse cloud-provider comparison, dense Money page, long agreement, and ambiguous stage-strip metrics. | S5 |
| Screenshot 5 and catalogue list | Mockups use real custom art when present and generated artwork otherwise; the Define Launch catalogue list still directly renders generated posters. | S5 |

The intended Build gate is: no filed opening market → pages browsable but no network edits; at least one opening-market filing started → planning enabled even while approval is pending; commissioning still obeys all canonical launch gates. This differs from the present `status !== EXITED` market projection and must be tested against existing saves.

## Phase S0 — Freeze a reproducible career baseline

**Deliverable.** A small career fixture or safe saved-state reproduction covering the user’s market selection, 2-region prefilled Build, non-finite coverage, and regional rehearsal. A failure ledger names each of the 18-screen observations and separates confirmed defects from unverified hypotheses and pure presentation requests.

**Work boundary.** Add diagnostics and failing tests only. Capture the selected/filing statuses, raw canonical country coverage, adapter `CountryService`, displayed region grade, total versus regional capacity, and rehearsal country verdicts at each boundary. Profile a Titan increment before attributing its pause to any one calculation. Record existing audit outcomes without rewriting assertions merely to make them green.

**Likely anchors.** `components/StreamingPlatformHQ.tsx`, `components/streaming-transplant/StreamingBuildWizardExperience.tsx`, `components/studio-finance/finance/placer.ts`, `components/streaming-transplant/StreamingBuildoutExperience.tsx`, existing Build/pricing/rehearsal audit scripts.

**Gate.** The reported `NaN` is reproduced by an automated career-path test; data crossing each boundary is recorded; a baseline screenshot set exists; unrelated pre-existing failures are separately identified. No user save is modified just to manufacture the fixture.

## Phase S1 — One trustworthy network and rehearsal reading

**Deliverable.** Canonical coverage supplies every value the Build UI needs, with a finite-data contract. Region grade, country rows, map tint, capacity bar, Test stage, and rehearsal refer to compatible definitions. The test screen distinguishes **global spare compute** from **local delivery path** and from **quality/buffering**.

**Design direction.** The adapter should project canonical `reachedShare`, `coveredShare`, `coveredPeak`, and cloud-served share consistently, or the UI should directly consume a shared canonical coverage view. Invalid input yields “coverage unavailable” and a blocking diagnostic, never `Strong`. Rehearsal summary reports all markets playing/buffering/down; overflow cells say “more markets” and are not mislabeled as totals. Selecting a market reveals its viewer screen, serving city/region, load, limiting factor, and specific repair; the main screen may begin with the worst market but must say why. Reuse, rather than duplicate, the existing “see what viewer sees” content.

**Tests.** Empty, one-region-only, cross-region, data-residency, low-compute, fibre-limited, full-coverage, and mixed cloud/owned fixtures. Assert finite output, grade/percentage agreement, correct regional outage despite spare global capacity, and exact all-market counts. Verify no false commissioning readiness and no rehearsal signature mismatch after a network edit.

**Gate.** No `NaN`/`Infinity` or false positive “Strong” on career screens; the screenshot-16 configuration explains why Belgium is down without implying all 11.81M capacity is unusable; automated and phone-browser checks pass.

## Phase S2 — Registration, filing, and honest Build entry

**Deliverable.** Registration ends on Platform Dashboard. A guided, dismissible tutorial highlights a real capital-injection action without forcing a Finance redirect. Define Launch and Build share a clear opening-market lifecycle.

**Design direction.** A newly opened, uncommissioned Build starts with no player-selected servers/cloud. Existing committed rooms remain visible as existing assets; saved draft choices reopen intact; change orders retain live service. Before any market filing, all Build stages remain inspectable for cost education but mutations, rehearsal, and commissioning are disabled with a visible reason and a route back to Market Clearance. With no chosen market, show illustrative unit prices rather than a fabricated country-specific total. Once at least one filing starts, selected countries appear in planning even if approval takes weeks. Planned-but-unfiled and exited markets do not silently become buildable; all market actions remain canonical and idempotent. Align Build’s title/header treatment with Define Launch without hiding the build clock.

**Tests.** Fresh registration; no selected market; planned only; one filing under review; one approved; rejected/reapplied; existing draft; commissioned network; old save migration; exit/reopen/reload. Assert no hidden cash/energy spending or state loss.

**Gate.** Fresh career follows Dashboard → tutorial → optional Finance; a new Build is genuinely blank; every filing status produces the intended read-only/editable state and survives reload.

## Phase S3 — Group markets, geography, and fair filing energy

**Deliverable.** A group card is a clear bulk-selection affordance, not a substitute for country truth. Its counts, audience, rival share, estimated access cost, report, map, and filing energy reconcile with its member countries and the canonical operation ledger.

**Design direction.** Validate grouped-country shapes/centroids and selection highlights against the shared geography registry, including small islands, the Caribbean, and Central America. The group report should show aggregate methodology and a country-by-country drill-down with costs, approval timing, requirements, and individual energy. Replace the cramped `23` badge and single-line summary with a responsive count/selection layout; “Add all” should become “Remove all” or be disabled when all are selected. State energy at three scopes: one country, the currently unfiled selected batch, and the whole group; charge only the actual submitted batch.

**Approved balance (2026-09-23).** One country costs 5 energy. One combined filing of `n` unfiled countries costs `min(30, 5 + 2×min(n−1,8) + max(n−9,0))`, with zero for an empty batch. Thus 1/7/13/23 countries cost 5/17/25/30 energy. This applies to any submitted batch, including partial or mixed groups; the group is only a selection affordance. Rights/compliance money and each government review remain per country. Reapplication and regulatory follow-up energy are unchanged. The player approved this curve after the earlier 5+1/cap-25 candidate was presented; the S3 design record gives the full transaction and UI contract.

**Tests.** All six regions and representative groups, including 23-market North America and 13-market Caribbean; select/remove/partial-file/retry; 0–100 energy boundaries; each operation charged once; sum of per-country costs equals the reported total. Map hit targets and labels checked on phone.

**Gate.** No group/country disagreement or clipped controls; player sees exact cost before filing; a large group is feasible without pressuring an energy purchase; no transaction duplication.

## Phase S4 — Pricing, discounts, AI competitors, and demand

**Deliverable.** Plan cards, discounts, allocation, revenue, AI offers, and Build demand tell one coherent story. A discounted premium plan is not guaranteed to capture everyone, but its effective price and feature value must actually influence eligible cohorts and the explanation shown to the player.

**Design direction.** Show list price, promotion price and duration, annual-billing price, and the blended forecast separately. Use the same targeted-intro rule in opening-night demand, first-year revenue, weekly customers, and player offer generation. Fix the first-year helper’s missing `introOfferPlanId` applicability. Give AI competitors the same offer schema where they use discounts, while allowing AI strategy to choose different levels and targeting. Audit that marketing’s country demand flows into Build and rehearsal and that only actual committed spending affects treasury. Do not promise that every discounted Premiere must beat Essential: budgets, feature preferences, promo expiry, and annual subscribers can change the split.

**Deferred scope.** The user explicitly set aside the complete UI for advertising, rentals, purchases, premium access, day passes, sponsorship, pay-by-hour, and crowdfunding. Keep existing modes functioning, but make a separate product/design decision before redesigning all their controls.

**Tests.** Intro Off; Premiere discounted below Essential only for the intro period; annual versus monthly cohorts; expired intro; ad-supported plans; AI targeted versus broad discounts; affordable/unaffordable cohorts; plan allocation sums; forecast/weekly revenue agreement; Build demand changes only when the canonical offer changes.

**Gate.** The user can explain a 100% Essential forecast from visible prices and cohort reasons; targeted discount revenue is correct; AI offer and player demand audits pass without changing unrelated balance silently.

## Phase S5 — Build presentation, performance, and artwork

**Deliverable.** The four Build stages remain coherent on a short phone without sacrificing the canonical detail underneath.

**Design direction.** Put the actionable server/cloud controls ahead of or beside a collapsed “Who you serve” country breakdown; retain regional summary and the map above. Profile and reduce the measured cost of repeated Titan/Scout/Workhorse increments without weakening canonical calculation or autosave. Give Scout, Workhorse, and Titan distinct fictional server marks, and give the three fictional cloud providers distinct in-game vector/TSX marks plus a concise comparison of reach, ceiling, weekly cost, and trade-off; reuse the existing branding pattern rather than third-party marks. Make the weekly estate and Money page scannable with region summaries and expandable details. Label the bottom strip’s stage-specific measure explicitly: capacity, budget, rehearsal, or gates. Let the commissioning agreement show provider totals first and disclose rooms on demand. Keep image-rich Storefront mockups. Inventory every streaming catalogue, listed-show, and title-card surface; use actual custom/production posters where available and one established production-style fallback everywhere else instead of route-specific dummy art.

**Tests.** 393×600/852 and desktop snapshots with 0, 1, 23, and many-room selections; no clipped header, count, currency, or sticky-footer overlap; keyboard/screen-reader disclosure; responsive provider comparison; stable poster identity; measured increment latency versus S0 baseline. No style change is accepted if it hides a failing gate or cost.

**Gate.** All screenshots’ layout complaints are resolved in the real career flow; incremental controls respond smoothly by measured result; contract details and every financial line remain reachable.

## Phase S6 — Whole-journey regression and release decision

**Deliverable.** One complete career fixture and human-playable walkthrough: register → dashboard/capital → choose/report/file markets → configure service and discount → Build from blank → spend/quote → rehearsal and repair → commission → construction weeks → operational opening → save/reload/weekly report. Include old-save and in-progress-save paths.

**Verification.** Run targeted phase audits, TypeScript, production build, save migration/compaction, financial ledger and energy transaction checks, AI pricing/world competition, map/geography integrity, load-rehearsal/commission signature tests, construction and weekly-loop audits. Re-run the 18-screen visual matrix at phone and desktop and add regression screenshots for empty, partial, failed, and completed states. Keep a failure ledger with new versus inherited failures; no blanket “all passed” claim based on build success.

**Gate.** No newly introduced failure, no open P0/P1 gameplay defect, no non-finite player-facing number, and a human-readable report of every remaining known failure. Only then ask for a release/merge decision; this roadmap itself does not authorize one.

## Execution order and review points

`S0 → S1 → S2 → S3 → S4 → S5 → S6` is the recommended sequence. S1 must precede coverage/map polish because today’s map is fed invalid numbers. S2 precedes any final Build UX judgment because empty/preview/commissioned states differ. S3’s numerical energy rebalance was approved on 2026-09-23 and implemented as recorded in the S3 report. S4’s price and AI balancing is also reviewed before merging, even if the underlying calculation repair is straightforward. S5 is presentation work only after the displayed data is trustworthy. S6 is a separate release gate, not a reason to conceal phase-specific failures.

At the start of each phase: show its exact behavior change, affected saves/economy, failing tests, and mockup or visual target where useful. At the end: show the observed result, test commands/results, remaining failures, and whether the next phase is safe to start. Do not auto-advance without the user's approval.
