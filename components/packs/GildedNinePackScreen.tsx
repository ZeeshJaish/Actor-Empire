import React, { useEffect, useRef } from 'react';
import { useMergedState } from './useMergedState';
import { usePackSounds, type PackMusic, type PackSoundFiles } from './packAudio';
import PackSoundToggle from './PackSoundToggle';
import '../../styles/packs/pack-nine.css';

const PK_NINE_FEATS = [
  ['Trade what you love for fame', '82%', '98%'],
  ['Decide who wins the awards', '66%', '94%'],
  ['Move a market with one call', '86%', '100%'],
  ['Bury a story before it runs', '78%', '100%'],
  ['Own the regulators quietly', '84%', '100%'],
  ['Read the clause, or sign blind', '90%', '95%'],
  ['Topple one of the Nine', '70%', '98%'],
  ['Pass your seat to your heir', '80%', '100%'],
];
// How far apart the lids are after each turn. The last turn does the most.
const PK_NINE_OPEN = [0, .09, .18, .28, .38, .48, .58, .7, 1];
// Bottom of the lowest slot, and the seat of the empty chair, as fractions of the eye's box.
const PK_NINE_SLOT_Y = 228.4 / 240;
const PK_NINE_SEAT = [237.6 / 240, 53 / 240];
const PK_NINE_STUDS = [[7.7, 97.7], [24.8, 56.4], [56.4, 24.8], [97.66, 7.7], [142.34, 7.7], [183.6, 24.8], [215.2, 56.4], [232.3, 97.7]];

// Read-only: where the eye, the plate and the empty chair are on this phone, for the two sparks.
const where = (el: Element) => {
  const root = el.closest('.pk-nine-root')!;
  const page = root.querySelector('.pk-nine-page')!.getBoundingClientRect();
  const eye = root.querySelector('.pk-nine-eye')!.getBoundingClientRect();
  const plate = root.querySelector('[data-cta]')!.getBoundingClientRect();
  return {
    slotX: eye.left + eye.width / 2 - page.left,
    slotY: eye.top + eye.height * PK_NINE_SLOT_Y - page.top,
    plateX: plate.left + plate.width / 2 - page.left,
    plateY: plate.top - page.top,
    seatX: eye.left + eye.width * PK_NINE_SEAT[0] - page.left,
    seatY: eye.top + eye.height * PK_NINE_SEAT[1] - page.top,
  };
};
const buzz = (pattern: number | number[]) => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} };

/* rendered by scripts/audio/render-pack-sounds.mjs from scripts/audio/packs/nine.mjs. final.m4a follows the eye's clock: the mechanism at 74 ms, the slots from 920 ms, the spark's fall, the plate at 1340 ms */
const NINE_SOUNDS: PackSoundFiles = {
  tap: () => new URL('../../assets/audio/packs/nine/tap.m4a', import.meta.url).href,
  final: () => new URL('../../assets/audio/packs/nine/final.m4a', import.meta.url).href,
  notify: () => new URL('../../assets/audio/packs/nine/notify.m4a', import.meta.url).href,
  click: () => new URL('../../assets/audio/packs/nine/click.m4a', import.meta.url).href,
};
/* the loop points are printed by the render: one period apart, inside the part of the file that repeats */
const NINE_MUSIC: PackMusic = {
  url: () => new URL('../../assets/audio/packs/nine/music.m4a', import.meta.url).href,
  loopStart: 8.908118,
  loopEnd: 34.508118,
};

interface GildedNinePackScreenProps {
  onBack: () => void;
}

interface GildedNineState {
  step: number;
  tick: number;
  react: number;
  accept: boolean;
  pressed: boolean;
  sent: boolean;
  drop: { x: number; y: number; d: number } | null;
  climb: { x: number; y: number; dx: number; dy: number } | null;
}

export default function GildedNinePackScreen({ onBack }: GildedNinePackScreenProps) {
  const [state, set, latest] = useMergedState<GildedNineState>({ step: 0, tick: 0, react: 0, accept: false, pressed: false, sent: false, drop: null, climb: null });
  const sendTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const acceptTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const blinkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restoreTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { play, soundOn, toggleSound, duckMusic, restoreMusic } = usePackSounds(NINE_SOUNDS, NINE_MUSIC);
  useEffect(() => () => { [sendTimer, acceptTimer, blinkTimer, scrollTimer, restoreTimer].forEach(timer => clearTimeout(timer.current)); }, []);

  const turn = (e: React.MouseEvent<HTMLElement>) => {
    const s = latest.current;
    if (s.step >= 8) {
      buzz(10);
      play('click');
      set({ tick: s.tick + 1, react: s.react + 1 });
      return;
    }
    buzz(s.step === 7 ? [14, 60, 30] : 12);
    /* each turn lands its knock with the ring, at 478 ms; the eighth opens the eye, and the theme steps back for it */
    if (s.step === 7) { play('final'); duckMusic(); clearTimeout(restoreTimer.current); restoreTimer.current = setTimeout(restoreMusic, 2200); }
    else play('tap', { rate: 1 + (s.step + 1) * .016 });
    // The eye stares until 1050 ms and glances down by 1350 ms. The slots light top to bottom from 920 ms,
    // one spark leaves the lowest at 1060 ms and lands on the plate at 1340 ms, then the plate answers.
    const up: Partial<GildedNineState> = { step: s.step + 1, tick: s.tick + 1 };
    if (s.step === 7) {
      const w = where(e.currentTarget);
      up.drop = { x: Math.round(w.slotX), y: Math.round(w.slotY), d: Math.round(w.plateY - w.slotY) };
      acceptTimer.current = setTimeout(() => set({ accept: true }), 1350);
      // On short phones the plate is below the fold, so the page brings it up as the spark falls, and stops
      // with the top of the disc at the top of the screen: the whole eye, the slab and the plate on one screen. Tall phones never move.
      if (matchMedia('(max-height:739px)').matches) {
        const root = e.currentTarget.closest('.pk-nine-root')!;
        const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
        scrollTimer.current = setTimeout(() => {
          const top = root.querySelector('.pk-nine-herobox')!.getBoundingClientRect().top + root.scrollTop;
          root.scrollTo({ top: Math.round(top), behavior: calm ? 'auto' : 'smooth' });
        }, 1000);
      }
    }
    set(up);
  };
  const notify = (e: React.MouseEvent<HTMLElement>) => {
    if (latest.current.pressed) return;
    buzz(20);
    play('notify');
    const up: Partial<GildedNineState> = { pressed: true };
    if (latest.current.step >= 8) {
      // One spark goes from the plate to the empty chair and lands at 560 ms. The silhouette and the pulse arrive with it, then the eye blinks.
      const w = where(e.currentTarget);
      up.climb = { x: Math.round(w.plateX), y: Math.round(w.plateY + 10), dx: Math.round(w.seatX - w.plateX), dy: Math.round(w.seatY - w.plateY - 10) };
      blinkTimer.current = setTimeout(() => set({ react: latest.current.react + 1 }), 780);
    }
    set(up);
    sendTimer.current = setTimeout(() => set({ sent: true }), 170);
  };

  const { step, tick, react, accept, pressed, sent, drop, climb } = state;
  const count = (list: number[]) => list.filter(n => n <= step).length;
  const open = PK_NINE_OPEN[step];
  const lit = step >= 8;
  const next = lit ? '' : ['a', 'b', 'c'][step % 3];
  const v = {
    rootClass: (lit ? 'pk-nine-is-lit ' : '') + (step === 0 ? 'pk-nine-is-idle ' : '') + (react ? 'pk-nine-is-settled ' : '') + (climb ? 'pk-nine-is-climb ' : '') + (sent ? 'pk-nine-is-done' : ''),
    hitClass: tick ? 'pk-nine-hit-' + (tick % 2) : '',
    reactClass: react ? 'pk-nine-react-' + (react % 2) : '',
    eyeLabel: lit ? 'The eye is open' : 'Turn the rings, ' + step + ' of 8 turned',
    ringA: -135 + 45 * count([1, 4, 7]),
    ringB: 135 - 45 * count([2, 5, 8]),
    ringC: -90 + 45 * count([3, 6]),
    nextA: next === 'a' ? 'pk-nine-is-next' : '',
    nextB: next === 'b' ? 'pk-nine-is-next' : '',
    nextC: next === 'c' ? 'pk-nine-is-next' : '',
    lidU: 'translateY(' + ((1 - open) * 40.15).toFixed(2) + '%)',
    lidL: 'translateY(' + (-(1 - open) * 3.8).toFixed(2) + '%)',
    irisT: lit ? 'translateY(9%) scaleY(.96)' : 'translateY(' + (-33.4 + step * .7).toFixed(2) + '%) scaleY(.8)',
    lines: PK_NINE_FEATS.map((f, i) => ({
      text: f[0],
      w: f[1],
      r: f[2],
      hide: (i < step ? 'false' : 'true') as 'false' | 'true',
      cls: i < step ? 'pk-nine-is-on' : '',
    })),
    studs: PK_NINE_STUDS.map((p, i) => ({
      x: (p[0] / 2.4).toFixed(2) + '%',
      y: (p[1] / 2.4).toFixed(2) + '%',
      cls: i < step ? 'pk-nine-is-on' : '',
    })),
    ctaClass: (accept ? 'pk-nine-is-accept ' : '') + (pressed ? 'pk-nine-is-burst ' : '') + (sent ? 'pk-nine-is-sent' : ''),
    labelClass: accept ? 'pk-nine-lab-1' : 'pk-nine-lab-0',
    ctaLabel: sent ? 'The Nine will write to you' : accept ? 'I accept the invitation' : 'Notify me on release',
    dropX: drop ? drop.x + 'px' : '50%',
    dropY: drop ? drop.y + 'px' : '40%',
    dropD: drop ? drop.d + 'px' : '420px',
    climbX: climb ? climb.x + 'px' : '50%',
    climbY: climb ? climb.y + 'px' : '90%',
    climbDX: climb ? climb.dx + 'px' : '120px',
    climbDY: climb ? climb.dy + 'px' : '-480px',
    turn,
    notify,
  };
  return (
    <div className={`pk-nine-root ${v.rootClass}`}>
      <svg className="pk-nine-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="pk-nine-tooth" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".95 .7" numOctaves="2" seed="4" result="n"></feTurbulence>
            <feDiffuseLighting in="n" surfaceScale="1" diffuseConstant="1.14" lightingColor="#ffffff" result="l">
              <feDistantLight azimuth="270" elevation="58"></feDistantLight>
            </feDiffuseLighting>
            <feComposite in="l" in2="SourceAlpha" operator="in" result="t"></feComposite>
            <feBlend in="SourceGraphic" in2="t" mode="multiply"></feBlend>
          </filter>
          <filter id="pk-nine-fine" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.15 .85" numOctaves="2" seed="9" result="n"></feTurbulence>
            <feDiffuseLighting in="n" surfaceScale=".5" diffuseConstant="1.17" lightingColor="#ffffff" result="l">
              <feDistantLight azimuth="270" elevation="58"></feDistantLight>
            </feDiffuseLighting>
            <feComposite in="l" in2="SourceAlpha" operator="in" result="t"></feComposite>
            <feBlend in="SourceGraphic" in2="t" mode="multiply"></feBlend>
          </filter>
          <filter id="pk-nine-patina" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".07 .09" numOctaves="2" seed="8" result="n"></feTurbulence>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .372 0 0 0 0 .498 0 0 0 0 .431 0 0 0 6 -3.3" result="p"></feColorMatrix>
            <feComposite in="p" in2="SourceAlpha" operator="in"></feComposite>
          </filter>
          <filter id="pk-nine-stone" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".25 .4" numOctaves="2" seed="17" result="n"></feTurbulence>
            <feDiffuseLighting in="n" surfaceScale=".62" diffuseConstant="1.16" lightingColor="#ffffff" result="l">
              <feDistantLight azimuth="270" elevation="58"></feDistantLight>
            </feDiffuseLighting>
            <feComposite in="l" in2="SourceAlpha" operator="in" result="t"></feComposite>
            <feBlend in="SourceGraphic" in2="t" mode="multiply" result="b"></feBlend>
            <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="6" result="f"></feTurbulence>
            <feColorMatrix in="f" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 7 -4.6" result="pits"></feColorMatrix>
            <feComposite in="pits" in2="SourceAlpha" operator="in" result="pc"></feComposite>
            <feMerge>
              <feMergeNode in="b"></feMergeNode>
              <feMergeNode in="pc"></feMergeNode>
            </feMerge>
          </filter>
          <filter id="pk-nine-soft3" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3"></feGaussianBlur>
          </filter>
          <filter id="pk-nine-soft2" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="2.2"></feGaussianBlur>
          </filter>
          <filter id="pk-nine-spill" x="-80%" y="-30%" width="260%" height="160%">
            <feGaussianBlur stdDeviation="4"></feGaussianBlur>
          </filter>
          <linearGradient id="pk-nine-bevout" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3f6ee" stopOpacity=".9"></stop>
            <stop offset=".3" stopColor="#f3f6ee" stopOpacity=".26"></stop>
            <stop offset=".56" stopColor="#000" stopOpacity=".12"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".62"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-bevin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".7"></stop>
            <stop offset=".46" stopColor="#000" stopOpacity=".16"></stop>
            <stop offset=".72" stopColor="#f3f6ee" stopOpacity=".08"></stop>
            <stop offset="1" stopColor="#f3f6ee" stopOpacity=".46"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-casttop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".66"></stop>
            <stop offset=".5" stopColor="#000" stopOpacity="0"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-castbot" x1="0" y1="0" x2="0" y2="1">
            <stop offset=".5" stopColor="#000" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".6"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-collarg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7b7f80"></stop>
            <stop offset=".3" stopColor="#4f5354"></stop>
            <stop offset=".68" stopColor="#282b2d"></stop>
            <stop offset="1" stopColor="#161719"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-lidug" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6a7a3"></stop>
            <stop offset=".6" stopColor="#b4b5b0"></stop>
            <stop offset="1" stopColor="#a0a19c"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-lidlg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9a9b96"></stop>
            <stop offset="1" stopColor="#6f706d"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-orbitg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8c8e8c"></stop>
            <stop offset=".42" stopColor="#7f817f"></stop>
            <stop offset=".62" stopColor="#6c6e6d"></stop>
            <stop offset="1" stopColor="#474949"></stop>
          </linearGradient>
          <radialGradient id="pk-nine-ball" cx=".5" cy=".46" r=".52">
            <stop offset="0" stopColor="#cfccc0"></stop>
            <stop offset=".42" stopColor="#b3b1a6"></stop>
            <stop offset=".74" stopColor="#6f6e68"></stop>
            <stop offset="1" stopColor="#262523"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-irisg" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#8d948a"></stop>
            <stop offset=".3" stopColor="#8d948a"></stop>
            <stop offset=".55" stopColor="#d0d2c6"></stop>
            <stop offset=".84" stopColor="#a6aa9e"></stop>
            <stop offset="1" stopColor="#5f6c65"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-pupilg" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#000"></stop>
            <stop offset=".86" stopColor="#040404"></stop>
            <stop offset="1" stopColor="#121311"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-pool" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#c2d4df" stopOpacity=".42"></stop>
            <stop offset=".6" stopColor="#c2d4df" stopOpacity=".3"></stop>
            <stop offset=".84" stopColor="#c2d4df" stopOpacity=".12"></stop>
            <stop offset="1" stopColor="#c2d4df" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-poolhot" cx=".5" cy=".5" r=".5">
            <stop offset=".5" stopColor="#ff6a2b" stopOpacity="0"></stop>
            <stop offset=".82" stopColor="#ff6a2b" stopOpacity=".17"></stop>
            <stop offset="1" stopColor="#ff6a2b" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-cloud" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#000" stopOpacity=".46"></stop>
            <stop offset="1" stopColor="#000" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-cloudl" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#d6e4ec" stopOpacity=".16"></stop>
            <stop offset="1" stopColor="#d6e4ec" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-nine-chairfadeg" gradientUnits="userSpaceOnUse" cx="120" cy="136" r="218">
            <stop offset=".6" stopColor="#fff"></stop>
            <stop offset="1" stopColor="#6e6e6e"></stop>
          </radialGradient>
          <mask id="pk-nine-chairfade" maskUnits="userSpaceOnUse" x="-200" y="-200" width="640" height="640">
            <rect x="-200" y="-200" width="640" height="640" fill="url(#pk-nine-chairfadeg)"></rect>
          </mask>
          <radialGradient id="pk-nine-contact" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#000" stopOpacity=".92"></stop>
            <stop offset=".6" stopColor="#000" stopOpacity=".6"></stop>
            <stop offset="1" stopColor="#000" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-nine-inlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c2a566" stopOpacity=".6"></stop>
            <stop offset="1" stopColor="#8c7a4f" stopOpacity=".16"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-cback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b3134"></stop>
            <stop offset="1" stopColor="#0f1113"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-crear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#191c1f"></stop>
            <stop offset="1" stopColor="#090a0c"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-cempty" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7f898e"></stop>
            <stop offset="1" stopColor="#2f3437"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-slabg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34383b"></stop>
            <stop offset=".24" stopColor="#22262a"></stop>
            <stop offset=".5" stopColor="#141618"></stop>
            <stop offset="1" stopColor="#101214"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-slabtop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#cfdde6" stopOpacity=".14"></stop>
            <stop offset=".5" stopColor="#cfdde6" stopOpacity=".5"></stop>
            <stop offset="1" stopColor="#cfdde6" stopOpacity=".14"></stop>
          </linearGradient>
          <radialGradient id="pk-nine-slabmoon" cx=".5" cy="0" r="1">
            <stop offset="0" stopColor="#dbe8ef" stopOpacity=".15"></stop>
            <stop offset=".55" stopColor="#dbe8ef" stopOpacity=".05"></stop>
            <stop offset="1" stopColor="#dbe8ef" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-nine-breaklit" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d7e2e8"></stop>
            <stop offset="1" stopColor="#6d777c"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-heatcore" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700">
            <stop offset="0" stopColor="#ff8a50" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#ff8a50"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-heathalo" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#ff6a2b"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-inlaydark" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700">
            <stop offset="0" stopColor="#040506" stopOpacity="0"></stop>
            <stop offset=".4" stopColor="#040506"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-inlaybrass" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700">
            <stop offset="0" stopColor="#8c7a4f" stopOpacity="0"></stop>
            <stop offset=".4" stopColor="#8c7a4f"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-warmrimg" gradientUnits="userSpaceOnUse" x1="0" y1="128" x2="0" y2="236">
            <stop offset="0" stopColor="#ff8a50" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#ff8a50" stopOpacity=".85"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-gazefall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b53f0d"></stop>
            <stop offset=".3" stopColor="#ef6423"></stop>
            <stop offset=".5" stopColor="#ffa062"></stop>
            <stop offset=".7" stopColor="#ef6423"></stop>
            <stop offset="1" stopColor="#b53f0d"></stop>
          </linearGradient>
          <linearGradient id="pk-nine-gazelip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a0c02" stopOpacity=".62"></stop>
            <stop offset=".2" stopColor="#2a0c02" stopOpacity="0"></stop>
            <stop offset=".84" stopColor="#2a0c02" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#2a0c02" stopOpacity=".26"></stop>
          </linearGradient>
          <radialGradient id="pk-nine-mirrorg" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#dfe8ec" stopOpacity=".12"></stop>
            <stop offset=".52" stopColor="#dfe8ec" stopOpacity=".06"></stop>
            <stop offset=".56" stopColor="#c2a566" stopOpacity="0"></stop>
            <stop offset=".62" stopColor="#c2a566" stopOpacity=".12"></stop>
            <stop offset=".67" stopColor="#8c7a4f" stopOpacity=".05"></stop>
            <stop offset=".72" stopColor="#c2a566" stopOpacity=".11"></stop>
            <stop offset=".77" stopColor="#8c7a4f" stopOpacity=".05"></stop>
            <stop offset=".83" stopColor="#c2a566" stopOpacity=".11"></stop>
            <stop offset=".89" stopColor="#8c7a4f" stopOpacity=".04"></stop>
            <stop offset=".94" stopColor="#b6bcbc" stopOpacity=".12"></stop>
            <stop offset="1" stopColor="#b6bcbc" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-nine-mirrorfadeg" gradientUnits="userSpaceOnUse" x1="0" y1="238" x2="0" y2="306">
            <stop offset="0" stopColor="#fff"></stop>
            <stop offset="1" stopColor="#000"></stop>
          </linearGradient>
          <mask id="pk-nine-mirrorfade" maskUnits="userSpaceOnUse" x="-100" y="200" width="440" height="140">
            <rect x="-100" y="200" width="440" height="140" fill="url(#pk-nine-mirrorfadeg)"></rect>
          </mask>
          <clipPath id="pk-nine-slabclip">
            <path d="M3 4.6L40 3L92 4.6L150 2.6L213 4.2L270 2.6L311 3.8L318.5 8.2L325 9L330.5 15.6L340.8 20.6L342 86L340.6 126L341 150.6L288 151.8L210 150.8L140 152L64 151L24 151.4L19 147.2L11 146.2L7.5 140.6L2 136L1.4 110L2.6 64L1.6 30Z"></path>
          </clipPath>
          <path id="pk-nine-v0" d="M26 -8Q36.5 23.5 41.8 39.2Q47.1 55 56.3 68.8Q65.5 82.7 72.6 97.8Q79.7 112.8 92.6 123.2Q105.6 133.6 116.4 146.3Q127.2 158.9 136.4 172.7Q145.6 186.6 157.1 198.7Q168.5 210.7 180.7 222.1Q192.8 233.5 207.5 241.5Q222.1 249.5 233.6 261.4Q245.1 273.3 256.6 285.1Q268.2 297 282.8 305.1Q297.4 313.2 310.7 323.2Q324.1 333.2 340 338.3Q355.8 343.4 371.9 347.7L388 352"></path>
          <path id="pk-nine-v0b" d="M192.8 233.5Q203.1 231.6 208.4 231.1Q213.6 230.5 218.6 229.1Q223.7 227.8 228.9 227.3Q234.2 226.8 239.4 225.2Q244.5 223.5 249.2 220.8Q253.9 218.1 257.7 214.2Q261.5 210.3 264.3 205.6L267.1 200.9M127.2 158.9Q133.9 161.5 137.5 161.7Q141.1 161.9 143.4 164.7Q145.6 167.6 148.8 169.3Q152 171 155.2 172.6Q158.4 174.1 161.9 174.1Q165.5 174.1 168.9 173.9Q172.4 173.7 175.8 174.5L179.2 175.3M47.1 55Q55.7 52 60.3 52.4Q64.9 52.8 69.1 54.4Q73.4 56 76.7 59.1Q80 62.2 84.6 62.5Q89.1 62.7 93.3 61Q97.6 59.3 101.2 61.9Q104.9 64.5 109.2 65.8L113.4 67.2"></path>
          <path id="pk-nine-v1" d="M-10 196Q10.9 209.6 19.5 218.6Q28.1 227.6 37.9 235.2Q47.7 242.8 58.5 248.9Q69.3 255 78.8 263.1Q88.3 271.1 92 282Q94 294 84 308Q74 322 64 340Q54 358 44 372Q32 392 22 410Q12 430 4 452L-10 478"></path>
          <path id="pk-nine-v1b" d="M64 340Q56 336 48 338Q40 340 32 334L22 330M44 372Q50 382 49 392Q48 402 52 412L54 424"></path>
          <path id="pk-nine-v2" d="M386 108Q381.6 122.8 379.1 130.1Q376.6 137.3 374 144.6Q371.3 151.9 366.9 158.3Q362.5 164.7 358.3 171.2Q354.1 177.8 349.6 184.1Q345.1 190.5 338.8 195.1Q332.5 199.7 326.4 204.4Q320.2 209.2 316.7 215.9Q313.2 222.6 309.1 229Q305 235.5 302 242.4Q298.9 249.4 297.3 256.9Q295.6 264.3 293.3 271.5Q290.9 278.8 287.2 285.4Q283.5 292 280.7 299.1Q277.9 306.3 272.9 312.1L268 318"></path>
          <path id="pk-nine-v2b" d="M320.2 209.2Q324.1 214.3 324.8 217.4Q325.5 220.5 325.3 223.7Q325.1 226.8 324 229.8Q322.8 232.7 322.1 235.6Q321.3 238.5 321 241.4Q320.6 244.3 319.7 247.2Q318.7 250 318.1 252.9L317.5 255.8M298.9 249.4Q300.7 253.7 302 255.6Q303.3 257.5 303.9 259.8Q304.5 262.1 304.2 264.4Q303.8 266.7 303.4 269Q302.9 271.3 303.6 273.6Q304.2 275.8 305.5 277.8Q306.8 279.7 307.4 281.9L308.1 284.2"></path>
          <path id="pk-nine-v3" d="M-10 566Q18.3 573.1 31.9 578.3Q45.6 583.5 60.2 584.7Q74.8 585.9 88.7 590.7Q102.5 595.4 115.6 602.2Q128.6 608.9 143 612.1Q157.3 615.4 170.6 621.4Q183.8 627.5 196.5 634.7Q209.2 641.9 221.4 649.8Q233.7 657.8 246.4 665Q259 672.3 268.5 683.5Q277.9 694.8 289.6 703.7Q301.3 712.6 311.7 722.7Q322.2 732.8 332.6 742.8Q343.1 752.9 353.9 762.6Q364.6 772.3 375.3 782.2L386 792"></path>
          <path id="pk-nine-v3b" d="M102.5 595.4Q109.7 596 113.3 596Q116.9 596 120.4 595.3Q123.9 594.5 127.6 594.7Q131.2 594.9 134.8 595.5Q138.5 596.1 142.1 596.3Q145.8 596.6 148.9 594.4Q152 592.2 155.8 591.7L159.6 591.2M277.9 694.8Q280.9 700.2 283.5 701.9Q286 703.7 288.4 705.7Q290.7 707.7 291.9 710.5Q293.1 713.4 293.4 716.4Q293.7 719.5 295 722.2Q296.3 725 296.9 727.9Q297.5 730.9 298.8 733.6L300.2 736.3"></path>
          <path id="pk-nine-v4" d="M388 508Q369.5 518 362.4 525.6Q355.2 533.3 345.4 536.7Q335.6 540.1 326 544Q316.4 548 307.4 553Q298.3 558 291.1 565.5Q284 573.1 276 579.5Q267.9 585.9 259 591L250 596"></path>
          <path id="pk-nine-v4b" d="M298.3 558Q298 563.9 297.7 566.8Q297.3 569.7 299.4 571.8Q301.5 573.9 302.7 576.6Q304 579.3 303 582Q302 584.6 300.3 586.9Q298.6 589.2 298.4 592Q298.2 594.8 297.5 597.5L296.9 600.3"></path>
          <path id="pk-nine-eu" d="M30 120H60C84 92 102 84 120 84C138 84 156 92 180 120H210"></path>
          <path id="pk-nine-el" d="M30 120H60C84 134 102 142 120 142C138 142 156 134 180 120H210"></path>
          <clipPath id="pk-nine-clipalm">
            <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120C156 134 138 142 120 142C102 142 84 134 60 120Z"></path>
          </clipPath>
          <path id="pk-nine-mo" d="M77.6 143.1l-3.9 -4.8M77.2 161.8l-1.7 -2M143.2 68.8l3.5 1.7M91.3 171.4l-4.9 -1M151.1 173.6l-5.3 1.7M167.3 152.9l-1.6 2.4M68.9 137.9l-1.9 -5.3M130.8 67.6l3.4 1.2M93.5 73.7l3.1 -3.3M140.1 171.9l-3.5 1.4M72.9 89.7l1.8 -2.1M165.7 140.4l-3 3.2M169.5 101.5l1.2 3M137.6 64.2l2.5 1.3M161.8 138.6l-1.4 2.8M73.2 160.9l-4 -3.1M142.8 153.5l-3.1 2.1M94.1 151.8l-3.7 -3.2M141 174.6l-4.7 1M80.5 93.9l1.1 -3.6M167.6 82.9l1.7 4.4M81.2 89l3.7 -4.3M155.5 164.8l-3.2 2.2M134.1 162l-4.4 .8M70.5 86.5l2.2 -5M84.7 75l4 -3.2M113.4 63.2l3.6 -1M81.8 163.1l-3.6 -4.7M143 75.2l4.1 2.7M72.4 156.7l-2.8 -2.2M69.5 132.7l-1.9 -4.4M129.2 162.8l-5.5 -.4M132.6 164.3l-4.1 .3M146.3 152.2l-5.4 2.3M60.1 135l-2.2 -4.6M137.5 150.5l-3.9 2.7M75.5 161.6l-2.4 -1.5M125.6 71l2.7 -.4M107.8 154.4l-5.4 -1.1M119.7 58.8l5.8 1.1M94.2 166.7l-5.2 -1.8M100.2 164.8l-3.4 -.8M109.6 173l-2.7 -1.3M143.6 161.5l-3.5 3.1M97.9 65.6l2.7 -.6M145.3 155.8l-3.9 1.5M102.5 161.7l-5.1 -.3M145.7 173.6l-2.6 1.2M160.3 153.8l-5.1 3.3M147 82.8l3.8 4.9M177.7 141l-1.6 5.3M102.5 170.4l-5.5 -2M146.8 71.8l2 2M149.5 69.3l4.1 4.2M163.3 147.5l-2.2 4.8M99.5 68.6l5.6 -.8M178.4 97.5l0 4.4M95.5 68.5l4.9 -3.3M79.2 90.7l2.2 -4.3M150.3 75.6l2.2 2.8M122.5 58.8l5.2 1.2M88.5 145.5l-2.3 -1.6"></path>
          <path id="pk-nine-mu" d="M70.5 85.4l2.5 -5.6M146.3 68.4l6.4 2.8M163.9 72.8l3.8 3.6M132.8 44.3l4.7 .8M139.2 47.5l6.5 1.5M139.5 44.1l4.6 1M142.9 37.3l6.5 1.3M92.6 54.7l6.5 -3.3M111.1 72.7l4.6 -1M168 65.5l5.3 4.2M132.5 49.9l3.6 .5M76.9 81.6l2.6 -2M164.7 57.2l2.5 2M89.3 44.9l5.4 -2.2M131.9 48.5l3.4 .6M158.9 75.1l4.9 3.9M77.5 96.3l1.9 -3.7M158.6 90.4l2.8 3.5M83.9 63.6l3.9 -3.5M143.9 51.3l3.8 1.2M76.3 67.8l4.5 -3.1M131.6 66.4l6 1M165.3 85.5l5.4 5.5M154.8 67.6l4.1 2.7M143.8 70l5.5 1.7M76.9 97.5l1.9 -3.1M79.6 58.2l6.1 -4.3M170.3 82.4l3 3.6M157.7 93.8l4.3 6.2M100 64.4l4.2 -1.3M113.9 48.6l3.8 -.6M92.6 75l5.7 -2.4M145.2 48.5l4.8 2.4M104.8 76.2l5.2 -2.6"></path>
          <g id="pk-nine-cf">
            <ellipse cx="0" cy="1" rx="38" ry="9" fill="url(#pk-nine-contact)" opacity=".82"></ellipse>
            <path d="M-18 -103L18 -103L20 -99L-20 -99Z" fill="#7d888e"></path>
            <path d="M-20 -99L20 -99L19 -18L-19 -18Z" fill="url(#pk-nine-cback)"></path>
            <path d="M-20 -99L20 -99" stroke="#c2a566" strokeWidth="1.1"></path>
            <path d="M-25 -31L25 -31L28 -16L-28 -16Z" fill="#2c3235"></path>
            <path d="M-28 -16L28 -16L27.6 -10L-27.6 -10Z" fill="#090a0c"></path>
            <path d="M-27 -10L-22 -10L-22.4 -1L-26.6 -1ZM22 -10L27 -10L26.6 -1L22.4 -1Z" fill="#090a0c"></path>
            <path d="M-16 -29C-17 -45 -16 -55 -8 -58C-4 -60 4 -60 8 -58C16 -55 17 -45 16 -29Z" fill="#050607"></path>
            <path d="M-15 -33L15 -33L18 -17L-18 -17Z" fill="#050607"></path>
            <circle cx="0" cy="-68" r="7" fill="#050607"></circle>
            <path d="M-4.4 -73.4A7 7 0 0 1 4.4 -73.4" fill="none" stroke="#dbe7ee" strokeWidth="1.2" opacity=".85"></path>
            <path d="M-12 -54C-9 -58 -4 -59.6 0 -59.6C4 -59.6 9 -58 12 -54" fill="none" stroke="#dbe7ee" strokeWidth="1" opacity=".55"></path>
          </g>
          <g id="pk-nine-cq">
            <ellipse cx="8" cy="-3" rx="44" ry="13" fill="url(#pk-nine-contact)" opacity=".82"></ellipse>
            <path d="M-19 -100L-27 -104L-25 -21L-17 -15Z" fill="#0c0e10"></path>
            <path d="M-19 -100L13 -106L5 -110L-27 -104Z" fill="#8b969c"></path>
            <path d="M-19 -100L13 -106L14 -25L-17 -15Z" fill="url(#pk-nine-cback)"></path>
            <path d="M-19 -100L13 -106" stroke="#c2a566" strokeWidth="1.1"></path>
            <path d="M-17 -24L14 -32L40 -22L10 -12Z" fill="#30373a"></path>
            <path d="M10 -12L40 -22L40 -16.5L10 -6.5Z" fill="#090a0c"></path>
            <path d="M-17 -24L10 -12L10 -6.5L-17 -18.5Z" fill="#0e1012"></path>
            <path d="M7.4 -7.6L12.4 -7.3L12 1L8 .6ZM36.6 -15.4L40 -16.5L39.6 -9L36.9 -8.2ZM-17 -18.5L-13.6 -17L-14 -10.4L-16.8 -11.6Z" fill="#090a0c"></path>
          </g>
          <g id="pk-nine-cqs">
            <path d="M-11 -24C-12 -44 -10 -55 -1 -59C4 -61 11 -60 15 -56C19 -52 21 -44 20 -31L28 -28L34 -22L12 -14L-6 -20Z" fill="#050607"></path>
            <circle cx="5" cy="-69" r="7" fill="#050607"></circle>
            <path d="M5 -76A7 7 0 0 1 11.6 -71" fill="none" stroke="#dbe7ee" strokeWidth="1.2" opacity=".85"></path>
            <path d="M5 -60C10 -60.4 14 -59 16.6 -55C19 -51.6 20.6 -46 20.6 -40" fill="none" stroke="#dbe7ee" strokeWidth="1" opacity=".6"></path>
          </g>
          <g id="pk-nine-cp">
            <ellipse cx="2" cy="0" rx="40" ry="8" fill="url(#pk-nine-contact)" opacity=".82"></ellipse>
            <path d="M-27 -104L-14 -103L-13 -14L-24 -14Z" fill="url(#pk-nine-cback)"></path>
            <path d="M-27 -104L-14 -103L-12 -106L-24 -107Z" fill="#8b969c"></path>
            <path d="M-14 -103L-13 -30" stroke="#dbe7ee" strokeWidth="1" opacity=".5"></path>
            <path d="M-27 -104L-14 -103" stroke="#c2a566" strokeWidth="1"></path>
            <path d="M-24 -28L24 -28L26 -24L-24 -22Z" fill="#3a4144"></path>
            <path d="M-24 -23L26 -24L25.6 -16.5L-23.6 -15.5Z" fill="#0b0c0e"></path>
            <path d="M-23.6 -15.5L-18.6 -15.6L-19 -2L-22.6 -2ZM20.6 -16.4L25.6 -16.5L24.8 -2L21 -2Z" fill="#0b0c0e"></path>
          </g>
          <g id="pk-nine-cps">
            <path d="M-13 -29C-14 -44 -13 -53 -8 -58C-4 -61 3 -60 6 -55C9 -50 10 -42 9 -34L26 -36C30 -36 31 -33 30 -30L29 -6L34 -4L34 -1L22 -1L21 -24L4 -23L-13 -23Z" fill="#050607"></path>
            <circle cx="-1" cy="-69" r="7" fill="#050607"></circle>
            <path d="M-1 -76A7 7 0 0 1 5.6 -71.4" fill="none" stroke="#dbe7ee" strokeWidth="1.2" opacity=".85"></path>
            <path d="M-1 -60C3 -60 6 -56 7.4 -51" fill="none" stroke="#dbe7ee" strokeWidth="1" opacity=".6"></path>
            <path d="M10 -34.6L26 -36.6C29 -36.6 30.6 -34 30.2 -31" fill="none" stroke="#dbe7ee" strokeWidth="1" opacity=".5"></path>
          </g>
          <g id="pk-nine-cr">
            <ellipse cx="11" cy="-6" rx="42" ry="14" fill="url(#pk-nine-contact)" opacity=".86" transform="rotate(-9 11 -6)"></ellipse>
            <path d="M36 -38.3L39.5 -40.5L39 -16L36.4 -14.5Z" fill="#0b0c0e"></path>
            <path d="M12.5 -30L39.5 -47L39.5 -40.5L12.5 -23.5Z" fill="#14171a"></path>
            <path d="M19.5 -34.4L39.5 -47L30 -50L19.5 -44Z" fill="#30373a"></path>
            <rect x="5.6" y="-92" width="7.6" height="8" fill="#050607"></rect>
            <path d="M-9 -62C-9 -77 -2 -86 9 -86.5C20 -86.5 28 -78 28.5 -64L29 -38L-9 -38Z" fill="#050607"></path>
            <circle cx="9.4" cy="-97" r="7.4" fill="#050607"></circle>
            <path d="M5.6 -103.3A7.4 7.4 0 0 1 16.2 -100" fill="none" stroke="#dbe7ee" strokeWidth="1.1" opacity=".8"></path>
            <path d="M-6.4 -72C-3 -80.4 2.6 -86 9 -86.4C16 -86.5 22.4 -83 25.6 -75.6" fill="none" stroke="#dbe7ee" strokeWidth="1" opacity=".62"></path>
            <path d="M37.4 -68.6L41.2 -68.2L40.6 -45.8L37.6 -44.4Z" fill="#0e1012"></path>
            <path d="M15.4 -57.4L39 -71.8L42.6 -69.8L18.6 -54.4Z" fill="#3b4347"></path>
            <path d="M18.6 -54.4L42.6 -69.8L42.4 -66.6L18.8 -51Z" fill="#0c0e10"></path>
            <path d="M-21.2 -58L-27.6 -62L-24.6 -63.4L-21.2 -61.2Z" fill="#3b4347"></path>
            <path d="M-21.2 -58L-27.6 -62L-28 -56.4L-21 -52Z" fill="#0c0e10"></path>
            <path d="M-19.8 -29.5L-15 -28.6L-15.6 -6.5L-19.4 -7Z" fill="#0d0e10"></path>
            <path d="M7.8 -24.3L12.5 -23.5L12 1L8.3 .4Z" fill="#0d0e10"></path>
            <path d="M-19.45 -10.4L-15.5 -9.8L-15.6 -6.5L-19.4 -7Z" fill="#a58f5a" opacity=".8"></path>
            <path d="M8.2 -3L12.05 -2.4L12 1L8.3 .4Z" fill="#a58f5a" opacity=".8"></path>
            <path d="M39.1 -19.4L36.3 -17.9L36.4 -14.5L39 -16Z" fill="#a58f5a" opacity=".55"></path>
            <path d="M-15 -28.6L-15.6 -6.5M12.5 -23.5L12 1" fill="none" stroke="#9fb0b8" strokeWidth=".6" opacity=".42"></path>
            <path d="M-21 -77L13 -72L12.5 -30L-20 -36Z" fill="url(#pk-nine-crear)"></path>
            <path d="M13 -72L20 -76.4L19.5 -34.4L12.5 -30Z" fill="url(#pk-nine-cback)"></path>
            <path d="M-21 -77L13 -72L20 -76.4L-14 -81.4Z" fill="#596469"></path>
            <path d="M-21 -77L13 -72L20 -76.4" fill="none" stroke="#a8935f" strokeWidth="1"></path>
            <path d="M-17.6 -71.6L9.6 -67.6M-17.6 -71.6L-16.8 -40.6M9.6 -67.6L9.2 -35" fill="none" stroke="#a8935f" strokeWidth="1.15" strokeLinecap="round" strokeDasharray="0 4.4" opacity=".62"></path>
            <path d="M-20 -36L12.5 -30L12.5 -23.5L-20 -29.5Z" fill="#191c1f"></path>
            <path d="M-20 -36L12.5 -30" fill="none" stroke="#000" strokeWidth=".9" opacity=".8"></path>
          </g>
          <g id="pk-nine-hotseat" fill="none" stroke="#ff7d3f" strokeLinejoin="round" strokeLinecap="round">
            <path d="M-14 -95L9 -100L10 -32L-13 -25Z" strokeWidth="6" opacity=".16"></path>
            <path d="M-14 -95L9 -100L10 -32L-13 -25Z" strokeWidth="1.7" opacity=".9"></path>
            <path d="M-17 -24L14 -32L40 -22L10 -12Z" strokeWidth="1.3" opacity=".6"></path>
          </g>
          <g id="pk-nine-hotf" fill="none" stroke="#ff6a2b" strokeLinecap="round">
            <path d="M-20 -99L20 -99" strokeWidth="3" opacity=".14"></path>
            <path d="M-20 -99L20 -99" strokeWidth="1" opacity=".55"></path>
          </g>
          <g id="pk-nine-hotq" fill="none" stroke="#ff6a2b" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-25 -21L-27 -104L-16 -106" strokeWidth="3" opacity=".14"></path>
            <path d="M-25 -21L-27 -104L-16 -106" strokeWidth="1" opacity=".55"></path>
          </g>
          <g id="pk-nine-hotp" fill="none" stroke="#ff6a2b" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-24 -14L-27 -104L-24 -107" strokeWidth="3" opacity=".14"></path>
            <path d="M-24 -14L-27 -104L-24 -107" strokeWidth="1" opacity=".55"></path>
          </g>
          <g id="pk-nine-hotr">
            <path d="M-21 -77L13 -72L12.5 -30L-20 -36Z" fill="#ff6a2b" opacity=".05"></path>
            <g fill="none" stroke="#ff6a2b" strokeLinecap="round" strokeLinejoin="round">
              <path d="M-19.4 -7L-20 -36L-21 -77L-8 -75.2" strokeWidth="3" opacity=".14"></path>
              <path d="M-19.4 -7L-20 -36L-21 -77L-8 -75.2" strokeWidth="1" opacity=".55"></path>
            </g>
          </g>
        </defs>
      </svg>
      <div className="pk-nine-world" aria-hidden="true">
        <svg className="pk-nine-floor" viewBox="0 0 375 812" preserveAspectRatio="xMidYMin slice">
          <g fill="none" stroke="#c9d5dc" strokeLinejoin="round" strokeLinecap="round">
            <g strokeWidth="6" strokeOpacity=".06">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth="2.6" strokeOpacity=".07">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth="3" strokeOpacity=".05">
              <use href="#pk-nine-v0b"></use>
              <use href="#pk-nine-v1b"></use>
              <use href="#pk-nine-v2b"></use>
              <use href="#pk-nine-v3b"></use>
              <use href="#pk-nine-v4b"></use>
            </g>
            <g strokeWidth=".5" strokeOpacity=".24">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth="1" strokeOpacity=".12" strokeDasharray="58 44 128 92 34 66">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth=".4" strokeOpacity=".18">
              <use href="#pk-nine-v0b"></use>
              <use href="#pk-nine-v1b"></use>
              <use href="#pk-nine-v2b"></use>
              <use href="#pk-nine-v3b"></use>
              <use href="#pk-nine-v4b"></use>
            </g>
          </g>
          <ellipse cx="187.5" cy="432" rx="430" ry="392" fill="none" stroke="url(#pk-nine-inlaydark)" strokeWidth="5"></ellipse>
          <ellipse cx="187.5" cy="432" rx="433" ry="395" fill="none" stroke="url(#pk-nine-inlaybrass)" strokeWidth=".8" opacity=".6"></ellipse>
          <ellipse cx="187.5" cy="432" rx="427" ry="389" fill="none" stroke="url(#pk-nine-inlaybrass)" strokeWidth=".8" opacity=".32"></ellipse>
        </svg>
        <span className="pk-nine-shaftdim">
          <span className="pk-nine-shaft"></span>
        </span>
        <div className="pk-nine-vignette"></div>
        <svg className="pk-nine-hotveins" viewBox="0 0 375 812" preserveAspectRatio="xMidYMin slice">
          <g fill="none" stroke="#ff6a2b" strokeLinejoin="round" strokeLinecap="round">
            <g strokeWidth="5" strokeOpacity=".08">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth="2.4" strokeOpacity=".07">
              <use href="#pk-nine-v0b"></use>
              <use href="#pk-nine-v1b"></use>
              <use href="#pk-nine-v2b"></use>
              <use href="#pk-nine-v3b"></use>
              <use href="#pk-nine-v4b"></use>
            </g>
            <g strokeWidth=".5" strokeOpacity=".46">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth=".9" strokeOpacity=".18" strokeDasharray="58 44 128 92 34 66">
              <use href="#pk-nine-v0"></use>
              <use href="#pk-nine-v1"></use>
              <use href="#pk-nine-v2"></use>
              <use href="#pk-nine-v3"></use>
              <use href="#pk-nine-v4"></use>
            </g>
            <g strokeWidth=".4" strokeOpacity=".18">
              <use href="#pk-nine-v0b"></use>
              <use href="#pk-nine-v1b"></use>
              <use href="#pk-nine-v2b"></use>
              <use href="#pk-nine-v3b"></use>
              <use href="#pk-nine-v4b"></use>
            </g>
          </g>
          <ellipse cx="187.5" cy="432" rx="430" ry="392" fill="none" stroke="url(#pk-nine-heathalo)" strokeWidth="22" strokeOpacity=".06"></ellipse>
          <ellipse cx="187.5" cy="432" rx="430" ry="392" fill="none" stroke="url(#pk-nine-heathalo)" strokeWidth="9" strokeOpacity=".12"></ellipse>
          <ellipse cx="187.5" cy="432" rx="430" ry="392" fill="none" stroke="url(#pk-nine-heatcore)" strokeWidth="1.6"></ellipse>
        </svg>
      </div>
      <div className={`pk-nine-stage ${v.hitClass}`}>
        <div className="pk-nine-page">
          <div className="pk-nine-top">
            <button type="button" className="pk-nine-back" onClick={() => { play('click'); onBack(); }} aria-label="Back">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M14 8H3M7.5 3.2L2.6 8l4.9 4.8" fill="none" stroke="#c2a566" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span>BACK</span>
            </button>
            <PackSoundToggle on={soundOn} onToggle={toggleSound} className={`pk-nine-snd ${soundOn ? '' : 'is-off'}`} />
            <div className="pk-nine-chip">
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.4 5.2V3.8a2.6 2.6 0 0 1 5.2 0v1.4" fill="none" stroke="#c2a566" strokeWidth="1.3"></path>
                <rect x="2.2" y="5.1" width="7.6" height="5.6" rx="1.2" fill="#c2a566"></rect>
              </svg>
              <span>FUTURE UPDATE</span>
            </div>
          </div>
          <div className="pk-nine-herozone">
            <div className="pk-nine-herobox">
              <svg className="pk-nine-scenepool" viewBox="-100 -100 440 440" aria-hidden="true">
                <ellipse cx="120" cy="164" rx="214" ry="158" fill="url(#pk-nine-poolhot)"></ellipse>
              </svg>
              <svg className="pk-nine-scene" viewBox="-100 -100 440 440" aria-hidden="true">
                <ellipse cx="120" cy="164" rx="186" ry="134" fill="url(#pk-nine-pool)"></ellipse>
                <g>
                  <ellipse cx="-44" cy="58" rx="66" ry="22" fill="url(#pk-nine-cloud)" transform="rotate(-20 -44 58)"></ellipse>
                  <ellipse cx="292" cy="36" rx="74" ry="20" fill="url(#pk-nine-cloud)" transform="rotate(16 292 36)"></ellipse>
                  <ellipse cx="-30" cy="166" rx="54" ry="28" fill="url(#pk-nine-cloud)" transform="rotate(32 -30 166)"></ellipse>
                  <ellipse cx="274" cy="172" rx="70" ry="24" fill="url(#pk-nine-cloud)" transform="rotate(-26 274 172)"></ellipse>
                  <ellipse cx="36" cy="282" rx="72" ry="16" fill="url(#pk-nine-cloud)" transform="rotate(8 36 282)"></ellipse>
                  <ellipse cx="214" cy="290" rx="62" ry="14" fill="url(#pk-nine-cloud)" transform="rotate(-10 214 290)"></ellipse>
                  <ellipse cx="302" cy="104" rx="44" ry="9" fill="url(#pk-nine-cloudl)" transform="rotate(-30 302 104)"></ellipse>
                  <ellipse cx="-62" cy="128" rx="46" ry="10" fill="url(#pk-nine-cloudl)" transform="rotate(26 -62 128)"></ellipse>
                  <ellipse cx="44" cy="-30" rx="44" ry="9" fill="url(#pk-nine-cloudl)" transform="rotate(-12 44 -30)"></ellipse>
                  <ellipse cx="258" cy="244" rx="40" ry="8" fill="url(#pk-nine-cloudl)" transform="rotate(-18 258 244)"></ellipse>
                </g>
                <ellipse cx="120" cy="144" rx="190" ry="130" fill="none" stroke="url(#pk-nine-inlay)" strokeWidth="1.4"></ellipse>
                <ellipse cx="120" cy="144" rx="196" ry="135" fill="none" stroke="url(#pk-nine-inlay)" strokeWidth=".6" opacity=".7"></ellipse>
                <ellipse cx="120" cy="258" rx="112" ry="15" fill="url(#pk-nine-contact)"></ellipse>
                <g mask="url(#pk-nine-mirrorfade)">
                  <ellipse cx="120" cy="262" rx="124" ry="38" fill="url(#pk-nine-mirrorg)"></ellipse>
                </g>
                <g mask="url(#pk-nine-chairfade)">
                  <g transform="translate(120 5) scale(.3)" opacity=".6">
                    <use href="#pk-nine-cf"></use>
                  </g>
                  <g transform="translate(0 72) scale(.48)">
                    <use href="#pk-nine-cq"></use>
                    <use href="#pk-nine-cqs"></use>
                  </g>
                  <g transform="translate(240 72) scale(-.48 .48)">
                    <use href="#pk-nine-cq"></use>
                    <path d="M-14 -95L9 -100L10 -32L-13 -25Z" fill="url(#pk-nine-cempty)"></path>
                  </g>
                  <g transform="translate(-34 106) scale(.56)">
                    <use href="#pk-nine-cq"></use>
                    <use href="#pk-nine-cqs"></use>
                  </g>
                  <g transform="translate(274 106) scale(-.56 .56)">
                    <use href="#pk-nine-cq"></use>
                    <use href="#pk-nine-cqs"></use>
                  </g>
                  <g transform="translate(-39 170) scale(.6)">
                    <use href="#pk-nine-cp"></use>
                    <use href="#pk-nine-cps"></use>
                  </g>
                  <g transform="translate(279 170) scale(-.6 .6)">
                    <use href="#pk-nine-cp"></use>
                    <use href="#pk-nine-cps"></use>
                  </g>
                  <g transform="translate(-24 248) scale(.68)">
                    <use href="#pk-nine-cr"></use>
                  </g>
                  <g transform="translate(264 248) scale(-.68 .68)">
                    <use href="#pk-nine-cr"></use>
                  </g>
                </g>
              </svg>
              <svg className="pk-nine-scenehot" viewBox="-100 -100 440 440" aria-hidden="true">
                <g className="pk-nine-seat" transform="translate(240 72) scale(-.48 .48)">
                  <use href="#pk-nine-hotseat"></use>
                </g>
                <g transform="translate(120 5) scale(.3)">
                  <use href="#pk-nine-hotf"></use>
                </g>
                <g transform="translate(0 72) scale(.48)">
                  <use href="#pk-nine-hotq"></use>
                </g>
                <g transform="translate(240 72) scale(-.48 .48)">
                  <use href="#pk-nine-hotq"></use>
                </g>
                <g transform="translate(-34 106) scale(.56)">
                  <use href="#pk-nine-hotq"></use>
                </g>
                <g transform="translate(274 106) scale(-.56 .56)">
                  <use href="#pk-nine-hotq"></use>
                </g>
                <g transform="translate(-39 170) scale(.6)">
                  <use href="#pk-nine-hotp"></use>
                </g>
                <g transform="translate(279 170) scale(-.6 .6)">
                  <use href="#pk-nine-hotp"></use>
                </g>
                <g transform="translate(-24 248) scale(.68)">
                  <use href="#pk-nine-hotr"></use>
                </g>
                <g transform="translate(264 248) scale(-.68 .68)">
                  <use href="#pk-nine-hotr"></use>
                </g>
              </svg>
              <span className="pk-nine-youpulse" aria-hidden="true"></span>
              <svg className="pk-nine-sceneyou" viewBox="-100 -100 440 440" aria-hidden="true">
                <g transform="translate(240 72) scale(-.48 .48)">
                  <use href="#pk-nine-cqs"></use>
                  <path d="M5 -76A7 7 0 0 1 11.6 -71M5 -60C10 -60.4 14 -59 16.6 -55C19 -51.6 20.6 -46 20.6 -40" fill="none" stroke="#ff8a50" strokeWidth="1.5"></path>
                </g>
              </svg>
              <div className="pk-nine-smoke pk-nine-smoke-a" aria-hidden="true"></div>
              <span className="pk-nine-wave" aria-hidden="true"></span>
              <button className="pk-nine-eye" data-reveal="1" onClick={v.turn} aria-label={v.eyeLabel}>
                <span className="pk-nine-active">
                  <span className={`pk-nine-press ${v.hitClass}`}>
                    <span className="pk-nine-halo"></span>
                    <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                      <path fillRule="evenodd" d="M120 .5a119.5 119.5 0 1 0 .01 0ZM120 10.5a109.5 109.5 0 1 0 .01 0Z" fill="url(#pk-nine-collarg)" filter="url(#pk-nine-tooth)"></path>
                      <path d="M37.6 44.7l2.2 -3.9M57.8 24.3l3.1 -1.3M13.8 169.3l-2.6 -2.6M216 179.6l-2.8 2M212.6 52.4l2.8 3.4M120.4 234.7l-2.2 0M18.1 73.5l2.9 -2.8M34.2 191.3l-1 -2.7M237.8 115l.6 1.6M63.5 221.4l-3 -1.1M158.9 225.8l-2.3 1.6M171 15.5l2.9 1.6M20.7 183.4l-.5 -2.3M151.7 231.4l-1.9 -.1M171.6 218.4l-3.1 1.8M27 191.8l-.6 -2.6M80.6 8.9l3.2 .3M177.1 219.3l-3.3 1.5M15.6 75.9l.5 -2.7M129.2 8.9l2 1M118.4 5.4l4.2 -1.1M161.5 12.3l4.1 1.9M220.3 70.6l2.8 2.2M7.8 92.6l.1 -2.7M200.6 198.1l-1.1 1.2M57.4 220l-2.3 -2.4M49.5 30.4l2.3 -2.6M30.8 52.5l3.3 -2.5M51.4 213.7l-.8 -1.5M207.9 50.8l1.1 3.2M139.2 232.9l-3.2 -.1M21 171.1l-.9 -2M121 232.3l-3.3 .3M184.5 28.4l2.9 2.3M33.4 41.6l.9 -2.3M47.3 205.2l-1.6 -1.9M133 235.7l-2.7 -.6M201.6 203.3l-2.2 2.9M9.7 97.1l.2 -2.7M232.5 111.1l-.1 2M42.2 39.7l1.9 -.9M5.6 104.4l1.5 -2.6M115.4 3l3.5 1.4M31.7 193.8l-3.4 -1.8M232.3 109.3l-.3 3M237.8 119.7l-1.7 3.8M26.1 184.1l-1.8 -2.3M5.1 126.9l-1.5 -4M30.6 193.3l-2.5 -1.2M237.1 133l0 2.5M44.2 209.3l-1.6 -2.9M48.6 206.6l-3.8 -2.1M140.9 8.5l3 .4M178.4 19.5l3.8 .8M11 142.8l.3 -1.9M5.6 102.9l.9 -3.3M121.8 237.6l-2.9 1.1M168.9 17.4l2.5 1.8M206.1 47.6l1.9 2.8M98.9 235.5l-4.3 -1.1M43.6 207.3l-2.1 -1.1M139.5 10.6l4.2 1.3M18.7 171.1l-.7 -1.6M233.5 123.9l-.1 4.4" fill="none" stroke="#000" strokeWidth=".8" opacity=".5"></path>
                      <circle cx="120" cy="120" r="119.1" fill="none" stroke="url(#pk-nine-bevout)" strokeWidth=".9"></circle>
                      <circle cx="120" cy="120" r="110" fill="none" stroke="url(#pk-nine-bevin)" strokeWidth="1"></circle>
                      <g fill="#050505">
                        <circle cx="7.7" cy="97.7" r="3.3"></circle>
                        <circle cx="24.8" cy="56.4" r="3.3"></circle>
                        <circle cx="56.4" cy="24.8" r="3.3"></circle>
                        <circle cx="97.66" cy="7.7" r="3.3"></circle>
                        <circle cx="142.34" cy="7.7" r="3.3"></circle>
                        <circle cx="183.6" cy="24.8" r="3.3"></circle>
                        <circle cx="215.2" cy="56.4" r="3.3"></circle>
                        <circle cx="232.3" cy="97.7" r="3.3"></circle>
                      </g>
                      <g fill="#8c7a4f">
                        <circle cx="7.7" cy="97.4" r="2.2"></circle>
                        <circle cx="24.8" cy="56.1" r="2.2"></circle>
                        <circle cx="56.4" cy="24.5" r="2.2"></circle>
                        <circle cx="97.66" cy="7.4" r="2.2"></circle>
                        <circle cx="142.34" cy="7.4" r="2.2"></circle>
                        <circle cx="183.6" cy="24.5" r="2.2"></circle>
                        <circle cx="215.2" cy="56.1" r="2.2"></circle>
                        <circle cx="232.3" cy="97.4" r="2.2"></circle>
                      </g>
                      <g fill="#e6dcbc">
                        <ellipse cx="7.7" cy="96.5" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="24.8" cy="55.2" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="56.4" cy="23.6" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="97.66" cy="6.5" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="142.34" cy="6.5" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="183.6" cy="23.6" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="215.2" cy="55.2" rx="1.1" ry=".7"></ellipse>
                        <ellipse cx="232.3" cy="96.5" rx="1.1" ry=".7"></ellipse>
                      </g>
                    </svg>
                    <span className="pk-nine-plate"></span>
                    {' '}
                    <span className="pk-nine-rb pk-nine-rb-a"></span>
                    {' '}
                    <span className="pk-nine-rb pk-nine-rb-b"></span>
                    {' '}
                    <span className="pk-nine-rb pk-nine-rb-c"></span>
                    {' '}
                    <span className="pk-nine-ring" style={{ transform: `rotate(${v.ringA}deg)` } as React.CSSProperties}>
                      <span className={`pk-nine-ringin pk-nine-ringin-a ${v.nextA} ${v.reactClass}`}>
                        <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                          <circle cx="120" cy="120" r="102" fill="none" stroke="#000" strokeWidth="11.6" filter="url(#pk-nine-patina)" opacity=".6"></circle>
                          <g fill="none">
                            <circle cx="120" cy="120" r="97.6" stroke="#17120a" strokeWidth=".7" opacity=".8"></circle>
                            <circle cx="120" cy="120" r="106.4" stroke="#17120a" strokeWidth=".7" opacity=".8"></circle>
                            <circle cx="120" cy="120" r="102" stroke="#17120a" strokeWidth="5" strokeDasharray=".75 8.151" opacity=".85"></circle>
                            <circle cx="120" cy="120" r="102" stroke="#f6ecc8" strokeWidth="5" strokeDasharray=".3 8.601" strokeDashoffset="-.75" opacity=".28"></circle>
                          </g>
                          <g fill="#14170f">
                            <rect x="118.5" y="15" width="3" height="9"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(45 120 120)"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(90 120 120)"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(135 120 120)"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(225 120 120)"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(270 120 120)"></rect>
                            <rect x="118.5" y="15" width="3" height="9" transform="rotate(315 120 120)"></rect>
                          </g>
                          <path d="M191.1 53.3l2.4 3.3M21.2 98.6l3.5 -5.9M21.2 134.1l0 -5M21.4 145.9l-.7 -5.4M40.1 187.9l-5.6 -5.5M192.9 184.9l-3.3 4M220.9 128.6l-.5 3.9M181.4 35.1l7.4 2.4M114.9 16.2l5.7 1.5M152.4 212.5l-2.5 1.8M14.1 122.6l.7 -4.1M218 96.2l.1 2.7M177.2 34.9l6.3 4.5M185.1 46l4.7 5.4" fill="none" stroke="#fff6d8" strokeWidth=".35" strokeLinecap="round" opacity=".42"></path>
                          <rect x="115.4" y="215.6" width="9.2" height="12.8" fill="#040403"></rect>
                          <path d="M115.4 216v12M124.6 216v12" stroke="#ecdcab" strokeWidth=".6" opacity=".8"></path>
                        </svg>
                      </span>
                    </span>
                    {' '}
                    <span className="pk-nine-ring" style={{ transform: `rotate(${v.ringB}deg)` } as React.CSSProperties}>
                      <span className={`pk-nine-ringin pk-nine-ringin-b ${v.nextB} ${v.reactClass}`}>
                        <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                          <circle cx="120" cy="120" r="88.5" fill="none" stroke="#000" strokeWidth="10.6" filter="url(#pk-nine-patina)" opacity=".5"></circle>
                          <g fill="none">
                            <circle cx="120" cy="120" r="84.6" stroke="#17120a" strokeWidth=".6" opacity=".8"></circle>
                            <circle cx="120" cy="120" r="92.4" stroke="#17120a" strokeWidth=".6" opacity=".8"></circle>
                            <circle cx="120" cy="120" r="88.5" stroke="#120e07" strokeWidth="5" strokeDasharray="1.8 21.37" opacity=".9"></circle>
                            <circle cx="120" cy="120" r="88.5" stroke="#d9e2d6" strokeWidth="2.1" strokeLinecap="round" strokeDasharray="0 23.17" strokeDashoffset="-11.6" opacity=".55"></circle>
                            <circle cx="120" cy="120" r="88.5" stroke="#3f5a4e" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0 23.17" strokeDashoffset="-11.6"></circle>
                          </g>
                          <path d="M80.8 43.3l6.3 -5M115.1 28.7l3.7 -.4M38.8 156.6l-2.7 -7.1M85.2 203.1l-6.2 -4.3M197.7 75.7l1.9 2.3M35.6 111l-.5 -5.2M65.3 49.3l2 -1.6M50.9 171.7l-1.7 -2.5M133 28.4l3.5 1.1M34.6 83.8l4.8 -5.5M42.6 76.4l2.1 -4.8M146.7 208.7l-6.8 2.1" fill="none" stroke="#fff6d8" strokeWidth=".35" strokeLinecap="round" opacity=".42"></path>
                          <rect x="115.4" y="202.8" width="9.2" height="11.6" fill="#040403"></rect>
                          <path d="M115.4 203v11M124.6 203v11" stroke="#ecdcab" strokeWidth=".6" opacity=".7"></path>
                        </svg>
                      </span>
                    </span>
                    {' '}
                    <span className="pk-nine-ring" style={{ transform: `rotate(${v.ringC}deg)` } as React.CSSProperties}>
                      <span className={`pk-nine-ringin pk-nine-ringin-c ${v.nextC} ${v.reactClass}`}>
                        <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                          <circle cx="120" cy="120" r="75" fill="none" stroke="#000" strokeWidth="11.6" filter="url(#pk-nine-patina)" opacity=".45"></circle>
                          <g fill="none">
                            <circle cx="120" cy="120" r="70.6" stroke="#17120a" strokeWidth=".6" opacity=".8"></circle>
                            <circle cx="120" cy="120" r="79.2" stroke="#17120a" strokeWidth=".6" opacity=".8"></circle>
                          </g>
                          <g fontFamily="Cinzel,serif" fontSize="7.6" fontWeight="700" textAnchor="middle" fill="#17120a">
                            <text x="120" y="47.8">IX</text>
                            <text x="120" y="47.8" transform="rotate(40 120 120)">I</text>
                            <text x="120" y="47.8" transform="rotate(80 120 120)">II</text>
                            <text x="120" y="47.8" transform="rotate(120 120 120)">III</text>
                            <text x="120" y="47.8" transform="rotate(160 120 120)">IV</text>
                            <text x="120" y="47.8" transform="rotate(200 120 120)">V</text>
                            <text x="120" y="47.8" transform="rotate(240 120 120)">VI</text>
                            <text x="120" y="47.8" transform="rotate(280 120 120)">VII</text>
                            <text x="120" y="47.8" transform="rotate(320 120 120)">VIII</text>
                          </g>
                          <path d="M47.6 105.5l1.3 -3.8M83 56.3l3.5 -1.6M170.5 63.5l7 3.7M59.6 73.5l3.5 -5.3M139.5 47.3l2.3 .2M87.3 51.3l6.4 -3.2M138.9 193.2l-6.1 3.4M153.5 56.9l2.7 .5M197.1 129.1l.1 6.9M184.9 162.6l-3.6 5" fill="none" stroke="#fff6d8" strokeWidth=".35" strokeLinecap="round" opacity=".42"></path>
                          <rect x="115.4" y="189" width="9.2" height="12.2" fill="#040403"></rect>
                          <path d="M115.4 189v12M124.6 189v12" stroke="#ecdcab" strokeWidth=".6" opacity=".7"></path>
                        </svg>
                      </span>
                    </span>
                    <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                      <g fill="none">
                        <circle cx="120" cy="120" r="108.8" stroke="#050403" strokeWidth="1.8"></circle>
                        <circle cx="120" cy="120" r="95" stroke="#050403" strokeWidth="2.2"></circle>
                        <circle cx="120" cy="120" r="82" stroke="#050403" strokeWidth="2.2"></circle>
                        <circle cx="120" cy="120" r="68" stroke="#050403" strokeWidth="2.2"></circle>
                        <circle cx="120" cy="120" r="107.4" stroke="url(#pk-nine-bevout)" strokeWidth="1"></circle>
                        <circle cx="120" cy="120" r="96.5" stroke="url(#pk-nine-bevin)" strokeWidth="1"></circle>
                        <circle cx="120" cy="120" r="93.4" stroke="url(#pk-nine-bevout)" strokeWidth=".9"></circle>
                        <circle cx="120" cy="120" r="83.5" stroke="url(#pk-nine-bevin)" strokeWidth=".9"></circle>
                        <circle cx="120" cy="120" r="80.5" stroke="url(#pk-nine-bevout)" strokeWidth="1"></circle>
                        <circle cx="120" cy="120" r="69.5" stroke="url(#pk-nine-bevin)" strokeWidth="1"></circle>
                        <circle cx="120" cy="120" r="105.8" stroke="url(#pk-nine-casttop)" strokeWidth="3.4"></circle>
                        <circle cx="120" cy="120" r="92" stroke="url(#pk-nine-casttop)" strokeWidth="3"></circle>
                        <circle cx="120" cy="120" r="97.6" stroke="url(#pk-nine-castbot)" strokeWidth="3"></circle>
                        <circle cx="120" cy="120" r="79" stroke="url(#pk-nine-casttop)" strokeWidth="3"></circle>
                        <circle cx="120" cy="120" r="85" stroke="url(#pk-nine-castbot)" strokeWidth="3"></circle>
                      </g>
                    </svg>
                    <span className="pk-nine-sheen"></span>
                    {' '}
                    <span className="pk-nine-glintrun">
                      <span className="pk-nine-glint"></span>
                      <span className="pk-nine-glinthot"></span>
                    </span>
                    {' '}
                    <span className="pk-nine-warm"></span>
                    <svg className="pk-nine-lay pk-nine-warmrim" viewBox="0 0 240 240" aria-hidden="true">
                      <g fill="none" stroke="url(#pk-nine-warmrimg)" strokeWidth=".9">
                        <circle cx="120" cy="120" r="119"></circle>
                        <circle cx="120" cy="120" r="107.4"></circle>
                        <circle cx="120" cy="120" r="93.4"></circle>
                        <circle cx="120" cy="120" r="80.5"></circle>
                        <circle cx="120" cy="120" r="68.2"></circle>
                      </g>
                    </svg>
                    <span className="pk-nine-gaze">
                      <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                        <g className="pk-nine-gz pk-nine-gz-c">
                          <rect x="112" y="187" width="16" height="43" fill="#ff6a2b" opacity=".34" filter="url(#pk-nine-spill)"></rect>
                        </g>
                        <g className="pk-nine-gz pk-nine-gz-a">
                          <rect x="115.8" y="189" width="8.4" height="12.2" fill="url(#pk-nine-gazefall)"></rect>
                          <rect x="115.8" y="189" width="8.4" height="12.2" fill="url(#pk-nine-gazelip)"></rect>
                        </g>
                        <g className="pk-nine-gz pk-nine-gz-b">
                          <rect x="115.8" y="202.8" width="8.4" height="11.6" fill="url(#pk-nine-gazefall)"></rect>
                          <rect x="115.8" y="202.8" width="8.4" height="11.6" fill="url(#pk-nine-gazelip)"></rect>
                        </g>
                        <g className="pk-nine-gz pk-nine-gz-c">
                          <rect x="115.8" y="215.6" width="8.4" height="12.8" fill="url(#pk-nine-gazefall)"></rect>
                          <rect x="115.8" y="215.6" width="8.4" height="12.8" fill="url(#pk-nine-gazelip)"></rect>
                        </g>
                      </svg>
                    </span>
                    {' '}
                    <span className="pk-nine-socket">
                      <svg className="pk-nine-lay" viewBox="54 54 132 132" aria-hidden="true">
                        <circle cx="120" cy="120" r="66" fill="url(#pk-nine-ball)" filter="url(#pk-nine-fine)"></circle>
                      </svg>
                      <span className="pk-nine-iris" style={{ transform: v.irisT } as React.CSSProperties}>
                        <svg className="pk-nine-lay" viewBox="54 54 132 132" aria-hidden="true">
                          <circle cx="120" cy="120" r="29.6" fill="#27302d" opacity=".9"></circle>
                          <circle cx="120" cy="120" r="28.4" fill="url(#pk-nine-irisg)" filter="url(#pk-nine-fine)"></circle>
                          <g fill="none">
                            <circle cx="120" cy="120" r="20" stroke="#4d534d" strokeWidth="16" strokeDasharray=".5 1.1 .3 2.2 .7 1.6" opacity=".36"></circle>
                            <circle cx="120" cy="120" r="24.6" stroke="#5f7f6e" strokeWidth="7" strokeDasharray=".9 3.1 .4 5.3 1.2 2.4" opacity=".3"></circle>
                            <circle cx="120" cy="120" r="28.7" stroke="url(#pk-nine-bevin)" strokeWidth=".9"></circle>
                          </g>
                          <ellipse cx="120" cy="103.6" rx="5" ry="1.8" fill="#f6f9fa" opacity=".45"></ellipse>
                        </svg>
                        <span className="pk-nine-pupil">
                          <svg className="pk-nine-lay" viewBox="54 54 132 132" aria-hidden="true">
                            <circle cx="120" cy="120" r="11" fill="url(#pk-nine-pupilg)"></circle>
                            <path d="M112 127.2A11 11 0 0 0 128 127.2" fill="none" stroke="#f0ece0" strokeWidth=".7" opacity=".34"></path>
                          </svg>
                        </span>
                      </span>
                      {' '}
                      <span className="pk-nine-lid" style={{ transform: v.lidU } as React.CSSProperties}>
                        <span className={`pk-nine-lidrun pk-nine-lidrun-u ${v.reactClass}`}>
                          <svg className="pk-nine-lay" viewBox="54 54 132 132" style={{ overflow: 'visible' } as React.CSSProperties} aria-hidden="true">
                            <path d="M30 -10H210V129H180C156 101 138 93 120 93C102 93 84 101 60 129H30Z" fill="#000" opacity=".6" filter="url(#pk-nine-soft3)"></path>
                            <path d="M30 -10H210V120H180C156 92 138 84 120 84C102 84 84 92 60 120H30Z" fill="url(#pk-nine-lidug)" filter="url(#pk-nine-fine)"></path>
                            <g fill="none">
                              <use href="#pk-nine-mu" stroke="#111" strokeWidth=".8" opacity=".5"></use>
                              <use href="#pk-nine-mu" y=".8" stroke="#f4f7f5" strokeWidth=".5" opacity=".3"></use>
                              <use href="#pk-nine-eu" y="-5" stroke="#000" strokeWidth=".9" opacity=".36"></use>
                              <use href="#pk-nine-eu" y="-4.2" stroke="#f4f7f5" strokeWidth=".5" opacity=".28"></use>
                              <use href="#pk-nine-eu" stroke="#000" strokeWidth="1.8" opacity=".7"></use>
                            </g>
                          </svg>
                        </span>
                      </span>
                      {' '}
                      <span className="pk-nine-lid" style={{ transform: v.lidL } as React.CSSProperties}>
                        <span className={`pk-nine-lidrun pk-nine-lidrun-l ${v.reactClass}`}>
                          <svg className="pk-nine-lay" viewBox="54 54 132 132" style={{ overflow: 'visible' } as React.CSSProperties} aria-hidden="true">
                            <use href="#pk-nine-el" y="-1.1" fill="none" stroke="#000" strokeWidth="2" opacity=".85"></use>
                            <path d="M30 250H210V120H180C156 134 138 142 120 142C102 142 84 134 60 120H30Z" fill="url(#pk-nine-lidlg)" filter="url(#pk-nine-fine)"></path>
                            <use href="#pk-nine-el" y=".7" fill="none" stroke="#e4e6df" strokeWidth=".95" strokeDasharray="31 .7 18 1.3 44 .6 12 1.6 27 .8 36" opacity=".78"></use>
                          </svg>
                        </span>
                      </span>
                      {' '}
                      <span className="pk-nine-dome"></span>
                      <svg className="pk-nine-lay" viewBox="54 54 132 132" aria-hidden="true">
                        <path fillRule="evenodd" d="M50 50H190V190H50ZM60 120C84 92 102 84 120 84C138 84 156 92 180 120C156 134 138 142 120 142C102 142 84 134 60 120Z" fill="url(#pk-nine-orbitg)" filter="url(#pk-nine-tooth)"></path>
                        <g clipPath="url(#pk-nine-clipalm)">
                          <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120" fill="none" stroke="#000" strokeWidth="9" opacity=".7" filter="url(#pk-nine-soft2)"></path>
                        </g>
                        <g fill="none">
                          <path d="M56 118.4C82 84 102 76 120 76C138 76 158 84 184 118.4" stroke="#000" strokeWidth="1.5" opacity=".6"></path>
                          <path d="M56 119.4C82 85 102 77 120 77C138 77 158 85 184 119.4" stroke="#f4f7f5" strokeWidth=".7" opacity=".36"></path>
                          <path d="M54 104C84 72 104 63 120 63C136 63 156 72 186 104" stroke="#000" strokeWidth="1" opacity=".3"></path>
                          <path d="M54 104.8C84 72.8 104 63.8 120 63.8C136 63.8 156 72.8 186 104.8" stroke="#f4f7f5" strokeWidth=".5" opacity=".2"></path>
                          <path d="M57 124.6C84 141 103 150 120 150C137 150 156 141 183 124.6" stroke="#000" strokeWidth="1.2" opacity=".55"></path>
                          <path d="M57 125.5C84 141.9 103 150.9 120 150.9C137 150.9 156 141.9 183 125.5" stroke="#f4f7f5" strokeWidth=".6" opacity=".26"></path>
                          <path d="M56 142C86 158 104 165 120 165C136 165 154 158 184 142" stroke="#000" strokeWidth=".8" opacity=".26"></path>
                          <use href="#pk-nine-mo" stroke="#0c0c0c" strokeWidth=".8" opacity=".55"></use>
                          <use href="#pk-nine-mo" y=".8" stroke="#f4f7f5" strokeWidth=".5" opacity=".3"></use>
                          <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120" stroke="#000" strokeWidth="2.2" opacity=".85"></path>
                          <path d="M60 118.6C84 90.6 102 82.6 120 82.6C138 82.6 156 90.6 180 118.6" stroke="#f4f7f5" strokeWidth=".7" opacity=".5"></path>
                          <path d="M60 120C84 134 102 142 120 142C138 142 156 134 180 120" stroke="#e4e6df" strokeWidth=".95" strokeDasharray="23 1.1 37 .7 15 1.5 41 .8 19" opacity=".74"></path>
                          <path d="M60 121.3C84 135.3 102 143.3 120 143.3C138 143.3 156 135.3 180 121.3" stroke="#000" strokeWidth="1" opacity=".6"></path>
                          <path d="M60 120L52 120.6M180 120L188 120.6" stroke="#000" strokeWidth="1.2" opacity=".6"></path>
                        </g>
                      </svg>
                      <span className="pk-nine-form"></span>
                      {' '}
                      <span className="pk-nine-sockwarm"></span>
                    </span>
                    {' '}
                    <span className="pk-nine-hint">
                      <svg className="pk-nine-lay" viewBox="0 0 240 240" aria-hidden="true">
                        <path id="pk-nine-hintp" d="M1.2 120A118.8 118.8 0 0 0 238.8 120" fill="none"></path>
                        <text className="pk-nine-hinttext" fontFamily="Archivo,sans-serif" fontWeight="800" fill="#ece6d7">
                          <textPath href="#pk-nine-hintp" startOffset="50%" textAnchor="middle">TURN THE RINGS</textPath>
                        </text>
                      </svg>
                    </span>
                    {v.studs.map((item: any, itemIndex: number) => (
                      <span key={itemIndex} className={`pk-nine-stud ${item.cls}`} style={{ left: item.x, top: item.y } as React.CSSProperties}></span>
                    ))}
                  </span>
                </span>
              </button>
              <div className="pk-nine-cloudpass" aria-hidden="true"></div>
              <div className="pk-nine-smoke pk-nine-smoke-b" aria-hidden="true"></div>
              <div className="pk-nine-motes" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className={`pk-nine-dust ${v.hitClass}`} aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
          </div>
          <span className="pk-nine-sparks" aria-hidden="true">
            <span className="pk-nine-drop" style={{ left: v.dropX, top: v.dropY, '--fd': v.dropD } as React.CSSProperties}>
              <i></i>
            </span>
            {' '}
            <span className="pk-nine-climb" style={{ left: v.climbX, top: v.climbY, '--cx': v.climbDX } as React.CSSProperties}>
              <span className="pk-nine-climby" style={{ '--cy': v.climbDY } as React.CSSProperties}>
                <i></i>
              </span>
            </span>
          </span>
          <div className="pk-nine-copy">
            <div className="pk-nine-lockup">
              <span className="pk-nine-l1">THE GILDED</span>
              {' '}
              <span className="pk-nine-l2">
                <span className="pk-nine-ninebox">
                  <span className="pk-nine-nine">NINE</span>
                  <span className="pk-nine-ninehot" aria-hidden="true">NINE</span>
                </span>
              </span>
            </div>
            <div className="pk-nine-kicker">YOUR SECRET SOCIETY</div>
            <div className="pk-nine-soon">
              <i className="pk-nine-tk" aria-hidden="true"></i>
              {' '}
              <span className="pk-nine-soonbox">
                <span className="pk-nine-soont">COMING SOON</span>
                {' '}
                <span className="pk-nine-soonhot" aria-hidden="true">COMING SOON</span>
                {' '}
                <span className="pk-nine-band" aria-hidden="true">
                  <span className="pk-nine-bandin">COMING SOON</span>
                </span>
              </span>
              {' '}
              <i className="pk-nine-tk" aria-hidden="true"></i>
            </div>
            <p className="pk-nine-pitch">Stop climbing the ladder like everyone else. <b>Give up what you love, take a chair among the Nine</b>, and decide who wins before the envelope opens.</p>
          </div>
          <div className="pk-nine-slab">
            <svg className="pk-nine-slabart" viewBox="0 0 343 156" preserveAspectRatio="none" aria-hidden="true">
              <path d="M24 150L341 149.6L341.4 154.8L288 155.8L210 155L140 155.9L64 155.1L30 155.8Z" fill="#050607"></path>
              <path d="M3 4.6L40 3L92 4.6L150 2.6L213 4.2L270 2.6L311 3.8L318.5 8.2L325 9L330.5 15.6L340.8 20.6L342 86L340.6 126L341 150.6L288 151.8L210 150.8L140 152L64 151L24 151.4L19 147.2L11 146.2L7.5 140.6L2 136L1.4 110L2.6 64L1.6 30Z" fill="url(#pk-nine-slabg)" filter="url(#pk-nine-stone)"></path>
              <g clipPath="url(#pk-nine-slabclip)">
                <rect x="0" y="0" width="343" height="112" fill="url(#pk-nine-slabmoon)"></rect>
                <ellipse cx="62" cy="98" rx="70" ry="30" fill="url(#pk-nine-cloud)" transform="rotate(-14 62 98)"></ellipse>
                <ellipse cx="284" cy="120" rx="78" ry="26" fill="url(#pk-nine-cloud)" transform="rotate(10 284 120)"></ellipse>
                <ellipse cx="226" cy="64" rx="66" ry="20" fill="url(#pk-nine-cloudl)" opacity=".55" transform="rotate(-8 226 64)"></ellipse>
                <ellipse cx="98" cy="40" rx="60" ry="16" fill="url(#pk-nine-cloudl)" opacity=".55" transform="rotate(12 98 40)"></ellipse>
                <g fill="none" stroke="#c9d5dc" strokeLinecap="round" strokeLinejoin="round">
                  <g strokeWidth="3.4" strokeOpacity=".06">
                    <path d="M44 1Q50 13 58 21Q66 29 69 41Q72 53 84 61Q96 69 101 83Q106 97 120 105Q132 113 136 127Q139 139 148 154"></path>
                    <path d="M345 60Q328 65 318 75Q308 85 296 89Q284 93 276 105Q268 117 256 123Q246 129 240 141L236 154"></path>
                  </g>
                  <path d="M44 1Q50 13 58 21Q66 29 69 41Q72 53 84 61Q96 69 101 83Q106 97 120 105Q132 113 136 127Q139 139 148 154" strokeWidth=".55" strokeOpacity=".34"></path>
                  <path d="M345 60Q328 65 318 75Q308 85 296 89Q284 93 276 105Q268 117 256 123Q246 129 240 141L236 154" strokeWidth=".55" strokeOpacity=".3"></path>
                  <g strokeWidth=".4" strokeOpacity=".22">
                    <path d="M84 61Q96 59 108 63Q118 67 128 63M120 105Q112 116 114 128"></path>
                    <path d="M296 89Q300 101 296 111Q293 119 296 129M276 105Q264 102 254 104"></path>
                    <path d="M204 1Q198 10 201 20Q204 30 196 40Q192 46 194 54"></path>
                  </g>
                </g>
                <path d="M166.9 96.7l2.7 -6.8M277 38.1l2.4 -4.4M28 80.3l1.9 -4.8M27.2 64l1.3 -8M327.7 144l.6 -3.5M245.9 53.1l2.3 -9.1M267.8 78.5l1.2 -3.2M86.8 59.2l1.4 -5.7M55.3 96.3l2.2 -4M91.3 136.2l1.1 -2.9M12.7 130.5l.6 -3.1M305.9 63l2.3 -3.9M19.1 127.5l3.4 -8.6M54.6 62.4l1.4 -8.5M276.1 56.2l2.2 -8.8M28.5 100l1.3 -5.9M134.2 103.3l3.9 -7M81.2 51.1l2 -7.2M117.9 127.6l1.3 -3.3M93.6 79.3l1.4 -3.7M202.4 81.5l3 -5.9M107.4 112.7l1.8 -3.7M154.5 47.9l2.7 -5.9M40.4 45.5l2.1 -4.6M233.9 89.9l1.5 -9.2M189.2 111.8l2.1 -4.8M303.9 117.4l2.9 -6.4M9.2 41.9l2.3 -8.2M265.3 38.5l4.7 -7.6M203.7 65.7l3.1 -5.8M160.4 52l2 -3.8M179.8 69.1l2.2 -3.8M276.1 88.3l4.3 -6.4M137.1 29.3l2.9 -9.3M254.4 102.4l1.1 -7.2" fill="none" stroke="#000" strokeWidth=".8" opacity=".2"></path>
              </g>
              <path d="M3 4.6L40 3L92 4.6L150 2.6L213 4.2L270 2.6L311 3.8L305.5 8.8L248 8L120 8.8L8 8.4Z" fill="url(#pk-nine-slabtop)"></path>
              <path d="M3 4.6L8 8.4L6.4 131L2 136L1.4 110L2.6 64L1.6 30Z" fill="#cfdde6" opacity=".08"></path>
              <path d="M340.8 20.6L336.6 24L337.8 147L341 150.6L340.6 126L342 86Z" fill="#cfdde6" opacity=".05"></path>
              <path d="M24 151.4L27.6 148L120 148.4L250 147.8L337.8 147L341 150.6L288 151.8L210 150.8L140 152L64 151Z" fill="#000" opacity=".46"></path>
              <path d="M8 8.4L120 8.8L248 8L305.5 8.8" fill="none" stroke="#000" strokeWidth=".8" opacity=".5"></path>
              <path d="M27.6 148L120 148.4L250 147.8L337.8 147" fill="none" stroke="#dfe9ee" strokeWidth=".5" opacity=".1"></path>
              <path d="M311 3.8L318.5 8.2L325 9L330.5 15.6L340.8 20.6L341.2 26.4L331 21.4L325 14.4L318 13.4L305.5 8.8Z" fill="url(#pk-nine-breaklit)" opacity=".66"></path>
              <path d="M325 14.4L331 21.4L335.6 23.6L328.4 15L325 9Z" fill="#000" opacity=".34"></path>
              <path d="M305.5 8.8L300 13.2L301.4 18.4L296.4 25.6" fill="none" stroke="#000" strokeWidth=".7" opacity=".62"></path>
              <path d="M305.8 9.6L300.8 13.6L302.2 18.8L297.2 26" fill="none" stroke="#dfe9ee" strokeWidth=".4" opacity=".24"></path>
              <path d="M24 151.4L19 147.2L11 146.2L7.5 140.6L2 136L2.2 131L10 136.8L13.6 142.2L21.4 143.2L27.6 148Z" fill="url(#pk-nine-breaklit)" opacity=".27"></path>
              <path d="M10 136.8L13 131.6L11.8 126.8" fill="none" stroke="#000" strokeWidth=".7" opacity=".55"></path>
            </svg>
            <svg className="pk-nine-slabhot" viewBox="0 0 343 156" preserveAspectRatio="none" aria-hidden="true">
              <path d="M24 150L341 149.6L341.4 154.8L288 155.8L210 155L140 155.9L64 155.1L30 155.8Z" fill="#ff6a2b" opacity=".26"></path>
              <g fill="none" stroke="#ff6a2b" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.6 30L2.6 64L1.4 110L2 136M341 150.6L340.6 126L342 86L340.8 20.6" strokeWidth="3" opacity=".14"></path>
                <path d="M1.6 30L2.6 64L1.4 110L2 136M341 150.6L340.6 126L342 86L340.8 20.6" strokeWidth=".9" opacity=".55"></path>
              </g>
            </svg>
            <div className="pk-nine-grid">
              {v.lines.map((item: any, itemIndex: number) => (
                <div key={itemIndex} className={`pk-nine-slot ${item.cls}`}>
                  <span className="pk-nine-blank" style={{ width: item.w } as React.CSSProperties} aria-hidden="true"></span>
                  {' '}
                  <span className="pk-nine-rule" style={{ width: item.r } as React.CSSProperties} aria-hidden="true"></span>
                  {' '}
                  <span className="pk-nine-txt" aria-hidden={item.hide}>{item.text}</span>
                  {' '}
                  <span className="pk-nine-burn" aria-hidden="true">
                    <span className="pk-nine-burnin">{item.text}</span>
                    <i className="pk-nine-hot"></i>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className={`pk-nine-cta ${v.ctaClass}`}>
            <button className="pk-nine-btn" data-cta="1" onClick={v.notify}>
              <span className="pk-nine-btnem" aria-hidden="true"></span>
              {' '}
              <span className="pk-nine-btndone" aria-hidden="true"></span>
              {' '}
              <span className="pk-nine-btnglint" aria-hidden="true"></span>
              {' '}
              <span className="pk-nine-btnflash" aria-hidden="true"></span>
              {' '}
              <span className={`pk-nine-btnlabel ${v.labelClass}`}>{v.ctaLabel}</span>
            </button>
            <div className="pk-nine-note">ARRIVING IN A FUTURE UPDATE</div>
            <span className="pk-nine-land" aria-hidden="true"></span>
            {' '}
            <span className="pk-nine-burst" aria-hidden="true">
              <span className="pk-nine-burstring"></span>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
        </div>
      </div>
      <div className="pk-nine-edges" aria-hidden="true">
        <span className="pk-nine-edgesin"></span>
      </div>
      <div className="pk-nine-grain" aria-hidden="true"></div>
    </div>
  );
}
