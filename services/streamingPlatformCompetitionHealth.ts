import type {
    Player,
    StreamingEcosystemStartingClass,
    StreamingPlatformEcosystemState,
} from '../types';
import { createDeterministicRng } from './deterministicRandom';

const clamp = (value: number, min: number, max: number): number => (
    Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
);

export interface StreamingCompetitionHealth {
    launchPressure: number;
    activeGlobalGiants: number;
    visibleInternationalChallengers: number;
    underservedCountryIds: string[];
    concentrationScore: number;
    reasons: Array<'INSUFFICIENT_GLOBAL_GIANTS' | 'HIGH_CONCENTRATION' | 'UNDERSERVED_REGIONS' | 'HEALTHY'>;
}

export interface ChooseStreamingEcosystemLaunchClassInput {
    playerId: string;
    state: StreamingPlatformEcosystemState;
    health: StreamingCompetitionHealth;
    absoluteWeek: number;
}

const isOperating = (lifecycle: string): boolean => !['CLOSED', 'ACQUIRED'].includes(lifecycle);

export const calculateStreamingCompetitionHealth = (
    player: Pick<Player, 'world'>,
    state: StreamingPlatformEcosystemState,
): StreamingCompetitionHealth => {
    const activeOperators = Object.values(state.operators).filter(operator => isOperating(operator.lifecycle));
    const activeGlobalGiants = activeOperators.filter(operator => {
        const subscribers = operator.corePlatformId
            ? player.world.platforms?.[operator.corePlatformId]?.subscribers ?? operator.subscriberMillions
            : operator.subscriberMillions;
        return (operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL' || operator.startingClass === 'GLOBAL_ENTRANT')
            && operator.activeCountryIds.length >= 3
            && subscribers >= 20;
    }).length;
    const visibleInternationalChallengers = activeOperators.filter(operator => (
        !['CORE_GLOBAL', 'GLOBAL_REAL'].includes(operator.kind)
        && operator.activeCountryIds.length >= 3
        && (operator.subscriberMillions >= 12 || operator.valuationBillions >= 2)
    )).length;
    const marketConcentrations: number[] = [];
    const underservedCountryIds: string[] = [];
    for (const market of Object.values(state.markets)) {
        const activeShares = market.shares.filter(share => (
            isOperating(state.operators[share.operatorId]?.lifecycle || 'CLOSED')
            && share.sharePercent > 0
        ));
        const meaningfulNamedCount = activeShares.filter(share => share.sharePercent >= 2.5).length;
        if (meaningfulNamedCount < 4) underservedCountryIds.push(market.countryId);
        const fractions = [...activeShares.map(share => share.sharePercent), market.othersSharePercent]
            .map(share => clamp(share, 0, 100) / 100);
        marketConcentrations.push(clamp(
            fractions.reduce((sum, fraction) => sum + fraction * fraction, 0),
            0,
            1,
        ));
    }
    const concentrationScore = marketConcentrations.length
        ? marketConcentrations.reduce((sum, value) => sum + value, 0) / marketConcentrations.length
        : 1;
    const recentFloor = Math.max(0, state.lastProcessedAbsoluteWeek - 104);
    const recentEvents = state.eventHistory.filter(event => event.absoluteWeek >= recentFloor);
    const recentLosses = recentEvents.filter(event => ['CLOSED', 'ACQUIRED'].includes(event.type)).length;
    const recentSupply = recentEvents.filter(event => ['LAUNCH', 'PROMOTED'].includes(event.type)).length;
    const giantGap = clamp((4 - activeGlobalGiants) / 4, 0, 1);
    const challengerGap = clamp((3 - visibleInternationalChallengers) / 3, 0, 1);
    const underservedShare = Object.keys(state.markets).length
        ? underservedCountryIds.length / Object.keys(state.markets).length
        : 1;
    const concentrationPressure = clamp((concentrationScore - 0.2) / 0.45, 0, 1);
    const launchPressure = clamp(
        giantGap * 0.38
        + challengerGap * 0.17
        + underservedShare * 0.2
        + concentrationPressure * 0.2
        + clamp(recentLosses / 4, 0, 1) * 0.1
        - clamp(recentSupply / 4, 0, 1) * 0.05,
        0,
        1,
    );
    const reasons: StreamingCompetitionHealth['reasons'] = [];
    if (activeGlobalGiants < 4) reasons.push('INSUFFICIENT_GLOBAL_GIANTS');
    if (concentrationScore >= 0.32) reasons.push('HIGH_CONCENTRATION');
    if (underservedShare >= 0.25) reasons.push('UNDERSERVED_REGIONS');
    if (!reasons.length) reasons.push('HEALTHY');
    return {
        launchPressure: Math.round(launchPressure * 10_000) / 10_000,
        activeGlobalGiants,
        visibleInternationalChallengers,
        underservedCountryIds: underservedCountryIds.sort(),
        concentrationScore: Math.round(concentrationScore * 10_000) / 10_000,
        reasons,
    };
};

export const chooseStreamingEcosystemLaunchClass = (
    input: ChooseStreamingEcosystemLaunchClassInput,
): StreamingEcosystemStartingClass => {
    const activeGenerated = Object.values(input.state.operators).filter(operator => (
        operator.kind === 'DYNAMIC_FICTIONAL' && isOperating(operator.lifecycle)
    ));
    if (activeGenerated.length >= 23) return 'LOCAL_STARTUP';
    const fictionalGlobals = activeGenerated.filter(operator => operator.startingClass === 'GLOBAL_ENTRANT').length;
    const rng = createDeterministicRng([
        input.playerId,
        'streaming-ecosystem-launch-class',
        input.state.launchSequence,
        input.absoluteWeek,
        input.health.launchPressure,
        input.health.activeGlobalGiants,
    ].join(':'));
    const roll = rng();
    if (input.health.launchPressure >= 0.72
        && input.health.activeGlobalGiants < 4
        && fictionalGlobals < 3
        && roll < 0.08 + input.health.launchPressure * 0.2) {
        return 'GLOBAL_ENTRANT';
    }
    if (input.health.launchPressure >= 0.5 && roll < 0.38 + input.health.launchPressure * 0.28) {
        return 'CORPORATE_ENTRANT';
    }
    if (input.health.launchPressure >= 0.24 || roll < 0.42) return 'REGIONAL_CHALLENGER';
    return 'LOCAL_STARTUP';
};
