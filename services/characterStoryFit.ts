import {
    CharacterAbilityType,
    CharacterIdentityProfile,
    CharacterNature,
    CharacterStoryFit,
    CharacterStoryFunction,
    CharacterStoryRole,
    CastStoryRead,
    RoleType,
    StoryCompass,
} from '../types';

type IdentityField = 'storyFunction' | 'storyRole' | 'abilityType' | 'nature';

export interface CharacterIdentityOption<T extends string> {
    value: T;
    label: string;
    description: string;
}

export const CHARACTER_IDENTITY_FIELD_COPY: Record<IdentityField, {
    label: string;
    shortLabel: string;
    description: string;
    affects: string;
}> = {
    storyFunction: {
        label: 'Plot Function',
        shortLabel: 'Plot',
        description: 'The job this character performs in the structure of the story.',
        affects: 'Story coherence, character relationships, and how critics read the writing.',
    },
    storyRole: {
        label: 'Audience View',
        shortLabel: 'View',
        description: 'How the story invites viewers to judge and emotionally read this character.',
        affects: 'Role mastery, career arcs, casting demand, audience conversation, and performance coverage.',
    },
    abilityType: {
        label: 'Ability Source',
        shortLabel: 'Ability',
        description: 'Where the character gets any exceptional skill, power, or advantage.',
        affects: 'Fit with the script world, action credibility, and continuity.',
    },
    nature: {
        label: 'Character Type',
        shortLabel: 'Type',
        description: 'What the character physically or supernaturally is.',
        affects: 'World-rule coherence, universe continuity, and audience expectations.',
    },
};

export const CHARACTER_IDENTITY_OPTIONS: {
    storyFunction: CharacterIdentityOption<CharacterStoryFunction>[];
    storyRole: CharacterIdentityOption<CharacterStoryRole>[];
    abilityType: CharacterIdentityOption<CharacterAbilityType>[];
    nature: CharacterIdentityOption<CharacterNature>[];
} = {
    storyFunction: [
        { value: 'PROTAGONIST', label: 'Main Character', description: 'The story primarily follows their goals and choices.' },
        { value: 'ANTAGONIST', label: 'Main Opposition', description: 'The force actively blocking the main character.' },
        { value: 'DEUTERAGONIST', label: 'Co-Lead', description: 'A second major viewpoint with their own important arc.' },
        { value: 'RIVAL', label: 'Rival', description: 'A competitor who pressures or mirrors the main character.' },
        { value: 'MENTOR', label: 'Mentor', description: 'Guides another character through knowledge or experience.' },
        { value: 'ALLY', label: 'Ally', description: 'Supports the main character and advances their journey.' },
        { value: 'COMIC_RELIEF', label: 'Comic Relief', description: 'Releases tension while still serving the story.' },
        { value: 'CIVILIAN', label: 'Everyday Person', description: 'Represents ordinary life or the human cost of events.' },
        { value: 'OTHER', label: 'Custom Function', description: 'A less traditional plot function defined by your concept.' },
    ],
    storyRole: [
        { value: 'HERO', label: 'Hero', description: 'Viewers are encouraged to support their choices.' },
        { value: 'ANTI_HERO', label: 'Anti-Hero', description: 'A flawed or morally grey figure viewers still follow.' },
        { value: 'VILLAIN', label: 'Villain', description: 'Viewers are meant to fear, oppose, or question them.' },
        { value: 'ALLY', label: 'Trusted Ally', description: 'A supportive presence the audience can rely on.' },
        { value: 'CIVILIAN', label: 'Neutral Civilian', description: 'Not framed as heroic or villainous.' },
        { value: 'OTHER', label: 'Morally Unclear', description: 'The story deliberately avoids telling viewers how to judge them.' },
    ],
    abilityType: [
        { value: 'NONE', label: 'No Special Ability', description: 'Relies on ordinary human limits and choices.' },
        { value: 'TRAINED', label: 'Training or Skill', description: 'Exceptional through practice, knowledge, or discipline.' },
        { value: 'TECH', label: 'Technology', description: 'Uses inventions, machines, cybernetics, or advanced tools.' },
        { value: 'MAGIC', label: 'Magic', description: 'Draws power from spells, rituals, or a magical system.' },
        { value: 'SUPERNATURAL', label: 'Supernatural', description: 'Connected to ghosts, curses, demons, or unexplained forces.' },
        { value: 'SUPERPOWERED', label: 'Innate Superpower', description: 'Possesses extraordinary abilities as part of their being.' },
    ],
    nature: [
        { value: 'HUMAN', label: 'Human', description: 'A human character, whether ordinary or enhanced.' },
        { value: 'ROBOT', label: 'Robot or AI', description: 'An artificial intelligence or mechanical being.' },
        { value: 'ALIEN', label: 'Alien', description: 'A lifeform originating outside humanity or Earth.' },
        { value: 'CREATURE', label: 'Creature', description: 'A monster, beast, or non-human living being.' },
        { value: 'SPIRIT', label: 'Spirit', description: 'A ghost, soul, or incorporeal supernatural being.' },
        { value: 'OTHER', label: 'Other Type', description: 'A custom nature not covered by the standard categories.' },
    ],
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

export const getCharacterIdentityOption = <K extends IdentityField>(
    field: K,
    value: CharacterIdentityProfile[K],
): CharacterIdentityOption<any> => (
    CHARACTER_IDENTITY_OPTIONS[field].find(option => option.value === value)
    || {
        value,
        label: String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()),
        description: 'A custom character interpretation.',
    }
);

const ABILITIES_BY_WORLD: Record<StoryCompass['worldRule'], CharacterAbilityType[]> = {
    GROUNDED: ['NONE', 'TRAINED'],
    TECHNOLOGY: ['TECH', 'TRAINED', 'NONE'],
    MAGIC: ['MAGIC', 'TRAINED', 'NONE'],
    SUPERNATURAL: ['SUPERNATURAL', 'MAGIC', 'NONE'],
    SUPERPOWERED: ['SUPERPOWERED', 'TECH', 'TRAINED'],
    MIXED: ['NONE', 'TRAINED', 'TECH', 'MAGIC', 'SUPERNATURAL', 'SUPERPOWERED'],
};
const expectedAbilityForWorld = (worldRule: StoryCompass['worldRule']): CharacterAbilityType[] => ABILITIES_BY_WORLD[worldRule];

const NATURES_BY_WORLD: Record<StoryCompass['worldRule'], CharacterNature[]> = {
    GROUNDED: ['HUMAN'],
    TECHNOLOGY: ['HUMAN', 'ROBOT', 'ALIEN'],
    MAGIC: ['HUMAN', 'CREATURE', 'SPIRIT'],
    SUPERNATURAL: ['HUMAN', 'CREATURE', 'SPIRIT'],
    SUPERPOWERED: ['HUMAN', 'ALIEN', 'ROBOT', 'CREATURE'],
    MIXED: ['HUMAN', 'ROBOT', 'ALIEN', 'CREATURE', 'SPIRIT', 'OTHER'],
};
const expectedNatureForWorld = (worldRule: StoryCompass['worldRule']): CharacterNature[] => NATURES_BY_WORLD[worldRule];

const formatWorld = (value: StoryCompass['worldRule']): string => value
    .replaceAll('_', ' ')
    .toLowerCase();

const scoreIdentity = (
    compass: StoryCompass,
    profile: CharacterIdentityProfile,
    roleType: RoleType = 'SUPPORTING',
): { raw: number; strengths: string[]; warnings: string[] } => {
    let raw = 72;
    const strengths: string[] = [];
    const warnings: string[] = [];
    const isLead = roleType === 'LEAD';

    if (isLead && profile.storyFunction === 'PROTAGONIST') {
        raw += 6;
        strengths.push('The lead has a clear story centre.');
    } else if (isLead && !['PROTAGONIST', 'DEUTERAGONIST'].includes(profile.storyFunction)) {
        raw -= 17;
        warnings.push('The lead billing and plot function pull in different directions.');
    }

    if (profile.storyFunction === 'ANTAGONIST' && profile.storyRole === 'VILLAIN') {
        raw += 5;
        strengths.push('The main opposition has a clear audience read.');
    } else if (profile.storyFunction === 'ANTAGONIST' && profile.storyRole === 'HERO') {
        raw -= 7;
        warnings.push('A heroic main opposition needs stronger script justification.');
    }

    if (compass.conflictSource === 'RIVAL' && profile.storyFunction === 'RIVAL') {
        raw += 7;
        strengths.push('The rival directly supports the central conflict.');
    }
    if (compass.conflictSource === 'ANTAGONIST' && profile.storyFunction === 'ANTAGONIST') {
        raw += 7;
        strengths.push('The antagonist supports the script’s main conflict.');
    }

    if (isLead && compass.perspective === 'VILLAIN_LED' && profile.storyRole === 'VILLAIN') {
        raw += 8;
        strengths.push('The villain-led perspective is reflected in the lead.');
    } else if (isLead && compass.perspective === 'PROTAGONIST_LED' && ['HERO', 'ANTI_HERO'].includes(profile.storyRole)) {
        raw += 5;
        strengths.push('The audience view supports the protagonist-led perspective.');
    } else if (isLead && compass.perspective === 'PROTAGONIST_LED' && profile.storyRole === 'VILLAIN') {
        raw -= 18;
        warnings.push('A villainous protagonist is a bold interpretation of this script.');
    }

    if (compass.tone === 'HEROIC' && profile.storyRole === 'HERO') raw += 4;
    if (compass.tone === 'MORALLY_GREY' && profile.storyRole === 'ANTI_HERO') raw += 6;
    if (compass.tone === 'DARK' && ['ANTI_HERO', 'VILLAIN'].includes(profile.storyRole)) raw += 4;
    if (compass.tone === 'HEROIC' && profile.storyRole === 'VILLAIN' && profile.storyFunction !== 'ANTAGONIST') {
        raw -= 3;
        warnings.push('The heroic tone and villainous audience view create deliberate tension.');
    }

    const expectedAbilities = expectedAbilityForWorld(compass.worldRule);
    if (expectedAbilities.includes(profile.abilityType)) {
        const exactWorldMatch = (
            (compass.worldRule === 'TECHNOLOGY' && profile.abilityType === 'TECH')
            || (compass.worldRule === 'MAGIC' && profile.abilityType === 'MAGIC')
            || (compass.worldRule === 'SUPERNATURAL' && profile.abilityType === 'SUPERNATURAL')
            || (compass.worldRule === 'SUPERPOWERED' && profile.abilityType === 'SUPERPOWERED')
            || (compass.worldRule === 'GROUNDED' && ['NONE', 'TRAINED'].includes(profile.abilityType))
        );
        raw += exactWorldMatch ? 8 : 2;
        if (exactWorldMatch) strengths.push('The ability source follows the established world rules.');
    } else {
        const severe = compass.worldRule === 'GROUNDED' && ['MAGIC', 'SUPERNATURAL', 'SUPERPOWERED'].includes(profile.abilityType);
        raw -= severe ? 20 : 9;
        warnings.push(`${getCharacterIdentityOption('abilityType', profile.abilityType).label} is not established by this ${formatWorld(compass.worldRule)} story.`);
    }

    const expectedNatures = expectedNatureForWorld(compass.worldRule);
    if (expectedNatures.includes(profile.nature)) {
        raw += compass.worldRule === 'GROUNDED' && profile.nature === 'HUMAN' ? 7 : 3;
    } else {
        const severe = compass.worldRule === 'GROUNDED' && ['ROBOT', 'ALIEN', 'CREATURE', 'SPIRIT'].includes(profile.nature);
        raw -= severe ? 18 : 8;
        warnings.push(`${getCharacterIdentityOption('nature', profile.nature).label} needs an explanation in this ${formatWorld(compass.worldRule)} world.`);
    }

    const negativeScale = compass.flexibility === 'OPEN'
        ? 0.78
        : compass.flexibility === 'PROTECTED'
            ? 1.15
            : 0.94;
    const adjusted = raw < 72 ? 72 - ((72 - raw) * negativeScale) : raw;
    return { raw: clamp(Math.round(adjusted)), strengths: unique(strengths), warnings: unique(warnings) };
};

const resultForScore = (
    score: number,
    strengths: string[],
    warnings: string[],
): CharacterStoryFit => {
    const label = score >= 76
        ? 'NATURAL_FIT'
        : score >= 52
            ? 'BOLD_INTERPRETATION'
            : 'STORY_CONFLICT';
    const qualityAdjustment = score >= 86
        ? 3
        : score >= 76
            ? 1
            : score >= 58
                ? 0
                : score >= 45
                    ? -3
                    : -7;
    const summary = label === 'NATURAL_FIT'
        ? 'The character profile supports the script without closing off creative choices.'
        : label === 'BOLD_INTERPRETATION'
            ? 'The idea can work, but the writing and performance need to earn the contrast.'
            : 'The character currently breaks an important rule established by the script.';

    return {
        score,
        label,
        qualityAdjustment,
        summary,
        strengths: unique(strengths).slice(0, 3),
        warnings: unique(warnings).slice(0, 3),
    };
};

export const evaluateCharacterProfileFit = (
    compass: StoryCompass,
    profile: CharacterIdentityProfile,
    roleType: RoleType = 'SUPPORTING',
): CharacterStoryFit => {
    const result = scoreIdentity(compass, profile, roleType);
    return resultForScore(result.raw, result.strengths, result.warnings);
};

type CastStoryMember = Partial<CharacterIdentityProfile> & {
    roleType?: RoleType;
    name?: string;
    actorName?: string;
    talent?: number;
    fame?: number;
};

const getPresenceScore = (member?: CastStoryMember): number | null => {
    if (!member) return null;
    const talent = Number(member.talent);
    const fame = Number(member.fame);
    if (!Number.isFinite(talent) && !Number.isFinite(fame)) return null;
    return clamp(
        (Number.isFinite(talent) ? talent : 50) * 0.68
        + (Number.isFinite(fame) ? fame : 20) * 0.32
    );
};

const readableName = (member?: CastStoryMember, fallback = 'The character') => (
    member?.name?.trim() || member?.actorName?.trim() || fallback
);

/**
 * One shared ensemble read for Greenlight, canon continuity, and media coverage.
 * Fame alone never decides the result: a lesser-known actor with enough talent
 * is treated as breakout casting rather than an automatic mismatch.
 */
export const getCastStoryRead = (
    compass: StoryCompass,
    cast: CastStoryMember[],
): CastStoryRead => {
    const complete = cast.filter(member => (
        member.storyFunction && member.storyRole && member.abilityType && member.nature
    ));
    const protagonists = complete.filter(member => (
        member.storyFunction === 'PROTAGONIST' || member.storyFunction === 'DEUTERAGONIST'
    ));
    const antagonists = complete.filter(member => member.storyFunction === 'ANTAGONIST');
    const heroes = complete.filter(member => member.storyRole === 'HERO');
    const villains = complete.filter(member => member.storyRole === 'VILLAIN');
    const allies = complete.filter(member => member.storyRole === 'ALLY');
    const rivals = complete.filter(member => member.storyFunction === 'RIVAL');
    const mentors = complete.filter(member => member.storyFunction === 'MENTOR');
    const strengths: string[] = [];
    const warnings: string[] = [];

    let archetype: CastStoryRead['archetype'] = 'CHARACTER_DRIVEN';
    if (compass.perspective === 'VILLAIN_LED') archetype = 'VILLAIN_LED';
    else if (compass.perspective === 'DUAL') archetype = 'DUAL_LEADS';
    else if (heroes.length >= 3 && villains.length >= 1 && compass.conflictSource === 'ANTAGONIST') archetype = 'HERO_TEAM_VS_VILLAIN';
    else if (heroes.length >= 1 && villains.length >= 1 && compass.conflictSource === 'ANTAGONIST') archetype = 'HERO_VS_VILLAIN';
    else if (rivals.length >= 1 || compass.conflictSource === 'RIVAL') archetype = 'RIVALS';
    else if (compass.castShape === 'ENSEMBLE' || compass.perspective === 'ENSEMBLE') archetype = 'ENSEMBLE';
    else if (!['ANTAGONIST', 'RIVAL'].includes(compass.conflictSource)) archetype = 'OPEN_CONFLICT';

    let balanceScore = 72;
    if (compass.conflictSource === 'ANTAGONIST') {
        if (antagonists.length === 0) {
            balanceScore -= 22;
            warnings.push('The story promises a central opponent, but no character owns that job.');
        } else if (antagonists.length === 1) {
            balanceScore += 7;
            strengths.push('One clear main opposition gives the conflict a strong centre.');
        } else if (antagonists.length > 2 && compass.castShape !== 'ENSEMBLE') {
            balanceScore -= 6;
            warnings.push('Several main opponents are competing for the same dramatic space.');
        }
    }
    if (compass.castShape === 'ENSEMBLE') {
        if (protagonists.length + allies.length >= 4) {
            balanceScore += 6;
            strengths.push('The team has enough distinct voices to feel like a real ensemble.');
        } else {
            balanceScore -= 9;
            warnings.push('The ensemble promise needs more defined team members.');
        }
    }
    if (mentors.length > 0 && protagonists.length > 0) {
        balanceScore += 3;
        strengths.push('The mentor relationship gives the lead a clear emotional handoff.');
    }

    const compareCentralPresence = (
        left: CastStoryMember | undefined,
        right: CastStoryMember | undefined,
        balancedCopy: string,
        mismatchCopy: string,
    ) => {
        const leftPresence = getPresenceScore(left);
        const rightPresence = getPresenceScore(right);
        if (leftPresence === null || rightPresence === null) return;
        const gap = Math.abs(leftPresence - rightPresence);
        if (gap <= 15) {
            balanceScore += 3;
            strengths.push(balancedCopy);
        } else if (gap >= 32) {
            balanceScore -= 5;
            warnings.push(mismatchCopy);
        }
    };
    if (archetype === 'DUAL_LEADS') {
        compareCentralPresence(
            protagonists[0],
            protagonists[1],
            'The two leads have enough screen presence to share the story.',
            'One lead may dominate a story that promises equal dramatic weight.',
        );
    } else if (archetype === 'RIVALS') {
        compareCentralPresence(
            protagonists[0],
            rivals[0],
            'The rival pairing feels competitive rather than one-sided.',
            'The rivalry may feel one-sided unless the less established side gets stronger material.',
        );
    }

    const primaryHero = protagonists.find(member => ['HERO', 'ANTI_HERO'].includes(member.storyRole!)) || heroes[0];
    const primaryVillain = antagonists.find(member => member.storyRole === 'VILLAIN') || villains[0];
    const heroPresence = getPresenceScore(primaryHero);
    const villainPresence = getPresenceScore(primaryVillain);
    if (primaryHero && primaryVillain && heroPresence !== null && villainPresence !== null) {
        const presenceGap = heroPresence - villainPresence;
        const villainTalent = Number(primaryVillain.talent);
        const heroTalent = Number(primaryHero.talent);
        const villainFame = Number(primaryVillain.fame);
        const heroFame = Number(primaryHero.fame);

        if (presenceGap >= 28 && (!Number.isFinite(villainTalent) || villainTalent < 68)) {
            balanceScore -= 8;
            warnings.push(`${readableName(primaryVillain, 'The main villain')} may feel overmatched beside ${readableName(primaryHero, 'the lead')}.`);
        } else if (
            Number.isFinite(villainTalent)
            && Number.isFinite(heroTalent)
            && villainTalent >= heroTalent - 8
            && Number.isFinite(villainFame)
            && Number.isFinite(heroFame)
            && villainFame + 20 < heroFame
        ) {
            balanceScore += 5;
            strengths.push(`${readableName(primaryVillain, 'The lesser-known opponent')} has breakout-villain potential against the established lead.`);
        } else if (Math.abs(presenceGap) <= 16) {
            balanceScore += 4;
            strengths.push('The central hero and opposition feel evenly matched on screen.');
        }
    }

    const headlineByArchetype: Record<CastStoryRead['archetype'], string> = {
        HERO_TEAM_VS_VILLAIN: 'Heroes assemble against one central threat',
        HERO_VS_VILLAIN: 'A clear hero-versus-villain showdown',
        VILLAIN_LED: 'The villain owns the point of view',
        RIVALS: 'Two forces are built to collide',
        DUAL_LEADS: 'Two leads share the story',
        ENSEMBLE: 'The group is the main character',
        CHARACTER_DRIVEN: 'One character carries the story',
        OPEN_CONFLICT: 'The conflict comes from the world, not one villain',
    };
    const summaryByArchetype: Record<CastStoryRead['archetype'], string> = {
        HERO_TEAM_VS_VILLAIN: `${heroes.length} hero${heroes.length === 1 ? '' : 'es'} face ${Math.max(1, antagonists.length)} main opposition${antagonists.length === 1 ? '' : 's'}.`,
        HERO_VS_VILLAIN: 'The audience can immediately read who drives the story and who stands in the way.',
        VILLAIN_LED: 'The audience follows a villainous perspective rather than a traditional hero.',
        RIVALS: 'The drama is powered by competition, mirroring, and escalating pressure.',
        DUAL_LEADS: 'Both central characters need meaningful choices and a complete arc.',
        ENSEMBLE: `${protagonists.length + allies.length} defined team roles share the dramatic weight.`,
        CHARACTER_DRIVEN: 'The cast supports a focused central journey.',
        OPEN_CONFLICT: 'Society, nature, mystery, or an internal struggle supplies the main pressure.',
    };

    return {
        archetype,
        headline: headlineByArchetype[archetype],
        summary: summaryByArchetype[archetype],
        balanceScore: clamp(Math.round(balanceScore)),
        protagonistCount: protagonists.length,
        antagonistCount: antagonists.length,
        heroCount: heroes.length,
        villainCount: villains.length,
        allyCount: allies.length,
        strengths: unique(strengths).slice(0, 3),
        warnings: unique(warnings).slice(0, 3),
    };
};

export const evaluateCastStoryFit = (
    compass: StoryCompass,
    cast: CastStoryMember[],
): CharacterStoryFit => {
    const complete = cast.filter(member => (
        member.storyFunction && member.storyRole && member.abilityType && member.nature
    )) as Array<CharacterIdentityProfile & { roleType?: RoleType }>;
    if (!complete.length) {
        return resultForScore(72, [], ['Complete the character profiles to receive a story-fit read.']);
    }

    const reads = complete.map(member => scoreIdentity(compass, member, member.roleType || 'SUPPORTING'));
    let score = Math.round(reads.reduce((sum, read) => sum + read.raw, 0) / reads.length);
    const protagonistCount = complete.filter(member => member.storyFunction === 'PROTAGONIST').length;
    const antagonistCount = complete.filter(member => member.storyFunction === 'ANTAGONIST').length;
    const strengths = reads.flatMap(read => read.strengths);
    const warnings = reads.flatMap(read => read.warnings);
    const castRead = getCastStoryRead(compass, cast);

    if (compass.castShape === 'INTIMATE' && complete.length > 4) {
        score -= 6;
        warnings.push('The cast is wider than this intimate story suggests.');
    }
    if (compass.castShape === 'ENSEMBLE' && complete.length >= 4) {
        score += 4;
        strengths.push('The cast has enough distinct roles for an ensemble story.');
    }
    if (protagonistCount === 0) {
        score -= 8;
        warnings.push('The cast has no clear main character.');
    }
    if (protagonistCount > 2 && compass.perspective !== 'ENSEMBLE') {
        score -= 5;
        warnings.push('Too many main characters may blur the story focus.');
    }
    if (compass.conflictSource === 'ANTAGONIST' && antagonistCount === 0) {
        score -= 6;
        warnings.push('The script expects a main opposition, but the cast does not define one.');
    }
    score += Math.round((castRead.balanceScore - 72) * 0.35);
    strengths.push(...castRead.strengths);
    warnings.push(...castRead.warnings);

    return resultForScore(clamp(score), strengths, warnings);
};

export const formatCharacterStoryFitLabel = (label: CharacterStoryFit['label']): string => ({
    NATURAL_FIT: 'Natural Fit',
    BOLD_INTERPRETATION: 'Bold Interpretation',
    STORY_CONFLICT: 'Story Conflict',
}[label]);
