import type { Business, NewsItem, OwnedStreamingLedgerEntry, OwnedStreamingOriginalCommission, OwnedStreamingOriginalPitch, Player, ProductionCalendar, ProjectConcept, Script, XPost } from '../types';
import type { OriginalBill, OriginalDealKind } from './originalsDeal';
import { ORIGINAL_LICENCE_WEEKS } from './originalsDeal';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getLiveOriginalPitches } from './originalsPitches';
import { getStudioQualityEdge, getStudioShootWeeks, rollOutsideQuality, type OriginalsStudioCard } from './originalsStudios';
import { planOriginalIssues } from './originalsIssues';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeStudioState } from './businessLogic';

/**
 * #282: the three ways to an Original, all through Greenlight's wizard.
 *   PITCH: their script, that studio. An overview, with only Episodes and the Deal yours.
 *   OUTSIDE: your script, an outside studio you pick. All yours.
 *   OWN_STUDIO: your script, your studio. All yours, no Deal and no fee.
 */
export type OriginalCommissionWay = 'PITCH' | 'OUTSIDE' | 'OWN_STUDIO';

export interface OriginalWizardMode {
    way: OriginalCommissionWay;
    /** An overview: the screens show what was chosen and nothing can be changed */
    locked: boolean;
    commissionId: string;
    platformName: string;
    treasury: number;
    studioCard: OriginalsStudioCard | null;
    feePercent: number;
    feeWhy: string;
    episodes: number;
    pitch?: OwnedStreamingOriginalPitch;
    /** The player's own studio, when the script came from it */
    sourceStudioId?: string;
    onStepBack: (to: 'SCRIPT' | 'STUDIO') => void;
    onCommissioned?: (commissionId: string) => void;
}

/** Scripts the player owns and could order: ready, and not already promised to a platform */
export const getCommissionableScripts = (player: Player): Array<{ script: Script; studio: Business }> => (
    (player.businesses || []).flatMap(studio => (
        studio.type === 'PRODUCTION_HOUSE' && studio.isActive && studio.studioState
            ? (studio.studioState.scripts || [])
                .filter(script => script.status === 'READY' && !script.lockedStreamingFunding)
                .map(script => ({ script, studio }))
            : []
    ))
);

export const hasOwnProductionHouse = (player: Player): boolean => (
    (player.businesses || []).some(studio => studio.type === 'PRODUCTION_HOUSE' && studio.isActive && Boolean(studio.studioState))
);

/** A commission's own stable id, so one commission can only happen once */
export const getOriginalCommissionId = (player: Player, scriptId: string): string => (
    createDeterministicId('streaming_original', player.ownedStreamingPlatform?.simulationSeed || player.id, `commission:${scriptId}:${getAbsoluteWeek(player.age, player.currentWeek)}`)
);

/** The concept a new Original starts from: the wizard fills it in */
export const createBlankOriginalConcept = (script: Script, absoluteWeek: number): ProjectConcept => ({
    id: `concept_${script.id}`,
    scriptId: script.id,
    lastUpdated: absoluteWeek,
    crewModes: { director: 'HIRE', cinematographer: 'HIRE', composer: 'HIRE', lineProducer: 'HIRE', vfx: 'HIRE' },
    selectedCrew: {},
    castList: [
        { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null, identitySource: 'AUTO' },
        { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null, identitySource: 'AUTO' },
    ],
    selectedLocations: [],
    tone: 50,
    reservedMarketingBudget: 0,
    marketingBudgetSpent: 0,
    marketingBudgetRemaining: 0,
    lastStep: 'DIRECTOR',
});

/**
 * The wizard reads a `Business`. An outside studio is not one of the player's companies, so it gets a stand-in that lives only for the wizard:
 * nothing about it is saved, and no money moves through it.
 */
export const buildOutsideStudioStandIn = (
    card: OriginalsStudioCard,
    script: Script,
    concept: ProjectConcept,
    writers: Business['studioState'] extends infer S ? (S extends { writers: infer W } ? W : never) : never,
    currentWeek: number,
): Business => ({
    id: card.id,
    name: card.name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: card.mark,
    color: card.color,
    foundedWeek: 1,
    balance: 0,
    isActive: true,
    config: {} as Business['config'],
    stats: {} as Business['stats'],
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 0,
    history: [],
    studioState: {
        ...normalizeStudioState({ scripts: [script], concepts: [concept], writers: writers || [] } as any, currentWeek),
        scripts: [script],
        concepts: [concept],
        writers: (writers || []) as any,
    },
} as Business);

export const findLivePitch = (player: Player, pitchId: string | null | undefined): OwnedStreamingOriginalPitch | null => (
    pitchId ? getLiveOriginalPitches(player).find(pitch => pitch.id === pitchId) || null : null
);

export interface OriginalCommissionMoment {
    headline: string;
    subtext: string;
    post: { handle: string; text: string };
}

/**
 * #287: the commission itself. The wizard has built the project; here the platform pays in one go, the commission is written down,
 * and the script or pitch it came from is used up. Returns null if the money is not there or it was already done.
 */
const reshootCalendar = (calendar: ProductionCalendar, card: OriginalsStudioCard): ProductionCalendar => {
    const productionWeeks = getStudioShootWeeks(card, calendar.productionWeeks);
    return { ...calendar, productionWeeks, totalWeeks: calendar.preProductionWeeks + productionWeeks + calendar.postProductionWeeks };
};

export const finalizeOriginalCommission = (
    player: Player,
    input: { mode: OriginalWizardMode; commitmentId: string; script: Script; makerStudioId: string; makerStudioName: string; bill: OriginalBill; deal: OriginalDealKind },
): { player: Player; moment: OriginalCommissionMoment } | null => {
    const { mode, commitmentId, script, makerStudioId, makerStudioName, bill, deal } = input;
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.treasuryCash < bill.total || platform.originalCommissions.some(item => item.id === mode.commissionId)) return null;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const isSeries = script.projectType === 'SERIES';
    const outside = mode.way !== 'OWN_STUDIO';
    const platformName = platform.identity?.name || mode.platformName;
    const plannedCalendar = (player.commitments || []).find(job => job.id === commitmentId)?.productionCalendar;
    /* #289: how often this studio will come back for money, decided now */
    const issues = outside && mode.studioCard ? planOriginalIssues({
        card: mode.studioCard,
        commissionId: mode.commissionId,
        genre: String(script.genres[0]),
        making: bill.making,
        episodes: isSeries ? mode.episodes : 1,
        isSeries,
        calendar: plannedCalendar ? reshootCalendar(plannedCalendar, mode.studioCard) : undefined,
    }) : [];
    const commission: OwnedStreamingOriginalCommission = {
        id: mode.commissionId,
        scriptId: script.id,
        canonicalProjectId: commitmentId,
        title: script.title,
        gapId: 'SERIES_RETENTION',
        projectType: script.projectType,
        genre: script.genres[0],
        episodes: isSeries ? mode.episodes : 1,
        producerStudioId: makerStudioId,
        producerStudioName: makerStudioName,
        commissionedByPlatformName: platformName,
        productionBudgetCap: bill.total,
        productionFundingApplied: bill.total,
        status: 'GREENLIT',
        commissionedAtAbsoluteWeek: absoluteWeek,
        greenlitAtAbsoluteWeek: absoluteWeek,
        lineageId: mode.commissionId,
        seasonNumber: Math.max(1, Number(script.installmentNumber) || 1),
        contract: {
            platformRightsPercent: 100,
            producerBackendPercent: 0,
            exclusiveWindowWeeks: 104,
            sequelRightsIncluded: deal === 'BUY',
        },
        localization: null,
        releasePlan: null,
        lifecycleDecision: null,
        way: mode.way,
        deal,
        making: bill.making,
        fee: bill.fee,
        feePercent: outside ? mode.feePercent : 0,
        ...(deal === 'LICENCE' ? { licenceEndsAtAbsoluteWeek: absoluteWeek + ORIGINAL_LICENCE_WEEKS } : {}),
        ...(issues.length ? { issues } : {}),
    };
    const isFirstOriginal = platform.originalCommissions.length === 0;
    const key = `original-commissioned:${mode.commissionId}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'ORIGINAL_COMMISSIONED',
        summary: `${platformName} commissioned ${script.title} from ${makerStudioName}.`,
        source: 'PLAYER_ACTION',
        metadata: { commissionId: mode.commissionId, scriptId: script.id, producerStudioId: makerStudioId, productionBudgetCap: bill.total },
    };
    const nextLedger = [...platform.eventLedger, ledger];
    const nextCinematics = [...platform.cinematicQueue];
    if (isFirstOriginal) {
        const cinematicKey = `first-original-announcement:${mode.commissionId}`;
        const cinematicId = createDeterministicId('streaming_scene', platform.simulationSeed, cinematicKey);
        nextLedger.push({
            id: createDeterministicId('streaming_event', platform.simulationSeed, `cinematic:${cinematicKey}`),
            idempotencyKey: `cinematic:${cinematicKey}`,
            absoluteWeek,
            type: 'CINEMATIC_QUEUED',
            summary: 'First Original announcement queued.',
            source: 'SYSTEM',
            metadata: { cinematicId },
        });
        nextCinematics.push({
            id: cinematicId,
            idempotencyKey: cinematicKey,
            type: 'FIRST_ORIGINAL_ANNOUNCEMENT',
            status: 'QUEUED',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: absoluteWeek,
            title: `${script.title} is the first ${platformName} Original`,
            factIds: [ledger.id],
        });
    }
    const pitches = platform.originalPitches;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - bill.total,
        originalCommissions: [...platform.originalCommissions, commission],
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'first-original-greenlit'])),
        eventLedger: nextLedger,
        cinematicQueue: nextCinematics,
        ...(pitches && mode.pitch ? { originalPitches: { ...pitches, pitches: pitches.pitches.filter(item => item.id !== mode.pitch!.id) } } : {}),
    }, player.id);

    const order = isSeries ? `${mode.episodes} episodes of` : 'the film';
    const moment: OriginalCommissionMoment = {
        headline: outside
            ? `${platformName} orders ${order} "${script.title}" from ${makerStudioName}`
            : `${platformName} orders ${order} "${script.title}" from its own studio`,
        subtext: deal === 'LICENCE' ? `A three-year licence. The rights go back to ${makerStudioName} after that.` : `${platformName} owns it outright.`,
        post: { handle: '@seriesaddict', text: `${makerStudioName} making a ${String(script.genres[0]).toLowerCase().replace(/_/g, ' ')} for ${platformName}? I'm in.` },
    };
    const news: NewsItem = {
        id: `news_original_commission_${mode.commissionId}`,
        headline: moment.headline,
        subtext: moment.subtext,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: Math.floor(player.currentWeek / 52) + 2024,
        impactLevel: 'MEDIUM',
    };
    const fanPost: XPost = {
        id: `x_original_commission_${mode.commissionId}`,
        authorId: 'seriesaddict',
        authorName: 'Series Addict',
        authorHandle: moment.post.handle,
        authorAvatar: 'https://api.dicebear.com/9.x/initials/svg?seed=SA',
        content: moment.post.text,
        timestamp: Date.now(),
        likes: 1200,
        retweets: 90,
        replies: 45,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: false,
    } as XPost;

    const studios: any = player.world.studios || {};
    const maker = studios[makerStudioId];
    /* the studio keeps its fee. On a licence it carries what the platform did not pay, until the rights come back. */
    const makerCash = outside && maker
        ? { ...studios, [makerStudioId]: { ...maker, cashReserve: Number(maker.cashReserve || 0) + (deal === 'BUY' ? bill.fee : bill.total - bill.making) / 1_000_000 } }
        : studios;
    return {
        moment,
        player: {
            ...player,
            ownedStreamingPlatform: nextPlatform,
            news: [news, ...(player.news || [])].slice(0, 80),
            logs: [...(player.logs || []), { week: player.currentWeek, year: player.age, message: `${moment.headline}. Paid ${Math.round(bill.total / 100_000) / 10}M at once.`, type: 'positive' as const }].slice(-80),
            x: { ...player.x, feed: [fanPost, ...(player.x?.feed || [])].slice(0, 80) },
            world: { ...player.world, studios: makerCash },
            commitments: (player.commitments || []).map(job => (job.id !== commitmentId ? job : {
                ...job,
                /* #288: a good crew shoots quicker, a poor one takes longer */
                ...(outside && mode.studioCard && job.productionCalendar ? { productionCalendar: reshootCalendar(job.productionCalendar, mode.studioCard) } : {}),
                projectDetails: {
                    ...job.projectDetails!,
                    /* the player does not produce it. This is where the flag lives: an earlier line of mine set it on the job and did nothing */
                    ...(outside && job.projectDetails!.playerProductionFocus ? { playerProductionFocus: { ...job.projectDetails!.playerProductionFocus, isPlayerProducer: false } } : {}),
                    hiddenStats: {
                        ...job.projectDetails!.hiddenStats,
                        ...(outside && mode.studioCard ? { qualityScore: Math.max(1, Math.min(100, Number(job.projectDetails!.hiddenStats.qualityScore || 50) + getStudioQualityEdge(mode.studioCard) + rollOutsideQuality(mode.studioCard, mode.commissionId))) } : {}),
                        ownedStreamingOriginal: true,
                        ownedStreamingCommissionId: mode.commissionId,
                        ...(outside ? { outsideOriginal: true } : {}),
                    },
                },
            })),
            /* your own script, made by someone else, leaves your studio's shelf */
            businesses: mode.way === 'OUTSIDE' && mode.sourceStudioId
                ? (player.businesses || []).map(business => (business.id !== mode.sourceStudioId || !business.studioState ? business : {
                    ...business,
                    studioState: {
                        ...business.studioState,
                        scripts: (business.studioState.scripts || []).filter(item => item.id !== script.id),
                        concepts: (business.studioState.concepts || []).filter(item => item.scriptId !== script.id),
                    },
                }))
                : player.businesses,
        },
    };
};
