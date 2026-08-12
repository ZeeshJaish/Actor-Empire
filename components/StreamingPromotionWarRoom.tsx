import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Compass,
  Eye,
  Film,
  FlaskConical,
  Gauge,
  Images,
  LayoutPanelTop,
  LockKeyhole,
  MapPin,
  Megaphone,
  Play,
  RadioTower,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Tv,
  UsersRound,
  X,
} from 'lucide-react';
import type {
  Player,
  StreamingArtworkVariant,
  StreamingCampaignChannelId,
  StreamingHomepagePlacement,
  StreamingRecommendationObjective,
} from '../types';
import {
  STREAMING_ARTWORK_VARIANTS,
  STREAMING_CAMPAIGN_CHANNELS,
  STREAMING_HOMEPAGE_PLACEMENTS,
  STREAMING_RECOMMENDATION_OBJECTIVES,
  getStreamingPromotionCenter,
  lockStreamingGrowthAction,
  previewStreamingGrowthAction,
  type StreamingGrowthDraft,
} from '../services/streamingPromotion';
import AccessibleDialog from './AccessibleDialog';
import { formatStreamingAnalyticsCompact } from './streaming-analytics/StreamingGraphSystem';
import '../styles/streaming-promotion.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  initialProjectId?: string | null;
}

type WarRoomTab = 'CAMPAIGN' | 'RECOMMENDATION' | 'CREATIVE' | 'ATTRIBUTION';

const tabs: Array<{ id: WarRoomTab; label: string; icon: typeof Megaphone }> = [
  { id: 'CAMPAIGN', label: 'Campaign', icon: Megaphone },
  { id: 'RECOMMENDATION', label: 'Recommendation', icon: BrainCircuit },
  { id: 'CREATIVE', label: 'Artwork Test', icon: Images },
  { id: 'ATTRIBUTION', label: 'Attribution', icon: BarChart3 },
];

const channelIcons: Record<StreamingCampaignChannelId, typeof Megaphone> = {
  TRAILER: Play,
  BILLBOARD: Building2,
  SOCIAL: Share2,
  REGIONAL: MapPin,
};

const placementIcons: Record<StreamingHomepagePlacement, typeof LayoutPanelTop> = {
  NONE: Eye,
  HERO: LayoutPanelTop,
  TOP_TEN: TrendingUp,
  GENRE_SPOTLIGHT: Film,
};

const recommendationIcons: Record<StreamingRecommendationObjective, typeof BrainCircuit> = {
  BALANCED: Gauge,
  RETENTION: UsersRound,
  CATALOG_DISCOVERY: Compass,
  BREAKOUT: RadioTower,
};

const formatMoney = (value: number): string => `$${formatStreamingAnalyticsCompact(value)}`;
const initialsFor = (title: string): string => title
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(word => word[0])
  .join('')
  .toUpperCase();

const artworkClass = (variant: StreamingArtworkVariant): string => variant.toLowerCase().replace('_', '-');

export default function StreamingPromotionWarRoom({
  player,
  onUpdatePlayer,
  onClose,
  initialProjectId,
}: Props) {
  const center = useMemo(() => getStreamingPromotionCenter(player), [player]);
  const initialTitle = center.eligibleTitles.find(title => title.projectId === initialProjectId)
    || center.eligibleTitles[0]
    || null;
  const [activeTab, setActiveTab] = useState<WarRoomTab>(center.appliedActions.length ? 'CAMPAIGN' : 'CAMPAIGN');
  const [projectId, setProjectId] = useState(initialTitle?.projectId || '');
  const [channels, setChannels] = useState<StreamingCampaignChannelId[]>(['SOCIAL']);
  const [homepagePlacement, setHomepagePlacement] = useState<StreamingHomepagePlacement>('TOP_TEN');
  const [recommendationObjective, setRecommendationObjective] = useState<StreamingRecommendationObjective>('BALANCED');
  const [explorationPercent, setExplorationPercent] = useState(25);
  const [artworkVariants, setArtworkVariants] = useState<StreamingArtworkVariant[]>([]);
  const [feedback, setFeedback] = useState('');

  const selectedTitle = center.eligibleTitles.find(title => title.projectId === projectId)
    || center.eligibleTitles[0]
    || null;
  const draft: StreamingGrowthDraft = {
    projectId: selectedTitle?.projectId || '',
    channels,
    homepagePlacement,
    recommendationObjective,
    explorationPercent,
    artworkVariants,
  };
  const preview = useMemo(
    () => previewStreamingGrowthAction(player, draft),
    [player, projectId, channels, homepagePlacement, recommendationObjective, explorationPercent, artworkVariants],
  );
  const canAfford = preview.cashCost <= player.ownedStreamingPlatform.treasuryCash;
  const locked = center.lockedAction;

  const toggleChannel = (channelId: StreamingCampaignChannelId) => {
    setChannels(current => current.includes(channelId)
      ? current.filter(id => id !== channelId)
      : [...current, channelId]);
  };

  const toggleArtwork = (variant: StreamingArtworkVariant) => {
    setArtworkVariants(current => {
      if (current.includes(variant)) return current.filter(item => item !== variant);
      if (current.length >= 2) return [current[1], variant];
      return [...current, variant];
    });
  };

  const lockPlan = () => {
    const result = lockStreamingGrowthAction(player, draft);
    if (!result.changed) {
      const copy = {
        NOT_LIVE: 'Launch the platform before opening a growth week.',
        NO_ELIGIBLE_TITLE: 'Choose a title available in the next program week.',
        ALREADY_LOCKED: 'The next growth week is already locked.',
        INSUFFICIENT_TREASURY: 'Platform treasury cannot cover this action.',
        NO_MEANINGFUL_CHANGE: 'Change at least one campaign, placement, recommendation or artwork control.',
      };
      setFeedback(copy[result.reason!] || 'The action could not be locked.');
      return;
    }
    setFeedback(`${result.action?.title} is locked for platform week ${result.action?.targetAbsoluteWeek}. No cash moved early.`);
    onUpdatePlayer(result.player);
  };

  const renderTitleSelector = () => (
    <section className="spw-title-selector">
      <div className="spw-section-label"><span>TARGET TITLE</span><strong>{center.eligibleTitles.length} eligible</strong></div>
      <div className="spw-title-rail">
        {center.eligibleTitles.map(title => (
          <button
            key={title.projectId}
            type="button"
            className={selectedTitle?.projectId === title.projectId ? 'is-active' : ''}
            onClick={() => setProjectId(title.projectId)}
            disabled={Boolean(locked)}
          >
            <span>{initialsFor(title.title)}<i /></span>
            <div><small>{title.source.replaceAll('_', ' ')}</small><strong>{title.title}</strong><em>Program week {title.launchWeek}</em></div>
            {selectedTitle?.projectId === title.projectId ? <Check size={16} /> : null}
          </button>
        ))}
      </div>
      <label className="spw-mobile-title">
        <span>Target title</span>
        <select value={selectedTitle?.projectId || ''} onChange={event => setProjectId(event.target.value)} disabled={Boolean(locked)}>
          {center.eligibleTitles.map(title => <option key={title.projectId} value={title.projectId}>{title.title}</option>)}
        </select>
        <ChevronDown size={17} />
      </label>
    </section>
  );

  const renderCampaign = () => (
    <div className="spw-work-grid">
      <section className="spw-control-stage is-wide">
        <div className="spw-panel-head">
          <div><span>VIEWER HOME CONTROL WALL</span><h2>Choose where the title enters the room.</h2></div>
          <LayoutPanelTop size={22} />
        </div>
        <div className="spw-home-preview">
          <div className={`spw-home-hero is-${homepagePlacement.toLowerCase().replace('_', '-')}`}>
            <span>{initialsFor(selectedTitle?.title || 'Title')}</span>
            <div><small>{homepagePlacement === 'HERO' ? 'FEATURED TONIGHT' : 'YOUR NEXT WATCH'}</small><strong>{selectedTitle?.title || 'Select a title'}</strong><i /></div>
            <Play size={20} />
          </div>
          <div className="spw-home-rows" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        </div>
        <div className="spw-placement-grid">
          {STREAMING_HOMEPAGE_PLACEMENTS.map(placement => {
            const Icon = placementIcons[placement.id];
            return (
              <button
                key={placement.id}
                type="button"
                className={homepagePlacement === placement.id ? 'is-active' : ''}
                onClick={() => setHomepagePlacement(placement.id)}
                disabled={Boolean(locked)}
              >
                <span><Icon size={18} /></span>
                <div><strong>{placement.label}</strong><p>{placement.description}</p></div>
                <em>{placement.cashCost ? formatMoney(placement.cashCost) : 'ORGANIC'}</em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="spw-control-stage is-wide">
        <div className="spw-panel-head">
          <div><span>PAID REACH MIX</span><h2>Build the campaign people encounter outside the app.</h2></div>
          <Megaphone size={22} />
        </div>
        <div className="spw-channel-grid">
          {STREAMING_CAMPAIGN_CHANNELS.map(channel => {
            const Icon = channelIcons[channel.id];
            const active = channels.includes(channel.id);
            return (
              <button key={channel.id} type="button" className={active ? 'is-active' : ''} onClick={() => toggleChannel(channel.id)} disabled={Boolean(locked)}>
                <div className="spw-channel-visual">
                  <i /><i />
                  <span><Icon size={24} /></span>
                  {active ? <BadgeCheck size={17} /> : null}
                </div>
                <small>{channel.kicker}</small>
                <strong>{channel.label}</strong>
                <p>{channel.description}</p>
                <footer><span>{formatMoney(channel.cashCost)}</span><em>+{(channel.acquisitionRateDelta * 10_000).toFixed(0)} demand bps</em></footer>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderRecommendation = () => (
    <div className="spw-work-grid">
      <section className="spw-algorithm-stage is-wide">
        <div className="spw-panel-head">
          <div><span>RECOMMENDATION MANDATE</span><h2>Tell the system what success means this week.</h2></div>
          <BrainCircuit size={23} />
        </div>
        <div className="spw-objective-grid">
          {STREAMING_RECOMMENDATION_OBJECTIVES.map(objective => {
            const Icon = recommendationIcons[objective.id];
            return (
              <button
                key={objective.id}
                type="button"
                className={recommendationObjective === objective.id ? 'is-active' : ''}
                onClick={() => setRecommendationObjective(objective.id)}
                disabled={Boolean(locked)}
              >
                <span><Icon size={21} /></span>
                <strong>{objective.label}</strong>
                <p>{objective.description}</p>
                <small>{objective.tradeoff}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="spw-exploration-console">
        <div className="spw-panel-head"><div><span>DISCOVERY TRADEOFF</span><h2>Known hits versus unseen catalog</h2></div><SlidersHorizontal size={21} /></div>
        <div className="spw-orbit" aria-hidden="true">
          <i /><i /><i />
          <span className="is-core"><BrainCircuit size={25} /></span>
          <span className="is-title">{initialsFor(selectedTitle?.title || 'T')}</span>
          <span className="is-catalog">01</span>
          <span className="is-catalog">02</span>
          <span className="is-catalog">03</span>
        </div>
        <label htmlFor="spw-exploration">
          <span><strong>Exploit proven signals</strong><em>Explore deep catalog</em></span>
          <input
            id="spw-exploration"
            type="range"
            min="10"
            max="45"
            value={explorationPercent}
            onChange={event => setExplorationPercent(Number(event.target.value))}
            disabled={Boolean(locked)}
          />
          <b>{explorationPercent}% exploration</b>
        </label>
      </section>

      <section className="spw-tradeoff-readout">
        <span>LIVE MODEL</span>
        <div><strong>{preview.engagementRateDelta >= 0 ? '+' : ''}{(preview.engagementRateDelta * 100).toFixed(1)}%</strong><small>Engagement rate modifier</small></div>
        <div><strong>{preview.churnRateDelta > 0 ? '+' : ''}{(preview.churnRateDelta * 100).toFixed(2)}%</strong><small>Churn-rate modifier</small></div>
        <div><strong>{preview.longTailWeightBoost >= 0 ? '+' : ''}{preview.longTailWeightBoost.toFixed(2)}</strong><small>Deep-catalog weight</small></div>
        <p>These are modifiers entering next week’s simulation—not guaranteed outcomes.</p>
      </section>
    </div>
  );

  const renderCreative = () => (
    <div className="spw-work-grid">
      <section className="spw-creative-stage is-wide">
        <div className="spw-panel-head">
          <div><span>ARTWORK EXPERIMENT</span><h2>Select two promises. Let viewers decide.</h2><p>Choose exactly two variants to run an A/B test next week.</p></div>
          <FlaskConical size={22} />
        </div>
        <div className="spw-artwork-grid">
          {STREAMING_ARTWORK_VARIANTS.map(variant => {
            const selected = artworkVariants.includes(variant.id);
            return (
              <button
                key={variant.id}
                type="button"
                className={selected ? 'is-selected' : ''}
                onClick={() => toggleArtwork(variant.id)}
                disabled={Boolean(locked)}
              >
                <div className={`spw-art-card is-${artworkClass(variant.id)}`}>
                  <i />
                  <span>{selectedTitle?.source === 'ORIGINAL' ? 'ORIGINAL' : 'NOW STREAMING'}</span>
                  <strong>{initialsFor(selectedTitle?.title || 'T')}</strong>
                  <small>{variant.signal}</small>
                </div>
                <div><span>{selected ? `VARIANT ${artworkVariants.indexOf(variant.id) === 0 ? 'A' : 'B'}` : 'AVAILABLE'}</span><strong>{variant.label}</strong><p>{variant.description}</p></div>
                {selected ? <Check size={18} /> : null}
              </button>
            );
          })}
        </div>
        <aside className={`spw-test-status is-${artworkVariants.length === 2 ? 'ready' : 'idle'}`}>
          {artworkVariants.length === 2 ? <BadgeCheck size={20} /> : <Images size={20} />}
          <div><strong>{artworkVariants.length === 2 ? 'A/B test armed' : 'Artwork test optional'}</strong><p>{artworkVariants.length === 2 ? 'The winning creative and observed conversion lift will be committed with next week’s attribution.' : 'Select two variants to add the test. No fake winner is shown before viewers respond.'}</p></div>
          <span>{artworkVariants.length === 2 ? '$240K' : 'NO COST'}</span>
        </aside>
      </section>
    </div>
  );

  const renderAttribution = () => (
    <div className="spw-attribution-feed">
      {center.appliedActions.length ? center.appliedActions.map(action => {
        const outcome = action.outcome;
        const discovery = outcome?.observedDiscoveryMix;
        return (
          <article key={action.id}>
            <header>
              <div><span>WEEK {action.targetAbsoluteWeek} • COMMITTED RESULT</span><h2>{action.title}</h2><p>{action.channels.length ? action.channels.map(channel => channel.toLowerCase()).join(' + ') : 'Algorithm-only action'} • {action.recommendationObjective.toLowerCase().replaceAll('_', ' ')}</p></div>
              <BadgeCheck size={23} />
            </header>
            {outcome ? (
              <>
                <div className="spw-attribution-metrics">
                  <div><UsersRound size={17} /><span>Attributed joins</span><strong>{formatStreamingAnalyticsCompact(outcome.attributedJoins)}</strong></div>
                  <div><Eye size={17} /><span>Incremental viewing</span><strong>{formatStreamingAnalyticsCompact(outcome.attributedViewingAccounts)}</strong></div>
                  <div><CircleDollarSign size={17} /><span>Cost / join</span><strong>{outcome.costPerAttributedJoin === null ? 'NOT MEASURED' : formatMoney(outcome.costPerAttributedJoin)}</strong></div>
                  <div><FlaskConical size={17} /><span>Artwork winner</span><strong>{outcome.artworkWinner?.replaceAll('_', ' ') || 'NO TEST'}</strong></div>
                </div>
                {discovery ? (
                  <div className="spw-discovery-result">
                    <div><span>OBSERVED DISCOVERY MIX</span><strong>{action.explorationPercent}% exploration</strong></div>
                    <div className="spw-discovery-stack" aria-label="Observed discovery mix">
                      <i className="is-home" style={{ width: `${discovery.homepagePercent}%` }} />
                      <i className="is-recommendation" style={{ width: `${discovery.recommendationsPercent}%` }} />
                      <i className="is-search" style={{ width: `${discovery.searchPercent}%` }} />
                      <i className="is-direct" style={{ width: `${discovery.directPercent}%` }} />
                    </div>
                    <ul>
                      <li><i className="is-home" />Homepage {discovery.homepagePercent}%</li>
                      <li><i className="is-recommendation" />Recommendations {discovery.recommendationsPercent}%</li>
                      <li><i className="is-search" />Search {discovery.searchPercent}%</li>
                      <li><i className="is-direct" />Direct {discovery.directPercent}%</li>
                    </ul>
                  </div>
                ) : null}
                <footer><Activity size={17} /><p>{outcome.summary}</p><strong>{formatMoney(action.cashCost)} spent</strong></footer>
              </>
            ) : <div className="spw-pending-result"><Clock3 size={20} /> Attribution is still being committed.</div>}
          </article>
        );
      }) : (
        <section className="spw-empty-attribution">
          <span><BarChart3 size={34} /></span>
          <h2>No campaign has completed yet.</h2>
          <p>Lock a growth action, advance one real game week and return here. Attribution stays pending until canonical audience results exist.</p>
          <button type="button" onClick={() => setActiveTab('CAMPAIGN')}>Build first action <ChevronRight size={17} /></button>
        </section>
      )}
    </div>
  );

  const renderLockedState = () => locked ? (
    <section className="spw-locked-banner">
      <div className="spw-locked-signal"><LockKeyhole size={25} /><i /></div>
      <div><span>NEXT GROWTH WEEK LOCKED</span><h2>{locked.title} is in market.</h2><p>{locked.channels.length ? locked.channels.map(channel => channel.toLowerCase()).join(' + ') : 'Algorithm-only'} • {locked.homepagePlacement.toLowerCase().replaceAll('_', ' ')} • {locked.recommendationObjective.toLowerCase().replaceAll('_', ' ')} • {formatMoney(locked.cashCost)}</p></div>
      <strong>RESOLVES WEEK {locked.targetAbsoluteWeek}</strong>
    </section>
  ) : null;

  return (
    <AccessibleDialog className="spw-backdrop" role="dialog" aria-labelledby="spw-title" onEscape={onClose}>
      <div className="spw-shell" style={{ '--spw-accent': player.ownedStreamingPlatform.identity?.primaryColor || '#72e5ff' } as React.CSSProperties}>
        <header className="spw-topbar">
          <button type="button" className="spw-close" onClick={onClose} aria-label="Close Growth War Room"><ArrowLeft size={20} /></button>
          <div className="spw-brand"><span><Megaphone size={19} /></span><div><strong>Growth War Room</strong><small>{player.ownedStreamingPlatform.identity?.name || 'EMPIRE+'} • auditable discovery control</small></div></div>
          <div className="spw-week-chip"><i /> NEXT ACTION • W{center.targetAbsoluteWeek}</div>
          <button type="button" className="spw-close is-x" onClick={onClose} aria-label="Close Growth War Room"><X size={19} /></button>
        </header>

        <section className="spw-hero">
          <div className="spw-hero-grid" aria-hidden="true" />
          <div>
            <span>PHASE 14 • PROMOTION & RECOMMENDATIONS</span>
            <h1 id="spw-title">Turn attention into a decision.</h1>
            <p>Shape discovery now. The weekly simulation—not this screen—decides what the audience actually does.</p>
          </div>
          <div className="spw-radar" aria-hidden="true"><i /><i /><i /><span><Target size={28} /></span><b /><b /><b /></div>
          <div className="spw-trust-strip"><BadgeCheck size={16} /><span>Actions create modifiers</span><i /><BarChart3 size={16} /><span>Results create attribution</span><i /><LockKeyhole size={16} /><span>No direct subscriber grants</span></div>
        </section>

        {renderTitleSelector()}
        {renderLockedState()}

        <nav className="spw-tabs" aria-label="Growth War Room areas">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>
                <Icon size={17} /><span>{tab.label}</span>
                {tab.id === 'ATTRIBUTION' && center.appliedActions.length ? <em>{center.appliedActions.length}</em> : null}
              </button>
            );
          })}
        </nav>

        <main className="spw-main">
          {activeTab === 'CAMPAIGN' ? renderCampaign() : null}
          {activeTab === 'RECOMMENDATION' ? renderRecommendation() : null}
          {activeTab === 'CREATIVE' ? renderCreative() : null}
          {activeTab === 'ATTRIBUTION' ? renderAttribution() : null}
        </main>

        {activeTab !== 'ATTRIBUTION' ? (
          <aside className="spw-command-bar">
            <div className="spw-command-score"><span><Gauge size={18} /></span><div><small>REACH MODEL</small><strong>{preview.reachScore}/100</strong></div></div>
            <div className="spw-command-forecast">
              <small>{preview.confidenceLabel} • ATTRIBUTED JOIN RANGE</small>
              <strong>{formatStreamingAnalyticsCompact(preview.estimatedAttributedJoinsLow)}–{formatStreamingAnalyticsCompact(preview.estimatedAttributedJoinsHigh)}</strong>
              <span>Not guaranteed • resolves next week</span>
            </div>
            <div className="spw-command-cost"><small>CAMPAIGN CASH</small><strong>{formatMoney(preview.cashCost)}</strong><span>{formatMoney(player.ownedStreamingPlatform.treasuryCash)} treasury</span></div>
            <button type="button" onClick={lockPlan} disabled={Boolean(locked) || !preview.hasMeaningfulChange || !canAfford || !selectedTitle}>
              {locked ? <><LockKeyhole size={17} /> Action locked</> : !canAfford ? <><AlertTriangle size={17} /> Treasury too low</> : <>Lock next growth week <ChevronRight size={17} /></>}
            </button>
          </aside>
        ) : null}
        {preview.warnings.length && activeTab !== 'ATTRIBUTION' ? (
          <div className="spw-warning-ticker"><AlertTriangle size={15} /><span>{preview.warnings[0]}</span></div>
        ) : null}
        <div className="spw-feedback" aria-live="polite">{feedback}</div>
      </div>
    </AccessibleDialog>
  );
}
