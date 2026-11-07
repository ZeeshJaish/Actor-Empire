import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    STREAMING_RESEARCH_DEFINITIONS,
    STREAMING_RESEARCH_LIFECYCLE_LABELS,
    advanceDueStreamingResearchPrograms,
    chooseStreamingResearchIpStrategy,
    getStreamingResearchPortfolio,
    getStreamingResearchWeeklyCost,
    installStreamingResearchInFacility,
    startStreamingResearchProgram,
    STREAMING_RESEARCH_RETIRED_REASON,
} from '../services/streamingResearchLifecycle';
import {
    completeDueStreamingTechnologyProjects,
    getStreamingTechnologyCampus,
    startStreamingTechnologyProject,
} from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite } from '../services/streamingProductSuite';
import { createStreamingResearchProgram, previewStreamingResearchProgram } from '../services/streamingResearchCore';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const atAbsoluteWeek = (player: Player, absoluteWeek: number): Player => ({
    ...player,
    age: Math.floor(absoluteWeek / 52) + 1,
    currentWeek: (absoluteWeek % 52) + 1,
});

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase7-research-player');
    const absoluteWeek = getAbsoluteWeek(45, 20);
    return {
        ...player,
        id: 'phase7-research-player',
        age: 45,
        currentWeek: 20,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            treasuryCash: 900_000_000,
            infrastructureStrategy: 'HYBRID',
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                rolloutPace: 'STANDARD',
                storageCapacityHours: 50_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_500_000,
                staffRequired: 20,
                capitalInvested: 80_000_000,
                technicalDebt: 4,
                networkPlacements: [{ cityId: 'MUMBAI', racks: 12, role: 'CORE_ORIGIN' }],
                facilities: [{
                    id: 'facility-mumbai-private',
                    cityId: 'MUMBAI',
                    type: 'PRIVATE_CAGE',
                    installedRacks: 12,
                    role: 'CORE_ORIGIN',
                    rackGroups: [
                        { id: 'group-origin', name: 'Origin', rackCount: 7, duty: 'CONTENT_ORIGIN' },
                        { id: 'group-platform', name: 'Platform', rackCount: 5, duty: 'PLATFORM_SERVICES' },
                    ],
                    physical: {
                        powerContractKw: 180,
                        backupPowerKw: 140,
                        backupPowerMode: 'GENERATOR',
                        coolingCapacityKw: 155,
                        coolingMode: 'AIR',
                        bandwidthMbps: 100_000,
                        burstBandwidthMbps: 160_000,
                        maintenanceConditionPercent: 92,
                        lastMaintenanceAbsoluteWeek: absoluteWeek - 2,
                        powerUpgradeCount: 0,
                        coolingUpgradeCount: 0,
                        bandwidthUpgradeCount: 0,
                        equipmentReplacementCount: 0,
                    },
                }],
                readyAtAbsoluteWeek: absoluteWeek - 10,
                revision: 1,
                committedAtAbsoluteWeek: absoluteWeek - 12,
                loadTest: {
                    configurationSignature: 'phase7-research-load',
                    forecastLowConcurrentStreams: 800_000,
                    forecastLikelyConcurrentStreams: 1_200_000,
                    forecastHighConcurrentStreams: 1_800_000,
                    testedBurstCapacity: 4_000_000,
                    headroomPercent: 80,
                    status: 'PASS',
                    driverKeys: ['phase7'],
                    completedAtAbsoluteWeek: absoluteWeek - 11,
                },
            },
            capacity: { baselineConcurrentStreams: 2_000_000, burstConcurrentStreams: 4_000_000 },
            technologyLevels: {
                ...initial.technologyLevels,
                CONTENT_OPERATIONS: 10,
                SECURITY: 10,
            },
        },
    };
};

const advanceToIp = (playerValue: Player, definitionId: string): Player => {
    let player = playerValue;
    for (const expectedStage of ['PROTOTYPING', 'TESTING', 'AWAITING_IP'] as const) {
        const program = player.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === definitionId)!;
        const dueWeek = program.stageReadyAtAbsoluteWeek;
        const result = advanceDueStreamingResearchPrograms(player.ownedStreamingPlatform, dueWeek);
        assert(result.advancedPrograms.length === 1, `${definitionId} should advance exactly once at its due week.`);
        assert(result.advancedPrograms[0].stage === expectedStage, `${definitionId} should advance to ${expectedStage}.`);
        player = atAbsoluteWeek({ ...player, ownedStreamingPlatform: result.platform }, dueWeek);
    }
    return player;
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 18 }, 'phase7-old-save');
assert(Array.isArray(migrated.researchPrograms) && migrated.researchPrograms.length === 0, 'Old saves should migrate with an empty research portfolio.');
assert(STREAMING_RESEARCH_DEFINITIONS.length >= 15, 'The research catalogue should retain its core disciplines and expose the independent localization path.');
assert(new Set(STREAMING_RESEARCH_DEFINITIONS.map(item => item.category)).size === 7, 'Every Phase 7 research category should be represented once.');
assert(STREAMING_RESEARCH_LIFECYCLE_LABELS.join(' > ') === 'Research > Prototype > Test > Patent or License > Install > Operate', 'The visible lifecycle should preserve all six accountable stages.');

let fixture = createFixture();
let portfolio = getStreamingResearchPortfolio(fixture);
/* Localization is researched by region in the Content Desk now, so a new company is not offered the old campus programme */
assert(portfolio.available && portfolio.programs.length === STREAMING_RESEARCH_DEFINITIONS.filter(item => item.installTargetType !== 'LOCALIZATION_CAPABILITY').length, 'A live infrastructure stack should expose every canonical research programme.');

/* #36 retired new research: the button refuses, and picture and sound unlock in Platform > Tech. A programme an old save
   had already begun keeps advancing and can still be cleared and installed, so that is what the rest of this audit follows. */
const startFromOldSave = (player: Player, definitionId: string, buildMode: 'BALANCED' | 'HARDENED') => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const definition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === definitionId)!;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const program = createStreamingResearchProgram({ seed: platform.simulationSeed, definition, buildMode, absoluteWeek, idempotencyKey: `research-program:${definition.id}` });
    const cost = previewStreamingResearchProgram(definition, buildMode).researchCost;
    return { changed: true, program, player: { ...player, ownedStreamingPlatform: { ...platform, treasuryCash: platform.treasuryCash - cost, researchPrograms: [...platform.researchPrograms, program] } } };
};
const refused = startStreamingResearchProgram(createFixture(), 'adaptive-startup', 'BALANCED');
assert(!refused.changed && refused.reason === STREAMING_RESEARCH_RETIRED_REASON, 'A new research programme must be refused with the reason, at no cost.');

const adaptiveDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === 'adaptive-startup')!;
const researchTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const adaptiveStarted = startFromOldSave(fixture, adaptiveDefinition.id, 'BALANCED');
assert(adaptiveStarted.changed && adaptiveStarted.program?.stage === 'RESEARCHING', 'Research should create a persisted RESEARCHING program.');
fixture = adaptiveStarted.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === researchTreasury - adaptiveDefinition.researchCost, 'Starting research should charge research cost only.');
assert(fixture.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY === 0, 'Research must not grant the eventual technology benefit.');
assert(adaptiveDefinition.installationCost > 0 && adaptiveDefinition.installationCost !== adaptiveDefinition.researchCost, 'Research and installation economics must remain separate.');

/* #36: engineering builds no longer wait for research */
const mappedNode = getStreamingTechnologyCampus(fixture).facilities
    .flatMap(facility => facility.nodes)
    .find(node => node.definition.id === adaptiveDefinition.mappedTechnologyId)!;
assert(!mappedNode.blockers.some(item => item.toLowerCase().includes('research')), 'An engineering build must not wait for research any more.');

fixture = advanceToIp(fixture, adaptiveDefinition.id);
const patentTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const patented = chooseStreamingResearchIpStrategy(fixture, adaptiveDefinition.id, 'PATENT');
assert(patented.changed, 'A tested program should accept a Patent strategy.');
fixture = patented.player;
const adaptiveProgram = fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === adaptiveDefinition.id)!;
assert(adaptiveProgram.stage === 'READY_TO_INSTALL' && adaptiveProgram.rivalInterestPercent >= 24, 'A patent should unlock installation and create visible rival interest.');
assert(fixture.ownedStreamingPlatform.treasuryCash === patentTreasury - adaptiveProgram.patentCost, 'Patent clearance should debit its own cost once.');
assert(fixture.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY === 0, 'IP clearance still must not install the technology.');

console.log('Streaming research integration Phase 7 audit passed.');
