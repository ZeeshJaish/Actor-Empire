import type { Business, LifeEvent, LifeEventImpactResult, NewsItem, Player, ScheduledEvent, XPost } from '../types';
import { queueAcquisitionPressureEvent } from './acquisitionEventCadence';
import { getAcquisitionDebtSummary } from './acquisitionDebt';

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

const makeReactionNews = (player: Player, state: WorldReactionState): NewsItem => ({
    id: `news_world_reaction_${player.age}_${player.currentWeek}`,
    headline: state.antiMonopolyPressure >= 60
        ? `${player.name}'s empire draws industry scrutiny`
        : `${player.name}'s studio consolidation becomes a market story`,
    subtext: `${state.controlledStudioCount} controlled studios, ${state.controlledMajorStudioCount} major labels, and ${state.acquisitionDebtPressure}% debt pressure are reshaping investor confidence and rival behavior.`,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: state.antiMonopolyPressure >= 60 ? 'HIGH' : 'MEDIUM',
});

const makeFanReaction = (player: Player, state: WorldReactionState): XPost => ({
    id: `x_world_reaction_${player.age}_${player.currentWeek}`,
    authorId: 'industry_audience',
    authorName: 'Audience Pulse',
    authorHandle: '@audiencepulse',
    authorAvatar: '📣',
    content: state.antiMonopolyPressure >= 60
        ? `${player.name} has too much power in Hollywood now. Great for big swings, scary for everyone else.`
        : `${player.name}'s studio empire is becoming impossible to ignore. Fans are watching the next move.`,
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
    const state = (player.flags?.worldReactionState || getWorldReactionState(player)) as WorldReactionState;
    let updatedPlayer = player;
    let log = 'World Reaction handled.';
    let logKey = 'life.event.world.log.default';
    const effects = [];

    if (type === 'ANTI_MONOPOLY_PRESSURE') {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 15_000_000);
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                money: player.money - cost,
                stats: { ...player.stats, reputation: clamp((player.stats.reputation || 0) + 1) },
            }, { antiMonopolyPressure: state.antiMonopolyPressure - 8 });
            log = `World Reaction: You cooperated with regulators and lowered scrutiny.`;
            logKey = 'life.event.world.log.antitrust.safe';
            effects.push({ label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '-8', tone: 'positive' as const });
            effects.push({ label: 'Legal spend', labelKey: 'life.effect.legalSpend', value: `$${cost.toLocaleString()}`, tone: 'negative' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                stats: {
                    ...player.stats,
                    fame: clamp((player.stats.fame || 0) + 2),
                    reputation: clamp((player.stats.reputation || 0) - 3),
                },
            }, { antiMonopolyPressure: state.antiMonopolyPressure + 6, rivalRetaliationRisk: state.rivalRetaliationRisk + 4 });
            log = `World Reaction: You fought the scrutiny in public. The noise got louder.`;
            logKey = 'life.event.world.log.antitrust.aggressive';
            effects.push({ label: 'Fame', labelKey: 'life.effect.fame', value: '+2', tone: 'positive' as const });
            effects.push({ label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '+6', tone: 'negative' as const });
        } else {
            const cost = Math.min(player.money, 30_000_000);
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                money: player.money - cost,
                stats: { ...player.stats, reputation: clamp((player.stats.reputation || 0) + 3) },
            }, { antiMonopolyPressure: state.antiMonopolyPressure - 16, rivalRetaliationRisk: state.rivalRetaliationRisk - 6 });
            log = `World Reaction: Advisors built a clean compliance firewall. Pressure cooled fast.`;
            logKey = 'life.event.world.log.antitrust.golden';
            effects.push({ label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '-16', tone: 'positive' as const });
            effects.push({ label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Safest path', tone: 'positive' as const });
        }
    } else if (type === 'RIVAL_RETALIATION') {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 10_000_000);
            updatedPlayer = updateWorldReactionPressure({ ...player, money: player.money - cost }, { rivalRetaliationRisk: state.rivalRetaliationRisk - 8 });
            log = `World Reaction: You cooled rival retaliation with quiet dealmaking.`;
            logKey = 'life.event.world.log.rival.safe';
            effects.push({ label: 'Rival Risk', labelKey: 'life.effect.rivalRisk', value: '-8', tone: 'positive' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = updateWorldReactionPressure({
                ...player,
                heat: clamp((player.heat || 0) + 4),
                stats: { ...player.stats, fame: clamp((player.stats.fame || 0) + 1) },
            }, { rivalRetaliationRisk: state.rivalRetaliationRisk + 8, antiMonopolyPressure: state.antiMonopolyPressure + 3 });
            log = `World Reaction: You answered rivals with a show of force. The industry noticed.`;
            logKey = 'life.event.world.log.rival.aggressive';
            effects.push({ label: 'Heat', labelKey: 'life.effect.heat', value: '+4', tone: 'negative' as const });
            effects.push({ label: 'Fame', labelKey: 'life.effect.fame', value: '+1', tone: 'positive' as const });
        } else {
            const cost = Math.min(player.money, 22_000_000);
            updatedPlayer = updateWorldReactionPressure({ ...player, money: player.money - cost }, { rivalRetaliationRisk: state.rivalRetaliationRisk - 16, antiMonopolyPressure: state.antiMonopolyPressure - 4 });
            log = `World Reaction: Advisors neutralized the rival pressure before it became a public fight.`;
            logKey = 'life.event.world.log.rival.golden';
            effects.push({ label: 'Rival Risk', labelKey: 'life.effect.rivalRisk', value: '-16', tone: 'positive' as const });
            effects.push({ label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Safest path', tone: 'positive' as const });
        }
    } else {
        if (mode === 'SAFE') {
            const cost = Math.min(player.money, 12_000_000);
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure({ ...player, money: player.money - cost }, { employeeDepartureRisk: state.employeeDepartureRisk - 8 }), 4);
            log = `World Reaction: Retention bonuses steadied nervous studio teams.`;
            logKey = 'life.event.world.log.employee.safe';
            effects.push({ label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '-8', tone: 'positive' as const });
            effects.push({ label: 'Morale', labelKey: 'life.effect.morale', value: '+4', tone: 'positive' as const });
        } else if (mode === 'AGGRESSIVE') {
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure(player, { employeeDepartureRisk: state.employeeDepartureRisk + 7 }), -5);
            log = `World Reaction: You held the line on costs, but staff confidence slipped.`;
            logKey = 'life.event.world.log.employee.aggressive';
            effects.push({ label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '+7', tone: 'negative' as const });
            effects.push({ label: 'Morale', labelKey: 'life.effect.morale', value: '-5', tone: 'negative' as const });
        } else {
            const cost = Math.min(player.money, 25_000_000);
            updatedPlayer = applyStudioMorale(updateWorldReactionPressure({ ...player, money: player.money - cost }, { employeeDepartureRisk: state.employeeDepartureRisk - 15, antiMonopolyPressure: state.antiMonopolyPressure - 3 }), 7);
            log = `World Reaction: Advisors handled retention packages and internal messaging cleanly.`;
            logKey = 'life.event.world.log.employee.golden';
            effects.push({ label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '-15', tone: 'positive' as const });
            effects.push({ label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Safest path', tone: 'positive' as const });
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
    if (type === 'ANTI_MONOPOLY_PRESSURE') {
        return {
            id: `life_world_reaction_antitrust_${player.age}_${player.currentWeek}`,
            type: 'LEGAL',
            title: 'Industry Scrutiny Builds',
            titleKey: 'life.event.world.antitrust.title',
            category: 'World Reaction',
            description: `Your studio group now controls ${state.controlledStudioCount} studios. Regulators and trade press are asking whether your empire has too much leverage.`,
            descriptionKey: 'life.event.world.antitrust.description',
            textVars: { controlled: state.controlledStudioCount },
            options: [
                {
                    id: 'COOPERATE',
                    label: 'Cooperate With Review',
                    labelKey: 'life.event.world.antitrust.cooperate.label',
                    description: 'Spend on lawyers, share documents, and lower pressure without escalating the story.',
                    descriptionKey: 'life.event.world.antitrust.cooperate.description',
                    previewEffects: [
                        { label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '-8', tone: 'positive' },
                        { label: 'Cost', labelKey: 'life.effect.cost', value: 'Legal spend', tone: 'negative' },
                    ],
                    impact: makeImpact(type, 'SAFE'),
                },
                {
                    id: 'FIGHT_PUBLICLY',
                    label: 'Fight Publicly',
                    labelKey: 'life.event.world.antitrust.fight.label',
                    description: 'Frame the pressure as jealousy from weaker rivals. Fame rises, scrutiny gets worse.',
                    descriptionKey: 'life.event.world.antitrust.fight.description',
                    previewEffects: [
                        { label: 'Fame', labelKey: 'life.effect.fame', value: '+2', tone: 'positive' },
                        { label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '+6', tone: 'negative' },
                    ],
                    impact: makeImpact(type, 'AGGRESSIVE'),
                },
                {
                    id: 'GOLDEN_COMPLIANCE',
                    label: 'Clean Compliance Task Force',
                    labelKey: 'life.event.world.antitrust.golden.label',
                    description: 'Reward ad: advisors build the safest review response and calm the market.',
                    descriptionKey: 'life.event.world.antitrust.golden.description',
                    isGolden: true,
                    previewEffects: [
                        { label: 'Scrutiny', labelKey: 'life.effect.scrutiny', value: '-16', tone: 'positive' },
                        { label: 'Risk', labelKey: 'life.effect.risk', value: 'Safest path', tone: 'positive' },
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
            title: 'Rivals Start Moving Against You',
            titleKey: 'life.event.world.rival.title',
            category: 'World Reaction',
            description: 'Competing studios are calling talent, leaking stories, and trying to slow your acquisition momentum.',
            descriptionKey: 'life.event.world.rival.description',
            options: [
                {
                    id: 'QUIET_DEALS',
                    label: 'Quiet Deal-Making',
                    labelKey: 'life.event.world.rival.quiet.label',
                    description: 'Spend money behind the scenes to cool the retaliation.',
                    descriptionKey: 'life.event.world.rival.quiet.description',
                    previewEffects: [{ label: 'Rival Risk', labelKey: 'life.effect.rivalRisk', value: '-8', tone: 'positive' }],
                    impact: makeImpact(type, 'SAFE'),
                },
                {
                    id: 'COUNTERPUNCH',
                    label: 'Counterpunch',
                    labelKey: 'life.event.world.rival.counter.label',
                    description: 'Answer pressure with a public show of strength.',
                    descriptionKey: 'life.event.world.rival.counter.description',
                    previewEffects: [
                        { label: 'Heat', labelKey: 'life.effect.heat', value: '+4', tone: 'negative' },
                        { label: 'Fame', labelKey: 'life.effect.fame', value: '+1', tone: 'positive' },
                    ],
                    impact: makeImpact(type, 'AGGRESSIVE'),
                },
                {
                    id: 'GOLDEN_SETTLEMENT',
                    label: 'Advisor Backchannel',
                    labelKey: 'life.event.world.rival.golden.label',
                    description: 'Reward ad: let advisors neutralize the fight before it becomes public.',
                    descriptionKey: 'life.event.world.rival.golden.description',
                    isGolden: true,
                    previewEffects: [{ label: 'Rival Risk', labelKey: 'life.effect.rivalRisk', value: '-16', tone: 'positive' }],
                    impact: makeImpact(type, 'GOLDEN'),
                },
            ],
        };
    }

    return {
        id: `life_world_reaction_employee_${player.age}_${player.currentWeek}`,
        type: 'NETWORKING',
        title: 'Key Employees Get Nervous',
        titleKey: 'life.event.world.employee.title',
        category: 'World Reaction',
        description: 'Acquisition pressure is making executives, producers, and senior staff wonder whether they still have a future inside the group.',
        descriptionKey: 'life.event.world.employee.description',
        options: [
            {
                id: 'RETENTION_BONUS',
                label: 'Retention Bonuses',
                labelKey: 'life.event.world.employee.retention.label',
                description: 'Spend money to calm teams and protect morale.',
                descriptionKey: 'life.event.world.employee.retention.description',
                previewEffects: [
                    { label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '-8', tone: 'positive' },
                    { label: 'Morale', labelKey: 'life.effect.morale', value: '+4', tone: 'positive' },
                ],
                impact: makeImpact(type, 'SAFE'),
            },
            {
                id: 'HOLD_COSTS',
                label: 'Hold Costs',
                labelKey: 'life.event.world.employee.hold.label',
                description: 'Save cash now, but risk staff confidence slipping.',
                descriptionKey: 'life.event.world.employee.hold.description',
                previewEffects: [
                    { label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '+7', tone: 'negative' },
                    { label: 'Morale', labelKey: 'life.effect.morale', value: '-5', tone: 'negative' },
                ],
                impact: makeImpact(type, 'AGGRESSIVE'),
            },
            {
                id: 'GOLDEN_RETENTION',
                label: 'Clean Retention Plan',
                labelKey: 'life.event.world.employee.golden.label',
                description: 'Reward ad: advisors handle packages and internal messaging safely.',
                descriptionKey: 'life.event.world.employee.golden.description',
                isGolden: true,
                previewEffects: [
                    { label: 'Employee Risk', labelKey: 'life.effect.employeeRisk', value: '-15', tone: 'positive' },
                    { label: 'Risk', labelKey: 'life.effect.risk', value: 'Safest path', tone: 'positive' },
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
    const news = shouldPublish ? makeReactionNews(player, state) : undefined;
    const xPost = shouldPublish ? makeFanReaction(player, state) : undefined;
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
            message: `World Reaction: ${state.antiMonopolyPressure}% scrutiny, ${state.rivalRetaliationRisk}% rival risk, ${state.employeeDepartureRisk}% employee risk.`,
            type: state.antiMonopolyPressure >= 60 ? 'negative' as const : 'neutral' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };
};
