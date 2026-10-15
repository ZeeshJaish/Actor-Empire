import { INITIAL_PLAYER, Player, ScheduledEvent } from '../types';
import {
    createYoutubeBacklashEvent,
    createYoutubeCopyrightEvent,
    createYoutubeCreatorInviteEvent,
    createYoutubeRivalryEvent
} from '../services/gameLoop';
import { resolveYoutubeEventChoice } from '../services/youtubeEventLogic';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const makePlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.money = 50000;
    player.stats.fame = 55;
    player.stats.reputation = 60;
    player.youtube = {
        ...player.youtube,
        subscribers: 100000,
        totalChannelViews: 1000000,
        audienceTrust: 60,
        fanMood: 60,
        controversy: 30,
        videos: [{
            id: 'youtube_audit_video',
            title: 'Audit Video',
            type: 'VLOG',
            thumbnailColor: 'bg-red-600',
            views: 200000,
            likes: 12000,
            earnings: 4000,
            weekUploaded: player.currentWeek,
            yearUploaded: player.age,
            isPlayer: true,
            authorName: player.name,
            qualityScore: 75,
            controversyScore: 20,
            trustImpact: 0,
            weeklyHistory: [],
            comments: []
        }]
    };
    player.x = {
        ...player.x,
        followers: 25000,
        posts: [],
        feed: []
    };
    return player;
};

const serializeEvent = (event: ScheduledEvent): ScheduledEvent =>
    JSON.parse(JSON.stringify(event)) as ScheduledEvent;

const resolveSerializedChoice = (
    event: ScheduledEvent,
    choiceId: string,
    randomValue = 0.5
) => {
    const serialized = serializeEvent(event);
    const lifeEvent = serialized.data?.lifeEvent;
    const option = lifeEvent?.options?.find((candidate: any) => candidate.id === choiceId);
    assert(option, `Missing serialized option ${choiceId}`);
    assert(typeof option.impact !== 'function', `${choiceId} unexpectedly retained its impact function`);
    assert(serialized.data?.youtubeResolution, `${choiceId} is missing serialized YouTube resolution data`);

    return resolveYoutubeEventChoice(
        makePlayer(),
        serialized.data.youtubeResolution,
        choiceId,
        () => randomValue
    );
};

const acceptClaim = resolveSerializedChoice(
    createYoutubeCopyrightEvent('Audit Video', 1250, 62),
    'ACCEPT_CLAIM'
);
assert(acceptClaim.updatedPlayer.money === 48750, 'Accepting a claim must deduct the stated claim amount');
assert(acceptClaim.updatedPlayer.youtube.audienceTrust === 58, 'Accepting a claim must reduce trust by 2');
assert(acceptClaim.effects?.some(effect => effect.label === 'Cash' && effect.value === '-$1,250'), 'Accepting a claim must return a cash receipt');
assert(acceptClaim.effects?.some(effect => effect.label === 'Audience Trust' && effect.value === '-2'), 'Accepting a claim must return a trust receipt');

const editUpload = resolveSerializedChoice(
    createYoutubeCopyrightEvent('Audit Video', 1250, 62),
    'EDIT_UPLOAD'
);
assert(editUpload.updatedPlayer.money === 49562, 'Editing the upload must charge the reduced editing fee');
assert(editUpload.updatedPlayer.youtube.controversy === 24, 'Editing the upload must lower controversy by 6');
assert(editUpload.effects?.some(effect => effect.label === 'Cash' && effect.value === '-$438'), 'Editing the upload must disclose its fee');

const apology = resolveSerializedChoice(
    createYoutubeBacklashEvent('Audit Video', 80),
    'POST_APOLOGY'
);
assert(apology.updatedPlayer.youtube.audienceTrust === 67, 'Apology must restore trust');
assert(apology.updatedPlayer.youtube.controversy === 18, 'Apology must lower controversy');
assert(apology.effects?.some(effect => effect.label === 'Controversy' && effect.value === '-12'), 'Apology must show its controversy change');

const viralInvite = resolveSerializedChoice(
    createYoutubeCreatorInviteEvent(makePlayer(), 'PODCAST'),
    'CHASE_VIRAL',
    0
);
assert(viralInvite.updatedPlayer.youtube.totalChannelViews > 1000000, 'Viral invite choice must add channel views');
assert(viralInvite.updatedPlayer.youtube.subscribers > 100000, 'Viral invite choice must add subscribers');
assert(viralInvite.effects?.some(effect => effect.label === 'Channel Views'), 'Viral invite choice must show view growth');
assert(viralInvite.effects?.some(effect => effect.label === 'Subscribers'), 'Viral invite choice must show subscriber growth');

const rivalry = createYoutubeRivalryEvent(makePlayer(), () => 0);
const clapBack = resolveSerializedChoice(rivalry, 'CLAP_BACK', 0);
assert(clapBack.updatedPlayer.youtube.audienceTrust === 54, 'Clap back must reduce audience trust');
assert(clapBack.updatedPlayer.youtube.controversy === 46, 'Clap back must increase controversy');
assert(clapBack.updatedPlayer.x.feed.length === 1, 'Clap back must create the promised public reaction');
assert(clapBack.effects?.some(effect => effect.label === 'Audience Trust' && effect.value === '-6'), 'Clap back must show trust damage');
assert(clapBack.effects?.some(effect => effect.label === 'Controversy' && effect.value === '+16'), 'Clap back must show controversy growth');

console.log(JSON.stringify({
    ok: true,
    checks: 21,
    covered: [
        'serialized copyright acceptance',
        'serialized upload edit',
        'serialized backlash apology',
        'serialized creator invite',
        'serialized rivalry'
    ]
}, null, 2));
