# Streaming Pricing and Offer Editor Implementation Roadmap

> **For agentic workers:** Execute inline, one phase at a time. Read this roadmap and the linked commercial spec before implementation. Use the executing-plans workflow for an authorized phase. Preserve unrelated working-tree changes; committing, pushing, and release are separate user actions.

**Date:** 2026-09-24  
**Status:** P0–P5 have implementations and technical checks from 2026-09-24; visual approval remains with the user. P5's historical churn comparison is unavailable, so its balance sign-off is provisional. P6 integration fixes, automated checks and four separate pricing-to-live-week UI careers are complete; device, final-screenshot and creative acceptance gates remain open. See [P0/P1 evidence](../reports/2026-09-24-streaming-pricing-p0.md), [P2 evidence](../reports/2026-09-24-streaming-pricing-p2.md), [P3 evidence](../reports/2026-09-24-streaming-pricing-p3.md), [P4 evidence](../reports/2026-09-24-streaming-pricing-p4.md), [P5 evidence](../reports/2026-09-24-streaming-pricing-p5.md), and [P6 evidence](../reports/2026-09-24-streaming-pricing-p6.md).  
**Goal:** Make pricing a deliberate, responsive offer-building flow with consistent expandable cards, understandable benefits, automatic market CPM, and credible audience/revenue forecasts.  
**Architecture:** Keep one saved commercial configuration, one title-access pipeline, and one player/AI economy. The UI progressively reveals that configuration; shared forecast results feed both the screen and wizard footer. Extend canonical rules when an editor exposes a new restriction, rather than making UI-only promises.  
**Tech stack:** React, TypeScript, existing Studio Finance styles/tokens, Vite, existing commercial and save audit scripts.  
**Spec:** [Commercial offers and audience choice](../specs/2026-09-23-streaming-commercial-offers-design.md). The product contract below supersedes its older target-CPM and pricing-layout requirements for this new sequence. Historical C0–C6 reports remain records of earlier work.

## 1. Product contract

### Entry and progression

- A fresh, unconfigured pricing step shows only **Your offers** and three unselected choices: Subscription, Free with ads, Rent or buy. Normal wizard navigation remains, but there is no invented forecast or configured-price total in its footer.
- The first deliberate selection reveals offer cards and the compact forecast. The core picker then becomes a compact selected-model header with a Change action.
- Persist the deliberate choice. Returning to a configured draft or an existing service restores it; do not ask the player to start again on every visit.
- Default pricing objects do not prove that a choice was made. Initialization and automatic draft saving must not mark fresh defaults as selected.
- Existing saves retain their configured model, prices, benefits, and history. New selection metadata must distinguish fresh defaults without guessing that an old saved service is unconfigured.
- Changing the core must not silently discard custom-plan definitions, prices, or extras. Retain inactive definitions; show a concise change summary when active offers will be removed. No confirmation is needed for a reversible visual expand/collapse.
- Complete the pricing step only after a deliberate choice and a valid configuration. Draft browsing remains available.

### Offer cards and contained editors

| Core | Collapsed cards | Expanded content |
| --- | --- | --- |
| Subscription | Existing blue Essential, purple Standard, gold Premiere; custom plans remain supported | Price, picture/sound, access, ads, premium access, early weeks, and compatible extras |
| Free with ads | One full-width coloured card with **Free with ads**, **Free / $0**, a short ad-frequency summary, and Edit | Ad cadence, market-rate summary, premium access, early weeks, and optional ad-free passes |
| Rent or buy | One full-width coloured card with the uniform rent and purchase prices, and Edit | Both prices, applicable windows/benefits, and compatible extras |

- Use one expandable-card interaction across the three models. Only the card being edited expands; its editor stays visually attached to it. Opening or closing must not move focus unpredictably or jump the scroll position.
- Preserve the recognisable coloured collapsed cards. Expanded editors use calmer dark surfaces with a restrained colour accent, not a large wall of tinted panels.
- Remove the standalone **Also offer** block. Put **Include with this offer** inside the applicable editor.
- A public free tier is a separate offer. Ads inside a paid plan are a plan feature. Creating a public free tier creates one additional editable offer card, never duplicates it once per subscription plan.
- Separate an additional store offer from permission for a particular plan's members to use it. Essential can forbid new rentals while Standard permits paid rentals; rental entitlement is not included ownership.
- Keep one platform rental price and one purchase price across eligible titles. No categories, per-title prices, paid store entry, sponsor-title controls, fan-funding controls, or actor-interaction feature is added.
- Retain custom subscription plans and the current six-plan limit; avoid unrelated changes to that limit.

### Feature editor treatment — includes the two latest screenshots

- Replace the irregular feature-chip cloud with aligned setting groups: **Picture & sound**, **Access**, and **Extras**.
- Use compact segmented choices for mutually exclusive settings, such as picture tier and simultaneous streams, and consistent switches for independent benefits. Verify the current feature semantics before converting controls; normalize incompatible selections through the canonical model.
- Resolve the overlap between the existing No adverts feature and the plan's ads flag. The editor, audience appeal, and actual ad eligibility must agree on one result.
- Use a short **Premium access** row with a switch. When enabled, reveal **Early access** with Opening week / 1 / 2 / 3 / 4 weeks. Preserve the current 0–4 whole-week rule and title-rights limits.
- Put the rights explanation in one short helper line. Additional explanation can be expanded without dominating the editor.
- Ad-free passes use two aligned rows, **1 hour** and **24 hours**, each with a switch. Reveal its native numeric price input only when enabled. A pass removes ads for its duration; it never purchases a paid title.
- Research-locked features stay visibly unavailable and say only **Research locked**. Do not expose unlock levels, research names, or prerequisites in text, tooltips, or accessible labels. Use aligned lock states or a clearly labelled locked-feature disclosure rather than oversized repeated badges inside pills.
- Retain semantic native controls underneath the styling: labelled inputs, keyboard navigation, visible focus, disabled semantics, and native mobile keyboards. No in-game keyboard.
- Minimum 44 CSS-pixel interactive targets; readable body copy; selected/off/locked states distinguishable without colour alone; reduced-motion support; no overlap or horizontal overflow at 320, 393, and 430 CSS pixels.
- The new top selector should be compact and connected, with short labels and a restrained selected-state transition. Retire the three recently added broadcast rows. P0 provides a reviewable visual before this direction is integrated.

### Forecast and performance

- Default forecast view: **Estimated audience**, **Estimated monthly gross**, and a short **Before operating costs** qualifier. Add one relevant readiness warning when needed.
- A single **View breakdown** disclosure contains monthly/annual buyers, free viewers, store buyers, source totals, countries, assumptions, and costs where canonically available.
- Never sum overlapping subscriber/store/pass populations into a false unique-audience number or pie chart. Distinguish unique households from accounts and transactions.
- State whether a figure is conditional on playable titles/network delivery. Do not relabel a conditional opportunity as booked cash or invent profit when costs are unknown.
- Keep projected demand separate from actual opening customers and settled revenue. Annual cash collected upfront and monthly-equivalent revenue must be distinguishable in the breakdown.
- Dragging a slider updates its thumb, percentage, and immediate price label locally. Commit the latest value when the gesture finishes; keyboard and blur/navigation completion also preserve the final value.
- Calculate one forecast per committed configuration revision and reuse it in the page and footer. Cache reusable world context with correct invalidation when the week, countries, rivals, rights, network, or offer changes.
- While recalculating, retain the previous result with a subtle updating state. Obsolete results must never overwrite a newer configuration. Use a worker only if profiling shows shared calculations still block input.

### Advertising authority

- The player controls frequency. Present **Show an ad every … minutes**, plus the translated ad count and total ad time per eligible viewing hour.
- Proposed launch convention: a standard 30-second ad, with presets every 5, 10, 15, 20, or 30 viewing minutes. Example: every 10 minutes means six opportunities and three ad minutes per eligible viewing hour. These are opportunities; market fill determines actual impressions.
- Preserve unusual legacy ad loads as an exact custom equivalent instead of silently rounding them to a preset. Preserve zero load explicitly. Normalize the schedule to the same canonical ad-load value used by audience tolerance and inventory; do not maintain two disagreeing editable values.
- CPM becomes automatic. Remove the player target from active decision-making as well as from the editor; hiding the slider while old saved targets still influence rates is incomplete.
- Display **Estimated CPM** and a compact fill indication as market outcomes. Country, demand, competing inventory, audience quality, brand suitability, and world conditions determine them.
- Forecast and settlement share the resolver. Replace placeholder forecast quality/safety inputs with the same available signals used by the live model, or disclose an explicit estimate when unavailable.
- Player and AI use the same formula and finite country advertiser budget. Rival advantages arise from their actual brand/audience/business conditions. A separate arbitrary AI CPM bonus is not part of this roadmap; if requested later, treat it as an explicit difficulty rule.
- No eligible delivered viewing, zero ad load, or no advertiser demand means zero ad revenue. Ad-free viewing generates no covered ad impressions. Total spend across platforms cannot exceed the shared country-week budget.
- Old target-CPM fields may remain readable for migration, but must not affect new automatic settlement. Do not replay or rewrite settled history.

### Balance policy

- Diagnose the billion-per-month figure before selecting balance coefficients. High revenue alone is not proof of an error.
- Trace people → reachable households → exposed households → offer choice → paid/free/store customers → delivered viewing or transactions → receipts → costs and treasury.
- Inspect the existing launch-awareness ramp, catalogue scoring, competition, affordability, delivered coverage, tier value, and customer churn. Do not add a second ramp or coverage discount without checking the current one.
- Identical benefits at different prices can rationally concentrate demand in Essential. Higher tiers should earn demand through real available benefits, not a forced equal split.
- Balance findings must separate accounting/duplication defects from deliberate coefficient changes. Never tune population totals or multiply all receipts down to conceal a defect.
- Free ads should generally reduce the payment barrier and earn less per viewer; paid plans should generally earn more per paying household while facing greater affordability friction. These are measured tendencies, not hard-coded guarantees that one model always wins.

## 2. Current evidence and implementation map

| Area | Current evidence | Main files |
| --- | --- | --- |
| Entry/default saving | Pricing always projects a core; draft initialization and persistence can save default prices | `components/studio-finance/components/launch/LaunchWizard.tsx`, `components/StreamingDefineLaunchExperience.tsx`, `components/studio-finance/finance/launch.ts`, `services/streamingPricingEconomy.ts`, `services/ownedStreamingPlatform.ts`, `types.ts` |
| Cards and features | Subscriptions expand; ad/store settings are always-open Config panels; benefits/passes use unstyled controls | `components/studio-finance/components/launch/StepPricing.tsx`, `components/studio-finance/components/launch/ResearchLockMark.tsx`, `components/studio-finance/styles/launch.css`, `components/studio-finance/styles/tokens.css` |
| Plan-specific store access | Current rental/purchase route has no plan membership field; global store enablement alone cannot enforce the requested restriction | `services/streamingCommercialOffers.ts`, `services/streamingTitleAccess.ts`, `services/streamingContentAvailability.ts`, `services/worldEconomy/worldStreamingCommercialEconomy.ts`, `services/worldEconomy/worldStreamingViewing.ts`, `types.ts` |
| Forecast work | StepPricing and LaunchWizard each request the world forecast; range onChange updates canonical draft state | `StepPricing.tsx`, `LaunchWizard.tsx`, `components/StreamingDefineLaunchExperience.tsx`, `services/worldEconomy/worldStreamingPricingForecast.ts` |
| Ad rates | Resolver still accepts targetCpm; forecast currently supplies quality/safety values of 65 | `services/worldEconomy/worldStreamingAdMarket.ts`, `services/worldEconomy/worldStreamingPricingForecast.ts`, `services/worldEconomy/worldStreamingCommercialEconomy.ts`, `services/worldEconomy/worldStreamingOffers.ts` |
| Existing authorities | World audience, billing cohorts, access checks and treasury pipelines already exist | `services/worldEconomy/worldStreamingAudienceChoice.ts`, `services/worldEconomy/worldStreamingCompetition.ts`, `services/worldEconomy/worldStreamingCustomers.ts`, `services/streamingWeeklyLoop.ts` |

Keep `StepPricing.tsx` as the composition point. Extract focused controls under the existing launch component directory only as they are needed: core selector, shared offer card, feature editor, and forecast summary. Avoid creating another pricing model in UI components.

## 3. Execution order and phase gates

The user approved **P0 and P1 together**, then **P2**, **P3**, **P4**, **P5**, and **P6** separately. P6 has an implemented integration pass and report; its remaining exit checks below are not waived by automated success.

| Phase | Reviewable result | Dependency |
| --- | --- | --- |
| P0 — Baseline and visual prototype | Concrete phone-size designs for the empty step, each offer card, expanded benefits, and forecast | Roadmap |
| P1 — Page flow and shared offer cards | Deliberate selection, save/reopen behavior, and all three models using one expandable-card pattern | P0 visual direction |
| P2 — Feature controls and scoped extras | The latest screenshot problems fixed; plan-specific extras actually enforced | P1 |
| P3 — Responsive editing and concise forecast | Smooth sliders and one shared forecast with a compact breakdown | P1–P2 |
| P4 — Ad cadence and automatic CPM | Simple frequency control; market-decided rates for player and rivals | P2–P3 |
| P5 — Audience and revenue calibration | Explained forecasts, corrected defects, and measured balance recommendations | P4 |
| P6 — Career, save and visual regression | Complete pricing-to-live-service walkthrough and evidence of integration | P1–P5 |

### P0 — Baseline and visual prototype

**Scope:** `lab/pricingLab.tsx`, `pricing-lab.html`, current pricing components/styles for reference, existing C1–C6 audit outputs. Record results in `docs/superpowers/reports/2026-09-24-streaming-pricing-p0.md`.

- [x] Record existing subscription/ad/store/hybrid outputs and the current slider update path. Capture a profile of repeated discount dragging in the actual wizard, not only the isolated fixture. See report for sample/fixture limitations.
- [x] Build an isolated interactive prototype covering: no choice; selected subscription with an open plan; selected free-ad card with passes; selected store card; research-locked features; compact/expanded forecast.
- [x] Reuse the blue/purple/gold card identity. Compare the new compact selector and aligned editor against the supplied screenshots at 320, 393, and 430 CSS pixels.
- [x] Check focus, long plan names, long lock labels, expanded heights, reduced-motion styles, and readable enabled/disabled states. Physical-device and OS preference checks remain in P6.
- [ ] Present the visual result for creative review. Technical success alone does not mark the appearance accepted.

**Exit:** A concrete reviewed visual direction, preserved baseline numbers, and a measured lag baseline. Prototype fixtures never read or mutate player careers. P0 does not change the economy.

### P1 — Page flow and shared offer cards

**Scope:** `types.ts`, `services/streamingPricingEconomy.ts`, `services/streamingCommercialOffers.ts`, `services/ownedStreamingPlatform.ts`, `components/StreamingDefineLaunchExperience.tsx`, `components/studio-finance/finance/launch.ts`, `LaunchWizard.tsx`, `StepPricing.tsx`, `launch.css`. Add focused extracted components as described above.

- [x] Introduce versioned explicit-selection state through initial creation, normalization, draft copying, save, and reload. Fresh factories create an unchosen setup; legacy configured services migrate as chosen.
- [x] Prevent mount-time draft persistence from converting an unchosen setup into saved pricing. Make page/footer/step-completion state read the same marker.
- [x] Integrate the P0 selector and the three card variants under combined authorization. Start all editors collapsed; keep custom-plan creation and rename/remove behavior.
- [x] Contain existing ad/store controls inside their cards. Additional public offers appear as their own cards after being enabled from an editor.
- [x] Preserve inactive definitions when changing core; communicate active-offer changes. Do not add a cosmetic per-plan rental permission before P2 enforces it.
- [x] Verify fresh entry, click, edit, navigate away/back, reload, core switch, and legacy configured save. Re-run commercial C1/C5 and focused TypeScript checks.

**Exit:** Only Your offers appears in a fresh pricing content area; one deliberate click reveals the right cards; all three models expand consistently; saved services reopen intact. Existing target-CPM behavior remains explicitly transitional until P4 changes the resolver.

### P2 — Feature controls and scoped extras

**Scope:** pricing components/styles and `ResearchLockMark.tsx`; `types.ts`, `services/streamingCommercialOffers.ts`, `services/streamingPricingEconomy.ts`, `services/streamingTitleAccess.ts`, `services/streamingContentAvailability.ts`, `services/worldEconomy/worldStreamingOffers.ts`, `services/worldEconomy/worldStreamingAudienceChoice.ts`, `services/worldEconomy/worldStreamingCommercialEconomy.ts`, `services/worldEconomy/worldStreamingViewing.ts`.

- [x] Replace default checkbox/dropdown panels and scattered chips with grouped controls. Early-week and pass-price rows appear only when enabled.
- [x] Normalize mutually exclusive quality/stream selections and ads/no-ad state. Legacy conflicting selections resolve deterministically.
- [x] Add canonical public-versus-selected-members store eligibility while keeping uniform rent/buy prices and explicit editor scope.
- [x] Carry source buyer plan into transactions and restrict audience/forecast pools, separately from publisher rights.
- [x] Preserve existing purchases and unexpired rentals when new-sale eligibility changes.
- [x] Migrate missing policy to public, apply the same normalized policy to AI, and prevent plan deletion from opening the store.
- [x] Verify Essential denied / Standard allowed, public, no eligible plans, stale membership, retained entitlements, rights, research lock, early access and passes; run affected commercial audits.

**Exit:** The two newly supplied editor screenshots have coherent replacements, every visible toggle has real scope, and player/AI viewing and charges respect the saved configuration.

### P3 — Responsive editing and concise forecast

**Scope:** pricing components, `LaunchWizard.tsx`, `components/StreamingDefineLaunchExperience.tsx`, `components/studio-finance/finance/launch.ts`, `services/worldEconomy/worldStreamingPricingForecast.ts`; performance cases in the existing pricing lab/audit tooling.

- [x] Keep slider gesture state local. Commit once on gesture completion, and correctly finish keyboard, blur, navigation, cancellation, and component-unmount paths without losing or duplicating the final edit.
- [x] Move forecast ownership to the wizard boundary; pass the same result to StepPricing, its footer, and blueprint. Stable pricing/context inputs memoize the world result across ordinary autosaves.
- [x] Show revision-aware Updating state while React defers the latest input. An old result is hidden rather than displayed as current; no asynchronous promise can publish out of order.
- [x] Implement the two-number forecast summary and one expandable breakdown. Retain relevant readiness failures visibly; do not print unavailable amounts as zero.
- [x] Repeat the P0 C6 interaction profile at 320 CSS px. The isolated counter confirms no world forecast during the drag, one final save and one forecast; record React render, input-to-next-frame and long-task observations in the P3 report. Browser emulation is not real-phone proof.
- [x] Check page/footer agreement, discounted prices, monthly versus annual allocation, plan-specific promotion targeting, and reopened values. Re-run C5 and billing-cohort checks.

**Exit:** Dragging feels immediate on the test device/browser, duplicate forecast work is removed, the last edit is never lost, and compact totals reconcile to the breakdown.

### P4 — Ad cadence and automatic market CPM

**Scope:** `types.ts`, `services/streamingPricingEconomy.ts`, `services/streamingCommercialOffers.ts`, `services/worldEconomy/worldStreamingAdMarket.ts`, `services/worldEconomy/worldStreamingCommercialEconomy.ts`, `services/worldEconomy/worldStreamingPricingForecast.ts`, `services/worldEconomy/worldStreamingOffers.ts`, ad-card controls and C4 audits.

- [x] Bind the approved frequency controls to canonical ad load with the exact conversion shown in the product contract. Preserve old custom loads and zero load.
- [x] Remove active target-CPM strategy from both forecast and settlement. Generate deterministic market outcomes from available advertiser demand and eligible inventory across the same country/week.
- [x] Allocate a finite shared advertiser budget across player and AI supply; keep outcomes order-independent and rates/fill finite. Reuse current market components where they already meet this contract.
- [x] Use actual available audience/brand signals consistently in preview and live calculations. Show a market CPM estimate and filled-ad indication; explain the terms in a disclosure.
- [x] Migrate legacy fields without rewriting history. An old high or low saved target must not influence automatic-mode receipts.
- [x] Verify no-view/no-demand/no-load cases, high supply, low demand, mixed countries, ad-free pass coverage, excessive ad frequency, and identical player/AI conditions. Re-run C4, C5, and C6 affected checks.

**Exit:** No player CPM input, one understandable frequency setting, and the same bounded market rule for player and rivals. Publish measured before/after ad receipts because this phase intentionally changes the pricing mechanism.

### P5 — Audience and revenue calibration

**Scope:** `services/worldEconomy/worldStreamingPricingForecast.ts`, `worldStreamingAudienceChoice.ts`, `worldStreamingCompetition.ts`, `worldStreamingOffers.ts`, `worldStreamingCustomers.ts`, existing billing/economy/weekly settlement adapters. Change coefficients only after tracing their effect.

- [x] Reproduce the reported high forecast using a matching isolated fixture, without claiming the user's exact save was reproduced.
- [x] Reconcile paid monthly/annual, free/store pools, conditional forecast versus live receipts, operating costs and treasury; document monthly-equivalent versus cash settlement.
- [x] Audit launch exposure, country-playable catalogue, local budgets, network reach and outside choice without changing world population.
- [x] Compare one/several/40-market, weak/strong content, capacity, price, ad-load, tier and hybrid scenarios.
- [ ] Correct proven defects and report before/after audience, revenue per household, margins, churn and AI effects. Defects and the other measured effects are in the P5 report; **an exact pre-P5 churn-rate baseline was not preserved**, so final balance sign-off remains open.
- [x] Verify free entry is not subscription cash, higher prices need not increase income, and valuable higher tiers can win without a fixed share.

**Exit:** The billion-scale case is explained or corrected with evidence. Forecast-to-live differences have stated causes; player and rival results remain affordable, finite and reconcilable. No arbitrary revenue cap conceals a defect.

### P6 — Career, save and visual regression

**Scope:** existing commercial C1–C6 and billing/save audit scripts, dev-only QA career and pricing lab, a phase report under `docs/superpowers/reports/`.

- [x] Walk fresh setup through choice, customisation, forecast, blueprint, commissioning, opening, one live week and save/reopen for subscription, ads, store and a hybrid. Four independent disposable UI careers and their first-week/reopen readings are recorded in the P6 report; these are not real-device approval.
- [ ] Verify old configured saves, unchosen fresh saves, mid-edit navigation, plan deletion, core changes, legacy ad loads, research locks, restricted new purchases and retained existing entitlements.
- [x] Confirm player/AI ad budgets, rights/time/territory failures, zero/thin/outage capacity, pass exclusions, annual and intro billing, no double settlement and unchanged historical cash through the integrated deterministic audit suites. Real-career spot checks are recorded separately in the P6 report.
- [ ] Inspect 320/393/430 CSS-pixel layouts, expanded cards, long names, native numeric entry, keyboard/focus, reduced motion and the forecast disclosure. Browser emulation and source inspection passed the recorded cases; real-device keyboard, focus and OS reduced-motion validation remain open.
- [x] Run the relevant commercial/billing/save checks, focused TypeScript, production build and diff check. The WE4 failure was traced to ad-plan feature normalization and a stale audit invariant, both corrected and rerun green.
- [ ] Publish final screenshots, phase status, performance measurements, balance deltas and remaining limitations. The report contains status, fixture balance figures and limitations; archived final/device screenshots and a same-fixture full-wizard performance measurement remain open. Do not claim creative acceptance, real-device verification or a release that has not occurred.

**Exit:** The integrated flow has reproducible evidence across all four offer combinations and compatible saves. Remaining release decisions are explicit.

## 4. Verification and reporting rules

- Use behavioural tests for selection persistence, access restrictions, money, migration and final slider commits. Visual-only spacing or typography changes are checked in the browser rather than with tests that assert CSS class names or exact markup.
- Existing commands include `npm run audit:streaming-commercial-c1` through `npm run audit:streaming-commercial-c6`, `npm run audit:streaming-billing-cohorts`, focused commercial TypeScript configs, `npm run build`, and `git diff --check`. Select only the relevant checks per phase; run the integrated set at P6.
- Add a phase-specific audit only where the existing suites cannot exercise a meaningful new behaviour. Profile performance with the same fixture before/after; do not call a fast isolated component proof of a fast real wizard.
- Each phase report states: changed files/behaviour, save impact, observed player/AI money impact, checks actually run, visual evidence, unresolved issues, and the next phase.
- Update phase status from evidence. A mockup is not an integrated feature, a build pass is not gameplay proof, and a technical pass is not visual approval.

## 5. First session

P0–P5 have implementations and technical checks. P6 was approved and its integration fixes, deterministic gate and four full local UI careers have been run; the remaining P6 compatibility/device/creative checks and final P5 balance sign-off are listed above. Do not call this a shipped release.
