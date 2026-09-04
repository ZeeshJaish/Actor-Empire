# Streaming Rights Office Phase A7 Completion Report

**Completed:** 2026-09-02  
**Scope:** Project A Phase A7 — Rights Office, Relationship Intelligence, and Commercial Observability  
**Next phase:** A8 — Presentation, Tools, Balance, and Final Verification

## Outcome

A7 is complete. A production house now has one manageable business-affairs desk instead of needing to administer every film through a separate popup. The deep A1–A6 contract simulation remains intact underneath the desk.

The player can choose how much control each studio retains, see only genuinely actionable exceptions, inspect every title when wanted, understand why automation acted, track commercial relationships, and reconcile actual streaming income and exposure.

## Simulation changes

### Per-studio licensing mandates

Each production house can persist:

- Strategy, Custom, or Full Control;
- financial priority;
- distribution priority;
- exclusivity policy;
- preferred window duration;
- partner preference;
- renewal policy;
- automatic guarantee and term limits;
- global-exclusive and franchise protections; and
- per-title manual/delegated overrides.

Mandates carry a revision and update week. An identical update returns the original player state. Changing a mandate never rerolls or rewrites an existing contract, offer, or already-resolved decision.

### Explainable delegated decisions

New delegated renewal and catalogue-package commitments store:

- studio and mandate revision;
- control mode;
- the rule that allowed delegation;
- literal threshold and offer facts; and
- a concise explanation.

This makes later audits and player explanations reconstructable without inventing a hidden “best deal” score.

### Rights Office portfolio

The office derives its view from completed studio projects and canonical rights records. It groups titles into:

- action required;
- available to license;
- under contract;
- approaching expiry;
- delegated decisions; and
- no current interest.

The action rail is capped at seven urgent items. A focused 40-title fixture proves that Strategy and Custom stay manageable while all 40 records remain available to the detailed system.

Outsourced/platform-commission productions remain excluded from owned-studio rights evaluation.

### Relationship intelligence

Platform relationships are calculated from existing facts:

- accepted and rejected bidding-room offers;
- successful renewals;
- commissioned deliveries and cancellations;
- breach/recovery state;
- backend settlements;
- profitable-deal memory; and
- rights transfers.

The result is a scored tier and trend with visible factual reasons. No second relationship ledger was added.

### Commercial statements

The studio statement separates:

- licensing guarantees;
- producer fees paid;
- restricted platform production funding;
- locked future-season funding;
- attributed adjusted gross;
- gross backend accrued;
- backend paid;
- recoupment remaining;
- downstream transfer proceeds; and
- actual cash income.

Production funding is not counted as studio income. The platform projection separately records title revenue, guarantee/acquisition cost, production funding, producer fees, royalty expense, transfer purchases/sales, and retained contribution. Forecast variance remains unavailable instead of being fabricated.

### Weekly digest and persistence

The normal weekly game loop now processes the Rights Office after canonical renewals and catalogue-package automation. It writes at most one deterministic digest for a week, emits no empty-week noise, preserves exact same-week replay identity, and retains at most 52 entries.

Save schema version 30 normalizes and compacts A7 state and per-studio mandates.

### Platform AI transfer-history hardening

The A6 AI transfer path was found writing up to 520 decision records while Platform AI's canonical history contract is 40. Transfers now use the shared bounded append helper.

The long-run invariant now also accounts for exact same-week transfer proceeds that settle after the platform's economy allocation step. Exact 104-week save/resume parity passed. The full 2,600-week multi-fixture run remains deliberately assigned to A8's final exit matrix.

## Player-visible result

Monarch Pictures and other player production houses now expose a `Rights Office` division with five sections:

1. **Portfolio** — title count, latest desk note, small action rail, summary numbers, transfer lineage, and exact A4 renewal actions.
2. **Mandate** — control mode and future licensing policy for that studio.
3. **Relationships** — platform score, tier, trend, reasons, and realized value.
4. **Statements** — reconciled realized economics with restricted funding visibly separated.
5. **Packages** — the existing A5 catalogue-package desk.

The presentation uses a compact ledger aesthetic, typographic hierarchy, rules instead of nested card grids, keyboard-visible focus, responsive horizontal tabs, and reduced-motion support.

EMPIRE+ continues to use the same `StreamingRightsCalendar` component boundary and now receives a factual retained-contribution projection. It does not acquire a separate rights model.

## Existing systems reused

- `WorldState.streamingRightsContracts` for rights truth.
- `WorldState.streamingBiddingSessions` for offer outcomes.
- `WorldState.streamingRoyaltySettlements` for backend and recoupment.
- A4 renewal cases and control behavior.
- A5 package records, bidding, allocation, and settlement.
- A6 transaction lineage and exact remaining-term transfers.
- existing production-house platform relationship memory.
- existing Platform AI decision and finance histories.
- the canonical weekly game loop, save migration, and compaction.

No parallel rights, cash, revenue, package, catalogue, or relationship authority was introduced.

## Verification evidence

Passed focused audits:

- `audit:streaming-canonical-foundation-phase1`
- `audit:streaming-active-bidding-phase2`
- `audit:streaming-rights-compatibility-phase3`
- `audit:streaming-rights-calendar-phase4`
- `audit:streaming-catalogue-packages-phase5`
- `audit:streaming-rights-transactions-phase6`
- `audit:streaming-rights-office-phase7`
- `audit:streaming-rights-marketplace-phase16`
- `audit:platform-ai-rights-lifecycle`
- `audit:platform-ai-distress`
- `audit:save-migration`
- `audit:save-transfer`
- `audit:streaming-weekly-loop-phase10`

Additional evidence:

- Vite production build passed.
- `git diff --check` passed.
- Repository TypeScript reported no A7-owned error. Remaining diagnostics are older owned-platform audit-fixture mismatches involving `publicManifesto`, `networkPlacements`, old enum literals, and related stale required fields.
- Live browser QA used the established Tony Stark / Monarch Pictures save.
- Desktop Rights Office, all five sections, and commercial statement rendered without console errors.
- A 390 × 844 mobile viewport had `documentElement.scrollWidth === window.innerWidth` and no page-level horizontal overflow. The five-tab navigation scrolls within its own bounded rail.
- Long-run Platform AI exact 104-week resume parity passed after the transfer-history fix. The longer 2,600-week fixture was not claimed complete in A7.

## Intentionally deferred

- broad news/X/Instagram reactions for rights drama;
- legal consent, lawsuits, actor replacement disputes, and contract litigation;
- future-output and multi-picture deals;
- invented forecast values where no canonical forecast exists; and
- A8's complete balance, accessibility, save-size, workload, and long-run exit matrix.

## Next phase

A8 will harden and finish Project A: presentation consistency, accessibility, compact decision tools, QA-only shortcuts, legacy/malformed migration fixtures, workload and automation parity across all three control modes, balance bands, and the complete long-run Project A exit report.

