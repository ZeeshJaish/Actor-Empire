/**
 * A picture from the game's media store, by id (#149: a campaign's picture on its news story, its X posts). It loads
 * once on screen and shows nothing while it loads or if the picture is gone (another device, a cleared store).
 */
import React, { useEffect, useState } from 'react';
import { loadMediaBlob } from '../services/mediaStorage';

export const StoredMediaImage: React.FC<{ mediaId: string; className?: string; alt?: string }> = ({ mediaId, className, alt = '' }) => {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        let url: string | null = null;
        setSrc(null);
        loadMediaBlob(mediaId).then(blob => {
            if (!blob || !alive) return;
            url = URL.createObjectURL(blob);
            setSrc(url);
        }).catch(() => undefined);
        return () => {
            alive = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [mediaId]);
    return src ? <img src={src} alt={alt} className={className} loading="lazy" decoding="async" draggable={false} /> : null;
};
