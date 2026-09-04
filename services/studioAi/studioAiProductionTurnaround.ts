import type { IndustryProductionCommitment, NPCStudioState, WorldState } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { appendStudioAiProductionKey } from './studioAiProductionState';
import { STUDIO_AI_LEDGER_LIMIT } from './studioAiState';

const money = (value: number) => Math.round((value + Number.EPSILON * 100) * 1000) / 1000;
const TERMINAL = new Set(['DORMANT', 'SOLD_MERGED', 'CLOSED']);
const ACTIVE_PRODUCTION = new Set(['PLANNED', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'ON_HOLD', 'TURNAROUND']);

export interface SettleStudioAiProductionTurnaroundInput {
    world: WorldState;
    production: IndustryProductionCommitment;
    seller: NPCStudioState;
    buyer: NPCStudioState;
    absoluteWeek: number;
}

export interface SettleStudioAiProductionTurnaroundResult {
    world: WorldState;
    production: IndustryProductionCommitment;
    seller: NPCStudioState;
    buyer: NPCStudioState;
    changed: boolean;
}

export const settleStudioAiProductionTurnaround = (input: SettleStudioAiProductionTurnaroundInput): SettleStudioAiProductionTurnaroundResult => {
    const execution = input.production.studioAiExecution;
    const key = `b6-turnaround:${input.production.id}:${input.buyer.id}`;
    const buyerActive = Object.values(input.world.industryProductions || {}).filter(item => item.producerStudioId === input.buyer.id && item.id !== input.production.id && ACTIVE_PRODUCTION.has(item.status)).length;
    const remaining = money(Math.max(0, input.production.budgetMillions - input.production.paidMillions));
    const price = money(remaining * 0.35);
    if (!execution || input.production.source !== 'STUDIO_INDEPENDENT' || input.production.status !== 'TURNAROUND'
        || execution.processedKeys.includes(key) || input.buyer.ai?.controller !== 'AI'
        || TERMINAL.has(input.buyer.ai.status) || buyerActive >= input.buyer.ai.capacity.productionSlots
        || input.buyer.cashReserve < price || input.buyer.id === input.seller.id) {
        return { world: input.world, production: input.production, seller: input.seller, buyer: input.buyer, changed: false };
    }
    const sellerCash = money(input.seller.cashReserve + price);
    const buyerCash = money(input.buyer.cashReserve - price);
    const ledger = (studio: NPCStudioState, amount: number, balance: number, side: 'sale' | 'purchase') => [...studio.ai!.ledger, {
        id: createDeterministicId('studio_ai_turnaround_ledger', input.production.id, studio.id, side),
        absoluteWeek: input.absoluteWeek, category: 'TURNAROUND' as const, amountMillions: amount,
        balanceAfterMillions: balance, description: `${input.production.title}: turnaround ${side}`,
    }].slice(-STUDIO_AI_LEDGER_LIMIT);
    const seller = { ...input.seller, cashReserve: sellerCash, ai: { ...input.seller.ai!, finance: { ...input.seller.ai!.finance, committedSpendMillions: money(Math.max(0, input.seller.ai!.finance.committedSpendMillions - remaining)) }, ledger: ledger(input.seller, price, sellerCash, 'sale') } };
    const buyer = { ...input.buyer, cashReserve: buyerCash, ai: { ...input.buyer.ai!, finance: { ...input.buyer.ai!.finance, committedSpendMillions: money(input.buyer.ai!.finance.committedSpendMillions + remaining) }, ledger: ledger(input.buyer, -price, buyerCash, 'purchase') } };
    const production: IndustryProductionCommitment = {
        ...input.production, producerStudioId: input.buyer.id, status: 'ON_HOLD', updatedAtAbsoluteWeek: input.absoluteWeek,
        studioAiExecution: { ...execution, controllerAtLastProgression: 'AI', selectedReleaseMode: null, holdStartedAtAbsoluteWeek: input.absoluteWeek, nextReviewAbsoluteWeek: input.absoluteWeek + 2, processedKeys: appendStudioAiProductionKey(execution.processedKeys, key) },
    };
    const talentBookings = (input.world.talentBookings || []).map(booking => booking.projectId === production.canonicalProjectId ? { ...booking, producerStudioId: input.buyer.id } : booking);
    const world: WorldState = { ...input.world, studios: { ...(input.world.studios || {}), [seller.id]: seller, [buyer.id]: buyer }, talentBookings, industryProductions: upsertCanonicalIndustryProduction(input.world.industryProductions, production) };
    return { world, production, seller, buyer, changed: true };
};
