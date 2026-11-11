import type { BoxOfficeRegionId } from '../../../../types';
import type { RegionMapView } from '../components/regionMapView';
import type { TheatricalRegionModel } from './TheatricalDeskStep';

export interface TheatricalRegionMapModel {
    selectedRegionIds: BoxOfficeRegionId[];
    /* 2026-11-11 (player report "when releasing to cinema can't click the countries"): a tap used to select the
       region and zoom into it for 1.1 s, while every other region and every country drawn there ignored taps
       and the zoomed map held the page's scroll. A tap now selects or clears the region in place. */
    interaction: 'toggle';
    maximumViewLevel: 'region';
    drilldownRegionSelection: 'toggle';
    showCountryLabels: false;
    view: RegionMapView;
}

export const createTheatricalRegionMapModel = (
    regions: readonly TheatricalRegionModel[],
    view: RegionMapView,
): TheatricalRegionMapModel => ({
    selectedRegionIds: regions
        .filter(region => region.selected)
        .map(region => region.id as BoxOfficeRegionId),
    interaction: 'toggle',
    maximumViewLevel: 'region',
    drilldownRegionSelection: 'toggle',
    showCountryLabels: false,
    view,
});
