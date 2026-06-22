import { getOwnedIpPerformance } from '../services/ownedIpPerformance';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const ownedRight: any = {
    id: 'right_solar',
    title: 'Solar Vow',
    propertyType: 'CHARACTER',
};

const linkedScript: any = {
    id: 'script_solar',
    title: 'Untitled Solar Vow Project',
    status: 'CONCEPT',
    tags: ['ACQUIRED_RIGHTS', 'OWNED_RIGHT:right_solar'],
};

const activeRelease: any = {
    id: 'release_solar',
    name: 'Solar Vow Returns',
    type: 'MOVIE',
    status: 'BLOCKBUSTER_TRACK',
    distributionPhase: 'THEATRICAL',
    totalGross: 120_000_000,
    streamingRevenue: 20_000_000,
    imdbRating: 7.5,
    releasedAtAbsoluteWeek: 100,
    projectDetails: { studioId: 'studio_1', subjectName: ' solar vow ' },
};

const completedRelease: any = {
    id: 'past_solar',
    name: 'The First Solar Vow',
    projectType: 'MOVIE',
    studioId: 'studio_1',
    subjectName: 'Solar Vow',
    gross: 80_000_000,
    streamingRevenue: 10_000_000,
    totalViews: 30_000_000,
    imdbRating: 8,
    outcomeTier: 'SUCCESS',
    releasedAtAbsoluteWeek: 80,
    awards: [{ outcome: 'WON' }],
};

const performance = getOwnedIpPerformance({
    ownedRight,
    studioId: 'studio_1',
    scripts: [linkedScript, { ...linkedScript, id: 'other_script', tags: ['OWNED_RIGHT:other'] }],
    activeReleases: [activeRelease, { ...activeRelease, id: 'other_studio', totalGross: 999_000_000, projectDetails: { studioId: 'studio_2', subjectName: 'Solar Vow' } }],
    pastProjects: [completedRelease],
});

assert(performance.linkedScripts.length === 1, 'Only scripts tagged for the owned IP should be linked.');
assert(performance.releases.length === 2, 'Existing active and completed releases should be linked.');
assert(performance.releases[0].id === 'release_solar', 'Screen history should show the newest release first.');
assert(performance.lifetimeGross === 230_000_000, 'Lifetime gross should reuse theatrical and streaming revenue.');
assert(performance.averageRating === 7.75, 'Average rating should use existing rated releases.');
assert(performance.awardsWon === 1, 'Awards should reuse completed project wins.');
assert(performance.audienceStrength === 'STRONG', 'Existing gross, ratings, and views should produce audience strength.');
assert(performance.momentum === 'HOT', 'A blockbuster-tracking active release should make momentum hot.');

const unproven = getOwnedIpPerformance({
    ownedRight,
    studioId: 'studio_1',
    scripts: [],
    activeReleases: [],
    pastProjects: [],
});

assert(unproven.audienceStrength === 'UNPROVEN', 'An unreleased IP should not receive a fabricated audience score.');
assert(unproven.momentum === 'UNPROVEN', 'An unreleased IP should have unproven momentum.');
assert(unproven.lifetimeGross === 0 && unproven.averageRating === null, 'An unreleased IP should expose empty performance values.');

const originalPerformance = getOwnedIpPerformance({
    ownedRight: {
        ...ownedRight,
        id: 'studio_original_franchise',
        ownershipSource: 'STUDIO_ORIGINAL',
        sourceProjectId: 'original_release',
        franchiseId: 'franchise_original',
    },
    studioId: 'studio_1',
    scripts: [{ ...linkedScript, id: 'continuation', tags: [], franchiseId: 'franchise_original' }],
    activeReleases: [{ ...activeRelease, id: 'original_release', projectDetails: { studioId: 'studio_1', franchiseId: 'franchise_original' } }],
    pastProjects: [],
});
assert(originalPerformance.releases.length === 1, 'Studio Original performance should match its existing franchise releases.');
assert(originalPerformance.linkedScripts.length === 1, 'Studio Original performance should match continuation scripts through franchise ID.');

console.log('Owned IP performance audit passed.');
