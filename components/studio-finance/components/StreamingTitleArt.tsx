import React from 'react';
import type { CustomPoster } from '../../../types';
import { CustomPosterImage } from '../../CustomPosterImage';
import { Poster as OneSheet } from '../../../content-market-exact/Poster';

const hueFor = (id: string): number => {
  let hash = 2166136261;
  for (const character of id) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
};

/** One title identity across catalogue, finance, and rights screens. Media in
    the player's production record takes precedence over the established
    deterministic one-sheet; no art or asset is added to game state. */
export function StreamingTitleArt({ id, title, genre = 'Drama', poster, size = 44, rank }: {
  id: string;
  title: string;
  genre?: string;
  poster?: CustomPoster | null;
  size?: number;
  rank?: number;
}) {
  const sheetSize = size < 38 ? 'xs' : size < 58 ? 'sm' : size < 100 ? 'md' : 'lg';
  return <span className="sf-poster sf-title-art" data-title-art={id} style={{ width: size, height: Math.round(size * 1.5) }} aria-hidden="true">
    <CustomPosterImage
      poster={poster}
      alt=""
      className="sf-title-art-image"
      fallback={<OneSheet id={id} title={title} genre={genre} hue={hueFor(id)} size={sheetSize} />}
    />
    {typeof rank === 'number' && <span className="sf-poster-rank">{rank}</span>}
  </span>;
}
