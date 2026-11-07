#!/usr/bin/env node
/**
 * #265: renders the opening night's sound, offline, into WAV files. Zeesh (2026-11-05): "need better sound ig , its sound really ai". The old sound was a few oscillators and
 * filtered noise, played live. Nothing heavy can be done live on a phone; everything heavy can be done here, once, and shipped as small files:
 *
 *   a crowd made of hundreds of separate voices, each with its own pitch, vowel and shout, and thousands of separate claps, instead of one band of noise;
 *   real rooms: a generated stadium, hall and living room that everything is convolved with, because the room is what makes a sound seem to have happened somewhere;
 *   a score: low strings, string pads, felt piano, taiko and brass, in one key from the first second to the last.
 *
 * Usage: node scripts/audio/render-opening-night.mjs <outDir> [stem…]. No dependencies. Then convert with scripts/audio/encode.sh. The WAVs are not committed; the .m4a files are.
 */
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const TAU = Math.PI * 2;
const N = seconds => Math.max(1, Math.round(seconds * SR));
const db = value => 10 ** (value / 20);
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

/* notes */
const NOTE = { E1: 41.2, B1: 61.74, C2: 65.41, D2: 73.42, E2: 82.41, Fs2: 92.5, G2: 98, A2: 110, B2: 123.47, C3: 130.81, Cs3: 138.59, D3: 146.83, Ds3: 155.56, E3: 164.81, Fs3: 185, G3: 196, Gs3: 207.65, A3: 220, B3: 246.94, C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, Fs4: 369.99, G4: 392, Gs4: 415.3, A4: 440, B4: 493.88, Cs5: 554.37, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, Gs5: 830.61, B5: 987.77, Cs6: 1108.73, E6: 1318.51 };

/* ── filters ── */
const coef = (type, f, Q = 0.707, gainDb = 0) => {
  const w = TAU * clamp(f, 10, SR * 0.48) / SR;
  const c = Math.cos(w);
  const alpha = Math.sin(w) / (2 * Q);
  const A = 10 ** (gainDb / 40);
  let b0; let b1; let b2; let a0; let a1; let a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
  else if (type === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha; }
  else if (type === 'ls') { const q = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) - (A - 1) * c + q); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - q); a0 = (A + 1) + (A - 1) * c + q; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - q; }
  else if (type === 'hs') { const q = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) + (A - 1) * c + q); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - q); a0 = (A + 1) - (A - 1) * c + q; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - q; }
  else { b0 = 1 + alpha * A; b1 = -2 * c; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * c; a2 = 1 - alpha / A; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
};
const filter = (x, type, f, Q, gainDb) => {
  const out = new Float32Array(x.length);
  let [b0, b1, b2, a1, a2] = coef(type, typeof f === 'function' ? f(0) : f, Q, gainDb);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    if (typeof f === 'function' && i % 48 === 0) [b0, b1, b2, a1, a2] = coef(type, f(i / SR), Q, gainDb);
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
/* a band-limited sawtooth: without this the high notes alias, and that is half of what sounds cheap */
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
const sine = (n, freq, phase = 0) => {
  const out = new Float32Array(n);
  const fn = typeof freq === 'function' ? freq : null;
  let ph = phase;
  for (let i = 0; i < n; i += 1) { ph += TAU * (fn ? fn(i / SR) : freq) / SR; out[i] = Math.sin(ph); }
  return out;
};

/* ── shaping ── */
const shape = (x, fn) => { for (let i = 0; i < x.length; i += 1) x[i] *= fn(i / SR); return x; };
const decay = (x, tau, attack = 0.002) => shape(x, t => Math.min(1, t / attack) * Math.exp(-t / tau));
const gainOf = (x, g) => { for (let i = 0; i < x.length; i += 1) x[i] *= g; return x; };
const drive = (x, k) => { const norm = Math.tanh(k); for (let i = 0; i < x.length; i += 1) x[i] = Math.tanh(x[i] * k) / norm; return x; };
const sum = (...parts) => {
  const out = new Float32Array(Math.max(...parts.map(p => p.length)));
  for (const p of parts) for (let i = 0; i < p.length; i += 1) out[i] += p[i];
  return out;
};
/* a slow random wander, 0–1 */
const wander = (seconds, rate, rand) => {
  const points = Math.ceil(seconds * rate) + 3;
  const values = Array.from({ length: points }, () => rand());
  return t => { const at = t * rate; const i = Math.floor(at); const f = at - i; const s = f * f * (3 - 2 * f); return values[i] + (values[i + 1] - values[i]) * s; };
};
const ramp = (points) => t => {
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

/* ── FFT, for the rooms ── */
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

/* ── the rooms ── */
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
    /* the first few walls, heard one by one */
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
const ROOMS = {
  stadium: makeRoom({ seconds: 4.2, low: 4, mid: 3, high: 1.3, predelay: 0.07, early: [[0.11, 0.5, 2600], [0.19, 0.42, 2000], [0.31, 0.5, 1500], [0.47, 0.34, 1100], [0.68, 0.22, 800]], seed: 'stadium' }),
  hall: makeRoom({ seconds: 3, low: 2.7, mid: 2.1, high: 0.95, predelay: 0.024, early: [[0.03, 0.4, 5000], [0.052, 0.3, 4000], [0.083, 0.24, 3200]], seed: 'hall' }),
  room: makeRoom({ seconds: 0.7, low: 0.5, mid: 0.38, high: 0.22, predelay: 0.004, early: [[0.008, 0.6, 5000], [0.015, 0.45, 4000], [0.023, 0.3, 3000]], seed: 'room' }),
  city: makeRoom({ seconds: 3, low: 2.4, mid: 1.3, high: 0.5, predelay: 0.12, early: [[0.2, 0.5, 1800], [0.42, 0.34, 1200], [0.75, 0.2, 800]], seed: 'city' }),
  /* the open sky over a city: hardly any room at all, just buildings answering one at a time, each further and duller */
  sky: makeRoom({ seconds: 3.4, low: 3, mid: 1.2, high: 0.32, predelay: 0.14, early: [[0.19, 0.95, 2400], [0.34, 1.05, 1700], [0.53, 0.86, 1250], [0.79, 0.72, 900], [1.12, 0.55, 680], [1.54, 0.38, 500], [2.05, 0.26, 380]], seed: 'sky' }),
};

/* ── the mix: everything goes in dry, with what it sends to which room ── */
class Mix {
  constructor(seconds) {
    this.seconds = seconds;
    const n = N(seconds);
    this.L = new Float32Array(n); this.R = new Float32Array(n);
    this.sends = {};
  }
  add(x, at, gain = 1, pan = 0, send = {}) {
    const start = Math.round(at * SR);
    const angle = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    const gl = Math.cos(angle) * gain; const gr = Math.sin(angle) * gain;
    const n = this.L.length;
    for (let i = 0; i < x.length; i += 1) {
      const k = start + i;
      if (k < 0) continue;
      if (k >= n) break;
      this.L[k] += x[i] * gl; this.R[k] += x[i] * gr;
    }
    for (const [room, amount] of Object.entries(send)) {
      if (!this.sends[room]) this.sends[room] = { L: new Float32Array(n), R: new Float32Array(n) };
      const s = this.sends[room];
      for (let i = 0; i < x.length; i += 1) {
        const k = start + i;
        if (k < 0) continue;
        if (k >= n) break;
        s.L[k] += x[i] * gl * amount; s.R[k] += x[i] * gr * amount;
      }
    }
  }
  addStereo(other, at, gain = 1, send = {}) {
    const start = Math.round(at * SR);
    const n = this.L.length;
    for (let i = 0; i < other.L.length; i += 1) {
      const k = start + i;
      if (k < 0) continue;
      if (k >= n) break;
      this.L[k] += other.L[i] * gain; this.R[k] += other.R[i] * gain;
    }
    for (const [room, amount] of Object.entries(send)) {
      if (!this.sends[room]) this.sends[room] = { L: new Float32Array(n), R: new Float32Array(n) };
      const s = this.sends[room];
      for (let i = 0; i < other.L.length; i += 1) {
        const k = start + i;
        if (k < 0) continue;
        if (k >= n) break;
        s.L[k] += other.L[i] * gain * amount; s.R[k] += other.R[i] * gain * amount;
      }
    }
  }
  /* into the rooms */
  render() {
    const out = { L: this.L.slice(), R: this.R.slice() };
    for (const [room, s] of Object.entries(this.sends)) {
      const wetL = convolve(s.L, ROOMS[room].L);
      const wetR = convolve(s.R, ROOMS[room].R);
      for (let i = 0; i < out.L.length; i += 1) { out.L[i] += wetL[i]; out.R[i] += wetR[i]; }
    }
    return out;
  }
}

/* ── the crowd: separate people ── */
const VOWELS = [[750, 1200, 2500], [480, 850, 2400], [320, 2300, 3000], [550, 1800, 2500], [350, 800, 2300]];
const voicePool = (count, seed, { falling = false } = {}) => {
  const rand = seeded(`voices${seed}`);
  return Array.from({ length: count }, () => {
    const duration = 0.45 + rand() * 1.35;
    const n = N(duration);
    const woman = rand() < 0.46;
    const f0 = woman ? 195 + rand() * 150 : 100 + rand() * 85;
    const lift = falling ? -0.28 - rand() * 0.3 : 0.08 + rand() * 0.42;
    const peakAt = falling ? 0.1 : 0.3 + rand() * 0.3;
    const vibRate = 4 + rand() * 3;
    const vibPhase = rand() * TAU;
    const vowel = falling ? VOWELS[1] : VOWELS[Math.floor(rand() * VOWELS.length)];
    const contour = t => {
      const at = t / duration;
      const c = at < peakAt ? at / peakAt : 1 - (at - peakAt) / (1 - peakAt) * (falling ? 0 : 0.7);
      return f0 * (1 + lift * (falling ? at : c)) * (1 + 0.012 * Math.sin(TAU * vibRate * t + vibPhase));
    };
    const source = sum(gainOf(saw(n, contour, rand), 0.7), gainOf(white(n, rand), 0.14));
    const scale = woman ? 1.16 : 1;
    const voice = sum(
      gainOf(bp(source, vowel[0] * scale, 6), 1),
      gainOf(bp(source, vowel[1] * scale, 8), 0.62),
      gainOf(bp(source, vowel[2] * scale, 9), 0.26),
    );
    const attack = 0.05 + rand() * 0.16;
    const release = 0.18 + rand() * 0.4;
    shape(voice, t => Math.min(1, t / attack) * Math.min(1, (duration - t) / release));
    /* they are far away: the top of the voice has gone */
    return lp(voice, 2400 + rand() * 2400);
  });
};
const whistlePool = (count, seed) => {
  const rand = seeded(`whistles${seed}`);
  return Array.from({ length: count }, () => {
    const duration = 0.35 + rand() * 0.9;
    const n = N(duration);
    const f = 1900 + rand() * 1500;
    const up = rand() < 0.6;
    const wobble = 5 + rand() * 5;
    const tone = sine(n, t => f * (1 + (up ? 0.22 : -0.15) * (t / duration)) * (1 + 0.012 * Math.sin(TAU * wobble * t)));
    const breath = gainOf(bp(white(n, rand), f, 8), 0.3);
    return shape(sum(tone, breath), t => Math.min(1, t / 0.03) * Math.min(1, (duration - t) / 0.12));
  });
};
const crowd = (seconds, density, seed, { rate = 300, whistles = 1, falling = false } = {}) => {
  const rand = seeded(`crowd${seed}`);
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  /* under the voices, the sum of everyone too far away to hear one by one */
  [[300, 1, 0.9], [680, 1.2, 1], [1200, 1.4, 0.72], [2500, 1.7, 0.3]].forEach(([f, Q, level]) => {
    for (const side of ['L', 'R']) {
      const swell = wander(seconds, 0.5 + rand(), rand);
      const band = bp(pink(n, rand), f, Q);
      for (let i = 0; i < n; i += 1) out[side][i] += band[i] * level * 1.9 * (0.62 + 0.38 * swell(i / SR)) * density(i / SR);
    }
  });
  const voices = voicePool(falling ? 90 : 170, seed, { falling });
  const place = (grain, at, gain, pan) => {
    const start = Math.round(at * SR);
    const angle = (pan + 1) * Math.PI / 4;
    const gl = Math.cos(angle) * gain; const gr = Math.sin(angle) * gain;
    for (let i = 0; i < grain.length; i += 1) {
      const k = start + i;
      if (k >= n) break;
      out.L[k] += grain[i] * gl; out.R[k] += grain[i] * gr;
    }
  };
  for (let t = 0; t < seconds; t += 1 / rate) {
    if (rand() < density(t)) place(voices[Math.floor(rand() * voices.length)], t + rand() / rate, (0.06 + rand() ** 2 * 0.22), rand() * 2 - 1);
  }
  if (whistles > 0) {
    const pool = whistlePool(14, seed);
    for (let t = 0; t < seconds; t += 0.08) {
      if (rand() < density(t) * 0.26 * whistles) place(pool[Math.floor(rand() * pool.length)], t, 0.012 + rand() * 0.04, rand() * 2 - 1);
    }
  }
  return out;
};

/* ── applause: separate pairs of hands ── */
const clapPool = (count, seed) => {
  const rand = seeded(`claps${seed}`);
  return Array.from({ length: count }, () => {
    const n = N(0.012 + rand() * 0.03);
    const body = 800 + rand() * 1900;
    const burst = decay(white(n, rand), 0.0022 + rand() * 0.005, 0.0004);
    return sum(gainOf(bp(burst, body, 1.8 + rand() * 2), 1.6), gainOf(hp(burst, 2500), 0.32));
  });
};
const applause = (seconds, density, seed, people = 520) => {
  const rand = seeded(`applause${seed}`);
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  const pool = clapPool(64, seed);
  for (let p = 0; p < people; p += 1) {
    const stops = rand();
    const period = 0.19 + rand() * 0.2;
    const pan = rand() * 2 - 1;
    const angle = (pan + 1) * Math.PI / 4;
    const loud = 0.25 + rand() ** 2 * 0.9;
    const gl = Math.cos(angle) * loud; const gr = Math.sin(angle) * loud;
    const hands = pool[Math.floor(rand() * pool.length)];
    let t = rand() * 0.4;
    while (t < seconds) {
      if (density(t) > stops) {
        const start = Math.round(t * SR);
        for (let i = 0; i < hands.length; i += 1) {
          const k = start + i;
          if (k >= n) break;
          out.L[k] += hands[i] * gl; out.R[k] += hands[i] * gr;
        }
      }
      t += period * (0.92 + rand() * 0.16);
    }
  }
  return out;
};

/* ── thirty thousand feet on one beat ── */
const stomp = (seed, people = 240) => {
  const rand = seeded(`stomp${seed}`);
  const n = N(0.34);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  for (let p = 0; p < people; p += 1) {
    const grain = lp(decay(white(N(0.09), rand), 0.028, 0.002), 150 + rand() * 150);
    const start = Math.max(0, Math.round((0.06 + gauss(rand) * 0.02) * SR));
    const pan = rand() * 2 - 1;
    for (let i = 0; i < grain.length; i += 1) {
      const k = start + i;
      if (k >= n) break;
      out.L[k] += grain[i] * (1 - pan) * 0.1; out.R[k] += grain[i] * (1 + pan) * 0.1;
    }
  }
  return out;
};

/* ── the percussion ── */
const taiko = (f, tau, rand) => {
  const n = N(tau * 6);
  const body = sine(n, t => f * (1 + 0.7 * Math.exp(-t / 0.03)));
  const second = sine(n, t => f * 1.59 * (1 + 0.4 * Math.exp(-t / 0.02)));
  const skin = lp(decay(white(N(0.03), rand), 0.008, 0.0005), 1500);
  return drive(sum(decay(body, tau), gainOf(decay(second, tau * 0.35), 0.35), gainOf(skin, 0.7)), 1.5);
};
const woodTick = rand => {
  const n = N(0.07);
  return sum(gainOf(decay(sine(n, 1850), 0.006, 0.0002), 1), gainOf(decay(sine(n, 3150), 0.0032, 0.0002), 0.6), gainOf(decay(hp(white(n, rand), 3000), 0.0016, 0.0001), 0.5));
};
const subDrop = (from, to, seconds, tau) => {
  const n = N(seconds);
  return drive(decay(sine(n, t => to + (from - to) * Math.exp(-t / (seconds * 0.22))), tau, 0.003), 1.6);
};
const crash = (seconds, rand) => {
  const n = N(seconds);
  const noise = hp(white(n, rand), 5200);
  const metal = new Float32Array(n);
  for (let p = 0; p < 26; p += 1) {
    const f = 3200 + rand() * 8600;
    const tau = 0.25 + rand() * 0.9;
    const part = decay(sine(n, f, rand() * TAU), tau, 0.0005);
    for (let i = 0; i < n; i += 1) metal[i] += part[i] * 0.04;
  }
  return sum(decay(noise, seconds * 0.3, 0.0008), metal);
};
/* brass, close and hard: detuned, opened and closed by a filter, driven until it growls. The trailer sound. */
const braam = (notes, seconds, { open = 1900, shut = 420, tau = 1.4, push = 2.6, seed = 'braam' } = {}) => {
  const rand = seeded(seed);
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  notes.forEach(note => {
    for (let v = 0; v < 6; v += 1) {
      const cents = (v - 2.5) * 5 + rand() * 3;
      const f = note * 2 ** (cents / 1200);
      const voice = saw(n, t => f * (1 + 0.003 * Math.sin(TAU * 4.6 * t + v)) * (1 - 0.02 * Math.exp(-t / 0.05)), rand);
      const pan = (v - 2.5) / 2.5 * 0.7;
      for (let i = 0; i < n; i += 1) { out.L[i] += voice[i] * (1 - pan) * 0.5; out.R[i] += voice[i] * (1 + pan) * 0.5; }
    }
  });
  const motion = t => (t < 0.09 ? shut + (open - shut) * (t / 0.09) : shut + (open - shut) * Math.exp(-(t - 0.09) / (tau * 0.55)));
  const amp = t => Math.min(1, t / 0.018) * Math.exp(-t / tau);
  const scale = 0.32 / Math.sqrt(notes.length);
  const finish = x => shape(drive(gainOf(filter(x, 'lp', motion, 1.1), scale), push), amp);
  return { L: finish(out.L), R: finish(out.R) };
};
/* a section of strings: many slightly different players */
const strings = (notes, seconds, { attack = 0.5, release = 0.9, cutoff = 1900, players = 7, seed = 'strings', tremolo = null } = {}) => {
  const rand = seeded(seed);
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  notes.forEach(note => {
    for (let v = 0; v < players; v += 1) {
      const cents = (rand() - 0.5) * 16;
      const f = note * 2 ** (cents / 1200);
      const rate = 4.8 + rand() * 1.4;
      const phase = rand() * TAU;
      const voice = saw(n, t => f * (1 + 0.0042 * Math.sin(TAU * rate * t + phase)), rand);
      const pan = rand() * 1.6 - 0.8;
      for (let i = 0; i < n; i += 1) { out.L[i] += voice[i] * (1 - pan) * 0.5; out.R[i] += voice[i] * (1 + pan) * 0.5; }
    }
  });
  const amp = t => Math.min(1, t / attack) ** 1.4 * Math.min(1, Math.max(0, seconds - t) / release) * (tremolo ? 0.6 + 0.4 * Math.sin(TAU * tremolo(t) * t) : 1);
  const scale = 0.16 / Math.sqrt(notes.length * players / 6);
  const finish = x => { const f = typeof cutoff === 'function' ? cutoff : () => cutoff; return shape(gainOf(filter(hp(x, 110), 'lp', f, 0.8), scale), amp); };
  return { L: finish(out.L), R: finish(out.R) };
};
/* short bowed notes, low: the engine of every trailer */
const spiccato = (note, rand) => {
  const n = N(0.34);
  const voices = [saw(n, note * 1.002, rand), saw(n, note * 0.998, rand), gainOf(saw(n, note * 2.001, rand), 0.45)];
  return decay(filter(sum(...voices), 'lp', t => 500 + 1500 * Math.exp(-t / 0.05), 1), 0.085, 0.003);
};
/* felt piano: soft hammer, a few slightly sharp partials */
const piano = (f, seconds, rand) => {
  const n = N(seconds);
  const parts = [[1, 1, 1.4], [2.002, 0.5, 0.9], [3.006, 0.22, 0.55], [4.012, 0.1, 0.35], [5.02, 0.05, 0.22]];
  const tone = new Float32Array(n);
  parts.forEach(([ratio, level, tau]) => {
    const part = decay(sine(n, f * ratio, rand() * TAU), tau, 0.006);
    for (let i = 0; i < n; i += 1) tone[i] += part[i] * level;
  });
  const felt = lp(decay(white(N(0.03), rand), 0.006, 0.001), 900);
  return lp(sum(gainOf(tone, 0.5), gainOf(felt, 0.12)), 2600);
};
const bell = (f, seconds, rand) => {
  const n = N(seconds);
  const tone = new Float32Array(n);
  [[1, 1, 1.2], [2.76, 0.42, 0.5], [5.4, 0.2, 0.24], [8.93, 0.08, 0.12]].forEach(([ratio, level, tau]) => {
    const part = decay(sine(n, f * ratio, rand() * TAU), tau, 0.0012);
    for (let i = 0; i < n; i += 1) tone[i] += part[i] * level;
  });
  return gainOf(tone, 0.4);
};
const marimba = (f, rand) => {
  const n = N(0.5);
  const tone = new Float32Array(n);
  [[1, 1, 0.16], [3.93, 0.32, 0.04], [9.2, 0.1, 0.012]].forEach(([ratio, level, tau]) => {
    const part = decay(sine(n, f * ratio, rand() * TAU), tau, 0.0008);
    for (let i = 0; i < n; i += 1) tone[i] += part[i] * level;
  });
  return gainOf(tone, 0.6);
};
const whoosh = (seconds, peakAt, rand, { low = 180, high = 3800, Q = 1.1 } = {}) => {
  const n = N(seconds);
  const sweep = t => (t < peakAt ? low + (high - low) * (t / peakAt) ** 2 : low + (high - low) * ((seconds - t) / (seconds - peakAt)) ** 2);
  const air = filter(pink(n, rand), 'bp', sweep, Q);
  return shape(gainOf(air, 2.6), t => (t < peakAt ? (t / peakAt) ** 1.8 : ((seconds - t) / (seconds - peakAt)) ** 1.4));
};
const riser = (seconds, rand) => {
  const n = N(seconds);
  const air = filter(pink(n, rand), 'bp', t => 300 * (5200 / 300) ** (t / seconds), 2);
  const tone = filter(sum(saw(n, t => 82.41 * 2 ** (2.2 * t / seconds), rand), gainOf(saw(n, t => 164.82 * 2 ** (2.2 * t / seconds), rand), 0.6)), 'lp', t => 300 + 3600 * (t / seconds) ** 2, 1.2);
  const flutter = t => 0.72 + 0.28 * Math.sin(TAU * (5 + 22 * (t / seconds) ** 1.6) * t);
  return shape(sum(gainOf(air, 3), gainOf(tone, 0.28)), t => (t / seconds) ** 2.2 * flutter(t));
};
/*
 * #266: fireworks. Zeesh: "last me fire crasker wala fake lag rha". The old one was a sine wave sweeping down, which is a kick drum, every 0.62 seconds, which is a drum machine.
 * A real shell has no pitch at all. It is one shock wave: a spike of pressure and a longer dip (an N-wave), so short it is mostly a crack, and too loud for whatever is recording it,
 * so it clips. Air takes the top off it with distance. What you then hear for the next two seconds is the city answering, wall by wall, and a low roll that has no note in it.
 * Then the stars: separate tiny explosions, a few loud and most faint, thick at first and thinning out, or the long sizzle of a willow coming down.
 */
const nWave = (seconds, rand) => {
  const n = N(seconds);
  const out = new Float32Array(n);
  /* the spike, then the dip, a little different each time */
  const up = 0.0012 + rand() * 0.0016;
  const down = up * (2.2 + rand() * 1.4);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    if (t < up) out[i] = Math.sin(Math.PI * t / up);
    else if (t < up + down) out[i] = -0.62 * Math.sin(Math.PI * (t - up) / down);
  }
  return out;
};
const star = (rand, loud) => {
  /* one small explosion: a click, with a hard edge, and almost no body */
  const n = N(0.006 + rand() * 0.012);
  const snap = decay(white(n, rand), 0.0007 + rand() * 0.0022, 0.00008);
  const edge = gainOf(nWave(0.006, rand), 0.5);
  return gainOf(drive(lp(hp(sum(snap, edge), 900 + rand() * 1500), 7000 + rand() * 6000), 2.2), loud);
};
/* kind: PEONY a boom and its stars; SALUTE just a bang; WILLOW a boom and a long sizzle coming down; FINALE everything, bigger. `far` 0–1. */
const firework = (rand, kind = 'PEONY', far = 0.5) => {
  const seconds = kind === 'WILLOW' ? 4.4 : 3.4;
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n), far };
  const big = kind === 'FINALE' ? 1.3 : kind === 'SALUTE' ? 1.05 : 0.86 + rand() * 0.2;
  const shock = gainOf(nWave(0.03, rand), 1.5);
  const air = decay(white(N(0.05), rand), 0.0052, 0.0001);
  const crack = lp(hp(sum(shock, gainOf(air, 1.5)), 70), 8800 - far * 5200);
  /* the air shaken after it: wide and low, no note, dying unevenly */
  const body = gainOf(lp(decay(brown(N(0.7), rand), 0.07 + rand() * 0.05, 0.0008), 520 - far * 200), 2.2);
  const swell = wander(2.4, 3.4, rand);
  const roll = shape(gainOf(lp(brown(N(2.4), rand), 150 + rand() * 60), 1), t => Math.min(1, t / 0.012) * Math.exp(-t / 0.34) * (0.5 + 0.5 * swell(t)));
  /* too loud for the microphone: every phone video of fireworks sounds like this */
  const bang = gainOf(drive(sum(crack, body, roll), 2.6), big);
  const pan = (rand() * 1.5 - 0.75);
  for (let i = 0; i < bang.length; i += 1) { out.L[i] += bang[i] * (1 - pan) * 0.5; out.R[i] += bang[i] * (1 + pan) * 0.5; }
  const place = (grain, at, where) => {
    const start = N(at);
    for (let i = 0; i < grain.length && start + i < n; i += 1) { out.L[start + i] += grain[i] * (1 - where) * 0.5; out.R[start + i] += grain[i] * (1 + where) * 0.5; }
  };
  if (kind === 'PEONY' || kind === 'FINALE') {
    /* the stars go off in a thick burst, then stragglers */
    const count = kind === 'FINALE' ? 620 : 240 + Math.floor(rand() * 240);
    const lag = 0.26 + rand() * 0.34;
    for (let c = 0; c < count; c += 1) {
      const at = lag + (-Math.log(1 - rand() * 0.985)) * 0.42;
      if (at > seconds - 0.05) continue;
      /* a few loud, most faint */
      place(star(rand, 0.075 + rand() ** 4 * (1.05 - far * 0.45)), at, pan * 0.5 + rand() * 1.2 - 0.6);
    }
  }
  if (kind === 'WILLOW' || kind === 'FINALE') {
    /* the glitter falling: a hiss with a flutter in it */
    const length = kind === 'WILLOW' ? 3.6 : 2.4;
    const m = N(length);
    const flutter = wander(length, 26, rand);
    const hiss = shape(gainOf(bp(white(m, rand), 6800, 0.8), 0.34), t => Math.min(1, t / 0.35) * (1 - t / length) ** 1.6 * (0.45 + 0.55 * flutter(t)));
    place(hiss, 0.4, pan * 0.4);
    for (let c = 0; c < 120; c += 1) place(star(rand, 0.05 + rand() ** 4 * 0.42), 0.45 + rand() ** 1.5 * (length - 0.5), rand() * 1.6 - 0.8);
  }
  return out;
};
/* Far off and low, before each one: the thud of the mortar that sent it up. */
const mortar = rand => gainOf(drive(lp(decay(brown(N(0.34), rand), 0.05, 0.001), 240), 2), 1.6);
/* The barrage, seconds after the peak: the picture's shells burst at exactly these (FIREWORK_TIMES in nightFormations.ts). */
const FIREWORK_TIMES = [0.14, 0.58, 1.33, 1.71, 2.62, 3.05, 3.9];
const BARRAGE = [
  { kind: 'PEONY', far: 0.35, lag: 0.17 }, { kind: 'SALUTE', far: 0.55, lag: 0.23 }, { kind: 'PEONY', far: 0.2, lag: 0.13 }, { kind: 'WILLOW', far: 0.6, lag: 0.27 },
  { kind: 'SALUTE', far: 0.3, lag: 0.15 }, { kind: 'PEONY', far: 0.5, lag: 0.21 }, { kind: 'FINALE', far: 0.15, lag: 0.12 },
];
const barrageDuck = (shells, depth) => t => {
  let quiet = 1;
  BARRAGE.slice(0, shells).forEach(({ lag }, index) => {
    const since = t - (FIREWORK_TIMES[index] + lag);
    if (since >= -0.004) quiet = Math.min(quiet, 1 - depth * Math.exp(-Math.max(0, since) / 0.24));
  });
  return quiet;
};
const addBarrage = (mix, rand, shells, level) => {
  BARRAGE.slice(0, shells).forEach(({ kind, far, lag }, index) => {
    /* the light arrives first; the sound follows, later the further off it is */
    const at = FIREWORK_TIMES[index] + lag;
    mix.addStereo(firework(rand, kind, far), at, level * (1 - far * 0.42), { sky: 0.2 + far * 0.3 });
    if (at > 0.9) mix.add(mortar(rand), at - 0.72 - rand() * 0.14, 0.2 * level, rand() * 0.8 - 0.4, { city: 0.5 });
  });
};

/* ── the stems. Each starts when its cue fires, and they share one key: E ── */
const STEMS = {
  /* T-10 to zero. Sixty beats a minute. In the last instant before zero, nothing at all. */
  count: () => {
    const seconds = 10;
    const rand = seeded('count');
    const mix = new Mix(seconds);
    const blackout = 9.83;
    const level = ramp([[0, 0.34], [7, 0.6], [9.8, 1]]);
    const people = crowd(seconds, ramp([[0, 0.16], [6, 0.34], [8.8, 0.72], [9.8, 1]]), 'count', { whistles: 0.5 });
    mix.addStereo(people, 0, 0.95, { stadium: 0.9 });
    /* low strings holding one note under everything, and high ones starting to shake */
    mix.addStereo(strings([NOTE.E2, NOTE.B2], seconds, { attack: 2.5, release: 0.05, cutoff: t => 300 + 500 * t / seconds, seed: 'count-low' }), 0, 0.5, { hall: 0.4 });
    mix.addStereo(strings([NOTE.E4, NOTE.B4, NOTE.E5], seconds, { attack: 6, release: 0.05, cutoff: 3400, players: 6, seed: 'count-high', tremolo: t => 7 + 8 * t / seconds }), 0, 0.42, { hall: 0.6 });
    for (let beat = 0; beat < 10; beat += 1) {
      const loud = level(beat);
      mix.add(woodTick(rand), beat, 0.22 + 0.12 * loud, 0.12, { hall: 0.28 });
      mix.add(taiko(68, 0.34, rand), beat, 0.34 + 0.5 * loud, 0, { stadium: 0.5 });
      mix.addStereo(stomp(`${beat}`), beat - 0.05, 0.25 + 0.75 * loud, { stadium: 0.7 });
      mix.add(subDrop(78, 41, 0.9, 0.3), beat, 0.22 * loud);
      /* the last three: twice a second, then a roll */
      if (beat >= 7) mix.add(taiko(88, 0.2, rand), beat + 0.5, 0.5 * loud, -0.2, { stadium: 0.5 });
      if (beat === 9) for (let r = 0; r < 6; r += 1) mix.add(taiko(100 + r * 4, 0.1, rand), beat + 0.5 + r * 0.055, 0.3 + r * 0.06, r % 2 ? 0.25 : -0.25, { hall: 0.3 });
    }
    mix.add(riser(3.2, rand), 6.63, 0.46, 0, { hall: 0.5 });
    const out = mix.render();
    /* the blackout: everything stops, reverb too */
    const stop = N(blackout);
    for (let i = stop; i < out.L.length; i += 1) { const k = Math.max(0, 1 - (i - stop) / 64); out.L[i] *= k; out.R[i] *= k; }
    return out;
  },
  /* Zero. One enormous hit, the crowd letting go, and fireworks. It dies away under the ident. */
  zero: () => {
    const seconds = 8;
    const rand = seeded('zero');
    const mix = new Mix(seconds);
    mix.add(subDrop(95, 30, 3.2, 1.25), 0, 1);
    mix.add(taiko(62, 0.7, rand), 0, 1, 0, { stadium: 0.6 });
    mix.add(hp(decay(white(N(0.05), rand), 0.012, 0.0003), 2200), 0, 0.5, 0, { stadium: 0.6 });
    mix.addStereo(braam([NOTE.E1 * 2, NOTE.E2 * 1.5, NOTE.E3, NOTE.B3 / 2], 4.5, { open: 2300, shut: 380, tau: 1.3, push: 3 }), 0, 0.82, { hall: 0.5, stadium: 0.3 });
    const c = crash(4.5, rand);
    mix.add(c, 0.02, 0.24, -0.25, { hall: 0.5 });
    mix.add(c.slice().reverse().reverse(), 0.03, 0.2, 0.25, { hall: 0.5 });
    const people = crowd(seconds, ramp([[0, 0], [0.12, 1], [1.5, 1], [2.8, 0.62], [5, 0.3], [7.8, 0]]), 'zero', { rate: 380, whistles: 1.2 });
    mix.addStereo(people, 0, 0.95, { stadium: 0.7 });
    mix.addStereo(applause(seconds, ramp([[0, 0], [0.3, 1], [2.8, 0.7], [5.5, 0.26], [7.5, 0]]), 'zero', 520), 0, 0.26, { stadium: 0.7 });
    /* pyro going up with the zero: bangs, close together, then one big one with stars */
    [[0.34, 'SALUTE', 0.2], [0.82, 'SALUTE', 0.4], [1.05, 'SALUTE', 0.3], [1.86, 'PEONY', 0.3]].forEach(([at, kind, far]) => mix.addStereo(firework(rand, kind, far), at, 0.3, { sky: 0.7 }));
    return mix.render();
  },
  /* The world. A hundred and twenty beats a minute, low strings driving, a tune starting to open up. */
  world: () => {
    const seconds = 10.4;
    const rand = seeded('world');
    const mix = new Mix(seconds);
    const beat = 0.25;
    /* Em, C, G, D */
    const bars = [
      { root: NOTE.E2, pad: [NOTE.E3, NOTE.G3, NOTE.B3, NOTE.E4], tune: [NOTE.E5, NOTE.B4, NOTE.G4] },
      { root: NOTE.C2 * 2, pad: [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4], tune: [NOTE.E5, NOTE.C4 * 2, NOTE.G4] },
      { root: NOTE.G2, pad: [NOTE.D3, NOTE.G3, NOTE.B3, NOTE.D4], tune: [NOTE.D5, NOTE.B4, NOTE.G4] },
      { root: NOTE.D2 * 2, pad: [NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.D4], tune: [NOTE.Fs5, NOTE.D5, NOTE.A4] },
      { root: NOTE.D2 * 2, pad: [NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.E4], tune: [NOTE.E5, NOTE.D5, NOTE.B4] },
    ];
    const swell = ramp([[0, 0.42], [6, 0.8], [9.6, 1]]);
    bars.forEach((bar, b) => {
      const at = b * 2;
      mix.addStereo(strings(bar.pad, 2.5, { attack: 0.34, release: 0.5, cutoff: 1300 + b * 340, seed: `world-${b}` }), at, 0.72 * swell(at), { hall: 0.55 });
      for (let k = 0; k < 8; k += 1) {
        const note = k % 4 === 2 ? bar.root * 2 : bar.root;
        mix.add(spiccato(note, rand), at + k * beat, (k % 4 === 0 ? 0.3 : 0.2) * swell(at + k * beat), k % 2 ? 0.14 : -0.14, { hall: 0.22 });
      }
      mix.add(taiko(66, 0.34, rand), at, 0.4 * swell(at), 0, { hall: 0.4 });
      if (b >= 2) mix.add(taiko(82, 0.18, rand), at + 1, 0.22 * swell(at), 0.2, { hall: 0.4 });
      mix.add(subDrop(70, 41, 0.9, 0.34), at, 0.2 * swell(at));
      if (b >= 1) bar.tune.forEach((note, k) => mix.add(piano(note, 1.6, rand), at + k * 0.75, 0.2 * swell(at), (k - 1) * 0.3, { hall: 0.7 }));
    });
    /* the lights flying into a world, and the crowd falling away behind */
    mix.add(whoosh(1.9, 1, rand, { low: 150, high: 3200 }), 0, 0.5, 0, { hall: 0.5 });
    mix.addStereo(crowd(3, ramp([[0, 0.34], [2.6, 0]]), 'world', { whistles: 0.3 }), 0, 0.5, { stadium: 0.8 });
    /* each city as it comes on: a small glass sound, somewhere */
    for (let t = 1.4; t < seconds - 0.4; t += 0.16 + rand() * 0.28) {
      mix.add(bell(NOTE.E6 * (rand() < 0.5 ? 1 : 0.75), 0.5, rand), t, 0.018 + rand() * 0.03, rand() * 1.8 - 0.9, { hall: 0.8 });
    }
    return shape2(mix.render(), t => Math.min(1, (seconds - t) / 0.9));
  },
  /* One city. Everything falls back; a piano, the sound of a town; and through a window. */
  city: () => {
    const seconds = 7.5;
    const rand = seeded('city');
    const mix = new Mix(seconds);
    mix.addStereo(strings([NOTE.E3, NOTE.B3, NOTE.Fs4], seconds - 0.2, { attack: 1.1, release: 0.2, cutoff: 760, seed: 'city-pad' }), 0, 0.7, { hall: 0.7 });
    [[0.5, NOTE.B4], [1.5, NOTE.E5], [2.3, NOTE.Fs5], [3.3, NOTE.B4], [4.2, NOTE.G4], [5.1, NOTE.E4]].forEach(([at, note]) => mix.add(piano(note, 2.2, rand), at, 0.26, (rand() - 0.5) * 0.5, { hall: 0.8 }));
    /* the town: low traffic, a wide hush, something far off */
    const n = N(seconds);
    const town = sum(gainOf(lp(brown(n, rand), 240), 1.5), gainOf(bp(pink(n, rand), 620, 0.8), 0.42));
    const swell = wander(seconds, 0.5, rand);
    shape(town, t => (0.7 + 0.3 * swell(t)) * Math.min(1, t / 0.8) * Math.min(1, (seconds - t) / 0.5));
    mix.add(town, 0, 0.3, -0.1, { city: 0.6 });
    mix.add(hp(gainOf(bp(pink(n, rand), 2300, 0.9), 0.1), 800), 0, 0.5, 0.25, { city: 0.6 });
    /* through the window */
    mix.add(whoosh(1.32, 1.28, rand, { low: 120, high: 4800, Q: 1.4 }), 5.98, 0.86, 0, { hall: 0.2 });
    mix.add(subDrop(38, 90, 1.25, 2), 6, 0.3);
    return shape2(mix.render(), t => Math.min(1, (seconds - t) / 0.2));
  },
  /* One room. The show on the TV through a wall of quiet; a phone. */
  room: () => {
    const seconds = 5.5;
    const rand = seeded('room');
    const mix = new Mix(seconds);
    const n = N(seconds);
    const air = gainOf(lp(brown(n, rand), 180), 0.5);
    mix.add(shape(air, t => Math.min(1, t / 0.4)), 0, 0.3, 0, { room: 0.3 });
    /* the TV: people talking, too far off to make out, and the show's own strings */
    const voices = voicePool(30, 'tv');
    const talk = new Float32Array(n);
    for (let t = 0.2; t < seconds - 0.3; t += 0.2 + rand() * 0.42) {
      const grain = voices[Math.floor(rand() * voices.length)];
      const start = N(t);
      const loud = 0.5 + rand() * 0.5;
      for (let i = 0; i < grain.length && start + i < n; i += 1) talk[start + i] += grain[i] * loud;
    }
    mix.add(hp(lp(talk, 1100), 240), 0, 0.42, 0, { room: 0.8 });
    mix.addStereo(strings([NOTE.E3, NOTE.G3, NOTE.B3], seconds, { attack: 1.4, release: 0.5, cutoff: 680, seed: 'room-tv' }), 0, 0.36, { room: 0.9 });
    /* the phone, on the sofa */
    [[2, NOTE.E5], [2.13, NOTE.B5]].forEach(([at, note]) => mix.add(marimba(note, rand), at, 0.6, -0.34, { room: 0.5 }));
    const buzz = shape(lp(saw(N(0.34), 168, rand), 520), t => Math.min(1, t / 0.01) * Math.min(1, (0.34 - t) / 0.02) * (0.6 + 0.4 * Math.sin(TAU * 30 * t)));
    mix.add(buzz, 2.02, 0.1, -0.34, { room: 0.4 });
    return shape2(mix.render(), t => Math.min(1, (seconds - t) / 0.35));
  },
  /* Four and a half seconds to the peak. It tightens and tightens, and at the very last it holds its breath. */
  rise: () => {
    const seconds = 4.4;
    const rand = seeded('rise');
    const mix = new Mix(seconds);
    const end = 4.24;
    mix.addStereo(strings([NOTE.E3, NOTE.E4, NOTE.B4, NOTE.E5], end, { attack: 2.6, release: 0.03, cutoff: t => 900 + 2600 * (t / end) ** 2, players: 6, seed: 'rise-high', tremolo: t => 8 + 12 * t / end }), 0, 0.74, { hall: 0.5 });
    mix.addStereo(strings([NOTE.E2], end, { attack: 0.8, release: 0.03, cutoff: 420, seed: 'rise-low' }), 0, 0.9, { hall: 0.3 });
    /* a drum getting faster, into a roll */
    let t = 0;
    let gap = 0.5;
    while (t < end - 0.04) {
      const loud = 0.28 + 0.72 * (t / end) ** 1.4;
      mix.add(taiko(66 + 40 * (t / end), Math.max(0.09, 0.3 - 0.2 * t / end), rand), t, 0.64 * loud, gap < 0.14 ? (Math.round(t / gap) % 2 ? 0.22 : -0.22) : 0, { hall: 0.35 });
      if (gap > 0.14) mix.add(spiccato(NOTE.E2, rand), t, 0.32 * loud, 0, { hall: 0.2 });
      t += gap;
      gap = Math.max(0.075, gap * 0.91);
    }
    mix.add(riser(end, rand), 0, 0.5, 0, { hall: 0.4 });
    const out = mix.render();
    const stop = N(end);
    for (let i = stop; i < out.L.length; i += 1) { const k = Math.max(0, 1 - (i - stop) / 128); out.L[i] *= k; out.R[i] *= k; }
    return out;
  },
  /* It held. Brass in the major at last, a stadium, and seven fireworks at the moments the picture has them. */
  held: () => {
    const seconds = 9;
    const rand = seeded('held');
    const mix = new Mix(seconds);
    mix.add(subDrop(90, 32, 2.6, 0.95), 0, 0.95);
    mix.add(taiko(66, 0.6, rand), 0, 0.95, 0, { stadium: 0.5 });
    const c = crash(5, rand);
    mix.add(c, 0.01, 0.26, -0.3, { hall: 0.6 });
    mix.add(c, 0.025, 0.2, 0.3, { hall: 0.6 });
    /* E, B, C#m, A, E: the turn every anthem makes */
    [
      { at: 0, chord: [NOTE.E2, NOTE.B2, NOTE.E3, NOTE.Gs3, NOTE.B3], top: [NOTE.Gs4, NOTE.B4, NOTE.E5] },
      { at: 1.6, chord: [NOTE.B2 / 2, NOTE.Fs2, NOTE.B2, NOTE.Ds3, NOTE.Fs3], top: [NOTE.Fs4, NOTE.B4, NOTE.Ds4 * 2] },
      { at: 3.2, chord: [NOTE.Cs3 / 2, NOTE.Gs3 / 2, NOTE.Cs3, NOTE.E3, NOTE.Gs3], top: [NOTE.E4, NOTE.Gs4, NOTE.Cs5] },
      { at: 4.8, chord: [NOTE.A2 / 2, NOTE.E2, NOTE.A2, NOTE.Cs3, NOTE.E3], top: [NOTE.E4, NOTE.A4, NOTE.Cs5] },
      { at: 6.4, chord: [NOTE.E2, NOTE.B2, NOTE.E3, NOTE.Gs3, NOTE.B3], top: [NOTE.Gs4, NOTE.B4, NOTE.E5] },
    ].forEach(({ at, chord, top }, index) => {
      mix.addStereo(braam(chord, 2.6, { open: index ? 1500 : 3000, shut: 500, tau: index === 4 ? 1.1 : 0.9, push: 2.1, seed: `held-${index}` }), at, index ? 0.52 : 0.78, { hall: 0.55 });
      mix.addStereo(strings(top, 2.3, { attack: 0.12, release: 0.5, cutoff: 3400, seed: `held-top-${index}` }), at, 0.7, { hall: 0.6 });
      mix.add(taiko(72, 0.34, rand), at, 0.5, 0, { hall: 0.4 });
      if (index < 4) for (let k = 0; k < 6; k += 1) mix.add(spiccato(chord[0] * 2, rand), at + k * (1.6 / 6), 0.2, k % 2 ? 0.16 : -0.16, { hall: 0.2 });
    });
    mix.addStereo(crowd(seconds, ramp([[0, 0.1], [0.3, 1], [4.5, 0.9], [8.8, 0.36]]), 'held', { rate: 380, whistles: 1.2 }), 0, 0.72, { stadium: 0.7 });
    mix.addStereo(applause(seconds, ramp([[0, 0], [0.5, 1], [6, 0.9], [8.8, 0.5]]), 'held', 560), 0, 0.3, { stadium: 0.7 });
    const pyro = new Mix(seconds);
    addBarrage(pyro, rand, 7, 2.1);
    const score = shape2(mix.render(), barrageDuck(7, 0.62));
    const sky = pyro.render();
    for (let i = 0; i < score.L.length; i += 1) { score.L[i] += sky.L[i]; score.R[i] += sky.R[i]; }
    return shape2(score, t => Math.min(1, (seconds - t) / 1.4));
  },
  /* It held, just. A suspended chord that takes its time to resolve, relief more than joy, two fireworks. */
  just: () => {
    const seconds = 8.5;
    const rand = seeded('just');
    const mix = new Mix(seconds);
    mix.add(subDrop(70, 36, 1.8, 0.7), 0, 0.6);
    mix.add(taiko(70, 0.4, rand), 0, 0.6, 0, { stadium: 0.5 });
    mix.addStereo(braam([NOTE.E2, NOTE.B2, NOTE.E3, NOTE.A3], 2.2, { open: 1000, shut: 360, tau: 0.8, push: 1.8, seed: 'just-sus' }), 0, 0.5, { hall: 0.5 });
    mix.addStereo(strings([NOTE.E3, NOTE.A3, NOTE.B3, NOTE.E4], 1.9, { attack: 0.2, release: 0.5, cutoff: 1500, seed: 'just-sus-s' }), 0, 0.72, { hall: 0.6 });
    mix.addStereo(strings([NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4], 4.5, { attack: 0.8, release: 1.6, cutoff: 1900, seed: 'just-res' }), 1.4, 0.78, { hall: 0.7 });
    mix.add(piano(NOTE.Gs4, 3, rand), 1.6, 0.3, -0.2, { hall: 0.8 });
    mix.add(piano(NOTE.B4, 3, rand), 2.05, 0.26, 0.2, { hall: 0.8 });
    mix.add(piano(NOTE.E5, 3, rand), 2.5, 0.24, 0, { hall: 0.8 });
    mix.addStereo(crowd(seconds, ramp([[0, 0.3], [0.6, 0.72], [3.5, 0.54], [8, 0.2]]), 'just', { whistles: 0.5 }), 0, 0.56, { stadium: 0.8 });
    mix.addStereo(applause(seconds, ramp([[0, 0], [0.7, 0.62], [5, 0.5], [8, 0.22]]), 'just', 360), 0, 0.26, { stadium: 0.7 });
    const pyro = new Mix(seconds);
    addBarrage(pyro, rand, 2, 1.7);
    const score = shape2(mix.render(), barrageDuck(2, 0.55));
    const sky = pyro.render();
    for (let i = 0; i < score.L.length; i += 1) { score.L[i] += sky.L[i]; score.R[i] += sky.R[i]; }
    return shape2(score, t => Math.min(1, (seconds - t) / 1.4));
  },
  /* It buckled. A hit that is wrong, the power going, an alarm in a control room, and a stadium of people going "oh". */
  buckled: () => {
    const seconds = 8.5;
    const rand = seeded('buckled');
    const mix = new Mix(seconds);
    mix.add(subDrop(88, 28, 2.8, 1), 0, 0.95);
    mix.add(taiko(58, 0.6, rand), 0, 0.9, 0, { hall: 0.5 });
    /* a tritone: it will not settle */
    mix.addStereo(braam([NOTE.E1 * 2, NOTE.B1 * 0.943, NOTE.E2 * 2, NOTE.Fs3 * 0.943], 4, { open: 1300, shut: 240, tau: 1.3, push: 3.2, seed: 'buckled' }), 0, 0.72, { hall: 0.5 });
    const n = N(2.4);
    const powerDown = shape(lp(sum(saw(n, t => 170 * Math.exp(-t * 1.7), rand), gainOf(saw(n, t => 256 * Math.exp(-t * 1.7), rand), 0.5)), 900), t => Math.min(1, t / 0.02) * Math.exp(-t / 0.95));
    mix.add(powerDown, 0.1, 0.34, 0, { hall: 0.5 });
    /* the alarm, on a small speaker in a big room */
    for (let k = 0; k < 8; k += 1) {
      const m = N(0.27);
      const tone = saw(m, k % 2 ? 610 : 830, rand);
      const horn = hp(lp(drive(gainOf(tone, 0.8), 3), 2600, 2), 500, 1.4);
      mix.add(shape(horn, t => Math.min(1, t / 0.008) * Math.min(1, (0.27 - t) / 0.012)), 0.3 + k * 0.3, 0.13 * (1 - k * 0.07), 0.3, { hall: 0.9 });
    }
    /* things falling over */
    for (let k = 0; k < 16; k += 1) {
      const blip = gainOf(bp(white(N(0.03 + rand() * 0.05), rand), 700 + rand() * 2600, 3), 0.8);
      mix.add(decay(blip, 0.02, 0.001), 0.4 + rand() * 3.2, 0.1 + rand() * 0.1, rand() * 1.8 - 0.9, { hall: 0.5 });
    }
    mix.addStereo(strings([NOTE.E2, NOTE.G2, NOTE.Fs3, NOTE.B3 * 0.943], seconds, { attack: 1.4, release: 1.6, cutoff: 620, seed: 'buckled-low' }), 0, 0.9, { hall: 0.7 });
    mix.addStereo(crowd(seconds, ramp([[0, 0], [0.5, 0.92], [2.4, 0.74], [5, 0.34], [8, 0.1]]), 'buckled', { rate: 300, whistles: 0.8, falling: true }), 0, 0.82, { stadium: 0.8 });
    return shape2(mix.render(), t => Math.min(1, (seconds - t) / 1.4));
  },
  /* The flood. Phones: one, then a few, then all of them, all in key so that it rains and does not nag; and when the card lands, a warm chord. */
  flood: () => floodStem('flood', false),
  floodBad: () => floodStem('floodBad', true),
};

function shape2(stereo, fn) { shape(stereo.L, fn); shape(stereo.R, fn); return stereo; }

function floodStem(seed, bad) {
  const seconds = 10;
  const rand = seeded(seed);
  const mix = new Mix(seconds);
  const scale = bad ? [NOTE.E5, NOTE.G5, NOTE.B4, NOTE.Fs5, NOTE.E4 * 2] : [NOTE.E5, NOTE.Gs5, NOTE.B5, NOTE.Cs6, NOTE.Fs5, NOTE.B4, NOTE.Gs4 * 2];
  const rate = ramp([[0, 3], [1.2, 6], [3.9, 30], [5.4, 11], [7.5, 4], [10, 1.5]]);
  for (let t = 0; t < seconds - 0.6;) {
    const kind = rand();
    const pan = rand() * 1.9 - 0.95;
    const hush = 0.5 + rand() * 0.5;
    if (kind < (bad ? 0.3 : 0.62)) {
      mix.add(marimba(scale[Math.floor(rand() * scale.length)], rand), t, 0.42 * hush, pan, { hall: 0.42 });
    } else if (kind < (bad ? 0.62 : 0.93)) {
      const pop = decay(sine(N(0.09), f => 760 + 680 * Math.exp(-f / 0.012), rand() * TAU), 0.022, 0.001);
      mix.add(pop, t, 0.4 * hush, pan, { hall: 0.3 });
    } else {
      /* a phone buzzing on a table */
      const m = N(0.26);
      const buzz = shape(hp(lp(saw(m, 158 + rand() * 30, rand), 620), 90), x => Math.min(1, x / 0.01) * Math.min(1, (0.26 - x) / 0.02) * (0.6 + 0.4 * Math.sin(TAU * 31 * x)));
      mix.add(buzz, t, 0.1 * hush, pan, { room: 0.5 });
    }
    t += (1 / rate(t)) * (0.5 + rand());
  }
  mix.addStereo(applause(5.6, ramp([[0, 0.34], [4.6, 0]]), seed, 300), 0, 0.2, { stadium: 0.7 });
  /* the card lands */
  mix.add(subDrop(70, 38, 2, 0.8), 5.4, 0.22);
  mix.add(taiko(70, 0.42, rand), 5.4, 0.22, 0, { hall: 0.6 });
  const chord = bad ? [NOTE.E3, NOTE.G3, NOTE.B3, NOTE.E4] : [NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4, NOTE.Fs4];
  mix.addStereo(strings(chord, 4.5, { attack: 0.34, release: 2.2, cutoff: bad ? 800 : 2300, seed: `${seed}-chord` }), 5.4, 0.5, { hall: 0.8 });
  (bad ? [] : [NOTE.E5, NOTE.B5, NOTE.E6]).forEach((note, k) => mix.add(bell(note, 2.4, rand), 5.42 + k * 0.1, 0.1, (k - 1) * 0.4, { hall: 0.9 }));
  return shape2(mix.render(), t => Math.min(1, (seconds - t) / 1.2));
}

/* ── the idents: the fifteen sounds a service can choose (services/streamingIdentAudio.ts has their notes and identSounds.ts how they are described), played on real instruments ── */
const VOICES_CHOIR = [730, 1090, 2440];
const choir = (notes, seconds, seed) => {
  const rand = seeded(seed);
  const n = N(seconds);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  notes.forEach(note => {
    for (let v = 0; v < 7; v += 1) {
      const f = note * 2 ** ((rand() - 0.5) * 18 / 1200);
      const rate = 4.4 + rand() * 1.4; const phase = rand() * TAU;
      const source = sum(saw(n, t => f * (1 + 0.006 * Math.sin(TAU * rate * t + phase)), rand), gainOf(white(n, rand), 0.05));
      const voice = sum(gainOf(bp(source, VOICES_CHOIR[0], 7), 1), gainOf(bp(source, VOICES_CHOIR[1], 8), 0.55), gainOf(bp(source, VOICES_CHOIR[2], 9), 0.2));
      const pan = rand() * 1.6 - 0.8;
      for (let i = 0; i < n; i += 1) { out.L[i] += voice[i] * (1 - pan) * 0.5; out.R[i] += voice[i] * (1 + pan) * 0.5; }
    }
  });
  const amp = t => Math.min(1, t / 0.42) * Math.min(1, (seconds - t) / 0.9);
  shape(out.L, amp); shape(out.R, amp);
  return out;
};
const clank = (f, rand) => {
  const n = N(0.5);
  const tone = new Float32Array(n);
  [[1, 1, 0.1], [2.41, 0.7, 0.07], [3.77, 0.5, 0.05], [5.9, 0.34, 0.03], [8.2, 0.2, 0.02]].forEach(([ratio, level, tau]) => {
    const part = decay(sine(n, f * ratio, rand() * TAU), tau, 0.0004);
    for (let i = 0; i < n; i += 1) tone[i] += part[i] * level;
  });
  return sum(gainOf(tone, 0.5), gainOf(bp(decay(white(n, rand), 0.018, 0.0003), f * 4, 1.2), 0.9));
};
const pluck = (f, tau, rand) => {
  const n = N(tau * 6);
  return decay(filter(sum(saw(n, f * 1.003, rand), saw(n, f * 0.997, rand)), 'lp', t => 500 + 3400 * Math.exp(-t / 0.08), 2), tau, 0.002);
};
const IDENTS = {
  pulse: mix => { const rand = seeded('i-pulse'); [[0, 92], [0.22, 138]].forEach(([at, f]) => { mix.add(taiko(f * 0.74, 0.3, rand), at, 0.9, 0, { hall: 0.5 }); mix.add(subDrop(f, f * 0.5, 0.8, 0.28), at, 0.5); }); },
  ascent: mix => { const rand = seeded('i-ascent'); [[0, 196], [0.14, 293.66], [0.3, 440], [0.49, 659.25]].forEach(([at, f], k) => mix.add(piano(f, 2.4, rand), at, 0.55 + k * 0.1, (k - 1.5) * 0.3, { hall: 0.9 })); mix.addStereo(strings([NOTE.D4, NOTE.A4], 2.4, { attack: 0.5, release: 1, cutoff: 2200, seed: 'i-ascent' }), 0.3, 0.5, { hall: 0.8 }); },
  premiere: mix => { const rand = seeded('i-premiere'); mix.addStereo(braam([NOTE.E2, NOTE.B2, NOTE.E3], 2.6, { open: 1500, shut: 300, tau: 1, push: 2, seed: 'i-premiere' }), 0, 0.7, { hall: 0.7 }); mix.addStereo(strings([NOTE.A3, NOTE.E4, NOTE.B4], 2.6, { attack: 0.2, release: 1, cutoff: 3000, seed: 'i-premiere-s' }), 0.1, 0.9, { hall: 0.9 }); mix.add(taiko(62, 0.5, rand), 0, 0.7, 0, { hall: 0.6 }); },
  choir: mix => { mix.addStereo(choir([NOTE.G3, NOTE.B3, NOTE.D4], 2.8, 'i-choir'), 0, 0.5, { hall: 1 }); },
  machine: mix => { const rand = seeded('i-machine'); [[0, 240], [0.13, 150], [0.27, 340], [0.43, 190]].forEach(([at, f], k) => mix.add(clank(f, rand), at, 0.8, k % 2 ? 0.25 : -0.25, { hall: 0.5 })); const m = N(1.4); mix.add(shape(gainOf(filter(pink(m, rand), 'bp', t => 900 + 3200 * t, 1), 2.2), t => Math.min(1, t / 0.5) * Math.min(1, (1.4 - t) / 0.7)), 0.45, 0.4, 0, { hall: 0.6 }); },
  spark: mix => { const rand = seeded('i-spark'); [[0, 659.25], [0.1, 987.77], [0.2, 1318.51], [0.34, 1975.5]].forEach(([at, f], k) => mix.add(bell(f, 2, rand), at, 0.7, (k - 1.5) * 0.4, { hall: 0.9 })); },
  impact: mix => { const rand = seeded('i-impact'); mix.add(subDrop(92, 32, 2.6, 1), 0, 1); mix.add(taiko(60, 0.6, rand), 0, 0.9, 0, { hall: 0.6 }); mix.addStereo(braam([NOTE.C2, NOTE.G2, NOTE.C3], 2.4, { open: 1300, shut: 260, tau: 0.9, push: 3, seed: 'i-impact' }), 0, 0.8, { hall: 0.6 }); },
  orbit: mix => { const rand = seeded('i-orbit'); [[0, 220], [0.16, 329.63], [0.34, 246.94], [0.5, 493.88], [0.66, 329.63], [0.84, 493.88]].forEach(([at, f], k) => mix.add(pluck(f, 0.26, rand), at, 0.5 - k * 0.04, k % 2 ? 0.6 : -0.6, { hall: 0.7 })); mix.addStereo(strings([NOTE.A3, NOTE.E4], 2.2, { attack: 0.6, release: 1, cutoff: 1500, seed: 'i-orbit' }), 0, 0.5, { hall: 0.7 }); },
  bloom: mix => { mix.addStereo(strings([174.61, 261.63, 392, 523.25], 2.9, { attack: 0.5, release: 1.1, cutoff: t => 260 + 2100 * Math.min(1, t / 1.5) ** 1.6, seed: 'i-bloom' }), 0, 1.1, { hall: 0.8 }); },
  prism: mix => { const rand = seeded('i-prism'); [[0, 523.25], [0.09, 783.99], [0.2, 1046.5], [0.3, 1567.98]].forEach(([at, f], k) => { mix.add(bell(f, 2, rand), at, 0.6, (k - 1.5) * 0.45, { hall: 0.9 }); mix.add(bell(f * 2.01, 1, rand), at + 0.01, 0.16, (1.5 - k) * 0.45, { hall: 0.9 }); }); },
  ember: mix => { const rand = seeded('i-ember'); [[0, 110], [0.12, 164.81], [0.28, 220]].forEach(([at, f], k) => mix.add(piano(f, 2.6, rand), at, 1.1, (k - 1) * 0.2, { hall: 0.7 })); mix.addStereo(strings([NOTE.A2 * 2, NOTE.E3], 2.6, { attack: 0.7, release: 1, cutoff: 700, seed: 'i-ember' }), 0, 0.8, { hall: 0.7 }); },
  signal: mix => { const rand = seeded('i-signal'); [[0, 0.08, 440], [0.15, 0.08, 440], [0.3, 0.1, 659.25], [0.45, 0.42, 880]].forEach(([at, len, f]) => { const m = N(len); const beep = bp(sum(saw(m, f, rand), gainOf(white(m, rand), 0.12)), f * 2, 1.2); mix.add(shape(beep, t => Math.min(1, t / 0.004) * Math.min(1, (len - t) / 0.012)), at, 0.7, 0.1, { hall: 0.6 }); }); const m = N(1.8); mix.add(shape(gainOf(bp(white(m, rand), 3000, 0.9), 0.14), t => Math.min(1, t / 0.2) * Math.min(1, (1.8 - t) / 0.6)), 0, 0.4, -0.1, { room: 0.5 }); },
  horizon: mix => { mix.addStereo(strings([NOTE.D3, NOTE.A3, NOTE.E4, NOTE.B4], 3.1, { attack: 0.6, release: 1.3, cutoff: 1900, players: 8, seed: 'i-horizon' }), 0, 1.15, { hall: 1 }); },
  analog: mix => { const rand = seeded('i-analog'); const wow = t => 1 + 0.008 * Math.sin(TAU * 1.3 * t) + 0.004 * Math.sin(TAU * 6.1 * t); [[0, 0.5, 196], [0.18, 0.5, 185], [0.38, 1.2, 293.66], [0.4, 1.2, 277.18]].forEach(([at, len, f], k) => { const m = N(len); const tone = filter(sum(saw(m, t => f * wow(t), rand), saw(m, t => f * 1.006 * wow(t), rand)), 'lp', t => 500 + 1500 * Math.exp(-t / 0.3), 1.6); mix.add(shape(tone, t => Math.min(1, t / 0.012) * Math.min(1, (len - t) / 0.2)), at, 0.3, (k - 1.5) * 0.3, { hall: 0.6 }); }); },
};
/* the barrage on its own, to inspect it: only rendered when asked for by name */
STEMS._barrage = () => {
  const mix = new Mix(9);
  addBarrage(mix, seeded('held'), 7, 2.1);
  return mix.render();
};
for (const [id, build] of Object.entries(IDENTS)) {
  STEMS[`ident-${id}`] = () => {
    const seconds = 3.2;
    const mix = new Mix(seconds);
    build(mix);
    return shape2(mix.render(), t => Math.min(1, (seconds - t) / 0.7));
  };
}

/* ── mastering: every stem on one scale, so the night's quiet parts stay quiet ── */
const TARGET = { count: -14, zero: -10, world: -15, city: -21, room: -25, rise: -13, held: -11, just: -13, buckled: -12, flood: -18, floodBad: -17 };
/* a phone's speaker carries nothing under 150 Hz and everything at 3 kHz, and rooms took the top off all of this: put back what the ear will look for */
const EQ = {
  count: [['ls', 110, -6], ['pk', 3000, 4, 0.8], ['hs', 7000, 8]],
  zero: [['ls', 110, -3], ['pk', 3000, 3, 0.8], ['hs', 7000, 5]],
  world: [['ls', 110, -3], ['pk', 2800, 3, 0.8], ['hs', 7000, 8]],
  city: [['ls', 110, -3], ['hs', 6000, 6]],
  room: [['hs', 6000, 3]],
  rise: [['ls', 110, -5], ['pk', 3000, 4, 0.8], ['hs', 7000, 8]],
  /* the stars bring their own top */
  held: [['ls', 110, -4], ['pk', 3000, 3, 0.8], ['hs', 7000, 2]],
  just: [['ls', 110, -4], ['pk', 3000, 3, 0.8], ['hs', 7000, 2]],
  buckled: [['ls', 110, -4], ['pk', 3000, 3, 0.8], ['hs', 7000, 6]],
  flood: [['hs', 7000, 3]],
  floodBad: [['hs', 7000, 3]],
  ident: [['ls', 90, -2], ['pk', 3000, 2, 0.8], ['hs', 7000, 3]],
};
const equalise = (x, bands) => bands.reduce((y, [type, f, gain, Q]) => (type === 'pk' ? filter(y, 'pk', f, Q ?? 1, gain) : filter(y, type, f, 0.707, gain)), x);
const loudest = stereo => {
  /* the loudest second, ignoring what is below hearing on a phone */
  const left = hp(stereo.L, 120); const right = hp(stereo.R, 120);
  const win = N(0.8);
  let total = 0;
  let best = 0;
  for (let i = 0; i < left.length; i += 1) {
    total += left[i] * left[i] + right[i] * right[i];
    if (i >= win) total -= left[i - win] * left[i - win] + right[i - win] * right[i - win];
    if (i >= win - 1 && total > best) best = total;
  }
  return 10 * Math.log10(Math.max(1e-12, best / (2 * win)));
};
const limit = stereo => {
  const n = stereo.L.length;
  const look = N(0.004);
  const ceiling = db(-1);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const peak = Math.max(Math.abs(stereo.L[i]), Math.abs(stereo.R[i]));
    need[i] = peak > ceiling ? ceiling / peak : 1;
  }
  /* see it coming; let go slowly */
  const gain = new Float32Array(n);
  let held = 1;
  const release = Math.exp(-1 / (0.12 * SR));
  for (let i = n - 1; i >= 0; i -= 1) gain[i] = Math.min(need[i], i + 1 < n ? gain[i + 1] + 1 / look : 1);
  for (let i = 0; i < n; i += 1) {
    held = gain[i] < held ? gain[i] : 1 - (1 - held) * release;
    stereo.L[i] *= held; stereo.R[i] *= held;
  }
};
const master = (stereo, target, bands) => {
  const L = equalise(hp(stereo.L, 26), bands); const R = equalise(hp(stereo.R, 26), bands);
  const out = { L, R };
  const g = db(target - loudest(out));
  gainOf(L, g); gainOf(R, g);
  limit(out);
  const n = L.length;
  for (let i = 0; i < 128 && i < n; i += 1) { const k = i / 128; L[i] *= k; R[i] *= k; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return out;
};
const writeWav = (file, { L, R }) => {
  const frames = L.length;
  const bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + frames * 4, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(SR, 24); bytes.writeUInt32LE(SR * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i += 1) {
    bytes.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4);
    bytes.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, bytes);
};

const [outDir, ...only] = process.argv.slice(2);
if (!outDir) { console.error('usage: render-opening-night.mjs <outDir> [stem…]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
for (const name of Object.keys(STEMS)) {
  if ((only.length && !only.includes(name)) || (!only.length && name.startsWith('_'))) continue;
  const t0 = Date.now();
  const isIdent = name.startsWith('ident-');
  const stereo = master(STEMS[name](), isIdent ? -13 : TARGET[name] ?? -13, isIdent ? EQ.ident : EQ[name] ?? EQ.held);
  writeWav(path.join(outDir, `${name}.wav`), stereo);
  let peak = 0;
  for (let i = 0; i < stereo.L.length; i += 1) peak = Math.max(peak, Math.abs(stereo.L[i]), Math.abs(stereo.R[i]));
  console.log(`${name.padEnd(9)} ${(stereo.L.length / SR).toFixed(1)}s  peak ${(20 * Math.log10(peak)).toFixed(1)} dB  loudest ${loudest(stereo).toFixed(1)} dB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
