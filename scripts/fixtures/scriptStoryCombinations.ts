import type { Genre, ProjectFormat, ProjectType, ScriptOption, StoryCompass } from '../../types';

export interface ScriptStoryCase {
    id: string;
    title: string;
    genres: Genre[];
    choices: Record<string, string>;
    compass: Partial<StoryCompass>;
    premiseTerms: string[];
    format?: ProjectFormat;
    projectType?: ProjectType;
}

/** Original scenarios corresponding to the approved broad plot draft. */
export const SCRIPT_STORY_CASES: ScriptStoryCase[] = [
    { id: 'criminal-rise', title: 'The Glass Ledger', genres: ['CRIME', 'DRAMA'], choices: { 'crime-focus': 'criminal-transformation' }, compass: { tone: 'MORALLY_GREY', conflictSource: 'INTERNAL' }, premiseTerms: ['professional', 'empire'] , projectType: 'SERIES' },
    { id: 'car-dealer', title: 'The Last Deal', genres: ['CRIME', 'THRILLER'], choices: { 'crime-focus': 'dealership-front' }, compass: { tone: 'MORALLY_GREY', conflictSource: 'ANTAGONIST' }, premiseTerms: ['dealer', 'showroom'] },
    { id: 'dealership-comedy', title: 'Showroom Heroes', genres: ['COMEDY'], choices: { premise: 'dealership-rivals', 'humor-style': 'deadpan', 'comedic-duo': 'rival-business-partners' }, compass: { tone: 'COMEDIC', perspective: 'DUAL' }, premiseTerms: ['dealers', 'sale'] },
    { id: 'driver-crew', title: 'Last Driver', genres: ['ACTION', 'CRIME'], choices: { protagonist: 'street-racer', 'inciting-incident': 'witness-needs-escape', sidekick: 'found-family-crew', 'set-piece': 'convoy-escape', 'villain-motivation': 'erase-evidence', 'climax-location': 'abandoned-dealership', ending: 'save-crew-lose-prize' }, compass: { perspective: 'ENSEMBLE', conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED' }, premiseTerms: ['racer', 'witness'] },
    { id: 'time-family', title: 'Borrowed Tomorrow', genres: ['SCI_FI', 'DRAMA'], choices: { concept: 'butterfly-effect', setting: 'present-day-workshop', 'tech-level': 'improvised-invention' }, compass: { worldRule: 'TECHNOLOGY', conflictSource: 'INTERNAL' }, premiseTerms: ['past', 'relationship'] },
    { id: 'time-loop', title: 'Sixty Seconds Back', genres: ['SCI_FI', 'THRILLER'], choices: { concept: 'time-loop', setting: 'present-day-workshop', 'tech-level': 'improvised-invention' }, compass: { worldRule: 'TECHNOLOGY' }, premiseTerms: ['time loop', 'failed attempt'] },
    { id: 'hero-team', title: 'Zero Hour Alliance', genres: ['SUPERHERO', 'ACTION'], choices: { origin: 'power-cancelling-team', 'villain-type': 'cosmic-threat' }, compass: { worldRule: 'SUPERPOWERED', perspective: 'ENSEMBLE', castShape: 'ENSEMBLE' }, premiseTerms: ['heroes', 'teamwork'] },
    { id: 'hero-ai', title: 'The Protector Protocol', genres: ['SUPERHERO', 'SCI_FI'], choices: { origin: 'recruited-hero-team', 'villain-type': 'rogue-protector-ai' }, compass: { worldRule: 'MIXED', perspective: 'ENSEMBLE' }, premiseTerms: ['alliance', 'AI'] },
    { id: 'memory-investigator', title: 'Afterimage', genres: ['MYSTERY', 'THRILLER'], choices: { 'mystery-engine': 'unreliable-investigator', 'mystery-reveal': 'false-memories' }, compass: { conflictSource: 'MYSTERY', worldRule: 'GROUNDED' }, premiseTerms: ['memory', 'evidence'] },
    { id: 'institution-thriller', title: 'The Closed Ward', genres: ['THRILLER', 'MYSTERY'], choices: { mystery: 'unreliable-investigation', pacing: 'psychological' }, compass: { conflictSource: 'MYSTERY', worldRule: 'GROUNDED' }, premiseTerms: ['investigator', 'memories'] },
    { id: 'precision-heist', title: 'Safe Custody', genres: ['CRIME', 'THRILLER'], choices: { 'crime-focus': 'precision-heist' }, compass: { perspective: 'ENSEMBLE', castShape: 'ENSEMBLE', tone: 'MORALLY_GREY' }, premiseTerms: ['crew', 'employer'] },
    { id: 'racing-engineers', title: 'Redline Garage', genres: ['SPORTS', 'DRAMA'], choices: { 'sports-arc': 'driver-engineer-partnership', arena: 'final-lap' }, compass: { perspective: 'DUAL', conflictSource: 'RIVAL' }, premiseTerms: ['mechanic', 'safety'] },
    { id: 'manufactured-past', title: 'Borrowed Lives', genres: ['SCI_FI', 'MYSTERY'], choices: { concept: 'memory-fabrication', setting: 'near-future-metropolis', 'tech-level': 'experimental-neurotech' }, compass: { worldRule: 'TECHNOLOGY', conflictSource: 'MYSTERY' }, premiseTerms: ['manufactured past', 'investigator'] },
    { id: 'journalist', title: 'Front Page', genres: ['DRAMA', 'THRILLER'], choices: { conflict: 'ambition-vs-integrity', tone: 'morally-grey', resolution: 'public-accountability' }, compass: { conflictSource: 'INTERNAL', tone: 'MORALLY_GREY' }, premiseTerms: ['journalist', 'evidence'] },
    { id: 'family-business', title: 'Second Service', genres: ['DRAMA', 'COMEDY'], choices: { conflict: 'family-business-control', tone: 'warm-grounded', resolution: 'reconciliation' }, compass: { perspective: 'DUAL', conflictSource: 'RIVAL', tone: 'HEROIC' }, premiseTerms: ['siblings', 'restaurant'] },
    { id: 'courtroom', title: 'The Missing Hour', genres: ['MYSTERY', 'DRAMA'], choices: { 'mystery-engine': 'compromised-confession', 'mystery-reveal': 'truth-protects-someone' }, compass: { conflictSource: 'MYSTERY' }, premiseTerms: ['confession', 'missing hour'] },
    { id: 'dream-heist', title: 'The Unwaking Job', genres: ['SCI_FI', 'THRILLER'], choices: { concept: 'shared-dream-heist', setting: 'shared-dreamscape', 'tech-level': 'experimental-neurotech' }, compass: { worldRule: 'TECHNOLOGY', perspective: 'ENSEMBLE' }, premiseTerms: ['shared dream', 'specialists'] },
    { id: 'time-thief-hybrid', title: 'The Last Rewind', genres: ['ACTION', 'SCI_FI'], choices: { protagonist: 'professional-thief', 'inciting-incident': 'future-warning', sidekick: 'specialist-heist-crew', 'set-piece': 'time-loop-escape', 'villain-motivation': 'control-timeline', 'climax-location': 'research-facility', ending: 'repair-timeline-at-cost' }, compass: { worldRule: 'TECHNOLOGY', perspective: 'ENSEMBLE', tone: 'TRAGIC' }, premiseTerms: ['thief', 'future self'] },
    { id: 'time-romance', title: 'Before We Remember', genres: ['ROMANCE', 'SCI_FI'], choices: { 'meet-cute': 'time-displaced-lovers', obstacle: 'changing-timeline' }, compass: { worldRule: 'TECHNOLOGY', perspective: 'DUAL' }, premiseTerms: ['different times', 'timeline'] },
    { id: 'psychological-horror', title: 'The Recollection Trial', genres: ['HORROR'], choices: { threat: 'unreliable-memory', setting: 'clinical-research-facility', 'victim-type': 'test-subject-group', twist: 'trusted-friend' }, compass: { worldRule: 'GROUNDED', conflictSource: 'MYSTERY', perspective: 'ENSEMBLE' }, premiseTerms: ['memories', 'clinical'] },
    { id: 'animated-machines', title: 'The Little Repair Crew', genres: ['ANIMATION'], format: 'ANIMATED', choices: { 'animation-world': 'miniature-machine-town' }, compass: { perspective: 'ENSEMBLE' }, premiseTerms: ['repair crews', 'machine'] },
    { id: 'memory-fantasy', title: 'The Borrowed Kingdom', genres: ['FANTASY', 'MYSTERY'], choices: { myth: 'stolen-memories' }, compass: { worldRule: 'MAGIC', conflictSource: 'MYSTERY' }, premiseTerms: ['memory thief', 'kingdom'] },
    { id: 'business-documentary', title: 'The Price of Growth', genres: ['DOCUMENTARY'], choices: { 'doc-approach': 'follow-business-rise', 'source-access': 'court-records' }, compass: { conflictSource: 'MYSTERY' }, premiseTerms: ['business', 'court records'] },
    { id: 'wrong-era-adventure', title: 'The Unfinished Crossing', genres: ['ADVENTURE', 'SCI_FI'], choices: { goal: 'return-from-wrong-era', location: 'historic-city' }, compass: { worldRule: 'TECHNOLOGY' }, premiseTerms: ['wrong era', 'centuries'] },
    { id: 'community-musical', title: 'One More Performance', genres: ['MUSICAL', 'DRAMA'], choices: { 'music-style': 'working-class-revue', 'emotional-core': 'ambition-vs-belonging' }, compass: { perspective: 'ENSEMBLE', conflictSource: 'INTERNAL' }, premiseTerms: ['revue', 'community'] },
    { id: 'contested-biopic', title: 'The Decision Remembered', genres: ['BIOPIC', 'DRAMA'], choices: { 'subject-angle': 'ethical-crossroads', access: 'conflicting-accounts' }, compass: { conflictSource: 'MYSTERY' }, premiseTerms: ['ethical choice', 'contradictory accounts'] },
];

export const storyCaseOptions = (story: ScriptStoryCase): ScriptOption[] => Object.entries(story.choices).map(([questionId, choiceId]) => ({ questionId, choiceId }));
