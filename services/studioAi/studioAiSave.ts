import type { Player, WorldState } from '../../types';
import { ensureStudioEcosystem } from '../studioEcosystem';
import { reconcileStudioAiController } from './studioAiControl';
import { migrateNpcVentureToStudio } from './studioAiMigration';

/** Normalizes identity and runtime metadata only; loading a save never charges a week. */
export const normalizeWorldStudioAiForSave = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): WorldState => {
    const nextWorld = ensureStudioEcosystem(world);
    Object.values(nextWorld.npcVentures || {}).forEach(venture => {
        nextWorld.studios![venture.id] = migrateNpcVentureToStudio(
            venture,
            nextWorld.studios![venture.id],
            absoluteWeek,
        );
    });
    Object.keys(nextWorld.studios || {}).sort().forEach(studioId => {
        nextWorld.studios![studioId] = reconcileStudioAiController(
            nextWorld.studios![studioId],
            player,
            absoluteWeek,
        );
    });
    return nextWorld;
};
