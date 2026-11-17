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
import { CAMPAIGN_FORMATS, LANDMARK_SITES } from '../../../services/campaigns/campaignFormats';
import { NO_IMAGE_LINE, creativeFramesOf, type CreativeFrame } from './creativeFrames';
import { keepCreative, readCreativeFile, useKeptCreative } from './creativeMedia';
import { CreativeCropper } from './CreativeCropper';
import { CampaignScene } from '../scenes/CampaignScene';
import { CAMPAIGN_SCENES, LANDMARK_SCENES, sceneForFormat, type CampaignSceneId } from '../scenes/sceneCatalogue';
import { makeDefaultCreative, type CreativeSubject } from '../scenes/defaultCreative';
import { ONLINE_SCENES, OnlineScene, type LaunchDoorSceneId, type OnlineFormatId } from '../scenes/OnlineScenes';

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

/** 2026-11-17 (Zeesh: "creative page me jo bhi option choose kiya hai sab ka live preview dekhne ka option mile", the drone
    show had none): what each picked option can be seen live in. Its scene where the campaign runs; an online format's
    mock-up, full size; a light show at a landmark with no scene yet, a drawn tower with the creative on it; a launch
    door, its store or carrier page. */
export type LivePreview =
  | { kind: 'SCENE'; sceneId: CampaignSceneId }
  | { kind: 'ONLINE'; formatId: OnlineFormatId | LaunchDoorSceneId }
  | { kind: 'TOWER'; site: string };
/** one option in the live view: its name, its picture, and (search ads, a drone show, a door) the creative it shows */
export interface LiveChoice { name: string; preview: LivePreview; creative?: Creative | null }
export const previewOfFormat = (formatId: CampaignFormatId, countryIds?: string[], places?: Partial<Record<CampaignFormatId, string>>): LivePreview | null => {
  const sceneId = sceneOfFormat(formatId, countryIds, places);
  if (sceneId) return { kind: 'SCENE', sceneId };
  if ((ONLINE_SCENES as CampaignFormatId[]).includes(formatId)) return { kind: 'ONLINE', formatId: formatId as OnlineFormatId };
  if (formatId === 'LANDMARK_LIGHT_SHOW') {
    const place = places?.[formatId] ?? countryIds?.find(id => LANDMARK_SITES[id]);
    return { kind: 'TOWER', site: (place && LANDMARK_SITES[place]) || CAMPAIGN_FORMATS[formatId].name };
  }
  return null;
};
/** each of these formats, with what it can be seen live in */
export const liveChoicesOf = (formatIds: CampaignFormatId[], countryIds?: string[], places?: Partial<Record<CampaignFormatId, string>>): LiveChoice[] => (
  formatIds.flatMap(formatId => {
    const preview = previewOfFormat(formatId, countryIds, places);
    return preview ? [{ name: CAMPAIGN_FORMATS[formatId].name, preview }] : [];
  })
);

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
    /* 2026-11-17: no canvas memory (iOS) leaves the thumb empty, never an error */
    canvas.getContext('2d')?.drawImage(creative, 0, 0, canvas.width, canvas.height);
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
  onPick: (file: File | undefined) => void; onLive: (choices: LiveChoice[], creative: Creative | null) => void; onReset: () => void; key?: Key;
}> = ({ frame, index, kept, made, problem, countryIds, places, onPick, onLive, onReset }) => {
  const creative = useFrameCreative(kept, made);
  /* 2026-11-17: every format of the frame, each seen live (a switch in the live view when there are several) */
  const choices = liveChoicesOf(frame.formats, countryIds, places);
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
          {choices.length > 0 && <button type="button" className={css.see} onClick={() => onLive(choices, creative)}>▶ See it live</button>}
          {kept && <button type="button" className={css.reset} onClick={onReset}>Made for you</button>}
        </div>
      </div>
    </section>
  );
};

/** 2026-11-17: a light show at a landmark with no scene yet (Lotte World Tower, Marina Bay Sands …): a drawn tower in
    the service's colours, the creative lit on its facade, a light running down it. */
const LiveTower: React.FC<{ creative: Creative | null; hue: number; key?: Key }> = ({ creative, hue }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !creative) return;
    const width = creative instanceof HTMLImageElement ? creative.naturalWidth : creative.width;
    const height = creative instanceof HTMLImageElement ? creative.naturalHeight : creative.height;
    const scale = Math.min(1, 900 / Math.max(width, height, 1));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d')?.drawImage(creative, 0, 0, canvas.width, canvas.height);
  }, [creative]);
  return (
    <div className={css.liveTower} style={{ ['--hue' as string]: hue }}>
      <div className={css.towerBody}>
        <i className={css.towerSpire} />
        <span className={css.towerFacade}>{creative && <canvas ref={ref} />}<i className={css.towerSweep} /></span>
      </div>
      <i className={css.towerCity} />
    </div>
  );
};

/** A creative live where it runs, the launch moment playing, with Replay; over the whole screen (a portal, as the
    cropper). 2026-11-17: every option a frame stands for (or a format with no image, or a launch door), each in its own
    picture, with a switch between them when there are several; the drone show writes the name in the service's colours. */
export const CreativeLive: React.FC<{
  /** one scene (a running campaign's creatives) */
  sceneId?: CampaignSceneId;
  choices?: LiveChoice[];
  creative: Creative | null; label: string; onClose: () => void;
  subjectName?: string; brandName?: string; hue?: number;
}> = ({ sceneId, choices, creative, label, onClose, subjectName = '', brandName = '', hue = 214 }) => {
  const list: LiveChoice[] = choices?.length ? choices : sceneId ? [{ name: CAMPAIGN_SCENES[sceneId].name, preview: { kind: 'SCENE', sceneId } }] : [];
  const [at, setAt] = useState(0);
  const [play, setPlay] = useState(1);
  /* 2026-11-17 (Zeesh: "jab live preview banaye tab generating popup dikhe aur live preview prepare kare"): each picture
     is prepared behind a short card (the scene's photo loaded and the creative drawn on it, at least half a second, at
     most 6 s), then its moment plays from the start */
  const [sceneReady, setSceneReady] = useState(false);
  const [minPassed, setMinPassed] = useState(false);
  useEffect(() => {
    setSceneReady(false);
    setMinPassed(false);
    const least = window.setTimeout(() => setMinPassed(true), 500);
    const most = window.setTimeout(() => setSceneReady(true), 6000);
    return () => { window.clearTimeout(least); window.clearTimeout(most); };
  }, [at]);
  const choice = list[Math.min(at, list.length - 1)];
  const preview = choice?.preview;
  const shown = choice && choice.creative !== undefined ? choice.creative : creative;
  const scene = preview?.kind === 'SCENE' ? CAMPAIGN_SCENES[preview.sceneId] : null;
  const title = scene ? `${scene.name} · ${scene.place}` : preview?.kind === 'TOWER' ? `${CAMPAIGN_FORMATS.LANDMARK_LIGHT_SHOW.name} · ${preview.site}` : choice?.name ?? '';
  const ready = minPassed && (sceneReady || !scene);
  const pick = (index: number) => { setAt(index); setPlay(count => count + 1); };
  return createPortal(
    <div className={css.live} role="dialog" aria-modal="true" aria-label={`${title}, live`}>
      <div className={css.liveView}>
        {scene
          ? <CampaignScene key={scene.id} scene={scene} creative={shown} play={ready ? play : 0} label={subjectName} hue={hue} onReady={() => setSceneReady(true)} />
          : preview?.kind === 'ONLINE' && ready
            ? (
              <div className={css.liveOnline}>
                <div className={css.liveOnlineBox} key={`${preview.formatId}-${play}`}>
                  <OnlineScene formatId={preview.formatId} creative={shown} subjectName={subjectName} brandName={brandName} hue={hue} />
                </div>
              </div>
            )
            : preview?.kind === 'TOWER' && ready ? <LiveTower key={play} creative={shown} hue={hue} /> : <div />}
        {ready && (
          <div className={css.liveHud} key={`${at}-${play}`}>
            <span className={css.liveTag}><i aria-hidden="true" />LIVE</span>
            <span>{title}</span>
          </div>
        )}
        {!ready && (
          <div className={css.livePrep} role="status" aria-live="polite">
            <i className={css.livePrepSpin} aria-hidden="true" />
            <b>Preparing the live preview</b>
            <span>{choice?.name ?? ''}</span>
          </div>
        )}
        <button type="button" className={css.liveClose} onClick={onClose} aria-label="Close">✕</button>
      </div>
      {list.length > 1 && (
        <div className={css.liveSwitch} role="tablist" aria-label="Each format, live">
          {list.map((item, index) => (
            <button key={`${item.name}-${index}`} type="button" role="tab" aria-selected={index === at} className={index === at ? css.liveSwitchOn : undefined}
              onClick={() => pick(index)}>{item.name}</button>
          ))}
        </div>
      )}
      <div className={css.liveBar}>
        <span>{label}</span>
        <button type="button" disabled={!ready} onClick={() => setPlay(count => count + 1)}>▶ Replay</button>
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
  /** 2026-11-17: for the live previews (the drone show writes the title in these colours; the online mock-ups' service) */
  liveName?: string; brandName?: string; hue?: number;
  /** 2026-11-17: a launch's doors (app stores, carrier bundles): no art of their own, seen live with the service's */
  doors?: Array<{ id: LaunchDoorSceneId; name: string }>;
}> = ({ frames, formats, made, kept, subjectName, accent, countryIds, places, onKeep, liveName, brandName, hue, doors = [] }) => {
  const [cropping, setCropping] = useState<{ frame: CreativeFrame; image: HTMLImageElement } | null>(null);
  const [live, setLive] = useState<{ choices: LiveChoice[]; label: string; creative: Creative | null } | null>(null);
  const [problem, setProblem] = useState<{ key: string; text: string } | null>(null);
  const noImage = formats.filter(id => !(CAMPAIGN_FORMATS[id].frame > 0));
  /* what search ads and a drone show show (as on How: the square one), and the doors (the widescreen one) */
  const square = kept['1:1']?.canvas ?? made['1:1'] ?? null;
  const wide = kept['16:9']?.canvas ?? made['16:9'] ?? null;

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
      {frames.length > 0 || noImage.length > 0
        ? <p className={css.lead}>Each format shows your art in its own frame. Until you upload, each one is made for you from {subjectName}.</p>
        : doors.length > 0 && <p className={css.lead}>The doors you picked need no art of their own: the stores and carriers use your service's.</p>}
      {frames.length === 0 && noImage.length > 0 && <div className={css.none}>The formats you picked carry no image.</div>}
      <div className={css.frames}>
        {frames.map((frame, index) => (
          <FrameCard key={frame.key} frame={frame} index={index} kept={kept[frame.key]} made={made[frame.key]} countryIds={countryIds} places={places}
            problem={problem?.key === frame.key ? problem.text : null} onPick={file => pick(frame, file)}
            onLive={(choices, creative) => setLive({ choices, creative, label: `${kept[frame.key] ? 'Your image' : 'Made for you'} · ${frame.name} ${frame.key}` })} onReset={() => onKeep(frame.key, null)} />
        ))}
      </div>
      {/* 2026-11-17: a format with no image (the drone show, search ads) and a launch door can be seen live too */}
      {noImage.map(id => {
        const choices = liveChoicesOf([id], countryIds, places).map(choice => ({ ...choice, creative: square }));
        return (
          <div key={id} className={css.noImageRow}>
            <p className={css.noImage}>{NO_IMAGE_LINE[id] ?? `${CAMPAIGN_FORMATS[id].name}: no image.`}</p>
            {choices.length > 0 && <button type="button" className={css.see} onClick={() => setLive({ choices, creative: square, label: `${CAMPAIGN_FORMATS[id].name} · no image` })}>▶ See it live</button>}
          </div>
        );
      })}
      {doors.map(door => (
        <div key={door.id} className={css.noImageRow}>
          <p className={css.noImage}>{door.name}: no art of their own, they use your service's.</p>
          <button type="button" className={css.see}
            onClick={() => setLive({ choices: [{ name: door.name, preview: { kind: 'ONLINE', formatId: door.id }, creative: wide }], creative: wide, label: `${door.name} · your service's art` })}>▶ See it live</button>
        </div>
      ))}
      {cropping && (
        <CreativeCropper image={cropping.image} frame={cropping.frame} accent={accent} onCancel={closeCrop}
          onDone={canvas => {
            const key = cropping.frame.key;
            onKeep(key, { mediaId: keepCreative(canvas, text => setProblem({ key, text })), canvas });
            closeCrop();
          }} />
      )}
      {live && (
        <CreativeLive choices={live.choices} label={live.label} creative={live.creative} subjectName={liveName ?? ''} brandName={brandName} hue={hue} onClose={() => setLive(null)} />
      )}
    </>
  );
};
