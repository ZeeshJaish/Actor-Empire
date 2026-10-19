# Streaming country filing energy and major market cards

Approved scope implemented on 20 October 2026 in the existing Actor Empire checkout. Existing unrelated dirty changes retained. No commit, push, native build or real-save gameplay advancement performed.

## Result

- Fixed country categories: 169 countries at 2E, 17 at 5E, 11 at 10E; 197 unique countries, exactly 533E for initial worldwide filing.
- Major IDs: US, MX, BR, DE, IN, JP, ID, CN, RU, PK, BD.
- Featured 5E IDs: CA, AR, CL, CO, GB, FR, IT, ES, EG, NG, KE, ZA, KR, PH, TH, AU, NZ.
- Filing quotes sum unique unfiled country IDs. There is no 30E cap or batch discount. Individual, geographic group and File all routes settle identical energy and country fees.
- Insufficient full-batch energy does not partially submit the batch. Affordable individual filings remain available; unfiled countries can be added and submitted later.
- Additional compliance requests charge 5E plus the specified requested payment. Normal review progression is unchanged. Repeated requests after settlement/reload do not charge again; an inconsistent request status cannot debit money without advancing the request.
- Already submitted/approved countries are not retroactively charged the new tariff.
- China, Russia, Pakistan and Bangladesh use detailed cards and the same full report composition as USA/India. They are omitted from compact grouped country lists, while geographic membership remains intact. All 28 detailed presentations and 169 grouped presentations use the existing canonical country dossiers, audience, languages, rivals, taxes, compliance costs and network data. Promoting presentation does not expand the authored economy roster or rewrite rights prices.
- Pakistan and Bangladesh wide flag headers use their existing supplied flag artwork.
- Post-launch expansion now offers all 197 countries, with canonical energy labels, individual filing, batch affordability and 5E follow-up labels.

## Files

Primary implementation: `services/streamingMarketFilingQuote.ts`, `services/streamingMarkets.ts`, `services/streamingOpeningProgramme.ts`, `components/StreamingDefineLaunchExperience.tsx`, `components/StreamingMarketExpansionWizard.tsx`, `components/studio-finance/finance/launch.ts`, `components/studio-finance/components/launch/StepMarkets.tsx`, `components/studio-finance/components/launch/StepClearance.tsx`, `components/studio-finance/components/FlagField.tsx`.

Regression audits: `scripts/audit-streaming-launch-s3-energy.ts`, `scripts/audit-streaming-launch-s3-ui.tsx`, `scripts/audit-streaming-living-markets-phase5.ts`.

## Verification

- Test-first failures observed for the obsolete count-based quote, full-batch affordability, follow-up cost, promoted-card layout, expansion single-file actions and wide flag artwork. A new inconsistent follow-up-state regression also failed before the settlement guard was added.
- `npm run audit:streaming-launch-s3-energy`: 8/8 pass. Includes real domain settlement of all 197 markets in one funded test batch versus every geographic group, both ending at 533E and identical country payments. These are disposable test players, not the user's saved career.
- `npm run audit:streaming-launch-s3-ui`: 13/13 pass. Real React static renders cover country cards, dossiers, no duplicate grouped cards, 533E global quote, affordable 2E individual filing at 70E despite a blocked 197-country batch, and post-launch individual filing controls.
- `npm run audit:streaming-launch-s3-geography`: 5/5 pass.
- Opening Programme domain and UI audits pass.
- Living Markets phase 5 audit passes; its old US 5E and follow-up 3E expectations were updated to the approved 10E/5E contract.
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`: pass. Final repeat also exited 0 with no diagnostics.
- `npm run build`: pass. Existing CSS and bundle-size/dynamic-import warnings remain.
- `git diff --check`: pass.
- Local Vite listener: PID 57591, 127.0.0.1:5174, cwd `/Users/zeesh/Vibe code/Actor empire`.

## Browser evidence boundary

The earlier browser security-policy block on observing localhost remains a limitation. No alternate browser-control surface was used to bypass it. This turn verifies domain behavior, React server-rendered UI and the production build, not a live browser tap-through, screenshot, native device or real-save reload. The local game was requested in a Codex browser panel for user handoff; the app returned queued. Open or refresh http://localhost:5174/ for manual verification.

## Review evidence

Turn baseline: `/tmp/streaming-energy-533-baseline/`.
Turn-only patch: `/tmp/streaming-energy-533-only.patch`.
Logs: `/tmp/energy-533-final-domain.log`, `/tmp/energy-533-final-ui.log`, `/tmp/energy-533-geography.log`, `/tmp/energy-533-opening.log`, `/tmp/energy-533-opening-ui.log`, `/tmp/energy-533-living-green.log`, `/tmp/energy-533-typecheck-final.log`, `/tmp/energy-533-build.log`.
