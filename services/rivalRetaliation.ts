import type { LifeEvent, LifeEventImpactResult, Message, NewsItem, Player, ScheduledEvent, XPost } from '../types';
import type { AcquisitionCase } from './studioAcquisition';
import { queueAcquisitionPressureEvent } from './acquisitionEventCadence';
import { getWorldReactionState } from './worldReactions';

export type RivalRetaliationEventType = 'RIVAL_COUNTER_BID' | 'NEGATIVE_PRESS_LEAK' | 'DEAL_CHALLENGE' | 'DEFENSIVE_ALLIANCE';

export interface RivalActionRecord {
    id: string;
    type: RivalRetaliationEventType;
    studioId?: string;
    studioName?: string;
    rivalStudioName: string;
    week: number;
    year: number;
    summary: string;
}

export interface RivalRetaliationState {
    lastProcessedWeek: number;
    retaliationScore: number;
    activeCounterBidCount: number;
    negativePressHeat: number;
    dealChallengeWeeksRemaining: number;
    defensiveAllianceCount: number;
    pressureShieldWeeksRemaining: number;
    actions: RivalActionRecord[];
    lastRivalRetaliationChoiceWeek?: number;
    lastRivalRetaliationEventWeek?: number;
}

const RIVAL_NAMES = [
    'Northstar Studios',
    'Crownline Pictures',
    'Monarch Media',
    'Atlas Entertainment',
    'Silvergate Films',
    'Redwood Motion Group',
];

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);
const roundMoney = (value: number) => Math.max(0, Math.round(value / 10_000) * 10_000);
const stableHash = (value: string) => Array.from(value).reduce(
    (hash, character) => ((hash * 33) ^ character.charCodeAt(0)) >>> 0,
    5381,
);

const getPreviousState = (player: Pick<Player, 'flags'>): Partial<RivalRetaliationState> => (
    player.flags?.rivalRetaliationState || {}
);

const getAcquisitionCases = (player: Pick<Player, 'flags'>): AcquisitionCase[] => (
    Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : []
);

const getActiveDealCases = (player: Pick<Player, 'flags'>): AcquisitionCase[] => (
    getAcquisitionCases(player).filter(acquisitionCase => (
        Boolean(acquisitionCase.offer)
        && ['OFFER_SUBMITTED', 'COUNTERED', 'RIVAL_BID'].includes(acquisitionCase.status)
    ))
);

const getRivalName = (seed: string): string => RIVAL_NAMES[stableHash(seed) % RIVAL_NAMES.length];

export const getRivalRetaliationState = (player: Player): RivalRetaliationState => {
    const previous = getPreviousState(player);
    const worldState = player.flags?.worldReactionState || getWorldReactionState(player);
    const regulatorState = player.flags?.regulatorPressureState || {};
    const acquisitionCases = getAcquisitionCases(player);
    const activeDeals = getActiveDealCases(player);
    const acquiredCases = acquisitionCases.filter(acquisitionCase => acquisitionCase.status === 'ACQUIRED').length;
    const controlledStudios = (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE').length;
    const pressureShieldWeeksRemaining = Math.max(0, Math.round(previous.pressureShieldWeeksRemaining || 0));
    const shieldRelief = pressureShieldWeeksRemaining > 0 ? 18 : 0;
    const worldPressure = Math.max(0, Number(worldState.rivalRetaliationRisk || 0)) * 0.72;
    const regulatorPressure = Math.max(0, Number(regulatorState.pressureScore || 0)) * 0.16;
    const dealPressure = activeDeals.length * 12;
    const scalePressure = Math.max(0, controlledStudios - 1) * 5;
    const acquisitionPressure = acquiredCases * 4;
    const retaliationScore = round(clamp(worldPressure + regulatorPressure + dealPressure + scalePressure + acquisitionPressure - shieldRelief));

    return {
        lastProcessedWeek: previous.lastProcessedWeek || 0,
        retaliationScore,
        activeCounterBidCount: activeDeals.filter(acquisitionCase => acquisitionCase.status !== 'RIVAL_BID').length,
        negativePressHeat: round(clamp(retaliationScore * 0.58 + Number(player.heat || 0) * 0.3)),
        dealChallengeWeeksRemaining: Math.max(0, Math.round(previous.dealChallengeWeeksRemaining || 0)),
        defensiveAllianceCount: retaliationScore >= 65 ? Math.max(1, Math.round((retaliationScore - 52) / 18)) : 0,
        pressureShieldWeeksRemaining,
        actions: Array.isArray(previous.actions) ? previous.actions.slice(0, 12) : [],
        lastRivalRetaliationChoiceWeek: previous.lastRivalRetaliationChoiceWeek,
        lastRivalRetaliationEventWeek: previous.lastRivalRetaliationEventWeek,
    };
};

const persistRivalRetaliationState = (
    player: Player,
    updates: Partial<RivalRetaliationState>,
): Player => {
    const current = getRivalRetaliationState(player);
    const nextState: RivalRetaliationState = {
        ...current,
        ...updates,
        retaliationScore: clamp(updates.retaliationScore ?? current.retaliationScore),
        negativePressHeat: clamp(updates.negativePressHeat ?? current.negativePressHeat),
        dealChallengeWeeksRemaining: Math.max(0, Math.round(updates.dealChallengeWeeksRemaining ?? current.dealChallengeWeeksRemaining)),
        defensiveAllianceCount: Math.max(0, Math.round(updates.defensiveAllianceCount ?? current.defensiveAllianceCount)),
        pressureShieldWeeksRemaining: Math.max(0, Math.round(updates.pressureShieldWeeksRemaining ?? current.pressureShieldWeeksRemaining)),
        actions: Array.isArray(updates.actions) ? updates.actions.slice(0, 12) : current.actions.slice(0, 12),
        lastRivalRetaliationChoiceWeek: updates.lastRivalRetaliationChoiceWeek ?? player.currentWeek,
    };
    return {
        ...player,
        flags: {
            ...player.flags,
            rivalRetaliationState: nextState,
        },
    };
};

const makeAcquisitionMessage = (
    player: Player,
    acquisitionCase: AcquisitionCase,
    action: RivalActionRecord,
    requiredBidAmount: number,
): Message => ({
    id: `rival_retaliation_acq_${acquisitionCase.studioId}_${player.age}_${player.currentWeek}`,
    sender: 'Business Affairs',
    subject: `Rival Bid: ${acquisitionCase.studioName}`,
    text: action.summary,
    type: 'STUDIO_ACQUISITION',
    data: {
        studioId: acquisitionCase.studioId,
        studioName: acquisitionCase.studioName,
        decision: 'RIVAL_BID',
        rivalStudioName: action.rivalStudioName,
        rivalAmount: requiredBidAmount,
        requiredBidAmount,
    },
    isRead: false,
    weekSent: player.currentWeek,
});

const applyRivalCounterBid = (player: Player, state: RivalRetaliationState): { player: Player; action?: RivalActionRecord } => {
    if (state.retaliationScore < 58) return { player };
    const cases = getAcquisitionCases(player);
    const target = cases.find(acquisitionCase => (
        Boolean(acquisitionCase.offer)
        && acquisitionCase.status !== 'RIVAL_BID'
        && ['OFFER_SUBMITTED', 'COUNTERED'].includes(acquisitionCase.status)
    ));
    if (!target?.offer) return { player };

    const rivalStudioName = getRivalName(`${target.studioId}:${target.studioName}:${player.age}:${player.currentWeek}`);
    const currentAsk = target.sellerResponse?.counterAmount || target.offer.amount;
    const rivalAmount = roundMoney(Math.max(currentAsk * 1.06, target.offer.amount * 1.1));
    const requiredBidAmount = roundMoney(rivalAmount * 1.02);
    const action: RivalActionRecord = {
        id: `rival_action_counter_${target.studioId}_${player.age}_${player.currentWeek}`,
        type: 'RIVAL_COUNTER_BID',
        studioId: target.studioId,
        studioName: target.studioName,
        rivalStudioName,
        week: player.currentWeek,
        year: player.age,
        summary: `${rivalStudioName} entered the room and challenged your ${target.studioName} terms. You now need $${requiredBidAmount.toLocaleString()} to retake the lead.`,
    };
    const updatedCase: AcquisitionCase = {
        ...target,
        status: 'RIVAL_BID',
        sellerResponse: {
            decision: 'RIVAL_BID',
            rivalStudioName,
            rivalAmount,
            requiredBidAmount,
            maxRounds: 3,
            round: target.sellerResponse?.round || target.offer.round || 1,
            respondedWeek: player.currentWeek,
            respondedYear: player.age,
            summary: action.summary,
        },
    };
    const updatedCases = cases.map(acquisitionCase => (
        acquisitionCase.studioId === target.studioId ? updatedCase : acquisitionCase
    ));
    const message = makeAcquisitionMessage(player, updatedCase, action, requiredBidAmount);
    const nextPlayer: Player = {
        ...player,
        flags: {
            ...player.flags,
            studioAcquisitionCases: updatedCases,
        },
        inbox: (player.inbox || []).some(existing => existing.id === message.id)
            ? player.inbox
            : [message, ...(player.inbox || [])],
    };

    return { player: nextPlayer, action };
};

const makeChoiceImpact = (
    mode: 'QUIET' | 'PUBLIC' | 'GOLDEN',
): ((player: Player) => LifeEventImpactResult) => (player: Player) => {
    const state = getRivalRetaliationState(player);
    const effects = [];
    let updatedPlayer = player;
    let log = 'Rival Retaliation handled.';
    let logKey = 'life.event.rival.log.default';

    if (mode === 'QUIET') {
        const cost = Math.min(player.money, Math.max(12_000_000, state.defensiveAllianceCount * 8_000_000));
        updatedPlayer = persistRivalRetaliationState({
            ...player,
            money: player.money - cost,
        }, {
            retaliationScore: state.retaliationScore - 14,
            negativePressHeat: state.negativePressHeat - 10,
            dealChallengeWeeksRemaining: Math.max(0, state.dealChallengeWeeksRemaining - 1),
            pressureShieldWeeksRemaining: Math.max(state.pressureShieldWeeksRemaining, 6),
        });
        log = `Rival Retaliation: Quiet backchannels cooled the room.`;
        logKey = 'life.event.rival.log.quiet';
        effects.push({ label: 'Rival Pressure', labelKey: 'life.effect.rivalPressure', value: '-14', tone: 'positive' as const });
        effects.push({ label: 'Cost', labelKey: 'life.effect.cost', value: `$${cost.toLocaleString()}`, tone: 'negative' as const });
    } else if (mode === 'PUBLIC') {
        updatedPlayer = persistRivalRetaliationState({
            ...player,
            heat: clamp((player.heat || 0) + 5),
            stats: {
                ...player.stats,
                fame: clamp((player.stats.fame || 0) + 2),
                reputation: clamp((player.stats.reputation || 0) - 2),
            },
        }, {
            retaliationScore: state.retaliationScore + 8,
            negativePressHeat: state.negativePressHeat + 12,
            dealChallengeWeeksRemaining: state.dealChallengeWeeksRemaining + 1,
        });
        log = `Rival Retaliation: Your public countermove raised the stakes.`;
        logKey = 'life.event.rival.log.public';
        effects.push({ label: 'Fame', labelKey: 'life.effect.fame', value: '+2', tone: 'positive' as const });
        effects.push({ label: 'Heat', labelKey: 'life.effect.heat', value: '+5', tone: 'negative' as const });
    } else {
        const cost = Math.min(player.money, Math.max(28_000_000, state.defensiveAllianceCount * 14_000_000));
        updatedPlayer = persistRivalRetaliationState({
            ...player,
            money: player.money - cost,
            stats: {
                ...player.stats,
                reputation: clamp((player.stats.reputation || 0) + 2),
            },
        }, {
            retaliationScore: state.retaliationScore - 26,
            negativePressHeat: state.negativePressHeat - 20,
            dealChallengeWeeksRemaining: 0,
            pressureShieldWeeksRemaining: Math.max(state.pressureShieldWeeksRemaining, 10),
        });
        log = `Rival Retaliation: Advisors built a clean deal-defense room and neutralized the alliance pressure.`;
        logKey = 'life.event.rival.log.golden';
        effects.push({ label: 'Rival Pressure', labelKey: 'life.effect.rivalPressure', value: '-26', tone: 'positive' as const });
        effects.push({ label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Safest path', tone: 'positive' as const });
    }

    return { updatedPlayer, log, logKey, effects };
};

const getRivalRetaliationEventType = (state: RivalRetaliationState): RivalRetaliationEventType | null => {
    if (state.activeCounterBidCount > 0 && state.retaliationScore >= 58) return 'RIVAL_COUNTER_BID';
    if (state.defensiveAllianceCount > 0 && state.retaliationScore >= 62) return 'DEFENSIVE_ALLIANCE';
    if (state.negativePressHeat >= 48) return 'NEGATIVE_PRESS_LEAK';
    if (state.dealChallengeWeeksRemaining > 0 || state.retaliationScore >= 54) return 'DEAL_CHALLENGE';
    return null;
};

const createRivalLifeEvent = (
    player: Player,
    state: RivalRetaliationState,
    type: RivalRetaliationEventType,
): LifeEvent => ({
    id: `life_rival_retaliation_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
    type: 'CONFLICT',
    title: type === 'RIVAL_COUNTER_BID'
        ? 'Rivals Challenge Your Deal'
        : type === 'DEFENSIVE_ALLIANCE'
            ? 'Studios Form Defensive Alliance'
            : type === 'NEGATIVE_PRESS_LEAK'
                ? 'Negative Deal Story Leaks'
                : 'Rivals Challenge Your Expansion',
    titleKey: type === 'RIVAL_COUNTER_BID'
        ? 'life.event.rival.counterBid.title'
        : type === 'DEFENSIVE_ALLIANCE'
            ? 'life.event.rival.defensiveAlliance.title'
            : type === 'NEGATIVE_PRESS_LEAK'
                ? 'life.event.rival.negativeLeak.title'
                : 'life.event.rival.expansion.title',
    category: 'Rival Retaliation',
    description: `Competing studios are reacting to your expansion. Rival pressure is ${state.retaliationScore}%, with ${state.defensiveAllianceCount} defensive alliance signal${state.defensiveAllianceCount === 1 ? '' : 's'} in the market.`,
    descriptionKey: state.defensiveAllianceCount === 1 ? 'life.event.rival.description.singular' : 'life.event.rival.description.plural',
    textVars: { pressure: state.retaliationScore, alliances: state.defensiveAllianceCount },
    options: [
        {
            id: 'QUIET_BACKCHANNEL',
            label: 'Quiet Backchannel',
            labelKey: 'life.event.rival.quiet.label',
            description: 'Spend discreetly on bankers, lawyers, and relationship repair to cool the retaliation.',
            descriptionKey: 'life.event.rival.quiet.description',
            previewEffects: [
                { label: 'Rival Pressure', labelKey: 'life.effect.rivalPressure', value: '-14', tone: 'positive' },
                { label: 'Cost', labelKey: 'life.effect.cost', value: 'Deal defense', tone: 'negative' },
            ],
            impact: makeChoiceImpact('QUIET'),
        },
        {
            id: 'PUBLIC_COUNTERMOVE',
            label: 'Public Countermove',
            labelKey: 'life.event.rival.public.label',
            description: 'Push back in public and show rivals you will not slow down.',
            descriptionKey: 'life.event.rival.public.description',
            previewEffects: [
                { label: 'Fame', labelKey: 'life.effect.fame', value: '+2', tone: 'positive' },
                { label: 'Heat', labelKey: 'life.effect.heat', value: '+5', tone: 'negative' },
            ],
            impact: makeChoiceImpact('PUBLIC'),
        },
        {
            id: 'GOLDEN_DEAL_DEFENSE',
            label: 'Clean Deal Defense Room',
            labelKey: 'life.event.rival.golden.label',
            description: 'Reward ad: advisors handle the safest response to rival alliances and leaks.',
            descriptionKey: 'life.event.rival.golden.description',
            isGolden: true,
            previewEffects: [
                { label: 'Rival Pressure', labelKey: 'life.effect.rivalPressure', value: '-26', tone: 'positive' },
                { label: 'Risk', labelKey: 'life.effect.risk', value: 'Safest path', tone: 'positive' },
            ],
            impact: makeChoiceImpact('GOLDEN'),
        },
    ],
});

const createRivalEvent = (
    player: Player,
    state: RivalRetaliationState,
): ScheduledEvent | null => {
    const type = getRivalRetaliationEventType(state);
    if (!type) return null;
    const lifeEvent = createRivalLifeEvent(player, state, type);
    return {
        id: `event_rival_retaliation_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        week: player.currentWeek,
        type: 'LIFE_EVENT',
        title: lifeEvent.title,
        description: lifeEvent.description,
        data: {
            rivalRetaliationEventType: type,
            lifeEvent,
        },
    };
};

const makeRivalNews = (player: Player, state: RivalRetaliationState, action?: RivalActionRecord): NewsItem => ({
    id: `news_rival_retaliation_${player.age}_${player.currentWeek}`,
    headline: action?.type === 'RIVAL_COUNTER_BID'
        ? `${action.rivalStudioName} challenges ${player.name}'s ${action.studioName} deal`
        : state.defensiveAllianceCount > 0
            ? `Rival studios quietly align against ${player.name}'s expansion`
            : `Negative deal chatter follows ${player.name}'s acquisition run`,
    subtext: action?.summary || `${state.retaliationScore}% rival pressure is creating leaks, deal challenges, and defensive positioning across the market.`,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: state.retaliationScore >= 65 ? 'HIGH' : 'MEDIUM',
});

const makeRivalPost = (player: Player, state: RivalRetaliationState, action?: RivalActionRecord): XPost => ({
    id: `x_rival_retaliation_${player.age}_${player.currentWeek}`,
    authorId: 'deal_room_wire',
    authorName: 'Deal Room Wire',
    authorHandle: '@dealroomwire',
    authorAvatar: 'DRW',
    content: action?.type === 'RIVAL_COUNTER_BID'
        ? `${action.rivalStudioName} just made ${player.name}'s ${action.studioName} deal more expensive. This market is getting sharp.`
        : `Rivals are not letting ${player.name}'s studio expansion move quietly. Expect leaks, alliances, and deal pressure.`,
    timestamp: Date.now(),
    likes: 2_200 + state.retaliationScore * 80,
    retweets: 320 + state.negativePressHeat * 16,
    replies: 180 + state.retaliationScore * 12,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    sentiment: state.retaliationScore >= 65 ? 'MESSY' : 'INDUSTRY',
});

export const processRivalRetaliation = (player: Player): Player => {
    const previousState = player.flags?.rivalRetaliationState as RivalRetaliationState | undefined;
    if (previousState?.lastProcessedWeek === player.currentWeek) {
        return {
            ...player,
            flags: {
                ...player.flags,
                rivalRetaliationState: previousState,
            },
        };
    }

    const state = getRivalRetaliationState(player);
    const withCounterBid = applyRivalCounterBid(player, state);
    const action = withCounterBid.action;
    const event = state.retaliationScore >= 44 ? createRivalEvent(withCounterBid.player, state) : null;
    const news = state.retaliationScore >= 40 ? makeRivalNews(withCounterBid.player, state, action) : undefined;
    const xPost = state.retaliationScore >= 40 ? makeRivalPost(withCounterBid.player, state, action) : undefined;
    const existingPendingEvents = Array.isArray(withCounterBid.player.pendingEvents) ? withCounterBid.player.pendingEvents : [];
    const cadence = queueAcquisitionPressureEvent(
        withCounterBid.player,
        existingPendingEvents,
        event,
        'RIVAL_RETALIATION',
        event?.data?.rivalRetaliationEventType,
        candidate => existingPendingEvents.some(pending => pending.id === candidate.id || pending.data?.rivalRetaliationEventType),
    );
    const nextState: RivalRetaliationState = {
        ...state,
        lastProcessedWeek: player.currentWeek,
        pressureShieldWeeksRemaining: Math.max(0, state.pressureShieldWeeksRemaining - 1),
        dealChallengeWeeksRemaining: state.retaliationScore >= 58
            ? Math.max(state.dealChallengeWeeksRemaining, 2)
            : Math.max(0, state.dealChallengeWeeksRemaining - 1),
        actions: action ? [action, ...state.actions].slice(0, 12) : state.actions,
        lastRivalRetaliationEventWeek: state.retaliationScore >= 44 ? player.currentWeek : state.lastRivalRetaliationEventWeek,
    };

    return {
        ...withCounterBid.player,
        flags: {
            ...cadence.flags,
            rivalRetaliationState: nextState,
        },
        news: news && !(withCounterBid.player.news || []).some(item => item.id === news.id)
            ? [news, ...(withCounterBid.player.news || [])].slice(0, 80)
            : withCounterBid.player.news,
        pendingEvents: cadence.pendingEvents,
        x: xPost
            ? {
                ...withCounterBid.player.x,
                feed: [xPost, ...(withCounterBid.player.x?.feed || []).filter(post => post.id !== xPost.id)].slice(0, 80),
            }
            : withCounterBid.player.x,
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `Rival Retaliation: ${state.retaliationScore}% pressure, ${state.defensiveAllianceCount} defensive alliance signal${state.defensiveAllianceCount === 1 ? '' : 's'}.`,
            type: state.retaliationScore >= 65 ? 'negative' as const : 'neutral' as const,
        }, ...(withCounterBid.player.logs || [])].slice(0, 50),
    };
};
