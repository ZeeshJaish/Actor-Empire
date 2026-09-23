# Streaming Launch S1 Implementation Plan

> Inline execution in the existing Actor Empire checkout, as requested. Do not commit, push, create a worktree, or alter unrelated dirty files.

**Goal:** Make career Build coverage and rehearsal truthful, finite, and understandable without changing saves, filing economics, or the S2 registration/blank-draft flow.

**Architecture:** Canonical network coverage computes geographic reach and well-served share per opening country. The career adapter projects those values and local facility capacity into the existing `CountryService` contract; Build views consume one complete service record. Rehearsal retains the canonical engine and adds an all-market presentation summary and specific local failure context.

**Tech Stack:** TypeScript, React, Vite, Node audit scripts; targeted browser verification at phone and desktop widths.

**Spec:** [Streaming Launch Stabilization Roadmap](2026-09-23-streaming-launch-stabilization-roadmap.md), Phase S1; [S0 failure ledger](../reports/2026-09-23-streaming-launch-s0-baseline.md).

## Global constraints

- `Player`, facility persistence, money, energy, filing, commissioning, and weekly simulation remain authoritative; no new save fields or balance numbers.
- The S0 prefilled-first-Build red test belongs to S2 and remains red after S1. The S0 `NaN` red test must turn green.
- Missing or non-finite coverage must be visibly unavailable and fail the commissioning gate; it must never become `Strong` or an invented `0% served` success.
- Rehearsal counts must cover every market, not just visible or hidden monitor cells. Spare global compute and unavailable local routes are separate facts.
- Preserve the current user's dirty tree. All new edits in this plan are limited to the named code/tests/docs.

## Task 1: Canonical geographic and local service projection

**Files:** `services/streamingNetworkCoverage.ts`, `components/streaming-transplant/StreamingBuildWizardExperience.tsx`, `scripts/audit-streaming-launch-s1-coverage.tsx`.

- [x] Add red tests: regional no-route and residency cases produce zero country reach; owned and cloud coverage produce finite, bounded reached/covered/cloud shares; the full career adapter emits finite `reachedShare`, `coveredShare`, `coveredPeak`, and cloud share for every market, including dark and overloaded ones.
- [x] Run the S1 audit and confirm the specific missing-field/cross-region assertions fail.
- [x] Extend canonical coverage without changing stored state. Project each market's well-served peak from canonical geography, local route capacity, and its demand; align country `state` and repair hint with that reading. Preserve the existing configuration signature and rehearsal flow.
- [x] Run the S1 audit and S0 baseline. The coverage regression passes; the S2 prefill regression remains red.

## Task 2: Guard every Build consumer against invalid coverage

**Files:** `components/studio-finance/finance/placer.ts`, `components/studio-finance/finance/build.ts`, `components/studio-finance/components/build/StageTest.tsx`, `scripts/audit-streaming-launch-s1-coverage.tsx`.

- [x] Add red tests for a deliberately malformed country service: no `NaN` output, no positive region grade, a visible unavailable diagnostic, and a blocked commissioning/rehearsal gate.
- [x] Run the test and confirm it fails on the current `Strong` fall-through.
- [x] Validate numeric service fields at the consumer boundary; mark invalid coverage unavailable without silently treating it as healthy. Keep valid dark/no-route markets distinct from missing data.
- [x] Re-run the targeted audit and focused existing Build/placer audits.

## Task 3: Rehearsal counts, local explanation, and viewer drill-down

**Files:** `components/streaming-transplant/StreamingBuildoutExperience.tsx`, optional small shared presentation helper in `services/`, `scripts/audit-streaming-launch-s1-rehearsal.tsx`, focused browser fixture/audit only if needed.

- [x] Add red tests for a mixed all-market rehearsal: precise playing/buffering/down totals and no-route failure despite spare global capacity; direct viewer selection was verified in the isolated browser fixture.
- [x] Run the red test and confirm the missing presentation helper fails to bundle.
- [x] Render the all-market summary near the capacity/viewer screen; label the overflow cell as a subset; expose each visible monitor as a viewer-market control. In the viewer report, show the selected market's route, local load/limiting factor, and repair, while reusing the existing overlay rather than duplicating its screen.
- [x] Re-run targeted tests and verify the mobile display does not hide the reason beneath long lists.

## Verification and handoff

- [x] Run final S1 audits, S0 baseline, existing regional placer, canonical parity, rehearsal/autosave gates, production build, TypeScript, and `git diff --check`; report exact pass/fail counts.
- [x] Verify the isolated rehearsal fixture at 393×600, 393×852, and desktop; no player save was opened or changed.
- [x] Update the S0 failure ledger with S1 dispositions, including the newly discovered partial-reach/rehearsal mismatch. Do not begin S2 without approval.

**F27 decision resolved:** The user approved a separate geographic commissioning condition using the existing `SERVED` threshold. The Launch checklist and canonical quote now require at least 80% smooth geographic coverage in every opening country. The load rehearsal continues to stress-test routed traffic; an override cannot waive coverage. No partial-market failure model, save migration, or S2 flow change was made.
