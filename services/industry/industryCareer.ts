/**
 * #199 (plan §23.8): a person's working life, for the CV and the executive page. Zeesh (2026-11-02): "cv me unka kuch
 * past experine bhi generate karo and i hope ki wo time ke hisab se changes bhi ho".
 *
 * The past before the career began is drawn from the career's seed and never saved: 2–4 jobs by how long they have
 * worked, using this world's rivals and studios, each with its years and one result in their line of work. From then
 * on it grows: the years of the current job, every move the market makes (`world.industryPeople.joins`), and their time
 * at our table, read from the appointments, so someone who left us shows "ex-NORTHSTAR+".
 */
import type { Player, StreamingExecutiveRole } from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import { type IndustryGrade, type IndustryPerson, industryPersonNow, industrySeedOf, industryCareerCompanies } from './industryPeople';

export interface IndustryCareerJob {
    company: string;
    title: string;
    /** "6 yrs", "8 mo" */
    span: string;
    /** one result, in a few words */
    result: string;
    /** where they work now */
    now: boolean;
    /** at our table */
    ours: boolean;
}

export interface IndustryCareerView {
    /** newest first */
    jobs: IndustryCareerJob[];
    /** years they have worked, in all */
    years: number;
    /** "ex-NORTHSTAR+", for someone who has left us */
    alumOf: string | null;
}

/* the steps up to their job: the top rung is the job's own name */
const LADDERS: Partial<Record<StreamingExecutiveRole, string[]>> = {
    MARKETING_HEAD: ['Campaign Manager', 'Director of Marketing', 'VP Marketing'],
    CHIEF_CONTENT_OFFICER: ['Development Executive', 'Director of Originals', 'VP Content'],
    CTO: ['Engineering Manager', 'Director of Engineering', 'VP Engineering'],
    INTERNATIONAL_HEAD: ['Market Manager', 'Regional Director', 'VP International'],
    CFO: ['Finance Manager', 'Director of Finance', 'VP Finance'],
    SECURITY_TRUST_HEAD: ['Security Analyst', 'Trust and Safety Lead', 'Director of Security'],
};
const DEFAULT_LADDER = ['Manager', 'Director', 'Vice President'];
/* how high the last job was: a star or a senior has done this job before; a rising name has not */
const TOP_RUNG: Record<IndustryGrade, number> = { STAR: 3, SENIOR: 3, SOLID: 2, RISING: 1 };

/* one result per specialty, in the order of the specialties (see industryPeople.ts): {p} a percent, {n} a count, {m} millions, {b} billions */
const RESULTS: Partial<Record<StreamingExecutiveRole, string[]>> = {
    MARKETING_HEAD: [
        'Launch campaign drew {m}M first-week viewers', 'Grew brand awareness {p}% in two years', 'Brought the cost of a new member down {p}%',
        'Signed {n} creators to a partner programme', 'Built a fan community of {m}M', 'Took a season of live sport to {m}M viewers',
    ],
    CHIEF_CONTENT_OFFICER: [
        'Built a drama slate with {n} award wins', 'Made {n} shows that topped charts abroad', 'Ran {n} reality hits on small budgets',
        'Made the top kids’ shelf in {n} markets', 'Grew animation viewing {p}%', 'Bought {n} library deals under market',
    ],
    CTO: [
        'Took buffering down {p}%', 'Cut delivery costs {p}%', 'Lifted watch time {p}% with new recommendations',
        'No major breach in {n} years', 'Kept {m}M streams up on a record night', 'Shipped apps on {n} new devices',
    ],
    INTERNATIONAL_HEAD: [
        'Opened {n} new markets', 'Signed {n} local partners', 'Cleared a regulator’s review in {n} months',
        'Dubbed the catalogue into {n} languages', 'Grew members in emerging markets {p}%', 'Signed telecom bundles in {n} countries',
    ],
    CFO: [
        'Raised ${b}B on good terms', 'Took costs down {p}% without cutting shows', 'Led a ${b}B acquisition',
        'Cut churn {p}% with new pricing', 'Held investors through a hard year', 'Turned a loss into a profit in {n} quarters',
    ],
    SECURITY_TRUST_HEAD: [
        'Cut piracy {p}% in two years', 'Cleared {n} content reviews without a fine', 'Cut incident response to {n} hours',
        'Passed every privacy audit in {n} countries', 'Cut account fraud {p}%', 'Turned {m}M shared accounts into members',
    ],
};
const DEFAULT_RESULTS = ['Ran a team of {n}0', 'Delivered {n} big projects on budget', 'Grew the business {p}%'];
/* the specialties, in the results' order */
const SPECIALTY_ORDER: Partial<Record<StreamingExecutiveRole, string[]>> = {
    MARKETING_HEAD: ['Launch campaigns', 'Brand building', 'Performance marketing', 'Creator partnerships', 'Fan communities', 'Sports marketing'],
    CHIEF_CONTENT_OFFICER: ['Prestige drama', 'Global hits', 'Unscripted', 'Kids and family', 'Anime and animation', 'Licensing deals'],
    CTO: ['Playback systems', 'Cloud scale', 'Recommendation AI', 'Security engineering', 'Live streaming', 'Device apps'],
    INTERNATIONAL_HEAD: ['Market entry', 'Local partnerships', 'Regulatory affairs', 'Dubbing and subtitles', 'Emerging markets', 'Telecom bundles'],
    CFO: ['Capital markets', 'Cost discipline', 'Deal finance', 'Pricing strategy', 'Investor relations', 'Turnarounds'],
    SECURITY_TRUST_HEAD: ['Anti-piracy', 'Content safety', 'Incident response', 'Privacy and compliance', 'Fraud prevention', 'Account sharing'],
};

const spanOf = (weeks: number) => {
    const years = Math.round(weeks / 52);
    if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`;
    const months = Math.round(weeks / 4.33);
    return months >= 1 ? `${months} mo` : 'new';
};

const fillResult = (template: string, rng: () => number, grade: IndustryGrade) => {
    const size = { STAR: 1, SENIOR: 0.8, SOLID: 0.6, RISING: 0.4 }[grade];
    return template
        .replace('{p}', String(Math.round((8 + rng() * 32) * (0.5 + size / 2))))
        .replace('{n}', String(Math.max(2, Math.round((2 + rng() * 10) * size))))
        .replace('{m}', String(Math.max(1, Math.round((1 + rng() * 40) * size))))
        .replace('{b}', (Math.max(0.2, (0.2 + rng() * 3.8) * size)).toFixed(1));
};

/** the result a job gets: a star's most recent one is in their own specialty */
const resultFor = (person: IndustryPerson, rng: () => number, used: Set<number>, ownSpecialty: boolean) => {
    const role = person.role as StreamingExecutiveRole;
    const list = RESULTS[role] || DEFAULT_RESULTS;
    const own = (SPECIALTY_ORDER[role] || []).indexOf(person.specialty);
    let index = ownSpecialty && own >= 0 ? own : Math.floor(rng() * list.length) % list.length;
    for (let tries = 0; used.has(index) && tries < list.length; tries += 1) index = (index + 1) % list.length;
    used.add(index);
    return fillResult(list[index], rng, person.grade);
};

interface PastJob { company: string; title: string; weeks: number; result: string }

/** the jobs they had when the career began, newest first */
const seededPast = (seed: string, person: IndustryPerson): PastJob[] => {
    const rng = createDeterministicRng(`${seed}:career:${person.id}`);
    const years = Math.max(1, person.yearsExperience);
    const count = years <= 6 ? 2 : years <= 13 ? 3 : 4;
    const employed = person.start.kind === 'RIVAL' || person.start.kind === 'STUDIO';
    const names: string[] = employed ? [person.start.name] : [];
    if (!names.includes(person.formerCompany)) names.push(person.formerCompany);
    const pool = industryCareerCompanies().filter(name => !names.includes(name));
    while (names.length < count && pool.length) names.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
    const taken = names.slice(0, count);
    const weights = taken.map(() => 0.6 + rng() * 0.8);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const ladder = LADDERS[person.role as StreamingExecutiveRole] || DEFAULT_LADDER;
    const used = new Set<number>();
    return taken.map((company, index) => {
        const rung = Math.max(0, TOP_RUNG[person.grade] - index);
        return {
            company,
            title: rung >= ladder.length ? person.roleLabel : ladder[rung],
            weeks: Math.max(52, Math.round(weights[index] / total * years) * 52),
            result: resultFor(person, rng, used, index === 0),
        };
    });
};

/** their working life now, newest first */
export const industryCareerOf = (player: Player, person: IndustryPerson): IndustryCareerView => {
    const seed = industrySeedOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const firstWeek = player.world?.industryPeople?.firstWeek ?? absoluteWeek;
    const joins = player.world?.industryPeople?.joins?.[person.id] || [];
    const company = player.ownedStreamingPlatform?.identity?.name || 'Your service';
    const appointments = (player.ownedStreamingPlatform?.leadership?.appointments || []).filter(item => item.executiveId === person.id);
    const now = industryPersonNow(player, person);

    const after: Array<IndustryCareerJob & { startWeek: number }> = [];
    /* their time at our table */
    appointments.forEach(item => {
        const active = item.status === 'ACTIVE';
        const weeks = Math.max(0, (active ? absoluteWeek : item.endedAtAbsoluteWeek ?? absoluteWeek) - item.appointedAtAbsoluteWeek);
        after.push({
            company,
            title: person.roleLabel,
            span: spanOf(weeks),
            result: item.experience > 0 ? `Level ${item.level}, ${item.experience} job${item.experience === 1 ? '' : 's'} done` : `Level ${item.level}`,
            now: active,
            ours: true,
            startWeek: item.appointedAtAbsoluteWeek,
        });
    });
    /* the moves the market has made since the career began (our own table is above) */
    joins.forEach((join, index) => {
        if (join.k === 'OURS' || join.k === 'FREE') return;
        const end = joins[index + 1]?.w ?? absoluteWeek;
        const ladder = LADDERS[person.role as StreamingExecutiveRole] || DEFAULT_LADDER;
        const rung = TOP_RUNG[now.grade];
        const rng = createDeterministicRng(`${seed}:career:${person.id}:${join.w}`);
        after.push({
            company: join.n,
            title: rung >= ladder.length ? person.roleLabel : ladder[rung],
            span: spanOf(Math.max(0, end - join.w)),
            result: resultFor(now, rng, new Set<number>(), false),
            now: index === joins.length - 1,
            ours: false,
            startWeek: join.w,
        });
    });
    after.sort((a, b) => b.startWeek - a.startWeek);

    const past = seededPast(seed, person);
    /* the job they had when the career began goes on until the first move */
    const employedAtStart = person.start.kind === 'RIVAL' || person.start.kind === 'STUDIO';
    const firstMove = Math.min(
        joins[0]?.w ?? Number.MAX_SAFE_INTEGER,
        ...appointments.map(item => item.appointedAtAbsoluteWeek),
        absoluteWeek,
    );
    const stillThere = employedAtStart && !after.length && !joins.length;
    const seeded: IndustryCareerJob[] = past.map((job, index) => ({
        company: job.company,
        title: job.title,
        span: spanOf(job.weeks + (index === 0 && employedAtStart ? Math.max(0, firstMove - firstWeek) : 0)),
        result: job.result,
        now: index === 0 && stillThere,
        ours: false,
    }));

    const left = appointments.find(item => item.status !== 'ACTIVE');
    const atOurs = appointments.some(item => item.status === 'ACTIVE');
    return {
        jobs: [...after.map(({ startWeek: _startWeek, ...job }) => job), ...seeded],
        years: now.yearsExperience,
        alumOf: left && !atOurs ? `ex-${company}` : null,
    };
};
