import { ModTalentRow } from './modTalentData';

type SupplementCategory = 'actor' | 'director' | 'creator';

interface CategoryProfile {
  prefix: string;
  knownFor: string;
}

interface CountrySupplement {
  country: string;
  actor: CategoryProfile;
  director: CategoryProfile;
  creator: CategoryProfile;
}

const COUNTRY_SUPPLEMENTS: CountrySupplement[] = [
  { country: 'United States', actor: { prefix: 'Hudson', knownFor: 'Prestige streaming dramas and franchise leads' }, director: { prefix: 'Mercer', knownFor: 'Large scale studio thrillers' }, creator: { prefix: 'NeonState', knownFor: 'Film culture essays and challenge videos' } },
  { country: 'Canada', actor: { prefix: 'Laurent', knownFor: 'Festival dramas and sci-fi television' }, director: { prefix: 'Granville', knownFor: 'Atmospheric genre features' }, creator: { prefix: 'MapleCut', knownFor: 'Behind-the-scenes comedy and creator collabs' } },
  { country: 'Mexico', actor: { prefix: 'Solano', knownFor: 'Telenovela crossovers and crime dramas' }, director: { prefix: 'Cortazar', knownFor: 'Border thrillers and prestige dramas' }, creator: { prefix: 'LuzViral', knownFor: 'Sketch comedy and pop culture commentary' } },
  { country: 'United Kingdom', actor: { prefix: 'Ashford', knownFor: 'Period dramas and action ensembles' }, director: { prefix: 'Wycliffe', knownFor: 'Sharp prestige television and mysteries' }, creator: { prefix: 'UnionFrame', knownFor: 'Entertainment news and comedy formats' } },
  { country: 'France', actor: { prefix: 'Marceau', knownFor: 'Auteur dramas and global co-productions' }, director: { prefix: 'Rivette', knownFor: 'Elegant thrillers and romantic dramas' }, creator: { prefix: 'CineLumiere', knownFor: 'Fashion film essays and festival vlogs' } },
  { country: 'Germany', actor: { prefix: 'Keller', knownFor: 'Crime series and historical epics' }, director: { prefix: 'Bergmann', knownFor: 'Cold war thrillers and prestige limited series' }, creator: { prefix: 'RhineReel', knownFor: 'Tech cinema breakdowns and creator sketches' } },
  { country: 'Spain', actor: { prefix: 'Navarro', knownFor: 'Heist dramas and romantic thrillers' }, director: { prefix: 'Alameda', knownFor: 'Sunlit crime sagas and ensemble drama' }, creator: { prefix: 'RojoTake', knownFor: 'Comedy reactions and celebrity interviews' } },
  { country: 'Italy', actor: { prefix: 'Bellini', knownFor: 'Romantic dramas and crime television' }, director: { prefix: 'Vittori', knownFor: 'Fashion-world thrillers and family sagas' }, creator: { prefix: 'RomaPulse', knownFor: 'Lifestyle cinema and music comedy' } },
  { country: 'Ireland', actor: { prefix: 'Kerrigan', knownFor: 'Indie dramas and sharp comedy roles' }, director: { prefix: 'Dunleavy', knownFor: 'Bleak thrillers and intimate character pieces' }, creator: { prefix: 'CloverCast', knownFor: 'Sketch collectives and music reactions' } },
  { country: 'Sweden', actor: { prefix: 'Lindholm', knownFor: 'Nordic noir and global streaming dramas' }, director: { prefix: 'Soder', knownFor: 'Minimalist thrillers and prestige series' }, creator: { prefix: 'FrostByte', knownFor: 'Gaming cinema and social experiments' } },
  { country: 'Netherlands', actor: { prefix: 'VanDalen', knownFor: 'Festival dramas and crime procedurals' }, director: { prefix: 'Keizers', knownFor: 'Urban thrillers and documentary hybrids' }, creator: { prefix: 'CanalCut', knownFor: 'Travel comedy and film explainers' } },
  { country: 'Poland', actor: { prefix: 'Kowal', knownFor: 'Historical drama and gritty crime films' }, director: { prefix: 'Nowicki', knownFor: 'Political thrillers and intimate war stories' }, creator: { prefix: 'VistulaVibe', knownFor: 'Creator sketches and entertainment commentary' } },
  { country: 'Russia', actor: { prefix: 'Volkov', knownFor: 'Epic dramas and action television' }, director: { prefix: 'Zorin', knownFor: 'Mystery thrillers and bleak sci-fi' }, creator: { prefix: 'MoscowLens', knownFor: 'Film reactions and stunt challenges' } },
  { country: 'India', actor: { prefix: 'Raheja', knownFor: 'Pan-India action dramas and streaming hits' }, director: { prefix: 'Mehra', knownFor: 'Musical dramas and large ensemble films' }, creator: { prefix: 'MasalaMode', knownFor: 'Cinema commentary and viral skits' } },
  { country: 'Australia', actor: { prefix: 'Briar', knownFor: 'Adventure films and prestige miniseries' }, director: { prefix: 'Warratah', knownFor: 'Outback thrillers and character drama' }, creator: { prefix: 'KoalaCut', knownFor: 'Comedy stunts and entertainment explainers' } },
  { country: 'Philippines', actor: { prefix: 'SantosBay', knownFor: 'Romantic dramas and family television' }, director: { prefix: 'ManilaFrame', knownFor: 'Melodramas and social thrillers' }, creator: { prefix: 'HaloHaloLive', knownFor: 'Variety vlogs and music reactions' } },
  { country: 'Indonesia', actor: { prefix: 'Pratama', knownFor: 'Action horror and streaming romances' }, director: { prefix: 'Surya', knownFor: 'Folklore horror and youth dramas' }, creator: { prefix: 'JakartaJump', knownFor: 'Comedy travel and pop culture clips' } },
  { country: 'Türkiye', actor: { prefix: 'Demirhan', knownFor: 'Sweeping romances and prestige thrillers' }, director: { prefix: 'Kaplan', knownFor: 'Historic epics and crime sagas' }, creator: { prefix: 'IstanbulLoop', knownFor: 'Lifestyle comedy and drama recaps' } },
  { country: 'Nigeria', actor: { prefix: 'Okafor', knownFor: 'Nollywood dramas and streaming comedies' }, director: { prefix: 'Adeyemi', knownFor: 'Family sagas and social thrillers' }, creator: { prefix: 'LagosWave', knownFor: 'Sketch comedy and music culture' } },
  { country: 'Brazil', actor: { prefix: 'Alencar', knownFor: 'Telenovela leads and crime dramas' }, director: { prefix: 'Serrano', knownFor: 'Favela thrillers and sweeping romances' }, creator: { prefix: 'RioReacts', knownFor: 'Music comedy and celebrity formats' } },
  { country: 'South Africa', actor: { prefix: 'Maseko', knownFor: 'Prestige dramas and action series' }, director: { prefix: 'Botha', knownFor: 'Political thrillers and survival dramas' }, creator: { prefix: 'MzansiMotion', knownFor: 'Comedy interviews and creator travel' } },
];

const ACTOR_SUFFIXES = ['Vale', 'Cross', 'Stone', 'Reid', 'Monroe', 'Lane', 'Frost', 'Wilde', 'Archer', 'Nova'];
const DIRECTOR_SUFFIXES = ['Frame', 'Slate', 'Reel', 'Lens', 'Cut', 'Scene', 'Story', 'Vista', 'Signal', 'Noir'];
const CREATOR_SUFFIXES = ['Daily', 'Studio', 'Live', 'Loop', 'Vibe', 'Room', 'Wave', 'Drop', 'Rush', 'Mode'];
const GENDERS: ModTalentRow['gender'][] = ['FEMALE', 'MALE', 'FEMALE', 'MALE', 'NON_BINARY', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'NON_BINARY'];

const categoryConfig: Record<SupplementCategory, {
  suffixes: string[];
  tier: ModTalentRow['tier'];
  prestigeBias: ModTalentRow['prestigeBias'];
  forbesCategory: string;
  followersBase: number;
  netWorthBase: number;
}> = {
  actor: {
    suffixes: ACTOR_SUFFIXES,
    tier: 'ESTABLISHED',
    prestigeBias: 'MIXED',
    forbesCategory: 'Film Icon',
    followersBase: 1.8,
    netWorthBase: 6,
  },
  director: {
    suffixes: DIRECTOR_SUFFIXES,
    tier: 'ESTABLISHED',
    prestigeBias: 'PRESTIGE',
    forbesCategory: 'Director',
    followersBase: 0.9,
    netWorthBase: 8,
  },
  creator: {
    suffixes: CREATOR_SUFFIXES,
    tier: 'ESTABLISHED',
    prestigeBias: 'COMMERCIAL',
    forbesCategory: 'Creator',
    followersBase: 1.2,
    netWorthBase: 2,
  },
};

const buildSupplementRows = (country: string, category: SupplementCategory, profile: CategoryProfile): ModTalentRow[] => {
  const config = categoryConfig[category];
  return Array.from({ length: 10 }, (_, index): ModTalentRow => ({
    country,
    category,
    name: `${profile.prefix} ${config.suffixes[index]}`,
    gender: GENDERS[index],
    knownFor: profile.knownFor,
    followersM: Number((config.followersBase + index * 0.27).toFixed(2)),
    netWorthM: config.netWorthBase + index * 2,
    prestigeBias: index % 5 === 0 ? 'COMMERCIAL' : config.prestigeBias,
    tier: index < 2 ? 'A_LIST' : config.tier,
    forbesCategory: config.forbesCategory,
    notes: `Supplemental ${country} ${category} talent pack addition.`,
    age: 24 + ((index * 3 + country.length) % 28),
  }));
};

export const MOD_TALENT_SUPPLEMENT_ROWS: ModTalentRow[] = COUNTRY_SUPPLEMENTS.flatMap(entry => [
  ...buildSupplementRows(entry.country, 'actor', entry.actor),
  ...buildSupplementRows(entry.country, 'director', entry.director),
  ...buildSupplementRows(entry.country, 'creator', entry.creator),
]);
