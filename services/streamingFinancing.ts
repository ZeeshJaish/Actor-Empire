import type {
  OwnedStreamingBoardDirector,
  OwnedStreamingCapitalAction,
  OwnedStreamingEquityPosition,
  OwnedStreamingLedgerEntry,
  OwnedStreamingLoanPosition,
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
  reason: 'COMMITTED' | 'INVALID_STATE' | 'INVALID_TERMS' | 'INSUFFICIENT_CASH' | 'CONTROL_LIMIT' | 'ALREADY_COMMITTED';
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

  const ownershipBefore = platform.founderOwnershipPercent;
  const equityPercent = raise.kind === 'EQUITY'
    ? Math.max(0, Math.min(49, Number(raise.pct) || 0))
    : 0;
  const ownershipAfter = Math.max(0, ownershipBefore - equityPercent);
  if (raise.kind === 'EQUITY' && (equityPercent <= 0 || ownershipAfter < 25)) {
    return { player, changed: false, reason: 'CONTROL_LIMIT' };
  }

  const capitalAction: OwnedStreamingCapitalAction = {
    id: createDeterministicId('streaming_capital', platform.simulationSeed, key),
    idempotencyKey: key,
    type: raise.kind === 'DEBT' ? 'LOAN_DRAW' : 'EQUITY_ISSUANCE',
    absoluteWeek,
    amount,
    treasuryDelta: amount,
    personalCashDelta: 0,
    debtDelta: raise.kind === 'DEBT' ? amount : 0,
    ownershipBefore,
    ownershipAfter,
  };
  const loan: OwnedStreamingLoanPosition | null = raise.kind === 'DEBT' ? {
    id: createDeterministicId('streaming_loan', platform.simulationSeed, key),
    lenderName: 'Meridian Commercial Bank',
    status: 'ACTIVE',
    principal: amount,
    outstandingPrincipal: amount,
    weeklyInterestRate: Math.max(0, (Number(raise.ratePct) || 0) / 100 / 52),
    openedAtAbsoluteWeek: absoluteWeek,
  } : null;
  const equity: OwnedStreamingEquityPosition | null = raise.kind === 'EQUITY' ? {
    id: createDeterministicId('streaming_equity', platform.simulationSeed, key),
    holderName: raise.investor || 'Growth investor',
    ownershipPercent: equityPercent,
    investedCapital: amount,
    issuedAtAbsoluteWeek: absoluteWeek,
  } : null;
  const director: OwnedStreamingBoardDirector | null = equity ? {
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
  } : null;
  const ledger: OwnedStreamingLedgerEntry = {
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type: raise.kind === 'DEBT' ? 'LOAN_DRAWN' : 'EQUITY_ISSUED',
    summary: raise.kind === 'DEBT'
      ? `${platform.identity.name} drew a bank facility.`
      : `${equity?.holderName || 'An investor'} invested in ${platform.identity.name}.`,
    source: 'PLAYER_ACTION',
    metadata: {
      amount,
      ratePct: raise.ratePct || 0,
      termWeeks: raise.weeks || 0,
      ownershipPercent: equityPercent,
      ownershipAfter,
    },
  };

  const nextPlatform = compactOwnedStreamingPlatformForPersistence({
    ...platform,
    treasuryCash: platform.treasuryCash + amount,
    debtPrincipal: platform.debtPrincipal + (loan ? amount : 0),
    founderOwnershipPercent: ownershipAfter,
    finance: {
      ...platform.finance,
      capitalActions: [...platform.finance.capitalActions, capitalAction],
      loans: loan ? [...platform.finance.loans, loan] : platform.finance.loans,
      equityHolders: equity ? [...platform.finance.equityHolders, equity] : platform.finance.equityHolders,
    },
    governance: {
      ...platform.governance,
      directors: director ? [...platform.governance.directors, director] : platform.governance.directors,
    },
    eventLedger: [...platform.eventLedger, ledger],
  }, player.id);
  return {
    changed: true,
    reason: 'COMMITTED',
    player: { ...player, ownedStreamingPlatform: nextPlatform },
  };
};
