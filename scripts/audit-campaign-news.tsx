/** #149 (plan §20.10 point 6): campaigns in the news, on the full test company over a real week.
 *  - a big moment is a HIGH story the week after its night: News, X and Instagram, each carrying the campaign's
 *    picture, and two fans' posts in their own words (two different fans), the first with the picture;
 *  - a famous screen taken over without a big moment: a MEDIUM fact with its fans' posts;
 *  - a plain campaign makes no story; the next pass is quiet (each thing is said once); an old save makes no stories
 *    of its history;
 *  - a campaign that ends with 100,000 joins or more: a MEDIUM fact with its joins and cost per join; below, nothing;
 *  - the campaign keeps what each country brought (the sum is its weeks' joins) and its picture's id through a save;
 *  - its page finds its story and posts (the editorial X post and the fans') and lists them under In the news.
 * #161 (plan §20.14): every campaign is talked about by what it ran: its first week's story and posts in its loudest
 * format's own words and voices (a feed, a TV spot, a wrapped train, creators, flyers, search), a photo on Instagram for
 * what is seen in the street, the crowd at a big night; mid-run talk or fatigue (all-out or long); a dear result
 * criticised, a good one celebrated; a campaign's MEDIUM story is News, its people's posts are on X. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processIndustryWorldWeek } from '../services/industryWorld';
import { CITY_SCREEN_SITES, LANDMARK_SITES } from '../services/campaigns/campaignFormats';
import { normalizeCampaignBook } from '../services/campaigns/campaignBook';
import { startStreamingCampaign, streamingCampaignBook, streamingCampaignMarkets, streamingCampaignSubjects } from '../services/campaigns/streamingCampaigns';
import { collectStreamingCampaignNews, colourWord, streamingCampaignStories } from '../services/campaigns/streamingCampaignNews';
import { COMMENT_BANK, FORMAT_REACTIONS, REACTION_VOICES, REPLY_BANK, SHARE_REACTIONS, fillReaction } from '../services/campaigns/campaignReactions';
import type { Campaign, CampaignFormatId } from '../types';
import { CampaignPage } from '../components/campaigns/studio/CampaignPage';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign News Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const restEnergy = (player: Player): Player => ({ ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } });
const PICTURE = 'campaign_creative_audit_picture';
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, '\'').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('campaign-news'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = restEnergy((await processGameWeek(player)).player);
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);
    const identity = player.ownedStreamingPlatform.identity;
    const service = identity.name;
    const markets = streamingCampaignMarkets(player);
    const landmark = markets.has('AE') ? 'AE' : [...markets.keys()].find(countryId => countryId in LANDMARK_SITES)!;
    const screen = [...markets.keys()].find(countryId => countryId in CITY_SCREEN_SITES)!;
    assert.ok(landmark && screen, 'The test company is live where there is a landmark and a famous screen');
    const title = streamingCampaignSubjects(player).find(item => item.kind === 'TITLE')!;
    const serviceId = streamingCampaignSubjects(player).find(item => item.kind === 'SERVICE')!.id;

    /* ── three campaigns: a big moment, a famous screen, a plain one ── */
    const launch = (draft: Parameters<typeof startStreamingCampaign>[1]) => {
        const result = startStreamingCampaign(player, draft);
        assert.ok(result.ok && result.campaignId, `${draft.name} launches: ${result.problems.join(', ')}`);
        player = result.player;
        return result.campaignId!;
    };
    const momentId = launch({ name: title.name, subject: { kind: 'TITLE', id: title.id }, where: { kind: 'COUNTRIES', countryIds: [landmark] },
        formats: ['LANDMARK_LIGHT_SHOW', 'SOCIAL_FEED'], budget: { kind: 'BURST', total: 9_000_000, weeks: 2 }, pictureMediaId: PICTURE });
    const screenId = launch({ name: `${service} screens`, subject: { kind: 'SERVICE', id: serviceId }, where: { kind: 'COUNTRIES', countryIds: [screen] },
        formats: ['CITY_SCREEN'], budget: { kind: 'BURST', total: 4_000_000, weeks: 2 } });
    const plainId = launch({ name: `${service} feeds`, subject: { kind: 'SERVICE', id: serviceId }, where: { kind: 'LIVE' },
        formats: ['SOCIAL_FEED'], budget: { kind: 'BURST', total: 2_000_000, weeks: 2 } });
    player = restEnergy((await processGameWeek(player)).player);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const book = streamingCampaignBook(player.ownedStreamingPlatform);
    const moment = book.campaigns.find(item => item.id === momentId)!;
    assert.equal(moment.pictureMediaId, PICTURE, 'The campaign keeps its picture\'s id');
    book.campaigns.forEach(campaign => {
        const fromCountries = Object.values(campaign.byCountry || {}).reduce((sum, row) => sum + row.joins, 0);
        const fromWeeks = campaign.weeks.reduce((sum, item) => sum + item.joins, 0);
        assert.equal(fromCountries, fromWeeks, `${campaign.name}: its countries' joins add up to its weeks'`);
        assert.ok(Object.keys(campaign.byCountry || {}).every(id => campaign.countryIds.includes(id)), 'Only its own countries');
    });
    const saved = normalizeCampaignBook(JSON.parse(JSON.stringify(book)));
    assert.deepEqual(saved.campaigns.find(item => item.id === momentId)!.byCountry, moment.byCountry, 'Its countries survive a save');
    assert.equal(saved.campaigns.find(item => item.id === momentId)!.pictureMediaId, PICTURE, 'and its picture');
    const plain = book.campaigns.find(item => item.id === plainId)!;
    console.log(`PASS week ${week}: three campaigns ran; by country adds up (the feeds campaign: ${Object.keys(plain.byCountry || {}).length} countries, +${plain.weeks.reduce((sum, item) => sum + item.joins, 0).toLocaleString()} joins)`);

    /* ── the next week's industry pass ── */
    const pass = processIndustryWorldWeek(player, player.world, week + 1);
    const facts = pass.world.industryEvents!.events.filter(fact => fact.type === 'PLATFORM_CAMPAIGN_MOMENT' && fact.absoluteWeek === week + 1);
    const momentFact = facts.find(fact => fact.idempotencyKey.includes(momentId))!;
    const screenFact = facts.find(fact => fact.idempotencyKey.includes(screenId))!;
    const site = LANDMARK_SITES[landmark];
    assert.ok(momentFact && screenFact, 'The big moment and the famous screen are facts');
    /* #161: a plain campaign is talked about too, in its own format's words */
    const plainFact = facts.find(fact => fact.idempotencyKey.endsWith(`${plainId}:launch`));
    assert.deepEqual([plainFact?.importance, plainFact?.headline], ['MEDIUM', `${service} is all over people's feeds`], 'A feeds campaign: its first week\'s story');
    assert.deepEqual([momentFact.importance, momentFact.headline, momentFact.imageMediaId, momentFact.projectId],
        ['HIGH', `The ${site} lit up for ${title.name}`, PICTURE, title.id], 'The light show: HIGH, its landmark, its picture, its title');
    assert.deepEqual([screenFact.importance, screenFact.headline], ['MEDIUM', `${service} takes over ${CITY_SCREEN_SITES[screen]}`], 'The famous screen: MEDIUM');
    const news = pass.player.news.find(item => item.id === `news_${momentFact.id}`);
    const xPost = pass.player.x.feed.find(item => item.id === `x_${momentFact.id}`);
    const instagram = pass.player.instagram.feed.find(item => item.id === `instagram_${momentFact.id}`);
    assert.ok(news && xPost && instagram, 'The big moment is in the News, on X and on Instagram');
    assert.equal(news!.category, 'TOP_STORY', 'as a top story');
    assert.deepEqual([news!.imageMediaId, xPost!.contentMediaId, instagram!.contentMediaId], [PICTURE, PICTURE, PICTURE], 'each with the campaign\'s picture');
    const buzz = (id: string) => [0, 1].map(index => pass.player.x.feed.find(item => item.id === `x_campaign_buzz_${id}_${index}`));
    const [first, second] = buzz(momentId);
    assert.ok(first && second && first.authorHandle !== second.authorHandle, 'Two different fans post about the light show');
    assert.equal(first!.content, `The ${site} is wearing ${service} ${colourWord(identity.primaryColor)} tonight`, 'in their own words');
    assert.equal(first!.contentMediaId, PICTURE, 'the first with the picture');
    assert.ok(buzz(screenId).every(Boolean) && buzz(screenId)[0]!.content === `Spotted: ${service} all over ${CITY_SCREEN_SITES[screen]}`, 'and about the famous screen');
    assert.ok(!buzz(plainId).some(Boolean), 'The plain campaign has no night\'s fans');
    /* #161: its people's posts, in the feed's words; the big night's crowd; the night's photo on Instagram */
    const plainPosts = [0, 1].map(index => pass.player.x.feed.find(item => item.id === `x_campaign_launch_${plainId}_${index}`));
    assert.deepEqual(plainPosts.map(post => post?.content), FORMAT_REACTIONS.SOCIAL_FEED.posts.slice(0, 2).map(line => fillReaction(line.own ?? line.text, { name: service, service })), 'The feeds campaign\'s posts (its own words: the service says its name once)');
    assert.ok(plainPosts.every(post => post?.industryEventId === plainFact!.id), 'naming its story');
    const crowd = pass.player.x.feed.find(item => item.id === `x_campaign_crowd_${momentId}_0`);
    assert.equal(crowd?.content, fillReaction(FORMAT_REACTIONS.SOCIAL_FEED.posts[0].text, { name: title.name, service }), 'The light show\'s crowd, in its feed\'s words');
    const photo = pass.player.instagram.feed.find(item => item.id === `instagram_campaign_${momentId}`);
    assert.ok(photo && photo.contentMediaId === PICTURE && photo.caption.endsWith('📸'), 'A photo of the night on Instagram');
    /* #162: with comments from the night, and replies under every post on X */
    const nightComments = COMMENT_BANK.NIGHT.map(comment => fillReaction(comment, { name: title.name, service }));
    assert.ok(photo!.commentList?.length === 5 && photo!.commentList.every(comment => nightComments.includes(comment)), `its comments: ${photo!.commentList?.join(' / ')}`);
    assert.ok([...plainPosts, crowd, first, second].every(post => post?.replyList?.length === 3), 'Every post on X has its replies, the night\'s fans\' too');
    assert.ok([...plainPosts, crowd].every(post => post?.quoteList?.length === 1), 'and a quote');
    /* #162: two of the player's campaigns make the News the same week, beside the week's public stories */
    const campaignNews = pass.player.news.filter(item => facts.some(fact => `news_${fact.id}` === item.id));
    assert.equal(campaignNews.length, 2, `Two campaign stories in the News: ${campaignNews.map(item => item.headline).join(' | ')}`);
    console.log(`PASS news: "${news!.headline}" (${news!.sourceName}), a top story with its picture on News, X and Instagram; fans: "${first!.content}" / "${second!.content}"`);
    console.log(`  and "${screenFact.headline}" (MEDIUM); fans: "${buzz(screenId)[0]!.content}"`);

    /* ── its page lists them ── */
    const stories = streamingCampaignStories(pass.player, momentId);
    assert.ok(stories.some(item => item.kind === 'NEWS' && item.text === news!.headline && item.imageMediaId === PICTURE), 'Its page finds its story, with the picture');
    assert.ok(stories.filter(item => item.kind === 'X').length >= 3 && stories.some(item => item.kind === 'INSTAGRAM'), 'its X posts (the editorial one and the two fans\') and its Instagram post');
    assert.ok(streamingCampaignStories(pass.player, plainId).filter(item => item.kind === 'X').length >= 2, '#161: a plain campaign\'s page has its people\'s posts');
    const pageCampaign = streamingCampaignBook(pass.player.ownedStreamingPlatform).campaigns.find(item => item.id === momentId)!;
    const page = text(renderToStaticMarkup(<CampaignPage campaign={pageCampaign} week={week + 1} accent="#3b82f6" grade={null} awareness={{}} news={stories}
        creative={{ title: title.name, service, hue: 120, brandHue: 212, kind: 'TITLE', art: null }}
        onClose={() => undefined} onStop={() => undefined} onTopUp={() => undefined} onRunAgain={() => undefined} onLive={() => undefined} />));
    assert.ok(page.includes('In the news') && page.includes(news!.headline) && page.includes(first!.content), 'Its page shows them under In the news');
    assert.ok(page.includes(`${LANDMARK_SITES[landmark]},`) && page.includes('Landmark light show'), 'and its placements name the landmark');
    console.log(`PASS page: ${stories.length} stories and posts under In the news (${stories.map(item => item.kind).join(', ')}); the light show placed at ${LANDMARK_SITES[landmark]}`);

    /* ── said once; no stories of a save's history ── */
    const again = processIndustryWorldWeek(pass.player, pass.world, week + 2);
    assert.equal(again.world.industryEvents!.events.filter(fact => fact.type === 'PLATFORM_CAMPAIGN_MOMENT' && fact.absoluteWeek === week + 2).length, 0, 'The next pass is quiet');
    assert.equal(collectStreamingCampaignNews(player, 0, week + 6).facts.length, 0, 'A pass weeks later says nothing of them');

    /* ── a big result, and a small one ── */
    const ended = (joins: number): Player => ({
        ...player,
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            campaignBook: {
                ...book,
                campaigns: book.campaigns.map(item => (item.id === plainId ? {
                    ...item, status: 'FINISHED' as const, endReason: 'DONE' as const, endedAtAbsoluteWeek: week, spent: 12_000_000,
                    weeks: item.weeks.map(row => ({ ...row, joins })),
                } : item)),
            },
        },
    });
    const big = collectStreamingCampaignNews(ended(150_000), week, week + 1).facts.find(fact => fact.idempotencyKey.endsWith(`${plainId}:result`));
    assert.ok(big, 'A campaign that ends with 150K joins is news');
    assert.deepEqual([big!.importance, big!.headline], ['MEDIUM', `${service}'s own campaign brought 150K new members`]);
    assert.ok(big!.detail.includes('about $80 a member'), `its cost per join: ${big!.detail}`);
    assert.equal(collectStreamingCampaignNews(ended(90_000), week, week + 1).facts.filter(fact => fact.idempotencyKey.endsWith(':result')).length, 0, 'One with 90K is not');
    console.log(`PASS results: "${big!.headline}" — ${big!.detail}; 90K makes no story`);

    /* ── #161: each type its own response ── */
    const template = book.campaigns.find(item => item.id === plainId)!;
    const homes = (countryId: string) => player.world.worldAudienceParticipation?.countries?.[countryId]?.streamingReachableHouseholds || 0;
    const weekRow = (at: number) => ({ absoluteWeek: at, spend: 1_000_000, reach: 1, awareness: 0.01, joins: 100, viewers: 0 });
    const withCampaigns = (campaigns: Campaign[]): Player => ({ ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, campaignBook: { ...book, campaigns } } });
    const typed = (formats: CampaignFormatId[], id: string): Campaign => ({ ...template, id, formats, weeks: [weekRow(week)], status: 'RUNNING', endedAtAbsoluteWeek: null, pictureMediaId: PICTURE });
    const kinds: CampaignFormatId[][] = [['TV_SPOTS'], ['METRO_WRAP'], ['CREATORS'], ['FLYERS'], ['SEARCH']];
    const typedNews = collectStreamingCampaignNews(withCampaigns(kinds.map((formats, index) => typed(formats, `typed_${index}`))), week, week + 1);
    const heads = kinds.map((formats, index) => typedNews.facts.find(fact => fact.idempotencyKey.endsWith(`typed_${index}:launch`))?.headline);
    assert.ok(heads.every(Boolean) && new Set(heads).size === kinds.length, `Each type its own story: ${heads.join(' | ')}`);
    const firstPost = (index: number) => typedNews.buzz.find(post => post.id === `x_campaign_launch_typed_${index}_0`)!;
    const biggest = [...template.countryIds].sort((left, right) => homes(right) - homes(left) || left.localeCompare(right))[0];
    assert.ok(heads[1]!.includes('trains') && firstPost(1).content.includes('The whole train is'), 'A wrapped train: commuters on the train');
    assert.ok(REACTION_VOICES.CREATOR.some(voice => voice.handle === firstPost(2).authorHandle) && firstPost(2).content.includes('#ad'), 'Creators: a creator\'s sponsored review');
    assert.ok(typedNews.buzz.some(post => post.id.startsWith('x_campaign_launch_typed_3_') && post.sentiment === 'MESSY'), 'Flyers: and the litter');
    assert.ok(firstPost(4).isVerified && REACTION_VOICES.TRADE.some(voice => voice.handle === firstPost(4).authorHandle), 'Search: only the trade notices');
    assert.ok(typedNews.buzz.filter(post => post.id.startsWith('x_campaign_launch_typed_0_')).length === 2 && firstPost(0).likes > firstPost(3).likes, 'Two people each; TV spots carry further than flyers');
    assert.ok(typedNews.insta.some(post => post.id === 'instagram_campaign_typed_1' && post.contentMediaId === PICTURE)
        && !typedNews.insta.some(post => post.id === 'instagram_campaign_typed_4'), 'A wrapped train is photographed; a search ad is not');
    /* #162: a TV campaign's ad is shared on Instagram with its picture and comments; the train's photo has street comments */
    const tvShare = typedNews.insta.find(post => post.id === 'instagram_campaign_typed_0');
    const adComments = COMMENT_BANK.AD.map(comment => fillReaction(comment, { name: service, service }));
    const streetComments = COMMENT_BANK.STREET.map(comment => fillReaction(comment, { name: service, service }));
    assert.ok(tvShare && tvShare.contentMediaId === PICTURE && tvShare.caption === fillReaction(SHARE_REACTIONS.TV_SPOTS!.own!, { name: service, service })
        && tvShare.commentList?.length === 5 && tvShare.commentList.every(comment => adComments.includes(comment)), `The TV ad shared: "${tvShare?.caption}" — ${tvShare?.commentList?.join(' / ')}`);
    const trainPhoto = typedNews.insta.find(post => post.id === 'instagram_campaign_typed_1')!;
    assert.ok(trainPhoto.commentList?.every(comment => streetComments.includes(comment)), 'The train photo: street comments');
    assert.equal(firstPost(0).contentMediaId, PICTURE, 'On X, the TV ad screenshotted with its picture');
    const flyerDown = typedNews.buzz.find(post => post.id.startsWith('x_campaign_launch_typed_3_') && post.sentiment === 'MESSY')!;
    const downReplies = REPLY_BANK.DOWN.map(reply => fillReaction(reply, { name: service, service }));
    assert.ok(typedNews.buzz.every(post => post.replyList?.length === 3) && flyerDown.replyList!.every(reply => downReplies.includes(reply)), 'Replies in the post\'s own mood: the litter complaint gets agreement');
    assert.ok(Boolean(biggest) && new RegExp(`^${service.replace(/[+]/g, '\\+')} wraps .+'s trains$`).test(heads[1]!), 'in its biggest country\'s city, the service named once');
    /* the same campaign for a title names the title and the service */
    const forTitle = collectStreamingCampaignNews(withCampaigns([{ ...typed(['METRO_WRAP'], 'titled'), subject: { kind: 'TITLE', id: title.id, name: title.name, projectIds: [title.id] } }]), week, week + 1);
    assert.ok(forTitle.facts.some(fact => fact.idempotencyKey.endsWith('titled:launch') && fact.headline.endsWith(`'s trains in ${title.name}`)), 'For a title: its trains carry the title');
    const allHeads = typedNews.facts.map(fact => fact.headline);
    assert.ok(allHeads.every(head => head.split(service).length <= 2), `The service named once in each own story: ${allHeads.join(' | ')}`);
    /* mid-run: talked about; all-out or long: tired of it */
    const midRun = (budget: Campaign['budget'], id: string): Campaign => ({ ...template, id, formats: ['SOCIAL_FEED'], budget, status: 'RUNNING', endedAtAbsoluteWeek: null,
        weeks: [weekRow(week - 2), weekRow(week - 1), weekRow(week)] });
    const middle = collectStreamingCampaignNews(withCampaigns([midRun({ kind: 'WEEKS', weeks: 4, strength: 1 }, 'steady'), midRun({ kind: 'WEEKS', weeks: 6, strength: 2 }, 'allout')]), week, week + 1);
    const talk = middle.facts.find(fact => fact.idempotencyKey.endsWith('steady:mid'));
    const tired = middle.facts.find(fact => fact.idempotencyKey.endsWith('allout:fatigue'));
    assert.ok(talk?.importance === 'LOW' && middle.buzz.filter(post => post.id.startsWith('x_campaign_mid_steady_')).every(post => post.sentiment === 'SUPPORTIVE'), 'Normal, mid-run: still talked about');
    assert.ok(tired?.importance === 'MEDIUM' && tired.headline === `Viewers tire of ${service}'s ads`
        && middle.buzz.filter(post => post.id.startsWith('x_campaign_fatigue_allout_')).length === 2, 'All-out: people tire of it, a story');
    /* its end: a dear one criticised */
    const dear = collectStreamingCampaignNews(ended(10_000), week, week + 1);
    const flop = dear.facts.find(fact => fact.idempotencyKey.endsWith(`${plainId}:flop`));
    assert.ok(flop && flop.importance === 'MEDIUM' && flop.headline === `${service}'s own campaign falls flat` && flop.detail === '$12.0M over 1 week brought 10K new members: about $1,200 each.', `A dear one criticised: ${flop?.detail}`);
    assert.ok(dear.buzz.some(post => post.id === `x_campaign_flop_${plainId}_0` && post.isVerified), 'by the trade');
    const celebrated = collectStreamingCampaignNews(ended(150_000), week, week + 1).buzz.filter(post => post.id.startsWith(`x_campaign_result_${plainId}_`));
    assert.equal(celebrated.length, 2, 'A good one celebrated');
    /* a campaign's MEDIUM story is News; its people's posts carry it on X */
    const alone = withCampaigns([typed(['TV_SPOTS'], 'alone')]);
    const alonePass = processIndustryWorldWeek(alone, alone.world, week + 1);
    const aloneFact = alonePass.world.industryEvents!.events.find(fact => fact.idempotencyKey.endsWith('alone:launch'))!;
    const aloneNews = alonePass.player.news.find(item => item.id === `news_${aloneFact.id}`);
    assert.ok(aloneNews && aloneNews.category === 'INDUSTRY', 'A MEDIUM campaign story is in the News');
    assert.ok(alonePass.player.x.feed.some(post => post.id === 'x_campaign_launch_alone_0'), 'and its people\'s posts on X');
    console.log(`PASS #161 by type: ${heads.map((head, index) => `${kinds[index][0]} "${head}"`).join('; ')}`);
    console.log(`PASS #162 comments: the TV ad on Instagram "${tvShare!.caption}" — ${tvShare!.commentList!.join(' / ')}; the train photo — ${trainPhoto.commentList!.join(' / ')}; the litter post's replies — ${flyerDown.replyList!.join(' / ')}`);
    console.log(`  first posts: ${[0, 1, 2, 3, 4].map(index => `"${firstPost(index).content}" (${firstPost(index).authorHandle})`).join(' · ')}`);
    console.log(`  mid-run: "${talk!.headline}" (LOW) / all-out: "${tired!.headline}" (MEDIUM); a dear end: "${flop!.headline}" — ${flop!.detail}; a MEDIUM story in the News: "${aloneNews!.headline}"`);
    console.log(`campaign news audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
