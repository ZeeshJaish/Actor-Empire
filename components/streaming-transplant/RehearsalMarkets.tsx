import React, { memo, useMemo, useState } from 'react';
import type { StreamingLaunchRehearsalResult } from '../../services/streamingLaunchRehearsal';
import { streamingRehearsalPlayback } from '../../services/streamingRehearsalPresentation';
import css from './presentation/screens/Buildout/Buildout.module.css';

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
  const shown = query.trim()
    ? result.countries.filter(country => country.country.toLowerCase().includes(query.trim().toLowerCase()))
    : region ? groups.find(([id]) => id === region)?.[1].countries || [] : result.countries.slice(0, 3);
  return <section className={css.marketBrowser} aria-label="Rehearsal markets">
    <p className={css.rhsub}>Markets at peak<em>{result.countries.length} total</em></p>
    <p className={css.marketHint}>Highest risk first for this scenario. Select a market to inspect its stream.</p>
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
