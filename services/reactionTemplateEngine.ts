import { ActiveRelease, CastStoryArchetype, CharacterStoryRole, Player, Review } from '../types';
import { getActorCareerArc } from './actorCareerArc';
import { NPC_DATABASE } from './npcLogic';

export type ReleaseCommercialRead = 'BREAKOUT' | 'HIT' | 'STEADY' | 'SOFT' | 'FLOP';
export type ReleaseCriticalRead = 'ACCLAIMED' | 'POSITIVE' | 'MIXED' | 'POOR' | 'PANNED';
export type ReleasePerformanceRead = 'REVELATION' | 'COMMANDING' | 'SOLID' | 'UNEASY' | 'MISCAST';
export type ReleaseCastRead = 'SCENE_STEALER' | 'STAR_POWERED' | 'BALANCED' | 'OUTSHINED';
export type ReleaseBudgetRead = 'MICRO' | 'LEAN' | 'STANDARD' | 'TENTPOLE';
export type ReleaseReactionFocus = 'OPENING' | 'CRITIC' | 'PERFORMANCE' | 'CASTING' | 'CAREER';

export interface ReleaseReactionContext {
    seed: string;
    title: string;
    playerName: string;
    studioName: string;
    genre: string;
    budget: number;
    budgetLabel: string;
    opening: number;
    openingLabel: string;
    rating: number;
    performance: number;
    role?: CharacterStoryRole;
    roleLabel: string;
    billing: string;
    careerArc: string;
    commercial: ReleaseCommercialRead;
    critical: ReleaseCriticalRead;
    performanceRead: ReleasePerformanceRead;
    castRead: ReleaseCastRead;
    budgetRead: ReleaseBudgetRead;
    againstType: boolean;
    isUniverse: boolean;
    isFranchise: boolean;
    storyFitLabel?: 'NATURAL_FIT' | 'BOLD_INTERPRETATION' | 'STORY_CONFLICT';
    storyFitSummary?: string;
    storyFitWarning?: string;
    castStoryArchetype?: CastStoryArchetype;
    castStoryHeadline?: string;
    castStorySummary?: string;
}

export interface ComposedReaction {
    id: string;
    focus: ReleaseReactionFocus;
    headline: string;
    subtext: string;
    socialText: string;
    authorName: string;
    authorHandle: string;
    hashtag: string;
}

const stableNumber = (seed: string): number => {
    let value = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        value ^= seed.charCodeAt(index);
        value = Math.imul(value, 16777619);
    }
    return value >>> 0;
};

const pick = <T>(items: readonly T[], seed: string, lane: string): T =>
    items[stableNumber(`${seed}:${lane}`) % Math.max(1, items.length)];

const formatMoney = (amount: number): string => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 0 : 1)}M`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
    return `$${Math.round(amount)}`;
};

const formatRole = (role?: CharacterStoryRole): string => (role || 'OTHER')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getCommercialRead = (opening: number, budget: number): ReleaseCommercialRead => {
    const ratio = opening / Math.max(1, budget);
    if (ratio >= 0.85) return 'BREAKOUT';
    if (ratio >= 0.5) return 'HIT';
    if (ratio >= 0.24) return 'STEADY';
    if (ratio >= 0.12) return 'SOFT';
    return 'FLOP';
};

const getCriticalRead = (rating: number): ReleaseCriticalRead => {
    if (rating >= 8.5) return 'ACCLAIMED';
    if (rating >= 7.2) return 'POSITIVE';
    if (rating >= 5.8) return 'MIXED';
    if (rating >= 4.1) return 'POOR';
    return 'PANNED';
};

const getPerformanceRead = (performance: number, againstType: boolean): ReleasePerformanceRead => {
    if (performance >= 88 || (againstType && performance >= 82)) return 'REVELATION';
    if (performance >= 76) return 'COMMANDING';
    if (performance >= 62) return 'SOLID';
    if (performance >= 47) return 'UNEASY';
    return 'MISCAST';
};

const getBudgetRead = (budget: number): ReleaseBudgetRead => {
    if (budget <= 2_000_000) return 'MICRO';
    if (budget <= 12_000_000) return 'LEAN';
    if (budget >= 120_000_000) return 'TENTPOLE';
    return 'STANDARD';
};

const tierScore = (tier?: string): number => ({
    ICON: 100,
    A_LIST: 90,
    ESTABLISHED: 72,
    RISING: 50,
    INDIE: 38,
    UNKNOWN: 18,
}[String(tier)] || 25);

const getCastRead = (player: Player, release: ActiveRelease, performance: number): ReleaseCastRead => {
    const coStars = (release.projectDetails?.castList || [])
        .filter(member => member.type === 'ACTOR' && !member.isPlayer && member.actorId !== 'PLAYER_SELF')
        .map(member => NPC_DATABASE.find(npc => npc.id === member.actorId || npc.id === member.npcId))
        .filter(Boolean);
    const strongestCoStar = coStars.reduce((highest, npc) => Math.max(highest, tierScore(npc?.tier)), 0);
    const playerFame = Number(player.stats?.fame || 0);
    if (strongestCoStar >= playerFame + 28 && performance >= 82) return 'SCENE_STEALER';
    if (strongestCoStar >= 82 && performance >= 65) return 'STAR_POWERED';
    if (strongestCoStar >= playerFame + 35 && performance < 58) return 'OUTSHINED';
    return 'BALANCED';
};

const COMMERCIAL_HEADLINES: Record<ReleaseCommercialRead, readonly string[]> = {
    BREAKOUT: [
        'opens like a genuine breakout',
        'turns its first weekend into an event',
        'arrives far louder than the market expected',
        'converts anticipation into immediate momentum',
        'makes an emphatic opening-week statement',
    ],
    HIT: [
        'finds a healthy opening lane',
        'gives exhibitors a confident first-week result',
        'starts with real commercial promise',
        'opens on the right side of expectations',
        'puts a credible hit within reach',
    ],
    STEADY: [
        'opens without a verdict',
        'starts respectably but still needs staying power',
        'lands in the crowded middle of the market',
        'leaves the next weekend carrying the argument',
        'begins with a workable, unspectacular result',
    ],
    SOFT: [
        'needs word of mouth after a soft opening',
        'starts below the level its campaign promised',
        'faces an early fight for audience attention',
        'opens quietly and now needs exceptional legs',
        'leaves its recovery work for the weeks ahead',
    ],
    FLOP: [
        'opens into immediate financial trouble',
        'fails to turn awareness into ticket sales',
        'starts with a result the studio cannot ignore',
        'faces a steep road toward covering its cost',
        'lands well below a sustainable opening',
    ],
};

const BUDGET_CONTEXT: Record<ReleaseBudgetRead, readonly string[]> = {
    MICRO: [
        'The tiny spend limits the damage, but it does not lower the creative standard.',
        'Resourcefulness is part of the appeal; thrift alone is not.',
        'The production is small enough to survive a niche run and sharp enough to seek one.',
        'A micro-budget gives it flexibility, not a free pass from audiences.',
    ],
    LEAN: [
        'The lean budget creates room for upside without making success automatic.',
        'Efficiency protects the studio, while audience enthusiasm decides the ceiling.',
        'The restrained spend looks smart only if the word of mouth keeps moving.',
        'It was made economically, but the screen still has to feel intentional.',
    ],
    STANDARD: [
        'The budget leaves both recovery and disappointment in play.',
        'This is now a test of weekly holds rather than opening-night noise.',
        'The spend is conventional; the audience response will decide whether the result is.',
        'There is enough scale to compete and enough exposure to make every week matter.',
    ],
    TENTPOLE: [
        'At this scale, a loud opening is the beginning of recovery—not the finish line.',
        'The money is visible, and so is the pressure to justify it.',
        'A production this large needs sustained global demand, not one headline weekend.',
        'The scale raises the ceiling and makes every weakness more expensive.',
    ],
};

const CRITICAL_CONTEXT: Record<ReleaseCriticalRead, readonly string[]> = {
    ACCLAIMED: [
        'Reviewers are treating the craft as the story, not merely the packaging.',
        'The critical response is unusually unified around its confidence and control.',
        'Critics see a film whose ambition is matched by its execution.',
        'The reviews suggest the project may outlive its release campaign.',
        'The consensus is less hype than genuine admiration.',
    ],
    POSITIVE: [
        'Reviews praise the control even when they disagree on the risks.',
        'The critical lane is positive enough to strengthen audience trust.',
        'Most reviewers see a confident project with identifiable strengths.',
        'The response gives the film useful credibility beyond its campaign.',
        'The consensus is warm, with only a few reservations around the edges.',
    ],
    MIXED: [
        'Critics agree on the ambition and split sharply on the execution.',
        'The response has produced defenders, skeptics and very little indifference.',
        'Reviews keep returning to the same tension between strong moments and uneven choices.',
        'The critical argument may be more durable than the score itself.',
        'Some see a bold swing; others see a project that needed one more pass.',
    ],
    POOR: [
        'Reviewers see isolated strengths inside an underdeveloped whole.',
        'The reviews are focusing on missed opportunities rather than simple bad luck.',
        'Critical patience is wearing thin around the project’s uneven execution.',
        'The response suggests the concept survived better than the finished film.',
        'A few performances escape criticism; the package does not.',
    ],
    PANNED: [
        'The consensus is brutal: scale and promotion could not hide the underlying problems.',
        'Reviewers are questioning decisions at every level of the production.',
        'The critical reaction has become a story larger than the film itself.',
        'Very little in the finished project is escaping the backlash.',
        'The reviews frame this as a failure of execution, not audience misunderstanding.',
    ],
};

const PERFORMANCE_CONTEXT: Record<ReleasePerformanceRead, readonly string[]> = {
    REVELATION: [
        '{player} gives the film the kind of performance that changes future casting conversations.',
        '{player} turns the {role} role into the project’s most replayed talking point.',
        'The surprise is not that {player} works as the {role}; it is how completely the role belongs to them.',
        '{player} finds choices in the {role} part that the campaign never knew how to sell.',
        'Every major conversation about the film eventually returns to {player}.',
    ],
    COMMANDING: [
        '{player} brings authority and detail to the {role} role.',
        'The {role} performance gives {player} another credible career lane.',
        '{player} keeps the role grounded even when the film reaches for scale.',
        'Casting directors will notice how comfortably {player} controls the frame.',
        '{player} makes the {role} part feel more important than its billing.',
    ],
    SOLID: [
        '{player} delivers a dependable {role} performance without forcing the moment.',
        'The {role} role adds a useful, credible credit to {player}’s run.',
        '{player} serves the story cleanly and avoids turning the role into a showcase.',
        'The performance is measured, professional and unlikely to hurt future offers.',
        '{player} does the work the role asks for, even when the film asks for little more.',
    ],
    UNEASY: [
        '{player} has effective moments, but the {role} role never fully settles.',
        'The performance and the part seem to be reaching for different movies.',
        '{player} finds flashes of the character without sustaining the full arc.',
        'The {role} casting remains more interesting as an idea than a finished performance.',
        'A few scenes connect; the larger character read stays uncertain.',
    ],
    MISCAST: [
        '{player} never finds a convincing way into the {role} role.',
        'The casting leaves both {player} and the character exposed.',
        'The {role} performance feels disconnected from the film around it.',
        'The role asks for a screen identity the production never helps {player} build.',
        'Neither effort nor billing can resolve the central casting mismatch.',
    ],
};

const CAST_CONTEXT: Record<ReleaseCastRead, readonly string[]> = {
    SCENE_STEALER: [
        'Surrounded by bigger names, {player} still becomes the cast member audiences carry home.',
        'The billing hierarchy says one thing; the audience conversation says {player}.',
        '{player} turns a supposed supporting position into the film’s main discovery.',
        'A star-heavy cast cannot stop {player} from stealing the most discussed scenes.',
    ],
    STAR_POWERED: [
        'The established cast gives the film reach, while {player} earns a place inside that company.',
        'The ensemble’s star power creates attention without completely swallowing {player}.',
        'Big names open the door; the cast’s shared chemistry keeps it open.',
        'The package works because its recognizable faces still behave like an ensemble.',
    ],
    BALANCED: [
        'The ensemble shares the frame without making the casting feel anonymous.',
        'No single performer has to rescue a cast that understands its roles.',
        'The chemistry feels built rather than purchased.',
        'The cast operates with enough balance to let the story stay in front.',
    ],
    OUTSHINED: [
        'The larger personalities in the cast leave {player} fighting for space.',
        '{player} is present, but the audience conversation keeps moving toward the co-stars.',
        'The billing promises parity that the finished performance never achieves.',
        'Star power helps the project while making {player} feel smaller inside it.',
    ],
};

const CAREER_CONTEXT = {
    AGAINST_TYPE: [
        'Against-type success gives agents permission to send scripts that were previously out of reach.',
        'The casting risk may have opened an entirely new lane for future offers.',
        'This is the rare reinvention that feels discovered rather than announced.',
        'A role outside the expected lane is now forcing the industry to redraw it.',
    ],
    TYPECAST: [
        'Demand is rising, but another similar role could turn momentum into a cage.',
        'The industry knows exactly how to cast this version of {player}; range now becomes the question.',
        'Success is strengthening the brand and narrowing the scripts arriving with it.',
        'The role reinforces a profitable screen identity that may become difficult to escape.',
    ],
    OPEN: [
        'The credit adds momentum without closing off the next casting direction.',
        'The performance strengthens the résumé while keeping future options open.',
        'This reads as progress, not a permanent label.',
        'The next role can build on this or deliberately move somewhere new.',
    ],
} as const;

const GENRE_CONTEXT = {
    SPECTACLE: [
        'The spectacle lands best when the character stakes stay visible beneath it.',
        'Audiences came for scale and are debating whether the story earned it.',
        'The action gives the campaign its images; the character work decides its staying power.',
        'The genre promises momentum, but viewers are responding most to the choices between set pieces.',
    ],
    INTIMATE: [
        'The quieter genre leaves every performance choice exposed.',
        'This kind of story lives or dies on emotional precision rather than production scale.',
        'The restrained canvas is giving audiences more room to argue about character detail.',
        'Without spectacle to hide behind, the project’s control becomes its main selling point.',
    ],
    DARK: [
        'The darker material is testing how far audiences will follow the project’s point of view.',
        'Tone is doing as much work as plot, and viewers are sharply divided on where it leads.',
        'The genre rewards commitment, but punishes any moment that feels calculated.',
        'Its tension comes from refusing easy comfort, which may strengthen loyalty while limiting reach.',
    ],
    COMEDY: [
        'Comedy is making the audience response immediate and unusually public.',
        'The jokes are travelling scene by scene, giving word of mouth a clear engine.',
        'Timing—not scale—is deciding which moments survive outside the film.',
        'The genre creates a simple test: audiences either repeat the lines or move on.',
    ],
    FAMILY: [
        'Family audiences are judging rewatch value as much as the first viewing.',
        'The broad appeal helps its reach, while warmth and clarity decide whether it lasts.',
        'The project is playing to multiple age groups without receiving the same response from each.',
        'Merchandise-ready images may open the door, but affection decides the long tail.',
    ],
    OTHER: [
        'The project’s identity is clear enough to give the audience conversation a distinct lane.',
        'Viewers are responding to the execution more than the genre label.',
        'The release is finding its audience through specificity rather than a familiar formula.',
        'Its strongest advantage is knowing the experience it wants to deliver.',
    ],
} as const;

const WORLD_CONTEXT = {
    UNIVERSE: [
        'Existing canon raises the excitement and makes every character choice part of a larger argument.',
        'Universe fans are measuring this chapter against both its own story and everything connected to it.',
        'The shared world supplies instant attention, while continuity expectations raise the difficulty.',
        'Every reveal is being treated as both a scene and a clue about what the universe does next.',
    ],
    FRANCHISE: [
        'Franchise familiarity brings an audience, but repetition remains the central risk.',
        'Returning fans recognize the world immediately and are watching for a reason this chapter needed to exist.',
        'The brand creates a strong opening lane while making fresh character choices more valuable.',
        'Legacy expectations are shaping the conversation as much as the new story.',
    ],
} as const;

const SOCIAL_OPENERS: Record<ReleasePerformanceRead, readonly string[]> = {
    REVELATION: [
        'That was not on the bingo card.',
        'Nobody warned the timeline.',
        'The casting discourse just changed.',
        'We need to discuss what just happened.',
        'A new screen era may have started.',
    ],
    COMMANDING: [
        'The confidence is all over the screen.',
        'This casting makes more sense with every scene.',
        'The camera clearly understands the assignment.',
        'There is a reason this performance keeps trending.',
        'That role found the right actor.',
    ],
    SOLID: [
        'Quietly good work still counts.',
        'Not every performance needs to scream.',
        'A clean piece of acting can hold a film together.',
        'This is how you build a filmography.',
        'Professional, specific and never desperate for applause.',
    ],
    UNEASY: [
        'The idea was stronger than the result.',
        'There are good scenes and then there is the whole performance.',
        'The timeline is trying to decide if this worked.',
        'Interesting casting does not automatically mean convincing casting.',
        'We can see the attempt. We can also see the strain.',
    ],
    MISCAST: [
        'Who made this casting call?',
        'The discourse is about to be exhausting.',
        'Some roles fight the actor all the way to the credits.',
        'This needed a different screen energy.',
        'The campaign promised a transformation the film never found.',
    ],
};

const AUTHORS = [
    ['Scene Watch', '@SceneWatch'],
    ['Film Corner', '@FilmCorner'],
    ['The Backlot', '@TheBacklot'],
    ['Frame by Frame', '@FrameByFrame'],
    ['Weekend Watch', '@WeekendWatch'],
    ['ScreenTalk', '@ScreenTalkNow'],
    ['Cinema Receipts', '@CinemaReceipts'],
    ['Role Call', '@RoleCall'],
] as const;

const TRADE_FRAMES = [
    '{title} {commercial}',
    '{studio} watches as {title} {commercial}',
    '{budget} on the line: {title} {commercial}',
    'First verdict on {title}: it {commercial}',
    '{title} enters the market and {commercial}',
] as const;

const CRITIC_FRAMES = [
    '{title} reviews arrive—and the argument is already clear',
    'Critics deliver their first verdict on {title}',
    '{title} turns its critical response into a story of its own',
    'The reviews are in for {title}',
    '{title}: craft, casting and the first critical consensus',
] as const;

const PERFORMANCE_FRAMES = [
    '{player} makes the {role} role the story of {title}',
    '{title} gives {player} a new screen identity',
    'The performance conversation around {title} belongs to {player}',
    '{player}’s {role} turn changes the read on {title}',
    'After {title}, casting directors may see {player} differently',
] as const;

const CASTING_FRAMES = [
    '{title} turns its casting hierarchy into a conversation',
    'The ensemble argument around {title} is only beginning',
    '{player} changes the expected cast order in {title}',
    'Audiences are rewriting the billing story around {title}',
    'The cast of {title} produces an unexpected center of gravity',
] as const;

const CAREER_FRAMES = [
    '{title} opens a new career lane for {player}',
    'After {title}, the next offer matters for {player}',
    '{player} leaves {title} with a different industry label',
    '{title} may mark the beginning of a new {player} era',
    'One release, a different career conversation for {player}',
] as const;

const fill = (template: string, context: ReleaseReactionContext, commercial = ''): string => template
    .replaceAll('{title}', context.title)
    .replaceAll('{player}', context.playerName)
    .replaceAll('{studio}', context.studioName)
    .replaceAll('{role}', context.roleLabel.toLowerCase())
    .replaceAll('{budget}', context.budgetLabel)
    .replaceAll('{opening}', context.openingLabel)
    .replaceAll('{commercial}', commercial);

const careerPoolFor = (context: ReleaseReactionContext) => {
    if (context.againstType && context.performance >= 78) return CAREER_CONTEXT.AGAINST_TYPE;
    const sameRoleCredits = context.careerArc.includes('ERA')
        || context.careerArc.includes('RUN')
        || context.careerArc.includes('PHASE')
        || context.careerArc.includes('TYPECAST');
    return sameRoleCredits ? CAREER_CONTEXT.TYPECAST : CAREER_CONTEXT.OPEN;
};

const genrePoolFor = (context: ReleaseReactionContext) => {
    const genre = context.genre.toUpperCase();
    if (/(ACTION|ADVENTURE|SUPERHERO|SCIENCE FICTION|SCI-FI|FANTASY)/.test(genre)) return GENRE_CONTEXT.SPECTACLE;
    if (/(DRAMA|ROMANCE|BIOPIC|HISTORICAL|MUSICAL)/.test(genre)) return GENRE_CONTEXT.INTIMATE;
    if (/(HORROR|THRILLER|CRIME|MYSTERY|NOIR)/.test(genre)) return GENRE_CONTEXT.DARK;
    if (/(COMEDY|SATIRE)/.test(genre)) return GENRE_CONTEXT.COMEDY;
    if (/(FAMILY|ANIMATION|ANIMATED|CHILDREN)/.test(genre)) return GENRE_CONTEXT.FAMILY;
    return GENRE_CONTEXT.OTHER;
};

const storyPoolFor = (context: ReleaseReactionContext) => {
    if (context.isUniverse) return WORLD_CONTEXT.UNIVERSE;
    if (context.isFranchise) return WORLD_CONTEXT.FRANCHISE;
    return genrePoolFor(context);
};

const hashtagFor = (context: ReleaseReactionContext): string => {
    const player = context.playerName.replace(/[^a-z0-9]/gi, '');
    const role = context.roleLabel.replace(/[^a-z0-9]/gi, '');
    const options = [
        `#${player}As${role}`,
        `#${player}Era`,
        `#${role}Arc`,
        `#${context.title.replace(/[^a-z0-9]/gi, '')}`,
        '#CastingDiscourse',
    ];
    return pick(options, context.seed, 'hashtag');
};

export const buildReleaseReactionContext = (player: Player, release: ActiveRelease): ReleaseReactionContext => {
    const playerCast = release.projectDetails?.castList?.find(member => member.isPlayer || member.actorId === 'PLAYER_SELF');
    const role = playerCast?.storyRole;
    const roleHistory = (player.pastProjects || []).filter(project => (
        !project.isQaArchive && project.playerCharacterProfile?.storyRole === role
    )).length;
    const performance = Math.max(0, Math.min(100, Number(release.productionPerformance || 50)));
    const budget = Math.max(0, Number(release.budget || release.projectDetails?.estimatedBudget || 0));
    const opening = Math.max(0, Number(release.weeklyGross?.[0] || release.streamingRevenue || 0));
    const rating = Math.max(0, Math.min(10, Number(release.imdbRating || 0)));
    const againstType = Boolean(role && roleHistory === 0);
    const studioName = player.businesses?.find(business => business.id === release.projectDetails?.studioId)?.name || 'the studio';

    return {
        seed: String(release.id),
        title: release.name,
        playerName: player.name || 'The lead',
        studioName,
        genre: String(release.projectDetails?.genre || 'DRAMA').replaceAll('_', ' ').toLowerCase(),
        budget,
        budgetLabel: formatMoney(budget),
        opening,
        openingLabel: formatMoney(opening),
        rating,
        performance,
        role,
        roleLabel: formatRole(role),
        billing: String(release.roleType || playerCast?.roleType || 'CAST'),
        careerArc: getActorCareerArc(player).id,
        commercial: getCommercialRead(opening, budget),
        critical: getCriticalRead(rating),
        performanceRead: getPerformanceRead(performance, againstType),
        castRead: getCastRead(player, release, performance),
        budgetRead: getBudgetRead(budget),
        againstType,
        isUniverse: Boolean(release.projectDetails?.universeId),
        isFranchise: Boolean(release.projectDetails?.franchiseId),
        storyFitLabel: release.projectDetails?.hiddenStats?.characterStoryFitLabel,
        storyFitSummary: release.projectDetails?.hiddenStats?.characterStoryFitSummary,
        storyFitWarning: release.projectDetails?.hiddenStats?.characterStoryFitWarnings?.[0],
        castStoryArchetype: release.projectDetails?.hiddenStats?.castStoryArchetype,
        castStoryHeadline: release.projectDetails?.hiddenStats?.castStoryHeadline,
        castStorySummary: release.projectDetails?.hiddenStats?.castStorySummary,
    };
};

export const composeReleaseReaction = (
    context: ReleaseReactionContext,
    focus: ReleaseReactionFocus,
    variant = 0
): ComposedReaction => {
    const variantSeed = `${context.seed}:${focus}:${variant}`;
    const commercialPhrase = pick(COMMERCIAL_HEADLINES[context.commercial], variantSeed, 'commercial');
    const performancePhrase = fill(pick(PERFORMANCE_CONTEXT[context.performanceRead], variantSeed, 'performance'), context);
    const castPhrase = fill(pick(CAST_CONTEXT[context.castRead], variantSeed, 'cast'), context);
    const criticalPhrase = pick(CRITICAL_CONTEXT[context.critical], variantSeed, 'critical');
    const budgetPhrase = pick(BUDGET_CONTEXT[context.budgetRead], variantSeed, 'budget');
    const careerPhrase = fill(pick(careerPoolFor(context), variantSeed, 'career'), context);
    const baseStoryPhrase = pick(storyPoolFor(context), variantSeed, 'story');
    const storyPhrase = context.storyFitLabel === 'STORY_CONFLICT'
        ? (context.storyFitWarning || 'The character concept clashes with rules the screenplay never establishes.')
        : context.storyFitLabel === 'BOLD_INTERPRETATION'
            ? 'The character is a deliberate creative swing, and the debate is whether the film earns it.'
            : context.storyFitLabel === 'NATURAL_FIT'
                ? 'The character feels native to the story and its world.'
                : baseStoryPhrase;
    const castStoryPhrase = context.castStorySummary
        ? `${context.castStoryHeadline ? `${context.castStoryHeadline}. ` : ''}${context.castStorySummary}`
        : storyPhrase;
    const headlineFrame = focus === 'OPENING'
        ? pick(TRADE_FRAMES, variantSeed, 'trade-frame')
        : focus === 'CRITIC'
            ? pick(CRITIC_FRAMES, variantSeed, 'critic-frame')
            : focus === 'CASTING'
                ? pick(CASTING_FRAMES, variantSeed, 'casting-frame')
                : focus === 'CAREER'
                    ? pick(CAREER_FRAMES, variantSeed, 'career-frame')
                    : pick(PERFORMANCE_FRAMES, variantSeed, 'performance-frame');
    let headline = fill(headlineFrame, context, commercialPhrase);
    const subtextParts = focus === 'OPENING'
        ? [budgetPhrase, context.role ? performancePhrase : storyPhrase]
        : focus === 'CRITIC'
            ? [criticalPhrase, context.role ? performancePhrase : budgetPhrase]
        : focus === 'CASTING'
            ? [castPhrase, castStoryPhrase]
                : focus === 'CAREER'
                    ? [careerPhrase, storyPhrase]
                    : [performancePhrase, careerPhrase];
    let subtext = subtextParts.join(' ');
    if (context.storyFitLabel && (focus === 'PERFORMANCE' || focus === 'CAREER')) {
        subtext = `${subtext} ${storyPhrase}`;
    }
    if (context.castStorySummary && focus === 'CRITIC') {
        subtext = `${subtext} ${castStoryPhrase}`;
    }
    if (focus === 'OPENING' && context.budgetRead === 'TENTPOLE' && (context.commercial === 'SOFT' || context.commercial === 'FLOP')) {
        subtext = `${subtext} It now has a difficult path to cover its costs.`;
    }
    if (focus === 'CRITIC' && (context.budgetRead === 'MICRO' || context.budgetRead === 'LEAN') && context.critical === 'ACCLAIMED') {
        headline = `${context.title} turns ${context.budgetLabel} into a critical breakout`;
        subtext = `${subtext} The praise is for the craft, not simply the low price tag.`;
    }
    if (focus === 'CRITIC' && context.budgetRead === 'TENTPOLE' && (context.critical === 'POOR' || context.critical === 'PANNED')) {
        headline = `${context.studioName}'s ${context.budgetLabel} ${context.title} faces a brutal critical verdict`;
    }
    const author = pick(AUTHORS, variantSeed, 'author');
    const opener = pick(SOCIAL_OPENERS[context.performanceRead], variantSeed, 'social-opener');
    const socialMiddle = focus === 'OPENING'
        ? `${context.title} ${commercialPhrase}. ${storyPhrase}`
        : focus === 'CASTING'
            ? `${castPhrase} ${castStoryPhrase}`
            : `${performancePhrase} ${storyPhrase}`;
    const hashtag = hashtagFor({ ...context, seed: variantSeed });

    return {
        id: `reaction_${focus.toLowerCase()}_${context.seed}`,
        focus,
        headline,
        subtext,
        socialText: `${opener} ${socialMiddle} ${hashtag}`,
        authorName: author[0],
        authorHandle: author[1],
        hashtag,
    };
};

export const generateRoleAwareCriticReview = (player: Player, release: ActiveRelease): Review | null => {
    const context = buildReleaseReactionContext(player, release);
    if (!context.role) return null;
    const reaction = composeReleaseReaction(context, 'PERFORMANCE');
    const sentiment: Review['sentiment'] = context.performanceRead === 'REVELATION' || context.performanceRead === 'COMMANDING'
        ? 'POSITIVE'
        : context.performanceRead === 'MISCAST'
            ? 'NEGATIVE'
            : 'MIXED';
    const rating = sentiment === 'POSITIVE'
        ? Math.min(5, 3.7 + context.performance / 100)
        : sentiment === 'NEGATIVE'
            ? Math.max(1, 2.2 - context.performance / 100)
            : 2.8;
    return {
        id: `role_review_${release.id}`,
        author: reaction.authorName,
        publication: 'Role & Frame',
        text: reaction.subtext,
        sentiment,
        type: 'CRITIC',
        rating: Number(rating.toFixed(1)),
    };
};

export const getReactionCombinationEstimate = (): number => (
    TRADE_FRAMES.length
    * CRITIC_FRAMES.length
    * PERFORMANCE_FRAMES.length
    * CASTING_FRAMES.length
    * CAREER_FRAMES.length
    * Object.values(COMMERCIAL_HEADLINES).reduce((sum, lines) => sum + lines.length, 0)
    * Object.values(PERFORMANCE_CONTEXT).reduce((sum, lines) => sum + lines.length, 0)
    * Object.values(CAST_CONTEXT).reduce((sum, lines) => sum + lines.length, 0)
    * (
        Object.values(GENRE_CONTEXT).reduce((sum, lines) => sum + lines.length, 0)
        + Object.values(WORLD_CONTEXT).reduce((sum, lines) => sum + lines.length, 0)
    )
    * AUTHORS.length
);
