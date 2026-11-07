/**
 * A campaign's creatives (#148; plan §20.10 point 5, Zeesh: "इमेज अपलोड कर सकते, जैसे बुर्ज खलीफा का फॉर्मेट अलग होगा
 * एंड सब जगह का अलग जाएगा"). Each format shows its creative in its own frame (`CampaignFormat.frame`, width ÷ height):
 * a billboard 3:1, a train's side 8:1, a poster 2:3, a vertical screen 9:16, a tower banner 1:3, the Burj Khalifa's
 * facade 1:6. Formats that share a frame share one creative, so a campaign asks for one image per frame.
 * Pure: the frames a campaign needs, their names, the size a creative is kept at, and the crop's arithmetic.
 */
import type { CampaignFormatId } from '../../../types';
import { CAMPAIGN_FORMATS } from '../../../services/campaigns/campaignFormats';

export interface CreativeFrame {
  /** the ratio as people write it, "3:1" */
  key: string;
  /** width ÷ height */
  ratio: number;
  name: string;
  /** the campaign's formats that show this frame */
  formats: CampaignFormatId[];
}

const FRAMES: Array<{ ratio: number; key: string; name: string }> = [
  { ratio: 8, key: '8:1', name: 'Train side' },
  { ratio: 3, key: '3:1', name: 'Billboard' },
  { ratio: 16 / 9, key: '16:9', name: 'Widescreen' },
  { ratio: 1, key: '1:1', name: 'Square post' },
  { ratio: 2 / 3, key: '2:3', name: 'Poster' },
  { ratio: 9 / 16, key: '9:16', name: 'Vertical screen' },
  { ratio: 1 / 3, key: '1:3', name: 'Tower banner' },
  { ratio: 1 / 6, key: '1:6', name: 'LED facade' },
];

/** a ratio's name, within a percent of the frames above */
export const frameWords = (ratio: number): { key: string; name: string } => (
  FRAMES.find(frame => Math.abs(frame.ratio - ratio) / frame.ratio < 0.01)
    ?? { key: ratio >= 1 ? `${+ratio.toFixed(2)}:1` : `1:${+(1 / ratio).toFixed(2)}`, name: 'Frame' }
);

/** The frames a set of formats needs, widest first. Search ads and a drone show carry no image and need none. */
export const creativeFramesOf = (formats: CampaignFormatId[]): CreativeFrame[] => {
  const byKey = new Map<string, CreativeFrame>();
  [...new Set(formats)].forEach(id => {
    const ratio = CAMPAIGN_FORMATS[id]?.frame;
    if (!(ratio > 0)) return;
    const words = frameWords(ratio);
    const frame = byKey.get(words.key) ?? { key: words.key, ratio, name: words.name, formats: [] };
    frame.formats.push(id);
    byKey.set(words.key, frame);
  });
  return [...byKey.values()].sort((left, right) => right.ratio - left.ratio);
};

/** What a format with no image shows instead. */
export const NO_IMAGE_LINE: Partial<Record<CampaignFormatId, string>> = {
  SEARCH: 'Search ads show your name and one line, no image.',
  DRONE_SHOW: 'The drone show writes the name in the sky in your colours, no image.',
};

/** The creatives a campaign keeps: one media id per frame, written against each of that frame's formats. */
export const creativeIdsFor = (frames: CreativeFrame[], uploads: Record<string, string | undefined>): Partial<Record<CampaignFormatId, string>> => {
  const ids: Partial<Record<CampaignFormatId, string>> = {};
  frames.forEach(frame => {
    const mediaId = uploads[frame.key];
    if (mediaId) frame.formats.forEach(id => { ids[id] = mediaId; });
  });
  return ids;
};

/* ── sizes ── */

/** A creative is kept with its long side at 1600 px, and never larger than the part of the picture it came from. */
export const CREATIVE_LONG_SIDE = 1600;
export const creativeOutputSize = (ratio: number, source?: { width: number; height: number }) => {
  let long = CREATIVE_LONG_SIDE;
  if (source) long = Math.min(long, Math.max(source.width, source.height));
  long = Math.max(320, long);
  return ratio >= 1
    ? { width: Math.round(long), height: Math.max(1, Math.round(long / ratio)) }
    : { width: Math.max(1, Math.round(long * ratio)), height: Math.round(long) };
};

/** A made-for-you creative's canvas: the long side 1200 px, the short side at least 200 so the words still read. */
export const madeForYouSize = (ratio: number) => {
  const short = 200;
  if (ratio >= 1) {
    const width = Math.max(1200, Math.round(short * ratio));
    return { width, height: Math.max(short, Math.round(width / ratio)) };
  }
  const height = Math.max(1200, Math.round(short / ratio));
  return { width: Math.max(short, Math.round(height * ratio)), height };
};

/* ── the crop ── */

/** Where the crop is: how far it is zoomed in past covering the frame (1 = just covers), and the picture's point at
    the frame's centre, as fractions of its width and height. */
export interface CreativeCrop {
  zoom: number;
  cx: number;
  cy: number;
}
export const CROP_START: CreativeCrop = { zoom: 1, cx: 0.5, cy: 0.5 };
export const CROP_MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The part of the picture the frame shows, in the picture's pixels. The picture always covers the frame. */
export const cropSource = (image: { width: number; height: number }, ratio: number, crop: CreativeCrop) => {
  const zoom = clamp(crop.zoom, 1, CROP_MAX_ZOOM);
  const wide = image.width / image.height > ratio;
  const sw = (wide ? image.height * ratio : image.width) / zoom;
  const sh = (wide ? image.height : image.width / ratio) / zoom;
  return {
    sx: clamp(crop.cx * image.width - sw / 2, 0, image.width - sw),
    sy: clamp(crop.cy * image.height - sh / 2, 0, image.height - sh),
    sw,
    sh,
  };
};

/** The crop moved back to where the picture still covers the frame. */
export const clampCrop = (image: { width: number; height: number }, ratio: number, crop: CreativeCrop): CreativeCrop => {
  const { sx, sy, sw, sh } = cropSource(image, ratio, crop);
  return { zoom: clamp(crop.zoom, 1, CROP_MAX_ZOOM), cx: (sx + sw / 2) / image.width, cy: (sy + sh / 2) / image.height };
};

/** A drag of (dx, dy) on a frame `boxWidth` wide moves the picture with the finger (the shown part has the frame's
    ratio, so a screen pixel is the same share of the picture both ways). */
export const panCrop = (image: { width: number; height: number }, ratio: number, crop: CreativeCrop, dx: number, dy: number, boxWidth: number): CreativeCrop => {
  const perPixel = cropSource(image, ratio, crop).sw / Math.max(1, boxWidth);
  return clampCrop(image, ratio, { ...crop, cx: crop.cx - (dx * perPixel) / image.width, cy: crop.cy - (dy * perPixel) / image.height });
};
