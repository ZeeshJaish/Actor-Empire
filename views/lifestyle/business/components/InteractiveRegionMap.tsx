import React, { Suspense, lazy } from 'react';
import { InteractiveRegionMapLegacy } from './InteractiveRegionMapLegacy';
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

const DetailedInteractiveRegionMap = lazy(async () => {
    const module = await import('./InteractiveRegionMapV2');
    return { default: module.InteractiveRegionMapV2 };
});

/**
 * Stable shared-map boundary. The compact 110m renderer paints immediately;
 * the detailed 50m presentation replaces it once its map-only chunk is ready.
 */
export const InteractiveRegionMap: React.FC<InteractiveRegionMapProps> = props => (
    <Suspense fallback={<InteractiveRegionMapLegacy {...props} />}>
        <DetailedInteractiveRegionMap {...props} />
    </Suspense>
);
