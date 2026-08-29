/**
 * EMPIRE+ v2 — THE LISTING
 *
 *   CHAPTER 01   THE ASK        you name a number, and four gates argue with it
 *   CHAPTER 02  THE SCRUTINY   strangers audit your life, then the state does
 *   CHAPTER 03 THE SELL       price band, anchors, and one live interview
 *   CHAPTER 04  THE VERDICT    three days where you can do nothing at all
 *   CHAPTER 05   AFTER          what you own, and what you now owe
 *
 * ── THE DRAWING RULE ──────────────────────────────────────────────────────
 * Never draw the thing. Draw what the thing produces. No buildings, no faces,
 * no perspective. Type, paper, light, and numbers moving.
 *
 * ── ONE REGISTER PER MOMENT ───────────────────────────────────────────────
 * The first pass put every screen on cream paper, which made a legal
 * resolution, a working model, a board vote and a bank auction all look like
 * the same thing — and made the whole act read as the newspaper this game
 * already has two of. Paper is now rationed to the three moments that are
 * genuinely paper. Everything else gets the form its content actually takes:
 *
 *   PAPER      cream, letterpress    a resolution, a certification, a filing
 *   TERMINAL   amber on black, mono  a model you are still working on
 *   REGISTER   engineering dark      a platform risk log, a data room
 *   DIVISION   the board of a room   a vote, counted in front of you
 *   DESK       syndicate dark        three houses bidding against each other
 *   ROOM       one warm light        where you are left alone with it
 *   STATE      blue-grey, watermark  government paper, which is not your paper
 *   CHANNEL    broadcast             see newsdesk.tsx
 */
import css from './presentation/screens/TheListing/TheListing.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brand, brandColor, hslHex } from './StreamingBrandVisuals';
import {
  STREAMING_IPO_BANKS as BANKS,
  StreamingIpoPresentationInputs as IpoInputs,
  StreamingIpoPresentationResult as IpoResult,
  streamingTickerOptions as tickerOptions,
} from './streamingIpoPresentationModel';
import { MarketDesk, Segment } from './StreamingMarketDesk';

/* ============================================================
   THE SHAPE
   ============================================================ */
export type Scene =
  | 'RESOLUTION' | 'ASK' | 'CFO' | 'CTO' | 'BOARD' | 'SYNDICATE' | 'STANDS'
  | 'DILIGENCE' | 'FILING' | 'REGULATOR'
  | 'BAND' | 'ANCHOR' | 'INTERVIEW'
  | 'BOOK' | 'ALLOT' | 'LISTING'
  | 'AFTER';

const CHAPTER_OF: Record<Scene, 1 | 2 | 3 | 4 | 5> = {
  RESOLUTION: 1, ASK: 1, CFO: 1, CTO: 1, BOARD: 1, SYNDICATE: 1, STANDS: 1,
  DILIGENCE: 2, FILING: 2, REGULATOR: 2,
  BAND: 3, ANCHOR: 3, INTERVIEW: 3,
  BOOK: 4, ALLOT: 4, LISTING: 4,
  AFTER: 5,
};
const CHAPTERS = [
  { n: '01', t: 'THE ASK' }, { n: '02', t: 'SCRUTINY' }, { n: '03', t: 'THE OFFER' },
  { n: '04', t: 'THE MARKET' }, { n: '05', t: 'PUBLIC LIFE' },
];

export const money = (n: number) => {
  const a = Math.abs(n); const s = n < 0 ? '−' : '';
  return a >= 1e9 ? `${s}$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${s}$${Math.round(a / 1e6)}M`
    : a >= 1e3 ? `${s}$${Math.round(a / 1e3)}k` : `${s}$${Math.round(a)}`;
};
export const dollars = (n: number) => `$${n.toFixed(2)}`;
export const pctS = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;
const mn = (n: number) => `${(n / 1e6).toFixed(1)}M`;

const seededUnit = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return (hash >>> 0) / 4294967296;
};

/* ============================================================
   MARKS — every objection you force leaves one, and they all come due
   ============================================================ */
export interface Mark { id: string; label: string; short: string; bookCost: number }

/* ============================================================
   FUNDAMENTALS — the number every gate measures against
   ============================================================ */
export interface Fundamentals {
  revenue: number; fair: number; ceiling: number; perSub: number; leaderPerSub: number;
}
export const fundamentalsOf = (inp: IpoInputs): Fundamentals => {
  const revenue = Math.max(1, inp.subscribers * inp.arpu * 12);
  const churnPenalty = Math.max(.45, 1 - (inp.churnPct - 2) * .11);
  const debtPenalty = Math.max(.7, 1 - (inp.techDebt / 100) * .32);
  const fair = revenue * 7.2 * churnPenalty * debtPenalty;
  return {
    revenue, fair, ceiling: fair * 1.72,
    perSub: fair / Math.max(1, inp.subscribers),
    /* the leader is the same arithmetic on the same ARPU at the multiple a
       mature, low-churn platform commands — not a magic constant */
    leaderPerSub: inp.arpu * 12 * 6.4,
  };
};

/* ============================================================
   YOUR OWN EXECUTIVES
   ============================================================ */
export interface Exec {
  id: string; role: string; name: string;
  stance: 'FOR' | 'AGAINST' | 'ABSTAIN'; line: string;
}
export const execsOf = (inp: IpoInputs, f: Fundamentals): Exec[] => [
  {
    id: 'cfo', role: 'CHIEF FINANCIAL OFFICER', name: inp.executiveNames?.cfo || 'Chief Financial Officer',
    stance: inp.churnPct > 4.4 ? 'AGAINST' : 'FOR',
    line: inp.churnPct > 4.4
      ? `Churn is ${inp.churnPct.toFixed(1)}%. Two more quarters and I can defend any number you like. Today I can defend ${money(f.fair)}.`
      : `The numbers hold. Revenue of ${money(f.revenue)} supports the range we have modelled.`,
  },
  {
    id: 'cto', role: 'CHIEF TECHNOLOGY OFFICER', name: inp.executiveNames?.cto || 'Chief Technology Officer',
    stance: inp.techDebt > 38 ? 'AGAINST' : inp.techDebt > 20 ? 'ABSTAIN' : 'FOR',
    line: inp.techDebt > 38
      ? `We carry ${inp.techDebt} points of technical debt and we peaked at ${inp.peakLoad}% load. I will not sign a document that calls this platform finished.`
      : `It will hold. I want the debt disclosed in plain words, not buried in an annexure.`,
  },
  {
    id: 'coo', role: 'CHIEF OPERATING OFFICER', name: inp.executiveNames?.coo || 'Chief Operating Officer', stance: 'FOR',
    line: `We are out of runway for the expansion the board already approved. This is the cash, or it is not happening.`,
  },
  {
    id: 'gc', role: 'GENERAL COUNSEL', name: inp.executiveNames?.counsel || 'General Counsel', stance: 'ABSTAIN',
    line: `My job starts the day we file. I will tell you what has to go in the document, and you will not enjoy it.`,
  },
];

/* ============================================================
   SHARED FURNITURE
   ============================================================ */
const ChapterRail: React.FC<{ scene: Scene }> = ({ scene }) => {
  const chapter = CHAPTER_OF[scene];
  return (
    <div className={css.lsrail}>
      {CHAPTERS.map((item, i) => (
        <div className={cx(css.lsrailseg, (i + 1 === chapter ? css.on : ''), (i + 1 < chapter ? css.done : ''))} key={item.n}>
          <i /><span>{i + 1 === chapter ? `${item.n} · ${item.t}` : item.n}</span>
        </div>
      ))}
    </div>
  );
};

const Foot: React.FC<{ label: string; onGo: () => void; disabled?: boolean; note?: string }> =
  ({ label, onGo, disabled, note }) => (
    <div className={css.lsfoot}>
      {note && <p className={css.lsfootnote}>{note}</p>}
      <button className={cx(css.lsgo, (disabled ? css.off : ''))} onClick={() => !disabled && onGo()}>
        {label}
      </button>
    </div>
  );

const Choice: React.FC<{
  a: { title: string; note: string; onPick: () => void };
  b: { title: string; note: string; onPick: () => void };
}> = ({ a, b }) => (
  <div className={css.lschoice}>
    <button className={cx(css.lschoicebtn, css.revise)} onClick={a.onPick}>
      <b>{a.title}</b><span>{a.note}</span>
    </button>
    <button className={cx(css.lschoicebtn, css.force)} onClick={b.onPick}>
      <b>{b.title}</b><span>{b.note}</span>
    </button>
  </div>
);

const Stamp: React.FC<{ text: string; kind?: 'ok' | 'bad'; on: boolean }> =
  ({ text, kind = 'ok', on }) => (
    <div className={cx(css.lsstamp, css[kind], (on ? css.on : ''))}><span>{text}</span></div>
  );

/** A wet signature: the person's actual name, in a hand, revealing as it is
 *  written. An anonymous squiggle told you nothing about who signed. */
const Signature: React.FC<{ name: string; on: boolean }> = ({ name, on }) => (
  <div className={css.lssigblock}>
    <span className={cx(css.lssigwipe, (on ? css.on : ''))}><i className={css.lssig}>{name}</i></span>
    <em>{name}</em>
  </div>
);

/** The beat every gate needs: it is with them, then it comes back. */
const useReading = (ms = 1250) => {
  const [reading, setReading] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!reading) return;
    const id = window.setTimeout(() => setDone(true), ms);
    return () => clearTimeout(id);
  }, [reading, ms]);
  return { reading, done, start: () => setReading(true) };
};

const Reading: React.FC<{ label?: string }> = ({ label = 'READING' }) => (
  <div className={css.lsreading}>
    <div className={css.lsdots}><i /><i /><i /></div>
    <p>{label}</p>
  </div>
);

const GateCount: React.FC<{ at: number }> = ({ at }) => (
  <div className={css.lsgatecount}>
    {[0, 1, 2, 3].map(i => <i key={i} className={i < at ? css.done : i === at ? css.now : ''} />)}
    <span>GATE {at + 1} OF 4</span>
  </div>
);


/* ============================================================
   TYPING A FIGURE — the device keyboard, not a keypad of my own. Tap any
   number in the model and it becomes an input with the numeric keyboard up.
   ============================================================ */
const Figure: React.FC<{
  label: string; value: number; min: number; max: number;
  format: (n: number) => string; onSet: (n: number) => void;
  className?: string; children?: React.ReactNode;
}> = ({ label, value, min, max, format, onSet, className, children }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    const n = Number(raw.replace(/[^0-9.]/g, ''));
    if (raw !== '' && !Number.isNaN(n)) onSet(Math.max(min, Math.min(max, n)));
    setEditing(false); setRaw('');
  };

  return (
    <div className={className}>
      <span>{label}<i className={css.lstype}>{editing ? 'DONE' : 'TAP'}</i></span>
      {editing ? (
        <input ref={ref} className={css.lsfigin} type="text" inputMode="decimal"
          placeholder={String(Math.round(value))} value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }} />
      ) : (
        <b onClick={() => { setRaw(''); setEditing(true); }}>{format(value)}</b>
      )}
      {children}
    </div>
  );
};

/** One plain sentence, before anything else on the screen. */
const What: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={css.lswhat}><b>{label}</b><p>{children}</p></div>
);

/* ============================================================
   CHAPTER 01 · 1 — THE RESOLUTION                          PAPER
   ============================================================ */
const Resolution: React.FC<{
  brand: Brand; inputs: IpoInputs; f: Fundamentals; onGo: () => void;
}> = ({ brand, inputs, f, onGo }) => {
  const execs = useMemo(() => execsOf(inputs, f), [inputs, f]);
  const [open, setOpen] = useState<string | null>('cfo');
  const [moved, setMoved] = useState(false);
  const against = execs.filter(e => e.stance === 'AGAINST').length;
  /* the stamp lands, holds for a beat, and carries you through — asking for a
     second tap to leave made one action into two decisions */
  useEffect(() => {
    if (!moved) return;
    const id = window.setTimeout(onGo, 1250);
    return () => clearTimeout(id);
  }, [moved]);

  return (
    <div className={cx(css.lsscene, css.paper)}>
      <div className={css.lssheet}>
        <div className={css.lsletterhead}>
          <b>{(brand.name || 'EMPIRE+').toUpperCase()}</b>
          <span>MINUTES OF THE BOARD · CONFIDENTIAL</span>
        </div>
        <h1 className={css.lsdoctitle}>Resolution to proceed with an<br />initial public offering</h1>
        <p className={css.lsdocbody}>
          It is proposed that the Company apply for the admission of its ordinary shares to
          trading, and that new shares be issued for that purpose in a number to be
          determined by the founder.
        </p>
        <div className={css.lsdocrule} />
        <span className={css.lsdoclabel}>POSITIONS RECORDED</span>
        <div className={css.lstable}>
          {execs.map(e => (
            <button className={cx(css.lsrow, css[e.stance.toLowerCase()], (open === e.id ? css.open : ''))}
              key={e.id} onClick={() => setOpen(o => o === e.id ? null : e.id)}>
              <div className={css.lsrowtop}>
                <div><b>{e.name}</b><span>{e.role}</span></div>
                <i className={css.lsstance}>{e.stance}</i>
              </div>
              {open === e.id && <p className={css.lsrowsaid}>“{e.line}”</p>}
            </button>
          ))}
        </div>
        <div className={css.lsdocrule} />
        <div className={css.lscarry}>
          <div><span>THE FOUNDER HOLDS</span><b>{inputs.founderPct.toFixed(1)}% OF VOTES</b></div>
          <p>
            {against > 0
              ? `The resolution carries whatever the room thinks. ${against === 1 ? 'One objection is' : `${against} objections are`} recorded in the minutes, and the minutes are filed.`
              : `The resolution carries with no objection recorded.`}
          </p>
        </div>
        {moved && (
          <div className={css.lssignedby}>
            <Signature name={inputs.founderName || 'The Founder'} on />
            <b>CHAIR · MOVED AND CARRIED</b>
          </div>
        )}
        <Stamp text="CARRIED" on={moved} />
      </div>
      <Foot label={moved ? 'CARRIED' : 'MOVE THE RESOLUTION'} disabled={moved}
        note={moved ? 'Recorded in the minutes.' : 'Tap a name to hear their position before you move it.'}
        onGo={() => setMoved(true)} />
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 2 — THE ASK                                 TERMINAL
   Two dials, because an offering is two decisions: what you say you are
   worth, and how much of yourself you sell. The share price falls out of
   them, and it is the number everything afterwards runs on.
   ============================================================ */
const Ask: React.FC<{
  inputs: IpoInputs; f: Fundamentals;
  ask: number; setAsk: (n: number) => void;
  shares: number; setShares: (n: number) => void;
  revision: number; onGo: () => void;
}> = ({ inputs, f, ask, setAsk, shares, setShares, revision, onGo }) => {
  const total = inputs.preIpoShares + shares;
  const price = ask / total;
  const raise = shares * price;
  const floatPct = (shares / total) * 100;
  const founderAfter = inputs.founderPct * (inputs.preIpoShares / total);
  const overFair = ask / f.fair;
  const perSub = ask / Math.max(1, inputs.subscribers);
  const xRev = ask / f.revenue;
  const vsLeader = (perSub / f.leaderPerSub - 1) * 100;

  const band = overFair < .74 ? 'low' : overFair <= 1.25 ? 'ok' : overFair <= 1.42 ? 'warn' : 'bad';
  const floatBand = floatPct < 14 ? 'warn' : floatPct <= 32 ? 'ok' : 'bad';
  const tone = band === 'ok' && floatBand === 'ok' ? 'ok'
    : band === 'bad' || floatBand === 'bad' ? 'bad' : 'warn';
  const verdict =
    band === 'bad' ? 'Not defensible. Expect this taken apart in public.'
      : floatBand === 'bad' ? 'You are selling a third of the company in one morning.'
        : band === 'warn' ? 'A stretch. Somebody in your own building will refuse to sign it.'
          : band === 'low' ? 'Below what your own numbers support. The board will call it a gift.'
            : floatBand === 'warn' ? 'A float this thin will not hold a price on day one.'
              : 'Defensible on both counts. Every signature you need is available here.';

  /* eleven numbers at once was unreadable — the two you set, the one that
     falls out of them, and the diagnostics only when you ask for them */
  const [open, setOpen] = useState(false);

  return (
    <div className={cx(css.lsscene, css.term)}>
      <div className={css.lstermwrap}>
        <What label="THE MODEL">
          Two decisions, and everything else follows from them: what you say the company
          is worth, and how much of it you sell. Tap either figure to type it exactly.
        </What>

        <div className={css.lsdials}>
          <Figure className={cx(css.lsdialbox, css[band])} label="WORTH" value={ask}
            min={Math.round(f.fair * .2)} max={Math.round(f.fair * 5)} format={money} onSet={setAsk}>
            <input className={css.lstermdial} type="range"
              min={Math.round(f.fair * .4)} max={Math.round(f.fair * 2.4)}
              step={Math.round(f.fair / 300)}
              value={Math.min(Math.round(f.fair * 2.4), Math.max(Math.round(f.fair * .4), ask))}
              onChange={e => setAsk(+e.target.value)} />
          </Figure>
          <Figure className={cx(css.lsdialbox, css[floatBand])} label="SELLING" value={shares}
            min={250_000} max={40_000_000} format={mn} onSet={setShares}>
            <input className={css.lstermdial} type="range"
              min={1_000_000} max={30_000_000} step={100_000}
              value={Math.min(30_000_000, Math.max(1_000_000, shares))}
              onChange={e => setShares(+e.target.value)} />
          </Figure>
        </div>

        <div className={css.lsout}>
          <div className={css.lsoutmain}>
            <span>SO THE SHARE PRICE IS</span>
            <b>{dollars(price)}</b>
            <i>{mn(shares)} shares · raising {money(raise)}</i>
          </div>
          <div className={css.lsoutgrid}>
            <div><span>YOU KEEP</span><b>{founderAfter.toFixed(1)}%</b></div>
            <div><span>PUBLIC OWNS</span><b className={css[floatBand] ?? floatBand}>{floatPct.toFixed(1)}%</b></div>
          </div>
        </div>

        <div className={cx(css.lstermnote, css[tone])}>
          <p>{verdict}</p>
        </div>

        <button className={cx(css.lsmore, (open ? css.on : ''))} onClick={() => setOpen(o => !o)}>
          {open ? 'HIDE THE WORKINGS' : 'HOW DOES THAT COMPARE?'}<i>{open ? '−' : '+'}</i>
        </button>

        {open && (
          <div className={css.lsrows}>
            <div className={xRev >= 12 ? css.bad : xRev >= 9 ? css.warn : css.ok}>
              <b>× ANNUAL REVENUE</b><em>{xRev.toFixed(1)}×</em><i>on {money(f.revenue)}</i>
            </div>
            <div className={perSub / f.leaderPerSub >= 1.35 ? css.bad : perSub / f.leaderPerSub >= 1.05 ? css.warn : css.ok}>
              <b>PER SUBSCRIBER</b><em>${Math.round(perSub)}</em>
              <i>{inputs.subscribers.toLocaleString()} paying</i>
            </div>
            <div className={vsLeader > 30 ? css.bad : vsLeader > 5 ? css.warn : css.ok}>
              <b>VS MARKET LEADER</b><em>{pctS(vsLeader)}</em>
              <i>they trade at ${Math.round(f.leaderPerSub)}</i>
            </div>
            <div className={band === 'ok' ? css.ok : band === 'bad' ? css.bad : css.warn}>
              <b>VS WHAT IT DEFENDS</b><em>{overFair.toFixed(2)}×</em><i>{money(f.fair)} supported</i>
            </div>
          </div>
        )}
      </div>

      <Foot label="SUBMIT FOR SIGN-OFF →" onGo={onGo}
        note="Four people have to live with these two numbers." />
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 3 — THE CERTIFICATION                       PAPER
   ============================================================ */
const Cfo: React.FC<{
  ask: number; f: Fundamentals; name: string; onPass: () => void; onRevise: () => void; onForce: () => void;
}> = ({ ask, f, name, onPass, onRevise, onForce }) => {
  const r = useReading();
  const over = ask / f.fair;
  const passed = over <= 1.25;

  return (
    <div className={cx(css.lsscene, css.paper)}>
      <GateCount at={0} />
      <div className={cx(css.lssheet, css.lsgate)}>
        <div className={css.lsletterhead}>
          <b>CERTIFICATION OF FINANCIAL STATEMENTS</b>
          <span>{name.toUpperCase()} · CHIEF FINANCIAL OFFICER</span>
        </div>
        {!r.reading && (
          <p className={css.lsdocbody}>
            The document is with her. It comes back signed, or it comes back with a problem.
          </p>
        )}
        {r.reading && !r.done && <Reading />}
        {r.done && (
          <>
            {passed && <div className={cx(css.lsverdictline, css.ok)}>CERTIFIED</div>}
            <p className={cx(css.lsdocbody, css.quote)}>
              {passed
                ? `“A valuation of ${money(ask)} is ${over.toFixed(2)}× the figure supported by audited revenue. That is within the range I can put my name to.”`
                : `“A valuation of ${money(ask)} is ${over.toFixed(2)}× the figure supported by audited revenue of ${money(f.revenue)}. I am not able to certify assumptions I do not hold.”`}
            </p>
            {passed
              ? <Signature name={name} on />
              : <div className={css.lsstampwrap}><Stamp text="UNABLE TO CERTIFY" kind="bad" on /></div>}
          </>
        )}
      </div>
      {!r.reading && <Foot label="SEND IT UP" onGo={r.start} />}
      {r.done && (passed
        ? <Foot label="NEXT GATE →" onGo={onPass} />
        : <Choice
          a={{ title: 'LOWER THE ASK', note: 'Back to the model. Nothing is recorded.', onPick: onRevise }}
          b={{ title: 'OVERRULE', note: 'Management has adopted valuation assumptions which the Chief Financial Officer declined to certify.', onPick: onForce }} />
      )}
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 4 — ANNEXURE C                              RISK REGISTER
   His objection is about the platform, so the screen is the platform.
   ============================================================ */
const Cto: React.FC<{
  inputs: IpoInputs; onPass: () => void; onForce: () => void;
}> = ({ inputs, onPass, onForce }) => {
  const r = useReading(1400);
  const rows = useMemo(() => [
    {
      id: 'TD-01', label: 'Carried technical debt', v: inputs.techDebt, max: 100,
      sev: inputs.techDebt > 38 ? 'HIGH' : inputs.techDebt > 20 ? 'MED' : 'LOW',
      note: 'Modules shipped at speed and never finished.',
    },
    {
      id: 'LD-02', label: 'Peak load reached', v: inputs.peakLoad, max: 100,
      sev: inputs.peakLoad > 85 ? 'HIGH' : inputs.peakLoad > 60 ? 'MED' : 'LOW',
      note: 'Headroom on the busiest night of the year.',
    },
    {
      id: 'CH-03', label: 'Subscriber churn', v: inputs.churnPct * 10, max: 100,
      sev: inputs.churnPct > 4.4 ? 'HIGH' : inputs.churnPct > 3 ? 'MED' : 'LOW',
      note: `${inputs.churnPct.toFixed(1)}% leaving every month.`,
    },
  ], [inputs]);
  const insists = inputs.techDebt > 38;

  return (
    <div className={cx(css.lsscene, css.reg)}>
      <GateCount at={1} />
      <div className={css.lsregwrap}>
        <div className={css.lsreghead}>
          <div><b>ANNEXURE C</b><span>TECHNOLOGY &amp; PLATFORM RISK</span></div>
          <i className={r.done ? (insists ? css.bad : css.ok) : css.live}>
            {r.done ? (insists ? 'DISPUTED' : 'AGREED') : 'DRAFT'}
          </i>
        </div>

        <div className={css.lsregrows}>
          {rows.map((x, i) => (
            <div className={cx(css.lsregrow, css[x.sev.toLowerCase()])} key={x.id}
              style={{ ['--epx-ls-i' as string]: `${i * .09}s` }}>
              <div className={css.lsregtop}>
                <b>{x.id}</b><span>{x.label}</span><i>{x.sev}</i>
              </div>
              <div className={css.lsregbar}>
                <i style={{ width: `${Math.min(100, (x.v / x.max) * 100)}%` }} />
              </div>
              <p>{x.note}</p>
            </div>
          ))}
        </div>

        {!r.reading && <p className={css.lsregsaid}>Annexure C is drafted. Ravi has not read it yet.</p>}
        {r.reading && !r.done && <Reading label="REVIEWING" />}
        {r.done && (
          <div className={cx(css.lsinsert, (insists ? css.bad : ''))}>
            <span>{insists ? 'HE INSISTS ON ONE LINE' : 'HE SIGNED IT AS DRAFTED'}</span>
            <p>
              {insists
                ? '“Parts of the platform were built at speed and have not been completed.”'
                : `“Platform risk disclosed as drafted. ${inputs.techDebt} points of carried debt, peak load ${inputs.peakLoad}%.”`}
            </p>
          </div>
        )}
      </div>

      {!r.reading && <Foot label="SEND HIM THE ANNEXURE" onGo={r.start} />}
      {r.done && (!insists
        ? <Foot label="NEXT GATE →" onGo={onPass} />
        : <Choice
          a={{ title: 'LET THE LINE STAND', note: 'It goes into the filing in his words, and every analyst will quote it.', onPick: onPass }}
          b={{ title: 'STRIKE THE LINE', note: 'The Chief Technology Officer resigned during preparation of this document.', onPick: onForce }} />
      )}
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 5 — THE VOTE                                DIVISION BOARD
   Seven seats, counted in front of you. One call before it opens.
   ============================================================ */
interface Seat { id: string; name: string; kind: string; lean: number }

const seatsOf = (ask: number, f: Fundamentals, marks: number, inputs: IpoInputs): Seat[] => {
  const over = ask / f.fair;
  /* independents care about defensibility; the investor seat cares about the
     raise; your own executives are loyal until the number is indefensible */
  const stretch = over > 1.42 ? -2.2 : over > 1.25 ? -1.1 : over < .74 ? -1.6 : .9;
  const defaults = [
    { id: 's1', name: inputs.founderName || 'You', kind: 'FOUNDER · CHAIR' },
    { id: 's2', name: inputs.executiveNames?.coo || 'Operations Director', kind: 'EXECUTIVE' },
    { id: 's3', name: inputs.executiveNames?.cfo || 'Finance Director', kind: 'EXECUTIVE' },
    { id: 's4', name: 'Helena Brandt', kind: 'INDEPENDENT' },
    { id: 's5', name: 'Alan Wray', kind: 'INDEPENDENT' },
    { id: 's6', name: 'Yusuf Karim', kind: 'INVESTOR SEAT' },
    { id: 's7', name: 'Nomi Reisz', kind: 'INDEPENDENT' },
  ];
  const source = inputs.boardSeats?.length ? [...inputs.boardSeats, ...defaults].slice(0, 7) : defaults;
  return source.map((seat, index) => ({
    ...seat,
    lean: index === 0 ? 3
      : index === 1 ? 2
        : index === 2 ? stretch + 1.2
          : index === 5 ? (over < .74 ? -1.8 : 1.4)
            : stretch + (index === 6 ? .3 : index === 4 ? -.4 : 0) - marks * (index === 4 ? .6 : .5),
  }));
};

const ARGUMENTS = [
  { id: 'a1', label: 'THE MARKET WINDOW', line: 'This window closes in six weeks and it does not reopen this year.', w: 1.1 },
  { id: 'a2', label: 'THE COMPARABLES', line: 'Every listed comparable trades above where we are asking.', w: 1.4 },
  { id: 'a3', label: 'PERSONAL LOYALTY', line: 'I am asking you to back me on this one.', w: .8 },
];

const Board: React.FC<{
  ask: number; f: Fundamentals; marks: number; inputs: IpoInputs;
  onPass: () => void; onRevise: () => void; onForce: () => void;
}> = ({ ask, f, marks, inputs, onPass, onRevise, onForce }) => {
  const base = useMemo(() => seatsOf(ask, f, marks, inputs), [ask, f, marks, inputs]);
  const [lobbied, setLobbied] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const [resolved, setResolved] = useState(-1);
  const [reply, setReply] = useState<string | null>(null);

  const seats = base.map(s => ({ ...s, lean: s.lean + (lobbied[s.id] ?? 0) }));
  const voting = resolved >= 0;
  const shown = seats.slice(0, Math.max(0, resolved));
  const forCount = shown.filter(s => s.lean > 0).length;
  const againstCount = shown.length - forCount;
  const finished = resolved >= seats.length;
  const carried = seats.filter(s => s.lean > 0).length >= 4;

  useEffect(() => {
    if (!voting || finished) return;
    const id = window.setTimeout(() => setResolved(n => n + 1), 640);
    return () => clearTimeout(id);
  }, [voting, resolved, finished]);

  const lobby = (arg: typeof ARGUMENTS[number]) => {
    if (!target) return;
    const s = base.find(x => x.id === target)!;
    /* you cannot argue a hard no into a yes — only somebody already close */
    const swayable = s.lean > -1.5 && s.lean < 1;
    const moved = swayable ? arg.w : arg.w * .2;
    setLobbied(l => ({ ...l, [s.id]: moved }));
    setUsed(true);
    setReply(swayable && s.lean + moved > 0
      ? '“All right. I will vote for it. I want the window in the minutes as the reason.”'
      : s.lean >= 1
        ? '“You already have me. You have spent your call on the wrong person.”'
        : '“I have read the same numbers you have. It does not change my vote.”');
    setTarget(null);
  };

  return (
    <div className={cx(css.lsscene, css.div)}>
      <GateCount at={2} />
      <div className={css.lsdivwrap}>
        <div className={css.lsdivhead}>
          <span>RESOLUTION 4 · APPROVAL OF THE INDICATIVE VALUATION</span>
          <b>{money(ask)}</b>
        </div>

        <div className={css.lstally}>
          <div className={cx(css.lstallyside, css.for)}><span>FOR</span><b>{forCount}</b></div>
          <div className={css.lstallymid}><i>CARRIES ON</i><em>4</em></div>
          <div className={cx(css.lstallyside, css.against)}><span>AGAINST</span><b>{againstCount}</b></div>
        </div>

        <div className={css.lsseats}>
          {seats.map((s, i) => {
            const done = i < resolved;
            const cls = !done ? 'pending' : s.lean > 0 ? 'for' : 'against';
            return (
              <button className={cx(css.lsseat, css[cls], (target === s.id ? css.targeted : ''))} key={s.id}
                disabled={voting || used || s.id === 's1'}
                onClick={() => setTarget(t => t === s.id ? null : s.id)}>
                <i />
                <div><b>{s.name}</b><span>{s.kind}</span></div>
                <em>{!done ? '—' : s.lean > 0 ? 'FOR' : 'AGAINST'}</em>
              </button>
            );
          })}
        </div>

        {reply && <p className={css.lsdivreply}>{reply}</p>}
        {finished && (
          <div className={cx(css.lsdivresult, (carried ? css.ok : css.bad))}>
            {carried ? 'CARRIED' : 'NOT CARRIED'}
          </div>
        )}
      </div>

      {target && !voting && (
        <div className={css.lslobby}>
          <span>ONE CALL · {base.find(s => s.id === target)!.name.toUpperCase()}</span>
          {ARGUMENTS.map(a => (
            <button key={a.id} onClick={() => lobby(a)}>
              <b>{a.label}</b><em>“{a.line}”</em>
            </button>
          ))}
        </div>
      )}

      {!voting && !target && (
        <Foot label="OPEN THE VOTE"
          note={used ? 'Your call is made. The vote is what it is now.'
            : 'You may call one director before the vote opens. Tap a seat.'}
          onGo={() => setResolved(0)} />
      )}
      {finished && (carried
        ? <Foot label="NEXT GATE →" onGo={onPass} />
        : <Choice
          a={{ title: 'LOWER THE ASK', note: 'Back to the model. The vote is struck from the minutes.', onPick: onRevise }}
          b={{ title: 'PROCEED REGARDLESS', note: 'An independent director resigned prior to filing, citing the indicative valuation.', onPick: onForce }} />
      )}
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 6 — THE SYNDICATE                           DESK
   Three houses bidding against each other, live. Not three leaflets.
   ============================================================ */
const Syndicate: React.FC<{
  ask: number; f: Fundamentals; shares: number; preIpoShares: number; marks: number;
  bankId: string | null; setBankId: (s: string) => void;
  onGo: (firm: boolean) => void;
}> = ({ ask, f, shares, preIpoShares, marks, bankId, setBankId, onGo }) => {
  const [t, setT] = useState(0);
  const raf = useRef(0);

  /* Capping every house at your ask made all three print the same number.
     A house's bid is its OWN view of what the company is worth — that is what
     a pitch is — and it will only firm-commit if that view covers your ask. */
  const bids = useMemo(() => BANKS.map((b, i) => {
    const view = f.fair * [1.52, .86, 1.14][i] * (1 - marks * .08);
    return { ...b, bid: view, firm: b.firm && view >= ask };
  }), [ask, f.fair, marks]);

  useEffect(() => {
    const start = performance.now(); const DUR = 3400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    /* rAF stalls in a backgrounded tab, so a timer has to finish it either way */
    const guard = window.setTimeout(() => setT(1), DUR + 400);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(guard); };
  }, []);

  const settled = t >= 1;
  const picked = bids.find(b => b.id === bankId);
  const price = ask / (preIpoShares + shares);

  return (
    <div className={cx(css.lsscene, css.desk)}>
      <GateCount at={3} />
      <div className={css.lsdeskwrap}>
        <div className={css.lsdeskhead}>
          <div><b>SYNDICATE DESK</b><span>THREE HOUSES · ONE BOOK</span></div>
          <i className={settled ? '' : css.live}>{settled ? 'SETTLED' : 'BIDDING'}</i>
        </div>

        <div className={css.lsbids}>
          {bids.map((b, i) => {
            const p = Math.max(0, Math.min(1, (t - i * .1) / .78));
            const shownBid = b.bid * (.62 + .38 * p);
            const on = bankId === b.id;
            return (
              <button key={b.id} className={cx(css.lsbid, (on ? css.on : ''))}
                disabled={!settled} onClick={() => setBankId(b.id)}>
                <div className={css.lsbidtop}><b>{b.name}</b><span>{b.desk}</span></div>
                <div className={css.lsbidnum}>
                  <em>{money(shownBid)}</em>
                  <i className={settled ? (b.firm ? css.firm : css.best) : css.wait}>
                    {settled ? (b.firm ? 'FIRM BOOK' : 'BEST EFFORTS') : 'WORKING'}
                  </i>
                </div>
                <div className={css.lsbidbar}>
                  <i className={b.firm ? css.firm : css.best}
                    style={{ width: `${Math.min(100, (shownBid / (ask * 1.6)) * 100)}%` }} />
                  <u style={{ left: `${(1 / 1.6) * 100}%` }}><em>YOUR ASK</em></u>
                </div>
                {settled && (
                  <div className={css.lsbidfoot}>
                    <span>FEE {b.feePct}%</span>
                    <span>NET {money(shares * price * (1 - b.feePct / 100))}</span>
                    {on && <span className={css.picked}>APPOINTED</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className={css.lsdesknote}>
          {!settled ? 'They are pricing your book against their own balance sheets.'
            : picked ? picked.line
              : 'Each house is showing what it thinks the company is worth. A high number is not a promise — only a firm book puts their own money behind yours.'}
        </p>
      </div>
      <Foot label="APPOINT AND CONTINUE →" disabled={!bankId || !settled}
        onGo={() => onGo(!!picked?.firm)} />
    </div>
  );
};

/* ============================================================
   CHAPTER 01 · 7 — THE NUMBER STANDS                       ROOM
   The marks stamp themselves onto the cover, one at a time.
   ============================================================ */
const Stands: React.FC<{
  brand: Brand; ask: number; shares: number; preIpoShares: number; marks: Mark[]; onGo: () => void;
}> = ({ brand, ask, shares, preIpoShares, marks, onGo }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= marks.length) return;
    const id = window.setTimeout(() => setN(x => x + 1), 720);
    return () => clearTimeout(id);
  }, [n, marks.length]);
  const price = ask / (preIpoShares + shares);

  return (
    <div className={cx(css.lsscene, css.room)}>
      <div className={css.lscover}>
        <div className={css.lscoverhead}>
          <span>DRAFT PROSPECTUS · COVER</span>
          <b>{(brand.name || 'EMPIRE+').toUpperCase()}</b>
        </div>
        <div className={css.lscovernum}>
          <span>INDICATIVE VALUATION</span>
          <b>{money(ask)}</b>
          <em>{mn(shares)} shares at {dollars(price)}</em>
        </div>
        <div className={css.lscovermarks}>
          {marks.slice(0, n).map(m => (
            <div className={css.lscovermark} key={m.id}><i />{m.short}</div>
          ))}
          {marks.length === 0 && (
            <p className={css.lscoverclean}>Signed by everyone who had to sign it. Nothing was forced.</p>
          )}
        </div>
      </div>
      <Foot label="FILE THE DOCUMENT →" onGo={onGo}
        note={marks.length
          ? `${marks.length === 1 ? 'One objection is' : `${marks.length} objections are`} printed on the cover of your own prospectus.`
          : undefined} />
    </div>
  );
};

/* ============================================================
   CHAPTER 02 · 1 — DUE DILIGENCE                          DATA ROOM
   The auditors go through your actual history. Findings surface one at a
   time, then you decide how many weeks of the window you will burn.
   ============================================================ */
export interface Finding {
  id: string; label: string; detail: string; sev: 'HIGH' | 'MED' | 'LOW'; weeks: number;
}

export const findingsOf = (inp: IpoInputs, marks: Mark[]): Finding[] => {
  const out: Finding[] = [];
  if (inp.techDebt > 20) out.push({
    id: 'DD-01', sev: inp.techDebt > 38 ? 'HIGH' : 'MED', weeks: inp.techDebt > 38 ? 3 : 1,
    label: 'Unfinished platform work capitalised as an asset',
    detail: `${inp.techDebt} points of carried debt were booked as development spend rather than expensed.`,
  });
  if (inp.churnPct > 3.4) out.push({
    id: 'DD-02', sev: inp.churnPct > 4.4 ? 'HIGH' : 'MED', weeks: 2,
    label: 'Subscriber count includes lapsed accounts',
    detail: `At ${inp.churnPct.toFixed(1)}% monthly churn the headline figure counts accounts that have already stopped paying.`,
  });
  inp.risks.slice(0, 2).forEach((r, i) => out.push({
    id: `DD-0${3 + i}`, sev: 'MED', weeks: 1, label: r.label, detail: r.detail,
  }));
  marks.forEach(m => out.push({
    id: `DD-${m.id.toUpperCase()}`, sev: 'HIGH', weeks: 2, label: m.short, detail: m.label,
  }));
  out.push({
    id: 'DD-09', sev: 'LOW', weeks: 0,
    label: 'Related-party content commitments',
    detail: 'Two output deals were signed without a competitive process. Immaterial, but it goes in the document.',
  });
  return out;
};

const Diligence: React.FC<{
  inputs: IpoInputs; marks: Mark[]; weeks: number; setWeeks: (n: number) => void; onGo: () => void;
}> = ({ inputs, marks, weeks, setWeeks, onGo }) => {
  const rival = inputs.rivals[0] ?? 'a rival';
  const findings = useMemo(() => findingsOf(inputs, marks), [inputs, marks]);
  const [n, setN] = useState(0);
  const done = n >= findings.length;

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setN(x => x + 1), 540);
    return () => clearTimeout(id);
  }, [n, done]);

  const fixable = findings.filter(x => x.weeks > 0);
  const total = fixable.reduce((s, x) => s + x.weeks, 0);
  /* weeks are spent on the worst findings first, which is what anybody would do */
  const order = [...fixable].sort((a, b) => b.weeks - a.weeks);
  let spent = 0, cleaned = 0;
  for (const x of order) { if (spent + x.weeks <= weeks) { spent += x.weeks; cleaned++; } }
  const windowLeft = Math.max(0, 100 - weeks * 9);

  return (
    <div className={cx(css.lsscene, css.reg)}>
      <div className={cx(css.lsregwrap, css.nocount)}>
        <What label="WHY YOU ARE HERE">
          Before anyone is allowed to sell you to the public, auditors go through
          everything you have ever done and write down what is wrong with it.
          Whatever you do not fix gets printed in your own prospectus for every
          investor to read.
        </What>

        <div className={css.lsreghead}>
          <div><b>THE FINDINGS</b><span>{done ? `${findings.length} PROBLEMS FOUND` : 'SEARCHING YOUR BOOKS'}</span></div>
          <i className={done ? css.bad : css.live}>{done ? 'DONE' : 'WORKING'}</i>
        </div>

        <div className={css.lsfinds}>
          {findings.slice(0, n).map(x => (
            <div className={cx(css.lsfind, css[x.sev.toLowerCase()])} key={x.id}>
              <div className={css.lsfindtop}>
                <b>{x.id}</b>
                <i>{x.sev === 'HIGH' ? 'SERIOUS' : x.sev === 'MED' ? 'AWKWARD' : 'MINOR'}</i>
              </div>
              <span>{x.label}</span>
              <p>{x.detail}</p>
              <em className={css.lsfindfix}>
                {x.weeks === 0 ? 'Cannot be fixed — it goes in the document either way.'
                  : `Fixable in ${x.weeks} week${x.weeks > 1 ? 's' : ''}.`}
              </em>
            </div>
          ))}
          {!done && <div className={css.lsfindscan}><i /></div>}
        </div>

        {done && (
          <div className={css.lsremed}>
            <What label="NOW DECIDE">
              You can delay the listing and fix some of these, or file today and let
              investors read them. But the market only stays willing to buy for so
              long — every week you spend fixing is a week that window closes.
            </What>

            <div className={css.lsremedhead}>
              <span>DELAY THE LISTING BY</span>
              <b>{weeks} {weeks === 1 ? 'WEEK' : 'WEEKS'}</b>
            </div>
            <input className={css.lstermdial} type="range" min={0} max={Math.max(1, total)} step={1}
              value={weeks} onChange={e => setWeeks(+e.target.value)} />

            <div className={css.lsremedout}>
              <div><span>PROBLEMS FIXED</span><b className={css.ok}>{cleaned}/{fixable.length}</b></div>
              <div><span>INVESTORS WILL READ</span>
                <b className={fixable.length - cleaned ? css.bad : css.ok}>{findings.length - cleaned}</b></div>
              <div><span>BUYERS STILL WAITING</span>
                <b className={windowLeft > 70 ? css.ok : windowLeft > 40 ? css.warn : css.bad}>{windowLeft}%</b></div>
            </div>

            {weeks >= 5 && (
              <div className={css.lsrival}>
                <b>WHILE YOU WERE DRAFTING</b>
                <p>
                  {rival.toUpperCase()} filed and priced in the time you spent on this.
                  They took the money that was waiting, and the investors who bought them
                  are not buying you as well.
                </p>
              </div>
            )}
            <p className={css.lsremednote}>
              {weeks === 0
                ? `You fix nothing and file today. All ${findings.length} findings go into the prospectus exactly as written above.`
                : windowLeft <= 40
                  ? `You clean up ${cleaned}, but you have spent most of the window. A rival can list into the demand while you are still drafting.`
                  : `You clean up ${cleaned} of ${fixable.length}, and ${findings.length - cleaned} still go in the document.`}
            </p>
          </div>
        )}
      </div>
      {done && <Foot label="WRITE THE PROSPECTUS →" onGo={onGo}
        note="The prospectus is the document every investor reads before deciding." />}
    </div>
  );
};

/* ============================================================
   CHAPTER 02 · 2 — THE PROSPECTUS                         PAPER (rationed)
   ============================================================ */
const Filing: React.FC<{
  brand: Brand; inputs: IpoInputs; ticker: string;
  omit: Record<string, boolean>;
  setOmit: (f: (o: Record<string, boolean>) => Record<string, boolean>) => void;
  onGo: () => void;
}> = ({ brand, inputs, ticker, omit, setOmit, onGo }) => {
  const hidden = inputs.risks.filter(r => omit[r.id]);
  return (
    <div className={cx(css.lsscene, css.paper)}>
      <div className={css.lssheet}>
        <div className={css.lsletterhead}>
          <b>FORM S-1 · REGISTRATION STATEMENT</b>
          <span>{(brand.name || 'EMPIRE+').toUpperCase()} · PROPOSED SYMBOL {ticker}</span>
        </div>
        <span className={css.lsdoclabel}>RISK FACTORS</span>
        <p className={css.lsdocbody}>
          Tell them and the number bleeds. Keep it and the number holds — and it goes into
          a drawer the regulator is about to open.
        </p>
        {inputs.risks.map(r => (
          <div className={cx(css.lsrisk, (omit[r.id] ? css.struck : ''))} key={r.id}>
            <span className={css.lsrisktitle}><b>{r.label}</b><i className={css.lsstrike} /></span>
            <p>{r.detail}</p>
            <div className={css.lsriskacts}>
              <button className={!omit[r.id] ? css.on : ''}
                onClick={() => setOmit(o => ({ ...o, [r.id]: false }))}>DISCLOSE</button>
              <button className={omit[r.id] ? cx(css.on, css.hide) : ''}
                onClick={() => setOmit(o => ({ ...o, [r.id]: true }))}>OMIT</button>
            </div>
          </div>
        ))}
        <div className={cx(css.lsdrawer, (hidden.length ? css.has : ''))}>
          <span>THE DRAWER</span>
          {hidden.length === 0
            ? <em>Empty. Everything is in the filing.</em>
            : <em>{hidden.length} sealed. Still true.</em>}
        </div>
      </div>
      <Foot label="FILE WITH THE REGULATOR →" onGo={onGo} />
    </div>
  );
};

/* ============================================================
   CHAPTER 02 · 3 — THE REGULATOR                          STATE
   They never approve your price. They decide whether you may ask.
   ============================================================ */
type Answer = 'FULL' | 'BRIEF' | 'RESTATE';
export interface Query { id: string; n: number; text: string; heavy: boolean }

export const queriesOf = (inp: IpoInputs, omit: Record<string, boolean>, marks: Mark[]): Query[] => {
  const q: Query[] = [];
  let n = 1;
  const add = (text: string, heavy = false) => q.push({ id: `q${n}`, n: n++, text, heavy });
  add('Set out the basis on which the indicative valuation has been arrived at, with supporting workings.', true);
  inp.risks.filter(r => omit[r.id]).forEach(r =>
    add(`Confirm whether the matter described as “${r.label.toLowerCase()}” is material and, if so, why it is not disclosed.`, true));
  marks.forEach(m =>
    add(`Explain the circumstances recorded as: ${m.short.toLowerCase()}.`, true));
  add('State the method used to count subscribers, and whether lapsed accounts are included.');
  add("Provide the auditor's statement on capitalised development expenditure.");
  add("Confirm the founder's holding and voting rights following the issue.");
  return q;
};

const Regulator: React.FC<{
  brand: Brand; queries: Query[]; ask: number; attempt: number;
  answers: Record<string, Answer>;
  setAnswers: (f: (a: Record<string, Answer>) => Record<string, Answer>) => void;
  onGo: (v: { cleared: boolean; weeks: number; cut: number }) => void;
}> = ({ brand, queries, ask, attempt, answers, setAnswers, onGo }) => {
  const [sent, setSent] = useState(false);
  const r = useReading(1800);

  const answered = queries.filter(q => answers[q.id]).length;
  const all = answered >= queries.length;
  const weeks = queries.reduce((s, q) =>
    s + (answers[q.id] === 'FULL' ? 2 : answers[q.id] === 'RESTATE' ? 1 : 0), 0);
  const thin = queries.filter(q => answers[q.id] === 'BRIEF' && q.heavy).length;
  const restated = queries.filter(q => answers[q.id] === 'RESTATE').length;
  const cut = restated * .06;
  const returned = thin >= 2;

  return (
    <div className={cx(css.lsscene, css.state)}>
      <div className={css.lsstatewrap}>
        <div className={css.lsstatehead}>
          <div className={css.lscrest}><i /><i /><i /></div>
          <div>
            <b>SECURITIES &amp; MARKETS BOARD</b>
            <span>OFFICE OF CORPORATE FINANCE</span>
          </div>
        </div>
        <div className={css.lsstatemeta}>
          <div><span>FILE</span><b>SMB/CF/{String(queries.length * 137).padStart(5, '0')}</b></div>
          <div><span>SUBJECT</span><b>{(brand.name || 'EMPIRE+').toUpperCase()}</b></div>
          <div><span>OBSERVATIONS</span><b>{queries.length}</b></div>
        </div>

        {!sent && (
          <>
            <p className={css.lsstatebody}>
              The Board has examined the draft registration statement{attempt > 1 ? ' as re-filed' : ''}.
              The following observations are issued under Regulation 22. A response is required
              before the statement may be circulated.
            </p>
            <p className={css.lsstatenote}>
              The Board does not approve, endorse or comment upon the valuation sought. It
              determines only whether the company may ask.
            </p>
            <div className={css.lsqueries}>
              {queries.map(q => (
                <div className={cx(css.lsquery, (answers[q.id] ? css.answered : ''), (q.heavy ? css.heavy : ''))}
                  key={q.id}>
                  <div className={css.lsquerytop}>
                    <b>{String(q.n).padStart(2, '0')}</b><p>{q.text}</p>
                  </div>
                  <div className={css.lsqueryacts}>
                    {(['FULL', 'BRIEF', 'RESTATE'] as Answer[]).map(a => (
                      <button key={a} className={answers[q.id] === a ? css.on : ''}
                        onClick={() => setAnswers(x => ({ ...x, [q.id]: a }))}>
                        {a === 'FULL' ? 'IN FULL' : a === 'BRIEF' ? 'BRIEFLY' : 'RESTATE'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {sent && !r.done && <Reading label="UNDER EXAMINATION" />}

        {sent && r.done && (
          <div className={cx(css.lsstateverdict, (returned ? css.bad : css.ok))}>
            <Stamp text={returned ? 'RETURNED' : 'OBSERVATIONS ISSUED'} kind={returned ? 'bad' : 'ok'} on />
            <p>
              {returned
                ? 'Two or more material observations were answered without substance. The statement is returned for re-filing, and the return is a matter of public record.'
                : `The statement may be circulated. ${weeks} week${weeks === 1 ? '' : 's'} were spent answering${restated ? `, and ${restated} figure${restated > 1 ? 's were' : ' was'} restated — taking ${money(ask * cut)} off the indicative valuation.` : ', and nothing was restated.'}`}
            </p>
          </div>
        )}
      </div>

      {!sent && (
        <Foot label={`RESPOND TO THE BOARD · ${answered}/${queries.length}`} disabled={!all}
          note={all ? undefined : 'Every observation has to be answered before it goes back.'}
          onGo={() => { setSent(true); r.start(); }} />
      )}
      {sent && r.done && (
        <Foot label={returned ? 'ANSWER THEM AGAIN →' : 'CLEARED TO CIRCULATE →'}
          onGo={() => onGo({ cleared: !returned, weeks, cut })} />
      )}
    </div>
  );
};


/* ============================================================
   CHAPTER 03 · 1 — THE PRICE BAND                        TERMINAL
   You do not sell at one price. You publish a range, and the range itself
   says something about how sure you are.
   ============================================================ */
const Band: React.FC<{
  price: number; shares: number; lo: number; hi: number;
  setLo: (n: number) => void; setHi: (n: number) => void;
  staffPct: number; setStaffPct: (n: number) => void; onGo: () => void;
}> = ({ price, shares, lo, hi, setLo, setHi, staffPct, setStaffPct, onGo }) => {
  /* one scale for both handles */
  const sMin = Math.round(price * .6 * 100) / 100;
  const sMax = Math.round(price * 1.5 * 100) / 100;
  const pos = (v: number) => ((v - sMin) / (sMax - sMin)) * 100;
  const width = ((hi - lo) / ((lo + hi) / 2)) * 100;
  const band = width < 6 ? 'tight' : width <= 18 ? 'ok' : 'wide';
  const note = band === 'tight'
    ? 'Too narrow. If demand runs hot you have nowhere to price into, and you leave the money on the table.'
    : band === 'wide'
      ? 'Too wide. A range this loose tells the market you do not know what you are worth.'
      : 'A working range. Wide enough to absorb demand, tight enough to look certain.';

  return (
    <div className={cx(css.lsscene, css.term)}>
      <div className={css.lstermwrap}>
        <What label="THE PRICE BAND">
          You do not sell at one price. You publish a range, and investors bid inside it.
          Where it finally prices depends on how much demand turns up.
        </What>
        <div className={css.lsbandbox}>
          <div className={css.lsbandnums}>
            <div><span>FLOOR</span><b>{dollars(lo)}</b></div>
            <i className={css[band] ?? band}>{width.toFixed(0)}% WIDE</i>
            <div className={css.r}><span>CAP</span><b>{dollars(hi)}</b></div>
          </div>
          <div className={css.lsbandtrack}>
            <i style={{ left: `${pos(lo)}%`, right: `${100 - pos(hi)}%` }} />
            <u style={{ left: `${pos(price)}%` }} />
          </div>
          <p className={css.lsbandmodel}>Your model priced it at <b>{dollars(price)}</b></p>
          <label className={css.lsbandrow}><span>FLOOR</span>
            <input className={css.lstermdial} type="range" min={sMin} max={sMax} step={.05}
              value={lo} onChange={e => setLo(Math.min(+e.target.value, hi - .2))} />
          </label>
          <label className={css.lsbandrow}><span>CAP</span>
            <input className={css.lstermdial} type="range" min={sMin} max={sMax} step={.05}
              value={hi} onChange={e => setHi(Math.max(+e.target.value, lo + .2))} />
          </label>
        </div>
        <div className={cx(css.lsoutgrid, css.two)}>
          <div><span>RAISE AT FLOOR</span><b>{money(shares * lo)}</b></div>
          <div><span>RAISE AT CAP</span><b className={css.ok}>{money(shares * hi)}</b></div>
        </div>
        <div className={cx(css.lstermnote, (band === 'ok' ? css.ok : css.warn))}><p>{note}</p></div>

        {/* the staff quota — real, and nobody dramatises it */}
        <What label="YOUR OWN PEOPLE">
          You can hold back part of the offer for the people who built this, at a
          discount to whatever it prices at. It costs you cash and it is the only
          thing in this whole process they will remember.
        </What>
        <div className={css.lsbandbox}>
          <div className={css.lsremedhead}>
            <span>RESERVED FOR STAFF</span>
            <b>{staffPct}%</b>
          </div>
          <input className={css.lstermdial} type="range" min={0} max={8} step={1}
            value={staffPct} onChange={e => setStaffPct(+e.target.value)} />
          <div className={css.lsremedout}>
            <div><span>SHARES TO STAFF</span>
              <b>{mn(shares * staffPct / 100)}</b></div>
            <div><span>AT A DISCOUNT OF</span><b>{staffPct ? '10%' : '—'}</b></div>
            <div><span>COSTS YOU</span>
              <b className={staffPct > 5 ? css.warn : ''}>{money(shares * staffPct / 100 * hi * .1)}</b></div>
          </div>
          <p className={css.lsremednote}>
            {staffPct === 0
              ? 'Nothing set aside. Every share goes to strangers, and the building will notice.'
              : staffPct >= 6
                ? 'Generous to the point that the bankers will ask you to justify it.'
                : 'A normal allocation. It will be remembered.'}
          </p>
        </div>
      </div>
      <Foot label="PUBLISH THE BAND →" onGo={onGo} />
    </div>
  );
};

/* ============================================================
   CHAPTER 03 · 2 — THE ANCHOR BOOK                       DESK
   The day before it opens, the big institutions commit. One of them will
   ask you for a discount, and every retail investor will see that you gave it.
   ============================================================ */
interface Anchor { id: string; name: string; kind: string; want: number; discount?: boolean }
const ANCHORS: Anchor[] = [
  { id: 'a1', name: 'Kestrel Long Fund', kind: 'LONG ONLY', want: .22 },
  { id: 'a2', name: 'Northgate Growth', kind: 'GROWTH', want: .17 },
  { id: 'a3', name: 'Ardent Holdings', kind: 'SOVEREIGN', want: .26, discount: true },
  { id: 'a4', name: 'Bellcourt Partners', kind: 'MULTI-STRATEGY', want: .14 },
];

const AnchorBook: React.FC<{
  hi: number; shares: number; marks: number;
  gave: boolean | null; setGave: (b: boolean) => void; onGo: () => void;
}> = ({ hi, shares, marks, gave, setGave, onGo }) => {
  const [n, setN] = useState(0);
  const list = useMemo(() => ANCHORS.map(a => ({
    ...a, in: a.discount ? gave !== false : true,
    take: Math.round(shares * .4 * a.want * (1 - marks * .06)),
  })), [gave, shares, marks]);
  const done = n >= list.length;

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setN(x => x + 1), 700);
    return () => clearTimeout(id);
  }, [n, done]);

  const asked = done && gave === null;
  const filled = list.slice(0, n).filter(a => a.in).reduce((s, a) => s + a.take, 0);
  const target = Math.round(shares * .4);
  const price = gave ? hi * .96 : hi;

  return (
    <div className={cx(css.lsscene, css.desk)}>
      <div className={css.lsdeskwrap}>
        <What label="THE ANCHOR BOOK">
          The day before anyone else can buy, the biggest institutions commit. Their names
          are published, and everybody else decides whether to follow them.
        </What>

        <div className={css.lsanchorbar}>
          <div><span>ANCHOR PORTION</span><b>{Math.round((filled / target) * 100)}%</b></div>
          <div className={css.lsanchortrack}>
            <i style={{ width: `${Math.min(100, (filled / target) * 100)}%` }} />
          </div>
        </div>

        <div className={css.lsbids}>
          {list.slice(0, n).map(a => (
            <div className={cx(css.lsbid, css.still, (a.in ? '' : css.out))} key={a.id}>
              <div className={css.lsbidtop}><b>{a.name}</b><span>{a.kind}</span></div>
              <div className={css.lsbidnum}>
                <em>{a.in ? money(a.take * price) : '—'}</em>
                <i className={a.in ? css.firm : css.best}>
                  {a.in ? `${a.take.toLocaleString()} SHARES` : 'WITHDREW'}
                </i>
              </div>
            </div>
          ))}
        </div>

        {asked && (
          <div className={cx(css.lsinsert, css.bad)}>
            <span>ARDENT HOLDINGS WANTS 4% OFF</span>
            <p>“We will anchor the book at four per cent under the cap. You get the name on
              the cover. Everybody else finds out we paid less than they will.”</p>
          </div>
        )}
        {done && gave !== null && (
          <div className={cx(css.lstermnote, (gave ? css.warn : css.ok))}>
            <p>{gave
              ? `You gave the discount. The book is anchored, and the price everyone else pays is ${dollars(hi)} against their ${dollars(price)}.`
              : `You held the price. Ardent walked, and the anchor portion is ${Math.round((filled / target) * 100)}% covered without them.`}</p>
          </div>
        )}
      </div>

      {asked
        ? <Choice
          a={{ title: 'HOLD THE PRICE', note: 'They walk. The book is thinner, and it is clean.', onPick: () => setGave(false) }}
          b={{ title: 'GIVE THE DISCOUNT', note: 'They anchor. Retail investors will see what they paid.', onPick: () => setGave(true) }} />
        : done && gave !== null
          ? <Foot label="GO ON AIR →" onGo={onGo} />
          : <Foot label="WAITING ON THE BOOK" disabled onGo={() => { }} />}
    </div>
  );
};

/* ============================================================
   CHAPTER 03 · 3 — THE INTERVIEW                         CHANNEL-ADJACENT
   Live. The question you did not want, three answers, and the number moving
   under you while you are still speaking.
   ============================================================ */
interface Ask3 { q: string; a: { k: string; line: string; mv: number }[] }

const interviewOf = (inp: IpoInputs, marks: Mark[], gave: boolean | null): Ask3[] => {
  const out: Ask3[] = [];
  if (marks.length) out.push({
    q: `Your own ${marks[0].short.toLowerCase().startsWith('cfo') ? 'finance chief' : 'board'} would not sign this. Why should we?`,
    a: [
      { k: 'OWN IT', line: 'They were right to say so, and I overruled them. That is what the job is.', mv: .04 },
      { k: 'DEFLECT', line: 'Internal process is internal process. The numbers are in the document.', mv: -.05 },
      { k: 'ATTACK', line: 'Every company that ever mattered had somebody in the room who said no.', mv: -.01 },
    ],
  });
  out.push({
    q: `Churn is ${inp.churnPct.toFixed(1)}%. What does this look like in three years?`,
    a: [
      { k: 'CANDOUR', line: 'Honestly? It depends on two shows we have not made yet.', mv: .05 },
      { k: 'CONFIDENCE', line: 'Four territories, an owned pipeline, and nobody able to price under us.', mv: .02 },
      { k: 'DEFLECT', line: 'We do not give three-year guidance.', mv: -.06 },
    ],
  });
  if (gave) out.push({
    q: 'You gave your anchor four per cent off. What do you say to somebody paying full price tomorrow?',
    a: [
      { k: 'OWN IT', line: 'That they are buying the same company, and I wanted that name on the cover.', mv: .01 },
      { k: 'DEFLECT', line: 'Anchor terms are standard practice.', mv: -.04 },
      { k: 'CANDOUR', line: 'That I would rather not have. It was the price of getting the book away.', mv: .03 },
    ],
  });
  return out;
};

const Interview: React.FC<{
  inputs: IpoInputs; marks: Mark[]; gave: boolean | null;
  price: number; onGo: (mv: number) => void;
}> = ({ inputs, marks, gave, price, onGo }) => {
  const qs = useMemo(() => interviewOf(inputs, marks, gave), [inputs, marks, gave]);
  const [i, setI] = useState(0);
  const [mv, setMv] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  const q = qs[Math.min(i, qs.length - 1)];
  const done = i >= qs.length;
  const shown = price * (1 + mv);

  return (
    <div className={cx(css.lsscene, css.air)}>
      <div className={css.lsairtop}>
        <div className={css.ndbug}><i />ON AIR</div>
        <div className={css.lsairprice}>
          <span>IMPLIED</span>
          <b className={mv >= 0 ? css.up : css.down}>{dollars(shown)}</b>
          <em className={mv >= 0 ? css.up : css.down}>{pctS(mv * 100)}</em>
        </div>
      </div>

      <div className={css.lsairwrap}>
        {!done ? (
          <>
            <span className={css.lsairwho}>GRACE ADEYEMI · THE MARKET DESK</span>
            <h2 className={css.lsairq}>{q.q}</h2>
            {said && <p className={css.lsairsaid}>“{said}”</p>}
            <div className={css.lsairas}>
              {q.a.map(a => (
                <button key={a.k} onClick={() => {
                  setSaid(a.line); setMv(m => m + a.mv);
                  window.setTimeout(() => { setSaid(null); setI(x => x + 1); }, 1400);
                }} disabled={!!said}>
                  <b>{a.k}</b><em>“{a.line}”</em>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={css.lsairend}>
            <span className={css.lseyebrow}>OFF AIR</span>
            <h2 className={css.lsroomhead}>{dollars(shown)}</h2>
            <p className={css.lsroomsub}>
              {mv >= .04 ? 'You were better than the document. The book opens tomorrow with the wind behind it.'
                : mv >= 0 ? 'No damage. The number is where it was.'
                  : 'That did not go well, and it went out live.'}
            </p>
          </div>
        )}
      </div>

      {done && <Foot label="OPEN THE BOOK →" onGo={() => onGo(mv)} />}
    </div>
  );
};


/* ============================================================
   CHAPTER 04 · 1 — THE BOOK                               DESK
   Three days. Three kinds of buyer. You cannot do a single thing about any
   of it, and that is the entire point of the act.
   ============================================================ */
export interface BookResult { cover: number; buckets: number[]; price: number; extended: boolean }

export interface StreamingListingCheckpoint {
  scene: Scene;
  ask: number;
  shares: number;
  revision: number;
  bankId: string | null;
  marks: Mark[];
  omit: Record<string, boolean>;
  answers: Record<string, Answer>;
  attempt: number;
  diligenceWeeks: number;
  cut: number;
  lowPrice: number;
  highPrice: number;
  anchorDiscountAccepted: boolean | null;
  employeeQuotaPercent: number;
  interviewMove: number;
  book: BookResult | null;
  closePrice: number;
  ticker: string;
}

const BUCKETS = [
  { id: 'qib', label: 'INSTITUTIONS', note: 'Funds and insurers. They decide the price.' },
  { id: 'hni', label: 'LARGE INVESTORS', note: 'Wealthy individuals, borrowing to bid.' },
  { id: 'ret', label: 'THE PUBLIC', note: 'Ordinary people, in small amounts.' },
];

const Book: React.FC<{
  lo: number; hi: number; shares: number; marks: number; airMv: number;
  gave: boolean | null; windowLeft: number; greyBias: number;
  onGo: (r: BookResult) => void;
}> = ({ lo, hi, shares, marks, airMv, gave, windowLeft, greyBias, onGo }) => {
  const [day, setDay] = useState(0);
  const [extended, setExtended] = useState(false);

  /* how covered the book gets, built out of every decision you already made */
  const strength = useMemo(() => {
    let x = 1.15;
    x -= marks * .17;
    x += airMv * 4;
    x += gave ? .18 : gave === false ? -.05 : 0;
    x *= .55 + (windowLeft / 100) * .45;
    /* and if a rival got away while you were drafting, they took buyers with them */
    if (windowLeft <= 55) x *= .88;
    return Math.max(.18, x);
  }, [marks, airMv, gave, windowLeft]);

  const days = extended ? 4 : 3;
  const shape = [.16, .48, 1, 1.18];
  const mult = [1.35, .82, .6];
  const cov = (b: number, d: number) => strength * mult[b] * shape[Math.min(d, 3)];
  const buckets = BUCKETS.map((_, b) => cov(b, day - 1));
  const overall = buckets.reduce((s, x, i) => s + x * [.5, .15, .35][i], 0);
  const running = day > 0 && day < days;
  const closed = day >= days;

  useEffect(() => {
    if (day === 0 || closed) return;
    const id = window.setTimeout(() => setDay(d => d + 1), 2600);
    return () => clearTimeout(id);
  }, [day, closed]);

  /* the grey market front-runs the listing, with its own error */
  const greyPrem = (overall - 1) * hi * .34 + greyBias * hi;

  /* where it prices: demand inside your own band, nowhere else */
  const price = overall >= 1.6 ? hi : overall >= 1 ? lo + (hi - lo) * ((overall - 1) / .6) : lo;
  const canExtend = closed && !extended && overall < 1;

  return (
    <div className={cx(css.lsscene, css.desk)}>
      <div className={css.lsdeskwrap}>
        <What label="THE BOOK IS OPEN">
          For three days anybody can bid for your shares. You cannot advertise, you
          cannot negotiate, and you cannot stop it. All you can do is watch whether
          enough people want them.
        </What>

        <div className={css.lsdays}>
          {Array.from({ length: days }).map((_, i) => (
            <div className={cx(css.lsday, (day > i ? css.done : ''), (day === i + 1 ? css.now : ''))} key={i}>
              <b>DAY {i + 1}</b>
              <span>{day > i + 1 ? 'CLOSED' : day === i + 1 ? 'OPEN' : '—'}</span>
            </div>
          ))}
        </div>

        <div className={css.lscovbig}>
          <span>TIMES SUBSCRIBED</span>
          <b className={overall >= 1 ? css.ok : css.bad}>{(day ? overall : 0).toFixed(2)}×</b>
          <em>{overall >= 1 || !day
            ? 'Anything under 1.00× means there were not enough buyers.'
            : 'There are not enough buyers for the shares on offer.'}</em>
        </div>

        {/* the number nobody is supposed to quote, and everybody watches */}
        {day > 0 && (
          <div className={css.lsgrey}>
            <div>
              <span>GREY MARKET PREMIUM</span>
              <b className={greyPrem >= 0 ? css.ok : css.bad}>
                {greyPrem >= 0 ? '+' : '−'}{dollars(Math.abs(greyPrem))}
              </b>
            </div>
            <p>
              Unofficial, unregulated, and quoted by dealers who are not supposed to be
              quoting anything. It is right more often than it is wrong.
            </p>
          </div>
        )}

        <div className={css.lsbuckets}>
          {BUCKETS.map((b, i) => {
            const v = day ? buckets[i] : 0;
            return (
              <div className={css.lsbucket} key={b.id}>
                <div className={css.lsbuckettop}>
                  <b>{b.label}</b>
                  <em className={v >= 1 ? css.ok : css.bad}>{v.toFixed(2)}×</em>
                </div>
                <div className={css.lsbucketbar}>
                  <i className={v >= 1 ? css.ok : css.bad} style={{ width: `${Math.min(100, v * 50)}%` }} />
                  <u />
                </div>
                <p>{b.note}</p>
              </div>
            );
          })}
        </div>

        {closed && (
          <div className={cx(css.lstermnote, (overall >= 1 ? css.ok : css.bad))}>
            <p>{overall >= 1.6
              ? `Heavily oversubscribed. It prices at the top of your band, ${dollars(hi)}, and there will not be enough stock to go round.`
              : overall >= 1
                ? `Covered. It prices at ${dollars(price)} — inside your band, where the demand actually was.`
                : `Undersubscribed at ${overall.toFixed(2)}×. It prices at your floor, ${dollars(lo)}, and whatever nobody bought is left with your underwriter.`}</p>
          </div>
        )}
      </div>

      {day === 0 && <Foot label="OPEN THE BOOK" onGo={() => setDay(1)} />}
      {running && <Foot label={`DAY ${day} · WATCHING`} disabled onGo={() => { }} />}
      {canExtend
        ? <Choice
          a={{ title: 'CLOSE IT ANYWAY', note: 'Price at the floor and take what you got.', onPick: () => onGo({ cover: overall, buckets, price, extended }) }}
          b={{ title: 'EXTEND BY ONE DAY', note: 'Legal, public, and everybody knows it means you are short.', onPick: () => { setExtended(true); setDay(3); } }} />
        : closed && <Foot label="CLOSE THE BOOK →"
          onGo={() => onGo({ cover: overall, buckets, price, extended })} />}
    </div>
  );
};

/* ============================================================
   CHAPTER 04 · 2 — ALLOTMENT                              PAPER
   Who actually got shares. When it is heavily oversubscribed this stops
   being a calculation and becomes a lottery, which is exactly how it works.
   ============================================================ */
const Allot: React.FC<{
  brand: Brand; book: BookResult; shares: number; onGo: () => void;
}> = ({ brand, book, shares, onGo }) => {
  const rows = BUCKETS.map((b, i) => {
    const share = [.5, .15, .35][i];
    const applied = shares * share * book.buckets[i];
    const got = Math.min(applied, shares * share);
    return { ...b, applied, got, ratio: applied ? got / applied : 1 };
  });
  const lottery = book.buckets[2] > 3;

  return (
    <div className={cx(css.lsscene, css.paper)}>
      <div className={css.lssheet}>
        <div className={css.lsletterhead}>
          <b>BASIS OF ALLOTMENT</b>
          <span>{(brand.name || 'EMPIRE+').toUpperCase()} · FINAL</span>
        </div>
        <p className={css.lsdocbody}>
          {lottery
            ? `The public applied for ${book.buckets[2].toFixed(1)} times the shares reserved for them. There is no fair way to divide them, so they are drawn by lot. Most people who applied will get nothing.`
            : `Every category is allotted in proportion to what it applied for.`}
        </p>
        <div className={css.lsallot}>
          {rows.map(r => (
            <div className={css.lsallotrow} key={r.id}>
              <div><b>{r.label}</b><span>applied for {Math.round(r.applied).toLocaleString()}</span></div>
              <div className={css.r}>
                <b>{Math.round(r.got).toLocaleString()}</b>
                <span>{(r.ratio * 100).toFixed(0)}% of what they asked</span>
              </div>
            </div>
          ))}
        </div>
        <div className={css.lscarry}>
          <div><span>PRICED AT</span><b>{dollars(book.price)}</b></div>
          <p>
            {shares.toLocaleString()} shares allotted, raising {money(shares * book.price)}.
            {lottery ? ' Drawn by lot in the public category.' : ''}
          </p>
        </div>
      </div>
      <Foot label="TOMORROW IT TRADES →" onGo={onGo} />
    </div>
  );
};

/* ============================================================
   CHAPTER 04 · 3 — LISTING DAY
   The number stops being yours. It moves for six and a half hours and you
   are not consulted about any of it.
   ============================================================ */
const ListingDay: React.FC<{
  ticker: string; book: BookResult; firmBook: boolean; onGo: (close: number) => void;
}> = ({ ticker, book, firmBook, onGo }) => {
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const skip = useRef(false);

  const pop = book.cover >= 1.6 ? .28 + (book.cover - 1.6) * .12
    : book.cover >= 1 ? .02 + (book.cover - 1) * .2
      : -.08 - (1 - book.cover) * .34;
  /* the over-allotment option: if it breaks issue, the underwriter buys its own
     deal back to hold the line. Only a firm book has one. */
  const shoe = firmBook && pop < 0;
  const held = shoe ? Math.max(pop, -.035) : pop;
  const close = Math.max(.5, book.price * (1 + held));
  const open = Math.max(.5, book.price * (1 + held * .72));

  useEffect(() => {
    const start = performance.now(); const DUR = 9000;
    const tick = (now: number) => {
      if (skip.current) { setT(1); return; }
      const p = Math.min(1, (now - start) / DUR); setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const guard = window.setTimeout(() => setT(1), DUR + 500);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(guard); };
  }, []);

  const N = 34;
  const pts = useMemo(() => Array.from({ length: N }, (_, i) => {
    const k = i / (N - 1);
    const curve = 1 / (1 + Math.exp(-(k - .34) * 8));
    /* the wobble has to be slower than the sampling or it draws a saw blade */
    const amp = Math.abs(close - open) * .16 + book.price * .004;
    const wobble = Math.sin(i * .42) * amp
      + Math.sin(i * .93 + 1.7) * amp * .45
      + Math.sin(i * 1.9 + .4) * amp * .18;
    /* it settles as the day goes on, and the last print is the close exactly */
    const calm = 1 - k * .55;
    return i === N - 1 ? close : open + (close - open) * curve + wobble * calm;
  }), [open, close, book.price]);

  const shown = Math.max(1, Math.round(t * N));
  const live = t >= 1 ? close : pts[shown - 1];
  const move = ((live - book.price) / book.price) * 100;
  const up = move >= 0;
  const loV = Math.min(book.price, ...pts) * .985;
  const hiV = Math.max(book.price, ...pts) * 1.015;
  const y = (v: number) => `${(1 - (v - loV) / (hiV - loV)) * 100}%`;

  return (
    <div className={cx(css.lsscene, css.tape, (up ? css.up : css.down))}
      onClick={() => { skip.current = true; setT(1); }}>
      <div className={css.lstapewrap}>
        <div className={css.lstapehead}>
          <div><b>{ticker}</b><span>FIRST DAY OF TRADING</span></div>
          <div className={css.r}>
            <b className={up ? css.up : css.down}>{dollars(live)}</b>
            <span className={up ? css.up : css.down}>{pctS(move)}</span>
          </div>
        </div>

        <div className={css.lstapechart}>
          <i className={css.lstapeissue} style={{ top: y(book.price) }}>
            <em>ISSUED {dollars(book.price)}</em>
          </i>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path className={css.lstapefill}
              d={`M0,100 ${pts.slice(0, shown).map((p, i) =>
                `L${(i / (N - 1)) * 100},${(1 - (p - loV) / (hiV - loV)) * 100}`).join(' ')} L${((shown - 1) / (N - 1)) * 100},100 Z`} />
            <path className={css.lstapeline} fill="none"
              d={pts.slice(0, shown).map((p, i) =>
                `${i ? 'L' : 'M'}${(i / (N - 1)) * 100},${(1 - (p - loV) / (hiV - loV)) * 100}`).join(' ')} />
          </svg>
        </div>

        <div className={css.lstapefoot}>
          <div><span>OPENED</span><b>{dollars(open)}</b></div>
          <div><span>NOW</span><b className={up ? css.up : css.down}>{dollars(live)}</b></div>
          <div><span>ISSUE</span><b>{dollars(book.price)}</b></div>
        </div>

        {shoe && t > .35 && (
          <div className={css.lsshoe}>
            <b>STABILISATION IN PROGRESS</b>
            <p>
              Your underwriter is buying {ticker} with its own money to keep it off the
              floor. It is legal, it is disclosed in a footnote, and it is the only
              reason this is not worse.
            </p>
          </div>
        )}
        {t < 1 && <p className={css.lstapeskip}>TAP TO RUN THE DAY OUT</p>}
      </div>
      {t >= 1 && <Foot label="THE MORNING AFTER →" onGo={() => onGo(close)} />}
    </div>
  );
};

/* ============================================================
   CHAPTER 05 — AFTER
   Not a newspaper. The game already has two of those. This is the bill.
   ============================================================ */
const After: React.FC<{
  brand: Brand; inputs: IpoInputs; ticker: string;
  close: number; shares: number; marks: Mark[]; onGo: () => void;
}> = ({ brand, inputs, ticker, close, shares, marks, onGo }) => {
  const total = inputs.preIpoShares + shares;
  const held = inputs.preIpoShares * (inputs.founderPct / 100);
  const worth = held * close;
  const after = inputs.founderPct * (inputs.preIpoShares / total);

  return (
    <div className={cx(css.lsscene, css.room)}>
      <div className={css.lscover}>
        <div className={css.lscoverhead}>
          <span>{ticker} · YOU ARE A PUBLIC COMPANY</span>
          <b>{(brand.name || 'EMPIRE+').toUpperCase()}</b>
        </div>
        <div className={css.lscovernum}>
          <span>WHAT YOU ARE WORTH ON PAPER</span>
          <b>{money(worth)}</b>
          <em>{after.toFixed(1)}% of {money(total * close)}</em>
        </div>
        <div className={css.lsbill}>
          <div className={css.lsbillrow}>
            <b>LOCKED FOR 180 DAYS</b>
            <p>You cannot sell a single share of it until then. Not one.</p>
          </div>
          <div className={css.lsbillrow}>
            <b>EARNINGS, EVERY QUARTER</b>
            <p>Four times a year, forever, you explain this company to strangers who own it.</p>
          </div>
          <div className={css.lsbillrow}>
            <b>THE PRICE IS NOW ON YOUR DESK</b>
            <p>Every decision you make from here moves it, in public, the same day.</p>
          </div>
          {marks.length > 0 && (
            <div className={cx(css.lsbillrow, css.bad)}>
              <b>AND SOMEBODY GAVE A QUOTE</b>
              <p>“{marks[0].short.includes('DIRECTOR') || marks[0].short.includes('CTO')
                ? 'I resigned because I was not prepared to put my name to it. I stand by that.'
                : 'I declined to certify the assumptions. That is all I am going to say.'}”</p>
            </div>
          )}
        </div>
      </div>
      <Foot label="BACK TO THE BOARDROOM →" onGo={onGo} />
    </div>
  );
};

/* ============================================================
   THE SCREEN
   ============================================================ */
export const Listing: React.FC<{
  brand: Brand; inputs: IpoInputs;
  onDone: (r: IpoResult) => void; onBack?: () => void;
  initialCheckpoint?: StreamingListingCheckpoint | null;
  onCheckpoint?: (checkpoint: StreamingListingCheckpoint) => void;
}> = ({ brand, inputs, onDone, onBack, initialCheckpoint, onCheckpoint }) => {
  const c = brandColor(brand);
  const hex = hslHex(brand.hue, brand.sat, 58);
  const f = useMemo(() => fundamentalsOf(inputs), [inputs]);

  const [scene, setScene] = useState<Scene>(() => initialCheckpoint?.scene ?? 'RESOLUTION');
  const [ask, setAsk] = useState(() => initialCheckpoint?.ask ?? Math.round(fundamentalsOf(inputs).fair));
  const [shares, setShares] = useState(() => initialCheckpoint?.shares ?? Math.max(250_000, Math.min(40_000_000, inputs.initialNewShares)));
  const [revision, setRevision] = useState(() => initialCheckpoint?.revision ?? 1);
  const [bankId, setBankId] = useState<string | null>(() => initialCheckpoint?.bankId ?? null);
  const [marks, setMarks] = useState<Mark[]>(() => initialCheckpoint?.marks ?? []);
  const [omit, setOmit] = useState<Record<string, boolean>>(() => initialCheckpoint?.omit ?? {});
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => initialCheckpoint?.answers ?? {});
  const [attempt, setAttempt] = useState(() => initialCheckpoint?.attempt ?? 1);
  const [weeks, setWeeks] = useState(() => initialCheckpoint?.diligenceWeeks ?? 0);
  const [cut, setCut] = useState(() => initialCheckpoint?.cut ?? 0);
  const [lo, setLo] = useState(() => initialCheckpoint?.lowPrice ?? 0);
  const [hi, setHi] = useState(() => initialCheckpoint?.highPrice ?? 0);
  const [gave, setGave] = useState<boolean | null>(() => initialCheckpoint?.anchorDiscountAccepted ?? null);
  const [staffPct, setStaffPct] = useState(() => initialCheckpoint?.employeeQuotaPercent ?? 2);
  /* the grey market has its own error, fixed per run so it cannot be re-rolled */
  const [greyBias] = useState(() => (seededUnit(`${inputs.simulationSeed}:grey-market:${inputs.absoluteWeek}`) - .45) * .09);
  const [airMv, setAirMv] = useState(() => initialCheckpoint?.interviewMove ?? 0);
  const [book, setBook] = useState<BookResult | null>(() => initialCheckpoint?.book ?? null);
  const [closePx, setClosePx] = useState(() => initialCheckpoint?.closePrice ?? 0);
  const [ticker] = useState(() => initialCheckpoint?.ticker ?? tickerOptions(brand.name)[0]);
  const [seg, setSeg] = useState<Segment | null>(null);
  const after = useRef<Scene>('RESOLUTION');
  const checkpointCallback = useRef(onCheckpoint);
  useEffect(() => { checkpointCallback.current = onCheckpoint; }, [onCheckpoint]);
  useEffect(() => {
    checkpointCallback.current?.({
      scene, ask, shares, revision, bankId, marks, omit, answers, attempt,
      diligenceWeeks: weeks, cut, lowPrice: lo, highPrice: hi,
      anchorDiscountAccepted: gave, employeeQuotaPercent: staffPct,
      interviewMove: airMv, book, closePrice: closePx, ticker,
    });
  }, [scene, ask, shares, revision, bankId, marks, omit, answers, attempt, weeks, cut, lo, hi, gave, staffPct, airMv, book, closePx, ticker]);

  const addMark = (m: Mark) => setMarks(x => x.some(y => y.id === m.id) ? x : [...x, m]);
  const total = inputs.preIpoShares + shares;
  const live = ask * (1 - cut);
  const price = live / total;
  const queries = useMemo(() => queriesOf(inputs, omit, marks), [inputs, omit, marks]);
  const name = (brand.name || 'EMPIRE+').toUpperCase();

  const rail = useMemo(() => [
    { label: 'MARKET', value: '4,118', delta: .4 },
    { label: 'MEDIA IDX', value: '882', delta: -.7 },
    ...inputs.rivals.slice(0, 2).map((r, i) => ({
      label: r.slice(0, 9).toUpperCase(), value: `${140 + i * 37}`, delta: i ? -.3 : 1.1,
    })),
    { label: ticker, value: dollars(price), delta: 0, mine: true },
  ], [inputs.rivals, ticker, price]);

  const crawl = useMemo(() => [
    `${ticker} INDICATIVE ${money(live)}`,
    `${mn(shares)} SHARES AT ${dollars(price)}`,
    `FREE FLOAT ${((shares / total) * 100).toFixed(1)}%`,
    `SUBS ${inputs.subscribers.toLocaleString()}`,
    `CHURN ${inputs.churnPct.toFixed(1)}%`,
    ...marks.map(m => m.short),
  ], [ticker, live, shares, price, total, inputs, marks]);

  const cutTo = (s: Segment, next: Scene) => { after.current = next; setSeg(s); };

  /* ── the leak: your number is public the moment it exists ── */
  const leak = (): Segment => ({
    kick: 'BREAKING', tone: marks.length ? 'bad' : 'neutral',
    headline: `${name} SEEKS ${money(ask)} IN LISTING`,
    banner: `${mn(shares)} NEW SHARES · ${((shares / total) * 100).toFixed(1)}% FREE FLOAT · ${dollars(ask / total)} INDICATIVE`,
    rail, crawl,
    bug: {
      label: `${ticker} INDICATIVE`, fmt: dollars,
      from: ask / total,
      to: (ask / total) * (marks.length ? 1 - marks.length * .022 : 1.018),
    },
    feeds: [
      {
        who: 'Grace Adeyemi', where: '', anchor: true,
        line: `They have put a number on themselves before anybody else could. ${marks.length ? 'And they have filed with objections on the record, which is unusual.' : 'The filing is clean.'}`,
      },
      {
        who: 'Ardith Vance', where: 'KESTREL LONG FUND',
        line: ask / f.fair > 1.25
          ? `That is ${(ask / f.fair).toFixed(2)} times what the revenue supports. Somebody will have to explain it out loud.`
          : 'A sensible number, which is not the same as a cheap one. I would look at it.',
      },
      {
        who: 'Peter Osei', where: 'NORTHGATE GROWTH',
        line: (shares / total) * 100 < 14
          ? 'A float that thin is the story here. There will not be enough stock to go round, and that cuts both ways.'
          : 'Reasonable float. The question is whether the growth is still there in three years.',
      },
    ],
  });

  /* ── the regulator always leaks ── */
  const stateNews = (cleared: boolean, restatedCut: number): Segment => ({
    kick: 'MARKETS', tone: cleared ? 'good' : 'bad',
    headline: cleared ? `${name} CLEARED TO CIRCULATE` : `REGULATOR RETURNS ${name} FILING`,
    banner: cleared
      ? `${queries.length} OBSERVATIONS ANSWERED · WINDOW ${Math.max(0, 100 - weeks * 9)}%${restatedCut ? ` · RESTATED −${(restatedCut * 100).toFixed(0)}%` : ''}`
      : 'MATERIAL OBSERVATIONS ANSWERED WITHOUT SUBSTANCE',
    rail, crawl,
    bug: {
      label: `${ticker} INDICATIVE`, fmt: dollars,
      from: price / (cleared ? 1 : .94),
      to: cleared ? price * 1.011 : price * .94,
    },
    feeds: [
      {
        who: 'Grace Adeyemi', where: '', anchor: true,
        line: cleared
          ? 'The Board has issued its observations. That is not approval of the price — it never is — it only means they are allowed to ask.'
          : 'The statement has gone back. That is not fatal, but it is public, and it costs them the window.',
      },
      {
        who: 'Ardith Vance', where: 'KESTREL LONG FUND',
        line: cleared
          ? 'Clean process. I will read the document properly now that there is one.'
          : 'When a filing comes back you have to ask what else was answered that thinly.',
      },
    ],
  });

  const finishReal = () => {
    const p = book?.price ?? price;
    const bank = BANKS.find(b => b.id === bankId) ?? BANKS[2];
    /* the staff slice is sold at a 10% discount, so it raises less */
    const staffShares = shares * staffPct / 100;
    const raised = (shares - staffShares) * p + staffShares * p * .9;
    return onDone({
      ticker, bank: bank.name, price: p, raised,
      netProceeds: raised * (1 - bank.feePct / 100),
      coverage: book?.cover ?? 1,
      openPrice: p * (1 + ((closePx - p) / p) * .72), closePrice: closePx || p,
      popPct: p ? ((closePx - p) / p) * 100 : 0,
      founderWorth: inputs.preIpoShares * (closePx || p) * (inputs.founderPct / 100),
      founderPctAfter: inputs.founderPct * (inputs.preIpoShares / total),
      omitted: inputs.risks.filter(r => omit[r.id]).map(r => r.label),
      marks,
      bankId: bank.id,
      firmBook: bank.firm && !marks.some(mark => mark.id === 'bank'),
      preIpoShares: inputs.preIpoShares,
      newShares: shares,
      sharesOutstanding: total,
      employeeQuotaPercent: staffPct,
      anchorDiscountAccepted: gave === true,
      diligenceWeeks: weeks,
      regulatorAttempts: attempt,
      rank: raised >= 500e6 ? 1 : raised >= 400e6 ? 2 : raised >= 300e6 ? 3 : raised >= 220e6 ? 5 : 7,
    });
  };

  if (seg) {
    return (
      <div className={css.ls} data-epx-root>
        <MarketDesk seg={seg} onDone={() => { setSeg(null); setScene(after.current); }} />
      </div>
    );
  }

  return (
    <div className={css.ls} data-epx-root>
      <div className={css.lstop}>
        {onBack && scene === 'RESOLUTION' && <button className={css.lsback} onClick={onBack}>←</button>}
        <ChapterRail scene={scene} />
      </div>

      {scene === 'RESOLUTION' &&
        <Resolution brand={brand} inputs={inputs} f={f} onGo={() => setScene('ASK')} />}

      {scene === 'ASK' &&
        <Ask inputs={inputs} f={f} ask={ask} setAsk={setAsk} shares={shares} setShares={setShares}
          revision={revision} onGo={() => setScene('CFO')} />}

      {scene === 'CFO' &&
        <Cfo key={`cfo${revision}`} ask={ask} f={f} name={inputs.executiveNames?.cfo || 'Chief Financial Officer'}
          onPass={() => setScene('CTO')}
          onRevise={() => { setRevision(r => r + 1); setScene('ASK'); }}
          onForce={() => {
            addMark({
              id: 'cfo', bookCost: .17, short: 'CFO DECLINED TO CERTIFY',
              label: 'Management has adopted valuation assumptions which the Chief Financial Officer declined to certify.',
            });
            setScene('CTO');
          }} />}

      {scene === 'CTO' &&
        <Cto key={`cto${revision}`} inputs={inputs}
          onPass={() => setScene('BOARD')}
          onForce={() => {
            addMark({
              id: 'cto', bookCost: .12, short: 'CTO RESIGNED BEFORE FILING',
              label: 'The Chief Technology Officer resigned during preparation of this document.',
            });
            setScene('BOARD');
          }} />}

      {scene === 'BOARD' &&
        <Board key={`b${revision}`} ask={ask} f={f} marks={marks.length} inputs={inputs}
          onPass={() => setScene('SYNDICATE')}
          onRevise={() => { setRevision(r => r + 1); setScene('ASK'); }}
          onForce={() => {
            addMark({
              id: 'board', bookCost: .21, short: 'DIRECTOR RESIGNED OVER VALUATION',
              label: 'An independent director resigned prior to filing, citing the indicative valuation.',
            });
            setScene('SYNDICATE');
          }} />}

      {scene === 'SYNDICATE' &&
        <Syndicate key={`s${revision}`} ask={ask} f={f} shares={shares} preIpoShares={inputs.preIpoShares} marks={marks.length}
          bankId={bankId} setBankId={setBankId}
          onGo={firm => {
            if (!firm) addMark({
              id: 'bank', bookCost: .26, short: 'NO FIRM UNDERWRITING',
              label: 'The offering proceeds on a best-efforts basis. No underwriter has committed to purchase unsubscribed shares.',
            });
            setScene('STANDS');
          }} />}

      {scene === 'STANDS' &&
        <Stands brand={brand} ask={ask} shares={shares} preIpoShares={inputs.preIpoShares} marks={marks}
          onGo={() => cutTo(leak(), 'DILIGENCE')} />}

      {scene === 'DILIGENCE' &&
        <Diligence inputs={inputs} marks={marks} weeks={weeks} setWeeks={setWeeks}
          onGo={() => setScene('FILING')} />}

      {scene === 'FILING' &&
        <Filing brand={brand} inputs={inputs} ticker={ticker} omit={omit} setOmit={setOmit}
          onGo={() => setScene('REGULATOR')} />}

      {scene === 'REGULATOR' &&
        <Regulator key={`reg${attempt}`} brand={brand} queries={queries} ask={ask} attempt={attempt}
          answers={answers} setAnswers={setAnswers}
          onGo={v => {
            setCut(x => x + v.cut);
            if (!v.cleared) {
              setAnswers({});
              setAttempt(a => a + 1);
              cutTo(stateNews(false, 0), 'REGULATOR');
            } else {
              /* the band opens around the model price, which is where the
                 valuation finally landed after the regulator */
              const p = (ask * (1 - cut - v.cut)) / total;
              setLo(Math.round(p * .92 * 20) / 20);
              setHi(Math.round(p * 1.08 * 20) / 20);
              cutTo(stateNews(true, v.cut), 'BAND');
            }
          }} />}

      {scene === 'BAND' &&
        <Band price={price} shares={shares} lo={lo || price * .92} hi={hi || price * 1.08}
          setLo={setLo} setHi={setHi} staffPct={staffPct} setStaffPct={setStaffPct}
          onGo={() => setScene('ANCHOR')} />}

      {scene === 'ANCHOR' &&
        <AnchorBook hi={hi || price * 1.08} shares={shares} marks={marks.length}
          gave={gave} setGave={setGave} onGo={() => setScene('INTERVIEW')} />}

      {scene === 'INTERVIEW' &&
        <Interview inputs={inputs} marks={marks} gave={gave} price={hi || price}
          onGo={m => { setAirMv(m); setScene('BOOK'); }} />}

      {scene === 'BOOK' &&
        <Book lo={lo || price * .92} hi={hi || price * 1.08} shares={shares} marks={marks.length}
          airMv={airMv} gave={gave} windowLeft={Math.max(0, 100 - weeks * 9)}
          greyBias={greyBias}
          onGo={r => { setBook(r); setScene('ALLOT'); }} />}

      {scene === 'ALLOT' && book &&
        <Allot brand={brand} book={book} shares={shares} onGo={() => setScene('LISTING')} />}

      {scene === 'LISTING' && book &&
        <ListingDay ticker={ticker} book={book}
          firmBook={!marks.some(m => m.id === 'bank')}
          onGo={c => { setClosePx(c); setScene('AFTER'); }} />}

      {scene === 'AFTER' &&
        <After brand={brand} inputs={inputs} ticker={ticker} close={closePx} shares={shares}
          marks={marks} onGo={finishReal} />}

    </div>
  );
};

/* ============================================================
   THE STYLESHEET — every class prefixed ls, every custom property --ls*.
   The app registers --ink as a typed @property elsewhere, which silently
   ate an un-namespaced variable and rendered a whole act invisible.
   ============================================================ */
/* Styles now live in presentation/screens/TheListing/TheListing.module.css */
