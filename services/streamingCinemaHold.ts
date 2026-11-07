/**
 * #243 (plan §25.4 Q6): a streaming deal signed while a film is in cinemas starts the week after cinemas close. Zeesh (2026-11-04): "suppose
 * run me hi hm log chal jaa rhe bid platform to date". The date used to come from `maxTheatricalWeeks`, a tier number set at release, not from
 * the real run, which closes when the audience goes quiet: close early and about ten dark weeks followed; run long and it was on the platform
 * and in cinemas at once. The contract now holds its window for the cinema: pushed on while the run lasts, and set when it closes.
 */
import type { Player, StreamingRightsContract } from '../types';

const contractsOf = (player: Player, projectId: string): StreamingRightsContract[] => Object.values(player.world?.streamingRightsContracts || {})
    .filter(contract => contract.sourceProjectId === projectId && contract.status === 'ACTIVE' && contract.holdsForCinemaClose === true);

const moved = (player: Player, contracts: StreamingRightsContract[], startsAt: number, release: boolean): Player => {
    if (!contracts.length) return player;
    return {
        ...player,
        world: {
            ...player.world,
            streamingRightsContracts: {
                ...player.world.streamingRightsContracts,
                ...Object.fromEntries(contracts.map(contract => {
                    const { holdsForCinemaClose: _held, ...open } = contract;
                    const next = release ? open : contract;
                    return [contract.id, {
                        ...next,
                        startsAtAbsoluteWeek: startsAt,
                        expiresAtAbsoluteWeek: contract.permanentPurchase ? contract.expiresAtAbsoluteWeek : startsAt + (contract.expiresAtAbsoluteWeek - contract.startsAtAbsoluteWeek),
                    }];
                })),
            },
        },
    };
};

/** signed during a run: its window waits for the cinema */
export const holdStreamingWindowForCinema = (player: Player, contractId: string | null | undefined): Player => {
    const contract = contractId ? player.world?.streamingRightsContracts?.[contractId] : null;
    if (!contract) return player;
    return {
        ...player,
        world: { ...player.world, streamingRightsContracts: { ...player.world.streamingRightsContracts, [contract.id]: { ...contract, holdsForCinemaClose: true } } },
    };
};

/** the run goes on: a window that would open next week moves on with it */
export const keepStreamingWindowsBehindCinema = (player: Player, projectId: string, absoluteWeek: number): Player => {
    const due = contractsOf(player, projectId).filter(contract => contract.startsAtAbsoluteWeek <= absoluteWeek + 1);
    return moved(player, due, absoluteWeek + 2, false);
};

/** the run closed: the window starts next week, earlier or later than was expected */
export const openStreamingWindowsAfterCinema = (player: Player, projectId: string, absoluteWeek: number): { player: Player; startsAt: number | null } => {
    const held = contractsOf(player, projectId);
    if (!held.length) return { player, startsAt: null };
    return { player: moved(player, held, absoluteWeek + 1, true), startsAt: absoluteWeek + 1 };
};
