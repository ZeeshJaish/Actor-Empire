import type { StreamingAuctionFutureFundingTerms } from '../types';
/** Parse only the explicit saved agreement. Missing data never invents a funded deal. */
export const normalizeAuctionFutureFunding = (value: unknown): StreamingAuctionFutureFundingTerms | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const v = value as Record<string, unknown>;
    if (!['NEW_ORIGINAL','SEQUEL','NEXT_SEASON'].includes(String(v.kind))
        || !['ANY','LIVE_ACTION','ANIMATED','ANIME'].includes(String(v.format))
        || !['FIRM','OPTION'].includes(String(v.commitment))
        || !Number.isInteger(v.count) || Number(v.count)<1 || Number(v.count)>3
        || !Number.isFinite(v.budgetPerProject) || Number(v.budgetPerProject)<100_000 || Number(v.budgetPerProject)>2_000_000_000
        || !Number.isInteger(v.platformRightsPercent) || Number(v.platformRightsPercent)<1 || Number(v.platformRightsPercent)>100
        || ![26,52].includes(Number(v.deadlineWeeks))) return undefined;
    return {kind:v.kind as StreamingAuctionFutureFundingTerms['kind'],count:Number(v.count),budgetPerProject:Number(v.budgetPerProject),
        format:v.format as StreamingAuctionFutureFundingTerms['format'],commitment:v.commitment as 'FIRM'|'OPTION',
        deadlineWeeks:Number(v.deadlineWeeks),platformRightsPercent:Number(v.platformRightsPercent)};
};
