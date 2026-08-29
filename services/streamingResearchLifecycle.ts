import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingResearchProgram,
    Player,
    StreamingFacilityType,
    StreamingRackDuty,
    StreamingResearchCategory,
    StreamingResearchInstallTargetType,
    StreamingResearchIpStrategy,
    StreamingResearchLifecycleStage,
    StreamingTechnologyBuildMode,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';
import {
    advanceStreamingResearchStage,
    beginStreamingResearchInstallation,
    clearStreamingResearchIp,
    completeStreamingResearchInstallation,
    createStreamingResearchProgram,
    previewStreamingResearchIpCost,
    previewStreamingResearchProgram,
} from './streamingResearchCore';
import {
    STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS,
    type StreamingLocalizationCapabilityId,
} from './streamingLocalizationCapabilities';

export interface StreamingResearchDefinition {
    id: string;
    category: StreamingResearchCategory;
    categoryLabel: string;
    title: string;
    codename: string;
    description: string;
    unlockSummary: string;
    installationLocation: string;
    gameplayChange: string;
    installTargetType: StreamingResearchInstallTargetType;
    mappedTechnologyId: string | null;
    mappedProductLineId: 'KIDS' | null;
    mappedLocalizationCapabilityId?: StreamingLocalizationCapabilityId | null;
    requiredRackDuty: StreamingRackDuty | null;
    researchCost: number;
    patentCost: number;
    installationCost: number;
    weeklyOperatingCost: number;
    licenseWeeklyCost: number;
    staffRequired: number;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
    accent: string;
}

const research = (
    id: string,
    category: StreamingResearchCategory,
    categoryLabel: string,
    title: string,
    codename: string,
    description: string,
    unlockSummary: string,
    installationLocation: string,
    gameplayChange: string,
    installTargetType: StreamingResearchInstallTargetType,
    mappedTechnologyId: string | null,
    mappedProductLineId: 'KIDS' | null,
    requiredRackDuty: StreamingRackDuty | null,
    researchCost: number,
    patentCost: number,
    installationCost: number,
    weeklyOperatingCost: number,
    licenseWeeklyCost: number,
    staffRequired: number,
    researchWeeks: number,
    prototypeWeeks: number,
    testWeeks: number,
    installationWeeks: number,
    accent: string,
): StreamingResearchDefinition => ({
    id, category, categoryLabel, title, codename, description, unlockSummary, installationLocation,
    gameplayChange, installTargetType, mappedTechnologyId, mappedProductLineId, requiredRackDuty,
    researchCost, patentCost, installationCost, weeklyOperatingCost, licenseWeeklyCost,
    staffRequired, researchWeeks, prototypeWeeks, testWeeks, installationWeeks, accent,
});

export const STREAMING_RESEARCH_DEFINITIONS: StreamingResearchDefinition[] = [
    research('edge-orchestration', 'NETWORK_INFRASTRUCTURE', 'Network Infrastructure', 'Edge Orchestration', 'LATTICE R&D', 'Prototype traffic control that routes viewers across a national delivery mesh.', 'National Traffic Mesh installation blueprint', 'Technology Campus · Edge Grid Complex', '+1M normal and +2M burst streams after construction', 'TECHNOLOGY_PROJECT', 'delivery_capacity-2', null, null, 7_500_000, 5_000_000, 24_000_000, 150_000, 210_000, 8, 2, 1, 1, 3, '#22d3ee'),
    research('perceptual-compression', 'SERVERS_DELIVERY', 'Servers and Delivery', 'Perceptual Compression', 'PRISM R&D', 'Test a codec pipeline that spends bandwidth where viewers perceive the difference.', 'Premium Codec Pipeline installation blueprint', 'An ENCODING rack group', 'Higher playback quality at the same bandwidth after deployment', 'RACK_GROUP', 'playback_quality-2', null, 'ENCODING', 6_000_000, 4_200_000, 18_000_000, 120_000, 170_000, 7, 2, 1, 1, 3, '#818cf8'),
    research('immersion-cooling', 'COOLING_ENERGY', 'Cooling and Energy', 'Immersion Cooling', 'DEEPBLUE', 'Validate non-conductive cooling for high-density private infrastructure.', 'Immersion retrofit engineering package', 'A commissioned private cage, suite, hall or owned centre', 'More cooling headroom and lower weekly energy pressure at that facility', 'FACILITY', null, null, null, 9_000_000, 6_500_000, 28_000_000, 95_000, 145_000, 9, 3, 1, 1, 3, '#38bdf8'),
    research('adaptive-startup', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Adaptive Startup', 'FLOW R&D', 'Model startup and bitrate behavior across unstable devices and connections.', 'Adaptive Playback Engine blueprint', 'Technology Campus · Playback Foundry', 'Fewer avoidable playback failures after construction', 'TECHNOLOGY_PROJECT', 'playback_quality-1', null, null, 3_500_000, 2_500_000, 6_000_000, 55_000, 80_000, 5, 1, 1, 1, 2, '#a78bfa'),
    research('localization-exchange', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Localization Exchange', 'POLYGLOT R&D', 'Build a rights-aware operating pipeline for subtitles, dubbing and regional masters.', 'Localization Exchange installation blueprint', 'Technology Campus · Content Pipeline Works', 'Paid localization jobs can serve researched subtitle and dubbing coverage', 'TECHNOLOGY_PROJECT', 'content_operations-2', null, null, 8_000_000, 4_000_000, 16_000_000, 100_000, 140_000, 8, 2, 1, 1, 3, '#fbbf24'),
    research('global-publishing-orchestrator', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Global Publishing Orchestrator', 'WORLDLINE R&D', 'Coordinate dubbing, subtitles and rights-aware masters across synchronized regional launches.', 'Global Publishing Orchestrator installation blueprint', 'Technology Campus · Content Pipeline Works', 'Dubs and subtitles can be commissioned for researched multi-region launches', 'TECHNOLOGY_PROJECT', 'content_operations-3', null, null, 18_000_000, 9_000_000, 44_000_000, 220_000, 300_000, 14, 3, 1, 1, 4, '#fb923c'),
    research('kids-mode', 'PLATFORM_PRODUCTS', 'Platform Products', 'Kids Mode', 'GARDEN R&D', 'Design guardian controls, child profiles and age-aware discovery before product development.', 'EMPIRE+ Kids product development', 'Product Lab · Kids line', 'Family acquisition and retention effects begin only after product launch', 'PRODUCT_LINE', null, 'KIDS', null, 5_000_000, 3_500_000, 18_000_000, 0, 85_000, 6, 2, 1, 1, 3, '#fbbf24'),
    research('zero-trust-sessions', 'SECURITY_RELIABILITY', 'Security and Reliability', 'Zero-Trust Sessions', 'SENTRY R&D', 'Test stricter account and session controls against realistic sign-in traffic.', 'Account Trust Gateway blueprint', 'A PLATFORM SERVICES rack group', 'Account protection improves only after live gateway construction', 'RACK_GROUP', 'security-1', null, 'PLATFORM_SERVICES', 4_500_000, 3_200_000, 6_500_000, 60_000, 90_000, 6, 2, 1, 1, 2, '#fb7185'),
    research('giga-campus', 'EXPERIMENTAL_TECHNOLOGY', 'Experimental Technology', 'Giga Campus', 'TITAN', 'Prove the land, power and network thesis for a future owned hyperscale campus.', 'Giga Campus construction planning for Phase 8', 'Future Construction Planning · no facility is created', 'Unlocks a build plan; construction, land and equipment still require separate approval', 'CONSTRUCTION_PROGRAM', null, null, null, 35_000_000, 24_000_000, 0, 0, 420_000, 18, 4, 2, 2, 0, '#4ade80'),
    { ...research('localization-foundation', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Localization Foundation', 'LINGUA BASE', 'Establish language-master governance, vendor QA and rights-safe localization handoffs.', 'Localization Foundation operating capability', 'Technology Campus · Content Pipeline Works', 'Unlocks independent subtitle and dubbing research paths after installation', 'LOCALIZATION_CAPABILITY', null, null, null, 4_000_000, 2_400_000, 5_000_000, 55_000, 75_000, 5, 1, 1, 1, 2, '#fbbf24'), mappedLocalizationCapabilityId: 'LOCALIZATION_FOUNDATION' },
    { ...research('subtitle-operations-l1', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Subtitle Operations I', 'SCRIPTLINE I', 'Build repeatable subtitle timing, translation and review workflows.', 'Subtitle Operations Level 1 capability', 'Technology Campus · Content Pipeline Works', 'Enables basic subtitle assets in activated languages', 'LOCALIZATION_CAPABILITY', null, null, null, 3_500_000, 2_000_000, 4_500_000, 45_000, 65_000, 4, 1, 1, 1, 2, '#fde047'), mappedLocalizationCapabilityId: 'SUBTITLE_OPERATIONS_L1' },
    { ...research('subtitle-operations-l2', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Subtitle Operations II', 'SCRIPTLINE II', 'Add specialist review, accessibility conventions and faster multi-title coordination.', 'Subtitle Operations Level 2 capability', 'Technology Campus · Content Pipeline Works', 'Improves subtitle quality and throughput', 'LOCALIZATION_CAPABILITY', null, null, null, 7_000_000, 4_000_000, 11_000_000, 85_000, 115_000, 8, 2, 1, 1, 3, '#facc15'), mappedLocalizationCapabilityId: 'SUBTITLE_OPERATIONS_L2' },
    { ...research('subtitle-operations-l3', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Subtitle Operations III', 'SCRIPTLINE III', 'Run premium, accessibility-rich subtitle publishing across a global release slate.', 'Subtitle Operations Level 3 capability', 'Technology Campus · Content Pipeline Works', 'Unlocks premium subtitle quality and high-capacity release support', 'LOCALIZATION_CAPABILITY', null, null, null, 15_000_000, 8_000_000, 28_000_000, 175_000, 235_000, 13, 3, 1, 1, 4, '#eab308'), mappedLocalizationCapabilityId: 'SUBTITLE_OPERATIONS_L3' },
    { ...research('dubbing-operations-l1', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Dubbing Operations I', 'VOICEHOUSE I', 'Establish casting, recording, dialogue adaptation and mix approval for dubbed masters.', 'Dubbing Operations Level 1 capability', 'Technology Campus · Content Pipeline Works', 'Enables basic dubbed assets in activated languages', 'LOCALIZATION_CAPABILITY', null, null, null, 6_000_000, 3_500_000, 9_000_000, 90_000, 125_000, 7, 2, 1, 1, 3, '#fb923c'), mappedLocalizationCapabilityId: 'DUBBING_OPERATIONS_L1' },
    { ...research('dubbing-operations-l2', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Dubbing Operations II', 'VOICEHOUSE II', 'Coordinate premium voice talent, cultural adaptation and multi-market dub schedules.', 'Dubbing Operations Level 2 capability', 'Technology Campus · Content Pipeline Works', 'Improves dub quality and production throughput', 'LOCALIZATION_CAPABILITY', null, null, null, 14_000_000, 7_500_000, 26_000_000, 190_000, 260_000, 14, 3, 1, 1, 4, '#f97316'), mappedLocalizationCapabilityId: 'DUBBING_OPERATIONS_L2' },
    { ...research('dubbing-operations-l3', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Dubbing Operations III', 'VOICEHOUSE III', 'Operate premium global dubbing with dense casting, mix and editorial capacity.', 'Dubbing Operations Level 3 capability', 'Technology Campus · Content Pipeline Works', 'Unlocks premium global dub quality and capacity', 'LOCALIZATION_CAPABILITY', null, null, null, 28_000_000, 15_000_000, 58_000_000, 380_000, 510_000, 22, 4, 2, 1, 5, '#ea580c'), mappedLocalizationCapabilityId: 'DUBBING_OPERATIONS_L3' },
    { ...research('simultaneous-localization', 'STREAMING_EXPERIENCE', 'Streaming Experience', 'Simultaneous Localization', 'DAYBREAK', 'Coordinate locked scripts, voice production and subtitle masters for synchronized global premieres.', 'Simultaneous Localization capability', 'Technology Campus · Content Pipeline Works', 'Reduces localization delay for global event releases', 'LOCALIZATION_CAPABILITY', null, null, null, 24_000_000, 13_000_000, 46_000_000, 320_000, 430_000, 20, 4, 1, 1, 5, '#f59e0b'), mappedLocalizationCapabilityId: 'SIMULTANEOUS_LOCALIZATION' },
];

export const STREAMING_RESEARCH_LIFECYCLE_LABELS = ['Research', 'Prototype', 'Test', 'Patent or License', 'Install', 'Operate'] as const;

const ledgerEntry = (
    platform: OwnedStreamingPlatformState,
    key: string,
    absoluteWeek: number,
    summary: string,
    source: 'PLAYER_ACTION' | 'WEEK_PROCESSOR',
    metadata: Record<string, string | number | boolean | null>,
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type: source === 'PLAYER_ACTION' ? 'TECHNOLOGY_PROJECT_STARTED' : 'TECHNOLOGY_PROJECT_COMPLETED',
    summary,
    source,
    metadata,
});

export const findStreamingResearchDefinitionForTechnology = (technologyId: string): StreamingResearchDefinition | null => (
    STREAMING_RESEARCH_DEFINITIONS.find(item => item.mappedTechnologyId === technologyId) || null
);

export const findStreamingResearchDefinitionForProduct = (lineId: string): StreamingResearchDefinition | null => (
    STREAMING_RESEARCH_DEFINITIONS.find(item => item.mappedProductLineId === lineId) || null
);

export const hasStreamingRackDuty = (platform: OwnedStreamingPlatformState, duty: StreamingRackDuty): boolean => (
    Boolean(platform.infrastructureSetup?.facilities?.some(facility => facility.rackGroups?.some(group => group.duty === duty && group.rackCount > 0)))
);

export const getStreamingResearchInstallationBlockers = (
    platform: OwnedStreamingPlatformState,
    definition: StreamingResearchDefinition,
): string[] => {
    const blockers: string[] = [];
    if (definition.requiredRackDuty && !hasStreamingRackDuty(platform, definition.requiredRackDuty)) {
        blockers.push(`${definition.requiredRackDuty.replaceAll('_', ' ')} rack group required`);
    }
    if (definition.id === 'immersion-cooling' && !getImmersionCoolingCompatibleFacilities(platform).length) {
        blockers.push('Commission a compatible private facility first');
    }
    if (definition.mappedLocalizationCapabilityId) {
        const capability = STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.find(
            item => item.id === definition.mappedLocalizationCapabilityId,
        );
        const installedCapabilityIds = new Set(platform.capabilities.installed
            .filter(item => item.status === 'OPERATING' || item.status === 'LEGACY_GRANT')
            .map(item => item.capabilityId));
        for (const prerequisiteId of capability?.prerequisiteIds || []) {
            if (!installedCapabilityIds.has(prerequisiteId)) blockers.push(`${prerequisiteId.replaceAll('_', ' ')} required`);
        }
        const contentOperationsLevel = Math.max(
            platform.capabilities.legacyLevelFloors.CONTENT_OPERATIONS || 0,
            ...platform.technologyProjects
                .filter(project => project.status === 'COMPLETED' && project.branch === 'CONTENT_OPERATIONS')
                .map(project => project.targetLevel),
        );
        if (capability && contentOperationsLevel < capability.contentOperationsFloor) {
            blockers.push(`Content Operations level ${capability.contentOperationsFloor} required`);
        }
    }
    return blockers;
};

export interface StreamingResearchProgramView {
    definition: StreamingResearchDefinition;
    program: OwnedStreamingResearchProgram | null;
    status: 'AVAILABLE' | 'LOCKED' | StreamingResearchLifecycleStage;
    blockers: string[];
}

export const getStreamingResearchPortfolio = (player: Player): {
    available: boolean;
    activeProgram: OwnedStreamingResearchProgram | null;
    programs: StreamingResearchProgramView[];
    weeklyOperatingCost: number;
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const available = platform.lifecycle === 'ACTIVE' && Boolean(platform.infrastructureSetup);
    const activeProgram = platform.researchPrograms.find(program => ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP'].includes(program.stage)) || null;
    return {
        available,
        activeProgram,
        programs: STREAMING_RESEARCH_DEFINITIONS.map(definition => {
            const program = platform.researchPrograms.find(item => item.definitionId === definition.id) || null;
            const blockers = program?.stage === 'READY_TO_INSTALL'
                ? getStreamingResearchInstallationBlockers(platform, definition)
                : [];
            return {
                definition,
                program,
                status: program?.stage || (available && !activeProgram ? 'AVAILABLE' : 'LOCKED'),
                blockers,
            };
        }),
        weeklyOperatingCost: getStreamingResearchWeeklyCost(platform),
    };
};

export const startStreamingResearchProgram = (
    player: Player,
    definitionId: string,
    buildMode: StreamingTechnologyBuildMode,
): { player: Player; changed: boolean; reason?: string; program?: OwnedStreamingResearchProgram } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.infrastructureSetup) return { player, changed: false, reason: 'Research Campus is not operating.' };
    if (platform.researchPrograms.some(program => ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP'].includes(program.stage))) return { player, changed: false, reason: 'Finish the active research pipeline first.' };
    if (platform.researchPrograms.some(program => program.definitionId === definitionId)) return { player, changed: false, reason: 'This program already exists.' };
    const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === definitionId);
    if (!definition) return { player, changed: false, reason: 'Research program not found.' };
    const preview = previewStreamingResearchProgram(definition, buildMode);
    const researchCost = preview.researchCost;
    if (platform.treasuryCash < researchCost) return { player, changed: false, reason: 'The platform treasury cannot fund this research program.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `research-program:${definition.id}`;
    const program = createStreamingResearchProgram({ seed: platform.simulationSeed, definition, buildMode, absoluteWeek, idempotencyKey });
    const ledger = ledgerEntry(platform, `${idempotencyKey}:research-started`, absoluteWeek, `${definition.title} entered formal research. No installation benefit has been granted.`, 'PLAYER_ACTION', { definitionId, researchCost, stage: 'RESEARCHING' });
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - researchCost,
                researchPrograms: [...platform.researchPrograms, program],
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        program,
    };
};

export const advanceDueStreamingResearchPrograms = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): { platform: OwnedStreamingPlatformState; advancedPrograms: OwnedStreamingResearchProgram[]; ledgerEntries: OwnedStreamingLedgerEntry[] } => {
    const advancedPrograms: OwnedStreamingResearchProgram[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    let nextInfrastructureSetup = platformValue.infrastructureSetup;
    let nextCapabilities = platformValue.capabilities;
    const researchPrograms = platformValue.researchPrograms.map(program => {
        if (absoluteWeek < program.stageReadyAtAbsoluteWeek) return program;
        let advanced = advanceStreamingResearchStage(program, absoluteWeek);
        if (advanced === program) return program;
        const nextStage = advanced.stage;
        if (nextStage === 'OPERATING' && program.installationTargetType === 'FACILITY' && nextInfrastructureSetup?.facilities) {
            const targetFacility = nextInfrastructureSetup.facilities.find(facility => facility.id === program.installationTargetId);
            const weeklyEfficiencySaving = Math.min(120_000, Math.max(40_000, (targetFacility?.installedRacks || 1) * 5_000));
            nextInfrastructureSetup = {
                ...nextInfrastructureSetup,
                weeklyOperatingCost: Math.max(0, nextInfrastructureSetup.weeklyOperatingCost - weeklyEfficiencySaving),
                physicalSummary: nextInfrastructureSetup.physicalSummary ? {
                    ...nextInfrastructureSetup.physicalSummary,
                    energyKwhWeekly: Math.round(nextInfrastructureSetup.physicalSummary.energyKwhWeekly * .9),
                    physicalWeeklyOperatingCost: Math.max(0, nextInfrastructureSetup.physicalSummary.physicalWeeklyOperatingCost - weeklyEfficiencySaving),
                    sustainabilityScore: Math.min(100, nextInfrastructureSetup.physicalSummary.sustainabilityScore + 3),
                } : undefined,
                facilities: nextInfrastructureSetup.facilities.map(facility => facility.id !== program.installationTargetId || !facility.physical
                    ? facility
                    : {
                        ...facility,
                        physical: {
                            ...facility.physical,
                            coolingMode: 'IMMERSION',
                            coolingCapacityKw: Math.round(facility.physical.coolingCapacityKw * 1.35),
                            coolingUpgradeCount: facility.physical.coolingUpgradeCount + 1,
                        },
                    }),
            };
        }
        if (nextStage === 'OPERATING' && program.installationTargetType === 'LOCALIZATION_CAPABILITY') {
            const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === program.definitionId);
            const capabilityId = definition?.mappedLocalizationCapabilityId;
            if (capabilityId && !nextCapabilities.installed.some(item => item.capabilityId === capabilityId)) {
                nextCapabilities = {
                    ...nextCapabilities,
                    installed: [...nextCapabilities.installed, {
                        capabilityId,
                        branch: 'CONTENT_OPERATIONS',
                        status: 'OPERATING',
                        installedAtAbsoluteWeek: absoluteWeek,
                        sourceProjectId: program.id,
                        legacyLevelFloor: 0,
                    }],
                };
            }
        }
        advancedPrograms.push(advanced);
        const key = `${program.idempotencyKey}:stage:${nextStage.toLowerCase()}`;
        ledgerEntries.push(ledgerEntry(platformValue, key, absoluteWeek, `${program.title} advanced to ${nextStage.replaceAll('_', ' ').toLowerCase()}.`, 'WEEK_PROCESSOR', { definitionId: program.definitionId, stage: nextStage, installationTargetId: program.installationTargetId }));
        return advanced;
    });
    if (!advancedPrograms.length) return { platform: platformValue, advancedPrograms, ledgerEntries };
    return {
        platform: {
            ...platformValue,
            infrastructureSetup: nextInfrastructureSetup,
            capabilities: nextCapabilities,
            researchPrograms,
        },
        advancedPrograms,
        ledgerEntries,
    };
};

export const chooseStreamingResearchIpStrategy = (
    player: Player,
    definitionId: string,
    ipStrategy: StreamingResearchIpStrategy,
): { player: Player; changed: boolean; reason?: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const program = platform.researchPrograms.find(item => item.definitionId === definitionId);
    if (!program || program.stage !== 'AWAITING_IP') return { player, changed: false, reason: 'Testing must finish before IP clearance.' };
    const cost = previewStreamingResearchIpCost(program, ipStrategy);
    if (platform.treasuryCash < cost) return { player, changed: false, reason: 'The platform treasury cannot fund this IP strategy.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const rivalInterestPercent = ipStrategy === 'PATENT'
        ? Math.min(100, program.rivalInterestPercent + 24)
        : Math.min(100, program.rivalInterestPercent + 7);
    const key = `${program.idempotencyKey}:ip:${ipStrategy.toLowerCase()}`;
    const ledger = ledgerEntry(platform, key, absoluteWeek, `${program.title} cleared IP through a ${ipStrategy.toLowerCase()} strategy. Installation is now a separate decision.`, 'PLAYER_ACTION', { definitionId, ipStrategy, cost, rivalInterestPercent });
    let changedPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        researchPrograms: platform.researchPrograms.map(item => item.id !== program.id ? item : clearStreamingResearchIp(item, ipStrategy, absoluteWeek)),
        milestoneKeys: definitionId === 'giga-campus'
            ? Array.from(new Set([...platform.milestoneKeys, 'research-unlock:giga-campus']))
            : platform.milestoneKeys,
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    if (ipStrategy === 'PATENT') {
        changedPlatform = queueOwnedStreamingCinematic(changedPlatform, {
            idempotencyKey: `${key}:cinematic`,
            type: 'PATENT_ANNOUNCEMENT',
            priority: 'IMPORTANT',
            availableAtAbsoluteWeek: absoluteWeek,
            title: `${program.title} Patent Announced`,
            factIds: [ledger.id],
        });
    }
    return {
        player: {
            ...player,
            ownedStreamingPlatform: changedPlatform,
        },
        changed: true,
    };
};

const IMMERSION_FACILITY_TYPES: StreamingFacilityType[] = ['PRIVATE_CAGE', 'PRIVATE_SUITE', 'DEDICATED_DATA_HALL', 'OWNED_DATA_CENTRE', 'LEGACY_CAMPUS'];

export const getImmersionCoolingCompatibleFacilities = (platform: OwnedStreamingPlatformState) => (
    (platform.infrastructureSetup?.facilities || []).filter(facility => (
        IMMERSION_FACILITY_TYPES.includes(facility.type)
        && Boolean(facility.physical)
        && facility.physical?.coolingMode !== 'IMMERSION'
    ))
);

export const installStreamingResearchInFacility = (
    player: Player,
    definitionId: string,
    facilityId: string,
): { player: Player; changed: boolean; reason?: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const program = platform.researchPrograms.find(item => item.definitionId === definitionId);
    const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === definitionId);
    if (!program || !definition || program.stage !== 'READY_TO_INSTALL' || definition.installTargetType !== 'FACILITY') return { player, changed: false, reason: 'This facility installation is not ready.' };
    const facility = getImmersionCoolingCompatibleFacilities(platform).find(item => item.id === facilityId);
    if (!facility) return { player, changed: false, reason: 'Choose a commissioned compatible private facility.' };
    if (platform.treasuryCash < program.installationCost) return { player, changed: false, reason: 'The platform treasury cannot fund this installation.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `${program.idempotencyKey}:installation:${facility.id}`;
    const ledger = ledgerEntry(platform, key, absoluteWeek, `${program.title} installation began in ${facility.cityId}. The cooling system stays unchanged until completion.`, 'PLAYER_ACTION', { definitionId, facilityId, installationCost: program.installationCost });
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - program.installationCost,
                researchPrograms: platform.researchPrograms.map(item => item.id !== program.id ? item : beginStreamingResearchInstallation(
                    item,
                    facility.id,
                    `${facility.cityId} · ${facility.type.replaceAll('_', ' ')}`,
                    absoluteWeek,
                    absoluteWeek + Math.max(1, item.installationWeeks),
                )),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

export const installStreamingLocalizationCapability = (
    player: Player,
    definitionId: string,
): { player: Player; changed: boolean; reason?: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const program = platform.researchPrograms.find(item => item.definitionId === definitionId);
    const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === definitionId);
    if (
        !program
        || !definition?.mappedLocalizationCapabilityId
        || program.stage !== 'READY_TO_INSTALL'
        || definition.installTargetType !== 'LOCALIZATION_CAPABILITY'
    ) return { player, changed: false, reason: 'This localization installation is not ready.' };
    const blockers = getStreamingResearchInstallationBlockers(platform, definition);
    if (blockers.length) return { player, changed: false, reason: blockers.join(' · ') };
    if (platform.treasuryCash < program.installationCost) {
        return { player, changed: false, reason: 'The platform treasury cannot fund this installation.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `${program.idempotencyKey}:installation:${definition.mappedLocalizationCapabilityId.toLowerCase()}`;
    const ledger = ledgerEntry(
        platform,
        key,
        absoluteWeek,
        `${definition.title} entered installation in Content Pipeline Works.`,
        'PLAYER_ACTION',
        {
            definitionId,
            capabilityId: definition.mappedLocalizationCapabilityId,
            installationCost: program.installationCost,
        },
    );
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - program.installationCost,
                researchPrograms: platform.researchPrograms.map(item => item.id !== program.id ? item : beginStreamingResearchInstallation(
                    item,
                    definition.mappedLocalizationCapabilityId!,
                    `${definition.title} · Content Pipeline Works`,
                    absoluteWeek,
                    absoluteWeek + Math.max(1, item.installationWeeks),
                )),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

export const markStreamingResearchInstallationStarted = (
    platform: OwnedStreamingPlatformState,
    targetType: 'TECHNOLOGY_PROJECT' | 'PRODUCT_LINE',
    targetId: string,
    targetLabel: string,
    readyAtAbsoluteWeek: number,
): OwnedStreamingPlatformState => ({
    ...platform,
    researchPrograms: platform.researchPrograms.map(program => {
        const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === program.definitionId);
        const matches = targetType === 'TECHNOLOGY_PROJECT'
            ? definition?.mappedTechnologyId === targetId
            : definition?.mappedProductLineId === targetId;
        if (!matches || program.stage !== 'READY_TO_INSTALL') return program;
        const rackTarget = definition?.requiredRackDuty
            ? (platform.infrastructureSetup?.facilities || []).flatMap(facility => (
                (facility.rackGroups || [])
                    .filter(group => group.duty === definition.requiredRackDuty && group.rackCount > 0)
                    .map(group => ({ facility, group }))
            ))[0]
            : null;
        return beginStreamingResearchInstallation(
            program,
            rackTarget?.group.id || targetId,
            rackTarget
                ? `${rackTarget.group.name} · ${rackTarget.facility.cityId} · ${rackTarget.group.duty.replaceAll('_', ' ')}`
                : targetLabel,
            Math.max(program.stageStartedAtAbsoluteWeek, readyAtAbsoluteWeek - Math.max(1, program.installationWeeks)),
            readyAtAbsoluteWeek,
        );
    }),
});

export const markStreamingResearchInstallationOperating = (
    platform: OwnedStreamingPlatformState,
    targetType: 'TECHNOLOGY_PROJECT' | 'PRODUCT_LINE',
    targetId: string,
    absoluteWeek: number,
): OwnedStreamingPlatformState => ({
    ...platform,
    researchPrograms: platform.researchPrograms.map(program => {
        const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === program.definitionId);
        const matches = targetType === 'TECHNOLOGY_PROJECT'
            ? definition?.mappedTechnologyId === targetId
            : definition?.mappedProductLineId === targetId;
        return !matches ? program : completeStreamingResearchInstallation(program, absoluteWeek);
    }),
});

export const getStreamingResearchWeeklyCost = (platform: OwnedStreamingPlatformState): number => (
    platform.researchPrograms
        .filter(program => program.stage === 'OPERATING')
        .reduce((sum, program) => sum + program.weeklyOperatingCost + (program.ipStrategy === 'LICENSE' ? program.licenseWeeklyCost : 0), 0)
);
