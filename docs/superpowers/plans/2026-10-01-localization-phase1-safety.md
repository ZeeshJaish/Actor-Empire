# Localization Phase 1 Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execute inline and use evidence checkpoints; no separate user-owned chats are required.

**Goal:** Freeze the current English wording and deterministic generated output, and create read-only checks that reject unintended changes before localization batches proceed.

**Architecture:** Diagnostic files under `scripts/` collect English dictionaries, bank structure and pure reaction/producer outputs. A small comparison helper validates the immutable JSON baseline. No game runtime, locale or UI file changes in this phase.

**Tech Stack:** TypeScript, TypeScript AST, Node assert/crypto/fs, existing esbuild; no new packages.

**Spec:** `docs/superpowers/specs/2026-10-01-localization-quality-coverage-design.md`.

## Global Constraints

- Preserve English content, deterministic choices/IDs and gameplay state.
- Preserve all existing dirty changes; only create the files listed here.
- Read-only verification by default; baseline capture refuses overwrite.
- No production/UI/locale edits, save migrations, publish actions or broad git staging.
- Record pre-existing failures separately; a safety baseline does not fix localization.

## Task 1: Prove the baseline comparison guard

**Files:** create `scripts/helpers/localizationBaselineGuard.mjs` and `scripts/audit-localization-baseline-guard.mjs`.

**Interface:** `compareEnglishBaseline(baseline, current): string[]`. Snapshot fields: `schemaVersion`, `englishTranslations`, `reactionCases`, `bankShape`, `combinationEstimate`, `producers`. Each is plain JSON. Extra English keys are permitted; removing or changing a baseline key is rejected. Cases/producers/bank shape/estimate must match exactly.

- [x] Write actual assertions for unchanged input, additive English keys, altered/removed old English keys, changed/removed reaction cases, changed bank shape, changed producer ID/text and estimate drift.
- [x] Begin with `compareEnglishBaseline = () => []`; run `node scripts/audit-localization-baseline-guard.mjs` and observe the changed-English-key assertion fail.
- [x] Implement comparisons with key-level English/reaction diagnostics and exact JSON comparison for bank shape/producers/estimate/schema.
- [x] Run the same command and require all positive and rejection assertions to pass.

Example contract assertion:

```js
const changed = structuredClone(baseline);
changed.englishTranslations['common.back'] = 'Go back';
assert(compareEnglishBaseline(baseline, changed).some(message => message.includes('common.back')));
```

## Task 2: Capture immutable English output

**Files:** create `scripts/audit-localization-english-baseline.ts`; create `scripts/fixtures/localization-english-baseline.json` once; create a phase report directory.

- [x] Import actual `enTranslations`, `t`, `getPlayerLanguage`, reaction composer, release narrative/social/review producers. Use English/default language only for English identity checks.
- [x] Hash 10,000 classification/focus output cases, plus genre/world/career/no-role/story-fit/cast-summary/alternate-seed/variant cases. Store reproducible case IDs and SHA-256 output hashes.
- [x] Parse the 14 prose banks and author bank with the TypeScript AST; preserve key/index/text shape. Store the current combination estimate.
- [x] Capture opening/critic/X/Instagram/review output with real functions and frozen fixtures. Exclude X wall-clock timestamps only. Assert fixture equality before/after generation and repeated output identity.
- [x] Add `--capture`; refuse if the baseline file already exists. Default execution reads the existing baseline and fails for reported differences.
- [x] Bundle and run capture once:

```sh
node_modules/.bin/esbuild scripts/audit-localization-english-baseline.ts --bundle --platform=node --format=cjs --loader:.csv=text --outfile=/tmp/actor-localization-english-baseline.cjs
node /tmp/actor-localization-english-baseline.cjs --capture
node /tmp/actor-localization-english-baseline.cjs
```

- [x] Attempt capture again and require a refusal with nonzero exit. Do not edit or regenerate English fixtures to satisfy a failed check.

## Task 3: Record starting subsystem status

- [x] Run the baseline guard and the frozen English comparison.
- [x] Run `npm run audit:reaction-template-engine`, `npm run audit:release-media-narratives`, `npm run audit:streaming-global-localization` and `npm run audit:save-integrity` as independent checks. Save every result/exit code; failures are baseline findings, not scope to change gameplay here.
- [x] Check the production/UI/locale source manifest before and after Phase 1 and require unchanged bytes.
- [x] Write `docs/superpowers/reports/2026-10-01-localization-phase1-safety.md`, mark only completed boxes, and link the full nine-phase design for the user.
- [x] Open the roadmap in Codex. Hand off the Phase 1 result, explicitly stating that translations and later phases remain pending.

No commit step is included because the shared checkout contains unrelated uncommitted work and the user requested phased local work.
