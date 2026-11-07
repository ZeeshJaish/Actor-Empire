/* The brand studio (#116) in a browser: ?live=0 before launch, ?wait=2 the last new look 2 weeks ago, ?tab=IDENT or
   FRONT to open on that tab (#119), ?kit= the kit in use. Applying here changes this page only; nothing saves. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import { StreamingBrandStudio } from '../../components/streaming-transplant/StreamingBrandStudio';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import { STREAMING_STOREFRONT_LAYOUTS } from '../../services/streamingStorefront';

const query = new URLSearchParams(window.location.search);
const brand: Brand = {
  name: 'NORTHSTAR+', markId: 'BOLT', customMark: null, hue: 214, sat: 80, identId: 'PULSE', customIdent: null, promiseId: 'BALANCED',
  publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'badge', identLen: 2, ratingId: 'ALL',
  lockupId: 'SIDE', serverCity: null,
};
const locked: Record<string, [string, string]> = { marquee: ['Smart TV apps', 'APPS_TV'], 'split-hero': ['Smart TV apps', 'APPS_TV'], mosaic: ['Personal artwork and trailers', 'AI_ARTWORK'], 'freeform-canvas': ['VR and holo screens', 'APPS_HOLO'],
  /* #122 */ coverflow: ['Smart TV apps', 'APPS_TV'], bento: ['Personal artwork and trailers', 'AI_ARTWORK'], orbit: ['VR and holo screens', 'APPS_HOLO'] };
const App = () => {
  const [note, setNote] = useState('');
  return (
    <>
      <StreamingBrandStudio
        brand={brand}
        view={{ live: query.get('live') !== '0', look: { visualMarkId: 'BOLT', customMarkDataUrl: null, primaryColor: '#4b8ff0', secondaryColor: '#3a2410', typefaceId: 'GROTESK', wordmarkStyleId: 'SIDE' },
          lookCost: 6_200_000, lookWaitWeeks: Number(query.get('wait') || 0), identWaitWeeks: 0, treasury: 480_000_000 }}
        ident={{ soundIdentKey: 'PULSE', packageId: (query.get('kit') as never) || 'STANDARD' }}
        initialTab={(query.get('tab') as never) || 'LOOK'}
        identLocks={{ GENRE: { techId: 'AI_BECAUSE', tech: 'Because you watched' }, ADAPTIVE: { techId: 'AI_ARTWORK', tech: 'Personal artwork and trailers' }, LIVING: { techId: 'AI_TASTE', tech: 'Taste engine' } }}
        frontPage={{ currentId: 'cinema', layouts: STREAMING_STOREFRONT_LAYOUTS.map(layout => ({ id: layout.id, name: layout.name, line: layout.line, composition: layout.composition, category: layout.category, locked: locked[layout.id]?.[0] ?? null, lockTech: (locked[layout.id]?.[1] ?? null) as never })) }}
        onApplyLook={() => { setNote('look'); return { ok: true, message: 'New look unveiled for $6.2M.' }; }}
        onApplyIdent={() => ({ ok: true, message: 'New ident commissioned.' })}
        onApplyFrontPage={() => ({ ok: true, message: 'Storefront changed.' })}
        onGoToTech={() => setNote('tech')}
        onOpenDefineLaunch={() => setNote('define')}
        onClose={() => setNote('closed')}
      />
      {note && <i data-note={note} style={{ display: 'none' }} />}
    </>
  );
};
createRoot(document.getElementById('root')!).render(<App />);
