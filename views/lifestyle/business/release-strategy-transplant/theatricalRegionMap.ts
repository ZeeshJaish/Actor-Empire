import type { BoxOfficeRegionId } from '../../../../types';
import type { RegionMapView } from '../components/regionMapView';
import type { TheatricalRegionModel } from './TheatricalDeskStep';

export interface TheatricalRegionMapModel {
    selectedRegionIds: BoxOfficeRegionId[];
    interaction: 'drilldown';
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
    interaction: 'drilldown',
    maximumViewLevel: 'region',
    drilldownRegionSelection: 'toggle',
    showCountryLabels: false,
    view,
});
