import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingTechnologyBenefit,
    OwnedStreamingTechnologyProject,
    Player,
    StreamingTechnologyBuildMode,
    StreamingTechnologyCampusBranch,
    StreamingTechnologyRisk,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { resolveStreamingCompanyCapabilities } from './streamingCompany';
import {
    findStreamingResearchDefinitionForTechnology,
    getStreamingResearchInstallationBlockers,
    getStreamingResearchWeeklyCost,
    markStreamingResearchInstallationOperating,
    markStreamingResearchInstallationStarted,
} from './streamingResearchLifecycle';

export interface StreamingTechnologyDefinition {
    id: string;
    branch: StreamingTechnologyCampusBranch;
    tier: number;
    title: string;
    codename: string;
    description: string;
    targetLevel: number;
    baseCapitalCost: number;
    baseWeeklyOperatingCost: number;
    baseConstructionWeeks: number;
    staffRequired: number;
    benefit: OwnedStreamingTechnologyBenefit;
    benefitSummary: string;
    risk: StreamingTechnologyRisk;
    riskNote: string;
    baseTechnicalDebt: number;
    prerequisiteId: string | null;
    ctoRequired: boolean;
}

export interface StreamingTechnologyFacilityDefinition {
    id: StreamingTechnologyCampusBranch;
    name: string;
    shortName: string;
    mandate: string;
    scene: string;
    accent: string;
}

export interface StreamingTechnologyBuildPreview {
    definition: StreamingTechnologyDefinition;
    buildMode: StreamingTechnologyBuildMode;
    capitalCost: number;
    weeklyOperatingCostDelta: number;
    constructionWeeks: number;
    staffRequired: number;
    technicalDebtDelta: number;
    risk: StreamingTechnologyRisk;
    riskNote: string;
}

export interface StreamingTechnologyNode {
    definition: StreamingTechnologyDefinition;
    status: 'INSTALLED' | 'BUILDING' | 'AVAILABLE' | 'LOCKED';
    project: OwnedStreamingTechnologyProject | null;
    blockers: string[];
}

export interface StreamingTechnologyFacilityView {
    definition: StreamingTechnologyFacilityDefinition;
    currentLevel: number;
    installedCount: number;
    totalCount: number;
    nodes: StreamingTechnologyNode[];
    nextNode: StreamingTechnologyNode | null;
}

export interface StreamingTechnologyCampusView {
    available: boolean;
    absoluteWeek: number;
    availableEngineeringStaff: number;
    activeProject: OwnedStreamingTechnologyProject | null;
    completedProjectCount: number;
    totalWeeklyOperatingCost: number;
    technicalDebt: number;
    ctoActive: boolean;
    facilities: StreamingTechnologyFacilityView[];
}

export interface StreamingTechnologyActionResult {
    player: Player;
    changed: boolean;
    reason?: 'NOT_AVAILABLE' | 'NOT_FOUND' | 'NOT_NEXT' | 'PROJECT_ACTIVE' | 'CTO_REQUIRED' | 'STAFF_REQUIRED' | 'INSUFFICIENT_TREASURY';
    project?: OwnedStreamingTechnologyProject;
}

const benefit = (partial: Partial<OwnedStreamingTechnologyBenefit>): OwnedStreamingTechnologyBenefit => ({
    baselineConcurrentStreamsDelta: 0,
    burstConcurrentStreamsDelta: 0,
    reliabilityDelta: 0,
    playbackQualityDelta: 0,
    recommendationDelta: 0,
    securityDelta: 0,
    contentOperationsDelta: 0,
    ...partial,
});

export const STREAMING_TECHNOLOGY_FACILITIES: StreamingTechnologyFacilityDefinition[] = [
    { id: 'DELIVERY_CAPACITY', name: 'Edge Grid Complex', shortName: 'Edge Grid', mandate: 'Move more concurrent streams closer to viewers.', scene: 'Signal towers and modular server halls', accent: '#22d3ee' },
    { id: 'PLAYBACK_QUALITY', name: 'Playback Foundry', shortName: 'Playback', mandate: 'Improve picture, sound and device resilience.', scene: 'Codec chambers and device walls', accent: '#818cf8' },
    { id: 'RELIABILITY', name: 'Reliability Command', shortName: 'Reliability', mandate: 'Keep the service alive when systems fail.', scene: 'Redundant control rings and recovery bays', accent: '#34d399' },
    { id: 'DATA_RECOMMENDATIONS', name: 'Audience Intelligence Lab', shortName: 'Data Lab', mandate: 'Make discovery more useful without fabricating demand.', scene: 'Recommendation model observatory', accent: '#c084fc' },
    { id: 'SECURITY', name: 'Security Citadel', shortName: 'Security', mandate: 'Protect accounts, rights and operating trust.', scene: 'Zero-trust gates and forensic vaults', accent: '#fb7185' },
    { id: 'CONTENT_OPERATIONS', name: 'Content Pipeline Works', shortName: 'Content Ops', mandate: 'Localize, ingest and publish at greater scale.', scene: 'Localization stages and master-control lines', accent: '#fbbf24' },
];

const definition = (
    branch: StreamingTechnologyCampusBranch,
    tier: number,
    title: string,
    codename: string,
    description: string,
    targetLevel: number,
    baseCapitalCost: number,
    baseWeeklyOperatingCost: number,
    baseConstructionWeeks: number,
    staffRequired: number,
    projectBenefit: Partial<OwnedStreamingTechnologyBenefit>,
    benefitSummary: string,
    risk: StreamingTechnologyRisk,
    riskNote: string,
    baseTechnicalDebt: number,
): StreamingTechnologyDefinition => ({
    id: `${branch.toLowerCase()}-${tier}`,
    branch,
    tier,
    title,
    codename,
    description,
    targetLevel,
    baseCapitalCost,
    baseWeeklyOperatingCost,
    baseConstructionWeeks,
    staffRequired,
    benefit: benefit(projectBenefit),
    benefitSummary,
    risk,
    riskNote,
    baseTechnicalDebt,
    prerequisiteId: tier > 1 ? `${branch.toLowerCase()}-${tier - 1}` : null,
    ctoRequired: tier >= 3,
});

export const STREAMING_TECHNOLOGY_DEFINITIONS: StreamingTechnologyDefinition[] = [
    definition('DELIVERY_CAPACITY', 1, 'Regional Edge Pods', 'NEARLINE', 'Deploy compact caching clusters near the first audience footprint.', 15, 8_000_000, 90_000, 2, 6, { baselineConcurrentStreamsDelta: 250_000, burstConcurrentStreamsDelta: 500_000 }, '+250K normal and +500K burst streams', 'LOW', 'A conservative edge rollout with limited vendor lock-in.', 1),
    definition('DELIVERY_CAPACITY', 2, 'National Traffic Mesh', 'LATTICE', 'Route demand across redundant national points of presence.', 30, 24_000_000, 240_000, 3, 10, { baselineConcurrentStreamsDelta: 1_000_000, burstConcurrentStreamsDelta: 2_000_000 }, '+1M normal and +2M burst streams', 'MODERATE', 'Routing complexity raises coordination overhead.', 3),
    definition('DELIVERY_CAPACITY', 3, 'Multi-Region Edge Fabric', 'CONSTELLATION', 'Bind regional clusters into one elastic delivery fabric.', 50, 68_000_000, 620_000, 5, 18, { baselineConcurrentStreamsDelta: 3_000_000, burstConcurrentStreamsDelta: 6_000_000 }, '+3M normal and +6M burst streams', 'MODERATE', 'A failed traffic policy can amplify a regional overload.', 5),
    definition('DELIVERY_CAPACITY', 4, 'Orbital Relay Backbone', 'HORIZON', 'Prototype a globally synchronized relay and edge network.', 75, 155_000_000, 1_450_000, 7, 28, { baselineConcurrentStreamsDelta: 8_000_000, burstConcurrentStreamsDelta: 16_000_000 }, '+8M normal and +16M burst streams', 'HIGH', 'Frontier network orchestration carries meaningful technical debt.', 9),

    definition('PLAYBACK_QUALITY', 1, 'Adaptive Playback Engine', 'FLOW', 'Tune bitrate ladders for unstable devices and connections.', 12, 6_000_000, 70_000, 2, 5, { playbackQualityDelta: 12 }, 'Fewer avoidable playback failures', 'LOW', 'Low-risk codec and player tuning.', 1),
    definition('PLAYBACK_QUALITY', 2, 'Premium Codec Pipeline', 'PRISM', 'Introduce higher-efficiency picture and sound masters.', 25, 18_000_000, 190_000, 3, 9, { playbackQualityDelta: 13 }, 'Higher playback quality at the same bandwidth', 'MODERATE', 'Older devices need a larger compatibility matrix.', 2),
    definition('PLAYBACK_QUALITY', 3, 'Device Resilience Matrix', 'MOSAIC', 'Continuously certify playback across a wider device universe.', 45, 48_000_000, 420_000, 4, 16, { playbackQualityDelta: 20 }, 'Stronger device compatibility and playback trust', 'MODERATE', 'Certification breadth can slow emergency player releases.', 3),
    definition('PLAYBACK_QUALITY', 4, 'Perceptual Stream Synthesis', 'LUCID', 'Research scene-aware encoding that spends bits where viewers feel them.', 70, 118_000_000, 980_000, 6, 24, { playbackQualityDelta: 25 }, 'Frontier quality with lower delivery pressure', 'HIGH', 'An immature model can create visible artifacts in edge cases.', 7),

    definition('RELIABILITY', 1, 'Automated Recovery Ring', 'GUARDIAN', 'Detect common service failures and recover without a war room.', 15, 7_500_000, 85_000, 2, 6, { reliabilityDelta: 0.03 }, '+0.03 reliability target', 'LOW', 'Automation is limited to known failure classes.', -1),
    definition('RELIABILITY', 2, 'Active-Active Control Plane', 'TWINLINE', 'Keep two live control paths ready to absorb failure.', 30, 22_000_000, 260_000, 4, 11, { reliabilityDelta: 0.05 }, '+0.05 reliability target', 'MODERATE', 'Replication mistakes can reproduce a bad state twice.', -2),
    definition('RELIABILITY', 3, 'Chaos Verification Range', 'FIREBREAK', 'Continuously test failover using contained simulated failures.', 50, 55_000_000, 510_000, 5, 18, { reliabilityDelta: 0.08 }, '+0.08 reliability and technical-debt reduction', 'MODERATE', 'Poorly contained exercises can disturb live operations.', -4),
    definition('RELIABILITY', 4, 'Self-Healing Service Mesh', 'PHOENIX', 'Research autonomous diagnosis and progressive recovery.', 75, 132_000_000, 1_100_000, 7, 27, { reliabilityDelta: 0.12 }, '+0.12 reliability and major debt reduction', 'HIGH', 'Incorrect autonomous remediation can obscure a root cause.', -7),

    definition('DATA_RECOMMENDATIONS', 1, 'Taste Graph Foundation', 'COMPASS', 'Build a transparent baseline model from real viewing behavior.', 10, 5_500_000, 65_000, 2, 5, { recommendationDelta: 10 }, 'Better catalog discovery and campaign modeling', 'LOW', 'Sparse early data limits confidence.', 1),
    definition('DATA_RECOMMENDATIONS', 2, 'Contextual Ranking Engine', 'MOMENT', 'Balance taste, title freshness and viewing context.', 24, 17_000_000, 180_000, 3, 9, { recommendationDelta: 14 }, 'Stronger title targeting and recommendation control', 'MODERATE', 'Short-term signals can overreact to one breakout week.', 2),
    definition('DATA_RECOMMENDATIONS', 3, 'Exploration Intelligence', 'SERENDIPITY', 'Reserve discovery space for deep-catalog and emerging tastes.', 45, 46_000_000, 390_000, 4, 15, { recommendationDelta: 21 }, 'More effective exploration and long-tail promotion', 'MODERATE', 'Too much exploration can weaken immediate conversion.', 3),
    definition('DATA_RECOMMENDATIONS', 4, 'Causal Audience Engine', 'ORACLE', 'Research models that separate correlation from campaign effect.', 70, 112_000_000, 920_000, 6, 23, { recommendationDelta: 25 }, 'Highest campaign attribution confidence', 'HIGH', 'The model is expensive and can still encode bad assumptions.', 6),

    definition('SECURITY', 1, 'Account Trust Gateway', 'SENTRY', 'Harden identity, sessions and suspicious login handling.', 10, 6_500_000, 80_000, 2, 6, { securityDelta: 10 }, 'Stronger account and session protection', 'LOW', 'Stricter checks can add limited sign-in friction.', 0),
    definition('SECURITY', 2, 'Rights Watermark Grid', 'TRACE', 'Trace premium content copies across delivery paths.', 25, 19_000_000, 210_000, 3, 10, { securityDelta: 15 }, 'Better content-rights enforcement', 'MODERATE', 'Watermark operations add encoding complexity.', 2),
    definition('SECURITY', 3, 'Zero-Trust Operations Fabric', 'CITADEL', 'Require continuous authorization across internal systems.', 45, 52_000_000, 450_000, 5, 17, { securityDelta: 20 }, 'Lower internal attack surface and stronger evidence', 'MODERATE', 'Misconfigured policies can block legitimate operators.', 2),
    definition('SECURITY', 4, 'Autonomous Threat Observatory', 'AEGIS', 'Research predictive detection across accounts, content and infrastructure.', 70, 125_000_000, 1_050_000, 7, 26, { securityDelta: 25 }, 'Frontier defensive intelligence for future crises', 'HIGH', 'False positives can consume the security organization.', 5),

    definition('CONTENT_OPERATIONS', 1, 'Master Ingest Line', 'FOUNDRY', 'Standardize quality control and publishing packages.', 10, 5_000_000, 60_000, 2, 5, { contentOperationsDelta: 10 }, 'Faster, safer title ingest', 'LOW', 'Strict templates need disciplined production handoffs.', 0),
    definition('CONTENT_OPERATIONS', 2, 'Localization Exchange', 'POLYGLOT', 'Coordinate subtitles, dubbing and regional master delivery.', 22, 16_000_000, 170_000, 3, 9, { contentOperationsDelta: 12 }, 'Stronger multi-region localization readiness', 'MODERATE', 'Vendor coordination can create queue pressure.', 1),
    definition('CONTENT_OPERATIONS', 3, 'Global Publishing Orchestrator', 'WORLDLINE', 'Publish synchronized regional packages with rights-aware controls.', 40, 44_000_000, 380_000, 4, 15, { contentOperationsDelta: 18 }, 'Global release operations and fewer manual mistakes', 'MODERATE', 'A bad policy can delay several regions together.', 2),
    definition('CONTENT_OPERATIONS', 4, 'Real-Time Localization Stage', 'BABEL', 'Research secure near-live adaptation for global events.', 65, 105_000_000, 860_000, 6, 22, { contentOperationsDelta: 25 }, 'Frontier global-event localization capacity', 'HIGH', 'Speed increases editorial and rights-review pressure.', 6),
];

const BUILD_MODE_RULES: Record<StreamingTechnologyBuildMode, {
    costMultiplier: number;
    weekMultiplier: number;
    debtMultiplier: number;
    debtOffset: number;
    riskShift: number;
}> = {
    HARDENED: { costMultiplier: 1.18, weekMultiplier: 1.3, debtMultiplier: 0.35, debtOffset: -2, riskShift: -1 },
    BALANCED: { costMultiplier: 1, weekMultiplier: 1, debtMultiplier: 1, debtOffset: 0, riskShift: 0 },
    SPRINT: { costMultiplier: 1.12, weekMultiplier: 0.6, debtMultiplier: 1.4, debtOffset: 5, riskShift: 1 },
};

const RISK_ORDER: StreamingTechnologyRisk[] = ['LOW', 'MODERATE', 'HIGH'];
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 250_000) * 250_000);
const activeCto = (platform: OwnedStreamingPlatformState): boolean => platform.leadership.appointments.some(
    appointment => appointment.status === 'ACTIVE' && appointment.role === 'CTO',
);

export const getStreamingTechnologyStaffCapacity = (platform: OwnedStreamingPlatformState): number => (
    Math.max(0, platform.infrastructureSetup?.staffRequired || 0) * 2
    + 4
    + (activeCto(platform) ? 12 : 0)
);

export const previewStreamingTechnologyProject = (
    definitionValue: StreamingTechnologyDefinition,
    buildMode: StreamingTechnologyBuildMode,
): StreamingTechnologyBuildPreview => {
    const rules = BUILD_MODE_RULES[buildMode];
    const riskIndex = Math.max(0, Math.min(RISK_ORDER.length - 1, RISK_ORDER.indexOf(definitionValue.risk) + rules.riskShift));
    const debtBase = Math.round(definitionValue.baseTechnicalDebt * rules.debtMultiplier) + rules.debtOffset;
    return {
        definition: definitionValue,
        buildMode,
        capitalCost: roundMoney(definitionValue.baseCapitalCost * rules.costMultiplier),
        weeklyOperatingCostDelta: definitionValue.baseWeeklyOperatingCost,
        constructionWeeks: Math.max(1, Math.ceil(definitionValue.baseConstructionWeeks * rules.weekMultiplier)),
        staffRequired: definitionValue.staffRequired,
        technicalDebtDelta: Math.min(20, Math.max(-12, debtBase)),
        risk: RISK_ORDER[riskIndex],
        riskNote: buildMode === 'HARDENED'
            ? `${definitionValue.riskNote} Hardened delivery adds verification and reduces debt.`
            : buildMode === 'SPRINT'
                ? `${definitionValue.riskNote} Sprint delivery compresses testing and raises debt.`
                : definitionValue.riskNote,
    };
};

const isDefinitionInstalled = (
    platform: OwnedStreamingPlatformState,
    item: StreamingTechnologyDefinition,
): boolean => (
    platform.technologyLevels[item.branch] >= item.targetLevel
    || platform.technologyProjects.some(project => project.definitionId === item.id && project.status === 'COMPLETED')
);

const getDefinitionBlockers = (
    platform: OwnedStreamingPlatformState,
    item: StreamingTechnologyDefinition,
): string[] => {
    const blockers: string[] = [];
    if (item.prerequisiteId) {
        const prerequisite = STREAMING_TECHNOLOGY_DEFINITIONS.find(candidate => candidate.id === item.prerequisiteId);
        if (prerequisite && !isDefinitionInstalled(platform, prerequisite)) blockers.push(`${prerequisite.title} required`);
    }
    if (item.ctoRequired && !activeCto(platform)) blockers.push('Active CTO required');
    const researchDefinition = findStreamingResearchDefinitionForTechnology(item.id);
    if (researchDefinition) {
        const program = platform.researchPrograms.find(candidate => candidate.definitionId === researchDefinition.id);
        if (!program || !['READY_TO_INSTALL', 'INSTALLING', 'OPERATING'].includes(program.stage)) {
            blockers.push(`${researchDefinition.title} research and IP clearance required`);
        } else if (program.stage === 'READY_TO_INSTALL') {
            blockers.push(...getStreamingResearchInstallationBlockers(platform, researchDefinition));
        }
    }
    const staffCapacity = getStreamingTechnologyStaffCapacity(platform);
    if (staffCapacity < item.staffRequired) blockers.push(`${item.staffRequired} engineering staff required`);
    return blockers;
};

export const getStreamingTechnologyCampus = (player: Player): StreamingTechnologyCampusView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const available = Boolean(
        platform.infrastructureSetup
        && platform.lifecycle === 'ACTIVE'
        && absoluteWeek >= platform.infrastructureSetup.readyAtAbsoluteWeek,
    );
    const activeProject = platform.technologyProjects.find(project => project.status === 'UNDER_CONSTRUCTION') || null;
    const facilities = STREAMING_TECHNOLOGY_FACILITIES.map(facility => {
        const definitions = STREAMING_TECHNOLOGY_DEFINITIONS.filter(item => item.branch === facility.id);
        const nodes: StreamingTechnologyNode[] = definitions.map(item => {
            const project = platform.technologyProjects.find(candidate => candidate.definitionId === item.id) || null;
            const blockers = getDefinitionBlockers(platform, item);
            const status: StreamingTechnologyNode['status'] = isDefinitionInstalled(platform, item)
                ? 'INSTALLED'
                : project?.status === 'UNDER_CONSTRUCTION'
                    ? 'BUILDING'
                    : blockers.length || Boolean(activeProject)
                        ? 'LOCKED'
                        : 'AVAILABLE';
            return { definition: item, status, project, blockers };
        });
        return {
            definition: facility,
            currentLevel: platform.technologyLevels[facility.id],
            installedCount: nodes.filter(node => node.status === 'INSTALLED').length,
            totalCount: nodes.length,
            nodes,
            nextNode: nodes.find(node => node.status !== 'INSTALLED') || null,
        };
    });
    return {
        available,
        absoluteWeek,
        availableEngineeringStaff: getStreamingTechnologyStaffCapacity(platform),
        activeProject,
        completedProjectCount: platform.technologyProjects.filter(project => project.status === 'COMPLETED').length,
        totalWeeklyOperatingCost: platform.technologyProjects
            .filter(project => project.status === 'COMPLETED')
            .reduce((sum, project) => sum + project.weeklyOperatingCostDelta, 0),
        technicalDebt: platform.infrastructureSetup?.technicalDebt || 0,
        ctoActive: activeCto(platform),
        facilities,
    };
};

export const startStreamingTechnologyProject = (
    player: Player,
    definitionId: string,
    buildMode: StreamingTechnologyBuildMode,
): StreamingTechnologyActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const campus = getStreamingTechnologyCampus(player);
    if (!campus.available) return { player, changed: false, reason: 'NOT_AVAILABLE' };
    if (campus.activeProject) return { player, changed: false, reason: 'PROJECT_ACTIVE' };
    const item = STREAMING_TECHNOLOGY_DEFINITIONS.find(candidate => candidate.id === definitionId);
    if (!item) return { player, changed: false, reason: 'NOT_FOUND' };
    const facility = campus.facilities.find(candidate => candidate.definition.id === item.branch);
    const node = facility?.nodes.find(candidate => candidate.definition.id === definitionId);
    if (!node || node.status !== 'AVAILABLE') {
        if (node?.blockers.some(blocker => blocker.includes('CTO'))) return { player, changed: false, reason: 'CTO_REQUIRED' };
        if (node?.blockers.some(blocker => blocker.includes('staff'))) return { player, changed: false, reason: 'STAFF_REQUIRED' };
        return { player, changed: false, reason: 'NOT_NEXT' };
    }
    const preview = previewStreamingTechnologyProject(item, buildMode);
    if (platform.treasuryCash < preview.capitalCost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `technology-project:${item.id}`;
    if (platform.technologyProjects.some(project => project.idempotencyKey === idempotencyKey)) {
        return { player, changed: false, reason: 'NOT_NEXT' };
    }
    const project: OwnedStreamingTechnologyProject = {
        id: createDeterministicId('streaming_technology_project', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        definitionId: item.id,
        branch: item.branch,
        title: item.title,
        targetLevel: item.targetLevel,
        buildMode,
        status: 'UNDER_CONSTRUCTION',
        capitalCost: preview.capitalCost,
        weeklyOperatingCostDelta: preview.weeklyOperatingCostDelta,
        staffRequired: preview.staffRequired,
        constructionWeeks: preview.constructionWeeks,
        benefit: item.benefit,
        risk: preview.risk,
        riskNote: preview.riskNote,
        technicalDebtDelta: preview.technicalDebtDelta,
        startedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: absoluteWeek + preview.constructionWeeks,
        completedAtAbsoluteWeek: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${idempotencyKey}:started`),
        idempotencyKey: `${idempotencyKey}:started`,
        absoluteWeek,
        type: 'TECHNOLOGY_PROJECT_STARTED',
        summary: `${item.title} entered construction in ${buildMode.toLowerCase()} mode.`,
        source: 'PLAYER_ACTION',
        metadata: {
            definitionId: item.id,
            branch: item.branch,
            capitalCost: preview.capitalCost,
            readyAtAbsoluteWeek: project.readyAtAbsoluteWeek,
            staffRequired: preview.staffRequired,
            technicalDebtDelta: preview.technicalDebtDelta,
        },
    };
    const platformWithInstallation = markStreamingResearchInstallationStarted(
        {
            ...platform,
            treasuryCash: platform.treasuryCash - preview.capitalCost,
            technologyProjects: [...platform.technologyProjects, project],
            eventLedger: [...platform.eventLedger, ledger],
        },
        'TECHNOLOGY_PROJECT',
        item.id,
        `${item.title} · ${item.branch.replaceAll('_', ' ')}`,
        project.readyAtAbsoluteWeek,
    );
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platformWithInstallation, player.id),
        },
        changed: true,
        project,
    };
};

export const completeDueStreamingTechnologyProjects = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    completedProjects: OwnedStreamingTechnologyProject[];
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    let platform = platformValue;
    const completedProjects: OwnedStreamingTechnologyProject[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    const projects = platform.technologyProjects.map(project => {
        if (project.status !== 'UNDER_CONSTRUCTION' || absoluteWeek < project.readyAtAbsoluteWeek) return project;
        const completed: OwnedStreamingTechnologyProject = {
            ...project,
            status: 'COMPLETED',
            completedAtAbsoluteWeek: absoluteWeek,
        };
        completedProjects.push(completed);
        const key = `${project.idempotencyKey}:completed`;
        if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
            ledgerEntries.push({
                id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                idempotencyKey: key,
                absoluteWeek,
                type: 'TECHNOLOGY_PROJECT_COMPLETED',
                summary: `${project.title} entered live platform operations.`,
                source: 'WEEK_PROCESSOR',
                metadata: {
                    definitionId: project.definitionId,
                    branch: project.branch,
                    targetLevel: project.targetLevel,
                    technicalDebtDelta: project.technicalDebtDelta,
                },
            });
        }
        return completed;
    });
    if (!completedProjects.length) return { platform, completedProjects, ledgerEntries };
    const technologyLevels = { ...platform.technologyLevels };
    let baselineConcurrentStreams = platform.capacity.baselineConcurrentStreams;
    let burstConcurrentStreams = platform.capacity.burstConcurrentStreams;
    let reliabilityDelta = 0;
    let technicalDebtDelta = 0;
    completedProjects.forEach(project => {
        technologyLevels[project.branch] = Math.max(technologyLevels[project.branch], project.targetLevel);
        baselineConcurrentStreams += project.benefit.baselineConcurrentStreamsDelta;
        burstConcurrentStreams += project.benefit.burstConcurrentStreamsDelta;
        reliabilityDelta += project.benefit.reliabilityDelta;
        technicalDebtDelta += project.technicalDebtDelta;
    });
    platform = {
        ...platform,
        technologyProjects: projects,
        technologyLevels,
        capacity: { baselineConcurrentStreams, burstConcurrentStreams },
        infrastructureSetup: platform.infrastructureSetup ? {
            ...platform.infrastructureSetup,
            reliabilityTarget: Math.min(99.995, platform.infrastructureSetup.reliabilityTarget + reliabilityDelta),
            technicalDebt: Math.max(0, platform.infrastructureSetup.technicalDebt + technicalDebtDelta),
        } : null,
        milestoneKeys: Array.from(new Set([
            ...platform.milestoneKeys,
            'technology-campus-operational',
            ...completedProjects.filter(project => project.targetLevel >= 50).map(project => `frontier-technology:${project.branch}`),
        ])),
    };
    completedProjects.forEach(project => {
        platform = markStreamingResearchInstallationOperating(platform, 'TECHNOLOGY_PROJECT', project.definitionId, absoluteWeek);
    });
    return { platform, completedProjects, ledgerEntries };
};

export const getStreamingTechnologyWeeklyCost = (platform: OwnedStreamingPlatformState): number => (
    platform.technologyProjects
        .filter(project => project.status === 'COMPLETED')
        .reduce((sum, project) => sum + project.weeklyOperatingCostDelta, 0)
    + getStreamingResearchWeeklyCost(platform)
);

export const getStreamingTechnologyCompanyGate = (player: Player): {
    ctoActive: boolean;
    source: string;
} => {
    const capabilities = resolveStreamingCompanyCapabilities(player);
    return {
        ctoActive: capabilities.capabilities.ADVANCED_TECHNOLOGY,
        source: capabilities.sources.ADVANCED_TECHNOLOGY?.[0] || 'Founder engineering authority',
    };
};
