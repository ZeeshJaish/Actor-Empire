import React, { useEffect, useState } from 'react';
import { CustomPoster } from '../types';
import { loadMediaBlob } from '../services/mediaStorage';

export const useCustomPosterImageSrc = (poster?: CustomPoster | null) => {
    const [src, setSrc] = useState<string | null>(poster?.imageData || null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        if (poster?.imageData) {
            setSrc(poster.imageData);
            return undefined;
        }

        if (!poster?.posterMediaId) {
            setSrc(null);
            return undefined;
        }

        setSrc(null);
        loadMediaBlob(poster.posterMediaId)
            .then(blob => {
                if (!blob || cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setSrc(null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [poster?.imageData, poster?.posterMediaId]);

    return src;
};

export const CustomPosterImage: React.FC<{
    poster?: CustomPoster | null;
    alt: string;
    className?: string;
    fallback?: React.ReactNode;
}> = ({ poster, alt, className = '', fallback = null }) => {
    const src = useCustomPosterImageSrc(poster);

    if (!src) return <>{fallback}</>;
    return <img src={src} alt={alt} className={className} />;
};
