# Box-office Phase 4 — live settlement and save migration

Phase 4 connects the shared audience/supply kernel to the real weekly game. Migration checkpoint: `17b44d5`. Base for isolated verification: Phase 3 `d3b9e27`. Task 8 is a separate local checkpoint; no remote push or release is part of this phase.

## Weekly authority

1. `processGameWeek` migrates cinema against the current durable week before creating new releases. Existing movie history becomes `LEGACY_ACTIVE` or `LEGACY_FULLY_SETTLED`; genuinely new releases enter `UNSETTLED_WEEKLY`.
2. The early movie theatrical branch preserves the release without calculating or paying the former budget/cap curve. Series retain their existing theater route.
3. The entered-week population, economy and participation snapshot is prepared by the existing world loop. Industry production admits due NPC films. Outside theatrical investments are admitted under their signed canonical project ID.
4. `buildCinemaWeekInput` collects the complete eligible slate. All owners use one `simulateCinemaWeek`, with shared seats, shows, wallets and leisure. Region-specific selected chains do not become an accidental country/chain cross product. Ticket prices are automatic country/chain quotes.
5. `commitCinemaWeek` applies one atomic candidate containing ticket splits, identified booking costs, signed participation, cash, summaries and audience history. Existing verified persistence still runs before UI state publication.
6. Runs end when their actual market runs close. Public gross and production budget impose neither a lifetime earning ceiling nor the former forced 22-week stop. A continuing audience may sustain a long run. A title without a streaming buyer archives immediately; it cannot remain an unpaid, finished theater zombie.

Capacity creates access, not awareness or admissions. The live adapter uses existing sourced campaign/announcement records. New NPC release marketing is charged once and becomes a paid exposure event. Admission creates no lifetime theatrical receipt or synthetic streaming-value cash. Signed streaming contracts remain their own cash authority.

## Exactly-once behavior

The durable guard combines schema/tuning versions, a cinema clock epoch, last processed week, canonical title identity, compact per-title financial totals and up to 52 committed weekly receipts. The transient source snapshot binds audience inputs, ownership destination, signed investor/talent/actor terms, release budget, music plan, payout history and career clock.

A first cash commit requires the unchanged result object issued by the allocator. A balanced but edited gross/producer-receipt pair is rejected. An uncommitted serialized result is recomputed from the durable prior save after recovery. An identical already-committed result can replay after JSON reload and returns `applied: false`. A changed receipt/fingerprint refuses a second settlement. Receipts older than retained detail hit the chronological guard and cannot pay again.

Player studios use dollars; NPC treasuries use millions. Conversions and shared ticket splits retain integer cents. NPC operating, production, turnaround and marketing cash moves preserve ticket cents instead of rounding the whole treasury back to a coarse budget quote. The NPC AI ledger explicitly labels its cinema entry as net collected cash; the common receipt records its gross shares and individual deductions.

Signed investors receive their existing producer-receipt share. Talent contracts use the existing collected-receipt backend helper and rounding convention. A legacy actor royalty keeps its signed profit basis; weekly cinema pays only the new eligible increment, and streaming completion subtracts backend already paid. Upfront acting salary and already-paid production/marketing are not charged again. Actor backend is included in the producer's paid-backend financial deduction.

Outside theatrical/festival investments receive their signed stake from actual producer receipts. Existing principal is not re-deducted. Because these contracts have no simulated producer bank, `externalProducerBalancesCents` retains the exact external counterparty net receivable/payable after shares and booking costs. Missing owners for ordinary tracked NPC films reject the candidate rather than dropping a cash leg. Streaming-only investment, fraud, delay and cancellation/refund paths retain their own authority.

## Existing saves and inheritance

- Save migration version **52**, cinema schema **1**, independent tuning version **1**.
- Historical cash, gross, paid costs, known receipts and signed streaming agreements are preserved. Missing catalogue theatrical gross remains unknown (`legacyGrossKnown: false`) and already settled.
- Old active attendance is a bounded, explicitly estimated history based on known gross, footprint and automatic prices. The estimate itself pays nothing. Tracked attendance begins on the next unprocessed week.
- Fully settled historical NPC lifetime results never enter new ticket or cash settlement. Old synthetic chart curves are removed from the current weekly chart.
- Unsupported future versions, ambiguous paid records, malformed audience/receipt memory and present negative/nonfinite historical money require recovery; they are not silently reset or signed as new truth.
- Closed audience matrices retire into bounded actor/studio/universe affinity memory. Compact money facts survive display-history retirement; live canonical world projects are protected from display compaction.
- Inheritance rebases live cinema/talent chronological guards with a new epoch while preserving original paid receipt keys. Parent actor identities, favorites and contractual royalty beneficiaries remain the parent; the heir does not acquire the parent's acting identity or personal royalty cash.
- Save-integrity digest schema **3** protects cinema state. Previously issued v1/v2 projections still verify against their original digests. `saveGenerations.ts` and `App.tsx` durability/order code remain unchanged.

## Facts shown to readers

The weekly chart reads the latest committed slate and previous ranks from the entire previous committed slate, including a winner that has since retired. It does not invent NPC or outside-investment ticket curves. Existing release region/chain reports, scheduled screen shares, paid attendance and audience response update from the same allocations; producer receipts include explicit distribution deductions. Numerical IMDb scoring is unchanged.

Career effects use actual audience reach, cumulative delivered response, performance and credited role visibility. A closing quiet week cannot erase earlier satisfied viewers. An offered-role actor does not receive the producer's budget-loss penalty. Final NPC hit/flop facts are emitted once when the paid run closes, rather than at admission.

## Verification

See [verification.json](verification.json) for commands, outcomes, source hashes and preservation checks. The focused suite contains **186 passing groups**: 137 existing Phase 1–3 groups, 19 migration groups and 30 live integration groups. It includes actual `processGameWeek`, same-input release retries, mixed owners, new NPC admission, signed cash, ownership changes, no-streamer retirement, reload, failed save-generation promotion and successful retry.

Related checks cover issued save integrity/generations, population/audience/participation, WE4 subscription-budget sharing, WE6 viewing, WE8 protected state, NPC finance/production, ownership handoff, public industry projection, fandom and the committed weekly chart. TypeScript and the isolated production build pass. Vite retains the existing large-chunk warning.

The 400-year B6 soak is a **production-only** test: 520 releases admitted, 173 delayed, no duplicate IDs, 3,200,812 retained bytes. Its 520 commercial outcomes correctly remain pending without the cinema week coordinator. It does not claim 400 years of live cinema balance.

A four-title development fixture measured 627 ms for its first actual game week and 3445 ms for the combined live-week, persistence/retry and reload journey in the final development run (overlapped the build); its active cinema state was about 2.8 MB and prepared full save about 9.4 MB. These are local synthetic diagnostics, not a device frame-time or large-slate performance guarantee. Phase 6 must measure long live careers and large concurrent slates.

## Review and next phases

Read-only review reproduced and led to fixes for parent identity, pre-default corrupt-money validation, safe historical display compaction, incomplete paid schemas, result mutation/stale contracts, inherited backend clocks, failed streaming exits, cash-ledger reconciliation and stale release projections. Source mutations and all money writes remain with one implementation owner.

Phase 5 still owns the complete forecast/financial/IMDb insight screens and downstream rights-bid economics; the existing downstream bid policy is reused here. Phase 6 owns final tuning, contrasted career balance, full UI/device journeys and measured long-session performance. Passing Phase 4 establishes the live accounting and persistence foundation; it does not declare final game balance or a native release ready.

## Reproduce

```sh
npm run audit:box-office-migration
npm run audit:box-office-integration
node scripts/run-box-office-audit.mjs market
npm run audit:save-integrity
npm run audit:save-generations
npm run lint
npm run build
```

Verification ran from an isolated Phase 3 archive overlaid only with the explicitly owned phase files. Existing unrelated streaming files were preserved byte for byte. Frozen localization baseline files were not changed.
