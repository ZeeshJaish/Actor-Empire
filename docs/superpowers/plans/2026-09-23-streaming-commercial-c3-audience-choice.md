# Streaming Commercial C3 Audience Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user approved inline work in this checkout; do not delegate, commit, or push.

**Goal:** Persist a deterministic, reconciled household-choice projection for subscription, free-ad, store-only, outside, and validated transaction overlays, without changing live cash.

**Architecture:** Reuse world population/participation and the existing paid monthly/annual allocator. Filter zero-price pseudo-plans from paid C3 candidates; allocate remaining households among free-ad, store, and outside choices using one player/AI kernel. Keep compact country/platform aggregates in save state. Attach only C2-validated player title entitlements. Normalize at migration and weekly loop; leave WE5/WE6 settlement unchanged until C4.

**Tech stack:** TypeScript, existing world-economy services, Node assertion audits, targeted `tsc`, Vite.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-c3-audience-choice-design.md`.

## Global constraints

- Keep new choice/entitlement state shadow-only; C4 owns live cash and forecast switching.
- Preserve existing dirty C1/C2 work, historical cash, and WE5/WE6 compatibility projections.
- Do not invent AI title ownership, per-person records, or historical purchases.

---

## Task 1 — Red contract audit

- [x] Add `scripts/audit-streaming-commercial-c3.ts` and a package command. Test pure ad/store/paid/outside reconciliation, price sensitivity, monthly/annual paid-path separation, zero-cost pseudo-plan exclusion, player/AI symmetry, and deterministic re-run. The first run failed on the missing service; a later red run caught a stale same-week offer projection.

## Task 2 — Choice kernel and compact canonical state

- [x] Add versioned C3 types and the shared allocation service. Keep country/platform primary counts and budget summaries finite and reconciled. Do not mutate input or post revenue.
- [x] Add malformed/old-save normalization, same-week idempotency, week-loop sequencing, compaction, integrity repair, and deterministic digest coverage. Preserve existing WE5/WE6 values.

## Task 3 — Transaction overlays and rights

- [x] Add bounded pass/rental/purchase opportunity counts as overlays, not households. Use the existing C2 route evaluator before recording player title ownership. Passes do not create title rights. Rental and purchase claims obey C2 expiry/permanence. AI may have opportunities but no invented title ownership.
- [x] Test denial, rental expiry, durable purchase, duplicate week, and save roundtrip. A red integrity test showed that title ownership was not yet protected by the save manifest; this is now covered.

## Task 4 — Verification and handoff

- [x] Run C3, C0–C2, WE5/WE6 and save audits, targeted TypeScript, build, and `git diff --check`. Record inherited failures separately.
- [x] Compare the unchanged C0 fixed-input and WE6 live reference cash with the C2 baseline; record state-size impact. Write `docs/superpowers/reports/2026-09-23-streaming-commercial-c3.md` with C4 handoff and no claim that C3 settles revenue.
