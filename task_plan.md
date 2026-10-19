# Streaming and production-house release-readiness audit

## Objective
Assess the committed game and local streaming candidate through actual platform founding/build/launch, multi-week world simulation, production/release, financial integrity, persistence and browser interactions. Report blockers with reproduction and evidence; do not implement fixes or push changes without a follow-up request.

## Scope and preservation
- Committed baseline: f983535 (relationship fix retained; budget UI reverted).
- Current dirty streaming economy work is a distinct candidate, not the shipped baseline.
- Preserve existing files byte-for-byte; use isolated temporary snapshots and test saves.
- Web/synthetic/native/production evidence must remain distinguished. No live-player saves, purchases or remote mutations.

## Phases
1. [complete] Inventory and snapshot baseline/candidate; select coverage and existing known-failure evidence.
2. [complete] Run broad baseline streaming, world, production-house and persistence audits; independently reproduce failures.
3. [complete] Exercise founding-to-live platform and production-house browser flows with separate test persistence.
4. [complete] Run representative multi-season/52+ week scenarios, world responses, treasury/rights and save/reload invariants.
5. [complete] Compare local candidate on impacted checks; classify findings and write release-readiness report with exact limits.

## Next Step
Audit complete. Deliver HOLD verdict and report; implementation requires the follow-up scope decision. Normal founder-to-viewer flow is failed on reproduced blockers; prepared launch and long-run engine coverage are reported separately.

## Errors / constraints
- Package lists and older skill output were too broad; all subsequent inspection is targeted and large logs go to artifact files.
- No AGENTS.md discovered in repository inventory.
