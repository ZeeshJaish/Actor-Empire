import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileSearch,
  Gavel,
  Handshake,
  Landmark,
  Layers3,
  LockKeyhole,
  Radar,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import type {
  OwnedStreamingAcquisitionCase,
  Player,
  StreamingAcquisitionCommitmentId,
  StreamingAcquisitionDealStructure,
  StreamingAcquisitionFundingSource,
  StreamingIntegrationMode,
  StreamingRegulatoryStrategy,
} from '../types';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import {
  STREAMING_ACQUISITION_COMMITMENTS,
  STREAMING_INTEGRATION_MODES,
  STREAMING_REGULATORY_STRATEGIES,
  acceptStreamingAcquisitionCounter,
  beatStreamingAcquisitionCounterbid,
  commissionStreamingDueDiligence,
  getStreamingAcquisitionCommand,
  lockStreamingAcquisitionFinancing,
  resolveStreamingRegulatoryReview,
  scoutStreamingAcquisitionTarget,
  seekStreamingAcquisitionApproval,
  signStreamingPlatformAcquisition,
  submitStreamingAcquisitionOffer,
  valueStreamingAcquisitionTarget,
  withdrawStreamingAcquisitionCase,
} from '../services/streamingAcquisitions';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-acquisition-command.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenPlatformWars?: () => void;
  onOpenFinance?: () => void;
}

type CommandTab = 'SCOUT' | 'DEAL' | 'DATA' | 'APPROVALS' | 'INTEGRATION';

const TABS: Array<{ id: CommandTab; label: string; detail: string; icon: typeof Radar }> = [
  { id: 'SCOUT', label: 'Target room', detail: 'Scout the market', icon: Radar },
  { id: 'DEAL', label: 'Deal desk', detail: 'Value and offer', icon: Handshake },
  { id: 'DATA', label: 'Data room', detail: 'Diligence and bids', icon: FileSearch },
  { id: 'APPROVALS', label: 'Clearance', detail: 'Board, law and capital', icon: Landmark },
  { id: 'INTEGRATION', label: 'Integration', detail: 'Operate what you bought', icon: Layers3 },
];

const STATUS_STEPS = [
  'SCOUTED',
  'VALUED',
  'OFFER_COUNTERED',
  'DILIGENCE',
  'COUNTERBID',
  'APPROVALS',
  'REGULATORY_REVIEW',
  'FINANCING',
  'READY_TO_SIGN',
  'SIGNED',
];

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2).replace(/\.00$/, '')}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function DealPipeline({ acquisitionCase }: { acquisitionCase: OwnedStreamingAcquisitionCase }) {
  const current = acquisitionCase.status === 'APPROVAL_BLOCKED'
    ? STATUS_STEPS.indexOf('APPROVALS')
    : acquisitionCase.status === 'REGULATORY_BLOCKED'
      ? STATUS_STEPS.indexOf('REGULATORY_REVIEW')
      : STATUS_STEPS.indexOf(acquisitionCase.status);
  return (
    <div className="acq-pipeline" aria-label={`Deal stage: ${formatLabel(acquisitionCase.status)}`}>
      {STATUS_STEPS.map((step, index) => (
        <div key={step} className={index < current ? 'is-complete' : index === current ? 'is-current' : ''}>
          <i>{index < current ? <Check size={12} /> : index + 1}</i>
          <span>{formatLabel(step)}</span>
        </div>
      ))}
    </div>
  );
}

function CapitalStack({ acquisitionCase }: { acquisitionCase: OwnedStreamingAcquisitionCase }) {
  const financing = acquisitionCase.financing;
  if (!financing) return null;
  const total = Math.max(1, financing.totalConsideration);
  const parts = [
    { label: 'Treasury', value: financing.treasuryContribution, className: 'is-treasury' },
    { label: 'Debt', value: financing.debtPrincipal, className: 'is-debt' },
    { label: 'Equity', value: financing.equityConsideration, className: 'is-equity' },
  ].filter(part => part.value > 0);
  return (
    <div className="acq-capital-stack">
      <div className="acq-capital-bar">
        {parts.map(part => (
          <i key={part.label} className={part.className} style={{ width: `${part.value / total * 100}%` }} />
        ))}
      </div>
      <div className="acq-capital-legend">
        {parts.map(part => <span key={part.label}><i className={part.className} />{part.label}<b>{formatMoney(part.value)}</b></span>)}
      </div>
    </div>
  );
}

export default function StreamingAcquisitionCommand({
  player,
  onUpdatePlayer,
  onClose,
  onOpenPlatformWars,
  onOpenFinance,
}: Props) {
  const view = useMemo(() => getStreamingAcquisitionCommand(player), [player]);
  const [tab, setTab] = useState<CommandTab>(view.activeCase?.status === 'SIGNED' ? 'INTEGRATION' : 'SCOUT');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(view.activeCase?.id || null);
  const selectedCase = view.cases.find(entry => entry.id === selectedCaseId) || view.activeCase;
  const [dealStructure, setDealStructure] = useState<StreamingAcquisitionDealStructure>('FULL_ACQUISITION');
  const [offerPrice, setOfferPrice] = useState(0);
  const [commitments, setCommitments] = useState<StreamingAcquisitionCommitmentId[]>(['SERVICE_CONTINUITY']);
  const [regulatoryStrategy, setRegulatoryStrategy] = useState<StreamingRegulatoryStrategy>('CLEAN_COMMITMENTS');
  const [fundingSource, setFundingSource] = useState<StreamingAcquisitionFundingSource>('HYBRID');
  const [integrationMode, setIntegrationMode] = useState<StreamingIntegrationMode>('PRESERVE_BRAND');
  const [feedback, setFeedback] = useState('');
  const queuedSigning = view.platform.cinematicQueue.find(event => (
    event.type === 'ACQUISITION_SIGNING' && event.status === 'QUEUED'
  ));
  const [signingCinematicId, setSigningCinematicId] = useState<string | null>(queuedSigning?.id || null);
  const signingCinematic = view.platform.cinematicQueue.find(event => event.id === signingCinematicId) || null;
  const signingFact = signingCinematic
    ? view.platform.eventLedger.find(entry => signingCinematic.factIds.includes(entry.id)) || null
    : null;

  useEffect(() => {
    if (!selectedCase?.valuation) return;
    setOfferPrice(current => current > 0 ? current : selectedCase.valuation!.sellerFloor);
  }, [selectedCase?.id, selectedCase?.valuation]);

  const explainReason = (reason?: string): string => {
    if (reason === 'INSUFFICIENT_TREASURY') return 'The company treasury cannot fund this step.';
    if (reason === 'CAPITAL_STACK_UNAFFORDABLE') return 'This capital stack still asks the treasury for more cash than it holds.';
    if (reason === 'DEBT_CAPACITY_EXCEEDED') return 'Lenders will not cover the full consideration at the current revenue and leverage.';
    if (reason === 'INTEGRATION_RESERVE_UNFUNDED') return 'Signing is ready, but the mandatory integration reserve is not funded.';
    if (reason === 'CASE_ALREADY_EXISTS') return 'A live corporate-development file already exists for this target.';
    if (reason === 'ALREADY_SIGNED') return 'This transaction is already signed and cannot be charged twice.';
    return 'That action is not available at the current deal stage.';
  };

  const run = (action: () => ReturnType<typeof scoutStreamingAcquisitionTarget>, success: string, nextTab?: CommandTab) => {
    const result = action();
    if (!result.changed) {
      if (result.caseId) setSelectedCaseId(result.caseId);
      setFeedback(explainReason(result.reason));
      return;
    }
    if (result.caseId) setSelectedCaseId(result.caseId);
    const newSigningCinematic = result.player.ownedStreamingPlatform.cinematicQueue.find(event => (
      event.type === 'ACQUISITION_SIGNING' && event.status === 'QUEUED'
    ));
    if (newSigningCinematic) setSigningCinematicId(newSigningCinematic.id);
    onUpdatePlayer(result.player);
    setFeedback(success);
    if (nextTab) setTab(nextTab);
  };

  const toggleCommitment = (id: StreamingAcquisitionCommitmentId) => {
    setCommitments(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const finishSigningCinematic = (status: 'VIEWED' | 'DISMISSED') => {
    if (!signingCinematic) return setSigningCinematicId(null);
    onUpdatePlayer({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        player.ownedStreamingPlatform,
        signingCinematic.id,
        status,
      ),
    });
    setSigningCinematicId(null);
    setTab('INTEGRATION');
  };

  const renderTargetRoom = () => (
    <div className="acq-target-layout">
      <section className="acq-briefing-card">
        <span className="acq-kicker"><Radar size={14} /> LIVE MARKET SCAN</span>
        <h2>Buy a capability, not a logo.</h2>
        <p>Every target carries a real audience, catalog, technology stack, CEO posture and cash position from the competitive world. Scouting opens a confidential file; it does not reserve the company.</p>
        <div className="acq-briefing-metrics">
          <span><b>{view.targets.filter(target => !target.owned).length}</b> viable targets</span>
          <span><b>{view.cases.filter(item => !['SIGNED', 'WITHDRAWN'].includes(item.status)).length}</b> live files</span>
          <span><b>{formatMoney(view.platform.treasuryCash)}</b> treasury</span>
        </div>
      </section>
      <div className="acq-target-grid">
        {view.targets.map(target => (
          <article key={target.rival.platformId} className={`acq-target-card ${target.owned ? 'is-owned' : ''}`}>
            <div className="acq-target-radar" style={{ ['--fit' as string]: `${target.strategicFit}%` }}>
              <span>{target.strategicFit}</span>
              <small>FIT</small>
            </div>
            <div className="acq-target-heading">
              <span>{target.rival.strategy.toLowerCase().replaceAll('_', ' ')}</span>
              <h3>{target.rival.platformName}</h3>
              <p>{target.rival.ceoName} • {target.rival.ceoPersonality}</p>
            </div>
            <div className="acq-target-stats">
              <span><b>{target.rival.subscribersMillions.toFixed(target.rival.subscribersMillions >= 100 ? 0 : 1)}M</b> subscribers</span>
              <span><b>{formatMoney(target.estimatedValue)}</b> signal value</span>
              <span><b>{target.rival.technology}</b> technology</span>
              <span><b>{target.rival.catalogPower}</b> catalog power</span>
            </div>
            <p className="acq-target-thesis">{target.thesis}</p>
            <div className="acq-target-pressure"><Zap size={14} /> {target.pressure}</div>
            {target.owned ? (
              <button type="button" disabled><BadgeCheck size={16} /> Owned and integrating</button>
            ) : target.activeCase ? (
              <button type="button" onClick={() => { setSelectedCaseId(target.activeCase!.id); setTab('DEAL'); }}>
                Reopen file <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={() => run(
                () => scoutStreamingAcquisitionTarget(player, target.rival.platformId),
                `${target.rival.platformName} entered confidential review.`,
                'DEAL',
              )}>
                Scout target <ChevronRight size={16} />
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );

  const renderCaseSelector = () => (
    <div className="acq-case-selector">
      {view.cases.slice().reverse().map(item => (
        <button
          type="button"
          key={item.id}
          className={item.id === selectedCase?.id ? 'is-selected' : ''}
          onClick={() => setSelectedCaseId(item.id)}
        >
          <span>{item.targetPlatformName}</span>
          <small>{formatLabel(item.status)}</small>
        </button>
      ))}
    </div>
  );

  const renderDealDesk = () => {
    if (!selectedCase) return <div className="acq-empty"><Handshake size={34} /><h2>No confidential file is open.</h2><button type="button" onClick={() => setTab('SCOUT')}>Scout a target</button></div>;
    const valuation = selectedCase.valuation;
    return (
      <>
        {renderCaseSelector()}
        <DealPipeline acquisitionCase={selectedCase} />
        <div className="acq-deal-grid">
          <section className="acq-panel is-valuation">
            <span className="acq-kicker"><BarChart3 size={14} /> INDEPENDENT VALUATION</span>
            <h2>{selectedCase.targetPlatformName}</h2>
            {!valuation ? (
              <div className="acq-locked-analysis">
                <LockKeyhole size={26} />
                <p>Commission bankers and industry analysts to open the value bridge. The fee is a sunk company cost.</p>
                <button type="button" onClick={() => run(
                  () => valueStreamingAcquisitionTarget(player, selectedCase.id),
                  'The independent valuation is now in the deal room.',
                )}>Commission valuation</button>
              </div>
            ) : (
              <>
                <div className="acq-value-hero">
                  <span>Fair value</span>
                  <strong>{formatMoney(valuation.fairValue)}</strong>
                  <small>Seller floor {formatMoney(valuation.sellerFloor)} • fee {formatMoney(valuation.valuationCost)}</small>
                </div>
                <div className="acq-value-bridge">
                  {[
                    ['Standalone business', valuation.standaloneValue],
                    ['Subscriber engine', valuation.subscriberValue],
                    ['Catalog portfolio', valuation.catalogValue],
                    ['Technology stack', valuation.technologyValue],
                    ['Brand value', valuation.brandValue],
                    ['Strategic premium', valuation.strategicPremium],
                    ['Debt & liabilities', -valuation.debtAndLiabilities],
                  ].map(([label, value]) => (
                    <div key={String(label)} className={Number(value) < 0 ? 'is-negative' : ''}>
                      <span>{label}</span><b>{Number(value) < 0 ? '−' : ''}{formatMoney(Math.abs(Number(value)))}</b>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="acq-panel is-offer">
            <span className="acq-kicker"><Handshake size={14} /> CONTROL PROPOSAL</span>
            <h2>Write the opening terms.</h2>
            {!valuation ? <p className="acq-muted">The valuation must open before a defensible offer can reach the seller.</p> : (
              <>
                <div className="acq-segmented" role="group" aria-label="Deal structure">
                  <button type="button" className={dealStructure === 'FULL_ACQUISITION' ? 'is-active' : ''} onClick={() => setDealStructure('FULL_ACQUISITION')}>
                    Full acquisition
                  </button>
                  <button type="button" className={dealStructure === 'STRATEGIC_MERGER' ? 'is-active' : ''} onClick={() => setDealStructure('STRATEGIC_MERGER')}>
                    Strategic merger
                  </button>
                </div>
                <label className="acq-money-input">
                  <span>Headline consideration</span>
                  <div><b>$</b><input type="number" min={1} step={10_000_000} value={Math.round(offerPrice)} onChange={event => setOfferPrice(Number(event.target.value))} /></div>
                </label>
                <div className="acq-offer-meter">
                  <i style={{ width: `${Math.min(100, offerPrice / Math.max(1, valuation.sellerFloor) * 82)}%` }} />
                  <span>Fair value {formatMoney(valuation.fairValue)}</span>
                  <span>Seller floor {formatMoney(valuation.sellerFloor)}</span>
                </div>
                <fieldset className="acq-commitments">
                  <legend>Promises that survive signing</legend>
                  {STREAMING_ACQUISITION_COMMITMENTS.map(item => (
                    <label key={item.id} className={commitments.includes(item.id) ? 'is-selected' : ''}>
                      <input type="checkbox" checked={commitments.includes(item.id)} onChange={() => toggleCommitment(item.id)} />
                      <span><b>{item.label}</b><small>{item.detail}</small></span>
                      <Check size={15} />
                    </label>
                  ))}
                </fieldset>
                {selectedCase.status === 'OFFER_COUNTERED' && selectedCase.offer?.sellerCounterPrice ? (
                  <div className="acq-counter-note">
                    <span>SELLER COUNTER</span>
                    <b>{formatMoney(selectedCase.offer.sellerCounterPrice)}</b>
                    <button type="button" onClick={() => run(
                      () => acceptStreamingAcquisitionCounter(player, selectedCase.id),
                      'Headline terms accepted. The data room is open.',
                      'DATA',
                    )}>Accept counter</button>
                  </div>
                ) : ['VALUED', 'OFFER_COUNTERED'].includes(selectedCase.status) ? (
                  <button className="acq-primary-action" type="button" onClick={() => run(
                    () => submitStreamingAcquisitionOffer(player, selectedCase.id, dealStructure, offerPrice, commitments),
                    'The proposal reached the seller.',
                  )}>Submit binding proposal <ChevronRight size={17} /></button>
                ) : (
                  <div className="acq-stage-complete"><BadgeCheck size={17} /> Headline economics are agreed. Continue into diligence.</div>
                )}
              </>
            )}
          </section>
        </div>
      </>
    );
  };

  const renderDataRoom = () => {
    if (!selectedCase) return <div className="acq-empty"><FileSearch size={34} /><h2>Select a deal file first.</h2></div>;
    return (
      <>
        {renderCaseSelector()}
        <DealPipeline acquisitionCase={selectedCase} />
        <div className="acq-data-room">
          <section className="acq-panel">
            <span className="acq-kicker"><FileSearch size={14} /> VERIFIED DATA ROOM</span>
            <h2>Facts before bravado.</h2>
            {!selectedCase.diligence ? (
              <div className="acq-locked-analysis">
                <FileSearch size={28} />
                <p>Diligence verifies content liabilities, technical debt, churn exposure and change-of-control risk. Findings can reduce value and invite a rival bid.</p>
                <button type="button" disabled={selectedCase.status !== 'DILIGENCE'} onClick={() => run(
                  () => commissionStreamingDueDiligence(player, selectedCase.id),
                  'The data room closed with decision-grade findings.',
                )}>Commission full diligence</button>
              </div>
            ) : (
              <>
                <div className="acq-diligence-summary">
                  <span><b>{formatMoney(selectedCase.diligence.adjustedFairValue)}</b> adjusted fair value</span>
                  <span><b>{formatMoney(selectedCase.diligence.verifiedDebt)}</b> verified debt</span>
                  <span><b>{(selectedCase.diligence.churnExposure * 100).toFixed(1)}%</b> churn exposure</span>
                </div>
                <div className="acq-findings">
                  {selectedCase.diligence.issues.map(issue => (
                    <article key={issue.id} className={`is-${issue.severity.toLowerCase()}`}>
                      <div><span>{issue.severity}</span><b>{issue.title}</b></div>
                      <p>{issue.detail}</p>
                      <small>{formatMoney(Math.abs(issue.valueImpact))} value pressure • +{issue.integrationRisk} integration risk</small>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
          <aside className={`acq-counterbid ${selectedCase.counterbid ? 'is-live' : ''}`}>
            <span className="acq-kicker"><Zap size={14} /> COMPETITIVE PROCESS</span>
            {selectedCase.counterbid ? (
              <>
                <div className="acq-rival-seal"><Building2 size={28} /></div>
                <small>{selectedCase.counterbid.bidderCeoName} entered the room</small>
                <h2>{selectedCase.counterbid.bidderName} bid {formatMoney(selectedCase.counterbid.amount)}</h2>
                <p>The rival spent {selectedCase.counterbid.pursuitCostMillions.toFixed(0)}M from its own cash reserve to sustain this process. Your required control bid is disclosed before you answer.</p>
                <strong>{formatMoney(selectedCase.counterbid.playerRequiredBid)}</strong>
                <button type="button" disabled={selectedCase.counterbid.status !== 'OPEN'} onClick={() => run(
                  () => beatStreamingAcquisitionCounterbid(player, selectedCase.id),
                  `${selectedCase.counterbid!.bidderName} has been outbid.`,
                  'APPROVALS',
                )}>{selectedCase.counterbid.status === 'BEATEN' ? 'Counterbid beaten' : 'Raise to control price'}</button>
              </>
            ) : (
              <>
                <ShieldCheck size={32} />
                <h2>No rival has entered.</h2>
                <p>A clean data room can proceed directly to internal approvals. The game will never invent a bid after signing.</p>
                {selectedCase.diligence && <button type="button" onClick={() => setTab('APPROVALS')}>Continue to clearance</button>}
              </>
            )}
          </aside>
        </div>
      </>
    );
  };

  const renderApprovals = () => {
    if (!selectedCase) return <div className="acq-empty"><Gavel size={34} /><h2>Select a deal file first.</h2></div>;
    const approvalReady = ['APPROVALS', 'APPROVAL_BLOCKED'].includes(selectedCase.status);
    const regulatoryReady = ['REGULATORY_REVIEW', 'REGULATORY_BLOCKED'].includes(selectedCase.status);
    const financeReady = selectedCase.status === 'FINANCING';
    const signReady = selectedCase.status === 'READY_TO_SIGN';
    return (
      <>
        {renderCaseSelector()}
        <DealPipeline acquisitionCase={selectedCase} />
        <div className="acq-clearance-grid">
          <section className={`acq-clearance-card ${selectedCase.approval?.status === 'APPROVED' ? 'is-cleared' : approvalReady ? 'is-live' : ''}`}>
            <span><Gavel size={21} /> 01</span>
            <h2>Governance chamber</h2>
            <p>{selectedCase.approval?.binding ? 'The current cap table made this a binding director vote.' : 'Founder control made the board advisory, but confidence still moved.'}</p>
            {selectedCase.approval && (
              <div className="acq-vote-list">
                {selectedCase.approval.votes.map(vote => <span key={vote.directorId}><i className={vote.vote === 'FOR' ? 'is-for' : 'is-against'} />{vote.directorName}<b>{vote.vote}</b></span>)}
              </div>
            )}
            <button type="button" disabled={!approvalReady} onClick={() => run(
              () => seekStreamingAcquisitionApproval(player, selectedCase.id, commitments),
              'The governance decision is recorded.',
            )}>{selectedCase.status === 'APPROVAL_BLOCKED' ? 'Resubmit protected terms' : selectedCase.approval?.status === 'APPROVED' ? 'Approved' : 'Call the vote'}</button>
          </section>
          <section className={`acq-clearance-card ${selectedCase.regulatoryReview && selectedCase.regulatoryReview.status !== 'BLOCKED' ? 'is-cleared' : regulatoryReady ? 'is-live' : ''}`}>
            <span><Scale size={21} /> 02</span>
            <h2>Regulatory review</h2>
            <div className="acq-choice-stack">
              {STREAMING_REGULATORY_STRATEGIES.map(strategy => (
                <button type="button" key={strategy.id} className={regulatoryStrategy === strategy.id ? 'is-selected' : ''} onClick={() => setRegulatoryStrategy(strategy.id)}>
                  <b>{strategy.label}</b><small>{strategy.detail}</small>
                </button>
              ))}
            </div>
            {selectedCase.regulatoryReview && <p className="acq-result-copy"><b>{formatLabel(selectedCase.regulatoryReview.status)}</b> • scrutiny {selectedCase.regulatoryReview.scrutinyScore}/100 • remedies {formatMoney(selectedCase.regulatoryReview.remedyCost)}</p>}
            <button type="button" disabled={!regulatoryReady} onClick={() => run(
              () => resolveStreamingRegulatoryReview(player, selectedCase.id, regulatoryStrategy),
              'The regulator issued a formal decision.',
            )}>{selectedCase.status === 'REGULATORY_BLOCKED' ? 'Resubmit structure' : 'Submit for review'}</button>
          </section>
          <section className={`acq-clearance-card ${selectedCase.financing ? 'is-cleared' : financeReady ? 'is-live' : ''}`}>
            <span><Banknote size={21} /> 03</span>
            <h2>Capital stack</h2>
            <p>Treasury, debt capacity and any merger equity are reconciled before signing. No purchase money appears from nowhere.</p>
            <div className="acq-segmented is-vertical" role="group" aria-label="Funding source">
              {(['TREASURY', 'HYBRID', 'ACQUISITION_DEBT'] as StreamingAcquisitionFundingSource[]).map(source => (
                <button type="button" key={source} className={fundingSource === source ? 'is-active' : ''} onClick={() => setFundingSource(source)}>{formatLabel(source)}</button>
              ))}
            </div>
            {selectedCase.financing && (
              <>
                <CapitalStack acquisitionCase={selectedCase} />
                <p className="acq-result-copy">Founder ownership: {selectedCase.financing.founderOwnershipBefore.toFixed(1)}% → <b>{selectedCase.financing.founderOwnershipAfter.toFixed(1)}%</b></p>
              </>
            )}
            <button type="button" disabled={!financeReady} onClick={() => run(
              () => lockStreamingAcquisitionFinancing(player, selectedCase.id, fundingSource),
              'The capital stack is locked.',
            )}>Lock financing</button>
          </section>
        </div>
        <section className={`acq-signing-table ${signReady ? 'is-ready' : ''}`}>
          <div>
            <span className="acq-kicker"><Sparkles size={14} /> SIGNING TABLE</span>
            <h2>{signReady ? 'All signatures can now meet.' : 'The signing room remains sealed.'}</h2>
            <p>Choose how this company should exist after close. That choice changes retention, technology, catalog value, cost, time and reliability.</p>
          </div>
          <select aria-label="Integration mode" value={integrationMode} onChange={event => setIntegrationMode(event.target.value as StreamingIntegrationMode)}>
            {STREAMING_INTEGRATION_MODES.map(mode => <option key={mode.id} value={mode.id}>{mode.label} • {mode.integrationWeeks} weeks</option>)}
          </select>
          <button type="button" disabled={!signReady} onClick={() => run(
            () => signStreamingPlatformAcquisition(player, selectedCase.id, integrationMode),
            'The transaction signed. Integration is live.',
            'INTEGRATION',
          )}><Handshake size={18} /> Sign and take control</button>
        </section>
      </>
    );
  };

  const renderIntegration = () => (
    <div className="acq-integration-board">
      <section className="acq-integration-hero">
        <span className="acq-kicker"><Layers3 size={14} /> TRANSACTIONAL INTEGRATION</span>
        <h2>The deal is not finished when the ink dries.</h2>
        <p>Each signed company now moves through a visible operating timeline. Weekly costs, subscriber pressure and reliability risk remain live until the promised assets become usable.</p>
        <div>
          <span><b>{view.integrations.filter(item => item.status === 'IN_PROGRESS').length}</b> integrations live</span>
          <span><b>{view.integrations.filter(item => item.status === 'INTEGRATED').length}</b> completed</span>
          <span><b>{view.platform.corporateDevelopment.acquiredPlatformIds.length}</b> platforms controlled</span>
        </div>
      </section>
      {view.integrations.length ? (
        <div className="acq-integration-list">
          {view.integrations.slice().reverse().map(integration => {
            const elapsed = Math.max(0, (view.platform.lastProcessedAbsoluteWeek || integration.startedAtAbsoluteWeek) - integration.startedAtAbsoluteWeek);
            const progress = integration.status === 'INTEGRATED' ? 100 : Math.min(100, elapsed / integration.integrationWeeks * 100);
            const definition = STREAMING_INTEGRATION_MODES.find(item => item.id === integration.mode)!;
            return (
              <article key={integration.id} className={integration.status === 'INTEGRATED' ? 'is-complete' : ''}>
                <header>
                  <div><span>{formatLabel(integration.mode)}</span><h3>{integration.targetPlatformName}</h3></div>
                  <b>{integration.status === 'INTEGRATED' ? 'OPERATING ASSET' : `${Math.max(0, integration.readyAtAbsoluteWeek - (view.platform.lastProcessedAbsoluteWeek || integration.startedAtAbsoluteWeek))} weeks remain`}</b>
                </header>
                <p>{definition.thesis}</p>
                <div className="acq-integration-progress"><i style={{ width: `${progress}%` }} /></div>
                <div className="acq-integration-assets">
                  <span><UsersRound size={15} /><b>{integration.acquiredSubscriberCount.toLocaleString()}</b> retained subscribers</span>
                  <span><Layers3 size={15} /><b>{integration.catalogAssetCount.toLocaleString()}</b> catalog assets</span>
                  <span><Zap size={15} /><b>+{integration.technologyLevelDelta}</b> technology</span>
                  <span><CircleDollarSign size={15} /><b>{formatMoney(integration.weeklyOperatingCost)}</b> weekly</span>
                </div>
                {integration.status === 'IN_PROGRESS' && <small>Reliability risk {(integration.reliabilityRisk * 100).toFixed(1)}% remains in the live weekly simulation.</small>}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="acq-empty"><Building2 size={36} /><h2>No company is integrating.</h2><p>A signed transaction will appear here with a real weekly operating clock.</p><button type="button" onClick={() => setTab('SCOUT')}>Return to target room</button></div>
      )}
    </div>
  );

  return (
    <div className="streaming-acquisition-shell">
      <StreamingVisualScene
        sceneId="marketRoom"
        className="acq-scene"
        imageLoading="eager"
        eyebrow="CORPORATE DEVELOPMENT • PHASE 21"
        title="Build the company through conviction."
        description="Scout the market, expose the risks, win control and prove the combination in operations."
        status={{ label: `${view.cases.filter(item => !['WITHDRAWN'].includes(item.status)).length} FILES`, detail: `${formatMoney(view.platform.treasuryCash)} treasury`, tone: 'warning' }}
      >
        <button type="button" className="acq-back" onClick={onClose}><ArrowLeft size={18} /> Streaming Hall</button>
        <div className="acq-scene-links">
          {onOpenPlatformWars && <button type="button" onClick={onOpenPlatformWars}>Platform Wars</button>}
          {onOpenFinance && <button type="button" onClick={onOpenFinance}>Company finance</button>}
        </div>
      </StreamingVisualScene>

      <nav className="acq-nav" aria-label="Acquisition command sections">
        {TABS.map(item => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>
              <Icon size={18} /><span><b>{item.label}</b><small>{item.detail}</small></span>
            </button>
          );
        })}
      </nav>

      {feedback && <div className="acq-feedback" role="status"><BadgeCheck size={16} />{feedback}<button type="button" aria-label="Dismiss message" onClick={() => setFeedback('')}><X size={15} /></button></div>}

      <main className="acq-main">
        {tab === 'SCOUT' && renderTargetRoom()}
        {tab === 'DEAL' && renderDealDesk()}
        {tab === 'DATA' && renderDataRoom()}
        {tab === 'APPROVALS' && renderApprovals()}
        {tab === 'INTEGRATION' && renderIntegration()}
      </main>

      {selectedCase && !['SIGNED', 'WITHDRAWN'].includes(selectedCase.status) && (
        <footer className="acq-footer">
          <span><LockKeyhole size={14} /> Confidential • {selectedCase.targetPlatformName} • {formatLabel(selectedCase.status)}</span>
          <button type="button" onClick={() => run(
            () => withdrawStreamingAcquisitionCase(player, selectedCase.id),
            'The transaction was withdrawn. Advisory costs remain spent.',
            'SCOUT',
          )}>Walk away</button>
        </footer>
      )}

      {signingCinematic && (
        <div className="acq-signing-cinematic" role="dialog" aria-modal="true" aria-labelledby="acq-signing-title">
          <div className="acq-signing-light" />
          <div className="acq-signing-stage">
            <span>EMPIRE+ • SIGNING DAY</span>
            <Handshake size={42} />
            <h1 id="acq-signing-title">{signingCinematic.title}</h1>
            <p>{signingFact?.summary || 'The transaction has entered the permanent company record.'}</p>
            <div>
              <span><b>{signingFact?.metadata?.acquiredSubscriberCount?.toLocaleString() || '0'}</b> subscribers retained</span>
              <span><b>{signingFact?.metadata?.catalogAssetCount?.toLocaleString() || '0'}</b> catalog assets</span>
              <span><b>+{signingFact?.metadata?.technologyLevelDelta || 0}</b> technology</span>
            </div>
            <button type="button" onClick={() => finishSigningCinematic('VIEWED')}>Enter integration command <ChevronRight size={18} /></button>
            <button type="button" className="is-skip" onClick={() => finishSigningCinematic('DISMISSED')}>Skip ceremony</button>
          </div>
        </div>
      )}
    </div>
  );
}
