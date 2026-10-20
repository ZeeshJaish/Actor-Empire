# Streaming market UI verification — 20 October 2026

The requested feedback, reveal, map-entry and header fixes are implemented locally. Current Anshu gameplay was preserved. No rights, fee, auction-supply or settlement validation was relaxed.

## Changes and observed behavior

- Scout success feedback previously existed both globally and inside the scout card, without a dismiss timer. The scout card now owns one short-lived status, clearing after 3.5 seconds. A real disposable scout produced one status and it was absent at the 3.8-second check.
- Scouting creates private fixed-price offers. Three service-level paid scouts replaced the private shelf, each charging the quoted fee and producing 20 fresh direct offers; public auction IDs stayed unchanged. Copy now explains the separate three-game-week public rotation. The current Anshu market visibly has 55 fixed-price lots, no public rooms and one game week until rotation. No paid scout or week advance was performed on the actual save. The exact historic reason its public snapshot has no eligible rooms was not extracted.
- Rights/funds checking now uses a centered modal and an 84% black backdrop. At 393×852 CSS pixels its center measured (196.67, 426), matching viewport center within subpixel rounding.
- Acquired results wait for their finite entry animations and two paint frames before enabling skip and starting a 3-second hold. A real 1,040-title acquisition retained 1,041 titles; the fully presented result remained for 3,000.7 ms. A separate purchase verified disabled early skip, enabled skip after presentation, and dismissal on tap. Per-result cleanup prevents old timers dismissing later results. Reduced-motion presentation avoids the entry animations.
- Build opens at WORLD with all regions collapsed. Existing saved racks and compute remain. Verified on the real Anshu network with 32 sites, 206 compute and 197 opening countries.
- Define the Launch uses the incumbent Build header spacing, background and rail treatment. The seven-stage rail only scrolls when the selected step is outside the viewport. Verified on the actual save and at 320, 393, 431 and 1,024 CSS-pixel widths with no page overflow or title/count overlap.

## Current performance evidence

Production browser fixture, 197 filed countries. These are double-frame event-to-paint lab observations; fixture construction is excluded. The fixture uses memory-only player updates and does not include App persistence. Single-session samples are not field INP or hardware guarantees.

| Case | Current measurement |
|---|---:|
| 52 titles: first Define open | 264.9 ms |
| 52 titles: first Build open | 338.5 ms |
| 52 titles: Define stage taps | 33.3–72.2 ms |
| 52 titles: Build stage taps | 11.4–18.6 ms |
| 52 titles: rack + / − | 37.3 / 19.9 ms |
| 1,040 titles: ten bid amount taps | 15.9–25.4 ms; median 17.7 ms |
| 1,040 titles: first Build open, 3 runs | 735.8 / 739.5 / 745.5 ms; median 739.5 ms |
| Same-host initial-region control, 3 runs | 724 / 695.8 / 679.9 ms; median 695.8 ms |

The diagnostic control changes only the initial map focus back to the previous auto-selected region. Both variants retain the dominant heavy cold-open work; world-first adds roughly 44 ms at the session medians. Do not compare this session directly with the historical 396 ms run: host, viewport and protocol differ. These UI changes are not a further cold-open optimization.

No seconds-long bidding freeze reproduced. A valid 0%-backend upfront bid was accepted through the real production UI on the 1,040-title case, with all 1,040 licences retained and no captured warning/error logs. The ten-control window still recorded 50–55 ms tasks, so occasional dropped frames remain possible on slower CPUs. A contended acquisition run while another build was running is excluded from headline interaction timings.

## Verification and remaining limits

Seven targeted audit commands passed: market presentation lifecycle, supply rotation, wizard navigation, Build world, Build rehearsal/autosave gates, rights transactions phase 6, and durable save generations. TypeScript and the production build passed. Independent review found no actionable issues. The presentation regression test was first observed failing before implementation and passing afterward.

One additional legacy interaction audit fails at its hard-coded $4M auction bid assertion, identically on unchanged HEAD 2573f1e and current code. Its service call returns INVALID_TERMS: “A meaningful fixed upfront license fee is required independently of backend.” The controlled fixture changes the bid floor without adjusting the source lot's reference value. This failure is not introduced by these UI changes, and canonical validation was retained. The broader pre-existing economy audit failure documented in the previous performance report was not addressed here.

Manual design detection found 36 advisory flags, all on source lines already present at HEAD and none on changed lines. Existing accent borders, easing and transitions were left standing to preserve the scoped design. No ignores or suppressions were added.

Responsive browser checks cover layout, not native device performance. No Android or iPhone hardware profiling was completed. Remaining heavy cold forecast/network calculations need a separate performance pass before claiming instant cold opens on low-end devices. The previously identified bulk-owned starter-draft 1,000-item cap is separate from durable catalogue capacity and remains outside this UI task.

## Local handoff

The actual local game is served from the current checkout at http://localhost:5174/. Anshu was smoke-tested through Build → HQ → Define → HQ → Market, without purchasing, scouting, commissioning or advancing a game week. Its saved configuration remains intact. Disposable production QA uses port 5175 and is shut down after verification.

Machine-readable measurements: [verification JSON](./2026-10-20-streaming-market-ui-verification.json).
