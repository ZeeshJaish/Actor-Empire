import type {
    Genre,
    Player,
    StreamingEcosystemOperator,
    WorldStreamingOfferRegistry,
    WorldStreamingPlanOffer,
    WorldStreamingPlatformOffer,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { normalizeStreamingPlatformEcosystem } from '../streamingPlatformEcosystem';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;

const FEATURE_APPEAL: Record<string, number> = {
    hd: 5,
    uhd: 12,
    spatial: 5,
    streams2: 7,
    streams4: 13,
    downloads: 8,
    noads: 16,
    early: 12,
    live: 9,
    extraseat: 6,
    catalogue: 10,
};

const planAppeal = (featureIds: string[], ads: boolean): number => round2(clamp(
    28 + featureIds.reduce((sum, id) => sum + (FEATURE_APPEAL[id] || 0), 0) - (ads ? 9 : 0),
    10,
    100,
));

const effectivePrice = (monthly: number, annualDiscount: number, introOffer: number): number => round2(
    Math.max(.5, monthly) * (1 - clamp(annualDiscount, 0, 80) / 100 * .3 - clamp(introOffer, 0, 90) / 100 * .25),
);

const createPlayerOffer = (player: Player, absoluteWeek: number): WorldStreamingPlatformOffer | null => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.identity) return null;
    const pricing = platform.serviceConfiguration.pricing;
    if (!pricing.streams.includes('subs') || !pricing.plans.length) return null;
    const activeCountryIds = [...new Set([
        ...platform.marketOperations.filter(operation => operation.status === 'ACTIVE').map(operation => operation.countryId),
        ...(platform.identity.dayOneMarketIds || []),
    ].map(id => String(id || '').trim().toUpperCase()).filter(Boolean))].sort();
    if (!activeCountryIds.length) return null;
    const entries = (() => {
        try {
            const slate = platform.launchSlate?.entries || [];
            return slate.filter(entry => entry.launchWeek <= Math.max(1, absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek || absoluteWeek) + 1));
        } catch {
            return [];
        }
    })();
    const genreCount = new Set(entries.map(entry => entry.genre)).size;
    const catalogueStrengthIndex = clamp(
        25 + platform.catalogProjectIds.length * 2.2 + platform.catalogLicenses.filter(item => item.status === 'ACTIVE').length * 1.6
        + platform.originalCommissions.filter(item => !['CANCELLED', 'SOLD'].includes(item.status)).length * 2.5 + genreCount * 3,
        5,
        100,
    );
    const localizationLevels = Object.values(platform.localizationOperations.legacyPackageGrants || {}).length;
    const localizationStrengthIndex = clamp(
        platform.technologyLevels.CONTENT_OPERATIONS * 8 + localizationLevels * 4 + platform.localizationOperations.titleLanguageAssets.length * .5,
        0,
        100,
    );
    const reliabilityIndex = clamp(
        platform.infrastructureSetup?.reliabilityTarget || platform.metrics.technologyHealth || 55,
        0,
        100,
    );
    const weeklyDecision = platform.weeklyDecisions.find(item => (
        item.status === 'LOCKED' && item.targetAbsoluteWeek === absoluteWeek
    ));
    const growthAction = platform.growthActions.find(item => (
        item.status === 'LOCKED' && item.targetAbsoluteWeek === absoluteWeek
    ));
    const decisionMarketingBoost = weeklyDecision?.planId === 'AUDIENCE_PUSH' ? 12
        : weeklyDecision?.planId === 'RETENTION_SPOTLIGHT' ? 3 : 0;
    const decisionLoyaltyBoost = weeklyDecision?.planId === 'RETENTION_SPOTLIGHT' ? 10
        : weeklyDecision?.planId === 'RELIABILITY_GUARD' ? 4 : 0;
    const decisionReliabilityBoost = weeklyDecision?.planId === 'RELIABILITY_GUARD' ? 5 : 0;
    const campaignMarketingBoost = growthAction
        ? clamp(4 + growthAction.channels.length * 2 + Math.log10(Math.max(1, growthAction.cashCost)) * .7, 4, 15)
        : 0;
    const plans: WorldStreamingPlanOffer[] = pricing.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        monthlyPrice: round2(Math.max(.5, plan.monthly)),
        effectiveMonthlyPrice: effectivePrice(plan.monthly, pricing.annualDiscount, pricing.introOffer),
        featureIds: [...plan.featureIds],
        ads: plan.ads,
        appealIndex: planAppeal(plan.featureIds, plan.ads),
    }));
    const sourceFingerprint = createDeterministicId('world-streaming-player-offer', platform.serviceConfiguration.revision,
        activeCountryIds.join(','), plans.map(plan => `${plan.id}:${plan.monthlyPrice}:${plan.featureIds.join('.')}:${plan.ads}`).join('|'),
        catalogueStrengthIndex, localizationStrengthIndex, reliabilityIndex, platform.competitiveWorld.globalPrestige,
        platform.competitiveWorld.rivalryHeat, platform.metrics.subscribers);
    return {
        platformId: 'PLAYER',
        name: platform.identity.name,
        isPlayer: true,
        activeCountryIds,
        plans,
        annualDiscountPercent: pricing.annualDiscount,
        introOfferPercent: pricing.introOffer,
        catalogueStrengthIndex: round2(catalogueStrengthIndex),
        localizationStrengthIndex: round2(localizationStrengthIndex),
        reputationIndex: clamp(platform.competitiveWorld.globalPrestige || 45, 0, 100),
        reliabilityIndex: round2(clamp(reliabilityIndex + decisionReliabilityBoost, 0, 100)),
        marketingIndex: clamp(platform.competitiveWorld.rivalryHeat + 35 + decisionMarketingBoost + campaignMarketingBoost, 0, 100),
        loyaltyIndex: clamp(35 + Math.log10(Math.max(1, platform.metrics.subscribers)) * 5 + decisionLoyaltyBoost, 20, 100),
        countryMomentum: {},
        preferredGenres: [...new Set(entries.map(entry => entry.genre as Genre))].slice(0, 3),
        sourceFingerprint: createDeterministicId(sourceFingerprint, weeklyDecision?.idempotencyKey || 'NO_WEEKLY_DECISION', growthAction?.idempotencyKey || 'NO_GROWTH_ACTION'),
    };
};

const hashUnit = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0xffffffff;
};

const createAiPlans = (operator: StreamingEcosystemOperator): WorldStreamingPlanOffer[] => {
    const prestigePrice = operator.prestige * .055 + operator.cataloguePower * .035;
    const homeAdjustment = operator.kind === 'REGIONAL_REAL' ? -.9 : operator.kind === 'DYNAMIC_FICTIONAL' ? -.3 : 1.2;
    const jitter = (hashUnit(operator.id) - .5) * 1.8;
    const middle = round2(clamp(5.5 + prestigePrice + homeAdjustment + jitter, 4.5, 18));
    const planCount = operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL' || operator.startingClass === 'GLOBAL_ENTRANT'
        ? 3 : operator.cataloguePower + operator.technology >= 160 ? 2 : 1;
    const plans: Array<{ id: string; name: string; monthly: number; features: string[]; ads: boolean }> = [];
    if (planCount >= 2) plans.push({ id: 'VALUE', name: 'Essential', monthly: middle * .62, features: ['hd', 'streams2'], ads: true });
    plans.push({ id: 'STANDARD', name: planCount === 1 ? 'Access' : 'Standard', monthly: middle, features: ['hd', 'streams2', 'downloads', 'catalogue'], ads: false });
    if (planCount >= 3) plans.push({ id: 'PREMIUM', name: 'Premiere', monthly: middle * 1.48, features: ['uhd', 'spatial', 'streams4', 'downloads', 'noads', 'catalogue'], ads: false });
    const annualDiscount = round2(clamp(8 + (100 - operator.brandPower) * .12 + hashUnit(`${operator.id}:annual`) * 8, 5, 24));
    const introOffer = round2(clamp((100 - operator.brandPower) * .18 + hashUnit(`${operator.id}:intro`) * 10, 0, 28));
    return plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        monthlyPrice: round2(plan.monthly),
        effectiveMonthlyPrice: effectivePrice(plan.monthly, annualDiscount, introOffer),
        featureIds: plan.features,
        ads: plan.ads,
        appealIndex: planAppeal(plan.features, plan.ads),
    }));
};

const createAiOffer = (player: Player, operator: StreamingEcosystemOperator): WorldStreamingPlatformOffer | null => {
    if (operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED' || !operator.activeCountryIds.length) return null;
    if (player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds?.some(id => (
        id === operator.corePlatformId || id === operator.id
    ))) return null;
    const authoritative = operator.corePlatformId ? player.world.platforms?.[operator.corePlatformId] : null;
    const ai = authoritative?.ai;
    const activeCountryIds = [...new Set((ai?.capabilities.activeCountryIds || operator.activeCountryIds)
        .map(id => String(id || '').trim().toUpperCase()).filter(Boolean))].sort();
    if (!activeCountryIds.length) return null;
    const plans = createAiPlans(operator);
    const technologyLevels = ai ? Object.values(ai.capabilities.technologyLevels) : [];
    const technology = technologyLevels.length
        ? technologyLevels.reduce((sum, value) => sum + value, 0) / technologyLevels.length * 10
        : operator.technology;
    const annualDiscountPercent = round2(clamp(8 + (100 - operator.brandPower) * .12 + hashUnit(`${operator.id}:annual`) * 8, 5, 24));
    const introOfferPercent = round2(clamp((100 - operator.brandPower) * .18 + hashUnit(`${operator.id}:intro`) * 10, 0, 28));
    return {
        platformId: operator.id,
        name: authoritative?.name || operator.name,
        isPlayer: false,
        activeCountryIds,
        plans,
        annualDiscountPercent,
        introOfferPercent,
        catalogueStrengthIndex: clamp(ai?.audienceHealth.catalogueStrengthIndex ?? operator.cataloguePower, 0, 100),
        localizationStrengthIndex: clamp(ai
            ? (ai.capabilities.subtitleCoveragePercent + ai.capabilities.dubCoveragePercent) / 2
            : operator.localization, 0, 100),
        reputationIndex: clamp(authoritative?.reputation ?? operator.prestige, 0, 100),
        reliabilityIndex: clamp(45 + technology * .5, 0, 100),
        marketingIndex: clamp(40 + Math.max(0, ...Object.values(operator.marketMomentum)) * 4 + operator.brandPower * .25, 0, 100),
        loyaltyIndex: clamp(25 + operator.brandPower * .45 + Math.log10(Math.max(1, operator.subscriberMillions)) * 5, 0, 100),
        countryMomentum: { ...operator.marketMomentum },
        preferredGenres: [...operator.preferredGenres],
        sourceFingerprint: createDeterministicId('world-streaming-ai-offer', operator.id, activeCountryIds.join(','),
            operator.cataloguePower, operator.localization, operator.technology, operator.brandPower, operator.prestige,
            ai?.audienceHealth.catalogueStrengthIndex, ai?.capabilities.subtitleCoveragePercent,
            ai?.capabilities.dubCoveragePercent, authoritative?.reputation),
    };
};

export const getWorldStreamingOffers = (player: Player, absoluteWeek: number): WorldStreamingOfferRegistry => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const ecosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, week);
    const offers = Object.values(ecosystem.operators)
        .map(operator => createAiOffer(player, operator))
        .filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer));
    const playerOffer = createPlayerOffer(player, week);
    if (playerOffer) offers.push(playerOffer);
    offers.sort((left, right) => left.platformId.localeCompare(right.platformId));
    const countryIds = new Set(offers.flatMap(offer => offer.activeCountryIds));
    const byCountry = Object.fromEntries([...countryIds].sort().map(countryId => [
        countryId,
        offers.filter(offer => offer.activeCountryIds.includes(countryId)).map(offer => offer.platformId),
    ]));
    return {
        schemaVersion: 1,
        absoluteWeek: week,
        offers,
        byCountry,
        fingerprint: createDeterministicId('world-streaming-offers', week,
            offers.map(offer => `${offer.platformId}:${offer.sourceFingerprint}`).join('|')),
    };
};
