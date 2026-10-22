/* ============================================================================
   PLATFORM · NETWORK — where the service is delivered from, how far it
   reaches, and how hard it is working.

     MAP          markets washed by how well they are served, each room's
                  field, each site (NetworkMap)
     GAUGES       peak load against capacity, the audience served to the
                  standard, the network's weekly running cost
     REVISION     a network change under construction, when there is one
     NEEDS WORK   the thin and dark markets, by name
     SITES        every site: role, racks, reach, latency
     CHANGE       the door to the Build map

   Load is one network-wide figure from the weekly loop. There is no per-city
   load model, so the old page's identical load bar on every city is gone.
   ========================================================================== */

import React, { useState } from 'react';

/* how many of each list the page shows before "show all" */
const MARKETS_SHOWN = 10;
const SITES_SHOWN = 8;
import css from './presentation/screens/NetworkDesk/PlatformNetwork.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import { NetworkMap } from './NetworkMap';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';
import type { NetworkState } from './StreamingNetworkExperience';

const money = (value: number) => `$${compact(Math.max(0, Math.round(value)))}`;

export const PlatformNetwork: React.FC<{
  accent: string;
  map: StreamingNetworkMapView;
  state: NetworkState;
  onChangeNetwork?: () => void;
}> = ({ accent, map, state, onChangeNetwork }) => {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [allMarkets, setAllMarkets] = useState(false);
  const [allSites, setAllSites] = useState(false);
  const cityById = new Map<string, NetworkState['cities'][number]>(state.cities.map(city => [city.id.toUpperCase(), city]));
  /* unreached first, then thin; biggest audiences first within each */
  const needsWork = map.markets.filter(market => market.state !== 'SERVED')
    .sort((left, right) => (left.state === right.state ? right.audience - left.audience : left.state === 'DARK' ? -1 : 1));
  const loadTone = state.peakLoad >= 85 ? css.bad : state.peakLoad >= 70 ? css.warn : css.good;

  if (!map.built) {
    return (
      <div className={css.network} style={{ ['--net-accent' as string]: accent }}>
        <div className={css.empty}>
          <b>No network yet</b>
          <span>Place your first server rooms on the Build map. They decide which markets you can serve.</span>
          {onChangeNetwork && <button type="button" className={css.primary} onClick={onChangeNetwork}>Open the Build map →</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={css.network} style={{ ['--net-accent' as string]: accent }}>
      <NetworkMap accent={accent} view={map} selectedSiteId={siteId} onSelectSite={setSiteId} />

      <div className={css.gauges}>
        <div className={css.gauge}>
          <span>PEAK LOAD</span>
          <b className={loadTone}>{state.peakLoad}%</b>
          <i className={css.bar}><em className={loadTone} style={{ width: `${Math.min(100, state.peakLoad)}%` }} /></i>
          <small>{map.capacityStreams > 0 ? `${compact(map.peakStreams)} of ${compact(map.capacityStreams)} streams at the busiest hour` : state.headroom}</small>
        </div>
        <div className={css.gauge}>
          <span>SERVED WELL</span>
          <b>{Math.round(map.served * 100)}%</b>
          <i className={css.bar}><em className={css.accentFill} style={{ width: `${Math.round(map.served * 100)}%` }} /></i>
          <small>{Math.round(map.reached * 100)}% reached at all</small>
        </div>
        <div className={css.gauge}>
          <span>RUNNING COST</span>
          <b>{money(map.weeklyOperatingCost)}</b>
          <small>a week{map.revision ? ` · revision ${map.revision}` : ''}</small>
        </div>
      </div>

      {map.pending && (
        <div className={css.pending}>
          <i aria-hidden="true" />
          <div>
            <b>Revision {map.pending.revision} under construction</b>
            <span>{map.pending.weeksLeft > 0 ? `${map.pending.weeksLeft} week${map.pending.weeksLeft === 1 ? '' : 's'} left.` : 'Ready at the next weekly settlement.'} The current network stays live until it is ready.</span>
          </div>
        </div>
      )}

      {needsWork.length > 0 && (
        <>
          <div className={css.secHead}><h2>Needs work</h2><span>{needsWork.length} market{needsWork.length === 1 ? '' : 's'}</span></div>
          <div className={css.markets}>
            {(allMarkets ? needsWork : needsWork.slice(0, MARKETS_SHOWN)).map(market => (
              <span key={market.countryId} className={cx(css.marketChip, market.state === 'DARK' ? css.dark : css.thin)}>
                <b>{market.name}</b>
                {market.state === 'DARK' ? 'not reached' : `${Math.round(market.served * 100)}% served`}
              </span>
            ))}
            {needsWork.length > MARKETS_SHOWN && (
              <button type="button" className={css.more} onClick={() => setAllMarkets(!allMarkets)}>
                {allMarkets ? 'Show fewer' : `+${needsWork.length - MARKETS_SHOWN} more`}
              </button>
            )}
          </div>
        </>
      )}

      <div className={css.secHead}><h2>Sites</h2><span>tap a site on the map to find it</span></div>
      <div className={css.sites}>
        {/* the selected site always shows, even when the list is folded */}
        {(allSites ? map.sites : map.sites.filter((site, index) => index < SITES_SHOWN || site.id === siteId)).map(site => {
          const city = cityById.get(site.id);
          return (
            <button key={site.id} type="button" className={cx(css.site, site.id === siteId && css.siteOn)}
              onClick={() => setSiteId(site.id === siteId ? null : site.id)} aria-pressed={site.id === siteId}>
              <i className={cx(css.siteDot, site.role === 'CORE ORIGIN' && css.siteCore)} aria-hidden="true" />
              <div className={css.siteMain}>
                <b>{site.name}</b>
                <span>{site.countryCode} · {site.racks} rack{site.racks === 1 ? '' : 's'}{city?.campus ? ` · ${city.campus}` : ''}</span>
              </div>
              <div className={css.siteSide}>
                <em>{site.role}</em>
                <span>{compact(Math.round(site.reachKm))} km reach{city ? ` · ${city.latencyMs} ms` : ''}</span>
              </div>
            </button>
          );
        })}
        {map.sites.length > SITES_SHOWN && (
          <button type="button" className={cx(css.more, css.moreWide)} onClick={() => setAllSites(!allSites)}>
            {allSites ? 'Show fewer sites' : `Show all ${map.sites.length} sites`}
          </button>
        )}
      </div>

      {onChangeNetwork && (
        <>
          <button type="button" className={cx(css.primary, css.wide)} onClick={onChangeNetwork}>Change the network →</button>
          <small className={css.foot}>Opens the Build map, where rooms are placed and tested.</small>
        </>
      )}
    </div>
  );
};
