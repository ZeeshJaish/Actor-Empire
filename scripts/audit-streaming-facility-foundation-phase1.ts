import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    STREAMING_FACILITY_CONTRACTS,
    aggregateStreamingFacilities,
    migratePlacementsToStreamingFacilities,
} from '../services/streamingFacilities';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const contracts = STREAMING_FACILITY_CONTRACTS.filter(contract => (
    contract.playerSelectable && contract.type !== 'CLOUD_ALLOCATION'
));
assert(
    contracts.map(contract => contract.type).join(',')
        === 'RENTED_CABINET,PRIVATE_CAGE,PRIVATE_SUITE,DEDICATED_DATA_HALL',
    'Phase 1 should offer the four explicit launch-space contracts in progression order.',
);
for (let index = 1; index < contracts.length; index += 1) {
    assert(contracts[index].capacityRacks > contracts[index - 1].capacityRacks, 'Larger spaces must add real rack capacity.');
    assert(contracts[index].setupCost > contracts[index - 1].setupCost, 'Larger spaces must require a larger setup commitment.');
    assert(contracts[index].weeklyLease > contracts[index - 1].weeklyLease, 'Larger spaces must carry a larger weekly lease.');
}

const migrated = migratePlacementsToStreamingFacilities([
    { cityId: 'NYC', racks: 2, role: 'CORE_ORIGIN' },
    { cityId: 'LON', racks: 7, role: 'REGIONAL_HUB' },
]);
assert(migrated[0]?.type === 'RENTED_CABINET', 'A two-rack legacy node should migrate into a starter cabinet.');
assert(migrated[1]?.type === 'PRIVATE_CAGE', 'A seven-rack legacy node should migrate into a private cage.');
assert(
    JSON.stringify(aggregateStreamingFacilities(migrated)) === JSON.stringify([
        { cityId: 'NYC', racks: 2, role: 'CORE_ORIGIN' },
        { cityId: 'LON', racks: 7, role: 'REGIONAL_HUB' },
    ]),
    'Facility migration must preserve the canonical simulation placements.',
);

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const buildSource = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const hqSource = source('components/StreamingPlatformHQ.tsx');
const infrastructureSource = source('services/streamingInfrastructure.ts');
[
    'Your facilities',
    '+ ADD FACILITY',
    'LEASE ANOTHER',
    'weeklyRent',
    'rackPositions',
].forEach(fragment => assert(buildSource.includes(fragment), `Phase 1 UI should include ${fragment}.`));

/**
 * The blueprint card that carried "OPENING NETWORK · FOUNDATION 1 OF 3" and
 * "AUTO-FILL THIS BLUEPRINT" was folded into a one-line suggestion by the Build
 * redesign — it was one of four competing ways to place a network on the same
 * screen. What Phase 1 actually requires is that a derived opening network is
 * offered and that accepting it goes through the ordinary facility path, which
 * is asserted here on the mechanism rather than on the wording.
 */
assert(
    buildSource.includes('Your team suggests')
    && buildSource.includes('recommendationFacilities'),
    'Phase 1 UI must still offer the derived opening network.',
);
assert(hqSource.includes('saveStreamingInfrastructureDraft(player, canonicalInfrastructureDraft(nextSelection, false))'), 'Every build edit should persist as a resumable company draft.');
assert(infrastructureSource.includes('facilitySignature'), 'Load-test signatures must include the exact facility configuration.');
assert(infrastructureSource.includes('facilityWeekly'), 'Canonical weekly operating costs must include facility leases.');
assert(infrastructureSource.includes('provisioningWeeks'), 'Canonical build time must include space provisioning.');
assert(!infrastructureSource.includes('Math.random'), 'Facility economics and load forecasts must remain deterministic.');

console.log('EMPIRE+ streaming facility foundation Phase 1 audit passed.');
