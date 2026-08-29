import React, { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, ChevronRight, Clock3, Film, Globe2, Landmark, LayoutGrid, Music2, Sparkles, WalletCards, X } from 'lucide-react';
import type { Player, StreamingDefineLaunchStepId, StreamingIdentPackageId, StreamingSoundIdentKey } from '../types';
import {
  STREAMING_DAY_ONE_MARKETS,
  STREAMING_DAY_ONE_REGION_LABELS,
  STREAMING_DAY_ONE_REGION_ORDER,
  getStreamingCountryMarketProfile,
  getStreamingDayOneLanguageLabel,
  getStreamingMarketEntryProfile,
  summarizeStreamingDayOneMarkets,
} from '../services/streamingDayOneMarkets';
import {
  beginStreamingMarketClearance,
  getStreamingMarketClearanceView,
  resolveStreamingMarketRequirement,
  resumeStreamingMarketClearance,
  saveStreamingMarketPlan,
} from '../services/streamingMarkets';
import {
  STREAMING_FULL_IDENT_COST,
  getStreamingLaunchProgramView,
  saveStreamingLaunchBlueprint,
  saveStreamingServiceIdent,
  saveStreamingStorefrontPlan,
  setStreamingDefineLaunchStep,
} from '../services/streamingLaunchProgram';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getVisibleStreamingCompaniesForMarket } from '../services/streamingPlatformEcosystem';
import { resolveStreamingPlatformBrandById } from '../services/streamingPlatformBrandRegistry';
import { StreamingCountryFlagArt } from './streaming-transplant/StreamingCountryFlagArt';
import StreamingPlatformBrand from './StreamingPlatformBrand';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-define-launch.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenFinance: () => void;
  onOpenCatalogue: () => void;
  onOpenBuild: () => void;
  onOpenPricing: () => void;
  mode?: 'OPENING' | 'EXPANSION';
  initialStep?: StreamingDefineLaunchStepId;
}

const STEPS: Array<{ id: StreamingDefineLaunchStepId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'FUND', label: 'Fund', icon: WalletCards },
  { id: 'MARKETS', label: 'Markets', icon: Globe2 },
  { id: 'CLEARANCE', label: 'Clearance', icon: Landmark },
  { id: 'IDENTITY', label: 'Ident', icon: Music2 },
  { id: 'STOREFRONT', label: 'Storefront', icon: LayoutGrid },
  { id: 'CATALOGUE', label: 'Catalogue', icon: Film },
  { id: 'BLUEPRINT', label: 'Blueprint', icon: Sparkles },
];

const money = (value: number) => value >= 1_000_000
  ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  : `$${Math.round(value).toLocaleString()}`;

const audience = (value: number) => value >= 1_000_000
  ? `${Math.round(value / 1_000_000)}M`
  : Math.round(value).toLocaleString();

export default function StreamingDefineLaunchWizard({ player, onUpdatePlayer, onClose, onOpenFinance, onOpenCatalogue, onOpenBuild, onOpenPricing, mode = 'OPENING', initialStep }: Props) {
  const platform = player.ownedStreamingPlatform;
  const view = useMemo(() => getStreamingLaunchProgramView(player), [player]);
  const [step, setStep] = useState<StreamingDefineLaunchStepId>(mode === 'EXPANSION' ? 'MARKETS' : initialStep || platform.launchProgram.defineCurrentStep || 'FUND');
  const existingOpeningIds = platform.marketOperations
    .filter(operation => operation.entryKind === mode && operation.countryId && operation.status !== 'EXITED')
    .map(operation => operation.countryId!);
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>(existingOpeningIds);
  const [region, setRegion] = useState(STREAMING_DAY_ONE_REGION_ORDER.find(id => STREAMING_DAY_ONE_MARKETS.some(market => market.regionId === id && selectedMarketIds.includes(market.id))) || 'NORTH_AMERICA');
  const [soundIdentKey, setSoundIdentKey] = useState<StreamingSoundIdentKey>(platform.serviceConfiguration.soundIdentKey || 'PULSE');
  const [identPackageId, setIdentPackageId] = useState<StreamingIdentPackageId>(platform.serviceConfiguration.identPackageId || 'STANDARD');
  const [storefrontLayoutId, setStorefrontLayoutId] = useState(platform.serviceConfiguration.storefrontLayoutId || 'CINEMA');
  const [pricingApproach, setPricingApproach] = useState(platform.serviceConfiguration.pricingApproach || 'PREMIUM');
  const [feedback, setFeedback] = useState('');
  const [marketIntelOpen, setMarketIntelOpen] = useState(true);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const currentIndex = STEPS.findIndex(item => item.id === step);
  const marketOperations = platform.marketOperations.filter(operation => operation.entryKind === mode && operation.status !== 'EXITED');
  const plannedMarketCost = selectedMarketIds.reduce((sum, id) => {
    const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === id);
    return sum + (market?.openingRightsEstimate || 0) + getStreamingMarketEntryProfile(id).plannedOverheadEstimate;
  }, 0);
  const selectedMarketSummary = summarizeStreamingDayOneMarkets(selectedMarketIds);
  const regionMarketIds = STREAMING_DAY_ONE_MARKETS.filter(market => market.regionId === region).map(market => market.id);
  const selectedRegionIds = selectedMarketIds.filter(id => regionMarketIds.includes(id));
  const selectedRegionSummary = summarizeStreamingDayOneMarkets(selectedRegionIds);

  const go = (next: StreamingDefineLaunchStepId) => {
    setFeedback('');
    setStep(next);
    onUpdatePlayer(setStreamingDefineLaunchStep(player, next));
  };

  const next = () => go(STEPS[Math.min(STEPS.length - 1, currentIndex + 1)].id);
  const back = () => currentIndex > 0 ? go(STEPS[currentIndex - 1].id) : onClose();
  const toggleMarket = (id: string) => setSelectedMarketIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const addAllRegionMarkets = () => {
    const availableIds = STREAMING_DAY_ONE_MARKETS
      .filter(market => market.regionId === region)
      .filter(market => !platform.marketOperations.some(operation => operation.entryKind !== mode && operation.countryId === market.id && operation.status !== 'EXITED'))
      .map(market => market.id);
    setSelectedMarketIds(current => Array.from(new Set([...current, ...availableIds])));
  };

  const saveMarkets = () => {
    const result = saveStreamingMarketPlan(player, selectedMarketIds, mode);
    if (!result.changed) return setFeedback('Choose at least one opening country.');
    const advancedPlayer = setStreamingDefineLaunchStep(result.player, 'CLEARANCE');
    onUpdatePlayer(advancedPlayer);
    setStep('CLEARANCE');
    setFeedback(`${mode === 'OPENING' ? 'Opening-market' : 'Expansion'} plan saved. No money has moved.`);
  };

  const beginClearance = () => {
    const result = beginStreamingMarketClearance(player, selectedMarketIds, mode);
    onUpdatePlayer(result.player);
    if (result.reason === 'INSUFFICIENT_TREASURY') return setFeedback(`Company treasury is short by ${money(result.shortfall)}. Fund it in Studio Finance.`);
    if (!result.changed) return setFeedback('These markets are already in review or cleared.');
    setFeedback(`${money(result.amount)} paid. Government review is now running in parallel.`);
  };

  const resolveRequirement = (operationId: string) => {
    const result = resolveStreamingMarketRequirement(player, operationId);
    if (result.reason === 'INSUFFICIENT_TREASURY') return setFeedback(`Company treasury is short by ${money(result.shortfall)}. Fund it in Studio Finance.`);
    if (!result.changed) return setFeedback('This government request is no longer actionable.');
    onUpdatePlayer(result.player);
    setFeedback(`${money(result.amount)} paid. The revised filing is back in review.`);
  };

  const reapply = (operationId: string) => {
    const result = resumeStreamingMarketClearance(player, operationId);
    if (result.reason === 'TOO_EARLY') return setFeedback('The cooling period is still active. Advance the game week and return here.');
    if (!result.changed) return setFeedback('This file cannot be resubmitted yet.');
    onUpdatePlayer(result.player);
    setFeedback('Revised application filed. Government review has resumed.');
  };

  const saveIdent = () => {
    const result = saveStreamingServiceIdent(player, { soundIdentKey, identPackageId });
    if (!result.changed) return setFeedback(result.reason === 'INSUFFICIENT_TREASURY' ? `Treasury is short by ${money(result.shortfall)}.` : 'The ident could not be commissioned.');
    onUpdatePlayer(result.player); setFeedback('Service ident commissioned.');
  };

  const saveStorefront = () => {
    const result = saveStreamingStorefrontPlan(player, { storefrontLayoutId, pricingApproach });
    if (!result.changed) return setFeedback('Choose both the storefront and pricing posture.');
    onUpdatePlayer(result.player); setFeedback('Storefront and demand posture saved for Network Build.');
  };

  const saveBlueprint = () => {
    const result = saveStreamingLaunchBlueprint(player);
    if (!result.changed) return setFeedback('Required launch definition items are still incomplete.');
    onUpdatePlayer(result.player); setFeedback('Launch Blueprint saved. Build now reads this version.');
  };

  const renderStep = () => {
    if (step === 'FUND') return <>
      <div className="dlw-hero-icon"><WalletCards size={28} /></div><span className="dlw-kicker">MISSION 01 · CAPITAL</span>
      <h2>Give the company an operating treasury.</h2><p>The $85M incorporation payment created the company; it did not fund operations. Move founder money here before committing rights, service identity or infrastructure.</p>
      <div className="dlw-balance"><span>AVAILABLE TREASURY</span><strong>{money(platform.treasuryCash)}</strong><small>Founder-owned · no company debt</small></div>
      <button className="dlw-primary" onClick={onOpenFinance}>OPEN STUDIO FINANCE <ChevronRight size={18} /></button>
      <button className="dlw-text" onClick={next}>Plan first at $0 <ChevronRight size={15} /></button>
    </>;

    if (step === 'MARKETS') return <>
      <span className="dlw-kicker">MISSION 02 · OPENING FOOTPRINT</span><h2>Where does the signal begin?</h2>
      <p>Explore freely. Selection becomes a cost only when you confirm market entry on the next screen.</p>
      <div className="dlw-region-tabs">{STREAMING_DAY_ONE_REGION_ORDER.map(id => <button key={id} className={region === id ? 'is-active' : ''} onClick={() => setRegion(id)}>{STREAMING_DAY_ONE_REGION_LABELS[id]}</button>)}</div>
      <div className="dlw-market-region-head"><span><small>MARKET VIEW</small><b>{STREAMING_DAY_ONE_REGION_LABELS[region]}</b></span><button type="button" onClick={addAllRegionMarkets}>ADD ALL {regionMarketIds.length}</button></div>
      <p className="dlw-market-guide">Swipe through the countries. Review the audience, rivals, rights, languages and government terms before adding them.</p>
      <div className="dlw-market-rail">{STREAMING_DAY_ONE_MARKETS.filter(market => market.regionId === region).map(market => {
        const selected = selectedMarketIds.includes(market.id);
        const alreadyOperating = platform.marketOperations.some(operation => operation.entryKind !== mode && operation.countryId === market.id && operation.status !== 'EXITED');
        const profile = getStreamingMarketEntryProfile(market.id);
        const terms = getStreamingCountryMarketProfile(market.id);
        const rivals = getVisibleStreamingCompaniesForMarket(player, market.id);
        const topRival = rivals.find(rival => rival.kind !== 'OTHERS');
        return <article key={market.id} className={`dlw-market-card ${selected ? 'is-selected' : ''} ${alreadyOperating ? 'is-unavailable' : ''}`}>
          <div className="dlw-market-hero">
            <StreamingCountryFlagArt marketId={market.id} className="dlw-market-art" /><span className="dlw-market-shade" />
            <span className="dlw-market-check">{alreadyOperating ? <BadgeCheck size={14} /> : selected ? <Check size={14} /> : '+'}</span>
            <div className="dlw-market-title"><small>{alreadyOperating ? 'ALREADY OPERATING' : `${market.competition} MARKET`}</small><strong>{market.country}</strong><em>{market.id} · {market.launchDifficulty} LAUNCH</em></div>
          </div>
          <div className="dlw-market-audience"><div><strong>{audience(market.streamingAudience)}</strong><span>STREAMING VIEWERS</span></div><div><strong>+{market.annualGrowthPercent}%</strong><span>YEARLY GROWTH</span></div></div>
          <p className="dlw-market-note">{market.marketNote}</p>
          <div className="dlw-market-languages">{market.languages.map(language => <span key={language}>{getStreamingDayOneLanguageLabel(language)}</span>)}</div>
          <div className="dlw-market-facts"><div><span>RIGHTS</span><b>{money(market.openingRightsEstimate)}</b></div><div><span>LAUNCH EFFORT</span><b>{market.launchDifficulty}</b></div><div><span>TOP RIVAL</span><b>{topRival ? `${topRival.name} · ${topRival.sharePercent}%` : 'Open field'}</b></div></div>
          <div className="dlw-market-local"><span>LOCAL LAUNCH</span><b>{market.localizationNote}</b></div>
          <details className="dlw-market-dossier">
            <summary><span><b>RULES, RIVALS & NETWORK</b><em>{profile.taxLoad.toLowerCase()} tax · {profile.approvalLoad.toLowerCase()} review</em></span><i>＋</i></summary>
            <div className="dlw-market-dossier-body">
              <div className="dlw-market-dossier-stats"><span><small>TAX LOAD</small><b>{profile.taxLoad}</b></span><span><small>OPENING REVIEW</small><b>{profile.approvalLoad}</b></span><span><small>EXPECTED TIME</small><b>{terms ? `${terms.approvalPeriodWeeks.minimum}–${terms.approvalPeriodWeeks.maximum} weeks` : `${profile.approvalWeeks} weeks`}</b></span></div>
              <section><small>WHAT MUST BE CLEARED</small><div className="dlw-market-requirements">{profile.clearances.map(clearance => <span key={clearance}>{clearance}</span>)}</div></section>
              <section><small>LOCAL EXPECTATION</small><p>{profile.localRule}</p></section>
              <section><small>PLANNED OVERHEAD</small><b>{money(profile.plannedOverheadEstimate)}</b><p>{profile.consequence}</p></section>
              <section><small>WHO ALREADY OWNS ATTENTION</small><div className="dlw-market-rivals">{rivals.map(rival => <div key={rival.id}><StreamingPlatformBrand brand={rival.brand} variant="LOCKUP" size="XS" /><i><b style={{ width: `${Math.min(100, (rival.sharePercent || 0) * 3)}%`, background: rival.brand.primaryColor }} /></i><em>{rival.sharePercent}%</em></div>)}</div></section>
              {terms && <><div className="dlw-market-policy"><span><small>TAX BASELINE</small><b>{terms.taxBaselinePercent}%</b></span><span><small>STREAMING LEVY</small><b>{terms.streamingLevyBaselinePercent}%</b></span><span><small>LOCAL CONTENT</small><b>{terms.localContentObligationPercent}%</b></span><span><small>PRIVACY</small><b>{terms.privacyComplianceLevel}</b></span></div><section><small>RECOMMENDED NETWORK FOOTPRINT</small><p>{terms.recommendedNetworkFootprint.edgeSites} edge site{terms.recommendedNetworkFootprint.edgeSites === 1 ? '' : 's'} · {audience(terms.recommendedNetworkFootprint.peakConcurrentStreams)} peak streams · {terms.recommendedNetworkFootprint.bandwidthGbps.toLocaleString()} Gbps · core city {terms.recommendedNetworkFootprint.recommendedCityId}</p></section></>}
            </div>
          </details>
          <button type="button" className="dlw-market-toggle" disabled={alreadyOperating} onClick={() => toggleMarket(market.id)}>{alreadyOperating ? 'EXISTING TERRITORY' : selected ? <><Check size={15} /> REMOVE FROM OPENING DAY</> : <>＋ ADD TO OPENING DAY</>}</button>
        </article>;
      })}</div>
      <section className="dlw-region-impact"><header><span><small>REGION IMPACT</small><b>{STREAMING_DAY_ONE_REGION_LABELS[region]} opening</b></span><strong>{selectedRegionIds.length}/{regionMarketIds.length}</strong></header><p>{selectedRegionSummary.verdict}</p><div><span><small>VIEWERS</small><b>{audience(selectedRegionSummary.streamingAudience)}</b></span><span><small>RIGHTS</small><b>{money(selectedRegionSummary.openingRightsEstimate)}</b></span><span><small>LANGUAGES</small><b>{selectedRegionSummary.languageCount}</b></span><span><small>GROWTH</small><b>+{selectedRegionSummary.averageGrowthPercent.toFixed(1)}%</b></span></div></section>
      <details className="dlw-footprint-intel" open={selectedMarketIds.length > 0 && marketIntelOpen} onToggle={event => setMarketIntelOpen(event.currentTarget.open)}>
        <summary><span><small>YOUR OPENING FOOTPRINT</small><b>{selectedMarketIds.length ? `${selectedMarketSummary.marketCount} market${selectedMarketSummary.marketCount === 1 ? '' : 's'} · ${selectedMarketSummary.regionCount} region${selectedMarketSummary.regionCount === 1 ? '' : 's'}` : 'No opening markets yet'}</b></span><em>{selectedMarketSummary.launchDifficulty}</em></summary>
        <div className="dlw-footprint-body"><p>{selectedMarketSummary.verdict}</p><div className="dlw-footprint-stats"><span><small>STREAMING VIEWERS</small><b>{audience(selectedMarketSummary.streamingAudience)}</b></span><span><small>YEARLY GROWTH</small><b>+{selectedMarketSummary.averageGrowthPercent.toFixed(1)}%</b></span><span><small>OPENING RIGHTS</small><b>{money(selectedMarketSummary.openingRightsEstimate)}</b></span><span><small>LANGUAGES</small><b>{selectedMarketSummary.languageCount}</b></span></div>{selectedMarketSummary.topRivals.length > 0 && <section><small>WHO ALREADY OWNS ATTENTION</small><div className="dlw-market-rivals">{selectedMarketSummary.topRivals.map(rival => { const brand = resolveStreamingPlatformBrandById(rival.id, rival.name); return <div key={rival.id}><StreamingPlatformBrand brand={brand} variant="LOCKUP" size="XS" /><i><b style={{ width: `${Math.min(100, rival.weightedShare * 3)}%`, background: brand.primaryColor }} /></i><em>{rival.weightedShare.toFixed(0)}%</em></div>; })}</div></section>}<div className="dlw-footprint-verdict"><span><small>COMPETITION</small><b>{selectedMarketSummary.competition}</b></span><span><small>LAUNCH WORK</small><b>{selectedMarketSummary.launchDifficulty}</b></span></div></div>
      </details>
      <div className="dlw-selection" aria-live="polite"><span>{selectedMarketIds.length} COUNTRIES</span><strong>{money(plannedMarketCost)}</strong><small>entry plan · not paid</small></div>
      <button className="dlw-primary" disabled={!selectedMarketIds.length} onClick={saveMarkets}>SAVE OPENING FOOTPRINT <ChevronRight size={18} /></button>
    </>;

    if (step === 'CLEARANCE') return <>
      <span className="dlw-kicker">MISSION 03 · GOVERNMENT REVIEW</span><h2>Clear every opening market.</h2><p>Rights access and regulatory setup are paid now. Review takes 4–6 game weeks, but the rest of both launch missions stays open.</p>
      <div className="dlw-clear-list">{marketOperations.length ? marketOperations.map(operation => {
        const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === operation.countryId);
        const profile = operation.countryProfile;
        const clearance = getStreamingMarketClearanceView(operation, absoluteWeek);
        const stages = ['APPLICATION_FILED', 'RIGHTS_VERIFICATION', 'REGULATORY_REVIEW', 'CONSUMER_DATA_COMPLIANCE', 'FINAL_APPROVAL'];
        const currentStage = clearance.stage ? stages.indexOf(clearance.stage) : -1;
        return <article className={`dlw-clear-file is-${operation.status.toLowerCase()}`} key={operation.id}>
          <header><StreamingCountryFlagArt marketId={operation.countryId || ''} /><span><small>{operation.entryKind === 'OPENING' ? 'OPENING FILE' : 'EXPANSION FILE'}</small><b>{profile?.country || market?.country || operation.scopeId}</b></span><em>{operation.status.replaceAll('_', ' ')}</em></header>
          {operation.clearance ? <>
            <div className="dlw-clear-stage"><span><b>{clearance.stageLabel}</b><small>{clearance.outcome && clearance.outcome !== 'PENDING' ? clearance.outcome.replaceAll('_', ' ') : clearance.remainingWeeks === 0 ? 'Decision due' : `${clearance.remainingWeeks ?? '—'} weeks remaining`}</small></span><strong>{Math.round(clearance.progressPercent)}%</strong></div>
            <div className="dlw-clear-progress"><i style={{ width: `${clearance.progressPercent}%` }} /></div>
            <div className="dlw-clear-dots">{stages.map((stageName, index) => <i key={stageName} className={index <= currentStage ? 'is-done' : ''} title={stageName.replaceAll('_', ' ')} />)}</div>
            {clearance.condition && <p>{clearance.condition}</p>}
            {clearance.actionRequired === 'PAY_REQUIREMENT' && <button onClick={() => resolveRequirement(operation.id)}>SUBMIT REQUIREMENT · {money(clearance.additionalPayment)}</button>}
            {clearance.actionRequired === 'REAPPLY' && <button onClick={() => reapply(operation.id)}>FILE REVISED APPLICATION</button>}
          </> : <div className="dlw-clear-preview"><span>{profile?.complianceRequirements.slice(0, 2).join(' · ') || getStreamingMarketEntryProfile(operation.countryId || '').clearances.join(' · ')}</span><b>{money(operation.plannedCosts.total)}</b></div>}
          <details><summary>Country terms <span>＋</span></summary><div><b>{profile?.taxBaselinePercent ?? 0}% tax · {profile?.streamingLevyBaselinePercent ?? 0}% levy</b><small>{profile?.localContentObligationPercent ?? 0}% local-content obligation · {profile?.privacyComplianceLevel || 'STANDARD'} privacy</small><small>{profile?.languageDistribution.map(language => `${language.language} ${language.audiencePercent}%`).join(' · ')}</small></div></details>
        </article>;
      }) : <div className="dlw-empty">Choose and save Opening Markets first.</div>}</div>
      <div className="dlw-callout"><Clock3 size={18} /><span><b>Parallel work stays open</b><small>Ident, storefront, catalogue and infrastructure can progress during review.</small></span></div>
      {marketOperations.some(operation => ['PLANNED', 'AWAITING_FUNDING'].includes(operation.status) && operation.clearance?.outcome !== 'ADDITIONAL_REQUIREMENT') && <button className="dlw-primary" onClick={beginClearance}>BEGIN MARKET ENTRY · {money(marketOperations.filter(operation => ['PLANNED', 'AWAITING_FUNDING'].includes(operation.status) && operation.clearance?.outcome !== 'ADDITIONAL_REQUIREMENT').reduce((sum, operation) => sum + operation.plannedCosts.total, 0))}</button>}
      {mode === 'OPENING' ? <button className="dlw-text" onClick={() => go('IDENTITY')}>Continue while review runs <ChevronRight size={15} /></button> : <button className="dlw-text" onClick={onClose}>Return to Audience <ChevronRight size={15} /></button>}
    </>;

    if (step === 'IDENTITY') return <>
      <span className="dlw-kicker">MISSION 04 · SERVICE IDENTITY</span><h2>What does the service sound like?</h2><p>Your founding mark stays untouched. This is the motion-and-sound signature viewers meet before playback.</p>
      <div className="dlw-option-grid">{(['PULSE','ASCENT','PREMIERE','SILENT'] as StreamingSoundIdentKey[]).map(id => <button key={id} className={soundIdentKey === id ? 'is-selected' : ''} onClick={() => setSoundIdentKey(id)}><Music2 size={18} /><b>{id}</b><small>{id === 'SILENT' ? 'No audio sting' : 'Three-second sonic motif'}</small></button>)}</div>
      <div className="dlw-package-grid"><button className={identPackageId === 'STANDARD' ? 'is-selected' : ''} onClick={() => setIdentPackageId('STANDARD')}><small>STANDARD</small><b>Signal sting</b><em>Included</em></button><button className={identPackageId === 'FULL' ? 'is-selected' : ''} onClick={() => setIdentPackageId('FULL')}><small>FULL PACKAGE</small><b>Motion system</b><em>{money(STREAMING_FULL_IDENT_COST)}</em></button></div>
      <button className="dlw-primary" onClick={saveIdent}>COMMISSION SERVICE IDENT</button>
      <button className="dlw-text" onClick={() => go('STOREFRONT')}>Continue <ChevronRight size={15} /></button>
    </>;

    if (step === 'STOREFRONT') return <>
      <span className="dlw-kicker">MISSION 05 · VIEWER OFFER</span><h2>Shape discovery and demand.</h2><p>Pricing sits here because it changes projected viewers. Network Build will read this decision instead of asking again.</p>
      <h3>Storefront rhythm</h3><div className="dlw-choice-row">{[['CINEMA','Editorial premieres'],['DISCOVERY','Personalized rails'],['EVENT','Live countdowns']] .map(([id,label]) => <button key={id} className={storefrontLayoutId === id ? 'is-selected' : ''} onClick={() => setStorefrontLayoutId(id)}><b>{id}</b><small>{label}</small></button>)}</div>
      <h3>Opening price posture</h3><div className="dlw-choice-row">{[['VALUE','Fast reach'],['PREMIUM','Brand prestige'],['HYBRID','Reach + upsell']] .map(([id,label]) => <button key={id} className={pricingApproach === id ? 'is-selected' : ''} onClick={() => setPricingApproach(id)}><b>{id}</b><small>{label}</small></button>)}</div>
      <button className="dlw-primary" onClick={saveStorefront}>SAVE VIEWER OFFER</button><button className="dlw-build" onClick={onOpenPricing}>SET TIER PRICES <ChevronRight size={18} /></button><button className="dlw-text" onClick={() => go('CATALOGUE')}>Continue <ChevronRight size={15} /></button>
    </>;

    if (step === 'CATALOGUE') return <>
      <span className="dlw-kicker">MISSION 06 · OPENING CATALOGUE</span><h2>Give opening night something worth watching.</h2><p>Link released titles you already own, choose the shelf strategy, and license external anchors only when they strengthen the plan.</p>
      <div className={`dlw-status-card ${platform.starterCatalog ? 'is-complete' : ''}`}><Film size={24} /><span><small>CATALOGUE FLOOR</small><b>{platform.starterCatalog ? 'Opening catalogue signed' : 'Not assembled'}</b><em>{platform.catalogLicenses.length} active licences · {platform.catalogProjectIds.length} titles linked</em></span>{platform.starterCatalog && <BadgeCheck size={22} />}</div>
      <button className="dlw-primary" onClick={onOpenCatalogue}>{platform.starterCatalog ? 'OPEN CONTENT DESK' : 'ASSEMBLE OPENING CATALOGUE'} <ChevronRight size={18} /></button><button className="dlw-text" onClick={() => go('BLUEPRINT')}>Review blueprint <ChevronRight size={15} /></button>
    </>;

    return <>
      <span className="dlw-kicker">MISSION 07 · VERSION CHECKPOINT</span><h2>Lock a blueprint—not your freedom.</h2><p>This checkpoint tells Network Build exactly what it must support. You can change it later; affected capacity and rehearsal results will become stale.</p>
      <div className="dlw-blueprint-list">{view.tracks[0].milestones.filter(item => item.id !== 'FUND_COMPANY').map(item => <div key={item.id}><span className={item.complete ? 'is-done' : ''}>{item.complete ? <Check size={13} /> : '·'}</span><b>{item.shortLabel}</b><em>{item.complete ? 'READY' : item.status.replaceAll('_',' ')}</em></div>)}</div>
      <button className="dlw-primary" onClick={saveBlueprint}>SAVE LAUNCH BLUEPRINT</button><button className="dlw-build" onClick={onOpenBuild}>OPEN BUILD THE PLATFORM <ChevronRight size={18} /></button>
    </>;
  };

  return <AccessibleDialog className="dlw-shell" aria-labelledby="define-launch-title" onEscape={onClose}>
    <header className="dlw-top"><button onClick={back} aria-label="Back"><ArrowLeft size={20} /></button><div><small>{mode === 'OPENING' ? 'EMPIRE+ PRE-LAUNCH' : 'AUDIENCE · EXPANSION'}</small><strong id="define-launch-title">{mode === 'OPENING' ? 'Define the Launch' : 'Enter a New Market'}</strong></div><button onClick={onClose} aria-label="Close"><X size={19} /></button></header>
    <nav className="dlw-steps" aria-label="Define launch steps">{STEPS.filter(item => mode === 'OPENING' || ['MARKETS','CLEARANCE'].includes(item.id)).map((item) => { const Icon=item.icon; const milestoneIndex=STEPS.findIndex(candidate=>candidate.id===item.id); return <button key={item.id} className={`${step === item.id ? 'is-active' : ''} ${view.tracks[0].milestones[milestoneIndex]?.complete ? 'is-complete' : ''}`} onClick={() => go(item.id)}><span>{view.tracks[0].milestones[milestoneIndex]?.complete ? <Check size={12}/> : <Icon size={13}/>}</span><small>{item.label}</small></button>; })}</nav>
    <main className="dlw-content">{renderStep()}{feedback && <div className="dlw-feedback">{feedback}</div>}</main>
  </AccessibleDialog>;
}
