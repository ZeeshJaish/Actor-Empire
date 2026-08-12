import type { Business, BusinessStaff, GameLanguage, NewsItem, Player, XPost } from '../types';
import type { ForbesStudioProfile, StudioAcquisitionState } from './forbesStudioProfile';
import { createDefaultStudioState } from './businessLogic';
import { getCompanyEquityPositions, getCompanyPosition } from './companyPosition';
import {
    calculateStockTradeQuote,
    executeStockTrade,
    getStockOutstandingShares,
} from './stockLogic';
import { isStreamingPlatformStudio } from './studioClassification';
import { getRegulatorAcquisitionControls, getRegulatorAdjustedDiligenceFee } from './regulatorPressure';
import { getPlayerLanguage, t } from './i18n';
import { syncAcquisitionDebtLedger } from './acquisitionDebt';
import {
    buildPortfolioOwnedRights,
    buildStudioAcquisitionPortfolio,
    deriveAcquiredStudioFacilities,
} from './studioAcquisitionAssets';

export type AcquisitionCaseStatus = 'DRAFT' | 'OFFER_SUBMITTED' | 'COUNTERED' | 'RIVAL_BID' | 'ACCEPTED' | 'REJECTED' | 'CLOSED' | 'ACQUIRED';
export type AcquisitionOfferType = 'CONSERVATIVE' | 'FAIR' | 'AGGRESSIVE' | 'MINORITY';
export type AcquisitionFundingSource = 'PERSONAL' | 'STUDIO';
export type AcquisitionComplianceBand = 'ROUTINE' | 'REVIEWABLE' | 'HIGH_SCRUTINY' | 'INVESTIGATION_LIKELY';
export type SellerResponsePosture = 'DISMISSIVE' | 'TESTING' | 'SERIOUS' | 'COMPELLING' | 'OVERPAYING';
export type AcquisitionSellerDecision = 'ACCEPTED' | 'COUNTERED' | 'RIVAL_BID' | 'REJECTED';
export type AcquisitionCommitmentId = 'PRESERVE_STUDIO_NAME' | 'PROTECT_EMPLOYEES' | 'GUARANTEE_PRODUCTIONS';

const ACQUISITION_COMMITMENT_TEMPLATES: Array<{
    id: AcquisitionCommitmentId;
    leverageBonus: number;
}> = [
    {
        id: 'PRESERVE_STUDIO_NAME',
        leverageBonus: 0.02,
    },
    {
        id: 'PROTECT_EMPLOYEES',
        leverageBonus: 0.025,
    },
    {
        id: 'GUARANTEE_PRODUCTIONS',
        leverageBonus: 0.035,
    },
];

export const getAcquisitionCommitments = (language: GameLanguage = 'en'): Array<{
    id: AcquisitionCommitmentId;
    label: string;
    shortLabel: string;
    description: string;
    leverageBonus: number;
}> => ACQUISITION_COMMITMENT_TEMPLATES.map(template => ({
    ...template,
    label: t(language, `services.studioAcquisition.commitment.${template.id}.label`),
    shortLabel: t(language, `services.studioAcquisition.commitment.${template.id}.shortLabel`),
    description: t(language, `services.studioAcquisition.commitment.${template.id}.description`),
}));

export const ACQUISITION_COMMITMENTS = getAcquisitionCommitments('en');

export interface AcquisitionFundingSelection {
    source: AcquisitionFundingSource;
    businessId?: string;
}

export interface AcquisitionDiligenceReport {
    verifiedDebt: number;
    hiddenLiabilities: number;
    obligations: string[];
    adjustedEnterpriseValue: number;
    expectedAnnualIncome: number;
    confidence: number;
    recommendedLow: number;
    recommendedHigh: number;
    primaryRisk: string;
}

export interface AcquisitionCase {
    studioId: string;
    studioName: string;
    acquisitionState: StudioAcquisitionState;
    publicValuation: number;
    approachedWeek: number;
    approachedYear: number;
    status: AcquisitionCaseStatus;
    /** A closed approach returns to the market after a short cooling-off period. */
    reapproachAfterWeek?: number;
    reapproachAfterYear?: number;
    controlConversion?: {
        kind: 'PRIVATE_STAKE_TO_CONTROL';
        existingPercent: number;
        remainingPercent: number;
        existingCostBasis: number;
        existingPositionValue: number;
        initiatedWeek: number;
        initiatedYear: number;
    };
    diligence?: {
        status: 'COMPLETE';
        fee: number;
        funding: AcquisitionFundingSelection;
        complianceRisk: number;
        report: AcquisitionDiligenceReport;
    };
    offer?: {
        type: AcquisitionOfferType;
        amount: number;
        minorityPercent?: number;
        funding: AcquisitionFundingSelection;
        complianceRisk: number;
        complianceBand: AcquisitionComplianceBand;
        commitments?: AcquisitionCommitmentId[];
        submittedWeek: number;
        submittedYear: number;
        round?: number;
    };
    sellerResponse?: {
        decision: AcquisitionSellerDecision;
        counterAmount?: number;
        agreedAmount?: number;
        rivalStudioName?: string;
        rivalAmount?: number;
        requiredBidAmount?: number;
        maxRounds?: number;
        round: number;
        respondedWeek: number;
        respondedYear: number;
        summary: string;
    };
    presentation?: {
        responseSeenKey?: string;
        closingStage?: 'RESPONSE' | 'CLOSING' | 'SIGNING';
    };
    closing?: {
        finalPrice: number;
        acquiredBusinessId?: string;
        signedWeek?: number;
        signedYear?: number;
        funding: AcquisitionFundingSelection;
        verifiedDebt: number;
        hiddenLiabilities: number;
        expectedAnnualIncome: number;
        assetSummary: string;
        outcome?: 'MINORITY_STAKE' | 'CONTROL' | 'FULL_BUYOUT';
    };
}

export interface AcquisitionEligibility {
    canApproach: boolean;
    reason?: 'PLAYER_OWNED' | 'NOT_FOR_SALE' | 'OFFER_ALREADY_SUBMITTED' | 'STREAMING_PLATFORM_RESERVED' | 'COOLDOWN_ACTIVE';
    allowedOfferTypes: AcquisitionOfferType[];
    recommendedOfferType: AcquisitionOfferType;
}

export const ACQUISITION_REAPPROACH_COOLDOWN_WEEKS = 8;
export const ACQUISITION_MAX_OFFER_ATTEMPTS = 3;
// Board notices are short-lived pointers into the live Forbes deal state.
// The deal itself remains authoritative in the acquisition case, never in an inbox card.
export const ACQUISITION_INBOX_NOTICE_WEEKS = 8;
const GAME_WEEKS_PER_YEAR = 52;

const toGameWeekIndex = (year: number, week: number) => (
    Math.max(0, year) * GAME_WEEKS_PER_YEAR + Math.max(1, week)
);

const getGameWeekAfter = (year: number, week: number, weeks: number) => {
    const nextIndex = toGameWeekIndex(year, week) + Math.max(0, weeks);
    return {
        year: Math.floor((nextIndex - 1) / GAME_WEEKS_PER_YEAR),
        week: ((nextIndex - 1) % GAME_WEEKS_PER_YEAR) + 1,
    };
};

export const getAcquisitionReapproachWeeksRemaining = (
    acquisitionCase: AcquisitionCase | undefined,
    player?: Pick<Player, 'age' | 'currentWeek'>,
) => {
    if (
        acquisitionCase?.status !== 'CLOSED'
        || !player
        || typeof acquisitionCase.reapproachAfterYear !== 'number'
        || typeof acquisitionCase.reapproachAfterWeek !== 'number'
    ) return 0;

    return Math.max(0, toGameWeekIndex(
        acquisitionCase.reapproachAfterYear,
        acquisitionCase.reapproachAfterWeek,
    ) - toGameWeekIndex(player.age, player.currentWeek));
};

export const getAcquisitionOfferAttemptCount = (acquisitionCase?: AcquisitionCase) => (
    Math.min(
        ACQUISITION_MAX_OFFER_ATTEMPTS,
        Math.max(0, Math.round(acquisitionCase?.offer?.round || 0)),
    )
);

export const getAcquisitionOfferAttemptsRemaining = (acquisitionCase?: AcquisitionCase) => (
    Math.max(0, ACQUISITION_MAX_OFFER_ATTEMPTS - getAcquisitionOfferAttemptCount(acquisitionCase))
);

export interface AcquisitionFundingOption {
    source: AcquisitionFundingSource;
    businessId?: string;
    label: string;
    balance: number;
    remainingBalance: number;
    affordable: boolean;
    complianceRisk: number;
    complianceBand: AcquisitionComplianceBand;
    taxTreatment: string;
    unavailableReason?: string;
}

export interface AcquisitionOfferPreset {
    type: AcquisitionOfferType;
    amount: number;
    percent?: number;
    valueDeltaPercent: number;
}

export interface CustomOfferAnalysis {
    normalizedAmount: number;
    referenceValue: number;
    comparisonValue: number;
    valueDeltaPercent: number;
    impliedCompanyValue?: number;
    combinedOwnershipPercent?: number;
    reachesStrategicThreshold?: boolean;
    posture: SellerResponsePosture;
    valid: boolean;
    validationReason?: string;
}

type AcquisitionSellerResponse = NonNullable<AcquisitionCase['sellerResponse']>;

interface AcquisitionProfile extends Pick<
    ForbesStudioProfile,
    | 'id'
    | 'name'
    | 'isPlayerOwned'
    | 'acquisitionState'
    | 'valuation'
    | 'capital'
    | 'debt'
    | 'profitability'
    | 'reputation'
    | 'hits'
    | 'flops'
    | 'rightsCount'
    | 'franchiseCount'
    | 'universeCount'
    | 'universeNames'
    | 'facilities'
    | 'facilitiesEstimated'
    | 'keyTalent'
    | 'catalog'
    | 'rightsHighlights'
    | 'ownershipStructure'
    | 'archetype'
    | 'assetDataSource'
> {}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundMoney = (value: number) => Math.max(0, Math.round(value / 10_000) * 10_000);
const stableHash = (value: string) => Array.from(value).reduce(
    (hash, character) => ((hash * 33) ^ character.charCodeAt(0)) >>> 0,
    5381,
);
const formatCompactMoney = (value: number): string => {
    const absolute = Math.abs(value || 0);
    if (absolute >= 1_000_000_000) return `$${(absolute / 1_000_000_000).toFixed(absolute >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
    if (absolute >= 1_000_000) return `$${(absolute / 1_000_000).toFixed(absolute >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (absolute >= 1_000) return `$${(absolute / 1_000).toFixed(absolute >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
    return `$${absolute.toLocaleString()}`;
};
const formatAcquisitionMoney = (value: number): string => `$${Math.max(0, Math.round(value || 0)).toLocaleString()}`;

type AcquisitionMediaMoment =
    | 'DILIGENCE'
    | 'OFFER_SUBMITTED'
    | 'ACCEPTED'
    | 'COUNTERED'
    | 'RIVAL_BID'
    | 'REJECTED'
    | 'COUNTER_ACCEPTED'
    | 'REVISED_OFFER'
    | 'RIVAL_BEAT'
    | 'WALKED_AWAY'
    | 'ACQUIRED';

const ACQUISITION_MEDIA_META: Record<AcquisitionMediaMoment, { impact: NewsItem['impactLevel']; sentiment: XPost['sentiment'] }> = {
    DILIGENCE: { impact: 'LOW', sentiment: 'INDUSTRY' },
    OFFER_SUBMITTED: { impact: 'MEDIUM', sentiment: 'INDUSTRY' },
    ACCEPTED: { impact: 'HIGH', sentiment: 'SUPPORTIVE' },
    COUNTERED: { impact: 'MEDIUM', sentiment: 'NEUTRAL' },
    RIVAL_BID: { impact: 'HIGH', sentiment: 'MESSY' },
    REJECTED: { impact: 'MEDIUM', sentiment: 'MESSY' },
    COUNTER_ACCEPTED: { impact: 'HIGH', sentiment: 'INDUSTRY' },
    REVISED_OFFER: { impact: 'MEDIUM', sentiment: 'INDUSTRY' },
    RIVAL_BEAT: { impact: 'HIGH', sentiment: 'INDUSTRY' },
    WALKED_AWAY: { impact: 'MEDIUM', sentiment: 'NEUTRAL' },
    ACQUIRED: { impact: 'HIGH', sentiment: 'SUPPORTIVE' },
};

const getAcquisitionMediaPrice = (language: ReturnType<typeof getPlayerLanguage>, moment: AcquisitionMediaMoment, amount = 0): string => {
    if (amount > 0) return formatCompactMoney(amount);
    switch (moment) {
        case 'OFFER_SUBMITTED':
            return t(language, 'services.studioAcquisition.media.price.formalOffer');
        case 'ACCEPTED':
            return t(language, 'services.studioAcquisition.media.price.agreed');
        case 'REVISED_OFFER':
            return t(language, 'services.studioAcquisition.media.price.strongerOffer');
        case 'RIVAL_BEAT':
            return t(language, 'services.studioAcquisition.media.price.higherBid');
        case 'ACQUIRED':
            return t(language, 'services.studioAcquisition.media.price.signedDeal');
        default:
            return '';
    }
};

const getAcquisitionMediaCopy = ({
    moment,
    player,
    studioName,
    amount = 0,
    rivalStudioName,
}: {
    moment: AcquisitionMediaMoment;
    player: Pick<Player, 'name' | 'settings'>;
    studioName: string;
    amount?: number;
    rivalStudioName?: string;
}): { headline: string; subtext: string; social: string; impact: NewsItem['impactLevel']; sentiment: XPost['sentiment'] } => {
    const language = getPlayerLanguage(player);
    const meta = ACQUISITION_MEDIA_META[moment];
    const vars = {
        player: player.name?.trim() || t(language, 'services.studioAcquisition.media.playerFallback'),
        studio: studioName,
        price: getAcquisitionMediaPrice(language, moment, amount),
        rival: rivalStudioName || t(language, 'services.studioAcquisition.media.rivalFallback'),
    };
    return {
        headline: t(language, `services.studioAcquisition.media.${moment}.headline`, vars),
        subtext: t(language, `services.studioAcquisition.media.${moment}.subtext`, vars),
        social: t(language, `services.studioAcquisition.media.${moment}.social`, vars),
        impact: meta.impact,
        sentiment: meta.sentiment,
    };
};

const getAcquisitionRoundLabel = (language: GameLanguage, round: number): string => (
    t(language, round === 1
        ? 'services.studioAcquisition.seller.round.opening'
        : 'services.studioAcquisition.seller.round.revised')
);

const getAcquisitionDecisionLabel = (language: GameLanguage, decision: AcquisitionSellerDecision): string => (
    t(language, `services.studioAcquisition.seller.decision.${decision}`)
);

const getAcquisitionInboxSubject = (language: GameLanguage, decision: AcquisitionSellerDecision | 'COUNTER_ACCEPTED' | 'ACQUIRED' | 'STOCK_CONTROL_ACQUIRED', studioName: string): string => (
    t(language, `services.studioAcquisition.inbox.subject.${decision}`, { studio: studioName })
);

const addAcquisitionMediaPulse = (
    player: Player,
    payload: {
        moment: AcquisitionMediaMoment;
        studioId: string;
        studioName: string;
        amount?: number;
        rivalStudioName?: string;
        round?: number;
    },
): Player => {
    const copy = getAcquisitionMediaCopy({
        moment: payload.moment,
        player,
        studioName: payload.studioName,
        amount: payload.amount,
        rivalStudioName: payload.rivalStudioName,
    });
    const idBase = `studio_acquisition_${payload.studioId}_${payload.moment.toLowerCase()}_${payload.round || player.currentWeek}`;
    const newsItem: NewsItem = {
        id: `news_${idBase}`,
        headline: copy.headline,
        subtext: copy.subtext,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: copy.impact,
    };
    const existingX = player.x || { handle: '@player', followers: 0, posts: [], feed: [], lastPostWeek: 0 };
    const existingFeed = Array.isArray(existingX.feed) ? existingX.feed : [];
    const sourcePosts = existingFeed.filter(post => !post.isPlayer && typeof post.authorHandle === 'string' && post.authorHandle.trim().length > 0);
    const fallbackSources = [
        { authorId: 'studio_dealwire', authorName: 'Studio Dealwire', authorHandle: '@studiodealwire', authorAvatar: '' },
        { authorId: 'market_mood', authorName: 'Market Mood', authorHandle: '@marketmood', authorAvatar: '' },
        { authorId: 'dealroom_wire', authorName: 'Dealroom Wire', authorHandle: '@dealroomwire', authorAvatar: '' },
        { authorId: 'board_watch', authorName: 'Board Watch', authorHandle: '@boardwatch', authorAvatar: '' },
    ];
    const sourceIndex = stableHash(`${idBase}:author`) % Math.max(1, sourcePosts.length || fallbackSources.length);
    const source = sourcePosts[sourceIndex]
        ? {
            authorId: sourcePosts[sourceIndex].authorId,
            authorName: sourcePosts[sourceIndex].authorName,
            authorHandle: sourcePosts[sourceIndex].authorHandle,
            authorAvatar: sourcePosts[sourceIndex].authorAvatar,
        }
        : fallbackSources[sourceIndex % fallbackSources.length];
    const socialPost: XPost = {
        id: `x_${idBase}`,
        authorId: source.authorId,
        authorName: source.authorName,
        authorHandle: source.authorHandle,
        authorAvatar: source.authorAvatar || `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(source.authorHandle)}`,
        content: copy.social,
        timestamp: Date.now(),
        likes: 420 + (stableHash(`${idBase}:likes`) % 48_000),
        retweets: 40 + (stableHash(`${idBase}:reposts`) % 7_500),
        replies: 12 + (stableHash(`${idBase}:replies`) % 1_800),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'CAREER',
        sentiment: copy.sentiment,
    };
    const existingNews = Array.isArray(player.news) ? player.news : [];
    return {
        ...player,
        news: existingNews.some(item => item.id === newsItem.id)
            ? existingNews
            : [newsItem, ...existingNews].slice(0, 80),
        x: {
            ...existingX,
            feed: existingFeed.some(post => post.id === socialPost.id)
                ? existingFeed
                : [socialPost, ...existingFeed].slice(0, 80),
        },
    };
};

const normalizeCommitments = (commitments: AcquisitionCommitmentId[] = []): AcquisitionCommitmentId[] => {
    const validIds = new Set(ACQUISITION_COMMITMENTS.map(commitment => commitment.id));
    return Array.from(new Set(commitments.filter(commitment => validIds.has(commitment))));
};

const getCommitmentLeverageBonus = (commitments: AcquisitionCommitmentId[] = []) => (
    normalizeCommitments(commitments).reduce((total, commitmentId) => {
        const commitment = ACQUISITION_COMMITMENTS.find(entry => entry.id === commitmentId);
        return total + (commitment?.leverageBonus || 0);
    }, 0)
);

export const getAcquisitionCases = (player: Pick<Player, 'flags'>): AcquisitionCase[] => (
    Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.filter((entry: AcquisitionCase) => typeof entry?.studioId === 'string')
        : []
);

export const getAcquisitionCase = (
    player: Pick<Player, 'flags'>,
    studioId: string,
): AcquisitionCase | undefined => getAcquisitionCases(player).find(entry => entry.studioId === studioId);

const persistCase = (player: Player, acquisitionCase: AcquisitionCase): Player => {
    const cases = getAcquisitionCases(player);
    const nextCases = [
        ...cases.filter(entry => entry.studioId !== acquisitionCase.studioId),
        acquisitionCase,
    ];
    return {
        ...player,
        flags: {
            ...player.flags,
            studioAcquisitionCases: nextCases,
        },
    };
};

export const updateAcquisitionPresentation = ({
    player,
    studioId,
    patch,
}: {
    player: Player;
    studioId: string;
    patch: NonNullable<AcquisitionCase['presentation']>;
}): { success: boolean; player: Player; acquisitionCase?: AcquisitionCase; reason?: 'CASE_NOT_FOUND' } => {
    const acquisitionCase = getAcquisitionCase(player, studioId);
    if (!acquisitionCase) return { success: false, player, reason: 'CASE_NOT_FOUND' };
    const nextCase: AcquisitionCase = {
        ...acquisitionCase,
        presentation: {
            ...acquisitionCase.presentation,
            ...patch,
        },
    };
    return {
        success: true,
        player: persistCase(player, nextCase),
        acquisitionCase: nextCase,
    };
};

export const getAcquisitionEligibility = (
    profile: Pick<ForbesStudioProfile, 'isPlayerOwned' | 'acquisitionState'> & Partial<Pick<ForbesStudioProfile, 'id' | 'archetype'>>,
    existingCase?: AcquisitionCase,
    player?: Pick<Player, 'age' | 'currentWeek'>,
): AcquisitionEligibility => {
    const privateControlConversion = existingCase?.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL';
    const allowedOfferTypes: AcquisitionOfferType[] = privateControlConversion
        ? ['CONSERVATIVE', 'FAIR', 'AGGRESSIVE']
        : profile.acquisitionState === 'PUBLICLY_TRADED'
        ? ['MINORITY']
        : ['CONSERVATIVE', 'FAIR', 'AGGRESSIVE', 'MINORITY'];
    const recommendedOfferType: AcquisitionOfferType = privateControlConversion
        ? 'FAIR'
        : (
        profile.acquisitionState === 'SEEKING_INVESTMENT'
        || profile.acquisitionState === 'PUBLICLY_TRADED'
    ) ? 'MINORITY' : 'FAIR';

    if (profile.isPlayerOwned) {
        return { canApproach: false, reason: 'PLAYER_OWNED', allowedOfferTypes: [], recommendedOfferType };
    }
    if (isStreamingPlatformStudio(profile)) {
        return { canApproach: false, reason: 'STREAMING_PLATFORM_RESERVED', allowedOfferTypes: [], recommendedOfferType };
    }
    const reapproachWeeksRemaining = getAcquisitionReapproachWeeksRemaining(existingCase, player);
    if (existingCase?.status === 'CLOSED' && reapproachWeeksRemaining > 0) {
        return { canApproach: false, reason: 'COOLDOWN_ACTIVE', allowedOfferTypes: [], recommendedOfferType };
    }
    // Older saves could leave the final declined offer as REJECTED. Treat it
    // as closed immediately so an old inbox card cannot reopen an endless deal.
    if (
        existingCase?.status === 'REJECTED'
        && getAcquisitionOfferAttemptCount(existingCase) >= ACQUISITION_MAX_OFFER_ATTEMPTS
    ) {
        return { canApproach: false, reason: 'COOLDOWN_ACTIVE', allowedOfferTypes: [], recommendedOfferType };
    }
    // A shareholder can value, hold, or sell a private stake, but cannot use it
    // to bypass a board that is explicitly not entertaining control proposals.
    if (
        profile.acquisitionState === 'NOT_FOR_SALE'
        && existingCase?.status !== 'CLOSED'
    ) {
        return { canApproach: false, reason: 'NOT_FOR_SALE', allowedOfferTypes: [], recommendedOfferType };
    }
    if (existingCase && ['OFFER_SUBMITTED', 'COUNTERED', 'RIVAL_BID', 'ACCEPTED'].includes(existingCase.status)) {
        return { canApproach: false, reason: 'OFFER_ALREADY_SUBMITTED', allowedOfferTypes, recommendedOfferType };
    }
    return { canApproach: true, allowedOfferTypes, recommendedOfferType };
};

export type PrivateControlAcquisitionStartResult = {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    reason?:
        | 'POSITION_NOT_FOUND'
        | 'PUBLIC_COMPANY'
        | 'ALREADY_OWNED'
        | 'EXIT_ACTIVE'
        | 'COOLDOWN_ACTIVE'
        | 'NOT_FOR_SALE'
        | 'INVALID_POSITION';
};

export const beginPrivateControlAcquisition = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}): PrivateControlAcquisitionStartResult => {
    if (profile.acquisitionState === 'PUBLICLY_TRADED') {
        return { success: false, player, reason: 'PUBLIC_COMPANY' };
    }
    if (profile.isPlayerOwned || (player.businesses || []).some(business => business.id === profile.id)) {
        return { success: false, player, reason: 'ALREADY_OWNED' };
    }
    if (profile.acquisitionState === 'NOT_FOR_SALE') {
        return { success: false, player, reason: 'NOT_FOR_SALE' };
    }

    const positions = getCompanyEquityPositions(player).filter(position => position.studioId === profile.id);
    if (positions.length === 0) return { success: false, player, reason: 'POSITION_NOT_FOUND' };
    if (positions.some(position => Boolean(position.exit))) {
        return { success: false, player, reason: 'EXIT_ACTIVE' };
    }

    const existingPercent = Math.round(Math.min(
        49,
        positions.reduce((sum, position) => sum + Math.max(0, Number(position.percent) || 0), 0),
    ) * 100) / 100;
    if (existingPercent <= 0 || existingPercent >= 100) {
        return { success: false, player, reason: 'INVALID_POSITION' };
    }

    const existingCase = getAcquisitionCase(player, profile.id);
    if (
        existingCase?.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
        && existingCase.status !== 'ACQUIRED'
        && existingCase.status !== 'CLOSED'
    ) {
        return { success: true, player, acquisitionCase: existingCase };
    }
    if (
        existingCase?.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
        && existingCase.status === 'CLOSED'
        && getAcquisitionReapproachWeeksRemaining(existingCase, player) > 0
    ) {
        return { success: false, player, acquisitionCase: existingCase, reason: 'COOLDOWN_ACTIVE' };
    }

    const existingCostBasis = Math.round(positions.reduce(
        (sum, position) => sum + Math.max(0, Number(position.investedAmount) || 0),
        0,
    ));
    const currentCompanyValuation = Math.max(
        1,
        Math.round(positions.reduce(
            (highest, position) => Math.max(highest, Number(position.currentCompanyValuation) || 0),
            0,
        )),
        Math.round(Number(profile.valuation) || 0),
    );
    const existingPositionValue = Math.round(currentCompanyValuation * (existingPercent / 100));
    const remainingPercent = Math.round((100 - existingPercent) * 100) / 100;
    const controlCase: AcquisitionCase = {
        studioId: profile.id,
        studioName: profile.name,
        acquisitionState: profile.acquisitionState,
        publicValuation: currentCompanyValuation,
        approachedWeek: player.currentWeek,
        approachedYear: player.age,
        status: 'DRAFT',
        controlConversion: {
            kind: 'PRIVATE_STAKE_TO_CONTROL',
            existingPercent,
            remainingPercent,
            existingCostBasis,
            existingPositionValue,
            initiatedWeek: player.currentWeek,
            initiatedYear: player.age,
        },
    };
    const nextPlayer = persistCase({
        ...player,
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `Control strategy opened for ${profile.name}. Your existing ${existingPercent.toFixed(1)}% stake is credited; negotiations cover the remaining ${remainingPercent.toFixed(1)}%.`,
            type: 'neutral' as const,
        }, ...(player.logs || [])].slice(0, 50),
    }, controlCase);

    return {
        success: true,
        player: nextPlayer,
        acquisitionCase: controlCase,
    };
};

export const calculateDueDiligenceFee = (
    profile: Pick<ForbesStudioProfile, 'valuation'>,
): number => roundMoney(clamp(profile.valuation * 0.0015, 250_000, 25_000_000));

export const getComplianceBand = (risk: number): AcquisitionComplianceBand => {
    if (risk >= 75) return 'INVESTIGATION_LIKELY';
    if (risk >= 50) return 'HIGH_SCRUTINY';
    if (risk >= 25) return 'REVIEWABLE';
    return 'ROUTINE';
};

const calculateStudioComplianceRisk = ({
    business,
    profile,
    amount,
    expenseType,
    priorStudioFundedCases,
}: {
    business: Business;
    profile: AcquisitionProfile;
    amount: number;
    expenseType: 'DILIGENCE' | 'OFFER';
    priorStudioFundedCases: number;
}) => {
    const balance = Math.max(1, business.balance || 0);
    const studioValue = Math.max(balance, business.stats?.valuation || 0, 1);
    const balancePressure = clamp(amount / balance, 0, 2) * 24;
    const valuationPressure = clamp(amount / studioValue, 0, 2) * 20;
    const targetPressure = clamp(amount / Math.max(profile.valuation, 1), 0, 2) * 10;
    const unhealthyPenalty = (business.stats?.weeklyProfit || 0) < 0 ? 18 : 0;
    const strategicFitDiscount = /studio|pictures|media|film|platform|prestige|legacy|franchise/i.test(
        `${profile.name} ${profile.archetype}`,
    ) ? 10 : 0;
    const repeatPenalty = Math.min(18, priorStudioFundedCases * 6);
    const expenseMultiplier = expenseType === 'DILIGENCE' ? 0.35 : 1;
    return Math.round(clamp(
        (8 + balancePressure + valuationPressure + targetPressure + unhealthyPenalty + repeatPenalty - strategicFitDiscount)
        * expenseMultiplier,
        0,
        100,
    ));
};

export const getFundingOptions = ({
    player,
    profile,
    amount,
    expenseType,
    language = 'en',
}: {
    player: Pick<Player, 'money' | 'businesses' | 'flags'>;
    profile: AcquisitionProfile;
    amount: number;
    expenseType: 'DILIGENCE' | 'OFFER';
    language?: GameLanguage;
}): AcquisitionFundingOption[] => {
    const safeAmount = Math.max(0, amount);
    const cases = getAcquisitionCases(player);
    const priorStudioFundedCases = cases.filter(acquisitionCase => (
        acquisitionCase.diligence?.funding.source === 'STUDIO'
        || acquisitionCase.offer?.funding.source === 'STUDIO'
    )).length;
    const personalBalance = Math.max(0, player.money || 0);
    const options: AcquisitionFundingOption[] = [{
        source: 'PERSONAL',
        label: t(language, 'services.studioAcquisition.funding.personal.label'),
        balance: personalBalance,
        remainingBalance: personalBalance - safeAmount,
        affordable: personalBalance >= safeAmount,
        complianceRisk: 0,
        complianceBand: 'ROUTINE',
        taxTreatment: t(language, 'services.studioAcquisition.funding.personal.taxTreatment'),
        unavailableReason: personalBalance >= safeAmount ? undefined : t(language, 'services.studioAcquisition.funding.personal.unavailable'),
    }];

    const studios = (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE');
    for (const business of studios) {
        const balance = Math.max(0, business.balance || 0);
        const complianceRisk = calculateStudioComplianceRisk({
            business,
            profile,
            amount: safeAmount,
            expenseType,
            priorStudioFundedCases,
        });
        options.push({
            source: 'STUDIO',
            businessId: business.id,
            label: t(language, 'services.studioAcquisition.funding.studio.label', { studio: business.name }),
            balance,
            remainingBalance: balance - safeAmount,
            affordable: balance >= safeAmount,
            complianceRisk,
            complianceBand: getComplianceBand(complianceRisk),
            taxTreatment: t(language, 'services.studioAcquisition.funding.studio.taxTreatment'),
            unavailableReason: balance >= safeAmount ? undefined : t(language, 'services.studioAcquisition.funding.studio.unavailable'),
        });
    }
    return options;
};

const buildDiligenceReport = (
    player: Pick<Player, 'id'>,
    profile: AcquisitionProfile,
): AcquisitionDiligenceReport => {
    const hash = stableHash(`${player.id}:${profile.id}:diligence`);
    const debtFactor = 0.88 + ((hash % 29) / 100);
    const riskFactor = 0.025 + (((hash >>> 5) % 14) / 100);
    const distressMultiplier = profile.acquisitionState === 'DISTRESSED' || profile.acquisitionState === 'AUCTION_EXPECTED'
        ? 1.7
        : 1;
    const verifiedDebt = roundMoney(Math.max(0, profile.debt * debtFactor));
    const hiddenLiabilities = roundMoney(profile.valuation * riskFactor * distressMultiplier);
    const expectedAnnualIncome = roundMoney(Math.max(
        profile.profitability * (0.92 + (((hash >>> 10) % 19) / 100)),
        profile.valuation * 0.015,
    ));
    const adjustedEnterpriseValue = roundMoney(Math.max(
        profile.valuation * 0.35,
        profile.valuation + profile.capital - verifiedDebt - hiddenLiabilities,
    ));
    const obligations = [
        profile.keyTalent.length > 0 ? `${profile.keyTalent.length} key talent commitments` : 'No material talent guarantees',
        profile.facilities.length > 1 ? `${profile.facilities.length} facility and lease obligations` : 'Limited facility obligations',
        profile.rightsCount > 3 ? `${profile.rightsCount} rights packages requiring continuity review` : 'Standard catalog continuity clauses',
    ];
    const primaryRisk = hiddenLiabilities > profile.valuation * 0.12
        ? 'Hidden liabilities materially weaken the headline valuation.'
        : profile.profitability < 0
            ? 'The company requires a profitability turnaround.'
            : verifiedDebt > profile.capital * 2
                ? 'Debt service may constrain the first post-deal slate.'
                : 'Execution risk is concentrated in catalog and talent retention.';

    return {
        verifiedDebt,
        hiddenLiabilities,
        obligations,
        adjustedEnterpriseValue,
        expectedAnnualIncome,
        confidence: 76 + ((hash >>> 16) % 19),
        recommendedLow: roundMoney(adjustedEnterpriseValue * 0.9),
        recommendedHigh: roundMoney(adjustedEnterpriseValue * 1.08),
        primaryRisk,
    };
};

const resolveFundingOption = (
    options: AcquisitionFundingOption[],
    funding: AcquisitionFundingSelection,
) => options.find(option => (
    option.source === funding.source
    && (funding.source === 'PERSONAL' || option.businessId === funding.businessId)
));

const deductImmediateExpense = (
    player: Player,
    amount: number,
    funding: AcquisitionFundingSelection,
): Player => {
    if (funding.source === 'PERSONAL') return { ...player, money: player.money - amount };
    return {
        ...player,
        businesses: player.businesses.map(business => (
            business.id === funding.businessId
                ? { ...business, balance: business.balance - amount }
                : business
        )),
    };
};

const getFinalAcquisitionPrice = (acquisitionCase: AcquisitionCase): number => roundMoney(
    acquisitionCase.sellerResponse?.agreedAmount
    || acquisitionCase.sellerResponse?.counterAmount
    || acquisitionCase.offer?.amount
    || 0,
);

const getSigningLiabilities = (
    acquisitionCase: AcquisitionCase,
    profile: AcquisitionProfile,
) => ({
    verifiedDebt: acquisitionCase.diligence?.report.verifiedDebt ?? Math.max(0, profile.debt || 0),
    hiddenLiabilities: acquisitionCase.diligence?.report.hiddenLiabilities ?? roundMoney(Math.max(0, profile.valuation || 0) * 0.035),
    expectedAnnualIncome: acquisitionCase.diligence?.report.expectedAnnualIncome ?? roundMoney(Math.max(
        profile.profitability || 0,
        Math.max(0, profile.valuation || 0) * 0.02,
    )),
});

const getAcquiredStudioStaffWeeklySalary = (weeklyRevenue: number, index: number): number => {
    const scaleAllowance = Math.min(1_200_000, Math.max(0, weeklyRevenue) * 0.006);
    return roundMoney(650_000 + scaleAllowance + (index * 75_000));
};

const buildAcquiredStudioStaff = (profile: AcquisitionProfile, weeklyRevenue: number): BusinessStaff[] => (
    profile.keyTalent.length
        ? profile.keyTalent
        : [{ name: 'Transition Leadership', role: 'Studio Management' }]
).slice(0, 6).map((talent, index) => ({
    id: `${profile.id}_staff_${index + 1}`,
    name: talent.name,
    role: talent.role,
    skill: clamp(Math.round((profile.reputation || 55) + 8 - (index * 4)), 45, 96),
    salary: getAcquiredStudioStaffWeeklySalary(weeklyRevenue, index),
    morale: clamp(62 + Math.round((profile.reputation || 55) / 6), 55, 88),
}));

const buildAcquiredStudioBusiness = ({
    player,
    profile,
    closing,
}: {
    player: Player;
    profile: AcquisitionProfile;
    closing: NonNullable<AcquisitionCase['closing']>;
}): Business => {
    const studioState = createDefaultStudioState(player.currentWeek);
    const acquisitionPortfolio = buildStudioAcquisitionPortfolio({ player, profile });
    const inheritedRights = buildPortfolioOwnedRights({
        portfolio: acquisitionPortfolio,
        studioName: profile.name,
    });
    const inheritedFacilities = deriveAcquiredStudioFacilities({
        valuation: profile.valuation,
        reputation: profile.reputation,
        facilityLabels: acquisitionPortfolio.facilityLabels,
        facilitiesEstimated: acquisitionPortfolio.facilitiesEstimated,
    });
    const resolvedRights = [
        ...(profile.rightsHighlights || []),
        ...(profile.catalog || []).map(project => project.title),
    ].filter((title, index, titles) => title && titles.indexOf(title) === index).slice(0, 12);
    const weeklyRevenue = roundMoney(Math.max(0, closing.expectedAnnualIncome / 52));
    // Acquisition debt is tracked and serviced by the dedicated debt ledger.
    // Do not bake it into the studio operating statement as a second expense.
    const weeklyExpenses = roundMoney(weeklyRevenue * 0.72);
    const weeklyProfit = roundMoney(weeklyRevenue - weeklyExpenses);
    const reputation = clamp(Math.round(profile.reputation || 50), 0, 100);

    return {
        id: profile.id,
        name: profile.name,
        type: 'PRODUCTION_HOUSE',
        subtype: profile.valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
        logo: '🎬',
        color: 'bg-amber-500',
        foundedWeek: player.currentWeek,
        balance: Math.max(0, profile.capital || 0),
        isActive: true,
        config: {
            quality: reputation >= 82 ? 'LUXURY' : reputation >= 66 ? 'PREMIUM' : 'STANDARD',
            pricing: 'MARKET',
            marketing: 'MEDIUM',
            marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
            theme: profile.archetype,
            productionType: 'Acquired Studio',
            amenities: profile.facilities.slice(0, 4),
        },
        stats: {
            weeklyRevenue,
            weeklyExpenses,
            weeklyProfit,
            lifetimeRevenue: Math.max(0, (profile.catalog || []).reduce((sum, project) => sum + (project.revenue || 0), 0)),
            valuation: Math.max(0, profile.valuation || 0),
            brandHealth: reputation,
            customerSatisfaction: clamp(reputation + Math.round((profile.hits - profile.flops) * 3), 20, 100),
            riskLevel: clamp(Math.round(((closing.verifiedDebt + closing.hiddenLiabilities) / Math.max(profile.valuation, 1)) * 100), 5, 95),
            hype: clamp(35 + (profile.hits * 5) - (profile.flops * 4), 10, 100),
            studioMomentum: clamp(50 + (profile.hits * 6) - (profile.flops * 8), 5, 100),
            investorConfidence: clamp(55 + Math.round((closing.expectedAnnualIncome / Math.max(profile.valuation, 1)) * 220), 10, 100),
            recentHitStreak: Math.max(0, profile.hits || 0),
            recentFlopStreak: Math.max(0, profile.flops || 0),
            recentReleaseOutcomes: (profile.catalog || []).map(project => project.outcome).slice(0, 6),
            processedReleaseOutcomeIds: (profile.catalog || []).map(project => project.id).slice(0, 12),
            locations: Math.max(1, profile.facilities.length || 1),
        },
        staff: buildAcquiredStudioStaff(profile, weeklyRevenue),
        products: [],
        hiringPool: [],
        lastHiringRefreshWeek: player.currentWeek,
        history: [{ week: player.currentWeek, profit: weeklyProfit }],
        studioState: {
            ...studioState,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            acquiredWeek: player.currentWeek,
            acquiredYear: player.age,
            acquisitionPortfolio,
            purchasedIPTitles: resolvedRights,
            ownedRights: inheritedRights,
            departments: inheritedFacilities.departments,
            equipment: inheritedFacilities.equipment,
            financeLedger: [{
                id: `studio_acquisition_${profile.id}_${player.currentWeek}`,
                week: player.currentWeek,
                year: player.age,
                amount: Math.max(0, profile.capital || 0),
                type: 'CAPITAL_INJECTION',
                label: `${profile.name} acquired with existing operating capital`,
            }],
            genreReputation: {
                ...studioState.genreReputation,
            },
        },
    };
};

export const runDueDiligence = ({
    player,
    profile,
    funding,
}: {
    player: Player;
    profile: AcquisitionProfile;
    funding: AcquisitionFundingSelection;
}): {
    success: boolean;
    player: Player;
    report?: AcquisitionDiligenceReport;
    reason?: 'INELIGIBLE' | 'ALREADY_PURCHASED' | 'FUNDING_SOURCE_UNAVAILABLE' | 'INSUFFICIENT_FUNDS';
} => {
    const language = getPlayerLanguage(player);
    const existingCase = getAcquisitionCase(player, profile.id);
    if (!getAcquisitionEligibility(profile, existingCase, player).canApproach && existingCase?.status !== 'DRAFT') {
        return { success: false, player, reason: 'INELIGIBLE' };
    }
    if (existingCase?.diligence?.status === 'COMPLETE') {
        return { success: false, player, report: existingCase.diligence.report, reason: 'ALREADY_PURCHASED' };
    }

    const fee = getRegulatorAdjustedDiligenceFee(player, calculateDueDiligenceFee(profile));
    const option = resolveFundingOption(getFundingOptions({
        player,
        profile,
        amount: fee,
        expenseType: 'DILIGENCE',
        language,
    }), funding);
    if (!option) return { success: false, player, reason: 'FUNDING_SOURCE_UNAVAILABLE' };
    if (!option.affordable) return { success: false, player, reason: 'INSUFFICIENT_FUNDS' };

    const report = buildDiligenceReport(player, profile);
    const chargedPlayer = deductImmediateExpense(player, fee, funding);
    const acquisitionCase: AcquisitionCase = {
        ...(existingCase || {
            studioId: profile.id,
            studioName: profile.name,
            acquisitionState: profile.acquisitionState,
            publicValuation: profile.valuation,
            approachedWeek: player.currentWeek,
            approachedYear: player.age,
            status: 'DRAFT' as const,
        }),
        diligence: {
            status: 'COMPLETE',
            fee,
            funding,
            complianceRisk: option.complianceRisk,
            report,
        },
    };
    const updatedPlayer = addAcquisitionMediaPulse(persistCase(chargedPlayer, acquisitionCase), {
        moment: 'DILIGENCE',
        studioId: profile.id,
        studioName: profile.name,
    });
    return {
        success: true,
        player: {
            ...updatedPlayer,
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `Due diligence completed for ${profile.name} at a cost of $${fee.toLocaleString()}.`,
                type: 'neutral' as const,
            }, ...(player.logs || [])].slice(0, 50),
        },
        report,
    };
};

const getAcquisitionBlockReferenceValue = ({
    profile,
    acquisitionCase,
    offerType,
}: {
    profile: Pick<ForbesStudioProfile, 'valuation'>;
    acquisitionCase?: AcquisitionCase;
    offerType: AcquisitionOfferType;
}): number => {
    const enterpriseValue = acquisitionCase?.diligence?.report.adjustedEnterpriseValue
        || acquisitionCase?.publicValuation
        || profile.valuation;
    if (
        offerType !== 'MINORITY'
        && acquisitionCase?.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
    ) {
        return Math.max(
            1,
            Math.round(enterpriseValue * (acquisitionCase.controlConversion.remainingPercent / 100)),
        );
    }
    return Math.max(1, enterpriseValue);
};

export const getOfferPresets = ({
    profile,
    acquisitionCase,
    minorityPercent = 25,
}: {
    profile: Pick<ForbesStudioProfile, 'valuation'>;
    acquisitionCase?: AcquisitionCase;
    minorityPercent?: number;
}): Record<AcquisitionOfferType, AcquisitionOfferPreset> => {
    const fullReferenceValue = getAcquisitionBlockReferenceValue({
        profile,
        acquisitionCase,
        offerType: 'FAIR',
    });
    const minorityReferenceValue = getAcquisitionBlockReferenceValue({
        profile,
        acquisitionCase,
        offerType: 'MINORITY',
    });
    const safeMinorityPercent = clamp(Math.round(minorityPercent), 5, 49);
    return {
        CONSERVATIVE: {
            type: 'CONSERVATIVE',
            amount: roundMoney(fullReferenceValue * 0.88),
            valueDeltaPercent: -12,
        },
        FAIR: {
            type: 'FAIR',
            amount: roundMoney(fullReferenceValue),
            valueDeltaPercent: 0,
        },
        AGGRESSIVE: {
            type: 'AGGRESSIVE',
            amount: roundMoney(fullReferenceValue * 1.15),
            valueDeltaPercent: 15,
        },
        MINORITY: {
            type: 'MINORITY',
            amount: roundMoney(minorityReferenceValue * (safeMinorityPercent / 100) * 1.05),
            percent: safeMinorityPercent,
            valueDeltaPercent: 5,
        },
    };
};

const getSellerResponsePosture = (comparisonRatio: number): SellerResponsePosture => {
    if (comparisonRatio < 0.5) return 'DISMISSIVE';
    if (comparisonRatio < 0.85) return 'TESTING';
    if (comparisonRatio <= 1.12) return 'SERIOUS';
    if (comparisonRatio <= 1.45) return 'COMPELLING';
    return 'OVERPAYING';
};

export const analyzeCustomOffer = ({
    profile,
    acquisitionCase,
    offerType,
    offerAmount,
    minorityPercent,
    existingOwnershipPercent = 0,
    strategicThreshold = 25,
}: {
    profile: Pick<ForbesStudioProfile, 'valuation'>;
    acquisitionCase?: AcquisitionCase;
    offerType: AcquisitionOfferType;
    offerAmount: number;
    minorityPercent?: number;
    existingOwnershipPercent?: number;
    strategicThreshold?: number;
}): CustomOfferAnalysis => {
    const referenceValue = getAcquisitionBlockReferenceValue({
        profile,
        acquisitionCase,
        offerType,
    });
    const normalizedAmount = Number.isFinite(offerAmount) ? Math.max(0, Math.round(offerAmount)) : 0;
    const normalizedMinorityPercent = Number.isFinite(minorityPercent)
        ? Math.round((minorityPercent || 0) * 100) / 100
        : 0;
    const isMinority = offerType === 'MINORITY';
    const impliedCompanyValue = isMinority && normalizedMinorityPercent > 0
        ? Math.round(normalizedAmount / (normalizedMinorityPercent / 100))
        : undefined;
    const comparisonValue = impliedCompanyValue ?? normalizedAmount;
    const comparisonRatio = referenceValue > 0 ? comparisonValue / referenceValue : 0;
    const valueDeltaPercent = Math.round((comparisonRatio - 1) * 1_000) / 10;
    const combinedOwnershipPercent = isMinority
        ? Math.round(Math.min(100, Math.max(0, existingOwnershipPercent) + normalizedMinorityPercent) * 100) / 100
        : undefined;
    const posture = getSellerResponsePosture(comparisonRatio);

    let validationReason: string | undefined;
    if (normalizedAmount <= 0) {
        validationReason = 'Enter an offer amount greater than zero.';
    } else if (isMinority && (normalizedMinorityPercent < 5 || normalizedMinorityPercent > 49)) {
        validationReason = 'Minority stakes must be between 5% and 49%.';
    } else if (comparisonRatio < 0.5) {
        validationReason = isMinority
            ? 'The implied company value must be at least 50% of the reference value.'
            : 'A full acquisition offer must be at least 50% of the reference value.';
    } else if (comparisonRatio > 2) {
        validationReason = isMinority
            ? 'The implied company value cannot exceed 200% of the reference value.'
            : 'A full acquisition offer cannot exceed 200% of the reference value.';
    }

    return {
        normalizedAmount,
        referenceValue,
        comparisonValue,
        valueDeltaPercent,
        impliedCompanyValue,
        combinedOwnershipPercent,
        reachesStrategicThreshold: isMinority
            ? (combinedOwnershipPercent || 0) >= strategicThreshold
            : undefined,
        posture,
        valid: !validationReason,
        validationReason,
    };
};

export const submitOpeningOffer = ({
    player,
    profile,
    offerType,
    offerAmount,
    minorityPercent = 25,
    funding,
    commitments = [],
}: {
    player: Player;
    profile: AcquisitionProfile;
    offerType: AcquisitionOfferType;
    offerAmount?: number;
    minorityPercent?: number;
    funding: AcquisitionFundingSelection;
    commitments?: AcquisitionCommitmentId[];
}): {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    reason?: 'PLAYER_OWNED' | 'NOT_FOR_SALE' | 'OFFER_ALREADY_SUBMITTED' | 'STREAMING_PLATFORM_RESERVED' | 'COOLDOWN_ACTIVE' | 'REGULATOR_REVIEW_ACTIVE' | 'OFFER_TYPE_UNAVAILABLE' | 'INVALID_OFFER_TERMS' | 'FUNDING_SOURCE_UNAVAILABLE' | 'INSUFFICIENT_FUNDS';
} => {
    const language = getPlayerLanguage(player);
    const existingCase = getAcquisitionCase(player, profile.id);
    const eligibility = getAcquisitionEligibility(profile, existingCase, player);
    if (!eligibility.canApproach) {
        return {
            success: false,
            player,
            reason: eligibility.reason,
        };
    }
    const regulatorControls = getRegulatorAcquisitionControls(player);
    if (regulatorControls.isOfferBlocked) {
        return { success: false, player, reason: 'REGULATOR_REVIEW_ACTIVE' };
    }
    if (!eligibility.allowedOfferTypes.includes(offerType)) {
        return { success: false, player, reason: 'OFFER_TYPE_UNAVAILABLE' };
    }

    const preset = getOfferPresets({ profile, acquisitionCase: existingCase, minorityPercent })[offerType];
    const customAnalysis = typeof offerAmount === 'number'
        ? analyzeCustomOffer({
            profile,
            acquisitionCase: existingCase,
            offerType,
            offerAmount,
            minorityPercent,
        })
        : undefined;
    if (customAnalysis && !customAnalysis.valid) {
        return { success: false, player, reason: 'INVALID_OFFER_TERMS' };
    }
    const resolvedOfferAmount = customAnalysis?.normalizedAmount ?? preset.amount;
    const option = resolveFundingOption(getFundingOptions({
        player,
        profile,
        amount: resolvedOfferAmount,
        expenseType: 'OFFER',
        language,
    }), funding);
    if (!option) return { success: false, player, reason: 'FUNDING_SOURCE_UNAVAILABLE' };
    if (!option.affordable) return { success: false, player, reason: 'INSUFFICIENT_FUNDS' };

    const startsNewNegotiationCycle = existingCase?.status === 'CLOSED';
    const nextOfferRound = startsNewNegotiationCycle
        ? 1
        : getAcquisitionOfferAttemptCount(existingCase) + 1;
    if (nextOfferRound > ACQUISITION_MAX_OFFER_ATTEMPTS) {
        return { success: false, player, reason: 'COOLDOWN_ACTIVE' };
    }

    const acquisitionCase: AcquisitionCase = {
        ...(existingCase || {
            studioId: profile.id,
            studioName: profile.name,
            acquisitionState: profile.acquisitionState,
            publicValuation: profile.valuation,
            approachedWeek: player.currentWeek,
            approachedYear: player.age,
            status: 'DRAFT' as const,
        }),
        approachedWeek: startsNewNegotiationCycle ? player.currentWeek : existingCase?.approachedWeek || player.currentWeek,
        approachedYear: startsNewNegotiationCycle ? player.age : existingCase?.approachedYear || player.age,
        status: 'OFFER_SUBMITTED',
        reapproachAfterWeek: undefined,
        reapproachAfterYear: undefined,
        offer: {
            type: offerType,
            amount: resolvedOfferAmount,
            minorityPercent: offerType === 'MINORITY' ? preset.percent : undefined,
            funding,
            complianceRisk: option.complianceRisk,
            complianceBand: option.complianceBand,
            commitments: normalizeCommitments(commitments),
            submittedWeek: player.currentWeek,
            submittedYear: player.age,
            round: nextOfferRound,
        },
        sellerResponse: undefined,
        // A revised file needs a fresh board reveal, never the previous response scene.
        presentation: undefined,
    };
    const updatedPlayer = addAcquisitionMediaPulse(persistCase(player, acquisitionCase), {
        moment: 'OFFER_SUBMITTED',
        studioId: profile.id,
        studioName: profile.name,
        amount: resolvedOfferAmount,
        round: acquisitionCase.offer.round,
    });
    return {
        success: true,
        acquisitionCase,
        player: {
            ...updatedPlayer,
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `Opening ${offerType.toLowerCase()} offer submitted to ${profile.name}: $${resolvedOfferAmount.toLocaleString()}.`,
                type: 'neutral' as const,
            }, ...(player.logs || [])].slice(0, 50),
        },
    };
};

const getOfferComparisonValue = (acquisitionCase: AcquisitionCase): number => {
    const enterpriseValue = acquisitionCase.diligence?.report.adjustedEnterpriseValue || acquisitionCase.publicValuation;
    if (acquisitionCase.offer?.type !== 'MINORITY') {
        return acquisitionCase.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
            ? Math.max(1, Math.round(enterpriseValue * (acquisitionCase.controlConversion.remainingPercent / 100)))
            : Math.max(1, enterpriseValue);
    }
    return Math.max(1, enterpriseValue * ((acquisitionCase.offer.minorityPercent || 25) / 100));
};

const RIVAL_BID_MAX_ROUNDS = ACQUISITION_MAX_OFFER_ATTEMPTS;
const RIVAL_STUDIO_NAMES = [
    'Northstar Studios',
    'Crownline Pictures',
    'Monarch Media',
    'Atlas Entertainment',
    'Silvergate Films',
    'Redwood Motion Group',
];

const getRivalBid = (
    acquisitionCase: AcquisitionCase,
    comparisonValue: number,
    offerRatio: number,
) => {
    const offer = acquisitionCase.offer!;
    const round = Math.max(1, offer.round || 1);
    if (round >= RIVAL_BID_MAX_ROUNDS) return undefined;
    if (offerRatio < 0.72 || offerRatio >= 1.08) return undefined;

    const pressureBonus = acquisitionCase.acquisitionState === 'AUCTION_EXPECTED'
        ? 0.12
        : acquisitionCase.acquisitionState === 'DISTRESSED'
            ? 0.08
            : acquisitionCase.acquisitionState === 'OPEN_TO_OFFERS'
                ? 0.04
                : 0;
    const hash = stableHash(`${acquisitionCase.studioId}:${acquisitionCase.studioName}:rival:${round}`);
    const shouldEnter = acquisitionCase.acquisitionState === 'AUCTION_EXPECTED'
        || (hash % 100) < Math.round((0.18 + pressureBonus) * 100);
    if (!shouldEnter) return undefined;

    const rivalStudioName = RIVAL_STUDIO_NAMES[hash % RIVAL_STUDIO_NAMES.length];
    const roundPressure = 1 + (round * 0.025);
    const rivalAmount = roundMoney(Math.max(
        offer.amount * (1.04 + ((hash >>> 4) % 7) / 100),
        comparisonValue * (0.98 + pressureBonus) * roundPressure,
    ));
    const requiredBidAmount = roundMoney(rivalAmount * 1.02);
    return {
        rivalStudioName,
        rivalAmount,
        requiredBidAmount,
        maxRounds: RIVAL_BID_MAX_ROUNDS,
    };
};

const getSellerResponse = (acquisitionCase: AcquisitionCase, player: Pick<Player, 'currentWeek' | 'age' | 'settings'>): AcquisitionSellerResponse => {
    const language = getPlayerLanguage(player);
    const offer = acquisitionCase.offer!;
    const comparisonValue = getOfferComparisonValue(acquisitionCase);
    const offerRatio = offer.amount / comparisonValue;
    const commitmentBonus = getCommitmentLeverageBonus(offer.commitments);
    const effectiveOfferRatio = offerRatio + commitmentBonus;
    const round = Math.max(1, offer.round || 1);

    if (effectiveOfferRatio >= 1.08) {
        return {
            decision: 'ACCEPTED' as const,
            agreedAmount: offer.amount,
            round,
            respondedWeek: player.currentWeek,
            respondedYear: player.age,
            summary: t(language, 'services.studioAcquisition.seller.summary.accepted', {
                studio: acquisitionCase.studioName,
                round: getAcquisitionRoundLabel(language, round),
            }),
        };
    }
    const rivalBid = getRivalBid(acquisitionCase, comparisonValue, effectiveOfferRatio);
    if (rivalBid) {
        return {
            decision: 'RIVAL_BID' as const,
            ...rivalBid,
            round,
            respondedWeek: player.currentWeek,
            respondedYear: player.age,
            summary: t(language, 'services.studioAcquisition.seller.summary.rivalBid', {
                rival: rivalBid.rivalStudioName,
                amount: formatAcquisitionMoney(rivalBid.rivalAmount),
            }),
        };
    }
    if (round >= RIVAL_BID_MAX_ROUNDS) {
        return {
            decision: 'REJECTED' as const,
            round,
            respondedWeek: player.currentWeek,
            respondedYear: player.age,
            summary: t(language, 'services.studioAcquisition.seller.summary.rejectedRival', {
                studio: acquisitionCase.studioName,
            }),
        };
    }
    if (effectiveOfferRatio >= 0.82) {
        const counterAmount = roundMoney(Math.max(offer.amount * 1.03, comparisonValue * Math.max(0.98, 1.08 - commitmentBonus)));
        return {
            decision: 'COUNTERED' as const,
            counterAmount,
            round,
            respondedWeek: player.currentWeek,
            respondedYear: player.age,
            summary: t(language, 'services.studioAcquisition.seller.summary.countered', {
                studio: acquisitionCase.studioName,
            }),
        };
    }
    return {
        decision: 'REJECTED' as const,
        round,
        respondedWeek: player.currentWeek,
        respondedYear: player.age,
        summary: t(language, 'services.studioAcquisition.seller.summary.rejectedLow', {
            studio: acquisitionCase.studioName,
        }),
    };
};

export const resolveStudioAcquisitionResponses = (player: Player): Player => {
    const cases = getAcquisitionCases(player);
    let updatedPlayer = player;

    // Migrate old final declines into the same explicit cooldown used by new
    // negotiations. This blocks stale inbox messages from reviving them.
    cases
        .filter(acquisitionCase => (
            acquisitionCase.status === 'REJECTED'
            && getAcquisitionOfferAttemptCount(acquisitionCase) >= ACQUISITION_MAX_OFFER_ATTEMPTS
        ))
        .forEach(acquisitionCase => {
            const reapproachAt = getGameWeekAfter(
                updatedPlayer.age,
                updatedPlayer.currentWeek,
                ACQUISITION_REAPPROACH_COOLDOWN_WEEKS,
            );
            updatedPlayer = persistCase(updatedPlayer, {
                ...acquisitionCase,
                status: 'CLOSED',
                reapproachAfterWeek: reapproachAt.week,
                reapproachAfterYear: reapproachAt.year,
                sellerResponse: acquisitionCase.sellerResponse
                    ? {
                        ...acquisitionCase.sellerResponse,
                        summary: `${acquisitionCase.studioName} declined the final offer and closed discussions for now. You can make a fresh approach in ${ACQUISITION_REAPPROACH_COOLDOWN_WEEKS} in-game weeks.`,
                    }
                    : acquisitionCase.sellerResponse,
            });
        });

    // Old builds could persist a rival bid after the three-round limit. Put the
    // case back into the final board-response lane rather than making players
    // continue an impossible fourth round.
    cases
        .filter(acquisitionCase => (
            acquisitionCase.status === 'RIVAL_BID'
            && acquisitionCase.offer
            && Math.max(1, acquisitionCase.sellerResponse?.round || acquisitionCase.offer.round || 1) > RIVAL_BID_MAX_ROUNDS
        ))
        .forEach(acquisitionCase => {
            updatedPlayer = persistCase(updatedPlayer, {
                ...acquisitionCase,
                status: 'OFFER_SUBMITTED',
                offer: {
                    ...acquisitionCase.offer!,
                    round: RIVAL_BID_MAX_ROUNDS,
                    submittedWeek: updatedPlayer.currentWeek,
                    submittedYear: updatedPlayer.age,
                },
                sellerResponse: undefined,
                presentation: undefined,
            });
        });

    const responses = getAcquisitionCases(updatedPlayer)
        .filter(acquisitionCase => acquisitionCase.status === 'OFFER_SUBMITTED' && acquisitionCase.offer);
    if (responses.length === 0) return updatedPlayer;

    responses.forEach(acquisitionCase => {
        const language = getPlayerLanguage(updatedPlayer);
        const sellerResponse = getSellerResponse(acquisitionCase, updatedPlayer);
        const closesNegotiation = sellerResponse.decision === 'REJECTED'
            && getAcquisitionOfferAttemptCount(acquisitionCase) >= ACQUISITION_MAX_OFFER_ATTEMPTS;
        const reapproachAt = closesNegotiation
            ? getGameWeekAfter(
                updatedPlayer.age,
                updatedPlayer.currentWeek,
                ACQUISITION_REAPPROACH_COOLDOWN_WEEKS,
            )
            : undefined;
        const resolvedResponse = closesNegotiation
            ? {
                ...sellerResponse,
                summary: `${acquisitionCase.studioName} declined the third offer and closed discussions for now. You can try again in ${ACQUISITION_REAPPROACH_COOLDOWN_WEEKS} in-game weeks.`,
            }
            : sellerResponse;
        const nextStatus: AcquisitionCaseStatus = closesNegotiation ? 'CLOSED' : sellerResponse.decision;
        const updatedCase: AcquisitionCase = {
            ...acquisitionCase,
            status: nextStatus,
            reapproachAfterWeek: reapproachAt?.week,
            reapproachAfterYear: reapproachAt?.year,
            sellerResponse: resolvedResponse,
            // Every board answer is a new decision. Clear the old ceremony
            // checkpoint so reopening the file cannot skip or strand this result.
            presentation: undefined,
        };
        updatedPlayer = addAcquisitionMediaPulse(persistCase(updatedPlayer, updatedCase), {
            moment: sellerResponse.decision,
            studioId: acquisitionCase.studioId,
            studioName: acquisitionCase.studioName,
            amount: resolvedResponse.agreedAmount || resolvedResponse.counterAmount || resolvedResponse.rivalAmount || acquisitionCase.offer?.amount,
            rivalStudioName: resolvedResponse.rivalStudioName,
            round: resolvedResponse.round,
        });
        const subject = t(language, `services.studioAcquisition.inbox.subject.${sellerResponse.decision}`, { studio: acquisitionCase.studioName });
        const messageId = `studio_acquisition_${acquisitionCase.studioId}_r${sellerResponse.round}_${sellerResponse.decision}`;
        updatedPlayer = {
            ...updatedPlayer,
            inbox: (updatedPlayer.inbox || []).some(message => message.id === messageId)
                ? (updatedPlayer.inbox || [])
                : [{
                    id: messageId,
                    sender: t(language, 'services.studioAcquisition.inbox.sender'),
                    subject,
                    text: resolvedResponse.summary,
                    type: 'STUDIO_ACQUISITION' as const,
                    data: {
                        studioId: acquisitionCase.studioId,
                        studioName: acquisitionCase.studioName,
                        decision: sellerResponse.decision,
                        counterAmount: sellerResponse.counterAmount,
                        agreedAmount: sellerResponse.agreedAmount,
                        rivalStudioName: sellerResponse.rivalStudioName,
                        rivalAmount: sellerResponse.rivalAmount,
                        requiredBidAmount: sellerResponse.requiredBidAmount,
                    },
                    isRead: false,
                    weekSent: updatedPlayer.currentWeek,
                    expiresIn: ACQUISITION_INBOX_NOTICE_WEEKS,
                }, ...(updatedPlayer.inbox || [])],
            logs: [{
                week: updatedPlayer.currentWeek,
                year: updatedPlayer.age,
                message: t(language, 'services.studioAcquisition.log.response', {
                    studio: acquisitionCase.studioName,
                    decision: getAcquisitionDecisionLabel(language, sellerResponse.decision),
                }),
                type: sellerResponse.decision === 'ACCEPTED' ? 'positive' as const : sellerResponse.decision === 'REJECTED' ? 'negative' as const : 'neutral' as const,
            }, ...(updatedPlayer.logs || [])].slice(0, 50),
        };
    });
    return updatedPlayer;
};

export const acceptAcquisitionCounter = ({
    player,
    studioId,
}: {
    player: Player;
    studioId: string;
}): { success: boolean; player: Player; reason?: 'COUNTER_NOT_AVAILABLE' } => {
    const language = getPlayerLanguage(player);
    const acquisitionCase = getAcquisitionCase(player, studioId);
    if (acquisitionCase?.status !== 'COUNTERED' || !acquisitionCase.sellerResponse?.counterAmount) {
        return { success: false, player, reason: 'COUNTER_NOT_AVAILABLE' };
    }
    const acceptedCase: AcquisitionCase = {
            ...acquisitionCase,
            status: 'ACCEPTED',
            sellerResponse: {
                ...acquisitionCase.sellerResponse,
                decision: 'ACCEPTED',
                agreedAmount: acquisitionCase.sellerResponse.counterAmount,
                summary: t(language, 'services.studioAcquisition.seller.summary.counterAccepted', {
                    studio: acquisitionCase.studioName,
                }),
            },
            presentation: undefined,
        };
    const casePlayer = addAcquisitionMediaPulse(persistCase(player, acceptedCase), {
        moment: 'COUNTER_ACCEPTED',
        studioId,
        studioName: acquisitionCase.studioName,
        amount: acquisitionCase.sellerResponse.counterAmount,
        round: acquisitionCase.sellerResponse.round,
    });
    return {
        success: true,
        player: {
            ...casePlayer,
            inbox: (casePlayer.inbox || []).map(message => (
                message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === studioId
                    ? {
                        ...message,
                        sender: t(language, 'services.studioAcquisition.inbox.sender'),
                        subject: t(language, 'services.studioAcquisition.inbox.subject.COUNTER_ACCEPTED', { studio: acquisitionCase.studioName }),
                        text: acceptedCase.sellerResponse!.summary,
                        data: {
                            ...message.data,
                            decision: 'ACCEPTED',
                            agreedAmount: acquisitionCase.sellerResponse!.counterAmount,
                        },
                    }
                    : message
            )),
        },
    };
};

export const reviseAcquisitionOffer = ({
    player,
    studioId,
    offerAmount,
}: {
    player: Player;
    studioId: string;
    offerAmount: number;
}): { success: boolean; player: Player; reason?: 'COUNTER_NOT_AVAILABLE' | 'INVALID_OFFER_TERMS' } => {
    const acquisitionCase = getAcquisitionCase(player, studioId);
    if (acquisitionCase?.status !== 'COUNTERED' || !acquisitionCase.offer) {
        return { success: false, player, reason: 'COUNTER_NOT_AVAILABLE' };
    }
    const normalizedAmount = roundMoney(offerAmount);
    const comparisonValue = getOfferComparisonValue(acquisitionCase);
    if (normalizedAmount < comparisonValue * 0.5 || normalizedAmount > comparisonValue * 2) {
        return { success: false, player, reason: 'INVALID_OFFER_TERMS' };
    }
    const nextCase: AcquisitionCase = {
        ...acquisitionCase,
        status: 'OFFER_SUBMITTED',
        offer: {
            ...acquisitionCase.offer,
            amount: normalizedAmount,
            submittedWeek: player.currentWeek,
            submittedYear: player.age,
            // Seller back-and-forth has the same finite board-round limit as
            // rival auctions, so it cannot grow into an endless negotiation.
            round: Math.min(
                RIVAL_BID_MAX_ROUNDS,
                (acquisitionCase.sellerResponse?.round || acquisitionCase.offer.round || 1) + 1,
            ),
        },
        sellerResponse: undefined,
        presentation: undefined,
    };
    return {
        success: true,
        player: addAcquisitionMediaPulse(persistCase(player, nextCase), {
            moment: 'REVISED_OFFER',
            studioId,
            studioName: acquisitionCase.studioName,
            amount: normalizedAmount,
            round: nextCase.offer?.round,
        }),
    };
};

export const beatAcquisitionRivalBid = ({
    player,
    studioId,
    offerAmount,
}: {
    player: Player;
    studioId: string;
    offerAmount: number;
}): { success: boolean; player: Player; reason?: 'RIVAL_BID_NOT_AVAILABLE' | 'BID_BELOW_REQUIRED' | 'INVALID_OFFER_TERMS' } => {
    const acquisitionCase = getAcquisitionCase(player, studioId);
    const requiredBidAmount = acquisitionCase?.sellerResponse?.requiredBidAmount;
    if (acquisitionCase?.status !== 'RIVAL_BID' || !acquisitionCase.offer || !requiredBidAmount) {
        return { success: false, player, reason: 'RIVAL_BID_NOT_AVAILABLE' };
    }
    const normalizedAmount = roundMoney(offerAmount);
    if (normalizedAmount < requiredBidAmount) {
        return { success: false, player, reason: 'BID_BELOW_REQUIRED' };
    }
    const comparisonValue = getOfferComparisonValue(acquisitionCase);
    if (normalizedAmount > comparisonValue * 2) {
        return { success: false, player, reason: 'INVALID_OFFER_TERMS' };
    }
    const nextCase: AcquisitionCase = {
        ...acquisitionCase,
        status: 'OFFER_SUBMITTED',
        offer: {
            ...acquisitionCase.offer,
            amount: normalizedAmount,
            submittedWeek: player.currentWeek,
            submittedYear: player.age,
            // The next board answer is terminal at the cap. This also rescues
            // stale Round 4 / 3 cases when a player chooses to beat the bid.
            round: Math.min(
                RIVAL_BID_MAX_ROUNDS,
                (acquisitionCase.sellerResponse?.round || acquisitionCase.offer.round || 1) + 1,
            ),
        },
        sellerResponse: undefined,
        presentation: undefined,
    };
    return {
        success: true,
        player: addAcquisitionMediaPulse(persistCase(player, nextCase), {
            moment: 'RIVAL_BEAT',
            studioId,
            studioName: acquisitionCase.studioName,
            amount: normalizedAmount,
            rivalStudioName: acquisitionCase.sellerResponse?.rivalStudioName,
            round: nextCase.offer?.round,
        }),
    };
};

export const completeStudioAcquisition = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}): {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    acquiredBusiness?: Business;
    reason?: 'CASE_NOT_ACCEPTED' | 'MINORITY_NOT_OWNERSHIP' | 'FUNDING_SOURCE_UNAVAILABLE' | 'INSUFFICIENT_FUNDS' | 'ALREADY_OWNED';
} => {
    const language = getPlayerLanguage(player);
    const acquisitionCase = getAcquisitionCase(player, profile.id);
    if (!acquisitionCase || acquisitionCase.status !== 'ACCEPTED' || !acquisitionCase.offer) {
        return { success: false, player, reason: 'CASE_NOT_ACCEPTED' };
    }
    if (acquisitionCase.offer.type === 'MINORITY') {
        return { success: false, player, acquisitionCase, reason: 'MINORITY_NOT_OWNERSHIP' };
    }
    if (player.businesses.some(business => business.id === profile.id)) {
        return { success: false, player, acquisitionCase, reason: 'ALREADY_OWNED' };
    }

    const finalPrice = getFinalAcquisitionPrice(acquisitionCase);
    const funding = acquisitionCase.offer.funding;
    const fundingOption = resolveFundingOption(getFundingOptions({
        player,
        profile,
        amount: finalPrice,
        expenseType: 'OFFER',
        language,
    }), funding);
    if (!fundingOption) return { success: false, player, acquisitionCase, reason: 'FUNDING_SOURCE_UNAVAILABLE' };
    if (!fundingOption.affordable) return { success: false, player, acquisitionCase, reason: 'INSUFFICIENT_FUNDS' };

    const liabilities = getSigningLiabilities(acquisitionCase, profile);
    const closing: NonNullable<AcquisitionCase['closing']> = {
        finalPrice,
        acquiredBusinessId: profile.id,
        signedWeek: player.currentWeek,
        signedYear: player.age,
        funding,
        ...liabilities,
        outcome: 'FULL_BUYOUT',
        assetSummary: acquisitionCase.controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
            ? `${acquisitionCase.controlConversion.existingPercent.toFixed(1)}% existing stake credited; ${acquisitionCase.controlConversion.remainingPercent.toFixed(1)}% acquired for ${formatAcquisitionMoney(finalPrice)}`
            : t(language, 'services.studioAcquisition.closing.assetSummary.full', {
                facilities: profile.facilities.length,
                rights: profile.rightsCount,
                talent: profile.keyTalent.length,
            }),
    };
    const chargedPlayer = deductImmediateExpense(player, finalPrice, funding);
    const controlConversion = acquisitionCase.controlConversion;
    const convertedPlayer: Player = controlConversion?.kind === 'PRIVATE_STAKE_TO_CONTROL'
        ? {
            ...chargedPlayer,
            flags: {
                ...chargedPlayer.flags,
                companyEquityPositions: getCompanyEquityPositions(chargedPlayer)
                    .filter(position => position.studioId !== profile.id),
                privateEquityConversionHistory: [{
                    id: `private_control_${profile.id}_${player.age}_${player.currentWeek}`,
                    studioId: profile.id,
                    studioName: profile.name,
                    existingPercent: controlConversion.existingPercent,
                    remainingPercent: controlConversion.remainingPercent,
                    existingCostBasis: controlConversion.existingCostBasis,
                    existingPositionValue: controlConversion.existingPositionValue,
                    remainingPurchasePrice: finalPrice,
                    totalCashBasis: controlConversion.existingCostBasis + finalPrice,
                    week: player.currentWeek,
                    year: player.age,
                }, ...(Array.isArray(chargedPlayer.flags?.privateEquityConversionHistory)
                    ? chargedPlayer.flags.privateEquityConversionHistory
                    : [])].slice(0, 20),
            },
        }
        : chargedPlayer;
    const acquiredBusiness = buildAcquiredStudioBusiness({ player: convertedPlayer, profile, closing });
    const acquiredCase: AcquisitionCase = {
        ...acquisitionCase,
        status: 'ACQUIRED',
        closing,
    };
    const withBusiness: Player = {
        ...convertedPlayer,
        businesses: [
            ...convertedPlayer.businesses.filter(business => business.id !== profile.id),
            acquiredBusiness,
        ],
    };
    const withCase = persistCase(withBusiness, acquiredCase);
    const messageId = `studio_acquisition_${profile.id}_acquired`;
    const existingInbox = (withCase.inbox || []).map(message => (
        message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === profile.id
            ? {
                ...message,
                sender: t(language, 'services.studioAcquisition.inbox.sender'),
                subject: t(language, 'services.studioAcquisition.inbox.subject.ACQUIRED', { studio: profile.name }),
                text: t(language, 'services.studioAcquisition.inbox.text.acquired', { studio: profile.name }),
                data: {
                    ...message.data,
                    decision: 'ACQUIRED',
                    agreedAmount: finalPrice,
                    acquiredBusinessId: acquiredBusiness.id,
                    expectedAnnualIncome: liabilities.expectedAnnualIncome,
                    verifiedDebt: liabilities.verifiedDebt,
                    hiddenLiabilities: liabilities.hiddenLiabilities,
                },
                isRead: false,
            }
            : message
    ));
    const hasExistingAcquisitionMessage = existingInbox.some(message => message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === profile.id);

    const playerWithClose = {
        ...withCase,
        inbox: hasExistingAcquisitionMessage
            ? existingInbox
            : [{
                id: messageId,
                sender: t(language, 'services.studioAcquisition.inbox.sender'),
                subject: getAcquisitionInboxSubject(language, 'ACQUIRED', profile.name),
                text: t(language, 'services.studioAcquisition.inbox.text.acquired', { studio: profile.name }),
                type: 'STUDIO_ACQUISITION' as const,
                data: {
                    studioId: profile.id,
                    studioName: profile.name,
                    decision: 'ACQUIRED',
                    agreedAmount: finalPrice,
                    acquiredBusinessId: acquiredBusiness.id,
                    expectedAnnualIncome: liabilities.expectedAnnualIncome,
                    verifiedDebt: liabilities.verifiedDebt,
                    hiddenLiabilities: liabilities.hiddenLiabilities,
                },
                isRead: false,
                weekSent: player.currentWeek,
            }, ...(withCase.inbox || [])],
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: t(language, 'services.studioAcquisition.log.acquired', {
                studio: profile.name,
                amount: formatAcquisitionMoney(finalPrice),
            }),
            type: 'positive' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };

    return {
        success: true,
        acquisitionCase: acquiredCase,
        acquiredBusiness,
        player: addAcquisitionMediaPulse(playerWithClose, {
            moment: 'ACQUIRED',
            studioId: profile.id,
            studioName: profile.name,
            amount: finalPrice,
            round: acquisitionCase.offer.round,
        }),
    };
};

export const completeStockControlAcquisition = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}): {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    acquiredBusiness?: Business;
    reason?: 'CONTROL_NOT_READY' | 'ALREADY_OWNED' | 'STREAMING_PLATFORM_RESERVED';
} => {
    const language = getPlayerLanguage(player);
    const existingCase = getAcquisitionCase(player, profile.id);
    if ((player.businesses || []).some(business => business.id === profile.id) || profile.isPlayerOwned) {
        return { success: false, player, acquisitionCase: existingCase, reason: 'ALREADY_OWNED' };
    }
    if (isStreamingPlatformStudio(profile)) {
        return { success: false, player, acquisitionCase: existingCase, reason: 'STREAMING_PLATFORM_RESERVED' };
    }

    const companyPosition = getCompanyPosition(player, profile);
    if (profile.acquisitionState !== 'PUBLICLY_TRADED' || companyPosition.ownershipPercent < 50) {
        return { success: false, player, acquisitionCase: existingCase, reason: 'CONTROL_NOT_READY' };
    }

    const hiddenLiabilities = roundMoney(Math.max(0, profile.valuation || 0) * 0.02);
    const verifiedDebt = roundMoney(Math.max(0, profile.debt || 0));
    const expectedAnnualIncome = roundMoney(Math.max(profile.profitability || 0, (profile.valuation || 0) * 0.018));
    const closing: NonNullable<AcquisitionCase['closing']> = {
        finalPrice: 0,
        acquiredBusinessId: profile.id,
        signedWeek: player.currentWeek,
        signedYear: player.age,
        funding: { source: 'PERSONAL' },
        verifiedDebt,
        hiddenLiabilities,
        expectedAnnualIncome,
        outcome: 'CONTROL',
        assetSummary: t(language, 'services.studioAcquisition.closing.assetSummary.stockControl', {
            facilities: profile.facilities.length,
            rights: profile.rightsCount,
        }),
    };
    const acquiredBusiness = buildAcquiredStudioBusiness({ player, profile, closing });
    const acquiredCase: AcquisitionCase = {
        ...(existingCase || {
            studioId: profile.id,
            studioName: profile.name,
            acquisitionState: profile.acquisitionState,
            publicValuation: profile.valuation,
            approachedWeek: player.currentWeek,
            approachedYear: player.age,
            status: 'DRAFT' as const,
        }),
        status: 'ACQUIRED',
        offer: undefined,
        sellerResponse: undefined,
        closing,
    };
    const withBusiness: Player = {
        ...player,
        businesses: [
            ...(player.businesses || []).filter(business => business.id !== profile.id),
            acquiredBusiness,
        ],
        pendingEvents: (player.pendingEvents || []).filter(event => !(
            event.data?.stockDecisionType === 'TAKEOVER_CONTROL'
            && (
                event.data?.relatedStudioId === profile.id
                || (companyPosition.linkedStockId && event.data?.stockId === companyPosition.linkedStockId)
            )
        )),
    };
    const withCase = persistCase(withBusiness, acquiredCase);
    const messageId = `studio_acquisition_${profile.id}_stock_control_acquired`;
    const playerWithClose: Player = {
        ...withCase,
        inbox: [{
            id: messageId,
            sender: t(language, 'services.studioAcquisition.inbox.sender'),
            subject: t(language, 'services.studioAcquisition.inbox.subject.STOCK_CONTROL_ACQUIRED', { studio: profile.name }),
            text: t(language, 'services.studioAcquisition.inbox.text.stockControlAcquired', {
                studio: profile.name,
                ownership: companyPosition.ownershipPercent.toFixed(1),
            }),
            type: 'STUDIO_ACQUISITION' as const,
            data: {
                studioId: profile.id,
                studioName: profile.name,
                decision: 'ACQUIRED',
                agreedAmount: 0,
                stockControl: true,
                acquiredBusinessId: acquiredBusiness.id,
                expectedAnnualIncome,
                verifiedDebt,
                hiddenLiabilities,
            },
            isRead: false,
            weekSent: player.currentWeek,
        }, ...(withCase.inbox || []).filter(message => !(message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === profile.id))],
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: t(language, 'services.studioAcquisition.log.stockControlAcquired', {
                studio: profile.name,
                ownership: companyPosition.ownershipPercent.toFixed(1),
            }),
            type: 'positive' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };

    return {
        success: true,
        acquisitionCase: acquiredCase,
        acquiredBusiness,
        player: addAcquisitionMediaPulse(playerWithClose, {
            moment: 'ACQUIRED',
            studioId: profile.id,
            studioName: profile.name,
            amount: 0,
            round: player.currentWeek,
        }),
    };
};

const completeMinorityStudioInvestment = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}): {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    reason?: 'CASE_NOT_ACCEPTED' | 'FUNDING_SOURCE_UNAVAILABLE' | 'INSUFFICIENT_FUNDS' | 'ALREADY_OWNED';
} => {
    const acquisitionCase = getAcquisitionCase(player, profile.id);
    if (!acquisitionCase || acquisitionCase.status !== 'ACCEPTED' || acquisitionCase.offer?.type !== 'MINORITY') {
        return { success: false, player, acquisitionCase, reason: 'CASE_NOT_ACCEPTED' };
    }
    if ((player.businesses || []).some(business => business.id === profile.id) || profile.isPlayerOwned) {
        return { success: false, player, acquisitionCase, reason: 'ALREADY_OWNED' };
    }

    const finalPrice = getFinalAcquisitionPrice(acquisitionCase);
    const funding = acquisitionCase.offer.funding;
    const fundingOption = resolveFundingOption(getFundingOptions({
        player,
        profile,
        amount: finalPrice,
        expenseType: 'OFFER',
        language: getPlayerLanguage(player),
    }), funding);
    if (!fundingOption) return { success: false, player, acquisitionCase, reason: 'FUNDING_SOURCE_UNAVAILABLE' };
    if (!fundingOption.affordable) return { success: false, player, acquisitionCase, reason: 'INSUFFICIENT_FUNDS' };

    const purchasedPercent = clamp(acquisitionCase.offer.minorityPercent || 25, 5, 49);
    const previousPositions = getCompanyEquityPositions(player);
    const existingPercent = previousPositions
        .filter(position => position.studioId === profile.id)
        .reduce((sum, position) => sum + position.percent, 0);
    const nextPosition = {
        studioId: profile.id,
        studioName: profile.name,
        percent: Math.min(49, existingPercent + purchasedPercent),
        investedAmount: previousPositions
            .filter(position => position.studioId === profile.id)
            .reduce((sum, position) => sum + Math.max(0, position.investedAmount || 0), finalPrice),
        acquiredWeek: player.currentWeek,
        acquiredYear: player.age,
        entryCompanyValuation: Math.max(1, profile.valuation || Math.round(finalPrice / (purchasedPercent / 100))),
        currentCompanyValuation: Math.max(1, profile.valuation || Math.round(finalPrice / (purchasedPercent / 100))),
        annualProfitEstimate: Math.round(Number(profile.profitability || 0)),
        lastReviewAbsoluteWeek: ((Math.max(1, player.age) - 1) * 52) + Math.max(0, player.currentWeek - 1),
        lastQuarterChangePercent: 0,
        lastQuarterOutcome: 'VALUE_REVIEW' as const,
        lastQuarterSummary: 'Position opened. The first private market review is due next quarter.',
        lifetimeDistributions: 0,
        nextExitEligibleAbsoluteWeek: ((Math.max(1, player.age) - 1) * 52) + Math.max(0, player.currentWeek - 1) + 26,
    };
    const chargedPlayer = deductImmediateExpense(player, finalPrice, funding);
    const closing: NonNullable<AcquisitionCase['closing']> = {
        finalPrice,
        signedWeek: player.currentWeek,
        signedYear: player.age,
        funding,
        verifiedDebt: 0,
        hiddenLiabilities: 0,
        expectedAnnualIncome: Math.round(Math.max(0, profile.profitability || 0) * (purchasedPercent / 100)),
        assetSummary: `${purchasedPercent.toFixed(1)}% strategic equity position`,
        outcome: 'MINORITY_STAKE',
    };
    const closedCase: AcquisitionCase = {
        ...acquisitionCase,
        status: 'ACQUIRED',
        closing,
    };
    const withPosition: Player = {
        ...chargedPlayer,
        flags: {
            ...chargedPlayer.flags,
            companyEquityPositions: [
                ...previousPositions.filter(position => position.studioId !== profile.id),
                nextPosition,
            ],
        },
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `Strategic stake secured: ${purchasedPercent.toFixed(1)}% of ${profile.name} for ${formatAcquisitionMoney(finalPrice)}.`,
            type: 'positive' as const,
        }, ...(chargedPlayer.logs || [])].slice(0, 50),
    };
    return {
        success: true,
        acquisitionCase: closedCase,
        player: persistCase(withPosition, closedCase),
    };
};

const completePublicTenderAcquisition = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}): {
    success: boolean;
    player: Player;
    acquisitionCase?: AcquisitionCase;
    acquiredBusiness?: Business;
    reason?: 'CASE_NOT_ACCEPTED' | 'CONTROL_NOT_READY' | 'STOCK_NOT_FOUND' | 'FUNDING_SOURCE_UNAVAILABLE' | 'INSUFFICIENT_FUNDS' | 'ALREADY_OWNED' | 'STREAMING_PLATFORM_RESERVED';
} => {
    const acquisitionCase = getAcquisitionCase(player, profile.id);
    const position = getCompanyPosition(player, profile);
    if (position.ownershipPercent >= 50) return completeStockControlAcquisition({ player, profile });
    if (!acquisitionCase || acquisitionCase.status !== 'ACCEPTED' || acquisitionCase.offer?.type !== 'MINORITY') {
        return { success: false, player, acquisitionCase, reason: 'CASE_NOT_ACCEPTED' };
    }
    const stock = (player.stocks || []).find(candidate => candidate.id === position.linkedStockId || candidate.relatedStudioId === profile.id);
    if (!stock) return { success: false, player, acquisitionCase, reason: 'STOCK_NOT_FOUND' };

    const outstandingShares = getStockOutstandingShares(stock);
    const stockControlTarget = Math.max(0, 50 - position.negotiatedPercent);
    const targetShares = Math.ceil(outstandingShares * (stockControlTarget / 100));
    const minimumSharesForControl = Math.max(0, targetShares - position.shares);
    const requestedTenderShares = Math.ceil(outstandingShares * (Math.max(0, acquisitionCase.offer.minorityPercent || 0) / 100));
    const sharesNeeded = Math.max(minimumSharesForControl, requestedTenderShares);
    if (sharesNeeded <= 0) return completeStockControlAcquisition({ player, profile });

    const quote = calculateStockTradeQuote(player, stock, sharesNeeded);
    const finalPrice = getFinalAcquisitionPrice(acquisitionCase);
    const funding = acquisitionCase.offer.funding;
    const fundingOption = resolveFundingOption(getFundingOptions({
        player,
        profile,
        amount: finalPrice,
        expenseType: 'OFFER',
        language: getPlayerLanguage(player),
    }), funding);
    if (!fundingOption) return { success: false, player, acquisitionCase, reason: 'FUNDING_SOURCE_UNAVAILABLE' };
    if (!fundingOption.affordable) return { success: false, player, acquisitionCase, reason: 'INSUFFICIENT_FUNDS' };

    // The accepted tender price is authoritative. The stock service still owns
    // share counts, ownership math, price impact, history, and portfolio cost.
    const tradeBase: Player = {
        ...player,
        money: Math.max(player.money, quote.estimatedValue) + quote.estimatedValue,
    };
    const tradeResult = executeStockTrade(tradeBase, stock.id, sharesNeeded);
    if (!tradeResult.success) {
        return { success: false, player, acquisitionCase, reason: 'CONTROL_NOT_READY' };
    }
    const chargedPlayer = deductImmediateExpense(player, finalPrice, funding);
    const tenderedPlayer: Player = {
        ...tradeResult.player,
        money: chargedPlayer.money,
        businesses: chargedPlayer.businesses,
        flags: chargedPlayer.flags,
        inbox: chargedPlayer.inbox,
        news: tradeResult.player.news,
        x: tradeResult.player.x,
    };
    const controlResult = completeStockControlAcquisition({ player: tenderedPlayer, profile });
    if (!controlResult.success || !controlResult.acquisitionCase?.closing) return controlResult;

    const closing = {
        ...controlResult.acquisitionCase.closing,
        finalPrice,
        funding,
        outcome: 'CONTROL' as const,
        assetSummary: `${position.ownershipPercent.toFixed(2)}% existing stake credited; ${quote.shares.toLocaleString()} ${stock.symbol} shares tendered for the remaining control block`,
    };
    const closedCase: AcquisitionCase = {
        ...controlResult.acquisitionCase,
        closing,
    };
    const completedPlayer = persistCase({
        ...controlResult.player,
        inbox: (controlResult.player.inbox || []).map(message => (
            message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === profile.id
                ? { ...message, data: { ...message.data, agreedAmount: finalPrice, stockControl: true } }
                : message
        )),
    }, closedCase);
    return {
        ...controlResult,
        acquisitionCase: closedCase,
        player: completedPlayer,
    };
};

export const completeAcquisitionTransaction = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionProfile;
}) => {
    const acquisitionCase = getAcquisitionCase(player, profile.id);
    let result;
    if (profile.acquisitionState === 'PUBLICLY_TRADED') {
        result = completePublicTenderAcquisition({ player, profile });
    } else if (acquisitionCase?.offer?.type === 'MINORITY') {
        result = completeMinorityStudioInvestment({ player, profile });
    } else {
        result = completeStudioAcquisition({ player, profile });
    }

    // New acquisitions must carry their debt ledger from the signing moment.
    // This keeps future deals on the normal debt path while legacy migrations
    // can safely preserve their historical balances.
    return result.success
        ? { ...result, player: syncAcquisitionDebtLedger(result.player, 'SIGNED') }
        : result;
};

export const walkAwayFromAcquisition = ({
    player,
    studioId,
}: {
    player: Player;
    studioId: string;
}): { success: boolean; player: Player; reason?: 'CASE_NOT_ACTIONABLE' } => {
    const acquisitionCase = getAcquisitionCase(player, studioId);
    if (!acquisitionCase || !['COUNTERED', 'RIVAL_BID', 'ACCEPTED', 'REJECTED'].includes(acquisitionCase.status)) {
        return { success: false, player, reason: 'CASE_NOT_ACTIONABLE' };
    }
    const reapproachAt = getGameWeekAfter(
        player.age,
        player.currentWeek,
        ACQUISITION_REAPPROACH_COOLDOWN_WEEKS,
    );
    return {
        success: true,
        player: addAcquisitionMediaPulse(persistCase(player, {
            ...acquisitionCase,
            status: 'CLOSED',
            reapproachAfterWeek: reapproachAt.week,
            reapproachAfterYear: reapproachAt.year,
        }), {
            moment: 'WALKED_AWAY',
            studioId,
            studioName: acquisitionCase.studioName,
            amount: acquisitionCase.sellerResponse?.counterAmount || acquisitionCase.sellerResponse?.rivalAmount || acquisitionCase.offer?.amount,
            rivalStudioName: acquisitionCase.sellerResponse?.rivalStudioName,
            round: acquisitionCase.sellerResponse?.round || acquisitionCase.offer?.round,
        }),
    };
};
