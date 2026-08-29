import { readFileSync } from 'node:fs';
import {
    STREAMING_BRAND_MARK_DATA_URL_LIMIT,
    cleanStreamingBrandMarkDataUrl,
} from '../services/streamingBrandImage';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const read = (path: string) => readFileSync(path, 'utf8');
const orchestrator = read('components/streaming-transplant/StreamingPrototypeOrchestrator.tsx');
const visuals = read('components/streaming-transplant/StreamingBrandVisuals.tsx');
const shellCss = read('components/streaming-transplant/presentation/screens/Shell/Shell.module.css');
const founding = read('services/streamingFounding.ts');
const ownership = read('services/ownedStreamingPlatform.ts');

assert(
    cleanStreamingBrandMarkDataUrl('data:image/webp;base64,AAAA') !== null,
    'Canonical WebP marks should survive persistence validation.',
);
assert(
    cleanStreamingBrandMarkDataUrl('data:image/gif;base64,AAAA') === null,
    'Unnormalized animated formats must not enter the save model.',
);
assert(
    cleanStreamingBrandMarkDataUrl(`data:image/webp;base64,${'A'.repeat(STREAMING_BRAND_MARK_DATA_URL_LIMIT)}`) === null,
    'Oversized custom marks must be rejected before save persistence.',
);
assert(
    orchestrator.includes('convertStreamingBrandMark(file)')
        && orchestrator.includes("'converting'")
        && orchestrator.includes('safe area protected'),
    'The live wizard should convert uploads and expose useful processing feedback.',
);
assert(
    visuals.includes("PLAYER_LOCKUP_IDS = ['WORDMARK', 'SIDE', 'STACK']")
        && visuals.includes('deckWordmarkMark')
        && visuals.includes('deckCropSafe'),
    'Wordmark choices must visibly change the lockup and protect rectangular/custom marks.',
);
assert(
    shellCss.includes('.ep2 .deckCropSafe .deckCropMark')
        && shellCss.includes('env(safe-area-inset-right)')
        && shellCss.includes('.ep2 .lockupPreview'),
    'The brand board, progress counter, and visual lockup controls must keep their responsive safeguards.',
);
assert(
    founding.includes("['WORDMARK', 'SIDE', 'STACK', 'ICON']")
        && ownership.includes("['WORDMARK', 'SIDE', 'STACK', 'ICON']")
        && founding.includes('cleanStreamingBrandMarkDataUrl')
        && ownership.includes('cleanStreamingBrandMarkDataUrl'),
    'Founding and ownership persistence must share the same mark and lockup policy.',
);

console.log('Streaming founding brand polish audit passed.');
