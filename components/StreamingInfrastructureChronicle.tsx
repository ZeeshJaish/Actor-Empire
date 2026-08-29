import { useMemo, useState, type CSSProperties } from 'react';
import {
    Activity,
    ArrowLeft,
    Award,
    BadgeCheck,
    BarChart3,
    Box,
    Building2,
    ChevronRight,
    CircleCheck,
    Cpu,
    Factory,
    Film,
    Gauge,
    Globe2,
    Leaf,
    LineChart,
    RadioTower,
    Server,
    ShieldCheck,
    Sparkles,
    Trophy,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import type { OwnedStreamingCinematicEvent, Player, StreamingInfrastructureProgressionTier } from '../types';
import { getStreamingInfrastructureChronicle } from '../services/streamingInfrastructureProgression';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import { StreamingLineGraph } from './streaming-analytics/StreamingGraphSystem';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-analytics.css';
import '../styles/streaming-infrastructure-chronicle.css';

interface Props {
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    onOpenIncidentCommand?: () => void;
    onOpenAnalytics?: () => void;
}

type ChronicleTab = 'EVOLUTION' | 'PERFORMANCE' | 'CINEMA' | 'BALANCE';

const formatMoney = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
};

const words = (value: string): string => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, match => match.toUpperCase());
const tierIcons: Record<StreamingInfrastructureProgressionTier, typeof Server> = {
    RENTED_CABINET: Box,
    PRIVATE_CAGE: Server,
    DEDICATED_HALL: Factory,
    OWNED_DATA_CENTRE: Building2,
    GLOBAL_HYPERSCALE_CAMPUS: Globe2,
};

const cinematicCopy: Partial<Record<OwnedStreamingCinematicEvent['type'], { kicker: string; detail: string; icon: typeof Film }>> = {
    FACILITY_OPENING: { kicker: 'A NEW BUILDING BREATHES', detail: 'Commissioning hands the keys to live operations. Racks, cooling, fibre and people now carry the audience.', icon: Building2 },
    SERVER_HALL_EVOLUTION: { kicker: 'THE FLOOR EXPANDS', detail: 'The physical network crossed into a new operating tier without transforming any existing facility.', icon: Server },
    GIGA_CAMPUS_CONSTRUCTION: { kicker: 'THE CAMPUS RISES', detail: 'A verified construction gate became part of the permanent company record.', icon: Factory },
    OPENING_NIGHT_CONTROL_ROOM: { kicker: 'THE AUDIENCE ARRIVES', detail: 'Opening-night demand passes through the exact network that was commissioned.', icon: RadioTower },
    LAUNCH_NIGHT: { kicker: 'THE AUDIENCE ARRIVES', detail: 'Opening-night demand passes through the exact network that was commissioned.', icon: RadioTower },
    PLATFORM_OUTAGE: { kicker: 'THE SIGNAL BREAKS', detail: 'Viewer traffic, infrastructure pressure and public trust collide in one operating moment.', icon: Zap },
    INFRASTRUCTURE_RECOVERY: { kicker: 'THE SIGNAL RETURNS', detail: 'Verification passed. Emergency routing can stand down and the permanent record keeps the lesson.', icon: ShieldCheck },
    PATENT_ANNOUNCEMENT: { kicker: 'THE INVENTION HAS A NAME', detail: 'Research cleared its IP gate. Installation remains a separate funded decision.', icon: Sparkles },
    RIVAL_ESPIONAGE_STORY: { kicker: 'A SHADOW CROSSES THE FLOOR', detail: 'Rival pressure reached physical operations as an abstract company event—never as a real-world attack instruction.', icon: Activity },
    INFRASTRUCTURE_AWARDS: { kicker: 'THE INDUSTRY NOTICES', detail: 'The distinction comes from measured operating evidence, not a purchasable ceremony.', icon: Trophy },
    GLOBAL_RELIABILITY_MILESTONE: { kicker: 'A GLOBAL STANDARD', detail: 'Sustained reliability turned routine execution into an empire milestone.', icon: Award },
};

export default function StreamingInfrastructureChronicle({
    player,
    onUpdatePlayer,
    onClose,
    onOpenIncidentCommand,
    onOpenAnalytics,
}: Props) {
    const chronicle = useMemo(() => getStreamingInfrastructureChronicle(player), [player]);
    const queued = chronicle.cinematics.find(event => event.status === 'QUEUED') || null;
    const [tab, setTab] = useState<ChronicleTab>('EVOLUTION');
    const [cinematicId, setCinematicId] = useState<string | null>(queued?.id || null);
    const cinematic = chronicle.cinematics.find(event => event.id === cinematicId) || null;
    const currentStage = chronicle.stages[chronicle.tierPosition];
    const CurrentIcon = tierIcons[chronicle.tier];
    const reliabilityPoints = chronicle.history.map(point => ({ absoluteWeek: point.absoluteWeek, label: `W${point.absoluteWeek}`, value: point.playbackSuccessRate, secondaryValue: point.reliabilityPercent }));
    const conditionPoints = chronicle.history.map(point => ({ absoluteWeek: point.absoluteWeek, label: `W${point.absoluteWeek}`, value: point.averageConditionPercent, secondaryValue: point.capacityUtilizationPercent }));
    const energyPoints = chronicle.history.map(point => ({ absoluteWeek: point.absoluteWeek, label: `W${point.absoluteWeek}`, value: point.energyKwhWeekly }));
    const costPoints = chronicle.history.map(point => ({ absoluteWeek: point.absoluteWeek, label: `W${point.absoluteWeek}`, value: point.weeklyOperatingCost }));

    const finishCinematic = (status: 'VIEWED' | 'DISMISSED') => {
        if (!cinematic) return;
        onUpdatePlayer({
            ...player,
            ownedStreamingPlatform: markOwnedStreamingCinematicStatus(player.ownedStreamingPlatform, cinematic.id, status),
        });
        setCinematicId(null);
    };

    const renderEvolution = () => (
        <div className="sicr-evolution">
            <section className={`sicr-tier-hero is-${chronicle.tier.toLowerCase()}`}>
                <div className="sicr-tier-art" aria-hidden="true"><i /><i /><i /><CurrentIcon /></div>
                <div>
                    <span>{currentStage.kicker}</span>
                    <h1>{currentStage.label}</h1>
                    <p>{currentStage.description}</p>
                    <dl>
                        <div><dt>Commissioned sites</dt><dd>{chronicle.latest?.facilityCount || chronicle.platform.infrastructureSetup?.facilities?.length || 0}</dd></div>
                        <div><dt>Installed racks</dt><dd>{chronicle.latest?.installedRacks || 0}</dd></div>
                        <div><dt>Reliability streak</dt><dd>{chronicle.reliabilityStreakWeeks}w</dd></div>
                        <div><dt>Infrastructure awards</dt><dd>{chronicle.awards.length}</dd></div>
                    </dl>
                </div>
            </section>

            <section className="sicr-progression" aria-label="Physical infrastructure progression">
                <div className="sicr-section-head"><div><span>PHYSICAL EVOLUTION</span><h2>Every tier is a commissioned asset.</h2></div><BadgeCheck size={24} /></div>
                <div className="sicr-stage-track">
                    {chronicle.stages.map((stage, index) => {
                        const Icon = tierIcons[stage.id];
                        return (
                            <article key={stage.id} className={`${stage.achieved ? 'is-achieved' : ''} ${stage.current ? 'is-current' : ''}`}>
                                <div className="sicr-stage-number">{String(index + 1).padStart(2, '0')}</div>
                                <div className={`sicr-stage-visual is-${stage.id.toLowerCase()}`} aria-hidden="true"><i /><i /><Icon /></div>
                                <span>{stage.kicker}</span><h3>{stage.label}</h3><p>{stage.description}</p>
                                <footer>{stage.current ? 'CURRENT NETWORK' : stage.achieved ? 'COMMISSIONED' : 'FUTURE CONSTRUCTION'}</footer>
                            </article>
                        );
                    })}
                </div>
                {chronicle.nextStage ? <div className="sicr-next-tier"><Wrench size={21} /><div><strong>Next physical tier: {chronicle.nextStage.label}</strong><p>{chronicle.nextStage.description} Research and construction unlock it; rack count alone never transforms a facility.</p></div></div> : <div className="sicr-next-tier is-complete"><Globe2 size={21} /><div><strong>The hyperscale tier is operating.</strong><p>Expansion now deepens the same physical empire rather than replacing its history.</p></div></div>}
            </section>

            <section className="sicr-awards">
                <div className="sicr-section-head"><div><span>INFRASTRUCTURE DISTINCTIONS</span><h2>Awards require operating evidence.</h2></div><Trophy size={24} /></div>
                {chronicle.awards.length ? <div>{chronicle.awards.map(award => <article key={award.id}><Award /><span>{words(award.category)}</span><h3>{award.title}</h3><p>{award.evidence}</p><footer><strong>{award.score.toFixed(0)}</strong><small>SCORE • WEEK {award.awardedAtAbsoluteWeek}</small></footer></article>)}</div> : <div className="sicr-empty"><Award size={28} /><strong>No infrastructure award has been earned yet.</strong><p>Sustained reliability, major recovery, sustainable scale and a commissioned global backbone are evaluated from weekly facts.</p></div>}
            </section>
        </div>
    );

    const renderPerformance = () => (
        <div className="sicr-performance">
            <section className="sicr-graph-panel is-wide"><div className="sicr-section-head"><div><span>RELIABILITY + PLAYBACK</span><h2>The signal viewers actually received</h2></div><RadioTower size={22} /></div><StreamingLineGraph points={reliabilityPoints} label="Weekly playback success and physical reliability" primaryLabel="Playback success" secondaryLabel="Facility reliability" valueFormatter={value => `${value.toFixed(2)}%`} tone="CYAN" /></section>
            <section className="sicr-graph-panel is-wide"><div className="sicr-section-head"><div><span>CONDITION + LOAD</span><h2>Wear against audience pressure</h2></div><Gauge size={22} /></div><StreamingLineGraph points={conditionPoints} label="Weekly facility condition and capacity utilization" primaryLabel="Condition" secondaryLabel="Capacity use" valueFormatter={value => `${value.toFixed(1)}%`} tone="AMBER" /></section>
            <section className="sicr-graph-panel"><div className="sicr-section-head"><div><span>ENERGY</span><h2>Physical consumption</h2></div><Zap size={22} /></div><StreamingLineGraph points={energyPoints} label="Weekly infrastructure energy use" primaryLabel="kWh / week" valueFormatter={value => `${Math.round(value).toLocaleString()} kWh`} tone="GREEN" /></section>
            <section className="sicr-graph-panel"><div className="sicr-section-head"><div><span>OPERATING COST</span><h2>Network cash commitment</h2></div><BarChart3 size={22} /></div><StreamingLineGraph points={costPoints} label="Weekly commissioned infrastructure operating cost" primaryLabel="Cost / week" valueFormatter={formatMoney} tone="VIOLET" /></section>
            <section className="sicr-causality is-wide"><div className="sicr-section-head"><div><span>CAUSAL EXPLANATIONS</span><h2>Why the graph moved</h2></div><LineChart size={22} /></div><div>{chronicle.causalExplanations.map(item => <article key={item.id} className={`is-${item.tone.toLowerCase()}`}><i /><div><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></div></article>)}</div>{onOpenAnalytics ? <button type="button" onClick={onOpenAnalytics}>Open full company analytics <ChevronRight size={16} /></button> : null}</section>
        </div>
    );

    const renderCinema = () => (
        <section className="sicr-cinema-library">
            <div className="sicr-section-head"><div><span>VERIFIED CINEMA ARCHIVE</span><h2>Every scene points to a company fact.</h2></div><Film size={24} /></div>
            {chronicle.cinematics.length ? <div>{chronicle.cinematics.map(event => { const copy = cinematicCopy[event.type] || { kicker: words(event.type), detail: 'This scene was derived from the permanent company record.', icon: Film }; const Icon = copy.icon; return <article key={event.id} className={`is-${event.status.toLowerCase()}`}><div><Icon /></div><span>{copy.kicker}</span><h3>{event.title}</h3><p>{copy.detail}</p><footer><small>WEEK {event.availableAtAbsoluteWeek} • {event.status}</small><button type="button" onClick={() => setCinematicId(event.id)}>Replay scene <ChevronRight size={14} /></button></footer></article>; })}</div> : <div className="sicr-empty"><Film size={28} /><strong>The cinema archive is waiting for operating history.</strong><p>Facility openings, patents, construction gates, outages, recoveries and awards will appear here.</p></div>}
        </section>
    );

    const renderBalance = () => (
        <div className="sicr-balance">
            <section className="sicr-pressure-card">
                <div className="sicr-pressure-ring" style={{ '--pressure': `${chronicle.balance.pressureScore * 3.6}deg` } as CSSProperties}><span><strong>{chronicle.balance.pressureScore.toFixed(0)}</strong><small>{chronicle.balance.pressureLabel}</small></span></div>
                <div><span>DIFFICULTY FROM REAL OPERATIONS</span><h2>{chronicle.balance.pressureLabel.toLowerCase()} infrastructure pressure</h2><p>{chronicle.balance.explanation}</p>{onOpenIncidentCommand ? <button type="button" onClick={onOpenIncidentCommand}>Open Live Operations <ChevronRight size={16} /></button> : null}</div>
            </section>
            <section className="sicr-balance-grid">
                <article><Cpu /><span>ECONOMY BALANCE</span><h3>{formatMoney(chronicle.balance.weeklyCost)} / week</h3><p>Facility contracts, utilities, maintenance and physical upgrades remain company costs. Insurance is added separately by Live Operations.</p></article>
                <article><Leaf /><span>ENERGY BALANCE</span><h3>{Math.round(chronicle.balance.energyPerRack).toLocaleString()} kWh / rack</h3><p>Rack duties, power draw and cooling configuration determine energy. Sustainability score: {chronicle.balance.sustainabilityScore}/100.</p></article>
                <article><Gauge /><span>LOAD BALANCE</span><h3>{chronicle.latest?.capacityUtilizationPercent.toFixed(0) || '0'}% utilization</h3><p>Audience demand uses incident-adjusted burst capacity. Spare headroom protects opening nights and regional failures.</p></article>
            </section>
            <section className="sicr-locked-rules"><div className="sicr-section-head"><div><span>FINAL BALANCE CONTRACT</span><h2>The ten-phase rules remain locked.</h2></div><ShieldCheck size={24} /></div><ul><li><CircleCheck /> Assisted and Hands-On use one simulation.</li><li><CircleCheck /> Rack groups own network duties.</li><li><CircleCheck /> Facilities never transform automatically.</li><li><CircleCheck /> Research unlocks; installation still costs money.</li><li><CircleCheck /> Weekly demand and launch markets remain canonical.</li></ul>{chronicle.balance.limitingFactors.length ? <div><strong>Current physical limits</strong>{chronicle.balance.limitingFactors.map(item => <span key={item}>{item}</span>)}</div> : <div className="is-clear"><BadgeCheck /><strong>No physical system is currently limiting commissioned capacity.</strong></div>}</section>
        </div>
    );

    return (
        <AccessibleDialog className="sicr-overlay" role="dialog" aria-labelledby="sicr-title" onEscape={onClose}>
            <div className="sicr-shell">
                <header className="sicr-topbar"><button type="button" onClick={onClose} aria-label="Close Infrastructure Chronicle"><ArrowLeft /></button><div><span>EMPIRE+ INFRASTRUCTURE</span><strong id="sicr-title">Infrastructure Chronicle</strong></div><aside><small>CURRENT PHYSICAL TIER</small><strong>{currentStage.label}</strong></aside><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
                <nav className="sicr-tabs" aria-label="Infrastructure Chronicle sections">{([{ id: 'EVOLUTION', label: 'Evolution', icon: Building2 }, { id: 'PERFORMANCE', label: 'Performance', icon: LineChart }, { id: 'CINEMA', label: 'Cinema', icon: Film }, { id: 'BALANCE', label: 'Balance', icon: Gauge }] as const).map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><Icon /><span>{item.label}</span>{item.id === 'CINEMA' && queued ? <b>1</b> : null}</button>; })}</nav>
                <main className="sicr-main">{tab === 'EVOLUTION' ? renderEvolution() : null}{tab === 'PERFORMANCE' ? renderPerformance() : null}{tab === 'CINEMA' ? renderCinema() : null}{tab === 'BALANCE' ? renderBalance() : null}</main>
            </div>
            {cinematic ? <div className={`sicr-cinematic is-${cinematic.type.toLowerCase()}`} role="alertdialog" aria-modal="true" aria-labelledby="sicr-cinematic-title"><div className="sicr-cinematic-grid" aria-hidden="true">{[0, 1, 2, 3, 4].map(index => <i key={index} />)}</div><button type="button" autoFocus onClick={() => finishCinematic('DISMISSED')} aria-label="Skip cinematic"><X /></button>{(() => { const copy = cinematicCopy[cinematic.type] || { kicker: words(cinematic.type), detail: 'A verified company moment entered the permanent record.', icon: Film }; const Icon = copy.icon; return <div className="sicr-cinematic-content"><span><Icon /></span><small>{copy.kicker}</small><h1 id="sicr-cinematic-title">{cinematic.title}</h1><p>{copy.detail}</p><div className="sicr-cinematic-sequence" aria-hidden="true"><i /><i /><i /><i /><i /></div><button type="button" onClick={() => finishCinematic('VIEWED')}>Commit moment to history <ChevronRight /></button></div>; })()}</div> : null}
        </AccessibleDialog>
    );
}
