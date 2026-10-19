# Streaming market and Originals repair verification — 19 October 2026

The approved auction-entry, backend synchronization, continuation-funding, finite-market, private-deal and Originals blockers are repaired. The impacted audit matrix passes 38/38 suites; full TypeScript and production build pass. Independent review found additional collection and rollover defects during this work; they were reproduced, repaired and retested. No important findings remain in that review scope.

This is a scoped functional verification. It does not certify every game path, native performance or store release. Economic outcomes remain setup-dependent; passing financial safeguards does not guarantee a profitable business.

## What changed

| Area | Final behavior | Evidence |
| --- | --- | --- |
| Auction entry | Zero or one genuine funded rivals no longer prevent entry. An empty room has no invented leader. Real cash requirements and seller reserve still apply; below-reserve offers can end NO_SALE. Cash-backed manual offers can exceed the old arbitrary reference-price ceiling. | Auction repairs: 9 checks; existing CM3, terms and funding audits |
| Backend | Current platform modes, countries, signed title routes and permanent-purchase exclusions determine eligibility. Subscription-only offers show disabled 0% controls and an explanation. Invalid proposals report a reason rather than silently failing. AI bids use actual eligible modes too. Browser checks cover zero-/one-rival entry and an enabled rental backend control changing from 0% to 1%. | Auction, backend and ads/rental integration suites; actual UI screenshot |
| Future funding | New promises fund only this film's sequels or this series's next seasons. Parent, lineage and installment numbers come from canonical title data and are frozen into the promise; spoofed client lineage is ignored. Funding is reserved and spent through the existing production obligations. | Auction repairs, terms, funding and CM3; actual sequel-only UI |
| Finite marketplace | Public title IDs, collection components and auction assignments are saved for the current three-week cycle. Purchase, offer or auction opening cannot promote a fresh card into an emptied slot. Paid scouting explicitly adds private offers; rotation uses the existing boundary. | Finite market: 7 checks; supply rotation and migration audits |
| Live rooms across rotation | A room retains settlement references without admitting its old title as extra public inventory. An unsold old room cannot turn into a new fixed-price card. | Red/green regression plus independent 20-seed funded rollover probe and no-sale public-admission probe |
| Collection settlement | The complete original package is saved, bound to the room and used for both player and AI settlement. 49/50-title packages survive JSON normalization. Every component's funds, rights and backend are rechecked; player funds exclude other commitments and AI cannot spend depleted funds. Signing uses the actual current week and retains original expiry. Expired windows reject. | Collection repairs: 12 checks; package phase 5; independent 6-/24-title and AI probes |
| Unsuccessful collections | A terminal room closes only its own unsigned snapshot. Three no-sale cycles leave zero unresolved packages and do not block an ordinary rights-desk proposal. LIVE and SIGNED packages remain intact. Damaged legacy unsigned rooms without a complete original snapshot fail closed and release commitments. | Collection repairs and independent original WORKLOAD_CAP reproduction |
| Private deal flow | The exact advertised fixed-price terms are accepted after normal seller delay. Changing the fee or clauses still invokes seller evaluation. The advertised proof survives reload, inherited rights grants remain correct, and final signature rechecks cash and rights. Duplicate signature is inert. Signed UI states that payment settled and the title entered the catalogue. | Private listed terms: 6 checks; CM1/2/4 and rights suites; actual $55M UI walkthrough |
| Originals readiness | Completed canonical production/commitments resolve a stale GREENLIT commission as delivered. Explicit unfinished/cancelled/on-hold production cannot become playable through a stale mirror. Catalogue, title routes and Originals share this resolver; localization, premiere and exclusive-rights gates remain enforced. | Readiness: 28 checks; old founder export diagnosis; prepared-network real launch and game-week integration |
| Originals overlay | Fixed viewport overlay above HQ, bounded internal scrolling, normal pointer interaction, Back/Escape support and focus restoration. | Actual old-founder export in isolated React memory, normal premiere click, desktop Escape returning focus to ORIGINALS; measured 400px phone viewport with no horizontal overflow |

## Preservation and test corrections

Existing signed licences, talent backend and legacy NEW_ORIGINAL funding agreements are not converted to the new continuation-only terms. Save changes are additive, including optional discovery and negotiation proof fields. Old careers initialize finite discovery without rewriting signed contracts or moving money. Existing save migration, integrity and generation-recovery audits pass. Browser work used disposable React-only careers; the user's actual game career was not intentionally edited, imported over or advanced.

Two existing royalty assertions incorrectly applied licensed-title seller shares to an owned Original that is now correctly playable. Those expectations now count actual signed licensed project/contract IDs. Production payout logic was not changed to make the tests pass. The old CM1 ordering assumption was also replaced with selection of an actual fixed-price listing, retaining its cash, rights and duplicate-purchase checks.

Pre-existing economic tuning and report changes in the checkout were preserved. This work did not add revenue multipliers, free audience, new cash grants or reduced licensing/country costs.

## Actual private-deal browser walkthrough

Path: **HQ → Content Market → The Market → fixed-price title → Negotiate rights**. It can be used before or after platform launch. It is not the release-day/premiere stage.

1. The Harbour 2 advertises **$55,000,000**, 104 weeks, shared rights, India + US.
2. Negotiate rights opens **HEADS OF TERMS / DRAFT · NOT SIGNED**. Treasury remains **$500,000,000**.
3. SEND IT submits a proposal. Treasury remains **$500,000,000**; no licence is signed yet.
4. After three processed isolated weeks, the seller accepts the same $55M terms and gives three weeks to sign. Treasury is still $500M.
5. Sign agreement settles **$55M once**: treasury becomes **$445,000,000**, the title enters the catalogue, and status says Signed / upfront settled. The repeated-signature guard is separately covered in the audit.

**Head of Rights** is the seller representative's job title. **Heads of Terms** is the draft commercial summary. **Fixed-fee licence** means a guaranteed upfront fee; it does not mean the screen or every clause is uneditable. Direct **LICENSE · $55M** is the immediate listed-terms purchase path; **Negotiate rights → SEND IT** is the delayed private-proposal path.

![Heads of Terms is an unsigned draft](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/terms-draft-not-signed.jpg)

![Seller accepted, payment not yet charged](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/terms-seller-accepted.jpg)

![Signed and $55M settled once](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/terms-signed-paid.jpg)

## Actual Originals evidence and scope

An exported old founder career has saved commission GREENLIT, completed production, and a master already paid. Imported into isolated React memory, it resolves DELIVERED / catalogue READY without rewriting that saved status or charging again. The real HQ Originals button opens the overlay; an ordinary unforced premiere click authorizes absolute week 2074 with treasury unchanged at **$407,469,329**. Desktop Escape closes the overlay and restores focus to the HQ ORIGINALS button. The measured phone document and overlay are both 400px wide, with no horizontal overflow.

That founder career still needs its network build before launch. A separate prepared-network integration uses the real launch function and four actual processGameWeek calls. The Original gets **275,931 → 349,529 → 421,322 → 481,215** viewing accounts, with title revenue/attribution **$276,639 → $347,006 → $416,850 → $477,059**. These figures are not net profit. Delayed localization, future premiere and conflicting exclusive-rights branches each produce **0 viewers / 0 receipts**. The $500K localization payment and $20M production accounting basis are each applied once. Same-week and compact→migrate→replay checks preserve cash and recognition.

![Originals premiere authorized at phone width](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/originals-phone-premiere-authorized.jpg)

## Automated evidence

Fresh final matrix: **38 suites, 38 exit-zero, no failures**. Includes finite shelf, private terms, auctions, collections, Originals readiness/playback, CM1–4, rotation/UI transplant, funding, signed royalties, shared wallets, ads/rental settlement, content accounting, tax, usage cost, run progress and save integrity/migration/generation recovery.

Matrix and per-suite logs: [audit-matrix.json](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/audit-matrix.json).

Full `tsc --noEmit` passed (8GB heap setting). `npm run build` passed in 38.28 seconds; the existing bundle-size warning remains. `git diff --check` passed. Independent final review reports no remaining important findings in the reviewed repair scope.

## Full-cost economic replay

The supplemental replay uses current production code, a prepared launch, one controlled seed and full country/service costs. These are measured simulations, not forecasts or a normal-career-from-scratch playthrough. Each case includes a $5M Original, $33.75M network capex, $85M incorporation/setup and $53M country entry, in addition to quoted title fees and recurring operating costs. Advertiser demand and player/AI consumer wallets are checked every simulated week. Finance profit and cash recovery are separate measures.

The 12-title first-window catalogue costs $180M. The six-title second-window catalogue costs $66M; replacement in the refresh cases pays another quoted six-title licence slate at week 105. Quality is95, with varied genres. The subscription case charges $7.99/month. The premium ads case uses 4 ad minutes/hour; the refreshed second-window ad case uses 6. Store cases charge $2.99/rental and $19.99/purchase, so their totals must not be described as pure rental-only earnings. These differing catalogue/window strategies are not a matched experiment that proves one revenue model universally stronger.

All **5/5 scenarios and 784/784 weekly check groups pass**. No failed conservation, receipts, backend, cash/Finance reconciliation or content-basis checks. Values below are cumulative within each case; they must not be added together as one business result.

| Tested setup | Weeks | Finance profit after expenses/amortization | Cash gain/loss after all investment | First / sustained cash payback |
| --- | ---: | ---: | ---: | --- |
| Subscription $7.99;12 first-window titles |104| **−$35,732,169** | **−$207,482,169** | Not reached within 104 weeks |
| Ads4min/hour;12 first-window titles |104| **−$85,786,785** | **−$257,536,785** | Not reached within 104 weeks |
| Store $2.99 rent/$19.99 buy;6 second-window titles |104| **+$160,800,662** | **−$10,949,338** | Not reached within 104 weeks |
| Ads6min/hour;6 second-window titles, paid refresh |260| **+$303,907,684** | **+$128,073,068** | **208 /208** |
| Store $2.99 rent/$19.99 buy;6 second-window titles, paid refresh |212| **+$328,426,632** | **+$156,676,632** | **132 /132** |

Sustained means cash remains above the initial $3B investment through the remaining **observed** weeks, not a guarantee about every future week. The first-window setups are deliberately expensive: high quality by itself does not make an underpriced or costly catalogue profitable. The refreshed second-window cases show a viable route with a long grind and actual reinvestment; they do not justify calling every strategy balanced or universally easy. A positive Finance result can coexist with unrecovered capex/setup/entry cash, as the 104-week store case demonstrates.

All consumer purchases/pass products across player and AI stay inside shared household wallets; all advertising receipts stay within finite country advertiser demand. Ads/rental backend equals the signed contract percentage of its actual eligible receipts, and recognized content cost never exceeds its paid basis. No money or audience boost was introduced for these results.

Exact configs, weekly rows, cost breakdowns and checks: [payback summary](/Users/zeesh/.codex/visualizations/2026/10/16/01a1432f-21fe-7212-bea8-7b93c103dc71/streaming-repairs-20261019/payback/summary.json). The case files alongside it contain the full run.

**Final verdict:** Green for the requested functional repairs and the tested conservation/accounting paths. The economic evidence supports a viable paid-refresh strategy in these scenarios; it does not support a blanket promise that a premium first-window subscription or ads catalogue will profit, or a whole-game release certification.
