import { decodePhoto, PHOTO_SOURCE_LIMIT_BYTES } from './photoIntake';

export const STREAMING_BRAND_MARK_DATA_URL_LIMIT = 1_500_000;
export const STREAMING_BRAND_MARK_SOURCE_LIMIT = PHOTO_SOURCE_LIMIT_BYTES;

const CANONICAL_MARK_PATTERN = /^data:image\/(?:png|jpeg|jpg|webp|svg\+xml);/i;

export const cleanStreamingBrandMarkDataUrl = (value: unknown): string | null => {
    const dataUrl = typeof value === 'string' ? value.trim() : '';
    return CANONICAL_MARK_PATTERN.test(dataUrl) && dataUrl.length <= STREAMING_BRAND_MARK_DATA_URL_LIMIT
        ? dataUrl
        : null;
};

export interface ConvertedStreamingBrandMark {
    dataUrl: string;
    outputType: 'image/webp' | 'image/png';
    sourceWidth: number;
    sourceHeight: number;
    canvasSize: number;
}

interface DecodedImage {
    source: CanvasImageSource;
    width: number;
    height: number;
    dispose: () => void;
}

const renderCanonicalCanvas = (decoded: DecodedImage, size: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Logo processing is unavailable on this device.');

    context.clearRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Protected padding prevents tall, wide, and irregular marks being cut in game tiles.
    const safeSize = size * 0.82;
    const scale = Math.min(safeSize / decoded.width, safeSize / decoded.height);
    const width = Math.max(1, decoded.width * scale);
    const height = Math.max(1, decoded.height * scale);
    context.drawImage(decoded.source, (size - width) / 2, (size - height) / 2, width, height);
    return canvas;
};

/** Normalize a browser-decodable image into a transparent, square safe-area asset. */
export const convertStreamingBrandMark = async (file: File): Promise<ConvertedStreamingBrandMark> => {
    /* 18 Nov 2026: through the game's one photo intake (services/photoIntake.ts).
       - The picture decides, not its label or name.
       - It is turned the right way up.
       - The 80-megapixel and 20,000 px limits this upload already had now apply to every photo in the game. */
    const decoded: DecodedImage = await decodePhoto(file, 1024);
    try {
        if (!decoded.width || !decoded.height) throw new Error('The uploaded image has no readable dimensions.');
        const attempts = [
            { size: 1024, quality: 0.9 },
            { size: 768, quality: 0.84 },
            { size: 512, quality: 0.78 },
            { size: 384, quality: 0.72 },
        ];

        for (const attempt of attempts) {
            const dataUrl = renderCanonicalCanvas(decoded, attempt.size).toDataURL('image/webp', attempt.quality);
            if (cleanStreamingBrandMarkDataUrl(dataUrl)) {
                return {
                    dataUrl,
                    outputType: dataUrl.startsWith('data:image/webp;') ? 'image/webp' : 'image/png',
                    sourceWidth: decoded.width,
                    sourceHeight: decoded.height,
                    canvasSize: attempt.size,
                };
            }
        }
        throw new Error('This logo remains too complex after optimization. Try a simpler PNG, WebP, JPG, or SVG.');
    } finally {
        decoded.dispose();
    }
};
