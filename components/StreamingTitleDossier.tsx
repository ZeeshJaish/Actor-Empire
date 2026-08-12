import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Compass,
  Eye,
  Film,
  Gauge,
  HeartPulse,
  LineChart,
  LockKeyhole,
  Play,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import type { Player } from '../types';
import {
  getStreamingTitleAnalytics,
  type StreamingTitleDossierSummary,
  type StreamingTitleDossierTab,
} from '../services/streamingTitleAnalytics';
import type { StreamingAnalyticsPoint } from '../services/streamingAnalytics';
import AccessibleDialog from './AccessibleDialog';
import {
  StreamingLineGraph,
  formatStreamingAnalyticsCompact,
} from './streaming-analytics/StreamingGraphSystem';
import '../styles/streaming-analytics.css';
import '../styles/streaming-title-dossier.css';

interface Props {
  player: Player;
  onClose: () => void;
  onOpenPromotionWarRoom?: (projectId: string) => void;
  initialProjectId?: string | null;
}

const tabs: Array<{
  id: StreamingTitleDossierTab;
  label: string;
  icon: typeof Film;
}> = [
  { id: 'OVERVIEW', label: 'Overview', icon: Eye },
  { id: 'AUDIENCE', label: 'Audience', icon: UsersRound },
  { id: 'ENGAGEMENT', label: 'Engagement', icon: HeartPulse },
  { id: 'DISCOVERY', label: 'Discovery', icon: Compass },
  { id: 'FINANCIALS', label: 'Financials', icon: CircleDollarSign },
  { id: 'TECHNICAL', label: 'Technical', icon: RadioTower },
  { id: 'FUTURE', label: 'Future', icon: TrendingUp },
];

const formatMoney = (value: number): string => `${value < 0 ? '−' : ''}$${formatStreamingAnalyticsCompact(Math.abs(value))}`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatScore = (value: number): string => `${value.toFixed(0)}/100`;

const sourceLabel = (source: StreamingTitleDossierSummary['entry']['source']): string => (
  source === 'ORIGINAL' ? 'PLATFORM ORIGINAL' : source === 'OWNED_LIBRARY' ? 'OWNED LIBRARY' : 'LICENSED WINDOW'
);

const initialsFor = (title: string): string => title
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(word => word[0])
  .join('')
  .toUpperCase();

function DossierMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'warning' | 'neutral';
}) {
  return (
    <article className={`std-metric is-${tone}`}>
      <span><Icon size={17} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ReportGate({
  selected,
  tab,
}: {
  selected: StreamingTitleDossierSummary;
  tab: StreamingTitleDossierTab;
}) {
  const report = selected.reports[tab];
  const isUnmeasured = report.status === 'NOT_MEASURED';
  return (
    <section className={`std-report-gate is-${report.status.toLowerCase().replace('_', '-')}`}>
      <div className="std-gate-visual" aria-hidden="true">
        <span>{isUnmeasured ? <LockKeyhole size={28} /> : <Activity size={28} />}</span>
        <i />
        <i />
        <i />
      </div>
      <div>
        <span>{isUnmeasured ? 'NO CANONICAL TITLE TELEMETRY' : 'REPORT MATURING'}</span>
        <h2>{isUnmeasured ? 'Unknown is not zero.' : `${report.measuredWeeks} of ${report.requiredWeeks} measured weeks collected.`}</h2>
        <p>{report.detail}</p>
        <div className="std-gate-progress" aria-label={`${report.measuredWeeks} of ${report.requiredWeeks} required weeks`}>
          {Array.from({ length: report.requiredWeeks }, (_, index) => (
            <i key={index} className={index < report.measuredWeeks ? 'is-filled' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function StreamingTitleDossier({ player, onClose, onOpenPromotionWarRoom, initialProjectId }: Props) {
  const initial = getStreamingTitleAnalytics(player, initialProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initial.selected?.entry.projectId || null);
  const [activeTab, setActiveTab] = useState<StreamingTitleDossierTab>('OVERVIEW');
  const analytics = useMemo(
    () => getStreamingTitleAnalytics(player, selectedProjectId),
    [player, selectedProjectId],
  );
  const selected = analytics.selected;

  const audiencePoints: StreamingAnalyticsPoint[] = selected?.audienceTrend || [];
  const engagementPoints: StreamingAnalyticsPoint[] = selected?.engagementTrend || [];
  const technicalPoints: StreamingAnalyticsPoint[] = selected?.technicalTrend || [];

  const selectTitle = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('OVERVIEW');
  };

  const renderOverview = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <section className="std-story-panel is-wide">
        <div className="std-panel-heading">
          <div><span>PERFORMANCE STORY</span><h2>What this title is doing for the platform</h2></div>
          <span className={`std-momentum is-${title.momentum.toLowerCase()}`}>
            {title.momentum === 'RISING' ? <TrendingUp size={16} /> : title.momentum === 'COOLING' ? <TrendingDown size={16} /> : <Activity size={16} />}
            {title.momentum}
          </span>
        </div>
        <p className="std-executive-read">
          {title.momentum === 'UNKNOWN'
            ? 'The first measured week establishes a baseline. Direction needs at least one more result.'
            : title.momentum === 'RISING'
              ? 'Weekly audience is accelerating. Watch whether completion and satisfaction rise with it.'
              : title.momentum === 'COOLING'
                ? 'Weekly audience is cooling. The dossier separates a natural release curve from a weak viewer response.'
                : 'Audience demand is holding. Depth and contribution now matter more than a headline spike.'}
        </p>
        <StreamingLineGraph points={audiencePoints} label={`${title.entry.title} weekly viewing accounts`} primaryLabel="Viewing accounts" />
      </section>
      <div className="std-metric-rack is-wide">
        <DossierMetric icon={UsersRound} label="Viewing accounts" value={formatStreamingAnalyticsCompact(title.totalViewingAccounts!)} detail={`Across ${title.measuredWeeks} measured week${title.measuredWeeks === 1 ? '' : 's'}`} tone="positive" />
        <DossierMetric icon={Play} label="Hours viewed" value={formatStreamingAnalyticsCompact(title.totalHoursViewed!)} detail="Canonical measured consumption" />
        <DossierMetric icon={BookOpenCheck} label="Completion" value={formatPercent(title.averageCompletionRate!)} detail="Viewing-account weighted average" />
        <DossierMetric icon={Sparkles} label="Satisfaction" value={formatScore(title.averageSatisfactionScore!)} detail="Modeled viewer response" tone={(title.averageSatisfactionScore || 0) >= 72 ? 'positive' : 'warning'} />
      </div>
      <section className="std-trust-card is-wide">
        <ShieldCheck size={22} />
        <div><span>MEASUREMENT RECEIPT</span><strong>Weeks {title.firstMeasuredAbsoluteWeek}–{title.latestMeasuredAbsoluteWeek}</strong><p>This dossier uses committed weekly title records. Reopening it cannot reroll a result.</p></div>
      </section>
    </div>
  );

  const renderAudience = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <section className="std-story-panel is-wide">
        <div className="std-panel-heading"><div><span>WEEKLY REACH</span><h2>How many accounts chose this title</h2></div><strong>{formatStreamingAnalyticsCompact(title.totalViewingAccounts!)}</strong></div>
        <StreamingLineGraph points={audiencePoints} label={`${title.entry.title} audience timeline`} primaryLabel="Viewing accounts" />
      </section>
      <section className="std-method-panel">
        <Target size={22} />
        <div><span>WHAT THIS MEANS</span><h2>Reach, not subscriber ownership</h2><p>A viewing account may watch several titles. This graph measures the title’s share of attention; it does not pretend every viewer joined solely for this show.</p></div>
      </section>
      <section className="std-method-panel">
        <Clock3 size={22} />
        <div><span>WINDOW</span><h2>{title.measuredWeeks} measured weeks</h2><p>Title reporting starts only when canonical telemetry exists. Older unmeasured weeks are not backfilled.</p></div>
      </section>
    </div>
  );

  const renderEngagement = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <section className="std-story-panel is-wide">
        <div className="std-panel-heading"><div><span>VIEWER DEPTH</span><h2>Finishing versus returning</h2></div></div>
        <StreamingLineGraph
          points={engagementPoints}
          label={`${title.entry.title} completion and repeat viewing`}
          valueFormatter={value => `${value.toFixed(1)}%`}
          primaryLabel="Completion"
          secondaryLabel="Repeat viewing"
          tone="VIOLET"
        />
      </section>
      <div className="std-metric-rack is-wide">
        <DossierMetric icon={BookOpenCheck} label="Completion rate" value={formatPercent(title.averageCompletionRate!)} detail="How often viewers reach the finish" tone={(title.averageCompletionRate || 0) >= 0.65 ? 'positive' : 'warning'} />
        <DossierMetric icon={Eye} label="Repeat viewing" value={formatPercent(title.averageRepeatViewingRate!)} detail="How often the audience returns" />
        <DossierMetric icon={Sparkles} label="Satisfaction" value={formatScore(title.averageSatisfactionScore!)} detail="Response after viewing" tone={(title.averageSatisfactionScore || 0) >= 72 ? 'positive' : 'warning'} />
      </div>
    </div>
  );

  const renderDiscovery = (title: StreamingTitleDossierSummary) => {
    const discovery = title.discoveryMix!;
    const channels = [
      { label: 'Homepage', value: discovery.homepagePercent, icon: Film, copy: 'Featured surfaces and programmed rows' },
      { label: 'Recommendations', value: discovery.recommendationsPercent, icon: Sparkles, copy: 'Personalized viewer suggestions' },
      { label: 'Search', value: discovery.searchPercent, icon: Search, copy: 'Intent-led title and genre discovery' },
      { label: 'Direct', value: discovery.directPercent, icon: Target, copy: 'Watchlists, links and known demand' },
    ];
    return (
      <div className="std-report-grid">
        <section className="std-discovery-map is-wide">
          <div className="std-panel-heading"><div><span>DISCOVERY ATTRIBUTION</span><h2>How viewers found the title</h2></div><Compass size={22} /></div>
          <div className="std-discovery-orbit">
            <div className="std-discovery-title"><span>{initialsFor(title.entry.title)}</span><strong>{title.entry.title}</strong></div>
            {channels.map(({ label, value, icon: Icon, copy }) => (
              <article key={label}>
                <span><Icon size={17} /></span>
                <div><strong>{label}</strong><small>{copy}</small></div>
                <em>{value.toFixed(1)}%</em>
                <i><b style={{ width: `${value}%` }} /></i>
              </article>
            ))}
          </div>
        </section>
        <aside className="std-boundary-note is-wide">
          <BarChart3 size={20} />
          <div>
            <p><strong>Analysis before action.</strong> Phase 13 records where discovery came from. Phase 14 turns that evidence into an auditable next-week modifier.</p>
            {onOpenPromotionWarRoom ? (
              <button type="button" className="std-open-growth" onClick={() => onOpenPromotionWarRoom(title.entry.projectId)}>
                Open Growth War Room <TrendingUp size={15} />
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    );
  };

  const renderFinancials = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <div className="std-metric-rack is-wide">
        <DossierMetric icon={BadgeDollarSign} label="Attributed revenue" value={formatMoney(title.attributedSubscriptionRevenue!)} detail="Allocated by measured title attention" tone="positive" />
        <DossierMetric icon={CircleDollarSign} label="Allocated cash cost" value={formatMoney(title.allocatedCashCost!)} detail="Share of this period’s real cash spend" />
        <DossierMetric icon={BookOpenCheck} label="Content amortization" value={formatMoney(title.allocatedContentAmortization!)} detail="Accounting recognition, not a second cash payment" />
      </div>
      <section className="std-contribution-stage is-wide">
        <div>
          <span>CASH VIEW</span>
          <strong className={(title.cashContribution || 0) >= 0 ? 'is-positive' : 'is-negative'}>{formatMoney(title.cashContribution!)}</strong>
          <p>Attributed revenue minus allocated operating cash cost.</p>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>ACCOUNTING VIEW</span>
          <strong className={(title.accountingContribution || 0) >= 0 ? 'is-positive' : 'is-negative'}>{formatMoney(title.accountingContribution!)}</strong>
          <p>Cash contribution after content cost is recognized over time.</p>
        </div>
      </section>
      <aside className="std-boundary-note is-wide">
        <ShieldCheck size={20} />
        <p><strong>Reconciled allocation.</strong> Add every measured title in the same platform week and the amounts return to the canonical company totals.</p>
      </aside>
    </div>
  );

  const renderTechnical = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <section className="std-story-panel is-wide">
        <div className="std-panel-heading"><div><span>PLAYBACK QUALITY</span><h2>Did the title start successfully?</h2></div><strong>{title.averagePlaybackSuccessRate!.toFixed(2)}%</strong></div>
        <StreamingLineGraph
          points={technicalPoints}
          label={`${title.entry.title} playback success rate`}
          valueFormatter={value => `${value.toFixed(2)}%`}
          primaryLabel="Playback success"
          tone="CYAN"
        />
      </section>
      <section className="std-health-console is-wide">
        <div><Gauge size={24} /><span>SIGNAL HEALTH</span><strong>{title.averagePlaybackSuccessRate! >= 99 ? 'STRONG' : title.averagePlaybackSuccessRate! >= 97 ? 'WATCH' : 'AT RISK'}</strong></div>
        <p>This is the title’s observed delivery outcome inside the same infrastructure week. It does not invent per-title server incidents that the platform never recorded.</p>
      </section>
    </div>
  );

  const renderFuture = (title: StreamingTitleDossierSummary) => (
    <div className="std-report-grid">
      <section className={`std-future-stage is-${title.momentum.toLowerCase()} is-wide`}>
        <div className="std-future-signal" aria-hidden="true"><span>{title.momentum === 'RISING' ? <TrendingUp size={34} /> : title.momentum === 'COOLING' ? <TrendingDown size={34} /> : <Activity size={34} />}</span></div>
        <div><span>DECISION OUTLOOK • {title.momentum}</span><h2>{title.futureOutlook}</h2><p>{title.nextQuestion}</p></div>
      </section>
      <section className="std-boundary-note is-wide">
        <LockKeyhole size={20} />
        <p><strong>Insight before authority.</strong> This page helps you understand the decision. Renewals, cancellations, sequel orders and contract actions stay in their proper later systems.</p>
      </section>
    </div>
  );

  const renderActiveReport = (title: StreamingTitleDossierSummary) => {
    if (title.reports[activeTab].status !== 'AVAILABLE') return <ReportGate selected={title} tab={activeTab} />;
    if (activeTab === 'OVERVIEW') return renderOverview(title);
    if (activeTab === 'AUDIENCE') return renderAudience(title);
    if (activeTab === 'ENGAGEMENT') return renderEngagement(title);
    if (activeTab === 'DISCOVERY') return renderDiscovery(title);
    if (activeTab === 'FINANCIALS') return renderFinancials(title);
    if (activeTab === 'TECHNICAL') return renderTechnical(title);
    return renderFuture(title);
  };

  return (
    <AccessibleDialog className="std-backdrop" role="dialog" aria-labelledby="std-title" onEscape={onClose}>
      <div className="std-shell" style={{ '--std-accent': player.ownedStreamingPlatform.identity?.primaryColor || '#69e4ff' } as React.CSSProperties}>
        <header className="std-topbar">
          <button type="button" className="std-icon-button" onClick={onClose} aria-label="Close title dossiers"><ArrowLeft size={20} /></button>
          <div className="std-brand">
            <span><Film size={19} /></span>
            <div><strong>Title Intelligence</strong><small>{player.ownedStreamingPlatform.identity?.name || 'EMPIRE+'} • performance dossiers</small></div>
          </div>
          <div className="std-live-chip"><i /> CANONICAL SIGNAL</div>
          <button type="button" className="std-icon-button is-x" onClick={onClose} aria-label="Close title dossiers"><X size={19} /></button>
        </header>

        {analytics.titles.length ? (
          <>
            <section className="std-title-vault" aria-label="Select a title dossier">
              <div className="std-vault-heading"><span>TITLE VAULT</span><strong>{analytics.titles.length} dossiers</strong></div>
              <div className="std-title-rail">
                {analytics.titles.map(item => (
                  <button
                    key={item.entry.projectId}
                    type="button"
                    className={selected?.entry.projectId === item.entry.projectId ? 'is-active' : ''}
                    onClick={() => selectTitle(item.entry.projectId)}
                  >
                    <span className="std-rail-art">{initialsFor(item.entry.title)}<i /></span>
                    <span><small>{sourceLabel(item.entry.source)}</small><strong>{item.entry.title}</strong><em>{item.measuredWeeks ? `${item.measuredWeeks} measured week${item.measuredWeeks === 1 ? '' : 's'}` : 'Not measured'}</em></span>
                  </button>
                ))}
              </div>
              <label className="std-mobile-title-select">
                <span>Selected title</span>
                <select value={selected?.entry.projectId || ''} onChange={event => selectTitle(event.target.value)}>
                  {analytics.titles.map(item => <option key={item.entry.projectId} value={item.entry.projectId}>{item.entry.title}</option>)}
                </select>
                <ChevronDown size={18} />
              </label>
            </section>

            {selected ? (
              <>
                <section className="std-hero">
                  <div className="std-hero-grid" aria-hidden="true" />
                  <div className="std-poster" aria-label={`${selected.entry.title} signal artwork`}>
                    <i className="std-poster-horizon" />
                    <span>{sourceLabel(selected.entry.source)}</span>
                    <strong>{initialsFor(selected.entry.title)}</strong>
                    <small>{selected.entry.genre.replaceAll('_', ' ')}</small>
                  </div>
                  <div className="std-hero-copy">
                    <span>{sourceLabel(selected.entry.source)} • {selected.entry.projectType === 'SERIES' ? 'SERIES' : 'MOVIE'}</span>
                    <h1 id="std-title">{selected.entry.title}</h1>
                    <p>{selected.entry.genre.replaceAll('_', ' ')} • {selected.entry.releasePattern.replaceAll('_', ' ')} release • {selected.entry.marketingPlan.toLowerCase()} launch plan</p>
                    <div>
                      <span><Clock3 size={14} /> Launch week {selected.entry.launchWeek}</span>
                      <span className={selected.measuredWeeks ? 'is-live' : ''}><Activity size={14} /> {selected.measuredWeeks ? `${selected.measuredWeeks} measured weeks` : 'Awaiting telemetry'}</span>
                    </div>
                  </div>
                  <div className={`std-hero-status is-${selected.momentum.toLowerCase()}`}>
                    <LineChart size={22} />
                    <span>PERFORMANCE SIGNAL</span>
                    <strong>{selected.measuredWeeks ? selected.momentum : 'NOT MEASURED'}</strong>
                    <small>{selected.measuredWeeks ? `Last observed week ${selected.latestMeasuredAbsoluteWeek}` : 'Advance a live week to begin'}</small>
                  </div>
                </section>

                <nav className="std-tabs" aria-label="Title dossier reports">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const report = selected.reports[tab.id];
                    return (
                      <button key={tab.id} type="button" className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>
                        <Icon size={16} /><span>{tab.label}</span><i className={`is-${report.status.toLowerCase().replace('_', '-')}`} />
                      </button>
                    );
                  })}
                </nav>

                <main className="std-main">
                  <header className="std-report-heading">
                    <div><span>{activeTab} REPORT</span><h2>{selected.entry.title}</h2></div>
                    <span className={`is-${selected.reports[activeTab].status.toLowerCase().replace('_', '-')}`}>
                      {selected.reports[activeTab].status.replace('_', ' ')}
                    </span>
                  </header>
                  {renderActiveReport(selected)}
                </main>
              </>
            ) : null}
          </>
        ) : (
          <main className="std-empty-vault">
            <span><Film size={36} /></span>
            <h1 id="std-title">The title vault is empty.</h1>
            <p>Program the canonical twelve-week slate before opening title intelligence.</p>
            <button type="button" onClick={onClose}>Return to Content Room</button>
          </main>
        )}
      </div>
    </AccessibleDialog>
  );
}
