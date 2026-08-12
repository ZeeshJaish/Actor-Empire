import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import type { OwnedStreamingCycleReview, Player } from '../types';
import {
  STREAMING_PERFORMANCE_TIER_LABELS,
  STREAMING_STRATEGIC_IDENTITY_LABELS,
  acknowledgeStreamingCycleReview,
  getStreamingQuarterSeasonCycle,
} from '../services/streamingQuarterSeason';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-quarter-season.css';

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
}

const formatCompact = (value: number): string => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absolute >= 1_000_000_000) return `${sign}${(absolute / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toFixed(0)}K`;
  return `${sign}${Math.round(absolute).toLocaleString()}`;
};

const formatMoney = (value: number): string => `${value < 0 ? '−' : ''}$${formatCompact(Math.abs(value))}`;

const technicalLabel: Record<OwnedStreamingCycleReview['technicalVerdict'], string> = {
  RESILIENT: 'Resilient',
  HEALTHY: 'Healthy',
  WATCH_LOAD: 'Watch the load',
  AT_RISK: 'At risk',
};

function AudiencePulse({ reviews }: { reviews: ReturnType<typeof getStreamingQuarterSeasonCycle>['audiencePulse'] }) {
  const maximum = Math.max(1, ...reviews.map(item => Math.abs(item.netSubscriberMovement)));
  return (
    <div className="sqc-pulse-chart" role="img" aria-label="Net subscriber movement over the latest twelve streaming weeks">
      <span className="sqc-pulse-zero" aria-hidden="true" />
      {reviews.map((snapshot, index) => {
        const positive = snapshot.netSubscriberMovement >= 0;
        const height = 8 + Math.abs(snapshot.netSubscriberMovement) / maximum * 38;
        return (
          <span
            key={snapshot.id}
            className={`sqc-pulse-bar ${positive ? 'is-positive' : 'is-negative'}`}
            style={{ '--pulse-height': `${height}%` } as React.CSSProperties}
            title={`Week ${snapshot.operations?.programWeek || index + 1}: ${snapshot.netSubscriberMovement >= 0 ? '+' : ''}${snapshot.netSubscriberMovement.toLocaleString()} net members`}
          />
        );
      })}
    </div>
  );
}

function BoardReviewScene({
  review,
  onFinish,
}: {
  review: OwnedStreamingCycleReview;
  onFinish: (status: 'VIEWED' | 'DISMISSED') => void;
}) {
  const [chapter, setChapter] = useState(0);
  return (
    <AccessibleDialog
      className="sqc-board-backdrop"
      role="dialog"
      aria-labelledby="sqc-board-title"
      onEscape={() => onFinish('DISMISSED')}
    >
      <div className="sqc-board-scene">
        <div className="sqc-board-light" aria-hidden="true" />
        <div className="sqc-board-silhouettes" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <button type="button" className="sqc-board-close" onClick={() => onFinish('DISMISSED')} aria-label="Skip board review"><X size={20} /></button>
        <div className="sqc-board-screen">
          <div className="sqc-board-progress" aria-label={`Board review chapter ${chapter + 1} of 3`}>
            {[0, 1, 2].map(item => <span key={item} className={item <= chapter ? 'is-active' : ''} />)}
          </div>

          {chapter === 0 ? (
            <div className="sqc-board-chapter is-opening">
              <span className="sqc-board-kicker">SEASON {review.cycleNumber} • BOARD SESSION</span>
              <div className="sqc-board-seal"><Sparkles size={31} /></div>
              <h1 id="sqc-board-title">{review.headline}</h1>
              <p>{review.boardVerdict}</p>
              <div className="sqc-board-score">
                <div><span>STRATEGIC IDENTITY</span><strong>{STREAMING_STRATEGIC_IDENTITY_LABELS[review.strategicIdentity]}</strong></div>
                <div><span>PERFORMANCE</span><strong>{STREAMING_PERFORMANCE_TIER_LABELS[review.performanceTier]}</strong></div>
              </div>
            </div>
          ) : null}

          {chapter === 1 ? (
            <div className="sqc-board-chapter">
              <span className="sqc-board-kicker">WHAT THE QUARTER PROVED</span>
              <h1 id="sqc-board-title">The wins were real. So were the warnings.</h1>
              <div className="sqc-board-columns">
                <section>
                  <span><Trophy size={17} /> BOARD WINS</span>
                  {review.hits.map(hit => <p key={hit}><Check size={15} />{hit}</p>)}
                </section>
                <section className="is-risk">
                  <span><Activity size={17} /> OPEN RISKS</span>
                  {review.misses.map(miss => <p key={miss}><ArrowRight size={15} />{miss}</p>)}
                </section>
              </div>
            </div>
          ) : null}

          {chapter === 2 ? (
            <div className="sqc-board-chapter">
              <span className="sqc-board-kicker">THE NEXT MANDATE</span>
              <h1 id="sqc-board-title">{review.nextMandate}</h1>
              <div className="sqc-board-directives">
                <div><ShieldCheck size={20} /><span>TECHNICAL HEALTH</span><strong>{technicalLabel[review.technicalVerdict]}</strong><small>{review.averagePlaybackSuccessRate.toFixed(2)}% playback • {review.peakCapacityUtilizationPercent.toFixed(0)}% peak load</small></div>
                <div><RadioTower size={20} /><span>RIVAL SIGNAL</span><strong>{review.rivalMovement.platformName} • {review.rivalMovement.pressure}</strong><small>{review.rivalMovement.signal}</small></div>
              </div>
            </div>
          ) : null}

          <div className="sqc-board-actions">
            <button type="button" className="sqc-board-skip" onClick={() => onFinish('DISMISSED')}>Skip review</button>
            <button
              type="button"
              className="sqc-board-continue"
              onClick={() => chapter < 2 ? setChapter(chapter + 1) : onFinish('VIEWED')}
            >
              {chapter < 2 ? 'Continue board session' : 'Enter the next season'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}

export default function StreamingQuarterSeasonCycle({ player, onUpdatePlayer }: Props) {
  const cycle = useMemo(() => getStreamingQuarterSeasonCycle(player), [player]);
  const [boardReviewId, setBoardReviewId] = useState<string | null>(cycle.pendingBoardReview?.id || null);
  const boardReview = player.ownedStreamingPlatform.cycleReviews.find(review => review.id === boardReviewId) || null;

  useEffect(() => {
    if (cycle.pendingBoardReview?.id) setBoardReviewId(cycle.pendingBoardReview.id);
  }, [cycle.pendingBoardReview?.id]);

  const persistReviewStatus = (review: OwnedStreamingCycleReview, status: 'VIEWED' | 'DISMISSED') => {
    let nextPlayer = acknowledgeStreamingCycleReview(player, review.id);
    if (cycle.pendingBoardCinematicId && review.id === cycle.pendingBoardReview?.id) {
      nextPlayer = {
        ...nextPlayer,
        ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
          nextPlayer.ownedStreamingPlatform,
          cycle.pendingBoardCinematicId,
          status,
        ),
      };
    }
    setBoardReviewId(null);
    onUpdatePlayer?.(nextPlayer);
  };

  const latestReview = cycle.latestReview;
  const pulse = cycle.audiencePulse;
  const lastFourBeats = cycle.progressBeats.slice(-4).reverse();
  const hasJustCompletedSeason = latestReview?.kind === 'TWELVE_WEEK_REVIEW'
    && latestReview.endAbsoluteWeek === pulse.at(-1)?.absoluteWeek;

  return (
    <>
      <section className="sqc-room" aria-labelledby="sqc-title">
        <div className="sqc-room-glow" aria-hidden="true" />
        <header className="sqc-hero">
          <div>
            <span className="sqc-kicker">PHASE 11 • QUARTER & SEASON CYCLE</span>
            <h2 id="sqc-title">Turn weeks into a company story.</h2>
            <p>Every four operating weeks creates a progress beat. Every twelve brings the board into the room.</p>
          </div>
          <div className="sqc-season-dial" aria-label={`Season ${cycle.seasonNumber}, week ${cycle.weekInSeason} of 12`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="51" />
              <circle
                className="is-progress"
                cx="60"
                cy="60"
                r="51"
                pathLength="100"
                strokeDasharray={`${cycle.weekInSeason / 12 * 100} 100`}
              />
            </svg>
            <span><small>SEASON {cycle.seasonNumber}</small><strong>{cycle.weekInSeason}</strong><em>/ 12</em></span>
          </div>
        </header>

        <div className="sqc-season-track" aria-label="Twelve-week season track">
          {Array.from({ length: 12 }, (_, index) => {
            const week = index + 1;
            return (
              <span
                key={week}
                className={`${week <= cycle.weekInSeason ? 'is-complete' : ''} ${week % 4 === 0 ? 'is-beat' : ''}`}
                title={week % 4 === 0 ? `Week ${week} progress beat` : `Week ${week}`}
              >
                {week % 4 === 0 ? <Target size={12} /> : week}
              </span>
            );
          })}
        </div>

        <div className="sqc-signal-grid">
          <article className="sqc-audience-panel">
            <div className="sqc-panel-heading">
              <div><span>AUDIENCE PULSE</span><strong>{pulse.length ? `${pulse.length}-week signal` : 'Awaiting first week'}</strong></div>
              <BarChart3 size={20} />
            </div>
            {pulse.length ? <AudiencePulse reviews={pulse} /> : <div className="sqc-empty-pulse"><Activity size={25} /> Advance a live platform week to begin the signal.</div>}
            <div className="sqc-pulse-legend"><span><i className="is-positive" /> Net growth</span><span><i className="is-negative" /> Net decline</span></div>
          </article>

          <article className="sqc-checkpoint-panel">
            <span className="sqc-panel-icon"><Target size={22} /></span>
            <span>NEXT COMPANY BEAT</span>
            <strong>{hasJustCompletedSeason ? 'Season review delivered' : `${cycle.weeksUntilProgressBeat} week${cycle.weeksUntilProgressBeat === 1 ? '' : 's'}`}</strong>
            <p>{hasJustCompletedSeason
              ? 'The board verdict is now part of the permanent company record.'
              : `The next four-week read will close before the Season ${cycle.seasonNumber} board session.`}</p>
          </article>
        </div>

        {latestReview ? (
          <article className={`sqc-latest-review is-${latestReview.performanceTier.toLowerCase()}`}>
            <div className="sqc-review-ribbon">
              <span>{latestReview.kind === 'TWELVE_WEEK_REVIEW' ? `SEASON ${latestReview.cycleNumber} REVIEW` : `PROGRESS BEAT ${latestReview.cycleNumber}`}</span>
              <strong>{STREAMING_PERFORMANCE_TIER_LABELS[latestReview.performanceTier]}</strong>
            </div>
            <div className="sqc-review-headline">
              <span className="sqc-review-mark">{latestReview.kind === 'TWELVE_WEEK_REVIEW' ? <Trophy size={24} /> : <Activity size={24} />}</span>
              <div>
                <span>{STREAMING_STRATEGIC_IDENTITY_LABELS[latestReview.strategicIdentity]}</span>
                <h3>{latestReview.headline}</h3>
                <p>{latestReview.boardVerdict}</p>
              </div>
            </div>
            <div className="sqc-review-metrics">
              <div><UsersRound size={17} /><span>Net members</span><strong className={latestReview.subscriberNetMovement >= 0 ? 'is-positive' : 'is-negative'}>{latestReview.subscriberNetMovement >= 0 ? '+' : ''}{formatCompact(latestReview.subscriberNetMovement)}</strong></div>
              <div><Cpu size={17} /><span>Playback</span><strong>{latestReview.averagePlaybackSuccessRate.toFixed(2)}%</strong></div>
              <div><CircleDollarSign size={17} /><span>Cash contribution</span><strong className={latestReview.totalCashContribution >= 0 ? 'is-positive' : 'is-negative'}>{formatMoney(latestReview.totalCashContribution)}</strong></div>
            </div>
            <div className="sqc-review-footer">
              <span><RadioTower size={15} /> {latestReview.rivalMovement.platformName} • {latestReview.rivalMovement.pressure.toLowerCase()} pressure</span>
              {latestReview.kind === 'TWELVE_WEEK_REVIEW' ? (
                <button type="button" onClick={() => setBoardReviewId(latestReview.id)}><Play size={15} /> Replay board session</button>
              ) : latestReview.acknowledgedAtAbsoluteWeek === null ? (
                <button type="button" onClick={() => onUpdatePlayer?.(acknowledgeStreamingCycleReview(player, latestReview.id))}><Check size={15} /> Mark brief reviewed</button>
              ) : <span className="sqc-reviewed"><Check size={14} /> Reviewed</span>}
            </div>
          </article>
        ) : (
          <article className="sqc-first-cycle">
            <span><Activity size={24} /></span>
            <div><strong>The first company rhythm is forming.</strong><p>{cycle.weeksUntilProgressBeat} operating week{cycle.weeksUntilProgressBeat === 1 ? '' : 's'} until the first committed progress beat.</p></div>
          </article>
        )}

        {lastFourBeats.length ? (
          <div className="sqc-archive">
            <div className="sqc-archive-heading"><span>FOUR-WEEK RECORD</span><small>Committed facts • not title-level analytics</small></div>
            <div className="sqc-beat-list">
              {lastFourBeats.map(review => (
                <article key={review.id}>
                  <span>BEAT {review.cycleNumber}</span>
                  <strong>{STREAMING_STRATEGIC_IDENTITY_LABELS[review.strategicIdentity]}</strong>
                  <small>{review.subscriberNetMovement >= 0 ? '+' : ''}{formatCompact(review.subscriberNetMovement)} members • {technicalLabel[review.technicalVerdict]}</small>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {boardReview ? (
        <BoardReviewScene review={boardReview} onFinish={status => persistReviewStatus(boardReview, status)} />
      ) : null}
    </>
  );
}
