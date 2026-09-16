import type { RegionMapView } from './regionMapView';
import './interactiveRegionMap.css';

type MapNavigationToolbarTone = 'release' | 'production' | 'network';

export interface MapNavigationToolbarProps {
    scope: 'theatrical' | 'finance' | 'streaming';
    title: string;
    status: string;
    view: RegionMapView;
    onWorld: () => void;
    tone?: MapNavigationToolbarTone;
}

/** Compact movement and status controls shared by interactive map consumers. */
export function MapNavigationToolbar({
    scope,
    title,
    status,
    view,
    onWorld,
    tone = 'production',
}: MapNavigationToolbarProps) {
    return (
        <div
            className={`irm-map-toolbar irm-map-toolbar--${tone}`}
            data-map-navigation-toolbar={scope}
        >
            <span className="irm-map-toolbar__place">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                </svg>
                <strong>{title.toUpperCase()}</strong>
            </span>
            <span className="irm-map-toolbar__actions">
                <span className="irm-map-toolbar__status">{status.toUpperCase()}</span>
                {view.level !== 'world' && (
                    <button type="button" onClick={onWorld} aria-label="Show whole world">
                        World
                    </button>
                )}
            </span>
        </div>
    );
}
