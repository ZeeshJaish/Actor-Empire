import type { Business, LifeEvent, LifeEventImpactResult, NewsItem, Player, ScheduledEvent, XPost } from '../types';
import { queueAcquisitionPressureEvent } from './acquisitionEventCadence';
import { getAcquisitionDebtSummary } from './acquisitionDebt';
import { getPlayerLanguage, t } from './i18n';

export interface WorldReactionState {
    lastProcessedWeek: number;
    controlledStudioCount: number;
    controlledMajorStudioCount: number;
    antiMonopolyPressure: number;
    rivalRetaliationRisk: number;
    employeeDepartureRisk: number;
    investorConfidence: number;
    acquisitionDebtPressure: number;
    valuationPressure: number;
    franchiseValuePressure: number;
    lastHeadlineId?: string;
    lastWorldReactionChoiceWeek?: number;
}

export type WorldReactionEventType = 'ANTI_MONOPOLY_PRESSURE' | 'RIVAL_RETALIATION' | 'EMPLOYEE_DEPARTURE';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const round = (value: number) => Math.round(value);

const getProductionStudios = (player: Pick<Player, 'businesses'>) => (
    (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE')
);

const isMajorStudio = (business: Business) => (
    business.subtype === 'MAJOR_STUDIO'
    || (business.stats?.valuation || 0) >= 1_000_000_000
);

const getAcquisitionDebtPressure = (player: Pick<Player, 'flags' | 'businesses'>) => {
    const ledger = Array.isArray(player.flags?.acquisitionDebtLedger) ? player.flags.acquisitionDebtLedger : [];
    const activeLedgerDebt = ledger.reduce((sum: number, entry: any) => (
        entry?.status !== 'PAID_OFF'
            ? sum + Math.max(0, Number(entry?.remainingPrincipal || 0))
            : sum
    ), 0);
    if (activeLedgerDebt > 0) {
        return getAcquisitionDebtSummary(player as Player).pressureScore;
    }

    const cases = Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases
        : [];
    const debtFromDeals = cases.reduce((sum: number, acquisitionCase: any) => (
        acquisitionCase?.status === 'ACQUIRED'
            ? sum
                + Math.max(0, acquisitionCase.closing?.verifiedDebt || 0)
                + Math.max(0, acquisitionCase.closing?.hiddenLiabilities || 0)
            : sum
    ), 0);
    const balanceBase = Math.max(
        1,
        player.businesses.reduce((sum, business) => sum + Math.max(0, business.balance || 0), 0),
    );
    return clamp((debtFromDeals / balanceBase) * 8);
};

const getAverageInvestorConfidence = (studios: Business[]) => {
    if (!studios.length) return 0;
    return round(studios.reduce((sum, studio) => sum + (studio.stats.investorConfidence ?? 55), 0) / studios.length);
};

export const getWorldReactionState = (player: Player): WorldReactionState => {
    const studios = getProductionStudios(player);
    const majorStudios = studios.filter(isMajorStudio);
    const controlledTakeovers = (player.stockTakeovers || []).filter(takeover => takeover.status === 'CONTROLLED').length;
    const controlledStudioCount = studios.length;
    const controlledMajorStudioCount = majorStudios.length;
    const empireScalePressure = (Math.max(0, controlledStudioCount - 1) * 14) + (controlledMajorStudioCount * 11) + (controlledTakeovers * 8);
    const acquisitionDebtPressure = getAcquisitionDebtPressure(player);
    const antiMonopolyPressure = clamp(empireScalePressure + (acquisitionDebtPressure * 0.25));
    const rivalRetaliationRisk = clamp((antiMonopolyPressure * 0.72) + (controlledTakeovers * 7));
    const employeeDepartureRisk = clamp((antiMonopolyPressure * 0.45) + (controlledMajorStudioCount * 4));
    const valuationPressure = clamp((antiMonopolyPressure * 0.36) + (acquisitionDebtPressure * 0.32));
    const franchiseValuePressure = clamp((controlledMajorStudioCount * 9) + (controlledStudioCount * 3));

    return {
        lastProcessedWeek: player.flags?.worldReactionState?.lastProcessedWeek || 0,
        controlledStudioCount,
        controlledMajorStudioCount,
        antiMonopolyPressure: round(antiMonopolyPressure),
        rivalRetaliationRisk: round(rivalRetaliationRisk),
        employeeDepartureRisk: round(employeeDepartureRisk),
        investorConfidence: getAverageInvestorConfidence(studios),
        acquisitionDebtPressure: round(acquisitionDebtPressure),
        valuationPressure: round(valuationPressure),
        franchiseValuePressure: round(franchiseValuePressure),
        lastHeadlineId: player.flags?.worldReactionState?.lastHeadlineId,
    };
};

const makeReactionNews = (player: Player, state: WorldReactionState, language = getPlayerLanguage(player)): NewsItem => ({
    id: `news_world_reaction_${player.age}_${player.currentWeek}`,
    headline: state.antiMonopolyPressure >= 60
        ? t(language, 'services.worldReactions.news.scrutiny.headline', { player: player.name })
        : t(language, 'services.worldReactions.news.marketStory.headline', { player: player.name }),
    subtext: t(language, 'services.worldReactions.news.subtext', {
        controlledStudios: state.controlledStudioCount,
        majorStudios: state.controlledMajorStudioCount,
        debtPressure: state.acquisitionDebtPressure
    }),
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: state.antiMonopolyPressure >= 60 ? 'HIGH' : 'MEDIUM',
});

const makeFanReaction = (player: Player, state: WorldReactionState, language = getPlayerLanguage(player)): XPost => ({
    id: `x_world_reaction_${player.age}_${player.currentWeek}`,
    authorId: 'industry_audience',
    authorName: t(language, 'services.worldReactions.social.audiencePulse.name'),
    authorHandle: '@audiencepulse',
    authorAvatar: '📣',
    content: state.antiMonopolyPressure >= 60
        ? t(language, 'services.worldReactions.social.scrutiny.content', { player: player.name })
        : t(language, 'services.worldReactions.social.marketStory.content', { player: player.name }),
    timestamp: Date.now(),
    likes: 3_000 + (state.antiMonopolyPressure * 120),
    retweets: 500 + (state.rivalRetaliationRisk * 18),
    replies: 200 + (state.employeeDepartureRisk * 12),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    sentiment: state.antiMonopolyPressure >= 60 ? 'MESSY' : 'INDUSTRY',
});

const updateWorldReactionPressure = (
    player: Player,
    updates: Partial<Pick<WorldReactionState, 'antiMonopolyPressure' | 'rivalRetaliationRisk' | 'employeeDepartureRisk'>>,
) => {
    const current = (player.flags?.worldReactionState || getWorldReactionState(player)) as WorldReactionState;
    return {
        ...player,
        flags: {
            ...player.flags,
            worldReactionState: {
                ...current,
                ...updates,
                antiMonopolyPressure: clamp(updates.antiMonopolyPressure ?? current.antiMonopolyPressure),
                rivalRetaliationRisk: clamp(updates.rivalRetaliationRisk ?? current.rivalRetaliationRisk),
                employeeDepartureRisk: clamp(updates.employeeDepartureRisk ?? current.employeeDepartureRisk),
                lastWorldReactionChoiceWeek: player.currentWeek,
            },
        },
    };
};

const applyStudioMorale = (player: Player, delta: number) => ({
    ...player,
    businesses: (player.businesses || []).map(studio => studio.type !== 'PRODUCTION_HOUSE'
        ? studio
        : {
            ...studio,
            staff: (studio.staff || []).map(staff => ({
                ...staff,
                morale: clamp((staff.morale || 50) + delta),
            })),
        }),
});

const makeImpact = (
    type: WorldReactionEventType,
    mode: 'SAFE' | 'AGGRESSIVE' | 'GOLDEN',
): ((player: Player) => LifeEventImpactResult) => (player: Player) => {
    const language = getPlayerLanguage(player);
    const state = (player.flags?.worldReactionState || getWorldReactionState(player)) as WorldReactionState;
    let updatedPlayer = player;
    let log = t(language, 'life.event.world.log.default');
    let logKey = 'life.event.world.log.default';
    const effects = [];
    const effectLabel = (key: string) => t(language, key);
    const safestPathValue = t(language, 'life.effect.value.safestPath');

    if (type === 'ANTI_MONOPOLY_PRESSURE') {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 15_000_000);
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                money: player.money - cost,
                stats: { ...player.stats, reputation: clamp((player.stats.reputation || 0) + 1) },
            }, { antiMonopolyPressure: state.antiMonopolyPressure - 8 });
            logKey = 'life.event.world.log.antitrust.safe';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '-8', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.legalSpend'), labelKey: 'life.effect.legalSpend', value: `$${cost.toLocaleString()}`, tone: 'negative' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                stats: {
                    ...player.stats,
                    fame: clamp((player.stats.fame || 0) + 2),
                    reputation: clamp((player.stats.reputation || 0) - 3),
                },
            }, { antiMonopolyPressure: state.antiMonopolyPressure + 6, rivalRetaliationRisk: state.rivalRetaliationRisk + 4 });
            logKey = 'life.event.world.log.antitrust.aggressive';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.fame'), labelKey: 'life.effect.fame', value: '+2', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '+6', tone: 'negative' as const });
        } else {
            const cost = Math.min(player.money, 30_000_000);
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                money: player.money - cost,
                stats: { ...player.stats, reputation: clamp((player.stats.reputation || 0) + 3) },
            }, { antiMonopolyPressure: state.antiMonopolyPressure - 16, rivalRetaliationRisk: state.rivalRetaliationRisk - 6 });
            logKey = 'life.event.world.log.antitrust.golden';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '-16', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.rewardAd'), labelKey: 'life.effect.rewardAd', value: safestPathValue, tone: 'positive' as const });
        }
    } else if (type === 'RIVAL_RETALIATION') {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 10_000_000);
            updatedPlayer = updateWorldReactionPressure({ ...player, money: player.money - cost }, { rivalRetaliationRisk: state.rivalRetaliationRisk - 8 });
            logKey = 'life.event.world.log.rival.safe';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.rivalRisk'), labelKey: 'life.effect.rivalRisk', value: '-8', tone: 'positive' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                heat: clamp((player.heat || 0) + 4),
                stats: { ...player.stats, fame: clamp((player.stats.fame || 0) + 1) },
            }, { rivalRetaliationRisk: state.rivalRetaliationRisk + 8, antiMonopolyPressure: state.antiMonopolyPressure + 3 });
            logKey = 'life.event.world.log.rival.aggressive';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.heat'), labelKey: 'life.effect.heat', value: '+4', tone: 'negative' as const });
            effects.push({ label: effectLabel('life.effect.fame'), labelKey: 'life.effect.fame', value: '+1', tone: 'positive' as const });
        } else {
            const cost = Math.min(player.money, 22_000_000);
            updatedPlayer = updateWorldReactionPressure({ ...player, money: player.money - cost }, { rivalRetaliationRisk: state.rivalRetaliationRisk - 16, antiMonopolyPressure: state.antiMonopolyPressure - 4 });
            logKey = 'life.event.world.log.rival.golden';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.rivalRisk'), labelKey: 'life.effect.rivalRisk', value: '-16', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.rewardAd'), labelKey: 'life.effect.rewardAd', value: safestPathValue, tone: 'positive' as const });
        }
    } else {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 12_000_000);
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure({ ...player, money: player.money - cost }, { employeeDepartureRisk: state.employeeDepartureRisk - 8 }), 4);
            logKey = 'life.event.world.log.employee.safe';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '-8', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.morale'), labelKey: 'life.effect.morale', value: '+4', tone: 'positive' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure(player, { employeeDepartureRisk: state.employeeDepartureRisk + 7 }), -5);
            logKey = 'life.event.world.log.employee.aggressive';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '+7', tone: 'negative' as const });
            effects.push({ label: effectLabel('life.effect.morale'), labelKey: 'life.effect.morale', value: '-5', tone: 'negative' as const });
        } else {
            const cost = Math.min(player.money, 25_000_000);
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure({ ...player, money: player.money - cost }, { employeeDepartureRisk: state.employeeDepartureRisk - 15, antiMonopolyPressure: state.antiMonopolyPressure - 3 }), 7);
            logKey = 'life.event.world.log.employee.golden';
            log = t(language, logKey);
            effects.push({ label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '-15', tone: 'positive' as const });
            effects.push({ label: effectLabel('life.effect.rewardAd'), labelKey: 'life.effect.rewardAd', value: safestPathValue, tone: 'positive' as const });
        }
    }

    return { updatedPlayer, log, logKey, effects };
};

const getWorldReactionEventType = (state: WorldReactionState): WorldReactionEventType | null => {
    if (state.antiMonopolyPressure >= 55) return 'ANTI_MONOPOLY_PRESSURE';
    if (state.rivalRetaliationRisk >= 45) return 'RIVAL_RETALIATION';
    if (state.employeeDepartureRisk >= 35) return 'EMPLOYEE_DEPARTURE';
    return null;
};

const createWorldReactionLifeEvent = (
    player: Player,
    state: WorldReactionState,
    type: WorldReactionEventType,
): LifeEvent => {
    const language = getPlayerLanguage(player);
    const tr = (key: string, vars?: Record<string, string | number>) => t(language, key, vars);
    const category = tr('life.event.world.category');
    const effectLabel = (key: string) => tr(key);
    const legalSpendValue = tr('life.effect.value.legalSpend');
    const safestPathValue = tr('life.effect.value.safestPath');
    if (type === 'ANTI_MONOPOLY_PRESSURE') {
        return {
            id: `life_world_reaction_antitrust_${player.age}_${player.currentWeek}`,
            type: 'LEGAL',
            title: t(language, 'life.event.world.antitrust.title'),
            titleKey: 'life.event.world.antitrust.title',
            category,
            description: t(language, 'life.event.world.antitrust.description', { controlled: state.controlledStudioCount }),
            descriptionKey: 'life.event.world.antitrust.description',
            textVars: { controlled: state.controlledStudioCount },
            options: [
                {
                    id: 'COOPERATE',
                    label: tr('life.event.world.antitrust.cooperate.label'),
                    labelKey: 'life.event.world.antitrust.cooperate.label',
                    description: tr('life.event.world.antitrust.cooperate.description'),
                    descriptionKey: 'life.event.world.antitrust.cooperate.description',
                    previewEffects: [
                        { label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '-8', tone: 'positive' },
                        { label: effectLabel('life.effect.cost'), labelKey: 'life.effect.cost', value: legalSpendValue, tone: 'negative' },
                    ],
                    impact: makeImpact(type, 'SAFE'),
                },
                {
                    id: 'FIGHT_PUBLICLY',
                    label: tr('life.event.world.antitrust.fight.label'),
                    labelKey: 'life.event.world.antitrust.fight.label',
                    description: tr('life.event.world.antitrust.fight.description'),
                    descriptionKey: 'life.event.world.antitrust.fight.description',
                    previewEffects: [
                        { label: effectLabel('life.effect.fame'), labelKey: 'life.effect.fame', value: '+2', tone: 'positive' },
                        { label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '+6', tone: 'negative' },
                    ],
                    impact: makeImpact(type, 'AGGRESSIVE'),
                },
                {
                    id: 'GOLDEN_COMPLIANCE',
                    label: tr('life.event.world.antitrust.golden.label'),
                    labelKey: 'life.event.world.antitrust.golden.label',
                    description: tr('life.event.world.antitrust.golden.description'),
                    descriptionKey: 'life.event.world.antitrust.golden.description',
                    isGolden: true,
                    previewEffects: [
                        { label: effectLabel('life.effect.scrutiny'), labelKey: 'life.effect.scrutiny', value: '-16', tone: 'positive' },
                        { label: effectLabel('life.effect.risk'), labelKey: 'life.effect.risk', value: safestPathValue, tone: 'positive' },
                    ],
                    impact: makeImpact(type, 'GOLDEN'),
                },
            ],
        };
    }

    if (type === 'RIVAL_RETALIATION') {
        return {
            id: `life_world_reaction_rival_${player.age}_${player.currentWeek}`,
            type: 'CONFLICT',
            title: tr('life.event.world.rival.title'),
            titleKey: 'life.event.world.rival.title',
            category,
            description: tr('life.event.world.rival.description'),
            descriptionKey: 'life.event.world.rival.description',
            options: [
                {
                    id: 'QUIET_DEALS',
                    label: tr('life.event.world.rival.quiet.label'),
                    labelKey: 'life.event.world.rival.quiet.label',
                    description: tr('life.event.world.rival.quiet.description'),
                    descriptionKey: 'life.event.world.rival.quiet.description',
                    previewEffects: [{ label: effectLabel('life.effect.rivalRisk'), labelKey: 'life.effect.rivalRisk', value: '-8', tone: 'positive' }],
                    impact: makeImpact(type, 'SAFE'),
                },
                {
                    id: 'COUNTERPUNCH',
                    label: tr('life.event.world.rival.counter.label'),
                    labelKey: 'life.event.world.rival.counter.label',
                    description: tr('life.event.world.rival.counter.description'),
                    descriptionKey: 'life.event.world.rival.counter.description',
                    previewEffects: [
                        { label: effectLabel('life.effect.heat'), labelKey: 'life.effect.heat', value: '+4', tone: 'negative' },
                        { label: effectLabel('life.effect.fame'), labelKey: 'life.effect.fame', value: '+1', tone: 'positive' },
                    ],
                    impact: makeImpact(type, 'AGGRESSIVE'),
                },
                {
                    id: 'GOLDEN_SETTLEMENT',
                    label: tr('life.event.world.rival.golden.label'),
                    labelKey: 'life.event.world.rival.golden.label',
                    description: tr('life.event.world.rival.golden.description'),
                    descriptionKey: 'life.event.world.rival.golden.description',
                    isGolden: true,
                    previewEffects: [{ label: effectLabel('life.effect.rivalRisk'), labelKey: 'life.effect.rivalRisk', value: '-16', tone: 'positive' }],
                    impact: makeImpact(type, 'GOLDEN'),
                },
            ],
        };
    }

    return {
        id: `life_world_reaction_employee_${player.age}_${player.currentWeek}`,
        type: 'NETWORKING',
        title: tr('life.event.world.employee.title'),
        titleKey: 'life.event.world.employee.title',
        category,
        description: tr('life.event.world.employee.description'),
        descriptionKey: 'life.event.world.employee.description',
        options: [
            {
                id: 'RETENTION_BONUS',
                label: tr('life.event.world.employee.retention.label'),
                labelKey: 'life.event.world.employee.retention.label',
                description: tr('life.event.world.employee.retention.description'),
                descriptionKey: 'life.event.world.employee.retention.description',
                previewEffects: [
                    { label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '-8', tone: 'positive' },
                    { label: effectLabel('life.effect.morale'), labelKey: 'life.effect.morale', value: '+4', tone: 'positive' },
                ],
                impact: makeImpact(type, 'SAFE'),
            },
            {
                id: 'HOLD_COSTS',
                label: tr('life.event.world.employee.hold.label'),
                labelKey: 'life.event.world.employee.hold.label',
                description: tr('life.event.world.employee.hold.description'),
                descriptionKey: 'life.event.world.employee.hold.description',
                previewEffects: [
                    { label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '+7', tone: 'negative' },
                    { label: effectLabel('life.effect.morale'), labelKey: 'life.effect.morale', value: '-5', tone: 'negative' },
                ],
                impact: makeImpact(type, 'AGGRESSIVE'),
            },
            {
                id: 'GOLDEN_RETENTION',
                label: tr('life.event.world.employee.golden.label'),
                labelKey: 'life.event.world.employee.golden.label',
                description: tr('life.event.world.employee.golden.description'),
                descriptionKey: 'life.event.world.employee.golden.description',
                isGolden: true,
                previewEffects: [
                    { label: effectLabel('life.effect.employeeRisk'), labelKey: 'life.effect.employeeRisk', value: '-15', tone: 'positive' },
                    { label: effectLabel('life.effect.risk'), labelKey: 'life.effect.risk', value: safestPathValue, tone: 'positive' },
                ],
                impact: makeImpact(type, 'GOLDEN'),
            },
        ],
    };
};

const createWorldReactionEvent = (
    player: Player,
    state: WorldReactionState,
): ScheduledEvent | null => {
    const type = getWorldReactionEventType(state);
    if (!type) return null;
    const lifeEvent = createWorldReactionLifeEvent(player, state, type);
    return {
        id: `event_world_reaction_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        week: player.currentWeek,
        type: 'LIFE_EVENT',
        title: lifeEvent.title,
        description: lifeEvent.description,
        data: {
            worldReactionEventType: type,
            lifeEvent,
        },
    };
};

const rebalanceStudios = (studios: Business[], state: WorldReactionState) => (
    studios.map(studio => {
        if (studio.type !== 'PRODUCTION_HOUSE') return studio;
        const pressure = state.antiMonopolyPressure / 100;
        const confidenceDrop = state.antiMonopolyPressure >= 35 ? Math.max(1, round(pressure * 6)) : 0;
        const valuationMultiplier = 1 + ((state.franchiseValuePressure * 0.0009) - (state.valuationPressure * 0.00055));
        const moraleDrop = state.employeeDepartureRisk >= 35 ? Math.max(1, round(state.employeeDepartureRisk / 22)) : 0;
        return {
            ...studio,
            stats: {
                ...studio.stats,
                investorConfidence: clamp((studio.stats.investorConfidence ?? 55) - confidenceDrop, 5, 100),
                riskLevel: clamp((studio.stats.riskLevel || 0) + Math.max(0, round(pressure * 3)), 0, 100),
                valuation: Math.max(0, Math.round((studio.stats.valuation || 0) * valuationMultiplier)),
            },
            staff: (studio.staff || []).map(staff => ({
                ...staff,
                morale: clamp((staff.morale || 50) - moraleDrop, 0, 100),
            })),
        };
    })
);

export const processWorldReactions = (player: Player): Player => {
    const language = getPlayerLanguage(player);
    const state = getWorldReactionState(player);
    const previousState = player.flags?.worldReactionState as WorldReactionState | undefined;
    if (previousState?.lastProcessedWeek === player.currentWeek) {
        return {
            ...player,
            flags: {
                ...player.flags,
                worldReactionState: previousState,
            },
        };
    }

    const shouldPublish = state.antiMonopolyPressure >= 28 && state.controlledStudioCount >= 2;
    const news = shouldPublish ? makeReactionNews(player, state, language) : undefined;
    const xPost = shouldPublish ? makeFanReaction(player, state, language) : undefined;
    const reactionEvent = shouldPublish ? createWorldReactionEvent(player, state) : null;
    const existingPendingEvents = Array.isArray(player.pendingEvents) ? player.pendingEvents : [];
    const cadence = queueAcquisitionPressureEvent(
        player,
        existingPendingEvents,
        reactionEvent,
        'WORLD_REACTION',
        reactionEvent?.data?.worldReactionEventType,
        event => existingPendingEvents.some(existing => existing.id === event.id || existing.data?.worldReactionEventType === event.data?.worldReactionEventType),
    );
    const nextState: WorldReactionState = {
        ...state,
        lastProcessedWeek: player.currentWeek,
        lastHeadlineId: news?.id || previousState?.lastHeadlineId,
    };

    return {
        ...player,
        businesses: rebalanceStudios(player.businesses || [], state),
        flags: {
            ...cadence.flags,
            worldReactionState: nextState,
        },
        news: news && !(player.news || []).some(item => item.id === news.id)
            ? [news, ...(player.news || [])].slice(0, 80)
            : player.news,
        pendingEvents: cadence.pendingEvents,
        x: xPost
            ? {
                ...player.x,
                feed: [xPost, ...(player.x?.feed || []).filter(post => post.id !== xPost.id)].slice(0, 80),
            }
            : player.x,
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: t(language, 'services.worldReactions.log.weekly', {
                scrutiny: state.antiMonopolyPressure,
                rivalRisk: state.rivalRetaliationRisk,
                employeeRisk: state.employeeDepartureRisk
            }),
            type: state.antiMonopolyPressure >= 60 ? 'negative' as const : 'neutral' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };
};
