/**
 * A small picture for each campaign format (#146; moved here in #149 so the Studio and a campaign's page share it).
 * The photo-real scenes of #144/#147 are the big pictures; these are the chips and tiles.
 */
import React from 'react';
import type { CampaignFormatId } from '../../../types';

const FORMAT_ICON: Record<CampaignFormatId, React.ReactNode> = {
    SOCIAL_FEED: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M9.5 8h5M9.5 11h5M9.5 14h3" /></>,
    SHORT_VIDEO: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="m11 9.5 3 2-3 2z" /></>,
    SEARCH: <><circle cx="10.5" cy="10.5" r="5" /><path d="m14.5 14.5 5 5" /></>,
    CREATORS: <><circle cx="12" cy="8.5" r="3" /><path d="M6.5 19a5.5 5.5 0 0 1 11 0" /><path d="M18 5.5l1.5-1.5M19.5 9H21" /></>,
    CTV: <><rect x="3" y="5" width="18" height="11" rx="1.5" /><path d="M9 20h6" /></>,
    TV_SPOTS: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m8 3 4 3 4-3" /></>,
    BILLBOARD: <><rect x="3" y="4" width="18" height="9" rx="1" /><path d="M8 13v7M16 13v7M6 20h12" /></>,
    METRO_WRAP: <><rect x="3" y="6" width="18" height="10" rx="3" /><path d="M3 11h18M7 19l1.5-3M17 19l-1.5-3" /></>,
    POSTER_WALL: <><rect x="3" y="4" width="5" height="7" /><rect x="9.5" y="4" width="5" height="7" /><rect x="16" y="4" width="5" height="7" /><path d="M3 15h18M3 19h18" /></>,
    FLYERS: <><path d="M6 4h9l3 3v13H6z" /><path d="M9 10h6M9 13h6M9 16h4" /></>,
    AIRPORT_SCREENS: <><path d="M3 15 12 4l2 2-4 6 8 1 2 2-10 1-3 3-1-2 2-2z" /></>,
    MALL_SCREENS: <><rect x="8" y="3" width="8" height="14" rx="1" /><path d="M5 21h14M12 17v4" /></>,
    CITY_SCREEN: <><path d="M4 21V9l4-3v15M10 21V4h6v17M18 21V11l2-1v11" /><rect x="11" y="6" width="4" height="4" /></>,
    BUILDING_REVEAL: <><path d="M7 21V3h10v18" /><path d="M7 8h10M7 13h10" /><path d="M12 3v18" /></>,
    LANDMARK_LIGHT_SHOW: <><path d="M12 2 13 9l2 1-1 4 2 7H8l2-7-1-4 2-1z" /><path d="M4 6l2 1M20 6l-2 1M3 12h2M19 12h2" /></>,
    DRONE_SHOW: <><circle cx="6" cy="7" r="1.2" /><circle cx="12" cy="5" r="1.2" /><circle cx="18" cy="7" r="1.2" /><circle cx="8" cy="12" r="1.2" /><circle cx="16" cy="12" r="1.2" /><circle cx="12" cy="17" r="1.2" /><path d="M3 21h18" /></>,
    FAN_FESTIVAL: <><path d="M3 20h18M5 20v-6l7-6 7 6v6" /><circle cx="9" cy="17" r="1" /><circle cx="12" cy="17" r="1" /><circle cx="15" cy="17" r="1" /></>,
    LIVE_SHOW: <><path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-5 1-7z" /></>,
};

export const FormatGlyph: React.FC<{ id: CampaignFormatId }> = ({ id }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{FORMAT_ICON[id]}</svg>
);
