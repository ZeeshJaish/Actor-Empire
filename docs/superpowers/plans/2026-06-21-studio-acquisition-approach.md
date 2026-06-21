# Studio Acquisition Approach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase 6 Slice 1: a direct Forbes acquisition approach flow with optional due diligence, funding/compliance previews, opening-offer persistence, and real company-stake visibility.

**Architecture:** Keep Forbes as the entry surface. Put deterministic acquisition logic in `services/studioAcquisition.ts`, company-position math in `services/companyPosition.ts`, and render the game-style flow in focused components beneath `views/mobile/components`. Persist migration-safe acquisition cases and negotiated stakes behind typed service accessors in player flags.

**Tech Stack:** React, TypeScript, Tailwind utility classes, motion/react, lucide-react, esbuild audit scripts, Vite.

---

### Task 1: Company Position and Strategic Thresholds

**Files:**
- Modify: `types.ts`
- Modify: `services/stockLogic.ts`
- Create: `services/companyPosition.ts`
- Create: `scripts/audit-company-position.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing company-position audit**

Create an audit that imports `getCompanyPosition` and verifies:

```ts
assert.equal(getCompanyPosition(publicProfile, playerWithShares).strategicThreshold, 20);
assert.equal(getCompanyPosition(privateProfile, playerWithBlock).strategicThreshold, 25);
assert.equal(getCompanyPosition(founderProfile, playerWithBlock).strategicThreshold, 30);
assert.equal(getCompanyPosition(publicProfile, playerWithShares).ownershipPercent, expectedPercent);
assert.equal(getCompanyPosition(publicProfile, playerWithStrategicStake).influenceStatus, 'STRATEGIC_STAKE');
assert.equal(getCompanyPosition(playerProfile, player).influenceStatus, 'CONTROLLING_OWNER');
```

- [ ] **Step 2: Run the audit and verify RED**

Run:

```bash
npx esbuild scripts/audit-company-position.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-company-position.mjs
node /tmp/audit-company-position.mjs
```

Expected: failure because `services/companyPosition.ts` does not exist.

- [ ] **Step 3: Add stable outstanding-share data**

Add `outstandingShares?: number` to `Stock`. Assign stable outstanding-share counts to company-linked stock definitions in `services/stockLogic.ts`. Legacy stocks without the field use a deterministic fallback derived from company valuation and current price.

- [ ] **Step 4: Implement company-position math**

Create:

```ts
export interface CompanyPosition {
  shares: number;
  stockValue: number;
  stockPercent: number;
  negotiatedPercent: number;
  ownershipPercent: number;
  strategicThreshold: 20 | 25 | 30;
  influenceStatus: 'NO_STAKE' | 'FINANCIAL_STAKE' | 'STRATEGIC_STAKE' | 'CONTROLLING_OWNER';
  estimatedAnnualDividend: number;
  linkedStockId?: string;
}

export const getCompanyPosition = (
  player: Player,
  profile: ForbesStudioProfile,
): CompanyPosition => { /* combined public shares and negotiated blocks */ };
```

Threshold selection uses acquisition and ownership structure: public companies 20, founder-controlled companies 30, other private companies 25.

- [ ] **Step 5: Run audit and verify GREEN**

Run `npm run audit:company-position`.

Expected: `Company position audit passed.`

### Task 2: Acquisition Case, Diligence, Funding, and Offers

**Files:**
- Create: `services/studioAcquisition.ts`
- Create: `scripts/audit-studio-acquisition.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing acquisition-service audit**

Cover:

```ts
assert.equal(getAcquisitionEligibility(openProfile).canApproach, true);
assert.equal(getAcquisitionEligibility(notForSaleProfile).canApproach, false);
assert.equal(calculateDueDiligenceFee({ valuation: 100_000_000 }), 250_000);
assert.equal(calculateDueDiligenceFee({ valuation: 100_000_000_000 }), 25_000_000);
assert.equal(runDueDiligence(input).player.money, player.money - fee);
assert.deepEqual(runDueDiligence(input).report, runDueDiligence(input).report);
assert.equal(runDueDiligence(alreadyPurchased).reason, 'ALREADY_PURCHASED');
assert.equal(submitOpeningOffer(directOffer).success, true);
assert.equal(submitOpeningOffer(directOffer).player.money, player.money);
assert.equal(submitOpeningOffer(duplicateOffer).reason, 'OFFER_ALREADY_SUBMITTED');
```

Also verify personal/studio funding validation, minority-only public companies, compliance bands, and player-owned blocking.

- [ ] **Step 2: Run the audit and verify RED**

Run:

```bash
npx esbuild scripts/audit-studio-acquisition.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-studio-acquisition.mjs
node /tmp/audit-studio-acquisition.mjs
```

Expected: failure because `services/studioAcquisition.ts` does not exist.

- [ ] **Step 3: Implement typed acquisition accessors**

Create types for:

```ts
type AcquisitionCaseStatus = 'DRAFT' | 'OFFER_SUBMITTED' | 'CLOSED' | 'ACQUIRED';
type AcquisitionOfferType = 'CONSERVATIVE' | 'FAIR' | 'AGGRESSIVE' | 'MINORITY';
type AcquisitionFundingSource = 'PERSONAL' | 'STUDIO';
```

Expose `getAcquisitionCases(player)`, `getAcquisitionCase(player, studioId)`, and immutable case persistence helpers over `player.flags.studioAcquisitionCases`.

- [ ] **Step 4: Implement eligibility and offer presets**

`getAcquisitionEligibility(profile, existingCase)` blocks player-owned, not-for-sale, and duplicate submitted offers. Public companies expose only minority investment. Offer presets use the diligence-adjusted value when available, otherwise public valuation:

```ts
CONSERVATIVE = referenceValue * 0.88
FAIR = referenceValue
AGGRESSIVE = referenceValue * 1.15
MINORITY = referenceValue * (minorityPercent / 100) * 1.05
```

- [ ] **Step 5: Implement deterministic due diligence**

Use a stable studio/player hash to create verified debt, hidden liabilities, obligations, adjusted enterprise value, expected income, confidence, recommended range, and primary risk. Charge immediately from the chosen funding source, persist the report, and block duplicate charging.

- [ ] **Step 6: Implement funding and compliance previews**

Expose personal and every player production-studio funding option with balance, affordability, remaining balance, risk score, and risk band. Personal risk is zero. Studio risk considers deal size, studio valuation, profitability, available balance, target fit, prior cases, and expense type.

- [ ] **Step 7: Implement opening-offer submission**

Validate eligibility, offer structure, minority percentage, selected source, and current affordability. Persist `OFFER_SUBMITTED`, funding intent, compliance preview, and offer amount without deducting the acquisition price.

- [ ] **Step 8: Run acquisition audit and verify GREEN**

Run `npm run audit:studio-acquisition`.

Expected: `Studio acquisition audit passed.`

### Task 3: Game-Style Acquisition Desk

**Files:**
- Create: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Create: `scripts/audit-studio-acquisition-ui.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing UI source audit**

Verify the component contains:

```text
Acquisition Desk
Make Offer Now
Run Due Diligence
Unknown Liabilities
Conservative
Fair
Aggressive
Minority Investment
Personal Wealth
Studio Capital
Compliance Risk
Submit Opening Offer
```

Also verify callbacks for diligence and offer submission, disabled unaffordable sources, and completed offer feedback.

- [ ] **Step 2: Run the audit and verify RED**

Run `node scripts/audit-studio-acquisition-ui.mjs`.

Expected: failure because `StudioAcquisitionDesk.tsx` does not exist.

- [ ] **Step 3: Implement the overlay shell and stage rail**

Build a phone-safe full overlay with compact masthead, stage rail, close/back controls, and restrained motion. Use:

- gold for primary deal actions;
- red for liabilities and high scrutiny;
- blue for personal wealth;
- violet for studio capital;
- emerald for completed diligence and submitted offers.

- [ ] **Step 4: Implement direct-offer and optional-diligence paths**

The opening state presents two actions. Direct offers move immediately to offer setup with an Unknown Liabilities warning. Diligence opens the funding selector for the fee and reveals the saved report after purchase.

- [ ] **Step 5: Implement offer, funding, and review stages**

Offer cards display price, premium/discount, acceptance posture, and minority percentage. Funding choices display current balance, remaining balance, affordability, tax treatment, and compliance risk. Review summarizes all consequences before calling `onSubmitOffer`.

- [ ] **Step 6: Run UI audit and verify GREEN**

Run `npm run audit:studio-acquisition-ui`.

Expected: `Studio acquisition UI audit passed.`

### Task 4: Forbes “Your Position” Panel and Wiring

**Files:**
- Create: `views/mobile/components/ForbesCompanyPosition.tsx`
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `views/MobilePage.tsx`
- Modify: `scripts/audit-forbes-studio-ui.mjs`

- [ ] **Step 1: Extend the Forbes UI audit and verify RED**

Add assertions for:

```text
Your Position
No Current Stake
Financial Stake
Strategic Stake
Controlling Owner
Open Stocks
Approach Studio
```

Verify Forbes receives an `onOpenStocks` callback and both mobile shells switch from Forbes to the existing Stocks app.

- [ ] **Step 2: Implement the position panel**

Render shares, holding value, exact ownership percentage, negotiated stake, estimated annual dividend, influence label, and progress to the 20/25/30 threshold. Player-owned studios render `Controlling Owner`.

- [ ] **Step 3: Replace eligible discovery commands with acquisition approach**

Keep Monitor Studio for not-for-sale companies. For eligible acquisition states, render `Approach Studio`; clicking opens `StudioAcquisitionDesk`. Existing recorded discovery states continue to work as migration-safe history but do not block the acquisition case.

- [ ] **Step 4: Wire immutable player updates**

Forbes passes current case, position, production studios, diligence callback, and offer callback. Successful service results call the existing `onUpdatePlayer`.

- [ ] **Step 5: Wire Open Stocks**

Add `onOpenStocks` to `ForbesApp`. Both mobile shells set their existing `appMode` to `STOCKS`, with no new route or app.

- [ ] **Step 6: Run Forbes UI audit and verify GREEN**

Run `npm run audit:forbes-studio-ui`.

Expected: all Forbes UI checks pass.

### Task 5: Verification and Browser QA

**Files:**
- Verify all modified files

- [ ] **Step 1: Run focused audits**

```bash
npm run audit:company-position
npm run audit:studio-acquisition
npm run audit:studio-acquisition-ui
npm run audit:forbes-studio-profile
npm run audit:forbes-studio-ui
```

- [ ] **Step 2: Run static and production verification**

```bash
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Browser-test the direct-offer flow**

Open an eligible studio, enter Acquisition Desk, choose Make Offer Now, select an offer and funding source, verify no money is deducted, submit, and confirm the persisted completed state.

- [ ] **Step 4: Browser-test optional diligence**

Use a different eligible studio, run diligence, verify the chosen source is charged once, report values persist after closing/reopening, and duplicate purchase is unavailable.

- [ ] **Step 5: Browser-test company positions**

Verify no-stake, public-share, and player-owned profiles. Confirm Open Stocks routes into the existing Stocks app.

- [ ] **Step 6: Inspect browser console and responsive layout**

Confirm no new runtime errors and capture screenshots of the Acquisition Desk, diligence report, funding review, and Your Position panel.
