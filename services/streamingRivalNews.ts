/**
 * Rivals in the news (plan §10, Phase 5 #70): "techs unlocked or upgraded, by the player and by rivals
 * (e.g. … "Rival X brings HDR Pro")" and "quality comparisons ("their picture is better")"; §1: "news and
 * Instagram gossip, such as "Amazon ka naya feature dekha? unka video quality better hai"".
 *
 * Rivals take their steps at their own pace (#69). The week a rival takes one, the industry pass reports
 * it, worded as the player's own launches are (#66): a big step from any rival, a smaller one from the
 * global rivals only (the five core rivals and Prime Video), so regional services do not fill the feed.
 * When a rival's picture goes past the best the player's plans stream, the media compare the two.
 * Pure: reads the player and the world, returns facts.
 */
import type { IndustryEventFact, Player, StreamingTechId, WorldState } from '../types';
import { createIndustryEventFact } from './industryWorld/industryEventLedger';
import { normalizeStreamingPlatformEcosystem } from './streamingPlatformEcosystem';
import { resolveRivalStreamingTechGrowth } from './streamingRivalTech';
import { streamingTechLaunchStory } from './streamingPlatformNews';
import { streamingPictureRank } from './streamingPlanOffer';
import { getStreamingTechDefinition, streamingTechVersion } from './streamingTechTreeCatalogue';

const PICTURES: StreamingTechId[] = ['PICTURE_24K', 'PICTURE_16K', 'PICTURE_12K', 'PICTURE_8K', 'PICTURE_4K', 'PICTURE_1080P', 'PICTURE_720P', 'PICTURE_480P'];

/* the best picture the player's plans stream, as a rank and a name (4K is rank 3) */
const playerBestPicture = (player: Player): { rank: number; name: string } | null => {
    const plans = player.ownedStreamingPlatform?.serviceConfiguration?.pricing?.plans || [];
    const ranks = plans.map(plan => {
        const picture = plan.offer?.picture;
        if (picture) return { rank: streamingPictureRank(picture), name: getStreamingTechDefinition(picture)?.name || '' };
        return plan.featureIds.includes('uhd') ? { rank: 3, name: '4K' } : plan.featureIds.includes('hd') ? { rank: 2, name: '1080p' } : { rank: 1, name: '720p' };
    });
    return ranks.length ? ranks.reduce((best, item) => (item.rank > best.rank ? item : best)) : null;
};

/** What rivals launched since the last industry pass, and where a rival's picture went past the player's */
export const collectRivalTechFacts = (
    player: Player,
    world: WorldState,
    sinceWeek: number,
    absoluteWeek: number,
): IndustryEventFact[] => {
    const from = Number(player.ownedStreamingPlatform?.rivalTechFromWeek);
    if (!Number.isFinite(from) || absoluteWeek <= from) return [];
    const ecosystem = normalizeStreamingPlatformEcosystem(world.streamingPlatformEcosystem, absoluteWeek);
    const own = player.ownedStreamingPlatform?.identity;
    const mine = own?.slug && player.ownedStreamingPlatform?.launchCommit ? playerBestPicture(player) : null;
    const facts: IndustryEventFact[] = [];
    Object.values(ecosystem.operators)
        .sort((left, right) => left.id.localeCompare(right.id))
        .filter(operator => operator.lifecycle !== 'CLOSED' && operator.lifecycle !== 'ACQUIRED' && operator.activeCountryIds.length)
        .forEach(operator => {
            const id = operator.corePlatformId || operator.id;
            const name = (operator.corePlatformId && world.platforms?.[operator.corePlatformId]?.name) || operator.name;
            const researched = operator.corePlatformId ? world.platforms?.[operator.corePlatformId]?.ai?.capabilities.technologyLevels.PLAYBACK_QUALITY : undefined;
            const before = resolveRivalStreamingTechGrowth(id, operator.technology, researched, Math.max(0, Math.max(sinceWeek, from) - from));
            const after = resolveRivalStreamingTechGrowth(id, operator.technology, researched, absoluteWeek - from);
            const taken = after.steps.slice(before.steps.length);
            if (!taken.length) return;
            const global = operator.kind === 'CORE_GLOBAL' || operator.kind === 'GLOBAL_REAL';
            taken.forEach(step => {
                const story = streamingTechLaunchStory(step.techId, step.version, name);
                if (!story || (story.importance !== 'HIGH' && !global)) return;
                facts.push(createIndustryEventFact({
                    idempotencyKey: `rival-tech:${id}:${step.techId.toLowerCase()}:${step.version}`,
                    absoluteWeek, type: 'PLATFORM_TECH_LAUNCHED', importance: story.importance,
                    companyId: id, companyName: name, platformId: id,
                    headline: story.headline, detail: story.detail,
                    evidence: [{ kind: 'PLATFORM', id }],
                }));
            });
            /* "their picture is better": the step that takes a rival's picture past the player's best plan */
            const best = (tree: typeof after.tree) => PICTURES.find(picture => streamingTechVersion(tree, picture) >= 1);
            const rivalBest = best(after.tree);
            const rivalBefore = best(before.tree);
            if (!mine || !own?.slug || !rivalBest) return;
            const rank = streamingPictureRank(rivalBest);
            if (rank <= mine.rank || (rivalBefore && streamingPictureRank(rivalBefore) > mine.rank)) return;
            const picture = getStreamingTechDefinition(rivalBest)?.name || '';
            facts.push(createIndustryEventFact({
                idempotencyKey: `quality-gap:${own.slug}:${id}:${rank}`,
                absoluteWeek, type: 'PLATFORM_QUALITY_GAP', importance: 'HIGH',
                companyId: own.slug, companyName: own.name, platformId: own.slug,
                headline: `${name} now streams sharper than ${own.name}`,
                detail: `${name} streams in ${picture}; ${own.name}'s best plan streams in ${mine.name}.`,
                evidence: [{ kind: 'PLATFORM', id: own.slug }, { kind: 'PLATFORM', id }],
            }));
        });
    return facts;
};
