/**
 * A campaign creative in the game's media store (#148; plan §20.10 point 5: "images go into the game's media store
 * (`mediaStorage`, a new `campaign_creative` kind, the same store posters and Instagram images use), so they travel
 * with save transfers").
 *  - a picked file is read into an image (12 MB at most, as posters allow);
 *  - the crop is drawn at the frame's kept size (`creativeOutputSize`) and encoded as JPEG, which every browser the
 *    game runs in can write;
 *  - its media id is made at once, so the campaign can hold it while the store writes in the background; the store
 *    keeps the newest creatives within a cap, oldest out first;
 *  - a kept creative is read back as an image for the scenes and thumbnails (a campaign whose image is gone shows the
 *    made-for-you one instead).
 */
import { useEffect, useState } from 'react';
import { loadMediaBlob, pruneMediaStore, saveMediaBlob } from '../../../services/mediaStorage';
import { creativeOutputSize, cropSource, type CreativeCrop } from './creativeFrames';

export const MAX_CREATIVE_SOURCE_BYTES = 12 * 1024 * 1024;
const JPEG_QUALITY = 0.86;
const KEEP = { maxItems: 240, maxBytes: 96 * 1024 * 1024 };

/** The picked file as an image, or why not. Its `src` is an object URL the cropper shows; the caller revokes it. */
export const readCreativeFile = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) { reject(new Error('Pick an image file.')); return; }
  if (file.size > MAX_CREATIVE_SOURCE_BYTES) { reject(new Error('That image is over 12 MB. Pick a smaller one.')); return; }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
  image.src = url;
});

/** The crop drawn at the frame's kept size. */
export const renderCrop = (image: HTMLImageElement, ratio: number, crop: CreativeCrop): HTMLCanvasElement => {
  const source = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  const { sx, sy, sw, sh } = cropSource(source, ratio, crop);
  const size = creativeOutputSize(ratio, { width: sw, height: sh });
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size.width, size.height);
  return canvas;
};

/** A new media id for a creative or a campaign's picture. */
export const newCreativeId = () => `campaign_creative_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/** Keeps a creative: returns its media id now; the store writes in the background. */
export const keepCreative = (canvas: HTMLCanvasElement): string => keepCreativeAs(newCreativeId(), canvas);

/** Keeps a picture under a media id made earlier (#149: a campaign's picture, its id already on the campaign). */
export const keepCreativeAs = (id: string, canvas: HTMLCanvasElement): string => {
  canvas.toBlob(blob => {
    if (!blob) return;
    saveMediaBlob(id, blob, { kind: 'campaign_creative', width: canvas.width, height: canvas.height })
      .then(() => pruneMediaStore('campaign_creative', KEEP))
      .catch(() => { /* the campaign falls back to its made-for-you creative */ });
  }, 'image/jpeg', JPEG_QUALITY);
  return id;
};

/** A kept creative, read back as an image (null while it loads, or if it is gone). */
export const useKeptCreative = (mediaId: string | null | undefined): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    setImage(null);
    if (!mediaId) return undefined;
    let alive = true;
    let url: string | null = null;
    loadMediaBlob(mediaId).then(blob => {
      if (!blob || !alive) return;
      url = URL.createObjectURL(blob);
      const next = new Image();
      next.onload = () => { if (alive) setImage(next); };
      next.src = url;
    }).catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId]);
  return image;
};
