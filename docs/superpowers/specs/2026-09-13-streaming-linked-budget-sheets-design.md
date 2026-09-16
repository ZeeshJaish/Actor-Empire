# Streaming Linked Budget Sheets Design

## Goal

Connect Define the Launch and The Build through compact, read-only financial summaries while preserving each wizard's existing responsibilities, calculations, drafts, and navigation.

## Scope

This change adds a Build Budget sheet to The Build and a collapsed cross-wizard summary to both budget sheets. It does not create a new accounting system, change prices, charge money, alter commissioning, or allow editing one wizard from the other.

## Interaction Contract

### Define the Launch

- `Studio Money` continues to open the company-money sheet and route to Studio Finance.
- `Launch Plan` continues to open the Launch Budget sheet.
- The existing launch overview, seven-stage checklist, and launch totals remain the primary content.
- A collapsed `Build the Platform` section appears below the launch totals.
- Expanding it shows the current Build status, racks, cities, redundancy, proposed build total, weekly operating cost, and build time.
- The cross-wizard section is read-only.
- `Open Build` closes Define the Launch and opens The Build at its current stage, defaulting to Sites when no stage has been retained.

### The Build

- `Studio Money` becomes a button that opens the same company-money sheet semantics used by Define the Launch.
- `This Build` becomes a button that opens the Build Budget sheet.
- The Build Budget sheet shows stages cleared, current build total, commissioning shortfall or remaining headroom, and the itemized lines produced by `moneyPlan`.
- Its five-stage checklist covers Sites, Plans, Money, Test, and Launch. Selecting a local row closes the sheet and opens that Build stage.
- A collapsed `Define the Launch` section appears below the build totals.
- Expanding it shows launch stages cleared, known launch subtotal, amount paid, and still due.
- The cross-wizard section is read-only.
- `Open Define the Launch` opens Define the Launch with its Launch Budget sheet already open.

## Shared Architecture

The feature uses presentation summaries rather than duplicating calculations:

- Launch data comes from `launchStageSummaries(data, draft)` and the existing launch treasury values.
- Build data comes from `moneyPlan(data, draft)`, `buildTotals(data, draft)`, `stageStates(data, draft)`, and the existing Build treasury values.
- Small serializable view models carry only display data and navigation status between the adapters and wizard components.
- Shared cross-wizard summary components render the compact accordion and do not own business logic.
- `StreamingPlatformHQ` coordinates the destination wizard and an optional budget-sheet-open request.

No financial amount is recalculated inside a React presentation component when a canonical finance derivation already exists.

## Data Flow

1. `StreamingDefineLaunchExperience` adapts the current player/platform state into the existing `LaunchData` and a read-only Build summary.
2. `LaunchWizard` renders its canonical launch calculations and receives the Build summary plus `onOpenBuildPlatform`.
3. `StreamingBuildWizardExperience` adapts the current build selection into `BuildData` and receives a read-only Launch summary.
4. `BuildWizard` renders its canonical build calculations and receives the Launch summary plus a navigation callback.
5. `StreamingPlatformHQ` switches wizard surfaces and passes a one-shot initial-sheet request so cross-navigation lands on the intended budget view.

The existing launch draft reference and Build selection adapter remain authoritative. Cross-navigation must not charge money or silently commit a draft. An unapproved assisted-team proposal may be regenerated from the retained Build inputs; approved and canonical Build state remains unchanged.

## Presentation

- Reuse the existing `Sheet`, typography, dividers, state colors, and spacing language.
- Cross-wizard sections start collapsed to keep the sheet usable on a phone.
- Each collapsed header shows the other program's name, status, primary total, and chevron.
- Expanded content uses one compact summary strip and no nested card grid.
- Local checklist rows are interactive; cross-wizard detail rows are not.
- Navigation is an explicit full-width action labelled `Open Build` or `Open Define the Launch`.
- Status text uses player language: `Not planned`, `Draft`, `Approved`, `Commissioned`, or `Live` where supported by canonical state.

## Accessibility

- Budget triggers are real buttons with `aria-haspopup="dialog"`.
- Accordion controls expose `aria-expanded` and identify their controlled section.
- Sheet titles and summary labels remain readable without color.
- Interactive checklist rows preserve visible focus states and minimum mobile touch targets.

## Edge Cases

- No Build selection: show `Not planned`, zero racks/cities, and no fabricated cost.
- Partial Build draft: show `Draft` and the current calculated proposal.
- Launch catalogue not priced: retain `Not priced`; do not coerce it to zero.
- Shortfall: show the canonical shortfall and the existing Studio Finance route.
- Plenty of cash: show headroom without adding extra allocation panels to the rail.
- Missing cross-summary input: omit the linked section rather than render stale or invented values.
- Closing either sheet returns to the exact wizard stage without changing the draft.

## Verification

Automated coverage must prove:

- Define the Launch exposes the Build summary and `Open Build` navigation.
- The Build exposes company money and Build Budget triggers.
- Build Budget uses `moneyPlan` lines and stage state rather than hardcoded totals.
- Build stage rows navigate locally.
- `Open Define the Launch` requests the Launch Budget sheet, not merely a launch step.
- Both cross-wizard summaries are read-only.
- Zero, partial, shortfall, approved, commissioned, and missing-summary states render safely.
- Existing launch and assisted-build audits remain green.
- TypeScript, production build, and `git diff --check` pass.

Manual browser verification must cover both navigation directions on the mobile viewport and confirm that closing a sheet preserves the current wizard stage and draft.

## Non-Goals

- Combining Define the Launch and The Build into one wizard.
- Editing Build choices from the Launch Budget sheet.
- Editing launch choices from the Build Budget sheet.
- Adding new funding instruments, accounting entries, prices, charges, or save migrations.
- Redesigning the existing company-money sheet.
