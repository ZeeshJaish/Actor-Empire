/**
 * Rent or buy's quality and editions (codex-handoff/plans/platform-tech-plan.md §6.5, Phase 2 #47):
 * "set prices per quality (e.g. rent HD $3.99, rent 4K $5.99, buy 4K $19.99) … Rent or buy uses
 * the same tech as plans."
 *
 *   quality    the best the store sells (pricing.storeQuality), one tech step per row like a
 *              plan's offer; a better store converts more of its buyers: ×0.85 to ×1.35 against
 *              a 1080p stereo store, which is what rentals sold before
 *   editions   a store above 1080p sells two editions: HD at the rent / buy prices, and its top
 *              picture at storeTopEdition's prices (or the HD prices when it has none). 60% of
 *              buyers take the top edition at the HD price, fewer as it costs more, at least 5%
 *   load       a store viewer streams the HD or the top edition in those shares (#42's units)
 *
 * Unset (no storeQuality): ×1, the HD prices, and store viewers counted at the plans' mix, all as
 * before. Pure: nothing here saves.
 */
import type { OwnedStreamingPlanOffer, OwnedStreamingPricingConfiguration, OwnedStreamingTechTreeState, StreamingTechId } from '../types';
import { streamingPictureRank, streamingPlanOfferAppeal } from './streamingPlanOffer';

/** The id and name the store stands under where plans are listed (locks, receipts, columns). */
export const STREAMING_STORE_ID = 'STORE';
export const STREAMING_STORE_NAME = 'Rent or buy';

const HD_RANK = streamingPictureRank('PICTURE_1080P');
/** A 1080p stereo store's appeal points: what rentals sold before #47. */
const STORE_BASELINE_APPEAL = 5;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** How a store's quality moves its buyers: ×clamp(1 + (points − 5) / 50, 0.85, 1.35); unset ×1. */
export const streamingStoreQualityFactor = (appeal: number | undefined): number => (
    appeal === undefined || !Number.isFinite(appeal) ? 1 : Math.min(1.35, Math.max(.85, 1 + (appeal - STORE_BASELINE_APPEAL) / 50))
);

/** The share of buyers who take a top edition: 60% at the HD price, 0.8 points fewer for each 1% it costs more, at least 5%. */
export const streamingStoreTopEditionShare = (hdPrice: number, topPrice: number): number => {
    const uplift = Math.max(0, topPrice - hdPrice) / Math.max(.01, hdPrice);
    return Math.min(.6, Math.max(.05, .6 - .8 * uplift));
};

export interface StreamingStoreEditions {
    /** the store's quality is set */
    set: boolean;
    /** the HD prices: what buyers choose and afford on */
    hdRent: number;
    hdBuy: number;
    /** the top edition's picture, when the store sells above 1080p */
    topPicture: StreamingTechId | null;
    /** the top edition's own prices (null: it sells at the HD prices) */
    topRent: number | null;
    topBuy: number | null;
    /** the shares of rentals and purchases that are the top edition */
    topRentShare: number;
    topBuyShare: number;
    /** what a rental and a purchase earn on average */
    rentPrice: number;
    buyPrice: number;
    /** ×buyers from the store's quality */
    qualityFactor: number;
    /** what each edition streams (null while unset) */
    hdOffer: OwnedStreamingPlanOffer | null;
    topOffer: OwnedStreamingPlanOffer | null;
}

export const resolveStreamingStoreEditions = (
    pricing: Pick<OwnedStreamingPricingConfiguration, 'rentals' | 'storeQuality' | 'storeTopEdition'>,
    tree: OwnedStreamingTechTreeState,
): StreamingStoreEditions => {
    const hdRent = Number(pricing.rentals?.rent) || 0;
    const hdBuy = Number(pricing.rentals?.buy) || 0;
    const offer = pricing.storeQuality;
    if (!offer) {
        return {
            set: false, hdRent, hdBuy, topPicture: null, topRent: null, topBuy: null, topRentShare: 0, topBuyShare: 0,
            rentPrice: hdRent, buyPrice: hdBuy, qualityFactor: 1, hdOffer: null, topOffer: null,
        };
    }
    const above = streamingPictureRank(offer.picture) > HD_RANK;
    const top = above ? pricing.storeTopEdition : undefined;
    const topRentShare = above ? streamingStoreTopEditionShare(hdRent, top ? top.rent : hdRent) : 0;
    const topBuyShare = above ? streamingStoreTopEditionShare(hdBuy, top ? top.buy : hdBuy) : 0;
    return {
        set: true,
        hdRent,
        hdBuy,
        topPicture: above ? offer.picture : null,
        topRent: top ? top.rent : null,
        topBuy: top ? top.buy : null,
        topRentShare,
        topBuyShare,
        rentPrice: top ? round2(hdRent + topRentShare * Math.max(0, top.rent - hdRent)) : hdRent,
        buyPrice: top ? round2(hdBuy + topBuyShare * Math.max(0, top.buy - hdBuy)) : hdBuy,
        qualityFactor: streamingStoreQualityFactor(streamingPlanOfferAppeal(offer, tree)),
        hdOffer: above ? { ...offer, picture: 'PICTURE_1080P' } : offer,
        topOffer: above ? offer : null,
    };
};
