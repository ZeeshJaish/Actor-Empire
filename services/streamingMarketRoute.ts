import type { BoxOfficeRegionId, OwnedStreamingFacility } from '../types';
import { getStreamingServerSite, hasDataResidencyRule } from './streamingServerSites';

/** One route eligibility rule for the career Build forecast and rehearsal. */
export const streamingEligibleMarketFacilities = (
  facilities: readonly OwnedStreamingFacility[],
  marketId: string,
  regionId: BoxOfficeRegionId,
  reachedShare: number,
): OwnedStreamingFacility[] => {
  if (!Number.isFinite(reachedShare) || reachedShare <= 0) return [];
  return facilities.filter(facility => {
    const site = getStreamingServerSite(facility.cityId);
    return site?.regionId === regionId
      && (!hasDataResidencyRule(marketId) || site.countryCode === marketId);
  });
};
