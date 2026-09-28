import type { Player } from '../types';
import { createArchiveRoot, verifyArchiveRoot, type CareerArchiveRoot } from './careerArchive';

/**
 * Archive migration is intentionally opt-in. No gameplay collection is
 * certified for removal yet, so this foundation can only create an empty
 * archive root. Existing archive-backed saves must retain their exact root.
 */
export const CAREER_ARCHIVE_MIGRATION_VERSION = 1;
export const CERTIFIED_CAREER_ARCHIVE_DOMAINS = [] as const;

export type PreparedArchiveMigration = {
  player: Player;
  archiveRoot?: CareerArchiveRoot;
  migrationActivated: boolean;
};

export const prepareArchiveMigration = async (
  player: Player,
  slotKey: string,
  existingRoot?: CareerArchiveRoot,
  options: { enableEmptyArchive?: boolean } = {},
): Promise<PreparedArchiveMigration> => {
  const marker = player.flags?.careerArchiveRootDigest;
  if (marker !== undefined || existingRoot !== undefined) {
    if (!existingRoot || typeof marker !== 'string' || marker !== existingRoot.digest
      || existingRoot.slotKey !== slotKey || existingRoot.playerId !== player.id
      || !(await verifyArchiveRoot(existingRoot))) {
      throw new Error('Career archive root is missing or does not match the player.');
    }
    return { player, archiveRoot: existingRoot, migrationActivated: true };
  }

  if (!options.enableEmptyArchive) {
    return { player, migrationActivated: false };
  }

  // Creating the empty root proves migration/promotion compatibility without
  // shortening any Player array or enabling a history domain prematurely.
  const archiveRoot = await createArchiveRoot(slotKey, player.id, []);
  return {
    player: {
      ...player,
      flags: {
        ...player.flags,
        careerArchiveMigrationVersion: CAREER_ARCHIVE_MIGRATION_VERSION,
        careerArchiveRootDigest: archiveRoot.digest,
      },
    },
    archiveRoot,
    migrationActivated: true,
  };
};
