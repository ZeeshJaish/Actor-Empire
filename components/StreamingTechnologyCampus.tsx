import { useMemo, useReducer, useState, type CSSProperties, type Key } from 'react';
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
  FlaskConical,
  HardHat,
  Layers3,
  LockKeyhole,
  Microscope,
  Network,
  RadioTower,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Scale,
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
import {
  STREAMING_RESEARCH_LIFECYCLE_LABELS,
  chooseStreamingResearchIpStrategy,
  getImmersionCoolingCompatibleFacilities,
  getStreamingResearchPortfolio,
  installStreamingLocalizationCapability,
  installStreamingResearchInFacility,
  startStreamingResearchProgram,
  type StreamingResearchProgramView,
} from '../services/streamingResearchLifecycle';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-technology-campus.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenCompany?: () => void;
  onOpenInfrastructure?: () => void;
  onOpenProduct?: () => void;
  onOpenCampusConstruction?: () => void;
}

type CampusView = 'RESEARCH' | 'CAMPUS' | 'LAB' | 'CONSTRUCTION' | 'LEDGER';

interface CampusUiState {
  view: CampusView;
  branch: StreamingTechnologyCampusBranch;
  selectedDefinitionId: string | null;
  buildMode: StreamingTechnologyBuildMode;
  feedback: string;
}

type CampusUiAction =
  | { type: 'OPEN_CAMPUS' }
  | { type: 'OPEN_RESEARCH' }
  | { type: 'OPEN_BRANCH'; branch: StreamingTechnologyCampusBranch }
  | { type: 'OPEN_CONSTRUCTION' }
  | { type: 'OPEN_LEDGER' }
  | { type: 'SELECT_PROJECT'; definitionId: string }
  | { type: 'SET_BUILD_MODE'; buildMode: StreamingTechnologyBuildMode }
  | { type: 'FEEDBACK'; feedback: string };

const reducer = (state: CampusUiState, action: CampusUiAction): CampusUiState => {
  if (action.type === 'OPEN_CAMPUS') return { ...state, view: 'CAMPUS', feedback: '' };
  if (action.type === 'OPEN_RESEARCH') return { ...state, view: 'RESEARCH', feedback: '' };
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
  onOpenProduct,
  onOpenCampusConstruction,
}: Props) {
  const campus = useMemo(() => getStreamingTechnologyCampus(player), [player]);
  const researchPortfolio = useMemo(() => getStreamingResearchPortfolio(player), [player]);
  const defaultBranch = campus.facilities.find(facility => facility.nextNode?.status === 'AVAILABLE')?.definition.id
    || 'DELIVERY_CAPACITY';
  const [ui, dispatch] = useReducer(reducer, {
    view: campus.activeProject ? 'CONSTRUCTION' : 'RESEARCH',
    branch: defaultBranch,
    selectedDefinitionId: null,
    buildMode: 'BALANCED',
    feedback: '',
  });
  const [selectedResearchId, setSelectedResearchId] = useState(
    researchPortfolio.activeProgram?.definitionId || researchPortfolio.programs[0]?.definition.id || '',
  );
  const [facilityTargetId, setFacilityTargetId] = useState('');
  const selectedFacility = campus.facilities.find(facility => facility.definition.id === ui.branch) || campus.facilities[0];
  const selectedNode = selectedFacility?.nodes.find(node => node.definition.id === ui.selectedDefinitionId)
    || selectedFacility?.nextNode
    || null;
  const preview = selectedNode ? previewStreamingTechnologyProject(selectedNode.definition, ui.buildMode) : null;
  const activeProject = campus.activeProject;
  const weeksRemaining = activeProject ? Math.max(0, activeProject.readyAtAbsoluteWeek - campus.absoluteWeek) : 0;
  const selectedResearch = researchPortfolio.programs.find(item => item.definition.id === selectedResearchId)
    || researchPortfolio.programs[0]
    || null;
  const compatibleFacilities = useMemo(
    () => getImmersionCoolingCompatibleFacilities(player.ownedStreamingPlatform),
    [player.ownedStreamingPlatform],
  );

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

  const startResearch = () => {
    if (!selectedResearch) return;
    const result = startStreamingResearchProgram(player, selectedResearch.definition.id, ui.buildMode);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'This research program cannot begin yet.' });
      return;
    }
    onUpdatePlayer(result.player);
  };

  const chooseIp = (strategy: 'PATENT' | 'LICENSE') => {
    if (!selectedResearch) return;
    const result = chooseStreamingResearchIpStrategy(player, selectedResearch.definition.id, strategy);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'IP clearance is not available yet.' });
      return;
    }
    onUpdatePlayer(result.player);
  };

  const installInFacility = () => {
    if (!selectedResearch) return;
    const targetId = facilityTargetId || compatibleFacilities[0]?.id;
    if (!targetId) {
      dispatch({ type: 'FEEDBACK', feedback: 'Commission a compatible private facility before installing immersion cooling.' });
      return;
    }
    const result = installStreamingResearchInFacility(player, selectedResearch.definition.id, targetId);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'This installation cannot begin yet.' });
      return;
    }
    onUpdatePlayer(result.player);
  };

  const installLocalizationCapability = () => {
    if (!selectedResearch) return;
    const result = installStreamingLocalizationCapability(player, selectedResearch.definition.id);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'This localization installation cannot begin yet.' });
      return;
    }
    onUpdatePlayer(result.player);
  };

  const openResearchInstallation = (item: StreamingResearchProgramView) => {
    if (item.definition.mappedTechnologyId) {
      const target = campus.facilities.flatMap(facility => facility.nodes.map(node => ({ facility, node })))
        .find(candidate => candidate.node.definition.id === item.definition.mappedTechnologyId);
      if (target) {
        dispatch({ type: 'OPEN_BRANCH', branch: target.facility.definition.id });
        dispatch({ type: 'SELECT_PROJECT', definitionId: target.node.definition.id });
      }
      return;
    }
    if (item.definition.mappedProductLineId) onOpenProduct?.();
  };

  const researchStageIndex = (stage: StreamingResearchProgramView['status']): number => {
    if (stage === 'RESEARCHING') return 0;
    if (stage === 'PROTOTYPING') return 1;
    if (stage === 'TESTING') return 2;
    if (stage === 'AWAITING_IP') return 3;
    if (stage === 'READY_TO_INSTALL' || stage === 'INSTALLING') return 4;
    if (stage === 'OPERATING') return 5;
    return -1;
  };

  const renderResearch = () => {
    if (!selectedResearch) return null;
    const { definition, program, status, blockers } = selectedResearch;
    const currentStageIndex = researchStageIndex(status);
    const waitingForIp = program?.stage === 'AWAITING_IP';
    const readyToInstall = program?.stage === 'READY_TO_INSTALL';
    const canStart = status === 'AVAILABLE';
    const weeksToStage = program && ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'INSTALLING'].includes(program.stage)
      ? Math.max(0, program.stageReadyAtAbsoluteWeek - campus.absoluteWeek)
      : null;
    return (
      <section className="tech-research-lab">
        <header>
          <div><span>R&D PORTFOLIO</span><h2>Seven disciplines. Six accountable stages.</h2></div>
          <p>Research creates a tested possibility. IP clearance, installation capital and an exact operating target remain separate decisions.</p>
        </header>
        <div className="tech-research-layout">
          <div className="tech-research-catalog" aria-label="Research categories">
            {researchPortfolio.programs.map(item => (
              <button
                type="button"
                key={item.definition.id}
                className={`${selectedResearch.definition.id === item.definition.id ? 'is-selected' : ''} is-${String(item.status).toLowerCase()}`}
                style={{ '--research-accent': item.definition.accent } as CSSProperties}
                onClick={() => { setSelectedResearchId(item.definition.id); dispatch({ type: 'FEEDBACK', feedback: '' }); }}
              >
                <span><FlaskConical size={16} /> {item.definition.categoryLabel}</span>
                <strong>{item.definition.title}</strong>
                <small>{item.program ? item.program.stage.replaceAll('_', ' ') : item.status === 'AVAILABLE' ? 'Ready for research' : 'Pipeline occupied'}</small>
              </button>
            ))}
          </div>
          <article className="tech-research-brief" style={{ '--research-accent': definition.accent } as CSSProperties}>
            <header>
              <div><span>{definition.codename} · {definition.categoryLabel}</span><h3>{definition.title}</h3><p>{definition.description}</p></div>
              <Microscope size={31} />
            </header>
            <ol className="tech-research-lifecycle" aria-label="Research lifecycle">
              {STREAMING_RESEARCH_LIFECYCLE_LABELS.map((label, index) => (
                <li key={label} className={index < currentStageIndex ? 'is-complete' : index === currentStageIndex ? 'is-current' : ''}>
                  <i>{index < currentStageIndex ? <BadgeCheck size={14} /> : index + 1}</i><span>{label}</span>
                </li>
              ))}
            </ol>
            <div className="tech-research-outcomes">
              <div><span>UNLOCKS</span><strong>{definition.unlockSummary}</strong></div>
              <div><span>INSTALLED IN</span><strong>{program?.installationTargetLabel || definition.installationLocation}</strong></div>
              <div><span>GAMEPLAY CHANGE</span><strong>{definition.gameplayChange}</strong></div>
            </div>
            {!program ? (
              <>
                <div className="tech-build-modes tech-research-modes">
                  <span>RESEARCH DOCTRINE</span>
                  {([
                    ['HARDENED', 'Hardened', 'Slower verification, lower rival heat'],
                    ['BALANCED', 'Balanced', 'Designed cost, schedule and exposure'],
                    ['SPRINT', 'Sprint', 'Faster start, higher cost and attention'],
                  ] as const).map(([id, label, copy]) => (
                    <button type="button" key={id} className={ui.buildMode === id ? 'is-selected' : ''} onClick={() => dispatch({ type: 'SET_BUILD_MODE', buildMode: id })}>
                      <strong>{label}</strong><small>{copy}</small>
                    </button>
                  ))}
                </div>
                <div className="tech-research-costs">
                  <span>Research only <strong>{formatMoney(definition.researchCost)}</strong></span>
                  <span>Later installation <strong>{definition.installationCost ? formatMoney(definition.installationCost) : 'Phase 8 budget'}</strong></span>
                </div>
                <button type="button" className="tech-research-primary" disabled={!canStart} onClick={startResearch}><FlaskConical size={17} /> Start research</button>
              </>
            ) : waitingForIp ? (
              <div className="tech-ip-choice">
                <div><Scale size={19} /><span>Testing passed. Choose how the company controls this knowledge.</span></div>
                <button type="button" onClick={() => chooseIp('PATENT')}><strong>Patent</strong><small>{formatMoney(program.patentCost)} · stronger advantage · more rival interest</small></button>
                <button type="button" onClick={() => chooseIp('LICENSE')}><strong>License</strong><small>{formatMoney(Math.round(program.patentCost * .25))} now · {formatMoney(program.licenseWeeklyCost)}/wk after operation</small></button>
              </div>
            ) : readyToInstall ? (
              <div className="tech-install-handoff">
                <strong>Research complete. Installation has not happened.</strong>
                {definition.installTargetType === 'FACILITY' ? (
                  <>
                    <label htmlFor="research-facility-target">Commissioned facility</label>
                    <select id="research-facility-target" value={facilityTargetId || compatibleFacilities[0]?.id || ''} onChange={event => setFacilityTargetId(event.target.value)}>
                      {!compatibleFacilities.length ? <option value="">No compatible private facility</option> : null}
                      {compatibleFacilities.map(facility => <option key={facility.id} value={facility.id}>{facility.cityId} · {facility.type.replaceAll('_', ' ')}</option>)}
                    </select>
                    <button type="button" className="tech-research-primary" disabled={Boolean(blockers.length)} onClick={installInFacility}><Wrench size={17} /> Install for {formatMoney(program.installationCost)}</button>
                  </>
                ) : definition.installTargetType === 'LOCALIZATION_CAPABILITY' ? (
                  <button type="button" className="tech-research-primary" disabled={Boolean(blockers.length)} onClick={installLocalizationCapability}>
                    <Wrench size={17} /> Install for {formatMoney(program.installationCost)}
                  </button>
                ) : definition.installTargetType === 'CONSTRUCTION_PROGRAM' ? (
                  <button type="button" className="tech-research-primary" onClick={onOpenCampusConstruction}>
                    <HardHat size={17} /> Open Giga Campus construction <ChevronRight size={17} />
                  </button>
                ) : (
                  <button type="button" className="tech-research-primary" disabled={Boolean(blockers.length)} onClick={() => openResearchInstallation(selectedResearch)}>
                    {definition.mappedProductLineId ? 'Open Product Lab' : 'Open installation blueprint'} <ChevronRight size={17} />
                  </button>
                )}
                {blockers.map(blocker => <span className="tech-install-blocker" key={blocker}><LockKeyhole size={14} /> {blocker}</span>)}
              </div>
            ) : (
              <div className="tech-research-status" role="status">
                <strong>{program.stage.replaceAll('_', ' ')}</strong>
                <span>{weeksToStage === null ? 'This program is now part of live operations.' : `${weeksToStage} game week${weeksToStage === 1 ? '' : 's'} to the next accountable stage.`}</span>
                {program.ipStrategy ? <small>{program.ipStrategy} strategy · {program.rivalInterestPercent}% rival interest</small> : null}
              </div>
            )}
            {ui.feedback ? <div className="tech-campus-feedback" role="alert">{ui.feedback}</div> : null}
          </article>
        </div>
      </section>
    );
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
          title={researchPortfolio.activeProgram ? `${researchPortfolio.activeProgram.title} is in ${researchPortfolio.activeProgram.stage.replaceAll('_', ' ').toLowerCase()}.` : activeProject ? `${activeProject.title} is under construction.` : 'Research the possibility. Install the real system.'}
          description="Build the systems viewers never see—but always feel. Seven R&D disciplines feed canonical facilities, rack groups, platform products and future construction—with no free upgrades."
          status={{
            label: activeProject ? `${weeksRemaining} game weeks remaining` : `${campus.completedProjectCount} projects installed`,
            detail: `${campus.availableEngineeringStaff} engineering staff • ${campus.technicalDebt} technical debt`,
            tone: activeProject ? 'warning' : campus.technicalDebt >= 20 ? 'critical' : 'active',
          }}
          hotspots={[
            { id: 'research', label: 'Research Pipeline', status: researchPortfolio.activeProgram ? researchPortfolio.activeProgram.stage.replaceAll('_', ' ') : 'Available', x: 16, y: 43, tone: researchPortfolio.activeProgram ? 'warning' : 'active', icon: <FlaskConical size={16} /> },
            { id: 'campus', label: 'Campus Map', status: 'Six facilities', x: 37, y: 31, tone: 'active', icon: <Network size={16} /> },
            { id: 'construction', label: 'Construction Bay', status: activeProject ? `${weeksRemaining} weeks left` : 'Available', x: 51, y: 29, tone: activeProject ? 'warning' : 'success', icon: <HardHat size={16} /> },
            { id: 'ledger', label: 'Engineering Ledger', status: `${campus.completedProjectCount} installed`, x: 81, y: 44, tone: 'neutral', icon: <CircuitBoard size={16} /> },
          ]}
          onHotspotSelect={hotspot => dispatch(hotspot.id === 'research' ? { type: 'OPEN_RESEARCH' } : hotspot.id === 'campus' ? { type: 'OPEN_CAMPUS' } : hotspot.id === 'construction' ? { type: 'OPEN_CONSTRUCTION' } : { type: 'OPEN_LEDGER' })}
        />

        <nav className="tech-campus-tabs" aria-label="Technology Campus sections">
          <button type="button" className={ui.view === 'RESEARCH' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_RESEARCH' })}><FlaskConical size={17} /><span>Research<small>Seven R&D disciplines</small></span></button>
          <button type="button" className={ui.view === 'CAMPUS' || ui.view === 'LAB' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_CAMPUS' })}><CloudCog size={17} /><span>Campus Map<small>Six engineering facilities</small></span></button>
          <button type="button" className={ui.view === 'CONSTRUCTION' ? 'is-active' : ''} onClick={() => dispatch({ type: 'OPEN_CONSTRUCTION' })}><HardHat size={17} /><span>Install & Operate<small>{activeProject ? `${weeksRemaining} weeks remaining` : 'Bay available'}</small></span></button>
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
        ) : ui.view === 'RESEARCH' ? renderResearch() : ui.view === 'CAMPUS' ? renderCampus() : ui.view === 'LAB' ? renderLab() : ui.view === 'CONSTRUCTION' ? renderConstruction() : renderLedger()}

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
