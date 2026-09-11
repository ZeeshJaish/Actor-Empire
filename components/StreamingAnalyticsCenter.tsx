import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cpu,
  Database,
  Film,
  Gauge,
  Grid3X3,
  Layers3,
  LineChart,
  Play,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { Player } from '../types';
import {
  getStreamingPlatformAnalytics,
  type StreamingAnalyticsRange,
  type StreamingCeoPulseSignal,
} from '../services/streamingAnalytics';
import AccessibleDialog from './AccessibleDialog';
import {
  StreamingLineGraph,
  StreamingMarketRing,
  StreamingWaterfallGraph,
  formatStreamingAnalyticsCompact,
} from './streaming-analytics/StreamingGraphSystem';
import '../styles/streaming-analytics.css';

interface Props {
  player: Player;
  onClose: () => void;
  onOpenTitleDossier?: () => void;
  initialAnalystTab?: AnalystTab;
  initialMode?: 'CEO' | 'ANALYST';
}

type AnalystTab = 'AUDIENCE' | 'FINANCE' | 'TECH' | 'CONTENT';

const ranges: StreamingAnalyticsRange[] = [4, 12, 26, 52];
const analystTabs: Array<{ id: AnalystTab; label: string; icon: typeof UsersRound }> = [
  { id: 'AUDIENCE', label: 'Audience', icon: UsersRound },
  { id: 'FINANCE', label: 'Finance', icon: CircleDollarSign },
  { id: 'TECH', label: 'Technology', icon: Cpu },
  { id: 'CONTENT', label: 'Content gaps', icon: Layers3 },
];

const formatMoney = (value: number): string => `${value < 0 ? '−' : ''}$${formatStreamingAnalyticsCompact(Math.abs(value))}`;
const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const pulseIcons: Record<StreamingCeoPulseSignal['id'], typeof Activity> = {
  AUDIENCE: TrendingUp,
  RETENTION: UsersRound,
  FINANCE: CircleDollarSign,
  TECH: RadioTower,
  CONTENT: Layers3,
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: 'positive' | 'watch' | 'critical' | 'neutral';
}) {
  return (
    <article className={`sac-metric is-${tone}`}>
      <span><Icon size={18} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function StreamingAnalyticsCenter({
  player,
  onClose,
  onOpenTitleDossier,
  initialAnalystTab = 'AUDIENCE',
  initialMode = 'CEO',
}: Props) {
  const [range, setRange] = useState<StreamingAnalyticsRange>(12);
  const [mode, setMode] = useState<'CEO' | 'ANALYST'>(initialMode);
  const [analystTab, setAnalystTab] = useState<AnalystTab>(initialAnalystTab);
  const analytics = useMemo(() => getStreamingPlatformAnalytics(player, range), [player, range]);
  const latestSubscriber = analytics.subscriberTimeline.at(-1)?.value ?? analytics.platform.launchCommit?.initialSubscribers ?? 0;
  const combinedCapacity = [...analytics.capacityTimeline, ...analytics.capacityForecast];

  const renderAudience = () => (
    <div className="sac-analyst-layout">
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head">
          <div><span>SUBSCRIBER TIMELINE</span><h2>How the audience moved</h2></div>
          <strong>{formatStreamingAnalyticsCompact(latestSubscriber)} members</strong>
        </div>
        <StreamingLineGraph points={analytics.subscriberTimeline} label="Subscriber timeline" primaryLabel="Subscribers" />
      </section>

      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>JOIN / CANCEL / RETURN</span><h2>Audience waterfall</h2></div></div>
        <StreamingWaterfallGraph waterfall={analytics.waterfall} />
        <div className={`sac-reconcile-line is-${analytics.waterfall?.reconciled ? 'good' : 'partial'}`}>
          {analytics.waterfall?.reconciled ? <BadgeCheck size={15} /> : <AlertTriangle size={15} />}
          {analytics.waterfall?.reconciled ? 'Opening + joins + returns − cancellations = closing audience.' : 'This migrated range has partial audience coverage.'}
        </div>
      </section>

      {analytics.customerAccess ? (
        <section className="sac-data-panel is-wide">
          <div className="sac-panel-head">
            <div><span>PAID VS ACCESS</span><h2>Who pays and who reaches the service</h2></div>
            <strong>{formatStreamingAnalyticsCompact(analytics.customerAccess.accessLoadAccounts)} access load</strong>
          </div>
          <div className="sac-metric-row is-analyst">
            <MetricCard icon={UsersRound} label="Paid accounts" value={formatStreamingAnalyticsCompact(analytics.customerAccess.paidAccounts)} detail={`${formatStreamingAnalyticsCompact(analytics.customerAccess.payingHouseholds)} paying households`} tone="positive" />
            <MetricCard icon={Activity} label="Shared access" value={formatStreamingAnalyticsCompact(analytics.customerAccess.externalSharedHouseholds)} detail={`${formatStreamingAnalyticsCompact(analytics.customerAccess.sharedActiveViewers)} active shared viewers`} />
            <MetricCard icon={ShieldCheck} label="Piracy reach" value={formatStreamingAnalyticsCompact(analytics.customerAccess.piracyReach)} detail="Outside paid subscription revenue" tone="watch" />
            <MetricCard icon={TrendingUp} label="Plan movement" value={`${formatStreamingAnalyticsCompact(analytics.planMovement.upgrades)} up`} detail={`${formatStreamingAnalyticsCompact(analytics.planMovement.downgrades)} down · ${formatStreamingAnalyticsCompact(analytics.planMovement.switchIns)} switched in`} />
          </div>
          <p className="sac-model-note">Subscription revenue is derived from paid plan accounts only. Shared access still contributes to delivery load.</p>
        </section>
      ) : null}

      {analytics.viewing ? (
        <section className="sac-data-panel is-wide">
          <div className="sac-panel-head">
            <div><span>TITLE-LEVEL VIEWING</span><h2>Attention after access</h2></div>
            <strong>{formatStreamingAnalyticsCompact(analytics.viewing.hoursViewed)} watch hours</strong>
          </div>
          <div className="sac-metric-row is-analyst">
            <MetricCard icon={Play} label="Watching accounts" value={formatStreamingAnalyticsCompact(analytics.viewing.viewingAccounts)} detail={`${formatStreamingAnalyticsCompact(analytics.viewing.estimatedViewers)} estimated viewers`} tone="positive" />
            <MetricCard icon={Clock3} label="Watch hours" value={formatStreamingAnalyticsCompact(analytics.viewing.hoursViewed)} detail={`${formatStreamingAnalyticsCompact(analytics.viewing.starts)} title starts`} />
            <MetricCard icon={Search} label="Unmet demand" value={formatStreamingAnalyticsCompact(analytics.viewing.unmetDemandAccounts)} detail="Accessible accounts that found no eligible watch" tone="watch" />
            <MetricCard icon={UsersRound} label="Shared viewing" value={formatStreamingAnalyticsCompact(analytics.viewing.sharedViewingAccounts)} detail={`${formatStreamingAnalyticsCompact(analytics.viewing.paidViewingAccounts)} paid-path viewing accounts`} />
            <MetricCard icon={ShieldCheck} label="Pirated viewing" value={formatStreamingAnalyticsCompact(analytics.viewing.piracyViewingAccounts)} detail="Separate from legitimate access and cash" tone="watch" />
          </div>
        </section>
      ) : null}

      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>WORLD POSITION</span><h2>Modeled market share</h2></div></div>
        <StreamingMarketRing entries={analytics.marketShare} playerShare={analytics.playerMarketSharePercent} />
        <p className="sac-model-note">Uses canonical world-platform subscribers. This is a world model, not a claim about the real market.</p>
      </section>

      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head">
          <div><span>RETENTION COHORTS</span><h2>Who stayed after entering</h2></div>
          <strong>{analytics.cohorts.length ? `${analytics.cohorts.length} visible cohorts` : 'PENDING'}</strong>
        </div>
        {analytics.cohorts.length ? (
          <div className="sac-cohort-grid">
            {analytics.cohorts.map(cohort => (
              <article key={cohort.id}>
                <div><span>{cohort.label}</span><strong>{cohort.retentionRate.toFixed(1)}%</strong></div>
                <div className="sac-cohort-bar"><i style={{ width: `${cohort.retentionRate}%` }} /></div>
                <small>{formatStreamingAnalyticsCompact(cohort.remainingSubscribers)} of {formatStreamingAnalyticsCompact(cohort.enteredSubscribers)} remain • {cohort.ageWeeks}w old</small>
              </article>
            ))}
          </div>
        ) : <div className="sac-pending"><Clock3 size={22} /> Cohort retention begins after the first completed platform week.</div>}
      </section>

      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>WEEKLY CHURN</span><h2>Cancellation pressure</h2></div></div>
        <StreamingLineGraph points={analytics.churnTimeline} label="Weekly churn percentage" valueFormatter={formatPercent} primaryLabel="Churn" tone="AMBER" />
      </section>

      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>ENGAGEMENT</span><h2>Active audience depth</h2></div></div>
        <StreamingLineGraph points={analytics.engagementTimeline} label="Weekly engagement percentage" valueFormatter={formatPercent} primaryLabel="Engagement" tone="VIOLET" />
      </section>
    </div>
  );

  const renderFinance = () => (
    <div className="sac-analyst-layout">
      <div className="sac-metric-row is-analyst">
        <MetricCard icon={WalletCards} label="Subscription cash" value={formatMoney(analytics.totals.revenue)} detail={`${analytics.availableWeeks}-week selected window`} tone="positive" />
        <MetricCard icon={CircleDollarSign} label="Incremental revenue" value={formatMoney(analytics.totals.incrementalRevenue)} detail="Ads, transactions and sponsorship" tone="positive" />
        <MetricCard icon={TrendingDown} label="Cash costs" value={formatMoney(analytics.totals.cashCost)} detail="Infrastructure, leadership, partners and plans" tone="watch" />
        <MetricCard icon={CircleDollarSign} label="Cash contribution" value={formatMoney(analytics.totals.cashContribution)} detail="Revenue less real cash costs" tone={analytics.totals.cashContribution >= 0 ? 'positive' : 'critical'} />
        <MetricCard icon={Database} label="Accounting contribution" value={formatMoney(analytics.totals.accountingContribution)} detail={`After ${formatMoney(analytics.totals.contentAmortization)} amortization`} tone={analytics.totals.accountingContribution >= 0 ? 'positive' : 'critical'} />
      </div>
      {analytics.viewing ? (
        <section className="sac-data-panel is-wide">
          <div className="sac-panel-head"><div><span>COMMERCIAL VIEWING</span><h2>Revenue earned beyond subscriptions</h2></div><strong>{formatMoney(analytics.viewing.incrementalRevenue)}</strong></div>
          <div className="sac-metric-row is-analyst">
            <MetricCard icon={RadioTower} label="Advertising" value={formatMoney(analytics.viewing.advertisingRevenue)} detail="Delivered ad-supported viewing" tone="positive" />
            <MetricCard icon={WalletCards} label="Transactions" value={formatMoney(analytics.viewing.transactionRevenue)} detail="Premium access, rentals and purchases" tone="positive" />
            <MetricCard icon={Sparkles} label="Sponsorship" value={formatMoney(analytics.viewing.sponsorshipRevenue)} detail="Contracted title exposure" tone="positive" />
          </div>
          <p className="sac-model-note">Existing subscription revenue is counted once in WE5. WE6 attributes it to titles and adds only genuinely incremental commercial revenue.</p>
        </section>
      ) : null}
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head"><div><span>REVENUE TIMELINE</span><h2>Weekly subscription revenue</h2></div></div>
        <StreamingLineGraph points={analytics.revenueTimeline} label="Weekly subscription revenue" valueFormatter={formatMoney} primaryLabel="Revenue" tone="GREEN" />
      </section>
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head"><div><span>CASH VS ACCOUNTING</span><h2>One business, two honest profit views</h2></div></div>
        <StreamingLineGraph
          points={analytics.contributionTimeline}
          label="Cash and accounting contribution"
          valueFormatter={formatMoney}
          primaryLabel="Cash contribution"
          secondaryLabel="Accounting contribution"
          tone="GREEN"
        />
      </section>
      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>CASH RUNWAY</span><h2>Weeks of operating room</h2></div></div>
        <StreamingLineGraph points={analytics.cashRunwayTimeline} label="Cash runway in weeks" valueFormatter={value => `${value.toFixed(1)}w`} primaryLabel="Runway" />
      </section>
      <section className={`sac-trust-panel is-${analytics.reconciliation.status.toLowerCase()}`}>
        {analytics.reconciliation.status === 'RECONCILED' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
        <div><span>LEDGER TRUST</span><h2>{analytics.reconciliation.status === 'RECONCILED' ? 'Every selected total ties out.' : 'This range contains migrated partial facts.'}</h2><p>{analytics.reconciliation.detail}</p></div>
        <ul>
          <li className={analytics.reconciliation.subscriberWaterfall ? 'is-good' : ''}>Subscriber waterfall</li>
          <li className={analytics.reconciliation.cashContribution ? 'is-good' : ''}>Cash contribution</li>
          <li className={analytics.reconciliation.accountingContribution ? 'is-good' : ''}>Accounting contribution</li>
          <li className={analytics.reconciliation.snapshotLedgerCoverage ? 'is-good' : ''}>Metric ledger coverage</li>
        </ul>
      </section>
    </div>
  );

  const renderTechnology = () => (
    <div className="sac-analyst-layout">
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head">
          <div><span>CAPACITY & FORECAST</span><h2>Demand against the delivery ceiling</h2></div>
          <strong>{formatStreamingAnalyticsCompact(analytics.platform.capacity.burstConcurrentStreams)} burst capacity</strong>
        </div>
        <StreamingLineGraph
          points={combinedCapacity}
          label="Actual and forecast peak streams against burst capacity"
          primaryLabel="Peak streams"
          secondaryLabel="Burst capacity"
          tone="CYAN"
        />
        <div className="sac-forecast-drivers">
          <span><BrainCircuit size={15} /> Forecast drivers</span>
          <p>Recent peak trend + scheduled premiere pressure + active weekly-release support. Forecasts never alter weekly results.</p>
        </div>
      </section>
      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>PLAYBACK HEALTH</span><h2>Average successful starts</h2></div></div>
        <div className="sac-big-readout">
          <Gauge size={30} />
          <strong>{analytics.totals.averagePlaybackSuccessRate === null ? 'PENDING' : `${analytics.totals.averagePlaybackSuccessRate.toFixed(2)}%`}</strong>
          <small>Peak utilization {analytics.totals.peakCapacityUtilizationPercent === null ? 'pending' : `${analytics.totals.peakCapacityUtilizationPercent.toFixed(0)}%`}</small>
        </div>
      </section>
      <section className="sac-data-panel">
        <div className="sac-panel-head"><div><span>INCIDENT HISTORY</span><h2>Committed pressure events</h2></div><strong>{analytics.incidents.length}</strong></div>
        {analytics.incidents.length ? (
          <div className="sac-incident-list">
            {analytics.incidents.map(incident => (
              <article key={incident.id} className={`is-${incident.severity.toLowerCase()}`}>
                <span>{incident.severity === 'MAJOR' ? <AlertTriangle size={16} /> : <Activity size={16} />}</span>
                <div><strong>{incident.title}</strong><p>{incident.detail}</p><small>{incident.metric}</small></div>
              </article>
            ))}
          </div>
        ) : <div className="sac-pending is-positive"><ShieldCheck size={22} /> No operational incident crossed the recorded threshold.</div>}
      </section>
    </div>
  );

  const renderContent = () => (
    <div className="sac-analyst-layout">
      {onOpenTitleDossier ? (
        <button type="button" className="sac-title-dossier-link" onClick={onOpenTitleDossier}>
          <span><Film size={22} /></span>
          <div><small>PHASE 13 • TITLE INTELLIGENCE</small><strong>Open the complete title dossiers</strong><p>Trace audience, engagement, discovery, contribution, playback quality and future signals title by title.</p></div>
          <ChevronRight size={20} />
        </button>
      ) : null}
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head">
          <div><span>TWELVE-WEEK CONTENT HEATMAP</span><h2>Where the next-watch promise thins</h2></div>
          <strong>{analytics.contentGaps.filter(cell => cell.status === 'GAP').length} gaps</strong>
        </div>
        <div className="sac-gap-heatmap" role="img" aria-label="Twelve-week content-gap heatmap">
          {analytics.contentGaps.map(cell => (
            <article key={cell.programWeek} className={`is-${cell.status.toLowerCase()}`} title={cell.detail}>
              <span>{cell.label}</span>
              <strong>{cell.status === 'PREMIERE' ? 'PREMIERE' : cell.status === 'SUPPORTED' ? 'ACTIVE' : 'GAP'}</strong>
              <small>{cell.title || cell.detail}</small>
            </article>
          ))}
        </div>
        <div className="sac-gap-legend">
          <span><i className="is-premiere" /> Scheduled premiere</span>
          <span><i className="is-supported" /> Weekly support</span>
          <span><i className="is-gap" /> Unsupported gap</span>
        </div>
      </section>
      <section className="sac-data-panel is-wide">
        <div className="sac-panel-head"><div><span>DATA HONESTY</span><h2>Unknown is not zero</h2></div><Search size={20} /></div>
        <div className="sac-unmeasured-grid">
          {analytics.unmeasured.map(item => (
            <article key={item.label}><Clock3 size={18} /><div><strong>{item.label}</strong><p>{item.reason}</p></div><span>NOT MEASURED</span></article>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <AccessibleDialog className="sac-backdrop" role="dialog" aria-labelledby="sac-title" onEscape={onClose}>
      <div className="sac-shell" style={{ '--sac-accent': analytics.platform.identity?.primaryColor || '#61d3ff' } as React.CSSProperties}>
        <header className="sac-topbar">
          <button type="button" className="sac-close" onClick={onClose} aria-label="Close Analytics Center"><ArrowLeft size={20} /></button>
          <div className="sac-brand">
            <span><LineChart size={20} /></span>
            <div><strong>Analytics Center</strong><small>{analytics.platform.identity?.name || 'EMPIRE+'} • canonical company intelligence</small></div>
          </div>
          <button type="button" className="sac-close is-x" onClick={onClose} aria-label="Close Analytics Center"><X size={19} /></button>
        </header>

        <div className="sac-control-deck">
          <div className="sac-mode-switch" aria-label="Analytics detail mode">
            <button type="button" className={mode === 'CEO' ? 'is-active' : ''} onClick={() => setMode('CEO')}><Target size={16} /> CEO Pulse</button>
            <button type="button" className={mode === 'ANALYST' ? 'is-active' : ''} onClick={() => setMode('ANALYST')}><Grid3X3 size={16} /> Analyst Mode</button>
          </div>
          <div className="sac-range-switch" aria-label="Analytics time range">
            {ranges.map(item => <button key={item} type="button" className={range === item ? 'is-active' : ''} onClick={() => setRange(item)}>{item}W</button>)}
          </div>
        </div>

        <main className="sac-main">
          {mode === 'CEO' ? (
            <>
              <section className="sac-command-hero">
                <div className="sac-command-grid" aria-hidden="true" />
                <div>
                  <span>CEO PULSE • {analytics.availableWeeks} COMMITTED WEEKS</span>
                  <h1 id="sac-title">See the decision hiding inside the data.</h1>
                  <p>Fast conclusions first. Every number below can be opened and reconciled in Analyst Mode.</p>
                </div>
                <div className={`sac-trust-orb is-${analytics.reconciliation.status.toLowerCase()}`}>
                  {analytics.reconciliation.status === 'RECONCILED' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
                  <strong>{analytics.reconciliation.status}</strong>
                  <small>Ledger status</small>
                </div>
              </section>

              <div className="sac-pulse-grid">
                {analytics.ceoPulse.map(signal => {
                  const Icon = pulseIcons[signal.id];
                  return (
                    <article key={signal.id} className={`is-${signal.tone.toLowerCase()}`}>
                      <div><span><Icon size={19} /></span><small>{signal.label}</small><strong>{signal.value}</strong></div>
                      <p>{signal.conclusion}</p>
                      <footer><ChevronRight size={14} /> {signal.action}</footer>
                    </article>
                  );
                })}
              </div>

              <div className="sac-metric-row">
                <MetricCard icon={UsersRound} label="Subscribers" value={formatStreamingAnalyticsCompact(latestSubscriber)} detail={`${analytics.waterfall?.reconciled ? 'Reconciled' : 'Pending'} audience waterfall`} tone="positive" />
                <MetricCard icon={Activity} label="Engagement" value={analytics.totals.averageEngagementRate === null ? 'PENDING' : `${(analytics.totals.averageEngagementRate * 100).toFixed(1)}%`} detail="Average active-audience depth" />
                <MetricCard icon={WalletCards} label="Cash contribution" value={formatMoney(analytics.totals.cashContribution)} detail="Revenue less operating cash costs" tone={analytics.totals.cashContribution >= 0 ? 'positive' : 'critical'} />
                <MetricCard icon={Gauge} label="Peak capacity use" value={analytics.totals.peakCapacityUtilizationPercent === null ? 'PENDING' : `${analytics.totals.peakCapacityUtilizationPercent.toFixed(0)}%`} detail="Highest load in selected window" tone={(analytics.totals.peakCapacityUtilizationPercent || 0) >= 90 ? 'watch' : 'positive'} />
              </div>

              <div className="sac-ceo-graphs">
                <section className="sac-data-panel">
                  <div className="sac-panel-head"><div><span>AUDIENCE DIRECTION</span><h2>Subscriber timeline</h2></div><strong>{range}W</strong></div>
                  <StreamingLineGraph points={analytics.subscriberTimeline} label="Subscriber timeline" primaryLabel="Subscribers" />
                </section>
                <section className="sac-data-panel">
                  <div className="sac-panel-head"><div><span>AUDIENCE WATERFALL</span><h2>What changed the total</h2></div></div>
                  <StreamingWaterfallGraph waterfall={analytics.waterfall} />
                </section>
              </div>

              <button type="button" className="sac-enter-analyst" onClick={() => setMode('ANALYST')}>
                <span><Database size={21} /><span><strong>Open Analyst Mode</strong><small>Audit cohorts, finance, capacity, incidents and content gaps</small></span></span>
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <>
              <header className="sac-analyst-heading">
                <div><span>ANALYST MODE • SOURCE-TRACEABLE</span><h1 id="sac-title">The company beneath the headline.</h1><p>Selected window: latest {range} operating weeks. Unknown telemetry remains visibly unknown.</p></div>
                <div className={`sac-ledger-chip is-${analytics.reconciliation.status.toLowerCase()}`}><Database size={16} /> {analytics.reconciliation.status}</div>
              </header>
              <nav className="sac-analyst-tabs" aria-label="Analytics areas">
                {analystTabs.map(tab => {
                  const Icon = tab.icon;
                  return <button key={tab.id} type="button" className={analystTab === tab.id ? 'is-active' : ''} onClick={() => setAnalystTab(tab.id)}><Icon size={17} /><span>{tab.label}</span></button>;
                })}
              </nav>
              {analystTab === 'AUDIENCE' ? renderAudience() : null}
              {analystTab === 'FINANCE' ? renderFinance() : null}
              {analystTab === 'TECH' ? renderTechnology() : null}
              {analystTab === 'CONTENT' ? renderContent() : null}
            </>
          )}
        </main>
      </div>
    </AccessibleDialog>
  );
}
