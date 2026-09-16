import type { Player } from '../types';
import { createDeterministicRng } from './deterministicRandom';

export const createWeekSimulationSeed = (player: Player, targetAbsoluteWeek: number): string => {
    const migrationVersion = Math.max(0, Math.round(Number(player.flags?.saveMigrationVersion) || 0));
    const persistedNonce = String(player.ownedStreamingPlatform?.simulationSeed || player.id || 'player');
    return [
        'process-week-v1',
        player.id || 'player',
        Math.max(0, Math.round(Number(targetAbsoluteWeek) || 0)),
        migrationVersion,
        persistedNonce,
    ].join(':');
};

export const createWeekScopedRng = (weekSeed: string, scope: string): (() => number) => (
    createDeterministicRng(`${weekSeed}:${scope}`)
);

export const getCanonicalWorldEconomyDigest = (player: Player): object => ({
    worldPopulation: player.world.worldPopulation,
    worldAudienceEconomy: player.world.worldAudienceEconomy,
    worldAudienceParticipation: player.world.worldAudienceParticipation,
    worldStreamingCompetition: player.world.worldStreamingCompetition,
    worldStreamingCustomers: player.world.worldStreamingCustomers,
    worldStreamingViewing: player.world.worldStreamingViewing,
    worldStreamingPlatformEconomy: player.world.worldStreamingPlatformEconomy,
});
