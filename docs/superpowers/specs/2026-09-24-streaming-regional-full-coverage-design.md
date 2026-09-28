# Streaming Regional Full-Coverage Design

## Decision

The Network stage's cloud slider must have one meaningful maximum: a plan that can serve the entire selected region's supported population footprint, not the provider's standard-rate ceiling. The player may use cloud, owned servers, or both. Compute may be placed in one country and reach neighbouring countries in the same delivery region. An unopened country may be physically reached, but it contributes no viewers, customers, or revenue until market entry is filed.

The provider's normal ceiling remains a **pricing breakpoint**, not a service cap. Compute above it is usable and charged at the existing step-up rate. There is no “Extend cloud range” button.

## Terms and boundaries

- **Physical regional footprint:** all supported population clusters in the selected region, including unopened countries. This is the basis for the slider maximum and map reach. It does not mean every uninhabited pixel of land or sea.
- **Serviceable entered market:** an opening country whose population clusters meet the launch signal standard and whose opening-night concurrent demand fits available network capacity. A cluster meeting the standard counts fully toward served audience; signal strength below the standard does not count fractionally as a served customer.
- **Market-entry boundary:** only the explicitly filed opening-country IDs enter the launch-demand, customer, viewing, ad, store, and subscription calculations. Physical reach is never an implicit market filing.
- **Residency boundary:** an entered country with an existing in-country data-residency rule still needs in-country capacity; cross-border reach does not bypass it. A region with an impossible residency requirement cannot claim full service merely because the slider is at its maximum.
- **Full region:** the physical footprint can reach all supported clusters in that region, and all *entered* markets can be fully served if their residency and capacity requirements are met. The UI must distinguish a physical-footprint shortfall from a residency or load blocker.

## Canonical data flow

1. The Build draft places purchased cloud compute among actual regional cloud sites. Normal city/provider ceilings decide which units use the standard rate. Above-ceiling units remain virtual cloud allocations at the provider's step-up price and are distributed to sites that expand the remaining physical footprint. They are not silently cut to a cloud listing's physical rack positions.
2. `buildSelectionFromDraft` and save normalization preserve every paid virtual cloud unit in canonical facility groups and leases. Physical server rooms continue to obey rack, power, and cooling limits. The canonical quote, capacity, and coverage projections must read the same retained compute.
3. The coverage engine evaluates signal against all supported regional clusters for the physical-footprint readout. It evaluates only explicit opening-country IDs for service and economy. For entered demand, a cluster above the standard contributes its full cluster share; capacity is a separate gate.
4. The cloud slider maximum is derived deterministically from the provider, region's supported clusters, existing servers, fibre, and valid capacity/residency constraints. The result is memoized per material input, so dragging does not run an expensive maximum search every frame. The range always contains a saved draft's compute even when the provider changes.
5. The map and served readout use the same effective plan. Green may cross political borders. The Network page says how much of the region's physical footprint is covered, how many *entered-market* viewers can be served, and why an unmet service requirement remains. No coverage or revenue is invented for unentered countries.

## Pricing and persistence

- The existing provider rate and step-up premium remain. Every charged cloud unit must survive conversion into canonical facilities and appear in capacity or reach; no unit may be billed while being discarded by a physical-room clamp.
- If a provider cannot sell in a region, the slider remains disabled and no cloud capacity is charged. If a supported region cannot become fully serviceable because of residency or lack of a viable site, the UI states that constraint instead of labelling the maximum “full”.
- Existing saves retain their facility and provider choices. Migration must not delete facilities, reroll purchases, charge again, or convert physical server positions into unlimited cloud allocations.

## Acceptance tests

1. Reproduce the North America case: increasing Meridian cloud from the old range end through 445 must increase canonical usable compute and physical coverage; the weekly bill must match the retained compute.
2. At the new cloud slider maximum, a region without residency blockers reaches all supported regional population clusters and serves 100% of entered-market opening-night demand when capacity suffices. The 5.5K gap is not a permanent mathematical artifact of the strength formula.
3. A US-only opening may place sites and show physical coverage in Canada/Mexico, but no Canadian/Mexican customers or receipts are created. Filing either country later permits its demand to enter the economy without rebuilding the network.
4. Provider switching and reopening a save cannot put purchased compute above the range input's maximum or silently trim it.
5. Residency-limited entered markets remain blocked without in-country capacity. Physical server rooms remain bounded by their real building constraints.
6. Run focused coverage, placement, quote, Build/UI, save-migration and world-economy audits, a production build, and a mobile-width visual check. Report unrelated baseline failures separately.
