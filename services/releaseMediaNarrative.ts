import { ActiveRelease, InstaPost, Player, XPost } from '../types';
import {
    buildReleaseReactionContext,
    composeReleaseReaction,
    generateRoleAwareCriticReview,
} from './reactionTemplateEngine';

export { generateRoleAwareCriticReview };

export const getReleaseBudget = (release: ActiveRelease): number =>
    Math.max(0, Number(release.budget || release.projectDetails?.estimatedBudget || 0));

export const formatReleaseBudget = (budget: number): string => {
    if (budget >= 1_000_000_000) return `$${(budget / 1_000_000_000).toFixed(1)}B`;
    if (budget >= 1_000_000) return `$${(budget / 1_000_000).toFixed(budget >= 100_000_000 ? 0 : 1)}M`;
    if (budget >= 1_000) return `$${Math.round(budget / 1_000)}K`;
    return `$${Math.round(budget)}`;
};

export const getOpeningTradeNarrative = (
    player: Player,
    release: ActiveRelease
): { headline: string; subtext: string } => {
    const context = buildReleaseReactionContext(player, release);
    const reaction = composeReleaseReaction(context, 'OPENING');
    return { headline: reaction.headline, subtext: reaction.subtext };
};

export const getCriticTradeNarrative = (
    player: Player,
    release: ActiveRelease
): { headline: string; subtext: string } => {
    const context = buildReleaseReactionContext(player, release);
    const focus = context.role && (context.performanceRead === 'REVELATION' || context.performanceRead === 'MISCAST')
        ? 'PERFORMANCE'
        : 'CRITIC';
    const reaction = composeReleaseReaction(context, focus);
    return { headline: reaction.headline, subtext: reaction.subtext };
};

const socialPost = (
    reaction: ReturnType<typeof composeReleaseReaction>,
    likes: number,
    replies: number,
    replyList: string[]
): XPost => ({
    id: reaction.id,
    authorId: reaction.authorHandle.replace('@', ''),
    authorName: reaction.authorName,
    authorHandle: reaction.authorHandle,
    authorAvatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(reaction.authorName)}`,
    content: reaction.socialText,
    timestamp: Date.now(),
    likes,
    retweets: Math.max(20, Math.round(likes * 0.14)),
    replies,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'FILM_OPINION',
    replyList,
    sentiment: 'INDUSTRY',
});

/**
 * Produces a small, matched conversation from combinable phrase banks.
 * Content varies by budget, opening, reviews, role, performance, casting
 * contrast and career arc. Stable IDs stop week replays from posting twice.
 */
export const generateReleaseSocialReactions = (player: Player): XPost[] =>
    (player.activeReleases || []).flatMap(release => {
        if (release.weekNum !== 1 && release.weekNum !== 2) return [];

        const context = buildReleaseReactionContext(player, release);
        const projectReaction = composeReleaseReaction(context, 'OPENING');
        const projectReplies = [
            composeReleaseReaction(context, 'OPENING', 1).subtext,
            composeReleaseReaction(context, 'CRITIC', 2).subtext,
        ];
        const result = [socialPost(
            projectReaction,
            1_800 + Math.round(context.opening / Math.max(1, context.budget) * 4_500),
            180 + Math.round(Math.abs(context.rating - 6.5) * 110),
            projectReplies
        )];

        if (context.role) {
            const roleFocus = context.castRead === 'SCENE_STEALER' || context.castRead === 'OUTSHINED'
                ? 'CASTING'
                : 'PERFORMANCE';
            const roleReaction = composeReleaseReaction(context, roleFocus);
            const roleReplies = [
                composeReleaseReaction(context, 'PERFORMANCE', 1).subtext,
                composeReleaseReaction(context, 'CASTING', 2).subtext,
                composeReleaseReaction(context, 'CAREER', 3).subtext,
            ];
            result.push(socialPost(
                roleReaction,
                2_200 + context.performance * 54,
                260 + context.performance * 7,
                roleReplies
            ));
        }

        return result;
    });

/**
 * A single editorial Instagram card gives the release a visual-social echo
 * without flooding the feed. The stable ID means week-two processing cannot
 * repost the same release conversation.
 */
export const generateReleaseInstagramReactions = (player: Player): InstaPost[] =>
    (player.activeReleases || []).flatMap(release => {
        if (release.weekNum !== 1) return [];

        const context = buildReleaseReactionContext(player, release);
        const focus = context.role && (
            context.performanceRead === 'REVELATION'
            || context.performanceRead === 'MISCAST'
            || context.castRead === 'SCENE_STEALER'
        )
            ? 'PERFORMANCE'
            : 'OPENING';
        const reaction = composeReleaseReaction(context, focus, 4);
        const comments = [
            composeReleaseReaction(context, 'OPENING', 5).subtext,
            composeReleaseReaction(context, context.role ? 'CASTING' : 'CRITIC', 6).subtext,
            composeReleaseReaction(context, 'CAREER', 7).subtext,
        ];
        const engagementBase = Math.max(1, context.performance + context.rating * 10);

        return [{
            id: `reaction_instagram_${release.id}`,
            authorId: reaction.authorHandle.replace('@', ''),
            authorName: reaction.authorName,
            authorHandle: reaction.authorHandle,
            authorAvatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(reaction.authorName)}`,
            type: 'INDUSTRY_NEWS',
            caption: `${reaction.headline}. ${reaction.hashtag}`,
            week: player.currentWeek,
            year: player.age,
            likes: 1_400 + Math.round(engagementBase * 48),
            comments: 120 + Math.round(engagementBase * 3),
            shares: 90 + Math.round(engagementBase * 2.2),
            saves: 60 + Math.round(engagementBase * 1.4),
            commentList: comments,
            engagementScore: Math.max(30, Math.min(98, Math.round(engagementBase / 2))),
            mood: context.performanceRead === 'MISCAST' ? 'MESSY' : 'INDUSTRY',
            isPlayer: false,
        }];
    });
