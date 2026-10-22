# Claude Operations transplant — 22 October 2026

All five user-approved entries from `/Users/zeesh/Vibe code/ae claude/live` are transplanted into the main checkout. Work remains local, as requested. No career save was used for test purchases or advanced through a game week.

## Provenance and merge

- Main at start: `849cf7d`, branch `codex/streaming-tap-lag`. Parallel box-office work continued independently and committed `a75893a` and `a25cdaf` during this task. The Operations transplant remains an uncommitted local overlay.
- Claude baseline: `612efbb`; approved final snapshot: `refs/ae-live/latest`, `045f98b`.
- Ran `handoff.sh drift`: 48 paths, 37 clean, 9 overlapping, 2 already identical.
- Applied entries 001 → 005 with `git apply --3way` in an isolated temporary merge checkout, resolving overlaps before copying the affected files into main. Main's unrelated dirty work was preserved.
- 46 source/audit paths were adopted or merged. Two sandbox-only Content lab files were excluded. `disposition.json` lists every handoff path. The superseded flat `StreamingAudienceMap` was retired.
- All 12 relevant scoped stylesheets match the approved Claude copy byte-for-byte; `approved-ui-styles.json` pins those hashes. Run `node scripts/audit-streaming-operations-styles.mjs` to verify them.

## What landed

| Entry | Result |
| --- | --- |
| 1 | Audience living atlas, country sheets, region navigation and visual panels |
| 2 | Industry funnel/winners/pulse, model-aware audience figures, native Enter New Markets and Clearance |
| 3 | Platform Offer/pricing/forecast/sharing/storefront, Network map, technology scale and weekly status |
| 4 | Content posters/spotlight, catalogue mix, canonical renewal decisions, licence runway, slate and localization |
| 5 | Boardroom money/table/ownership/markets/M&A, weekly briefing and complete operating-revenue statement |

Offer, Network and Enter New Markets take precedence over the earlier wizard-based Operations editors. Secondary links from Build and launch destinations also reach these rooms after launch. Playback ident remains read-only in Claude's Offer UI; the existing canonical live-ident service and its purchase guards remain available in code.

## Canonical safeguards retained

- Pricing/storefront commit explicitly; rendering, previewing, forecasting and cancelling do not buy or save anything.
- Signed launch/rehearsal history, catalogue rights, paid localization records and customer settlement are preserved by configuration edits.
- Live network revisions require the exact configuration's rehearsal; debit only the quoted incremental cost; keep the operating network live during pending construction; refuse duplicates and unaffordable changes.
- Network editing cannot silently change commercial pricing. Live legacy network-price fields remain stable while the canonical Offer configuration drives customers.
- Expansion uses the existing plan, filing, energy, fee, government requirement and reapplication services. Existing launch history is not restarted.
- Renewal decisions use the rights calendar's canonical service. Research locks and ident-package receipts were retained.

## Integration adjustments without redesign

- Cancel or supersede outstanding pricing forecasts when the draft, saved offer, editor or mounted page changes; handle forecast errors without leaving the spinner stuck.
- Sharing previews use the policy that actually produced settled figures, including repeated changes in the same week.
- Preserve Audience region/country selection across room detours.
- Compact the subscriber metric so a large count fits the approved cells.
- For collections larger than 100 titles, render 60 existing cards per page. Counts and data still include the entire collection; no title or right is removed. Smaller collections retain Claude's original layout.
- Updated only the three deliberately replaced base-style hashes in the older ZIP audit, with the approval documented in that script. Unrelated style baselines were not re-recorded.

## Verification

- Final full `npm run lint` passed (exit 0).
- Production/streaming dependency-graph type check passed (App, both Operations audits and the isolated QA entry).
- Production build passed, including after final source changes; existing large-chunk/Browserslist warnings remain.
- 19 existing targeted audits passed: audience WE2/WE3/WE4/WE5 UI and settlement, HQ, launch/audience connection, tap performance, rights marketplace/transactions, Content consolidation, design system, catalogue context, Content Market CM1, finance, infrastructure, launch draft continuity, save generations and global localization.
- New safety audit passed 7/7: configuration/no-op/reload, rights/launch immutability, exactly-once ident charge, insufficient cash, price → network rehearsal/pending revision, expansion cash/energy/duplicate handling, render side effects, settled sharing baseline and 5,000-title record retention.
- Operations UI audit passed native Offer/market rooms and incremental network billing. Approved-style audit passed all 12 stylesheets.
- Browser suite captured 33 screen states at 320/390/768/1280 px with no document overflow and zero runtime exceptions. It exercised all four rooms, Offer preview/cancel/save, cancelled forecasts, storefront commit, Network editor routing, market entry, Content tabs/pagination and Boardroom tabs.
- Browser filing test selected Canada/Mexico, charged exactly $28.6M, opened clearance and returned to Markets with launch/rights unchanged. All mutations were in disposable in-memory fixtures.
- Main `localhost:5174` was verified in the in-app browser at the Actor Empire start screen, version 1.0.25. Its Vite process runs from this checkout. The tab and main server are left available for user testing.

### Large catalogue measurement

Same disposable 5,000-title case, 390 px desktop headless Chromium, development build; this is not a device benchmark or a percentile claim:

| Measurement | Before bounding cards | After |
| --- | ---: | ---: |
| Content click to visible | 2,075 ms | 659 ms |
| Initial DOM nodes | 180,505 | 2,669 |
| SVGs | 5,014 | 74 |

The full browser suite also checked the next page (titles 61–120) and Rights without mounting the entire catalogue.

## Resolution of the three historical audit failures

All three were corrected and re-run on 22 October 2026 with explicit user approval. Audience phase2 now permits floating-point addition noise; Promotion phase14 handles absent optional discovery channels correctly; the ZIP guard now pins verified approved styles and checks the actual mounted pages. UI and runtime save/payment files were not changed.

See [audit repair report](../2026-10-22-streaming-audit-repairs/README.md) for fresh 3/3 results, 14/14 audit commands, lint/build, negative controls and 7/7 safety groups. Original failed-run logs above remain historical evidence, not the current status.
