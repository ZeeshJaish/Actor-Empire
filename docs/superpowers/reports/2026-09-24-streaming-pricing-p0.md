# Pricing rebuild — P0 + P1 handoff

Date: 2026-09-24. User authorized the two phases together. Implementation is ready for visual review; creative acceptance is not claimed. No career slots were read or changed for browser QA. No commit, push or release.

## Delivered

- Fresh pricing has no selected core. Only Your offers and the model chooser appear in the content area; no default plans, public extras or forecast. Next remains disabled until a deliberate choice.
- Versioned offer intent now carries an explicit selection marker. Initial factories set it false; older pricing without the marker remains selected. Draft autosave cannot turn untouched defaults into completed pricing.
- A compact connected model chooser replaces the broadcast rows. The chosen model collapses to a short header with Change model.
- Subscription keeps the blue/purple/gold covers and custom plans. Ads and store each have one full-width coloured cover, with a dark attached editor. Editors reopen collapsed. Core offer comes first in both visual and keyboard order.
- Compatible public offers are enabled inside Edit, and receive their own cards. Copy explicitly says these are service-wide, not per-plan purchase permissions.
- Changing core explains that other active offers turn off. Plan names/prices/benefits, pass prices and store settings survive. Dormant ad-funded tier terms also survive disabling/re-enabling ads; intentional interim price changes take precedence.
- Aligned feature rows, styled native switches, a short Premium access control and 0–4-week buttons preview the P2 design. Locks say only Research locked. This is presentation, not a claim that mutually exclusive feature rules or plan-scoped rental rights are finished.
- The forecast is now below the cards: two headline figures, a visible costs/playability qualification, and an expandable breakdown. Its underlying calculation and ownership have not changed.

## Review surfaces

- `http://127.0.0.1:3000/pricing-lab.html`: isolated resettable interactive visual preview, starts unchosen. No career persistence.
- `http://127.0.0.1:3000/pricing-lab.html?wizard&fresh`: actual launch adapter + wizard, initially unchosen, using a disposable fixture.
- `http://127.0.0.1:3000/pricing-lab.html?wizard`: configured hybrid fixture in the same real adapter.

Wizard fixtures persist only to dedicated `actor-empire:pricing-p1-lab:*` session keys so reload can be tested without touching signed career saves. They are development pages, not new production game routes. Port 3000 was verified to belong to this repository.

## Baseline for P3

Before integration, one First three months keyboard change in the full C6 wizard fixture produced a 55 ms React update. Its page briefly showed $25M while the footer showed $26M. Both surfaces currently compute forecasts independently.

After P1 integration, three repeated discount drags on the full wizard (320 CSS px, C6 fixture week 2039, ad core plus subscription plans, renamed Essential with three-week early access) produced repeated React updates around 82.7–84.3 ms, with one sampled update of 102.6 ms. The final slider value returned to zero. This second fixture is not identical to the first: these numbers are a reproducible remaining-work baseline, **not a before/after speed comparison**. React render duration is not total input latency or real-phone frame time.

P1 does not fix the drag pipeline or transient page/footer mismatch. P3 must consolidate forecast ownership and commit gesture values once. Do not call the sliders optimized.

## Verification

- New `audit:streaming-pricing-p1` first failed on the visible default selection, then passed after implementation. A second red/green regression caught the lost dormant ad-tier assignment and zero price.
- P1 covers fresh rendering, explicit choice, incomplete-save rejection, full normalization roundtrip, old configured platform migration, collapsed ad/store cards, retained definitions/benefits/pass prices and dormant ad-tier restoration.
- Commercial C1, C2, C3, C4, C5 and C6 passed during this work. C5 rendering expectations were updated for deliberately collapsed cards; economic assertions remain intact. C6 signed-save/live-week and delivery gates passed.
- Focused C5 TypeScript (including the new P1 audit) passed. Production build passed with existing missing `/index.css`, mixed static/dynamic import and large-chunk warnings. C2 retains its CSS no-side-effects bundler warning. `git diff --check` passed.
- Browser: fresh full wizard, explicit selection, rename, premium three-week setting, service-wide store addition, navigate away/back, reload with settings preserved and editors collapsed, core-switch confirmation, membership restoration, custom-plan creation/removal, long names, ad-free pass price reveal and store editor expansion.
- Inspected at 320, 393 and 430 CSS pixels. DOM geometry checks found no pricing-content horizontal overflow at 320. Keyboard focus was visible on the timing controls. Reduced-motion CSS disables pricing transitions; OS-level reduced-motion emulation and physical-device touch were not tested.

Selected C4/C6 economic outputs remained unchanged: C4 ad receipts $17,132 on 230,161 free-viewing accounts; C4 paid weekly receipts $438,424 on 250,000 paid accounts. C6 incremental gross: subscription $0, advertising $34,237, store $10,142, hybrid $29,997. These are specific audit scenarios, not player-facing revenue promises or economy calibration.

## Next — P2, separately authorized

Unify feature semantics, resolve No adverts versus plan ad flags, implement real plan-scoped purchase eligibility across access/checkout/AI, and finish feature-control accessibility. P3 then addresses performance/shared forecast; P4 automatic CPM/cadence; P5 revenue calibration. Current target-CPM strategy remains transitional as specified in P1. No gameplay balance coefficients were tuned here.
