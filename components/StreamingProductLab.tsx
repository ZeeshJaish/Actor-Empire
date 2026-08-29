import React, { useMemo, useReducer, type CSSProperties, type Key } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Baby,
  Boxes,
  ChevronRight,
  Clock3,
  FlaskConical,
  Gamepad2,
  Gauge,
  Heart,
  Layers3,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  RadioTower,
  Rocket,
  ShoppingBag,
  Sparkles,
  UsersRound,
  WalletCards,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type {
  Player,
  StreamingProductLaunchMode,
  StreamingProductLineId,
} from '../types';
import {
  getStreamingProductSuite,
  previewStreamingProductLaunch,
  setStreamingProductLinePaused,
  startStreamingProductDevelopment,
  type StreamingProductLineView,
} from '../services/streamingProductSuite';
import StreamingVisualScene from './StreamingVisualScene';
import { getStreamingResearchPortfolio } from '../services/streamingResearchLifecycle';
import '../styles/streaming-product-lab.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenTechnology?: () => void;
  onOpenContent?: () => void;
  onOpenViewerMode?: () => void;
}

type ProductLabView = 'PORTFOLIO' | 'DETAIL' | 'DEVELOPMENT' | 'OPERATIONS';

interface ProductLabState {
  view: ProductLabView;
  selectedLineId: StreamingProductLineId;
  launchMode: StreamingProductLaunchMode;
  feedback: string;
}

type ProductLabAction =
  | { type: 'OPEN_PORTFOLIO' }
  | { type: 'OPEN_DETAIL'; lineId: StreamingProductLineId }
  | { type: 'OPEN_DEVELOPMENT' }
  | { type: 'OPEN_OPERATIONS' }
  | { type: 'SET_MODE'; launchMode: StreamingProductLaunchMode }
  | { type: 'FEEDBACK'; feedback: string };

const reducer = (state: ProductLabState, action: ProductLabAction): ProductLabState => {
  if (action.type === 'OPEN_PORTFOLIO') return { ...state, view: 'PORTFOLIO', feedback: '' };
  if (action.type === 'OPEN_DETAIL') return { ...state, view: 'DETAIL', selectedLineId: action.lineId, feedback: '' };
  if (action.type === 'OPEN_DEVELOPMENT') return { ...state, view: 'DEVELOPMENT', feedback: '' };
  if (action.type === 'OPEN_OPERATIONS') return { ...state, view: 'OPERATIONS', feedback: '' };
  if (action.type === 'SET_MODE') return { ...state, launchMode: action.launchMode, feedback: '' };
  if (action.type === 'FEEDBACK') return { ...state, feedback: action.feedback };
  return state;
};

const PRODUCT_ICONS: Record<StreamingProductLineId, LucideIcon> = {
  CORE: Layers3,
  KIDS: Baby,
  FREE: RadioTower,
  LIVE: Radio,
  FAN: Heart,
  STORE: ShoppingBag,
  INTERACTIVE: Gamepad2,
};

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatDelta = (value: number, kind: 'RATE' | 'MONEY'): string => {
  if (kind === 'MONEY') return value ? `+$${value.toFixed(2)} / subscriber` : 'No direct revenue';
  if (!value) return 'Neutral';
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)} pts`;
};

function ProductCard({
  line,
  onOpen,
}: {
  key?: Key;
  line: StreamingProductLineView;
  onOpen: () => void;
}) {
  const Icon = PRODUCT_ICONS[line.definition.id];
  return (
    <button
      type="button"
      className={`product-lab-line-card is-${line.status.toLowerCase()}`}
      style={{ '--product-accent': line.definition.accent } as CSSProperties}
      onClick={onOpen}
    >
      <div className="product-lab-line-art" aria-hidden="true">
        <i /><i /><i />
        <span><Icon size={29} /></span>
      </div>
      <div className="product-lab-line-copy">
        <span>{line.definition.codename} • {line.definition.audience}</span>
        <h3>{line.definition.title}</h3>
        <p>{line.definition.tagline}</p>
        <footer>
          <strong>{line.status.replaceAll('_', ' ')}</strong>
          <small>{line.record ? `${line.record.staffRequired} staff • ${line.record.peakLoadPercent}% load` : line.definition.id === 'CORE' ? 'Included in launch stack' : `${line.definition.staffRequired} staff • ${line.definition.peakLoadPercent}% load`}</small>
        </footer>
      </div>
      <ChevronRight size={19} />
    </button>
  );
}

export default function StreamingProductLab({
  player,
  onUpdatePlayer,
  onClose,
  onOpenTechnology,
  onOpenContent,
  onOpenViewerMode,
}: Props) {
  const suite = useMemo(() => getStreamingProductSuite(player), [player]);
  const researchPortfolio = useMemo(() => getStreamingResearchPortfolio(player), [player]);
  const defaultLine = suite.lines.find(line => line.status === 'AVAILABLE')?.definition.id || 'CORE';
  const [ui, dispatch] = useReducer(reducer, {
    view: suite.activeDevelopment ? 'DEVELOPMENT' : 'PORTFOLIO',
    selectedLineId: defaultLine,
    launchMode: 'BALANCED',
    feedback: '',
  });
  const selectedLine = suite.lines.find(line => line.definition.id === ui.selectedLineId) || suite.lines[0];
  const preview = previewStreamingProductLaunch(selectedLine.definition, ui.launchMode);
  const activeDevelopment = suite.activeDevelopment;
  const weeksRemaining = activeDevelopment
    ? Math.max(0, activeDevelopment.readyAtAbsoluteWeek - suite.absoluteWeek)
    : 0;

  const startDevelopment = () => {
    const result = startStreamingProductDevelopment(player, selectedLine.definition.id, ui.launchMode);
    if (!result.changed) {
      const feedback = result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot cover this development order.'
        : result.reason === 'STAFF_REQUIRED'
          ? 'Active products and current development already consume the available product team.'
          : result.reason === 'PROJECT_ACTIVE'
            ? 'Product Lab is already developing another public line.'
            : result.reason === 'CORE_INCLUDED'
              ? 'Core is already included in the operating platform.'
              : 'Complete the listed technology, content and capacity prerequisites first.';
      dispatch({ type: 'FEEDBACK', feedback });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'OPEN_DEVELOPMENT' });
  };

  const togglePaused = (line: StreamingProductLineView) => {
    if (!line.record || line.definition.id === 'CORE') return;
    const result = setStreamingProductLinePaused(
      player,
      line.definition.id,
      line.record.status === 'ACTIVE',
    );
    if (!result.changed) {
      dispatch({
        type: 'FEEDBACK',
        feedback: result.reason === 'SAME_WEEK'
          ? 'A product line can change operating state only once in the same game week.'
          : result.reason === 'STAFF_REQUIRED'
            ? 'There is not enough product staff to resume this line.'
            : 'The operating state could not be changed.',
      });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'FEEDBACK', feedback: `${line.definition.title} is now ${result.line?.status.toLowerCase()}.` });
  };

  const renderPortfolio = () => (
    <>
      <section className="product-lab-portfolio">
        <header>
          <div><span>PUBLIC PRODUCT PORTFOLIO</span><h2>One platform. Seven reasons to return.</h2></div>
          <p>Products earn attention only when technology, programming, staff and capacity can support them.</p>
        </header>
        <div className="product-lab-line-grid">
          {suite.lines.map(line => (
            <ProductCard
              key={line.definition.id}
              line={line}
              onOpen={() => dispatch({ type: 'OPEN_DETAIL', lineId: line.definition.id })}
            />
          ))}
        </div>
      </section>
      <section className="product-lab-pulse-strip">
        <article><UsersRound size={19} /><span>Product team</span><strong>{suite.committedStaff}/{suite.availableStaff}</strong><small>{suite.remainingStaff} staff available</small></article>
        <article><WalletCards size={19} /><span>Operating run rate</span><strong>{formatMoney(suite.weeklyOperatingCost)}/wk</strong><small>Active public lines only</small></article>
        <article className={suite.peakLoadPercent >= 35 ? 'is-warning' : ''}><Gauge size={19} /><span>Added peak load</span><strong>+{suite.peakLoadPercent.toFixed(1)}%</strong><small>Feeds canonical concurrency</small></article>
        <article><Activity size={19} /><span>Operating products</span><strong>{suite.activeProductIds.length}</strong><small>Core plus active expansions</small></article>
      </section>
    </>
  );

  const renderDetail = () => {
    const Icon = PRODUCT_ICONS[selectedLine.definition.id];
    const record = selectedLine.record;
    const benefit = selectedLine.definition.benefit;
    const isCore = selectedLine.definition.id === 'CORE';
    return (
      <section className="product-lab-detail" style={{ '--product-accent': selectedLine.definition.accent } as CSSProperties}>
        <header className="product-lab-detail-heading">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_PORTFOLIO' })}><ArrowLeft size={18} /> Portfolio</button>
          <div className="product-lab-detail-mark"><Icon size={31} /></div>
          <div><span>{selectedLine.definition.codename} • {selectedLine.definition.audience}</span><h2>{selectedLine.definition.title}</h2><p>{selectedLine.definition.description}</p></div>
          <strong>{selectedLine.status.replaceAll('_', ' ')}</strong>
        </header>

        <div className="product-lab-detail-grid">
          <article className="product-lab-blueprint">
            <header><span>STRATEGIC PRODUCT BRIEF</span><h3>{selectedLine.definition.tagline}</h3></header>
            <p>{selectedLine.definition.strategicConsequence}</p>
            <div className="product-lab-impact-grid">
              <div><Rocket size={16} /><span>Acquisition</span><strong>{formatDelta(benefit.acquisitionRateDelta, 'RATE')}</strong></div>
              <div><Heart size={16} /><span>Churn pressure</span><strong>{formatDelta(benefit.churnRateDelta, 'RATE')}</strong></div>
              <div><Activity size={16} /><span>Engagement</span><strong>{formatDelta(benefit.engagementRateDelta, 'RATE')}</strong></div>
              <div><WalletCards size={16} /><span>Weekly revenue</span><strong>{formatDelta(benefit.weeklyRevenuePerSubscriber, 'MONEY')}</strong></div>
            </div>
            <div className={`product-lab-risk is-${preview.risk.toLowerCase()}`}>
              <AlertTriangle size={19} />
              <div><span>{preview.risk} OPERATING RISK</span><p>{record?.riskNote || preview.riskNote}</p></div>
            </div>
            <div className="product-lab-consequence">
              <Gauge size={19} />
              <div><strong>{record?.peakLoadPercent ?? preview.peakLoadPercent}% added peak load</strong><p>This multiplies real peak activity before capacity utilization and playback health are calculated.</p></div>
            </div>
          </article>

          <article className="product-lab-launch-card">
            <header><span>{record ? 'OPERATING CONTRACT' : isCore ? 'FOUNDATION PRODUCT' : 'LAUNCH ORDER'}</span><h3>{record ? 'This product has a permanent company record.' : isCore ? 'Core is already running.' : 'Choose how Product Lab ships it.'}</h3></header>
            {record ? (
              <>
                <dl>
                  <div><dt>Capital invested</dt><dd>{formatMoney(record.capitalCost)}</dd></div>
                  <div><dt>Weekly cost</dt><dd>{formatMoney(record.weeklyOperatingCost)}</dd></div>
                  <div><dt>Staff</dt><dd>{record.staffRequired}</dd></div>
                  <div><dt>Launch mode</dt><dd>{record.launchMode.replaceAll('_', ' ')}</dd></div>
                </dl>
                {record.status === 'UNDER_DEVELOPMENT' ? (
                  <button type="button" onClick={() => dispatch({ type: 'OPEN_DEVELOPMENT' })}><Wrench size={17} /> View development</button>
                ) : (
                  <button type="button" className={record.status === 'ACTIVE' ? 'is-pause' : ''} onClick={() => togglePaused(selectedLine)}>
                    {record.status === 'ACTIVE' ? <Pause size={17} /> : <Play size={17} />}
                    {record.status === 'ACTIVE' ? 'Pause public line' : 'Resume public line'}
                  </button>
                )}
              </>
            ) : isCore ? (
              <div className="product-lab-core-included">
                <BadgeCheck size={29} />
                <strong>Included with platform launch</strong>
                <p>Infrastructure cost already carries profiles, catalog, search and playback. Core cannot be double-charged or paused.</p>
                <button type="button" onClick={onOpenViewerMode}><Play size={17} /> Open public Core</button>
              </div>
            ) : (
              <>
                {selectedLine.definition.id === 'KIDS' ? (() => {
                  const kidsResearch = researchPortfolio.programs.find(item => item.definition.id === 'kids-mode');
                  return (
                    <div className={`product-lab-research-handoff is-${String(kidsResearch?.status || 'locked').toLowerCase()}`}>
                      <FlaskConical size={18} />
                      <div><strong>Kids Mode research</strong><p>{kidsResearch?.program ? `${kidsResearch.program.stage.replaceAll('_', ' ')} · research and product development remain separate records.` : 'Complete research, prototype, test and IP clearance in Technology Campus first.'}</p></div>
                      {!kidsResearch?.program || !['READY_TO_INSTALL', 'INSTALLING', 'OPERATING'].includes(kidsResearch.program.stage) ? <button type="button" onClick={onOpenTechnology}>Open Research</button> : <BadgeCheck size={18} />}
                    </div>
                  );
                })() : null}
                <div className="product-lab-launch-metrics">
                  <div><WalletCards size={16} /><span>Capital</span><strong>{formatMoney(preview.capitalCost)}</strong></div>
                  <div><Clock3 size={16} /><span>Development</span><strong>{preview.developmentWeeks} weeks</strong></div>
                  <div><UsersRound size={16} /><span>Staff</span><strong>{preview.staffRequired}</strong></div>
                  <div><Gauge size={16} /><span>Run rate</span><strong>{formatMoney(preview.weeklyOperatingCost)}/wk</strong></div>
                </div>
                <div className="product-lab-modes">
                  <span>PRODUCT DELIVERY POSTURE</span>
                  {([
                    ['VALIDATED', 'Validated', 'More testing, slower, calmer opening load'],
                    ['BALANCED', 'Balanced', 'Designed cost, timing and operating profile'],
                    ['FIRST_TO_MARKET', 'First to market', 'Faster launch, more risk and peak load'],
                  ] as const).map(([id, label, copy]) => (
                    <button type="button" key={id} className={ui.launchMode === id ? 'is-selected' : ''} onClick={() => dispatch({ type: 'SET_MODE', launchMode: id })}>
                      <strong>{label}</strong><small>{copy}</small>
                    </button>
                  ))}
                </div>
                <div className="product-lab-prerequisites">
                  <strong>LAUNCH CLEARANCE</strong>
                  {selectedLine.blockers.length ? selectedLine.blockers.map(blocker => (
                    <span key={blocker}><LockKeyhole size={14} /> {blocker}</span>
                  )) : <span className="is-clear"><BadgeCheck size={14} /> Technology, content, staff and capacity cleared</span>}
                </div>
                {ui.feedback ? <div className="product-lab-feedback" role="alert">{ui.feedback}</div> : null}
                <footer>
                  <span>{formatMoney(player.ownedStreamingPlatform.treasuryCash)} treasury</span>
                  <button type="button" disabled={selectedLine.status !== 'AVAILABLE'} onClick={startDevelopment}><Rocket size={17} /> Approve development</button>
                </footer>
              </>
            )}
          </article>
        </div>
      </section>
    );
  };

  const renderDevelopment = () => (
    <section className="product-lab-development">
      <header><span>PRODUCT DEVELOPMENT STAGE</span><h2>{activeDevelopment ? 'A new public surface is being built.' : 'The development stage is available.'}</h2><p>Product launches move with Actor Empire game weeks. Product Lab has no real-world timers or paid skips.</p></header>
      {activeDevelopment ? (
        <div className="product-lab-development-stage">
          <div className="product-lab-development-visual" aria-hidden="true">
            <i /><i /><i /><i />
            <span><FlaskConical size={36} /></span>
          </div>
          <div className="product-lab-development-copy">
            <span>{activeDevelopment.lineId} • {activeDevelopment.launchMode.replaceAll('_', ' ')}</span>
            <h3>{activeDevelopment.title}</h3>
            <p>{activeDevelopment.riskNote}</p>
            <div className="product-lab-progress"><i style={{ width: `${Math.min(100, Math.max(0, (suite.absoluteWeek - activeDevelopment.startedAtAbsoluteWeek) / activeDevelopment.developmentWeeks * 100))}%` }} /></div>
            <dl>
              <div><dt>Weeks remaining</dt><dd>{weeksRemaining}</dd></div>
              <div><dt>Public launch</dt><dd>Week {activeDevelopment.readyAtAbsoluteWeek}</dd></div>
              <div><dt>Team committed</dt><dd>{activeDevelopment.staffRequired}</dd></div>
              <div><dt>Opening load</dt><dd>+{activeDevelopment.peakLoadPercent}%</dd></div>
            </dl>
            <aside><Clock3 size={18} /><div><strong>The weekly platform processor owns launch.</strong><p>When the due game week arrives, the line activates once and its costs, audience effects and load become real together.</p></div></aside>
          </div>
        </div>
      ) : (
        <div className="product-lab-empty"><Boxes size={34} /><h3>No product is under development.</h3><p>Choose an available product line from the portfolio.</p><button type="button" onClick={() => dispatch({ type: 'OPEN_PORTFOLIO' })}>Open product portfolio</button></div>
      )}
    </section>
  );

  const renderOperations = () => (
    <section className="product-lab-operations">
      <header><span>LIVE PRODUCT OPERATIONS</span><h2>The cost of being useful.</h2><p>Pause an expansion to release staff, reduce weekly cost and lower peak traffic. Its audience benefits and revenue stop with it.</p></header>
      <div className="product-lab-operation-list">
        {suite.lines.filter(line => ['CORE_ACTIVE', 'ACTIVE', 'PAUSED'].includes(line.status)).map(line => {
          const Icon = PRODUCT_ICONS[line.definition.id];
          return (
            <article key={line.definition.id} style={{ '--product-accent': line.definition.accent } as CSSProperties}>
              <div><Icon size={21} /></div>
              <section><span>{line.definition.codename}</span><h3>{line.definition.title}</h3><p>{line.record?.strategicConsequence || line.definition.strategicConsequence}</p></section>
              <dl>
                <div><dt>Staff</dt><dd>{line.record?.staffRequired || 'Stack'}</dd></div>
                <div><dt>Run rate</dt><dd>{line.record ? `${formatMoney(line.record.weeklyOperatingCost)}/wk` : 'Included'}</dd></div>
                <div><dt>Peak load</dt><dd>+{line.record?.peakLoadPercent || 0}%</dd></div>
              </dl>
              {line.record ? (
                <button type="button" onClick={() => togglePaused(line)}>
                  {line.record.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                  {line.record.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                </button>
              ) : <span className="product-lab-core-chip"><BadgeCheck size={14} /> Foundation</span>}
            </article>
          );
        })}
      </div>
      {ui.feedback ? <div className="product-lab-feedback" role="status">{ui.feedback}</div> : null}
    </section>
  );

  return (
    <div className="product-lab-shell" role="dialog" aria-modal="true" aria-label="EMPIRE+ Product Lab">
      <header className="product-lab-topbar">
        <button type="button" onClick={onClose} aria-label="Close Product Lab"><ArrowLeft size={20} /></button>
        <div><span>EMPIRE+ PRODUCT LAB</span><strong>Public Experience Session • Week {suite.absoluteWeek}</strong></div>
        <div><small>PLATFORM TREASURY</small><strong>{formatMoney(player.ownedStreamingPlatform.treasuryCash)}</strong></div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>
      <main className="product-lab-main">
        <StreamingVisualScene
          sceneId="viewerLab"
          className="product-lab-scene"
          eyebrow="PLATFORM PRODUCT LAB"
          title={activeDevelopment ? `${activeDevelopment.title} is becoming real.` : 'Design what the audience comes back for.'}
          description="Every product competes for engineering, programming, staff, treasury and peak capacity."
          status={{
            label: activeDevelopment ? `${weeksRemaining} game weeks to launch` : `${suite.activeProductIds.length} products operating`,
            detail: `${suite.committedStaff}/${suite.availableStaff} staff • +${suite.peakLoadPercent.toFixed(1)}% peak load`,
            tone: activeDevelopment ? 'warning' : suite.peakLoadPercent >= 40 ? 'critical' : 'active',
          }}
          hotspots={[
            { id: 'portfolio', label: 'Product Portfolio', status: 'Seven lines', x: 20, y: 43, tone: 'active', icon: <Layers3 size={16} /> },
            { id: 'development', label: 'Development Stage', status: activeDevelopment ? `${weeksRemaining} weeks left` : 'Available', x: 51, y: 29, tone: activeDevelopment ? 'warning' : 'success', icon: <FlaskConical size={16} /> },
            { id: 'operations', label: 'Live Operations', status: `${suite.activeProductIds.length} online`, x: 81, y: 44, tone: 'neutral', icon: <Activity size={16} /> },
          ]}
          onHotspotSelect={hotspot => dispatch(
            hotspot.id === 'portfolio'
              ? { type: 'OPEN_PORTFOLIO' }
              : hotspot.id === 'development'
                ? { type: 'OPEN_DEVELOPMENT' }
                : { type: 'OPEN_OPERATIONS' },
          )}
        />

        <nav className="product-lab-tabs" aria-label="Product Lab sections">
          <button type="button" className={ui.view === 'PORTFOLIO' || ui.view === 'DETAIL' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_PORTFOLIO' })}><Layers3 size={17} /><span>Portfolio<small>Seven public product lines</small></span></button>
          <button type="button" className={ui.view === 'DEVELOPMENT' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_DEVELOPMENT' })}><FlaskConical size={17} /><span>Development<small>{activeDevelopment ? `${weeksRemaining} weeks remaining` : 'Stage available'}</small></span></button>
          <button type="button" className={ui.view === 'OPERATIONS' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_OPERATIONS' })}><Activity size={17} /><span>Operations<small>{suite.activeProductIds.length} product{suite.activeProductIds.length === 1 ? '' : 's'} online</small></span></button>
        </nav>

        {!suite.available ? (
          <section className="product-lab-locked">
            <LockKeyhole size={38} />
            <span>PRODUCT LAB OFFLINE</span>
            <h2>Launch the core platform first.</h2>
            <p>Products need a live public service, working infrastructure and canonical weekly operations.</p>
          </section>
        ) : ui.view === 'PORTFOLIO' ? renderPortfolio() : ui.view === 'DETAIL' ? renderDetail() : ui.view === 'DEVELOPMENT' ? renderDevelopment() : renderOperations()}

        {suite.available ? (
          <aside className="product-lab-links">
            <Zap size={20} />
            <div><strong>Product clearance comes from the rest of the company.</strong><p>Technology supplies capability, Content supplies reasons to use it, and Viewer Mode shows only products actually operating.</p></div>
            <button type="button" onClick={onOpenTechnology}>Technology</button>
            <button type="button" onClick={onOpenContent}>Content</button>
            <button type="button" onClick={onOpenViewerMode}>Public view <ChevronRight size={15} /></button>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
