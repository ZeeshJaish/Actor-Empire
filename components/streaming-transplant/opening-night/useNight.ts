/**
 * #262: the night's formations, built in slices while Launch Control is up: a few milliseconds at a time, with frames between, so the poll stays smooth and the show has
 * nothing left to work out. The logo is read from the service's own mark, on the page.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { StreamingNetworkMapView } from '../../../services/streamingNetworkMapView';
import type { OpeningNightMoment } from '../../../services/streamingOpeningNight';
import { typeFace, type Brand } from '../StreamingBrandVisuals';
import type { Formation } from './nightEngine';
import {
  cityFormation, digitInk, logoFormation, logoInk, nightPalette, stadiumFormation, worldFormation,
  type NightCity, type NightPalette, type NightSize, type NightWorld,
} from './nightFormations';

export const WORLD_WAVE_SECONDS = 8.2;

export interface PreparedNight {
  size: NightSize;
  palette: NightPalette;
  stadium: Formation;
  /** the ink of each number of the count, 0 to 10 */
  digits: Float32Array[];
  logo: Formation;
  world: NightWorld | null;
  city: NightCity;
}

const breath = () => new Promise<void>(resolve => requestAnimationFrame(() => window.setTimeout(resolve, 0)));

const markImageOf = async (holder: HTMLElement | null, brand: Brand): Promise<HTMLImageElement | null> => {
  const load = async (src: string) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  };
  try {
    if (brand.customMark) return await load(brand.customMark);
    const svg = holder?.querySelector('svg');
    if (!svg) return null;
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', '320');
    copy.setAttribute('height', '320');
    copy.setAttribute('style', 'color:#fff');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
    try {
      return await load(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
};

export const useNight = (
  root: RefObject<HTMLElement>,
  markHolder: RefObject<HTMLElement>,
  brand: Brand,
  network: StreamingNetworkMapView | undefined,
  moments: OpeningNightMoment[] | undefined,
): { night: PreparedNight | null; whenReady: () => Promise<PreparedNight | null> } => {
  const [night, setNight] = useState<PreparedNight | null>(null);
  const done = useRef<Promise<PreparedNight | null> | null>(null);
  useEffect(() => {
    let alive = true;
    const build = async (): Promise<PreparedNight | null> => {
      try {
        await breath();
        const box = root.current;
        const size: NightSize = { W: box?.clientWidth || 390, H: box?.clientHeight || 844 };
        const tf = typeFace(brand);
        const name = brand.name || 'EMPIRE+';
        await Promise.all([
          document.fonts?.load?.('400 200px Anton').catch(() => undefined),
          document.fonts?.load?.(`${tf.weight} 64px ${tf.stack}`).catch(() => undefined),
        ]);
        if (!alive) return null;
        const palette = nightPalette(brand);
        const stadium = stadiumFormation(size, palette);
        await breath();
        const digits: Float32Array[] = [];
        for (let value = 0; value <= 10; value += 1) {
          digits.push(digitInk(size, value));
          await breath();
          if (!alive) return null;
        }
        const mark = await markImageOf(markHolder.current, brand);
        const ink = logoInk(size, name, tf, mark);
        await breath();
        const logo = logoFormation(stadium, ink, palette);
        await breath();
        const world = network && network.sites.length ? await worldFormation(size, palette, network, moments ?? [], WORLD_WAVE_SECONDS, breath) : null;
        await breath();
        const city = cityFormation(size, palette);
        const prepared: PreparedNight = { size, palette, stadium, digits, logo, world, city };
        if (alive) setNight(prepared);
        return prepared;
      } catch {
        return null;
      }
    };
    done.current = build();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { night, whenReady: () => done.current ?? Promise.resolve(null) };
};
