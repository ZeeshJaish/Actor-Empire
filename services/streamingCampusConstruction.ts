import type {
    OwnedStreamingCampusEvent,
    OwnedStreamingCampusProject,
    OwnedStreamingFacility,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    Player,
    StreamingCampusConstructionStage,
    StreamingCampusScale,
    StreamingCoolingMode,
    StreamingRackDuty,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { aggregateStreamingFacilities, getDefaultStreamingFacilityPhysical } from './streamingFacilities';
import { getStreamingNetworkPhysicalSummary } from './streamingInfrastructurePhysical';
import { getStreamingFacilityNetworkSnapshot } from './streamingInfrastructure';
import { PRODUCTION_LOCATION_CATALOG, getProductionLocation, getStreamingDataCenterCost } from './productionLocations';

export const STREAMING_CAMPUS_STAGE_ORDER: StreamingCampusConstructionStage[] = [
    'PERMITS', 'UTILITIES', 'DESIGN', 'SYSTEMS', 'DATA_HALLS', 'RACK_INSTALLATION', 'COMMISSIONING',
];

export const STREAMING_CAMPUS_FLOW_LABELS = [
    'Research', 'Land', 'Permits', 'Power & Fibre', 'Design', 'Systems', 'Data Halls', 'Rack Groups', 'Commission', 'Open',
] as const;

export interface StreamingCampusStageOption {
    id: string;
    stage: StreamingCampusConstructionStage;
    title: string;
    description: string;
    consequence: string;
    baseCost: number;
    weeks: number;
    riskModifier: number;
    gigaOnly?: boolean;
    immersionRequired?: boolean;
    hallCount?: number;
    racksPerHall?: number;
}

export const STREAMING_CAMPUS_STAGE_OPTIONS: StreamingCampusStageOption[] = [
    { id: 'PERMIT_STANDARD', stage: 'PERMITS', title: 'Standard filing', description: 'Use the normal planning process with a complete technical submission.', consequence: 'Balanced cost, schedule and local exposure.', baseCost: 6_000_000, weeks: 3, riskModifier: 0 },
    { id: 'PERMIT_FAST_TRACK', stage: 'PERMITS', title: 'Fast-track counsel', description: 'Fund a larger legal and engineering team to move hearings faster.', consequence: 'One week faster, but public scrutiny and delay risk rise.', baseCost: 11_000_000, weeks: 2, riskModifier: 14 },
    { id: 'PERMIT_COMMUNITY', stage: 'PERMITS', title: 'Community compact', description: 'Negotiate jobs, water reporting and neighborhood investment first.', consequence: 'Slower approval with much lower opposition risk.', baseCost: 9_000_000, weeks: 4, riskModifier: -16 },
    { id: 'UTILITY_DUAL', stage: 'UTILITIES', title: 'Dual-grid carrier ring', description: 'Two grid feeds and two independent fibre carriers.', consequence: 'Strong resilience without hyperscale premiums.', baseCost: 36_000_000, weeks: 4, riskModifier: -4 },
    { id: 'UTILITY_RENEWABLE', stage: 'UTILITIES', title: 'Renewable power ring', description: 'Long-term clean-power contract with carrier-grade fibre.', consequence: 'Lower operating cost and stronger sustainability.', baseCost: 44_000_000, weeks: 5, riskModifier: -8 },
    { id: 'UTILITY_HYPERSCALE', stage: 'UTILITIES', title: 'Hyperscale interconnect', description: 'Dedicated substation, dark fibre and three carrier paths.', consequence: 'Highest growth ceiling and grid negotiation exposure.', baseCost: 66_000_000, weeks: 5, riskModifier: 5, gigaOnly: true },
    { id: 'DESIGN_MODULAR', stage: 'DESIGN', title: 'Modular campus', description: 'Repeatable halls that can open and expand in stages.', consequence: 'Fastest expansion path with balanced resilience.', baseCost: 24_000_000, weeks: 3, riskModifier: -3 },
    { id: 'DESIGN_FORTRESS', stage: 'DESIGN', title: 'Reliability fortress', description: 'Separated utility corridors and hardened operating zones.', consequence: 'Higher cost with fewer shared physical failures.', baseCost: 34_000_000, weeks: 4, riskModifier: -10 },
    { id: 'DESIGN_GIGA', stage: 'DESIGN', title: 'Giga Campus spine', description: 'A hyperscale central spine designed for several buildings.', consequence: 'Maximum expansion scale and a larger construction target.', baseCost: 52_000_000, weeks: 5, riskModifier: 4, gigaOnly: true },
    { id: 'SYSTEM_AIR', stage: 'SYSTEMS', title: 'Hardened air plant', description: 'Conventional cooling with N+1 backup generation.', consequence: 'Lower capital, higher long-term energy pressure.', baseCost: 30_000_000, weeks: 4, riskModifier: 3 },
    { id: 'SYSTEM_LIQUID', stage: 'SYSTEMS', title: 'Direct liquid plant', description: 'Liquid loops, N+1 generators and isolated maintenance lanes.', consequence: 'More cooling headroom with balanced water and power use.', baseCost: 46_000_000, weeks: 5, riskModifier: -5 },
    { id: 'SYSTEM_IMMERSION', stage: 'SYSTEMS', title: 'Immersion microgrid', description: 'Immersion tanks, battery reserve and renewable microgrid controls.', consequence: 'Best density and energy profile; Immersion Cooling research required.', baseCost: 72_000_000, weeks: 6, riskModifier: -8, immersionRequired: true },
    { id: 'HALL_ONE', stage: 'DATA_HALLS', title: 'One opening hall', description: 'Construct one 32-position hall for a measured opening.', consequence: 'Lower capital and 32-rack physical ceiling.', baseCost: 42_000_000, weeks: 6, riskModifier: -2, hallCount: 1 },
    { id: 'HALL_TWO', stage: 'DATA_HALLS', title: 'Two opening halls', description: 'Construct two separated halls for scale and maintenance flexibility.', consequence: '64-rack ceiling and stronger workload separation.', baseCost: 78_000_000, weeks: 8, riskModifier: 1, hallCount: 2 },
    { id: 'HALL_THREE', stage: 'DATA_HALLS', title: 'Three-hall opening', description: 'Open a true hyperscale first building with three live halls.', consequence: '96-rack ceiling, largest opening cost and contractor exposure.', baseCost: 112_000_000, weeks: 10, riskModifier: 7, hallCount: 3, gigaOnly: true },
    { id: 'RACK_BALANCED', stage: 'RACK_INSTALLATION', title: 'Balanced platform racks', description: 'Origin, cache, encoding and platform-service groups.', consequence: 'A complete owned-platform workload mix.', baseCost: 34_000_000, weeks: 5, riskModifier: -3, racksPerHall: 24 },
    { id: 'RACK_DELIVERY', stage: 'RACK_INSTALLATION', title: 'Delivery-first racks', description: 'Regional cache, local edge, live delivery and platform services.', consequence: 'More delivery capacity, with no content-origin group.', baseCost: 38_000_000, weeks: 5, riskModifier: 0, racksPerHall: 24 },
    { id: 'RACK_ORIGIN', stage: 'RACK_INSTALLATION', title: 'Origin and encoding racks', description: 'Content origin, encoding and platform-service groups.', consequence: 'A strong master and compression facility.', baseCost: 40_000_000, weeks: 6, riskModifier: 1, racksPerHall: 24 },
    { id: 'COMMISSION_STANDARD', stage: 'COMMISSIONING', title: 'Full commissioning', description: 'Load, failover, cooling, backup and fibre-cut tests.', consequence: 'Required proof before the facility can open.', baseCost: 10_000_000, weeks: 3, riskModifier: 0 },
    { id: 'COMMISSION_FORENSIC', stage: 'COMMISSIONING', title: 'Forensic commissioning', description: 'Full tests plus independent defect and security review.', consequence: 'Slower opening with lower latent-defect and espionage risk.', baseCost: 16_000_000, weeks: 4, riskModifier: -14 },
];

const scaleMultiplier = (scale: StreamingCampusScale): number => scale === 'GIGA_CAMPUS' ? 1.45 : 1;
export const getStreamingCampusRackCeiling = (scale: StreamingCampusScale): number => scale === 'GIGA_CAMPUS' ? 192 : 128;
const roundMoney = (value: number): number => Math.round(value / 100_000) * 100_000;
const hasGigaResearch = (platform: OwnedStreamingPlatformState): boolean => platform.milestoneKeys.includes('research-unlock:giga-campus');
const hasImmersionResearch = (platform: OwnedStreamingPlatformState): boolean => platform.researchPrograms.some(program => program.definitionId === 'immersion-cooling' && ['READY_TO_INSTALL', 'INSTALLING', 'OPERATING'].includes(program.stage));

export const getStreamingCampusStageOptions = (platform: OwnedStreamingPlatformState, project: OwnedStreamingCampusProject): Array<StreamingCampusStageOption & { cost: number; blockers: string[] }> => (
    STREAMING_CAMPUS_STAGE_OPTIONS.filter(option => option.stage === project.stage).map(option => ({
        ...option,
        cost: roundMoney(option.baseCost * scaleMultiplier(project.scale) * (option.stage === 'DATA_HALLS' ? 1 : 1)),
        blockers: [
            ...(option.gigaOnly && project.scale !== 'GIGA_CAMPUS' ? ['Giga Campus scale required'] : []),
            ...(option.immersionRequired && !hasImmersionResearch(platform) ? ['Immersion Cooling research and IP clearance required'] : []),
            ...(project.scale === 'GIGA_CAMPUS' && option.stage === 'DATA_HALLS' && option.hallCount === 1 ? ['Giga Campus requires at least two opening halls'] : []),
        ],
    }))
);

export const getStreamingCampusConstruction = (player: Player) => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const projects = platform.campusProjects;
    const activeProject = projects.find(project => project.status !== 'OPEN') || null;
    return {
        available: platform.lifecycle === 'ACTIVE' && Boolean(platform.infrastructureSetup),
        researchReady: hasGigaResearch(platform),
        activeProject,
        projects,
        cities: PRODUCTION_LOCATION_CATALOG.map(city => ({
            id: city.id,
            name: city.name,
            regionId: city.regionId,
            quality: city.quality,
            landCost: roundMoney(getStreamingDataCenterCost(city) * 1.5),
            gigaLandCost: roundMoney(getStreamingDataCenterCost(city) * 3.2),
        })),
        options: activeProject ? getStreamingCampusStageOptions(platform, activeProject) : [],
    };
};

const actionLedger = (platform: OwnedStreamingPlatformState, key: string, absoluteWeek: number, type: OwnedStreamingLedgerEntry['type'], summary: string, metadata: OwnedStreamingLedgerEntry['metadata']): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key), idempotencyKey: key, absoluteWeek, type, summary, source: 'PLAYER_ACTION', metadata,
});

export const startStreamingCampusProject = (player: Player, cityId: string, scale: StreamingCampusScale): { player: Player; changed: boolean; reason?: string; project?: OwnedStreamingCampusProject } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const city = getProductionLocation(cityId);
    if (platform.lifecycle !== 'ACTIVE' || !platform.infrastructureSetup) return { player, changed: false, reason: 'The live infrastructure company is required.' };
    if (!hasGigaResearch(platform)) return { player, changed: false, reason: 'Complete Giga Campus research and IP clearance first.' };
    if (!city) return { player, changed: false, reason: 'Choose a valid construction city.' };
    if (platform.campusProjects.some(project => project.status !== 'OPEN')) return { player, changed: false, reason: 'Finish the active major construction project first.' };
    const landCost = roundMoney(getStreamingDataCenterCost(city) * (scale === 'GIGA_CAMPUS' ? 3.2 : 1.5));
    if (platform.treasuryCash < landCost) return { player, changed: false, reason: 'The platform treasury cannot buy this land.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `campus-project:${city.id}:${scale}:${platform.campusProjects.length + 1}`;
    const project: OwnedStreamingCampusProject = {
        id: createDeterministicId('streaming_campus', platform.simulationSeed, idempotencyKey), idempotencyKey,
        name: `${city.name} ${scale === 'GIGA_CAMPUS' ? 'Giga Campus' : 'Data Centre'}`, cityId: city.id, scale,
        status: 'AWAITING_DECISION', stage: 'PERMITS', currentStageOptionId: null, campusDesignId: null,
        utilitiesPackageId: null, systemsPackageId: null, rackPackageId: null, hallCount: 0, rackCapacity: 0,
        installedRacks: 0, landCost, capitalCommitted: landCost, weeklyOperatingCost: 0,
        staffRequired: scale === 'GIGA_CAMPUS' ? 42 : 24, startedAtAbsoluteWeek: absoluteWeek,
        stageStartedAtAbsoluteWeek: absoluteWeek, stageReadyAtAbsoluteWeek: absoluteWeek, openedAtAbsoluteWeek: null,
        facilityId: null, events: [], expansionCount: 0, expansionReadyAtAbsoluteWeek: null,
    };
    const ledger = actionLedger(platform, `${idempotencyKey}:land`, absoluteWeek, 'CAMPUS_PROJECT_STARTED', `${project.name} land was acquired. Permits are the next decision.`, { cityId, scale, landCost });
    return { player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, treasuryCash: platform.treasuryCash - landCost, campusProjects: [...platform.campusProjects, project], eventLedger: [...platform.eventLedger, ledger] }, player.id) }, changed: true, project };
};

export const approveStreamingCampusStage = (player: Player, projectId: string, optionId: string): { player: Player; changed: boolean; reason?: string; project?: OwnedStreamingCampusProject } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const project = platform.campusProjects.find(item => item.id === projectId);
    if (!project || project.status !== 'AWAITING_DECISION') return { player, changed: false, reason: 'This construction stage is not awaiting a decision.' };
    const option = getStreamingCampusStageOptions(platform, project).find(item => item.id === optionId);
    if (!option || option.blockers.length) return { player, changed: false, reason: option?.blockers[0] || 'Choose a valid construction option.' };
    if (platform.treasuryCash < option.cost) return { player, changed: false, reason: 'The platform treasury cannot fund this stage.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const changedProject: OwnedStreamingCampusProject = {
        ...project, status: 'IN_PROGRESS', currentStageOptionId: option.id,
        campusDesignId: option.stage === 'DESIGN' ? option.id : project.campusDesignId,
        utilitiesPackageId: option.stage === 'UTILITIES' ? option.id : project.utilitiesPackageId,
        systemsPackageId: option.stage === 'SYSTEMS' ? option.id : project.systemsPackageId,
        rackPackageId: option.stage === 'RACK_INSTALLATION' ? option.id : project.rackPackageId,
        hallCount: option.hallCount || project.hallCount,
        rackCapacity: option.hallCount ? option.hallCount * 32 : project.rackCapacity,
        installedRacks: option.racksPerHall ? Math.min(project.rackCapacity, project.hallCount * option.racksPerHall) : project.installedRacks,
        capitalCommitted: project.capitalCommitted + option.cost,
        stageStartedAtAbsoluteWeek: absoluteWeek,
        stageReadyAtAbsoluteWeek: absoluteWeek + option.weeks,
    };
    const key = `${project.idempotencyKey}:stage:${project.stage.toLowerCase()}:approved`;
    const ledger = actionLedger(platform, key, absoluteWeek, 'CAMPUS_PROJECT_STARTED', `${project.name}: ${option.title} approved for ${project.stage.replaceAll('_', ' ').toLowerCase()}.`, { projectId, stage: project.stage, optionId, cost: option.cost, readyAtAbsoluteWeek: changedProject.stageReadyAtAbsoluteWeek });
    return { player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, treasuryCash: platform.treasuryCash - option.cost, campusProjects: platform.campusProjects.map(item => item.id === project.id ? changedProject : item), eventLedger: [...platform.eventLedger, ledger] }, player.id) }, changed: true, project: changedProject };
};

const EVENT_BY_STAGE: Record<StreamingCampusConstructionStage, OwnedStreamingCampusEvent['type'][]> = {
    PERMITS: ['PERMIT_DELAY', 'LOCAL_OPPOSITION'], UTILITIES: ['GRID_SHORTAGE', 'FIBRE_DISPUTE'],
    DESIGN: ['COOLING_DEFECT', 'INDUSTRIAL_ESPIONAGE'], SYSTEMS: ['WATER_RESTRICTION', 'COOLING_DEFECT'],
    DATA_HALLS: ['CONTRACTOR_OVERRUN', 'LOCAL_OPPOSITION'], RACK_INSTALLATION: ['CONTRACTOR_OVERRUN', 'INDUSTRIAL_ESPIONAGE'],
    COMMISSIONING: ['COOLING_DEFECT', 'FIBRE_DISPUTE'],
};
const EVENT_COPY: Record<OwnedStreamingCampusEvent['type'], [string, string]> = {
    PERMIT_DELAY: ['Permit hearing delayed', 'The planning authority requested another technical hearing.'],
    CONTRACTOR_OVERRUN: ['Contractor overrun', 'Steel, labour and sequencing exceeded the signed allowance.'],
    GRID_SHORTAGE: ['Grid capacity shortage', 'The utility cannot deliver the full reserved feed on the original date.'],
    WATER_RESTRICTION: ['Water restriction', 'Local water rules forced a cooling-system redesign and retest.'],
    LOCAL_OPPOSITION: ['Local opposition', 'Residents demanded additional reporting and community mitigation.'],
    FIBRE_DISPUTE: ['Fibre access dispute', 'A carrier challenged the final route and interconnect terms.'],
    COOLING_DEFECT: ['Cooling-design defect', 'Commissioning models found a heat-removal weakness before opening.'],
    INDUSTRIAL_ESPIONAGE: ['Industrial espionage attempt', 'A rival-linked contractor accessed restricted design material.'],
};

export const resolveStreamingCampusStageEvent = (platform: OwnedStreamingPlatformState, project: OwnedStreamingCampusProject, absoluteWeek: number): OwnedStreamingCampusEvent | null => {
    if (project.events.some(event => event.stage === project.stage)) return null;
    const option = STREAMING_CAMPUS_STAGE_OPTIONS.find(item => item.id === project.currentStageOptionId);
    const rng = createDeterministicRng(`${platform.simulationSeed}:campus-event:${project.id}:${project.stage}`);
    const threshold = Math.max(.08, Math.min(.42, .2 + (option?.riskModifier || 0) / 100));
    if (rng() >= threshold) return null;
    const types = EVENT_BY_STAGE[project.stage];
    const type = types[Math.floor(rng() * types.length)] || types[0];
    const [title, detail] = EVENT_COPY[type];
    const delayWeeks = 1 + Math.floor(rng() * 3);
    const cost = roundMoney((2_500_000 + rng() * 7_500_000) * scaleMultiplier(project.scale));
    return { id: createDeterministicId('streaming_campus_event', platform.simulationSeed, project.id, project.stage), stage: project.stage, type, title, detail, delayWeeks, cost, occurredAtAbsoluteWeek: absoluteWeek };
};

export const completeDueStreamingCampusProjects = (platformValue: OwnedStreamingPlatformState, absoluteWeek: number): { platform: OwnedStreamingPlatformState; completedStages: OwnedStreamingCampusProject[]; openedExpansions: OwnedStreamingCampusProject[]; ledgerEntries: OwnedStreamingLedgerEntry[] } => {
    let treasuryCash = platformValue.treasuryCash;
    let infrastructureSetup = platformValue.infrastructureSetup;
    let capacity = platformValue.capacity;
    const completedStages: OwnedStreamingCampusProject[] = [];
    const openedExpansions: OwnedStreamingCampusProject[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    const campusProjects = platformValue.campusProjects.map(project => {
        if (project.status === 'OPEN' && project.expansionReadyAtAbsoluteWeek != null && absoluteWeek >= project.expansionReadyAtAbsoluteWeek) {
            const addedRacks = Math.min(project.scale === 'GIGA_CAMPUS' ? 32 : 16, getStreamingCampusRackCeiling(project.scale) - project.installedRacks);
            const expanded = { ...project, installedRacks: project.installedRacks + addedRacks, rackCapacity: Math.min(getStreamingCampusRackCeiling(project.scale), Math.max(project.rackCapacity + 32, project.installedRacks + addedRacks)), hallCount: project.hallCount + 1, weeklyOperatingCost: project.weeklyOperatingCost + addedRacks * 7_500, expansionCount: project.expansionCount + 1, expansionReadyAtAbsoluteWeek: null };
            if (infrastructureSetup?.facilities) {
                const facilitiesBefore = infrastructureSetup.facilities;
                const facilities = facilitiesBefore.map(facility => facility.id !== project.facilityId ? facility : expandFacilityRacks(facility, addedRacks));
                const beforeNetwork = getStreamingFacilityNetworkSnapshot(platformValue, facilitiesBefore);
                const afterNetwork = getStreamingFacilityNetworkSnapshot(platformValue, facilities);
                const summary = getStreamingNetworkPhysicalSummary(facilities);
                capacity = { baselineConcurrentStreams: capacity.baselineConcurrentStreams + afterNetwork.baselineConcurrentStreams - beforeNetwork.baselineConcurrentStreams, burstConcurrentStreams: capacity.burstConcurrentStreams + afterNetwork.burstConcurrentStreams - beforeNetwork.burstConcurrentStreams };
                infrastructureSetup = { ...infrastructureSetup, facilities, networkPlacements: aggregateStreamingFacilities(facilities), storageCapacityHours: infrastructureSetup.storageCapacityHours + afterNetwork.storageCapacityHours - beforeNetwork.storageCapacityHours, reliabilityTarget: infrastructureSetup.reliabilityTarget + afterNetwork.reliabilityTarget - beforeNetwork.reliabilityTarget, staffRequired: infrastructureSetup.staffRequired + afterNetwork.staffRequired - beforeNetwork.staffRequired, weeklyOperatingCost: infrastructureSetup.weeklyOperatingCost + addedRacks * 7_500, physicalSummary: { energyKwhWeekly: summary.energyKwhWeekly, waterLitresWeekly: summary.waterLitresWeekly, physicalWeeklyOperatingCost: summary.weeklyOperatingCost, sustainabilityScore: summary.sustainabilityScore, publicReputation: summary.publicReputation, reliabilityPercent: summary.reliabilityPercent, backupCoveragePercent: summary.backupCoveragePercent, limitingFactors: summary.limitingFactors } };
            }
            openedExpansions.push(expanded);
            ledgerEntries.push({ ...actionLedger(platformValue, `${project.idempotencyKey}:expansion:${expanded.expansionCount}:opened`, absoluteWeek, 'CAMPUS_STAGE_COMPLETED', `${project.name} opened an additional rack expansion.`, { projectId: project.id, addedRacks }), source: 'WEEK_PROCESSOR' });
            return expanded;
        }
        if (!['IN_PROGRESS', 'DELAYED'].includes(project.status) || absoluteWeek < project.stageReadyAtAbsoluteWeek) return project;
        const event = resolveStreamingCampusStageEvent(platformValue, project, absoluteWeek);
        if (event) {
            treasuryCash = Math.max(0, treasuryCash - event.cost);
            const delayed = { ...project, status: 'DELAYED' as const, capitalCommitted: project.capitalCommitted + event.cost, stageReadyAtAbsoluteWeek: absoluteWeek + event.delayWeeks, events: [...project.events, event] };
            ledgerEntries.push({ ...actionLedger(platformValue, `${project.idempotencyKey}:event:${project.stage.toLowerCase()}`, absoluteWeek, 'CAMPUS_STAGE_COMPLETED', `${project.name}: ${event.title} added ${event.delayWeeks} week${event.delayWeeks === 1 ? '' : 's'}.`, { projectId: project.id, eventType: event.type, delayWeeks: event.delayWeeks, cost: event.cost }), source: 'WEEK_PROCESSOR' });
            return delayed;
        }
        const stageIndex = STREAMING_CAMPUS_STAGE_ORDER.indexOf(project.stage);
        const nextStage = STREAMING_CAMPUS_STAGE_ORDER[stageIndex + 1] || null;
        const completed = { ...project, status: nextStage ? 'AWAITING_DECISION' as const : 'READY_TO_OPEN' as const, stage: nextStage || project.stage, currentStageOptionId: null, stageStartedAtAbsoluteWeek: absoluteWeek, stageReadyAtAbsoluteWeek: absoluteWeek };
        completedStages.push(completed);
        ledgerEntries.push({ ...actionLedger(platformValue, `${project.idempotencyKey}:stage:${project.stage.toLowerCase()}:completed`, absoluteWeek, 'CAMPUS_STAGE_COMPLETED', `${project.name} completed ${project.stage.replaceAll('_', ' ').toLowerCase()}.`, { projectId: project.id, completedStage: project.stage, nextStage }), source: 'WEEK_PROCESSOR' });
        return completed;
    });
    return { platform: { ...platformValue, treasuryCash, infrastructureSetup, capacity, campusProjects }, completedStages, openedExpansions, ledgerEntries };
};

const rackGroupsFor = (project: OwnedStreamingCampusProject): OwnedStreamingFacility['rackGroups'] => {
    const total = project.installedRacks;
    const split = (parts: Array<[StreamingRackDuty, number]>): OwnedStreamingFacility['rackGroups'] => {
        let used = 0;
        return parts.map(([duty, share], index) => {
            const rackCount = index === parts.length - 1 ? total - used : Math.max(1, Math.round(total * share));
            used += rackCount;
            return { id: `${project.id}-rack-${index + 1}`, name: duty.replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase()), rackCount, duty };
        });
    };
    if (project.rackPackageId === 'RACK_DELIVERY') return split([['REGIONAL_CACHE', .4], ['LOCAL_EDGE', .25], ['LIVE_EVENT', .2], ['PLATFORM_SERVICES', .15]]);
    if (project.rackPackageId === 'RACK_ORIGIN') return split([['CONTENT_ORIGIN', .4], ['ENCODING', .3], ['PLATFORM_SERVICES', .3]]);
    return split([['CONTENT_ORIGIN', .25], ['REGIONAL_CACHE', .3], ['ENCODING', .2], ['PLATFORM_SERVICES', .25]]);
};

const coolingFor = (project: OwnedStreamingCampusProject): StreamingCoolingMode => project.systemsPackageId === 'SYSTEM_IMMERSION' ? 'IMMERSION' : project.systemsPackageId === 'SYSTEM_LIQUID' ? 'DIRECT_LIQUID' : 'AIR';
const buildOwnedFacility = (project: OwnedStreamingCampusProject, absoluteWeek: number): OwnedStreamingFacility => {
    const facilityId = createDeterministicId('streaming_owned_facility', project.id, project.cityId);
    const physical = getDefaultStreamingFacilityPhysical('OWNED_DATA_CENTRE', project.installedRacks);
    const utilityPowerFactor = project.utilitiesPackageId === 'UTILITY_HYPERSCALE' ? 1.3 : project.utilitiesPackageId === 'UTILITY_RENEWABLE' ? 1.12 : 1;
    return { id: facilityId, cityId: project.cityId, type: 'OWNED_DATA_CENTRE', installedRacks: project.installedRacks, role: project.rackPackageId === 'RACK_DELIVERY' ? 'REGIONAL_HUB' : 'CORE_ORIGIN', rackGroups: rackGroupsFor(project), physical: { ...physical, powerContractKw: Math.round(physical.powerContractKw * utilityPowerFactor), backupPowerKw: Math.round(physical.backupPowerKw * utilityPowerFactor), coolingMode: coolingFor(project), coolingCapacityKw: Math.round(physical.coolingCapacityKw * (coolingFor(project) === 'IMMERSION' ? 1.35 : coolingFor(project) === 'DIRECT_LIQUID' ? 1.15 : 1)), bandwidthMbps: Math.round(physical.bandwidthMbps * (project.utilitiesPackageId === 'UTILITY_HYPERSCALE' ? 1.5 : 1)), burstBandwidthMbps: Math.round(physical.burstBandwidthMbps * (project.utilitiesPackageId === 'UTILITY_HYPERSCALE' ? 1.5 : 1)), maintenanceConditionPercent: 100, lastMaintenanceAbsoluteWeek: absoluteWeek } };
};

export const openStreamingCampusFacility = (player: Player, projectId: string): { player: Player; changed: boolean; reason?: string; facility?: OwnedStreamingFacility } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const project = platform.campusProjects.find(item => item.id === projectId);
    if (!project || project.status !== 'READY_TO_OPEN' || !platform.infrastructureSetup) return { player, changed: false, reason: 'Commissioning must pass before opening.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const facility = buildOwnedFacility(project, absoluteWeek);
    const facilities = [...(platform.infrastructureSetup.facilities || []), facility];
    const physical = getStreamingNetworkPhysicalSummary(facilities);
    const weeklyOperatingCost = roundMoney((project.installedRacks * 9_000 + project.hallCount * 140_000) * (project.systemsPackageId === 'SYSTEM_IMMERSION' ? .82 : project.systemsPackageId === 'SYSTEM_LIQUID' ? .92 : 1));
    const openedProject = { ...project, status: 'OPEN' as const, openedAtAbsoluteWeek: absoluteWeek, facilityId: facility.id, weeklyOperatingCost };
    const key = `${project.idempotencyKey}:opened`;
    const ledger = actionLedger(platform, key, absoluteWeek, 'CAMPUS_OPENED', `${project.name} opened with ${project.installedRacks} commissioned racks across ${project.hallCount} hall${project.hallCount === 1 ? '' : 's'}.`, { projectId, facilityId: facility.id, cityId: project.cityId, installedRacks: project.installedRacks, capitalCommitted: project.capitalCommitted });
    const researchPrograms = platform.researchPrograms.map(program => program.definitionId !== 'giga-campus' || !['READY_TO_INSTALL', 'INSTALLING'].includes(program.stage) ? program : { ...program, stage: 'OPERATING' as const, installationTargetId: project.id, installationTargetLabel: project.name, stageStartedAtAbsoluteWeek: absoluteWeek, stageReadyAtAbsoluteWeek: absoluteWeek, completedAtAbsoluteWeek: absoluteWeek });
    const facilitiesBefore = platform.infrastructureSetup.facilities || [];
    const beforeNetwork = getStreamingFacilityNetworkSnapshot(platform, facilitiesBefore);
    const afterNetwork = getStreamingFacilityNetworkSnapshot(platform, facilities);
    const infrastructureSetup = { ...platform.infrastructureSetup, facilities, networkPlacements: aggregateStreamingFacilities(facilities), storageCapacityHours: platform.infrastructureSetup.storageCapacityHours + afterNetwork.storageCapacityHours - beforeNetwork.storageCapacityHours, reliabilityTarget: platform.infrastructureSetup.reliabilityTarget + afterNetwork.reliabilityTarget - beforeNetwork.reliabilityTarget, staffRequired: platform.infrastructureSetup.staffRequired + project.staffRequired, weeklyOperatingCost: platform.infrastructureSetup.weeklyOperatingCost + weeklyOperatingCost, capitalInvested: platform.infrastructureSetup.capitalInvested + project.capitalCommitted, physicalSummary: { energyKwhWeekly: physical.energyKwhWeekly, waterLitresWeekly: physical.waterLitresWeekly, physicalWeeklyOperatingCost: physical.weeklyOperatingCost, sustainabilityScore: physical.sustainabilityScore, publicReputation: physical.publicReputation, reliabilityPercent: physical.reliabilityPercent, backupCoveragePercent: physical.backupCoveragePercent, limitingFactors: physical.limitingFactors } };
    const capacity = { baselineConcurrentStreams: platform.capacity.baselineConcurrentStreams + afterNetwork.baselineConcurrentStreams - beforeNetwork.baselineConcurrentStreams, burstConcurrentStreams: platform.capacity.burstConcurrentStreams + afterNetwork.burstConcurrentStreams - beforeNetwork.burstConcurrentStreams };
    return { player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, infrastructureSetup, capacity, researchPrograms, campusProjects: platform.campusProjects.map(item => item.id === project.id ? openedProject : item), milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'owned-data-centre-opened', ...(project.scale === 'GIGA_CAMPUS' ? ['giga-campus-opened'] : [])])), eventLedger: [...platform.eventLedger, ledger], cinematicQueue: [...platform.cinematicQueue, { id: createDeterministicId('streaming_cinematic', platform.simulationSeed, key), idempotencyKey: `${key}:cinematic`, type: 'FACILITY_OPENING', status: 'QUEUED', priority: 'MAJOR', availableAtAbsoluteWeek: absoluteWeek, title: `${project.name} Opens`, factIds: [ledger.id] }] }, player.id) }, changed: true, facility };
};

const expandFacilityRacks = (facility: OwnedStreamingFacility, addedRacks: number): OwnedStreamingFacility => {
    const installedRacks = facility.installedRacks + addedRacks;
    const groups = facility.rackGroups?.length ? facility.rackGroups.map((group, index) => index === facility.rackGroups!.length - 1 ? { ...group, rackCount: group.rackCount + addedRacks } : group) : facility.rackGroups;
    const physical = facility.physical ? { ...facility.physical, powerContractKw: facility.physical.powerContractKw + addedRacks * 18, backupPowerKw: facility.physical.backupPowerKw + addedRacks * 14, coolingCapacityKw: facility.physical.coolingCapacityKw + addedRacks * 12, bandwidthMbps: facility.physical.bandwidthMbps + addedRacks * 5_000, burstBandwidthMbps: facility.physical.burstBandwidthMbps + addedRacks * 7_500 } : facility.physical;
    return { ...facility, installedRacks, rackGroups: groups, physical };
};

export const startStreamingCampusExpansion = (player: Player, projectId: string): { player: Player; changed: boolean; reason?: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const project = platform.campusProjects.find(item => item.id === projectId);
    if (!project || project.status !== 'OPEN' || project.expansionReadyAtAbsoluteWeek != null) return { player, changed: false, reason: 'This campus cannot begin another expansion now.' };
    if (project.installedRacks >= getStreamingCampusRackCeiling(project.scale)) return { player, changed: false, reason: 'This campus has reached its current multi-building ceiling.' };
    const cost = project.scale === 'GIGA_CAMPUS' ? 82_000_000 : 54_000_000;
    if (platform.treasuryCash < cost) return { player, changed: false, reason: 'The platform treasury cannot fund this expansion.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const readyAt = absoluteWeek + (project.scale === 'GIGA_CAMPUS' ? 7 : 6);
    return { player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, treasuryCash: platform.treasuryCash - cost, campusProjects: platform.campusProjects.map(item => item.id !== project.id ? item : { ...item, capitalCommitted: item.capitalCommitted + cost, expansionReadyAtAbsoluteWeek: readyAt }), eventLedger: [...platform.eventLedger, actionLedger(platform, `${project.idempotencyKey}:expansion:${project.expansionCount + 1}:started`, absoluteWeek, 'CAMPUS_PROJECT_STARTED', `${project.name} began an additional building expansion.`, { projectId, cost, readyAtAbsoluteWeek: readyAt })] }, player.id) }, changed: true };
};
