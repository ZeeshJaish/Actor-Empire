import type { Player, StreamingBiddingPlatformInput } from '../types';
import { createDeterministicRng } from './deterministicRandom';
import { getPlatformFundingRelationshipMultiplier } from './streamingFundingLogic';
import { getForbesStreamingCompanies } from './streamingPlatformEcosystem';
import {
    buildStreamingPlatformLaunchCalendar,
    getStreamingPlatformAvailablePremiereWeeks,
} from './streamingReleaseCalendar';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum))
);

export interface ReleaseStreamingBidderMarketContext {
    projectId: string;
    title: string;
    genre: string;
    packageScore: number;
    absoluteWeek: number;
    earliestPremiereAbsoluteWeek?: number;
    studioPlatformRelations?: Record<string, unknown>;
}

export const alignStreamingBidderPremiereWeeks = (
    platforms: StreamingBiddingPlatformInput[],
): StreamingBiddingPlatformInput[] => {
    const supportByWeek = new Map<number, number>();
    for (const platform of platforms) {
        for (const week of new Set(platform.availablePremiereAbsoluteWeeks || [])) {
            supportByWeek.set(week, (supportByWeek.get(week) || 0) + 1);
        }
    }
    const sharedPremiereAbsoluteWeek = [...supportByWeek.entries()]
        .sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
    if (sharedPremiereAbsoluteWeek === undefined) return platforms.map(platform => ({ ...platform }));

    return platforms
        .map((platform, index) => ({
            platform: {
                ...platform,
                availablePremiereAbsoluteWeek: (platform.availablePremiereAbsoluteWeeks || []).includes(sharedPremiereAbsoluteWeek)
                    ? sharedPremiereAbsoluteWeek
                    : platform.availablePremiereAbsoluteWeek,
            },
            index,
            supportsSharedPremiere: (platform.availablePremiereAbsoluteWeeks || []).includes(sharedPremiereAbsoluteWeek),
        }))
        .sort((left, right) => Number(right.supportsSharedPremiere) - Number(left.supportsSharedPremiere) || left.index - right.index)
        .map(candidate => candidate.platform);
};

export const buildReleaseStreamingBidderMarket = (
    player: Pick<Player, 'world'>,
    context: ReleaseStreamingBidderMarketContext,
): StreamingBiddingPlatformInput[] => {
    const marketRng = createDeterministicRng(`release-bidder-count:${context.projectId}:${context.absoluteWeek}`);
    const bidderCount = 5 + Math.floor(marketRng() * 4);
    const normalizedGenre = String(context.genre || 'UNKNOWN').toUpperCase();
    const launchCalendar = buildStreamingPlatformLaunchCalendar(player, context.absoluteWeek);
    const earliestPremiereAbsoluteWeek = Math.max(
        context.absoluteWeek + 1,
        Math.round(Number(context.earliestPremiereAbsoluteWeek) || 0),
    );
    const candidates = getForbesStreamingCompanies(player)
        .filter(company => company.kind !== 'PLAYER' && company.lifecycle !== 'CLOSED' && company.lifecycle !== 'ACQUIRED')
        .filter(company => (company.cashMillions || 0) >= 2)
        .map(company => {
            const availablePremiereAbsoluteWeeks = getStreamingPlatformAvailablePremiereWeeks(
                launchCalendar,
                company.id,
                earliestPremiereAbsoluteWeek,
                12,
            );
            if (!availablePremiereAbsoluteWeeks.length) return null;
            const companyRng = createDeterministicRng(`release-bidder:${context.projectId}:${context.title}:${normalizedGenre}:${context.absoluteWeek}:${company.id}`);
            const cashMillions = Math.max(2, Number(company.cashMillions) || 0);
            const subscribers = Math.max(0, Number(company.subscribersMillions) || 0);
            const valuation = Math.max(0, Number(company.valuationBillions) || 0);
            const prestige = clamp(Number(company.prestige) || 50, 0, 100);
            const cataloguePower = clamp(Number(company.cataloguePower) || 50, 0, 100);
            const technology = clamp(Number(company.technology) || 50, 0, 100);
            const localization = clamp(Number(company.localization) || 50, 0, 100);
            const momentum = clamp(Number(company.momentum) || 0, -100, 100);
            const cashAvailable = Math.round(cashMillions * 1_000_000);
            const baseBid = Math.round(Math.max(
                1_000_000,
                Math.min(90_000_000, cashAvailable * (0.002 + companyRng() * 0.003) + subscribers * 40_000),
            ) / 100_000) * 100_000;
            const acquisitionCeiling = Math.round(Math.min(
                cashAvailable,
                Math.max(baseBid * 5, cashAvailable * clamp(0.045 + prestige / 1_500 + companyRng() * 0.025, 0.05, 0.15)),
            ) / 100_000) * 100_000;
            const kindSharedBias = company.kind === 'REGIONAL' || company.kind === 'DYNAMIC' ? 0.24 : 0.08;
            const backendPreference = clamp(
                0.18 + (100 - cataloguePower) / 260 + companyRng() * 0.18,
                0.1,
                0.8,
            );
            const sharedRightsPreference = clamp(
                kindSharedBias + (100 - subscribers / 5) / 500 + companyRng() * 0.2,
                0.05,
                0.75,
            );
            const scaleScore = Math.log10(1 + subscribers) * 7 + Math.log10(1 + valuation) * 5 + Math.log10(1 + cashMillions) * 4;
            const launchDelayWeeks = Math.max(0, availablePremiereAbsoluteWeeks[0] - earliestPremiereAbsoluteWeek);
            const fitScore = companyRng() * 62 + scaleScore + prestige * 0.1 + technology * 0.05 + momentum * 0.04 - launchDelayWeeks * 1.75;
            return {
                fitScore,
                platform: {
                    id: company.id,
                    name: company.name,
                    color: company.brand.primaryColor,
                    cashAvailable,
                    baseBid,
                    acquisitionCeiling,
                    qualityPreference: Math.round(clamp(32 + prestige * 0.48 + cataloguePower * 0.12, 35, 92)),
                    relationshipMultiplier: getPlatformFundingRelationshipMultiplier(
                        context.studioPlatformRelations?.[company.id] as any,
                    ),
                    canStartNewBids: company.lifecycle === 'ACTIVE' || company.lifecycle === undefined,
                    localizationLevelCap: localization >= 68
                        ? 'DUBS_AND_SUBTITLES' as const
                        : localization >= 34 ? 'SUBTITLES' as const : 'NONE' as const,
                    localizationRequirements: [],
                    strategicCountryIds: [...(company.activeCountryIds || [])],
                    catalogueGapMultiplier: clamp(1.16 - cataloguePower / 500, 0.9, 1.16),
                    subscriberOpportunityMultiplier: clamp(0.9 + Math.min(0.28, subscribers / 1_000), 0.9, 1.18),
                    backendPreference,
                    sharedRightsPreference,
                    availablePremiereAbsoluteWeeks,
                    availablePremiereAbsoluteWeek: availablePremiereAbsoluteWeeks[0],
                } satisfies StreamingBiddingPlatformInput,
            };
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
        .sort((left, right) => right.fitScore - left.fitScore || left.platform.id.localeCompare(right.platform.id));

    return alignStreamingBidderPremiereWeeks(candidates.map(candidate => candidate.platform))
        .slice(0, Math.min(bidderCount, candidates.length));
};
