# C5 pricing UI and launch gates

Date: 2026-09-23  
Status: **C5 implemented at the code/audit gate.** A real-save phone walkthrough and C6 career/save regression remain; this is not a release decision. Nothing was committed or pushed.

## Player-facing change

- Define the Launch now edits one saved commercial offer with three core postures: Subscription, Free with ads, or Rent or buy. Compatible hybrids are optional. The existing subscription cards remain, with up to six custom plans; advertising and store settings use one card each rather than pretending to have subscription tiers.
- Premium access is a benefit on an individual plan or offer, with a selectable 0–4 week early window. The ad offer can sell a one-hour or 24-hour ad-free pass. Passes remove ads only; they never unlock a paid title. Rentals and purchases retain one uniform price per eligible title.
- Advertising shows the player-controlled target CPM separately from the market's expected fill and realized CPM. The pricing preview uses the C4 world forecast for conditional ad, pass, rental and purchase income instead of a synthetic fixed-CPM or sponsor calculation. It shows monthly/annual subscribers and country estimates, clearly labelled as potential gross **if playable**, before costs.
- Build reads the saved commercial configuration, not a separate fixed-tier cinematic pricing state. The old cinematic pricing entry point routes to Define the Launch. Build demand no longer applies a second pricing reach multiplier to an already offer-aware world forecast.
- An opening country without at least one title that can be watched under the current offer and rights blocks final launch readiness. Draft pages remain explorable. Free/store-only opening launches no longer seed fictional paid subscribers or paid ARPU.
- Research locks on this screen display only “Research locked.” Old sponsor/patron configuration and historical cash remain in saves, but there are no new sponsor/fan-funding launch controls.

## Save, AI and balance impact

The editor writes the existing versioned `commercialOffers` configuration and normalized pricing fields through the canonical save action. It does not create a second entitlement or revenue pipeline. Player and AI weekly settlement remain the C4 system; C5 does not retune CPM, audience choice, conversion, population, or historical cash. The narrower launch gate may require an old uncommissioned draft to add rights/eligible titles before final opening. Already-live platforms and settled entries are not rewritten.

## Verification

The C5 audit covers core/hybrid/benefit/pass editing, six-plan cap, founding ad/store saves, early-benefit persistence, Build's saved-offer summary, conditional preview labels, target/fill/realized separation, owned playable opening rights, licensed mode denial, a missing second-country territory, and free/store paid-subscriber seeding. Red-to-green failures were observed while implementing the adapters and gate.

Passing: `audit:streaming-commercial-c0` through `audit:streaming-commercial-c5`, focused C5 TypeScript check, Vite production build, and `git diff --check`. The C2 audit still prints its inherited CSS side-effect warning. Vite still reports the existing missing `/index.css`, mixed dynamic/static imports, and oversized chunk warnings. The full repository `tsc --noEmit` exceeded the default Node heap; the focused C5 typecheck passed.

No real-save interactive phone walkthrough was performed in this task because the local app opened at Start Career and the existing lab has only a Build fixture. The UI has responsive CSS and server-rendered structural assertions, but touch, keyboard, and long-content visual behavior still need device-width verification before release. C6 remains the full launch-to-live, old-save, AI, annual/monthly, free/store/hybrid, outage, replay, and long-horizon regression gate. The pricing UI reports gross opportunity, not a new country-level rights/operating-deduction or net-profit estimate; those costs remain in the existing budget/economy reports and must not be inferred by subtraction from this preview.
