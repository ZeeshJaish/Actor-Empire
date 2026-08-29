import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OwnedStreamingFacility } from '../types';
import {
    derive,
    selectionWithFacilities,
    type BuildInputs,
    type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';
import {
    finalizeStreamingRackGroupMigrations,
    normalizeStreamingRackGroups,
    projectFacilityNetworkRole,
} from '../services/streamingRackGroups';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const legacyGroups = normalizeStreamingRackGroups(undefined, 'LEGACY-NYC', 4, 'REGIONAL_HUB');
assert(legacyGroups.length === 1, 'An old facility must migrate into one visible rack group.');
assert(legacyGroups[0].rackCount === 4 && legacyGroups[0].duty === 'REGIONAL_CACHE', 'Old facility role and rack count must survive migration.');

const baseFacility: OwnedStreamingFacility = {
    id: 'FACILITY-NYC-01',
    cityId: 'NYC',
    type: 'PRIVATE_CAGE',
    role: 'CORE_ORIGIN',
    installedRacks: 4,
    purchasedAtAbsoluteWeek: 100,
    rackGroups: [
        { id: 'ORIGIN', name: 'Master library', rackCount: 2, duty: 'CONTENT_ORIGIN' },
        { id: 'EDGE', name: 'Fast cache', rackCount: 1, duty: 'LOCAL_EDGE' },
        { id: 'LIVE', name: 'Premiere surge', rackCount: 1, duty: 'LIVE_EVENT' },
    ],
};
assert(projectFacilityNetworkRole(baseFacility.rackGroups!) === 'CORE_ORIGIN', 'A mixed facility with an origin group must project as a compatible origin node.');

const inputs: BuildInputs = {
    treasury: 200_000_000,
    catalogueSpend: 0,
    catalogueTitles: 20,
    originalsSpend: 0,
    originalsCount: 0,
    premiereTitle: 'Test Signal',
    regions: ['NORTH_AMERICA'],
    coverageRegions: ['NORTH_AMERICA'],
    markets: [{
        id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 225_000_000,
        annualGrowthPercent: 3, recommendedCityId: 'NYC', localizationNote: 'English launch.',
    }],
    homeCityId: null,
    audienceMul: 1,
};
const selection = (facility: OwnedStreamingFacility): BuildSel => selectionWithFacilities({
    placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE',
}, [facility]);
const stable = derive(selection(baseFacility), inputs);
assert(stable.halls[0].rackGroups.length === 3, 'The visible hall must preserve several independent rack groups.');
assert(stable.halls[0].rackGroups.some(group => group.projectedDuty === 'LIVE_EVENT'), 'Live-event delivery must remain visible as a real group duty.');

const migratingFacility: OwnedStreamingFacility = {
    ...baseFacility,
    rackGroups: baseFacility.rackGroups!.map(group => group.id === 'EDGE' ? {
        ...group,
        migration: { fromDuty: 'LOCAL_EDGE', toDuty: 'ENCODING', weeks: 2, pressurePercent: 18 },
    } : group),
};
const migrating = derive(selection(migratingFacility), inputs);
assert(migrating.halls[0].migrationWeeks === 2, 'A duty change must add visible migration time.');
assert(migrating.halls[0].migrationPressurePercent === 18, 'A duty change must expose temporary pressure.');
assert(migrating.ceiling < stable.ceiling, 'Migration pressure must lower opening-night capacity until work finishes.');

const finalized = finalizeStreamingRackGroupMigrations(migratingFacility);
const encoded = finalized.rackGroups?.find(group => group.id === 'EDGE');
assert(encoded?.duty === 'ENCODING' && !encoded.migration, 'Commissioning must finish a pending duty migration exactly once.');

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const buildSource = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const infrastructureSource = source('services/streamingInfrastructure.ts');
const styles = source('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css');
[
    'RACK FLOOR',
    'RACK GROUP CONTROL',
    'CHOOSE WHAT THESE RACKS DO',
    'MOVE THIS WORKLOAD',
    'RETIRE ONE RACK',
    'Keep one Content Origin online',
].forEach(fragment => assert(buildSource.includes(fragment), `Phase 4 UI should include ${fragment}.`));
[
    'getStreamingRackDutyRule',
    'migrationMultiplier',
    'rackCapex',
    'rackWeekly',
].forEach(fragment => assert(infrastructureSource.includes(fragment), `Canonical forecast should read ${fragment}.`));
assert(styles.includes('.groupdeck') && styles.includes('.groupsheet') && styles.includes('.retireRack'), 'Rack groups need their cinematic floor, control sheet and retirement UI.');
assert(!source('services/streamingRackGroups.ts').includes('Math.random'), 'Rack-group migration and IDs must be deterministic.');

console.log('EMPIRE+ Rack Groups and Network Duties Phase 4 audit passed.');
