import { useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    ChevronRight,
    CircleCheck,
    FileSearch,
    Fingerprint,
    Gauge,
    HeartHandshake,
    Landmark,
    Network,
    RadioTower,
    Route,
    Scale,
    ServerCrash,
    ShieldCheck,
    Thermometer,
    Umbrella,
    Siren,
    UsersRound,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import type {
    PlatformId,
    Player,
    StreamingCrisisCommunication,
    StreamingCrisisCompensation,
    StreamingIncidentPolicy,
    StreamingInfrastructureInsuranceTier,
    StreamingInfrastructureResponseAction,
    StreamingMaintenanceCadence,
    StreamingShadowOperationType,
} from '../types';
import {
    STREAMING_SHADOW_OPERATIONS,
    STREAMING_TRUST_INITIATIVES,
    getStreamingCrisisResponsePreview,
    getStreamingIncidentCommand,
    launchStreamingShadowOperation,
    launchStreamingTrustInitiative,
    respondToStreamingCrisis,
    respondToStreamingRegulator,
    respondToStreamingWhistleblower,
} from '../services/streamingCrisisSecurity';
import {
    STREAMING_INFRASTRUCTURE_RESPONSE_OPTIONS,
    getStreamingInfrastructureIncidentResponsePreview,
    getStreamingInfrastructureOperations,
    performStreamingPreventiveMaintenance,
    respondToStreamingInfrastructureIncident,
    updateStreamingInfrastructureOperationsPolicy,
} from '../services/streamingInfrastructureOperations';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import AccessibleDialog from './AccessibleDialog';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-incident-command.css';
import '../styles/streaming-infrastructure-operations.css';

interface Props {
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    onOpenTechnology?: () => void;
}

type IncidentTab = 'COMMAND' | 'OPERATIONS' | 'DEFENCE' | 'SHADOW' | 'EVIDENCE' | 'OVERSIGHT';

const formatMoney = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value).toLocaleString()}`;
};

const titleCase = (value: string): string => (
    value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, match => match.toUpperCase())
);

const TRACKS = [
    { id: 'publicTrust', label: 'Public trust', icon: HeartHandshake, inverse: false },
    { id: 'evidenceTrail', label: 'Evidence trail', icon: Fingerprint, inverse: true },
    { id: 'regulatoryScrutiny', label: 'Regulatory scrutiny', icon: Scale, inverse: true },
    { id: 'employeeLoyalty', label: 'Employee loyalty', icon: UsersRound, inverse: false },
    { id: 'securityPressure', label: 'Security pressure', icon: Activity, inverse: true },
] as const;

const TABS: Array<{ id: IncidentTab; label: string; icon: typeof Siren }> = [
    { id: 'COMMAND', label: 'Command', icon: Siren },
    { id: 'OPERATIONS', label: 'Live Ops', icon: Network },
    { id: 'DEFENCE', label: 'Defence', icon: ShieldCheck },
    { id: 'SHADOW', label: 'Shadow', icon: Fingerprint },
    { id: 'EVIDENCE', label: 'Evidence', icon: FileSearch },
    { id: 'OVERSIGHT', label: 'Oversight', icon: Landmark },
];

export default function StreamingIncidentCommand({
    player,
    onUpdatePlayer,
    onClose,
    onOpenTechnology,
}: Props) {
    const command = useMemo(() => getStreamingIncidentCommand(player), [player]);
    const infrastructure = useMemo(() => getStreamingInfrastructureOperations(player), [player]);
    const platform = player.ownedStreamingPlatform;
    const activeCrisis = command.activeCrisis;
    const activeInfrastructureIncident = infrastructure.activeIncident;
    const [activeTab, setActiveTab] = useState<IncidentTab>(activeInfrastructureIncident ? 'OPERATIONS' : activeCrisis ? 'COMMAND' : 'DEFENCE');
    const [doctrine, setDoctrine] = useState<StreamingIncidentPolicy>(
        platform.leadership.delegation.incidentPolicy,
    );
    const [compensation, setCompensation] = useState<StreamingCrisisCompensation>('TARGETED');
    const [communication, setCommunication] = useState<StreamingCrisisCommunication>('FACTUAL_UPDATE');
    const [infrastructureAction, setInfrastructureAction] = useState<StreamingInfrastructureResponseAction>('REROUTE_TRAFFIC');
    const [rerouteFacilityId, setRerouteFacilityId] = useState(
        infrastructure.facilities.find(item => item.facility.id !== activeInfrastructureIncident?.facilityId)?.facility.id || '',
    );
    const [infrastructureCompensation, setInfrastructureCompensation] = useState<StreamingCrisisCompensation>('TARGETED');
    const [claimInsurance, setClaimInsurance] = useState(infrastructure.operations.insuranceTier !== 'NONE');
    const [maintenanceCadence, setMaintenanceCadence] = useState<StreamingMaintenanceCadence>(infrastructure.operations.maintenanceCadence);
    const [insuranceTier, setInsuranceTier] = useState<StreamingInfrastructureInsuranceTier>(infrastructure.operations.insuranceTier);
    const [shadowType, setShadowType] = useState<StreamingShadowOperationType>('INTELLIGENCE_PURCHASE');
    const [targetPlatformId, setTargetPlatformId] = useState<PlatformId>(
        platform.competitiveWorld.rivals[0]?.platformId || 'NETFLIX',
    );
    const [feedback, setFeedback] = useState('');
    const pendingCinematic = platform.cinematicQueue.find(event => (
        event.status === 'QUEUED'
        && ['PLATFORM_OUTAGE', 'CRISIS_EXPOSURE', 'WHISTLEBLOWER_REVEAL', 'REGULATORY_HEARING', 'SHADOW_OPERATION'].includes(event.type)
    )) || null;
    const [showCinematic, setShowCinematic] = useState(Boolean(pendingCinematic));

    const responsePreview = activeCrisis?.stage === 'DETECTED'
        ? getStreamingCrisisResponsePreview(platform, activeCrisis, doctrine, compensation, communication)
        : null;
    const infrastructureResponsePreview = activeInfrastructureIncident?.stage === 'DETECTED'
        ? getStreamingInfrastructureIncidentResponsePreview(
            platform,
            activeInfrastructureIncident,
            infrastructureAction,
            infrastructureCompensation,
            claimInsurance,
        )
        : null;
    const shadowDefinition = STREAMING_SHADOW_OPERATIONS.find(item => item.id === shadowType)!;
    const selectedRival = platform.competitiveWorld.rivals.find(item => item.platformId === targetPlatformId)
        || platform.competitiveWorld.rivals[0];

    const persistResult = (result: { changed: boolean; player: Player; reason: string }) => {
        setFeedback(result.reason);
        if (result.changed) onUpdatePlayer(result.player);
    };

    const finishCinematic = (status: 'VIEWED' | 'DISMISSED') => {
        setShowCinematic(false);
        if (!pendingCinematic) return;
        onUpdatePlayer({
            ...player,
            ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
                platform,
                pendingCinematic.id,
                status,
            ),
        });
    };

    const renderCommand = () => (
        <div className="sic-command-grid">
            <section className={`sic-active-incident ${activeCrisis ? `is-${activeCrisis.severity.toLowerCase()}` : 'is-clear'}`}>
                <div className="sic-section-heading">
                    <div>
                        <span>{activeCrisis ? `${activeCrisis.severity} INCIDENT` : 'ALL SYSTEMS MONITORED'}</span>
                        <h2>{activeCrisis?.title || 'No active crisis.'}</h2>
                    </div>
                    {activeCrisis ? <strong>{titleCase(activeCrisis.stage)}</strong> : <CircleCheck size={26} />}
                </div>
                {activeCrisis ? (
                    <>
                        <p>{activeCrisis.detail}</p>
                        <dl className="sic-incident-facts">
                            <div><dt>Detected</dt><dd>Game week {activeCrisis.detectedAtAbsoluteWeek}</dd></div>
                            <div><dt>Affected audience</dt><dd>{activeCrisis.affectedSubscribers.toLocaleString()}</dd></div>
                            <div><dt>Revenue at risk</dt><dd>{formatMoney(activeCrisis.estimatedRevenueAtRisk)}</dd></div>
                            <div><dt>Verified cause</dt><dd>{activeCrisis.cause}</dd></div>
                        </dl>
                        <div className="sic-response-timeline" aria-label="Crisis recovery stages">
                            {['Detection', 'Immediate response', 'Leadership decision', 'Public response', 'Recovery', 'Persistent consequence'].map((label, index) => {
                                const progress = activeCrisis.stage === 'DETECTED' ? 1 : activeCrisis.stage === 'RECOVERING' ? 4 : 6;
                                return <span key={label} className={index < progress ? 'is-complete' : ''}><i>{index + 1}</i><small>{label}</small></span>;
                            })}
                        </div>
                    </>
                ) : (
                    <div className="sic-clear-state">
                        <ShieldCheck size={32} />
                        <div>
                            <strong>Clean play is a competitive strategy.</strong>
                            <p>Use defensive initiatives before pressure becomes a crisis. Strong trust lowers churn and strengthens public-market resilience.</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab('DEFENCE')}>Strengthen defence <ChevronRight size={16} /></button>
                    </div>
                )}
            </section>

            {activeCrisis?.stage === 'DETECTED' ? (
                <section className="sic-response-builder">
                    <div className="sic-section-heading">
                        <div><span>LEADERSHIP DECISION</span><h2>Lock the recovery package.</h2></div>
                        <Siren size={23} />
                    </div>
                    <fieldset>
                        <legend>1. Response doctrine</legend>
                        {[
                            ['SERVICE_FIRST', 'Restore service first', 'Fastest operational recovery; transparency follows verified facts.'],
                            ['TRANSPARENT_FIRST', 'Lead with transparency', 'Stronger trust and regulator response; recovery can take longer.'],
                            ['CONTAIN_FIRST', 'Contain before speaking', 'Cheaper immediate control with a larger delayed-evidence risk.'],
                        ].map(([id, label, copy]) => (
                            <button type="button" key={id} className={doctrine === id ? 'is-selected' : ''} onClick={() => setDoctrine(id as StreamingIncidentPolicy)}>
                                <span><strong>{label}</strong><small>{copy}</small></span>{doctrine === id ? <BadgeCheck size={18} /> : null}
                            </button>
                        ))}
                    </fieldset>
                    <div className="sic-response-row">
                        <label>
                            <span>2. Viewer compensation</span>
                            <select value={compensation} onChange={event => setCompensation(event.target.value as StreamingCrisisCompensation)}>
                                <option value="NONE">No compensation</option>
                                <option value="TARGETED">Affected viewers only</option>
                                <option value="FULL">Full member credit</option>
                            </select>
                        </label>
                        <label>
                            <span>3. Public communication</span>
                            <select value={communication} onChange={event => setCommunication(event.target.value as StreamingCrisisCommunication)}>
                                <option value="HOLDING_STATEMENT">Holding statement</option>
                                <option value="FACTUAL_UPDATE">Verified factual update</option>
                                <option value="FULL_DISCLOSURE">Full disclosure</option>
                            </select>
                        </label>
                    </div>
                    {responsePreview ? (
                        <div className="sic-response-preview">
                            <div><span>Immediate commitment</span><strong>{formatMoney(responsePreview.responseCost)}</strong></div>
                            <div><span>Recovery target</span><strong>{responsePreview.recoveryWeeks} game weeks</strong></div>
                            <div><span>Trust</span><strong>{responsePreview.trustDirection}</strong></div>
                            <div><span>Regulators</span><strong>{responsePreview.scrutinyDirection}</strong></div>
                            <div><span>Evidence</span><strong>{responsePreview.evidenceDirection}</strong></div>
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="sic-primary"
                        disabled={!responsePreview || platform.treasuryCash < responsePreview.responseCost}
                        onClick={() => persistResult(respondToStreamingCrisis(player, activeCrisis.id, doctrine, compensation, communication))}
                    >
                        Fund and lock recovery <ChevronRight size={17} />
                    </button>
                    <small className="sic-truth-note">Every package has a recovery route. The difference is cost, speed and the reputation you carry afterward.</small>
                </section>
            ) : activeCrisis?.stage === 'RECOVERING' ? (
                <section className="sic-recovery-card">
                    <Gauge size={29} />
                    <span>RECOVERY IN PROGRESS</span>
                    <h2>Verification is scheduled for game week {activeCrisis.recoveryReadyAtAbsoluteWeek}.</h2>
                    <p>{activeCrisis.outcomeNote}</p>
                    <dl>
                        <div><dt>Doctrine</dt><dd>{titleCase(activeCrisis.responseDoctrine || '')}</dd></div>
                        <div><dt>Compensation</dt><dd>{titleCase(activeCrisis.compensation || '')}</dd></div>
                        <div><dt>Communication</dt><dd>{titleCase(activeCrisis.communication || '')}</dd></div>
                        <div><dt>Weekly recovery</dt><dd>{formatMoney(activeCrisis.weeklyRecoveryCost)}</dd></div>
                    </dl>
                </section>
            ) : null}
        </div>
    );

    const renderOperations = () => (
        <div className="sio-layout">
            <section className="sio-status-deck">
                <div className="sio-live-heading">
                    <span className="sio-live-pulse"><i /> LIVE INFRASTRUCTURE</span>
                    <strong>{infrastructure.managementMode.replace('_', ' ')}</strong>
                </div>
                <div className="sio-status-copy">
                    <div>
                        <span>NETWORK OPERATIONS CENTRE</span>
                        <h2>{activeInfrastructureIncident?.title || 'The network is carrying live business.'}</h2>
                        <p>{activeInfrastructureIncident?.detail || 'Facility condition, maintenance windows, physical limits and emergency routing continue every game week.'}</p>
                    </div>
                    <dl>
                        <div><dt>Fleet condition</dt><dd>{infrastructure.averageCondition.toFixed(0)}%</dd></div>
                        <div><dt>Commissioned sites</dt><dd>{infrastructure.facilities.length}</dd></div>
                        <div><dt>Insurance / week</dt><dd>{formatMoney(infrastructure.weeklyInsurancePremium)}</dd></div>
                        <div><dt>Rival copy signals</dt><dd>{infrastructure.rivalCopySignals}</dd></div>
                    </dl>
                </div>
            </section>

            {activeInfrastructureIncident ? (
                <section className={`sio-incident is-${activeInfrastructureIncident.severity.toLowerCase()}`}>
                    <div className="sio-section-title">
                        <div><span>{activeInfrastructureIncident.severity} • {titleCase(activeInfrastructureIncident.type)}</span><h2>Emergency traffic command</h2></div>
                        {activeInfrastructureIncident.type === 'COOLING_INCIDENT' ? <Thermometer size={25} /> : activeInfrastructureIncident.type === 'POWER_FAILURE' ? <Zap size={25} /> : <ServerCrash size={25} />}
                    </div>
                    <dl className="sio-incident-metrics">
                        <div><dt>Facility</dt><dd>{infrastructure.facilities.find(item => item.facility.id === activeInfrastructureIncident.facilityId)?.name || activeInfrastructureIncident.cityId}</dd></div>
                        <div><dt>Capacity offline</dt><dd>{activeInfrastructureIncident.capacityLossPercent.toFixed(0)}%</dd></div>
                        <div><dt>Viewers affected</dt><dd>{activeInfrastructureIncident.affectedSubscribers.toLocaleString()}</dd></div>
                        <div><dt>Stage</dt><dd>{titleCase(activeInfrastructureIncident.stage)}</dd></div>
                    </dl>
                    <div className="sio-reaction-grid">
                        <article><span>PUBLIC REACTION</span><p>{activeInfrastructureIncident.publicReaction}</p></article>
                        <article><span>SUBSCRIBER REACTION</span><p>{activeInfrastructureIncident.subscriberReaction}</p></article>
                    </div>
                    <p className="sio-cause"><strong>Verified operating cause:</strong> {activeInfrastructureIncident.cause}</p>

                    {activeInfrastructureIncident.stage === 'DETECTED' ? (
                        <div className="sio-response-console">
                            <fieldset>
                                <legend>1. Choose the emergency response</legend>
                                <div className="sio-response-options">
                                    {STREAMING_INFRASTRUCTURE_RESPONSE_OPTIONS.map(option => (
                                        <button type="button" key={option.id} className={infrastructureAction === option.id ? 'is-selected' : ''} onClick={() => setInfrastructureAction(option.id)}>
                                            <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                                            {infrastructureAction === option.id ? <BadgeCheck size={18} /> : null}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="sio-response-controls">
                                {infrastructureAction === 'REROUTE_TRAFFIC' ? (
                                    <label><span>2. Emergency route</span><select value={rerouteFacilityId} onChange={event => setRerouteFacilityId(event.target.value)}>
                                        <option value="">Choose another facility</option>
                                        {infrastructure.facilities.filter(item => item.facility.id !== activeInfrastructureIncident.facilityId).map(item => <option key={item.facility.id} value={item.facility.id}>{item.name} • {item.view.state.maintenanceConditionPercent.toFixed(0)}% condition</option>)}
                                    </select></label>
                                ) : null}
                                <label><span>{infrastructureAction === 'REROUTE_TRAFFIC' ? '3' : '2'}. Viewer compensation</span><select value={infrastructureCompensation} onChange={event => setInfrastructureCompensation(event.target.value as StreamingCrisisCompensation)}>
                                    <option value="NONE">No compensation</option><option value="TARGETED">Affected viewers</option><option value="FULL">Full member credit</option>
                                </select></label>
                                <label className="sio-insurance-toggle"><input type="checkbox" checked={claimInsurance} disabled={infrastructure.operations.insuranceTier === 'NONE'} onChange={event => setClaimInsurance(event.target.checked)} /><span>Claim {titleCase(infrastructure.operations.insuranceTier)} insurance</span></label>
                            </div>
                            {infrastructureResponsePreview ? (
                                <div className="sio-cost-preview">
                                    <div><span>Gross response</span><strong>{formatMoney(infrastructureResponsePreview.grossCost)}</strong></div>
                                    <div><span>Insurance recovery</span><strong>-{formatMoney(infrastructureResponsePreview.insuranceRecovery)}</strong></div>
                                    <div><span>Net treasury cost</span><strong>{formatMoney(infrastructureResponsePreview.netCost)}</strong></div>
                                    <div><span>Capacity pressure mitigated</span><strong>{infrastructureResponsePreview.restoredCapacityPercent}%</strong></div>
                                    <small>Recovery verification: {infrastructureResponsePreview.recoveryWeeks} game week{infrastructureResponsePreview.recoveryWeeks === 1 ? '' : 's'}. Insurance and compensation are included above.</small>
                                </div>
                            ) : null}
                            <button
                                type="button"
                                className="sio-lock-response"
                                disabled={infrastructureAction === 'REROUTE_TRAFFIC' && !rerouteFacilityId}
                                onClick={() => persistResult(respondToStreamingInfrastructureIncident(player, activeInfrastructureIncident.id, infrastructureAction, rerouteFacilityId || null, infrastructureCompensation, claimInsurance))}
                            >Lock emergency response <Route size={17} /></button>
                        </div>
                    ) : (
                        <div className="sio-recovery">
                            <Gauge size={27} />
                            <div><span>FUNDED RECOVERY</span><h3>{titleCase(activeInfrastructureIncident.responseAction || 'Recovery')}</h3><p>{activeInfrastructureIncident.outcomeNote}</p></div>
                            <dl><div><dt>Verification week</dt><dd>{activeInfrastructureIncident.recoveryReadyAtAbsoluteWeek}</dd></div><div><dt>Net cost</dt><dd>{formatMoney(activeInfrastructureIncident.responseCost - activeInfrastructureIncident.insuranceRecovery)}</dd></div></dl>
                        </div>
                    )}
                </section>
            ) : null}

            <div className="sio-work-grid">
                <section className="sio-fleet">
                    <div className="sio-section-title"><div><span>PHYSICAL FLEET</span><h2>Maintenance windows</h2></div><Wrench size={23} /></div>
                    <div className="sio-facility-list">
                        {infrastructure.facilities.map(item => {
                            const condition = item.view.state.maintenanceConditionPercent;
                            return (
                                <article key={item.facility.id} className={item.overdue || condition < 70 ? 'is-warning' : ''}>
                                    <div className="sio-facility-heading"><div><span>{titleCase(item.facility.type)}</span><h3>{item.name}</h3></div><strong>{condition.toFixed(0)}%</strong></div>
                                    <div className="sio-condition" aria-label={`${item.name} condition ${condition.toFixed(0)} percent`}><i style={{ width: `${condition}%` }} /></div>
                                    <dl>
                                        <div><dt>Rack groups</dt><dd>{item.facility.rackGroups?.length || 0}</dd></div>
                                        <div><dt>Limit</dt><dd>{titleCase(item.view.limitingFactor)}</dd></div>
                                        <div><dt>Backup</dt><dd>{item.view.backupCoveragePercent.toFixed(0)}%</dd></div>
                                        <div><dt>Maintenance</dt><dd>{item.overdue ? 'OVERDUE' : `Week ${item.nextMaintenanceWeek}`}</dd></div>
                                    </dl>
                                    <button type="button" onClick={() => persistResult(performStreamingPreventiveMaintenance(player, item.facility.id))}>Run maintenance • {formatMoney(item.maintenanceCost)} <Wrench size={15} /></button>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <aside className="sio-policy">
                    <div className="sio-section-title"><div><span>OPERATING POLICY</span><h2>Maintenance + insurance</h2></div><Umbrella size={23} /></div>
                    <p>Assisted Management follows these rules only inside its existing budget and approval thresholds. Hands-On Management leaves emergency decisions to you.</p>
                    <label><span>Maintenance cadence</span><select value={maintenanceCadence} onChange={event => setMaintenanceCadence(event.target.value as StreamingMaintenanceCadence)}><option value="PREVENTIVE">Preventive • every 4 weeks</option><option value="BALANCED">Balanced • every 8 weeks</option><option value="REACTIVE">Reactive • every 14 weeks</option></select></label>
                    <label><span>Infrastructure insurance</span><select value={insuranceTier} onChange={event => setInsuranceTier(event.target.value as StreamingInfrastructureInsuranceTier)}><option value="NONE">None • $0 / week</option><option value="STANDARD">Standard • $240K / week</option><option value="PREMIUM">Premium • $640K / week</option></select></label>
                    <button type="button" onClick={() => persistResult(updateStreamingInfrastructureOperationsPolicy(player, maintenanceCadence, insuranceTier))}>Save operations policy</button>
                    <small>Insurance premiums enter the canonical weekly cash result. Claims reduce emergency response cost; they do not create free cash.</small>
                </aside>
            </div>

            <section className="sio-history">
                <div className="sio-section-title"><div><span>OPERATING RECORD</span><h2>Recent facility incidents</h2></div><FileSearch size={23} /></div>
                {infrastructure.recentIncidents.length ? infrastructure.recentIncidents.map(incident => (
                    <article key={incident.id}><i className={`is-${incident.severity.toLowerCase()}`} /><div><span>WEEK {incident.detectedAtAbsoluteWeek} • {titleCase(incident.type)}</span><h3>{incident.title}</h3><p>{titleCase(incident.stage)} • {incident.outcomeNote || incident.subscriberReaction}</p></div></article>
                )) : <div className="sio-empty"><CircleCheck size={27} /><div><strong>No facility incident has entered the record.</strong><p>Weekly deterioration and maintenance are still active.</p></div></div>}
            </section>
        </div>
    );

    const renderDefence = () => (
        <div className="sic-defence-layout">
            <section className="sic-defence-hero">
                <div><span>SECURITY POSTURE</span><h2>Build advantage before impact.</h2><p>Technology reduces incident probability. Clean initiatives repair the human, regulatory and public layers that servers cannot.</p></div>
                <dl>
                    <div><dt>Security maturity</dt><dd>Level {command.securityLevel}</dd></div>
                    <div><dt>Reliability maturity</dt><dd>Level {command.reliabilityLevel}</dd></div>
                    <div><dt>Open incidents</dt><dd>{activeCrisis ? 1 : 0}</dd></div>
                </dl>
                {onOpenTechnology ? <button type="button" onClick={onOpenTechnology}>Open Security Citadel <ChevronRight size={16} /></button> : null}
            </section>
            <section className="sic-initiative-grid" aria-label="Clean operating initiatives">
                {STREAMING_TRUST_INITIATIVES.map(initiative => {
                    const coolingDown = platform.crisisSecurity.trustInitiatives.some(item => (
                        item.type === initiative.id
                        && getAbsoluteWeek(player.age, player.currentWeek) - item.completedAtAbsoluteWeek < 8
                    ));
                    return (
                        <article key={initiative.id}>
                            <span>{initiative.kicker}</span>
                            <div className="sic-initiative-icon"><ShieldCheck size={21} /></div>
                            <h3>{initiative.title}</h3>
                            <p>{initiative.description}</p>
                            <div className="sic-impact-chips">
                                {initiative.publicTrustDelta ? <small>Trust {initiative.publicTrustDelta > 0 ? '+' : ''}{initiative.publicTrustDelta}</small> : null}
                                {initiative.regulatoryScrutinyDelta ? <small>Scrutiny {initiative.regulatoryScrutinyDelta}</small> : null}
                                {initiative.employeeLoyaltyDelta ? <small>Loyalty +{initiative.employeeLoyaltyDelta}</small> : null}
                                {initiative.securityPressureDelta ? <small>Pressure {initiative.securityPressureDelta}</small> : null}
                            </div>
                            <button
                                type="button"
                                disabled={coolingDown || platform.treasuryCash < initiative.cashCost}
                                onClick={() => persistResult(launchStreamingTrustInitiative(player, initiative.id))}
                            >
                                {coolingDown ? 'Benefits active' : `Fund ${formatMoney(initiative.cashCost)}`} <ChevronRight size={15} />
                            </button>
                        </article>
                    );
                })}
            </section>
        </div>
    );

    const renderShadow = () => (
        <div className="sic-shadow-layout">
            <aside className="sic-shadow-warning">
                <AlertTriangle size={24} />
                <div><strong>ABSTRACT STRATEGY ONLY</strong><p>This system contains no tools, commands, payloads, real targets or operational instructions. You are choosing a corporate risk in a fictional simulation.</p></div>
            </aside>
            <section className="sic-shadow-console">
                <div className="sic-shadow-list" role="list" aria-label="Shadow operation choices">
                    {STREAMING_SHADOW_OPERATIONS.map(operation => (
                        <button type="button" key={operation.id} className={shadowType === operation.id ? 'is-selected' : ''} onClick={() => setShadowType(operation.id)}>
                            <span><strong>{operation.title}</strong><small>{operation.description}</small></span>
                            <b>{formatMoney(operation.cashCost)}</b>
                        </button>
                    ))}
                </div>
                <div className="sic-shadow-authorization">
                    <Fingerprint size={29} />
                    <span>DELAYED EVIDENCE CONTRACT</span>
                    <h2>{shadowDefinition.title}</h2>
                    <p>{shadowDefinition.expectedImpact}</p>
                    <label>
                        <span>Target a fictional rival company</span>
                        <select value={targetPlatformId} onChange={event => setTargetPlatformId(event.target.value as PlatformId)}>
                            {platform.competitiveWorld.rivals.map(rival => (
                                <option key={rival.platformId} value={rival.platformId}>{rival.platformName} • {rival.ceoName}</option>
                            ))}
                        </select>
                    </label>
                    <dl>
                        <div><dt>Cash commitment</dt><dd>{formatMoney(shadowDefinition.cashCost)}</dd></div>
                        <div><dt>Estimated success</dt><dd>{Math.max(18, Math.round(shadowDefinition.baseSuccessPercent - (selectedRival?.technology || 0) * 1.1))}%</dd></div>
                        <div><dt>Base exposure</dt><dd>{shadowDefinition.baseExposurePercent}%</dd></div>
                        <div><dt>Evidence delay</dt><dd>3–7 game weeks</dd></div>
                    </dl>
                    <button
                        type="button"
                        className="sic-shadow-button"
                        disabled={!selectedRival || platform.treasuryCash < shadowDefinition.cashCost || command.pendingEvidenceCount > 0}
                        onClick={() => persistResult(launchStreamingShadowOperation(player, shadowType, targetPlatformId))}
                    >
                        {command.pendingEvidenceCount > 0 ? 'Evidence window already open' : 'Authorize fictional operation'} <ChevronRight size={16} />
                    </button>
                    <small>Clean play can win every objective through trust, security, content and market execution. Shadow play is optional and never required.</small>
                </div>
            </section>
        </div>
    );

    const renderEvidence = () => {
        const records = [
            ...platform.crisisSecurity.crises.map(item => ({
                id: item.id,
                week: item.detectedAtAbsoluteWeek,
                kind: 'INCIDENT',
                title: item.title,
                detail: item.stage === 'RESOLVED' ? item.outcomeNote || 'Recovered.' : `${titleCase(item.stage)} • ${item.severity}`,
                tone: item.stage === 'RESOLVED' ? 'clear' : 'risk',
            })),
            ...platform.crisisSecurity.infrastructureOperations.incidents.map(item => ({
                id: item.id,
                week: item.detectedAtAbsoluteWeek,
                kind: 'INFRASTRUCTURE',
                title: item.title,
                detail: item.stage === 'RESOLVED' ? item.outcomeNote || 'Facility recovered.' : `${titleCase(item.stage)} • ${item.severity} • ${item.subscriberReaction}`,
                tone: item.stage === 'RESOLVED' ? 'clear' : 'risk',
            })),
            ...platform.crisisSecurity.shadowOperations.map(item => ({
                id: item.id,
                week: item.committedAtAbsoluteWeek,
                kind: 'DELAYED EVIDENCE',
                title: `${titleCase(item.type)} • ${item.targetPlatformName}`,
                detail: item.status === 'EVIDENCE_PENDING'
                    ? `Attribution resolves in game week ${item.evidenceDueAtAbsoluteWeek}.`
                    : item.exposureConsequence || item.outcomeNote,
                tone: item.status === 'EXPOSED' ? 'risk' : item.status === 'CLEARED' ? 'clear' : 'pending',
            })),
            ...platform.crisisSecurity.trustInitiatives.map(item => ({
                id: item.id,
                week: item.completedAtAbsoluteWeek,
                kind: 'CLEAN OPERATION',
                title: item.title,
                detail: item.outcomeNote,
                tone: 'clear',
            })),
        ].sort((left, right) => right.week - left.week);
        return (
            <section className="sic-evidence-ledger">
                <div className="sic-section-heading">
                    <div><span>PERSISTENT COMPANY RECORD</span><h2>Evidence does not disappear when a scene ends.</h2></div>
                    <FileSearch size={24} />
                </div>
                <p>Decisions can surface several game weeks later. Every item below is a committed fact, not a random news card.</p>
                {records.length ? (
                    <div className="sic-evidence-timeline">
                        {records.map(record => (
                            <article key={`${record.kind}:${record.id}`} className={`is-${record.tone}`}>
                                <i />
                                <div><span>WEEK {record.week} • {record.kind}</span><h3>{record.title}</h3><p>{record.detail}</p></div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="sic-empty-record"><FileSearch size={30} /><strong>No crisis or evidence record yet.</strong><p>Preventive work appears here when completed.</p></div>
                )}
            </section>
        );
    };

    const renderOversight = () => {
        const openCases = platform.crisisSecurity.regulatoryCases.filter(item => item.status === 'OPEN');
        const openReports = platform.crisisSecurity.whistleblowerReports.filter(item => item.status === 'OPEN');
        return (
            <div className="sic-oversight-grid">
                <section>
                    <div className="sic-section-heading"><div><span>REGULATORY DESK</span><h2>Answer the formal record.</h2></div><Landmark size={23} /></div>
                    {openCases.length ? openCases.map(item => (
                        <article className="sic-oversight-case" key={item.id}>
                            <span>OPEN • SCRUTINY {item.scrutinyAtOpening.toFixed(0)}</span>
                            <h3>{item.title}</h3>
                            <p>Choose a funded response. Every route closes the case, with different trust and evidence consequences.</p>
                            <div>
                                <button type="button" onClick={() => persistResult(respondToStreamingRegulator(player, item.id, 'COOPERATE'))}>Cooperate • $2.4M</button>
                                <button type="button" onClick={() => persistResult(respondToStreamingRegulator(player, item.id, 'REMEDIATE'))}>Remediate • $5.5M</button>
                                <button type="button" onClick={() => persistResult(respondToStreamingRegulator(player, item.id, 'CONTEST'))}>Contest • $3.2M</button>
                            </div>
                        </article>
                    )) : <div className="sic-empty-record"><CircleCheck size={28} /><strong>No open inquiry.</strong><p>Scrutiny remains persistent and can open a formal case above the threshold.</p></div>}
                </section>
                <section>
                    <div className="sic-section-heading"><div><span>PROTECTED DISCLOSURES</span><h2>How employees are treated becomes strategy.</h2></div><UsersRound size={23} /></div>
                    {openReports.length ? openReports.map(item => (
                        <article className="sic-oversight-case is-employee" key={item.id}>
                            <span>SOURCE CONFIDENCE {item.sourceConfidence.toFixed(0)}%</span>
                            <h3>{item.title}</h3>
                            <p>{item.allegation}</p>
                            <div>
                                <button type="button" onClick={() => persistResult(respondToStreamingWhistleblower(player, item.id, 'PROTECT_AND_INVESTIGATE'))}>Protect & investigate • $2.8M</button>
                                <button type="button" onClick={() => persistResult(respondToStreamingWhistleblower(player, item.id, 'DISCLOSE'))}>Disclose • $1.8M</button>
                                <button type="button" onClick={() => persistResult(respondToStreamingWhistleblower(player, item.id, 'DISCREDIT'))}>Discredit • $900K</button>
                            </div>
                        </article>
                    )) : <div className="sic-empty-record"><CircleCheck size={28} /><strong>No open protected disclosure.</strong><p>Employee loyalty and evidence determine whether internal concerns become formal reports.</p></div>}
                </section>
            </div>
        );
    };

    return (
        <AccessibleDialog
            className="sic-overlay"
            role="dialog"
            aria-labelledby="sic-title"
            onEscape={onClose}
        >
            <div className="sic-shell">
                <header className="sic-topbar">
                    <button type="button" onClick={onClose} aria-label="Close Incident Command"><ArrowLeft size={20} /></button>
                    <div><span><RadioTower size={18} /></span><strong id="sic-title">Incident Command</strong><small>{platform.identity?.name} • TRUST & SECURITY</small></div>
                    <aside><small>COMPANY TREASURY</small><strong>{formatMoney(platform.treasuryCash)}</strong></aside>
                    <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </header>

                <StreamingVisualScene
                    sceneId="noc"
                    className="sic-scene"
                    eyebrow={activeCrisis || activeInfrastructureIncident ? 'LIVE INCIDENT BRIDGE' : 'NETWORK + TRUST OPERATIONS'}
                    title={activeCrisis?.title || activeInfrastructureIncident?.title || 'Defence is a company advantage.'}
                    description={activeCrisis || activeInfrastructureIncident
                        ? 'Technical recovery, viewer treatment, communications and the permanent record converge here.'
                        : 'Monitor the service, strengthen clean operating systems and decide what kind of company survives pressure.'}
                    status={{
                        label: activeCrisis ? `${activeCrisis.severity} • ${titleCase(activeCrisis.stage)}` : activeInfrastructureIncident ? `${activeInfrastructureIncident.severity} • ${titleCase(activeInfrastructureIncident.stage)}` : 'MONITORING',
                        detail: activeCrisis ? `${activeCrisis.affectedSubscribers.toLocaleString()} viewers affected` : activeInfrastructureIncident ? `${activeInfrastructureIncident.affectedSubscribers.toLocaleString()} viewers affected` : `Security level ${command.securityLevel}`,
                        tone: activeCrisis || activeInfrastructureIncident ? 'critical' : 'success',
                    }}
                    hotspots={[
                        { id: 'service', label: 'Service recovery', status: activeCrisis ? titleCase(activeCrisis.stage) : 'Stable', x: 27, y: 35, tone: activeCrisis ? 'critical' : 'success', icon: <ServerCrash size={15} /> },
                        { id: 'operations', label: 'Facility network', status: activeInfrastructureIncident ? titleCase(activeInfrastructureIncident.stage) : `${infrastructure.averageCondition.toFixed(0)}% condition`, x: 40, y: 67, tone: activeInfrastructureIncident ? 'critical' : infrastructure.averageCondition < 75 ? 'warning' : 'success', icon: <Network size={15} /> },
                        { id: 'trust', label: 'Public trust', status: `${command.publicTrust.toFixed(0)}/100`, x: 52, y: 48, tone: command.publicTrust >= 70 ? 'success' : 'warning', icon: <HeartHandshake size={15} /> },
                        { id: 'evidence', label: 'Evidence trail', status: `${command.evidenceTrail.toFixed(0)}/100`, x: 76, y: 32, tone: command.evidenceTrail >= 45 ? 'critical' : 'neutral', icon: <Fingerprint size={15} /> },
                    ]}
                    onHotspotSelect={hotspot => setActiveTab(hotspot.id === 'evidence' ? 'EVIDENCE' : hotspot.id === 'trust' ? 'DEFENCE' : hotspot.id === 'operations' ? 'OPERATIONS' : 'COMMAND')}
                />

                <section className="sic-track-strip" aria-label="Persistent crisis and trust tracks">
                    {TRACKS.map(track => {
                        const Icon = track.icon;
                        const value = command[track.id];
                        const healthy = track.inverse ? value < 35 : value >= 65;
                        const critical = track.inverse ? value >= 65 : value < 35;
                        return (
                            <article key={track.id} className={critical ? 'is-critical' : healthy ? 'is-healthy' : 'is-watch'}>
                                <Icon size={17} />
                                <span>{track.label}<small>{critical ? 'CRITICAL' : healthy ? 'HEALTHY' : 'WATCH'}</small></span>
                                <strong>{value.toFixed(0)}</strong>
                                <i><b style={{ width: `${clampUi(value)}%` }} /></i>
                            </article>
                        );
                    })}
                </section>

                <nav className="sic-tabs" aria-label="Incident Command sections">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const selected = activeTab === tab.id;
                        const count = tab.id === 'OVERSIGHT'
                            ? command.openRegulatoryCaseCount + command.openWhistleblowerCount
                            : tab.id === 'EVIDENCE' ? command.pendingEvidenceCount
                                : tab.id === 'OPERATIONS' && activeInfrastructureIncident ? 1
                                    : tab.id === 'COMMAND' && activeCrisis ? 1 : 0;
                        return (
                            <button type="button" key={tab.id} className={selected ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)} aria-current={selected ? 'page' : undefined}>
                                <Icon size={17} /><span>{tab.label}</span>{count ? <b>{count}</b> : null}
                            </button>
                        );
                    })}
                </nav>

                <main className="sic-main">
                    {activeTab === 'COMMAND' ? renderCommand() : null}
                    {activeTab === 'OPERATIONS' ? renderOperations() : null}
                    {activeTab === 'DEFENCE' ? renderDefence() : null}
                    {activeTab === 'SHADOW' ? renderShadow() : null}
                    {activeTab === 'EVIDENCE' ? renderEvidence() : null}
                    {activeTab === 'OVERSIGHT' ? renderOversight() : null}
                    {feedback ? <p className="sic-feedback" role="status">{feedback}</p> : null}
                </main>
            </div>

            {showCinematic && pendingCinematic ? (
                <div className={`sic-cinematic is-${pendingCinematic.type.toLowerCase()}`} role="dialog" aria-labelledby="sic-cinematic-title">
                    <div className="sic-cinematic-grid" aria-hidden="true"><i /><i /><i /><i /></div>
                    <span>{pendingCinematic.type === 'SHADOW_OPERATION' ? 'THE RECORD GOES DARK' : 'THE SIGNAL BREAKS'}</span>
                    {pendingCinematic.type === 'SHADOW_OPERATION' ? <Fingerprint size={48} /> : pendingCinematic.type === 'REGULATORY_HEARING' ? <Landmark size={48} /> : <Siren size={48} />}
                    <h1 id="sic-cinematic-title">{pendingCinematic.title}</h1>
                    <p>{pendingCinematic.type === 'SHADOW_OPERATION'
                        ? 'The market consequence begins now. Attribution will be decided later by the evidence trail.'
                        : 'A persistent company event has entered Incident Command. Your next decision changes recovery, trust and the permanent record.'}</p>
                    <button type="button" onClick={() => finishCinematic('VIEWED')}>Enter Incident Command <ChevronRight size={18} /></button>
                    <button type="button" onClick={() => finishCinematic('DISMISSED')}>Skip scene</button>
                </div>
            ) : null}
        </AccessibleDialog>
    );
}

const clampUi = (value: number): number => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
