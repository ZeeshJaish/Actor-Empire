import type { Player } from '../types';
import { sanitizeAwardRecords } from './awardLogic';
import { migratePlayerSave } from './saveMigration';
import { normalizeUniverseMap } from './universeLogic';

const finalizePlayerUiState = (player: Player): Player => ({
    ...player,
    world: {
        ...player.world,
        universes: normalizeUniverseMap(player.world?.universes),
    },
    awards: sanitizeAwardRecords(player.awards || []),
    pastProjects: (player.pastProjects || []).map(project => ({
        ...project,
        awards: sanitizeAwardRecords(project.awards || []),
    })),
});

/** Use for imported, loaded, cheat, and component-originated state that may be legacy or partial. */
export const prepareExternalPlayerUpdateForUi = (player: Player): Player => (
    finalizePlayerUiState(migratePlayerSave(player))
);

/** Use only after processGameWeek and persistence have produced a canonical current-schema player. */
export const prepareProcessedWeekForUi = (player: Player): Player => (
    finalizePlayerUiState(player)
);
