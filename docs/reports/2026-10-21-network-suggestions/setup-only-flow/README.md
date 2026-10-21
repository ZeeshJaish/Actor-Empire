# Setup-only network suggestion flow — 21 October 2026

User requested a treasury-wide setup slider, weekly operation as a result rather than an input, a darkened comparison popup, compact visual coverage and a working Use this plan action.

## Root causes and changes

- The old slider started at min(treasury,$1B); it now spans the actual current treasury. Exact custom USD input remains. Inputs above treasury disable Generate with a visible explanation. Canonical affordability still reserves unpaid launch commitments.
- The old weekly cap could force a heavily incomplete global network. The editor now submits setup budget and Budget/Balanced/Premium target only; weekly operation is quoted in the result. Optional explicit weekly caps are still honored by legacy callers and regression fixtures; there is no hidden new weekly cap.
- The old view marked a proposal stale merely because data/draft object references changed. The actual user's view showed that stale message and a disabled Use button. Reference-only staleness and automatic reference-change cancellation were removed. Changed references during generation and every Apply use the existing fresh semantic/canonical validator; changed funds, markets, rights-derived availability, draft, preset, budgets and evidence still reject. A reproduced setup-only RED became GREEN; equivalent lab and actual CAREER data refreshes pass, while genuine changes still fail existing regressions.
- Generate now opens a centered comparison dialog over a dark scrim with animated network nodes, real progress and Cancel/Escape. Progress UI updates are batched every six candidates. Reduced motion disables the decorative node motion. No search runs on budget movement and no artificial waiting timer was added.
- Results replace the input form and show audience coverage, fully served market count, setup cost, quoted weekly operation, build time and readiness. Six region tiles replace 197 always-expanded country rows. Only the selected region's country rows are mounted; detail height is bounded to190px. Percentages below full coverage never round up to100%. A sticky Use this plan action and edit action remain visible, with Money→Test→Commission explained.

## Verification

- Existing focused audit PASS, including new setup-only weekly-output behavior and equivalent-object Apply validation; actual CAREER serialized save refresh remains actionable. Existing changed-funds/markets/draft, cancelled/altered proposal, preservation and canonical settled/unpaid checks still PASS.
- Production disposable UI:197 selected markets,52 titles,$1B setup budget, Balanced produced181/197 fully served markets,99.5% of expected viewers served,$839.61M setup and$108.22M/week. This is a prepared fixture, not the user's career or a profitability recommendation. The higher weekly result is now explicitly visible rather than silently constrained to$25M.
- This remains a partial plan:182/197 geographic launch thresholds met. Remaining reach gaps include Brunei,Georgia and Timor-Leste; the bounded mix comparison does not guarantee every territory is covered. Readiness and commissioning gates were not bypassed or falsely marked green.
- Actual UI deep-clone save-refresh simulation left Use enabled; clicking it applied the disposable draft successfully and treasury stayed$995B. No suggestion was applied to the user's actual career by the agent.
- Actual Cancel generation returned to the form with no draft applied. At320×740 and393×852 CSS widths, result had zero horizontal overflow,6 region tiles and0 country rows before expanding. Opening Asia mounted48 rows in a190px detail panel. No long197-country default scroll remains.
- User's actual local game remained on localhost:5174. Its draft changed while the user was testing; those changes were preserved, and no reset, plan Apply or purchase was performed there.
- TypeScript and production build/final audit results are recorded after final verification. Existing bundle size/CSS/Browserslist notices remain unsuppressed. No dependencies, schema, transaction handlers, save shortcuts or rights validation changes.

Screenshots: [comparison popup](comparison-popup.png), [393px result](result393.png), [320px result](result320.png). The screenshots use a disposable purple-branded platform; the actual career retains its own red brand.

Final verification:8GB `tsc --noEmit --pretty false` exit0/no diagnostics; `npm run build` exit0; focused planner/CAREER refresh audit exit0; `git diff --check` exit0. Existing production chunk warnings retained. Final scoped change also resets the edit view to the top; no layout changed after the captured visual pass.
