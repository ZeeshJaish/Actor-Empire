import React, { useMemo, useState } from 'react';
import { Check, Globe, X } from 'lucide-react';
import type {
    ProductionLocation,
    ProductionLocationContinentId,
} from '../../../../services/productionLocations';
import { InteractiveRegionMap } from './InteractiveRegionMap';
import {
    createGreenlightLocationMapModel,
    toggleProductionLocationSelection,
} from './greenlightLocationMap';
import { WORLD_VIEW, regionView, type RegionMapView } from './regionMapView';

const CONTINENTS = [
    { id: 'NA', name: 'North America', regionId: 'NORTH_AMERICA' },
    { id: 'SA', name: 'South America', regionId: 'SOUTH_AMERICA' },
    { id: 'EU', name: 'Europe', regionId: 'EUROPE' },
    { id: 'AS', name: 'Asia', regionId: 'ASIA' },
    { id: 'AF', name: 'Africa', regionId: 'AFRICA' },
    { id: 'OC', name: 'Oceania', regionId: 'OCEANIA' },
] as const;

interface GreenlightLocationStepProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    locations: Record<ProductionLocationContinentId, ProductionLocation[]>;
    onBack: () => void;
    onNext: () => void;
    formatMoney: (value: number) => string;
}

export const GreenlightLocationStep: React.FC<GreenlightLocationStepProps> = ({
    selectedIds,
    onChange,
    locations,
    onBack,
    onNext,
    formatMoney,
}) => {
    const [mapView, setMapView] = useState<RegionMapView>(WORLD_VIEW);
    const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);
    const allLocations = useMemo(() => Object.values(locations).flat(), [locations]);
    const mapModel = useMemo(
        () => createGreenlightLocationMapModel(allLocations, selectedIds, mapView),
        [allLocations, mapView, selectedIds],
    );
    const selectedLocations = useMemo(
        () => allLocations.filter(location => selectedIds.includes(location.id)),
        [allLocations, selectedIds],
    );
    const activeRegionSelectedLocations = useMemo(
        () => mapView.regionId
            ? selectedLocations.filter(location => location.regionId === mapView.regionId)
            : [],
        [mapView.regionId, selectedLocations],
    );
    const selectedLocationChips = activeRegionSelectedLocations.slice(0, 2);
    const additionalSelectedLocationCount = Math.max(0, activeRegionSelectedLocations.length - selectedLocationChips.length);
    const activeRegionName = CONTINENTS.find(continent => continent.regionId === mapView.regionId)?.name;

    const setView = (nextView: RegionMapView) => {
        setMapView(nextView);
        if (nextView.level !== 'country') setFocusedLocationId(null);
    };

    const toggleLocation = (id: string, focusOnMap = false) => {
        const location = allLocations.find(candidate => candidate.id === id);
        if (focusOnMap && location) {
            const willSelect = !selectedIds.includes(id);
            setFocusedLocationId(willSelect ? id : null);
            setMapView(regionView(location.regionId));
        }
        onChange(toggleProductionLocationSelection(selectedIds, id));
    };

    const selectLocationFromMap = (id: string) => {
        const location = allLocations.find(candidate => candidate.id === id);
        if (mapView.level === 'world' && location && selectedIds.includes(id)) {
            setFocusedLocationId(id);
            setMapView(regionView(location.regionId));
            return;
        }
        toggleLocation(id, true);
    };

    const removeLocation = (id: string) => {
        const location = allLocations.find(candidate => candidate.id === id);
        if (focusedLocationId === id && location) setView(regionView(location.regionId));
        onChange(toggleProductionLocationSelection(selectedIds, id));
    };

    const clearLocations = () => {
        if (mapView.regionId) setView(regionView(mapView.regionId));
        else setFocusedLocationId(null);
        onChange([]);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full max-w-4xl mx-auto px-4 pt-6 pb-56">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-2 shrink-0 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-2">Scout Location</h2>
                <p className="text-zinc-400 text-sm">Where will your story be told? Locations affect budget and visual quality.</p>
            </div>

            <div className="flex-1 min-h-[400px] relative space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                <div className="relative overflow-hidden rounded-3xl border border-sky-200/30 bg-sky-400/10 p-4 shadow-2xl shadow-sky-950/35">
                    <div
                        data-greenlight-map-toolbar
                        data-greenlight-selected-locations
                        className="mb-3 rounded-2xl border border-sky-200/20 bg-sky-950/55 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-sky-50 shadow-lg shadow-sky-950/20"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                                <Globe size={14} className="shrink-0 text-cyan-300" />
                                <span className="truncate">{activeRegionName ?? 'Production world'}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                                <span className="rounded-full bg-emerald-300 px-2 py-1 text-[8px] tracking-[0.08em] text-emerald-950">
                                    {selectedIds.length} selected
                                </span>
                                {mapView.level !== 'world' && (
                                    <button
                                        type="button"
                                        aria-label="Change production region"
                                        onClick={() => setView(WORLD_VIEW)}
                                        className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2 py-1 text-[8px] tracking-[0.08em] text-cyan-100 transition-colors hover:bg-cyan-200/15"
                                    >
                                        Change
                                    </button>
                                )}
                                {selectedLocations.length > 0 && (
                                    <button
                                        type="button"
                                        aria-label="Clear all locations"
                                        onClick={clearLocations}
                                        className="rounded-full px-1 py-1 text-[8px] tracking-[0.08em] text-emerald-300 underline decoration-emerald-300/40 underline-offset-2"
                                    >
                                        Clear
                                    </button>
                                )}
                            </span>
                        </div>
                        {activeRegionSelectedLocations.length > 0 && (
                            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {selectedLocationChips.map(location => (
                                    <div key={location.id} className="flex shrink-0 items-center rounded-full border border-emerald-300/35 bg-emerald-300/10 text-emerald-50">
                                        <button
                                            type="button"
                                            aria-label={`Focus map on ${location.name}`}
                                            onClick={() => {
                                                setFocusedLocationId(location.id);
                                                setMapView(regionView(location.regionId));
                                            }}
                                            className="py-1 pl-2.5 pr-1 text-[8px] font-black uppercase tracking-[0.08em]"
                                        >
                                            {location.name}
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${location.name}`}
                                            onClick={() => removeLocation(location.id)}
                                            className="mr-1 grid size-5 place-items-center rounded-full text-emerald-200 hover:bg-emerald-300/15"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                                {additionalSelectedLocationCount > 0 && (
                                    <span
                                        data-greenlight-selected-more
                                        className="flex shrink-0 items-center rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-1 text-[8px] tracking-[0.08em] text-cyan-100"
                                    >
                                        +{additionalSelectedLocationCount} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <InteractiveRegionMap
                        selectedRegionIds={mapModel.selectedRegionIds}
                        onSelectRegion={regionId => setView(regionView(regionId))}
                        locationPins={mapModel.locationPins}
                        onSelectLocation={selectLocationFromMap}
                        visualTone="release"
                        accentColor="#34d399"
                        interaction={mapModel.interaction}
                        maximumViewLevel={mapModel.maximumViewLevel}
                        minimumPinViewLevel={mapModel.minimumPinViewLevel}
                        showSelectedPinsAcrossViews
                        focusedLocationId={focusedLocationId}
                        showCountryLabels={false}
                        highlightMappedCountries={false}
                        showCountryFocus={false}
                        view={mapView}
                        onViewChange={setView}
                        frameHeight={620}
                        className="irm-greenlight-location"
                        compact
                    />
                </div>

                {mapModel.visibleLocations.length === 0 ? (
                    <div data-greenlight-region-prompt className="rounded-2xl border border-dashed border-cyan-200/20 bg-cyan-950/15 px-5 py-6 text-center">
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Select a region on the map</div>
                        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Its available production cities will appear here.</p>
                    </div>
                ) : (
                    <div data-greenlight-location-catalogue className="space-y-2 animate-in slide-in-from-bottom-4 pb-28">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/80">
                            <span className="h-px flex-1 bg-cyan-200/15" />
                            Production cities in {activeRegionName}
                            <span className="h-px flex-1 bg-cyan-200/15" />
                        </div>
                        {mapModel.visibleLocations.map(site => {
                            const isSelected = selectedIds.includes(site.id);
                            return (
                                <button
                                    key={site.id}
                                    type="button"
                                    onClick={() => toggleLocation(site.id, true)}
                                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                                        isSelected
                                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-bold uppercase">
                                            {site.name}
                                            {isSelected && <Check size={14} className="text-emerald-500" />}
                                        </div>
                                        <div className="mt-0.5 text-[10px] opacity-70">{site.desc}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${site.cost > 1_000_000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            +{formatMoney(site.cost)}
                                        </div>
                                        <div className="font-mono text-[10px] text-amber-500">+{site.quality} Qual</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                    <button
                        onClick={onBack}
                        className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        disabled={selectedIds.length === 0}
                        className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 ${
                            selectedIds.length === 0
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                        }`}
                    >
                        Next: Movie Setup
                    </button>
                </div>
            </div>
        </div>
    );
};
