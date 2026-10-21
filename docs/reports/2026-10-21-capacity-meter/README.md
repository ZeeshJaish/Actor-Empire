# Capacity meter simplification

Supersedes the rejected Facility Map presentation. Removed all site tiles, filters, counters, detail interactions, inventory and their projection helper. The panel now reads only the already computed demand, regular capacity and burst reserve; it performs no forecast or save calls.

Solid fill represents expected demand against regular capacity. The remaining regular capacity is hatched. Fill is capped visually at 100%, while the text retains any actual overload. Colour is green below 80%, amber at 80% through burst-supported overload, and red only when demand exceeds regular plus burst. Zero regular capacity never produces invalid dimensions. Burst is separate from regular headroom; local routing health remains in the regional forecast.

Verified on the local Anshu save: 4.4M expected, 75.5M regular, 71.1M regular headroom, +23M burst reserve; no Facility Map or horizontal overflow. Existing saved Surge rehearsal remains present. No purchases, commissioning, configuration edits or week advancement performed during verification.

Checks: boundary audit (zero, tiny demand, 80%, 100%, burst ceiling and shortfall); immutable render/quote checks on 52- and 5,000-title fixtures; save-gate audit; TypeScript; production build; git diff --check. Controlled 320px container states have no internal overflow. This is browser/container verification, not physical-device certification. Production build retains the pre-existing large-chunk warning.

5,000-title fixture warm SSR render: 14.9ms. This is not a cold-open, browser tap or device performance metric.
