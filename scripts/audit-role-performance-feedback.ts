import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_PLAYER, PastProject, Player } from '../types';
import { getRolePerformanceBreakdown } from '../services/rolePerformanceBreakdown';

const futurePotential: PastProject['futurePotential'] = {
    sequelChance: 0,
    franchiseChance: 0,
    rebootChance: 0,
    renewalChance: 0,
    isFranchiseStarter: false,
    isSequelGreenlit: false,
    isRenewed: false,
    seriesStatus: 'N/A',
};

const credit = (
    id: string,
    role: NonNullable<PastProject['playerCharacterProfile']>['storyRole'],
    performance: number,
    week: number,
    roleType: PastProject['roleType'] = 'LEAD'
): PastProject => ({
    id,
    name: `Credit ${id}`,
    type: 'ACTING_GIG',
    roleType,
    playerCharacterProfile: {
        storyFunction: role === 'VILLAIN' ? 'ANTAGONIST' : 'PROTAGONIST',
        storyRole: role,
        abilityType: 'NONE',
        nature: 'HUMAN',
        identitySource: 'PLAYER',
    },
    playerRolePerformance: performance,
    year: 25,
    earnings: 1_000_000,
    rating: performance / 10,
    reception: 'FINISHED',
    projectQuality: performance,
    imdbRating: performance / 10,
    boxOfficeResult: '$100M',
    outcomeTier: performance >= 75 ? 'SUCCESS' : 'NEUTRAL',
    subtype: 'STANDALONE',
    futurePotential,
    studioId: 'NETFLIX',
    budget: 20_000_000,
    gross: 100_000_000,
    genre: 'CRIME',
    projectType: 'MOVIE',
    releasedAtAbsoluteWeek: week,
    castList: [
        { id: 'player', name: 'Player', role: roleType, isPlayer: true, image: '', type: 'ACTOR' },
        { id: 'co-star', name: 'Co Star', role: 'Supporting', isPlayer: false, image: '', type: 'ACTOR' },
        { id: 'co-star-2', name: 'Second Star', role: 'Supporting', isPlayer: false, image: '', type: 'ACTOR' },
    ],
    audienceReception: {
        openingScore: performance,
        currentScore: performance,
        trend: 'STEADY',
        label: 'Final',
        summary: '',
        sampleSize: 1_000,
        updatedWeek: 10,
        updatedYear: 25,
        isFinal: true,
        quotes: [],
    },
});

const credits = [
    credit('villain-1', 'VILLAIN', 80, 1_301),
    credit('villain-2', 'VILLAIN', 85, 1_302),
    credit('villain-3', 'VILLAIN', 88, 1_303),
    credit('villain-4', 'VILLAIN', 91, 1_304),
];
const player = {
    ...structuredClone(INITIAL_PLAYER),
    age: 25,
    currentWeek: 10,
    pastProjects: credits,
    activeReleases: [],
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        fame: 40,
        reputation: 55,
        experience: 45,
    },
} as Player;

const latest = getRolePerformanceBreakdown(player, credits[3]);
assert.ok(latest, 'completed identified role should create a report');
assert.equal(latest.role, 'VILLAIN');
assert.ok(latest.performance >= 90, 'stored player performance should drive the headline score');
assert.ok(latest.masteryGain > 0, 'a completed role should explain its mastery contribution');
assert.ok(latest.typecastingPressure >= 78, 'a concentrated run should surface typecasting pressure');
assert.match(latest.careerEffect, /role|offer|casting|type/i);

const firstAttemptPlayer = {
    ...player,
    pastProjects: [credit('hero-first', 'HERO', 90, 1_305)],
} as Player;
const againstType = getRolePerformanceBreakdown(firstAttemptPlayer, firstAttemptPlayer.pastProjects[0]);
assert.equal(againstType?.roleFitLabel, 'AGAINST TYPE');
assert.ok((againstType?.masteryGain || 0) >= 16, 'successful against-type work should receive a mastery bonus');

assert.deepEqual(
    getRolePerformanceBreakdown(player, credits[3]),
    latest,
    'reopening or reloading the same credit must not award or mutate mastery'
);

const repoRoot = path.resolve(process.cwd());
const boxOfficeSource = fs.readFileSync(path.join(repoRoot, 'views/mobile/BoxOfficeApp.tsx'), 'utf8');
const homeSource = fs.readFileSync(path.join(repoRoot, 'views/HomePage.tsx'), 'utf8');
assert.match(boxOfficeSource, /<RolePerformanceReport player=\{player\} project=\{archivedRoleProject\}/);
assert.match(homeSource, /<RolePerformanceReport player=\{player\} project=\{latestRoleCredit\} compact/);

console.log('Role performance feedback audit passed: results, mastery, typecasting, and duplicate-safe replay.');

