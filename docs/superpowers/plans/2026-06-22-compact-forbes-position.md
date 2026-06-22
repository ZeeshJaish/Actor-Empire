# Compact Forbes Position Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall Forbes company-position panel with an adaptive compact summary that preserves all ownership states and Stocks navigation.

**Architecture:** Change only `ForbesCompanyPosition.tsx`. Preserve the existing `CompanyPosition` input and callback contract. Strengthen the Forbes UI source audit to require the compact empty-state copy and reject the removed nested callout patterns.

**Tech Stack:** React, TypeScript, Tailwind utility classes, lucide-react, Node source audits, Vite.

---

### Task 1: Compact Adaptive Position Card

**Files:**
- Modify: `scripts/audit-forbes-studio-ui.mjs`
- Modify: `views/mobile/components/ForbesCompanyPosition.tsx`

- [ ] **Step 1: Add failing compact-layout audit rules**

Require the source to contain:

```text
No shares or negotiated equity held
Strategic Target
Position Value
Open Stocks
```

Reject the old long empty-state sentence and the old full-width `min-h-11` Stocks button.

- [ ] **Step 2: Run the Forbes UI audit and verify RED**

Run `npm run audit:forbes-studio-ui`.

Expected: failure because the compact copy and structure are absent.

- [ ] **Step 3: Implement the slim header and metrics row**

Keep the position badge. Render ownership, value, and strategic target in one horizontal row with ownership as the strongest number. Reduce card padding and header height.

- [ ] **Step 4: Implement the single progress row**

Keep one thin progress bar beneath the primary metrics. Remove the explanatory paragraph; the target metric and badge carry the meaning.

- [ ] **Step 5: Implement adaptive footer content**

For no stake, render one short footer line and a compact right-aligned Stocks action. For financial or strategic stakes, render Shares, Private Stake, and Dividend as micro stats. For controlling ownership, render one short control statement without a nested callout box.

- [ ] **Step 6: Run source audit and TypeScript verification**

Run:

```bash
npm run audit:forbes-studio-ui
npm run lint
```

Expected: both pass.

### Task 2: Regression and Browser QA

**Files:**
- Verify all touched files

- [ ] **Step 1: Run Forbes and position regressions**

```bash
npm run audit:company-position
npm run audit:forbes-studio-profile
npm run audit:forbes-studio-ui
npm run lint
npm run build
git diff --check
```

- [ ] **Step 2: Browser-test the empty public-company state**

Open a public company with no shares. Confirm the card is materially shorter, shows 0%, $0, the correct strategic target, one empty-state line, and the compact Open Stocks action.

- [ ] **Step 3: Browser-test controlling ownership**

Open the player studio and confirm 100%, Controlling Owner, position value, and the short control footer without the removed callout box.

- [ ] **Step 4: Verify Stocks navigation and console health**

Use Open Stocks, confirm the existing Stocks app opens, and verify no fresh application errors or warnings.

- [ ] **Step 5: Capture phone-frame evidence**

Save empty-state and controlling-state screenshots outside the repository.
