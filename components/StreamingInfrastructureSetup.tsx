import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  Cloud,
  Gauge,
  HardDrive,
  Layers3,
  Minus,
  Network,
  Play,
  Plus,
  RadioTower,
  Rocket,
  Server,
  ShieldCheck,
  Timer,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import type {
  OwnedStreamingInfrastructureSetupDraft,
  Player,
  StreamingSubscriptionTierId,
} from '../types';
import StreamingVisualScene, {
  type StreamingVisualSceneTone,
} from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import {
  STREAMING_CAPACITY_PACKAGES,
  STREAMING_INFRASTRUCTURE_STRATEGIES,
  STREAMING_ROLLOUT_PACES,
  STREAMING_SUBSCRIPTION_TIERS,
  commitStreamingInfrastructureSetup,
  createDefaultStreamingInfrastructureDraft,
  getStreamingInfrastructureForecast,
  runStreamingInfrastructureLoadTest,
  saveStreamingInfrastructureDraft,
  validateStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import '../styles/streaming-infrastructure.css';

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onClose: () => void;
}

const STEP_COPY = [
  { eyebrow: 'NETWORK DESIGN', title: 'Build the network you can operate.', copy: 'Choose the architecture yourself, then walk the server floor and compare complete packages at that configuration.' },
  { eyebrow: 'DELIVERY PLAN', title: 'Decide how aggressively to build.', copy: 'Speed is a tradeoff. A rushed stack arrives sooner but carries engineering debt into launch.' },
  { eyebrow: 'LOAD LAB', title: 'Pressure-test the opening night.', copy: 'The reach this proposed stack would earn supplies the demand range. It is a planning model, never a promise of subscribers.' },
  { eyebrow: 'PLAN STUDIO', title: 'Price the value viewers receive.', copy: 'Basic, Premium and Family must each have a clear reason to exist.' },
  { eyebrow: 'OPERATING REVIEW', title: 'Approve one connected launch stack.', copy: 'The company is charged only when you confirm this final operating setup.' },
] as const;

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCapacity = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  return `${Math.round(value / 1_000)}K`;
};

const formatStorage = (value: number): string => (
  value >= 100_000 ? `${Math.round(value / 1_000)}K hours` : `${value.toLocaleString()} hours`
);

function StatusPill({ status }: { status: 'PASS' | 'CONDITIONAL' | 'FAIL' }) {
  return (
    <span className={`infra-status-pill is-${status.toLowerCase()}`}>
      {status === 'PASS' ? <Check size={13} /> : <AlertTriangle size={13} />}
      {status}
    </span>
  );
}

export default function StreamingInfrastructureSetup({ player, onUpdatePlayer, onClose }: Props) {
  const platform = player.ownedStreamingPlatform;
  const existingSetup = platform.infrastructureSetup;
  const [draft, setDraft] = useState<OwnedStreamingInfrastructureSetupDraft>(() => (
    platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player)
  ));
  const [feedback, setFeedback] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const step = Math.max(0, Math.min(4, draft.currentStep));
  const stepCopy = STEP_COPY[step];
  const forecast = useMemo(
    () => getStreamingInfrastructureForecast(player, draft),
    [player, draft],
  );
  const validation = useMemo(
    () => validateStreamingInfrastructureDraft(player, draft),
    [player, draft],
  );
  const packageForecasts = useMemo(
    () => new Map(STREAMING_CAPACITY_PACKAGES.map(capacityPackage => [
      capacityPackage.id,
      getStreamingInfrastructureForecast(player, {
        ...draft,
        capacityPackageId: capacityPackage.id,
      }),
    ])),
    [player, draft],
  );
  const loadTestCurrent = draft.lastLoadTestSignature === forecast.configurationSignature;
  const selectedPackage = STREAMING_CAPACITY_PACKAGES.find(item => item.id === draft.capacityPackageId)!;
  const selectedStrategy = STREAMING_INFRASTRUCTURE_STRATEGIES.find(item => item.id === draft.strategy)!;
  const selectedRollout = STREAMING_ROLLOUT_PACES.find(item => item.id === draft.rolloutPace)!;
  const configurationUnchanged = Boolean(
    existingSetup
    && platform.infrastructureStrategy === draft.strategy
    && existingSetup.capacityPackageId === draft.capacityPackageId
    && existingSetup.rolloutPace === draft.rolloutPace
    && STREAMING_SUBSCRIPTION_TIERS.every(tier => platform.subscriptionPrices[tier.id] === draft.subscriptionPrices[tier.id]),
  );
  const sceneTone: StreamingVisualSceneTone = isTesting
    ? 'active'
    : step >= 2 && loadTestCurrent
      ? forecast.loadTestStatus === 'PASS'
        ? 'success'
        : forecast.loadTestStatus === 'FAIL'
          ? 'critical'
          : 'warning'
      : 'active';
  const sceneStatus = isTesting
    ? { label: 'Load simulation live', detail: 'Traffic is moving through the modeled stack.' }
    : step >= 2 && loadTestCurrent
      ? { label: `Load test ${forecast.loadTestStatus.toLowerCase()}`, detail: `${forecast.headroomPercent >= 0 ? '+' : ''}${forecast.headroomPercent}% high-case headroom.` }
      : { label: 'Configuration live', detail: `${forecast.reachLabel} demand model attached.` };

  const persistDraft = (nextDraft: OwnedStreamingInfrastructureSetupDraft) => {
    setDraft(nextDraft);
    if (onUpdatePlayer) onUpdatePlayer(saveStreamingInfrastructureDraft(player, nextDraft));
  };

  const saveAndClose = () => {
    persistDraft(draft);
    onClose();
  };

  const patchInfrastructure = (patch: Partial<Pick<
    OwnedStreamingInfrastructureSetupDraft,
    'strategy' | 'capacityPackageId' | 'rolloutPace'
  >>) => {
    persistDraft({
      ...draft,
      ...patch,
      lastLoadTestSignature: null,
    });
    setFeedback('');
  };

  const moveToStep = (nextStep: number) => {
    const bounded = Math.max(0, Math.min(4, nextStep));
    persistDraft({ ...draft, currentStep: bounded });
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setFeedback('');
  };

  const handleNext = () => {
    if (step === 2 && !loadTestCurrent) {
      setFeedback('Run the load test for this exact configuration before continuing.');
      return;
    }
    if (step === 3) {
      const pricingIssue = validation.issues.find(issue => issue.step === 3);
      if (pricingIssue) {
        setFeedback(pricingIssue.message);
        return;
      }
    }
    moveToStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      persistDraft(draft);
      onClose();
      return;
    }
    moveToStep(step - 1);
  };

  const handleLoadTest = () => {
    if (isTesting) return;
    setIsTesting(true);
    setFeedback('');
    window.setTimeout(() => {
      const result = runStreamingInfrastructureLoadTest(player, draft);
      const nextDraft = {
        ...draft,
        lastLoadTestSignature: result.forecast.configurationSignature,
      };
      setDraft(nextDraft);
      if (onUpdatePlayer) onUpdatePlayer(result.player);
      setIsTesting(false);
      if (navigator.vibrate) navigator.vibrate(result.forecast.loadTestStatus === 'PASS' ? [18, 30, 22] : [28, 40, 28]);
    }, 720);
  };

  const setPrice = (tierId: StreamingSubscriptionTierId, value: number) => {
    const tier = STREAMING_SUBSCRIPTION_TIERS.find(item => item.id === tierId)!;
    const bounded = Math.max(tier.minPrice, Math.min(tier.maxPrice, Math.round(value * 100) / 100));
    persistDraft({
      ...draft,
      subscriptionPrices: {
        ...draft.subscriptionPrices,
        [tierId]: bounded,
      },
    });
    setFeedback('');
  };

  const handleCommit = () => {
    if (!onUpdatePlayer || isCommitting) return;
    if (!validation.valid) {
      const issue = validation.issues[0];
      setFeedback(issue?.message || 'Review the operating setup before approval.');
      if (issue && issue.step < 4) moveToStep(issue.step);
      return;
    }
    setIsCommitting(true);
    const result = commitStreamingInfrastructureSetup(player, draft);
    if (!result.changed) {
      setIsCommitting(false);
      setFeedback(result.issues[0]?.message || 'This exact setup is already approved.');
      return;
    }
    onUpdatePlayer(result.player);
    setCompleted(true);
    setIsCommitting(false);
    if (navigator.vibrate) navigator.vibrate([20, 45, 30]);
  };

  const renderArchitecture = () => (
    <>
      <section className="infra-decision-section">
        <div className="infra-section-heading">
          <div><span>1A</span><h2>Infrastructure philosophy</h2></div>
          <small>All three can succeed</small>
        </div>
        <div className="infra-strategy-grid">
          {STREAMING_INFRASTRUCTURE_STRATEGIES.map(strategy => {
            const selected = draft.strategy === strategy.id;
            const isCurrentNetwork = Boolean(existingSetup && platform.infrastructureStrategy === strategy.id);
            const Icon = strategy.id === 'CLOUD_FIRST' ? Cloud : strategy.id === 'OWNED_INFRASTRUCTURE' ? Server : Network;
            return (
              <button
                type="button"
                key={strategy.id}
                className={selected ? 'is-selected' : ''}
                onClick={() => patchInfrastructure({ strategy: strategy.id })}
                aria-pressed={selected}
              >
                <span className="infra-choice-icon"><Icon size={21} /></span>
                <span className="infra-choice-copy">
                  <span className="infra-choice-title">
                    <strong>{strategy.title}</strong>
                    {isCurrentNetwork ? <i>CURRENT NETWORK</i> : null}
                  </span>
                  <small>{strategy.description}</small>
                  <em>{strategy.strength}</em>
                  <b>{strategy.tradeoff}</b>
                </span>
                <span className="infra-radio">{selected ? <Check size={14} /> : null}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="infra-decision-section">
        <div className="infra-section-heading">
          <div><span>1B</span><h2>Starting capacity package</h2></div>
          <small>Not a paid unlock</small>
        </div>
        <div className="infra-package-grid">
          {STREAMING_CAPACITY_PACKAGES.map(capacityPackage => {
            const selected = draft.capacityPackageId === capacityPackage.id;
            const packageForecast = packageForecasts.get(capacityPackage.id) || forecast;
            return (
              <button
                type="button"
                key={capacityPackage.id}
                className={`infra-server-package is-${capacityPackage.id.toLowerCase()} ${selected ? 'is-selected' : ''}`}
                onClick={() => patchInfrastructure({ capacityPackageId: capacityPackage.id })}
                aria-pressed={selected}
              >
                <span className="infra-rack-face" aria-hidden="true">
                  <span className="infra-rack-rail is-left" />
                  <span className="infra-rack-rail is-right" />
                  <span className="infra-rack-label">{capacityPackage.id}</span>
                  <span className="infra-rack-bays">
                    {Array.from({ length: 4 }, (_, bay) => (
                      <i key={bay}>
                        <b />
                        <b />
                        <em />
                      </i>
                    ))}
                  </span>
                </span>
                <span className="infra-package-body">
                  <span className="infra-package-top">
                    <span>
                      <small>{capacityPackage.shortLabel}</small>
                      <strong>{capacityPackage.title}</strong>
                    </span>
                    <span className="infra-radio">{selected ? <Check size={14} /> : null}</span>
                  </span>
                  <span className="infra-package-description">{capacityPackage.description}</span>
                  <span className="infra-package-specs">
                    <span><small>NORMAL CAPACITY</small><b>{formatCapacity(packageForecast.baselineConcurrentStreams)}</b></span>
                    <span><small>PREMIERE PEAK</small><b>{formatCapacity(packageForecast.burstConcurrentStreams)}</b></span>
                    <span><small>UPFRONT</small><b>{formatMoney(packageForecast.transactionCost)}</b></span>
                    <span><small>WEEKLY</small><b>{formatMoney(packageForecast.weeklyOperatingCost)}</b></span>
                    <span><small>NOC CREW</small><b>{packageForecast.staffRequired} staff</b></span>
                    <span><small>READINESS</small><b>{packageForecast.buildWeeks} game wk{packageForecast.buildWeeks === 1 ? '' : 's'}</b></span>
                  </span>
                  <span className={`infra-package-readiness is-${packageForecast.loadTestStatus.toLowerCase()}`}>
                    <span><ShieldCheck size={14} /> {packageForecast.reliabilityTarget}% target</span>
                    <b>{packageForecast.loadTestStatus === 'PASS' ? 'MODEL READY' : packageForecast.loadTestStatus === 'CONDITIONAL' ? 'REVIEW MARGIN' : 'CAPACITY RISK'}</b>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <aside className="infra-fairness-strip">
          <ShieldCheck size={16} />
          <span><strong>Nothing is charged until final CEO approval.</strong> These are gameplay treasury choices, not paid content gates.</span>
        </aside>
      </section>

      <aside className="infra-live-forecast">
        <div><span>SELECTED STACK</span><strong>{selectedStrategy.title} + {selectedPackage.title}</strong></div>
        <div><span>OPERATING REACH</span><strong>L{forecast.reachLevel} • {forecast.reachLabel}</strong></div>
        <div><span>BURST CAPACITY</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
        <div><span>CAPITAL</span><strong>{formatMoney(forecast.transactionCost)}</strong></div>
      </aside>
    </>
  );

  const renderRollout = () => (
    <>
      <section className="infra-rollout-stage">
        <div className="infra-stage-lines" aria-hidden="true" />
        <span>CONFIGURATION LOCKED FOR FORECAST</span>
        <h2>{selectedStrategy.title}<br />{selectedPackage.title}</h2>
        <div>
          <span><RadioTower size={15} /> {formatCapacity(forecast.burstConcurrentStreams)} burst</span>
          <span><HardDrive size={15} /> {formatStorage(forecast.storageCapacityHours)}</span>
        </div>
      </section>
      <section className="infra-decision-section">
        <div className="infra-section-heading">
          <div><span>PACE</span><h2>Rollout discipline</h2></div>
          <small>Game weeks, never real time</small>
        </div>
        <div className="infra-rollout-grid">
          {STREAMING_ROLLOUT_PACES.map(rollout => {
            const selected = draft.rolloutPace === rollout.id;
            const Icon = rollout.id === 'SAFE' ? ShieldCheck : rollout.id === 'RUSHED' ? Rocket : Gauge;
            return (
              <button
                type="button"
                key={rollout.id}
                className={`${selected ? 'is-selected' : ''} is-${rollout.id.toLowerCase()}`}
                onClick={() => patchInfrastructure({ rolloutPace: rollout.id })}
                aria-pressed={selected}
              >
                <span className="infra-rollout-icon"><Icon size={22} /></span>
                <span><strong>{rollout.title}</strong><small>{rollout.description}</small></span>
                <span className="infra-radio">{selected ? <Check size={14} /> : null}</span>
                <span className="infra-rollout-tags"><i>{rollout.buildLabel}</i><i>{rollout.riskLabel}</i></span>
                <b>{rollout.consequence}</b>
              </button>
            );
          })}
        </div>
      </section>
      <section className="infra-impact-grid" aria-label="Rollout impact forecast">
        <article><Timer size={18} /><span>Build time</span><strong>{forecast.buildWeeks} game weeks</strong><small>{selectedRollout.buildLabel} route</small></article>
        <article><Banknote size={18} /><span>Capital</span><strong>{formatMoney(forecast.transactionCost)}</strong><small>Charged on approval</small></article>
        <article><WalletCards size={18} /><span>Weekly cost</span><strong>{formatMoney(forecast.weeklyOperatingCost)}</strong><small>Begins with operations</small></article>
        <article><UsersRound size={18} /><span>Technical staff</span><strong>{forecast.staffRequired}</strong><small>Required operating team</small></article>
        <article><ShieldCheck size={18} /><span>Reliability target</span><strong>{forecast.reliabilityTarget}%</strong><small>Architecture forecast</small></article>
        <article><AlertTriangle size={18} /><span>Technical debt</span><strong>{forecast.technicalDebt ? `+${forecast.technicalDebt}` : 'None'}</strong><small>Starting pressure</small></article>
      </section>
    </>
  );

  const renderLoadTest = () => {
    const rangeMax = Math.max(forecast.forecastHighConcurrentStreams, forecast.burstConcurrentStreams);
    const likelyWidth = Math.min(100, (forecast.forecastLikelyConcurrentStreams / rangeMax) * 100);
    const highWidth = Math.min(100, (forecast.forecastHighConcurrentStreams / rangeMax) * 100);
    const capacityMarker = Math.min(100, (forecast.burstConcurrentStreams / rangeMax) * 100);
    return (
      <>
        <section className={`infra-load-console ${isTesting ? 'is-testing' : ''}`}>
          <div className="infra-console-top">
            <div><span className="infra-console-dot" /><span>LOAD LAB / LAUNCH MODEL</span></div>
            {loadTestCurrent && !isTesting ? <StatusPill status={forecast.loadTestStatus} /> : <span className="infra-console-pending">NOT RUN</span>}
          </div>
          <div className="infra-load-visual" aria-label="Forecast demand compared with burst capacity">
            <div className="infra-load-rings" aria-hidden="true"><RadioTower size={31} /></div>
            <div className="infra-load-scale">
              <div className="infra-range-bar is-likely"><span style={{ width: `${likelyWidth}%` }} /></div>
              <div className="infra-range-bar is-high"><span style={{ width: `${highWidth}%` }} /></div>
              <i style={{ left: `${capacityMarker}%` }}><span>BURST LIMIT</span></i>
            </div>
            <div className="infra-load-numbers">
              <div><span>LIKELY PEAK</span><strong>{formatCapacity(forecast.forecastLikelyConcurrentStreams)}</strong></div>
              <div><span>HIGH CASE</span><strong>{formatCapacity(forecast.forecastHighConcurrentStreams)}</strong></div>
              <div><span>BURST CAPACITY</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
            </div>
          </div>
          {isTesting ? (
            <div className="infra-test-running"><span /><strong>Simulating traffic bursts…</strong><small>Playback • authentication • regional delivery • recovery</small></div>
          ) : loadTestCurrent ? (
            <div className={`infra-test-result is-${forecast.loadTestStatus.toLowerCase()}`}>
              <div><StatusPill status={forecast.loadTestStatus} /><strong>{forecast.headroomPercent >= 0 ? '+' : ''}{forecast.headroomPercent}% high-case headroom</strong></div>
              <p>{forecast.loadTestSummary}</p>
            </div>
          ) : (
            <button type="button" className="infra-run-test" onClick={handleLoadTest}>
              <Play size={18} fill="currentColor" /> Run modeled load test
            </button>
          )}
        </section>
        <section className="infra-driver-section">
          <div className="infra-section-heading"><div><span>WHY</span><h2>Forecast drivers</h2></div><small>Range, not a promise</small></div>
          <div className="infra-driver-list">
            {forecast.demandDrivers.map((driver, index) => (
              <article key={driver.label}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{driver.label}</strong><p>{driver.detail}</p></div></article>
            ))}
          </div>
        </section>
        {loadTestCurrent && forecast.loadTestStatus !== 'PASS' ? (
          <aside className="infra-risk-note">
            <AlertTriangle size={19} />
            <div><strong>You may continue with this risk.</strong><p>Phase 8 launch readiness will surface it again and offer capacity fixes before launch.</p></div>
          </aside>
        ) : null}
      </>
    );
  };

  const renderPlans = () => (
    <>
      <section className="infra-plan-summary">
        <div><span>PLANNED ARPU</span><strong>${forecast.plannedArpu.toFixed(2)}</strong></div>
        <div><span>PRICE POSITION</span><strong>{forecast.pricingPressureLabel}</strong></div>
        <div><span>VS. BALANCED</span><strong>{forecast.pricingPressurePercent >= 0 ? '+' : ''}{forecast.pricingPressurePercent}%</strong></div>
      </section>
      <section className="infra-pricing-stack">
        {STREAMING_SUBSCRIPTION_TIERS.map((tier, index) => {
          const value = draft.subscriptionPrices[tier.id];
          return (
            <article key={tier.id} className={index === 1 ? 'is-featured' : ''}>
              <div className="infra-plan-head">
                <div><span>{tier.title.toUpperCase()}</span><h2>{tier.title}</h2><p>{tier.audience}</p></div>
                <div className="infra-price"><small>MONTHLY</small><strong>${value.toFixed(2)}</strong></div>
              </div>
              <div className="infra-plan-features">
                {tier.features.map(feature => <span key={feature}><Check size={13} />{feature}</span>)}
              </div>
              <div className="infra-price-control">
                <button type="button" onClick={() => setPrice(tier.id, value - 0.5)} aria-label={`Decrease ${tier.title} price`}><Minus size={17} /></button>
                <label>
                  <span className="sr-only">{tier.title} monthly price</span>
                  <input
                    type="range"
                    min={tier.minPrice}
                    max={tier.maxPrice}
                    step="0.5"
                    value={value}
                    onChange={event => setPrice(tier.id, Number(event.target.value))}
                  />
                </label>
                <button type="button" onClick={() => setPrice(tier.id, value + 0.5)} aria-label={`Increase ${tier.title} price`}><Plus size={17} /></button>
              </div>
              <div className="infra-plan-foot">
                <span>Expected opening mix: {Math.round(tier.expectedMix * 100)}%</span>
                <button type="button" onClick={() => setPrice(tier.id, tier.recommendedPrice)}>Reset ${tier.recommendedPrice}</button>
              </div>
            </article>
          );
        })}
      </section>
      <aside className={`infra-pricing-note is-${forecast.pricingPressureLabel.toLowerCase()}`}>
        <Gauge size={19} />
        <div>
          <strong>{forecast.pricingPressureLabel === 'VALUE-LED' ? 'Lower entry friction' : forecast.pricingPressureLabel === 'PREMIUM' ? 'Higher value expectation' : 'Balanced opening position'}</strong>
          <p>{forecast.pricingPressureLabel === 'VALUE-LED'
            ? 'Lower prices may help conversion, but reduce revenue available for content and technology.'
            : forecast.pricingPressureLabel === 'PREMIUM'
              ? 'Higher prices lift planned ARPU, but viewers will expect a stronger catalog and product.'
              : 'Pricing stays near the planning baseline without a large value or premium bias.'}</p>
        </div>
      </aside>
    </>
  );

  const renderReview = () => (
    <>
      <section className="infra-review-hero">
        <span>READY FOR CEO APPROVAL</span>
        <h2>{selectedPackage.title}<br />on {selectedStrategy.title}</h2>
        <p>{selectedRollout.title} • {forecast.buildWeeks} game weeks • {formatCapacity(forecast.burstConcurrentStreams)} burst capacity</p>
      </section>
      <section className="infra-review-block">
        <div className="infra-section-heading"><div><span>01</span><h2>Infrastructure</h2></div><button type="button" onClick={() => moveToStep(0)}>Edit</button></div>
        <div className="infra-review-grid">
          <div><span>Normal capacity</span><strong>{formatCapacity(forecast.baselineConcurrentStreams)}</strong></div>
          <div><span>Burst capacity</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
          <div><span>Storage</span><strong>{formatStorage(forecast.storageCapacityHours)}</strong></div>
          <div><span>Reliability</span><strong>{forecast.reliabilityTarget}%</strong></div>
          <div><span>Technical staff</span><strong>{forecast.staffRequired}</strong></div>
          <div><span>Starting debt</span><strong>{forecast.technicalDebt ? `+${forecast.technicalDebt}` : 'None'}</strong></div>
        </div>
      </section>
      <section className="infra-review-block">
        <div className="infra-section-heading"><div><span>02</span><h2>Load test</h2></div><button type="button" onClick={() => moveToStep(2)}>Review</button></div>
        <div className="infra-review-test"><StatusPill status={forecast.loadTestStatus} /><div><strong>{forecast.headroomPercent >= 0 ? '+' : ''}{forecast.headroomPercent}% high-case headroom</strong><small>{forecast.loadTestSummary}</small></div></div>
      </section>
      <section className="infra-review-block">
        <div className="infra-section-heading"><div><span>03</span><h2>Subscription plans</h2></div><button type="button" onClick={() => moveToStep(3)}>Edit</button></div>
        <div className="infra-review-plans">
          {STREAMING_SUBSCRIPTION_TIERS.map(tier => (
            <div key={tier.id}><span>{tier.title}</span><strong>${draft.subscriptionPrices[tier.id].toFixed(2)}</strong></div>
          ))}
        </div>
        <div className="infra-review-arpu"><span>Planned opening ARPU</span><strong>${forecast.plannedArpu.toFixed(2)}</strong><small>{forecast.pricingPressureLabel}</small></div>
      </section>
      <section className="infra-cost-card">
        <div><span>{existingSetup ? 'CHANGE ORDER' : 'CAPITAL COMMITMENT'}</span><strong>{forecast.transactionCost ? formatMoney(forecast.transactionCost) : 'No capital charge'}</strong><small>{existingSetup && forecast.transactionCost ? '45% of the selected stack is reused' : 'Charged from company treasury on approval'}</small></div>
        <div className="infra-cost-divider" />
        <div><span>WEEKLY OPERATING COST</span><strong>{formatMoney(forecast.weeklyOperatingCost)}</strong><small>Begins when streaming operations start</small></div>
        <div className="infra-treasury-line"><span>Treasury after approval</span><strong>{formatMoney(platform.treasuryCash - forecast.transactionCost)}</strong></div>
      </section>
      <aside className="infra-commit-truth"><BadgeCheck size={18} /><p>This approves capacity and prices only. It does not grant subscribers, titles, revenue, or a successful launch.</p></aside>
    </>
  );

  if (completed) {
    return (
      <AccessibleDialog
        className="infra-shell"
        style={{ '--infra-brand': platform.identity?.primaryColor || '#4f86ff' } as React.CSSProperties}
        aria-label="Infrastructure operating plan approved"
        onEscape={onClose}
      >
        <main className="infra-success">
          <StreamingVisualScene
            sceneId="noc"
            eyebrow="NETWORK OPERATIONS CENTRE"
            title="The launch stack is in motion."
            description={`${selectedStrategy.title}, ${selectedPackage.title} and all three subscription plans are now part of the company record.`}
            status={{ label: 'Operating plan approved', detail: `${forecast.buildWeeks} game weeks to readiness.`, tone: 'success' }}
            className="infra-success-scene"
            imageLoading="eager"
          >
            <div className="infra-noc-readouts">
              <div><span>PEAK</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
              <div><span>TEST</span><strong>{forecast.loadTestStatus}</strong></div>
              <div><span>RUN RATE</span><strong>{formatMoney(forecast.weeklyOperatingCost)}/wk</strong></div>
            </div>
          </StreamingVisualScene>
          <span className="infra-success-icon"><Check size={32} /></span>
          <span className="infra-eyebrow">OPERATING PLAN APPROVED</span>
          <h1>Your network is building.</h1>
          <p>The control room has the approved capacity, rollout and pricing record.</p>
          <div className="infra-success-grid">
            <div><span>BURST CAPACITY</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
            <div><span>LOAD TEST</span><strong>{forecast.loadTestStatus}</strong></div>
            <div><span>BUILD TIME</span><strong>{forecast.buildWeeks} weeks</strong></div>
            <div><span>WEEKLY COST</span><strong>{formatMoney(forecast.weeklyOperatingCost)}</strong></div>
          </div>
          <div className="infra-next-step"><Layers3 size={21} /><div><span>NEXT • PHASE 6</span><strong>Build the catalog.</strong><p>Infrastructure can carry a service. Now give viewers something worth opening it for.</p></div></div>
          <button type="button" className="infra-primary-button" onClick={onClose}>Return to Technology Campus <ChevronRight size={18} /></button>
        </main>
      </AccessibleDialog>
    );
  }

  return (
    <AccessibleDialog
      className="infra-shell"
      style={{ '--infra-brand': platform.identity?.primaryColor || '#4f86ff' } as React.CSSProperties}
      aria-labelledby="infra-setup-title"
      onEscape={saveAndClose}
    >
      <header className="infra-topbar">
        <button type="button" className="infra-icon-button" onClick={handleBack} aria-label={step === 0 ? 'Close setup' : 'Previous setup step'}><ArrowLeft size={20} /></button>
        <div><strong id="infra-setup-title">{existingSetup ? 'REVISE LAUNCH STACK' : 'LAUNCH STACK SETUP'}</strong><span>PHASE 5 • STEP {step + 1} OF 5</span></div>
        <button type="button" className="infra-icon-button" onClick={saveAndClose} aria-label="Save and close"><X size={20} /></button>
      </header>
      <div className="infra-progress" aria-label={`Step ${step + 1} of 5`}>
        {STEP_COPY.map((_, index) => <span key={index} className={index <= step ? 'is-active' : ''} />)}
      </div>
      <main ref={mainRef} className="infra-main">
        <header className="infra-page-heading">
          <span className="infra-eyebrow">{stepCopy.eyebrow}</span>
          <h1>{stepCopy.title}</h1>
          <p>{stepCopy.copy}</p>
        </header>
        <StreamingVisualScene
          sceneId="noc"
          eyebrow={`NOC BAY ${step + 1} / 5`}
          title={`${selectedPackage.title} · ${selectedStrategy.title}`}
          description={`${forecast.reachLabel} is modeling ${formatCapacity(forecast.forecastLikelyConcurrentStreams)} likely peak viewers before the high case.`}
          status={{ ...sceneStatus, tone: sceneTone }}
          className={`infra-noc-scene is-step-${step + 1}`}
          ariaLabel="Network operations centre configuration floor"
          imageLoading="eager"
        >
          <div className="infra-noc-readouts">
            <div><span>NORMAL</span><strong>{formatCapacity(forecast.baselineConcurrentStreams)}</strong></div>
            <div><span>PEAK</span><strong>{formatCapacity(forecast.burstConcurrentStreams)}</strong></div>
            <div><span>CAPITAL</span><strong>{formatMoney(forecast.transactionCost)}</strong></div>
            <div><span>READY</span><strong>{forecast.buildWeeks} wk</strong></div>
          </div>
        </StreamingVisualScene>
        {step === 0 ? renderArchitecture() : null}
        {step === 1 ? renderRollout() : null}
        {step === 2 ? renderLoadTest() : null}
        {step === 3 ? renderPlans() : null}
        {step === 4 ? renderReview() : null}
        {feedback ? <div className="infra-feedback" role="alert"><AlertTriangle size={17} /><span>{feedback}</span></div> : null}
      </main>
      <footer className="infra-footer">
        <div className="infra-footer-copy">
          <span>{step === 4 ? 'COMPANY TREASURY' : 'LIVE FORECAST'}</span>
          <strong>{step === 4 ? formatMoney(platform.treasuryCash) : `${formatCapacity(forecast.burstConcurrentStreams)} burst • ${formatMoney(forecast.weeklyOperatingCost)}/wk`}</strong>
        </div>
        {step < 4 ? (
          <button type="button" className="infra-primary-button" onClick={handleNext}>
            {step === 2 && forecast.loadTestStatus === 'FAIL' ? 'Continue with risk' : 'Continue'} <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="infra-primary-button"
            onClick={configurationUnchanged ? onClose : handleCommit}
            disabled={isCommitting}
          >
            {configurationUnchanged
              ? 'No changes • Return'
              : isCommitting
                ? 'Approving…'
                : forecast.transactionCost
                  ? `Approve • ${formatMoney(forecast.transactionCost)}`
                  : 'Approve plan update'}
          </button>
        )}
      </footer>
    </AccessibleDialog>
  );
}
