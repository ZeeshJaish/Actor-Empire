const DB_NAME = 'ActorEmpireMediaDB';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export interface StoredMediaMeta {
    id: string;
    kind: 'youtube_thumbnail' | 'instagram_post' | 'x_post' | 'profile_image' | 'production_poster' | 'other';
    mimeType: string;
    size: number;
    createdAt: number;
    width?: number;
    height?: number;
}

interface StoredMediaRecord extends StoredMediaMeta {
    blob: Blob;
    importBatchId?: string;
    importOriginalId?: string;
    stagedAt?: number;
}

export interface BinaryMediaTransferRecord extends StoredMediaMeta {
    blob: Blob;
}

export interface TransferMediaRecord extends StoredMediaMeta {
    dataBase64: string;
}

export interface MediaTransferInventory {
    count: number;
    totalBytes: number;
    largestRecordBytes: number;
    recordBytes: number[];
}

export const summarizeMediaTransferInventory = (
    records: Array<{ size: number }>
): MediaTransferInventory => {
    const recordBytes = records.map(record => (
        Number.isFinite(record.size) && record.size > 0 ? Math.floor(record.size) : 0
    ));
    return {
        count: recordBytes.length,
        totalBytes: recordBytes.reduce((sum, bytes) => sum + bytes, 0),
        largestRecordBytes: Math.max(0, ...recordBytes),
        recordBytes,
    };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
};

const base64ToBytes = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
};

const openMediaDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveMediaBlob = async (
    id: string,
    blob: Blob,
    meta: Omit<StoredMediaMeta, 'id' | 'size' | 'createdAt' | 'mimeType'>
): Promise<StoredMediaMeta> => {
    const db = await openMediaDB();
    const record: StoredMediaRecord = {
        id,
        blob,
        kind: meta.kind,
        width: meta.width,
        height: meta.height,
        mimeType: blob.type || 'application/octet-stream',
        size: blob.size,
        createdAt: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });

    const { blob: _blob, ...savedMeta } = record;
    return savedMeta;
};

export const loadMediaBlob = async (id: string): Promise<Blob | null> => {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as StoredMediaRecord | undefined)?.blob || null);
    });
};

export const deleteMediaBlob = async (id: string): Promise<void> => {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const pruneMediaStore = async (
    kind: StoredMediaMeta['kind'],
    options: { maxItems?: number; maxBytes?: number }
): Promise<void> => {
    const db = await openMediaDB();
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as StoredMediaRecord[]).filter(record => !record.importBatchId && record.kind === kind));
    });

    const sorted = records.sort((a, b) => b.createdAt - a.createdAt);
    const maxItems = options.maxItems ?? Number.POSITIVE_INFINITY;
    const maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
    let keptBytes = 0;
    const deleteIds: string[] = [];

    sorted.forEach((record, index) => {
        keptBytes += record.size;
        if (index >= maxItems || keptBytes > maxBytes) {
            deleteIds.push(record.id);
        }
    });

    if (deleteIds.length === 0) return;

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        deleteIds.forEach(id => store.delete(id));
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
};

const loadStoredMediaRecords = async (): Promise<StoredMediaRecord[]> => {
    const db = await openMediaDB();
    return new Promise<StoredMediaRecord[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as StoredMediaRecord[]).filter(record => !record.importBatchId));
    });
};

export const listMediaTransferBlobs = async (): Promise<BinaryMediaTransferRecord[]> => {
    const records = await loadStoredMediaRecords();
    return records.map(record => ({
        id: record.id,
        kind: record.kind,
        mimeType: record.mimeType,
        size: record.blob.size,
        createdAt: record.createdAt,
        width: record.width,
        height: record.height,
        blob: record.blob,
    }));
};

const IMPORT_CANDIDATE_PREFIX = '__actorEmpireMediaImportCandidate__:';

const candidateMediaId = (batchId: string, originalId: string) => (
    `${IMPORT_CANDIDATE_PREFIX}${batchId}:${originalId}`
);

export const stageMediaTransferBlob = async (
    batchId: string,
    record: BinaryMediaTransferRecord,
): Promise<void> => {
    if (!batchId || !record.id || !(record.blob instanceof Blob) || record.blob.size !== record.size) {
        throw new Error('Media import candidate is invalid.');
    }
    const db = await openMediaDB();
    const staged: StoredMediaRecord = {
        ...record,
        id: candidateMediaId(batchId, record.id),
        size: record.blob.size,
        mimeType: record.mimeType || record.blob.type || 'application/octet-stream',
        importBatchId: batchId,
        importOriginalId: record.id,
        stagedAt: Date.now(),
    };
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put(staged);
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();
        });
        const verified = await new Promise<StoredMediaRecord | null>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(staged.id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve((request.result as StoredMediaRecord | undefined) || null);
        });
        if (!verified || verified.blob.size !== record.size || verified.importOriginalId !== record.id) {
            throw new Error('Media import candidate failed read-back verification.');
        }
    } finally {
        db.close();
    }
};

export const discardStagedMediaTransferBatch = async (batchId: string): Promise<void> => {
    if (!batchId) return;
    const db = await openMediaDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                (request.result as StoredMediaRecord[])
                    .filter(record => record.importBatchId === batchId)
                    .forEach(record => store.delete(record.id));
            };
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();
        });
    } finally {
        db.close();
    }
};

export const promoteStagedMediaTransferBatch = async (
    batchId: string,
    expectedOriginalIds: string[],
): Promise<number> => {
    const expected = new Set(expectedOriginalIds);
    if (!batchId || expected.size !== expectedOriginalIds.length) throw new Error('Media import batch is invalid.');
    const db = await openMediaDB();
    try {
        return await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            let promoted = 0;
            let validationError: Error | null = null;
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const candidates = (request.result as StoredMediaRecord[]).filter(record => record.importBatchId === batchId);
                const actual = new Set(candidates.map(record => record.importOriginalId || ''));
                if (candidates.length !== expected.size || actual.size !== expected.size || [...expected].some(id => !actual.has(id))) {
                    validationError = new Error('Staged media batch is incomplete.');
                    transaction.abort();
                    return;
                }
                for (const candidate of candidates) {
                    const originalId = candidate.importOriginalId as string;
                    const {
                        importBatchId: _batch,
                        importOriginalId: _original,
                        stagedAt: _stagedAt,
                        ...active
                    } = candidate;
                    store.put({ ...active, id: originalId } satisfies StoredMediaRecord);
                    store.delete(candidate.id);
                    promoted += 1;
                }
            };
            transaction.onerror = () => reject(transaction.error || validationError);
            transaction.onabort = () => reject(validationError || transaction.error || new Error('Media import promotion aborted.'));
            transaction.oncomplete = () => resolve(promoted);
        });
    } finally {
        db.close();
    }
};

export const exportMediaTransferRecords = async (
    options: { beforeEncoding?: (inventory: MediaTransferInventory) => void | Promise<void> } = {},
    dependencies: { loadRecords: () => Promise<StoredMediaRecord[]> } = { loadRecords: loadStoredMediaRecords },
): Promise<TransferMediaRecord[]> => {
    const records = await dependencies.loadRecords();
    await options.beforeEncoding?.(summarizeMediaTransferInventory(records));

    const transferRecords: TransferMediaRecord[] = [];
    for (const record of records) {
        transferRecords.push({
            id: record.id,
            kind: record.kind,
            mimeType: record.mimeType,
            size: record.size,
            createdAt: record.createdAt,
            width: record.width,
            height: record.height,
            dataBase64: arrayBufferToBase64(await record.blob.arrayBuffer()),
        });
    }
    return transferRecords;
};

export const importMediaTransferRecords = async (records: TransferMediaRecord[] = []): Promise<number> => {
    if (!Array.isArray(records) || records.length === 0) return 0;
    const db = await openMediaDB();
    let imported = 0;

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        records.forEach(record => {
            if (!record?.id || typeof record.dataBase64 !== 'string') return;
            const bytes = base64ToBytes(record.dataBase64);
            const blob = new Blob([bytes], { type: record.mimeType || 'application/octet-stream' });
            const mediaRecord: StoredMediaRecord = {
                id: String(record.id),
                kind: record.kind || 'other',
                mimeType: blob.type || 'application/octet-stream',
                size: blob.size,
                createdAt: Number.isFinite(record.createdAt) ? record.createdAt : Date.now(),
                width: Number.isFinite(record.width) ? record.width : undefined,
                height: Number.isFinite(record.height) ? record.height : undefined,
                blob,
            };
            store.put(mediaRecord);
            imported += 1;
        });
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });

    return imported;
};
