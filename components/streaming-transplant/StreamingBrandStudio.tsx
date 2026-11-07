/**
 * THE BRAND STUDIO (#116; plan §18.6; Zeesh, 2026-11-01: "एचक्यू के लोगों को टैग करो तो चेंज हो जाए" … "लोगो और इंटेंट बदलने
 * का पैसा और हफ्ता लगेगा, और ठीक है करो").
 *
 * Opened from the logo on the HQ. One place for the look the world sees, previewed live as the app's own top bar and
 * front page:
 *  - LOOK: the logo (the founding marks, letterforms or an upload), the colours, the typeface and the lockup. A new look
 *    costs money and the next waits 4 weeks; the name stays.
 *  - IDENT: the sound and the kit. After launch a new ident is a new production (its price; the next waits 4 weeks);
 *    before launch it is set in Define the Launch.
 *  - FRONT PAGE: the 13 front pages (they moved here from the Offer tab), locked ones naming their Tech step.
 * The bar at the foot says what Apply will do, what it costs and when the next can come.
 */
import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import css from './presentation/screens/BrandStudio/BrandStudio.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import {
  type Brand, LETTERFORMS, LOCKUPS, MARKS, Mark, PLAYER_LOCKUP_IDS, TYPEFACES, brandColor, brandDeep, hslHex, letterMark, typeFace,
} from './StreamingBrandVisuals';
import { convertStreamingBrandMark } from '../../services/streamingBrandImage';
import { playStreamingIdentPreview } from '../../services/streamingIdentAudio';
import type { StreamingBrandLook, StreamingBrandStudioView } from '../../services/streamingBrandStudio';
import { getStreamingIdentChangeCost, streamingBrandLookChanges } from '../../services/streamingBrandStudio';
import type { StreamingIdentPackageId, StreamingSoundIdentKey, StreamingTechId, StreamingTypefaceId, StreamingWordmarkStyleId } from '../../types';
import { StreamingViewerHomePreview } from './StreamingViewerHomes';
import { getStreamingStorefrontDefinition } from '../../services/streamingStorefront';
import { STREAMING_IDENT_SURFACES, StreamingIdentPlayer } from './StreamingIdentPlayer';
import { STREAMING_IDENT_SOUNDS, streamingIdentSoundInfo, streamingIdentWaveBars } from './identSounds';

type Tab = 'LOOK' | 'IDENT' | 'FRONT';
type Result = { ok: boolean; message: string };

/* #119: each kit says what it is (`line`) and what viewers get (`what`); the stage plays it, the card shows its still */
const KITS: Array<{ id: StreamingIdentPackageId; name: string; seconds: number; line: string; what: string }> = [
  { id: 'STANDARD', name: 'Just the ident', seconds: 3, line: 'Your logo and sound', what: 'Your logo lands with its sound as the app opens. Short and clean.' },
  { id: 'FULL', name: 'The whole kit', seconds: 8, line: 'One system, six places', what: 'Eight marks orbit in and become one. The same look dresses Up next, trailers, Kids, Live and premieres.' },
  { id: 'CINEMATIC', name: 'Cinematic ident', seconds: 12, line: 'Big-screen drama', what: 'Letterbox, a projector beam through the dust and a slow push-in: every opening feels like a cinema.' },
  { id: 'GENRE', name: 'Genre worlds', seconds: 10, line: 'A world for each genre', what: 'Drama, action, comedy, family and event worlds pass before your own: the mood of what is on.' },
  { id: 'ADAPTIVE', name: 'Adaptive ident', seconds: 10, line: "Takes the next title's colour", what: 'Your colour flows into the colour of the title about to play, and the ident names it.' },
  { id: 'LIVING', name: 'Living ident', seconds: 12, line: 'Changes with the hour', what: "It follows the viewer's clock: morning light, an evening sky, stars at night, and a greeting." },
];
/* the title the studio's Adaptive preview leads into: a colour far from the brand's, so the change shows */
const sampleNext = (hue: number) => ({ title: 'Midnight Harbor', hue: (hue + 160) % 360 });
const money = (value: number) => `$${value >= 1e6 ? `${Math.round(value / 1e5) / 10}M` : `${Math.round(value / 1e3)}K`}`;
const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;

/** a padlock, drawn: the lock on a kit or a front page Tech has not opened */
const LockGlyph: React.FC = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="3" y="7" width="10" height="7.2" rx="2" fill="currentColor" /></svg>
);

/** the founding look a brand draws (hue and intensity → the primary colour; the accent → the deep secondary) */
export const streamingBrandLookOf = (brand: Brand): StreamingBrandLook => ({
  visualMarkId: brand.markId,
  customMarkDataUrl: brand.customMark,
  primaryColor: hslHex(brand.hue, brand.sat, 58),
  secondaryColor: hslHex(brand.accentHue, Math.max(30, brand.sat - 16), 18),
  typefaceId: brand.typeId as StreamingTypefaceId,
  wordmarkStyleId: brand.lockupId as StreamingWordmarkStyleId,
});

export interface StreamingBrandStudioProps {
  brand: Brand;
  view: StreamingBrandStudioView;
  ident: { soundIdentKey: StreamingSoundIdentKey | null; packageId: StreamingIdentPackageId | null };
  /** a kit's Tech lock (#109), by kit */
  identLocks: Partial<Record<StreamingIdentPackageId, { techId: StreamingTechId; tech: string }>>;
  frontPage: {
    currentId: string | null;
    layouts: Array<{ id: string; name: string; line: string; composition: string; category: string; locked: string | null; lockTech?: StreamingTechId | null }>;
  };
  onApplyLook: (look: StreamingBrandLook) => Result;
  onApplyIdent: (input: { soundIdentKey: StreamingSoundIdentKey; identPackageId: StreamingIdentPackageId }) => Result;
  onApplyFrontPage?: (layoutId: string) => Result;
  onGoToTech?: (techId: StreamingTechId) => void;
  /** before launch the ident and the front page are set in Define the Launch */
  onOpenDefineLaunch?: () => void;
  onClose: () => void;
  /** the tab it opens on (Look when absent) */
  initialTab?: 'LOOK' | 'IDENT' | 'FRONT';
}

export const StreamingBrandStudio: React.FC<StreamingBrandStudioProps> = ({
  brand, view, ident, identLocks, frontPage, onApplyLook, onApplyIdent, onApplyFrontPage, onGoToTech, onOpenDefineLaunch, onClose, initialTab = 'LOOK',
}) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [draft, setDraft] = useState<Brand>(brand);
  const [sound, setSound] = useState<StreamingSoundIdentKey>(ident.soundIdentKey || 'PULSE');
  const [kit, setKit] = useState<StreamingIdentPackageId>(ident.packageId || 'STANDARD');
  const [layout, setLayout] = useState<string>(frontPage.currentId || 'cinema');
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [upload, setUpload] = useState<'idle' | 'busy' | 'error'>('idle');
  /* #119: bumping `take` replays the stage; `playing` lights the sound card while it sounds */
  const [take, setTake] = useState(0);
  const [playing, setPlaying] = useState<StreamingSoundIdentKey | null>(null);
  const playingTimer = useRef<number | null>(null);
  useEffect(() => () => { if (playingTimer.current) window.clearTimeout(playingTimer.current); }, []);
  /* #120: the front page tiles draw the app's own home at its width (375), scaled to the tile. #122: with 25 of them
     the tab opens on their frames at once and the homes fill in a beat later, so the tap stays instant */
  const [tilesReady, setTilesReady] = useState(initialTab === 'FRONT');
  useEffect(() => {
    if (tab !== 'FRONT') { setTilesReady(false); return undefined; }
    const timer = window.setTimeout(() => startTransition(() => setTilesReady(true)), 30);
    return () => window.clearTimeout(timer);
  }, [tab]);
  const frontsRef = useRef<HTMLDivElement>(null);
  const [tileScale, setTileScale] = useState(.28);
  useEffect(() => {
    const grid = frontsRef.current;
    if (tab !== 'FRONT' || !grid) return undefined;
    const measure = () => {
      const thumb = grid.querySelector<HTMLElement>('[data-front-thumb]');
      if (thumb?.clientWidth) setTileScale(thumb.clientWidth / 375);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [tab]);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = brandColor(draft);
  const tf = typeFace(draft);
  /* the colours count as changed only once touched: a brand's hue and intensity do not round-trip to its saved hex
     exactly, so an untouched draft keeps the saved colours */
  const coloursTouched = draft.hue !== brand.hue || draft.sat !== brand.sat || draft.accentHue !== brand.accentHue;
  const draftLook = useMemo<StreamingBrandLook>(() => {
    const look = streamingBrandLookOf(draft);
    return coloursTouched || !view.look ? look : { ...look, primaryColor: view.look.primaryColor, secondaryColor: view.look.secondaryColor };
  }, [draft, coloursTouched, view.look]);
  const lookChanges = useMemo(() => (view.look ? streamingBrandLookChanges(view.look, draftLook) : []), [view.look, draftLook]);
  const identChanged = sound !== ident.soundIdentKey || kit !== ident.packageId;
  const layoutDef = frontPage.layouts.find(item => item.id === layout);
  const layoutEffects = getStreamingStorefrontDefinition(layout)?.effects ?? null;
  const frontChanged = layout !== frontPage.currentId;

  const set = (patch: Partial<Brand>) => { setFeedback(null); setDraft(current => ({ ...current, ...patch })); };
  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setUpload('busy');
    try {
      const converted = await convertStreamingBrandMark(file);
      set({ customMark: converted.dataUrl });
      setUpload('idle');
    } catch {
      setUpload('error');
    }
  };
  const run = (result: Result) => { setFeedback(result); };
  /* #119: hear it and see it. A tap on a sound or a kit plays the ident on the stage with that sound (the tap is the
     gesture browsers need for sound); before launch too, as a preview */
  const kitDef = KITS.find(item => item.id === kit) ?? KITS[0];
  const soundInfo = streamingIdentSoundInfo(sound);
  const play = (key: StreamingSoundIdentKey) => {
    setTake(current => current + 1);
    setPlaying(key === 'SILENT' ? null : key);
    if (playingTimer.current) window.clearTimeout(playingTimer.current);
    playingTimer.current = window.setTimeout(() => setPlaying(null), 1100);
    void playStreamingIdentPreview(key.toLowerCase() as never).catch(() => undefined);
  };
  const pickSound = (key: StreamingSoundIdentKey) => { setSound(key); setFeedback(null); play(key); };
  const pickKit = (id: StreamingIdentPackageId) => { setKit(id); setFeedback(null); play(sound); };

  /* the bar: what Apply does on this tab, its cost, the wait */
  const bar = (() => {
    if (tab === 'LOOK') {
      if (view.lookWaitWeeks > 0) return { what: 'THE LAST NEW LOOK IS ROLLING OUT', line: `Next new look in ${weeks(view.lookWaitWeeks)}`, action: null };
      if (!lookChanges.length) return { what: 'YOUR LOOK', line: 'Change the logo, colours, type or lockup above', action: null };
      const short = view.treasury < view.lookCost;
      return {
        what: `NEW ${lookChanges.join(' · ').toUpperCase()}`,
        line: `${money(view.lookCost)} · then ${weeks(4)} before the next`,
        action: { label: short ? `${money(view.lookCost - view.treasury)} short` : `Unveil · ${money(view.lookCost)}`, disabled: short,
          go: () => run(onApplyLook(draftLook)) },
      };
    }
    if (tab === 'IDENT') {
      if (!view.live) return { what: 'BEFORE LAUNCH', line: 'The ident is set in Define the Launch, paid at launch', action: onOpenDefineLaunch ? { label: 'Define the Launch ›', disabled: false, go: onOpenDefineLaunch } : null };
      if (view.identWaitWeeks > 0) return { what: 'THE LAST NEW IDENT IS ROLLING OUT', line: `Next new ident in ${weeks(view.identWaitWeeks)}`, action: null };
      if (!identChanged) return { what: 'YOUR IDENT', line: 'Pick a sound or a kit above', action: null };
      const lock = identLocks[kit];
      if (lock) return { what: `${KITS.find(item => item.id === kit)?.name.toUpperCase()} IS LOCKED`, line: `Unlock ${lock.tech} in Tech`, action: onGoToTech ? { label: `${lock.tech} ›`, disabled: false, go: () => onGoToTech(lock.techId) } : null };
      const cost = getStreamingIdentChangeCost(kit);
      const short = view.treasury < cost;
      return {
        what: `NEW IDENT · ${KITS.find(item => item.id === kit)?.name.toUpperCase()}`,
        line: `${soundInfo.name} · ${money(cost)} · then ${weeks(4)} before the next`,
        action: { label: short ? `${money(cost - view.treasury)} short` : `Commission · ${money(cost)}`, disabled: short,
          go: () => run(onApplyIdent({ soundIdentKey: sound, identPackageId: kit })) },
      };
    }
    if (!view.live) return { what: 'BEFORE LAUNCH', line: 'The front page is chosen in Define the Launch', action: onOpenDefineLaunch ? { label: 'Define the Launch ›', disabled: false, go: onOpenDefineLaunch } : null };
    if (!frontChanged) return { what: 'YOUR FRONT PAGE', line: `${layoutDef?.name ?? 'Cinema'} · the app opens on it`, action: null };
    if (layoutDef?.locked) return { what: `${layoutDef.name.toUpperCase()} IS LOCKED`, line: `Unlock ${layoutDef.locked} in Tech`, action: layoutDef.lockTech && onGoToTech ? { label: `${layoutDef.locked} ›`, disabled: false, go: () => onGoToTech(layoutDef.lockTech!) } : null };
    return {
      what: `NEW FRONT PAGE · ${layoutDef?.name.toUpperCase()}`,
      line: 'Free · the app shows it right away',
      action: onApplyFrontPage ? { label: 'Use this front page', disabled: false, go: () => run(onApplyFrontPage(layout)) } : null,
    };
  })();

  return (
    <div className={css.studio} data-epx-root style={brandVars(draft)}>
      <header className={css.head}>
        <button type="button" className={css.back} onClick={onClose} aria-label="Close the brand studio">←</button>
        <span><small>BRAND STUDIO</small><b>{brand.name || 'UNNAMED'}</b></span>
      </header>

      <div className={css.scroll}>
        {/* #119: off the Look tab the preview and the tabs stay in sight while the choices scroll under them */}
        <div className={cx(css.top, tab !== 'LOOK' && css.topSticky)}>
        {tab === 'IDENT' ? (
          /* #119: the ident itself, as viewers see it when the app opens: the chosen kit with the chosen sound */
          <section className={cx(css.preview, css.stagePreview)} aria-label="Live preview">
            <div className={css.stage}>
              <StreamingIdentPlayer key={take} brand={draft} kit={kit} sound={sound.toLowerCase()} seconds={kitDef.seconds} next={sampleNext(draft.hue)} />
              {identLocks[kit] && <span className={css.stamp}>Preview · unlock in Tech</span>}
            </div>
            <div className={css.stageFoot}>
              <span><b>{kitDef.name}</b><em>{soundInfo.name} · {soundInfo.feel.toLowerCase()} · {kitDef.seconds} seconds</em></span>
              <button type="button" className={css.replay} onClick={() => play(sound)} aria-label="Play the ident again">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z" fill="currentColor" /></svg>Play
              </button>
            </div>
          </section>
        ) : tab === 'FRONT' ? (
          /* #120: the front page picked, as the app draws it, with what it is and whether it can be used */
          <section className={cx(css.preview, css.frontPreview)} aria-label="Live preview">
            <span className={css.fphone}><span className={css.fscreen}><StreamingViewerHomePreview layoutId={layout} brand={draft} /></span></span>
            <span className={css.finfo}>
              <small className={cx(css.fstate, layoutDef?.locked ? css.fstateLocked : layout === frontPage.currentId ? css.fstateUse : css.fstateReady)}>
                {layoutDef?.locked ? <><LockGlyph />Locked</> : layout === frontPage.currentId ? '✓ In use' : 'Ready'}
              </small>
              <b>{layoutDef?.name ?? 'Cinema'}</b>
              <em>{layoutDef?.line}</em>
              {layoutDef?.locked ? (
                <i className={css.fneeds}>Unlock <b>{layoutDef.locked}</b> in Tech</i>
              ) : layoutEffects && (
                <span className={css.fx}><i>{layoutEffects[0]}</i><i className={css.fxDown}>{layoutEffects[2]}</i></span>
              )}
            </span>
          </section>
        ) : (
        /* the look, live: the app's own top bar and its front page */
        <section className={css.preview} style={{ background: `radial-gradient(120% 120% at 20% 0%, ${brandDeep(draft)}, #07080c 70%)` }} aria-label="Live preview">
          <div className={cx(css.lockup, css[`lockup${draft.lockupId}`])}>
            {draft.lockupId !== 'WORDMARK' && <span className={css.pmark} style={{ color: c }}><Mark brand={draft} /></span>}
            <b style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing, textTransform: tf.transform }}>{brand.name || 'UNNAMED'}</b>
          </div>
          {/* #120: the app itself in the new look: its top bar and its front page, drawn as the app draws them */}
          <span className={css.phone}><span className={css.pscreen}><StreamingViewerHomePreview layoutId={frontPage.currentId || layout} brand={draft} /></span></span>
        </section>
        )}

        <div className={css.tabs} role="tablist" aria-label="Brand studio">
          {([['LOOK', 'Look'], ['IDENT', 'Ident'], ['FRONT', 'Front page']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={cx(css.tab, tab === id && css.tabOn)}
              onClick={() => { setTab(id); setFeedback(null); }}>{label}</button>
          ))}
        </div>
        </div>

        {tab === 'LOOK' && (
          <div className={css.pane}>
            <p className={css.label}>THE LOGO</p>
            <div className={css.marks}>
              {LETTERFORMS.map(shape => {
                const id = `LETTER_${shape}`;
                return (
                  <button key={id} type="button" aria-pressed={draft.markId === id && !draft.customMark} aria-label={`Letter mark ${shape.toLowerCase()}`}
                    className={cx(css.mark, draft.markId === id && !draft.customMark && css.on)} onClick={() => set({ markId: id, customMark: null })}>
                    <svg viewBox="0 0 48 48" style={{ color: c }}>{letterMark((brand.name.trim()[0] || 'E').toUpperCase(), shape)}</svg>
                  </button>
                );
              })}
              {Object.entries(MARKS).map(([id, mark]) => (
                <button key={id} type="button" aria-pressed={draft.markId === id && !draft.customMark} aria-label={`Mark ${id.toLowerCase()}`}
                  className={cx(css.mark, draft.markId === id && !draft.customMark && css.on)} onClick={() => set({ markId: id, customMark: null })}>
                  <svg viewBox="0 0 48 48" style={{ color: c }}>{mark.svg}</svg>
                </button>
              ))}
            </div>
            <button type="button" className={cx(css.upload, draft.customMark && css.on)} disabled={upload === 'busy'} onClick={() => fileRef.current?.click()}>
              {draft.customMark ? <img src={draft.customMark} alt="" /> : <i>+</i>}
              <span>{upload === 'busy' ? 'Optimizing logo…' : upload === 'error' ? 'That logo could not be used. Try another' : draft.customMark ? 'Your own logo · tap to replace' : 'Upload your own logo'}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={onUpload} />

            <p className={css.label}>THE COLOURS</p>
            <div className={css.swatches}>
              {[[352, 82], [268, 74], [190, 78], [26, 88], [150, 62], [214, 80], [45, 90], [0, 0]].map(([h, sat]) => (
                <button key={`${h}-${sat}`} type="button" aria-label={`Colour ${h}`} aria-pressed={draft.hue === h && draft.sat === sat}
                  className={cx(css.swatch, draft.hue === h && draft.sat === sat && css.on)} style={{ background: `hsl(${h} ${sat}% 58%)` }}
                  onClick={() => set({ hue: h, sat })} />
              ))}
            </div>
            <label className={css.slider}><span>HUE</span>
              <input type="range" min={0} max={359} value={draft.hue} onChange={event => set({ hue: Number(event.target.value) })} />
            </label>
            <label className={css.slider}><span>ACCENT</span>
              <input type="range" min={0} max={359} value={draft.accentHue} onChange={event => set({ accentHue: Number(event.target.value) })} />
            </label>

            <p className={css.label}>THE TYPEFACE</p>
            <div className={css.types}>
              {Object.entries(TYPEFACES).map(([id, face]) => (
                <button key={id} type="button" aria-pressed={draft.typeId === id} className={cx(css.type, draft.typeId === id && css.on)} onClick={() => set({ typeId: id })}>
                  <b style={{ fontFamily: face.stack, fontWeight: face.weight, letterSpacing: face.spacing, textTransform: face.transform }}>{brand.name || 'UNNAMED'}</b>
                  <small>{face.label}</small>
                </button>
              ))}
            </div>

            <p className={css.label}>THE LOCKUP</p>
            <div className={css.lockups}>
              {PLAYER_LOCKUP_IDS.map(id => (
                <button key={id} type="button" aria-pressed={draft.lockupId === id} className={cx(css.lockupPick, draft.lockupId === id && css.on)} onClick={() => set({ lockupId: id })}>
                  <b>{LOCKUPS[id].label}</b><small>{LOCKUPS[id].note}</small>
                </button>
              ))}
            </div>
            <p className={css.note}>The name stays: it is the company's. A new look rolls out across the apps, the stores and the marketing.</p>
          </div>
        )}

        {tab === 'IDENT' && (
          <div className={css.pane}>
            {/* #119: a sound is what it sounds like (its feel) and its shape (its wave); a tap plays it on the stage */}
            <p className={css.label}>THE SOUND <span>· heard as the app opens · tap to listen</span></p>
            <div className={css.sounds}>
              {STREAMING_IDENT_SOUNDS.map(item => (
                <button key={item.key} type="button" aria-pressed={sound === item.key} aria-label={`${item.name}: ${item.feel}. Tap to listen`}
                  className={cx(css.sound, sound === item.key && css.on, playing === item.key && css.playing)} onClick={() => pickSound(item.key)}>
                  <span className={css.swave} aria-hidden="true">
                    {streamingIdentWaveBars(item.wave, 9).map((height, n) => (
                      <i key={n} style={{ height: `${Math.max(14, Math.round(height * 100))}%`, ['--n' as string]: n } as React.CSSProperties} />
                    ))}
                  </span>
                  <b>{item.name}</b>
                  <small>{item.feel}</small>
                  {ident.soundIdentKey === item.key && <i className={css.inuse}>IN USE</i>}
                </button>
              ))}
            </div>

            {/* #119: each kit as its own still, what it is, its price and length; a tap plays it on the stage */}
            <p className={css.label}>THE KIT <span>· how it looks, and where</span></p>
            <div className={css.kits}>
              {KITS.map(item => {
                const lock = identLocks[item.id];
                return (
                  <button key={item.id} type="button" aria-pressed={kit === item.id}
                    aria-label={`${item.name}, ${money(getStreamingIdentChangeCost(item.id))}, ${item.seconds} seconds${lock ? `, locked: unlock ${lock.tech} in Tech` : ''}. Tap to preview`}
                    className={cx(css.kit, kit === item.id && css.on, lock && css.kitLocked)} onClick={() => pickKit(item.id)}>
                    <span className={css.kthumb}>
                      <StreamingIdentPlayer still brand={draft} kit={item.id} sound={sound.toLowerCase()} seconds={item.seconds} next={sampleNext(draft.hue)} />
                      {lock && <i className={css.klock} aria-hidden="true"><LockGlyph /><small>Unlock in Tech<br />{lock.tech}</small></i>}
                    </span>
                    <b>{item.name}</b>
                    <small>{item.line}</small>
                    <span className={css.kmeta}><em>{money(getStreamingIdentChangeCost(item.id))}</em><span>{item.seconds} s</span></span>
                    {ident.packageId === item.id && <i className={css.inuse}>IN USE</i>}
                  </button>
                );
              })}
            </div>

            {/* #119: what the kit makes, as the frames viewers will see */}
            <div className={css.get}>
              <p className={css.label}>WHAT YOU GET · {kitDef.name.toUpperCase()}</p>
              <p className={css.note}>{kitDef.what}</p>
              <div className={css.surfaces}>
                {/* Just the ident makes the opening alone: the other five places show what the bigger kits add */}
                {STREAMING_IDENT_SURFACES.map(item => (kit === 'STANDARD' && item.id !== 'IDENT' ? (
                  <span key={item.id} className={cx(css.surface, css.surfaceOff)}>
                    <span className={css.sframe}><em>Not in this kit</em></span>
                    <small>{item.name}</small>
                  </span>
                ) : (
                  <span key={item.id} className={css.surface}>
                    <span className={css.sframe}>
                      <StreamingIdentPlayer still brand={draft} kit={kit} sound={sound.toLowerCase()} seconds={kitDef.seconds} surface={item.id} next={sampleNext(draft.hue)} />
                    </span>
                    <small>{item.name}</small>
                  </span>
                )))}
              </div>
            </div>
            <p className={css.note}>{view.live ? 'A new ident is a new production: its kit\'s price ($500K to shoot the included one again).' : 'Before launch the ident is chosen in Define the Launch and paid at launch.'}</p>
          </div>
        )}

        {tab === 'FRONT' && (() => {
          /* #120 (Zeesh: "प्रोमिनेंट पता ही नहीं चल रहा है कि रिसर्च ओनली कौन सा है, कौन सा अनलॉक है"): the ready front
             pages first, the one in use marked, then the locked ones dimmed under a padlock with the Tech step that
             opens them; every tile is the app's own home in miniature */
          const ready = frontPage.layouts.filter(item => !item.locked);
          const locked = frontPage.layouts.filter(item => item.locked);
          const tile = (item: typeof frontPage.layouts[number], index: number) => {
            const inUse = item.id === frontPage.currentId;
            return (
              <button key={item.id} type="button" aria-pressed={layout === item.id}
                aria-label={`${item.name}${inUse ? ', in use' : item.locked ? `, locked: unlock ${item.locked} in Tech` : ', ready'}. Tap to preview`}
                className={cx(css.front, layout === item.id && css.on, item.locked && css.frontLocked)} onClick={() => { setLayout(item.id); setFeedback(null); }}>
                <span className={css.fthumb} data-front-thumb={index === 0 ? '' : undefined}>
                  {tilesReady && <span className={css.fthumbIn}><StreamingViewerHomePreview layoutId={item.id} brand={draft} /></span>}
                  {item.locked && <i className={css.flock} aria-hidden="true"><LockGlyph /></i>}
                  {inUse && <i className={css.fuse}>✓ In use</i>}
                </span>
                <b>{item.name}</b>
                <small>{item.locked ? item.locked : inUse ? 'Your front page' : 'Ready'}</small>
              </button>
            );
          };
          return (
            <div className={css.pane}>
              <p className={css.label}>READY TO USE · {ready.length} <span>· free to switch, the app changes at once</span></p>
              <div className={css.fronts} ref={frontsRef} style={{ ['--pz' as string]: tileScale } as React.CSSProperties}>
                {[...ready].sort((left, right) => Number(right.id === frontPage.currentId) - Number(left.id === frontPage.currentId)).map(tile)}
              </div>
              {locked.length > 0 && (
                <>
                  <p className={cx(css.label, css.lockedLabel)}><LockGlyph />UNLOCK IN TECH · {locked.length} <span>· tap to preview</span></p>
                  <div className={css.fronts} style={{ ['--pz' as string]: tileScale } as React.CSSProperties}>{locked.map((item, index) => tile(item, ready.length + index))}</div>
                </>
              )}
            </div>
          );
        })()}
        <div className={css.tail} />
      </div>

      <footer className={css.bar}>
        <span className={css.barWhat}>
          <small>{bar.what}</small>
          <em>{feedback ? feedback.message : bar.line}</em>
        </span>
        {bar.action && (
          <button type="button" className={css.apply} disabled={bar.action.disabled} onClick={bar.action.go}>{bar.action.label}</button>
        )}
      </footer>
    </div>
  );
};

export default StreamingBrandStudio;
