# Streaming audit repairs — 22 October 2026

User approved correcting the three pre-existing audit failures while preserving Claude's UI and the runtime save/payment logic. This change edits audit helpers, audit expectations and this report only.

## Repairs

1. **Audience phase2:** the canonical shares `[44, 2.8, 9.1, 12.2, 16.8, 15.1]` sum to `99.99999999999999` in JavaScript. Retained the six-group requirement and added a finite, non-negative, in-range percentage assertion with `1e-9` addition tolerance. Actual missing or double-counted percentage points still fail.
2. **Promotion phase14:** the legacy fixture records four channels summing to 100, while normalization retains two optional fields as `undefined`. `Object.values(...).reduce(...)` incorrectly produced `NaN`. The audit now checks all four required channels plus the two optional channels (zero only when absent). Invalid recorded numbers are not filtered out. The campaign, attributed joins/viewing, exactly-once processing and charge assertions remain. The stale Growth War Room copy check now verifies the current Audience campaign callback and canonical room mount.
3. **ZIP fidelity:** reviewed the four stale stylesheet references (Buildout, Cinematics, CommandDesk and Shell). All four current files are byte-identical to both the user-approved `612efbb` checkpoint and Claude's supplied copy. Updated their explicit pinned hashes without changing any stylesheet. Replaced assertions against retired prototype markup and old HQ component names with contracts for the actual opening-market page, SVG flags, country dossier, canonical entry adapter, native Platform Offer, Studio Finance transactions and all-country Audience atlas. All 17 visual contracts and the existing save/navigation safeguards remain active.

`style-review.json` records old/new fingerprints and the independently verified baseline matches. Some old hashes were not found among the available versions searched; this repair pins the known approved checkpoint, not an unexplained current-file recapture.

## Verification

- All three original audits reproduced as failing before the repair and passed after it.
- 14 audit commands passed: the three original audits, six percentage-contract cases, seven in-memory fidelity mutation cases, the 12-file approved Claude style guard, save generations, rights transactions, localization, launch draft continuity, HQ, Content consolidation, WE5 UI and infrastructure.
- The focused save/payment safety audit passed 7/7, including 5,000-title rights/localization retention.
- Production build passed; only existing bundle-size and Browserslist warnings remain.
- Runtime/UI fingerprint comparison found zero file changes across the snapshotted components, services, hooks, styles, views, App and types. No user career was loaded or mutated for these tests.
- Full-project `npm run lint` passed (exit 0). Final results are recorded in `verification.json` and adjacent logs.

The negative tests deliberately reject incorrect totals, missing required channels, invalid optional numbers, stylesheet drift, removed native room mounts, missing canonical Offer/capital actions, selection-changing region navigation, emoji flag replacements and a disconnected all-country atlas. No audit was skipped or disabled.

Commands for the new test-only checks:

```sh
./node_modules/.bin/esbuild scripts/audit-streaming-percentage-contracts.ts --bundle --platform=node --format=cjs --outfile=/tmp/streaming-percentage-contracts.cjs
node /tmp/streaming-percentage-contracts.cjs
node scripts/audit-streaming-fidelity-contracts.mjs
node scripts/audit-streaming-operations-styles.mjs
```
