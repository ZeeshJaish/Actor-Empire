/**
 * CAMPAIGNS (#134; plan §20.8): what your promotion did. A season scoreboard of the last 12 weeks (spent, joins from
 * campaigns, cost per join, the best campaign), the campaigns locked in for next week, and every finished campaign
 * as a results card the way ad managers report one: viewers added, joins, cost per join, the artwork that won its
 * test, and a grade against your other campaigns. The algorithm's current objective is one line; a new campaign
 * starts from the room's pinned bar (the War Room).
 * #136: when no campaign brings joins (an ad-supported service, or none yet) the season and the cards read viewers
 * added and the cost per thousand of them instead of joins; the season's best is one of its own 12 weeks.
 * Before: finished campaigns read DRAFT · NOT STARTED with a made-up "estimated reach", and the recommendation
 * engine was four cards that only opened the War Room.
 * U13 (2026-11-15): the #144 first-look card (the campaign scenes prototype, the Burj Khalifa and a billboard) is
 * gone: players got stuck scrolling on it, and it loaded two full-size photos whenever the tab opened. The scenes
 * live in the campaign studio itself.
 */
import React from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { Poster } from '../../content-market-exact/Poster';
import { compact } from './audienceAtlasModel';
import type { AudienceCampaignRow, AudienceCampaignsView } from './audienceRoomModel';
import { gameYearWeekShort } from '../../services/gameWeek';
import type { CreativeSubject } from '../campaigns/scenes/defaultCreative';

const money = (value: number) => `$${compact(value)}`;
const GRADE_WORDS: Record<NonNullable<AudienceCampaignRow['grade']>, string> = {
  S: 'Best value', A: 'Strong', B: 'Fair', C: 'Costly',
};

export const AudienceCampaignsTab: React.FC<{
  campaigns: AudienceCampaignsView;
  week: number | null;
  onOpenTitle?: (projectId: string) => void;
  /** #144: what the scenes' made-for-you creative shows: your top title and your service */
  scenesSubject?: CreativeSubject | null;
}> = ({ campaigns, week, onOpenTitle }) => {
  const { running, done } = campaigns;
  /* #136: joins are the measure once campaigns bring them; otherwise (an ad-supported service, or no joins yet) the
     viewers added and the cost per thousand of them, never a row of zeros and dashes */
  const byJoin = campaigns.gradeBasis === 'JOIN';
  const poster = (row: AudienceCampaignRow) => (
    <span className={r.cPoster}><Poster id={row.projectId} title={row.title} genre={row.genre} hue={row.hue} size="xs" bare /></span>
  );
  return (
    <div className={r.room}>
      {/* ── the season so far ── */}
      <section className={cx(r.card, r.season, r.rise)}>
        <div className={r.eyebrow}>LAST 12 WEEKS · CAMPAIGNS</div>
        <div className={r.seasonNums}>
          <div><b>{money(campaigns.spent)}</b><span>SPENT</span></div>
          {byJoin ? (
            <>
              <div><b className={campaigns.joins > 0 ? r.up : ''}>{campaigns.joins > 0 ? `+${compact(campaigns.joins)}` : '0'}</b><span>JOINS</span></div>
              <div><b>{campaigns.costPerJoin !== null ? `$${campaigns.costPerJoin.toLocaleString()}` : '—'}</b><span>PER JOIN</span></div>
            </>
          ) : (
            <>
              <div><b className={campaigns.viewers > 0 ? r.up : ''}>{campaigns.viewers > 0 ? `+${compact(campaigns.viewers)}` : '0'}</b><span>VIEWERS</span></div>
              <div><b>{campaigns.costPerThousand !== null ? money(campaigns.costPerThousand) : '—'}</b><span>PER 1K</span></div>
            </>
          )}
        </div>
        {campaigns.best && (
          <div className={r.seasonBest}>
            <i aria-hidden="true">★</i>
            <span>Best: <b>{campaigns.best.title}</b> · {(campaigns.best.joins ?? 0) > 0
              ? `+${compact(campaigns.best.joins ?? 0)} joins${campaigns.best.costPerJoin !== null ? ` at $${campaigns.best.costPerJoin.toLocaleString()} each` : ''}`
              : `+${compact(campaigns.best.viewers ?? 0)} viewers for ${money(campaigns.best.spend)}`}</span>
          </div>
        )}
      </section>

      {/* ── locked in for the coming week ── */}
      {running.length > 0 && (
        <>
          <div className={r.sh}><h2>Locked in</h2><span>{running.length} running</span></div>
          {running.map((row, index) => {
            const weeksLeft = week === null ? null : Math.max(0, row.resultsWeek - week);
            return (
              <button key={row.id} type="button" className={cx(r.camp, r.campLive, r.rise)} style={{ ['--i' as string]: index }} onClick={onOpenTitle ? () => onOpenTitle(row.projectId) : undefined}>
                {poster(row)}
                <span className={r.campBody}>
                  <span className={r.campTop}><b>{row.title}</b><em className={r.campBadge}><i className={r.live} aria-hidden="true" />{weeksLeft === null || weeksLeft <= 1 ? 'RESULTS NEXT WEEK' : `RESULTS IN ${weeksLeft} WEEKS`}</em></span>
                  <span className={r.campChips}>{row.channels.map(channel => <i key={channel}>{channel}</i>)}</span>
                  <span className={r.campFoot}><span>{money(row.spend)}</span><span>Objective: {row.objective}</span></span>
                </span>
              </button>
            );
          })}
        </>
      )}

      {/* ── finished: the results ── */}
      <div className={r.sh}><h2>Results</h2><span>{done.length ? `graded by cost per ${campaigns.gradeBasis === 'JOIN' ? 'join' : '1K viewers'}` : 'none yet'}</span></div>
      {done.length > 0 ? done.map((row, index) => (
        <button key={row.id} type="button" className={cx(r.camp, r.rise)} style={{ ['--i' as string]: index + running.length }} onClick={onOpenTitle ? () => onOpenTitle(row.projectId) : undefined}>
          {poster(row)}
          <span className={r.campBody}>
            <span className={r.campTop}>
              <b>{row.title}</b>
              {row.grade && <em className={cx(r.grade, r[`grade${row.grade}`])} title={GRADE_WORDS[row.grade]}>{row.grade}</em>}
            </span>
            <span className={r.campChips}>{row.channels.map(channel => <i key={channel}>{channel}</i>)}<i className={r.campWeek}>{gameYearWeekShort(row.resultsWeek)}</i></span>
            <span className={r.campStats}>
              <span><b className={r.up}>+{compact(row.viewers ?? 0)}</b><small>VIEWERS</small></span>
              {byJoin ? (
                <>
                  <span><b>{row.joins ? `+${compact(row.joins)}` : row.joins === 0 ? '0' : '—'}</b><small>JOINS</small></span>
                  <span><b>{row.costPerJoin !== null ? `$${row.costPerJoin.toLocaleString()}` : '—'}</b><small>PER JOIN</small></span>
                </>
              ) : (
                <span><b>{row.costPerThousand !== null ? money(row.costPerThousand) : '—'}</b><small>PER 1K</small></span>
              )}
              <span><b>{money(row.spend)}</b><small>SPENT</small></span>
            </span>
            {row.artwork && (
              <span className={r.campArt}><i aria-hidden="true">A/B</i>{row.artwork} won{row.artworkLift !== null ? ` · +${Math.round(row.artworkLift)}% lift` : ''}</span>
            )}
          </span>
        </button>
      )) : (
        <div className={r.pending}><b>No campaign has finished yet</b><span>Start one from the bar below: pick a title, its channels and what the algorithm pushes.</span></div>
      )}

      <div className={cx(r.algo, r.rise)}>
        <span>ALGORITHM</span>
        <b>{campaigns.objective}</b>
        <small>set when you start a campaign</small>
      </div>
    </div>
  );
};
