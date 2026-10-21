# Whole-change final review — network suggestions

Reviewed base `da8d83b6da435296ba18371d5691f4933c1e3aa9` through head `e88e984`, the approved spec/plan, implementation report, execution ledger, all six changed files, and narrow canonical adapter, placement, BuildWizard and AccessibleDialog dependencies. Product source and Git state were not changed. This requested report is the only review write. No browser use, test reruns, or subagents.

## Strengths

- The planner is separated from the editor and runs only through explicit Generate. Its fixed nine mixes and eight sizes per opening region, task-boundary yields, AbortSignal checks and progress callback provide a clear bounded execution model (`networkSuggestions.ts:168-265`). The partial-result copy accurately avoids an optimality guarantee.
- Placement is restricted to explicitly selected countries/cities while final costs and country coverage use the full current canonical bridge (`networkSuggestions.ts:92-131,181-184,216-227`). Full service coverage, geographic launch threshold and capacity target remain separate. The manual placer is unchanged.
- The apply boundary rechecks issued-proposal integrity, current input identity, preserved rooms, physical/provider constraints, canonical evidence and limits, then returns only facilities plus `rehearsal:null` (`networkSuggestions.ts:269-288`). RegionBoard passes this through the existing single draft patch. No charge, commissioning, rights or persistent schema shortcut was introduced.
- The sheet has explicit blank exact-dollar inputs, defaults to Balanced/Fill gaps, invalidates edits and active work, and reuses the existing top-dialog focus/Escape behavior. The existing server-label alignment fix is retained. Controller evidence reports no overflow at 320/393/1024 CSS widths and successful focus restoration.
- The behavioral audit exercises real placement and canonical services plus the actual draft/save/normalize/reopen path, preserving treasury and rights. The fixture remains isolated from production and restores interception hooks in `finally`.

## Issues

### Critical (Must Fix)

None found.

### Important (Should Fix)

1. **[P2] Do not reserve already-settled launch/catalogue/originals spend against current treasury again.**
   - **File:** `components/studio-finance/finance/networkSuggestions.ts:134-136`.
   - **Problem:** `affordable()` takes the maximum of the canonical deferred amount and `data.treasury.committedLaunch`. In the real CAREER adapter, `committedLaunch` is `defineLaunchPaid + catalogueSpend + originalsSpend` (`StreamingBuildWizardExperience.ts:947-948`). Those same amounts are explicitly marked `SETTLED` in canonical Money, excluded from the outstanding total, and canonical `deferred` is the marketing campaign (`StreamingBuildWizardExperience.ts:827-848`). Current treasury has therefore already borne that historical spend.
   - **Impact:** A career with $100M current treasury, $150M settled catalogue/launch spend and no deferred campaign rejects even an empty $0-upfront network at generation line 180. Smaller historical amounts silently reduce the available planning budget and can force an unnecessary partial suggestion despite an affordable canonical quote. The same incorrect condition also gates Apply. Large-cash disposable fixtures do not expose this case.
   - **Fix:** Use canonical outstanding/deferred Money evidence as authority when present; retain an appropriate legacy fallback only for data without that explicit accounting. Do not mix settled historical totals into unpaid obligations.
   - **Validation needed:** Add a CAREER adapter regression with settled spend greater than remaining cash but an affordable quote, plus a separate nonzero deferred-campaign case proving genuinely unpaid commitments still constrain both Generate and Apply. The existing lab-only `committedLaunch:100` test at `scripts/audit-streaming-network-suggestions.tsx:103-106` does not distinguish these two meanings.

### Minor (Nice to Have)

No additional actionable code findings. The ledger's existing audit-bundle size/CSS-output notices remain disclosed. The two collapsed-row SSR assertion failures are documented pre-existing failures and are not attributed to this change.

## Recommendations

- Resolve the P2 accounting mismatch through a narrow planner change and meaningful canonical regression, then have the correction reviewed. No change to transaction, save, rights, manual placement or commissioning handlers is needed.
- Preserve the distinction between reported isolated CPU measurements and browser tap-to-paint. The controller supplied final isolated 5,000-title generation of 285.8ms for two markets and 1,570ms for 197 markets, apply validation of 4.2/6.6ms, and longest slices of 4.5/9.0ms. Final production browser evidence reports Suggest opening at 7.8ms to double-RAF, Generate feedback at 9.0/9.5ms and Cancel at 6.4ms with actual cancellation, Tab containment and Escape working. The global 500M/10M result is truthfully partial. Existing Build cold-open remains 4.635 seconds with a 4,630ms long task before any Generate request; that is an outstanding broader Build cost and must not be represented as instant. These are controller-supplied measurements, not reviewer reruns.
- The initial TypeScript discriminator failure is fixed at the reviewed head; the report states the 8GB TypeScript rerun passed without diagnostics. Existing successful audit and disposable UI evidence were reviewed as supplied, not rerun independently here.

## Assessment

**Ready to merge? With fixes.**

The selected-market planner, ephemeral apply integration, cancellation and canonical validation are otherwise aligned with the approved requirements. The affordability mismatch must be corrected because it can make the feature unusable for a normal career after substantial already-paid catalogue investment, even when the current canonical budget is sufficient; the existing Build cold-open cost also remains a disclosed limitation.
