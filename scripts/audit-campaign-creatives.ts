/** #148 (plan §20.10 point 5): a campaign's creatives.
 *  - every format that shows an image has a named frame; search ads and a drone show have none;
 *  - a campaign asks for one creative per frame, widest first, and an upload is written against each of the frame's
 *    formats;
 *  - the crop: the shown part always has the frame's shape and stays inside the picture, at any zoom and after any
 *    drag; zoom 1 just covers the frame;
 *  - a kept creative is 1600 px on its long side, never larger than the part of the picture it came from; a
 *    made-for-you one 1200 px, its short side at least 200;
 *  - launched on the full test company, a campaign keeps the creatives of its own image formats only, and a saved
 *    book keeps them (a malformed one is dropped). */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type CampaignFormatId, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER } from '../services/campaigns/campaignFormats';
import { normalizeCampaignBook } from '../services/campaigns/campaignBook';
import { startStreamingCampaign, streamingCampaignBook, streamingCampaignRegions, streamingCampaignSubjects } from '../services/campaigns/streamingCampaigns';
import {
    CREATIVE_LONG_SIDE,
    NO_IMAGE_LINE,
    clampCrop,
    creativeFramesOf,
    creativeIdsFor,
    creativeOutputSize,
    cropSource,
    frameWords,
    madeForYouSize,
    panCrop,
} from '../components/campaigns/creatives/creativeFrames';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign Creatives Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const near = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

async function main() {
    const started = performance.now();

    /* ── frames ── */
    const imageFormats = CAMPAIGN_FORMAT_ORDER.filter(id => CAMPAIGN_FORMATS[id].frame > 0);
    const noImage = CAMPAIGN_FORMAT_ORDER.filter(id => !(CAMPAIGN_FORMATS[id].frame > 0));
    assert.deepEqual(noImage, ['SEARCH', 'DRONE_SHOW'], 'Only search ads and the drone show carry no image');
    noImage.forEach(id => assert.ok(NO_IMAGE_LINE[id], `${id} says what it shows instead`));
    imageFormats.forEach(id => assert.notEqual(frameWords(CAMPAIGN_FORMATS[id].frame).name, 'Frame', `${id}'s frame has a name`));
    const all = creativeFramesOf(CAMPAIGN_FORMAT_ORDER);
    assert.deepEqual(all.map(frame => frame.key), ['8:1', '3:1', '16:9', '1:1', '2:3', '9:16', '1:3', '1:6'], 'Eight frames, widest first');
    assert.equal(all.reduce((sum, frame) => sum + frame.formats.length, 0), imageFormats.length, 'Every image format is in one frame');
    const picked: CampaignFormatId[] = ['SHORT_VIDEO', 'BILLBOARD', 'TV_SPOTS', 'CTV', 'SEARCH', 'LANDMARK_LIGHT_SHOW'];
    const frames = creativeFramesOf(picked);
    assert.deepEqual(frames.map(frame => `${frame.key} ${frame.formats.join('+')}`), ['3:1 BILLBOARD', '16:9 TV_SPOTS+CTV', '9:16 SHORT_VIDEO', '1:6 LANDMARK_LIGHT_SHOW'], 'A campaign asks one image per frame');
    assert.deepEqual(creativeIdsFor(frames, { '16:9': 'media_tv', '1:6': 'media_burj' }), { TV_SPOTS: 'media_tv', CTV: 'media_tv', LANDMARK_LIGHT_SHOW: 'media_burj' }, 'An upload goes on each of its frame\'s formats');
    console.log(`PASS frames: ${all.length} frames for ${imageFormats.length} image formats (${all.map(frame => `${frame.key} ${frame.name}`).join(', ')}); search ads and the drone show need none`);

    /* ── the crop ── */
    const pictures = [{ width: 4000, height: 3000 }, { width: 1080, height: 1920 }, { width: 900, height: 900 }, { width: 5000, height: 600 }];
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let checked = 0;
    for (const picture of pictures) {
        for (const frame of all) {
            const cover = cropSource(picture, frame.ratio, { zoom: 1, cx: 0.5, cy: 0.5 });
            assert.ok(near(cover.sw, picture.width) || near(cover.sh, picture.height), 'Zoom 1 just covers the frame');
            let crop = clampCrop(picture, frame.ratio, { zoom: 1, cx: 0.5, cy: 0.5 });
            for (let step = 0; step < 40; step += 1) {
                crop = random() < 0.5
                    ? panCrop(picture, frame.ratio, crop, (random() - 0.5) * 900, (random() - 0.5) * 900, 320)
                    : clampCrop(picture, frame.ratio, { ...crop, zoom: crop.zoom * (0.6 + random() * 0.9) });
                const { sx, sy, sw, sh } = cropSource(picture, frame.ratio, crop);
                assert.ok(near(sw / sh, frame.ratio, 1e-9 * Math.max(1, frame.ratio)), 'The shown part has the frame\'s shape');
                assert.ok(sx >= -1e-9 && sy >= -1e-9 && sx + sw <= picture.width + 1e-6 && sy + sh <= picture.height + 1e-6, 'It stays inside the picture');
                assert.ok(crop.zoom >= 1 && crop.zoom <= 4, 'Zoom stays between 1 and 4');
                checked += 1;
            }
        }
    }
    /* a drag moves the picture with the finger: dragging right shows more of its left */
    const before = cropSource(pictures[0], 3, { zoom: 2, cx: 0.5, cy: 0.5 });
    const after = cropSource(pictures[0], 3, panCrop(pictures[0], 3, { zoom: 2, cx: 0.5, cy: 0.5 }, 100, 0, 320));
    assert.ok(after.sx < before.sx && near(before.sx - after.sx, (100 * before.sw) / 320, 1e-6), 'A drag right moves the view left by the same share');
    console.log(`PASS crop: ${checked} drags and zooms over ${pictures.length} pictures and ${all.length} frames; the shown part keeps the frame's shape, stays inside the picture, zoom 1–4`);

    /* ── sizes ── */
    assert.deepEqual(creativeOutputSize(3, { width: 4000, height: 1333 }), { width: CREATIVE_LONG_SIDE, height: 533 }, 'A billboard kept at 1600 × 533');
    assert.deepEqual(creativeOutputSize(1 / 6, { width: 500, height: 3000 }), { width: 267, height: 1600 }, 'The facade kept at 267 × 1600');
    assert.deepEqual(creativeOutputSize(3, { width: 600, height: 200 }), { width: 600, height: 200 }, 'Never larger than its source');
    for (const frame of all) {
        const size = madeForYouSize(frame.ratio);
        assert.ok(Math.max(size.width, size.height) >= 1200 && Math.min(size.width, size.height) >= 200, `${frame.key} made for you: long side 1200+, short side 200+`);
        assert.ok(Math.abs(size.width / size.height - frame.ratio) / frame.ratio < 0.01, `${frame.key} made for you keeps its shape`);
    }
    console.log(`PASS sizes: kept 1600 on the long side (never upscaled); made for you ${all.map(frame => { const size = madeForYouSize(frame.ratio); return `${size.width}×${size.height}`; }).join(', ')}`);

    /* ── a launched campaign keeps its creatives ── */
    let player = await buildStreamingFullPlatformQa(fresh('campaign-creatives'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = (await processGameWeek(player)).player;
    player = { ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    const title = streamingCampaignSubjects(player).find(item => item.kind === 'TITLE')!;
    const region = streamingCampaignRegions(player).sort((left, right) => right.countryIds.length - left.countryIds.length)[0];
    const formats: CampaignFormatId[] = ['SHORT_VIDEO', 'BILLBOARD', 'TV_SPOTS', 'CTV', 'SEARCH'];
    const result = startStreamingCampaign(player, {
        name: title.name, subject: { kind: 'TITLE', id: title.id }, where: { kind: 'REGION', regionId: region.id }, formats,
        budget: { kind: 'BURST', total: 20_000_000, weeks: 4 },
        creativeIds: { ...creativeIdsFor(creativeFramesOf(formats), { '16:9': 'campaign_creative_tv', '3:1': 'campaign_creative_board' }), SEARCH: 'campaign_creative_search', FLYERS: 'campaign_creative_flyer' },
    });
    assert.ok(result.ok, `The campaign launches: ${result.problems.join(', ')}`);
    const campaign = streamingCampaignBook(result.player.ownedStreamingPlatform).campaigns.find(item => item.id === result.campaignId)!;
    assert.deepEqual(campaign.creativeIds, { BILLBOARD: 'campaign_creative_board', TV_SPOTS: 'campaign_creative_tv', CTV: 'campaign_creative_tv' }, 'Only its own image formats keep a creative (not search, not a format it does not run)');
    const plain = startStreamingCampaign(player, { subject: { kind: 'TITLE', id: title.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED'], budget: { kind: 'BURST', total: 5_000_000, weeks: 2 } });
    const plainCampaign = streamingCampaignBook(plain.player.ownedStreamingPlatform).campaigns.find(item => item.id === plain.campaignId)!;
    assert.ok(!('creativeIds' in plainCampaign), 'A campaign with no upload keeps no creatives field');
    const saved = normalizeCampaignBook(JSON.parse(JSON.stringify({ ...streamingCampaignBook(result.player.ownedStreamingPlatform),
        campaigns: [{ ...campaign, creativeIds: { ...campaign.creativeIds, NOT_A_FORMAT: 'x', SOCIAL_FEED: 42 } }] })));
    assert.deepEqual(saved.campaigns[0].creativeIds, campaign.creativeIds, 'A saved book keeps them and drops a malformed one');
    console.log(`PASS launched: "${campaign.name}" keeps 3 creatives (billboard; TV spots and connected TV share one), none for search; a saved book keeps them`);

    console.log(`campaign creatives audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
