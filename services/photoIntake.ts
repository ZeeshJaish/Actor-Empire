/**
 * Photo intake (18 Nov 2026). Every picture the player picks enters the game through here:
 * - posters (studio films and Originals);
 * - YouTube thumbnails and Instagram posts;
 * - profile photos;
 * - campaign pictures;
 * - the streaming logo.
 *
 * Why: an Android player said "movie poster is not working". Zeesh: any photo that comes in is converted and
 * compressed, then used in the game in its most optimized form.
 *
 * Before this, each screen had its own copy, and most refused a picture whose file label was not "image/…".
 * Two things broke on real phones:
 * - some Android galleries and cloud photos hand over files with no label;
 * - 48–50 MP cameras make files over the old 12 MB limit.
 * So real photos were turned away.
 *
 * The rules:
 * - The picture decides, not its label. The first bytes say what it is and how big it is, and the browser decodes it.
 * - It is turned the right way up (EXIF orientation) and shrunk to the size the screen needs.
 * - It is written in the smallest format the device can write: WebP; JPEG where WebP cannot be written
 *   (Safari on iPhone); PNG only for a logo that needs its transparency there.
 * - A refusal always gives a clear reason:
 *   - a file over 40 MB;
 *   - a picture over 80 megapixels or 20,000 px a side (the limits the logo upload already used);
 *   - a HEIC photo this device cannot open;
 *   - a file that is not a picture.
 */

export type PhotoIntakeProblem =
    | 'EMPTY'
    | 'TOO_LARGE_FILE'
    | 'TOO_MANY_PIXELS'
    | 'HEIC_UNSUPPORTED'
    | 'NOT_A_PICTURE'
    | 'UNREADABLE'
    | 'NO_CANVAS'
    | 'ENCODE_FAILED';

export const PHOTO_SOURCE_LIMIT_BYTES = 40 * 1024 * 1024;
export const PHOTO_MAX_PIXELS = 80_000_000;
export const PHOTO_MAX_SIDE = 20_000;
/** A working copy for the editors (thumbnail, post, campaign crop): sharp enough to zoom, light enough to drag. */
export const PHOTO_EDITOR_MAX_SIDE = 2048;
/** Above this, decode straight at a smaller size where the device can, so a 50 MP photo never sits in memory whole. */
const FULL_DECODE_PIXEL_BUDGET = 24_000_000;

const MESSAGES: Record<PhotoIntakeProblem, string> = {
    EMPTY: 'That file is empty. Pick another picture.',
    TOO_LARGE_FILE: 'That picture is over 40 MB. Pick a smaller copy, or take a screenshot of it and pick that.',
    TOO_MANY_PIXELS: 'That picture is over 80 megapixels. Pick a smaller copy, or take a screenshot of it and pick that.',
    HEIC_UNSUPPORTED: 'This phone cannot open HEIC photos in the game. Pick a JPG or PNG, or take a screenshot of the photo and pick that.',
    NOT_A_PICTURE: 'That file could not be opened as a picture. Pick a JPG or PNG, or take a screenshot of it and pick that.',
    UNREADABLE: 'Your phone did not let the game read this photo. Save it to your phone, or pick it from the Files app, then try again.',
    NO_CANVAS: 'This phone could not prepare the picture. Close a few apps and try again.',
    ENCODE_FAILED: 'This phone could not save the picture. Try again, or pick a smaller one.',
};

export class PhotoIntakeError extends Error {
    readonly problem: PhotoIntakeProblem;

    constructor(problem: PhotoIntakeProblem) {
        super(MESSAGES[problem]);
        this.name = 'PhotoIntakeError';
        this.problem = problem;
    }
}

export type PhotoFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp' | 'heic' | 'avif' | 'svg' | 'unknown';

export interface PhotoSniff {
    format: PhotoFormat;
    /** The stored size (before any EXIF turn). */
    width?: number;
    height?: number;
    /** JPEG EXIF orientation, 1–8 (5–8 show the picture turned a quarter, so its shown sides are swapped). */
    orientation?: number;
}

/** EXIF orientation from a JPEG APP1 block that starts at `at` (the 0xFF of the marker). */
const readExifOrientation = (bytes: Uint8Array, at: number, length: number): number | undefined => {
    const start = at + 4;
    if (ascii(bytes, start, 4) !== 'Exif' || bytes[start + 4] !== 0 || bytes[start + 5] !== 0) return undefined;
    const tiff = start + 6;
    const end = Math.min(bytes.length, at + 2 + length);
    const little = ascii(bytes, tiff, 2) === 'II';
    if (!little && ascii(bytes, tiff, 2) !== 'MM') return undefined;
    const u16 = (offset: number) => (little ? u16le(bytes, offset) : u16be(bytes, offset));
    const u32 = (offset: number) => (little ? (u16le(bytes, offset) + (u16le(bytes, offset + 2) * 65536)) : u32be(bytes, offset));
    const ifd = tiff + u32(tiff + 4);
    if (ifd + 2 > end) return undefined;
    const entries = u16(ifd);
    for (let index = 0; index < entries; index += 1) {
        const entry = ifd + 2 + index * 12;
        if (entry + 12 > end) return undefined;
        if (u16(entry) === 0x0112) {
            const value = u16(entry + 8);
            return value >= 1 && value <= 8 ? value : undefined;
        }
    }
    return undefined;
};

const ascii = (bytes: Uint8Array, start: number, length: number) => {
    let text = '';
    for (let index = start; index < start + length && index < bytes.length; index += 1) text += String.fromCharCode(bytes[index]);
    return text;
};
const u16be = (bytes: Uint8Array, at: number) => (bytes[at] << 8) | bytes[at + 1];
const u32be = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
const u16le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8);
const u24le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
const i32le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);

/** The format and size the first bytes give, without decoding the picture. */
export const sniffPhotoBytes = (bytes: Uint8Array): PhotoSniff => {
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        /* JPEG: walk the segments; EXIF (APP1) gives the turn, the frame header (SOF) the stored size */
        let at = 2;
        let orientation: number | undefined;
        while (at + 9 < bytes.length) {
            if (bytes[at] !== 0xff) { at += 1; continue; }
            const marker = bytes[at + 1];
            if (marker === 0xff) { at += 1; continue; }
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { at += 2; continue; }
            const length = u16be(bytes, at + 2);
            if (marker === 0xe1 && orientation === undefined) orientation = readExifOrientation(bytes, at, length);
            const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
            if (isFrame) return { format: 'jpeg', height: u16be(bytes, at + 5), width: u16be(bytes, at + 7), orientation };
            if (length < 2) break;
            at += 2 + length;
        }
        return { format: 'jpeg', orientation };
    }
    if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') {
        return { format: 'png', width: u32be(bytes, 16), height: u32be(bytes, 20) };
    }
    if (bytes.length >= 10 && ascii(bytes, 0, 4) === 'GIF8') {
        return { format: 'gif', width: u16le(bytes, 6), height: u16le(bytes, 8) };
    }
    if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
        const chunk = ascii(bytes, 12, 4);
        if (chunk === 'VP8 ') return { format: 'webp', width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
        if (chunk === 'VP8L') {
            const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
            return { format: 'webp', width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
        }
        if (chunk === 'VP8X') return { format: 'webp', width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
        return { format: 'webp' };
    }
    if (bytes.length >= 26 && ascii(bytes, 0, 2) === 'BM') {
        return { format: 'bmp', width: Math.abs(i32le(bytes, 18)), height: Math.abs(i32le(bytes, 22)) };
    }
    if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
        /* HEIF family: the major brand, then the compatible brands, say HEIC or AVIF */
        const boxSize = Math.min(bytes.length, u32be(bytes, 0) || 0);
        const brands = [ascii(bytes, 8, 4)];
        for (let at = 16; at + 4 <= boxSize; at += 4) brands.push(ascii(bytes, at, 4));
        if (brands.some(brand => brand === 'avif' || brand === 'avis')) return { format: 'avif' };
        if (brands.some(brand => HEIF_BRANDS.has(brand)) || brands[0] === 'mif1' || brands[0] === 'msf1') return { format: 'heic' };
        return { format: 'unknown' };
    }
    const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).replace(/^﻿/, '').trimStart();
    if (/^(<\?xml[\s\S]*?)?<svg[\s>]/i.test(head) || (head.startsWith('<?xml') && head.includes('<svg'))) return { format: 'svg' };
    return { format: 'unknown' };
};

/* JPEG keeps its size after big EXIF blocks; 256 KB covers a phone's EXIF and embedded preview. */
const SNIFF_BYTES = 256 * 1024;

export const sniffPhoto = async (file: Blob): Promise<PhotoSniff> => {
    try {
        return sniffPhotoBytes(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()));
    } catch {
        return { format: 'unknown' };
    }
};

const looksHeicByName = (file: Blob) => /\.(heic|heif)$/i.test(String((file as File).name || '')) || /heic|heif/i.test(file.type || '');

const tooManyPixels = (width?: number, height?: number) => Boolean(
    width && height && (width > PHOTO_MAX_SIDE || height > PHOTO_MAX_SIDE || width * height > PHOTO_MAX_PIXELS),
);

export interface DecodedPhoto {
    source: CanvasImageSource;
    width: number;
    height: number;
    sniff: PhotoSniff;
    dispose: () => void;
}

const decodeWithBitmap = async (file: Blob, resize?: { width: number; height: number }): Promise<Omit<DecodedPhoto, 'sniff'>> => {
    const options: ImageBitmapOptions = { imageOrientation: 'from-image' };
    if (resize) Object.assign(options, { resizeWidth: resize.width, resizeHeight: resize.height, resizeQuality: 'high' });
    const bitmap = await createImageBitmap(file, options);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
};

const decodeWithImageElement = (file: Blob): Promise<Omit<DecodedPhoto, 'sniff'>> => new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve({
        source: image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        dispose: () => URL.revokeObjectURL(objectUrl),
    });
    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('image element could not decode'));
    };
    image.src = objectUrl;
});

/* ---------- 21 Nov 2026: a second chance, ONLY after both ways above failed ----------
   YNDBABU12 (Samsung, 1.0.30): a plain Gallery JPG "could not be opened as a picture", and his save holds no uploaded
   picture at all, so no pick ever worked on that phone. The two ways above decode the picked file as the phone hands
   it over. Here, and only here (a phone where they work never reaches this, so its pictures come out exactly as
   before), the file is read into memory and that copy is decoded the same two ways, then through a data URL. A phone
   that will not hand over the bytes at all gets its own message. Every outcome here is reported with what failed, so
   the next report names its cause instead of "not a picture". */
const errorName = (error: unknown): string => (error instanceof Error ? (error.name || 'Error') : typeof error);

const readBlobBytes = (file: Blob): Promise<ArrayBuffer> => {
    if (typeof (file as any).arrayBuffer === 'function') return (file as any).arrayBuffer();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error || new Error('read failed'));
        reader.readAsArrayBuffer(file);
    });
};

const SNIFF_MIME: Partial<Record<PhotoFormat, string>> = {
    jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif',
};

const decodeWithDataUrl = (bytes: ArrayBuffer, type: string): Promise<Omit<DecodedPhoto, 'sniff'>> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('data url read failed'));
    reader.onload = () => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve({
            source: image,
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
            dispose: () => undefined,
        });
        image.onerror = () => reject(new Error('data url could not decode'));
        image.src = String(reader.result || '');
    };
    reader.readAsDataURL(new Blob([bytes], { type }));
});

interface PhotoRecovery {
    decoded: Omit<DecodedPhoto, 'sniff'> | null;
    unreadable: boolean;
    steps: string[];
}

const decodeFromMemoryCopy = async (file: Blob, sniff: PhotoSniff, targetMaxSide: number): Promise<PhotoRecovery> => {
    const steps: string[] = [];
    let bytes: ArrayBuffer | null = null;
    try {
        bytes = await readBlobBytes(file);
        steps.push(`read:${bytes.byteLength}`);
    } catch (error) {
        steps.push(`read:${errorName(error)}`);
    }
    if (!bytes || !bytes.byteLength) return { decoded: null, unreadable: true, steps };
    const type = SNIFF_MIME[sniff.format] || file.type || 'image/jpeg';
    const copy = new Blob([bytes], { type });
    const usable = (decoded: Omit<DecodedPhoto, 'sniff'> | null, step: string) => {
        if (decoded && decoded.width && decoded.height) {
            steps.push(`${step}:ok`);
            return decoded;
        }
        decoded?.dispose();
        steps.push(`${step}:empty`);
        return null;
    };
    if (typeof createImageBitmap === 'function' && sniff.format !== 'svg') {
        const big = sniff.width && sniff.height && sniff.width * sniff.height > FULL_DECODE_PIXEL_BUDGET;
        if (big) {
            const quarterTurn = (sniff.orientation || 1) >= 5;
            const shownWidth = quarterTurn ? sniff.height! : sniff.width!;
            const shownHeight = quarterTurn ? sniff.width! : sniff.height!;
            const side = Math.max(targetMaxSide, PHOTO_EDITOR_MAX_SIDE);
            const scaled = fitPhotoInside(shownWidth, shownHeight, side, side);
            try {
                const decoded = usable(await decodeWithBitmap(copy, scaled), 'bitmap-copy-scaled');
                if (decoded && decoded.width === scaled.width && decoded.height === scaled.height) return { decoded, unreadable: false, steps };
                decoded?.dispose();
            } catch (error) {
                steps.push(`bitmap-copy-scaled:${errorName(error)}`);
            }
        }
        try {
            const decoded = usable(await decodeWithBitmap(copy), 'bitmap-copy');
            if (decoded) return { decoded, unreadable: false, steps };
        } catch (error) {
            steps.push(`bitmap-copy:${errorName(error)}`);
        }
    }
    try {
        const decoded = usable(await decodeWithImageElement(copy), 'image-copy');
        if (decoded) return { decoded, unreadable: false, steps };
    } catch (error) {
        steps.push(`image-copy:${errorName(error)}`);
    }
    try {
        const decoded = usable(await decodeWithDataUrl(bytes, type), 'data-url');
        if (decoded) return { decoded, unreadable: false, steps };
    } catch (error) {
        steps.push(`data-url:${errorName(error)}`);
    }
    return { decoded: null, unreadable: false, steps };
};

/** The WebView's Chrome version from its user agent ("Chrome/91.0.4472.114" → "91.0.4472.114"). */
const webViewVersion = (): string => {
    try {
        return (globalThis.navigator?.userAgent || '').match(/Chrome\/([\d.]+)/)?.[1] || 'none';
    } catch {
        return 'unknown';
    }
};

const reportPhotoRecovery = (file: Blob, sniff: PhotoSniff, recovery: PhotoRecovery) => {
    const name = String((file as File).name || '');
    const context = {
        photo_size: file.size,
        photo_type: file.type || 'none',
        photo_ext: (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || 'none').toLowerCase(),
        photo_format: sniff.format,
        photo_dims: sniff.width && sniff.height ? `${sniff.width}x${sniff.height}` : 'unknown',
        photo_steps: recovery.steps.join('|').slice(0, 240),
        photo_recovered: Boolean(recovery.decoded),
        webview: webViewVersion(),
    };
    /* Loaded only here, so the normal path does not even import it. Vite turns import.meta.glob into the same lazy import
       as a plain import(). The audits bundle with plain esbuild, which leaves it alone (there it throws and nothing is
       sent), so an audit that touches a photo does not pull in all of firebaseService and the music CSV it reaches. */
    let loadFirebaseService: (() => Promise<typeof import('./firebaseService')>) | undefined;
    try {
        loadFirebaseService = import.meta.glob('./firebaseService.ts')['./firebaseService.ts'] as typeof loadFirebaseService;
    } catch {
        return;
    }
    if (!loadFirebaseService) return;
    void loadFirebaseService()
        .then(service => service.recordNonFatal(
            new Error(recovery.decoded ? 'photo decoded from a memory copy' : 'photo could not be decoded'),
            recovery.decoded ? 'photo_intake_recovered' : 'photo_intake_failed',
            context,
        ))
        .catch(() => undefined);
};

/** The size a picture is drawn at, at most `maxWidth` × `maxHeight`, never enlarged. */
export const fitPhotoInside = (width: number, height: number, maxWidth: number, maxHeight: number) => {
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
};

/**
 * Decodes a picked file by what it is, not what it is called. `targetMaxSide` is a hint: a very large photo is decoded
 * straight at about that size where the device can, so it never sits in memory whole.
 */
export const decodePhoto = async (file: Blob, targetMaxSide = PHOTO_EDITOR_MAX_SIDE): Promise<DecodedPhoto> => {
    if (!file || !file.size) throw new PhotoIntakeError('EMPTY');
    if (file.size > PHOTO_SOURCE_LIMIT_BYTES) throw new PhotoIntakeError('TOO_LARGE_FILE');
    const sniff = await sniffPhoto(file);
    if (tooManyPixels(sniff.width, sniff.height)) throw new PhotoIntakeError('TOO_MANY_PIXELS');

    let decoded: Omit<DecodedPhoto, 'sniff'> | null = null;
    if (typeof createImageBitmap === 'function' && sniff.format !== 'svg') {
        const big = sniff.width && sniff.height && sniff.width * sniff.height > FULL_DECODE_PIXEL_BUDGET;
        if (big) {
            /* ask for the size as shown (EXIF 5–8 swap the sides). A device that resizes before it turns, or ignores the
               resize, hands back other sides: that copy is dropped and the picture is decoded whole instead. */
            const quarterTurn = (sniff.orientation || 1) >= 5;
            const shownWidth = quarterTurn ? sniff.height! : sniff.width!;
            const shownHeight = quarterTurn ? sniff.width! : sniff.height!;
            const side = Math.max(targetMaxSide, PHOTO_EDITOR_MAX_SIDE);
            const scaled = fitPhotoInside(shownWidth, shownHeight, side, side);
            try { decoded = await decodeWithBitmap(file, scaled); } catch { decoded = null; }
            if (decoded && (decoded.width !== scaled.width || decoded.height !== scaled.height)) {
                decoded.dispose();
                decoded = null;
            }
        }
        if (!decoded) {
            try { decoded = await decodeWithBitmap(file); } catch { decoded = null; }
        }
    }
    if (!decoded) {
        try { decoded = await decodeWithImageElement(file); } catch { decoded = null; }
    }
    if (!decoded || !decoded.width || !decoded.height) {
        decoded?.dispose();
        decoded = null;
        if (sniff.format === 'heic' || (sniff.format === 'unknown' && looksHeicByName(file))) {
            throw new PhotoIntakeError('HEIC_UNSUPPORTED');
        }
        /* 21 Nov 2026: only here, after both ways failed (see decodeFromMemoryCopy) */
        const recovery = await decodeFromMemoryCopy(file, sniff, targetMaxSide);
        reportPhotoRecovery(file, sniff, recovery);
        if (!recovery.decoded) throw new PhotoIntakeError(recovery.unreadable ? 'UNREADABLE' : 'NOT_A_PICTURE');
        decoded = recovery.decoded;
    }
    if (tooManyPixels(decoded.width, decoded.height)) {
        decoded.dispose();
        throw new PhotoIntakeError('TOO_MANY_PIXELS');
    }
    return { ...decoded, sniff };
};

const releaseCanvas = (canvas: HTMLCanvasElement) => {
    /* iOS keeps canvas memory until the canvas is shrunk */
    canvas.width = 0;
    canvas.height = 0;
};

export interface PhotoDrawOptions {
    /** Paint this colour under the picture (needed for JPEG, which has no transparency). Omit to keep transparency. */
    background?: string;
}

/** Draws a decoded picture into a new canvas of `width` × `height`. */
export const drawPhoto = (decoded: Pick<DecodedPhoto, 'source' | 'width' | 'height'>, width: number, height: number, options: PhotoDrawOptions = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: !options.background });
    if (!context) {
        releaseCanvas(canvas);
        throw new PhotoIntakeError('NO_CANVAS');
    }
    if (options.background) {
        context.fillStyle = options.background;
        context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, width, height);
    return canvas;
};

const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob | null>(resolve => {
    try { canvas.toBlob(resolve, type, quality); } catch { resolve(null); }
});

/** The smallest file the device can write: WebP, else JPEG (or PNG when transparency must stay). */
export const encodePhotoCanvas = async (canvas: HTMLCanvasElement, { quality = 0.82, keepAlpha = false } = {}): Promise<Blob> => {
    const webp = await canvasBlob(canvas, 'image/webp', quality);
    if (webp && webp.size > 0 && webp.type === 'image/webp') return webp;
    const fallback = await canvasBlob(canvas, keepAlpha ? 'image/png' : 'image/jpeg', quality);
    if (fallback && fallback.size > 0) return fallback;
    throw new PhotoIntakeError('ENCODE_FAILED');
};

export interface PreparedPhoto {
    blob: Blob;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
}

export interface PreparePhotoOptions {
    maxWidth: number;
    maxHeight: number;
    quality?: number;
    /** Keep transparency (logos). Photos are painted on `background` so a JPEG fallback has no black holes. */
    keepAlpha?: boolean;
    background?: string;
}

/** A picked file as the game keeps it: the right way up, no bigger than the box, in the smallest format. */
export const preparePhoto = async (file: Blob, options: PreparePhotoOptions): Promise<PreparedPhoto> => {
    const decoded = await decodePhoto(file, Math.max(options.maxWidth, options.maxHeight));
    try {
        const size = fitPhotoInside(decoded.width, decoded.height, options.maxWidth, options.maxHeight);
        const canvas = drawPhoto(decoded, size.width, size.height, { background: options.keepAlpha ? undefined : (options.background || '#09090b') });
        try {
            const blob = await encodePhotoCanvas(canvas, { quality: options.quality, keepAlpha: options.keepAlpha });
            return { blob, ...size, sourceWidth: decoded.width, sourceHeight: decoded.height };
        } finally {
            releaseCanvas(canvas);
        }
    } finally {
        decoded.dispose();
    }
};

export interface PhotoForEditor extends PreparedPhoto {
    /** An object URL of `blob`; the caller revokes it. */
    url: string;
}

/** A working copy for a screen that lets the player zoom, move or crop: at most 2048 px a side, as an object URL. */
export const preparePhotoForEditor = async (file: Blob, maxSide = PHOTO_EDITOR_MAX_SIDE): Promise<PhotoForEditor> => {
    const photo = await preparePhoto(file, { maxWidth: maxSide, maxHeight: maxSide, quality: 0.9 });
    return { ...photo, url: URL.createObjectURL(photo.blob) };
};

/** A small picture kept inside the save (profile photos): a JPEG data URL, as the save has always held them. */
export const preparePhotoDataUrl = async (file: Blob, { maxSide, quality = 0.7 }: { maxSide: number; quality?: number }): Promise<string> => {
    const decoded = await decodePhoto(file, maxSide);
    try {
        const size = fitPhotoInside(decoded.width, decoded.height, maxSide, maxSide);
        const canvas = drawPhoto(decoded, size.width, size.height, { background: '#09090b' });
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (!dataUrl.startsWith('data:image/')) throw new PhotoIntakeError('ENCODE_FAILED');
            return dataUrl;
        } finally {
            releaseCanvas(canvas);
        }
    } finally {
        decoded.dispose();
    }
};

/** An image element for a URL (for editors that draw from an element). */
export const loadPhotoElement = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PhotoIntakeError('NOT_A_PICTURE'));
    image.src = url;
});

/** The player-facing reason for a failed pick. */
export const photoIntakeMessage = (error: unknown, fallback = MESSAGES.NOT_A_PICTURE) => (
    error instanceof PhotoIntakeError ? error.message : fallback
);
