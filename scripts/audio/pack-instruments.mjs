/**
 * The instruments the pack themes are played on. render-pack-sounds.mjs hands this to each pack's file as kit.I.
 *
 * REAL INSTRUMENTS are recordings from VS Chamber Orchestra: Community Edition (github.com/sgossner/VSCO-2-CE, CC0 1.0; Versilian Studios / Sam Gossner, Ivy Audio / Simon Dalzell).
 * They are never shipped: only the finished mix goes into the game, as a small m4a in assets/audio/packs. To render again, fetch the folders named in GROUPS with a sparse checkout of that
 * repository, point PACK_SAMPLES at it, and run `node scripts/audio/render-pack-sounds.mjs --scan-samples` once. That writes index.json beside the samples and prints what each group holds.
 *
 * WHAT THE LIBRARY HAS NOT GOT (choir, vibes, celesta, a church bell, cinema booms and braams, snaps, brushes) is synthesised below.
 *
 * Every instrument returns "voices", [{ x, pan, g, d }]: a mono buffer, its place, a gain, a small delay. I.play(mix, voices, at, gain, send) puts them in a Mix or a LoopMix.
 */
import fs from 'node:fs';
import path from 'node:path';

/* name: what a pack asks for. dir: a folder. prefix: files in a folder that start with this. pitch: 'label' (the file name says; the default), 'detect' (measured), 'none' (a hit) */
const GROUPS = {
  trumpet: { dir: 'Brass/Trumpet/sus' },
  'trumpet.stac': { dir: 'Brass/Trumpet/stac' },
  'trumpet.harmon': { dir: 'Brass/Trumpet/harmonM-sus' },
  'trumpet.straight': { dir: 'Brass/Trumpet/straightM-sus' },
  horn: { dir: 'Brass/F Horn/sus' },
  'horn.stac': { dir: 'Brass/F Horn/stac' },
  trombone: { dir: 'Brass/Tenor Trombone/sus' },
  'trombone.stac': { dir: 'Brass/Tenor Trombone/stac' },
  tuba: { dir: 'Brass/Tuba/sus' },
  'tuba.stac': { dir: 'Brass/Tuba/stac' },
  violins: { dir: 'Strings/Violin Section/susVib' },
  'violins.spic': { dir: 'Strings/Violin Section/Spic' },
  'violins.pizz': { dir: 'Strings/Violin Section/Pizz' },
  'violins.trem': { dir: 'Strings/Violin Section/Trem' },
  violas: { dir: 'Strings/Viola Section/susvib' },
  'violas.spic': { dir: 'Strings/Viola Section/spic' },
  cellos: { dir: 'Strings/Cello Section/susvib' },
  'cellos.spic': { dir: 'Strings/Cello Section/spic' },
  'cellos.pizz': { dir: 'Strings/Cello Section/pizzT' },
  bass: { dir: 'Strings/Solo Contrabass/SusNV' },
  'bass.pizz': { dir: 'Strings/Solo Contrabass/Pizz' },
  harp: { dir: 'Strings/Harp' },
  glock: { dir: 'Percussion/Glock' },
  piano: { dir: 'Keys/Upright Nr1' },
  flute: { dir: 'Woodwinds/Flute/susvib' },
  oboe: { dir: 'Woodwinds/Oboe/Vib' },
  clarinet: { dir: 'Woodwinds/Clarinet/susLong' },
  /* a bell's strike note is not its lowest partial, so nothing can measure it: the labels are right, C4 to F5 is the instrument's real range */
  tubular: { prefix: 'Percussion/TB_hit', trust: true },
  timpani: { dir: 'Percussion/Timpani', pitch: 'detect' },
  'timpani.roll': { dir: 'Percussion/Timpani/Rolls', pitch: 'detect' },
  bassdrum: { prefix: 'Percussion/BDrumNewhit', pitch: 'none' },
  'bassdrum.rub': { prefix: 'Percussion/bassdrum_rub', pitch: 'none' },
  crash: { prefix: 'Percussion/cymbal-crash', pitch: 'none' },
  gong: { prefix: 'Percussion/gongHit', pitch: 'none' },
  'gong.scrape': { prefix: 'Percussion/gongscrape', pitch: 'none' },
  suscymbal: { prefix: 'Percussion/susCymb', pitch: 'none' },
  triangle: { prefix: 'Percussion/Triangle', pitch: 'none' },
  snare: { prefix: 'Percussion/Snare', pitch: 'none' },
  belltree: { prefix: 'Percussion/BellTree', pitch: 'none' },
  vibraring: { prefix: 'Percussion/vibraring', pitch: 'none' },
};
/* these die away by themselves: a note longer than the recording is followed by silence, never by a loop of its tail */
const DIES_AWAY = /\.(stac|spic|pizz)$|^(harp|glock|piano|tubular|timpani$|bassdrum|crash|gong|triangle|snare|belltree|vibraring)/;
const DYNAMICS = { ppp: 1, pp: 2, p: 3, mp: 4, mf: 5, f: 6, ff: 7, fff: 8, soft: 3, medium: 5, med: 5, hard: 7, loud: 7 };
const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MICS = ['sum', 'main', 'mid', 'close', 'side', 'room', 'far'];

/* any PCM or float WAV, mono or stereo, at any rate */
const readPcm = file => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`not a WAV: ${file}`);
  let at = 12; let tag = 1; let channels = 2; let sr = 44100; let bits = 16; let start = -1; let size = 0;
  while (at + 8 <= b.length) {
    const id = b.toString('ascii', at, at + 4);
    const length = b.readUInt32LE(at + 4);
    if (id === 'fmt ') {
      tag = b.readUInt16LE(at + 8); channels = b.readUInt16LE(at + 10); sr = b.readUInt32LE(at + 12); bits = b.readUInt16LE(at + 22);
      if (tag === 0xfffe) tag = b.readUInt16LE(at + 32);
    } else if (id === 'data') {
      start = at + 8; size = Math.min(length, b.length - start);
      break;
    }
    at += 8 + length + (length & 1);
  }
  if (start < 0) throw new Error(`no data chunk: ${file}`);
  const width = bits / 8;
  const frames = Math.floor(size / (channels * width));
  const read = offset => {
    if (tag === 3) return bits === 64 ? b.readDoubleLE(offset) : b.readFloatLE(offset);
    if (bits === 16) return b.readInt16LE(offset) / 32768;
    if (bits === 24) return b.readIntLE(offset, 3) / 8388608;
    if (bits === 32) return b.readInt32LE(offset) / 2147483648;
    return (b.readUInt8(offset) - 128) / 128;
  };
  const L = new Float32Array(frames);
  const R = channels > 1 ? new Float32Array(frames) : null;
  for (let i = 0; i < frames; i += 1) {
    const base = start + i * channels * width;
    L[i] = read(base);
    if (R) R[i] = read(base + width);
  }
  return { sr, L, R, frames };
};

const parseName = file => {
  const tokens = file.replace(/\.wav$/i, '').split(/[_\s]+/);
  let key = null; let layer = 0; let rr = 1; let mic = '';
  tokens.forEach((token, index) => {
    const note = /^([A-G])(#|b)?(-?\d)$/.exec(token);
    if (note && key === null) key = (Number(note[3]) + 1) * 12 + STEPS[note[1]] + (note[2] === '#' ? 1 : note[2] === 'b' ? -1 : 0);
    const velocity = /^v(\d+)$/i.exec(token);
    if (velocity) layer = Number(velocity[1]);
    if (DYNAMICS[token.toLowerCase()]) layer = DYNAMICS[token.toLowerCase()];
    const robin = /^rr(\d+)$/i.exec(token);
    if (robin) rr = Number(robin[1]);
    if (index === tokens.length - 1 && /^\d+$/.test(token)) rr = Number(token);
    if (MICS.includes(token.toLowerCase())) mic = token.toLowerCase();
  });
  return { key, layer, rr, mic };
};

/* YIN: the fundamental of a stretch of sound, as a MIDI number, or null */
const detectPitch = (x, sr, start, window = 4096, low = 28, high = 4200) => {
  const longest = Math.min(Math.floor(sr / low), window);
  const shortest = Math.max(2, Math.floor(sr / high));
  if (start + window + longest >= x.length) return null;
  const d = new Float64Array(longest + 1);
  for (let tau = 1; tau <= longest; tau += 1) {
    let s = 0;
    for (let j = 0; j < window; j += 1) { const e = x[start + j] - x[start + j + tau]; s += e * e; }
    d[tau] = s;
  }
  const c = new Float64Array(longest + 1);
  let running = 0;
  for (let tau = 1; tau <= longest; tau += 1) { running += d[tau]; c[tau] = d[tau] * tau / (running || 1); }
  let found = -1;
  for (let tau = shortest; tau < longest; tau += 1) {
    if (c[tau] < 0.14) { while (tau + 1 < longest && c[tau + 1] < c[tau]) tau += 1; found = tau; break; }
  }
  if (found < 0) {
    let best = Infinity;
    for (let tau = shortest; tau < longest; tau += 1) if (c[tau] < best) { best = c[tau]; found = tau; }
    if (best > 0.45) return null;
  }
  const a = c[found - 1]; const b = c[found]; const e = c[found + 1] ?? b;
  const shift = (a - e) / (2 * (a - 2 * b + e) || 1);
  return 69 + 12 * Math.log2(sr / (found + shift) / 440);
};
const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export default kit => {
  const { SR, TAU, N, db, clamp, gauss, filter, lp, hp, bp, white, pink, saw, shape, decay, gainOf, norm, drive, sum, pad, wander, ramp, ring, burst, impact, hz, ROOM_SPECS } = kit;

  /* the spaces these themes live in, beside the render script's hall */
  Object.assign(ROOM_SPECS, {
    /* an old movie palace: velvet and plaster, warm, the top goes early */
    theatre: { seconds: 3, low: 2.1, mid: 1.7, high: 0.8, predelay: 0.028, early: [[0.034, 0.5, 3400], [0.052, 0.42, 2800], [0.081, 0.34, 2300], [0.124, 0.25, 1900]], seed: 'theatre' },
    /* stone: a very long tail, kept quiet in the send */
    cathedral: { seconds: 7, low: 6, mid: 5, high: 2.6, predelay: 0.06, early: [[0.08, 0.4, 3000], [0.13, 0.34, 2600], [0.21, 0.28, 2100], [0.33, 0.2, 1700], [0.5, 0.13, 1300]], seed: 'cathedral' },
    /* a small jazz room: close and dry */
    studio: { seconds: 1.1, low: 0.8, mid: 0.7, high: 0.38, predelay: 0.008, early: [[0.011, 0.6, 5200], [0.019, 0.46, 4200], [0.031, 0.34, 3400]], seed: 'studio' },
    /* a film scoring stage: huge, even, and clear */
    soundstage: { seconds: 5, low: 3.6, mid: 3, high: 1.4, predelay: 0.05, early: [[0.07, 0.42, 3400], [0.11, 0.36, 2800], [0.17, 0.3, 2300], [0.26, 0.22, 1800]], seed: 'soundstage' },
  });

  /* ── the library ── */
  const root = () => {
    const dir = process.env.PACK_SAMPLES;
    if (!dir) throw new Error('PACK_SAMPLES is not set: point it at a checkout of VSCO-2-CE (see the top of pack-instruments.mjs)');
    return dir;
  };
  const filesOf = spec => {
    const base = root();
    if (spec.dir) {
      const dir = path.join(base, spec.dir);
      return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.wav$/i.test(f)).map(f => path.join(spec.dir, f)) : [];
    }
    const parent = path.dirname(spec.prefix); const stem = path.basename(spec.prefix);
    const dir = path.join(base, parent);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.wav$/i.test(f) && f.startsWith(stem)).map(f => path.join(parent, f)) : [];
  };
  const scan = () => {
    const out = {};
    let kettles = {};
    for (const [name, spec] of Object.entries(GROUPS)) {
      /* one microphone per take */
      const takes = new Map();
      filesOf(spec).forEach(file => {
        const parsed = parseName(path.basename(file));
        const id = `${parsed.key}|${parsed.layer}|${parsed.rr}|${path.basename(file).replace(/(_?)(sum|main|mid|close|side|room|far)(\.wav)$/i, '$3')}`;
        const held = takes.get(id);
        const rank = m => { const at = MICS.indexOf(m); return at < 0 ? 99 : at; };
        if (!held || rank(parsed.mic) < rank(held.mic)) takes.set(id, { file, ...parsed });
      });
      const list = [...takes.values()];
      list.forEach(take => {
        const pcm = readPcm(path.join(root(), take.file));
        let peak = 0;
        for (let i = 0; i < pcm.frames; i += 1) peak = Math.max(peak, Math.abs(pcm.L[i]), pcm.R ? Math.abs(pcm.R[i]) : 0);
        let onset = 0;
        const limit = peak * 0.02;
        for (let i = 0; i < pcm.frames; i += 1) if (Math.abs(pcm.L[i]) > limit || (pcm.R && Math.abs(pcm.R[i]) > limit)) { onset = i; break; }
        Object.assign(take, { sr: pcm.sr, frames: pcm.frames, stereo: Boolean(pcm.R), peak, onset: Math.max(0, onset - Math.round(pcm.sr * 0.003)) });
      });
      let shift = 0; let tune = 0;
      if (spec.pitch !== 'none' && !spec.trust && list.length) {
        const top = Math.max(...list.map(t => t.layer));
        const measure = take => {
          const pcm = readPcm(path.join(root(), take.file));
          const whole = pcm.R ? pcm.L.map((v, i) => v + pcm.R[i]) : pcm.L;
          const past = Math.round(pcm.sr * ((take.frames - take.onset) / pcm.sr > 1.2 ? 0.16 : 0.035));
          return detectPitch(whole, pcm.sr, take.onset + past);
        };
        if (spec.pitch === 'detect') {
          /* a drum's pitch: the takes of one kettle agree once each is folded into the instrument's range, because a measurement of a drum can land an octave off. The rolls are the same kettles */
          const kettle = take => /Timpani\d/.exec(take.file)?.[0] ?? '';
          const fold = m => { let v = m; while (v < 34) v += 12; while (v >= 50) v -= 12; return v; };
          if (name === 'timpani') {
            const heard = {};
            list.forEach(take => { const m = measure(take); if (m !== null) (heard[kettle(take)] ||= []).push(fold(m)); });
            kettles = Object.fromEntries(Object.entries(heard).map(([k, values]) => [k, Math.round(median(values))]));
          }
          list.forEach(take => { take.key = kettles[kettle(take)] ?? null; });
        } else {
          const keyed = list.filter(t => t.key !== null && t.layer === top).sort((a, b) => a.key - b.key);
          const every = Math.max(1, Math.floor(keyed.length / 7));
          const gaps = keyed.filter((_, i) => i % every === 0).map(t => { const m = measure(t); return m === null ? null : m - t.key; }).filter(v => v !== null);
          if (gaps.length) { const middle = median(gaps); shift = 12 * Math.round(middle / 12); tune = Math.round((middle - shift) * 100); }
        }
      }
      const peaks = list.map(t => t.peak).sort((a, b) => a - b);
      const usual = peaks[Math.floor(peaks.length * 0.95)] || 1;
      out[name] = { shift, tune, level: 1 / usual, takes: list };
      const keys = [...new Set(list.map(t => t.key).filter(k => k !== null))].sort((a, b) => a - b);
      const layers = [...new Set(list.map(t => t.layer))].sort((a, b) => a - b);
      const seconds = median(list.map(t => t.frames / t.sr));
      console.log(`${name.padEnd(17)} ${String(list.length).padStart(4)} takes  sounding ${keys.length ? `${keys[0] + shift}-${keys[keys.length - 1] + shift} (${keys.length} notes)` : 'unpitched'}  layers [${layers.join(',')}]  label${shift >= 0 ? '+' : ''}${shift} tune ${tune}c  median ${seconds.toFixed(1)} s`);
    }
    fs.writeFileSync(path.join(root(), 'index.json'), JSON.stringify(out));
    console.log(`index written: ${path.join(root(), 'index.json')}`);
  };
  let index = null;
  const library = () => {
    if (!index) {
      const file = path.join(root(), 'index.json');
      if (!fs.existsSync(file)) throw new Error('no index.json: run render-pack-sounds.mjs --scan-samples once');
      index = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return index;
  };
  const pcmCache = new Map();
  const pcmOf = file => {
    let pcm = pcmCache.get(file);
    if (!pcm) { pcm = readPcm(path.join(root(), file)); pcmCache.set(file, pcm); }
    return pcm;
  };
  /* the nearest recorded note, then the layer nearest the velocity, then any take of it */
  const pick = (rand, name, midi, vel, match) => {
    const group = library()[name];
    if (!group) throw new Error(`no sample group "${name}": ${Object.keys(library()).join(', ')}`);
    let takes = match ? group.takes.filter(t => match.test(t.file)) : group.takes;
    if (!takes.length) throw new Error(`nothing in "${name}" matches ${match}`);
    if (midi !== null && midi !== undefined) {
      const keyed = takes.filter(t => t.key !== null);
      if (keyed.length) {
        const distance = t => Math.abs(t.key + group.shift - midi);
        const least = Math.min(...keyed.map(distance));
        takes = keyed.filter(t => distance(t) === least);
      }
    }
    const layers = [...new Set(takes.map(t => t.layer))].sort((a, b) => a - b);
    const layer = layers[clamp(Math.round(clamp(vel, 0, 1) * (layers.length - 1)), 0, layers.length - 1)];
    const inLayer = takes.filter(t => t.layer === layer);
    return { group, take: inLayer[Math.floor(rand() * inLayer.length) % inLayer.length] };
  };
  /* cubic Hermite through the recording. bend: t -> cents, for scoops, falls and shakes */
  const resample = (src, from, ratio, count, bend) => {
    const out = new Float32Array(count);
    let p = from;
    for (let i = 0; i < count; i += 1) {
      const k = Math.floor(p);
      if (k + 2 >= src.length) break;
      const f = p - k;
      const a = src[k - 1] ?? src[k]; const b = src[k]; const c = src[k + 1]; const d = src[k + 2];
      out[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
      p += bend ? ratio * 2 ** (bend(i / SR) / 1200) : ratio;
    }
    return out;
  };
  /* a held note longer than its recording goes on by crossfading back into the recording's own sustain */
  const stretch = (y, need, overlap) => {
    const out = new Float32Array(need);
    const end = Math.floor(y.length * 0.84);
    const start = Math.floor(y.length * 0.3);
    const X = Math.min(overlap, Math.floor((end - start) * 0.45));
    out.set(y.subarray(0, end));
    let w = end - X;
    while (w < need) {
      for (let i = 0; i < end - start && w + i < need; i += 1) {
        const v = y[start + i];
        if (i < X) { const g = i / X; out[w + i] = out[w + i] * Math.cos(g * Math.PI / 2) + v * Math.sin(g * Math.PI / 2); } else out[w + i] = v;
      }
      w += end - start - X;
    }
    return out;
  };
  /**
   * One recorded note. name: a group. midi: the note you want to hear (middle C is 60). seconds: how long it sounds, its release included.
   * vel 0-1 picks the dynamic layer and scales gently. release: the fade at the end. attack: a fade-in, to soften the start. skip: seconds of the recording to skip after its onset.
   * legato: skip the attack and fade in, for the notes after the first of a slur. cents: detune. bend: t -> cents. swell: t -> gain. tone: a low-pass in Hz (number or t -> Hz), for far or soft playing.
   * pan, width: where the recording's stereo image sits. match: a RegExp on the file name, to choose a technique. midi null keeps the recording's own pitch; rate multiplies the speed.
   */
  const note = (rand, name, midi, seconds, { vel = 0.7, release = 0.25, attack = 0, skip = 0, legato = false, cents = 0, bend = null, swell = null, tone = null, pan = 0, width = 0.75, match = null, rate = 1 } = {}) => {
    const { group, take } = pick(rand, name, midi, vel, match);
    const pcm = pcmOf(take.file);
    const sounding = take.key === null ? null : take.key + group.shift;
    const pitchMove = midi === null || midi === undefined || sounding === null ? 0 : midi - sounding;
    const ratio = (take.sr / SR) * rate * 2 ** ((pitchMove + cents / 100) / 12);
    const from = take.onset + (legato ? 0.07 : skip) * take.sr;
    const available = Math.max(1, Math.floor((take.frames - from) / ratio));
    const need = N(seconds);
    const gain = group.level * (0.62 + 0.38 * clamp(vel, 0, 1));
    const channels = pcm.R ? [pcm.L, pcm.R] : [pcm.L];
    const fadeIn = legato ? Math.max(attack, 0.05) : attack;
    return channels.map((channel, index) => {
      let y = resample(channel, from, ratio, Math.min(available, need), bend);
      if (y.length < need) {
        if (DIES_AWAY.test(name)) { const whole = new Float32Array(need); whole.set(y); y = whole; } else y = stretch(y, need, N(0.55));
      }
      const fadeFrom = Math.max(0, seconds - release);
      for (let i = 0; i < y.length; i += 1) {
        const t = i / SR;
        let g = gain;
        if (fadeIn > 0 && t < fadeIn) g *= Math.sin((t / fadeIn) * Math.PI / 2) ** 2;
        if (t > fadeFrom) g *= Math.cos(clamp((t - fadeFrom) / Math.max(1e-4, release), 0, 1) * Math.PI / 2) ** 2;
        if (swell) g *= swell(t);
        y[i] *= g;
      }
      if (tone) y = lp(y, tone, 0.7);
      return { x: y, pan: channels.length > 1 ? clamp(pan + (index ? width : -width), -1, 1) : pan, g: channels.length > 1 ? Math.SQRT1_2 : 1 };
    });
  };
  /** A recording played as it is: a gong, a crash, a drum. seconds defaults to its whole length. */
  const hit = (rand, name, { vel = 0.8, seconds = null, release = 0.2, match = null, rate = 1, pan = 0, width = 0.75, tone = null, skip = 0, swell = null, midi = null } = {}) => {
    const { take } = pick(rand, name, midi, vel, match);
    const whole = (take.frames - take.onset) / take.sr / rate;
    return note(rand, name, midi, seconds ?? whole, { vel, release, match: new RegExp(path.basename(take.file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), rate, pan, width, tone, skip, swell });
  };
  /** A section out of few players: several takes of a note, each a hair out of tune and out of time, spread across the stage. */
  const section = (rand, name, midi, seconds, { players = 3, spreadCents = 7, spreadMs = 12, spreadPan = 0.3, ...options } = {}) => {
    const voices = [];
    for (let p = 0; p < players; p += 1) {
      const place = players > 1 ? (p / (players - 1) - 0.5) * 2 * spreadPan : 0;
      const d = (rand() * spreadMs) / 1000;
      const these = note(rand, name, midi, seconds, { ...options, cents: (options.cents ?? 0) + gauss(rand) * spreadCents, pan: (options.pan ?? 0) + place });
      these.forEach(v => voices.push({ ...v, g: (v.g ?? 1) / Math.sqrt(players), d: (v.d ?? 0) + d }));
    }
    return voices;
  };
  /** Puts voices in a Mix or a LoopMix. send: { hall: 0.3 } and so on. */
  const play = (mix, voices, at, gain = 1, send = {}) => {
    voices.forEach(v => mix.add(v.x, at + (v.d ?? 0), gain * (v.g ?? 1), v.pan ?? 0, send));
  };
  /** The same sound, played backwards: a swell into a hit. */
  const reversed = voices => voices.map(v => ({ ...v, x: Float32Array.from(v.x).reverse() }));
  const mono = x => [{ x, pan: 0, g: 1 }];

  /* ── what the library has not got ── */
  const VOWELS = {
    ah: [[800, 90, 1], [1150, 100, 0.55], [2900, 130, 0.26], [3900, 140, 0.12], [4950, 150, 0.06]],
    oh: [[430, 60, 1], [820, 80, 0.4], [2600, 110, 0.12], [3100, 130, 0.07]],
    oo: [[340, 50, 1], [620, 70, 0.14], [2500, 110, 0.04]],
    eh: [[600, 70, 1], [1700, 100, 0.4], [2600, 120, 0.25], [3500, 140, 0.1]],
    mm: [[270, 60, 1], [950, 130, 0.07], [2300, 170, 0.02]],
  };
  /** A choir, as there is none in the library: saws through vowel formants, many voices, each with its own vibrato, and breath through the same formants. vowel: ah oh oo eh mm. */
  const choir = (rand, midi, seconds, { vowel = 'ah', voices = 6, attack = 0.6, release = 0.9, vibrato = 16, spread = 11, breath = 0.09, swell = null, width = 0.7 } = {}) => {
    const f0 = hz(midi);
    const shapeOf = ramp([[0, 0], [attack, 1], [Math.max(attack + 0.01, seconds - release), 0.92], [seconds, 0]]);
    const n = N(seconds);
    return [-width, 0, width].map(pan => {
      const out = new Float32Array(n);
      const count = Math.max(1, Math.round(voices / 3));
      for (let v = 0; v < count; v += 1) {
        const drift = wander(seconds + 1, 0.4 + rand() * 0.4, rand);
        const rate = 4.7 + rand() * 1.1; const phase = rand() * TAU;
        const fixed = gauss(rand) * spread;
        const entry = N(rand() * 0.14);
        const x = saw(n, t => f0 * 2 ** ((fixed + (drift(t) - 0.5) * 10 + Math.sin(TAU * rate * t + phase) * vibrato * Math.min(1, Math.max(0, t - 0.3) / 0.8)) / 1200), rand);
        for (let i = entry; i < n; i += 1) out[i] += x[i - entry];
      }
      const air = gainOf(pink(n, rand), breath * count * 3);
      for (let i = 0; i < n; i += 1) out[i] += air[i];
      const formed = new Float32Array(n);
      VOWELS[vowel].forEach(([f, bandwidth, a], index) => {
        /* a high voice opens its first formant to sit on the note */
        const at = index === 0 ? Math.max(f, f0 * 1.08) : f;
        const band = bp(out, at, at / bandwidth);
        for (let i = 0; i < n; i += 1) formed[i] += band[i] * a;
      });
      shape(formed, t => shapeOf(t) * (swell ? swell(t) : 1));
      return { x: norm(formed), pan, g: 1 / Math.sqrt(3) };
    });
  };
  const modal = (rand, f, seconds, parts, { attack = 0.0006, tremolo = 0, tremoloDepth = 0 } = {}) => {
    const n = N(seconds);
    const out = new Float32Array(n);
    parts.forEach(([ratio, amp, tau, beat = 0]) => {
      const at = f * ratio;
      if (at > SR * 0.45) return;
      const w = TAU * at / SR; const w2 = TAU * (at + beat) / SR;
      const ph = rand() * TAU; const ph2 = rand() * TAU;
      for (let i = 0; i < n; i += 1) {
        const e = Math.exp(-(i / SR) / tau);
        out[i] += amp * e * (beat ? (Math.sin(w * i + ph) + Math.sin(w2 * i + ph2)) * 0.5 : Math.sin(w * i + ph));
      }
    });
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      let g = Math.min(1, t / attack) * Math.min(1, (seconds - t) / 0.05);
      if (tremolo) g *= 1 - tremoloDepth * (0.5 + 0.5 * Math.cos(TAU * tremolo * t));
      out[i] *= g;
    }
    return out;
  };
  /** Vibraphone: a warm bar, its fourth partial, and the motor's tremolo (motor 0 to stop it). */
  const vibes = (rand, midi, seconds = 3, { vel = 0.7, motor = 5.2, pan = 0 } = {}) => {
    const bright = 0.5 + vel * 0.7;
    const x = modal(rand, hz(midi), seconds, [[1, 1, 1.5 * 2 ** ((60 - midi) / 24)], [4, 0.24 * bright, 0.34], [10, 0.05 * bright, 0.09]], { attack: 0.0012, tremolo: motor, tremoloDepth: motor ? 0.28 : 0 });
    const tick = pad(lp(decay(white(N(0.006), rand), 0.0016, 0.0002), 2600), seconds);
    return [{ x: norm(sum(x, gainOf(norm(tick), 0.06 * bright))), pan, g: 1 }];
  };
  /** Celesta: steel plates over wood, soft and high. */
  const celesta = (rand, midi, seconds = 2.4, { vel = 0.7, pan = 0 } = {}) => {
    const x = modal(rand, hz(midi), seconds, [[1, 1, 0.95, 0.5], [2, 0.16, 0.5], [4.02, 0.12 * (0.6 + vel), 0.2], [6.3, 0.03, 0.08]], { attack: 0.0014 });
    const box = pad(lp(decay(white(N(0.02), rand), 0.005, 0.0004), 900), seconds);
    return [{ x: norm(sum(x, gainOf(norm(box), 0.05))), pan, g: 1 }];
  };
  /** A great bell: hum, prime, tierce, quint and nominal, each partial a slow beat, with its own decay. seconds sets the size of the ring. */
  const bell = (rand, midi, seconds = 7, { bright = 1, strike = 1, pan = 0 } = {}) => {
    const T = seconds / 2.3;
    const x = modal(rand, hz(midi), seconds, [
      [0.5, 0.55, T, 0.35], [1, 0.75, T * 0.82, 0.9], [1.2, 0.5, T * 0.6, 1.3], [1.5, 0.2, T * 0.42, 0.7], [2, 1, T * 0.5, 1.6],
      [3, 0.45 * bright, T * 0.3, 1.1], [4, 0.26 * bright, T * 0.2, 1.8], [5.33, 0.12 * bright, T * 0.13, 1.5], [6.67, 0.06 * bright, T * 0.09, 2],
    ], { attack: 0.0008 });
    const clang = pad(lp(decay(white(N(0.03), rand), 0.007, 0.0002), 3600), seconds);
    return [{ x: norm(sum(x, gainOf(norm(clang), 0.22 * strike))), pan, g: 1 }];
  };
  /** A cinema boom: a falling low sine for the big speaker, and a knock for the phone that has none. */
  const boom = (rand, { hertz = 46, seconds = 3, tau = 0.7, knock = 0.8, knockBase = 190 } = {}) => {
    const n = N(seconds);
    const low = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      ph += TAU * hertz * (1 + 1.7 * Math.exp(-t / 0.035)) / SR;
      low[i] = Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.002);
    }
    drive(low, 2.2);
    const body = impact(rand, { mass: 2.4, seconds, click: 0.35, knock, low: 0.3, knockBase, knockTau: 0.11, lowHz: hertz * 1.5, lowTau: 0.2 });
    return mono(norm(sum(low, gainOf(body, 0.55))));
  };
  /** The big film-trailer horn: detuned saws, driven, a filter that bursts open and closes. Lay it under real brass. */
  const braam = (rand, midi, seconds = 3.2, { open = 0.14, peak = 3400, rest = 520, width = 0.8 } = {}) => {
    const n = N(seconds);
    const cut = ramp([[0, 190], [open, peak], [open + 0.5, peak * 0.42], [seconds * 0.6, rest], [seconds, rest * 0.7]]);
    const level = ramp([[0, 0], [0.018, 1], [seconds * 0.5, 0.72], [seconds, 0]]);
    return [[-width, -9], [-width * 0.4, -3], [width * 0.4, 4], [width, 11]].map(([pan, cents]) => {
      const a = saw(n, hz(midi) * 2 ** (cents / 1200), rand);
      const b = saw(n, hz(midi - 12) * 2 ** (-cents / 1200), rand);
      const c = saw(n, hz(midi + 7) * 2 ** ((cents * 0.6) / 1200), rand);
      const mix = new Float32Array(n);
      for (let i = 0; i < n; i += 1) mix[i] = a[i] + b[i] * 0.9 + c[i] * 0.35;
      const x = lp(drive(norm(mix), 2.1), cut, 1.1);
      return { x: norm(shape(x, level)), pan, g: 0.5 };
    });
  };
  /** Rising noise, for the second before a hit. */
  const riser = (rand, seconds = 1.6, { from = 300, to = 6500, Q = 1.4 } = {}) => mono(norm(shape(filter(white(N(seconds), rand), 'bp', t => from * (to / from) ** (t / seconds), Q), t => (t / seconds) ** 2.2 * Math.min(1, (seconds - t) / 0.02))));
  /** A finger snap. */
  const snap = (rand, { vel = 0.8, pan = 0 } = {}) => {
    const s = 0.16;
    const crack = pad(hp(decay(white(N(0.01), rand), 0.0022, 0.0001), 1200), s);
    const flesh = pad(norm(bp(decay(white(N(0.08), rand), 0.02, 0.0004), 2100 + rand() * 500, 1.5)), s);
    return [{ x: norm(sum(gainOf(norm(crack), 0.62), flesh)), pan, g: 0.6 + vel * 0.4 }];
  };
  /** A brush tap on a snare: wires and a little drum. */
  const brushTap = (rand, { vel = 0.6, pan = 0 } = {}) => {
    const s = 0.24;
    const wires = norm(bp(decay(white(N(s), rand), 0.05 + vel * 0.05, 0.002), 3600, 0.6));
    const skin = pad(ring(burst(rand, 2, 1800, 0.2), rand, { base: 190, count: 5, tau: 0.05, tilt: 0.8 }), s);
    return [{ x: norm(sum(wires, gainOf(skin, 0.45))), pan, g: 0.5 + vel * 0.5 }];
  };
  /** A brush stirring round the drum: a slow swish of air. */
  const brushSwish = (rand, seconds = 0.6, { vel = 0.5, pan = 0 } = {}) => {
    const x = filter(white(N(seconds), rand), 'bp', t => 2600 + 2400 * Math.sin(Math.PI * t / seconds), 0.7);
    return [{ x: norm(shape(x, t => Math.sin(Math.PI * t / seconds) ** 1.4)), pan, g: 0.5 + vel * 0.5 }];
  };
  /** A ride cymbal: a ping over a bed of bright metal. */
  const ride = (rand, { vel = 0.6, seconds = 1.4, pan = 0 } = {}) => {
    const ping = modal(rand, 3350 + rand() * 90, seconds, [[1, 1, 0.3, 11], [1.48, 0.7, 0.26, 17], [2.13, 0.55, 0.2, 23], [2.77, 0.3, 0.16, 29]], { attack: 0.0004 });
    const wash = hp(decay(white(N(seconds), rand), 0.42, 0.001), 5200);
    return [{ x: norm(sum(ping, gainOf(norm(wash), 0.5))), pan, g: 0.5 + vel * 0.5 }];
  };
  /** A plucked string where the recordings do not reach, or as a soft inner part: Karplus-Strong with a choice of pluck. */
  const string = (rand, midi, seconds = 2, { vel = 0.7, t60 = 2.5, damp = 0.25, cut = 3200, pick: where = 0.2, pan = 0 } = {}) => {
    const n = N(seconds);
    const out = new Float32Array(n);
    const period = SR / hz(midi) - damp;
    const size = Math.ceil(period) + 3;
    const line = new Float64Array(size);
    const g = 10 ** (-3 * (period / SR) / t60);
    const span = Math.floor(period);
    const noise = norm(lp(white(span + 64, rand), cut * (0.5 + vel)));
    const pluckAt = Math.max(1, Math.floor(period * where));
    let w = 0; let previous = 0;
    for (let i = 0; i < n; i += 1) {
      const input = i < span ? (noise[i] - (i >= pluckAt ? noise[i - pluckAt] * 0.7 : 0)) * Math.sin((i / span) * Math.PI) : 0;
      const read = (w - period + size * 2) % size;
      const k = Math.floor(read);
      const delayed = line[k] + (line[(k + 1) % size] - line[k]) * (read - k);
      const value = input + g * ((1 - damp) * delayed + damp * previous);
      previous = delayed;
      line[w] = value;
      out[i] = value;
      w = (w + 1) % size;
    }
    shape(out, t => Math.min(1, (seconds - t) / 0.08));
    return [{ x: norm(hp(out, 36)), pan, g: 1 }];
  };

  /* ── how a score plays the recordings: what the first theme learned, for every theme ── */
  const NOTE_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  /** 'Bb5' to 82. A number passes through. */
  const m = name => {
    if (typeof name === 'number') return name;
    const [, letter, accidental, octave] = /^([A-G])(b|#)?(\d)$/.exec(name);
    return (Number(octave) + 1) * 12 + NOTE_STEPS[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0);
  };
  /* The recordings differ by up to 20 dB from note to note, so a score sets each note's level itself: rms in dB for what sustains, peak in dB for what is struck. Timbre comes from vel and tone. */
  const atRms = (voices, level, from = 0.08, to = 0.8) => {
    let e = 0;
    voices.forEach(v => {
      const a = Math.min(N(from), Math.floor(v.x.length * 0.3)); const b = Math.max(a + 1, Math.min(N(to), v.x.length));
      let s = 0;
      for (let i = a; i < b; i += 1) s += v.x[i] * v.x[i];
      e += (s / (b - a)) * (v.g ?? 1) ** 2;
    });
    const scale = db(level) / Math.sqrt(e || 1e-12);
    return voices.map(v => ({ ...v, g: (v.g ?? 1) * scale }));
  };
  const atPeak = (voices, level) => {
    let top = 0;
    voices.forEach(v => { for (let i = 0; i < v.x.length; i += 1) top = Math.max(top, Math.abs(v.x[i]) * (v.g ?? 1)); });
    const scale = db(level) / ((top * Math.SQRT2) || 1e-9);
    return voices.map(v => ({ ...v, g: (v.g ?? 1) * scale }));
  };
  /* The index's kettle labels are a quarter tone out or an octave off. Measured with a DFT, the principal partial of each kettle sits at these true pitches. Ask by true pitch: F2 to G3 is what they play well */
  const KETTLES = [{ take: /Timpani1/, key: 42, real: 41.6 }, { take: /Timpani2/, key: 35, real: 46.9 }, { take: /Timpani3/, key: 37, real: 49.5 }, { take: /Timpani4/, key: 40, real: 52.45 }, { take: /Timpani5/, key: 43, real: 54.9 }];
  const onKettle = name => {
    const midi = m(name);
    const k = KETTLES.reduce((best, c) => (Math.abs(c.real - midi) < Math.abs(best.real - midi) ? c : best));
    return { key: k.key, match: k.take, cents: (midi - k.real) * 100 };
  };
  /* cents to pass to the harp and the glockenspiel: their recordings run about 8 flat and about 15 sharp. Everything else is within 5 */
  const HARP = 8; const GLOCK = -15;
  /* A section made of copies of one recording phases, above all on a phone, which sums to mono: each partial beats against itself. So each player gets a different recording: the next nearest sampled note, retuned */
  const takesNear = (group, midi, vel) => {
    const { takes, shift } = library()[group];
    const keys = [...new Set(takes.map(t => t.key + shift))].sort((a, b) => Math.abs(a - midi) - Math.abs(b - midi));
    const reach = Math.max(6, Math.abs(keys[0] - midi));
    return keys.filter(k => Math.abs(k - midi) <= reach).map(k => {
      const here = takes.filter(t => t.key + shift === k);
      const layers = [...new Set(here.map(t => t.layer))].sort((a, b) => a - b);
      const layer = layers[Math.round(clamp(vel, 0, 1) * (layers.length - 1))];
      const take = here.find(t => t.layer === layer);
      return new RegExp(path.basename(take.file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    });
  };
  /**
   * One mix's players: the way to write a score. rooms: { theatre: 1, hall: 0.2 }, scaled by each call's send. names are 'Bb5' or a MIDI number.
   *   sus(group, name, at, seconds, levelDb, send, { players, spreadCents, spreadMs, spreadPan, loose, from, to, after, bendOf, vel, tone, skip, attack, release, legato, pan, cents, ... })
   *     a sustained or articulated note at an rms level. players: a section, each on a different recording. loose: ms of timing jitter. after: t -> gain, the score's dynamics. bendOf: () => (t -> cents), one per player.
   *   hit(group, name|null, at, seconds, levelDb, send, { loose, after, ... }): something struck or plucked at a peak level. null keeps the recording's pitch.
   *   timp(names, at, seconds, levelDb, send, options): timpani by true pitch; several names are a double stop. roll(name, at, seconds, levelDb, send, options): a roll on that kettle.
   */
  const band = (mix, rand, rooms) => {
    const room = send => Object.fromEntries(Object.entries(rooms).map(([name, amount]) => [name, amount * send]));
    const when = (at, loose) => at + (loose ? (rand() - 0.5) * 2 * loose / 1000 : 0);
    const dynamics = (voices, after) => { if (after) voices.forEach(v => shape(v.x, after)); return voices; };
    return {
      sus(group, name, at, seconds, level, send, { players = 1, spreadCents = 5, spreadMs = 10, spreadPan = 0.22, loose = 6, from, to, after, bendOf, ...o } = {}) {
        const pool = takesNear(group, m(name), o.vel ?? 0.7);
        const each = level + gauss(rand) * 0.35 - 10 * Math.log10(players);
        const start = when(at, loose);
        for (let p = 0; p < players; p += 1) {
          const place = players > 1 ? (p / (players - 1) - 0.5) * 2 * spreadPan : 0;
          const again = Math.floor(p / pool.length);
          const voices = note(rand, group, m(name), seconds, { width: 0.3, attack: 0.004, ...o, match: pool[p % pool.length], skip: (o.skip ?? 0) + again * 0.23, cents: (o.cents ?? 0) + (players > 1 ? gauss(rand) * spreadCents : 0), pan: (o.pan ?? 0) + place, bend: bendOf ? bendOf() : o.bend });
          play(mix, dynamics(atRms(voices, each, from, to), after), start + (p && players > 1 ? rand() * spreadMs / 1000 : 0), 1, room(send));
        }
      },
      hit(group, name, at, seconds, level, send, { loose = 3, after, ...o } = {}) {
        const voices = note(rand, group, name === null ? null : m(name), seconds, { width: 0.4, ...o });
        play(mix, dynamics(atPeak(voices, level + gauss(rand) * 0.35), after), when(at, loose), 1, room(send));
      },
      timp(names, at, seconds, level, send, { loose = 3, after, ...o } = {}) {
        [].concat(names).forEach(name => {
          const { key, match, cents } = onKettle(name);
          const voices = note(rand, 'timpani', key, seconds, { width: 0.3, vel: 1, ...o, match, cents });
          play(mix, dynamics(atPeak(voices, level + gauss(rand) * 0.35), after), when(at, loose), 1, room(send));
        });
      },
      roll(name, at, seconds, level, send, { loose = 3, after, from, to, ...o } = {}) {
        const { key, match, cents } = onKettle(name);
        const voices = note(rand, 'timpani.roll', key, seconds, { width: 0.3, vel: 1, ...o, match, cents });
        play(mix, dynamics(atRms(voices, level, from, to), after), when(at, loose), 1, room(send));
      },
    };
  };

  return { scan, detectPitch, note, hit, section, play, reversed, mono, choir, vibes, celesta, bell, boom, braam, riser, snap, brushTap, brushSwish, ride, string, m, atRms, atPeak, onKettle, HARP, GLOCK, takesNear, band };
};
