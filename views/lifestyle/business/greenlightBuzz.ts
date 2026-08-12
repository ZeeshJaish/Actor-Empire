import type {
    Business,
    NewsItem,
    Player,
    ProjectInvestorPlan,
    ProjectMusicPlan,
    Script,
    Universe,
    UniverseId,
    XPost,
} from '../../../types';
import {
    buildUniverseRoster,
    getUniverseCharacterKeyAliases,
    getUniverseDashboardProjects,
    isUniverseRetired,
} from '../../../services/universeLogic';
import { formatMoney } from './greenlightUtils';

export type GreenlightBuzzItem =
    | { type: 'HEADLINE'; data: NewsItem }
    | { type: 'TWEET'; data: XPost };

export interface GreenlightBuzzCastMember {
    actorId: string;
    name: string;
    characterId?: string;
    characterName: string;
    sourceUniverseId?: UniverseId;
}

export interface BuildGreenlightBuzzInput {
    player: Player;
    studio: Business;
    selectedScript: Script;
    directorName: string;
    castCount: number;
    equipmentChoices: Record<string, string>;
    soundtrackPlan?: ProjectMusicPlan;
    investorPlan?: ProjectInvestorPlan;
    estimatedBudget: number;
    estimatedQuality: number;
    finalizedCastList: GreenlightBuzzCastMember[];
    finalUniverseId?: UniverseId;
    isCreatingNewUniverse: boolean;
    normalizedWorldUniverses: Record<string, Universe>;
    isPlayerDirector: boolean;
    now?: () => number;
    random?: () => number;
}

export interface GreenlightBuzzResult {
    generatedBuzz: GreenlightBuzzItem[];
    newsItem: NewsItem;
    characterNewsItems: NewsItem[];
}

export const buildGreenlightBuzz = ({
    player,
    studio,
    selectedScript,
    directorName,
    castCount,
    equipmentChoices,
    soundtrackPlan,
    investorPlan,
    estimatedBudget,
    estimatedQuality,
    finalizedCastList,
    finalUniverseId,
    isCreatingNewUniverse,
    normalizedWorldUniverses,
    isPlayerDirector,
    now = Date.now,
    random = Math.random,
}: BuildGreenlightBuzzInput): GreenlightBuzzResult => {
    const generatedBuzz: GreenlightBuzzItem[] = [];
    const isHighQuality = estimatedQuality > 85;
    const isLowQuality = estimatedQuality < 45;
    const legacyParent = player.flags?.legacyParent || null;
    const legacyParentActorId = legacyParent?.actorId;
    const legacyParentName = legacyParent?.name || 'the previous owner';
    const parentTitle = legacyParent?.gender === 'FEMALE' ? 'mother' : legacyParent?.gender === 'NON_BINARY' ? 'parent' : 'father';
    const childTitle = player.gender === 'FEMALE' ? 'daughter' : player.gender === 'NON_BINARY' ? 'child' : 'son';

    let headlineText = `${studio.name} Greenlights "${selectedScript.title}"`;
    let headlineSub = 'Production set to begin immediately.';

    if (isHighQuality) {
        headlineText = `Must-See: ${studio.name} Bets Big on "${selectedScript.title}"`;
        headlineSub = `Insiders are calling the script a "masterpiece". ${directorName} attached to direct.`;
    } else if (isLowQuality) {
        headlineText = `Risky Move? ${studio.name} Proceeds with "${selectedScript.title}"`;
        headlineSub = 'Industry analysts question the viability of this project.';
    }

    const premiumEquipment = Object.entries(equipmentChoices).filter(([, choice]) => choice === 'TIER_4' || choice === 'TIER_5');
    if (premiumEquipment.length > 0) {
        const equipmentNames = premiumEquipment.map(([id]) => id === 'cameras' ? 'custom IMAX rigs' : id === 'lighting' ? 'stadium-grade lighting' : id === 'sound' ? 'Dolby Atmos gear' : 'massive practical sets');
        headlineSub += ` Studio is sparing no expense, renting ${equipmentNames.join(' and ')}.`;
    }

    if (soundtrackPlan?.credits?.length) {
        const leadCredit = soundtrackPlan.credits[0];
        headlineSub += ` Music push led by ${leadCredit.artistName} with "${leadCredit.songTitle}".`;
    }

    if (investorPlan?.totalRaised) {
        headlineSub += ` Outside investors covered ${formatMoney(investorPlan.totalRaised)} for ${investorPlan.investorEquityPercent}% project equity.`;
    }

    const newsItem: NewsItem = {
        id: `news_${now()}`,
        headline: headlineText,
        subtext: headlineSub,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: Math.floor(player.currentWeek / 52) + 2024,
        impactLevel: isHighQuality ? 'HIGH' : 'MEDIUM',
    };
    generatedBuzz.push({ type: 'HEADLINE', data: newsItem });

    const characterNewsItems: NewsItem[] = [];
    if (finalUniverseId && !isCreatingNewUniverse) {
        const universe = normalizedWorldUniverses[finalUniverseId];
        if (universe) {
            const existingProjects = getUniverseDashboardProjects(player, finalUniverseId, player.activeReleases || []);
            const existingRoster = buildUniverseRoster(universe, existingProjects, player.name);
            const existingById = new Map<string, any>();
            existingRoster.forEach(character => {
                getUniverseCharacterKeyAliases(finalUniverseId, character.characterId || character.id, character.name)
                    .forEach(alias => existingById.set(alias, character));
            });

            const returningCharacters = finalizedCastList
                .map(cast => {
                    const existing = getUniverseCharacterKeyAliases(finalUniverseId, cast.characterId, cast.characterName)
                        .map(alias => existingById.get(alias))
                        .find(Boolean);
                    if (!existing) return null;
                    return { cast, existing, isRecast: existing.actorId !== cast.actorId };
                })
                .filter(Boolean) as Array<{ cast: GreenlightBuzzCastMember; existing: any; isRecast: boolean }>;

            const story = returningCharacters.find(item => item.isRecast) || returningCharacters.find(item => !item.isRecast);
            if (story) {
                const actorName = story.cast.name || 'Unknown Actor';
                const parentLinkedRole = legacyParentActorId && story.existing.actorId === legacyParentActorId;
                const oldActorName = parentLinkedRole ? legacyParentName : story.existing.actorId === 'PLAYER_SELF' ? player.name : (story.existing.actorName || 'Unknown Actor');
                const headline = parentLinkedRole && story.isRecast
                    ? `${actorName} takes over ${legacyParentName}'s ${story.cast.characterName} role in "${selectedScript.title}"`
                    : parentLinkedRole
                        ? `${player.name} brings ${legacyParentName} back as ${story.cast.characterName} in "${selectedScript.title}"`
                        : story.isRecast
                            ? `${actorName} takes over as ${story.cast.characterName} in "${selectedScript.title}"`
                            : `${story.cast.characterName} returns in "${selectedScript.title}"`;
                const subtext = parentLinkedRole && story.isRecast
                    ? `The franchise keeps ${story.cast.characterName} alive, while fans watch how ${player.name}'s studio handles a role built by their ${parentTitle}.`
                    : parentLinkedRole
                        ? `The ${childTitle}-${parentTitle} collaboration turns this connected chapter into a personal industry story.`
                        : story.isRecast
                            ? `The universe is keeping ${story.cast.characterName} alive, but fans will be watching the recast closely after ${oldActorName}'s run.`
                            : `${actorName} is back as ${story.cast.characterName}, giving the universe another connected chapter.`;
                const socialContent = parentLinkedRole && story.isRecast
                    ? `${actorName} stepping into ${story.cast.characterName} after ${legacyParentName}'s run is a serious pressure test.`
                    : parentLinkedRole
                        ? `${legacyParentName} returning as ${story.cast.characterName} under ${player.name}'s greenlight is going to have people talking.`
                        : story.isRecast
                            ? `Big swing. ${actorName} as ${story.cast.characterName} could either refresh the whole universe or split the fandom.`
                            : `${story.cast.characterName} coming back in "${selectedScript.title}" is exactly the connected-universe energy fans wanted.`;

                const characterNews: NewsItem = {
                    id: `news_character_${now()}`,
                    headline,
                    subtext,
                    category: 'UNIVERSE',
                    week: player.currentWeek,
                    year: Math.floor(player.currentWeek / 52) + 2024,
                    impactLevel: story.isRecast ? 'HIGH' : 'MEDIUM',
                };
                characterNewsItems.push(characterNews);
                generatedBuzz.push({ type: 'HEADLINE', data: characterNews });
                generatedBuzz.push({
                    type: 'TWEET',
                    data: {
                        id: `x_character_${now()}`,
                        authorId: 'npc_fandom_wire',
                        authorName: story.isRecast ? 'FandomWire' : 'Universe Updates',
                        authorHandle: story.isRecast ? '@FandomWire' : '@UniverseUpdates',
                        authorAvatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${story.isRecast ? 'FandomWire' : 'UniverseUpdates'}`,
                        content: socialContent,
                        timestamp: now(),
                        likes: story.isRecast ? 18000 : 12000,
                        retweets: story.isRecast ? 4200 : 2600,
                        replies: story.isRecast ? 1900 : 600,
                        isPlayer: false,
                        isLiked: false,
                        isRetweeted: false,
                        isVerified: true,
                    },
                });
            }
        }
    }

    const legacyArchiveStory = finalizedCastList
        .map(cast => {
            const sourceUniverse = cast.sourceUniverseId ? normalizedWorldUniverses[cast.sourceUniverseId] : null;
            if (!sourceUniverse || !isUniverseRetired(sourceUniverse)) return null;
            if (finalUniverseId && cast.sourceUniverseId === finalUniverseId) return null;
            return { cast, sourceUniverse };
        })
        .find(Boolean) as { cast: GreenlightBuzzCastMember; sourceUniverse: Universe } | undefined;

    if (legacyArchiveStory) {
        const actorName = legacyArchiveStory.cast.name || 'Unknown Actor';
        const characterNews: NewsItem = {
            id: `news_legacy_character_${now()}`,
            headline: `${legacyArchiveStory.cast.characterName} returns from the ${legacyArchiveStory.sourceUniverse.name} archive`,
            subtext: `${actorName}'s casting in "${selectedScript.title}" has fans asking if this is a one-off legacy play or the first signal of a bigger revival.`,
            category: 'UNIVERSE',
            week: player.currentWeek,
            year: Math.floor(player.currentWeek / 52) + 2024,
            impactLevel: 'HIGH',
        };
        characterNewsItems.push(characterNews);
        generatedBuzz.push({ type: 'HEADLINE', data: characterNews });
        generatedBuzz.push({
            type: 'TWEET',
            data: {
                id: `x_legacy_character_${now()}`,
                authorId: 'npc_archive_watch',
                authorName: 'Archive Watch',
                authorHandle: '@ArchiveWatch',
                authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=ArchiveWatch',
                content: `${legacyArchiveStory.cast.characterName} showing up after ${legacyArchiveStory.sourceUniverse.name} was retired is not a normal casting choice. This could be tribute, reboot bait, or pure chaos.`,
                timestamp: now(),
                likes: 21000,
                retweets: 5400,
                replies: 2600,
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
            },
        });
    }

    const parentCollaborationCast = legacyParentActorId && !legacyParent?.isDeceased
        ? finalizedCastList.find(cast => cast.actorId === legacyParentActorId)
        : null;
    if (parentCollaborationCast) {
        const collaborationNews: NewsItem = {
            id: `news_parent_collab_${now()}`,
            headline: `${player.name} sets ${legacyParentName} for "${selectedScript.title}"`,
            subtext: isPlayerDirector
                ? `The ${childTitle}-${parentTitle} production has extra attention because ${player.name} is calling action on a parent-led performance.`
                : `The ${childTitle}-${parentTitle} pairing gives ${studio.name}'s new slate a personal industry hook.`,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: Math.floor(player.currentWeek / 52) + 2024,
            impactLevel: 'MEDIUM',
        };
        characterNewsItems.push(collaborationNews);
        generatedBuzz.push({ type: 'HEADLINE', data: collaborationNews });
        generatedBuzz.push({
            type: 'TWEET',
            data: {
                id: `x_parent_collab_${now()}`,
                authorId: 'npc_setwatch',
                authorName: 'SetWatch',
                authorHandle: '@SetWatch',
                authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=SetWatch',
                content: `${legacyParentName} joining "${selectedScript.title}" while ${player.name} runs the studio is the kind of casting story people will follow week by week.`,
                timestamp: now(),
                likes: 9000,
                retweets: 1700,
                replies: 520,
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
            },
        });
    }

    const socialCount = isHighQuality ? 8 : isLowQuality ? 6 : 5;
    for (let index = 0; index < socialCount; index += 1) {
        const isPositive = isHighQuality ? random() > 0.2 : isLowQuality ? random() > 0.8 : random() > 0.4;
        const isHater = !isPositive && random() > 0.5;
        let content = '';
        let author = '';
        let handle = '';

        if (index === 0) {
            author = 'FilmUpdates';
            handle = '@FilmUpdates';
            content = `BREAKING: ${directorName} to direct "${selectedScript.title}". ${castCount > 0 ? 'Cast includes top talent.' : ''} #${selectedScript.genres[0]} #Cinema`;
        } else if (index === 1) {
            author = 'Deadline';
            handle = '@Deadline';
            content = `EXCLUSIVE: ${studio.name} moves forward with ${selectedScript.genres[0]} project "${selectedScript.title}". Budget estimated at $${(estimatedBudget / 1_000_000).toFixed(0)}M.`;
        } else {
            const users = [
                { name: 'MovieBuff99', handle: '@MovieBuff99' },
                { name: 'CinemaSinsFan', handle: '@SinsFan' },
                { name: 'PopCultureStan', handle: '@PopStan' },
                { name: 'TheCritic', handle: '@RealCritic' },
                { name: 'BoxOfficePro', handle: '@BoxOffice' },
                { name: 'IndieLover', handle: '@IndieFilmz' },
                { name: 'BlockbusterKing', handle: '@ActionFan' },
            ];
            const user = users[index % users.length];
            author = user.name;
            handle = user.handle;

            if (isHighQuality) {
                if (isHater) content = `Unpopular opinion: ${directorName} is overrated. "${selectedScript.title}" sounds generic. 🤷‍♂️`;
                else {
                    const praises = [
                        `OMG YES! ${directorName} doing a ${selectedScript.genres[0]} movie? Take my money! 🔥🔥🔥`,
                        `The concept for "${selectedScript.title}" is insane. Oscar contender?`,
                        `Finally some good news. ${studio.name} is cooking.`,
                        'I need a trailer NOW.',
                        'Cast looks stacked. This is going to be huge.',
                    ];
                    content = praises[Math.floor(random() * praises.length)];
                }
            } else if (isLowQuality) {
                if (isPositive) content = `Actually, I kinda like the sound of "${selectedScript.title}". Could be a cult classic?`;
                else {
                    const criticisms = [
                        `Who asked for this? ${studio.name} is burning money. 🗑️`,
                        'Another flop incoming.',
                        'Why are they making this?',
                        'Looks cheap. Pass.',
                        'My interest is zero.',
                    ];
                    content = criticisms[Math.floor(random() * criticisms.length)];
                }
            } else {
                const mixed = [
                    `Interested to see how "${selectedScript.title}" turns out. The cast looks okay.`,
                    `Could be good, could be bad. We'll see.`,
                    'Not sure about this one chief.',
                    `I'll wait for reviews.`,
                    'Decent director choice.',
                ];
                content = mixed[Math.floor(random() * mixed.length)];
            }
        }

        generatedBuzz.push({
            type: 'TWEET',
            data: {
                id: `x_${now()}_${index}`,
                authorId: 'npc_random',
                authorName: author,
                authorHandle: handle,
                authorAvatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${handle}`,
                content,
                timestamp: now(),
                likes: Math.floor(random() * 5000) + 100,
                retweets: Math.floor(random() * 1000) + 10,
                replies: Math.floor(random() * 200),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: index === 0,
            },
        });
    }

    if (soundtrackPlan?.credits?.length) {
        const leadCredit = soundtrackPlan.credits[0];
        generatedBuzz.push({
            type: 'TWEET',
            data: {
                id: `x_music_${now()}`,
                authorId: 'npc_musicwire',
                authorName: 'MusicWire',
                authorHandle: '@MusicWire',
                authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=MusicWire',
                content: `${leadCredit.artistName} is attached to "${selectedScript.title}" music. "${leadCredit.songTitle}" could push this movie way outside normal film circles.`,
                timestamp: now(),
                likes: Math.floor(5000 + (soundtrackPlan.musicBuzz || 0) * 240),
                retweets: Math.floor(800 + (soundtrackPlan.musicBuzz || 0) * 60),
                replies: Math.floor(100 + (soundtrackPlan.musicRisk || 0) * 12),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
            },
        });
    }

    return { generatedBuzz, newsItem, characterNewsItems };
};
