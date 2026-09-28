# Content Market Phase 4 balance and Phase 5 integrated QA

Date: 2026-09-28  
Scope: [navigation and Content Market experience](../specs/2026-09-28-navigation-content-market-experience-design.md)  
Status: **Phase 4 implemented; Phase 5 QA executed, release gate held**

## Shipped in this checkout

- Market card status, Marquee, and rating badges now overlay the poster art. At 390 px and 320 px browser widths, the badges stay within the artwork frame, with no document overflow or short tap targets.
- New Content Market licence quotes use a versioned value model: format, box office, quality, reach, prestige, territory, term, exclusivity, and Marquee tier. The displayed figure is a rights guarantee for a term, not a purchase of film IP. The Market shows compact K/M/B/T amounts for large balances while the contract/confirmation path retains exact figures.
- Existing save records with no quote policy retain the old price model for their current three-week market cycle. On weekly processing, a version-2 policy is scheduled for the **next** cycle. Existing signed rights, current auctions, pending negotiations, and current-cycle offers are not rewritten. New platform states start on version 2. The policy is optional in saved data and survives normalization/serialization.
- Private scouting fee and its escalation are unchanged; this balance pass concerns content licence quotes.

## Price simulation and save safety

`scripts/audit-content-market-pricing-phase4.ts` passed. Its deterministic fresh and long-save fixtures each contained a 2,000-title historical catalogue, 12 direct listings, 2 live auctions, and funded rival participants. All 12 direct listings were within a $500M opening treasury in both cases; the fresh median was $41.75M (range $16.25M–$178M), and the long-save median was $60M (range $18.75M–$178M). The test also checked rights-scope monotonicity, legacy V1 quote parity, malformed numeric fallbacks, next-cycle policy activation, serialized policy round-trip, preserved pending guarantee, and unchanged rival auction benchmark for an existing cycle. These are synthetic balance fixtures, not a live-save economic forecast.

The save-integrity, save-generations, save-migration, save-recovery UI, large-save startup, rights transactions/finalization, market CM1–CM4, supply rotation, and 20-year long-save market audits passed in this QA run. Browser purchase, private-offer, studio import, live bid, and upcoming-auction paths passed. The user's personal career was not modified for QA.

## Browser experience

Chromium 151, 390 x 844, isolated synthetic fresh/long contexts; one final normal and one 4x CPU run after the code changes. Click-to-next-frame timings in milliseconds:

| Path | Fresh normal | Long normal | Fresh 4x | Long 4x | Phase 0 normal / 4x baseline |
|---|---:|---:|---:|---:|---:|
| Add Content -> Market gate | 82 | 136 | 324 | 342 | ~379–384 / ~1516–1538 |
| Detail -> live bid room | 176 | 274 | 738 | 766 | ~570–574 / ~2307–2343 |
| Bid -> feedback | 41 | 33 | 125 | 119 | ~409–413 / ~1645–1686 |
| Career -> Home | 158 | 164 | 640 | 672 | ~144–161 / ~599–606 |

No `Loading screen…` appeared in the measured navigation/Market steps, and no browser page errors were recorded. The first Career and Phone visits in the focused startup/navigation audit also completed without a page loader. Career -> Home is roughly baseline, not a material speed win. These are local lab timings, not real-device INP. Poster/detail and room/bid controls showed an immediate first DOM mutation even where the completed render took longer.

The Phase 2–3 browser audit passed at 390 px and 320 px: 15 visible cards, no duplicate lead titles, poster-contained badges, readable `$500M` buying power, clear fixed-price/live labels, rights explanation in detail, and no horizontal overflow. It also exercised a $2T treasury display separately.

## Build and native checks

- Final `npm run build`: **pass**. Vite emitted large-chunk warnings; no build failure.
- Final `npm run lint` (`tsc --noEmit`): **fail on three unrelated QA-script diagnostics**: missing `WorldState.aiCatalogue` in `scripts/audit-ios-long-session-soak.ts:56`, and self-referential `player` annotations in `scripts/audit-responsive-phase5-lifestyle-browser.ts:19` and `scripts/audit-responsive-phase5-nested-mobile-browser.ts:50`. These diagnostics were present before this Phase 4 patch; none points to the changed Market/quote files. They still prevent a clean repo-wide type gate.
- Android debug APK built offline after copying the final web bundle. In an isolated temporary Android emulator data image, fresh app launch reached Start Career and empty save slots, and background/resume returned to Start Career. This is a native smoke test, not evidence for a restored user's career or auction resume.
- iOS Debug simulator build completed after copying the web bundle (non-fatal Crashlytics dSYM warning), but the QA app failed before the start screen. The native recovery overlay appeared and the WebKit content process reported `EXC_BAD_ACCESS / SIGBUS` (`com.apple.WebKit.WebContent-2026-09-28-192951.ips`). The simulator used a QA-only bundle ID; no user's iOS app data was touched.
- Asset copy fingerprints for `dist/index.html`, Android public index, and iOS public index matched in this QA run.

## Release decision and remaining evidence

**Hold the coordinated release.** Phase 5's full exit criteria are not met while iOS simulator startup crashes and the repo-wide type gate is red. Android native smoke does not cover auction background/resume; an actual low-end phone, real long-save import, offline/IndexedDB pressure, and device performance also remain unverified. The next release pass should first isolate the iOS WebKit crash with a clean simulator/production build, fix or formally triage the three TypeScript QA-script errors, then run native save-resume and auction-resume checks on real devices. Do not treat browser synthetic save tests as proof of every existing player's save.
