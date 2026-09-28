# Navigation and Content Market — Phase 0 Baseline

Date: 2026-09-28  
State: **Diagnostic baseline complete; no gameplay fix in Phase 0**  
Design: [Navigation and Content Market Experience](../specs/2026-09-28-navigation-content-market-experience-design.md)

## Result in plain language

The reported delay is reproducible in isolated browser tests. The first Home → Career and Home → Mobile visits showed the game's `Loading screen…` fallback on every measured run. In the Market, the largest measured delays are **entering the live auction room**, **submitting a bid**, and **opening Add Content**. The Gate → Market and poster → detail steps are much faster, so a generic poster-only or entire-page-loading explanation would miss the dominant paths.

## Test conditions

- Local Vite 6.4.1 dev server at `http://127.0.0.1:5174/`; listener PID's working directory verified as `/Users/zeesh/Vibe code/Actor empire`.
- Isolated Playwright headless Chromium 151, 390 × 844 viewport, localhost network, no network throttling, fresh browser context for each synthetic fixture. Measured with `performance.now()` from a DOM `button.click()` until the destination element exists and the next animation frame fires. `firstMutationMs` tracked the first DOM change. This is a lab interaction measure, **not** real-user INP, a physical tap latency, or production/native-device timing.
- Normal CPU and Chrome DevTools 4× CPU slowdown. Three independent runs per fixture/profile. The values below are medians in milliseconds; parentheses show the three-run range.
- Small streaming fixture: 6 world projects and 1 past project. Long-save fixture: 606 world projects and 151 past projects. Both use the compact deterministic historical catalogue recipe for roughly 2,000 searchable titles. Neither is the user's personal career or an exact copy of its 43-lot Market.
- The full game was used for Home/Career/Mobile navigation. The isolated `StreamingPlatformHQ` fixture used the real Content Desk → Add Content → Market → live auction → bid components and game services. Each browser context had private storage and was destroyed after the run.

## Lab results

| Interaction | Normal small | Normal long | 4× CPU small | 4× CPU long |
|---|---:|---:|---:|---:|
| Home → Career, first visit | 48 (34–76) | 313 (312–314) | 82 (42–90) | 84 (45–383) |
| Career → Home | 144 (141–145) | 161 (159–165) | 599 (591–701) | 606 (594–710) |
| Home → Career, repeat | 1 (1–2) | 4 (4–4) | 15 (14–16) | 16 (15–19) |
| Home → Mobile, first visit | 309 (307–311) | 311 (308–311) | 322 (322–325) | 323 (322–323) |
| HQ → Content Desk | 29 (28–29) | 30 (29–36) | 119 (115–128) | 134 (128–152) |
| **Content Desk Add Content → Market gate** | **379 (373–383)** | **384 (375–384)** | **1,516 (1,495–1,563)** | **1,538 (1,526–1,724)** |
| Gate → Market floor | 36 (31–46) | 32 (31–32) | 131 (125–132) | 133 (122–159) |
| Market poster → live title detail | 9 (8–9) | 8 (8–9) | 33 (31–34) | 35 (31–38) |
| **Detail → live bid room** | **570 (569–574)** | **574 (569–579)** | **2,307 (2,295–2,336)** | **2,343 (2,340–2,521)** |
| **Bid button → feedback** | **409 (408–413)** | **413 (408–417)** | **1,645 (1,642–1,651)** | **1,686 (1,669–2,046)** |

The first Career and Mobile visits displayed `Loading screen…` in all three runs for each fixture/profile; repeat Career visits did not. A fast Career result is **not** a clean experience if the fallback still flashes. The first DOM mutation for Add Content was usually close to its final timing (normal roughly 370–380 ms; slow roughly 1.5–1.7 s), which means the screen often gives no React-rendered response while that work runs.

## Trace-backed and code-backed interpretation

1. **Page-loading fallback is real and deterministic enough to reproduce.** `App.tsx` swaps `activePage` while the lazy module is still being imported; its shared `Suspense` boundary renders `Loading screen…`. Career is only idle-preloaded, and Mobile is on-demand. This is confirmed by source and browser observation, not merely inferred.
2. **Add Content is a synchronous mount/render bottleneck, not an intentional timer.** The actual Content Desk button leads to a roughly 0.38 s normal / 1.5 s slow first response. `StreamingContentMarket` derives overlapping listings, collections, supply, auction, historical, and exact-lot structures on mount. Historical title lookup can be repeated per lot. The browser baseline identifies the affected interaction; exact function-by-function percentages still require a focused component/JS profiler before Phase 2 edits.
3. **Auction entry and bid processing dominate Market jank.** Room entry synchronously constructs the session and updates the whole `Player`; bid submission does another whole-player update, and the UI update path runs save migration. The 4× slowdown grows both delays by roughly 4×. The measured timings establish impact; the precise split among auction selectors, migration, persistence, and React rendering is not yet isolated.
4. **Not every Market transition is slow.** Gate → floor and poster → detail are tens of milliseconds normally. Removing posters or an entire Market scene without evidence would not target the main delays.

## Existing no-data-loss baseline

All of these pre-change audits passed on the current dirty working tree:

- `npm run audit:save-integrity`
- `npm run audit:save-generations`
- `npm run audit:content-market-ui-transplant`
- `npm run audit:content-market-cm3` (live buyer auction domain)
- `npm run audit:streaming-rights-transactions-phase6`
- `npm run audit:streaming-rights-finalization-phase8`

All measured browser contexts reported zero page errors. The diagnostic script did **not** open, edit, import, delete, or benchmark the user's personal save. Future phases must rerun these audits and compare the same synthetic browser path after changes. This baseline is not proof that every existing save is safe; it is a controlled before-state.

## Phase 1–2 priority from these measurements

1. Remove the page-to-page fallback experience by making navigation code readiness and screen swap cooperate; keep actual recovery/error UI.
2. Profile and optimize live-room entry, then bid update/migration, with save/auction semantics unchanged.
3. Profile and optimize the Content Market's first mount and repeated selector work.
4. Verify the same interactions on an actual slower Android/iOS device and a production build before declaring player-visible latency solved. The current results come from a local dev build and CPU emulation.

## Reproduction

The reusable lab script is [`scripts/audit-navigation-market-phase0-browser.ts`](../../../scripts/audit-navigation-market-phase0-browser.ts). Bundle it with esbuild using `--external:playwright`, set `PLAYWRIGHT_MODULE` to the installed Playwright module, and run it against the local Vite server. Set `AE_PHASE0_CPU_SLOWDOWN=4` for the slower profile. The script uses new private browser contexts and synthetic fixtures only.
