#!/usr/bin/env node
/**
 * The Upcoming Packs' sound, rendered ahead of time and shipped as small files. Zeesh called live oscillator sound "really ai"; rendered sound passed, except fireworks, which failed
 * while they had a pitch and kept time (#266). So the foley here follows what fixed those:
 *
 *   an impact is noise through inharmonic resonant modes, never a sine sweep;
 *   nothing keeps time, and every layer gets small random variation in timing and level;
 *   every event is layered: transient, body, tail, and everything sits in one room;
 *   a phone plays almost nothing below 150 Hz, so every thud also has a knock at 200-800 Hz.
 *
 * The one exception to "nothing keeps time" is a pack's theme, which is music: see THE THEME below.
 *
 * Usage: node scripts/audio/render-pack-sounds.mjs <pack>. No dependencies, deterministic (seeded). macOS's afconvert does the encoding, in the game's format (m4a, AAC 96 kbit/s stereo).
 * Another pack only adds a recipe to PACKS at the bottom. PACK_AUDIO_WORK moves the scratch folder (the WAVs and the listening preview, none of it is shipped).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const TAU = Math.PI * 2;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = process.env.PACK_AUDIO_WORK || '/private/tmp/claude-502/-Users-zeesh-Vibe-code-ae-marketing/211fd2fc-177a-45c9-bb94-65a84923da9f/scratchpad/packs/audio-work';
const PREVIEWS = path.join(WORK, '..', 'audio-preview');

const N = seconds => Math.max(1, Math.round(seconds * SR));
const db = value => 10 ** (value / 20);
const toDb = value => (value > 1e-9 ? 20 * Math.log10(value) : -180);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

const seeded = text => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};
const gauss = rand => Math.sqrt(-2 * Math.log(Math.max(1e-9, rand()))) * Math.cos(TAU * rand());

/* ── filters ── */
const coef = (type, f, Q = 0.707) => {
  const w = TAU * clamp(f, 10, SR * 0.48) / SR;
  const c = Math.cos(w);
  const alpha = Math.sin(w) / (2 * Q);
  let b0; let b1; let b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; }
  const a0 = 1 + alpha;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - alpha) / a0];
};
const filter = (x, type, f, Q) => {
  const out = new Float32Array(x.length);
  let [b0, b1, b2, a1, a2] = coef(type, typeof f === 'function' ? f(0) : f, Q);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    if (typeof f === 'function' && i % 48 === 0) [b0, b1, b2, a1, a2] = coef(type, f(i / SR), Q);
    const v = x[i];
    const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};
const lp = (x, f, Q) => filter(x, 'lp', f, Q);
const hp = (x, f, Q) => filter(x, 'hp', f, Q);
const bp = (x, f, Q) => filter(x, 'bp', f, Q);

/* ── sources ── */
const white = (n, rand) => { const out = new Float32Array(n); for (let i = 0; i < n; i += 1) out[i] = rand() * 2 - 1; return out; };
const pink = (n, rand) => {
  const out = new Float32Array(n);
  let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0;
  for (let i = 0; i < n; i += 1) {
    const w = rand() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
};
const brown = (n, rand) => { const out = new Float32Array(n); let v = 0; for (let i = 0; i < n; i += 1) { v = (v + (rand() * 2 - 1) * 0.02) / 1.02; out[i] = v * 3.5; } return out; };
const saw = (n, freq, rand) => {
  const out = new Float32Array(n);
  const fn = typeof freq === 'function' ? freq : null;
  let ph = rand ? rand() : 0;
  for (let i = 0; i < n; i += 1) {
    const dt = (fn ? fn(i / SR) : freq) / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < dt) { const t = ph / dt; v -= t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; v -= t * t + t + t + 1; }
    out[i] = v;
  }
  return out;
};

/* ── shaping ── */
const shape = (x, fn) => { for (let i = 0; i < x.length; i += 1) x[i] *= fn(i / SR); return x; };
const decay = (x, tau, attack = 0.002) => shape(x, t => Math.min(1, t / attack) * Math.exp(-t / tau));
const gainOf = (x, g) => { for (let i = 0; i < x.length; i += 1) x[i] *= g; return x; };
const peakOf = x => { let p = 0; for (let i = 0; i < x.length; i += 1) p = Math.max(p, Math.abs(x[i])); return p; };
const norm = (x, to = 1) => { const p = peakOf(x); return p > 0 ? gainOf(x, to / p) : x; };
const drive = (x, k) => { const d = Math.tanh(k); for (let i = 0; i < x.length; i += 1) x[i] = Math.tanh(x[i] * k) / d; return x; };
const sum = (...parts) => {
  const out = new Float32Array(Math.max(...parts.map(p => p.length)));
  for (const p of parts) for (let i = 0; i < p.length; i += 1) out[i] += p[i];
  return out;
};
const pad = (x, seconds) => { const out = new Float32Array(N(seconds)); out.set(x.subarray(0, out.length)); return out; };
const wander = (seconds, rate, rand) => {
  const points = Math.ceil(seconds * rate) + 3;
  const values = Array.from({ length: points }, () => rand());
  return t => { const at = t * rate; const i = Math.floor(at); const f = at - i; const s = f * f * (3 - 2 * f); return values[i] + (values[i + 1] - values[i]) * s; };
};
const ramp = points => t => {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    if (t <= points[i][0]) {
      const [t0, v0] = points[i - 1];
      const [t1, v1] = points[i];
      const f = (t - t0) / Math.max(1e-6, t1 - t0);
      return v0 + (v1 - v0) * f * f * (3 - 2 * f);
    }
  }
  return points[points.length - 1][1];
};
/* the position a CSS cubic-bezier(x1, 0-ish, x2, 1-ish) has reached: used to hear the wheel where the picture turns it */
const bezierTimeAt = (x1, y1, x2, y2, progress) => {
  let low = 0; let high = 1;
  const axis = (a, b, u) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  for (let i = 0; i < 40; i += 1) { const u = (low + high) / 2; if (axis(y1, y2, u) < progress) low = u; else high = u; }
  return axis(x1, x2, (low + high) / 2);
};

/* ── FFT, for the rooms and the meter ── */
const fft = (re, im, inverse) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (TAU / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang); const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1; let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k; const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci; const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i += 1) { re[i] /= n; im[i] /= n; }
};
const convolve = (x, ir) => {
  let M = 1; while (M < x.length + ir.length) M <<= 1;
  const xr = new Float64Array(M); const xi = new Float64Array(M); const hr = new Float64Array(M); const hi = new Float64Array(M);
  xr.set(x); hr.set(ir);
  fft(xr, xi, false); fft(hr, hi, false);
  for (let i = 0; i < M; i += 1) { const r = xr[i] * hr[i] - xi[i] * hi[i]; xi[i] = xr[i] * hi[i] + xi[i] * hr[i]; xr[i] = r; }
  fft(xr, xi, true);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i += 1) out[i] = xr[i];
  return out;
};

/* ── rooms: generated impulse responses, normalised to unit energy, so a send of 0.5 means what it says ── */
const makeRoom = ({ seconds, low, mid, high, predelay, early, seed }) => {
  const channel = side => {
    const rand = seeded(`${seed}${side}`);
    const n = N(seconds);
    const noise = white(n, rand);
    const bandLow = lp(noise, 420);
    const bandMid = bp(noise, 1300, 0.5);
    const bandHigh = hp(noise, 3200);
    const out = new Float32Array(n);
    const start = N(predelay);
    for (let i = start; i < n; i += 1) {
      const t = (i - start) / SR;
      const build = Math.min(1, t / 0.03);
      out[i] = build * (bandLow[i] * Math.exp(-6.9 * t / low) * 1.2 + bandMid[i] * Math.exp(-6.9 * t / mid) + bandHigh[i] * Math.exp(-6.9 * t / high) * 0.8);
    }
    /* the first walls, heard one by one */
    early.forEach(([at, gain, damp]) => {
      const pos = N(at + (rand() - 0.5) * 0.006);
      const burst = lp(decay(white(N(0.012), rand), 0.004), damp);
      for (let i = 0; i < burst.length && pos + i < n; i += 1) out[pos + i] += burst[i] * gain * 6;
    });
    let energy = 0;
    for (let i = 0; i < n; i += 1) energy += out[i] * out[i];
    return gainOf(out, 1 / Math.sqrt(energy));
  };
  return { L: channel('L'), R: channel('R') };
};
const ROOM_SPECS = {
  /* the surveillance room: bare concrete, a few metres across */
  concrete: { seconds: 1, low: 0.62, mid: 0.56, high: 0.26, predelay: 0.005, early: [[0.009, 0.7, 6000], [0.016, 0.55, 5000], [0.027, 0.42, 4000], [0.041, 0.3, 3000]], seed: 'concrete' },
  /* the vault corridor: long concrete and steel */
  /* the theme's space: a great deal larger than any room in the building, and it keeps its top longer */
  hall: { seconds: 5.2, low: 3.5, mid: 3.3, high: 1.7, predelay: 0.042, early: [[0.058, 0.42, 3600], [0.091, 0.36, 3000], [0.137, 0.3, 2400], [0.204, 0.22, 1900], [0.31, 0.15, 1500]], seed: 'hall' },
  vault: { seconds: 4.4, low: 2.9, mid: 2.6, high: 0.85, predelay: 0.028, early: [[0.041, 0.6, 3800], [0.067, 0.52, 3000], [0.103, 0.46, 2400], [0.151, 0.34, 1800], [0.23, 0.24, 1300], [0.34, 0.16, 950]], seed: 'vault' },
};
const roomCache = {};
const room = name => { if (!roomCache[name]) roomCache[name] = makeRoom(ROOM_SPECS[name]); return roomCache[name]; };

class Mix {
  constructor(seconds) {
    const n = N(seconds);
    this.L = new Float32Array(n); this.R = new Float32Array(n);
    this.sends = {};
  }
  add(x, at, gain = 1, pan = 0, send = {}) {
    const start = Math.round(at * SR);
    const angle = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    /* an equal-power law, scaled so that the middle is unity */
    const gl = Math.cos(angle) * gain * Math.SQRT2; const gr = Math.sin(angle) * gain * Math.SQRT2;
    const n = this.L.length;
    for (let i = 0; i < x.length; i += 1) {
      const k = start + i;
      if (k < 0) continue;
      if (k >= n) break;
      this.L[k] += x[i] * gl; this.R[k] += x[i] * gr;
    }
    for (const [name, amount] of Object.entries(send)) {
      if (!this.sends[name]) this.sends[name] = { L: new Float32Array(n), R: new Float32Array(n) };
      const s = this.sends[name];
      for (let i = 0; i < x.length; i += 1) {
        const k = start + i;
        if (k < 0) continue;
        if (k >= n) break;
        s.L[k] += x[i] * gl * amount; s.R[k] += x[i] * gr * amount;
      }
    }
  }
  /* into the rooms, then mastered: a low cut, soft saturation, the fades, the level */
  render({ peak, soften = 0, fadeIn = 0, fadeFrom, fadeTo }) {
    const out = { L: this.L.slice(), R: this.R.slice() };
    for (const [name, s] of Object.entries(this.sends)) {
      const ir = room(name);
      /* the room's own boom below 60 Hz is nothing a phone plays, and it only eats the headroom */
      const wetL = hp(convolve(s.L, ir.L), 60);
      const wetR = hp(convolve(s.R, ir.R), 60);
      for (let i = 0; i < out.L.length; i += 1) { out.L[i] += wetL[i]; out.R[i] += wetR[i]; }
    }
    let L = hp(out.L, 28);
    let R = hp(out.R, 28);
    if (soften > 0) {
      const top = Math.max(peakOf(L), peakOf(R));
      gainOf(L, 1 / top); gainOf(R, 1 / top);
      L = drive(L, soften); R = drive(R, soften);
    }
    const n = L.length;
    const end = fadeTo ?? n / SR;
    const from = fadeFrom ?? Math.max(0, end - 0.03);
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      let g = 1;
      if (fadeIn > 0 && t < fadeIn) g *= Math.sin((t / fadeIn) * Math.PI / 2) ** 2;
      if (t >= end) g = 0;
      else if (t > from) g *= Math.cos(((t - from) / (end - from)) * Math.PI / 2) ** 2;
      L[i] *= g; R[i] *= g;
    }
    const scale = db(peak) / Math.max(peakOf(L), peakOf(R));
    return { L: gainOf(L, scale), R: gainOf(R, scale) };
  }
}

/* ── foley ── */
/* a two-pole resonator: one mode of a body, rung by whatever noise is put in */
const resonate = (x, f, tau, into, g = 1) => {
  const r = Math.exp(-1 / (tau * SR));
  const w = TAU * f / SR;
  const a1 = 2 * r * Math.cos(w); const a2 = -r * r;
  let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const y = x[i] + a1 * y1 + a2 * y2;
    y2 = y1; y1 = y;
    into[i] += y * g * (1 - r);
  }
};
/* a thick steel part's modes: inharmonic, and never quite the same twice */
const RATIOS = [1, 1.37, 1.83, 2.19, 2.71, 3.16, 3.79, 4.33, 5.07, 5.92, 6.61, 7.83, 8.9, 10.3];
const ring = (x, rand, { base, count = 9, tau, tilt = 0.7, beat = 0 }) => {
  const out = new Float32Array(x.length);
  for (let m = 0; m < Math.min(count, RATIOS.length); m += 1) {
    const ratio = RATIOS[m] * (1 + gauss(rand) * 0.014);
    const f = base * ratio;
    if (f > SR * 0.45) continue;
    const t = tau * ratio ** -0.6 * (0.78 + rand() * 0.44);
    const g = ratio ** -tilt * (0.5 + rand() * 0.55);
    resonate(x, f, t, out, g);
    /* a slightly split mode: plate steel beats, and that is the shimmer */
    if (beat > 0) resonate(x, f * (1 + beat * (0.6 + rand() * 0.8)), t * 0.9, out, g * 0.7);
  }
  return norm(out);
};
const burst = (rand, ms, cutoff, seconds) => {
  const x = decay(white(N(ms / 1000 * 3), rand), ms / 1000, 0.0002);
  return pad(lp(x, cutoff), seconds);
};
/* one blow: transient, knock (what a phone hears), low end (what the phone cannot), ring. Every part is its own noise */
const impact = (rand, { mass = 1, seconds = 0.5, click = 0.6, knock = 1, low = 0.8, ringing = 0, knockBase = 235, knockTau = 0.055, lowHz = 72, lowTau = 0.1, ringBase = 640, ringTau = 0.3, hard = 1 }) => {
  /* a heavier part rings lower, but a phone must still hear it: only gently */
  const scaled = mass ** -0.22;
  const parts = [];
  if (click > 0) {
    const tick = ring(burst(rand, 1.6 * hard, 7000, seconds), rand, { base: 1300 * scaled * (0.9 + rand() * 0.2), count: 8, tau: 0.0085, tilt: 0.35 });
    const air = pad(hp(decay(white(N(0.006), rand), 0.0014, 0.0001), 1400), seconds);
    parts.push(gainOf(sum(tick, gainOf(air, 0.6)), click));
  }
  if (knock > 0) parts.push(gainOf(ring(burst(rand, 5 * mass, 2600 * hard, seconds), rand, { base: knockBase * scaled * (0.94 + rand() * 0.12), count: 12, tau: knockTau * mass ** 0.5, tilt: 0.55 }), knock));
  if (low > 0) {
    const exc = pad(lp(decay(white(N(0.09), rand), 0.016 * mass ** 0.6, 0.0008), 300), seconds);
    const out = new Float32Array(exc.length);
    resonate(exc, lowHz * scaled, lowTau * mass ** 0.5, out, 1);
    resonate(exc, lowHz * scaled * 1.47, lowTau * 0.62 * mass ** 0.5, out, 0.7);
    parts.push(gainOf(norm(sum(out, gainOf(exc, 0.6))), low));
  }
  if (ringing > 0) parts.push(gainOf(ring(burst(rand, 3, 5000, seconds), rand, { base: ringBase * (0.95 + rand() * 0.1), count: 10, tau: ringTau, tilt: 0.5, beat: 0.006 }), ringing));
  return norm(drive(norm(sum(...parts)), 1.25));
};
/* steel sliding on steel: rough noise, no pitch */
const slide = (rand, seconds, f0, f1) => {
  const n = N(seconds);
  const rough = lp(white(n, rand), 240);
  const top = peakOf(rough) || 1;
  const x = bp(white(n, rand), t => f0 + (f1 - f0) * (t / seconds), 1.3);
  for (let i = 0; i < n; i += 1) x[i] *= 0.35 + 0.65 * Math.abs(rough[i] / top);
  return norm(shape(x, ramp([[0, 0], [seconds * 0.25, 0.65], [seconds * 0.92, 1], [seconds, 0]])));
};
/* friction: the hinge catches and lets go, again and again. A creak is a train of tiny blows, its "pitch" is how often they land */
const stickSlip = (rand, seconds, speed, { rateMin = 16, rateMax = 80, base = 190, tau = 0.03, count = 9 }) => {
  const n = N(seconds);
  const x = new Float32Array(n);
  let t = 0;
  let last = 0;
  while (t < seconds) {
    const s = speed(t);
    if (s < 0.02) { t += 0.012; continue; }
    const k = N(t);
    if (k < n) {
      /* the sign holds for a run of catches, because the part keeps moving one way */
      if (rand() > 0.82 || last === 0) last = rand() > 0.5 ? 1 : -1;
      x[k] += last * s ** 0.7 * (0.3 + rand() * rand() * 1.5);
    }
    t += (0.6 + rand() * 0.8) / (rateMin + (rateMax - rateMin) * s);
  }
  const smooth = lp(x, 2600);
  return ring(smooth, rand, { base, count, tau, tilt: 0.45 });
};

/* ── the surveillance room's own machinery. What the breaker kills ── */
const mainsHum = (seconds, rand, level = () => 1, sag = () => 1) => {
  const n = N(seconds);
  const out = new Float32Array(n);
  const drift = wander(seconds + 1, 0.7, rand);
  /* a transformer on 50 Hz: mostly twice the mains and its multiples, which is also the part a phone can play */
  const parts = [[100, 1], [150, 0.2], [200, 0.82], [250, 0.11], [300, 0.72], [400, 0.46], [500, 0.3], [600, 0.25], [700, 0.12], [800, 0.1], [1000, 0.05], [1200, 0.035]]
    .map(([f, a]) => ({ f, a, ph: rand() * TAU, w: wander(seconds + 1, 0.5 + rand() * 0.9, rand) }));
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const fm = (1 + (drift(t) - 0.5) * 0.0016) * sag(t);
    let v = 0;
    for (const p of parts) { p.ph += TAU * p.f * fm / SR; v += Math.sin(p.ph) * p.a * (0.72 + 0.56 * p.w(t)); }
    out[i] = v * 0.3;
  }
  const hummed = drive(out, 1.4);
  /* the buzz on top: noise that only passes on the mains' peaks */
  const buzz = bp(pink(n, rand), 1400, 0.8);
  norm(buzz, 0.2);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    hummed[i] = (hummed[i] + buzz[i] * Math.abs(Math.sin(TAU * 50 * sag(t) * t)) ** 6) * level(t);
  }
  return norm(hummed);
};
const fanNoise = (seconds, rand, speed = () => 1) => {
  const n = N(seconds);
  const wob = wander(seconds + 1, 0.35, rand);
  const flut = wander(seconds + 1, 4.2, rand);
  const s = t => speed(t) * (0.965 + 0.07 * wob(t));
  const air = norm(filter(pink(n, rand), 'bp', t => 520 * Math.max(0.12, s(t)), 0.55), 0.8);
  const rumble = norm(lp(brown(n, rand), 190), 0.45);
  const out = sum(air, rumble);
  /* seven blades on a shaft: tones, but made of noise, so they wander as a real fan's do */
  [[1, 0.5, 22], [2, 0.34, 18], [3, 0.18, 14], [5, 0.08, 12]].forEach(([mult, a, Q]) => {
    const tone = norm(filter(white(n, rand), 'bp', t => 168 * mult * Math.max(0.12, s(t)), Q), a);
    for (let i = 0; i < n; i += 1) out[i] += tone[i];
  });
  const phase = rand() * TAU;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const sp = speed(t);
    out[i] *= sp * sp * (0.88 + 0.12 * Math.sin(TAU * 24 * sp * t + phase)) * (0.8 + 0.4 * flut(t));
  }
  return norm(out);
};
/* a relay: the contact, the armature landing, and its bounce */
const relay = (rand, seconds, size = 1) => {
  const contact = norm(sum(
    ring(burst(rand, 0.7, 7000, seconds), rand, { base: 1750 / size, count: 8, tau: 0.0055, tilt: 0.3 }),
    gainOf(ring(burst(rand, 2, 3000, seconds), rand, { base: 325 / size, count: 7, tau: 0.017, tilt: 0.45 }), 0.85),
  ));
  const out = new Float32Array(N(seconds));
  [[0, 1], [0.0048 + rand() * 0.0016, 0.62], [0.0125 + rand() * 0.003, 0.26], [0.0205 + rand() * 0.004, 0.09]].forEach(([at, g]) => {
    const k = N(at);
    for (let i = 0; i + k < out.length; i += 1) out[i + k] += contact[i] * g;
  });
  return norm(out);
};
/* a laser dies: a snap, mains-locked arc noise, a fizz of separate sparks, the relay that cut it, a small ring */
const laserDeath = (rand, seconds, strength = 1) => {
  const n = N(seconds);
  const snap = pad(hp(decay(white(N(0.006), rand), 0.0015, 0.0001), 1900), seconds);
  const phase = rand() * TAU;
  const arc = pad(shape(bp(white(N(0.09), rand), 1050, 0.9), t => Math.abs(Math.sin(TAU * 50 * t + phase)) ** 2.2 * Math.exp(-t / 0.021)), seconds);
  const spikes = new Float32Array(n);
  for (let t = 0.002; t < 0.2; t += -Math.log(Math.max(1e-6, rand())) / Math.max(40, 560 * Math.exp(-t / 0.032))) {
    const k = N(t);
    if (k < n) spikes[k] += (rand() > 0.5 ? 1 : -1) * (0.15 + rand() ** 3) * Math.exp(-t / 0.05);
  }
  const fizz = sum(norm(bp(spikes, 3300, 1.3)), norm(bp(spikes, 6100, 1.6), 0.6));
  const rel = relay(rand, seconds, strength);
  const out = new Float32Array(n);
  const put = (x, g, at = 0) => { const k = N(at); for (let i = 0; i + k < n; i += 1) out[i + k] += x[i] * g; };
  put(norm(snap), 0.66);
  put(norm(arc), 0.62);
  put(fizz, 0.34);
  put(rel, 0.8, 0.009 + rand() * 0.004);
  put(ring(burst(rand, 1, 5000, seconds), rand, { base: 1240, count: 5, tau: 0.062, tilt: 0.6, beat: 0.004 }), 0.042, 0.012);
  return out;
};

/* ── recipes: each sound is { peak, seconds, fades…, build(mix, rand) } ── */
const roomTone = (seconds, rand) => norm(lp(pink(N(seconds), rand), 900));

const BLACKOUT = {
  /* the theme. Plain AAC at a lower rate: it is the one long file, and it is sparse */
  music: { compose: () => composeTheme(), bitrate: 88000, after: (rendered, file) => themeReport(rendered, file) },
  /* every cut. The player varies the rate */
  tap: {
    seconds: 0.36, peak: -16.5, fadeFrom: 0.28, fadeTo: 0.36,
    build(mix, rand) {
      mix.add(laserDeath(rand, 0.36), 0, 1, -0.06, { concrete: 0.3 });
    },
  },
  /*
   * The eighth cut. The picture's clock, in seconds from the tap (pack-blackout.css): the wheel spins 0.70–1.32 with a jolt at 0.735; the seam flickers at 0.88, 1.03, 1.19;
   * the door swings 0.96–1.73 and hits its stop with the jolt at 1.60; it rebounds to 1.91 and is still at 2.12. Everything after that is the room and the steel settling.
   */
  final: {
    seconds: 5.9, peak: -6, soften: 1.55, fadeFrom: 4.5, fadeTo: 5.86,
    marks: { breaker: 0.086, bolt1: 0.738, bolt2: 0.876, bolt3: 0.943, bolt4: 1.031, bolt5: 1.186, bolt6: 1.308, stop: 1.598, rebound: 1.914, rest: 2.129 },
    build(mix, rand) {
      const S = 5.9;
      const jit = (v, amount) => v + (rand() - 0.5) * 2 * amount;
      const lvl = (v, spread = 2) => v * db((rand() - 0.5) * 2 * spread);
      mix.add(roomTone(S, rand), 0, 0.0034, 0.1);

      /* THE BREAKER. Sound starts with the press; the arm lands with the phone's second buzz, at 84 ms */
      mix.add(laserDeath(rand, 0.44, 1.2), 0, 0.3, -0.08, { concrete: 0.3 });
      mix.add(impact(rand, { mass: 0.62, seconds: 0.4, click: 1, knock: 0.7, low: 0.2, knockBase: 410, knockTau: 0.032 }), 0.014, 0.38, -0.16, { concrete: 0.42, vault: 0.05 });
      mix.add(impact(rand, { mass: 1.45, seconds: 0.7, click: 0.6, knock: 1, low: 0.45, knockBase: 235, knockTau: 0.06, lowHz: 66, lowTau: 0.1 }), 0.086, 0.6, -0.14, { concrete: 0.42, vault: 0.05 });
      mix.add(impact(rand, { mass: 0.45, seconds: 0.25, click: 0.7, knock: 0.8, low: 0, knockBase: 520, knockTau: 0.022 }), jit(0.123, 0.005), 0.15, -0.1, { concrete: 0.4 });
      /* the arc as it breaks */
      const arcN = N(0.12);
      mix.add(norm(shape(bp(white(arcN, rand), 1500, 0.8), t => Math.abs(Math.sin(TAU * 50 * t)) ** 2 * Math.exp(-t / 0.024))), 0.02, 0.17, 0.1, { concrete: 0.4 });

      /* THE HUM FALLS AWAY: it is gone by the time the picture says POWER LOST */
      const humLevel = ramp([[0, 0], [0.006, 1], [0.06, 0.92], [0.15, 0.5], [0.27, 0.15], [0.38, 0.035], [0.52, 0]]);
      const humSag = ramp([[0, 1], [0.1, 0.97], [0.28, 0.86], [0.52, 0.7]]);
      mix.add(mainsHum(0.6, rand, humLevel, humSag), 0, 0.16, -0.1, { concrete: 0.42 });
      const fanSpeed = ramp([[0, 1], [0.12, 0.88], [0.28, 0.58], [0.44, 0.3], [0.66, 0.1], [0.8, 0]]);
      mix.add(fanNoise(0.85, rand, t => Math.min(1, t / 0.006) * fanSpeed(t)), 0, 0.15, 0.28, { concrete: 0.5 });

      /* THE DARK. A relay lets go as the lights do, and something small ticks. That is all */
      mix.add(relay(rand, 0.12, 1.2), jit(0.462, 0.004), 0.034, 0.46, { concrete: 0.8 });
      mix.add(relay(rand, 0.1, 0.8), jit(0.61, 0.012), 0.011, -0.58, { concrete: 0.9 });

      /* THE WHEEL, where the picture turns it: a pawl over a toothed ring, fast in the middle of the spin */
      const wheelFrom = 0.7; const wheelFor = 0.62;
      for (let tooth = 1; tooth <= 13; tooth += 1) {
        const at = wheelFrom + wheelFor * bezierTimeAt(0.45, 0, 0.3, 1, tooth / 14);
        mix.add(impact(rand, { mass: 0.22 + rand() * 0.12, seconds: 0.12, click: 0.9, knock: 0.65, low: 0, knockBase: 480 + rand() * 180, knockTau: 0.016 }), jit(at, 0.004), lvl(0.066, 2.5), jit(0.08, 0.1), { vault: 0.24 });
      }
      const wheelBody = norm(bp(pink(N(0.68), rand), 330, 0.9));
      shape(wheelBody, ramp([[0, 0], [0.12, 0.3], [0.3, 1], [0.48, 0.42], [0.66, 0]]));
      mix.add(wheelBody, wheelFrom, 0.08, 0.05, { vault: 0.3 });

      /* THE BOLTS. Six, heard one at a time around the door, each its own weight. The first lands on the picture's jolt, then with the seam's flicker */
      [
        { at: 0.738, mass: 1.32, pan: -0.56, gain: 0.36, lead: 0.038 },
        { at: 0.876, mass: 0.84, pan: 0.42, gain: 0.34, lead: 0.05 },
        { at: 0.943, mass: 0.98, pan: -0.2, gain: 0.31, lead: 0.042 },
        { at: 1.031, mass: 1.14, pan: 0.62, gain: 0.38, lead: 0.058 },
        { at: 1.186, mass: 0.74, pan: -0.42, gain: 0.3, lead: 0.07 },
        { at: 1.308, mass: 1.62, pan: 0.12, gain: 0.5, lead: 0.082 },
      ].forEach(b => {
        const at = jit(b.at, 0.005);
        mix.add(slide(rand, b.lead + 0.008, 900 + rand() * 500, 1500 + rand() * 700), at - b.lead, lvl(b.gain * 0.3), b.pan, { vault: 0.26 });
        mix.add(impact(rand, { mass: b.mass, seconds: 0.55, click: 0.62, knock: 1, low: 0.46, knockBase: 215 + rand() * 75, knockTau: 0.044, lowHz: 58 + rand() * 26, lowTau: 0.07 }), at, lvl(b.gain), b.pan, { vault: 0.38 });
        /* it bounces once against its stop */
        mix.add(impact(rand, { mass: b.mass * 0.34, seconds: 0.12, click: 0.5, knock: 0.9, low: 0, knockBase: 430 + rand() * 170, knockTau: 0.014 }), at + 0.017 + rand() * 0.02, lvl(b.gain * 0.2), b.pan, { vault: 0.22 });
      });

      /* THE HYDRAULICS: a valve opens after the last bolt, and pressure goes on leaving long after the door has stopped */
      mix.add(impact(rand, { mass: 0.4, seconds: 0.16, click: 0.8, knock: 0.8, low: 0, knockBase: 620, knockTau: 0.012 }), jit(1.352, 0.003), 0.15, -0.32, { vault: 0.3 });
      const hissAt = 1.36; const hissFor = 2.9;
      const hissEnv = ramp([[0, 0], [0.035, 1], [0.34, 0.74], [0.9, 0.42], [1.8, 0.14], [2.9, 0]]);
      [[-0.34, 3400, 2300, 1], [0.3, 4300, 2900, 0.72]].forEach(([pan, f0, f1, g]) => {
        const x = sum(norm(filter(white(N(hissFor), rand), 'bp', t => f0 + (f1 - f0) * Math.min(1, t / hissFor), 0.62)), norm(hp(white(N(hissFor), rand), 5200), 0.42));
        const chatter = wander(hissFor + 1, 26, rand);
        const slow = wander(hissFor + 1, 3.1, rand);
        shape(x, t => hissEnv(t) * (0.68 + 0.32 * chatter(t)) * (0.78 + 0.34 * slow(t)));
        mix.add(norm(x), hissAt, 0.23 * g, pan, { vault: 0.2 });
      });
      /* the oil, lower down: a narrow band of noise, sinking as the pressure does */
      const oil = norm(filter(white(N(1.9), rand), 'bp', t => 345 - 105 * Math.min(1, t / 1.9), 5));
      shape(oil, ramp([[0, 0], [0.1, 1], [0.8, 0.55], [1.9, 0]]));
      mix.add(oil, hissAt + 0.03, 0.1, -0.1, { vault: 0.34 });

      /* THE DOOR. Many tons on old hinges: it creaks, the rollers knock, the floor moves */
      const doorSpeed = ramp([[0.96, 0], [1.2, 0.2], [1.46, 0.72], [1.6, 1], [1.72, 0.32], [1.91, 0.2], [2.12, 0.04], [2.2, 0]]);
      const creak = stickSlip(rand, 2.3, doorSpeed, { rateMin: 13, rateMax: 66, base: 185, tau: 0.033, count: 10 });
      mix.add(creak, 0, 0.15, 0.22, { vault: 0.4 });
      const creakHigh = stickSlip(rand, 2.3, doorSpeed, { rateMin: 28, rateMax: 118, base: 610, tau: 0.012, count: 7 });
      mix.add(creakHigh, 0, 0.05, 0.3, { vault: 0.34 });
      let rollerAt = 1.02;
      while (rollerAt < 1.66) {
        const s = doorSpeed(rollerAt);
        mix.add(impact(rand, { mass: 0.8 + rand() * 0.45, seconds: 0.28, click: 0.2, knock: 1, low: 0.4, knockBase: 195 + rand() * 90, knockTau: 0.035, lowHz: 52 + rand() * 18 }), rollerAt, lvl(0.13 * (0.5 + s * 0.8), 3), -0.08, { vault: 0.4 });
        rollerAt += (0.07 + rand() * 0.1) / (0.42 + s);
      }
      const rumbleEnv = ramp([[0, 0], [0.96, 0], [1.25, 0.2], [1.6, 1], [1.76, 0.82], [2.6, 0.42], [3.8, 0.13], [5.4, 0]]);
      const rough = wander(S + 1, 8.5, rand);
      const deep = norm(lp(brown(N(S), rand), 105));
      const chest = norm(bp(pink(N(S), rand), 245, 0.72));
      const steelBody = norm(bp(pink(N(S), rand), 520, 1.2));
      const rumble = sum(gainOf(deep, 0.3), chest, gainOf(steelBody, 0.36));
      shape(rumble, t => rumbleEnv(t) * (0.62 + 0.76 * rough(t)));
      mix.add(norm(rumble), 0, 0.2, -0.04, { vault: 0.26 });

      /* IT STOPS, on the picture's jolt. Then it rocks back, and comes to rest */
      mix.add(impact(rand, { mass: 2.7, seconds: 2.2, click: 0.62, knock: 1, low: 0.62, ringing: 0.09, knockBase: 262, knockTau: 0.1, lowHz: 54, lowTau: 0.12, ringBase: 610, ringTau: 0.4 }), 1.598, 1, 0.02, { vault: 0.72 });
      mix.add(impact(rand, { mass: 1.5, seconds: 0.9, click: 0.42, knock: 1, low: 0.5, ringing: 0.04, knockBase: 250, knockTau: 0.06, lowHz: 58, lowTau: 0.11, ringBase: 700, ringTau: 0.28 }), jit(1.914, 0.006), 0.31, -0.08, { vault: 0.62 });
      mix.add(impact(rand, { mass: 0.95, seconds: 0.5, click: 0.3, knock: 1, low: 0.42, knockBase: 275, knockTau: 0.042, lowHz: 62 }), jit(2.129, 0.008), 0.12, 0.16, { vault: 0.6 });

      /* THE SETTLING: the weight comes down on the hinges, a counterweight finds its place, the steel ticks */
      const settle = stickSlip(rand, 1.05, ramp([[0, 0], [0.18, 0.5], [0.55, 0.26], [1.05, 0]]), { rateMin: 5, rateMax: 24, base: 165, tau: 0.04, count: 9 });
      mix.add(settle, jit(2.48, 0.03), 0.075, 0.26, { vault: 0.56 });
      mix.add(impact(rand, { mass: 1.05, seconds: 0.5, click: 0.26, knock: 1, low: 0.7, knockBase: 255, knockTau: 0.05 }), jit(3.34, 0.05), 0.06, -0.42, { vault: 0.66 });
      [[3.92, 0.3, 0.012], [4.33, -0.48, 0.008], [4.79, 0.52, 0.006]].forEach(([at, pan, g]) => {
        mix.add(relay(rand, 0.1, 0.9), jit(at, 0.06), g, pan, { vault: 0.7 });
      });
    },
  },
  /* the Back button: one small relay, nothing more */
  click: {
    seconds: 0.085, peak: -19, fadeFrom: 0.05, fadeTo: 0.085,
    build(mix, rand) {
      mix.add(relay(rand, 0.06, 0.62), 0, 1, 0.08, { concrete: 0.16 });
    },
  },
  /* the dial's click, and the clack of being let in, as the button says so at 170 ms */
  notify: {
    seconds: 0.96, peak: -9.5, soften: 1.2, fadeFrom: 0.72, fadeTo: 0.95,
    build(mix, rand) {
      mix.add(impact(rand, { mass: 0.44, seconds: 0.26, click: 1, knock: 0.9, low: 0.15, knockBase: 395, knockTau: 0.026, lowHz: 110 }), 0, 0.42, 0.12, { concrete: 0.26, vault: 0.05 });
      mix.add(relay(rand, 0.1, 1.3), 0.052 + rand() * 0.008, 0.075, 0.12, { concrete: 0.3 });
      mix.add(slide(rand, 0.06, 900, 1400), 0.11, 0.075, -0.08, { concrete: 0.25 });
      mix.add(impact(rand, { mass: 1.26, seconds: 0.72, click: 0.5, knock: 1, low: 0.6, ringing: 0.05, knockBase: 212, knockTau: 0.062, lowHz: 70, lowTau: 0.1, ringBase: 690, ringTau: 0.22 }), 0.168, 1, -0.06, { concrete: 0.3, vault: 0.16 });
      mix.add(impact(rand, { mass: 0.4, seconds: 0.16, click: 0.6, knock: 0.85, low: 0, knockBase: 495, knockTau: 0.018 }), 0.207 + rand() * 0.008, 0.17, -0.1, { concrete: 0.3, vault: 0.08 });
    },
  },
};

/* ── THE THEME. One file: the intro, then a loop that returns exactly. 96 BPM, D minor. The motif is five notes, A F E C D, first on the lead and once more, far away, on glass ── */
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const BEAT = 60 / 96; const BAR = BEAT * 4;
/* 20 s is a whole number of samples at both 44.1 and 48 kHz, so a phone that resamples on decoding still loops on the sample */
const PERIOD = BAR * 8;
const SWING = 0.034;
const INTRO_END = BAR * 2.5;
const LAND = INTRO_END - BEAT * 8.5;
/* the intro's tail is exactly zero before this, and the loop points sit after it */
const LOOP_EARLIEST = 10;
const INTRO_PEAK = -5.5; const LOOP_PEAK = -17.5;
/* filled in by composeTheme, in samples */
const seamAt = { from: 0, to: 0 };

const blep = (ph, dt) => {
  if (ph < dt) { const t = ph / dt; return t + t - t * t - 1; }
  if (ph > 1 - dt) { const t = (ph - 1) / dt; return t * t + t + t + 1; }
  return 0;
};
/* half saw, half narrow pulse, which is nasal as a reed is. The rasp beats it at half its own pitch: the torn edge a loud reed or an overdriven string has */
const reed = (n, pitchAt, rand, rasp) => {
  const out = new Float32Array(n);
  let ph = rand(); let sub = rand();
  for (let i = 0; i < n; i += 1) {
    const dt = pitchAt(i) / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    sub += dt / 2; if (sub >= 1) sub -= 1;
    const a = 2 * ph - 1 - blep(ph, dt);
    let other = ph + 0.37; if (other >= 1) other -= 1;
    const b = 2 * other - 1 - blep(other, dt);
    out[i] = (a * 0.62 + (a - b) * 0.3) * (1 + rasp(i / SR) * Math.sin(TAU * sub));
  }
  return out;
};
const leadVoice = (rand, n, pitch, { detune, octave = 0, amp, cutoff, rasp }) => {
  const seconds = n / SR;
  const drift = wander(seconds + 1, 0.9, rand);
  const moves = wander(seconds + 1, 0.6, rand);
  const raw = drive(reed(n, i => hz(pitch[i] + octave + (detune + (drift(i / SR) - 0.5) * 6) / 100), rand, rasp), 1.9);
  const body = lp(raw, t => cutoff(t) * (0.84 + 0.32 * moves(t)), 1.35);
  const nose = bp(raw, 1180, 2.2);
  const edge = bp(raw, 2650, 3);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const open = clamp(cutoff(t) / 5200, 0, 1);
    out[i] = (body[i] + nose[i] * 0.6 + edge[i] * 0.3 * open * open) * amp(t);
  }
  return norm(out);
};
const padNote = (rand, midi, seconds, { attack, release, cutoff }) => {
  const env = ramp([[0, 0], [attack, 1], [seconds - release, 0.9], [seconds, 0]]);
  const n = N(seconds);
  return [[-6, -0.72], [1, 0.08], [7, 0.72]].map(([cents, pan]) => {
    const pull = wander(seconds + 1, 0.25 + rand() * 0.2, rand);
    const opens = wander(seconds + 1, 0.18 + rand() * 0.1, rand);
    const f0 = hz(midi) * 2 ** (cents * (0.8 + rand() * 0.4) / 1200);
    const y = lp(saw(n, t => f0 * (1 + (pull(t) - 0.5) * 0.0016), rand), t => cutoff(t) * (0.78 + 0.44 * opens(t)), 0.85);
    return { x: norm(shape(y, env)), pan: clamp(pan + (rand() - 0.5) * 0.2, -1, 1) };
  });
};
/* Karplus-Strong with a thumb: a short noise loop that loses its top on every pass, muted so that it dies quickly, with the knock of the finger under it */
const pluck = (rand, midi, seconds, vel, { t60 = 1.25, damp = 0.46 } = {}) => {
  const n = N(seconds);
  const out = new Float32Array(n);
  const period = SR / hz(midi) - damp;
  const size = Math.ceil(period) + 3;
  const line = new Float64Array(size);
  const g = 10 ** (-3 * (period / SR) / t60);
  const span = Math.floor(period);
  const noise = norm(lp(white(span + 64, rand), 700 + 1500 * vel));
  const pick = Math.floor(period * 0.18);
  let w = 0; let previous = 0;
  for (let i = 0; i < n; i += 1) {
    const input = i < span ? (noise[i] - (i >= pick ? noise[i - pick] * 0.7 : 0)) * Math.sin((i / span) * Math.PI) : 0;
    const read = (w - period + size * 2) % size;
    const k = Math.floor(read);
    const delayed = line[k] + (line[(k + 1) % size] - line[k]) * (read - k);
    const value = input + g * ((1 - damp) * delayed + damp * previous);
    previous = delayed;
    line[w] = value;
    out[i] = value;
    w = (w + 1) % size;
  }
  const thumb = pad(lp(decay(white(N(0.03), rand), 0.008, 0.0005), 420), seconds);
  const voiced = sum(norm(out), gainOf(norm(thumb), 0.42));
  shape(voiced, t => Math.min(1, (seconds - t) / 0.12));
  return norm(drive(norm(hp(voiced, 38)), 1.25));
};
/* a finger on the rim of a glass, a long way off: a soft tap on a few nearly harmonic modes */
const glass = (rand, midi, seconds) => {
  const f = hz(midi);
  const tap = pad(lp(decay(white(N(0.004), rand), 0.0012, 0.0002), 3400), seconds);
  const out = new Float32Array(tap.length);
  [[1, 1, 0.95], [2, 0.34, 0.6], [3.01, 0.15, 0.46], [4.18, 0.07, 0.26], [5.43, 0.04, 0.16]].forEach(([ratio, g, tau]) => {
    const at = f * ratio * (1 + gauss(rand) * 0.0009);
    resonate(tap, at, tau, out, g);
    resonate(tap, at * 1.0028, tau * 0.9, out, g * 0.5);
  });
  return norm(lp(out, 3000));
};

const themeIntro = rand => {
  const mix = new Mix(LOOP_EARLIEST + 0.2);
  const n = N(7.6);
  /* the deep hit. Its low mode is tuned to D, and it also has the knock a phone can play */
  mix.add(impact(rand, { mass: 3, seconds: 2.6, click: 0.46, knock: 1, low: 1, ringing: 0.11, knockBase: 186, knockTau: 0.12, lowHz: 73.42 * 3 ** 0.22, lowTau: 0.24, ringBase: 587, ringTau: 0.75 }), 0, 0.92, 0, { hall: 0.42 });
  /* the floor under it: two low strings a few cents apart, thinning as the theme settles */
  const floorEnv = ramp([[0, 0], [0.05, 1], [3, 0.7], [6, 0.18], [7.4, 0]]);
  [[-5, -0.5], [6, 0.5]].forEach(([cents, pan]) => {
    const f0 = hz(38) * 2 ** (cents / 1200);
    mix.add(norm(shape(lp(saw(N(7.4), f0, rand), 300, 0.9), floorEnv)), 0, 0.14, pan, { hall: 0.1 });
  });
  /* the rise: narrow noise climbing, and below, the note's own reverb played backwards */
  const riseFor = LAND + 0.01;
  mix.add(norm(shape(filter(white(N(riseFor), rand), 'bp', t => 280 * 15 ** (t / riseFor), 1.5), ramp([[0, 0], [riseFor * 0.65, 0.34], [riseFor * 0.96, 1], [riseFor, 0]]))), 0, 0.085, 0.14, { hall: 0.5 });

  /* THE LEAD. It climbs from D into the high A, overshoots by a hair, and only then opens its vibrato. A long; F short; E held; C short; D long, and dying */
  const pitchAt = ramp([
    [0.4, 74], [0.62, 75.2], [LAND - 0.03, 81.1], [LAND + 0.07, 81.22], [LAND + 0.2, 81],
    [3.12, 81], [3.18, 82], [3.25, 82], [3.31, 81], [3.36, 81], [3.4375, 77],
    [3.68, 77], [3.75, 76], [4.62, 76], [4.6875, 72], [4.93, 72], [5, 74], [6.3, 74], [7.4, 73.86],
  ]);
  const depth = ramp([[LAND + 0.25, 0], [1.7, 9], [2.5, 24], [3.12, 22], [3.3, 6], [3.8, 14], [4.6, 6], [5.1, 3], [5.7, 16], [7.4, 20]]);
  const rate = wander(8.6, 1.3, rand);
  const pitch = new Float32Array(n);
  let vib = rand() * TAU;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    vib += TAU * (5 + (rate(t) - 0.5) * 1.1) / SR;
    pitch[i] = pitchAt(t) + Math.sin(vib) * depth(t) / 100;
  }
  const amp = ramp([[0.4, 0], [0.62, 0.3], [LAND, 1], [1.5, 0.92], [2.4, 1], [3.1, 0.9], [3.4375, 0.78], [3.75, 0.7], [4.6875, 0.58], [5, 0.5], [5.8, 0.26], [6.6, 0.07], [7.4, 0]]);
  const cutoff = ramp([[0.4, 800], [LAND, 5600], [1.6, 3700], [2.5, 5200], [3.2, 3600], [3.75, 2400], [5, 1500], [6, 950], [7.4, 650]]);
  const rasp = ramp([[0.4, 0], [LAND, 0.2], [2.5, 0.14], [3.4, 0.08], [5, 0.03], [7.4, 0]]);
  const send = { hall: 0.45 };
  let centre = null;
  [[-9, -0.86, 0.17, 0], [-3.5, -0.32, 0.2, 0], [0, 0, 0.23, 0], [4, 0.38, 0.2, 0], [10, 0.88, 0.17, 0], [-5, -0.56, 0.12, -12], [6, 0.6, 0.12, -12]].forEach(([detune, pan, gain, octave]) => {
    const voice = leadVoice(rand, n, pitch, { detune, octave, amp, cutoff, rasp });
    if (detune === 0) centre = voice;
    mix.add(voice, 0, gain, pan, send);
  });
  /* the breath around the note */
  const air = filter(white(n, rand), 'bp', t => hz(pitch[Math.min(n - 1, Math.round(t * SR))]) * 1.02, 2);
  mix.add(norm(shape(air, amp)), 0, 0.05, -0.3, { hall: 0.7 });
  /* the swell: what the landing leaves in the hall, backwards, so that the note seems to arrive out of the space */
  const landing = pad(centre.subarray(N(LAND), N(LAND + 0.45)), 1.5);
  [['L', -0.65], ['R', 0.65]].forEach(([side, pan]) => {
    const wet = convolve(landing, room('hall')[side]).reverse();
    mix.add(norm(wet), LAND - 1.5, 0.3, pan, { hall: 0.15 });
  });
  /* the landing itself: a large steel plate, struck once, ringing on the note */
  mix.add(impact(rand, { mass: 1.3, seconds: 1.6, click: 0.34, knock: 0.6, low: 0.42, ringing: 0.32, knockBase: 240, knockTau: 0.07, lowHz: 73.42, lowTau: 0.14, ringBase: 880, ringTau: 0.62 }), LAND, 0.4, 0.06, { hall: 0.72 });

  /* the chord that holds it up, wide, and closing as the lead does */
  const padCut = ramp([[0, 1700], [3, 1300], [6, 620], [8, 480]]);
  [50, 57, 62, 65, 69].forEach(midi => {
    padNote(rand, midi, 7.3, { attack: 0.42, release: 2.3, cutoff: padCut }).forEach(({ x, pan }) => mix.add(x, 0.52 + rand() * 0.05, 0.06, pan, { hall: 0.36 }));
  });
  return mix.render({ peak: INTRO_PEAK, soften: 1.25, fadeFrom: 8.2, fadeTo: LOOP_EARLIEST - 0.15 });
};

/* Every event is written once at a fixed place, the reverb tails run past the end, and all of it is folded back onto one period: so the loop is exactly periodic by construction, tails included */
const themeLoop = rand => {
  const S = PERIOD + 8;
  const mix = new Mix(S);
  const period = N(PERIOD);
  const stems = {};
  const put = (group, x, at, gain, pan, send) => {
    const when = ((at % PERIOD) + PERIOD) % PERIOD;
    mix.add(x, when, gain, pan, send);
    if (!stems[group]) stems[group] = new Float32Array(period);
    const start = N(when);
    for (let i = 0; i < x.length; i += 1) stems[group][(start + i) % period] += x[i] * gain;
  };
  /* THE PAD. Natural minor, no leading tone, so it never quite asks to resolve: Dm7, Bbmaj7, Gm7 (the glass adds its ninth), Asus4, Am */
  [
    { bar: 0, bars: 2, notes: [50, 57, 60, 65] },
    { bar: 2, bars: 2, notes: [46, 53, 57, 65] },
    { bar: 4, bars: 2, notes: [43, 50, 58, 65] },
    { bar: 6, bars: 1, notes: [45, 52, 57, 62] },
    { bar: 7, bars: 1, notes: [45, 52, 57, 60] },
  ].forEach(({ bar, bars, notes }) => {
    notes.forEach(midi => {
      const seconds = bars * BAR + 2.3;
      const base = 600 + rand() * 160;
      const voices = padNote(rand, midi, seconds, { attack: 1.5, release: 2.3, cutoff: () => base });
      const at = bar * BAR - 0.32 + rand() * 0.12;
      const level = 0.078 * (0.9 + rand() * 0.2);
      voices.forEach(({ x, pan }) => put('pad', x, at, level, pan, { hall: 0.34 }));
    });
  });
  /* THE BASS. A muted string on 1, on the swung and-of-2, on 4, and a rest where the phrase breathes */
  const eighth = position => position * (BEAT / 2) + (position % 2 ? SWING : 0);
  [[38, 33], [38, 33], [34, 41], [34, 41], [43, 38], [43, 38], [33, 40], [33, 40]].forEach(([root, fifth], bar) => {
    const notes = [[0, root, 0.95], [6, fifth, 0.72]];
    if (bar !== 3 && bar !== 7) notes.push([3, root, 0.55]);
    if (bar === 1 || bar === 5) notes.push([7, root + 12, 0.32]);
    notes.forEach(([position, midi, vel]) => {
      const v = clamp(vel * (0.9 + rand() * 0.2), 0.2, 1);
      put('bass', pluck(rand, midi, 1.6, v), bar * BAR + eighth(position) + rand() * 0.008, v, (rand() - 0.5) * 0.12, { hall: 0.1, concrete: 0.12 });
    });
  });
  /* THE TICK. A safe's dial in the next room: tick and tock are different parts, and a brush of air on 2 and 4 */
  for (let beat = 0; beat < 32; beat += 1) {
    const tock = beat % 2 === 1;
    const part = ring(burst(rand, 0.5, 8000, 0.07), rand, { base: (tock ? 1720 : 2260) * (0.98 + rand() * 0.04), count: 7, tau: 0.007, tilt: 0.35 });
    put('tick', part, beat * BEAT + rand() * 0.006, (tock ? 0.075 : 0.095) * (0.82 + rand() * 0.36) * (beat % 8 === 0 ? 1.25 : 1), tock ? 0.16 : -0.12, { concrete: 0.25, hall: 0.08 });
    if (tock) put('tick', norm(hp(decay(white(N(0.2), rand), 0.05, 0.006), 3400)), beat * BEAT + 0.002 + rand() * 0.008, 0.016 * (0.8 + rand() * 0.4), 0.3, { concrete: 0.2, hall: 0.12 });
  }
  /* THE MOTIF, once, far off, landing its last note on the Asus4, where the D is the suspended tone */
  [[11.875, 81, 1], [13.4375, 77, 0.85], [13.75, 76, 0.85], [14.6875, 72, 0.65], [15, 74, 0.95]].forEach(([at, midi, vel], index) => {
    const note = glass(rand, midi, 2.6);
    const pan = -0.34 + index * 0.17;
    const when = at + rand() * 0.012;
    put('glass', note, when, 0.22 * vel, pan, { hall: 0.7 });
    const soft = lp(note, 1900);
    put('glass', soft, when + BEAT * 0.75, 0.05 * vel, -pan, { hall: 0.8 });
    put('glass', soft, when + BEAT * 1.5, 0.02 * vel, pan, { hall: 0.8 });
  });
  /* the night itself: air in a large room, drawn over two passes of one noise so that it too comes round */
  const twice = new Float32Array(period * 2);
  const base = white(period, rand);
  twice.set(base); twice.set(base, period);
  const air = lp(hp(twice, 170), 1700).slice(period);
  norm(air);
  for (let i = 0; i < period; i += 1) air[i] *= 1 + 0.3 * Math.cos(TAU * i / period);
  put('air', air, 0, 0.0065, 0, {});

  const wet = mix.render({ peak: 0, fadeFrom: S - 0.6, fadeTo: S - 0.05 });
  const L = new Float32Array(period); const R = new Float32Array(period);
  for (let i = 0; i < wet.L.length; i += 1) { L[i % period] += wet.L[i]; R[i % period] += wet.R[i]; }
  const top = Math.max(peakOf(L), peakOf(R));
  gainOf(L, 1 / top); gainOf(R, 1 / top);
  drive(L, 1.2); drive(R, 1.2);
  const scale = db(LOOP_PEAK) / Math.max(peakOf(L), peakOf(R));
  gainOf(L, scale); gainOf(R, scale);
  console.log(`loop layers, dry, rms whole / above 150 Hz: ${Object.entries(stems).map(([name, x]) => `${name} ${toDb(rmsOf(x)).toFixed(1)}/${toDb(rmsOf(hp(hp(x, 150), 150))).toFixed(1)}`).join(', ')}`);
  return { L, R };
};

const composeTheme = () => {
  const intro = themeIntro(seeded('blackout/theme/intro'));
  const loop = themeLoop(seeded('blackout/theme/loop'));
  const period = N(PERIOD);
  const entry = N(INTRO_END);
  const phase = i => (((i - entry) % period) + period) % period;
  /* the seam goes in the quietest moment available after the intro's tail. The two sides are the same music; only AAC's noise differs, and that is smallest where the music is smallest */
  const earliest = N(LOOP_EARLIEST);
  const reach = N(0.012);
  let from = earliest; let least = Infinity;
  for (let at = earliest + reach; at < earliest + N(0.6); at += N(0.005)) {
    let e = 0;
    for (let k = -reach; k <= reach; k += 4) { const p = phase(at + k); e += loop.L[p] * loop.L[p] + loop.R[p] * loop.R[p]; }
    if (e < least) { least = e; from = at; }
  }
  seamAt.from = from;
  seamAt.to = from + period;
  const total = seamAt.to + N(0.3) + N(0.02);
  const fadeIn = ramp([[5.4, 0], [6.3, 1]]);
  const L = new Float32Array(total); const R = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const g = fadeIn(i / SR);
    const p = phase(i);
    L[i] = (intro.L[i] ?? 0) + loop.L[p] * g;
    R[i] = (intro.R[i] ?? 0) + loop.R[p] * g;
  }
  return { L, R };
};

const seamReport = (tag, { L, R }) => {
  const { from, to } = seamAt;
  let jump = 0; let step = 0; let copies = 0; let copyEnergy = 0; let count = 0;
  const extra = N(0.3);
  [L, R].forEach(x => {
    jump = Math.max(jump, Math.abs(x[from] - x[to - 1]));
    step = Math.max(step, Math.abs(x[to] - x[to - 1]));
    for (let k = 0; k < extra; k += 1) {
      const d = x[from + k] - x[to + k];
      copies = Math.max(copies, Math.abs(d));
      copyEnergy += d * d; count += 1;
    }
  });
  console.log(`seam, ${tag}: jump ${toDb(jump).toFixed(1)} dB against the ordinary step there ${toDb(step).toFixed(1)} dB; the two copies of the extra 0.3 s differ by peak ${toDb(copies).toFixed(1)} dB, rms ${toDb(Math.sqrt(copyEnergy / count)).toFixed(1)} dB`);
};
const decodedOf = (name, file) => {
  const wav = path.join(WORK, `_decoded-${name}.wav`);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', file, wav]);
  const out = readWav(wav);
  fs.unlinkSync(wav);
  return out;
};
const themeReport = (rendered, file) => {
  const { L, R } = rendered;
  const clipPeak = Math.max(peakOf(L), peakOf(R));
  const part = (from, to) => ({ L: L.subarray(from, to), R: R.subarray(from, to) });
  const stat = ({ L: l, R: r }) => `peak ${toDb(Math.max(peakOf(l), peakOf(r))).toFixed(1)} dB, rms ${toDb(rmsOf(monoOf({ L: l, R: r }))).toFixed(1)} dB`;
  console.log(`music: loopStart ${(seamAt.from / SR).toFixed(6)} loopEnd ${(seamAt.to / SR).toFixed(6)}, period ${seamAt.to - seamAt.from} samples, file ${(L.length / SR).toFixed(2)} s; whole peak ${toDb(clipPeak).toFixed(1)} dB (${clipPeak >= 1 ? 'CLIPS' : 'no clip'})`);
  console.log(`intro 0-${INTRO_END} s: ${stat(part(0, N(INTRO_END)))}; the hit 0-0.4: ${stat(part(0, N(0.4)))}; the held note 1.2-3: ${stat(part(N(1.2), N(3)))}`);
  console.log(`loop: ${stat(part(seamAt.from, seamAt.to))}`);
  /* is the held note where it was written? */
  const size = 32768;
  const re = new Float64Array(size); const im = new Float64Array(size);
  const start = N(1.5);
  for (let i = 0; i < size; i += 1) re[i] = (L[start + i] + R[start + i]) * Math.sin(Math.PI * i / size) ** 2;
  fft(re, im, false);
  let best = 0; let bestAt = 0;
  for (let i = Math.floor(600 * size / SR); i < size / 2; i += 1) { const e = re[i] * re[i] + im[i] * im[i]; if (e > best) { best = e; bestAt = i; } }
  console.log(`strongest partial of the held note above 600 Hz: ${(bestAt * SR / size).toFixed(0)} Hz (A5 is 880)`);
  seamReport('rendered', rendered);
  const decoded = decodedOf('music-seam', file);
  seamReport('after AAC', decoded);
  console.log(`after AAC peak ${toDb(Math.max(peakOf(decoded.L), peakOf(decoded.R))).toFixed(1)} dB; level, whole / above 150 Hz / above 1.5 kHz, dB per 2 s:`);
  timeline(rendered, 2);
};

/* a listening preview: not shipped */
const PACKS = {
  blackout: { sounds: BLACKOUT, preview: rendered => blackoutPreview(rendered) },
};

/* ── files ── */
const writeWav = (file, L, R) => {
  const n = L.length;
  const buffer = Buffer.alloc(44 + n * 4);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + n * 4, 4); buffer.write('WAVE', 8); buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22); buffer.writeUInt32LE(SR, 24); buffer.writeUInt32LE(SR * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(n * 4, 40);
  /* fixed dither from its own seed, so that the quiet tails do not turn to steps */
  const rand = seeded(path.basename(file));
  const put = (v, at) => buffer.writeInt16LE(Math.round(clamp(v * 32767 + rand() - rand(), -32768, 32767)), at);
  for (let i = 0; i < n; i += 1) { put(L[i], 44 + i * 4); put(R[i], 46 + i * 4); }
  fs.writeFileSync(file, buffer);
};
const readWav = file => {
  const b = fs.readFileSync(file);
  let at = 12;
  while (b.toString('ascii', at, at + 4) !== 'data') at += 8 + b.readUInt32LE(at + 4);
  const frames = b.readUInt32LE(at + 4) / 4;
  const L = new Float32Array(frames); const R = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) { L[i] = b.readInt16LE(at + 8 + i * 4) / 32768; R[i] = b.readInt16LE(at + 10 + i * 4) / 32768; }
  return { L, R };
};
const encode = (wav, out, bitrate = 96000) => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', String(bitrate), '-q', '127', wav, out]);
};

/* ── the meter. These numbers prove levels and spectra. They do not prove that anything sounds real ── */
const rmsOf = (x, from = 0, to = x.length) => { let e = 0; for (let i = from; i < to; i += 1) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, to - from)); };
const bandShare = (mono, low, high) => {
  let M = 1; while (M < mono.length) M <<= 1;
  const re = new Float64Array(M); const im = new Float64Array(M);
  re.set(mono);
  fft(re, im, false);
  let all = 0; let band = 0;
  for (let i = 1; i < M / 2; i += 1) {
    const f = i * SR / M;
    const e = re[i] * re[i] + im[i] * im[i];
    all += e;
    if (f >= low && f <= high) band += e;
  }
  return band / Math.max(1e-12, all);
};
const monoOf = ({ L, R }) => { const out = new Float32Array(L.length); for (let i = 0; i < L.length; i += 1) out[i] = (L[i] + R[i]) / 2; return out; };
const meter = (name, rendered, file) => {
  const decodedWav = path.join(WORK, `_decoded-${name}.wav`);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', file, decodedWav]);
  const decoded = readWav(decodedWav);
  fs.unlinkSync(decodedWav);
  const mono = monoOf(rendered);
  const phone = hp(hp(mono, 150), 150);
  const first = x => { const limit = peakOf(x) * 0.03; for (let i = 0; i < x.length; i += 1) if (Math.abs(x[i]) > limit) return i / SR * 1000; return 0; };
  console.log([
    name.padEnd(7),
    `${(fs.statSync(file).size / 1024).toFixed(1).padStart(5)} KB`,
    `${(mono.length / SR).toFixed(2)} s`,
    `peak ${toDb(Math.max(peakOf(rendered.L), peakOf(rendered.R))).toFixed(1)} dB`,
    `after AAC ${toDb(Math.max(peakOf(decoded.L), peakOf(decoded.R))).toFixed(1)} dB`,
    `rms ${toDb(rmsOf(mono)).toFixed(1)} dB`,
    `phone rms ${toDb(rmsOf(phone)).toFixed(1)} dB`,
    `150-800 Hz ${(bandShare(mono, 150, 800) * 100).toFixed(0)}%`,
    `starts ${first(mono).toFixed(1)} ms, decoded ${first(monoOf(decoded)).toFixed(1)} ms`,
  ].join(' | '));
};
/* each event as a phone would have it: how hard it hits above 150 Hz, and what share of its first 120 ms is in the knock band */
const marks = (rendered, list) => {
  const mono = monoOf(rendered);
  const phone = hp(hp(mono, 150), 150);
  console.log(Object.entries(list).map(([name, at]) => {
    const from = N(at); const to = N(at + 0.12);
    const hit = peakOf(phone.subarray(Math.max(0, from - N(0.004)), from + N(0.05)));
    const before = rmsOf(phone, Math.max(0, from - N(0.09)), Math.max(1, from - N(0.012)));
    return `${name} phone peak ${toDb(hit).toFixed(1)}, ${toDb(hit / Math.max(1e-6, before)).toFixed(0)} over what precedes, knock ${(bandShare(mono.subarray(from, to), 150, 800) * 100).toFixed(0)}%`;
  }).join('\n'));
};
const timeline = (rendered, step) => {
  const mono = monoOf(rendered);
  const phone = hp(hp(mono, 150), 150);
  const top = hp(hp(mono, 1500), 1500);
  const size = N(step);
  const rows = [];
  for (let from = 0; from + size <= mono.length; from += size) rows.push(`${(from / SR).toFixed(2)}s ${toDb(rmsOf(mono, from, from + size)).toFixed(0).padStart(4)}/${toDb(rmsOf(phone, from, from + size)).toFixed(0).padStart(4)}/${toDb(rmsOf(top, from, from + size)).toFixed(0).padStart(4)}`);
  for (let i = 0; i < rows.length; i += 5) console.log(`  ${rows.slice(i, i + 5).join('  ')}`);
};

/* What a player hears, built from the shipped music file and with the player's own numbers (packAudio.ts). Not shipped */
const atRate = (source, rate) => {
  const n = Math.floor(source.L.length / rate);
  const L = new Float32Array(n); const R = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const at = i * rate; const k = Math.floor(at); const f = at - k;
    L[i] = source.L[k] + ((source.L[k + 1] ?? 0) - source.L[k]) * f;
    R[i] = source.R[k] + ((source.R[k + 1] ?? 0) - source.R[k]) * f;
  }
  return { L, R };
};
const blackoutPreview = rendered => {
  const S = 75;
  const total = N(S);
  const music = decodedOf('music-preview', path.join(ROOT, 'assets/audio/packs/blackout/music.m4a'));
  const M = { L: new Float32Array(total), R: new Float32Array(total) };
  /* the decode's wait after the tap, then the source's own loop */
  let read = 0;
  for (let i = N(0.35); i < total; i += 1) {
    M.L[i] = music.L[read]; M.R[i] = music.R[read];
    read += 1;
    if (read >= seamAt.to) read = seamAt.from;
  }
  const finalAt = 44.2;
  const backAt = finalAt + 1.5; const backFor = 2.5;
  const level = t => {
    if (t < finalAt) return 1;
    if (t < backAt) return 0.05 + 0.95 * Math.exp(-(t - finalAt) / 0.07);
    return t < backAt + backFor ? 0.05 + 0.95 * (t - backAt) / backFor : 1;
  };
  const cutoffAt = t => {
    if (t < finalAt) return 20000;
    if (t < backAt) return 220 + 19780 * Math.exp(-(t - finalAt) / 0.09);
    return t < backAt + backFor ? 220 * (20000 / 220) ** ((t - backAt) / backFor) : 20000;
  };
  const L = lp(M.L, cutoffAt, 0.7); const R = lp(M.R, cutoffAt, 0.7);
  for (let i = 0; i < total; i += 1) { const g = level(i / SR); L[i] *= g; R[i] *= g; }
  const over = (source, at) => {
    const start = N(at);
    for (let i = 0; i < source.L.length && start + i < total; i += 1) { L[start + i] += source.L[i]; R[start + i] += source.R[i]; }
  };
  const jitter = seeded('blackout/preview');
  [26.6, 29.1, 31.7, 34, 36.6, 39.2, 41.6].forEach((at, index) => over(atRate(rendered.tap, 1 + (index + 1) * 0.016 + (jitter() - 0.5) * 0.03), at));
  over(rendered.final, finalAt);
  over(rendered.notify, 63);
  for (let i = N(71.5); i < total; i += 1) { const g = Math.cos(((i / SR - 71.5) / 3.5) * Math.PI / 2) ** 2; L[i] *= g; R[i] *= g; }
  const wav = path.join(WORK, 'blackout-preview2.wav');
  writeWav(wav, L, R);
  const out = path.join(PREVIEWS, 'blackout-preview2.m4a');
  encode(wav, out, 128000);
  const top = Math.max(peakOf(L), peakOf(R));
  console.log(`preview ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${S} s, peak ${toDb(top).toFixed(1)} dB (${top >= 1 ? 'CLIPS' : 'no clip'}), seams heard at ${[0, 1, 2].map(k => (0.35 + (seamAt.to + k * (seamAt.to - seamAt.from)) / SR).toFixed(1)).join(', ')} s, ${out}`);
};

/* ── main ── */
const packId = process.argv[2];
const pack = PACKS[packId];
if (!pack) {
  console.error(`usage: node scripts/audio/render-pack-sounds.mjs <${Object.keys(PACKS).join('|')}>`);
  process.exit(2);
}
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(PREVIEWS, { recursive: true });
const rendered = {};
for (const [name, recipe] of Object.entries(pack.sounds)) {
  if (recipe.compose) {
    rendered[name] = recipe.compose();
  } else {
    const mix = new Mix(recipe.seconds);
    recipe.build(mix, seeded(`${packId}/${name}`));
    rendered[name] = mix.render(recipe);
  }
  const wav = path.join(WORK, `${packId}-${name}.wav`);
  writeWav(wav, rendered[name].L, rendered[name].R);
  const out = path.join(ROOT, 'assets/audio/packs', packId, `${name}.m4a`);
  encode(wav, out, recipe.bitrate);
  meter(name, rendered[name], out);
  if (recipe.marks) marks(rendered[name], recipe.marks);
  if (recipe.after) recipe.after(rendered[name], out);
}
pack.preview(rendered);
