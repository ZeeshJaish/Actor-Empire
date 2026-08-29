import { useMemo, useReducer } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Cable,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  Factory,
  HardHat,
  LandPlot,
  LockKeyhole,
  MapPin,
  Plus,
  Power,
  RadioTower,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Warehouse,
  X,
} from 'lucide-react';
import type { OwnedStreamingCampusProject, Player, StreamingCampusScale } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
  STREAMING_CAMPUS_FLOW_LABELS,
  STREAMING_CAMPUS_STAGE_ORDER,
  approveStreamingCampusStage,
  getStreamingCampusRackCeiling,
  getStreamingCampusConstruction,
  openStreamingCampusFacility,
  startStreamingCampusExpansion,
  startStreamingCampusProject,
} from '../services/streamingCampusConstruction';
import '../styles/streaming-campus-construction.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenResearch?: () => void;
  onOpenInfrastructure?: () => void;
}

interface UiState {
  selectedCityId: string;
  scale: StreamingCampusScale;
  selectedProjectId: string | null;
  feedback: string;
}

type UiAction =
  | { type: 'CITY'; cityId: string }
  | { type: 'SCALE'; scale: StreamingCampusScale }
  | { type: 'PROJECT'; projectId: string }
  | { type: 'FEEDBACK'; feedback: string };

const reducer = (state: UiState, action: UiAction): UiState => {
  if (action.type === 'CITY') return { ...state, selectedCityId: action.cityId, feedback: '' };
  if (action.type === 'SCALE') return { ...state, scale: action.scale, feedback: '' };
  if (action.type === 'PROJECT') return { ...state, selectedProjectId: action.projectId, feedback: '' };
  if (action.type === 'FEEDBACK') return { ...state, feedback: action.feedback };
  return state;
};

const money = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  return `$${Math.round(value).toLocaleString()}`;
};

const stageLabel = (project: OwnedStreamingCampusProject): string => {
  if (project.status === 'OPEN') return 'Open campus';
  if (project.status === 'READY_TO_OPEN') return 'Ready to open';
  return project.stage.replaceAll('_', ' ');
};

const currentFlowIndex = (project: OwnedStreamingCampusProject): number => {
  if (project.status === 'OPEN') return STREAMING_CAMPUS_FLOW_LABELS.length;
  if (project.status === 'READY_TO_OPEN') return STREAMING_CAMPUS_FLOW_LABELS.length - 1;
  return STREAMING_CAMPUS_STAGE_ORDER.indexOf(project.stage) + 2;
};

export default function StreamingCampusConstruction({
  player,
  onUpdatePlayer,
  onClose,
  onOpenResearch,
  onOpenInfrastructure,
}: Props) {
  const view = useMemo(() => getStreamingCampusConstruction(player), [player]);
  const [ui, dispatch] = useReducer(reducer, {
    selectedCityId: view.cities[0]?.id || '',
    scale: 'OWNED_DATA_CENTRE',
    selectedProjectId: view.activeProject?.id || view.projects.at(-1)?.id || null,
    feedback: '',
  });
  const project = view.projects.find(item => item.id === ui.selectedProjectId)
    || view.activeProject
    || view.projects.at(-1)
    || null;
  const city = view.cities.find(item => item.id === ui.selectedCityId) || view.cities[0];
  const projectCity = project ? view.cities.find(item => item.id === project.cityId) : null;
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const options = project?.id === view.activeProject?.id ? view.options : [];
  const flowIndex = project ? currentFlowIndex(project) : 0;
  const weeksRemaining = project ? Math.max(0, project.stageReadyAtAbsoluteWeek - absoluteWeek) : 0;

  const startProject = () => {
    if (!city) return;
    const result = startStreamingCampusProject(player, city.id, ui.scale);
    if (!result.changed || !result.project) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'The campus project could not begin.' });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'PROJECT', projectId: result.project.id });
    dispatch({ type: 'FEEDBACK', feedback: 'Land acquired. The permit strategy is now awaiting your approval.' });
  };

  const approveStage = (optionId: string) => {
    if (!project) return;
    const result = approveStreamingCampusStage(player, project.id, optionId);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'This construction order could not be approved.' });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'FEEDBACK', feedback: 'Construction order approved. Advance game weeks to reach the next gate.' });
  };

  const openCampus = () => {
    if (!project) return;
    const result = openStreamingCampusFacility(player, project.id);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'The campus cannot open yet.' });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'FEEDBACK', feedback: `${project.name} is now part of the live streaming network.` });
  };

  const expandCampus = () => {
    if (!project) return;
    const result = startStreamingCampusExpansion(player, project.id);
    if (!result.changed) {
      dispatch({ type: 'FEEDBACK', feedback: result.reason || 'The next building cannot start yet.' });
      return;
    }
    onUpdatePlayer(result.player);
    dispatch({ type: 'FEEDBACK', feedback: 'The next data-hall expansion is funded and scheduled.' });
  };

  return (
    <div className="campus-build-overlay" role="dialog" aria-modal="true" aria-labelledby="campus-build-title">
      <main className="campus-build-shell">
        <header className="campus-build-topbar">
          <button type="button" onClick={onClose} aria-label="Close campus construction"><ArrowLeft size={19} /> HQ</button>
          <div><span>EMPIRE+ INFRASTRUCTURE</span><strong id="campus-build-title">Owned Data Centres</strong></div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <section className="campus-build-hero">
          <div className="campus-build-hero-copy">
            <span><Sparkles size={15} /> MAJOR EMPIRE MILESTONE</span>
            <h1>Build the machines beneath the empire.</h1>
            <p>Research proves the design. You still buy land, win permits, secure power and fibre, construct halls, assign rack duties, pass commissioning, and choose when to open.</p>
          </div>
          <div className="campus-build-hero-art" aria-hidden="true">
            <i /><i /><i /><i /><b><Factory size={42} /></b>
          </div>
        </section>

        {!view.available ? (
          <section className="campus-build-lock" role="alert">
            <LockKeyhole size={29} />
            <div><h2>The operating company comes first.</h2><p>Launch EMPIRE+ and commission its foundation infrastructure before planning a private campus.</p></div>
            {onOpenInfrastructure ? <button type="button" onClick={onOpenInfrastructure}>Open Infrastructure <ChevronRight size={17} /></button> : null}
          </section>
        ) : !view.researchReady ? (
          <section className="campus-build-lock" role="alert">
            <LockKeyhole size={29} />
            <div><h2>Giga Campus research is not cleared.</h2><p>Complete research, prototype, testing and the Patent or License decision. No land or equipment is purchased during research.</p></div>
            {onOpenResearch ? <button type="button" onClick={onOpenResearch}>Open Research Campus <ChevronRight size={17} /></button> : null}
          </section>
        ) : !project ? (
          <section className="campus-build-land">
            <header><div><span>GATE 02 · LAND</span><h2>Select the first owned site.</h2></div><p>Only land is charged now. Every later system remains a separate approval.</p></header>
            <div className="campus-build-scale" aria-label="Campus scale">
              <button type="button" className={ui.scale === 'OWNED_DATA_CENTRE' ? 'is-selected' : ''} onClick={() => dispatch({ type: 'SCALE', scale: 'OWNED_DATA_CENTRE' })}>
                <Warehouse size={21} /><strong>Owned Data Centre</strong><small>Measured opening · staged expansion</small>
              </button>
              <button type="button" className={ui.scale === 'GIGA_CAMPUS' ? 'is-selected' : ''} onClick={() => dispatch({ type: 'SCALE', scale: 'GIGA_CAMPUS' })}>
                <Building2 size={21} /><strong>Giga Campus</strong><small>Hyperscale spine · multi-building future</small>
              </button>
            </div>
            <div className="campus-build-city-grid" aria-label="Construction cities">
              {view.cities.map(item => {
                const selected = city?.id === item.id;
                const landCost = ui.scale === 'GIGA_CAMPUS' ? item.gigaLandCost : item.landCost;
                return (
                  <button type="button" key={item.id} className={selected ? 'is-selected' : ''} onClick={() => dispatch({ type: 'CITY', cityId: item.id })}>
                    <span><MapPin size={16} /> {item.regionId}</span><strong>{item.name}</strong><small>{item.quality} production market</small><b>{money(landCost)} land</b>
                  </button>
                );
              })}
            </div>
            <footer>
              <div><span>PLATFORM TREASURY</span><strong>{money(player.ownedStreamingPlatform.treasuryCash)}</strong></div>
              <div><span>LAND COMMITMENT</span><strong>{money(ui.scale === 'GIGA_CAMPUS' ? city?.gigaLandCost || 0 : city?.landCost || 0)}</strong></div>
              <button type="button" onClick={startProject} disabled={!city}><LandPlot size={18} /> Acquire site</button>
            </footer>
          </section>
        ) : (
          <>
            {view.projects.length > 1 ? (
              <nav className="campus-build-project-tabs" aria-label="Campus projects">
                {view.projects.map(item => <button type="button" key={item.id} className={item.id === project.id ? 'is-selected' : ''} onClick={() => dispatch({ type: 'PROJECT', projectId: item.id })}>{item.name}</button>)}
              </nav>
            ) : null}

            <ol className="campus-build-flow" aria-label="Campus construction progress">
              {STREAMING_CAMPUS_FLOW_LABELS.map((label, index) => (
                <li key={label} className={index < flowIndex ? 'is-complete' : index === flowIndex ? 'is-current' : ''}>
                  <i>{index < flowIndex ? <BadgeCheck size={13} /> : index + 1}</i><span>{label}</span>
                </li>
              ))}
            </ol>

            <section className="campus-build-command">
              <header>
                <div><span>{project.scale.replaceAll('_', ' ')} · {projectCity?.name || project.cityId}</span><h2>{project.name}</h2><p>{stageLabel(project)} · {project.status.replaceAll('_', ' ')}</p></div>
                <div className={`campus-build-status is-${project.status.toLowerCase()}`}><HardHat size={18} /> {stageLabel(project)}</div>
              </header>
              <div className="campus-build-metrics">
                <article><CircleDollarSign size={18} /><span>Capital committed</span><strong>{money(project.capitalCommitted)}</strong></article>
                <article><Clock3 size={18} /><span>{project.status === 'OPEN' ? 'Opened' : 'Next gate'}</span><strong>{project.status === 'OPEN' ? `Week ${project.openedAtAbsoluteWeek}` : weeksRemaining ? `${weeksRemaining} weeks` : 'Decision due'}</strong></article>
                <article><Database size={18} /><span>Installed racks</span><strong>{project.installedRacks} / {project.rackCapacity || '—'}</strong></article>
                <article><ShieldCheck size={18} /><span>Disruptions absorbed</span><strong>{project.events.length}</strong></article>
              </div>

              {project.status === 'AWAITING_DECISION' ? (
                <div className="campus-build-stage-decision">
                  <header><div><span>NEXT ACCOUNTABLE GATE</span><h3>Choose the {project.stage.replaceAll('_', ' ').toLowerCase()} plan.</h3></div><p>Cost and schedule commit only after approval.</p></header>
                  <div className="campus-build-options">
                    {options.map(option => (
                      <article key={option.id} className={option.blockers.length ? 'is-locked' : ''}>
                        <header>{option.stage === 'UTILITIES' ? <Cable size={20} /> : option.stage === 'SYSTEMS' ? <Power size={20} /> : option.stage === 'RACK_INSTALLATION' ? <ServerCog size={20} /> : <HardHat size={20} />}<strong>{option.title}</strong></header>
                        <p>{option.description}</p>
                        <small>{option.consequence}</small>
                        <dl><div><dt>Capital</dt><dd>{money(option.cost)}</dd></div><div><dt>Schedule</dt><dd>{option.weeks} weeks</dd></div></dl>
                        {option.blockers.map(blocker => <span className="campus-build-blocker" key={blocker}><LockKeyhole size={13} /> {blocker}</span>)}
                        <button type="button" disabled={Boolean(option.blockers.length)} onClick={() => approveStage(option.id)}>Approve order <ChevronRight size={16} /></button>
                      </article>
                    ))}
                  </div>
                </div>
              ) : project.status === 'READY_TO_OPEN' ? (
                <div className="campus-build-opening">
                  <RadioTower size={34} /><div><span>COMMISSIONING PASSED</span><h3>The campus is dark, tested, and waiting for your order.</h3><p>No capacity or operating benefit exists until you explicitly open it.</p></div>
                  <button type="button" onClick={openCampus}><Sparkles size={18} /> Open {project.name}</button>
                </div>
              ) : project.status === 'OPEN' ? (
                <div className="campus-build-open-state">
                  <div><BadgeCheck size={32} /><span>LIVE OWNED INFRASTRUCTURE</span><h3>{project.installedRacks} commissioned racks now carry real platform duties.</h3><p>{money(project.weeklyOperatingCost)}/week · {project.staffRequired} staff · {project.hallCount} data hall{project.hallCount === 1 ? '' : 's'}</p></div>
                  <button type="button" onClick={expandCampus} disabled={project.installedRacks >= getStreamingCampusRackCeiling(project.scale) || project.expansionReadyAtAbsoluteWeek != null}><Plus size={18} /> {project.expansionReadyAtAbsoluteWeek != null ? `Expansion due week ${project.expansionReadyAtAbsoluteWeek}` : project.installedRacks >= getStreamingCampusRackCeiling(project.scale) ? 'Campus buildout complete' : 'Add another building'}</button>
                </div>
              ) : (
                <div className="campus-build-progress-card" role="status">
                  <div className="campus-build-progress-art" aria-hidden="true"><i /><i /><i /><Factory size={31} /></div>
                  <div><span>{project.status === 'DELAYED' ? 'RECOVERY WORK ACTIVE' : 'CONSTRUCTION IN PROGRESS'}</span><h3>{project.currentStageOptionId?.replaceAll('_', ' ')}</h3><p>{weeksRemaining} game week{weeksRemaining === 1 ? '' : 's'} to the next gate. Advance the Actor Empire week normally—there are no real-world timers or paid skips.</p></div>
                </div>
              )}

              {project.events.length ? (
                <aside className="campus-build-events">
                  <header><AlertTriangle size={17} /><strong>Construction record</strong><span>Deterministic project events</span></header>
                  {project.events.slice().reverse().map(event => (
                    <article key={event.id}><div><strong>{event.title}</strong><span>{event.stage.replaceAll('_', ' ')} · week {event.occurredAtAbsoluteWeek}</span></div><p>{event.detail}</p><b>+{event.delayWeeks} week{event.delayWeeks === 1 ? '' : 's'} · {money(event.cost)}</b></article>
                  ))}
                </aside>
              ) : null}
            </section>
          </>
        )}

        {ui.feedback ? <div className="campus-build-feedback" role="alert">{ui.feedback}</div> : null}
      </main>
    </div>
  );
}
