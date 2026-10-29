import type { Player, CreatorEconomyLedger, CreatorPlatform } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { createWorldPopulationState } from './worldEconomy/worldPopulation';
import { getStreamingCountryAdMarket } from './worldEconomy/worldStreamingAdMarket';
export const creatorNumber = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
export const creatorClamp = (value: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
const legacyWorld = new Map<number, ReturnType<typeof createWorldPopulationState>>();
/** Read-only price/access reference. Never charges cinema or streaming ledgers. */
export const readCreatorWorld = (player: Player) => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    let population = player.world.worldPopulation;
    if (!population) {
        population = legacyWorld.get(week);
        if (!population) {
            population = createWorldPopulationState(week);
            legacyWorld.clear();
            legacyWorld.set(week, population);
        }
    }
    let people = 0, payers = 0, cpm = 0, budget = 0, power = 0, weeklySpend = 0;
    for (const country of Object.values(population.countries)) {
        const n = creatorNumber(country.population) * creatorClamp(country.reliableInternetPercent / 100) * creatorClamp(country.smartphoneAccessPercent / 100);
        const ad = getStreamingCountryAdMarket(country, week, country.households);
        const audience = player.world.worldAudienceEconomy?.countries[country.id];
        const spend = audience ? audience.totalMonthlyEntertainmentBudget / Math.max(1, country.population) * 12 / 52 : 2.5 * creatorClamp(country.macro.purchasingPowerIndex / 70, 0, 2);
        people += n;
        payers += n * creatorClamp(country.digitalPaymentAccessPercent / 100);
        cpm += n * ad.marketReferenceCpm;
        budget += ad.advertiserDemandBudget;
        power += n * creatorClamp(country.macro.purchasingPowerIndex / 70, 0, 2);
        weeklySpend += n * spend;
    }
    return { week, eligiblePeople: Math.floor(people), eligiblePayers: Math.floor(payers), referenceCpm: people ? cpm / people : 0, weeklyAdBudget: budget, purchasingPower: people ? power / people : 0, weeklySpendPerPerson: people ? weeklySpend / people : 0 };
};
export const readCreatorLedger = (player: Player): CreatorEconomyLedger => {
    const week = getAbsoluteWeek(player.age, player.currentWeek), old = player.creatorEconomy;
    return old?.schemaVersion === 1 && old.absoluteWeek === week ? old : { schemaVersion: 1, absoluteWeek: week, actions: { YOUTUBE: 0, INSTAGRAM: 0, X: 0 }, rewardSpent: {}, publicationKeys: [], fanSpend: 0 };
};
/** Additional paid actions can reach people; repeated safe posts cannot mint unlimited stats. */
export const claimCreatorAction = (player: Player, platform: CreatorPlatform, id: string) => {
    const ledger = readCreatorLedger(player);
    if (ledger.publicationKeys.includes(id))
        return { player, duplicate: true, reachScale: 0, rewardScale: 0 };
    const count = ledger.actions[platform] || 0;
    const next: CreatorEconomyLedger = { ...ledger, actions: { ...ledger.actions, [platform]: count + 1 }, publicationKeys: [...ledger.publicationKeys, id].slice(-128) };
    return { player: { ...player, creatorEconomy: next }, duplicate: false, reachScale: 1 / (1 + count * .55) ** 1.3, rewardScale: count < 2 ? 1 : 0 };
};
export const creatorPositiveReward = (player: Player, key: string, delta: number, limit: number) => {
    if (delta <= 0)
        return { player, delta };
    const ledger = readCreatorLedger(player), already = ledger.rewardSpent[key] || 0;
    const granted = Math.max(0, Math.min(delta, limit - already));
    return { player: { ...player, creatorEconomy: { ...ledger, rewardSpent: { ...ledger.rewardSpent, [key]: already + granted } } }, delta: granted };
};
export const availableCreatorSpend = (player: Player, engagedPeople: number) => {
    const world = readCreatorWorld(player), ledger = readCreatorLedger(player);
    return Math.max(0, Math.min(engagedPeople, world.eligiblePayers) * world.weeklySpendPerPerson * .035 - ledger.fanSpend);
};
export const recordCreatorSpend = (player: Player, amount: number): Player => {
    const ledger = readCreatorLedger(player);
    return { ...player, creatorEconomy: { ...ledger, fanSpend: ledger.fanSpend + creatorNumber(amount) } };
};
