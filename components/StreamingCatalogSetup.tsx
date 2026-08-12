import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  FileSignature,
  Film,
  Globe2,
  Handshake,
  LibraryBig,
  LockKeyhole,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  OwnedStreamingCatalogSetupDraft,
  Player,
  StreamingLicenseExclusivity,
  StreamingLicenseTerritory,
} from '../types';
import {
  STREAMING_LICENSE_TERMS,
  STREAMING_LICENSE_TERRITORIES,
  STREAMING_STARTER_CATALOG_PACKAGES,
  acceptStreamingCatalogCounter,
  createDefaultStreamingCatalogDraft,
  getEligibleOwnedStreamingTitles,
  getStreamingLicenseOpportunities,
  getStreamingLicenseQuote,
  saveStreamingCatalogDraft,
  signStreamingStarterCatalog,
  submitStreamingCatalogOffer,
} from '../services/streamingCatalog';
import StreamingVisualScene, {
  type StreamingVisualSceneTone,
} from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-catalog.css';
import '../styles/streaming-content-workspaces.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
}

const STEPS = ['Owned library', 'Opening package', 'License target', 'Deal room', 'Agreement'];

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  return `$${Math.round(value).toLocaleString()}`;
};

const titleMeta = (type: string, genre: string, year: number | null) => (
  [type === 'SERIES' ? 'Series' : 'Movie', genre !== 'Unknown' ? genre : null, year].filter(Boolean).join(' • ')
);

export default function StreamingCatalogSetup({ player, onUpdatePlayer, onClose }: Props) {
  const platform = player.ownedStreamingPlatform;
  const [draft, setDraft] = useState<OwnedStreamingCatalogSetupDraft>(
    platform.catalogSetupDraft || createDefaultStreamingCatalogDraft(player),
  );
  const [feedback, setFeedback] = useState('');
  const [completed, setCompleted] = useState(false);
  const [signing, setSigning] = useState(false);
  const ownedTitles = useMemo(() => getEligibleOwnedStreamingTitles(player), [player]);
  const opportunities = useMemo(() => getStreamingLicenseOpportunities(player), [player]);
  const selectedOpportunity = opportunities.find(item => item.id === draft.opportunityProjectId) || null;
  const signedOpportunityTitle = platform.catalogLicenses.find(
    license => license.sourceProjectId === draft.opportunityProjectId,
  )?.titleAtSigning;
  const selectedPackage = STREAMING_STARTER_CATALOG_PACKAGES.find(item => item.id === draft.packageId)
    || STREAMING_STARTER_CATALOG_PACKAGES[0];
  const quote = selectedOpportunity
    ? getStreamingLicenseQuote(selectedOpportunity, draft.territory, draft.durationWeeks, draft.exclusivity)
    : null;

  const updateDraft = (patch: Partial<OwnedStreamingCatalogSetupDraft>) => {
    setFeedback('');
    setDraft(current => ({
      ...current,
      ...patch,
      negotiationStatus: 'BUILDING',
      counterMinimumGuarantee: null,
      counterPlatformRevenueShare: null,
      negotiationRound: 0,
    }));
  };

  const persist = (nextDraft = draft) => {
    const nextPlayer = saveStreamingCatalogDraft(player, nextDraft);
    if (nextPlayer !== player) onUpdatePlayer(nextPlayer);
  };

  const goTo = (step: number) => {
    const next = { ...draft, currentStep: Math.max(0, Math.min(4, step)) };
    setDraft(next);
    persist(next);
  };

  const close = () => {
    if (!completed) persist(draft);
    onClose();
  };

  const chooseOpportunity = (projectId: string) => {
    const opportunity = opportunities.find(item => item.id === projectId);
    if (!opportunity) return;
    const nextQuote = getStreamingLicenseQuote(opportunity, draft.territory, draft.durationWeeks, draft.exclusivity);
    updateDraft({
      opportunityProjectId: projectId,
      minimumGuarantee: nextQuote.suggestedGuarantee,
      platformRevenueShare: nextQuote.targetPlatformRevenueShare + 3,
    });
  };

  const changeCommercialTerm = (
    patch: Partial<Pick<OwnedStreamingCatalogSetupDraft, 'territory' | 'durationWeeks' | 'exclusivity'>>,
  ) => {
    if (!selectedOpportunity) return;
    const territory = patch.territory || draft.territory;
    const durationWeeks = patch.durationWeeks || draft.durationWeeks;
    const exclusivity = patch.exclusivity || draft.exclusivity;
    const nextQuote = getStreamingLicenseQuote(selectedOpportunity, territory, durationWeeks, exclusivity);
    updateDraft({
      ...patch,
      minimumGuarantee: nextQuote.suggestedGuarantee,
      platformRevenueShare: nextQuote.targetPlatformRevenueShare + 3,
    });
  };

  const submitOffer = () => {
    const result = submitStreamingCatalogOffer(player, draft);
    setDraft(result.draft);
    setFeedback(result.message);
    if (result.player !== player) onUpdatePlayer(result.player);
  };

  const acceptCounter = () => {
    const saved = saveStreamingCatalogDraft(player, draft);
    const result = acceptStreamingCatalogCounter(saved);
    setDraft(result.draft);
    setFeedback(result.changed ? 'Counteroffer accepted. Business Affairs prepared the final agreement.' : 'No counteroffer is available.');
    if (result.player !== player) onUpdatePlayer(result.player);
  };

  const sign = () => {
    if (signing) return;
    setSigning(true);
    const saved = saveStreamingCatalogDraft(player, draft);
    const result = signStreamingStarterCatalog(saved);
    if (!result.changed) {
      setSigning(false);
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot cover this minimum guarantee.'
        : 'The agreement is not ready to sign.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback('');
    setCompleted(true);
    setSigning(false);
    if (navigator.vibrate) navigator.vibrate([18, 35, 25]);
  };

  const canContinue = draft.currentStep === 0
    ? true
    : draft.currentStep === 1
      ? Boolean(draft.packageId)
      : draft.currentStep === 2
        ? Boolean(selectedOpportunity)
        : true;
  const catalogSceneId = completed || draft.currentStep < 2 ? 'contentStudio' : 'marketRoom';
  const catalogSceneTone: StreamingVisualSceneTone = completed
    ? 'success'
    : draft.currentStep === 3 && draft.negotiationStatus === 'COUNTERED'
      ? 'warning'
      : draft.currentStep >= 3 && draft.negotiationStatus === 'READY_TO_SIGN'
        ? 'success'
        : 'active';
  const catalogSceneStatus = completed
    ? { label: 'Catalog established', detail: 'Opening rights records are canonical.' }
    : draft.currentStep < 2
      ? { label: 'Content floor open', detail: `${draft.selectedOwnedProjectIds.length} owned title${draft.selectedOwnedProjectIds.length === 1 ? '' : 's'} selected.` }
      : draft.negotiationStatus === 'COUNTERED'
        ? { label: `Counteroffer · round ${draft.negotiationRound}`, detail: 'The licensor has moved the commercial terms.' }
        : draft.negotiationStatus === 'READY_TO_SIGN'
          ? { label: 'Terms agreed', detail: 'Business Affairs can prepare the signature.' }
          : { label: 'Rights market live', detail: selectedOpportunity ? `${selectedOpportunity.title} is on the table.` : 'Choose an external anchor title.' };

  return (
    <AccessibleDialog
      className="catalog-setup-shell"
      aria-labelledby="catalog-setup-title"
      onEscape={close}
    >
      <header className="catalog-setup-topbar">
        <button type="button" onClick={close} aria-label="Close catalog setup"><X size={20} /></button>
        <div>
          <span>CONTENT BUSINESS</span>
          <strong id="catalog-setup-title">Open the catalog</strong>
        </div>
        <small>{draft.currentStep + 1}/{STEPS.length}</small>
      </header>

      <div className="catalog-step-rail" aria-label="Catalog setup progress">
        {STEPS.map((step, index) => (
          <button
            type="button"
            key={step}
            className={index === draft.currentStep ? 'is-active' : index < draft.currentStep ? 'is-complete' : ''}
            onClick={() => index < draft.currentStep && goTo(index)}
            disabled={index > draft.currentStep}
            aria-current={index === draft.currentStep ? 'step' : undefined}
          >
            <span>{index < draft.currentStep ? <Check size={12} /> : index + 1}</span>
            <small>{step}</small>
          </button>
        ))}
      </div>

      <main className="catalog-setup-main">
        <StreamingVisualScene
          sceneId={catalogSceneId}
          eyebrow={catalogSceneId === 'marketRoom' ? 'PRIVATE RIGHTS FLOOR' : 'CONTENT STUDIO'}
          title={completed
            ? 'The opening shelves are programmed.'
            : catalogSceneId === 'marketRoom'
              ? selectedOpportunity?.title || 'The first rights target'
              : selectedPackage.title}
          description={completed
            ? 'Owned references, licensed rights and commercial terms now form one auditable catalog record.'
            : catalogSceneId === 'marketRoom'
              ? 'Take a real released title from the market board to the negotiation table and final agreement.'
              : 'Shape the library from projects you control, then define the programming point of view.'}
          status={{ ...catalogSceneStatus, tone: catalogSceneTone }}
          className="catalog-workspace-scene"
          imageLoading="eager"
        >
          <div className="content-scene-readouts">
            <div><span>OWNED PICKS</span><strong>{draft.selectedOwnedProjectIds.length}</strong></div>
            <div><span>SHELF THESIS</span><strong>{selectedPackage.title}</strong></div>
            <div><span>RIGHTS TARGET</span><strong>{selectedOpportunity?.title || signedOpportunityTitle || 'Scanning'}</strong></div>
            <div><span>TREASURY</span><strong>{formatMoney(platform.treasuryCash)}</strong></div>
          </div>
        </StreamingVisualScene>
        {completed ? (
          <section key="catalog-complete" className="catalog-completion catalog-stage-transition">
            <div className="catalog-completion-signal"><Sparkles size={34} /></div>
            <span>CATALOG ESTABLISHED</span>
            <h1>The shelves have a point of view.</h1>
            <p>
              {draft.selectedOwnedProjectIds.length} owned title{draft.selectedOwnedProjectIds.length === 1 ? '' : 's'} linked,
              {' '}one external anchor signed, and every record remains connected to its original project.
            </p>
            <div className="catalog-completion-facts">
              <div><LibraryBig size={18} /><span>Opening package</span><strong>{selectedPackage.title}</strong></div>
              <div><FileSignature size={18} /><span>First license</span><strong>{selectedOpportunity?.title || signedOpportunityTitle || 'Signed'}</strong></div>
              <div><Banknote size={18} /><span>Minimum guarantee</span><strong>{formatMoney(draft.minimumGuarantee)}</strong></div>
            </div>
            <button type="button" className="catalog-primary-button" onClick={onClose}>Enter Content Room <ChevronRight size={18} /></button>
          </section>
        ) : draft.currentStep === 0 ? (
          <section key="catalog-step-0" className="catalog-stage catalog-stage-transition is-library-floor">
            <div className="catalog-stage-heading">
              <span>01 • RIGHTS INTAKE</span>
              <h1>Bring your studio library home.</h1>
              <p>These are released projects from production houses you control. EMPIRE+ stores a reference—not a duplicate movie record and not a fake internal sale.</p>
            </div>
            {ownedTitles.length ? (
              <>
                <div className="catalog-selection-summary">
                  <div><LibraryBig size={18} /><span>Eligible library</span><strong>{ownedTitles.length} titles</strong></div>
                  <div><BadgeCheck size={18} /><span>Selected to import</span><strong>{draft.selectedOwnedProjectIds.length}</strong></div>
                </div>
                <div className="catalog-title-grid">
                  {ownedTitles.map(title => {
                    const selected = draft.selectedOwnedProjectIds.includes(title.id);
                    return (
                      <button
                        type="button"
                        key={title.id}
                        className={selected ? 'is-selected' : ''}
                        onClick={() => updateDraft({
                          selectedOwnedProjectIds: selected
                            ? draft.selectedOwnedProjectIds.filter(id => id !== title.id)
                            : [...draft.selectedOwnedProjectIds, title.id],
                        })}
                      >
                        <span className="catalog-poster"><Film size={23} /></span>
                        <span><strong>{title.title}</strong><small>{titleMeta(title.projectType, title.genre, title.releaseYear)}</small><em>{title.studioName}</em></span>
                        <i>{selected ? <Check size={14} /> : null}</i>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="catalog-honest-empty">
                <LibraryBig size={28} />
                <h2>No owned releases are eligible yet.</h2>
                <p>You can still establish EMPIRE+ with an external anchor license. When your production houses release titles later, they can join the catalog without being duplicated.</p>
              </div>
            )}
          </section>
        ) : draft.currentStep === 1 ? (
          <section key="catalog-step-1" className="catalog-stage catalog-stage-transition is-programming-thesis">
            <div className="catalog-stage-heading">
              <span>02 • PROGRAMMING THESIS</span>
              <h1>Choose what the opening shelf should say.</h1>
              <p>This is a strategic package, not a paid content bundle. It shapes the library’s identity and later launch forecasts.</p>
            </div>
            <div className="catalog-package-grid">
              {STREAMING_STARTER_CATALOG_PACKAGES.map(item => {
                const selected = item.id === draft.packageId;
                return (
                  <button type="button" key={item.id} className={selected ? 'is-selected' : ''} onClick={() => updateDraft({ packageId: item.id })}>
                    <span>{item.label}</span>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <small>{item.programmingIntent}</small>
                    <div><strong>{item.recommendedOwnedTitles}</strong> recommended owned titles</div>
                    {selected ? <i><Check size={14} /> Selected</i> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : draft.currentStep === 2 ? (
          <section key="catalog-step-2" className="catalog-stage catalog-stage-transition is-rights-board">
            <div className="catalog-stage-heading">
              <span>03 • RIGHTS MARKET</span>
              <h1>Find the title that opens the door.</h1>
              <p>One real released project becomes the guided first negotiation. The full rotating rights marketplace remains a later expansion.</p>
            </div>
            {opportunities.length ? (
              <div className="catalog-market-grid">
                {opportunities.map(title => {
                  const selected = title.id === draft.opportunityProjectId;
                  const indicative = getStreamingLicenseQuote(title, 'MULTI_REGION', 104, 'NON_EXCLUSIVE');
                  return (
                    <button type="button" key={title.id} className={selected ? 'is-selected' : ''} onClick={() => chooseOpportunity(title.id)}>
                      <div className="catalog-market-art"><Film size={26} /><span>{title.projectType === 'SERIES' ? 'SERIES' : 'FILM'}</span></div>
                      <div><span>{title.genre}</span><h2>{title.title}</h2><p>{title.studioName}</p></div>
                      <div className="catalog-market-data">
                        <span><small>Rating</small><strong>{title.rating?.toFixed(1) || 'Not rated'}</strong></span>
                        <span><small>Indicative</small><strong>{formatMoney(indicative.suggestedGuarantee)}</strong></span>
                      </div>
                      {selected ? <i><Check size={14} /> Target selected</i> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="catalog-honest-empty">
                <Film size={28} />
                <h2>No released external title is available.</h2>
                <p>EMPIRE+ will not invent a movie to complete this step. Advance your career until the industry archive contains a released project.</p>
              </div>
            )}
          </section>
        ) : draft.currentStep === 3 ? (
          <section key="catalog-step-3" className="catalog-stage catalog-stage-transition is-deal-room">
            <div className="catalog-stage-heading">
              <span>04 • PRIVATE DEAL ROOM</span>
              <h1>Shape the window, not just the price.</h1>
              <p>{selectedOpportunity?.studioName} controls the rights to <strong>{selectedOpportunity?.title}</strong>. Every term changes the commercial ask.</p>
            </div>
            <div className="catalog-deal-room-brief">
              <div>
                <span className="catalog-deal-room-icon"><Handshake size={20} /></span>
                <span><small>NEGOTIATION TABLE</small><strong>{platform.identity?.name || 'EMPIRE+'} × {selectedOpportunity?.studioName || 'Rights holder'}</strong></span>
              </div>
              <div>
                <small>ROOM STATUS</small>
                <strong>{draft.negotiationStatus === 'COUNTERED' ? `Counter · round ${draft.negotiationRound}` : draft.negotiationStatus === 'READY_TO_SIGN' ? 'Terms agreed' : 'Offer in preparation'}</strong>
              </div>
            </div>
            <div className="catalog-deal-layout">
              <div className="catalog-term-stack">
                <fieldset>
                  <legend><Globe2 size={16} /> Territory</legend>
                  <div>
                    {STREAMING_LICENSE_TERRITORIES.map(item => (
                      <button type="button" key={item.id} className={draft.territory === item.id ? 'is-selected' : ''} onClick={() => changeCommercialTerm({ territory: item.id })}>
                        <strong>{item.title}</strong><small>{item.description}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend><Scale size={16} /> Window</legend>
                  <div className="is-three">
                    {STREAMING_LICENSE_TERMS.map(weeks => (
                      <button type="button" key={weeks} className={draft.durationWeeks === weeks ? 'is-selected' : ''} onClick={() => changeCommercialTerm({ durationWeeks: weeks })}>
                        <strong>{weeks / 52} year{weeks > 52 ? 's' : ''}</strong><small>{weeks} weeks</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend><LockKeyhole size={16} /> Exclusivity</legend>
                  <div>
                    {([
                      ['NON_EXCLUSIVE', 'Shared window', 'Lower guarantee; rivals may also carry it.'],
                      ['EXCLUSIVE', 'Exclusive window', 'Stronger differentiation at a premium.'],
                    ] as Array<[StreamingLicenseExclusivity, string, string]>).map(([id, title, copy]) => (
                      <button type="button" key={id} className={draft.exclusivity === id ? 'is-selected' : ''} onClick={() => changeCommercialTerm({ exclusivity: id })}>
                        <strong>{title}</strong><small>{copy}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <aside className="catalog-offer-card">
                <div className="catalog-dossier-tabs" aria-hidden="true"><span>TERM SHEET</span><span>CONFIDENTIAL</span></div>
                <span>YOUR OPENING OFFER</span>
                <h2>{selectedOpportunity?.title}</h2>
                <label>
                  Minimum guarantee
                  <div><span>$</span><input type="number" inputMode="numeric" step={250000} value={draft.minimumGuarantee} onChange={event => updateDraft({ minimumGuarantee: Math.max(0, Number(event.target.value) || 0) })} /></div>
                </label>
                <label>
                  EMPIRE+ revenue share
                  <div><input type="range" min={50} max={90} step={1} value={draft.platformRevenueShare} onChange={event => updateDraft({ platformRevenueShare: Number(event.target.value) })} /><strong>{draft.platformRevenueShare}%</strong></div>
                </label>
                <div className="catalog-offer-split">
                  <span><small>Platform</small><strong>{draft.platformRevenueShare}%</strong></span>
                  <span><small>Licensor</small><strong>{100 - draft.platformRevenueShare}%</strong></span>
                </div>
                {quote ? <p>Owner range {formatMoney(quote.minimumGuarantee)}–{formatMoney(quote.maximumGuarantee)}. Their position is inferred from the title, territory, duration and exclusivity.</p> : null}
                {draft.negotiationStatus === 'COUNTERED' ? (
                  <div className="catalog-counter">
                    <span>COUNTEROFFER • ROUND {draft.negotiationRound}</span>
                    <h3>{formatMoney(draft.counterMinimumGuarantee || 0)} guarantee</h3>
                    <p>EMPIRE+ keeps {draft.counterPlatformRevenueShare}% of revenue; the licensor keeps {100 - (draft.counterPlatformRevenueShare || 0)}%.</p>
                    <button type="button" onClick={acceptCounter}>Accept counter <Handshake size={17} /></button>
                  </div>
                ) : (
                  <button type="button" className="catalog-primary-button" onClick={submitOffer}>Submit offer <Handshake size={18} /></button>
                )}
              </aside>
            </div>
          </section>
        ) : (
          <section key="catalog-step-4" className="catalog-stage catalog-agreement-stage catalog-stage-transition is-signature-desk">
            <div className="catalog-stage-heading">
              <span>05 • BUSINESS AFFAIRS</span>
              <h1>Read the agreement before the signature.</h1>
              <p>Signing charges EMPIRE+ treasury once, activates the window immediately and establishes the starter catalog.</p>
            </div>
            <article className="catalog-contract">
              <header><div><span>STREAMING EXHIBITION LICENSE</span><h2>{selectedOpportunity?.title}</h2></div><FileSignature size={29} /></header>
              <div className="catalog-contract-parties">
                <div><span>Licensee</span><strong>{platform.identity?.name || 'EMPIRE+'}</strong></div>
                <div><span>Licensor</span><strong>{selectedOpportunity?.studioName}</strong></div>
              </div>
              <dl>
                <div><dt>Territory</dt><dd>{STREAMING_LICENSE_TERRITORIES.find(item => item.id === draft.territory)?.title}</dd></div>
                <div><dt>Term</dt><dd>{draft.durationWeeks} weeks</dd></div>
                <div><dt>Window</dt><dd>{draft.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Non-exclusive'}</dd></div>
                <div><dt>Guarantee</dt><dd>{formatMoney(draft.minimumGuarantee)}</dd></div>
                <div><dt>Platform share</dt><dd>{draft.platformRevenueShare}%</dd></div>
                <div><dt>Licensor share</dt><dd>{100 - draft.platformRevenueShare}%</dd></div>
              </dl>
              <footer>
                <BadgeCheck size={18} />
                <p>Expiry is stored as an absolute game week. The licensed project remains the canonical title record.</p>
              </footer>
            </article>
            <div className="catalog-signing-strip">
              <div><Banknote size={18} /><span>After signing</span><strong>{formatMoney(Math.max(0, platform.treasuryCash - draft.minimumGuarantee))} treasury</strong></div>
              <button type="button" className="catalog-primary-button" disabled={signing || platform.treasuryCash < draft.minimumGuarantee} onClick={sign}>
                {signing ? 'Signing…' : 'Sign & establish catalog'} <FileSignature size={18} />
              </button>
            </div>
          </section>
        )}
        {feedback ? <div className="catalog-feedback" role="status">{feedback}</div> : null}
      </main>

      {!completed ? (
        <footer className="catalog-setup-footer">
          <button type="button" onClick={() => goTo(draft.currentStep - 1)} disabled={draft.currentStep === 0}><ArrowLeft size={17} /> Back</button>
          {draft.currentStep < 3 ? (
            <button type="button" className="catalog-primary-button" onClick={() => goTo(draft.currentStep + 1)} disabled={!canContinue}>
              Continue <ChevronRight size={18} />
            </button>
          ) : draft.currentStep === 3 && draft.negotiationStatus === 'READY_TO_SIGN' ? (
            <button type="button" className="catalog-primary-button" onClick={() => goTo(4)}>Review agreement <ChevronRight size={18} /></button>
          ) : (
            <span className="catalog-footer-note">{draft.currentStep === 3 ? 'Agree terms to continue' : 'Final signature is above'}</span>
          )}
        </footer>
      ) : null}
    </AccessibleDialog>
  );
}
