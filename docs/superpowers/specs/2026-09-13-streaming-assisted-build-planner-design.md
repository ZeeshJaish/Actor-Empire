# Streaming Assisted Build Planner Design

Date: 2026-09-13  
Status: Approved in chat; awaiting written-spec review  
Scope: Player-owned streaming platform, Build wizard

## Purpose

Replace the transplanted Build wizard's static assisted presets with a market-aware, budget-aware team planner while preserving complete hands-on control for players who want it.

The planner must reuse Actor Empire's canonical launch markets, World Economy demand, facility marketplace, infrastructure derivation, treasury, management policy, and launch rehearsal. It must not introduce a second infrastructure or demand calculator.

## Existing problem

The current Sites stage treats Starter Rack, Essential Grid, Growth Network, and Premiere Network as fixed buttons. Its local `applyPlan` function:

- selects only cities already marked recommended;
- divides racks with `Math.round(racks / cityCount)`;
- does not distribute the remainder;
- can return fewer cities than a preset requests;
- applies plans without respecting the displayed team budget ceiling;
- estimates the team draft using a fixed per-rack amount instead of the canonical facility quote.

This produces incorrect results. Growth requests seven racks across three cities but creates six. Premiere requests ten racks across four cities but can create nine across only three. Because selection styling compares the resulting totals with the preset totals, these cards appear not to select.

The underlying Build adapter already receives the chosen countries and canonical World Economy demand. The defect is in the transplanted assisted-planning path, which bypasses those systems.

## Design principles

1. In Assisted mode, budget and intent are inputs; the network is the output.
2. In Hands-On mode, the four network packages remain exact quick-start templates.
3. A budget allocation is an authorization ceiling, not money already spent.
4. The team uses the smallest credible plan that satisfies its brief. It does not waste unused allocation.
5. No plan is applied, commissioned, or charged without the player's approval.
6. Missing or impossible inputs produce a visible explanation, never a silent no-op.
7. Commissioning remains the only action that executes contracts and moves treasury money.

## Assisted-mode player flow

### 1. Prerequisite check

The team requires at least one explicitly selected opening market.

If no opening market is selected, Sites displays:

> Opening markets have not been chosen. Your team cannot size viewer demand.

The screen provides a `Choose opening markets` action back to Define the Launch. Assisted drafting remains unavailable. The player may still enter Hands-On mode to inspect markets and facility listings, but commissioning remains blocked until Define the Launch is complete.

Legacy market fallbacks may keep old saves readable, but they must not make a new launch look explicitly configured when it is not.

### 2. Team instructions

The player sets:

- priority: Save cash, Balanced, Stay online, or Premium;
- risk tolerance: Careful, Normal, or Fast;
- maximum Build allocation;
- approval threshold for expensive changes;
- optional preferred cities already supported by the management policy.

The allocation accepts both suggested values and a custom numeric amount.

### 3. Dynamic budget suggestions

Suggestions are recalculated from the current launch rather than stored as global fixed amounts:

- **Minimum viable**: the cheapest valid network that can serve likely demand with a content origin and a valid path to every opening market.
- **Recommended**: likely demand plus ordinary capacity headroom and sensible geographic resilience.
- **Premiere-safe**: high-demand forecast plus stronger failover and burst protection.
- **Custom**: any valid player-entered ceiling within supported game limits.

The suggestion calculation uses:

- selected opening countries and their regions;
- canonical World Economy low, likely, and high opening-demand forecasts;
- current pricing and commercial reach effects;
- available facility listings and their actual move-in, operating, energy, tax, and capacity constraints;
- architecture and ownership mix;
- build doctrine and risk choice;
- existing infrastructure that can be reused;
- already committed launch spending;
- streaming-platform treasury and post-build runway;
- the player's priority and approval threshold.

The budget ceiling is a constraint. It is not a target the team must exhaust.

### 4. Planning cinematic

After `Ask the team to prepare a plan`, the Build wizard shows a mandatory 1–2 second planning cinematic. It is not skippable.

The cinematic depicts real stages of the deterministic calculation:

1. the world map identifies the selected opening markets;
2. candidate facility cities light up and routes are drawn;
3. server racks appear in the chosen facilities;
4. costs move through the allocation and treasury trail;
5. a short opening-night capacity test completes;
6. `Plan ready` appears before the proposal opens.

The sequence must use the actual selected countries, candidate cities, rack count, and calculated amounts. It must not display random geography or fake figures. The animation duration remains short, and reduced-motion accessibility may simplify the movement without bypassing the sequence.

### 5. Proposal review

Planning creates a pending proposal. It does not immediately overwrite the current Build draft.

The proposal shows:

- opening countries and regions covered;
- facility cities and roles;
- exact rack distribution;
- owned-versus-rented architecture;
- likely and high-demand capacity;
- resilience and failover result;
- build duration;
- commissioning cost and weekly operating cost;
- operating reserve;
- allocation used and allocation left unused;
- treasury that would remain after commissioning;
- approval-threshold status;
- important risks and compromises;
- concise reasons for the team's decisions;
- the resulting network class.

The player can:

- approve and apply the proposal;
- alter instructions and request another proposal;
- reject it and take Hands-On control.

Changing markets, pricing, facilities, instructions, or relevant research invalidates a pending proposal. The UI explains what changed and asks for a new plan.

## Planning logic

The canonical assisted planner is the only source of generated team plans. The Sites presentation must call it rather than implementing rack and cost rules locally.

The planner performs these steps:

1. Validate explicit opening markets and unlocked requirements.
2. Obtain low, likely, and high country demand from the World Economy forecast.
3. Build a city candidate list:
   - first, one suitable city for each selected launch region;
   - then additional cities inside the largest selected markets;
   - then other eligible cities inside selected launch regions when needed for resilience;
   - never an unrelated region without explicit player intent.
4. Evaluate real facility listings, physical constraints, move-in costs, operating costs, provisioning time, and research locks.
5. Generate viable topologies inside the allocation.
6. Assign an origin, regional relays, local edges, encoding, platform services, and premiere capacity as required by the selected markets and current technology.
7. Quote each candidate through the canonical infrastructure derivation.
8. Evaluate likely load, high load, latency, buffering, regional failure exposure, and post-build runway.
9. Select the best candidate using the player's priority and risk tolerance.
10. Return a complete proposal or an explicit failure with the minimum additional budget or missing requirement.

When no feasible plan exists under the allocation, the team does not apply a broken network. It reports the reason and offers grounded alternatives such as:

- raise the Build allocation;
- reduce opening markets;
- use a more rented or cloud-heavy architecture;
- accept lower resilience;
- research a locked facility or delivery capability;
- add platform capital.

## Network classification

Starter, Essential, Growth, and Premiere become capability classifications in Assisted mode. They are not determined by spending alone.

- **Starter Rack**: every opening market has a delivery path and the network has a valid origin, but it has fewer than two facility cities or remains exposed to a single-city outage.
- **Essential Grid**: at least two facility cities serve every opening market and likely demand fits inside total available capacity, but it does not satisfy Growth resilience and headroom.
- **Growth Network**: at least three facility cities serve every opening market, likely demand fits inside steady capacity with at least 25% headroom, and losing one non-core city cannot take the whole service offline.
- **Premiere Network**: at least three facility cities serve every opening market without a poor or unstable country route, high demand fits inside total steady-plus-burst capacity, and likely demand still fits after removing the largest single facility's usable capacity.

An unusually expensive two-city plan remains Essential if its capability is Essential. A cheap but highly effective topology may earn a higher class if it genuinely passes the corresponding capacity and resilience rules.

Classification is evaluated from highest to lowest so a network receives the strongest class whose complete requirements it satisfies. These thresholds live with the canonical planner and are covered by deterministic tests.

## Hands-On mode

Hands-On mode keeps the four package cards as quick-start templates:

- Starter Rack: two racks in one city;
- Essential Grid: four racks across two cities;
- Growth Network: seven racks distributed `3 + 2 + 2` across three cities;
- Premiere Network: ten racks distributed `3 + 3 + 2 + 2` across four cities.

Template placement uses eligible cities in selected launch markets and regions. It fills regional coverage first and then adds second cities to the largest opening markets for resilience. Every template either applies its exact advertised result or visibly explains why it cannot.

After applying a template, the player may change every facility, rack duty, architecture, ownership share, repair, campaign, and rehearsal decision.

## Managed later stages

After the player approves an assisted proposal, the remaining Build stages stay visible but become read-only while the team retains control:

- **Plans** explains rooms, rack duties, architecture, ownership mix, physical constraints, and planned repairs.
- **Money** explains actual commitments, weekly costs, runway, pricing inputs, and campaign effects.
- **Test** shows the team's rehearsal evidence and any risks.
- **Launch** presents the final contract and remains a player-only decision.

Every managed stage carries a consistent `Managed by your team` state and a persistent `Take control` action.

Taking control:

- preserves the approved team plan as the editable starting point;
- unlocks all relevant controls;
- invalidates rehearsal evidence only when a material configuration value changes;
- does not spend money.

Handing control back:

- retains the manual configuration until a replacement proposal is approved;
- generates a new pending proposal;
- never silently overwrites player changes.

The team can never commission the network or release treasury funds for the player.

## Budget and cash presentation

The Build rail separates authorization from spending and shows:

1. streaming-platform treasury;
2. launch commitments already paid or reserved;
3. maximum allocation authorized to the team;
4. proposed infrastructure and reserve cost;
5. unused allocation;
6. projected treasury after commissioning;
7. projected weekly operating cost and runway.

The rail must not subtract the allocation itself. Only the proposal's real cost is included in the projected post-commissioning balance, and no money moves until commissioning.

## Persistence and migration

The existing streaming infrastructure management policy remains the saved source for mode, priority, maximum budget, risk tolerance, preferred cities, and approval threshold.

The implementation adds only the minimum state needed to distinguish:

- current applied Build draft;
- pending assisted proposal;
- the inputs/signature used to create that proposal;
- whether the proposal has been approved;
- the resulting capability classification.

Old saves keep their existing Build draft and management policy. Missing new fields receive safe defaults. Existing commissioned infrastructure is never regenerated or repriced during migration.

## Error handling

- Missing markets: assisted drafting is blocked with a route to Markets.
- Insufficient eligible cities: the exact missing coverage or facility requirement is shown.
- Research-locked facilities: the required research is named; the planner seeks unlocked alternatives first.
- Insufficient allocation: the minimum credible amount and alternatives are shown.
- Insufficient treasury: the proposal may be reviewed, but approval or commissioning directs the player to Studio Finance as appropriate.
- Stale proposal: approval is blocked until the team recalculates.
- No viable origin: no proposal is produced.
- Invalid legacy data: normalized through existing save and infrastructure migration rules without replacing historical infrastructure.

## Verification

Focused automated coverage must prove:

1. Growth creates exactly seven racks across three cities.
2. Premiere creates exactly ten racks across four cities.
3. Rack remainders are deterministic.
4. Extra cities stay inside selected launch markets or regions.
5. Missing markets block assisted drafting and expose the Markets route.
6. Different market selections and World Economy forecasts can change the proposed topology.
7. Different budget ceilings can change the proposal without forcing the team to spend the entire ceiling.
8. A proposed plan never exceeds its authorized budget; the separate approval threshold can require founder approval for a plan that is still inside that budget.
9. The canonical facility quote, not a fixed per-rack estimate, supplies costs.
10. A pending proposal does not mutate the applied draft.
11. Approval applies the proposal but does not charge treasury.
12. Commissioning charges the canonical amount exactly once.
13. Assisted later stages are read-only and Hands-On mode unlocks them without resetting the plan.
14. Taking control and handing control back preserve player changes until replacement approval.
15. The planning cinematic uses proposal data and lasts within the approved 1–2 second envelope.
16. Legacy saves remain loadable and commissioned infrastructure remains unchanged.
17. Production build and existing infrastructure, World Economy, save-integrity, week-progression, and launch audits remain green.

Browser verification must cover a real player-owned streaming platform with:

- multiple selected opening markets;
- Growth and Premiere hands-on templates;
- all four assisted priorities;
- a custom budget below minimum, at recommended, and well above required;
- the no-market warning;
- the mandatory planning cinematic;
- proposal rejection, approval, takeover, return to team, and final commissioning gate.

## Completion criteria

This work is complete when:

- the incorrect Growth and Premiere behavior is gone;
- Assisted mode is budget-first and market-aware;
- package names in Assisted mode describe calculated capability;
- Hands-On templates apply exact advertised racks and cities;
- the team-planning cinematic is mandatory, data-grounded, and 1–2 seconds long;
- team proposals remain pending until approved;
- managed stages are inspectable but not editable until takeover;
- no opening market, budget failure, and facility failure states are clearly explained;
- all money remains a projection until the existing commissioning transaction executes;
- the feature uses the canonical Actor Empire systems rather than a parallel calculator.
