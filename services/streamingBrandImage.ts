export const STREAMING_BRAND_MARK_DATA_URL_LIMIT = 1_500_000;
export const STREAMING_BRAND_MARK_SOURCE_LIMIT = 12 * 1024 * 1024;

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

const decodeWithImageElement = (file: File): Promise<DecodedImage> => new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl),
    });
    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('This image format cannot be decoded on this device. Export it as PNG, WebP, JPG, or SVG and try again.'));
    };
    image.src = objectUrl;
});

const decodeImage = async (file: File): Promise<DecodedImage> => {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file);
            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                dispose: () => bitmap.close(),
            };
        } catch {
            // SVG and a few mobile formats decode more reliably through an image element.
        }
    }
    return decodeWithImageElement(file);
};

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
    const recognizedImageExtension = /\.(?:png|jpe?g|webp|svg|gif|bmp|avif|heic|heif)$/i.test(file.name);
    if (!file.type.startsWith('image/') && !recognizedImageExtension) throw new Error('Choose an image file for your platform mark.');
    if (file.size > STREAMING_BRAND_MARK_SOURCE_LIMIT) throw new Error('That image is too large. Choose a file under 12 MB.');

    const decoded = await decodeImage(file);
    try {
        if (!decoded.width || !decoded.height) throw new Error('The uploaded image has no readable dimensions.');
        if (decoded.width > 20_000 || decoded.height > 20_000 || decoded.width * decoded.height > 80_000_000) {
            throw new Error('That image has extreme dimensions. Resize it below 80 megapixels and try again.');
        }
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
