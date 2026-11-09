/**
 * The Platform room's STATUS tab (codex-handoff/plans/platform-tech-plan.md §7, Phase 3 #49): the
 * health board of everything running, and one incident list for crises and server incidents.
 *
 *   banner           the worst of everything below, in one line
 *   open incidents   both systems, the worst first: what it is, where, how long, what it does
 *                    each week, and its repair (#50): Repair now (energy and some cash, fixed this
 *                    week), Fix (cash, 3 or 5 weeks) or Wait it out (6 or 10 weeks of damage);
 *                    a title on pirate sites (#55) reads as a takedown: Take it down now, File
 *                    takedowns, Let it run. Incident Command's responses stay a tap away.
 *                    #101 (Zeesh: "open incident wala … thoda sa minimal kar dijiye"): one line of
 *                    what it does, no paragraph, the three answers side by side
 *   service          the four service strips, 30 weeks of status-page bars (#102: from the launch while
 *                    the service is younger, as every line here; Zeesh: "service bhi launch se shuru karo")
 *   servers          by region, with their providers: working, slow (maintenance behind, a repair
 *                    under way) or down (a server incident nobody has answered). #101 (Zeesh: "city
 *                    wise … ek line server ka"): a line of 30 weeks a region and a city. #102 (Zeesh:
 *                    "same goes with servers, ek single row ho"): one line, the worst city each week, that
 *                    opens to the regions, a region to its cities; in trouble it opens itself
 *   tech             each group running something; Picture is slow when the network delivers less
 *                    than the plans sell. #101: a line a group. #102 (Zeesh: "tech ka ek pura row ho
 *                    jaye simple single"): one line, opening to the groups, as the servers
 *   products         launched products
 *   coverage         where the servers reach (the Network tab's three signals)
 *   history          resolved incidents from both systems; #102 (Zeesh: "zyada se zyada ek saal ka
 *                    incident"): the last year's, a line each, the first five and the rest on a tap
 *
 * Without a board (the founding prototype) it is the status page it was: the banner from the
 * strips, the seven strips and the crisis history.
 */
import s from './presentation/screens/NetworkDesk/NetworkDesk.module.css';
import st from './presentation/screens/NetworkDesk/PlatformStatus.module.css';
import { cx } from './presentation/cx';
import React, { useState } from 'react';
import type { CompStatus, NetComponent, NetworkState } from './StreamingNetworkExperience';
import type {
  StreamingStatusBoard,
  StreamingStatusDay,
  StreamingStatusIncident,
  StreamingStatusLevel,
  StreamingStatusOverview,
  StreamingStatusRow,
  StreamingStatusSection,
} from '../../services/streamingStatusBoard';
import type { StreamingIncidentRepairOption, StreamingIncidentRepairPath } from '../../services/streamingIncidentRepair';
import { gameYearWeekShort, gameYearWeekText } from '../../services/gameWeek';

/** what a repair did: its message for the player */
export type PlatformRepairResult = { ok: boolean; message: string };

const STATUS_WORDS: Record<CompStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  outage: 'Major outage',
  maintenance: 'Under maintenance',
};
/* the Network tab's reach signals: gaps in coverage, not something broken */
const COVERAGE_WORDS: Record<CompStatus, string> = {
  operational: 'Covered', degraded: 'Thin', outage: 'Gaps', maintenance: 'Not built',
};
const LEVEL_COMP: Record<StreamingStatusLevel, CompStatus> = { WORKING: 'operational', SLOW: 'degraded', DOWN: 'outage' };
const ROW_WORDS: Record<StreamingStatusRow['status'], string> = { WORKING: 'Working', SLOW: 'Slow', DOWN: 'Down', OFF: 'Off' };
const SERVICE_IDS = ['DELIVERY', 'ACCOUNTS', 'RECOMMENDATIONS', 'RIGHTS'];
const COVERAGE_IDS = ['REACH', 'SERVED', 'REGIONS'];

const count = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`);
const weeksWords = (weeks: number) => (weeks <= 0 ? 'this week' : `${weeks} week${weeks === 1 ? '' : 's'}`);
const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);

/* the energy mark the Tech and Localization tabs use */
const Bolt: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 5 13.6h5.6l-1.3 7.9 8.2-11.1h-5.6l1.3-7.9Z" /></svg>
);
const REPAIR_TITLE: Record<StreamingIncidentRepairPath, string> = { ENERGY: 'Repair now', FIX: 'Fix', WAIT: 'Wait it out' };
/* a title on pirate sites (#55) is taken down, not repaired */
const TAKEDOWN_TITLE: Record<StreamingIncidentRepairPath, string> = { ENERGY: 'Take it down now', FIX: 'File takedowns', WAIT: 'Let it run' };
const repairTitle = (incident: StreamingStatusIncident, path: StreamingIncidentRepairPath) => (incident.takedown ? TAKEDOWN_TITLE : REPAIR_TITLE)[path];
/* #101 a repair's price in a few words under its name ("25⚡ + $500K", "$2M · 3 wks", "Free · 4 wks"); the button
   says the rest to a screen reader */
const weeksShort = (weeks: number) => `${weeks} wk${weeks === 1 ? '' : 's'}`;
const RepairCost: React.FC<{ option: StreamingIncidentRepairOption }> = ({ option }) => (
  option.path === 'ENERGY' ? <>{option.energy}<Bolt className={st.bolt} />{option.cash > 0 && <> + {money(option.cash)}</>}</>
    : option.path === 'FIX' ? <>{money(option.cash)} · {weeksShort(option.weeks)}</>
      : <>Free · {weeksShort(option.weeks)}</>
);
const repairWords = (option: StreamingIncidentRepairOption, takedown?: boolean): string => (
  option.path === 'ENERGY' ? `${option.energy} energy${option.cash > 0 ? ` and ${money(option.cash)}` : ''}, ${takedown ? 'down this week' : 'fixed this week'}`
    : option.path === 'FIX' ? `${money(option.cash)}, ${takedown ? 'down in' : 'repaired in'} ${weeksWords(option.weeks)}`
      : `free, ${weeksWords(option.weeks)} ${takedown ? 'on pirate sites' : 'of damage'}`
);
const stageWords = (incident: StreamingStatusIncident): string => {
  if (incident.stage === 'OPEN') {
    const left = incident.weeksToRunItsCourse ?? 0;
    /* #101: how long it runs if left is the Wait button's own number */
    if (incident.takedown) return incident.repairPath === 'WAIT' ? `Letting it run · ${weeksWords(left)} left` : 'Needs a takedown';
    return incident.repairPath === 'WAIT' ? `Waiting it out · ${weeksWords(left)} left` : 'Needs a response';
  }
  const verb = incident.takedown ? 'Taking it down' : incident.repairPath === 'FIX' ? 'Fixing' : 'Repairing';
  return incident.weeksLeft === null ? verb : `${verb} · ${incident.weeksLeft <= 0 ? 'fixed this week' : `${weeksWords(incident.weeksLeft)} left`}`;
};

/** The banner the strips alone give (the prototype's status page). */
export const statusFromComponents = (components: NetComponent[]): CompStatus => {
  if (components.some(x => x.status === 'outage')) return 'outage';
  if (components.some(x => x.status === 'degraded')) return 'degraded';
  if (components.some(x => x.status === 'maintenance')) return 'maintenance';
  return 'operational';
};
/** The page's state: the board's when there is one. */
export const platformStatusOverall = (state: NetworkState, board?: StreamingStatusBoard): CompStatus => (
  board ? LEVEL_COMP[board.overall] : statusFromComponents(state.components)
);

const Strip: React.FC<{ comp: NetComponent; words: Record<CompStatus, string> }> = ({ comp, words }) => (
  <div className={s.comp}>
    <div className={s.comptop}>
      <b>{comp.name}</b>
      <em className={s[comp.status] ?? comp.status}>{words[comp.status]}</em>
    </div>
    {/* the uptime strip — the one element that says "status page" instantly */}
    <div className={s.upstrip}>
      {comp.history.map((d, n) => (
        <i key={n} className={d === 3 ? s.none : d === 2 ? s.down : d === 1 ? s.deg : s.ok} />
      ))}
    </div>
    {/* one bar per weekly settlement, so the strip is read in weeks */}
    <div className={s.compfoot}>
      <span>{comp.fromLaunch ? 'Launch' : `${comp.history.length} weeks ago`}</span>
      <em>{comp.uptime.toFixed(comp.measure ? 0 : 2)}% {comp.measure ?? 'uptime'}</em>
      <span>this week</span>
    </div>
  </div>
);

/** #91: the incidents the network's load can cause (streamingStatusBoard.ts kinds), which the Network tab's load test tries out */
const LOAD_INCIDENT_KINDS = new Set(['Traffic spike', 'Slow streaming', 'Platform outage', 'Regional outage']);

const IncidentCard: React.FC<{
  incident: StreamingStatusIncident;
  onRespond?: (incident: StreamingStatusIncident) => void;
  onRepair?: (incident: StreamingStatusIncident, path: StreamingIncidentRepairPath) => void;
  onTestLoad?: () => void;
}> = ({ incident, onRespond, onRepair, onTestLoad }) => {
  const repairs = incident.stage === 'OPEN' && onRepair ? incident.repairs ?? [] : [];
  const refused = repairs.find(option => !option.available && option.refusal);
  const respond = onRespond && incident.stage === 'OPEN';
  const testLoad = onTestLoad && incident.stage === 'OPEN' && LOAD_INCIDENT_KINDS.has(incident.kind);
  /* #101 (Zeesh: "open incident wala … thoda sa minimal"): what it is and where, what it does each week in one line,
     and its answers side by side; the paragraph about it is gone (the title says it) */
  return (
  <div className={cx(st.inc, incident.stage === 'OPEN' ? incident.repairPath === 'WAIT' ? st.waiting : st.open : st.repairing, incident.major && st.major)}>
    <div className={st.inctop}>
      <span className={st.sev}>{incident.severity}</span>
      <span className={st.stage}>{stageWords(incident)}</span>
    </div>
    <b className={st.inctitle}>{incident.title}</b>
    <span className={st.incwhere}>
      {incident.kind}{incident.where ? ` · ${incident.where}` : ''} · {incident.weeks <= 0 ? 'opened this week' : `open ${weeksWords(incident.weeks)}`}
      {incident.affectedViewers > 0 ? ` · ${count(incident.affectedViewers)} viewers hit` : ''}
    </span>
    {/* #169: answered by your team's executive */}
    {incident.repairedBy && (
      <span className={st.byChip}>{incident.stage === 'RESOLVED' ? 'Fixed' : incident.takedown ? 'Takedown filed' : 'Fix ordered'} by {incident.repairedBy.split(' ')[0]}</span>
    )}
    {incident.damage.length > 0 && (
      <p className={st.damage} aria-label={`Each week while it is open: ${incident.damage.join(', ')}`}>
        {incident.damage.map((line, index) => (
          <React.Fragment key={line}>{index > 0 && ' · '}<span>{line.replace(/ a week$/, '/wk')}</span></React.Fragment>
        ))}
      </p>
    )}
    {repairs.length > 0 && (
      <div className={st.repairs} style={{ ['--n' as string]: repairs.length } as React.CSSProperties}>
        {repairs.map(option => (
          <button type="button" key={option.path} className={cx(st.rp, st[`rp${option.path.toLowerCase()}`])}
            disabled={!option.available} onClick={() => onRepair?.(incident, option.path)}
            aria-label={`${repairTitle(incident, option.path)}: ${repairWords(option, incident.takedown)}`}>
            <b>{repairTitle(incident, option.path)}</b>
            <span><RepairCost option={option} /></span>
          </button>
        ))}
      </div>
    )}
    {refused && <p className={st.rprefuse}>{repairTitle(incident, refused.path)}: {refused.refusal}</p>}
    {(respond || testLoad) && (
      <div className={st.links}>
        {respond && (repairs.length > 0
          ? <button type="button" className={st.more} onClick={() => onRespond?.(incident)}>More ways to respond ›</button>
          : <button type="button" className={st.respond} onClick={() => onRespond?.(incident)}>Respond ›</button>)}
        {testLoad && <button type="button" className={st.more} onClick={onTestLoad}>Test the load on Network ›</button>}
      </div>
    )}
  </div>
  );
};

/* ── #101 lines: a bar a week for the last 30 weeks, in the service strips' colours; #102 from the launch while the
   service is younger, so no week before it is drawn ── */
const DAY_CLASS: Record<StreamingStatusDay, string> = { WORKING: 'dok', SLOW: 'dslow', DOWN: 'ddown', NONE: 'dnone' };
const Line: React.FC<{ days: StreamingStatusDay[]; big?: boolean }> = ({ days, big }) => (
  <span className={cx(st.line, big && st.big)} aria-hidden="true">
    {days.map((day, n) => <i key={n} className={st[DAY_CLASS[day]]} />)}
  </span>
);
const lineWords = (row: Pick<StreamingStatusRow, 'label' | 'status' | 'reason' | 'history'>) => {
  const days = row.history ?? [];
  const bad = days.filter(day => day === 'SLOW' || day === 'DOWN').length;
  return `${row.label}: ${ROW_WORDS[row.status]}${row.reason ? `. ${row.reason}` : ''}. ${bad === 0 ? 'No trouble in' : `Trouble in ${bad} of`} the last ${days.length} weeks`;
};
/** a city, or a tech group: its name, its line, its light; why, when it is not working */
const LineRow: React.FC<{ row: StreamingStatusRow }> = ({ row }) => (
  <div className={cx(st.lrow, st[row.status.toLowerCase()])} role="listitem" aria-label={lineWords(row)}>
    <b className={st.lname}>{row.label}</b>
    <Line days={row.history ?? []} />
    <i className={st.ldot} aria-hidden="true" />
    {row.reason && <em className={st.lwhy}>{row.reason}</em>}
  </div>
);
/** a region: the worst of its cities each week; a tap opens a line a city under it */
const RegionRow: React.FC<{ row: StreamingStatusRow; open: boolean; onToggle: () => void }> = ({ row, open, onToggle }) => (
  <div role="listitem">
    <button type="button" className={cx(st.lrow, st.lfold, st[row.status.toLowerCase()], open && st.isopen)} aria-expanded={open} onClick={onToggle}
      aria-label={`${lineWords(row)}. ${row.detail}. ${open ? 'Hide' : 'Show'} its cities`}>
      <b className={st.lname}><i className={st.chev} aria-hidden="true" />{row.label}</b>
      <Line days={row.history ?? []} />
      <i className={st.ldot} aria-hidden="true" />
      {row.reason && !open && <em className={st.lwhy}>{row.reason}</em>}
    </button>
    {open && (
      <div className={st.lcities} role="list" aria-label={`${row.label}'s cities`}>
        {(row.cities ?? []).map(city => <LineRow key={city.id} row={city} />)}
      </div>
    )}
  </div>
);
/** #102 (Zeesh: "tech ka ek pura row ho jaye simple single … same goes with servers, ek single row ho"): the servers or
    the tech as one line, the worst of its rows each week, "Launch" under its first bar while the service is younger
    than the line; a tap opens its rows (a region opens to its cities), and in trouble it opens itself, each row in
    trouble saying why */
const SectionLine: React.FC<{ section: StreamingStatusSection; overview: StreamingStatusOverview; fromLaunch: boolean }> = ({ section, overview, fromLaunch }) => {
  const [open, setOpen] = useState(overview.status !== 'WORKING');
  const [regions, setRegions] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setRegions(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const what = section.id === 'SERVERS' ? 'regions' : 'tech groups';
  /* what grey means, when a line on show has weeks before it ran (a city built later, a tech unlocked later) */
  const grey = section.rows.some(row => row.history?.includes('NONE')
    || (regions.has(row.id) && (row.cities ?? []).some(city => city.history?.includes('NONE'))));
  return (
    <div className={cx(st.fold, st[overview.status.toLowerCase()], open && st.isopen)}>
      <button type="button" className={st.fhead} aria-expanded={open} onClick={() => setOpen(!open)}
        aria-label={`${lineWords({ ...overview, label: section.title })}. ${overview.label}. ${open ? 'Hide' : 'Show'} its ${what}`}>
        <span className={st.fsum}>{overview.label}</span>
        <span className={st.fword}>{ROW_WORDS[overview.status]}</span>
        <i className={st.chev} aria-hidden="true" />
        <Line days={overview.history} big />
        <span className={st.laxis} aria-hidden="true">
          <span>{fromLaunch ? 'Launch' : `${overview.history.length} weeks ago`}</span><span>this week</span>
        </span>
      </button>
      {overview.reason && !open && <em className={st.fwhy}>{overview.reason}</em>}
      {open && (
        <div className={st.frows} role="list" aria-label={`${section.title}: its ${what}`}>
          {grey && <span className={st.lgrey} aria-hidden="true"><i />not running yet</span>}
          {section.rows.map(row => (row.cities
            ? <RegionRow key={row.id} row={row} open={regions.has(row.id)} onToggle={() => toggle(row.id)} />
            : <LineRow key={row.id} row={row} />))}
        </div>
      )}
    </div>
  );
};

/** #102 (Zeesh: "zyada se zyada ek saal ka incident"): the last year's incidents, a line each (what, where, the week it
    began, how long it ran), the first five and the rest on a tap; a tap on one tells what happened */
const HISTORY_FIRST = 5;
const IncidentHistory: React.FC<{ incidents: StreamingStatusIncident[] }> = ({ incidents }) => {
  const [all, setAll] = useState(false);
  const [told, setTold] = useState<string | null>(null);
  return (
    <>
      <div className={st.past} role="list">
        {(all ? incidents : incidents.slice(0, HISTORY_FIRST)).map(incident => {
          const city = incident.where?.split(' · ')[0];
          const ran = incident.weeks <= 0 ? 'Resolved the same week' : `Resolved in ${weeksWords(incident.weeks)}`;
          const open = told === incident.id;
          return (
            <div className={cx(st.pitem, incident.major && st.major)} role="listitem" key={incident.id}>
              <button type="button" className={st.phead} aria-expanded={open} onClick={() => setTold(open ? null : incident.id)}
                aria-label={`${incident.kind}${city ? ` in ${city}` : ''}, ${gameYearWeekText(incident.openedAtWeek)}. ${ran}. ${open ? 'Hide' : 'Show'} what happened`}>
                <i className={st.pdot} aria-hidden="true" />
                <b className={st.pname}>{incident.kind}{city ? ` · ${city}` : ''}{incident.repairedBy && <em className={st.pby}>Fixed by {incident.repairedBy.split(' ')[0]}</em>}</b>
                <span className={st.pwhen}>{gameYearWeekShort(incident.openedAtWeek)}{incident.weeks > 0 ? ` · ${weeksShort(incident.weeks)}` : ''}</span>
              </button>
              {open && <p className={st.pnote}><b>{incident.title}</b>{incident.note ? `${incident.note} ` : ''}{ran}.</p>}
            </div>
          );
        })}
      </div>
      {incidents.length > HISTORY_FIRST && (
        <button type="button" className={cx(st.more, st.pmore)} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${incidents.length} ›`}
        </button>
      )}
    </>
  );
};

const Row: React.FC<{ row: StreamingStatusRow }> = ({ row }) => (
  <div className={cx(st.row, st[row.status.toLowerCase()])}>
    <i className={st.rdot} />
    <div className={st.rtext}>
      <b>{row.label}</b>
      <span>{row.detail}</span>
      {row.reason && <em>{row.reason}</em>}
    </div>
    <span className={st.rstate}>{ROW_WORDS[row.status]}</span>
  </div>
);

export const PlatformStatus: React.FC<{
  state: NetworkState;
  board?: StreamingStatusBoard;
  /** Incident Command, for an incident nobody has answered yet */
  onRespond?: (incident: StreamingStatusIncident) => void;
  /** Repair now, Fix or Wait it out (#50) */
  onRepair?: (incident: StreamingStatusIncident, path: StreamingIncidentRepairPath) => PlatformRepairResult;
  /** #91: a load incident's way to the Network tab's load test */
  onTestLoad?: () => void;
}> = ({ state, board, onRespond, onRepair, onTestLoad }) => {
  const overall = platformStatusOverall(state, board);
  /* a repair's message stays above the list: a repaired incident leaves it at once */
  const [feedback, setFeedback] = useState<PlatformRepairResult | null>(null);
  const repair = onRepair ? (incident: StreamingStatusIncident, path: StreamingIncidentRepairPath) => setFeedback(onRepair(incident, path)) : undefined;

  /* the prototype's status page: the strips and the crisis history, as before */
  if (!board) {
    return (
      <>
        <div className={cx(s.banner, s[overall])}>
          <i className={s.bdot} />
          <div>
            <b>{overall === 'operational' ? 'All Systems Operational' : STATUS_WORDS[overall]}</b>
            <span>{overall === 'operational' ? 'Subscribers are watching normally' : 'Subscribers are seeing this right now'}</span>
          </div>
        </div>
        <section className={s.nwsec}>
          <div className={s.nwhead}><h2>Components</h2><span>last {state.components[0]?.history.length ?? 30} weeks</span></div>
          {state.components.map(comp => <Strip key={comp.id} comp={comp} words={STATUS_WORDS} />)}
        </section>
        <section className={s.nwsec}>
          <div className={s.nwhead}><h2>Incident history</h2></div>
          {state.incidents.length === 0 && <div className={s.nwempty}>No incidents recorded.</div>}
          {state.incidents.map(i => (
            <div className={cx(s.incident, s[i.severity])} key={i.id}>
              <div className={s.inctop}><b>{i.title}</b><em>{i.when}</em></div>
              <p>{i.note}</p>
              <span className={s.incres}>Resolved in {i.resolvedIn}</span>
            </div>
          ))}
        </section>
      </>
    );
  }

  const service = state.components.filter(comp => SERVICE_IDS.includes(comp.id));
  const coverage = state.components.filter(comp => COVERAGE_IDS.includes(comp.id));
  return (
    <div className={st.board}>
      <div className={cx(s.banner, s[overall])} role="status">
        <i className={s.bdot} />
        <div>
          <b>{board.headline}</b>
          <span>{board.line}</span>
        </div>
      </div>

      {feedback && <p className={cx(st.feedback, feedback.ok ? st.good : st.bad)} role="status">{feedback.message}</p>}

      {board.open.length > 0 && (
        <section className={s.nwsec}>
          <div className={s.nwhead}><h2>Open incidents</h2><span>{board.open.length} open</span></div>
          {board.open.map(incident => <IncidentCard key={incident.id} incident={incident} onRespond={onRespond} onRepair={repair} onTestLoad={onTestLoad} />)}
        </section>
      )}

      <section className={s.nwsec}>
        <div className={s.nwhead}><h2>Service</h2><span>{service[0]?.fromLaunch ? 'since launch' : `last ${service[0]?.history.length ?? 30} weeks`}</span></div>
        {service.map(comp => <Strip key={comp.id} comp={comp} words={STATUS_WORDS} />)}
      </section>

      {/* #126: products are coming in a future update, so the Products group shows only once a save runs one */}
      {board.sections.filter(section => section.id !== 'PRODUCTS' || section.rows.length > 0).map(section => (
        <section className={s.nwsec} key={section.id}>
          <div className={s.nwhead}><h2>{section.title}</h2>{section.note && <span>{section.note}</span>}</div>
          {section.rows.length === 0
            ? <div className={s.nwempty}>{section.empty}</div>
            : section.overview
              ? <SectionLine section={section} overview={section.overview} fromLaunch={board.lineFromLaunch} />
              : <div className={st.rows}>{section.rows.map(row => <Row key={row.id} row={row} />)}</div>}
        </section>
      ))}

      {coverage.length > 0 && (
        <section className={s.nwsec}>
          <div className={s.nwhead}><h2>Coverage</h2><span>where your servers reach</span></div>
          {coverage.map(comp => <Strip key={comp.id} comp={comp} words={COVERAGE_WORDS} />)}
        </section>
      )}

      <section className={s.nwsec}>
        <div className={s.nwhead}><h2>Incident history</h2><span>last 12 months</span></div>
        {board.history.length === 0
          ? <div className={s.nwempty}>No incidents in the last 12 months.</div>
          : <IncidentHistory incidents={board.history} />}
      </section>
    </div>
  );
};
