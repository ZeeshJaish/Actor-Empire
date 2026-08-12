import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  ChevronRight,
  Clapperboard,
  Compass,
  Film,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type {
  Genre,
  OwnedStreamingOriginalCommissionDraft,
  Player,
  StreamingOriginalStrategy,
} from '../types';
import {
  commissionFirstStreamingOriginal,
  createDefaultStreamingOriginalDraft,
  getStreamingAudienceGaps,
  getStreamingProductionPartners,
  saveStreamingOriginalDraft,
} from '../services/streamingOriginals';
import AccessibleDialog from './AccessibleDialog';
import {
  type Brand,
  Mark,
  brandColor,
  brandDeep,
} from './streaming-transplant/StreamingBrandVisuals';
import '../styles/streaming-content-workspaces.css';

interface Props {
  brand: Brand;
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onStartProduction: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
}

const GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'MYSTERY', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO', 'ANIMATION', 'FANTASY', 'CRIME', 'DOCUMENTARY', 'BIOPIC'];
const ORIGINAL_STRATEGIES: Array<{ id: StreamingOriginalStrategy; label: string; signal: string }> = [
  { id: 'EVENT_BLOCKBUSTER', label: 'Event blockbuster', signal: 'Acquisition' },
  { id: 'WEEKLY_RETENTION', label: 'Weekly retention', signal: 'Habit' },
  { id: 'PRESTIGE_LIMITED', label: 'Prestige limited', signal: 'Reputation' },
  { id: 'REGIONAL_BREAKOUT', label: 'Regional breakout', signal: 'Expansion' },
  { id: 'KIDS_EVERGREEN', label: 'Kids evergreen', signal: 'Durability' },
  { id: 'REALITY_ENGAGEMENT', label: 'Reality engine', signal: 'Efficiency' },
  { id: 'DOCUMENTARY_HALO', label: 'Documentary halo', signal: 'Trust' },
  { id: 'EXPERIMENTAL_CULT', label: 'Experimental cult', signal: 'Fandom' },
];

const money = (value: number) => value >= 1_000_000_000
  ? `$${(value / 1_000_000_000).toFixed(1)}B`
  : `$${Math.round(value / 1_000_000)}M`;

export default function StreamingOriginalCommissioning({
  brand,
  player,
  onUpdatePlayer,
  onClose,
  onStartProduction,
}: Props) {
  const platform = player.ownedStreamingPlatform;
  const isFirstOriginal = platform.originalCommissions.length === 0;
  const gaps = useMemo(() => getStreamingAudienceGaps(player), [player]);
  const studios = useMemo(() => getStreamingProductionPartners(player), [player]);
  const [draft, setDraft] = useState<OwnedStreamingOriginalCommissionDraft>(
    platform.originalCommissionDraft || createDefaultStreamingOriginalDraft(player),
  );
  const [message, setMessage] = useState('');
  const selectedGap = gaps.find(gap => gap.id === draft.gapId) || gaps[0];
  const selectedStudio = studios.find(studio => studio.id === draft.producerStudioId);
  const maxBudget = platform.treasuryCash;
  const canContinue = draft.currentStep === 0
    ? Boolean(selectedGap)
    : draft.currentStep === 1
      ? draft.title.trim().length >= 2
      : draft.currentStep === 2
        ? Boolean(selectedStudio) && draft.productionBudgetCap >= 5_000_000 && draft.productionBudgetCap <= maxBudget
        : true;
  const accent = brandColor(brand);
  const deep = brandDeep(brand);

  const update = (patch: Partial<OwnedStreamingOriginalCommissionDraft>) => {
    setDraft(current => ({ ...current, ...patch }));
    setMessage('');
  };

  const goTo = (step: number) => {
    const nextDraft = { ...draft, currentStep: step };
    setDraft(nextDraft);
    onUpdatePlayer(saveStreamingOriginalDraft(player, nextDraft));
  };

  const approve = () => {
    const result = commissionFirstStreamingOriginal(player, { ...draft, currentStep: 3 });
    if (!result.changed || !result.target) {
      const copy = result.reason === 'MISSING_TITLE'
        ? 'Give the Original a working title.'
        : result.reason === 'MISSING_PRODUCER'
          ? 'Choose an active production house.'
          : result.reason === 'INSUFFICIENT_TREASURY'
            ? 'The production cap exceeds available EMPIRE+ treasury.'
            : 'The mandate could not be approved in the current platform state.';
      setMessage(copy);
      return;
    }
    onUpdatePlayer(result.player);
    onStartProduction(result.target);
  };

  return (
    <AccessibleDialog
      className="streaming-workspace-overlay streaming-zip-overlay"
      aria-label={`${isFirstOriginal ? 'First' : 'New'} Original commissioning`}
      onEscape={onClose}
    >
      <div
        className="oc streaming-content-workspace"
        style={{ '--c': accent, '--c2': deep } as React.CSSProperties}
      >
        <header className="octop">
          <button type="button" className="ocback" onClick={draft.currentStep > 0 ? () => goTo(draft.currentStep - 1) : onClose} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="octitle">
            <b>COMMISSION ORIGINAL</b>
            <span>{isFirstOriginal ? 'THE FIRST ORIGINAL' : 'ORIGINALS STUDIO'} · BRIEF {draft.currentStep + 1}/4</span>
          </div>
          <span className="ocmark" aria-hidden="true"><Mark brand={brand} /></span>
        </header>

        <div className="ocstats" aria-label="Commission brief status">
          <div><span>GAP</span><b>{selectedGap.demandScore}</b></div>
          <div><span>FORMAT</span><b>{draft.projectType === 'SERIES' ? `${draft.episodes} EP` : 'FILM'}</b></div>
          <div><span>PRODUCER</span><b>{selectedStudio ? 'SET' : 'OPEN'}</b></div>
          <div><span>CAP</span><b>{money(draft.productionBudgetCap)}</b></div>
        </div>

        <nav className="octabs" aria-label={`Step ${draft.currentStep + 1} of 4`}>
          {['Audience gap', 'Creative brief', 'Producer', 'Mandate'].map((label, index) => (
            <button
              type="button"
              key={label}
              disabled={index > draft.currentStep}
              className={index === draft.currentStep ? 'on' : index < draft.currentStep ? 'done' : ''}
              onClick={() => index <= draft.currentStep && goTo(index)}
            >
              {index < draft.currentStep ? <BadgeCheck size={13} /> : <i>{index + 1}</i>}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <main className="ocscroll">
          <section className="ocbrief">
            <span>{draft.currentStep === 3 ? 'READY FOR CEO SIGNATURE' : 'COMMISSIONING DECISION'}</span>
            <strong>{draft.title.trim() || selectedGap.title}</strong>
            <p>Audience signal, creative mandate, physical producer and reserved funding remain connected to the real Greenlight workflow.</p>
          </section>
          {draft.currentStep === 0 && (
            <section key="original-step-0" className="content-workspace-step is-audience-wall">
              <div className="streaming-workspace-title">
                <Compass size={21} />
                <span>AUDIENCE INTELLIGENCE</span>
                <h1>Find the opening the catalog cannot fill.</h1>
                <p>These signals come from the titles already linked to your platform and the promise you chose at incorporation.</p>
              </div>
              <div className="streaming-gap-grid">
                {gaps.map(gap => (
                  <button
                    type="button"
                    key={gap.id}
                    className={draft.gapId === gap.id ? 'is-selected' : ''}
                    onClick={() => update({
                      gapId: gap.id,
                      projectType: gap.recommendedType,
                      genre: gap.recommendedGenre,
                      episodes: gap.recommendedType === 'SERIES' ? 8 : 1,
                    })}
                  >
                    <div><span>{gap.demandScore}</span><small>OPPORTUNITY</small></div>
                    <strong>{gap.title}</strong>
                    <em>{gap.signal}</em>
                    <p>{gap.rationale}</p>
                    <footer>{gap.recommendedType === 'SERIES' ? 'Series' : 'Movie'} • {gap.recommendedGenre.replace('_', ' ')}</footer>
                  </button>
                ))}
              </div>
            </section>
          )}

          {draft.currentStep === 1 && (
            <section key="original-step-1" className="content-workspace-step is-creative-brief">
              <div className="streaming-workspace-title">
                <Sparkles size={21} />
                <span>CREATIVE BRIEF</span>
                <h1>Turn the gap into a recognizable Original.</h1>
                <p>The production house will still choose cast, crew and execution inside the existing Greenlight workflow.</p>
              </div>
              <section className="streaming-form-card">
                <label>
                  <span>Working title</span>
                  <input
                    value={draft.title}
                    maxLength={100}
                    placeholder="Name the platform's first Original"
                    onChange={event => update({ title: event.target.value })}
                  />
                </label>
                <div className="streaming-segmented">
                  <button type="button" className={draft.projectType === 'SERIES' ? 'is-selected' : ''} onClick={() => update({ projectType: 'SERIES', episodes: 8 })}>Series</button>
                  <button type="button" className={draft.projectType === 'MOVIE' ? 'is-selected' : ''} onClick={() => update({ projectType: 'MOVIE', episodes: 1 })}>Movie</button>
                </div>
                <div className="streaming-original-strategy-grid" aria-label="Original business strategy">
                  {ORIGINAL_STRATEGIES.map(strategy => (
                    <button
                      type="button"
                      key={strategy.id}
                      className={(draft.strategy || 'WEEKLY_RETENTION') === strategy.id ? 'is-selected' : ''}
                      onClick={() => update({ strategy: strategy.id })}
                    >
                      <span>{strategy.signal}</span>
                      <strong>{strategy.label}</strong>
                    </button>
                  ))}
                </div>
                <div className="streaming-field-grid">
                  <label>
                    <span>Lead genre</span>
                    <select value={draft.genre} onChange={event => update({ genre: event.target.value as Genre })}>
                      {GENRES.map(genre => <option key={genre} value={genre}>{genre.replace('_', ' ')}</option>)}
                    </select>
                  </label>
                  {draft.projectType === 'SERIES' && (
                    <label>
                      <span>Episode order</span>
                      <select value={draft.episodes} onChange={event => update({ episodes: Number(event.target.value) })}>
                        {[6, 8, 10, 12, 16].map(count => <option key={count} value={count}>{count} episodes</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <aside><Compass size={17} /><div><strong>{selectedGap.title}</strong><p>{selectedGap.rationale}</p></div></aside>
              </section>
            </section>
          )}

          {draft.currentStep === 2 && (
            <section key="original-step-2" className="content-workspace-step is-producer-route">
              <div className="streaming-workspace-title">
                <Building2 size={21} />
                <span>PRODUCTION ROUTE</span>
                <h1>Choose who physically makes it.</h1>
                <p>EMPIRE+ commissions, funds and distributes. The selected production house hires the crew and runs the shoot.</p>
              </div>
              {studios.length ? (
                <div className="streaming-producer-grid">
                  {studios.map(studio => (
                    <button type="button" key={studio.id} className={studio.id === draft.producerStudioId ? 'is-selected' : ''} onClick={() => update({ producerStudioId: studio.id })}>
                      <div><Building2 size={20} /></div>
                      <span>PHYSICAL PRODUCER</span>
                      <strong>{studio.name}</strong>
                      <p>{studio.subtype === 'MAJOR_STUDIO' ? 'Major studio infrastructure' : 'Focused independent production team'}</p>
                      <small>Studio cash {money(studio.balance)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <section className="streaming-blocker-card">
                  <Building2 size={25} />
                  <h2>A producing company is required.</h2>
                  <p>Found or acquire a production house so this commissioned Original can enter the real Greenlight and production workflow.</p>
                </section>
              )}
              <section className="streaming-budget-card">
                <div><Banknote size={18} /><span>EMPIRE+ production cap</span><strong>{money(draft.productionBudgetCap)}</strong></div>
                <input
                  type="range"
                  min={5_000_000}
                  max={Math.max(5_000_000, maxBudget)}
                  step={5_000_000}
                  value={Math.min(draft.productionBudgetCap, Math.max(5_000_000, maxBudget))}
                  onChange={event => update({ productionBudgetCap: Number(event.target.value) })}
                />
                <p>{money(maxBudget)} available in platform treasury. The cap is reserved now; unused funding returns after Greenlight.</p>
              </section>
              <section className="streaming-contract-card">
                <div>
                  <span>RIGHTS NEGOTIATION</span>
                  <strong>{draft.platformRightsPercent || 85}% platform / {100 - (draft.platformRightsPercent || 85)}% producer backend</strong>
                </div>
                <label>
                  <span>Platform ownership</span>
                  <input
                    type="range"
                    min={51}
                    max={100}
                    step={1}
                    value={draft.platformRightsPercent || 85}
                    onChange={event => update({ platformRightsPercent: Number(event.target.value) })}
                  />
                </label>
                <label>
                  <span>Exclusive EMPIRE+ window</span>
                  <select value={draft.exclusiveWindowWeeks || 24} onChange={event => update({ exclusiveWindowWeeks: Number(event.target.value) })}>
                    {[8, 16, 24, 52].map(weeks => <option key={weeks} value={weeks}>{weeks} game weeks</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className={draft.sequelRightsIncluded !== false ? 'is-selected' : ''}
                  onClick={() => update({ sequelRightsIncluded: draft.sequelRightsIncluded === false })}
                >
                  <BadgeCheck size={16} /> Sequel and franchise rights {draft.sequelRightsIncluded !== false ? 'included' : 'excluded'}
                </button>
                <p>Because you control both companies, internal producer participation is shown in company accounts but eliminated from consolidated empire profit.</p>
              </section>
            </section>
          )}

          {draft.currentStep === 3 && (
            <section key="original-step-3" className="content-workspace-step is-greenlight-brief">
              <div className="streaming-workspace-title">
                <Clapperboard size={21} />
                <span>PRODUCTION MANDATE</span>
                <h1>Commission {isFirstOriginal ? `the first ${platform.identity?.name || 'EMPIRE+'} Original` : draft.title}.</h1>
                <p>This approval creates a real studio script and carries it directly into the existing Greenlight.</p>
              </div>
              <section className="streaming-mandate-card">
                <div className="streaming-mandate-poster"><Film size={34} /><span>{draft.projectType}</span></div>
                <div className="streaming-mandate-copy">
                  <span>{platform.identity?.name || 'EMPIRE+'} ORIGINAL</span>
                  <h2>{draft.title}</h2>
                  <p>{draft.genre.replace('_', ' ')} • {draft.projectType === 'SERIES' ? `${draft.episodes} episodes` : 'Feature film'} • {draft.targetAudience}</p>
                </div>
                <dl>
                  <div><dt>Commissioner / rights holder</dt><dd>{platform.identity?.name || 'EMPIRE+'}</dd></div>
                  <div><dt>Physical producer</dt><dd>{selectedStudio?.name || 'Not selected'}</dd></div>
                  <div><dt>Reserved production cap</dt><dd>{money(draft.productionBudgetCap)}</dd></div>
                  <div><dt>Audience mandate</dt><dd>{selectedGap.title}</dd></div>
                  <div><dt>Business strategy</dt><dd>{(draft.strategy || 'WEEKLY_RETENTION').replaceAll('_', ' ')}</dd></div>
                  <div><dt>Rights / backend</dt><dd>{draft.platformRightsPercent || 85}% / {100 - (draft.platformRightsPercent || 85)}%</dd></div>
                  <div><dt>Exclusive window</dt><dd>{draft.exclusiveWindowWeeks || 24} game weeks</dd></div>
                </dl>
                <aside><UsersRound size={17} /><p><strong>What “Original” means:</strong> commissioned before production for exclusive platform distribution. It does not mean the platform physically operates the cameras.</p></aside>
              </section>
            </section>
          )}
          {message && <p className="streaming-form-error" role="alert">{message}</p>}
        </main>

        <footer className="ocfooter">
          <div><span>STEP {draft.currentStep + 1} OF 4</span><strong>{draft.currentStep === 3 ? 'Final CEO approval' : 'Draft saves as you continue'}</strong></div>
          {draft.currentStep < 3 ? (
            <button type="button" disabled={!canContinue} onClick={() => goTo(draft.currentStep + 1)}>Continue <ChevronRight size={18} /></button>
          ) : (
            <button type="button" disabled={!canContinue} onClick={approve}>Approve & open Greenlight <Clapperboard size={18} /></button>
          )}
        </footer>
      </div>
    </AccessibleDialog>
  );
}
