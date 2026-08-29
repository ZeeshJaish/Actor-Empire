import React, {
  useId,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Crown,
  Film,
  Gauge,
  Globe2,
  Heart,
  Music2,
  Pencil,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UsersRound,
  VolumeX,
} from 'lucide-react';
import type {
  OwnedStreamingFoundingDraft,
  Player,
  StreamingBrandPromiseId,
  StreamingLogoKey,
  StreamingSoundIdentKey,
} from '../types';
import {
  STREAMING_BRAND_PROMISES,
  STREAMING_COLOR_PALETTES,
  STREAMING_FOUNDING_STEP_COUNT,
  STREAMING_INCORPORATION_ECONOMY,
  STREAMING_LOGO_OPTIONS,
  STREAMING_SOUND_IDENTS,
  createDefaultStreamingFoundingDraft,
  incorporateOwnedStreamingPlatform,
  saveStreamingFoundingDraft,
  validateStreamingFoundingDraft,
} from '../services/streamingFounding';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import AccessibleDialog from './AccessibleDialog';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-founding.css';

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack: () => void;
}

const STEP_COPY = [
  {
    kicker: 'BRAND STUDIO',
    title: 'Give the signal a name.',
    copy: 'Build the mark, colour and sound viewers will recognize before they press play.',
  },
  {
    kicker: 'AUDIENCE PROMISE',
    title: 'What are you promising viewers?',
    copy: 'This shapes your opening identity. It is a creative direction—not a permanent class lock.',
  },
  {
    kicker: 'INCORPORATION',
    title: 'Sign the company into existence.',
    copy: 'Review the fixed charter. No cash moves until you confirm this final action.',
  },
] as const;

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const LogoMark: React.FC<{
  logoKey: StreamingLogoKey;
  size?: 'small' | 'large';
}> = ({ logoKey, size = 'small' }) => {
  const iconSize = size === 'large' ? 40 : 22;
  if (logoKey === 'SIGNAL_RING') return <RadioTower size={iconSize} strokeWidth={2.1} />;
  if (logoKey === 'SPOTLIGHT') return <Sparkles size={iconSize} strokeWidth={2.1} />;
  if (logoKey === 'WORDMARK') return <Crown size={iconSize} strokeWidth={2.1} />;
  return <Play size={iconSize} strokeWidth={2.1} fill="currentColor" />;
};

const PromiseIcon = ({ promiseId }: { promiseId: StreamingBrandPromiseId }) => {
  if (promiseId === 'EVENT_HOUSE') return <Film size={22} />;
  if (promiseId === 'BINGE_MACHINE') return <Play size={22} fill="currentColor" />;
  if (promiseId === 'FANDOM_FOREVER') return <Heart size={22} />;
  if (promiseId === 'WORLD_STAGE') return <Globe2 size={22} />;
  if (promiseId === 'EVERYONES_SCREEN') return <UsersRound size={22} />;
  if (promiseId === 'TECHNOLOGY_FIRST') return <Gauge size={22} />;
  return <Compass size={22} />;
};

const playSoundIdent = (sound: StreamingSoundIdentKey) => {
  if (sound === 'SILENT') return;
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const sequences: Record<Exclude<StreamingSoundIdentKey, 'SILENT'>, Array<[number, number, number]>> = {
      PULSE: [[196, 0, 0.15], [293.66, 0.17, 0.25]],
      ASCENT: [[220, 0, 0.12], [329.63, 0.12, 0.14], [493.88, 0.26, 0.25]],
      PREMIERE: [[110, 0, 0.22], [440, 0.08, 0.32]],
      CHOIR: [[220, 0, 0.35], [330, 0.04, 0.35]],
      MACHINE: [[180, 0, 0.08], [120, 0.12, 0.08], [240, 0.24, 0.12]],
      SPARK: [[659.25, 0, 0.12], [987.77, 0.1, 0.2]],
      IMPACT: [[65.41, 0, 0.4], [98, 0.04, 0.32]],
      ORBIT: [[220, 0, 0.18], [329.63, 0.16, 0.2], [493.88, 0.34, 0.3]],
      BLOOM: [[174.61, 0, 0.48], [261.63, 0.08, 0.55]],
      PRISM: [[523.25, 0, 0.12], [783.99, 0.1, 0.16], [1046.5, 0.22, 0.22]],
      EMBER: [[110, 0, 0.3], [164.81, 0.14, 0.4]],
      SIGNAL: [[440, 0, 0.08], [440, 0.15, 0.08], [659.25, 0.3, 0.18]],
      HORIZON: [[146.83, 0, 0.62], [220, 0.1, 0.64], [329.63, 0.22, 0.58]],
      ANALOG: [[196, 0, 0.16], [185, 0.18, 0.18], [293.66, 0.38, 0.24]],
    };
    sequences[sound].forEach(([frequency, delay, duration]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = sound === 'PREMIERE' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + delay + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + duration + 0.03);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Audio is optional; visual selection remains fully functional.
  }
};

export default function StreamingFoundingWizard({ player, onUpdatePlayer, onBack }: Props) {
  const platform = player.ownedStreamingPlatform;
  const isIncorporated = Boolean(platform.identity && platform.foundingProfile);
  const pendingReveal = platform.cinematicQueue.find(event => (
    event.type === 'FOUNDING_KEYNOTE' && event.status === 'QUEUED'
  ));
  const [draft, setDraft] = useState<OwnedStreamingFoundingDraft>(() => ({
    ...(platform.foundingDraft || createDefaultStreamingFoundingDraft()),
    currentStep: Math.max(
      0,
      Math.min(
        STREAMING_FOUNDING_STEP_COUNT - 1,
        platform.foundingDraft?.currentStep || 0,
      ),
    ),
  }));
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReveal, setShowReveal] = useState(Boolean(pendingReveal));
  const [replayMode, setReplayMode] = useState(false);
  const [committedRevealPlayer, setCommittedRevealPlayer] = useState<Player | null>(null);
  const nameHintId = useId();

  const step = Math.max(
    0,
    Math.min(STREAMING_FOUNDING_STEP_COUNT - 1, draft.currentStep),
  );
  const stepCopy = STEP_COPY[step];
  const validation = useMemo(
    () => validateStreamingFoundingDraft(draft, player.money),
    [draft, player.money],
  );
  const currentStepIssue = validation.issues.find(issue => issue.step === step)?.message;
  const selectedPromise = STREAMING_BRAND_PROMISES.find(
    promise => promise.id === draft.brandPromiseId,
  );
  const canAfford = player.money >= STREAMING_INCORPORATION_ECONOMY.cashRequired;
  const personalCashAfter = Math.max(
    0,
    player.money - STREAMING_INCORPORATION_ECONOMY.cashRequired,
  );

  const persistDraft = (nextDraft: OwnedStreamingFoundingDraft) => {
    setDraft(nextDraft);
    if (onUpdatePlayer) onUpdatePlayer(saveStreamingFoundingDraft(player, nextDraft));
  };

  const patchDraft = (
    patch: Partial<OwnedStreamingFoundingDraft>,
    persist = true,
  ) => {
    const nextDraft = { ...draft, ...patch };
    if (persist) persistDraft(nextDraft);
    else setDraft(nextDraft);
  };

  const moveToStep = (nextStep: number) => {
    const bounded = Math.max(
      0,
      Math.min(STREAMING_FOUNDING_STEP_COUNT - 1, nextStep),
    );
    persistDraft({ ...draft, currentStep: bounded });
    setFeedback('');
  };

  const handleBack = () => {
    if (step === 0) {
      persistDraft(draft);
      onBack();
      return;
    }
    moveToStep(step - 1);
  };

  const handleNext = () => {
    if (currentStepIssue) {
      setFeedback(currentStepIssue);
      return;
    }
    moveToStep(step + 1);
  };

  const handleIncorporate = () => {
    if (!onUpdatePlayer || isSubmitting) return;
    const savedPlayer = saveStreamingFoundingDraft(player, draft);
    const result = incorporateOwnedStreamingPlatform(savedPlayer);
    if (!result.changed) {
      const issue = result.issues[0];
      setFeedback(
        issue?.message
        || (result.reason === 'INSUFFICIENT_CASH'
          ? `You need ${formatMoney(STREAMING_INCORPORATION_ECONOMY.cashRequired)} in liquid cash.`
          : 'The company could not be incorporated. Review the charter.'),
      );
      if (issue) moveToStep(issue.step);
      return;
    }

    setIsSubmitting(true);
    setCommittedRevealPlayer(result.player);
    setReplayMode(false);
    onUpdatePlayer(result.player);
    playSoundIdent(draft.soundIdentKey);
    setShowReveal(true);
  };

  const finishReveal = (status: 'VIEWED' | 'DISMISSED') => {
    const sourcePlayer = committedRevealPlayer || player;
    const sourcePlatform = sourcePlayer.ownedStreamingPlatform;
    const sourceEvent = sourcePlatform.cinematicQueue.find(event => (
      event.id === pendingReveal?.id
      || (event.type === 'FOUNDING_KEYNOTE' && event.status === 'QUEUED')
    ));

    setShowReveal(false);
    setIsSubmitting(false);
    setCommittedRevealPlayer(null);
    if (!replayMode && onUpdatePlayer && sourceEvent) {
      onUpdatePlayer({
        ...sourcePlayer,
        ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
          sourcePlatform,
          sourceEvent.id,
          status,
        ),
      });
    }
    setReplayMode(false);
  };

  const renderIdentityStep = () => (
    <>
      <div
        className="founding-brand-preview"
        style={{
          '--preview-primary': draft.primaryColor,
          '--preview-secondary': draft.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="founding-preview-grid" aria-hidden="true" />
        <div className="founding-preview-logo">
          <LogoMark logoKey={draft.logoKey} size="large" />
        </div>
        <strong>{draft.name.trim() || 'YOUR PLATFORM'}</strong>
        <span>AN ORIGINAL STREAMING COMPANY</span>
      </div>

      <label className="founding-field">
        <span>Platform name <small>Required</small></span>
        <input
          type="text"
          value={draft.name}
          maxLength={32}
          autoComplete="organization"
          autoCapitalize="words"
          onChange={event => patchDraft({ name: event.target.value }, false)}
          onBlur={() => persistDraft(draft)}
          aria-describedby={nameHintId}
          aria-invalid={Boolean(validation.issues.find(issue => issue.step === 0))}
        />
        <small id={nameHintId}>{draft.name.trim().length}/32 characters</small>
      </label>

      <fieldset className="founding-control-group">
        <legend>Logo direction</legend>
        <div className="founding-logo-grid">
          {STREAMING_LOGO_OPTIONS.map(option => (
            <button
              type="button"
              key={option.id}
              className={draft.logoKey === option.id ? 'is-selected' : ''}
              onClick={() => patchDraft({ logoKey: option.id })}
              aria-pressed={draft.logoKey === option.id}
            >
              <LogoMark logoKey={option.id} />
              <span>{option.title}</span>
              {draft.logoKey === option.id && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="founding-control-group">
        <legend>Colour identity</legend>
        <div className="founding-palette-grid">
          {STREAMING_COLOR_PALETTES.map(palette => {
            const selected = draft.primaryColor === palette.primaryColor;
            return (
              <button
                type="button"
                key={palette.id}
                className={selected ? 'is-selected' : ''}
                onClick={() => patchDraft({
                  primaryColor: palette.primaryColor,
                  secondaryColor: palette.secondaryColor,
                })}
                aria-pressed={selected}
              >
                <span
                  className="founding-palette-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${palette.primaryColor}, ${palette.secondaryColor})`,
                  }}
                  aria-hidden="true"
                />
                <strong>{palette.title}</strong>
                {selected && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="founding-control-group">
        <legend>Sound ident</legend>
        <div className="founding-sound-list">
          {STREAMING_SOUND_IDENTS.map(sound => {
            const selected = draft.soundIdentKey === sound.id;
            return (
              <button
                type="button"
                key={sound.id}
                className={selected ? 'is-selected' : ''}
                onClick={() => {
                  patchDraft({ soundIdentKey: sound.id });
                  playSoundIdent(sound.id);
                }}
                aria-pressed={selected}
                aria-label={`${sound.title}. ${sound.description}${sound.id === 'SILENT' ? '' : '. Preview sound'}`}
              >
                <span className="founding-sound-icon" aria-hidden="true">
                  {sound.id === 'SILENT' ? <VolumeX size={18} /> : <Music2 size={18} />}
                </span>
                <span>
                  <strong>{sound.title}</strong>
                  <small>{sound.description}</small>
                </span>
                {selected ? <Check size={15} aria-hidden="true" /> : (
                  sound.id !== 'SILENT' && <Play size={13} fill="currentColor" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
  );

  const renderPromiseStep = () => (
    <fieldset className="founding-promise-fieldset">
      <legend className="founding-visually-hidden">Choose an audience promise</legend>
      <div className="founding-promise-list">
        {STREAMING_BRAND_PROMISES.map((promise, index) => {
          const selected = draft.brandPromiseId === promise.id;
          return (
            <button
              type="button"
              key={promise.id}
              className={`founding-promise-card ${selected ? 'is-selected' : ''}`}
              onClick={() => patchDraft({ brandPromiseId: promise.id })}
              aria-pressed={selected}
            >
              <span className="founding-promise-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="founding-promise-icon" aria-hidden="true">
                <PromiseIcon promiseId={promise.id} />
              </span>
              <span className="founding-promise-copy">
                <small>{promise.shortLabel}</small>
                <strong>{promise.title}</strong>
                <span>{promise.description}</span>
                <em>{promise.expectation}</em>
              </span>
              <span className="founding-choice-check" aria-hidden="true">
                {selected && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const renderReviewStep = () => (
    <>
      <div
        className="founding-review-brand"
        style={{
          '--preview-primary': draft.primaryColor,
          '--preview-secondary': draft.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="founding-preview-logo">
          <LogoMark logoKey={draft.logoKey} size="large" />
        </div>
        <div>
          <span>CHARTER PREPARED</span>
          <strong>{draft.name.trim() || 'Your Platform'}</strong>
          <small>{selectedPromise?.title} • Founder-owned</small>
        </div>
      </div>

      <div className="founding-review-edit-list">
        <div className="founding-review-edit-row">
          <Sparkles size={18} aria-hidden="true" />
          <span><small>Brand identity</small><strong>{draft.name.trim() || 'Unnamed platform'}</strong></span>
          <button type="button" onClick={() => moveToStep(0)} aria-label="Edit brand identity">
            <Pencil size={15} />
          </button>
        </div>
        <div className="founding-review-edit-row">
          <Compass size={18} aria-hidden="true" />
          <span><small>Audience promise</small><strong>{selectedPromise?.title || 'Not selected'}</strong></span>
          <button type="button" onClick={() => moveToStep(1)} aria-label="Edit audience promise">
            <Pencil size={15} />
          </button>
        </div>
      </div>

      <section className="founding-charter" aria-labelledby="founding-charter-title">
        <div className="founding-charter-heading">
          <span>FIXED INCORPORATION CHARTER</span>
          <h2 id="founding-charter-title">Your first $85M has one job.</h2>
          <p>It legally creates the company and is fully consumed by formation. The operating treasury opens at $0; infrastructure, staff and launch reach require fresh company capital.</p>
        </div>

        <div className="founding-money-flow" aria-label="Incorporation cash flow">
          <div>
            <small>Personal cash charged</small>
            <strong>{formatMoney(STREAMING_INCORPORATION_ECONOMY.cashRequired)}</strong>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
          <div>
            <small>Setup consumed</small>
            <strong>{formatMoney(STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed)}</strong>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
          <div>
            <small>Operating treasury</small>
            <strong>{formatMoney(STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash)}</strong>
          </div>
        </div>

        <p className="founding-cost-note">
          <ShieldCheck size={17} aria-hidden="true" />
          The consumed amount covers legal formation, registration, foundational licensing and platform groundwork.
        </p>
      </section>

      <div className="founding-fixed-terms">
        <div><Crown size={19} /><span><small>Ownership</small><strong>100% founder-owned</strong></span></div>
        <div><BadgeCheck size={19} /><span><small>Chief executive</small><strong>{player.name} remains CEO</strong></span></div>
        <div><CircleDollarSign size={19} /><span><small>Outside capital</small><strong>$0 • no dilution</strong></span></div>
        <div><Building2 size={19} /><span><small>Opening debt</small><strong>$0 • no lender</strong></span></div>
      </div>

      <div className={`founding-affordability ${canAfford ? 'is-ready' : 'is-short'}`} role="status">
        <Banknote size={22} aria-hidden="true" />
        <div>
          <span>{canAfford ? 'READY TO SIGN' : 'MORE LIQUID CASH REQUIRED'}</span>
          <strong>
            {canAfford
              ? `${formatMoney(personalCashAfter)} personal cash remains`
              : `Short by ${formatMoney(STREAMING_INCORPORATION_ECONOMY.cashRequired - player.money)}`}
          </strong>
          <small>Current liquid cash: {formatMoney(player.money)}</small>
        </div>
      </div>
    </>
  );

  const renderStep = () => {
    if (step === 0) return renderIdentityStep();
    if (step === 1) return renderPromiseStep();
    return renderReviewStep();
  };

  if (isIncorporated && !showReveal) {
    const identity = platform.identity!;
    const profile = platform.foundingProfile!;
    const promise = STREAMING_BRAND_PROMISES.find(
      item => item.id === identity.brandPromiseId,
    );
    return (
      <div
        className="founding-shell founding-complete-shell"
        style={{ '--founding-accent': identity.primaryColor } as React.CSSProperties}
      >
        <header className="founding-topbar">
          <button type="button" className="founding-icon-button" onClick={onBack} aria-label="Back to Lifestyle">
            <ArrowLeft size={20} />
          </button>
          <div className="founding-top-wordmark">{identity.name}</div>
          <span className="founding-top-state"><BadgeCheck size={14} /> Incorporated</span>
        </header>

        <main className="founding-scroll">
          <StreamingVisualScene
            sceneId="registration"
            className="founding-registration-scene founding-complete-scene"
            status={{ label: 'Charter active', detail: '100% founder owned', tone: 'success' }}
            ariaLabel={`${identity.name} incorporation record`}
            imageLoading="eager"
          >
            <section className="founding-complete-card">
              <div className="founding-complete-mark">
                <LogoMark logoKey={identity.logoKey} size="large" />
              </div>
              <span>FOUNDED BY {player.name.toUpperCase()}</span>
              <h1>{identity.name}</h1>
              <p>{promise?.description}</p>

              <div className="founding-certificate-grid">
                <div><small>Founder ownership</small><strong>{profile.founderOwnershipPercentAtIncorporation}%</strong></div>
                <div><small>Founder role</small><strong>CEO</strong></div>
                <div><small>Setup invested</small><strong>{formatMoney(profile.setupCostsConsumed)}</strong></div>
                <div><small>Opening treasury</small><strong>{formatMoney(profile.openingTreasuryCash)}</strong></div>
              </div>

              <div className="founding-complete-actions">
                <button
                  type="button"
                  className="founding-secondary-button"
                  onClick={() => {
                    setReplayMode(true);
                    playSoundIdent(identity.soundIdentKey);
                    setShowReveal(true);
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  Replay reveal
                </button>
                <button type="button" className="founding-primary-button" onClick={onBack}>
                  Enter the company
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>
          </StreamingVisualScene>
        </main>
      </div>
    );
  }

  return (
    <div
      className="founding-shell"
      style={{ '--founding-accent': draft.primaryColor } as React.CSSProperties}
    >
      <div aria-hidden={showReveal || undefined}>
        <header className="founding-topbar">
          <button
            type="button"
            className="founding-icon-button"
            onClick={handleBack}
            aria-label={step === 0 ? 'Back to Lifestyle' : 'Previous step'}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="founding-progress-block">
            <span>FOUNDING STUDIO</span>
            <div
              className="founding-progress-track"
              role="progressbar"
              aria-label="Founding progress"
              aria-valuemin={1}
              aria-valuemax={STREAMING_FOUNDING_STEP_COUNT}
              aria-valuenow={step + 1}
            >
              <span style={{ width: `${((step + 1) / STREAMING_FOUNDING_STEP_COUNT) * 100}%` }} />
            </div>
          </div>
          <span className="founding-step-count">{step + 1}/{STREAMING_FOUNDING_STEP_COUNT}</span>
        </header>

        <main className="founding-scroll">
          <StreamingVisualScene
            sceneId="registration"
            className="founding-registration-scene"
            ariaLabel={`${stepCopy.kicker}: ${stepCopy.title}`}
            imageLoading="eager"
          >
            <section className="founding-step-card" key={step}>
              <div className="founding-step-intro">
                <span>{stepCopy.kicker}</span>
                <h1>{stepCopy.title}</h1>
                <p>{stepCopy.copy}</p>
              </div>
              <div className="founding-step-body">{renderStep()}</div>
            </section>
          </StreamingVisualScene>
        </main>

        <footer className="founding-footer">
          <div className="founding-save-state">
            <Check size={13} aria-hidden="true" />
            Progress saves with this career
          </div>
          {(feedback || currentStepIssue) && (
            <p role="alert">{feedback || currentStepIssue}</p>
          )}
          {step < STREAMING_FOUNDING_STEP_COUNT - 1 ? (
            <button type="button" className="founding-primary-button" onClick={handleNext}>
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="founding-primary-button is-incorporate"
              onClick={handleIncorporate}
              disabled={!validation.valid || !canAfford || isSubmitting || !onUpdatePlayer}
            >
              <Building2 size={18} />
              {isSubmitting ? 'Signing charter…' : `Incorporate ${draft.name.trim() || 'Platform'}`}
            </button>
          )}
        </footer>
      </div>

      {showReveal && (
        <AccessibleDialog
          className="founding-reveal"
          aria-labelledby="founding-reveal-title"
          onEscape={() => finishReveal('DISMISSED')}
        >
          <StreamingVisualScene
            sceneId="registration"
            className="founding-reveal-scene"
            status={{ label: 'Incorporated', detail: 'Charter sealed', tone: 'success' }}
            ariaLabel="Streaming company founding reveal"
            imageLoading="eager"
          >
            <button
              type="button"
              className="founding-reveal-skip"
              onClick={() => finishReveal('DISMISSED')}
            >
              Skip reveal
            </button>
            <section className="founding-reveal-card">
              <span className="founding-reveal-kicker">A NEW SIGNAL IS LIVE</span>
              <div className="founding-reveal-mark">
                <LogoMark
                  logoKey={platform.identity?.logoKey || draft.logoKey}
                  size="large"
                />
              </div>
              <h2 id="founding-reveal-title">{platform.identity?.name || draft.name}</h2>
              <p>Founded by {player.name}. Independent from the first frame.</p>
              <div className="founding-reveal-facts">
                <span><Crown size={16} /> 100% founder owned</span>
                <span><BadgeCheck size={16} /> Founder remains CEO</span>
                <span>
                  <CircleDollarSign size={16} />
                  {formatMoney(
                    platform.foundingProfile?.openingTreasuryCash
                    || STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
                  )} operating treasury
                </span>
              </div>
              <button
                type="button"
                className="founding-reveal-action"
                onClick={() => finishReveal('VIEWED')}
                autoFocus
              >
                Enter the company
                <ChevronRight size={18} />
              </button>
            </section>
          </StreamingVisualScene>
        </AccessibleDialog>
      )}
    </div>
  );
}
