import React from 'react';

export const Glyph: React.FC<{ id: string; size?: number }> = ({ id, size = 20 }) => {
  const paths: Record<string, React.ReactNode> = {
    reel: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v14M16 5v14M3 12h18" /></>,
    tv: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 3l4 4 4-4" /></>,
    play: <><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M11 10l4 2-4 2z" fill="currentColor" /></>,
    share: <><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>,
    camera: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-3h5L16 7" /></>,
    star: <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z" />,
    megaphone: <><path d="M4 10v4a1 1 0 001 1h2l7 4V5L7 9H5a1 1 0 00-1 1z" /><path d="M17 9a4 4 0 010 6" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    signal: <><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M6 6a9 9 0 000 12M18 6a9 9 0 010 12" /></>,
    bolt: <path d="M13 2L5 13h6l-1 9 8-11h-6z" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[id] ?? paths.reel}
    </svg>
  );
};
