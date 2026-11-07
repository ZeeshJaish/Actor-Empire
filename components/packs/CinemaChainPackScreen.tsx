import React, { useEffect, useRef } from 'react';
import { packName, packShortName } from './packName';
import { useMergedState } from './useMergedState';
import { usePackSounds, type PackMusic, type PackSoundFiles } from './packAudio';
import PackSoundToggle from './PackSoundToggle';
import '../../styles/packs/pack-cinema.css';

const PK_FEATS = [
  ['Sell out opening nights', '#pk-cine-i-ticket'],
  ['Build giant-screen megaplexes', '#pk-cine-i-plex'],
  ['Set the popcorn prices', '#pk-cine-i-corn'],
  ['Open screens in every city', '#pk-cine-i-city'],
  ['Design luxury recliner halls', '#pk-cine-i-seat'],
  ['Host red carpet premieres', '#pk-cine-i-rope'],
  ['Own the box office charts', '#pk-cine-i-chart'],
  ['Screen your own hits first', '#pk-cine-i-star'],
];
const PK_CHASE = ['1.3s', '1.16s', '1.03s', '.91s', '.8s', '.7s', '.61s', '.53s', '.46s'];
const PK_FALLS = [0, 1, 2, 3, 4, 5, 6, 7];
const PK_BULBS = Array.from({ length: 13 }, (_, i) => ({ i: 12 - i }));
const PK_TICKER = [...PK_FEATS, ...PK_FEATS].map(([text, icon], i) => ({ text, icon, hidden: i >= PK_FEATS.length ? 'true' : 'false' }));
const NAME_ROOM = 32; // the longest name a title card can print in full
const CARD_ROOM = 27.5; // the widest a card may be, in ems of its full-size type; the tightest screen, 320 px wide, has 29.07 and a 2.5 px frame
/* Archivo 800 capitals and name marks in em, as measured. A space is its .19 plus the word gap a card always keeps, whatever its tracking. */
const CARD_GLYPHS: Record<string, number> = { A: .746, B: .745, C: .752, D: .755, E: .699, F: .641, G: .815, H: .787, I: .329, J: .63, K: .77, L: .623, M: .914, N: .787, O: .81, P: .698, Q: .81, R: .75, S: .697, T: .675, U: .783, V: .729, W: .979, X: .736, Y: .732, Z: .682, ' ': .489, '-': .333, '.': .318, "'": .263, '’': .279, 'Æ': 1.01, 'Œ': 1.204 };
/* An accent sits on its capital. Emoji print at about 1.35 at this size, wide letters and wide scripts (CJK, Hangul) take 1.1, scripts with joins and marks average .62 a character, anything else takes .82, the top of the ordinary capitals. */
const glyphEm = (ch: string) => CARD_GLYPHS[ch] ?? CARD_GLYPHS[ch.normalize('NFD')[0]] ?? (/\p{Extended_Pictographic}/u.test(ch) ? 1.4 : /[%@ЖЉЊШЩЫЮ\u1100-\u{10FFFF}]/u.test(ch) ? 1.1 : /[\u0590-\u10FF]/.test(ch) ? .62 : .82);
/* All four cards print at one size, so the widest decides. A long name gives way in order: the type down to .9, then the tracking down to 0, then the type again. A name that fits sets nothing, so it renders as the mockup does. */
const fitCards = (cards: string[]) => {
  const lines = cards.map((card) => {
    const chars = [...card];
    return { em: chars.reduce((sum, ch) => sum + glyphEm(ch), 0), tracked: chars.filter((ch) => ch !== ' ').length + 1 }; // tracking follows each letter and fills the indent; a space keeps its gap
  });
  const widest = (track: number) => Math.max(...lines.map((line) => line.em + line.tracked * track));
  if (widest(.3) <= CARD_ROOM) return undefined;
  const size = Math.min(Math.max(.9, CARD_ROOM / widest(.3)), CARD_ROOM / widest(0));
  const track = Math.max(0, Math.min(...lines.map((line) => (CARD_ROOM / size - line.em) / line.tracked)));
  return { '--fit': size, '--track': track.toFixed(3) + 'em' } as React.CSSProperties;
};

/* rendered by scripts/audio/render-pack-sounds.mjs from scripts/audio/packs/cinema.mjs. final.m4a holds the eighth tear's rip, the marquee's breakers and the brass, against the page's clock */
const CINEMA_SOUNDS: PackSoundFiles = {
  tap: () => new URL('../../assets/audio/packs/cinema/tap.m4a', import.meta.url).href,
  final: () => new URL('../../assets/audio/packs/cinema/final.m4a', import.meta.url).href,
  notify: () => new URL('../../assets/audio/packs/cinema/notify.m4a', import.meta.url).href,
  click: () => new URL('../../assets/audio/packs/cinema/click.m4a', import.meta.url).href,
};
/* the loop points are printed by the render: one period apart, inside the part of the file that repeats */
const CINEMA_MUSIC: PackMusic = {
  url: () => new URL('../../assets/audio/packs/cinema/music.m4a', import.meta.url).href,
  loopStart: 8.912222,
  loopEnd: 32.912222,
};

interface CinemaChainPackScreenProps {
  playerName: string;
  onBack: () => void;
}

export default function CinemaChainPackScreen({ playerName, onBack }: CinemaChainPackScreenProps) {
  const [state, set, latest] = useMergedState({ step: 0, tears: 0, newest: -1, settled: false, idle: false, castSync: '0s', notified: false, doneShown: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bornAt = useRef(0);
  const newestTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { play, soundOn, toggleSound, duckMusic, restoreMusic } = usePackSounds(CINEMA_SOUNDS, CINEMA_MUSIC);

  useEffect(() => {
    bornAt.current = Date.now();
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      clearTimeout(newestTimer.current);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };

  const tear = () => {
    const { step, tears, castSync } = latest.current;
    const next = Math.min(8, step + 1);
    /* the eighth tear brings the marquee up with its own sound, and the theme steps back for it; every other tear, encores too, rips a little higher */
    if (step === 7) { play('final'); duckMusic(); }
    else play('tap', { rate: 1 + next * .016 + (Math.random() - .5) * .03 });
    set({
      step: next,
      tears: tears + 1,
      newest: step < 8 ? step : -1,
      idle: false,
      /* the screen shadow first breathes on the eighth tear, so start it in phase with the ticket's 5.4 s float */
      castSync: step === 7 ? -((Date.now() - bornAt.current) % 5400) + 'ms' : castSync,
    });
    clearTimeout(newestTimer.current);
    newestTimer.current = setTimeout(() => set({ newest: -1 }), 1150);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => set({ idle: true }), 4500);
    if (step === 7) later(() => { set({ settled: true }); restoreMusic(); }, 2500);
  };

  const notify = () => {
    if (latest.current.notified) return;
    play('notify');
    set({ notified: true });
    later(() => set({ doneShown: true }), 190);
  };

  const { step, tears, newest, settled, idle, castSync, notified, doneShown } = state;
  const final = step >= 8;
  const marks = PK_FEATS.map((_, i) => ({ cls: i < step ? 'pk-cine-is-on' : '' }));
  /* The name is the joke: all four cards print it at one size. Past NAME_ROOM it gets shorter, and "M. III" would be nobody, so a suffix goes first. */
  const full = packName(playerName);
  const shown = (full.length <= NAME_ROOM ? full : Array.from(packShortName(full.replace(/\s+(JR\.?|SR\.?|II|III|IV|V)$/, ''), NAME_ROOM)).slice(0, NAME_ROOM).join('')).trim();
  const article = /^[AEIOU]/.test(shown.normalize('NFD')) ? 'AN' : 'A';
  const cards = [`${article} ${shown} PICTURE`, `STARRING ${shown}`, `DIRECTED BY ${shown}`, `AT ${article} ${shown} CINEMA`];
  const v = {
    cards,
    cardFit: fitCards(cards),
    rootClass: [
      tears ? 'pk-cine-hit-' + (tears % 2) : '',
      final ? 'pk-cine-is-final' : '',
      tears > 8 ? 'pk-cine-is-encore' : '',
      settled ? 'pk-cine-is-settled' : '',
      notified ? 'pk-cine-is-notified' : '',
      doneShown ? 'pk-cine-is-done' : '',
    ].join(' '),
    heroLabel: final ? 'Tear another stub. All eight features are up on the board.' : 'Tear the ticket, ' + step + ' of 8 features revealed',
    idleClass: !tears ? 'pk-cine-is-idle' : idle ? 'pk-cine-is-idle pk-cine-is-again' : '',
    castSync,
    hintClass: step >= 7 ? 'pk-cine-is-last' : '',
    seatNo: Math.min(step + 1, 8),
    falls: PK_FALLS.map((s) => {
      const n = PK_FALLS.length;
      const last = tears - (((tears - 1 - s) % n + n) % n);
      if (last < 1) return { cls: '', seat: 1 };
      return {
        cls: 'pk-cine-r' + (Math.floor((last - 1) / n) % 2) + (last > 8 ? ' pk-cine-is-enc' : ''),
        seat: Math.min(last, 8),
      };
    }),
    chase: final ? (settled ? '.9s' : PK_CHASE[8]) : PK_CHASE[step],
    glow: step / 8,
    behind: final ? 0 : Math.pow(step / 7, 1.4) * 0.8,
    marksA: marks.slice(0, 4),
    marksB: marks.slice(4),
    bulbs: PK_BULBS,
    lines: PK_FEATS.map(([text], i) => ({
      text,
      n: text.length,
      lit: i < step,
      cls: i === newest ? 'pk-cine-is-new' : i === step ? 'pk-cine-is-next' : '',
    })),
    ticker: PK_TICKER,
    tear,
    notify,
    doneShown,
    notDone: !doneShown,
  };
  return (
    <div className={`pk-cine-root ${v.rootClass}`}>
      <div className="pk-cine-set" aria-hidden="true">
        <svg className="pk-cine-defs" aria-hidden="true">
          <defs>
            <linearGradient id="pk-cine-goldfoil" gradientUnits="userSpaceOnUse" x1="60" y1="-20" x2="236" y2="186">
              <stop offset="0" stopColor="#ffedb6"></stop>
              <stop offset=".16" stopColor="#ffdf8e"></stop>
              <stop offset=".52" stopColor="#e8b64c"></stop>
              <stop offset=".84" stopColor="#b98a2e"></stop>
              <stop offset="1" stopColor="#a87c24"></stop>
            </linearGradient>
            <radialGradient id="pk-cine-specgrad" gradientUnits="userSpaceOnUse" cx="84" cy="30" r="150">
              <stop offset="0" stopColor="#fff" stopOpacity=".42"></stop>
              <stop offset=".5" stopColor="#fff" stopOpacity=".08"></stop>
              <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
            </radialGradient>
            <linearGradient id="pk-cine-edge" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="164">
              <stop offset="0" stopColor="#fff6d6" stopOpacity=".95"></stop>
              <stop offset=".5" stopColor="#ffe6a6" stopOpacity=".35"></stop>
              <stop offset="1" stopColor="#6e4c12" stopOpacity=".6"></stop>
            </linearGradient>
            <pattern id="pk-cine-roll" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(62)">
              <rect width="1" height="3" fill="#fff" fillOpacity=".05"></rect>
              <rect x="1.5" width="1" height="3" fill="#5a3a08" fillOpacity=".05"></rect>
            </pattern>
            <path id="pk-cine-bodyshape" d="M24 0H206L205.3 2L206 4A3.5 3.5 0 0 0 206 11L206.6 14.900L206 18.900A3.5 3.5 0 0 0 206 25.900L205.7 29.800L206 33.800A3.5 3.5 0 0 0 206 40.800L205.6 44.700L206 48.700A3.5 3.5 0 0 0 206 55.700L206.3 59.600L206 63.600A3.5 3.5 0 0 0 206 70.600L206 74.500L206 78.500A3.5 3.5 0 0 0 206 85.500L205.7 89.500L206 93.400A3.5 3.5 0 0 0 206 100.400L206.4 104.400L206 108.300A3.5 3.5 0 0 0 206 115.300L206.4 119.300L206 123.200A3.5 3.5 0 0 0 206 130.200L206.1 134.200L206 138.100A3.5 3.5 0 0 0 206 145.100L206.3 149.100L206 153A3.5 3.5 0 0 0 206 160L206.2 162L206 164H24A24 24 0 0 1 0 140V104A22 22 0 0 0 0 60V24A24 24 0 0 1 24 0Z"></path>
            <path id="pk-cine-stubshape" d="M206 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H206L206.2 162L206 160A3.5 3.5 0 0 0 206 153L206.3 149.100L206 145.100A3.5 3.5 0 0 0 206 138.100L206.1 134.200L206 130.200A3.5 3.5 0 0 0 206 123.200L206.4 119.300L206 115.300A3.5 3.5 0 0 0 206 108.300L206.4 104.400L206 100.400A3.5 3.5 0 0 0 206 93.400L205.7 89.500L206 85.500A3.5 3.5 0 0 0 206 78.500L206 74.500L206 70.600A3.5 3.5 0 0 0 206 63.600L206.3 59.600L206 55.700A3.5 3.5 0 0 0 206 48.700L205.6 44.700L206 40.800A3.5 3.5 0 0 0 206 33.800L205.7 29.800L206 25.900A3.5 3.5 0 0 0 206 18.900L206.6 14.900L206 11A3.5 3.5 0 0 0 206 4L205.3 2L206 0Z"></path>
            <clipPath id="pk-cine-bodyclip">
              <use href="#pk-cine-bodyshape"></use>
            </clipPath>
            <filter id="pk-cine-castblur" filterUnits="userSpaceOnUse" x="-20" y="-20" width="340" height="204">
              <feGaussianBlur stdDeviation="3.4"></feGaussianBlur>
            </filter>
            <g id="pk-cine-stubface">
              <path d="M206 2.4H276A24 24 0 0 1 300 26.4V62.4A22 22 0 0 0 300 106.4V142.4A24 24 0 0 1 276 166.4H206V164L206.2 162L206 160A3.5 3.5 0 0 0 206 153L206.3 149.1L206 145.1A3.5 3.5 0 0 0 206 138.1L206.1 134.2L206 130.2A3.5 3.5 0 0 0 206 123.2L206.4 119.3L206 115.3A3.5 3.5 0 0 0 206 108.3L206.4 104.4L206 100.4A3.5 3.5 0 0 0 206 93.4L205.7 89.5L206 85.5A3.5 3.5 0 0 0 206 78.5L206 74.5L206 70.6A3.5 3.5 0 0 0 206 63.6L206.3 59.6L206 55.7A3.5 3.5 0 0 0 206 48.7L205.6 44.7L206 40.8A3.5 3.5 0 0 0 206 33.8L205.7 29.8L206 25.9A3.5 3.5 0 0 0 206 18.9L206.6 14.9L206 11A3.5 3.5 0 0 0 206 4Z" fill="#664512"></path>
              <use href="#pk-cine-stubshape" fill="url(#pk-cine-goldfoil)"></use>
              <use href="#pk-cine-stubshape" fill="url(#pk-cine-roll)"></use>
              <path d="M206 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H206" fill="none" stroke="url(#pk-cine-edge)" strokeWidth="1.2"></path>
              <path d="M207 0L206.3 2L207 4M207 11L207.6 14.900L207 18.900M207 25.900L206.7 29.800L207 33.800M207 40.800L206.6 44.700L207 48.700M207 55.700L207.3 59.600L207 63.600M207 70.600L207 74.500L207 78.500M207 85.500L206.7 89.500L207 93.400M207 100.400L207.4 104.400L207 108.300M207 115.300L207.4 119.300L207 123.200M207 130.200L207.1 134.200L207 138.100M207 145.100L207.3 149.100L207 153M207 160L207.2 162L207 164" fill="none" stroke="#fff6dc" strokeOpacity=".6" strokeWidth="1.1"></path>
              <path d="M216 12H272A16 16 0 0 1 288 28V54.5A30 30 0 0 0 288 109.5V136A16 16 0 0 1 272 152H216Z" fill="none" stroke="#5a3a08" strokeOpacity=".5" strokeWidth="1"></path>
              <path d="M216 13H272A15 15 0 0 1 287 28V54" fill="none" stroke="#fff6dc" strokeOpacity=".3" strokeWidth=".8"></path>
              <path d="M262 28l14 7M224 140l18-6" fill="none" stroke="#fff6dc" strokeOpacity=".18" strokeWidth=".7"></path>
            </g>
            <path id="pk-cine-starshape" d="M103 42L112.6 68.700L141 69.600L118.6 87.100L126.5 114.400L103 98.400L79.500 114.400L87.400 87.100L65 69.600L93.400 68.700Z"></path>
            <linearGradient id="pk-cine-starfoil" gradientUnits="userSpaceOnUse" x1="72" y1="48" x2="132" y2="112">
              <stop offset="0" stopColor="#3d3322"></stop>
              <stop offset=".34" stopColor="#17120b"></stop>
              <stop offset=".62" stopColor="#0f0b06"></stop>
              <stop offset="1" stopColor="#201a10"></stop>
            </linearGradient>
            <path id="pk-cine-stubmark" d="M0 0H6.700A1.300 1.300 0 0 1 8 1.300V3.900A1.600 1.600 0 0 0 8 7.100V9.700A1.300 1.300 0 0 1 6.700 11H0V10.100A.75 .75 0 0 0 0 8.600V7.900A.75 .75 0 0 0 0 6.400V5.700A.75 .75 0 0 0 0 4.200V3.500A.75 .75 0 0 0 0 2V1.200Z"></path>
            <symbol id="pk-cine-i-ticket" viewBox="0 0 24 24">
              <path d="M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.500a1.5 1.5 0 0 0 0 3V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.500a1.5 1.5 0 0 0 0-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"></path>
              <path d="M15 7.500v9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.6 2"></path>
            </symbol>
            <symbol id="pk-cine-i-plex" viewBox="0 0 24 24">
              <path d="M1.800 4.200Q12 2.200 22.200 4.200V14.100Q12 12.100 1.800 14.100Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"></path>
              <path d="M2 22v-2.300a1.800 1.800 0 0 1 3.600 0V22ZM7.100 22v-2.800a1.800 1.800 0 0 1 3.600 0V22ZM13.300 22v-2.800a1.800 1.800 0 0 1 3.600 0V22ZM18.400 22v-2.300a1.800 1.800 0 0 1 3.600 0V22Z" fill="currentColor"></path>
            </symbol>
            <symbol id="pk-cine-i-corn" viewBox="0 0 24 24">
              <path d="M6 10.5 7.6 21h8.800L18 10.5 M10 10.500l.6 10.5 M14 10.5 13.4 21 M5.6 10.500a2.6 2.6 0 0 1 1-5 3 3 0 0 1 5.4-2 3 3 0 0 1 5.4 2 2.6 2.6 0 0 1 1 5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"></path>
            </symbol>
            <symbol id="pk-cine-i-city" viewBox="0 0 24 24">
              <path d="M3 21V11h5v10 M8 21V4h8v17 M16 21v-8h5v8 M2 21h20 M11 8h2 M11 12h2 M11 16h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"></path>
            </symbol>
            <symbol id="pk-cine-i-seat" viewBox="0 0 24 24">
              <path d="M6.5 11V6A2.5 2.5 0 0 1 9 3.500h6A2.5 2.5 0 0 1 17.5 6v5 M4 11a2 2 0 0 1 2 2v2.500h12V13a2 2 0 1 1 3 1.700V19H3v-4.300A2 2 0 0 1 4 11Z M6 19v2 M18 19v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"></path>
            </symbol>
            <symbol id="pk-cine-i-rope" viewBox="0 0 24 24">
              <path d="M3.800 10.500V20.500M20.200 10.500V20.500" fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinecap="round"></path>
              <path d="M1.500 21.500h4.600M17.900 21.500h4.600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
              <circle cx="3.800" cy="8.400" r="2.300" fill="currentColor"></circle>
              <circle cx="20.200" cy="8.400" r="2.300" fill="currentColor"></circle>
              <path d="M3.800 9.600C5.800 22.600 18.200 22.600 20.200 9.600" fill="none" stroke="currentColor" strokeWidth="2.600" strokeLinecap="round"></path>
            </symbol>
            <symbol id="pk-cine-i-chart" viewBox="0 0 24 24">
              <path d="M5 20.500v-6 M12 20.500V9 M19 20.500V3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"></path>
            </symbol>
            <symbol id="pk-cine-i-star" viewBox="0 0 24 24">
              <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2-5.6-3.100L6.4 20l1.2-6.200L3 9.500l6.3-.8Z" fill="currentColor"></path>
            </symbol>
          </defs>
        </svg>
        <div className="pk-cine-hall">
          <div className="pk-cine-spill"></div>
          <div className="pk-cine-screen" style={v.cardFit}>
            <svg className="pk-cine-screen-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <radialGradient id="pk-cine-lit" cx="50%" cy="46%" r="72%">
                  <stop offset="0" stopColor="#fff8e6"></stop>
                  <stop offset=".55" stopColor="#ffedc4"></stop>
                  <stop offset="1" stopColor="#eec684"></stop>
                </radialGradient>
              </defs>
              <path d="M0 2Q50 -1 100 2V98Q50 101 0 98Z" fill="url(#pk-cine-lit)" stroke="#0a0504" strokeWidth="5" vectorEffect="non-scaling-stroke"></path>
            </svg>
            <span className="pk-cine-card pk-cine-c1">{v.cards[0]}</span>
            {' '}
            <span className="pk-cine-card pk-cine-c2">{v.cards[1]}</span>
            {' '}
            <span className="pk-cine-card pk-cine-c3">{v.cards[2]}</span>
            {' '}
            <span className="pk-cine-card pk-cine-c4">{v.cards[3]}</span>
            {' '}
            <span className="pk-cine-flick"></span>
            {' '}
            <span className="pk-cine-strike"></span>
            {' '}
            <span className="pk-cine-reel"></span>
          </div>
          <div className="pk-cine-drape pk-cine-is-l"></div>
          <div className="pk-cine-drape pk-cine-is-r"></div>
          <svg className="pk-cine-crowd" viewBox="0 0 375 527" preserveAspectRatio="xMidYMin slice">
            <defs>
              <g id="pk-cine-row">
                <rect x="-470" y="33" width="940" height="117"></rect>
                <path d="M-449.5 150V27Q-449.5 21 -443.5 21H-429.5Q-423.5 21 -423.5 27V150ZM-416.9 150V27Q-416.9 21 -410.9 21H-396.9Q-390.9 21 -390.9 27V150ZM-388.1 150V27Q-388.1 21 -382.1 21H-368.1Q-362.1 21 -362.1 27V150ZM-359.1 150V27Q-359.1 21 -353.1 21H-339.1Q-333.1 21 -333.1 27V150ZM-328.4 150V27Q-328.4 21 -322.4 21H-308.4Q-302.4 21 -302.4 27V150ZM-297.7 150V27Q-297.7 21 -291.7 21H-277.7Q-271.7 21 -271.7 27V150ZM-268.6 150V27Q-268.6 21 -262.6 21H-248.6Q-242.6 21 -242.6 27V150ZM-237.8 150V27Q-237.8 21 -231.8 21H-217.8Q-211.8 21 -211.8 27V150ZM-206.8 150V27Q-206.8 21 -200.8 21H-186.8Q-180.8 21 -180.8 27V150ZM-176.6 150V27Q-176.6 21 -170.6 21H-156.6Q-150.6 21 -150.6 27V150ZM-147.3 150V27Q-147.3 21 -141.3 21H-127.3Q-121.3 21 -121.3 27V150ZM-119 150V27Q-119 21 -113 21H-99Q-93 21 -93 27V150ZM-86.5 150V27Q-86.5 21 -80.5 21H-66.5Q-60.5 21 -60.5 27V150ZM-57.7 150V27Q-57.7 21 -51.7 21H-37.7Q-31.7 21 -31.7 27V150ZM-28.4 150V27Q-28.4 21 -22.4 21H-8.4Q-2.4 21 -2.4 27V150ZM3.4 150V27Q3.4 21 9.4 21H23.4Q29.4 21 29.4 27V150ZM33.1 150V27Q33.1 21 39.1 21H53.1Q59.1 21 59.1 27V150ZM61.8 150V27Q61.8 21 67.8 21H81.8Q87.8 21 87.8 27V150ZM90.6 150V27Q90.6 21 96.6 21H110.6Q116.6 21 116.6 27V150ZM121.6 150V27Q121.6 21 127.6 21H141.6Q147.6 21 147.6 27V150ZM150.8 150V27Q150.8 21 156.8 21H170.8Q176.8 21 176.8 27V150ZM182.2 150V27Q182.2 21 188.2 21H202.2Q208.2 21 208.2 27V150ZM213.5 150V27Q213.5 21 219.5 21H233.5Q239.5 21 239.5 27V150ZM243.1 150V27Q243.1 21 249.1 21H263.1Q269.1 21 269.1 27V150ZM272.1 150V27Q272.1 21 278.1 21H292.1Q298.1 21 298.1 27V150ZM303.2 150V27Q303.2 21 309.2 21H323.2Q329.2 21 329.2 27V150ZM332.6 150V27Q332.6 21 338.6 21H352.6Q358.6 21 358.6 27V150ZM363.1 150V27Q363.1 21 369.1 21H383.1Q389.1 21 389.1 27V150ZM390.8 150V27Q390.8 21 396.8 21H410.8Q416.8 21 416.8 27V150ZM422.8 150V27Q422.8 21 428.8 21H442.8Q448.8 21 448.8 27V150Z"></path>
                <path fill="currentColor" d="M-447.3 11.9a9.7 9.7 0 1 0 19.4 0a9.7 9.7 0 1 0 -19.4 0ZM-413.6 12.6a9.6 9.6 0 1 0 19.2 0a9.6 9.6 0 1 0 -19.2 0ZM-383.9 11.6a9.4 9.4 0 1 0 18.7 0a9.4 9.4 0 1 0 -18.7 0ZM-354.9 12.8a9.6 9.6 0 1 0 19.1 0a9.6 9.6 0 1 0 -19.1 0ZM-323.8 11.6a9 9 0 1 0 17.9 0a9 9 0 1 0 -17.9 0ZM-295.3 12.4a9.9 9.9 0 1 0 19.8 0a9.9 9.9 0 1 0 -19.8 0ZM-266.7 10.9a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM-235.3 10.9a10.2 10.2 0 1 0 20.5 0a10.2 10.2 0 1 0 -20.5 0ZM-203.4 11.2a9.8 9.8 0 1 0 19.7 0a9.8 9.8 0 1 0 -19.7 0ZM-174.2 13.8a9.4 9.4 0 1 0 18.9 0a9.4 9.4 0 1 0 -18.9 0ZM-145.3 13.9a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM-115.8 13.9a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM-84.5 12.3a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM-52.7 13.9a8.8 8.8 0 1 0 17.7 0a8.8 8.8 0 1 0 -17.7 0ZM-25.6 10.9a10.5 10.5 0 1 0 21.1 0a10.5 10.5 0 1 0 -21.1 0ZM6.5 13.1a9.9 9.9 0 1 0 19.8 0a9.9 9.9 0 1 0 -19.8 0ZM37.6 13.9a9.7 9.7 0 1 0 19.3 0a9.7 9.7 0 1 0 -19.3 0ZM63.7 12.5a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM93.8 13.5a8.9 8.9 0 1 0 17.8 0a8.9 8.9 0 1 0 -17.8 0ZM124.6 12.1a9.9 9.9 0 1 0 19.8 0a9.9 9.9 0 1 0 -19.8 0ZM154.4 11.5a9.6 9.6 0 1 0 19.1 0a9.6 9.6 0 1 0 -19.1 0ZM185.7 11.2a10.6 10.6 0 1 0 21.3 0a10.6 10.6 0 1 0 -21.3 0ZM215.8 12.7a10.3 10.3 0 1 0 20.7 0a10.3 10.3 0 1 0 -20.7 0ZM245.5 12.5a10.1 10.1 0 1 0 20.2 0a10.1 10.1 0 1 0 -20.2 0ZM276 14a9.3 9.3 0 1 0 18.6 0a9.3 9.3 0 1 0 -18.6 0ZM308.2 11.4a9.1 9.1 0 1 0 18.2 0a9.1 9.1 0 1 0 -18.2 0ZM335.9 13.5a9.4 9.4 0 1 0 18.8 0a9.4 9.4 0 1 0 -18.8 0ZM365.7 12.5a9.8 9.8 0 1 0 19.5 0a9.8 9.8 0 1 0 -19.5 0ZM392.8 13.7a10.4 10.4 0 1 0 20.8 0a10.4 10.4 0 1 0 -20.8 0ZM426.1 13.7a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0Z"></path>
                <path d="M-445.7 6.7A9.7 9.7 0 0 1 -429.4 6.7M-412.1 7.4A9.6 9.6 0 0 1 -395.9 7.4M-382.4 6.5A9.4 9.4 0 0 1 -366.7 6.5M-353.3 7.6A9.6 9.6 0 0 1 -337.3 7.6M-322.3 6.8A9 9 0 0 1 -307.3 6.8M-293.7 7.1A9.9 9.9 0 0 1 -277 7.1M-265 5.3A10.4 10.4 0 0 1 -247.6 5.3M-233.6 5.4A10.2 10.2 0 0 1 -216.5 5.4M-201.8 5.9A9.8 9.8 0 0 1 -185.3 5.9M-172.7 8.7A9.4 9.4 0 0 1 -156.8 8.7M-143.6 8.3A10.4 10.4 0 0 1 -126.1 8.3M-114.2 8.3A10.4 10.4 0 0 1 -96.7 8.3M-82.8 6.7A10.4 10.4 0 0 1 -65.4 6.7M-51.3 9.2A8.8 8.8 0 0 1 -36.4 9.2M-23.9 5.2A10.5 10.5 0 0 1 -6.2 5.2M8.1 7.7A9.9 9.9 0 0 1 24.7 7.7M39.1 8.6A9.7 9.7 0 0 1 55.4 8.6M65.4 6.9A10.4 10.4 0 0 1 82.9 6.9M95.2 8.7A8.9 8.9 0 0 1 110.2 8.7M126.2 6.8A9.9 9.9 0 0 1 142.8 6.8M156 6.3A9.6 9.6 0 0 1 172 6.3M187.4 5.5A10.6 10.6 0 0 1 205.2 5.5M217.5 7.1A10.3 10.3 0 0 1 234.9 7.1M247.1 7.1A10.1 10.1 0 0 1 264.1 7.1M277.4 9A9.3 9.3 0 0 1 293.1 9M309.7 6.5A9.1 9.1 0 0 1 325 6.5M337.4 8.5A9.4 9.4 0 0 1 353.1 8.5M367.3 7.3A9.8 9.8 0 0 1 383.7 7.3M394.5 8.1A10.4 10.4 0 0 1 412 8.1M427.7 8.5A9.5 9.5 0 0 1 443.6 8.5" fill="none" stroke="#ffd79a" strokeWidth="1.1" vectorEffect="non-scaling-stroke"></path>
                <path d="M-448.9 25Q-448.9 21.6 -443.5 21.6M-429.5 21.6Q-424.1 21.6 -424.1 25M-416.3 25Q-416.3 21.6 -410.9 21.6M-396.9 21.6Q-391.5 21.6 -391.5 25M-387.5 25Q-387.5 21.6 -382.1 21.6M-368.1 21.6Q-362.7 21.6 -362.7 25M-358.5 25Q-358.5 21.6 -353.1 21.6M-339.1 21.6Q-333.7 21.6 -333.7 25M-327.8 25Q-327.8 21.6 -322.4 21.6M-308.4 21.6Q-303 21.6 -303 25M-297.1 25Q-297.1 21.6 -291.7 21.6M-277.7 21.6Q-272.3 21.6 -272.3 25M-268 25Q-268 21.6 -262.6 21.6M-248.6 21.6Q-243.2 21.6 -243.2 25M-237.2 25Q-237.2 21.6 -231.8 21.6M-217.8 21.6Q-212.4 21.6 -212.4 25M-206.2 25Q-206.2 21.6 -200.8 21.6M-186.8 21.6Q-181.4 21.6 -181.4 25M-176 25Q-176 21.6 -170.6 21.6M-156.6 21.6Q-151.2 21.6 -151.2 25M-146.7 25Q-146.7 21.6 -141.3 21.6M-127.3 21.6Q-121.9 21.6 -121.9 25M-118.4 25Q-118.4 21.6 -113 21.6M-99 21.6Q-93.6 21.6 -93.6 25M-85.9 25Q-85.9 21.6 -80.5 21.6M-66.5 21.6Q-61.1 21.6 -61.1 25M-57.1 25Q-57.1 21.6 -51.7 21.6M-37.7 21.6Q-32.3 21.6 -32.3 25M-27.8 25Q-27.8 21.6 -22.4 21.6M-8.4 21.6Q-3 21.6 -3 25M4 25Q4 21.6 9.4 21.6M23.4 21.6Q28.8 21.6 28.8 25M33.7 25Q33.7 21.6 39.1 21.6M53.1 21.6Q58.5 21.6 58.5 25M62.4 25Q62.4 21.6 67.8 21.6M81.8 21.6Q87.2 21.6 87.2 25M91.2 25Q91.2 21.6 96.6 21.6M110.6 21.6Q116 21.6 116 25M122.2 25Q122.2 21.6 127.6 21.6M141.6 21.6Q147 21.6 147 25M151.4 25Q151.4 21.6 156.8 21.6M170.8 21.6Q176.2 21.6 176.2 25M182.8 25Q182.8 21.6 188.2 21.6M202.2 21.6Q207.6 21.6 207.6 25M214.1 25Q214.1 21.6 219.5 21.6M233.5 21.6Q238.9 21.6 238.9 25M243.7 25Q243.7 21.6 249.1 21.6M263.1 21.6Q268.5 21.6 268.5 25M272.7 25Q272.7 21.6 278.1 21.6M292.1 21.6Q297.5 21.6 297.5 25M303.8 25Q303.8 21.6 309.2 21.6M323.2 21.6Q328.6 21.6 328.6 25M333.2 25Q333.2 21.6 338.6 21.6M352.6 21.6Q358 21.6 358 25M363.7 25Q363.7 21.6 369.1 21.6M383.1 21.6Q388.5 21.6 388.5 25M391.4 25Q391.4 21.6 396.8 21.6M410.8 21.6Q416.2 21.6 416.2 25M423.4 25Q423.4 21.6 428.8 21.6M442.8 21.6Q448.2 21.6 448.2 25" fill="none" stroke="#ffb98a" opacity=".62" strokeWidth=".9" vectorEffect="non-scaling-stroke"></path>
              </g>
            </defs>
            <mask id="pk-cine-twoseats" maskUnits="userSpaceOnUse" x="-100" y="-10" width="575" height="120">
              <rect x="-100" y="-10" width="575" height="120" fill="#fff"></rect>
              <path d="M117.100 -10H131.400V12.600H117.100ZM261.100 -10H275.300V12.600H261.100Z" fill="#000"></path>
            </mask>
            <g mask="url(#pk-cine-twoseats)">
              <use href="#pk-cine-row" transform="translate(187.5 0) scale(0.6)" fill="#50171d" color="#120604" strokeOpacity="0.95"></use>
            </g>
            <use href="#pk-cine-row" transform="translate(201.3 14) scale(0.72)" fill="#44131b" color="#130604" strokeOpacity="0.72"></use>
            <use href="#pk-cine-row" transform="translate(185.5 31) scale(0.86)" fill="#381017" color="#170806" strokeOpacity="0.46"></use>
            <use href="#pk-cine-row" transform="translate(204 52) scale(1.03)" fill="#2d0e13" color="#1d090a" strokeOpacity="0.3"></use>
            <use href="#pk-cine-row" transform="translate(184.5 77) scale(1.24)" fill="#250b10" color="#200a0e" strokeOpacity="0.2"></use>
            <use href="#pk-cine-row" transform="translate(211.7 108) scale(1.48)" fill="#200a0e" color="#200a0e" strokeOpacity="0.14"></use>
            <use href="#pk-cine-row" transform="translate(186.5 147) scale(1.78)" fill="#1c080c" color="#1c080c" strokeOpacity="0.1"></use>
            <use href="#pk-cine-row" transform="translate(222.6 196) scale(2.14)" fill="#19070b" color="#19070b" strokeOpacity="0.08"></use>
            <use href="#pk-cine-row" transform="translate(185.5 258) scale(2.56)" fill="#17060a" color="#17060a" strokeOpacity="0.06"></use>
            <use href="#pk-cine-row" transform="translate(234.7 336) scale(3.08)" fill="#150508" color="#150508" strokeOpacity="0.05"></use>
            <use href="#pk-cine-row" transform="translate(186.5 436) scale(3.7)" fill="#130508" color="#130508" strokeOpacity="0.04"></use>
          </svg>
          <svg className="pk-cine-crowd" viewBox="0 0 375 527" preserveAspectRatio="xMidYMin slice">
            <g className="pk-cine-shift pk-cine-is-a">
              <circle cx="124.260" cy="8.340" r="6.240" fill="#120604"></circle>
              <path d="M118.980 4.980A6.240 6.240 0 0 1 129.480 4.980" fill="none" stroke="#ffd79a" strokeOpacity=".95" strokeWidth="1.100" vectorEffect="non-scaling-stroke"></path>
            </g>
            <g className="pk-cine-shift pk-cine-is-b">
              <circle cx="268.200" cy="7.260" r="5.940" fill="#120604"></circle>
              <path d="M263.220 4.080A5.940 5.940 0 0 1 273.180 4.080" fill="none" stroke="#ffd79a" strokeOpacity=".95" strokeWidth="1.100" vectorEffect="non-scaling-stroke"></path>
            </g>
          </svg>
        </div>
        <div className="pk-cine-read"></div>
        <div className="pk-cine-curtain">
          <svg className="pk-cine-hem" width="100%" height="34">
            <defs>
              <linearGradient id="pk-cine-foldgrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="68" y2="0">
                <stop offset="0" stopColor="#2c070b"></stop>
                <stop offset=".32" stopColor="#4a1019"></stop>
                <stop offset=".5" stopColor="#64161f"></stop>
                <stop offset=".68" stopColor="#4a1019"></stop>
                <stop offset="1" stopColor="#2c070b"></stop>
              </linearGradient>
              <pattern id="pk-cine-hempat" width="68" height="34" patternUnits="userSpaceOnUse">
                <path d="M0 0H68V10Q51 17 34 13Q17 17 0 10Z" fill="url(#pk-cine-foldgrad)"></path>
                <path d="M0 15Q17 22 34 18Q51 22 68 15" fill="none" stroke="#a97a26" strokeWidth="10" strokeDasharray="1.3 1.3" transform="translate(0 2)"></path>
                <path d="M0 10Q17 17 34 13Q51 17 68 10" fill="none" stroke="#e8b64c" strokeWidth="3"></path>
                <path d="M0 9Q17 16 34 12Q51 16 68 9" fill="none" stroke="#ffe9b0" strokeOpacity=".8" strokeWidth=".8"></path>
              </pattern>
              <pattern id="pk-cine-hemwarm" width="68" height="34" patternUnits="userSpaceOnUse">
                <path d="M0 0H68V10Q51 17 34 13Q17 17 0 10Z" fill="#ffbe68" fillOpacity=".24"></path>
              </pattern>
            </defs>
            <rect width="100%" height="34" fill="url(#pk-cine-hempat)"></rect>
            <rect className="pk-cine-hemlit" width="100%" height="34" fill="url(#pk-cine-hemwarm)"></rect>
          </svg>
        </div>
        <div className="pk-cine-shade"></div>
        <div className="pk-cine-key"></div>
        <div className="pk-cine-behind" style={{ '--lit': v.behind } as React.CSSProperties}></div>
        <div className="pk-cine-beam pk-cine-is-l"></div>
        <div className="pk-cine-beam pk-cine-is-r"></div>
        <div className="pk-cine-vignette"></div>
      </div>
      <div className="pk-cine-page">
        <div className="pk-cine-topbar">
          <button type="button" className="pk-cine-backbtn" onClick={() => { play('click'); onBack(); }}> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5 M11 5.5 4.5 12l6.5 6.5" fill="none" stroke="#e8b64c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path></svg> Back </button>
          <PackSoundToggle on={soundOn} onToggle={toggleSound} className={`pk-cine-snd ${soundOn ? '' : 'is-off'}`} />
          <div className="pk-cine-chip"> <svg viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="#ffdf8e" strokeWidth="1.5"></path><rect x="1" y="6" width="10" height="7.5" rx="1.6" fill="#ffdf8e"></rect></svg> Future Update </div>
        </div>
        <div className="pk-cine-upper" style={{ '--lit': v.behind } as React.CSSProperties}>
          <button className="pk-cine-hero" type="button" data-reveal="1" onClick={v.tear} aria-label={v.heroLabel}>
            <span className="pk-cine-stage" aria-hidden="true">
              <span className="pk-cine-pool"></span>
              {' '}
              <span className="pk-cine-box">
                <span className="pk-cine-cast">
                  <i className="pk-cine-castdark"></i>
                </span>
                {' '}
                <span className="pk-cine-float">
                  <span className="pk-cine-castfinal">
                    <span className="pk-cine-castshape" style={{ '--sync': v.castSync } as React.CSSProperties}>
                      <svg className="pk-cine-tk" viewBox="0 0 300 164">
                        <path filter="url(#pk-cine-castblur)" fill="#341b05" d="M24 0H188.700V143A5.500 5.500 0 0 0 199.700 143V164H24A24 24 0 0 1 0 140V104A22 22 0 0 0 0 60V24A24 24 0 0 1 24 0Z"></path>
                      </svg>
                      <span className="pk-cine-caststub">
                        <svg className="pk-cine-tk" viewBox="0 0 300 164">
                          <path filter="url(#pk-cine-castblur)" fill="#341b05" d="M199.700 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H199.700V160H186V150H199.700Z"></path>
                        </svg>
                      </span>
                    </span>
                  </span>
                  {' '}
                  <span className="pk-cine-press">
                    <span className="pk-cine-kick">
                      <span className="pk-cine-impact">
                        <span className={`pk-cine-stub pk-cine-is-fresh ${v.idleClass}`}>
                          <svg className="pk-cine-tk" viewBox="0 0 300 164">
                            <use href="#pk-cine-stubface"></use>
                            <use className="pk-cine-backlit" href="#pk-cine-stubshape" fill="#c98a1e"></use>
                            <path className="pk-cine-keep" d="M206 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H206" fill="none" stroke="#6e4610" strokeOpacity=".45" strokeWidth="1.5"></path>
                            <text className="pk-cine-lab-a" x="0" y="0" transform="translate(250 82) rotate(90)" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="17.5" letterSpacing="3.5" dominantBaseline="central" fill="#14100a">ADMIT ONE</text>
                            <text className="pk-cine-lab-b" x="0" y="0" transform="translate(250 82) rotate(90)" textAnchor="middle" fontFamily="Anton,sans-serif" fontSize="27" letterSpacing="3.5" dominantBaseline="central" fill="#14100a">ENCORE</text>
                          </svg>
                          <span className="pk-cine-seatno">SEAT {v.seatNo}</span>
                        </span>
                        <svg className="pk-cine-tk" viewBox="0 0 300 164">
                          <path d="M24 2.4H206L206 4A3.5 3.5 0 0 0 206 11L206.6 14.9L206 18.9A3.5 3.5 0 0 0 206 25.9L205.7 29.8L206 33.8A3.5 3.5 0 0 0 206 40.8L205.6 44.7L206 48.7A3.5 3.5 0 0 0 206 55.7L206.3 59.6L206 63.6A3.5 3.5 0 0 0 206 70.6L206 74.5L206 78.5A3.5 3.5 0 0 0 206 85.5L205.7 89.5L206 93.4A3.5 3.5 0 0 0 206 100.4L206.4 104.4L206 108.3A3.5 3.5 0 0 0 206 115.3L206.4 119.3L206 123.2A3.5 3.5 0 0 0 206 130.2L206.1 134.2L206 138.1A3.5 3.5 0 0 0 206 145.1L206.3 149.1L206 153A3.5 3.5 0 0 0 206 160L206.2 162L206 164V166.4H24A24 24 0 0 1 0 142.4V106.4A22 22 0 0 0 0 62.4V26.4A24 24 0 0 1 24 2.4Z" fill="#664512"></path>
                          <use href="#pk-cine-bodyshape" fill="url(#pk-cine-goldfoil)"></use>
                          <g clipPath="url(#pk-cine-bodyclip)">
                            <rect width="206" height="164" fill="url(#pk-cine-roll)"></rect>
                            <path d="M149 82L253 82M148.3 90L250.7 108M146.2 97.700L244 133.300M142.8 105L232.9 157M138.2 111.600L217.9 178.400M132.6 117.200L199.4 196.900M126 121.800L178 211.900M118.7 125.200L154.3 223M111 127.300L129 229.700M103 128L103 232M95 127.300L77 229.700M87.3 125.200L51.7 223M80 121.800L28 211.900M73.4 117.200L6.6 196.900M67.8 111.600L-11.9 178.400M63.2 105L-26.9 157M59.8 97.700L-38 133.300M57.7 90L-44.7 108M57 82L-47 82M57.7 74L-44.7 56M59.8 66.300L-38 30.700M63.2 59L-26.9 7M67.8 52.400L-11.9 -14.400M73.4 46.800L6.6 -32.900M80 42.200L28 -47.900M87.3 38.800L51.7 -59M95 36.700L77 -65.700M103 36L103 -68M111 36.700L129 -65.700M118.7 38.800L154.3 -59M126 42.200L178 -47.900M132.6 46.800L199.4 -32.900M138.2 52.400L217.9 -14.400M142.8 59L232.9 7M146.2 66.300L244 30.700M148.3 74L250.7 56" fill="none" stroke="#6a4610" strokeOpacity=".13" strokeWidth="1"></path>
                            <rect className="pk-cine-spec" width="206" height="164" fill="url(#pk-cine-specgrad)"></rect>
                            <path d="M0 30Q18 20 34 0" fill="none" stroke="#5a3a08" strokeOpacity=".22" strokeWidth=".9"></path>
                            <path d="M1 31.500Q19 21.5 35.5 1" fill="none" stroke="#fff6dc" strokeOpacity=".3" strokeWidth=".8"></path>
                            <path d="M34 128L71 146M150 18l32 11M16 112l12 6" fill="none" stroke="#fff6dc" strokeOpacity=".2" strokeWidth=".7"></path>
                          </g>
                        </svg>
                        <span className="pk-cine-glintbox">
                          <i className="pk-cine-glint"></i>
                        </span>
                        <svg className="pk-cine-tk" viewBox="0 0 300 164">
                          <path d="M206 0H24A24 24 0 0 0 0 24V60A22 22 0 0 1 0 104V140A24 24 0 0 0 24 164H206" fill="none" stroke="url(#pk-cine-edge)" strokeWidth="1.2"></path>
                          <path d="M205 0L204.3 2L205 4M205 11L205.6 14.900L205 18.900M205 25.900L204.7 29.800L205 33.800M205 40.800L204.6 44.700L205 48.700M205 55.700L205.3 59.600L205 63.600M205 70.600L205 74.500L205 78.500M205 85.500L204.7 89.500L205 93.400M205 100.400L205.4 104.400L205 108.300M205 115.300L205.4 119.300L205 123.200M205 130.200L205.1 134.200L205 138.100M205 145.100L205.3 149.100L205 153M205 160L205.2 162L205 164" fill="none" stroke="#fff6dc" strokeOpacity=".6" strokeWidth="1.1"></path>
                          <path d="M28 12H194V152H28A16 16 0 0 1 12 136V109.5A30 30 0 0 0 12 54.5V28A16 16 0 0 1 28 12Z" fill="none" stroke="#5a3a08" strokeOpacity=".5" strokeWidth="1"></path>
                          <path d="M28 13H193M13 54V28A15 15 0 0 1 28 13" fill="none" stroke="#fff6dc" strokeOpacity=".32" strokeWidth=".8"></path>
                          <text x="103" y="31" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="12" letterSpacing="2.4" fill="#4a3006" fillOpacity=".85">OPENING NIGHT</text>
                          <text x="103" y="141" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="12" letterSpacing="2.4" fill="#3e2806" fillOpacity=".85">ROW A</text>
                          <g className="pk-cine-printstar" transform="translate(103 82) scale(.86) translate(-103 -82)">
                            <use href="#pk-cine-starshape" transform="translate(1.2 1.5)" fill="#fff4cc"></use>
                            <use href="#pk-cine-starshape" transform="translate(-1 -1.200)" fill="#6a4610"></use>
                            <use href="#pk-cine-starshape" fill="url(#pk-cine-starfoil)"></use>
                          </g>
                          <use className="pk-cine-backlit" href="#pk-cine-bodyshape" fill="#c98a1e"></use>
                          <path className="pk-cine-keep" d="M206 0H24A24 24 0 0 0 0 24V60A22 22 0 0 1 0 104V140A24 24 0 0 0 24 164H206" fill="none" stroke="#6e4610" strokeOpacity=".45" strokeWidth="1.5"></path>
                        </svg>
                        <span className="pk-cine-stamp">
                          <svg className="pk-cine-stampart" viewBox="-5 -5 166 58">
                            <defs>
                              <mask id="pk-cine-wear" maskUnits="userSpaceOnUse" x="-5" y="-5" width="166" height="58">
                                <rect x="-5" y="-5" width="166" height="58" fill="#fff"></rect>
                                <path d="M45.9 1.6l.1 .5M54.7 24.4l.2 .1M81 28.2l.2 -.2M108.2 4.4l-.3 .1M108.3 41.3l-.3 .3M117.3 50.6l.6 .1M108.4 19l-.2 -.2M1.1 50.3l-.2 -.7M102.9 29.8l.4 .1M148.8 34.9l-.2 .3M61.9 42.9l0 -.3M80 7.4l.4 -.1M106.9 4.9l-.5 .1M121.9 11.1l.3 -.5M118 23.6l0 -.4M88.9 .2l-.6 .1M112.7 3.4l.1 -.3M23.4 .2l-.3 -.3M11.1 -.7l-.5 -.1M42.3 -3.3l.6 .3M36.8 11.7l.5 -.3M52 32.7l-.7 .1M84.1 -1.2l.2 .6M42.7 24.5l.5 -.4M150 34.6l.3 0M115.6 38.9l.4 .4M54.4 -2.6l-.1 .7M134.7 3.2l.4 0M97.3 36.4l-.4 -.3M160 33.4l.1 .5M102 .3l.1 -.3M129.2 52.7l0 -.6M77.6 4.6l-.3 -.2M74 -.7l.6 .2M89.5 8.3l-.2 -.5M145.2 3l-.2 -.1M4.3 19.2l.1 -.5M66.9 20.6l-.2 -.4M41 9.4l-.2 0M107 30.9l0 -.2M85.2 -4.1l-.2 -.4M21 15.2l0 -.2M32.3 13.9l-.3 .5M103 45.6l-.2 .3M60.9 9.6l.1 -.2M99.9 1.7l.1 .4M26.5 29.7l.4 -.2M20.8 43.9l.5 .1M2.1 13.9l-.5 .1M53.7 45.5l0 -.2M160.8 38.1l-.2 0M123.6 24.5l.1 -.4M129 -.3l.4 .1M123.8 -.2l-.1 -.4M66.9 35.3l-.3 -.5M50.3 -.7l-.2 -.5M66.5 38.2l.4 -.2M132.8 9l-.1 .7M110.6 -2.3l-.4 .3M136.1 22.1l-.4 -.2M132.5 4.2l.4 .3M10.7 19.3l-.2 -.2M81 6.3l-.2 .5M97.5 9.8l-.2 -.2M72.7 6.7l.5 -.2M75.8 0l-.1 .4M153.1 18.8l-.6 -.2M10.3 8.3l.1 -.5M20.1 13.4l.5 -.3M12.6 8l.6 .4M70.4 12.8l.1 -.4M36.7 3.5l-.5 .4M35.6 37.4l.3 0M134.4 10.1l.2 -.1M87.6 12.5l-.2 -.6M37.4 .8l.2 .1M40.1 15.4l.1 .2M64.6 48.2l.1 .2M85.1 2.6l-.2 -.2M2.7 48.8l-.2 -.6M65.5 20.9l-.1 -.6M31.8 8.4l0 .6M121.8 26l-.1 .2M129.6 18.6l.1 -.4M83.8 12.6l.2 -.5M17.1 18.5l.3 .4M42.4 18.4l.4 .3M63.6 29.8l.1 .5M112.9 43.7l.5 .1M4.5 43.1l.1 .4M146.9 47.3l.1 -.3M70.6 39.3l.6 -.2M119.2 12.7l-.1 .2M92.7 27l.4 .4M74.5 17.6l-.4 .1M15.8 16.7l.7 .2M152.2 23.7l.3 .2M24.5 10.8l.5 .4M156.8 26.4l.6 -.2M75.9 5.9l-.3 -.1M32.5 7.6l.3 -.5M154.6 33.1l-.3 -.2M61.2 32.1l-.4 -.4M132.6 -2.6l-.4 .6M87.2 14.3l.2 0M119.5 47.5l.4 -.3M99.6 4.2l-.6 .3M18.9 17.6l0 .4M49 16.2l.4 .4M34.3 50.9l0 -.4M15 11.8l-.3 .5M138.1 23l.2 .1M120.2 34.5l.6 0M139.7 1.4l-.5 .1M5.6 -4.1l-.4 .2M124.8 33.2l.5 -.5M74 20.3l.2 .2M-1.6 41.8l-.4 -.2M84.5 10.1l.2 .3M46.2 25l-.1 -.3M152.2 33.3l-.1 .7M-.5 44.2l-.1 -.5M11 8.2l-.3 .1M81.9 52.1l.2 .1M88.7 37.4l0 -.5M16.6 -4.6l-.3 -.2M91.5 1.5l.6 -.2M156.1 21.8l.4 .5M37.6 8.9l.1 .4M99.4 -3.8l-.1 .3M152.6 20.2l-.2 -.1M71 11l.3 -.1M71 8.2l-.1 -.2M67.2 46.2l.1 -.2M99.1 38.1l.1 .2M135 4.2l.3 -.1M74.3 26.7l.4 -.3M136.2 31.3l.6 -.2M80.5 34.8l-.2 0M4.4 47.6l0 .3M27.2 18.2l.4 .6M109.3 45.2l.1 -.5M104.7 2.4l-.4 .6M150.9 29.4l0 .2M67.9 37.9l-.7 -.2M58.1 42.6l-.2 -.6M-4.8 10.7l.1 -.7M153.9 34.5l-.5 -.3M47.9 30.2l-.3 .5M142.9 29.6l-.6 .4M145.7 4.1l-.1 .4M69.2 41.1l-.2 .4M-.2 17.8l.2 .1M51.2 28.3l-.5 -.1M125.3 18.2l.5 -.4M7.4 11l.4 -.3M112.5 29.1l.1 .2M-3.1 -1l-.6 .1M107.4 32.3l.4 0M37.6 8.8l.6 -.3M69.2 33l.2 .2M157.4 45.3l-.2 -.1M108.2 36.4l-.2 -.3M117.2 21.8l0 .5M158 13.3l-.6 .1M73.4 11.1l.1 -.2M-4 40.9l.1 .5M13.3 31.2l-.2 0M132.8 25.7l-.3 -.4M96.1 37.2l.7 .2M153.6 40.9l.6 .2M46.9 18l-.2 .1M155.9 37.6l-.7 -.1M18 13l.4 -.4M94.3 13.5l-.4 -.2M69.4 22.8l-.1 -.3M97.3 46.3l.4 .2M113 23.5l-.4 .2M84.6 -3.5l0 .3M34.7 38.5l.4 -.1M139.7 25.5l.1 .6M37.9 10.8l-.5 -.4M129.5 36.3l.4 .1M113.3 13.2l-.4 .4M83 47.1l-.2 -.3M5.8 36.7l.5 -.1M72.5 7.8l.2 .4M15.3 14.2l-.4 .3M-.8 13l.5 -.5M95.7 37l-.4 -.2M154.1 3.2l-.3 .3M101.6 9.7l0 -.2M24.7 20l-.1 .2M29.6 11.1l.3 0M6.4 12.2l.2 -.5M132.7 30.2l-.5 .2M18 -1.5l-.2 0M24.2 8.6l0 .5M115.6 27.4l.1 -.4M144.1 27l-.3 0M5.8 30.4l.1 .5M27.9 11l-.7 -.1M55.6 18.5l.4 -.2M49.9 32.1l-.1 .7M109.4 1.8l.7 -.2M116.2 17.3l.4 0M51.3 8.6l.5 .3M149.1 41.3l-.1 .5M75.9 39.2l.6 .1M42.8 32.4l0 .4" fill="none" stroke="#000" strokeWidth=".65" strokeLinecap="round"></path>
                                <path d="M101.9 -5l0 -1.5M28.2 36l1.4 .5M155.2 26.3l.2 .7M3.3 41.2l.2 -.4M85.6 1.9l-.7 -.2M78.3 16.1l-.5 .8M44.9 27.1l0 .6M20.2 12.4l-1 -.7M12.4 32.6l.8 -.4M126 45.4l.1 -.8M92.4 6.4l-.8 -.2M51 14.2l-1 -1.2M159.1 36.2l1.1 .7M155.2 34.9l.8 .6M62.8 4.8l0 .4M118.1 34.8l.8 -1.2M105.4 35.8l-.3 -.6M101.7 40.4l-.6 -1M29.1 40.4l1.2 -.3M30.6 34.3l-1.4 -.4M16.3 5.4l-1 .9M82 8.7l-1.2 -.5M139.1 -4.4l-.9 1M63.5 42.7l-.1 -1.3M69.3 35.3l1.1 .9M103 36.5l-.4 .1M113.1 -.7l.8 -.2M19.6 32.9l1.4 .3M54.7 29.9l-.4 -.2M117.9 31l.8 -.7M14.9 13.7l-.4 -.1M72.8 16l.6 1.1M71.9 -4.5l-.5 1M117.9 33.1l-.9 -.4M2.3 26.7l-.2 -.9M104.6 40.1l.9 -.3M82.7 8.3l-.9 .1M141 52.7l-.9 -1M152.8 46l-1 -.8M47.5 22.5l-.6 -.5" fill="none" stroke="#000" strokeWidth="1.1" strokeLinecap="round"></path>
                              </mask>
                            </defs>
                            <g mask="url(#pk-cine-wear)">
                              <rect className="pk-cine-stampline" x="1.7" y="1.7" width="152.6" height="44.6" rx="6.9" strokeWidth="3.4"></rect>
                              <rect className="pk-cine-stampline" x="-3.4" y="-3.4" width="162.8" height="54.8" rx="11.6" strokeWidth="1.7"></rect>
                              <text className="pk-cine-stampword" x="79.3" y="24" textAnchor="middle" dominantBaseline="central" fontFamily="Anton,sans-serif" fontSize="30" letterSpacing="2.7">SOLD OUT</text>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </span>
                  </span>
                  {' '}
                  <i className="pk-cine-fleck pk-cine-f1"></i>
                  <i className="pk-cine-fleck pk-cine-f2"></i>
                  <i className="pk-cine-fleck pk-cine-f3"></i>
                  {v.falls.map((f: any, fIndex: number) => (
                    <span key={fIndex} className={`pk-cine-stub pk-cine-is-fall ${f.cls}`}>
                      <svg className="pk-cine-tk" viewBox="0 0 300 164">
                        <use href="#pk-cine-stubface"></use>
                        <text className="pk-cine-lab-a" x="0" y="0" transform="translate(250 82) rotate(90)" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="17.5" letterSpacing="3.5" dominantBaseline="central" fill="#14100a">ADMIT ONE</text>
                        <text className="pk-cine-lab-b" x="0" y="0" transform="translate(250 82) rotate(90)" textAnchor="middle" fontFamily="Anton,sans-serif" fontSize="27" letterSpacing="3.5" dominantBaseline="central" fill="#14100a">ENCORE</text>
                      </svg>
                      <span className="pk-cine-seatno">SEAT {f.seat}</span>
                    </span>
                  ))}
                </span>
              </span>
            </span>
            {' '}
            <span className="pk-cine-hintrow">
              <span className="pk-cine-hint">
                <span className="pk-cine-marks" aria-hidden="true">
                  {v.marksA.map((m: any, mIndex: number) => (
                    <svg key={mIndex} className={`pk-cine-mark ${m.cls}`} viewBox="0 0 8 11">
                      <use href="#pk-cine-stubmark"></use>
                    </svg>
                  ))}
                </span>
                {' '}
                <span className={`pk-cine-hinttext ${v.hintClass}`}>
                  <span className="pk-cine-hta">TEAR THE TICKET</span>
                  <span className="pk-cine-htb">LAST SEAT</span>
                </span>
                {' '}
                <span className="pk-cine-marks" aria-hidden="true">
                  {v.marksB.map((m: any, mIndex: number) => (
                    <svg key={mIndex} className={`pk-cine-mark ${m.cls}`} viewBox="0 0 8 11">
                      <use href="#pk-cine-stubmark"></use>
                    </svg>
                  ))}
                </span>
              </span>
              {' '}
              <span className="pk-cine-house">FULL HOUSE</span>
            </span>
          </button>
          <div className="pk-cine-bulbs" aria-hidden="true" style={{ '--chase': v.chase } as React.CSSProperties}>
            <i className="pk-cine-flash"></i>
            {v.bulbs.map((b: any, bIndex: number) => (
              <i key={bIndex} className="pk-cine-bulb" style={{ '--i': b.i } as React.CSSProperties}></i>
            ))}
          </div>
          <h1 className="pk-cine-brand">OWN THE <span className="pk-cine-gold">SCREENS</span></h1>
          <div className="pk-cine-kicker">Your Cinema Chain</div>
          <div className="pk-cine-soon">
            <i className="pk-cine-dot" aria-hidden="true"></i>
            {' '}
            <i className="pk-cine-dot pk-cine-is-d2" aria-hidden="true"></i>
            <div className="pk-cine-soontext">COMING SOON<span className="pk-cine-shine" aria-hidden="true"><span className="pk-cine-shine-in">COMING SOON</span></span></div>
            <i className="pk-cine-dot pk-cine-is-d3" aria-hidden="true"></i>
            {' '}
            <i className="pk-cine-dot" aria-hidden="true"></i>
          </div>
        </div>
        <span className="pk-cine-gap pk-cine-is-air" aria-hidden="true"></span>
        <p className="pk-cine-pitch">Stop premiering in other people's theaters. <b>Build your own cinema chain</b>, sell out opening night, and keep every dollar of the <span className="pk-cine-g">box office</span>.</p>
        <span className="pk-cine-gap" aria-hidden="true"></span>
        <div className="pk-cine-board">
          <i className="pk-cine-glow" aria-hidden="true" style={{ '--lit': v.glow } as React.CSSProperties}></i>
          <div className="pk-cine-plate">NOW SHOWING</div>
          <ul className="pk-cine-slots" aria-live="polite">
            {v.lines.map((line: any, lineIndex: number) => (
              <li key={lineIndex} className={`pk-cine-slot ${line.cls}`}>
                <span className="pk-cine-ghost" aria-hidden="true">
                  <i className="pk-cine-pre"></i>
                </span>
                {line.lit ? (
                  <>
                    <i className="pk-cine-lamp" aria-hidden="true"></i>
                    {' '}
                    <i className="pk-cine-ring" aria-hidden="true"></i>
                    {' '}
                    <span className="pk-cine-clip" style={{ '--n': line.n } as React.CSSProperties}>
                      <span className="pk-cine-line" style={{ '--n': line.n } as React.CSSProperties}>{line.text}</span>
                    </span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          <i className="pk-cine-surge" aria-hidden="true"></i>
        </div>
        <span className="pk-cine-gap pk-cine-is-tie" aria-hidden="true"></span>
        <div className="pk-cine-tickerzone" data-bleed="1">
          <div className="pk-cine-ticker">
            {v.ticker.map((t: any, tIndex: number) => (
              <div key={tIndex} className="pk-cine-pill" aria-hidden={t.hidden}> <svg className="pk-cine-ic" viewBox="0 0 24 24" aria-hidden="true"><use href={t.icon}></use></svg> {t.text} </div>
            ))}
          </div>
        </div>
        <span className="pk-cine-gap pk-cine-is-tie" aria-hidden="true"></span>
        <div className="pk-cine-ctazone">
          <button className="pk-cine-notify" type="button" data-cta="1" onClick={v.notify}>
            {v.doneShown ? (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 12.5 10 18 20 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                You're on the guest list
              </>
            ) : null}
            {v.notDone ? (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <use href="#pk-cine-i-ticket"></use>
                </svg>
                Notify me on release
              </>
            ) : null}
            <i className="pk-cine-burst" aria-hidden="true"></i>
            <i className="pk-cine-burstring" aria-hidden="true"></i>
          </button>
          <div className="pk-cine-note">Arriving in a future update</div>
        </div>
      </div>
      <div className="pk-cine-grain" aria-hidden="true"></div>
    </div>
  );
}
