# Budget-inflation and mod-pack succession reports

Analysis only. No production source changes or personal save access. All cases use isolated fixtures against the current local checkout.

## Verdict

1. **Movies:** the current box-office revamp protects the tested live Release Strategy bidding route against actor-fee/budget inflation. Identical cast, quality, exposure, rights and buyer market produce identical offers at $10 million, $1 billion and $1 trillion production budgets. This confirms the local code path, not a released store build.
2. **Series:** the live structured bidding route still derives expected title value from production budget. Increasing only the cost increases bids until buyer cash/acquisition limits bind. The broad claim of unlimited guaranteed 2x returns was not reproduced; budget sensitivity remains a real gap. Future-season funding is restricted funding, not free profit.
3. **Mods:** confirmed succession bug in the actual `handleContinueAsChild` callback. Pack selections and mod history are omitted from inherited flags. Actor profile rows initially survive, while pack UI state and country-gated creator options reset. Son/daughter, living/deceased parent: all four cases reproduce and remain affected after persistence preparation/reload/migration.

## Controlled measurements

The auction comparison uses the real bidder market, rights-lot construction, movie quote adapter, session creation and 45-second bidding advance. It changes production budget and an actor salary together, keeping creative/public inputs fixed. This is offer generation verification, not a new signed cash-settlement journey.

| Type | Production budget | Highest minimum guarantee | Highest fixed exposure across offers* |
| --- | ---: | ---: | ---: |
| MOVIE | $10,000,000 | $123,632,000 | $123,632,000 |
| MOVIE | $1,000,000,000 | $123,632,000 | $123,632,000 |
| MOVIE | $1,000,000,000,000 | $123,632,000 | $123,632,000 |
| SERIES | $10,000,000 | $321,900,000 | $345,800,000 |
| SERIES | $1,000,000,000 | $1,488,600,000 | $2,260,800,000 |
| SERIES | $1,000,000,000,000 | $1,488,600,000 | $2,260,800,000 |

*Fixed exposure includes minimum guarantee plus production and future-season funding. The highest guarantee and highest total exposure can belong to different offers. These figures are fixture results, not typical earnings forecasts.

For mods, the test invokes the exact current App callback extracted and transpiled from source, with actual inheritance and migration services. Only UI/slot-storage sinks are replaced with test capture functions. The enabled US pack starts with 65 actor profiles and 78 creator options. After handoff, all 65 actor profiles initially remain, but enabled pack count becomes zero, mod history becomes empty, and creator options fall to 67. Reload does not repair the missing selection.

## Source trace

- [ReleaseWizard.tsx:661](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/ReleaseWizard.tsx:661>): only non-series bidders receive audience/contribution-based cinema rights quotes.
- [ReleaseWizard.tsx:724](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/ReleaseWizard.tsx:724>): movie acceptance rechecks the quote before signing.
- [boxOfficeRightsValue.ts:46](</Users/zeesh/Vibe code/Actor empire/services/boxOffice/boxOfficeRightsValue.ts:46>): value derives from incremental households, contribution, rights/window and buyer resources; no production-budget recovery floor.
- [streamingBidding.ts:291](</Users/zeesh/Vibe code/Actor empire/services/streamingBidding.ts:291>): the non-cinema fallback still multiplies project budget into expected title value.
- [gameLoop.ts:4843](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4843>): movie post-theatrical bids also take the quote-based route. Automatic movie routes use the same quote/registration authority. These automatic paths were source-traced in this audit, not all replayed.
- [ReleaseWizard.tsx:221](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/ReleaseWizard.tsx:221>): an old exported budget-floor calculator remains, but repository search found no runtime callers. Its presence alone does not establish a live movie exploit.
- [greenlightProjectBuilder.ts:185](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/greenlightProjectBuilder.ts:185>): production cost and the reserved marketing budget are separate accounting fields; marketing adds exposure rather than an entitlement to budget recovery.
- [App.tsx:2917](</Users/zeesh/Vibe code/Actor empire/App.tsx:2917>) and [legacyLogic.ts:397](</Users/zeesh/Vibe code/Actor empire/services/legacyLogic.ts:397>): the child starts with fresh flags plus the explicit inheritance result; enabledGlobalActorPacks/modHistory are absent.
- [SettingsPage.tsx:499](</Users/zeesh/Vibe code/Actor empire/views/SettingsPage.tsx:499>): pack selections/history live in those omitted flags.
- [youtubeLogic.ts:429](</Users/zeesh/Vibe code/Actor empire/services/youtubeLogic.ts:429>): enabled country packs gate additional creators.
- [saveMigration.ts:768](</Users/zeesh/Vibe code/Actor empire/services/saveMigration.ts:768>): missing actor packs can be rehydrated when their enabled IDs exist; this does not recover erased selection IDs.

## Recommended next changes

- Extend audience/contribution-based rights valuation to series with season-specific evidence, rights scope/window, buyer obligations and affordability. Actor salary and production cost must not create a minimum selling price. Treat production/future-season funding separately from profit. Preserve all existing signed deals and cash history.
- Carry the explicit enabled pack IDs and cloned mod history across succession as save/world settings. Avoid copying every parent flag, which would also copy death and career-specific state. Preserve existing actor IDs, current statistics, contracts and balances; deduplicate actor rows. Inspect recovery for already-affected heir saves using surviving verified pack data, without blanket enabling or regenerating all actors.
- Verify normal offers plus extreme salary/ad-spend cases, series and movie routes, and son/daughter succession through subsequent weeks and save/reload before declaring the changes fixed.

Evidence: [run.txt](run.txt), [results.json](results.json), [verify.ts](verify.ts). Reproduce with `esbuild output/analysis/budget-mod-reports/verify.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/ae-budget-mod-reports.mjs` then `node /tmp/ae-budget-mod-reports.mjs` from the repository root.
