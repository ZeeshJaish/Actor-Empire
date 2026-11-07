import type { Gender, OwnedStreamingOriginalCommission, OwnedStreamingOriginalIssue, Player } from '../types';
import { getProjectEpisodeNames } from './episodeNames';
import { PHASE_ONE_ENERGY_COSTS } from './energyCosts';
import { formatGenreLabel } from './genreCatalog';
import { getAbsoluteWeek } from './legacyLogic';
import { NPC_DATABASE } from './npcLogic';
import { getSeasonShape, SEASON_SHAPE_NAMES } from './originalsEpisodeBudget';
import { studioPossessive } from './originalsDeal';
import { getOriginalsStudio } from './originalsStudios';
import { isOutsideOriginal } from './outsideOriginals';
import { spendPlayerEnergy } from './premiumLogic';
import { getSeasonRatings } from './seriesIdentity';
import { getStreamingOriginalLiveStatus } from './streamingOriginals';
import { getStreamingWeeklyChartView } from './streamingWeeklyChart';
import { getTitleRating } from './titleRating';

/**
 * #290: one page for an Original, from the first day to the last. While it is made it reads like the Production House: phases, who makes it, what it has
 * cost, what went wrong. Once it is live it holds the numbers and its named episodes. There is no report card screen: this is it.
 */

export type OriginalTitleStage = 'NOT_STARTED' | 'MAKING' | 'READY' | 'ON_SLATE' | 'LIVE';
export const ORIGINAL_JOURNEY_STEPS = ['Pre-production', 'Production', 'Post', 'Ready', 'On Slate', 'Live'] as const;
export const ORIGINAL_NOTE_QUALITY = 2;

const PHASE_STEP: Record<string, number> = { PLANNING: 0, SCHEDULED: 0, PRE_PRODUCTION: 0, PRODUCTION: 1, POST_PRODUCTION: 2 };
const PHASE_WORDS: Record<string, string> = { PLANNING: 'PLANNING', SCHEDULED: 'SCHEDULED', PRE_PRODUCTION: 'PRE-PRODUCTION', PRODUCTION: 'PRODUCTION', POST_PRODUCTION: 'POST-PRODUCTION' };
const NOTE_BY_PHASE: Record<string, { id: string; title: string; line: string }> = {
    PRE_PRODUCTION: { id: 'SCRIPT', title: 'Script notes', line: 'Read the scripts, and send your notes' },
    PRODUCTION: { id: 'SET', title: 'Set visit', line: 'Go and see the shoot' },
    POST_PRODUCTION: { id: 'EDIT', title: 'Edit notes', line: 'Sit in on the cut' },
};

/** #306: a second thing to do in each phase. More quality notes would be the same tap three more times, so each of these does something of its own. */
export const ORIGINAL_FIRST_LOOK_PULL = 0.05;
export const ORIGINAL_SCREENING_QUALITY = 1;
const EXTRA_BY_PHASE: Record<string, { id: string; title: string; line: string; effect: string }> = {
    PRE_PRODUCTION: { id: 'TABLE_READ', title: 'Table read', line: 'Sit down with the cast and catch problems early', effect: 'One less problem on the shoot' },
    PRODUCTION: { id: 'FIRST_LOOK', title: 'First look', line: 'Let the press onto the set', effect: '+5% viewers in its first 4 weeks' },
    POST_PRODUCTION: { id: 'TEST_SCREENING', title: 'Test screening', line: 'Show it to an audience before anyone else', effect: '+1 quality, and you see its score' },
};
const QUALITY_NOTE_IDS = new Set(Object.values(NOTE_BY_PHASE).map(note => note.id));

export interface OriginalTitlePerson { id: string; name: string; gender?: Gender; role: string; talent?: number }
export interface OriginalTitleNote { id: string; title: string; line: string; taken: boolean; energy: number; canAfford: boolean }
export interface OriginalTitleExtra extends OriginalTitleNote { effect: string }
export interface OriginalTitleEpisode { number: number; name: string; rating: number | null; best: boolean }
export interface OriginalTitleDetail {
    commission: OwnedStreamingOriginalCommission;
    title: string;
    isSeries: boolean;
    kindLine: string;
    logline: string;
    outside: boolean;
    studioName: string;
    byLabel: string;
    color: string;
    stage: OriginalTitleStage;
    stageChip: string;
    journeyAt: number;
    weeksLeft: number | null;
    totalWeeks: number | null;
    paid: number;
    paidLine: string;
    team: OriginalTitlePerson[];
    note: OriginalTitleNote | null;
    extra: OriginalTitleExtra | null;
    testScore: number | null;
    notesTaken: number;
    issues: OwnedStreamingOriginalIssue[];
    premiere: { year: number; week: number; weeksAway: number } | null;
    rating: number | null;
    chartRank: number | null;
    live: { viewers: number; finished: number; newSubs: number; stayed: number } | null;
    episodes: OriginalTitleEpisode[];
    seasonName: string | null;
    reviews: Array<{ id: string; text: string; publication: string }>;
    /** #293: what it has won */
    wins: Array<{ category: string; show: string; year: number }>;
}

const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);
const shortStudio = (name: string) => name.replace(/\s+(Pictures|Studios|Studio|Entertainment)$/i, '');

let peopleById: Map<string, any> | null = null;
const findPerson = (player: Player, id?: string | null): any => {
    if (!id) return null;
    if (!peopleById) peopleById = new Map(NPC_DATABASE.map((person: any) => [String(person.id), person]));
    return peopleById.get(String(id)) || (player.flags?.extraNPCs || []).find((person: any) => String(person.id) === String(id)) || null;
};

const rowOf = (player: Player, id: string): any => (
    (player.commitments || []).find(item => item.id === id)
    || (player.activeReleases || []).find(item => item.id === id)
    || (player.pastProjects || []).find(item => item.id === id)
    /* #294: what a bid-room order became */
    || (player.world?.projects || []).find(item => item.id === id)
);

const latestPerformance = (player: Player, id: string): any => {
    const history = player.ownedStreamingPlatform?.weeklyHistory || [];
    for (let index = history.length - 1; index >= 0; index -= 1) {
        const found = ((history[index] as any).operations?.titlePerformance || []).find((item: any) => item.projectId === id);
        if (found) return found;
    }
    return null;
};

/** The week it premieres, from its release plan or the opening slate. Null: no week yet */
export const getOriginalPremiereAt = (player: Player, commission: OwnedStreamingOriginalCommission): number | null => {
    const plan = commission.releasePlan?.premiereAtAbsoluteWeek;
    if (plan !== undefined && plan !== null) return plan;
    const platform = player.ownedStreamingPlatform;
    const entry = (platform?.launchSlate?.entries || []).find(item => item.projectId === commission.canonicalProjectId);
    const launchAt = platform?.launchCommit?.committedAtAbsoluteWeek;
    return entry && launchAt !== undefined ? launchAt + entry.launchWeek - 1 : null;
};

const MAKING_BY_TIER: Record<string, number> = { LOW: 15_000_000, MID: 45_000_000, HIGH: 120_000_000, BLOCKBUSTER: 220_000_000 };

/** What it cost to make. An older commission may hold nothing, so its own record answers, and at the last its budget tier */
export const getOriginalMaking = (player: Player, commission: OwnedStreamingOriginalCommission): number => {
    const id = commission.canonicalProjectId;
    const row: any = id ? rowOf(player, id) : null;
    return Number(commission.making || commission.productionFundingApplied || commission.productionBudgetCap
        || row?.budget || row?.projectDetails?.estimatedBudget
        || MAKING_BY_TIER[String(row?.budgetTier || row?.projectDetails?.budgetTier)] || 0);
};

export const getOriginalTitleDetail = (player: Player, commissionId: string): OriginalTitleDetail | null => {
    const commission = player.ownedStreamingPlatform?.originalCommissions?.find(item => item.id === commissionId);
    if (!commission) return null;
    const id = commission.canonicalProjectId || '';
    const job = id ? (player.commitments || []).find(item => item.id === id) : undefined;
    const row = id ? rowOf(player, id) : undefined;
    const details = row?.projectDetails || row || {};
    /* #294: a bid-room order is made in the world */
    const production = !job && id ? Object.values(player.world?.industryProductions || {}).find(item => item.canonicalProjectId === id) : undefined;
    const makingPhase = job?.projectPhase || production?.status;
    const status = getStreamingOriginalLiveStatus(player, commission);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const isSeries = commission.projectType === 'SERIES';
    const card = getOriginalsStudio(player, commission.producerStudioId);
    /* the same test the Desk reads: a studio out in the world, or a title marked as made by one */
    const outside = Boolean(card) || isOutsideOriginal(row);

    const delivered = job?.projectPhase === 'AWAITING_RELEASE' || (production?.status === 'DELIVERED' && status !== 'RELEASED');
    const scheduled = delivered && Boolean(job ? job.projectDetails?.releaseStrategy : commission.releasePlan);
    /* made, and its week still ahead: an old save's Original can be released on the record and not yet on the service. One on the opening slate has its week there */
    const platform = player.ownedStreamingPlatform;
    const openingEntry = delivered || status === 'RELEASED' ? (platform.launchSlate?.entries || []).find(entry => entry.projectId === id) : undefined;
    const premiereAt = getOriginalPremiereAt(player, commission);
    const premiereAhead = (premiereAt ?? 0) > absoluteWeek || Boolean(openingEntry && premiereAt === null);
    const stage: OriginalTitleStage = !id ? 'NOT_STARTED'
        : (status === 'RELEASED' || openingEntry) && !premiereAhead ? 'LIVE'
            : scheduled || openingEntry || (status === 'RELEASED' && premiereAhead) ? 'ON_SLATE'
                : delivered ? 'READY' : 'MAKING';
    const journeyAt = stage === 'LIVE' ? 5 : stage === 'ON_SLATE' ? 4 : stage === 'READY' ? 3 : PHASE_STEP[String(makingPhase)] ?? 0;
    const stageChip = stage === 'LIVE' ? 'LIVE' : stage === 'ON_SLATE' ? 'ON SLATE' : stage === 'READY' ? 'READY' : stage === 'NOT_STARTED' ? 'NOT STARTED' : PHASE_WORDS[String(makingPhase)] || 'IN THE WORKS';

    const calendar = job?.productionCalendar || production?.productionCalendar;
    const making = getOriginalMaking(player, commission);
    const issues = (commission.issues || []).filter(issue => issue.status !== 'UPCOMING');
    const issuesPaid = issues.filter(issue => issue.status === 'PAID').reduce((sum, issue) => sum + issue.amount, 0);
    const paid = Number(commission.productionFundingApplied || making) + issuesPaid;
    const paidLine = !commission.way ? `Paid at ${commission.producerStudioName}`
        : !outside ? 'Your studio. No fee'
            : commission.deal === 'LICENCE' ? `A 3-year licence from ${shortStudio(commission.producerStudioName)}`
                : `${money(making)} + ${studioPossessive(shortStudio(commission.producerStudioName))} ${commission.feePercent || 0}%`;

    const team: OriginalTitlePerson[] = [];
    const made = production?.aiExecution;
    const directorName = details.directorName || made?.directorName;
    if (directorName) {
        const directorId = details.directorId || made?.directorId;
        const person = findPerson(player, directorId);
        team.push({ id: String(directorId || 'director'), name: String(directorName), gender: person?.gender, role: 'Director', talent: person?.stats?.talent });
    }
    const lead = (details.castList || []).find((member: any) => member.roleType === 'LEAD')
        || (details.leadActorName ? { name: details.leadActorName, actorId: details.leadActorId } : made?.leadActorName ? { name: made.leadActorName, actorId: made.leadActorId } : null);
    if (lead?.name) {
        const person = findPerson(player, lead.actorId);
        team.push({ id: String(lead.actorId || 'lead'), name: String(lead.name), gender: person?.gender, role: lead.characterName ? `Lead, as ${lead.characterName}` : 'Lead', talent: person?.stats?.talent });
    }

    const notesTaken = (commission.notes || []).filter(item => QUALITY_NOTE_IDS.has(item)).length;
    const noteDefinition = NOTE_BY_PHASE[String(job?.projectPhase)];
    const note: OriginalTitleNote | null = outside && stage === 'MAKING' && noteDefinition ? {
        ...noteDefinition,
        taken: (commission.notes || []).includes(noteDefinition.id),
        energy: PHASE_ONE_ENERGY_COSTS.ORIGINAL_NOTES,
        canAfford: Number(player.energy?.current || 0) >= PHASE_ONE_ENERGY_COSTS.ORIGINAL_NOTES,
    } : null;
    const extraDefinition = EXTRA_BY_PHASE[String(job?.projectPhase)];
    const extra: OriginalTitleExtra | null = outside && stage === 'MAKING' && extraDefinition ? {
        ...extraDefinition,
        taken: (commission.notes || []).includes(extraDefinition.id),
        energy: PHASE_ONE_ENERGY_COSTS.ORIGINAL_NOTES,
        canAfford: Number(player.energy?.current || 0) >= PHASE_ONE_ENERGY_COSTS.ORIGINAL_NOTES,
    } : null;
    /* what the audience gave it, once you have shown it to one */
    const testScore = (commission.notes || []).includes('TEST_SCREENING') && job?.projectDetails
        ? Math.round(Number(job.projectDetails.hiddenStats?.qualityScore || 0))
        : null;

    const premiere = stage === 'ON_SLATE' && premiereAt ? {
        year: Math.floor(premiereAt / 52) + 1,
        week: (premiereAt % 52) + 1,
        weeksAway: Math.max(0, premiereAt - absoluteWeek),
    } : null;

    const performance = stage === 'LIVE' ? latestPerformance(player, id) : null;
    const viewers = Number(performance?.viewingAccounts || 0);
    const live = stage === 'LIVE' ? {
        viewers,
        finished: Math.round(Number(performance?.completionRate || 0) * (Number(performance?.completionRate || 0) <= 1 ? 100 : 1)),
        newSubs: Math.round(Number(performance?.acquisitionAttributedAccounts ?? viewers * 0.03)),
        stayed: Math.round(Number(performance?.retentionAttributedAccounts ?? viewers * 0.015)),
    } : null;

    let episodes: OriginalTitleEpisode[] = [];
    if (isSeries && stage === 'LIVE' && row) {
        const season = getSeasonRatings(row)[0];
        const ratings = season?.episodes || [];
        const names = getProjectEpisodeNames(row, ratings.length || commission.episodes);
        const top = ratings.reduce((best, item) => Math.max(best, Number(item.rating) || 0), 0);
        episodes = names.map((name, index) => {
            const rating = ratings[index] ? Number(ratings[index].rating) : null;
            return { number: index + 1, name, rating, best: rating !== null && rating === top };
        });
    }
    const shares = details.episodeBudgetShares;
    const shape = isSeries && Array.isArray(shares) && shares.length ? SEASON_SHAPE_NAMES[getSeasonShape(shares)] : null;
    const seasonName = shape ? (outside ? `${studioPossessive(shortStudio(commission.producerStudioName))} ${shape}` : shape) : null;

    return {
        commission,
        title: commission.title,
        isSeries,
        kindLine: [`Original ${isSeries ? 'series' : 'film'}`, formatGenreLabel(commission.genre), isSeries ? `${commission.episodes} episodes` : ''].filter(Boolean).join(' · '),
        logline: String(details.description || details.logline || ''),
        outside,
        studioName: commission.producerStudioName,
        byLabel: outside ? `BY ${shortStudio(commission.producerStudioName).toUpperCase()}` : 'BY YOUR STUDIO',
        color: card?.color || (outside ? '#7c3aed' : player.ownedStreamingPlatform?.identity?.primaryColor || '#7c3aed'),
        stage,
        stageChip,
        journeyAt,
        weeksLeft: calendar ? Math.max(0, calendar.totalWeeks - calendar.elapsedWeeks) : null,
        totalWeeks: calendar ? calendar.totalWeeks : null,
        paid,
        paidLine,
        team,
        note,
        extra,
        testScore,
        notesTaken,
        issues,
        premiere,
        rating: stage === 'LIVE' ? getTitleRating(player, id) : null,
        chartRank: stage === 'LIVE' ? (() => {
            const lists = getStreamingWeeklyChartView(player).lists;
            const rank = (rows: Array<{ id: string; mine?: boolean; rank: number }>) => rows.find(item => item.mine && item.id === id)?.rank;
            return rank(lists.ALL) ?? rank(lists.FILM) ?? rank(lists.SERIES) ?? null;
        })() : null,
        live,
        episodes,
        seasonName,
        wins: stage === 'LIVE' ? (player.world?.awardHistory || []).flatMap(entry => entry.winners
            .filter(winner => winner.projectId === id)
            .map(winner => ({ category: winner.category, show: entry.type === 'EMMY' ? 'Emmys' : entry.type === 'GOLDEN_GLOBE' ? 'Golden Globes' : entry.type === 'OSCAR' ? 'Oscars' : String(entry.type).replace(/_/g, ' '), year: entry.year }))) : [],
        reviews: stage === 'LIVE' ? (Array.isArray(details.reviews) ? details.reviews : []).slice(0, 2).map((review: any) => ({ id: String(review.id), text: String(review.text), publication: String(review.publication || '') })) : [],
    };
};

/** Notes to an outside studio: one for each phase, energy for a little quality. Your own studio has the Career tab instead. */
export const takeOriginalExtra = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string } => {
    const detail = getOriginalTitleDetail(player, commissionId);
    const extra = detail?.extra;
    if (!detail || !extra) return { player, changed: false, message: 'There is nothing to do on this title right now.' };
    if (extra.taken) return { player, changed: false, message: `You have done the ${extra.title.toLowerCase()} on this one.` };
    if (!extra.canAfford) return { player, changed: false, message: `${extra.title} takes ${extra.energy}⚡.` };
    const commission = detail.commission;
    const hasUpcomingIssue = (commission.issues || []).some(issue => issue.status === 'UPCOMING');
    const quality = extra.id === 'TEST_SCREENING' ? ORIGINAL_SCREENING_QUALITY : extra.id === 'TABLE_READ' && !hasUpcomingIssue ? 1 : 0;
    const next: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            originalCommissions: player.ownedStreamingPlatform.originalCommissions.map(item => {
                if (item.id !== commissionId) return item;
                /* the next problem it would have come back with never happens */
                const nextUpcoming = extra.id === 'TABLE_READ' ? (item.issues || []).find(issue => issue.status === 'UPCOMING')?.id : undefined;
                return {
                    ...item,
                    notes: [...(item.notes || []), extra.id],
                    ...(nextUpcoming ? { issues: (item.issues || []).filter(issue => issue.id !== nextUpcoming) } : {}),
                };
            }),
        },
        commitments: player.commitments.map(job => {
            if (job.id !== commission.canonicalProjectId || !job.projectDetails) return job;
            const stats = job.projectDetails.hiddenStats;
            return {
                ...job,
                projectDetails: {
                    ...job.projectDetails,
                    hiddenStats: {
                        ...stats,
                        ...(quality ? { qualityScore: Math.min(100, Number(stats.qualityScore || 50) + quality) } : {}),
                        ...(extra.id === 'FIRST_LOOK' ? { previousSeasonHype: Number(stats.previousSeasonHype || 0) + ORIGINAL_FIRST_LOOK_PULL } : {}),
                    },
                },
            };
        }),
    };
    spendPlayerEnergy(next, extra.energy, `${extra.title}: ${detail.title}`);
    const said = extra.id === 'TABLE_READ'
        ? (hasUpcomingIssue ? 'It caught a problem before the shoot.' : 'No problems were coming. +1 quality.')
        : extra.id === 'FIRST_LOOK' ? 'The press is talking. More people will start it.' : '+1 quality, and now you know how it plays.';
    return { player: next, changed: true, message: `${extra.title} on ${detail.title}. ${said}` };
};

export const takeOriginalNote = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string } => {
    const detail = getOriginalTitleDetail(player, commissionId);
    const note = detail?.note;
    if (!detail || !note) return { player, changed: false, message: 'There is nothing to do on this title right now.' };
    if (note.taken) return { player, changed: false, message: `You have done the ${note.title.toLowerCase()} for this phase.` };
    if (!note.canAfford) return { player, changed: false, message: `${note.title} takes ${note.energy}⚡.` };
    const next: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            originalCommissions: player.ownedStreamingPlatform.originalCommissions.map(item => (item.id !== commissionId ? item : {
                ...item,
                notes: [...(item.notes || []), note.id],
            })),
        },
        commitments: player.commitments.map(job => (job.id !== detail.commission.canonicalProjectId || !job.projectDetails ? job : {
            ...job,
            projectDetails: {
                ...job.projectDetails,
                hiddenStats: {
                    ...job.projectDetails.hiddenStats,
                    qualityScore: Math.min(100, Number(job.projectDetails.hiddenStats.qualityScore || 50) + ORIGINAL_NOTE_QUALITY),
                },
            },
        })),
    };
    spendPlayerEnergy(next, note.energy, `${note.title}: ${detail.title}`);
    return { player: next, changed: true, message: `${note.title} done on ${detail.title}. +${ORIGINAL_NOTE_QUALITY} quality.` };
};
