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
}

export interface TransferMediaRecord extends StoredMediaMeta {
    dataBase64: string;
}

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
        request.onsuccess = () => resolve((request.result as StoredMediaRecord[]).filter(record => record.kind === kind));
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

export const exportMediaTransferRecords = async (): Promise<TransferMediaRecord[]> => {
    const db = await openMediaDB();
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as StoredMediaRecord[]);
    });

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
