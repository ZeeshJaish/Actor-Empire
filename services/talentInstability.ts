import type { Business, BusinessStaff, GameLanguage, LifeEvent, LifeEventImpactResult, NewsItem, Player, ScheduledEvent, XPost } from '../types';
import { queueAcquisitionPressureEvent } from './acquisitionEventCadence';
import { getWorldReactionState } from './worldReactions';
import { getPlayerLanguage, t } from './i18n';

export type TalentInstabilityEventType = 'RETENTION_CRISIS' | 'KEY_STAFF_EXIT_RISK';

export interface TalentDepartureRecord {
    id: string;
    studioId: string;
    studioName: string;
    staffId: string;
    staffName: string;
    role: string;
    week: number;
    year: number;
    reason: string;
}

export interface TalentInstabilityState {
    lastProcessedWeek: number;
    pressureScore: number;
    departureRisk: number;
    averageMorale: number;
    controlledStudioCount: number;
    acquiredStudioCount: number;
    retentionShieldWeeksRemaining: number;
    totalDepartures: number;
    departures: TalentDepartureRecord[];
    lastTalentInstabilityChoiceWeek?: number;
    lastTalentInstabilityEventWeek?: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value);

const getProductionStudios = (player: Pick<Player, 'businesses'>): Business[] => (
    (player.businesses || []).filter(business => business.type === 'PRODUCTION_HOUSE')
);

const getAcquiredStudioCount = (player: Pick<Player, 'flags'>): number => (
    Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.filter((entry: any) => entry?.status === 'ACQUIRED').length
        : 0
);

const getAverageMorale = (studios: Business[]): number => {
    const staff = studios.flatMap(studio => studio.staff || []);
    if (!staff.length) return 70;
    return round(staff.reduce((sum, member) => sum + (member.morale ?? 50), 0) / staff.length);
};

const getPreviousState = (player: Pick<Player, 'flags'>): Partial<TalentInstabilityState> => (
    player.flags?.talentInstabilityState || {}
);

export const getTalentInstabilityState = (player: Player): TalentInstabilityState => {
    const previous = getPreviousState(player);
    const studios = getProductionStudios(player);
    const worldState = player.flags?.worldReactionState || getWorldReactionState(player);
    const regulatorState = player.flags?.regulatorPressureState || {};
    const averageMorale = getAverageMorale(studios);
    const acquiredStudioCount = getAcquiredStudioCount(player);
    const retentionShieldWeeksRemaining = Math.max(0, Math.round(previous.retentionShieldWeeksRemaining || 0));
    const shieldRelief = retentionShieldWeeksRemaining > 0 ? 22 : 0;
    const moralePressure = clamp(72 - averageMorale, 0, 42);
    const acquisitionPressure = acquiredStudioCount * 8;
    const worldPressure = Math.max(0, Number(worldState.employeeDepartureRisk || 0)) * 0.62;
    const regulatorPressure = Math.max(0, Number(regulatorState.pressureScore || 0)) * 0.18;
    const scalePressure = Math.max(0, studios.length - 1) * 5;
    const pressureScore = round(clamp(worldPressure + regulatorPressure + moralePressure + acquisitionPressure + scalePressure - shieldRelief));

    return {
        lastProcessedWeek: previous.lastProcessedWeek || 0,
        pressureScore,
        departureRisk: round(clamp(pressureScore + moralePressure * 0.7 + Math.max(0, acquiredStudioCount - 1) * 4)),
        averageMorale,
        controlledStudioCount: studios.length,
        acquiredStudioCount,
        retentionShieldWeeksRemaining,
        totalDepartures: Math.max(0, Math.round(previous.totalDepartures || 0)),
        departures: Array.isArray(previous.departures) ? previous.departures.slice(0, 12) : [],
        lastTalentInstabilityChoiceWeek: previous.lastTalentInstabilityChoiceWeek,
        lastTalentInstabilityEventWeek: previous.lastTalentInstabilityEventWeek,
    };
};

const persistTalentInstabilityState = (
    player: Player,
    updates: Partial<TalentInstabilityState>,
): Player => {
    const current = getTalentInstabilityState(player);
    const nextState: TalentInstabilityState = {
        ...current,
        ...updates,
        pressureScore: clamp(updates.pressureScore ?? current.pressureScore),
        departureRisk: clamp(updates.departureRisk ?? current.departureRisk),
        averageMorale: clamp(updates.averageMorale ?? current.averageMorale),
        retentionShieldWeeksRemaining: Math.max(0, Math.round(updates.retentionShieldWeeksRemaining ?? current.retentionShieldWeeksRemaining)),
        totalDepartures: Math.max(0, Math.round(updates.totalDepartures ?? current.totalDepartures)),
        departures: Array.isArray(updates.departures) ? updates.departures.slice(0, 12) : current.departures.slice(0, 12),
        lastTalentInstabilityChoiceWeek: updates.lastTalentInstabilityChoiceWeek ?? player.currentWeek,
    };
    return {
        ...player,
        flags: {
            ...player.flags,
            talentInstabilityState: nextState,
        },
    };
};

const applyStudioStaffMorale = (player: Player, delta: number): Player => ({
    ...player,
    businesses: (player.businesses || []).map(studio => studio.type !== 'PRODUCTION_HOUSE'
        ? studio
        : {
            ...studio,
            stats: {
                ...studio.stats,
                riskLevel: clamp((studio.stats?.riskLevel ?? 30) + (delta < 0 ? 2 : -1)),
                investorConfidence: clamp((studio.stats?.investorConfidence ?? 55) + (delta > 0 ? 1 : -1)),
            },
            staff: (studio.staff || []).map(staff => ({
                ...staff,
                morale: clamp((staff.morale ?? 50) + delta),
            })),
        }),
});

const chooseDepartureCandidate = (player: Player): { studio: Business; staff: BusinessStaff } | null => {
    const candidates = getProductionStudios(player)
        .flatMap(studio => (studio.staff || [])
            .filter(staff => staff.id && staff.name)
            .map(staff => ({ studio, staff })));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => {
        const aScore = (100 - (a.staff.morale ?? 50)) + ((a.staff.salary || 0) / 100_000) + ((a.staff.skill || 50) / 12);
        const bScore = (100 - (b.staff.morale ?? 50)) + ((b.staff.salary || 0) / 100_000) + ((b.staff.skill || 50) / 12);
        return bScore - aScore;
    })[0];
};

const applyStaffDeparture = (player: Player, reason: string): { player: Player; departure?: TalentDepartureRecord } => {
    const candidate = chooseDepartureCandidate(player);
    if (!candidate) return { player };
    const departure: TalentDepartureRecord = {
        id: `talent_departure_${candidate.staff.id}_${player.age}_${player.currentWeek}`,
        studioId: candidate.studio.id,
        studioName: candidate.studio.name,
        staffId: candidate.staff.id,
        staffName: candidate.staff.name,
        role: candidate.staff.role,
        week: player.currentWeek,
        year: player.age,
        reason,
    };
    const current = getTalentInstabilityState(player);
    const withDeparture: Player = {
        ...player,
        businesses: (player.businesses || []).map(studio => studio.id !== candidate.studio.id
            ? studio
            : {
                ...studio,
                stats: {
                    ...studio.stats,
                    riskLevel: clamp((studio.stats?.riskLevel ?? 30) + 5),
                    investorConfidence: clamp((studio.stats?.investorConfidence ?? 55) - 3),
                    studioMomentum: clamp((studio.stats?.studioMomentum ?? 55) - 4),
                },
                staff: (studio.staff || []).filter(staff => staff.id !== candidate.staff.id),
            }),
    };

    return {
        player: persistTalentInstabilityState(withDeparture, {
            pressureScore: current.pressureScore + 6,
            departureRisk: current.departureRisk + 10,
            totalDepartures: current.totalDepartures + 1,
            departures: [departure, ...current.departures],
        }),
        departure,
    };
};

const makeChoiceImpact = (
    mode: 'RETENTION' | 'HOLD' | 'GOLDEN',
): ((player: Player) => LifeEventImpactResult) => (player: Player) => {
    const state = getTalentInstabilityState(player);
    const effects = [];
    let updatedPlayer = player;
    let log = 'Talent Instability handled.';
    let logKey = 'life.event.talent.log.default';

    if (mode === 'RETENTION') {
        const cost = Math.min(player.money, Math.max(8_000_000, state.controlledStudioCount * 6_000_000));
        updatedPlayer = persistTalentInstabilityState(applyStudioStaffMorale({
            ...player,
            money: player.money - cost,
        }, 8), {
            pressureScore: state.pressureScore - 14,
            departureRisk: state.departureRisk - 18,
            retentionShieldWeeksRemaining: Math.max(state.retentionShieldWeeksRemaining, 8),
        });
        log = `Talent Instability: Retention packages calmed acquired studio teams.`;
        logKey = 'life.event.talent.log.retention';
        effects.push({ label: 'Departure Risk', labelKey: 'life.effect.departureRisk', value: '-18', tone: 'positive' as const });
        effects.push({ label: 'Retention Spend', labelKey: 'life.effect.retentionSpend', value: `$${cost.toLocaleString()}`, tone: 'negative' as const });
    } else if (mode === 'HOLD') {
        const departure = applyStaffDeparture(applyStudioStaffMorale(player, -6), 'Leadership uncertainty after acquisition');
        updatedPlayer = departure.player;
        log = departure.departure
            ? `Talent Instability: ${departure.departure.staffName} left ${departure.departure.studioName}.`
            : `Talent Instability: Staff confidence fell, but no key employee left this week.`;
        logKey = departure.departure ? 'life.event.talent.log.departure' : 'life.event.talent.log.confidence';
        effects.push({ label: 'Cash', labelKey: 'life.effect.cash', value: 'Preserved', tone: 'positive' as const });
        effects.push({ label: 'Departure', labelKey: 'life.effect.departure', value: departure.departure ? departure.departure.role : 'Risk raised', tone: 'negative' as const });
    } else {
        const cost = Math.min(player.money, Math.max(18_000_000, state.controlledStudioCount * 10_000_000));
        updatedPlayer = persistTalentInstabilityState(applyStudioStaffMorale({
            ...player,
            money: player.money - cost,
            stats: {
                ...player.stats,
                reputation: clamp((player.stats.reputation || 0) + 2),
            },
        }, 12), {
            pressureScore: state.pressureScore - 24,
            departureRisk: state.departureRisk - 30,
            retentionShieldWeeksRemaining: Math.max(state.retentionShieldWeeksRemaining, 12),
        });
        log = `Talent Instability: Advisors built a clean retention war room and protected the studio teams.`;
        logKey = 'life.event.talent.log.golden';
        effects.push({ label: 'Departure Risk', labelKey: 'life.effect.departureRisk', value: '-30', tone: 'positive' as const });
        effects.push({ label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Safest path', tone: 'positive' as const });
    }

    return { updatedPlayer, log, logKey, logVars: { staff: (updatedPlayer as any).lastDepartedStaff || '' }, effects };
};

const makeTalentNews = (player: Player, state: TalentInstabilityState, language: GameLanguage): NewsItem => ({
    id: `news_talent_instability_${player.age}_${player.currentWeek}`,
    headline: t(language, state.departureRisk >= 65
        ? 'services.talentInstability.news.highHeadline'
        : 'services.talentInstability.news.mediumHeadline', { player: player.name }),
    subtext: t(language, 'services.talentInstability.news.subtext', {
        controlledStudios: state.controlledStudioCount,
        acquiredLabels: state.acquiredStudioCount,
        morale: state.averageMorale,
    }),
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: state.departureRisk >= 65 ? 'HIGH' : 'MEDIUM',
});

const makeTalentPost = (player: Player, state: TalentInstabilityState, language: GameLanguage): XPost => ({
    id: `x_talent_instability_${player.age}_${player.currentWeek}`,
    authorId: 'below_the_line',
    authorName: 'Below The Line Watch',
    authorHandle: '@btlinewatch',
    authorAvatar: 'BTL',
    content: t(language, state.departureRisk >= 65
        ? 'services.talentInstability.social.high'
        : 'services.talentInstability.social.medium', { player: player.name }),
    timestamp: Date.now(),
    likes: 1_800 + state.departureRisk * 70,
    retweets: 220 + state.pressureScore * 12,
    replies: 180 + state.departureRisk * 10,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    sentiment: state.departureRisk >= 65 ? 'MESSY' : 'INDUSTRY',
});

const createTalentInstabilityEvent = (
    player: Player,
    state: TalentInstabilityState,
    language: GameLanguage,
): ScheduledEvent | null => {
    if (state.departureRisk < 45 || state.controlledStudioCount < 2) return null;
    const type: TalentInstabilityEventType = state.departureRisk >= 65 ? 'KEY_STAFF_EXIT_RISK' : 'RETENTION_CRISIS';
    const titleKey = type === 'KEY_STAFF_EXIT_RISK' ? 'life.event.talent.exitRisk.title' : 'life.event.talent.retention.title';
    const textVars = { morale: state.averageMorale };
    const lifeEvent: LifeEvent = {
        id: `life_talent_instability_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        type: 'NETWORKING',
        title: t(language, titleKey),
        titleKey,
        category: t(language, 'life.event.talent.category'),
        description: t(language, 'life.event.talent.description', textVars),
        descriptionKey: 'life.event.talent.description',
        textVars,
        options: [
            {
                id: 'RETENTION_PACKAGE',
                label: 'Approve Retention Package',
                labelKey: 'life.event.talent.retentionPackage.label',
                description: 'Spend money on bonuses, contract reassurance, and clearer reporting lines.',
                descriptionKey: 'life.event.talent.retentionPackage.description',
                previewEffects: [
                    { label: 'Departure Risk', labelKey: 'life.effect.departureRisk', value: '-18', tone: 'positive' },
                    { label: 'Cost', labelKey: 'life.effect.cost', value: 'Retention spend', tone: 'negative' },
                ],
                impact: makeChoiceImpact('RETENTION'),
            },
            {
                id: 'HOLD_THE_LINE',
                label: 'Hold The Line',
                labelKey: 'life.event.talent.hold.label',
                description: 'Protect cash and accept that one unhappy executive or senior staffer may leave.',
                descriptionKey: 'life.event.talent.hold.description',
                previewEffects: [
                    { label: 'Cash', labelKey: 'life.effect.cash', value: 'Preserved', tone: 'positive' },
                    { label: 'Departure', labelKey: 'life.effect.departure', value: 'Likely', tone: 'negative' },
                ],
                impact: makeChoiceImpact('HOLD'),
            },
            {
                id: 'GOLDEN_RETENTION_WAR_ROOM',
                label: 'Clean Retention War Room',
                labelKey: 'life.event.talent.golden.label',
                description: 'Reward ad: advisors handle messaging, contracts, and leadership reassurance safely.',
                descriptionKey: 'life.event.talent.golden.description',
                isGolden: true,
                previewEffects: [
                    { label: 'Departure Risk', labelKey: 'life.effect.departureRisk', value: '-30', tone: 'positive' },
                    { label: 'Risk', labelKey: 'life.effect.risk', value: 'Safest path', tone: 'positive' },
                ],
                impact: makeChoiceImpact('GOLDEN'),
            },
        ],
    };

    return {
        id: `event_talent_instability_${type.toLowerCase()}_${player.age}_${player.currentWeek}`,
        week: player.currentWeek,
        type: 'LIFE_EVENT',
        title: t(language, titleKey),
        description: t(language, 'life.event.talent.description', textVars),
        data: {
            talentInstabilityEventType: type,
            lifeEvent,
        },
    };
};

export const processTalentInstability = (player: Player): Player => {
    const previousState = player.flags?.talentInstabilityState as TalentInstabilityState | undefined;
    if (previousState?.lastProcessedWeek === player.currentWeek) {
        return {
            ...player,
            flags: {
                ...player.flags,
                talentInstabilityState: previousState,
            },
        };
    }

    const state = getTalentInstabilityState(player);
    const language = getPlayerLanguage(player);
    const decayedShield = Math.max(0, state.retentionShieldWeeksRemaining - 1);
    const nextState: TalentInstabilityState = {
        ...state,
        lastProcessedWeek: player.currentWeek,
        retentionShieldWeeksRemaining: decayedShield,
        lastTalentInstabilityEventWeek: state.departureRisk >= 45 ? player.currentWeek : state.lastTalentInstabilityEventWeek,
    };
    const shouldPublish = state.departureRisk >= 42 && state.controlledStudioCount >= 2;
    const news = shouldPublish ? makeTalentNews(player, state, language) : undefined;
    const xPost = shouldPublish ? makeTalentPost(player, state, language) : undefined;
    const event = shouldPublish ? createTalentInstabilityEvent(player, state, language) : null;
    const existingPendingEvents = Array.isArray(player.pendingEvents) ? player.pendingEvents : [];
    const cadence = queueAcquisitionPressureEvent(
        player,
        existingPendingEvents,
        event,
        'TALENT_INSTABILITY',
        event?.data?.talentInstabilityEventType,
        candidate => existingPendingEvents.some(pending => pending.id === candidate.id || pending.data?.talentInstabilityEventType),
    );

    return {
        ...player,
        flags: {
            ...cadence.flags,
            talentInstabilityState: nextState,
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
            message: t(language, 'services.talentInstability.log.weekly', {
                risk: state.departureRisk,
                studios: state.controlledStudioCount,
            }),
            type: state.departureRisk >= 65 ? 'negative' as const : 'neutral' as const,
        }, ...(player.logs || [])].slice(0, 50),
    };
};
