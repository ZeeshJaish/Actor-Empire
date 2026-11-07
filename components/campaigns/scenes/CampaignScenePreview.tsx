/**
 * The campaign scenes prototype (#144; plan §20.10 point 4: "A prototype first: the Burj Khalifa and a city billboard,
 * with an uploaded image mapped in and the launch animation, for his OK before every other scene").
 * Opened from CAMPAIGNS. Two scenes, each with its creative: made for you from your top title and your service, or an
 * image you upload in that scene's frame (kept only while the preview is open; the media store comes in #148).
 * The launch moment plays on opening, on switching scene, on a new image, and on Play launch.
 */
import React, { useEffect, useRef, useState } from 'react';
import css from './CampaignScenes.module.css';
import { CampaignScene } from './CampaignScene';
import { CAMPAIGN_SCENES, type CampaignSceneId } from './sceneCatalogue';
import { makeDefaultCreative, type CreativeSubject } from './defaultCreative';

const ORDER: CampaignSceneId[] = ['BURJ_KHALIFA', 'CITY_BILLBOARD'];
const TAB: Partial<Record<CampaignSceneId, string>> = { BURJ_KHALIFA: 'Burj Khalifa', CITY_BILLBOARD: 'Billboard' };
const FRAME: Partial<Record<CampaignSceneId, string>> = {
  BURJ_KHALIFA: 'Frame 1:6, tall · drawn in the tower’s LEDs',
  CITY_BILLBOARD: 'Frame 3:1, wide · lit by the lamps below',
};

export const CampaignScenePreview: React.FC<{ subject: CreativeSubject; onClose: () => void }> = ({ subject, onClose }) => {
  const [sceneId, setSceneId] = useState<CampaignSceneId>('BURJ_KHALIFA');
  const [made, setMade] = useState<Partial<Record<CampaignSceneId, HTMLCanvasElement>>>({});
  const [uploads, setUploads] = useState<Partial<Record<CampaignSceneId, HTMLImageElement>>>({});
  const [play, setPlay] = useState(1);
  const urls = useRef<string[]>([]);
  const scene = CAMPAIGN_SCENES[sceneId];

  /* the creatives made for you, one per frame */
  useEffect(() => {
    let alive = true;
    Promise.all(ORDER.map(id => makeDefaultCreative(subject, CAMPAIGN_SCENES[id].aspect).then(canvas => [id, canvas] as const)))
      .then(entries => { if (alive) setMade(Object.fromEntries(entries)); });
    return () => { alive = false; };
  }, [subject.title, subject.service, subject.hue, subject.brandHue]);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const upload = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    const image = new Image();
    image.onload = () => {
      setUploads(current => ({ ...current, [sceneId]: image }));
      setPlay(count => count + 1);
    };
    image.src = url;
  };
  const pick = (id: CampaignSceneId) => {
    if (id === sceneId) return;
    setSceneId(id);
    setPlay(count => count + 1);
  };
  const reset = () => {
    setUploads(current => { const next = { ...current }; delete next[sceneId]; return next; });
    setPlay(count => count + 1);
  };
  const creative = uploads[sceneId] ?? made[sceneId] ?? null;

  return (
    <div className={css.preview} role="dialog" aria-modal="true" aria-label="Campaign scenes">
      <header className={css.top}>
        <button type="button" className={css.back} onClick={onClose} aria-label="Back to Campaigns">←</button>
        <div><small>PROTOTYPE · FOR YOUR OK</small><b>Campaign scenes</b></div>
      </header>
      <div className={css.tabs} role="tablist" aria-label="Scene">
        {ORDER.map(id => (
          <button key={id} type="button" role="tab" aria-selected={id === sceneId} className={id === sceneId ? css.on : ''} onClick={() => pick(id)}>{TAB[id]}</button>
        ))}
      </div>
      <div className={css.view}>
        <CampaignScene scene={scene} creative={creative} play={play} />
        <div className={css.hud} key={`${sceneId}-${play}`}>
          <span className={css.live}><i aria-hidden="true" />LIVE</span>
          <span className={css.where}>{scene.name} · {scene.place}</span>
        </div>
      </div>
      <p className={css.note}>
        {uploads[sceneId] ? 'Your image' : `Made for you from ${subject.title}`} on a photo-real backdrop made with AI (no other brands, no people),
        placed in true perspective. Every format gets a scene like this once you OK the look.
      </p>
      <div className={css.bar}>
        <label className={css.upload}>
          <input type="file" accept="image/*" onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} />
          Upload image
        </label>
        <button type="button" className={css.play} onClick={() => setPlay(count => count + 1)}>▶ Play launch</button>
        <div className={css.frameLine}>
          <span>{FRAME[sceneId]}</span>
          {uploads[sceneId] && <button type="button" onClick={reset}>Use made-for-you</button>}
        </div>
      </div>
    </div>
  );
};
