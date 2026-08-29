import { INITIAL_PLAYER, type Player, type WorldState } from '../../types';

export const createPlatformAiFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    return {
        ...player,
        id: 'platform-ai-audit-player',
        age: 40,
        currentWeek: 12,
        world: structuredClone(INITIAL_PLAYER.world) as WorldState,
    };
};
