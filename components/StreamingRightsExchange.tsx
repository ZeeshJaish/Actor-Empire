import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileKey2,
  Gavel,
  Globe2,
  HandCoins,
  Layers3,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Swords,
  TimerReset,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import type {
  OwnedStreamingRightsNegotiation,
  Player,
  StreamingLicenseExclusivity,
  StreamingLicenseTerritory,
  StreamingRightsRenewalCase,
  StreamingRightsWindowType,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
  acceptStreamingRightsCounter,
  createDefaultStreamingRightsTerms,
  getStreamingCataloguePackageOpportunities,
  getStreamingRightsOpportunities,
  openStreamingRightsNegotiation,
  openStreamingRightsRenewal,
  reviseStreamingRightsNegotiation,
  signStreamingRightsDeal,
  signOwnedStreamingCataloguePackage,
  submitStreamingRightsOffer,
  type StreamingRightsTermsInput,
} from '../services/streamingRightsMarketplace';
import StreamingVisualScene from './StreamingVisualScene';
import StreamingRightsCalendar, { getStreamingRightsTimingLabel } from './StreamingRightsCalendar';
import { getStreamingRightsCalendar, normalizeStreamingRightsManagementState } from '../services/streamingRightsCalendar';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import '../styles/streaming-rights-exchange.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenPromotion?: (projectId: string) => void;
  onOpenTitleDossier?: (projectId: string) => void;
}

type ExchangeTab = 'MARKET' | 'DEALS' | 'CALENDAR' | 'VAULT';

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatWindow = (value: StreamingRightsWindowType) => (
  value === 'FIRST_WINDOW' ? 'First window' : value === 'SECOND_WINDOW' ? 'Second window' : 'Permanent catalog'
);

const formatCountries = (countryIds: string[]): string => {
  const names = countryIds.map(countryId => getStreamingDayOneMarket(countryId)?.country || countryId);
  if (!names.length) return 'Worldwide';
  if (names.length <= 2) return names.join(' + ');
  return `${names.slice(0, 2).join(' + ')} +${names.length - 2}`;
};

const termsFromNegotiation = (negotiation: OwnedStreamingRightsNegotiation): StreamingRightsTermsInput => ({
  territory: negotiation.territory,
  durationWeeks: negotiation.durationWeeks,
  exclusivity: negotiation.exclusivity,
  windowType: negotiation.windowType,
  minimumGuarantee: negotiation.minimumGuarantee,
  platformRevenueShare: negotiation.platformRevenueShare,
  marketingGuarantee: negotiation.marketingGuarantee,
  viewershipBonusThreshold: negotiation.viewershipBonusThreshold,
  viewershipBonusAmount: negotiation.viewershipBonusAmount,
  renewalOption: negotiation.renewalOption,
  sublicensingAllowed: negotiation.sublicensingAllowed,
  sequelRightsIncluded: negotiation.sequelRightsIncluded,
  changeOfControl: negotiation.changeOfControl,
  cancellationPenalty: negotiation.cancellationPenalty,
});

export default function StreamingRightsExchange({
  player,
  onUpdatePlayer,
  onClose,
  onOpenPromotion,
  onOpenTitleDossier,
}: Props) {
  const platform = player.ownedStreamingPlatform;
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const [tab, setTab] = useState<ExchangeTab>('MARKET');
  const [selectedNegotiationId, setSelectedNegotiationId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const opportunities = useMemo(() => getStreamingRightsOpportunities(player), [player]);
  const cataloguePackages = useMemo(() => getStreamingCataloguePackageOpportunities(player), [player]);
  const calendar = useMemo(() => getStreamingRightsCalendar(player, absoluteWeek), [player, absoluteWeek]);
  const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
  const platformCalendarItems = [
    ...calendar.groups.actionRequired,
    ...calendar.groups.expiringSoon,
    ...calendar.groups.renewalNegotiations,
    ...calendar.groups.returningToMarket,
    ...calendar.groups.recentlyCompleted,
  ]
    .filter(item => item.incumbentBuyer.type === 'PLAYER_PLATFORM');
  const platformCalendarActions = platformCalendarItems.filter(item => item.status === 'ACTION_REQUIRED').length;
  const selectedNegotiation = platform.rightsNegotiations.find(item => item.id === selectedNegotiationId)
    || [...platform.rightsNegotiations].reverse().find(item => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(item.status))
    || null;
  const [terms, setTerms] = useState<StreamingRightsTermsInput | null>(
    selectedNegotiation ? termsFromNegotiation(selectedNegotiation) : null,
  );

  useEffect(() => {
    if (selectedNegotiation) setTerms(termsFromNegotiation(selectedNegotiation));
  }, [selectedNegotiation?.id, selectedNegotiation?.updatedAtAbsoluteWeek, selectedNegotiation?.status]);

  const activeNegotiations = platform.rightsNegotiations.filter(item => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(item.status));
  const obligations = platform.rightsObligations.filter(item => item.status !== 'SATISFIED');
  const liveContracts = platform.catalogLicenses.filter(item => item.status === 'ACTIVE');
  const selectedIsExactTransfer = Boolean(
    selectedNegotiation?.sourceLicenseId
    && (selectedNegotiation.kind === 'TRANSFER_OUT' || selectedNegotiation.sellerType === 'PLATFORM'),
  );

  const openOpportunity = (opportunityId: string) => {
    const opportunity = opportunities.find(item => item.id === opportunityId);
    if (!opportunity) return;
    const result = openStreamingRightsNegotiation(player, opportunityId, createDefaultStreamingRightsTerms(opportunity));
    if (!result.changed || !result.negotiation) {
      setFeedback(result.detail || 'That market package is no longer available in this cycle.');
      return;
    }
    onUpdatePlayer(result.player);
    setSelectedNegotiationId(result.negotiation.id);
    setTerms(termsFromNegotiation(result.negotiation));
    setFeedback('');
    setTab('DEALS');
  };

  const acquireCataloguePackage = (opportunityId: string) => {
    const result = signOwnedStreamingCataloguePackage(player, opportunityId);
    if (!result.changed) {
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot cover this complete package.'
        : result.detail || 'This package is no longer available.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(`${result.package?.name || 'Catalogue package'} added through ${result.contracts.length} title contracts.`);
  };

  const submitOffer = () => {
    if (!selectedNegotiation || !terms) return;
    const revised = reviseStreamingRightsNegotiation(player, selectedNegotiation.id, terms);
    const submitted = submitStreamingRightsOffer(revised.player, selectedNegotiation.id);
    if (!submitted.changed) {
      setFeedback('This negotiating window has closed.');
      return;
    }
    onUpdatePlayer(submitted.player);
    setFeedback(submitted.negotiation?.responseStatus === 'AWAITING_RESPONSE'
      ? `Private offer sent. The rights holder will reply after ${Math.max(2, (submitted.negotiation.responseDueAbsoluteWeek || absoluteWeek + 2) - absoluteWeek)} processed weeks.`
      : submitted.negotiation?.status === 'READY_TO_SIGN'
        ? 'The term sheet cleared. Legal is ready for signature.'
        : submitted.negotiation?.status === 'LOST'
          ? 'A rival closed the window before our bid could recover.'
          : 'The counterparty returned a live counteroffer.');
  };

  const acceptCounter = () => {
    if (!selectedNegotiation) return;
    const result = acceptStreamingRightsCounter(player, selectedNegotiation.id);
    if (result.changed) {
      onUpdatePlayer(result.player);
      setFeedback('Counteroffer accepted. The contract is ready for signature.');
    }
  };

  const signDeal = () => {
    if (!selectedNegotiation) return;
    const result = signStreamingRightsDeal(player, selectedNegotiation.id);
    if (!result.changed) {
      setFeedback(result.detail || (result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot fund this minimum guarantee.'
        : 'This term sheet is not ready to sign.'));
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback('Signed, funded and written to the permanent contract ledger.');
    setTab('VAULT');
  };

  const startRenewal = (licenseId: string) => {
    const result = openStreamingRightsRenewal(player, licenseId);
    if (!result.changed || !result.negotiation) {
      setFeedback('This agreement has no exercisable renewal option.');
      return;
    }
    onUpdatePlayer(result.player);
    setSelectedNegotiationId(result.negotiation.id);
    setTerms(termsFromNegotiation(result.negotiation));
    setTab('DEALS');
  };

  return (
    <div className="rights-exchange-shell" role="dialog" aria-modal="true" aria-label="Streaming rights exchange">
      <header className="rights-exchange-topbar">
        <button type="button" onClick={onClose} aria-label="Close rights exchange"><ArrowLeft size={20} /></button>
        <div>
          <span>EMPIRE+ RIGHTS EXCHANGE</span>
          <strong>Market Session • Week {absoluteWeek}</strong>
        </div>
        <div className="rights-exchange-treasury">
          <small>PLATFORM TREASURY</small>
          <strong>{formatMoney(platform.treasuryCash)}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>

      <main className="rights-exchange-main">
        <StreamingVisualScene
          sceneId="marketRoom"
          className="rights-exchange-scene"
          eyebrow="LIVE RIGHTS FLOOR"
          title="Every title has a price. Every clause has a consequence."
          description="Studios sell windows. Platforms trade catalog. Rivals move while your lawyers negotiate."
          status={{
            label: opportunities.some(item => item.marketHeat === 'HOT') ? 'Hot market' : 'Exchange open',
            detail: `${opportunities.length} packages • ${activeNegotiations.length} live tables`,
            tone: opportunities.some(item => item.marketHeat === 'HOT') ? 'warning' : 'active',
          }}
          hotspots={[
            { id: 'floor', label: 'Market Floor', status: `${opportunities.length} packages`, x: 22, y: 45, tone: 'active', icon: <Globe2 size={16} /> },
            { id: 'table', label: 'Negotiation Table', status: `${activeNegotiations.length} live`, x: 51, y: 36, tone: activeNegotiations.length ? 'warning' : 'neutral', icon: <Gavel size={16} /> },
            { id: 'vault', label: 'Contract Vault', status: `${liveContracts.length} active`, x: 80, y: 45, tone: 'success', icon: <FileKey2 size={16} /> },
          ]}
          onHotspotSelect={hotspot => setTab(hotspot.id === 'floor' ? 'MARKET' : hotspot.id === 'table' ? 'DEALS' : 'VAULT')}
        />

        <nav className="rights-exchange-tabs" aria-label="Rights exchange sections">
          <button type="button" className={tab === 'MARKET' ? 'is-active' : ''} onClick={() => setTab('MARKET')}>
            <Globe2 size={17} /><span>Market Floor<small>{opportunities.length} packages</small></span>
          </button>
          <button type="button" className={tab === 'DEALS' ? 'is-active' : ''} onClick={() => setTab('DEALS')}>
            <Gavel size={17} /><span>Deal Room<small>{activeNegotiations.length} live tables</small></span>
          </button>
          <button type="button" className={tab === 'CALENDAR' ? 'is-active' : ''} onClick={() => setTab('CALENDAR')}>
            <CalendarClock size={17} /><span>Calendar<small>{platformCalendarActions} decisions</small></span>
          </button>
          <button type="button" className={tab === 'VAULT' ? 'is-active' : ''} onClick={() => setTab('VAULT')}>
            <FileKey2 size={17} /><span>Contract Vault<small>{obligations.length} actions due</small></span>
          </button>
        </nav>

        {feedback ? <div className="rights-exchange-feedback" role="status"><Sparkles size={16} /> {feedback}</div> : null}

        {tab === 'MARKET' ? (
          <section className="rights-market-floor">
            <header className="rights-section-heading">
              <div><span>GLOBAL RIGHTS BOARD</span><h2>Titles moving now</h2></div>
              <p>Listings refresh by deterministic four-week market cycle. A rival bid is real pressure, not a guaranteed loss.</p>
            </header>
            {cataloguePackages.length ? <section className="rights-catalogue-package-board">
              <header><div><Layers3 size={18} /><span>Catalogue packages</span></div><p>One treasury decision. Exact value and rights stay attached to every title.</p></header>
              {cataloguePackages.map(opportunity => <article key={opportunity.id}>
                <div className="rights-package-lead"><span>{opportunity.marketHeat} · {opportunity.package.components.length} TITLES</span><h3>{opportunity.package.name}</h3><p>{opportunity.sellerName} · {opportunity.package.maximumDurationWeeks} weeks · shared first window</p></div>
                <strong>{formatMoney(opportunity.totalGuarantee)}</strong>
                <details><summary>Title schedule</summary>{opportunity.rows.map(row => {
                  const component = opportunity.package.components.find(candidate => candidate.sourceProjectId === row.componentProjectId);
                  return <div key={row.componentProjectId}><span>{component?.title || row.componentProjectId}<small>{row.countryIds.length} markets · {row.licensorRevenueShare}% backend</small></span><b>{formatMoney(row.minimumGuarantee)}</b></div>;
                })}</details>
                <button type="button" disabled={platform.treasuryCash < opportunity.totalGuarantee} onClick={() => acquireCataloguePackage(opportunity.id)}><HandCoins size={16} />Acquire complete package</button>
              </article>)}
            </section> : null}
            <div className="rights-listing-grid">
              {opportunities.map(opportunity => (
                <article
                  key={opportunity.id}
                  data-opportunity-id={opportunity.id}
                  className={`rights-listing-card is-${opportunity.marketHeat.toLowerCase()} ${opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? 'is-transfer' : ''}`}
                >
                  <div className="rights-listing-poster" aria-hidden="true">
                    {opportunity.title.projectType === 'SERIES' ? <UsersRound size={30} /> : <Sparkles size={30} />}
                    <span>{opportunity.title.genre}</span>
                  </div>
                  <div className="rights-listing-body">
                    <div className="rights-listing-meta">
                      <span>{opportunity.kind === 'STUDIO_ACQUISITION' ? 'STUDIO WINDOW' : opportunity.kind === 'PLATFORM_TRADE' ? 'RESALE LISTING' : opportunity.kind === 'TRANSFER_OUT' ? 'SELL REMAINING WINDOW' : 'SUBLICENSE OFFER'}</span>
                      <strong>{opportunity.marketHeat}</strong>
                    </div>
                    <h3>{opportunity.title.title}</h3>
                    <p>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT'
                      ? 'The complete remaining licence moves to the buyer. Its scope and expiry do not reset.'
                      : opportunity.kind === 'SUBLICENSE_OUT'
                      ? `${opportunity.rivalPlatformName} is scouting a regional window.`
                      : `${opportunity.sellerName} controls the offered ${formatWindow(opportunity.recommendedWindow).toLowerCase()}.`}</p>
                    {opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? (
                      <div className="rights-transfer-chain" aria-label={`Original owner ${opportunity.originalOwnerName}. Current holder ${opportunity.currentHolderName}.`}>
                        <span><small>Original owner</small><strong>{opportunity.originalOwnerName}</strong></span>
                        <ChevronRight size={14} />
                        <span><small>Current holder</small><strong>{opportunity.currentHolderName}</strong></span>
                      </div>
                    ) : null}
                    <dl>
                      <div><dt>Opening ask</dt><dd>{formatMoney(opportunity.quote.suggestedGuarantee)}</dd></div>
                      <div><dt>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? 'Exact scope' : opportunity.kind === 'SUBLICENSE_OUT' ? 'Likely buyer' : 'Rival bid'}</dt><dd>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? formatCountries(opportunity.countryIds) : opportunity.rivalPlatformName}</dd></div>
                      <div><dt>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? 'Remaining term' : 'Territory'}</dt><dd>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? `${opportunity.remainingWeeks} weeks remaining` : opportunity.recommendedTerritory.replace('_', ' ')}</dd></div>
                      <div><dt>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? 'Inherited deal' : 'Window'}</dt><dd>{opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? `${opportunity.inheritedExclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · ${opportunity.inheritedLicensorRevenueShare}% studio backend` : formatWindow(opportunity.recommendedWindow)}</dd></div>
                    </dl>
                    {opportunity.kind === 'PLATFORM_TRADE' || opportunity.kind === 'TRANSFER_OUT' ? (
                      <div className={`rights-inherited-actions ${opportunity.incompatibilityDetail ? 'is-blocked' : ''}`}>
                        <ShieldCheck size={13} />
                        {opportunity.incompatibilityDetail || (opportunity.inheritedObligationCount
                          ? `${opportunity.inheritedObligationCount} inherited ${opportunity.inheritedObligationCount === 1 ? 'action' : 'actions'}`
                          : 'No inherited actions')}
                      </div>
                    ) : null}
                    <button type="button" disabled={Boolean(opportunity.incompatibilityDetail)} title={opportunity.incompatibilityDetail || undefined} onClick={() => openOpportunity(opportunity.id)}>
                      {opportunity.kind === 'SUBLICENSE_OUT' || opportunity.kind === 'TRANSFER_OUT' ? <HandCoins size={17} /> : <Swords size={17} />}
                      {opportunity.kind === 'SUBLICENSE_OUT' ? 'Open sales table' : opportunity.kind === 'TRANSFER_OUT' ? 'Offer remaining licence' : opportunity.kind === 'PLATFORM_TRADE' ? 'Bid for exact licence' : 'Enter negotiation'} <ChevronRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
              {!opportunities.length ? (
                <div className="rights-empty-board">
                  <TimerReset size={28} />
                  <h3>The floor is between cycles.</h3>
                  <p>Close an active table or advance the game week to reveal the next rights packages.</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === 'DEALS' ? (
          <section className="rights-deal-room">
            <aside className="rights-live-tables">
              <span>LIVE TABLES</span>
              {activeNegotiations.map(negotiation => (
                <button
                  type="button"
                  key={negotiation.id}
                  className={selectedNegotiation?.id === negotiation.id ? 'is-active' : ''}
                  onClick={() => setSelectedNegotiationId(negotiation.id)}
                >
                  <strong>{negotiation.title}</strong>
                  <small>Round {negotiation.round} • {negotiation.status.replaceAll('_', ' ')}</small>
                </button>
              ))}
              {!activeNegotiations.length ? <p>No active term sheets. Enter the Market Floor to open one.</p> : null}
            </aside>
            {selectedNegotiation && terms ? (
              <div className="rights-negotiation-table">
                <header>
                  <div><span>{selectedNegotiation.kind.replaceAll('_', ' ')} • ROUND {selectedNegotiation.round}/3</span><h2>{selectedNegotiation.title}</h2><p>{selectedNegotiation.sellerName}{selectedNegotiation.buyerName ? ` → ${selectedNegotiation.buyerName}` : ''}</p></div>
                  <div className={`rights-heat-badge is-${selectedNegotiation.marketHeat.toLowerCase()}`}>
                    <TrendingUp size={16} /> {selectedNegotiation.marketHeat} PRESSURE
                  </div>
                </header>
                <div className="rights-rival-strip">
                  <Swords size={19} />
                  <span>{selectedNegotiation.rivalPlatformName || selectedNegotiation.buyerName || 'Buyer desk'} signal</span>
                  <strong>{formatMoney(selectedNegotiation.rivalBidAmount)} competing value</strong>
                  <small>Table expires after week {selectedNegotiation.expiresAtAbsoluteWeek}</small>
                </div>
                {selectedIsExactTransfer ? <div className="rights-fixed-transfer-terms">
                  <span>INHERITED LICENCE — FIXED</span>
                  <strong>{formatCountries(selectedNegotiation.countryIds)} · {formatWindow(selectedNegotiation.windowType)} · {selectedNegotiation.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</strong>
                  <small>The price is negotiable. Scope, expiry, backend and attached obligations transfer unchanged.</small>
                </div> : null}
                <div className={`rights-term-grid ${selectedIsExactTransfer ? 'is-exact-transfer' : ''}`}>
                  {!selectedIsExactTransfer ? <>
                  <label><span>Territory</span><select value={terms.territory} onChange={event => setTerms({ ...terms, territory: event.target.value as StreamingLicenseTerritory })}><option value="DOMESTIC">Domestic</option><option value="MULTI_REGION">Multi-region</option><option value="GLOBAL">Global</option></select></label>
                  <label><span>Window</span><select value={terms.windowType} onChange={event => setTerms({ ...terms, windowType: event.target.value as StreamingRightsWindowType })}><option value="FIRST_WINDOW">First window</option><option value="SECOND_WINDOW">Second window</option><option value="PERMANENT">Permanent catalog</option></select></label>
                  <label><span>Term</span><select value={terms.durationWeeks} onChange={event => setTerms({ ...terms, durationWeeks: Number(event.target.value) })}><option value={52}>52 weeks</option><option value={104}>104 weeks</option><option value={156}>156 weeks</option><option value={260}>260 weeks</option></select></label>
                  <label><span>Exclusivity</span><select value={terms.exclusivity} onChange={event => setTerms({ ...terms, exclusivity: event.target.value as StreamingLicenseExclusivity })}><option value="NON_EXCLUSIVE">Non-exclusive</option><option value="EXCLUSIVE">Exclusive</option></select></label>
                  </> : null}
                  <label className="is-money"><span>{selectedIsExactTransfer ? 'Transfer price' : selectedNegotiation.kind === 'SUBLICENSE_OUT' ? 'Upfront asking price' : 'Minimum guarantee'}</span><input type="number" min={0} step={250000} value={terms.minimumGuarantee} onChange={event => setTerms({ ...terms, minimumGuarantee: Number(event.target.value) })} /><small>{formatMoney(terms.minimumGuarantee)}</small></label>
                  {!selectedIsExactTransfer ? <>
                  <label><span>{selectedNegotiation.kind === 'SUBLICENSE_OUT' ? 'Your revenue share' : 'Platform revenue share'}</span><input type="range" min={45} max={90} value={terms.platformRevenueShare} onChange={event => setTerms({ ...terms, platformRevenueShare: Number(event.target.value) })} /><small>{terms.platformRevenueShare}% / {100 - terms.platformRevenueShare}%</small></label>
                  <label className="is-money"><span>Marketing guarantee</span><input type="number" min={0} step={250000} value={terms.marketingGuarantee} onChange={event => setTerms({ ...terms, marketingGuarantee: Number(event.target.value) })} /><small>{formatMoney(terms.marketingGuarantee)}</small></label>
                  </> : null}
                </div>
                {!selectedIsExactTransfer ? <div className="rights-clause-board">
                  {([
                    ['renewalOption', 'Renewal option'],
                    ['sublicensingAllowed', 'Sublicensing allowed'],
                    ['sequelRightsIncluded', 'Sequel / franchise rights'],
                  ] as const).map(([key, label]) => (
                    <button type="button" key={key} className={terms[key] ? 'is-on' : ''} onClick={() => setTerms({ ...terms, [key]: !terms[key] })}>
                      {terms[key] ? <CheckCircle2 size={16} /> : <Scale size={16} />}{label}
                    </button>
                  ))}
                  <span><ShieldCheck size={16} /> Cancellation penalty {formatMoney(terms.cancellationPenalty)}</span>
                  <span><UsersRound size={16} /> Audience target {terms.viewershipBonusThreshold.toLocaleString()} accounts</span>
                </div> : <div className="rights-clause-board is-transfer"><ShieldCheck size={16} /><span>No studio consent, notice, or transfer participation. The original backend remains attached.</span></div>}
                {selectedNegotiation.status === 'COUNTERED' ? (
                  <div className="rights-counteroffer">
                    <div><span>COUNTEROFFER RECEIVED</span><strong>{formatMoney(selectedNegotiation.counterMinimumGuarantee || 0)} • {selectedNegotiation.counterPlatformRevenueShare}% platform share</strong></div>
                    <button type="button" onClick={acceptCounter}><BadgeCheck size={17} /> Accept counter</button>
                  </div>
                ) : null}
                <footer>
                  <span><Clock3 size={15} /> Changes stay on this term sheet until you submit.</span>
                  {selectedNegotiation.status === 'READY_TO_SIGN' ? (
                    <button type="button" className="is-sign" onClick={signDeal}><FileKey2 size={18} /> Sign & fund contract</button>
                  ) : selectedNegotiation.status !== 'LOST' && selectedNegotiation.status !== 'SIGNED' ? (
                    <button type="button" onClick={submitOffer}><Gavel size={18} /> Submit round {selectedNegotiation.round + 1}</button>
                  ) : null}
                </footer>
              </div>
            ) : (
              <div className="rights-empty-deal"><Gavel size={31} /><h2>No one is at the table.</h2><p>Open a title on the Market Floor to begin a three-round negotiation.</p><button type="button" onClick={() => setTab('MARKET')}>Open Market Floor</button></div>
            )}
          </section>
        ) : null}

        {tab === 'CALENDAR' ? (
          <section className="rights-calendar-section">
            <StreamingRightsCalendar
              player={player}
              context="PLATFORM"
              onUpdatePlayer={onUpdatePlayer}
              embedded
            />
          </section>
        ) : null}

        {tab === 'VAULT' ? (
          <section className="rights-contract-vault">
            <header className="rights-section-heading">
              <div><span>PERMANENT COMPANY RECORD</span><h2>Contract vault</h2></div>
              <p>Windows expire. Obligations use real promotion spend and title viewing evidence. Breaches hit weekly cash exactly once.</p>
            </header>
            {obligations.length ? (
              <div className="rights-obligation-rail">
                <header><ShieldCheck size={18} /><div><span>PERFORMANCE OBLIGATIONS</span><strong>{obligations.length} clauses need attention</strong></div></header>
                {obligations.map(obligation => {
                  const progress = Math.min(100, obligation.targetAmount ? obligation.observedAmount / obligation.targetAmount * 100 : 100);
                  return (
                    <article key={obligation.id}>
                      <div><span>{obligation.type === 'MARKETING_SPEND' ? 'MARKETING GUARANTEE' : 'VIEWERSHIP THRESHOLD'}</span><strong>{obligation.title}</strong><small>Due week {obligation.dueAtAbsoluteWeek} • {obligation.status.replace('_', ' ')}</small></div>
                      <div className="rights-progress"><i style={{ width: `${progress}%` }} /><span>{Math.round(progress)}%</span></div>
                      <button type="button" onClick={() => obligation.type === 'MARKETING_SPEND' ? onOpenPromotion?.(obligation.sourceProjectId) : onOpenTitleDossier?.(obligation.sourceProjectId)}>
                        {obligation.type === 'MARKETING_SPEND' ? 'Open campaign room' : 'Open title evidence'} <ChevronRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
            <div className="rights-vault-grid">
              {platform.catalogLicenses.map(license => {
                const weeksLeft = license.permanentPurchase ? null : Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek);
                const renewalCase = (Object.values(player.world.streamingRightsCalendar?.renewalCases || {}) as StreamingRightsRenewalCase[])
                  .find(candidate => candidate.sourceContractId === license.id);
                const renewalOpensAt = Math.max(
                  license.startsAtAbsoluteWeek,
                  license.expiresAtAbsoluteWeek - management.policy.noticeWeeks,
                );
                const renewalIsActionable = Boolean(
                  license.renewalOption
                  && license.status === 'ACTIVE'
                  && absoluteWeek >= renewalOpensAt
                  && (!renewalCase || renewalCase.outcome === 'PENDING'),
                );
                const timingLabel = getStreamingRightsTimingLabel(license as any, absoluteWeek, renewalCase);
                return (
                  <article key={license.id} className={`rights-contract-card is-${license.status.toLowerCase()}`}>
                    <header><div><span>{license.origin?.replace('_', ' ') || 'STARTER AGREEMENT'}</span><h3>{license.titleAtSigning}</h3><p>{license.licensorName}</p></div><FileKey2 size={24} /></header>
                    <dl>
                      <div><dt>Rights</dt><dd>{license.territory.replace('_', ' ')} • {license.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Non-exclusive'}</dd></div>
                      <div><dt>Commercial</dt><dd>{formatMoney(license.minimumGuarantee)} • {license.platformRevenueShare}% platform</dd></div>
                      <div><dt>Window</dt><dd>{formatWindow(license.windowType || 'SECOND_WINDOW')}</dd></div>
                      <div><dt>Control clause</dt><dd>{(license.changeOfControl || 'NOTICE').replaceAll('_', ' ')}</dd></div>
                    </dl>
                    <footer>
                      <span className={`is-${license.status.toLowerCase()}`}>{license.status}</span>
                      <strong>{timingLabel || (weeksLeft == null ? 'Permanent' : `${weeksLeft} weeks remain`)}</strong>
                      {license.renewalOption ? (
                        <button
                          type="button"
                          disabled={!renewalIsActionable}
                          title={renewalIsActionable ? 'Open renewal negotiation' : `Renewal opens in Week ${renewalOpensAt}`}
                          onClick={() => renewalIsActionable && startRenewal(license.id)}
                        >
                          <RefreshCcw size={15} /> {renewalIsActionable ? 'Renew' : `Week ${renewalOpensAt}`}
                        </button>
                      ) : null}
                    </footer>
                  </article>
                );
              })}
              {platform.sublicenseDeals.map(deal => (
                <article key={deal.id} className={`rights-contract-card is-${deal.status.toLowerCase()}`}>
                  <header><div><span>OUTGOING SUBLICENSE</span><h3>{deal.title}</h3><p>Licensed to {deal.buyerName}</p></div><CircleDollarSign size={24} /></header>
                  <dl>
                    <div><dt>Cash received</dt><dd>{formatMoney(deal.upfrontFee)}</dd></div>
                    <div><dt>Seller split</dt><dd>{deal.sellerRevenueShare}%</dd></div>
                    <div><dt>Territory</dt><dd>{deal.territory.replace('_', ' ')}</dd></div>
                    <div><dt>Expiry</dt><dd>Week {deal.expiresAtAbsoluteWeek}</dd></div>
                  </dl>
                  <footer><span className={`is-${deal.status.toLowerCase()}`}>{deal.status}</span><strong>Platform-to-platform trade</strong></footer>
                </article>
              ))}
              {!platform.catalogLicenses.length && !platform.sublicenseDeals.length ? (
                <div className="rights-empty-board"><FileKey2 size={29} /><h3>The vault is empty.</h3><p>Your first signed rights agreement will appear here.</p></div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
