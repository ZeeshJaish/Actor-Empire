import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_PLAYER, Player, PastProject } from '../types';
import {
    getActorCareerArc,
    getActorCareerArcTransition,
    getActorCareerArcTransitionFromPrevious,
} from '../services/actorCareerArc';

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

const clonePlayer = (overrides: Partial<Player> = {}): Player => ({
    ...structuredClone(INITIAL_PLAYER),
    ...overrides,
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        ...(overrides.stats || {}),
        skills: {
            ...structuredClone(INITIAL_PLAYER.stats.skills),
            ...(overrides.stats?.skills || {}),
        },
        genreXP: {
            ...structuredClone(INITIAL_PLAYER.stats.genreXP),
            ...(overrides.stats?.genreXP || {}),
        },
    },
});

const project = (id: string, year: number, rating: number, outcomeTier: PastProject['outcomeTier'], gross = 0, budget = 10_000_000): PastProject => ({
    id,
    name: id,
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    year,
    earnings: 0,
    rating,
    reception: '',
    projectQuality: rating * 10,
    imdbRating: rating,
    boxOfficeResult: '',
    outcomeTier,
    subtype: 'STANDALONE',
    futurePotential,
    studioId: 'NETFLIX',
    budget,
    gross,
    genre: 'DRAMA',
    projectType: 'MOVIE',
});

const cases: Array<{ label: string; player: Player; expected: ReturnType<typeof getActorCareerArc>['id'] }> = [
    {
        label: 'fresh player starts as newcomer',
        player: clonePlayer(),
        expected: 'NEWCOMER',
    },
    {
        label: 'early fame without many credits becomes rising name',
        player: clonePlayer({ stats: { ...INITIAL_PLAYER.stats, fame: 28, reputation: 30, experience: 18 } }),
        expected: 'RISING_NAME',
    },
    {
        label: 'first strong hit creates breakout arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 42, reputation: 55, experience: 30 },
            pastProjects: [project('breakout-hit', 20, 8.1, 'SUCCESS', 120_000_000, 20_000_000)],
        }),
        expected: 'BREAKOUT',
    },
    {
        label: 'three recent hits create hit streak arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 72, reputation: 68, experience: 62 },
            pastProjects: [
                project('hit-1', 22, 7.8, 'SUCCESS', 150_000_000, 30_000_000),
                project('hit-2', 23, 8.0, 'SUCCESS', 220_000_000, 40_000_000),
                project('hit-3', 24, 7.7, 'SUCCESS', 180_000_000, 35_000_000),
            ],
        }),
        expected: 'HIT_STREAK',
    },
    {
        label: 'multiple recent misses create flop era arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 50, reputation: 30, experience: 55 },
            pastProjects: [
                project('miss-1', 24, 4.8, 'FAILURE', 8_000_000, 70_000_000),
                project('miss-2', 25, 4.9, 'MAJOR_FAILURE', 12_000_000, 90_000_000),
            ],
        }),
        expected: 'FLOP_ERA',
    },
    {
        label: 'hit after recent flop creates comeback arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 58, reputation: 52, experience: 64 },
            pastProjects: [
                project('bad-run', 25, 4.7, 'FAILURE', 10_000_000, 80_000_000),
                project('comeback-hit', 26, 8.2, 'SUCCESS', 140_000_000, 25_000_000),
            ],
        }),
        expected: 'COMEBACK',
    },
    {
        label: 'high reputation prestige run creates critic darling arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 66, reputation: 88, experience: 70 },
            pastProjects: [
                project('prestige-1', 28, 8.5, 'SUCCESS', 45_000_000, 12_000_000),
                project('prestige-2', 29, 8.4, 'SUCCESS', 60_000_000, 16_000_000),
            ],
        }),
        expected: 'CRITIC_DARLING',
    },
    {
        label: 'high fame huge grosses create box office draw arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 90, reputation: 70, experience: 80 },
            pastProjects: [
                project('tentpole-1', 30, 7.4, 'SUCCESS', 700_000_000, 180_000_000),
                project('tentpole-2', 31, 7.3, 'SUCCESS', 620_000_000, 160_000_000),
            ],
        }),
        expected: 'BOX_OFFICE_DRAW',
    },
    {
        label: 'high fame reputation experience and wins create legend arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 96, reputation: 92, experience: 94 },
            pastProjects: [
                project('legacy-1', 40, 8.1, 'SUCCESS', 300_000_000, 70_000_000),
                project('legacy-2', 41, 8.3, 'SUCCESS', 280_000_000, 55_000_000),
                project('legacy-3', 42, 8.5, 'SUCCESS', 360_000_000, 80_000_000),
            ],
            awards: [
                { id: 'a1', name: 'Oscar', category: 'Best Actor', year: 40, outcome: 'WON', projectId: 'legacy-1', projectName: 'legacy-1', type: 'OSCAR' },
                { id: 'a2', name: 'BAFTA', category: 'Best Actor', year: 41, outcome: 'WON', projectId: 'legacy-2', projectName: 'legacy-2', type: 'BAFTA' },
            ],
        }),
        expected: 'INDUSTRY_LEGEND',
    },
    {
        label: 'award momentum creates award season arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 54, reputation: 72, experience: 58 },
            pastProjects: [
                project('solid-drama', 32, 7.2, 'NEUTRAL', 42_000_000, 18_000_000),
            ],
            awards: [
                { id: 'n1', name: 'Golden Globe', category: 'Best Actor', year: 32, outcome: 'NOMINATED', projectId: 'solid-drama', projectName: 'solid-drama', type: 'GOLDEN_GLOBE' },
                { id: 'n2', name: 'BAFTA', category: 'Best Actor', year: 32, outcome: 'NOMINATED', projectId: 'solid-drama', projectName: 'solid-drama', type: 'BAFTA' },
            ],
        }),
        expected: 'AWARD_SEASON',
    },
    {
        label: 'older actor with fresh hit creates reinvention arc',
        player: clonePlayer({
            age: 39,
            stats: { ...INITIAL_PLAYER.stats, fame: 52, reputation: 52, experience: 68 },
            pastProjects: [
                project('chapter-1', 20, 6.6, 'NEUTRAL', 30_000_000, 18_000_000),
                project('chapter-2', 21, 6.7, 'NEUTRAL', 32_000_000, 18_000_000),
                project('chapter-3', 22, 6.8, 'NEUTRAL', 34_000_000, 18_000_000),
                project('chapter-4', 23, 6.6, 'NEUTRAL', 30_000_000, 18_000_000),
                project('chapter-5', 24, 6.7, 'NEUTRAL', 32_000_000, 18_000_000),
                project('chapter-6', 25, 6.8, 'NEUTRAL', 34_000_000, 18_000_000),
                project('chapter-7', 26, 6.6, 'NEUTRAL', 30_000_000, 18_000_000),
                project('fresh-turn', 27, 7.8, 'SUCCESS', 90_000_000, 30_000_000),
            ],
        }),
        expected: 'REINVENTION',
    },
    {
        label: 'respected niche career creates cult favorite arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 44, reputation: 74, experience: 38 },
            pastProjects: [
                project('niche-1', 28, 7.0, 'NEUTRAL', 20_000_000, 12_000_000),
                project('niche-2', 29, 7.1, 'NEUTRAL', 22_000_000, 12_000_000),
                project('niche-3', 30, 7.0, 'NEUTRAL', 21_000_000, 12_000_000),
            ],
        }),
        expected: 'CULT_FAVORITE',
    },
    {
        label: 'busy consistent career creates steady worker arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 36, reputation: 48, experience: 54 },
            pastProjects: [
                project('work-1', 20, 6.5, 'NEUTRAL', 24_000_000, 15_000_000),
                project('work-2', 21, 6.6, 'NEUTRAL', 25_000_000, 15_000_000),
                project('work-3', 22, 6.5, 'NEUTRAL', 24_000_000, 15_000_000),
                project('work-4', 23, 6.6, 'NEUTRAL', 25_000_000, 15_000_000),
                project('work-5', 24, 6.5, 'NEUTRAL', 24_000_000, 15_000_000),
            ],
        }),
        expected: 'STEADY_WORKER',
    },
    {
        label: 'high fame bad latest result creates under pressure arc',
        player: clonePlayer({
            stats: { ...INITIAL_PLAYER.stats, fame: 78, reputation: 42, experience: 65 },
            pastProjects: [
                project('public-miss', 31, 5.1, 'FAILURE', 18_000_000, 90_000_000),
            ],
        }),
        expected: 'UNDER_PRESSURE',
    },
];

const failures = cases
    .map(item => ({ ...item, actual: getActorCareerArc(item.player).id }))
    .filter(item => item.actual !== item.expected);

const comebackTransition = getActorCareerArcTransition(
    clonePlayer({
        stats: { ...INITIAL_PLAYER.stats, fame: 58, reputation: 42, experience: 60 },
        pastProjects: [
            project('miss-before-turnaround', 25, 4.8, 'FAILURE', 8_000_000, 70_000_000),
            project('second-miss-before-turnaround', 26, 4.9, 'MAJOR_FAILURE', 9_000_000, 80_000_000),
        ],
    }),
    clonePlayer({
        stats: { ...INITIAL_PLAYER.stats, fame: 62, reputation: 55, experience: 64 },
        pastProjects: [
            project('miss-before-turnaround', 25, 4.8, 'FAILURE', 8_000_000, 70_000_000),
            project('second-miss-before-turnaround', 26, 4.9, 'MAJOR_FAILURE', 9_000_000, 80_000_000),
            project('turnaround-hit', 27, 8.1, 'SUCCESS', 140_000_000, 30_000_000),
        ],
    })
);

const previousComebackPlayer = clonePlayer({
    stats: { ...INITIAL_PLAYER.stats, fame: 58, reputation: 42, experience: 60 },
    pastProjects: [
        project('miss-before-turnaround', 25, 4.8, 'FAILURE', 8_000_000, 70_000_000),
        project('second-miss-before-turnaround', 26, 4.9, 'MAJOR_FAILURE', 9_000_000, 80_000_000),
    ],
});
const currentComebackPlayer = clonePlayer({
    stats: { ...INITIAL_PLAYER.stats, fame: 62, reputation: 55, experience: 64 },
    pastProjects: [
        ...previousComebackPlayer.pastProjects,
        project('turnaround-hit', 27, 8.1, 'SUCCESS', 140_000_000, 30_000_000),
    ],
});
const compactComebackTransition = getActorCareerArcTransitionFromPrevious(
    getActorCareerArc(previousComebackPlayer),
    currentComebackPlayer,
);
const unchangedPlayer = clonePlayer();
const compactUnchangedTransition = getActorCareerArcTransitionFromPrevious(
    getActorCareerArc(unchangedPlayer),
    unchangedPlayer,
);

const comebackArc = getActorCareerArc(cases.find(item => item.expected === 'COMEBACK')!.player);
const arcMetadataFailures = [
    !comebackArc.labelKey && 'COMEBACK arc should expose a translation labelKey',
    !comebackArc.summaryKey && 'COMEBACK arc should expose a translation summaryKey',
    !comebackArc.detailKey && 'COMEBACK arc should expose a translation detailKey',
    !comebackArc.changeLogKey && 'COMEBACK arc should expose a translation changeLogKey',
    comebackArc.signals.length < 2 && 'COMEBACK arc should expose multiple localized signal keys',
    comebackTransition?.previous.id !== 'FLOP_ERA' && `transition should start from FLOP_ERA, got ${comebackTransition?.previous.id || 'none'}`,
    comebackTransition?.current.id !== 'COMEBACK' && `transition should end at COMEBACK, got ${comebackTransition?.current.id || 'none'}`,
    comebackTransition?.logKey !== 'home.actorArc.COMEBACK.changeLog' && `transition should expose COMEBACK log key, got ${comebackTransition?.logKey || 'none'}`,
    JSON.stringify(compactComebackTransition) !== JSON.stringify(getActorCareerArcTransition(previousComebackPlayer, currentComebackPlayer))
        && 'compact previous-arc transition should match the full-player transition',
    compactUnchangedTransition !== null && 'compact previous-arc transition should stay null when the arc is unchanged',
].filter(Boolean);

const root = process.cwd();
const homeSource = fs.readFileSync(path.join(root, 'views/HomePage.tsx'), 'utf8');
const gameLoopSource = fs.readFileSync(path.join(root, 'services/gameLoop.ts'), 'utf8');
const uiFailures = [
    !homeSource.includes('showActorArcSheet') && 'Home page should open an actor arc detail sheet',
    !homeSource.includes('tr(actorCareerArc.labelKey)') && 'Home page should render localized actor arc label',
    !homeSource.includes('actorCareerArc.signals') && 'Home page should render actor arc signal bullets',
    !gameLoopSource.includes('getActorCareerArcTransition') && 'Weekly loop should check actor arc transitions',
    !gameLoopSource.includes('actorArcTransition.logKey') && 'Weekly loop should log localized actor arc transitions',
].filter(Boolean);

if (failures.length) {
    console.error('Actor career arc audit failed:');
    failures.forEach(item => console.error(`- ${item.label}: expected ${item.expected}, got ${item.actual}`));
    process.exit(1);
}

if (arcMetadataFailures.length || uiFailures.length) {
    console.error('Actor career arc polish audit failed:');
    [...arcMetadataFailures, ...uiFailures].forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log(`Actor career arc audit passed (${cases.length} scenarios).`);
