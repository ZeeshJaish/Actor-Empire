# Release-readiness findings

## Baselines
- Live checkout HEAD is f983535. Existing pending changes concern streaming model payback, economy/cost/tax services and reports.
- Commit e396f43 documented five pre-existing audit failures; these are historical claims only and will be rerun, not automatically waived.
- Existing synthetic suites are extensive, but many use prebuilt platform fixtures. A passed suite alone does not prove the normal founding/UI route works.
- Historical memory highlighted durability, long-session/native performance, and exact infrastructure rehearsal signatures; these require current evidence or explicit unverified status.

## Findings
Pending fresh verification.

## Fresh evidence (audit in progress)
- Isolated baseline Vite/Chrome runs from `/private/tmp/actor-release-readiness-20261019-6cxwzq8y/baseline`, port 5197; normal founder journey reached naming, branding and incorporation. Test career has $2B and qualifying fame/reputation. No live saves used.
- Broad matrix has completed >230 suites; failures include stale hardcoded schema/text/markup checks, so raw failures are not all gameplay bugs.
- Twenty-year market-only soak reproduces save-envelope failure: baseline 6,493,112 bytes, peak 29,699,050 at year 3, final ~7.96MB. Peak primarily `worldStreamingViewing` (~23.5MB). This is a transient retention/compaction concern, not proof of indefinitely unbounded growth or corrupted saves. Need trace why the isolated market loop retains this history.
- Full-world ads/rental balance matrix is running separately (15 scenarios, 732 weeks total if all complete). Quality/catalogue scale already changes subscription results; operating losses are not automatically bugs.
- Browser controller error was audit infrastructure only (stdin/TTY timeouts); moved to local HTTP controller. Browser currently reports no page errors.

## Completed broad matrix and independent follow-up
- Baseline production build PASS (16.45s, chunk-size warnings). Relevant broad matrix: 247 suites executed, 215 pass, 31 fail, 1 timeout. These are suite counts, not 247 distinct player bugs. Local candidate: 34 impacted suites, 32 pass and 2 same baseline failures.
- Proper persistence path `prepareVerifiedPlayerForPersistence` -> serialize -> `migratePlayerSave`, after six full `processGameWeek` ticks, reproduces audience-choice recalculation on first reload every week. Cash, debt, paid-customer and viewing/settled-economy records unchanged; second reload stable. Controlled next-week branches (same RNG) converge exactly for treasury, customers, choice and viewing. Impact is saved-world/readout consistency; no demonstrated duplicated payment or persistent next-week divergence.
- Several red suites are conclusively obsolete: media migration asserts version40 but current51; build forecast fixture has no catalogue and now correctly forecasts zero; C0 advertising lacks ad-market context after market-priced ads change; award schedule fixture injects legacy `upcomingRivals` whereas B7 explicitly projects only canonical production schedules; promotion sum includes optional undefined marketing/buzz keys (four numeric shares sum100); acquired royalty fixture has no new eligible signed receipt evidence. Do not call these reproduced gameplay bugs.
- Browser founder transfer: $2B -> $1.915B after incorporation -> $1.415B after $500M injection. Treasury $500M -> $447M after US clearance filing. Studio formed via actual UI with $50M personal setup; $10M studio opening cash.
- Confirmed display issue: streaming Finance renders Y1 W2039 in an age40/week12 career, mixing company-relative year with absolute-world week (`services/streamingStudioFinance.ts` company.week).
- Browser commission drafted and approved, creating a studio script and opening the actual Greenlight wizard. Casting Denzel Washington, self-directing and production configuration underway.

## Confirmed browser blocker: Originals Studio overlay
- Real founder career completed 33-week production into AWAITING_RELEASE / DELIVERED at age40 week45. Platform funded $13,530,671 of a $15M cap; $1,469,329 unused cap returned, studio wallet was not debited for this production a second time. Market approval progressed to READY.
- Opening Originals Studio reproduces HQ rendered in front of the pipeline: localization and authorize-release controls cannot receive normal pointer clicks. Computed `.originals-studio-overlay` position is `static`; CSS only sets `z-index:940`, which does not establish a fixed workspace. `#hq-main` intercepts events. Screenshot `/tmp/readiness-originals-obscured.png`, event-interception trace in browser command log. `AccessibleDialog` only adds semantic/focus handling, no positioning; no other CSS selector adds Originals overlay positioning.
- Diagnostic continuation only: injecting `.originals-studio-overlay{position:fixed;inset:0;display:flex}` into disposable browser, not repository, to test later business behavior. Unmodified flow remains FAILED. This must not be reported as a clean full UI pass.

## Confirmed Original delivery/access mismatch
- Browser-grown Original `Signal Premiere`: phase AWAITING_RELEASE after full33-week calendar; `getStreamingOriginalLiveStatus` says DELIVERED; commission's stored status remains GREENLIT. Catalogue shows IN PRODUCTION and excludes it from opening watching hours (2 licensed titles available instead of3).
- Both `getStreamingContentAvailability` and `evaluatePlayerStreamingTitleRoute` rely on raw commission.status (`services/streamingContentAvailability.ts:62,155`) rather than current production truth. Every subscription route denied PRODUCTION_NOT_READY in the exported career. Diagnostic copy changing only raw commission.status to DELIVERED made all three offered subscription-plan routes ALLOWED and catalogue READY. Existing career/save was not repaired during this audit.
- This is a functional streaming/production integration blocker, separate from the modal CSS blocker. Recommended repair: canonical production-ready resolver shared by catalogue, title routes, delivery and release; handle existing GREENLIT commissions whose referenced production already finished, preserving IDs, funding, views and receipts.

## Completed world/economy soaks
- Baseline: 15 scenarios, 732 full processGameWeek ticks, all732 per-week accounting assertions PASS. Cases: three business models, 6/24 licensed titles, quality50/95, 104-week subscription/ad runs and212-week rental with replacement licences at105.
- Local candidate: five full-country-fee scenarios, 784 ticks, all784 weekly assertions PASS. Subscription104, ads104, rental104, refreshed ads260 and refreshed rentals212. Includes shared household wallets, exact royalties, tax/levy settlement, content cost caps, finance reconciliation and gross incoming customer tenure.
- Candidate end-to-end cash payback: refreshed rentals recovered all modeled startup/content/market/network costs at week133 and ended +$163.1M after212 weeks; refreshed ads260 ended -$44.0M after investment despite +$140.1M accounting profit. Fixed premium catalogues were not guaranteed profitable. This is scenario balance evidence, not a universal exploit or a mandatory-win bug.
- World observed during actual33-week production career: 35 ecosystem operators, 62 canonical production records,43 current projects; logs show commissioning, production/release, hits/flops and external studio offers. Existing world/platform domain suites cover rival financial floors and rights lifecycle separately.
- A separate prepared C6 career completed actual UI GO LIVE from11/11 clear launch checks; launch commit ACTIVE,3186 initial paid subscribers, treasury$200M unchanged for the included STANDARD opening option. This prepared flow is separate from the normal founder career blocked by Original readiness/UI issues.

## Post-launch browser checks
- Prepared C6 UI launch completed; after4 actual processGameWeek ticks HQ showed5292 paid subscribers,4 saved weekly histories, treasury$198,183,595; two licensed titles had662388/649218 weekly viewing accounts. Market portfolio showed US ACTIVE and analytics reflected saved subscriber/churn/ARPU data. No JS page errors.
- The prepared C6 Original also remained raw GREENLIT, scheduled in slate but absent from actual player title viewing results. Its sparse fixture is not independent production-delivery proof; the browser-grown founder Original and direct availability diagnostic are the primary reproduction.
- User-facing launch morning feedback is a presentation of saved launch outcome, not evidence that every Original passed actual viewer eligibility. Do not use the clean-opening cinematic alone as release proof.
