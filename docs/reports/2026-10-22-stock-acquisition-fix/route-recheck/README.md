# Stocks and Forbes acquisition route recheck

The requested policy is to retain both Stocks purchases and Forbes public tenders, with explicit labels. This follow-up extends the original stock/save repair; it does not change supported public control from 50%, turn a minority investment into full ownership, or enable studio acquisition of reserved streaming platforms.

## Rules and labels

| Current state | Available action and result |
| --- | --- |
| Supported public studio, below actual 50% voting control | **Open Public Tender** in Forbes; dossier also offers **Buy Shares in Stocks** and opens the correct ticker. A new tender covers a sufficient whole-percentage block, minimum 5%. |
| Supported public studio, actual control already secured | **Complete Control Transfer**, including old closed/countered/rejected negotiation files. Signing creates the owned studio without buying the same shares again. |
| Private studio currently accepting approaches | Normal private offer; a minority closing records a minority position, while a full/control closing transfers the business. |
| Private studio currently not for sale | No new approach or paid diligence. An expired historical negotiation cooldown does not change its current availability. Existing valid negotiated offers retain their own resume path. |
| Netflix, Apple TV or Disney+ reserved platform | Shares remain investable in Stocks; studio-acquisition actions and paid acquisition diligence stay unavailable, including stale DRAFT files. |
| Already owned business | Acquisition remains blocked, including when a stale profile has not yet reflected the actual business register. |

## Additional reproduced bugs and repairs

1. Old CLOSED cooldowns and final rejections hid a valid majority-control transfer in Forbes. Current actual voting rights now take precedence at both entry points.
2. A stale reserved-platform DRAFT exposed unusable acquisition diligence and could charge a fee. Profile, direct room routing and diligence service now enforce the same hard block.
3. An expired CLOSED file let a private NOT_FOR_SALE company reopen. Current availability now remains authoritative for a new approach.
4. An accepted 5%/49% tender from zero holdings silently granted 50%. Signing now preserves the exact accepted block and rejects an insufficient block without changing money, shares, energy or ownership. Buying the missing shares in Stocks can make the original accepted contract sufficient; historical contracts are not silently enlarged or repriced.
5. A new 19.2% control gap was rounded down to an accepted 19%. New public offer creation, displayed blocks, custom-offer analysis and reference pricing now agree on 20%. Existing holdings and accepted contracts remain unchanged.
6. Rounded ownership could hide a one-share deficit. New tender quantities now come from exact held/issued share counts: 194,999,999/650,000,000 requires a new 21% whole block; one share below 50% uses the supported minimum 5% block. Completion also checks actual readiness instead of the rounded 50% display.
7. Private minority completion displayed a 0% position because a public-only tender field supplied the percentage. It now displays the actual negotiated private minority position. Legacy completed minority files that lack the original offer use their actual saved equity register; a 20% old stake must not display a fabricated 100% buyout. This additional fallback is covered by a read-only render regression and the final browser refresh.
8. A real 21% tender filed and accepted at $2,040,675,000 was rounded at signing to $2,040,680,000. One shared contract-price accessor now supplies preview and completion without rounding the already-accepted amount. Real private personal/studio buyouts and minority investments also retain their exact accepted dollar amounts; estimates and new seller proposals can still use their existing display increments.
9. The acquired screen could show **Paid $0** after a successful paid tender because live control readiness displaced the historical receipt. That screen now reads the completed closing's recorded price. A genuine zero-extra-payment control transfer still shows $0.

## Design warnings requested by the user

All seven detector findings were checked against HEAD and predate this repair. Two scoped exceptions retain the literal ink-stamp and wax-seal impact animations. The five remaining findings are:

- The press card has a thick red border on one side.
- The bid gauge needle uses overshooting easing.
- The envelope animation uses overshooting easing.
- Reaction-feed cards use overshooting easing.
- The signing progress bar animates `width`, which can trigger layout work.

These are design/performance suggestions, not evidence of a cash, save or acquisition failure. No measured frame-drop claim is made. Their CSS remains unchanged. A separate Stocks near-black-on-green contrast finding is recorded as a scoped false positive. Exact dispositions are in `../design-hook-followup.json` and `.impeccable/config.json`.

## Verification

Red/green evidence is retained for entry-route gates, undersized accepted tenders, fractional new tenders, one-share boundaries and the accepted-price overcharge. `npm run audit:public-tender-contract` now covers 15 real submission/response/settlement cases, including exact cash, share quantities, historical basis, invalid contracts and unchanged-state rejection. The private acquisition audit additionally checks three non-$10,000-multiple accepted prices through personal full, studio-funded full and personal minority settlement. The service/server-rendered route probe covers 29 assertions across supported public studios, old case statuses, private availability, all reserved platforms, the 16-stock catalogue and completed payment/minority receipts. The receipt test initially expected `$2.0B`; it was corrected to the existing formatter's `$2B` without changing the product formatter.

Final verification finished on 23 October local time:

| Final evidence | Result |
| --- | --- |
| Actual MobilePage route and receipt cases | 16/16 pass, including legacy no-offer 20% stakes; zero JS exceptions |
| Complete stock-flow regression matrix | 14/14 pass; fresh 50/51/100%, three studios, old cases, safe failures, debt review, SX and repaired quotes |
| Actual production App / StrictMode | 17 snapshots; Stocks purchase → vote/control notice → acquisition → verified career reload → Forbes ownership → three following actual App weeks; zero JS exceptions |
| Paid Forbes tender | Exact $4,858,750,000 settlement → verified reload → three actual weeks; identical shares/basis, one business, unchanged closing/debt count, no repeated diligence/signature fee or control notice |
| Contract and legacy rights | 15 public tender-contract cases, 29 route/receipt assertions, 26 private-control checks, three exact private contract-price scenarios, and the focused stock/save/accounting suite pass |
| TypeScript and web bundle | Fresh `npm run lint` and `npm run build` both exit 0 |
| Source verification | Guarded production/harness hashes remain unchanged during the final runs and still match the checkout after lint/build |

Individual browser states, console observations, screenshots and source hashes are linked from [browser-verification.md](browser-verification.md). [final-summary.json](final-summary.json), `lint-final.log` and `build-final.log` retain the final gate results. The web build retains existing large-chunk and static/dynamic-import warnings; no bundling redesign was added to this repair.

The unrelated `audit:studio-sale-security` aggregate still fails its theatrical-release history fixture: **real theatrical release must generate receipts**. The exact failure was also reproduced in the initial checkout before this repair. Both original and current logs are retained; this was not hidden by changing the fixture or box-office code.

All browser fixtures use isolated synthetic save keys; no production player slot was read or rewritten. Normal random App life-event choices were answered through the actual UI and logged by the harness. No production source changed to accommodate those test dialogs. Native device verification remains outstanding as recorded in the main report; this is local browser/service verification, with no commit, push or deployment.

## Re-run

Run `npm run audit:stock-forbes-routes`, `npm run audit:public-tender-contract`, and `npm run audit:stock-acquisition-safety`. With the stock acquisition Vite lab running, run `npm run audit:stock-forbes-routes-browser`, then the existing matrix and actual App smoke sequentially. Close those browser jobs before `npm run lint` and `npm run build`.
