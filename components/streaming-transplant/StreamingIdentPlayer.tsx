/**
 * THE IDENT, as viewers see it (#119; plan §18.5 4; Zeesh, 2026-11-01: "ब्रांड किट … द होल किट, जनरल वर्ल्ड, सिनेमेटिक
 * आइडेंट, अडेप्टिव आइडेंट, ये भी मुझे कहीं दिख नहीं रहा है इसका प्रीव्यू क्या है कैसे").
 *
 * One scene for every place the ident shows: the app's opening (#115) full screen, the brand studio's stage, and its kit
 * cards and "what you get" surfaces as still frames. Each kit is its own short film:
 *   STANDARD   Just the ident    the mark lands, the name, the sound's wave (3 s)
 *   FULL       The whole kit     eight small marks orbit in and become one; rings on the beat; the name tracks in (8 s)
 *   CINEMATIC  Cinematic ident   letterbox, a projector beam and dust, a slow push-in, an anamorphic flare (12 s)
 *   GENRE      Genre worlds      drama, action, comedy, family and event worlds pass, then the brand's own (10 s)
 *   ADAPTIVE   Adaptive ident    the brand's colour flows into the next title's, which the ident names (10 s)
 *   LIVING     Living ident      the sky of the viewer's hour, the sun or moon rising, a greeting (12 s)
 * A surface (Up next, Trailers, Kids, Live, Premieres) is the same kit with its kicker; the whole kit and the kits above
 * it make all six.
 *
 * Sized in container units, so the same scene fills a phone or a 100px card. Its resting styles are the finished
 * frame; the animations run from the start into them, so a still (`still`) or reduced motion shows the composed
 * frame. Sound is not played here: the caller plays it from the tap that asked (`playStreamingIdentPreview`), as
 * browsers require.
 */
import React, { type ReactNode } from 'react';
import css from './presentation/screens/ViewerApp/IdentPlayer.module.css';
import { cx } from './presentation/cx';
import { Mark, brandColor, brandDeep, typeFace, type Brand } from './StreamingBrandVisuals';
import type { StreamingIdentPackageId } from '../../types';
import { streamingIdentSoundInfo, streamingIdentWaveBars } from './identSounds';

export type StreamingIdentSurface = 'IDENT' | 'END' | 'TRAILER' | 'KIDS' | 'LIVE' | 'PREMIERE';

/** the six places a kit dresses, in the order the studio shows them */
export const STREAMING_IDENT_SURFACES: ReadonlyArray<{ id: StreamingIdentSurface; name: string }> = [
  { id: 'IDENT', name: 'App opening' }, { id: 'END', name: 'Up next' }, { id: 'TRAILER', name: 'Trailers' },
  { id: 'KIDS', name: 'Kids' }, { id: 'LIVE', name: 'Live' }, { id: 'PREMIERE', name: 'Premieres' },
];

const WORLDS = [
  { id: 'drama', name: 'Drama' }, { id: 'action', name: 'Action' }, { id: 'comedy', name: 'Comedy' },
  { id: 'family', name: 'Family' }, { id: 'event', name: 'Event' },
] as const;
type World = typeof WORLDS[number]['id'];
/* the surfaces each kit dresses differently: Genre worlds by world, Living by hour, Adaptive by the title's colour */
const SURFACE_WORLD: Record<StreamingIdentSurface, World> = { IDENT: 'drama', END: 'comedy', TRAILER: 'action', KIDS: 'family', LIVE: 'event', PREMIERE: 'drama' };
const SURFACE_HOUR: Record<StreamingIdentSurface, number> = { IDENT: 7, END: 13, TRAILER: 18, KIDS: 16, LIVE: 21, PREMIERE: 23 };
const SURFACE_SHIFT: Record<StreamingIdentSurface, number> = { IDENT: 0, END: 150, TRAILER: 20, KIDS: 95, LIVE: 330, PREMIERE: 260 };
const KICKER: Record<StreamingIdentSurface, string | null> = {
  IDENT: null, END: 'Up next', TRAILER: 'Official trailer', KIDS: 'Kids', LIVE: 'Live now', PREMIERE: 'World premiere',
};

type Sky = 'dawn' | 'day' | 'dusk' | 'night';
const skyOf = (hour: number): Sky => (hour >= 5 && hour < 9 ? 'dawn' : hour >= 9 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night');
const GREETING: Record<Sky, string> = { dawn: 'Good morning', day: 'Good afternoon', dusk: 'Good evening', night: 'Good evening' };
const clock = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
/* fixed specks for the night's stars and the projector's dust: scattered, the same every time (left %, top %, size, delay) */
const SPECKS: ReadonlyArray<[number, number, number, number]> = Array.from({ length: 26 }, (_, n) => [
  (n * 37 + 11) % 97, (n * 53 + 7) % 89, n % 5 === 0 ? 2.4 : n % 3 === 0 ? 1.7 : 1.1, (n * 0.37) % 2.6,
]);
const Specks: React.FC<{ className: string }> = ({ className }) => (
  <span className={className} aria-hidden="true">
    {SPECKS.map(([left, top, size, delay], n) => (
      <i key={n} style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${-delay}s` }} />
    ))}
  </span>
);

export interface StreamingIdentPlayerProps {
  brand: Brand;
  kit: StreamingIdentPackageId;
  /** the sound's preview id ("pulse", "silent", "custom") or key: its wave is drawn, not played */
  sound: string;
  /** the kit's length; the animations are timed to it */
  seconds: number;
  /** the title about to play: Adaptive takes its colour and names it */
  next?: { title: string; hue: number } | null;
  /** a still frame (kit cards, surfaces): the finished frame, no motion */
  still?: boolean;
  /** one of the kit's six surfaces; the app opening when absent */
  surface?: StreamingIdentSurface;
  /** the hour Living reads, 0–23; the device's clock when absent */
  hour?: number;
  className?: string;
  /** what sits over the scene: the opening's run bar and Skip */
  children?: ReactNode;
}

export const StreamingIdentPlayer: React.FC<StreamingIdentPlayerProps> = ({
  brand, kit, sound, seconds, next, still = false, surface = 'IDENT', hour, className, children,
}) => {
  const tf = typeFace(brand);
  const info = streamingIdentSoundInfo(sound === 'custom' ? 'PULSE' : sound);
  const silent = sound === 'silent';
  const now = new Date();
  /* the studio's stills show each surface at its own hour and in its own colour; the app (#124) uses the viewer's
     clock and the title's own colour */
  const at = still && surface !== 'IDENT' && kit === 'LIVING' ? SURFACE_HOUR[surface] : hour ?? now.getHours();
  const sky = skyOf(at);
  /* a surface holds its world (a live channel the event's, Kids the family's); the opening plays them all */
  const world = surface !== 'IDENT' || still ? SURFACE_WORLD[surface] : null;
  const nextHue = ((next?.hue ?? (brand.hue + 150)) + (still && surface !== 'IDENT' ? SURFACE_SHIFT[surface] : 0)) % 360;
  const kicker = kit === 'STANDARD' ? null : KICKER[surface];
  const name = brand.name || 'EMPIRE+';
  const style = {
    ['--c' as string]: brandColor(brand),
    ['--cd' as string]: brandDeep(brand),
    ['--s' as string]: `${Math.max(2, Math.min(14, seconds || 3))}s`,
    ['--nh' as string]: `${nextHue}`,
  } as React.CSSProperties;

  return (
    <div className={cx(css.scene, still && css.still, className)} data-kit={kit} data-surface={surface} data-sky={kit === 'LIVING' ? sky : undefined}
      style={style} aria-hidden={still || undefined}>
      <i className={css.bg} aria-hidden="true" />

      {kit === 'GENRE' && (
        <span className={css.worlds} aria-hidden="true">
          {WORLDS.map((item, index) => (
            <i key={item.id} className={cx(css.world, world === item.id && css.worldOn)} data-world={item.id} style={{ ['--n' as string]: index } as React.CSSProperties}>
              <b>{item.name}</b>
            </i>
          ))}
        </span>
      )}
      {kit === 'ADAPTIVE' && <i className={css.tint} aria-hidden="true" />}
      {kit === 'LIVING' && <><i className={css.sky} aria-hidden="true" />{sky === 'night' && <Specks className={css.stars} />}<i className={css.orb} aria-hidden="true" /></>}
      {kit === 'CINEMATIC' && <><i className={css.beam} aria-hidden="true" /><Specks className={css.dust} /></>}
      {kit === 'FULL' && (
        <span className={css.orbit} aria-hidden="true">
          {Array.from({ length: 8 }, (_, n) => <i key={n} style={{ ['--k' as string]: n } as React.CSSProperties}><Mark brand={brand} /></i>)}
        </span>
      )}
      {(kit === 'FULL' || kit === 'CINEMATIC') && <span className={css.rings} aria-hidden="true"><i /><i /><i /></span>}
      {kit !== 'STANDARD' && !still && <i className={css.isweep} aria-hidden="true" />}

      <span className={css.imark}><Mark brand={brand} /></span>
      {kit === 'CINEMATIC' && <i className={css.flare} aria-hidden="true" />}
      <div className={css.iname} style={{ fontFamily: tf.stack, fontWeight: tf.weight, textTransform: tf.transform }}>{name}</div>
      {kicker && <span className={css.kicker}>{surface === 'LIVE' && <i />}{kicker}</span>}
      {kit === 'ADAPTIVE' && surface === 'IDENT' && next && <span className={css.upnext}><i />Tonight · <b>{next.title}</b></span>}
      {kit === 'LIVING' && surface === 'IDENT' && <span className={css.greet}>{GREETING[sky]} · {clock(at, hour === undefined ? now.getMinutes() : 0)}</span>}
      {!silent && (
        <div className={css.iwave} aria-hidden="true">
          {streamingIdentWaveBars(info.wave, 15).map((height, n) => (
            <i key={n} style={{ ['--m' as string]: Math.max(.16, height).toFixed(3), animationDelay: `${((n * 7) % 5) * .09}s` } as React.CSSProperties} />
          ))}
        </div>
      )}
      {kit === 'CINEMATIC' && <><i className={css.lbtop} aria-hidden="true" /><i className={css.lbbottom} aria-hidden="true" /></>}
      {children}
    </div>
  );
};

export default StreamingIdentPlayer;
