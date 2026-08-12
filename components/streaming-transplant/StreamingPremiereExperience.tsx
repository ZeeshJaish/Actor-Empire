/**
 * EMPIRE+ v2 — PREMIERE NIGHT
 *
 * Everything the player has built exists to be judged by this. The halls set
 * the ceiling, the prices and the campaign set the crowd, the build doctrine
 * sets how badly it wobbles, and the money they borrowed is watching.
 *
 * The load rehearsal was the same machinery with one difference that matters:
 * there you watched. Here you can act while it happens — buy burst, shed
 * quality, hold the drop — and every one of those costs something that shows
 * up in the morning. Tonight is also not the rehearsal: the turnout is rolled,
 * so a build that only just cleared the test is a build that might not.
 *
 * Five beats:
 *   GATE    the readiness board. Canonical blockers stop the launch; warnings
 *           remain player-owned risks that can be accepted.
 *   DOORS   sign-ups begin, an hour before the show.
 *   IDENT   your ident plays for the first time, for real, to actual people.
 *   SPIKE   the only part that cannot be skipped.
 *   AFTER   a newspaper front page, written from what actually happened.
 */
import css from './presentation/screens/PremiereNight/PremiereNight.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export interface PremiereHall {
  id: string; label: string;
  ceiling: number; burstCeiling: number;
  /** fraction of the night's traffic this hall carries */
  share: number;
}

export interface PremiereCheck { id: string; label: string; ok: boolean; note: string }

export interface PremiereInputs {
  title: string;
  halls: PremiereHall[];
  ceiling: number;
  burstCeiling: number;
  /** what the rehearsal said a likely night looks like */
  expected: number;
  /** 0–1, how much the build shakes under load */
  wobble: number;
  arpu: number;
  treasury: number;
  checks: PremiereCheck[];
  investor?: { name: string; agenda: string } | null;
  /** the rivals from the wall of screens — they get to react, and how they
      react depends on how big a hole you made in their evening */
  rivals?: { name: string; subs: string; show?: string }[];
  /** whoever runs engineering, if anyone was hired */
  engineer?: { name: string; role: string } | null;
  /** canonical save seed; the same premiere can never reroll when replayed */
  simulationSeed?: string;
  /** Canonical readiness owns the launch gate. Visual warnings may be softer,
      but a real blocker must never be bypassed by the presentation layer. */
  launchAllowed?: boolean;
  launchBlockerMessage?: string;
}

export interface PremiereLaunchResult { ok: boolean; message?: string }

export type NightVerdict = 'TRIUMPH' | 'HELD' | 'BROKE';

export interface PremiereResult {
  verdict: NightVerdict;
  peak: number;
  failedPct: number;
  subsGained: number;
  subsLost: number;
  burstCost: number;
  actions: string[];
  worstCity: string | null;
}

type Beat = 'GATE' | 'DOORS' | 'IDENT' | 'SPIKE' | 'AFTER';

const deterministicUnit = (key: string) => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

/* ── the three things you can do while it is happening ────── */
interface Move { id: string; label: string; sub: string; cost: string }
const MOVES: Move[] = [
  { id: 'burst', label: 'BUY BURST', sub: 'Rent capacity at tonight’s price', cost: 'Money you did not budget' },
  { id: 'quality', label: 'DROP QUALITY', sub: 'Everyone to 720p, right now', cost: 'They will notice' },
  { id: 'hold', label: 'HOLD THE DROP', sub: 'Delay the premiere 30 minutes', cost: 'The press will notice' },
];

/* ============================================================
   FORMATTING
   ============================================================ */
const conc = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1e3)}K`;
const money = (n: number) => {
  const a = Math.abs(n);
  return a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
};
/** "a", "a and b", "a, b and c" — three "and"s in a row reads like a fault */
const listOf = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '')
    : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

const clockAt = (t: number) => {
  /* 19:40 → 20:40, the hour either side of the drop */
  const mins = Math.floor(19 * 60 + 40 + t * 60);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

/** the same S-curve the rehearsal uses, so the two are comparable */
const curveAt = (t: number) => {
  const rise = 1 / (1 + Math.exp(-(t - .34) * 12));
  const bleed = t > .66 ? (t - .66) * .34 : 0;
  return Math.max(0, rise - bleed);
};

/* ============================================================
   THE MORNING AFTER — reaction, derived
   ------------------------------------------------------------
   Nothing on the front page is authored for a generic outcome. Every quote,
   post and star rating is picked from what actually happened last night, so
   two players never read the same paper.
   ============================================================ */
interface Reaction { src: string; who: string; text: string }

const reactionsFor = (
  r: PremiereResult, inp: PremiereInputs, name: string,
): Reaction[] => {
  const out: Reaction[] = [];

  if (r.verdict === 'TRIUMPH') {
    out.push({ src: 'TRADE', who: 'Screen Ledger', text: `A clean open is rarer than a big one. ${name} managed both.` });
    /* subscribers and a concurrent ceiling are different units — comparing them
       would read as clever and be nonsense. Peak against ceiling is the pair. */
    out.push({
      src: 'ANALYST', who: 'Kestrel Media Research',
      text: r.peak < inp.ceiling * .6
        ? `Peak ${conc(r.peak)} against a ${conc(inp.ceiling)} ceiling. They built for more than they needed, and tonight that read as foresight rather than waste.`
        : `Peak ${conc(r.peak)} against a ${conc(inp.ceiling)} ceiling. There was less room in that than the calm suggests.`,
    });
  } else if (r.verdict === 'HELD') {
    out.push({ src: 'TRADE', who: 'Screen Ledger', text: `It held. Whether it held by design or by nerve is a question for their engineers.` });
    out.push({ src: 'ANALYST', who: 'Kestrel Media Research', text: r.burstCost > 0
      ? `They spent ${money(r.burstCost)} in the middle of the broadcast to stay up. That is not a plan, that is a save.`
      : `Peak ${conc(r.peak)} against ${conc(inp.ceiling)}. There was no room left over.` });
  } else {
    out.push({ src: 'TRADE', who: 'Screen Ledger', text: `${r.failedPct}% is not a wobble. People who could not watch tonight will not be asked twice.` });
    out.push({ src: 'ANALYST', who: 'Kestrel Media Research', text: inp.checks.find(c => c.id === 'test' && !c.ok)
      ? `The load rehearsal was never run. Everything that happened tonight was knowable last week.`
      : `They rehearsed, and launched anyway. The rehearsal was right.` });
  }

  if (inp.engineer) {
    out.push({
      src: 'INTERNAL', who: `${inp.engineer.name}, ${inp.engineer.role}`,
      text: r.verdict === 'BROKE'
        ? `“I want three more racks before we do anything like that again.”`
        : r.actions.length
          ? `“We got through it. I would rather not get through the next one the same way.”`
          : `“It did exactly what the numbers said it would do.”`,
    });
  }
  return out;
};

/* ── the market answers back, and what it says depends on the numbers ── */
export type Stance = 'DISMISSIVE' | 'WATCHFUL' | 'RATTLED' | 'OPPORTUNIST';
interface RivalMove { name: string; subs: string; stance: Stance; quote: string; move: string }

const rivalsFor = (r: PremiereResult, inp: PremiereInputs, name: string): RivalMove[] => {
  const list = inp.rivals ?? [];
  const big = r.subsGained >= 400_000;
  const broke = r.verdict === 'BROKE';

  return list.slice(0, 4).map((rv, i) => {
    /* the biggest rival sets the tone; the others each take a different lane so
       it reads like a market moving rather than four people saying one thing */
    if (i === 0) {
      return broke
        ? { ...rv, stance: 'DISMISSIVE' as Stance,
          quote: `“Capacity is not glamorous. It is the whole job.”`,
          move: 'No change to pricing. None was needed.' }
        : big
          ? { ...rv, stance: 'RATTLED' as Stance,
            quote: `“A strong opening. We have been here a long time.”`,
            move: `Emergency pricing review called for Thursday.` }
          : { ...rv, stance: 'WATCHFUL' as Stance,
            quote: `“We welcome them to the market.”`,
            move: 'Monitoring. No action yet.' };
    }
    if (i === 1) {
      return broke
        ? { ...rv, stance: 'OPPORTUNIST' as Stance,
          quote: `“Anyone who had a bad night is welcome here.”`,
          move: `Three months half price, targeted at your cancellations. Live by noon.` }
        : { ...rv, stance: 'OPPORTUNIST' as Stance,
          quote: `“Competition is good for everybody.”`,
          move: `Annual plan discounted 20% for the next fortnight.` };
    }
    if (i === 2) {
      return broke
        ? { ...rv, stance: 'WATCHFUL' as Stance,
          quote: `“We would not comment on another service’s infrastructure.”`,
          move: `Quietly approached two of ${name}’s engineers.` }
        : { ...rv, stance: 'RATTLED' as Stance,
          quote: `“${inp.title} is a good show. There are other good shows.”`,
          move: `Moved their own premiere out of ${name}’s week.` };
    }
    return { ...rv, stance: 'DISMISSIVE' as Stance, quote: `Declined to comment.`, move: '—' };
  });
};

/* ── the press round-up: four outlets, four slants ── */
const pressFor = (r: PremiereResult, inp: PremiereInputs, name: string) => {
  if (r.verdict === 'BROKE') return [
    { outlet: 'THE FEED', slant: 'tabloid', head: `“WHERE’S MY SHOW?”`, line: `${conc(r.subsLost)} paid and got a spinner.` },
    { outlet: 'BROADCAST BUSINESS', slant: 'financial', head: `Launch costs mount`, line: `A night that was meant to prove the model instead proved the ceiling.` },
    { outlet: 'CULTURE DESK', slant: 'culture', head: `${inp.title} deserved better`, line: `The show is the best thing on any service this year. Almost nobody saw it.` },
    { outlet: 'THE WIRE', slant: 'wire', head: `${name} confirms peak-hour failure`, line: `Statement expected today.` },
  ];
  if (r.verdict === 'HELD') return [
    { outlet: 'THE FEED', slant: 'tabloid', head: `IT WORKED (JUST)`, line: `Picture went soft, nobody left.` },
    { outlet: 'BROADCAST BUSINESS', slant: 'financial', head: `${conc(r.subsGained)} on night one`, line: `The number is real. The margin is the question.` },
    { outlet: 'CULTURE DESK', slant: 'culture', head: `${inp.title} is the real story`, line: `Whatever the servers did, the show landed.` },
    { outlet: 'THE WIRE', slant: 'wire', head: `${name} opens without major incident`, line: `Brief degradation reported around 20:20.` },
  ];
  return [
    { outlet: 'THE FEED', slant: 'tabloid', head: `NEW KID DOESN’T BLINK`, line: `No buffering. On night one. Unheard of.` },
    { outlet: 'BROADCAST BUSINESS', slant: 'financial', head: `${conc(r.subsGained)} accounts, zero failures`, line: `Investors will ask what it cost to be this ready.` },
    { outlet: 'CULTURE DESK', slant: 'culture', head: `${inp.title} arrives fully formed`, line: `A launch title that justifies the platform around it.` },
    { outlet: 'THE WIRE', slant: 'wire', head: `${name} opens clean`, line: `No incidents logged.` },
  ];
};

/* ── the forum thread, where people are less polite ── */
const forumFor = (r: PremiereResult, inp: PremiereInputs, name: string) => r.verdict === 'BROKE'
  ? {
    sub: 'r/streaming', title: `${name} launch megathread — post your errors here`, votes: '4.7k', replies: '2.1k',
    posts: [
      { who: 'u/palegrid', up: '1.2k', text: `Two hours. Two hours of 5031. I have seen the first four minutes of ${inp.title} eleven times.` },
      { who: 'u/hensley_j', up: '844', text: `Worth saying the app itself is genuinely nice. They just did not buy enough servers.` },
      { who: 'u/rt_marlow', up: '512', text: `Everyone acting shocked. This is what happens when marketing outruns capacity.` },
    ],
  }
  : {
    sub: 'r/streaming', title: `${name} launched tonight — honest thoughts thread`, votes: '9.3k', replies: '1.4k',
    posts: [
      { who: 'u/palegrid', up: '2.8k', text: `Pressed play at 20:00 with everyone else and it just… played. That is the whole review.` },
      { who: 'u/hensley_j', up: '1.1k', text: `${inp.title} is genuinely excellent. I did not expect to care about a launch title.` },
      { who: 'u/rt_marlow', up: '690', text: `Give it a month. Night one is always the good one.` },
    ],
  };

/* ── what last night opened, or closed ── */
const chancesFor = (r: PremiereResult, inp: PremiereInputs, name: string) => {
  const out: { kind: 'CHANCE' | 'THREAT'; head: string; line: string }[] = [];
  if (r.verdict === 'BROKE') {
    out.push({ kind: 'THREAT', head: 'Rivals are targeting your cancellations', line: `Half-price offers went live within hours, aimed at anyone who asked for a refund last night.` });
    out.push({ kind: 'THREAT', head: 'Your engineers are being called', line: `Recruiters move fastest after a public failure. Loyalty is cheaper to keep than to rebuy.` });
    out.push({ kind: 'CHANCE', head: 'Goodwill is still buyable', line: `A credit to every affected account costs money and buys back most of the anger.` });
  } else {
    out.push({ kind: 'CHANCE', head: 'Talent wants to be in the room', line: `Three agencies have packages they would not have sent you last week.` });
    out.push({ kind: 'CHANCE', head: 'A distributor wants to bundle you', line: `Carriage on a national broadband package. Reach now, margin never.` });
    out.push({ kind: 'THREAT', head: 'Week two is priced against you', line: `A rival cut their annual plan the morning after. Your second week is the one they are fighting for.` });
  }
  return out;
};

const socialFor = (r: PremiereResult, inp: PremiereInputs, name: string) => {
  if (r.verdict === 'BROKE') return [
    { who: '@nightowl_tv', text: `${name} is down. of course it is. i took a night off work for this`, likes: '14.2K' },
    { who: '@streamwatch', text: `error 5031 gang assemble`, likes: '8.9K' },
    { who: '@mira.reads', text: `finally got in at 21:40. the show is good. the night was not`, likes: '3.1K' },
  ];
  if (r.verdict === 'HELD') return [
    { who: '@nightowl_tv', text: `${inp.title} is unbelievably good and it played without a stutter, which honestly i did not expect`, likes: '22.4K' },
    { who: '@streamwatch', text: `quality dropped for a bit around 20:20 but nobody actually stopped watching`, likes: '5.7K' },
    { who: '@mira.reads', text: `new platform, first night, no buffering. fine. i'm in`, likes: '9.8K' },
  ];
  return [
    { who: '@nightowl_tv', text: `${inp.title} on ${name} might be the best thing i have watched this year and it played instantly`, likes: '41.6K' },
    { who: '@streamwatch', text: `zero buffering on a launch night is a flex and i will be saying so`, likes: '18.3K' },
    { who: '@mira.reads', text: `signed up at 19:58, watching by 20:00. that is it. that is the review`, likes: '12.7K' },
  ];
};

const storeFor = (r: PremiereResult) => r.verdict === 'BROKE'
  ? { stars: 2.3, count: '41K', reviews: [
    { s: 1, t: 'Could not watch a single thing', b: 'Paid, waited, got an error all night. Cancelled.' },
    { s: 4, t: 'Good app when it works', b: 'The catalogue is genuinely strong. Fix the servers.' }] }
  : r.verdict === 'HELD'
    ? { stars: 4.1, count: '28K', reviews: [
      { s: 5, t: 'Played straight away', b: 'No fuss. Found the show, pressed play, done.' },
      { s: 3, t: 'Picture went soft for a while', b: 'Around nine it dropped quality. Came back fine.' }] }
    : { stars: 4.6, count: '33K', reviews: [
      { s: 5, t: 'Best launch I have seen', b: 'Instant playback, clean interface, no ads shoved at me.' },
      { s: 5, t: 'Signed up for one show, staying for the rest', b: 'The whole thing feels finished.' }] };

const secondaryFor = (r: PremiereResult, inp: PremiereInputs) => {
  const out: { kicker: string; head: string; line: string }[] = [];
  if (r.verdict === 'BROKE') {
    out.push({
      kicker: 'REGULATOR', head: 'Consumer body asks for outage detail',
      line: `Subscribers who paid and could not watch may be entitled to a credit. A response is expected within fourteen days.`,
    });
    if (r.worstCity) out.push({
      kicker: 'INFRASTRUCTURE', head: `${r.worstCity} named as the failure point`,
      line: `The hall carrying the largest share of traffic was the first to give. More racks there would have changed the night.`,
    });
  } else {
    out.push({
      kicker: 'MARKET', head: 'Rivals watch the number',
      line: `${conc(r.subsGained)} accounts in a single evening resets what a launch is expected to deliver.`,
    });
    out.push({
      kicker: 'NEXT', head: 'Week two is the real test',
      line: `Opening night brings curiosity. What keeps it is the second thing they watch.`,
    });
  }
  return out;
};

/* ============================================================
   THE SCREEN
   ============================================================ */
export const PremiereNight: React.FC<{
  brand: Brand;
  inputs: PremiereInputs;
  onDone: (r: PremiereResult) => void;
  onBack?: () => void;
  onLaunch?: () => PremiereLaunchResult | void;
}> = ({ brand, inputs, onDone, onBack, onLaunch }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tf = typeFace(brand);

  const [beat, setBeat] = useState<Beat>('GATE');
  const [t, setT] = useState(0);
  const [used, setUsed] = useState<string[]>([]);
  const [peek, setPeek] = useState(false);
  const [result, setResult] = useState<PremiereResult | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState('');
  const raf = useRef(0);
  const worstRef = useRef(0);

  /* Tonight is rolled, once, when the doors open. A build that only just
     cleared the rehearsal is a build that might not clear the night. */
  const roll = useRef(0.75 + deterministicUnit(`${inputs.simulationSeed || 'premiere'}:${inputs.title}`) * .9);
  const target = Math.round(inputs.expected * roll.current);

  const reds = inputs.checks.filter(x => !x.ok);
  const launchAllowed = inputs.launchAllowed !== false;

  const requestLaunch = () => {
    if (!launchAllowed) {
      setLaunchFeedback(inputs.launchBlockerMessage || 'Resolve the blocked readiness items before opening night.');
      return;
    }
    const outcome = onLaunch?.();
    if (outcome && !outcome.ok) {
      setLaunchFeedback(outcome.message || 'Opening night could not be committed.');
      return;
    }
    setLaunchFeedback('');
    setBeat('DOORS');
  };

  /* what the moves do to the room */
  const burstOn = used.includes('burst');
  const qualityOn = used.includes('quality');
  const holdOn = used.includes('hold');

  const effCeiling = Math.round(
    (burstOn ? inputs.burstCeiling : inputs.ceiling) * (qualityOn ? 1.35 : 1));
  const effTarget = Math.round(target * (holdOn ? .72 : 1));

  const live = Math.round(effTarget * curveAt(t));
  const over = live > effCeiling;
  const failedNow = over ? Math.min(88, Math.round(((live - effCeiling) / live) * 100 + inputs.wobble * 30)) : 0;
  if (failedNow > worstRef.current) worstRef.current = failedNow;

  /* sign-ups run all night; the ones who hit a spinner do not all come back */
  const subsSoFar = Math.round(effTarget * 3.1 * Math.min(1, t * 1.15));

  /* The spike effect only depends on `beat`, so anything it closes over is
     frozen at the moment the night starts. Without this mirror the moves would
     visibly change the room and change nothing about the morning. */
  const now = useRef({ used, effCeiling, effTarget, burstOn });
  now.current = { used, effCeiling, effTarget, burstOn };

  /* ── the spike runs on a clock, guarded so a backgrounded tab cannot
        strand the player mid-night ── */
  useEffect(() => {
    if (beat !== 'SPIKE') return;
    const start = performance.now();
    const DUR = 26_000;
    let over_ = false;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
    const guard = window.setTimeout(() => { setT(1); finish(); }, DUR + 600);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(guard); };

    function finish() {
      if (over_) return;
      over_ = true;
      const cur = now.current;
      const failed = worstRef.current;
      const gained = Math.round(cur.effTarget * 3.1);
      const lost = Math.round(gained * (failed / 100) * .45);
      const worst = failed > 0
        ? [...inputs.halls].sort((a, b) =>
          (cur.effTarget * b.share) / b.ceiling - (cur.effTarget * a.share) / a.ceiling)[0]?.label ?? null
        : null;
      const verdict: NightVerdict = failed >= 18 ? 'BROKE'
        : failed > 0 || cur.used.length > 0 ? 'HELD' : 'TRIUMPH';
      const r: PremiereResult = {
        verdict, peak: cur.effTarget, failedPct: failed,
        subsGained: gained - lost, subsLost: lost,
        burstCost: cur.burstOn ? Math.round((inputs.burstCeiling - inputs.ceiling) * 6.4) : 0,
        actions: cur.used.map(u => MOVES.find(m => m.id === u)?.label ?? u),
        worstCity: worst,
      };
      setResult(r);
      setBeat('AFTER');
    }
  }, [beat]);

  /* the two short beats advance themselves */
  useEffect(() => {
    if (beat !== 'DOORS' && beat !== 'IDENT') return;
    const id = window.setTimeout(
      () => setBeat(beat === 'DOORS' ? 'IDENT' : 'SPIKE'),
      beat === 'DOORS' ? 3200 : 4200);
    return () => clearTimeout(id);
  }, [beat]);

  const use = (id: string) => {
    if (used.includes(id)) return;
    if (id === 'hold' && t > .42) return;      // too late to hold anything back
    if (id === 'burst' && inputs.burstCeiling <= inputs.ceiling) return;
    setUsed(u => [...u, id]);
  };

  return (
    <div className={cx(css.pn, css[beat.toLowerCase()], (over ? css.hot : ''), (failedNow >= 18 ? css.broke : ''))}
      style={{ ['--epx-pn-c' as string]: c}}>

      {/* ══ GATE ══════════════════════════════════════════ */}
      {beat === 'GATE' && (
        <>
          <div className={css.pntop}>
            {onBack && <button className={css.pnback} onClick={onBack} aria-label="Back">←</button>}
            <div className={css.pntitle}>
              <b>LAUNCH COMMAND</b>
              <span>GO / NO-GO · {inputs.checks.filter(x => x.ok).length} OF {inputs.checks.length} CLEAR</span>
            </div>
            <span className={css.pnmark}><Mark brand={brand} /></span>
          </div>

          <div className={css.pnscroll}>
            <p className={css.pnlead}>
              Every light on this board was set by a decision you already made.
              Warnings are your call. Company blockers must be cleared before the signal can open.
            </p>

            <div className={css.pnboard}>
              {inputs.checks.map(x => (
                <div className={cx(css.chk, (x.ok ? css.ok : ''))} key={x.id}>
                  <i className={css.chkdot}>{x.ok ? '✓' : '!'}</i>
                  <div>
                    <b>{x.label}</b>
                    <span>{x.note}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={css.pnexpect}>
              <div><span>REHEARSAL SAID</span><b>{conc(inputs.expected)}</b></div>
              <div><span>YOUR CEILING</span><b>{conc(inputs.ceiling)}</b></div>
            </div>
            <p className={css.pnfine}>
              Tonight is not the rehearsal. The turnout is whatever turns up.
            </p>

            <div className={css.pnspace} />
          </div>

          <div className={css.pnfoot}>
            {(!launchAllowed || launchFeedback) && (
              <span className={css.pnblocked} role="status">
                {launchFeedback || inputs.launchBlockerMessage || 'Resolve the blocked readiness items before opening night.'}
              </span>
            )}
            <button className={cx(css.pngolive, (reds.length ? css.anyway : ''), (!launchAllowed ? css.blocked : ''))}
              disabled={!launchAllowed} onClick={requestLaunch}>
              {!launchAllowed
                ? `RESOLVE ${reds.length} BLOCKER${reds.length === 1 ? '' : 'S'}`
                : reds.length
                ? `GO LIVE WITH ${reds.length} UNRESOLVED`
                : 'GO LIVE'}
            </button>
          </div>
        </>
      )}

      {/* ══ DOORS ═════════════════════════════════════════ */}
      {beat === 'DOORS' && (
        <div className={css.pnstage2}>
          <span className={css.stagekick}>19:00 · DOORS OPEN</span>
          <b className={css.stagenum}>{conc(Math.round(target * .34))}</b>
          <span className={css.stagesub}>accounts created in the first hour</span>
          <div className={css.stagebar}><i /></div>
          <p className={css.stageline}>
            They are early. They are refreshing the app. Nothing has played yet.
          </p>
        </div>
      )}

      {/* ══ IDENT ═════════════════════════════════════════ */}
      {beat === 'IDENT' && (
        <div className={css.pnident} onClick={() => setBeat('SPIKE')}>
          <div className={css.pnidentmark}><Mark brand={brand} /></div>
          <b className={css.identname} style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing }}>
            {brand.name || 'EMPIRE+'}
          </b>
          <span className={css.identsub}>{inputs.title.toUpperCase()}</span>
          <i className={css.identsweep} />
          <span className={css.identfoot}>TAP TO SKIP</span>
        </div>
      )}

      {/* ══ SPIKE ═════════════════════════════════════════ */}
      {beat === 'SPIKE' && (
        <>
          <div className={css.pnbar}>
            <span className={css.clock}>{clockAt(t)}</span>
            <span className={cx(css.livepill, (over ? css.bad : ''))}>
              <i />{over ? 'DEGRADED' : 'LIVE'}
            </span>
            <span className={css.nowplaying}>{inputs.title}</span>
          </div>

          <div className={css.pnstage}>
            {peek ? (
              /* the same thing your subscribers are looking at, right now */
              <div className={css.peek}>
                <div className={cx(css.pnphone, (over ? css.broken : ''))}>
                  <div className={css.phonescreen}>
                    {over ? (
                      <>
                        <i className={css.spinner} />
                        <b>Can’t play right now</b>
                        <span>Error 5031 · we’re working on it</span>
                      </>
                    ) : (
                      <>
                        <i className={css.playglyph} />
                        <b>{inputs.title}</b>
                        <span>S1 E1 · playing</span>
                      </>
                    )}
                  </div>
                </div>
                <p className={css.peekline}>
                  {over
                    ? `${failedNow}% of the people who came tonight are looking at this.`
                    : 'Everybody who came tonight is watching this.'}
                </p>
              </div>
            ) : (
              <>
                <span className={css.bigkick}>CONCURRENT STREAMS</span>
                <b className={cx(css.bignum, (failedNow >= 18 ? ' bad' : over ? css.warn : ''))}>{conc(live)}</b>
                <span className={css.bigsub}>
                  {Math.round((live / effCeiling) * 100)}% of {conc(effCeiling)}
                  {qualityOn ? ' · 720p' : ''}{burstOn ? ' · bursting' : ''}
                </span>

                <div className={css.pncapbar}>
                  <i className={css.capfill} style={{ width: `${Math.min(100, (live / effCeiling) * 100)}%` }} />
                  <i className={css.capmark} />
                </div>

                <div className={css.cityline}>
                  {inputs.halls.map(h => {
                    const dem = effTarget * h.share * curveAt(t);
                    const cap = h.ceiling * (burstOn ? h.burstCeiling / h.ceiling : 1) * (qualityOn ? 1.35 : 1);
                    const pctc = Math.round((dem / cap) * 100);
                    return (
                      <div className={cx(css.cchip, (pctc > 100 ? ' bad' : pctc > 84 ? css.warn : ''))} key={h.id}>
                        <b>{h.label}</b><em>{pctc}%</em>
                      </div>
                    );
                  })}
                </div>

                <div className={css.signups}>
                  <span>SIGN-UPS TONIGHT</span>
                  <b>{conc(subsSoFar)}</b>
                </div>

                {failedNow > 0 && (
                  <div className={css.failing}>{failedNow}% of streams are failing</div>
                )}
              </>
            )}
          </div>

          <div className={css.pnmoves}>
            <button className={cx(css.peekbtn, (peek ? css.on : ''))} onClick={() => setPeek(p => !p)}>
              {peek ? 'BACK TO THE ROOM' : 'SEE WHAT THEY SEE'}
            </button>
            <div className={css.moverow}>
              {MOVES.map(m => {
                const spent = used.includes(m.id);
                const dead = (m.id === 'hold' && t > .42)
                  || (m.id === 'burst' && inputs.burstCeiling <= inputs.ceiling);
                return (
                  <button key={m.id} className={cx(css.move, (spent ? css.spent : ''))}
                    disabled={spent || dead} onClick={() => use(m.id)}>
                    <b>{m.label}</b>
                    <span>{spent ? 'DONE' : dead ? 'TOO LATE' : m.cost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══ AFTER ═════════════════════════════════════════ */}
      {beat === 'AFTER' && result && (() => {
        const nm = brand.name || 'EMPIRE+';
        const reactions = reactionsFor(result, inputs, nm);
        const social = socialFor(result, inputs, nm);
        const papers = pressFor(result, inputs, nm);
        const rivalMoves = rivalsFor(result, inputs, nm);
        const forum = forumFor(result, inputs, nm);
        const chances = chancesFor(result, inputs, nm);
        const recommend = result.verdict === 'BROKE' ? 31 : result.verdict === 'HELD' ? 68 : 87;
        const store = storeFor(result);
        const more = secondaryFor(result, inputs);
        const W = 300, H = 78;
        const top = Math.max(result.peak, inputs.ceiling) * 1.12;
        const pts = Array.from({ length: 49 }, (_, i) => {
          const tt = i / 48;
          return `${(tt * W).toFixed(1)},${(H - (result.peak * curveAt(tt) / top) * H).toFixed(1)}`;
        }).join(' ');
        const ceilY = H - (inputs.ceiling / top) * H;

        return (
          <>
            <div className={cx(css.pnscroll, css.paper)}>
              <div className={css.pnpress}>
                <div className={css.ppplate}>
                  <span className={css.ppdate}>MORNING EDITION</span>
                  <h1 className={css.ppname}>The Industry Daily</h1>
                  <div className={css.ppdateline}>
                    <span>Vol. XLI · No. 288</span>
                    <span>CITY &amp; NATIONAL</span>
                    <span>50¢</span>
                  </div>
                </div>

                <span className={css.ppkicker}>STREAMING · LAUNCH</span>
                <h1 className={css.headline}>
                  {result.verdict === 'TRIUMPH'
                    ? `${brand.name || 'EMPIRE+'} lands`
                    : result.verdict === 'HELD'
                      ? `${brand.name || 'EMPIRE+'} holds its opening night`
                      : `${brand.name || 'EMPIRE+'} buckles on night one`}
                </h1>
                <div className={css.ppbyline}>
                  <span>By Marta Vane, Media Correspondent</span>
                  <em>{inputs.title}</em>
                </div>

                <p className={css.deck}>
                  {result.verdict === 'TRIUMPH' && (
                    <>Peak {conc(result.peak)} concurrent and not a frame dropped.
                      {' '}{conc(result.subsGained)} accounts by midnight.</>
                  )}
                  {result.verdict === 'HELD' && (
                    <>Peak {conc(result.peak)} concurrent.
                      {result.actions.length
                        ? ` Held together by ${listOf(result.actions).toLowerCase()}.`
                        : ' Held, narrowly.'}
                      {' '}{conc(result.subsGained)} accounts by midnight.</>
                  )}
                  {result.verdict === 'BROKE' && (
                    <>Streams failed for {result.failedPct}% of the audience at peak
                      {result.worstCity ? `, ${result.worstCity} worst of all` : ''}.
                      {' '}{conc(result.subsLost)} of the people who came will not be back.</>
                  )}
                </p>

                {/* the picture desk's contribution: a halftone plate, and the
                    stamp the subs desk slapped on it at 2am */}
                <figure className={css.ppplate2}>
                  <div className={css.ppart}>
                    <i className={css.ppdots} />
                    <b style={{ fontFamily: tf.stack, letterSpacing: tf.spacing }}>
                      {inputs.title}
                    </b>
                    <span className={css.ppartmark}><Mark brand={brand} /></span>
                    <i className={cx(css.ppstamp, css[result.verdict.toLowerCase()])}>
                      {result.verdict === 'BROKE' ? 'OUTAGE'
                        : result.verdict === 'HELD' ? 'HELD' : 'CLEAN OPEN'}
                    </i>
                  </div>
                  <figcaption>
                    {inputs.title}, which premiered at 20:00 last night.
                    <em> Picture: {brand.name || 'EMPIRE+'}</em>
                  </figcaption>
                </figure>

                {/* the shape of the night, drawn in ink */}
                <figure className={css.ppchart}>
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                    <line className={css.ppceil} x1="0" x2={W} y1={ceilY} y2={ceilY} />
                    <polyline className={css.ppcurve} points={pts} />
                  </svg>
                  <figcaption>
                    <span>19:40</span>
                    <em>— — capacity {conc(inputs.ceiling)}</em>
                    <span>20:40</span>
                  </figcaption>
                </figure>

                <div className={css.pressstats}>
                  <div><span>PEAK</span><b>{conc(result.peak)}</b></div>
                  <div><span>SUBSCRIBERS</span><b>{conc(result.subsGained)}</b></div>
                  <div><span>LOST</span><b className={result.subsLost ? css.bad : ''}>{result.subsLost ? conc(result.subsLost) : '—'}</b></div>
                  <div><span>FAILED</span><b className={result.failedPct ? css.bad : ''}>{result.failedPct}%</b></div>
                </div>

                {result.burstCost > 0 && (
                  <p className={css.pressnote}>
                    Burst capacity was bought mid-broadcast at {money(result.burstCost)} — a cost that
                    appears in no budget because nobody planned it.
                  </p>
                )}

                {inputs.investor && (
                  <blockquote className={css.quote}>
                    <p>
                      {result.verdict === 'BROKE'
                        ? `“We put money into a platform, not a rehearsal. This cannot happen twice.”`
                        : result.verdict === 'HELD'
                          ? `“It held. I would rather it had held with more room.”`
                          : `“This is the night we invested for.”`}
                    </p>
                    <cite>{inputs.investor.name}, board</cite>
                  </blockquote>
                )}

                {/* ── how the rest of the press led with it ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />Elsewhere this morning</h2>
                  <div className={css.ppwire}>
                    {papers.map((x, i) => (
                      <div className={cx(css.ppout, css[x.slant])} key={i}>
                        <span className={css.ppoutname}>{x.outlet}</span>
                        <b>{x.head}</b>
                        <p>{x.line}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── the rivals, reacting to your numbers rather than to you ── */}
                {rivalMoves.length > 0 && (
                  <div className={css.ppsec}>
                    <h2><i className={css.ppdiamond} />The rivals</h2>
                    {rivalMoves.map((rv, i) => (
                      <div className={css.pprival} key={i}>
                        <div className={css.pprtop}>
                          <b>{rv.name}</b>
                          <span className={css.ppsubs}>{rv.subs}</span>
                          <i className={cx(css.ppstance, css[rv.stance.toLowerCase()])}>{rv.stance}</i>
                        </div>
                        <p className={css.pprq}>{rv.quote}</p>
                        <div className={css.pprmove}><span>WHAT THEY DID</span><em>{rv.move}</em></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── reaction ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />Reaction</h2>
                  {reactions.map((x, i) => (
                    <div className={css.ppreact} key={i}>
                      <span className={css.ppsrc}>{x.src}</span>
                      <p>{x.text}</p>
                      <cite>{x.who}</cite>
                    </div>
                  ))}
                </div>

                {/* ── what people actually posted ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />What they said</h2>
                  <div className={css.ppsocial}>
                    {social.map((x, i) => (
                      <div className={css.pppost} key={i}>
                        <b>{x.who}</b>
                        <p>{x.text}</p>
                        <em>♥ {x.likes}</em>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── the thread where people are less polite ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />{forum.sub}</h2>
                  <div className={css.ppthread}>
                    <div className={css.ppthead}>
                      <b>{forum.title}</b>
                      <span>▲ {forum.votes} · {forum.replies} comments</span>
                    </div>
                    {forum.posts.map((x, i) => (
                      <div className={css.pptpost} key={i}>
                        <span className={css.ppup}>▲ {x.up}</span>
                        <div>
                          <b>{x.who}</b>
                          <p>{x.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={css.pppoll}>
                    <span className={css.pppq}>“Would you recommend it to a friend?”</span>
                    <div className={css.ppbar}>
                      <i className={css.yes} style={{ width: `${recommend}%` }} />
                      <i className={css.no} style={{ width: `${100 - recommend}%` }} />
                    </div>
                    <div className={css.pplegend}>
                      <span>YES {recommend}%</span>
                      <span>NO {100 - recommend}%</span>
                    </div>
                    <em>Snap poll, 4,100 respondents, overnight</em>
                  </div>
                </div>

                {/* ── the rating people leave without being asked ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />The app, this morning</h2>
                  <div className={css.ppstore}>
                    <div className={css.ppscore}>
                      <b>{store.stars.toFixed(1)}</b>
                      <span className={css.ppstars}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <i key={n} className={n <= Math.round(store.stars) ? css.on : ''}>★</i>
                        ))}
                      </span>
                      <em>{store.count} ratings</em>
                    </div>
                    <div className={css.ppreviews}>
                      {store.reviews.map((rv, i) => (
                        <div className={css.pprev} key={i}>
                          <span className={cx(css.ppstars, css.sm)}>
                            {[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= rv.s ? css.on : ''}>★</i>)}
                          </span>
                          <b>{rv.t}</b>
                          <p>{rv.b}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── what the night opened, or closed ── */}
                <div className={css.ppsec}>
                  <h2><i className={css.ppdiamond} />What last night opened</h2>
                  {chances.map((x, i) => (
                    <div className={cx(css.ppchance, css[x.kind.toLowerCase()])} key={i}>
                      <span>{x.kind}</span>
                      <b>{x.head}</b>
                      <p>{x.line}</p>
                    </div>
                  ))}
                </div>

                {/* ── below the fold ── */}
                <div className={css.ppfold}><span>MORE ON PAGE 4</span></div>
                <div className={css.ppmore}>
                  {more.map((m, i) => (
                    <div className={css.ppstory} key={i}>
                      <span className={cx(css.ppkicker, css.sm)}>{m.kicker}</span>
                      <b>{m.head}</b>
                      <p>{m.line}</p>
                    </div>
                  ))}
                </div>

                <p className={css.pressfoot}>
                  {result.subsLost > 0
                    ? 'The lost accounts stay lost. They will show as a notch in the subscriber curve for as long as the company exists.'
                    : 'Nothing about tonight will need explaining later.'}
                </p>
              </div>
              <div className={css.pnspace} />
            </div>

            <div className={css.pnfoot}>
              <button className={css.pngolive} onClick={() => onDone(result)}>OPEN YOUR HQ →</button>
            </div>
          </>
        );
      })()}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/PremiereNight/PremiereNight.module.css */
