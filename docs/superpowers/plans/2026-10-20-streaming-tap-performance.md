# Streaming Tap Performance Implementation Plan

> Execute sequentially with test-first regression checks and measured comparisons.

**Goal:** Remove the reproduced streaming interaction stalls while retaining rights validation, auction reservations, draft recovery and durable saves.

**Architecture:** Resolve auction access from its canonical source, reuse a per-discovery compatibility context, and avoid redundant canonical UI mutations. Keep core screens eagerly imported and preserve the existing save-generation pipeline.

**Tech Stack:** React, TypeScript, Vite, Node/esbuild audit scripts, current local browser.

**Spec:** User-authorized checkpoint and streaming lag repair; preceding same-save investigation and `/tmp/anshu-streaming-comparison.tsx` baseline.

## Constraints

- Checkpoint `9905a9a` / `checkpoint-lazy-load-fix` is pushed before editing.
- Never pause autosave or remove submission/settlement rights checks.
- Do not change pricing, country filing costs, AI offers or game-week rules.
- Benchmarks use disposable fixtures; real-save UI testing uses ordinary controls.
- Report Node CPU timings separately from browser command round trips.

## Tasks

- [x] Commit all existing work and push the named rollback checkpoint.
- [x] Record the original benchmark and a fixture with all 197 countries actually filed.
- [x] Add failing workload-scope tests: one-lot capability must not scan world titles; title filtering must not normalize the same country per candidate. Add current-grant/configuration correctness cases.
- [x] Resolve auction grants directly from the canonical licence/contract; fresh studio listings have no inherited access grant. Keep authoritative bid/settlement validation.
- [x] Prepare country/week context once per licence-opportunity batch; preserve ordering, territory defaults and compatibility results.
- [x] Make already-visited HQ navigation a no-op and use the existing trusted path for canonical streaming-service/draft results, preserving external/import migration.
- [x] Extend the fixture to include a licensed title: reuse current title readiness, grants, offer and market context across its country/plan route matrix. Batch collection backend quotes and omit unused collection reads.
- [x] Run existing auction, collection, backend, filing, save-integrity/migration and TypeScript checks, then production build.
- [x] Re-run equivalent benchmarks and actual Anshu-save navigation/auction interactions. Record limits and leave local ready for testing.

## Result

See [verification report](../reports/2026-10-20-streaming-tap-performance.md). The reported multi-second stalls were not reproduced after the fixes. Production lab wizard transitions still include 150–327 ms work and idle auction updates still include roughly 100 ms long tasks; this is not a claim of universally instant input or device-level verification. One pre-existing Lifestyle source-string audit fails identically against the checkpoint and final source.

## Regression commands

Use `node_modules/.bin/esbuild scripts/audit-streaming-tap-performance.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/audit-streaming-tap-performance.cjs` followed by `node /tmp/audit-streaming-tap-performance.cjs` for deterministic workload and correctness assertions.

Use the unchanged `/tmp/anshu-streaming-comparison.tsx` and its before/after bundles for the original 2/197-market comparison. The committed benchmark additionally files all selected countries using the real service with test-only funding/energy and records actual filed counts.
