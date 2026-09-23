# Streaming Commercial C0 Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user requested inline execution; do not delegate.

**Goal:** Record a reproducible, source-grounded baseline for player and AI streaming offers, audience, and commercial revenue before changing balance.

**Architecture:** Existing WE5/WE6, commercial-economy, pricing, and billing audits remain the primary regression suites. A small C0 probe records the three proposed core-model shapes, fixed-input ad economics, and current AI offer generation without changing production code. A report separates passing invariants, measured values, and known gaps.

**Tech Stack:** TypeScript, esbuild, Node `assert`, npm audit scripts, Vite build.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-commercial-offers-design.md`

## Global Constraints

- C0 changes no player/AI prices, audience coefficients, saved state, rights, or settlement logic.
- Preserve the existing monthly/annual billing cohorts and historical ledgers.
- Use the same fixed probe inputs for every offer comparison; do not present a fixed-input calculation as a full-world forecast.
- Expected gaps are reported explicitly rather than making the baseline audit fail for already-known behavior.

---

### Task 1: Capture existing regression status

**Files:**
- Create: `docs/superpowers/reports/2026-09-23-streaming-commercial-c0-baseline.md`
- Read: `package.json`, existing audit scripts, world commercial services

**Interfaces:**
- Consumes: `npm run audit:streaming-commercial-economy`, `npm run audit:world-streaming-we6`, `npm run audit:streaming-pricing-world`, `npm run audit:streaming-billing-cohorts`, and `npm run build`.
- Produces: exact pass/fail status and failure text summarized in the C0 report.

- [x] Run the four focused audits and build without changing gameplay code.
- [x] Record each exit status, failures, and whether a failure predates C0; do not infer that a green audit proves model balance.

### Task 2: Add a deterministic commercial-offer probe

**Files:**
- Create: `scripts/audit-streaming-commercial-c0.ts`
- Create: `tsconfig.streaming-commercial-c0.json`
- Modify: `package.json`
- Test: `scripts/audit-streaming-commercial-c0.ts`

**Interfaces:**
- Consumes: `calculateWorldStreamingCommercialRevenue`, `createAiStreamingCommercialConfiguration`, `getWorldStreamingOffers`, `normalizeStreamingPricingConfiguration`, and `createPlatformAiFixture`.
- Produces: one bounded JSON baseline for subscription-led, advertising-led, rental-led, and hybrid fixed-input outcomes plus current AI model variety.

- [x] Add the `audit:streaming-commercial-c0` npm script using the repository's esbuild + Node convention.
- [x] In the probe, construct fixed pricing configurations with ad minutes 0, 4, 8, and 12, and CPM 10, 20, and 40. Assert finite/nonnegative money and zero ad revenue when ads are disabled or ad minutes are zero.
- [x] Record ad impressions, advertising revenue, commercial operating cost, and the AI core-model distribution. Pin the present behavior that higher CPM increases revenue at unchanged impressions; label it a balance gap, not an intended future invariant.
- [x] Verify the same probe produces identical JSON on two runs and does not mutate its inputs.

### Task 3: Publish the C0 decision report

**Files:**
- Modify: `docs/superpowers/reports/2026-09-23-streaming-commercial-c0-baseline.md`

**Interfaces:**
- Consumes: Task 1 outputs and Task 2 JSON.
- Produces: C1–C4 acceptance targets and a baseline from commit `f24dc36`.

- [x] Explain the observed ad-only live-account mismatch, synthetic `OPEN_ACCESS` account, subscription-first AI generator, CPM/fill loophole, and current frequency controls with source references.
- [x] State the intended gameplay trade-off as a design target, not as an already verified truth: ad-led = broader reach and lower revenue per viewer; subscription-led = narrower reach and higher revenue per payer; store-led = transaction volatility and no entry barrier.
- [x] Re-run the focused audits and build, check `git diff --check`, then commit and push only the C0 audit/plan/report changes.
