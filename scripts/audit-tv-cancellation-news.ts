import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type ActiveRelease, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { processGameWeek } from '../services/gameLoop';

// Catch the next-season number leaking into "cancelled after season N" news.
// Exercise the weekly loop so both the headline and its inbox message are checked.
const cases = [
    { title: 'Hello There', season: 1, nextSeason: 2, owned: true },
    { title: 'Actor Show Season 1', season: 1, nextSeason: 2 },
    { title: 'Later Show Season 4', season: 4, nextSeason: 5 },
    { title: 'Renamed Show', installment: 3, season: 3, nextSeason: 4 },
    { title: 'Old Title Season 2', installment: 4, season: 4, nextSeason: 5 },
    { title: 'Legacy Show season   3', season: 3, nextSeason: 4 },
];

const player: Player = structuredClone(INITIAL_PLAYER);
player.name = 'TV Cancellation Audit';
player.age = 28;
player.currentWeek = 32;
player.money = 10_000_000;
player.news = [];
player.inbox = [];
player.logs = [];
player.commitments = [];
player.pendingEvents = [];
player.scheduledEvents = [];

const studio = createBusiness('Cancellation Audit Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
    quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW',
}, '🎬', player.currentWeek);
player.businesses = [studio];
player.activeReleases = cases.map((scenario, index): ActiveRelease => ({
    id: `tv_cancellation_${index}`,
    name: scenario.title,
    type: 'SERIES',
    roleType: 'LEAD',
    distributionPhase: 'STREAMING',
    weekNum: 8,
    weeklyGross: [],
    totalGross: 0,
    budget: 20_000_000,
    status: 'RUNNING',
    imdbRating: 7.1,
    productionPerformance: 70,
    streamingRevenue: 1_000_000,
    streaming: {
        platformId: 'YOUTUBE',
        weekOnPlatform: 8,
        totalViews: 7_000_000,
        weeklyViews: [1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000],
        isLeaving: false,
    },
    projectDetails: {
        title: scenario.title,
        type: 'SERIES',
        description: 'Cancellation regression fixture',
        studioId: scenario.owned ? studio.id : 'ARTISAN_PICTURES',
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        budgetTier: 'MID',
        estimatedBudget: 20_000_000,
        visibleHype: 'MID',
        directorName: 'Audit Director',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Positive',
        visibleCastStrength: 'Solid',
        installmentNumber: scenario.installment,
        hiddenStats: {
            scriptQuality: 70,
            directorQuality: 70,
            castingStrength: 70,
            distributionPower: 70,
            rawHype: 70,
            qualityScore: 71,
            prestigeBonus: 0,
            platformId: 'YOUTUBE',
            rareChaosResolved: true,
        },
    },
}));

const originalRandom = Math.random;
try {
    // Force a rejected renewal; the season/message logic remains real.
    Math.random = () => 0.999;
    const result = (await processGameWeek(player)).player;
    for (const [index, scenario] of cases.entries()) {
        const release = result.activeReleases.find(item => item.id === `tv_cancellation_${index}`);
        assert.equal(release?.futurePotential?.seriesStatus, 'CANCELLED', scenario.title);
        const cancellation = result.news.filter(item => item.headline === `'${scenario.title}' cancelled after season ${scenario.season}.`);
        assert.equal(cancellation.length, 1, `${scenario.title}: headline must report the released season ${scenario.season}`);
        const message = result.inbox.find(item => item.id.startsWith(`renewal_pass_tv_cancellation_${index}_`));
        assert.equal(message?.subject, `No Season ${scenario.nextSeason}`, scenario.title);
        assert.ok(message?.text.includes(`Season ${scenario.nextSeason}`), `${scenario.title}: inbox must refer to the unmade next season`);
        assert.ok(!result.news.some(item => item.headline === `'${scenario.title}' cancelled after season ${scenario.nextSeason}.`));
        console.log(`${scenario.title}: after season ${scenario.season}; ${message.subject}`);
    }
} finally {
    Math.random = originalRandom;
}

console.log('TV cancellation news and inbox audit passed (6 weekly-loop cases).');
