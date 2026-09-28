# P6 — Career, save and visual regression

**Status:** Integration fixes and four separate pricing-to-live-week UI careers were completed on 2026-09-24. The phase is **not release-signed-off**: actual-device touch/keyboard and OS reduced-motion checks, archived final screenshots, creative acceptance, and the P5 historical-churn comparison remain open. No production release, commit or push was made.

## What changed during the integrated pass

- The commissioning agreement now distinguishes **physical rooms/racks** from **cloud sites/compute**. Cloud allocations use their cloud provider and compute quantity; listing-level costs that did not reconcile to the canonical execution quote were removed. The actual due-on-execution amount remains the single authoritative charge.
- A committed launch reopened from a save now shows a **saved opening-night receipt** from `launchCommit`, rather than sending an already-live platform back to GO / NO-GO or recalculating its opening figures. Opening the HQ acknowledges the existing queued reveal. A launch committed in the same mounted session can still finish its cinematic.
- The launch-step rail keeps the active stage visible at narrow widths. The pricing footer/back actions and editor controls were enlarged where possible; the revealed ad-free-pass numeric input now has a 44 CSS-pixel input target. Native number inputs and browser keyboards remain in use.
- A normalization defect found by the integrated world audit is fixed: enabling ads removes the incompatible **No adverts** benefit, but no longer strips compatible **1080p** or **2 streams** benefits. The world audit was also corrected to require subscription plans only for rivals that actually offer subscriptions; ad/store-only rivals legitimately have zero plans.

## Gameplay and save evidence

| Check | Observation |
| --- | --- |
| Isolated signed QA save | A disposable C6 phone career on a separate localhost origin was launched with a subscription/free-ad/store hybrid. Its saved opening receipt displayed 34,500 initial subscribers, 99.99% playback success and 2,040,000 protected peak capacity from the committed record, without a new GO LIVE action. |
| Receipt and first live week | Opening HQ left treasury at $173.5M. The first live week advanced week 23 → 24; HQ then showed 11,404 subscribers and $168.9M treasury. Reopening that saved career at week 24 went directly to live HQ with the same 11,404 subscribers and $168.9M, not through the receipt or pre-launch gate again. |
| Commissioning presentation | A separate disposable build draft with one physical Workhorse rack and 27 cloud compute spread over 24 cloud sites showed **1 room · 24 cloud sites** in the agreement, separate physical/cloud provider sections, and one canonical **$4.34M** due-on-execution amount. This was a UI check, not a real user-save commission. |
| Four economic modes | The deterministic C6 matrix passes for subscription, ad-only, store-only and hybrid. It checks delivered receipts and operating results, including a zero/thin/outage delivery gate. Ad-only had no paid subscribers; subscription and hybrid retained paid cohorts. This is fixture coverage, not four independent full careers. |

## Four separate pricing-to-live UI careers

Each career began with **no core offer selected** in a signed disposable slot on its own localhost origin, not the player's port-3000 saves. In every case the path was choice → editor → conditional forecast → blueprint → network allocation → Money → passing load rehearsal → commission → Opening Night → one live week → reload and reopen from slot 1. The launch newspaper reports total **accounts**; the live HQ subscriber figure is paid subscribers only. All figures below are rounded UI readings from these QA careers, not a balance promise.

| Career | Chosen offer and forecast | Build and launch | First live week, then reopened save |
| --- | --- | --- | --- |
| Subscription | Three plans; Essential edited to $8.49/month. Conditional 32K households and $258K/month potential gross. | One physical Workhorse rack and 27 Atlas cloud compute; rehearsal held; $4.34M charged once at commission. Opening paper: 37K accounts, 12K peak, 0% failed. | 10K paid subscribers, $18K subscription cash, $191.4M treasury. The same subscriber and treasury readings remained after reload. |
| Free with ads | One free offer; cadence set to an ad every 20 minutes (1.5 ad-minutes per eligible hour). Conditional 141K households and $47.2K/month potential gross. | 27 cloud compute; 34K likely-traffic rehearsal held; $0 network due on commission. Opening paper: 166K accounts, 54K peak, 0% failed. | 0 paid subscribers, $19K advertising revenue, $195.8M treasury. These readings remained after reload. |
| Rent or buy | Free browsing; uniform $5.99 rental and $19.99 purchase; premium access enabled at one week early. Conditional 20.2K households and $18.3K/month potential gross. | 10 cloud compute; 5K rehearsal held; $0 network due on commission. Opening paper: 23K accounts, 7K peak, 0% failed. | 0 paid subscribers, $8K transactions, $198.4M treasury. These readings remained after reload. |
| Hybrid | Three subscription plans plus public free-ad and rent/buy offers. Conditional 187.5K households and $536K/month potential gross. | 10 cloud compute; 45K rehearsal held; $0 network due on commission. Opening paper: 221K total accounts, 71K peak, 0% failed; live HQ distinguished 166K initial paid subscribers. | 12K paid subscribers, $21K subscription cash, $51K advertising and $8K transactions; $198.4M treasury. The subscriber and treasury readings remained after reload. |

The three low-upfront cloud careers incurred substantial weekly network costs, so a cash decline in week one is not evidence of a revenue-accounting failure. Subscription cash is shown separately from incremental ad/store revenue in the operating report. The QA paths do not establish tuned long-term profitability.

The live walkthrough uncovered and corrected three presentation/integration defects. The Blueprint had drawn its stored three-plan ladder for ad-only and store-only configurations; it now shows the active free or per-title offer, while hybrid still shows its real plan ladder. The Build demand forecast used paid subscribers only, producing **zero opening-night traffic** for free-ad and store-only modes despite nonzero forecast households; it now allocates paid, free-ad and store viewer accounts to country demand. Finally, the opening newspaper's total-account figure is labelled **Accounts**, and the Build summary calls the count **Ways to watch** rather than subscription plans. A further browser check found the default $5.99/$19.99 store prices invalid under whole-dollar slider steps; cent-compatible steps now allow $7.49 rent and $21.49 purchase to commit on blur in the pricing lab. The four career results above used the stated original store prices; this final slider check was an additional isolated, non-career UI check.

The new receipt test asserts that committed facts render and forecast-only peaks or pre-launch controls do not. It also guards the commissioning presentation and ad-plan feature normalization. Existing save-integrity and save-migration audits passed; this pass did not migrate or rewrite settled cash in any personal career. The isolated QA save belongs to the test origin, not the user's port-3000 career storage.

## Mobile and accessibility observations

- Pricing-lab browser checks at 320, 393 and 430 CSS pixels found no document-level horizontal overflow. The active pricing step remained reachable on a 320-pixel rail; its stage buttons, Back/Next controls, ad-cadence presets and pass-row labels measured at least 44 CSS pixels. After the final CSS correction, the revealed native one-hour pass-price input measured 44 pixels at 320, with a 46-pixel container and no overflow.
- At 320 pixels, the expanded ad card exposed frequency, market-estimated CPM/fill, premium access and optional passes as labelled controls. Switching from ad core to subscription showed a change summary before replacing active offers; the subscription card retained its plans and forecast. A long plan name was canonically shortened without causing horizontal overflow. Disabled research options remained labelled **Research locked** in the accessible tree.
- The pricing styles include a `prefers-reduced-motion: reduce` rule. The rule was source-inspected, not tested under a device OS preference. Browser viewport emulation and inline screenshots are **not** real-phone visual approval. Keyboard focus and native mobile keyboard behavior still require an actual-device pass; the programmatic Tab interaction did preserve the plan-name edit.

## Automated checks run

Across this pass, these checks passed: `audit:streaming-commercial-c1` through `c6`; `audit:streaming-pricing-p1` through `p6`; `audit:world-streaming-we4`; `audit:streaming-build-world`; `audit:streaming-build-phase4-ui`; `audit:streaming-billing-cohorts`; `audit:save-integrity`; `audit:save-migration`; focused C6 and P3 TypeScript configs; `npm run lint`; `npm run build`; and `git diff --check`. After the final cent-step slider correction, P6 audit, focused P3 TypeScript, full lint, production build and diff check were rerun green.

The C6 deterministic US fixture returned approximately: subscription **179,962 paid / +$183,644 operating result**; ad-only **243,773 free / $82,003 incremental gross / −$52,314 result**; store-only **$11,109 incremental gross / −$114,283 result**; hybrid **179,965 paid, 258,365 free / $83,044 incremental gross / +$256,872 result**. These are game-fixture figures, not a forecast for the user's careers. `audit:world-streaming-we4` now passes its 34-operator, 33-AI and 400-year deterministic projection checks. No new balance coefficients were chosen in P6.

## Open release decisions

1. Perform real-phone touch, native keyboard, focus and OS reduced-motion checks, capture reviewable final screenshots, and obtain the user's visual approval. The 320/393/430 browser checks and four local UI careers do not replace these.
2. Keep P5 balance sign-off provisional until a comparable pre/post historical churn sample is available. Do not invent that baseline from the network-limited C6 fixture.
3. Continue the broader P6 compatibility matrix (older configured saves, mid-edit core changes and retained entitlements) before a release declaration; automated suites cover these cases, but not every path was repeated manually in the four careers.

No old player save was deleted. P6 should remain a guarded integration milestone, not a claim that the app has shipped.
