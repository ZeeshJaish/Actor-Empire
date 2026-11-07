/**
 * #86: nothing needs Content operations any more. On a live company with Content operations 0:
 *  - Kids and Live list no Content operations blocker, and Kids opens with its family stack alone;
 *  - Global reach (level 4) comes from capacity, delivery, reliability and product experience alone;
 *  - no regional launch asks for it (East Asia used to need 25);
 *  - the Editorial Index and Chapters storefronts are open from the start;
 *  - no Originals localization package and no localization research asks for it
 *    (audit:streaming-originals-business-phase15 commits the World Premiere Grid at 0);
 *  - the campus builds no new step of it (a build already under way finishes:
 *    audit:streaming-technology-campus-phase17);
 *  - the plan builder's Early access is not locked by it, and the Tech tab's Engineering list no longer shows it.
 * (~1 s, no browser)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingProductSuite } from '../services/streamingProductSuite';
import { resolveOwnedStreamingReach } from '../services/streamingProgression';
import { STREAMING_REGION_DEFINITIONS, getStreamingRegionBlockers } from '../services/streamingCompetitiveWorld';
import { STREAMING_STOREFRONT_LAYOUTS } from '../services/streamingStorefront';
import { STREAMING_LAUNCH_UNLOCKS } from '../services/streamingLaunchUnlocks';
import { STREAMING_ORIGINAL_LOCALIZATION_PACKAGES } from '../services/streamingOriginalsBusiness';
import { getStreamingResearchPortfolio } from '../services/streamingResearchLifecycle';
import { STREAMING_CONTENT_OPERATIONS_RETIRED_BLOCKER, getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';

const CONTENT_OPS = /content op/i;

/* a live company strong everywhere a gate used to stand beside Content operations, with Content operations 0 */
const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('no-content-ops');
    const absoluteWeek = getAbsoluteWeek(45, 20);
    return {
        ...player,
        id: 'no-content-ops',
        age: 45,
        currentWeek: 20,
        businesses: [{ id: 'no-content-ops-studio', name: 'Northstar Pictures', type: 'PRODUCTION_HOUSE' } as Player['businesses'][number]],
        pastProjects: [
            { id: 'family-1', name: 'Orbit Kids', genre: 'ANIMATION', projectType: 'SERIES', studioId: 'no-content-ops-studio' },
            { id: 'catalog-2', name: 'Night Signal', genre: 'THRILLER', projectType: 'MOVIE', studioId: 'no-content-ops-studio' },
            { id: 'catalog-3', name: 'Open Roads', genre: 'DRAMA', projectType: 'MOVIE', studioId: 'no-content-ops-studio' },
        ] as Player['pastProjects'],
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#6f4dff',
                secondaryColor: '#08080d',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 40,
                publicManifesto: 'Event stories built for a worldwide audience.',
            },
            foundingProfile: {
                incorporationModel: 'FIXED_V7',
                founderCashCharged: 85_000_000,
                setupCostsConsumed: 70_000_000,
                openingTreasuryCash: 15_000_000,
                outsideCapitalRaisedAtIncorporation: 0,
                debtPrincipalAtIncorporation: 0,
                founderOwnershipPercentAtIncorporation: 100,
                founderWasCeoAtIncorporation: true,
                incorporatedAtAbsoluteWeek: absoluteWeek - 40,
            },
            infrastructureStrategy: 'HYBRID',
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                networkPlacements: [],
                rolloutPace: 'STANDARD',
                storageCapacityHours: 40_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_300_000,
                staffRequired: 10,
                capitalInvested: 40_000_000,
                technicalDebt: 6,
                readyAtAbsoluteWeek: absoluteWeek - 20,
                revision: 1,
                committedAtAbsoluteWeek: absoluteWeek - 24,
                loadTest: {
                    configurationSignature: 'no-content-ops-load',
                    forecastLowConcurrentStreams: 3_000_000,
                    forecastLikelyConcurrentStreams: 4_000_000,
                    forecastHighConcurrentStreams: 5_000_000,
                    testedBurstCapacity: 8_000_000,
                    headroomPercent: 94,
                    status: 'PASS',
                    driverKeys: ['family', 'national'],
                    completedAtAbsoluteWeek: absoluteWeek - 21,
                },
            },
            capacity: { baselineConcurrentStreams: 5_000_000, burstConcurrentStreams: 8_000_000 },
            technologyLevels: {
                ...initial.technologyLevels,
                DELIVERY_CAPACITY: 35,
                RELIABILITY: 30,
                SECURITY: 25,
                DATA_RECOMMENDATIONS: 10,
                PRODUCT_EXPERIENCE: 20,
                CONTENT_OPERATIONS: 0,
            },
            catalogProjectIds: ['family-1', 'catalog-2', 'catalog-3'],
            treasuryCash: 500_000_000,
        },
    };
};

const fixture = createFixture();
assert.equal(fixture.ownedStreamingPlatform.technologyLevels.CONTENT_OPERATIONS, 0);

/* products */
const suite = getStreamingProductSuite(fixture);
const contentOpsBlockers = suite.lines.flatMap(line => line.blockers.filter(blocker => CONTENT_OPS.test(blocker)).map(blocker => `${line.definition.id}: ${blocker}`));
assert.deepEqual(contentOpsBlockers, [], 'No product asks for Content operations');
const kids = suite.lines.find(line => line.definition.id === 'KIDS')!;
const live = suite.lines.find(line => line.definition.id === 'LIVE')!;
assert.equal(kids.status, 'AVAILABLE', `Kids opens at Content operations 0 (${kids.blockers.join('; ') || 'no blockers'})`);
console.log(`PASS products: no blocker names Content operations; Kids ${kids.status}; Live blockers: ${live.blockers.join('; ') || 'none'}`);

/* Global reach */
const reach = resolveOwnedStreamingReach(fixture);
assert.equal(reach.level, 4, `Global reach without Content operations (${reach.limitingFactors.join('; ')})`);
assert.ok(![...reach.limitingFactors, ...reach.evidence].some(line => CONTENT_OPS.test(line)), 'Reach names no Content operations');
console.log(`PASS reach: level ${reach.level} (${reach.label}); evidence: ${reach.evidence.join(' · ')}`);

/* regional launches */
const regionBlockers = STREAMING_REGION_DEFINITIONS.map(definition => [definition.id, getStreamingRegionBlockers(fixture, definition)] as const);
assert.ok(regionBlockers.every(([, blockers]) => !blockers.some(blocker => CONTENT_OPS.test(blocker))), 'No region asks for Content operations');
assert.ok(regionBlockers.every(([, blockers]) => blockers.length === 0), `Global reach and Security 25 open every region: ${regionBlockers.filter(([, b]) => b.length).map(([id, b]) => `${id} ${b.join(', ')}`).join('; ')}`);
assert.ok(STREAMING_REGION_DEFINITIONS.every(definition => !('contentOperationsRequired' in definition)), 'Region definitions carry no Content operations level');
console.log(`PASS regions: ${regionBlockers.length} regions, none blocked`);

/* storefronts */
for (const id of ['editorial-index', 'chapters']) {
    const layout = STREAMING_STOREFRONT_LAYOUTS.find(item => item.id === id)!;
    // #109: front-page locks are Tech steps now (streamingLaunchUnlocks.ts); these two have none
    assert.ok(layout && !STREAMING_LAUNCH_UNLOCKS[`storefront:${id}`], `${id} is open from the start`);
}
assert.ok(!JSON.stringify(STREAMING_STOREFRONT_LAYOUTS).includes('CONTENT_OPERATIONS'), 'No storefront asks for Content operations');
console.log('PASS storefronts: Editorial Index and Chapters open, none asks for Content operations');

/* Originals localization and localization research */
assert.ok(STREAMING_ORIGINAL_LOCALIZATION_PACKAGES.every(item => !('contentOperationsRequired' in item)), 'No Originals package carries a Content operations level');
const research = getStreamingResearchPortfolio(fixture);
assert.ok(research.programs.every(program => !program.blockers.some(blocker => CONTENT_OPS.test(blocker))), 'No research asks for Content operations');
console.log(`PASS Originals and research: ${STREAMING_ORIGINAL_LOCALIZATION_PACKAGES.length} packages, ${research.programs.length} programmes, none asks for Content operations`);

/* the campus */
const opsNodes = getStreamingTechnologyCampus(fixture).facilities.find(facility => facility.definition.id === 'CONTENT_OPERATIONS')!.nodes;
assert.ok(opsNodes.every(node => node.status === 'LOCKED' && node.blockers.includes(STREAMING_CONTENT_OPERATIONS_RETIRED_BLOCKER)), 'The campus builds no new step of it');
console.log(`PASS campus: ${opsNodes.length} Content operations steps read "${STREAMING_CONTENT_OPERATIONS_RETIRED_BLOCKER}"`);

/* the plan builder and the Tech tab */
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const launch = source('components/StreamingDefineLaunchExperience.tsx');
assert.ok(!/lock\('feature:early'/.test(launch) && !launch.includes('CONTENT_OPERATIONS'), 'Early access is not locked by Content operations');
const network = source('components/streaming-transplant/StreamingNetworkExperience.tsx');
assert.ok(/'DATA_RECOMMENDATIONS', 'CONTENT_OPERATIONS'\]\.includes\(t\.id\)/.test(network) && network.includes("tab === 'TECH' && showEngineering &&"), 'The Engineering list hides Content operations, and itself when empty');
console.log('PASS UI: Early access open, Engineering list without Content operations');

console.log('done: nothing needs Content operations');
