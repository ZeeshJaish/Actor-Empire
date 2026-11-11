/**
 * The builder's Creative step (#148): one card per frame the picked formats need, each showing the creative that will
 * run there, made for you from the title's poster (or the service's own colours) until you upload your own and crop
 * it into the frame. A frame with a photo-real scene (the billboard, the Burj Khalifa) can be seen live in it.
 * Formats with no image (search ads, a drone show) say what they show instead.
 * Also: `CreativeThumb`, a creative drawn small; `CreativeLive`, a creative in its scene with the launch moment.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import { createPortal } from 'react-dom';
import css from './Creatives.module.css';
import type { CampaignFormatId } from '../../../types';
import { CAMPAIGN_FORMATS } from '../../../services/campaigns/campaignFormats';
import { NO_IMAGE_LINE, creativeFramesOf, type CreativeFrame } from './creativeFrames';
import { keepCreative, readCreativeFile, useKeptCreative } from './creativeMedia';
import { CreativeCropper } from './CreativeCropper';
import { CampaignScene } from '../scenes/CampaignScene';
import { CAMPAIGN_SCENES, LANDMARK_SCENES, sceneForFormat, type CampaignSceneId } from '../scenes/sceneCatalogue';
import { makeDefaultCreative, type CreativeSubject } from '../scenes/defaultCreative';

export type Creative = HTMLCanvasElement | HTMLImageElement;
export interface KeptCreative {
  mediaId: string;
  /** null when it came from a past campaign (Run again): read back from the media store */
  canvas: HTMLCanvasElement | null;
}

/** the scene a format can be seen in where the campaign runs: a scene of one real place only there (#149); #156: every
    format's own scene, a light show the one of its place (or of the first of its countries with a landmark scene) */
export const sceneOfFormat = (formatId: CampaignFormatId, countryIds?: string[], places?: Partial<Record<CampaignFormatId, string>>): CampaignSceneId | null => {
  const place = places?.[formatId] ?? (formatId === 'LANDMARK_LIGHT_SHOW' ? countryIds?.find(id => LANDMARK_SCENES[id]) ?? null : null);
  const sceneId = sceneForFormat(formatId, place);
  if (!sceneId) return null;
  const only = CAMPAIGN_SCENES[sceneId].countries;
  return only && countryIds && !only.some(id => countryIds.includes(id)) ? null : sceneId;
};

/** the scene a frame can be seen in, if one of its formats has one there */
export const sceneOfFrame = (frame: CreativeFrame, countryIds?: string[], places?: Partial<Record<CampaignFormatId, string>>): CampaignSceneId | null => (
  frame.formats.map(id => sceneOfFormat(id, countryIds, places)).find(Boolean) ?? null
);

/** The made-for-you creatives for a subject's frames, drawn after the screen is up (only while `active`), kept for the
    life of the screen. */
export const useMadeForYou = (subject: CreativeSubject | null, frames: CreativeFrame[], active = true): Record<string, HTMLCanvasElement | undefined> => {
  const cache = useRef(new Map<string, HTMLCanvasElement>());
  const [, setDrawn] = useState(0);
  const subjectKey = subject ? [subject.kind, subject.title, subject.service, subject.hue, subject.brandHue, subject.art?.id, subject.art?.genre].join('|') : '';
  const framesKey = frames.map(frame => frame.key).join(',');
  useEffect(() => {
    if (!subject || !active) return undefined;
    let alive = true;
    const missing = frames.filter(frame => !cache.current.has(`${subjectKey}#${frame.key}`));
    if (!missing.length) return undefined;
    /* #156: one frame at a time, each after the screen has had a frame to breathe, so How's eight never land in one
       long task */
    (async () => {
      for (const frame of missing) {
        await new Promise(next => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(next, 0)) : setTimeout(next, 0)));
        if (!alive) return;
        const canvas = await makeDefaultCreative(subject, frame.ratio);
        cache.current.set(`${subjectKey}#${frame.key}`, canvas);
        if (alive) setDrawn(count => count + 1);
      }
    })().catch(() => undefined);
    return () => { alive = false; };
  }, [subjectKey, framesKey, active]);
  return Object.fromEntries(frames.map(frame => [frame.key, cache.current.get(`${subjectKey}#${frame.key}`)]));
};

/** one of a running campaign's creatives: its kept image, or the made-for-you one while that loads or if it is gone */
const KeptThumb: React.FC<{ frame: CreativeFrame; mediaId?: string; made?: HTMLCanvasElement; countryIds: string[]; places?: Partial<Record<CampaignFormatId, string>>; onOpen: (creative: Creative | null, yours: boolean) => void; key?: Key }> = ({ frame, mediaId, made, countryIds, places, onOpen }) => {
  const kept = useKeptCreative(mediaId);
  const creative = kept ?? made ?? null;
  const scene = sceneOfFrame(frame, countryIds, places);
  return (
    <figure>
      <button type="button" className={css.stripButton} disabled={!scene} onClick={() => onOpen(creative, Boolean(kept))} aria-label={scene ? `${frame.name}: see it live` : frame.name}>
        <CreativeThumb creative={creative} ratio={frame.ratio} />
        {scene && <i aria-hidden="true">▶</i>}
      </button>
      <figcaption><b>{frame.key}</b> {mediaId ? (kept ? 'yours' : 'yours …') : 'made for you'}</figcaption>
    </figure>
  );
};

/** A campaign's creatives as a strip; a frame with a scene opens it live. */
export const CampaignCreatives: React.FC<{
  formats: CampaignFormatId[];
  creativeIds?: Partial<Record<CampaignFormatId, string>>;
  subject: CreativeSubject;
  countryIds: string[];
  /** #156: where its big moments happen */
  places?: Partial<Record<CampaignFormatId, string>>;
  onLive: (sceneId: CampaignSceneId, creative: Creative | null, label: string) => void;
}> = ({ formats, creativeIds, subject, countryIds, places, onLive }) => {
  const frames = useMemo(() => creativeFramesOf(formats), [formats.join(',')]);
  const made = useMadeForYou(subject, frames);
  if (!frames.length) return null;
  return (
    <div className={css.strip}>
      {frames.map(frame => (
        <KeptThumb key={frame.key} frame={frame} mediaId={creativeIds?.[frame.formats[0]]} made={made[frame.key]} countryIds={countryIds} places={places}
          onOpen={(creative, yours) => { const scene = sceneOfFrame(frame, countryIds, places); if (scene) onLive(scene, creative, `${yours ? 'Your image' : 'Made for you'} · ${frame.name} ${frame.key}`); }} />
      ))}
    </div>
  );
};

/** A creative drawn small, in its frame's shape. */
export const CreativeThumb: React.FC<{ creative: Creative | null; ratio: number; className?: string; key?: Key }> = ({ creative, ratio, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !creative) return;
    const width = creative instanceof HTMLImageElement ? creative.naturalWidth : creative.width;
    const height = creative instanceof HTMLImageElement ? creative.naturalHeight : creative.height;
    const scale = Math.min(1, 640 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d')!.drawImage(creative, 0, 0, canvas.width, canvas.height);
  }, [creative]);
  return (
    <span className={[css.thumb, className].filter(Boolean).join(' ')} style={{ aspectRatio: String(ratio) }}>
      {creative ? <canvas ref={ref} /> : <i className={css.thumbWait} />}
    </span>
  );
};

/** A frame's creative: yours (in hand, or read back from the store), else the made-for-you one. */
export const useFrameCreative = (kept: KeptCreative | undefined, made: HTMLCanvasElement | undefined): Creative | null => {
  const loaded = useKeptCreative(kept && !kept.canvas ? kept.mediaId : null);
  return kept?.canvas ?? loaded ?? made ?? null;
};

/** A frame's creative drawn small (the review's strip). */
export const FrameThumb: React.FC<{ kept?: KeptCreative; made?: HTMLCanvasElement; ratio: number }> = ({ kept, made, ratio }) => (
  <CreativeThumb creative={useFrameCreative(kept, made)} ratio={ratio} />
);

/** one frame's card in the Creative step */
const FrameCard: React.FC<{
  frame: CreativeFrame; index: number; kept?: KeptCreative; made?: HTMLCanvasElement; problem: string | null; countryIds: string[]; places?: Partial<Record<CampaignFormatId, string>>;
  onPick: (file: File | undefined) => void; onLive: (sceneId: CampaignSceneId, creative: Creative | null) => void; onReset: () => void; key?: Key;
}> = ({ frame, index, kept, made, problem, countryIds, places, onPick, onLive, onReset }) => {
  const creative = useFrameCreative(kept, made);
  const sceneId = sceneOfFrame(frame, countryIds, places);
  return (
    <section className={[css.frameCard, frame.ratio < 1 ? css.frameTall : ''].join(' ')} style={{ ['--i' as string]: index }}>
      <CreativeThumb creative={creative} ratio={frame.ratio} className={frame.ratio < 1 ? css.thumbTall : undefined} />
      <div className={css.frameInfo}>
        <div className={css.frameHead}>
          <b>{frame.name}</b><span>{frame.key}</span>
          <em className={kept ? css.badgeYours : css.badgeMade}>{kept ? 'YOURS' : 'MADE FOR YOU'}</em>
        </div>
        <small>{frame.formats.map(id => CAMPAIGN_FORMATS[id].name).join(' · ')}</small>
        {problem && <p className={css.problem}>{problem}</p>}
        <div className={css.frameActions}>
          <label className={css.upload}>
            <input type="file" accept="image/*" onChange={event => { onPick(event.target.files?.[0]); event.target.value = ''; }} />
            {kept ? 'Replace' : 'Upload'}
          </label>
          {sceneId && <button type="button" className={css.see} onClick={() => onLive(sceneId, creative)}>▶ See it live</button>}
          {kept && <button type="button" className={css.reset} onClick={onReset}>Made for you</button>}
        </div>
      </div>
    </section>
  );
};

/** A creative in its scene, the launch moment playing, with Replay; over the whole screen (a portal, as the cropper). */
export const CreativeLive: React.FC<{ sceneId: CampaignSceneId; creative: Creative | null; label: string; onClose: () => void }> = ({ sceneId, creative, label, onClose }) => {
  const [play, setPlay] = useState(1);
  const scene = CAMPAIGN_SCENES[sceneId];
  return createPortal(
    <div className={css.live} role="dialog" aria-modal="true" aria-label={`${scene.name}, live`}>
      <div className={css.liveView}>
        <CampaignScene scene={scene} creative={creative} play={play} />
        <div className={css.liveHud} key={play}>
          <span className={css.liveTag}><i aria-hidden="true" />LIVE</span>
          <span>{scene.name} · {scene.place}</span>
        </div>
        <button type="button" className={css.liveClose} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={css.liveBar}>
        <span>{label}</span>
        <button type="button" onClick={() => setPlay(count => count + 1)}>▶ Replay</button>
      </div>
    </div>,
    document.body,
  );
};

export const CreativeStep: React.FC<{
  frames: CreativeFrame[];
  formats: CampaignFormatId[];
  /** made for you, by frame key (filled in as they are drawn) */
  made: Record<string, HTMLCanvasElement | undefined>;
  kept: Record<string, KeptCreative | undefined>;
  subjectName: string;
  accent: string;
  /** where the campaign runs: a scene of one real place shows only there */
  countryIds: string[];
  /** #156: where its big moments happen */
  places?: Partial<Record<CampaignFormatId, string>>;
  onKeep: (frameKey: string, creative: KeptCreative | null) => void;
}> = ({ frames, formats, made, kept, subjectName, accent, countryIds, places, onKeep }) => {
  const [cropping, setCropping] = useState<{ frame: CreativeFrame; image: HTMLImageElement } | null>(null);
  const [live, setLive] = useState<{ frame: CreativeFrame; sceneId: CampaignSceneId; creative: Creative | null } | null>(null);
  const [problem, setProblem] = useState<{ key: string; text: string } | null>(null);
  const noImage = formats.filter(id => !(CAMPAIGN_FORMATS[id].frame > 0));

  const pick = (frame: CreativeFrame, file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    readCreativeFile(file).then(image => setCropping({ frame, image })).catch((error: Error) => setProblem({ key: frame.key, text: error.message }));
  };
  const closeCrop = () => {
    if (cropping) URL.revokeObjectURL(cropping.image.src);
    setCropping(null);
  };

  return (
    <>
      <p className={css.lead}>Each format shows your art in its own frame. Until you upload, each one is made for you from {subjectName}.</p>
      {frames.length === 0 && <div className={css.none}>The formats you picked carry no image.</div>}
      <div className={css.frames}>
        {frames.map((frame, index) => (
          <FrameCard key={frame.key} frame={frame} index={index} kept={kept[frame.key]} made={made[frame.key]} countryIds={countryIds} places={places}
            problem={problem?.key === frame.key ? problem.text : null} onPick={file => pick(frame, file)}
            onLive={(sceneId, creative) => setLive({ frame, sceneId, creative })} onReset={() => onKeep(frame.key, null)} />
        ))}
      </div>
      {noImage.map(id => <p key={id} className={css.noImage}>{NO_IMAGE_LINE[id] ?? `${CAMPAIGN_FORMATS[id].name}: no image.`}</p>)}
      {cropping && (
        <CreativeCropper image={cropping.image} frame={cropping.frame} accent={accent} onCancel={closeCrop}
          onDone={canvas => {
            const key = cropping.frame.key;
            onKeep(key, { mediaId: keepCreative(canvas, text => setProblem({ key, text })), canvas });
            closeCrop();
          }} />
      )}
      {live && (
        <CreativeLive sceneId={live.sceneId} label={`${kept[live.frame.key] ? 'Your image' : 'Made for you'} · ${live.frame.name} ${live.frame.key}`}
          creative={live.creative} onClose={() => setLive(null)} />
      )}
    </>
  );
};
