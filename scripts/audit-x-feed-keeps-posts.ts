/** The X feed keeps saved posts, #65 (codex-handoff/plans/platform-tech-plan.md §12: "X feed overwrites
 *  saved posts", Phase 5). Opening X used to replace the saved feed with a fresh one whenever the
 *  player had not posted that week, so the industry media's posts and release reactions never showed,
 *  and the first like saved the fresh feed over them. Checks:
 *  - opening X keeps every saved post and adds the week's chatter once; this week's posts come first;
 *  - once the week's chatter is saved, opening X shows the saved feed as it is;
 *  - a like on the opened feed (what the app saves) keeps every saved post;
 *  - the app renders the media's post ("2h" this week; an older one "1d"), and a post's week reads as
 *    the week of the year whichever way it was stamped. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player, type XPost } from '../types';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { isXPostThisWeek, openXFeed, xPostWeekOfYear } from '../services/xLogic';
import { XApp } from '../views/mobile/XApp';

const post = (id: string, timestamp: number, likes: number, extra: Partial<XPost> = {}): XPost => ({
    id, authorId: 'streamscope', authorName: 'StreamScope', authorHandle: '@StreamScope', authorAvatar: '',
    content: `Post ${id}`, timestamp, likes, retweets: Math.round(likes / 5), replies: Math.round(likes / 20),
    isPlayer: false, isLiked: false, isRetweeted: false, isVerified: true, postType: 'FILM_OPINION', sentiment: 'INDUSTRY', ...extra,
});

function main() {
    const started = performance.now();
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.currentWeek = 18;
    player.age = 31;
    player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
    const nowAbs = getAbsoluteWeek(31, 18);
    const media = post('x_industry_event_now', nowAbs, 800, { content: 'NORTHSTAR+ launches 8K. Rivals are watching.', industryEventId: 'industry_event_now' });
    const reaction = post('x_release_reaction_18', 18, 300, { authorId: 'fan_1', authorName: 'Fan', authorHandle: '@fan', content: 'That finale though' });
    const older = post('x_industry_event_old', getAbsoluteWeek(31, 15), 5000, { content: 'An older story from week 15.', industryEventId: 'industry_event_old' });
    player.x = { ...player.x, lastPostWeek: 0, feed: [media, reaction, older] };

    /* ── opening X ── */
    const opened = openXFeed(player);
    const ids = opened.map(item => item.id);
    for (const saved of [media, reaction, older]) assert.ok(ids.includes(saved.id), `${saved.id} is kept`);
    const chatter = opened.filter(item => item.id.startsWith('x_post_') && !item.isPlayer && item.timestamp === 18);
    assert.ok(chatter.length >= 10, 'The week\'s chatter is added');
    assert.ok(ids.indexOf(older.id) > Math.max(ids.indexOf(media.id), ids.indexOf(reaction.id), ...chatter.map(item => ids.indexOf(item.id))),
        'This week\'s posts first, the older saved one after them');
    const thisWeek = opened.slice(0, ids.indexOf(older.id));
    assert.ok(thisWeek.every((item, index) => index === 0 || thisWeek[index - 1].likes >= item.likes), 'This week\'s posts, most liked first');
    console.log(`PASS open: the saved media post, release reaction and older story are kept; ${chatter.length} chatter posts added; this week's first, the week-15 story after them`);

    /* ── once saved, as it is ── */
    const reopened = openXFeed({ ...player, x: { ...player.x, feed: opened } });
    assert.equal(reopened, opened, 'With this week\'s chatter saved, X opens on the saved feed unchanged');
    console.log('PASS reopen: with the week\'s chatter saved, X opens on the saved feed as it is (no second batch)');

    /* ── the first like saves everything ── */
    const liked = opened.map(item => (item.id === media.id ? { ...item, isLiked: true, likes: item.likes + 1 } : item));
    assert.ok([media, reaction, older].every(saved => liked.some(item => item.id === saved.id)), 'A like keeps every saved post');
    console.log('PASS like: the feed the app saves on a like still holds every saved post');

    /* ── the app ── */
    const markup = renderToStaticMarkup(createElement(XApp, { player, onBack: () => undefined, onUpdatePlayer: () => undefined }));
    assert.match(markup, /NORTHSTAR\+ launches 8K\. Rivals are watching\./, 'The media post shows');
    assert.match(markup, /An older story from week 15\./, 'and the older one');
    assert.match(markup, /@StreamScope · 2h<\/span>[\s\S]*?NORTHSTAR\+ launches 8K/, 'This week\'s media post reads "2h"');
    assert.match(markup, /@StreamScope · 1d<\/span>[\s\S]*?An older story from week 15/, 'An older one "1d"');
    assert.deepEqual([isXPostThisWeek(media, player), isXPostThisWeek(reaction, player), isXPostThisWeek(older, player)], [true, true, false]);
    assert.deepEqual([xPostWeekOfYear(older.timestamp), xPostWeekOfYear(18)], [15, 18], 'Week labels read the week of the year');
    console.log('PASS app: the media posts render ("2h" this week, "1d" before); an absolute-week post is labelled week 15, not week ' + older.timestamp);
    console.log(`done in ${Math.round(performance.now() - started)} ms`);
}

main();
