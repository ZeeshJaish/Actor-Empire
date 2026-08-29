import type {
    OwnedStreamingCinematicType,
    OwnedStreamingInfrastructureAward,
    OwnedStreamingInfrastructurePerformancePoint,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingWeeklySnapshot,
    Player,
    StreamingInfrastructureAwardCategory,
    StreamingInfrastructureProgressionTier,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';
import { getStreamingNetworkPhysicalSummary } from './streamingInfrastructurePhysical';

const clamp = (value: number, minimum = 0, maximum = 100): number => Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);
const TIER_ORDER: StreamingInfrastructureProgressionTier[] = ['RENTED_CABINET', 'PRIVATE_CAGE', 'DEDICATED_HALL', 'OWNED_DATA_CENTRE', 'GLOBAL_HYPERSCALE_CAMPUS'];

export const STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES: Array<{
    id: StreamingInfrastructureProgressionTier;
    label: string;
    kicker: string;
    description: string;
}> = [
    { id: 'RENTED_CABINET', label: 'Rented Cabinet', kicker: 'THE FIRST MACHINES', description: 'A leased footprint proves the company can deliver real streams.' },
    { id: 'PRIVATE_CAGE', label: 'Private Cage', kicker: 'CONTROLLED FLOORSPACE', description: 'Dedicated space, power, cooling and fibre become a managed operating system.' },
    { id: 'DEDICATED_HALL', label: 'Dedicated Hall', kicker: 'INDUSTRIAL SCALE', description: 'A full hall carries specialized rack groups and higher physical responsibility.' },
    { id: 'OWNED_DATA_CENTRE', label: 'Owned Data Centre', kicker: 'THE LAND IS YOURS', description: 'Construction capital becomes a permanent owned delivery asset.' },
    { id: 'GLOBAL_HYPERSCALE_CAMPUS', label: 'Global Hyperscale Campus', kicker: 'PLANETARY BACKBONE', description: 'A commissioned Giga Campus represents the final physical infrastructure tier.' },
];

const tierIndex = (tier: StreamingInfrastructureProgressionTier): number => TIER_ORDER.indexOf(tier);

export const resolveStreamingInfrastructureProgressionTier = (
    value: OwnedStreamingPlatformState,
): StreamingInfrastructureProgressionTier => {
    const platform = normalizeOwnedStreamingPlatformState(value);
    const facilities = platform.infrastructureSetup?.facilities || [];
    const hasOpenGiga = platform.campusProjects.some(project => project.scale === 'GIGA_CAMPUS' && project.status === 'OPEN');
    if (hasOpenGiga) return 'GLOBAL_HYPERSCALE_CAMPUS';
    if (facilities.some(facility => facility.type === 'OWNED_DATA_CENTRE' || facility.type === 'LEGACY_CAMPUS')) return 'OWNED_DATA_CENTRE';
    if (facilities.some(facility => facility.type === 'DEDICATED_DATA_HALL')) return 'DEDICATED_HALL';
    if (facilities.some(facility => ['PRIVATE_CAGE', 'PRIVATE_SUITE'].includes(facility.type))) return 'PRIVATE_CAGE';
    return 'RENTED_CABINET';
};

const milestoneFact = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    key: string,
    summary: string,
    metadata: OwnedStreamingLedgerEntry['metadata'],
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type: 'MILESTONE_REACHED',
    summary,
    source: 'WEEK_PROCESSOR',
    metadata,
});

const awardDefinition = (
    category: StreamingInfrastructureAwardCategory,
): { title: string; cinematicTitle: string } => ({
    RELIABILITY_LEADERSHIP: { title: 'Global Reliability Standard', cinematicTitle: 'The Signal Never Broke' },
    RECOVERY_EXCELLENCE: { title: 'Recovery Command Citation', cinematicTitle: 'The Network Came Back' },
    SUSTAINABLE_SCALE: { title: 'Sustainable Infrastructure Laureate', cinematicTitle: 'Scale Without Waste' },
    GLOBAL_BACKBONE: { title: 'Global Backbone Distinction', cinematicTitle: 'A Planetary Network' },
}[category]);

const createAward = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    category: StreamingInfrastructureAwardCategory,
    evidence: string,
    score: number,
): { award: OwnedStreamingInfrastructureAward; fact: OwnedStreamingLedgerEntry } => {
    const key = `infrastructure-award:${category.toLowerCase()}`;
    const definition = awardDefinition(category);
    const fact = milestoneFact(platform, absoluteWeek, key, `${definition.title}: ${evidence}`, { category, score });
    return {
        award: {
            id: createDeterministicId('streaming_infrastructure_award', platform.simulationSeed, key),
            idempotencyKey: key,
            category,
            title: definition.title,
            evidence,
            score: clamp(score),
            awardedAtAbsoluteWeek: absoluteWeek,
            factId: fact.id,
        },
        fact,
    };
};

const sourceCinematic = (fact: OwnedStreamingLedgerEntry): { type: OwnedStreamingCinematicType; title: string; priority: 'STANDARD' | 'IMPORTANT' | 'MAJOR' } | null => {
    if (fact.type === 'CAMPUS_STAGE_COMPLETED' && ['DESIGN', 'DATA_HALLS', 'COMMISSIONING'].includes(String(fact.metadata?.completedStage || ''))) {
        return { type: 'GIGA_CAMPUS_CONSTRUCTION', title: fact.summary, priority: 'IMPORTANT' };
    }
    if (fact.type === 'CAMPUS_OPENED') return { type: 'FACILITY_OPENING', title: fact.summary, priority: 'MAJOR' };
    if (fact.type === 'TECHNOLOGY_PROJECT_STARTED' && fact.metadata?.ipStrategy === 'PATENT') return { type: 'PATENT_ANNOUNCEMENT', title: fact.summary, priority: 'IMPORTANT' };
    if (fact.type === 'INFRASTRUCTURE_INCIDENT_RECOVERED') return { type: 'INFRASTRUCTURE_RECOVERY', title: fact.summary, priority: 'IMPORTANT' };
    if (fact.type === 'INFRASTRUCTURE_INCIDENT_DETECTED' && fact.metadata?.type === 'RIVAL_SABOTAGE') return { type: 'RIVAL_ESPIONAGE_STORY', title: 'A Rival Hand Reached the Network', priority: 'MAJOR' };
    if (fact.type === 'CAMPUS_STAGE_COMPLETED' && fact.metadata?.eventType === 'INDUSTRIAL_ESPIONAGE') return { type: 'RIVAL_ESPIONAGE_STORY', title: fact.summary, priority: 'IMPORTANT' };
    return null;
};

export const commitStreamingInfrastructureProgressionWeek = (
    value: OwnedStreamingPlatformState,
    player: Player,
    snapshot: OwnedStreamingWeeklySnapshot,
): OwnedStreamingPlatformState => {
    let platform = normalizeOwnedStreamingPlatformState(value, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.infrastructureSetup?.facilities?.length || !platform.launchCommit) return platform;
    const operations = platform.crisisSecurity.infrastructureOperations;
    if (operations.performanceHistory.some(point => point.absoluteWeek === snapshot.absoluteWeek)) return platform;
    const facilities = platform.infrastructureSetup.facilities;
    const physical = getStreamingNetworkPhysicalSummary(facilities);
    const installedRacks = facilities.reduce((sum, facility) => sum + facility.installedRacks, 0);
    const averageConditionPercent = facilities.reduce((sum, facility) => sum + (facility.physical?.maintenanceConditionPercent ?? 100), 0) / facilities.length;
    const activeIncidentCount = operations.incidents.filter(incident => incident.stage !== 'RESOLVED').length;
    const reliableWeek = snapshot.operations
        ? snapshot.operations.playbackSuccessRate >= 99.5 && physical.reliabilityPercent >= 99.5 && activeIncidentCount === 0
        : false;
    const reliabilityStreakWeeks = reliableWeek ? operations.reliabilityStreakWeeks + 1 : 0;
    const tier = resolveStreamingInfrastructureProgressionTier(platform);
    const point: OwnedStreamingInfrastructurePerformancePoint = {
        absoluteWeek: snapshot.absoluteWeek,
        tier,
        facilityCount: facilities.length,
        installedRacks,
        averageConditionPercent: Math.round(averageConditionPercent * 10) / 10,
        reliabilityPercent: physical.reliabilityPercent,
        playbackSuccessRate: snapshot.operations?.playbackSuccessRate || 0,
        capacityUtilizationPercent: snapshot.operations?.capacityUtilizationPercent || 0,
        energyKwhWeekly: physical.energyKwhWeekly,
        waterLitresWeekly: physical.waterLitresWeekly,
        weeklyOperatingCost: roundMoney(platform.infrastructureSetup.weeklyOperatingCost),
        activeIncidentCount,
    };
    const ledger: OwnedStreamingLedgerEntry[] = [];
    const awards = [...operations.awards];
    const milestoneKeys = new Set(platform.milestoneKeys);
    const queue: Array<{ key: string; type: OwnedStreamingCinematicType; priority: 'STANDARD' | 'IMPORTANT' | 'MAJOR'; title: string; factId: string }> = [];

    if (tierIndex(tier) > tierIndex(operations.lastProgressionTier)) {
        const definition = STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES[tierIndex(tier)];
        const key = `infrastructure-progression:${tier.toLowerCase()}`;
        const fact = milestoneFact(platform, snapshot.absoluteWeek, key, `${definition.label} became the company’s highest commissioned infrastructure tier.`, { tier, facilityCount: facilities.length, installedRacks });
        ledger.push(fact);
        milestoneKeys.add(key);
        const usesOpeningScene = tier === 'OWNED_DATA_CENTRE' || tier === 'GLOBAL_HYPERSCALE_CAMPUS';
        const openingAlreadyQueued = usesOpeningScene && platform.cinematicQueue.some(event => event.type === 'FACILITY_OPENING' && event.availableAtAbsoluteWeek === snapshot.absoluteWeek);
        if (!openingAlreadyQueued) queue.push({ key: `${key}:cinematic`, type: usesOpeningScene ? 'FACILITY_OPENING' : 'SERVER_HALL_EVOLUTION', priority: tier === 'GLOBAL_HYPERSCALE_CAMPUS' ? 'MAJOR' : 'IMPORTANT', title: `${definition.label} Enters Service`, factId: fact.id });
    }

    const resolvedThisWeek = operations.incidents.find(incident => incident.resolvedAtAbsoluteWeek === snapshot.absoluteWeek);
    const awardCandidates: Array<{ category: StreamingInfrastructureAwardCategory; evidence: string; score: number }> = [];
    if (reliabilityStreakWeeks >= 12) awardCandidates.push({ category: 'RELIABILITY_LEADERSHIP', evidence: `${reliabilityStreakWeeks} consecutive weeks above the verified playback and facility reliability standard.`, score: Math.min(100, 82 + reliabilityStreakWeeks / 2) });
    if (resolvedThisWeek && ['MAJOR', 'CRITICAL'].includes(resolvedThisWeek.severity)) awardCandidates.push({ category: 'RECOVERY_EXCELLENCE', evidence: `${resolvedThisWeek.title} reached verified recovery after a funded ${String(resolvedThisWeek.responseAction || 'engineering').toLowerCase().replaceAll('_', ' ')} response.`, score: resolvedThisWeek.severity === 'CRITICAL' ? 96 : 88 });
    if (physical.sustainabilityScore >= 82 && installedRacks >= 24) awardCandidates.push({ category: 'SUSTAINABLE_SCALE', evidence: `${installedRacks} racks operate at sustainability score ${physical.sustainabilityScore} with ${physical.energyKwhWeekly.toLocaleString()} kWh disclosed weekly.`, score: physical.sustainabilityScore });
    if (tier === 'GLOBAL_HYPERSCALE_CAMPUS') awardCandidates.push({ category: 'GLOBAL_BACKBONE', evidence: `A commissioned Giga Campus carries ${installedRacks} installed racks across ${facilities.length} facilities.`, score: Math.min(100, 88 + facilities.length * 2) });
    for (const candidate of awardCandidates) {
        if (awards.some(award => award.category === candidate.category)) continue;
        const created = createAward(platform, snapshot.absoluteWeek, candidate.category, candidate.evidence, candidate.score);
        awards.push(created.award);
        ledger.push(created.fact);
        milestoneKeys.add(created.award.idempotencyKey);
        queue.push({ key: `${created.award.idempotencyKey}:cinematic`, type: candidate.category === 'RELIABILITY_LEADERSHIP' ? 'GLOBAL_RELIABILITY_MILESTONE' : 'INFRASTRUCTURE_AWARDS', priority: candidate.category === 'GLOBAL_BACKBONE' ? 'MAJOR' : 'IMPORTANT', title: awardDefinition(candidate.category).cinematicTitle, factId: created.fact.id });
    }

    const orchestrated = new Set(operations.orchestratedFactIds);
    const relevantSourceFacts = platform.eventLedger.filter(fact => !orchestrated.has(fact.id)).slice(-120);
    for (const fact of relevantSourceFacts) {
        const scene = sourceCinematic(fact);
        if (!scene) continue;
        orchestrated.add(fact.id);
        const alreadyVisualized = platform.cinematicQueue.some(event => event.factIds.includes(fact.id) && event.type !== 'MILESTONE');
        if (!alreadyVisualized) queue.push({ key: `infrastructure-story:${fact.id}`, ...scene, factId: fact.id });
    }

    platform = {
        ...platform,
        milestoneKeys: Array.from(milestoneKeys),
        eventLedger: [...platform.eventLedger, ...ledger],
        crisisSecurity: {
            ...platform.crisisSecurity,
            infrastructureOperations: {
                ...operations,
                reliabilityStreakWeeks,
                lastProgressionTier: tier,
                performanceHistory: [...operations.performanceHistory, point].slice(-104),
                awards: awards.slice(-24),
                orchestratedFactIds: Array.from(orchestrated).slice(-120),
            },
        },
    };
    for (const scene of queue) {
        platform = queueOwnedStreamingCinematic(platform, {
            idempotencyKey: scene.key,
            type: scene.type,
            priority: scene.priority,
            availableAtAbsoluteWeek: snapshot.absoluteWeek,
            title: scene.title,
            factIds: [scene.factId],
        });
    }
    return compactOwnedStreamingPlatformForPersistence(platform, player.id);
};

export const getStreamingInfrastructureChronicle = (player: Player) => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operations = platform.crisisSecurity.infrastructureOperations;
    const tier = resolveStreamingInfrastructureProgressionTier(platform);
    const tierPosition = tierIndex(tier);
    const history = operations.performanceHistory;
    const latest = history.at(-1) || null;
    const previous = history.at(-2) || null;
    const latestWeekly = platform.weeklyHistory.at(-1) || null;
    const facilities = platform.infrastructureSetup?.facilities || [];
    const physical = getStreamingNetworkPhysicalSummary(facilities);
    const costPerHundredThousandStreams = platform.capacity.burstConcurrentStreams > 0
        ? (platform.infrastructureSetup?.weeklyOperatingCost || 0) / (platform.capacity.burstConcurrentStreams / 100_000)
        : 0;
    const energyPerRack = facilities.reduce((sum, facility) => sum + facility.installedRacks, 0) > 0
        ? physical.energyKwhWeekly / facilities.reduce((sum, facility) => sum + facility.installedRacks, 0)
        : 0;
    const utilization = latest?.capacityUtilizationPercent || latestWeekly?.operations?.capacityUtilizationPercent || 0;
    const condition = latest?.averageConditionPercent || 100;
    const pressureScore = clamp(utilization * .5 + Math.max(0, 100 - condition) * .7 + operations.incidents.filter(item => item.stage !== 'RESOLVED').length * 18);
    const queuedTypes: OwnedStreamingCinematicType[] = ['FACILITY_OPENING', 'SERVER_HALL_EVOLUTION', 'GIGA_CAMPUS_CONSTRUCTION', 'OPENING_NIGHT_CONTROL_ROOM', 'INFRASTRUCTURE_RECOVERY', 'PATENT_ANNOUNCEMENT', 'RIVAL_ESPIONAGE_STORY', 'INFRASTRUCTURE_AWARDS', 'GLOBAL_RELIABILITY_MILESTONE', 'LAUNCH_NIGHT', 'PLATFORM_OUTAGE'];
    return {
        available: platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit) && facilities.length > 0,
        platform,
        tier,
        tierPosition,
        stages: STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES.map((stage, index) => ({ ...stage, achieved: index <= tierPosition, current: index === tierPosition })),
        nextStage: STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES[tierPosition + 1] || null,
        history,
        latest,
        awards: operations.awards,
        reliabilityStreakWeeks: operations.reliabilityStreakWeeks,
        cinematics: platform.cinematicQueue.filter(event => queuedTypes.includes(event.type)).slice(-24).reverse(),
        causalExplanations: [
            { id: 'condition', label: 'Facility condition', value: `${condition.toFixed(1)}%`, detail: previous ? `${condition >= previous.averageConditionPercent ? 'Improved' : 'Declined'} from ${previous.averageConditionPercent.toFixed(1)}% last week through wear, incidents and maintenance.` : 'The weighted physical condition of every commissioned facility.', tone: condition >= 85 ? 'POSITIVE' : condition >= 70 ? 'NEUTRAL' : 'NEGATIVE' },
            { id: 'capacity', label: 'Capacity pressure', value: `${utilization.toFixed(0)}%`, detail: `${(latestWeekly?.operations?.peakConcurrentStreams || 0).toLocaleString()} peak streams divided by the incident-adjusted burst ceiling.`, tone: utilization < 80 ? 'POSITIVE' : utilization < 100 ? 'NEUTRAL' : 'NEGATIVE' },
            { id: 'energy', label: 'Energy intensity', value: `${Math.round(energyPerRack).toLocaleString()} kWh/rack`, detail: `${physical.energyKwhWeekly.toLocaleString()} weekly kWh across ${facilities.reduce((sum, facility) => sum + facility.installedRacks, 0)} installed racks. Cooling and rack duties change this value.`, tone: physical.sustainabilityScore >= 75 ? 'POSITIVE' : 'NEUTRAL' },
            { id: 'economy', label: 'Capacity economics', value: `$${Math.round(costPerHundredThousandStreams / 1_000)}K / 100K`, detail: 'Commissioned weekly infrastructure cost divided by protected burst capacity. Empty headroom is resilience, not wasted capacity.', tone: costPerHundredThousandStreams < 300_000 ? 'POSITIVE' : 'NEUTRAL' },
        ] as const,
        balance: {
            pressureScore,
            pressureLabel: pressureScore >= 75 ? 'SEVERE' : pressureScore >= 50 ? 'DEMANDING' : pressureScore >= 25 ? 'MANAGED' : 'CONTROLLED',
            weeklyCost: platform.infrastructureSetup?.weeklyOperatingCost || 0,
            energyPerRack,
            sustainabilityScore: physical.sustainabilityScore,
            limitingFactors: physical.limitingFactors,
            explanation: 'Difficulty is produced by real load, maintenance condition, physical limits and incident exposure. Assisted and Hands-On management use these exact values.',
        },
    };
};
