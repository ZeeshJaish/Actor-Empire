# Streaming Rights Phase A8 Completion Report

**Date:** 2026-09-02  
**Scope:** Project A final presentation, workload, persistence, accessibility, and endurance hardening

## Player-facing result

- The Production House Rights Office now behaves as one compact business-affairs desk rather than a collection of unrelated screens.
- Portfolio, Mandate, Relationships, Statements, and Packages are real accessible tabs with Arrow Left/Right, Home, and End keyboard navigation.
- Action-required and live-offer files disclose their contract facts immediately. Routine watching and completed files stay compact until the player opens them; their approved actions remain visible.
- Focus treatment, reduced-motion behavior, mobile density, and horizontal overflow were hardened without replacing the established cinematic visual language.
- The existing developer menu includes **Rights Market A8 QA**, which creates a deterministic 40-title Empire Studios slate and opens the Production House for repeatable testing.

## System and persistence result

- The QA fixture uses the canonical Project A registries. Production simulation code does not import or depend on it.
- Full Control, Strategy, and Custom create the same offer and signed-contract universe. Delegation changes decision handling only; it provides no hidden economic bonus or penalty.
- Protected decisions remain pending in every mode. Same-week replay is idempotent.
- Legacy-without-rights, A1, A2 schema-v2, malformed, compacted, and repeated-reload fixtures normalize safely.
- The 40-title workload retains all titles while limiting the immediate action rail to seven.
- A deterministic rights-only 400-year run passed twice with bounded contracts, renewal cases, calendar digests, office digests, and compacted save size.

## Defects found and fixed during the exit audit

1. An AI rights resale could leave a sold plan's release-readiness passport attached. Sold plans now clear that future scheduling state.
2. A canonical contract lookup normalized the entire global rights registry. Direct canonical lookup now touches only the requested contract while retaining the malformed legacy-key fallback.
3. Distress progression serialized the entire world to detect changes. It now uses canonical reference changes and preserves exact replay behavior.
4. One-time obligation order depended on insertion order and could change after reload. Held obligations now use deterministic oldest-first settlement priority; settled history is deterministic as well.
5. Internally produced platform and contract-registry state was repeatedly revalidated. In-memory canonical markers now survive normal weekly progression and production compaction, while JSON/save boundaries still perform full validation and repair.
6. Partial language capability was being collapsed into an all-or-nothing localization promise. Supported subtitle/dub assets now remain attached to their valid countries while unsupported countries stay intentionally unlocalized.
7. Localization quote tiers could change after later research upgrades and payment evidence could be lost during normalization. Quotes are now immutable commitments and ledger-backed payments reconcile exactly once.
8. Terminal rights-market plans could lose their original scope, and failed scheduling could leave impossible country scope behind. Terminal history now preserves the attempted lot while live plans retain only deliverable countries.
9. Package-localization identities could collide across projects, and retry paths could enqueue duplicate work. Project identity is part of the key and the exact-key set blocks duplicate jobs.
10. Runtime recapitalization history could exceed the same bound used at save time, causing midpoint reload drift. Runtime append now normalizes, deduplicates, sorts, and caps that history identically.
11. Compaction and contract-expiry mutations rebuilt the canonical rights registry without restoring its in-memory marker. Both boundaries now return a marked canonical registry, removing repeated whole-registry validation in mature saves.
12. Netflix's clear-flop threshold sat below almost its entire measured lower tail. Its disclosed expectation band is now 84.5–89, producing a meaningful solid band and a 12.15% clear-flop rate in the final matrix.

## Verification evidence

Passed focused commands:

- `npm run audit:streaming-rights-finalization-phase8`
- `npm run audit:streaming-contract-foundation-phase1`
- `npm run audit:streaming-active-bidding-phase2`
- `npm run audit:streaming-contract-economics-phase2`
- `npm run audit:streaming-rights-compatibility-phase3`
- `npm run audit:streaming-rights-calendar-phase4`
- `npm run audit:streaming-catalogue-packages-phase5`
- `npm run audit:streaming-rights-transactions-phase6`
- `npm run audit:streaming-rights-office-phase7`
- `npm run audit:platform-ai-rights-lifecycle`
- `npm run audit:platform-ai-sourcing`
- `npm run audit:platform-ai-research`
- `npm run audit:platform-ai-economy`
- `npm run audit:platform-ai-distress`
- `npm run audit:platform-ai-localization`
- `npm run audit:platform-ai-release`
- `npm run audit:platform-ai-turn`
- `npm run audit:platform-ai-phase8`
- `npm run audit:platform-ai-scalability`
- `npm run audit:platform-ai-long-run`
- `npm run audit:save-migration`
- `npm run audit:subsidiary-streaming`
- `npm run build`

The production build completed with only the existing bundle-size warnings.

Canonical Platform AI long-run result:

- 12 deterministic worlds: 8 baseline, 2 lean, and 2 adverse.
- 2,600 weeks per world; 31,200 simulated weeks and 156,000 platform turns in total.
- 8,362 releases: 36.87% hits, 43.71% solid results, and 19.42% clear flops.
- Netflix finished at 43.90% hits and 12.15% clear flops; every platform remained inside its approved outcome band.
- 16 distress episodes and 14 rescue episodes; rescue was not automatic or universal.
- 53,000 integrated News events were observed with zero duplicate IDs and zero date violations; persisted News history remained capped at 50.
- Maximum compacted save size was 29,781,334 bytes.
- Wall-clock time was 840.22 seconds at bounded concurrency 2; summed fixture runtime was 1,628.09 seconds.
- Every balance, persistence, acquisition-stop, finite-value, ownership, release, and history-bound assertion passed.

## Browser verification

- A real saved game opened Production House → Rights Office successfully.
- The five desk tabs exposed correct tablist/tab/tabpanel semantics.
- Arrow Right moved both selection and focus from Portfolio to Mandate.
- At 390×844, the page itself had no horizontal overflow; only the intentional internal tab rail scrolled.
- No runtime errors were logged. Existing Tailwind CDN and AdSense development warnings remain unrelated.

## Known repository limitation

Repository-wide TypeScript still exits non-zero on older owned-platform fixtures that omit fields such as `publicManifesto` and `networkPlacements`, retain obsolete acquisition enum values, or use old rack-group timestamps. No A8-owned diagnostic remains.

## Deferred work

- Project B does not start automatically. It remains approval-gated after the user reviews this report.
- Future-output agreements remain deferred as previously decided; commissioned originals continue through the existing direct commission workflow.
- The temporary A8 QA seed remains developer-only and is not called by production simulation.
