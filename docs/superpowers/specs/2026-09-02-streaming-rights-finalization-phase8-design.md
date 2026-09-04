# Streaming Rights Phase A8 — Finalization Design

**Date:** 2026-09-02  
**Status:** Approved for implementation  
**Scope:** Project A exit hardening only

## Outcome

A8 turns the already connected rights market into a shippable system. It does not introduce another source of truth or a new economy. The canonical contract, bidding, calendar, package, transaction, mandate, and commercial-history services remain authoritative.

## Player experience

The Rights Office keeps its cinematic business-affairs-desk identity: ink-black surfaces, restrained gold rules, serif editorial hierarchy, and dense but legible contract facts. A8 avoids dashboard tiles and decorative SaaS cards.

For a 30–40 title slate, the first screen prioritizes deadlines and protected decisions. Detailed terms remain available inside each contract row without forcing casual players to manage every title. Strategy and Custom modes continue to surface only exceptions; Full Control preserves every manual action.

The Office section rail becomes a real accessible tab interface:

- arrow keys move between tabs;
- Home and End jump to the first and last tabs;
- the selected tab is announced to assistive technology;
- each tab owns a labelled panel; and
- mobile remains horizontally scrollable without causing page overflow.

Motion remains limited to short state transitions, and reduced-motion users receive no entrance animation.

## QA tooling

A dev-only Rights Market QA shortcut seeds a deterministic, realistic 40-title Empire Studios portfolio. It uses the canonical A1–A7 structures and contains:

- protected renewal decisions;
- routine delegated cases;
- expiring and returning-to-market windows;
- catalogue/package coverage;
- transfer-chain history; and
- commercial statement evidence.

The shortcut is only reachable from the existing development menu. Runtime rights logic never depends on it.

## Verification architecture

A single A8 exit audit composes the focused A1–A7 services and verifies:

1. The same starting facts generate the same offer and contract universe in every control mode.
2. Strategy and Custom delegation do not alter offer economics.
3. Protected decisions never auto-sign.
4. Switching modes cannot mutate signed contracts.
5. Same-week processing is idempotent.
6. A 40-title portfolio remains bounded and fully reachable.
7. Legacy, schema-v2, malformed, and repeated-reload saves normalize deterministically.
8. Contract, transaction, package, decision-history, and save-size collections remain bounded.
9. Contract IDs, transaction IDs, finance IDs, and catalogue entries are unique.
10. Production House, owned-platform, Platform AI, subsidiary, release, finance, and awards facts survive compaction and migration.

The existing Platform AI long-run audit remains the economy endurance authority. A8 adds a rights-focused long-horizon matrix and fixes only measured bottlenecks or invariant failures; it does not loosen assertions to force a pass.

## Visual critique before build

The existing A7 Office is visually strong and already avoids the earlier boxy card problem. Its main weakness is interaction semantics: the section rail only looks like tabs, while large portfolios lack a compact detail boundary. A8 therefore makes surgical changes—semantic tabs, compact disclosure, stronger focus treatment, and mobile density—rather than redesigning the screen.

## Non-goals

- No output-deal system.
- No new rights authority.
- No player-visible debug statistics.
- No hidden bonuses for delegated control.
- No Project B studio AI work.

