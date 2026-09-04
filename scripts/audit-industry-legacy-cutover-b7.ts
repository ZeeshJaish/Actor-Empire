import { processWorldTurn } from '../services/worldLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { INITIAL_PLAYER } from '../types';
import type { Player } from '../types';

const player: Player = {
    ...INITIAL_PLAYER,
    age: 35,
    currentWeek: 20,
    world: {
        ...INITIAL_PLAYER.world,
        projects: [],
        universes: {},
        upcomingRivals: [],
        industryProductions: {},
    },
    news: [],
};

const originalRandom = Math.random;
Math.random = () => 0;
let result: ReturnType<typeof processWorldTurn>;
try {
    result = processWorldTurn(player);
} finally {
    Math.random = originalRandom;
}

const canonicalProjectIds = new Set(Object.values(result.world.industryProductions || {}).map(item => item.canonicalProjectId));
const unbackedProjects = result.world.projects.filter(project => !canonicalProjectIds.has(project.id));
if (unbackedProjects.length !== 0) {
    throw new Error(`Legacy world turn created ${unbackedProjects.length} finished public project(s) without B3/B5/B6 lineage.`);
}
if ((result.world.upcomingRivals || []).some(project => !canonicalProjectIds.has(project.id))) {
    throw new Error('Upcoming rivals must be a derived compatibility projection, never an independent random schedule.');
}
if (result.news.some(item => item.id.startsWith('news_uni_rel_'))) {
    throw new Error('Legacy universe releases must not bypass canonical production and event presentation.');
}

const legacyScheduled = {
    ...player,
    world: {
        ...player.world,
        upcomingRivals: [{
            id: 'legacy_fake_release', title: 'Legacy Fake Release', genre: 'ACTION' as const,
            studioId: 'legacy_studio', budgetTier: 'HIGH' as const, quality: 80, boxOffice: 0,
            year: 35, weekReleased: 24, leadActorId: '', leadActorName: '', directorName: '', reviews: '',
        }],
    },
};
if (migratePlayerSave(legacyScheduled).world.upcomingRivals.some(item => item.id === 'legacy_fake_release')) {
    throw new Error('Save migration must remove independent legacy rival schedules.');
}
if (compactPlayerForPersistence(legacyScheduled).world.upcomingRivals.some(item => item.id === 'legacy_fake_release')) {
    throw new Error('Save compaction must never preserve an independent legacy rival schedule.');
}

console.log('B7 legacy industry cutover audit passed.');
