/* ============================================================================
   COMMISSION — six full-screen scenes.

   Every beat fills the viewport edge to edge and is built in layers: a sky or
   a wall behind, the subject in the middle, something dark and close in the
   foreground. That foreground layer is what stops a drawing looking flat, and
   it is why these read as places rather than panels.
   ========================================================================== */

import type { BuildTotals, City, MoneyPlan } from '../../finance/build';
import { money } from '../../finance/format';
import type { BoxOfficeRegionId } from '../../../../types';
import { getProductionLocation } from '../../../../services/productionLocations';
import {
  InteractiveRegionMap,
  type RegionMapLocationPin,
} from '../../../../views/lifestyle/business/components/InteractiveRegionMap';
import type { Beat } from './Cutscene';
import { Worker } from './Scenery';

export function commissionBeats(
  totals: BuildTotals,
  plan: MoneyPlan,
  cities: City[],
  company: string,
): Beat[] {
  const commissionNow = plan.commissionNow ?? plan.total;
  return [
    {
      id: 'sign', mark: '01', ms: 4000,
      title: 'You sign it',
      line: 'Sixty months of floor space, in your name, on paper a court would read back to you.',
      scene: <Contract company={company} totals={totals} total={commissionNow} />,
    },
    {
      id: 'wire', mark: '02', ms: 3600,
      title: 'The money leaves',
      line: 'One transfer, four payees. It clears before the crews have their coffee.',
      scene: <Wire plan={plan} />,
    },
    {
      id: 'site', mark: '03', ms: 4200,
      title: 'The site goes up',
      line: 'Hoardings at dawn, a tower crane by Thursday, a delivery slot every ninety minutes.',
      scene: <SiteScene cities={cities.length} weeks={totals.weeks} />,
    },
    {
      id: 'install', mark: '04', ms: 4400,
      title: 'Rack one, filled',
      line: `Machine by machine, ${totals.racks} cabinets bolted to the floor, cabled at the back and powered from both sides.`,
      scene: <InstallScene racks={totals.racks} />,
    },
    {
      id: 'accept', mark: '05', ms: 4800,
      title: 'Acceptance test',
      line: 'Pull the mains. Pull a switch. Pull a disk. It has to survive all three before it is yours.',
      scene: <Acceptance />,
    },
    {
      id: 'live', mark: '06', ms: 4600,
      title: totals.weeks > 0 ? `${totals.weeks} weeks to operational` : 'The routes come up',
      line: `${company} lights up in ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'} and the coverage spreads out from them.`,
      scene: <WorldWake cities={cities} />,
    },
  ];
}

/* --- 01 · the signing -------------------------------------------------------
   A desk under a lamp. Warm paper against the void is what makes this read as
   an object in a room and not another panel of the interface. */

function Contract({ company, totals, total }: { company: string; totals: BuildTotals; total: number }) {
  return (
    <div className="cs-scene cs-desk">
      <span className="cs-lamp" aria-hidden="true" />
      <span className="cs-deskgrain" aria-hidden="true" />

      <div className="cs-papers">
        <span className="cs-paper-under" aria-hidden="true" />
        <article className="cs-paper">
          <p className="cs-paper-kicker">Execution copy · Rev A</p>
          <h3>Construction &amp; Lease Agreement</h3>

          <ul className="cs-terms">
            <li><em>Sites</em><b>{totals.cities}</b></li>
            <li><em>Cabinets</em><b>{totals.racks}</b></li>
            <li><em>Delivery</em><b>{totals.weeks > 0 ? `${totals.weeks} wks` : 'Now'}</b></li>
            <li><em>Consideration</em><b>{money(total)}</b></li>
          </ul>

          <p className="cs-clause">
            The Lessee shall take possession of the demised premises and all plant
            listed in Schedule 1 upon countersignature, whereupon the Consideration
            shall become immediately due and payable and the Term shall commence.
          </p>

          <div className="cs-signblock">
            <svg viewBox="0 0 210 56" className="cs-sig" aria-hidden="true">
              <path
                className="cs-sig-ink" pathLength={1}
                d="M5 44C9 20 14 6 17 15s-3 26 3 27 9-18 13-29 9-7 7 5-2 24 4 23 12-16 17-27 10-6 8 6-1 24 5 23 15-14 23-25 12-5 10 8-1 24 6 22 20-16 30-26"
                fill="none" stroke="#1a1712" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
              />
              <path
                className="cs-sig-ink is-late" pathLength={1}
                d="M62 40c22 8 48-6 72-12"
                fill="none" stroke="#1a1712" strokeWidth="1.5" strokeLinecap="round"
              />
            </svg>
            <span className="cs-sign-rule" />
            <span className="cs-sign-name">For and on behalf of {company}</span>
          </div>

          <span className="cs-stamp"><b>Countersigned</b><i>Rev A</i></span>
        </article>
      </div>

      <span className="cs-pen" aria-hidden="true" />
      <span className="cs-ring" aria-hidden="true" />
    </div>
  );
}

/* --- 02 · the transfer ------------------------------------------------------ */

function Wire({ plan }: { plan: MoneyPlan }) {
  const rows = plan.lines
    .filter((line) => !line.timing || line.timing === 'COMMISSION')
    .slice(0, 4);
  const commissionNow = plan.commissionNow ?? plan.total;
  return (
    <div className="cs-scene cs-wirescene">
      <span className="cs-wire-aura" aria-hidden="true" />

      <div className="cs-wire">
        <header className="cs-wire-head">
          <span>Outgoing transfer</span>
          <i>TRF-4471-08</i>
        </header>

        <p className="cs-wire-amt">{money(commissionNow)}</p>
        <p className="cs-wire-from">Studio treasury · same-day value · irrevocable</p>

        <ul className="cs-wire-rows">
          {rows.map((line, i) => (
            <li key={line.id} style={{ ['--d' as string]: `${500 + i * 420}ms` }}>
              <span className="cs-wire-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4.5 4.5L19 7" />
                </svg>
              </span>
              <span>{line.label}</span>
              <b>{money(line.amount)}</b>
            </li>
          ))}
        </ul>

        <div className="cs-wire-bar" aria-hidden="true"><i /></div>
        <p className="cs-wire-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4.5 4.5L19 7" />
          </svg>
          Sent
        </p>
      </div>

      <span className="cs-wire-flash" aria-hidden="true" />
    </div>
  );
}

/* --- 03 · the site ----------------------------------------------------------
   Sky, city, shell, crane, hoarding, and a dark fence right up against the
   camera. Six layers, so it has depth rather than just contents. */

function SiteScene({ cities, weeks }: { cities: number; weeks: number }) {
  return (
    <div className="cs-scene cs-site">
      {/* Authored portrait, 1:2, because that is the shape of the screen it
          has to fill. A tower crane over a rising shell is a vertical
          picture anyway. */}
      <svg viewBox="0 0 200 400" className="cs-site-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1018" />
            <stop offset="42%" stopColor="#1a2130" />
            <stop offset="72%" stopColor="#2e2b26" />
            <stop offset="100%" stopColor="#100e0b" />
          </linearGradient>
          <linearGradient id="cs-shellg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d2432" />
            <stop offset="100%" stopColor="#0d1118" />
          </linearGradient>
          <radialGradient id="cs-flood">
            <stop offset="0%" stopColor="rgba(255,226,170,0.4)" />
            <stop offset="100%" stopColor="rgba(255,226,170,0)" />
          </radialGradient>
        </defs>

        <rect width="200" height="400" fill="url(#cs-sky)" />

        {/* stars, thinning toward the light on the horizon */}
        <g fill="rgba(255,255,255,0.5)">
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 37) % 200} cy={12 + ((i * 53) % 150)} r={i % 5 === 0 ? 0.9 : 0.55} opacity={0.9 - (i % 150) / 200} />
          ))}
        </g>

        {/* the city this site is going up in */}
        <g fill="#0b0f16">
          <path d="M0 258h13v-30h9v30h7v-46h11v46h8v-22h12v22h6v-34h10v34h9v-14h8v14h6v-30h11v30h9v-10h7v10h13v-26h10v26h9v-16h8v16h13v-38h10v38h10v-10h10v10H0z" />
        </g>
        <g fill="rgba(255,214,150,0.3)">
          {Array.from({ length: 36 }, (_, i) => (
            <rect key={i} x={3 + i * 5.4} y={226 + (i % 6) * 5} width="1.5" height="2" />
          ))}
        </g>

        {/* the shell, floor by floor */}
        <g className="cs-shell">
          {[0, 1, 2, 3, 4, 5].map((f) => (
            <g key={f} className="cs-floor-lift" style={{ ['--d' as string]: `${500 + f * 330}ms` }}>
              <rect x="44" y={296 - f * 27} width="112" height="27" fill="url(#cs-shellg)" stroke="rgba(255,255,255,0.17)" strokeWidth="0.7" />
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <rect key={c} x={49 + c * 18} y={301 - f * 27} width="13" height="16" fill="rgba(120,165,215,0.08)" />
              ))}
            </g>
          ))}
        </g>

        {/* scaffold cage over the face */}
        <g stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" className="cs-scaff" fill="none">
          <path d="M41 322V128M159 322V128M41 128h118M41 182h118M41 236h118M41 290h118M80 322V128M120 322V128" />
        </g>

        {/* tower crane */}
        <g className="cs-crane">
          <path d="M176 322V52" stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" />
          <path d="M171 322h10M172.5 300h7M172.5 268h7M172.5 236h7M172.5 204h7M172.5 172h7M172.5 140h7M172.5 108h7M172.5 76h7"
            stroke="rgba(255,255,255,0.24)" strokeWidth="0.6" fill="none" />
          <g className="cs-jib">
            <path d="M56 52h136M176 34l-120 18M176 34l16 18" stroke="rgba(232,163,60,0.92)" strokeWidth="2" fill="none" />
            <path d="M70 52l12-13M92 52l12-13M114 52l12-13M136 52l12-13M158 52l12-13" stroke="rgba(232,163,60,0.45)" strokeWidth="0.6" fill="none" />
            <g className="cs-hoist">
              <path d="M84 52v72" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
              <rect x="74" y="124" width="20" height="12" rx="1.4" fill="#e8a33c" />
              <rect x="77" y="128" width="14" height="1.6" fill="rgba(0,0,0,0.3)" />
            </g>
          </g>
        </g>

        {/* floodlight pools and the crew on the deck */}
        <ellipse cx="72" cy="318" rx="42" ry="12" fill="url(#cs-flood)" />
        <ellipse cx="142" cy="318" rx="36" ry="10" fill="url(#cs-flood)" />
        <Worker x={62} y={288} scale={0.85} />
        <Worker x={132} y={291} scale={0.75} flip />

        {/* the yard */}
        <rect x="0" y="322" width="200" height="78" fill="#080a0f" />
        <rect x="0" y="322" width="200" height="0.8" fill="rgba(255,255,255,0.15)" />

        <g className="cs-truck is-a">
          <rect x="0" y="330" width="34" height="13" rx="1.6" fill="#2a3140" />
          <rect x="34" y="333" width="12" height="10" rx="1.6" fill="#39414f" />
          <rect x="35.5" y="335" width="6" height="4" fill="rgba(255,230,180,0.55)" />
          <circle cx="10" cy="343" r="3.2" fill="#05070a" /><circle cx="27" cy="343" r="3.2" fill="#05070a" /><circle cx="41" cy="343" r="3.2" fill="#05070a" />
        </g>
        <g className="cs-truck is-b">
          <rect x="0" y="332" width="27" height="11" rx="1.6" fill="#1f2531" />
          <rect x="27" y="335" width="10" height="8" rx="1.6" fill="#2b3240" />
          <circle cx="8" cy="343" r="2.8" fill="#05070a" /><circle cx="22" cy="343" r="2.8" fill="#05070a" /><circle cx="33" cy="343" r="2.8" fill="#05070a" />
        </g>

        {/* hoarding, right up against the camera */}
        <g className="cs-fence">
          <rect x="0" y="352" width="200" height="48" fill="#04050a" />
          {Array.from({ length: 26 }, (_, i) => (
            <rect key={i} x={i * 8} y="344" width="2.2" height="56" fill="#04050a" />
          ))}
          <rect x="14" y="360" width="62" height="15" rx="1.6" fill="rgba(var(--sf-brand-rgb), 0.94)" />
          <text x="45" y="370.6" textAnchor="middle" fontSize="7.4" fill="#fff" fontFamily="ui-monospace, monospace">
            {cities > 1 ? `SITE 1/${cities}` : 'SITE'}
          </text>
        </g>
      </svg>

      <div className="cs-dust" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ ['--d' as string]: `${i * 520}ms`, left: `${6 + i * 6.6}%`, ['--s' as string]: `${0.5 + (i % 4) * 0.35}` }} />
        ))}
      </div>

      <p className="cs-hud">
        <i aria-hidden="true" />
        {weeks > 0 ? `Week 1 of ${weeks}` : 'Fit-out only'}
      </p>
    </div>
  );
}

/* --- 04 · the install -------------------------------------------------------
   One-point perspective down a real aisle. Cabinets recede toward a vanishing
   point, which is the difference between a data hall and a row of rectangles. */

/* Wide shots of a corridor say "somewhere". Close on one open cabinet with a
   machine going into it says "this is the thing you bought", and it is the only
   framing at this scale where the detail is worth drawing. */

const RACK = { x: 24, y: 56, w: 116, h: 252 };
const SLOTS = 16;

function InstallScene({ racks }: { racks: number }) {
  const slotH = (RACK.h - 26) / SLOTS;

  return (
    <div className="cs-scene cs-install">
      <svg viewBox="0 0 200 400" className="cs-install-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cs-hall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0e15" />
            <stop offset="62%" stopColor="#0c111a" />
            <stop offset="100%" stopColor="#141a24" />
          </linearGradient>
          <linearGradient id="cs-steel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#232a36" />
            <stop offset="26%" stopColor="#151a24" />
            <stop offset="100%" stopColor="#0e131b" />
          </linearGradient>
          <linearGradient id="cs-srv" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2b323f" />
            <stop offset="60%" stopColor="#1d2430" />
            <stop offset="100%" stopColor="#161c26" />
          </linearGradient>
          <radialGradient id="cs-key">
            <stop offset="0%" stopColor="rgba(190,220,255,0.22)" />
            <stop offset="100%" stopColor="rgba(190,220,255,0)" />
          </radialGradient>
        </defs>

        <rect width="200" height="400" fill="url(#cs-hall)" />

        {/* the rest of the hall, thrown out of focus behind */}
        <g opacity="0.4">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={158 + i * 14} y={96 - i * 6} width="11" height={210 + i * 10} fill="#10151d" />
          ))}
          {[0, 1, 2].map((i) => (
            <rect key={`l${i}`} x={-6 + i * 12} y={104 + i * 6} width="9" height={200} fill="#0e131a" />
          ))}
        </g>
        <ellipse cx="100" cy="120" rx="120" ry="90" fill="url(#cs-key)" />

        {/* the cabinet: frame, then the open door swung toward us */}
        <rect x={RACK.x} y={RACK.y} width={RACK.w} height={RACK.h} rx="2" fill="url(#cs-steel)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.9" />
        <rect x={RACK.x + 5} y={RACK.y + 8} width={RACK.w - 10} height={RACK.h - 26} fill="#070a0f" />
        {/* mounting rails, punched */}
        {[RACK.x + 8, RACK.x + RACK.w - 11].map((rx) => (
          <g key={rx}>
            <rect x={rx} y={RACK.y + 8} width="3" height={RACK.h - 26} fill="#2a323f" />
            {Array.from({ length: SLOTS * 3 }, (_, i) => (
              <rect key={i} x={rx + 1} y={RACK.y + 10 + i * ((RACK.h - 30) / (SLOTS * 3))} width="1" height="1.4" fill="#0a0d13" />
            ))}
          </g>
        ))}

        {/* the machines already in, filling from the bottom */}
        {Array.from({ length: SLOTS }, (_, i) => {
          const filled = i > 2;
          const y = RACK.y + 12 + i * slotH;
          if (!filled) return null;
          return (
            <g key={i} className="cs-u" style={{ ['--d' as string]: `${300 + (SLOTS - i) * 90}ms` }}>
              <rect x={RACK.x + 12} y={y} width={RACK.w - 24} height={slotH - 1.6} rx="0.8" fill="url(#cs-srv)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
              {/* drive bays */}
              {[0, 1, 2, 3, 4, 5].map((b) => (
                <rect key={b} x={RACK.x + 16 + b * 7.2} y={y + 1.6} width="5.6" height={slotH - 4.8} fill="rgba(255,255,255,0.055)" />
              ))}
              {/* vents and the status light */}
              <rect x={RACK.x + 64} y={y + 2} width={26} height={slotH - 5.6} fill="rgba(255,255,255,0.03)" />
              <rect x={RACK.x + 96} y={y + slotH / 2 - 1.4} width="3.2" height="2.6" rx="0.6"
                fill={i % 3 === 0 ? 'rgba(72,201,138,0.95)' : 'rgba(var(--sf-brand-on-rgb),0.95)'} />
              <rect x={RACK.x + 102} y={y + slotH / 2 - 1.4} width="3.2" height="2.6" rx="0.6" fill="rgba(255,255,255,0.35)" />
            </g>
          );
        })}

        {/* the one going in right now, still on the rails and half out */}
        <g className="cs-slide">
          <rect x={RACK.x + 12} y={RACK.y + 12 + 1 * slotH} width={RACK.w - 24} height={slotH - 1.6} rx="0.8"
            fill="url(#cs-srv)" stroke="rgba(190,220,255,0.5)" strokeWidth="0.7" />
          {[0, 1, 2, 3, 4, 5].map((b) => (
            <rect key={b} x={RACK.x + 16 + b * 7.2} y={RACK.y + 13.6 + 1 * slotH} width="5.6" height={slotH - 4.8} fill="rgba(255,255,255,0.07)" />
          ))}
          <rect x={RACK.x + 96} y={RACK.y + 12 + 1 * slotH + slotH / 2 - 1.4} width="3.2" height="2.6" rx="0.6" fill="rgba(255,255,255,0.5)" />
        </g>

        {/* cable arms and a loom running out of the back */}
        <g stroke="rgba(72,201,138,0.55)" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d={`M${RACK.x + RACK.w} ${RACK.y + 60} q18 12 22 34`} />
          <path d={`M${RACK.x + RACK.w} ${RACK.y + 92} q22 14 26 40`} />
        </g>
        <g stroke="rgba(232,163,60,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d={`M${RACK.x} ${RACK.y + 150} q-16 16 -18 44`} />
        </g>

        {/* the door, open toward the camera, perforated */}
        <g className="cs-door">
          <path d={`M${RACK.x} ${RACK.y} L${RACK.x - 26} ${RACK.y + 22} L${RACK.x - 26} ${RACK.y + RACK.h - 4} L${RACK.x} ${RACK.y + RACK.h} Z`}
            fill="#11161f" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
          <g fill="rgba(255,255,255,0.05)">
            {Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={RACK.x - 6 - (i % 4) * 5} cy={RACK.y + 34 + Math.floor(i / 4) * 24} r="1.5" />
            ))}
          </g>
          <rect x={RACK.x - 8} y={RACK.y + 150} width="4" height="20" rx="2" fill="#39414f" />
        </g>

        {/* the floor it is bolted to */}
        <rect x="0" y="308" width="200" height="92" fill="#090d13" />
        <rect x="0" y="308" width="200" height="0.8" fill="rgba(255,255,255,0.12)" />
        <ellipse cx="82" cy="312" rx="78" ry="7" fill="rgba(0,0,0,0.62)" />

        {/* the asset plate, on the cabinet's own top panel */}
        <rect x={RACK.x + 30} y={RACK.y + 1.5} width="52" height="7" rx="1.2" fill="rgba(var(--sf-brand-rgb),0.9)" />
        <text x={RACK.x + 56} y={RACK.y + 6.8} textAnchor="middle" fontSize="4.4" fill="#fff" fontFamily="ui-monospace, monospace">RACK 01</text>

        {/* the engineer doing it, standing on the floor beside the cabinet */}
        <Worker x={158} y={214} scale={2.85} flip />
      </svg>

      <p className="cs-hud"><i aria-hidden="true" />Rack 01 · {racks} of {racks} placed</p>
    </div>
  );
}

/* --- 05 · the acceptance test ----------------------------------------------- */

const TESTS = ['Mains', 'Generators', 'Chillers', 'Switch', 'Disk', 'Burn-in'];

/* Six green tiles is a report. The acceptance test is an *event*: an engineer
   throws the mains breaker with the whole floor at full load and everyone in
   the room watches the lights to see how long the dark lasts. One timeline
   drives the lever, the lights, the emergency lamps and the generator. */

function Acceptance() {
  return (
    <div className="cs-scene cs-accept">
      <svg viewBox="0 0 200 400" className="cs-accept-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cs-room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1219" />
            <stop offset="100%" stopColor="#070a0f" />
          </linearGradient>
          <linearGradient id="cs-cab" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#20262f" />
            <stop offset="30%" stopColor="#161b23" />
            <stop offset="100%" stopColor="#0f141b" />
          </linearGradient>
          <radialGradient id="cs-pool">
            <stop offset="0%" stopColor="rgba(200,225,255,0.24)" />
            <stop offset="100%" stopColor="rgba(200,225,255,0)" />
          </radialGradient>
          <radialGradient id="cs-empool">
            <stop offset="0%" stopColor="rgba(255,168,80,0.4)" />
            <stop offset="100%" stopColor="rgba(255,168,80,0)" />
          </radialGradient>
        </defs>

        <rect width="200" height="400" fill="url(#cs-room)" />

        {/* overhead trunking */}
        <rect x="0" y="34" width="200" height="7" fill="#0d1219" />
        <rect x="0" y="41" width="200" height="1.4" fill="rgba(255,255,255,0.08)" />

        {/* three switchgear cubicles */}
        {[14, 74, 134].map((x, i) => (
          <g key={x}>
            <rect x={x} y="96" width="52" height="196" rx="2" fill="url(#cs-cab)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
            <rect x={x + 4} y="104" width="44" height="30" rx="1.2" fill="#080c12" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            {/* the cubicle's own indicator lamps */}
            {[0, 1, 2].map((l) => (
              <circle key={l} cx={x + 12 + l * 14} cy="119" r="3.4"
                className={l === 0 ? 'cs-lamp is-a' : l === 1 ? 'cs-lamp is-b' : 'cs-lamp is-c'} />
            ))}
            {/* dial */}
            <circle cx={x + 26} cy="164" r="15" fill="#080c12" stroke="rgba(255,255,255,0.16)" strokeWidth="0.7" />
            <path d={`M${x + 26} 164 L${x + 26} 152`} stroke="rgba(255,255,255,0.5)" strokeWidth="1"
              className={i === 1 ? 'cs-needle' : undefined} style={{ transformOrigin: `${x + 26}px 164px` }} />
            <text x={x + 26} y="186" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, monospace">
              {['A FEED', 'MAINS', 'B FEED'][i]}
            </text>
            {/* door seams and handle */}
            <rect x={x + 4} y="196" width="44" height="88" rx="1.2" fill="#0c1118" stroke="rgba(255,255,255,0.09)" strokeWidth="0.5" />
            <rect x={x + 42} y="232" width="3" height="16" rx="1.5" fill="#39414f" />
          </g>
        ))}

        {/* the mains breaker, with a lever an engineer can actually pull */}
        <g className="cs-lever" style={{ transformOrigin: '100px 246px' }}>
          <rect x="96" y="216" width="8" height="32" rx="3" fill="#c33" />
          <circle cx="100" cy="216" r="6" fill="#e2453f" />
        </g>
        <rect x="82" y="244" width="36" height="7" rx="1.4" fill="#1b212b" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        <text x="100" y="262" textAnchor="middle" fontSize="5.2" fill="rgba(255,255,255,0.45)" fontFamily="ui-monospace, monospace">MAINS · 11kV</text>

        {/* the generator that has to catch it */}
        <g>
          <rect x="150" y="300" width="46" height="42" rx="2" fill="#141922" stroke="rgba(255,255,255,0.16)" strokeWidth="0.7" />
          <circle cx="164" cy="321" r="10" fill="#0a0e14" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" />
          <g className="cs-fan" style={{ transformOrigin: '164px 321px' }}>
            <path d="M164 313v16M156 321h16M158.5 315.5l11 11M169.5 315.5l-11 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
          </g>
          <rect x="178" y="312" width="14" height="18" rx="1" fill="#080c12" />
          <rect x="180" y="326" width="10" height="2" className="cs-genbar" />
          <text x="173" y="350" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.35)" fontFamily="ui-monospace, monospace">GEN 1</text>
        </g>

        {/* floor and its safety line */}
        <rect x="0" y="292" width="200" height="108" fill="#080b11" />
        <rect x="0" y="292" width="200" height="0.8" fill="rgba(255,255,255,0.1)" />
        <rect x="0" y="300" width="200" height="1.6" fill="rgba(232,163,60,0.3)" />

        {/* the engineer with a hand on the lever */}
        <Worker x={46} y={224} scale={2.2} />

        {/* the lights: on, then out, then back */}
        <g className="cs-lights">
          <rect x="34" y="26" width="60" height="4" rx="2" fill="rgba(255,255,255,0.85)" />
          <rect x="112" y="26" width="60" height="4" rx="2" fill="rgba(255,255,255,0.85)" />
          <ellipse cx="64" cy="150" rx="90" ry="120" fill="url(#cs-pool)" />
          <ellipse cx="142" cy="150" rx="90" ry="120" fill="url(#cs-pool)" />
        </g>

        {/* the emergency lamps that come on while it is dark */}
        <g className="cs-emerg">
          <rect x="6" y="60" width="12" height="5" rx="1" fill="rgba(255,168,80,0.95)" />
          <rect x="182" y="60" width="12" height="5" rx="1" fill="rgba(255,168,80,0.95)" />
          <ellipse cx="100" cy="200" rx="130" ry="150" fill="url(#cs-empool)" />
        </g>

        {/* the dark itself */}
        <rect className="cs-black" width="200" height="400" fill="#020306" />
      </svg>

      <div className="cs-stopwatch">
        <b>0.012<i>s</i></b>
        <em>in the dark · the racks never noticed</em>
      </div>

      <ul className="cs-tests">
        {TESTS.map((t, i) => (
          <li key={t} style={{ ['--d' as string]: `${2400 + i * 200}ms` }}><i aria-hidden="true">✓</i>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/* --- 06 · the routes come up ------------------------------------------------
   The servers stand up one city at a time, the links draw between them, and
   the coverage spreads outward until the markets are inside it. */

function WorldWake({ cities }: { cities: City[] }) {
  const selectedRegionIds = Array.from(new Set(cities.flatMap(city => {
    const regionId = getProductionLocation(city.id)?.regionId;
    return regionId ? [regionId] : [];
  }))) as BoxOfficeRegionId[];
  const locationPins: RegionMapLocationPin[] = cities.map(city => ({
    id: city.id,
    name: city.name,
    x: city.plot.x,
    y: city.plot.y,
    longitude: city.coord.lng,
    latitude: city.coord.lat,
    selected: true,
    regionId: getProductionLocation(city.id)?.regionId,
  }));

  return (
    <div className="cs-scene cs-net cs-scout-net bw-game-map">
      <InteractiveRegionMap
        selectedRegionIds={selectedRegionIds}
        locationPins={locationPins}
        visualTone="production"
        compact
        showPreview={false}
        ariaLabel={`Commissioned infrastructure map: ${cities.length} ${cities.length === 1 ? 'site' : 'sites'} online`}
      />
    </div>
  );
}
