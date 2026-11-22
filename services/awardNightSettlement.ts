import type {
    AwardHistoryEntry, AwardType, GameLanguage, IndustryEventEvidence, IndustryEventFact, IndustryEventImportance,
    NewsItem, Player,
} from '../types';
import type { Nomination } from './awardLogic';
import { pickAwardBallotWinner } from './awardLogic';
import { getAwardCategorySpec } from './awardCategories';
import { createDeterministicId } from './deterministicRandom';
import { t } from './i18n';
import { appendIndustryEventFacts, createIndustryEventFact } from './industryWorld/industryEventLedger';
import { composeCopy, fillCopy, pickFreshCopy, sentenceStart, type CopyVars } from './industryWorld/mediaCopyVariety';
import { getAbsoluteWeek } from './legacyLogic';
import { creditTalentAward } from './talentCareer';

/* 21 Nov 2026 (Zeesh): "player ke ceremony me jaane wali raat NPC credit aur news nahi milti, ise theek karo,
   properly integrate"; "news formulas aur combinations se bane, 4-5 typed lines random nahi".

   One award night settles the same way whichever way it happens (the player attends, or it is broadcast):
   - the winners' NPC talent (writer, director, lead actor) gets its award credit;
   - the player's streaming Originals that won are logged (#293);
   - the night's results go to the industry ledger as AWARD_WON facts, which the media system covers through its own
     outlets, critics' voices, fandoms and narratives (it was wired for AWARD_* but never fed);
   - one headline for the night's top prize, and on an attended night one for the player's own wins, go to the news.
   Every line is composed from independent slots (frame x opener x angle x closer), with the angle chosen by what
   happened (an upset, a sweep, a season's momentum, the player's studio), and a frame the recent news already used is
   skipped. The same night always reads the same way (seeded), and no two nights read alike. */

type Winner = AwardHistoryEntry['winners'][number];
type CategoryKind = 'TOP' | 'DIRECTOR' | 'LEAD' | 'SUPPORTING' | 'WRITING' | 'MUSIC' | 'CRAFT';

/* 22 Nov 2026: read from the one category table ("Outstanding Directing for a Drama Series" is directing, "Best
   Actress - Motion Picture Drama" is acting), not from words in the name */
const categoryKind = (category: string): CategoryKind => {
    const spec = getAwardCategorySpec(category);
    switch (spec.kind) {
        case 'ACTING': return spec.role === 'SUPPORTING' ? 'SUPPORTING' : 'LEAD';
        case 'DIRECTOR': return 'DIRECTOR';
        case 'SCREENPLAY': return 'WRITING';
        case 'SCORE':
        case 'SONG': return 'MUSIC';
        case 'PICTURE': return 'TOP';
        default: return 'CRAFT';
    }
};

const TOP_HEADLINES = [
    '{title} wins {category} at the {show}',
    '{show}: {title} takes {category}',
    '{title} crowned {category}',
    '{category} goes to {title}',
    'The {show} belongs to {title}',
    '{title} closes the {show} with {category}',
    '{company} takes the {show}\'s top prize with {title}',
    'Last envelope, big winner: {title}',
    '{title} takes the night at the {show}',
    'It is {title}: {category} at the {show}',
] as const;

const PERSON_HEADLINES = [
    '{winner} wins {category} for {title}',
    '{show}: {winner} takes {category}',
    '{category} goes to {winner}',
    '{winner} picks up {category} at the {show}',
    '{winner} is the {show}\'s {category}',
    '{winner} wins for {title}',
    'The {show} rewards {winner}',
    'A {show} trophy for {winner}',
] as const;

const DETAIL_OPENERS = [
    '{winner} took {category} at the {show} for {title}.',
    'The {show} gave {category} to {title}.',
    'Voters at the {show} picked {title} for {category}.',
    'When the envelope for {category} opened, it read {title}.',
    '{category} at the {show} went to {title}.',
    'The {show} named {title} for {category}.',
] as const;

const ANGLES: Record<'UPSET' | 'MOMENTUM' | 'SWEEP' | 'STUDIO' | 'PLAIN', readonly string[]> = {
    UPSET: [
        '{runnerUp} had been the safer bet.',
        'Few saw it beating {runnerUp}.',
        'It edged out {runnerUp}, the favourite on paper.',
        'The room had expected {runnerUp}.',
    ],
    MOMENTUM: [
        'It adds to an already strong season.',
        'That makes it {seasonWins} wins this season.',
        'The season keeps going its way.',
        'It keeps a winning run going.',
    ],
    SWEEP: [
        'It was the night\'s big story, with {nightWins} wins.',
        '{title} left with {nightWins} trophies.',
        'Nobody won more tonight: {nightWins} for {title}.',
        '{nightWins} wins made it the night of {title}.',
    ],
    STUDIO: [
        'It is a big night for {company}.',
        '{company} will feel this one.',
        'A win {company} can put on every poster.',
        'For {company}, it was the moment of the night.',
    ],
    PLAIN: [
        'It beat {runnerUp} among others.',
        'The other nominees included {runnerUp}.',
        '{runnerUp} was also in the race.',
        'It was up against {runnerUp}.',
    ],
};

const DETAIL_CLOSERS = [
    'Expect the win in the next campaign.',
    'Streamers will watch the numbers that follow.',
    'The trophy will travel with {title} from here.',
    'Rivals are already planning their own runs.',
    'The win should help {title} find a wider audience.',
    '',
] as const;

const PLAYER_SINGLE_HEADLINES = [
    '{player} wins {category} at the {show}',
    '{show}: {category} for {player}',
    '{player} takes home {category}',
    'A {show} win for {player}',
    '{player} wins for {title}',
    '{player} lifts the {show} trophy for {category}',
] as const;

const PLAYER_MULTI_HEADLINES = [
    '{player} wins {nightWins} at the {show}',
    '{nightWins} trophies for {player} at the {show}',
    '{player}\'s big {show} night: {nightWins} wins',
    '{show}: {player} leaves with {nightWins} awards',
    '{player} takes {nightWins} categories at the {show}',
] as const;

/* one win: the headline already names it, so the detail says what it was for (no plural "categories") */
const PLAYER_SINGLE_DETAIL_SLOTS: readonly (readonly string[])[] = [
    ['For {title}.', 'The win came for {title}.', 'It was for {title}.', '{title} had its night.'],
    ['{player} thanked the team on stage.', 'Cameras followed {player} all night.', 'It is the best night of {player}\'s season so far.', 'The speech is already making the rounds.', ''],
    ['The industry noticed.', 'Expect offers to follow.', 'It changes the next negotiation.', ''],
];

const PLAYER_DETAIL_SLOTS: readonly (readonly string[])[] = [
    ['The wins: {list}.', '{list}.', 'Categories won: {list}.', 'On the night: {list}.'],
    ['{player} thanked the team on stage.', 'Cameras followed {player} all night.', 'It is the best night of {player}\'s season so far.', 'The speech is already making the rounds.', ''],
    ['The industry noticed.', 'Expect offers to follow.', 'It changes the next negotiation.', ''],
];

export interface AwardNightSettlementInput {
    awardType: AwardType;
    showName: string;
    awardYear: number;
    historyEntry: AwardHistoryEntry;
    /** The night's frozen ballot (runner-ups, upsets). */
    ballot?: Record<string, Nomination[]>;
    language: GameLanguage;
    /** The player attended the night (their wins get their own headline). */
    playerAttended?: boolean;
    /** The week the night settles in (the week loop passes its own); defaults to the player's current week. */
    absoluteWeek?: number;
}

export interface AwardNightSettlementResult {
    player: Player;
    logs: { msg: string; type: 'positive' | 'neutral' | 'negative' }[];
}

const findProject = (player: Player, projectId: string) => {
    const world = (player.world.projects || []).find(project => project.id === projectId);
    const active = player.activeReleases.find(project => project.id === projectId);
    const past = player.pastProjects.find(project => project.id === projectId);
    return { world, active, past };
};

const companyFor = (player: Player, projectId: string): { id?: string; name?: string } => {
    const { world, active, past } = findProject(player, projectId);
    const studioId = String(world?.studioId || active?.projectDetails?.studioId || (past as any)?.studioId || '');
    if (!studioId) return {};
    const ownStudio = (player.businesses || []).find(business => business.id === studioId);
    const worldStudio = (player.world as any).studios?.[studioId];
    const name = ownStudio?.name || worldStudio?.name;
    return { id: studioId, ...(name ? { name: String(name) } : {}) };
};

const isPlayerStudioProject = (player: Player, projectId: string): boolean => {
    const studioId = companyFor(player, projectId).id;
    return Boolean(studioId && (player.businesses || []).some(business => business.id === studioId));
};

/** The night's context for one winner: the runner-up, an upset, the title's wins tonight and this season. */
const winnerContext = (player: Player, input: AwardNightSettlementInput, winner: Winner) => {
    const nominees = input.ballot?.[winner.category] || [];
    const ranked = nominees.length ? [...nominees] : [];
    const top = pickAwardBallotWinner(ranked);
    const runnerUp = ranked.filter(nominee => nominee !== top).sort((a, b) => b.score - a.score)[0];
    const upset = Boolean(top && runnerUp && (runnerUp.tie?.rating ?? 0) > (top.tie?.rating ?? 0) + 4);
    const nightWins = input.historyEntry.winners.filter(other => other.projectId && other.projectId === winner.projectId).length;
    const seasonWins = (player.world.awardHistory || [])
        .filter(entry => entry.year === input.awardYear && entry.type !== input.awardType && !entry.inherited)
        .reduce((sum, entry) => sum + entry.winners.filter(other => other.projectId && other.projectId === winner.projectId).length, 0);
    /* a title award's runner-up is the title (its nominee is now the studio, no longer "Producers") */
    const titleAward = categoryKind(winner.category) === 'TOP' || getAwardCategorySpec(winner.category).kind === 'BOX_OFFICE';
    return { runnerUp: !titleAward && runnerUp?.nomineeName && !/^Producers$/.test(runnerUp.nomineeName) ? runnerUp.nomineeName : runnerUp?.project.name, upset, nightWins, seasonWins };
};

const angleFor = (context: ReturnType<typeof winnerContext>, studioOwned: boolean): keyof typeof ANGLES => {
    if (context.nightWins >= 3) return 'SWEEP';
    if (context.upset && context.runnerUp) return 'UPSET';
    if (studioOwned) return 'STUDIO';
    if (context.seasonWins > 0) return 'MOMENTUM';
    return context.runnerUp ? 'PLAIN' : 'MOMENTUM';
};

const composeWinnerCopy = (
    player: Player, input: AwardNightSettlementInput, winner: Winner, recentLines: string[],
): { headline: string; detail: string } => {
    const kind = categoryKind(winner.category);
    const context = winnerContext(player, input, winner);
    const company = companyFor(player, winner.projectId || '');
    const vars: CopyVars = {
        title: winner.projectName,
        winner: kind === 'TOP' ? winner.projectName : winner.winnerName,
        category: winner.category,
        show: input.showName,
        company: company.name || winner.projectName,
        runnerUp: context.runnerUp,
        nightWins: String(context.nightWins),
        seasonWins: String(context.seasonWins + 1),
    };
    const seed = `award-night:${input.awardType}:${input.awardYear}:${winner.category}:${winner.projectId || winner.projectName}`;
    const frames = kind === 'TOP' ? TOP_HEADLINES : PERSON_HEADLINES;
    const usable = frames.filter(frame => !frame.includes('{company}') || company.name);
    const headline = sentenceStart(fillCopy(pickFreshCopy(seed, usable, recentLines), vars));
    recentLines.push(headline);
    const angle = angleFor(context, isPlayerStudioProject(player, winner.projectId || ''));
    const detail = composeCopy(`${seed}:detail`, [DETAIL_OPENERS, ANGLES[angle], DETAIL_CLOSERS], vars);
    return { headline, detail };
};

const importanceFor = (player: Player, winner: Winner): IndustryEventImportance | null => {
    const kind = categoryKind(winner.category);
    if (kind === 'TOP') return 'HIGH';
    if (winner.isPlayer || isPlayerStudioProject(player, winner.projectId || '')) return 'MEDIUM';
    if (kind === 'DIRECTOR' || kind === 'LEAD') return 'MEDIUM';
    return null;
};

/** AWARD_WON facts for the night's results the media should cover. */
export const buildAwardWonFacts = (
    player: Player, input: AwardNightSettlementInput, absoluteWeek: number, recentLines: string[],
): IndustryEventFact[] => input.historyEntry.winners.flatMap(winner => {
    const importance = importanceFor(player, winner);
    if (!importance || !winner.projectId) return [];
    const { headline, detail } = composeWinnerCopy(player, input, winner, recentLines);
    const company = companyFor(player, winner.projectId);
    const awardEventId = `${input.awardType}:${input.awardYear}:${winner.category}`;
    const evidence: IndustryEventEvidence[] = [
        { kind: 'AWARD', id: awardEventId, metric: 'category', value: winner.category },
        { kind: 'PROJECT', id: winner.projectId },
    ];
    return [createIndustryEventFact({
        idempotencyKey: `award-won:${input.awardType}:${input.awardYear}:${absoluteWeek}:${winner.category}`,
        absoluteWeek,
        type: 'AWARD_WON',
        importance,
        ...(company.id ? { companyId: company.id } : {}),
        ...(company.name ? { companyName: company.name } : {}),
        projectId: winner.projectId,
        awardEventId,
        headline,
        detail,
        evidence,
    })];
});

/** The night's NPC winners get their award credit (writer, director, lead actor), as broadcast nights always did. */
const creditNightTalent = (player: Player, input: AwardNightSettlementInput, absoluteWeek: number): Player => {
    let world = player.world;
    input.historyEntry.winners.forEach(winner => {
        if (!winner.projectId) return;
        const { world: industryProject, active, past } = findProject(player, winner.projectId);
        const category = winner.category.toLowerCase();
        const awardId = `${input.awardType}:${input.awardYear}:${winner.category}`;
        /* 22 Nov 2026: a winner named by id (a supporting performer, a director, a writer, from the real-world ballot)
           is credited directly; the old matching by the title's credits stays for older seasons */
        const kind = getAwardCategorySpec(winner.category, input.awardType).kind;
        const role = kind === 'ACTING' ? 'ACTOR' as const : kind === 'DIRECTOR' ? 'DIRECTOR' as const : kind === 'SCREENPLAY' ? 'WRITER' as const : null;
        if (!winner.isPlayer && winner.personId && role) {
            world = creditTalentAward(world, winner.projectId, { talentId: winner.personId, talentName: winner.winnerName, role }, awardId, absoluteWeek);
            return;
        }
        if (category.includes('screenplay') || kind === 'SCREENPLAY') {
            const talentId = industryProject?.writerId || active?.projectDetails?.writerId || (past as any)?.writerId;
            const talentName = industryProject?.writerName || active?.projectDetails?.writerName || (past as any)?.writerName;
            if (talentId && talentName === winner.winnerName) {
                world = creditTalentAward(world, winner.projectId, { talentId, talentName, role: 'WRITER' }, awardId, absoluteWeek);
            }
        } else if (kind === 'DIRECTOR' && industryProject?.directorId && industryProject.directorName === winner.winnerName) {
            world = creditTalentAward(world, winner.projectId,
                { talentId: industryProject.directorId, talentName: industryProject.directorName, role: 'DIRECTOR' }, awardId, absoluteWeek);
        } else if (kind === 'ACTING' && industryProject?.leadActorId && industryProject.leadActorName === winner.winnerName) {
            world = creditTalentAward(world, winner.projectId,
                { talentId: industryProject.leadActorId, talentName: industryProject.leadActorName, role: 'ACTOR' }, awardId, absoluteWeek);
        }
    });
    return world === player.world ? player : { ...player, world };
};

/** The headline for the night's top prize (in English composed; in another language the translated line). */
const topPrizeNews = (player: Player, input: AwardNightSettlementInput, recentLines: string[]): NewsItem | null => {
    const top = input.historyEntry.winners.find(winner => categoryKind(winner.category) === 'TOP');
    if (!top) return null;
    if (input.playerAttended && top.isPlayer) return null; /* the player's own headline covers it */
    const base = {
        id: createDeterministicId('news_award', input.awardType, input.awardYear),
        category: 'INDUSTRY' as const,
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'MEDIUM' as const,
    };
    if (input.language !== 'en') {
        return { ...base, headline: t(input.language, 'services.gameLoop.awards.news.winner', { projectName: top.projectName, awardName: input.showName }) };
    }
    const copy = composeWinnerCopy(player, input, top, recentLines);
    return { ...base, headline: copy.headline, subtext: copy.detail } as NewsItem;
};

/** On an attended night, the player's own wins (one headline, however many wins). */
const playerWinsNews = (player: Player, input: AwardNightSettlementInput, recentLines: string[]): NewsItem | null => {
    if (!input.playerAttended) return null;
    const wins = input.historyEntry.winners.filter(winner => winner.isPlayer);
    if (!wins.length) return null;
    const vars: CopyVars = {
        player: player.name,
        show: input.showName,
        category: wins[0].category,
        title: wins[0].projectName,
        nightWins: String(wins.length),
        list: wins.slice(0, 4).map(win => win.category).join(', ') + (wins.length > 4 ? ` and ${wins.length - 4} more` : ''),
    };
    const seed = `award-night-player:${input.awardType}:${input.awardYear}:${player.name}`;
    const frames = wins.length === 1 ? PLAYER_SINGLE_HEADLINES : PLAYER_MULTI_HEADLINES;
    const headline = sentenceStart(fillCopy(pickFreshCopy(seed, frames, recentLines), vars));
    recentLines.push(headline);
    return {
        id: createDeterministicId('news_award_player', input.awardType, input.awardYear),
        headline,
        subtext: composeCopy(`${seed}:detail`, wins.length === 1 ? PLAYER_SINGLE_DETAIL_SLOTS : PLAYER_DETAIL_SLOTS, vars),
        category: 'TOP_STORY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'HIGH',
    } as NewsItem;
};

/** One award night, settled the same way for an attended and a broadcast ceremony. */
export const settleAwardNight = (sourcePlayer: Player, input: AwardNightSettlementInput): AwardNightSettlementResult => {
    const absoluteWeek = Number.isFinite(input.absoluteWeek)
        ? Number(input.absoluteWeek)
        : getAbsoluteWeek(sourcePlayer.age, sourcePlayer.currentWeek);
    let player = creditNightTalent(sourcePlayer, input, absoluteWeek);
    const logs: AwardNightSettlementResult['logs'] = [];

    /* #293: the platform's Original won: worth telling, without a popup */
    input.historyEntry.winners.forEach(winner => {
        if (!winner.projectId) return;
        const wonOriginal = player.ownedStreamingPlatform?.originalCommissions?.find(item => item.canonicalProjectId === winner.projectId);
        if (wonOriginal) logs.push({ msg: `🏆 ${wonOriginal.title} won ${winner.category} at the ${input.showName}.`, type: 'positive' });
    });

    const recentLines: string[] = (player.news || []).slice(0, 40).map(item => item.headline || '').filter(Boolean);
    const facts = buildAwardWonFacts(player, input, absoluteWeek, recentLines);
    if (facts.length) {
        player = { ...player, world: { ...player.world, industryEvents: appendIndustryEventFacts(player.world.industryEvents, facts) } };
    }
    const news = [playerWinsNews(player, input, recentLines), topPrizeNews(player, input, recentLines)]
        .filter((item): item is NewsItem => Boolean(item))
        .filter(item => !(player.news || []).some(existing => existing.id === item.id));
    if (news.length) player = { ...player, news: [...news, ...(player.news || [])] };
    return { player, logs };
};

/* ---------- nominations: the race the media can follow ---------- */

const NOMINATION_HEADLINES = [
    '{title} earns a {show} nomination for {category}',
    '{show} nominations: {title} is in the {category} race',
    '{title} makes the {show} shortlist',
    '{category} at the {show}: {title} is a contender',
    '{title} in the running at the {show}',
    'A {show} nod for {title}',
] as const;

const NOMINATION_DETAILS: readonly (readonly string[])[] = [
    ['The {show} has named {title} for {category}.', '{title} is one of the {show}\'s picks for {category}.', 'Voters put {title} on the {category} list.'],
    ['The winner is named at the ceremony.', 'Campaign season starts now.', 'Now the campaigning begins.', ''],
];

/** AWARD_NOMINATED facts at the invite week: the player's nominations and the top category's field. */
export const buildAwardNominationFacts = (
    player: Player, awardType: AwardType, showName: string, awardYear: number,
    nominations: Nomination[], ballot: Record<string, Nomination[]>,
): IndustryEventFact[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const recentLines: string[] = (player.news || []).slice(0, 40).map(item => item.headline || '').filter(Boolean);
    const topCategory = Object.keys(ballot).find(category => categoryKind(category) === 'TOP');
    const entries: { nomination: Nomination; importance: IndustryEventImportance }[] = [
        ...nominations.map(nomination => ({ nomination, importance: 'MEDIUM' as const })),
        ...(topCategory ? (ballot[topCategory] || []).filter(nominee => !nominee.isPlayer)
            .map(nomination => ({ nomination, importance: 'LOW' as const })) : []),
    ];
    const seen = new Set<string>();
    return entries.flatMap(({ nomination, importance }) => {
        const key = `${nomination.category}:${nomination.project.id}`;
        if (seen.has(key) || /^award_fallback/.test(nomination.project.id)) return [];
        seen.add(key);
        const vars: CopyVars = { title: nomination.project.name, category: nomination.category, show: showName };
        const seed = `award-nomination:${awardType}:${awardYear}:${key}`;
        const headline = sentenceStart(fillCopy(pickFreshCopy(seed, NOMINATION_HEADLINES, recentLines), vars));
        recentLines.push(headline);
        const company = companyFor(player, nomination.project.id);
        const awardEventId = `${awardType}:${awardYear}:${nomination.category}`;
        return [createIndustryEventFact({
            idempotencyKey: `award-nominated:${awardType}:${awardYear}:${absoluteWeek}:${key}`,
            absoluteWeek,
            type: 'AWARD_NOMINATED',
            importance,
            ...(company.id ? { companyId: company.id } : {}),
            ...(company.name ? { companyName: company.name } : {}),
            projectId: nomination.project.id,
            awardEventId,
            headline,
            detail: composeCopy(`${seed}:detail`, NOMINATION_DETAILS, vars),
            evidence: [
                { kind: 'AWARD', id: awardEventId, metric: 'category', value: nomination.category },
                { kind: 'PROJECT', id: nomination.project.id },
            ],
        })];
    });
};
