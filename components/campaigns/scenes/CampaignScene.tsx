/**
 * One campaign scene (#144): the photo-real backdrop covering its box, the creative placed in it, and the launch
 * moment when `play` changes.
 *  - QUAD (a billboard): the creative mapped onto the board's four corners in perspective (CSS matrix3d), lit by the
 *    lamps below it; at launch the lamps flicker on, the creative goes up panel by panel, and a light sweeps across.
 *  - LED_FACADE (the Burj Khalifa): the creative drawn as the facade's LED dots; at launch the camera pushes in, the
 *    dots switch on from the base up, the tower glows into the sky, and the light reaches the water.
 * #156 (plan §20.13: every format's scene, live in the builder's How):
 *  - QUAD scenes may have several faces (six posters, five flyers, two airport screens), each with the same creative,
 *    printed (lit from below, above, by day or at dusk) or a screen (it switches on at launch). The creative is fitted
 *    to each face's own shape (sceneArt.ts).
 *  - RING (the London Eye): the rim lit round in the creative's colours; DRONES: a fleet writes the name in the sky
 *    and, at launch, rises from the water into place. LED facades keep their dots off the sky (`skyMask`).
 *  - `compact` (the format cards): the half-size backdrop, smaller face art, no glow layer; `idle` adds light motion
 *    (a slow drift, a screen's sheen, lights twinkling), held still while `paused` (off screen).
 * Everything inside is placed in the backdrop's own pixels, so it lines up at any size. Animations use Motion's
 * `animate` (already in the game, so no new package); with reduced motion the scene shows its end state.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import css from './CampaignScenes.module.css';
import { coverFrame, quadMatrix3d } from './sceneGeometry';
import { drawLedFacade, drawLedReflection, drawLedRing, drawReflection } from './ledFacade';
import { drawDrones, droneFleet, type Drone } from './droneShow';
import { backdropPixels, faceArtUrl, faceShape } from './sceneArt';
import type { CampaignScene as SceneDefinition } from './sceneCatalogue';

type Creative = HTMLCanvasElement | HTMLImageElement;

/* the board's element, before the matrix maps it onto the photo's quad */
const BOARD_W = 600;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/* a print's light: the #144 billboard's lamps below, or (#156) lamps above, the day, dusk */
const LIGHT_CLASS: Record<string, string> = { BELOW: css.boardLight, ABOVE: css.lightAbove, DAY: css.lightDay, DUSK: css.lightDusk };

export const CampaignScene: React.FC<{
  scene: SceneDefinition;
  creative: Creative | null;
  /** changes to run the launch moment again; 0 shows the scene at rest, the creative already up */
  play: number;
  className?: string;
  /** #156: the format cards: the half-size backdrop, smaller art, no glow layer */
  compact?: boolean;
  /** #156: light motion while it is on screen */
  idle?: boolean;
  /** #156: hold the motion still (off screen) */
  paused?: boolean;
  /** #156: what a drone show writes, and in which hue */
  label?: string;
  hue?: number;
}> = ({ scene, creative, play, className, compact = false, idle = false, paused = false, label = '', hue = 214 }) => {
  const box = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const arts = useRef<Array<HTMLDivElement | null>>([]);
  const lamps = useRef<HTMLElement>(null);
  const sweep = useRef<HTMLElement>(null);
  /* #159: the photo's light over a shaded print */
  const shades = useRef<Array<HTMLImageElement | null>>([]);
  const led = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);
  const reflection = useRef<HTMLCanvasElement>(null);
  const sky = useRef<HTMLElement>(null);
  const fleet = useRef<Drone[]>([]);
  const [frame, setFrame] = useState({ scale: 1, x: 0, y: 0 });
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [lit, setLit] = useState(0);

  /* 2026-11-11: a scene leaving the page gives its canvases' memory back at once (iOS keeps a detached
     canvas's pixels until it is collected, and a page of light shows ran out of memory) */
  useLayoutEffect(() => {
    /* captured while mounted: by a passive cleanup React has already let go of the refs */
    const canvases = [led.current, glow.current, reflection.current];
    return () => canvases.forEach(canvas => {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    });
  }, []);

  /* cover the box, keeping the scene's focus in view */
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    const measure = () => setFrame(coverFrame({ width: element.clientWidth, height: element.clientHeight }, scene, scene.focus));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scene]);

  /* the creative into the scene: a picture for the faces, dots for a facade or a wheel, a fleet for a drone show */
  useEffect(() => {
    let alive = true;
    const glowFrom = (source: HTMLCanvasElement) => {
      if (!glow.current) return;
      glow.current.width = scene.width;
      glow.current.height = scene.height;
      glow.current.getContext('2d')!.drawImage(source, 0, 0);
    };
    /* a format card draws no light show (see the canvases below): nothing to read or draw */
    if (compact && scene.kind !== 'QUAD') return undefined;
    if (scene.kind === 'DRONES') {
      if (!led.current || !reflection.current) return undefined;
      fleet.current = droneFleet(scene, label, hue);
      drawDrones(led.current, scene, fleet.current, 1);
      glowFrom(led.current);
      drawReflection(reflection.current, scene, led.current, scene.sky[3]);
      setLit(count => count + 1);
      return undefined;
    }
    if (!creative) { setArtUrl(null); return undefined; }
    if (scene.kind === 'QUAD') {
      faceArtUrl(scene, creative, compact ? 600 : 1200).then(url => { if (alive) setArtUrl(url); }).catch(() => undefined);
      return () => { alive = false; };
    }
    const draw = (mask: ImageData | null) => {
      if (!alive || !led.current || !reflection.current) return;
      if (scene.kind === 'RING') drawLedRing(led.current, scene, creative, compact);
      else drawLedFacade(led.current, scene, creative, mask);
      glowFrom(led.current);
      drawLedReflection(reflection.current, scene, led.current);
      setLit(count => count + 1);
    };
    if (scene.kind === 'LED_FACADE' && scene.skyMask) backdropPixels(scene, scene.thumb).then(draw).catch(() => draw(null));
    else draw(null);
    return () => { alive = false; };
  }, [creative, scene, compact, label, hue]);

  /* the launch moment */
  useEffect(() => {
    const rest = play === 0 || reducedMotion();
    const controls: Array<{ stop: () => void }> = [];
    const run = (...args: Parameters<typeof animate>) => { const control = animate(...args); controls.push(control); return control; };
    if (camera.current) {
      camera.current.style.transformOrigin = `${scene.focus[0]}px ${scene.focus[1]}px`;
      /* #159: along the face, from its first point to its second, as far as the screen leaves room */
      const element = box.current;
      const pan = !rest && !compact && scene.kind === 'QUAD' && scene.pan && element ? (() => {
        const size = { width: element.clientWidth, height: element.clientHeight };
        const at = coverFrame(size, scene, scene.focus);
        const [from, to] = scene.pan!.map(point => coverFrame(size, scene, point));
        return { from: [(from.x - at.x) / at.scale, (from.y - at.y) / at.scale], to: [(to.x - at.x) / at.scale, (to.y - at.y) / at.scale] };
      })() : null;
      if (rest) camera.current.style.transform = 'scale(1)';
      else if (pan && (pan.from[0] !== pan.to[0] || pan.from[1] !== pan.to[1])) {
        const shot = (point: number[], zoom: number) => `translate(${point[0].toFixed(1)}px, ${point[1].toFixed(1)}px) scale(${zoom})`;
        camera.current.style.transform = shot(pan.from, 1);
        run(camera.current, { transform: [shot(pan.from, 1), shot(pan.from, 1), shot(pan.to, 1.04)] }, { duration: 7.2, times: [0, 0.22, 1], ease: [0.42, 0, 0.3, 1] });
      } else run(camera.current, { transform: ['scale(1)', `scale(${scene.kind === 'QUAD' ? 1.08 : 1.06})`] }, { duration: 3.6, ease: [0.2, 0.6, 0.3, 1] });
    }
    if (scene.kind === 'QUAD') {
      const faces = arts.current.filter((face): face is HTMLDivElement => Boolean(face));
      if (!faces.length) return undefined;
      const shaded = shades.current.filter((shade): shade is HTMLImageElement => Boolean(shade));
      if (rest) {
        faces.forEach(face => { face.style.clipPath = 'inset(0 0 0 0)'; face.style.opacity = '1'; });
        shaded.forEach(shade => { shade.style.opacity = ''; });
        if (lamps.current) lamps.current.style.opacity = '0';
        if (sweep.current) sweep.current.style.opacity = '0';
      } else if (scene.surface === 'SCREEN') {
        /* the screens switch on: dark, a flicker, the picture */
        faces.forEach((face, index) => {
          face.style.clipPath = 'inset(0 0 0 0)';
          face.style.opacity = '0';
          run(face, { opacity: [0, 0.9, 0.2, 1] }, { duration: 0.7, delay: 0.8 + index * 0.25, ease: 'easeOut' });
        });
        if (sweep.current) run(sweep.current, { transform: ['translateX(-140%) skewX(-18deg)', 'translateX(260%) skewX(-18deg)'], opacity: [0, 1, 1, 0] }, { duration: 1.1, delay: 1.9, ease: 'easeInOut' });
      } else {
        faces.forEach(face => { face.style.opacity = '1'; face.style.clipPath = 'inset(0 100% 0 0)'; });
        /* the lamps flicker on: the board goes from dark to lit */
        if (lamps.current) {
          lamps.current.style.opacity = '0.78';
          run(lamps.current, { opacity: [0.78, 0.15, 0.62, 0, 0.32, 0] }, { duration: 0.8, delay: 0.3 });
        }
        /* each face goes up in four panels, as paper boards are pasted, one after another */
        faces.forEach((face, index) => run(face, { clipPath: ['inset(0 100% 0 0)', 'inset(0 75% 0 0)', 'inset(0 50% 0 0)', 'inset(0 25% 0 0)', 'inset(0 0% 0 0)'] },
          { duration: faces.length > 1 ? 0.6 : 1.3, delay: 1 + index * 0.22, ease: 'easeInOut' }));
        /* #159: the body's light settles on the wrap as it goes up */
        shaded.forEach(shade => {
          const full = getComputedStyle(shade).getPropertyValue('--shade').trim() || '1';
          shade.style.opacity = '0';
          run(shade, { opacity: [0, Number(full)] }, { duration: 1.4, delay: 1, ease: 'easeInOut' });
        });
        if (sweep.current) run(sweep.current, { transform: ['translateX(-140%) skewX(-18deg)', 'translateX(260%) skewX(-18deg)'], opacity: [0, 1, 1, 0] },
          { duration: 1.1, delay: 1.4 + faces.length * 0.22, ease: 'easeInOut' });
      }
      return () => controls.forEach(control => control.stop());
    }
    if (!led.current || !reflection.current) return undefined;
    const ledLayer = led.current;
    const water = reflection.current;
    const glowLayer = glow.current;
    if (scene.kind === 'DRONES') {
      water.style.opacity = '1';
      if (rest || !fleet.current.length) {
        drawDrones(ledLayer, scene, fleet.current, 1);
        if (glowLayer) glowLayer.style.opacity = '0.8';
        return undefined;
      }
      /* the fleet rises from the water and flies into place */
      let raf = 0;
      const started = performance.now() + 700;
      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - started) / 2600));
        drawDrones(ledLayer, scene, fleet.current, progress);
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      if (glowLayer) { glowLayer.style.opacity = '0'; run(glowLayer, { opacity: [0, 0.8] }, { duration: 1.4, delay: 2.6 }); }
      water.style.opacity = '0';
      run(water, { opacity: [0, 1] }, { duration: 1.2, delay: 2.8 });
      return () => { cancelAnimationFrame(raf); controls.forEach(control => control.stop()); };
    }
    if (scene.kind === 'RING') {
      if (rest) {
        ledLayer.style.opacity = '1';
        if (glowLayer) glowLayer.style.opacity = '0.8';
        water.style.opacity = '1';
      } else {
        /* the rim lights flicker on all round, then the river catches them */
        ledLayer.style.opacity = '0';
        water.style.opacity = '0';
        run(ledLayer, { opacity: [0, 1, 0.35, 1] }, { duration: 1.2, delay: 0.9 });
        if (glowLayer) { glowLayer.style.opacity = '0'; run(glowLayer, { opacity: [0, 0.8] }, { duration: 1.6, delay: 1.4 }); }
        run(water, { opacity: [0, 1] }, { duration: 1.2, delay: 2.2 });
      }
      return () => controls.forEach(control => control.stop());
    }
    const layers = glowLayer ? [ledLayer, glowLayer] : [ledLayer];
    if (rest) {
      layers.forEach(layer => { layer.style.clipPath = 'inset(0 0 0 0)'; });
      if (glowLayer) glowLayer.style.opacity = '0.85';
      water.style.opacity = '1';
      if (sky.current) sky.current.style.opacity = '0.75';
    } else {
      layers.forEach(layer => { layer.style.clipPath = 'inset(100% 0 0 0)'; });
      if (glowLayer) glowLayer.style.opacity = '0';
      water.style.opacity = '0';
      if (sky.current) sky.current.style.opacity = '0';
      /* the dots switch on from the base up, the glow follows, then the sky and the water catch the light */
      layers.forEach(layer => run(layer, { clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'] }, { duration: 1.8, delay: 0.9, ease: [0.45, 0, 0.2, 1] }));
      if (glowLayer) run(glowLayer, { opacity: [0, 1, 0.85] }, { duration: 2.2, delay: 1.1 });
      if (sky.current) run(sky.current, { opacity: [0, 0.75] }, { duration: 1.6, delay: 1.9 });
      run(water, { opacity: [0, 1] }, { duration: 1.2, delay: 2.4 });
    }
    return () => controls.forEach(control => control.stop());
  }, [play, scene, artUrl, lit]);

  const stage: React.CSSProperties = {
    width: scene.width,
    height: scene.height,
    transform: `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`,
  };
  const tint = scene.kind === 'LED_FACADE' ? { left: scene.profile[0][1] - 260, top: scene.profile[0][0] - 220, width: 620, height: 1100 }
    : scene.kind === 'RING' ? { left: scene.center[0] - scene.outer * 1.5, top: scene.center[1] - scene.outer * 1.5, width: scene.outer * 3, height: scene.outer * 3 } : undefined;

  const faces = scene.kind === 'QUAD' ? [scene.quad, ...(scene.quads || [])] : [];
  const boardH = scene.kind === 'QUAD' ? BOARD_W / faceShape(scene) : 0;
  const screen = scene.kind === 'QUAD' && scene.surface === 'SCREEN';
  /* #159: a shaded print takes the photo's own light instead of a drawn one */
  const shading = scene.kind === 'QUAD' && Boolean(scene.shading);
  const light = scene.kind === 'QUAD' && !screen && !shading ? LIGHT_CLASS[scene.light ?? 'BELOW'] : null;
  const polygon = (quad: Array<[number, number]>) => `polygon(${quad.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;
  const margin = scene.kind === 'QUAD' ? scene.margin ?? 0 : 0;

  return (
    <div className={cx(css.scene, idle && css.idle, idle && paused && css.held, className)} ref={box}>
      <div className={css.stage} style={stage}>
        <div className={css.camera} ref={camera}>
          <div className={css.drift} style={{ transformOrigin: `${scene.focus[0]}px ${scene.focus[1]}px` }}>
            <img className={css.backdrop} src={compact ? scene.thumb : scene.backdrop} alt="" draggable={false} decoding="async" />
            {scene.kind === 'QUAD' && faces.map((quad, index) => (
              <div key={index} className={cx(css.board, screen && css.screenBoard)}
                style={{ width: BOARD_W, height: boardH, transform: quadMatrix3d(BOARD_W, boardH, quad), borderRadius: scene.radius ?? 0 }}>
                <div className={cx(css.boardArt, margin > 0 && css.paper)} ref={element => { arts.current[index] = element; }}
                  style={{
                    ...(artUrl ? { backgroundImage: `url(${artUrl})` } : {}),
                    /* a paper border: the photo's own sheet shows round the print */
                    ...(margin > 0 ? { padding: `${margin * boardH}px ${margin * BOARD_W}px` } : {}),
                  }} />
                {/* a print takes its light from the lamps or the sky; a screen has its own gloss */}
                {light && <i className={light} />}
                {screen && <i className={css.screenSheen} />}
                {(scene.seams || []).map(at => <i key={at} className={css.seam} style={{ left: `${at * 100}%` }} />)}
                {index === 0 && <i className={css.boardShade} ref={lamps} />}
                {index === 0 && <i className={css.boardSweep} ref={sweep} />}
              </div>
            ))}
            {/* #159: the photo itself over the wrap, cut to the face: its shadows and joins darken the print, its
                highlights shine on it */}
            {shading && faces.flatMap((quad, index) => [
              <img key={`shade${index}`} className={css.faceShade} src={compact ? scene.thumb : scene.backdrop} alt="" draggable={false} decoding="async"
                style={{ clipPath: polygon(quad) }} ref={element => { shades.current[index * 2] = element; }} />,
              <img key={`gloss${index}`} className={css.faceGloss} src={compact ? scene.thumb : scene.backdrop} alt="" draggable={false} decoding="async"
                style={{ clipPath: polygon(quad) }} ref={element => { shades.current[index * 2 + 1] = element; }} />,
            ])}
            {scene.kind !== 'QUAD' && (
              <>
                {scene.kind !== 'DRONES' && <i className={css.skyGlow} ref={sky} style={tint} />}
                {/* 2026-11-12 (player reports: the campaign list crashes and reloads while scrolling, "as many
                    times you do"): a format card (compact) no longer draws the light show. Each of these
                    canvases is scene-sized (up to 1024×1536, ~6 MB), a card held two, and a screen of
                    landmark cards passed iOS's canvas memory limit. The card shows the landmark; the full
                    preview still lights it. */}
                {!compact && <canvas className={css.ledReflection} ref={reflection} />}
                {!compact && <canvas className={css.ledGlow} ref={glow} />}
                {!compact && <canvas className={cx(css.led, scene.kind === 'DRONES' && css.drones)} ref={led} />}
              </>
            )}
          </div>
        </div>
      </div>
      <i className={css.vignette} />
    </div>
  );
};
