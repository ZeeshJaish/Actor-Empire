import React, { memo, useMemo, useState } from 'react';
import type { StreamingLaunchRehearsalResult } from '../../services/streamingLaunchRehearsal';
import { streamingRehearsalPlayback } from '../../services/streamingRehearsalPresentation';
import css from './presentation/screens/Buildout/Buildout.module.css';

/** #98: the viewer check on every market at once (Zeesh: "entire country, har jagah open market … select kar sakoon") */
export const REHEARSAL_ALL_MARKETS = 'ALL';

/** One bounded market browser, shared by the preview and the settled result. */
export const RehearsalMarkets = memo(function RehearsalMarkets({ result, selected, onSelect }: {
  result: StreamingLaunchRehearsalResult; selected?: string; onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; countries: typeof result.countries }>();
    for (const country of result.countries) {
      const group = map.get(country.regionId) || { name: country.regionLabel, countries: [] };
      group.countries.push(country); map.set(country.regionId, group);
    }
    const order = ['NORTH_AMERICA','SOUTH_AMERICA','EUROPE','AFRICA','ASIA','OCEANIA'];
    return [...map.entries()].sort(([a],[b]) => order.indexOf(a) - order.indexOf(b));
  }, [result]);
  const affectedAll = result.countries.filter(country => streamingRehearsalPlayback(country) !== 'PLAYING').length;
  const shown = query.trim()
    ? result.countries.filter(country => country.country.toLowerCase().includes(query.trim().toLowerCase()))
    : region ? groups.find(([id]) => id === region)?.[1].countries || [] : result.countries.slice(0, 3);
  return <section className={css.marketBrowser} aria-label="Rehearsal markets">
    <p className={css.rhsub}>Markets at peak<em>{result.countries.length} total</em></p>
    <p className={css.marketHint}>Watch every market at once, or pick one to inspect its stream.</p>
    <button type="button" className={css.marketAll} aria-pressed={selected === REHEARSAL_ALL_MARKETS}
      onClick={() => { setRegion(null); setQuery(''); onSelect(REHEARSAL_ALL_MARKETS); }}>
      <i aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-4.2 4.8-4.2 13.2 0 18M12 3c4.2 4.8 4.2 13.2 0 18" />
        </svg>
      </i>
      <span><b>All markets</b><small>{result.countries.length} markets in {groups.length} regions, watched together</small></span>
      <em className={affectedAll ? css.warn : css.good}>{affectedAll ? `${affectedAll} need attention` : 'All playing'}</em>
    </button>
    <div className={css.marketRegions}>{groups.map(([id, group]) => {
      const affected = group.countries.filter(country => streamingRehearsalPlayback(country) !== 'PLAYING').length;
      return <button type="button" key={id} aria-pressed={region === id} onClick={() => { setRegion(region === id ? null : id); setQuery(''); }}><b>{group.name}</b><span>{affected ? `${affected} need attention` : 'All playing'} · {group.countries.length}</span></button>;
    })}</div>
    <input className={css.marketSearch} type="search" aria-label="Search rehearsal countries" placeholder="Find a country" value={query} onChange={event => setQuery(event.target.value)}/>
    <div className={css.marketRows}>
      {shown.map(country => {
        const state = streamingRehearsalPlayback(country);
        return <button type="button" key={country.marketId} aria-pressed={selected === country.marketId} onClick={() => onSelect(country.marketId)}>
          <span><b>{country.country}</b><small>{country.outageResistance === 'UNSERVED' ? 'No eligible delivery route' : country.failedPercent > 0 ? `${country.failedPercent}% streams affected at peak` : `${((country.startupTimeMs || 0) / 1000).toFixed(1)}s startup · ${country.bufferingRiskPercent}% buffer risk`}</small></span>
          <em className={state === 'DOWN' ? css.bad : state === 'BUFFERING' ? css.warn : css.good}>{state === 'DOWN' ? 'Unavailable' : state === 'BUFFERING' ? 'Degraded' : 'Playing'}</em>
        </button>;
      })}
      {!shown.length && <p className={css.marketHint}>No matching countries.</p>}
    </div>
    {!region && !query && result.countries.length > 3 && <p className={css.marketHint}>Three highest-risk markets shown. Choose a region or search to inspect the rest.</p>}
  </section>;
});
