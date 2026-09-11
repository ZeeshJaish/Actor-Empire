import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Gauge,
  Lightbulb,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import type { Player, StreamingWeeklyPlanId } from '../types';
import {
  acknowledgeStreamingWeeklyReport,
  getStreamingWeeklyCeoLoop,
  lockStreamingWeeklyPlan,
} from '../services/streamingWeeklyLoop';
import '../styles/streaming-weekly-loop.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onReturnToGame: () => void;
}

const formatCompact = (value: number): string => {
  const absolute = Math.abs(value);
  const prefix = value < 0 ? '-' : '';
  if (absolute >= 1_000_000_000) return `${prefix}${(absolute / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (absolute >= 1_000_000) return `${prefix}${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (absolute >= 1_000) return `${prefix}${Math.round(absolute / 1_000)}K`;
  return value.toLocaleString();
};

const formatMoney = (value: number): string => {
  const prefix = value < 0 ? '-' : '';
  return `${prefix}$${formatCompact(Math.abs(value))}`;
};

const formatMovement = (value: number): string => (
  `${value >= 0 ? '+' : ''}${formatCompact(value)}`
);

const BriefIcon = ({ tone }: { tone: 'POSITIVE' | 'WATCH' | 'CRITICAL' | 'NEUTRAL' }) => {
  if (tone === 'CRITICAL') return <CircleAlert size={20} />;
  if (tone === 'WATCH') return <Gauge size={20} />;
  if (tone === 'POSITIVE') return <Lightbulb size={20} />;
  return <CalendarClock size={20} />;
};

export default function StreamingWeeklyCeoLoop({
  player,
  onUpdatePlayer,
  onReturnToGame,
}: Props) {
  const loop = useMemo(() => getStreamingWeeklyCeoLoop(player), [player]);
  const [screen, setScreen] = useState<'RESULT' | 'BRIEF'>(
    loop.hasUnreviewedResult ? 'RESULT' : 'BRIEF',
  );
  const [selectedPlanId, setSelectedPlanId] = useState<StreamingWeeklyPlanId>(
    loop.lockedDecision?.planId || 'RETENTION_SPOTLIGHT',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (loop.hasUnreviewedResult) setScreen('RESULT');
  }, [loop.hasUnreviewedResult, loop.latestSnapshot?.absoluteWeek]);

  if (!loop.available) return null;

  const selectedPlan = loop.planOptions.find(option => option.id === selectedPlanId)!;
  const latest = loop.latestSnapshot;
  const operations = latest?.operations;
  const viewingAccess = operations?.titlePerformance?.reduce((totals, title) => ({
    paid: totals.paid + (title.paidViewingAccounts || 0),
    shared: totals.shared + (title.sharedViewingAccounts || 0),
    piracy: totals.piracy + (title.piracyViewingAccounts || 0),
  }), { paid: 0, shared: 0, piracy: 0 }) || { paid: 0, shared: 0, piracy: 0 };

  const reviewResult = () => {
    if (latest) onUpdatePlayer(acknowledgeStreamingWeeklyReport(player, latest.absoluteWeek));
    setScreen('BRIEF');
  };

  const lockPlan = () => {
    setError('');
    const result = lockStreamingWeeklyPlan(player, selectedPlanId);
    if (!result.changed) {
      setError(result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot cover this operating plan.'
        : result.reason === 'ALREADY_LOCKED'
          ? 'A plan is already locked for the next game week.'
          : 'This plan cannot be locked in the current platform state.');
      return;
    }
    onUpdatePlayer(result.player);
  };

  return (
    <section className="weekly-loop" aria-label="Streaming weekly CEO loop">
      <header className="weekly-loop-header">
        <div>
          <span>PHASE 10 • WEEKLY CEO LOOP</span>
          <h2>{screen === 'RESULT' ? 'The week has a story.' : 'Set one clear operating priority.'}</h2>
          <p>{screen === 'RESULT'
            ? 'Committed audience, delivery and company cash results—followed by the causes.'
            : `Program week ${loop.programWeek} • Plan for game week ${loop.targetAbsoluteWeek.toLocaleString()}`}</p>
        </div>
        <div className="weekly-loop-cycle" aria-label="Weekly operating cycle">
          <span className={screen === 'BRIEF' ? 'is-current' : 'is-complete'}><Check size={12} /> Plan</span>
          <ArrowRight size={14} />
          <span className={screen === 'RESULT' ? 'is-complete' : ''}><RefreshCcw size={12} /> Process</span>
          <ArrowRight size={14} />
          <span className={screen === 'RESULT' ? 'is-current' : ''}><TrendingUp size={12} /> Result</span>
        </div>
      </header>

      {screen === 'RESULT' && latest && operations ? (
        <div className="weekly-result">
          <div className="weekly-result-hero">
            <div className="weekly-result-week">
              <span>WEEK {latest.absoluteWeek.toLocaleString()} CLOSED</span>
              <strong>Program week {operations.programWeek}</strong>
            </div>
            <h3>{operations.headline}</h3>
            <p>{operations.summary}</p>
          </div>

          <div className="weekly-result-signals">
            <article>
              <UsersRound size={18} />
              <span>Subscribers</span>
              <strong>{formatCompact(latest.subscribers)}</strong>
              <small className={latest.netSubscriberMovement >= 0 ? 'is-positive' : 'is-negative'}>
                {formatMovement(latest.netSubscriberMovement)} this week
              </small>
            </article>
            <article>
              {latest.netSubscriberMovement >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <span>Churn</span>
              <strong>{(latest.churnRate * 100).toFixed(1)}%</strong>
              <small>{operations.cancellations.toLocaleString()} cancellations</small>
            </article>
            <article>
              <Sparkles size={18} />
              <span>Engagement</span>
              <strong>{(latest.engagementRate * 100).toFixed(0)}%</strong>
              <small>Measured weekly activity</small>
            </article>
            <article>
              <RadioTower size={18} />
              <span>Playback</span>
              <strong>{operations.playbackSuccessRate.toFixed(2)}%</strong>
              <small>{operations.capacityUtilizationPercent.toFixed(0)}% peak capacity used</small>
            </article>
          </div>

          <div className="weekly-result-grid">
            <section className="weekly-waterfall">
              <div className="weekly-subheading">
                <div><span>AUDIENCE MOVEMENT</span><h3>Who came, stayed and left</h3></div>
                <strong>{formatMovement(latest.netSubscriberMovement)}</strong>
              </div>
              <div className="weekly-waterfall-row is-positive">
                <span>New joins</span>
                <i style={{ width: `${Math.min(100, operations.joinedSubscribers / Math.max(1, operations.joinedSubscribers + operations.reactivations) * 100)}%` }} />
                <strong>+{operations.joinedSubscribers.toLocaleString()}</strong>
              </div>
              <div className="weekly-waterfall-row is-return">
                <span>Reactivated</span>
                <i style={{ width: `${Math.max(7, Math.min(100, operations.reactivations / Math.max(1, operations.joinedSubscribers) * 100))}%` }} />
                <strong>+{operations.reactivations.toLocaleString()}</strong>
              </div>
              <div className="weekly-waterfall-row is-negative">
                <span>Cancelled</span>
                <i style={{ width: `${Math.min(100, operations.cancellations / Math.max(1, operations.joinedSubscribers) * 100)}%` }} />
                <strong>-{operations.cancellations.toLocaleString()}</strong>
              </div>
              {operations.worldCustomerEndingPaidAccounts !== undefined ? (
                <div className="weekly-customer-evidence">
                  <span>PLAN MOVEMENT</span>
                  <div><small>UPGRADES</small><strong>{formatCompact(operations.worldCustomerUpgrades || 0)}</strong></div>
                  <div><small>DOWNGRADES</small><strong>{formatCompact(operations.worldCustomerDowngrades || 0)}</strong></div>
                  <span>ACCESS BEYOND THE BILL</span>
                  <div><small>SHARED ACCESS</small><strong>{formatCompact(operations.worldCustomerExternalSharedHouseholds || 0)}</strong></div>
                  <div><small>PIRACY REACH</small><strong>{formatCompact(operations.worldCustomerPiracyReach || 0)}</strong></div>
                  <p>Paid accounts fund subscription revenue. Shared access affects service load; piracy does not enter the ledger.</p>
                </div>
              ) : null}
              {operations.worldViewingAccounts !== undefined ? (
                <div className="weekly-customer-evidence">
                  <span>TITLE VIEWING</span>
                  <div><small>WATCHING ACCOUNTS</small><strong>{formatCompact(operations.worldViewingAccounts || 0)}</strong></div>
                  <div><small>WATCH HOURS</small><strong>{formatCompact(operations.worldViewingHours || 0)}</strong></div>
                  <span>ACCESS OUTCOME</span>
                  <div><small>PAID VIEWING</small><strong>{formatCompact(viewingAccess.paid)}</strong></div>
                  <div><small>SHARED VIEWING</small><strong>{formatCompact(viewingAccess.shared)}</strong></div>
                  <div><small>PIRATED VIEWING</small><strong>{formatCompact(viewingAccess.piracy)}</strong></div>
                  <div><small>UNMET DEMAND</small><strong>{formatCompact(operations.worldViewingUnmetDemandAccounts || 0)}</strong></div>
                </div>
              ) : null}
            </section>

            <section className="weekly-economics">
              <div className="weekly-subheading">
                <div><span>PLATFORM CONTRIBUTION</span><h3>What reached treasury</h3></div>
                <Banknote size={21} />
              </div>
              <dl>
                <div><dt>Subscription cash</dt><dd>{formatMoney(operations.subscriptionRevenue)}</dd></div>
                {operations.worldViewingIncrementalRevenue !== undefined ? (
                  <>
                    <div><dt>Advertising</dt><dd>{formatMoney(operations.worldViewingAdvertisingRevenue || 0)}</dd></div>
                    <div><dt>Transactions</dt><dd>{formatMoney(operations.worldViewingTransactionRevenue || 0)}</dd></div>
                    <div><dt>Sponsorship</dt><dd>{formatMoney(operations.worldViewingSponsorshipRevenue || 0)}</dd></div>
                    <div><dt>Incremental revenue</dt><dd>{formatMoney(operations.worldViewingIncrementalRevenue || 0)}</dd></div>
                  </>
                ) : null}
                <div><dt>Cash operating costs</dt><dd>-{formatMoney(operations.totalCashCost)}</dd></div>
                <div className="is-total"><dt>Net treasury movement</dt><dd className={operations.netCashContribution >= 0 ? 'is-positive' : 'is-negative'}>{formatMoney(operations.netCashContribution)}</dd></div>
                <div><dt>Content amortization</dt><dd>-{formatMoney(operations.contentAmortization)}</dd></div>
                <div><dt>Accounting contribution</dt><dd>{formatMoney(operations.accountingContribution)}</dd></div>
              </dl>
              <small>Subscription cash is counted once. Title attribution does not duplicate it; amortization avoids charging treasury twice.</small>
            </section>
          </div>

          <section className="weekly-causality">
            <div className="weekly-subheading">
              <div><span>WHY IT HAPPENED</span><h3>The numbers expose their drivers</h3></div>
              <BadgeCheck size={20} />
            </div>
            <div className="weekly-driver-grid">
              {operations.causalDrivers.map(driver => (
                <article key={driver.id} className={`is-${driver.impact.toLowerCase()}`}>
                  <span>{driver.impact}</span>
                  <strong>{driver.label}</strong>
                  <p>{driver.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="weekly-hook">
            <CalendarClock size={22} />
            <div><span>NEXT-WEEK HOOK</span><strong>{operations.nextWeekHook}</strong></div>
          </aside>

          <button type="button" className="weekly-primary-action" onClick={reviewResult}>
            Open this week’s CEO Brief <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="weekly-brief">
          <div className="weekly-brief-story">
            {[loop.urgent, loop.opportunity, loop.upcoming].map(item => (
              <article key={item.label} className={`is-${item.tone.toLowerCase()}`}>
                <span className="weekly-brief-icon"><BriefIcon tone={item.tone} /></span>
                <div>
                  <small>{item.label}</small>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="weekly-brief-signals">
            <div><span>Subscribers</span><strong>{formatCompact(player.ownedStreamingPlatform.metrics.subscribers)}</strong></div>
            <div><span>Weekly movement</span><strong>{latest ? formatMovement(latest.netSubscriberMovement) : 'First report pending'}</strong></div>
            <div><span>Churn</span><strong>{latest ? `${(latest.churnRate * 100).toFixed(1)}%` : 'Pending'}</strong></div>
            <div><span>Cash runway</span><strong>{latest ? (latest.cashRunwayWeeks >= 1_000 ? 'Self-funding' : `${latest.cashRunwayWeeks.toFixed(1)} weeks`) : 'Maturing'}</strong></div>
          </div>

          <section className="weekly-decision-room">
            <div className="weekly-subheading">
              <div><span>ONE-WEEK MANDATE</span><h3>Choose the operating posture</h3></div>
              <strong>One decision</strong>
            </div>

            {loop.lockedDecision ? (
              <div className="weekly-plan-locked">
                <span><ShieldCheck size={21} /></span>
                <div>
                  <small>PLAN LOCKED FOR NEXT GAME WEEK</small>
                  <h3>{loop.lockedDecision.label}</h3>
                  <p>{formatMoney(loop.lockedDecision.cashCost)} will be committed only when the real game week processes.</p>
                </div>
                <BadgeCheck size={23} />
              </div>
            ) : (
              <>
                <div className="weekly-plan-grid" role="radiogroup" aria-label="Weekly streaming operating plan">
                  {loop.planOptions.map(option => {
                    const selected = selectedPlanId === option.id;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        key={option.id}
                        className={selected ? 'is-selected' : ''}
                        onClick={() => setSelectedPlanId(option.id)}
                      >
                        <span>{option.kicker}</span>
                        <strong>{option.label}</strong>
                        <p>{option.description}</p>
                        <ul>
                          {option.preview.map(item => <li key={item}><Check size={12} /> {item}</li>)}
                        </ul>
                        <footer><b>{formatMoney(option.cashCost)}</b><small>{option.risk}</small></footer>
                      </button>
                    );
                  })}
                </div>

                <div className="weekly-plan-preview">
                  <div>
                    <span>CEO PREVIEW</span>
                    <strong>{selectedPlan.label}</strong>
                    <p>{selectedPlan.preview.join(' • ')}</p>
                  </div>
                  <button type="button" onClick={lockPlan}>
                    Lock weekly plan <ChevronRight size={17} />
                  </button>
                </div>
              </>
            )}

            {error && <p className="weekly-loop-error" role="alert">{error}</p>}
          </section>

          <aside className="weekly-hook is-brief">
            <CalendarClock size={22} />
            <div><span>THE HOOK</span><strong>{loop.nextWeekHook}</strong></div>
          </aside>

          <div className="weekly-advance">
            <div>
              <span>{loop.lockedDecision ? 'READY TO PROCESS' : 'BALANCED AUTOPILOT REMAINS AVAILABLE'}</span>
              <p>{loop.lockedDecision
                ? 'The platform plan is saved. Advancing the normal Actor Empire week will commit one result.'
                : 'You may leave without a plan; the service will operate steadily and still report honestly.'}</p>
            </div>
            <button type="button" onClick={onReturnToGame}>
              Return to game and advance week <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
