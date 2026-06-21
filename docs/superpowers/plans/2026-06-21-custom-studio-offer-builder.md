# Custom Studio Offer Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed studio-acquisition offer cards with a compact builder for exact full-acquisition or minority-stake terms.

**Architecture:** Extend `services/studioAcquisition.ts` with pure custom-offer normalization, analysis, and validation. Keep preset calculations as quick-fill helpers. Refactor only the Offer Setup section of `StudioAcquisitionDesk.tsx`; existing funding, compliance, review, and submission stages consume the custom draft amount.

**Tech Stack:** TypeScript, React, Tailwind utility classes, motion/react, lucide-react, esbuild audit scripts, Vite.

---

### Task 1: Custom Offer Analysis and Validation

**Files:**
- Modify: `services/studioAcquisition.ts`
- Modify: `scripts/audit-studio-acquisition.ts`

- [ ] **Step 1: Add failing custom-offer audit cases**

Import `analyzeCustomOffer` and verify:

```ts
const full = analyzeCustomOffer({
  profile,
  acquisitionCase: undefined,
  offerType: 'FAIR',
  offerAmount: 92_500_000,
});
assert(full.normalizedAmount === 92_500_000);
assert(full.valueDeltaPercent === -7.5);
assert(full.valid);

const minority = analyzeCustomOffer({
  profile,
  acquisitionCase: undefined,
  offerType: 'MINORITY',
  offerAmount: 27_500_000,
  minorityPercent: 25,
  existingOwnershipPercent: 3,
});
assert(minority.impliedCompanyValue === 110_000_000);
assert(minority.combinedOwnershipPercent === 28);
assert(minority.reachesStrategicThreshold);
```

Also verify Dismissive, Testing, Serious, Compelling, and Overpaying posture bands plus 50–200% validation.

- [ ] **Step 2: Run audit and verify RED**

Run `npm run audit:studio-acquisition`.

Expected: TypeScript bundling failure because `analyzeCustomOffer` does not exist.

- [ ] **Step 3: Implement custom-offer analysis**

Add:

```ts
export type SellerResponsePosture =
  | 'DISMISSIVE'
  | 'TESTING'
  | 'SERIOUS'
  | 'COMPELLING'
  | 'OVERPAYING';

export interface CustomOfferAnalysis {
  normalizedAmount: number;
  referenceValue: number;
  comparisonValue: number;
  valueDeltaPercent: number;
  impliedCompanyValue?: number;
  combinedOwnershipPercent?: number;
  reachesStrategicThreshold?: boolean;
  posture: SellerResponsePosture;
  valid: boolean;
  validationReason?: string;
}
```

For full acquisitions, compare the amount directly to the reference value. For minority offers, compare the implied company value (`amount / percent`) to the reference value. Normalize amounts to whole dollars, enforce 5–49% minority stakes, and enforce a 50–200% credible range.

- [ ] **Step 4: Accept and persist exact custom amounts**

Add `offerAmount?: number` to `submitOpeningOffer`. When supplied, analyze and validate it; otherwise retain preset behavior for compatibility. Use the normalized custom amount for funding validation, persistence, and logs. Return `INVALID_OFFER_TERMS` for invalid custom terms.

- [ ] **Step 5: Run service audit and verify GREEN**

Run `npm run audit:studio-acquisition`.

Expected: `Studio acquisition audit passed.`

### Task 2: Compact Custom Offer Builder UI

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] **Step 1: Update the UI audit and verify RED**

Require:

```text
Full Acquisition
Minority Stake
Exact Offer
Quick Fill
Seller Posture
Implied Company Value
Combined Ownership
Conservative
Fair
Aggressive
offerAmount
analyzeCustomOffer
```

Fail if the old `OFFER_COPY` card iteration remains.

- [ ] **Step 2: Run UI audit and verify RED**

Run `npm run audit:studio-acquisition-ui`.

Expected: failure because the builder controls are missing.

- [ ] **Step 3: Add persistent offer draft state**

Initialize:

```ts
const [offerType, setOfferType] = useState<AcquisitionOfferType>(
  publicCompany ? 'MINORITY' : 'FAIR'
);
const [minorityPercent, setMinorityPercent] = useState(strategicThreshold);
const [offerAmountInput, setOfferAmountInput] = useState(
  String(initialPreset.amount)
);
```

Derive `offerAmount`, `customOfferAnalysis`, quick-fill presets, and funding amount during render. Do not reset the draft when moving to Funding or Review.

- [ ] **Step 4: Replace preset cards with structure controls**

Render compact Full Acquisition and Minority Stake selectors. Hide or disable Full Acquisition for publicly traded targets. Selecting a structure refreshes the amount using its Fair quick fill only when changing structures, not during ordinary input edits.

- [ ] **Step 5: Add exact amount controls**

Render an accessible numeric input labelled `Exact Offer Amount`, plus decrement and increment buttons. Use a step equal to 1% of reference value for full acquisitions and 1% of the fair minority block value for minority offers.

- [ ] **Step 6: Add compact quick fills and deal intelligence**

Render Conservative, Fair, and Aggressive chips. Show reference source, value delta, seller posture, and validation. Minority mode additionally shows the editable 5–49% stake, implied company value, combined ownership, and strategic-threshold progress.

- [ ] **Step 7: Wire funding and submission to the custom amount**

Use the analyzed normalized amount for funding options, funding copy, review copy, and `onSubmitOffer({ offerAmount })`. Disable **Choose Funding** when analysis is invalid or no funding source can afford the amount.

- [ ] **Step 8: Run UI audit and TypeScript verification**

Run:

```bash
npm run audit:studio-acquisition-ui
npm run lint
```

Expected: both pass.

### Task 3: Full Verification and Browser QA

**Files:**
- Verify all touched files

- [ ] **Step 1: Run focused and regression audits**

```bash
npm run audit:studio-acquisition
npm run audit:studio-acquisition-ui
npm run audit:company-position
npm run audit:forbes-studio-profile
npm run audit:forbes-studio-ui
```

- [ ] **Step 2: Run production checks**

```bash
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Browser-test a full custom offer**

Open an eligible studio, select Full Acquisition, type a non-preset amount, verify live seller posture and value delta, continue through funding, submit, and confirm the exact amount persists without deducting purchase funds.

- [ ] **Step 4: Browser-test a custom minority offer**

Open another eligible or public studio, select Minority Stake, enter a custom percentage and amount, verify implied value and combined ownership, and confirm funding uses the custom amount.

- [ ] **Step 5: Browser-test validation and responsive density**

Enter a below-minimum amount and confirm the exact validation message blocks funding without resetting inputs. Confirm the first offer viewport contains structure, amount, intelligence, and the sticky funding action without the old vertical card stack.

- [ ] **Step 6: Check console and capture evidence**

Confirm no fresh app errors or warnings and save screenshots of full and minority custom offer states outside the repository.
