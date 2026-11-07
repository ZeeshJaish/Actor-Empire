import React, { Fragment, useEffect, useRef } from 'react';
import { nameFit, packName, packShortName } from './packName';
import { usePackSounds, type PackMusic, type PackSoundFiles } from './packAudio';
import PackSoundToggle from './PackSoundToggle';
import { useMergedState } from './useMergedState';
import '../../styles/packs/pack-blackout.css';

const VPX = 187.5, VPY = 150, HW = 89, TOP = -46, BOT = 126, SM = 5.6;
const n1 = v => Number(v.toFixed(2));
const wall = (sd, s, h) => [VPX + sd * HW * s, VPY + (TOP + (BOT - TOP) * h) * s];
const ceil = (s, w) => [VPX + HW * w * s, VPY + TOP * s];
const flr = (s, w) => [VPX + HW * w * s, VPY + BOT * s];
const pts = a => a.map(q => n1(q[0]) + ',' + n1(q[1])).join(' ');
const qW = (sd, a, b, h1, h2) => pts([wall(sd, a, h1), wall(sd, b, h1), wall(sd, b, h2), wall(sd, a, h2)]);
const qC = (a, b, w1, w2) => pts([ceil(a, w1), ceil(a, w2), ceil(b, w2), ceil(b, w1)]);
const qF = (a, b, w1, w2) => pts([flr(a, w1), flr(a, w2), flr(b, w2), flr(b, w1)]);
const Q = (p, f, o) => ({ p, f, o: String(o) });
const toD = p => 'M' + p.replace(/ /g, 'L') + 'Z';
const circleD = (x, y, r) => 'M' + n1(x - r) + ' ' + n1(y) + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0Z';
/* neighbours that share a fill become one path, so the set stays light in a phone WebView */
const merge = list => list.reduce((out, q) => { const last = out[out.length - 1]; if (last && last.f === q.f && last.o === q.o) last.d += toD(q.p); else out.push({ d: toD(q.p), f: q.f, o: q.o }); return out; }, []);
/* same, for pieces that never overlap: grouped by fill in first-seen order */
const bucket = list => [...list.reduce((m, q) => { const k = q.f + q.o; if (m.has(k)) m.get(k).d += toD(q.p); else m.set(k, { d: toD(q.p), f: q.f, o: q.o }); return m; }, new Map()).values()];

const P1 = 1.18, P2 = 1.82, P3 = 2.3;
const wallPieces = sd => {
  const CORR = [];
  CORR.push(Q(qW(sd, 1, SM, .64, 1), '#020c07', .3));
  CORR.push(Q(qW(sd, 1, SM, .6, .625), '#8ad2aa', .26));
  CORR.push(Q(qW(sd, 1, SM, .625, .64), '#020c07', .55));
  CORR.push(Q(qW(sd, 1, SM, .33, .334), '#020c07', .55));
  [[.055, .095, .11], [.125, .15, .165]].forEach(([a, b, c], i) => {
    CORR.push(Q(qW(sd, 1, SM, b, c), '#020c07', .36));
    CORR.push(Q(qW(sd, 1, SM, a, b), i ? '#20503a' : '#2b6248', .92));
    CORR.push(Q(qW(sd, 1, SM, a, a + (b - a) * .26), '#c6f7d6', i ? .4 : .55));
    CORR.push(Q(qW(sd, 1, SM, b - (b - a) * .3, b), '#06170f', .9));
  });
  [1.3, 1.44, 1.84].forEach(s => CORR.push(Q(qW(sd, s, s * 1.008, .165, .99), '#020c07', .6)));
  [1.25, 1.38, 1.76, 1.9].forEach((s, i) => CORR.push(Q(qW(sd, s, s * 1.05, .17, .6), '#020c07', [.16, .1, .14, .08][i])));
  CORR.push(Q(qW(sd, 1, SM, -.006, .008), '#020a06', .85));
  CORR.push(Q(qW(sd, 1, SM, .99, 1.006), '#020a06', .9));
  CORR.push(Q(qC(1, SM, sd * .62, sd * .78), '#0a2418', .75));
  CORR.push(Q(qF(1, SM, sd * .9, sd * 1), '#020a06', .55));
  return CORR;
};
const WALL_L = wallPieces(-1), WALL_R = wallPieces(1);
const CORR = WALL_L.flatMap((q, i) => [q, WALL_R[i]]);
CORR.push(Q(qW(-1, 1.26, 1.37, .36, .47), '#2f6a4c', 1));
CORR.push(Q(qW(-1, 1.26, 1.37, .36, .372), '#cfffe0', .55));
CORR.push(Q(qW(-1, 1.26, 1.37, .47, .49), '#020c07', .5));
CORR.push(Q(qW(-1, 1.305, 1.325, .165, .36), '#123023', .95));
CORR.push(Q(qW(1, 1.24, 1.34, .5, .6), '#2f6a4c', 1));
CORR.push(Q(qW(1, 1.24, 1.34, .5, .512), '#cfffe0', .55));
CORR.push(Q(qW(1, 1.24, 1.34, .6, .62), '#020c07', .5));
CORR.push(Q(qC(1, SM, -.5, -.46), '#061a10', .7));
CORR.push(Q(qC(1, SM, .46, .5), '#061a10', .7));
[1.2, 1.66].forEach(s => CORR.push(Q(qC(s, s * 1.03, -1, 1), '#04120b', .5)));
[[1.2, 1.76], [2.1, 2.8], [3.2, 4.6]].forEach(([a, b]) => CORR.push(Q(qC(a, b, -.14, .14), '#06170f', 1)));
CORR.push(Q(qF(1, 3.1, -.17, .17), 'url(#pk-blk-refl)', .34));
CORR.push(Q(qF(1, 3.1, -.06, .06), 'url(#pk-blk-refl)', .75));
[-.75, -.5, -.25, 0, .25, .5, .75].forEach(w => CORR.push(Q(qF(1, 3.4, w - .004, w + .004), 'url(#pk-blk-grid)', 1)));
[1.1, 1.22, 1.36, 1.52, 1.72, 1.97, 2.3, 2.72, 3.25].forEach(s => CORR.push(Q(qF(s, s * 1.006, -1, 1), 'url(#pk-blk-grid)', 1)));
for (let i = 0; i < 15; i++) { const w = -.84 + i * .12; CORR.push(Q(pts([flr(1.06, w), flr(1.06, w + .06), flr(1.15, w + .1), flr(1.15, w + .04)]), '#cfffe0', .17)); }
CORR.push(Q(qF(1, 1.055, -1, 1), '#020a06', .5));
CORR.push(Q(qF(1.055, 1.06, -.9, .9), '#cfffe0', .35));

/* a portal: front face, the jamb's lit inner edge, the header's underside */
const portal = (out, s, pw, ph, d, jf, ji, hf, hu) => {
  const s2 = s * d, ix = (sd, k) => VPX + sd * (HW - pw) * k, oy = k => VPY + TOP * k, hy = k => VPY + (TOP + ph) * k, by = k => VPY + BOT * k;
  const both = fn => [-1, 1].forEach(sd => out.push(fn(sd)));
  both(sd => Q(pts([[ix(sd, s), hy(s)], [ix(sd, s2), hy(s2)], [ix(sd, s2), by(s2)], [ix(sd, s), by(s)]]), ji, 1));
  both(sd => Q(pts([[VPX + sd * HW * s, oy(s)], [ix(sd, s), oy(s)], [ix(sd, s), by(s)], [VPX + sd * HW * s, by(s)]]), jf, 1));
  both(sd => Q(pts([[ix(sd, s) - sd * .7, hy(s)], [ix(sd, s), hy(s)], [ix(sd, s), by(s)], [ix(sd, s) - sd * .7, by(s)]]), '#d9ffe5', .3));
  out.push(Q(pts([[ix(-1, s), hy(s)], [ix(1, s), hy(s)], [ix(1, s2), hy(s2)], [ix(-1, s2), hy(s2)]]), hu, 1));
  out.push(Q(pts([[VPX - HW * s, oy(s)], [VPX + HW * s, oy(s)], [VPX + HW * s, hy(s)], [VPX - HW * s, hy(s)]]), hf, 1));
};
portal(CORR, P1, 7, 4.5, .95, 'url(#pk-blk-p1j)', 'url(#pk-blk-p1i)', 'url(#pk-blk-p1h)', '#123023');
const NEAR = [];
portal(NEAR, P2, 8, 5, .945, 'url(#pk-blk-p2j)', 'url(#pk-blk-p2i)', 'url(#pk-blk-p2h)', '#16392a');
portal(NEAR, P3, 8, 5, .945, 'url(#pk-blk-p3j)', 'url(#pk-blk-p3i)', '#030d08', '#0c2418');
NEAR.push(Q(pts([[-110, -90], [485, -90], [485, VPY + (TOP + 2) * P3], [-110, VPY + (TOP + 2) * P3]]), '#030d08', .92));
const rivets = (k, pw, y1, y2, gap, w, hi, lo) => [-1, 1].flatMap(sd => {
  const x = n1(VPX + sd * (HW - pw * .5) * k), dash = '.01 ' + (gap - .01), split = y1 + Math.floor((170 - y1) / gap) * gap;
  return [{ x, y1, y2: split, dash, w, c: hi }, { x, y1: split + gap, y2, dash, w, c: lo }];
});
const RIVETS_FAR = rivets(P1, 7, 104, 281, 16, 1.5, '#b9ecd0', '#5aa880');
const RIVETS_NEAR = rivets(P2, 8, 81, 280, 22, 2, '#3f7a5e', '#16392a');

const TUBES = [
  Q(qC(1.19, 1.82, -.72, .72), '#9dffb4', .07),
  Q(qC(1.19, 1.8, -.4, .4), '#b9ffcb', .13),
  Q(qC(1.2, 1.76, -.2, .2), '#d9ffe5', .3),
  Q(qC(1.23, 1.72, -.105, .105), '#fbfffc', 1),
];
const beam = (x1, y1, x2, y2, w) => {
  const sl = (VPX - x1) / HW, sr = (x2 - VPX) / HW;
  return { x1, y1, x2, y2, w, sl, sr, hl: ((y1 - VPY) / sl - TOP) / (BOT - TOP), hr: ((y2 - VPY) / sr - TOP) / (BOT - TOP), L: Math.hypot(x2 - x1, y2 - y1), a: Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI };
};
const BEAMS = [
  beam(24, 248, 361, 282, 1.05),
  beam(26, 296, 349, 252, 1),
  beam(55, 176, 320, 250, .95),
  beam(65, 262, 305, 196, .92),
  beam(75, 128, 297, 196, .88),
  beam(92, 226, 283, 178, .84),
  beam(94.5, 150, 280.5, 226, .8),
  beam(97, 188.6, 278, 191, .78),
];
const EMITTERS = BEAMS.flatMap(b => [[-1, b.sl, b.hl], [1, b.sr, b.hr]]);
EMITTERS.forEach(([sd, s, h]) => CORR.push(Q(qW(sd, s * .978, s * 1.022, h - .017, h + .017), '#123023', 1)));
EMITTERS.forEach(([sd, s, h]) => CORR.push(Q(qW(sd, s * .978, s * 1.022, h - .017, h - .009), '#cfffe0', .42)));
EMITTERS.forEach(([sd, s, h]) => CORR.push(Q(qW(sd, s * .978, s * 1.022, h + .011, h + .03), '#020c07', .5)));

const bolt = (cx, cy, r, a) => { const t = a * Math.PI / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
const VAULTQ = [];
const iw = (sd, s, k) => [VPX + sd * 38 * s, VPY + (-16 + 72 * k) * s];
[-1, 1].forEach(sd => {
  [[1.04, 1.16], [1.19, 1.32], [1.35, 1.5], [1.53, 1.7], [1.73, 1.94]].forEach(([a, b], c) => {
    [0, 1, 2, 3, 4].forEach(r => {
      const k1 = .04 + r * .18, k2 = k1 + .155;
      VAULTQ.push(Q(pts([iw(sd, a, k1), iw(sd, b, k1), iw(sd, b, k2), iw(sd, a, k2)]), '#051710', .94));
      VAULTQ.push(Q(pts([iw(sd, a, k2), iw(sd, b, k2), iw(sd, b, k2 + .012), iw(sd, a, k2 + .012)]), '#c6f7d6', .5));
      if ((c * 3 + r * 2 + (sd > 0 ? 1 : 0)) % 7 === 0) VAULTQ.push(Q(pts([iw(sd, a, k1), iw(sd, a + (b - a) * .32, k1 - .012), iw(sd, a + (b - a) * .32, k2 + .012), iw(sd, a, k2)]), '#7ad79c', .86));
    });
  });
});
VAULTQ.push(Q(pts([iw(-1, 1, 0), iw(1, 1, 0), iw(1, 2.4, 0), iw(-1, 2.4, 0)]), '#123a27', 1));
VAULTQ.push(Q(pts([[VPX - 14.25, 130], [VPX + 14.25, 130], [VPX + 21, 121], [VPX - 21, 121]]), '#f6fff9', 1));

const SPILL_F = pts([flr(1, -1), flr(1, 1), flr(3.4, 1), flr(3.4, -1)]);

const ring = (n, cx, cy, r, from, gap) => Array.from({ length: n }, (_, i) => bolt(cx, cy, r, from + i * gap));
const DOOR_BOLTS = ring(16, 144, 144, 124.5, 11.25, 22.5);
const BOLT_STREAKS = DOOR_BOLTS.map(([x, y], i) => 'M' + n1(x - 1.5) + ' ' + n1(y) + 'h3v' + n1(9 + (i * 7 % 5) * 2.4) + 'h-3Z').join('');
const BOLT_HEX = DOOR_BOLTS.map(([x, y]) => toD(Array.from({ length: 6 }, (_, k) => { const a = (k * 60 + 15) * Math.PI / 180; return n1(x + 3.1 * Math.cos(a)) + ',' + n1(y + 3.1 * Math.sin(a)); }).join(' '))).join('');
const LAMPS = ring(8, 144, 144, 92, -31.5, 9).map(([x, y]) => ({ x: n1(x), y: n1(y) }));
const LAMP_SOCKETS = LAMPS.map(l => circleD(l.x, l.y, 3.9)).join('');
const radial = (a, list) => list.map(([r, off]) => { const t = a * Math.PI / 180; return n1(144 + r * Math.sin(t) + off * Math.cos(t)) + ',' + n1(144 - r * Math.cos(t) + off * Math.sin(t)); }).join(' ');
const SPOKES = Array.from({ length: 5 }, (_, i) => toD(radial(i * 72, [[13, -7.2], [48, -4.4], [48, 4.4], [13, 7.2]]))).join('');
const GRIPS = ring(5, 144, 144, 48, 0, 72).map(([x, y]) => ({ x: n1(x), y: n1(y) }));
const GRIP_SHADOW = GRIPS.map(g => circleD(g.x, g.y + 1.6, 7)).join('');
const ARMS_BAR = Array.from({ length: 10 }, (_, i) => toD(radial(i * 36 + 18, [[30, -5], [120, -5], [120, 5], [30, 5]]))).join('');
const ARMS_HEAD = Array.from({ length: 10 }, (_, i) => toD(radial(i * 36 + 18, [[112, -11], [132, -11], [132, 11], [112, 11]]))).join('');
const FACETS = Array.from({ length: 28 }, (_, i) => {
  const a = i * 360 / 28;
  const lit = .12 + .88 * Math.pow(Math.max(0, Math.cos(a * Math.PI / 180)), 1.4);
  const c = v => 'rgb(' + Math.round(v * .66) + ',' + v + ',' + Math.round(v * .76) + ')';
  const base = c(Math.round(46 + lit * 120)), dark = c(Math.round(20 + lit * 44));
  const pin = i % 2 ? 'radial-gradient(circle at 50% 50%,' + c(Math.round(150 + lit * 100)) + ' 0,' + c(Math.round(84 + lit * 110)) + ' 24%,#020a06 30%,#020a06 33%,rgba(0,0,0,0) 35%),' : '';
  return { a: a + 'deg', c: pin + 'linear-gradient(180deg,' + dark + ',' + base + ' 26%,' + base + ' 46%,' + dark + ' 49%,' + dark + ' 51%,' + base + ' 54%,' + base + ' 74%,' + dark + ')' };
});
const SPARKS = [[-42, 7, 16], [-14, 9, 22], [8, 8, 19], [34, 6, 15], [62, 5, 12], [-70, 5, 12], [20, 4, 26]].map(([a, w, l], i) => ({ a: a + 'deg', w: String(w), l: l + 'px', f: i % 2 ? '#ffffff' : '#ff8a80' }));
const RAYS = Array.from({ length: 10 }, (_, i) => ({ a: i * 36 + 12 + 'deg' }));
const CORR_PATHS = merge(CORR), NEAR_PATHS = merge(NEAR), TUBE_PATHS = merge(TUBES), VAULT_PATHS = bucket(VAULTQ);
const DOOR_BOLT_XY = DOOR_BOLTS.map(([x, y]) => ({ x: n1(x), y: n1(y) }));

// What a name takes up on the small name spots: a full-width character (Han, Kana, Hangul) or an emoji fills two columns.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{20000}-\u{3fffd}]|\p{ExtPict}|\p{RI}/u;
const cols = (text: string) => Array.from(text).reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0);
const cutToCols = (text: string, room: number) => {
  let out = '';
  for (const ch of Array.from(text)) {
    if (cols(out + ch) > room) break;
    out += ch;
  }
  return out;
};


interface BlackoutJobPackScreenProps {
  playerName: string;
  onBack: () => void;
}

/* rendered by scripts/audio/render-pack-sounds.mjs. final.m4a is cut to this page's own clock: the timers below and the door's animation in pack-blackout.css */
const BLACKOUT_SOUNDS: PackSoundFiles = {
  tap: () => new URL('../../assets/audio/packs/blackout/tap.m4a', import.meta.url).href,
  final: () => new URL('../../assets/audio/packs/blackout/final.m4a', import.meta.url).href,
  notify: () => new URL('../../assets/audio/packs/blackout/notify.m4a', import.meta.url).href,
  click: () => new URL('../../assets/audio/packs/blackout/click.m4a', import.meta.url).href,
};
/* the loop points are printed by scripts/audio/render-pack-sounds.mjs: exactly 20 s apart, inside the part of the file that repeats */
const BLACKOUT_MUSIC: PackMusic = {
  url: () => new URL('../../assets/audio/packs/blackout/music.m4a', import.meta.url).href,
  loopStart: 10.037052,
  loopEnd: 30.037052,
};

export default function BlackoutJobPackScreen({ playerName, onBack }: BlackoutJobPackScreenProps) {
  const [state, set, latest] = useMergedState({ step: 0, dead: false, opened: false, card: false, settle: 0, burst: false, notified: false });
  const tDead = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tOpen = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tBurst = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tDone = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { [tDead, tOpen, tBurst, tDone].forEach(timer => clearTimeout(timer.current)); }, []);
  const { play, soundOn, toggleSound, duckMusic, restoreMusic } = usePackSounds(BLACKOUT_SOUNDS, BLACKOUT_MUSIC);

  const buzz = (p: number | number[]) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  const cut = () => {
    const { step, opened, card, settle } = latest.current;
    if (step < 8) {
      const next = step + 1;
      buzz(next === 8 ? [14, 70, 30] : 10);
      /* no two cuts alike, and the tension climbs with each */
      if (next === 8) { play('final'); duckMusic(); }
      else play('tap', { rate: 1 + next * .016 + (Math.random() - .5) * .03 });
      set({ step: next });
      if (next === 8) {
        tDead.current = setTimeout(() => set({ dead: true }), 460);
        tOpen.current = setTimeout(() => { set({ opened: true }); restoreMusic(); }, 1500);
      }
      return;
    }
    if (opened) { buzz(8); set({ card: !card, settle: settle + 1 }); }
  };
  const notify = () => {
    if (latest.current.notified || latest.current.burst) return;
    buzz(20);
    play('notify');
    set({ burst: true });
    tDone.current = setTimeout(() => set({ notified: true }), 170);
    tBurst.current = setTimeout(() => set({ burst: false }), 800);
  };

  const { step, dead, opened, card, settle, burst, notified } = state;
  const final = step >= 8;
  /* the push-in dips as it advances, so the ceiling strip, the only light, stays out from behind the top bar */
  const zoom = card ? 4.6 : final ? 1.2 : 1 + step * .02;
  const next = BEAMS[Math.min(step, 7)];
  const last = BEAMS[Math.max(step - 1, 0)];
  const hit = settle ? 'hit-' + (settle % 2) : step ? 'hit-' + (step % 2) : '';
  const fullName = packName(playerName);
  const plainName = fullName.replace(/ (JR\.?|SR\.?|II|III|IV|V)$/, '');
  // The calling card signs at any length: past 18 columns the short form (a suffix is not a surname), and past 10 the signature shrinks to stay on the card. The feed tag is the last word.
  const cardName = cols(fullName) <= 18 ? fullName : cutToCols(packShortName(plainName, 18), 18);
  const cardFit = nameFit('x'.repeat(cols(cardName)), 10);
  const v = {
    rootClass: [hit, final ? 'is-final' : '', dead ? 'is-dead' : '', step >= 5 ? 'is-camdead' : '', opened ? 'is-open' : '', card ? 'is-card' : '', settle ? 'is-settled' : '', burst ? 'is-burst' : ''].join(' '),
    zoom: String(zoom), nearZoom: String(final ? 1.11 : 1 + step * .013), wheel: Math.min(step, 7) * 8 + 'deg', ty: card ? '-14' : final ? '0' : String(step * 1.5),
    dim: String(final ? 0 : step * .035), redk: String((8 - step) / 8),
    rx: final ? '188' : n1(next.x1 + 0), ry: final ? '193' : n1(next.y1 + 0),
    cut, notify,
    heroLabel: card ? 'Pull back from the calling card' : final ? 'Zoom in on the calling card' : 'Cut the next laser',
    hint: !dead ? 'CUT THE LASERS' : !opened ? 'POWER LOST' : card ? 'PULL BACK' : 'READ THE CARD',
    corr: CORR_PATHS, near: NEAR_PATHS, tubes: TUBE_PATHS, vaultq: VAULT_PATHS, rivetsFar: RIVETS_FAR, rivetsNear: RIVETS_NEAR, spillF: SPILL_F, doorBolts: DOOR_BOLT_XY, boltStreaks: BOLT_STREAKS, boltHex: BOLT_HEX, lampSockets: LAMP_SOCKETS, spokes: SPOKES, grips: GRIPS, gripShadow: GRIP_SHADOW, armsBar: ARMS_BAR, armsHead: ARMS_HEAD, facets: FACETS, sparks: SPARKS, rays: RAYS,
    beams: BEAMS.map((b, i) => ({
      cls: i < step ? 'is-cut' : '', i: String(i), tf: 'translate(' + n1(b.x1) + ' ' + n1(b.y1) + ') rotate(' + n1(b.a) + ')', tr: 'translate(' + n1(b.L) + ' 0)',
      l: n1(b.L), h: n1(b.L / 2 + .3), nh: n1(-b.L / 2 - .3), gy: n1(-b.w * 2.8), gh: n1(b.w * 5.6), cy: n1(-b.w * .42), ch: n1(b.w * .84), wy: n1(-b.w * .15), wh: n1(b.w * .3), fy: n1(-b.w * .85), fh: n1(b.w * 1.7), sw: n1(b.w * .52),
    })),
    leds: BEAMS.flatMap((b, i) => [
      { x: n1(b.x1), y: n1(b.y1), r: n1(2.5 * b.w + 1.1), cls: i < step ? 'is-cut' : '' },
      { x: n1(b.x2), y: n1(b.y2), r: n1(2.2 * b.w + 1), cls: i < step ? 'is-cut' : '' },
    ]),
    sparkA: 'translate(' + n1(last.x1) + ' ' + n1(last.y1) + ') scale(' + n1(.45 + last.sl * .45) + ')',
    sparkB: 'translate(' + n1(last.x2) + ' ' + n1(last.y2) + ') scale(' + n1(.45 + last.sr * .45) + ')',
    lamps: LAMPS.map((l, i) => ({ ...l, cls: i < step ? 'is-on' : '' })),
    pips: Array.from({ length: 8 }, (_, i) => ({ cls: i < step ? 'is-off' : '' })),
    s1: 0 < step ? 'is-lit' : '', s2: 1 < step ? 'is-lit' : '', s3: 2 < step ? 'is-lit' : '', s4: 3 < step ? 'is-lit' : '', s5: 4 < step ? 'is-lit' : '', s6: 5 < step ? 'is-lit' : '', s7: 6 < step ? 'is-lit' : '', s8: 7 < step ? 'is-lit' : '',
    notified, notNotified: !notified,
    ctaClass: notified ? 'is-done' : '',
    ctaLabel: notified ? "You're on the crew" : opened ? 'Count me in' : 'Notify me on release',
    cardName, cardSize: n1(2.1 * cardFit), cardSpacing: n1(.24 * cardFit),
    insetName: cutToCols(packShortName(plainName, 5), 10),
  };
  return (
    <div className={`pk-blk-root ${v.rootClass}`} style={{ '--z': v.zoom, '--nz': v.nearZoom, '--wh': v.wheel, '--ty': v.ty, '--dim': v.dim, '--rx': v.rx, '--ry': v.ry, '--redk': v.redk } as React.CSSProperties}>
      <div className="pk-blk-page">
        <div className="pk-blk-top">
          <button type="button" className="pk-blk-back" onClick={() => { play('click'); onBack(); }}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M9.8 3.4L5.2 8l4.6 4.6" fill="none" stroke="#7dff9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span>Back</span>
          </button>
          <PackSoundToggle on={soundOn} onToggle={toggleSound} className={`pk-blk-snd ${soundOn ? '' : 'is-off'}`} />
          <div className="pk-blk-chip">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.4 5.2V3.8a2.6 2.6 0 0 1 5.2 0v1.4" fill="none" stroke="#7dff9a" strokeWidth="1.3"></path>
              <rect x="2.2" y="5.1" width="7.6" height="5.6" rx="1.2" fill="#7dff9a"></rect>
            </svg>
            <span>Future update</span>
          </div>
        </div>
        <div className="pk-blk-hero">
          <button className="pk-blk-tap" type="button" data-reveal="1" onClick={v.cut} aria-label={v.heroLabel}></button>
          <div className="pk-blk-anchor" aria-hidden="true">
            <div className="pk-blk-boot">
              <div className="pk-blk-world">
                <div className="pk-blk-walls"></div>
                <svg className="pk-blk-lay pk-blk-corr" viewBox="-110 -90 595 650">
                  <defs>
                    <linearGradient id="pk-blk-farv" x1="0" y1="104" x2="0" y2="276" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#1f4c35"></stop>
                      <stop offset=".14" stopColor="#3d7f5b"></stop>
                      <stop offset=".46" stopColor="#27593f"></stop>
                      <stop offset="1" stopColor="#0d2819"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-grid" x1="0" y1="276" x2="0" y2="520" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#9dffb4" stopOpacity=".4"></stop>
                      <stop offset=".5" stopColor="#7dff9a" stopOpacity=".15"></stop>
                      <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-refl" x1="0" y1="276" x2="0" y2="470" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#cfffe0" stopOpacity=".5"></stop>
                      <stop offset=".5" stopColor="#9dffb4" stopOpacity=".16"></stop>
                      <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-p1j" x1="0" y1="95" x2="0" y2="300" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#6ab48d"></stop>
                      <stop offset=".3" stopColor="#2b5f47"></stop>
                      <stop offset="1" stopColor="#0a2016"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-p1i" x1="0" y1="100" x2="0" y2="290" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#2c6a4b"></stop>
                      <stop offset="1" stopColor="#0c2418"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-p1h" x1="82" y1="0" x2="293" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#1c4634"></stop>
                      <stop offset=".5" stopColor="#5fa983"></stop>
                      <stop offset="1" stopColor="#1c4634"></stop>
                    </linearGradient>
                    <radialGradient id="pk-blk-cshadow" cx=".5" cy=".5" r=".5">
                      <stop offset=".78" stopColor="#010604" stopOpacity=".78"></stop>
                      <stop offset="1" stopColor="#010604" stopOpacity="0"></stop>
                    </radialGradient>
                  </defs>
                  <rect x="98.5" y="104" width="178" height="172" fill="url(#pk-blk-farv)"></rect>
                  <rect x="98.5" y="104" width="178" height="7" fill="#020a06" opacity=".62"></rect>
                  <rect x="98.5" y="104" width="3" height="172" fill="#020a06" opacity=".45"></rect>
                  <rect x="273.5" y="104" width="3" height="172" fill="#020a06" opacity=".45"></rect>
                  <circle cx="187.5" cy="196" r="92" fill="url(#pk-blk-cshadow)"></circle>
                  {v.corr.map((q: any, qIndex: number) => (
                    <path key={qIndex} d={q.d} fill={q.f} opacity={q.o}></path>
                  ))}
                  {v.rivetsFar.map((v: any, vIndex: number) => (
                    <line key={vIndex} x1={v.x} y1={v.y1} x2={v.x} y2={v.y2} stroke={v.c} strokeWidth={v.w} strokeLinecap="round" strokeDasharray={v.dash}></line>
                  ))}
                </svg>
                <div className="pk-blk-tex"></div>
                <div className="pk-blk-falloff"></div>
                <svg className="pk-blk-lay pk-blk-tubes" viewBox="-110 -90 595 650">
                  {v.tubes.map((q: any, qIndex: number) => (
                    <path key={qIndex} d={q.d} fill={q.f} opacity={q.o}></path>
                  ))}
                </svg>
                <svg className="pk-blk-lay pk-blk-vault" viewBox="-110 -90 595 650">
                  <defs>
                    <clipPath id="pk-blk-open">
                      <circle cx="187.5" cy="186.4" r="66.6"></circle>
                    </clipPath>
                    <radialGradient id="pk-blk-backw" gradientUnits="userSpaceOnUse" cx="187.5" cy="146" r="66">
                      <stop offset="0" stopColor="#a6edc1"></stop>
                      <stop offset=".46" stopColor="#4aa873"></stop>
                      <stop offset="1" stopColor="#174a31"></stop>
                    </radialGradient>
                    <linearGradient id="pk-blk-vflr" x1="0" y1="206" x2="0" y2="256" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#83dfa5"></stop>
                      <stop offset=".5" stopColor="#3f9d69"></stop>
                      <stop offset="1" stopColor="#143f2a"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-vl" x1="150" y1="0" x2="118" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#2f8759"></stop>
                      <stop offset="1" stopColor="#0e2f1f"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-vr" x1="225" y1="0" x2="257" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#2f8759"></stop>
                      <stop offset="1" stopColor="#0e2f1f"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-cone" x1="0" y1="130" x2="0" y2="206" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#f0fff5" stopOpacity=".42"></stop>
                      <stop offset="1" stopColor="#f0fff5" stopOpacity=".05"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-plf" x1="0" y1="205" x2="0" y2="244" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#2c6a4b"></stop>
                      <stop offset=".16" stopColor="#143b29"></stop>
                      <stop offset="1" stopColor="#04110a"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-tube" x1="0" y1="118" x2="0" y2="262" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#091e15"></stop>
                      <stop offset=".52" stopColor="#1b4f37"></stop>
                      <stop offset="1" stopColor="#86dfa8"></stop>
                    </linearGradient>
                  </defs>
                  <circle cx="187.5" cy="190" r="74" fill="#04120b"></circle>
                  <g clipPath="url(#pk-blk-open)">
                    <rect x="110" y="110" width="155" height="155" fill="#0f2c1e"></rect>
                    <polygon points="149.5,134 149.5,206 96,281 96,86" fill="url(#pk-blk-vl)"></polygon>
                    <polygon points="225.5,134 225.5,206 279,281 279,86" fill="url(#pk-blk-vr)"></polygon>
                    {v.vaultq.map((q: any, qIndex: number) => (
                      <path key={qIndex} d={q.d} fill={q.f} opacity={q.o}></path>
                    ))}
                    <rect x="149.5" y="134" width="76" height="72" fill="url(#pk-blk-backw)"></rect>
                    <polygon points="149.5,206 225.5,206 283,262 92,262" fill="url(#pk-blk-vflr)"></polygon>
                    <polygon points="176,130 199,130 216,206 159,206" fill="url(#pk-blk-cone)"></polygon>
                    <rect x="149.5" y="134" width="76" height="1.4" fill="#04120b" opacity=".5"></rect>
                    <rect x="149.5" y="205" width="76" height="1.2" fill="#04120b" opacity=".55"></rect>
                    <rect x="149.5" y="134" width="1" height="72" fill="#04120b" opacity=".45"></rect>
                    <rect x="224.5" y="134" width="1" height="72" fill="#04120b" opacity=".45"></rect>
                    <ellipse cx="187.5" cy="238" rx="50" ry="13" fill="#d6ffe2" opacity=".16"></ellipse>
                    <ellipse cx="187.5" cy="243.4" rx="33" ry="5.4" fill="#020a06" opacity=".72"></ellipse>
                    <polygon points="165,235 210,235 210,243.6 165,243.6" fill="url(#pk-blk-plf)"></polygon>
                    <polygon points="165,235 210,235 207.2,232.4 167.8,232.4" fill="#6ec592"></polygon>
                    <polygon points="169.5,205 205.5,205 205.5,233 169.5,233" fill="url(#pk-blk-plf)"></polygon>
                    <rect x="169.5" y="205" width=".8" height="28" fill="#a6edc1" opacity=".4"></rect>
                    <rect x="204.7" y="205" width=".8" height="28" fill="#a6edc1" opacity=".22"></rect>
                    <rect x="180" y="213" width="15" height="7.6" rx=".6" fill="#2c6a4b"></rect>
                    <rect x="180" y="213" width="15" height=".6" fill="#c6f7d6" opacity=".7"></rect>
                    <rect x="181.6" y="215.4" width="11.8" height=".7" fill="#04120b" opacity=".6"></rect>
                    <rect x="183" y="217.6" width="9" height=".7" fill="#04120b" opacity=".6"></rect>
                    <polygon points="169.5,205 205.5,205 202.6,196.2 172.4,196.2" fill="#dcffe7"></polygon>
                    <rect x="169.5" y="205" width="36" height=".9" fill="#f6fff9"></rect>
                    <ellipse cx="187.5" cy="200.2" rx="12.6" ry="2.5" fill="#6ec592" opacity=".55"></ellipse>
                    <polygon points="177.5,201.4 198,200.6 197.2,188.4 178.4,189.2" fill="#020a06" opacity=".42" transform="translate(1.1 1)"></polygon>
                    <polygon points="177.5,201.4 198,200.6 197.2,188.4 178.4,189.2" fill="#fcfffd"></polygon>
                    <g transform="rotate(-2.3 187.8 195)" textAnchor="middle" fill="#06120b" fontFamily="Archivo,sans-serif">
                      <text x="187.8" y="192.8" fontWeight="800" fontSize="2.32" letterSpacing=".1">THANKS FOR</text>
                      <text x="187.8" y="195.5" fontWeight="800" fontSize="2.32" letterSpacing=".1">THE INVITE</text>
                      <rect x="181" y="196.6" width="13.6" height=".22" fill="#06120b" opacity=".55"></rect>
                      <text x="187.8" y="199.4" fontWeight="700" fontSize={v.cardSize} letterSpacing={v.cardSpacing}>{v.cardName}</text>
                    </g>
                  </g>
                  <path fillRule="evenodd" fill="url(#pk-blk-tube)" d="M187.5 117a73 73 0 1 0 .01 0zM187.5 119.8a66.6 66.6 0 1 0 .01 0z"></path>
                  <circle cx="187.5" cy="188.2" r="69.9" fill="none" stroke="#020a06" strokeOpacity=".82" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 24.45" strokeDashoffset="15.225"></circle>
                  <circle cx="187.5" cy="186.4" r="66.6" fill="none" stroke="#dcffe7" strokeWidth=".6" opacity=".55"></circle>
                </svg>
                <svg className="pk-blk-lay pk-blk-collar" viewBox="-110 -90 595 650">
                  <defs>
                    <linearGradient id="pk-blk-colv" x1="0" y1="110" x2="0" y2="270" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#b7ecca"></stop>
                      <stop offset=".22" stopColor="#5c9c7c"></stop>
                      <stop offset=".55" stopColor="#2a5b44"></stop>
                      <stop offset="1" stopColor="#0d2a1e"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-coltop" x1="0" y1="110" x2="0" y2="200" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#f0fff5" stopOpacity=".95"></stop>
                      <stop offset="1" stopColor="#f0fff5" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-colb" x1="0" y1="112" x2="0" y2="262" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#91baa0"></stop>
                      <stop offset="1" stopColor="#1c241f"></stop>
                    </linearGradient>
                    <linearGradient id="pk-blk-barrel" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#0d2a1e"></stop>
                      <stop offset=".42" stopColor="#9edcb9"></stop>
                      <stop offset=".62" stopColor="#3c7a5e"></stop>
                      <stop offset="1" stopColor="#071a11"></stop>
                    </linearGradient>
                  </defs>
                  <circle cx="187.5" cy="190" r="76.2" fill="none" stroke="url(#pk-blk-colv)" strokeWidth="7.6"></circle>
                  <circle cx="187.5" cy="190" r="80" fill="none" stroke="url(#pk-blk-coltop)" strokeWidth=".9"></circle>
                  <circle cx="187.5" cy="190" r="79.6" fill="none" stroke="#020a06" strokeWidth=".5" opacity=".6"></circle>
                  <circle cx="187.5" cy="190" r="72.7" fill="none" stroke="#010604" strokeWidth="1.5"></circle>
                  <circle cx="187.5" cy="190.9" r="76.4" fill="none" stroke="#020a06" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" strokeDasharray=".01 17.134" strokeDashoffset="8.57"></circle>
                  <circle cx="187.5" cy="190" r="76.4" fill="none" stroke="url(#pk-blk-colb)" strokeWidth="2.7" strokeLinecap="round" strokeDasharray=".01 17.134" strokeDashoffset="8.57"></circle>
                  <g>
                    <rect x="102.6" y="150" width="10.8" height="32" rx="1.8" fill="#020a06" opacity=".6" transform="translate(.8 2.4)"></rect>
                    <rect x="102.6" y="198" width="10.8" height="32" rx="1.8" fill="#020a06" opacity=".6" transform="translate(.8 2.4)"></rect>
                    <rect x="102.6" y="150" width="10.8" height="32" rx="1.8" fill="url(#pk-blk-barrel)"></rect>
                    <rect x="102.6" y="198" width="10.8" height="32" rx="1.8" fill="url(#pk-blk-barrel)"></rect>
                    <rect x="102" y="157" width="12" height="1" fill="#04120b" opacity=".85"></rect>
                    <rect x="102" y="174" width="12" height="1" fill="#04120b" opacity=".85"></rect>
                    <rect x="102" y="205" width="12" height="1" fill="#04120b" opacity=".85"></rect>
                    <rect x="102" y="222" width="12" height="1" fill="#04120b" opacity=".85"></rect>
                  </g>
                </svg>
                <div className="pk-blk-nearz">
                  <svg className="pk-blk-lay pk-blk-near" viewBox="-110 -90 595 650">
                    <defs>
                      <linearGradient id="pk-blk-p2j" x1="0" y1="72" x2="0" y2="364" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#16392a"></stop>
                        <stop offset=".4" stopColor="#091e15"></stop>
                        <stop offset="1" stopColor="#030d08"></stop>
                      </linearGradient>
                      <linearGradient id="pk-blk-p2i" x1="0" y1="80" x2="0" y2="340" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#6db892"></stop>
                        <stop offset=".22" stopColor="#2a5f47"></stop>
                        <stop offset=".62" stopColor="#0e281b"></stop>
                        <stop offset="1" stopColor="#06170f"></stop>
                      </linearGradient>
                      <linearGradient id="pk-blk-p2h" x1="36" y1="0" x2="339" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#0a2016"></stop>
                        <stop offset=".5" stopColor="#1b4230"></stop>
                        <stop offset="1" stopColor="#0a2016"></stop>
                      </linearGradient>
                      <linearGradient id="pk-blk-p3j" x1="0" y1="50" x2="0" y2="420" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#071a11"></stop>
                        <stop offset="1" stopColor="#020a06"></stop>
                      </linearGradient>
                      <linearGradient id="pk-blk-p3i" x1="0" y1="60" x2="0" y2="400" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#2c5f46"></stop>
                        <stop offset=".5" stopColor="#0f2a1d"></stop>
                        <stop offset="1" stopColor="#04120b"></stop>
                      </linearGradient>
                    </defs>
                    {v.near.map((q: any, qIndex: number) => (
                      <path key={qIndex} d={q.d} fill={q.f} opacity={q.o}></path>
                    ))}
                    {v.rivetsNear.map((v: any, vIndex: number) => (
                      <line key={vIndex} x1={v.x} y1={v.y1} x2={v.x} y2={v.y2} stroke={v.c} strokeWidth={v.w} strokeLinecap="round" strokeDasharray={v.dash}></line>
                    ))}
                  </svg>
                  <div className="pk-blk-cam">
                    <svg className="pk-blk-cammount" viewBox="0 0 52 40">
                      <rect x="-3.4" y="2.5" width="6" height="17.5" rx="1.2" fill="#123023" stroke="#031008" strokeWidth=".6"></rect>
                      <rect x="-3.4" y="2.5" width="6" height="1.3" rx=".6" fill="#cfffe0" opacity=".5"></rect>
                      <rect x="1.5" y="8.8" width="6.6" height="4.6" fill="#1e4c38" stroke="#031008" strokeWidth=".6"></rect>
                      <rect x="1.5" y="8.8" width="6.6" height="1.1" fill="#cfffe0" opacity=".35"></rect>
                    </svg>
                    <div className="pk-blk-campan">
                      <div className="pk-blk-camjit">
                        <svg viewBox="0 0 52 40">
                          <defs>
                            <linearGradient id="pk-blk-camb" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0" stopColor="#bff5d2"></stop>
                              <stop offset=".3" stopColor="#4f9271"></stop>
                              <stop offset="1" stopColor="#0c251a"></stop>
                            </linearGradient>
                          </defs>
                          <g transform="rotate(14 8 11)">
                            <rect x="7.6" y="5" width="34" height="13" rx="2.6" fill="url(#pk-blk-camb)" stroke="#031008" strokeWidth=".7"></rect>
                            <rect x="38" y="3.6" width="10" height="16" rx="1.2" fill="url(#pk-blk-camb)" stroke="#031008" strokeWidth=".7"></rect>
                            <rect x="47" y="5.6" width="2" height="12" rx=".8" fill="#04120b"></rect>
                            <rect x="10" y="8" width="24" height="1" fill="#031008" opacity=".5"></rect>
                            <circle className="pk-blk-camled" cx="12" cy="13.6" r="1.3" fill="#ff2b2b"></circle>
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pk-blk-darkb"></div>
                <svg className="pk-blk-lay pk-blk-spill" viewBox="-110 -90 595 650">
                  <defs>
                    <radialGradient id="pk-blk-spf" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(187.5 268) scale(116 205)">
                      <stop offset="0" stopColor="#e6ffee" stopOpacity=".62"></stop>
                      <stop offset=".3" stopColor="#b9ffcb" stopOpacity=".34"></stop>
                      <stop offset=".62" stopColor="#7dff9a" stopOpacity=".1"></stop>
                      <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
                    </radialGradient>
                    <radialGradient id="pk-blk-spw" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(187.5 190) scale(205 170)">
                      <stop offset=".34" stopColor="#b9ffcb" stopOpacity=".26"></stop>
                      <stop offset=".62" stopColor="#7dff9a" stopOpacity=".07"></stop>
                      <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
                    </radialGradient>
                  </defs>
                  <rect x="-110" y="-20" width="595" height="420" fill="url(#pk-blk-spw)"></rect>
                  <polygon points={v.spillF} fill="url(#pk-blk-spf)"></polygon>
                  <circle cx="187.5" cy="190" r="73.4" fill="none" stroke="#e6ffee" strokeWidth="1" opacity=".55"></circle>
                </svg>
                <div className="pk-blk-door3d">
                  <div className="pk-blk-door">
                    {v.facets.map((f: any, fIndex: number) => (
                      <span key={fIndex} className="pk-blk-facet" style={{ '--a': f.a, '--c': f.c } as React.CSSProperties}></span>
                    ))}
                    <div className="pk-blk-backf">
                      <svg className="pk-blk-facesvg" viewBox="0 0 288 288">
                        <defs>
                          <linearGradient id="pk-blk-backlit" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="#020a06" stopOpacity=".62"></stop>
                            <stop offset=".55" stopColor="#020a06" stopOpacity=".1"></stop>
                            <stop offset="1" stopColor="#dcffe6" stopOpacity=".3"></stop>
                          </linearGradient>
                        </defs>
                        <circle cx="144" cy="144" r="134" fill="none" stroke="#071a11" strokeWidth="5"></circle>
                        <circle cx="144" cy="144" r="100" fill="#10291d"></circle>
                        <circle cx="144" cy="144" r="100" fill="none" stroke="#6fb892" strokeWidth="2"></circle>
                        <path d={v.armsBar} fill="#5da880"></path>
                        <path d={v.armsHead} fill="#c6f7d6"></path>
                        <circle cx="144" cy="144" r="38" fill="#21523a" stroke="#a9e8c3" strokeWidth="3"></circle>
                        <circle cx="144" cy="144" r="30" fill="none" stroke="#06170f" strokeWidth="7" strokeDasharray="5 3.4"></circle>
                        <circle cx="144" cy="144" r="13" fill="#c6f7d6"></circle>
                        <circle cx="144" cy="144" r="6" fill="#123023"></circle>
                        <rect x="0" y="0" width="288" height="288" fill="url(#pk-blk-backlit)"></rect>
                      </svg>
                    </div>
                    <div className="pk-blk-front">
                      <span className="pk-blk-ring pk-blk-rim"></span>
                      {' '}
                      <span className="pk-blk-ring pk-blk-mid"></span>
                      {' '}
                      <span className="pk-blk-ring pk-blk-core"></span>
                      <svg className="pk-blk-facesvg" viewBox="0 0 288 288">
                        <defs>
                          <radialGradient id="pk-blk-boltg" cx=".38" cy=".26" r=".82">
                            <stop offset="0" stopColor="#f4fff8"></stop>
                            <stop offset=".3" stopColor="#9edcb9"></stop>
                            <stop offset=".72" stopColor="#2d5f49"></stop>
                            <stop offset="1" stopColor="#0d261b"></stop>
                          </radialGradient>
                          <linearGradient id="pk-blk-plate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#b3e9c8"></stop>
                            <stop offset=".24" stopColor="#5a9b7a"></stop>
                            <stop offset="1" stopColor="#143526"></stop>
                          </linearGradient>
                          <path id="pk-blk-ringp" d="M144 66.5a77.5 77.5 0 1 1 -.01 0"></path>
                          <radialGradient id="pk-blk-lampr">
                            <stop offset="0" stopColor="#ffd6d0"></stop>
                            <stop offset=".34" stopColor="#ff2b2b"></stop>
                            <stop offset=".62" stopColor="#ff2b2b" stopOpacity=".34"></stop>
                            <stop offset="1" stopColor="#ff2b2b" stopOpacity="0"></stop>
                          </radialGradient>
                          <radialGradient id="pk-blk-lampg">
                            <stop offset="0" stopColor="#f4fff8"></stop>
                            <stop offset=".3" stopColor="#7dff9a"></stop>
                            <stop offset=".6" stopColor="#7dff9a" stopOpacity=".36"></stop>
                            <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
                          </radialGradient>
                        </defs>
                        <circle cx="144" cy="144" r="102" fill="none" stroke="#050f0a" strokeWidth="1" opacity=".8" strokeDasharray="1.2 7.8"></circle>
                        <text fontFamily="'Share Tech Mono',monospace" fontSize="10.4" letterSpacing="3.1" fill="#04140c" opacity=".78">
                          <textPath href="#pk-blk-ringp" textLength="477" lengthAdjust="spacing">VAULT 04 / STAND CLEAR / VAULT 04 / STAND CLEAR /</textPath>
                        </text>
                        <text fontFamily="'Share Tech Mono',monospace" fontSize="10.4" letterSpacing="3.1" fill="#bdf2d0" opacity=".2" transform="translate(0 .9)">
                          <textPath href="#pk-blk-ringp" textLength="477" lengthAdjust="spacing">VAULT 04 / STAND CLEAR / VAULT 04 / STAND CLEAR /</textPath>
                        </text>
                        <path d={v.lampSockets} fill="#04120b"></path>
                        {v.lamps.map((l: any, lIndex: number) => (
                          <Fragment key={lIndex}>
                            <circle className={`pk-blk-lamp-r ${l.cls}`} cx={l.x} cy={l.y} r="6.4" fill="url(#pk-blk-lampr)"></circle>
                            <circle className={`pk-blk-lamp-g ${l.cls}`} cx={l.x} cy={l.y} r="7.6" fill="url(#pk-blk-lampg)"></circle>
                          </Fragment>
                        ))}
                        <path d={v.boltStreaks} fill="#010604" opacity=".42"></path>
                        <circle cx="144" cy="145.5" r="124.5" fill="none" stroke="#020a06" strokeOpacity=".72" strokeWidth="16.4" strokeLinecap="round" strokeDasharray=".01 48.881" strokeDashoffset="24.445"></circle>
                        {v.doorBolts.map((b: any, bIndex: number) => (
                          <circle key={bIndex} cx={b.x} cy={b.y} r="7.4" fill="url(#pk-blk-boltg)"></circle>
                        ))}
                        <path d={v.boltHex} fill="#0a2118" opacity=".78"></path>
                        <g>
                          <rect x="-6" y="83" width="42" height="26" rx="3" fill="#020a06" opacity=".6" transform="translate(0 3.4)"></rect>
                          <rect x="-6" y="83" width="42" height="26" rx="3" fill="url(#pk-blk-plate)"></rect>
                          <rect x="-6" y="179" width="42" height="26" rx="3" fill="#020a06" opacity=".6" transform="translate(0 3.4)"></rect>
                          <rect x="-6" y="179" width="42" height="26" rx="3" fill="url(#pk-blk-plate)"></rect>
                          <rect x="-6" y="83" width="42" height="1.4" rx=".7" fill="#f0fff5" opacity=".85"></rect>
                          <rect x="-6" y="179" width="42" height="1.4" rx=".7" fill="#f0fff5" opacity=".7"></rect>
                          <circle cx="14" cy="96.6" r="3.6" fill="#020a06" opacity=".6"></circle>
                          <circle cx="14" cy="96" r="3.2" fill="url(#pk-blk-boltg)"></circle>
                          <circle cx="28" cy="96.6" r="3.6" fill="#020a06" opacity=".6"></circle>
                          <circle cx="28" cy="96" r="3.2" fill="url(#pk-blk-boltg)"></circle>
                          <circle cx="14" cy="192.6" r="3.6" fill="#020a06" opacity=".6"></circle>
                          <circle cx="14" cy="192" r="3.2" fill="url(#pk-blk-boltg)"></circle>
                          <circle cx="28" cy="192.6" r="3.6" fill="#020a06" opacity=".6"></circle>
                          <circle cx="28" cy="192" r="3.2" fill="url(#pk-blk-boltg)"></circle>
                        </g>
                        <g fill="none" stroke="#dcffe8" strokeLinecap="round">
                          <path d="M58 38C72 28 90 20 112 15" strokeWidth=".8" opacity=".32"></path>
                          <path d="M222 54c9 8 16 16 22 26" strokeWidth=".7" opacity=".26"></path>
                          <path d="M34 186c3 11 8 21 14 30" strokeWidth=".7" opacity=".2"></path>
                          <path d="M196 254c-11 6-24 10-36 12" strokeWidth=".7" opacity=".16"></path>
                          <path d="M92 60c7-5 15-8 23-10" strokeWidth=".6" opacity=".24"></path>
                        </g>
                      </svg>
                      <svg className="pk-blk-wheelsh" viewBox="0 0 288 288">
                        <g opacity=".5">
                          <circle cx="144" cy="144" r="48" fill="none" stroke="#020a06" strokeWidth="12"></circle>
                          <path d={v.spokes} fill="#020a06"></path>
                          <circle cx="144" cy="144" r="19" fill="#020a06"></circle>
                        </g>
                      </svg>
                      <svg className="pk-blk-wheel" viewBox="0 0 288 288">
                        <defs>
                          <linearGradient id="pk-blk-wv" x1="0" y1="86" x2="0" y2="204" gradientUnits="userSpaceOnUse">
                            <stop offset="0" stopColor="#e6fff0"></stop>
                            <stop offset=".24" stopColor="#8fd4ad"></stop>
                            <stop offset=".6" stopColor="#3a7559"></stop>
                            <stop offset="1" stopColor="#123024"></stop>
                          </linearGradient>
                          <radialGradient id="pk-blk-hub" cx=".4" cy=".26" r=".85">
                            <stop offset="0" stopColor="#f4fff8"></stop>
                            <stop offset=".38" stopColor="#8fd4ad"></stop>
                            <stop offset="1" stopColor="#143526"></stop>
                          </radialGradient>
                        </defs>
                        <path d={v.spokes} fill="url(#pk-blk-wv)" stroke="#04120b" strokeWidth=".9"></path>
                        <circle cx="144" cy="144" r="48" fill="none" stroke="#04120b" strokeWidth="12.6"></circle>
                        <circle cx="144" cy="144" r="48" fill="none" stroke="url(#pk-blk-wv)" strokeWidth="11"></circle>
                        <circle cx="144" cy="144" r="52" fill="none" stroke="#f4fff8" strokeWidth=".9" opacity=".38" strokeDasharray="44 283" transform="rotate(-105 144 144)"></circle>
                        <path d={v.gripShadow} fill="#020a06" opacity=".5"></path>
                        {v.grips.map((g: any, gIndex: number) => (
                          <circle key={gIndex} cx={g.x} cy={g.y} r="6.2" fill="url(#pk-blk-hub)"></circle>
                        ))}
                        <circle cx="144" cy="144" r="19" fill="#04120b"></circle>
                        <circle cx="144" cy="144" r="17.6" fill="url(#pk-blk-hub)"></circle>
                        <circle cx="144" cy="144" r="9" fill="#123024" stroke="#cfffe0" strokeOpacity=".5" strokeWidth=".8"></circle>
                        <circle cx="144" cy="144" r="3.6" fill="url(#pk-blk-hub)"></circle>
                      </svg>
                      <span className="pk-blk-facelight"></span>
                      {' '}
                      <span className="pk-blk-facedark"></span>
                    </div>
                  </div>
                </div>
                <div className="pk-blk-redspill"></div>
                <div className="pk-blk-sheet pk-blk-darks"></div>
                <div className="pk-blk-sheet pk-blk-darka"></div>
                <div className="pk-blk-sheet pk-blk-darkh"></div>
                <svg className="pk-blk-lay pk-blk-lasers" viewBox="-110 -90 595 650">
                  <defs>
                    <linearGradient id="pk-blk-lzg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#ff2b2b" stopOpacity="0"></stop>
                      <stop offset=".5" stopColor="#ff2b2b" stopOpacity=".42"></stop>
                      <stop offset="1" stopColor="#ff2b2b" stopOpacity="0"></stop>
                    </linearGradient>
                    <radialGradient id="pk-blk-ledg">
                      <stop offset="0" stopColor="#fff" stopOpacity="1"></stop>
                      <stop offset=".22" stopColor="#ffd6d0" stopOpacity="1"></stop>
                      <stop offset=".46" stopColor="#ff2b2b" stopOpacity=".62"></stop>
                      <stop offset="1" stopColor="#ff2b2b" stopOpacity="0"></stop>
                    </radialGradient>
                  </defs>
                  {v.beams.map((b: any, bIndex: number) => (
                    <g key={bIndex} className={`pk-blk-beam ${b.cls}`} style={{ '--i': b.i } as React.CSSProperties} transform={b.tf}>
                      <g className="pk-blk-bH">
                        <rect x="0" y={b.gy} width={b.h} height={b.gh} fill="url(#pk-blk-lzg)"></rect>
                        <rect x="0" y={b.cy} width={b.h} height={b.ch} fill="#ff2b2b"></rect>
                        <rect x="0" y={b.wy} width={b.h} height={b.wh} fill="#ffc9c2"></rect>
                        <line x1="1" y1="0" x2={b.h} y2="0" stroke="#fff" strokeWidth={b.sw} strokeDasharray=".7 13 1.3 21 .6 9 1 27 .8 16" opacity=".55"></line>
                      </g>
                      <g transform={b.tr}>
                        <g className="pk-blk-bH">
                          <rect x={b.nh} y={b.gy} width={b.h} height={b.gh} fill="url(#pk-blk-lzg)"></rect>
                          <rect x={b.nh} y={b.cy} width={b.h} height={b.ch} fill="#ff2b2b"></rect>
                          <rect x={b.nh} y={b.wy} width={b.h} height={b.wh} fill="#ffc9c2"></rect>
                          <line x1={b.nh} y1="0" x2="-1" y2="0" stroke="#fff" strokeWidth={b.sw} strokeDasharray="1 17 .6 11 1.2 24 .7 8 .9 19" opacity=".55"></line>
                        </g>
                      </g>
                      <rect className="pk-blk-bF" x="0" y={b.fy} width={b.l} height={b.fh} fill="#ffe9e4"></rect>
                    </g>
                  ))}
                  {v.leds.map((d: any, dIndex: number) => (
                    <circle key={dIndex} className={`pk-blk-led ${d.cls}`} cx={d.x} cy={d.y} r={d.r} fill="url(#pk-blk-ledg)"></circle>
                  ))}
                  <g transform={v.sparkA}>
                    <circle className="pk-blk-spf" r="9" fill="url(#pk-blk-ledg)"></circle>
                    {v.sparks.map((s: any, sIndex: number) => (
                      <rect key={sIndex} className="pk-blk-sp" x="0" y="-.45" width={s.w} height=".9" rx=".4" fill={s.f} style={{ '--a': s.a, '--l': s.l } as React.CSSProperties}></rect>
                    ))}
                  </g>
                  <g transform={v.sparkB}>
                    <circle className="pk-blk-spf" r="6" fill="url(#pk-blk-ledg)"></circle>
                  </g>
                </svg>
                <svg className="pk-blk-lay pk-blk-cardtop" viewBox="-110 -90 595 650">
                  <polygon points="177.5,201.4 198,200.6 197.2,188.4 178.4,189.2" fill="#fcfffd"></polygon>
                  <g transform="rotate(-2.3 187.8 195)" textAnchor="middle" fill="#06120b" fontFamily="Archivo,sans-serif">
                    <text x="187.8" y="192.8" fontWeight="800" fontSize="2.32" letterSpacing=".1">THANKS FOR</text>
                    <text x="187.8" y="195.5" fontWeight="800" fontSize="2.32" letterSpacing=".1">THE INVITE</text>
                    <rect x="181" y="196.6" width="13.6" height=".22" fill="#06120b" opacity=".55"></rect>
                    <text x="187.8" y="199.4" fontWeight="700" fontSize={v.cardSize} letterSpacing={v.cardSpacing}>{v.cardName}</text>
                  </g>
                </svg>
                <div className="pk-blk-seam"></div>
                <div className="pk-blk-ret">
                  <svg viewBox="0 0 26 26">
                    <path d="M1 8V1h7M18 1h7v7M25 18v7h-7M8 25H1v-7" fill="none" stroke="#03140a" strokeWidth="3" opacity=".7"></path>
                    <path d="M1 8V1h7M18 1h7v7M25 18v7h-7M8 25H1v-7" fill="none" stroke="#dcffe6" strokeWidth="1.5"></path>
                  </svg>
                </div>
                <div className="pk-blk-worldfade"></div>
              </div>
            </div>
          </div>
          <div className="pk-blk-cardvig" aria-hidden="true"></div>
          <div className="pk-blk-cover" aria-hidden="true"></div>
          <div className="pk-blk-heroscan" aria-hidden="true"></div>
          <div className="pk-blk-shut pk-blk-shut-a" aria-hidden="true"></div>
          <div className="pk-blk-shut pk-blk-shut-b" aria-hidden="true"></div>
          <div className="pk-blk-crt" aria-hidden="true"></div>
          <div className="pk-blk-osd" aria-hidden="true">
            <div className="pk-blk-osd-l">
              <span className="pk-blk-recdot"></span>
              {' '}
              <span className="pk-blk-rec">REC</span>
              {' '}
              <span className="pk-blk-rec-b">BATTERY</span>
              {' '}
              <span>CAM 04</span>
            </div>
            <div className="pk-blk-time">
              <span>03:1</span>
              <span className="pk-blk-dg">
                <span className="pk-blk-dgs pk-blk-dg-m">0123456789</span>
              </span>
              <span>:</span>
              <span className="pk-blk-dg">
                <span className="pk-blk-dgs pk-blk-dg-t">012345</span>
              </span>
              <span className="pk-blk-dg">
                <span className="pk-blk-dgs pk-blk-dg-s">0123456789</span>
              </span>
              <span>.</span>
              <span className="pk-blk-dg">
                <span className="pk-blk-dgs pk-blk-dg-f">0123456789</span>
              </span>
            </div>
          </div>
          <div className="pk-blk-inset" aria-hidden="true">
            <svg viewBox="0 0 192 132" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="pk-blk-inb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2c0c08"></stop>
                  <stop offset="1" stopColor="#6c2414"></stop>
                </linearGradient>
                <linearGradient id="pk-blk-inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#8e1520"></stop>
                  <stop offset=".5" stopColor="#d2202a"></stop>
                  <stop offset="1" stopColor="#e8352f"></stop>
                </linearGradient>
              </defs>
              <rect width="192" height="70" fill="url(#pk-blk-inb)"></rect>
              <rect y="70" width="192" height="62" fill="#1d0806"></rect>
              <g fill="#ffcf7a">
                <circle cx="18" cy="16" r="7" opacity=".42"></circle>
                <circle cx="46" cy="27" r="5" opacity=".34"></circle>
                <circle cx="74" cy="12" r="6" opacity=".3"></circle>
                <circle cx="118" cy="22" r="5" opacity=".34"></circle>
                <circle cx="148" cy="12" r="7" opacity=".4"></circle>
                <circle cx="174" cy="30" r="5.5" opacity=".42"></circle>
                <circle cx="30" cy="48" r="4" opacity=".3"></circle>
                <circle cx="164" cy="50" r="4" opacity=".3"></circle>
                <circle cx="100" cy="6" r="3.5" opacity=".28"></circle>
              </g>
              <polygon points="70,70 122,70 178,132 14,132" fill="url(#pk-blk-inc)"></polygon>
              <polygon points="70,70 73,70 21,132 14,132" fill="#ffc35e" opacity=".55"></polygon>
              <polygon points="122,70 119,70 171,132 178,132" fill="#ffc35e" opacity=".55"></polygon>
              <g stroke="#e9b45a" strokeWidth="2.2" fill="none">
                <path d="M52 92V74M28 110V86M140 92V74M164 110V86"></path>
                <path d="M52 77Q40 90 28 90M140 77Q152 90 164 90" strokeWidth="1.4"></path>
              </g>
              <g fill="#0b0403">
                <path d="M0 132V104c6-5 14-4 18 2 6 3 12 8 14 26z"></path>
                <path d="M192 132V100c-7-5-15-4-19 2-7 4-13 10-15 30z"></path>
                <rect x="14" y="97" width="13" height="9" rx="1.5"></rect>
                <rect x="164" y="93" width="13" height="9" rx="1.5"></rect>
              </g>
              <ellipse cx="96" cy="121" rx="26" ry="4.5" fill="#3d0507" opacity=".62"></ellipse>
              <g>
                <path d="M84 122l2-29h20l2 29h-9l-3-22-3 22z" fill="#090305"></path>
                <path d="M78 66c3-6 10-8 18-8s15 2 18 8l3 20c.6 4-4 6-6 3l-4-14-2 22H86l-2-22-5 13c-2 3-6 1-5-3z" fill="#0d0507"></path>
                <path d="M112 68l14-20 4 2.6-13 24c-1.6 2.6-5 1.6-5-1z" fill="#0d0507"></path>
                <path d="M91 58h10l-5 19z" fill="#fff3df"></path>
                <path d="M92.6 60.4l3.4 1.6 3.4-1.6v3.4l-3.4-1.5-3.4 1.5z" fill="#0b0304"></path>
                <circle cx="96" cy="47" r="10.8" fill="#120709"></circle>
                <path d="M85 45a11 11 0 0 1 22 0c-3-5-7-6-11-6s-8 1-11 6z" fill="#2a1518"></path>
                <path d="M90.2 49.2c1.8 3.6 9.8 3.6 11.6 0-3.6 1.3-8 1.3-11.6 0z" fill="#fff8ee"></path>
                <path d="M85.6 42a10.8 10.8 0 0 1 20.8 0" fill="none" stroke="#ffc873" strokeWidth="1.1" opacity=".75"></path>
                <path d="M79 66c3-5 9-7 14-7.6M113 66c-3-5-9-7-14-7.6" fill="none" stroke="#ffc873" strokeWidth=".9" opacity=".55"></path>
                <rect x="103" y="69" width="6" height="1.6" fill="#fff3df"></rect>
                <path d="M127 49l5-3.4 1.4-6.4M131 34l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#ffd27a"></path>
                <path className="pk-blk-glint" d="M106 62l1.2 5 5 1.2-5 1.2-1.2 5-1.2-5-5-1.2 5-1.2z" fill="#fff"></path>
              </g>
            </svg>
            <span className="pk-blk-pop"></span>
            {' '}
            <span className="pk-blk-pophit"></span>
            {' '}
            <span className="pk-blk-inset-l">CAM 11</span>
            {' '}
            <span className="pk-blk-inset-t">{v.insetName}</span>
          </div>
          <div className="pk-blk-hint">
            <span>{v.hint}</span>
            {' '}
            <span className="pk-blk-pips" aria-hidden="true">
              {v.pips.map((p: any, pIndex: number) => (
                <i key={pIndex} className={`pk-blk-pip ${p.cls}`}></i>
              ))}
            </span>
          </div>
        </div>
        <div className="pk-blk-copy">
          <h1 className="pk-blk-lock pk-blk-rise" style={{ '--d': '.45s' } as React.CSSProperties}>
            <span className="pk-blk-l1">THE BLACKOUT</span>
            {' '}
            <span className="pk-blk-l2">
              <span className="pk-blk-wire" aria-hidden="true"></span>
              {' '}
              <span className="pk-blk-job">
                <span className="pk-blk-job-r">JOB</span>
                <span className="pk-blk-job-g" aria-hidden="true">JOB</span>
              </span>
              {' '}
              <span className="pk-blk-wire pk-blk-wire-r" aria-hidden="true"></span>
            </span>
          </h1>
          <div className="pk-blk-kick pk-blk-rise" style={{ '--d': '.51s' } as React.CSSProperties}>YOUR HEIST CREW</div>
          <div className="pk-blk-soon pk-blk-rise" style={{ '--d': '.57s' } as React.CSSProperties}>
            <span className="pk-blk-soon-m" aria-hidden="true"></span>
            {' '}
            <span className="pk-blk-soon-box">
              <span className="pk-blk-soon-t">COMING SOON</span>
              <span className="pk-blk-sheen" aria-hidden="true">
                <span className="pk-blk-sheen-in">
                  <span className="pk-blk-soon-t pk-blk-soon-lit">COMING SOON</span>
                </span>
              </span>
            </span>
            {' '}
            <span className="pk-blk-soon-m pk-blk-soon-mr" aria-hidden="true"></span>
          </div>
          <p className="pk-blk-pitch pk-blk-rise" style={{ '--d': '.63s' } as React.CSSProperties}>Your rival's vault is one power cut away. <b>Turn your film crew into a heist team</b>, black out the vault, and collect your award with their diamonds in your pocket.</p>
        </div>
        <div className="pk-blk-plate pk-blk-rise" style={{ '--d': '.69s' } as React.CSSProperties}>
          <span className="pk-blk-rivet pk-blk-rivet-a" aria-hidden="true"></span>
          <span className="pk-blk-rivet pk-blk-rivet-b" aria-hidden="true"></span>
          <span className="pk-blk-rivet pk-blk-rivet-c" aria-hidden="true"></span>
          <span className="pk-blk-rivet pk-blk-rivet-d" aria-hidden="true"></span>
          <ol className="pk-blk-lines">
            <li className={`pk-blk-slot ${v.s1}`}>
              <span className="pk-blk-no" aria-hidden="true">01</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '84%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Rob the gala that invited you</span>
                <span className="pk-blk-hot" aria-hidden="true">Rob the gala that invited you</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s2}`}>
              <span className="pk-blk-no" aria-hidden="true">02</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '72%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Steal unreleased blockbusters</span>
                <span className="pk-blk-hot" aria-hidden="true">Steal unreleased blockbusters</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s3}`}>
              <span className="pk-blk-no" aria-hidden="true">03</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '90%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Turn your film crew into thieves</span>
                <span className="pk-blk-hot" aria-hidden="true">Turn your film crew into thieves</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s4}`}>
              <span className="pk-blk-no" aria-hidden="true">04</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '68%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Rehearse on a full-size set</span>
                <span className="pk-blk-hot" aria-hidden="true">Rehearse on a full-size set</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s5}`}>
              <span className="pk-blk-no" aria-hidden="true">05</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '92%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Cut the cameras, dodge the lasers</span>
                <span className="pk-blk-hot" aria-hidden="true">Cut the cameras, dodge the lasers</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s6}`}>
              <span className="pk-blk-no" aria-hidden="true">06</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '76%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Turn your jet into the getaway</span>
                <span className="pk-blk-hot" aria-hidden="true">Turn your jet into the getaway</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s7}`}>
              <span className="pk-blk-no" aria-hidden="true">07</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '88%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Leak their film on opening night</span>
                <span className="pk-blk-hot" aria-hidden="true">Leak their film on opening night</span>
              </span>
            </li>
            <li className={`pk-blk-slot ${v.s8}`}>
              <span className="pk-blk-no" aria-hidden="true">08</span>
              <span className="pk-blk-tw">
                <span className="pk-blk-blank" style={{ '--w': '66%' } as React.CSSProperties} aria-hidden="true"></span>
                <span className="pk-blk-txt">Frame a rival <br />for the job</span>
                <span className="pk-blk-hot" aria-hidden="true">Frame a rival <br />for the job</span>
              </span>
            </li>
          </ol>
        </div>
        <div className="pk-blk-ctaz pk-blk-rise" style={{ '--d': '.75s' } as React.CSSProperties}>
          <span className="pk-blk-ctaw">
            <button className={`pk-blk-cta ${v.ctaClass}`} type="button" data-cta="1" onClick={v.notify}>
              {v.notified ? (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5l3.4 3.4L13 4.8" fill="none" stroke="#7dff9a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              ) : null}
              {v.notNotified ? (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.6 6l2.6-3.2h5.6L13.4 6 8 13.4z" fill="none" stroke="#03170b" strokeWidth="1.5" strokeLinejoin="round"></path>
                  <path d="M2.8 6h10.4M5.8 6L8 13M10.2 6L8 13M5.8 6l2.2-3.1L10.2 6" fill="none" stroke="#03170b" strokeWidth=".9" strokeLinejoin="round"></path>
                </svg>
              ) : null}
              <span>{v.ctaLabel}</span>
            </button>
            <span className="pk-blk-ring2" aria-hidden="true"></span>
            {v.rays.map((r: any, rIndex: number) => (
              <span key={rIndex} className="pk-blk-ray" aria-hidden="true" style={{ '--a': r.a } as React.CSSProperties}></span>
            ))}
          </span>
          <div className="pk-blk-note">ARRIVING IN A FUTURE UPDATE</div>
        </div>
      </div>
      <div className="pk-blk-fx" aria-hidden="true">
        <span className="pk-blk-nv"></span>
        {' '}
        <span className="pk-blk-tear"></span>
        {' '}
        <span className="pk-blk-roll"></span>
        {' '}
        <span className="pk-blk-grain"></span>
        {' '}
        <span className="pk-blk-scan"></span>
        {' '}
        <span className="pk-blk-vig"></span>
        {' '}
        <span className="pk-blk-white"></span>
      </div>
    </div>
  );
}
