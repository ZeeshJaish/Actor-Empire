/**
 * TOP 10 (#135; plan §20.8), two charts since #142 (plan §20.9 F; Zeesh: "ये टॉप 10 किसका है"):
 *  - ON <SERVICE> (the default): your own service's Top 10, like the "Top 10 on Netflix" row of a real app, counted on
 *    your own hours only. "Most watched on NORTHSTAR+ this week".
 *  - ALL SERVICES: the world's chart, every title with its service's mark. "Most watched on every service this week".
 * The #1 is a hero card: its poster large, "#1 this week", its weeks at #1 and its views. Every other row draws the
 * big outlined number behind the poster, as real Top 10 rows do, the title and its service, a views bar against the
 * #1, weeks in the Top 10 and the move since last week (▲ ▼ NEW, from the stored weeks). All · Films · Series.
 * Your titles open their page; a rival's row opens to show its service, its best rank and its hours.
 */
import React, { useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { Poster } from '../../content-market-exact/Poster';
import { compact } from './audienceAtlasModel';
import { Mark, type Brand } from './StreamingBrandVisuals';
import StreamingPlatformBrand from '../StreamingPlatformBrand';
import { resolveStreamingPlatformBrandById } from '../../services/streamingPlatformBrandRegistry';
import type { AudienceChartRow, AudienceChartView } from './audienceRoomModel';
import type { StreamingChartList } from '../../services/streamingWeeklyChart';

type Chart = 'OWN' | 'ALL';
const LISTS: Array<{ id: StreamingChartList; label: string }> = [{ id: 'ALL', label: 'All' }, { id: 'FILM', label: 'Films' }, { id: 'SERIES', label: 'Series' }];
const GENRE = (genre: string) => genre.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const moveOf = (row: AudienceChartRow) => (row.move === 'UP' ? { text: `▲ ${(row.previousRank ?? 0) - row.rank}`, tone: r.up }
  : row.move === 'DOWN' ? { text: `▼ ${row.rank - (row.previousRank ?? 0)}`, tone: r.down }
    : row.move === 'NEW' ? { text: 'NEW', tone: r.isNew }
      : row.move === 'SAME' ? { text: '—', tone: '' } : null);

export const AudienceTopTenTab: React.FC<{
  chart: AudienceChartView;
  brand: Pick<Brand, 'name' | 'markId' | 'customMark'>;
  onOpenTitle?: (projectId: string) => void;
  /** Which chart opens first: your own (the default) or every service's. */
  initialChart?: Chart;
}> = ({ chart, brand, onOpenTitle, initialChart = 'OWN' }) => {
  const [which, setWhich] = useState<Chart>(initialChart);
  const [list, setList] = useState<StreamingChartList>('ALL');
  const [open, setOpen] = useState<string | null>(null);

  if (!chart.available) {
    return (
      <div className={r.room}>
        <div className={r.pending}><b>The chart appears when a week settles</b><span>Your service's most-watched films and series, and every service's, ranked by views.</span></div>
      </div>
    );
  }

  const board = which === 'OWN' ? chart.own : chart;
  const rows = board.lists[list];
  const top = rows[0];
  const mine = chart.lists.ALL.filter(row => row.mine);
  const pick = (next: Chart) => { setWhich(next); setOpen(null); };

  /* the service a row was watched on: your mark, or the rival's own */
  const service = (row: AudienceChartRow) => (which === 'OWN'
    ? <small className={r.t10Svc}>{row.kind === 'SERIES' ? 'Series' : 'Film'} · {GENRE(row.genre)}</small>
    : (
      <small className={r.t10Svc}>
        <span className={r.t10Mark} style={{ ['--pcl' as string]: row.platformColor }} aria-hidden="true">
          {row.mine ? <Mark brand={brand} /> : <StreamingPlatformBrand brand={resolveStreamingPlatformBrandById(row.platformId)} variant="MARK" size="XS" decorative />}
        </span>
        {row.platformName}{row.mine ? ' · you' : ''}
      </small>
    ));
  const press = (row: AudienceChartRow, expanded: boolean) => (row.mine && onOpenTitle ? onOpenTitle(row.id) : setOpen(expanded ? null : row.id));
  const detail = (row: AudienceChartRow) => (
    <div className={r.t10Detail}>
      <div><span>SERVICE</span><b style={{ color: row.platformColor }}>{row.platformName}</b></div>
      <div><span>IN TOP 10</span><b>{row.weeksInChart} {row.weeksInChart === 1 ? 'week' : 'weeks'}</b></div>
      <div><span>BEST RANK</span><b>#{row.bestRank}</b></div>
      <div><span>HOURS</span><b>{compact(row.hours)}</b></div>
    </div>
  );

  return (
    <div className={r.room}>
      {/* ── whose chart ── */}
      <div className={cx(r.t10Switch, r.rise)} role="tablist" aria-label="Whose Top 10">
        <button type="button" role="tab" aria-selected={which === 'OWN'} className={which === 'OWN' ? r.on : ''} onClick={() => pick('OWN')}>
          <span className={r.t10SwitchMark} aria-hidden="true"><Mark brand={brand} /></span>On {brand.name}
        </button>
        <button type="button" role="tab" aria-selected={which === 'ALL'} className={which === 'ALL' ? r.on : ''} onClick={() => pick('ALL')}>
          <span className={r.t10SwitchGlobe} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z" /></svg>
          </span>All services
        </button>
      </div>

      {/* ── what this chart is ── */}
      <section className={cx(r.card, r.t10Head, r.rise)} style={{ ['--i' as string]: 1 }}>
        <div className={r.t10Title}>
          <span className={r.t10Logo}>TOP<b>10</b></span>
          <div>
            <small>WEEK {chart.absoluteWeek} · {which === 'OWN' ? 'YOUR SERVICE' : 'EVERY SERVICE'}</small>
            <b>{which === 'OWN' ? `Most watched on ${brand.name} this week` : 'Most watched on every service this week'}</b>
          </div>
        </div>
        {which === 'ALL' && (
          <p className={r.t10Best}>{mine.length ? <>{brand.name} holds <b>{mine.length} of 10</b> · your best <b>#{mine[0].rank} {mine[0].title}</b></> : `None of ${brand.name}'s titles made it this week`}</p>
        )}
        <div className={r.sortChips} role="tablist" aria-label="Chart">
          {LISTS.map(item => (
            <button key={item.id} type="button" role="tab" aria-selected={list === item.id} className={list === item.id ? r.on : ''} onClick={() => { setList(item.id); setOpen(null); }}>{item.label}</button>
          ))}
        </div>
      </section>

      {!board.available || !top ? (
        <div className={r.pending}><b>Nothing of yours was watched this week</b><span>Your Top 10 fills as your titles are watched.</span></div>
      ) : (
        <>
          {/* ── the #1 ── */}
          {(() => {
            const expanded = open === top.id;
            const move = moveOf(top);
            return (
              <section className={cx(r.t10Hero, top.mine && r.t10Mine, r.rise)} style={{ ['--i' as string]: 2, ['--pcl' as string]: top.platformColor }} key={`${which}-${list}-hero`}>
                <button type="button" className={r.t10HeroMain} onClick={() => press(top, expanded)} aria-expanded={top.mine ? undefined : expanded}
                  aria-label={`Number 1: ${top.title}${which === 'ALL' ? ` on ${top.platformName}` : ''}, ${compact(top.views)} views`}>
                  <span className={r.t10HeroPoster}><Poster id={top.id} title={top.title} genre={top.genre} hue={top.hue} size="sm" bare /></span>
                  <span className={r.t10HeroText}>
                    <span className={r.t10HeroTag}>#1 THIS WEEK{move && <em className={cx(r.t10Move, move.tone)}>{move.text}</em>}</span>
                    <b>{top.title}</b>
                    {service(top)}
                    <span className={r.t10HeroNums}>
                      <span><b>{top.weeksAtTop}</b>{top.weeksAtTop === 1 ? 'WEEK AT #1' : 'WEEKS AT #1'}</span>
                      <span><b>{compact(top.views)}</b>VIEWS</span>
                    </span>
                  </span>
                </button>
                {expanded && detail(top)}
              </section>
            );
          })()}

          {/* ── 2 to 10 ── */}
          <ol className={r.t10List} key={`${which}-${list}`} start={2}>
            {rows.slice(1).map((row, index) => {
              const expanded = open === row.id;
              const move = moveOf(row);
              /* a row that moved slides in from last week's place; a new entry comes in from the side */
              const entrance = row.move === 'UP' ? cx(r.t10Slide, r.t10Up) : row.move === 'DOWN' ? r.t10Slide : row.move === 'NEW' ? r.t10Enter : r.rise;
              return (
                <li key={row.id} className={cx(r.t10Row, row.mine && which === 'ALL' && r.t10Mine, entrance)}
                  style={{ ['--i' as string]: index + 3, ['--pcl' as string]: row.platformColor, ['--from' as string]: (row.previousRank ?? row.rank) - row.rank }}>
                  <button type="button" className={r.t10Main} aria-expanded={row.mine ? undefined : expanded} onClick={() => press(row, expanded)}
                    aria-label={`${row.rank}. ${row.title}${which === 'ALL' ? ` on ${row.platformName}` : ''}, ${compact(row.views)} views${row.move === 'NEW' ? ', new this week' : ''}`}>
                    <span className={r.t10Art} aria-hidden="true">
                      <span className={r.t10Num}>{row.rank}</span>
                      <span className={r.t10Poster}><Poster id={row.id} title={row.title} genre={row.genre} hue={row.hue} size="xs" bare /></span>
                    </span>
                    <span className={r.t10Text}>
                      <b>{row.title}</b>
                      {service(row)}
                      <span className={r.t10Bar}><i style={{ width: `${Math.max(3, row.views / top.views * 100)}%` }} /></span>
                      <span className={r.t10Stats}>
                        <em>{compact(row.views)} views</em>
                        <em>{row.weeksInChart > 1 ? `${row.weeksInChart} wks` : '1st week'}</em>
                      </span>
                    </span>
                    {move && <span className={cx(r.t10Move, move.tone)}>{move.text}</span>}
                  </button>
                  {expanded && detail(row)}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <p className={r.bfNote}>
        Views = hours watched ÷ runtime. {which === 'OWN'
          ? `Counted on ${brand.name}'s own hours.`
          : 'Your titles count their real hours; a rival\'s titles share their service\'s real weekly hours.'}
        {!board.hasPrevious && ' Moves and weeks in the Top 10 start counting next week.'}
      </p>
    </div>
  );
};
