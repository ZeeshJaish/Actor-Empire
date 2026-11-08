/* ============================================================================
   1 · Opening markets — where the service goes live on day one.

   The most expensive decision in the wizard and the one that must stay free to
   explore: selecting and inspecting costs nothing, and the totals stay a plan
   until Market Clearance is confirmed.

   Two things carry the screen. Each market's audience is drawn as a share bar
   in the rivals' own recognition colours, so who owns the country is legible
   before a word is read. And the running footprint is one tap away on the
   region bar.

   #111 (Zeesh: "काफ़ी ख़राब बटन्स" … "थोड़ा गेम वाला भी फील"): the regions are
   six tiles, each filling as its markets are taken; the region bar reads like
   instruments beside one Add all / Remove all control; and a market is added
   or dropped with one switch, the same control both ways.

   #139: the country card is LaunchCountryCard, shared with the Audience room's
   Enter new markets.

   2026-11-09: the 21 Streaming+ countries show the pack's gold switch and open
   its sheet. Add all, a bloc's switch and its sheet take only what the player
   can open, and the engine refuses the rest whoever asks
   (saveStreamingMarketPlan).
   ========================================================================== */

import { useMemo, useState } from 'react';
import type { Country } from '../../finance/launch';
import { summarize, unclaimed } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, signedPct } from '../../finance/format';
import { rivalColor, UNCLAIMED } from '../../finance/rivals';
import { FlagField } from '../FlagField';
import { Sheet, Tag } from '../ui';
import { CountryReport, ShareBar } from './CountryReport';
import GroupMarketThumbnail from './GroupMarketThumbnail';
import GroupMarketMap from './GroupMarketMap';
import {
  COMPETITION_LABEL,
  COMPETITION_TONE,
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  LaunchCountryCard,
  OpeningSwitch,
  ReportGlyph,
} from './LaunchCountryCard';
import { quoteStreamingMarketFilingEnergy } from '../../../../services/streamingMarketFilingQuote';
import { openStreamingPlusSheet } from '../../../../services/streamingPlusEvents';
import { streamingPlusCountryLine } from '../../../../services/streamingPlusPack';
import { StreamingPlusChip } from '../../../streamingPlus/StreamingPlusParts';

export function StepMarkets({ data, draft, patch, chosen, handlers, initialCountryId }: StepProps) {
  const [region, setRegion] = useState(data.countries.find(country=>country.id===initialCountryId)?.region || data.regions[0]);
  /* The bloc you have opened to pick through country by country. */
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [report, setReport] = useState<Country | null>(null);
  const [footprintOpen, setFootprintOpen] = useState(false);

  const inRegion = useMemo(() => data.countries.filter((c) => c.region === region), [data.countries, region]);
  const bySize = (a: Country, b: Country) => b.audience - a.audience;

  /* --- what a region opens to ----------------------------------------------
     Every country in it, and no filter in between. A bloc rail stood here for
     a while and it was the wrong instrument: it hid countries behind a control
     in order to shorten a list that the group cards below shorten anyway.

     So the region is one list: the handful of markets with flag art drawn for
     them as full cards, and everything else folded into one card per bloc.
     North America goes from twenty-three cards to five. Africa from fifty-four
     to nine. The bloc survives as the badge on each card and as the thing the
     tail is grouped by — which is what it was actually for. */
  const heroes = useMemo(() => inRegion.filter((c) => (c.featured ?? c.authored !== false)).sort(bySize), [inRegion]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byId = new Map<string, { id: string; name: string; countries: Country[] }>();
    inRegion.filter((c) => !(c.featured ?? c.authored !== false)).forEach((country) => {
      const id = country.subRegionId ?? country.region;
      if (!byId.has(id)) {
        byId.set(id, { id, name: country.subRegion ?? country.region, countries: [] });
        order.push(id);
      }
      byId.get(id)!.countries.push(country);
    });
    return order
      .map((id) => {
        const entry = byId.get(id)!;
        const countries = [...entry.countries].sort(bySize);
        return { ...entry, countries, summary: summarize(countries) };
      })
      .sort((a, b) => b.summary.audience - a.summary.audience);
  }, [inRegion]);

  const picked = useMemo(() => new Set(draft.selectedCountryIds), [draft.selectedCountryIds]);
  /* A Streaming+ country the player cannot take: tapping it opens the pack. One already picked can still be taken off. */
  const plusLocked = (country: Country) => Boolean(country.streamingPlus) && !picked.has(country.id);
  const takeable = (countries: Country[]) => countries.filter((country) => !plusLocked(country));
  const openPlus = (country: Country) => openStreamingPlusSheet({ source: 'launch-markets', focus: 'countries', line: streamingPlusCountryLine(country.name) });
  const clearanceByCountry = new Map(data.clearance.map((entry) => [entry.countryId, entry.outcome]));
  const unfiled = (countries: Country[]) => countries.filter((country) =>
    (clearanceByCountry.get(country.id) ?? 'NOT_FILED') === 'NOT_FILED');
  const regionSummary = useMemo(
    () => summarize(inRegion.filter((c) => picked.has(c.id))),
    [inRegion, draft.selectedCountryIds],
  );
  const footprint = useMemo(() => summarize(chosen), [chosen]);

  const toggle = (id: string) => {
    const country = data.countries.find((entry) => entry.id === id);
    if (country && plusLocked(country)) {
      openPlus(country);
      return;
    }
    const next = picked.has(id)
      ? draft.selectedCountryIds.filter((c) => c !== id)
      : [...draft.selectedCountryIds, id];
    patch({ selectedCountryIds: next });
  };

  const addAll = (countries: Country[]) => {
    const next = new Set(draft.selectedCountryIds);
    takeable(countries).forEach((c) => next.add(c.id));
    patch({ selectedCountryIds: [...next] });
  };
  const removeAll = (countries: Country[]) => {
    const drop = new Set(countries.map((c) => c.id));
    patch({ selectedCountryIds: draft.selectedCountryIds.filter((id) => !drop.has(id)) });
  };

  /* One quote for one filing action, counting only markets not yet filed.
     Clearance and the transaction use the same canonical quote function. */
  const energyFor = (countries: Country[]) => quoteStreamingMarketFilingEnergy(unfiled(countries).map(country => country.id));
  const pickedHere = inRegion.filter((country) => picked.has(country.id));
  const openHere = takeable(inRegion);
  const allHere = openHere.length > 0 && openHere.every((country) => picked.has(country.id));

  return (
    <>
      {/* --- the world, a region at a time ---------------------------------
          Six tiles: the region, a meter that fills as its markets are taken,
          and the count against what it holds. The region you are in is lit. */}
      <div className="lw-theatres" role="tablist" aria-label="Region">
        {data.regions.map((name) => {
          const all = data.countries.filter((c) => c.region === name);
          const count = all.filter((c) => picked.has(c.id)).length;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === region}
              aria-label={`${name}: ${count} of ${all.length} markets chosen`}
              className={`lw-theatre${name === region ? ' is-on' : ''}${count > 0 ? ' has-picks' : ''}`}
              onClick={() => { setRegion(name); setOpenGroupId(null); }}
            >
              <b>{name}</b>
              <span className="lw-theatre-meter" aria-hidden="true">
                <i style={{ width: `${all.length > 0 ? (count / all.length) * 100 : 0}%` }} />
              </span>
              <em aria-hidden="true">{count}<s>/{all.length}</s></em>
            </button>
          );
        })}
      </div>

      {/* The region bar: what this region amounts to, read like instruments and
          opening the whole footprint, beside one control that takes the whole
          region or gives it back. */}
      <div className="lw-regionbar">
        <button type="button" className="lw-regionsum" onClick={() => setFootprintOpen(true)}
          aria-label={`${region}: ${regionSummary.countries} of ${inRegion.length} chosen. Open the opening footprint`}>
          <span><em>Chosen</em><b>{regionSummary.countries}<s>/{inRegion.length}</s></b></span>
          <span><em>Viewers</em><b>{regionSummary.countries > 0 ? compactCount(regionSummary.audience) : '—'}</b></span>
          {unfiled(pickedHere).length > 0 && <span><em>To file</em><b>{energyFor(pickedHere)}E</b></span>}
          <i aria-hidden="true">›</i>
        </button>
        <button type="button" className={allHere ? 'lw-bulk is-on' : 'lw-bulk'} onClick={() => (allHere ? removeAll(inRegion) : addAll(inRegion))}>
          <i aria-hidden="true">{allHere ? '−' : '+'}</i>
          {allHere ? 'Remove all' : `Add all ${openHere.length}`}
        </button>
      </div>

      <ul className="lw-countries">
        {heroes.map((country, i) => {
          const on = picked.has(country.id);
          return (
            <LaunchCountryCard
              key={country.id}
              country={country}
              on={on}
              index={i}
              figures={[
                { label: 'Audience', value: compactCount(country.audience) },
                { label: 'Growth', value: signedPct(country.growth, 0), good: true },
                { label: 'Market access', value: money(country.rightsEstimate) },
              ]}
              chips={(clearanceByCountry.get(country.id) ?? 'NOT_FILED') === 'NOT_FILED' &&
                <span className="lw-chip is-plain">{quoteStreamingMarketFilingEnergy([country.id])}E to file</span>}
              pinned="On opening day"
              switchLabel={on ? 'On opening day' : 'Add to opening day'}
              plus={plusLocked(country)}
              onReport={() => setReport(country)}
              onToggle={() => toggle(country.id)}
            />
          );
        })}
      </ul>

      {/* --- the tail, one card per bloc -------------------------------------
          The same card as a country, summed. A region's long tail is not
          twenty rows a player will read; it is one or two places they either
          want or do not — "the Caribbean", "Central America" — and the card
          says what taking the whole thing would cost before they find out at
          the filing desk. Opening it picks through country by country. */}
      {groups.map((group) => {
        const taken = group.countries.filter((c) => picked.has(c.id));
        const groupOpen = takeable(group.countries);
        const plusCount = group.countries.length - groupOpen.length;
        const all = groupOpen.length > 0 && groupOpen.every((c) => picked.has(c.id));
        const open = unclaimed(group.summary.rivals);
        return (
          <article key={group.id} className={taken.length > 0 ? 'lw-group is-on' : 'lw-group'}>
            <div className="lw-group-band">
              <GroupMarketThumbnail name={group.name} countries={group.countries} selectedIds={picked} />
              <span className="sf-terr-shade" aria-hidden="true" />
              <span className="sf-terr-plate">
                <span className="sf-terr-tag">{group.countries.length}</span>
                <span className="sf-terr-name">{group.name}</span>
              </span>
              {taken.length > 0 && (
                <span className="lw-onday">{all ? 'All on opening day' : `${taken.length} on opening day`}</span>
              )}
            </div>

            <div className="lw-country-body">
              <div className="lw-country-stats">
                <span><em>Audience</em><b>{compactCount(group.summary.audience)}</b></span>
                <span><em>Growth</em><b className="sf-tone-good">{signedPct(group.summary.growth, 0)}</b></span>
                <span><em>Market access</em><b>{money(group.summary.rights)}</b></span>
              </div>

              <ShareBar rivals={group.summary.rivals} open={open} compact />

              <div className="lw-chips">
                <span className={`lw-chip is-plain sf-tone-${COMPETITION_TONE[group.summary.competition]}`}>
                  {COMPETITION_LABEL[group.summary.competition]}
                </span>
                <span className={`lw-chip is-plain sf-tone-${DIFFICULTY_TONE[group.summary.difficulty]}`}>
                  {DIFFICULTY_LABEL[group.summary.difficulty]}
                </span>
                <span className="lw-chip is-plain">{group.summary.languages.length} languages</span>
                {/* The one line a single country does not need and a bloc
                    always does. */}
                <span className="lw-chip is-plain sf-tone-warn">
                  {unfiled(groupOpen).length > 0
                    ? `${energyFor(groupOpen)} energy to file ${unfiled(groupOpen).length} together`
                    : 'Already filed'}
                </span>
                {plusCount > 0 && <StreamingPlusChip dim label={`${plusCount} STREAMING+`} />}
              </div>

              <div className="lw-country-actions">
                <button type="button" className="lw-report" onClick={() => setOpenGroupId(group.id)}>
                  <ReportGlyph />Pick countries
                </button>
                <OpeningSwitch
                  on={all}
                  part={taken.length > 0 && !all}
                  label={all ? `All ${groupOpen.length} on opening day` : taken.length > 0
                    ? `${taken.length} of ${groupOpen.length} · add all` : `Add all ${groupOpen.length}`}
                  onClick={() => (all ? removeAll(group.countries) : addAll(group.countries))}
                />
              </div>
            </div>
          </article>
        );
      })}

      {regionSummary.countries > 0 && (
        <p className="lw-verdict lw-regionverdict">{regionSummary.verdict}</p>
      )}

      {/* --- everything the footprint adds up to ------------------------------ */}
      <Sheet
        open={footprintOpen}
        onClose={() => setFootprintOpen(false)}
        eyebrow={`${footprint.countries} markets · ${footprint.regions} regions`}
        title="Opening footprint"
        footer={
          <span className="lw-autosave-state is-current" role="status">
            <i aria-hidden="true" />
            Autosaved on this device
          </span>
        }
      >
        <div className="cr-tiles">
          <span><em>Audience</em><b>{compactCount(footprint.audience)}</b></span>
          <span><em>Growth</em><b className="sf-tone-good">{signedPct(footprint.growth, 1)}</b></span>
          <span><em>Market access</em><b>{money(footprint.rights)}</b></span>
          <span><em>Compliance</em><b>{money(footprint.compliance)}</b></span>
        </div>

        <p className="sf-eyebrow sf-block-head">Who you are up against</p>
        <ShareBar rivals={footprint.rivals} open={unclaimed(footprint.rivals)} />

        <p className="sf-eyebrow sf-block-head">The shape of it</p>
        <div className="lw-footprint-tags">
          <Tag tone={COMPETITION_TONE[footprint.competition]}>{COMPETITION_LABEL[footprint.competition]}</Tag>
          <Tag tone={DIFFICULTY_TONE[footprint.difficulty]}>{DIFFICULTY_LABEL[footprint.difficulty]}</Tag>
          <Tag tone="flat">{footprint.languages.length} languages</Tag>
        </div>

        <ul className="lw-fpcountries">
          {chosen.map((country) => (
            <li key={country.id}>
              <span className="cl-flag" aria-hidden="true"><FlagField code={country.code} src={country.flagSrc} /></span>
              <b>{country.name}</b>
              <em>{compactCount(country.audience)}</em>
              <s>{money(country.rightsEstimate + country.complianceCost)}</s>
            </li>
          ))}
        </ul>

        <p className="lw-verdict">{footprint.verdict}</p>
        <p className="lw-rule">
          Planning is free. The remaining {unfiled(chosen).length} market filings cost
          {' '}{energyFor(chosen)}E if submitted together. Each market keeps its own
          access and compliance cash and review; already filed markets are not charged again.
        </p>
      </Sheet>

      <Sheet
        open={report !== null}
        onClose={() => setReport(null)}
        eyebrow={report ? `${report.region} · ${report.code}` : undefined}
        title={report?.name ?? ''}
        footer={report && (plusLocked(report) ? (
          <button type="button" className="sf-btn sf-btn--research" onClick={() => openPlus(report)}>
            Add {report.name} with Streaming+ ›
          </button>
        ) : (
          <button
            type="button"
            className={picked.has(report.id) ? 'sf-btn sf-btn--ghost' : 'sf-btn sf-btn--primary'}
            onClick={() => { toggle(report.id); setReport(null); }}
          >
            {picked.has(report.id) ? 'Remove from opening day' : 'Add to opening day'}
          </button>
        ))}
      >
        {report && <CountryReport country={report} />}
      </Sheet>

      {/* --- the bloc, opened ------------------------------------------------
          The group card is a bulk decision; this is where it stops being one.
          Every country in the bloc, its own figures beside it, tick what you
          want. The energy line at the foot counts what you have actually
          chosen rather than what the bloc holds. */}
      {(() => {
        const group = groups.find((entry) => entry.id === openGroupId);
        if (!group) return null;
        const taken = group.countries.filter((c) => picked.has(c.id));
        const groupOpen = takeable(group.countries);
        const all = groupOpen.length > 0 && groupOpen.every((c) => picked.has(c.id));
        return (
          <Sheet
            open
            onClose={() => setOpenGroupId(null)}
            eyebrow={`${group.countries.length} markets · ${compactCount(group.summary.audience)} viewers`}
            title={group.name}
            footer={
              <div className="lw-group-foot">
                <span className={taken.length > 0 ? 'lw-group-energy is-on' : 'lw-group-energy'}>
                  <b>{taken.length}</b> chosen · <b>{energyFor(taken)}</b> energy to file together
                </span>
                <button
                  type="button"
                  className={all ? 'sf-btn sf-btn--ghost' : 'sf-btn sf-btn--primary'}
                  onClick={() => (all ? removeAll(group.countries) : addAll(group.countries))}
                >
                  {all ? 'Remove all' : `Add all ${groupOpen.length}`}
                </button>
              </div>
            }
          >
            <p className="lw-verdict">{group.summary.verdict}</p>
            <GroupMarketMap countries={group.countries} selectedIds={picked} onToggle={toggle} />
            <div className="cr-tiles">
              <span><em>Audience</em><b>{compactCount(group.summary.audience)}</b></span>
              <span><em>Growth</em><b className="sf-tone-good">{signedPct(group.summary.growth, 1)}</b></span>
              <span><em>Market access</em><b>{money(group.summary.rights)}</b></span>
              <span><em>Compliance</em><b>{money(group.summary.compliance)}</b></span>
            </div>
            <p className="lw-rule">
              Group totals combine the countries below. Access and compliance are summed;
              audience is summed; growth and rival shares are audience-weighted. Each new
              country costs 5E alone; filing the selected unfiled countries together costs
              {' '}{energyFor(taken)}E. Reviews still run per country.
            </p>
            <ul className="lw-group-list">
              {group.countries.map((country) => {
                const on = picked.has(country.id);
                const plus = plusLocked(country);
                return (
                  <li key={country.id} className={on ? 'is-on' : undefined}>
                    <button type="button" className="lw-group-pick" onClick={() => toggle(country.id)}
                      aria-label={plus ? `${country.name} is a Streaming+ country. See the Streaming+ Pack` : undefined}>
                      <i aria-hidden="true">{on ? '✓' : '+'}</i>
                      <b>{country.name}</b>
                      {plus ? <StreamingPlusChip /> : <span>{money(country.rightsEstimate + country.complianceCost)}</span>}
                    </button>
                    <span className="lw-group-meta">
                      {clearanceByCountry.get(country.id)?.replaceAll('_', ' ').toLowerCase() ?? 'not filed'} ·
                      {' '}{compactCount(country.audience)} viewers · {signedPct(country.growth, 0)} growth ·
                      {' '}access {money(country.rightsEstimate)} + compliance {money(country.complianceCost)} ·
                      {' '}{country.dossier.approvalWeeks} review · 5E alone ·
                      {' '}requirements: {country.dossier.consumerRequirements.length > 0
                        ? country.dossier.consumerRequirements.join(', ')
                        : 'none listed'}
                    </span>
                    <button
                      type="button"
                      className="lw-group-report"
                      aria-label={`View ${country.name} full report`}
                      onClick={() => { setReport(country); setOpenGroupId(null); }}
                    >
                      <span>View full report</span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Sheet>
        );
      })()}
    </>
  );
}
