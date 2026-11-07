/*
 * THE FOLLY: "Reel Nine". A director's doomed masterpiece: huge, dark, gorgeous, slightly mad. A hybrid film score.
 *
 * C minor. 90 BPM, 4/4, an 8/3 s bar (a beat is 2/3 s, an eighth 1/3 s). soundstage.
 *
 * THE MOTIF. Five notes that overreach: every leap is bigger than the last (a fourth, a fifth, a major sixth), and after each it falls back a little before trying again.
 *     G4 (8th)  C5 (quarter, on the off-beat)  Ab4 (8th)  Eb5 (quarter, on the beat)  C6 (long, the high note)
 *     sol do' . la♭ mi♭' . do''. Short-long, short-long, LONG. Say it: da-DAAH, da-DAAH, DAAAAAAAH.
 *     The long notes alone spell do, me, do'. No repeated notes, no triplets, no do-sol-do, no compound time: nothing shared with Zarathustra, the Valkyries, Pirates or the Dark Knight's two notes.
 *
 * THE OSTINATO is the motif's own bones: a low note, then an inner G that rocks to Ab and back under a still Eb, in 3+3+2.
 *     C3 G3 Eb4 . C3 Ab3 Eb4 . C3 G3. Cellos have the low notes, violas the rest. Only the low note and a semitone ever move, so it can hold tension at a whisper.
 *
 * THE HARMONY is a chain of falling thirds, each chord keeping its top note: C minor, A minor, F, F minor, D-flat, then down by semitones into C minor. C is in nearly every chord, so the high note never quite leaves.
 *
 * INTRO. 3 bars, landing on the loop's first chord at 8 s.
 *   bar 1  0.00  C (open fifth, no third), everything at once: boom, braam, tuba, trombones, cellos, bass, low piano, bass drum, timpani double stop, gong, crash. Top of the chord is the motif's G.
 *                Trumpets a 3 and horns in unison, a second horn group an octave below, climb the motif. The low brass drop away at once (sfp) and swell through the bar: violins.trem above, the ostinato loud in cellos.spic and violas.spic under.
 *          2.00  Trumpets reach C6 (MIDI 84), violins on it too: the top of everything, held to 4.5 s. Timpani roll and a reversed cymbal swell.
 *   bar 2  2.63  THE BREATH. Everything stops dead on the bar line, where the ear wants the blow. C6 hangs alone.
 *          3.00  THE SECOND HIT, an eighth late, on the off-beat as the motif's long notes are, and on A MINOR, a third away: the floor drops to A1 and the held C6 turns from root into a third. Boom, braam, all the brass, gong, crash.
 *          3.33  Horns take the motif, a minor third down: E4 A4 . F4 C5, in octaves. Timpani pulse on 3.67, 4.67. On C5 the floor falls another third, to F major (4.67). The trumpets let go.
 *   bar 3  5.33  F minor (A falls to Ab). Fewer horns, softer, a major third down again: C4 F4 . Db4 Ab4, tone closing. Timpani 5.33, 6.33, 7.33, thinning.
 *          6.33  D-flat, on the horn's Db. The strings thin out and the horn's Ab sinks away; by 7.5 s the ostinato is alone, at a whisper.
 *          8.00  C minor, all voices down a step (Db C, F Eb, Ab G): a horn's last G4, soft strings. The loop has come up underneath.
 *
 * LOOP. 8 bars, 21.3 s: the calm before the storm. All under 2.4 kHz, its substance 200-520 Hz. Bars 7-8 are the intro's bars 2-3 at a whisper, so the two meet exactly.
 *   bar  chord         ostinato low   strings above the ostinato, a far C5 over all of it     cello line (two players)       one horn, far away
 *   1    Cm            C3             C5 . G4 . Eb4                                           Eb4 (from bar 8), then rest, G3
 *   2    Abmaj7        Ab2            C5 . Ab4 . Eb4                                          C4 . Eb4
 *   3    Fm9           F2             C5 . Ab4 . F4                                           Ab4 . G4 (the top of the line)
 *   4    Gm11          G2 (D4 for Eb) C5 . G4 . F4                                            F4 . Eb4 D4
 *   5    Cm            C3             C5 . G4 . Eb4                                           Eb4, dying                     G3 C4 . Ab3
 *   6    Cm            C3             C5 . G4 . Eb4                                                                          Eb4 . C5 (the motif once, at half speed)
 *   7    Am > F        (gap) A2 .. F2 C5 . A4 . E4 > F4  (Am arrives an eighth late)          E4 . F4                        C5 still held
 *   8    Fm > Db       F2 > Db3       C5 . Ab4 . F4                                           Ab4 . F4 (to Eb4 of bar 1)
 *   Timpani heartbeat, pp, once a bar: the motif's short-long on the chord's fifth and root. Far back, a relay counter ticking over, three or four small flurries: the budget still counting.
 *
 * EFFECTS: see the recipes at the end, each against the page's own clock.
 */

export default kit => {
  const { I, Mix, LoopMix, theme, themePreview, masterMix, N, ramp, impact, relay, ring, burst, white, bp, lp, hp, filter, shape, decay, norm, gainOf, sum, pad, drive, wander, db, gauss, clamp, TAU, SR } = kit;
  const BEAT = 2 / 3; const BAR = BEAT * 4; const E = BEAT / 2;
  const { m, atRms, atPeak, band, GLOCK } = I;
  /* a place in the score: bar and eighth, both from zero */
  const at = (bar, eighth = 0) => (bar * 8 + eighth) * E;

  /* the ostinato, bar by bar. Null is a rest. The last two are the intro's bars 2 and 3, and the loop's bars 7 and 8 */
  const OST_CM = ['C3', 'G3', 'Eb4', 'C3', 'Ab3', 'Eb4', 'C3', 'G3'];
  const OST_AB = ['Ab2', 'G3', 'Eb4', 'Ab2', 'Ab3', 'Eb4', 'Ab2', 'G3'];
  const OST_FM = ['F2', 'G3', 'Eb4', 'F2', 'Ab3', 'Eb4', 'F2', 'G3'];
  const OST_G = ['G2', 'G3', 'D4', 'G2', 'Ab3', 'D4', 'G2', 'G3'];
  const OST_AM_F = [null, 'A2', 'E4', 'A2', 'A3', 'E4', 'F2', 'G3'];
  const OST_FM_DB = ['F2', 'G3', 'Eb4', 'Db3', 'Ab3', 'Eb4', 'Db3', 'F3'];
  const spicOf = (name, k) => (k % 3 === 0 || m(name) < 48 ? 'cellos.spic' : 'violas.spic');

  /* ── the intro ── */
  const intro = rand => {
    const mix = new Mix(10);
    const { sus, hit, timp, roll } = band(mix, rand, { soundstage: 1, hall: 0.15 });
    const P = { trumpet: 0.14, horn: -0.3, trombone: 0.24, tuba: 0.05, violins: -0.44, violins2: -0.24, violas: -0.06, cellos: 0.3, bass: 0.08 };
    const HIT2 = 3;
    const CUT = 2.635;

    /* THE FIRST INSTANT. The synth is there for weight only: the ear follows the brass and the drums */
    I.play(mix, atPeak(I.boom(rand, { hertz: 65.4, seconds: 2.6, tau: 0.6, knock: 0.9, knockBase: 210 }), -9.5), 0, 1, { soundstage: 0.1 });
    I.play(mix, atRms(I.braam(rand, m('C3'), 1.6, { open: 0.09, peak: 2600, rest: 420, width: 0.7 }), -21, 0.02, 0.5), 0, 1, { soundstage: 0.25 });
    hit('bassdrum', null, 0, 2.4, -7, 0.42, { vel: 1, release: 1, loose: 0, width: 0.2 });
    hit('gong', null, 0, 5.5, -13, 0.35, { vel: 1, match: /gongHit_fff/, release: 2.2, width: 0.5, loose: 0, after: ramp([[0, 1], [1.5, 0.8], [2.6, 0.42], [2.72, 0.18], [5.5, 0.06]]) });
    hit('crash', null, 0, 2.62, -13, 0.34, { vel: 1, match: /crash1_ff/, release: 1.5, pan: 0.26, width: 0.5, loose: 0 });
    timp(['C3', 'G2'], 0, 1, -8, 0.36, { release: 0.4, loose: 0 });
    hit('piano', 'C2', 0, 1.8, -13, 0.3, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
    hit('piano', 'C1', 0, 1.8, -14, 0.3, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
    /* staccato takes over the sustained ones, so that the first chord is full inside 30 ms */
    [['trumpet.stac', 'G4', -13, P.trumpet], ['horn.stac', 'G4', -14, P.horn], ['horn.stac', 'C4', -14, P.horn], ['horn.stac', 'G3', -14, P.horn], ['trombone.stac', 'C3', -12, P.trombone], ['trombone.stac', 'G3', -12, P.trombone], ['tuba.stac', 'C2', -11, P.tuba],
      ['cellos.spic', 'C3', -14, P.cellos], ['cellos.spic', 'C2', -15, P.cellos], ['bass.pizz', 'C2', -13, P.bass], ['violas.spic', 'C4', -17, P.violas], ['violins.spic', 'G5', -17, P.violins], ['violins.spic', 'G4', -18, P.violins2]]
      .forEach(([group, name, level, pan]) => hit(group, name, 0, 0.55, level, 0.3, { vel: 1, release: 0.2, pan, loose: 0 }));

    /* THE LOW BRASS AND LOW STRINGS, an open fifth: struck, dropped at once, swelling up to the cut */
    const sfpCresc = ramp([[0, 1.15], [0.28, 0.66], [0.8, 0.46], [1.9, 0.62], [2.45, 1.05], [CUT, 1.2]]);
    const low = { release: 0.018, after: sfpCresc, from: 0.05, to: 0.5, loose: 0 };
    sus('tuba', 'C2', 0, CUT, -16, 0.2, { ...low, players: 2, vel: 1, skip: 0.06, pan: P.tuba, spreadPan: 0.05 });
    ['C3', 'G3', 'C4'].forEach(name => sus('trombone', name, 0, CUT, -16.5, 0.26, { ...low, players: 2, vel: 1, skip: 0.06, pan: P.trombone }));
    ['C2', 'C3'].forEach(name => sus('cellos', name, 0, CUT, -20, 0.36, { ...low, players: 2, vel: 1, skip: 0.06, pan: P.cellos }));
    sus('bass', 'C2', 0, CUT, -22, 0.3, { ...low, vel: 1, skip: 0.1, pan: P.bass });

    /* THE MOTIF. Trumpets a 3, horns in unison, more horns an octave below. The low brass and drums kick its rhythm */
    [
      ['G4', 'G3', 0, 1, -16],
      ['C5', 'C4', 1, 2, -13.5],
      ['Ab4', 'Ab3', 3, 1, -15.5],
      ['Eb5', 'Eb4', 4, 2, -12.5],
    ].forEach(([high, octaveDown, eighth, length, level]) => {
      const start = at(0, eighth); const seconds = length * E + 0.03;
      const o = { vel: 1, skip: 0.03, release: 0.05, loose: eighth ? 5 : 0 };
      sus('trumpet', high, start, seconds, level, 0.24, { ...o, players: 3, pan: P.trumpet });
      sus('horn', high, start, seconds, level - 1, 0.28, { ...o, players: 3, pan: P.horn, skip: 0.04 });
      sus('horn', octaveDown, start, seconds, level - 3, 0.28, { ...o, players: 2, pan: P.horn + 0.08, skip: 0.04 });
    });
    [
      [1, -19, 0.9], [3, -24, 0.6], [4, -18, 1], [6, -14, 1],
    ].forEach(([eighth, level, vel]) => {
      [['trombone.stac', 'C3', P.trombone], ['trombone.stac', 'G3', P.trombone], ['tuba.stac', 'C2', P.tuba], ['horn.stac', 'G3', P.horn]]
        .forEach(([group, name, pan]) => hit(group, name, at(0, eighth), 0.42, level, 0.3, { vel, release: 0.16, pan }));
    });
    timp('C3', at(0, 1), 0.6, -15, 0.34, { vel: 0.85, release: 0.25 });
    timp('G2', at(0, 3), 0.34, -20, 0.32, { vel: 0.6, release: 0.14 });
    timp('C3', at(0, 4), 0.62, -14, 0.34, { vel: 0.9, release: 0.25 });
    hit('bassdrum', null, at(0, 4), 0.9, -21, 0.4, { vel: 0.5, release: 0.4, width: 0.2 });

    /* THE HIGH NOTE, the top of everything. It arrives on beat 4, hangs alone through the breath, and the world changes under it */
    hit('trumpet.stac', 'C6', at(0, 6), 0.4, -13, 0.26, { vel: 1, release: 0.16, pan: P.trumpet });
    /* in the breath the held note draws back and swells into the blow: the hole is real, and the hit lands harder */
    sus('trumpet', 'C6', at(0, 6), 2.5, -10.5, 0.24, { players: 3, vel: 1, skip: 0.03, release: 0.12, pan: P.trumpet, from: 0.1, to: 0.6, after: ramp([[0, 0.96], [0.3, 1], [0.6, 1.04], [0.74, 0.46], [0.97, 0.74], [1, 1.1], [1.7, 1], [2.05, 0.68], [2.4, 0.2], [2.5, 0]]), bendOf: () => t => -24 * Math.exp(-t / 0.035) });
    sus('horn', 'C5', at(0, 6), CUT - 2, -14, 0.28, { players: 3, vel: 1, skip: 0.04, release: 0.018, pan: P.horn });
    sus('horn', 'G4', at(0, 6), CUT - 2, -19, 0.28, { players: 2, vel: 1, skip: 0.04, release: 0.018, pan: P.horn + 0.08 });
    const strung = ramp([[0, 0.9], [0.7, 1], [0.84, 0.42], [1.07, 0.66], [1.1, 1.05], [2.2, 0.6], [2.9, 0.08]]);
    sus('violins', 'C6', 1.9, 2.9, -19, 0.42, { players: 3, vel: 1, skip: 0.1, release: 0.2, pan: P.violins, from: 0.2, to: 0.7, after: strung });
    sus('violins', 'C5', 1.9, 2.9, -23, 0.42, { players: 2, vel: 1, skip: 0.1, release: 0.2, pan: P.violins2, from: 0.2, to: 0.7, after: strung });
    /* what swells into the cut */
    roll('C3', at(0, 6), CUT - 2, -19, 0.36, { release: 0.015, from: 0.3, to: 0.6, after: t => 0.25 + 0.85 * clamp(t / 0.6, 0, 1) ** 2 });
    hit('bassdrum', null, at(0, 6), 0.64, -17, 0.4, { vel: 0.7, release: 0.3, width: 0.2 });
    I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.7, match: /crash1_mf/, seconds: 0.62, release: 0.03, pan: 0.26, width: 0.5 })), -15), CUT - 0.62, 1, { soundstage: 0.24 });

    /* THE SECOND HIT. A minor, the floor a third lower, the top note the same. It lands in a hole, an eighth after the bar line */
    I.play(mix, atPeak(I.boom(rand, { hertz: 55, seconds: 3.2, tau: 0.8, knock: 1, knockBase: 185 }), -8), HIT2, 1, { soundstage: 0.12 });
    I.play(mix, atRms(I.braam(rand, m('A2'), 2.5, { open: 0.07, peak: 3000, rest: 460, width: 0.8 }), -20, 0.02, 0.6), HIT2, 1, { soundstage: 0.25 });
    hit('bassdrum', null, HIT2, 2.6, -5.5, 0.42, { vel: 1, release: 1.1, width: 0.2, loose: 0 });
    hit('gong', null, HIT2, 4.4, -15, 0.35, { vel: 0.8, match: /gongHit_f\./, release: 2, width: 0.5, loose: 0 });
    hit('crash', null, HIT2, 3.4, -12, 0.34, { vel: 1, match: /crash1_ff/, release: 2.2, pan: 0.26, width: 0.5, loose: 0 });
    timp(['A2', 'E3'], HIT2, 1.1, -7, 0.36, { release: 0.4, loose: 0 });
    hit('piano', 'A1', HIT2, 1.8, -12.5, 0.3, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
    hit('piano', 'A2', HIT2, 1.8, -14, 0.3, { vel: 1, release: 0.9, width: 0.2, loose: 0 });
    [['trumpet.stac', 'A5', -14, P.trumpet], ['trumpet.stac', 'E5', -15, P.trumpet], ['horn.stac', 'A4', -14, P.horn], ['horn.stac', 'E4', -14, P.horn], ['horn.stac', 'A3', -14, P.horn],
      ['trombone.stac', 'A2', -12, P.trombone], ['trombone.stac', 'E3', -12, P.trombone], ['trombone.stac', 'A3', -13, P.trombone], ['tuba.stac', 'A2', -11, P.tuba],
      ['cellos.spic', 'A2', -14, P.cellos], ['cellos.spic', 'A3', -15, P.cellos], ['bass.pizz', 'A1', -13, P.bass], ['violas.spic', 'C5', -17, P.violas], ['violins.spic', 'A5', -17, P.violins], ['violins.spic', 'E5', -18, P.violins2]]
      .forEach(([group, name, level, pan]) => hit(group, name, HIT2, 0.55, level, 0.3, { vel: 1, release: 0.2, pan, loose: 0 }));
    const fp = ramp([[0, 1.1], [0.24, 0.72], [0.6, 0.48], [1.5, 0.34], [1.72, 0.2]]);
    const chord = { after: fp, release: 0.12, from: 0.05, to: 0.5, loose: 0 };
    sus('tuba', 'A1', HIT2, 1.72, -15, 0.2, { ...chord, players: 2, vel: 1, skip: 0.05, pan: P.tuba, spreadPan: 0.05 });
    ['A2', 'E3', 'A3', 'C4'].forEach(name => sus('trombone', name, HIT2, 1.72, -16, 0.26, { ...chord, players: 2, vel: 1, skip: 0.05, pan: P.trombone }));
    ['A2', 'A3'].forEach(name => sus('cellos', name, HIT2, 1.75, -18, 0.36, { ...chord, players: 2, vel: 1, skip: 0.06, pan: P.cellos }));
    sus('bass', 'A1', HIT2, 1.75, -20, 0.3, { ...chord, vel: 1, skip: 0.1, pan: P.bass });
    ['A4', 'C5'].forEach(name => sus('violas', name, HIT2, 1.75, -22, 0.4, { ...chord, players: 2, vel: 1, skip: 0.08, pan: P.violas }));
    sus('trumpet', 'A5', HIT2, 1.02, -15, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.12, pan: P.trumpet + 0.06, loose: 0, after: ramp([[0, 1.1], [0.3, 0.74], [1.02, 0.2]]) });
    sus('trumpet', 'E5', HIT2, 1.02, -17, 0.24, { players: 2, vel: 1, skip: 0.03, release: 0.12, pan: P.trumpet - 0.06, loose: 0, after: ramp([[0, 1.1], [0.3, 0.74], [1.02, 0.2]]) });

    /* VIOLINS TREMOLO, cold and high under the brass, thinning with everything else */
    const TREM = [
      /* notes, at, seconds, level, vel, tone, after */
      [['C5', 'Eb5'], 0, CUT, -26, 1, null, ramp([[0, 0.8], [0.6, 0.72], [2, 0.96], [CUT, 1.3]])],
      [['G5'], 0, 2.02, -26, 1, null, ramp([[0, 0.8], [0.6, 0.72], [1.9, 0.9], [2.02, 0]])],
      [['C5', 'E5', 'A5'], HIT2, 1.72, -22, 1, null, ramp([[0, 1.1], [0.5, 0.8], [1.5, 0.55], [1.72, 0.45]])],
      [['C5', 'F5', 'A4'], at(1, 6) - 0.04, 0.78, -29, 0.8, 5200, ramp([[0, 1], [0.7, 0.72]])],
      [['C5', 'Ab4'], at(2, 0) - 0.08, 1.1, -33, 0.3, 3200, ramp([[0, 1], [1.1, 0.7]])],
      [['F4', 'Ab4'], at(2, 3) - 0.1, 1.05, -38, 0.3, 2400, ramp([[0, 1], [0.6, 0.6], [1.05, 0]])],
    ];
    TREM.forEach(([names, start, seconds, level, vel, tone, after]) => names.forEach((name, k) => {
      sus('violins.trem', name, start, seconds, level, 0.42, { players: 2, vel, skip: 0.06, release: 0.08, tone: tone ?? undefined, pan: k % 2 ? P.violins2 : P.violins, loose: start ? 8 : 0, after, from: 0.1, to: Math.min(0.7, seconds) });
    }));

    /* THE OSTINATO. Loud under the climb, stopped dead by the breath, then shrinking into the loop's own */
    OST_CM.forEach((name, k) => {
      if (k === 0) return;
      const up = k / 8;
      const low = spicOf(name, k) === 'cellos.spic';
      hit(spicOf(name, k), name, at(0, k), k === 7 ? 0.29 : 0.42, (low ? -16 : -18.5) + up * 3, 0.32, { vel: 1, release: k === 7 ? 0.06 : 0.16, pan: low ? P.cellos : P.violas, width: 0.3, loose: k === 7 ? 0 : 5 });
      if (low) hit('cellos.spic', m(name) - 12, at(0, k), 0.42, -20 + up * 3, 0.3, { vel: 1, release: 0.16, pan: P.cellos, width: 0.3, loose: 5 });
    });
    OST_AM_F.forEach((name, k) => {
      if (!name || k < 2) return;
      const low = spicOf(name, k) === 'cellos.spic';
      hit(spicOf(name, k), name, at(1, k), 0.42, (low ? -17.5 : -20.5) - (k - 2) * 0.55, 0.34, { vel: 1, release: 0.16, pan: low ? P.cellos : P.violas, width: 0.3, loose: 6 });
    });
    OST_FM_DB.forEach((name, k) => {
      const low = spicOf(name, k) === 'cellos.spic';
      const down = k / 7;
      const vel = k < 3 ? 1 : 0.25;
      hit(spicOf(name, k), name, at(2, k), 0.46, (low ? -22 : -25) - down * 8.5, 0.42, { vel, release: 0.18, tone: 3600 - 1900 * down, pan: low ? 0.26 : -0.02, width: 0.28, loose: 8 });
    });

    /* HORNS. The motif falls by thirds, an exact transposition each time: E4 A4 . F4 C5 in octaves, then C4 F4 . Db4 Ab4, softer, and its Ab sinks to G at the landing */
    [
      ['E4', 'E3', at(1, 2), 0.36, -18.5],
      ['A4', 'A3', at(1, 3), 0.69, -14.5],
      ['F4', 'F3', at(1, 5), 0.36, -18.5],
      ['C5', 'C4', at(1, 6), 0.72, -15.5, ramp([[0, 1], [0.5, 0.82], [0.72, 0.5]])],
    ].forEach(([high, octaveDown, start, seconds, level, after]) => {
      const o = { vel: 1, skip: 0.04, release: 0.07, after, from: 0.04, to: Math.min(0.5, seconds) };
      sus('horn', high, start, seconds, level, 0.3, { ...o, players: 3, pan: P.horn });
      sus('horn', octaveDown, start, seconds, level - 3, 0.3, { ...o, players: 2, pan: P.horn + 0.08 });
    });
    [
      ['C4', at(2, 0), 0.36, -24.5, 0.55, 3000],
      ['F4', at(2, 1), 0.69, -21, 0.55, 2900],
      ['Db4', at(2, 3), 0.36, -25.5, 0.4, 2600],
      ['Ab4', at(2, 4), 1.4, -22.5, 0.4, 2400, ramp([[0, 1], [0.45, 0.82], [0.85, 0.38], [1.4, 0.04]])],
    ].forEach(([name, start, seconds, level, vel, tone, after]) => {
      sus('horn', name, start, seconds, level, 0.42, { players: 2, vel, skip: 0.04, release: 0.1, tone, pan: P.horn + 0.04, after, from: 0.04, to: Math.min(0.5, seconds) });
    });
    sus('horn', 'G4', at(3) - 0.04, 0.9, -32, 0.5, { vel: 0.15, attack: 0.1, release: 0.4, tone: 1700, pan: P.horn, after: ramp([[0, 1], [0.5, 0.6], [0.9, 0.1]]) });

    /* THE HARMONY coming down, slice by slice */
    [
      { from: at(1, 6), len: 0.68, tuba: 'F2', bones: ['F3', 'A3', 'C4'], basso: 'F2', celli: ['F2', 'F3'], violas: ['A4', 'C5'], level: -24.5, vel: 0.6, tone: 3200 },
      { from: at(2, 0), len: 1.0, bones: ['F3', 'Ab3', 'C4'], basso: 'F2', celli: ['F3'], violas: ['Ab3', 'C4'], level: -30.5, vel: 0.35, tone: 2100 },
    ].forEach(({ from, len, tuba, bones, basso, celli, violas, level, vel, tone }) => {
      const o = { vel, tone, release: 0.12, skip: 0.03, from: 0.05, to: Math.min(0.5, len) };
      if (tuba) sus('tuba', tuba, from - 0.02, len + 0.12, level, 0.2, { ...o, players: 2, pan: P.tuba, spreadPan: 0.05 });
      bones.forEach(name => sus('trombone', name, from - 0.02, len + 0.12, level, 0.3, { ...o, players: 2, pan: P.trombone }));
      sus('bass', basso, from - 0.08, len + 0.2, level + 1, 0.3, { ...o, vel: Math.max(vel, 0.5), pan: P.bass });
      celli.forEach(name => sus('cellos', name, from - 0.08, len + 0.2, level + 2, 0.36, { ...o, players: 2, vel: Math.max(vel, 0.5), pan: P.cellos }));
      violas.forEach(name => sus('violas', name, from - 0.08, len + 0.2, level + 1, 0.42, { ...o, players: 2, vel: Math.max(vel, 0.5), pan: P.violas }));
    });
    const dying = ramp([[0, 0.9], [0.4, 1], [1.2, 0.7], [1.75, 0.3]]);
    const soft = { players: 2, vel: 0.2, skip: 0.42, attack: 0.1, release: 0.2, from: 0.2, to: 0.8, after: dying };
    sus('cellos', 'Db3', at(2, 3) - 0.1, 1.85, -29, 0.42, { ...soft, tone: 2000, pan: P.cellos });
    sus('bass', 'Db2', at(2, 3) - 0.1, 1.85, -32, 0.34, { ...soft, players: 1, tone: 1100, pan: P.bass });
    sus('violas', 'F3', at(2, 3) - 0.1, 1.85, -33, 0.42, { ...soft, tone: 2200, pan: P.violas });
    sus('violas', 'Ab3', at(2, 3) - 0.1, 1.85, -33, 0.42, { ...soft, tone: 2200, pan: P.violas - 0.1 });
    const landing = { ...soft, after: ramp([[0, 0.9], [0.3, 1], [0.9, 0.3], [1, 0.05]]) };
    sus('cellos', 'C3', at(3) - 0.1, 1, -33, 0.42, { ...landing, tone: 1800, pan: P.cellos });
    sus('violas', 'G3', at(3) - 0.1, 1, -37, 0.42, { ...landing, tone: 2000, pan: P.violas });
    sus('violas', 'Eb4', at(3) - 0.1, 1, -37, 0.42, { ...landing, tone: 2000, pan: P.violas - 0.1 });

    /* THE PULSE, thinning: the gaps grow, and it is only a heartbeat by the end */
    [
      ['A2', at(1, 3), -15, 0.7, 0.6], ['F2', at(1, 6), -16, 0.7, 0.7], ['F2', at(2, 0), -21, 0.5, 0.7], ['Db3', at(2, 3), -25, 0.3, 0.9], ['Db3', at(2, 6), -32, 0.2, 1],
    ].forEach(([name, start, level, vel, seconds]) => timp(name, start, seconds, level, 0.34, { vel, release: 0.3, tone: vel < 0.4 ? 1200 : undefined }));
    hit('bassdrum', null, at(1, 6), 1.2, -20, 0.4, { vel: 0.5, release: 0.5, width: 0.2 });
    hit('bassdrum', null, at(2, 3), 1.2, -28, 0.4, { vel: 0.3, release: 0.5, width: 0.2 });

    return masterMix(mix, { peak: -2.5, soften: 1.3, comp: { threshold: -14, ratio: 2.5 }, fadeFrom: 8.1, fadeTo: 8.9 });
  };

  /* ── the loop ── */
  const loop = rand => {
    const mix = new LoopMix(BAR * 8);
    const { sus, hit, timp } = band(mix, rand, { soundstage: 1 });
    /* everything breathes together, in beats and dB: a small breath in bar 1 where the seam hides, a rise to the cello's top note in bar 3, the highest point under the horn's C5 at the end of bar 6, down through bar 8 */
    const breath = ramp([[0, -0.5], [1.5, -2.5], [3, -2], [5, -0.5], [8, 0.8], [10, 1.2], [13, -0.5], [16, -1], [20, 0.2], [22, 1.2], [24, 1], [24.5, 0.2], [27, 0.5], [29, -0.5], [32, -0.5]]);
    const dbAt = beat => breath(((beat % 32) + 32) % 32);

    /* the ostinato */
    [OST_CM, OST_AB, OST_FM, OST_G, OST_CM, OST_CM, OST_AM_F, OST_FM_DB].forEach((notes, bar) => notes.forEach((name, k) => {
      if (!name) return;
      const beat = bar * 4 + k / 2;
      const group = spicOf(name, k);
      const low = group === 'cellos.spic';
      /* the 3+3+2 lives in the level; the violas' top note leans a little on the bar's second group */
      const shaped = low ? [-20.5, 0, 0, -22, 0, 0, -21.5, 0][k] || -21.5 : [0, -26, -25, 0, -25.5, -24.5, 0, -26.5][k];
      hit(group, name, bar * BAR + k * E, 0.5, shaped + dbAt(beat) + gauss(rand) * 0.5, 0.5, { vel: 0.25, release: 0.2, tone: low ? 1500 : 1800, pan: low ? 0.26 : -0.04, width: 0.25, loose: 9 });
    }));

    /* the strings' slow chords, under and around it, with a far C5 that never leaves. Bar 7's A minor comes an eighth late, as the second hit did */
    const ARCO = [
      ['violins', -0.42, -39.5, 2200, [['C5', 0, 8], ['C5', 8, 16], ['C5', 16, 24], ['C5', 24, 32]]],
      ['violins', -0.24, -39.5, 2300, [['G4', 0, 4], ['Ab4', 4, 12], ['G4', 12, 24.5], ['A4', 24.5, 28], ['Ab4', 28, 32]]],
      ['violas', -0.06, -38.5, 2300, [['Eb4', 0, 8], ['F4', 8, 16], ['Eb4', 16, 24.5], ['E4', 24.5, 27], ['F4', 27, 32]]],
      ['cellos', 0.22, -38.5, 1500, [['C3', 0, 4], ['Ab2', 4, 8], ['F2', 8, 12], ['G2', 12, 16], ['C3', 16, 24.5], ['A2', 24.5, 27], ['F2', 27, 29.5], ['Db3', 29.5, 32]]],
      ['bass', 0.06, -40, 900, [['C2', 0, 4], ['Ab1', 4, 8], ['F1', 8, 12], ['G1', 12, 16], ['C2', 16, 24.5], ['A1', 24.5, 27], ['F1', 27, 29.5], ['Db2', 29.5, 32]]],
    ];
    ARCO.forEach(([group, pan, level, tone, part]) => part.forEach(([name, from, to]) => {
      const start = from * BEAT - 0.14;
      const seconds = (to - from) * BEAT + 0.14 + 0.42;
      sus(group, name, start, seconds, level, 0.5, {
        players: group === 'bass' ? 1 : 2, vel: 0.2, skip: group === 'cellos' || group === 'bass' ? 0.35 : 0.5, attack: 0.3, release: 0.5, tone, pan, spreadCents: 5, spreadMs: 16, spreadPan: 0.14, loose: 12, from: 0.3, to: Math.min(1.4, seconds - 0.4),
        after: t => db(dbAt((start + t) / BEAT)),
      });
    }));

    /* the long warm cello line. It rises out of the motif's G and C to Ab4 in bar 3 and gives way to the horn; in bar 7 it comes back, under the horn's held C5, and walks down into bar 1 */
    [
      ['Eb4', 0, 1.3, -33], ['G3', 3, 4, -31.5], ['C4', 4, 6, -30.5], ['Eb4', 6, 8, -29.5],
      ['Ab4', 8, 11, -28], ['G4', 11, 12, -29.5], ['F4', 12, 14, -30], ['Eb4', 14, 15, -31], ['D4', 15, 16, -31.5], ['Eb4', 16, 17.4, -33],
      ['E4', 24.5, 27, -32], ['F4', 27, 28, -31], ['Ab4', 28, 29.5, -29.5], ['F4', 29.5, 32, -31],
    ].forEach(([name, from, to, level]) => {
      const start = from * BEAT - 0.1;
      const seconds = (to - from) * BEAT + 0.1 + 0.26;
      sus('cellos', name, start, seconds, level, 0.46, { players: 2, vel: 0.3, skip: 0.38, attack: 0.18, release: 0.28, tone: 2000, pan: 0.3, spreadPan: 0.1, spreadCents: 4, spreadMs: 14, loose: 10, from: 0.25, to: Math.min(1.2, seconds - 0.2) });
    });

    /* the motif, once: one horn, far away, at half speed, and C5 hangs over the chord that changes under it */
    [
      ['G3', 16, 17, -31.5], ['C4', 17, 19, -29.5], ['Ab3', 19, 20, -31.5], ['Eb4', 20, 22, -28.5], ['C5', 22, 29.2, -27],
    ].forEach(([name, from, to, level], k) => {
      const seconds = (to - from) * BEAT + 0.14;
      const last = k === 4;
      sus('horn', name, from * BEAT - 0.05, seconds, level, 0.85, { vel: 0.15, legato: k > 0, attack: k ? 0.05 : 0.12, release: last ? 0.9 : 0.1, tone: 1500, pan: -0.28, width: 0.2, loose: 9, from: 0.08, to: Math.min(0.8, seconds), after: last ? ramp([[0, 0.82], [1, 1], [3, 0.96], [4, 0.66], [seconds, 0.1]]) : undefined });
    });

    /* the heartbeat, pp, once a bar: the motif's short-long on the chord's fifth and root. In bar 7 only the root, and late */
    [['G2', 'C3', 0], ['Eb3', 'Ab2', 4], ['C3', 'F2', 8], ['D3', 'G2', 12], ['G2', 'C3', 16], ['G2', 'C3', 20], [null, 'A2', 24.5], ['C3', 'F2', 28]].forEach(([pickup, root, beat]) => {
      if (pickup) timp(pickup, (beat - 0.5) * BEAT, 0.7, -31 + dbAt(beat), 0.5, { vel: 0.2, tone: 800, release: 0.3, loose: 8 });
      timp(root, beat * BEAT, 1.5, -25 + dbAt(beat), 0.5, { vel: 0.2, tone: 900, release: 0.6, loose: 8 });
    });

    /* far back, a counter ticking over: the budget still counting. A few stumbling flurries, slowing, never in time with the strings */
    [[5.3, 5], [13.4, 7], [21.7, 4], [27.2, 6]].forEach(([beat, count]) => {
      let t = beat * BEAT;
      for (let k = 0; k < count; k += 1) {
        mix.add(lp(relay(rand, 0.06, 1.25 + rand() * 0.35), 2100), t, db(-37) * (1 - k / (count + 1)) * (0.65 + rand() * 0.5), 0.34, { soundstage: 0.7 });
        t += (0.045 + k * 0.016) * (0.75 + rand() * 0.5);
      }
    });

    return mix.fold({ peak: -13, comp: { threshold: -24, ratio: 2 } });
  };

  /* ── foley ── */
  /* The arm coming down: air, faster and faster, up to the slam */
  const armFall = (rand, seconds) => norm(shape(filter(white(N(seconds), rand), 'bp', t => 420 + 2600 * (t / seconds) ** 2.4, 0.9), t => (t / seconds) ** 2.6 * Math.min(1, (seconds - t) / 0.004)));
  /* Two hardwood sticks, the board under them, the hinge pin rattling, and the arm bouncing once (CSS: down again 98 ms later). Every clap its own */
  const clap = (mix, rand, slam, level, room) => {
    mix.add(impact(rand, { mass: 0.26, seconds: 0.14, click: 1, knock: 1, low: 0, knockBase: 980 + rand() * 180, knockTau: 0.0085, hard: 1.6 }), slam, level, -0.02, room);
    mix.add(impact(rand, { mass: 0.62, seconds: 0.2, click: 0.25, knock: 1, low: 0.25, knockBase: 410 + rand() * 60, knockTau: 0.02, lowHz: 190, lowTau: 0.03, hard: 0.9 }), slam + 0.0006, level * 0.72, 0.03, room);
    mix.add(relay(rand, 0.06, 0.62 + rand() * 0.1), slam + 0.009 + rand() * 0.003, level * 0.11, 0.14, room);
    mix.add(impact(rand, { mass: 0.2, seconds: 0.08, click: 0.7, knock: 1, low: 0, knockBase: 1180 + rand() * 180, knockTau: 0.006, hard: 1.1 }), slam + 0.098, level * 0.2, -0.01, room);
  };
  /* The LED's digits racing after the slam. The page updates them every 40 ms and eases out over 460 ms, so the ticks thin as the number slows. No two alike, none on time */
  const rattle = (mix, rand, from, seconds, level, room) => {
    let t = 0.004;
    while (t < seconds) {
      const u = t / seconds;
      mix.add(lp(relay(rand, 0.024, 0.46 + rand() * 0.24), 6200), from + t, level * (1 - u) ** 1.25 * (0.5 + rand() * 0.8), (rand() - 0.5) * 0.26, room);
      t += (0.02 + 0.05 * u) * (0.7 + rand() * 0.75);
    }
  };
  /* Mains-locked arcing, noise all the way down: it only passes on the mains' peaks, and sparks fly off it. gainOf(t) is the load */
  const arcing = (rand, seconds, load) => {
    const n = N(seconds);
    const air = sum(norm(bp(white(n, rand), 1250, 0.7)), gainOf(norm(bp(white(n, rand), 340, 1.1)), 0.95), gainOf(norm(hp(white(n, rand), 3800)), 0.3));
    const drift = wander(seconds + 1, 3, rand);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      x[i] = air[i] * (0.14 + Math.abs(Math.sin(TAU * 50 * t + 2.4 * drift(t))) ** 5) * load(t);
    }
    let t = 0.01;
    while (t < seconds) {
      const l = load(t);
      const spark = ring(burst(rand, 0.8, 7000, 0.03), rand, { base: 1100 + rand() * 1500, count: 7, tau: 0.004, tilt: 0.3 });
      const k = N(t);
      for (let i = 0; i < spark.length && k + i < n; i += 1) x[k + i] += spark[i] * l * (0.2 + rand() * 0.5);
      t += (0.008 + rand() * rand() * 0.11) / (0.3 + l);
    }
    return norm(drive(norm(x), 1.7));
  };
  /* Chalk catching on slate: a small train of grains, no pitch */
  const chalk = (rand, seconds) => {
    const n = N(seconds);
    const grit = new Float32Array(n);
    let t = 0;
    while (t < seconds) {
      t += -Math.log(1 - rand()) / (1500 + 900 * rand());
      const i = Math.floor(t * SR);
      if (i < n) grit[i] += (rand() < 0.5 ? -1 : 1) * (0.1 + rand() ** 3);
    }
    return norm(shape(norm(sum(norm(hp(grit, 3200)), gainOf(norm(bp(grit, 1500, 0.8)), 0.8))), ramp([[0, 0.4], [0.006, 1], [seconds * 0.7, 0.7], [seconds, 0]])));
  };

  /* The page's clock: tap at 0, the arm lands at 125 ms and impact() runs; the eighth tap's flood is 420 ms after that, the rest rolls in at 1000 ms */
  const SLAM = 0.125;

  return {
    sounds: {
      music: theme({ pack: 'folly', period: BAR * 8, entry: BAR * 3, earliest: 9, loopIn: [6.7, 8.6], bitrate: 80000, intro, loop }),

      /* The arm falls from the tap, the crack lands with it at 125 ms (CSS pk-folly-slam: 14.9% of .84 s), and the digits rattle quietly while the budget races */
      tap: {
        seconds: 0.62, peak: -13, soften: 1.2, fadeFrom: 0.54, fadeTo: 0.62, bitrate: 64000,
        build(mix, rand) {
          const room = { soundstage: 0.06 };
          mix.add(armFall(rand, SLAM), 0, 0.045, 0, {});
          clap(mix, rand, SLAM, 1, room);
          rattle(mix, rand, SLAM + 0.012, 0.46, 0.085, room);
        },
      },

      /*
       * The eighth tap, on the page's clock: the arm lands at 125 ms, the LED shows nothing but eights and the rig takes the load, flashes at 176 and 346 ms; at 545 ms the LED floods (the page thuds): the biggest hit in the pack, C minor, the theme's C6 on top;
       * at 1125 ms the rest rolls in, on the theme's own surprise: the floor drops to A minor under the same C6.
       */
      final: {
        seconds: 3.5, peak: -5, soften: 1.3, fadeFrom: 2.8, fadeTo: 3.45, bitrate: 72000,
        build(mix, rand) {
          const { sus, hit, timp } = band(mix, rand, { soundstage: 1 });
          const room = { soundstage: 0.12 };
          const FLOOD = SLAM + 0.42; const ROLL = SLAM + 1;
          const T = 0.14; const H = -0.3; const B = 0.24;
          mix.add(armFall(rand, SLAM), 0, 0.03, 0, {});
          clap(mix, rand, SLAM, 0.5, room);

          /* the overload: arcing that climbs to the flood, bursts on it and dies away; the flashes are two big sparks */
          mix.add(arcing(rand, 1.9, ramp([[0, 0.1], [0.05, 0.22], [0.24, 0.4], [0.38, 0.85], [0.42, 1], [0.47, 0.8], [0.9, 0.24], [1.5, 0.05], [1.9, 0]])), SLAM + 0.01, 0.34, 0.08, { soundstage: 0.2 });
          [[SLAM + 0.051, 0.3], [SLAM + 0.221, 0.42]].forEach(([when, level]) => mix.add(relay(rand, 0.09, 0.8), when, level, -0.1, room));
          rattle(mix, rand, SLAM + 0.012, 0.4, 0.06, room);
          I.play(mix, atPeak(I.reversed(I.hit(rand, 'crash', { vel: 0.7, match: /crash1_mf/, seconds: 0.3, release: 0.02, pan: 0.26, width: 0.5 })), -17), FLOOD - 0.3, 1, { soundstage: 0.2 });

          /* C minor: everything */
          I.play(mix, atPeak(I.boom(rand, { hertz: 65.4, seconds: 1.6, tau: 0.55, knock: 1, knockBase: 200 }), -8), FLOOD, 1, { soundstage: 0.1 });
          I.play(mix, atRms(I.braam(rand, m('C3'), 0.8, { open: 0.05, peak: 2600, rest: 500, width: 0.7 }), -22, 0.02, 0.4), FLOOD, 1, { soundstage: 0.2 });
          hit('bassdrum', null, FLOOD, 1.5, -6, 0.42, { vel: 1, release: 0.7, width: 0.2, loose: 0 });
          hit('gong', null, FLOOD, 2.9, -14, 0.35, { vel: 1, match: /gongHit_fff/, release: 1.6, width: 0.5, loose: 0 });
          hit('crash', null, FLOOD, 0.62, -11.5, 0.34, { vel: 1, match: /crash1_ff/, release: 0.1, pan: 0.26, width: 0.5, loose: 0 });
          timp(['C3', 'G2'], FLOOD, 0.58, -7.5, 0.36, { release: 0.1, loose: 0 });
          [['trumpet.stac', 'C6', -13, T], ['trumpet.stac', 'G5', -14, T], ['horn.stac', 'G4', -14, H], ['horn.stac', 'C4', -14, H], ['trombone.stac', 'C3', -12, B], ['trombone.stac', 'G3', -12, B], ['tuba.stac', 'C2', -11, 0.05], ['cellos.spic', 'C3', -15, 0.3], ['violins.spic', 'G5', -18, -0.4]]
            .forEach(([group, name, level, pan]) => hit(group, name, FLOOD, 0.5, level, 0.3, { vel: 1, release: 0.14, pan, loose: 0 }));
          const short = { vel: 1, skip: 0.05, release: 0.04, from: 0.04, to: 0.4, loose: 0, after: ramp([[0, 1.1], [0.2, 0.7], [0.5, 0.85], [0.56, 1]]) };
          ['C3', 'G3', 'C4'].forEach(name => sus('trombone', name, FLOOD, 0.56, -15, 0.28, { ...short, players: 2, pan: B }));
          sus('tuba', 'C2', FLOOD, 0.56, -15, 0.2, { ...short, players: 2, pan: 0.05, spreadPan: 0.05 });
          ['G4', 'C5'].forEach(name => sus('horn', name, FLOOD, 0.56, -16, 0.3, { ...short, players: 2, pan: H }));

          /* the high note, held across both */
          sus('trumpet', 'C6', FLOOD, 2.25, -11.5, 0.3, { players: 3, vel: 1, skip: 0.03, release: 0.3, pan: T, from: 0.08, to: 0.8, loose: 0, after: ramp([[0, 1], [0.58, 1.05], [1.1, 0.9], [1.7, 0.42], [2.25, 0]]), bendOf: () => t => -22 * Math.exp(-t / 0.03) });
          sus('violins', 'C6', FLOOD - 0.08, 2.3, -21, 0.42, { players: 2, vel: 1, skip: 0.1, release: 0.3, pan: -0.42, from: 0.15, to: 0.8, after: ramp([[0, 1], [1.2, 0.8], [1.8, 0.35], [2.3, 0]]) });

          /* A minor: the floor a third lower */
          const down = ramp([[0, 1.1], [0.3, 0.82], [0.9, 0.56], [1.5, 0.2], [2, 0]]);
          I.play(mix, atPeak(I.boom(rand, { hertz: 55, seconds: 2.2, tau: 0.75, knock: 1, knockBase: 185 }), -11), ROLL, 1, { soundstage: 0.12 });
          I.play(mix, atRms(I.braam(rand, m('A2'), 1.7, { open: 0.05, peak: 2800, rest: 460, width: 0.8 }), -21, 0.02, 0.5), ROLL, 1, { soundstage: 0.22 });
          hit('bassdrum', null, ROLL, 2.1, -9.5, 0.42, { vel: 1, release: 1, width: 0.2, loose: 0 });
          hit('crash', null, ROLL, 2.3, -13.5, 0.34, { vel: 1, match: /crash1_ff/, release: 1.5, pan: 0.26, width: 0.5, loose: 0 });
          timp(['A2', 'E3'], ROLL, 1.3, -10, 0.36, { release: 0.6, loose: 0 });
          [['trumpet.stac', 'A5', -14, T], ['trumpet.stac', 'E5', -15, T], ['horn.stac', 'A4', -14, H], ['horn.stac', 'E4', -14, H], ['trombone.stac', 'A2', -12, B], ['trombone.stac', 'E3', -12, B], ['tuba.stac', 'A2', -11, 0.05], ['cellos.spic', 'A2', -15, 0.3], ['violins.spic', 'A5', -18, -0.4], ['bass.pizz', 'A1', -14, 0.08]]
            .forEach(([group, name, level, pan]) => hit(group, name, ROLL, 0.5, level, 0.3, { vel: 1, release: 0.14, pan, loose: 0 }));
          const held = { vel: 1, skip: 0.04, release: 0.2, from: 0.04, to: 0.5, loose: 0, after: down };
          ['A2', 'E3', 'A3', 'C4'].forEach(name => sus('trombone', name, ROLL, 2, -17, 0.3, { ...held, players: 2, pan: B }));
          sus('tuba', 'A1', ROLL, 2, -16, 0.22, { ...held, players: 2, pan: 0.05, spreadPan: 0.05 });
          ['A3', 'E4', 'A4'].forEach(name => sus('horn', name, ROLL, 2, -18, 0.3, { ...held, players: 2, pan: H }));
          ['A5', 'E5'].forEach(name => sus('trumpet', name, ROLL, 1.2, -18, 0.28, { ...held, players: 2, pan: T + 0.06 }));
          ['A2', 'A3'].forEach(name => sus('cellos', name, ROLL - 0.04, 2.04, -20, 0.38, { ...held, skip: 0.06, players: 2, pan: 0.3 }));
          ['E5', 'A5'].forEach(name => sus('violins.trem', name, ROLL, 1.8, -24, 0.42, { ...held, skip: 0.06, players: 2, pan: -0.34 }));
        },
      },

      /* A chalk tick on the slate, a quick stroke after it, and with the done state at 160 ms a small studio bell on the theme's C: a glock's C7 over a soft tubular C5 */
      notify: {
        seconds: 1, peak: -10, soften: 1.2, fadeFrom: 0.8, fadeTo: 0.98, bitrate: 64000,
        build(mix, rand) {
          const room = { soundstage: 0.08 };
          mix.add(impact(rand, { mass: 0.14, seconds: 0.09, click: 0.8, knock: 0.85, low: 0, knockBase: 1050, knockTau: 0.006, hard: 0.8 }), 0, 0.42, -0.04, room);
          mix.add(chalk(rand, 0.075), 0.006, 0.34, -0.02, room);
          mix.add(chalk(rand, 0.05), 0.092, 0.2, 0.03, room);
          const { hit } = band(mix, rand, { soundstage: 1 });
          hit('glock', 'C7', 0.16, 0.82, -7, 0.34, { release: 0.45, cents: GLOCK, pan: 0.08, width: 0.2, tone: 7000, loose: 0 });
          hit('tubular', 'C5', 0.16, 0.82, -16, 0.34, { vel: 0.6, release: 0.45, pan: 0.1, width: 0.2, tone: 5000, loose: 0 });
        },
      },

      /* A tiny wood tick, the slate's corner */
      click: {
        seconds: 0.085, peak: -19, fadeFrom: 0.05, fadeTo: 0.085, bitrate: 64000,
        build(mix, rand) {
          mix.add(impact(rand, { mass: 0.14, seconds: 0.085, click: 0.4, knock: 1, low: 0, knockBase: 1040, knockTau: 0.0075, hard: 0.8 }), 0, 1, 0, { soundstage: 0.02 });
        },
      },
    },
    preview: rendered => themePreview({
      pack: 'folly', rendered, seconds: 70,
      taps: [1, 2, 3, 4, 5, 6, 7].map(n => ({ at: 26 + (n - 1) * 2.5, rate: 1 + n * 0.016 })),
      final: { at: 44, restoreAfter: 2.2 }, notifyAt: 60, clickAt: 66,
    }),
  };
};
