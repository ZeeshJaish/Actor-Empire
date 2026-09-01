# Streaming Catalogue Packages Phase A5 Design

**Status:** Final specification — awaiting user approval on 2026-09-01
**Depends on:** A1 canonical contracts, A2 active bidding and settlements, A3 rights compatibility, A4 Rights Calendar and control modes
**Next after completion:** A6 two-sided acquisition and resale synchronization

## Approved scope correction

Phase A5 is **Catalogue Packages and Portfolio Licensing**. Future-output deals are removed from Project A's required scope and deferred as a possible long-term studio-partnership feature.

Netflix, Disney, Prime Video, and other platforms continue to request new productions through the existing single-project commissioned-original flow. A successful Empire Studios delivery may improve the relationship and cause another commission later, but A5 never reserves rights to movies that do not exist.

This keeps two distinct commercial actions:

- a **commission** orders and funds one real production through the existing Platform AI and Production House pipeline; and
- a **catalogue package** licenses two or more existing completed titles together.

## Purpose

A5 lets a studio with a 30-40 title library negotiate at portfolio scale without creating a second rights engine or hiding title-level truth.

The player can market a coherent group of completed titles as one lot, receive competing package offers, approve one commercial decision, and still retain exact contracts, expiry, backend, investor, territory, and attribution records for every title.

## Canonical architecture

`WorldState.streamingRightsContracts` remains the only legal rights authority. A package is a negotiation and presentation envelope, never a mega-contract.

Canonical flow:

`real completed titles -> A3 component checks -> saved package envelope -> A2 bidding/negotiation -> atomic acceptance -> title-level A1 contracts -> A4 expiry and renewal`

The package registry owns only:

- package identity and lifecycle;
- the fixed list of real component project IDs;
- the exact eligible rights lot for each component;
- persisted exclusions and factual explanations;
- the package bidding session, accepted offer, and deterministic allocation;
- control-mode and protection facts; and
- links to the resulting canonical contracts.

Actual ownership, permitted use, settlement, expiry, renewal, royalty, release eligibility, and resale remain derived from the child contracts.

## Reused systems

A5 extends rather than replaces:

- `streamingRightsCore.ts` for normalized canonical contracts and exact-once registration;
- `streamingRightsCompatibility.ts` for territory, country, date, window, exclusivity, and final-signature validation;
- `streamingBidding.ts` for the shared clock, equal platform cooldown, revisions, withdrawals, final offers, clearing bidder, deterministic restoration, and no player counteroffer;
- `streamingContractSettlement.ts` and existing title revenue attribution for independent backend settlement;
- `streamingRightsCalendar.ts` for child-contract expiry, renewal lineage, control modes, and grouped deadlines;
- Production House project ownership, archive, investor terms, finance ledger, energy cost, and platform relationships;
- Platform AI cash, runway, spending restrictions, catalogue gaps, strategic countries, localization capability, content plans, and existing `CATALOGUE_ACQUISITION` sourcing route;
- EMPIRE+ Rights Exchange opportunities and term-sheet workflow; and
- deterministic IDs, save migration, save compaction, and weekly processing.

The existing Platform AI catalogue-acquisition code currently groups a few NPC-studio projects and divides cost equally. A5 replaces that ad hoc package calculation with the shared package builder, valuation, allocation, compatibility, and registration path. The Platform AI weekly loop itself is not redesigned.

## Persisted package model

Add a versioned `WorldState.streamingCataloguePackages` registry.

### Package

Each package persists:

- schema version, ID, and idempotency key;
- source: player-curated, Rights Desk proposal, Platform AI sourcing, or owned-platform market listing;
- lifecycle: `DRAFT`, `READY`, `LIVE`, `SIGNED`, `WITHDRAWN`, or `INVALIDATED`;
- package name, seller snapshot, creation week, start week, requested window, and maximum common duration;
- requested country snapshot and summarized territory;
- a deterministic ordered list of eligible components;
- excluded project snapshots with conflict codes and short factual explanations;
- control mode at creation, protected reasons, delegated reason, and whether manual approval is required;
- bidding session ID, accepted offer ID, signing week, total guarantee, and total expected exposure; and
- the accepted per-title commercial schedule, component contract IDs, and exact guarantee allocations after signing.

### Component

Each eligible component persists:

- canonical source project ID;
- title, movie/series type, genre, original language, seller studio ID, and ownership snapshot;
- quality, audience, budget, theatrical/streaming proof, and franchise/protection facts used for saved valuation;
- its immutable A3 bidding lot, including exact countries excluded from the requested scope;
- persisted independent reference value and normalized reference weight;
- deterministic bidder-value inputs, bidder-fit weight, and bounded allocation result; and
- accepted child guarantee, backend terms, buyer cost basis, and resulting contract ID when signed.

Snapshots prevent reload rerolls. The source project must still exist at signing, and the final A3 check remains authoritative.

### Bidding extensions

Existing title sessions normalize to `TITLE`. Package sessions use `CATALOGUE_PACKAGE`, point to one package ID, and carry immutable component lots. Existing session fields remain migration-compatible.

Package offers add deterministic per-title commercial rows. A package offer uses one duration and exclusivity mandate, while each row carries that title's exact countries, window, language requirements, allocated guarantee, backend percentage, recoupment rule, and backend cap. The headline package terms are aggregates of those rows, never a second source of commercial truth.

Completed-title packages cannot contain production funding or future-season funding. Their structures are limited to flat licences or guarantee-plus-title-backend terms.

## Eligibility and package composition

A player package may contain 2-12 real titles from the same controlled Production House. Rights Desk suggestions target 3-8 titles so a large library is manageable without creating an unreasonably concentrated transfer.

A title is eligible only when:

- it is a real completed project in the player's canonical production/archive data;
- the selected Production House controls the licensable rights;
- it is not an outsourced platform commission or another project for which the player lacks profit rights;
- it is not already reserved in another live package for overlapping scope;
- it has a non-empty compatible scope from A3 for the requested start week and window; and
- it is not malformed, cancelled, or merely a concept/script placeholder.

The package has one requested country set, start week, window type, and maximum duration. A3 evaluates every component separately:

- a fully compatible title receives the full requested country set;
- a partially available title keeps only its exact remaining eligible countries and shows the excluded markets;
- a title with no eligible market is excluded with a short reason; and
- the package cannot proceed unless at least two eligible components remain.

The package duration cannot exceed the shortest component maximum. Component scopes are frozen when the room opens. There is no silent expansion from bounded rights to global rights.

The package is all-or-nothing for a bidder. Before the room opens, a platform is eligible only if it can legally acquire every component's fixed scope and can carry the package's minimum fixed exposure. That exposure can never be lower than `$1M * eligible title count`, ensuring every signed title receives a meaningful positive allocation. A package with no capable bidder stays `READY`; the UI asks the player to remove titles, narrow the scope, or try a later market cycle instead of inventing an offer.

## Market reservations and concurrency

A `LIVE` package reserves only its exact component scopes. Another live room cannot market an overlapping project/country/window/exclusivity scope from the same seller.

Leaving or withdrawing the room releases that reservation. Signed child contracts replace it with canonical legal control. Draft and suggested packages do not block another transaction.

Acceptance rechecks:

- package and session identity;
- immutable component membership and lots;
- accepted offer status and allocation sum;
- project existence and seller control;
- bidder cash and spending authority;
- every A3 component result; and
- absence of an already-settled package idempotency key.

If any component fails, nothing changes: no contract, cash, ledger entry, relationship change, energy use, catalogue entry, or partial package signing is allowed.

## Package valuation and offers

The current A2 single-title valuation becomes the component base. It continues to use quality, budget suitability, theatrical proof, exact market value, strategic countries, platform catalogue gaps, subscriber opportunity, relationship, and ability to pay.

For each platform:

1. Calculate expected value for every component through the shared title evaluator.
2. Sum component expected values.
3. Apply a bounded portfolio multiplier from `0.72` to `1.18`:
   - up to `+0.08` anchor premium when one strong title materially raises package acquisition value;
   - up to `+0.10` catalogue-gap and strategic-market fit;
   - up to `-0.12` redundancy or audience-overlap penalty; and
   - `-0.01` integration cost for each title after the fourth, capped at `-0.06`.
4. Apply the existing relationship and financial-capacity boundaries.
5. Cap fixed exposure by real cash, acquisition ceiling, runway, and spending restrictions, while preserving the `$1M` minimum allocation per title.

These are platform-specific values. A prestige platform, regional service, broad global platform, and distressed buyer can value the same package differently.

### Hybrid title allocation

Every bid exposes a complete title-by-title allocation before the player accepts it. The allocation is neither an equal split nor a free-form number chosen by the buyer.

For a package with `n` titles and total guarantee `G`, the allocator first reserves the `$1M` title floor and sets `R = G - ($1M * n)`. The room cannot open unless `R >= 0`. It then persists two normalized weights for every title:

- `referenceWeight`: the title's independent Rights Desk share of package value, calculated without using the current bidder's preferences; and
- `bidderWeight`: that platform's saved component value, including catalogue gap, audience fit, strategic countries, localization utility, relationship, and expected commercial performance.

The preliminary allocation is:

`hybridWeight = 15% * (1 / n) + 60% * referenceWeight + 25% * bidderWeight`

`preliminaryAllocation = $1M + (R * hybridWeight)`

The 15% equal base prevents small catalogue titles from disappearing, the 60% reference share preserves neutral market reality, and the 25% bidder share lets different platforms make meaningfully different offers for the same package.

For guardrail purposes, each title's independent reference allocation is `$1M + (R * referenceWeight)`. Its final dollar allocation is constrained to:

- a lower bound of the greater of `$1M` or `50%` of that independent reference allocation; and
- an upper bound of `175%` of that independent reference allocation.

Reserving the floor before weighting makes the bounds feasible even when one title holds almost all neutral value. A deterministic constrained redistribution pass reallocates any amount clipped by those bounds. A final largest-remainder pass converts values to the game's integer-money unit while preserving all bounds. The result must satisfy all of the following:

- every eligible component appears exactly once;
- every title receives at least `$1M`;
- every allocation stays inside its independent-value guardrails;
- stronger and weaker titles may receive different allocations;
- different bidders may produce different valid schedules;
- allocations sum exactly to `G`; and
- reload, replay, and repeated offer revision reproduce the same schedule from the saved inputs.

Hidden reference and bidder scores remain hidden. The resulting dollar schedule is shown to both buyer and seller. The player cannot manually assign a token value to an investor-backed hit to redirect accounting.

For example, a valid `$500M` eight-title offer could display:

| Title | Upfront allocation | Licensor backend |
| --- | ---: | ---: |
| Project A | `$140M` | `1%` |
| Project B | `$95M` | `3%` |
| Project C | `$75M` | `5%` |
| Project D | `$60M` | `4%` |
| Project E | `$45M` | `6%` |
| Project F | `$35M` | `5%` |
| Project G | `$28M` | `7%` |
| Project H | `$22M` | `8%` |
| **Package** | **`$500M`** | **title-specific** |

This table is illustrative; real values come from the persisted formula and constraints.

### Per-title commercial schedule

Each offer allocation row persists:

- component project ID and immutable component lot ID;
- allocated minimum guarantee;
- licensor and platform revenue shares;
- guarantee recoupment rule;
- backend cap, when present;
- exact countries, window, duration, exclusivity, and language requirements; and
- expected royalty and total-exposure projections used for validation and platform planning.

Backend terms may differ by title. A bidder can place more upfront money on a dependable title and stronger backend on a volatile breakout candidate, provided the package remains within its commercial and financial limits. Completed-title packages still cannot include production funding or future-season funding.

The top-level offer derives its total guarantee, expected royalties, maximum exposure, and displayed backend range from the rows. Every child contract copies its own row rather than inheriting a misleading package-average backend.

Offer revisions may change the package total and regenerate the per-title commercial schedule. The bidder cannot directly type arbitrary allocations; the same hybrid allocator and guardrails apply to every revision.

If the cheapest-allocated title later becomes the package's largest hit, the deal is not retroactively repriced. The buyer made a successful risk decision. The seller receives that title's contracted backend if one exists; under a flat licence the buyer keeps the upside. When the contract reaches A4 renewal, actual realized performance raises that title's new market reference and may make renewal substantially more expensive.

The bidding room retains the approved behavior:

- one universal room clock;
- equal platform action cooldowns;
- offer revisions that may rise, fall, or restructure;
- platform withdrawal or final terms;
- no player counteroffer;
- no automatic visible `best offer` label; and
- no automatic winner when the room closes.

The compact package offer card shows total guarantee, title count, headline scope, duration, exclusivity, backend range, and exceptions. A drill-down shows the full title commercial schedule without exposing hidden platform scores.

## Atomic signing and accounting

Package acceptance is one transaction boundary.

The service first stages every normalized child contract against a temporary registry. Only after every validation succeeds does it commit:

- one signed package record;
- one canonical child contract per component, all sharing `cataloguePackageId`, bidding session ID, and source offer ID;
- the exact component commercial row, including guarantee, backend, recoupment, cap, and scope;
- one platform fixed-exposure deduction;
- one gross package receipt, per-project revenue attribution, and per-project investor obligations;
- the Production House's net balance, weekly/lifetime finance totals, and bounded ledger entries;
- one package-level completed-deal relationship event, avoiding title-count relationship inflation;
- Platform AI/owned-platform catalogue and content-plan projections, including each title's allocated acquisition cost basis, linked to all child contract IDs; and
- one administrative streaming-deal energy charge for the package, not one charge per title.

Existing investor calculations run against each title's allocated guarantee. The package receipt minus those exact payouts equals the Production House balance increase.

Guarantees are marked settled once. Weekly royalty settlement remains title-level and uses existing attributed adjusted gross, recoupment, backend cap, buyer cash, seller balance, and idempotency logic.

The cash movement remains simple: the buyer pays the total guarantee once and the seller receives it once. The signed allocation schedule is the accounting breakdown used by both sides:

- the seller credits each project with its allocated guarantee and calculates that project's investor obligations from the same amount;
- the buyer records the identical allocation as that title's acquisition cost basis;
- title revenue, localization expense, marketing expense, recoupment, royalty, and ROI continue independently after signing; and
- package-level finance equals the exact sum of its title-level records.

The accepted schedule is also the historical reference for future renewal valuation. No later performance result rewrites the original sale allocation.

Retrying an accepted offer returns the existing signed package and contracts without a second payment or energy charge.

## Control modes and workload

The existing `StreamingRightsManagementState` gains a package policy rather than a separate management system. Existing protected project IDs apply to both renewals and packages.

The safe migrated/default policy is:

- suggestion-only automation;
- preferred package size of 3-6 titles;
- maximum automatic package size of 7 titles;
- maximum automatic duration of 104 weeks;
- non-exclusive automatic terms only;
- no automatic global scope;
- minimum automatic guarantee of 85% of the saved Rights Desk reference value; and
- franchise, universe, sequel, and manually protected projects excluded from automation.

### Strategy

The Rights Desk may prepare at most one new routine proposal per four-week market cycle and keeps at most three unresolved proposals. Routine package execution may be delegated only when package automation is explicitly enabled and every term is within the saved mandate. The delegated desk simulates the complete deterministic room, waits for its closing state, and then selects according to the saved preference with its reason recorded. An interactive room never selects a winner automatically. One digest explains what was packaged, marketed, signed, or skipped.

### Custom (default)

The Rights Desk proposes packages and lets the player:

- pin titles out of all automatic packages;
- choose suggest-only or routine automatic execution;
- set preferred package size;
- permit or forbid global scope, exclusivity, and long duration;
- set a minimum automatic guarantee relative to saved desk value; and
- take control before a live delegated decision finalizes.

The safe default is suggestion-only. One package review replaces many title prompts.

### Full

The player selects every component, scope, start, window, duration, and room entry. The platforms still compete with each other; Full Control does not add player counteroffers.

### Mandatory approval

All modes require player approval when a package contains a protected/franchise/universe title, requests global exclusivity, exceeds seven titles, exceeds the saved duration mandate, loses more than 25% of requested market value for any component through a partial-scope exception, or offers less than the saved valuation floor. The safe default valuation floor is 85% of the persisted Rights Desk reference value.

## Player and AI surfaces

### Production House

The existing Rights Calendar division gains a separate compact `Package Desk` view. It shows:

- eligible catalogue count;
- Rights Desk suggestions;
- active package rooms;
- signed packages; and
- factual exclusions.

Manual creation uses a searchable/filterable title list, one scope editor, a live eligibility summary, and one package preview. It does not add package badges that compete with project-stage or IMDb badges.

Project detail receives one restrained line such as `Empire Crime Collection - Netflix - UK and remaining eligible markets - through W240`.

### Package bidding room

`StreamingBiddingRoom` retains its visual language and tension. A package room adds a compact package header and expandable title list. It must fit mobile widths without horizontal overflow and must not show 12 full title cards simultaneously.

The seller sees the complete per-title guarantee and backend schedule before accepting. The room still presents one package decision: the player cannot accept attractive titles and reject weaker titles after bidding has begun.

### EMPIRE+ Rights Exchange

The existing Market Floor may list real NPC-studio packages built by the shared service. The player-owned platform negotiates the package through the existing table and signs through the same atomic child-contract boundary. This covers primary studio catalogue licensing; platform-to-platform resale remains A6.

The owned platform pays the package total once and receives the same title-level cost basis used by seller accounting. Existing EMPIRE+ negotiation may adjust headline terms and the total guarantee; every change deterministically regenerates the bounded allocation schedule. The player may not manually assign arbitrary title values to manipulate investors, royalties, or ROI.

### Platform AI

The existing `CATALOGUE_ACQUISITION` route uses the shared package builder and evaluator. It must respect actual projects, exact A3 scope, cash/runway, localization capability, catalogue integration capacity, and controller state. Player acquisition removes autonomous AI decisions but does not rewrite signed historical package economics.

### Weekly progression

Weekly progression may create or resolve delegated proposals, but it produces one grouped Rights Desk digest. Only a protected package decision near its deadline may create one idempotent inbox notice. Industry news and social reactions remain deferred.

## Bulk renewal preparation

Child contracts remain separate A4 cases. A5 groups cases sharing a `cataloguePackageId`, incumbent buyer, compatible next scope, and decision window into one review card.

The player may:

- approve the compatible batch;
- exclude or pin individual titles;
- return selected components to market; or
- open a title for manual control.

Batch execution prevalidates all included cases and then applies their existing A4 resolution logic to a staged player snapshot. If one included action fails, the batch commits nothing. Every successful renewal still creates its own replacement contract and `renewedFromLicenseId` lineage.

An excluded title remains a normal A4 case; it is never silently renewed or expired because the package changed.

## Migration and bounded persistence

- Missing A5 state normalizes to an empty versioned registry and a safe suggest-only package policy.
- Existing A1-A4 contracts and sessions remain unchanged.
- Old bidding sessions without a subject kind normalize to `TITLE`.
- Existing Platform AI contracts that share a valid non-null `cataloguePackageId` may reconstruct one historical `SIGNED` package projection only from those real contracts. Migration never creates new rights or money.
- Malformed packages cannot create contracts, reserve rights, or appear as signed.
- Save compaction preserves live packages, signed packages referenced by active contracts or renewal lineage, and bounded recent history.
- Deterministic component ordering and IDs make save/reload and same-week replay stable.

## Failure behavior

- Fewer than two compatible titles: keep the proposal editable and explain which titles were excluded.
- No capable bidder: do not open a room; suggest a smaller package, narrower scope, or later cycle.
- Rights change before signature: invalidate the acceptance atomically and rebuild from current eligible scope.
- Treasury/runway change: block signature without partial payment.
- Component project missing or no longer controlled: invalidate that proposal; never substitute another title silently.
- Allocation mismatch, missing/duplicate row, out-of-bound title value, or row total disagreement: reject the offer as malformed.
- Aggregate guarantee, royalty, or exposure disagreement with the title rows: reject before signing and make no finance or contract mutation.
- Repeated action: return the existing package result without side effects.
- Platform AI projection failure after validation: do not commit canonical contracts or money; the transaction is all-or-nothing.

## Out of scope

- Future-output and multi-picture deals
- Automatic ownership of future productions
- Platform-to-platform resale, distress resale expansion, and permanent catalogue purchase (A6)
- Full Rights Office analytics and commercial statements (A7)
- Final package concentration balance and endurance certification (A8)
- Commissioned-original redesign
- Industry news, X/Instagram reactions, and social drama
- Lawsuits, breach litigation, and contractual termination disputes

## Work sequence

1. Add versioned package types, normalization, default state, migration, and compaction.
2. Implement pure eligibility, component-lot, reservation, valuation, allocation, and protection helpers.
3. Extend A2 sessions/offers compatibly for package subjects.
4. Implement the bounded hybrid allocator and per-title commercial schedule.
5. Implement atomic package signing and mirrored seller/buyer title-level accounting.
6. Connect Production House Package Desk and package bidding room.
7. Connect Strategy, Custom, Full, protected approval, and grouped digests.
8. Connect package renewal grouping to existing A4 cases.
9. Replace Platform AI's ad hoc catalogue grouping with shared package logic.
10. Connect real NPC package opportunities to EMPIRE+ without implementing A6 resale.
11. Add migration, repeat-action, conflict, finance, Platform AI, UI, and browser audits.

## Completion criteria

- Every component is a real, seller-controlled completed project.
- Every package component is validated by A3 before room entry and again before signature.
- Live overlapping package reservations cannot double-market the same exact scope.
- Every signed component creates one canonical title contract and no package mega-contract.
- Every bid exposes a complete title-by-title commercial schedule before acceptance.
- The 15/60/25 hybrid allocation is deterministic, bidder-sensitive, reference-bounded, and gives every title at least `$1M`.
- Child guarantees sum exactly to the accepted package guarantee, including a `$500M` eight-title audit fixture.
- Different bidders can produce different valid allocations for the same package without crossing the `50%`/`175%` reference guardrails.
- Missing, duplicate, out-of-bounds, or mismatched allocation rows fail without side effects.
- Platform cost, studio receipt, investor payouts, energy, and ledgers reconcile exactly once.
- Seller project revenue and buyer title cost basis mirror the accepted allocation exactly; investor accounting cannot be redirected by a free-form buyer split.
- Backend settlement and A4 expiry/renewal remain title-level and deterministic.
- A low-allocation breakout title settles only its own backend and later renews from realized performance without retroactive repricing.
- Platform AI and player-owned platform package paths use the shared package service.
- Strategy, Custom, Full, protected approval, pinning, and takeover behave as specified.
- A 40-title library can be handled through grouped proposals without popup spam.
- Legacy saves and existing title bidding remain compatible.
- Repeated acceptance and replay produce one payment, one energy charge, and the same child contracts and allocation schedule.
- Focused A1-A5, hybrid-allocation, marketplace, Platform AI, Production House, migration, save-compaction, build, server-render, and mobile/desktop browser checks pass.
