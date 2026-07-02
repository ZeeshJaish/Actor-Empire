import type { Business, NewsItem, Player, XPost } from '../types';
import type { AcquisitionCase } from './studioAcquisition';
import { getWorldReactionState, type WorldReactionState } from './worldReactions';

export type AcquisitionMarketMood = 'EUPHORIC' | 'CONFIDENT' | 'NERVOUS' | 'BACKLASH';

export interface AcquisitionMarketPulseState {
    lastProcessedWeek: number;
    marketMood: AcquisitionMarketMood;
    acquisitionStoryCount: number;
    fanSentiment: number;
    investorConfidenceDelta: number;
    franchiseValueDelta: number;
    processedCaseIds: string[];
    lastHeadlineIds: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const clampSigned = (value: number, min = -100, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);

const getPreviousState = (player: Pick<Player, 'flags'>): Partial<AcquisitionMarketPulseState> => (
    player.flags?.acquisitionMarketPulseState || {}
);

const getAcquisitionCases = (player: Pick<Player, 'flags'>): AcquisitionCase[] => (
    Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : []
);

const getClosedAcquisitionCases = (player: Pick<Player, 'flags'>): AcquisitionCase[] => (
    getAcquisitionCases(player).filter(acquisitionCase => (
        acquisitionCase.status === 'ACQUIRED'
        || acquisitionCase.status === 'CLOSED'
    ))
);

const isMajorCase = (acquisitionCase: AcquisitionCase): boolean => (
    (acquisitionCase.publicValuation || 0) >= 1_000_000_000
    || (acquisitionCase.closing?.expectedAnnualIncome || 0) >= 250_000_000
);

const hasFranchiseSignal = (acquisitionCase: AcquisitionCase): boolean => (
    /franchise|catalog|library|rights|universe|ip/i.test(acquisitionCase.closing?.assetSummary || '')
    || isMajorCase(acquisitionCase)
);

const getUnprocessedClosedCases = (player: Player): AcquisitionCase[] => {
    const previous = getPreviousState(player);
    const processed = new Set(Array.isArray(previous.processedCaseIds) ? previous.processedCaseIds : []);
    return getClosedAcquisitionCases(player).filter(acquisitionCase => !processed.has(acquisitionCase.studioId));
};

const getMarketMood = (
    fanSentiment: number,
    investorConfidenceDelta: number,
    worldState: WorldReactionState,
): AcquisitionMarketMood => {
    if (worldState.antiMonopolyPressure >= 70 || fanSentiment <= -20) return 'BACKLASH';
    if (investorConfidenceDelta < 0 || worldState.rivalRetaliationRisk >= 58) return 'NERVOUS';
    if (fanSentiment >= 28 && investorConfidenceDelta >= 2) return 'EUPHORIC';
    return 'CONFIDENT';
};

export const getAcquisitionMarketPulseState = (player: Player): AcquisitionMarketPulseState => {
    const previous = getPreviousState(player);
    const closedCases = getClosedAcquisitionCases(player);
    const unprocessedCases = getUnprocessedClosedCases(player);
    const worldState = player.flags?.worldReactionState || getWorldReactionState(player);
    const majorCount = unprocessedCases.filter(isMajorCase).length;
    const franchiseCount = unprocessedCases.filter(hasFranchiseSignal).length;
    const debtLoad = unprocessedCases.reduce((sum, acquisitionCase) => (
        sum
        + Math.max(0, acquisitionCase.closing?.verifiedDebt || 0)
        + Math.max(0, acquisitionCase.closing?.hiddenLiabilities || 0)
    ), 0);
    const expectedAnnualIncome = unprocessedCases.reduce((sum, acquisitionCase) => (
        sum + Math.max(0, acquisitionCase.closing?.expectedAnnualIncome || 0)
    ), 0);
    const debtBurden = expectedAnnualIncome > 0 ? debtLoad / expectedAnnualIncome : 0;
    const fanSentiment = round(clampSigned((franchiseCount * 18) + (majorCount * 8) - (Number(worldState.antiMonopolyPressure || 0) * 0.35)));
    const investorConfidenceDelta = round(clampSigned((majorCount * 3) + (expectedAnnualIncome / 1_000_000_000) - (debtBurden * 2.5) - (Number(worldState.valuationPressure || 0) * 0.08), -12, 12));
    const franchiseValueDelta = round(clampSigned((franchiseCount * 6) + (majorCount * 4) - (Number(worldState.antiMonopolyPressure || 0) * 0.05), -10, 30));
    const marketMood = getMarketMood(fanSentiment, investorConfidenceDelta, worldState as WorldReactionState);

    return {
        lastProcessedWeek: previous.lastProcessedWeek || 0,
        marketMood,
        acquisitionStoryCount: closedCases.length,
        fanSentiment,
        investorConfidenceDelta,
        franchiseValueDelta,
        processedCaseIds: Array.isArray(previous.processedCaseIds) ? previous.processedCaseIds : [],
        lastHeadlineIds: Array.isArray(previous.lastHeadlineIds) ? previous.lastHeadlineIds : [],
    };
};

const makeNewsItem = (
    id: string,
    player: Player,
    headline: string,
    subtext: string,
    impactLevel: NewsItem['impactLevel'],
): NewsItem => ({
    id,
    headline,
    subtext,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel,
});

export const makeAcquisitionNewsChain = (
    player: Player,
    state: AcquisitionMarketPulseState,
    cases: AcquisitionCase[],
): NewsItem[] => {
    if (!cases.length) return [];
    const lead = cases[0];
    const studioNames = cases.map(acquisitionCase => acquisitionCase.studioName).slice(0, 3).join(', ');
    const majorCount = cases.filter(isMajorCase).length;
    return [
        makeNewsItem(
            `news_acq_pulse_close_${player.age}_${player.currentWeek}`,
            player,
            `${player.name}'s acquisition run reshapes the studio map`,
            `${studioNames} ${cases.length === 1 ? 'is now' : 'are now'} part of the group. Analysts are watching integration, debt, and franchise strategy.`,
            majorCount > 0 ? 'HIGH' : 'MEDIUM',
        ),
        makeNewsItem(
            `news_acq_pulse_investor_${player.age}_${player.currentWeek}`,
            player,
            `Investors call the ${lead.studioName} deal ${state.marketMood.toLowerCase()}`,
            `Market mood: ${state.marketMood}. Investor confidence moved ${state.investorConfidenceDelta >= 0 ? '+' : ''}${state.investorConfidenceDelta}, while franchise value pressure moved ${state.franchiseValueDelta >= 0 ? '+' : ''}${state.franchiseValueDelta}.`,
            Math.abs(state.investorConfidenceDelta) >= 5 ? 'HIGH' : 'MEDIUM',
        ),
        makeNewsItem(
            `news_acq_pulse_franchise_${player.age}_${player.currentWeek}`,
            player,
            `Franchise value shifts after ${player.name}'s latest deal`,
            state.franchiseValueDelta >= 0
                ? `Fans are already debating which catalogs and banners should be revived first.`
                : `Fans are worried the new group may stretch its brands too thin.`,
            Math.abs(state.franchiseValueDelta) >= 10 ? 'HIGH' : 'MEDIUM',
        ),
    ];
};

const makeMarketPost = (
    player: Player,
    state: AcquisitionMarketPulseState,
    cases: AcquisitionCase[],
): XPost => {
    const lead = cases[0];
    return {
        id: `x_acq_market_pulse_${player.age}_${player.currentWeek}`,
        authorId: 'market_mood',
        authorName: 'Market Mood',
        authorHandle: '@marketmood',
        authorAvatar: 'MM',
        content: state.marketMood === 'BACKLASH'
            ? `Fans are split on ${player.name}'s ${lead.studioName} deal. Franchise upside is real, but the market is asking how big is too big.`
            : state.marketMood === 'NERVOUS'
                ? `The ${lead.studioName} deal has franchise upside, but investors want to see clean integration before celebrating.`
                : `Fans and investors are buzzing: ${player.name}'s ${lead.studioName} move could unlock a serious franchise run.`,
        timestamp: Date.now(),
        likes: 2_500 + Math.max(0, state.fanSentiment) * 120,
        retweets: 320 + Math.abs(state.franchiseValueDelta) * 40,
        replies: 220 + Math.abs(state.investorConfidenceDelta) * 55,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'FILM_OPINION',
        sentiment: state.marketMood === 'BACKLASH' || state.marketMood === 'NERVOUS' ? 'MESSY' : 'SUPPORTIVE',
    };
};

const applyBusinessPulse = (
    businesses: Business[],
    cases: AcquisitionCase[],
    state: AcquisitionMarketPulseState,
): Business[] => {
    const affectedIds = new Set(cases.map(acquisitionCase => acquisitionCase.closing?.acquiredBusinessId || acquisitionCase.studioId));
    const confidenceDelta = state.investorConfidenceDelta;
    const valuationMultiplier = 1 + (state.franchiseValueDelta * 0.0025) + (confidenceDelta * 0.0012);
    return businesses.map(business => {
        if (business.type !== 'PRODUCTION_HOUSE' || !affectedIds.has(business.id)) return business;
        return {
            ...business,
            stats: {
                ...business.stats,
                investorConfidence: clamp((business.stats.investorConfidence ?? 55) + confidenceDelta, 0, 100),
                studioMomentum: clamp((business.stats.studioMomentum ?? business.stats.hype ?? 55) + Math.max(-5, Math.min(8, state.franchiseValueDelta / 2)), 0, 100),
                valuation: Math.max(0, round((business.stats.valuation || 0) * valuationMultiplier)),
            },
        };
    });
};

export const processAcquisitionMarketPulse = (player: Player): Player => {
    const previousState = player.flags?.acquisitionMarketPulseState as AcquisitionMarketPulseState | undefined;
    if (previousState?.lastProcessedWeek === player.currentWeek) {
        return {
            ...player,
            flags: {
                ...player.flags,
                acquisitionMarketPulseState: previousState,
            },
        };
    }

    const cases = getUnprocessedClosedCases(player);
    const state = getAcquisitionMarketPulseState(player);
    if (!cases.length) {
        return {
            ...player,
            flags: {
                ...player.flags,
                acquisitionMarketPulseState: {
                    ...state,
                    lastProcessedWeek: player.currentWeek,
                },
            },
        };
    }

    const newsChain = makeAcquisitionNewsChain(player, state, cases);
    const xPost = makeMarketPost(player, state, cases);
    const processedCaseIds = Array.from(new Set([
        ...state.processedCaseIds,
        ...cases.map(acquisitionCase => acquisitionCase.studioId),
    ]));
    const worldState = (player.flags?.worldReactionState || getWorldReactionState(player)) as WorldReactionState;
    const nextWorldState: WorldReactionState = {
        ...worldState,
        franchiseValuePressure: clamp((worldState.franchiseValuePressure || 0) + Math.max(0, state.franchiseValueDelta), 0, 100),
        investorConfidence: clamp((worldState.investorConfidence || 0) + state.investorConfidenceDelta, 0, 100),
    };
    const nextState: AcquisitionMarketPulseState = {
        ...state,
        lastProcessedWeek: player.currentWeek,
        processedCaseIds,
        lastHeadlineIds: newsChain.map(item => item.id),
    };

    return {
        ...player,
        businesses: applyBusinessPulse(player.businesses || [], cases, state),
        flags: {
            ...player.flags,
            worldReactionState: nextWorldState,
            acquisitionMarketPulseState: nextState,
        },
        news: [
            ...newsChain.filter(item => !(player.news || []).some(existing => existing.id === item.id)),
            ...(player.news || []),
        ].slice(0, 80),
        x: {
            ...player.x,
            feed: [xPost, ...(player.x?.feed || []).filter(post => post.id !== xPost.id)].slice(0, 80),
        },
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `Acquisition Market Pulse: ${state.marketMood} mood, ${state.investorConfidenceDelta >= 0 ? '+' : ''}${state.investorConfidenceDelta} investor confidence, ${state.franchiseValueDelta >= 0 ? '+' : ''}${state.franchiseValueDelta} franchise value.`,
            type: state.marketMood === 'BACKLASH' || state.marketMood === 'NERVOUS' ? 'neutral' as const : 'positive' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };
};
