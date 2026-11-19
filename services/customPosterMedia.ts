import { CustomPoster, Player } from '../types';
import { saveMediaBlob, StoredMediaMeta } from './mediaStorage';
import { encodePhotoCanvas, PHOTO_SOURCE_LIMIT_BYTES, preparePhoto } from './photoIntake';

export const MAX_CUSTOM_POSTER_SOURCE_BYTES = PHOTO_SOURCE_LIMIT_BYTES;
const POSTER_MAX_WIDTH = 900;
const POSTER_MAX_HEIGHT = 1350;
const POSTER_WEBP_QUALITY = 0.8;
const EMBEDDED_IMAGE_PREFIX = 'data:image/';

export interface CustomPosterBlobResult {
    blob: Blob;
    width?: number;
    height?: number;
}

export interface CustomPosterExternalizeResult<T extends Player = Player> {
    player: T;
    migratedCount: number;
    bytesRemoved: number;
}

const getPosterProjectId = (holder: any, fallback: string) => (
    String(holder?.id || holder?.projectId || holder?.title || holder?.name || fallback)
        .replace(/[^a-z0-9_-]+/gi, '_')
        .slice(0, 80)
        || fallback
);

export const hasCustomPosterImage = (poster?: CustomPoster | null): boolean => (
    Boolean(
        poster &&
        (poster.type === 'IMAGE' || poster.type === 'CANVA') &&
        (poster.posterMediaId || poster.imageData)
    )
);

const loadImage = (src: string): Promise<HTMLImageElement> => (
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not read poster image.'));
        image.src = src;
    })
);

const getFittedPosterSize = (width: number, height: number) => {
    const ratio = Math.min(POSTER_MAX_WIDTH / width, POSTER_MAX_HEIGHT / height, 1);
    return {
        width: Math.max(1, Math.round(width * ratio)),
        height: Math.max(1, Math.round(height * ratio)),
    };
};

/* 18 Nov 2026: a picked poster goes through the game's one photo intake (services/photoIntake.ts):
   - the picture decides, not the file label some Android galleries leave empty;
   - big phone photos are shrunk instead of refused;
   - EXIF turns are honoured;
   - it is written as WebP, or as JPEG where the device cannot write WebP. */
export const createCustomPosterBlobFromFile = async (file: File): Promise<CustomPosterBlobResult> => {
    const photo = await preparePhoto(file, { maxWidth: POSTER_MAX_WIDTH, maxHeight: POSTER_MAX_HEIGHT, quality: POSTER_WEBP_QUALITY });
    return { blob: photo.blob, width: photo.width, height: photo.height };
};

const createCustomPosterBlobFromDataUrl = async (dataUrl: string): Promise<CustomPosterBlobResult> => {
    const image = await loadImage(dataUrl);
    const size = getFittedPosterSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare poster image.');
    context.fillStyle = '#09090b';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    /* WebP, or JPEG where the device cannot write WebP (Safari used to write a PNG several times bigger) */
    const blob = await encodePhotoCanvas(canvas, { quality: POSTER_WEBP_QUALITY });
    canvas.width = 0;
    canvas.height = 0;
    return { blob, ...size };
};

const dataUrlToBlob = (dataUrl: string): Blob | null => {
    if (!dataUrl.startsWith(EMBEDDED_IMAGE_PREFIX)) return null;
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) return null;
    const header = dataUrl.slice(0, commaIndex);
    const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'image/webp';
    const payload = dataUrl.slice(commaIndex + 1);
    const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
};

export const saveCustomPosterMedia = async (
    projectId: string,
    blob: Blob,
    dimensions?: { width?: number; height?: number }
): Promise<StoredMediaMeta> => {
    const safeProjectId = getPosterProjectId({ id: projectId }, 'project');
    return saveMediaBlob(
        `prod_poster_${safeProjectId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        blob,
        {
            kind: 'production_poster',
            width: dimensions?.width,
            height: dimensions?.height,
        }
    );
};

type PosterVisitor = (poster: CustomPoster, holder: any, fallbackId: string) => void | Promise<void>;

const visitCustomPosterHolders = async (player: any, visitor: PosterVisitor) => {
    const visit = async (holder: any, fallbackId: string) => {
        const poster = holder?.customPoster;
        if (poster) await visitor(poster, holder, fallbackId);
    };

    for (const [index, project] of (player?.pastProjects || []).entries()) {
        await visit(project, `past_${index}`);
    }
    for (const [index, release] of (player?.activeReleases || []).entries()) {
        await visit(release?.projectDetails, `release_${index}`);
    }
    for (const [index, commitment] of (player?.commitments || []).entries()) {
        await visit(commitment?.projectDetails, `commitment_${index}`);
    }
    for (const [businessIndex, business] of (player?.businesses || []).entries()) {
        for (const [index, project] of ((business as any)?.library || []).entries()) {
            await visit(project, `business_${businessIndex}_library_${index}`);
        }
        for (const [index, concept] of ((business as any)?.studioState?.concepts || []).entries()) {
            await visit(concept, `business_${businessIndex}_concept_${index}`);
        }
        for (const [index, script] of ((business as any)?.studioState?.scripts || []).entries()) {
            await visit(script, `business_${businessIndex}_script_${index}`);
        }
    }
};

/* Perf plan (2026-11-08): does this career still carry a picture inside the save, one that
   externalizeCustomPostersInPlayer would move out (and so write)? Reads only. */
export const hasEmbeddedCustomPosters = async (player: Player): Promise<boolean> => {
    let found = false;
    await visitCustomPosterHolders(player, async (poster) => {
        if (poster.imageData) found = true;
    });
    return found;
};

export const externalizeCustomPostersInPlayer = async <T extends Player>(player: T): Promise<CustomPosterExternalizeResult<T>> => {
    let migratedCount = 0;
    let bytesRemoved = 0;
    const mediaIdsByDataUrl = new Map<string, string>();

    await visitCustomPosterHolders(player, async (poster, holder, fallbackId) => {
        if (!poster.imageData || poster.posterMediaId) {
            if (poster.posterMediaId && poster.imageData) {
                bytesRemoved += poster.imageData.length;
                delete poster.imageData;
            }
            return;
        }

        const cachedMediaId = mediaIdsByDataUrl.get(poster.imageData);
        if (cachedMediaId) {
            poster.posterMediaId = cachedMediaId;
            bytesRemoved += poster.imageData.length;
            delete poster.imageData;
            migratedCount += 1;
            return;
        }

        const fallbackBlob = dataUrlToBlob(poster.imageData);
        if (!fallbackBlob) return;

        let posterBlob: CustomPosterBlobResult = { blob: fallbackBlob };
        try {
            posterBlob = await createCustomPosterBlobFromDataUrl(poster.imageData);
        } catch {
            posterBlob = { blob: fallbackBlob };
        }

        const media = await saveCustomPosterMedia(getPosterProjectId(holder, fallbackId), posterBlob.blob, {
            width: posterBlob.width,
            height: posterBlob.height,
        });
        mediaIdsByDataUrl.set(poster.imageData, media.id);
        poster.posterMediaId = media.id;
        bytesRemoved += poster.imageData.length;
        delete poster.imageData;
        migratedCount += 1;
    });

    return { player, migratedCount, bytesRemoved };
};

export const stripEmbeddedPosterImageDataForPersistence = <T extends Player>(player: T): T => {
    const strip = (holder: any) => {
        const poster = holder?.customPoster as CustomPoster | undefined;
        if (poster?.posterMediaId && poster.imageData) {
            delete poster.imageData;
        }
    };

    (player?.pastProjects || []).forEach(strip);
    (player?.activeReleases || []).forEach((release: any) => strip(release?.projectDetails));
    (player?.commitments || []).forEach((commitment: any) => strip(commitment?.projectDetails));
    (player?.businesses || []).forEach((business: any) => {
        (business?.library || []).forEach(strip);
        (business?.studioState?.concepts || []).forEach(strip);
        (business?.studioState?.scripts || []).forEach(strip);
    });

    return player;
};
