# Network suggestion UI correction — 21 October 2026

Approved scope: align the entry with Build cards; reuse Build typography and platform brand; add sliders with exact custom budget input; simplify keep/replan language. Existing planner, affordability, rights, apply and save boundaries are unchanged.

- Entry and region list both measured left16/right377.33 at393CSSpx, with zero horizontal overflow.
- Sheet measured no horizontal overflow at320×740,393×852 and actual local425×786. Headings use the existing Anton display token, body uses the Archivo UI token, numbers use the existing number token.
- Actual local brand and CTA both rgb(250,46,46). Disposable purple platform also matched its existing Build accent. Hardcoded gold styles removed from this component.
- Setup/weekly budgets start explicitly at $0. Initial slider ranges are up to min(current treasury,$1B) and $25M/week; typing a larger valid custom amount expands that control's range. Dragging lower does not shrink it under the pointer. The curve gives more travel to smaller budgets. These are editing ranges, not changed affordability rules or spending commitments.
- Actual browser keyboard Home/End updated amount fields to0/$1B and0/$25M. A custom weekly$100M expanded the range and Home retained that expanded ceiling. Typed setup$7,250,123 remained exact (not rounded through the slider).
- Slider edits invalidated an old preview immediately; invalid-1 disabled Generate. Search remains explicitly behind Generate. No budget editor handler calls forecast, quote, planner or save. Shared currency formatters are reused during edits.
- Browser Generate→Use this plan on disposable US/IN save retained12rooms and$995B treasury; no suggestion was applied to the actual user's career. The actual local sheet was opened only for visual handoff.
- New pure budget audit covers endpoints, useful small amounts, clamping, invalid numeric arguments and safe whole-dollar values. Initial RED was the absent slider helper; GREEN passed after implementation.
- Existing focused planner/CAREER settled-unpaid/current-funds/draft-rights-save audit PASS. Final TypeScript/build results are recorded below.
- Existing audit bundle/chunk/Browserslist warnings remain; no suppression, dependency changes or new lazy loading.

Screenshots: [actual red platform](local-red-sheet.png), [aligned entry](entry393.png), [393px sheet](sheet393.png), [320px sheet](sheet320.png), [simple choices](choices320.png).

The prior5,000-title cold-open limit is not part of this UI correction; no claim that the remaining Build cold-open delay is solved.

Final gates: `NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/tsc --noEmit --pretty false` exit0/zero diagnostics; `npm run build` exit0; budget-helper audit exit0; focused network-suggestions audit exit0; `git diff --check` exit0. Browser checks used the production disposable fixture plus a read-only visual opening of the actual local sheet.
