# Responsive Phases 6–7: stress and native QA progress

Date: 2026-09-28. Status: **in progress; not a release sign-off**.

The owner elected to proceed beyond the current Phase 5 slice. Its unvisited inventory rows remain **deferred, not passed**. The starting/onboarding presentation remains separately deferred by the owner. The Phase 7 release gate still requires the complete inventory or an explicit release-scope decision, native regression, and owner visual approval.

## Phase 6 — stress sample

- Synthetic Team candidate and populated BoxOffice detail were rendered at 320×400 and 448×956 with a 125% root text-size stress approximation, reduced motion, and each selectable language: English, Brazilian Portuguese, French, Spanish, Turkish and German. Five translations are still marked in progress in the game.
- The first run found Portuguese `Parceiros` clipped in the compact four-across BoxOffice detail tab rail. The game-neutral `ResponsiveGrid` now applies a BoxOffice-specific 2-or-4 policy using measured container width: two columns at 320px, four at 448px. Source order, child keys and click handlers are unchanged. The rerun passed the no-document-overflow, 44px enabled-button, unclipped-button-label and column-count checks in all 24 screen/language/viewport combinations.
- An isolated iOS WKWebView screenshot revealed an additional issue not captured by page-overflow checks: a long theatrical release title broke the word `International` mid-word beside its run badge. A failing browser assertion measured only 113.8px of available title width against 136.4px needed. The theatrical and streaming list headers now wrap the badge beneath the title when needed. The six-language stress sample and theatrical/streaming/archive detail regression passed after the change.
- This 125% browser root-font rule is a stress approximation, **not** proof of native Dynamic Type support. Home, all other phone modes, multi-language data, device safe areas and real keyboard behavior need broader Phase 6 coverage.

## Phase 7 — native slice and extraction gate

- Xcode 26.2 provides an iOS 26.2 iPhone SE QA simulator. A separate `com.zedfury.responsiveqa` Swift `WKWebView` app (deployment target iOS 15.0) loaded the real BoxOffice React component from a synthetic local fixture in Brazilian Portuguese at 125% text. It did **not** access a player save, install over Actor Empire, or execute a game transaction.
- Native before/after screenshots: `responsive-after/ae-phase7-ios26-iphone-se-boxoffice-ptBR-125pct.png` and `responsive-after/ae-phase7-ios26-iphone-se-boxoffice-ptBR-125pct-after.png`. The post-fix screenshot shows the long title on whole-word lines with the run badge below. The native app opens the BoxOffice list, not its detail view; the detail state has browser evidence only.
- The neutral `ui-layout/` export barrel and README exist. A read-only import check found no Actor Empire `types`, services, app or view imports inside the module. The pure policy audit passed. The module is **not version-frozen, extracted, published or approved** for another game while the remaining screen/native gates are open.
- iOS 15 runtime is not installed; an iOS 15 deployment target does not establish runtime compatibility. Android API 36.1 emulator is available, but the changed BoxOffice screen has not yet been rechecked there. A physical iPhone 16 expected-versus-actual composition and owner approval remain open.

## Visual reference

- Home 320×740 before: `responsive-baseline/actor-empire-home-320x740.png`; after: `responsive-after/home-320x740.png`. The compact Condition group changed from four cramped columns to two rows of two with full labels. These use different synthetic player names/data, so compare **layout**, not values or pixel-level art.
- BoxOffice 320×400 before text stress: `responsive-after/ae-phase5-boxoffice-theatrical-detail-320x400.png`; after 125% stress: `responsive-after/ae-phase6-boxoffice-en-125pct-320x400.png`. The latter uses larger text, so its 2×2 tab arrangement is the meaningful comparison.
- Team current Agent and candidate detail: `responsive-after/ae-phase5-team-agent-roster-320x400.png` and `responsive-after/ae-phase5-team-agent-detail-320x400.png`. These are current-state examples, not before/after of identical data.

## Owner visual correction — 2026-09-28

The owner identified Home's four-across Condition tiles as a signature composition. The earlier `responsive-after/home-320x740.png` screenshot and the Home before/after sentence above are historical Phase 3 evidence, **not the current Home layout**. Home now keeps all four Condition tiles in one row at every audited 320–448px phone width; Skills and Status remain paired. The browser audit checks four columns, one-row placement, full single-line Condition labels, no horizontal overflow, and navigation at six widths. Its current 320px capture is produced at `/tmp/actor-empire-home-320x740.png` during the local audit. Other responsive reflows were only inventoried for owner review and were not changed by this correction.
