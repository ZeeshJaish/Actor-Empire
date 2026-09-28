# Legacy streaming rights — Phases 1 and 2

**Status:** Implemented locally on 2026-09-25. No catalogue seeding, commit, push, or release was performed.

## Delivered

- Save migration now inventories raw pre-normalization active releases, archived projects, canonical contracts, player/AI buyer-local licences, and accepted bidding sessions. It records a versioned reconciliation summary.
- Explicit finite or permanent signed terms remain authoritative. A synthetic 52-week `PRODUCTION_RELEASE` fallback from a proven old no-term placement is promoted in place to a permanent streaming position. The recorded buyer, territory, countries, and exclusivity are retained; missing scope defaults to global exclusive. Explicitly terminated or transferred positions are not revived.
- An archived old sale with one known buyer gains one deterministic permanent rights record. Incomplete buyer-local no-term licences are aligned with the canonical result. Migration posts no new cash, settlement, award, or IP transfer.
- Sales with an unknown/conflicting buyer, bounded territory without known countries, or an accepted bid without a matching signed contract receive a persistent rights hold. Common compatibility checks block both market listings and final purchases for held titles. Unsold titles remain eligible.
- Non-empty holds are included in protected save-state comparison without changing the fingerprint of old saves that had no holds.

## Verification

Passed: `npm run audit:legacy-streaming-rights-phase1-2`, `npm run audit:save-migration`, `npm run audit:save-integrity`, `npm run audit:save-transfer`, `npm run audit:streaming-rights-compatibility-phase3`, `npm run audit:streaming-rights-marketplace-phase16`, `npm run audit:streaming-rights-finalization-phase8`, `npm run audit:streaming-rights-transactions-phase6`, `npm run build`, and `git diff --check`.

The focused audit covers active and archived old sales; explicit finite and expired terms; synthetic fallback repair; player and AI local licences; retained bounded scopes; terminated deals; accepted-bid orphans; market listing/signing refusal; unsold eligibility; no financial replay; migration idempotence; and compacted-save round trips.

`npm run lint` is not green because of two existing, unrelated `index.tsx` recovery-boundary type errors at lines 51 (`setState`) and 115 (`setTimeout`). No new migration TypeScript error was reported.

## Boundary and limitations

This gate protects rights; it does not populate the empty marketplace. The 2,000-title historical library, awards, starter advantage, and rival acquisition cadence remain later phases. An unresolved hold intentionally requires future evidence/reconciliation before that title can be offered; this phase does not guess the buyer or add a manual override. Verification used deterministic save fixtures, not a real player save or device transfer.
