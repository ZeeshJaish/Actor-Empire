import React from 'react';
import { InteractiveRegionMapV2 } from './InteractiveRegionMapV2';
import type { InteractiveRegionMapProps } from './regionMapView';

export type {
    InteractiveRegionMapProps,
    RegionMapLevel,
    RegionMapView,
} from './regionMapView';
export type {
    RegionMapLocationPin,
    RegionMapLocationRoute,
} from '../../../../services/regionMap';
export {
    WORLD_VIEW,
    countryView,
    parentView,
    regionView,
} from './regionMapView';

/** The detailed renderer is ready before play; no first-open map swap. */
export const InteractiveRegionMap: React.FC<InteractiveRegionMapProps> = props => (
    <InteractiveRegionMapV2 {...props} />
);
