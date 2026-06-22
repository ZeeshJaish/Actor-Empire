import {
    EventImpactSignal,
    LegalCase,
    LifeEventImpactResult,
    Player,
    XPost
} from '../types';

export type YoutubeEventResolution =
    | {
        domain: 'YOUTUBE';
        kind: 'COPYRIGHT';
        payload: {
            videoTitle: string;
            claimAmount: number;
            evidenceStrength: number;
        };
    }
    | {
        domain: 'YOUTUBE';
        kind: 'BACKLASH';
        payload: {
            videoTitle: string;
            severity: number;
        };
    }
    | {
        domain: 'YOUTUBE';
        kind: 'CREATOR_INVITE';
        payload: {
            inviteKind: 'PODCAST' | 'CREATOR_GALA' | 'PLATFORM_SUMMIT';
            venue: string;
        };
    }
    | {
        domain: 'YOUTUBE';
        kind: 'RIVALRY';
        payload: {
            rivalName: string;
            baseReach: number;
        };
    };

type RandomSource = () => number;

interface YoutubeImpactSnapshot {
    money: number;
    subscribers: number;
    views: number;
    trust: number;
    mood: number;
    controversy: number;
    fame: number;
    reputation: number;
    xFollowers: number;
    legalCases: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const snapshotYoutubeImpact = (player: Player): YoutubeImpactSnapshot => ({
    money: player.money || 0,
    subscribers: player.youtube?.subscribers || 0,
    views: player.youtube?.totalChannelViews || 0,
    trust: player.youtube?.audienceTrust ?? 55,
    mood: player.youtube?.fanMood ?? 55,
    controversy: player.youtube?.controversy ?? 0,
    fame: player.stats?.fame || 0,
    reputation: player.stats?.reputation || 0,
    xFollowers: player.x?.followers || 0,
    legalCases: player.flags?.activeCases?.length || 0
});

const formatCompactNumber = (value: number): string => {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000) return `${(absolute / 1_000_000).toFixed(absolute >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (absolute >= 1_000) return `${(absolute / 1_000).toFixed(absolute >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
    return absolute.toLocaleString();
};

const signed = (value: number, formatter: (amount: number) => string = amount => amount.toLocaleString()) =>
    `${value > 0 ? '+' : '-'}${formatter(Math.abs(value))}`;

const toneForDelta = (value: number, positiveIsGood = true): EventImpactSignal['tone'] => {
    if (value === 0) return 'neutral';
    return (value > 0) === positiveIsGood ? 'positive' : 'negative';
};

const buildImpactSignals = (
    before: YoutubeImpactSnapshot,
    after: YoutubeImpactSnapshot
): EventImpactSignal[] => {
    const effects: EventImpactSignal[] = [];
    const add = (
        label: string,
        delta: number,
        format: (amount: number) => string = amount => amount.toLocaleString(),
        positiveIsGood = true
    ) => {
        if (!delta) return;
        effects.push({
            label,
            value: signed(delta, format),
            tone: toneForDelta(delta, positiveIsGood)
        });
    };

    add('Cash', after.money - before.money, amount => `$${amount.toLocaleString()}`);
    add('Channel Views', after.views - before.views, formatCompactNumber);
    add('Subscribers', after.subscribers - before.subscribers, formatCompactNumber);
    add('Audience Trust', after.trust - before.trust);
    add('Fan Mood', after.mood - before.mood);
    add('Controversy', after.controversy - before.controversy, amount => amount.toLocaleString(), false);
    add('Fame', after.fame - before.fame);
    add('Reputation', after.reputation - before.reputation);
    add('X Followers', after.xFollowers - before.xFollowers, formatCompactNumber);

    if (after.legalCases > before.legalCases) {
        effects.push({
            label: 'Legal Case',
            value: 'Opened',
            tone: 'negative'
        });
    }

    return effects;
};

const getNextWeekNumber = (week: number): number => week >= 52 ? 1 : week + 1;

const createYoutubeLegalCase = (
    player: Player,
    title: string,
    description: string,
    evidenceStrength: number,
    playerDefense: number,
    random: RandomSource
): LegalCase => ({
    id: `yt_case_${Date.now()}_${random()}`,
    title,
    description,
    weeksRemaining: 0,
    severity: evidenceStrength >= 70 ? 'HIGH' : evidenceStrength >= 50 ? 'MEDIUM' : 'LOW',
    evidence: evidenceStrength,
    currentHearing: 1,
    totalHearings: 2 + Math.floor(random() * 2),
    nextHearingWeek: getNextWeekNumber(player.currentWeek),
    evidenceStrength,
    playerDefense,
    status: 'ACTIVE',
    history: []
});

const createCreatorRivalPost = (
    content: string,
    reach: number,
    rivalName: string,
    random: RandomSource
): XPost => ({
    id: `x_yt_rival_${Date.now()}_${random()}`,
    authorId: `rival_${rivalName.toLowerCase().replace(/\s+/g, '_')}`,
    authorName: rivalName,
    authorHandle: `@${rivalName.toLowerCase().replace(/\s+/g, '')}`,
    authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(rivalName)}`,
    content,
    timestamp: Date.now(),
    likes: Math.max(80, Math.floor(reach * 0.05)),
    retweets: Math.max(10, Math.floor(reach * 0.012)),
    replies: Math.max(8, Math.floor(reach * 0.01)),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true
});

const ensureYoutubeState = (player: Player) => {
    if (!player.youtube) throw new Error('YouTube state is unavailable');
    if (!Array.isArray(player.youtube.videos)) player.youtube.videos = [];
    if (!player.x) {
        player.x = {
            handle: `@${player.name.replace(/\s+/g, '').toLowerCase()}`,
            followers: 0,
            posts: [],
            feed: [],
            lastPostWeek: 0
        };
    }
    if (!Array.isArray(player.x.feed)) player.x.feed = [];
    if (!Array.isArray(player.news)) player.news = [];
    if (!player.flags) player.flags = {};
    if (!Array.isArray(player.flags.activeCases)) player.flags.activeCases = [];
};

const resolveCopyrightChoice = (
    player: Player,
    resolution: Extract<YoutubeEventResolution, { kind: 'COPYRIGHT' }>,
    choiceId: string,
    random: RandomSource
): string => {
    const { videoTitle, claimAmount, evidenceStrength } = resolution.payload;

    switch (choiceId) {
        case 'ACCEPT_CLAIM':
            player.money -= claimAmount;
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) - 2);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 2);
            return `You accepted the claim and paid $${claimAmount.toLocaleString()}. The dispute is closed.`;
        case 'EDIT_UPLOAD': {
            const editingFee = Math.max(100, Math.round(claimAmount * 0.35));
            player.money -= editingFee;
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) - 1);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 6);
            const video = player.youtube.videos.find(candidate => candidate.title === videoTitle);
            if (video) {
                video.comments = ['The disputed segment was removed quietly.', ...(video.comments || [])].slice(0, 5);
            }
            return `You removed the disputed segment and paid $${editingFee.toLocaleString()} in editing and review costs. The claim ended quietly.`;
        }
        case 'DISPUTE_CLAIM': {
            const defenseScore = (player.stats.reputation * 0.45)
                + ((player.youtube.audienceTrust ?? 55) * 0.35)
                + random() * 35;
            if (defenseScore > evidenceStrength + 18) {
                player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 4);
                player.stats.reputation = clamp(player.stats.reputation + 2);
                return 'You disputed the claim and won. Fans praised you for defending the channel.';
            }

            player.flags.activeCases!.push(createYoutubeLegalCase(
                player,
                'YouTube Copyright Dispute',
                `A copyright holder escalated the claim around "${videoTitle}".`,
                evidenceStrength,
                Math.floor(defenseScore),
                random
            ));
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) + 8);
            player.news.unshift({
                id: `news_yt_copyright_case_${Date.now()}`,
                headline: `${player.name} faces a copyright dispute over a YouTube upload.`,
                subtext: 'The creator side of fame just got legally messy.',
                category: 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM'
            });
            player.news = player.news.slice(0, 50);
            return 'The dispute escalated into a legal case. A hearing has been scheduled.';
        }
        case 'GOLDEN_LEGAL': {
            const video = player.youtube.videos.find(candidate => candidate.title === videoTitle);
            if (video) {
                const recoveredViews = Math.floor(Math.max(750, video.views * 0.08));
                video.views += recoveredViews;
                video.likes += Math.floor(recoveredViews * 0.05);
                video.comments = ['The claim was handled professionally.', ...(video.comments || [])].slice(0, 5);
                player.youtube.totalChannelViews += recoveredViews;
            }
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 5);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 2);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 10);
            player.stats.reputation = clamp(player.stats.reputation + 2);
            return 'Your legal team cleared the claim before it damaged the channel.';
        }
        default:
            throw new Error(`Unknown copyright choice: ${choiceId}`);
    }
};

const resolveBacklashChoice = (
    player: Player,
    resolution: Extract<YoutubeEventResolution, { kind: 'BACKLASH' }>,
    choiceId: string,
    random: RandomSource
): string => {
    const { videoTitle, severity } = resolution.payload;

    switch (choiceId) {
        case 'POST_APOLOGY':
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 7);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 3);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 12);
            player.stats.reputation = clamp(player.stats.reputation + 1);
            return 'You posted a grounded apology. The heat cooled before it became a career fire.';
        case 'PR_TEAM': {
            const recoveryViews = Math.floor(Math.max(1200, player.youtube.subscribers * (0.05 + random() * 0.08)));
            const video = player.youtube.videos.find(candidate => candidate.title === videoTitle);
            if (video) {
                video.views += recoveryViews;
                video.likes += Math.floor(recoveryViews * 0.06);
                video.comments = ['This response actually felt mature.', ...(video.comments || [])].slice(0, 5);
            }
            player.youtube.totalChannelViews += recoveryViews;
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 9);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 5);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 16);
            player.stats.reputation = clamp(player.stats.reputation + 3);
            return `Your PR team turned the backlash into a mature comeback and recovered ${recoveryViews.toLocaleString()} views.`;
        }
        case 'DOUBLE_DOWN': {
            const spikeViews = Math.floor(Math.max(1000, player.youtube.subscribers * (0.08 + random() * 0.14)));
            const video = player.youtube.videos.find(candidate => candidate.title === videoTitle);
            if (video) {
                video.views += spikeViews;
                video.likes += Math.floor(spikeViews * 0.035);
                video.comments = ['This response made everything louder.', ...(video.comments || [])].slice(0, 5);
            }
            player.youtube.totalChannelViews += spikeViews;
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) - 2);
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) - 8);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) + 15);
            player.stats.fame = clamp(player.stats.fame + 1);

            if (severity >= 72 || random() < 0.25) {
                player.flags.activeCases!.push(createYoutubeLegalCase(
                    player,
                    'Creator Backlash Defamation Case',
                    `A public response to backlash around "${videoTitle}" triggered a legal complaint.`,
                    55 + Math.floor(random() * 25),
                    Math.floor((player.stats.reputation * 0.35) + random() * 30),
                    random
                ));
                return `You gained ${spikeViews.toLocaleString()} views by doubling down, but the backlash became a legal complaint.`;
            }
            return `You gained ${spikeViews.toLocaleString()} views by doubling down, but audience trust took a hit.`;
        }
        default:
            throw new Error(`Unknown backlash choice: ${choiceId}`);
    }
};

const resolveCreatorInviteChoice = (
    player: Player,
    resolution: Extract<YoutubeEventResolution, { kind: 'CREATOR_INVITE' }>,
    choiceId: string,
    random: RandomSource
): string => {
    const { inviteKind, venue } = resolution.payload;

    switch (choiceId) {
        case 'STEADY_NETWORK':
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 6);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 4);
            player.stats.reputation = clamp(player.stats.reputation + 3);
            player.x.followers += inviteKind === 'PLATFORM_SUMMIT' ? 12000 : 6000;
            return `${venue} became a clean creator reputation win.`;
        case 'CHASE_VIRAL': {
            const bonusViews = Math.floor(Math.max(15000, player.youtube.subscribers * (0.18 + random() * 0.25)));
            player.youtube.totalChannelViews += bonusViews;
            player.youtube.subscribers += Math.floor(bonusViews / 120);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 5);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) + 12);
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) - 4);
            player.stats.fame = clamp(player.stats.fame + 3);
            player.x.followers += Math.floor(bonusViews * 0.02);
            return `${venue} gave you a viral creator spike with ${bonusViews.toLocaleString()} new channel views.`;
        }
        case 'GOLDEN_HANDLER': {
            const bonusViews = Math.floor(Math.max(22000, player.youtube.subscribers * (0.22 + random() * 0.25)));
            player.youtube.totalChannelViews += bonusViews;
            player.youtube.subscribers += Math.floor(bonusViews / 95);
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 8);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 6);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 8);
            player.stats.reputation = clamp(player.stats.reputation + 4);
            player.x.followers += Math.floor(bonusViews * 0.025);
            return `Your team turned ${venue} into a controlled creator win with ${bonusViews.toLocaleString()} new views.`;
        }
        default:
            throw new Error(`Unknown creator invite choice: ${choiceId}`);
    }
};

const resolveRivalryChoice = (
    player: Player,
    resolution: Extract<YoutubeEventResolution, { kind: 'RIVALRY' }>,
    choiceId: string,
    random: RandomSource
): string => {
    const { rivalName, baseReach } = resolution.payload;

    switch (choiceId) {
        case 'IGNORE_BAIT':
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 3);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) - 1);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 5);
            player.x.feed.unshift(createCreatorRivalPost(
                `${player.name} refusing to feed the ${rivalName} drama is... annoyingly mature.`,
                baseReach,
                'Creator Watch',
                random
            ));
            player.x.feed = player.x.feed.slice(0, 50);
            return `You ignored ${rivalName}'s bait. The channel stayed cleaner, but the moment lost some energy.`;
        case 'CLAP_BACK': {
            const bonusViews = Math.floor(baseReach * (0.65 + random() * 0.55));
            const bonusSubs = Math.floor(bonusViews / 110);
            player.youtube.totalChannelViews += bonusViews;
            player.youtube.subscribers += bonusSubs;
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 5);
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) - 6);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) + 16);
            player.stats.fame = clamp(player.stats.fame + 2);
            player.stats.reputation = clamp(player.stats.reputation - 2);
            player.x.followers += Math.floor(bonusViews * 0.015);
            player.x.feed.unshift(createCreatorRivalPost(
                `${player.name} just answered ${rivalName} and the timeline is on fire.`,
                bonusViews,
                'Creator Watch',
                random
            ));
            player.x.feed = player.x.feed.slice(0, 50);
            return `You clapped back at ${rivalName}. The response gained ${bonusViews.toLocaleString()} views and ${bonusSubs.toLocaleString()} subscribers, but raised the heat.`;
        }
        case 'MEDIATED_COLLAB': {
            const bonusViews = Math.floor(baseReach * (0.85 + random() * 0.75));
            player.youtube.totalChannelViews += bonusViews;
            player.youtube.subscribers += Math.floor(bonusViews / 90);
            player.youtube.audienceTrust = clamp((player.youtube.audienceTrust ?? 55) + 8);
            player.youtube.fanMood = clamp((player.youtube.fanMood ?? 55) + 8);
            player.youtube.controversy = clamp((player.youtube.controversy ?? 0) - 12);
            player.stats.reputation = clamp(player.stats.reputation + 5);
            player.x.feed.unshift(createCreatorRivalPost(
                `${player.name} and ${rivalName} turned beef into a polished collab. That is career control.`,
                bonusViews,
                'Creator Watch',
                random
            ));
            player.x.feed = player.x.feed.slice(0, 50);
            return `You turned ${rivalName}'s feud into a controlled hit collaboration with ${bonusViews.toLocaleString()} new views.`;
        }
        default:
            throw new Error(`Unknown rivalry choice: ${choiceId}`);
    }
};

export const resolveYoutubeEventChoice = (
    player: Player,
    resolution: YoutubeEventResolution,
    choiceId: string,
    random: RandomSource = Math.random
): LifeEventImpactResult => {
    if (!resolution || resolution.domain !== 'YOUTUBE') {
        throw new Error('Invalid YouTube event resolution');
    }

    ensureYoutubeState(player);
    const before = snapshotYoutubeImpact(player);
    let log = '';

    switch (resolution.kind) {
        case 'COPYRIGHT':
            log = resolveCopyrightChoice(player, resolution, choiceId, random);
            break;
        case 'BACKLASH':
            log = resolveBacklashChoice(player, resolution, choiceId, random);
            break;
        case 'CREATOR_INVITE':
            log = resolveCreatorInviteChoice(player, resolution, choiceId, random);
            break;
        case 'RIVALRY':
            log = resolveRivalryChoice(player, resolution, choiceId, random);
            break;
    }

    return {
        updatedPlayer: player,
        log,
        effects: buildImpactSignals(before, snapshotYoutubeImpact(player))
    };
};
