/* ============================================================================
   1 · Opening markets — where the service goes live on day one.

   The most expensive decision in the wizard and the one that must stay free to
   explore: selecting and inspecting costs nothing, and the totals stay a plan
   until Market Clearance is confirmed.

   Two things carry the screen. Each market's audience is drawn as a share bar
   in the rivals' own recognition colours, so who owns the country is legible
   before a word is read. And the running footprint lives in a dock pinned to
   the bottom of the step — the old version buried it below every card, where a
   player had no way to know it existed.
   ========================================================================== */

import { useMemo, useState } from 'react';
import type { Competition, Country } from '../../finance/launch';
import { summarize, unclaimed } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, pct, signedPct } from '../../finance/format';
import { rivalColor, UNCLAIMED } from '../../finance/rivals';
import { FlagField, flagAccent } from '../FlagField';
import { Sheet, Tag } from '../ui';
import { CountryReport, ShareBar } from './CountryReport';

/* Plain words. "Fierce" was doing no work that "fought over" doesn't do. */
export const COMPETITION_LABEL: Record<Competition, string> = {
  OPEN: 'Open',
  BUSY: 'Crowded',
  FIERCE: 'Fought over',
};
export const COMPETITION_TONE = { OPEN: 'good', BUSY: 'warn', FIERCE: 'bad' } as const;
export const DIFFICULTY_LABEL = {
  LOW: 'Easy entry',
  MODERATE: 'Some paperwork',
  HIGH: 'Hard entry',
  SEVERE: 'Very hard entry',
} as const;
export const DIFFICULTY_TONE = { LOW: 'good', MODERATE: 'flat', HIGH: 'warn', SEVERE: 'bad' } as const;

export function StepMarkets({ data, draft, patch, chosen, handlers }: StepProps) {
  const [region, setRegion] = useState(data.regions[0]);
  const [report, setReport] = useState<Country | null>(null);
  const [footprintOpen, setFootprintOpen] = useState(false);

  const inRegion = useMemo(() => data.countries.filter((c) => c.region === region), [data.countries, region]);
  const picked = new Set(draft.selectedCountryIds);
  const regionSummary = useMemo(
    () => summarize(inRegion.filter((c) => picked.has(c.id))),
    [inRegion, draft.selectedCountryIds],
  );
  const footprint = useMemo(() => summarize(chosen), [chosen]);

  const toggle = (id: string) => {
    const next = picked.has(id)
      ? draft.selectedCountryIds.filter((c) => c !== id)
      : [...draft.selectedCountryIds, id];
    patch({ selectedCountryIds: next });
  };

  const addRegion = () => {
    const next = new Set(draft.selectedCountryIds);
    inRegion.forEach((c) => next.add(c.id));
    patch({ selectedCountryIds: [...next] });
  };

  return (
    <>
      <div className="lw-regions" role="tablist" aria-label="Region">
        {data.regions.map((name) => {
          const count = data.countries.filter((c) => c.region === name && picked.has(c.id)).length;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === region}
              className={name === region ? 'lw-region is-on' : 'lw-region'}
              onClick={() => setRegion(name)}
            >
              {name}
              {count > 0 && <i>{count}</i>}
            </button>
          );
        })}
      </div>

      <div className="lw-regionhead">
        <p className="sf-eyebrow">
          {inRegion.length} markets · {regionSummary.countries} chosen
          {regionSummary.countries > 0 && ` · ${compactCount(regionSummary.audience)} viewers`}
        </p>
        <button type="button" className="sf-link" onClick={addRegion}>Add all</button>
      </div>

      {/* The running footprint belongs beside the market controls. Keeping it
          in normal flow makes every country action reachable; the former
          bottom-sticky dock covered whichever card was being inspected. */}
      <div className="lw-dock">
        <button type="button" className="lw-dock-face" onClick={() => setFootprintOpen(true)}>
          <span className="lw-dock-count">{footprint.countries}</span>
          <span className="lw-dock-body">
            <b>Opening footprint</b>
            <em>
              {footprint.countries === 0
                ? 'Nothing chosen yet'
                : `${compactCount(footprint.audience)} viewers · ${money(footprint.rights + footprint.compliance)} planned`}
            </em>
          </span>
          <span className="lw-dock-go" aria-hidden="true">›</span>
        </button>
      </div>

      <ul className="lw-countries">
        {inRegion.map((country, i) => {
          const on = picked.has(country.id);
          const open = unclaimed(country.rivals);
          return (
            <li
              key={country.id}
              className={on ? 'lw-country is-on' : 'lw-country'}
              style={{ ['--terr-accent' as string]: flagAccent(country.code) ?? 'var(--sf-brand-on)', ['--i' as string]: i }}
            >
              <div className="lw-country-band" aria-hidden="true">
                <FlagField code={country.code} src={country.flagSrc} variant="band" />
                <span className="sf-terr-grain" />
                <span className="sf-terr-glow" />
                <span className="sf-terr-shade" />
                <span className={`sf-terr-badge sf-tone-${COMPETITION_TONE[country.competition]}`}>
                  {COMPETITION_LABEL[country.competition]}
                </span>
                {on && <span className="lw-onday">On opening day</span>}
                <span className="sf-terr-plate">
                  <span className="sf-terr-tag">{country.code}</span>
                  <span className="sf-terr-name">{country.name}</span>
                </span>
              </div>

              <div className="lw-country-body">
                <div className="lw-country-stats">
                  <span><em>Audience</em><b>{compactCount(country.audience)}</b></span>
                  <span><em>Growth</em><b className="sf-tone-good">{signedPct(country.growth, 0)}</b></span>
                  <span><em>Market access</em><b>{money(country.rightsEstimate)}</b></span>
                </div>

                {/* Who owns the country, in their own colours. */}
                <ShareBar rivals={country.rivals} open={open} compact />

                <div className="lw-chips">
                  {country.languages.map((lang) => (
                    <span key={lang.name} className="lw-chip">{lang.name} <i>{pct(lang.share, 0)}</i></span>
                  ))}
                  <span className={`lw-chip is-plain sf-tone-${DIFFICULTY_TONE[country.difficulty]}`}>
                    {DIFFICULTY_LABEL[country.difficulty]}
                  </span>
                </div>

                <div className="lw-country-actions">
                  <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setReport(country)}>
                    Full report
                  </button>
                  <button
                    type="button"
                    className={on ? 'sf-btn sf-btn--ghost' : 'sf-btn sf-btn--primary'}
                    onClick={() => toggle(country.id)}
                  >
                    {on ? 'Remove' : 'Add to opening day'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

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
          <button
            type="button"
            className="sf-btn sf-btn--primary"
            disabled={footprint.countries === 0}
            onClick={() => { handlers.onSaveFootprint?.(draft.selectedCountryIds); setFootprintOpen(false); }}
          >
            Save opening footprint
          </button>
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
          Nothing here is charged. {money(footprint.rights + footprint.compliance)} becomes
          due only when you file for market entry.
        </p>
      </Sheet>

      <Sheet
        open={report !== null}
        onClose={() => setReport(null)}
        eyebrow={report ? `${report.region} · ${report.code}` : undefined}
        title={report?.name ?? ''}
        footer={report && (
          <button
            type="button"
            className={picked.has(report.id) ? 'sf-btn sf-btn--ghost' : 'sf-btn sf-btn--primary'}
            onClick={() => { toggle(report.id); setReport(null); }}
          >
            {picked.has(report.id) ? 'Remove from opening day' : 'Add to opening day'}
          </button>
        )}
      >
        {report && <CountryReport country={report} />}
      </Sheet>
    </>
  );
}
