/**
 * #156 (plan §20.13, Zeesh: "how page me bhi viusally diklhao … how me humare sare options ka acha visuals live
 * dikhe"): a format's live picture on its How card, with the campaign's own creative in it.
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
import { CampaignScene } from './CampaignScene';
import { CAMPAIGN_SCENES, sceneForFormat } from './sceneCatalogue';
import { ONLINE_SCENES, OnlineScene, type LaunchDoorSceneId, type OnlineFormatId } from './OnlineScenes';

type Creative = HTMLCanvasElement | HTMLImageElement;

/** whether a card on screen: built the first time, moving only while seen */
const useOnScreen = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') { setSeen(true); setOnScreen(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      setOnScreen(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, { rootMargin: '120px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, seen, onScreen };
};

export const FormatPicture: React.FC<{
  formatId: CampaignFormatId;
  /** where it happens: a big moment's place, a fixed site's country */
  countryId: string | null;
  /** the creative in this format's frame (made for you, or yours) */
  creative: Creative | null;
  subjectName: string;
  brandName: string;
  hue: number;
  className?: string;
}> = ({ formatId, countryId, creative, subjectName, brandName, hue, className }) => {
  const { ref, seen, onScreen } = useOnScreen();
  const sceneId = sceneForFormat(formatId, countryId);
  const online = (ONLINE_SCENES as CampaignFormatId[]).includes(formatId);
  const site = countryId ? CAMPAIGN_FORMATS[formatId].sites?.[countryId] : undefined;
  return (
    <div className={[css.picture, className].filter(Boolean).join(' ')} ref={ref} aria-hidden="true">
      {seen && sceneId && (
        <CampaignScene scene={CAMPAIGN_SCENES[sceneId]} creative={creative} play={0} compact idle paused={!onScreen} label={subjectName} hue={hue} className={css.pictureScene} />
      )}
      {seen && !sceneId && online && (
        <OnlineScene formatId={formatId as OnlineFormatId} creative={creative} subjectName={subjectName} brandName={brandName} hue={hue} paused={!onScreen} />
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
  creative: Creative | null;
  subjectName: string;
  brandName: string;
  hue: number;
  className?: string;
}> = ({ doorId, creative, subjectName, brandName, hue, className }) => {
  const { ref, seen, onScreen } = useOnScreen();
  return (
    <div className={[css.picture, className].filter(Boolean).join(' ')} ref={ref} aria-hidden="true">
      {seen && <OnlineScene formatId={doorId} creative={creative} subjectName={subjectName} brandName={brandName} hue={hue} paused={!onScreen} />}
    </div>
  );
};
