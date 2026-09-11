import React from 'react';
import type {
  ImproveUiAction,
  ImproveUiCourse,
  ImproveUiDisciplineKey,
  ImproveUiGenre,
  ImproveUiModel,
  ImproveUiSkill,
} from '../../services/improveUiAdapter';
import { BASE_CSS } from './theme';
import { Icon, Meter, Segmented, Sheet, Style, clamp, cssVar, money } from './ui';

interface ImproveScreenProps extends ImproveUiModel {
  onWellbeingAction: (action: ImproveUiAction) => void;
  onEnrollCourse: (course: ImproveUiCourse) => void;
  onCancelCourse: (commitmentId: string) => void;
  onTrainGenre: (genre: ImproveUiGenre) => void;
}

type TabKey = 'wellbeing' | 'workshops' | 'genre';
type OpenItem = { kind: 'wellbeing'; value: ImproveUiAction }
  | { kind: 'course'; value: ImproveUiCourse }
  | { kind: 'genre'; value: ImproveUiGenre };

const CSS = `
.si-head{display:flex;align-items:flex-start;gap:12px}.si-head-t{flex:1;min-width:0}.si-allstats{flex:none;display:flex;align-items:center;gap:6px;padding:9px 12px;border-radius:12px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--dim);background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--line)}.si-allstats:active{color:var(--gold)}
.si-week{display:flex;align-items:center;gap:12px;margin-top:15px;padding:11px 13px;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.si-week-i{width:32px;height:32px;flex:none;border-radius:11px;display:grid;place-items:center;color:var(--gold-hi);background:rgba(248,168,16,.11);box-shadow:inset 0 0 0 1px var(--line)}.si-week-t{flex:1;min-width:0}.si-week-v{display:block;font-size:15.5px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--gold-hi)}.si-week-v em,.si-week-v u{font-style:normal;text-decoration:none;font-size:9.5px;font-weight:750;letter-spacing:0;margin-left:6px}.si-week-v em{color:var(--dim)}.si-week-v u{color:var(--faint)}.si-budget{display:flex;gap:2.5px;height:7px;margin-top:8px}.si-slot{flex:1;border-radius:1.5px;background:rgba(248,168,16,.19)}.si-slot.is-left{background:var(--gold)}
.si-running{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin:8px -16px 0;padding:0 16px 2px}.si-running::-webkit-scrollbar{display:none}.si-run{flex:none;display:flex;align-items:center;gap:8px;padding:7px 8px 7px 11px;border-radius:11px;background:rgba(248,168,16,.08);box-shadow:inset 0 0 0 1px var(--line)}.si-run-t b{display:block;font-size:10.5px;font-weight:750;white-space:nowrap}.si-run-t span{display:block;margin-top:2px;font-size:8px;font-weight:800;color:var(--faint)}.si-run-e{font-size:9px;font-weight:800;color:var(--gold-hi)}.si-run-x{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;color:var(--faint);background:rgba(255,255,255,.06)}.si-run-x:active{color:var(--alert)}
.si-cond{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:9px}.si-dial{position:relative;min-width:0;padding:13px 5px 12px;border-radius:17px;text-align:center;background:color-mix(in srgb,var(--c) 7%,var(--card));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 18%,transparent)}.si-ring{display:block;position:relative;width:46px;height:46px;margin:0 auto}.si-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}.si-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:14px;font-weight:800;letter-spacing:-.03em;color:var(--c)}.si-dial-n{display:block;margin-top:8px;font-size:7.5px;font-weight:800;letter-spacing:.09em;color:var(--dim);white-space:nowrap}.si-weak{position:absolute;top:8px;right:8px;width:6px;height:6px;border-radius:50%;background:var(--alert);box-shadow:0 0 8px var(--alert)}
.si-venue{margin-top:10px;padding:13px 13px 6px;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.si-venue-h{display:flex;align-items:center;gap:11px;padding-bottom:12px;border-bottom:1px solid var(--line-2)}.si-venue-i{width:38px;height:38px;flex:none;border-radius:13px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 26%,transparent)}.si-venue-t{flex:1;min-width:0}.si-venue-n{display:block;font-size:15px;font-weight:800;letter-spacing:-.025em}.si-venue-d{display:block;margin-top:2px;font-size:10px;font-weight:650;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.si-venue-c{flex:none;font-size:8px;font-weight:800;letter-spacing:.1em;color:var(--faint)}.si-sess{width:100%;display:flex;align-items:center;gap:9px;padding:12px 0;text-align:left}.si-sess+.si-sess{border-top:1px solid var(--line-2)}.si-sess-t{flex:1;min-width:0}.si-sess-n{display:block;font-size:14px;font-weight:750;letter-spacing:-.02em}.si-effects{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.si-cost{flex:none;text-align:right}.si-cost-e{display:flex;align-items:center;justify-content:flex-end;gap:3px;font-size:12px;font-weight:800;color:var(--gold-hi)}.si-cost-m{display:block;margin-top:4px;font-size:10px;font-weight:800;color:var(--money)}.si-cost-m.is-free{color:var(--faint)}
.si-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.si-disc{position:relative;min-width:0;padding:12px 6px 11px;border-radius:17px;text-align:center;background:color-mix(in srgb,var(--c) 7%,var(--card));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 18%,transparent);transition:transform .12s,background .2s,box-shadow .2s}.si-disc.is-on{background:color-mix(in srgb,var(--c) 16%,var(--card));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 60%,transparent)}.si-disc:active{transform:scale(.97)}
.si-act{position:relative;width:100%;margin-top:9px;padding:13px;border-radius:17px;text-align:left;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.si-act.is-best{box-shadow:inset 0 0 0 1.5px rgba(248,168,16,.5)}.si-best{position:absolute;top:-7px;left:13px;padding:3px 8px;border-radius:6px;font-size:7.5px;font-weight:800;letter-spacing:.14em;color:#241606;background:var(--gold)}.si-act-top{display:flex;align-items:flex-start;gap:10px}.si-act-i{width:40px;height:40px;flex:none;border-radius:13px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 26%,transparent)}.si-act-t{flex:1;min-width:0}.si-act-n{display:block;font-size:14.5px;font-weight:750;letter-spacing:-.02em}.si-act-s{display:block;margin-top:3px;font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--faint)}.si-course-progress{display:flex;align-items:center;gap:9px;margin-top:10px}.si-course-progress>span{flex:1}.si-course-progress>b{font-size:9px;color:var(--gold-hi)}
.si-board{display:flex;align-items:center;gap:12px;margin-top:9px;padding:13px;border-radius:18px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.si-board-t{flex:1;min-width:0}.si-board-v{display:block;margin-top:4px;font-size:20px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--looks)}.si-board-d{display:block;margin-top:6px;font-size:10.5px;font-weight:650;line-height:1.45;color:var(--faint)}.si-genres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.si-gen{min-width:0;padding:12px 5px 11px;border-radius:16px;text-align:center;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.si-gen.is-started{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 42%,transparent)}.si-gen-r{position:relative;display:block;width:40px;height:40px;margin:0 auto}.si-gen-r svg{position:absolute;inset:0;transform:rotate(-90deg)}.si-gen-r b{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;font-weight:800;color:var(--c)}.si-gen-n{display:block;margin-top:8px;font-size:10.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.si-gen-s{display:block;margin-top:2px;font-size:7.5px;font-weight:700;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.si-gen-e{display:flex;align-items:center;justify-content:center;gap:2px;margin-top:7px;font-size:9px;font-weight:800;color:var(--gold-hi)}
.si-none{margin-top:14px;padding:26px 16px;border-radius:17px;text-align:center;box-shadow:inset 0 0 0 1px var(--hair)}.si-none p{margin-top:8px;font-size:11.5px;color:var(--faint)}.si-sheet-cost{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.si-sc{min-width:0;padding:10px 9px 11px;border-radius:14px;background:var(--card-2);box-shadow:inset 0 0 0 1px var(--hair)}.si-sc b{display:block;margin-top:7px;font-size:15px;font-weight:800;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.si-note{font-size:11.5px;line-height:1.5;color:var(--dim)}
.si-tabs{display:flex;gap:7px}.si-tab{flex:1;padding:9px 5px;border-radius:12px;font-size:8.5px;font-weight:800;letter-spacing:.1em;color:var(--faint);background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--hair)}.si-tab.is-on{color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 44%,transparent)}.si-radar{position:relative;margin-top:12px;border-radius:20px;overflow:hidden;background:radial-gradient(62% 60% at 50% 48%,color-mix(in srgb,var(--c) 10%,transparent),transparent 74%),var(--card-2);box-shadow:inset 0 0 0 1px var(--hair)}.si-radar svg{width:100%;height:auto}.si-radar-hud{position:absolute;left:14px;top:13px}.si-radar-hud b{display:block;margin-top:3px;font-size:23px;font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--c)}.si-radar-hud b em{font-style:normal;font-size:11px;font-weight:750;color:var(--ghost)}.si-skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 15px;margin-top:15px}.si-skill-h{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.si-skill-h span{font-size:8px;font-weight:800;letter-spacing:.09em;color:var(--dim)}.si-skill-h b{margin-left:auto;font-size:11px}
@media(max-width:374px){.ae-scroll{padding-left:12px;padding-right:12px}.si-head{gap:8px}.si-head .ae-h1{font-size:22px;white-space:nowrap}.si-allstats{padding:8px;font-size:7.5px}.ae .ae-seg-b{gap:3px;font-size:8px;letter-spacing:.07em}.ae-seg-n{display:none}.si-cond,.si-rail,.si-genres{gap:6px}.si-ring{width:42px;height:42px}.si-ring svg{width:42px;height:42px}.si-ring b{font-size:12px}.si-dial-n{font-size:6.7px}.si-week-v em,.si-week-v u{font-size:8px;margin-left:4px}.si-venue{padding-left:11px;padding-right:11px}.si-sess{gap:6px}.ae-chip{font-size:7.5px;padding-left:6px;padding-right:6px}.si-gen-n{font-size:9.5px}.si-gen-s{font-size:6.8px}}
`;

const TABS = [
  { key: 'wellbeing' as const, label: 'WELLBEING', icon: 'heart' as const },
  { key: 'workshops' as const, label: 'WORKSHOPS', icon: 'book' as const },
  { key: 'genre' as const, label: 'GENRE LAB', icon: 'star' as const },
];

const R = 20;
const C = 2 * Math.PI * R;
const GR = 16;
const GC = 2 * Math.PI * GR;

function Dial({ label, value, color, selected, onClick }: { label: string; value: number; color: string; selected?: boolean; onClick?: () => void }) {
  const body = <>{value < 40 && <span className="si-weak" />}<span className="si-ring"><svg viewBox="0 0 46 46"><circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3.4" /><circle cx="23" cy="23" r={R} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - clamp(value) / 100)} style={{ color }} /></svg><b>{Math.round(value)}</b></span><span className="si-dial-n">{label}</span></>;
  if (onClick) return <button className={'si-disc' + (selected ? ' is-on' : '')} style={cssVar('--c', color)} onClick={onClick}>{body}</button>;
  return <div className="si-dial" style={cssVar('--c', color)}>{body}</div>;
}

function Cost({ energy, cost }: { energy: number; cost: number }) {
  return <span className="si-cost"><span className="si-cost-e"><Icon name="bolt" size={11} />{energy}</span><span className={'si-cost-m' + (cost ? '' : ' is-free')}>{cost ? money(cost) : 'FREE'}</span></span>;
}

function Effects({ effects, color }: { effects: { label: string; kind?: 'gain' | 'risk' }[]; color: string }) {
  return <span className="si-effects">{effects.map((effect, index) => <span className="ae-chip" key={`${effect.label}-${index}`} style={cssVar('--c', effect.kind === 'risk' ? 'var(--risk)' : color)}>{effect.label}</span>)}</span>;
}

function Radar({ skills, color }: { skills: ImproveUiSkill[]; color: string }) {
  const count = Math.max(3, skills.length);
  const centerX = 150;
  const centerY = 106;
  const radius = 64;
  const point = (index: number, distance: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance] as const;
  };
  const polygon = (distance: number) => Array.from({ length: count }, (_, index) => point(index, distance).join(',')).join(' ');
  const values = skills.map((skill, index) => point(index, radius * clamp(skill.value) / 100).join(',')).join(' ');
  return <svg viewBox="0 0 300 212" role="img" aria-label="Skill radar"><g stroke="rgba(255,255,255,.11)" fill="none">{[.34, .67, 1].map(level => <polygon key={level} points={polygon(radius * level)} />)}{skills.map((_, index) => { const end = point(index, radius); return <line key={index} x1={centerX} y1={centerY} x2={end[0]} y2={end[1]} />; })}</g><polygon points={values} fill={color} fillOpacity=".22" stroke={color} strokeWidth="1.8" />{skills.map((skill, index) => { const label = point(index, radius + 17); const anchor = Math.abs(label[0] - centerX) < 6 ? 'middle' : label[0] > centerX ? 'start' : 'end'; return <text key={skill.name} x={label[0]} y={label[1] + 3} textAnchor={anchor} fontSize="7" fontWeight="800" fill="rgba(249,246,239,.55)">{skill.name}</text>; })}</svg>;
}

const courseScore = (course: ImproveUiCourse) => course.effects.reduce((sum, effect) => {
  const value = effect.kind === 'risk' ? 0 : Number(effect.label.match(/[\d.]+/)?.[0] || 0);
  return sum + value;
}, 0) / Math.max(1, course.energy);

export default function ImproveScreen(props: ImproveScreenProps) {
  const [tab, setTab] = React.useState<TabKey>('wellbeing');
  const weakest = props.disciplines.slice().sort((a, b) => a.value - b.value)[0]?.key || 'acting';
  const [discipline, setDiscipline] = React.useState<ImproveUiDisciplineKey>(weakest);
  const [open, setOpen] = React.useState<OpenItem | null>(null);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [skillGroup, setSkillGroup] = React.useState<ImproveUiDisciplineKey>('acting');
  const activeCourses = props.courses.filter(course => course.activeCommitmentId);
  const slots = 24;
  const leftSlots = Math.round((Math.min(100, props.availableEnergy) / 100) * slots);
  const courses = props.courses.filter(course => course.discipline === discipline).sort((a, b) => courseScore(b) - courseScore(a));
  const selectedDiscipline = props.disciplines.find(item => item.key === discipline);
  const genrePoints = props.genres.reduce((sum, genre) => sum + genre.points, 0);
  const genreMax = props.genres.reduce((sum, genre) => sum + genre.pointsMax, 0);
  const selectedGroup = props.skillGroups.find(group => group.key === skillGroup) || props.skillGroups[0];
  const selectedAverage = selectedGroup?.skills.length ? Math.round(selectedGroup.skills.reduce((sum, skill) => sum + skill.value, 0) / selectedGroup.skills.length) : 0;

  const openTitle = open?.value.name;
  const openEnergy = open?.kind === 'wellbeing' ? open.value.energy : open?.kind === 'course' ? open.value.energy : open?.value.energy || 0;
  const openCost = open?.kind === 'wellbeing' ? open.value.cost : open?.kind === 'course' ? open.value.cost : open?.value.cost || 0;
  const unaffordable = open ? props.money < openCost : false;
  const insufficientEnergy = open ? (open.kind === 'course' ? props.capacityFree < openEnergy : props.availableEnergy < openEnergy) : false;
  const alreadyActive = open?.kind === 'course' && Boolean(open.value.activeCommitmentId);
  const mastered = open?.kind === 'genre' && open.value.points >= open.value.pointsMax;

  const commitOpen = () => {
    if (!open || unaffordable || insufficientEnergy || alreadyActive || mastered) return;
    if (open.kind === 'wellbeing') props.onWellbeingAction(open.value);
    if (open.kind === 'course') props.onEnrollCourse(open.value);
    if (open.kind === 'genre') props.onTrainGenre(open.value);
    setOpen(null);
  };

  return <div className="ae" data-ui="actor-empire-improve-overhaul"><Style css={BASE_CSS} /><Style css={CSS} /><div className="ae-bg" /><div className="ae-scroll">
    <header className="si-head ae-in"><div className="si-head-t"><h1 className="ae-h1">{props.title}</h1><p className="ae-sub">Talent {Math.round(props.talent)} / 100</p></div><button className="si-allstats" onClick={() => setStatsOpen(true)}><Icon name="brain" size={14} />ALL STATS</button></header>
    <section className="si-week ae-in"><span className="si-week-i"><Icon name="bolt" size={15} /></span><span className="si-week-t"><span className="si-week-v">{Math.round(props.availableEnergy)}E<em>available</em><u>{Math.round(props.committedEnergy)}E committed</u></span><span className="si-budget">{Array.from({ length: slots }, (_, index) => <span key={index} className={'si-slot' + (index < leftSlots ? ' is-left' : '')} />)}</span></span></section>
    {activeCourses.length > 0 && <div className="si-running ae-in">{activeCourses.map(course => <span className="si-run" key={course.catalogId}><span className="si-run-t"><b>{course.name}</b><span>{course.weeksCompleted} / {course.weeks} weeks</span></span><span className="si-run-e">−{course.energy}E</span><button className="si-run-x" onClick={() => props.onCancelCourse(course.activeCommitmentId!)} aria-label={`Cancel ${course.name}`}><Icon name="close" size={10} sw={2.6} /></button></span>)}</div>}
    <div style={{ marginTop: 15 }} className="ae-in"><Segmented items={TABS.map(item => ({ ...item, count: item.key === 'wellbeing' ? props.venues.length : item.key === 'workshops' ? props.courses.length : props.genres.length }))} active={tab} onChange={setTab} /></div>

    {tab === 'wellbeing' && <div className="ae-in"><div className="ae-sec"><span className="ae-lab">Condition</span><span className="ae-sec-rule" /><span className="ae-lab">Right now</span></div><div className="si-cond">{props.condition.map(item => <React.Fragment key={item.key}><Dial label={item.label} value={item.value} color={item.color} /></React.Fragment>)}</div><div className="ae-sec"><span className="ae-lab">Where you train</span><span className="ae-sec-rule" /><span className="ae-lab">{props.venues.length} venues</span></div>{props.venues.map(venue => <section className="si-venue" key={venue.id} style={cssVar('--c', venue.color)}><div className="si-venue-h"><span className="si-venue-i"><Icon name={venue.icon} size={18} /></span><span className="si-venue-t"><span className="si-venue-n">{venue.name}</span><span className="si-venue-d">{venue.description}</span></span><span className="si-venue-c">{venue.actions.some(action => action.cost === 0) ? 'FREE OPTION' : `${venue.actions.length} SESSIONS`}</span></div>{venue.actions.map(action => <button className="si-sess" key={action.id} onClick={() => setOpen({ kind: 'wellbeing', value: action })}><span className="si-sess-t"><span className="si-sess-n">{action.name}</span><Effects effects={action.effects} color={venue.color} /></span><Cost energy={action.energy} cost={action.cost} /><Icon name="chevronRight" size={15} /></button>)}</section>)}</div>}

    {tab === 'workshops' && <div className="ae-in"><div className="ae-sec"><span className="ae-lab">Discipline</span><span className="ae-sec-rule" /><span className="ae-lab">Weakest first</span></div><div className="si-rail">{props.disciplines.slice().sort((a, b) => a.value - b.value).map(item => <React.Fragment key={item.key}><Dial label={item.label} value={item.value} color={item.color} selected={item.key === discipline} onClick={() => setDiscipline(item.key)} /></React.Fragment>)}</div><div className="ae-sec"><span className="ae-lab">{selectedDiscipline?.label || ''} courses</span><span className="ae-sec-rule" /><span className="ae-lab">{props.capacityFree}E capacity</span></div>{courses.length === 0 ? <div className="si-none"><Icon name="search" size={24} /><p>No courses for this discipline yet.</p></div> : courses.map((course, index) => <button className={'si-act' + (index === 0 ? ' is-best' : '')} key={course.catalogId} style={cssVar('--c', selectedDiscipline?.color || 'var(--gold)')} onClick={() => setOpen({ kind: 'course', value: course })}>{index === 0 && <span className="si-best">BEST VALUE</span>}<span className="si-act-top"><span className="si-act-i"><Icon name={course.scene === 'desk' ? 'penTool' : 'book'} size={18} /></span><span className="si-act-t"><span className="si-act-n">{course.name}</span><span className="si-act-s">{course.weeks} week course{course.activeCommitmentId ? ' · running' : props.capacityFree < course.energy ? ' · no energy' : ''}</span></span><Cost energy={course.energy} cost={course.cost} /></span><Effects effects={course.effects} color={selectedDiscipline?.color || 'var(--gold)'} />{course.activeCommitmentId && <span className="si-course-progress"><span><Meter value={(course.weeksCompleted / Math.max(1, course.weeks)) * 100} color="var(--gold)" thin /></span><b>{course.weeksCompleted} / {course.weeks} weeks</b></span>}</button>)}</div>}

    {tab === 'genre' && <div className="ae-in"><div className="ae-sec"><span className="ae-lab">Genre mastery</span><span className="ae-sec-rule" /><span className="ae-lab">{props.genres.length} genres</span></div><section className="si-board"><span className="si-gen-r" style={{ width: 52, height: 52, flex: 'none' }}><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3.4" /><circle cx="26" cy="26" r="22" fill="none" stroke="var(--looks)" strokeWidth="3.4" strokeDasharray={2 * Math.PI * 22} strokeDashoffset={(2 * Math.PI * 22) * (1 - genrePoints / Math.max(1, genreMax))} /></svg><b>{Math.round(genrePoints)}</b></span><span className="si-board-t"><span className="ae-lab">Genre XP banked</span><b className="si-board-v">{Math.round(genrePoints)} / {genreMax}</b><span className="si-board-d">Train a genre to improve your fit for roles in that lane.</span></span></section><div className="si-genres">{props.genres.map(genre => <button key={genre.genre} className={'si-gen' + (genre.points > 0 ? ' is-started' : '')} style={cssVar('--c', 'var(--looks)')} onClick={() => setOpen({ kind: 'genre', value: genre })}><span className="si-gen-r"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r={GR} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3" /><circle cx="20" cy="20" r={GR} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={GC} strokeDashoffset={GC * (1 - clamp(genre.points) / genre.pointsMax)} /></svg><b>{Math.round(genre.points)}/100</b></span><span className="si-gen-n">{genre.genre.replace('_', ' ')}</span><span className="si-gen-s">{genre.name}</span><span className="si-gen-e"><Icon name="bolt" size={9} />{genre.energy}</span></button>)}</div></div>}
  </div>

  <Sheet open={Boolean(open)} onClose={() => setOpen(null)} eyebrow={open?.kind === 'course' ? 'Workshop' : open?.kind === 'genre' ? open.value.genre.replace('_', ' ') : open?.value.request.activityName} eyebrowIcon={open?.kind === 'course' ? 'book' : open?.kind === 'genre' ? 'star' : 'dumbbell'} title={openTitle}>{open && <>{'description' in open.value && <p className="si-note">{open.value.description}</p>}<div className="si-sheet-cost"><div className="si-sc"><span className="ae-lab">Energy</span><b style={{ color: 'var(--gold-hi)' }}>{openEnergy}E</b></div><div className="si-sc"><span className="ae-lab">Cost</span><b style={{ color: openCost ? 'var(--money)' : 'var(--faint)' }}>{openCost ? money(openCost) : 'Free'}</b></div><div className="si-sc"><span className="ae-lab">{open.kind === 'course' ? 'Length' : open.kind === 'genre' ? 'Progress' : 'Type'}</span><b>{open.kind === 'course' ? `${open.value.weeks} wks` : open.kind === 'genre' ? `${Math.round(open.value.points)}/100` : 'One-off'}</b></div></div>{open.kind !== 'genre' && <><div className="ae-sec"><span className="ae-lab">Effect</span><span className="ae-sec-rule" /></div><Effects effects={open.value.effects} color="var(--gold)" /></>}{open.kind === 'course' && open.value.activeCommitmentId ? <button className="ae-btn is-ghost" style={{ marginTop: 16 }} onClick={() => { props.onCancelCourse(open.value.activeCommitmentId!); setOpen(null); }}>Cancel course</button> : <button className="ae-btn" style={{ marginTop: 16 }} disabled={unaffordable || insufficientEnergy || mastered} onClick={commitOpen}>{unaffordable ? 'Not enough money' : insufficientEnergy ? 'Not enough energy' : mastered ? 'Mastered' : open.kind === 'course' ? 'Enroll' : open.kind === 'genre' ? 'Train genre' : 'Do it'}</button>}</>}</Sheet>

  <Sheet open={statsOpen} onClose={() => setStatsOpen(false)} eyebrow="Overall talent" eyebrowIcon="brain" title={`${Math.round(props.talent)} / 100`}>{statsOpen && selectedGroup && <><div className="si-tabs">{props.skillGroups.map(group => <button key={group.key} className={'si-tab' + (group.key === skillGroup ? ' is-on' : '')} style={cssVar('--c', group.color)} onClick={() => setSkillGroup(group.key)}>{group.key.toUpperCase()}</button>)}</div><div className="si-radar" style={cssVar('--c', selectedGroup.color)}><div className="si-radar-hud"><span className="ae-lab">Average</span><b>{selectedAverage}<em> / 100</em></b></div><Radar skills={selectedGroup.skills} color={selectedGroup.color} /></div><div className="si-skill-grid">{selectedGroup.skills.map(skill => <div key={skill.name}><div className="si-skill-h"><span>{skill.name}</span><b>{Math.round(skill.value)}</b></div><Meter value={skill.value} color={selectedGroup.color} thin /></div>)}</div></>}</Sheet>
  </div>;
}
