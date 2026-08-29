import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Clapperboard,
  Crown,
  Film,
  Landmark,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import type { Player } from '../types';
import {
  DEFAULT_STREAMING_COMMERCIAL_POLICY,
  resolveStreamingAccess,
  type StreamingCommercialPolicy,
  type StreamingEntitlementStatus,
} from '../services/streamingAccessPolicy';
import {
  claimStreamingLaunchEligibility,
  evaluateStreamingEligibility,
  type StreamingLaunchMetric,
} from '../services/streamingEligibility';
import AccessibleDialog from './AccessibleDialog';
import StreamingFoundingWizard from './StreamingFoundingWizard';
import StreamingPlatformHQ from './StreamingPlatformHQ';
import StreamingFoundingJourney from './StreamingFoundingJourney';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-lock.css';

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack?: () => void;
  onReturnToGame?: () => void;
  commercialPolicy?: StreamingCommercialPolicy;
  entitlementStatus?: StreamingEntitlementStatus;
  onRetryAccess?: () => void;
  onOpenOriginalProduction?: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
  onOpenBank?: () => void;
  initialDestination?: 'HOME' | 'FINANCE';
}

const formatCompactMoney = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const formatMetricValue = (metric: StreamingLaunchMetric, value: number): string => (
  metric.unit === 'MONEY' ? formatCompactMoney(value) : Math.round(value).toLocaleString()
);

const metricIcon = (metric: StreamingLaunchMetric) => {
  if (metric.id === 'LIQUID_CASH') return WalletCards;
  if (metric.id === 'FAME') return UsersRound;
  return ShieldCheck;
};

const CONTROL_ROOMS = [
  {
    id: 'company',
    eyebrow: 'FOUND & FINANCE',
    title: 'Own the company',
    copy: 'Control treasury, executives, ownership and future board decisions.',
    icon: Crown,
    image: '/assets/streaming/scenes/company-finance.webp',
  },
  {
    id: 'content',
    eyebrow: 'PROGRAM & LICENSE',
    title: 'Build the library',
    copy: 'Acquire rights, commission Originals and program a twelve-week slate.',
    icon: Clapperboard,
    image: '/assets/streaming/scenes/content-studio.webp',
  },
  {
    id: 'technology',
    eyebrow: 'BUILD & SCALE',
    title: 'Engineer the signal',
    copy: 'Buy real capacity, pressure-test peak demand and grow from Level 0.',
    icon: Server,
    image: '/assets/streaming/scenes/network-operations-centre.webp',
  },
  {
    id: 'audience',
    eyebrow: 'DESIGN & RETAIN',
    title: 'Face the audience',
    copy: 'Shape pricing, discovery, engagement, churn and the public product.',
    icon: BrainCircuit,
    image: '/assets/streaming/scenes/viewer-lab.webp',
  },
] as const;

function LazyRoomArtwork({ src }: { src: string }) {
  const [available, setAvailable] = useState(true);
  if (!available) return null;
  return (
    <img
      className="stream-entry-room-art"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setAvailable(false)}
    />
  );
}

function AccessUnavailable({
  state,
  onBack,
  onRetry,
}: {
  state: 'CHECKING_ACCESS' | 'ACCESS_ERROR' | 'ACCESS_REQUIRED';
  onBack: () => void;
  onRetry?: () => void;
}) {
  const isChecking = state === 'CHECKING_ACCESS';
  const isOffline = state === 'ACCESS_ERROR';
  const Icon = isChecking ? LoaderCircle : isOffline ? WifiOff : RadioTower;
  const title = isChecking
    ? 'Opening the streaming division'
    : isOffline
      ? 'The command link is unavailable'
      : 'Streaming business is unavailable';
  const copy = isChecking
    ? 'Loading your company records and career qualification.'
    : isOffline
      ? 'Your career is safe. Reconnect and try opening the division again.'
      : 'This build does not currently include the streaming-business expansion.';

  return (
    <main className="stream-system-state">
      <div className={`stream-system-state__signal ${isChecking ? 'is-spinning' : ''}`}>
        <Icon size={28} />
      </div>
      <span>EMPIRE+ BUSINESS</span>
      <h1>{title}</h1>
      <p>{copy}</p>
      <div>
        {!isChecking && onRetry ? (
          <button type="button" className="stream-entry-button is-primary" onClick={onRetry}>
            <RefreshCw size={17} /> Try again
          </button>
        ) : null}
        <button type="button" className="stream-entry-button" onClick={onBack}>
          Return to Lifestyle
        </button>
      </div>
    </main>
  );
}

export default function StreamingLockedScreen({
  player,
  onUpdatePlayer,
  onBack = () => history.back(),
  onReturnToGame,
  commercialPolicy = DEFAULT_STREAMING_COMMERCIAL_POLICY,
  entitlementStatus = 'GRANTED',
  onRetryAccess,
  onOpenOriginalProduction,
  onOpenBank,
  initialDestination = 'HOME',
}: Props) {
  const readinessRef = useRef<HTMLElement>(null);
  const [showLaunchMoment, setShowLaunchMoment] = useState(false);
  const [showHeadquarters, setShowHeadquarters] = useState(() => Boolean(
    player.ownedStreamingPlatform.identity
    && player.ownedStreamingPlatform.foundingProfile,
  ));
  const [headquartersDestination, setHeadquartersDestination] = useState<'HOME' | 'FINANCE'>(initialDestination);
  const [feedback, setFeedback] = useState('');
  const eligibility = useMemo(() => evaluateStreamingEligibility(player), [player]);
  const platform = player.ownedStreamingPlatform;
  const hasLaunchClearance = platform.lifecycle !== 'LOCKED';
  const eligibilityStatus = hasLaunchClearance ? 'ELIGIBLE' : eligibility.status;
  const effectiveLifecycle = eligibility.eligible && platform.lifecycle === 'LOCKED'
    ? 'ELIGIBLE'
    : platform.lifecycle;
  const access = resolveStreamingAccess({
    commercialPolicy,
    eligibilityStatus,
    entitlementStatus,
    platformLifecycle: effectiveLifecycle,
  });
  const canOpenLaunchStudio = eligibility.eligible
    && platform.lifecycle === 'LOCKED'
    && access.canEnter;
  const readinessPercent = hasLaunchClearance ? 100 : Math.round(eligibility.readiness * 100);

  const openReadiness = () => readinessRef.current?.scrollIntoView({
    block: 'start',
    behavior: 'smooth',
  });

  const handleLaunchStudio = () => {
    if (!canOpenLaunchStudio) {
      openReadiness();
      return;
    }
    if (!onUpdatePlayer) {
      setFeedback('Launch clearance could not be saved. Return to Lifestyle and try again.');
      return;
    }
    const result = claimStreamingLaunchEligibility(player);
    if (!result.changed) {
      setFeedback(result.reason === 'NOT_ELIGIBLE'
        ? 'Complete all three launch requirements first.'
        : 'The platform registration desk is already open.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback('');
    setShowLaunchMoment(true);
    navigator.vibrate?.([18, 42, 28]);
  };

  if (
    access.viewState === 'CHECKING_ACCESS'
    || access.viewState === 'ACCESS_ERROR'
    || access.viewState === 'ACCESS_REQUIRED'
  ) {
    return (
      <div className="stream-entry-shell">
        <button type="button" className="stream-entry-back" onClick={onBack} aria-label="Back to Lifestyle">
          <ArrowLeft size={20} />
        </button>
        <AccessUnavailable state={access.viewState} onBack={onBack} onRetry={onRetryAccess} />
      </div>
    );
  }

  if (!showHeadquarters) {
    return (
      <StreamingFoundingJourney
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onBack={onBack}
        onOpenHeadquarters={(destination = 'HOME') => {
          setHeadquartersDestination(destination);
          setShowHeadquarters(true);
        }}
      />
    );
  }

  if (
    ['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(platform.lifecycle)
    && platform.identity
    && platform.foundingProfile
  ) {
    return (
      <StreamingPlatformHQ
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onBack={onBack}
        onReturnToGame={onReturnToGame}
        onOpenOriginalProduction={onOpenOriginalProduction}
        onOpenBank={onOpenBank}
        initialDestination={headquartersDestination}
      />
    );
  }

  if (platform.lifecycle === 'ELIGIBLE' && !showLaunchMoment) {
    return (
      <StreamingFoundingWizard
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="stream-entry-shell">
      <header className="stream-entry-topbar">
        <button type="button" className="stream-entry-back" onClick={onBack} aria-label="Back to Lifestyle">
          <ArrowLeft size={20} />
        </button>
        <div className="stream-entry-wordmark">
          <strong>EMPIRE<span>+</span></strong>
          <small>STREAMING BUSINESS</small>
        </div>
        <span className={`stream-entry-clearance ${eligibility.eligible ? 'is-ready' : ''}`}>
          <i />
          {eligibility.eligible ? 'QUALIFIED' : `${eligibility.clearedMetrics}/3 READY`}
        </span>
      </header>

      <main className="stream-entry-main">
        <StreamingVisualScene
          sceneId="level0Hq"
          className="stream-entry-hero"
          eyebrow="A NEW COMPANY • LEVEL 0"
          title="Build the service behind the screen."
          description="Found a streaming platform, then earn every server, title, audience and territory it reaches."
          imageLoading="eager"
          status={{
            label: eligibility.eligible ? 'Registration available' : 'Career qualification',
            detail: `${readinessPercent}% ready`,
            tone: eligibility.eligible ? 'success' : 'warning',
          }}
        >
          <div className="stream-entry-hero-actions">
            <button type="button" className="stream-entry-button is-primary" onClick={handleLaunchStudio}>
              {canOpenLaunchStudio ? <BriefcaseBusiness size={18} /> : <Landmark size={18} />}
              {canOpenLaunchStudio ? 'Enter Registration' : 'View Qualification'}
              <ChevronRight size={17} />
            </button>
            <span><BadgeCheck size={14} /> No cash is charged for qualification</span>
          </div>
        </StreamingVisualScene>

        <section className="stream-entry-section" aria-labelledby="stream-control-title">
          <div className="stream-entry-heading">
            <div>
              <span>THE BUSINESS YOU WILL OPERATE</span>
              <h2 id="stream-control-title">Four rooms. One living platform.</h2>
            </div>
            <small>SCENE-DRIVEN HQ</small>
          </div>
          <div className="stream-entry-room-grid">
            {CONTROL_ROOMS.map(room => {
              const Icon = room.icon;
              return (
                <article key={room.id}>
                  <LazyRoomArtwork src={room.image} />
                  <div className="stream-entry-room-scrim" />
                  <div className="stream-entry-room-copy">
                    <span><Icon size={14} /> {room.eyebrow}</span>
                    <h3>{room.title}</h3>
                    <p>{room.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          ref={readinessRef}
          className={`stream-entry-readiness ${eligibility.eligible ? 'is-ready' : ''}`}
          aria-labelledby="stream-qualification-title"
        >
          <div className="stream-entry-readiness-head">
            <div>
              <span>FOUNDER QUALIFICATION</span>
              <h2 id="stream-qualification-title">
                {eligibility.eligible ? 'The registration chamber is open.' : 'Build enough power to enter.'}
              </h2>
              <p>Capital establishes the company. Fame attracts an opening audience. Reputation brings creators and rights holders to the table.</p>
            </div>
            <div className="stream-entry-readiness-ring">
              <strong>{readinessPercent}%</strong>
              <small>{eligibility.eligible ? 'CLEARED' : 'READINESS'}</small>
            </div>
          </div>

          <div className="stream-entry-metrics">
            {eligibility.metrics.map(metric => {
              const Icon = metricIcon(metric);
              const complete = metric.met || hasLaunchClearance;
              return (
                <article key={metric.id} className={complete ? 'is-complete' : ''}>
                  <div className="stream-entry-metric-icon"><Icon size={20} /></div>
                  <div className="stream-entry-metric-copy">
                    <span>{metric.label}</span>
                    <strong>
                      {formatMetricValue(metric, metric.current)}
                      <small> / {formatMetricValue(metric, metric.target)}</small>
                    </strong>
                    <div aria-label={`${metric.label} ${Math.round(metric.progress * 100)} percent complete`}>
                      <i style={{ width: `${Math.round(metric.progress * 100)}%` }} />
                    </div>
                  </div>
                  <span className="stream-entry-metric-check">{complete ? <Check size={14} /> : null}</span>
                </article>
              );
            })}
          </div>

          <div className="stream-entry-cost-truth">
            <div><Landmark size={19} /></div>
            <p>
              <strong>The $85M rule is exact.</strong>
              Qualification only opens registration. Incorporation later charges $85M once:
              all $85M establishes the legal, regulatory, licensing and platform foundation. Company treasury opens at $0 and must be funded separately.
            </p>
          </div>

          <button
            type="button"
            className="stream-entry-button is-primary is-wide"
            onClick={handleLaunchStudio}
            disabled={!canOpenLaunchStudio}
          >
            {canOpenLaunchStudio ? <Sparkles size={18} /> : <Building2 size={18} />}
            {canOpenLaunchStudio ? 'Open Platform Registration' : 'Qualification Incomplete'}
            {canOpenLaunchStudio ? <ChevronRight size={18} /> : null}
          </button>
          {feedback ? <p className="stream-entry-feedback" role="alert">{feedback}</p> : null}
        </section>

        <section className="stream-entry-opening">
          <div className="stream-entry-heading">
            <div>
              <span>THE FIRST TEN MINUTES</span>
              <h2>Register. Enter Level 0. Build upward.</h2>
            </div>
          </div>
          <ol>
            <li><span>01</span><div><strong>Create the identity</strong><p>Name the platform, shape its mark and sound, and decide what viewers should expect.</p></div></li>
            <li><span>02</span><div><strong>Incorporate the company</strong><p>You begin as Founder, Owner and CEO with 100% control and no forced partner.</p></div></li>
            <li><span>03</span><div><strong>Walk into an empty HQ</strong><p>Capacity, reach and technology are earned through real purchases—not selected from a launch menu.</p></div></li>
          </ol>
        </section>
      </main>

      {showLaunchMoment ? (
        <div className="stream-entry-modal-backdrop" role="presentation">
          <AccessibleDialog
            className="stream-entry-clearance-cutscene"
            aria-labelledby="stream-clearance-title"
            onEscape={() => setShowLaunchMoment(false)}
          >
            <div className="stream-entry-cutscene-art" aria-hidden="true" />
            <div className="stream-entry-cutscene-copy">
              <div className="stream-entry-cutscene-seal"><Film size={25} /></div>
              <span>CAREER MILESTONE</span>
              <h2 id="stream-clearance-title">The charter is waiting.</h2>
              <p>Your career now qualifies to establish a streaming company. Registration, not a pre-built platform, begins next.</p>
              <button
                type="button"
                className="stream-entry-button is-primary is-wide"
                onClick={() => setShowLaunchMoment(false)}
                autoFocus
              >
                Enter Registration <ChevronRight size={18} />
              </button>
            </div>
          </AccessibleDialog>
        </div>
      ) : null}
    </div>
  );
}
