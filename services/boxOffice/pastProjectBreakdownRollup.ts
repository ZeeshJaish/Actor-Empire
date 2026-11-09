import type { StreamingDistributionBreakdown, StreamingRegionBreakdown, TheatricalChainReceipt, TheatricalDistributionBreakdown, TheatricalRegionReceipt } from '../../types';

/* Lag round (2026-11-09), "roll up, do not drop": a finished film keeps one entry per week with
   that week's own numbers (gross, receipts, screens, shares, views, revenue). The per-region and
   per-chain detail of every week except the last is summed into the first entry; the last week
   keeps its full detail. The Box Office app sums regions and chains over all entries, reads the
   weekly rows by index and the final week's shares from the last entry, so every number it shows
   stays the same. It saves about 2 MB on a long career, and the save checks walk less. */

const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export const rollUpTheatricalBreakdowns = (weeks: TheatricalDistributionBreakdown[]): TheatricalDistributionBreakdown[] => {
    if (!Array.isArray(weeks) || weeks.length <= 2 || weeks[0]?.rolledUpWeeks) return weeks;
    const summed = weeks.slice(0, -1);
    type Region = TheatricalRegionReceipt & { chains: Map<string, TheatricalChainReceipt> };
    const regions = new Map<string, Region>();
    // What the app's chain totals end on: the first entry's cut, then the last week a chain sold tickets.
    const firstCut = new Map<string, number>(), lastActiveCut = new Map<string, number>();
    for (const week of summed) {
        for (const region of Array.isArray(week?.regionReceipts) ? week.regionReceipts : []) {
            let total = regions.get(region.regionId);
            if (!total) {
                total = { ...region, gross: 0, studioReceipts: 0, exhibitorReceipts: 0, expectedFootfall: 0, screens: finite(region.screens), chainReceipts: [], chains: new Map() };
                regions.set(region.regionId, total);
            }
            total.gross += finite(region.gross);
            total.studioReceipts += finite(region.studioReceipts);
            total.exhibitorReceipts += finite(region.exhibitorReceipts);
            total.expectedFootfall += finite(region.expectedFootfall);
            total.screens = Math.max(total.screens, finite(region.screens));
            total.averageExhibitorCut = region.averageExhibitorCut;
            total.holdModifier = region.holdModifier;
            for (const chain of Array.isArray(region.chainReceipts) ? region.chainReceipts : []) {
                if (!firstCut.has(chain.chainId)) firstCut.set(chain.chainId, chain.exhibitorCut);
                if (chain.gross > 0) lastActiveCut.set(chain.chainId, chain.exhibitorReceipts / Math.max(1, chain.gross));
                let row = total.chains.get(chain.chainId);
                if (!row) {
                    row = { ...chain, gross: 0, studioReceipts: 0, exhibitorReceipts: 0, expectedFootfall: 0, screens: finite(chain.screens) };
                    total.chains.set(chain.chainId, row);
                    total.chainReceipts.push(row);
                }
                row.gross += finite(chain.gross);
                row.studioReceipts += finite(chain.studioReceipts);
                row.exhibitorReceipts += finite(chain.exhibitorReceipts);
                row.expectedFootfall += finite(chain.expectedFootfall);
                row.screens = Math.max(row.screens, finite(chain.screens));
            }
        }
    }
    const regionReceipts: TheatricalRegionReceipt[] = [...regions.values()].map(({ chains: _chains, ...region }) => ({
        ...region,
        chainReceipts: region.chainReceipts.map(chain => ({
            ...chain,
            exhibitorCut: firstCut.get(chain.chainId) ?? chain.exhibitorCut,
            ...(lastActiveCut.has(chain.chainId) ? { lastActiveExhibitorCut: lastActiveCut.get(chain.chainId) } : {}),
        })),
    }));
    return weeks.map((week, index) => index === weeks.length - 1 ? week
        : index === 0 ? { ...week, regionReceipts, rolledUpWeeks: summed.length }
        : { ...week, regionReceipts: [] });
};

export const rollUpStreamingBreakdowns = (weeks: StreamingDistributionBreakdown[]): StreamingDistributionBreakdown[] => {
    if (!Array.isArray(weeks) || weeks.length <= 2 || weeks[0]?.rolledUpWeeks) return weeks;
    const summed = weeks.slice(0, -1);
    const regions = new Map<string, StreamingRegionBreakdown>();
    for (const week of summed) {
        for (const region of Array.isArray(week?.regionBreakdowns) ? week.regionBreakdowns : []) {
            const total = regions.get(region.regionId) || { ...region, views: 0, revenue: 0 };
            total.views += finite(region.views);
            total.revenue += finite(region.revenue);
            total.audienceShare = region.audienceShare;
            total.retentionModifier = region.retentionModifier;
            regions.set(region.regionId, total);
        }
    }
    const regionBreakdowns = [...regions.values()];
    return weeks.map((week, index) => index === weeks.length - 1 ? week
        : index === 0 ? { ...week, regionBreakdowns, rolledUpWeeks: summed.length }
        : { ...week, regionBreakdowns: [] });
};
