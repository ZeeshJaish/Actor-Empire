import React, { useEffect, useRef } from 'react';
import { nameFit, packName, packShortName } from './packName';
import { useMergedState } from './useMergedState';
import { usePackSounds, type PackMusic, type PackSoundFiles } from './packAudio';
import PackSoundToggle from './PackSoundToggle';
import '../../styles/packs/pack-sue.css';

const TO = ['YOUR EX', 'YOUR MOTHER', 'A CRITIC', 'THE STUDIO', 'YOUR NEIGHBOUR', 'YOUR AGENT', 'YOUR RIVAL', 'EVERYONE'];
const LINES = ['Sue your ex.\nSue your mother.', 'Hire the meanest lawyers alive', 'Bankrupt critics for bad reviews', 'Flip witnesses and dig up dirt', "Seize a rival's mansion in court", 'Grill your rival on the stand', 'Appeal it to a higher court', 'Sue anyone\nyou can tap'];
// The typed x's on the blank rows, cut to the length of the two lines of words underneath.
const BLANKS = [[9, 13], [14, 11], [14, 13], [12, 13], [13, 14], [14, 10], [12, 10], [9, 10]];
// How each sheet lies in the pile and where the wind takes it.
const RE = ['THE GOOD SOFA', 'YOUR CHILDHOOD', 'TWO STARS', 'YOUR BEST SCENE', 'THE HEDGE', 'THE TEN PERCENT', 'THE MANSION', 'ALL OF IT'];
const LIE = [[.6, -.8], [-1.4, 1], [1.2, -.5], [-.8, -1.6], [1.6, .9], [-1.2, -.3], [.6, 1.3], [0, -.6]];
const AWAY = [[430, -150, 62], [460, -60, 40], [410, -230, 80], [470, -120, 34], [430, -40, 58], [450, -200, 44], [440, -100, 70], [0, 0, 0]];
// Where the ink lands on the building, one per tap: x, y (world units), width, rotation, foreshortening.
const MARKS = [[29, 292, 52, -9, 1], [326, 356, 84, 7, .72], [58, 122, 84, -12, 1], [346, 292, 52, 6, 1], [52, 362, 80, -6, .72], [338, 182, 64, 10, 1], [347, 112, 50, -8, 1]];
const BIRDS = [
  { x: 20, y: 236, s: 1, f: -1, fx: -130, fy: -240, dl: '0s', idle: false },
  { x: 47, y: 240, s: .86, f: -1, fx: -60, fy: -280, dl: '.05s', idle: false },
  { x: 328, y: 240, s: .9, f: 1, fx: 90, fy: -290, dl: '.02s', idle: true },
  { x: 355, y: 236, s: 1, f: 1, fx: 140, fy: -230, dl: '.08s', idle: false },
];
// What a name takes up on the page's typed lines, as the screen draws it: a flag or a joined emoji is one character, and a full-width character (Han, Kana, Hangul) or an emoji fills two columns.
const CHAR = /\p{RI}\p{RI}|\p{ExtPict}[\ufe0f\u{1f3fb}-\u{1f3ff}]?(?:\u200d\p{ExtPict}[\ufe0f\u{1f3fb}-\u{1f3ff}]?)*|./gu;
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6\u{20000}-\u{3fffd}]|\p{ExtPict}|\p{RI}/u;
const chars = (text: string): string[] => text.match(CHAR) ?? [];
const cols = (text: string) => chars(text).reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0);
const cutToCols = (text: string, room: number) => {
  let out = '';
  for (const ch of chars(text)) {
    if (cols(out + ch) > room) break;
    out += ch;
  }
  return out;
};
// nameFit counts characters, so it gets the line in columns.
const colFit = (line: string, room: number) => nameFit('x'.repeat(cols(line)), room);

/* rendered by scripts/audio/render-pack-sounds.mjs from scripts/audio/packs/sue.mjs. final.m4a lands the giant stamp at 440 ms, with the page's print */
const SUE_SOUNDS: PackSoundFiles = {
  tap: () => new URL('../../assets/audio/packs/sue/tap.m4a', import.meta.url).href,
  final: () => new URL('../../assets/audio/packs/sue/final.m4a', import.meta.url).href,
  notify: () => new URL('../../assets/audio/packs/sue/notify.m4a', import.meta.url).href,
  click: () => new URL('../../assets/audio/packs/sue/click.m4a', import.meta.url).href,
};
/* the loop points are printed by the render: one period apart, inside the part of the file that repeats */
const SUE_MUSIC: PackMusic = {
  url: () => new URL('../../assets/audio/packs/sue/music.m4a', import.meta.url).href,
  loopStart: 9.572925,
  loopEnd: 33.572925,
};

interface SueEveryonePackScreenProps {
  playerName: string;
  onBack: () => void;
}

export default function SueEveryonePackScreen({ playerName, onBack }: SueEveryonePackScreenProps) {
  const [state, set, latest] = useMergedState({ step: 0, flown: 0, filled: 0, newest: -1, pressed: false, finale: false, final: false, settle: 0, birdGo: 0, burst: false, notified: false, scrollY: 0 });
  const lastLift = useRef(0);
  const finaleEnd = useRef(0);
  const flyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const finalTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const burstTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restoreTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { play, soundOn, toggleSound, duckMusic, restoreMusic } = usePackSounds(SUE_SOUNDS, SUE_MUSIC);
  useEffect(() => () => { [flyTimer, finalTimer, burstTimer, restoreTimer].forEach(timer => clearTimeout(timer.current)); }, []);

  const lift = () => {
    const now = Date.now();
    if (now - lastLift.current > 3100) { lastLift.current = now; return latest.current.birdGo + 1; }
    return latest.current.birdGo;
  };
  const press = () => set({ pressed: true });
  const release = () => { if (latest.current.pressed) set({ pressed: false }); };
  const stamp = (e: React.MouseEvent<HTMLElement>) => {
    const { step, settle } = latest.current;
    clearTimeout(flyTimer.current);
    if (step >= 8) { if (Date.now() < finaleEnd.current) return; play('tap', { rate: 1.12 }); set({ settle: settle + 1, birdGo: lift() }); return; }
    const next = step + 1;
    if (next < 8) {
      /* the stamp's blow is baked in at 156 ms, where it lands on the sheet */
      play('tap', { rate: 1 + next * .016 });
      set({ step: next, flown: step, filled: step, newest: step - 1, birdGo: lift() });
      flyTimer.current = setTimeout(() => set({ flown: next, filled: next, newest: next - 1 }), 620);
    } else {
      finaleEnd.current = Date.now() + 1800;
      play('final'); duckMusic(); clearTimeout(restoreTimer.current); restoreTimer.current = setTimeout(restoreMusic, 2000);
      // Short phones scroll: the giant print has to land on the sheet where the sheet is right now.
      const root = e.currentTarget.closest('.pk-sue-root');
      set({ step: 8, flown: 7, filled: 7, newest: 6, finale: true, birdGo: lift(), scrollY: root ? root.scrollTop : 0 });
      finalTimer.current = setTimeout(() => set({ final: true, filled: 8, newest: 7 }), 440);
    }
  };
  const notify = () => {
    if (latest.current.notified || latest.current.burst) return;
    play('notify');
    set({ burst: true, birdGo: lift() });
    burstTimer.current = setTimeout(() => set({ notified: true }), 170);
  };

  const { step, flown, filled, newest, pressed, finale, final, settle, birdGo, burst, notified, scrollY } = state;
  const hit = settle ? 'pk-sue-settle-' + (settle % 2) : finale ? 'pk-sue-hit-final' : step ? 'pk-sue-hit-' + (step % 2) : '';
  const fullName = packName(playerName);
  // The name is the joke, on two one-line slots and at any length: past 22 columns it takes its short form (a suffix is not a surname), and the fit shrinks what is left.
  const name = cutToCols(cols(fullName) <= 22 ? fullName : packShortName(fullName.replace(/ (JR\.?|SR\.?|II|III|IV|V)$/, ''), 22), 22);
  const docket = `${name} v. EVERYONE`;
  const signed = `SIGNED, ${name}`;
  const v = {
    rootClass: [hit, finale ? 'pk-sue-is-finale' : '', final ? 'pk-sue-is-final' : '', pressed ? 'pk-sue-is-pressed' : '', burst ? 'pk-sue-is-burst' : ''].join(' '),
    k: String(Math.max(step - 1, 0)),
    scrollY: scrollY + 'px',
    birdClass: birdGo ? 'pk-sue-birds-' + (birdGo % 2) : '',
    marksClass: step ? 'pk-sue-is-inked' : '',
    birds: BIRDS.map(b => ({ ...b, cls: b.idle ? 'pk-sue-is-idle' : '' })),
    stamp, press, release, notify,
    heroLabel: final ? 'All served. Stamp it again' : 'Stamp the subpoena',
    hint: final ? 'ALL\nSERVED' : 'STAMP THE\nSUBPOENA',
    sheets: TO.map((to, i) => ({
      to, re: RE[i], n: String(i + 1),
      x: String(LIE[i][0]), r: LIE[i][1] + 'deg', z: String(5 + (7 - i) * 1.9),
      fx: String(AWAY[i][0]), fy: String(AWAY[i][1]), fr: AWAY[i][2] + 'deg',
      cls: [i < flown ? 'pk-sue-is-flown' : '', i < step ? 'pk-sue-is-stamped' : '', i === 7 && final ? 'pk-sue-is-big' : ''].join(' '),
    })).reverse(),
    rows: LINES.map((text, i) => ({
      text, no: String(i + 1), blank: 'x'.repeat(BLANKS[i][0]) + '\n' + 'x'.repeat(BLANKS[i][1]),
      cls: [i < filled ? 'pk-sue-is-filled' : '', i === newest && i < filled ? 'pk-sue-is-new' : ''].join(' '),
    })),
    marks: MARKS.map((m, i) => ({ x: String(m[0]), y: String(m[1]), w: String(m[2]), r: m[3] + 'deg', sy: String(m[4]), cls: i < step ? 'pk-sue-is-on' : '' })),
    servedText: filled + ' OF 8 SERVED',
    notified, notNotified: !notified,
    ctaClass: notified ? 'pk-sue-is-done' : '',
    ctaLabel: notified ? "You're on the docket" : final ? 'Serve them all' : 'Notify me on release',
  };
  return (
    <div className={`pk-sue-root ${v.rootClass}`} style={{ '--k': v.k, '--sue-sy': v.scrollY } as React.CSSProperties}>
      <div className="pk-sue-stage">
        <svg className="pk-sue-world" viewBox="-100 -60 575 1160" aria-hidden="true" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="pk-sue-g-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d8ca8"></stop>
              <stop offset="1" stopColor="#aab6ca"></stop>
            </linearGradient>
            <linearGradient id="pk-sue-g-land" gradientUnits="userSpaceOnUse" x1="-40" y1="180" x2="430" y2="330">
              <stop offset="0" stopColor="#fefdfa"></stop>
              <stop offset="1" stopColor="#f3f1eb"></stop>
            </linearGradient>
            <linearGradient id="pk-sue-g-band" gradientUnits="userSpaceOnUse" x1="0" y1="326" x2="0" y2="760">
              <stop offset="0" stopColor="#8496b6" stopOpacity=".52"></stop>
              <stop offset="1" stopColor="#8496b6" stopOpacity=".44"></stop>
            </linearGradient>
            <linearGradient id="pk-sue-g-pl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e3e7ee"></stop>
              <stop offset="1" stopColor="#d3d9e3"></stop>
            </linearGradient>
          </defs>
          <rect x="-100" y="-60" width="575" height="240" fill="url(#pk-sue-g-wall)"></rect>
          <path d="M150 180L154 -60H221L225 180Z" fill="#6a7995"></path>
          <path d="M187.5 180V-60" stroke="#566480" strokeWidth="1.2"></path>
          <rect x="-100" y="178" width="575" height="16" fill="#cdd4df"></rect>
          <rect x="-100" y="190" width="575" height="140" fill="url(#pk-sue-g-land)"></rect>
          <path fill="#a0adc6" d="M-157.1 197L-150.3 195.5L81.9 -70L79.8 -70ZM-7.1 197L-0.3 195.5L128.8 -70L126.7 -70ZM142.9 197L149.7 195.5L175.7 -70L173.6 -70ZM292.9 197L299.7 195.5L222.6 -70L220.4 -70ZM442.9 197L449.7 195.5L269.4 -70L267.3 -70ZM592.9 197L599.7 195.5L316.3 -70L314.2 -70Z"></path>
          <path fill="#b0bacf" d="M-150.3 195.5L-146 194.4L83.3 -70L81.9 -70ZM-0.3 195.5L4 194.4L130.2 -70L128.8 -70ZM149.7 195.5L154 194.4L177 -70L175.7 -70ZM299.7 195.5L304 194.4L223.9 -70L222.6 -70ZM449.7 195.5L454 194.4L270.8 -70L269.4 -70ZM599.7 195.5L604 194.4L317.7 -70L316.3 -70Z"></path>
          <path fill="#bfc7d7" d="M-166 198.5L-157.1 197L79.8 -70L77 -70ZM-146 194.4L-144.5 194L83.8 -70L83.3 -70ZM-16 198.5L-7.1 197L126.7 -70L123.9 -70ZM4 194.4L5.5 194L130.6 -70L130.2 -70ZM134 198.5L142.9 197L173.6 -70L170.8 -70ZM154 194.4L155.5 194L177.5 -70L177 -70ZM284 198.5L292.9 197L220.4 -70L217.7 -70ZM304 194.4L305.5 194L224.4 -70L223.9 -70ZM434 198.5L442.9 197L267.3 -70L264.5 -70ZM454 194.4L455.5 194L271.3 -70L270.8 -70ZM584 198.5L592.9 197L314.2 -70L311.4 -70ZM604 194.4L605.5 194L318.1 -70L317.7 -70Z"></path>
          <path fill="#dee2e8" d="M-176.4 199.6L-166 198.5L77 -70L73.8 -70ZM-26.4 199.6L-16 198.5L123.9 -70L120.7 -70ZM123.6 199.6L134 198.5L170.8 -70L167.5 -70ZM273.6 199.6L284 198.5L217.7 -70L214.4 -70ZM423.6 199.6L434 198.5L264.5 -70L261.3 -70ZM573.6 199.6L584 198.5L311.4 -70L308.2 -70Z"></path>
          <path fill="#eeeff1" d="M-230.5 194L-229 194.4L57.3 -70L56.9 -70ZM-229 194.4L-224.7 195.5L58.7 -70L57.3 -70ZM-198.6 199.6L-187.5 200L70.3 -70L66.8 -70ZM-187.5 200L-176.4 199.6L73.8 -70L70.3 -70ZM-80.5 194L-79 194.4L104.2 -70L103.8 -70ZM-79 194.4L-74.7 195.5L105.6 -70L104.2 -70ZM-48.6 199.6L-37.5 200L117.2 -70L113.7 -70ZM-37.5 200L-26.4 199.6L120.7 -70L117.2 -70ZM69.5 194L71 194.4L151.1 -70L150.6 -70ZM71 194.4L75.3 195.5L152.4 -70L151.1 -70ZM101.4 199.6L112.5 200L164.1 -70L160.6 -70ZM112.5 200L123.6 199.6L167.5 -70L164.1 -70ZM219.5 194L221 194.4L198 -70L197.5 -70ZM221 194.4L225.3 195.5L199.3 -70L198 -70ZM251.4 199.6L262.5 200L210.9 -70L207.5 -70ZM262.5 200L273.6 199.6L214.4 -70L210.9 -70ZM369.5 194L371 194.4L244.8 -70L244.4 -70ZM371 194.4L375.3 195.5L246.2 -70L244.8 -70ZM401.4 199.6L412.5 200L257.8 -70L254.3 -70ZM412.5 200L423.6 199.6L261.3 -70L257.8 -70ZM519.5 194L521 194.4L291.7 -70L291.3 -70ZM521 194.4L525.3 195.5L293.1 -70L291.7 -70ZM551.4 199.6L562.5 200L304.7 -70L301.2 -70ZM562.5 200L573.6 199.6L308.2 -70L304.7 -70Z"></path>
          <path fill="#fdfcf9" d="M-224.7 195.5L-217.9 197L60.8 -70L58.7 -70ZM-217.9 197L-209 198.5L63.6 -70L60.8 -70ZM-209 198.5L-198.6 199.6L66.8 -70L63.6 -70ZM-74.7 195.5L-67.9 197L107.7 -70L105.6 -70ZM-67.9 197L-59 198.5L110.5 -70L107.7 -70ZM-59 198.5L-48.6 199.6L113.7 -70L110.5 -70ZM75.3 195.5L82.1 197L154.6 -70L152.4 -70ZM82.1 197L91 198.5L157.3 -70L154.6 -70ZM91 198.5L101.4 199.6L160.6 -70L157.3 -70ZM225.3 195.5L232.1 197L201.4 -70L199.3 -70ZM232.1 197L241 198.5L204.2 -70L201.4 -70ZM241 198.5L251.4 199.6L207.5 -70L204.2 -70ZM375.3 195.5L382.1 197L248.3 -70L246.2 -70ZM382.1 197L391 198.5L251.1 -70L248.3 -70ZM391 198.5L401.4 199.6L254.3 -70L251.1 -70ZM525.3 195.5L532.1 197L295.2 -70L293.1 -70ZM532.1 197L541 198.5L298 -70L295.2 -70ZM541 198.5L551.4 199.6L301.2 -70L298 -70Z"></path>
          <path fill="#5f7096" fillOpacity=".22" d="M-230.5 194L-229.9 194.2L57.1 -70L56.9 -70ZM-229 194.4L-227.2 194.9L57.9 -70L57.3 -70ZM-224.7 195.5L-221.9 196.2L59.6 -70L58.7 -70ZM-217.9 197L-214.2 197.7L62 -70L60.8 -70ZM-209 198.5L-204.6 199L65 -70L63.6 -70ZM-198.6 199.6L-194 199.9L68.3 -70L66.8 -70ZM-187.5 200L-182.8 199.9L71.8 -70L70.3 -70ZM-176.4 199.6L-172 199.2L75.2 -70L73.8 -70ZM-166 198.5L-162.3 197.9L78.2 -70L77 -70ZM-157.1 197L-154.2 196.4L80.7 -70L79.8 -70ZM-150.3 195.5L-148.5 195.1L82.5 -70L81.9 -70ZM-146 194.4L-145.3 194.2L83.5 -70L83.3 -70ZM-80.5 194L-79.9 194.2L103.9 -70L103.8 -70ZM-79 194.4L-77.2 194.9L104.8 -70L104.2 -70ZM-74.7 195.5L-71.9 196.2L106.4 -70L105.6 -70ZM-67.9 197L-64.2 197.7L108.9 -70L107.7 -70ZM-59 198.5L-54.6 199L111.8 -70L110.5 -70ZM-48.6 199.6L-44 199.9L115.2 -70L113.7 -70ZM-37.5 200L-32.8 199.9L118.6 -70L117.2 -70ZM-26.4 199.6L-22 199.2L122 -70L120.7 -70ZM-16 198.5L-12.3 197.9L125.1 -70L123.9 -70ZM-7.1 197L-4.2 196.4L127.6 -70L126.7 -70ZM-0.3 195.5L1.5 195.1L129.4 -70L128.8 -70ZM4 194.4L4.7 194.2L130.4 -70L130.2 -70ZM69.5 194L70.1 194.2L150.8 -70L150.6 -70ZM71 194.4L72.8 194.9L151.6 -70L151.1 -70ZM75.3 195.5L78.1 196.2L153.3 -70L152.4 -70ZM82.1 197L85.8 197.7L155.7 -70L154.6 -70ZM91 198.5L95.4 199L158.7 -70L157.3 -70ZM101.4 199.6L106 199.9L162 -70L160.6 -70ZM112.5 200L117.2 199.9L165.5 -70L164.1 -70ZM123.6 199.6L128 199.2L168.9 -70L167.5 -70ZM134 198.5L137.7 197.9L172 -70L170.8 -70ZM142.9 197L145.8 196.4L174.5 -70L173.6 -70ZM149.7 195.5L151.5 195.1L176.3 -70L175.7 -70ZM154 194.4L154.7 194.2L177.2 -70L177 -70ZM219.5 194L220.1 194.2L197.7 -70L197.5 -70ZM221 194.4L222.8 194.9L198.5 -70L198 -70ZM225.3 195.5L228.1 196.2L200.2 -70L199.3 -70ZM232.1 197L235.8 197.7L202.6 -70L201.4 -70ZM241 198.5L245.4 199L205.6 -70L204.2 -70ZM251.4 199.6L256 199.9L208.9 -70L207.5 -70ZM262.5 200L267.2 199.9L212.4 -70L210.9 -70ZM273.6 199.6L278 199.2L215.8 -70L214.4 -70ZM284 198.5L287.7 197.9L218.8 -70L217.7 -70ZM292.9 197L295.8 196.4L221.3 -70L220.4 -70ZM299.7 195.5L301.5 195.1L223.1 -70L222.6 -70ZM304 194.4L304.7 194.2L224.1 -70L223.9 -70ZM369.5 194L370.1 194.2L244.6 -70L244.4 -70ZM371 194.4L372.8 194.9L245.4 -70L244.8 -70ZM375.3 195.5L378.1 196.2L247.1 -70L246.2 -70ZM382.1 197L385.8 197.7L249.5 -70L248.3 -70ZM391 198.5L395.4 199L252.5 -70L251.1 -70ZM401.4 199.6L406 199.9L255.8 -70L254.3 -70ZM412.5 200L417.2 199.9L259.3 -70L257.8 -70ZM423.6 199.6L428 199.2L262.7 -70L261.3 -70ZM434 198.5L437.7 197.9L265.7 -70L264.5 -70ZM442.9 197L445.8 196.4L268.2 -70L267.3 -70ZM449.7 195.5L451.5 195.1L270 -70L269.4 -70ZM454 194.4L454.7 194.2L271 -70L270.8 -70ZM519.5 194L520.1 194.2L291.4 -70L291.3 -70ZM521 194.4L522.8 194.9L292.3 -70L291.7 -70ZM525.3 195.5L528.1 196.2L293.9 -70L293.1 -70ZM532.1 197L535.8 197.7L296.4 -70L295.2 -70ZM541 198.5L545.4 199L299.3 -70L298 -70ZM551.4 199.6L556 199.9L302.7 -70L301.2 -70ZM562.5 200L567.2 199.9L306.1 -70L304.7 -70ZM573.6 199.6L578 199.2L309.5 -70L308.2 -70ZM584 198.5L587.7 197.9L312.6 -70L311.4 -70ZM592.9 197L595.8 196.4L315.1 -70L314.2 -70ZM599.7 195.5L601.5 195.1L316.9 -70L316.3 -70ZM604 194.4L604.7 194.2L317.9 -70L317.7 -70Z"></path>
          <path fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth=".7" d="M-229 194.4L57.3 -70M-224.7 195.5L58.7 -70M-217.9 197L60.8 -70M-209 198.5L63.6 -70M-198.6 199.6L66.8 -70M-187.5 200L70.3 -70M-176.4 199.6L73.8 -70M-166 198.5L77 -70M-157.1 197L79.8 -70M-150.3 195.5L81.9 -70M-146 194.4L83.3 -70M-144.5 194L83.8 -70M-79 194.4L104.2 -70M-74.7 195.5L105.6 -70M-67.9 197L107.7 -70M-59 198.5L110.5 -70M-48.6 199.6L113.7 -70M-37.5 200L117.2 -70M-26.4 199.6L120.7 -70M-16 198.5L123.9 -70M-7.1 197L126.7 -70M-0.3 195.5L128.8 -70M4 194.4L130.2 -70M5.5 194L130.6 -70M71 194.4L151.1 -70M75.3 195.5L152.4 -70M82.1 197L154.6 -70M91 198.5L157.3 -70M101.4 199.6L160.6 -70M112.5 200L164.1 -70M123.6 199.6L167.5 -70M134 198.5L170.8 -70M142.9 197L173.6 -70M149.7 195.5L175.7 -70M154 194.4L177 -70M155.5 194L177.5 -70M221 194.4L198 -70M225.3 195.5L199.3 -70M232.1 197L201.4 -70M241 198.5L204.2 -70M251.4 199.6L207.5 -70M262.5 200L210.9 -70M273.6 199.6L214.4 -70M284 198.5L217.7 -70M292.9 197L220.4 -70M299.7 195.5L222.6 -70M304 194.4L223.9 -70M305.5 194L224.4 -70M371 194.4L244.8 -70M375.3 195.5L246.2 -70M382.1 197L248.3 -70M391 198.5L251.1 -70M401.4 199.6L254.3 -70M412.5 200L257.8 -70M423.6 199.6L261.3 -70M434 198.5L264.5 -70M442.9 197L267.3 -70M449.7 195.5L269.4 -70M454 194.4L270.8 -70M455.5 194L271.3 -70M521 194.4L291.7 -70M525.3 195.5L293.1 -70M532.1 197L295.2 -70M541 198.5L298 -70M551.4 199.6L301.2 -70M562.5 200L304.7 -70M573.6 199.6L308.2 -70M584 198.5L311.4 -70M592.9 197L314.2 -70M599.7 195.5L316.3 -70M604 194.4L317.7 -70M605.5 194L318.1 -70"></path>
          <path fill="none" stroke="#66769a" strokeOpacity=".38" strokeWidth=".9" d="M-147.8 118Q-113.3 113.1 -78.8 118M-75.9 52Q-48.8 46.3 -21.7 52M-8.4 -10Q11.7 -16.4 31.9 -10M-27.5 118Q7 113.1 41.5 118M18.6 52Q45.7 46.3 72.8 52M61.9 -10Q82 -16.4 102.2 -10M92.9 118Q127.3 113.1 161.8 118M113.1 52Q140.2 46.3 167.3 52M132.2 -10Q152.3 -16.4 172.5 -10M213.2 118Q247.7 113.1 282.1 118M207.7 52Q234.8 46.3 261.9 52M202.5 -10Q222.7 -16.4 242.8 -10M333.5 118Q368 113.1 402.5 118M302.2 52Q329.3 46.3 356.4 52M272.8 -10Q293 -16.4 313.1 -10M453.8 118Q488.3 113.1 522.8 118M396.7 52Q423.8 46.3 450.9 52M343.1 -10Q363.3 -16.4 383.4 -10"></path>
          <rect x="-100" y="326" width="575" height="26" fill="#f8f6f1"></rect>
          <rect x="-100" y="352" width="575" height="32" fill="#f6f4ef"></rect>
          <rect x="-100" y="384" width="575" height="38" fill="#f8f6f1"></rect>
          <rect x="-100" y="422" width="575" height="52" fill="#f6f4ef"></rect>
          <rect x="-100" y="474" width="575" height="66" fill="#f8f6f1"></rect>
          <rect x="-100" y="540" width="575" height="85" fill="#f6f4ef"></rect>
          <rect x="-100" y="625" width="575" height="105" fill="#f8f6f1"></rect>
          <rect x="-100" y="730" width="575" height="120" fill="#f6f4ef"></rect>
          <rect x="-100" y="850" width="575" height="150" fill="#f8f6f1"></rect>
          <rect x="-100" y="1000" width="575" height="160" fill="#f6f4ef"></rect>
          <rect x="-100" y="1160" width="575" height="10" fill="#f8f6f1"></rect>
          <path fill="#d0d7e2" d="M-100 326H475V328.7H-100ZM-100 352H475V355.4H-100ZM-100 384H475V388H-100ZM-100 422H475V427.5H-100ZM-100 474H475V480.9H-100ZM-100 540H475V548.9H-100ZM-100 625H475V636H-100ZM-100 730H475V742.6H-100ZM-100 850H475V865.8H-100ZM-100 1000H475V1016.8H-100ZM-100 1160H475V1161.1H-100Z"></path>
          <path fill="none" stroke="#fff" strokeWidth="1.4" d="M-100 326H475M-100 352H475M-100 384H475M-100 422H475M-100 474H475M-100 540H475M-100 625H475M-100 730H475M-100 850H475M-100 1000H475M-100 1160H475"></path>
          <path fill="url(#pk-sue-g-band)" d="M-74 326L-73.7 328.7L-47.6 352L-47.2 355.4L-15.1 384L-14.7 388L23.4 422L24.1 427.5L76.2 474L77.1 480.9L143.2 540L144.3 548.9L229.5 625L230.8 636L336.1 730L337.6 742.6L457.9 850L459.8 865.8L610.1 1000L612.1 1016.8L694.3 1016.8L692.3 1000L535.2 865.8L533.3 850L407.7 742.6L406.1 730L296.2 636L294.9 625L205.9 548.9L204.8 540L135.7 480.9L134.8 474L80.4 427.5L79.7 422L39.9 388L39.5 384L6 355.4L5.6 352L-21.7 328.7L-22 326ZM-280 326L-279.7 328.7L-253.6 352L-253.2 355.4L-221.1 384L-220.7 388L-182.6 422L-181.9 427.5L-129.8 474L-128.9 480.9L-62.8 540L-61.7 548.9L23.5 625L24.8 636L130.1 730L131.6 742.6L251.9 850L253.8 865.8L404.1 1000L406.1 1016.8L502.3 1016.8L500.3 1000L343.2 865.8L341.3 850L215.7 742.6L214.1 730L104.2 636L102.9 625L13.9 548.9L12.8 540L-56.3 480.9L-57.2 474L-111.6 427.5L-112.3 422L-152.1 388L-152.5 384L-186 355.4L-186.4 352L-213.7 328.7L-214 326Z"></path>
          <path fill="#8496b6" fillOpacity=".42" d="M206 326L276 392L279 391L209 325Z"></path>
          <path fill="none" stroke="#8fa0bc" strokeOpacity=".55" strokeWidth=".8" d="M-43.7 829.3L-11.2 843.6L30.2 848.3L68.5 853.2M414 722.1L460.2 728.8L500.1 742.9L510.6 749.6L537.7 753.9M418 385.5L462.6 387.5L481.4 382.3L526.6 389.3L553.7 394.4M59.6 408.4L87.1 408.8L121.9 416.4L169.1 425.5L214.8 439.4M197.5 670.7L220.1 671.7L265.4 682.4L285.2 685L315.6 691.4L331.5 683.7M98.5 716.3L141.2 728.7L171.7 725.1L185.9 724.8L208.7 727L256.1 738.9M143.8 739.9L174 740.6L199.7 737L216.5 743.3L243.9 743.2L261.7 748.7M332 398.9L345.9 402.7L358.4 399.4L395 398.8L413.1 400.3M-56.7 396.5L-21.9 389.8L14.3 391.9L28.2 389.6L72.6 389.7M168.4 251.3L209 248.3L224.2 252.8L258.5 250.7L289.2 254.2L322.4 267M299.6 514.8L319.9 528.7L360.4 536.9L386.9 529.5L398.9 534.1L435.6 534.3M-58.7 593.2L-21.3 591.5L12.5 599.8L56.8 610.5M354.4 796.4L396.5 792.5L423.9 788.8L471.4 794.3M87.1 532.9L113 546.5L146.6 546.9L166.4 547.1"></path>
          <path d="M58 248L84 326H58Z" fill="#8496b6" fillOpacity=".34"></path>
          <path d="M-100 232H50L58 248H-100Z" fill="#fefdfa"></path>
          <path d="M-100 248H58V326H-100Z" fill="url(#pk-sue-g-pl)"></path>
          <path d="M-100 248H58" stroke="#fff" strokeWidth="1.6"></path>
          <path d="M-100 254H52V256H-100Z" fill="#aab6ca" fillOpacity=".7"></path>
          <path d="M58 326L-44 512H-100V326Z" fill="#dde2ea"></path>
          <path d="M58 326L-44 512" stroke="#fff" strokeWidth="1.2"></path>
          <path d="M325 232H475V248H317Z" fill="#fefdfa"></path>
          <path d="M317 248H475V326H317Z" fill="url(#pk-sue-g-pl)"></path>
          <path d="M317 248H475" stroke="#fff" strokeWidth="1.6"></path>
          <path d="M475 254H323V256H475Z" fill="#aab6ca" fillOpacity=".7"></path>
          <path d="M317 326L419 512H475V326Z" fill="#eceef3"></path>
          <path d="M317 326L419 512" stroke="#fff" strokeWidth="1.2"></path>
        </svg>
        <div className="pk-sue-sun" aria-hidden="true"></div>
        <div className="pk-sue-flag" aria-hidden="true">
          <span className="pk-sue-flag-strip">
            <svg viewBox="0 0 300 70" preserveAspectRatio="none">
              <path fill="#8496b6" d="M0 11Q18.75 3 37.5 11T75 11T112.5 11T150 11T187.5 11T225 11T262.5 11T300 11V59Q281.25 67 262.5 59T225 59T187.5 59T150 59T112.5 59T75 59T37.5 59T0 59Z"></path>
            </svg>
          </span>
        </div>
        <div className={`pk-sue-marks ${v.marksClass}`} aria-hidden="true">
          {v.marks.map((m: any, mIndex: number) => (
            <svg key={mIndex} className={`pk-sue-mark ${m.cls}`} viewBox="0 0 200 84" style={{ '--x': m.x, '--y': m.y, '--w': m.w, '--r': m.r, '--sy': m.sy } as React.CSSProperties}>
              <use href="#pk-sue-served"></use>
            </svg>
          ))}
        </div>
        <div className={`pk-sue-birds ${v.birdClass}`} aria-hidden="true">
          {v.birds.map((b: any, bIndex: number) => (
            <div key={bIndex} className={`pk-sue-bird ${b.cls}`} style={{ '--x': b.x, '--y': b.y, '--s': b.s, '--f': b.f, '--fx': b.fx, '--fy': b.fy, '--dl': b.dl } as React.CSSProperties}>
              <svg viewBox="0 0 44 36">
                <ellipse cx="24" cy="33" rx="13" ry="1.8" fill="#46587e" fillOpacity=".38"></ellipse>
                <path d="M16.5 29v3.6M21.5 29.5v3.1" stroke="#c8102e" strokeWidth="1.4" strokeLinecap="round"></path>
                <path d="M14.5 33h4M19.5 33h4" stroke="#c8102e" strokeWidth="1.1" strokeLinecap="round"></path>
                <path d="M30 21L43 26.5L41 30L27 27Z" fill="#59678a"></path>
                <path d="M34 24.5L42.5 27.5L41 30L33 28Z" fill="#2f3c5c"></path>
                <path d="M10 14C14 10 24 10 30 16C34 20 33.5 26 28 28.5C22 31 13 30 9 25C7 21 7 17 10 14Z" fill="url(#pk-sue-g-bird)"></path>
                <g className="pk-sue-bird-wing">
                  <path d="M14 15C20 12 28 15 34 24C27 26 18 25 14 19.5Z" fill="#b6c0d1"></path>
                  <path d="M22.5 15.4L27.6 24.9" stroke="#3b4867" strokeWidth="2" strokeLinecap="round"></path>
                  <path d="M27 18L31.2 24.4" stroke="#3b4867" strokeWidth="2" strokeLinecap="round"></path>
                  <path d="M14 15C20 12 28 15 34 24" fill="none" stroke="#e4e8ef" strokeWidth=".8"></path>
                </g>
                <g className="pk-sue-bird-head">
                  <path d="M9 16C7.8 11.5 8.6 8 11.6 7C15 7.6 17.3 11 17.3 14.4C14.4 17.6 11 17.8 9 16Z" fill="#4d6186"></path>
                  <path d="M11.2 11.5C12.8 11 14.6 11.6 15.8 13C14.4 14.4 12 14.4 10.6 13.4Z" fill="#3f8a84" fillOpacity=".6"></path>
                  <circle cx="10.5" cy="6.4" r="4.7" fill="#62739a"></circle>
                  <path d="M7.5 3.4C8.8 2.2 11 2 12.6 2.9C10.8 3 9.2 3.6 8 5Z" fill="#c6d0e2"></path>
                  <path d="M6.3 5.2L1.8 7.2L6.4 8.1Z" fill="#2c3550"></path>
                  <circle cx="6.8" cy="5.2" r="1" fill="#f1f3f7"></circle>
                  <circle cx="9.3" cy="5.6" r="1.25" fill="#e9772a"></circle>
                  <circle cx="9.2" cy="5.6" r=".6" fill="#10192f"></circle>
                </g>
              </svg>
            </div>
          ))}
        </div>
        <div className="pk-sue-cloud" aria-hidden="true">
          <svg className="pk-sue-cloud-in" viewBox="-16 -16 344 216">
            <path fill="#2c3f70" fillOpacity=".27" d="M-14 104C-14 88 2 78 20 82C24 60 46 48 66 56C74 26 112 8 146 24C156 6 186 -2 206 14C224 -4 266 4 276 36C296 32 314 50 308 70C326 76 332 98 314 108C322 122 306 134 288 128C276 142 248 144 234 132C214 148 178 150 160 138C140 152 104 150 90 136C72 146 44 142 36 128C14 134 -14 124 -14 104Z"></path>
          </svg>
        </div>
        <svg className="pk-sue-near" viewBox="0 -10 575 56" aria-hidden="true">
          <defs>
            <radialGradient id="pk-sue-g-dish" cx=".4" cy=".36" r=".72">
              <stop offset="0" stopColor="#f2f5fb"></stop>
              <stop offset=".42" stopColor="#a9b8d6"></stop>
              <stop offset=".82" stopColor="#566a96"></stop>
              <stop offset="1" stopColor="#aebcd8"></stop>
            </radialGradient>
            <g id="pk-sue-pack">
              <circle cx="40" cy="36" r="17"></circle>
              <circle cx="92" cy="36" r="17"></circle>
              <rect x="78" y="14" width="28" height="18" rx="6"></rect>
              <ellipse cx="92" cy="29" rx="26" ry="4.6"></ellipse>
              <rect x="116" y="8" width="62" height="38" rx="4"></rect>
              <rect x="136" y="0" width="24" height="9" rx="2"></rect>
              <rect x="170" y="10" width="7" height="12"></rect>
              <circle cx="179" cy="6" r="12.6"></circle>
              <circle cx="216" cy="33" r="15"></circle>
              <rect x="203" y="11" width="26" height="17" rx="5.5"></rect>
              <ellipse cx="216" cy="27" rx="24" ry="4.2"></ellipse>
              <rect x="247" y="14" width="42" height="32" rx="3"></rect>
              <rect x="260" y="7" width="15" height="8" rx="2"></rect>
              <circle cx="291" cy="16" r="11.6"></circle>
              <circle cx="317" cy="36" r="13"></circle>
              <rect x="307" y="13" width="20" height="15" rx="4.500"></rect>
              <ellipse cx="317" cy="27.500" rx="17.500" ry="3.600"></ellipse>
              <rect x="344" y="14" width="44" height="32" rx="3"></rect>
              <rect x="359" y="7" width="16" height="8" rx="2"></rect>
              <circle cx="343" cy="16" r="11.6"></circle>
              <circle cx="402" cy="35" r="18"></circle>
              <rect x="386" y="8" width="32" height="20" rx="6"></rect>
              <ellipse cx="402" cy="27" rx="30" ry="5"></ellipse>
              <rect x="420" y="6" width="5" height="26"></rect>
              <circle cx="426" cy="5" r="12.6"></circle>
              <rect x="462" y="16" width="44" height="30" rx="3"></rect>
              <circle cx="461" cy="13" r="13"></circle>
              <circle cx="536" cy="36" r="17"></circle>
              <rect x="0" y="42" width="575" height="4"></rect>
            </g>
          </defs>
          <use href="#pk-sue-pack" fill="#a9bbdf" transform="translate(-1.2 -1.2)"></use>
          <use href="#pk-sue-pack" fill="#12234a"></use>
          <g fill="#fff">
            <rect x="84" y="21" width="10" height="5.6" rx=".8" transform="rotate(-8 89 24)"></rect>
            <rect x="207" y="17.500" width="10" height="5.4" rx=".8" transform="rotate(-8 212 20)"></rect>
            <rect x="391" y="15.500" width="12" height="6.400" rx=".8" transform="rotate(7 397 19)"></rect>
            <rect x="310.500" y="18" width="8" height="4.400" rx=".7" transform="rotate(6 314 20)"></rect>
          </g>
          <g fill="#2c4178" stroke="#6d84b8" strokeWidth="1">
            <circle cx="147" cy="24" r="14"></circle>
            <circle cx="268" cy="28" r="9.5"></circle>
            <circle cx="366" cy="28" r="10"></circle>
            <circle cx="484" cy="30" r="10"></circle>
          </g>
          <g fill="#0b1630">
            <circle cx="147" cy="24" r="7.600"></circle>
            <circle cx="268" cy="28" r="5"></circle>
            <circle cx="366" cy="28" r="5.400"></circle>
            <circle cx="484" cy="30" r="5.400"></circle>
          </g>
          <g fill="#fff">
            <circle cx="143.600" cy="20.600" r="2.200"></circle>
            <circle cx="265.600" cy="25.600" r="1.500"></circle>
            <circle cx="363.500" cy="25.500" r="1.600"></circle>
            <circle cx="481.500" cy="27.500" r="1.600"></circle>
          </g>
          <g fill="url(#pk-sue-g-dish)" stroke="#c6d1e6" strokeWidth=".8">
            <circle cx="179" cy="6" r="10.400"></circle>
            <circle cx="291" cy="16" r="9.600"></circle>
            <circle cx="343" cy="16" r="9.600"></circle>
            <circle cx="426" cy="5" r="10.400"></circle>
            <circle cx="461" cy="13" r="10.600"></circle>
          </g>
          <g fill="#fff" stroke="#6d7fa8" strokeWidth=".6">
            <circle cx="179" cy="6" r="2.600"></circle>
            <circle cx="291" cy="16" r="2.400"></circle>
            <circle cx="343" cy="16" r="2.400"></circle>
            <circle cx="426" cy="5" r="2.600"></circle>
            <circle cx="461" cy="13" r="2.600"></circle>
          </g>
        </svg>
        <div className="pk-sue-flood" aria-hidden="true"></div>
        <div className="pk-sue-grain" aria-hidden="true"></div>
        <div className="pk-sue-hot" aria-hidden="true"></div>
        <div className="pk-sue-col">
          <div className="pk-sue-top">
            <button type="button" className="pk-sue-back" onClick={() => { play('click'); onBack(); }}> <svg viewBox="0 0 15 12" aria-hidden="true"><path d="M6 1L1.2 6L6 11M1.6 6H14" fill="none" stroke="#c8102e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg> Back </button>
            <PackSoundToggle on={soundOn} onToggle={toggleSound} className={`pk-sue-snd ${soundOn ? '' : 'is-off'}`} />
            <div className="pk-sue-chip"> <svg viewBox="0 0 10 13" aria-hidden="true"><path d="M2 5.6V3.8a3 3 0 0 1 6 0v1.8" fill="none" stroke="#b50e29" strokeWidth="1.5"></path><rect x=".6" y="5.4" width="8.8" height="7" rx="1.4" fill="#b50e29"></rect></svg> Future update </div>
          </div>
          <button className="pk-sue-hero" type="button" data-reveal="1" aria-label={v.heroLabel} onClick={v.stamp} onPointerDown={v.press} onPointerUp={v.release} onPointerCancel={v.release} onPointerLeave={v.release}>
            <span className="pk-sue-pile" aria-hidden="true">
              <span className="pk-sue-pile-shadow"></span>
              {' '}
              <span className="pk-sue-under" style={{ '--x': '-2', '--z': '0', '--r': '1.1deg' } as React.CSSProperties}></span>
              {' '}
              <span className="pk-sue-under" style={{ '--x': '2', '--z': '1.6', '--r': '-1.7deg' } as React.CSSProperties}></span>
              {' '}
              <span className="pk-sue-under" style={{ '--x': '-1', '--z': '3.2', '--r': '.5deg' } as React.CSSProperties}></span>
              {v.sheets.map((s: any, sIndex: number) => (
                <span key={sIndex} className={`pk-sue-sheet ${s.cls}`} style={{ '--x': s.x, '--z': s.z, '--r': s.r, '--fx': s.fx, '--fy': s.fy, '--fr': s.fr } as React.CSSProperties}>
                  <span className="pk-sue-sh-staple"></span>
                  {' '}
                  <span className="pk-sue-sh-title">SUBPOENA</span>
                  {' '}
                  <span className="pk-sue-sh-rule"></span>
                  {' '}
                  <span className="pk-sue-sh-to">TO: {s.to}</span>
                  {' '}
                  <span className="pk-sue-sh-re">RE: {s.re}</span>
                  {' '}
                  <span className="pk-sue-sh-from" style={{ '--fit': colFit(signed, 22) } as React.CSSProperties}>{signed}</span>
                  {' '}
                  <span className="pk-sue-sh-count">{s.n} OF 8</span>
                  <svg className="pk-sue-sh-sign" viewBox="0 0 64 26">
                    <path d="M3 19C9 8 13 3 15 5C17 8 10 21 12 22C15 23 20 10 23 11C25 12 21 19 24 19C27 19 29 13 32 14C34 15 32 19 35 18C40 16 46 13 61 9" fill="none" stroke="#12234a" strokeWidth="1.3" strokeLinecap="round"></path>
                  </svg>
                  <svg className="pk-sue-print" viewBox="0 0 200 84">
                    <use href="#pk-sue-served"></use>
                  </svg>
                </span>
              ))}
              <span className="pk-sue-sshadow">
                <svg viewBox="0 0 136 57">
                  <g fill="#2a3c68" opacity=".14">
                    <rect width="136" height="57" rx="1"></rect>
                  </g>
                </svg>
              </span>
            </span>
            {' '}
            <span className="pk-sue-dust" aria-hidden="true">
              <i style={{ '--dx': '-92', '--dy': '-18' } as React.CSSProperties}></i>
              <i style={{ '--dx': '-66', '--dy': '12' } as React.CSSProperties}></i>
              <i style={{ '--dx': '-104', '--dy': '6' } as React.CSSProperties}></i>
              <i style={{ '--dx': '88', '--dy': '-22' } as React.CSSProperties}></i>
              <i style={{ '--dx': '104', '--dy': '4' } as React.CSSProperties}></i>
              <i style={{ '--dx': '62', '--dy': '14' } as React.CSSProperties}></i>
            </span>
            {' '}
            <span className="pk-sue-stamp-in">
              <span className="pk-sue-stamp-hover">
                <span className="pk-sue-stamp-press">
                  <span className="pk-sue-stamp-hit">
                    <svg className="pk-sue-stamp-svg" viewBox="0 0 200 140" aria-hidden="true">
                      <g className="pk-sue-stamp-final" fill="#4a0314" fillOpacity=".62" transform="translate(9 9)">
                        <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43C109 45 108.500 47 109 50C110 53 116 53 116 56.500C116 60 110 60 109.500 63C109 66 110 69 113 73C117 78 123 80 126 85L127.500 90H159L174 110V129H171V140H29V129H26V110L41 90H72.500L74 85C77 80 83 78 87 73C90 69 91 66 90.500 63C90 60 84 60 84 56.500C84 53 90 53 91 50C91.500 47 91 45 88 43C82 39 74 33 74 23C74 10 86 2 100 2Z"></path>
                      </g>
                      <path d="M110 50C122 50 136 54 151 61" fill="none" stroke="#7a6743" strokeWidth="1.1" strokeLinecap="round"></path>
                      {/* block: top face, handle shadow, front, rubber */}
                      <path d="M41 90H159L174 110H26Z" fill="url(#pk-sue-g-blocktop)"></path>
                      <path d="M92 104C110 98 140 98 150 103C154 106 146 109 128 109H100Z" fill="#1d0c05" fillOpacity=".5"></path>
                      <path d="M41 90H159" stroke="#f0c896" strokeWidth="1"></path>
                      <path d="M58 96C80 94 108 95 132 93M46 104C70 101 88 103 100 102" fill="none" stroke="#3a1c0b" strokeOpacity=".25" strokeWidth=".8"></path>
                      <rect x="26" y="110" width="148" height="19" fill="url(#pk-sue-g-blockfront)"></rect>
                      <path d="M26 110.6H174" stroke="#ffd9a8" strokeOpacity=".75" strokeWidth="1.2"></path>
                      <path d="M30 118C48 116 56 121 72 119M132 123C146 121 156 125 170 122" fill="none" stroke="#1d0c05" strokeOpacity=".28" strokeWidth=".8"></path>
                      <rect x="64" y="112.6" width="72" height="14" rx="1" fill="#f7efda" stroke="#7a6743" strokeWidth=".6"></rect>
                      <text x="100" y="123.6" textAnchor="middle" className="pk-sue-stamplabel">SERVED</text>
                      <rect x="29" y="129" width="142" height="11" rx="1.6" fill="url(#pk-sue-g-rubber)"></rect>
                      <path d="M29 129.6H171" stroke="#10040a" strokeOpacity=".7" strokeWidth="1.1"></path>
                      <path d="M36 137.6H118" stroke="#ff9aa8" strokeOpacity=".8" strokeWidth=".9" strokeLinecap="round"></path>
                      <rect className="pk-sue-stamp-final" x="28.500" y="128.500" width="143" height="12" rx="1.800" fill="#2a0810" fillOpacity=".34" stroke="#2c0209" strokeWidth="1.600"></rect>
                      <path d="M47 128.6C45 124 52 123 53 126C54 127.5 54 128.6 54 128.6ZM143 128.6C142 125.6 149 124.6 150 127C150.4 128 150 128.6 150 128.6ZM84 129C84 127 89 127 89 129Z" fill="#c8102e" fillOpacity=".72"></path>
                      {/* ferrule */}
                      <path d="M71.5 90H128.5V97C128.5 104.5 71.5 104.5 71.5 97Z" fill="url(#pk-sue-g-brass)"></path>
                      <path d="M71.5 92.5C80 97.5 120 97.5 128.5 92.5" fill="none" stroke="#54390d" strokeOpacity=".7" strokeWidth="1"></path>
                      <path d="M71.5 94C80 99 120 99 128.5 94" fill="none" stroke="#ffeeb4" strokeOpacity=".7" strokeWidth=".7"></path>
                      {/* turned handle */}
                      <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43C109 45 108.5 47 109 50C110 53 116 53 116 56.5C116 60 110 60 109.5 63C109 66 110 69 113 73C117 78 123 80 126 85L127.5 91C127.5 97 72.5 97 72.5 91L74 85C77 80 83 78 87 73C90 69 91 66 90.5 63C90 60 84 60 84 56.5C84 53 90 53 91 50C91.5 47 91 45 88 43C82 39 74 33 74 23C74 10 86 2 100 2Z" fill="url(#pk-sue-g-wood)"></path>
                      <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43H88C82 39 74 33 74 23C74 10 86 2 100 2Z" fill="url(#pk-sue-g-knob)"></path>
                      <path d="M84.5 8.5C78 14 76.6 25 82.4 33C81.4 24.5 83.2 15 91.5 6.8C89 6.8 86.5 7.4 84.5 8.5Z" fill="#fff" fillOpacity=".72"></path>
                      <path d="M93 5C89 16 90 31 96 42M107 4C112 15 112 29 107 42M117 9C121 18 120 30 114 39" fill="none" stroke="#2a1307" strokeOpacity=".2" strokeWidth=".8"></path>
                      <path d="M91 50C95 52.6 105 52.6 109 50" fill="none" stroke="#1d0c05" strokeOpacity=".8" strokeWidth="1.1"></path>
                      <path d="M84.6 55C90 57.6 110 57.6 115.4 55" fill="none" stroke="#ffd9a8" strokeOpacity=".55" strokeWidth=".9"></path>
                      <path d="M90.5 63C94 65.6 106 65.6 109.5 63" fill="none" stroke="#1d0c05" strokeOpacity=".8" strokeWidth="1.1"></path>
                      <path d="M74 85C84 89.6 116 89.6 126 85" fill="none" stroke="#1d0c05" strokeOpacity=".75" strokeWidth="1.2"></path>
                      <path d="M73.6 87.4C84 92 116 92 126.4 87.4" fill="none" stroke="#ffd9a8" strokeOpacity=".5" strokeWidth=".8"></path>
                      <path d="M85.2 74.5C81.5 79 79 81 78.4 84.4C81.6 81.4 86 79.6 88.6 74.4Z" fill="#ffe9c9" fillOpacity=".6"></path>
                      {/* string knot round the neck */}
                      <path d="M91 48C96 50.4 104 50.4 109 48" fill="none" stroke="#7a6743" strokeWidth="1.2"></path>
                    </svg>
                    <span className="pk-sue-tag">
                      <span className="pk-sue-tag-in">{v.hint}</span>
                      {' '}
                      <span className="pk-sue-tag-hole"></span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </button>
          <h1 className="pk-sue-lock pk-sue-rise" style={{ '--d': '.16s' } as React.CSSProperties}>
            <span className="pk-sue-lock-a">SUE</span>
            <span className="pk-sue-lock-b">EVERYONE</span>
          </h1>
          <div className="pk-sue-kick pk-sue-rise" style={{ '--d': '.22s' } as React.CSSProperties}>Your courtroom empire</div>
          <div className="pk-sue-soon pk-sue-rise" style={{ '--d': '.27s' } as React.CSSProperties}>
            <span className="pk-sue-soon-mark" aria-hidden="true">§</span>
            {' '}
            <span className="pk-sue-soon-box">
              <span className="pk-sue-soon-text">COMING SOON</span>
              <span className="pk-sue-sheen" aria-hidden="true">
                <span className="pk-sue-sheen-in">
                  <span className="pk-sue-soon-text pk-sue-soon-lit">COMING SOON</span>
                </span>
              </span>
            </span>
            {' '}
            <span className="pk-sue-soon-mark" aria-hidden="true">§</span>
          </div>
          <p className="pk-sue-pitch pk-sue-rise" style={{ '--d': '.32s' } as React.CSSProperties}>Stop letting people get away with it. <b>Sue your ex, your rival or the critic who gave you two stars</b>, and take their mansion on the way out of court.</p>
          <div className={`pk-sue-docket pk-sue-rise ${cols(docket) > 21 ? 'pk-sue-is-long' : ''}`} style={{ '--d': '.37s' } as React.CSSProperties}>
            <svg className="pk-sue-dclip" viewBox="0 0 13 32" aria-hidden="true">
              <path d="M9.8 10V25.300a3.300 3.300 0 0 1-6.600 0V5.500a2.500 2.500 0 0 1 5 0V23" fill="none" stroke="#46587e" strokeOpacity=".4" strokeWidth="1.3" strokeLinecap="round" transform="translate(1.200 1.400)"></path>
              <path d="M9.800 10V25.300a3.300 3.300 0 0 1-6.600 0V5.500a2.500 2.500 0 0 1 5 0V23" fill="none" stroke="#8d98ad" strokeWidth="1.300" strokeLinecap="round"></path>
              <path d="M3.200 25.300V5.500a2.500 2.500 0 0 1 2.500-2.500" fill="none" stroke="#f4f6fa" strokeWidth=".6" strokeLinecap="round"></path>
            </svg>
            <div className="pk-sue-dhead">
              <span style={{ '--fit': colFit(docket, 25) } as React.CSSProperties}>{docket}</span>
              <span className="pk-sue-dcount" aria-live="polite">{v.servedText}</span>
            </div>
            <ol className="pk-sue-rows">
              {v.rows.map((r: any, rIndex: number) => (
                <li key={rIndex} className={`pk-sue-row ${r.cls}`}>
                  <span className="pk-sue-no">{r.no}</span>
                  {' '}
                  <span className="pk-sue-cell">
                    <span className="pk-sue-line">{r.text}</span>
                    <span className="pk-sue-cover" aria-hidden="true">
                      <span className="pk-sue-blank">{r.blank}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pk-sue-ctaz pk-sue-rise" style={{ '--d': '.42s' } as React.CSSProperties}>
            <span className="pk-sue-ctawrap">
              <span className="pk-sue-ring" aria-hidden="true"></span>
              <span className="pk-sue-ring pk-sue-ring2" aria-hidden="true"></span>
              <button className={`pk-sue-cta ${v.ctaClass}`} type="button" data-cta="1" onClick={v.notify}>
                {v.notified ? (
                  <svg viewBox="0 0 18 18" aria-hidden="true">
                    <circle cx="9" cy="9" r="8.2" fill="#c8102e"></circle>
                    <path d="M5 9.4L7.9 12.2L13.2 6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                ) : null}
                {v.notNotified ? (
                  <svg viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M9 1.2a3.2 3.2 0 0 1 2 5.7c-.5.4-.6 1-.4 1.5l.6 1.6H6.800l.6-1.600c.2-.5.1-1.100-.4-1.500A3.200 3.200 0 0 1 9 1.200Z" fill="currentColor"></path>
                    <rect x="2.500" y="10.800" width="13" height="3.400" rx=".8" fill="currentColor"></rect>
                    <rect x="2.500" y="15.400" width="13" height="1.500" rx=".6" fill="currentColor"></rect>
                  </svg>
                ) : null}
                <span>{v.ctaLabel}</span>
              </button>
            </span>
            <div className="pk-sue-note">Arriving in a future update</div>
          </div>
        </div>
        <div className="pk-sue-flashes" aria-hidden="true">
          <span className="pk-sue-fl pk-sue-fl-loop"></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-v" style={{ '--x': '-141.05', '--y': '-52', '--s': '.95', '--dl': '.17s', '--t': '0' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-v" style={{ '--x': '72.15', '--y': '-39', '--s': '.8', '--dl': '.23s', '--t': '1' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-v" style={{ '--x': '4.55', '--y': '-39', '--s': '.7', '--dl': '.3s', '--t': '3' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-v" style={{ '--x': '180.05', '--y': '-53.3', '--s': '.9', '--dl': '.38s', '--t': '5' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-b" style={{ '--x': '-141.05', '--y': '-52', '--s': '1', '--dl': '.02s' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-b" style={{ '--x': '4.55', '--y': '-39', '--s': '.85', '--dl': '.1s' } as React.CSSProperties}></span>
          {' '}
          <span className="pk-sue-fl pk-sue-fl-b" style={{ '--x': '180.05', '--y': '-53.3', '--s': '.95', '--dl': '.19s' } as React.CSSProperties}></span>
        </div>
        <div className="pk-sue-blind" aria-hidden="true"></div>
        <div className="pk-sue-exposure" aria-hidden="true"></div>
        <div className="pk-sue-exposure2" aria-hidden="true"></div>
        <div className="pk-sue-eclipse" aria-hidden="true"></div>
      </div>
      <div className="pk-sue-finale" aria-hidden="true">
        <div className="pk-sue-white"></div>
        <div className="pk-sue-gshake">
          <div className="pk-sue-giant">
            <span className="pk-sue-giant-in">SERVED</span>
          </div>
        </div>
      </div>
      <svg className="pk-sue-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <linearGradient id="pk-sue-g-wood" gradientUnits="userSpaceOnUse" x1="72" y1="0" x2="128" y2="0">
            <stop offset="0" stopColor="#4c2710"></stop>
            <stop offset=".1" stopColor="#8c5427"></stop>
            <stop offset=".24" stopColor="#dc9c5a"></stop>
            <stop offset=".31" stopColor="#f6c98f"></stop>
            <stop offset=".4" stopColor="#bb7539"></stop>
            <stop offset=".62" stopColor="#6f3b19"></stop>
            <stop offset=".86" stopColor="#301709"></stop>
            <stop offset="1" stopColor="#54414a"></stop>
          </linearGradient>
          <radialGradient id="pk-sue-g-knob" gradientUnits="userSpaceOnUse" cx="89" cy="15" r="42">
            <stop offset="0" stopColor="#f8c98f"></stop>
            <stop offset=".22" stopColor="#c8843f"></stop>
            <stop offset=".55" stopColor="#7a431c"></stop>
            <stop offset=".86" stopColor="#35190a"></stop>
            <stop offset="1" stopColor="#24110a"></stop>
          </radialGradient>
          <linearGradient id="pk-sue-g-brass" gradientUnits="userSpaceOnUse" x1="71" y1="0" x2="129" y2="0">
            <stop offset="0" stopColor="#6a4c16"></stop>
            <stop offset=".16" stopColor="#c79c3c"></stop>
            <stop offset=".28" stopColor="#fff2b8"></stop>
            <stop offset=".42" stopColor="#d6aa48"></stop>
            <stop offset=".72" stopColor="#8a6420"></stop>
            <stop offset="1" stopColor="#4a3410"></stop>
          </linearGradient>
          <linearGradient id="pk-sue-g-blocktop" gradientUnits="userSpaceOnUse" x1="30" y1="86" x2="170" y2="114">
            <stop offset="0" stopColor="#d9a067"></stop>
            <stop offset=".45" stopColor="#9a5f2d"></stop>
            <stop offset="1" stopColor="#5a3115"></stop>
          </linearGradient>
          <linearGradient id="pk-sue-g-blockfront" gradientUnits="userSpaceOnUse" x1="26" y1="0" x2="174" y2="0">
            <stop offset="0" stopColor="#7c4720"></stop>
            <stop offset=".18" stopColor="#a4632e"></stop>
            <stop offset=".55" stopColor="#6a3818"></stop>
            <stop offset="1" stopColor="#2c1508"></stop>
          </linearGradient>
          <linearGradient id="pk-sue-g-rubber" gradientUnits="userSpaceOnUse" x1="0" y1="129" x2="0" y2="140">
            <stop offset="0" stopColor="#2a0810"></stop>
            <stop offset=".45" stopColor="#6a0c1b"></stop>
            <stop offset=".82" stopColor="#c8102e"></stop>
            <stop offset="1" stopColor="#e6324c"></stop>
          </linearGradient>
          <linearGradient id="pk-sue-g-bird" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="30" y2="30">
            <stop offset="0" stopColor="#d4dbe6"></stop>
            <stop offset=".5" stopColor="#9aa7bd"></stop>
            <stop offset="1" stopColor="#5d6b8b"></stop>
          </linearGradient>
          <filter id="pk-sue-rough" x="-4%" y="-8%" width="108%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="7" result="n"></feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"></feDisplacementMap>
            <feTurbulence type="fractalNoise" baseFrequency=".28" numOctaves="3" seed="19" result="b"></feTurbulence>
            <feColorMatrix in="b" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -6 4.9" result="h"></feColorMatrix>
            <feComposite in="d" in2="h" operator="in"></feComposite>
          </filter>
          <g id="pk-sue-served" filter="url(#pk-sue-rough)">
            <rect x="5" y="5" width="190" height="74" rx="7" fill="none" stroke="#c8102e" strokeWidth="6"></rect>
            <text x="100" y="66" textAnchor="middle" className="pk-sue-printtext">SERVED</text>
          </g>
        </defs>
      </svg>
    </div>
  );
}
