import { getStudioPrestigeScore } from './studioPrestige';
import type { NPCActor, PaymentMode, Player, TalentNegotiationState } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { getStudioGroup } from './studioGroup';
import { getPlayerLanguage } from './i18n';
import { createContract, evaluateOffer, type TalentOfferEvaluation } from './talentService';
import { hasTalentUses, mergeParentStudioTalentRosters } from './talentRoster';

const keyFor = (studioId: string, npcId: string) => `${studioId}:${npcId}`;
const emptyState = (): TalentNegotiationState => ({ attempts: 0, roll: 0, rejectedOffers: [] });

/** Repair week-of-year cooldowns once. Never replay this legacy state after expiry. */
export const repairTalentNegotiations = (player: Player): Player => {
    if (player.flags?.talentNegotiationMigrationVersion === 1) return player;
    const houses = (player.businesses || []).filter(b => b.type === 'PRODUCTION_HOUSE');
    const parent = houses.find(b => b.studioState?.acquisitionOrigin !== 'STUDIO_ACQUISITION' && b.config?.productionType !== 'Acquired Studio') || houses[0];
    const legacy = player.studioMemory as Record<string, any>;
    const entries = { ...player.talentNegotiations };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (parent) {
        const ids = new Set([...Object.keys(legacy?.attempts || {}), ...Object.keys(legacy?.cooldowns || {})]);
        for (const id of ids) {
            const key = keyFor(parent.id, id);
            if (entries[key]) continue;
            const oldCooldown = Number(legacy?.cooldowns?.[id] || 0);
            let remaining = oldCooldown - player.currentWeek;
            if (oldCooldown > 52 && player.currentWeek <= 12) remaining -= 52;
            // Unreachable/stale legacy dates cannot impose an unbounded ban.
            remaining = remaining > 0 && remaining <= 12 ? remaining : 0;
            const attempts = Math.min(3, Math.max(0, Math.floor(Number(legacy?.attempts?.[id]) || 0)));
            if (!remaining && !attempts) continue;
            entries[key] = { attempts: remaining ? 3 : attempts, roll: Math.random(), rejectedOffers: [],
                ...((remaining || attempts >= 3) ? { cooldownUntilAbsoluteWeek: absoluteWeek + (remaining || 12) } : {}) };
        }
    }
    return { ...player, talentNegotiations: entries, flags: { ...player.flags, talentNegotiationMigrationVersion: 1 } };
};

export const getTalentNegotiationState = (player: Player, studioId: string, npcId: string): TalentNegotiationState => {
    const state = repairTalentNegotiations(player).talentNegotiations?.[keyFor(studioId, npcId)];
    if (!state) return emptyState();
    if (state.cooldownUntilAbsoluteWeek !== undefined && state.cooldownUntilAbsoluteWeek <= getAbsoluteWeek(player.age, player.currentWeek)) return emptyState();
    return state;
};

export const getTalentNegotiationActor = (player: Player, studioId: string, npc: NPCActor): NPCActor => {
    const snapshot = getTalentNegotiationState(player, studioId, npc.id).actorSnapshot;
    return snapshot ? { ...npc, ...snapshot, stats: { ...npc.stats, ...snapshot.stats } } : npc;
};

/** Immutable transaction shared by the UI and regression checks. No invalid offer spends an attempt. */
export const negotiateTalentContract = (
    source: Player, studioId: string, npc: NPCActor, duration: number, offeredAmount: number, paymentMode: PaymentMode,
): { player: Player; result: TalentOfferEvaluation } => {
    const player = repairTalentNegotiations(source);
    const reject = (message: string) => ({ player, result: { success: false, message, maintenanceFee: 0, totalContractValue: 0 } });
    const studio = player.businesses.find(b => b.id === studioId && b.type === 'PRODUCTION_HOUSE');
    if (!studio) return reject('Open Talent Management from the production house you want to sign for.');
    if (!Number.isInteger(duration) || duration < 1 || duration > 10 || !Number.isSafeInteger(offeredAmount) || offeredAmount <= 0
        || !['UPFRONT', 'WEEKLY_INSTALLMENTS'].includes(paymentMode) || !Number.isSafeInteger(offeredAmount * (paymentMode === 'UPFRONT' ? 1 : 52))) {
        return reject('Enter a positive whole-dollar offer and a commitment of 1–10 movies.');
    }
    const isParent = getStudioGroup(player).parentStudio?.id === studio.id;
    const contracts = isParent
        ? mergeParentStudioTalentRosters(studio.id, player.studio?.talentRoster, studio.studioState?.talentRoster)
        : (studio.studioState?.talentRoster || []).filter(c => c.studioId === studio.id);
    if (contracts.some(c => c.npcId === npc.id && hasTalentUses(c))) return reject('This artist already has an active deal with this studio. Use the remaining movies before signing another deal.');
    const state = getTalentNegotiationState(player, studioId, npc.id);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    if ((state.cooldownUntilAbsoluteWeek || 0) > now) return reject(`Negotiations are on a 12 week cooldown. Try again in ${state.cooldownUntilAbsoluteWeek! - now} week(s).`);
    const prestige = getStudioPrestigeScore(player, studio.id);
    const key = keyFor(studioId, npc.id);
    const stored = player.talentNegotiations?.[key];
    const roll = stored && stored.cooldownUntilAbsoluteWeek === undefined ? stored.roll : Math.random();
    const negotiationActor = getTalentNegotiationActor(player, studioId, npc);
    const result = evaluateOffer(negotiationActor, duration, offeredAmount, paymentMode, player.stats.fame, studio.stats.valuation || 0,
        getPlayerLanguage(player), { studioPrestige: prestige, roll });
    const needed = paymentMode === 'UPFRONT' ? offeredAmount : offeredAmount + result.maintenanceFee;
    const available = isParent ? player.money : studio.balance;
    if (available < needed) return reject(`${isParent ? 'Your balance' : `${studio.name}’s treasury`} needs $${needed.toLocaleString()} ${paymentMode === 'UPFRONT' ? 'to pay this offer upfront' : 'to cover the first weekly installment and upkeep'}. ${isParent ? 'Raise funds' : 'Add capital in Finance'}, then try again.`);
    const flags = { ...player.flags, extraNPCs: [...(player.flags.extraNPCs || []).filter((a: NPCActor) => a.id !== npc.id), { ...npc, ...state.actorSnapshot, stats: { ...npc.stats, ...state.actorSnapshot?.stats } }] };
    const signature = `${duration}:${paymentMode}:${offeredAmount}`;
    if (!result.success) {
        const rejectedOffers = [...new Set([...(state.rejectedOffers || []), signature])];
        const attempts = Math.min(3, state.attempts + (state.rejectedOffers?.includes(signature) ? 0 : 1));
        const actorSnapshot = state.actorSnapshot || { tier: npc.tier,
            stats: { fame: npc.stats?.fame, talent: npc.stats?.talent }, traits: npc.traits,
            isIndependent: npc.isIndependent, prestigeBias: npc.prestigeBias, potential: npc.potential, netWorth: npc.netWorth };
        const nextState: TalentNegotiationState = { attempts, roll, rejectedOffers, actorSnapshot,
            ...(attempts >= 3 ? { cooldownUntilAbsoluteWeek: now + 12 } : {}) };
        return { player: { ...player, flags, talentNegotiations: { ...player.talentNegotiations, [key]: nextState } }, result };
    }
    const contract = { ...createContract(npc.id, 'MOVIE_DEAL', paymentMode, duration, result.totalContractValue, result.maintenanceFee, player.currentWeek),
        studioId: studio.id, lastPaymentAbsoluteWeek: now };
    const roster = [...contracts, contract];
    const upfront = paymentMode === 'UPFRONT' ? result.totalContractValue : 0;
    const negotiations = { ...player.talentNegotiations }; delete negotiations[key];
    const next: Player = { ...player, flags, talentNegotiations: negotiations,
        money: player.money - (isParent ? upfront : 0),
        studio: isParent ? { ...player.studio, talentRoster: roster } : player.studio,
        finance: isParent && upfront > 0 ? { ...player.finance, history: [{ id: `tx_${contract.id}`, week: player.currentWeek, year: player.age,
            amount: -upfront, category: 'EXPENSE', description: `Talent contract upfront (${npc.name})` }, ...player.finance.history] } : player.finance,
        businesses: player.businesses.map(b => b.id !== studio.id ? b : {
            ...b, balance: b.balance - (isParent ? 0 : upfront),
            studioState: { ...b.studioState!, talentRoster: roster,
                financeLedger: !isParent && upfront > 0 ? [{ id: `studio_talent_upfront_${contract.id}`, week: player.currentWeek, year: player.age,
                    amount: -upfront, type: 'PRODUCTION_SPEND' as const, label: `${npc.name} talent contract` }, ...(b.studioState?.financeLedger || [])].slice(0, 200) : b.studioState?.financeLedger },
        }),
    };
    return { player: next, result };
};
