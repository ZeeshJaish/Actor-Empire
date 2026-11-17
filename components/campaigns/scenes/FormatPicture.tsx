/**
 * #156 (plan §20.13, Zeesh: "how page me bhi viusally diklhao … how me humare sare options ka acha visuals live
 * dikhe"): a format's picture on its How card.
 * 2026-11-17 (Zeesh's iPhone: a fast scroll on How turned the screen white, then black, then the Zedbury logo: iOS closed
 * the game's page. Zeesh: "how section ke liye default image, aur live wala creative section me … jab live preview
 * banaye tab generating popup"): a card is now the place's own photo, the half-size JPEG the game ships, with nothing
 * drawn on it and no creative. A live scene on a card kept its camera as a graphics layer the size of the whole photo
 * and every face of a billboard or poster wall as one more (3D) layer; an iPhone keeps each at full sharpness, tens of MB
 * a card, and a fling built several at once. The creative and the motion are in the Creative step's See it live.
 *  - Out of home and big moments: their photo-real scene (sceneCatalogue.ts), compact, with light motion; a light show
 *    shows the landmark where it happens (the Burj Khalifa, the Empire State Building, the London Eye, Tokyo Tower),
 *    and a landmark with no scene yet shows a drawn skyline in the creative's colours.
 *  - Online formats: the screens they live on (OnlineScenes.tsx).
 * Built only once the card comes on screen, and held still while it is off screen, so a page of cards stays light.
 */
import React, { useEffect, useRef, useState } from 'react';
import css from './CampaignScenes.module.css';
import type { CampaignFormatId } from '../../../types';
import { CAMPAIGN_FORMATS } from '../../../services/campaigns/campaignFormats';
import { CAMPAIGN_SCENES, sceneForFormat, type CampaignScene } from './sceneCatalogue';
import { coverFrame, quadPoint, type SceneQuad } from './sceneGeometry';
import { ONLINE_SCENES, OnlineScene, type LaunchDoorSceneId, type OnlineFormatId } from './OnlineScenes';

/* the photo's focus kept in view on a 16:10 card, as the live scene frames it (coverFrame): a portrait photo fills the
   card's width and is cropped above and below */
const CARD_TALL = 10 / 16;
const focusPosition = (scene: CampaignScene): string => {
  const tall = scene.height / scene.width;
  if (tall <= CARD_TALL) return `${Math.round((scene.focus[0] / scene.width) * 100)}% 50%`;
  const y = Math.min(1, Math.max(0, (scene.focus[1] / scene.width - CARD_TALL / 2) / (tall - CARD_TALL)));
  return `50% ${(y * 100).toFixed(1)}%`;
};

/* the photo's boards and screens are blank: each is filled with the service's colours, a flat shape painted with the
   photo (a clip path, no graphics layer), inside a print's paper border */
const CARD = { width: 1000, height: 625 };
const faceFill = (scene: CampaignScene, quad: SceneQuad, hue: number, index: number): React.CSSProperties => {
  const frame = coverFrame(CARD, { width: scene.width, height: scene.height }, scene.focus);
  const margin = scene.kind === 'QUAD' ? scene.margin ?? 0 : 0;
  const corners = [[margin, margin], [1 - margin, margin], [1 - margin, 1 - margin], [margin, 1 - margin]].map(([u, v]) => {
    const [x, y] = quadPoint(quad, u, v);
    return `${(((frame.x + x * frame.scale) / CARD.width) * 100).toFixed(2)}% ${(((frame.y + y * frame.scale) / CARD.height) * 100).toFixed(2)}%`;
  });
  const clip = `polygon(${corners.join(', ')})`;
  /* faces that overlap (flyers) a shade apart, so each reads as its own sheet */
  const light = 62 - (index % 3) * 6;
  return { clipPath: clip, WebkitClipPath: clip, background: `linear-gradient(${160 + (index % 2) * 24}deg, hsl(${hue} 80% ${light}%), hsl(${hue + 36} 78% ${light - 26}%))` };
};

/** whether a card is near the screen. 2026-11-11 (player reports: black tiles and lag on the How step): a
    scene stayed built once seen, and each light show holds two backdrop-sized canvases (1024×1536, about
    12 MB), so scrolling a page of cards filled a phone's memory. A scene is now built only while its card
    is near the screen and let go when it scrolls away. */
const useOnScreen = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    /* 2026-11-16 (Android emulator, final break test): a fast fling hands over the card's leaving and coming back in one
       batch. Reading only the first entry kept a card that was back on screen marked "away", so it stayed an empty
       black tile until it was scrolled again (the "black tiles on Android" reports). The last entry is the card's
       state now. */
    const observer = new IntersectionObserver(entries => setNear(entries[entries.length - 1].isIntersecting), { rootMargin: '360px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, seen: near, onScreen: near };
};

export const FormatPicture: React.FC<{
  formatId: CampaignFormatId;
  /** where it happens: a big moment's place, a fixed site's country */
  countryId: string | null;
  subjectName: string;
  brandName: string;
  hue: number;
  className?: string;
}> = ({ formatId, countryId, subjectName, brandName, hue, className }) => {
  const { ref, seen, onScreen } = useOnScreen();
  const sceneId = sceneForFormat(formatId, countryId);
  const online = (ONLINE_SCENES as CampaignFormatId[]).includes(formatId);
  const site = countryId ? CAMPAIGN_FORMATS[formatId].sites?.[countryId] : undefined;
  return (
    <div className={[css.picture, className].filter(Boolean).join(' ')} ref={ref} aria-hidden="true">
      {seen && sceneId && (
        <img className={css.picturePhoto} src={CAMPAIGN_SCENES[sceneId].thumb} alt="" draggable={false} decoding="async"
          style={{ objectPosition: focusPosition(CAMPAIGN_SCENES[sceneId]) }} />
      )}
      {seen && sceneId && (() => {
        const scene = CAMPAIGN_SCENES[sceneId];
        return scene.kind === 'QUAD' ? [scene.quad, ...(scene.quads || [])].map((quad, index) => <i key={index} className={css.pictureFace} style={faceFill(scene, quad, hue, index)} />) : null;
      })()}
      {seen && !sceneId && online && (
        /* the screen it lives on, still, with the service's name and colours and no creative */
        <OnlineScene formatId={formatId as OnlineFormatId} creative={null} subjectName={subjectName} brandName={brandName} hue={hue} paused />
      )}
      {seen && !sceneId && !online && (
        /* a landmark with no scene yet: a drawn skyline, its tower in the service's colours */
        <div className={css.skyline} style={{ ['--hue' as string]: hue }}>
          <i className={css.skylineTower} />
          <i className={css.skylineCity} />
          {site && <span>{site}</span>}
        </div>
      )}
    </div>
  );
};

/** #158: a launch door's picture on the launch builder's How (app stores, carrier bundles), drawn like the online formats */
export const DoorPicture: React.FC<{
  doorId: LaunchDoorSceneId;
  subjectName: string;
  brandName: string;
  hue: number;
  className?: string;
}> = ({ doorId, subjectName, brandName, hue, className }) => {
  const { ref, seen, onScreen } = useOnScreen();
  return (
    <div className={[css.picture, className].filter(Boolean).join(' ')} ref={ref} aria-hidden="true">
      {seen && <OnlineScene formatId={doorId} creative={null} subjectName={subjectName} brandName={brandName} hue={hue} paused />}
    </div>
  );
};
