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
    loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
    decoding?: React.ImgHTMLAttributes<HTMLImageElement>['decoding'];
}> = ({
    poster,
    alt,
    className = '',
    fallback = null,
    loading = 'lazy',
    decoding = 'async',
}) => {
    const src = useCustomPosterImageSrc(poster);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    if (!src || failedSrc === src) return <>{fallback}</>;
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            decoding={decoding}
            onError={() => setFailedSrc(src)}
        />
    );
};
