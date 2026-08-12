export type StreamingVisualSceneId =
    | 'registration'
    | 'level0Hq'
    | 'commandDeck'
    | 'contentStudio'
    | 'noc'
    | 'marketRoom'
    | 'companyFinance'
    | 'viewerLab';

export type StreamingVisualFallbackPattern =
    | 'charter'
    | 'headquarters'
    | 'command'
    | 'content'
    | 'network'
    | 'market'
    | 'finance'
    | 'audience';

export interface StreamingVisualAsset {
    id: StreamingVisualSceneId;
    label: string;
    description: string;
    src: `/assets/streaming/${string}.webp`;
    focalPoint: `${number}% ${number}%`;
    fallbackPattern: StreamingVisualFallbackPattern;
    palette: {
        base: `#${string}`;
        deep: `#${string}`;
        accent: `#${string}`;
        secondary: `#${string}`;
    };
}

/**
 * Runtime artwork registry for the streaming expansion.
 *
 * The component using this registry deliberately renders an authored CSS fallback
 * beneath every image, so these paths may be populated progressively without
 * leaving a broken-image state in development or older builds.
 */
export const STREAMING_VISUAL_ASSETS = {
    registration: {
        id: 'registration',
        label: 'Platform registration desk',
        description: 'A founder charter and incorporation desk prepared for the new streaming company.',
        src: '/assets/streaming/scenes/registration.webp',
        focalPoint: '50% 46%',
        fallbackPattern: 'charter',
        palette: {
            base: '#24170f',
            deep: '#070506',
            accent: '#f2c86b',
            secondary: '#8f5d2e',
        },
    },
    level0Hq: {
        id: 'level0Hq',
        label: 'Level zero headquarters',
        description: 'The first compact headquarters with room for content, technology and company operations.',
        src: '/assets/streaming/scenes/hq-level-0.webp',
        focalPoint: '50% 48%',
        fallbackPattern: 'headquarters',
        palette: {
            base: '#151421',
            deep: '#050507',
            accent: '#8b5cf6',
            secondary: '#d5a84f',
        },
    },
    commandDeck: {
        id: 'commandDeck',
        label: 'Streaming command deck',
        description: 'The central operating deck for launches, weekly priorities and platform-wide decisions.',
        src: '/assets/streaming/scenes/command-deck.webp',
        focalPoint: '50% 44%',
        fallbackPattern: 'command',
        palette: {
            base: '#101827',
            deep: '#04070c',
            accent: '#7c6cff',
            secondary: '#37c5f0',
        },
    },
    contentStudio: {
        id: 'contentStudio',
        label: 'Content studio',
        description: 'A working content room for the catalog, Originals and the release slate.',
        src: '/assets/streaming/scenes/content-studio.webp',
        focalPoint: '50% 45%',
        fallbackPattern: 'content',
        palette: {
            base: '#25111f',
            deep: '#070407',
            accent: '#e34b78',
            secondary: '#f0a759',
        },
    },
    noc: {
        id: 'noc',
        label: 'Network operations centre',
        description: 'The infrastructure room for capacity, playback reliability and incident response.',
        src: '/assets/streaming/scenes/network-operations-centre.webp',
        focalPoint: '50% 47%',
        fallbackPattern: 'network',
        palette: {
            base: '#071c25',
            deep: '#02070a',
            accent: '#2fd1c5',
            secondary: '#4f86ff',
        },
    },
    marketRoom: {
        id: 'marketRoom',
        label: 'Market room',
        description: 'The strategy room for audience reach, competitors and regional expansion.',
        src: '/assets/streaming/scenes/market-room.webp',
        focalPoint: '50% 43%',
        fallbackPattern: 'market',
        palette: {
            base: '#111d2a',
            deep: '#03070c',
            accent: '#4ea3ff',
            secondary: '#a56cff',
        },
    },
    companyFinance: {
        id: 'companyFinance',
        label: 'Company and finance office',
        description: 'The executive office for ownership, treasury, governance and long-term company records.',
        src: '/assets/streaming/scenes/company-finance.webp',
        focalPoint: '50% 45%',
        fallbackPattern: 'finance',
        palette: {
            base: '#211a12',
            deep: '#070604',
            accent: '#d5aa54',
            secondary: '#7b62d8',
        },
    },
    viewerLab: {
        id: 'viewerLab',
        label: 'Viewer experience lab',
        description: 'A simulated living-room laboratory for testing discovery, playback and audience journeys.',
        src: '/assets/streaming/scenes/viewer-lab.webp',
        focalPoint: '50% 47%',
        fallbackPattern: 'audience',
        palette: {
            base: '#19152b',
            deep: '#050408',
            accent: '#aa75ff',
            secondary: '#e1548b',
        },
    },
} as const satisfies Record<StreamingVisualSceneId, StreamingVisualAsset>;

export const STREAMING_VISUAL_SCENE_IDS = Object.freeze(
    Object.keys(STREAMING_VISUAL_ASSETS) as StreamingVisualSceneId[],
);

export const getStreamingVisualAsset = (
    sceneId: StreamingVisualSceneId,
): StreamingVisualAsset => STREAMING_VISUAL_ASSETS[sceneId];

export const isStreamingVisualSceneId = (value: string): value is StreamingVisualSceneId => (
    Object.prototype.hasOwnProperty.call(STREAMING_VISUAL_ASSETS, value)
);
