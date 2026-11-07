/**
 * The campaign scenes (#144 prototype: two of them; every format gets one in #156, plan §20.13, Zeesh: "how me humare
 * sare options ka acha visuals live dikhe"). Each is a photo-real backdrop made with AI image generation (Figma, plan
 * §20.10 point 4, Zeesh: "जनरेट करने का, रादर देन … स्टॉक फोटो") with blank screens, no other brands and no faces,
 * and where in it the creative goes, in the backdrop's own pixels (measured from the image).
 *  - QUAD: flat faces shown in perspective (a billboard, a TV, a train's side, a row of posters): the creative is mapped
 *    onto each face's four corners. A face is printed (lit by lamps, or by day) or a screen (it glows). When a face's
 *    own shape is far from the creative's frame (a tall airport screen showing a 9:16 creative), the creative is shown
 *    whole and carried on past its edges in its edges' own colours.
 *  - LED_FACADE: a building that is its own screen (the Burj Khalifa; the Empire State Building's and Tokyo Tower's
 *    lights): the creative is drawn as LED dots, row by row inside the outline; `skyMask` keeps the dots off the sky
 *    seen through a lattice or around a spire.
 *  - RING: a wheel's rim of lights (the London Eye), in the creative's colours round the rim.
 *  - DRONES: a night sky where a fleet of drones draws the campaign's name.
 * Every scene has a half-size `thumb` for the format cards; the full backdrop loads only when a scene is opened.
 */
import type { CampaignFormatId } from '../../../types';
import type { SceneQuad, ScenePoint } from './sceneGeometry';

export type CampaignSceneId = 'BURJ_KHALIFA' | 'CITY_BILLBOARD' | 'TV_ROOM' | 'METRO_VIADUCT' | 'POSTER_HOARDING' | 'FLYER_WALL'
  | 'AIRPORT_GATE' | 'MALL_ATRIUM' | 'CITY_PLAZA' | 'TOWER_BANNER' | 'DRONE_SKY' | 'FESTIVAL_STAGE' | 'STUNT_ARENA'
  | 'EMPIRE_STATE' | 'LONDON_EYE' | 'TOKYO_TOWER';

interface SceneBase {
  id: CampaignSceneId;
  name: string;
  place: string;
  backdrop: string;
  /** #156: the backdrop at half size, for the format cards */
  thumb: string;
  /** the backdrop's own size */
  width: number;
  height: number;
  /** what stays in view when the backdrop covers a screen */
  focus: ScenePoint;
  /** the creative's frame, width ÷ height */
  aspect: number;
  /** #149: a scene of one real place shows only for campaigns there (the Burj Khalifa: the UAE) */
  countries?: string[];
}

export interface QuadScene extends SceneBase {
  kind: 'QUAD';
  quad: SceneQuad;
  /** #156: more faces showing the same creative, drawn after `quad` in this order (the later on top) */
  quads?: SceneQuad[];
  /** the lamps that light the face, as points below it */
  lamps: ScenePoint[];
  /** #156: printed (lit from `light`) or a screen that glows; printed by default */
  surface?: 'PRINT' | 'SCREEN';
  /** #156: where a print's light comes from: the lamps below (the #144 billboard), lamps above, or the sky */
  light?: 'BELOW' | 'ABOVE' | 'DAY' | 'DUSK';
  /** #156: the face's own width ÷ height, when it is not the creative's frame (a tall screen, a long banner) */
  shape?: number;
  /** #156: dark joins across the face, as fractions of its width (a train's cars) */
  seams?: number[];
  /** #156: rounded corners, in the face's own pixels at 600 wide */
  radius?: number;
  /** #156: a paper border round the print, as a fraction of the face (flyers) */
  margin?: number;
  /** #159: the photo's own light, joins and gloss over the print, as a wrap on a curved body takes them */
  shading?: boolean;
  /** #159: See it live follows the face along it, from the first point to the second (a train, cab to tail); the cards
      stay still */
  pan?: [ScenePoint, ScenePoint];
}

export interface LedFacadeScene extends SceneBase {
  kind: 'LED_FACADE';
  /** the facade's outline, top to bottom: [y, left x, right x] */
  profile: Array<[number, number, number]>;
  /** the dots' spacing, in backdrop pixels */
  pitch: number;
  /** where the water starts, for the reflection (#156: null, no water) */
  waterline: number | null;
  /** #156: no dot where the backdrop shows sky (a lattice tower, a spire) */
  skyMask?: boolean;
}

/** #156: a wheel's rim of lights */
export interface RingScene extends SceneBase {
  kind: 'RING';
  center: ScenePoint;
  outer: number;
  inner: number;
  pitch: number;
  waterline: number | null;
}

/** #156: a night sky where drones draw the name; `sky` is the box they fill: [left, top, right, bottom] */
export interface DronesScene extends SceneBase {
  kind: 'DRONES';
  sky: [number, number, number, number];
  waterline: number | null;
}

export type CampaignScene = QuadScene | LedFacadeScene | RingScene | DronesScene;

export const CAMPAIGN_SCENES: Record<CampaignSceneId, CampaignScene> = {
  BURJ_KHALIFA: {
    id: 'BURJ_KHALIFA',
    kind: 'LED_FACADE',
    name: 'Burj Khalifa light show',
    place: 'Downtown Dubai',
    backdrop: '/assets/campaigns/scenes/dubai-night.jpg',
    thumb: '/assets/campaigns/scenes/thumbs/dubai-night.jpg',
    width: 1024,
    height: 1536,
    focus: [517, 760],
    aspect: 1 / 6,
    /* #156: the UAE's landmark only (it had no country, so a light show anywhere showed Dubai) */
    countries: ['AE'],
    pitch: 5,
    waterline: 1252,
    /* measured from the backdrop: the tower's edges every 20 px, where its setbacks step in */
    profile: [
      [300, 499, 532], [320, 498, 533], [340, 494, 537], [360, 489, 538], [380, 490, 537], [400, 490, 538],
      [420, 490, 548], [440, 489, 548], [460, 489, 548], [480, 488, 549], [500, 488, 549], [520, 487, 550],
      [540, 475, 550], [560, 474, 550], [580, 474, 550], [600, 473, 562], [620, 473, 562], [640, 472, 563],
      [660, 471, 564], [680, 471, 564], [700, 470, 565], [720, 459, 565], [740, 457, 565], [760, 456, 566],
      [780, 456, 577], [800, 456, 578], [820, 456, 580], [840, 454, 580], [860, 454, 579], [880, 454, 581],
      [900, 441, 581], [920, 440, 581], [940, 440, 585], [960, 439, 594], [980, 437, 596], [1000, 435, 597],
      [1020, 437, 596], [1040, 436, 596], [1060, 436, 596], [1080, 436, 596],
    ],
  },
  CITY_BILLBOARD: {
    id: 'CITY_BILLBOARD',
    kind: 'QUAD',
    name: 'Rooftop billboard',
    place: 'A city corner at dusk',
    backdrop: '/assets/campaigns/scenes/city-billboard.jpg',
    thumb: '/assets/campaigns/scenes/thumbs/city-billboard.jpg',
    width: 1024,
    height: 1536,
    focus: [498, 420],
    aspect: 3,
    /* measured from the backdrop: the face's edges fitted where the sky turns into the grey board */
    quad: [[205, 173], [790, 182], [792, 368], [204, 362]],
    lamps: [[336, 362], [676, 366]],
  },
  /* ── #156: every format's scene ── */
  TV_ROOM: {
    id: 'TV_ROOM', kind: 'QUAD', name: 'Prime-time TV', place: 'A living room at night',
    backdrop: '/assets/campaigns/scenes/tv-room.jpg', thumb: '/assets/campaigns/scenes/thumbs/tv-room.jpg',
    width: 1024, height: 1536, focus: [505, 420], aspect: 16 / 9, surface: 'SCREEN',
    /* the screen, seen a little from the left: its right side further away */
    quad: [[245, 240], [765, 272], [763, 564], [244, 579]], lamps: [],
  },
  METRO_VIADUCT: {
    id: 'METRO_VIADUCT', kind: 'QUAD', name: 'Wrapped train', place: 'A metro viaduct at dusk',
    backdrop: '/assets/campaigns/scenes/metro.jpg', thumb: '/assets/campaigns/scenes/thumbs/metro.jpg',
    width: 1024, height: 1536, focus: [600, 760], aspect: 8, light: 'DUSK',
    /* the cars' side, from behind the cab to the frame's edge, and the joins between the cars; #159: the body's own
       light and joins over the wrap, and See it live runs along the train the way it goes, tail to cab */
    quad: [[167, 631], [1023, 813], [1023, 870], [167, 733]], lamps: [], seams: [0.593, 0.88],
    shading: true, pan: [[720, 800], [350, 730]],
  },
  POSTER_HOARDING: {
    id: 'POSTER_HOARDING', kind: 'QUAD', name: 'Poster wall', place: 'A city street at dusk',
    backdrop: '/assets/campaigns/scenes/posters.jpg', thumb: '/assets/campaigns/scenes/thumbs/posters.jpg',
    width: 1024, height: 1536, focus: [512, 660], aspect: 2 / 3, light: 'ABOVE',
    quad: [[98, 573], [209, 573], [209, 747], [97, 747]],
    quads: [[[240, 573], [351, 574], [351, 747], [239, 747]], [[382, 574], [493, 573], [494, 747], [381, 747]], [[531, 573], [642, 573], [643, 747], [530, 747]],
      [[674, 573], [784, 573], [784, 747], [673, 747]], [[814, 573], [925, 574], [925, 747], [814, 747]]],
    lamps: [],
  },
  FLYER_WALL: {
    id: 'FLYER_WALL', kind: 'QUAD', name: 'Flyers', place: 'An alley wall',
    backdrop: '/assets/campaigns/scenes/flyers.jpg', thumb: '/assets/campaigns/scenes/thumbs/flyers.jpg',
    width: 1024, height: 1536, focus: [512, 600], aspect: 2 / 3, light: 'DAY', margin: 0.05,
    /* the five sheets in the order they were pasted: the middle one over the top two, the bottom two over it */
    quad: [[246, 214], [472, 193], [503, 505], [281, 527]],
    quads: [[[578, 262], [800, 287], [762, 594], [540, 569]], [[392, 476], [612, 452], [647, 756], [416, 781]],
      [[254, 655], [476, 679], [448, 986], [222, 958]], [[566, 731], [780, 713], [788, 1020], [570, 1027]]],
    lamps: [],
  },
  AIRPORT_GATE: {
    id: 'AIRPORT_GATE', kind: 'QUAD', name: 'Airport screens', place: 'A departure gate',
    backdrop: '/assets/campaigns/scenes/airport.jpg', thumb: '/assets/campaigns/scenes/thumbs/airport.jpg',
    width: 1024, height: 1536, focus: [512, 620], aspect: 9 / 16, surface: 'SCREEN', shape: 183 / 492,
    quad: [[282, 376], [465, 376], [465, 868], [282, 868]], quads: [[[559, 376], [742, 376], [741, 868], [559, 868]]], lamps: [],
  },
  MALL_ATRIUM: {
    id: 'MALL_ATRIUM', kind: 'QUAD', name: 'Mall screen', place: 'A mall atrium',
    backdrop: '/assets/campaigns/scenes/mall.jpg', thumb: '/assets/campaigns/scenes/thumbs/mall.jpg',
    width: 1024, height: 1536, focus: [512, 640], aspect: 9 / 16, surface: 'SCREEN', shape: 324 / 732,
    quad: [[352, 276], [670, 276], [678, 1008], [346, 1008]], lamps: [],
  },
  CITY_PLAZA: {
    id: 'CITY_PLAZA', kind: 'QUAD', name: 'City screen', place: 'A famous square at night',
    backdrop: '/assets/campaigns/scenes/plaza.jpg', thumb: '/assets/campaigns/scenes/thumbs/plaza.jpg',
    width: 1024, height: 1536, focus: [550, 430], aspect: 16 / 9, surface: 'SCREEN', shape: 500 / 400, radius: 26,
    quad: [[304, 229], [797, 231], [805, 629], [298, 633]], lamps: [],
  },
  TOWER_BANNER: {
    id: 'TOWER_BANNER', kind: 'QUAD', name: 'Building reveal', place: 'A downtown tower',
    backdrop: '/assets/campaigns/scenes/tower.jpg', thumb: '/assets/campaigns/scenes/thumbs/tower.jpg',
    width: 1024, height: 1536, focus: [510, 700], aspect: 1 / 3, light: 'BELOW', shape: 1 / 5,
    /* seen from below: the banner narrows to the top */
    quad: [[437, 166], [593, 185], [643, 1333], [375, 1330]], lamps: [],
  },
  DRONE_SKY: {
    id: 'DRONE_SKY', kind: 'DRONES', name: 'Drone show', place: 'A waterfront at night',
    backdrop: '/assets/campaigns/scenes/drones.jpg', thumb: '/assets/campaigns/scenes/thumbs/drones.jpg',
    width: 1024, height: 1536, focus: [512, 640], aspect: 3, sky: [130, 330, 894, 800], waterline: 1205,
  },
  FESTIVAL_STAGE: {
    id: 'FESTIVAL_STAGE', kind: 'QUAD', name: 'Fan festival', place: 'The main stage',
    backdrop: '/assets/campaigns/scenes/festival.jpg', thumb: '/assets/campaigns/scenes/thumbs/festival.jpg',
    width: 1024, height: 1536, focus: [512, 820], aspect: 16 / 9, surface: 'SCREEN', shape: 459 / 213,
    quad: [[284, 720], [740, 720], [742, 933], [281, 933]], lamps: [],
  },
  STUNT_ARENA: {
    id: 'STUNT_ARENA', kind: 'QUAD', name: 'Live stunt show', place: 'An arena at night',
    backdrop: '/assets/campaigns/scenes/stunt.jpg', thumb: '/assets/campaigns/scenes/thumbs/stunt.jpg',
    width: 1024, height: 1536, focus: [512, 660], aspect: 16 / 9, surface: 'SCREEN', shape: 467 / 208,
    quad: [[277, 550], [745, 551], [744, 757], [278, 759]], lamps: [],
  },
  EMPIRE_STATE: {
    id: 'EMPIRE_STATE', kind: 'LED_FACADE', name: 'Empire State Building lights', place: 'Midtown Manhattan',
    backdrop: '/assets/campaigns/scenes/empire.jpg', thumb: '/assets/campaigns/scenes/thumbs/empire.jpg',
    width: 1024, height: 1536, focus: [515, 420], aspect: 1 / 6, countries: ['US'], pitch: 5, waterline: null, skyMask: true,
    /* measured from the backdrop: the mast, the crown and the top floors, as its lights are */
    profile: [[60, 514, 515], [80, 514, 515], [100, 512, 517], [120, 511, 518], [140, 511, 518], [160, 506, 523], [180, 507, 523], [200, 508, 521], [220, 499, 530], [240, 495, 534], [260, 498, 531], [280, 498, 532], [300, 494, 533], [320, 490, 534], [340, 489, 542], [350, 481, 543], [360, 476, 559], [370, 464, 562], [380, 464, 563], [390, 448, 579], [400, 449, 584], [410, 443, 586], [440, 441, 585], [450, 442, 592], [460, 430, 595], [480, 430, 599], [500, 429, 599], [550, 429, 600], [560, 423, 602], [570, 423, 606], [580, 423, 607], [600, 422, 607], [620, 422, 607], [640, 422, 607], [660, 422, 607]],
  },
  LONDON_EYE: {
    id: 'LONDON_EYE', kind: 'RING', name: 'London Eye lights', place: 'The South Bank',
    backdrop: '/assets/campaigns/scenes/london-eye.jpg', thumb: '/assets/campaigns/scenes/thumbs/london-eye.jpg',
    width: 1024, height: 1536, focus: [511, 520], aspect: 1 / 6, countries: ['GB'],
    center: [511, 478], outer: 318, inner: 297, pitch: 5, waterline: 872,
  },
  TOKYO_TOWER: {
    id: 'TOKYO_TOWER', kind: 'LED_FACADE', name: 'Tokyo Tower lights', place: 'Minato, Tokyo',
    backdrop: '/assets/campaigns/scenes/tokyo-tower.jpg', thumb: '/assets/campaigns/scenes/thumbs/tokyo-tower.jpg',
    width: 1024, height: 1536, focus: [515, 600], aspect: 1 / 6, countries: ['JP'], pitch: 5, waterline: null, skyMask: true,
    /* measured from the backdrop to the deck; the legs below, straight lines to their feet */
    profile: [[120, 512, 515], [140, 508, 520], [160, 507, 520], [180, 508, 519], [200, 508, 520], [220, 508, 520], [240, 507, 521], [260, 507, 521], [280, 504, 524], [300, 503, 526], [310, 499, 528], [320, 490, 537], [340, 490, 538], [360, 490, 539], [380, 495, 536], [400, 491, 541], [420, 490, 540], [440, 493, 535], [460, 492, 536], [480, 491, 538], [500, 490, 539], [520, 489, 540], [540, 487, 542], [560, 485, 548], [580, 485, 545], [600, 481, 551], [620, 480, 552], [640, 479, 553], [660, 478, 552], [680, 477, 554], [700, 475, 556], [720, 473, 558], [730, 467, 562], [740, 455, 571], [750, 451, 581], [760, 452, 579], [780, 454, 577], [790, 460, 571], [800, 463, 568], [820, 465, 567], [840, 462, 569], [860, 460, 572], [880, 439, 588], [900, 433, 593], [920, 427, 598], [940, 421, 603], [960, 414, 607], [980, 408, 612], [1000, 402, 617], [1020, 396, 622], [1040, 390, 627], [1060, 384, 632], [1080, 378, 637], [1100, 372, 642]],
  },
};

/** #156: the scene a format is shown in, where it happens (a light show: the landmark of its country), or null. */
export const LANDMARK_SCENES: Record<string, CampaignSceneId> = { AE: 'BURJ_KHALIFA', US: 'EMPIRE_STATE', GB: 'LONDON_EYE', JP: 'TOKYO_TOWER' };
const FORMAT_SCENES: Partial<Record<CampaignFormatId, CampaignSceneId>> = {
  TV_SPOTS: 'TV_ROOM', BILLBOARD: 'CITY_BILLBOARD', METRO_WRAP: 'METRO_VIADUCT', POSTER_WALL: 'POSTER_HOARDING', FLYERS: 'FLYER_WALL',
  AIRPORT_SCREENS: 'AIRPORT_GATE', MALL_SCREENS: 'MALL_ATRIUM', CITY_SCREEN: 'CITY_PLAZA', BUILDING_REVEAL: 'TOWER_BANNER',
  DRONE_SHOW: 'DRONE_SKY', FAN_FESTIVAL: 'FESTIVAL_STAGE', LIVE_SHOW: 'STUNT_ARENA',
};
export const sceneForFormat = (formatId: CampaignFormatId, countryId?: string | null): CampaignSceneId | null => (
  formatId === 'LANDMARK_LIGHT_SHOW' ? (countryId ? LANDMARK_SCENES[countryId] ?? null : null) : FORMAT_SCENES[formatId] ?? null
);
