import type {
    OwnedStreamingCatalogLicense, Player, StreamingRightsAccessGrant,
    WorldStreamingAiCatalogueTitle, WorldStreamingPlatformOffer,
} from '../../types';
import { createDeterministicId, hashDeterministicSeed } from '../deterministicRandom';
import { getHistoricalCatalogueTitles } from '../historicalCatalogue';
import { getAbsoluteWeek } from '../legacyLogic';
import { resolveStreamingRightsCompatibility } from '../streamingRightsCompatibility';
import { normalizeStreamingRightsAccessGrant } from '../streamingRightsAccessGrant';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { evaluateStreamingTitleRoute, type StreamingTitleAccessRoute } from '../streamingTitleAccess';

export interface AiCataloguePosition {
    platformId: string;
    titleId: string;
    title: string;
    contractId: string;
    countryIds: string[];
    territory: 'MULTI_REGION' | 'GLOBAL';
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'TRANSFERRED_OUT';
    accessGrant: StreamingRightsAccessGrant;
}

/** Uses the same monthly entertainment budget and outside-plan rule as player store sales. */
export const calculateAiTitleStoreBuyerPool = (input: {
    price: number;
    monthlySubscriptionPrice: number;
    subscriptionIncluded: boolean;
    freeAdIncluded: boolean;
    storeEligibility?: { kind: 'PUBLIC' | 'MEMBERSHIP_PLANS'; planIds: string[] };
    cohorts: Array<{ budget: number; subscriptions: number; freeAd: number; store: number;
        eligibleSubscriptions?: number }>;
}): number => input.cohorts.reduce((sum, cohort) => {
    const budget = Math.max(0, Number(cohort.budget) || 0);
    if (budget < input.price) return sum;
    const restricted = input.storeEligibility?.kind === 'MEMBERSHIP_PLANS';
    return sum + (restricted ? 0 : Math.max(0, Math.round(cohort.store)))
        + (restricted || input.freeAdIncluded ? 0 : Math.max(0, Math.round(cohort.freeAd)))
        + (input.subscriptionIncluded || budget - input.monthlySubscriptionPrice < input.price
            ? 0 : Math.max(0, Math.round(restricted
                ? cohort.eligibleSubscriptions || 0 : cohort.subscriptions)));
}, 0);

const fromContract = (platformId: string, contract: OwnedStreamingCatalogLicense): AiCataloguePosition | null => {
    const grant = normalizeStreamingRightsAccessGrant(contract.accessGrant);
    if (!grant || !contract.sourceProjectId || !contract.id) return null;
    return {
        platformId, titleId: contract.sourceProjectId, title: contract.titleAtSigning,
        contractId: contract.id, countryIds: contract.countryIds || [],
        territory: contract.territory === 'GLOBAL' ? 'GLOBAL' : 'MULTI_REGION',
        startsAtAbsoluteWeek: contract.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
        status: contract.status, accessGrant: grant,
    };
};

/** Authored contracts and released originals take precedence over legacy starting-library seeds. */
export const getAuthoredAiCataloguePositions = (player: Player, platformId: string): AiCataloguePosition[] => {
    const operator = player.world.streamingPlatformEcosystem?.operators?.[platformId];
    const coreId = operator?.corePlatformId || (platformId in (player.world.platforms || {}) ? platformId : null);
    const ai = coreId ? player.world.platforms?.[coreId]?.ai : undefined;
    const contracts = [
        ...(ai?.rightsContracts || []),
        ...Object.values(player.world.streamingRightsContracts || {}).filter(contract => (
            contract.buyerPlatformId === platformId || contract.buyer?.platformId === platformId
            || (coreId && (contract.buyerPlatformId === coreId || contract.buyer?.platformId === coreId))
        )),
    ];
    const byContract = new Map<string, AiCataloguePosition>();
    contracts.forEach(contract => {
        const plan = contract.platformContentPlanId
            ? ai?.slate.find(item => item.id === contract.platformContentPlanId) : undefined;
        if (plan && (plan.status !== 'RELEASED' || plan.releasedAtAbsoluteWeek === null)) return;
        const position = fromContract(platformId, contract);
        if (position && plan) {
            position.startsAtAbsoluteWeek = Math.max(position.startsAtAbsoluteWeek, plan.releasedAtAbsoluteWeek!);
            if (plan.releaseCountryIds.length) {
                position.countryIds = position.territory === 'GLOBAL'
                    ? [...plan.releaseCountryIds]
                    : position.countryIds.filter(id => plan.releaseCountryIds.includes(id));
                position.territory = 'MULTI_REGION';
            }
        }
        if (position) byContract.set(position.contractId, position);
    });
    (ai?.slate || []).filter(plan => plan.source === 'COMMISSIONED_ORIGINAL'
        && plan.status === 'RELEASED' && plan.releasedAtAbsoluteWeek !== null).forEach(plan => {
        const titleId = plan.sourceProjectIds[0] || plan.industryProductionId || plan.id;
        const contractId = `ai-original:${plan.id}`;
        if (byContract.has(contractId) || [...byContract.values()].some(row => row.titleId === titleId)) return;
        byContract.set(contractId, {
            platformId, titleId, title: plan.title, contractId,
            countryIds: [...plan.releaseCountryIds], territory: 'MULTI_REGION',
            startsAtAbsoluteWeek: plan.releasedAtAbsoluteWeek!, expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
            status: 'ACTIVE', accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'],
                earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
        });
    });
    return [...byContract.values()].sort((left, right) => left.contractId.localeCompare(right.contractId));
};

const hasAuthoredAiCatalogue = (player: Player, platformId: string): boolean => {
    const operator = player.world.streamingPlatformEcosystem?.operators?.[platformId];
    const coreId = operator?.corePlatformId || (platformId in (player.world.platforms || {}) ? platformId : null);
    const ai = coreId ? player.world.platforms?.[coreId]?.ai : undefined;
    return Object.values(player.world.streamingRightsContracts || {}).some(contract => (
        contract.buyerPlatformId === platformId || contract.buyer?.platformId === platformId
        || (coreId && (contract.buyerPlatformId === coreId || contract.buyer?.platformId === coreId))
    )) || Boolean(ai?.rightsContracts?.length)
        || Boolean(ai?.slate?.some(plan => plan.source === 'COMMISSIONED_ORIGINAL'
            && plan.status === 'RELEASED'));
};

/** One-time migration for abstract/old-save operators that genuinely have no authored title. */
export const seedLegacyAiCatalogue = (
    player: Player,
    offers: WorldStreamingPlatformOffer[],
    absoluteWeek: number,
    prior: WorldStreamingAiCatalogueTitle[],
    seededPlatformIds: string[],
): { titles: WorldStreamingAiCatalogueTitle[]; seededPlatformIds: string[] } => {
    const titles = [...prior];
    const seeded = new Set(seededPlatformIds);
    const historical = player.world.historicalCatalogue ? getHistoricalCatalogueTitles(player) : [];
    const validHistoricalIds = new Set(historical.map(title => title.id));
    for (const offer of offers.filter(row => !row.isPlayer)) {
        seeded.add(offer.platformId);
        const projection = projectStreamingCommercialOffers(offer.commercialConfiguration);
        const modes: StreamingRightsAccessGrant['modes'] = [];
        if (projection.subscriptions.length) modes.push('SUBSCRIPTION');
        if (projection.freeAdOffer) modes.push('AD_SUPPORTED');
        if (projection.storeOffer) modes.push('RENTAL', 'PURCHASE');
        if (!modes.length) continue;
        const hybridStore = Boolean(projection.storeOffer
            && (projection.subscriptions.length || projection.freeAdOffer));
        // Pre-catalogue fixtures and unmigrated legacy saves have no 2k-title source yet.
        // Retain their historical snapshot behavior; normal saves use real title IDs below.
        if (!historical.length) {
            if (!hasAuthoredAiCatalogue(player, offer.platformId)
                && !titles.some(item => item.platformId === offer.platformId)) {
                for (let index = 0; index < 3; index += 1) {
                    const titleModes = hybridStore && index === 2
                        ? modes.filter(mode => mode === 'RENTAL' || mode === 'PURCHASE')
                        : hybridStore ? modes.filter(mode => mode !== 'RENTAL' && mode !== 'PURCHASE') : modes;
                    const titleId = createDeterministicId('ai-opening-title', offer.platformId, index);
                    titles.push({ platformId: offer.platformId, titleId,
                        title: `${offer.name} Archive ${index + 1}`,
                        contractId: createDeterministicId('ai-opening-position', offer.platformId, titleId),
                        countryIds: [...offer.activeCountryIds],
                        startsAtAbsoluteWeek: Math.max(0, absoluteWeek - offer.maturityWeeks),
                        expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
                        accessGrant: { schemaVersion: 1, modes: [...titleModes], earlyWindowWeeks: 0,
                            purchaseFulfillment: titleModes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE',
                            source: 'LEGACY_SNAPSHOT' },
                    });
                }
            }
            continue;
        }
        const authored = getAuthoredAiCataloguePositions(player, offer.platformId);
        const known = new Set([
            ...authored.map(item => item.titleId),
            ...titles.filter(item => item.platformId === offer.platformId && validHistoricalIds.has(item.titleId))
                .map(item => item.titleId),
        ]);
        const target = Math.max(8, Math.min(20, 8 + Math.round(offer.catalogueStrengthIndex / 10)));
        if (known.size >= target || !historical.length) continue;
        const candidates = historical.slice().sort((left, right) => (
            hashDeterministicSeed(`${player.id}:ai-library:${offer.platformId}:${right.id}`)
            - hashDeterministicSeed(`${player.id}:ai-library:${offer.platformId}:${left.id}`)
            || left.id.localeCompare(right.id)
        ));
        for (const source of candidates) {
            if (known.size >= target) break;
            if (known.has(source.id) || player.world.legacyStreamingRightsHolds?.[source.id]) continue;
            const territory = offer.activeCountryIds.length ? 'MULTI_REGION' as const : 'GLOBAL' as const;
            const compatible = resolveStreamingRightsCompatibility({ world: player.world,
                sourceProjectId: source.id, buyerPlatformId: offer.platformId,
                sellerPartyId: source.studioId, territory,
                countryIds: territory === 'GLOBAL' ? [] : offer.activeCountryIds,
                startsAtAbsoluteWeek: absoluteWeek, expiresAtAbsoluteWeek: absoluteWeek + 104,
                windowType: 'FIRST_WINDOW', exclusivity: 'NON_EXCLUSIVE' });
            if (!compatible.available) continue;
            const titleModes = hybridStore && known.size === target - 1
                ? modes.filter(mode => mode === 'RENTAL' || mode === 'PURCHASE')
                : hybridStore
                    ? modes.filter(mode => mode !== 'RENTAL' && mode !== 'PURCHASE')
                    : modes;
            titles.push({ platformId: offer.platformId, titleId: source.id,
                title: source.title,
                contractId: createDeterministicId('ai-opening-position', offer.platformId, source.id),
                countryIds: [...offer.activeCountryIds],
                startsAtAbsoluteWeek: Math.max(0, absoluteWeek - offer.maturityWeeks),
                expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
                accessGrant: { schemaVersion: 1, modes: [...titleModes], earlyWindowWeeks: 0,
                    purchaseFulfillment: titleModes.includes('PURCHASE') ? 'PERPETUAL' : 'NONE',
                    source: 'LEGACY_SNAPSHOT' },
            });
            known.add(source.id);
        }
    }
    return { titles: titles.sort((left, right) => left.platformId.localeCompare(right.platformId)
        || left.titleId.localeCompare(right.titleId)), seededPlatformIds: [...seeded].sort() };
};

export const getAiCataloguePositions = (
    player: Player, platformId: string, legacy: WorldStreamingAiCatalogueTitle[],
): AiCataloguePosition[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const historicalById = new Map(getHistoricalCatalogueTitles(player).map(title => [title.id, title]));
    const projected = legacy.filter(title => title.platformId === platformId).filter(title => {
        const source = historicalById.get(title.titleId);
        if (!source) return true; // Preserve old synthetic save entries without fabricating missing rights.
        return resolveStreamingRightsCompatibility({ world: player.world,
            sourceProjectId: title.titleId, buyerPlatformId: platformId,
            sellerPartyId: source.studioId,
            territory: title.countryIds.length ? 'MULTI_REGION' : 'GLOBAL',
            countryIds: title.countryIds, startsAtAbsoluteWeek: absoluteWeek,
            expiresAtAbsoluteWeek: absoluteWeek, windowType: 'FIRST_WINDOW',
            exclusivity: 'NON_EXCLUSIVE' }).available;
    }).map(title => ({ ...title, territory: 'MULTI_REGION' as const, status: 'ACTIVE' as const }));
    return [...getAuthoredAiCataloguePositions(player, platformId), ...projected];
};

export const createAiTitleAccessResolver = (
    player: Player, offer: WorldStreamingPlatformOffer, legacy: WorldStreamingAiCatalogueTitle[],
): ((countryId: string, absoluteWeek: number, route: StreamingTitleAccessRoute) => AiCataloguePosition[]) => {
    const projected = projectStreamingCommercialOffers(offer.commercialConfiguration);
    const positions = getAiCataloguePositions(player, offer.platformId, legacy);
    return (countryId, absoluteWeek, route) => positions.filter(position => (
        evaluateStreamingTitleRoute({ titleId: position.titleId, countryId, absoluteWeek,
            productionReadyAtAbsoluteWeek: position.startsAtAbsoluteWeek,
            generalReleaseAtAbsoluteWeek: position.startsAtAbsoluteWeek,
            marketActive: offer.activeCountryIds.includes(countryId), offer: projected, route,
            position }).allowed
    ));
};
