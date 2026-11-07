/*
 * THE GILDED NINE: "The Ninth Chair". A private ritual under a cathedral: rich, ancient, dangerous, reverent. Never horror.
 *
 * D Phrygian dominant (D Eb F# G A Bb C) for the rite, D natural minor (D E F G A Bb C) for the waiting. 75 BPM, 4/4, a 3.2 s bar (a beat 0.8 s, an eighth 0.4 s).
 *
 * THE MOTIF, six notes on the half-step above the tonic: a leap up a minor sixth that sighs down a half-step, a fall of a fifth, and the turn on Eb.
 *     D (3 eighths)  Bb (3)  A (1)  D (1)  |  Eb (4)  D (4, and on)
 *     1 b6 5 1 | b2 1. Say it: DAAAH DAAAH da-da DAAAAH DAAAAH. Its two long sighs, Bb-A and Eb-D, are the mode's two dark half-steps, and its 3+3+2 is the heartbeat the timpani keep.
 *     No run up the mode (The Mummy, Prince of Persia), no repeated-note chant (Carmina Burana, Ave Satani), no rising thirds over an ostinato (Da Vinci Code), no 6/8 (Game of Thrones), no D-minor battle (Gladiator).
 *
 * INTRO: two bars and the landing, silent by 8.35 s. The loop's time 0 is the bar line at 6.4 s, on the landing chord.
 *   bar 1  0.00  D. Everything at once: the great bell (D), the gong, bass drum, timpani D3+A2, low piano octaves, and the low brass in unison: tuba D2, trombones D3, horns D4.
 *                Horns and trombones in octaves, cellos and violas with them, state the motif at full strength over a D pedal. The timpani kick its 3+3+2.
 *                THE HIGH NOTE: A5 (MIDI 81), the top of everything for 3.2 s. Violins a 4 and the choir (ah) swell into it over the first second, flute and oboe on it, violins.trem D5 A4 and the choir's D5 A4 beneath.
 *          1.42  A gong played backwards swells into
 *   bar 2  3.20  Eb major, the world a half-step up. The tune's Eb, the top to Bb5 (MIDI 82). Brass Eb2 Bb2 Eb3 Bb3 Eb4 G4 Bb4, strings to Eb5 G5 Bb5. Gong, timpani, bass drum, cymbal, a high Eb bell.
 *          4.80  D major. Every voice sighs back down a half-step (Eb-D, Bb-A, G-F#), mf, and the great bell tolls a second time. The timpani heartbeat slows: 3+3+2, then 4+4, then 8.
 *          5.60  The top steps down, A5 G5 F#5, the choir with it. One horn section sings the motif's tail again, p: A3 D4 | Eb4 D4, landing in the loop.
 *   bar 3  6.40  D, open: cellos D3, violas A3, the low choir humming (oh), the bell's tail. Tone closing as it goes.
 *
 * LOOP, 8 bars, 25.6 s: the waiting room under the cathedral. Hall, and a little cathedral. Everything soft, strings low-passed at 1.5-2.4 kHz, every fundamental below 500 Hz.
 *   bar  chord   bass  cellos     violas    low choir (mm, oo)
 *   1    D5      D2    D3 A3      D4        D3 A3      heartbeat: timpani D3, lub-dub on 1 and on 3
 *   2    Dm      D2    D3 A3      D4 F4     D3 A3      harp: A3 D4 F4 A4 D5, irregular
 *   3    Bb/D    D2    D3 Bb3     D4 F4     D3 Bb3     heartbeat
 *   4    Am      A1    A2 A3      C4 E4     E3 A3      harp: E4 A4 C5 A4
 *   5    Gm      G1    G2 G3      Bb3 D4    D3 Bb3     the motif: oboe, far away, at half speed, entering on the viola's D4; timpani G2, pp
 *   6    Gm      G1    G2 G3      Bb3       D3 Bb3     harp: G3 D4 G4, under the oboe's held Bb
 *   7    Eb      Eb2   Eb3 Bb3    Bb3 G4    Eb3 Bb3    violins, a halo, Bb4; timpani Eb3, pp. The half-step up, once a loop
 *   8    D       D2    D3 A3      A3 F#4    D3 A3      violins A4; the great bell, far away
 *   Am to Gm moves every voice down a step together, an old organum. Gm, Eb, D is the mode's own cadence: every voice moves by a half-step into D. Voices change a quarter beat apart, bottom first.
 *   Oboe, bars 5-8: D4 (3 beats) Bb4 (3) A4 (1) D4 (1) | Eb4 (4) | D4 (4). Over Gm, Eb and D every note is a chord tone or passing.
 *
 * EFFECTS: at the end, each on the page's own clock.
 */

export default kit => {
  const { I, Mix, LoopMix, theme, themePreview, masterMix, ramp, impact, relay, stickSlip, white, bp, lp, shape, decay, norm, pad, db, N } = kit;
  const BEAT = 0.8; const BAR = BEAT * 4;
  const { m, atRms, atPeak, band, HARP, GLOCK } = I;
  const ROOMS = { hall: 1, cathedral: 0.3 };

  /* the choir, kept inside the orchestra: a level, a room, a low-pass for far or soft singing */
  const choirOf = (mix, rand, rooms) => (name, at, seconds, level, send, { vowel = 'ah', voices = 12, attack = 0.5, release = 0.6, vibrato = 13, spread = 9, breath = 0.06, width = 0.55, after = null, tone = null, from, to } = {}) => {
    let vs = I.choir(rand, m(name), seconds, { vowel, voices, attack, release, vibrato, spread, breath, width, swell: after });
    if (tone) vs = vs.map(v => ({ ...v, x: lp(v.x, tone, 0.7) }));
    const room = Object.fromEntries(Object.entries(rooms).map(([k, a]) => [k, a * send]));
    I.play(mix, atRms(vs, level, from ?? attack, to ?? Math.min(seconds, attack + 1.2)), at, 1, room);
  };
  /* THE GREAT BELL: a real tubular bell played ten semitones below itself, so its own partials ring as a bell three times its size, the same bell's strike a fifth down over it, and a struck hum under both */
  const bellOf = (hit, mix, rand, rooms) => (at, level, seconds, send, { tone = null, pan = 0, loose = 0, after } = {}) => {
    hit('tubular', 'D3', at, seconds, level, send, { vel: 1, match: /TB_hit_C4/, release: seconds * 0.5, tone, pan, width: 0.3, loose: 0, after });
    hit('tubular', 'D4', at, seconds * 0.8, level - 6, send, { vel: 1, match: /TB_hit_G4/, release: seconds * 0.4, tone, pan, width: 0.3, loose: 0, after });
    const hum = I.bell(rand, m('D3'), seconds, { bright: 0.45, strike: 0.4, pan });
    hum.forEach(v => { if (after) shape(v.x, after); if (tone) v.x = lp(v.x, tone, 0.7); });
    I.play(mix, atPeak(hum, level - 9), at + (loose ? (rand() - 0.5) * loose / 500 : 0), 1, Object.fromEntries(Object.entries(rooms).map(([k, a]) => [k, a * send])));
  };

  /* ── the intro ── */
  const intro = rand => {
    const mix = new Mix(10);
    const { sus, hit, timp } = band(mix, rand, ROOMS);
    const voice = choirOf(mix, rand, ROOMS);
    const bell = bellOf(hit, mix, rand, ROOMS);
    const P = { horn: -0.3, trombone: 0.22, tuba: 0.06, trumpet: 0.14, violins: -0.44, violins2: -0.26, violas: -0.1, cellos: 0.3, bass: 0.1, flute: 0.04, oboe: 0.12 };
    /* the lip coming up to the note: horns and trombones have no vibrato */
    const lip = depth => () => t => -depth * Math.exp(-t / 0.035);

    /* THE FIRST INSTANT */
    bell(0, -9, 8.4, 0.5, { after: ramp([[0, 1], [3, 0.8], [6, 0.45], [8.4, 0.2]]) });
    hit('gong', null, 0, 6.2, -10, 0.45, { vel: 1, match: /gongHit_fff/, release: 3.4, width: 0.5, loose: 0, tone: t => 9000 - 900 * t });
    hit('bassdrum', null, 0, 3.4, -6, 0.42, { vel: 1, release: 1.4, width: 0.2, loose: 0 });
    hit('crash', null, 0, 3.6, -19, 0.36, { vel: 0.7, match: /crash1_mf/, release: 2.4, pan: 0.24, width: 0.5, loose: 0, tone: 7500 });
    timp(['D3', 'A2'], 0, 1.3, -8, 0.4, { release: 0.5, loose: 0 });
    [['D1', -15], ['D2', -17]].forEach(([name, level]) => hit('piano', name, 0, 2.2, level, 0.32, { vel: 1, release: 1.2, pan: 0.04, width: 0.2, loose: 0 }));
    /* staccato takes on the first beat, so the unison is full inside 30 ms */
    [['tuba.stac', 'D2', -11, P.tuba], ['trombone.stac', 'D3', -12, P.trombone], ['trombone.stac', 'D3', -13, P.trombone + 0.06], ['horn.stac', 'D4', -13, P.horn], ['horn.stac', 'D3', -15, P.horn],
      ['trumpet.stac', 'D4', -17, P.trumpet], ['cellos.spic', 'D3', -15, P.cellos], ['violas.spic', 'D4', -17, P.violas], ['violins.spic', 'A5', -18, P.violins], ['violins.spic', 'D5', -19, P.violins2]]
      .forEach(([group, name, level, pan]) => hit(group, name, 0, 0.6, level, 0.3, { vel: 1, release: 0.2, pan, loose: 0 }));
    /* the pedal under bar 1 */
    sus('tuba', 'D2', 0, 3.34, -16, 0.22, { players: 2, vel: 1, skip: 0.05, release: 0.12, pan: P.tuba, loose: 0, spreadPan: 0.05 });
    sus('bass', 'D2', 0, 3.3, -21, 0.3, { players: 2, vel: 1, skip: 0.1, release: 0.14, pan: P.bass, loose: 0, from: 0.1, to: 0.8, spreadPan: 0.06 });

    /* THE MOTIF: trombones, horns an octave up, cellos and violas with them. The phrase rises to Bb, the short notes drive into Eb, the last D lets go */
    const MOTIF = [
      /* trombones, horns, at, length, level */
      ['D3', 'D4', 0, 1.26, -13],
      ['Bb3', 'Bb4', 1.2, 1.26, -12],
      ['A3', 'A4', 2.4, 0.44, -14.5],
      ['D3', 'D4', 2.8, 0.44, -14],
      ['Eb3', 'Eb4', 3.2, 1.66, -11.5],
      ['D3', 'D4', 4.8, 1.3, -16],
    ];
    MOTIF.forEach(([low, high, at, length, level], k) => {
      const first = k === 0; const last = k === MOTIF.length - 1;
      const after = last ? ramp([[0, 1], [0.5, 0.62], [1.3, 0]]) : length > 1 ? ramp([[0, 1], [0.3, 0.86], [length - 0.1, 1.06], [length, 0.9]]) : undefined;
      const tone = last ? t => 3600 - 1200 * t : undefined;
      const o = { vel: last ? 0.7 : 1, release: last ? 0.3 : 0.07, after, tone };
      sus('trombone', low, at, length, level, 0.28, { ...o, players: 3, skip: first ? 0.03 : 0.025, pan: P.trombone, loose: first ? 0 : 5, bendOf: lip(14) });
      sus('horn', high, at, length, level - 1, 0.3, { ...o, players: 4, skip: first ? 0.03 : 0.025, pan: P.horn, loose: first ? 0 : 5, bendOf: lip(k === 1 ? 40 : 18) });
      const early = first ? 0 : 0.07;
      sus('cellos', low, at - early, length + early, level - 6, 0.38, { ...o, players: 3, skip: first ? 0.08 : 0.05, pan: P.cellos, loose: first ? 0 : 6 });
      sus('violas', high, at - early, length + early, level - 8, 0.4, { ...o, players: 3, skip: first ? 0.08 : 0.05, pan: P.violas, loose: first ? 0 : 6 });
    });
    [[1.2, 'Bb3', 'Bb4', -15], [2.4, 'A3', 'A4', -17], [2.8, 'D3', 'D4', -15.5]].forEach(([at, low, high, level]) => {
      hit('trombone.stac', low, at, 0.5, level, 0.3, { vel: 1, release: 0.2, pan: P.trombone });
      hit('horn.stac', high, at, 0.5, level - 1, 0.3, { vel: 1, release: 0.2, pan: P.horn });
    });
    /* the timpani keep the motif's 3+3+2 */
    timp('D3', 1.2, 0.9, -15, 0.4, { vel: 0.8, release: 0.3 });
    timp('A2', 2.4, 0.5, -17, 0.4, { vel: 0.7, release: 0.2 });
    timp('D3', 2.8, 0.5, -14, 0.4, { vel: 0.85, release: 0.2 });

    /* THE HIGH NOTE, and the top line's way down. Violins a 4 carry it, the tremolo, flute and oboe double it, the choir sings inside it */
    const TOP = [
      /* name, at, seconds, level, the line's shape */
      ['A5', 0, 3.3, -17, ramp([[0, 0.6], [0.3, 0.72], [1.1, 1], [3.1, 1.08], [3.3, 0.8]])],
      ['Bb5', 3.13, 1.74, -15.5, ramp([[0, 0.85], [0.12, 1], [1.5, 0.95], [1.74, 0.7]])],
      ['A5', 4.73, 0.95, -20, ramp([[0, 0.9], [0.5, 0.8], [0.95, 0.6]])],
      ['G5', 5.53, 0.55, -24, ramp([[0, 0.9], [0.55, 0.7]])],
      ['F#5', 5.93, 1.35, -27, ramp([[0, 0.85], [0.35, 1], [0.8, 0.5], [1.35, 0]])],
    ];
    TOP.forEach(([name, at, seconds, level, after], k) => {
      const soft = k >= 2;
      const tone = soft ? (k === 4 ? t => 3200 - 1200 * t : 4200 - k * 300) : undefined;
      sus('violins', name, at, seconds, level, 0.42, { players: 4, vel: soft ? 0.55 : 1, skip: k ? 0.08 : 0.12, release: 0.12, pan: P.violins, loose: k ? 5 : 0, after, tone, from: 0.15, to: Math.min(1.2, seconds) });
      sus('violins.trem', name, at, seconds, level - 6, 0.42, { players: 2, vel: soft ? 0.4 : 1, skip: 0.06, release: 0.12, pan: P.violins2, loose: k ? 5 : 0, after, tone });
      sus('flute', name, at + (k ? 0.03 : 0.3), seconds - (k ? 0.03 : 0.3), level - 4, 0.5, { vel: 1, legato: k > 0, attack: k ? 0 : 0.4, release: 0.12, pan: P.flute, width: 0.2, loose: 4, after, tone });
      sus('oboe', name, at + (k ? 0.03 : 0.2), seconds - (k ? 0.03 : 0.2), level - 7, 0.5, { vel: soft ? 0.3 : 1, legato: k > 0, attack: k ? 0 : 0.3, release: 0.12, pan: P.oboe, width: 0.2, loose: 4, after, tone });
      voice(name, at, seconds + 0.2, level - 3, 0.6, { vowel: 'ah', voices: 15, attack: k ? 0.14 : 0.6, release: k === 4 ? 0.8 : 0.3, after, tone: soft ? 3200 : 5200 });
    });
    /* beneath the top: the tremolo and the choir in the chord */
    [
      { at: 0, len: 3.3, names: ['D5', 'A4'], level: -23, vel: 1 },
      { at: 3.13, len: 1.74, names: ['G5', 'Eb5', 'Bb4'], level: -22, vel: 1 },
      { at: 4.73, len: 1.7, names: ['D5', 'A4', 'F#4'], level: -27, vel: 0.5, tone: 3000, after: ramp([[0, 1], [0.8, 0.7], [1.7, 0]]) },
    ].forEach(({ at, len, names, level, vel, tone, after }, k) => names.forEach((name, j) => {
      sus('violins.trem', name, at - (k ? 0.04 : 0), len, level - j, 0.42, { players: 2, vel, skip: 0.05, release: 0.15, pan: P.violins2 + 0.06 * j, loose: k ? 6 : 0, tone, after });
    }));
    [['D5', 0, 3.4, -24, 0.7], ['A4', 0, 3.4, -25, 0.8], ['Eb5', 3.13, 1.8, -23, 0.14], ['G4', 3.13, 1.8, -25, 0.14], ['D5', 4.73, 2.1, -28, 0.14], ['A4', 4.73, 2.1, -29, 0.14]].forEach(([name, at, seconds, level, attack], k) => {
      voice(name, at, seconds, level, 0.6, { vowel: 'ah', voices: 9, attack, release: k >= 4 ? 1.2 : 0.3, tone: k >= 4 ? 2600 : 4600, after: k >= 4 ? ramp([[0, 1], [0.9, 0.6], [2.1, 0]]) : null });
    });

    /* INTO BAR 2: a gong played backwards, then Eb */
    I.play(mix, atPeak(I.reversed(I.hit(rand, 'gong', { vel: 0.7, match: /gongHit_mf/, seconds: 1.8, release: 0.02, width: 0.5 })), -15), 3.2 - 1.78, 1, { hall: 0.4, cathedral: 0.12 });
    hit('gong', null, 3.2, 5.1, -12, 0.45, { vel: 0.8, match: /gongHit_f\./, release: 3, width: 0.5, tone: t => 8000 - 1000 * t });
    hit('suscymbal', null, 3.2, 3, -17, 0.4, { vel: 0.8, match: /susCymb1-hit_f/, release: 2, pan: 0.2, width: 0.5 });
    hit('bassdrum', null, 3.2, 2.8, -9, 0.42, { vel: 0.9, release: 1.2, width: 0.2 });
    timp(['Eb3', 'Bb2'], 3.2, 1.2, -8, 0.4, { release: 0.5 });
    hit('tubular', 'Eb5', 3.2, 2.3, -19, 0.55, { vel: 1, match: /TB_hit_F5/, release: 1.4, tone: 6000, pan: -0.06, width: 0.3 });
    hit('piano', 'Eb2', 3.2, 1.6, -18, 0.32, { vel: 1, release: 0.9, pan: 0.04, width: 0.2 });
    [['tuba.stac', 'Eb2', -11, P.tuba], ['trombone.stac', 'Eb3', -12, P.trombone], ['trombone.stac', 'Bb2', -14, P.trombone + 0.06], ['horn.stac', 'Eb4', -13, P.horn], ['horn.stac', 'G4', -16, P.horn + 0.05],
      ['trumpet.stac', 'Bb4', -16, P.trumpet], ['cellos.spic', 'Eb3', -15, P.cellos], ['violas.spic', 'G4', -17, P.violas], ['violins.spic', 'Bb5', -17, P.violins]]
      .forEach(([group, name, level, pan]) => hit(group, name, 3.2, 0.5, level, 0.3, { vel: 1, release: 0.2, pan }));
    /* the Eb chord around the tune, from the bottom: Eb2 Bb2 Eb3 Bb3 Eb4 G4 Bb4 */
    sus('tuba', 'Eb2', 3.18, 1.66, -14, 0.22, { players: 2, vel: 1, skip: 0.03, release: 0.12, pan: P.tuba, spreadPan: 0.05 });
    sus('bass', 'Eb2', 3.1, 1.76, -20, 0.3, { players: 2, vel: 1, skip: 0.06, release: 0.14, pan: P.bass, from: 0.1, to: 0.8 });
    sus('trombone', 'Bb2', 3.18, 1.66, -16, 0.28, { players: 2, vel: 1, skip: 0.03, release: 0.1, pan: P.trombone + 0.06 });
    sus('horn', 'Bb3', 3.18, 1.66, -18, 0.3, { players: 2, vel: 1, skip: 0.03, release: 0.1, pan: P.horn + 0.06 });
    sus('horn', 'G4', 3.18, 1.66, -19, 0.3, { players: 2, vel: 1, skip: 0.03, release: 0.1, pan: P.horn - 0.06 });
    [['Bb4', -19], ['G4', -21], ['Eb4', -22]].forEach(([name, level], j) => sus('trumpet', name, 3.19, 1.64, level, 0.3, { players: 2, vel: 1, skip: 0.03, release: 0.12, pan: P.trumpet + j * 0.05, after: ramp([[0, 1], [0.4, 0.8], [1.64, 0.55]]) }));
    sus('violas', 'G4', 3.12, 1.74, -24, 0.4, { players: 2, vel: 1, skip: 0.06, release: 0.14, pan: P.violas - 0.1 });

    /* D major, mf, and down: the great bell's second stroke, the half-step sigh in every voice */
    const sink = ramp([[0, 1], [0.6, 0.7], [1.6, 0.25], [2.2, 0]]);
    bell(4.8, -13, 3.6, 0.55, { after: ramp([[0, 1], [1.6, 0.6], [3.6, 0.25]]) });
    timp('D3', 4.8, 1.2, -17, 0.4, { vel: 0.6, release: 0.5 });
    hit('bassdrum', null, 4.8, 1.8, -21, 0.42, { vel: 0.5, release: 0.8, width: 0.2 });
    sus('tuba', 'D2', 4.78, 2.2, -19, 0.24, { players: 2, vel: 0.7, skip: 0.03, release: 0.5, pan: P.tuba, after: sink, tone: 1800 });
    sus('bass', 'D2', 4.7, 3.6, -22, 0.3, { players: 2, vel: 0.6, skip: 0.06, release: 1.2, pan: P.bass, after: ramp([[0, 1], [1.6, 0.6], [3.6, 0]]), tone: 1400 });
    sus('trombone', 'A2', 4.78, 1.8, -21, 0.3, { players: 2, vel: 0.6, skip: 0.03, release: 0.4, pan: P.trombone + 0.06, after: sink, tone: 2600 });
    sus('horn', 'A3', 4.78, 1.8, -23, 0.32, { players: 2, vel: 0.6, skip: 0.03, release: 0.4, pan: P.horn + 0.06, after: sink, tone: 2600 });
    sus('horn', 'F#4', 4.78, 1.8, -24, 0.32, { players: 2, vel: 0.6, skip: 0.03, release: 0.4, pan: P.horn - 0.06, after: sink, tone: 2600 });
    sus('violas', 'F#4', 4.72, 2.4, -27, 0.42, { players: 2, vel: 0.5, skip: 0.08, release: 0.5, pan: P.violas - 0.1, after: ramp([[0, 1], [1.2, 0.6], [2.4, 0]]), tone: 2800 });
    timp('D3', 6.4, 1.5, -26, 0.42, { vel: 0.35, release: 0.6, loose: 0 });
    hit('bassdrum', null, 6.4, 1.4, -30, 0.42, { vel: 0.25, release: 0.6, width: 0.2, loose: 0 });

    /* the motif's tail once more, p, one horn section: A3 D4 | Eb4 D4 */
    [['A3', 5.6, 0.44, -23, 0.5], ['D4', 6.0, 0.44, -22.5, 0.5], ['Eb4', 6.4, 0.84, -23.5, 0.42], ['D4', 7.2, 1.15, -27, 0.35]].forEach(([name, at, length, level, vel], k) => {
      sus('horn', name, at - 0.02, length + 0.04, level, 0.45, { players: 2, vel, skip: k ? 0.03 : 0.04, release: k === 3 ? 0.8 : 0.08, pan: P.horn + 0.08, loose: 6, tone: 2600 - k * 200, after: k === 3 ? ramp([[0, 1], [0.5, 0.6], [1.19, 0]]) : undefined });
    });

    /* THE LANDING: the open fifth, the low hum, the bell's tail */
    const land = ramp([[0, 0.7], [0.5, 1], [1.2, 0.6], [2.0, 0]]);
    sus('cellos', 'D3', 6.3, 2.05, -27, 0.45, { players: 2, vel: 0.2, skip: 0.45, attack: 0.1, release: 0.5, pan: P.cellos, tone: t => 2200 - 500 * t, from: 0.2, to: 0.8, after: land });
    sus('violas', 'A3', 6.3, 2.05, -29, 0.45, { players: 2, vel: 0.2, skip: 0.45, attack: 0.1, release: 0.5, pan: P.violas, tone: t => 2200 - 500 * t, from: 0.2, to: 0.8, after: land });
    voice('D3', 4.6, 3.75, -26, 0.5, { vowel: 'oh', voices: 9, attack: 0.8, release: 1.4, tone: 1800, width: 0.4 });
    voice('A3', 4.6, 3.75, -28, 0.5, { vowel: 'oh', voices: 9, attack: 0.8, release: 1.4, tone: 1800, width: 0.4 });

    return masterMix(mix, { peak: -2.5, soften: 1.3, comp: { threshold: -14, ratio: 2.5 }, fadeFrom: 7.4, fadeTo: 8.35 });
  };

  /* ── the loop ── */
  const loop = rand => {
    const mix = new LoopMix(BAR * 8);
    const { sus, hit, timp } = band(mix, rand, ROOMS);
    const voice = choirOf(mix, rand, ROOMS);
    const bell = bellOf(hit, mix, rand, ROOMS);
    /* the strings and voices breathe together, in beats and dB: a small breath at the end of bar 1 where the seam can hide, a rise into the Eb of bar 7, a settling on D */
    const breath = ramp([[0, 0], [2.4, 0], [3.3, -3.5], [4.1, -0.5], [6, 0], [12, 0.5], [16, -0.5], [20, 0.5], [24, 1.8], [26, 2.2], [28, 1], [30, 0], [32, 0]]);
    const swell = at => t => db(breath(((at + t) / BEAT + 64) % 32));

    const PAD = [
      /* group, pan, level, tone, skip, [name, from beat, to beat] */
      ['bass', 0.06, -31, 900, 0.35, [['D2', 0, 12], ['A1', 12, 16], ['G1', 16, 24], ['Eb2', 24, 28], ['D2', 28, 32]]],
      ['cellos', 0.34, -32, 1800, 0.35, [['D3', 0.25, 12.25], ['A2', 12.25, 16.25], ['G2', 16.25, 24.25], ['Eb3', 24.25, 28.25], ['D3', 28.25, 32.25]]],
      ['cellos', 0.2, -32, 2000, 0.35, [['A3', 0.5, 8.5], ['Bb3', 8.5, 12.5], ['A3', 12.5, 16.5], ['G3', 16.5, 24.5], ['Bb3', 24.5, 28.5], ['A3', 28.5, 32.5]]],
      ['violas', -0.04, -34, 2300, 0.5, [['D4', 0.75, 12.75], ['C4', 12.75, 16.75], ['Bb3', 16.75, 28.75], ['A3', 28.75, 32.75]]],
      ['violas', -0.2, -34, 2400, 0.5, [['F4', 4.5, 13], ['E4', 13, 16], ['D4', 16, 20.5], ['G4', 24.5, 29], ['F#4', 29, 32.5]]],
      ['violins', -0.42, -37, 1500, 0.5, [['Bb4', 24.75, 29.25], ['A4', 29.25, 32.75]]],
    ];
    PAD.forEach(([group, pan, level, tone, skip, part]) => part.forEach(([name, from, to]) => {
      const at = from * BEAT - 0.14;
      const seconds = (to - from) * BEAT + 0.14 + 0.5;
      sus(group, name, at, seconds, level, 0.45, {
        /* soft takes speak up to a second late, so a long note is measured in its sustain, not its onset */
        players: 2, vel: 0.2, skip, attack: 0.35, release: 0.55, tone, pan, spreadCents: 5, spreadMs: 18, spreadPan: 0.14, loose: 14, from: Math.min(0.9, seconds * 0.3), to: Math.min(2.9, seconds - 0.5), after: swell(at),
      });
    }));
    /* the low choir, inside the cellos and violas */
    [
      ['mm', -33, [['D3', 0, 12.6], ['E3', 12.6, 16.8], ['D3', 16.8, 24.6], ['Eb3', 24.6, 28.6], ['D3', 28.6, 32.4]]],
      ['oo', -34, [['A3', 0.2, 8.8], ['Bb3', 8.8, 12.8], ['A3', 12.8, 16.8], ['Bb3', 16.8, 28.8], ['A3', 28.8, 32.6]]],
    ].forEach(([vowel, level, part]) => part.forEach(([name, from, to]) => {
      const at = from * BEAT - 0.3; const seconds = (to - from) * BEAT + 0.3 + 0.9;
      voice(name, at, seconds, level, 0.55, { vowel, voices: 9, attack: 0.9, release: 1.1, vibrato: 9, spread: 7, breath: 0.04, width: 0.45, tone: 1500, after: swell(at), from: 1, to: Math.min(seconds - 1, 3) });
    }));

    /* the heartbeat: lub-dub on 1 and 3 of bars 1 and 3, a cello pizzicato in it so a phone can hear the pulse; single soft strokes on the roots of bars 5 and 7 */
    [[0, -21, 0.4, 1.6], [0.36, -27, 0.3, 1.2], [1.6, -24, 0.35, 1.0], [1.96, -29, 0.28, 0.8], [6.4, -22, 0.38, 1.6], [6.76, -28, 0.3, 1.2], [8.0, -25, 0.33, 1.2], [8.36, -30, 0.26, 1.0]].forEach(([at, level, vel, seconds], k) => {
      timp('D3', at, seconds, level, 0.4, { vel, release: 0.5, tone: 1600, loose: 6 });
      if (k % 2 === 0) {
        hit('bassdrum', null, at, 1.2, level - 8, 0.4, { vel: 0.25, release: 0.5, width: 0.2, loose: 6 });
        hit('cellos.pizz', 'D3', at, 0.9, level - 6, 0.42, { vel: 0.3, release: 0.4, pan: 0.2, width: 0.2, tone: 1200, loose: 6 });
      }
    });
    timp('G2', 4 * BAR, 1.8, -27, 0.42, { vel: 0.3, release: 0.7, tone: 1500, loose: 6 });
    timp('Eb3', 6 * BAR, 1.8, -28, 0.42, { vel: 0.3, release: 0.7, tone: 1500, loose: 6 });

    /* the harp, on bars 2, 4 and 6, in an irregular rhythm */
    const FIGURE = [0, 0.55, 0.8, 1.75, 2.1];
    [[4.5, ['A3', 'D4', 'F4', 'A4', 'D5']], [12.5, ['E4', 'A4', 'C5', 'A4']], [20.5, ['G3', 'D4', 'G4']]].forEach(([beat, names]) => names.forEach((name, k) => {
      const lift = Math.sin(Math.PI * (k + 0.5) / names.length);
      hit('harp', name, beat * BEAT + FIGURE[k], 2.6, -29 + 3 * lift, 0.6, { vel: 0.4, release: 1, cents: HARP, tone: 2200, pan: -0.36 + k * 0.05, width: 0.25, loose: 16 });
    }));

    /* the motif, once: an oboe far away at half speed, entering on the viola's D4. The phrase rises to Bb and relaxes */
    [['D4', 16, 19, -29], ['Bb4', 19, 22, -27], ['A4', 22, 23, -29.5], ['D4', 23, 24, -29.5], ['Eb4', 24, 28, -27.5], ['D4', 28, 31.6, -30]].forEach(([name, from, to, level], k, all) => {
      const seconds = (to - from) * BEAT + 0.12; const last = k === all.length - 1;
      const after = last ? ramp([[0, 1], [1.5, 0.8], [seconds, 0]]) : k === 1 ? ramp([[0, 0.85], [1.2, 1], [seconds, 0.9]]) : undefined;
      sus('oboe', name, from * BEAT - 0.05, seconds, level, 1.0, { vel: 0.2, legato: k > 0, release: last ? 1.2 : 0.1, attack: k ? 0 : 0.35, tone: 2300, pan: 0.12, width: 0.2, loose: 10, from: 0.1, to: Math.min(0.8, seconds), after });
    });

    /* the great bell, far away, on the D of bar 8: its tail rings into bar 1 */
    bell(7 * BAR, -27, 8.6, 1.4, { tone: 1600, pan: -0.1 });

    return mix.fold({ peak: -13, comp: { threshold: -24, ratio: 2 } });
  };

  /* ── foley: a brass device with three rings, in stone ── */
  const FX = { hall: 0.08, vault: 0.05 };
  const jitter = rand => (v, amount) => v + (rand() - 0.5) * 2 * amount;
  const spread = rand => (v, by = 1.5) => v * db((rand() - 0.5) * 2 * by);
  /*
   * One notch of a heavy ring, on the ring's own clock (pack-nine.css .pk-nine-ring: it waits 120 ms, then turns in 580 ms on an overshooting curve:
   * a quarter of the way at 315 ms, half at 358, three quarters at 402, home at 478, past it to 569, back on the detent by 700). Every layer its own noise.
   */
  const notch = (mix, rand, { gain = 1, heavy = 1, pawl = true, room = FX } = {}) => {
    const jit = jitter(rand); const lvl = spread(rand);
    /* the finger takes the ring: the pawl lifts */
    if (pawl) mix.add(impact(rand, { mass: 0.2, seconds: 0.08, click: 0.8, knock: 0.7, low: 0, knockBase: 1250 + rand() * 200, knockTau: 0.006, hard: 0.9 }), 0, lvl(0.3) * gain, -0.04, room);
    /* brass dragging on brass while it moves */
    const speed = t => { const u = t / 0.36; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u ** 0.8) ** 1.5; };
    mix.add(stickSlip(rand, 0.36, speed, { rateMin: 40, rateMax: 160, base: 1500 + rand() * 200, tau: 0.004, count: 7 }), 0.13, lvl(0.07) * gain, 0.05, room);
    /* the detents */
    [[0.315, 0.32], [0.358, 0.42], [0.402, 0.5]].forEach(([at, g]) => mix.add(relay(rand, 0.07, 0.75 + rand() * 0.15), jit(at, 0.004), lvl(g) * gain, jit(0.04, 0.05), room));
    /* home: the tock, and a small ring of the metal */
    mix.add(impact(rand, { mass: 0.9 * heavy, seconds: 0.36, click: 0.7, knock: 1, low: 0.35, knockBase: (300 + rand() * 50) / heavy ** 0.3, knockTau: 0.032, lowHz: 118, lowTau: 0.05, ringing: 0.18, ringBase: 1750 + rand() * 300, ringTau: 0.08 }), jit(0.478, 0.003), lvl(1) * gain, 0, room);
    /* past it, and back onto the detent */
    mix.add(relay(rand, 0.06, 0.65), jit(0.635, 0.008), lvl(0.12) * gain, 0.03, room);
  };

  return {
    sounds: {
      music: theme({ pack: 'nine', period: BAR * 8, entry: BAR * 2, earliest: 8.4, loopIn: [5.6, 8.0], bitrate: 72000, intro, loop }),

      /* a ring turning one notch: the pawl at the touch, the detents as it swings, the tock when it lands at 478 ms. The page raises the rate turn by turn */
      tap: {
        seconds: 0.74, peak: -16, fadeFrom: 0.66, fadeTo: 0.74, bitrate: 72000,
        build(mix, rand) { notch(mix, rand); },
      },

      /*
       * The eighth turn, on the page's clock (GildedNinePackScreen turn(), pack-nine.css): the phone buzzes at 0 and 74 ms, the ring lands at 478 ms, the eye stares;
       * the three slots light at 920, 990 and 1060 ms (pk-nine-gz-a, b, c); the spark leaves the lowest at 1060 and lands on the plate at 1340; the plate answers.
       */
      final: {
        seconds: 3.2, peak: -5, soften: 1.3, fadeFrom: 2.55, fadeTo: 3.17, bitrate: 72000,
        marks: { clunk: 0.074, home: 0.478, slot1: 0.92, slot2: 0.99, slot3: 1.06, plate: 1.34 },
        build(mix, rand) {
          const { sus, hit, timp } = band(mix, rand, ROOMS);
          const voice = choirOf(mix, rand, ROOMS);
          const room = { hall: 0.2, cathedral: 0.05 };
          /* the mechanism lets go with the two buzzes: a latch, then the deep clunk, with a timpano inside it for weight */
          mix.add(impact(rand, { mass: 0.4, seconds: 0.2, click: 1, knock: 0.7, low: 0, knockBase: 560 + rand() * 80, knockTau: 0.018 }), 0, 0.28, -0.05, room);
          mix.add(impact(rand, { mass: 1.9, seconds: 1, click: 0.6, knock: 1, low: 0.9, knockBase: 205 + rand() * 30, knockTau: 0.075, lowHz: 58, lowTau: 0.16, ringing: 0.1, ringBase: 690 + rand() * 60, ringTau: 0.2 }), 0.074, 0.75, -0.02, room);
          timp('D3', 0.074, 1.2, -17, 0.4, { vel: 0.7, release: 0.5, loose: 0 });
          /* the ring still turns home with the others, heavier */
          notch(mix, rand, { gain: 0.5, heavy: 1.5, pawl: false, room });
          /* the three slots light, rising: A5, D6, A6 */
          [['A5', 0.92, -18], ['D6', 0.99, -21], ['A6', 1.06, -20]].forEach(([name, at, level], k) => {
            hit('glock', name, at, 1.8, level, 0.55, { cents: GLOCK, release: 1.1, tone: 5200, pan: -0.14 + 0.14 * k, width: 0.25, loose: 0 });
            hit('harp', name, at, 1.8, level + 3, 0.55, { vel: 0.5, cents: HARP, release: 1.1, tone: 4400, pan: -0.14 + 0.14 * k, width: 0.25, loose: 0 });
          });
          /* the spark falls to the plate, 1.06 to 1.34: down the mode, and a breath of air with it */
          ['A6', 'G6', 'F#6', 'Eb6', 'D6', 'Bb5', 'A5'].forEach((name, k, all) => {
            const u = k / (all.length - 1);
            hit('harp', name, 1.08 + 0.24 * u ** 1.2, 0.8, -31 + 3 * u, 0.6, { vel: 0.3, cents: HARP, release: 0.5, tone: 6000, pan: 0.12 - 0.14 * u, width: 0.2, loose: 2 });
          });
          const air = bp(decay(white(N(0.3), rand), 0.2, 0.08), t => 9000 - 22000 * t, 2);
          mix.add(pad(norm(air), 0.3), 1.06, 0.05, 0.06, { hall: 0.3 });
          /* the plate answers: a soft gong, the low choir's breath, cellos and violas around it */
          hit('gong', null, 1.34, 2.15, -9, 0.5, { vel: 0.3, match: /gongHit_p/, release: 1.4, width: 0.5, loose: 0 });
          hit('bassdrum', null, 1.34, 1.6, -18, 0.45, { vel: 0.35, release: 0.8, width: 0.2, loose: 0 });
          voice('D3', 1.28, 2.2, -19, 0.6, { vowel: 'oh', voices: 9, attack: 0.18, release: 1.5, breath: 0.2, width: 0.45, tone: 2200 });
          voice('A3', 1.3, 2.2, -21, 0.6, { vowel: 'oh', voices: 9, attack: 0.2, release: 1.5, breath: 0.2, width: 0.45, tone: 2200 });
          sus('cellos', 'D3', 1.24, 2.2, -21, 0.5, { players: 2, vel: 0.3, skip: 0.3, attack: 0.1, release: 1.4, pan: 0.3, tone: 2000, loose: 0 });
          sus('violas', 'A3', 1.24, 2.2, -23, 0.5, { players: 2, vel: 0.3, skip: 0.4, attack: 0.1, release: 1.4, pan: -0.1, tone: 2000, loose: 0 });
        },
      },

      /* A seal pressed into brass at the tap, a rising shimmer up the mode to 560 ms, where the spark lands on the empty chair, and a soft tubular bell there */
      notify: {
        seconds: 1.2, peak: -10, soften: 1.2, fadeFrom: 0.9, fadeTo: 1.18, bitrate: 72000,
        build(mix, rand) {
          const room = { hall: 0.16, cathedral: 0.04 };
          const jit = jitter(rand);
          mix.add(impact(rand, { mass: 0.6, seconds: 0.22, click: 0.8, knock: 1, low: 0.25, knockBase: 360 + rand() * 40, knockTau: 0.026, lowHz: 120, lowTau: 0.04, ringing: 0.22, ringBase: 1500 + rand() * 200, ringTau: 0.05 }), 0, 0.7, -0.03, room);
          mix.add(relay(rand, 0.07, 0.75), jit(0.055, 0.004), 0.16, 0.04, room);
          const { hit } = band(mix, rand, ROOMS);
          ['D5', 'Eb5', 'F#5', 'G5', 'A5', 'Bb5', 'D6', 'Eb6', 'F#6', 'A6'].forEach((name, k, all) => {
            const u = k / (all.length - 1);
            hit('harp', name, 0.13 + 0.4 * u ** 0.85, 0.9, -31 + 12 * u, 0.55, { vel: 0.5, release: 0.4, cents: HARP, tone: 6000, pan: -0.25 + 0.5 * u, width: 0.25, loose: 2 });
          });
          hit('tubular', 'D5', 0.56, 0.94, -8, 0.55, { vel: 0.2, match: /TB_hit_C5/, release: 0.5, tone: 4800, pan: 0.05, width: 0.25, loose: 0 });
          hit('glock', 'D6', 0.56, 0.9, -21, 0.55, { cents: GLOCK, release: 0.5, tone: 5000, pan: 0.1, width: 0.25, loose: 0 });
        },
      },

      /* a small brass latch */
      click: {
        seconds: 0.085, peak: -19, fadeFrom: 0.05, fadeTo: 0.085, bitrate: 64000,
        build(mix, rand) {
          mix.add(impact(rand, { mass: 0.16, seconds: 0.085, click: 0.6, knock: 0.9, low: 0, knockBase: 1050, knockTau: 0.007, ringing: 0.14, ringBase: 2600, ringTau: 0.014, hard: 0.8 }), 0, 1, 0, { hall: 0.03 });
          mix.add(relay(rand, 0.05, 0.6), 0.011, 0.25, 0.02, { hall: 0.03 });
        },
      },
    },
    preview: rendered => themePreview({
      pack: 'nine', rendered, seconds: 70,
      taps: [1, 2, 3, 4, 5, 6, 7].map(n => ({ at: 26 + (n - 1) * 2.5, rate: 1 + n * 0.016 })),
      final: { at: 44, restoreAfter: 2.2 }, notifyAt: 60, clickAt: 66,
    }),
  };
};
