import { deriveStudioOriginalRights } from '../services/studioOriginalIp';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const scripts: any[] = [
    { id: 'script_phoenix', title: 'Phoenix Circuit', isOriginal: true },
    { id: 'script_phoenix_2', title: 'Phoenix Circuit 2', isOriginal: true, franchiseId: 'fran_phoenix' },
    { id: 'script_indie', title: 'Indie Spark', isOriginal: true },
    { id: 'script_market', title: 'Bought Script', isOriginal: false },
];

const activeReleases: any[] = [{
    id: 'phoenix_1',
    name: 'Phoenix Circuit',
    type: 'MOVIE',
    totalGross: 640_000_000,
    imdbRating: 8.1,
    releaseYear: 19,
    releaseWeek: 1,
    projectDetails: {
        studioId: 'studio_1',
        sourceScriptId: 'script_phoenix',
        isOriginal: true,
        genre: 'SCI_FI',
        franchiseId: 'fran_phoenix',
        universeId: 'universe_circuit',
    },
}];

const pastProjects: any[] = [
    {
        id: 'phoenix_2',
        name: 'Phoenix Circuit 2',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        sourceScriptId: 'script_phoenix_2',
        isOriginal: true,
        genre: 'SCI_FI',
        franchiseId: 'fran_phoenix',
        universeId: 'universe_circuit',
        gross: 400_000_000,
        imdbRating: 7.8,
        releaseYear: 20,
    },
    {
        id: 'indie_1',
        name: 'Indie Spark',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        genre: 'DRAMA',
        gross: 45_000_000,
        imdbRating: 7.2,
        releaseYear: 18,
    },
    {
        id: 'solar_release',
        name: 'Solar Vow Returns',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        subjectName: 'Solar Vow',
        genre: 'ACTION',
        gross: 200_000_000,
    },
    {
        id: 'market_release',
        name: 'Bought Script',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        sourceScriptId: 'script_market',
        genre: 'THRILLER',
        gross: 100_000_000,
    },
    {
        id: 'legacy_original',
        name: 'Legacy Original',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        genre: 'COMEDY',
        gross: 90_000_000,
    },
    {
        id: 'purchased_archive',
        name: 'Purchased Archive',
        projectType: 'MOVIE',
        studioId: 'studio_1',
        genre: 'ACTION',
        gross: 120_000_000,
    },
];

const originals = deriveStudioOriginalRights({
    studioId: 'studio_1',
    scripts,
    activeReleases,
    pastProjects,
    acquiredRights: [{ id: 'right_solar', title: 'Solar Vow', ownershipSource: 'ACQUIRED' } as any],
    purchasedIPTitles: ['Purchased Archive'],
});

assert(originals.length === 3, 'Only released original IP should enter the unified library.');
const phoenix = originals.find(item => item.franchiseId === 'fran_phoenix');
assert(phoenix?.title === 'Phoenix Circuit', 'A franchise should use its earliest original release as the IP title.');
assert(phoenix?.projectsUsed === 2 && phoenix.propertyType === 'FRANCHISE', 'Original franchise releases should group into one IP.');
assert(phoenix?.universeId === 'universe_circuit', 'Universe membership should remain a link, not a duplicate IP.');
assert(phoenix?.ownershipSource === 'STUDIO_ORIGINAL', 'Derived originals must identify their ownership provenance.');
const indie = originals.find(item => item.title === 'Indie Spark');
assert(indie?.propertyType === 'STORY_WORLD' && indie.sourceProjectId === 'indie_1', 'Legacy title matching should register standalone originals.');
assert(!originals.some(item => item.title.includes('Solar Vow')), 'Acquired IP releases must not duplicate as Studio Original.');
assert(!originals.some(item => item.title === 'Bought Script'), 'Purchased non-original scripts must not become Studio Original IP.');
assert(originals.some(item => item.title === 'Legacy Original'), 'Legacy unmatched studio releases should remain visible as Studio Original IP.');
assert(!originals.some(item => item.title === 'Purchased Archive'), 'Legacy purchased titles must not be misclassified as Studio Original IP.');

console.log('Studio Original IP audit passed.');
