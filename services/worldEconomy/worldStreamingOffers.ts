import type {
    Genre,
    OwnedStreamingPricingConfiguration,
    Player,
    StreamingEcosystemOperator,
    WorldStreamingOfferRegistry,
    WorldStreamingPlanOffer,
    WorldStreamingPlatformOffer,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    STREAMING_AD_LEVEL_EFFECTS,
    resolveStreamingPlanAdLevel,
    resolveStreamingPlanOffer,
    streamingPhoneOnlyShare,
    streamingPictureRank,
    streamingPlanIncludes,
    streamingPlanOfferAppeal,
} from '../streamingPlanOffer';
import { normalizeStreamingPlatformEcosystem } from '../streamingPlatformEcosystem';
import {
    effectiveMonthlyStreamingPlanPrice,
    streamingAnnualBillingShare,
    streamingBillingPathPrice,
    streamingIntroOfferAppliesTo,
    normalizeStreamingPricingConfiguration,
} from '../streamingPricingEconomy';
import { createAiStreamingCommercialConfiguration } from './worldStreamingCommercialEconomy';
import { createStreamingTitleRouteReadBatch, getOwnedPlatformPackageCountryIds, getStreamingCatalogueReadContext,
    type StreamingCatalogueReadContext } from '../streamingContentAvailability';
import { getEligibleOwnedStreamingTitles } from '../streamingCatalog';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { deriveStreamingNetworkCoverage } from '../streamingNetworkCoverage';
import { streamingCatalogueValue, streamingDeliveredService, streamingTitleLanguageId, streamingTitleQuality, streamingTitleWeeksAvailable } from './worldStreamingContentValue';
import { getStreamingIncidentHarm } from '../streamingIncidentHarm';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import {
    deriveStreamingTechEngineLevel,
    gateRivalStreamingPlanFeatures,
    getStreamingTechDefinition,
    resolveStreamingTechTree,
    streamingTechVersion,
    streamingTechDeviceReach,
    streamingTechHabitAppeal,
    streamingTechFamilyAppeal,
    streamingTechKidsAppeal,
    streamingTechAdEffects,
    streamingTechPiracyProtection,
    streamingTechCrackdownFactor,
    streamingTechExtraMemberShare,
    streamingTechSharingFactor,
    streamingTechChurnCut,
} from '../streamingTechTreeCatalogue';
import {
    STREAMING_LOCALIZATION_APPEAL_WEIGHT,
    createStreamingCountryLocalizationResolver,
    localizationCoverageShare,
    resolveTitleLanguageFit,
} from '../streamingLocalizationRegions';
import { resolveRivalStreamingTechGrowth, type StreamingRivalTechGrowth } from '../streamingRivalTech';
import { streamingCampaignMarketingByCountry } from '../campaigns/streamingCampaignEffects';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;
/** Awareness of an offer, shared by paid and free audience choice. */
/** How many more homes can watch an offer (#53): ×(1 + the player's Apps reach); rivals and a phone-only service ×1. */
export const getWorldStreamingDeviceReachFactor = (offer: WorldStreamingPlatformOffer): number => 1 + Math.max(0, offer.deviceReach || 0);

/** #145: an offer's marketing index in a country: higher where the player's campaigns built awareness. */
export const getWorldStreamingOfferMarketing = (offer: WorldStreamingPlatformOffer, countryId?: string): number => (
    (countryId !== undefined ? offer.marketingIndexByCountry?.[countryId] : undefined) ?? offer.marketingIndex
);
export const getWorldStreamingOfferExposure = (offer: WorldStreamingPlatformOffer, countryId?: string): number => {
    if (offer.maturityWeeks === undefined) return 1;
    const maturity = clamp(offer.maturityWeeks / 52, 0, 1);
    const launchRamp = .06 + .94 * Math.pow(maturity, .8);
    const marketingReach = clamp(.45 + getWorldStreamingOfferMarketing(offer, countryId) / 180, .45, 1);
    return clamp(launchRamp * marketingReach, .025, 1);
};
const commercialSignature = (pricing: ReturnType<typeof normalizeStreamingPricingConfiguration>): string => [
    pricing.streams.join(','),
    `${pricing.annualDiscount}:${pricing.introOffer}:${pricing.introOfferPlanId || 'ALL'}`,
    `${pricing.ads.minutesPerHour}`,
    `${pricing.rentals.rent}:${pricing.rentals.buy}:${pricing.rentals.windowWeeks}`,
    `${pricing.commercialOffers?.storeEligibility?.kind || 'PUBLIC'}:${(pricing.commercialOffers?.storeEligibility?.planIds || []).join(',')}`,
    pricing.premium.price,
    pricing.daypass.price,
    `${pricing.sponsor.perTitle}:${pricing.sponsor.titles}`,
    pricing.metered.perHour,
    pricing.patron.monthly,
].join('|');

const FEATURE_APPEAL: Record<string, number> = {
    hd: 5,
    uhd: 12,
    spatial: 5,
    streams2: 7,
    streams4: 13,
    streams6: 16,
    downloads: 8,
    // Ad-free is derived from the ads flag; avoid rewarding it a second time.
    noads: 0,
    early: 12,
    live: 9,
    extraseat: 6,
    catalogue: 10,
};

/* A rival plan's appeal, from its features (the player's plans read their offer: playerPlanAppeal). */
const planAppeal = (featureIds: string[], ads: boolean, earlyPlayable = false): number => round2(clamp(
    28 + featureIds.reduce((sum, id) => sum + (id === 'early' && !earlyPlayable ? 0 : FEATURE_APPEAL[id] || 0), 0) - (ads ? 9 : 0),
    10,
    100,
));

/* The player's plan appeal (Phase 2, §6.7): the tech rows come from what the plan offers
   (streamingPlanOfferAppeal), the rest (catalogue, screens, downloads, early access, Live, extra
   seat) keep their points, and ads cost what their level costs. A plan built the Phase 1 way is
   worth exactly what it was. */
const TECH_FEATURES = new Set(['hd', 'uhd', 'spatial']);
const playerPlanAppeal = (featureIds: string[], offerAppeal: number, adAppeal: number, earlyPlayable: boolean): number => round2(clamp(
    28 + featureIds.filter(id => !TECH_FEATURES.has(id))
        .reduce((sum, id) => sum + (id === 'early' && !earlyPlayable ? 0 : FEATURE_APPEAL[id] || 0), 0)
    + offerAppeal - adAppeal,
    10,
    100,
));
/** A rival plan's picture, from its features: 4K with uhd, 1080p with hd, else 720p. */
const featurePictureRank = (featureIds: string[]): number => (
    featureIds.includes('uhd') ? 3 : featureIds.includes('hd') ? 2 : 1
);

const createPlayerOffer = (player: Player, absoluteWeek: number, preparedContext?: StreamingCatalogueReadContext): WorldStreamingPlatformOffer | null => {
    const context = getStreamingCatalogueReadContext(player, preparedContext);
    const { platform } = context;
    if (platform.lifecycle !== 'ACTIVE' || !platform.identity) return null;
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    if (!pricing.streams.length) return null;
    const declaredFootprint = platform.marketOperations.some(operation=>operation.scope==='COUNTRY' && operation.countryId)
        || Boolean(platform.identity.dayOneMarketIds?.length);
    const configuredCountryIds = declaredFootprint ? getOwnedPlatformPackageCountryIds(platform) : [];
    // A commercial offer is unavailable where a commissioned network has no
    // route. Apply this before customer allocation so unavailable countries
    // cannot acquire paid accounts and later collect subscription receipts.
    const routeCoverage = platform.infrastructureSetup?.facilities?.length
        ? new Map(deriveStreamingNetworkCoverage({
            facilities: platform.infrastructureSetup.facilities,
            openingCountryIds: configuredCountryIds,
            fibreState: platform.fibre,
        }).countries.map(country => [country.countryId, country.coveredShare]))
        : null;
    const activeCountryIds = routeCoverage
        ? configuredCountryIds.filter(countryId => (routeCoverage.get(countryId) || 0) > 0)
        : configuredCountryIds;
    if (!activeCountryIds.length) return null;
    const programEntries = getOwnedStreamingProgramEntries(player, context);
    const programWeekForEntries = Math.max(1, absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek || absoluteWeek) + 1);
    const entries = programEntries.filter(entry => entry.launchWeek <= programWeekForEntries);
    const eligibleOwnedIds = new Set(getEligibleOwnedStreamingTitles(player).map(title => title.id));
    const titleIds = [...new Set([
        ...platform.catalogProjectIds.filter(projectId => eligibleOwnedIds.has(projectId)),
        ...(platform.starterCatalog?.ownedProjectIds || []),
        ...(platform.starterCatalog?.licensedProjectIds || []),
        ...platform.catalogLicenses.map(license => license.sourceProjectId),
        ...platform.originalCommissions.flatMap(commission => commission.canonicalProjectId
            ? [commission.canonicalProjectId] : []),
    ])].sort();
    const routes = [
        ...(pricing.streams.includes('subs')
            ? pricing.plans.map(plan => ({ kind: 'SUBSCRIPTION' as const, planId: plan.id })) : []),
        ...(pricing.streams.includes('ads') ? [{ kind: 'AD_SUPPORTED' as const }] : []),
        ...(pricing.streams.includes('rentals')
            ? [{ kind: 'RENTAL' as const }, { kind: 'PURCHASE' as const }] : []),
    ];
    const routePlayer = { ...player, ownedStreamingPlatform: platform };
    const readTitleRoute = createStreamingTitleRouteReadBatch(player, absoluteWeek, platform, eligibleOwnedIds, context);
    const playableIds = new Set<string>();
    const subscriptionCatalogueStrengthByCountry: Record<string, number> = {};
    const storeCatalogueStrengthByCountry: Record<string, number> = {};
    const deliveredService = streamingDeliveredService(routePlayer, absoluteWeek);
    /* an open incident's viewers cancel more (#51): its reach × its kind's churn harm; none open, nothing */
    const incidentChurn = getStreamingIncidentHarm(platform).extraChurn;
    const techTree = resolveStreamingTechTree(platform);
    /* Playback keeps viewers (#53), Safe payments keeps cards from failing (#54) and Smart AI's best
       recommendations step keeps them watching (#59): their owned steps take their cut off the weekly
       churn; none owned, nothing */
    const playbackChurnCut = streamingTechChurnCut(techTree);
    const customerExperienceByCountry: NonNullable<WorldStreamingPlatformOffer['customerExperienceByCountry']> = {};
    const entryByProject = new Map(programEntries.map(entry => [entry.projectId, entry]));
    const facts = new Map(titleIds.map(projectId => {
        const entry = entryByProject.get(projectId);
        return [projectId, { quality: streamingTitleQuality(player, projectId, context),
            weeksAvailable: entry ? streamingTitleWeeksAvailable(routePlayer, entry, absoluteWeek) : 52,
            genre: entry?.genre || 'UNKNOWN', languageId: streamingTitleLanguageId(player, projectId, context) }];
    }));
    // How much of each market's catalogue a region's subtitles and dubbing carry
    // into its languages (quality-weighted; 1 = every title is in another
    // language and both tracks reach it). Levels reach the library, then new
    // releases, then day-one premieres, by each title's weeks on the service.
    const resolveCountryLocalization = createStreamingCountryLocalizationResolver(platform);
    const localizedShareByCountry: Record<string, number> = {};
    const catalogueStrengthByCountry = Object.fromEntries(activeCountryIds.map(countryId => {
        const subscriptionPlayable = new Set<string>();
        const playable = titleIds.filter(projectId => {
            const paid = routes.filter(route => route.kind === 'SUBSCRIPTION').some(route => (
                readTitleRoute(projectId, countryId, route).allowed
            ));
            if (paid) subscriptionPlayable.add(projectId);
            return paid || routes.filter(route => route.kind !== 'SUBSCRIPTION').some(route => (
                readTitleRoute(projectId, countryId, route).allowed
            ));
        });
        const playableSet = new Set(playable);
        playable.forEach(id => playableIds.add(id));
        const languages = player.world.worldPopulation?.countries[countryId]?.languages || [];
        const reach = resolveCountryLocalization(languages);
        if (reach.packageId) {
            const spoken = languages.map(normalizeStreamingLanguageId);
            const qualityTotal = playable.reduce((sum, id) => sum + Math.max(1, facts.get(id)!.quality), 0);
            localizedShareByCountry[countryId] = qualityTotal > 0
                ? playable.reduce((sum, id) => {
                    const fact = facts.get(id)!;
                    if (spoken.includes(fact.languageId)) return sum;
                    return sum + Math.max(1, fact.quality) * localizationCoverageShare(resolveTitleLanguageFit(reach, fact.weeksAvailable));
                }, 0) / qualityTotal
                : 0;
        }
        const storePlayable=playable.filter(projectId=>readTitleRoute(projectId,countryId,{kind:'RENTAL'}).allowed
            || readTitleRoute(projectId,countryId,{kind:'PURCHASE'}).allowed);
        storeCatalogueStrengthByCountry[countryId]=streamingCatalogueValue(storePlayable.map(id=>facts.get(id)!)).strength;
        const paidValue = streamingCatalogueValue([...subscriptionPlayable].map(id => facts.get(id)!));
        const value = streamingCatalogueValue(playable.map(id => facts.get(id)!));
        subscriptionCatalogueStrengthByCountry[countryId] = paidValue.strength;
        customerExperienceByCountry[countryId] = {
            quality: paidValue.quality, freshness: paidValue.freshness, delivery: deliveredService,
            weeklyChurnRate: clamp(.006 + .028 * (1 - paidValue.quality / 100)
                + .02 * (1 - paidValue.freshness) + .12 * (1 - deliveredService / 100) + incidentChurn - playbackChurnCut, .006, .25),
        };
        return [countryId, value.strength];
    }));
    const catalogueStrengthIndex = activeCountryIds.length
        ? round2(activeCountryIds.reduce((sum, countryId) => sum + catalogueStrengthByCountry[countryId], 0)
            / activeCountryIds.length) : 0;
    const localizationLevels = Object.values(platform.localizationOperations.legacyPackageGrants || {}).length;
    const localizationStrengthIndex = clamp(
        platform.technologyLevels.CONTENT_OPERATIONS * 8 + localizationLevels * 4 + platform.localizationOperations.titleLanguageAssets.length * .5,
        0,
        100,
    );
    // Region subtitles and dubbing make the service easier to choose where its
    // catalogue is in other languages: up to +40 when they carry all of it, on
    // top of the plain index (which tops out at 100 from content operations
    // alone, so the regions add above it). Never lower than the plain index; a
    // market no region reaches is unchanged.
    const localizationStrengthByCountry: Record<string, number> = Object.fromEntries(activeCountryIds.map(countryId => {
        const bonus = STREAMING_LOCALIZATION_APPEAL_WEIGHT * (localizedShareByCountry[countryId] || 0);
        return [countryId, round2(localizationStrengthIndex + clamp(bonus, 0, STREAMING_LOCALIZATION_APPEAL_WEIGHT))];
    }));
    const reliabilityIndex = deliveredService;
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
    const playerMarketingIndex = clamp(platform.competitiveWorld.rivalryHeat + 35 + decisionMarketingBoost + campaignMarketingBoost, 0, 100);
    /* #145: where the campaign engine built awareness, the index is higher there */
    const playerMarketingByCountry = streamingCampaignMarketingByCountry(platform, playerMarketingIndex);
    const weeksSinceOfferStart = platform.launchCommit
        ? Math.max(0, absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek)
        : platform.launchProgram.status === 'LAUNCHED'
            ? Math.max(0, absoluteWeek - platform.identity.foundedAtAbsoluteWeek)
            : 0;
    const accessPlans = pricing.streams.includes('subs') && pricing.plans.length
        ? pricing.plans
        : [{
            id: 'OPEN_ACCESS',
            name: pricing.streams.includes('ads') ? 'Free access' : 'Transaction access',
            monthly: 0,
            featureIds: ['catalogue'],
            ads: pricing.streams.includes('ads'),
        }];
    const programWeek = platform.launchCommit
        ? Math.max(1, absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek + 1)
        : null;
    const upcomingEntries = programWeek === null ? [] : (platform.launchSlate?.entries || []).filter(entry => (
        entry.launchWeek > programWeek && entry.launchWeek <= programWeek + 4
    ));
    // Smarter ad breaks (#61): viewers mind the player's ads less; without it, 1
    const adPenaltyFactor = streamingTechAdEffects(techTree).annoyance;
    const plans: WorldStreamingPlanOffer[] = accessPlans.map(plan => {
        const offer = resolveStreamingPlanOffer(plan, techTree);
        // #103 (plan §18.3): an ad plan shows ads only while ads run; at 0 ad minutes an hour it is an ad-free plan to
        // viewers, with no ad penalty (it kept the penalty and showed no ads)
        const servesAds = plan.ads && pricing.ads.minutesPerHour > 0;
        const adLevel = servesAds ? resolveStreamingPlanAdLevel(plan) : 'NONE';
        return {
        id: plan.id,
        name: plan.name,
        monthlyPrice: plan.monthly,
        effectiveMonthlyPrice: effectiveMonthlyStreamingPlanPrice(
            plan.monthly,
            pricing.annualDiscount,
            pricing.introOffer,
            weeksSinceOfferStart,
            streamingIntroOfferAppliesTo(plan.id, pricing.introOfferPlanId),
            // Pay yearly (#71): the player's subscribers pay yearly as its discount draws them
            streamingAnnualBillingShare(pricing.annualDiscount),
        ),
        monthlyBillingPrice: streamingBillingPathPrice(plan.monthly, pricing.annualDiscount, pricing.introOffer,
            weeksSinceOfferStart, 'MONTHLY', streamingIntroOfferAppliesTo(plan.id, pricing.introOfferPlanId)),
        annualBillingMonthlyPrice: streamingBillingPathPrice(plan.monthly, pricing.annualDiscount, pricing.introOffer,
            weeksSinceOfferStart, 'ANNUAL', streamingIntroOfferAppliesTo(plan.id, pricing.introOfferPlanId)),
        // #62: Kids profiles, where the plan includes them, is what family households read
        featureIds: [...plan.featureIds, ...(streamingPlanIncludes(offer, 'kids', techTree) && !plan.featureIds.includes('kids') ? ['kids'] : [])],
        ads: servesAds,
        appealIndex: playerPlanAppeal(plan.featureIds, streamingPlanOfferAppeal(offer, techTree), STREAMING_AD_LEVEL_EFFECTS[adLevel].appeal * adPenaltyFactor,
            plan.featureIds.includes('early') && upcomingEntries.some(entry => activeCountryIds.some(countryId => (
                readTitleRoute(entry.projectId, countryId, { kind: 'SUBSCRIPTION', planId: plan.id }).allowed
            )))),
        adLevel,
        pictureRank: streamingPictureRank(offer.picture),
        // #106: a phones-only plan
        ...(offer.devices === 'MOBILE' ? { mobileOnly: true } : {}),
        };
    });
    // Free with ads' quality (#46): its offer's appeal, once the player has set it
    const freeAdQualityIndex = pricing.freeAdOffer ? round2(streamingPlanOfferAppeal(pricing.freeAdOffer, techTree)) : undefined;
    // Playback's appeal to Habit streamers and the homes Apps and devices reach (#53); none owned, neither is set
    const habitAppealIndex = streamingTechHabitAppeal(techTree);
    const deviceReach = streamingTechDeviceReach(techTree);
    // Watch party draws family households to the whole service (#60), Kids profiles to the plans that
    // include them (#62); none owned, neither is set
    const kidsAppealIndex = streamingTechKidsAppeal(techTree);
    const familyAppealIndex = Math.round((streamingTechFamilyAppeal(techTree) - kidsAppealIndex) * 100) / 100;
    // Content protection past DRM (#55): fewer homes pirate its titles, and piracy-prone homes pay instead
    const protectionIndex = Math.round(streamingTechPiracyProtection(techTree) * 100);
    // Sharing control (#56): Device check, Paid extra member and Household detection; none owned, none set
    const sharingCheckFactor = streamingTechSharingFactor(techTree);
    const extraMemberShare = streamingTechExtraMemberShare(techTree);
    const crackdownFactor = streamingTechCrackdownFactor(techTree);
    // #106: while it sells a phones-only plan, how many homes in each market watch on a phone alone
    const phoneOnlyShareByCountry = plans.some(plan => plan.mobileOnly)
        ? Object.fromEntries(activeCountryIds.map(countryId => {
            const country = player.world.worldPopulation?.countries[countryId];
            return [countryId, country ? streamingPhoneOnlyShare(country) : 0];
        }))
        : undefined;
    const sourceFingerprint = createDeterministicId('world-streaming-player-offer', platform.serviceConfiguration.revision,
        activeCountryIds.join(','), plans.map(plan => `${plan.id}:${plan.monthlyPrice}:${plan.featureIds.join('.')}:${plan.ads}:${plan.appealIndex}`).join('|'),
        commercialSignature(pricing),
        catalogueStrengthIndex, activeCountryIds.map(id => `${id}:${catalogueStrengthByCountry[id]}`).join(','),
        activeCountryIds.map(id => `${id}:${subscriptionCatalogueStrengthByCountry[id]}`).join(','),
        JSON.stringify(storeCatalogueStrengthByCountry), JSON.stringify(customerExperienceByCountry), localizationStrengthIndex,
        JSON.stringify(localizationStrengthByCountry), reliabilityIndex, platform.competitiveWorld.globalPrestige,
        platform.competitiveWorld.rivalryHeat, platform.metrics.subscribers, weeksSinceOfferStart,
        // only a set free tier, Playback's habit appeal or Apps' reach adds to the fingerprint, so an unchanged save keeps its own
        ...(freeAdQualityIndex !== undefined ? [`free:${freeAdQualityIndex}`] : []),
        ...(habitAppealIndex > 0 ? [`habit:${habitAppealIndex}`] : []),
        ...(familyAppealIndex > 0 ? [`family:${familyAppealIndex}`] : []),
        ...(kidsAppealIndex > 0 ? [`kids:${kidsAppealIndex}`] : []),
        ...(adPenaltyFactor < 1 ? [`adpen:${adPenaltyFactor}`] : []),
        ...(deviceReach > 0 ? [`reach:${deviceReach}`] : []),
        ...(protectionIndex > 0 ? [`protect:${protectionIndex}`] : []),
        ...(sharingCheckFactor < 1 ? [`check:${sharingCheckFactor}`] : []),
        ...(extraMemberShare > 0 ? [`extra:${extraMemberShare}`] : []),
        ...(crackdownFactor < 1 ? [`crackdown:${crackdownFactor}`] : []),
        ...(phoneOnlyShareByCountry ? [`mobile:${plans.filter(plan => plan.mobileOnly).map(plan => plan.id).join('.')}`] : []));
    return {
        platformId: 'PLAYER',
        name: platform.identity.name,
        isPlayer: true,
        activeCountryIds,
        plans,
        commercialConfiguration: pricing,
        annualDiscountPercent: pricing.annualDiscount,
        introOfferPercent: pricing.introOffer,
        catalogueStrengthIndex: round2(catalogueStrengthIndex),
        catalogueStrengthByCountry,
        subscriptionCatalogueStrengthByCountry,
        storeCatalogueStrengthByCountry,
        customerExperienceByCountry,
        localizationStrengthIndex: round2(localizationStrengthIndex),
        localizationStrengthByCountry,
        /* #153: a service is taken at 45 until its prestige passes that; before, its first points of prestige (an
           award nomination, a counter-programme) dropped its reputation from 45 to them */
        reputationIndex: clamp(Math.max(45, platform.competitiveWorld.globalPrestige), 0, 100),
        reliabilityIndex: round2(clamp(reliabilityIndex + decisionReliabilityBoost, 0, 100)),
        marketingIndex: playerMarketingIndex,
        ...(playerMarketingByCountry ? { marketingIndexByCountry: playerMarketingByCountry } : {}),
        loyaltyIndex: clamp(35 + Math.log10(Math.max(1, platform.metrics.subscribers)) * 5 + decisionLoyaltyBoost, 20, 100),
        maturityWeeks: weeksSinceOfferStart,
        ...(freeAdQualityIndex !== undefined ? { freeAdQualityIndex } : {}),
        ...(habitAppealIndex > 0 ? { habitAppealIndex } : {}),
        ...(familyAppealIndex > 0 ? { familyAppealIndex } : {}),
        ...(kidsAppealIndex > 0 ? { kidsAppealIndex } : {}),
        ...(adPenaltyFactor < 1 ? { adPenaltyFactor } : {}),
        ...(deviceReach > 0 ? { deviceReach } : {}),
        ...(protectionIndex > 0 ? { protectionIndex } : {}),
        ...(sharingCheckFactor < 1 ? { sharingCheckFactor } : {}),
        ...(extraMemberShare > 0 ? { extraMemberShare } : {}),
        ...(crackdownFactor < 1 ? { crackdownFactor } : {}),
        ...(phoneOnlyShareByCountry ? { phoneOnlyShareByCountry } : {}),
        countryMomentum: {},
        preferredGenres: [...new Set(entries.filter(entry => playableIds.has(entry.projectId))
            .map(entry => entry.genre as Genre))].slice(0, 3),
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

/* the best picture a rival's tree holds, as a rank (4K is 3) */
const rivalPictureRank = (tree: StreamingRivalTechGrowth['tree']): number => (
    (['PICTURE_24K', 'PICTURE_16K', 'PICTURE_12K', 'PICTURE_8K', 'PICTURE_4K'] as const)
        .map(id => (streamingTechVersion(tree, id) >= 1 ? streamingPictureRank(id) : -1)).find(rank => rank >= 0) ?? STREAMING_4K_PICTURE_RANK
);
const STREAMING_4K_PICTURE_RANK = streamingPictureRank('PICTURE_4K');

const createAiPlans = (
    operator: StreamingEcosystemOperator,
    includeFreeAdAccess: boolean,
    growth: StreamingRivalTechGrowth,
): Omit<WorldStreamingPlanOffer, 'effectiveMonthlyPrice' | 'monthlyBillingPrice' | 'annualBillingMonthlyPrice'>[] => {
    const techTree = growth.tree;
    const prestigePrice = operator.prestige * .055 + operator.cataloguePower * .035;
    const homeAdjustment = operator.kind === 'REGIONAL_REAL' ? -.9 : operator.kind === 'DYNAMIC_FICTIONAL' ? -.3 : 1.2;
    const jitter = (hashUnit(operator.id) - .5) * 1.8;
    /* every codec and optimisation step a rival takes trims its prices a little (#69's VALUE style) *(start)* */
    const optimised = growth.steps.filter(step => getStreamingTechDefinition(step.techId)?.group === 'OPTIMISATION').length;
    const middle = round2(clamp(5.5 + prestigePrice + homeAdjustment + jitter, 4.5, 18) * Math.max(.85, 1 - optimised * .03));
    /* screens and kids profiles a rival has taken (#69's FAMILY style) */
    const screens6 = streamingTechVersion(techTree, 'FAM_SCREENS') >= 3;
    const kids = streamingTechVersion(techTree, 'FAM_KIDS') >= 1;
    const planCount = operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL' || operator.startingClass === 'GLOBAL_ENTRANT'
        ? 3 : operator.cataloguePower + operator.technology >= 160 ? 2 : 1;
    const plans: Array<{ id: string; name: string; monthly: number; features: string[]; ads: boolean }> = [];
    if (includeFreeAdAccess) {
        plans.push({ id: 'FREE', name: 'Free', monthly: 0, features: ['hd', 'catalogue'], ads: true });
    }
    if (planCount >= 2) plans.push({ id: 'VALUE', name: 'Essential', monthly: middle * .62, features: ['hd', 'streams2'], ads: true });
    plans.push({ id: 'STANDARD', name: planCount === 1 ? 'Access' : 'Standard', monthly: middle, features: ['hd', 'streams2', 'downloads', 'catalogue'], ads: false });
    if (planCount >= 3) plans.push({ id: 'PREMIUM', name: 'Premiere', monthly: middle * 1.48, features: ['uhd', 'spatial', screens6 ? 'streams6' : 'streams4', 'downloads', 'noads', 'catalogue'], ads: false });
    /* A rival offers only the picture and sound its tech allows (the plan's §9), and its best
       picture once it has gone past 4K (#69). */
    return plans.map(plan => {
        const featureIds = [...gateRivalStreamingPlanFeatures(techTree, plan.features), ...(kids ? ['kids'] : [])];
        return {
            id: plan.id,
            name: plan.name,
            monthlyPrice: round2(plan.monthly),
            featureIds,
            ads: plan.ads,
            appealIndex: planAppeal(featureIds, plan.ads),
            adLevel: plan.ads ? 'STANDARD' as const : 'NONE' as const,
            pictureRank: featureIds.includes('uhd') ? Math.max(featurePictureRank(featureIds), rivalPictureRank(techTree)) : featurePictureRank(featureIds),
        };
    });
};

const createAiOffer = (player: Player, operator: StreamingEcosystemOperator, absoluteWeek: number): WorldStreamingPlatformOffer | null => {
    if (operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED' || !operator.activeCountryIds.length) return null;
    if (player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds?.some(id => (
        id === operator.corePlatformId || id === operator.id
    ))) return null;
    const authoritative = operator.corePlatformId ? player.world.platforms?.[operator.corePlatformId] : null;
    const ai = authoritative?.ai;
    const activeCountryIds = [...new Set((ai?.capabilities.activeCountryIds || operator.activeCountryIds)
        .map(id => String(id || '').trim().toUpperCase()).filter(Boolean))].sort();
    if (!activeCountryIds.length) return null;
    const technologyLevels = ai ? Object.values(ai.capabilities.technologyLevels) : [];
    const technology = technologyLevels.length
        ? technologyLevels.reduce((sum, value) => sum + value, 0) / technologyLevels.length * 10
        : operator.technology;
    const baseCommercialConfiguration = createAiStreamingCommercialConfiguration({
        platformId: operator.id,
        kind: operator.kind,
        technology,
        brandPower: operator.brandPower,
        cataloguePower: operator.cataloguePower,
        prestige: authoritative?.reputation ?? operator.prestige,
        absoluteWeek,
        foundedAtAbsoluteWeek: operator.foundedAtAbsoluteWeek,
    });
    const includeFreeAdAccess = baseCommercialConfiguration.streams.includes('ads') && (
        operator.id === 'YOUTUBE'
        || (operator.kind === 'DYNAMIC_FICTIONAL' && hashUnit(`${operator.id}:free-ad-access`) < .18)
    );
    /* its style and pace (#69): the steps it has taken since the player's service first ran under them */
    const paceFrom = Number(player.ownedStreamingPlatform?.rivalTechFromWeek);
    const growth = resolveRivalStreamingTechGrowth(operator.corePlatformId || operator.id, operator.technology,
        ai?.capabilities.technologyLevels.PLAYBACK_QUALITY, Number.isFinite(paceFrom) ? absoluteWeek - paceFrom : 0);
    const listedPlans = baseCommercialConfiguration.streams.includes('subs')
        ? createAiPlans(operator, includeFreeAdAccess, growth) : [];
    const techEdge = rivalTechEdge(growth);
    const annualDiscountPercent = round2(clamp(8 + (100 - operator.brandPower) * .12 + hashUnit(`${operator.id}:annual`) * 8, 5, 24));
    const introOfferPercent = round2(clamp((100 - operator.brandPower) * .18 + hashUnit(`${operator.id}:intro`) * 10, 0, 28));
    const introOfferPlanId = listedPlans.length > 1 && hashUnit(`${operator.id}:intro-target`) < .5
        ? listedPlans[listedPlans.length - 1].id
        : undefined;
    const commercialConfiguration: OwnedStreamingPricingConfiguration = normalizeStreamingPricingConfiguration({
        ...baseCommercialConfiguration,
        annualDiscount: annualDiscountPercent,
        introOffer: introOfferPercent,
        introOfferPlanId,
        plans: listedPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        monthly: plan.monthlyPrice,
        featureIds: [...plan.featureIds],
        ads: plan.ads,
        })),
    });
    const weeksSinceOfferStart = Math.max(0, absoluteWeek - operator.foundedAtAbsoluteWeek);
    const marketingIndex = clamp(40 + Math.max(0, ...Object.values(operator.marketMomentum)) * 4 + operator.brandPower * .25, 0, 100);
    /* #152: where its campaigns built awareness, its index is higher there, as the player's is */
    const marketingByCountry = ai?.campaignBook ? streamingCampaignMarketingByCountry(ai, marketingIndex) : undefined;
    const plans: WorldStreamingPlanOffer[] = listedPlans.map(plan => ({
        ...plan,
        effectiveMonthlyPrice: effectiveMonthlyStreamingPlanPrice(
            plan.monthlyPrice,
            commercialConfiguration.annualDiscount,
            commercialConfiguration.introOffer,
            weeksSinceOfferStart,
            streamingIntroOfferAppliesTo(plan.id, commercialConfiguration.introOfferPlanId),
        ),
        monthlyBillingPrice: streamingBillingPathPrice(plan.monthlyPrice, commercialConfiguration.annualDiscount,
            commercialConfiguration.introOffer, weeksSinceOfferStart, 'MONTHLY',
            streamingIntroOfferAppliesTo(plan.id, commercialConfiguration.introOfferPlanId)),
        annualBillingMonthlyPrice: streamingBillingPathPrice(plan.monthlyPrice, commercialConfiguration.annualDiscount,
            commercialConfiguration.introOffer, weeksSinceOfferStart, 'ANNUAL',
            streamingIntroOfferAppliesTo(plan.id, commercialConfiguration.introOfferPlanId)),
    }));
    return {
        platformId: operator.id,
        name: authoritative?.name || operator.name,
        isPlayer: false,
        activeCountryIds,
        plans,
        commercialConfiguration,
        annualDiscountPercent,
        introOfferPercent,
        catalogueStrengthIndex: clamp(ai?.audienceHealth.catalogueStrengthIndex ?? operator.cataloguePower, 0, 100),
        localizationStrengthIndex: clamp(ai
            ? (ai.capabilities.subtitleCoveragePercent + ai.capabilities.dubCoveragePercent) / 2
            : operator.localization, 0, 100),
        reputationIndex: clamp(authoritative?.reputation ?? operator.prestige, 0, 100),
        reliabilityIndex: clamp(45 + technology * .5, 0, 100),
        marketingIndex,
        ...(marketingByCountry ? { marketingIndexByCountry: marketingByCountry } : {}),
        loyaltyIndex: clamp(25 + operator.brandPower * .45 + Math.log10(Math.max(1, operator.subscriberMillions)) * 5, 0, 100),
        maturityWeeks: weeksSinceOfferStart,
        countryMomentum: { ...operator.marketMomentum },
        preferredGenres: [...operator.preferredGenres],
        ...techEdge,
        sourceFingerprint: createDeterministicId('world-streaming-ai-offer', operator.id, activeCountryIds.join(','),
            operator.cataloguePower, operator.localization, operator.technology, operator.brandPower, operator.prestige,
            commercialSignature(commercialConfiguration),
            weeksSinceOfferStart, ai?.audienceHealth.catalogueStrengthIndex, ai?.capabilities.subtitleCoveragePercent,
            ai?.capabilities.dubCoveragePercent, authoritative?.reputation,
            ...(growth.steps.length ? [`tech:${growth.steps.map(step => `${step.techId}${step.version}`).join('.')}`] : [])),
    };
};

/**
 * What a rival's steps since its start add to its offer (#69), the way the player's tree adds to
 * the player's: Playback's pull on habit streamers, families' screens and kids profiles, homes its
 * apps reach, protection where homes pirate, and ads that cost it less, fill more slots and win more
 * of the market's ad money. Only what the steps added: none taken, none set, so the offer is exactly
 * as before.
 */
const rivalTechEdge = (growth: StreamingRivalTechGrowth): Partial<WorldStreamingPlatformOffer> => {
    if (!growth.steps.length) return {};
    const { base, tree } = growth;
    const added = (measure: (state: StreamingRivalTechGrowth['tree']) => number) => Math.max(0, measure(tree) - measure(base));
    const habit = round2(added(streamingTechHabitAppeal));
    const kids = round2(added(streamingTechKidsAppeal));
    const family = round2(added(state => streamingTechFamilyAppeal(state) - streamingTechKidsAppeal(state)));
    const reach = round2(added(streamingTechDeviceReach));
    const protection = Math.round(added(streamingTechPiracyProtection) * 100);
    const ads = streamingTechAdEffects(tree);
    const adsBefore = streamingTechAdEffects(base);
    const penalty = round2(ads.annoyance / adsBefore.annoyance);
    const slots = round2(ads.slots / adsBefore.slots);
    const slope = round2(ads.breakSlope / adsBefore.breakSlope);
    /* a quarter of the Commerce its targeting steps stand for, on its ads' audience quality *(start)* */
    const quality = round2(added(state => deriveStreamingTechEngineLevel(state, 'ADVERTISING_COMMERCE')) * .25);
    return {
        ...(habit > 0 ? { habitAppealIndex: habit } : {}),
        ...(family > 0 ? { familyAppealIndex: family } : {}),
        ...(kids > 0 ? { kidsAppealIndex: kids } : {}),
        ...(reach > 0 ? { deviceReach: reach } : {}),
        ...(protection > 0 ? { protectionIndex: protection } : {}),
        ...(penalty < 1 ? { adPenaltyFactor: penalty } : {}),
        ...(slots > 1 ? { adSlotFactor: slots } : {}),
        ...(slope < 1 ? { adBreakSlope: slope } : {}),
        ...(quality > 0 ? { adAudienceQualityBonus: quality } : {}),
    };
};

/** #117: the rivals' offers alone, with the kind of rival each is (the player's offer reads the catalogue, which the
    value news does not need) */
export const getWorldStreamingRivalOffers = (player: Player, absoluteWeek: number): Array<{ kind: StreamingEcosystemOperator['kind']; offer: WorldStreamingPlatformOffer }> => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const ecosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, week);
    return Object.values(ecosystem.operators).flatMap(operator => {
        const offer = createAiOffer(player, operator, week);
        return offer ? [{ kind: operator.kind, offer }] : [];
    });
};

export const getWorldStreamingOffers = (player: Player, absoluteWeek: number, preparedContext?: StreamingCatalogueReadContext): WorldStreamingOfferRegistry => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const offers = getWorldStreamingRivalOffers(player, week).map(rival => rival.offer);
    const playerOffer = createPlayerOffer(player, week, preparedContext);
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

/** Legacy AI offers retain their authored catalogue until canonical title access settles. */
export const getWorldStreamingStoreStrength = (offer:WorldStreamingPlatformOffer,countryId:string):number =>
    clamp(offer.storeCatalogueStrengthByCountry?.[countryId]
        ?? offer.catalogueStrengthByCountry?.[countryId] ?? offer.catalogueStrengthIndex,0,100);

/** Lightweight buyer lookup uses the same live commercial offer as audience billing. */
export const getWorldStreamingBuyerCommercialOffer = (player: Player, platformId: string, week: number): WorldStreamingPlatformOffer | null => {
    const ecosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, week);
    const operator = ecosystem.operators[platformId];
    return operator ? createAiOffer(player, operator, week) : null;
};
