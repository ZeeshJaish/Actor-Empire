/**
 * EMPIRE+ v2 — THE TWO CINEMATICS
 *
 * Governing rule: BEFORE the wizard nothing has an identity; AFTER it,
 * everything does. So MachineWakesUp runs entirely in neutral system cyan
 * (no name, no mark, no colour — the player hasn't chosen yet) and Activation
 * is drenched in the brand they just created.
 *
 * Every step dramatised here is a real step in launching a streaming service:
 * escrow, trademark, CDN capacity, transcode pipeline, music performance
 * rights, data-protection agreements, subscription billing — then DRM
 * certification (Widevine / PlayReady / FairPlay) and per-device certification.
 * Nothing broadcast: no channels, no frequencies, no broadcast licence.
 *
 * Both are skippable, replayable, and only display already-committed state.
 */
import css from './presentation/screens/Cinematics/Cinematics.module.css';
import { cx } from './presentation/cx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';
import { PlaceholderAvatar } from './StreamingWallExperience';


const Counter: React.FC<{ to: number; ms: number }> = ({ to, ms }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const s = Date.now();
    const iv = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - s) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) window.clearInterval(iv);
    }, 40);
    return () => window.clearInterval(iv);
  }, [to, ms]);
  return <>{v.toLocaleString()}</>;
};

/* ============================================================
   BEFORE THE WIZARD — "THE FOUNDING"
   One continuous shot: a desk under a lamp. Your application goes
   across it, page by page, and every step is a real piece of paper.
   ============================================================ */

/** Beat controller.
 *  Tap once  → the current beat completes instantly and HOLDS its finished frame.
 *  Tap again → advance. So an impatient player still sees every composition.
 *  The final beat never auto-advances — it waits on its button. */
function useScene(durations: number[], holdMs: number, onDone: () => void) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const done = useRef(false);
  const last = durations.length - 1;

  const finishAll = useCallback(() => {
    if (!done.current) { done.current = true; onDone(); }
  }, [onDone]);

  const advance = useCallback(() => {
    setI(prev => {
      if (prev >= last) { finishAll(); return prev; }
      setHeld(false);
      return prev + 1;
    });
  }, [last, finishAll]);

  /* play → hold */
  useEffect(() => {
    if (held) return;
    const t = window.setTimeout(() => setHeld(true), durations[i]);
    return () => window.clearTimeout(t);
  }, [i, held]); // eslint-disable-line

  /* hold → next (except on the last beat, which waits for the player) */
  useEffect(() => {
    if (!held || i >= last) return;
    const t = window.setTimeout(advance, holdMs);
    return () => window.clearTimeout(t);
  }, [held, i, last, holdMs, advance]);

  /* A tap completes the current beat, then advances. On the LAST beat it only
     completes — entering the wizard has to be the player's own deliberate
     action on the button, not something a stray tap does for them. */
  const tap = useCallback(() => {
    if (!held) setHeld(true);
    else if (i < last) advance();
  }, [held, i, last, advance]);
  return { i, held, tap, advance, finishAll };
}

/** the six filings, each drawn as the document it actually is */
type Filing = { id: string; head: string; sub: string; stamp: string; body: React.ReactNode };
const FILINGS: Filing[] = [
  {
    id: 'tm', head: 'TRADEMARK APPLICATION', sub: 'Class 41 · Entertainment services', stamp: 'FILED',
    body: (
      <div className={css.fbox}>
        <span className={css.fboxlab}>WORDMARK</span>
        <div className={css.fblank}>[ awaiting name ]</div>
      </div>
    ),
  },
  {
    id: 'cdn', head: 'CDN CAPACITY CONTRACT', sub: 'Edge delivery · committed use', stamp: 'COMMITTED',
    body: (
      <>
        <div className={css.frack}>{Array.from({ length: 14 }).map((_, i) =>
          <i key={i} style={{ height: `${34 + ((i * 37) % 62)}%` }} />)}</div>
        <div className={css.frow}><span>PEAK EGRESS</span><b>2.4 Tbps</b></div>
        <div className={css.frow}><span>EDGE REGIONS</span><b>14</b></div>
      </>
    ),
  },
  {
    id: 'enc', head: 'ENCODING PIPELINE', sub: 'Adaptive bitrate ladder', stamp: 'PROVISIONED',
    body: (
      <table className={css.ftab}>
        <tbody>
          {[['2160p', 'HEVC', '16.0 Mbps'], ['1080p', 'H.264', '5.8 Mbps'],
            ['720p', 'H.264', '3.0 Mbps'], ['480p', 'H.264', '1.2 Mbps']].map(r => (
              <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>
            ))}
        </tbody>
      </table>
    ),
  },
  {
    id: 'mus', head: 'BLANKET MUSIC LICENCE', sub: 'ASCAP · BMI · performance rights', stamp: 'EXECUTED',
    body: (
      <>
        <p className={css.flegal}>Licensor grants a non-exclusive right to publicly perform, by means of
          on-demand streaming, any and all musical works in the repertory, in synchronisation with
          audiovisual programming distributed by the Licensee.</p>
        <div className={css.frow}><span>REPERTORY</span><b>24.1M works</b></div>
        <div className={css.frow}><span>TERRITORY</span><b>Worldwide</b></div>
        <div className={css.frow}><span>TERM</span><b>3 yr · auto-renew</b></div>
        <div className={css.frow}><span>ROYALTY</span><b>Per-stream</b></div>
        <div className={css.fsigrow}>
          <div className={css.fsig}><b className={css.fink}>A. Whitfield</b><em>ASCAP · LICENSING</em></div>
          <div className={css.fsig}><b className={css.fink}>R. Mensah</b><em>BMI · LICENSING</em></div>
        </div>
      </>
    ),
  },
  {
    id: 'gdpr', head: 'DATA PROTECTION AGREEMENTS', sub: 'GDPR Art. 28 · CCPA', stamp: 'SIGNED',
    body: (
      <>
        <p className={css.flegal}>Processor shall process subscriber personal data solely on documented
          instruction of the Controller, and shall notify the Controller without undue delay upon
          becoming aware of a personal data breach.</p>
        <div className={css.frow}><span>LAWFUL BASIS</span><b>Contract</b></div>
        <div className={css.frow}><span>RETENTION</span><b>24 months</b></div>
        <div className={css.frow}><span>SUB-PROCESSORS</span><b>Disclosed</b></div>
        <div className={css.frow}><span>RIGHT TO ERASURE</span><b>Honoured</b></div>
        <div className={css.fsigrow}>
          <div className={css.fsig}><b className={css.fink}>K. Larsen</b><em>DATA CONTROLLER</em></div>
          <div className={css.fsig}><b className={css.fink}>D. Moreau</b><em>DATA PROCESSOR</em></div>
        </div>
      </>
    ),
  },
  {
    id: 'bill', head: 'MERCHANT & BILLING AGREEMENT', sub: 'Recurring subscription processing', stamp: 'LIVE',
    body: (
      <>
        <div className={css.fcards}><i>VISA</i><i>MC</i><i>AMEX</i><i>UPI</i></div>
        <div className={css.frow}><span>MONTHLY</span><b>enabled</b></div>
        <div className={css.frow}><span>ANNUAL</span><b>enabled</b></div>
      </>
    ),
  },
];

/** The panel. Beat 6 shows it dark on the office wall; beat 7 pushes into the
 *  same component and boots it. One element, so the push-in is provably the
 *  same object rather than two lookalikes. */
const WallScreen: React.FC<{ on?: boolean; children?: React.ReactNode }> = ({ on, children }) => (
  <div className={cx(css.tvrig, (on ? css.on : ''))}>
    <div className={css.bigtv}>
      <div className={css.tvglass}>{children}</div>
      <div className={css.tvsheen} />
      <i className={cx(css.tvled, (on ? css.loop : ''))} />
    </div>
    <div className={css.tvmount} />
  </div>
);

export interface ApplicantFile {
  name: string;
  avatarUrl?: string;
  fame: number;
  reputation: number;
  liquid: string;      // "$92.4M"
  credits: string[];   // three real titles from the save
}

export const MachineWakesUp: React.FC<{
  playerName: string; totalCost: string; applicant: ApplicantFile; onDone: () => void;
}> = ({ playerName, totalCost, applicant, onDone }) => {
  // folder · applicant · money · paperwork · closed · room · screen
  const { i, held, tap, finishAll } = useScene(
    [1700, 4200, 4000, 6900, 1800, 3400, 2200], 900, onDone);

  /* the filings land one at a time, stacking */
  const [filed, setFiled] = useState(0);
  useEffect(() => {
    if (i !== 3) { setFiled(0); return; }
    if (held) { setFiled(FILINGS.length); return; }
    const iv = window.setInterval(() => setFiled(f => Math.min(FILINGS.length, f + 1)), 1150);
    setFiled(1);
    return () => window.clearInterval(iv);
  }, [i, held]);

  return (
    <div className={cx(css.cine, css.found, (held ? css.rush : ''), (i >= 5 ? css.offdesk : ''))} onClick={tap}>
      <div className={css.lamp} />
      <div className={css.desk} />

      {/* 1 — the application lands */}
      {i === 0 && (
        <div className={css.stage}>
          <div className={css.folder}>
            <div className={css.ftab2} />
            <div className={css.fface}>
              <span className={css.fkicker}>APPLICATION FOR OPERATION OF A</span>
              <b>STREAMING SERVICE</b>
              <div className={css.frule} />
              <div className={css.fmeta}><span>FILE NO.</span><b>SD·7714·{new Date().getFullYear()}</b></div>
              <div className={css.fmeta}><span>APPLICANT</span><b>{playerName.toUpperCase()}</b></div>
              <div className={css.ffoot}>
                <div className={css.bars}>{Array.from({ length: 34 }).map((_, n) =>
                  <i key={n} style={{ width: `${1 + (n * 7) % 3}px` }} />)}</div>
                <span>SD·7714·{new Date().getFullYear()} · OFFICE OF CORPORATE REGISTRATION</span>
              </div>
            </div>
            <div className={cx(css.pstamp, css.red, css.rcv)}>RECEIVED</div>
          </div>
        </div>
      )}

      {/* 2 — who is asking */}
      {i === 1 && (
        <div className={css.stage}>
          <div className={css.paper}>
            <div className={css.phead}><span>APPLICANT DOSSIER</span><em>FORM SD·2</em></div>
            <div className={css.dbody}>
              <div className={css.dphotowrap}>
                <div className={css.dphoto}>
                  {applicant.avatarUrl
                    ? <img src={applicant.avatarUrl} alt="" />
                    : <PlaceholderAvatar />}
                  <span>PHOTOGRAPH</span>
                </div>
                <div className={css.clip} />
              </div>
              <div className={css.dfields}>
                {[
                  ['NAME', applicant.name],
                  ['PROFESSION', 'Actor'],
                  ['FAME', String(applicant.fame)],
                  ['REPUTATION', String(applicant.reputation)],
                  ['PERSONAL CASH', applicant.liquid],
                ].map(([k, v], n) => (
                  <div className={css.dfield} key={k} style={{ animationDelay: `${0.35 + n * 0.16}s` }}>
                    <span>{k}</span><b>{v}</b>
                  </div>
                ))}
                <div className={cx(css.dfield, css.credits)} style={{ animationDelay: '1.15s' }}>
                  <span>NOTABLE CREDITS</span>
                  <b>{applicant.credits.slice(0, 3).join(' · ')}</b>
                </div>
              </div>
            </div>
            <div className={css.dchecks}>
              {['IDENTITY VERIFIED', 'NO DISQUALIFYING FILINGS', 'ENTITY CLASS RESERVED'].map((c, n) => (
                <div className={css.dcheck} key={c} style={{ animationDelay: `${1.6 + n * 0.3}s` }}>
                  <i>✓</i><span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3 — the money, as the bank would put it */}
      {i === 2 && (
        <div className={css.stage}>
          <div className={cx(css.paper, css.bank)}>
            <div className={css.bhead}>
              <div className={css.blogo}><i /><i /><i /></div>
              <div className={css.bname}><b>MERIDIAN TRUST</b><em>Private Client Services</em></div>
            </div>
            <div className={css.brule} />
            <div className={css.btitle}>WIRE TRANSFER CONFIRMATION</div>
            <div className={css.bamt}>${' '}<Counter to={85_000_000} ms={2000} /><em>.00 USD</em></div>
            <div>
              <div className={css.brow}><span>DEBIT</span><b>Personal holdings ····4417</b></div>
              <div className={css.brow}><span>CREDIT</span><b>Escrow — SD·7714 ····0092</b></div>
              <div className={css.brow}><span>VALUE DATE</span><b>SAME DAY</b></div>
              <div className={css.brow}><span>REFERENCE</span><b>INCORP/PENDING</b></div>
            </div>
            <div className={cx(css.pstamp, css.red, css.esc)}>FUNDS HELD IN ESCROW<em>RELEASE ON INCORPORATION</em></div>
          </div>
        </div>
      )}

      {/* 4 — the paperwork, each document drawn as itself */}
      {i === 3 && (
        <div className={css.stage}>
          <div className={css.filestack}>
            {FILINGS.slice(0, filed).map((f, n) => (
              <div className={cx(css.paper, css.filing)} key={f.id}
                style={{ ['--epx-r' as string]: `${(n % 2 ? 1 : -1) * (1.1 + n * 0.5)}deg`, zIndex: n + 1 }}>
                <div className={css.phead}><span>{f.head}</span></div>
                <div className={css.psub}>{f.sub}</div>
                <div className={css.fbody}>{f.body}</div>
                <div className={css.pfoot}>
                  <span>SD·7714 · {playerName.toUpperCase()}</span>
                  <em>SHEET {n + 1} OF {FILINGS.length}</em>
                </div>
                <div className={cx(css.pstamp, css.green)}>{f.stamp}</div>
              </div>
            ))}
          </div>
          <div className={css.fcount}>{filed} / {FILINGS.length} FILED</div>
        </div>
      )}

      {/* 5 — closed, and one word left over */}
      {i === 4 && (
        <div className={css.stage}>
          <div className={cx(css.folder, css.shut)}>
            <div className={css.ftab2} />
            <div className={css.fface}>
              <span className={css.fkicker}>APPLICATION FOR OPERATION OF A</span>
              <b>STREAMING SERVICE</b>
              <div className={css.frule} />
              <div className={css.fmeta}><span>APPLICANT</span><b>{playerName.toUpperCase()}</b></div>
              <div className={css.fmeta}><span>ESCROW</span><b>{totalCost}</b></div>
            </div>
            <div className={cx(css.pstamp, css.big, css.approve)}>APPROVED<em>PENDING NAME</em></div>
          </div>
        </div>
      )}

      {/* 6 — lift off the desk: the room you just leased */}
      {i === 5 && (
        <div className={css['c-room']}>
          {/* ceiling strips snapping on in rows, receding down the floor plate */}
          <div className={css.ceil}>{Array.from({ length: 4 }).map((_, n) =>
            <i key={n} style={{ animationDelay: `${n * 0.18}s`, width: `${70 - n * 12}%`, top: `${6 + n * 6}%` }} />)}</div>
          <div className={css.floorplane} />
          <div className={css.endwall} />
          <div className={css.roomset}><WallScreen /></div>
          {/* empty desk banks receding toward the end wall — nobody has been hired yet.
              Rows are sized by width, not transform, so they can't overlap. */}
          <div className={css.floorplan}>
            {[0, 1, 2].map(row => (
              <div className={css.deskrow} key={row} style={{
                ['--epx-cine-w' as string]: `${52 + row * 17}%`,
                ['--epx-cine-o' as string]: `${0.4 + row * 0.24}`,
                animationDelay: `${0.85 + row * 0.2}s`,
              }}>
                {[0, 1].map(side => (
                  <div className={css.bank} key={side}>
                    <div className={css.chairs}><span /><span /></div>
                    <div className={css.desk2} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className={css.roomcap}>
            <span>STREAMING HALL · LEASED</span>
            <em>0 TITLES · 0 SUBSCRIBERS · 0 EMPLOYEES</em>
          </div>
        </div>
      )}

      {/* 7 — push into the screen. it is blank. you name it. */}
      {i === 6 && (
        <div className={css['c-screen']}>
          {/* still inside the room — the wall and floor carry through from the last beat */}
          <div className={css.roomwall} />
          <WallScreen on>
            {/* the set boots, finds nothing plugged in, and says so — and keeps saying it */}
            <div className={css.osd}>NO SIGNAL</div>
          </WallScreen>
          <button type="button" className={css.namebtn}
            onClick={e => { e.stopPropagation(); finishAll(); }}>
            Name Your Platform →
          </button>
        </div>
      )}

      <div className={css['cine-grain']} />
      {i < 6 && <div className={cx(css['cine-skip'], css.loop)}>{held ? 'tap to continue' : 'tap to complete'}</div>}
    </div>
  );
};

/* ============================================================
   AFTER THE WIZARD — "ACTIVATION"
   ============================================================ */
/** The three capture attacks any real service has to survive, and what stops them. */
const ATTACKS: { id: string; label: string; by: string; fail: string }[] = [
  { id: 'rec', label: 'SCREEN RECORDING', by: 'Widevine L1', fail: 'BLACK FRAME' },
  { id: 'hdmi', label: 'HDMI CAPTURE', by: 'PlayReady SL3000', fail: 'SIGNAL DROPPED' },
  { id: 'rip', label: 'STREAM RIP', by: 'FairPlay', fail: 'CIPHERTEXT ONLY' },
];

/** every device runs the same certification pass */
const CHECKS = ['LAUNCH', 'PLAYBACK', 'DRM'];
const DEVICES: { id: string; label: string; shape: 'phone' | 'tv' | 'stick' }[] = [
  { id: 'ios', label: 'iOS', shape: 'phone' },
  { id: 'android', label: 'Android', shape: 'phone' },
  { id: 'samsung', label: 'Samsung', shape: 'tv' },
  { id: 'lg', label: 'LG', shape: 'tv' },
  { id: 'appletv', label: 'Apple TV', shape: 'stick' },
  { id: 'roku', label: 'Roku', shape: 'stick' },
  { id: 'fire', label: 'Fire TV', shape: 'stick' },
];
const DEV_ROWS: [string, number, number][] = [
  ['HANDHELD', 0, 2], ['TELEVISION', 2, 4], ['STREAMING BOXES', 4, 7],
];
/** Samsung stumbles on its first pass — a straight line of green has no pulse,
 *  and an HDR handshake failure is exactly what really happens. */
const FLAKY = 'samsung';

export const Activation: React.FC<{
  brand: Brand; playerName: string; regionCount: number;
  disbursed: string; treasury: string;
  hires: { role: string; name: string }[];
  wall: React.ReactNode;              // the same room, re-rendered
  onDone: () => void;
}> = ({ brand, playerName, regionCount, disbursed, treasury, hires, wall, onDone }) => {
  // escrow · register · certificate · protection · devices · ident · office · wall
  const { i, held, tap, finishAll } = useScene(
    [4000, 3800, 3400, 5200, 8400, 2600, 3400, 2800], 900, onDone);
  const c = brandColor(brand), c2 = brandDeep(brand);
  const regNo = '7714';

  /* attacks land one at a time */
  const [atk, setAtk] = useState(0);
  useEffect(() => {
    if (i !== 3) { setAtk(0); return; }
    if (held) { setAtk(ATTACKS.length); return; }
    const iv = window.setInterval(() => setAtk(a => Math.min(ATTACKS.length, a + 1)), 1500);
    setAtk(1);
    return () => window.clearInterval(iv);
  }, [i, held]);

  /* The certification bench walks device by device, check by check. The flaky
     one costs extra sub-steps so its failure and retry are actually readable —
     a two-frame stumble reads as a glitch, not as drama. */
  const [step, setStep] = useState(0);
  const PER = CHECKS.length + 1;                       // 3 checks + the verdict
  const COST = DEVICES.map(d => d.id === FLAKY ? PER + 4 : PER);
  const OFFSET = COST.reduce<number[]>((acc, c, n) => [...acc, (acc[n - 1] ?? 0) + (COST[n - 1] ?? 0)], []);
  const TOTAL = COST.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (i !== 4) { setStep(0); return; }
    if (held) { setStep(TOTAL); return; }
    const iv = window.setInterval(() => setStep(v => Math.min(TOTAL, v + 1)), 230);
    return () => window.clearInterval(iv);
  }, [i, held, TOTAL]);
  const devState = (n: number) => {
    const from = OFFSET[n], local = step - from;
    if (local >= COST[n]) return { phase: 'pass' as const, label: 'PASS' };
    if (local < 0) return { phase: 'wait' as const, label: 'QUEUED' };
    if (DEVICES[n].id === FLAKY) {
      if (local < 2) return { phase: 'run' as const, label: CHECKS[local] };
      if (local < 4) return { phase: 'flake' as const, label: 'HDR HANDSHAKE — FAILED' };
      if (local < 6) return { phase: 'flake' as const, label: 'RETRYING…' };
      return { phase: 'run' as const, label: CHECKS[Math.min(local - 4, CHECKS.length - 1)] };
    }
    return { phase: 'run' as const, label: CHECKS[Math.min(local, CHECKS.length - 1)] };
  };
  const certified = DEVICES.filter((_, n) => step - OFFSET[n] >= COST[n]).length;

  return (
    <div className={cx(css.cine, css.found, (held ? css.rush : ''))} onClick={tap}
      style={{ ['--epx-cine-c' as string]: c, ['--epx-cine-c2' as string]: c2 }}>

      {/* 1 — the same bank letter comes back, resolved */}
      {i === 0 && (
        <div className={css.stage}>
          <div className={cx(css.paper, css.bank, css.release)}>
            <div className={css.bhead}>
              <div className={css.blogo}><i /><i /><i /></div>
              <div className={css.bname}><b>MERIDIAN TRUST</b><em>Private Client Services</em></div>
            </div>
            <div className={css.brule} />
            <div className={css.btitle}>ESCROW RELEASE ADVICE</div>
            <div className={css.bamt}>${' '}<Counter to={85_000_000} ms={900} /><em>.00 USD</em></div>
            <div>
              <div className={css.brow}><span>DISBURSED</span><b>{disbursed} · registration & rights</b></div>
              <div className={css.brow}><span>TO TREASURY</span><b>{treasury}</b></div>
              <div className={css.brow}><span>REFERENCE</span><b className={css.newref}>CO. № {regNo}</b></div>
            </div>
            <div className={cx(css.pstamp, css.red, css.esc, css.struck)}>FUNDS HELD IN ESCROW<em>RELEASE ON INCORPORATION</em><i className={css.strike} /></div>
            <div className={cx(css.pstamp, css.green, css.rel)}>RELEASED</div>
          </div>
          <div className={css.acctline}>
            <span>{brand.name} — OPERATING ACCOUNT</span>
            <b>${' '}<Counter to={15_000_000} ms={1700} /></b>
            <em>the first money the company has ever held</em>
          </div>
        </div>
      )}

      {/* 2 — you are written into the register, under the companies already there */}
      {i === 1 && (
        <div className={css.stage}>
          <div className={cx(css.paper, css.ledger2)}>
            <div className={css.phead}><span>REGISTER OF COMPANIES</span><em>VOL. XI</em></div>
            <div className={css.regrows}>
              {[['7711', 'ORBIT TV HOLDINGS', 'STREAMING DISTRIBUTION'],
                ['7712', 'HALLOWAY PICTURES', 'FILM PRODUCTION'],
                ['7713', 'CASTLE ROAD MEDIA', 'TALENT MANAGEMENT']].map(([n, nm, k]) => (
                  <div className={cx(css.regrow, css.old)} key={n}>
                    <b>№ {n}</b><span>{nm}</span><em>{k}</em>
                  </div>
                ))}
              <div className={cx(css.regrow, css.mine)}>
                <b>№ {regNo}</b>
                <span>{brand.name.toUpperCase()}</span>
                <em>STREAMING DISTRIBUTION</em>
                <i className={css.nib} />
              </div>
            </div>
            <div className={css.regfoot}>ENTERED THIS DAY BY THE REGISTRAR</div>
          </div>
          <div className={css.assigned}>
            <span>COMPANY NUMBER ASSIGNED</span>
            <b>{regNo.split('').map((d, n) => (
              <i key={n} style={{ animationDelay: `${1.1 + n * 0.16}s` }}>{d}</i>
            ))}</b>
          </div>
        </div>
      )}

      {/* 3 — the certificate is issued from that entry, and the seal presses in */}
      {i === 2 && (
        <div className={css.stage}>
          <div className={cx(css.paper, css.cert2)}>
            <div className={css.certhead}>CERTIFICATE OF INCORPORATION</div>
            <div className={css.certno}>COMPANY NUMBER {regNo}</div>
            <div className={css.certname} style={{ fontFamily: typeFace(brand).stack }}>{brand.name}</div>
            <div className={css.certbody}>
              is this day incorporated under the Companies Act as a private company
              limited by shares, and is authorised to carry on the business of
              streaming distribution.
            </div>
            <div className={css.certrow}><span>FOUNDER</span><b>{playerName}</b></div>
            <div className={css.certrow}><span>TERRITORIES</span><b>{regionCount}</b></div>
            <div className={css.certrow}><span>REGISTERED</span><b>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</b></div>
            {/* embossed, not rubber-stamped — it presses into the sheet */}
            <div className={css.emboss}><Mark brand={brand} /><span>REGISTRAR</span></div>
            <div className={css.regsig}>
              <span className={css.rsname}>R. Whitlock</span>
              <i />
              <em>REGISTRAR OF COMPANIES</em>
            </div>
          </div>
        </div>
      )}

      {/* 4 — protection, shown as three attacks that fail */}
      {i === 3 && (
        <div className={css['c-prot']}>
          <div className={css.cklabel}>CONTENT PROTECTION</div>
          <div className={cx(css.protplayer, atk > 0 ? css['a' + atk] : '')}>
            <div className={css.ppart} />
            <span className={css.ppwm}><Mark brand={brand} /></span>
            <div className={css.pptitle}>DEAD SIGNAL</div>
            <div className={css.ppscrub}><i /></div>
            {atk > 0 && atk <= ATTACKS.length && (
              <div className={css.blackout} key={ATTACKS[atk - 1].id}>
                <b>{ATTACKS[atk - 1].fail}</b>
              </div>
            )}
          </div>
          <div className={css.atklist}>
            {ATTACKS.map((a, n) => (
              <div key={a.id} className={cx(css.atk, (atk > n ? css.done : ''), (atk === n + 1 ? css.now : ''))}>
                <i className={css.x}>✕</i>
                <div className={css.atxt}><b>{a.label}</b><span>blocked by {a.by}</span></div>
                <em>{atk > n ? 'BLOCKED' : '···'}</em>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 — the certification bench: every device boots your storefront and is tested */}
      {i === 4 && (
        <div className={css['c-bench']}>
          <div className={css.cklabel}>DEVICE CERTIFICATION</div>
          <div className={css.benchgrid}>
            {DEV_ROWS.map(([rowLabel, from, to]) => (
              <div className={css.benchrow} key={rowLabel}>
                <span className={css.rowlab}>{rowLabel}</span>
                <div className={css.benchline}>
                  {DEVICES.slice(from, to).map((d, j) => {
                    const n = from + j;
                    const st = devState(n);
                    return (
                      <div key={d.id} className={cx(css.bd, css[d.shape], css[st.phase])}>
                        <div className={cx(css.bscreen, css.loop)}>
                          {/* the storefront layout chosen in the wizard, in miniature */}
                          <i className={css.bhero} /><i className={css.brow1} /><i className={css.brow2} />
                          <span className={css.bmk}><Mark brand={brand} /></span>
                        </div>
                        <b>{d.label}</b>
                        <em>{st.label}</em>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className={css.benchstatus}>
            {certified >= DEVICES.length
              ? 'CERTIFIED ON EVERY DEVICE · STORE LISTINGS LIVE'
              : `${certified} / ${DEVICES.length} CERTIFIED`}
          </div>
        </div>
      )}

      {/* 6 — the ident */}
      {i === 5 && (
        <div className={css['c-ident']}>
          <div className={css.identmark}><Mark brand={brand} /></div>
          <div className={css.identname} style={{ fontFamily: typeFace(brand).stack }}>{brand.name}</div>
          <div className={css.identwave}>{Array.from({ length: 15 }).map((_, n) => {
            const env = 0.34 + 0.66 * Math.sin((Math.PI * (n + 0.5)) / 15);
            return <i key={n} className={css.loop} style={{
              ['--epx-cine-m' as string]: env.toFixed(3),
              animationDelay: `${((n * 7) % 5) * 0.09}s`, background: c,
            }} />;
          })}</div>
        </div>
      )}

      {/* 7 — the same office, no longer empty */}
      {i === 6 && (
        <div className={cx(css['c-room'], css.staffed)}>
          <div className={css.ceil}>{Array.from({ length: 4 }).map((_, n) =>
            <i key={n} style={{ animationDelay: `${n * 0.12}s`, width: `${70 - n * 12}%`, top: `${6 + n * 6}%` }} />)}</div>
          <div className={css.floorplane} />
          <div className={css.endwall} />
          <div className={css.roomset}><WallScreen on><span className={css.livemk}><Mark brand={brand} /></span></WallScreen></div>
          <div className={css.floorplan}>
            {[0, 1, 2].map(row => (
              <div className={css.deskrow} key={row} style={{
                ['--epx-cine-w' as string]: `${52 + row * 17}%`,
                ['--epx-cine-o' as string]: `${0.4 + row * 0.24}`,
                animationDelay: `${0.5 + row * 0.16}s`,
              }}>
                {[0, 1].map(side => {
                  /* 6 banks x 2 chairs = 12 seats, filled front-to-back in order */
                  const base = (row * 2 + side) * 2;
                  return (
                    <div className={css.bank} key={side}>
                      <div className={css.chairs}>
                        <span className={base < hires.length ? css.taken : ''} />
                        <span className={base + 1 < hires.length ? css.taken : ''} />
                      </div>
                      <div className={css.desk2} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={css.roomcap}>
            <span>{brand.name.toUpperCase()} · STREAMING HALL</span>
            <em>{hires.length} EMPLOYEE{hires.length === 1 ? '' : 'S'} · {regionCount} REGION{regionCount === 1 ? '' : 'S'} · LIVE</em>
          </div>
        </div>
      )}

      {/* 8 — back to the wall, the slot taken */}
      {i >= 7 && (
        <div className={css['c-live']}>
          <div className={css.livewall}>{wall}</div>
          <div className={css.liveover}>
            <p>The empty slot is yours.</p>
            {/* The last beat never auto-advances, so it MUST offer its own exit —
                without this the cinematic traps the player forever. */}
            <button type="button" className={cx(css.namebtn, css.livebtn)}
              onClick={e => { e.stopPropagation(); finishAll(); }}>
              Open {brand.name} Streaming Hall →
            </button>
          </div>
        </div>
      )}

      <div className={css['cine-grain']} />
      <div className={cx(css['cine-skip'], css.loop)}>tap to skip</div>
    </div>
  );
};

/* ============================================================
   STYLE
   ============================================================ */
/* Styles live in the scoped Cinematics CSS module. */
