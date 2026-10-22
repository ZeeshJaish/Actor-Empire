import type { AudienceReception, TheatricalDistributionBreakdown, TheatricalRegionReceipt } from '../../types';
import { BOX_OFFICE_REGIONS, getCinemaChainById } from '../cinemaChains';
import { splitRealizedCinemaGross } from './boxOfficeSettlement';
import type { CinemaSettledTitle, CinemaSupplyQuote, CinemaWeekInput, CinemaWeekResult } from './boxOfficeTypes';
/** Adapters expose committed allocation facts; they perform no settlement or demand calculation. */
export const cinemaDistributionReport = (input: CinemaWeekInput, result: CinemaWeekResult, supply: CinemaSupplyQuote, titleId: string, runWeek: number): TheatricalDistributionBreakdown => {
    const row = result.titles.find(t => t.titleId === titleId)!;
    const allocation = result.allocations.filter(a => a.titleId === titleId);
    const exhibition = (result.exhibition || []).filter(e => e.titleId === titleId);
    const regions: TheatricalRegionReceipt[] = [];
    for (const region of BOX_OFFICE_REGIONS) {
        const countryIds = new Set(input.countries!.filter(c => c.regionId === region.id).map(c => c.id));
        const pools = supply.pools.filter(p => countryIds.has(p.countryId) && exhibition.some(e => e.poolId === p.id));
        if (!pools.length)
            continue;
        const chains = [...new Set(pools.map(p => p.chainId))].sort().map(chainId => {
            const chainPools = pools.filter(p => p.chainId === chainId), ids = new Set(chainPools.map(p => p.id));
            const paid = allocation.filter(a => ids.has(a.poolId));
            const splits = paid.map(a => { const p = chainPools.find(p => p.id === a.poolId)!; return splitRealizedCinemaGross({ grossCents: a.admissions * a.priceCents, exhibitorBasisPoints: p.exhibitorBasisPoints, distributionBasisPoints: p.distributionBasisPoints }); });
            const gross = splits.reduce((n, s) => n + s.grossCents, 0), exhibitor = splits.reduce((n, s) => n + s.exhibitorReceiptsCents, 0);
            return { chainId, chainName: getCinemaChainById(chainId)?.name || chainId, gross: gross / 100, studioReceipts: splits.reduce((n, s) => n + s.producerReceiptsCents, 0) / 100, exhibitorReceipts: exhibitor / 100,
                screens: exhibition.filter(e => ids.has(e.poolId)).reduce((n, e) => n + e.screens, 0), expectedFootfall: paid.reduce((n, a) => n + a.admissions, 0), exhibitorCut: gross ? exhibitor / gross : 0 };
        });
        const sum = (key: 'gross' | 'studioReceipts' | 'exhibitorReceipts' | 'screens' | 'expectedFootfall') => chains.reduce((n, c) => n + c[key], 0);
        regions.push({ regionId: region.id, regionLabel: region.label, regionShortLabel: region.shortLabel, gross: sum('gross'), studioReceipts: sum('studioReceipts'), exhibitorReceipts: sum('exhibitorReceipts'), screens: sum('screens'), expectedFootfall: sum('expectedFootfall'), averageExhibitorCut: sum('gross') ? sum('exhibitorReceipts') / sum('gross') : 0, holdModifier: 1, chainReceipts: chains });
    }
    return { week: runWeek, gross: row.grossCents / 100, studioReceipts: row.producerReceiptsCents / 100, exhibitorReceipts: row.exhibitorReceiptsCents / 100, distributionDeductions: row.distributionDeductionsCents / 100,
        totalScreens: row.screens || 0, expectedFootfall: row.firstAdmissions + row.repeatAdmissions, averageExhibitorCut: row.grossCents ? row.exhibitorReceiptsCents / row.grossCents : 0, studioShare: row.grossCents ? row.producerReceiptsCents / row.grossCents : 0,
        distributionModifier: 1, overscreeningPenalty: 1, underReleasePenalty: 1, regionReceipts: regions };
};
export const cinemaAudienceReport = (paid: CinemaSettledTitle, previous: AudienceReception | undefined, week: number, year: number): AudienceReception => {
    const samples = paid.satisfactionAdmissions || 0;
    const score = samples ? (paid.satisfactionScoreUnits || 0) / samples / 100 : previous?.currentScore || 0;
    const currentScore = Math.round(score * 10) / 10, old = previous?.currentScore ?? currentScore;
    return { openingScore: previous?.openingScore ?? currentScore, currentScore, previousScore: previous?.currentScore,
        trend: currentScore > old + .5 ? 'RISING' : currentScore < old - .5 ? 'FALLING' : 'STEADY', label: samples ? 'Paid audience response' : 'Awaiting paid audience',
        summary: `${paid.firstAdmissions.toLocaleString('en-US')} first visits and ${paid.repeatAdmissions.toLocaleString('en-US')} paid repeat visits${paid.basis === 'LEGACY_ACTIVE' ? ' since audience tracking began' : ''}.`,
        sampleSize: samples, updatedWeek: week, updatedYear: year, isFinal: paid.closed, quotes: [] };
};
