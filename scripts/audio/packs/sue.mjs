/*
 * SUE EVERYONE: "Objection Sustained". A 1960s big-band caper with a judge in the room: swagger first, then the courthouse after midnight.
 *
 * C minor. 100 BPM, 4/4 swing, a 2.4 s bar (a beat is 0.6 s). The band's eighths are long-short, the "and" 0.40 s after the beat;
 * the ride's skip note sits later still (0.42 s); the bass pushes a hair ahead of the beat, snaps and piano sit behind it, the muted trumpet further behind.
 *
 * THE MOTIF, six notes, "BAM ba-BAM ba-BAAM ba": a long note on the beat, a short one swung just before the next.
 *     G (1, long)  Gb (&2, short, the blue note)  Eb (3, long)  C (&4, short)  | Ab (1, long: a leap of a minor sixth)  G (&2, short, falls off)
 *     sol se me do | le sol. It circles G from both sides, a half step down at the start and a half step down at the end. Say it: "SUE ev-ry-ONE ... sue YOUR mo-ther."
 *
 * INTRO, 3 bars, then the landing on the loop's first chord at 7.2 s (loop time 0).
 *   bar 1  0.00  The gavel and the band on the same instant: Cm9 stab, C2 | C3 G3 | Bb3 Eb4 | Bb4 D5 G5, bass drum, snare, a short crash, timpani.
 *          1.00  "ba" Ab9 with Gb5 on top, 1.20 "BAM" Ab9 with Eb5 on top: the stabs' top notes are the motif's first three, G Gb Eb.
 *          1.60  The answer, "ba-BOOM": timpani and walking bass together, Ab G.
 *          1.90  Three trumpets rip up (Eb5 to C6, each note smeared into the next, faster as it climbs), a snare crescendo and a cymbal swelling backwards.
 *   bar 2  2.40  C6 (MIDI 84), the top of everything: three trumpets on C6 over G5 Eb5, held 2 s, a shake growing from 3.3 s, a fall off it from 4.42 s.
 *                Under it the motif at full strength: trombones a 3 with horns in unison (G3 Gb3 Eb3 C3 | Ab3 G3), two straight-muted trumpets an octave up.
 *                The bass walks down beneath it in fifths with the line, C Bb Ab G; bass drum and timpani on the long notes, snare on the short ones, the ride swinging.
 *   bar 3  4.80  Ab G over G7(b9): the motif ends, already softer, the tone closing. Bass G F Eb, the whole-tone walk down.
 *          6.41  Two last stabs, p, "ba-BAM": Db9 (Ab4 on top), Db7#11 (G4 on top) with a rimshot. Their top notes are the motif's last two again.
 *          7.04  A harmon-muted trumpet, far away and laid back: C, Ab ... G, the motif's tail once more, landing in the groove.
 *   7.20  The landing: Cm9, a soft brass cushion over the loop's bass and ride. Silent by 9.1 s.
 *
 * LOOP, 10 bars, 24 s: the courthouse after midnight. studio room, close. Every part soft, nothing bright between 1 and 4 kHz.
 *   bar    1 Cm9   2 Cm9   3 Fm9   4 Bb13   5 Ebmaj9   6 Abmaj9   7 Dm7b5   8 G7#9   9 Cm9   10 Ab13 > Db9
 *   Walking bass, pizzicato, quarter notes, chord tones on 1 and 3, chromatic approaches on 4, two raked ghost notes; a cello an octave up, very soft, so a phone hears the walk:
 *     C2 Eb2 G2 Bb2 | C3 Bb2 G2 Gb2 | F2 G2 Ab2 A2 | Bb2 Ab2 F2 E2 | Eb2 G2 Bb2 A2 | Ab2 Bb2 C3 Db3 | D3 C3 Bb2 Ab2 | G2 B2 D3 Db3 | C3 Bb2 Ab2 G2 | Ab2 Gb2 Eb2 Db2
 *   Ride, a real cymbal and stick, pp: ding ding-da ding ding-da. Finger snaps on 2 and 4, far back and a little behind.
 *   Piano: rootless voicings, pp, on the off-beats, sparse (Cm9 Bb3 D4 Eb4 G4, Fm9 Ab3 C4 Eb4 G4, Bb13 Ab3 C4 D4 G4, Ebmaj9 G3 Bb3 D4 F4, Abmaj9 G3 Bb3 C4 Eb4,
 *     Dm7b5 Ab3 C4 F4, G7alt F3 B3 Eb4 Bb4, Ab13 Gb3 Bb3 C4 F4, Db9 B3 Eb4 F4 G4).
 *   The motif once, bars 5-6: harmon-muted trumpet, soft and late: G4 Gb4 Eb4 C4 | Ab4 G4, the blue note over Ebmaj9 and the leap onto Abmaj9's root.
 *   One horn, a slow guide-tone line where the motif is not: Eb4 | D4 | Eb4 | D4 | (rest) | (rest) | C4 | B3 | Bb3 | C4 Cb4, breathing between notes.
 *   A typewriter, three times, "tk-TK", in bars 3, 7 and 9.
 *
 * EFFECTS, each on the page's own clock (SueEveryonePackScreen.tsx stamp(), pack-sue.css): see the recipes at the end.
 */

export default kit => {
  const { I, Mix, LoopMix, theme, themePreview, masterMix, N, ramp, impact, relay, stickSlip, slide, ring, burst, white, bp, lp, hp, shape, decay, norm, drive, db, gauss, clamp, TAU, ROOM_SPECS } = kit;
  const { m, atPeak, band, GLOCK } = I;
  const BEAT = 0.6; const BAR = BEAT * 4;
  const T = (bar, beat) => bar * BAR + beat * BEAT;
  const AND = 0.4;

  /* the band's room: a bright 1960s studio, short enough to keep a stab tight */
  ROOM_SPECS.bandstand = { seconds: 1.9, low: 1.35, mid: 1.25, high: 0.8, predelay: 0.014, early: [[0.017, 0.55, 5200], [0.028, 0.46, 4300], [0.043, 0.36, 3500], [0.064, 0.26, 2800]], seed: 'bandstand' };

  const blank = seconds => new Float32Array(N(seconds));
  const put = (out, x, g, at) => { const k = Math.round(at * 44100); for (let i = 0; i < x.length && i + k < out.length; i += 1) out[i + k] += x[i] * g; };

  /* ── how this band plays: stabs, rips, shakes ── */
  const players = (mix, rand, rooms) => {
    const { sus, hit, timp } = band(mix, rand, rooms);
    const P = { lead: 0.1, tpt2: 0.18, tpt3: 0.02, straight: 0.32, horn: -0.34, bone: 0.24, tuba: 0.06, bass: 0.02 };
    const TPT = [P.lead, P.tpt2, P.tpt3];
    /* a stab: staccato takes for the blow, sustained takes under them when it is a long "DAH" */
    const stab = (t, chord, { dyn = 0, vel = 1, len = 0.18, tone, loose = 4, send = 0.28 } = {}) => {
      const release = Math.min(0.1, len * 0.4);
      const o = { vel, release, loose, tone };
      const long = len > 0.3;
      const lean = ramp([[0, 1], [0.09, 0.8], [len, 0.72]]);
      const body = { players: 2, vel, skip: 0.06, attack: 0.012, release, loose, tone, after: lean };
      (chord.tpt || []).forEach((name, k) => {
        hit('trumpet.stac', name, t, len + 0.2, -13 + dyn - k * 1.5, send, { ...o, pan: TPT[k] });
        if (long) sus('trumpet', name, t + 0.004, len, -15 + dyn - k * 2, send, { ...body, pan: TPT[k] });
      });
      (chord.straight || []).forEach((name, k) => sus('trumpet.straight', name, t, len + 0.04, -16 + dyn - k * 2, send, { players: 2, vel, skip: 0.02, release, loose, tone, pan: P.straight }));
      (chord.horn || []).forEach(name => {
        hit('horn.stac', name, t, len + 0.2, -16 + dyn, send, { ...o, pan: P.horn });
        if (long) sus('horn', name, t + 0.004, len, -18 + dyn, send, { ...body, pan: P.horn });
      });
      (chord.bone || []).forEach(name => {
        hit('trombone.stac', name, t, len + 0.2, -14 + dyn, send, { ...o, pan: P.bone });
        if (long) sus('trombone', name, t + 0.004, len, -16 + dyn, send, { ...body, pan: P.bone });
      });
      if (chord.tuba) hit('tuba.stac', chord.tuba, t, len + 0.25, -13 + dyn, send * 0.8, { ...o, pan: P.tuba });
      if (chord.bass) hit('bass.pizz', chord.bass, t - 0.004, Math.max(0.5, len + 0.3), -10 + dyn, 0.2, { vel: 0.9, release: 0.2, pan: P.bass, width: 0.15, loose });
    };
    /* a rip: the lip running up through the notes, each smeared into the next and faster as it climbs. Separate recordings stitched along a stair of pitch, so no note is stretched far from its own */
    const rip = (path, t0, t1, level, pan, { count = 2, send = 0.26 } = {}) => {
      for (let p = 0; p < count; p += 1) {
        const lag = p * (0.01 + rand() * 0.014);
        const steps = path.length - 1;
        const times = path.map((_, k) => t0 + lag + (t1 - t0 - lag) * (k / steps) ** 0.7);
        path.slice(0, -1).forEach((name, k) => {
          const len = times[k + 1] - times[k];
          const gap = (m(path[k + 1]) - m(name)) * 100;
          sus('trumpet', name, times[k], len + 0.025, level - 8 * (1 - k / steps), send, { vel: 1, skip: 0.035 + rand() * 0.02, attack: k ? 0.008 : 0.02, release: 0.022, pan: pan + (p - 0.5) * 0.1, loose: 2, bend: u => gap * clamp((u / len - 0.4) / 0.6, 0, 1) ** 1.3 });
        });
      }
    };
    /* the held scream: the lip arriving a little under the note, a shake growing (a rounded square wave, upwards, one per player), then the fall */
    const shake = (depth, rate, fallAt, fallCents, length, growFrom = 0.9, growOver = 0.55) => () => {
      const phase = rand() * TAU; const r = rate * (0.95 + rand() * 0.1);
      const fa = fallAt + (rand() - 0.5) * 0.06; const fc = fallCents * (0.85 + rand() * 0.3);
      return t => {
        const scoop = -40 * Math.exp(-t / 0.022);
        const grow = clamp((t - growFrom) / growOver, 0, 1) ** 1.4 * clamp(1 - (t - fa) / 0.12, 0, 1);
        const square = Math.tanh(2.4 * Math.sin(TAU * r * t + phase)) / Math.tanh(2.4);
        const fall = t > fa ? -fc * ((t - fa) / (length - fa)) ** 2 : 0;
        return scoop + depth * grow * (0.5 + 0.5 * square) + fall;
      };
    };
    return { sus, hit, timp, stab, rip, shake, P, TPT };
  };

  /* a suspended cymbal and a stick, played as a ride: its low wash taken away, its tail kept short */
  const rideHit = (mix, rand, at, level, room, { match = /hitstick_pp/, seconds = 0.95, pan = 0.3, cut = 2600 } = {}) => {
    const voices = I.note(rand, 'suscymbal', null, seconds, { vel: 0.3, match, release: 0.5, pan, width: 0.25, swell: t => Math.exp(-t / 0.45) });
    I.play(mix, atPeak(voices.map(v => ({ ...v, x: hp(v.x, cut) })), level), at, 1, room);
  };

  /* ── foley ── */
  /* a gavel on its block: hardwood on hardwood. The crack, the block's hollow knock, the bench under it, the head bouncing once */
  const gavel = (rand, weight = 1) => {
    const out = blank(0.55);
    put(out, impact(rand, { mass: 0.42, seconds: 0.4, click: 1, knock: 1, low: 0.2, knockBase: 800 + rand() * 140, knockTau: 0.017, lowHz: 200, lowTau: 0.035, hard: 1.5 }), 1, 0);
    put(out, impact(rand, { mass: 1.2, seconds: 0.55, click: 0, knock: 1, low: 0.55, knockBase: 285 + rand() * 40, knockTau: 0.05, lowHz: 118, lowTau: 0.07, hard: 0.9 }), 0.7 * weight, 0.0015);
    put(out, impact(rand, { mass: 0.2, seconds: 0.12, click: 0.6, knock: 0.8, low: 0, knockBase: 950 + rand() * 160, knockTau: 0.009, hard: 1.1 }), 0.16, 0.036 + rand() * 0.012);
    return norm(out);
  };
  /* the stick across the rim, laid over a real snare */
  const rimCrack = rand => impact(rand, { mass: 0.3, seconds: 0.35, click: 1, knock: 0.8, low: 0, knockBase: 620 + rand() * 80, knockTau: 0.013, ringing: 0.4, ringBase: 1650 + rand() * 150, ringTau: 0.05, hard: 1.4 });
  /* one typewriter key: the type bar striking through the ribbon, the platen's hollow knock, the key coming back up */
  const typeKey = (rand, weight = 1) => {
    const out = blank(0.13);
    put(out, impact(rand, { mass: 0.13, seconds: 0.08, click: 1, knock: 0.8, low: 0, knockBase: 1300 + rand() * 300, knockTau: 0.005, hard: 1.4 }), 1, 0);
    put(out, impact(rand, { mass: 0.5, seconds: 0.1, click: 0, knock: 1, low: 0.2, knockBase: 440 + rand() * 90, knockTau: 0.012, lowHz: 170, lowTau: 0.018, hard: 0.8 }), 0.5 * weight, 0.001);
    put(out, relay(rand, 0.05, 0.5), 0.14, 0.024 + rand() * 0.01);
    return norm(out);
  };
  /* the carriage running back: the ratchet catching faster, then slower, over the rail's rough slide */
  const carriage = (rand, seconds) => {
    const out = blank(seconds);
    put(out, stickSlip(rand, seconds, t => Math.sin(Math.PI * clamp(t / seconds, 0, 1)) ** 0.7, { rateMin: 28, rateMax: 90, base: 1500, tau: 0.005, count: 7 }), 1, 0);
    put(out, slide(rand, seconds, 650, 1200), 0.3, 0);
    return norm(out);
  };
  /* a pigeon going up: every downstroke a soft clap of feathers, no pitch, the strokes slowing and fading as it climbs away */
  const wings = (rand, seconds, { rate = 5.6, strokes = 7 } = {}) => {
    const out = blank(seconds);
    let t = 0;
    for (let k = 0; k < strokes && t < seconds - 0.1; k += 1) {
      const len = 0.055 + rand() * 0.025;
      const g = (1 - k / strokes) ** 1.3 * (0.7 + rand() * 0.5);
      put(out, norm(shape(bp(white(N(len), rand), 750 + rand() * 450, 0.55), u => Math.sin(Math.PI * clamp(u / len, 0, 1)) ** 1.6)), g, t);
      put(out, norm(bp(decay(white(N(0.02), rand), 0.004, 0.0005), 2400 + rand() * 900, 0.8)), g * 0.45, t + len * 0.85);
      t += (1 / rate) * (1 + k * 0.05) * (0.92 + rand() * 0.16);
    }
    return norm(out);
  };
  /* sheets thrown up by the blow: a broad slap of air and paper, then edges fluttering, thinning out */
  const paperBlast = (rand, seconds) => {
    const n = N(seconds); const out = new Float32Array(n);
    put(out, norm(bp(decay(white(N(0.07), rand), 0.014, 0.0004), 1400, 0.5)), 1, 0);
    const ticks = new Float32Array(n);
    for (let t = 0.012; t < seconds; t += 1 / (22 + 40 * rand())) { const k = Math.round(t * 44100); if (k < n) ticks[k] += (rand() < 0.5 ? -1 : 1) * (0.25 + rand() ** 2) * Math.exp(-t / (seconds * 0.32)); }
    put(out, norm(bp(ticks, 2300, 0.9)), 0.42, 0);
    put(out, norm(bp(ticks, 850, 0.8)), 0.3, 0);
    put(out, norm(shape(bp(white(n, rand), 650, 0.5), ramp([[0, 1], [0.05, 0.5], [seconds, 0]]))), 0.3, 0);
    return norm(out);
  };
  /* the ink letting go of the sheet as the rubber lifts: a few sticky ticks */
  const tack = rand => {
    const x = blank(0.04);
    for (let k = 0; k < 6; k += 1) { const i = Math.round(rand() * 0.014 * 44100); x[i] += (rand() < 0.5 ? -1 : 1) * (0.3 + rand()); }
    const out = blank(0.04);
    put(out, norm(hp(lp(x, 6500), 1700)), 1, 0);
    put(out, norm(bp(x, 950, 1.1)), 0.45, 0);
    return norm(out);
  };
  /* the rubber stamp: the handle in the hand at the touch, air as it comes down, the blow on paper on a wooden desk, the ink on the lift */
  const stampBlow = (mix, rand, hitAt, scale, room) => {
    mix.add(impact(rand, { mass: 0.15, seconds: 0.05, click: 0.3, knock: 0.8, low: 0, knockBase: 950 + rand() * 150, knockTau: 0.004, hard: 0.6 }), 0.002, 0.05 * scale, 0.05, room);
    mix.add(norm(shape(bp(white(N(0.09), rand), 1100, 0.7), t => (t / 0.09) ** 2.4)), hitAt - 0.09, 0.07 * scale, 0, room);
    mix.add(impact(rand, { mass: 0.85, seconds: 0.26, click: 0.32, knock: 1, low: 0.32, knockBase: 250 + rand() * 35, knockTau: 0.03, lowHz: 118, lowTau: 0.045, hard: 0.55 }), hitAt, scale, 0, room);
    mix.add(norm(bp(decay(white(N(0.03), rand), 0.0055, 0.0003), 2000, 0.55)), hitAt + 0.0008, 0.42 * scale, 0.03, room);
    mix.add(impact(rand, { mass: 0.32, seconds: 0.12, click: 0, knock: 1, low: 0, knockBase: 540 + rand() * 90, knockTau: 0.011, hard: 0.7 }), hitAt + 0.0025, 0.26 * scale, -0.04, room);
    mix.add(tack(rand), hitAt + 0.095 + rand() * 0.006, 0.12 * scale, 0.03, room);
  };

  /* ── the intro ── */
  const intro = rand => {
    const mix = new Mix(9.4);
    const { sus, hit, timp, stab, rip, shake, P, TPT } = players(mix, rand, { bandstand: 1 });

    /* BAR 1. The first instant: the gavel and the band */
    const CM9 = { tpt: ['G5', 'D5', 'Bb4'], horn: ['Eb4', 'Bb3'], bone: ['Bb3', 'G3', 'C3'], tuba: 'C2', bass: 'C2' };
    const AB9 = { horn: ['Eb4', 'Bb3'], bone: ['C4', 'Eb3', 'Ab2'], tuba: 'Ab2', bass: 'Ab1' };
    mix.add(gavel(rand), 0, 0.75, -0.1, { bandstand: 0.2 });
    stab(0, CM9, { len: 0.56, loose: 0 });
    /* the low brass hold the chord under the stab, drop to piano and swell into the "ba": sfp, crescendo */
    const swell = ramp([[0, 1], [0.14, 0.32], [0.42, 0.36], [0.97, 1], [1.02, 0.4]]);
    ['C3', 'G3', 'Bb3'].forEach(name => sus('trombone', name, 0.004, 1.02, -15, 0.28, { players: 2, vel: 1, skip: 0.06, attack: 0.012, release: 0.04, pan: P.bone, loose: 0, after: swell, from: 0.02, to: 0.3 }));
    sus('tuba', 'C2', 0.004, 1.02, -16, 0.22, { players: 2, vel: 1, skip: 0.06, attack: 0.012, release: 0.04, pan: P.tuba, loose: 0, after: swell, from: 0.02, to: 0.3 });
    hit('bassdrum', null, 0, 1.6, -8, 0.34, { vel: 1, release: 0.7, width: 0.2, loose: 0 });
    hit('snare', null, 0, 0.7, -14, 0.32, { vel: 1, match: /HitSN_v9/, release: 0.3, pan: 0.1, width: 0.2, loose: 0 });
    hit('crash', null, 0, 1.6, -15, 0.3, { vel: 1, match: /crash1_ff/, release: 1.0, pan: 0.3, width: 0.5, loose: 0 });
    timp(['C3', 'G2'], 0, 0.8, -12, 0.3, { release: 0.35, loose: 0 });
    /* "ba-BAM", the top notes Gb then Eb */
    stab(1.012, { ...AB9, tpt: ['Gb5', 'C5', 'Bb4'] }, { len: 0.16, dyn: -2 });
    stab(1.2, { ...AB9, tpt: ['Eb5', 'C5', 'Gb4'] }, { len: 0.42, dyn: -0.5 });
    hit('snare', null, 1.012, 0.5, -20, 0.32, { vel: 0.6, match: /HitSN_v5/, release: 0.2, pan: 0.1, width: 0.2 });
    hit('snare', null, 1.2, 0.6, -15, 0.32, { vel: 0.9, match: /HitSN_v7/, release: 0.25, pan: 0.1, width: 0.2 });
    hit('bassdrum', null, 1.2, 1.2, -13, 0.34, { vel: 0.8, release: 0.5, width: 0.2 });
    /* the answer, "ba-BOOM", Ab G: timpani and the walking bass together */
    timp('Ab2', 1.61, 0.4, -15, 0.3, { vel: 0.7, release: 0.15 });
    timp('G2', 1.8, 0.7, -12, 0.3, { vel: 0.9, release: 0.3 });
    hit('bass.pizz', 'Ab2', 1.606, 0.4, -12, 0.2, { vel: 0.9, release: 0.15, pan: P.bass, width: 0.15 });
    hit('bass.pizz', 'G2', 1.794, 0.62, -10, 0.2, { vel: 0.9, release: 0.25, pan: P.bass, width: 0.15 });
    hit('bassdrum', null, 1.8, 1.0, -16, 0.34, { vel: 0.6, release: 0.4, width: 0.2 });
    /* the drummer builds the last half beat; a cymbal swells backwards into the downbeat; three trumpets rip up */
    I.play(mix, atPeak(I.note(rand, 'snare', null, 0.52, { match: /rollSN_v5/, vel: 1, release: 0.02, pan: 0.1, width: 0.2, swell: t => 0.12 + 0.88 * clamp(t / 0.52, 0, 1) ** 2.2 }), -18), 1.88, 1, { bandstand: 0.3 });
    I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.7, match: /crash1_mf/, seconds: 0.56, release: 0.03, pan: 0.3, width: 0.5 })), -17), 1.845, 1, { bandstand: 0.3 });
    rip(['Eb5', 'F5', 'G5', 'Ab5', 'Bb5', 'B5', 'C6'], 1.9, 2.4, -14, P.lead);
    rip(['Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5'], 1.94, 2.4, -18, P.tpt2);
    rip(['G4', 'Ab4', 'Bb4', 'C5', 'D5', 'Eb5'], 1.98, 2.4, -20, P.tpt3);

    /* BAR 2. C6 held 2 s over G5 and Eb5, shaken, then let fall */
    const HOLD = 2.46; const FALL = 2.02;
    const held = ramp([[0, 1], [0.1, 0.9], [0.8, 0.95], [FALL, 1.04], [FALL + 0.25, 0.6], [HOLD, 0]]);
    const closing = t => (t < FALL ? 14000 : 14000 - 10500 * clamp((t - FALL) / 0.44, 0, 1));
    [['C6', -11, 3, 230, 6.6, 1300], ['G5', -16, 2, 160, 6.9, 1500], ['Eb5', -18, 2, 130, 7.2, 1700]].forEach(([name, level, count, depth, rate, fall], k) => {
      sus('trumpet', name, 2.395, HOLD, level, 0.28, { players: count, vel: 1, skip: 0.02, release: 0.08, pan: TPT[k], loose: 2, from: 0.1, to: 1.2, bendOf: shake(depth, rate, FALL - k * 0.03, fall, HOLD), after: held, tone: closing });
    });
    hit('bassdrum', null, 2.4, 2.0, -10, 0.34, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
    hit('crash', null, 2.4, 3.0, -13.5, 0.32, { vel: 1, match: /crash1_ff/, release: 2.0, pan: 0.3, width: 0.5, loose: 0 });
    hit('snare', null, 2.4, 0.7, -15, 0.32, { vel: 1, match: /HitSN_v9/, release: 0.3, pan: 0.1, width: 0.2, loose: 0 });
    timp(['C3', 'G2'], 2.4, 1.0, -11, 0.3, { release: 0.4, loose: 0 });

    /* THE MOTIF at full strength: trombones a 3 and horns in unison, staccato takes for the bite, two straight mutes an octave up */
    const MOTIF = [
      ['G3', T(1, 0), 0.52, 0], ['Gb3', T(1, 1) + AND + 0.012, 0.17, 0], ['Eb3', T(1, 2), 0.5, 0], ['C3', T(1, 3) + AND + 0.012, 0.17, 0],
      ['Ab3', T(2, 0), 0.8, -2.5], ['G3', T(2, 1) + AND + 0.012, 0.22, -5.5],
    ];
    MOTIF.forEach(([name, t, len, dyn], k) => {
      const long = len > 0.3;
      const tone = k < 4 ? undefined : k === 4 ? 6000 : 4200;
      const vel = k < 5 ? 1 : 0.75;
      const lean = long ? ramp([[0, 1], [0.1, 0.84], [len, 0.78]]) : undefined;
      const scoop = long ? () => (u => -55 * Math.exp(-u / 0.03)) : undefined;
      const dit = k === 5 ? () => (u => -380 * clamp((u - 0.06) / (len - 0.06), 0, 1) ** 2) : undefined;
      if (long) {
        sus('trombone', name, t - 0.004, len, -12 + dyn, 0.26, { players: 3, vel, skip: 0.03, release: 0.09, pan: P.bone, after: lean, bendOf: scoop, tone });
        sus('horn', name, t - 0.004, len, -15 + dyn, 0.28, { players: 2, vel, skip: 0.03, release: 0.09, pan: P.horn, after: lean, bendOf: scoop, tone });
      }
      hit('trombone.stac', name, t, len + 0.18, (long ? -15 : -12) + dyn, 0.26, { vel, release: 0.08, pan: P.bone, tone, bend: dit && dit() });
      hit('trombone.stac', name, t + 0.008, len + 0.18, (long ? -17 : -14) + dyn, 0.26, { vel, release: 0.08, pan: P.bone + 0.08, tone, bend: dit && dit() });
      hit('horn.stac', name, t, len + 0.18, (long ? -18 : -15) + dyn, 0.28, { vel, release: 0.08, pan: P.horn, tone });
      const mutes = k === 4 ? [['Ab4', 0], ['F4', -3]] : [[m(name) + 12, 0]];
      mutes.forEach(([note, less]) => sus('trumpet.straight', note, t - 0.002, len + 0.03, -16 + dyn + less, 0.28, { players: k === 4 ? 1 : 2, vel, skip: 0.02, release: long ? 0.08 : 0.05, pan: P.straight, after: lean, bendOf: dit || scoop, tone }));
    });
    sus('horn', 'B3', T(2, 0) + 0.004, 0.8, -21, 0.28, { players: 2, vel: 0.8, skip: 0.03, release: 0.12, pan: P.horn, tone: 5000 });

    /* the bass walks down in fifths under the line, a tuba with it; then the whole-tone walk to the last stabs */
    [['C2', 'C3'], ['Bb1', 'Bb2'], ['Ab1', 'Ab2'], ['G1', 'G2']].forEach(([low, high], beat) => {
      const t = T(1, beat) - 0.006;
      hit('bass.pizz', low, t, 0.75, -10 - beat * 0.3, 0.2, { vel: 0.9, release: 0.25, pan: P.bass, width: 0.15, loose: 5 });
      hit('tuba.stac', high, t + 0.004, 0.4, -15, 0.22, { vel: 0.9, release: 0.15, pan: P.tuba, loose: 5 });
    });
    [['G2', -11, 0.78], ['F2', -12.5, 0.78], ['Eb2', -14, 0.4]].forEach(([name, level, len], beat) => hit('bass.pizz', name, T(2, beat) - 0.006, len, level, 0.2, { vel: beat < 2 ? 0.9 : 0.6, release: 0.2, pan: P.bass, width: 0.15, loose: 5, tone: 3000 - beat * 400 }));

    /* the drums under the line: bass drum and timpani with its long notes, snare with its short ones, the bass drum feathered on the beats, the ride swinging */
    [[3.6, 'Ab2', -15], [4.8, 'G2', -15]].forEach(([t, name, level]) => {
      hit('bassdrum', null, t, 1.2, level, 0.34, { vel: 0.7, release: 0.5, width: 0.2 });
      timp(name, t, 0.7, level + 1, 0.3, { vel: 0.8, release: 0.3 });
    });
    [[3.412, -19], [4.612, -18], [5.812, -22]].forEach(([t, level]) => hit('snare', null, t, 0.5, level, 0.32, { vel: 0.7, match: /HitSN_v5/, release: 0.2, pan: 0.1, width: 0.2 }));
    [3.0, 4.2, 5.4, 6.0].forEach(t => hit('bassdrum', null, t, 0.6, -27, 0.3, { vel: 0.3, release: 0.3, width: 0.2 }));
    [1, 2].forEach(bar => [[0, -25], [1, -22], [1.7, -27], [2, -25], [3, -22], [3.7, -27]].forEach(([beat, level]) => {
      if (bar === 2 && beat > 3) return;
      rideHit(mix, rand, T(bar, beat) + (rand() - 0.5) * 0.008, level - (bar === 2 ? 3 : 0) + gauss(rand) * 0.6, { bandstand: 0.3 }, { match: /hitstick_mp/, pan: 0.28 });
    }));

    /* BAR 3, beats 3-4. Two last stabs, p, "ba-BAM", and a rimshot */
    const DB = { horn: ['Eb4', 'B3'], bone: ['F3', 'Ab2'], tuba: 'Db2' };
    stab(T(2, 2) + AND + 0.01, { ...DB, straight: ['Ab4', 'F4'], bass: 'Db2' }, { len: 0.15, dyn: -9, vel: 0.6, tone: 3200 });
    stab(T(2, 3), { ...DB, straight: ['G4', 'F4'] }, { len: 0.22, dyn: -10.5, vel: 0.55, tone: 2800 });
    hit('snare', null, T(2, 3), 0.6, -17, 0.32, { vel: 1, match: /HitSN_v7/, release: 0.25, pan: 0.1, width: 0.2 });
    mix.add(rimCrack(rand), T(2, 3) + 0.001, 0.22, 0.1, { bandstand: 0.3 });
    hit('bassdrum', null, T(2, 3), 0.8, -22, 0.3, { vel: 0.4, release: 0.3, width: 0.2 });

    /* the harmon mute, far away and late: C, Ab ... G, the motif's tail, landing in the groove */
    [['C4', T(2, 3) + AND + 0.04, 0.2, -25], ['Ab4', T(3, 0) + 0.04, 0.86, -23], ['G4', T(3, 1) + AND + 0.05, 0.3, -26]].forEach(([name, t, len, level], k) => {
      const last = k === 2;
      sus('trumpet.harmon', name, t, len + (last ? 0.12 : 0.04), level, 0.4, {
        vel: 0.25, skip: 0.02, attack: 0.01, release: last ? 0.16 : 0.06, pan: -0.12, tone: 2800, loose: 4,
        bend: k === 1 ? (u => -70 * Math.exp(-u / 0.04)) : last ? (u => -160 * clamp((u - 0.18) / 0.24, 0, 1) ** 2) : undefined,
      });
    });

    /* THE LANDING, loop time 0: Cm9, a soft brass cushion that sighs away over the loop's own bass and ride */
    const sigh = ramp([[0, 0.9], [0.4, 1], [1.2, 0.45], [1.7, 0]]);
    [['trombone', 'C3', -29, P.bone], ['trombone', 'G3', -30, P.bone + 0.06], ['horn', 'Bb3', -30, P.horn], ['horn', 'Eb4', -31, P.horn + 0.06]].forEach(([group, name, level, pan]) =>
      sus(group, name, 7.16, 1.7, level, 0.4, { players: 2, vel: 0.15, skip: 0.04, attack: 0.07, release: 0.4, pan, tone: 1300, after: sigh, from: 0.1, to: 0.8 }));
    timp('C3', 7.2, 1.2, -27, 0.3, { vel: 0.35, release: 0.5 });

    return masterMix(mix, { peak: -2.5, soften: 1.3, comp: { threshold: -16.5, ratio: 2.5 }, fadeFrom: 8.6, fadeTo: 9.1 });
  };

  /* ── the loop ── */
  const loop = rand => {
    const mix = new LoopMix(BAR * 10);
    const { sus, hit } = band(mix, rand, { studio: 1 });

    /* THE WALK. A hair ahead of the beat, leaning on 2 and 4; a short note before bar 2 leaves the seam a breath.
     * Warmed a little, as a 1960s session bass through its amp and tape: the overtones a phone can play come up, the boom below 50 Hz goes */
    const walk = (name, t, seconds, level, { vel = 0.62, release = 0.3, tone = 1700 } = {}) => {
      const voices = I.note(rand, 'bass.pizz', m(name), seconds, { vel, release, pan: 0.02, width: 0.12, tone });
      const warm = voices.map(v => ({ ...v, x: hp(drive(norm(Float32Array.from(v.x)), 2.0), 50) }));
      I.play(mix, atPeak(warm, level + gauss(rand) * 0.35), t + (rand() - 0.5) * 0.012, 1, { studio: 0.22 });
    };
    const WALK = [['C2', 'Eb2', 'G2', 'Bb2'], ['C3', 'Bb2', 'G2', 'Gb2'], ['F2', 'G2', 'Ab2', 'A2'], ['Bb2', 'Ab2', 'F2', 'E2'], ['Eb2', 'G2', 'Bb2', 'A2'],
      ['Ab2', 'Bb2', 'C3', 'Db3'], ['D3', 'C3', 'Bb2', 'Ab2'], ['G2', 'B2', 'D3', 'Db3'], ['C3', 'Bb2', 'Ab2', 'G2'], ['Ab2', 'Gb2', 'Eb2', 'Db2']];
    WALK.forEach((bar, b) => bar.forEach((name, beat) => {
      const t = T(b, beat) - 0.008;
      const lean = beat % 2 ? 0.8 : 0;
      const short = b === 0 && beat === 3;
      walk(name, t, short ? 0.42 : 0.82, -14.5 + lean, { vel: rand() < 0.7 ? 0.62 : 0.4, release: short ? 0.16 : 0.3 });
      hit('cellos.pizz', m(name) + 12, t, short ? 0.36 : 0.6, -18 + lean, 0.3, { vel: 0.35, release: 0.22, pan: 0.18, width: 0.15, tone: 1600, loose: 6 });
    }));
    /* two raked ghost notes, the swing in the walk */
    [[3, 'E2'], [7, 'Db3']].forEach(([b, name]) => walk(name, T(b, 2.7) - 0.006, 0.14, -24, { vel: 0.4, release: 0.08, tone: 800 }));

    /* THE RIDE, ding ding-da ding ding-da, the skip late; one left out for the seam, one left out by the drummer */
    for (let b = 0; b < 10; b += 1) [[0, -31], [1, -28], [1.7, -33], [2, -31], [3, -28], [3.7, -33]].forEach(([beat, level], k) => {
      if ((b === 0 && k === 5) || (b === 6 && k === 2)) return;
      rideHit(mix, rand, T(b, beat) + (rand() - 0.5) * 0.008, level + gauss(rand) * 0.7, { studio: 0.3 });
    });
    /* finger snaps on 2 and 4, far back, a little behind */
    for (let b = 0; b < 10; b += 1) [1, 3].forEach(beat => {
      const v = I.snap(rand, { vel: 0.6 + rand() * 0.25, pan: -0.36 }).map(s => ({ ...s, x: lp(s.x, 3400) }));
      I.play(mix, atPeak(v, -31 + gauss(rand) * 0.8), T(b, beat) + 0.016 + (rand() - 0.5) * 0.01, 1, { studio: 0.75 });
    });

    /* THE PIANO, rootless and soft, on the off-beats, behind the beat */
    const V = { Cm9: ['Bb3', 'D4', 'Eb4', 'G4'], Fm9: ['Ab3', 'C4', 'Eb4', 'G4'], Bb13: ['Ab3', 'C4', 'D4', 'G4'], Ebmaj9: ['G3', 'Bb3', 'D4', 'F4'], Abmaj9: ['G3', 'Bb3', 'C4', 'Eb4'],
      Dm7b5: ['Ab3', 'C4', 'F4'], G7alt: ['F3', 'B3', 'Eb4', 'Bb4'], Ab13: ['Gb3', 'Bb3', 'C4', 'F4'], Db9: ['B3', 'Eb4', 'F4', 'G4'] };
    [[0, 1.64, 'Cm9', 0.3], [1, 2.64, 'Cm9', 0.26], [1, 3.64, 'Fm9', 0.95], [2, 1.64, 'Fm9', 0.24, true], [3, 1.64, 'Bb13', 0.36], [3, 3.64, 'Ebmaj9', 0.9], [4, 3, 'Ebmaj9', 0.22, true],
      [5, 2.64, 'Abmaj9', 0.34], [6, 1.64, 'Dm7b5', 0.3], [7, 0.64, 'G7alt', 0.28], [7, 3.64, 'Cm9', 0.9], [8, 2.64, 'Cm9', 0.24, true], [9, 0, 'Ab13', 0.38], [9, 2.64, 'Db9', 0.5]]
      .forEach(([b, beat, chord, len, light]) => {
        const t = T(b, beat) + 0.028;
        const notes = light ? V[chord].slice(-3) : V[chord];
        notes.forEach((name, k) => hit('piano', name, t + k * 0.007 + rand() * 0.004, len + 0.35, (k === notes.length - 1 ? -24 : -26.5) - (light ? 2 : 0), 0.32, { vel: 0.08, release: 0.25, tone: 1900, pan: -0.18 + k * 0.05, width: 0.15, loose: 4 }));
      });

    /* THE MOTIF, once: the harmon mute, soft, late, a little scoop into the long notes, the last one falling away */
    [['G4', T(4, 0), 0.7, -25], ['Gb4', T(4, 1.64), 0.17, -28], ['Eb4', T(4, 2), 0.78, -26], ['C4', T(4, 3.64), 0.19, -28], ['Ab4', T(5, 0), 0.95, -24.5], ['G4', T(5, 1.64), 0.55, -27]]
      .forEach(([name, t, len, level], k) => {
        const long = len > 0.3;
        sus('trumpet.harmon', name, t + 0.04, len, level, 0.5, {
          vel: 0.2, skip: 0.02, attack: long ? 0.02 : 0.008, release: k === 5 ? 0.3 : long ? 0.1 : 0.05, pan: 0.12, width: 0.2, tone: 2500, loose: 8, from: 0.03, to: Math.min(0.6, len),
          bend: k === 0 || k === 4 ? (u => -60 * Math.exp(-u / 0.035)) : k === 5 ? (u => -120 * clamp((u - 0.3) / 0.25, 0, 1) ** 2) : undefined,
          after: long ? ramp([[0, 0.9], [0.15, 1], [len, 0.8]]) : undefined,
        });
      });

    /* ONE HORN, the slow guide tones where the motif is not, breathing between notes */
    [['Eb4', 0, 3.75], ['D4', 4, 7.75], ['Eb4', 8, 11.75], ['D4', 12, 15.4], ['C4', 24, 27.75], ['B3', 28, 31.75], ['Bb3', 32, 35.75], ['C4', 36, 37.85], ['Cb4', 38, 39.9]].forEach(([name, from, to]) => {
      const t = from * BEAT - 0.08; const seconds = (to - from) * BEAT + 0.38;
      sus('horn', name, t, seconds, -31, 0.5, { vel: 0.12, skip: 0.08, attack: 0.25, release: 0.35, tone: 1250, pan: -0.32, width: 0.2, loose: 10, from: 0.3, to: Math.min(1.5, seconds - 0.3), after: ramp([[0, 0.85], [seconds * 0.45, 1], [seconds, 0.8]]) });
    });

    /* THE TYPEWRITER, three sly fills, "tk-TK" */
    [[2, 2.66, 0.6], [2, 3, 1], [6, 2.66, 0.6], [6, 3, 1], [8, 0.66, 0.6], [8, 1, 0.9]].forEach(([b, beat, g]) => {
      mix.add(lp(typeKey(rand, 0.8), 3500), T(b, beat) + 0.012 + (rand() - 0.5) * 0.008, db(-30) * g, 0.38, { studio: 0.35 });
    });

    return mix.fold({ peak: -13, comp: { threshold: -24, ratio: 2 } });
  };

  return {
    sounds: {
      music: theme({ pack: 'sue', period: BAR * 10, entry: BAR * 3, earliest: 9.15, loopIn: [6.0, 7.3], bitrate: 74000, intro, loop }),

      /* The stamp lands 152 ms after the tap (pk-sue-slam-0, 20% of 0.76 s; the stage jolts and the mark inks at 0.15 s) and lifts at 251 ms.
       * So: a tiny handle tick at the touch, air as it falls, the blow at 156 ms (at the players' rates 1.016-1.112 it lands 140-154 ms), the ink letting go at 251 ms */
      tap: {
        seconds: 0.4, peak: -16, fadeFrom: 0.33, fadeTo: 0.4, bitrate: 72000,
        build(mix, rand) { stampBlow(mix, rand, 0.156, 1, { studio: 0.14 }); },
      },

      /*
       * The eighth tap, on the page's clock: the shadow sweeps over 0-0.38 s (pk-sue-eclipse), the giant print and the white flash appear at 0.378-0.382 s,
       * the stage jolts from 0.38 s (deepest at 0.432 s), the print folds down onto the sheet by about 1.1 s, the white fades 1.19-1.8 s. The birds lift at 0.15-0.23 s.
       * So: a rush and a trumpet rip under the shadow; the slam at 0.385 s with the theme's first chord, C6 on top, crash, bass drum, timpani and a blast of paper;
       * wings going away through the next second; and as the print lands on the sheet, the gavel twice, "ba-BAM", with trombones on the motif's last two notes, Ab G.
       */
      final: {
        seconds: 3.5, peak: -5, soften: 1.3, fadeFrom: 2.8, fadeTo: 3.45, bitrate: 72000,
        build(mix, rand) {
          const SLAM = 0.385;
          const { sus, hit, timp, stab, rip, shake, P, TPT } = players(mix, rand, { bandstand: 1 });
          /* the handle in the hand at the touch, then the rush */
          mix.add(impact(rand, { mass: 0.15, seconds: 0.05, click: 0.3, knock: 0.8, low: 0, knockBase: 950 + rand() * 150, knockTau: 0.004, hard: 0.6 }), 0.002, 0.06, 0.05, { bandstand: 0.1 });
          I.play(mix, atPeak(I.riser(rand, SLAM, { from: 280, to: 5200, Q: 1 }), -16), 0, 1, { bandstand: 0.2 });
          I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.7, match: /crash1_mf/, seconds: SLAM - 0.005, release: 0.02, pan: 0.25, width: 0.5 })), -17), 0.002, 1, { bandstand: 0.25 });
          rip(['G4', 'Bb4', 'C5', 'Eb5', 'F5', 'G5', 'Bb5', 'C6'], 0.06, SLAM, -15, P.lead);
          rip(['Eb4', 'G4', 'Bb4', 'C5', 'Eb5', 'G5'], 0.1, SLAM, -19, P.tpt2);
          /* the blow: rubber the size of a desk, the desk, the paper */
          mix.add(impact(rand, { mass: 2.6, seconds: 1.8, click: 0.8, knock: 1, low: 0.8, ringing: 0.04, knockBase: 236, knockTau: 0.085, lowHz: 60, lowTau: 0.14, ringBase: 640, ringTau: 0.25 }), SLAM, 0.95, 0, { bandstand: 0.4 });
          mix.add(impact(rand, { mass: 0.9, seconds: 0.5, click: 0.5, knock: 1, low: 0.2, knockBase: 430, knockTau: 0.03, hard: 1 }), SLAM + 0.003, 0.4, -0.08, { bandstand: 0.35 });
          mix.add(paperBlast(rand, 0.9), SLAM + 0.004, 0.42, 0.06, { bandstand: 0.3 });
          /* the band: the theme's first chord, C6 on top, held a moment, shaken, let fall */
          stab(SLAM, { tpt: ['C6', 'G5', 'Eb5'], horn: ['Eb4', 'Bb3'], bone: ['Bb3', 'G3', 'C3'], tuba: 'C2', bass: 'C2' }, { len: 0.42, loose: 0 });
          const HOLD = 0.92; const FALL = 0.52;
          [['C6', -12, 3, 180, 7, 1400], ['G5', -17, 2, 120, 7.3, 1600]].forEach(([name, level, count, depth, rate, fall], k) => sus('trumpet', name, SLAM + 0.004, HOLD, level, 0.3, {
            players: count, vel: 1, skip: 0.05, release: 0.08, pan: TPT[k], loose: 2, from: 0.05, to: 0.4,
            bendOf: shake(depth, rate, FALL, fall, HOLD, 0.12, 0.3),
            after: ramp([[0, 1], [0.1, 0.85], [FALL, 0.95], [FALL + 0.2, 0.5], [HOLD, 0]]), tone: t => (t < FALL ? 14000 : 14000 - 10000 * clamp((t - FALL) / 0.4, 0, 1)),
          }));
          hit('crash', null, SLAM, 2.6, -11, 0.32, { vel: 1, match: /crash1_ff/, release: 1.6, pan: 0.28, width: 0.5, loose: 0 });
          hit('bassdrum', null, SLAM, 2.0, -7, 0.36, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
          hit('snare', null, SLAM, 0.7, -13, 0.32, { vel: 1, match: /HitSN_v9/, release: 0.3, pan: 0.1, width: 0.2, loose: 0 });
          timp(['C3', 'G2'], SLAM, 1.4, -9, 0.32, { release: 0.6, loose: 0 });
          /* the birds go */
          [[-0.6, 0.15], [-0.42, 0.2], [0.44, 0.17], [0.62, 0.23]].forEach(([pan, lift]) => mix.add(wings(rand, 1.3, { rate: 5.2 + rand() * 0.9, strokes: 6 + Math.floor(rand() * 3) }), lift + rand() * 0.02, 0.085, pan, { bandstand: 0.3 }));
          /* the print lands on the sheet: the gavel, "ba-BAM", and the trombones' last word, Ab G */
          mix.add(gavel(rand, 0.8), 0.94, 0.3, -0.14, { bandstand: 0.24 });
          mix.add(gavel(rand, 1), 1.12, 0.48, -0.14, { bandstand: 0.28 });
          [['Ab3', 0.94, -17, 0.16], ['Ab2', 0.946, -19, 0.16], ['G3', 1.12, -14, 0.34], ['G2', 1.126, -16, 0.34]].forEach(([name, t, level, len]) => hit('trombone.stac', name, t, len + 0.2, level, 0.3, { vel: 1, release: 0.1, pan: P.bone }));
          hit('tuba.stac', 'C2', 1.12, 0.6, -15, 0.26, { vel: 0.9, release: 0.2, pan: P.tuba });
          hit('bass.pizz', 'C2', 1.116, 1.2, -13, 0.2, { vel: 0.9, release: 0.4, pan: P.bass, width: 0.15 });
          timp('G2', 1.12, 0.9, -16, 0.3, { vel: 0.7, release: 0.4 });
        },
      },

      /* A typewriter: three keys, the margin bell with the page's done state at 170 ms, the carriage run back and its stop */
      notify: {
        seconds: 1, peak: -10, soften: 1.2, fadeFrom: 0.8, fadeTo: 0.98, bitrate: 72000,
        build(mix, rand) {
          const room = { studio: 0.18 };
          [[0, 1, -0.1], [0.056, 0.8, -0.04], [0.11, 0.9, 0.02]].forEach(([t, g, pan]) => mix.add(typeKey(rand, g), t + rand() * 0.004, 0.62 * g, pan, room));
          const { hit } = band(mix, rand, { studio: 1 });
          hit('glock', 'C7', 0.17, 0.8, -8, 0.3, { cents: GLOCK, release: 0.45, pan: 0.2, width: 0.2, tone: 7000, loose: 0 });
          mix.add(ring(burst(rand, 1, 7000, 0.7), rand, { base: 2380 + rand() * 40, count: 6, tau: 0.13, tilt: 0.8, beat: 0.005 }), 0.17, 0.16, 0.2, { studio: 0.3 });
          mix.add(carriage(rand, 0.3), 0.27, 0.2, 0.25, room);
          mix.add(impact(rand, { mass: 1.0, seconds: 0.3, click: 0.6, knock: 1, low: 0.25, knockBase: 360 + rand() * 40, knockTau: 0.03, lowHz: 150, lowTau: 0.04, ringing: 0.15, ringBase: 1900, ringTau: 0.05, hard: 1.1 }), 0.575, 0.42, 0.3, room);
        },
      },

      /* One typewriter key */
      click: {
        seconds: 0.085, peak: -19, fadeFrom: 0.05, fadeTo: 0.085, bitrate: 64000,
        build(mix, rand) { mix.add(typeKey(rand, 0.6), 0, 1, 0, { studio: 0.06 }); },
      },
    },
    preview: rendered => themePreview({
      pack: 'sue', rendered, seconds: 70,
      taps: [1, 2, 3, 4, 5, 6, 7].map(n => ({ at: 26 + (n - 1) * 2.5, rate: 1 + n * 0.016 })),
      final: { at: 44, restoreAfter: 2.0 }, notifyAt: 60, clickAt: 66,
    }),
  };
};
