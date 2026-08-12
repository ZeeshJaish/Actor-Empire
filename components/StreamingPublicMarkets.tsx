import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Crown,
  FileText,
  Gauge,
  Landmark,
  LineChart,
  Megaphone,
  Radio,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Vote,
  X,
} from 'lucide-react';
import type {
  Player,
  StreamingGuidanceTone,
  StreamingIpoNarrative,
  StreamingTakeoverDefence,
} from '../types';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import {
  castStreamingShareholderVote,
  getStreamingPublicMarkets,
  issueStreamingPublicGuidance,
  listStreamingPlatform,
  resolveStreamingHostileTakeover,
  respondToStreamingActivist,
  startStreamingIpoRoadshow,
  commitStreamingCinematicIpo,
  checkpointStreamingCinematicIpoJourney,
  startStreamingCinematicIpoJourney,
} from '../services/streamingPublicMarkets';
import { getAbsoluteWeek } from '../services/legacyLogic';
import AccessibleDialog from './AccessibleDialog';
import {
  Listing as StreamingListingExperience,
  type StreamingListingCheckpoint,
} from './streaming-transplant/StreamingListingExperience';
import type { Brand as StreamingPresentationBrand } from './streaming-transplant/StreamingBrandVisuals';
import type { StreamingIpoPresentationResult } from './streaming-transplant/streamingIpoPresentationModel';
import '../styles/streaming-public-markets.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenLeadership: () => void;
}

type PublicTab = 'MARKET' | 'IPO' | 'EARNINGS' | 'SHAREHOLDERS' | 'DEFENCE';

const formatMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString()}`;
};

const hexToBrandTone = (hex: string | undefined) => {
  const source = /^#[0-9a-f]{6}$/i.test(hex || '') ? (hex as string).slice(1) : '21c7d9';
  const red = parseInt(source.slice(0, 2), 16) / 255;
  const green = parseInt(source.slice(2, 4), 16) / 255;
  const blue = parseInt(source.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const light = (maximum + minimum) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return { hue: Math.round(hue), saturation: Math.round(Math.max(40, saturation * 100)) };
};

const NARRATIVES: { id: StreamingIpoNarrative; label: string; copy: string }[] = [
  { id: 'AUDIENCE_SCALE', label: 'Audience scale', copy: 'Sell the member flywheel and global reach.' },
  { id: 'PROFITABLE_GROWTH', label: 'Profitable growth', copy: 'Lead with disciplined expansion and cash quality.' },
  { id: 'TECHNOLOGY_NETWORK', label: 'Technology network', copy: 'Make delivery, data and platform products the moat.' },
  { id: 'GLOBAL_ORIGINALS', label: 'Global Originals', copy: 'Pitch a culturally portable content house.' },
];

const GUIDANCE: { id: StreamingGuidanceTone; label: string; risk: string }[] = [
  { id: 'CONSERVATIVE', label: 'Conservative', risk: 'Easier target • softer market excitement' },
  { id: 'BALANCED', label: 'Balanced', risk: 'Credible target • measured upside' },
  { id: 'AMBITIOUS', label: 'Ambitious', risk: 'Stronger story • severe miss risk' },
];

function PriceChart({ values }: { values: number[] }) {
  if (!values.length) return <div className="pm-chart-empty"><LineChart size={30} /><span>Trading begins after listing.</span></div>;
  const width = 640;
  const height = 180;
  const minimum = Math.min(...values) * 0.96;
  const maximum = Math.max(...values) * 1.04;
  const range = Math.max(0.01, maximum - minimum);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : index / (values.length - 1) * width;
    const y = height - ((value - minimum) / range * height);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="pm-price-chart" aria-label={`Share price history, ${values.length} observations`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="pm-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pm-gold)" stopOpacity=".32" />
            <stop offset="100%" stopColor="var(--pm-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#pm-area)" />
        <polyline points={points} fill="none" stroke="var(--pm-gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>${maximum.toFixed(2)}</span><span>${minimum.toFixed(2)}</span>
    </div>
  );
}

export default function StreamingPublicMarkets({ player, onUpdatePlayer, onClose, onOpenLeadership }: Props) {
  const platform = player.ownedStreamingPlatform;
  const view = useMemo(() => getStreamingPublicMarkets(player), [player]);
  const [tab, setTab] = useState<PublicTab>(['PRIVATE', 'IPO_PREPARATION'].includes(view.lifecycle) ? 'IPO' : 'MARKET');
  const [ticker, setTicker] = useState(view.suggestedTicker);
  const [narrative, setNarrative] = useState<StreamingIpoNarrative>('AUDIENCE_SCALE');
  const [offerPercent, setOfferPercent] = useState(20);
  const [feedback, setFeedback] = useState('');
  const [showCinematicIpo, setShowCinematicIpo] = useState(false);
  const listingScene = [...platform.cinematicQueue].reverse().find(event => event.type === 'IPO_LISTING' && event.status === 'QUEUED');
  const defenceScene = [...platform.cinematicQueue].reverse().find(event => event.type === 'HOSTILE_TAKEOVER_DEFENCE' && event.status === 'QUEUED');
  const [showListingScene, setShowListingScene] = useState(Boolean(listingScene));
  const [showDefenceScene, setShowDefenceScene] = useState(Boolean(defenceScene));

  const openCinematicIpo = () => {
    if (platform.publicCompany.ipoJourney?.status === 'ACTIVE') {
      setShowCinematicIpo(true);
      return;
    }
    const started = startStreamingCinematicIpoJourney(player, {
      ticker,
      ask: view.valuation,
      shares: ipoPresentationInputs.initialNewShares,
    });
    if (!started.changed) {
      setFeedback(started.reason || 'The listing process could not begin.');
      return;
    }
    onUpdatePlayer(started.player);
    setShowCinematicIpo(true);
  };

  const checkpointCinematicIpo = (checkpoint: StreamingListingCheckpoint) => {
    const saved = checkpointStreamingCinematicIpoJourney(player, checkpoint);
    if (saved.changed) onUpdatePlayer(saved.player);
  };

  const presentationBrand = useMemo<StreamingPresentationBrand>(() => {
    const primary = hexToBrandTone(platform.identity?.primaryColor);
    const secondary = hexToBrandTone(platform.identity?.secondaryColor);
    const markId = platform.identity?.logoKey === 'SIGNAL_RING' ? 'ORBIT'
      : platform.identity?.logoKey === 'SPOTLIGHT' ? 'APERTURE'
        : platform.identity?.logoKey === 'WORDMARK' ? 'LETTER_SOLID' : 'BOLT';
    const identId = platform.identity?.soundIdentKey === 'ASCENT' ? 'RISE'
      : platform.identity?.soundIdentKey === 'PREMIERE' ? 'FANFARE' : 'PULSE';
    return {
      name: platform.identity?.name || 'EMPIRE+',
      markId,
      customMark: null,
      hue: primary.hue,
      sat: primary.saturation,
      identId,
      customIdent: null,
      promiseId: 'EVENT',
      layoutId: 'HERO_IMG',
      typeId: 'GROTESK',
      accentHue: secondary.hue,
      identMode: platform.identity?.soundIdentKey === 'SILENT' ? 'none' : 'full',
      identLen: 2,
      ratingId: 'TEEN',
      lockupId: 'SIDE',
      serverCity: null,
    };
  }, [platform.identity, platform.infrastructureSetup]);

  const ipoPresentationInputs = useMemo(() => {
    const latest = platform.weeklyHistory.at(-1);
    const appointments = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const executiveName = (role: string) => appointments.find(item => item.role === role)?.nameAtAppointment;
    const preIpoShares = Math.max(5_000_000, Math.min(500_000_000, Math.round(view.valuation / 10 / 250_000) * 250_000));
    const initialNewShares = Math.max(250_000, Math.round((preIpoShares * offerPercent / Math.max(1, 100 - offerPercent)) / 250_000) * 250_000);
    const technicalDebt = platform.infrastructureSetup?.technicalDebt || 0;
    const peakLoad = latest?.operations?.capacityUtilizationPercent || 0;
    const weeklyNet = latest?.operations?.netCashContribution || 0;
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    return {
      founderName: player.name,
      founderPct: platform.founderOwnershipPercent,
      subscribers: platform.metrics.subscribers,
      arpu: Math.max(0.01, platform.metrics.averageRevenuePerUser),
      churnPct: platform.metrics.churnRate * 100,
      peakLoad,
      techDebt: technicalDebt,
      weeklyNet,
      treasury: platform.treasuryCash,
      checks: view.readiness.map(item => ({ id: item.id, label: item.label, ok: item.passed, note: item.passed ? item.value : item.requirement })),
      risks: [
        ...(peakLoad >= 85 ? [{ id: 'capacity', label: 'Capacity concentration', detail: `Peak demand used ${peakLoad.toFixed(0)}% of burst capacity.`, cost: 0.05 }] : []),
        ...(technicalDebt > 0 ? [{ id: 'technical-debt', label: 'Carried technical debt', detail: `${technicalDebt} technical-debt points remain in the delivery stack.`, cost: 0.04 }] : []),
        ...(platform.metrics.churnRate >= 0.035 ? [{ id: 'churn', label: 'Subscriber churn pressure', detail: `${(platform.metrics.churnRate * 100).toFixed(1)}% of members left in the latest measured week.`, cost: 0.05 }] : []),
        ...(platform.catalogLicenses.some(item => item.status === 'ACTIVE') ? [{ id: 'rights', label: 'Reliance on licensed catalogue', detail: 'Material viewing still depends on time-limited external rights.', cost: 0.04 }] : []),
      ],
      rivals: platform.competitiveWorld.rivals.map(item => item.platformName),
      executiveNames: {
        cfo: executiveName('CFO'),
        cto: executiveName('CTO'),
        coo: executiveName('COO'),
      },
      boardSeats: [
        { id: 'founder', name: player.name, kind: 'FOUNDER · CHAIR' },
        ...activeDirectors.map(item => ({ id: item.id, name: item.name, kind: item.seatType.replace(/_/g, ' ') })),
      ],
      preIpoShares,
      initialNewShares,
      simulationSeed: platform.simulationSeed,
      absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
  }, [offerPercent, platform, player.age, player.currentWeek, player.name, view.readiness, view.valuation]);

  const finishCinematicIpo = (result: StreamingIpoPresentationResult) => {
    const committed = commitStreamingCinematicIpo(player, {
      ticker: result.ticker,
      narrative,
      price: result.price,
      preIpoShares: result.preIpoShares,
      newShares: result.newShares,
      employeeQuotaPercent: result.employeeQuotaPercent,
      underwriterId: result.bankId,
      underwriterName: result.bank,
      firmBook: result.firmBook,
      bookCoverage: result.coverage,
      anchorDiscountAccepted: result.anchorDiscountAccepted,
      governanceMarks: result.marks.map(mark => mark.short),
      diligenceWeeks: result.diligenceWeeks,
      regulatorAttempts: result.regulatorAttempts,
    });
    if (!committed.changed) {
      setFeedback(committed.reason || 'The listing could not be committed.');
      setShowCinematicIpo(false);
      return;
    }
    const queuedListing = [...committed.player.ownedStreamingPlatform.cinematicQueue].reverse()
      .find(event => event.type === 'IPO_LISTING' && event.status === 'QUEUED');
    const committedPlayer = queuedListing ? {
      ...committed.player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        committed.player.ownedStreamingPlatform,
        queuedListing.id,
        'VIEWED',
      ),
    } : committed.player;
    onUpdatePlayer(committedPlayer);
    setFeedback(`${result.ticker} is now trading on Empire Exchange.`);
    setShowCinematicIpo(false);
    setShowListingScene(false);
    setTab('MARKET');
  };

  const act = (result: ReturnType<typeof startStreamingIpoRoadshow>, successMessage: string) => {
    if (!result.changed) {
      setFeedback(result.reason || 'The market desk could not complete that action.');
      return;
    }
    setFeedback(successMessage);
    onUpdatePlayer(result.player);
  };

  const finishScene = (id: string, kind: 'listing' | 'defence', status: 'VIEWED' | 'DISMISSED') => {
    onUpdatePlayer({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(platform, id, status),
    });
    if (kind === 'listing') setShowListingScene(false);
    else setShowDefenceScene(false);
  };

  const renderMarket = () => {
    const quote = view.latestQuote;
    const listing = platform.publicCompany.listing;
    if (!listing) return (
      <section className="pm-private-deck">
        <div className="pm-private-emblem"><Crown size={34} /></div>
        <span>PRIVATE COMPANY</span>
        <h2>Build without a ticker.</h2>
        <p>Remaining private forever is a complete strategy: no quarterly guidance, no activist fund and no hostile tender clock. Capital comes slower, but every operating choice stays yours.</p>
        <button type="button" onClick={() => setTab('IPO')}>Explore an IPO <ChevronRight size={17} /></button>
      </section>
    );
    return (
      <>
        <section className="pm-ticker-hero">
          <div><span>{listing.venueName} • {listing.ticker}</span><h2>${quote?.close.toFixed(2)}</h2><p className={(quote?.changePercent || 0) >= 0 ? 'is-up' : 'is-down'}>{(quote?.changePercent || 0) >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}{(quote?.changePercent || 0) >= 0 ? '+' : ''}{quote?.changePercent.toFixed(2)}% this week</p></div>
          <dl>
            <div><dt>Market cap</dt><dd>{formatMoney(quote?.marketCap || 0)}</dd></div>
            <div><dt>Public float</dt><dd>{listing.offerPercent}%</dd></div>
            <div><dt>Founder vote</dt><dd>{platform.founderOwnershipPercent}%</dd></div>
            <div><dt>Volume</dt><dd>{(quote?.volume || 0).toLocaleString()}</dd></div>
          </dl>
        </section>
        <section className="pm-panel pm-chart-panel">
          <header><div><span>PUBLIC TAPE</span><h3>Expectation has a price.</h3></div><small>Weekly close • canonical simulation</small></header>
          <PriceChart values={platform.publicCompany.quoteHistory.map(item => item.close)} />
          <div className="pm-driver-strip">
            {(quote?.drivers || []).map(driver => <span key={driver}><Activity size={14} />{driver}</span>)}
          </div>
        </section>
        <section className="pm-market-grid">
          <article><Gauge size={20} /><span>Board confidence</span><strong>{platform.governance.boardConfidence}/100</strong><small>{view.boardIsBinding ? 'Public ownership makes decisions binding.' : 'Founder advisory mode.'}</small></article>
          <article><Banknote size={20} /><span>Company treasury</span><strong>{formatMoney(platform.treasuryCash)}</strong><small>IPO proceeds entered the company, not personal cash.</small></article>
          <article><Radio size={20} /><span>Next public promise</span><strong>{view.activeGuidance ? `Quarter ${view.activeGuidance.cycleNumber}` : 'Not issued'}</strong><small>{view.activeGuidance ? `${view.activeGuidance.tone.toLowerCase()} guidance is live.` : 'Choose the expectations investors will price.'}</small></article>
        </section>
      </>
    );
  };

  const renderIpo = () => {
    const plan = platform.publicCompany.ipoPlan;
    if (platform.publicCompany.lifecycle === 'PUBLIC') return (
      <section className="pm-listed-record">
        <BadgeCheck size={30} /><span>LISTING COMPLETE</span><h2>{plan?.ticker || platform.publicCompany.listing?.ticker} is public.</h2>
        <p>The IPO is now a permanent company record. Future capital is easier to access, while guidance, votes and control battles are real.</p>
        <button type="button" onClick={() => setTab('MARKET')}>Enter market floor</button>
      </section>
    );
    if (platform.publicCompany.lifecycle === 'ROADSHOW' && plan) return (
      <>
        <section className="pm-roadshow-head">
          <div><span>ROADSHOW LIVE</span><h2>{plan.ticker} is building its book.</h2><p>{plan.roadshowStops.join(' • ')}</p></div>
          <Radio size={40} />
        </section>
        <section className="pm-demand-book">
          <article><span>Institutional demand</span><strong>{plan.institutionalDemandScore.toFixed(0)}</strong><i style={{ width: `${plan.institutionalDemandScore}%` }} /></article>
          <article><span>Retail demand</span><strong>{plan.retailDemandScore.toFixed(0)}</strong><i style={{ width: `${plan.retailDemandScore}%` }} /></article>
        </section>
        <section className="pm-panel">
          <header><div><span>PRICING COMMITTEE</span><h3>Set the first public price.</h3></div><small>{formatMoney(plan.targetCapital)} midpoint raise</small></header>
          <div className="pm-price-range">
            {[plan.lowPrice, (plan.lowPrice + plan.highPrice) / 2, plan.highPrice].map((price, index) => (
              <button key={price} type="button" onClick={() => {
                const result = listStreamingPlatform(player, price);
                if (result.changed) {
                  onUpdatePlayer(result.player);
                  setShowListingScene(true);
                  setFeedback(`Listed ${plan.ticker} at $${price.toFixed(2)}.`);
                } else setFeedback(result.reason || 'Pricing failed.');
              }}>
                <span>{index === 0 ? 'Protect the open' : index === 1 ? 'Price the book' : 'Maximize capital'}</span>
                <strong>${price.toFixed(2)}</strong>
                <small>{formatMoney(price * 100_000_000 * plan.offerPercent / 100)} raised</small>
              </button>
            ))}
          </div>
        </section>
      </>
    );
    return (
      <>
        <section className="pm-ipo-intro">
          <div className="pm-exchange-bell"><Landmark size={35} /></div>
          <div><span>VOLUNTARY CAPITAL PATH</span><h2>Earn the right to ring the bell.</h2><p>An IPO funds the company and creates a liquid public float. It also dilutes control and turns every public promise into a weekly price.</p></div>
          <strong>{view.readinessScore}% READY</strong>
        </section>
        <section className="pm-readiness-grid">
          {view.readiness.map(item => (
            <article key={item.id} className={item.passed ? 'is-ready' : ''}>
              <span>{item.passed ? <Check size={16} /> : <X size={16} />}{item.hardGate ? 'FILING GATE' : 'READINESS'}</span>
              <strong>{item.label}</strong><p>{item.value}</p><small>{item.passed ? 'Cleared' : item.requirement}</small>
            </article>
          ))}
        </section>
        {!view.readiness.find(item => item.id === 'CFO')?.passed ? (
          <button type="button" className="pm-cfo-callout" onClick={onOpenLeadership}><CircleDollarSign size={19} /><span><strong>Public filing needs a CFO.</strong><small>Open Leadership Suite and appoint finance leadership.</small></span><ChevronRight size={17} /></button>
        ) : null}
        <section className="pm-panel">
          <header><div><span>FILING DRAFT</span><h3>Write the investable story.</h3></div><small>{formatMoney(view.valuation)} derived equity value</small></header>
          <div className="pm-filing-form">
            <label><span>Ticker</span><input value={ticker} maxLength={5} onChange={event => setTicker(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /></label>
            <label><span>Primary offer</span><select value={offerPercent} onChange={event => setOfferPercent(Number(event.target.value))}><option value={15}>15% • preserve control</option><option value={20}>20% • balanced raise</option><option value={25}>25% • scale capital</option></select></label>
          </div>
          <div className="pm-narrative-grid">
            {NARRATIVES.map(option => <button key={option.id} type="button" className={narrative === option.id ? 'is-selected' : ''} onClick={() => setNarrative(option.id)}><span>{narrative === option.id ? <Check size={15} /> : <Sparkles size={15} />}{option.label}</span><small>{option.copy}</small></button>)}
          </div>
          <div className="pm-dilution-preview">
            <div><span>Founder control</span><strong>{platform.founderOwnershipPercent}% → {(platform.founderOwnershipPercent * (1 - offerPercent / 100)).toFixed(2)}%</strong></div>
            <div><span>Indicative raise</span><strong>{formatMoney(view.valuation * offerPercent / 100)}</strong></div>
            <div><span>Public float</span><strong>{offerPercent}%</strong></div>
          </div>
          <button type="button" className="pm-primary" disabled={!view.canStartRoadshow && !platform.publicCompany.ipoJourney} onClick={openCinematicIpo}><FileText size={18} /> {platform.publicCompany.ipoJourney ? 'Resume saved listing process' : 'Enter the listing process'}</button>
          {!view.canStartRoadshow && !platform.publicCompany.ipoJourney ? <p className="pm-form-note">Clear both filing gates and at least four of six readiness pillars. Remaining private has no penalty.</p> : null}
        </section>
      </>
    );
  };

  const renderEarnings = () => (
    <>
      <section className="pm-earnings-hero">
        <div><span>INVESTOR RELATIONS</span><h2>Promise carefully. Report honestly.</h2><p>The market compares the real 12-week platform review against the targets you publish here.</p></div>
        <BarChart3 size={42} />
      </section>
      {view.activeGuidance ? (
        <section className="pm-guidance-card">
          <header><span>ACTIVE GUIDANCE • QUARTER {view.activeGuidance.cycleNumber}</span><strong>{view.activeGuidance.tone}</strong></header>
          <dl>
            <div><dt>Subscribers</dt><dd>{view.activeGuidance.subscriberTarget.toLocaleString()}</dd></div>
            <div><dt>Revenue</dt><dd>{formatMoney(view.activeGuidance.revenueTarget)}</dd></div>
            <div><dt>Cash contribution</dt><dd>{formatMoney(view.activeGuidance.cashContributionTarget)}</dd></div>
            <div><dt>Playback</dt><dd>{view.activeGuidance.playbackTarget.toFixed(2)}%</dd></div>
          </dl>
        </section>
      ) : (
        <section className="pm-panel">
          <header><div><span>NEXT QUARTER</span><h3>Choose the guidance posture.</h3></div><small>No content is locked</small></header>
          <div className="pm-guidance-options">
            {GUIDANCE.map(option => <button key={option.id} type="button" disabled={view.lifecycle !== 'PUBLIC'} onClick={() => act(issueStreamingPublicGuidance(player, option.id), `${option.label} guidance issued.`)}><strong>{option.label}</strong><span>{option.risk}</span></button>)}
          </div>
        </section>
      )}
      <section className="pm-earnings-list">
        {platform.publicCompany.earnings.length ? [...platform.publicCompany.earnings].reverse().map(item => (
          <article key={item.id} className={`is-${item.outcome.toLowerCase()}`}>
            <span>Q{item.cycleNumber}</span><div><strong>{item.headline}</strong><small>{item.subscriberActual.toLocaleString()} subscribers • {formatMoney(item.revenueActual)} revenue • {item.playbackActual.toFixed(2)}% playback</small></div><b>{item.stockReactionPercent >= 0 ? '+' : ''}{item.stockReactionPercent.toFixed(2)}%</b>
          </article>
        )) : <div className="pm-empty-row"><Activity size={22} /><span>The first public earnings record resolves with the next canonical 12-week review.</span></div>}
      </section>
    </>
  );

  const renderShareholders = () => (
    <>
      <section className="pm-shareholder-hero"><Vote size={35} /><div><span>SHAREHOLDER CHAMBER</span><h2>Ownership becomes a vote.</h2><p>Your vote is weighted by {platform.founderOwnershipPercent}% founder ownership. The rest belongs to public and existing outside holders.</p></div></section>
      {view.openVote ? (
        <section className="pm-ballot">
          <span>OPEN BALLOT • DUE WEEK {view.openVote.dueAtAbsoluteWeek}</span><h3>{view.openVote.title}</h3><p>{view.openVote.summary}</p>
          <div><small>Institutional support estimate</small><strong>{view.openVote.institutionalSupport.toFixed(1)}%</strong><i style={{ width: `${view.openVote.institutionalSupport}%` }} /></div>
          <footer><button type="button" onClick={() => act(castStreamingShareholderVote(player, view.openVote!.id, 'AGAINST'), 'Founder vote cast against the resolution.')}>Vote against</button><button type="button" onClick={() => act(castStreamingShareholderVote(player, view.openVote!.id, 'FOR'), 'Founder vote cast for the resolution.')}>Vote for</button></footer>
        </section>
      ) : <div className="pm-empty-row"><Vote size={22} /><span>No ballot is open. Public resolutions arrive with 12-week earnings.</span></div>}
      <section className="pm-vote-history">
        {[...platform.publicCompany.shareholderVotes].reverse().filter(item => item.status !== 'OPEN').map(item => <article key={item.id}><span>{item.status}</span><div><strong>{item.title}</strong><small>{item.finalSupport?.toFixed(1)}% final support • founder voted {item.founderVote?.toLowerCase()}</small></div></article>)}
      </section>
    </>
  );

  const renderDefence = () => (
    <>
      <section className="pm-defence-hero"><Shield size={40} /><div><span>CONTROL & DEFENCE</span><h2>Public capital can challenge the founder.</h2><p>Pressure is deterministic and recoverable. A failed defence changes control and the mandate—it does not end the game.</p></div></section>
      {view.activeActivist ? (
        <section className="pm-threat-card is-activist">
          <header><Megaphone size={22} /><div><span>ACTIVIST CAMPAIGN</span><h3>{view.activeActivist.investorName}</h3></div><strong>{view.activeActivist.ownershipPercent.toFixed(1)}%</strong></header>
          <p>Demand: {view.activeActivist.demand.toLowerCase().replace(/_/g, ' ')} • Pressure {view.activeActivist.pressure.toFixed(0)}/100</p>
          <footer><button type="button" onClick={() => act(respondToStreamingActivist(player, view.activeActivist!.id, 'REFUSE'), 'Board backed the founder against the activist.')}>Refuse</button><button type="button" onClick={() => act(respondToStreamingActivist(player, view.activeActivist!.id, 'ENGAGE'), 'A negotiated review lowered activist pressure.')}>Negotiate</button><button type="button" onClick={() => act(respondToStreamingActivist(player, view.activeActivist!.id, 'ACCEPT'), 'Activist demand accepted as a mandate.')}>Accept demand</button></footer>
        </section>
      ) : <div className="pm-empty-row"><Megaphone size={22} /><span>No activist campaign is active.</span></div>}
      {view.activeTakeover ? (
        <section className="pm-threat-card is-takeover">
          <header><Building2 size={22} /><div><span>HOSTILE TENDER</span><h3>{view.activeTakeover.bidderName}</h3></div><strong>${view.activeTakeover.offerPrice.toFixed(2)}</strong></header>
          <p>{view.activeTakeover.premiumPercent}% premium • {view.activeTakeover.bidderSupportPercent.toFixed(1)}% indicated support</p>
          <div className="pm-defence-options">
            {([
              ['INDEPENDENCE_CAMPAIGN', 'Defend independence', '$12M • win public support'],
              ['WHITE_KNIGHT', 'Find a white knight', '$6M • trade some freedom'],
              ['RIGHTS_PLAN', 'Activate rights plan', '$9M • strongest legal shield'],
              ['NEGOTIATE', 'Negotiate settlement', '$2M • keep CEO role, lose control'],
            ] as [StreamingTakeoverDefence, string, string][]).map(option => <button key={option[0]} type="button" onClick={() => {
              const result = resolveStreamingHostileTakeover(player, view.activeTakeover!.id, option[0]);
              if (result.changed) { onUpdatePlayer(result.player); setShowDefenceScene(true); setFeedback(`${option[1]} committed.`); } else setFeedback(result.reason || 'Defence failed.');
            }}><strong>{option[1]}</strong><small>{option[2]}</small></button>)}
          </div>
        </section>
      ) : <div className="pm-empty-row"><Shield size={22} /><span>No hostile tender is active.</span></div>}
    </>
  );

  if (showCinematicIpo) return (
    <AccessibleDialog className="pm-backdrop pm-listing-takeover" role="dialog" aria-label="IPO listing process" onEscape={() => setShowCinematicIpo(false)}>
      <section className="pm-listing-stage">
        <StreamingListingExperience
          brand={presentationBrand}
          inputs={ipoPresentationInputs}
          initialCheckpoint={platform.publicCompany.ipoJourney as StreamingListingCheckpoint | null}
          onCheckpoint={checkpointCinematicIpo}
          onBack={() => setShowCinematicIpo(false)}
          onDone={finishCinematicIpo}
        />
      </section>
    </AccessibleDialog>
  );

  return (
    <AccessibleDialog className="pm-backdrop" role="dialog" aria-labelledby="pm-title" onEscape={onClose}>
      <section className="pm-shell">
        <header className="pm-topbar">
          <button type="button" onClick={onClose} aria-label="Close Public Markets"><ArrowLeft size={20} /></button>
          <div><span className="pm-mark"><Landmark size={18} /></span><span><strong id="pm-title">Public Markets</strong><small>{platform.identity?.name} • {view.lifecycle.replace(/_/g, ' ')}</small></span></div>
          <aside>{view.latestQuote ? <><strong>{platform.publicCompany.listing?.ticker}</strong><span>${view.latestQuote.close.toFixed(2)}</span></> : <><Crown size={16} /><span>PRIVATE</span></>}</aside>
        </header>
        <nav className="pm-tabs" aria-label="Public markets sections">
          {([
            ['MARKET', LineChart, 'Market'],
            ['IPO', Landmark, 'IPO'],
            ['EARNINGS', BarChart3, 'Earnings'],
            ['SHAREHOLDERS', UsersRound, 'Votes'],
            ['DEFENCE', Shield, 'Defence'],
          ] as [PublicTab, typeof LineChart, string][]).map(([id, Icon, label]) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span>{id === 'SHAREHOLDERS' && view.openVote ? <i /> : id === 'DEFENCE' && (view.activeActivist || view.activeTakeover) ? <i /> : null}</button>)}
        </nav>
        <main>{tab === 'MARKET' ? renderMarket() : tab === 'IPO' ? renderIpo() : tab === 'EARNINGS' ? renderEarnings() : tab === 'SHAREHOLDERS' ? renderShareholders() : renderDefence()}</main>
        {feedback ? <p className="pm-feedback" role="status">{feedback}</p> : null}
      </section>
      {showListingScene && listingScene ? (
        <div className="pm-cinematic">
          <div className="pm-cinematic-rays" />
          <button type="button" onClick={() => finishScene(listingScene.id, 'listing', 'DISMISSED')} aria-label="Skip listing cinematic"><X size={21} /></button>
          <span>EMPIRE EXCHANGE • LISTING DAY</span><Landmark size={58} /><h1>{platform.publicCompany.listing?.ticker}</h1>
          <p>{platform.identity?.name} is now public. The company raised {formatMoney(platform.publicCompany.listing?.capitalRaised || 0)} and the founder retains {platform.founderOwnershipPercent}% voting control.</p>
          <button type="button" onClick={() => finishScene(listingScene.id, 'listing', 'VIEWED')}>Ring the bell <BadgeCheck size={18} /></button>
          <small>Skippable • Replayable from permanent records</small>
        </div>
      ) : null}
      {showDefenceScene && defenceScene ? (
        <div className="pm-cinematic is-defence">
          <div className="pm-cinematic-rays" />
          <button type="button" onClick={() => finishScene(defenceScene.id, 'defence', 'DISMISSED')} aria-label="Skip takeover cinematic"><X size={21} /></button>
          <span>CONTROL ROOM • TENDER DEADLINE</span><Shield size={58} /><h1>The company survives.</h1>
          <p>The defence is committed to the permanent record. Control may have changed, but the player remains in the company with a path to rebuild trust and power.</p>
          <button type="button" onClick={() => finishScene(defenceScene.id, 'defence', 'VIEWED')}>Return to the board <ChevronRight size={18} /></button>
          <small>Fact-backed • Skippable • Reduced-motion safe</small>
        </div>
      ) : null}
    </AccessibleDialog>
  );
}
