import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  CircleDot,
  CloudLightning,
  Gauge,
  Globe2,
  RadioTower,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react';
import type {
  OwnedStreamingLaunchCommit,
  Player,
  StreamingHqSection,
  StreamingLaunchCapacityPlan,
} from '../types';
import {
  commitOwnedStreamingLaunch,
  getStreamingLaunchReadiness,
} from '../services/streamingLaunch';
import AccessibleDialog from './AccessibleDialog';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-launch.css';

interface CommandProps {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onNavigate: (section: StreamingHqSection) => void;
}

const formatMoney = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCapacity = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${Math.round(value / 1_000)}K`;
};

const PLAN_ICONS = {
  STANDARD: Rocket,
  CLOUD_BURST: CloudLightning,
  STAGGERED_PREMIERE: TimerReset,
} as const;

export default function StreamingLaunchCommand({
  player,
  onUpdatePlayer,
  onClose,
  onNavigate,
}: CommandProps) {
  const readiness = useMemo(() => getStreamingLaunchReadiness(player), [player]);
  const recommended = readiness.capacityOptions.find(option => option.headroomPercent >= 10 && option.canAfford)
    || readiness.capacityOptions.find(option => option.canAfford)
    || readiness.capacityOptions[0];
  const [selectedPlan, setSelectedPlan] = useState<StreamingLaunchCapacityPlan>(recommended.id);
  const [feedback, setFeedback] = useState('');
  const option = readiness.capacityOptions.find(candidate => candidate.id === selectedPlan) || readiness.capacityOptions[0];

  const navigate = (section: StreamingHqSection) => {
    onClose();
    onNavigate(section);
  };

  const commitLaunch = () => {
    const result = commitOwnedStreamingLaunch(player, selectedPlan);
    if (!result.changed) {
      const message = result.reason === 'BLOCKED'
        ? 'Resolve the red launch blockers before committing premiere night.'
        : result.reason === 'INSUFFICIENT_TREASURY'
          ? 'Company treasury cannot fund this launch-night response.'
          : result.reason === 'ALREADY_LIVE'
            ? 'The platform has already launched. Its committed outcome cannot be rerolled.'
            : 'Choose a valid launch-night response.';
      setFeedback(message);
      return;
    }
    onUpdatePlayer(result.player);
    onClose();
  };

  return (
    <AccessibleDialog
      className="streaming-launch-backdrop"
      role="dialog"
      aria-labelledby="streaming-launch-title"
      onEscape={onClose}
    >
      <div className="streaming-launch-command">
        <header className="launch-command-topbar">
          <button type="button" onClick={onClose} aria-label="Close Launch Command">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>PHASE 8 • FINAL COMMAND CENTRE</span>
            <strong>Launch Command</strong>
          </div>
          <span className={`launch-readiness-chip is-${readiness.canLaunch ? 'ready' : 'blocked'}`}>
            <i />
            {readiness.canLaunch ? 'COMMIT WINDOW OPEN' : `${readiness.blockerCount} BLOCKER${readiness.blockerCount === 1 ? '' : 'S'}`}
          </span>
        </header>

        <main className="launch-command-scroll">
          <StreamingVisualScene
            sceneId="commandDeck"
            className="launch-command-scene"
            imageLoading="eager"
            eyebrow="T-MINUS • PREMIERE NIGHT"
            title="One signal. Every screen."
            description="The forecast is live. Every red light below comes from a real company record; every launch outcome will be committed before the cameras roll."
            status={{
              label: `${readiness.score}% READY`,
              detail: readiness.reachLabel,
              tone: readiness.canLaunch ? 'success' : 'critical',
            }}
          >
            <div className="launch-hero-telemetry" aria-label="Launch forecast">
              <span><RadioTower size={15} /> Likely peak <strong>{formatCapacity(readiness.forecastLikelyConcurrentStreams)}</strong></span>
              <span><Gauge size={15} /> High case <strong>{formatCapacity(readiness.forecastHighConcurrentStreams)}</strong></span>
              <span><Banknote size={15} /> Runway <strong>{Math.floor(readiness.runwayWeeks)} weeks</strong></span>
            </div>
          </StreamingVisualScene>

          <section className="launch-command-grid">
            <div className="launch-main-column">
              <section className="launch-panel launch-readiness-panel">
                <header>
                  <div>
                    <span className="launch-eyebrow">GO / NO-GO BOARD</span>
                    <h2 id="streaming-launch-title">Final readiness forecast</h2>
                  </div>
                  <strong>{readiness.items.filter(item => item.tone === 'READY').length}/{readiness.items.length}</strong>
                </header>
                <div className="launch-readiness-track" aria-label={`${readiness.score}% launch readiness`}>
                  <span style={{ width: `${readiness.score}%` }} />
                </div>
                <div className="launch-readiness-list">
                  {readiness.items.map(item => (
                    <article key={item.id} className={`is-${item.tone.toLowerCase()}`}>
                      <span className="launch-status-icon">
                        {item.tone === 'READY' ? <Check size={16} /> : item.tone === 'WATCH' ? <AlertTriangle size={16} /> : <X size={16} />}
                      </span>
                      <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                      <button type="button" onClick={() => navigate(item.destination)}>
                        Fix in {item.destination.toLowerCase()} <ChevronRight size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="launch-panel launch-capacity-panel">
                <header>
                  <div>
                    <span className="launch-eyebrow">EMERGENCY CAPACITY</span>
                    <h2>Choose how the gates open.</h2>
                  </div>
                  <span className="launch-recommendation">RECOMMENDED • {recommended.title}</span>
                </header>
                <div className="launch-capacity-options">
                  {readiness.capacityOptions.map(candidate => {
                    const Icon = PLAN_ICONS[candidate.id];
                    const selected = selectedPlan === candidate.id;
                    return (
                      <button
                        type="button"
                        key={candidate.id}
                        className={selected ? 'is-selected' : ''}
                        onClick={() => setSelectedPlan(candidate.id)}
                        disabled={!candidate.canAfford}
                        aria-pressed={selected}
                      >
                        <span className="launch-option-icon"><Icon size={22} /></span>
                        <span className="launch-option-copy">
                          <small>{candidate.kicker}</small>
                          <strong>{candidate.title}</strong>
                          <p>{candidate.description}</p>
                        </span>
                        <span className="launch-option-numbers">
                          <small>{candidate.cost ? formatMoney(candidate.cost) : 'NO EXTRA COST'}</small>
                          <strong className={candidate.headroomPercent >= 10 ? 'is-positive' : 'is-negative'}>
                            {candidate.headroomPercent >= 0 ? '+' : ''}{candidate.headroomPercent}% headroom
                          </strong>
                        </span>
                        <span className="launch-option-consequence">{candidate.canAfford ? candidate.consequence : 'Treasury cannot cover this response'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="launch-side-column">
              <section className="launch-panel launch-demand-panel">
                <header>
                  <div>
                    <span className="launch-eyebrow">DEMAND MAP</span>
                    <h2>Where opening night lives</h2>
                  </div>
                  <Globe2 size={21} />
                </header>
                <div className="launch-demand-orbit" aria-hidden="true">
                  <span className="is-orbit-one" />
                  <span className="is-orbit-two" />
                  <i className="is-node-one" />
                  <i className="is-node-two" />
                  <i className="is-node-three" />
                  <Globe2 size={46} />
                </div>
                <div className="launch-region-list">
                  {readiness.demandRegions.map(region => (
                    <div key={region.id}>
                      <span><i className={`is-${region.intensity.toLowerCase()}`} />{region.label}</span>
                      <strong>{region.demandSharePercent}%</strong>
                    </div>
                  ))}
                </div>
                <p>This is a modeled demand distribution from earned reach—not live market share.</p>
              </section>

              <section className="launch-panel launch-commit-card">
                <span className="launch-eyebrow">COMMIT PREVIEW</span>
                <div className="launch-commit-mark"><ShieldCheck size={24} /></div>
                <h2>{option.title}</h2>
                <p>Protected peak</p>
                <strong>{formatCapacity(option.protectedPeakConcurrentStreams)} streams</strong>
                <dl>
                  <div><dt>Opening slate</dt><dd>{readiness.openingTitleCount} titles</dd></div>
                  <div><dt>Headline Original</dt><dd>{readiness.openingOriginalTitle}</dd></div>
                  <div><dt>Treasury charge</dt><dd>{formatMoney(option.cost)}</dd></div>
                </dl>
                {feedback ? <p className="launch-feedback" role="alert">{feedback}</p> : null}
                <button
                  type="button"
                  className="launch-commit-button"
                  onClick={commitLaunch}
                  disabled={!readiness.canLaunch || !option.canAfford}
                >
                  <Rocket size={18} />
                  {readiness.canLaunch ? 'Commit platform launch' : 'Resolve blockers to launch'}
                </button>
                <small><BadgeCheck size={13} /> Result locks before the premiere cinematic begins.</small>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </AccessibleDialog>
  );
}

interface PremiereProps {
  player: Player;
  launchCommit: OwnedStreamingLaunchCommit;
  onFinish: (status: 'VIEWED' | 'DISMISSED') => void;
}

export function StreamingPremiereNight({ player, launchCommit, onFinish }: PremiereProps) {
  const platformName = player.ownedStreamingPlatform.identity?.name || 'EMPIRE+';
  const outcomeLabel = launchCommit.outcomeTier === 'SMOOTH_OPENING'
    ? 'THE SIGNAL HOLDS'
    : launchCommit.outcomeTier === 'PRESSURED_OPENING'
      ? 'THE NETWORK BENDS—AND HOLDS'
      : 'THE CROWD ARRIVES FASTER THAN THE STACK';
  return (
    <AccessibleDialog
      className="streaming-premiere-backdrop"
      role="dialog"
      aria-labelledby="streaming-premiere-title"
      onEscape={() => onFinish('DISMISSED')}
    >
      <div className={`streaming-premiere-night is-${launchCommit.outcomeTier.toLowerCase()}`}>
        <button type="button" className="premiere-close" onClick={() => onFinish('DISMISSED')} aria-label="Skip premiere cinematic"><X size={20} /></button>
        <div className="premiere-stage" aria-hidden="true">
          <span className="premiere-beam is-left" />
          <span className="premiere-beam is-right" />
          <span className="premiere-world"><Globe2 size={72} /></span>
          <span className="premiere-signal-ring is-one" />
          <span className="premiere-signal-ring is-two" />
          <span className="premiere-signal-ring is-three" />
        </div>
        <span className="premiere-kicker">PREMIERE NIGHT • COMMITTED RESULT</span>
        <h1 id="streaming-premiere-title">{platformName} is live.</h1>
        <p className="premiere-outcome">{outcomeLabel}</p>
        <div className="premiere-facts">
          <article><span>OPENING AUDIENCE</span><strong>{launchCommit.initialSubscribers.toLocaleString()}</strong><small>committed subscribers</small></article>
          <article><span>PLAYBACK SUCCESS</span><strong>{launchCommit.playbackSuccessRate.toFixed(2)}%</strong><small>launch-night delivery</small></article>
          <article><span>HEADLINE ORIGINAL</span><strong>{launchCommit.openingOriginalTitle}</strong><small>{launchCommit.openingTitleCount}-title opening slate</small></article>
        </div>
        <div className="premiere-ticker">
          <Sparkles size={15} />
          <span>{launchCommit.capacityPlan.replace(/_/g, ' ')} • demand index {launchCommit.openingDemandIndex} • {launchCommit.launchHeadroomPercent >= 0 ? '+' : ''}{launchCommit.launchHeadroomPercent}% peak headroom</span>
        </div>
        <button type="button" className="premiere-enter" onClick={() => onFinish('VIEWED')}>
          Enter the live Command Centre <ChevronRight size={18} />
        </button>
        <button type="button" className="premiere-skip" onClick={() => onFinish('DISMISSED')}>Skip cinematic</button>
        <div className="premiere-lock-note"><CircleDot size={13} /> These facts were committed before this scene opened.</div>
      </div>
    </AccessibleDialog>
  );
}
