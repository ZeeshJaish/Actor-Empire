import React, { useMemo, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { type BoxOfficeRegionId } from '../../../../types';
import { InteractiveRegionMap, type RegionMapLocationPin } from './InteractiveRegionMap';

const CONTINENTS = [
    { id: 'NA', name: 'North America', regionId: 'NORTH_AMERICA' as BoxOfficeRegionId },
    { id: 'SA', name: 'South America', regionId: 'SOUTH_AMERICA' as BoxOfficeRegionId },
    { id: 'EU', name: 'Europe', regionId: 'EUROPE' as BoxOfficeRegionId },
    { id: 'AS', name: 'Asia', regionId: 'ASIA' as BoxOfficeRegionId },
    { id: 'AF', name: 'Africa', regionId: 'AFRICA' as BoxOfficeRegionId },
    { id: 'OC', name: 'Oceania', regionId: 'OCEANIA' as BoxOfficeRegionId },
];

interface GreenlightLocationStepProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    locations: Record<string, any[]>;
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
    const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
    const continentToRegion = useMemo(
        () => Object.fromEntries(CONTINENTS.map(continent => [continent.id, continent.regionId])) as Record<string, BoxOfficeRegionId>,
        [],
    );
    const regionToContinent = useMemo(
        () => Object.fromEntries(CONTINENTS.map(continent => [continent.regionId, continent.id])) as Record<BoxOfficeRegionId, string>,
        [],
    );
    const locationPins = useMemo<RegionMapLocationPin[]>(() => (
        Object.entries(locations).flatMap(([continent, sites]) => (sites as any[]).map(site => ({
            id: site.id,
            name: site.name,
            x: site.x,
            y: site.y,
            longitude: site.longitude,
            latitude: site.latitude,
            selected: selectedIds.includes(site.id),
            regionId: continentToRegion[continent],
        })))
    ), [continentToRegion, locations, selectedIds]);
    const selectedRegionIds = useMemo<BoxOfficeRegionId[]>(() => {
        const regionIds = new Set<BoxOfficeRegionId>();
        if (selectedContinent && continentToRegion[selectedContinent]) {
            regionIds.add(continentToRegion[selectedContinent]);
        }
        Object.entries(locations).forEach(([continent, sites]) => {
            const regionId = continentToRegion[continent];
            if (regionId && (sites as any[]).some(site => selectedIds.includes(site.id))) regionIds.add(regionId);
        });
        return [...regionIds];
    }, [continentToRegion, locations, selectedContinent, selectedIds]);

    const toggleLocation = (id: string) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full max-w-4xl mx-auto px-4 pt-6 pb-56">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-2 shrink-0 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-2">Scout Location</h2>
                <p className="text-zinc-400 text-sm">Where will your story be told? Locations affect budget and visual quality.</p>
            </div>

            <div className="flex-1 min-h-[400px] relative space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                <div className="relative overflow-hidden rounded-3xl border border-sky-200/30 bg-sky-400/10 p-4 shadow-2xl shadow-sky-950/35">
                    <InteractiveRegionMap
                        selectedRegionIds={selectedRegionIds}
                        onSelectRegion={regionId => setSelectedContinent(regionToContinent[regionId])}
                        locationPins={locationPins}
                        onSelectLocation={(id, regionId) => {
                            if (regionId) setSelectedContinent(regionToContinent[regionId]);
                            toggleLocation(id);
                        }}
                        visualTone="production"
                        compact
                    />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black text-white flex items-center gap-2 shadow-xl">
                        <Globe size={14} className="text-sky-200" />
                        <span className="tracking-widest">GLOBAL PRODUCTION NETWORK</span>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="absolute bottom-4 right-4 bg-emerald-400 text-black px-4 py-2 rounded-xl text-[10px] font-black shadow-2xl animate-in fade-in slide-in-from-right-4">
                            SELECTED: {selectedIds.length} LOCATIONS
                        </div>
                    )}
                </div>

                {selectedContinent && (
                    <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-bottom-4 pb-28">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                            Sites in {CONTINENTS.find(continent => continent.id === selectedContinent)?.name}
                        </div>
                        {(locations[selectedContinent] || []).map(site => {
                            const isSelected = selectedIds.includes(site.id);
                            return (
                                <button
                                    key={site.id}
                                    onClick={() => toggleLocation(site.id)}
                                    className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                                        isSelected
                                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <div>
                                        <div className="text-sm font-bold uppercase flex items-center gap-2">
                                            {site.name}
                                            {isSelected && <Check size={14} className="text-emerald-500" />}
                                        </div>
                                        <div className="text-[10px] opacity-70 mt-0.5">{site.desc}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${site.cost > 1_000_000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            +{formatMoney(site.cost)}
                                        </div>
                                        <div className="text-[10px] font-mono text-amber-500">+{site.quality} Qual</div>
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
