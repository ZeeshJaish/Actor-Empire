/**
 * #178 (plan §22): the media industry's people, kept as a group in the NPC database: executives (who run marketing,
 * content, technology, international, money and trust, at the rivals, at the studios, between roles, or at ours), the
 * rival services' CEOs, and investors (people with faces, and firms).
 *
 * Who they are is drawn from the career's seed (the player's name) and never saved: names unique against every NPC,
 * a grade, four stats, pay, a CV, where they started and what they were worth. What changes is saved small in
 * `world.industryPeople`: where each works now, the pay they have banked, and the latest moves. The weekly upkeep
 * credits pay, keeps our team's chairs in step, and every 3 weeks lets the market move a few people (contracts end,
 * rivals and studios hire), so the people on offer change as in a real industry.
 *
 * The people the game already had keep their ids and names: the 29 executive candidates, the founding investors and
 * the ten who called, and the five rival CEOs. Zeesh (2026-11-03): "sare jo bhi hiring log and jo kich npc use ho
 * rhe wo huamre npc databse se aa rhe … agar koi idhar aa rha to uska yk forbes and other number high ho sakte …
 * no need of adding any tag or badge but backend grouping".
 */
import type {
    Gender,
    IndustryEmployer,
    IndustryPeopleWorldState,
    NPCActor,
    NPCTier,
    OwnedStreamingInvestorOffer,
    Player,
    StreamingExecutiveRole,
    StreamingExecutiveStrategy,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import { NPC_DATABASE } from '../npcLogic';
import { STREAMING_EXECUTIVE_CANDIDATES } from '../streamingCompany';
import { STREAMING_RIVAL_TEMPLATES } from '../streamingCompetitiveWorld';
import { PLATFORMS } from '../streamingLogic';
import { STUDIO_CATALOG } from '../studioLogic';
import { STREAMING_INVESTOR_POOL } from '../streamingInvestorOffers';
import { STREAMING_CELEBRITY_INVESTOR_OFFERS, STREAMING_EXECUTIVE_ROLE_LABELS } from '../streamingLeadershipGovernance';

export type IndustryGrade = 'STAR' | 'SENIOR' | 'SOLID' | 'RISING';
export type IndustryInvestorKind = OwnedStreamingInvestorOffer['kind'];

export interface IndustryPerson {
    id: string;
    kind: 'EXECUTIVE' | 'INVESTOR';
    name: string;
    gender: Gender;
    /** a person, or a firm (a fund, a family office, a sovereign fund): firms have no face and no Forbes row */
    person: boolean;
    /** executives: the job they do; the rivals' CEOs are 'CEO' */
    role: StreamingExecutiveRole | 'CEO' | null;
    roleLabel: string;
    grade: IndustryGrade;
    skill: number;
    loyalty: number;
    ambition: number;
    ethics: number;
    yearsExperience: number;
    preferredStrategy: StreamingExecutiveStrategy;
    /** executives: what the market pays them a week */
    weeklyCompensation: number;
    specialty: string;
    style: string;
    strength: string;
    caution: string;
    formerCompany: string;
    /** where they work when the registry begins */
    start: IndustryEmployer;
    /** what they were worth when the registry began */
    baseNetWorth: number;
    /** the id the old lists used, when it differs (investors' records are matched by it or by name) */
    legacyId?: string;
    /** the name the old records kept, when the industry shows another (two old people shared a name) */
    legacyName?: string;
    /** investors */
    investorKind?: IndustryInvestorKind;
    publicIdentity?: string;
    /** the stake they like to take, in % of the company */
    stakeRange?: [number, number];
    /** what they pay against what a company is worth (0.78–0.98) */
    priceFactor?: number;
    profitSharePercent?: number;
    influenceDemand?: string;
    attentionEffect?: string;
}

/** the seats' jobs, as the team's chairs read them */
export const INDUSTRY_SEAT_ROLES: StreamingExecutiveRole[] = ['MARKETING_HEAD', 'CHIEF_CONTENT_OFFICER', 'CTO', 'INTERNATIONAL_HEAD', 'CFO', 'SECURITY_TRUST_HEAD'];
/** people per job in the industry (the old lists are part of it) */
const PER_ROLE = 25;
const GENERATED_INVESTOR_PEOPLE = 12;
const GENERATED_INVESTOR_FIRMS = 15;
/** a week's pay an executive keeps, after tax and living */
const KEPT_OF_PAY = 0.25;
/** every 3 weeks a few contracts end and a few people are hired */
export const INDUSTRY_MARKET_WEEKS = 3;
const MOVES_KEPT = 24;

/* one label per job, the game's own (the old candidates' short ones too) */
const ROLE_LABELS: Record<StreamingExecutiveRole | 'CEO', string> = { ...STREAMING_EXECUTIVE_ROLE_LABELS, CEO: 'CEO' };
const ROLE_PAY: Partial<Record<StreamingExecutiveRole, number>> = {
    MARKETING_HEAD: 165_000, CHIEF_CONTENT_OFFICER: 195_000, CTO: 210_000, INTERNATIONAL_HEAD: 190_000, CFO: 195_000, SECURITY_TRUST_HEAD: 145_000,
};
const GRADE_PAY: Record<IndustryGrade, number> = { STAR: 1.35, SENIOR: 1.1, SOLID: 0.9, RISING: 0.65 };
const GRADE_SKILL: Record<IndustryGrade, [number, number]> = { STAR: [86, 96], SENIOR: [76, 87], SOLID: [64, 77], RISING: [50, 66] };
const GRADE_YEARS: Record<IndustryGrade, [number, number]> = { STAR: [15, 26], SENIOR: [10, 18], SOLID: [6, 13], RISING: [2, 6] };
const ROLE_STRATEGIES: Partial<Record<StreamingExecutiveRole, StreamingExecutiveStrategy[]>> = {
    MARKETING_HEAD: ['GROWTH_FIRST', 'GROWTH_FIRST', 'CREATIVE_FIRST', 'BALANCED'],
    CHIEF_CONTENT_OFFICER: ['CREATIVE_FIRST', 'CREATIVE_FIRST', 'GROWTH_FIRST', 'BALANCED'],
    CTO: ['TECHNOLOGY_FIRST', 'TECHNOLOGY_FIRST', 'BALANCED', 'MARGIN_FIRST'],
    INTERNATIONAL_HEAD: ['GLOBAL_FIRST', 'GLOBAL_FIRST', 'GROWTH_FIRST', 'BALANCED'],
    CFO: ['MARGIN_FIRST', 'MARGIN_FIRST', 'BALANCED', 'GROWTH_FIRST'],
    SECURITY_TRUST_HEAD: ['TRUST_FIRST', 'TRUST_FIRST', 'BALANCED', 'TECHNOLOGY_FIRST'],
};
const SPECIALTIES: Partial<Record<StreamingExecutiveRole, string[]>> = {
    MARKETING_HEAD: ['Launch campaigns', 'Brand building', 'Performance marketing', 'Creator partnerships', 'Fan communities', 'Sports marketing'],
    CHIEF_CONTENT_OFFICER: ['Prestige drama', 'Global hits', 'Unscripted', 'Kids and family', 'Anime and animation', 'Licensing deals'],
    CTO: ['Playback systems', 'Cloud scale', 'Recommendation AI', 'Security engineering', 'Live streaming', 'Device apps'],
    INTERNATIONAL_HEAD: ['Market entry', 'Local partnerships', 'Regulatory affairs', 'Dubbing and subtitles', 'Emerging markets', 'Telecom bundles'],
    CFO: ['Capital markets', 'Cost discipline', 'Deal finance', 'Pricing strategy', 'Investor relations', 'Turnarounds'],
    SECURITY_TRUST_HEAD: ['Anti-piracy', 'Content safety', 'Incident response', 'Privacy and compliance', 'Fraud prevention', 'Account sharing'],
};
const STRENGTHS: Partial<Record<StreamingExecutiveRole, string[]>> = {
    MARKETING_HEAD: ['Turns premieres into events.', 'Finds the audience a show was made for.', 'Spends where it pays back.', 'Gets creators talking about you.'],
    CHIEF_CONTENT_OFFICER: ['Knows a hit before the pilot ends.', 'Makes shelves people stay for.', 'Talent trusts them with their best work.', 'Buys well and early.'],
    CTO: ['Keeps the stream up on the biggest night.', 'Builds what the product needs next.', 'Makes every server count.', 'Ships features fast and safely.'],
    INTERNATIONAL_HEAD: ['Opens markets other services stall in.', 'Speaks the regulators’ language.', 'Local partners take their calls.', 'Makes a show feel made for each country.'],
    CFO: ['Investors believe their numbers.', 'Finds money in every line.', 'Prices to what members will pay.', 'Knows when to raise and when to wait.'],
    SECURITY_TRUST_HEAD: ['Leaks come down fast.', 'First on every incident.', 'Keeps the regulators calm.', 'Stops the fraud before it starts.'],
};
const STYLES = ['Disciplined', 'Inventive', 'Bold', 'Steady', 'Hands-on', 'Analytical', 'Charismatic', 'Patient', 'Relentless', 'Diplomatic'];

const FEMALE = ['Amara', 'Ana', 'Aisha', 'Bianca', 'Camila', 'Chloe', 'Dalia', 'Esme', 'Farah', 'Freya', 'Gabriela', 'Hana', 'Ines', 'Isla', 'Jana',
    'Jasmine', 'Kaia', 'Keiko', 'Lara', 'Leila', 'Lina', 'Lucia', 'Maya', 'Meera', 'Mila', 'Naomi', 'Noor', 'Olivia', 'Paloma', 'Rania', 'Rosa',
    'Sakura', 'Sana', 'Selin', 'Sienna', 'Tara', 'Thandi', 'Valentina', 'Vera', 'Yara', 'Zara', 'Zoe', 'Adaeze', 'Ayumi', 'Beatriz', 'Carmen',
    'Daria', 'Elif', 'Fatima', 'Greta', 'Hye-jin', 'Ji-woo', 'Kavya', 'Linnea', 'Marisa', 'Nkechi', 'Oksana', 'Leah', 'Signe', 'Wanjiru'];
const MALE = ['Aarush', 'Adrian', 'Ahmed', 'Alejandro', 'Andre', 'Arjun', 'Ben', 'Carlos', 'Dmitri', 'Emeka', 'Ethan', 'Felipe', 'Gabriel', 'Hamza',
    'Hiro', 'Ibrahim', 'Ivan', 'Jae-won', 'Javier', 'Jonas', 'Karim', 'Kwame', 'Lars', 'Leo', 'Luca', 'Malik', 'Mateo', 'Nikhil', 'Noah', 'Omar',
    'Oscar', 'Pablo', 'Rahul', 'Ravi', 'Rohan', 'Sami', 'Santiago', 'Sebastian', 'Tariq', 'Theo', 'Victor', 'Wei', 'Yusuf', 'Zayd', 'Anders',
    'Bilal', 'Chidi', 'Diego', 'Farid', 'Goran', 'Hassan', 'Idris', 'Joaquin', 'Kofi', 'Mikael', 'Nils', 'Pedro', 'Tobias', 'Ilya', 'Musa'];
const SURNAMES = ['Abara', 'Adeyemi', 'Akhtar', 'Alvarez', 'Andersson', 'Aoki', 'Bauer', 'Bello', 'Bhatt', 'Brandt', 'Caldwell', 'Castillo',
    'Chaudhry', 'Chowdhury', 'Costa', 'Dahl', 'Delgado', 'Demir', 'Dubois', 'Ekstrom', 'Eze', 'Falk', 'Ferreira', 'Fischer', 'Fontaine', 'Garcia',
    'Gill', 'Hakimi', 'Halvorsen', 'Hartmann', 'Hayashi', 'Herrera', 'Holm', 'Ibarra', 'Iyer', 'Jansen', 'Joshi', 'Kader', 'Kamau', 'Kato',
    'Khan', 'Kowalski', 'Kruger', 'Lambert', 'Larsen', 'Leclerc', 'Lindqvist', 'Lopes', 'Mahmoud', 'Marino', 'Mendes', 'Mori', 'Murphy', 'Nair',
    'Nakamura', 'Navarro', 'Nguyen', 'Novak', 'Nwosu', 'Olsen', 'Ortega', 'Osei', 'Park', 'Patel', 'Pereira', 'Petrov', 'Quinn', 'Rahman',
    'Reyes', 'Rossi', 'Saito', 'Salazar', 'Santos', 'Schmidt', 'Sen', 'Shah', 'Singh', 'Sorensen', 'Suzuki', 'Tanaka', 'Torres', 'Vasquez',
    'Weber', 'Wong', 'Yamada', 'Yilmaz', 'Zhang', 'Zielinski', 'Haddad', 'Ito', 'Rao', 'Mensah', 'Aziz', 'Ruiz', 'Lund', 'Varma', 'Achebe'];
const FIRM_FIRST = ['Meridian', 'Harbor', 'Crescent', 'Silverline', 'Kestrel', 'Ironwood', 'Lumen', 'Cobalt', 'Aurora', 'Granite', 'Summit',
    'Tidewater', 'Redwood', 'Equinox', 'Halcyon', 'Westbrook', 'Starling', 'Obsidian', 'Juniper', 'Marlowe'];
const FIRM_LAST = ['Capital', 'Partners', 'Ventures', 'Holdings', 'Growth', 'Investments'];

/** the old lists' investors: who is a person (with a face), and their gender */
const LEGACY_INVESTOR_PEOPLE: Record<string, Gender> = {
    'investor-aarav-kapoor': 'MALE', 'investor-sofia-laurent': 'FEMALE', 'investor-dante-cole': 'MALE', 'marisol-vega': 'FEMALE',
    'kenji-arakawa': 'MALE', 'priya-raman': 'FEMALE', 'lucas-mbeki': 'MALE', 'elodie-marchand': 'FEMALE',
};
/** two old people shared a name; the industry keeps one name per person */
const LEGACY_RENAMES: Record<string, string> = { 'priya-raman': 'Priya Ramanathan' };
const RIVAL_CEO_GENDER: Record<string, Gender> = { 'Mara Voss': 'FEMALE', 'Elias Sterling': 'MALE', 'Celeste Grant': 'FEMALE', 'Nadia Brooks': 'FEMALE', 'Kai Moreno': 'MALE' };

const INVESTOR_PEOPLE: Array<{ kind: IndustryInvestorKind; identity: string; demand: string; brings: string; watch: string }> = [
    { kind: 'CELEBRITY', identity: 'Film star', demand: 'A lead role in one Original a year.', brings: 'Their fans follow the money: a burst of attention.', watch: 'Will say in public what they think of your choices.' },
    { kind: 'CELEBRITY', identity: 'Pop superstar', demand: 'A concert special every year.', brings: 'A wave of young members in their home market.', watch: 'Expects their face on a launch campaign.' },
    { kind: 'CELEBRITY', identity: 'Football icon', demand: 'A documentary about their club.', brings: 'Sports fans take notice.', watch: 'Wants live sport on the service.' },
    { kind: 'CELEBRITY', identity: 'Talk-show host', demand: 'A weekly show of their own.', brings: 'They talk about you to millions every week.', watch: 'A bad week for you is a monologue for them.' },
    { kind: 'FOUNDER', identity: 'Ride-hailing founder', demand: 'A seat in every technology review.', brings: 'Engineers want to work where they invest.', watch: 'Pushes for speed over polish.' },
    { kind: 'FOUNDER', identity: 'Gaming studio founder', demand: 'Games on the service within two years.', brings: 'Gamers follow them anywhere.', watch: 'Loses patience with slow product teams.' },
    { kind: 'FOUNDER', identity: 'Fintech founder', demand: 'Pricing experiments every quarter.', brings: 'Payments partners in emerging markets.', watch: 'Reads the churn numbers every week.' },
    { kind: 'FOUNDER', identity: 'Chip designer founder', demand: 'Early access to your recommendation data.', brings: 'Hardware partners and cheaper servers.', watch: 'Wants a say in technology choices.' },
    { kind: 'FOUNDER', identity: 'E-commerce founder', demand: 'Shoppable shows on the service.', brings: 'A marketing machine that knows every shopper.', watch: 'Measures everything by conversion.' },
    { kind: 'FAMILY', identity: 'Shipping heir', demand: 'A quiet seat at the annual review.', brings: 'Patient money that never panics.', watch: 'Expects steady profit, not headlines.' },
    { kind: 'FAMILY', identity: 'Hotel dynasty heir', demand: 'The service in every room they own.', brings: 'Distribution in hotels worldwide.', watch: 'Protects the family name above all.' },
    { kind: 'FAMILY', identity: 'Media dynasty heir', demand: 'First look at prestige projects.', brings: 'Old Hollywood friendships.', watch: 'Has opinions about every casting.' },
];
const INVESTOR_FIRMS: Array<{ kind: IndustryInvestorKind; identity: string; demand: string; brings: string; watch: string }> = [
    { kind: 'FUND', identity: 'Growth fund', demand: 'A board seat and a quarterly operating review.', brings: 'Other funds read the valuation it sets.', watch: 'Wants a listing within a few years.' },
    { kind: 'FUND', identity: 'Media private-equity firm', demand: 'Cost reviews every quarter.', brings: 'Operators who have run studios.', watch: 'Pushes margins over growth.' },
    { kind: 'FUND', identity: 'Venture fund', demand: 'Monthly updates on new products.', brings: 'Introductions to every startup that matters.', watch: 'Wants big swings, not safe bets.' },
    { kind: 'FUND', identity: 'Technology crossover fund', demand: 'A path to a public listing.', brings: 'Public-market investors trust its picks.', watch: 'Sells on the first sign of slowing growth.' },
    { kind: 'FUND', identity: 'Emerging-markets fund', demand: 'Expansion into two new regions.', brings: 'Partners in markets you have not entered.', watch: 'Measures you on international growth.' },
    { kind: 'FUND', identity: 'Pension fund', demand: 'Governance reports twice a year.', brings: 'The most patient money there is.', watch: 'Votes against risky pay packages.' },
    { kind: 'FUND', identity: 'Hedge fund', demand: 'Calls with the CFO every month.', brings: 'Liquidity when others are scared.', watch: 'Will sell the moment it disagrees.' },
    { kind: 'FUND', identity: 'Sports and entertainment fund', demand: 'Live events on the service.', brings: 'Leagues and promoters on speed dial.', watch: 'Wants sport, whatever it costs.' },
    { kind: 'FUND', identity: 'Climate and impact fund', demand: 'Greener data centres within three years.', brings: 'Good headlines and patient money.', watch: 'Will go public if you miss the targets.' },
    { kind: 'FUND', identity: 'Asian growth fund', demand: 'A push into East and South Asia.', brings: 'Telecom partners across Asia.', watch: 'Measures you on Asian members.' },
    { kind: 'SOVEREIGN', identity: 'Sovereign wealth fund', demand: 'A regional headquarters in its country.', brings: 'Governments take your filings seriously.', watch: 'Its politics become part of your headlines.' },
    { kind: 'SOVEREIGN', identity: 'National investment authority', demand: 'Local Originals every year.', brings: 'A huge, patient cheque.', watch: 'Asks you to avoid certain stories.' },
    { kind: 'FAMILY', identity: 'Family office', demand: 'A quiet seat at the annual review.', brings: 'Bankers read it as stability.', watch: 'Pays less than a fund and expects steady profit.' },
    { kind: 'FAMILY', identity: 'Single-family office', demand: 'Dividends once you are profitable.', brings: 'Old-money introductions.', watch: 'Hates surprises.' },
    { kind: 'FAMILY', identity: 'Multi-family office', demand: 'A seat for one of its families.', brings: 'Many rich families watching.', watch: 'Slow to agree, slower to leave.' },
];
const KIND_STAKE: Record<IndustryInvestorKind, [number, number]> = { CELEBRITY: [2, 5], FOUNDER: [2, 6], FAMILY: [3, 8], FUND: [5, 15], SOVEREIGN: [6, 15] };
const KIND_PRICE: Record<IndustryInvestorKind, [number, number]> = { CELEBRITY: [0.88, 0.95], FOUNDER: [0.86, 0.94], FAMILY: [0.8, 0.9], FUND: [0.78, 0.88], SOVEREIGN: [0.88, 0.97] };
const KIND_SHARE: Record<IndustryInvestorKind, [number, number]> = { CELEBRITY: [1, 2], FOUNDER: [0.5, 1], FAMILY: [0.5, 1.5], FUND: [0.5, 1], SOVEREIGN: [0, 0] };
/* people's worth sits among the celebrities they share the Forbes list with; firms' is what they manage */
const KIND_WORTH: Record<IndustryInvestorKind, [number, number]> = { CELEBRITY: [0.3e9, 1.5e9], FOUNDER: [0.8e9, 6e9], FAMILY: [1e9, 5e9], FUND: [2e9, 200e9], SOVEREIGN: [80e9, 900e9] };
const STRATEGIES: StreamingExecutiveStrategy[] = ['GROWTH_FIRST', 'CREATIVE_FIRST', 'TECHNOLOGY_FIRST', 'MARGIN_FIRST', 'TRUST_FIRST', 'GLOBAL_FIRST', 'BALANCED'];

const between = (rng: () => number, [low, high]: [number, number]) => low + rng() * (high - low);
const pick = <T,>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length) % list.length];
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const gradeOfSkill = (skill: number): IndustryGrade => (skill >= 86 ? 'STAR' : skill >= 76 ? 'SENIOR' : skill >= 64 ? 'SOLID' : 'RISING');
const FREE: IndustryEmployer = { kind: 'FREE', name: 'Between roles' };

/** the career's seed: every career gets its own industry, the same every time it loads */
export const industrySeedOf = (player: Pick<Player, 'id' | 'name'>) => `industry:${player.id || 'player'}:${player.name || 'founder'}`;

const rivalEmployers = (): IndustryEmployer[] => Object.values(STREAMING_RIVAL_TEMPLATES).map(template => ({
    kind: 'RIVAL', id: template.platformId, name: PLATFORMS[template.platformId]?.name || template.platformId,
}));
const studioEmployers = (): IndustryEmployer[] => Object.values(STUDIO_CATALOG).map(studio => ({ kind: 'STUDIO', id: studio.id, name: studio.name }));

const cautionFor = (rng: () => number, person: Pick<IndustryPerson, 'ambition' | 'ethics' | 'loyalty' | 'skill'>) => {
    if (person.ethics < 48) return 'Cuts corners when pushed.';
    if (person.ambition >= 82) return 'Wants a bigger role soon.';
    if (person.loyalty < 50) return 'Takes calls from rivals.';
    if (person.skill < 60) return 'Still learning the job.';
    return pick(rng, ['Slow to change a plan that works.', 'Needs a clear brief.', 'Says no more often than yes.', 'Wants the credit when it works.']);
};

const generate = (seed: string): IndustryPerson[] => {
    const rng = createDeterministicRng(`${seed}:people`);
    const taken = new Set<string>(NPC_DATABASE.map(npc => npc.name.toLowerCase()));
    const people: IndustryPerson[] = [];
    const rivals = rivalEmployers();
    const studios = studioEmployers();
    const formerPool = [...rivals.map(item => item.name), ...studios.map(item => item.name), 'StreamCo', 'Vistaplay', 'Orbit TV', 'PanWorld Broadcast'];
    const claim = (name: string) => { taken.add(name.toLowerCase()); return name; };
    /* the people the game already had keep their names, so no new person may take one */
    STREAMING_EXECUTIVE_CANDIDATES.forEach(candidate => claim(candidate.name));
    Object.values(STREAMING_RIVAL_TEMPLATES).forEach(template => claim(template.ceoName));
    STREAMING_CELEBRITY_INVESTOR_OFFERS.forEach(offer => claim(offer.name));
    STREAMING_INVESTOR_POOL.forEach(profile => claim(profile.name));
    Object.values(LEGACY_RENAMES).forEach(claim);
    const freshName = (gender: Gender) => {
        for (let attempt = 0; attempt < 400; attempt += 1) {
            const name = `${pick(rng, gender === 'FEMALE' ? FEMALE : MALE)} ${pick(rng, SURNAMES)}`;
            if (!taken.has(name.toLowerCase())) return claim(name);
        }
        return claim(`${pick(rng, gender === 'FEMALE' ? FEMALE : MALE)} ${pick(rng, SURNAMES)}-${people.length}`);
    };

    /* the executives the game had: their ids, names and stats stay */
    STREAMING_EXECUTIVE_CANDIDATES.forEach(candidate => {
        claim(candidate.name);
        const grade = gradeOfSkill(candidate.skill);
        people.push({
            id: candidate.id, kind: 'EXECUTIVE', name: candidate.name, gender: candidate.gender, person: true,
            role: candidate.role, roleLabel: ROLE_LABELS[candidate.role], grade,
            skill: candidate.skill, loyalty: candidate.loyalty, ambition: candidate.ambition, ethics: candidate.ethics,
            yearsExperience: candidate.yearsExperience, preferredStrategy: candidate.preferredStrategy,
            weeklyCompensation: candidate.weeklyCompensation, specialty: candidate.specialty, style: candidate.style,
            strength: candidate.strength, caution: candidate.caution, formerCompany: candidate.formerCompany, start: FREE,
            baseNetWorth: roundTo(candidate.yearsExperience * candidate.weeklyCompensation * 52 * 0.22, 100_000),
        });
    });

    /* the rival services' CEOs */
    Object.values(STREAMING_RIVAL_TEMPLATES).forEach(template => {
        claim(template.ceoName);
        const employer = rivals.find(item => item.id === template.platformId)!;
        people.push({
            id: `ceo-${template.platformId.toLowerCase()}`, kind: 'EXECUTIVE', name: template.ceoName, gender: RIVAL_CEO_GENDER[template.ceoName] || 'FEMALE',
            person: true, role: 'CEO', roleLabel: 'CEO', grade: 'STAR', skill: 90, loyalty: 88, ambition: 84, ethics: 70, yearsExperience: 24,
            preferredStrategy: 'BALANCED', weeklyCompensation: 900_000, specialty: 'Running a global service', style: 'Commanding',
            strength: template.ceoPersonality, caution: 'Answers to a board of their own.', formerCompany: employer.name, start: employer,
            baseNetWorth: roundTo(between(rng, [0.4e9, 2.5e9]), 10_000_000),
        });
    });

    /* the rest of each job, to 25 a job */
    INDUSTRY_SEAT_ROLES.forEach(role => {
        const have = people.filter(item => item.role === role || (role === 'INTERNATIONAL_HEAD' && item.role === 'COO')).length;
        for (let index = have; index < PER_ROLE; index += 1) {
            const roll = rng();
            const grade: IndustryGrade = roll < 0.15 ? 'STAR' : roll < 0.45 ? 'SENIOR' : roll < 0.8 ? 'SOLID' : 'RISING';
            const gender: Gender = rng() < 0.5 ? 'FEMALE' : 'MALE';
            const skill = Math.round(between(rng, GRADE_SKILL[grade]));
            const ambition = Math.round(grade === 'RISING' ? between(rng, [60, 95]) : between(rng, [30, 90]));
            const ethics = Math.round(rng() < 0.12 ? between(rng, [35, 50]) : between(rng, [55, 95]));
            const loyalty = Math.round(between(rng, [38, 92]));
            const years = Math.round(between(rng, GRADE_YEARS[grade]));
            const pay = roundTo((ROLE_PAY[role] || 170_000) * GRADE_PAY[grade] * between(rng, [0.92, 1.08]), 5_000);
            const where = rng();
            const start = where < 0.4 ? pick(rng, rivals) : where < 0.65 ? pick(rng, studios) : FREE;
            const person: IndustryPerson = {
                id: `exec-${role.toLowerCase().replace(/_/g, '-')}-${String(index).padStart(2, '0')}`, kind: 'EXECUTIVE',
                name: freshName(gender), gender, person: true, role, roleLabel: ROLE_LABELS[role], grade,
                skill, loyalty, ambition, ethics, yearsExperience: years, preferredStrategy: pick(rng, ROLE_STRATEGIES[role] || STRATEGIES),
                weeklyCompensation: pay, specialty: pick(rng, SPECIALTIES[role] || ['Operations']), style: pick(rng, STYLES),
                strength: pick(rng, STRENGTHS[role] || ['Gets things done.']), caution: '', formerCompany: pick(rng, formerPool), start,
                baseNetWorth: roundTo(years * pay * 52 * 0.22, 100_000),
            };
            person.caution = cautionFor(rng, person);
            people.push(person);
        }
    });

    /* the investors the game had */
    const legacyInvestor = (id: string, name: string, kind: IndustryInvestorKind, identity: string, stake: number, price: number, share: number,
        strategy: StreamingExecutiveStrategy, demand: string, brings: string, watch: string) => {
        const gender = LEGACY_INVESTOR_PEOPLE[id];
        const shown = LEGACY_RENAMES[id] || name;
        people.push({
            id: `inv-${id.replace(/^investor-/, '')}`, legacyId: id, ...(shown !== name ? { legacyName: name } : {}), kind: 'INVESTOR', name: shown, gender: gender || 'NON_BINARY', person: Boolean(gender),
            role: null, roleLabel: 'Investor', grade: 'STAR', skill: 80, loyalty: 70, ambition: 60, ethics: 70, yearsExperience: 20,
            preferredStrategy: strategy, weeklyCompensation: 0, specialty: identity, style: 'Investor', strength: brings, caution: watch,
            formerCompany: identity, start: { kind: 'OWN', name: identity }, baseNetWorth: roundTo(between(rng, KIND_WORTH[kind]), 10_000_000),
            investorKind: kind, publicIdentity: identity, stakeRange: [Math.max(1, stake - 2), stake + 3], priceFactor: price, profitSharePercent: share,
            influenceDemand: demand, attentionEffect: brings,
        });
    };
    STREAMING_CELEBRITY_INVESTOR_OFFERS.forEach(offer => legacyInvestor(offer.id, offer.name, 'CELEBRITY', offer.publicIdentity, offer.ownershipPercent,
        0.9, offer.profitParticipationPercent, offer.preferredStrategy, offer.influenceDemand, offer.attentionEffect, offer.caution));
    STREAMING_INVESTOR_POOL.forEach(profile => legacyInvestor(profile.id, profile.name, profile.kind, profile.publicIdentity, profile.stake, profile.price,
        profile.profitParticipationPercent, profile.preferredStrategy, profile.influenceDemand, profile.attentionEffect, profile.caution));

    /* new investors: people, then firms */
    for (let index = 0; index < GENERATED_INVESTOR_PEOPLE; index += 1) {
        const template = INVESTOR_PEOPLE[index % INVESTOR_PEOPLE.length];
        const gender: Gender = rng() < 0.5 ? 'FEMALE' : 'MALE';
        people.push({
            id: `inv-person-${String(index).padStart(2, '0')}`, kind: 'INVESTOR', name: freshName(gender), gender, person: true, role: null,
            roleLabel: 'Investor', grade: 'STAR', skill: 80, loyalty: 70, ambition: 60, ethics: Math.round(between(rng, [50, 95])), yearsExperience: 20,
            preferredStrategy: pick(rng, STRATEGIES), weeklyCompensation: 0, specialty: template.identity, style: 'Investor', strength: template.brings,
            caution: template.watch, formerCompany: template.identity, start: { kind: 'OWN', name: template.identity },
            baseNetWorth: roundTo(between(rng, KIND_WORTH[template.kind]), 10_000_000), investorKind: template.kind, publicIdentity: template.identity,
            stakeRange: KIND_STAKE[template.kind], priceFactor: Math.round(between(rng, KIND_PRICE[template.kind]) * 100) / 100,
            profitSharePercent: Math.round(between(rng, KIND_SHARE[template.kind]) * 2) / 2, influenceDemand: template.demand, attentionEffect: template.brings,
        });
    }
    for (let index = 0; index < GENERATED_INVESTOR_FIRMS; index += 1) {
        const template = INVESTOR_FIRMS[index % INVESTOR_FIRMS.length];
        let name = '';
        for (let attempt = 0; attempt < 200 && (!name || taken.has(name.toLowerCase())); attempt += 1) {
            name = template.kind === 'SOVEREIGN'
                ? `${pick(rng, FIRM_FIRST)} ${template.identity === 'Sovereign wealth fund' ? 'Sovereign Fund' : 'Investment Authority'}`
                : template.kind === 'FAMILY' ? `${pick(rng, SURNAMES)} & ${pick(rng, SURNAMES)}` : `${pick(rng, FIRM_FIRST)} ${pick(rng, FIRM_LAST)}`;
        }
        claim(name);
        people.push({
            id: `inv-firm-${String(index).padStart(2, '0')}`, kind: 'INVESTOR', name, gender: 'NON_BINARY', person: false, role: null, roleLabel: 'Investor',
            grade: 'STAR', skill: 80, loyalty: 70, ambition: 60, ethics: Math.round(between(rng, [50, 95])), yearsExperience: 20,
            preferredStrategy: pick(rng, STRATEGIES), weeklyCompensation: 0, specialty: template.identity, style: 'Investor', strength: template.brings,
            caution: template.watch, formerCompany: template.identity, start: { kind: 'OWN', name: template.identity },
            baseNetWorth: roundTo(between(rng, KIND_WORTH[template.kind]), 100_000_000), investorKind: template.kind, publicIdentity: template.identity,
            stakeRange: KIND_STAKE[template.kind], priceFactor: Math.round(between(rng, KIND_PRICE[template.kind]) * 100) / 100,
            profitSharePercent: Math.round(between(rng, KIND_SHARE[template.kind]) * 2) / 2, influenceDemand: template.demand, attentionEffect: template.brings,
        });
    }
    return people;
};

const cache = new Map<string, { people: IndustryPerson[]; byId: Map<string, IndustryPerson> }>();
const registryOf = (seed: string) => {
    let entry = cache.get(seed);
    if (!entry) {
        const people = generate(seed);
        entry = { people, byId: new Map(people.map(person => [person.id, person])) };
        cache.set(seed, entry);
    }
    return entry;
};

/** everyone in the industry, as the career's seed draws them */
export const getIndustryPeople = (player: Pick<Player, 'id' | 'name'>): IndustryPerson[] => registryOf(industrySeedOf(player)).people;
export const getIndustryPerson = (player: Pick<Player, 'id' | 'name'>, id: string): IndustryPerson | null => registryOf(industrySeedOf(player)).byId.get(id) || null;
/** an investor from the old lists, by the id or the name their records kept */
export const findIndustryInvestor = (player: Pick<Player, 'id' | 'name'>, legacyIdOrName: string): IndustryPerson | null => (
    getIndustryPeople(player).find(person => person.kind === 'INVESTOR' && [person.legacyId, person.legacyName, person.name, person.id].includes(legacyIdOrName)) || null
);

export const readIndustryPeopleState = (player: Pick<Player, 'world'>): IndustryPeopleWorldState => {
    const stored = player.world?.industryPeople;
    return {
        version: 1,
        employers: { ...(stored?.employers || {}) },
        earned: { ...(stored?.earned || {}) },
        lastWeek: typeof stored?.lastWeek === 'number' ? stored.lastWeek : -1,
        moves: Array.isArray(stored?.moves) ? stored!.moves.slice(-MOVES_KEPT) : [],
    };
};

/** where a person works now */
export const industryEmployerOf = (player: Pick<Player, 'world'>, person: IndustryPerson): IndustryEmployer => (
    player.world?.industryPeople?.employers?.[person.id] || person.start
);

/** what a person is worth now: what they had, plus the pay they have banked since */
export const industryNetWorthOf = (player: Pick<Player, 'world'>, person: IndustryPerson): number => (
    person.baseNetWorth + Math.max(0, player.world?.industryPeople?.earned?.[person.id] || 0)
);

const companyNameOf = (player: Player) => player.ownedStreamingPlatform?.identity?.name || 'Your service';

/**
 * The weekly upkeep: our team's chairs set who works for us; every employed executive banks a quarter of their pay;
 * every 3 weeks a few contracts end and a few people are hired by rivals and studios.
 */
export const processIndustryPeopleWeek = (player: Player): Player => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const state = readIndustryPeopleState(player);
    if (state.lastWeek === absoluteWeek) return player;
    const seed = industrySeedOf(player);
    const { people, byId } = registryOf(seed);
    const employerOf = (person: IndustryPerson) => state.employers[person.id] || person.start;
    const move = (person: IndustryPerson, to: IndustryEmployer) => {
        const from = employerOf(person);
        if (from.kind === to.kind && from.id === to.id && from.name === to.name) return;
        state.employers[person.id] = to;
        state.moves.push({ personId: person.id, from, to, absoluteWeek });
    };

    /* our chairs: whoever sits at our table works for us; whoever left is between roles again */
    const appointments = (player.ownedStreamingPlatform?.leadership?.appointments || []) as Array<{ executiveId: string; status: string; weeklyCompensation: number }>;
    const ours = new Map(appointments.filter(item => item.status === 'ACTIVE').map(item => [item.executiveId, item]));
    people.forEach(person => {
        if (person.kind !== 'EXECUTIVE') return;
        const at = employerOf(person);
        if (ours.has(person.id)) move(person, { kind: 'OURS', name: companyNameOf(player) });
        else if (at.kind === 'OURS') move(person, FREE);
    });

    /* pay, banked */
    people.forEach(person => {
        if (person.kind !== 'EXECUTIVE') return;
        const at = employerOf(person);
        if (at.kind === 'FREE') return;
        const pay = at.kind === 'OURS' ? ours.get(person.id)?.weeklyCompensation ?? person.weeklyCompensation : person.weeklyCompensation;
        state.earned[person.id] = Math.round((state.earned[person.id] || 0) + pay * KEPT_OF_PAY);
    });

    /* the market moves every 3 weeks: two contracts end, two people are hired */
    if (absoluteWeek % INDUSTRY_MARKET_WEEKS === 0) {
        const rng = createDeterministicRng(`${seed}:market:${absoluteWeek}`);
        const rivals = rivalEmployers();
        const studios = studioEmployers();
        const employed = people.filter(person => person.kind === 'EXECUTIVE' && person.role !== 'CEO' && ['RIVAL', 'STUDIO'].includes(employerOf(person).kind));
        const free = people.filter(person => person.kind === 'EXECUTIVE' && person.role !== 'CEO' && employerOf(person).kind === 'FREE');
        for (let count = 0; count < 2 && employed.length; count += 1) {
            const person = employed.splice(Math.floor(rng() * employed.length), 1)[0];
            move(person, FREE);
        }
        for (let count = 0; count < 2 && free.length; count += 1) {
            const person = free.splice(Math.floor(rng() * free.length), 1)[0];
            move(person, rng() < 0.6 ? pick(rng, rivals) : pick(rng, studios));
        }
    }

    state.lastWeek = absoluteWeek;
    state.moves = state.moves.slice(-MOVES_KEPT);
    /* only people the registry knows are kept */
    Object.keys(state.employers).forEach(id => { if (!byId.has(id)) delete state.employers[id]; });
    return { ...player, world: { ...player.world, industryPeople: state } };
};

/** #180: one person changes employer (a rival or a studio hires someone you passed on), recorded as a move */
export const moveIndustryPerson = (player: Player, personId: string, to: IndustryEmployer): Player => {
    const person = getIndustryPerson(player, personId);
    if (!person) return player;
    const state = readIndustryPeopleState(player);
    const from = state.employers[person.id] || person.start;
    if (from.kind === to.kind && from.id === to.id && from.name === to.name) return player;
    state.employers[person.id] = to;
    state.moves = [...state.moves, { personId: person.id, from, to, absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) }].slice(-MOVES_KEPT);
    return { ...player, world: { ...player.world, industryPeople: state } };
};

/** the services and studios that hire from the industry */
export const industryHirers = (): IndustryEmployer[] => [...rivalEmployers(), ...studioEmployers()];

const TIER_OF_GRADE: Record<IndustryGrade, NPCTier> = { STAR: 'A_LIST', SENIOR: 'ESTABLISHED', SOLID: 'RISING', RISING: 'UNKNOWN' };

/**
 * The industry's people as NPCs, for the Forbes list and anywhere people are listed: executives and the investors who
 * are people (firms are not). Their worth moves with their pay; an investor's stake in us is valued by the caller.
 * `notableOnly` keeps the ones a rich list would carry: investors, the rivals' CEOs, and whoever works for us, so
 * joining us puts an executive on the list.
 */
export const getIndustryNpcs = (player: Player, stakeValueOf?: (person: IndustryPerson) => number, notableOnly = false): NPCActor[] => (
    getIndustryPeople(player).filter(person => person.person && (!notableOnly
        || person.kind === 'INVESTOR' || person.role === 'CEO' || industryEmployerOf(player, person).kind === 'OURS')).map(person => {
        const employer = industryEmployerOf(player, person);
        const worth = industryNetWorthOf(player, person) + Math.max(0, stakeValueOf?.(person) || 0);
        return {
            id: person.id,
            name: person.name,
            handle: `@${person.id}`,
            gender: person.gender,
            avatar: '',
            tier: person.kind === 'INVESTOR' ? (worth >= 10e9 ? 'ICON' : worth >= 3e9 ? 'A_LIST' : 'ESTABLISHED') : TIER_OF_GRADE[person.grade],
            prestigeBias: 'MIXED',
            openness: 50,
            followers: 0,
            netWorth: worth,
            occupation: person.kind === 'INVESTOR' ? 'INVESTOR' : 'EXECUTIVE',
            bio: person.kind === 'INVESTOR'
                ? `${person.publicIdentity}.`
                : employer.kind === 'FREE' ? `${person.roleLabel}, between roles.` : `${person.roleLabel} at ${employer.name}.`,
            forbesCategory: person.kind === 'INVESTOR' ? 'Investor' : 'Media executive',
        } as NPCActor;
    })
);
