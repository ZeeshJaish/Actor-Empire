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
} from '../services/streamingResearchLifecycle';
import {
    completeDueStreamingTechnologyProjects,
    getStreamingTechnologyCampus,
    startStreamingTechnologyProject,
} from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite } from '../services/streamingProductSuite';

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
assert(portfolio.available && portfolio.programs.length === STREAMING_RESEARCH_DEFINITIONS.length, 'A live infrastructure stack should expose every canonical research programme.');

const adaptiveDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === 'adaptive-startup')!;
const researchTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const adaptiveStarted = startStreamingResearchProgram(fixture, adaptiveDefinition.id, 'BALANCED');
assert(adaptiveStarted.changed && adaptiveStarted.program?.stage === 'RESEARCHING', 'Research should create a persisted RESEARCHING program.');
fixture = adaptiveStarted.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === researchTreasury - adaptiveDefinition.researchCost, 'Starting research should charge research cost only.');
assert(fixture.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY === 0, 'Research must not grant the eventual technology benefit.');
assert(adaptiveDefinition.installationCost > 0 && adaptiveDefinition.installationCost !== adaptiveDefinition.researchCost, 'Research and installation economics must remain separate.');

const prematureTechnology = getStreamingTechnologyCampus(fixture).facilities
    .flatMap(facility => facility.nodes)
    .find(node => node.definition.id === adaptiveDefinition.mappedTechnologyId)!;
assert(prematureTechnology.status === 'LOCKED' && prematureTechnology.blockers.some(item => item.includes('research')), 'A mapped installation should stay locked before research and IP clearance.');

fixture = advanceToIp(fixture, adaptiveDefinition.id);
const patentTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const patented = chooseStreamingResearchIpStrategy(fixture, adaptiveDefinition.id, 'PATENT');
assert(patented.changed, 'A tested program should accept a Patent strategy.');
fixture = patented.player;
const adaptiveProgram = fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === adaptiveDefinition.id)!;
assert(adaptiveProgram.stage === 'READY_TO_INSTALL' && adaptiveProgram.rivalInterestPercent >= 24, 'A patent should unlock installation and create visible rival interest.');
assert(fixture.ownedStreamingPlatform.treasuryCash === patentTreasury - adaptiveProgram.patentCost, 'Patent clearance should debit its own cost once.');
assert(fixture.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY === 0, 'IP clearance still must not install the technology.');

const installTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const technologyStarted = startStreamingTechnologyProject(fixture, adaptiveDefinition.mappedTechnologyId!, 'BALANCED');
assert(technologyStarted.changed && technologyStarted.project, 'A cleared research blueprint should hand off to existing Technology Campus construction.');
fixture = technologyStarted.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === installTreasury - technologyStarted.project!.capitalCost, 'Technology construction should charge separate installation capital.');
assert(fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === adaptiveDefinition.id)?.stage === 'INSTALLING', 'Starting the mapped project should move research to INSTALLING.');
const beforeTechnology = completeDueStreamingTechnologyProjects(fixture.ownedStreamingPlatform, technologyStarted.project!.readyAtAbsoluteWeek - 1);
assert(beforeTechnology.completedProjects.length === 0 && beforeTechnology.platform.technologyLevels.PLAYBACK_QUALITY === 0, 'Technology effects must not appear before installation finishes.');
const technologyCompleted = completeDueStreamingTechnologyProjects(fixture.ownedStreamingPlatform, technologyStarted.project!.readyAtAbsoluteWeek);
fixture = atAbsoluteWeek({ ...fixture, ownedStreamingPlatform: technologyCompleted.platform }, technologyStarted.project!.readyAtAbsoluteWeek);
assert(fixture.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY === 12, 'Completed installation should apply the canonical playback level.');
assert(fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === adaptiveDefinition.id)?.stage === 'OPERATING', 'Mapped technology completion should move research to OPERATING.');

const immersionDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === 'immersion-cooling')!;
const immersionStarted = startStreamingResearchProgram(fixture, immersionDefinition.id, 'BALANCED');
assert(immersionStarted.changed, 'Cooling research should start after the prior pipeline clears.');
fixture = advanceToIp(immersionStarted.player, immersionDefinition.id);
const licensed = chooseStreamingResearchIpStrategy(fixture, immersionDefinition.id, 'LICENSE');
assert(licensed.changed, 'A tested program should also support licensing.');
fixture = licensed.player;
const coolingBefore = fixture.ownedStreamingPlatform.infrastructureSetup!.facilities![0].physical!.coolingMode;
const coolingOperatingCostBefore = fixture.ownedStreamingPlatform.infrastructureSetup!.weeklyOperatingCost;
const immersionInstall = installStreamingResearchInFacility(fixture, immersionDefinition.id, 'facility-mumbai-private');
assert(immersionInstall.changed, 'Immersion cooling should install only into a compatible commissioned facility.');
fixture = immersionInstall.player;
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities![0].physical!.coolingMode === coolingBefore, 'Approving a retrofit must not magically change the facility.');
const immersionProgram = fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === immersionDefinition.id)!;
const coolingEarly = advanceDueStreamingResearchPrograms(fixture.ownedStreamingPlatform, immersionProgram.stageReadyAtAbsoluteWeek - 1);
assert(coolingEarly.advancedPrograms.length === 0, 'Facility installation should respect its game-week schedule.');
const coolingComplete = advanceDueStreamingResearchPrograms(fixture.ownedStreamingPlatform, immersionProgram.stageReadyAtAbsoluteWeek);
fixture = atAbsoluteWeek({ ...fixture, ownedStreamingPlatform: coolingComplete.platform }, immersionProgram.stageReadyAtAbsoluteWeek);
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities![0].physical!.coolingMode === 'IMMERSION', 'Completion should change the exact targeted facility to immersion cooling.');
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.weeklyOperatingCost < coolingOperatingCostBefore, 'An operating immersion retrofit should reduce the canonical infrastructure run rate.');
assert(getStreamingResearchWeeklyCost(fixture.ownedStreamingPlatform) >= immersionDefinition.weeklyOperatingCost + immersionDefinition.licenseWeeklyCost, 'A licensed operating installation should add its weekly license and operating cost.');

const compressionDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === 'perceptual-compression')!;
const compressionStarted = startStreamingResearchProgram(fixture, compressionDefinition.id, 'BALANCED');
fixture = advanceToIp(compressionStarted.player, compressionDefinition.id);
fixture = chooseStreamingResearchIpStrategy(fixture, compressionDefinition.id, 'PATENT').player;
let compressionNode = getStreamingTechnologyCampus(fixture).facilities.flatMap(facility => facility.nodes).find(node => node.definition.id === compressionDefinition.mappedTechnologyId)!;
assert(compressionNode.status === 'LOCKED' && compressionNode.blockers.some(item => item.includes('ENCODING')), 'Compression deployment should require a real ENCODING rack group.');
fixture = {
    ...fixture,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        infrastructureSetup: {
            ...fixture.ownedStreamingPlatform.infrastructureSetup!,
            facilities: fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.map(facility => ({
                ...facility,
                rackGroups: facility.rackGroups?.map((group, index) => index === 0 ? { ...group, duty: 'ENCODING' as const } : group),
            })),
        },
    },
};
compressionNode = getStreamingTechnologyCampus(fixture).facilities.flatMap(facility => facility.nodes).find(node => node.definition.id === compressionDefinition.mappedTechnologyId)!;
assert(compressionNode.status === 'AVAILABLE', 'A cleared compression blueprint should become deployable when an ENCODING group exists.');
const compressionInstall = startStreamingTechnologyProject(fixture, compressionDefinition.mappedTechnologyId!, 'BALANCED');
assert(compressionInstall.changed, 'Compression should hand off to Technology Campus after its rack target is valid.');
fixture = compressionInstall.player;
const compressionProgram = fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === compressionDefinition.id)!;
assert(compressionProgram.installationTargetType === 'RACK_GROUP' && compressionProgram.installationTargetId === 'group-origin', 'Compression installation should persist the exact canonical ENCODING rack group.');
assert(compressionProgram.installationTargetLabel?.includes('MUMBAI'), 'The persisted compression target should remain understandable in the UI.');

const kidsBefore = getStreamingProductSuite(createFixture()).lines.find(line => line.definition.id === 'KIDS')!;
assert(kidsBefore.blockers.some(item => item.includes('Kids Mode research')), 'Product Lab should explain the Kids research prerequisite.');

const gigaDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === 'giga-campus')!;
const facilityCountBeforeGiga = fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length;
const gigaStarted = startStreamingResearchProgram(fixture, gigaDefinition.id, 'HARDENED');
fixture = advanceToIp(gigaStarted.player, gigaDefinition.id);
fixture = chooseStreamingResearchIpStrategy(fixture, gigaDefinition.id, 'PATENT').player;
assert(fixture.ownedStreamingPlatform.milestoneKeys.includes('research-unlock:giga-campus'), 'Giga Campus research should unlock future construction planning.');
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length === facilityCountBeforeGiga, 'Giga Campus research must not create a free facility.');

const campusSource = readFileSync(resolve(process.cwd(), 'components/StreamingTechnologyCampus.tsx'), 'utf8');
const campusCss = readFileSync(resolve(process.cwd(), 'styles/streaming-technology-campus.css'), 'utf8');
const productSource = readFileSync(resolve(process.cwd(), 'components/StreamingProductLab.tsx'), 'utf8');
assert(campusSource.includes("type CampusView = 'RESEARCH'"), 'Research should live inside the existing Technology Campus instead of a duplicate screen.');
assert(campusSource.includes('UNLOCKS') && campusSource.includes('INSTALLED IN') && campusSource.includes('GAMEPLAY CHANGE'), 'Every research brief should explain its unlock, location and gameplay change.');
assert(campusSource.includes('Patent') && campusSource.includes('License') && campusSource.includes('Install & Operate'), 'The integrated UI should expose IP and installation decisions.');
assert(productSource.includes('Kids Mode research') && productSource.includes('Open Research'), 'Product Lab should show the research handoff for Kids Mode.');
assert(campusCss.includes('@media (max-width: 640px)') && campusCss.includes('min-height: 44px'), 'The Phase 7 UI should preserve mobile layout and touch-target rules.');
assert(campusCss.includes('@media (prefers-reduced-motion: reduce)'), 'The research UI should respect reduced-motion preferences.');

console.log('Streaming research integration Phase 7 audit passed.');
