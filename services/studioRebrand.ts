import type { Business, NewsItem, Player, Transaction, XPost } from '../types';
import { getAcquisitionCase } from './studioAcquisition';
import { createStudioNameRightsCase } from './studioNameRights';
import { getAbsoluteWeek } from './legacyLogic';

export const STUDIO_NAME_MAX_LENGTH = 48;
export const STUDIO_RENAME_COOLDOWN_WEEKS = 4;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundTo = (value: number, step: number) => Math.ceil(value / step) * step;

export const normalizeStudioName = (value: string) => value.replace(/\s+/g, ' ').trim();

const getStudioAcquisitionCase = (player: Player, studioId: string): any => (
    getAcquisitionCase(player, studioId)
    || (Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.find((acquisitionCase: any) => (
            acquisitionCase?.closing?.acquiredBusinessId === studioId
        ))
        : undefined)
);

export const getStudioRenameCooldownWeeks = (player: Player, studio: Business): number => {
    const lastWeek = studio.studioState?.lastRenamedWeek;
    const lastYear = studio.studioState?.lastRenamedYear;
    if (!Number.isFinite(lastWeek) || !Number.isFinite(lastYear)) return 0;
    const elapsed = Math.max(
        0,
        getAbsoluteWeek(player.age, player.currentWeek) - getAbsoluteWeek(Number(lastYear), Number(lastWeek)),
    );
    return Math.max(0, STUDIO_RENAME_COOLDOWN_WEEKS - elapsed);
};

export const hasActiveStudioNameRightsCase = (player: Player, studioId: string): boolean => (
    (player.flags?.activeCases || []).some((legalCase: any) => (
        legalCase?.caseType === 'STUDIO_NAME_RIGHTS'
        && legalCase?.studioId === studioId
        && legalCase?.status === 'ACTIVE'
    ))
);

export const getStudioRenameAvailability = (player: Player, studio: Business) => {
    const cooldownWeeks = getStudioRenameCooldownWeeks(player, studio);
    if (cooldownWeeks > 0) {
        return {
            allowed: false,
            cooldownWeeks,
            reason: 'COOLDOWN_ACTIVE' as const,
            message: `The current rebrand is still rolling out. You can rename this studio again in ${cooldownWeeks} ${cooldownWeeks === 1 ? 'week' : 'weeks'}.`,
        };
    }
    if (hasActiveStudioNameRightsCase(player, studio.id)) {
        return {
            allowed: false,
            cooldownWeeks: 0,
            reason: 'LEGAL_CASE_ACTIVE' as const,
            message: 'Resolve the active naming-rights case before changing this studio’s name again.',
        };
    }
    return {
        allowed: true,
        cooldownWeeks: 0,
        reason: null,
        message: '',
    };
};

export interface StudioRenameQuote {
    cost: number;
    hasProtectedNamePromise: boolean;
    brandHealthPenalty: number;
    investorConfidencePenalty: number;
    reputationPenalty: number;
}

export const getStudioRenameQuote = (player: Player, studio: Business): StudioRenameQuote => {
    const acquisitionCase = getStudioAcquisitionCase(player, studio.id);
    const protectedAtClosing = acquisitionCase?.offer?.commitments?.includes('PRESERVE_STUDIO_NAME') || false;
    const promiseAlreadyBroken = studio.studioState?.brokenAcquisitionCommitments?.includes('PRESERVE_STUDIO_NAME') || false;
    const hasProtectedNamePromise = protectedAtClosing && !promiseAlreadyBroken;
    const valuation = Math.max(0, Number(studio.stats?.valuation || 0));
    const brandHealth = clamp(Number(studio.stats?.brandHealth || 50), 0, 100);
    const baseCost = roundTo(clamp(
        1_500_000 + (valuation * 0.00125) + (brandHealth * 20_000),
        2_000_000,
        75_000_000,
    ), 100_000);

    return {
        cost: hasProtectedNamePromise ? roundTo(baseCost * 1.5, 100_000) : baseCost,
        hasProtectedNamePromise,
        brandHealthPenalty: hasProtectedNamePromise ? 6 : 0,
        investorConfidencePenalty: hasProtectedNamePromise ? 8 : 0,
        reputationPenalty: hasProtectedNamePromise ? 2 : 0,
    };
};

export const getStudioNameError = (player: Player, studio: Business, value: string): string | null => {
    const name = normalizeStudioName(value);
    if (name.length < 2) return 'Enter at least 2 characters.';
    if (name.length > STUDIO_NAME_MAX_LENGTH) return `Keep the name to ${STUDIO_NAME_MAX_LENGTH} characters or fewer.`;
    if (name.localeCompare(normalizeStudioName(studio.name), undefined, { sensitivity: 'accent' }) === 0) {
        return 'Enter a different name.';
    }
    const duplicate = (player.businesses || []).some(candidate => (
        candidate.id !== studio.id
        && normalizeStudioName(candidate.name).localeCompare(name, undefined, { sensitivity: 'accent' }) === 0
    ));
    if (duplicate) return 'You already own a business with this name.';
    return null;
};

export type StudioRenameFailureReason =
    | 'STUDIO_NOT_FOUND'
    | 'NOT_ACQUIRED_STUDIO'
    | 'INVALID_NAME'
    | 'COOLDOWN_ACTIVE'
    | 'LEGAL_CASE_ACTIVE'
    | 'INSUFFICIENT_STUDIO_CAPITAL';

export interface StudioRenameResult {
    success: boolean;
    player: Player;
    studio?: Business;
    quote?: StudioRenameQuote;
    error?: string;
    reason?: StudioRenameFailureReason;
}

const makeIndustryPost = (
    player: Player,
    studioId: string,
    oldName: string,
    newName: string,
    brokePromise: boolean,
): XPost => ({
    id: `x_studio_rebrand_${studioId}_${player.age}_${player.currentWeek}_${Date.now()}`,
    authorId: 'backlot_wire',
    authorName: 'Backlot Wire',
    authorHandle: '@backlotwire',
    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=backlot-wire',
    content: brokePromise
        ? `${oldName} is now ${newName}—and the former owners have filed a naming-rights lawsuit over the promise made at closing. First hearing: next week.`
        : `${oldName} is now ${newName}. The new owner is putting a fresh identity on the acquired studio—and Hollywood is watching what changes next.`,
    timestamp: Date.now(),
    likes: brokePromise ? 18_400 : 7_600,
    retweets: brokePromise ? 3_900 : 1_200,
    replies: brokePromise ? 2_100 : 540,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'CAREER',
    sentiment: brokePromise ? 'MESSY' : 'INDUSTRY',
    controversyScore: brokePromise ? 38 : 8,
});

export const renameAcquiredStudio = ({
    player,
    studioId,
    value,
}: {
    player: Player;
    studioId: string;
    value: string;
}): StudioRenameResult => {
    const studio = (player.businesses || []).find(candidate => candidate.id === studioId);
    if (!studio) return { success: false, player, reason: 'STUDIO_NOT_FOUND', error: 'Studio not found.' };
    if (studio.type !== 'PRODUCTION_HOUSE' || studio.studioState?.acquisitionOrigin !== 'STUDIO_ACQUISITION') {
        return { success: false, player, studio, reason: 'NOT_ACQUIRED_STUDIO', error: 'Only an acquired studio can be renamed here.' };
    }
    const availability = getStudioRenameAvailability(player, studio);
    if (!availability.allowed) {
        return {
            success: false,
            player,
            studio,
            reason: availability.reason || 'COOLDOWN_ACTIVE',
            error: availability.message,
        };
    }

    const newName = normalizeStudioName(value);
    const nameError = getStudioNameError(player, studio, newName);
    if (nameError) return { success: false, player, studio, reason: 'INVALID_NAME', error: nameError };

    const quote = getStudioRenameQuote(player, studio);
    if (Number(studio.balance || 0) < quote.cost) {
        return {
            success: false,
            player,
            studio,
            quote,
            reason: 'INSUFFICIENT_STUDIO_CAPITAL',
            error: `This studio needs ${quote.cost.toLocaleString()} in capital to fund the rebrand.`,
        };
    }

    const oldName = studio.name;
    const formerNames = Array.from(new Set([
        ...(studio.studioState.formerNames || []),
        oldName,
    ].filter(name => name !== newName))).slice(-8);
    const brokenCommitments = quote.hasProtectedNamePromise
        ? Array.from(new Set([
            ...(studio.studioState.brokenAcquisitionCommitments || []),
            'PRESERVE_STUDIO_NAME' as const,
        ]))
        : studio.studioState.brokenAcquisitionCommitments;

    const renamedStudio: Business = {
        ...studio,
        name: newName,
        balance: Math.max(0, studio.balance - quote.cost),
        stats: {
            ...studio.stats,
            brandHealth: clamp((studio.stats.brandHealth || 0) - quote.brandHealthPenalty, 0, 100),
            investorConfidence: clamp((studio.stats.investorConfidence || 0) - quote.investorConfidencePenalty, 0, 100),
        },
        studioState: {
            ...studio.studioState,
            saleDeck: studio.studioState.saleDeck
                ? { ...studio.studioState.saleDeck, studioName: newName }
                : studio.studioState.saleDeck,
            formerNames,
            lastRenamedWeek: player.currentWeek,
            lastRenamedYear: player.age,
            brokenAcquisitionCommitments: brokenCommitments,
            financeLedger: [{
                id: `studio_rebrand_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
                week: player.currentWeek,
                year: player.age,
                amount: -quote.cost,
                type: 'REBRAND' as const,
                label: `Rebrand from ${oldName} to ${newName}`,
            }, ...(studio.studioState.financeLedger || [])].slice(0, 200),
        },
    };

    const transaction: Transaction = {
        id: `tx_studio_rebrand_${studio.id}_${Date.now()}`,
        week: player.currentWeek,
        year: player.age,
        amount: -quote.cost,
        category: 'BUSINESS',
        description: `Studio rebrand: ${oldName} to ${newName}`,
    };
    const newsItem: NewsItem = {
        id: `news_studio_rebrand_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
        headline: `${oldName} rebrands as ${newName}`,
        subtext: quote.hasProtectedNamePromise
            ? `The ${quote.cost.toLocaleString()} rollout breaks the name-protection promise made at closing. The former owners have filed a claim, with the first hearing next week.`
            : `The acquired studio begins a ${quote.cost.toLocaleString()} identity and marketing rollout under its new banner.`,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: quote.hasProtectedNamePromise ? 'HIGH' : 'MEDIUM',
    };
    const socialPost = makeIndustryPost(player, studio.id, oldName, newName, quote.hasProtectedNamePromise);
    const nameRightsCase = quote.hasProtectedNamePromise
        ? createStudioNameRightsCase({
            player,
            studio: renamedStudio,
            protectedName: oldName,
            rebrandedName: newName,
            rebrandCost: quote.cost,
        })
        : null;
    const acquisitionCases = Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.map((acquisitionCase: any) => {
            const matches = acquisitionCase?.studioId === studio.id
                || acquisitionCase?.closing?.acquiredBusinessId === studio.id;
            if (!matches) return acquisitionCase;
            return {
                ...acquisitionCase,
                originalStudioName: acquisitionCase.originalStudioName || acquisitionCase.studioName || oldName,
                studioName: newName,
                lastRenamedWeek: player.currentWeek,
                lastRenamedYear: player.age,
            };
        })
        : player.flags?.studioAcquisitionCases;
    const acquisitionDebtLedger = Array.isArray(player.flags?.acquisitionDebtLedger)
        ? player.flags.acquisitionDebtLedger.map((entry: any) => (
            entry?.studioId === studio.id ? { ...entry, studioName: newName } : entry
        ))
        : player.flags?.acquisitionDebtLedger;
    const acquisitionCase = getStudioAcquisitionCase(player, studio.id);
    const originalStudioId = acquisitionCase?.studioId;

    const nextPlayer: Player = {
        ...player,
        money: player.money,
        stats: {
            ...player.stats,
            reputation: clamp((player.stats.reputation || 0) - quote.reputationPenalty, 0, 100),
        },
        businesses: player.businesses.map(candidate => candidate.id === studio.id ? renamedStudio : candidate),
        stocks: (player.stocks || []).map(stock => (
            stock.relatedStudioId === studio.id || stock.relatedStudioId === originalStudioId
                ? { ...stock, name: newName }
                : stock
        )),
        stockTakeovers: (player.stockTakeovers || []).map(takeover => (
            takeover.acquiredBusinessId === studio.id
            || takeover.relatedStudioId === studio.id
            || takeover.relatedStudioId === originalStudioId
                ? { ...takeover, companyName: newName }
                : takeover
        )),
        finance: {
            ...player.finance,
            history: [transaction, ...(player.finance?.history || [])].slice(0, 200),
        },
        news: [newsItem, ...(player.news || [])].slice(0, 80),
        x: {
            ...player.x,
            feed: [socialPost, ...(player.x?.feed || [])].slice(0, 80),
        },
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: quote.hasProtectedNamePromise
                ? `${oldName} became ${newName}. The former owners filed a naming-rights lawsuit, and the first hearing is next week.`
                : `${oldName} became ${newName}. The studio paid ${quote.cost.toLocaleString()} for the rebrand.`,
            type: quote.hasProtectedNamePromise ? 'negative' as const : 'neutral' as const,
        }, ...(player.logs || [])].slice(0, 80),
        flags: {
            ...player.flags,
            studioAcquisitionCases: acquisitionCases,
            acquisitionDebtLedger,
            activeCases: nameRightsCase
                ? [nameRightsCase, ...(player.flags?.activeCases || [])]
                : player.flags?.activeCases,
        },
    };

    return {
        success: true,
        player: nextPlayer,
        studio: renamedStudio,
        quote,
    };
};
