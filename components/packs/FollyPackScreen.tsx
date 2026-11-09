import React, { Fragment, useEffect, useRef } from 'react';
import { useMergedState } from './useMergedState';
import { usePackSounds, type PackMusic, type PackSoundFiles } from './packAudio';
import PackSoundToggle from './PackSoundToggle';
import '../../styles/packs/pack-folly.css';

const PK_SEG: Record<string, string> = {
  a: 'M2 1.25L3.2 0H8.8L10 1.25L8.8 2.5H3.2Z',
  b: 'M10.55 1.8L11.8 3.1V9.5L10.55 10.6L9.3 9.5V3.1Z',
  c: 'M10.55 11.4L11.8 12.5V18.9L10.55 20.2L9.3 18.9V12.5Z',
  d: 'M2 20.75L3.2 19.5H8.8L10 20.75L8.8 22H3.2Z',
  e: 'M1.45 11.4L2.7 12.5V18.9L1.45 20.2L.2 18.9V12.5Z',
  f: 'M1.45 1.8L2.7 3.1V9.5L1.45 10.6L.2 9.5V3.1Z',
  g: 'M2.3 11L3.3 9.9H5.1L5.6 11L5.1 12.1H3.3Z',
  h: 'M6.4 11L6.9 9.9H8.7L9.7 11L8.7 12.1H6.9Z',
  i: 'M6 3.1L7 4.1V8.9L6 9.9L5 8.9V4.1Z',
  l: 'M6 12.1L7 13.1V17.9L6 18.9L5 17.9V13.1Z',
};
const PK_GLYPH: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abghed', '3': 'abghcd', '4': 'fghbc', '5': 'afghcd', '6': 'afghcde', '7': 'abc', '8': 'abcdefgh', '9': 'abcdfgh', '$': 'afghcdil', A: 'abcefgh', L: 'def', O: 'abcdef', F: 'aefgh', I: 'adil', T: 'ail', ' ': '' };
const PK_GHOST = 'abcdefghil'.split('').map(k => PK_SEG[k]).join('');
const pkGlyph = (ch: string) => (PK_GLYPH[ch] || '').split('').map(k => PK_SEG[k]).join('');
const pkSlotX = (i: number) => 14 * i + (i >= 4 ? 4 : 0) + (i >= 7 ? 4 : 0);

const PK_TAKES = ['0', '1', '17', '84', '203', '611', '1204', '3377', '9999'];
const PK_LEAPS = [3200000, 11400000, 26000000, 48500000, 73000000, 109000000, 188000000];
const PK_LINES = [
  'Build a real city for one scene',
  'Shoot for twelve straight years',
  'Sell the jet to fund reel nine',
  'Mortgage the mansion for a storm',
  'Beg your director back to set',
  'Recast the lead in week 200',
  'Beat the all-time budget record',
  'Wait decades for a cult revival',
];

/* rendered by scripts/audio/render-pack-sounds.mjs from scripts/audio/packs/folly.mjs. tap.m4a cracks at 125 ms, where the arm lands; final.m4a floods at 545 ms, with the LED */
const FOLLY_SOUNDS: PackSoundFiles = {
  tap: () => new URL('../../assets/audio/packs/folly/tap.m4a', import.meta.url).href,
  final: () => new URL('../../assets/audio/packs/folly/final.m4a', import.meta.url).href,
  notify: () => new URL('../../assets/audio/packs/folly/notify.m4a', import.meta.url).href,
  click: () => new URL('../../assets/audio/packs/folly/click.m4a', import.meta.url).href,
};
/* the loop points are printed by the render: one period apart, inside the part of the file that repeats */
const FOLLY_MUSIC: PackMusic = {
  url: () => new URL('../../assets/audio/packs/folly/music.m4a', import.meta.url).href,
  loopStart: 9.498095,
  loopEnd: 30.831429,
};

interface FollyPackScreenProps {
  onBack: () => void;
}

export default function FollyPackScreen({ onBack }: FollyPackScreenProps) {
  const [state, set, latest] = useMergedState({ step: 0, slam: 0, budget: 41207318, flood: 'count', rolled: false, notified: false, listed: false, extra: 0, hinted: false, settled: false, teased: 0, pressed: false, ctaDown: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const last = useRef(0);
  const teaseAt = useRef(0);
  const finalAt = useRef(0);
  const racing = useRef(false);
  const race = useRef<ReturnType<typeof setInterval>>(undefined);
  const { play, soundOn, toggleSound, duckMusic, restoreMusic } = usePackSounds(FOLLY_SOUNDS, FOLLY_MUSIC);

  useEffect(() => {
    teaseAt.current = Date.now() - 2800;
    const tick = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (latest.current.step >= 8 || racing.current) return;
      const now = Date.now(), quiet = now - last.current > 5600 && now - teaseAt.current > 5600;
      if (quiet) teaseAt.current = now;
      const s = latest.current;
      set({ budget: s.budget + 1000 + Math.floor(Math.random() * 3400), teased: s.teased + (quiet ? 1 : 0) });
    }, 240);
    return () => {
      clearInterval(tick);
      clearInterval(race.current);
      racing.current = false;
      timers.current.forEach(timer => clearTimeout(timer));
      timers.current = [];
    };
  }, [latest, set]);

  const later = (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const leap = (amount: number) => {
    const from = latest.current.budget, start = Date.now(), dur = 460;
    racing.current = true;
    clearInterval(race.current);
    race.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const t = Math.min(1, (Date.now() - start) / dur), e = 1 - Math.pow(1 - t, 3);
      set({ budget: Math.round(from + amount * e) });
      if (t >= 1) { clearInterval(race.current); racing.current = false; }
    }, 40);
  };
  const impact = () => {
    const cur = latest.current.step;
    if (cur >= 8) { set({ extra: latest.current.extra + 1 }); return; }
    const next = cur + 1;
    if (next < 8) {
      set({ step: next });
      leap(PK_LEAPS[next - 1]);
      return;
    }
    clearInterval(race.current);
    racing.current = false;
    finalAt.current = Date.now();
    set({ step: 8, flood: 'eights' });
    later(() => set({ flood: 'all' }), 420);
    later(() => set({ rolled: true }), 1000);
  };
  const press = () => { if (!latest.current.pressed) set({ pressed: true }); };
  const release = () => { if (latest.current.pressed) set({ pressed: false }); };
  const ctaPress = () => { if (!latest.current.ctaDown && !latest.current.notified) set({ ctaDown: true }); };
  const ctaRelease = () => { if (latest.current.ctaDown) set({ ctaDown: false }); };
  const snap = () => {
    const now = Date.now();
    if (now - last.current < 150) return;
    // people hammer a clapper: the climax plays out before the slate answers again
    if (latest.current.step >= 8 && now - finalAt.current < 700) return;
    last.current = now;
    if (navigator.vibrate) navigator.vibrate(12);
    /* the crack sits at 125 ms in tap.m4a, on the arm's landing, and the delay keeps it there at any rate; an encore's slam lands at 212 ms */
    const step = latest.current.step;
    if (step >= 8) { const r = 1 + 8 * .016; play('tap', { rate: r, delay: .212 - .125 / r }); }
    else if (step === 7) { play('final'); duckMusic(); later(restoreMusic, 2200); }
    else { const r = 1 + (step + 1) * .016; play('tap', { rate: r, delay: .125 - .125 / r }); }
    set({ slam: latest.current.slam + 1, hinted: true, pressed: false, settled: latest.current.step >= 8 });
    later(() => impact(), latest.current.step >= 8 ? 212 : 125);
  };
  const notify = () => {
    if (latest.current.notified) return;
    if (navigator.vibrate) navigator.vibrate(20);
    play('notify');
    set({ notified: true, ctaDown: false });
    // press, burst, then the done words
    later(() => set({ listed: true }), 160);
  };

  const { step, slam, budget, flood, rolled, notified, listed, extra, hinted, settled, teased, pressed, ctaDown } = state;

  const lit: string[] = [];
  for (let i = 1; i <= step && i <= 8; i++) lit.push('pk-folly-l' + i);
  const rootClass = [
    'pk-folly-r' + step,
    lit.join(' '),
    slam > 0 ? 'pk-folly-hit-' + (slam % 2) : '',
    step >= 8 ? 'pk-folly-final' : '',
    step >= 5 ? 'pk-folly-storm' : '',
    settled ? 'pk-folly-settled' : '',
    hinted ? 'pk-folly-hinted' : '',
    teased > 0 ? 'pk-folly-tease-' + (teased % 2) : '',
    flood === 'all' ? 'pk-folly-flood' : '',
    pressed ? 'pk-folly-pressed' : '',
    notified ? 'pk-folly-noted' : '',
  ].filter(Boolean).join(' ');

  // the LED: ten slots, $ then nine digits, then it runs out of room
  let led: { tr: string; d: string }[], chars: string[] = [];
  if (flood === 'all') {
    // the counter gives up: seven big characters instead of ten small ones
    led = ([['A', 0], ['L', 18], ['L', 36], ['O', 62], ['F', 80], ['I', 106], ['T', 124]] as [string, number][]).map(([ch, x]) => ({ tr: 'translate(' + (x + 5) + ' 0) scale(1.3)', d: pkGlyph(ch) }));
  } else {
    chars = (flood === 'eights' ? '$888888888' : '$' + String(budget).padStart(9, ' ')).split('');
    led = chars.map((ch, i) => ({ tr: 'translate(' + pkSlotX(i) + ' 0)', d: pkGlyph(ch) }));
  }
  let commas = '';
  if (flood !== 'all') {
    if (chars[3] !== ' ') commas += 'M' + (pkSlotX(3) + 12.6) + ' 19.4h2.2v2.6l-1.6 2h-1z';
    if (chars[6] !== ' ') commas += 'M' + (pkSlotX(6) + 12.6) + ' 19.4h2.2v2.6l-1.6 2h-1z';
  }

  const slots = PK_LINES.map((text, i) => {
    const n = i + 1;
    const words = text.split(' ').map((t, j) => ({ t, d: (j * 0.062) + 's' }));
    const on = step >= n;
    return {
      words,
      text,
      blank: on || (hinted && step === i) ? 'pk-folly-hide' : '',
      cls: on ? ('pk-folly-on' + (step === n ? ' pk-folly-newline' : '')) : '',
      next: hinted && step === i && step > 0 && step < 8,
    };
  });

  const take = extra > 0 ? String(9999 + extra) : PK_TAKES[step];
  const label = listed ? "You're on the call sheet" : (rolled ? 'Keep rolling' : 'Notify me on release');
  const t = (n: number) => (step >= n ? 'pk-folly-tn' : '');

  const v = {
    step, take, led, commas, ghost: PK_GHOST, slots, snap, notify,
    press, release, ctaPress, ctaRelease,
    rootClass, listed, notListed: !listed,
    t1: t(1), t2: t(2), t3: t(3), t4: t(4), t5: t(5), t6: t(6), t7: t(7), t8: t(8),
    ctaLabel: label,
    labelClass: listed ? 'pk-folly-ctaflipb' : (rolled ? 'pk-folly-ctaflip' : ''),
    overClass: Math.floor(Date.now() / 480) % 3 === 2 ? 'pk-folly-dim' : '',
    ledLabel: step >= 8 ? 'Budget: all of it' : 'Budget counter, climbing',
    boardLabel: 'Snap the slate. Take ' + take + '.' + (step ? ' On the slate: ' + PK_LINES.slice(0, step).join('. ') + '.' : ''),
    ctaClass: listed ? 'pk-folly-done' : (ctaDown ? 'pk-folly-ctadown' : ''),
    burstClass: notified ? 'pk-folly-go' : '',
  };
  return (
    <div className={`pk-folly-root ${v.rootClass}`} style={{ '--s': v.step } as React.CSSProperties}>
      <svg className="pk-folly-defs" aria-hidden="true">
        <defs>
          <filter id="pk-folly-wood" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".012 .62" numOctaves="4" seed="4" result="n"></feTurbulence>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .09  0 0 0 0 .055  0 0 0 0 .03  0 0 0 3 -1.25" result="g"></feColorMatrix>
            <feComposite in="g" in2="SourceAlpha" operator="in" result="c"></feComposite>
            <feMerge>
              <feMergeNode in="SourceGraphic"></feMergeNode>
              <feMergeNode in="c"></feMergeNode>
            </feMerge>
          </filter>
          <filter id="pk-folly-chip" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".035 .5" numOctaves="4" seed="17" result="n"></feTurbulence>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 16 -10" result="h"></feColorMatrix>
            <feComposite in="SourceGraphic" in2="h" operator="out"></feComposite>
          </filter>
          <filter id="pk-folly-chip2" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".03 .55" numOctaves="4" seed="41" result="n"></feTurbulence>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 16 -10.2" result="h"></feColorMatrix>
            <feComposite in="SourceGraphic" in2="h" operator="out"></feComposite>
          </filter>
          <filter id="pk-folly-rough" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".07 .16" numOctaves="3" seed="8" result="n"></feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4.2" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
          </filter>
          <filter id="pk-folly-haze" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".011 .04" numOctaves="4" seed="23" result="n"></feTurbulence>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .9  0 0 0 0 .89  0 0 0 0 .82  1.9 0 0 0 -.74"></feColorMatrix>
          </filter>
          <radialGradient id="pk-folly-smear" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fff3cf" stopOpacity=".72"></stop>
            <stop offset=".45" stopColor="#fff3cf" stopOpacity=".3"></stop>
            <stop offset="1" stopColor="#fff3cf" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-folly-smeard" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#050807" stopOpacity=".66"></stop>
            <stop offset=".6" stopColor="#050807" stopOpacity=".36"></stop>
            <stop offset="1" stopColor="#050807" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-folly-wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b79868"></stop>
            <stop offset=".16" stopColor="#94754c"></stop>
            <stop offset=".62" stopColor="#6d5234"></stop>
            <stop offset="1" stopColor="#3f2e1d"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-ss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffbe8" stopOpacity=".46"></stop>
            <stop offset=".12" stopColor="#fffbe8" stopOpacity=".1"></stop>
            <stop offset=".45" stopColor="#000" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".56"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-end" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".1"></stop>
            <stop offset=".34" stopColor="#000" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".42"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-paint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f2522"></stop>
            <stop offset=".5" stopColor="#181d1a"></stop>
            <stop offset="1" stopColor="#121614"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6d9cf"></stop>
            <stop offset=".45" stopColor="#7f837c"></stop>
            <stop offset="1" stopColor="#3a3d39"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-rust" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a4552a" stopOpacity=".85"></stop>
            <stop offset="1" stopColor="#a4552a" stopOpacity="0"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050706" stopOpacity=".05"></stop>
            <stop offset=".6" stopColor="#050706" stopOpacity=".38"></stop>
            <stop offset="1" stopColor="#050706" stopOpacity=".12"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-washl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e4ead9" stopOpacity=".05"></stop>
            <stop offset=".3" stopColor="#e4ead9" stopOpacity=".18"></stop>
            <stop offset="1" stopColor="#e4ead9" stopOpacity=".3"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-rd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8ecdf" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#e8ecdf" stopOpacity=".62"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-wall" gradientUnits="userSpaceOnUse" x1="0" y1="390" x2="0" y2="690">
            <stop offset="0" stopColor="#4a5b4e"></stop>
            <stop offset=".3" stopColor="#303d35"></stop>
            <stop offset="1" stopColor="#18211c"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-archs" gradientUnits="userSpaceOnUse" x1="0" y1="406" x2="0" y2="660">
            <stop offset="0" stopColor="#57695b"></stop>
            <stop offset=".3" stopColor="#3d4c41"></stop>
            <stop offset=".62" stopColor="#26322b"></stop>
            <stop offset="1" stopColor="#151d19"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-archf" gradientUnits="userSpaceOnUse" x1="0" y1="410" x2="0" y2="600">
            <stop offset="0" stopColor="#c0cfbc" stopOpacity=".5"></stop>
            <stop offset=".4" stopColor="#c0cfbc" stopOpacity=".3"></stop>
            <stop offset="1" stopColor="#c0cfbc" stopOpacity="0"></stop>
          </linearGradient>
          <radialGradient id="pk-folly-archr" gradientUnits="userSpaceOnUse" cx="78" cy="456" r="120">
            <stop offset="0" stopColor="#667665"></stop>
            <stop offset=".42" stopColor="#303c33"></stop>
            <stop offset="1" stopColor="#0d1411"></stop>
          </radialGradient>
          <linearGradient id="pk-folly-tarpg" gradientUnits="userSpaceOnUse" x1="0" y1="398" x2="0" y2="490">
            <stop offset="0" stopColor="#7b4325"></stop>
            <stop offset="1" stopColor="#3d2112"></stop>
          </linearGradient>
          <radialGradient id="pk-folly-tarpl" gradientUnits="userSpaceOnUse" cx="327" cy="436" r="52">
            <stop offset="0" stopColor="#f5f0dc" stopOpacity=".25"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-folly-tarpn" gradientUnits="userSpaceOnUse" cx="327" cy="432" r="47">
            <stop offset="0" stopColor="#c97a48" stopOpacity=".72"></stop>
            <stop offset=".5" stopColor="#a4552a" stopOpacity=".36"></stop>
            <stop offset="1" stopColor="#7b4325" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-folly-tarpe" gradientUnits="userSpaceOnUse" cx="327" cy="432" r="47">
            <stop offset="0" stopColor="#f3bf95" stopOpacity=".5"></stop>
            <stop offset="1" stopColor="#f3bf95" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-folly-archd" gradientUnits="userSpaceOnUse" x1="0" y1="436" x2="0" y2="512">
            <stop offset="0" stopColor="#050807" stopOpacity=".7"></stop>
            <stop offset=".55" stopColor="#050807" stopOpacity=".42"></stop>
            <stop offset="1" stopColor="#050807" stopOpacity=".3"></stop>
          </linearGradient>
          <radialGradient id="pk-folly-archl" gradientUnits="userSpaceOnUse" cx="78" cy="462" r="74">
            <stop offset="0" stopColor="#fff1c8" stopOpacity=".42"></stop>
            <stop offset=".46" stopColor="#f5f0dc" stopOpacity=".18"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-folly-archg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c8" stopOpacity=".56"></stop>
            <stop offset=".6" stopColor="#f5f0dc" stopOpacity=".16"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </linearGradient>
          <linearGradient id="pk-folly-sl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="480" y2="0">
            <stop offset="0" stopColor="#f5f0dc" stopOpacity=".66"></stop>
            <stop offset=".12" stopColor="#f5f0dc" stopOpacity=".5"></stop>
            <stop offset=".2" stopColor="#f5f0dc" stopOpacity=".12"></stop>
            <stop offset=".8" stopColor="#f5f0dc" stopOpacity=".12"></stop>
            <stop offset=".88" stopColor="#f5f0dc" stopOpacity=".5"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity=".66"></stop>
          </linearGradient>
          <radialGradient id="pk-folly-bulb" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#ffffff"></stop>
            <stop offset=".6" stopColor="#fffbe4"></stop>
            <stop offset="1" stopColor="#fff3c4"></stop>
          </radialGradient>
          <radialGradient id="pk-folly-halo" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fbf6e0" stopOpacity=".9"></stop>
            <stop offset=".22" stopColor="#f5f0dc" stopOpacity=".4"></stop>
            <stop offset=".55" stopColor="#f5f0dc" stopOpacity=".12"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-folly-cn" gradientUnits="userSpaceOnUse" cx="400" cy="0" r="720">
            <stop offset="0" stopColor="#f5f0dc" stopOpacity=".46"></stop>
            <stop offset=".22" stopColor="#f5f0dc" stopOpacity=".18"></stop>
            <stop offset=".62" stopColor="#f5f0dc" stopOpacity=".08"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </radialGradient>
          <path id="pk-folly-frond" d="M0.0 -1.7L6.7 -7.9L13.3 -13.6L20.0 -18.5L26.7 -22.3L33.3 -24.8L40.0 -25.8L46.7 -25.2L53.3 -23.0L60.0 -19.3L66.7 -14.1L73.3 -7.8L80.0 -0.6L80.0 -0.2L73.3 -7.2L66.7 -13.2L60.0 -18.1L53.3 -21.6L46.7 -23.6L40.0 -23.9L33.3 -22.7L26.7 -19.9L20.0 -15.8L13.3 -10.7L6.7 -4.7L0.0 1.7ZM4.7 -4.0L5.8 -11.8L7.5 -7.1ZM4.2 -4.5L16.4 -4.6L7.5 -7.1ZM9.1 -8.1L12.0 -21.9L12.0 -11.0ZM8.7 -8.6L26.4 -7.5L12.0 -11.0ZM13.5 -11.9L19.2 -28.8L16.4 -14.6ZM13.1 -12.4L39.5 -10.5L16.4 -14.6ZM18.0 -15.3L27.4 -31.8L20.9 -17.8ZM17.6 -15.9L45.9 -14.2L20.9 -17.8ZM22.4 -18.4L33.4 -35.2L25.4 -20.5ZM22.1 -18.9L47.6 -14.3L25.4 -20.5ZM26.8 -20.8L40.1 -39.2L29.9 -22.7ZM26.5 -21.4L57.1 -14.0L29.9 -22.7ZM31.2 -22.8L46.3 -38.0L34.4 -24.1ZM31.0 -23.3L59.2 -14.4L34.4 -24.1ZM35.6 -24.0L54.9 -38.2L38.9 -24.9ZM35.5 -24.6L65.1 -11.1L38.9 -24.9ZM40.0 -24.6L59.9 -33.5L43.2 -24.9ZM40.0 -25.1L63.1 -8.1L43.2 -24.9ZM44.4 -24.5L63.1 -27.6L47.5 -24.3ZM44.5 -25.0L64.1 -7.7L47.5 -24.3ZM48.8 -23.6L68.6 -25.5L51.8 -23.0ZM49.0 -24.1L63.8 -5.8L51.8 -23.0ZM53.2 -22.1L71.2 -20.7L56.0 -21.1ZM53.4 -22.5L65.4 -3.9L56.0 -21.1ZM57.7 -19.9L73.2 -14.8L60.1 -18.6ZM57.9 -20.3L70.2 -0.5L60.1 -18.6ZM62.1 -17.0L73.6 -13.2L64.3 -15.6ZM62.4 -17.3L70.3 1.0L64.3 -15.6ZM66.5 -13.5L75.3 -9.6L68.6 -12.0ZM66.8 -13.8L73.2 -0.0L68.6 -12.0ZM71.0 -9.5L78.6 -5.2L72.8 -8.0ZM71.3 -9.8L74.5 0.7L72.8 -8.0ZM75.4 -5.1L79.1 -2.6L77.1 -3.6ZM75.7 -5.3L78.0 2.0L77.1 -3.6Z"></path>
        </defs>
      </svg>
      <div className="pk-folly-clip">
        <div className="pk-folly-stage">
          <div className="pk-folly-layer pk-folly-sky" aria-hidden="true"></div>
          {/* far jungle, in the haze */}
          <svg className="pk-folly-art" style={{ zIndex: '1' } as React.CSSProperties} viewBox="0 0 375 812" aria-hidden="true">
            <path fill="#404f43" d="M-120 444L-119.6 442.6L-117.5 433.1L-115.2 424.6L-113 423.6L-110.9 416L-107.6 417.7L-106.1 413.1L-103.4 416.5L-100.5 415.9L-98.9 422.6L-96.7 423.6L-94.3 432L-91.8 441.6L-97.2 442.5L-94.5 435.9L-92.2 426.5L-88.8 426.2L-87 418.5L-83.9 423.2L-81.9 418.7L-79.8 423.5L-77 423.1L-74.3 430.2L-71.5 431.7L-69.3 444.9L-74.9 442.1L-73.2 432.5L-69.9 421.6L-67.7 421L-65.1 412.8L-62.5 416L-60.2 413.9L-57.3 418.3L-54.8 418.5L-53.1 426.7L-49.7 428.6L-47.9 444.6L-52.6 442.2L-49.9 437L-47.2 429.2L-44.8 430.9L-42.5 425.4L-40.5 429L-38 424.5L-35 430.6L-32.8 429.3L-30.8 437L-28.1 443L-29.8 442L-27.5 435.9L-25.1 428.8L-22.9 430.5L-20.3 424.4L-18 425.6L-15.4 422.1L-13.1 424.8L-11.1 421.7L-9.2 428.6L-6.4 424.8L-3.8 433.8L-1.7 434.4L0.7 443.6L-4.3 442.4L-1.2 436.7L1.4 431L3.9 432.6L6.1 429.7L8.4 434.2L11.4 433L13.2 444.2L12.3 442.2L14.3 434.1L16.6 423L19.7 425.3L21.6 417.5L23.9 422.3L26.8 419.4L29.2 424.4L31 423.8L33.2 433.2L35.6 442.6L33.4 442.8L35.8 437.5L38 430.8L39.9 432.3L42.6 425.5L45.5 429.8L48.1 422.9L50.2 428.1L52.3 425.4L54.6 429.4L57.5 426.6L59.9 433.9L62.6 434.9L64.5 444.3L59.5 442.7L62.7 426.6L64.6 412.9L67.9 416.1L70.6 414.2L72.8 425.5L75.5 442L288 444L287.8 440.6L290.1 435.8L292.7 426.7L295.2 429.7L298 425L299.7 427.2L302.9 424.5L304.9 432.3L307.6 431.9L310.1 441.9L304.1 439.9L306 435.4L308.7 426.2L311.4 427.6L313.8 421.8L315.4 425.7L317.8 422.9L320.6 426.8L322.9 426.5L324.9 434.2L327 441.4L325.3 441.1L327.9 434.9L330.6 428.1L332.2 430.8L335 423.5L336.8 427.6L339.7 423.7L342.1 427.1L343.7 423.1L346.2 429.7L349 426.9L350.7 433.3L353.9 432.8L355.7 442.7L352.1 441.1L355.1 429.1L357.6 418.2L359.8 416.8L361.6 409.5L364.9 412.6L367.3 410.4L368.8 416.7L371.8 417.7L374.4 428.9L376 440.1L369.5 440.1L372.5 434.1L374.5 426.6L377.8 429.2L380.1 424.7L382.5 431.4L384.7 430.4L387.3 442.3L386 440.8L388.8 434.1L391.3 425.3L393.7 424.8L395.9 416.9L398.6 421.8L400.9 417.8L403.8 425.2L406.1 422.7L409.1 431.9L411.1 440.1L408.3 440.1L410.3 432L412.9 421.3L415 421.5L417.5 415.9L420 417.6L422.3 411.7L424.2 415.8L426.6 413.6L429.3 419.6L431.4 418.2L433.7 426.2L435.9 428.7L438.5 443L435.2 439.9L438.2 430.1L440.8 418L442.9 417L445.6 409.3L448 412.6L450.1 409.4L452.8 417.7L455.4 418.1L457.7 428.4L460 439.2L454.3 440.9L456.6 425.8L458.6 414.4L460.8 415.3L463 411.2L465.8 419.2L468.6 421.2L470.6 442.4L466.6 441.1L469.2 425.3L471.3 413.1L474.2 412.8L476.4 406.6L478.7 410.8L481.9 409.1L484.1 416.1L486.3 421.6L489.2 441.9L483.3 441L485.3 435.7L487.9 430L491.2 429.3L493.1 424.8L495.4 427.2L498.1 423.1L500.9 426.7L502.7 421.7L505.2 428.1L507.9 427.4L510 431.7L512.8 432.4L515.6 441.6L512.2 440L514.6 430.3L517.2 420.7L518.7 420.8L521.8 418.2L523.8 422.2L526.6 425.9L528.7 442.2L527.7 439.7L529.8 429.9L532.5 420.8L534.8 418.7L537 414.1L539.3 417L541.9 414.8L544.3 423.7L546.1 425.4L549 443V780H-120Z"></path>
            <path fill="#2a372f" d="M-120 486L-120.2 483.7L-117.1 477.8L-115.1 469.8L-112.2 468.7L-110.1 464.6L-107.3 467L-105.3 462.8L-102.2 470.4L-99.8 469.7L-97.5 477.2L-95 483.8L-98.9 484.3L-96 478.4L-94 470.8L-91.5 473.9L-89 467.9L-86.1 473L-83.8 471L-81 477.1L-79.5 484.7L-81.3 484.4L-78.5 479.1L-76.1 471.2L-73.7 472L-72.1 465.8L-69.6 468.4L-66.9 465.1L-64.6 470.6L-62.3 466.1L-60.5 471.2L-57.6 472.5L-55.6 478.3L-52.9 484L-58.9 484.1L-56.3 481.6L-54.7 473.2L-52 477.4L-49.3 469.3L-47.3 474.3L-44.7 471L-42.3 475.5L-39.6 473.8L-37.4 480.5L-34.6 484L-37.7 484.1L-35.8 468.6L-32.8 458.8L-30.6 460L-27.7 458.3L-25.2 469.8L-22.5 484.7L-26.6 484.7L-24.1 479.1L-21.9 473.3L-19.8 474.1L-17.2 466.9L-14.6 469.2L-12.3 464.7L-9.7 470.7L-7.7 467L-5.2 473L-1.9 469.5L-0.3 477.3L2.2 477.5L4.8 486L0.7 484.6L3.3 476.6L6.5 467.4L8.9 468.1L10.9 461.6L13.7 467.2L16.7 465.5L19 474.2L21.3 485.1L17.6 484.4L19.8 470.7L22.3 459.1L24.6 459.4L27.4 456.2L29.5 464.4L32.2 466.7L33.9 486.4L29.3 484L32.4 476.4L33.9 465.9L36.9 466.9L38.7 460.2L41.2 463.3L43.9 457.6L46.1 461.8L47.9 461.5L50.5 467.6L52.5 466.1L55.6 474.8L57.8 485.5L54.7 484.4L56.8 478.8L58.8 470.4L61.7 472.1L64.3 466.8L66.4 470.3L68.7 469.5L72.1 474.1L74.3 475.5L76.8 485.6L288 484L287.7 480.3L290.9 472.8L292.4 464.7L295.1 464.9L297.8 458.7L299.6 462.1L302.1 459.1L304.7 462.8L306.8 462.7L309 468.9L311.8 471L314.5 483.1L309.9 480L312.6 476L314.4 469.4L317.1 469.5L318.9 464.6L321.1 466.9L323.8 461.3L325.9 467L328.9 462.3L331.1 468.7L333.1 465.2L335.4 472.4L338.4 473.6L340.2 482.4L336.2 480.3L338.8 468.7L341.4 459.9L344.7 462.7L346.9 459.6L349.3 468.8L352.4 481.5L350.3 480.4L352.3 473.4L355.1 463.2L357 464.8L359.7 458.4L361.6 462.5L364.3 461.4L366.5 466.9L369.4 467.7L371.6 482.8L365.9 480.1L368.1 466.9L371.4 458L373.6 457.4L375.8 453.1L379.1 460.3L381.2 464.9L384 482.6L381.3 480.3L383.9 475.6L385.9 468.4L388.1 470L390.9 463.8L393.4 465.1L395.1 461.8L398.1 463.9L399.7 459.9L402.1 466.4L404.2 463.2L407 469.9L409.4 468.8L411.2 476.6L413.7 480.8L408 480.6L410.6 472.9L413 466.3L415.1 465.5L417.2 459.1L419.6 460.2L421.8 457L424.4 461.9L426.7 456.3L429.4 461.6L430.9 461.3L433.7 467.9L436.4 471.5L438.4 483.3L433.6 479.7L436.5 466.7L439.6 454.4L441.9 455L444.5 450.3L446.5 457.6L449.4 461.6L452.4 482.8L447.7 479.7L449.6 473.3L452.5 466.9L454.6 466.4L457.1 458.4L459.1 461.9L461.5 457.2L463.8 459.6L466.5 455.7L467.8 461.7L471.1 459L472.5 465.5L475.6 465.7L478.1 474.8L479.7 480.3L475.6 479.9L477.7 472.6L480.5 463L482.7 465.7L485 459.3L487.1 462.4L489.6 458.8L492.2 464.9L494.7 465.6L496.8 473.9L499.1 480L493 480.7L495.4 474.8L498.1 467.4L500.4 466.9L502.8 462.4L504.4 466.5L506.8 462.3L509.9 469.5L512.3 467.3L514.5 474.7L517.1 479.7L512.8 480.4L515 473.5L517.8 464.7L520.1 463.2L522.8 456.7L524.6 460.3L527.7 453.9L529.6 457.5L531.7 454.2L534.4 462.4L537.2 460.4L539.6 467.3L541.5 469.8L544.4 481.6V780H-120Z"></path>
          </svg>
          <div className="pk-folly-layer pk-folly-palacewrap" aria-hidden="true">
            <svg className="pk-folly-art" viewBox="0 0 375 812">
              {/* dome skeleton, half clad */}
              <g fill="none" strokeLinecap="round">
                <g stroke="#2d3b33" strokeWidth="1.2">
                  <path d="M31 128Q140 112 249 128"></path>
                  <path d="M56 93Q140 82 224 93"></path>
                  <path d="M86 68Q140 61 194 68"></path>
                  <path d="M75 172C68 112 108 72 140 36"></path>
                  <path d="M205 172C212 112 172 72 140 36"></path>
                </g>
                {/* clad panels on the left shoulder */}
                <g fill="#18211c" stroke="none">
                  <path d="M31 128C36 112 46 102 56 93L79.5 96.1C70 106 64 118 61.5 132.3Z"></path>
                  <path d="M61.5 132.3C64 118 70 106 79.5 96.1L108 98.6C102 108 99 122 98.6 135.7Z"></path>
                  <path d="M56 93C66 84 76 76 86 68L101 70.2C92 78 85 86 79.5 96.1Z"></path>
                  <path d="M125 77C127 68 132 60 137 52L140 51V76Z" fill="#141c18"></path>
                </g>
                <g stroke="#121b16" strokeWidth="3">
                  <path d="M28 172C15 112 78 72 140 36"></path>
                  <path d="M59 172C50 112 95 72 140 36"></path>
                  <path d="M97 172C92 112 116 72 140 36"></path>
                  <path d="M140 172V36"></path>
                  <path d="M183 172C188 112 164 72 140 36"></path>
                  <path d="M221 172C230 112 185 72 140 36"></path>
                  <path d="M252 172C265 112 202 72 140 36"></path>
                </g>
                <g stroke="#121b16" strokeWidth="2.2">
                  <path d="M31 128Q140 146 249 128"></path>
                  <path d="M56 93Q140 106 224 93"></path>
                  <path d="M86 68Q140 77 194 68"></path>
                  <path d="M112 51Q140 56 168 51"></path>
                </g>
                <g stroke="#121b16" strokeWidth="1">
                  <path d="M116 136L140 104L164 136M164 101L191 133M191 96L164 136M209 92L232 126"></path>
                </g>
                <g stroke="#93a596" strokeWidth=".8" strokeOpacity=".7">
                  <path d="M27.4 150C18 108 78 70 139 35.4"></path>
                  <path d="M58 150C52 108 95 70 139 35.4"></path>
                  <path d="M96 150C92 108 116 70 139.5 35.4"></path>
                  <path d="M32 127Q140 145 248 127"></path>
                  <path d="M57 92Q140 105 223 92"></path>
                  <path d="M87 67Q140 76 193 67"></path>
                  <path d="M113 50Q140 55 167 50"></path>
                </g>
                <path d="M140 36V14" stroke="#0d1411" strokeWidth="2.2"></path>
                <path d="M132 44C134 38 137 36 140 34C143 36 146 38 148 44Z" fill="#0d1411"></path>
              </g>
              {/* arcade: finished on the left, bare at the right end */}
              <path fill="url(#pk-folly-wall)" d="M46 396H302L299 432L304 470L298 524L303 590L299 720H46Z"></path>
              <path fill="#57695b" d="M38 402H104L101 406H38ZM270 402H310V406H273Z"></path>
              <path fill="#0d1411" d="M38 406H101L99 410H38ZM273 406H308V410H275Z" opacity=".42"></path>
              <path fill="#0d1411" d="M46 470H300V473H46Z" opacity=".3"></path>
              <path fill="none" stroke="#0a100d" strokeOpacity=".2" strokeWidth=".7" d="M46 412H300M46 426H300M46 440H300M46 454H300M46 488H300M46 504H300M46 520H300M46 538H300M46 556H300M46 576H300"></path>
              <g fill="#0a100d" fillOpacity=".16">
                <rect x="50" y="400" width="5" height="120" rx="2.5"></rect>
                <rect x="104" y="400" width="7" height="170" rx="3.5"></rect>
                <rect x="158" y="400" width="6" height="96" rx="3"></rect>
                <rect x="216" y="400" width="7" height="150" rx="3.5"></rect>
                <rect x="272" y="400" width="6" height="190" rx="3"></rect>
              </g>
              {/* the finished arch: carved surround, then the thickness of the wall lit by its lamp, then the dark doorway */}
              <path fill="url(#pk-folly-archs)" d="M52 720V479C52 447 67 440 78 409C89 440 104 447 104 479V720Z"></path>
              <path fill="none" stroke="#070b09" strokeOpacity=".62" strokeWidth="1.1" d="M52 720V479C52 447 67 440 78 409C89 440 104 447 104 479V720"></path>
              <path fill="none" stroke="url(#pk-folly-archf)" strokeWidth=".7" d="M52.8 600V479C52.8 448 67.6 441 78 411C88.4 441 103.2 448 103.2 479V600"></path>
              <path fill="url(#pk-folly-archr)" d="M59 720V478C59 452 71 444 78 420C85 444 97 452 97 478V720Z"></path>
              <path fill="#060a08" d="M65.5 720V481C65.5 460 76 451 80 435C84 451 94.5 460 94.5 481V720Z"></path>
              <path fill="none" stroke="url(#pk-folly-archf)" strokeWidth=".7" d="M65.5 600V481C65.5 460 76 451 80 435"></path>
              <path fill="#6d7f70" d="M74.6 406H81.4L80.2 425H75.8Z"></path>
              <path fill="none" stroke="#d3dfca" strokeOpacity=".6" strokeWidth=".6" d="M74.8 406.4H81.2M75 407L76 424.4"></path>
              <g fill="#0a100d" fillOpacity=".46">
                <path d="M115 720V478C115 458 127 452 134 438C141 452 153 458 153 478V720Z"></path>
                <path d="M171 720V478C171 458 183 452 190 438C197 452 209 458 209 478V720Z"></path>
                <path d="M227 720V478C227 458 239 452 246 438C253 452 265 458 265 478V720Z"></path>
              </g>
              {/* the carving stops part way along the arcade: this set was never finished */}
              <g fill="none" stroke="#a7b8a6" strokeWidth=".7">
                <path strokeOpacity=".3" d="M110 720V478C110 457 123 451 134 433C145 451 158 457 158 478V720"></path>
                <path strokeOpacity=".24" d="M166 720V478C166 457 179 451 190 433C194 441 198 446 203 449"></path>
              </g>
              <path fill="none" stroke="#8ba08f" strokeOpacity=".5" strokeWidth=".9" d="M59 478C59 452 71 444 78 420C85 444 97 452 97 478"></path>
              {/* scaffold: poles, ledgers, the odd brace */}
              <g fill="none" stroke="#141d18" strokeWidth="2" strokeLinecap="round">
                <path d="M25 62V720M351 92V720"></path>
                <path d="M8 62V720M369 92V720" strokeWidth="3"></path>
                <g strokeWidth="1.3" strokeOpacity=".8">
                  <path d="M2 110H31M2 176H31M2 242H31M2 308H31M2 374H31M2 440H31"></path>
                  <path d="M345 138H375M345 204H375M345 270H375M345 336H375M345 402H375M345 468H375"></path>
                </g>
                <g strokeWidth=".9" strokeOpacity=".7">
                  <path d="M8 110L25 176M25 242L8 308M8 374L25 440M351 138L369 204M369 270L351 336M351 402L369 468"></path>
                </g>
                <g strokeWidth="1.9">
                  <path d="M306 396V720M344 396V720M300 396H352M300 440H352M300 486H352M300 532H352"></path>
                </g>
                <path d="M306 440L344 486" strokeWidth="1"></path>
              </g>
              <g fill="none" stroke="#93a596" strokeOpacity=".32" strokeWidth=".7">
                <path d="M24.2 62V720M351.8 92V720M305.2 396V720"></path>
                <path d="M9.1 62V720M367.9 92V720" strokeOpacity=".44"></path>
              </g>
              {/* planks laid across the ledgers */}
              <g>
                <g transform="rotate(-1.1 15 108)">
                  <rect x="0" y="106.5" width="31" height="3.5" rx=".7" fill="#5b4630"></rect>
                  <path d="M.4 106.9H30.6" stroke="#cbb07e" strokeOpacity=".9" strokeWidth=".8"></path>
                  <path d="M.4 110.5H30.6" stroke="#080d0b" strokeOpacity=".5" strokeWidth="1"></path>
                </g>
                <g transform="rotate(.9 12 240)">
                  <rect x="-3" y="238.5" width="30" height="3.5" rx=".7" fill="#513e2a"></rect>
                  <path d="M-2.6 238.9H26.6" stroke="#bfa372" strokeOpacity=".85" strokeWidth=".8"></path>
                  <path d="M-2.6 242.5H26.6" stroke="#080d0b" strokeOpacity=".5" strokeWidth="1"></path>
                </g>
                <g transform="rotate(.8 362 202)">
                  <rect x="347" y="200.5" width="30" height="3.5" rx=".7" fill="#5b4630"></rect>
                  <path d="M347.4 200.9H376.6" stroke="#cbb07e" strokeOpacity=".9" strokeWidth=".8"></path>
                  <path d="M347.4 204.5H376.6" stroke="#080d0b" strokeOpacity=".5" strokeWidth="1"></path>
                </g>
              </g>
              {/* clamps where the tubes cross */}
              <g fill="#0e1512">
                <circle cx="8" cy="176" r="2.3"></circle>
                <circle cx="25" cy="176" r="1.7"></circle>
                <circle cx="8" cy="308" r="2.3"></circle>
                <circle cx="25" cy="242" r="1.7"></circle>
                <circle cx="8" cy="374" r="2.3"></circle>
                <circle cx="369" cy="138" r="2.3"></circle>
                <circle cx="351" cy="138" r="1.7"></circle>
                <circle cx="369" cy="270" r="2.3"></circle>
                <circle cx="351" cy="270" r="1.7"></circle>
                <circle cx="369" cy="336" r="2.3"></circle>
                <circle cx="351" cy="402" r="1.7"></circle>
              </g>
              <g fill="#b4c3b2" fillOpacity=".62">
                <circle cx="8.7" cy="175.4" r=".7"></circle>
                <circle cx="8.7" cy="307.4" r=".7"></circle>
                <circle cx="8.7" cy="373.4" r=".7"></circle>
                <circle cx="368.3" cy="137.4" r=".7"></circle>
                <circle cx="368.3" cy="269.4" r=".7"></circle>
                <circle cx="368.3" cy="335.4" r=".7"></circle>
              </g>
              {/* rust tarp slung off the bare corner, lit by the lamp hanging in front of it */}
              <path fill="url(#pk-folly-tarpg)" d="M308 398C318 401 334 401 346 397L349 474C344 488 338 476 332 488C324 498 318 482 310 490Z"></path>
              <path fill="url(#pk-folly-tarpl)" d="M308 398C318 401 334 401 346 397L349 474C344 488 338 476 332 488C324 498 318 482 310 490Z"></path>
              <path fill="none" stroke="#2a1508" strokeOpacity=".55" strokeWidth="1" d="M328 402C330 430 326 462 330 488"></path>
              <path fill="none" stroke="#190b04" strokeOpacity=".28" strokeWidth="4.4" d="M314 401C312 430 316 458 313 486M342 401C344 430 340 456 345 478"></path>
              <path fill="none" stroke="#190b04" strokeOpacity=".92" strokeWidth="1.6" d="M316 401C314 430 318 458 315 486M340 401C342 430 338 456 343 478"></path>
              <path fill="none" stroke="#f3bf95" strokeOpacity=".5" strokeWidth=".8" d="M317.2 402C315.2 430 319.2 458 316.2 485M338.8 402C340.8 430 336.8 456 341.8 477"></path>
            </svg>
          </div>
          <div className="pk-folly-layer pk-folly-night" aria-hidden="true"></div>
          {/* bulb strings: more switched on with every take, then all of them */}
          <div className="pk-folly-layer pk-folly-bulbs" aria-hidden="true">
            <div className="pk-folly-domeglow"></div>
            <svg className="pk-folly-art" viewBox="0 0 375 812">
              <defs>
                <path id="pk-folly-s1" d="M59 478C59 452 71 444 78 420C85 444 97 452 97 478"></path>
                <path id="pk-folly-s2" d="M351 440V300"></path>
                <path id="pk-folly-s3" d="M25 450V300"></path>
                <path id="pk-folly-s4" d="M306 396V486M344 396V486"></path>
                <path id="pk-folly-s5" d="M351 300V100"></path>
                <path id="pk-folly-s6" d="M25 300V70"></path>
                <path id="pk-folly-s7" d="M40 404H98M272 404H308"></path>
                <g id="pk-folly-sa">
                  <path d="M31 128Q140 146 249 128"></path>
                  <path d="M56 93Q140 106 224 93"></path>
                </g>
                <g id="pk-folly-sb">
                  <path d="M28 172C15 112 78 72 140 36"></path>
                  <path d="M59 172C50 112 95 72 140 36"></path>
                  <path d="M97 172C92 112 116 72 140 36"></path>
                  <path d="M140 172V36"></path>
                  <path d="M183 172C188 112 164 72 140 36"></path>
                  <path d="M221 172C230 112 185 72 140 36"></path>
                  <path d="M252 172C265 112 202 72 140 36"></path>
                </g>
                <g id="pk-folly-sc">
                  <path d="M86 68Q140 77 194 68"></path>
                  <path d="M112 51Q140 56 168 51"></path>
                  <path d="M140 36V10"></path>
                </g>
              </defs>
              <g className="pk-folly-tarpn">
                <path fill="url(#pk-folly-tarpn)" d="M308 398C318 401 334 401 346 397L349 474C344 488 338 476 332 488C324 498 318 482 310 490Z"></path>
                <path fill="none" stroke="#190b04" strokeOpacity=".62" strokeWidth="1.5" d="M316 401C314 430 318 458 315 486M340 401C342 430 338 456 343 478"></path>
                <path fill="none" stroke="url(#pk-folly-tarpe)" strokeWidth=".8" d="M317.2 402C315.2 430 319.2 458 316.2 485M338.8 402C340.8 430 336.8 456 341.8 477"></path>
              </g>
              <g className="pk-folly-g pk-folly-g1">
                <use className="pk-folly-bh" href="#pk-folly-s1"></use>
                <use className="pk-folly-bg" href="#pk-folly-s1"></use>
                <use className="pk-folly-bu" href="#pk-folly-s1"></use>
                <use className="pk-folly-bd" href="#pk-folly-s1"></use>
              </g>
              <g className="pk-folly-g pk-folly-g2">
                <use className="pk-folly-bh" href="#pk-folly-s2"></use>
                <use className="pk-folly-bg" href="#pk-folly-s2"></use>
                <use className="pk-folly-bu" href="#pk-folly-s2"></use>
                <use className="pk-folly-bd" href="#pk-folly-s2"></use>
              </g>
              <g className="pk-folly-g pk-folly-g3">
                <use className="pk-folly-bh" href="#pk-folly-s3"></use>
                <use className="pk-folly-bg" href="#pk-folly-s3"></use>
                <use className="pk-folly-bu" href="#pk-folly-s3"></use>
                <use className="pk-folly-bd" href="#pk-folly-s3"></use>
              </g>
              <g className="pk-folly-g pk-folly-g4">
                <use className="pk-folly-bh" href="#pk-folly-s4"></use>
                <use className="pk-folly-bg" href="#pk-folly-s4"></use>
                <use className="pk-folly-bu" href="#pk-folly-s4"></use>
                <use className="pk-folly-bd" href="#pk-folly-s4"></use>
              </g>
              <g className="pk-folly-g pk-folly-g5">
                <use className="pk-folly-bh" href="#pk-folly-s5"></use>
                <use className="pk-folly-bg" href="#pk-folly-s5"></use>
                <use className="pk-folly-bu" href="#pk-folly-s5"></use>
                <use className="pk-folly-bd" href="#pk-folly-s5"></use>
              </g>
              <g className="pk-folly-g pk-folly-g6">
                <use className="pk-folly-bh" href="#pk-folly-s6"></use>
                <use className="pk-folly-bg" href="#pk-folly-s6"></use>
                <use className="pk-folly-bu" href="#pk-folly-s6"></use>
                <use className="pk-folly-bd" href="#pk-folly-s6"></use>
              </g>
              <g className="pk-folly-g pk-folly-g7">
                <use className="pk-folly-bh" href="#pk-folly-s7"></use>
                <use className="pk-folly-bg" href="#pk-folly-s7"></use>
                <use className="pk-folly-bu" href="#pk-folly-s7"></use>
                <use className="pk-folly-bd" href="#pk-folly-s7"></use>
              </g>
              <g className="pk-folly-g pk-folly-g8" style={{ '--w': '.5s' } as React.CSSProperties} fill="url(#pk-folly-archg)">
                <path d="M59 620V478C59 452 71 444 78 420C85 444 97 452 97 478V620Z" fill="url(#pk-folly-archl)"></path>
                <path d="M65.5 620V481C65.5 460 76 451 80 435C84 451 94.5 460 94.5 481V620Z" fill="url(#pk-folly-archd)"></path>
                <path d="M65.5 620V481C65.5 460 76 451 80 435" fill="none" stroke="#050807" strokeOpacity=".5" strokeWidth=".9"></path>
                <path d="M115 620V478C115 458 127 452 134 438C141 452 153 458 153 478V620Z" opacity=".24"></path>
                <path d="M171 620V478C171 458 183 452 190 438C197 452 209 458 209 478V620Z" opacity=".2"></path>
                <path d="M227 620V478C227 458 239 452 246 438C253 452 265 458 265 478V620Z" opacity=".26"></path>
              </g>
              <g className="pk-folly-g pk-folly-g8" style={{ '--w': '.72s' } as React.CSSProperties}>
                <use className="pk-folly-bh" href="#pk-folly-sa"></use>
                <use className="pk-folly-bg" href="#pk-folly-sa"></use>
                <use className="pk-folly-bu" href="#pk-folly-sa"></use>
                <use className="pk-folly-bd" href="#pk-folly-sa"></use>
              </g>
              <g className="pk-folly-g pk-folly-g8" style={{ '--w': '.9s' } as React.CSSProperties}>
                <use className="pk-folly-bh" href="#pk-folly-sb"></use>
                <use className="pk-folly-bg" href="#pk-folly-sb"></use>
                <use className="pk-folly-bu" href="#pk-folly-sb"></use>
                <use className="pk-folly-bd" href="#pk-folly-sb"></use>
              </g>
              <g className="pk-folly-g pk-folly-g8" style={{ '--w': '1.08s' } as React.CSSProperties}>
                <use className="pk-folly-bh" href="#pk-folly-sc"></use>
                <use className="pk-folly-bg" href="#pk-folly-sc"></use>
                <use className="pk-folly-bu" href="#pk-folly-sc"></use>
                <use className="pk-folly-bd" href="#pk-folly-sc"></use>
                <circle cx="140" cy="10" r="2.6" fill="#fffbe8"></circle>
              </g>
            </svg>
          </div>
          {/* palms and flooded undergrowth in front of the set */}
          <svg className="pk-folly-art" style={{ zIndex: '5' } as React.CSSProperties} viewBox="0 0 375 812" aria-hidden="true">
            <g fill="#16211b">
              <g transform="translate(4 612)">
                <use href="#pk-folly-frond" transform="rotate(-84) scale(.86)"></use>
                <use href="#pk-folly-frond" transform="rotate(-58) scale(.92)"></use>
                <use href="#pk-folly-frond" transform="rotate(-32) scale(.9)"></use>
                <use href="#pk-folly-frond" transform="rotate(-8) scale(.8)"></use>
              </g>
              <g transform="translate(372 600)">
                <use href="#pk-folly-frond" transform="rotate(84) scale(-.86 .86)"></use>
                <use href="#pk-folly-frond" transform="rotate(58) scale(-.94 .94)"></use>
                <use href="#pk-folly-frond" transform="rotate(32) scale(-.9 .9)"></use>
                <use href="#pk-folly-frond" transform="rotate(8) scale(-.8 .8)"></use>
              </g>
            </g>
            <g fill="#0b120e">
              <path d="M-6 790C-4 700 -2 580 0 490L5 490C4 580 4 700 6 790Z"></path>
              <path d="M382 790C380 700 376 570 372 472L367 472C370 570 372 700 372 790Z"></path>
              <g transform="translate(36 660)">
                <use href="#pk-folly-frond" transform="rotate(-96) scale(.74)"></use>
                <use href="#pk-folly-frond" transform="rotate(-66) scale(.8)"></use>
                <use href="#pk-folly-frond" transform="rotate(-36) scale(.72)"></use>
                <use href="#pk-folly-frond" transform="rotate(-132) scale(.7)"></use>
              </g>
              <g transform="translate(340 654)">
                <use href="#pk-folly-frond" transform="rotate(96) scale(-.74 .74)"></use>
                <use href="#pk-folly-frond" transform="rotate(66) scale(-.82 .82)"></use>
                <use href="#pk-folly-frond" transform="rotate(36) scale(-.72 .72)"></use>
                <use href="#pk-folly-frond" transform="rotate(132) scale(-.7 .7)"></use>
              </g>
            </g>
          </svg>
          <svg className="pk-folly-palm pk-folly-palml" style={{ left: 'calc(50% + var(--u)*-285.5)', top: 'calc(var(--oy) + var(--u)*388)' } as React.CSSProperties} viewBox="-100 -100 200 200" aria-hidden="true">
            <g fill="#0b120e">
              <use href="#pk-folly-frond" transform="rotate(-78) scale(.82)"></use>
              <use href="#pk-folly-frond" transform="rotate(-46) scale(.94)"></use>
              <use href="#pk-folly-frond" transform="rotate(-14) scale(1)"></use>
              <use href="#pk-folly-frond" transform="rotate(16) scale(.92)"></use>
              <use href="#pk-folly-frond" transform="rotate(46) scale(.76)"></use>
            </g>
          </svg>
          <svg className="pk-folly-palm" style={{ left: 'calc(50% + var(--u)*82.5)', top: 'calc(var(--oy) + var(--u)*370)' } as React.CSSProperties} viewBox="-100 -100 200 200" aria-hidden="true">
            <g fill="#0b120e">
              <use href="#pk-folly-frond" transform="rotate(76) scale(-.8 .8)"></use>
              <use href="#pk-folly-frond" transform="rotate(44) scale(-.96 .96)"></use>
              <use href="#pk-folly-frond" transform="rotate(12) scale(-1 1)"></use>
              <use href="#pk-folly-frond" transform="rotate(-18) scale(-.9 .9)"></use>
              <use href="#pk-folly-frond" transform="rotate(-50) scale(-.72 .72)"></use>
            </g>
          </svg>
          {/* side lamps: left in the first arch, right against the rust tarp */}
          <div className="pk-folly-lampbox pk-folly-lamps" style={{ left: 'calc(50% + var(--u)*-123.5)', top: 'calc(var(--oy) + var(--u)*422)', '--k': '.9', '--p': '5.7s' } as React.CSSProperties} aria-hidden="true">
            <div className="pk-folly-swing">
              <div className="pk-folly-jerk">
                <svg className="pk-folly-lampsvg" viewBox="0 0 28 52">
                  <circle className="pk-folly-glow" cx="14" cy="37" r="52" fill="url(#pk-folly-halo)"></circle>
                  <path d="M14 0V28" stroke="#070b09" strokeWidth="1.1"></path>
                  <path d="M11.4 27h5.2l.8 4.6h-6.8z" fill="#111714"></path>
                  <circle className="pk-folly-glow" cx="14" cy="37" r="5.2" fill="url(#pk-folly-bulb)"></circle>
                  <g fill="none" stroke="#111714" strokeWidth=".8">
                    <path d="M10.6 31.4C6.6 34.6 6.6 42 14 46C21.4 42 21.4 34.6 17.4 31.4"></path>
                    <path d="M14 31.4V46"></path>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          <div className="pk-folly-lampbox pk-folly-lamps" style={{ left: 'calc(50% + var(--u)*126.5)', top: 'calc(var(--oy) + var(--u)*398)', '--k': '.8', '--p': '8.9s' } as React.CSSProperties} aria-hidden="true">
            <div className="pk-folly-swing">
              <div className="pk-folly-jerk">
                <svg className="pk-folly-lampsvg" viewBox="0 0 28 52">
                  <circle className="pk-folly-glow" cx="14" cy="37" r="46" fill="url(#pk-folly-halo)"></circle>
                  <path d="M14 0V28" stroke="#070b09" strokeWidth="1.1"></path>
                  <path d="M11.4 27h5.2l.8 4.6h-6.8z" fill="#111714"></path>
                  <circle className="pk-folly-glow" cx="14" cy="37" r="5.2" fill="url(#pk-folly-bulb)"></circle>
                  <g fill="none" stroke="#111714" strokeWidth=".8">
                    <path d="M10.6 31.4C6.6 34.6 6.6 42 14 46C21.4 42 21.4 34.6 17.4 31.4"></path>
                    <path d="M14 31.4V46"></path>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          {/* key lamp and its cone */}
          <div className="pk-folly-lampbox pk-folly-lampkey" aria-hidden="true">
            <div className="pk-folly-swing" style={{ '--p': 'var(--lt)' } as React.CSSProperties}>
              <div className="pk-folly-jerk">
                <div className="pk-folly-jerkn">
                  <svg className="pk-folly-cone pk-folly-glow" viewBox="0 0 800 800">
                    <g fill="url(#pk-folly-cn)" opacity=".24">
                      <path d="M400 0L20 800H780Z"></path>
                      <path d="M400 0L80 800H720Z"></path>
                      <path d="M400 0L140 800H660Z"></path>
                      <path d="M400 0L200 800H600Z"></path>
                      <path d="M400 0L250 800H550Z"></path>
                      <path d="M400 0L300 800H500Z"></path>
                    </g>
                  </svg>
                  <svg className="pk-folly-lampsvg" viewBox="0 0 44 92">
                    <circle className="pk-folly-glow" cx="22" cy="72" r="56" fill="url(#pk-folly-halo)"></circle>
                    <path d="M22 0V54" stroke="#070b09" strokeWidth="1.4"></path>
                    <path d="M18 52h8l1 7h-10z" fill="#111714"></path>
                    <path d="M18.4 52.4h3v6.4h-3.8z" fill="#5f6d64"></path>
                    <circle className="pk-folly-glow" cx="22" cy="69" r="7.6" fill="url(#pk-folly-bulb)"></circle>
                    <g fill="none" stroke="#111714" strokeWidth="1.1">
                      <path d="M16.5 59C10 64 10 76 22 82C34 76 34 64 27.5 59"></path>
                      <path d="M22 59V82"></path>
                      <path d="M12.4 69Q22 73 31.6 69"></path>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {/* dripping tarp under the status bar */}
          <svg className="pk-folly-art pk-folly-tarp" style={{ height: 'calc(var(--u)*70)' } as React.CSSProperties} viewBox="0 0 375 70" aria-hidden="true">
            <defs>
              <linearGradient id="pk-folly-tg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0a0f0d"></stop>
                <stop offset=".45" stopColor="#151d19"></stop>
                <stop offset="1" stopColor="#2c3830"></stop>
              </linearGradient>
              <linearGradient id="pk-folly-te" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="440" y2="0">
                <stop offset="0" stopColor="#f5f0dc" stopOpacity=".05"></stop>
                <stop offset=".3" stopColor="#f5f0dc" stopOpacity=".16"></stop>
                <stop offset=".472" stopColor="#f5f0dc" stopOpacity=".66"></stop>
                <stop offset=".64" stopColor="#f5f0dc" stopOpacity=".16"></stop>
                <stop offset="1" stopColor="#f5f0dc" stopOpacity=".05"></stop>
              </linearGradient>
              <radialGradient id="pk-folly-tl" gradientUnits="userSpaceOnUse" cx="176" cy="46" r="110">
                <stop offset="0" stopColor="#f5f0dc" stopOpacity=".55"></stop>
                <stop offset=".5" stopColor="#f5f0dc" stopOpacity=".14"></stop>
                <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
              </radialGradient>
            </defs>
            <rect x="-60" y="-60" width="500" height="60.5" fill="#0a0f0d"></rect>
            <path fill="url(#pk-folly-tg)" d="M-60 0H440V26C410 34 392 26 366 22C340 18 316 30 286 34C258 38 232 24 204 24C186 24 186 34 176 34C166 34 162 26 146 24C118 20 92 38 62 36C36 34 18 24 -8 22C-30 21-46 26-60 28Z"></path>
            <path fill="url(#pk-folly-tl)" d="M-60 -60H440V26C410 34 392 26 366 22C340 18 316 30 286 34C258 38 232 24 204 24C186 24 186 34 176 34C166 34 162 26 146 24C118 20 92 38 62 36C36 34 18 24 -8 22C-30 21-46 26-60 28Z"></path>
            <path fill="none" stroke="url(#pk-folly-te)" strokeWidth=".9" d="M-60 28C-46 26-30 21-8 22C18 24 36 34 62 36C92 38 118 20 146 24C162 26 166 34 176 34C186 34 186 24 204 24C232 24 258 38 286 34C316 30 340 18 366 22C392 26 410 34 440 26"></path>
            <path fill="#000" fillOpacity=".14" d="M176 34C172 22 168 10 160 0H192C186 10 180 22 176 34ZM62 36C70 22 76 10 74 0H50C52 12 56 24 62 36ZM286 34C278 22 274 10 276 0H300C298 12 292 24 286 34Z"></path>
          </svg>
          <span className="pk-folly-drip" style={{ left: 'calc(50% + var(--u)*-41.5)', top: 'calc(var(--oy) + var(--u)*24.5)', '--y': '82', '--dl': '.02s' } as React.CSSProperties} aria-hidden="true"></span>
          {' '}
          <span className="pk-folly-drip" style={{ left: 'calc(50% + var(--u)*-125.5)', top: 'calc(var(--oy) + var(--u)*36)', '--y': '96', '--dl': '.06s' } as React.CSSProperties} aria-hidden="true"></span>
          {' '}
          <span className="pk-folly-drip" style={{ left: 'calc(50% + var(--u)*98.5)', top: 'calc(var(--oy) + var(--u)*34)', '--y': '58', '--dl': '0s' } as React.CSSProperties} aria-hidden="true"></span>
          {' '}
          <span className="pk-folly-dripa" style={{ left: 'calc(50% + var(--u)*-29.5)', top: 'calc(var(--oy) + var(--u)*26.5)', '--y': '92' } as React.CSSProperties} aria-hidden="true"></span>
          <svg className="pk-folly-rain pk-folly-rainf" width="100%" height="100%" aria-hidden="true">
            <defs>
              <pattern id="pk-folly-ra" width="120" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
                <g fill="url(#pk-folly-rd)" opacity=".66">
                  <rect x="8" y="12" width=".9" height="26"></rect>
                  <rect x="30" y="118" width=".9" height="20"></rect>
                  <rect x="47" y="60" width=".9" height="30"></rect>
                  <rect x="66" y="178" width=".9" height="24"></rect>
                  <rect x="84" y="24" width=".9" height="18"></rect>
                  <rect x="102" y="136" width=".9" height="28"></rect>
                  <rect x="18" y="196" width=".9" height="22"></rect>
                  <rect x="74" y="96" width=".9" height="16"></rect>
                  <rect x="113" y="210" width=".9" height="20"></rect>
                  <rect x="56" y="4" width=".9" height="14"></rect>
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pk-folly-ra)"></rect>
          </svg>
          <div className="pk-folly-col">
            <div className="pk-folly-top pk-folly-rise" style={{ '--d': '.08s' } as React.CSSProperties}>
              <button type="button" className="pk-folly-back" onClick={() => { play('click'); onBack(); }}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M14 8H3M7.5 3.2L2.6 8l4.9 4.8" fill="none" stroke="#e39a6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span>Back</span>
              </button>
              <PackSoundToggle on={soundOn} onToggle={toggleSound} className={`pk-folly-snd ${soundOn ? '' : 'is-off'}`} />
              <div className="pk-folly-chip">
                <svg viewBox="0 0 11 12" aria-hidden="true">
                  <path d="M3 5.4V3.6a2.5 2.5 0 015 0v1.8" fill="none" stroke="#ecbf9b" strokeWidth="1.3"></path>
                  <rect x="1.2" y="5.2" width="8.6" height="6.2" rx="1.4" fill="#ecbf9b"></rect>
                </svg>
                <span>FUTURE UPDATE</span>
              </div>
            </div>
            <div className="pk-folly-hero">
              <div className="pk-folly-arrive">
                <div className="pk-folly-sway">
                  <button className="pk-folly-board" type="button" data-reveal="1" aria-label={v.boardLabel} onClick={v.snap} onPointerDown={v.press} onPointerUp={v.release} onPointerCancel={v.release} onPointerLeave={v.release}>
                    {/* slate */}
                    <span className="pk-folly-slate">
                      <svg className="pk-folly-slatebg" viewBox="0 0 322 206" preserveAspectRatio="none" aria-hidden="true">
                        <rect width="322" height="206" fill="#5a452d" filter="url(#pk-folly-wood)"></rect>
                        <rect x="2.5" y="-6" width="317" height="209" rx="4" fill="url(#pk-folly-paint)" filter="url(#pk-folly-rough)"></rect>
                        <rect x="3" y="0" width="316" height="200" filter="url(#pk-folly-haze)" opacity=".15"></rect>
                        <g fill="none" stroke="#efecdc" strokeWidth="1">
                          <path strokeOpacity=".34" d="M4 60.5C80 59.6 200 61.4 318 60.2"></path>
                          <path strokeOpacity=".15" d="M161 61C161.6 100 160.5 150 161.2 202"></path>
                          <path strokeOpacity=".2" d="M5 96C90 95.4 220 96.8 317 95.8M5 130.6C100 131.2 230 130 317 130.8M5 165C80 164.4 210 165.8 317 165"></path>
                        </g>
                        <g fill="none" stroke="url(#pk-folly-wash)" strokeLinecap="round">
                          <path d="M36 0C34 30 38.6 60 37 90C36 104 35 118 36.4 130" strokeWidth="3"></path>
                          <path d="M118 0C120 30 116 66 119 100C122 134 122 134 118 150" strokeWidth="2.1"></path>
                          <path d="M214 56C212.4 86 216.2 122 214 166" strokeWidth="2.8"></path>
                          <path d="M292 40C295.5 80 287 120 291.5 156C293.5 172 289 186 290.5 198" strokeWidth="2"></path>
                          <path d="M146 0C147 14 143.6 30 145.4 47" strokeWidth="2.2"></path>
                          <path d="M275 0C276 3 274 5 275 8" strokeWidth="1.8"></path>
                          <path d="M275 55C276.4 65 273.6 78 275.2 88" strokeWidth="2.4"></path>
                        </g>
                        <g transform="translate(-1 0)" fill="url(#pk-folly-washl)">
                          <path d="M35.93 0C33.81 30 38.24 60 36.45 90C35.25 104 34.03 118 35.2 130L37.6 130C35.97 118 36.75 104 37.55 90C38.96 60 34.19 30 36.07 0Z"></path>
                          <path d="M117.93 0C119.86 30 115.77 66 118.67 100C121.55 134 121.43 134 117.3 150L118.7 150C122.57 134 122.45 134 119.33 100C116.23 66 120.14 30 118.07 0Z"></path>
                          <path d="M213.93 56C212.09 86 215.57 122 213 166L215 166C216.83 122 212.71 86 214.07 56Z"></path>
                          <path d="M291.93 40C295.37 80 286.8 120 291.21 156C293.11 172 288.51 186 289.9 198L291.1 198C289.49 186 293.89 172 291.79 156C287.2 120 295.63 80 292.07 40Z"></path>
                          <path d="M145.93 0C146.75 14 143.09 30 144.6 47L146.2 47C144.11 30 147.25 14 146.07 0Z"></path>
                          <path d="M274.93 0C275.86 3 273.76 5 274.65 8L275.35 8C274.24 5 276.14 3 275.07 0Z"></path>
                          <path d="M274.93 55C276.12 65 273.03 78 274.3 88L276.1 88C274.17 78 276.68 65 275.07 55Z"></path>
                        </g>
                        <g fill="#050706" fillOpacity=".5">
                          <ellipse cx="35.9" cy="131.2" rx="2" ry="2.6"></ellipse>
                          <ellipse cx="117.5" cy="151" rx="1.5" ry="2.3"></ellipse>
                          <ellipse cx="213.5" cy="167.2" rx="1.9" ry="2.6"></ellipse>
                          <ellipse cx="290.0" cy="199" rx="1.4" ry="2.2"></ellipse>
                          <ellipse cx="144.9" cy="48" rx="1.6" ry="2.5"></ellipse>
                          <ellipse cx="274.7" cy="89" rx="1.7" ry="2.6"></ellipse>
                        </g>
                        <g fill="#e4ead9" fillOpacity=".42">
                          <ellipse cx="35.4" cy="130.2" rx="2" ry="2.6"></ellipse>
                          <ellipse cx="117" cy="150" rx="1.5" ry="2.3"></ellipse>
                          <ellipse cx="213" cy="166.2" rx="1.9" ry="2.6"></ellipse>
                          <ellipse cx="289.5" cy="198" rx="1.4" ry="2.2"></ellipse>
                          <ellipse cx="144.4" cy="47" rx="1.6" ry="2.5"></ellipse>
                          <ellipse cx="274.2" cy="88" rx="1.7" ry="2.6"></ellipse>
                        </g>
                        <g fill="#fff" fillOpacity=".92">
                          <circle cx="34.7" cy="129.1" r="0.7"></circle>
                          <circle cx="116.5" cy="149.0" r="0.56"></circle>
                          <circle cx="212.4" cy="165.1" r="0.67"></circle>
                          <circle cx="289.0" cy="197.1" r="0.53"></circle>
                          <circle cx="143.9" cy="46.0" r="0.59"></circle>
                          <circle cx="273.6" cy="86.9" r="0.62"></circle>
                        </g>
                        <path d="M9 0C8 10 12 22 9 38C8 46 10 50 9 56" fill="none" stroke="url(#pk-folly-rust)" strokeWidth="3" opacity=".7"></path>
                        <path d="M306 0C307 8 304 14 306 24" fill="none" stroke="url(#pk-folly-rust)" strokeWidth="2" opacity=".4"></path>
                        <g fill="#f4f7ee" fillOpacity=".1">
                          <ellipse cx="70" cy="3" rx="1.6" ry="2.6"></ellipse>
                          <ellipse cx="150" cy="2.6" rx="1.3" ry="2"></ellipse>
                          <ellipse cx="238" cy="3.4" rx="1.8" ry="3"></ellipse>
                          <ellipse cx="146" cy="72" rx="1.2" ry="1.6"></ellipse>
                          <ellipse cx="300" cy="84" rx="1.4" ry="2"></ellipse>
                          <ellipse cx="22" cy="128" rx="1.3" ry="1.8"></ellipse>
                          <ellipse cx="186" cy="150" rx="1.1" ry="1.5"></ellipse>
                          <ellipse cx="134" cy="174" rx="1.5" ry="2.2"></ellipse>
                        </g>
                        <g fill="#fff" fillOpacity=".62">
                          <circle cx="69.6" cy="2" r=".5"></circle>
                          <circle cx="149.7" cy="1.8" r=".4"></circle>
                          <circle cx="237.5" cy="2.2" r=".55"></circle>
                          <circle cx="145.7" cy="71.3" r=".35"></circle>
                          <circle cx="299.6" cy="83.2" r=".4"></circle>
                          <circle cx="21.7" cy="127.3" r=".35"></circle>
                          <circle cx="185.8" cy="149.5" r=".3"></circle>
                          <circle cx="133.6" cy="173" r=".45"></circle>
                        </g>
                      </svg>
                      <span className="pk-folly-bead"></span>
                      {' '}
                      <span className="pk-folly-sheen"></span>
                      {' '}
                      <span className="pk-folly-lit"></span>
                      {' '}
                      <span className="pk-folly-title pk-folly-chalk">THE FOLLY</span>
                      {' '}
                      <span className="pk-folly-takewrap">
                        <span className="pk-folly-takel">TAKE</span>
                        {' '}
                        <span className="pk-folly-take pk-folly-chalk">{v.take}</span>
                        <svg className="pk-folly-tally" viewBox="0 0 36 17" aria-hidden="true">
                          <path className={v.t1} d="M2 2C2.6 6 1.6 11 2.2 15"></path>
                          <path className={v.t2} d="M6 1.6C6.4 6 5.8 11 6.2 15.4"></path>
                          <path className={v.t3} d="M10 2C10.5 6 9.6 11 10.2 15"></path>
                          <path className={v.t4} d="M14 1.8C14.3 6 13.8 11 14.2 15.2"></path>
                          <path className={v.t5} d="M0 13C5 10 11 7 16.4 3.6"></path>
                          <path className={v.t6} d="M22 2C22.5 6 21.7 11 22.2 15"></path>
                          <path className={v.t7} d="M26 1.7C26.4 6 25.8 11 26.2 15.2"></path>
                          <path className={v.t8} d="M30 2C30.5 6 29.6 11 30.2 15"></path>
                        </svg>
                      </span>
                      {' '}
                      <span className="pk-folly-spill" aria-hidden="true"></span>
                      {' '}
                      <span className="pk-folly-led" role="img" aria-label={v.ledLabel}>
                        <span className="pk-folly-ledbloom"></span>
                        {' '}
                        <span className="pk-folly-ledl">BUDGET</span>
                        {' '}
                        <span className={`pk-folly-ledo ${v.overClass}`}>OVER</span>
                        <svg className="pk-folly-digits" viewBox="-1 -1 148 24" aria-hidden="true">
                          <g transform="skewX(-3)">
                            {v.led.map((c: any, cIndex: number) => (
                              <g key={cIndex} transform={c.tr}>
                                <path className="pk-folly-ghost" d={v.ghost}></path>
                                <path className="pk-folly-seg" d={c.d}></path>
                              </g>
                            ))}
                            <path className="pk-folly-comma" d={v.commas}></path>
                          </g>
                        </svg>
                        <span className="pk-folly-ledglass"></span>
                      </span>
                      {' '}
                      <span className="pk-folly-slots">
                        {v.slots.map((s: any, sIndex: number) => (
                          <span key={sIndex} className="pk-folly-slot">
                            <span className={`pk-folly-ghostline ${s.blank}`} aria-hidden="true">
                              <span className="pk-folly-linein">{s.text}</span>
                            </span>
                            {' '}
                            <span className={`pk-folly-line pk-folly-chalk ${s.cls}`}>
                              <span className="pk-folly-linein">
                                {s.words.map((w: any, wIndex: number) => (
                                  <Fragment key={wIndex}><span className="pk-folly-w" style={{ '--d': w.d } as React.CSSProperties}>{w.t}</span>{' '}</Fragment>
                                ))}
                              </span>
                            </span>
                            {s.next ? (
                              <span className="pk-folly-nexthint pk-folly-chalk"><svg viewBox="0 0 9 11" aria-hidden="true"><path d="M4.5 10V1.4M1 4.6L4.5 1 8 4.6" fill="none" stroke="#d6d3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>SNAP THE SLATE</span>
                            ) : null}
                          </span>
                        ))}
                      </span>
                      {' '}
                      <span className="pk-folly-bighint pk-folly-chalk"> <svg viewBox="0 0 26 40" aria-hidden="true"><path d="M20 38C10 34 5 22 11 4M4 11L11.4 3.4L18 11"></path></svg> SNAP THE SLATE </span>
                    </span>
                    {/* fixed stick */}
                    <svg className="pk-folly-stick pk-folly-stickb" viewBox="0 0 322 24" aria-hidden="true">
                      <rect x="320" y=".6" width="3.4" height="23.4" rx="1.2" fill="#8d6f49"></rect>
                      <rect width="322" height="24" rx="2" fill="url(#pk-folly-wg)" filter="url(#pk-folly-wood)"></rect>
                      <g filter="url(#pk-folly-chip2)">
                        <path fill="#cdc7ad" d="M26 0H56L70 24H40ZM86 0H116L130 24H100ZM146 0H176L190 24H160ZM206 0H236L250 24H220ZM266 0H296L310 24H280Z"></path>
                        <path fill="#1e211e" d="M56 0H86L100 24H70ZM116 0H146L160 24H130ZM176 0H206L220 24H190ZM236 0H266L280 24H250ZM296 0H322V24H310Z"></path>
                      </g>
                      <rect width="322" height="24" rx="2" fill="url(#pk-folly-ss)"></rect>
                      <rect width="322" height="24" rx="2" fill="url(#pk-folly-end)"></rect>
                      <path d="M0 23.5H322" stroke="#000" strokeOpacity=".6"></path>
                      <rect x="2" y="1" width="20" height="22" rx="2.5" fill="url(#pk-folly-steel)"></rect>
                      <circle cx="6.5" cy="19" r="1.2" fill="#2a2d2a"></circle>
                      <circle cx="17" cy="19" r="1.2" fill="#2a2d2a"></circle>
                      <path d="M6 20C5.6 23 6.6 24 6 24" stroke="#a4552a" strokeWidth="1.6" fill="none"></path>
                    </svg>
                    <span className="pk-folly-wedge"></span>
                    {/* moving stick, hinged at the left */}
                    <span className="pk-folly-sticka">
                      <span className="pk-folly-idle">
                        <svg className="pk-folly-stick" viewBox="0 0 322 24" aria-hidden="true">
                          <rect x=".5" y="20" width="323" height="6.5" rx="1.5" fill="#1d150c"></rect>
                          <rect x="320" y=".6" width="3.4" height="24.4" rx="1.2" fill="#8d6f49"></rect>
                          <rect width="322" height="24" rx="2" fill="url(#pk-folly-wg)" filter="url(#pk-folly-wood)"></rect>
                          <g filter="url(#pk-folly-chip)">
                            <path fill="#cdc7ad" d="M40 0H70L56 24H26ZM100 0H130L116 24H86ZM160 0H190L176 24H146ZM220 0H250L236 24H206ZM280 0H310L296 24H266Z"></path>
                            <path fill="#1e211e" d="M70 0H100L86 24H56ZM130 0H160L146 24H116ZM190 0H220L206 24H176ZM250 0H280L266 24H236ZM310 0H322V24H296Z"></path>
                          </g>
                          <rect width="322" height="24" rx="2" fill="url(#pk-folly-ss)"></rect>
                          <rect width="322" height="24" rx="2" fill="url(#pk-folly-end)"></rect>
                          <path d="M0 .6H322" stroke="#fffbe8" strokeOpacity=".55" strokeWidth=".9"></path>
                          <path d="M0 23.5H322" stroke="#000" strokeOpacity=".55"></path>
                          <rect x="2" y="1" width="20" height="22" rx="2.5" fill="url(#pk-folly-steel)"></rect>
                          <circle cx="6.5" cy="5" r="1.2" fill="#2a2d2a"></circle>
                          <circle cx="17" cy="5" r="1.2" fill="#2a2d2a"></circle>
                          <g fill="#f4f7ee" fillOpacity=".75">
                            <ellipse cx="83" cy="23.6" rx="1.2" ry="1.9"></ellipse>
                            <ellipse cx="197" cy="23.8" rx="1.1" ry="2.2"></ellipse>
                            <ellipse cx="262" cy="23.5" rx=".9" ry="1.6"></ellipse>
                          </g>
                        </svg>
                      </span>
                    </span>
                    <svg className="pk-folly-pin" viewBox="0 0 14 14" aria-hidden="true">
                      <circle cx="7" cy="7" r="6.4" fill="url(#pk-folly-steel)"></circle>
                      <circle cx="7" cy="7" r="6.4" fill="none" stroke="#141614" strokeWidth=".8"></circle>
                      <circle cx="7" cy="7" r="2" fill="#242724"></circle>
                      <path d="M3 4.6A5 5 0 017.6 2.2" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth=".9" strokeLinecap="round"></path>
                    </svg>
                    <span className="pk-folly-spray" aria-hidden="true">
                      <span className="pk-folly-dr" style={{ '--x': '24%', '--dx': '-16', '--dy': '-34', '--r': '-20deg' } as React.CSSProperties}></span>
                      {' '}
                      <span className="pk-folly-dr" style={{ '--x': '41%', '--dx': '-5', '--dy': '-52', '--r': '-6deg' } as React.CSSProperties}></span>
                      {' '}
                      <span className="pk-folly-dr" style={{ '--x': '56%', '--dx': '7', '--dy': '-38', '--r': '10deg' } as React.CSSProperties}></span>
                      {' '}
                      <span className="pk-folly-dr" style={{ '--x': '72%', '--dx': '12', '--dy': '-58', '--r': '14deg' } as React.CSSProperties}></span>
                      {' '}
                      <span className="pk-folly-dr" style={{ '--x': '88%', '--dx': '26', '--dy': '-36', '--r': '30deg' } as React.CSSProperties}></span>
                      {' '}
                      <span className="pk-folly-dr" style={{ '--x': '98%', '--dx': '30', '--dy': '-14', '--r': '50deg' } as React.CSSProperties}></span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="pk-folly-lockup pk-folly-rise" style={{ '--d': '.42s' } as React.CSSProperties}>
              <span className="pk-folly-the">THE</span>
              {' '}
              <span className="pk-folly-name">FOLLY</span>
            </div>
            <div className="pk-folly-words">
              <div className="pk-folly-kick pk-folly-rise" style={{ '--d': '.52s' } as React.CSSProperties}>YOUR FORTUNE. ONE FILM.</div>
              <div className="pk-folly-soon pk-folly-rise" style={{ '--d': '.62s' } as React.CSSProperties}>
                <span className="pk-folly-soonbase">COMING SOON</span>
                {' '}
                <span className="pk-folly-soonmask" aria-hidden="true">
                  <span className="pk-folly-soonhi">COMING SOON</span>
                </span>
              </div>
              <p className="pk-folly-pitch pk-folly-rise" style={{ '--d': '.72s' } as React.CSSProperties}>Stop making safe money. <b>Sink your whole fortune into the impossible film</b>, keep rolling when the set floods, and find out if you made a masterpiece or the biggest flop in history.</p>
            </div>
            <div className="pk-folly-ctazone pk-folly-rise" style={{ '--d': '.84s' } as React.CSSProperties}>
              <span className="pk-folly-drops" aria-hidden="true">
                <span className="pk-folly-drop" style={{ left: '13%', '--ry': '-6', '--rs': '0', '--t': '3.7s', '--dl': '.5s' } as React.CSSProperties}></span>
                {' '}
                <span className="pk-folly-drop" style={{ left: '58%', '--ry': '1', '--rs': '2', '--t': '2.6s', '--dl': '1.5s' } as React.CSSProperties}></span>
                {' '}
                <span className="pk-folly-wring"></span>
              </span>
              <div className="pk-folly-ctawrap">
                <button className={`pk-folly-cta ${v.ctaClass}`} type="button" data-cta="1" onClick={v.notify} onPointerDown={v.ctaPress} onPointerUp={v.ctaRelease} onPointerCancel={v.ctaRelease} onPointerLeave={v.ctaRelease}>
                  {v.listed ? (
                    <svg viewBox="0 0 22 22" aria-hidden="true">
                      <path d="M4 11.6l4.6 4.6L18 6.4" fill="none" stroke="#efb48b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  ) : null}
                  {v.notListed ? (
                    <svg viewBox="0 0 22 22" aria-hidden="true">
                      <path d="M2.5 9.4h17v9.1a1.3 1.3 0 01-1.3 1.3H3.8a1.3 1.3 0 01-1.3-1.3z" fill="#fff8e6"></path>
                      <path d="M2.2 5.5L18.6 2.2l.8 3.7L3 9.2z" fill="#fff8e6"></path>
                      <path d="M5.5 4.85l2.7 3.25 2.5-.5-2.7-3.25zM10.9 3.75l2.7 3.25 2.5-.5-2.7-3.25z" fill="#a4552a"></path>
                    </svg>
                  ) : null}
                  <span className={`pk-folly-ctat ${v.labelClass}`}>{v.ctaLabel}</span>
                </button>
                <div className={`pk-folly-burst ${v.burstClass}`} aria-hidden="true">
                  <span className="pk-folly-ring"></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '7%', '--t': '-3px', '--w': '3px', '--a': '-38deg', '--dx': '-26px', '--dy': '-23px', '--dl': '0s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '17%', '--t': '-13px', '--w': '4.5px', '--a': '-20deg', '--dx': '-19px', '--dy': '-47px', '--dl': '.03s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '31%', '--t': '1px', '--w': '2.5px', '--a': '-14deg', '--dx': '-13px', '--dy': '-14px', '--dl': '.01s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '42%', '--t': '-8px', '--w': '5px', '--a': '-5deg', '--dx': '-6px', '--dy': '-52px', '--dl': '.05s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '55%', '--t': '-1px', '--w': '3px', '--a': '7deg', '--dx': '9px', '--dy': '-19px', '--dl': '.02s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '64%', '--t': '-14px', '--w': '4px', '--a': '13deg', '--dx': '15px', '--dy': '-38px', '--dl': '0s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '79%', '--t': '-5px', '--w': '3.5px', '--a': '24deg', '--dx': '21px', '--dy': '-30px', '--dl': '.06s' } as React.CSSProperties}></span>
                  {' '}
                  <span className="pk-folly-sp" style={{ '--x': '93%', '--t': '0px', '--w': '2.5px', '--a': '40deg', '--dx': '27px', '--dy': '-16px', '--dl': '.03s' } as React.CSSProperties}></span>
                </div>
              </div>
              <div className="pk-folly-note">ARRIVING IN A FUTURE UPDATE</div>
            </div>
          </div>
          <div className="pk-folly-water" aria-hidden="true">
            <div className="pk-folly-mist"></div>
            <div className="pk-folly-chairw">
              <svg className="pk-folly-chair" viewBox="0 0 36 44">
                <defs>
                  <linearGradient id="pk-folly-can" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c26f3c"></stop>
                    <stop offset="1" stopColor="#6e3a1f"></stop>
                  </linearGradient>
                </defs>
                <g fill="none" strokeLinecap="round">
                  <path d="M7 3V30M29 3V30" stroke="#1c1610" strokeWidth="2.4"></path>
                  <path d="M7 3V22" stroke="#b9a27a" strokeWidth=".7" strokeOpacity=".8"></path>
                  <path d="M3.5 20.5H32.5" stroke="#241b12" strokeWidth="3"></path>
                  <path d="M3.5 19.6H32.5" stroke="#d6c39d" strokeWidth=".7" strokeOpacity=".85"></path>
                  <path d="M7 30L29 44M29 30L7 44" stroke="#1c1610" strokeWidth="2.2"></path>
                </g>
                <path d="M5.4 4.4C14 6.2 22 6.2 30.6 4.4V14.2C22 15.8 14 15.8 5.4 14.2Z" fill="url(#pk-folly-can)"></path>
                <path d="M5.4 4.4C14 6.2 22 6.2 30.6 4.4" fill="none" stroke="#f0c39c" strokeOpacity=".75" strokeWidth=".7"></path>
                <path d="M6 26C14 29 22 29 30 26V30C22 32.5 14 32.5 6 30Z" fill="#5a2f18"></path>
              </svg>
            </div>
            <div className="pk-folly-waterbody"></div>
            {/* the set, upside down in the flood, smeared by the rain */}
            <svg className="pk-folly-mirror" viewBox="0 0 480 190" preserveAspectRatio="none">
              <g fill="url(#pk-folly-smeard)">
                <ellipse cx="131" cy="0" rx="26" ry="176"></ellipse>
                <ellipse cx="187" cy="0" rx="24" ry="120"></ellipse>
                <ellipse cx="243" cy="0" rx="24" ry="130"></ellipse>
                <ellipse cx="299" cy="0" rx="24" ry="120"></ellipse>
                <ellipse cx="379" cy="0" rx="28" ry="150"></ellipse>
                <ellipse cx="62" cy="0" rx="16" ry="160"></ellipse>
                <ellipse cx="428" cy="0" rx="18" ry="160"></ellipse>
              </g>
            </svg>
            {/* every bulb on the set, for the last take */}
            <svg className="pk-folly-reflect" viewBox="0 0 480 300" preserveAspectRatio="none">
              <g fill="url(#pk-folly-smear)" opacity=".8">
                <ellipse cx="130" cy="0" rx="20" ry="190"></ellipse>
                <ellipse cx="77" cy="0" rx="9" ry="240"></ellipse>
                <ellipse cx="404" cy="0" rx="9" ry="240"></ellipse>
                <ellipse cx="360" cy="0" rx="8" ry="150"></ellipse>
                <ellipse cx="397" cy="0" rx="8" ry="150"></ellipse>
                <g opacity=".3">
                  <ellipse cx="186" cy="0" rx="18" ry="120"></ellipse>
                  <ellipse cx="242" cy="0" rx="18" ry="140"></ellipse>
                  <ellipse cx="298" cy="0" rx="18" ry="120"></ellipse>
                </g>
              </g>
            </svg>
            <div className="pk-folly-flr">
              <span className="pk-folly-flrt">FOLLY</span>
            </div>
            <span className="pk-folly-chairr"></span>
            {/* pools under each lamp, moving with it */}
            <div className="pk-folly-pool pk-folly-poolk" style={{ '--p': 'var(--lt)', '--pd': '9.6', '--k': '1' } as React.CSSProperties}>
              <svg viewBox="-110 0 220 150">
                <ellipse cx="0" cy="6" rx="42" ry="140" fill="url(#pk-folly-smear)"></ellipse>
              </svg>
            </div>
            <div className="pk-folly-pool pk-folly-pools" style={{ left: 'calc(var(--u)*130.5)', '--p': '5.7s', '--pd': '.57', '--k': '.9' } as React.CSSProperties}>
              <svg viewBox="-60 0 120 140">
                <ellipse cx="0" cy="2" rx="16" ry="74" fill="url(#pk-folly-smear)"></ellipse>
              </svg>
            </div>
            <div className="pk-folly-pool pk-folly-pools" style={{ left: 'calc(var(--u)*380.5)', '--p': '8.9s', '--pd': '.57', '--k': '.8' } as React.CSSProperties}>
              <svg viewBox="-60 0 120 140">
                <ellipse cx="0" cy="2" rx="18" ry="92" fill="url(#pk-folly-smear)"></ellipse>
              </svg>
            </div>
            {/* ripples cross the reflections and break them up */}
            <svg className="pk-folly-ripd" viewBox="0 0 480 340" preserveAspectRatio="none">
              <g fill="none" stroke="#040706" strokeLinecap="round">
                <path strokeOpacity=".42" strokeWidth=".9" d="M1 4q9 0.5 19 0q9 -0.5 19 0M428 4q12 0.5 24 0q12 -0.5 24 0M171 4q13 0.5 25 0q13 -0.5 25 0M330 4q11 -0.5 22 0q11 0.5 22 0q11 -0.5 22 0M110 9q14 -0.6 28 0q14 0.6 28 0M425 9q15 -0.6 30 0q15 0.6 30 0q15 -0.6 30 0M350 9q12 0.6 24 0q12 -0.6 24 0q12 0.6 24 0M326 9q11 -0.6 23 0q11 0.6 23 0M180 12q8 0.6 16 0q8 -0.6 16 0M406 12q14 0.6 29 0q14 -0.6 29 0q14 0.6 29 0M361 16q11 -0.6 22 0q11 0.6 22 0q11 -0.6 22 0M168 16q12 -0.6 24 0q12 0.6 24 0q12 -0.6 24 0q12 0.6 24 0M457 21q15 -0.7 30 0q15 0.7 30 0q15 -0.7 30 0M68 21q14 -0.7 28 0q14 0.7 28 0q14 -0.7 28 0M76 21q13 -0.7 27 0q13 0.7 27 0q13 -0.7 27 0M335 26q13 0.7 26 0q13 -0.7 26 0q13 0.7 26 0M229 26q12 -0.7 23 0q12 0.7 23 0q12 -0.7 23 0q12 0.7 23 0M318 26q14 0.7 27 0q14 -0.7 27 0q14 0.7 27 0q14 -0.7 27 0M-3 32q13 0.7 25 0q13 -0.7 25 0q13 0.7 25 0q13 -0.7 25 0M360 32q12 0.7 24 0q12 -0.7 24 0q12 0.7 24 0M212 32q13 0.7 25 0q13 -0.7 25 0q13 0.7 25 0M367 32q10 -0.7 19 0q10 0.7 19 0M89 38q12 0.8 23 0q12 -0.8 23 0q12 0.8 23 0M260 38q11 0.8 21 0q11 -0.8 21 0M186 38q10 -0.8 20 0q10 0.8 20 0M30 45q12 -0.8 24 0q12 0.8 24 0q12 -0.8 24 0M458 45q13 0.8 27 0q13 -0.8 27 0q13 0.8 27 0q13 -0.8 27 0M80 52q14 -0.9 28 0q14 0.9 28 0q14 -0.9 28 0q14 0.9 28 0M433 52q11 0.9 21 0q11 -0.9 21 0M-0 52q14 0.9 27 0q14 -0.9 27 0q14 0.9 27 0q14 -0.9 27 0M409 52q11 -0.9 22 0q11 0.9 22 0M298 59q12 0.9 25 0q12 -0.9 25 0q12 0.9 25 0M138 59q13 0.9 26 0q13 -0.9 26 0q13 0.9 26 0q13 -0.9 26 0q13 0.9 26 0M102 59q12 0.9 24 0q12 -0.9 24 0q12 0.9 24 0q12 -0.9 24 0"></path>
                <path strokeOpacity=".36" strokeWidth="1.4" d="M378 67q14 -1.0 27 0q14 1.0 27 0q14 -1.0 27 0q14 1.0 27 0M281 67q15 -1.0 31 0q15 1.0 31 0M91 67q14 -1.0 28 0q14 1.0 28 0q14 -1.0 28 0q14 1.0 28 0M290 75q14 -1.0 28 0q14 1.0 28 0q14 -1.0 28 0q14 1.0 28 0q14 -1.0 28 0M169 75q14 -1.0 28 0q14 1.0 28 0q14 -1.0 28 0q14 1.0 28 0M433 75q12 1.0 24 0q12 -1.0 24 0q12 1.0 24 0q12 -1.0 24 0q12 1.0 24 0M386 75q12 1.0 24 0q12 -1.0 24 0q12 1.0 24 0q12 -1.0 24 0M81 84q14 -1.1 28 0q14 1.1 28 0q14 -1.1 28 0M36 84q12 -1.1 24 0q12 1.1 24 0q12 -1.1 24 0q12 1.1 24 0M321 84q13 1.1 26 0q13 -1.1 26 0q13 1.1 26 0q13 -1.1 26 0M91 84q13 1.1 26 0q13 -1.1 26 0q13 1.1 26 0q13 -1.1 26 0q13 1.1 26 0M331 92q13 -1.2 25 0q13 1.2 25 0q13 -1.2 25 0q13 1.2 25 0q13 -1.2 25 0q13 1.2 25 0M327 92q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0M452 102q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0M100 102q13 -1.2 27 0q13 1.2 27 0q13 -1.2 27 0M106 102q13 1.2 25 0q13 -1.2 25 0q13 1.2 25 0M153 113q14 1.3 28 0q14 -1.3 28 0q14 1.3 28 0q14 -1.3 28 0q14 1.3 28 0q14 -1.3 28 0M3 113q12 1.3 25 0q12 -1.3 25 0q12 1.3 25 0q12 -1.3 25 0q12 1.3 25 0q12 -1.3 25 0M68 113q15 -1.3 29 0q15 1.3 29 0q15 -1.3 29 0q15 1.3 29 0M234 113q12 1.3 24 0q12 -1.3 24 0q12 1.3 24 0M158 123q12 1.4 25 0q12 -1.4 25 0q12 1.4 25 0q12 -1.4 25 0q12 1.4 25 0q12 -1.4 25 0q12 1.4 25 0M445 123q14 -1.4 28 0q14 1.4 28 0M351 123q13 -1.4 26 0q13 1.4 26 0M73 123q11 1.4 22 0q11 -1.4 22 0q11 1.4 22 0M457 135q14 1.5 28 0q14 -1.5 28 0q14 1.5 28 0q14 -1.5 28 0q14 1.5 28 0q14 -1.5 28 0M122 135q15 1.5 31 0q15 -1.5 31 0M256 135q12 -1.5 25 0q12 1.5 25 0q12 -1.5 25 0M152 147q12 1.6 24 0q12 -1.6 24 0q12 1.6 24 0M254 147q12 1.6 24 0q12 -1.6 24 0q12 1.6 24 0q12 -1.6 24 0M120 160q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0M357 160q13 -1.7 25 0q13 1.7 25 0q13 -1.7 25 0q13 1.7 25 0q13 -1.7 25 0q13 1.7 25 0q13 -1.7 25 0M56 160q14 -1.7 28 0q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0"></path>
                <path strokeOpacity=".3" strokeWidth="2" d="M292 172q16 1.7 31 0q16 -1.7 31 0M417 172q12 -1.7 25 0q12 1.7 25 0q12 -1.7 25 0M300 172q13 1.7 27 0q13 -1.7 27 0q13 1.7 27 0q13 -1.7 27 0M30 185q12 -1.8 25 0q12 1.8 25 0q12 -1.8 25 0q12 1.8 25 0q12 -1.8 25 0q12 1.8 25 0q12 -1.8 25 0q12 1.8 25 0M393 185q13 -1.8 26 0q13 1.8 26 0q13 -1.8 26 0q13 1.8 26 0q13 -1.8 26 0q13 1.8 26 0q13 -1.8 26 0M332 199q13 -1.9 26 0q13 1.9 26 0q13 -1.9 26 0q13 1.9 26 0q13 -1.9 26 0q13 1.9 26 0q13 -1.9 26 0M248 199q13 1.9 25 0q13 -1.9 25 0q13 1.9 25 0q13 -1.9 25 0q13 1.9 25 0q13 -1.9 25 0q13 1.9 25 0q13 -1.9 25 0M274 199q12 -1.9 23 0q12 1.9 23 0q12 -1.9 23 0M9 213q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0M255 213q12 -2.0 25 0q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0M123 227q13 2.1 26 0q13 -2.1 26 0q13 2.1 26 0q13 -2.1 26 0q13 2.1 26 0q13 -2.1 26 0q13 2.1 26 0q13 -2.1 26 0M191 227q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0M245 241q15 -2.3 30 0q15 2.3 30 0q15 -2.3 30 0M403 241q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0M77 241q12 2.3 25 0q12 -2.3 25 0q12 2.3 25 0q12 -2.3 25 0q12 2.3 25 0q12 -2.3 25 0q12 2.3 25 0q12 -2.3 25 0q12 2.3 25 0q12 -2.3 25 0M375 255q13 -2.4 26 0q13 2.4 26 0q13 -2.4 26 0q13 2.4 26 0M345 255q13 2.4 26 0q13 -2.4 26 0q13 2.4 26 0q13 -2.4 26 0q13 2.4 26 0q13 -2.4 26 0M231 255q12 -2.4 23 0q12 2.4 23 0q12 -2.4 23 0q12 2.4 23 0M438 255q14 2.4 28 0q14 -2.4 28 0q14 2.4 28 0M151 271q14 -2.5 28 0q14 2.5 28 0q14 -2.5 28 0q14 2.5 28 0q14 -2.5 28 0q14 2.5 28 0M307 271q12 2.5 24 0q12 -2.5 24 0q12 2.5 24 0q12 -2.5 24 0M77 271q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0M0 286q14 -2.6 28 0q14 2.6 28 0q14 -2.6 28 0q14 2.6 28 0q14 -2.6 28 0M344 286q12 -2.6 24 0q12 2.6 24 0q12 -2.6 24 0q12 2.6 24 0q12 -2.6 24 0M356 286q12 -2.6 23 0q12 2.6 23 0q12 -2.6 23 0q12 2.6 23 0q12 -2.6 23 0M45 286q13 2.6 26 0q13 -2.6 26 0q13 2.6 26 0q13 -2.6 26 0q13 2.6 26 0q13 -2.6 26 0q13 2.6 26 0q13 -2.6 26 0q13 2.6 26 0M48 302q14 -2.7 28 0q14 2.7 28 0q14 -2.7 28 0q14 2.7 28 0q14 -2.7 28 0q14 2.7 28 0M295 302q12 -2.7 25 0q12 2.7 25 0q12 -2.7 25 0q12 2.7 25 0q12 -2.7 25 0q12 2.7 25 0M62 319q14 -2.8 27 0q14 2.8 27 0q14 -2.8 27 0q14 2.8 27 0q14 -2.8 27 0q14 2.8 27 0q14 -2.8 27 0M430 319q12 2.8 25 0q12 -2.8 25 0q12 2.8 25 0q12 -2.8 25 0q12 2.8 25 0q12 -2.8 25 0q12 2.8 25 0q12 -2.8 25 0q12 2.8 25 0q12 -2.8 25 0M403 319q13 2.8 26 0q13 -2.8 26 0q13 2.8 26 0q13 -2.8 26 0q13 2.8 26 0q13 -2.8 26 0"></path>
              </g>
            </svg>
            <svg className="pk-folly-ripl" viewBox="0 0 480 340" preserveAspectRatio="none">
              <g fill="none" stroke="#f5f0dc" strokeLinecap="round">
                <path strokeOpacity=".17" strokeWidth=".8" d="M460 4q14 0.5 28 0q14 -0.5 28 0M144 4q16 -0.5 32 0q16 0.5 32 0M212 9q15 0.6 29 0q15 -0.6 29 0q15 0.6 29 0M442 9q14 -0.6 28 0q14 0.6 28 0M102 13q9 0.6 18 0q9 -0.6 18 0M346 13q15 0.6 30 0q15 -0.6 30 0M32 13q14 -0.6 27 0q14 0.6 27 0M415 13q12 -0.6 24 0q12 0.6 24 0q12 -0.6 24 0q12 0.6 24 0M460 19q11 -0.7 23 0q11 0.7 23 0q11 -0.7 23 0M271 19q12 0.7 25 0q12 -0.7 25 0q12 0.7 25 0q12 -0.7 25 0M289 19q10 0.7 20 0q10 -0.7 20 0M205 19q11 -0.7 22 0q11 0.7 22 0M346 27q13 -0.7 25 0q13 0.7 25 0q13 -0.7 25 0M419 27q13 0.7 25 0q13 -0.7 25 0q13 0.7 25 0q13 -0.7 25 0M310 27q11 0.7 21 0q11 -0.7 21 0M458 35q13 0.8 27 0q13 -0.8 27 0q13 0.8 27 0q13 -0.8 27 0M415 35q11 -0.8 21 0q11 0.8 21 0M9 35q13 -0.8 27 0q13 0.8 27 0q13 -0.8 27 0M341 35q12 -0.8 24 0q12 0.8 24 0M299 43q14 0.8 28 0q14 -0.8 28 0q14 0.8 28 0q14 -0.8 28 0M130 43q12 -0.8 25 0q12 0.8 25 0q12 -0.8 25 0q12 0.8 25 0M259 53q12 -0.9 25 0q12 0.9 25 0q12 -0.9 25 0q12 0.9 25 0q12 -0.9 25 0M260 53q15 -0.9 30 0q15 0.9 30 0M112 53q9 -0.9 18 0q9 0.9 18 0"></path>
                <path strokeOpacity=".08" strokeWidth="1.1" d="M78 63q13 -1.0 26 0q13 1.0 26 0q13 -1.0 26 0q13 1.0 26 0M349 63q14 1.0 28 0q14 -1.0 28 0q14 1.0 28 0M187 75q13 -1.1 26 0q13 1.1 26 0q13 -1.1 26 0q13 1.1 26 0M223 75q14 -1.1 27 0q14 1.1 27 0M110 75q13 1.1 27 0q13 -1.1 27 0M16 89q12 -1.2 24 0q12 1.2 24 0q12 -1.2 24 0q12 1.2 24 0q12 -1.2 24 0q12 1.2 24 0M106 89q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0M414 89q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0q13 1.2 26 0q13 -1.2 26 0M457 89q14 -1.2 29 0q14 1.2 29 0q14 -1.2 29 0q14 1.2 29 0q14 -1.2 29 0M459 102q13 -1.3 26 0q13 1.3 26 0q13 -1.3 26 0q13 1.3 26 0q13 -1.3 26 0M280 102q13 -1.3 26 0q13 1.3 26 0q13 -1.3 26 0q13 1.3 26 0q13 -1.3 26 0q13 1.3 26 0M335 102q14 1.3 27 0q14 -1.3 27 0q14 1.3 27 0q14 -1.3 27 0q14 1.3 27 0M255 102q13 -1.3 26 0q13 1.3 26 0M171 116q13 1.4 26 0q13 -1.4 26 0q13 1.4 26 0M368 116q13 1.4 26 0q13 -1.4 26 0q13 1.4 26 0M381 132q12 -1.6 25 0q12 1.6 25 0q12 -1.6 25 0q12 1.6 25 0q12 -1.6 25 0M98 132q12 1.6 25 0q12 -1.6 25 0q12 1.6 25 0q12 -1.6 25 0q12 1.6 25 0q12 -1.6 25 0q12 1.6 25 0M143 132q14 -1.6 28 0q14 1.6 28 0q14 -1.6 28 0q14 1.6 28 0q14 -1.6 28 0q14 1.6 28 0M182 149q14 -1.7 28 0q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0q14 -1.7 28 0q14 1.7 28 0M58 149q13 1.7 27 0q13 -1.7 27 0q13 1.7 27 0q13 -1.7 27 0q13 1.7 27 0q13 -1.7 27 0q13 1.7 27 0"></path>
                <path strokeOpacity=".045" strokeWidth="1.5" d="M110 167q15 1.8 29 0q15 -1.8 29 0q15 1.8 29 0M60 167q14 -1.8 28 0q14 1.8 28 0q14 -1.8 28 0q14 1.8 28 0q14 -1.8 28 0M450 167q11 1.8 22 0q11 -1.8 22 0q11 1.8 22 0M199 167q13 1.8 26 0q13 -1.8 26 0q13 1.8 26 0q13 -1.8 26 0q13 1.8 26 0q13 -1.8 26 0q13 1.8 26 0M423 185q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0q12 -2.0 25 0q12 2.0 25 0M8 185q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0q13 -2.0 26 0q13 2.0 26 0M102 205q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0M77 205q12 2.1 25 0q12 -2.1 25 0q12 2.1 25 0q12 -2.1 25 0q12 2.1 25 0q12 -2.1 25 0q12 2.1 25 0q12 -2.1 25 0M55 205q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0q13 2.1 27 0q13 -2.1 27 0M-9 225q12 -2.3 23 0q12 2.3 23 0q12 -2.3 23 0q12 2.3 23 0M245 225q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0q13 2.3 26 0q13 -2.3 26 0M74 225q13 -2.3 27 0q13 2.3 27 0q13 -2.3 27 0q13 2.3 27 0q13 -2.3 27 0q13 2.3 27 0M384 245q13 -2.5 27 0q13 2.5 27 0q13 -2.5 27 0q13 2.5 27 0q13 -2.5 27 0M258 245q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0q13 -2.5 26 0q13 2.5 26 0M29 266q14 2.6 28 0q14 -2.6 28 0q14 2.6 28 0q14 -2.6 28 0M61 266q14 2.6 28 0q14 -2.6 28 0q14 2.6 28 0q14 -2.6 28 0q14 2.6 28 0M451 289q14 -2.8 28 0q14 2.8 28 0q14 -2.8 28 0q14 2.8 28 0q14 -2.8 28 0q14 2.8 28 0q14 -2.8 28 0M18 289q14 -2.8 27 0q14 2.8 27 0q14 -2.8 27 0q14 2.8 27 0q14 -2.8 27 0q14 2.8 27 0"></path>
              </g>
            </svg>
            <svg className="pk-folly-watertop" viewBox="0 0 480 10" preserveAspectRatio="none">
              <path d="M0 4C40 2.8 80 5 120 3.8S200 5 240 3.6S330 5 370 3.8S440 4.8 480 3.8" fill="none" stroke="url(#pk-folly-sl)" strokeWidth="1.1" strokeDasharray="26 5 60 8 14 4 90 10"></path>
            </svg>
            <span className="pk-folly-rip" style={{ left: '31%', top: 'calc(var(--u)*26)' } as React.CSSProperties}></span>
            {' '}
            <span className="pk-folly-rip" style={{ left: 'calc(50*var(--pk-vw) + var(--u)*205 - var(--ce))', top: 'calc(var(--u)*2)' } as React.CSSProperties}></span>
          </div>
          <svg className="pk-folly-rain pk-folly-rainn" width="100%" height="100%" aria-hidden="true">
            <defs>
              <pattern id="pk-folly-rb" width="150" height="300" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
                <g fill="url(#pk-folly-rd)">
                  <rect x="14" y="30" width="1.2" height="44"></rect>
                  <rect x="62" y="170" width="1.2" height="36"></rect>
                  <rect x="108" y="84" width="1.2" height="52"></rect>
                  <rect x="132" y="236" width="1.2" height="30"></rect>
                  <rect x="38" y="252" width="1.2" height="24"></rect>
                  <rect x="86" y="8" width="1.2" height="34"></rect>
                  <rect x="4" y="136" width="1.2" height="28"></rect>
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pk-folly-rb)"></rect>
          </svg>
          <div className="pk-folly-layer pk-folly-vig" aria-hidden="true"></div>
          <div className="pk-folly-layer pk-folly-grain" aria-hidden="true"></div>
          <div className="pk-folly-layer pk-folly-sheet" aria-hidden="true"></div>
          <div className="pk-folly-layer pk-folly-flash" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  );
}
