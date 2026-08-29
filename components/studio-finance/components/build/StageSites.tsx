/* ============================================================================
   1 · Sites — where the platform physically exists.

   The first question is who is doing this: the team, or you. Everything after
   that follows the world the game is actually built from — region, then
   country, then the cities inside it that can hold a rack — instead of one flat
   list of city names.

   Nothing is charged here. A lease is a drawing until commissioning.
   ========================================================================== */

import { useState } from 'react';
import type { City, Facility, FacilityListing } from '../../finance/build';
import { REDUNDANCY_COPY, citiesIn, countriesIn, facilityRacks } from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money } from '../../finance/format';
import { WorldMap } from './WorldMap';
import { CityScene } from './CityScene';
import { CountryShape } from './CountryShape';
import { SpecMeters } from './SpecMeters';
import { Sheet, Tag } from '../ui';

const AVAILABILITY: Record<FacilityListing['availability'], { label: string; tone: 'good' | 'warn' | 'flat' }> = {
  AVAILABLE: { label: 'Available', tone: 'good' },
  LIMITED: { label: 'Limited space', tone: 'warn' },
  RESEARCH: { label: 'Needs research', tone: 'flat' },
};

/** A newly leased room starts with a sensible default rather than empty floor. */
export function facilityFromListing(listing: FacilityListing, first: boolean): Facility {
  const racks = first ? 2 : 1;
  return {
    id: `fac-${listing.id}-${Date.now()}`,
    listingId: listing.id,
    cityId: listing.cityId,
    built: false,
    groups: [
      first
        ? { id: `g-${listing.id}-origin`, name: 'Origin', duty: 'ORIGIN', racks, capacity: racks * 140_000 }
        : { id: `g-${listing.id}-edge`, name: 'Edge', duty: 'EDGE', racks, capacity: racks * 120_000 },
    ],
    power: { used: racks * 12, contracted: listing.rackPositions * 12 },
    cooling: { used: racks * 11, available: listing.rackPositions * 10 },
    bandwidth: { used: racks * 40, available: listing.rackPositions * 45 },
    condition: 0.92,
    uptime: listing.uptime,
    backup: listing.security === 'Vault' ? 'Diesel + flywheel' : 'Diesel',
    backupCoverage: listing.security === 'Vault' ? 1 : 0.7,
    energyPerWeek: racks * 14,
    waterPerWeek: racks * 26,
    opCost: listing.weeklyRent * 0.55,
    sustainability: listing.fibre === 'Carrier hotel' ? 62 : 74,
    reputation: 70,
  };
}

export function StageSites({ data, draft, patch, totals, services }: StageProps) {
  const [chosen, setChosen] = useState(draft.facilities.length > 0);
  const [regionId, setRegionId] = useState(data.regions[0]?.id);
  const [countryId, setCountryId] = useState<string | undefined>(undefined);
  const [cityId, setCityId] = useState<string | undefined>(undefined);
  const [reviewing, setReviewing] = useState(false);

  const red = REDUNDANCY_COPY[totals.redundancy];

  const lease = (listing: FacilityListing) =>
    patch({ facilities: [...draft.facilities, facilityFromListing(listing, draft.facilities.length === 0)] });

  const drop = (facility: Facility) =>
    patch({ facilities: draft.facilities.filter((f) => f.id !== facility.id) });

  /* Presets and the team's draft both do the same thing: lease the shortlist
     and spread the racks over it. */
  const applyPlan = (racks: number, cityCount: number) => {
    const picks = data.cities.filter((c) => c.recommended).slice(0, cityCount);
    const facilities = picks.map((pick, i) => {
      const listing = data.listings.find((l) => l.cityId === pick.id && l.availability === 'AVAILABLE')
        ?? data.listings.find((l) => l.cityId === pick.id);
      if (!listing) return null;
      const base = facilityFromListing(listing, i === 0);
      const share = Math.max(1, Math.round(racks / picks.length));
      base.groups[0].racks = share;
      base.groups[0].capacity = share * (i === 0 ? 140_000 : 120_000);
      base.power.used = share * 12;
      base.cooling.used = share * 11;
      base.bandwidth.used = share * 40;
      base.energyPerWeek = share * 14;
      base.waterPerWeek = share * 26;
      return base;
    }).filter(Boolean) as Facility[];
    patch({ facilities });
  };

  /* --- the first question ---------------------------------------------- */
  if (!chosen) {
    return (
      <section className="bw-gate2">
        <p className="sf-eyebrow">Before anything else</p>
        <h2>Who builds this network?</h2>

        <button
          type="button"
          className="bw-gate2-card"
          onClick={() => { patch({ mode: 'ASSISTED' }); applyPlan(data.presets[2].racks, data.presets[2].cities); setChosen(true); }}
        >
          <span className="bw-gate2-art" aria-hidden="true">
            <i /><i /><i />
          </span>
          <b>Let the team build it</b>
          <em>
            Engineering picks the cities, leases the rooms and sizes the racks
            against your opening markets. You set the instructions and approve
            the draft.
          </em>
          <s>Recommended if this is your first network</s>
        </button>

        <button
          type="button"
          className="bw-gate2-card is-hands"
          onClick={() => { patch({ mode: 'HANDS' }); setChosen(true); }}
        >
          <span className="bw-gate2-art is-hands" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </span>
          <b>I will place it myself</b>
          <em>
            Region by region, country by country, city by city. You choose every
            room, every contract and what each rack is for.
          </em>
          <s>Slower, and every decision is yours</s>
        </button>

        <p className="lw-rule">
          Either way nothing is charged. You can hand it back to the team, or
          take it off them, at any point before commissioning.
        </p>
      </section>
    );
  }

  const region = data.regions.find((r) => r.id === regionId);
  const countries = regionId ? countriesIn(data, regionId) : [];
  const country = data.countries.find((c) => c.id === countryId);
  const cities = countryId ? citiesIn(data, countryId) : [];
  const city = data.cities.find((c) => c.id === cityId);
  const listings = data.listings.filter((l) => l.cityId === cityId);
  const leasedHere = draft.facilities.filter((f) => f.cityId === cityId);

  const pinsFor = (target: string) => citiesIn(data, target).map((c) => ({
    id: c.id,
    x: c.plot.x,
    y: c.plot.y,
    state: draft.facilities.some((f) => f.cityId === c.id)
      ? ('built' as const)
      : c.recommended ? ('picked' as const) : ('idle' as const),
  }));

  return (
    <>
      {/* Picking on the map walks the list down to the same place, so the two
          controls are never telling the player different things. */}
      <WorldMap
        data={data}
        draft={draft}
        services={services}
        selectedCityId={cityId}
        onSelectCity={(id) => {
          const picked = data.cities.find((c) => c.id === id);
          const ctry = picked && data.countries.find((k) => k.id === picked.countryId);
          if (ctry) { setRegionId(ctry.regionId); setCountryId(ctry.id); }
          setCityId(id);
        }}
      />
      <p className="wm-hint">Tap a region to scout it · tap a city to inspect its rooms</p>

      <div className="bw-summary">
        <span><em>Sites</em><b>{totals.cities}</b></span>
        <span><em>Machines</em><b>{totals.racks}</b></span>
        <span><em>Build</em><b>{money(totals.buildCost)}</b></span>
        <span><em>Time</em><b>{totals.weeks}<s>wk</s></b></span>
      </div>
      <p className={`bw-red sf-tone-${red.tone}`}>{red.label} — {red.line}</p>

      {/* --- who is drawing it ------------------------------------------- */}
      <div className="bw-whobar">
        <span>{draft.mode === 'ASSISTED' ? 'The team is drawing this network' : 'You are placing this network'}</span>
        <button
          type="button"
          onClick={() => patch({ mode: draft.mode === 'ASSISTED' ? 'HANDS' : 'ASSISTED' })}
        >
          {draft.mode === 'ASSISTED' ? 'Take over' : 'Hand it back'}
        </button>
      </div>

      {draft.mode === 'ASSISTED' ? (
        <>
          <section className="lw-block">
            <p className="sf-eyebrow lw-block-head">Network size</p>
            <ul className="bw-presets">
              {data.presets.map((preset) => {
                const on = totals.racks === preset.racks && totals.cities === preset.cities;
                return (
                  <li key={preset.id}>
                    <button type="button" className={on ? 'bw-preset is-on' : 'bw-preset'} onClick={() => applyPlan(preset.racks, preset.cities)}>
                      <span className="bw-preset-top">
                        <b>{preset.name}</b>
                        <s>{preset.racks} racks · {preset.cities} {preset.cities === 1 ? 'city' : 'cities'}</s>
                      </span>
                      <em>{preset.line}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bw-brief">
            <p className="sf-eyebrow">Standing instructions</p>
            <Choice
              label="Priority"
              value={draft.instructions.priority}
              options={[['CASH', 'Save cash'], ['BALANCED', 'Balanced'], ['ONLINE', 'Stay online'], ['PREMIUM', 'Premium']]}
              onPick={(v) => patch({ instructions: { ...draft.instructions, priority: v as never } })}
            />
            <Choice
              label="Risk"
              value={draft.instructions.risk}
              options={[['CAREFUL', 'Careful'], ['NORMAL', 'Normal'], ['FAST', 'Fast']]}
              onPick={(v) => patch({ instructions: { ...draft.instructions, risk: v as never } })}
            />
            <div className="bw-brief-row"><span>Ask me before anything over</span><b>{money(draft.instructions.askAbove)}</b></div>
            <div className="bw-brief-row"><span>Budget ceiling</span><b>{money(draft.instructions.maxBudget)}</b></div>

            <div className="lw-actions">
              <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setReviewing(true)}>Review their draft</button>
              <button
                type="button"
                className="sf-btn sf-btn--primary"
                onClick={() => {
                  const preset = data.presets[draft.instructions.priority === 'CASH' ? 0 : draft.instructions.priority === 'PREMIUM' ? 3 : 2];
                  applyPlan(preset.racks, preset.cities);
                }}
              >
                Draft it again
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* --- region ------------------------------------------------------ */}
          <section className="lw-block">
            <p className="sf-eyebrow lw-block-head">Region</p>
            <div className="lw-regions">
              {data.regions.map((r) => {
                const built = draft.facilities.filter((f) => {
                  const c = data.cities.find((x) => x.id === f.cityId);
                  const ctry = c && data.countries.find((k) => k.id === c.countryId);
                  return ctry?.regionId === r.id;
                }).length;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={r.id === regionId ? 'lw-region is-on' : 'lw-region'}
                    onClick={() => { setRegionId(r.id); setCountryId(undefined); setCityId(undefined); }}
                  >
                    {r.name}
                    {built > 0 && <i>{built}</i>}
                  </button>
                );
              })}
            </div>
            {region && <p className="bw-region-line">{region.line}</p>}
          </section>

          {/* --- country ------------------------------------------------------ */}
          {!countryId && (
            <ul className="bw-countrygrid">
              {countries.map((c) => {
                const inCountry = citiesIn(data, c.id);
                const leased = draft.facilities.filter((f) => inCountry.some((x) => x.id === f.cityId)).length;
                return (
                  <li key={c.id}>
                    <button type="button" className={leased > 0 ? 'bw-countrycard is-on' : 'bw-countrycard'} onClick={() => setCountryId(c.id)}>
                      <CountryShape shape={c.shape} pins={pinsFor(c.id)} active={c.opening} height={78} />
                      <span className="bw-countrycard-body">
                        <b>{c.name}{c.opening && <i>opening market</i>}</b>
                        <em>{inCountry.length} {inCountry.length === 1 ? 'city' : 'cities'}{leased > 0 ? ` · ${leased} leased` : ''}</em>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* --- cities inside it ---------------------------------------------- */}
          {country && (
            <section className="bw-country">
              <header className="bw-country-head">
                <button type="button" className="bw-back" onClick={() => { setCountryId(undefined); setCityId(undefined); }}>‹ All of {region?.name}</button>
                <h3>{country.name}</h3>
                <p>{country.note}</p>
              </header>

              <div className="bw-countrymap">
                <CountryShape
                  shape={country.shape}
                  pins={pinsFor(country.id)}
                  active={country.opening}
                  height={168}
                  onPin={(id) => setCityId(id)}
                />
              </div>

              <div className="bw-cities">
                {cities.map((c) => {
                  const leased = draft.facilities.filter((f) => f.cityId === c.id);
                  return (
                    <button key={c.id} type="button" className={c.id === cityId ? 'bw-city is-on' : 'bw-city'} onClick={() => setCityId(c.id)}>
                      <CityScene seed={c.name} active={leased.length > 0} height={44} />
                      <span className="bw-city-name">{c.name}</span>
                      <span className="bw-city-meta">
                        {leased.length > 0 ? `${leased.reduce((s, f) => s + facilityRacks(f), 0)} racks` : c.recommended ? 'Suggested' : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* --- the rooms in that city ------------------------------------------ */}
          {city && (
            <section className="bw-market">
              <div className="bw-market-head">
                <CityScene seed={city.name} active={leasedHere.length > 0} height={104} />
                <div className="bw-market-title">
                  <h3>{city.name}</h3>
                  <p>{city.note}</p>
                </div>
              </div>

              {leasedHere.length > 0 && (
                <ul className="bw-leased">
                  {leasedHere.map((facility) => {
                    const listing = data.listings.find((l) => l.id === facility.listingId);
                    return (
                      <li key={facility.id}>
                        <b>{listing?.name ?? 'Facility'}</b>
                        <em>{facilityRacks(facility)} racks · {money(listing?.weeklyRent ?? 0)}/wk</em>
                        <button type="button" className="bw-drop" onClick={() => drop(facility)}>Drop</button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <ul className="bw-listings">
                {listings.map((listing) => {
                  const availability = AVAILABILITY[listing.availability];
                  return (
                    <li key={listing.id} className="bw-listing">
                      <header>
                        <div>
                          <b>{listing.name}</b>
                          <em>{listing.provider} · {listing.type}</em>
                        </div>
                        <Tag tone={availability.tone}>{availability.label}</Tag>
                      </header>

                      <p className="bw-listing-line">{listing.description}</p>

                      {/* Eight numbers, eight small pictures. */}
                      <SpecMeters listing={listing} />

                      <p className="bw-listing-note">{listing.note}</p>

                      <button
                        type="button"
                        className="sf-btn sf-btn--primary"
                        disabled={listing.availability === 'RESEARCH'}
                        onClick={() => lease(listing)}
                      >
                        {listing.availability === 'RESEARCH' ? 'Locked until researched' : `Lease · ${money(listing.moveIn)} to move in`}
                      </button>
                    </li>
                  );
                })}
                {listings.length === 0 && <li className="bw-contract-empty">No rooms for lease in {city.name} yet.</li>}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="lw-rule">
        Nothing here is charged. Leases, racks and repairs stay a drawing until
        you commission the build in the last stage.
      </p>

      <Sheet
        open={reviewing}
        onClose={() => setReviewing(false)}
        eyebrow="Engineering draft"
        title="What the team would build"
        footer={
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => { applyPlan(data.presets[2].racks, data.presets[2].cities); setReviewing(false); }}>
            Approve and apply
          </button>
        }
      >
        <TeamDraftBody data={data} draft={draft} />
      </Sheet>
    </>
  );
}

function Choice({ label, value, options, onPick }: {
  label: string; value: string; options: Array<[string, string]>; onPick: (value: string) => void;
}) {
  return (
    <div className="bw-choice">
      <em>{label}</em>
      <div className="pr-chips">
        {options.map(([id, name]) => (
          <button key={id} type="button" className={value === id ? 'pr-chip is-on' : 'pr-chip'} onClick={() => onPick(id)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamDraftBody({ data, draft }: { data: StageProps['data']; draft: StageProps['draft'] }) {
  const preset = data.presets[2];
  const picks = data.cities.filter((c) => c.recommended).slice(0, preset.cities);
  const networkCost = preset.racks * 3_750_000;
  const reserve = networkCost * 0.18;

  return (
    <>
      <p className="cr-lede">
        {`We would take ${picks.map((c) => c.name).join(', ')} and split ${preset.racks} racks across them. `}
        {draft.instructions.priority === 'CASH'
          ? 'You told us to save cash, so this is the smallest network that still covers the opening markets.'
          : draft.instructions.priority === 'ONLINE'
            ? 'You told us to stay online, so every region has a second room that can carry it.'
            : 'This is the balanced plan: enough redundancy to survive one bad room, no more.'}
      </p>

      <div className="cr-tiles">
        <span><em>Cities</em><b>{picks.length}</b></span>
        <span><em>Racks</em><b>{preset.racks}</b></span>
        <span><em>Network</em><b>{money(networkCost)}</b></span>
        <span><em>Reserve</em><b>{money(reserve)}</b></span>
      </div>

      <p className="sf-eyebrow sf-block-head">What we are worried about</p>
      <ul className="cr-risks">
        <li><i aria-hidden="true">!</i>Opening night is one evening. Capacity you skip cannot be bought that day.</li>
        {networkCost > draft.instructions.maxBudget && (
          <li><i aria-hidden="true">!</i>This is over the ceiling you set us — it needs your signature.</li>
        )}
      </ul>

      <p className="sf-eyebrow sf-block-head">Coverage</p>
      <ul className="cr-checks">
        {data.markets.map((m) => <li key={m.id}><i aria-hidden="true" />{m.name} · {compactCount(m.demand)} households</li>)}
      </ul>
    </>
  );
}
