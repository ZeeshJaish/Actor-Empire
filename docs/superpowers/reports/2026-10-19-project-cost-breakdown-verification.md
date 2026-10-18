# Project cost breakdown and exact marketing input

## Changes

- Planning identifies its total as Total Project Budget. Confirmation separately labels production (including music), reserved marketing, and the total.
- Planning and project dashboards share a cost card. Mouse hover, mobile tap, and keyboard focus expose details; repeat tap and Escape close them. Accessible names include the total and expanded rows are associated with the button.
- Before campaign lock the total includes the reserve. After lock it becomes Total Project Cost, using actual recorded campaign spend. Returned reserve is displayed separately and excluded from cost.
- Legacy saves with incomplete marketing records show Recorded Total and Not recorded, including the partial legacy case with a reserve but no settlement history. Default migration zeros do not prove a free campaign.
- Custom marketing accepts exact whole-dollar amounts through a numeric keypad field alongside the existing slider and presets. Entry remains bounded by the existing available-funds cap.
- The cost helper only reads saved records. Funding, production-budget calculation, campaign settlement, save schema, ROI, and revenue code are unchanged.

## Verification

Observed baseline failures before implementation: four rendered-component checks for clear totals, interactive dashboard presentation, legacy uncertainty, and numeric entry. The additional partial legacy settlement case also failed before repair. A browser hit-test reproduced the planning popover sitting behind step navigation; raising the budget wrapper fixed it.

- `npm run audit:project-cost-display`: 12 checks passed, including component rendering, reserve/spend/refund totals, root/nested record deduplication, missing/partial legacy records, zero campaigns, malformed inputs, migration/reload, and read-only behavior.
- `npm run audit:project-cost-browser`: full real-component flows passed in installed Chrome at 320px and 390px with mobile/touch emulation, and 1280px desktop. Checked preset switching, negative/over-cap input, exact amount persistence, real Greenlight funding, tap/hover/keyboard details, popover stacking, no document overflow, weekly production, real release strategy settlement, and reload without duplicate payment/refund. No page errors.
- Browser accounting example: production $21,007,000 plus reserve $12,345,678 charged $33,352,678 once. Two campaign channels spent $2,500,000, returned $9,845,678 to studio cash, and displayed final cost $23,507,000. Personal cash was not charged for the reserved campaign again. Reload preserved both cash and recorded cost.
- Existing Greenlight calculations, project builder/full talent lifecycle, marketing setup/modules/channel allocation, save migration/integrity/generations, streaming progress (19 checks), and relationship decay/contact actions (15 checks) passed.
- TypeScript no-emit check and production build passed. Build output was isolated at `/private/tmp/actor-budget-ui-build`; Vite retains its large-chunk warning.
- Frozen English baseline passed: 8,173 keys and 14,720 deterministic reaction cases. Baseline file was not changed.
- Independent read-only review found an accessible-name issue, which was repaired and re-reviewed; no remaining important findings.
- `git diff --check` passed. Unrelated pending streaming changes remain separate.

Browser harness uses isolated IndexedDB data with real game components and migration. It does not access a player's normal game save. Run with Playwright available via `PLAYWRIGHT_MODULE` and installed Chrome, or override `PLAYWRIGHT_CHANNEL`. Artifacts from this run are under the task visualization directory's `budget-ui` folder.

## Design-hook triage

The existing funding explanation button uses slate-950 text on sky-300 at approximately 12.1:1 contrast. The gray-on-color finding on that unchanged button is a false positive. The detector only supports a file-scoped exception for this rule; that exception and its reason are recorded in `.impeccable/config.json`. The button design is preserved. The new budget card and input have no outstanding deterministic design findings.

The subsequent Stop-hook palette finding points to the existing director-avatar purple/indigo gradient, identical in pre-budget commit `333cbfa` and paired with the established Key Talent heading/director role accent. This is preserved talent styling, outside the budget change. A file-scoped `ai-color-palette` exception records that evidence; no palette or runtime UI was changed for this finding.
