import type { StreamingTechId } from '../types';
import { streamingPlusLocks } from './streamingPlusPack';
import type {
    OwnedStreamingPricingConfiguration,
    Player,
    StreamingIdentPackageId,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';
import { STREAMING_STOREFRONT_LAYOUTS, getStreamingStorefrontLock, normalizeStreamingStorefrontLayoutId } from './streamingStorefront';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';
import { getStreamingPlanBuilderView, type StreamingPlanBuilderView } from './streamingPlanBuilder';
import type { StreamingSharingControl, StreamingSharingPolicyFigures } from './streamingSharingPolicy';
import {
    resolveStreamingTechTree, streamingTechCrackdownFactor, streamingTechExtraMemberShare, streamingTechSharingFactor,
} from './streamingTechTreeCatalogue';

/**
 * The Platform room's Offer page in one cheap read: the saved offer, what each
 * plan and each way of earning brought in at the last weekly settlement, the
 * storefront catalogue with lock reasons, the ident, and the account-sharing
 * figures. Settled numbers are read only when the customer (WE5) and viewing
 * (WE6) layers processed the current week, the same rule the Audience room
 * uses, so the two rooms never disagree.
 */
export interface StreamingPlatformOfferView {
    live: boolean;
    pricing: OwnedStreamingPricingConfiguration;
    planStats: Record<string, { accounts: number; monthlyRevenue: number }>;
    /** Homes watching free with ads at the last weekly settlement (#46's free column). */
    freeAdViewers: number;
    /** Rentals and purchases at the last weekly settlement (#47's store column). */
    storeBuyers: number;
    earnings: { subscription: number; ads: number; store: number; settled: boolean };
    storefront: {
        currentId: string | null;
        layouts: Array<{ id: string; name: string; line: string; composition: string; category: string; locked: string | null; lockTech?: StreamingTechId | null; plus?: boolean }>;
    };
    ident: { label: string; detail: string };
    sharing: { settled: StreamingSharingPolicyFigures; available: boolean; control: StreamingSharingControl };
    /** The countries the saved offer is sold in, for the pricing forecast. */
    offerCountryIds: string[];
    absoluteWeek: number;
    /** The plan builder's rows, locks and starters, from the tech the service owns (Phase 2 #45). */
    planBuilder: StreamingPlanBuilderView;
}

const WEEKS_PER_MONTH = 4.33;
const round = (value: number) => Math.round(Number.isFinite(value) ? value : 0);
const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const IDENT_PACKAGE_NAME: Record<StreamingIdentPackageId, string> = {
    STANDARD: 'Sting', FULL: 'Full ident', CINEMATIC: 'Cinematic', GENRE: 'Genre set', ADAPTIVE: 'Adaptive', LIVING: 'Living ident',
};

export const getStreamingPlatformOfferView = (player: Player): StreamingPlatformOfferView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const live = Boolean(platform.launchCommit) && platform.lifecycle === 'ACTIVE';
    const configuration = platform.serviceConfiguration;
    const customers = player.world?.worldStreamingCustomers?.lastProcessedAbsoluteWeek === absoluteWeek
        ? player.world.worldStreamingCustomers.global : null;
    const viewing = player.world?.worldStreamingViewing?.lastProcessedAbsoluteWeek === absoluteWeek
        ? player.world.worldStreamingViewing.platforms?.PLAYER : null;
    const revenue = viewing?.revenue;
    const planStats = Object.fromEntries((customers?.playerPlanAllocations || []).map(row => [row.planId, {
        accounts: round(row.paidAccounts),
        monthlyRevenue: round(row.monthlySubscriptionRevenue),
    }]));
    const currentId = normalizeStreamingStorefrontLayoutId(configuration.storefrontLayoutId);
    const custom = configuration.customIdentAudio;
    const sound = configuration.soundIdentKey;
    return {
        live,
        pricing: normalizeStreamingPricingConfiguration(configuration.pricing),
        planStats,
        freeAdViewers: round(viewing?.accessMix.freeViewingAccounts ?? 0),
        storeBuyers: round((revenue?.rentalTransactions ?? 0) + (revenue?.purchaseTransactions ?? 0)),
        earnings: {
            subscription: round(customers?.playerMonthlySubscriptionRevenue ?? 0),
            ads: round((revenue?.advertisingRevenue ?? 0) * WEEKS_PER_MONTH),
            store: round(((revenue?.rentalRevenue ?? 0) + (revenue?.purchaseRevenue ?? 0)) * WEEKS_PER_MONTH),
            settled: Boolean(customers) || Boolean(revenue),
        },
        storefront: {
            currentId,
            layouts: STREAMING_STOREFRONT_LAYOUTS.map(layout => {
                // #109: a locked layout names its Tech step, and the tab opens it
                const lock = getStreamingStorefrontLock(platform, layout.id);
                /* Streaming+: 13 front pages need the pack (before any Tech step); the one in use stays */
                const plus = layout.id !== currentId && streamingPlusLocks(player, { kind: 'STOREFRONT', id: layout.id });
                return {
                    id: layout.id,
                    name: layout.name,
                    line: layout.line,
                    composition: layout.composition,
                    category: layout.category,
                    locked: plus ? 'Streaming+' : lock ? lock.tech : null,
                    lockTech: plus ? null : lock ? lock.techId : null,
                    plus,
                };
            }),
        },
        ident: {
            label: custom ? `Your own sound · ${custom.originalName}` : sound ? titleCase(sound) : 'Not chosen yet',
            detail: [
                configuration.identPackageId ? IDENT_PACKAGE_NAME[configuration.identPackageId] : null,
                configuration.identDurationSeconds > 0 ? `${configuration.identDurationSeconds}s before every title` : null,
            ].filter(Boolean).join(' · ') || 'Plays before every title',
        },
        sharing: {
            available: Boolean(customers),
            settled: {
                paidAccounts: round(customers?.playerEndingPaidAccounts ?? platform.metrics.subscribers),
                sharedHomes: round(customers?.playerExternalSharedHouseholds ?? 0),
                piracyReach: round(customers?.playerPiracyReach ?? 0),
                accessLoadAccounts: round(customers?.playerAccessLoadAccounts ?? platform.metrics.subscribers),
                extraMembers: round(customers?.playerExtraMemberHouseholds ?? 0),
            },
            // Sharing control in Tech (#56): what it does to the policy's figures
            control: (() => {
                const tree = resolveStreamingTechTree(platform);
                return {
                    crackdownFactor: streamingTechCrackdownFactor(tree),
                    sharingCheck: streamingTechSharingFactor(tree),
                    extraMemberShare: streamingTechExtraMemberShare(tree),
                    sellsExtraMember: normalizeStreamingPricingConfiguration(configuration.pricing).plans.some(plan => plan.featureIds.includes('extraseat')),
                };
            })(),
        },
        offerCountryIds: live ? getOwnedPlatformPackageCountryIds(platform) : [],
        absoluteWeek,
        planBuilder: getStreamingPlanBuilderView(platform),
    };
};

/**
 * The HQ's headline figure and money line for the service's main way of
 * earning. A subscription service is counted in paid accounts; a service with
 * no subscriptions has none, so it is counted in the homes watching it free
 * (ads) or the buyers of the last settled week (store), from the viewing
 * layer (WE6) — the same figures the Audience room shows.
 */
export interface StreamingPlatformHeadline {
    kind: 'ACCOUNTS' | 'AD_HOMES' | 'BUYERS';
    label: string;
    value: number;
    settled: boolean;
    revenueWeekly: number;
    hoursWeekly: number;
    adImpressions: number;
    rentals: number;
    purchases: number;
}

export const getStreamingPlatformHeadline = (player: Player): StreamingPlatformHeadline => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const pricing = normalizeStreamingPricingConfiguration(platform.serviceConfiguration.pricing);
    const subscription = pricing.streams.includes('subs') && pricing.plans.some(plan => plan.monthly > 0);
    const freeAds = pricing.streams.includes('ads') && Boolean(pricing.commercialOffers?.freeAdAccess);
    const store = pricing.streams.includes('rentals');
    /* #103 (plan §18.3): the main offer is the front door, so the headline is its number: subscribers, homes watching
       free, or buyers (it was subscribers whenever paid plans were on). An old save with no main offer reads as before. */
    const core = pricing.commercialOffers?.coreModel;
    const kind: StreamingPlatformHeadline['kind'] = core === 'ADVERTISING' && freeAds ? 'AD_HOMES'
        : core === 'STORE' && store ? 'BUYERS'
            : core === 'SUBSCRIPTION' && subscription ? 'ACCOUNTS'
                : subscription ? 'ACCOUNTS' : freeAds ? 'AD_HOMES' : store ? 'BUYERS' : 'ACCOUNTS';
    const row = player.world?.worldStreamingViewing?.lastProcessedAbsoluteWeek === absoluteWeek
        ? player.world.worldStreamingViewing.platforms?.PLAYER : null;
    const revenue = row?.revenue;
    const rentals = round(revenue?.rentalTransactions ?? 0);
    const purchases = round(revenue?.purchaseTransactions ?? 0);
    return {
        kind,
        label: kind === 'AD_HOMES' ? 'WATCHING FREE' : kind === 'BUYERS' ? 'BUYERS THIS WEEK' : 'SUBSCRIBERS',
        value: kind === 'AD_HOMES' ? round(row?.accessMix.freeViewingAccounts ?? 0) : kind === 'BUYERS' ? rentals + purchases : platform.metrics.subscribers,
        settled: Boolean(row),
        revenueWeekly: kind === 'AD_HOMES' ? round(revenue?.advertisingRevenue ?? 0)
            : kind === 'BUYERS' ? round((revenue?.rentalRevenue ?? 0) + (revenue?.purchaseRevenue ?? 0)) : 0,
        hoursWeekly: round(row?.totalHoursViewed ?? 0),
        adImpressions: round(revenue?.advertisingImpressions ?? 0),
        rentals,
        purchases,
    };
};
