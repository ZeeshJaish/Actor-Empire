import type { Player } from '../types';
import { syncEnergyDisplay } from './premiumLogic';

export const MIGRATION_CARE_PACKAGE_CASH = 20000;
export const MIGRATION_CARE_PACKAGE_ENERGY = 200;
export const MIGRATION_CARE_PACKAGE_VERSION = 1;

const DEVICE_LEDGER_KEY = 'aeMigrationCarePackageLedgerV1';

interface CarePackageLedger {
  globalClaimed: boolean;
  fingerprints: string[];
  claimedAt?: string;
}

export interface MigrationCarePackageResult {
  player: Player;
  granted: boolean;
  reason?: string;
}

const readDeviceLedger = (): CarePackageLedger => {
  try {
    const raw = localStorage.getItem(DEVICE_LEDGER_KEY);
    if (!raw) return { globalClaimed: false, fingerprints: [] };
    const parsed = JSON.parse(raw) as Partial<CarePackageLedger>;
    return {
      globalClaimed: parsed.globalClaimed === true,
      fingerprints: Array.isArray(parsed.fingerprints) ? parsed.fingerprints.filter(item => typeof item === 'string') : [],
      claimedAt: typeof parsed.claimedAt === 'string' ? parsed.claimedAt : undefined,
    };
  } catch {
    return { globalClaimed: false, fingerprints: [] };
  }
};

const writeDeviceLedger = (ledger: CarePackageLedger) => {
  try {
    localStorage.setItem(DEVICE_LEDGER_KEY, JSON.stringify({
      globalClaimed: ledger.globalClaimed,
      fingerprints: ledger.fingerprints.slice(-24),
      claimedAt: ledger.claimedAt,
    }));
  } catch {
    // Save-level flags still prevent repeated claims for the imported save.
  }
};

const hasRealProgress = (player: Player): boolean => (
  player.currentWeek > 1
  || player.age > 18
  || player.money !== 2000
  || (Array.isArray(player.pastProjects) && player.pastProjects.length > 0)
  || (Array.isArray(player.activeReleases) && player.activeReleases.length > 0)
  || (Array.isArray(player.awards) && player.awards.length > 0)
  || (Array.isArray(player.businesses) && player.businesses.length > 0)
  || (Array.isArray(player.relationships) && player.relationships.length > 2)
  || (Array.isArray(player.logs) && player.logs.length > 2)
  || (Array.isArray(player.assets) && player.assets.length > 0)
);

const isLegacyMigratedProgress = (player: Player): boolean => {
  const saveMigrationVersion = Number(player.flags?.previousSaveMigrationVersion || player.flags?.saveMigrationVersion || 0);
  return saveMigrationVersion > 0 && saveMigrationVersion < 14 && hasRealProgress(player);
};

const isCarePackageEligible = (player: Player, source: string, allowLegacyVersionFallback: boolean): boolean => (
  player.flags?.migrationCarePackageEligible === true
  || Boolean(player.flags?.saveTransferImportedAt)
  || source === 'save-transfer-import'
  || source.startsWith('legacy-')
  || (allowLegacyVersionFallback && isLegacyMigratedProgress(player))
);

export const markSaveTransferImported = (
  player: Player,
  metadata: { sourceFingerprint?: string; archiveAppVersion?: string; importedAt?: string } = {},
): Player => {
  const next = player;
  next.flags = {
    ...(next.flags || {}),
    migrationCarePackageEligible: true,
    saveTransferImportedAt: metadata.importedAt || new Date().toISOString(),
    saveTransferSourceFingerprint: metadata.sourceFingerprint,
    saveTransferArchiveAppVersion: metadata.archiveAppVersion,
  };
  return next;
};

export const grantMigrationCarePackageIfEligible = (
  player: Player,
  options: {
    source: 'save-transfer-import' | 'indexeddb-slot' | 'legacy-indexeddb' | 'legacy-localstorage' | 'legacy-single-localstorage';
    sourceFingerprint?: string;
    allowLegacyVersionFallback?: boolean;
  },
): MigrationCarePackageResult => {
  const next = player;
  next.flags = next.flags || {};

  if (next.flags.migrationCarePackageClaimed === true) {
    return { player: next, granted: false, reason: 'save_already_claimed' };
  }

  if (!isCarePackageEligible(next, options.source, options.allowLegacyVersionFallback === true)) {
    return { player: next, granted: false, reason: 'not_eligible' };
  }

  const ledger = readDeviceLedger();
  const sourceFingerprint = options.sourceFingerprint || next.flags.saveTransferSourceFingerprint;

  if (ledger.globalClaimed || (sourceFingerprint && ledger.fingerprints.includes(sourceFingerprint))) {
    return { player: next, granted: false, reason: 'device_already_claimed' };
  }

  const now = new Date().toISOString();
  next.money = Math.max(0, Number(next.money || 0)) + MIGRATION_CARE_PACKAGE_CASH;
  next.flags.weeklyBaseEnergyRemaining = Math.max(0, Number(next.flags.weeklyBaseEnergyRemaining || 0));
  next.flags.bonusEnergyBank = Math.max(0, Number(next.flags.bonusEnergyBank || 0)) + MIGRATION_CARE_PACKAGE_ENERGY;
  next.flags.migrationCarePackageClaimed = true;
  next.flags.migrationCarePackageVersion = MIGRATION_CARE_PACKAGE_VERSION;
  next.flags.migrationCarePackageClaimedAt = now;
  next.flags.migrationCarePackageCash = MIGRATION_CARE_PACKAGE_CASH;
  next.flags.migrationCarePackageEnergy = MIGRATION_CARE_PACKAGE_ENERGY;
  if (sourceFingerprint) next.flags.migrationCarePackageSourceFingerprint = sourceFingerprint;
  syncEnergyDisplay(next);

  next.logs = [
    {
      week: next.currentWeek,
      year: next.age,
      message: `🎁 Migration Care Package received: $${MIGRATION_CARE_PACKAGE_CASH.toLocaleString()} cash and ${MIGRATION_CARE_PACKAGE_ENERGY} bonus energy.`,
      type: 'positive' as const,
    },
    ...(Array.isArray(next.logs) ? next.logs : []),
  ].slice(0, 50);

  writeDeviceLedger({
    globalClaimed: true,
    fingerprints: sourceFingerprint
      ? Array.from(new Set([...ledger.fingerprints, sourceFingerprint]))
      : ledger.fingerprints,
    claimedAt: now,
  });

  return { player: next, granted: true };
};
