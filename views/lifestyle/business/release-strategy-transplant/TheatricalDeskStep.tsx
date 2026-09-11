import React from 'react';
import type { BoxOfficeRegionId } from '../../../../types';
import { InteractiveRegionMap } from '../components/InteractiveRegionMap';
import css from './ReleaseStrategy.module.css';

export interface TheatricalChainModel {
  id: string;
  name: string;
  color: string;
  selected: boolean;
  screens: number;
  exhibitorCut: number;
  bookingCost: number;
}

export interface TheatricalRegionModel {
  id: string;
  label: string;
  shortLabel: string;
  selected: boolean;
  marketWeight: number;
  chains: TheatricalChainModel[];
}

export interface TheatricalDeskModel {
  regions: TheatricalRegionModel[];
  selectedRegionCount: number;
  totalScreens: number;
  bookingCost: number;
  studioShare: number;
  expectedFootfall: number;
  openingRange: [number, number];
}

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');
const money = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M` : `$${Math.round(value / 1_000)}k`;
const count = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value.toLocaleString();

export const TheatricalDeskStep: React.FC<TheatricalDeskModel & {
  onToggleRegion: (regionId: string) => void;
  onToggleChain: (regionId: string, chainId: string) => void;
  onAutoBuild: () => void;
  onContinue: () => void;
  onBack: () => void;
}> = ({ regions, selectedRegionCount, totalScreens, bookingCost, studioShare, expectedFootfall, openingRange, onToggleRegion, onToggleChain, onAutoBuild, onContinue, onBack }) => {
  const exhibitorShare = Math.max(0, 1 - studioShare);
  return <>
    <button type="button" className={css.auto} onClick={onAutoBuild}>AUTO-BUILD FOOTPRINT</button>
    <section className={css.map} aria-label="Distribution map">
      <span className={css.seclabel}>WHERE IT OPENS</span>
      <p className={css.secnote}>Tap the markets that get your opening weekend.</p>
      <div className={css.mapVisual}>
        <InteractiveRegionMap
          selectedRegionIds={regions.filter(region => region.selected).map(region => region.id as BoxOfficeRegionId)}
          onSelectRegion={regionId => onToggleRegion(regionId)}
          visualTone="release"
          compact
          showPreview={false}
          ariaLabel="Interactive theatrical release map"
        />
      </div>
      <div className={css.mapread}><b>{selectedRegionCount}</b><span>regions</span><em>{totalScreens.toLocaleString()} screens</em></div>
    </section>

    <section className={css.sec}>
      <span className={css.seclabel}>CINEMA PARTNERS</span>
      <p className={css.secnote}>Stack partners for reach. Each contract changes screens, booking cost, and the cut.</p>
      {regions.filter(region => region.selected).map(region => <div key={region.id} className={join(css.regblock, css.on)} style={{ '--dh': '30' } as React.CSSProperties}>
        <div className={css.reghead}><b>{region.label}</b><em>{region.chains.filter(chain => chain.selected).length} live</em><span className={css.regmarks}>{region.chains.filter(chain => chain.selected).map(chain => <i key={chain.id} style={{ '--pt': chain.color } as React.CSSProperties} />)}</span></div>
        <div className={css.chains}>
          {region.chains.map(chain => <button type="button" key={chain.id}
            className={join(css.chain, chain.selected && css.on)}
            style={{ '--pt': chain.color } as React.CSSProperties}
            onClick={() => onToggleChain(region.id, chain.id)} aria-pressed={chain.selected} aria-label={chain.name}>
            <i className={css.chaindot} /><span><b>{chain.name}</b><em>{chain.screens.toLocaleString()} screens · {Math.round(chain.exhibitorCut * 100)}% cut</em></span>
          </button>)}
        </div>
      </div>)}
      {selectedRegionCount === 0 && <p className={css.empty}>Select at least one region to open its partner desk.</p>}
    </section>

    <section className={css.split}>
      <div className={css.splitbar}>
        <span className={css.splitmine} style={{ width: `${studioShare * 100}%` }}><i>{Math.round(studioShare * 100)}¢</i></span>
        <span className={css.splittheirs} style={{ width: `${exhibitorShare * 100}%` }}><i>{Math.round(exhibitorShare * 100)}¢</i></span>
      </div>
      <div className={css.splitkey}><em className={css.keymine}>YOUR STUDIO</em><em className={css.keytheirs}>EXHIBITORS</em></div>
      <p><b>{totalScreens.toLocaleString()} screens</b> · {count(expectedFootfall)} expected visits · {money(bookingCost)} booking cost · opening read {money(openingRange[0])}–{money(openingRange[1])}</p>
    </section>
    <div className={css.foot}>
      <button type="button" className={css.backText} onClick={onBack}>BACK</button>
      <button type="button" className={join(css.next, totalScreens <= 0 && css.dead)} disabled={totalScreens <= 0} onClick={onContinue}>CONTINUE</button>
    </div>
  </>;
};
