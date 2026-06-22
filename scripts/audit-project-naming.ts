import { strict as assert } from 'node:assert';
import { ProjectConcept, Script } from '../types';
import {
    canRenameProjectTitle,
    canManageWorkingTitle,
    discardUnreleasedScript,
    getProjectTitleError,
    normalizeProjectTitle,
    renameScriptWorkingTitle,
    renameStudioProjectTitle
} from '../services/projectNaming';

const makeScript = (overrides: Partial<Script> = {}): Script => ({
    id: 'script_active',
    title: 'Working Title',
    genres: ['DRAMA'],
    status: 'CONCEPT',
    quality: 50,
    options: [],
    writerId: null,
    weeksInDevelopment: 0,
    totalDevelopmentWeeks: 4,
    isOriginal: true,
    projectType: 'MOVIE',
    ...overrides
});

const makeConcept = (overrides: Partial<ProjectConcept> = {}): ProjectConcept => ({
    id: 'concept_active',
    scriptId: 'script_active',
    lastUpdated: 1,
    crewModes: {},
    selectedCrew: {},
    castList: [],
    selectedLocations: [],
    tone: 50,
    ...overrides
});

assert.equal(
    normalizeProjectTitle('  The   Last   Horizon  '),
    'The Last Horizon',
    'Working titles should trim and collapse repeated whitespace.'
);
assert.equal(getProjectTitleError('   '), 'Enter a working title.', 'Blank titles must be rejected.');
assert.ok(getProjectTitleError('A'.repeat(73)), 'Overlong titles must be rejected.');
assert.equal(getProjectTitleError('A Valid Title'), null, 'Valid working titles should pass validation.');

assert.equal(canManageWorkingTitle('CONCEPT'), true, 'Concept titles should remain editable.');
assert.equal(canManageWorkingTitle('IN_DEVELOPMENT'), true, 'Scripts in development should remain editable.');
assert.equal(canManageWorkingTitle('READY'), true, 'Ready scripts should remain editable before Greenlight.');
assert.equal(canManageWorkingTitle('PRODUCED'), false, 'Greenlit/produced titles must be locked.');

assert.equal(canRenameProjectTitle('DEVELOPMENT'), true, 'Development titles should remain editable.');
assert.equal(canRenameProjectTitle('PLANNING'), true, 'Planning titles should remain editable.');
assert.equal(canRenameProjectTitle('PRE-PRODUCTION'), true, 'Pre-production titles should remain editable.');
assert.equal(canRenameProjectTitle('PRODUCTION'), false, 'Titles must lock when filming begins.');
assert.equal(canRenameProjectTitle('POST-PRODUCTION'), false, 'Post-production titles must stay locked.');
assert.equal(canRenameProjectTitle('RELEASED'), false, 'Released titles must stay locked.');

const activeScript = makeScript();
const unrelatedScript = makeScript({ id: 'script_other', title: 'Other Draft' });
const activeConcept = makeConcept();
const unrelatedConcept = makeConcept({ id: 'concept_other', scriptId: 'script_other' });
const discarded = discardUnreleasedScript(
    [activeScript, unrelatedScript],
    [activeConcept, unrelatedConcept],
    activeScript.id
);

assert.equal(discarded.discarded, true, 'An unreleased script should be discardable.');
assert.deepEqual(discarded.scripts.map(script => script.id), ['script_other'], 'Only the selected script should be removed.');
assert.deepEqual(
    discarded.concepts.map(concept => concept.id),
    ['concept_other'],
    'The discarded script linked concept should also be removed.'
);

const producedScript = makeScript({ id: 'script_released', status: 'PRODUCED' });
const protectedResult = discardUnreleasedScript(
    [producedScript],
    [makeConcept({ id: 'concept_released', scriptId: producedScript.id })],
    producedScript.id
);

assert.equal(protectedResult.discarded, false, 'Produced scripts must not be discardable.');
assert.equal(protectedResult.scripts.length, 1, 'A produced script must be preserved.');
assert.equal(protectedResult.concepts.length, 1, 'Linked data must be preserved when discard is blocked.');

const renamePlayer = {
    id: 'player_active',
    age: 31,
    currentWeek: 18,
    news: [],
    logs: [],
    commitments: [{
        id: 'project_active',
        name: 'Old Working Title',
        projectPhase: 'PRE_PRODUCTION',
        projectDetails: {
            title: 'Old Working Title',
            sourceScriptId: 'script_active'
        }
    }],
    activeReleases: [],
    pastProjects: [],
    businesses: [{
        id: 'studio_active',
        type: 'PRODUCTION_HOUSE',
        studioState: {
            scripts: [makeScript({ id: 'script_active', title: 'Old Working Title', status: 'PRODUCED' })],
            concepts: []
        }
    }]
} as any;

const renamedPlayer = renameStudioProjectTitle(
    renamePlayer,
    'studio_active',
    {
        id: 'project_active',
        name: 'Old Working Title',
        phase: 'PRE-PRODUCTION',
        projectDetails: {
            title: 'Old Working Title',
            sourceScriptId: 'script_active'
        }
    },
    '  New   Working Title '
);

assert.notEqual(renamedPlayer, renamePlayer, 'Renaming should return an updated player.');
assert.equal(renamedPlayer.commitments[0].name, 'New Working Title', 'The active commitment title should update.');
assert.equal(
    renamedPlayer.commitments[0].projectDetails.title,
    'New Working Title',
    'The project details title should update.'
);
assert.equal(
    renamedPlayer.businesses[0].studioState.scripts[0].title,
    'New Working Title',
    'The linked script title should stay synchronized.'
);
assert.equal(
    renamePlayer.commitments[0].name,
    'Old Working Title',
    'Renaming must not mutate the original player.'
);
assert.equal(
    renamedPlayer.news[0].headline,
    'Old Working Title gets a new working title',
    'Renaming an active pre-production project should create a light industry news item.'
);
assert.match(
    renamedPlayer.logs[0].message,
    /renamed from "Old Working Title" to "New Working Title"/,
    'Renaming should leave a local log for debugging and player history.'
);

const sameTitlePlayer = renameStudioProjectTitle(
    renamePlayer,
    'studio_active',
    {
        id: 'project_active',
        name: 'Old Working Title',
        phase: 'PRE-PRODUCTION',
        projectDetails: {
            title: 'Old Working Title',
            sourceScriptId: 'script_active'
        }
    },
    'Old Working Title'
);

assert.equal(sameTitlePlayer, renamePlayer, 'Submitting the same title should be a no-op.');

const scriptRenamePlayer = {
    id: 'player_active',
    age: 31,
    currentWeek: 18,
    news: [],
    logs: [],
    commitments: [],
    businesses: [{
        id: 'studio_active',
        type: 'PRODUCTION_HOUSE',
        studioState: {
            scripts: [
                makeScript({ id: 'script_ready', title: 'Untitled Spin Off Series', status: 'READY' }),
                makeScript({ id: 'script_produced', title: 'Locked Release', status: 'PRODUCED' })
            ],
            concepts: []
        }
    }]
} as any;

const renamedScriptPlayer = renameScriptWorkingTitle(
    scriptRenamePlayer,
    'studio_active',
    'script_ready',
    '  Dynasty   Rising '
);

assert.notEqual(renamedScriptPlayer, scriptRenamePlayer, 'Ready scripts should be renameable before greenlight.');
assert.equal(
    renamedScriptPlayer.businesses[0].studioState.scripts[0].title,
    'Dynasty Rising',
    'Script Vault rename should update the selected script title.'
);
assert.equal(
    renamedScriptPlayer.news[0].headline,
    'Untitled Spin Off Series gets a new working title',
    'Script-only renames should also create a small development buzz item.'
);

const producedScriptRename = renameScriptWorkingTitle(
    scriptRenamePlayer,
    'studio_active',
    'script_produced',
    'New Locked Title'
);

assert.equal(producedScriptRename, scriptRenamePlayer, 'Produced scripts must stay locked.');

console.log('Project naming audit passed.');
