# Retained Stocks and Forbes routes — browser verification

All 16 focused cases passed on the final exact-share, accepted-contract-price, stored paid receipt and legacy20% no-offer receipt source freeze, with zero JavaScript page exceptions and equal before/after source SHA256 hashes. See `browser/results.json` for the individual snapshots, source hashes and console messages; screenshots are grouped by case.

The harness renders the actual `MobilePage`, including its real Forbes→Stocks callback. Actions use real production services, external-player migration, verified IndexedDB generations and the actual weekly engine. Each case uses a new browser context and a synthetic isolated save key. Real user slots were not accessed.

- Public0: Forbes says **Open Public Tender**; the dossier exposes **Buy Shares in Stocks** and **Open Public Tender →**. Choosing Stocks opens Paramount’s actual stock detail, rather than the default ticker.
- Public51% with historical CLOSED cooldown or final third rejection: profile exposes **Complete Control Transfer**. Both finish with one studio, no additional share charge, identical shares/basis, one 25E signing spend, and a safe verified reload.
- NETFLIX, APPLE_TV and DISNEY_PLUS with old DRAFT cases: profile acquisition actions stay hidden; direct MobilePage desk routing shows **Acquisition Unavailable**. The actual diligence service also rejects with the same player object and zero cash delta.
- Actual zero-share public tender: paid diligence, filed an aggressive public tender, processed a real week for the board response, then signed. The accepted $4,858,750,000 is debited exactly once and becomes the exact basis of 325,000,000/650,000,000 shares (50%). One owned studio/control and the shares/basis survive verified reload.
- Private expired CLOSED cases: currently OPEN_TO_OFFERS exposes Approach Studio; currently NOT_FOR_SALE does not. Merely navigating either path changes no cash or holdings.
- Legacy accepted 5% and 49% public tenders with zero holdings: final signature rejects with clear guidance to buy the remaining shares or submit a full control tender. Both leave money, shares, energy and owned businesses unchanged.

Additional real UI tender cases verify fractional and exact-share boundaries:

| Existing shares | New tender | Resulting shares | Exact accepted price and debit |
|---:|---:|---:|---:|
| 200,200,000 (30.8%) | 20% | 330,200,000 (50.8%) | $1,943,500,000 |
| 194,999,999 (one share below 30%) | 21% | 331,499,999 | $2,040,675,000 |
| 324,999,999 (one share below 50%) | 5% | 357,499,999 | $485,875,000 |

Each compares exact requested-percent pricing, the board’s accepted amount, the actual signature debit and added stock basis. Original share quantity/basis plus the purchased block survive verified reload.

The private minority case also performs actual paid diligence→25% minority offer→real board week→signature. It records a 25% company equity position, charges the exact accepted price, creates no wholly owned studio, displays **Position 25.00%**, and preserves the position through verified reload.

`red-accepted-price/results.json` records the meaningful browser failure before the final price repair: accepted $2,040,675,000 was charged as $2,040,680,000. The exact same accepted-price invariant passes in the final boundary case; no assertion was weakened to accept the extra $5,000.

The separate 14-case full stock regression matrix also passed after all route/price/receipt fixes, with zero JavaScript page exceptions and matching before/after source hashes (`regression-matrix/matrix.json`). It includes fresh 50/51/100% purchases, three studios, actual debt, old cases, safe failures, stale signing review and repaired-quote provenance. Existing-control acquired receipts are explicitly required to remain $0. The actual production App smoke also passed on this final source (`actual-app/results.json`): real Start Career slot selection→Mobile Stocks purchase→normal shareholder vote/control popup→Forbes diligence/signature→verified career reload→Forbes Studios→three actual following App weeks. Its 17 snapshots have zero JavaScript page exceptions.

This is Chromium/browser evidence. It does not substitute for native device validation. Console image-host DNS failures are retained separately from JavaScript exceptions. Private opening availability was verified in the browser; full private contract outcomes remain covered by the production private-acquisition service regressions.

The final acquired receipt is checked against the stored closing price, independently of the new current-control readiness after shares settle. Public receipts read $4.9B, $1.9B, $2B and $485.9M for the four paid tender cases; the private minority receipt reads $232.4M. Zero-extra-price existing-control transfers remain $0. These compact labels are checked within their displayed precision; the underlying cash and basis checks remain exact.

The paid Forbes tender was then rerun separately through verified reload and three actual subsequent weeks (`tender-weeks/results.json`). Weeks 14–16 retain identical shares/basis, one owned studio, the same signed closing/diligence, one unchanged debt-entry count, no repeated control notice and no second signature energy spend. The fixture wallet stayed exactly $1,995,128,570,000 throughout those three weeks; no repeated acquisition or diligence fee occurred. This focused run also has matching source hashes and zero JavaScript page exceptions.

The current 16-case dossier screenshot is captured after a 1.3-second entrance wait so both route labels are readable. The prior 15-case run and its settled screenshot remain archived with their original result JSON and source hashes.

The final legacy fixture matches an already acquired private minority save with a 20% company position, a $150M signed closing and no saved offer. Opening the actual MobilePage acquired receipt displays **Paid $150M / Position 20.00%**. Viewing and verified reload preserve cash, energy, stock holdings, private position, signed closing and the absence of an offer. Prior 15-case artifacts and source hashes remain archived in `archive-before-legacy20-receipt/`. The 14-case regression matrix, actual App purchase/control-transfer/reload/three-week flow, and paid Forbes tender/reload/three-week flow were all refreshed and passed after this final Desk correction. The final runs completed on 23 October local time; their source hashes and original JSON evidence are preserved in the corresponding folders.

The legacy fixture’s receipt currently shows a live **Income/Yr estimate of $35M**, while its historical closing stores an expected annual income of $42M. This is a current estimate versus a historical expectation; it is not a guaranteed cash receipt or a changed contract price. The cash, paid price, ownership position and stored closing remain unchanged. No regression attribution is made from this difference.
