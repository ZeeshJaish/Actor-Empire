import fs from 'node:fs';
import path from 'node:path';
import { normalizeStudioState, resolveProjectType } from '../services/businessLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) {
        throw new Error(message);
    }
};

const legacySeriesStudioState: any = {
    scripts: [
        {
            id: 'script_legacy_series',
            title: 'Legacy Season Draft',
            type: 'SERIES',
            status: 'IN_DEVELOPMENT',
            genres: ['DRAMA'],
            quality: 84,
            options: [],
            writerId: null,
            weeksInDevelopment: 2,
            totalDevelopmentWeeks: 8,
            isOriginal: true,
            episodes: 22,
            returningTalent: [],
        },
    ],
    concepts: [
        {
            id: 'concept_legacy_series',
            scriptId: 'script_legacy_series',
            lastUpdated: 1,
            crewModes: {},
            selectedCrew: {},
            castList: [],
            selectedLocations: [],
            tone: 50,
        },
    ],
};

const normalized = normalizeStudioState(legacySeriesStudioState, 12);
const normalizedScript: any = normalized.scripts[0];
const normalizedConcept: any = normalized.concepts[0];

assert(resolveProjectType(undefined, 'SERIES') === 'SERIES', 'Legacy type=SERIES should resolve as series.');
assert(resolveProjectType('ACTING_GIG', undefined) === 'MOVIE', 'Non-media legacy type should safely fall back to movie.');
assert(normalizedScript.projectType === 'SERIES', 'Studio normalization must recover legacy unfinished series scripts.');
assert(normalizedScript.episodes === 22, 'Recovered series scripts must keep their episode count.');
assert(normalizedConcept.projectType === 'SERIES', 'Linked concepts must inherit recovered series identity.');

const readSource = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

assert(
    readSource('views/lifestyle/business/ProductionHouseGame.tsx').includes('resolveProjectType(script?.projectType'),
    'Production House active slate must use resilient project type resolution.'
);
assert(
    readSource('views/lifestyle/business/GreenlightWizard.tsx').includes('resolveProjectType(script.projectType, script.type'),
    'Greenlight script normalization must read legacy script.type.'
);
assert(
    readSource('views/lifestyle/business/components/DevelopmentLabScriptWizard.tsx').includes('(initialScript as any)?.type'),
    'Development Lab Script Wizard must initialize from legacy script.type.'
);
assert(
    readSource('services/gameLoop.ts').includes('resolveProjectType(safeDetails.type, safeDetails.projectType'),
    'Release detail normalization must preserve project type aliases.'
);

console.log('Project type persistence audit passed.');
