import type { BudgetTier, Commitment, OwnedStreamingOriginalCommission, Player, ProjectDetails, Script } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { PHASE_ONE_ENERGY_COSTS } from './energyCosts';
import { getAbsoluteWeek } from './legacyLogic';
import { finalizeOriginalCommission, type OriginalCommissionMoment, type OriginalWizardMode } from './originalsCommission';
import { getSeasonEffects, getStudioSeasonShares } from './originalsEpisodeBudget';
import { getStudioFee, ORIGINAL_LICENCE_WEEKS, type OriginalBill, LICENCE_SHARE_OF_MAKING } from './originalsDeal';
import { getOriginalsStudio, getStudioShootWeeks } from './originalsStudios';
import { getOriginalMaking } from './originalsTitleDetail';
import { isOutsideOriginal } from './outsideOriginals';
import { createProductionCalendar } from './productionCalendar';
import { spendPlayerEnergy } from './premiumLogic';
import { getSeriesBaseTitle } from './seriesIdentity';
import { getTitleRating } from './titleRating';

/**
 * #292: what comes after a title opens, on its own page. Another season costs more than the last, by how far along the show is and how big a hit it is: a
 * real negotiation with the people who made it. A licence runs out and the title goes back, unless it is paid for again. Your own studio pays no fee.
 */

export const ORIGINAL_EVIDENCE_WEEKS = 4;
const EXTEND_SHARE = 0.35;
const SPIN_OFF_SHARE = 0.72;
const SPIN_OFF_NAMES = ['Origins', 'After Dark', 'The Next Chapter', 'Legacies', 'The Long Way Home', 'First Blood', 'Beyond', 'Bloodlines'];

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);
const roundMoney = (value: number) => Math.round(value / 100_000) * 100_000;

/** Season 2 costs 15 to 25% more, season 3 25 to 40%, season 4 and on 40 to 60%: the top of each range for a big hit */
export const getSeasonPriceRise = (nextSeason: number, hit: number): number => {
    const [low, high] = nextSeason <= 2 ? [15, 25] : nextSeason === 3 ? [25, 40] : [40, 60];
    return Math.round(low + (high - low) * clamp(hit, 0, 1));
};

const hitOf = (player: Player, projectId: string): { hit: number; word: string } => {
    const rating = Number(getTitleRating(player, projectId) || 6);
    const hit = clamp((rating - 6) / 2.5, 0, 1);
    return { hit, word: hit >= 0.7 ? 'A big hit' : hit >= 0.35 ? 'A solid show' : 'A quiet one' };
};

const rowOf = (player: Player, projectId: string): any => {
    const own = (player.pastProjects || []).find(item => item.id === projectId) || (player.activeReleases || []).find(item => item.id === projectId);
    if (own) return own;
    /* #294: what a bid-room order became reads the same way */
    const made: any = (player.world?.projects || []).find(item => item.id === projectId);
    return made ? {
        ...made,
        name: made.title,
        outsideOriginal: true,
        projectQuality: made.quality,
        imdbRating: made.rating,
        castList: made.leadActorName ? [{ id: made.leadActorId, name: made.leadActorName, role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: made.leadActorId }] : [],
    } : undefined;
};
const commissionOf = (player: Player, commissionId: string) => player.ownedStreamingPlatform?.originalCommissions?.find(item => item.id === commissionId);

export interface OriginalNextSeasonQuote {
    label: string;
    nextSeason: number;
    outside: boolean;
    studioName: string;
    rise: number;
    hitWord: string;
    making: number;
    fee: number;
    feePercent: number;
    feeWhy: string;
    total: number;
    deal: 'BUY' | 'LICENCE';
    /** what the last season's finale leaves the next one: its first four weeks */
    hype: number;
    energy: number;
    canAfford: boolean;
    hasEnergy: boolean;
}

export interface OriginalFutureView {
    /** weeks until the first numbers are in: nothing can be decided before */
    waitWeeks: number;
    next: OriginalNextSeasonQuote | null;
    nextCommissionId: string | null;
    ended: boolean;
    canSpinOff: boolean;
    spinOffPrice: number;
    licence: { weeksLeft: number; extendPrice: number; gone: boolean } | null;
}

const quoteNext = (player: Player, commission: OwnedStreamingOriginalCommission, episodes: number): OriginalNextSeasonQuote | null => {
    const projectId = commission.canonicalProjectId;
    const row = projectId ? rowOf(player, projectId) : null;
    if (!row || !projectId) return null;
    const isSeries = commission.projectType === 'SERIES';
    const nextSeason = Math.max(1, commission.seasonNumber || 1) + 1;
    const outside = isOutsideOriginal(row);
    const { hit, word } = hitOf(player, projectId);
    const rise = getSeasonPriceRise(nextSeason, hit);
    const lastEpisodes = Math.max(1, commission.episodes || 1);
    const lastMaking = getOriginalMaking(player, commission);
    const making = roundMoney(lastMaking * (1 + rise / 100) * (isSeries ? episodes / lastEpisodes : 1));
    const card = outside ? getOriginalsStudio(player, commission.producerStudioId) : null;
    const fee = outside ? (card ? getStudioFee(card, `${commission.id}:${nextSeason}`) : { percent: commission.feePercent || 20, why: 'They keep last season\'s terms.' }) : { percent: 0, why: '' };
    const deal = commission.deal === 'LICENCE' ? 'LICENCE' as const : 'BUY' as const;
    const feeAmount = deal === 'BUY' ? roundMoney(making * fee.percent / 100) : 0;
    const total = deal === 'BUY' ? making + feeAmount : roundMoney(making * LICENCE_SHARE_OF_MAKING);
    const energy = PHASE_ONE_ENERGY_COSTS.ORIGINAL_RENEWAL;
    return {
        label: isSeries ? `Season ${nextSeason}` : 'A sequel',
        nextSeason,
        outside,
        studioName: commission.producerStudioName,
        rise,
        hitWord: word,
        making,
        fee: feeAmount,
        feePercent: deal === 'BUY' ? fee.percent : 0,
        feeWhy: fee.why,
        total,
        deal,
        hype: getSeasonEffects(row.episodeBudgetShares).hype,
        energy,
        canAfford: Number(player.ownedStreamingPlatform.treasuryCash || 0) >= total,
        hasEnergy: Number(player.energy?.current || 0) >= energy,
    };
};

/** Reads the week's history: for a page's opening, not a tap */
export const getOriginalFutureView = (player: Player, commissionId: string, episodes?: number): OriginalFutureView | null => {
    const commission = commissionOf(player, commissionId);
    if (!commission?.canonicalProjectId) return null;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const premiere = commission.releasePlan?.premiereAtAbsoluteWeek;
    const making = getOriginalMaking(player, commission);
    const ends = commission.licenceEndsAtAbsoluteWeek;
    const ended = commission.lifecycleDecision?.type === 'CANCEL';
    const { hit } = hitOf(player, commission.canonicalProjectId);
    return {
        waitWeeks: premiere ? Math.max(0, premiere + ORIGINAL_EVIDENCE_WEEKS - absoluteWeek) : 0,
        next: ended || commission.nextSeasonCommissionId ? null : quoteNext(player, commission, episodes || commission.episodes),
        nextCommissionId: commission.nextSeasonCommissionId || null,
        ended,
        canSpinOff: commission.projectType === 'SERIES' && commission.deal !== 'LICENCE' && commission.lifecycleDecision?.type !== 'FRANCHISE',
        spinOffPrice: roundMoney(making * SPIN_OFF_SHARE),
        licence: ends ? {
            weeksLeft: Math.max(0, ends - absoluteWeek),
            extendPrice: roundMoney(making * EXTEND_SHARE * (1 + hit * 0.5)),
            gone: ends <= absoluteWeek,
        } : null,
    };
};

const tierFor = (amount: number): BudgetTier => (amount < 25_000_000 ? 'LOW' : amount < 80_000_000 ? 'MID' : amount < 180_000_000 ? 'HIGH' : 'BLOCKBUSTER');

/** The next project from the last one's record: the same people, a new season of work */
const buildNextProject = (input: {
    player: Player;
    commission: OwnedStreamingOriginalCommission;
    row: any;
    id: string;
    title: string;
    seed: string;
    making: number;
    episodes: number;
    subtype: 'SEQUEL' | 'SPINOFF';
    installment: number;
    keepCast: boolean;
    hype: number;
}): Commitment => {
    const { player, commission, row, id, title, seed, making, episodes, subtype, installment, keepCast, hype } = input;
    const outside = isOutsideOriginal(row);
    const card = outside ? getOriginalsStudio(player, commission.producerStudioId) : null;
    const rng = createDeterministicRng(`original-next:${seed}`);
    const pre = 5 + Math.floor(rng() * 3);
    const planned = Math.max(8, Math.min(13, 7 + Math.round(episodes / 2)));
    const productionWeeks = card ? getStudioShootWeeks(card, planned) : planned;
    const preQuality = Number(row.projectQuality || row.quality || 60);
    /* no one can promise the next one is as good: the money helps a little, the luck more */
    const qualityScore = clamp(preQuality + (rng() - 0.55) * 9 + (subtype === 'SPINOFF' ? -4 : 0), 1, 100);
    const rating = Number(row.imdbRating || row.rating || 6);
    const cast = (row.castList || []).filter((member: any) => keepCast || member.roleType === 'LEAD');
    const shares = commission.projectType === 'SERIES'
        ? (outside && card ? getStudioSeasonShares(card.style, episodes) : undefined)
        : undefined;
    const details: ProjectDetails = {
        title,
        sourceScriptId: seed,
        type: commission.projectType,
        subtype,
        genre: row.genre || commission.genre,
        format: row.format,
        description: row.description,
        budgetTier: tierFor(making),
        estimatedBudget: making,
        episodes,
        studioId: commission.producerStudioId,
        directorName: row.directorName,
        directorId: row.directorId,
        writerId: row.writerId,
        writerName: row.writerName,
        castList: cast,
        franchiseId: subtype === 'SPINOFF' ? `${row.franchiseId || row.id}:${seed}` : row.franchiseId || row.id,
        installmentNumber: installment,
        isOriginal: true,
        ...(shares ? { episodeBudgetShares: shares } : {}),
        hiddenStats: {
            qualityScore: Math.round(qualityScore),
            rawHype: clamp(40 + (rating - 5.5) * 16, 15, 95),
            scriptQuality: Math.round(qualityScore),
            castingStrength: Math.round(qualityScore),
            directorQuality: Math.round(qualityScore),
            backendPct: 0,
            lockedFinances: true,
            ...(hype ? { previousSeasonHype: hype } : {}),
        },
    } as unknown as ProjectDetails;
    return {
        careerBalanceVersion: 1,
        careerRewardPacingVersion: 1,
        id,
        name: title,
        type: 'JOB',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        projectPhase: 'PRE_PRODUCTION',
        phaseWeeksLeft: pre,
        totalPhaseDuration: pre,
        productionCalendar: createProductionCalendar({ preProductionWeeks: pre, productionWeeks, postProductionWeeks: 12, age: player.age, week: player.currentWeek }),
        promotionalBuzz: Math.round(clamp(30 + (rating - 5.5) * 12, 10, 90)),
        projectDetails: details,
    } as unknown as Commitment;
};

const orderNext = (player: Player, commission: OwnedStreamingOriginalCommission, input: {
    title: string; seed: string; making: number; fee: number; feePercent: number; total: number; deal: 'BUY' | 'LICENCE'; episodes: number; subtype: 'SEQUEL' | 'SPINOFF'; installment: number; keepCast: boolean; hype: number; energy: number; label: string;
}): { player: Player; moment: OriginalCommissionMoment; commissionId: string } | null => {
    const row = rowOf(player, commission.canonicalProjectId!);
    if (!row) return null;
    const outside = isOutsideOriginal(row);
    const commissionId = createDeterministicId('original-commission', commission.id, input.seed);
    const job = buildNextProject({ player, commission, row, id: createDeterministicId('original-season', commission.id, input.seed), title: input.title, seed: input.seed, making: input.making, episodes: input.episodes, subtype: input.subtype, installment: input.installment, keepCast: input.keepCast, hype: input.hype });
    const bill: OriginalBill = { above: [], below: [{ label: 'Making it', amount: input.making }], making: input.making, feePercent: input.feePercent, fee: input.fee, total: input.total, deal: input.deal, perEpisode: input.making / Math.max(1, input.episodes) };
    const card = outside ? getOriginalsStudio(player, commission.producerStudioId) : null;
    const mode = {
        way: commission.way || (outside ? 'OUTSIDE' : 'OWN_STUDIO'),
        locked: true,
        commissionId,
        platformName: player.ownedStreamingPlatform.identity?.name || commission.commissionedByPlatformName,
        treasury: player.ownedStreamingPlatform.treasuryCash,
        studioCard: card,
        feePercent: input.feePercent,
        feeWhy: '',
        episodes: input.episodes,
        onStepBack: () => {},
    } as unknown as OriginalWizardMode;
    const script = { id: input.seed, title: input.title, projectType: commission.projectType, genres: [commission.genre], installmentNumber: input.installment } as unknown as Script;
    const finalized = finalizeOriginalCommission({ ...player, commitments: [...player.commitments, job] }, {
        mode, commitmentId: job.id, script, makerStudioId: commission.producerStudioId, makerStudioName: commission.producerStudioName, bill, deal: input.deal,
    });
    if (!finalized) return null;
    /* the fans know this one */
    const said = input.subtype === 'SPINOFF' ? `A ${input.title.replace(/^[^:]*:\s*/, '')} spin-off? I'm watching whatever this is.` : `${input.title}. Finally. Do not mess this up.`;
    const next: Player = {
        ...finalized.player,
        energy: { ...finalized.player.energy },
        flags: { ...finalized.player.flags },
        x: { ...finalized.player.x, feed: (finalized.player.x?.feed || []).map(post => (post.id === `x_original_commission_${commissionId}` ? { ...post, content: said } : post)) },
    };
    spendPlayerEnergy(next, input.energy, `${input.label}: ${input.title}`);
    return { player: next, moment: { ...finalized.moment, post: { ...finalized.moment.post, text: said } }, commissionId };
};

export const renewOriginal = (player: Player, commissionId: string, episodes?: number): { player: Player; changed: boolean; message: string; moment?: OriginalCommissionMoment; title?: string; nextCommissionId?: string } => {
    const view = getOriginalFutureView(player, commissionId, episodes);
    const commission = commissionOf(player, commissionId);
    if (!view || !commission) return { player, changed: false, message: 'That title is not on your record.' };
    if (view.ended) return { player, changed: false, message: 'You ended this one.' };
    if (view.nextCommissionId) return { player, changed: false, message: 'Already ordered.' };
    if (view.waitWeeks) return { player, changed: false, message: `The first numbers come in ${view.waitWeeks} more week${view.waitWeeks === 1 ? '' : 's'}.` };
    const quote = view.next;
    if (!quote) return { player, changed: false, message: 'It has not opened yet.' };
    if (!quote.canAfford) return { player, changed: false, message: `${money(quote.total)} is more than the treasury holds.` };
    if (!quote.hasEnergy) return { player, changed: false, message: `It takes ${quote.energy}⚡.` };
    const base = getSeriesBaseTitle(commission.title);
    const title = commission.projectType === 'SERIES' ? `${base}: Season ${quote.nextSeason}` : `${base.replace(/\s+\d+$/, '')} ${quote.nextSeason}`;
    const episodesNow = commission.projectType === 'SERIES' ? Math.max(1, episodes || commission.episodes) : 1;
    const ordered = orderNext(player, commission, {
        title, seed: `${commission.scriptId}:s${quote.nextSeason}`, making: quote.making, fee: quote.fee, feePercent: quote.feePercent, total: quote.total, deal: quote.deal,
        episodes: episodesNow, subtype: 'SEQUEL', installment: quote.nextSeason, keepCast: true, hype: quote.hype, energy: quote.energy, label: 'Renewed',
    });
    if (!ordered) return { player, changed: false, message: 'That could not be ordered.' };
    const platform = ordered.player.ownedStreamingPlatform;
    return {
        player: {
            ...ordered.player,
            ownedStreamingPlatform: {
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => (
                    item.id === commissionId ? { ...item, nextSeasonCommissionId: ordered.commissionId }
                        : item.id === ordered.commissionId ? { ...item, parentCommissionId: commissionId, lineageId: commission.lineageId || commission.id, seasonNumber: quote.nextSeason } : item
                )),
            },
        },
        changed: true,
        message: `${title} is ordered. ${money(quote.total)} paid.`,
        moment: ordered.moment,
        title,
        nextCommissionId: ordered.commissionId,
    };
};

export const spinOffOriginal = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string; moment?: OriginalCommissionMoment; title?: string } => {
    const view = getOriginalFutureView(player, commissionId);
    const commission = commissionOf(player, commissionId);
    if (!view || !commission || !view.canSpinOff) return { player, changed: false, message: commission?.deal === 'LICENCE' ? 'On a licence, spin-offs are not yours to order.' : 'That cannot be spun off.' };
    if (view.waitWeeks) return { player, changed: false, message: `The first numbers come in ${view.waitWeeks} more week${view.waitWeeks === 1 ? '' : 's'}.` };
    if (Number(player.ownedStreamingPlatform.treasuryCash || 0) < view.spinOffPrice) return { player, changed: false, message: `${money(view.spinOffPrice)} is more than the treasury holds.` };
    const energy = PHASE_ONE_ENERGY_COSTS.ORIGINAL_RENEWAL;
    if (Number(player.energy?.current || 0) < energy) return { player, changed: false, message: `It takes ${energy}⚡.` };
    const row = rowOf(player, commission.canonicalProjectId!);
    const outside = isOutsideOriginal(row);
    const rng = createDeterministicRng(`original-spinoff:${commission.id}`);
    const base = getSeriesBaseTitle(commission.title);
    const title = `${base}: ${SPIN_OFF_NAMES[Math.floor(rng() * SPIN_OFF_NAMES.length)]}`;
    const card = outside ? getOriginalsStudio(player, commission.producerStudioId) : null;
    const fee = card ? getStudioFee(card, `${commission.id}:spinoff`) : { percent: outside ? commission.feePercent || 20 : 0, why: '' };
    const feeAmount = roundMoney(view.spinOffPrice * fee.percent / 100);
    const total = view.spinOffPrice + feeAmount;
    if (Number(player.ownedStreamingPlatform.treasuryCash || 0) < total) return { player, changed: false, message: `${money(total)} is more than the treasury holds.` };
    const ordered = orderNext(player, commission, {
        title, seed: `${commission.scriptId}:spinoff`, making: view.spinOffPrice, fee: feeAmount, feePercent: fee.percent, total, deal: 'BUY',
        episodes: commission.episodes, subtype: 'SPINOFF', installment: 1, keepCast: false, hype: getSeasonEffects(row?.episodeBudgetShares).hype / 2, energy, label: 'Spin-off',
    });
    if (!ordered) return { player, changed: false, message: 'That could not be ordered.' };
    const platform = ordered.player.ownedStreamingPlatform;
    return {
        player: {
            ...ordered.player,
            ownedStreamingPlatform: {
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => (item.id !== commissionId ? item : {
                    ...item,
                    lifecycleDecision: item.lifecycleDecision || { id: createDeterministicId('streaming_original_decision', commission.id, 'spinoff'), type: 'FRANCHISE', decidedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), evidenceWeeks: ORIGINAL_EVIDENCE_WEEKS, evidenceSummary: 'A spin-off was ordered.', exclusiveWindowWeeks: null },
                })),
            },
        },
        changed: true,
        message: `${title} is ordered. ${money(total)} paid.`,
        moment: ordered.moment,
        title,
    };
};

/** Ends the show on its own terms: no more seasons, and the fans have their say, louder for a hit */
export const endOriginal = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string } => {
    const commission = commissionOf(player, commissionId);
    if (!commission?.canonicalProjectId) return { player, changed: false, message: 'That title is not on your record.' };
    if (commission.lifecycleDecision?.type === 'CANCEL') return { player, changed: false, message: 'You have already ended it.' };
    const { hit } = hitOf(player, commission.canonicalProjectId);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platformName = player.ownedStreamingPlatform.identity?.name || 'The platform';
    const base = getSeriesBaseTitle(commission.title);
    const headline = hit >= 0.5 ? `Fans are furious: ${platformName} ends "${base}"` : `${platformName} ends "${base}"`;
    return {
        player: {
            ...player,
            news: [{ id: `news_original_end_${commission.id}`, headline, subtext: hit >= 0.5 ? 'It was one of the service\'s biggest shows.' : 'There will be no more of it.', category: 'INDUSTRY' as const, week: player.currentWeek, year: Math.floor(player.currentWeek / 52) + 2024, impactLevel: hit >= 0.5 ? 'HIGH' as const : 'LOW' as const }, ...(player.news || [])].slice(0, 80),
            ownedStreamingPlatform: {
                ...player.ownedStreamingPlatform,
                originalCommissions: player.ownedStreamingPlatform.originalCommissions.map(item => (item.id !== commissionId ? item : {
                    ...item,
                    lifecycleDecision: { id: createDeterministicId('streaming_original_decision', commission.id, 'end'), type: 'CANCEL' as const, decidedAtAbsoluteWeek: absoluteWeek, evidenceWeeks: 0, evidenceSummary: 'The player ended it.', exclusiveWindowWeeks: null },
                })),
            },
        },
        changed: true,
        message: `${base} is over. It stays on the service.`,
    };
};

/** Another three years of a title on licence, or buying it back once it has gone */
export const extendOriginalLicence = (player: Player, commissionId: string): { player: Player; changed: boolean; message: string } => {
    const view = getOriginalFutureView(player, commissionId);
    const commission = commissionOf(player, commissionId);
    if (!view?.licence || !commission) return { player, changed: false, message: 'That title is yours for good.' };
    const price = view.licence.extendPrice;
    if (Number(player.ownedStreamingPlatform.treasuryCash || 0) < price) return { player, changed: false, message: `${money(price)} is more than the treasury holds.` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    const key = `original-licence:${commission.id}:${absoluteWeek}`;
    return {
        player: {
            ...player,
            ownedStreamingPlatform: {
                ...platform,
                treasuryCash: platform.treasuryCash - price,
                eventLedger: [...platform.eventLedger, { id: createDeterministicId('streaming_event', platform.simulationSeed, key), idempotencyKey: key, absoluteWeek, type: 'ORIGINAL_ISSUE_PAID', summary: `${commission.producerStudioName} was paid ${money(price)} to keep ${commission.title} for three more years.`, source: 'PLAYER_ACTION', metadata: { commissionId, amount: price } }],
                originalCommissions: platform.originalCommissions.map(item => (item.id !== commissionId ? item : {
                    ...item,
                    licenceEndsAtAbsoluteWeek: Math.max(absoluteWeek, item.licenceEndsAtAbsoluteWeek || absoluteWeek) + ORIGINAL_LICENCE_WEEKS,
                })),
            },
        },
        changed: true,
        message: `${commission.title} stays for three more years. ${money(price)} paid.`,
    };
};
