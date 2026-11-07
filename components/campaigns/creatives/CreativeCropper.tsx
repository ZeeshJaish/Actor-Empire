/**
 * Crop a picked image into a format's frame (#148; plan §20.10 point 5: "pick an image, crop it in the format's frame,
 * and see it live in the scene"). The frame sits in the middle with the rest of the picture dimmed around it; drag to
 * move the picture, pinch or use the slider to zoom. The picture always covers the frame. "Use this crop" draws it at
 * the frame's kept size and hands it back; nothing is stored here. It opens over the whole screen (a portal: the
 * Studio's animated steps would otherwise hold a fixed layer inside their own box).
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import css from './Creatives.module.css';
import { CROP_MAX_ZOOM, CROP_START, clampCrop, cropSource, panCrop, type CreativeCrop, type CreativeFrame } from './creativeFrames';
import { renderCrop } from './creativeMedia';
import { CAMPAIGN_FORMATS } from '../../../services/campaigns/campaignFormats';

export const CreativeCropper: React.FC<{
  image: HTMLImageElement;
  frame: CreativeFrame;
  accent: string;
  onDone: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
}> = ({ image, frame, accent, onDone, onCancel }) => {
  const source = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  const [crop, setCrop] = useState<CreativeCrop>(() => clampCrop(source, frame.ratio, CROP_START));
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ width: 320, height: 360 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return undefined;
    /* a stage not laid out yet (or being taken down) measures 0: keep the last size */
    const measure = () => { if (element.clientWidth > 0 && element.clientHeight > 0) setRoom({ width: element.clientWidth, height: element.clientHeight }); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* the frame, as large as the room allows */
  const maxW = Math.min(480, room.width - 40);
  const maxH = room.height - 48;
  const boxW = Math.max(40, Math.min(maxW, maxH * frame.ratio));
  const boxH = boxW / frame.ratio;
  const left = (room.width - boxW) / 2;
  const top = (room.height - boxH) / 2;
  const { sx, sy, sw } = cropSource(source, frame.ratio, crop);
  const scale = boxW / sw;

  const update = (next: CreativeCrop) => setCrop(clampCrop(source, frame.ratio, next));
  const onDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: crop.zoom };
    }
  };
  const onMove = (event: React.PointerEvent) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      update({ ...crop, zoom: pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.distance)) });
      return;
    }
    setCrop(current => panCrop(source, frame.ratio, current, point.x - last.x, point.y - last.y, boxW));
  };
  const onUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return createPortal(
    <div className={css.cropper} role="dialog" aria-modal="true" aria-label={`Crop for ${frame.name}`} style={{ ['--cr-accent' as string]: accent }}>
      <header className={css.cropTop}>
        <button type="button" className={css.cropClose} onClick={onCancel} aria-label="Cancel">✕</button>
        <div>
          <b>Crop · {frame.name} {frame.key}</b>
          <span>{frame.formats.map(id => CAMPAIGN_FORMATS[id].name).join(' · ')}</span>
        </div>
      </header>
      <div className={css.cropStage} ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={event => update({ ...crop, zoom: crop.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08) })}>
        <img className={css.cropImage} src={image.src} alt="" draggable={false}
          style={{ width: source.width * scale, height: source.height * scale, transform: `translate(${left - sx * scale}px, ${top - sy * scale}px)` }} />
        <div className={css.cropBox} style={{ left, top, width: boxW, height: boxH }}>
          <i /><i /><i /><i />
        </div>
      </div>
      <div className={css.cropBar}>
        <div className={css.zoom}>
          <button type="button" onClick={() => update({ ...crop, zoom: crop.zoom / 1.2 })} aria-label="Zoom out">−</button>
          <input type="range" min={1} max={CROP_MAX_ZOOM} step={0.01} value={crop.zoom} aria-label="Zoom"
            onChange={event => update({ ...crop, zoom: Number(event.target.value) })} />
          <button type="button" onClick={() => update({ ...crop, zoom: crop.zoom * 1.2 })} aria-label="Zoom in">+</button>
        </div>
        <p>Drag to move it, pinch or slide to zoom. It is kept at {frame.ratio >= 1 ? `${Math.round(Math.min(1600, sw))} px wide` : `${Math.round(Math.min(1600, sw / frame.ratio))} px tall`}.</p>
        <button type="button" className={css.cropUse} onClick={() => onDone(renderCrop(image, frame.ratio, crop))}>
          <span><b>Use this crop</b><small>{frame.name} {frame.key}</small></span><i aria-hidden="true">✓</i>
        </button>
      </div>
    </div>,
    document.body,
  );
};
