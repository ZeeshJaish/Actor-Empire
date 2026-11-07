/**
 * Streaming delivery (codex-handoff/plans/platform-tech-plan.md §5, Phase 2): what each viewer
 * costs to serve, by the picture they watch.
 *
 *   load units   a viewer streams 1 unit at 1080p (a "stream" as the game always counted it),
 *                0.4 at 480p and 2.4 at 4K: §5's ratios. HDR, deep colour and lossless sound
 *                add a little. Servers carry units, so selling 4K needs more servers.
 *   Optimisation multiplies a viewer's units (and bandwidth) down (streamingTechTreeCatalogue).
 *   calibration  a save that ran weeks before load units keeps the peak load it had: its first
 *                close under them fixes 1 / (its viewers' load × its Optimisation), and only
 *                changes from there move it. A service that starts under load units has 1.
 *   bandwidth    a new weekly bill: viewing hours × $/HD-hour × the picture × Optimisation's
 *                cost factor × (1 + tech debt / 200). A save from before Phase 2 phases it in
 *                over 8 weeks.
 *
 * Pure: nothing here saves. The weekly close (streamingWeeklyLoop.ts) and the viewing engine
 * (worldStreamingViewing.ts) read it.
 */
import type {
    OwnedStreamingDeliveryEconomics,
    OwnedStreamingPlanOffer,
    OwnedStreamingPlatformState,
    OwnedStreamingTechTreeState,
    StreamingTechId,
} from '../types';
import { STREAMING_MOBILE_PLAN, deriveStreamingPlanOffer, resolveStreamingPlanOffer } from './streamingPlanOffer';
import { resolveStreamingStoreEditions } from './streamingStoreEditions';
import {
    resolveStreamingPlatformTechDebt,
    resolveStreamingTechTree,
    streamingTechCostFactor,
    streamingTechLoadFactor,
} from './streamingTechTreeCatalogue';

/** Load units a viewer streams at each picture step: 1080p = 1. */
export const STREAMING_PICTURE_LOAD: Partial<Record<StreamingTechId, number>> = {
    PICTURE_480P: .4,
    PICTURE_720P: .64,
    PICTURE_1080P: 1,
    PICTURE_4K: 2.4,
    PICTURE_8K: 5.6,
    PICTURE_12K: 9.6,
    PICTURE_16K: 14.4,
    PICTURE_24K: 24,
};
/** what HDR, deep colour and lossless sound add on top of the picture */
const HDR_ADDER: Partial<Record<StreamingTechId, number>> = { HDR_HDR: .1, HDR_PRO: .15, HDR_ULTRA: .2 };
const COLOUR_ADDER: Partial<Record<StreamingTechId, number>> = { COLOUR_12BIT: .05, COLOUR_16BIT: .1 };
const LOSSLESS_ADDER = .03;

/** Bandwidth for one viewing hour at 1080p, before Optimisation (about 3 GB at a big CDN's rate). */
export const STREAMING_DELIVERY_COST_PER_HD_HOUR = .008;
/** A save from before Phase 2 pays the new bandwidth bill in eighths, over this many weeks. */
export const STREAMING_DELIVERY_PHASE_IN_WEEKS = 8;
/** Viewing hours an access account stands for when the week has no viewing engine figure. */
const HOURS_PER_ACCESS_ACCOUNT = 9;

const LOSSLESS_SOUND: StreamingTechId[] = ['SOUND_LOSSLESS', 'SOUND_PERSONAL'];

/** Load units one viewer of an offer needs, before Optimisation: its picture, plus HDR, 12/16-bit colour and lossless sound;
    on a phones-only plan (#106) less, for the smaller screen. */
export const streamingOfferLoad = (offer: OwnedStreamingPlanOffer): number => (
    (STREAMING_PICTURE_LOAD[offer.picture] ?? 1)
    * (1 + (offer.hdr ? HDR_ADDER[offer.hdr] ?? 0 : 0) + (COLOUR_ADDER[offer.colour] ?? 0) + (LOSSLESS_SOUND.includes(offer.sound) ? LOSSLESS_ADDER : 0))
    * (offer.devices === 'MOBILE' ? STREAMING_MOBILE_PLAN.load : 1)
);

/** Load units a viewer of a plan saved with these features needs (Phase 1 plans), before Optimisation. */
export const streamingPlanLoad = (featureIds: string[], tree: OwnedStreamingTechTreeState): number => (
    streamingOfferLoad(deriveStreamingPlanOffer(featureIds, tree))
);

/** A plan and how many paying accounts sit on it (the customers engine's allocations). */
export interface StreamingDeliveryAllocation { planId: string; paidAccounts: number }

/** This week's viewers by how they watch: free with ads, rent or buy, and everyone else (paid, shared). */
export interface StreamingAccessViewers { free: number; store?: number; others: number }

/**
 * A viewer's load this week, before Optimisation: the plans' loads weighted by the accounts on
 * each. Viewers outside a plan (shared) are counted at the same mix, and so are free and store
 * viewers until the free tier's (#46) or the store's (#47) own quality is set: then they stream
 * it (the store's HD and top editions in their shares). With no accounts yet, the plans' plain
 * average.
 */
export const streamingAverageViewerLoad = (
    platform: Pick<OwnedStreamingPlatformState, 'serviceConfiguration'> & Partial<Pick<OwnedStreamingPlatformState, 'techTree' | 'technologyLevels'>>,
    allocations: StreamingDeliveryAllocation[] = [],
    viewers?: StreamingAccessViewers,
): number => {
    const tree = resolveStreamingTechTree(platform);
    const plans = platform.serviceConfiguration?.pricing?.plans || [];
    // each plan by its offer (Plans v2), or what its features stand for
    const loads = new Map(plans.map(plan => [plan.id, streamingOfferLoad(resolveStreamingPlanOffer(plan, tree))]));
    const base = streamingPlanLoad([], tree);
    let accounts = 0;
    let units = 0;
    allocations.forEach(row => {
        const paid = Math.max(0, Number(row.paidAccounts) || 0);
        accounts += paid;
        units += paid * (loads.get(row.planId) ?? base);
    });
    const mix = accounts > 0 ? units / accounts
        : loads.size ? [...loads.values()].reduce((sum, load) => sum + load, 0) / loads.size : base;
    const pricing = platform.serviceConfiguration?.pricing;
    const freeOffer = pricing?.freeAdOffer;
    // a store whose quality is set (#47); partial pricings (previews, fixtures) have none
    const store = pricing?.storeQuality && pricing.rentals ? resolveStreamingStoreEditions(pricing, tree) : null;
    const count = (value: number | undefined) => Math.max(0, Number(value) || 0);
    const free = freeOffer ? count(viewers?.free) : 0;
    const storeViewers = store?.set ? count(viewers?.store) : 0;
    if (free + storeViewers <= 0) return mix;
    // viewers whose own quality is not set count at the mix with everyone else
    const others = count(viewers?.others) + (freeOffer ? 0 : count(viewers?.free)) + (store?.set ? 0 : count(viewers?.store));
    const storeLoad = store?.set
        ? (1 - store.topRentShare) * streamingOfferLoad(store.hdOffer!) + store.topRentShare * streamingOfferLoad(store.topOffer ?? store.hdOffer!)
        : 0;
    return (mix * others + (freeOffer ? streamingOfferLoad(freeOffer) * free : 0) + storeLoad * storeViewers)
        / (others + free + storeViewers);
};

/** The calibration a platform runs under: the stored one, else what its first close would fix. */
export const resolveStreamingLoadCalibration = (
    platform: Pick<OwnedStreamingPlatformState, 'lastProcessedAbsoluteWeek'> & { deliveryEconomics?: OwnedStreamingDeliveryEconomics } & Partial<Pick<OwnedStreamingPlatformState, 'techTree' | 'technologyLevels'>>,
    averageViewerLoad: number,
): number => {
    const stored = platform.deliveryEconomics?.loadCalibration;
    if (stored !== undefined && Number.isFinite(stored) && stored > 0) return stored;
    if (platform.lastProcessedAbsoluteWeek === null || platform.lastProcessedAbsoluteWeek === undefined) return 1;
    return 1 / Math.max(.05, averageViewerLoad * streamingTechLoadFactor(resolveStreamingTechTree(platform)));
};

export interface StreamingDeliveryLoad {
    /** a viewer's load before Optimisation (the plan mix's picture) */
    averageViewerLoad: number;
    /** Optimisation's load factor */
    loadFactor: number;
    loadCalibration: number;
    /** load units a viewer stands for: average × factor × calibration */
    viewerLoad: number;
}

export const resolveStreamingDeliveryLoad = (
    platform: OwnedStreamingPlatformState,
    allocations: StreamingDeliveryAllocation[] = [],
    viewers?: StreamingAccessViewers,
): StreamingDeliveryLoad => {
    const averageViewerLoad = streamingAverageViewerLoad(platform, allocations, viewers);
    const loadFactor = streamingTechLoadFactor(resolveStreamingTechTree(platform));
    const loadCalibration = resolveStreamingLoadCalibration(platform, averageViewerLoad);
    return { averageViewerLoad, loadFactor, loadCalibration, viewerLoad: averageViewerLoad * loadFactor * loadCalibration };
};

/** The share of the bandwidth bill a week pays: 1, or k/8 in the k-th week of a phase-in. */
export const streamingDeliveryPhaseIn = (economics: OwnedStreamingDeliveryEconomics | undefined, absoluteWeek: number): number => {
    const from = economics?.costPhaseInFromWeek;
    if (from === undefined) return 1;
    return Math.max(0, Math.min(1, (absoluteWeek - from + 1) / STREAMING_DELIVERY_PHASE_IN_WEEKS));
};

/**
 * The week's bandwidth bill: hours × $/HD-hour × the viewers' picture × Optimisation's cost
 * factor × (1 + tech debt / 200) × the phase-in. Calibration does not apply: the bill is new,
 * so it is the phase-in that keeps an old save from a jump.
 */
export const streamingDeliveryWeeklyCost = (
    platform: OwnedStreamingPlatformState,
    input: { hoursViewed: number | null | undefined; accessLoadAccounts: number; averageViewerLoad: number; phaseIn: number },
): number => {
    const hours = Math.max(0, Number.isFinite(Number(input.hoursViewed)) && input.hoursViewed !== null && input.hoursViewed !== undefined
        ? Number(input.hoursViewed)
        : input.accessLoadAccounts * HOURS_PER_ACCESS_ACCOUNT);
    const debt = resolveStreamingPlatformTechDebt(platform);
    return Math.max(0, Math.round(
        hours * STREAMING_DELIVERY_COST_PER_HD_HOUR * input.averageViewerLoad
        * streamingTechCostFactor(resolveStreamingTechTree(platform)) * (1 + debt / 200) * input.phaseIn,
    ));
};

/** Normalises a saved delivery record (absent stays absent). */
export const normalizeStreamingDeliveryEconomics = (raw: unknown): OwnedStreamingDeliveryEconomics | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const record = raw as Record<string, unknown>;
    const calibration = Number(record.loadCalibration);
    if (!Number.isFinite(calibration) || calibration <= 0) return undefined;
    const week = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
    return {
        schemaVersion: 1,
        loadCalibration: Math.round(Math.min(100, Math.max(.01, calibration)) * 1_000_000) / 1_000_000,
        calibratedAtAbsoluteWeek: week(record.calibratedAtAbsoluteWeek),
        ...(record.costPhaseInFromWeek !== undefined && Number.isFinite(Number(record.costPhaseInFromWeek))
            ? { costPhaseInFromWeek: week(record.costPhaseInFromWeek) } : {}),
    };
};
