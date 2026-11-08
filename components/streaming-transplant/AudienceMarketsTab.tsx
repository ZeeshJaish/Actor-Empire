/**
 * MARKETS (#132; plan §20.8): where you win and where to grow. The room's one map, with a switch between your
 * audience and everyone's viewers, the regions as its strip (the REGIONS tab folded in), a card for the world or the
 * focused region, every market you are in as a row you can sort (biggest, growing, falling, room to grow), and the
 * best open countries to enter next, ranked by the people who stream there and the homes nobody holds yet.
 * Every figure is the world simulation's own country row (`worldCountries`), the same numbers the weekly loop uses.
 */
import React, { useMemo, useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { CountryFlagSvg } from '../studio-finance/components/FlagField';
import { AudienceAtlas } from './AudienceAtlas';
import { RegionRail } from './AudiencePanels';
import {
  AUDIENCE_WORDS,
  compact,
  formatShare,
  sharesOf,
  signedCompact,
  type AtlasCountry,
  type AtlasRegionId,
  type AtlasRegionSummary,
  type AudienceKind,
} from './audienceAtlasModel';

type View = 'YOURS' | 'EVERYONE';
type Sort = 'BIG' | 'GROWING' | 'FALLING' | 'ROOM';
const SORTS: Array<{ id: Sort; label: string }> = [
  { id: 'BIG', label: 'Biggest' }, { id: 'GROWING', label: 'Growing' }, { id: 'FALLING', label: 'Falling' }, { id: 'ROOM', label: 'Room to grow' },
];
const ROWS = 12;

const playerShareOf = (country: AtlasCountry) => sharesOf([country.view]).shares.find(item => item.id === 'PLAYER')?.share ?? 0;
/** Homes that would pay you at today's price but don't yet, or (ad-only, store) the homes nobody holds. */
const roomOf = (country: AtlasCountry, kind: AudienceKind) => (kind === 'ACCOUNTS'
  ? Math.max(0, country.view.playerDemandHouseholds - country.view.playerAccounts)
  : country.view.unclaimedHouseholds);

export const AudienceMarketsTab: React.FC<{
  live: boolean;
  kind: AudienceKind;
  accent: string;
  countries: AtlasCountry[];
  regions: AtlasRegionSummary[];
  focusRegion: AtlasRegionId | null;
  onFocus: (regionId: AtlasRegionId | null) => void;
  selectedCountryId: string | null;
  onOpenCountry: (countryId: string) => void;
  /** opens the Enter New Markets page with this country picked (after launch) */
  onEnter?: (country: AtlasCountry) => void;
}> = ({ live, kind, accent, countries, regions, focusRegion, onFocus, selectedCountryId, onOpenCountry, onEnter }) => {
  const words = AUDIENCE_WORDS[kind];
  const [view, setView] = useState<View>(live ? 'YOURS' : 'EVERYONE');
  const [sort, setSort] = useState<Sort>('BIG');
  const [showAll, setShowAll] = useState(false);
  const subscription = kind === 'ACCOUNTS';
  const shownView: View = live ? view : 'EVERYONE';

  const focus = focusRegion ? regions.find(region => region.id === focusRegion) : undefined;
  const scoped = useMemo(() => (focusRegion ? countries.filter(country => country.regionId === focusRegion) : countries), [countries, focusRegion]);
  const yours = useMemo(() => scoped.filter(country => country.state !== 'AVAILABLE'), [scoped]);
  const counts = useMemo(() => ({
    live: scoped.filter(country => country.state === 'LIVE').length,
    coming: scoped.filter(country => country.state === 'OPENING' || country.state === 'PAUSED').length,
    open: scoped.filter(country => country.state === 'AVAILABLE' && country.view.activeViewers > 0).length,
    dark: scoped.filter(country => country.state === 'AVAILABLE' && country.view.activeViewers <= 0).length,
  }), [scoped]);

  /* the world's (or the focused region's) card */
  const summary = useMemo(() => {
    const audience = scoped.reduce((sum, country) => sum + country.view.playerAudience, 0);
    const net = scoped.reduce((sum, country) => sum + country.view.playerNetChange, 0);
    const revenue = scoped.reduce((sum, country) => sum + country.view.playerMonthlyRevenueTotal, 0);
    const share = sharesOf(scoped.map(country => country.view)).shares.find(item => item.id === 'PLAYER')?.share ?? 0;
    const viewers = scoped.reduce((sum, country) => sum + country.view.activeViewers, 0);
    const paying = scoped.reduce((sum, country) => sum + country.view.payingHouseholds, 0);
    return { audience, net, revenue, share, viewers, paying };
  }, [scoped]);

  const rows = useMemo(() => {
    const list = [...yours];
    const by: Record<Sort, (left: AtlasCountry, right: AtlasCountry) => number> = {
      BIG: (left, right) => right.view.playerAudience - left.view.playerAudience,
      GROWING: (left, right) => right.view.playerNetChange - left.view.playerNetChange,
      FALLING: (left, right) => left.view.playerNetChange - right.view.playerNetChange,
      ROOM: (left, right) => roomOf(right, kind) - roomOf(left, kind),
    };
    return list.sort((left, right) => by[sort](left, right) || right.view.activeViewers - left.view.activeViewers || left.name.localeCompare(right.name));
  }, [yours, sort, kind]);
  const maxAudience = Math.max(1, ...yours.map(country => country.view.playerAudience));

  /* the best open ground: people streaming there × the share of homes nobody holds */
  /* a Streaming+ country the player cannot enter is never a "best next market" */
  const best = useMemo(() => scoped
    .filter(country => country.state === 'AVAILABLE' && !country.streamingPlus && country.view.activeViewers > 0)
    .map(country => {
      const shares = sharesOf([country.view]);
      const leader = shares.shares.find(item => item.id !== 'PLAYER') ?? null;
      return { country, unclaimed: shares.unclaimedShare, leader, score: country.view.activeViewers * (shares.unclaimedShare / 100 + .1) };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4), [scoped]);

  /* #138: WHO LEADS names its colours. Each service by the countries it leads (most paying homes), in the focused
     region or the world; the first five, then the rest together. */
  const leaders = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; color: string; count: number }>();
    scoped.forEach(country => {
      const leader = country.view.platformHouseholds[0];
      if (!leader) return;
      const entry = byId.get(leader.id) ?? { id: leader.id, name: leader.name, color: leader.id === 'PLAYER' ? accent : leader.color, count: 0 };
      entry.count += 1;
      byId.set(leader.id, entry);
    });
    const ranked = [...byId.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
    const mine = ranked.find(row => row.id === 'PLAYER');
    const top = ranked.slice(0, 5);
    if (mine && !top.includes(mine)) top[top.length - 1] = mine;
    const rest = ranked.filter(row => !top.includes(row)).reduce((sum, row) => sum + row.count, 0);
    return { top, rest };
  }, [accent, scoped]);

  const reading = shownView === 'YOURS'
    ? { value: compact(summary.audience), caption: `${words.plural} · ${counts.live} ${counts.live === 1 ? 'country' : 'countries'} live` }
    : { value: compact(summary.viewers), caption: focus ? `${focus.label} · people watching` : 'people watching streaming' };
  const aside = shownView === 'YOURS'
    ? (subscription ? { value: signedCompact(summary.net), caption: 'this week', tone: summary.net > 0 ? 'good' as const : summary.net < 0 ? 'bad' as const : undefined } : { value: `$${compact(summary.revenue)}`, caption: 'a month' })
    : { value: compact(summary.paying), caption: 'paying homes' };

  return (
    <div className={r.room}>
      {/* ── the one map ── */}
      <div className={cx(r.seg, r.rise)} role="tablist" aria-label="Map shows">
        <button type="button" role="tab" aria-selected={shownView === 'YOURS'} className={shownView === 'YOURS' ? r.on : ''} disabled={!live} onClick={() => setView('YOURS')}>
          <b>YOURS</b><small>{live ? words.plural : 'after launch'}</small>
        </button>
        <button type="button" role="tab" aria-selected={shownView === 'EVERYONE'} className={shownView === 'EVERYONE' ? r.on : ''} onClick={() => setView('EVERYONE')}>
          <b>WHO LEADS</b><small>most paying homes</small>
        </button>
      </div>
      <div className={r.mapWrap}>
        <AudienceAtlas
          mode={shownView === 'YOURS' ? 'PLATFORM' : 'MARKET'}
          countries={countries}
          regions={regions}
          accent={accent}
          focusRegion={focusRegion}
          selectedCountryId={selectedCountryId}
          onFocusRegion={onFocus}
          onSelectCountry={onOpenCountry}
          reading={reading}
          aside={aside}
          gauge={shownView === 'YOURS' ? counts.live / Math.max(1, scoped.length) : undefined}
        />
        {shownView === 'EVERYONE' && leaders.top.length > 0 && (
          <div className={r.leaders} aria-label="Who leads where">
            {leaders.top.map(row => (
              <span key={row.id} className={row.id === 'PLAYER' ? r.leaderMine : ''}>
                <i style={{ background: row.color }} aria-hidden="true" />{row.id === 'PLAYER' ? 'You' : row.name}<b>{row.count}</b>
              </span>
            ))}
            {leaders.rest > 0 && <span className={r.leaderRest}>Others<b>{leaders.rest}</b></span>}
          </div>
        )}
        <RegionRail regions={regions} focus={focusRegion} onFocus={onFocus}
          valueOf={region => (shownView === 'YOURS' ? region.playerAudience : region.activeViewers)}
          worldValue={shownView === 'YOURS' ? countries.reduce((sum, country) => sum + country.view.playerAudience, 0) : countries.reduce((sum, country) => sum + country.view.activeViewers, 0)} />
      </div>

      {/* ── the world, or the focused region, as a territory card ── */}
      <section className={cx(r.card, r.terr, r.rise)} style={{ ['--i' as string]: 1 }}>
        <div className={r.terrTop}>
          <div>
            <small>{focus ? 'REGION' : 'THE WORLD'}</small>
            <h3>{focus ? focus.label : 'Every market'}</h3>
          </div>
          <div className={r.conquest} style={{ ['--p' as string]: `${counts.live / Math.max(1, scoped.length) * 100}%` }} aria-label={`${counts.live} of ${scoped.length} countries live`}>
            <b>{counts.live}</b><span>/ {scoped.length}</span><i>LIVE</i>
          </div>
          {focus && <button type="button" className={r.terrBack} onClick={() => onFocus(null)}>ALL</button>}
        </div>
        {live ? (
          <div className={r.terrNums}>
            <div><span>{words.header}</span><b>{compact(summary.audience)}</b></div>
            <div><span>HOME SHARE</span><b>{formatShare(summary.share)}</b></div>
            {subscription
              ? <div><span>THIS WEEK</span><b className={summary.net > 0 ? r.up : summary.net < 0 ? r.down : ''}>{signedCompact(summary.net)}</b></div>
              : <div><span>VIEWERS</span><b>{compact(summary.viewers)}</b></div>}
            <div><span>REVENUE / MO</span><b>${compact(summary.revenue)}</b></div>
          </div>
        ) : (
          <div className={r.terrNums}>
            <div><span>PEOPLE WATCHING</span><b>{compact(summary.viewers)}</b></div>
            <div><span>PAYING HOMES</span><b>{compact(summary.paying)}</b></div>
          </div>
        )}
        <div className={r.statusChips}>
          <span style={{ ['--st' as string]: '#4ade80' }}><i />Live <b>{counts.live}</b></span>
          <span style={{ ['--st' as string]: '#f5b544' }}><i />On its way <b>{counts.coming}</b></span>
          <span style={{ ['--st' as string]: 'var(--epx-ad-c)' }}><i />Open, with viewers <b>{counts.open}</b></span>
          <span style={{ ['--st' as string]: '#5b6474' }}><i />Not streaming yet <b>{counts.dark}</b></span>
        </div>
      </section>

      {/* ── your markets ── */}
      <div className={r.sh}><h2>Your markets</h2><span>{yours.length} {focus ? `in ${focus.label}` : 'countries'}</span></div>
      {yours.length > 0 ? (
        <>
          <div className={r.sortChips} role="group" aria-label="Sort markets">
            {SORTS.filter(item => subscription || (item.id !== 'GROWING' && item.id !== 'FALLING')).map(item => (
              <button key={item.id} type="button" aria-pressed={sort === item.id} className={sort === item.id ? r.on : ''} onClick={() => setSort(item.id)}>{item.label}</button>
            ))}
          </div>
          <div className={r.mlist}>
            {(showAll ? rows : rows.slice(0, ROWS)).map((country, index) => {
              const share = playerShareOf(country);
              const net = country.view.playerNetChange;
              const room = roomOf(country, kind);
              const coming = country.state !== 'LIVE';
              return (
                <button key={country.id} type="button" className={cx(r.mrow, r.rise)} style={{ ['--i' as string]: Math.min(index, 8) }} onClick={() => onOpenCountry(country.id)}>
                  <span className={r.mflag}><CountryFlagSvg code={country.id} fit="stretch" /></span>
                  <span className={r.mname}>
                    <b>{country.name}</b>
                    <small>
                      {coming
                        ? (country.state === 'PAUSED' ? 'paused' : country.progress !== null ? `on its way · ${country.progress}%` : 'on its way')
                        : sort === 'ROOM'
                          ? `room for ${compact(room)} more ${subscription ? 'homes' : 'open homes'}`
                          : `${formatShare(share)} of homes · $${compact(country.view.playerMonthlyRevenueTotal)}/mo`}
                    </small>
                    <i className={r.mbar}><em style={{ width: `${Math.max(2, country.view.playerAudience / maxAudience * 100)}%` }} /></i>
                  </span>
                  <span className={r.mval}>
                    <b>{coming && country.view.playerAudience <= 0 ? '—' : compact(country.view.playerAudience)}</b>
                    {subscription && !coming && <em className={net > 0 ? r.up : net < 0 ? r.down : ''}>{net > 0 ? '▲' : net < 0 ? '▼' : '='} {compact(Math.abs(net))}</em>}
                  </span>
                </button>
              );
            })}
          </div>
          {rows.length > ROWS && !showAll && <button type="button" className={r.more} onClick={() => setShowAll(true)}>Show all {rows.length}</button>}
        </>
      ) : (
        <div className={r.pending}><b>No markets {focus ? `in ${focus.label} ` : ''}yet</b><span>Pick a country below, or tap one on the map to read its card.</span></div>
      )}

      {/* ── where to grow next ── */}
      {best.length > 0 && (
        <>
          <div className={r.sh}><h2>Best next markets</h2><span>open, with viewers</span></div>
          <div className={r.opps}>
            {best.map(({ country, unclaimed, leader }, index) => (
              <div key={country.id} className={cx(r.opp, r.rise)} style={{ ['--i' as string]: index }}>
                <button type="button" className={r.oppMain} onClick={() => onOpenCountry(country.id)}>
                  <span className={r.mflag}><CountryFlagSvg code={country.id} fit="stretch" /></span>
                  <span className={r.mname}>
                    <b>{country.name}</b>
                    <small>{compact(country.view.activeViewers)} watching · {Math.round(unclaimed)}% pay nobody</small>
                    {leader && <small className={r.oppLeader}><i style={{ background: leader.color }} />{leader.name} leads with {formatShare(leader.share)}</small>}
                  </span>
                </button>
                {live && onEnter && <button type="button" className={r.oppGo} onClick={() => onEnter(country)}>Enter</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
