# Stock acquisition, SX valuation and save safety repair

The repair is implemented locally on `codex/streaming-tap-lag`; the checkout is retained as-is, without a merge, commit, push or deployment. Source-stable browser, actual App, recovery, accounting, TypeScript and web-build verification have finished. No production player save was used or rewritten.

The user's subsequent Stocks/Forbes recheck and explicit choice to retain both routes are documented in [the route follow-up](route-recheck/README.md). It records additional legacy-case, availability, tender-quantity, accepted-price and completed-receipt repairs, plus the five pre-existing design warnings. Its final verification supersedes the earlier browser/source-freeze evidence below for those changed paths.

## What caused the reports

- The rendered acquisition room resumed paid-diligence DRAFT files at the dossier instead of continuing a majority-control transfer. Historical counter/rejection/offer prices could override shares already owned. Public entry points also disagreed between 50% and 51%.
- Review and signing used separate financial fallbacks. Public headline appraisals could create synthetic debt/income and revive an oversized company valuation when ownership materialized.
- Weekly stock growth repeatedly counted old releases; week-only price, issuance and dividend markers did not distinguish calendar years. Independent unbounded world appraisals could compound into SX values despite bounded listed quotes.
- Stock migration treated a bad quote as permission to cut wallet money and rewrite historical basis/owner metadata. JavaScript Number could also accept a purchase whose cash debit disappeared at SX magnitudes.

## Implemented behavior

Actual supported public-company control starts at 50% of valid current rights. A persisted control notice resumes through response, closing and signing, including old DRAFT/countered/rejected/accepted files. Previously purchased shares require no second share payment. The canonical completion path creates one owned business, records actual liabilities once, and charges signing energy once.

One signing quote supplies the UI and settlement. Present canonical company debt outranks an obsolete unsigned report. Changed financial facts invalidate a reviewed signature and return the room to closing review. Unsafe known liabilities/cash reject the action unchanged. Existing signed obligations and already-owned companies are preserved.

Listed equity is validated share price × actual issued shares. Cash, debt and operating income come from actual stored facts; a headline appraisal cannot manufacture them. Old release pressure expires, future unowned listed appraisals use existing company/sector ceilings, and original adjustments are archived. Player-controlled appraisal achievements remain exempt. Absolute game-week markers prevent repeat price processing, issuance and paid dividends across reload/year rollover. Real weekly mixed-owner dividends preserve cents and mark the processed source week after both owners settle.

Stock compatibility preserves settled wallet money, integral share rights, explicit corporate allocations, known zero/high costs, and unknown historical costs. Later buys, partial sales and tenders also keep unknown history unknown. A quote correction changes unrealized paper value, with old → repaired quote disclosed in Stocks; it does not debit cash, cancel shares or mint compensation. Unsupported/contradictory registers request verified recovery with the original units preserved. A $10.6SX wallet is retained, but a trade whose exact cash delta cannot be represented is rejected unchanged.

Integrity digest schema 4 additionally protects corporate allocations and repair provenance, while exact historical schema 1/2/3 verification is retained. Candidate verification, atomic promotion, current/previous generations and persisted-before-UI processed weeks remain in place. A previous-generation recovery preview is read-only and must also pass migration compatibility before the App offers it.

## Verification

| Evidence | Finished result |
| --- | --- |
| Stock compatibility safety | 15 cases pass; original failures retained in `save-safety/` |
| Stock settlement and market safety | 21 cases pass; exact mixed cents, unknown/zero/high basis and unsafe balances covered |
| Corporate stock cash | 8 cases pass |
| Listed-world appraisal | 6 cases pass; actual cash/debt/ledgers preserved |
| Long stock replays | All 16 seeded scenarios pass: all 16 stocks, 50/100 years, bull/bear/seeded/stale-hit, 998,400 stock updates |
| Acquisition integration | 19 checks pass, including actual purchases, corporate tender, real $500M debt, reload and actual later weeks |
| Public control regressions | 10 cases pass, including sell-down/regain, unfunded tender, unknown-basis tender, 50% threshold and duplicate signing |
| Signing guards | Unsafe debt/cash, duplicate/malformed owner rights and incompatible minimum-cent supply reject unchanged |
| Actual mixed dividend week | $0.50 personal + $0.50 corporate, correct source-week marker, reload and next actual week pass |
| Browser matrix | 14/14 pass, zero JS page exceptions; production and harness hashes unchanged before/after |
| Rapid final-signature browser test | Two same-tick clicks produce one business, one $500M debt entry and exactly one 25E charge; reload + three weeks pass |
| Actual App | Production index/StrictMode + real slot selection/navigation + purchase/acquisition + verified reload + three following App weeks pass, zero JS page exceptions |
| Actual App recovery | 2/2 pass; preview/cancel preserve original raw hashes, explicit restore uses safe previous rights, incompatible current+previous remain untouched with actionable error |

Fresh `npm run build` and `npm run lint` both pass. Save migration, save integrity, save generations, banking/acquisition accounting, stock structure/takeover/control/decision events, entertainment stocks, acquisition event cadence, private acquisitions, acquisition debt, studio group/valuation, ownership handoff/subsidiary control, inheritance, studio-sale economics/exploits/treasury lock, and acquisition UI audits pass.

The existing `audit:studio-sale-security` aggregate has one unrelated failing theatrical-release fixture in `audit-studio-sale-history`: “real theatrical release must generate receipts.” It fails identically in the reconstructed pre-implementation checkout (`bb029e5` plus the initial dirty-file backup). Its separate exploit and treasury-lock audits pass. This repair does not change that theatrical fixture or box-office settlement.

## Preservation and scope

`baseline-manifest.json` records the initial HEAD, branch and hashes of 252 pre-existing dirty/untracked files. The targeted backup and initial tracked patch are at `/private/tmp/ae-stock-repair-baseline/`. Shared App, game-loop, migration and type files were changed with targeted additions; existing streaming/box-office work was preserved. Concurrent unrelated audit/fixture/plan edits and the consistent save read-snapshot implementation were retained, not reset or attributed to this repair. The archived analysis `main.tsx` was renamed to `main.tsx.txt` with its bytes preserved so its browser-only `/@fs` imports do not enter the production TypeScript check.

The design detector's gray-on-color finding on the existing acquisition button was a false positive: near-black slate-950 on emerald-400 is intentional high-contrast text. A file-scoped value exception was recorded; no design finding remains standing on the changed Stocks target.

Device inventory was checked: the Android SDK ADB is installed but no connected device was listed; no iOS simulator was booted (iOS 26.2 runtime is installed). Native smoke was therefore not run. Browser/service evidence does not claim an installed Android/iOS build or store release is verified. Already-lost balances cannot be invented without an older verified source. This repair does not add arbitrary precision to unrelated game currency.

## Re-run the checks

`npm run audit:stock-acquisition-safety` runs the focused service/save/accounting checks. With `npx vite --config lab/stockAcquisitionSafetyVite.config.mjs` running in a separate terminal, run `npm run audit:stock-acquisition-matrix`, `npm run audit:stock-acquisition-app` and `npm run audit:stock-acquisition-recovery` sequentially. The browser scripts create isolated synthetic careers. Run `npm run lint` after closing the browser jobs on memory-constrained machines, and `npm run build` for the production web build.
