/* ============================================================================
   OPENING NIGHT — what a launch actually looks like from five angles.

   Someone presses play. The shelf they landed on. The wall the ops team is
   staring at. The chat losing its mind. And the feed, where it stops being
   your launch and becomes everyone's evening.

   Every panel is drawn as the interface it would really be, so the player
   recognises it before they read a word of it.
   ========================================================================== */

import React from 'react';
import { compactCount, money } from '../../finance/format';
import { Poster } from '../Poster';
import { Cutscene, Tally, seeded } from './Cutscene';
import type { Beat } from './Cutscene';
import { Avatar, Still } from './Scenery';
import {
  getStreamingStorefrontFamily,
  type StreamingStorefrontFamily,
} from '../../../../services/streamingStorefront';

export interface OpeningNight {
  company: string;
  logoSrc?: string;
  brandHex?: string;
  countries: { code: string; name: string }[];
  titles: number;
  /** The front page the player designed, from Define the Launch. */
  storefront?: string;
  /** The show everyone opens with. */
  headline?: string;
  signups: number;
  peakConcurrent: number;
  capacity: number;
  watchHours: number;
  monthlyRevenue: number;
  verdict: string;
}

export function OpeningNightCutscene({ night, onComplete, onClose }: {
  night: OpeningNight;
  onComplete?: () => void;
  onClose: () => void;
}) {
  return (
    <Cutscene
      beats={openingNightBeats(night)}
      brandHex={night.brandHex}
      onComplete={onComplete}
      onClose={onClose}
      closeLabel="Read the night in full"
      finaleTone="paper"
      finale={<MorningAfter night={night} />}
    />
  );
}

/* --- the morning after ------------------------------------------------------
   Five dark scenes end on a printed page: the trade press, the next morning,
   with the night's numbers set as a data box. It is the one artifact a founder
   would actually keep. */

function MorningAfter({ night }: { night: OpeningNight }) {
  const show = night.headline ?? 'The Longest Night';
  return (
    <article className="mo">
      <header className="mo-masthead">
        <b>Frame Weekly</b>
        <span>Media · Thursday · Late edition</span>
      </header>

      <p className="mo-kicker">Streaming · Night one</p>
      <h2>{night.company} is on.</h2>
      <p className="mo-stand">{night.verdict}</p>

      <div className="mo-photo">
        <Still seed={show.length * 13} className="mo-still" />
        <span className="mo-caption">{show}, which {compactCount(night.signups)} households opened before midnight.</span>
      </div>

      <ul className="mo-figs">
        <li><em>Signed up</em><b>{compactCount(night.signups)}</b></li>
        <li><em>Peak at once</em><b>{compactCount(night.peakConcurrent)}</b></li>
        <li><em>Hours watched</em><b>{compactCount(night.watchHours)}</b></li>
        <li><em>Run rate</em><b>{money(night.monthlyRevenue)}</b></li>
      </ul>

      <p className="mo-quote">
        &ldquo;A launch with no outage is rarer than a launch with a hit. This one had both.&rdquo;
        <i>Ellis Tarrant, chief critic</i>
      </p>
    </article>
  );
}

export function openingNightBeats(night: OpeningNight): Beat[] {
  const show = night.headline ?? 'The Longest Night';
  const storefront = getStreamingStorefrontFamily(night.storefront);
  return [
    {
      id: 'play', mark: '01', ms: 4200,
      title: 'Somebody presses play',
      line: `First frame of ${show} in forty-one milliseconds. No spinner. That is the whole job.`,
      scene: <PlayerScene show={show} />,
    },
    {
      id: 'store', mark: '02', ms: 4000,
      title: STORE_TITLE[storefront],
      line: `${night.titles} titles, arranged the way you decided people should meet them.`,
      scene: <Storefront company={night.company} logoSrc={night.logoSrc} show={show} titles={night.titles} layout={storefront} />,
    },
    {
      id: 'noc', mark: '03', ms: 4400,
      title: 'The room watching the room',
      line: 'Every graph on that wall is a person who chose you over everything else tonight.',
      scene: <OpsWall night={night} />,
    },
    {
      id: 'autoplay', mark: '04', ms: 4600,
      title: 'Nobody stopped at one',
      line: 'The five seconds between episodes is the most valuable real estate you own. Almost nobody used it to leave.',
      scene: <Autoplay show={show} night={night} />,
    },
    {
      id: 'feed', mark: '05', ms: 4800,
      title: 'It stops being yours',
      line: `${night.company} is the first thing people say to each other tonight.`,
      scene: <Feed company={night.company} show={show} signups={night.signups} />,
    },
  ];
}

/* --- 01 · somebody presses play --------------------------------------------
   A television, a film on it and a scrubber that starts to move. Nothing
   abstract: this is the object the whole business exists to fill. */

function PlayerScene({ show }: { show: string }) {
  return (
    <div className="on-scene on-room">
      {/* A room, not a card: back wall, a window with the city in it, a lamp,
          a sofa between us and the screen, and the TV's light on all of it. */}
      <span className="on-room-wall" aria-hidden="true" />

      <svg viewBox="0 0 200 400" className="on-room-bg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="on-wallg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12151c" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
        </defs>
        <rect width="200" height="400" fill="url(#on-wallg)" />

        {/* window, right of the TV, city lights outside */}
        <rect x="162" y="64" width="38" height="112" rx="2" fill="#05070c" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <g fill="rgba(255,214,150,0.5)">
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={166 + (i % 4) * 8.4} y={82 + Math.floor(i / 4) * 17} width="2.4" height="3.4" />
          ))}
        </g>
        <path d="M181 64v112M162 120h38" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />

        {/* floor lamp on the left */}
        <path d="M18 300V196" stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" />
        <path d="M8 300h20" stroke="rgba(255,255,255,0.14)" strokeWidth="1.8" />
        <path d="M8 196h20l-4-22h-12z" fill="#1a1f28" />
        <ellipse cx="18" cy="200" rx="26" ry="20" fill="rgba(255,214,150,0.09)" />

        {/* a plant, because rooms have things in them */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="1.4" fill="none">
          <path d="M182 300v-30M182 282c-10-6-13-16-11-24M182 276c9-5 12-14 11-22M182 288c-8 2-14 0-18-5" />
        </g>
        <path d="M174 300h16l-2 14h-12z" fill="#141922" />

        {/* the floor */}
        <rect x="0" y="300" width="200" height="100" fill="#070a0e" />
        <ellipse cx="100" cy="316" rx="96" ry="20" fill="rgba(120,170,240,0.05)" />
      </svg>

      {/* the television itself */}
      <div className="on-tv">
        <div className="on-tv-screen">
          <Still seed={show.length * 13} className="on-tv-still" />
          <span className="on-tv-shade" aria-hidden="true" />

          <span className="on-tv-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
            <i className="on-tv-ripple" />
          </span>

          <div className="on-tv-hud">
            <b>{show}</b>
            <span className="on-tv-badge">4K · HDR</span>
          </div>

          <div className="on-tv-controls">
            <span className="on-tv-clock">
              <Tally to={214} from={0} ms={3200} format={(n) => clock(n)} />
            </span>
            <span className="on-tv-scrub"><i /></span>
            <span className="on-tv-dur">1:52:10</span>
          </div>
        </div>
        <span className="on-tv-stand" aria-hidden="true" />
      </div>

      {/* the light the TV throws into the room */}
      <span className="on-room-spill" aria-hidden="true" />

      {/* the back of the sofa, right against the camera */}
      <svg viewBox="0 0 200 90" className="on-room-fg" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-4 90V38c0-9 7-15 16-15h176c9 0 16 6 16 15v52z" fill="#020308" />
        <path d="M32 23v67M168 23v67" stroke="rgba(255,255,255,0.05)" strokeWidth="1.4" />
        <path d="M-4 38c30-8 70-12 104-12s70 4 104 12" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" fill="none" />
      </svg>

      <p className="on-tv-note">Ashburn · 41 ms to first frame · 0 rebuffers</p>
    </div>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* --- 02 · the storefront ---------------------------------------------------- */

/* The front page is not one design. The player picked a permanent base layout
   in Define the Launch, and this beat has to show them the one they picked —
   the whole point of that decision was that a household would see it. */

type StoreLayout = StreamingStorefrontFamily;

const STORE_TITLE: Record<StoreLayout, string> = {
  cinema: 'One premiere, presented',
  discovery: 'The shelf they landed on',
  event: 'The countdown they landed on',
  channel: 'It was already playing',
  wall: 'The whole wall at once',
  feed: 'It played as they scrolled',
  rooms: 'The rooms they walked into',
  timeline: 'Newest first, all the way down',
  concierge: 'It asked what they wanted',
  lobby: 'They walked in together',
};

const ROWS = ['Because tonight is the night', 'New on the service', 'Everyone is watching'];

function Chrome({ company, logoSrc, nav }: { company: string; logoSrc?: string; nav: string[] }) {
  return (
    <header className="on-store-bar">
      {logoSrc ? <img src={logoSrc} alt="" /> : <b>{company}</b>}
      <nav>{nav.map((n, i) => <span key={n} className={i === 0 ? 'is-on' : undefined}>{n}</span>)}</nav>
    </header>
  );
}

function Rail({ label, seed, count = 8, size = 50, d = 0 }: {
  label?: string; seed: string; count?: number; size?: number; d?: number;
}) {
  return (
    <section className="on-store-row" style={{ ['--d' as string]: `${d}ms` }}>
      {label && <p>{label}</p>}
      <div className="on-store-rail">
        {Array.from({ length: count }, (_, c) => (
          <span key={c} className="on-store-slot" style={{ ['--d' as string]: `${d + 100 + c * 70}ms` }}>
            <Poster seed={`${seed}-${c}`} size={size} />
          </span>
        ))}
      </div>
    </section>
  );
}

function Storefront({ company, logoSrc, show, titles, layout }: {
  company: string; logoSrc?: string; show: string; titles: number; layout: StoreLayout;
}) {
  const seed = show.length * 13;

  /* --- one premiere, treated like an opening night ----------------------- */
  if (layout === 'cinema') {
    return (
      <div className="on-scene on-store is-cinema">
        <Chrome company={company} logoSrc={logoSrc} nav={['Tonight', 'Library']} />
        <div className="on-store-full">
          <Still seed={seed} className="on-store-still" />
          <span className="on-store-shade is-full" aria-hidden="true" />
          <div className="on-store-centre">
            <p className="on-store-tag">Premieres tonight</p>
            <b>{show}</b>
            <em>A single film, presented once, at eight.</em>
            <span className="on-store-actions"><i className="is-play">▶ Watch</i><i>Trailer</i></span>
          </div>
        </div>
        <Rail seed={`cin-${titles}`} count={6} size={44} d={700} />
        <span className="on-store-fade" aria-hidden="true" />
      </div>
    );
  }

  /* --- appointment viewing ----------------------------------------------- */
  if (layout === 'event') {
    return (
      <div className="on-scene on-store is-event">
        <Chrome company={company} logoSrc={logoSrc} nav={['Next event', 'Past events']} />
        <div className="on-store-hero">
          <Still seed={seed} className="on-store-still" />
          <span className="on-store-shade" aria-hidden="true" />
          <div className="on-store-clock">
            {['00', '12', '04'].map((v, i) => (
              <span key={v + i}><b>{v}</b><em>{['hrs', 'min', 'sec'][i]}</em></span>
            ))}
          </div>
        </div>
        <div className="on-store-herometa is-static">
          <b>{show}</b>
          <em>Doors at eight · everyone starts together</em>
        </div>
        <Rail label="Coming this month" seed={`ev-${titles}`} count={7} size={48} d={700} />
        <span className="on-store-fade" aria-hidden="true" />
      </div>
    );
  }

  /* --- already playing when you open it ---------------------------------- */
  if (layout === 'channel') {
    return (
      <div className="on-scene on-store is-channel">
        <div className="on-store-full">
          <Still seed={seed} className="on-store-still" />
          <span className="on-store-shade is-full" aria-hidden="true" />
          <span className="on-store-livebug"><i />On now</span>
          <div className="on-store-nowmeta">
            <b>{show}</b>
            <em>Started 14 minutes ago · no choice required</em>
          </div>
        </div>
        <div className="on-store-upnext">
          <p>Up next</p>
          <div className="on-store-rail">
            {Array.from({ length: 6 }, (_, c) => (
              <span key={c} className="on-store-slot" style={{ ['--d' as string]: `${600 + c * 90}ms` }}>
                <Poster seed={`ch-${titles}-${c}`} size={44} />
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* --- everything at once ------------------------------------------------- */
  if (layout === 'wall') {
    return (
      <div className="on-scene on-store is-wall">
        <Chrome company={company} logoSrc={logoSrc} nav={['Everything', 'Sorted by taste']} />
        <div className="on-store-wall">
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} className="on-store-slot" style={{ ['--d' as string]: `${300 + (i % 4) * 60 + Math.floor(i / 4) * 70}ms` }}>
              <Poster seed={`wl-${titles}-${i}`} size={74} />
            </span>
          ))}
        </div>
        <span className="on-store-fade is-bottom" aria-hidden="true" />
      </div>
    );
  }

  /* --- clips that play as you scroll -------------------------------------- */
  if (layout === 'feed') {
    return (
      <div className="on-scene on-store is-feed">
        <div className="on-store-full">
          <Still seed={seed} className="on-store-still" />
          <span className="on-store-shade is-full" aria-hidden="true" />
          <div className="on-store-feedmeta">
            <b>{show}</b>
            <em>Clip 1 of 6 · tap to watch the whole thing</em>
          </div>
          <div className="on-store-feedrail">
            {['♥', '💬', '↻', '＋'].map((g) => <span key={g}>{g}</span>)}
          </div>
          <div className="on-store-feeddots">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i === 1 ? 'is-on' : undefined} />)}</div>
        </div>
      </div>
    );
  }

  /* --- hand-built channels ------------------------------------------------ */
  if (layout === 'rooms') {
    const rooms = [['Sunday Night', 'Long, slow, worth it'], ['Insomnia', 'For 2am'], ['Kids', 'Nothing frightening']];
    return (
      <div className="on-scene on-store is-rooms">
        <Chrome company={company} logoSrc={logoSrc} nav={['Rooms', 'Library']} />
        <div className="on-store-rooms">
          {rooms.map(([name, line], r) => (
            <article key={name} className="on-store-room" style={{ ['--d' as string]: `${400 + r * 280}ms` }}>
              <div className="on-store-roomart">
                {Array.from({ length: 3 }, (_, c) => React.createElement(Poster, {
                  key: c,
                  seed: `rm-${r}-${c}-${titles}`,
                  size: 46,
                }))}
              </div>
              <div className="on-store-roommeta"><b>{name}</b><em>{line}</em></div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  /* --- newest first, forever ---------------------------------------------- */
  if (layout === 'timeline') {
    const days = ['Tonight', 'Yesterday', 'Tuesday', 'Last week'];
    return (
      <div className="on-scene on-store is-timeline">
        <Chrome company={company} logoSrc={logoSrc} nav={['Latest', 'Library']} />
        <ol className="on-store-timeline">
          {days.map((day, i) => (
            <li key={day} style={{ ['--d' as string]: `${350 + i * 240}ms` }}>
              <span className="on-store-when">{day}</span>
              <Poster seed={`tl-${i}-${titles}`} size={44} />
              <div className="on-store-tlmeta">
                <b>{i === 0 ? show : `Title ${i + 1}`}</b>
                <em>{i === 0 ? 'Added an hour ago' : 'Added earlier'}</em>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  /* --- ask for the evening ------------------------------------------------ */
  if (layout === 'concierge') {
    return (
      <div className="on-scene on-store is-concierge">
        <Chrome company={company} logoSrc={logoSrc} nav={['Tonight']} />
        <div className="on-store-ask">
          <p className="on-store-asklabel">What are you in the mood for?</p>
          <div className="on-store-askbox">
            <span>Something long and quiet</span>
            <i className="on-store-caret" />
          </div>
          <div className="on-store-chips">
            {['Nothing sad', 'Under two hours', 'Not seen it'].map((c) => <span key={c}>{c}</span>)}
          </div>
          <p className="on-store-asklabel is-out">Your evening</p>
          <div className="on-store-evening">
            <Poster seed={`cg-a-${titles}`} size={62} />
            <div>
              <b>{show}</b>
              <em>Then two more, if you stay.</em>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- a room with other people in it ------------------------------------- */
  if (layout === 'lobby') {
    return (
      <div className="on-scene on-store is-lobby">
        <Chrome company={company} logoSrc={logoSrc} nav={['Lobby', 'Library']} />
        <div className="on-store-full">
          <Still seed={seed} className="on-store-still" />
          <span className="on-store-shade is-full" aria-hidden="true" />
          <div className="on-store-lobbyseats" aria-hidden="true">
            {['mara', 'dan', 'sanaa', 'tomas', 'lin', 'bex', 'juno'].map((n, i) => (
              <span key={n} style={{ ['--d' as string]: `${400 + i * 130}ms` }}><Avatar name={n} size={26} /></span>
            ))}
          </div>
          <div className="on-store-nowmeta">
            <b>{show}</b>
            <em>412 people in this room · starts when the room is full</em>
          </div>
        </div>
      </div>
    );
  }

  /* --- discovery, the default -------------------------------------------- */
  return (
    <div className="on-scene on-store">
      <Chrome company={company} logoSrc={logoSrc} nav={['Home', 'Films', 'Series', 'My list']} />
      <div className="on-store-hero">
        <Still seed={seed} className="on-store-still" />
        <span className="on-store-shade" aria-hidden="true" />
        <div className="on-store-herometa">
          <b>{show}</b>
          <em>Tonight · {compactCount(titles)} titles in the library</em>
          <span className="on-store-actions"><i className="is-play">▶ Play</i><i>+ My list</i></span>
        </div>
      </div>
      {ROWS.map((label, r) => React.createElement(Rail, {
        key: label,
        label,
        seed: `dc-${r}-${titles}`,
        d: 700 + r * 300,
      }))}
      <span className="on-store-fade" aria-hidden="true" />
    </div>
  );
}

/* --- 03 · the operations wall ----------------------------------------------- */

function OpsWall({ night }: { night: OpeningNight }) {
  const rnd = seeded(night.peakConcurrent || 11);
  /* One axis for both the curve and the ceiling, so a night that stayed under
     capacity is drawn under the line rather than through it. */
  const axis = Math.max(night.capacity, night.peakConcurrent) * 1.12;
  const peakY = (night.peakConcurrent / axis) * 92;
  const ceiling = 100 - (night.capacity / axis) * 92;
  const pts = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const v = t ** 2.6 * peakY + rnd() * peakY * 0.05;
    return `${(i / 39) * 100},${Math.max(2, 100 - Math.min(peakY, v))}`;
  });
  const line = `M${pts.join(' L')}`;
  const area = `${line} L100,100 L0,100 Z`;

  return (
    <div className="on-scene on-ops">
      <span className="on-ops-glow" aria-hidden="true" />
      <header className="on-ops-head">
        <div>
          <p className="on-ops-label">Concurrent streams</p>
          <p className="on-ops-figure">
            <Tally to={night.peakConcurrent} ms={3400} format={(n) => compactCount(Math.round(n))} />
          </p>
        </div>
        <span className="on-live"><i />Live</span>
      </header>

      <div className="on-ops-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="on-ops-area" d={area} />
          <path className="on-ops-line" d={line} pathLength={1} />
          <path className="on-ops-ceil" d={`M0 ${ceiling}H100`} />
        </svg>
        <span className="on-ops-ceillabel" style={{ top: `${ceiling}%` }}>
          Built to carry {compactCount(night.capacity)}
        </span>
      </div>

      {/* Shares of the same peak, so the rows add up to the headline. */}
      <ul className="on-ops-regions">
        {(() => {
          const shown = night.countries.slice(0, 4);
          const weights = shown.map((_, i) => 1 / (i + 1.35));
          const sum = weights.reduce((a, b) => a + b, 0);
          return shown.map((c, i) => {
            const share = weights[i] / sum;
            return (
              <li key={c.code} style={{ ['--d' as string]: `${600 + i * 260}ms` }}>
                <b>{c.code}</b>
                <span className="on-ops-bar"><i style={{ width: `${Math.round(share * 100 / (weights[0] / sum) * 0.92)}%` }} /></span>
                <em>{compactCount(Math.round(night.peakConcurrent * share))}</em>
              </li>
            );
          });
        })()}
      </ul>

      <footer className="on-ops-foot">
        <span>Sign-ups / min <b><Tally to={4820} ms={3000} format={(n) => compactCount(Math.round(n))} /></b></span>
        <span>Errors <b className="is-good">0.00%</b></span>
      </footer>
    </div>
  );
}

/* --- 04 · the chat ---------------------------------------------------------- */

/* --- 04 · the autoplay counter ----------------------------------------------
   This is the moment that belongs to a streaming service and to nothing else:
   the credits roll, a ring counts down, and the next episode starts itself. */

function Autoplay({ show, night }: { show: string; night: OpeningNight }) {
  return (
    <div className="on-scene on-auto">
      <Still seed={show.length * 13} className="on-auto-behind" />
      <span className="on-auto-dim" aria-hidden="true" />

      {/* the end card the player's own product shows */}
      <div className="on-auto-card">
        <p className="on-auto-kicker">Next episode</p>

        <div className="on-auto-next">
          <span className="on-auto-thumb">
            <Still seed={show.length * 31} className="on-card-still" />
            <i className="on-auto-ep">Ep 2</i>
          </span>
          <div className="on-auto-meta">
            <b>{show}</b>
            <em>Episode 2 · The Turning · 51 min</em>
          </div>
        </div>

        <div className="on-auto-actions">
          <span className="on-auto-ring" aria-hidden="true">
            <svg viewBox="0 0 44 44">
              <circle className="on-auto-track" cx="22" cy="22" r="19" />
              <circle className="on-auto-arc" cx="22" cy="22" r="19" pathLength={1} />
            </svg>
            <b>▶</b>
          </span>
          <span className="on-auto-play">Playing in <i><Tally to={0} from={5} ms={4000} format={(n) => String(Math.max(1, Math.ceil(n)))} /></i></span>
          <span className="on-auto-ghost">Back to browse</span>
        </div>
      </div>

      {/* what that counter did, across every market at once */}
      <ul className="on-auto-stats">
        <li style={{ ['--d' as string]: '600ms' }}>
          <em>Rolled straight on</em>
          <b><Tally to={94} ms={2600} format={(n) => `${Math.round(n)}%`} /></b>
        </li>
        <li style={{ ['--d' as string]: '900ms' }}>
          <em>Started episode two</em>
          <b><Tally to={night.signups * 0.61} ms={2800} format={(n) => compactCount(Math.round(n))} /></b>
        </li>
        <li style={{ ['--d' as string]: '1200ms' }}>
          <em>Finished the season</em>
          <b><Tally to={night.signups * 0.09} ms={3000} format={(n) => compactCount(Math.round(n))} /></b>
        </li>
      </ul>
    </div>
  );
}

/* Five surfaces, because a launch does not land on one. Each is styled as the
   kind of place it is — a microblog, a video site, a wire story, a forum, a
   short-video app — without borrowing anyone's actual branding. */

function Feed({ company, show, signups }: { company: string; show: string; signups: number }) {
  const tag = company.replace(/[^a-zA-Z0-9]/g, '');
  const showTag = show.replace(/[^a-zA-Z0-9]/g, '');
  const n = (f: number) => compactCount(Math.round(signups * f));

  return (
    <div className="on-scene on-storm">
      <span className="on-storm-glow" aria-hidden="true" />

      {/* trending, pinned */}
      <section className="on-trend" style={{ ['--d' as string]: '150ms' }}>
        <p className="on-trend-head">Trending · worldwide</p>
        <ol>
          {[[`#${tag}`, 2.4], [`#${showTag}`, 1.6], ['#OpeningNight', 0.7]].map(([t, f], i) => (
            <li key={t as string} className={i === 0 ? 'is-top' : undefined} style={{ ['--d' as string]: `${300 + i * 220}ms` }}>
              <span className="on-trend-rank">{i + 1}</span>
              <b>{t as string}</b>
              <em>{n(f as number)} posts</em>
            </li>
          ))}
        </ol>
      </section>

      {/* a microblog post */}
      <article className="on-card is-social" style={{ ['--d' as string]: '700ms', ['--r' as string]: '-2.5deg' }}>
        <header>
          <Avatar name="ellis.tarrant" size={28} />
          <span><b>Ellis Tarrant</b><em>@ellis.tarrant · Critic</em></span>
        </header>
        <p>Three hours in and not one dropped frame. Whoever built that network gets the credit tonight.</p>
        <footer><span>♥ {n(0.08)}</span><span>↻ {n(0.031)}</span><span>💬 {n(0.012)}</span></footer>
      </article>

      {/* a video site */}
      <article className="on-card is-video" style={{ ['--d' as string]: '1150ms', ['--r' as string]: '1.8deg' }}>
        <div className="on-card-thumb">
          <Still seed={show.length * 7} className="on-card-still" />
          <span className="on-card-play" aria-hidden="true">▶</span>
          <i className="on-card-dur">18:04</i>
          <i className="on-card-bar" />
        </div>
        <div className="on-card-meta">
          <b>{show} — the launch nobody saw coming</b>
          <em>Reel Theory · {n(0.9)} views · 4h ago</em>
        </div>
      </article>

      {/* a wire story */}
      <article className="on-card is-news" style={{ ['--d' as string]: '1600ms', ['--r' as string]: '-1.2deg' }}>
        <span className="on-card-flag">Breaking</span>
        <b>{company} opens without an outage — and with a hit</b>
        <em>Frame Weekly · Media desk</em>
      </article>

      {/* a short-video app */}
      <article className="on-card is-short" style={{ ['--d' as string]: '2000ms', ['--r' as string]: '3deg' }}>
        <Still seed={show.length * 21} className="on-card-still" />
        <span className="on-card-shade" aria-hidden="true" />
        <span className="on-card-shorttext">my whole group chat signed up in one night</span>
        <span className="on-card-shortstats">♥ {n(0.06)}</span>
      </article>

      {/* a forum thread */}
      <article className="on-card is-forum" style={{ ['--d' as string]: '2400ms', ['--r' as string]: '-3.4deg' }}>
        <span className="on-card-flag">r/streaming · 4.1k</span>
        <b>Anyone else get 4K instantly on {company}?</b>
        <em>412 comments · top of all time today</em>
      </article>

      {/* the wire, running along the bottom */}
      <div className="on-ticker" aria-hidden="true">
        <div className="on-ticker-run">
          {[0, 1].map((k) => (
            <span key={k}>
              {company} opens in every announced market · {n(1)} sign-ups on night one ·
              {' '}{show} tops the charts in three countries · zero reported outages ·
              {' '}critics call the rollout &ldquo;the cleanest launch in years&rdquo; ·
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
