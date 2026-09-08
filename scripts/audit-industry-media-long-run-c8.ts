import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';
import { SHARED_INDUSTRY_B8_SCENARIO_SEEDS } from './helpers/sharedIndustryB8Scenarios';
import { assertSharedIndustryB8Integrity, SHARED_INDUSTRY_B8_CHECKPOINTS } from './helpers/sharedIndustryB8Metrics';
import { evaluateSharedIndustryB8Experience } from './helpers/sharedIndustryB8Experience';
import type { SharedIndustryB8Regime } from './helpers/sharedIndustryB8Types';
import {
    INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT,
    INDUSTRY_MEDIA_STORY_LIMIT,
} from '../services/industryWorld/industryMediaLedger';
import {
    INDUSTRY_MEDIA_DISCUSSION_KEY_LIMIT,
    INDUSTRY_MEDIA_DISCUSSION_LIMIT,
    INDUSTRY_MEDIA_RESPONSE_KEY_LIMIT,
    INDUSTRY_MEDIA_RESPONSE_LIMIT,
} from '../services/industryWorld/industryMediaDiscussions';
import {
    INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT,
    INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT,
    INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT,
} from '../services/industryWorld/industryMediaYoutube';
import {
    INDUSTRY_MEDIA_CAMPAIGN_LIMIT,
    INDUSTRY_MEDIA_FANDOM_LIMIT,
    INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT,
} from '../services/industryWorld/industryMediaFandoms';
import {
    INDUSTRY_MEDIA_CLAIM_LIMIT,
    INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT,
} from '../services/industryWorld/industryMediaClaimsState';
import {
    INDUSTRY_MEDIA_C7_KEY_LIMIT,
    INDUSTRY_MEDIA_NARRATIVE_LIMIT,
    INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT,
    INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT,
    INDUSTRY_MEDIA_RELATIONSHIP_LIMIT,
} from '../services/industryWorld/industryMediaC7State';
import {
    INDUSTRY_MEDIA_STANCE_LIMIT,
    INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT,
} from '../services/industryWorld/industryMediaIdentities';

const ALL_REGIMES: SharedIndustryB8Regime[] = ['BASELINE', 'LEAN', 'BOOM', 'CROWDED', 'ADVERSE'];
const requestedRegime = process.env.C8_LONG_REGIME as SharedIndustryB8Regime | undefined;
const regimes = requestedRegime && ALL_REGIMES.includes(requestedRegime) ? [requestedRegime] : ALL_REGIMES;
const horizonWeeks = Math.max(520, Math.round(Number(process.env.C8_LONG_WEEKS || 20_800)));
const reportPath = process.env.C8_LONG_REPORT_PATH?.trim();
const skipResume = process.env.C8_LONG_SKIP_RESUME === '1';
const checkpoints: number[] = SHARED_INDUSTRY_B8_CHECKPOINTS.filter(week => week <= horizonWeeks);
if (!checkpoints.includes(horizonWeeks)) checkpoints.push(horizonWeeks);

const histogram = <T extends string>(values: T[]) => values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
}, {});

const largestShare = (values: string[]): number => {
    if (!values.length) return 0;
    return Math.max(...Object.values(histogram(values))) / values.length;
};

const reports: Array<Record<string, unknown>> = [];
const experiences = [];

for (const regime of regimes) {
    const result = await runSharedIndustryB8Scenario({
        regime,
        seed: SHARED_INDUSTRY_B8_SCENARIO_SEEDS[regime],
        horizonWeeks,
        checkpointWeeks: checkpoints,
        resumeAtWeek: skipResume ? undefined : Math.floor(horizonWeeks / 2),
        persistenceEveryWeeks: 520,
        progressEveryWeeks: Math.max(520, Math.floor(horizonWeeks / 10)),
        onProgress: progress => console.log(
            `C8 ${regime} ${progress.absoluteWeek}/${progress.horizonWeeks} weeks · ${progress.elapsedMs}ms`,
        ),
    });
    assert.equal(result.processedWeeks, horizonWeeks);
    assert.equal(result.doubleProcessedWeeks, 0);
    if (!skipResume) {
        assert.equal(result.resumeDigest, result.uninterruptedDigest, `${regime} save/reload branch diverged`);
        assert.deepEqual(result.resumeDifferencePaths, []);
    }
    assert.deepEqual(assertSharedIndustryB8Integrity(result.report), []);
    assert.ok(result.report.experience, `${regime} must produce B8 experience metrics`);
    experiences.push(result.report.experience!);

    const media = result.player.world.industryMedia;
    assert.ok(media, `${regime} must finish with canonical industry media state`);
    const eventIds = new Set(result.player.world.industryEvents?.events.map(event => event.id) || []);
    const storyIds = new Set(media.stories.map(story => story.id));

    const collectionBounds: Record<string, [number, number]> = {
        stories: [media.stories.length, INDUSTRY_MEDIA_STORY_LIMIT],
        publishedBeatKeys: [media.publishedBeatKeys.length, INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT],
        subjectStances: [media.subjectStances.length, INDUSTRY_MEDIA_STANCE_LIMIT],
        storyAssignments: [media.storyAssignments.length, INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT],
        discussions: [media.discussions.length, INDUSTRY_MEDIA_DISCUSSION_LIMIT],
        playerResponses: [media.playerResponses.length, INDUSTRY_MEDIA_RESPONSE_LIMIT],
        processedDiscussionKeys: [media.processedDiscussionKeys.length, INDUSTRY_MEDIA_DISCUSSION_KEY_LIMIT],
        processedResponseKeys: [media.processedResponseKeys.length, INDUSTRY_MEDIA_RESPONSE_KEY_LIMIT],
        creatorChannels: [media.creatorChannels.length, INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT],
        youtubeVideos: [media.youtubeVideos.length, INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT],
        processedYoutubeKeys: [media.processedYoutubeKeys.length, INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT],
        fandoms: [media.fandoms.length, INDUSTRY_MEDIA_FANDOM_LIMIT],
        campaigns: [media.campaigns.length, INDUSTRY_MEDIA_CAMPAIGN_LIMIT],
        processedFandomKeys: [media.processedFandomKeys.length, INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT],
        claims: [media.claims.length, INDUSTRY_MEDIA_CLAIM_LIMIT],
        processedClaimKeys: [media.processedClaimKeys.length, INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT],
        narratives: [media.narratives.length, INDUSTRY_MEDIA_NARRATIVE_LIMIT],
        mediaRelationships: [media.mediaRelationships.length, INDUSTRY_MEDIA_RELATIONSHIP_LIMIT],
        prInterventions: [media.prInterventions.length, INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT],
        promotionAttributions: [media.promotionAttributions.length, INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT],
        processedC7Keys: [media.processedC7Keys.length, INDUSTRY_MEDIA_C7_KEY_LIMIT],
    };
    Object.entries(collectionBounds).forEach(([name, [actual, limit]]) => {
        assert.ok(actual <= limit, `${regime} ${name} ${actual} exceeds ${limit}`);
    });
    media.stories.forEach(story => story.industryEventIds.forEach(eventId => {
        assert.ok(eventIds.has(eventId), `${regime} story ${story.id} retained orphan event ${eventId}`);
    }));
    media.storyAssignments.forEach(assignment => {
        assert.ok(storyIds.has(assignment.storyId), `${regime} assignment ${assignment.id} retained orphan story`);
    });
    media.claims.forEach(claim => {
        assert.ok(storyIds.has(claim.anchorStoryId), `${regime} claim ${claim.id} retained orphan story`);
    });

    const metrics = {
        regime,
        horizonWeeks,
        runtime: result.runtime,
        finalSaveBytes: result.checkpointSaveBytes[horizonWeeks],
        collections: Object.fromEntries(Object.entries(collectionBounds).map(([name, [actual]]) => [name, actual])),
        storyCategories: histogram(media.stories.map(story => story.category)),
        publishedChannels: histogram(media.stories.flatMap(story => story.publishedChannels)),
        assignmentInstitutions: new Set(media.storyAssignments.map(item => item.institutionId)).size,
        assignmentPersonalities: new Set(media.storyAssignments.flatMap(item => item.personalityId ? [item.personalityId] : [])).size,
        largestInstitutionAssignmentShare: Number(largestShare(media.storyAssignments.map(item => item.institutionId)).toFixed(3)),
        largestPersonalityAssignmentShare: Number(largestShare(media.storyAssignments.flatMap(item => item.personalityId ? [item.personalityId] : [])).toFixed(3)),
        youtubeFormats: histogram(media.youtubeVideos.map(video => video.format)),
        youtubeOutcomes: histogram(media.youtubeVideos.map(video => video.outcome)),
        campaignTypes: histogram(media.campaigns.map(campaign => campaign.type)),
        campaignOutcomes: histogram(media.campaigns.flatMap(campaign => campaign.outcome ? [campaign.outcome] : [])),
        claimKinds: histogram(media.claims.map(claim => claim.kind)),
        claimStatuses: histogram(media.claims.map(claim => claim.status)),
        narrativeThemes: histogram(media.narratives.map(narrative => narrative.theme)),
        narrativeStages: histogram(media.narratives.map(narrative => narrative.stage)),
    };
    reports.push(metrics);
}

// B8's public-event cadence band is a mature-world average. Its original
// evaluator was frozen against 100- and 400-year runs; the first decade has a
// deliberate launch/expansion burst and must not be judged by that ceiling.
if (regimes.length === ALL_REGIMES.length && horizonWeeks >= 5_200) {
    assert.deepEqual(evaluateSharedIndustryB8Experience(experiences).violations, []);
}

if (reportPath) writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(reports, null, 2));
console.log(`C8 industry-media ${horizonWeeks}-week long-run audit passed.`);
