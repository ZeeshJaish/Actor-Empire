# Main working version — 15 October 2026

## Canonical project

The existing checkout `/Users/zeesh/Vibe code/Actor empire` is the working project. Its finalized selective rollback, retained latest streaming/Content Market/pricing V3 and required save compatibility are the source for `main` in `ZeeshJaish/Actor-Empire`.

The earlier rollback scope and tests are recorded in `2026-10-15-selective-rollback.md`. During final publication review, the talent-negotiation service was also restored to `d35f131`: its UI had been restored earlier, but its acceptance/rejection implementation was still a leftover. All 31 specifically restored movie/small-bug source/audit files now match that reference exactly.

## Recovery backup

The full pre-rollback buggy-streaming checkout remains at `/Users/zeesh/Vibe code/actor empire bugy streaming`. Its `BACKUP-VERIFICATION.json` manifest was rechecked before publication: all 57,753 recorded files/symlinks matched, zero mismatches. This includes ignored/uncommitted data and Git history; it is more complete than a source-only Git branch. The backup was not modified by the rollback.

The main update uses normal history-preserving fast-forward operations. The earlier GitHub commits remain reachable in history; the existing `codex/rights-market-phase1` remote was not overwritten with a forced push.

## Shop investigation

The paid catalogue was not removed. The visibility condition is identical in the buggy-streaming backup and the rollback:

```ts
PREMIUM_STORE_ENABLED && (isIOSDevice || isAndroidDevice || import.meta.env.DEV)
```

The desktop production preview at `http://127.0.0.1:4186/` has `DEV=false` and is not a native platform, so it shows the rewarded-ad section. This is an existing platform gate, not a rollback regression.

Daily development preview is `http://127.0.0.1:5186/`, served from the canonical checkout. In an isolated browser career, Rewards and Premium tabs, Restore Purchases, the premium catalogue and its energy/cash/collection items were verified. No purchase or restore transaction was triggered. Screenshot: `output/playwright/2026-10-15-premium-store-dev.png`.

Development purchase callbacks simulate purchases. Real billing must be tested in the Android/iOS store build. No billing security or platform gating was relaxed.

The two preview URLs have separate browser-origin storage. The investigation used synthetic `Shop QA` data in an isolated browser profile; it did not move or overwrite a personal career.

## Publication checks

- Production web build: pass (existing large-bundle warnings).
- Full TypeScript check: pass.
- iOS StoreKit listener source audit: pass.
- Android purchase-verification source audit: pass.
- Content Market CM1–CM4: pass.
- Save integrity and fresh-save weekly progression/persistence: pass.
- Talent instability and industry talent bookings: pass.
- Named rollback baseline hash comparisons and staged whitespace check: pass.

The pre-existing shared-streaming release-archive assertion (one retained platform record versus three expected) remains documented in the rollback report. It was not changed as part of publishing the selected version. No production deployment, signed release, real payment or physical-device billing test was performed.
