# Owned Right Development Choices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players authorize movie, series, fresh-adaptation, and reboot projects from owned rights through the existing Script and Concept pipeline.

**Architecture:** Extend `developOwnedRight` with a small choice object and keep `OwnedRight` as the only ownership record. A focused presentation component collects the choice, while `DevelopmentLab` applies the pure transition to `studioState.ownedRights` and `studioState.scripts`; no alternate project store or production lifecycle is introduced.

**Tech Stack:** React 19, TypeScript, Motion, Lucide, Vite, esbuild audit scripts.

---

### Task 1: Define And Test Development Choices

**Files:**
- Modify: `types.ts`
- Modify: `scripts/audit-rights-negotiation.ts`

- [ ] **Step 1: Add failing domain assertions**

Import `OwnedRightDevelopmentChoice` and call the existing transition with explicit choices:

```ts
const movieChoice: OwnedRightDevelopmentChoice = { format: 'MOVIE', strategy: 'FRESH_ADAPTATION' };
const seriesChoice: OwnedRightDevelopmentChoice = { format: 'SERIES', strategy: 'FRESH_ADAPTATION' };
const rebootChoice: OwnedRightDevelopmentChoice = { format: 'MOVIE', strategy: 'REBOOT' };

const movieDevelopment = developOwnedRight({ ownedRight, currentWeek: 20, choice: movieChoice });
assert(movieDevelopment.script?.projectType === 'MOVIE', 'Movie choice must use the existing movie pipeline.');

const seriesDevelopment = developOwnedRight({ ownedRight, currentWeek: 20, choice: seriesChoice });
assert(seriesDevelopment.script?.projectType === 'SERIES', 'Series choice must use the existing series pipeline.');

const rebootDevelopment = developOwnedRight({ ownedRight, currentWeek: 20, choice: rebootChoice });
assert(rebootDevelopment.script?.connectedProjectIntent === 'REBOOT', 'Reboot choice must use existing reboot intent.');
assert(rebootDevelopment.script?.tags?.includes('REBOOT'), 'Reboot choice must remain visible to existing downstream rules.');
```

- [ ] **Step 2: Run the audit and verify RED**

Run: `npm run audit:rights-negotiation`

Expected: TypeScript/esbuild failure because `OwnedRightDevelopmentChoice` and the `choice` input do not exist.

- [ ] **Step 3: Add the shared choice type**

Add to `types.ts` beside `OwnedRight`:

```ts
export type OwnedRightDevelopmentStrategy = 'FRESH_ADAPTATION' | 'REBOOT';

export interface OwnedRightDevelopmentChoice {
    format: Extract<ProjectType, 'MOVIE' | 'SERIES'>;
    strategy: OwnedRightDevelopmentStrategy;
}
```

- [ ] **Step 4: Keep the focused changes unstaged**

The workspace contains unrelated user changes in `types.ts`; do not stage or commit that file during implementation.

### Task 2: Extend The Existing Owned-Right Transition

**Files:**
- Modify: `services/rightsNegotiation.ts`
- Test: `scripts/audit-rights-negotiation.ts`

- [ ] **Step 1: Accept the choice in the existing transition**

Update the input and existing `Script` creation:

```ts
export const developOwnedRight = (input: {
    ownedRight: OwnedRight;
    currentWeek: number;
    choice?: OwnedRightDevelopmentChoice;
}) => {
    const choice = input.choice || { format: 'MOVIE', strategy: 'FRESH_ADAPTATION' };
    const isReboot = choice.strategy === 'REBOOT';
    const script: Script = {
        id: `rights_script_${input.ownedRight.id}_${projectNumber}`,
        title: projectNumber === 1
            ? `Untitled ${input.ownedRight.title} Project`
            : `Untitled ${input.ownedRight.title} Project ${projectNumber}`,
        genres: [input.ownedRight.primaryGenre],
        status: 'CONCEPT',
        quality: 38,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 6,
        isOriginal: false,
        projectType: choice.format,
        sourceMaterial: 'ADAPTATION',
        sourceMaterialType: 'SCREENPLAY',
        subjectName: input.ownedRight.title,
        logline: `A new screen project built from the acquired ${input.ownedRight.title} rights.`,
        connectedProjectIntent: isReboot ? 'REBOOT' : 'SOLO',
        tags: [
            'ACQUIRED_RIGHTS',
            input.ownedRight.archetype,
            `OWNED_RIGHT:${input.ownedRight.id}`,
            ...(isReboot ? ['REBOOT'] : []),
        ],
        createdAtWeek: input.currentWeek,
    };
};
```

The expiry and allowance checks remain before script creation, and `projectsUsed` increments once only after a script is created.

- [ ] **Step 2: Preserve old-save behavior**

Verify a call without `choice` still creates a Movie Fresh Adaptation, so existing callers and old saves remain compatible.

- [ ] **Step 3: Run the audit and verify GREEN**

Run: `npm run audit:rights-negotiation`

Expected: `Rights negotiation audit passed.`

- [ ] **Step 4: Review the focused domain diff**

Run: `git diff -- services/rightsNegotiation.ts scripts/audit-rights-negotiation.ts types.ts`

Expected: only the shared choice contract, its assertions, and the existing transition extension are part of this feature.

### Task 3: Build The Development Brief

**Files:**
- Create: `views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx`
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] **Step 1: Create a focused choice component**

The component accepts the existing ownership record and returns only the shared choice:

```ts
interface OwnedRightDevelopmentBriefProps {
    ownedRight: OwnedRight;
    currentWeek: number;
    onClose: () => void;
    onAuthorize: (choice: OwnedRightDevelopmentChoice) => void;
}
```

It renders:

- property identity and deal type;
- expiry/project allowance/creative restriction strip;
- Movie and Series selection cards;
- Fresh Adaptation and Reboot selection cards;
- visible locked Sequel and Spin-off cards with `Requires a released project`;
- `Begin Development` confirmation;
- reduced-motion-safe `Development Authorized` feedback.

- [ ] **Step 2: Replace the direct card action with brief state**

In `ScriptVault`, store the selected existing right:

```ts
const [developmentRight, setDevelopmentRight] = useState<OwnedRight | null>(null);
```

Change the existing button from calling `onDevelopRight(right.id)` to `setDevelopmentRight(right)`.

- [ ] **Step 3: Reuse the existing callback and store**

Change the callback contract to:

```ts
onDevelopRight: (rightId: string, choice: OwnedRightDevelopmentChoice) => boolean;
```

`DevelopmentLab` calls:

```ts
const development = developOwnedRight({
    ownedRight,
    currentWeek: player.currentWeek,
    choice,
});
```

On success it updates only `ownedRights` and `scripts` in the existing studio state and returns `true`.

- [ ] **Step 4: Return to the existing Script lane**

When authorization succeeds, close the brief, set `vaultLane` to `SCRIPTS`, and show `Development Authorized — concept added to Active Scripts.` This exposes the existing script card and writer/development actions immediately.

- [ ] **Step 5: Run TypeScript verification**

Run: `npm run lint`

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 6: Review the focused UI diff**

Run: `git diff -- views/lifestyle/business/DevelopmentLab.tsx views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx`

Expected: the new component is presentation-only and `DevelopmentLab` still updates the existing `ownedRights` and `scripts` arrays.

### Task 4: Verify Existing-Flow Consistency

**Files:**
- Verify: `services/rightsNegotiation.ts`
- Verify: `views/lifestyle/business/DevelopmentLab.tsx`
- Verify: `views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx`

- [ ] **Step 1: Run focused domain audits**

```bash
npm run audit:rights-negotiation
npm run audit:rights-market
npm run audit:rights-investigation
```

Expected: all audits pass.

- [ ] **Step 2: Run full static verification**

```bash
npm run lint
npm run build
```

Expected: TypeScript exits 0 and Vite reports a successful build.

- [ ] **Step 3: Browser-test the existing save**

Use the local app and existing save:

1. Development Lab -> Vault -> Rights.
2. Open `Develop Property` for an active right.
3. Verify Movie/Series and Fresh Adaptation/Reboot selections.
4. Verify Sequel/Spin-off remain visible and locked with reasons.
5. Authorize one development only if doing so will not damage user save data; otherwise verify the confirmation boundary without submitting.
6. Confirm no runtime errors, clipping, background scrolling, or duplicate project surface.

- [ ] **Step 4: Review the final diff**

Confirm the feature writes only to `studioState.ownedRights` and `studioState.scripts`, and that no alternate project collection, concept model, or greenlight route was introduced.
