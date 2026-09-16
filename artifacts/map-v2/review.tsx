import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { BoxOfficeRegionId, CinemaChainId } from '../../types';
import {
  BOX_OFFICE_REGIONS,
  getBoxOfficeRegionLabel,
  getBoxOfficeRegionShortLabel,
  getCinemaChainsForRegion,
  getCinemaChainTerms,
} from '../../services/cinemaChains';
import { PRODUCTION_LOCATIONS_BY_CONTINENT } from '../../services/productionLocations';
import type { BuildData, BuildDraft } from '../../components/studio-finance/finance/build';
import { WorldMap as StudioFinanceWorldMap } from '../../components/studio-finance/components/build/WorldMap';
import { StreamingBuildNetworkMap } from '../../components/streaming-transplant/StreamingBuildNetworkMap';
import { cityById } from '../../components/streaming-transplant/StreamingBrandVisuals';
import type { NetworkMapNode } from '../../components/streaming-transplant/streamingNetworkMap';
import { InteractiveRegionMapLegacy } from '../../views/lifestyle/business/components/InteractiveRegionMapLegacy';
import { InteractiveRegionMap } from '../../views/lifestyle/business/components/InteractiveRegionMap';
import { GreenlightLocationStep } from '../../views/lifestyle/business/components/GreenlightLocationStep';
import { TheatricalDeskStep } from '../../views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep';

const formatMoney = (value: number) => `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;

const GreenlightReview = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return <GreenlightLocationStep
    selectedIds={selectedIds}
    onChange={setSelectedIds}
    locations={PRODUCTION_LOCATIONS_BY_CONTINENT}
    onBack={() => undefined}
    onNext={() => undefined}
    formatMoney={formatMoney}
  />;
};

const ReleaseReview = () => {
  const [selectedRegionIds, setSelectedRegionIds] = useState<BoxOfficeRegionId[]>([]);
  const [selectedChains, setSelectedChains] = useState<Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>>({});
  const regions = useMemo(() => BOX_OFFICE_REGIONS.map(region => ({
    id: region.id,
    label: getBoxOfficeRegionLabel('en', region.id),
    shortLabel: getBoxOfficeRegionShortLabel('en', region.id),
    selected: selectedRegionIds.includes(region.id),
    marketWeight: region.marketWeight,
    chains: getCinemaChainsForRegion(region.id, 'en').map(chain => {
      const terms = getCinemaChainTerms(chain.id, region.id, 'en')!;
      return {
        id: chain.id,
        name: chain.name,
        color: chain.brandColor,
        selected: (selectedChains[region.id] || []).includes(chain.id),
        screens: terms.screens,
        exhibitorCut: terms.exhibitorCut,
        bookingCost: terms.bookingCost,
      };
    }),
  })), [selectedChains, selectedRegionIds]);
  const liveChains = regions.flatMap(region => region.selected ? region.chains.filter(chain => chain.selected) : []);
  const totalScreens = liveChains.reduce((sum, chain) => sum + chain.screens, 0);
  const bookingCost = liveChains.reduce((sum, chain) => sum + chain.bookingCost, 0);
  const studioShare = liveChains.length
    ? 1 - liveChains.reduce((sum, chain) => sum + chain.exhibitorCut, 0) / liveChains.length
    : 0.55;

  const toggleRegion = (regionId: string) => setSelectedRegionIds(current => {
    const id = regionId as BoxOfficeRegionId;
    return current.includes(id) ? current.filter(value => value !== id) : [...current, id];
  });
  const toggleChain = (regionId: string, chainId: string) => setSelectedChains(current => {
    const region = regionId as BoxOfficeRegionId;
    const chain = chainId as CinemaChainId;
    const active = current[region] || [];
    return {
      ...current,
      [region]: active.includes(chain) ? active.filter(value => value !== chain) : [...active, chain],
    };
  });
  const autoBuild = () => {
    const regionsToSelect: BoxOfficeRegionId[] = ['NORTH_AMERICA', 'EUROPE'];
    setSelectedRegionIds(regionsToSelect);
    setSelectedChains(Object.fromEntries(regionsToSelect.map(regionId => [
      regionId,
      getCinemaChainsForRegion(regionId, 'en').slice(0, 2).map(chain => chain.id),
    ])));
  };

  return <div className="release-review" style={{ '--h': 26 } as React.CSSProperties}>
    <TheatricalDeskStep
      regions={regions}
      selectedRegionCount={selectedRegionIds.length}
      totalScreens={totalScreens}
      bookingCost={bookingCost}
      studioShare={studioShare}
      expectedFootfall={Math.round(totalScreens * 820)}
      openingRange={[bookingCost * 2.2, bookingCost * 3.8]}
      onToggleRegion={toggleRegion}
      onToggleChain={toggleChain}
      onAutoBuild={autoBuild}
      onContinue={() => undefined}
      onBack={() => undefined}
    />
  </div>;
};

const map4Data = {
  company: { name: 'Actor Empire Studios', week: 12, brandHex: '#a78bfa' },
  regions: [
    { id: 'NORTH_AMERICA', name: 'North America', line: 'Opening network' },
    { id: 'EUROPE', name: 'Europe', line: 'Expansion network' },
    { id: 'ASIA', name: 'Asia', line: 'Growth network' },
  ],
  countries: [
    { id: 'country:US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'US', opening: true, note: '' },
    { id: 'country:CA', regionId: 'NORTH_AMERICA', name: 'Canada', code: 'CA', shape: 'CA', note: '' },
    { id: 'country:GB', regionId: 'EUROPE', name: 'United Kingdom', code: 'GB', shape: 'GB', opening: true, note: '' },
    { id: 'country:IN', regionId: 'ASIA', name: 'India', code: 'IN', shape: 'IN', opening: true, note: '' },
  ],
  cities: [
    { id: 'LA', name: 'Los Angeles', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 34.0522, lng: -118.2437 }, plot: { x: 15, y: 35 }, note: '' },
    { id: 'TOR', name: 'Toronto', countryId: 'country:CA', country: 'Canada', code: 'CA', coord: { lat: 43.6532, lng: -79.3832 }, plot: { x: 20, y: 30 }, note: '' },
    { id: 'LDN', name: 'London', countryId: 'country:GB', country: 'United Kingdom', code: 'GB', coord: { lat: 51.5072, lng: -0.1276 }, plot: { x: 48, y: 28 }, recommended: true, note: '' },
    { id: 'BOM', name: 'Mumbai', countryId: 'country:IN', country: 'India', code: 'IN', coord: { lat: 19.076, lng: 72.8777 }, plot: { x: 72, y: 48 }, recommended: true, note: '' },
  ],
} as BuildData;

const map4Draft = {
  facilities: [
    { id: 'facility-la', cityId: 'LA', built: true },
    { id: 'facility-tor', cityId: 'TOR', built: false },
  ],
} as BuildDraft;

const StudioFinanceReview = () => {
  const [regionId, setRegionId] = useState<string>();
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const city = map4Data.cities.find(candidate => candidate.id === cityId);
  return <section className="map-product-review map4-review" aria-label="MAP4 Studio Finance review">
    <div className="review-status-grid">
      <span><small>Built</small><b>Los Angeles</b></span>
      <span><small>Planned</small><b>Toronto</b></span>
      <span><small>Recommended</small><b>London · Mumbai</b></span>
    </div>
    <StudioFinanceWorldMap
      data={map4Data}
      draft={map4Draft}
      services={[]}
      selectedRegionId={regionId}
      selectedCountryId={countryId}
      selectedCityId={cityId}
      onSelectRegion={id => {
        setRegionId(id);
        setCountryId(undefined);
        setCityId(undefined);
      }}
      onSelectCountry={id => {
        const country = map4Data.countries.find(candidate => candidate.id === id);
        setRegionId(country?.regionId);
        setCountryId(id);
        setCityId(undefined);
      }}
      onSelectCity={id => {
        const picked = map4Data.cities.find(candidate => candidate.id === id);
        const country = map4Data.countries.find(candidate => candidate.id === picked?.countryId);
        setRegionId(country?.regionId);
        setCountryId(country?.id);
        setCityId(id);
      }}
      showNetworkRoutes
    />
    <div className="review-selection" data-map4-selected={cityId ?? ''}>
      <small>Map → finance selection</small>
      <b>{city ? `Selected city: ${city.id} · ${city.name}` : 'Select a facility city'}</b>
      <span>World reset changes the camera only; facilities and their build state stay intact.</span>
    </div>
  </section>;
};

const map5Nodes: NetworkMapNode[] = [
  { facilityId: 'facility-la', city: cityById('LA')!, racks: 16, role: 'CORE_ORIGIN', load: 0.82, built: true },
  { facilityId: 'facility-ldn', city: cityById('LDN')!, racks: 8, role: 'REGIONAL_HUB', load: 0.64, built: true },
  { facilityId: 'facility-bom', city: cityById('BOM')!, racks: 3, role: 'EDGE_CACHE', load: 0.95, built: false },
];
const map7Nodes: NetworkMapNode[] = [
  ...map5Nodes,
  { facilityId: 'facility-tor', city: cityById('TOR')!, racks: 5, role: 'EDGE_CACHE', load: 0.48, built: true },
  { facilityId: 'facility-nyc', city: cityById('NYC')!, racks: 6, role: 'REGIONAL_HUB', load: 0.58, built: true },
];

const StreamingNetworkReview = () => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  return <section className="map-product-review map5-review" aria-label="MAP5 Streaming Buildout review">
    <StreamingBuildNetworkMap
      nodes={map5Nodes}
      coverage={['NORTH_AMERICA', 'EUROPE', 'ASIA']}
      unserved={['AFRICA']}
      selectedFacilityId={selectedFacilityId}
      onSelect={setSelectedFacilityId}
      live
      embedded
    />
    <div className="review-selection" data-map5-selected={selectedFacilityId ?? ''}>
      <small>Map → network selection</small>
      <b>{selectedFacilityId ? `Selected facility: ${selectedFacilityId}` : 'Select a network facility'}</b>
      <span>Node size is rack count, the outer ring is load, hollow is planned, and red geography is unserved.</span>
    </div>
  </section>;
};

const CinematicReview = () => {
  const [replayKey, setReplayKey] = useState(0);
  return <section className="map-product-review map6-review" aria-label="MAP6 read-only cinematic review">
    <div className="review-cinematic-head">
      <div>
        <small>Commission Cut + Team Planning</small>
        <b>Committed rooms reveal in sequence</b>
      </div>
      <button type="button" onClick={() => setReplayKey(key => key + 1)}>Replay network</button>
    </div>
    <StudioFinanceWorldMap
      data={map4Data}
      draft={map4Draft}
      services={[]}
      showNetworkRoutes
      cinematic
      cinematicDurationMs={3_600}
      cinematicReplayKey={replayKey}
    />
    <div className="review-selection" data-map6-replay={replayKey}>
      <small>Read-only presentation</small>
      <b>Los Angeles → Toronto → complete network</b>
      <span>The map camera moves, but no city selection, draft edit, charge, save, or completion callback is available here.</span>
    </div>
  </section>;
};

const ClosureReview = () => (
  <section className="map7-review" aria-label="MAP7 shared map closure review">
    <div className="review-certification" role="status">
      <span><small>Shared engine</small><b>Release · Finance · Network</b></span>
      <span><small>Dense labels</small><b>Priority + collision pruning</b></span>
      <span><small>Runtime</small><b>Lazy 50m atlas · cached geometry</b></span>
    </div>
    <div className="map7-grid">
      <article>
        <h2>Theatrical release</h2>
        <InteractiveRegionMap
          selectedRegionIds={['NORTH_AMERICA', 'EUROPE']}
          marketRegionIds={['ASIA']}
          interaction="drilldown"
          frameHeight={560}
          showCountryLabels={false}
          showPreview={false}
          ariaLabel="MAP7 theatrical release map"
        />
      </article>
      <article>
        <h2>Studio Finance</h2>
        <StudioFinanceWorldMap
          data={map4Data}
          draft={map4Draft}
          services={[]}
          selectedRegionId="NORTH_AMERICA"
          showNetworkRoutes
        />
      </article>
      <article>
        <h2>Streaming Buildout</h2>
        <StreamingBuildNetworkMap
          nodes={map7Nodes}
          coverage={['NORTH_AMERICA', 'EUROPE', 'ASIA']}
          unserved={['AFRICA']}
          live
          embedded
        />
      </article>
    </div>
  </section>
);

const MapReview = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedVersion = params.get('map');
  const version = ['0', '1', '2', '3', '4', '5', '6', '7'].includes(requestedVersion ?? '') ? requestedVersion! : '1';
  const [selectedRegionIds, setSelectedRegionIds] = useState<BoxOfficeRegionId[]>(['NORTH_AMERICA', 'EUROPE', 'ASIA']);
  const toggleRegion = (regionId: BoxOfficeRegionId) => setSelectedRegionIds(current => (
    current.includes(regionId) ? current.filter(id => id !== regionId) : [...current, regionId]
  ));

  return <main className="review-shell">
    <p className="review-kicker">Actor Empire · owner review</p>
    <h1 className="review-title">MAP{version}</h1>
    <p className="review-copy">
      {version === '0'
        ? 'Production baseline — the existing shared map and its current tap behavior.'
        : version === '1'
          ? 'Shared visual engine — detailed coastlines and country borders. Tap a region to fly in, then tap a country.'
          : version === '2'
            ? 'Greenlight location scouting — World → Region → Country → production city, using the real game catalogue.'
            : version === '3'
              ? 'Theatrical distribution — tap a region to select it and focus the map; cinema partners and economics stay unchanged.'
              : version === '4'
                ? 'Studio Finance — scout facilities on the detailed map with recommended, planned, built, and active states.'
                : version === '5'
                  ? 'Streaming Buildout — detailed infrastructure geography with rack size, load rings, roles, routes, and unserved regions.'
                  : version === '6'
                    ? 'Commission Cut + Team Planning — a deterministic, read-only reveal of the exact committed infrastructure.'
                    : 'Closure review — release, finance, and streaming maps mounted together with dense-label and runtime safeguards.'}
    </p>
    <nav className="review-tabs" aria-label="Map version">
      <a href="?map=0" data-active={version === '0'}>MAP0 baseline</a>
      <a href="?map=1" data-active={version === '1'}>MAP1 engine</a>
      <a href="?map=2" data-active={version === '2'}>MAP2 Greenlight</a>
      <a href="?map=3" data-active={version === '3'}>MAP3 Release</a>
      <a href="?map=4" data-active={version === '4'}>MAP4 Finance</a>
      <a href="?map=5" data-active={version === '5'}>MAP5 Network</a>
      <a href="?map=6" data-active={version === '6'}>MAP6 Cinematic</a>
      <a href="?map=7" data-active={version === '7'}>MAP7 Closure</a>
    </nav>
    {version === '7' ? <ClosureReview /> : version === '6' ? <CinematicReview /> : version === '4' ? <StudioFinanceReview /> : version === '5' ? <StreamingNetworkReview /> : version === '2' ? <GreenlightReview /> : version === '3' ? <ReleaseReview /> : version === '0' ? (
      <InteractiveRegionMapLegacy
        selectedRegionIds={selectedRegionIds}
        onSelectRegion={toggleRegion}
        showPreview={false}
        ariaLabel="MAP0 shared map baseline"
      />
    ) : (
      <InteractiveRegionMap
        selectedRegionIds={selectedRegionIds}
        onSelectRegion={toggleRegion}
        interaction="drilldown"
        frameHeight={640}
        showPreview={false}
        ariaLabel="MAP1 detailed interactive shared map"
      />
    )}
  </main>;
};

const root = document.getElementById('root');
if (!root) throw new Error('Map review root is missing.');
ReactDOM.createRoot(root).render(<MapReview />);
