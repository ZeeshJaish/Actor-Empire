# Streaming Launch Marketing and Money Design

## Status

Implemented and verified on 2026-09-15. The scoped launch-marketing, Build Money,
World Economy, AI-rival, save, mobile, and production-build gates pass. Two
unchanged repository-baseline audit failures are documented below.

## Goal

Turn the Build wizard's Money stage into the authoritative launch-allocation decision: the player sets a marketing ceiling, chooses what the platform promises, and sees a country-aware forecast and complete launch bill before commissioning.

The design removes the fixed `No campaign`, `Regional push`, and `National campaign` shortcut. A campaign's geography must come from the Day-One countries already selected in Define the Launch, not from a second conflicting geography selector.

## Current Problem

The current Build Money stage has four structural problems:

1. It opens with the bill while the actionable Opening Night Awareness section is much lower on the page.
2. Its three campaign choices are hardcoded at $0, $1.8M, and $4.6M and apply flat 1.00x, 1.55x, and 2.45x demand multipliers.
3. `Regional` and `National` do not have stable meanings when the player has selected several countries or countries across several regions.
4. Pricing is repeated as a large four-card section even though pricing is authored in Define the Launch. The HTML also uses semantic strike-through elements as small unit labels, which can draw unwanted crossed lines.

The fixed multiplier is especially unsafe because the World Economy already produces country/cohort/rival demand. Marketing must influence those country forecasts without replacing them or multiplying the entire world result blindly.

## Product Boundaries

### Define the Launch owns

- Day-One countries and clearances.
- Service identity and storefront.
- Catalogue and commercial offer.
- Plan prices, features, billing cadence, discounts, and revenue streams.
- The saved launch blueprint.

### The Build owns

- Facilities, racks, delivery architecture, capacity, and commissioning.
- The launch marketing ceiling and campaign plan.
- The combined affordability decision before infrastructure is commissioned.
- The load rehearsal against the marketing-adjusted opening demand.

### The Money stage does not own

- Editing subscription plans or prices.
- Selecting launch countries again.
- Marketing individual catalogue titles after launch.
- The ongoing weekly growth-action system.
- A second treasury or accounting model.

## Recommended Experience

The global `Studio Money / This Build` rail remains visible. Inside the Money stage, content appears in this order:

1. **Launch allocation** — available treasury, already committed launch costs, infrastructure due at commissioning, selected marketing ceiling, and projected treasury after the complete plan.
2. **Marketing ceiling** — dynamic Lean, Balanced, Heavy, and Event recommendations plus an editable custom value.
3. **Campaign plan** — objective, timeline, and channel mix. The common choice is compact; advanced allocation expands on demand.
4. **Country distribution and forecast** — where the money is expected to work, expected awareness, subscriber acquisition, opening concurrency, customer-acquisition cost, and confidence/risk.
5. **Complete launch bill** — itemized settled, due-at-commissioning, reserved, and weekly operating amounts.
6. **Commercial setup** — a compact read-only summary of plans, blended household price, billing cadence, and active revenue streams, with an `Edit pricing` route back to Define the Launch.

The page must never open with an unexplained `$0` campaign bill. A zero budget is shown as `Organic launch`, with an explicit explanation of the lower and less predictable awareness forecast.

## Campaign Decisions

### Marketing ceiling

The four labels are budget recommendations, not fixed packages:

- **Lean** — establishes a credible minimum presence in every launch market.
- **Balanced** — funds the model's best cost-to-acquisition mix.
- **Heavy** — buys wider awareness while accepting weaker marginal returns.
- **Event** — a high-pressure opening intended to create a major simultaneous moment.

Each amount is calculated from the currently selected countries and game state. A custom currency field accepts any finite non-negative planning amount within the game's standard safe currency range; affordability is not a hidden input cap. Entering more than the available amount creates a visible shortfall and blocks commissioning.

### Campaign objective

The player chooses one platform-level promise:

- **Introduce the platform** — brand familiarity and broad trial.
- **Showcase the catalogue** — range, discovery, and household value.
- **Lead with an original** — concentrate attention around the opening flagship.
- **Sell the value** — emphasize pricing, bundles, annual billing, or ad-supported access.

Objectives alter channel efficiency and audience fit; they do not grant free demand. An objective whose required input is missing remains selectable for planning but is clearly marked as weak or blocked. For example, `Lead with an original` requires an eligible opening original.

### Campaign timeline

Reuse the proven release-campaign concepts but calculate against the infrastructure ready week:

- **Front-loaded** — stronger early awareness with more decay before opening.
- **Balanced** — steady pre-launch spend with the most stable forecast.
- **Last-week push** — concentrated opening pressure with greater volatility.

The timeline is relative to `readyAtAbsoluteWeek`, so a four-week and a fifteen-week build produce different weekly schedules without creating a separate manual calendar.

### Channel mix

Reuse the Greenlight/Release Strategy allocation interaction, not its film-specific scoring. Initial streaming channels are:

- Social and digital
- Creators and influencers
- TV and outdoor
- Device and app-store placement
- Telco and bundle partners
- Press and launch events

Each channel definition may declare capability, technology, or market prerequisites. Unavailable channels remain visible with a research or market explanation. Future Technology and Product work can add channels through data definitions without changing the Money page.

## Geographic Allocation

The campaign footprint is always the non-exited Day-One opening-country set from canonical market operations. There is no `regional` or `national` campaign geography switch.

The default `AUTO` allocation distributes the campaign country by country. A market's weight is derived from:

- streaming-reachable households and participation;
- forecast conversion headroom under the current pricing;
- local advertising/media cost;
- purchasing power and consumer confidence;
- reliable internet access;
- localization and catalogue availability;
- active competitor count, rival strength, and current rival pressure;
- objective/channel fit;
- prior platform awareness, when available.

The engine normalizes positive weights into the budget ceiling, retains exact currency totals, and gives every eligible opening market a minimum viable presence before concentrating the remainder. When the ceiling cannot fund that minimum across all markets, it allocates the available amount proportionally and returns an explicit `INSUFFICIENT_MARKET_COVERAGE` warning.

An expandable advanced view allows `AUTO` or `MANUAL` country weights. Manual allocations cannot target an unselected or exited country. If opening markets change, auto allocations recompute; manual allocations are preserved where valid and flagged for review rather than silently redistributed.

## Canonical Forecast Model

A new pure service owns the launch-marketing forecast. React components only render its result.

For each country, the service starts from the existing World Economy launch-pricing forecast and estimates:

1. addressable paid-account headroom;
2. effective media cost for the chosen channels;
3. objective, localization, catalogue, pricing, and competitor fit;
4. awareness lift using a diminishing-returns curve;
5. trial/account conversion with a saturation ceiling;
6. opening-night concurrency derived from the resulting accounts and audience behavior.

The response curve must be monotonic but sublinear: more valid spending cannot reduce raw awareness, but doubling spend must not double acquisition indefinitely. Poor pricing, weak content, missing localization, market saturation, or heavy competition can make a large campaign inefficient. Zero spending still permits organic discovery; it does not receive paid-campaign lift.

The aggregate forecast exposes low, likely, and high cases. Rehearsal consumes the adjusted concurrency range, so a larger campaign can require more Traffic buffer or infrastructure. The forecast must not directly mutate World Economy state.

## Shared Data Model

Add these presentation-independent canonical types:

```ts
type StreamingLaunchMarketingObjective =
  | 'PLATFORM_INTRODUCTION'
  | 'CATALOGUE_SHOWCASE'
  | 'FLAGSHIP_ORIGINAL'
  | 'VALUE_PROPOSITION';

type StreamingLaunchMarketingTimeline =
  | 'FRONT_LOADED'
  | 'BALANCED'
  | 'LAST_WEEK_PUSH';

type StreamingLaunchMarketingAllocationMode = 'AUTO' | 'MANUAL';

interface OwnedStreamingLaunchMarketingDraft {
  schemaVersion: number;
  objective: StreamingLaunchMarketingObjective;
  timeline: StreamingLaunchMarketingTimeline;
  budgetCeiling: number;
  allocationMode: StreamingLaunchMarketingAllocationMode;
  countryWeights: Record<string, number>;
  channelAllocations: Partial<Record<StreamingLaunchMarketingChannelId, number>>;
  updatedAtAbsoluteWeek: number;
  revision: number;
}

interface OwnedStreamingLaunchMarketingPlan
  extends OwnedStreamingLaunchMarketingDraft {
  id: string;
  idempotencyKey: string;
  status: 'RESERVED' | 'SPENDING' | 'SETTLED' | 'CANCELLED';
  openingCountryIds: string[];
  committedAtAbsoluteWeek: number;
  startsAtAbsoluteWeek: number;
  endsAtAbsoluteWeek: number;
  spentAmount: number;
  returnedAmount: number;
  lastProcessedAbsoluteWeek: number | null;
  forecastSnapshot: StreamingLaunchMarketingForecastSnapshot;
}
```

`OwnedStreamingPlatformState` receives nullable draft and committed-plan fields. Normalization supplies safe defaults for old saves, and the platform schema version is increased. The draft remains editable until infrastructure commissioning. Commissioning stores an immutable forecast snapshot and a versioned configuration signature.

## Money and Reservation Semantics

- Editing the draft never moves cash.
- The budget ceiling is a maximum authorization, not a promise that the entire amount will be effective or spent.
- Add `MARKETING` to `StreamingCostCommitmentCategory`. Infrastructure commissioning creates one idempotent launch-marketing commitment with status `COMMITTED`; `availableToCommit` therefore excludes the remaining reservation.
- The commitment stores the original ceiling in `plannedAmount`, the unspent reservation in `committedAmount`, and cumulative actual spend in `paidAmount`.
- Weekly processing spends the scheduled amount once, reduces platform treasury, reduces `committedAmount`, and increments `paidAmount` and the plan's `spentAmount` atomically. Budget summaries count paid amounts even while a commitment remains partially committed.
- Spending never exceeds the ceiling, channel supply, country saturation, or remaining treasury.
- At Opening Night, the commitment's remaining `committedAmount` becomes zero and is recorded as the plan's `returnedAmount`; it was never deducted, so release does not credit invented cash. The final commitment status is `PAID` when any spend occurred and `CANCELLED` for a zero-spend reservation.
- A zero-ceiling Organic launch creates no cash commitment.
- Reopening or replaying commissioning cannot duplicate the reservation or weekly spend.

The complete launch bill separates:

- already settled Define-the-Launch costs;
- infrastructure due now;
- marketing ceiling reserved for the pre-launch schedule;
- expected weekly infrastructure operation;
- treasury remaining after all current commitments.

## Construction, Rehearsal, and Launch Rules

- Before commissioning, campaign edits immediately invalidate the previous load-rehearsal signature because they change demand.
- Commissioning locks facilities, rack duties, architecture, and the launch campaign draft together.
- During construction, weekly campaign spending follows the selected timeline and builds country-level awareness.
- Build progress remains driven by the canonical four-to-fifteen-week infrastructure clock.
- Opening Night remains locked until infrastructure is operational and the existing launch blockers are clear.
- If the opening is delayed after the campaign schedule ends, awareness decays deterministically each week; no additional spend occurs without a later explicit campaign action.
- Launch commitment consumes the stored forecast/awareness result once when calculating opening accounts and concurrency. It must not reapply a campaign multiplier.

## World Economy and AI Integration

The campaign engine accepts a platform offer, country footprint, treasury constraints, technology/capability profile, and campaign draft. It cannot depend on the player UI or player-only identifiers.

This permits player and AI platforms to use the same:

- country media-cost and saturation curves;
- diminishing-return acquisition model;
- awareness persistence and decay;
- competitive pressure;
- affordability, runway, and overspend constraints.

AI platforms choose objective, ceiling, timeline, countries, and channels from their strategy, cash/runway, catalogue, pricing, and competitive situation. Their results feed the same country competition state. AI decisions may be summarized for the player, but they do not need the Money-page React draft.

AI campaigns are persisted as compact strategy/forecast evidence. Scheduled
instalments enter the existing discretionary-cost ledger, while their bounded
subscriber benefit enters the existing audience-settlement ledger on the next
canonical week. This keeps spend, acquisition, saves, and repeated-week
idempotency inside established AI economy systems.

## UI and Accessibility

- Use the existing Build visual language and flat surfaces; do not transplant the whole film-release screen.
- The marketing ceiling and likely outcome are visible without expanding advanced controls.
- Advanced country and channel allocation uses compact accordions so a multi-country launch does not create an excessively long mobile page.
- Currency fields support direct entry, locale-aware display, keyboard editing, and plus/minus convenience controls.
- Every control has a text label, visible focus state, and at least the existing mobile touch target.
- Forecast confidence and risk use text/icons in addition to color.
- Pricing units use neutral `span` or `small` elements, never semantic strike-through markup.
- The pricing recap is read-only and routes to Define the Launch for edits.

## Failure and Edge Cases

- **No opening countries:** disable campaign planning and show `Choose Day-One markets in Define the Launch`.
- **No sellable pricing plan:** forecast organic awareness only and preserve the existing pricing blocker.
- **No catalogue/original for an objective:** show the specific weakness and exclude impossible claimed lift.
- **Zero budget:** label the plan `Organic launch`; allow commissioning when all other gates pass.
- **Budget shortfall:** preserve the draft, show the exact shortfall, and block commissioning without silently clamping the player's number.
- **Country removed:** discard no money; mark manual allocation stale and require review.
- **Locked/researched channel:** retain no hidden benefit and explain the requirement.
- **Old saves with `NONE`, `REGIONAL`, or `NATIONAL`:** migrate deterministically to Organic, Balanced auto, or Event auto using the old cost as the initial ceiling; do not retain the old multiplier.
- **Interrupted weekly processing:** use absolute-week/idempotency keys so resume cannot double-spend or double-apply awareness.
- **Opening delayed:** apply deterministic awareness decay and show the resulting forecast change.

## Implementation Boundaries

The implementation plan should isolate the work into these units:

1. Canonical types, normalization, migration, and persistence.
2. Pure country/channel recommendation and forecast service.
3. Reservation, weekly spending, awareness persistence, and launch consumption.
4. Build adapters and rehearsal signatures.
5. Money-stage presentation and compact pricing recap.
6. AI platform decision adapter and competition integration.
7. Determinism, save, economy, UI, and long-run verification.

The existing film `marketingStrategy` service may contribute generic allocation patterns, labels, and normalization ideas. Its film-specific fit, awards, opening-weekend, soundtrack, and box-office calculations must not be imported into the streaming-platform launch economy.

## Verification Contract

Automated verification must prove:

- recommended ceilings and country allocations are deterministic for identical inputs;
- recommendations change when countries, media costs, reachable households, competition, localization, or treasury constraints change;
- all country and channel currency allocations remain non-negative and never exceed the ceiling;
- higher valid spending produces monotonic but diminishing awareness lift;
- zero spending produces no paid lift;
- the campaign effect is applied exactly once to rehearsal and launch results;
- campaign edits invalidate rehearsals before commissioning;
- reservations and weekly spend are idempotent and treasury-conserving;
- unspent authorization is released without creating cash;
- old campaign IDs migrate without retaining flat demand multipliers;
- player and AI platforms use the same forecast kernel;
- multi-country UI remains compact and usable at 393x600 and 393x852;
- the crossed-line pricing-unit defect is absent;
- existing World Economy, infrastructure, linked-budget, launch, save-integrity, TypeScript, and production-build checks remain green, except for separately documented pre-existing failures.

Manual browser verification must cover Organic, custom, recommended, shortfall, multi-country auto allocation, manual allocation review, research-locked channels, construction lock, and Opening Night settlement.

## Implementation Verification — 2026-09-15

Passed scoped commands:

- `npm run audit:streaming-launch-marketing-types`
- `npm run audit:streaming-launch-marketing-forecast`
- `npm run audit:streaming-launch-marketing-lifecycle`
- `npm run audit:streaming-launch-marketing-build`
- `npm run audit:streaming-launch-marketing-ui`
- `npm run audit:platform-ai-launch-marketing`
- `npm run audit:platform-ai-launch-marketing-integration`
- `npm run audit:streaming-launch-marketing-long-run` twice with the same checksum, `20261ea5f6abe633b69c`
- `npm run audit:streaming-commercial-economy`
- `npm run audit:streaming-pricing-world`
- `npm run audit:streaming-build-world`
- `npm run audit:streaming-linked-budget-sheets`
- `npm run audit:streaming-build-plans-scale`
- `npm run audit:streaming-launch-phase8`
- `npm run audit:streaming-weekly-loop-phase10`
- `npm run audit:streaming-rivals-global-awards-phase20`
- `npm run audit:platform-ai-economy`
- `npm run audit:platform-ai-scalability`
- `npm run lint`
- `npm run build`
- `git diff --check`

Browser verification passed at `393x600` and `393x852` against
`http://127.0.0.1:3000`. It exercised Organic, a recommendation, direct custom
currency entry, an unaffordable preserved value, objective and timeline changes,
the advanced channel panel, manual country allocation, locked-channel copy, and
horizontal-overflow checks.

Separately confirmed unchanged baseline failures:

- `npm run audit:streaming-design-system` flags the unchanged
  `StreamingBoardroomExperience.tsx` and `StreamingFinanceRoom.tsx` interaction
  scopes.
- `npm run audit:streaming-road-to-opening-phase3` flags the pre-existing direct
  storefront research-gate bypass.

Neither flagged file/path was modified by this implementation, and neither
failure is represented as a launch-marketing regression.

## Non-Goals

- Rebuilding Define the Launch pricing.
- Letting Money edit countries or market clearances.
- Replacing post-launch Growth actions or title-level slate marketing.
- Simulating individual advertising impressions.
- Guaranteeing subscribers or revenue from a forecast.
- Making marketing a substitute for catalogue quality, pricing fit, localization, or infrastructure capacity.
