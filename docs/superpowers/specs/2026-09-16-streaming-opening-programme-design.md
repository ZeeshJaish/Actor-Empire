# Streaming Opening Programme Design

Date: 2026-09-16  
Status: Approved for implementation  
Scope: Streaming+ founding launch, from final commissioning through Opening Night

## Purpose

Commissioning must become the clear point where a finished launch design turns into timed execution. After the player signs, the game starts every approved launch workstream, locks the commissioned configuration, and replaces the editable setup wizards with one persistent Opening Programme page.

The player should always understand:

- what was commissioned;
- what started immediately;
- what is still waiting;
- which item currently controls the earliest opening week;
- what needs player attention;
- when Opening Night becomes available.

## Product decision

Use one unified Opening Programme after commissioning. Do not leave players inside disabled copies of the Build or Define the Launch wizards.

The lifecycle is:

`Editable setup -> Ready to commission -> Commissioned/executing -> Ready for Opening Night -> Live`

Commissioning is a hard lock. Normal setup controls remain unavailable until the opening programme completes. A future change-order feature may reopen decisions with explicit cost and delay, but it is outside this scope.

## Before commissioning

Commissioning requires all player decisions and evidence to be complete:

- at least one Opening Market is selected;
- no selected market is in an unresolved rejection or player-action state;
- service identity, storefront, catalogue and pricing are defined;
- the Launch Blueprint represents the current choices;
- sites, rooms, rack duties and capacity are configured;
- the load rehearsal passed for the exact commissioned configuration;
- the complete due-now amount is affordable.

Government review does not need to be finished before commissioning. Selected markets may be unfiled, already under review, conditionally approved or fully approved. Commissioning starts only the unfiled applications. Existing reviews and approvals are preserved.

If a selected market needs a missing document, additional payment, or revised application, commissioning stays blocked because the player still has a decision or action to resolve.

## Atomic commissioning transaction

The confirmation sheet must show every action and charge that will be triggered. Confirmation performs one atomic transaction:

1. Revalidate all decisions, prices, rehearsal signatures and treasury.
2. Charge infrastructure commissioning costs.
3. Charge and file every selected but unfiled Opening Market application.
4. Preserve existing market reviews and approvals without restarting or double-charging them.
5. Reserve the approved launch-marketing ceiling.
6. Create the infrastructure construction schedule.
7. Start or preserve the marketing execution schedule against the earliest possible opening window.
8. Record one idempotent commission identifier and ledger event.
9. Clear editable drafts only after every required write succeeds.

If any write or affordability check fails, nothing is charged and no workstream starts. Repeating the same commission request cannot charge or file twice.

## Canonical state model

The Opening Programme is derived from existing canonical records instead of maintaining duplicate progress values.

### Programme states

- `DRAFT`: setup remains editable.
- `READY_TO_COMMISSION`: every decision and rehearsal is current.
- `EXECUTING`: commission is recorded and at least one required workstream is incomplete.
- `ACTION_REQUIRED`: execution is active, but a clearance or other workstream needs a player decision.
- `READY_TO_OPEN`: every required workstream is complete and the final rehearsal evidence is still valid.
- `LIVE`: Opening Night completed and the platform launch is committed.

### Required workstreams

- Infrastructure construction
- Opening-market government clearance
- Launch marketing preparation
- Opening catalogue readiness
- Service identity and storefront lock
- Pricing lock
- Load rehearsal evidence

Catalogue, identity, storefront, pricing and rehearsal are locked evidence rather than timers. Infrastructure, clearance and marketing are the timed workstreams.

### Target opening week

The displayed target is the latest known ready week among required timed workstreams. It is labeled **Earliest Opening** until all uncertain government outcomes are resolved. A delay, document request, payment request or temporary rejection moves the target and explains why.

All timing uses Actor Empire game weeks. There are no real-time timers.

## Routing and locking

Once the programme is `EXECUTING` or `ACTION_REQUIRED`:

- Build Wizard entry -> Opening Programme focused on Infrastructure.
- Define the Launch entry -> Opening Programme focused on Launch Plan or Clearances.
- Campaign entry -> Opening Programme focused on Marketing.
- Launch entry -> Opening Programme overview.
- Streaming+ command cards show the current programme status instead of setup completion counts.

The player never lands on a page full of disabled controls. Each focused section may open a read-only detail sheet showing the approved configuration, cost, evidence and timeline.

If a workstream needs player action, the relevant card receives the only warning treatment and exposes the exact permitted resolution. Normal configuration editing remains locked.

## Opening Programme interface

The page uses the existing dark Streaming+ visual system with flat status colours, compact cards and no decorative gradients. It does not use page counts or a wizard progress rail.

```text
THE OPENING PROGRAMME                     COMMISSIONED
Earliest opening · Week 30
6 cities · 118 racks · $465M released

CONTROLS THE DATE
Infrastructure                           Week 1 of 15
Crews are building 118 racks across 6 cities.

WORKSTREAMS
Government clearance                     3 in review
Launch marketing                         Scheduled · Week 10
Catalogue                                Locked
Service and pricing                       Locked
Load rehearsal                            Passed

[ View commissioned plan ]
[ Opening Night · 14 weeks remaining ]    disabled
```

The hero reports the launch state, not an abstract percentage. The most important card is **Controls the date**, which identifies the workstream currently setting the earliest opening.

Each timed card displays:

- status: Not started, In progress, Action required, Delayed or Ready;
- elapsed and remaining game weeks when knowable;
- the exact consequence for Opening Night;
- a single permitted action when intervention is required.

## Commissioning cinematic handoff

The existing signing, payment, construction, rack installation, acceptance-test and network-wake scenes remain. The construction scene should say:

`Construction begins · 15 weeks to operational`

It must not imply that the cinematic itself simulates all fifteen weeks.

Closing the executed contract routes directly to the Opening Programme. Reopening Streaming+ later derives the same page from saved canonical records; it must not request team-plan approval or rehearsal again.

## Weekly progression

Every processed game week:

1. Advance market-clearance reviews through the existing deterministic market lifecycle.
2. Advance marketing preparation through its existing lifecycle.
3. Recalculate infrastructure elapsed and remaining weeks from committed and ready absolute weeks.
4. Derive the programme state and controlling workstream.
5. Emit one event only when a workstream changes state or requires action.
6. Unlock Opening Night only when every required workstream is ready.

Construction completion does not launch the service automatically. It changes Infrastructure to Ready and waits for any slower required workstream.

## Completion

When all required workstreams are ready, the existing page changes in place:

- hero status becomes `READY FOR OPENING NIGHT`;
- the controlling-date card becomes `All systems ready`;
- the primary action becomes `Begin Opening Night`;
- read-only commissioned details remain available;
- setup wizards remain locked until Opening Night resolves.

Opening Night uses the canonical commissioned network, approved markets, locked commercial offer, launch catalogue and reserved campaign. It cannot substitute a newer draft.

## Persistence and recovery

- Programme state is derived after every save load; it is not a volatile UI flag.
- Commission identifiers and filing keys are deterministic and idempotent.
- Existing approved clearances never restart.
- Existing in-review clearances keep their original submission and ready weeks.
- A closed and reopened game returns to the same programme state.
- Week-processing recovery must preserve the previous verified save and report the failed workstream step.
- Legacy saves with commissioned infrastructure but no programme marker are migrated by deriving an execution programme from their canonical setup and market records.

## Implementation boundaries

Expected areas of change:

- `types.ts`: persisted commission/programme identifiers only where canonical records cannot already express them.
- `services/streamingInfrastructure.ts`: atomic infrastructure portion and existing construction schedule.
- `services/streamingMarkets.ts`: idempotent batch filing for selected unfiled Opening Markets.
- `services/streamingLaunchMarketingLifecycle.ts`: commission-aligned reservation and execution timing.
- `services/streamingLaunchProgram.ts`: decision gates versus timed-execution status.
- New `services/streamingOpeningProgramme.ts`: pure derived programme view and controlling-date calculation.
- `components/StreamingPlatformHQ.tsx`: atomic orchestration and post-commission routing.
- New `components/streaming-transplant/StreamingOpeningProgramme.tsx`: unified status interface.
- `components/studio-finance/components/build/StageLaunch.tsx`: commission confirmation and cinematic handoff.
- `components/studio-finance/components/cine/CommissionCut.tsx`: clearer construction copy.

Existing market, infrastructure, marketing and launch records remain authoritative. The new programme service is an adapter and coordinator, not a second simulation.

## Verification requirements

Automated coverage must prove:

- unfiled selected markets start exactly once at commission;
- in-review and approved markets are preserved;
- unresolved player-action clearances block commission;
- the commission transaction is all-or-nothing;
- infrastructure, filings and marketing cannot double-charge on retry;
- the target opening week follows the slowest required workstream;
- save/reload and two-week absence preserve all progress and approvals;
- every Streaming+ setup entry routes to the correct Opening Programme focus while executing;
- setup controls are not reachable during the hard lock;
- Opening Night remains blocked until all required workstreams are ready;
- Opening Night unlocks on the correct game week;
- the 393x600 and 393x852 layouts have no clipping or horizontal overflow;
- the commissioning cinematic hands off to the programme and accurately describes the waiting period.

## Acceptance criteria

The feature is accepted when a player can commission an eligible launch once, watch the commissioning sequence, land on one persistent Opening Programme, advance game weeks, resolve any clearance exception, and enter Opening Night without revisiting or reapproving the completed setup wizards.
