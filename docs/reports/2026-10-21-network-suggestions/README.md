# Selected-market network suggestions — 21 October 2026

Build → Network now offers **Suggest network** between the map and the reach explanation. Budget, Balanced and Premium target 1.0×, 1.2× and 1.5× likely demand respectively. The player supplies exact upfront and weekly caps. Generation compares bounded practical server/cloud mixes, previews costs, build time, country coverage and remaining gaps, then applies one validated draft patch. It does not guarantee a mathematical optimum or complete coverage when limits/geography prevent it.

## Verified behavior

- US + India targeting uses those two countries; China is not added. Canonical preview agreed with fresh service evidence.
- Balanced at $500M upfront / $10M weekly produced 12 cloud rooms, $0 upfront, $1,718,076/week and four build weeks in the 52-title disposable CAREER fixture; US and India each showed 100% service/geographic coverage. Zero upfront is existing cloud accounting, not a price change.
- Actual browser Apply → HQ → reopen retained the draft. Treasury remained $995B. The actual adapter save/normalize/reopen audit also preserved cash and rights.
- Fill remaining gaps retains existing draft rooms. Explicit Replace unbuilt preserves built/existing estate. Fresh Apply checks reject stale drafts, funds, markets, limits, edited/cancelled proposals and changed canonical evidence.
- Zero caps with retained spend are refused. Explicit replacement at zero caps yields a truthful 0%-coverage partial preview. Invalid exact-dollar input disables Generate and removes the old preview. No-market Build disables suggestions with the existing filing explanation.
- Generate is explicit, capped at 432 candidates across six regions, yields between candidates and supports Cancel. No search runs on opening, typing or manual controls. Actual global browser cancellation completed; no draft was applied.
- Mobile 320×740, 393×852 and desktop 1024×768 CSS viewports had no horizontal overflow. Tab stays inside the sheet; Escape closes only the sheet and restores its opener. Screenshots below are one batched layout inspection.
- Main localhost:5174 remained rendered on the user's existing Build/world view with the new entry. No suggestion was applied to the user's career.

## Performance evidence

The frozen 34.9MB fixture has 5,000 titles and all 197 markets filed: 52 normal acquisitions plus 4,948 synthetic released titles with explicit grants. It is not 5,000 manual purchases and is not the older day's fixture. SHA256 and machine-readable results are in [measurements.json](measurements.json).

| 5,000-title planner case | Generation | Fresh Apply validation | Longest work slice | Candidates |
| --- | ---: | ---: | ---: | ---: |
| US + India | 296.1ms | 4.6ms | 4.9ms | 144 |
| All 197 markets | 1,584.0ms | 5.8ms | 9.0ms | 432 |

These are isolated Node CPU measurements at final implementation a42ea26 after canonical Build data capture, not browser tap-to-paint. Production browser observations at e88e984 (the final fix changed affordability accounting only), measured click-to-double-RAF, were Suggest opener **7.8ms**, Generate feedback **9.0–9.5ms**, and Cancel **6.4ms**. No post-reset long task occurred during those suggestion actions. The all-market $500M/$10M preview was truthfully partial.

**Outstanding broader performance limit:** opening Build itself on this synthetic 5,000-title/global fixture took **4,635ms**, with a **4,630ms long task**, before Generate was requested. That cost remains; this feature does not make Build cold-open instant. Physical Android/iPhone performance and the App's durable career-save latency are not measured by the disposable browser fixture.

## Validation and review

- New behavioral audit: planner, exact caps, selected footprint, impossibility/partial results, preserved estate, stale/current validation, deterministic output, cancellation and actual career adapter round trip PASS. Root independently reran focused and scale checks.
- Existing infrastructure forecast, Build autosave/Test gates, launch coverage, regional plan migration/lifecycle, durable save generations and rights transaction audit groups PASS. Worker also checked lab/career parity and infrastructure phase5.
- Full TypeScript and production build PASS after the explicit union-narrowing correction. The final affordability correction also has a reproduced RED → GREEN CAREER regression and approved scoped review; details below.
- Two pre-existing audits still fail their initial collapsed-row SSR expectations: `audit:streaming-region-placer` and `audit:streaming-build-pricing-interaction`. Both failed before this feature, and their assertions were preserved. This is not a full-suite green claim.
- Existing esbuild audit size/CSS-output notices, production large-chunk warning and Browserslist warning remain disclosed without suppression. No dependency, save schema, rights or commissioning changes.

## Screenshots

[393px phone](phone393.png) · [320px phone](phone320.png) · [1024px desktop](desktop1024.png)

The feature remains on `codex/streaming-tap-lag` for local testing; no push or merge was requested for this addition.

## Final accounting correction

Final review found one Important issue: the initial planner also reserved already-paid historical launch/catalogue/original spend. Commit `a42ea26` uses explicit canonical deferred obligations as authority, with legacy fallback only where that accounting is absent. Real CAREER regression with $150M already settled and $100M current cash now accepts affordable zero/positive-upfront plans; actual unpaid campaign commitments still constrain Generate and freshly revalidated Apply. Input money and rights remain unchanged.

The initial union-narrowing compile issue was fixed in `e88e984`. Task review approved the fix, final broad review identified the accounting issue, and one final correction plus scoped review resolved it with no residual findings. Evidence: [implementation](implementation-evidence.md), [final review](final-review.md), [accounting RED/GREEN](affordability-fix-evidence.md), [final scoped approval](final-scoped-review.md). No policy rulings or warning suppressions were made.

## Final commands

Final `a42ea26` controller gates all exited 0:

```sh
NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/tsc --noEmit --pretty false
npm run build
node_modules/.bin/esbuild scripts/audit-streaming-network-suggestions.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/network-suggestions-root-audit.cjs
node /tmp/network-suggestions-root-audit.cjs --scale
git diff --check
```

TypeScript emitted zero diagnostics. The scale audit also reran the actual settled/unpaid CAREER regression and draft/save/rights tests. [Final scale output](final-scale.txt), [build output](final-build.txt), [existing audit results](existing-checks.json). Local implementation commits: `1ce8aef`, `e88e984`, `a42ea26`. No complete-game or physical-device green light is implied by this scoped feature verification.
