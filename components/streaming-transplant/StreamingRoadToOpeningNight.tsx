import React from 'react';
import type {
  StreamingLaunchDestination,
  StreamingLaunchMilestoneStatus,
  StreamingLaunchProgramView,
} from '../../services/streamingLaunchProgram';
import css from './presentation/screens/CommandDesk/RoadToOpeningNight.module.css';
import { cx } from './presentation/cx';

const money = (value: number): string => {
  const sign = value < 0 ? '−' : '';
  const amount = Math.abs(value);
  if (amount >= 1e9) return `${sign}$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${sign}$${(amount / 1e6).toFixed(amount >= 1e8 ? 0 : 1)}M`;
  if (amount >= 1e3) return `${sign}$${Math.round(amount / 1e3)}K`;
  return `${sign}$${Math.round(amount)}`;
};

const StatusIcon: React.FC<{ status: StreamingLaunchMilestoneStatus }> = ({ status }) => {
  if (status === 'COMPLETE') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.2 3.2 7.8-8" /></svg>
  );
  if (status === 'BLOCKED') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="10" width="12" height="9" rx="2" /><path d="M9 10V7.5a3 3 0 0 1 6 0V10" /></svg>
  );
  return <span aria-hidden="true" />;
};

const BUDGET_ITEMS = [
  ['TREASURY', 'availableTreasury'],
  ['PLANNED', 'plannedSpend'],
  ['COMMITTED', 'committedSpend'],
  ['REMAINING', 'remainingAfterPlan'],
  ['SHORTFALL', 'shortfall'],
] as const;

export const StreamingRoadToOpeningNight: React.FC<{
  program: StreamingLaunchProgramView;
  onOpenDestination?: (destination: StreamingLaunchDestination) => void;
}> = ({ program, onOpenDestination }) => {
  const next = program.recommendedNextAction;
  const planningOnly = program.budget.availableTreasury <= 0;

  return (
    <main className={css.road} aria-label="Road to Opening Night">
      <section className={css.hero}>
        <div className={css.heroTop}>
          <div>
            <span className={css.eyebrow}>FOUNDING CAMPAIGN</span>
            <h2>Road to Opening Night</h2>
            <p>Define the service. Build the signal. Open the doors.</p>
          </div>
          <div
            className={css.progressRing}
            style={{ '--road-progress': `${program.progressPercent * 3.6}deg` } as React.CSSProperties}
            aria-label={`${program.progressPercent}% complete`}
          >
            <strong>{program.completedCount}</strong>
            <span>OF {program.totalCount}</span>
          </div>
        </div>

        {next && (
          <button className={css.nextMission} type="button" onClick={() => onOpenDestination?.(next.destination)}>
            <span className={css.missionIndex}>NEXT</span>
            <span className={css.missionCopy}>
              <small>{next.reason}</small>
              <strong>{next.label}</strong>
              <em>{next.description}</em>
            </span>
            <span className={css.arrow} aria-hidden="true">→</span>
          </button>
        )}
      </section>

      <section className={css.budget} aria-label="Launch budget">
        <div className={css.budgetHead}>
          <div>
            <span className={css.eyebrow}>LAUNCH BUDGET</span>
            <h3>{planningOnly ? 'Planning mode' : 'Treasury connected'}</h3>
          </div>
          <button type="button" onClick={() => onOpenDestination?.('FINANCE')}>STUDIO FINANCE <span>→</span></button>
        </div>
        <div className={css.budgetRail}>
          {BUDGET_ITEMS.map(([label, key]) => (
            <div className={cx(css.budgetItem, key === 'shortfall' && program.budget.shortfall > 0 ? css.danger : '')} key={key}>
              <span>{label}</span>
              <strong>{money(program.budget[key])}</strong>
            </div>
          ))}
        </div>
        <div className={cx(css.fundingRule, planningOnly ? css.locked : css.open)}>
          <span className={css.ruleIcon} aria-hidden="true">
            {planningOnly ? (
              <svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="9" rx="2" /><path d="M9 10V7.5a3 3 0 0 1 6 0V10" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.2 3.2 7.8-8" /></svg>
            )}
          </span>
          <p>{planningOnly
            ? 'Plan every launch decision now. Spending commitments unlock after founder capital reaches the company.'
            : `${money(program.budget.availableToCommit)} remains available for new launch commitments.`}</p>
        </div>
      </section>

      <section className={css.tracks} aria-label="Launch tracks">
        {program.tracks.map((track, trackIndex) => (
          <article className={css.track} key={track.id}>
            <header>
              <span className={css.trackNumber}>0{trackIndex + 1}</span>
              <div>
                <span className={css.eyebrow}>{track.completedCount} / {track.totalCount} COMPLETE</span>
                <h3>{track.label}</h3>
                <p>{track.question}</p>
              </div>
              <strong>{track.progressPercent}%</strong>
            </header>
            <div className={css.trackLine}><i style={{ width: `${track.progressPercent}%` }} /></div>
            <ol className={css.milestones}>
              {track.milestones.map((milestone, index) => {
                const active = milestone.status === 'ACTION_REQUIRED';
                return (
                  <li className={cx(css.milestone, css[milestone.status.toLowerCase()], active ? css.active : '')} key={milestone.id}>
                    <button type="button" onClick={() => onOpenDestination?.(milestone.destination)}>
                      <span className={css.node}><StatusIcon status={milestone.status} /></span>
                      <span className={css.stepCopy}>
                        <small>STEP {index + 1}</small>
                        <strong>{milestone.shortLabel}</strong>
                        {active && <em>{milestone.description}</em>}
                      </span>
                      <span className={css.stepState}>
                        {milestone.status === 'ACTION_REQUIRED' ? 'DO THIS' : milestone.status.replace('_', ' ')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </article>
        ))}
      </section>

      <button
        className={cx(css.finale, program.finale.complete ? css.complete : program.finale.status === 'BLOCKED' ? css.blocked : '')}
        type="button"
        onClick={() => onOpenDestination?.(program.finale.destination)}
      >
        <span className={css.signal} aria-hidden="true"><i /><i /><i /></span>
        <span>
          <small>THE FINALE</small>
          <strong>Opening Night</strong>
          <em>{program.finale.complete ? 'The platform is live.' : 'Complete both launch tracks to commit the signal.'}</em>
        </span>
        <span className={css.arrow} aria-hidden="true">→</span>
      </button>
    </main>
  );
};

export default StreamingRoadToOpeningNight;
