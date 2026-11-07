/*
 * CINEMA CHAIN: "Curtain Up". An old movie palace on premiere night, gold and red velvet.
 *
 * E-flat major. 80 BPM, 4/4, a 3 s bar (a beat is 0.75 s).
 *
 * THE MOTIF. Two cells, each opening with the same falling minor third on the same dotted snap, so the ear gets it twice:
 *     cell 1   Eb5 (dotted 8th)  C5 (16th)  G5 (quarter)  Bb5 (long, the high note)
 *     cell 2   Ab5 (dotted 8th)  F5 (16th)  G5 (quarter)
 *     do la mi' sol' ... fa' re' mi'. Together the first four outline Eb6, the added sixth of the golden age. Say it: DAAA-da DAH DAAAAAAH ... DAAA-da DAH.
 *     Not an arpeggio from the root, no repeated-note fanfare, no do-sol leap: nothing shared with the studio logos, Star Wars or Superman.
 *
 * INTRO, 8.75 s. The loop's time 0 falls at 6 s, on the landing chord: the intro truly ends on the loop's first chord, and the loop comes up under that same chord, so nothing clashes.
 *   bar 1  0.00  Eb. Everything at once: bass drum, timpani double stop, snare, crash, full brass from tuba Eb2 to trumpets Eb5, in the overtone voicing (Eb2 Eb3 G3 Bb3 Eb4 G4 Bb4 Eb5).
 *                Trumpets a 3 in triads state cell 1, violins in unison and at the octave below. Timpani and low brass kick the same dotted rhythm.
 *          1.50  Trumpets reach Bb5 (MIDI 82), held 2.25 s, the top of everything, violins on it too. Under it: horns in octaves ANSWER cell 1 (Eb C G, landing on Bb at 3.0),
 *                a harp glissando Eb3 to Bb6, a timpani roll and a cymbal swelling.
 *   bar 2  3.00  The world changes under the held note: Gb major (bIII), the Bb now its glowing third. Second hit: timpani on Gb, crash, tuba Gb2.
 *          3.75  Ab (IV). Trumpets start down with cell 2: Ab5 F5, block harmony.
 *          4.50  Eb/Bb (cadential 6/4). G5, already mf and thinning. Bass line Eb, Gb, Ab, Bb rises against the falling tune.
 *          5.25  Bb7. The tune drops an octave into the horns: F4 D4. Timpani echo the dotted rhythm, p. Harp pours down.
 *   bar 3  6.00  Eb6, horns on Eb4, then warm soft strings (Eb3 Bb3 Eb4 G4, the C5 blooming late). A real diminuendo, tone closing as it goes, gone by 8.75 s.
 *
 * LOOP, 8 bars, 24 s: the lobby after the crowd has gone in. theatre room. Everything soft, strings low-passed at about 3 kHz, all fundamentals below 1 kHz.
 *   bar  chord          bass pizz (1, 3)   violins and violas, top down                            cellos
 *   1    Eb6            Eb2 Bb2            C5 . G4 . Eb4 . Bb3                                     Eb3
 *   2    Cm7            C2 G2              C5 falls to Bb4 late . G4 . Eb4 . G3                    C3
 *   3    Fm9 > Fm7      F2 C3              Bb4 falls to Ab4 late . G4 falls to F4 . Eb4 . Ab3      F3
 *   4    Bb13 > Bb7     Bb1 F2             Ab4 G4 F4 . F4 D4 . D4 Bb3 . Ab3                        D3
 *   5    Ebmaj7 > G7    Eb2 G2             G4 F4 . D4 . Bb3 B3 . G3                                Eb3 D3
 *   6    Abmaj9         Ab2 Eb2            G4 . Eb4 . C4 . Ab3                                     Eb3
 *   7    Abm6 > Eb/G    Ab2 G2             F4 G4 . Eb4 . Cb4 Bb3 . Ab3 G3                          Eb3
 *   8    F9 > Bb13      F2 Bb1             F4 G4 . Eb4 F4 . C4 D4 . G3 Ab3                         Eb3 D3
 *   Motif, once: flute, far away, at half speed, bars 5-7: Eb5 C5 G5 | Bb5 | Ab5 F5 G5.
 *   One horn, inner line: bars 2-5 rising under the falling violins, in the motif's rhythm, G3 Ab3 Bb3 | C4 Bb3 C4 | D4 | Eb4, handing its Eb to the flute's Eb an octave up;
 *   bars 7-8 the chromatic fall Bb3 A3 Ab3 into G3 of bar 1.
 *   Harp: broken chords on even bars only, rising, falling on bar 8. Under it all, a projector's flutter at 24 frames a second, very faint.
 *
 * EFFECTS: see the recipes at the end, each against the page's own clock.
 */

export default kit => {
  const { I, Mix, LoopMix, theme, themePreview, masterMix, N, ramp, impact, relay, white, bp, hp, shape, decay, norm, gainOf, sum, pad, drive, db, gauss, clamp, TAU, SR } = kit;
  const BEAT = 0.75; const BAR = BEAT * 4;

  const { m, atRms, atPeak, band, HARP, GLOCK } = I;

  /* ── the intro ── */
  const intro = rand => {
    const mix = new Mix(10);
    const { sus, hit, timp, roll } = band(mix, rand, { theatre: 1, hall: 0.2 });
    const P = { trumpet: 0.16, horn: -0.3, trombone: 0.24, tuba: 0.06, violins: -0.44, violins2: -0.26, violas: -0.08, cellos: 0.3, bass: 0.1 };
    /* a singing vibrato that opens late, and the lip coming up to the note */
    const sing = (delay, depth) => () => {
      const rate = 5 + rand() * 0.7; const phase = rand() * TAU;
      return t => depth * Math.sin(TAU * rate * t + phase) * clamp((t - delay) / 0.7, 0, 1) - 26 * Math.exp(-t / 0.03);
    };

    /* DRUMS. The first instant, then what answers it */
    hit('bassdrum', null, 0, 3, -7, 0.42, { vel: 1, release: 1.2, loose: 0, width: 0.2 });
    hit('crash', null, 0, 4.2, -13, 0.34, { vel: 1, match: /crash1_ff/, release: 2.6, pan: 0.26, width: 0.5, loose: 0 });
    timp(['Eb2', 'Eb3'], 0, 1.2, -8, 0.36, { release: 0.45, loose: 0 });
    timp('Bb2', 0.5625, 0.5, -15, 0.34, { vel: 0.6, release: 0.2 });
    timp(['Eb2', 'Eb3'], 0.75, 0.9, -12, 0.36, { release: 0.3 });
    timp('Eb3', 1.5, 0.8, -11, 0.36, { vel: 0.85, release: 0.3 });
    hit('bassdrum', null, 1.5, 1.6, -18, 0.4, { vel: 0.6, release: 0.6, width: 0.2 });
    /* a snare with the first hits, never a roll: the crack a phone can hear, and the dotted rhythm made plain */
    [[0, -15, 0.9], [0.5625, -24, 0.5], [0.75, -17, 0.8], [1.5, -19, 0.7], [3, -15, 0.9], [3.75, -24, 0.5]].forEach(([at, level, vel]) => hit('snare', null, at, 0.7, level, 0.4, { vel, match: /Snare2-HitSN/, release: 0.25, pan: 0.12, width: 0.2, loose: at ? 2 : 0 }));

    /* the roll swells into the second hit */
    roll('Eb3', 1.56, 1.46, -16, 0.36, { release: 0.05, from: 1.0, to: 1.4, after: t => 0.16 + 0.84 * clamp(t / 1.4, 0, 1) ** 2.2 });
    I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.7, match: /crash1_mf/, seconds: 1.42, release: 0.03, pan: 0.26, width: 0.5 })), -11), 1.58, 1, { theatre: 0.34 });
    hit('bassdrum', null, 3, 2.6, -9, 0.42, { vel: 0.9, release: 1.2, width: 0.2 });
    timp(['Gb2', 'Gb3'], 3, 0.9, -9, 0.36, { release: 0.3 });
    hit('crash', null, 3, 3.3, -14, 0.34, { vel: 0.7, match: /crash1_mf/, release: 2.1, pan: 0.26, width: 0.5 });
    timp('Ab2', 3.75, 0.8, -13, 0.34, { vel: 0.7, release: 0.3 });
    timp('Bb2', 4.5, 0.8, -18, 0.32, { vel: 0.55, release: 0.3 });
    hit('bassdrum', null, 4.5, 1.4, -24, 0.4, { vel: 0.4, release: 0.5, width: 0.2 });
    timp('Bb2', 5.25, 0.56, -23, 0.32, { vel: 0.45, release: 0.2 });
    timp('Bb2', 5.8125, 0.2, -29, 0.3, { vel: 0.3, release: 0.08 });
    timp('Eb3', 6, 1.6, -24, 0.34, { vel: 0.35, release: 0.7 });
    hit('bassdrum', null, 6, 1.6, -30, 0.4, { vel: 0.25, release: 0.7, width: 0.2 });

    /* THE WEIGHT OF THE FIRST CHORD, staccato takes laid over the sustained ones, so it is full inside 30 ms */
    [['trumpet.stac', 'Eb5', -14, P.trumpet], ['trumpet.stac', 'Bb4', -15, P.trumpet], ['trumpet.stac', 'G4', -16, P.trumpet], ['horn.stac', 'Eb4', -14, P.horn], ['horn.stac', 'Bb3', -15, P.horn],
      ['trombone.stac', 'Eb3', -13, P.trombone], ['trombone.stac', 'Bb3', -13, P.trombone], ['tuba.stac', 'Eb2', -11, P.tuba], ['cellos.spic', 'Eb3', -15, P.cellos], ['violas.spic', 'G4', -17, P.violas], ['violins.spic', 'Eb5', -17, P.violins]]
      .forEach(([group, name, level, pan]) => hit(group, name, 0, 0.6, level, 0.3, { vel: 1, release: 0.2, pan, loose: 0 }));
    /* the low brass kick the motif's rhythm with the timpani */
    [[0.5625, -21, 0.75], [0.75, -15, 1]].forEach(([at, level, vel]) => {
      [['trombone.stac', 'Eb3', P.trombone], ['trombone.stac', 'Bb3', P.trombone], ['horn.stac', 'Bb3', P.horn], ['tuba.stac', 'Eb2', P.tuba]]
        .forEach(([group, name, pan]) => hit(group, name, at, 0.5, level, 0.3, { vel, release: 0.2, pan }));
    });
    [['trombone.stac', 'Eb3', -16, P.trombone], ['trombone.stac', 'Bb3', -15, P.trombone], ['horn.stac', 'Bb3', -17, P.horn], ['tuba.stac', 'Eb2', -14, P.tuba], ['trumpet.stac', 'Bb5', -15, P.trumpet]]
      .forEach(([group, name, level, pan]) => hit(group, name, 1.5, 0.5, level, 0.3, { vel: 1, release: 0.2, pan }));
    [['trombone.stac', 'Gb3', -13, P.trombone], ['trombone.stac', 'Bb3', -13, P.trombone], ['horn.stac', 'Db4', -14, P.horn], ['tuba.stac', 'Gb2', -12, P.tuba], ['violas.spic', 'Gb4', -18, P.violas]]
      .forEach(([group, name, level, pan]) => hit(group, name, 3, 0.5, level, 0.3, { vel: 1, release: 0.2, pan }));

    /* TRUMPETS a 3, the tune on top in triads. Levels fall from 3.75 s on: this is the diminuendo */
    const TRUMPETS = [
      /* top,  second, third,  at,     length, level, soft  */
      ['Eb5', 'Bb4', 'G4', 0, 0.6, -14, false],
      ['C5', 'Ab4', 'Eb4', 0.5625, 0.24, -16, false],
      ['G5', 'Eb5', 'Bb4', 0.75, 0.8, -14, false],
      ['Bb5', 'G5', 'Eb5', 1.5, 1.56, -11, false],
    ];
    TRUMPETS.forEach(([top, second, third, at, length, level]) => {
      const held = length > 1;
      sus('trumpet', top, at, held ? 2.34 : length, level, 0.24, { players: 3, vel: 1, skip: 0.03, release: 0.07, pan: P.trumpet, loose: at ? 5 : 0, bendOf: held ? sing(0.55, 13) : undefined, after: held ? ramp([[0, 1], [0.2, 0.9], [1.5, 1.04], [2.25, 1], [2.34, 0.8]]) : undefined, from: held ? 0.1 : undefined });
      sus('trumpet', second, at, length, level - 5, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.07, pan: P.trumpet + 0.06, loose: at ? 5 : 0 });
      sus('trumpet', third, at, length, level - 7, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.07, pan: P.trumpet - 0.06, loose: at ? 5 : 0 });
    });
    hit('trumpet.stac', 'G5', 0.75, 0.5, -16, 0.26, { vel: 1, release: 0.2, pan: P.trumpet });
    hit('trumpet.stac', 'C5', 0.5625, 0.3, -18, 0.26, { vel: 1, release: 0.14, pan: P.trumpet });
    /* under the held top, the chord changes to Gb */
    sus('trumpet', 'Gb5', 3, 0.84, -17, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.09, pan: P.trumpet + 0.06 });
    sus('trumpet', 'Db5', 3, 0.84, -19, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.09, pan: P.trumpet - 0.06 });
    /* cell 2 starts down, and the section thins */
    [
      ['Ab5', 'Eb5', 'C5', 3.75, 0.61, -13, 1],
      ['F5', 'C5', 'Ab4', 4.3125, 0.24, -16, 1],
      ['G5', 'Eb5', 'Bb4', 4.5, 0.86, -18, 0.4],
    ].forEach(([top, second, third, at, length, level, vel], k) => {
      const after = k === 2 ? ramp([[0, 1], [0.4, 0.72], [0.86, 0.1]]) : undefined;
      const tone = k === 2 ? 4200 : undefined;
      sus('trumpet', top, at, length, level, 0.3, { players: 3, vel, skip: 0.03, release: 0.08, pan: P.trumpet, after, tone });
      sus('trumpet', second, at, length, level - 5, 0.3, { players: 2, vel, skip: 0.03, release: 0.08, pan: P.trumpet + 0.06, after, tone });
      sus('trumpet', third, at, length, level - 7, 0.3, { players: 2, vel, skip: 0.03, release: 0.08, pan: P.trumpet - 0.06, after, tone });
    });

    /* VIOLINS on the tune, in unison and at the octave below. They speak late, so skip their soft start at the front of the chord, and enter early after it */
    [
      ['Eb5', 'Eb4', 0, 0.62, -21, { skip: 0.16, loose: 0 }],
      ['C5', 'C4', 0.5, 0.3, -24, { skip: 0.1 }],
      ['G5', 'G4', 0.65, 0.92, -21, { skip: 0.12 }],
      ['Bb5', 'Bb4', 1.4, 2.42, -19, { skip: 0.1, from: 0.2, to: 1.2, release: 0.12 }],
      ['Ab5', 'Ab4', 3.68, 0.7, -20, { skip: 0.08 }],
      ['F5', 'F4', 4.24, 0.3, -23, { skip: 0.08 }],
      ['G5', 'G4', 4.42, 0.95, -23, { skip: 0.1, vel: 0.6, tone: 5000, after: ramp([[0, 1], [0.5, 0.7], [0.95, 0.15]]) }],
    ].forEach(([high, low, at, length, level, o]) => {
      sus('violins', high, at, length, level, 0.42, { players: 3, vel: 1, release: 0.1, pan: P.violins, ...o });
      sus('violins', low, at, length, level - 4, 0.42, { players: 2, vel: 1, release: 0.1, pan: P.violins2, ...o });
    });

    /* HORNS. The first chord; then, under the held note, they answer cell 1 in octaves; then the chords; at 5.25 s they take the tune itself, an octave down */
    ['G3', 'Bb3', 'Eb4'].forEach(name => sus('horn', name, 0, 1.56, -18, 0.28, { players: 2, vel: 1, skip: 0.05, release: 0.1, pan: P.horn, loose: 0 }));
    [
      ['Eb3', 'Eb4', 1.5, 0.6, -15],
      ['C3', 'C4', 2.0625, 0.24, -17],
      ['G3', 'G4', 2.25, 0.8, -15],
      ['Bb3', 'Bb4', 3, 0.84, -15],
    ].forEach(([low, high, at, length, level]) => {
      sus('horn', low, at, length, level, 0.28, { players: 3, vel: 1, skip: 0.04, release: 0.08, pan: P.horn });
      sus('horn', high, at, length, level - 4, 0.28, { players: 2, vel: 1, skip: 0.04, release: 0.08, pan: P.horn + 0.05 });
    });
    ['Db4', 'Gb4'].forEach(name => sus('horn', name, 3, 0.84, -19, 0.28, { players: 2, vel: 1, skip: 0.03, release: 0.09, pan: P.horn }));
    ['Ab3', 'C4', 'Eb4'].forEach(name => sus('horn', name, 3.75, 0.84, -20, 0.3, { players: 2, vel: 0.85, skip: 0.03, release: 0.1, pan: P.horn }));
    ['G3', 'Bb3', 'Eb4'].forEach(name => sus('horn', name, 4.5, 0.84, -23, 0.34, { players: 2, vel: 0.55, release: 0.12, pan: P.horn, tone: 3200 }));
    sus('horn', 'Ab3', 5.25, 0.82, -29, 0.38, { players: 2, vel: 0.3, release: 0.12, pan: P.horn, tone: 2200 });
    sus('horn', 'F4', 5.25, 0.61, -17.5, 0.4, { players: 2, vel: 0.5, release: 0.08, pan: P.horn, tone: 3000 });
    sus('horn', 'D4', 5.8125, 0.24, -20, 0.4, { players: 2, vel: 0.45, release: 0.07, pan: P.horn, tone: 2800 });
    sus('horn', 'Eb4', 6, 2.1, -21, 0.45, { players: 2, vel: 0.35, release: 0.5, pan: P.horn, tone: t => 2600 - 700 * t, from: 0.1, to: 0.5, after: ramp([[0, 1], [0.5, 0.74], [1.3, 0.3], [2.1, 0]]) });
    ['G3', 'Bb3'].forEach(name => sus('horn', name, 6, 1.5, -33, 0.45, { players: 2, vel: 0.2, release: 0.5, pan: P.horn, tone: 1800, from: 0.1, to: 0.5, after: ramp([[0, 1], [0.8, 0.5], [1.5, 0]]) }));

    /* THE HARMONY under it, slice by slice, from the bottom */
    [
      { at: 0, len: 1.5, tuba: 'Eb2', bones: ['Eb3', 'Bb3'], basso: 'Eb2', celli: ['Eb2', 'Eb3'], violas: ['G4', 'Bb4'], dyn: 0, vel: 1 },
      { at: 1.5, len: 1.5, tuba: 'Eb2', bones: ['Eb3', 'Bb3'], basso: 'Eb2', celli: ['Eb2', 'Eb3'], violas: ['G4', 'Bb4'], dyn: 0, vel: 1, after: t => 0.8 + 0.3 * clamp(t / 1.5, 0, 1) },
      { at: 3, len: 0.75, tuba: 'Gb2', bones: ['Db3', 'Gb3', 'Bb3'], basso: 'Gb2', celli: ['Gb2', 'Gb3'], violas: ['Gb4', 'Bb4', 'Db5'], dyn: 1, vel: 1 },
      { at: 3.75, len: 0.75, tuba: 'Ab2', bones: ['Eb3', 'Ab3', 'C4'], basso: 'Ab2', celli: ['Ab2', 'Ab3'], violas: ['Ab4', 'C5'], dyn: -2, vel: 0.9 },
      { at: 4.5, len: 0.75, tuba: 'Bb1', bones: ['Bb2', 'Eb3', 'G3'], basso: 'Bb2', celli: ['Bb2', 'Bb3'], violas: ['G4', 'Bb4'], dyn: -5, vel: 0.6, tone: 4000 },
      { at: 5.25, len: 0.75, tuba: 'Bb1', bones: ['Bb2', 'F3', 'Ab3'], basso: 'Bb2', celli: ['Bb2', 'D3'], violas: ['D4', 'F4'], dyn: -10, vel: 0.4, tone: 2800 },
    ].forEach(({ at, len, tuba, bones, basso, celli, violas, dyn, vel, after, tone }, k) => {
      const first = k === 0;
      const brassAt = first ? 0 : at - 0.02; const stringAt = first ? 0 : at - 0.09;
      const loose = first ? 0 : 6;
      sus('tuba', tuba, brassAt, len + 0.14, -18 + dyn, 0.2, { vel, skip: first ? 0.06 : 0.02, release: 0.12, pan: P.tuba, loose, after, tone, players: 2, spreadPan: 0.05 });
      bones.forEach(name => sus('trombone', name, brassAt, len + 0.14, -18 + dyn, 0.26, { players: 2, vel, skip: first ? 0.06 : 0.02, release: 0.12, pan: P.trombone, loose, after, tone }));
      sus('bass', basso, stringAt, len + 0.22, -24 + dyn, 0.3, { vel: Math.max(vel, 0.5), skip: first ? 0.12 : 0.03, release: 0.14, pan: P.bass, loose, after, tone, from: 0.1, to: 0.6 });
      celli.forEach(name => sus('cellos', name, stringAt, len + 0.22, -21 + dyn, 0.36, { players: 2, vel: Math.max(vel, 0.5), skip: first ? 0.06 : 0.03, release: 0.14, pan: P.cellos, loose, after, tone }));
      violas.forEach(name => sus('violas', name, stringAt, len + 0.22, -24 + dyn, 0.4, { players: 2, vel: Math.max(vel, 0.5), skip: first ? 0.08 : 0.04, release: 0.14, pan: P.violas, loose, after, tone }));
    });

    /* THE HARP. Up through the held note, then pouring down the cadence */
    const GLISS = [51, 53, 55, 56, 58, 60, 62, 63, 65, 67, 68, 70, 72, 74, 75, 77, 79, 80, 82, 84, 86, 87, 89, 91, 92, 94];
    GLISS.forEach((midi, k) => {
      const u = k / (GLISS.length - 1);
      const at = 1.56 + 1.36 * u ** 1.12;
      /* only the top note, Bb, may ring on into Gb */
      hit('harp', midi, at, k === GLISS.length - 1 ? 1.6 : Math.min(0.7, 3.04 - at), -16 + 10 * u, 0.42, { vel: 0.5 + 0.5 * u, release: k === GLISS.length - 1 ? 0.3 : 0.1, cents: HARP, pan: -0.5 + 0.7 * u, width: 0.3, loose: 2 });
    });
    [['Ab5', 5.25], ['F5', 5.42], ['D5', 5.58], ['Bb4', 5.74], ['Ab4', 5.88], ['Eb4', 6.03], ['C4', 6.22], ['Bb3', 6.43], ['G3', 6.68], ['Eb3', 6.98]].forEach(([name, at], k) => {
      hit('harp', name, at, 1.9, -27 - k * 0.6, 0.5, { vel: 0.5, release: 0.7, cents: HARP, tone: 3400, pan: -0.15 - k * 0.03, width: 0.3, loose: 8 });
    });

    /* THE LANDING: warm strings, soft takes past their slow start, closing in tone as they fade */
    const fall = ramp([[0, 0.92], [0.5, 1], [1.5, 0.56], [2.2, 0.22], [2.8, 0]]);
    const closing = t => 3400 - 620 * t;
    hit('bass.pizz', 'Eb2', 6, 1.9, -19, 0.3, { vel: 0.6, release: 0.5, pan: P.bass, width: 0.2, tone: 1400 });
    sus('cellos', 'Eb3', 5.9, 2.8, -27, 0.42, { players: 2, vel: 0.2, skip: 0.45, attack: 0.1, release: 0.3, pan: P.cellos, tone: closing, from: 0.2, to: 0.8, after: fall });
    sus('violas', 'Bb3', 5.9, 2.8, -29, 0.42, { players: 2, vel: 0.2, skip: 0.45, attack: 0.1, release: 0.3, pan: P.violas, tone: closing, from: 0.2, to: 0.8, after: fall });
    sus('violas', 'Eb4', 5.9, 2.8, -29, 0.42, { players: 2, vel: 0.2, skip: 0.45, attack: 0.1, release: 0.3, pan: P.violas - 0.1, tone: closing, from: 0.2, to: 0.8, after: fall });
    sus('violins', 'G4', 5.9, 2.8, -29, 0.42, { players: 2, vel: 0.2, skip: 0.5, attack: 0.1, release: 0.3, pan: P.violins2, tone: closing, from: 0.2, to: 0.8, after: fall });
    sus('violins', 'C5', 6.7, 2.0, -33, 0.5, { players: 2, vel: 0.2, skip: 0.5, attack: 0.5, release: 0.3, pan: P.violins, tone: 2800, from: 0.6, to: 1.1, after: ramp([[0, 1], [0.8, 1], [1.5, 0.45], [2, 0]]) });

    return masterMix(mix, { peak: -2.5, soften: 1.3, comp: { threshold: -14, ratio: 2.5 }, fadeFrom: 7.9, fadeTo: 8.75 });
  };

  /* ── the loop ── */
  /* the shutter and the claw, 24 times a second: soft ticks of filtered noise, nothing but the world */
  const flutter = (rand, seconds) => {
    const n = N(seconds);
    const x = new Float32Array(n);
    for (let frame = 0; frame < Math.round(seconds * 24); frame += 1) {
      [[0, 1], [0.011, 0.42]].forEach(([offset, level]) => {
        const start = N(frame / 24 + offset + (rand() - 0.5) * 0.0014);
        const g = level * (0.5 + rand() * 0.9);
        for (let i = 0; i < N(0.007) && start + i < n; i += 1) x[start + i] += (rand() * 2 - 1) * g * Math.exp(-(i / SR) / 0.0017);
      });
    }
    return norm(sum(bp(x, 760, 1), gainOf(bp(x, 1500, 1.5), 0.45)));
  };

  const loop = rand => {
    const mix = new LoopMix(BAR * 8);
    const { sus, hit } = band(mix, rand, { theatre: 1 });
    /* the strings breathe together, in beats and dB: a rise through bars 2-3, a rise to the flute's top note in bar 6, and a small breath at the end of bar 1 where the seam can hide */
    const breath = ramp([[0, -1.5], [2, 0], [3.7, -3], [4.3, -0.5], [8, 1], [10, 1.5], [14, -0.5], [16, -1.5], [18, 0], [21, 2], [23, 2.5], [26, 0.5], [28, -1], [30, -2], [32, -1.5]]);
    const ARCO = [
      ['cellos', 0.3, -30, 2400, [['Eb3', 0, 4], ['C3', 4, 8], ['F3', 8, 12], ['D3', 12, 16], ['Eb3', 16, 18], ['D3', 18, 20], ['Eb3', 20, 30], ['D3', 30, 32]]],
      ['violas', -0.02, -33, 2800, [['Bb3', 0, 4], ['G3', 4, 8], ['Ab3', 8, 16], ['G3', 16, 20], ['Ab3', 20, 26], ['G3', 26, 30], ['Ab3', 30, 32]]],
      ['violas', -0.16, -33, 2800, [['Eb4', 0, 12], ['D4', 12, 14], ['Bb3', 14, 18], ['B3', 18, 20], ['C4', 20, 24], ['Cb4', 24, 26], ['Bb3', 26, 28], ['C4', 28, 30], ['D4', 30, 32]]],
      ['violins', -0.28, -33, 3000, [['G4', 0, 9.5], ['F4', 9.5, 14], ['D4', 14, 20], ['Eb4', 20, 30], ['F4', 30, 32]]],
      ['violins', -0.44, -30, 3200, [['C5', 0, 5.5], ['Bb4', 5.5, 9.5], ['Ab4', 9.5, 13], ['G4', 13, 14], ['F4', 14, 16], ['G4', 16, 18], ['F4', 18, 20], ['G4', 20, 24], ['F4', 24, 26], ['G4', 26, 28], ['F4', 28, 30], ['G4', 30, 32]]],
    ];
    ARCO.forEach(([group, pan, level, tone, part]) => part.forEach(([name, from, to]) => {
      const at = from * BEAT - 0.14;
      const seconds = (to - from) * BEAT + 0.14 + 0.42;
      sus(group, name, at, seconds, level, 0.42, {
        players: 2, vel: 0.2, skip: group === 'cellos' ? 0.35 : 0.5, attack: 0.3, release: 0.5, tone, pan, spreadCents: 5, spreadMs: 16, spreadPan: 0.14, loose: 12, from: 0.3, to: Math.min(1.4, seconds - 0.4),
        after: t => db(breath(((at + t) / BEAT + 32) % 32)),
      });
    }));

    /* bass pizzicato on 1 and 3, a cello an octave above it so a phone can hear the pulse */
    [['Eb2', 'Bb2'], ['C2', 'G2'], ['F2', 'C3'], ['Bb1', 'F2'], ['Eb2', 'G2'], ['Ab2', 'Eb2'], ['Ab2', 'G2'], ['F2', 'Bb1']].forEach(([one, three], bar) => {
      [[one, 0, -19], [three, 2, -22]].forEach(([name, beat, level]) => {
        const at = (bar * 4 + beat) * BEAT;
        hit('bass.pizz', name, at, 1.9, level, 0.3, { vel: 0.6, release: 0.5, pan: 0.04, width: 0.2, tone: 1300, loose: 9 });
        hit('cellos.pizz', m(name) + 12, at, 1.3, level - 8, 0.36, { vel: 0.3, release: 0.4, pan: 0.26, width: 0.2, tone: 1700, loose: 9 });
      });
    });

    /* the harp, on even bars only */
    [
      [[4.5, 'G3'], [5, 'C4'], [5.5, 'Eb4'], [6, 'G4'], [6.5, 'Bb4'], [7, 'D5']],
      [[12.5, 'F3'], [13, 'Bb3'], [13.5, 'D4'], [14, 'F4'], [14.5, 'Ab4'], [15, 'Bb4']],
      [[20.5, 'Ab3'], [21, 'C4'], [21.5, 'Eb4'], [22, 'G4'], [22.5, 'C5'], [23, 'Eb5']],
      [[28.5, 'C4'], [29, 'Eb4'], [29.5, 'A4'], [30, 'Ab4'], [30.5, 'F4'], [31, 'D4'], [31.5, 'Bb3']],
    ].forEach(figure => figure.forEach(([beat, name], k) => {
      const shape01 = Math.sin(Math.PI * (k + 0.5) / figure.length);
      hit('harp', name, beat * BEAT, 2.5, -29 + 4 * shape01, 0.5, { vel: 0.4, release: 0.9, cents: HARP, tone: 2400, pan: -0.5 + k * 0.05, width: 0.25, loose: 14 });
    }));

    /* the motif, once: flute, far away, at half speed. The phrase rises to Bb5 and relaxes */
    [
      ['Eb5', 16, 17.5, -29.5], ['C5', 17.5, 18, -30.5], ['G5', 18, 20, -29], ['Bb5', 20, 24, -27],
      ['Ab5', 24, 25.5, -28.5], ['F5', 25.5, 26, -30], ['G5', 26, 28.7, -31],
    ].forEach(([name, from, to, level], k) => {
      const seconds = (to - from) * BEAT + 0.12;
      const last = k === 6;
      sus('flute', name, from * BEAT - 0.05, seconds, level, 0.9, { legato: k > 0, release: last ? 0.8 : 0.1, attack: k ? 0 : 0.12, tone: 2800, pan: 0.14, width: 0.2, loose: 8, from: 0.08, to: Math.min(0.6, seconds), after: k === 3 ? ramp([[0, 0.86], [1.2, 1], [3.1, 0.92]]) : undefined });
    });

    /* one horn, an inner line */
    [
      ['G3', 4, 5.5, -32, false], ['Ab3', 5.5, 6, -33, true], ['Bb3', 6, 8, -31, true],
      ['C4', 8, 9.5, -30, false], ['Bb3', 9.5, 10, -32, true], ['C4', 10, 12, -30, true],
      ['D4', 12, 16, -28, true], ['Eb4', 16, 18.4, -30, true, ramp([[0, 1], [0.6, 0.62], [1.2, 0.34], [1.96, 0.1]])],
      ['Bb3', 26, 28, -33, false], ['A3', 28, 30, -32, true], ['Ab3', 30, 32, -32, true], ['G3', 32, 35, -33, true],
    ].forEach(([name, from, to, level, legato, after]) => {
      const seconds = (to - from) * BEAT + 0.16;
      sus('horn', name, from * BEAT - 0.06, seconds, level, 0.5, { vel: 0.15, legato, attack: legato ? 0 : 0.14, release: 0.22, tone: 1700, pan: -0.28, width: 0.2, loose: 10, from: 0.1, to: Math.min(0.9, seconds), after });
    });

    /* the projector */
    mix.add(flutter(rand, BAR * 8), 0, db(-24), 0.1, { theatre: 0.1 });

    return mix.fold({ peak: -13, comp: { threshold: -24, ratio: 2 } });
  };

  /* ── foley ── */
  /* A ticket tearing along its perforation: fibres letting go in a stumbling train, no two alike, and the holes giving way one by one. No pitch, no clock */
  const rip = (rand, seconds) => {
    const n = N(seconds);
    const grit = new Float32Array(n);
    let t = 0;
    while (t < seconds) {
      const rate = 500 + 1500 * Math.sin(Math.PI * Math.min(1, (t / seconds) * 1.1)) ** 0.7;
      t += (-Math.log(1 - rand()) / rate) * (rand() < 0.07 ? 3.5 : 1);
      const i = Math.floor(t * SR);
      if (i >= n) break;
      grit[i] += (rand() < 0.5 ? -1 : 1) * (0.1 + rand() ** 3.2);
    }
    let hole = 0.004;
    while (hole < seconds) {
      const i = Math.floor(hole * SR);
      if (i < n) grit[i] += (rand() < 0.5 ? -1 : 1) * (0.9 + rand() * 0.9);
      hole += (0.005 + rand() * 0.012);
    }
    const parts = [gainOf(norm(hp(grit, 2800)), 0.75), norm(bp(grit, 1300, 0.6)), gainOf(norm(bp(grit, 560, 0.8)), 0.7)];
    return norm(shape(drive(norm(sum(...parts)), 3), ramp([[0, 0.3], [0.006, 0.75], [seconds * 0.45, 1], [seconds * 0.88, 0.72], [seconds, 0.06]])));
  };
  /* the stub coming free */
  const pop = rand => {
    const body = impact(rand, { mass: 0.22, seconds: 0.13, click: 0.55, knock: 1, low: 0.22, knockBase: 640, knockTau: 0.011, lowHz: 210, lowTau: 0.018, hard: 0.8 });
    const air = pad(norm(bp(decay(white(N(0.03), rand), 0.006, 0.0003), 1900, 0.7)), 0.13);
    return norm(sum(body, gainOf(air, 0.5)));
  };
  /* a knife switch: the lever, the blow, the contacts settling. Every one its own */
  const breaker = (mix, rand, at, mass, level, pan) => {
    const room = { theatre: 0.34 };
    mix.add(impact(rand, { mass: 0.4, seconds: 0.2, click: 1, knock: 0.6, low: 0, knockBase: 500 + rand() * 120, knockTau: 0.02 }), at - 0.03 - rand() * 0.01, level * 0.3, pan - 0.05, room);
    mix.add(impact(rand, { mass, seconds: 0.75, click: 0.7, knock: 1, low: 0.7, knockBase: 225 + rand() * 30, knockTau: 0.06, lowHz: 68, lowTau: 0.12, ringing: 0.1, ringBase: 610 + rand() * 80, ringTau: 0.11 }), at, level, pan, room);
    mix.add(relay(rand, 0.12, 1), at + 0.034 + rand() * 0.012, level * 0.14, pan + 0.06, room);
  };

  return {
    sounds: {
      music: theme({ pack: 'cinema', period: BAR * 8, entry: BAR * 2, earliest: 8.8, loopIn: [6, 8.4], bitrate: 75000, intro, loop }),

      /* The stub is under tension for 80 ms and comes free at 130 ms, when the page jolts (pk-cine-fall, pk-cine-jolt): the rip runs up to it and the pop lands on it. The player raises the rate tear by tear */
      tap: {
        seconds: 0.3, peak: -16, fadeFrom: 0.24, fadeTo: 0.3, bitrate: 72000,
        build(mix, rand) {
          mix.add(rip(rand, 0.125), 0, 1, -0.06, { theatre: 0.05 });
          mix.add(pop(rand), 0.128, 0.8, 0.05, { theatre: 0.09 });
        },
      },

      /*
       * The eighth tear, on the page's clock: the rip and the pop (0.13 s, the jolt); the curtain goes up 0.22-1.77 s; the hem lights at 0.9 s, the screen at 1.05 s; the page lands at 1.7 s.
       * So: three breakers before the lights come on, a harp and a timpani roll up with the curtain, and the brass "ta-DAA" lands with the page at 1.7 s, on the theme's high note.
       */
      final: {
        seconds: 3.5, peak: -5, soften: 1.3, fadeFrom: 2.8, fadeTo: 3.45, bitrate: 72000,
        build(mix, rand) {
          const { sus, hit, timp, roll } = band(mix, rand, { theatre: 1 });
          mix.add(rip(rand, 0.125), 0, 0.55, -0.06, { theatre: 0.08 });
          mix.add(pop(rand), 0.13, 0.42, 0.05, { theatre: 0.12 });
          breaker(mix, rand, 0.2, 1.15, 0.6, -0.18);
          breaker(mix, rand, 0.5, 1.35, 0.72, 0.14);
          breaker(mix, rand, 0.83, 1.75, 0.88, -0.04);

          /* up with the curtain */
          roll('Eb3', 0.9, 0.82, -20, 0.34, { release: 0.03, from: 0.5, to: 0.8, after: t => 0.14 + 0.86 * clamp(t / 0.8, 0, 1) ** 2 });
          I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.6, match: /crash1_mf/, seconds: 0.8, release: 0.03, pan: 0.26, width: 0.5 })), -20), 0.9, 1, { theatre: 0.3 });
          [58, 60, 62, 63, 65, 67, 68, 70, 72, 74, 75, 77, 79, 80, 82, 84, 86, 87, 89, 91, 92, 94].forEach((midi, k, all) => {
            const u = k / (all.length - 1);
            hit('harp', midi, 0.96 + 0.68 * u ** 1.1, 1.4, -27 + 9 * u, 0.42, { vel: 0.6, release: 0.5, cents: HARP, pan: -0.5 + 0.7 * u, width: 0.3, loose: 2 });
          });

          /* ta: Bb7, short */
          const TA = 1.5; const DAA = 1.7;
          [['trumpet.stac', 'Ab5', -14, 0.16], ['trumpet.stac', 'F5', -16, 0.22], ['trumpet.stac', 'D5', -18, 0.1], ['horn.stac', 'D4', -17, -0.3], ['trombone.stac', 'F3', -15, 0.24], ['trombone.stac', 'Ab3', -16, 0.24], ['tuba.stac', 'Bb2', -15, 0.06]]
            .forEach(([group, name, level, pan]) => hit(group, name, TA, 0.3, level, 0.28, { vel: 1, release: 0.1, pan }));
          timp('Bb2', TA, 0.3, -17, 0.32, { vel: 0.7, release: 0.1 });

          /* DAA: Eb, the top note the theme's own Bb5, in the overtone voicing, timpani, bass drum and cymbal under it */
          const hold = 1.65;
          const down = ramp([[0, 1], [0.5, 0.92], [1, 0.5], [1.5, 0.12], [hold, 0]]);
          const brass = { skip: 0.04, release: 0.2, vel: 1, after: down };
          sus('trumpet', 'Bb5', DAA, hold, -13, 0.3, { ...brass, players: 3, pan: 0.16, bend: t => -22 * Math.exp(-t / 0.03) });
          sus('trumpet', 'G5', DAA, hold, -18, 0.3, { ...brass, players: 2, pan: 0.22 });
          sus('trumpet', 'Eb5', DAA, hold, -20, 0.3, { ...brass, players: 2, pan: 0.1 });
          ['Bb3', 'Eb4', 'G4'].forEach(name => sus('horn', name, DAA, hold, -18, 0.32, { ...brass, players: 2, pan: -0.3 }));
          ['Eb3', 'Bb3'].forEach(name => sus('trombone', name, DAA, hold, -17, 0.3, { ...brass, players: 2, pan: 0.24 }));
          sus('tuba', 'Eb2', DAA, hold, -17, 0.24, { ...brass, players: 2, pan: 0.06, spreadPan: 0.05 });
          [['violins', 'Bb5', -22, -0.44], ['violins', 'G4', -25, -0.26], ['violas', 'Eb4', -25, -0.08], ['cellos', 'Eb3', -22, 0.3]].forEach(([group, name, level, pan]) => sus(group, name, DAA - 0.08, hold + 0.08, level, 0.42, { players: 2, vel: 1, skip: 0.1, release: 0.2, pan, after: down }));
          [['trumpet.stac', 'Bb5', -15, 0.16], ['horn.stac', 'Eb4', -16, -0.3], ['trombone.stac', 'Eb3', -14, 0.24], ['tuba.stac', 'Eb2', -13, 0.06]].forEach(([group, name, level, pan]) => hit(group, name, DAA, 0.5, level, 0.3, { vel: 1, release: 0.2, pan, loose: 2 }));
          timp(['Eb2', 'Eb3'], DAA, 1.5, -9, 0.36, { release: 0.6, loose: 0 });
          hit('bassdrum', null, DAA, 1.75, -9, 0.42, { vel: 0.9, release: 0.7, width: 0.2, loose: 0 });
          hit('crash', null, DAA, 1.76, -13, 0.34, { vel: 0.8, match: /crash1_ff/, release: 1.2, pan: 0.26, width: 0.5, loose: 0 });
        },
      },

      /* A conductor's punch through the ticket on the press, and one small bell with the page's done state at 190 ms */
      notify: {
        seconds: 1, peak: -10, soften: 1.2, fadeFrom: 0.8, fadeTo: 0.98, bitrate: 72000,
        build(mix, rand) {
          const room = { theatre: 0.16 };
          mix.add(impact(rand, { mass: 0.32, seconds: 0.18, click: 1, knock: 0.85, low: 0.08, knockBase: 860, knockTau: 0.013, ringing: 0.2, ringBase: 2300, ringTau: 0.028, hard: 1.2 }), 0, 0.62, -0.04, room);
          mix.add(rip(rand, 0.012), 0.012, 0.22, 0, room);
          mix.add(impact(rand, { mass: 0.14, seconds: 0.09, click: 0.8, knock: 0.7, low: 0, knockBase: 1450, knockTau: 0.008 }), 0.062, 0.22, 0.05, room);
          const { hit } = band(mix, rand, { theatre: 1 });
          hit('glock', 'Bb6', 0.19, 0.8, -7, 0.42, { release: 0.45, cents: GLOCK, pan: 0.08, width: 0.25, tone: 6000, loose: 0 });
          hit('triangle', null, 0.19, 0.78, -19, 0.42, { vel: 0.6, match: /Triangle3-HitM_v2/, release: 0.35, pan: 0.14, width: 0.25, loose: 0 });
        },
      },

      /* A soft wooden seat tick */
      click: {
        seconds: 0.085, peak: -19, fadeFrom: 0.05, fadeTo: 0.085, bitrate: 64000,
        build(mix, rand) {
          mix.add(impact(rand, { mass: 0.2, seconds: 0.085, click: 0.22, knock: 1, low: 0, knockBase: 690, knockTau: 0.011, hard: 0.5 }), 0, 1, 0, { theatre: 0.04 });
        },
      },
    },
    preview: rendered => themePreview({
      pack: 'cinema', rendered, seconds: 70,
      taps: [1, 2, 3, 4, 5, 6, 7].map(n => ({ at: 26 + (n - 1) * 2.5, rate: 1 + n * 0.016 })),
      final: { at: 44, restoreAfter: 2.5 }, notifyAt: 60, clickAt: 66,
    }),
  };
};
