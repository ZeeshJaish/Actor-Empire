import type {
  OwnedStreamingBoardDirector,
  OwnedStreamingCapitalAction,
  OwnedStreamingEquityPosition,
  OwnedStreamingLedgerEntry,
  Player,
} from '../types';
import type { Raise } from '../components/streaming-transplant/StreamingRaiseExperience';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
  compactOwnedStreamingPlatformForPersistence,
  normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { contributeStreamingFounderCapital } from './streamingCompany';

export interface CommitStreamingRaiseResult {
  player: Player;
  changed: boolean;
  reason:
    | 'COMMITTED'
    | 'INVALID_STATE'
    | 'INVALID_TERMS'
    | 'INSUFFICIENT_CASH'
    | 'CONTROL_LIMIT'
    | 'ALREADY_COMMITTED'
    | 'BANK_SYSTEM_ONLY'
    | 'CFO_REQUIRED';
}

const cleanKey = (value: string): string => value.replace(/[^a-z0-9:_-]/gi, '-').slice(0, 160);

export const commitStreamingRaise = (
  player: Player,
  raise: Raise,
): CommitStreamingRaiseResult => {
  const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  if (!platform.identity || !platform.foundingProfile) {
    return { player, changed: false, reason: 'INVALID_STATE' };
  }
  const amount = Math.max(0, Math.round(Number(raise.amount) || 0));
  if (!amount) return { player, changed: false, reason: 'INVALID_TERMS' };
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const key = cleanKey(`streaming-raise:${raise.kind}:${raise.id}`);
  if (platform.finance.capitalActions.some(action => action.idempotencyKey === key)) {
    return { player, changed: false, reason: 'ALREADY_COMMITTED' };
  }

  if (raise.kind === 'FOUNDER') {
    const result = contributeStreamingFounderCapital(player, amount, key);
    return {
      player: result.player,
      changed: result.changed,
      reason: result.changed
        ? 'COMMITTED'
        : result.reason === 'INSUFFICIENT_CASH'
          ? 'INSUFFICIENT_CASH'
          : result.reason === 'ALREADY_COMMITTED'
            ? 'ALREADY_COMMITTED'
            : 'INVALID_TERMS',
    };
  }

  // EMPIRE+ does not maintain a second, disconnected loan marketplace. The
  // existing Bank funds the founder personally; the founder can then inject
  // that cash into the company through the canonical Finance Room.
  if (raise.kind === 'DEBT') {
    return { player, changed: false, reason: 'BANK_SYSTEM_ONLY' };
  }

  const hasCfo = platform.leadership.appointments.some(appointment => (
    appointment.status === 'ACTIVE' && appointment.role === 'CFO'
  ));
  if (!hasCfo) {
    return { player, changed: false, reason: 'CFO_REQUIRED' };
  }

  const ownershipBefore = platform.founderOwnershipPercent;
  const equityPercent = Math.max(0, Math.min(49, Number(raise.pct) || 0));
  const ownershipAfter = Math.max(0, ownershipBefore - equityPercent);
  if (equityPercent <= 0 || ownershipAfter < 25) {
    return { player, changed: false, reason: 'CONTROL_LIMIT' };
  }

  const capitalAction: OwnedStreamingCapitalAction = {
    id: createDeterministicId('streaming_capital', platform.simulationSeed, key),
    idempotencyKey: key,
    type: 'EQUITY_ISSUANCE',
    absoluteWeek,
    amount,
    treasuryDelta: amount,
    personalCashDelta: 0,
    debtDelta: 0,
    ownershipBefore,
    ownershipAfter,
  };
  const equity: OwnedStreamingEquityPosition = {
    id: createDeterministicId('streaming_equity', platform.simulationSeed, key),
    holderName: raise.investor || 'Growth investor',
    ownershipPercent: equityPercent,
    investedCapital: amount,
    issuedAtAbsoluteWeek: absoluteWeek,
  };
  const director: OwnedStreamingBoardDirector = {
    id: createDeterministicId('streaming_board_director', platform.simulationSeed, key),
    candidateId: `${equity.id}:nominee`,
    name: `${equity.holderName} nominee`,
    seatType: 'INVESTOR_NOMINEE',
    status: 'ACTIVE',
    preferredStrategy: 'GROWTH_FIRST',
    independence: 30,
    founderRelationship: 52,
    weeklyCompensation: 0,
    appointedAtAbsoluteWeek: absoluteWeek,
    endedAtAbsoluteWeek: null,
    linkedInvestorId: equity.id,
  };
  const ledger: OwnedStreamingLedgerEntry = {
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type: 'EQUITY_ISSUED',
    summary: `${equity.holderName} invested in ${platform.identity.name}.`,
    source: 'PLAYER_ACTION',
    metadata: {
      amount,
      ownershipPercent: equityPercent,
      ownershipAfter,
    },
  };

  const nextPlatform = compactOwnedStreamingPlatformForPersistence({
    ...platform,
    treasuryCash: platform.treasuryCash + amount,
    debtPrincipal: platform.debtPrincipal,
    founderOwnershipPercent: ownershipAfter,
    finance: {
      ...platform.finance,
      capitalActions: [...platform.finance.capitalActions, capitalAction],
      loans: platform.finance.loans,
      equityHolders: [...platform.finance.equityHolders, equity],
    },
    governance: {
      ...platform.governance,
      directors: [...platform.governance.directors, director],
    },
    eventLedger: [...platform.eventLedger, ledger],
  }, player.id);
  return {
    changed: true,
    reason: 'COMMITTED',
    player: { ...player, ownedStreamingPlatform: nextPlatform },
  };
};
