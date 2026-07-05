import type { Business, LifeEvent, LifeEventImpactResult, NewsItem, Player, ScheduledEvent, XPost } from '../types';
import { queueAcquisitionPressureEvent } from './acquisitionEventCadence';
import { getPlayerLanguage, t } from './i18n';

export type RegulatorPressureStatus = 'CLEAR' | 'MONITORING' | 'REVIEW' | 'MORATORIUM' | 'CONDUCT_AGREEMENT';
export type RegulatorPressureEventType = 'REGULATOR_REVIEW' | 'RIVAL_COMPLAINT' | 'CONSENT_DECREE';

export interface RegulatorPressureState {
    lastProcessedWeek: number;
    pressureScore: number;
    status: RegulatorPressureStatus;
    controlledStudioCount: number;
    controlledMajorStudioCount: number;
    controlledTakeoverCount: number;
    acquisitionMoratoriumWeeksRemaining: number;
    conductAgreementWeeksRemaining: number;
    acquisitionCostMultiplier: number;
    investorConfidencePenalty: number;
    reviewCount: number;
    finesPaidToDate: number;
    lastRegulatorChoiceWeek?: number;
    lastRegulatorNewsWeek?: number;
}

export interface RegulatorAcquisitionControls {
    pressureScore: number;
    status: RegulatorPressureStatus;
    acquisitionMoratoriumWeeksRemaining: number;
    acquisitionCostMultiplier: number;
    isOfferBlocked: boolean;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);
const roundMoney = (value: number) => Math.max(0, Math.round(value / 1_000) * 1_000);

const getProductionStudios = (player: Pick<Player, 'businesses'>) => (
    (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE')
);

const isMajorStudio = (business: Business) => (
    business.subtype === 'MAJOR_STUDIO'
    || (business.stats?.valuation || 0) >= 1_000_000_000
);

const getAcquiredCaseCount = (player: Pick<Player, 'flags'>) => (
    Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.filter((entry: any) => entry?.status === 'ACQUIRED').length
        : 0
);

const getPreviousState = (player: Pick<Player, 'flags'>): Partial<RegulatorPressureState> => (
    player.flags?.regulatorPressureState || {}
);

const getCostMultiplier = (pressureScore: number, conductAgreementWeeksRemaining: number) => {
    const rawMultiplier = pressureScore >= 80
        ? 1.35
        : pressureScore >= 65
            ? 1.25
            : pressureScore >= 45
                ? 1.15
                : 1;
    return conductAgreementWeeksRemaining > 0 ? Math.max(1.02, rawMultiplier - 0.1) : rawMultiplier;
};

const getStatus = (
    pressureScore: number,
    acquisitionMoratoriumWeeksRemaining: number,
    conductAgreementWeeksRemaining: number,
): RegulatorPressureStatus => {
    if (acquisitionMoratoriumWeeksRemaining > 0) return 'MORATORIUM';
    if (conductAgreementWeeksRemaining > 0) return 'CONDUCT_AGREEMENT';
    if (pressureScore >= 65) return 'REVIEW';
    if (pressureScore >= 35) return 'MONITORING';
    return 'CLEAR';
};

export const getRegulatorPressureState = (player: Player): RegulatorPressureState => {
    const previous = getPreviousState(player);
    const studios = getProductionStudios(player);
    const majorStudios = studios.filter(isMajorStudio);
    const controlledTakeoverCount = (player.stockTakeovers || []).filter(takeover => takeover.status === 'CONTROLLED').length;
    const acquiredCaseCount = getAcquiredCaseCount(player);
    const totalValuation = studios.reduce((sum, studio) => sum + Math.max(0, studio.stats?.valuation || 0), 0);
    const valuationPressure = Math.min(30, totalValuation / 10_000_000_000);
    const scalePressure = Math.max(0, studios.length - 2) * 12;
    const majorPressure = majorStudios.length * 11;
    const takeoverPressure = controlledTakeoverCount * 8;
    const acquisitionPressure = acquiredCaseCount * 5;
    const conductAgreementWeeksRemaining = Math.max(0, Math.round(previous.conductAgreementWeeksRemaining || 0));
    const conductRelief = conductAgreementWeeksRemaining > 0 ? 14 : 0;
    const pressureScore = round(clamp(scalePressure + majorPressure + takeoverPressure + acquisitionPressure + valuationPressure - conductRelief));
    const acquisitionMoratoriumWeeksRemaining = Math.max(0, Math.round(previous.acquisitionMoratoriumWeeksRemaining || 0));
    const status = getStatus(pressureScore, acquisitionMoratoriumWeeksRemaining, conductAgreementWeeksRemaining);

    return {
        lastProcessedWeek: previous.lastProcessedWeek || 0,
        pressureScore,
        status,
        controlledStudioCount: studios.length,
        controlledMajorStudioCount: majorStudios.length,
        controlledTakeoverCount,
        acquisitionMoratoriumWeeksRemaining,
        conductAgreementWeeksRemaining,
        acquisitionCostMultiplier: getCostMultiplier(pressureScore, conductAgreementWeeksRemaining),
        investorConfidencePenalty: pressureScore >= 70 ? 5 : pressureScore >= 50 ? 3 : pressureScore >= 35 ? 1 : 0,
        reviewCount: Math.max(0, Math.round(previous.reviewCount || 0)),
        finesPaidToDate: roundMoney(previous.finesPaidToDate || 0),
        lastRegulatorChoiceWeek: previous.lastRegulatorChoiceWeek,
        lastRegulatorNewsWeek: previous.lastRegulatorNewsWeek,
    };
};

export const getRegulatorAcquisitionControls = (player: Player): RegulatorAcquisitionControls => {
    const state = getRegulatorPressureState(player);
    return {
        pressureScore: state.pressureScore,
        status: state.status,
        acquisitionMoratoriumWeeksRemaining: state.acquisitionMoratoriumWeeksRemaining,
        acquisitionCostMultiplier: state.acquisitionCostMultiplier,
        isOfferBlocked: state.acquisitionMoratoriumWeeksRemaining > 0,
    };
};

export const getRegulatorAdjustedDiligenceFee = (player: Player, baseFee: number): number => (
    roundMoney(baseFee * getRegulatorAcquisitionControls(player).acquisitionCostMultiplier)
);

const updateRegulatorState = (
    player: Player,
    updates: Partial<RegulatorPressureState>,
): Player => {
    const current = getRegulatorPressureState(player);
    const nextState: RegulatorPressureState = {
        ...current,
        ...updates,
        pressureScore: clamp(updates.pressureScore ?? current.pressureScore),
        acquisitionMoratoriumWeeksRemaining: Math.max(0, Math.round(updates.acquisitionMoratoriumWeeksRemaining ?? current.acquisitionMoratoriumWeeksRemaining)),
        conductAgreementWeeksRemaining: Math.max(0, Math.round(updates.conductAgreementWeeksRemaining ?? current.conductAgreementWeeksRemaining)),
        finesPaidToDate: roundMoney(updates.finesPaidToDate ?? current.finesPaidToDate),
        acquisitionCostMultiplier: updates.acquisitionCostMultiplier ?? getCostMultiplier(updates.pressureScore ?? current.pressureScore, updates.conductAgreementWeeksRemaining ?? current.conductAgreementWeeksRemaining),
        lastRegulatorChoiceWeek: player.currentWeek,
    };
    nextState.status = getStatus(nextState.pressureScore, nextState.acquisitionMoratoriumWeeksRemaining, nextState.conductAgreementWeeksRemaining);
    return {
        ...player,
        flags: {
            ...player.flags,
            regulatorPressureState: nextState,
        },
    };
};

const makeImpact = (
    mode: 'COOPERATE' | 'FIGHT' | 'DIVEST' | 'GOLDEN',
): ((player: Player) => LifeEventImpactResult) => (player: Player) => {
    const language = getPlayerLanguage(player);
    const state = getRegulatorPressureState(player);
    let updatedPlayer = player;
    const effects = [];
    let log = t(language, 'life.event.regulator.log.default');
    let logKey = 'life.event.regulator.log.default';

    if (mode === 'COOPERATE') {
        const cost = Math.min(player.money, 25_000_000);
        updatedPlayer = updateRegulatorState({
            ...player,
            money: player.money - cost,
            stats: {
                ...player.stats,
                reputation: clamp((player.stats.reputation || 0) + 1),
            },
        }, {
            pressureScore: state.pressureScore - 12,
            acquisitionMoratoriumWeeksRemaining: Math.max(1, state.acquisitionMoratoriumWeeksRemaining - 1),
            conductAgreementWeeksRemaining: Math.max(state.conductAgreementWeeksRemaining, 8),
        });
        log = t(language, 'life.event.regulator.log.cooperate');
        logKey = 'life.event.regulator.log.cooperate';
        effects.push({ label: t(language, 'life.effect.regulatorPressure'), labelKey: 'life.effect.regulatorPressure', value: '-12', tone: 'positive' as const });
        effects.push({ label: t(language, 'life.effect.legalSpend'), labelKey: 'life.effect.legalSpend', value: `$${cost.toLocaleString()}`, tone: 'negative' as const });
    } else if (mode === 'FIGHT') {
        const fine = Math.min(player.money, 45_000_000);
        updatedPlayer = updateRegulatorState({
            ...player,
            money: player.money - fine,
            heat: clamp((player.heat || 0) + 6),
            stats: {
                ...player.stats,
                fame: clamp((player.stats.fame || 0) + 2),
                reputation: clamp((player.stats.reputation || 0) - 4),
            },
        }, {
            pressureScore: state.pressureScore + 8,
            acquisitionMoratoriumWeeksRemaining: state.acquisitionMoratoriumWeeksRemaining + 2,
            finesPaidToDate: state.finesPaidToDate + fine,
        });
        log = t(language, 'life.event.regulator.log.fight');
        logKey = 'life.event.regulator.log.fight';
        effects.push({ label: t(language, 'life.effect.fame'), labelKey: 'life.effect.fame', value: '+2', tone: 'positive' as const });
        effects.push({ label: t(language, 'life.effect.moratorium'), labelKey: 'life.effect.moratorium', value: t(language, 'services.regulatorPressure.value.weeks', { weeks: 2 }), valueKey: 'services.regulatorPressure.value.weeks', textVars: { weeks: 2 }, tone: 'negative' as const });
    } else if (mode === 'DIVEST') {
        updatedPlayer = updateRegulatorState({
            ...player,
            businesses: (player.businesses || []).map(business => business.type !== 'PRODUCTION_HOUSE'
                ? business
                : {
                    ...business,
                    stats: {
                        ...business.stats,
                        investorConfidence: clamp((business.stats?.investorConfidence ?? 55) + 2),
                    },
                }),
        }, {
            pressureScore: state.pressureScore - 18,
            acquisitionMoratoriumWeeksRemaining: 0,
            conductAgreementWeeksRemaining: Math.max(state.conductAgreementWeeksRemaining, 16),
        });
        log = t(language, 'life.event.regulator.log.limits');
        logKey = 'life.event.regulator.log.limits';
        effects.push({ label: t(language, 'life.effect.regulatorPressure'), labelKey: 'life.effect.regulatorPressure', value: '-18', tone: 'positive' as const });
        effects.push({ label: t(language, 'life.effect.acquisitions'), labelKey: 'life.effect.acquisitions', value: t(language, 'services.regulatorPressure.value.conductLimits'), valueKey: 'services.regulatorPressure.value.conductLimits', tone: 'negative' as const });
    } else {
        const cost = Math.min(player.money, 35_000_000);
        updatedPlayer = updateRegulatorState({
            ...player,
            money: player.money - cost,
            stats: {
                ...player.stats,
                reputation: clamp((player.stats.reputation || 0) + 3),
            },
        }, {
            pressureScore: state.pressureScore - 24,
            acquisitionMoratoriumWeeksRemaining: 0,
            conductAgreementWeeksRemaining: Math.max(state.conductAgreementWeeksRemaining, 10),
            acquisitionCostMultiplier: 1.05,
        });
        log = t(language, 'life.event.regulator.log.golden');
        logKey = 'life.event.regulator.log.golden';
        effects.push({ label: t(language, 'life.effect.regulatorPressure'), labelKey: 'life.effect.regulatorPressure', value: '-24', tone: 'positive' as const });
        effects.push({ label: t(language, 'life.effect.rewardAd'), labelKey: 'life.effect.rewardAd', value: t(language, 'services.regulatorPressure.value.safestPath'), valueKey: 'services.regulatorPressure.value.safestPath', tone: 'positive' as const });
    }

    return { updatedPlayer, log, logKey, effects };
};

const getRegulatorPressureEventType = (state: RegulatorPressureState): RegulatorPressureEventType | null => {
    if (state.pressureScore >= 65) return 'REGULATOR_REVIEW';
    if (state.controlledTakeoverCount >= 1 && state.pressureScore >= 50) return 'RIVAL_COMPLAINT';
    if (state.conductAgreementWeeksRemaining > 0 && state.pressureScore >= 45) return 'CONSENT_DECREE';
    return null;
};

const createRegulatorLifeEvent = (
    player: Player,
    state: RegulatorPressureState,
    type: RegulatorPressureEventType,
): LifeEvent => {
    const language = getPlayerLanguage(player);
    const titleKey = type === 'RIVAL_COMPLAINT' ? 'life.event.regulator.rivalComplaint.title' : 'life.event.regulator.review.title';
    const textVars = { controlled: state.controlledStudioCount, majors: state.controlledMajorStudioCount };
    return {
        id: `life_regulator_pressure_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        type: 'LEGAL',
        title: t(language, titleKey),
        titleKey,
        category: t(language, 'life.event.regulator.category'),
        description: t(language, 'life.event.regulator.description', textVars),
        descriptionKey: 'life.event.regulator.description',
        textVars,
        options: [
        {
            id: 'COOPERATE_WITH_REVIEW',
            label: t(language, 'life.event.regulator.cooperate.label'),
            labelKey: 'life.event.regulator.cooperate.label',
            description: t(language, 'life.event.regulator.cooperate.description'),
            descriptionKey: 'life.event.regulator.cooperate.description',
            previewEffects: [
                { label: t(language, 'life.effect.pressure'), labelKey: 'life.effect.pressure', value: '-12', tone: 'positive' },
                { label: t(language, 'life.effect.cost'), labelKey: 'life.effect.cost', value: t(language, 'services.regulatorPressure.value.legalSpend'), valueKey: 'services.regulatorPressure.value.legalSpend', tone: 'negative' },
            ],
            impact: makeImpact('COOPERATE'),
        },
        {
            id: 'FIGHT_REVIEW',
            label: t(language, 'life.event.regulator.fight.label'),
            labelKey: 'life.event.regulator.fight.label',
            description: t(language, 'life.event.regulator.fight.description'),
            descriptionKey: 'life.event.regulator.fight.description',
            previewEffects: [
                { label: t(language, 'life.effect.fame'), labelKey: 'life.effect.fame', value: '+2', tone: 'positive' },
                { label: t(language, 'life.effect.moratorium'), labelKey: 'life.effect.moratorium', value: t(language, 'services.regulatorPressure.value.weeks', { weeks: 2 }), valueKey: 'services.regulatorPressure.value.weeks', textVars: { weeks: 2 }, tone: 'negative' },
            ],
            impact: makeImpact('FIGHT'),
        },
        {
            id: 'VOLUNTARY_LIMITS',
            label: t(language, 'life.event.regulator.limits.label'),
            labelKey: 'life.event.regulator.limits.label',
            description: t(language, 'life.event.regulator.limits.description'),
            descriptionKey: 'life.event.regulator.limits.description',
            previewEffects: [
                { label: t(language, 'life.effect.pressure'), labelKey: 'life.effect.pressure', value: '-18', tone: 'positive' },
                { label: t(language, 'life.effect.deals'), labelKey: 'life.effect.deals', value: t(language, 'services.regulatorPressure.value.limits'), valueKey: 'services.regulatorPressure.value.limits', tone: 'negative' },
            ],
            impact: makeImpact('DIVEST'),
        },
        {
            id: 'GOLDEN_COMPLIANCE_FIREWALL',
            label: t(language, 'life.event.regulator.golden.label'),
            labelKey: 'life.event.regulator.golden.label',
            description: t(language, 'life.event.regulator.golden.description'),
            descriptionKey: 'life.event.regulator.golden.description',
            isGolden: true,
            previewEffects: [
                { label: t(language, 'life.effect.pressure'), labelKey: 'life.effect.pressure', value: '-24', tone: 'positive' },
                { label: t(language, 'life.effect.risk'), labelKey: 'life.effect.risk', value: t(language, 'services.regulatorPressure.value.safestPath'), valueKey: 'services.regulatorPressure.value.safestPath', tone: 'positive' },
            ],
            impact: makeImpact('GOLDEN'),
        },
        ],
    };
};

const createRegulatorEvent = (
    player: Player,
    state: RegulatorPressureState,
): ScheduledEvent | null => {
    const type = getRegulatorPressureEventType(state);
    if (!type) return null;
    const lifeEvent = createRegulatorLifeEvent(player, state, type);
    return {
        id: `event_regulator_pressure_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        week: player.currentWeek,
        type: 'LIFE_EVENT',
        title: lifeEvent.title,
        description: lifeEvent.description,
        data: {
            regulatorPressureEventType: type,
            lifeEvent,
        },
    };
};

const makeRegulatorNews = (player: Player, state: RegulatorPressureState, language: ReturnType<typeof getPlayerLanguage>): NewsItem => ({
    id: `news_regulator_pressure_${player.age}_${player.currentWeek}`,
    headline: state.pressureScore >= 75
        ? t(language, 'services.regulatorPressure.news.review.headline', { name: player.name })
        : t(language, 'services.regulatorPressure.news.monitoring.headline', { name: player.name }),
    subtext: t(language, 'services.regulatorPressure.news.subtext', { studios: state.controlledStudioCount, majors: state.controlledMajorStudioCount, pressure: state.pressureScore }),
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: state.pressureScore >= 75 ? 'HIGH' : 'MEDIUM',
});

const makeRegulatorPost = (player: Player, state: RegulatorPressureState, language: ReturnType<typeof getPlayerLanguage>): XPost => ({
    id: `x_regulator_pressure_${player.age}_${player.currentWeek}`,
    authorId: 'trade_regulator_watch',
    authorName: 'Regulator Watch',
    authorHandle: '@regwatch',
    authorAvatar: '⚖️',
    content: t(language, 'services.regulatorPressure.social.content', { name: player.name }),
    timestamp: Date.now(),
    likes: 1_200 + (state.pressureScore * 54),
    retweets: 240 + (state.pressureScore * 12),
    replies: 110 + (state.pressureScore * 6),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'GENERAL',
    sentiment: state.pressureScore >= 70 ? 'MESSY' : 'INDUSTRY',
});

const applyRegulatorStudioEffects = (businesses: Business[], state: RegulatorPressureState) => (
    businesses.map(business => business.type !== 'PRODUCTION_HOUSE'
        ? business
        : {
            ...business,
            stats: {
                ...business.stats,
                investorConfidence: clamp((business.stats?.investorConfidence ?? 55) - state.investorConfidencePenalty),
                riskLevel: clamp((business.stats?.riskLevel ?? 30) + Math.ceil(state.pressureScore / 35)),
            },
        })
);

const agePreviousState = (player: Player): Player => {
    const previous = getPreviousState(player);
    if (!previous || Object.keys(previous).length === 0) return player;
    return {
        ...player,
        flags: {
            ...player.flags,
            regulatorPressureState: {
                ...previous,
                acquisitionMoratoriumWeeksRemaining: Math.max(0, Math.round((previous.acquisitionMoratoriumWeeksRemaining || 0) - 1)),
                conductAgreementWeeksRemaining: Math.max(0, Math.round((previous.conductAgreementWeeksRemaining || 0) - 1)),
            },
        },
    };
};

export const processRegulatorPressure = (player: Player): Player => {
    const language = getPlayerLanguage(player);
    const previous = getPreviousState(player) as RegulatorPressureState | undefined;
    if (previous?.lastProcessedWeek === player.currentWeek) {
        return {
            ...player,
            flags: {
                ...player.flags,
                regulatorPressureState: previous,
            },
        };
    }

    const agedPlayer = agePreviousState(player);
    let state = getRegulatorPressureState(agedPlayer);
    const enteringReview = state.pressureScore >= 65 && state.acquisitionMoratoriumWeeksRemaining === 0;
    if (enteringReview) {
        state = {
            ...state,
            acquisitionMoratoriumWeeksRemaining: state.pressureScore >= 80 ? 4 : 2,
            reviewCount: state.reviewCount + 1,
        };
        state.status = getStatus(state.pressureScore, state.acquisitionMoratoriumWeeksRemaining, state.conductAgreementWeeksRemaining);
    }

    const shouldPublish = state.pressureScore >= 40 && state.controlledStudioCount >= 3;
    const news = shouldPublish ? makeRegulatorNews(agedPlayer, state, language) : undefined;
    const xPost = shouldPublish ? makeRegulatorPost(agedPlayer, state, language) : undefined;
    const regulatorEvent = shouldPublish ? createRegulatorEvent(agedPlayer, state) : null;
    const existingPendingEvents = Array.isArray(agedPlayer.pendingEvents) ? agedPlayer.pendingEvents : [];
    const cadence = queueAcquisitionPressureEvent(
        agedPlayer,
        existingPendingEvents,
        regulatorEvent,
        'REGULATOR',
        regulatorEvent?.data?.regulatorPressureEventType,
        event => existingPendingEvents.some(existing => (
            existing.id === event.id
            || existing.data?.regulatorPressureEventType === event.data?.regulatorPressureEventType
        )),
    );

    const nextState: RegulatorPressureState = {
        ...state,
        lastProcessedWeek: agedPlayer.currentWeek,
        lastRegulatorNewsWeek: news ? agedPlayer.currentWeek : previous?.lastRegulatorNewsWeek,
    };

    return {
        ...agedPlayer,
        businesses: applyRegulatorStudioEffects(agedPlayer.businesses || [], state),
        pendingEvents: cadence.pendingEvents,
        news: news ? [news, ...(agedPlayer.news || []).filter(item => item.id !== news.id)].slice(0, 80) : agedPlayer.news,
        x: xPost ? { ...agedPlayer.x, feed: [xPost, ...(agedPlayer.x?.feed || [])].slice(0, 80) } : agedPlayer.x,
        flags: {
            ...cadence.flags,
            regulatorPressureState: nextState,
        },
        logs: shouldPublish
            ? [{
                week: agedPlayer.currentWeek,
                year: agedPlayer.age,
                message: t(language, 'services.regulatorPressure.log.weekly', {
                    status: t(language, `services.regulatorPressure.status.${state.status}`),
                    pressure: state.pressureScore,
                    weeks: state.acquisitionMoratoriumWeeksRemaining,
                }),
                type: state.pressureScore >= 65 ? 'negative' as const : 'neutral' as const,
            }, ...(agedPlayer.logs || [])].slice(0, 80)
            : agedPlayer.logs,
    };
};
