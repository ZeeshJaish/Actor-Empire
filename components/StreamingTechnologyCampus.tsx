import { useMemo, useReducer, type CSSProperties, type Key } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  BrainCircuit,
  ChevronRight,
  CircuitBoard,
  Clock3,
  CloudCog,
  Cpu,
  DatabaseZap,
  Gauge,
  HardHat,
  Layers3,
  LockKeyhole,
  Network,
  RadioTower,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UsersRound,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  Player,
  StreamingTechnologyBuildMode,
  StreamingTechnologyCampusBranch,
} from '../types';
import {
  getStreamingTechnologyCampus,
  previewStreamingTechnologyProject,
  startStreamingTechnologyProject,
  type StreamingTechnologyFacilityView,
  type StreamingTechnologyNode,
} from '../services/streamingTechnologyCampus';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-technology-campus.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenCompany?: () => void;
  onOpenInfrastructure?: () => void;
}

type CampusView = 'CAMPUS' | 'LAB' | 'CONSTRUCTION' | 'LEDGER';

interface CampusUiState {
  view: CampusView;
  branch: StreamingTechnologyCampusBranch;
  selectedDefinitionId: string | null;
  buildMode: StreamingTechnologyBuildMode;
  feedback: string;
}

type CampusUiAction =
  | { type: 'OPEN_CAMPUS' }
  | { type: 'OPEN_BRANCH'; branch: StreamingTechnologyCampusBranch }
  | { type: 'OPEN_CONSTRUCTION' }
  | { type: 'OPEN_LEDGER' }
  | { type: 'SELECT_PROJECT'; definitionId: string }
  | { type: 'SET_BUILD_MODE'; buildMode: StreamingTechnologyBuildMode }
  | { type: 'FEEDBACK'; feedback: string };

const reducer = (state: CampusUiState, action: CampusUiAction): CampusUiState => {
  if (action.type === 'OPEN_CAMPUS') return { ...state, view: 'CAMPUS', feedback: '' };
  if (action.type === 'OPEN_BRANCH') return { ...state, view: 'LAB', branch: action.branch, selectedDefinitionId: null, feedback: '' };
  if (action.type === 'OPEN_CONSTRUCTION') return { ...state, view: 'CONSTRUCTION', feedback: '' };
  if (action.type === 'OPEN_LEDGER') return { ...state, view: 'LEDGER', feedback: '' };
  if (action.type === 'SELECT_PROJECT') return { ...state, selectedDefinitionId: action.definitionId, feedback: '' };
  if (action.type === 'SET_BUILD_MODE') return { ...state, buildMode: action.buildMode, feedback: '' };
  if (action.type === 'FEEDBACK') return { ...state, feedback: action.feedback };
  return state;
};

const BRANCH_ICONS: Record<StreamingTechnologyCampusBranch, LucideIcon> = {
  DELIVERY_CAPACITY: RadioTower,
  PLAYBACK_QUALITY: Cpu,
  RELIABILITY: ShieldCheck,
  DATA_RECOMMENDATIONS: BrainCircuit,
  SECURITY: LockKeyhole,
  CONTENT_OPERATIONS: Layers3,
};

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCapacity = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  return `${Math.round(value / 1_000)}K`;
};

const describeBenefit = (node: StreamingTechnologyNode): string[] => {
  const benefit = node.definition.benefit;
  return [
    benefit.baselineConcurrentStreamsDelta ? `+${formatCapacity(benefit.baselineConcurrentStreamsDelta)} normal streams` : '',
    benefit.burstConcurrentStreamsDelta ? `+${formatCapacity(benefit.burstConcurrentStreamsDelta)} burst streams` : '',
    benefit.reliabilityDelta ? `+${benefit.reliabilityDelta.toFixed(2)} reliability target` : '',
    benefit.playbackQualityDelta ? `Playback branch reaches level ${node.definition.targetLevel}` : '',
    benefit.recommendationDelta ? `Recommendation branch reaches level ${node.definition.targetLevel}` : '',
    benefit.securityDelta ? `Security branch reaches level ${node.definition.targetLevel}` : '',
    benefit.contentOperationsDelta ? `Content operations reaches level ${node.definition.targetLevel}` : '',
  ].filter(Boolean);
};

function FacilityCard({
  facility,
  onOpen,
}: {
  key?: Key;
  facility: StreamingTechnologyFacilityView;
  onOpen: () => void;
}) {
  const Icon = BRANCH_ICONS[facility.definition.id];
  const next = facility.nextNode;
  return (
    <button
      type="button"
      className="tech-campus-facility"
      style={{ '--facility-accent': facility.definition.accent } as CSSProperties}
      onClick={onOpen}
    >
      <div className="tech-campus-facility-art" aria-hidden="true">
        <i /><i /><i />
        <span><Icon size={26} /></span>
      </div>
      <div className="tech-campus-facility-copy">
        <span>{facility.definition.scene}</span>
        <h3>{facility.definition.name}</h3>
        <p>{facility.definition.mandate}</p>
        <div>
          <strong>LEVEL {facility.currentLevel}</strong>
          <small>{next ? next.status === 'BUILDING' ? 'Construction active' : `${next.definition.codename} next` : 'Branch complete'}</small>
        </div>
      </div>
      <ChevronRight size={19} />
    </button>
  );
}

export default function StreamingTechnologyCampus({
  player,
  onUpdatePlayer,
  onClose,
  onOpenCompany,
  onOpenInfrastructure,
}: Props) {
  const campus = useMemo(() => getStreamingTechnologyCampus(player), [player]);
  const defaultBranch = campus.facilities.find(facility => facility.nextNode?.status === 'AVAILABLE')?.definition.id
    || 'DELIVERY_CAPACITY';
  const [ui, dispatch] = useReducer(reducer, {
    view: campus.activeProject ? 'CONSTRUCTION' : 'CAMPUS',
    branch: defaultBranch,
    selectedDefinitionId: null,
    buildMode: 'BALANCED',
    feedback: '',
  });
  const selectedFacility = campus.facilities.find(facility => facility.definition.id === ui.branch) || campus.facilities[0];
  const selectedNode = selectedFacility?.nodes.find(node => node.definition.id === ui.selectedDefinitionId)
    || selectedFacility?.nextNode
    || null;
  const preview = selectedNode ? previewStreamingTechnologyProject(selectedNode.definition, ui.buildMode) : null;
  const activeProject = campus.activeProject;
  const weeksRemaining = activeProject ? Math.max(0, activeProject.readyAtAbsoluteWeek - campus.absoluteWeek) : 0;

  const startProject = () => {
    if (!selectedNode) return;
    const result = startStreamingTechnologyProject(player, selectedNode.definition.id, ui.buildMode);
    if (!result.changed) {
      const message = result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot fund this construction order.'
        : result.reason === 'CTO_REQUIRED'
          ? 'This is frontier research. Appoint an active CTO from Company Office first.'
          : result.reason === 'STAFF_REQUIRED'
            ? 'The current delivery stack cannot support the required engineering team.'
            : result.reason === 'PROJECT_ACTIVE'
              ? 'The construction bay is already committed to another project.'
              : 'Complete the previous technology node before starting this project.';
      dispatch({ type: 'FEEDBACK', feedback: message });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'OPEN_CONSTRUCTION' });
  };

  const renderCampus = () => (
    <>
      <section className="tech-campus-map">
        <header>
          <div><span>PHYSICAL CAMPUS MAP</span><h2>Six facilities. One operating platform.</h2></div>
          <p>Choose where the company’s engineering capital goes next. Every building changes a canonical branch.</p>
        </header>
        <div className="tech-campus-map-grid">
          {campus.facilities.map(facility => (
            <FacilityCard key={facility.definition.id} facility={facility} onOpen={() => dispatch({ type: 'OPEN_BRANCH', branch: facility.definition.id })} />
          ))}
        </div>
      </section>
      <section className="tech-campus-command-strip">
        <article><UsersRound size={19} /><span>Engineering capacity</span><strong>{campus.availableEngineeringStaff} staff</strong><small>Derived from the active stack and CTO</small></article>
        <article><Wrench size={19} /><span>Installed projects</span><strong>{campus.completedProjectCount}</strong><small>Permanent company technology</small></article>
        <article><WalletCards size={19} /><span>Campus run rate</span><strong>{formatMoney(campus.totalWeeklyOperatingCost)}/wk</strong><small>Added to weekly operations</small></article>
        <article className={campus.technicalDebt >= 20 ? 'is-warning' : ''}><AlertTriangle size={19} /><span>Technical debt</span><strong>{campus.technicalDebt}</strong><small>Reduces service health until hardened</small></article>
      </section>
    </>
  );

  const renderLab = () => {
    const FacilityIcon = BRANCH_ICONS[selectedFacility.definition.id];
    return (
      <section className="tech-branch-lab" style={{ '--facility-accent': selectedFacility.definition.accent } as CSSProperties}>
        <header className="tech-branch-heading">
          <button type="button" onClick={() => dispatch({ type: 'OPEN_CAMPUS' })}><ArrowLeft size={18} /> Campus</button>
          <div className="tech-branch-heading-icon"><FacilityIcon size={25} /></div>
          <div><span>{selectedFacility.definition.scene}</span><h2>{selectedFacility.definition.name}</h2><p>{selectedFacility.definition.mandate}</p></div>
          <strong>LEVEL {selectedFacility.currentLevel}</strong>
        </header>
        <div className="tech-branch-workspace">
          <div className="tech-upgrade-spine" aria-label={`${selectedFacility.definition.name} progression`}>
            {selectedFacility.nodes.map((node, index) => (
              <button
                type="button"
                key={node.definition.id}
                className={`tech-upgrade-node is-${node.status.toLowerCase()} ${selectedNode?.definition.id === node.definition.id ? 'is-selected' : ''}`}
                onClick={() => dispatch({ type: 'SELECT_PROJECT', definitionId: node.definition.id })}
              >
                <span className="tech-upgrade-node-index">{node.status === 'INSTALLED' ? <BadgeCheck size={16} /> : node.status === 'BUILDING' ? <HardHat size={16} /> : index + 1}</span>
                <div><small>{node.definition.codename} • LEVEL {node.definition.targetLevel}</small><strong>{node.definition.title}</strong><p>{node.status === 'INSTALLED' ? 'Installed in live operations' : node.status === 'BUILDING' ? `Ready week ${node.project?.readyAtAbsoluteWeek}` : node.blockers[0] || node.definition.benefitSummary}</p></div>
                {node.status === 'LOCKED' ? <LockKeyhole size={16} /> : <ChevronRight size={16} />}
              </button>
            ))}
          </div>
          {selectedNode && preview ? (
            <article className="tech-project-blueprint">
              <header><div><span>ENGINEERING BLUEPRINT</span><h3>{selectedNode.definition.title}</h3><p>{selectedNode.definition.description}</p></div><CircuitBoard size={29} /></header>
              <div className="tech-blueprint-benefits">
                <strong>WHAT CHANGES</strong>
                {describeBenefit(selectedNode).map(item => <span key={item}><Sparkles size={15} /> {item}</span>)}
              </div>
              <div className="tech-blueprint-metrics">
                <div><WalletCards size={16} /><span>Capital</span><strong>{formatMoney(preview.capitalCost)}</strong></div>
                <div><Clock3 size={16} /><span>Construction</span><strong>{preview.constructionWeeks} weeks</strong></div>
                <div><UsersRound size={16} /><span>Staff</span><strong>{preview.staffRequired}</strong></div>
                <div><ServerCog size={16} /><span>Run rate</span><strong>{formatMoney(preview.weeklyOperatingCostDelta)}/wk</strong></div>
              </div>
              <div className="tech-build-modes">
                <span>CONSTRUCTION DOCTRINE</span>
                {([
                  ['HARDENED', 'Hardened', 'More verification, slower, lower debt'],
                  ['BALANCED', 'Balanced', 'Designed cost, schedule and risk'],
                  ['SPRINT', 'Sprint', 'Faster delivery, more debt and risk'],
                ] as const).map(([id, label, copy]) => (
                  <button type="button" key={id} className={ui.buildMode === id ? 'is-selected' : ''} onClick={() => dispatch({ type: 'SET_BUILD_MODE', buildMode: id })}>
                    <strong>{label}</strong><small>{copy}</small>
                  </button>
                ))}
              </div>
              <div className={`tech-risk-brief is-${preview.risk.toLowerCase()}`}>
                <AlertTriangle size={18} />
                <div><span>{preview.risk} DELIVERY RISK • {preview.technicalDebtDelta >= 0 ? '+' : ''}{preview.technicalDebtDelta} DEBT</span><p>{preview.riskNote}</p></div>
              </div>
              {selectedNode.blockers.length ? (
                <div className="tech-project-blockers">
                  {selectedNode.blockers.map(blocker => <span key={blocker}><LockKeyhole size={14} /> {blocker}</span>)}
                </div>
              ) : null}
              {ui.feedback ? <div className="tech-campus-feedback" role="status">{ui.feedback}</div> : null}
              <footer>
                <span>{formatMoney(player.ownedStreamingPlatform.treasuryCash)} treasury</span>
                {selectedNode.status === 'INSTALLED' ? (
                  <strong><BadgeCheck size={17} /> Installed</strong>
                ) : selectedNode.status === 'BUILDING' ? (
                  <button type="button" onClick={() => dispatch({ type: 'OPEN_CONSTRUCTION' })}><HardHat size={17} /> View construction</button>
                ) : (
                  <button type="button" disabled={selectedNode.status !== 'AVAILABLE'} onClick={startProject}><Rocket size={17} /> Approve construction</button>
                )}
              </footer>
            </article>
          ) : null}
        </div>
      </section>
    );
  };

  const renderConstruction = () => (
    <section className="tech-construction-bay">
      <header><span>CONSTRUCTION BAY</span><h2>{activeProject ? 'A live engineering project is taking shape.' : 'The construction bay is clear.'}</h2><p>Technology advances only through game weeks. There are no real-world timers and no paid skips.</p></header>
      {activeProject ? (
        <div className="tech-construction-stage">
          <div className="tech-construction-visual" aria-hidden="true">
            <i /><i /><i /><i />
            <span><HardHat size={35} /></span>
          </div>
          <div className="tech-construction-copy">
            <span>{activeProject.branch.replaceAll('_', ' ')} • {activeProject.buildMode}</span>
            <h3>{activeProject.title}</h3>
            <p>{activeProject.riskNote}</p>
            <div className="tech-construction-progress">
              <i style={{ width: `${Math.min(100, Math.max(0, (campus.absoluteWeek - activeProject.startedAtAbsoluteWeek) / activeProject.constructionWeeks * 100))}%` }} />
            </div>
            <dl>
              <div><dt>Weeks remaining</dt><dd>{weeksRemaining}</dd></div>
              <div><dt>Goes live</dt><dd>Week {activeProject.readyAtAbsoluteWeek}</dd></div>
              <div><dt>Staff committed</dt><dd>{activeProject.staffRequired}</dd></div>
              <div><dt>Weekly cost after launch</dt><dd>{formatMoney(activeProject.weeklyOperatingCostDelta)}</dd></div>
            </dl>
            <aside><TimerReset size={18} /><div><strong>Advance the Actor Empire week normally.</strong><p>Completion is committed by the canonical weekly processor exactly once.</p></div></aside>
          </div>
        </div>
      ) : (
        <div className="tech-empty-construction"><Boxes size={33} /><h3>No project under construction.</h3><p>Return to the campus and choose the next available branch upgrade.</p><button type="button" onClick={() => dispatch({ type: 'OPEN_CAMPUS' })}>Choose a facility</button></div>
      )}
    </section>
  );

  const renderLedger = () => (
    <section className="tech-engineering-ledger">
      <header><span>PERMANENT ENGINEERING RECORD</span><h2>Technology ledger</h2><p>Capital, doctrine, risk, debt and operating cost remain attached to the project that created them.</p></header>
      <div className="tech-ledger-list">
        {[...player.ownedStreamingPlatform.technologyProjects].reverse().map(project => (
          <article key={project.id}>
            <div className={`tech-ledger-status is-${project.status.toLowerCase()}`}>{project.status === 'COMPLETED' ? <BadgeCheck size={17} /> : <HardHat size={17} />}</div>
            <div><span>{project.branch.replaceAll('_', ' ')} • {project.buildMode}</span><h3>{project.title}</h3><p>{project.riskNote}</p></div>
            <dl><div><dt>Capital</dt><dd>{formatMoney(project.capitalCost)}</dd></div><div><dt>Run rate</dt><dd>{formatMoney(project.weeklyOperatingCostDelta)}/wk</dd></div><div><dt>Debt</dt><dd>{project.technicalDebtDelta >= 0 ? '+' : ''}{project.technicalDebtDelta}</dd></div><div><dt>{project.status === 'COMPLETED' ? 'Completed' : 'Ready'}</dt><dd>Week {project.completedAtAbsoluteWeek || project.readyAtAbsoluteWeek}</dd></div></dl>
          </article>
        ))}
        {!player.ownedStreamingPlatform.technologyProjects.length ? <div className="tech-empty-construction"><DatabaseZap size={31} /><h3>No engineering history yet.</h3><p>The first approved campus project will establish this ledger.</p></div> : null}
      </div>
    </section>
  );

  return (
    <div className="tech-campus-shell" role="dialog" aria-modal="true" aria-label="EMPIRE+ Technology Campus">
      <header className="tech-campus-topbar">
        <button type="button" onClick={onClose} aria-label="Close Technology Campus"><ArrowLeft size={20} /></button>
        <div><span>EMPIRE+ TECHNOLOGY CAMPUS</span><strong>Engineering Session • Week {campus.absoluteWeek}</strong></div>
        <div><small>PLATFORM TREASURY</small><strong>{formatMoney(player.ownedStreamingPlatform.treasuryCash)}</strong></div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>
      <main className="tech-campus-main">
        <StreamingVisualScene
          sceneId="noc"
          className="tech-campus-scene"
          eyebrow="TECHNOLOGY CAMPUS"
          title={activeProject ? `${activeProject.title} is under construction.` : 'Build the systems viewers never see—but always feel.'}
          description="Capacity, quality, reliability, intelligence, security and content operations evolve through physical projects."
          status={{
            label: activeProject ? `${weeksRemaining} game weeks remaining` : `${campus.completedProjectCount} projects installed`,
            detail: `${campus.availableEngineeringStaff} engineering staff • ${campus.technicalDebt} technical debt`,
            tone: activeProject ? 'warning' : campus.technicalDebt >= 20 ? 'critical' : 'active',
          }}
          hotspots={[
            { id: 'campus', label: 'Campus Map', status: 'Six facilities', x: 20, y: 43, tone: 'active', icon: <Network size={16} /> },
            { id: 'construction', label: 'Construction Bay', status: activeProject ? `${weeksRemaining} weeks left` : 'Available', x: 51, y: 29, tone: activeProject ? 'warning' : 'success', icon: <HardHat size={16} /> },
            { id: 'ledger', label: 'Engineering Ledger', status: `${campus.completedProjectCount} installed`, x: 81, y: 44, tone: 'neutral', icon: <CircuitBoard size={16} /> },
          ]}
          onHotspotSelect={hotspot => dispatch(hotspot.id === 'campus' ? { type: 'OPEN_CAMPUS' } : hotspot.id === 'construction' ? { type: 'OPEN_CONSTRUCTION' } : { type: 'OPEN_LEDGER' })}
        />

        <nav className="tech-campus-tabs" aria-label="Technology Campus sections">
          <button type="button" className={ui.view === 'CAMPUS' || ui.view === 'LAB' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_CAMPUS' })}><CloudCog size={17} /><span>Campus Map<small>Six engineering facilities</small></span></button>
          <button type="button" className={ui.view === 'CONSTRUCTION' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_CONSTRUCTION' })}><HardHat size={17} /><span>Construction<small>{activeProject ? `${weeksRemaining} weeks remaining` : 'Bay available'}</small></span></button>
          <button type="button" className={ui.view === 'LEDGER' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_LEDGER' })}><CircuitBoard size={17} /><span>Engineering Ledger<small>{campus.completedProjectCount} installed</small></span></button>
        </nav>

        {!campus.available ? (
          <section className="tech-campus-locked">
            <ServerCog size={38} />
            <span>CAMPUS OFFLINE</span>
            <h2>The delivery stack must be operating first.</h2>
            <p>Complete the existing infrastructure build in game weeks. Technology Campus does not bypass construction readiness.</p>
            <button type="button" onClick={onOpenInfrastructure}>Open infrastructure control</button>
          </section>
        ) : ui.view === 'CAMPUS' ? renderCampus() : ui.view === 'LAB' ? renderLab() : ui.view === 'CONSTRUCTION' ? renderConstruction() : renderLedger()}

        {campus.available && !campus.ctoActive ? (
          <aside className="tech-campus-cto-note">
            <Gauge size={21} />
            <div><strong>Founder engineering authority is active.</strong><p>Tier 1–2 projects remain available. Frontier Tier 3–4 research requires an appointed CTO.</p></div>
            <button type="button" onClick={onOpenCompany}>Open Company Office <ChevronRight size={16} /></button>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
