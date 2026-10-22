# Stock acquisition flow evidence — 22 October 2026

This folder records isolated synthetic browser careers and production-service tests. Real user save slots were not accessed. Browser tests use new Chromium contexts, actual production components, the actual weekly engine, external-player migration, and the real verified IndexedDB storage wrappers. They do not mock stock, acquisition, migration or persistence services. Native-device behavior is a separate validation level.

## Final evidence

The frozen-source browser matrix passed all 14 scenarios, with zero JavaScript page exceptions. SHA256 source hashes before and after the run match exactly (`browser-matrix/matrix.json`). The separate duplicate-sign browser case also passed: two immediate final-signature click events charged no additional cash, spent exactly 25 energy, created one studio and one actual $500M debt entry, then survived verified reload and three next weeks (`browser-double-sign/results.json`). The full actual App smoke also passed through verified career reload and three following weeks, ending week12 with one owned studio, unchanged holdings and no repeated control reminders (`actual-app/results.json`). Both actual App recovery cases passed (`actual-app-recovery/results.json`): a signed schema4 incompatible current file offers safe previous recovery; viewing/canceling preserves current, integrity and previous raw SHA256 fingerprints; explicit restore loads the previous exact cash/shares/basis/week. When both signed generations have incompatible share registers, App shows an actionable error and all three raw fingerprints remain unchanged.

| Case | Result | Runtime errors |
|---|---|---|
| fresh-paramount-50 | PASSED | 0 |
| fresh-paramount-51 | PASSED | 0 |
| fresh-paramount-100 | PASSED | 0 |
| fresh-warner-51 | PASSED | 0 |
| fresh-universal-51 | PASSED | 0 |
| fresh-paramount-real-debt | PASSED | 0 |
| legacy-counter | PASSED | 0 |
| legacy-rejection | PASSED | 0 |
| legacy-accepted | PASSED | 0 |
| legacy-draft-100 | PASSED | 0 |
| low-energy | PASSED | 0 |
| stale-signing-debt-reload | PASSED | 0 |
| repaired-quote-disclosure | PASSED | 0 |
| sx-wallet | PASSED | 0 |

The matrix covers: Paramount fresh 50%, 51% and 100%; Warner and Universal fresh 51%; an actual $500M canonical company-debt fixture; majority holdings with old countered, rejected, accepted and DRAFT cases; zero-energy signing failure; changed live debt after entering signing followed by verified reload; visible 10.6SX saved-quote repair provenance with zero recorded basis; and safe rejection of a stock purchase from an unrepresentable SX wallet.

Successful acquisition cases compare exact holdings, historical basis and company allocations before/after signing and reload, prove no second share debit and one 25E signature charge, then run three actual subsequent game weeks. Debt-free companies require zero invented acquisition-debt entries. The real-debt fixture requires exactly one matching entry.

The full App smoke imports the real production `index.tsx`, including StrictMode and RootRecoveryBoundary. It selects a synthetic verified career through Start Career, buys shares in actual Mobile/Stocks, handles the ordinary queued shareholder vote, opens the stock-control popup, completes actual App diligence/closing/signature navigation, reloads through career selection, visits Forbes/Studios, and advances three actual App weeks. Recovery tests separately author signed schema4 incompatible CURRENT and PREVIOUS records in fresh browser contexts and verify raw-storage SHA256 fingerprints before explicit recovery.

## Reproduction and meaningful regression

`corporate-tender-basis-red.log` records the initial integration assertion failure: a company-funded tender paid the accepted amount but recorded the reference quote as stock cost basis. The same assertion passes after the production correction; `integration-final.log` records 19 integration checks from before the final unknown-cost-basis helper follow-up; the final browser matrix and actual App evidence above were run after the consolidated production freeze. The root final regression run supplies the latest service verification. The integration also verifies three studios, no second cash charge for a stock-earned control transfer, exactly one real debt entry when canonical debt exists, zero invented entries for debt-free companies, rights preserved through migration, duplicate completion rejected unchanged, actual next weeks, company-paid public tender funding attribution, and a real $500M debt fixture.

The browser harness commits the exact prepared player returned by persistence after a processed week, matching `App.tsx`; retaining the raw weekly result instead would incorrectly retain transient callback functions and is not representative of the actual App boundary.

## Browser resource limits

The reports preserve console messages separately from JavaScript page exceptions. Some deal-room profiles request remote avatars; this sandbox could not resolve those image hosts (`ERR_NAME_NOT_RESOLVED`). They did not cause JavaScript exceptions or alter transactions. Real repository public assets are served through the lab server.

## Re-run commands

Start the isolated Vite server: `node node_modules/vite/bin/vite.js --config lab/stockAcquisitionSafetyVite.config.mjs`. Run browser checks sequentially on a source freeze:

```sh
node scripts/audit-stock-acquisition-matrix.cjs
STOCK_FLOW_DOUBLE_SIGN=1 STOCK_FLOW_DEBT_MILLIONS=500 node scripts/audit-stock-acquisition-flow-browser.cjs
node scripts/audit-stock-acquisition-app-smoke.cjs
node scripts/audit-stock-acquisition-app-recovery.cjs
```

The browser scripts use bundled Playwright by default; set `PLAYWRIGHT_MODULE` when running from another host. Each opens a new browser context. The component matrix's synthetic namespace is distinct from career slots; the actual App checks use only synthetic slot1 in their fresh contexts.
