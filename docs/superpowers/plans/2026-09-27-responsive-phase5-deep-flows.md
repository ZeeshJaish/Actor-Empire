# Responsive Phase 5 Deep Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inline in the existing dirty Actor Empire checkout; do not stage, commit, or overwrite unrelated changes.

**Goal:** Make every in-game nested Actor Empire flow readable, tappable, and recoverable across compact and wide phones without changing game state, saved progress, ads, purchases, or visual identity.

**Architecture:** Reuse `ui-layout` where a component matches its named policy; use scoped intrinsic layout and visible-area scrolling for flow-specific geometry. Preserve all current adapters, keys, handlers, tutorial IDs and transaction boundaries. Migrate and test one family at a time, keeping an explicit inventory of uncovered states.

**Tech Stack:** React 19, TypeScript, Vite, Capacitor WebViews, existing `ui-layout` primitives, Chromium geometry audits, iOS/Android native QA.

**Spec:** `docs/superpowers/specs/2026-09-27-cross-game-responsive-layout-system-design.md`

## Global constraints

- Phase 0 physical iPhone 16 reference remains deferred by the owner; browser evidence cannot sign off native release.
- Preserve current styles, content order, `Player` schema, save data, ads, purchases, tutorial anchors, and callbacks.
- Leave the starting Actor Empire sequence and onboarding untouched by the owner's latest direction; those screens remain an explicit later gate, not Phase 5 work.
- Do not infer rendering quality from viewport width.
- No global scale-down, blanket overflow clipping, or tiny-font workaround.
- Tests use synthetic saves in an isolated browser context; never install over the real game bundle ID or complete paid/rewarded flows.

---

### Task 1: Mobile launcher and folder entry points

**Files:** `views/mobile/MobilePage.tsx`, `views/mobile/DatingFolder.tsx`, `views/mobile/SocialFolder.tsx`, `scripts/audit-responsive-phase5-mobile-browser.ts`.

- [x] Write a real-browser RED test at 320×568 and a wide phone: all app icons fit inside the phone screen, labels remain readable, all launcher/folder targets meet 44×44px, and destination/back state stays intact.
- [x] Apply one intrinsic icon-grid policy to the launcher and folder entry points. Preserve icon art, source order, tutorial IDs and mode transitions; make the launcher scroll vertically when short.
- [x] Rerun GREEN and capture compact/wide screenshots.

### Task 2: Mobile app families

**Files:** `views/mobile/*.tsx`, focused audit scripts, screen inventory.

- [ ] Audit each reachable mobile mode: CastLink, IMDb, BoxOffice, Instagram, X, YouTube, News, Team, Messages, Forbes, Stocks, Tinder, Luxe, Bank and Guide. Record compact/wide overflow, clipped primary labels, keyboard/dock overlap and small Back/Close targets.
- [ ] Fix confirmed geometry in bounded clusters while preserving each mode's internal state and transactional callbacks. Prefer local container queries, intrinsic grids and scrollable data regions over changing the phone shell globally.
- [ ] Verify mode-specific return routes and non-mutating detail, compose or confirmation screens; never trade, post, hire, purchase or sign in layout QA.

Progress: all 15 entry modes pass 320×400, 320×568 and 448×956 document-overflow, 44px Back-target, visible-button and Back-route checks. CastLink Auditions, IMDb Credits, BoxOffice Streaming, Team Manager, Stocks Portfolio, X Following, Instagram Profile, YouTube Film & TV and Tinder setup preference were added as non-transactional submode checks at short and compact heights. News story detail, Bank's three tabs, X compose/cancel and Instagram compose have additional compact/wide checks; both composers were checked at 400px height without submitting a post. CastLink/IMDb filters, tabs and social post actions were raised to 44px. X's floating composer was found to block the Following tab at 320×400; on short screens its action now moves into the header. Other phone apps' data-dependent internal details, chat/keyboard behavior and transactional sheets remain unverified, so this task is open.

### Task 3: In-game event/recovery overlays

**Files:** `components/LifeEventModal.tsx`, `components/ProductionCrisisModal.tsx`, `components/SaveRecoveryModal.tsx`, `components/WeekProcessingRecoveryModal.tsx`, related modal CSS and audits.

- [ ] Test short/narrow screens, safe-area and keyboard states, all options, Back/Close and retry access before changes.
- [ ] Fix only verified geometry defects, keeping event selection, save recovery, ad eligibility and fallback logic unchanged.
- [ ] Verify unsubmitted choices/drafts survive resize, back navigation and modal close/reopen where the existing flow promises them.

Progress: three-option Life Event, Production Crisis, Save Recovery and Week Processing Recovery pass 320×400 short-height, 320×568 compact and 448×956 wide visible-area, internal-scroll and reachable-action checks. No choice, retry or save callback was invoked. Other event/recovery variants and state-continuity cases remain open.

### Task 4: Studio, streaming and acquisition flows

**Files:** `views/lifestyle/business/`, `components/studio-finance/`, `components/streaming-transplant/`, `components/Streaming*`, scoped styles and audits.

- [ ] Enumerate and audit Production Wizard, Development, Greenlight, negotiation, pre-production, production, release, studio acquisition/control/signing, streaming build/launch/pricing/rights/market, and cinema states.
- [ ] Migrate overflowing grids, forms, sticky footers and sheets in bounded clusters; preserve source order, draft state, document and signing semantics, save boundaries and original art.
- [ ] Test keyboard, short height, long labels, Back/Next/Confirm reachability and draft continuity without committing transactions.

Progress: the synthetic Production Wizard passes its gate, confirmation, name document, executive selection and reachable signing control at 320×568 and 448×956 without executing the signing callback. Its compact capital/signature row wraps. The studio dashboard's shared division-card policy uses one readable column at 320px and two at 448px, including the owned-subsidiary command center. The acquisition dossier, due-diligence sheet, War Room and four contract pages pass the same widths with stubbed transaction callbacks. Six studio division entry screens and their reachable non-transactional sub-tabs/sheets now pass compact/wide document-overflow, Back and 44px visible-button checks. All seven streaming launch steps pass those geometry/target checks in a fixture; release strategy's six fixture states pass compact/wide overflow and primary-action reachability. Greenlight's empty-script entry passes a compact/wide header, Back and scroll-to-action check; its later project-specific steps are untested. The Cinema teaser has a short-height scrolling layout that keeps its pitch and CTA separate while retaining the wide-screen composition. Lifestyle Assets, Real Estate ownership/dealer list, Activities and trip builder pass 320×400, 320×568 and 448×956 overflow, visible-button and return checks; compact Asset titles and trip stat cards were corrected after screenshot review. Business Empire and all four venture-wizard presentation steps pass those sizes without launching a company. These are presentation tests, not live market filing, release signing, platform launch, greenlight completion, cinema notification or venture creation.

### Task 5: Ads, purchases and remaining overlays

**Files:** Store/debt/life-event/production ad surfaces, premium confirmation surfaces, global dialogs, other inventory rows as identified.

- [ ] Audit the one-ad and Wellness two-ad presentations, retry/continuation states, purchase confirmation, and global overlays at compact/wide and short heights. Use non-completing fakes or UI-only test hooks, never serve real ads or complete payment.
- [ ] Correct only layout, focus and scrolling. Keep the rewarded-ad coordinator, durable session IDs, verified reward persistence, and IAP callbacks untouched.
- [ ] Verify primary actions and dismissals remain visible and do not duplicate ad steps or payment requests.

Progress: a UI-only Store fixture renders Wellness at 0/2 and 1/2, then opens and cancels a premium purchase confirmation at 320×568 and 448×956. Progress, primary actions and dialog dismissal meet the 44px and visible-area checks; callback stubs throw if an ad or purchase is invoked. A synthetic negative-balance save was not a valid debt-modal fixture because game hydration normalized it before the dialog could appear; that diagnostic was removed, and no debt-flow geometry pass is claimed. Other ad retry/error states, debt and event ad overlays, and actual sandbox callbacks remain open.

### Task 6: Inventory and release boundary

**Files:** `docs/qa/2026-09-27-responsive-screen-inventory.md`, screenshots under `docs/qa/responsive-after/`, focused audits.

- [ ] Every Phase 5 inventory row has compact/wide interaction and geometry evidence, including nested modes; label genuinely blocked/untested rows openly.
- [ ] Run focused TypeScript, production build, previous Home/Social/shell/Phase 4 regressions, new flow audits and `git diff --check`; inspect screenshots for visual drift.
- [ ] Keep physical iPhone 16, iOS 15, Android WebView, dynamic type/language stress, paid-ad sandbox and owner approval as open gates for Phases 6–7. Do not mark the game-wide responsive issue resolved early.

Progress: focused new browser audits, Home (six widths), Social (five widths), shared shell (three widths), Phase 4 main pages, `npm run build` and `git diff --check` have passed during this cluster. The build retains Browserslist-age, Firebase import-split and large-chunk warnings. The unvisited Phase 5 rows above and the Phase 6–7 native/owner gates remain explicitly open; Phase 5 is not signed off.

## Continuation — 2026-09-28

- Task 2: Guide Quick Start/search, all 16 Handbook/6 Playbooks/16 FAQ article expansions, long TEXT inbox detail, synthetic YouTube Watch/unsent Upload and synthetic Stocks detail/unsent order mode now pass 320×400, 320×568 and 448×956 browser checks. Guide, YouTube and Stocks targets and long stock-company wrapping were corrected. Other data-dependent details, interactive offers and native keyboard remain open.
- Task 3: a golden-option Life Event remained open through viewport resize without selecting a choice. Reward failure and recovery callbacks remain untested.
- Task 4: a populated synthetic Filmography sort/filter and five project-detail phases pass the same three viewports. Full studio-title wrapping, See More/Back/filter targets, compact poster duplicate-title overlap and Edit Working Title target were corrected. Project-specific Greenlight/production/release/rights and streaming transactions remain open.
- Task 5: production debt warning, exhausted and game-over presentation states; reward-save retry, ad feedback toast, save-transfer progress/cancelling and Android-only Settings Save Transfer now pass UI-only short/compact/wide fixtures. Ad, purchase, transfer, restart and save callbacks were disabled. Native ad SDK errors, session restoration, transfer execution and sandbox purchase remain open.
- Task 6: focused TypeScript, Vite build, `git diff --check`, Home/Social/shell/main-page, studio-division/Store and 15-phone-entry regressions passed. The inventory still lists unvisited nested states, so all Task 2–6 boxes remain open and Phase 5 is **not yet signable**. Physical-device, iOS 15, dynamic-text/language and owner-visual gates remain in Phases 6–7; startup stays deferred.
- Task 2 continuation: synthetic CastLink audition, Jobs and shared negotiation detail now pass short/compact/wide checks; the short-height offer-action clipping, small detail/stepper/job controls and long-name wrapping were corrected without invoking callbacks. A populated IMDb credit detail/Back passes the same sizes after its small Back target and truncated header were corrected. Other data-dependent phone details remain open.
- Task 2 continuation: a populated theatrical BoxOffice release's four detail tabs and Back passed the same sizes; tiny Back/tab targets, small tab text and long-header clipping were corrected. Streaming/archived detail variants and other populated phone screens remain open.
- Task 2 continuation: seven populated Team roster/candidate-detail flows pass short/compact/wide geometry, action reachability, Back and one open-detail resize check after small current-member Fire targets were enlarged. BoxOffice streaming and archived release details now pass the same four tabs and Back at all three sizes. Their callbacks stayed disabled. Forbes/Tinder/Luxe and other data-dependent variants remain open.
