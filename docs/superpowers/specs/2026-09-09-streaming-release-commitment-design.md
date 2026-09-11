# Streaming Release Commitments and Resumable Wizard Design

**Date:** 2026-09-09

**Status:** Awaiting owner review

## Goal

Make streaming acquisition behave like a real commitment while keeping the Release Strategy Wizard safe to exit and resume. Platform participation must reflect current capacity and catalogue need, accepted offers must lock a platform-selected premiere date, and shared contracts must run and settle independently while presenting aggregate project performance.

## Product rules

1. Opening or editing an unsigned release strategy does not change the world.
2. Accepting a streaming offer immediately creates an irreversible rights contract and financial settlement.
3. Back navigation may revisit committed phases, but it may not mutate signed rights, buyers, or premiere dates.
4. Theatrical strategy remains fully editable until `LOCK STRATEGY`.
5. Campaign, festival, and marketing choices remain editable after a streaming deal until `LOCK STRATEGY`.
6. A worldwide shared release uses one common premiere date across every accepted platform.
7. Every shared platform gets its own viewership, royalty, lifecycle, and ledger settlement. Project totals are the sum of those runs.
8. Existing saves continue to work through the current primary `streaming` and `streamingContractId` fields.

## Commitment boundaries

### Theatrical route

Region, cinema-chain, campaign, festival, and calendar selections are draft state. The player can exit to Project Details and reopen at the saved phase. Backward navigation stays editable. The world changes only when the player locks the completed strategy.

### Streaming route before a signature

Distribution selection and unopened War Room state remain draft state. Once the player opens a live room, the room is persisted. The player must either finish the room, sign an offer, or walk out before leaving the transactional War Room; this avoids freezing the countdown as an exploit.

### Streaming route after a signature

The accepted offer becomes a canonical rights contract immediately. From that point:

- the route is locked to streaming;
- each accepted buyer and its financial terms are locked;
- the common platform premiere date is locked;
- returning to the distribution phase presents a read-only `STREAMING COMMITTED` state;
- returning to the War Room presents `SIGNED STREAMING DEALS`, not a new or empty auction;
- Campaign, Festivals, and the review surface remain editable;
- the Calendar displays the locked platform premiere and explains that the buyer controls the date.

The player can always use `SAVE & EXIT` outside a live War Room. Project Details then exposes `CONTINUE RELEASE STRATEGY`, the last saved phase, and a `RIGHTS SIGNED` badge when applicable.

## Platform launch capacity

Create a pure platform-calendar adapter that reads canonical streaming contracts, scheduled industry releases, platform release memory, and the current absolute week. It produces occupied premiere slots and the nearest available premiere weeks for each company.

Baseline simultaneous premiere capacity is derived from current company scale:

- at least 150 million subscribers: four premieres per week;
- at least 75 million: three premieres per week;
- at least 25 million: two premieres per week;
- smaller and regional services: one premiere per week.

The adapter searches the next twelve weeks. A full immediate slate does not automatically eliminate a large platform; it causes that platform to propose its nearest available week. A company is excluded only when it has no slot in the search window, cannot fund a clearing offer, is closed or acquired, or has an active restriction blocking new bids.

Catalogue need is calculated from the company's active contracts and recent release memory by genre. An under-supplied genre raises interest and ceiling within bounded limits; an over-supplied genre lowers both. Company scale, prestige, cash, localization reach, studio relationship, project quality, genre need, and available premiere distance all contribute to bidder ranking. The War Room still admits a deterministic five-to-eight-company shortlist, so Netflix, Hulu, or another major service is never guaranteed to appear.

## Offer and session terms

Add `proposedPremiereAbsoluteWeek` and its week/year presentation data to every offer version. The value comes from the bidder's nearest available platform-calendar slot and remains immutable within an accepted offer revision.

For shared licensing:

1. The first accepted non-exclusive offer establishes `lockedPremiereAbsoluteWeek` on the bidding session.
2. Remaining companies may continue only when they can reserve that exact week.
3. Subsequent offer revisions use the locked week; incompatible offers withdraw.
4. Up to three shared buyers may sign.
5. All accepted contracts copy the same start week and stream simultaneously.

Before any signature, exclusive and shared offers may coexist. Accepting an exclusive offer closes the room and withdraws every other offer. Accepting the first shared offer withdraws every exclusive offer immediately; later generated or revised terms must be non-exclusive. A stale exclusive offer restored from an older save is incompatible and cannot be accepted.

Every collapsed offer row exposes its consequence before the player acts:

- `EXCLUSIVE · CLOSES ROOM` with a `TAKE EXCLUSIVE` action;
- `SHARED · UP TO 3` with a `TAKE SHARED` action.

After the first shared signature, the room header displays `SHARED LICENSING · 1/3 SIGNED`, then `2/3 SIGNED`. The third signature displays `3/3 SIGNED` and closes the room. Signed platform names and total guaranteed value remain visible above outstanding offers.

Exclusive acceptance remains terminal. Post-theatrical streaming rights use the first valid week after the theatrical window and require every shared buyer to use that same start week.

## Canonical runtime model

Add a versioned per-contract run collection to `ActiveRelease`:

```ts
interface StreamingPlatformRun {
    contractId: string;
    platformId: string;
    platformName: string;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    weekOnPlatform: number;
    totalViews: number;
    weeklyViews: number[];
    royaltyRevenue: number;
    status: 'SCHEDULED' | 'STREAMING' | 'ENDED';
}

type StreamingPlatformRunRegistry = Record<string, StreamingPlatformRun>;
```

`streamingRuns` is keyed by contract ID. The accepted rights-contract registry remains the authority for buyer, scope, dates, exclusivity, and economics. The runtime collection stores only performance and lifecycle state.

The current `ActiveRelease.streaming` and `streamingContractId` fields remain as compatibility mirrors of the primary/first contract. New code must not use those fields to decide how many buyers exist.

## Weekly simulation and accounting

When a streaming release begins, create one run for every active accepted contract whose start week has arrived. Each weekly tick:

1. Process every `SCHEDULED` or `STREAMING` run independently.
2. Calculate platform-specific viewership from the canonical company profile. Core platforms retain their existing detailed AI economics; regional and dynamic services use the same normalized company metrics used by the ecosystem adapter.
3. Attribute adjusted gross and settle royalties by contract ID, not project ID.
4. Write an idempotent ledger entry containing project ID, contract ID, and absolute week.
5. Update each platform's release memory and performance separately.
6. Aggregate weekly views, total views, royalties, and streaming revenue onto the project for existing UI and career systems.
7. End an individual run when its contract expires or its platform-specific exit rule fires. The project leaves streaming only after every run has ended.

This replaces the current project-keyed royalty attribution that can overwrite one shared platform with another.

## Release Wizard UX

### Header and exit

Outside an active War Room, the shell offers a clear close/back action. Leaving writes the current draft synchronously before returning to Project Details. No 250 ms autosave window is allowed to lose the last interaction.

If the player attempts to leave a live unsigned War Room, show a decision modal:

- `STAY IN THE ROOM`
- `WALK OUT AND EXIT`

Signed deals are never discarded.

### Reopening

Project Details derives the CTA from the project state:

- no draft: `PLAN RELEASE`;
- incomplete draft: `CONTINUE RELEASE STRATEGY` with the saved phase;
- signed streaming contract with incomplete strategy: `CONTINUE STREAMING LAUNCH` with `RIGHTS SIGNED`;
- completed strategy: existing release status UI.

### Backward navigation after signing

The phase rail stays navigable for comprehension, but committed phases render read-only:

- Distribution shows Streaming selected and locked.
- War Room shows signed contracts and the common premiere date.
- Calendar shows the platform date as locked.
- Campaign and Festival controls remain editable.

The interface must never imply that changing a draft can cancel a signed contract.

## Persistence and migration

Extend `ReleasePlanningDraft` with the locked premiere week, commitment state, and contract-ID collection. Persist the draft synchronously on explicit exit and immediately after every contract signature.

Save migration performs these repairs:

- a single legacy `streamingContractId` creates one `streamingRuns` entry when the contract is available;
- `hiddenStats.streamingContractIds` seeds missing run entries;
- a legacy streaming release without canonical contracts keeps its current single `streaming` behavior;
- accepted shared contracts with the same bidding session are normalized to one common start week;
- no migration pays guarantees or royalties again.

## Error handling and invariants

- Never accept an offer whose capacity reservation or rights compatibility has changed.
- Never settle the same offer, guarantee, energy cost, or weekly royalty twice.
- Never allow an exclusive contract beside another active contract for overlapping scope and dates.
- Never allow shared buyers from the same room to diverge on worldwide premiere date.
- Never reopen an accepted room as a new auction.
- Never let draft deletion remove canonical contracts.
- If a dynamic platform disappears from presentation data, preserve its contract/run using the stored platform name and brand fallback.

## Verification

### Pure model audits

- capacity by subscriber tier;
- full slate selects the next available week;
- no twelve-week capacity excludes the bidder;
- genre shortage raises bounded interest;
- deterministic five-to-eight bidder selection;
- accepted exclusive and shared premiere terms;
- subsequent shared offers align to the first signed date;
- per-contract settlement produces independent revenue without duplication;
- aggregate totals equal the sum of all platform runs;
- legacy single-platform migration remains stable.

### Real-controller browser journeys

- exit and resume every unsigned theatrical phase;
- exit and resume streaming Campaign after a signed contract;
- committed Distribution, War Room, and Calendar are read-only;
- Campaign and Festival remain editable after signing;
- Project Details CTA and badges match each persistence state;
- three shared buyers display one premiere date and three independent platform rows;
- exclusive flow still advances directly;
- walkout cannot restore or revive the old room.

Run the responsive browser matrix at 320x740, 360x800, 393x852, 412x915, and 430x932, followed by the focused streaming audits and production build.

## Out of scope

- renegotiating or cancelling a signed rights contract;
- post-signature buyouts or stealing an already signed deal; offer competition happens before signature;
- territory-specific staggered shared dates;
- a platform bumping or cancelling another already contracted project;
- player-controlled platform originals, which retain their existing commissioned-premiere rules;
- changing theatrical dates after the complete strategy has been locked.
