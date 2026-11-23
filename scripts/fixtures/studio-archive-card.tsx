/* The Production House "Past projects" card (ArchiveProjectCard) with one card per case, for the browser audit
   scripts/audit-studio-archive-original-verdict.cjs (23 Nov 2026, player report: an Original ordered from the
   player's own studio read Average or Flop although it earns on the platform).
   Each case sits in <div data-case="..."> with a caption above it (the caption is the fixture's, not the game's). */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { ArchiveProjectCard } from '../../views/lifestyle/business/ProductionHouseGame';

const own = (id: string, name: string, budget: number, funded: number, rating: number) => ({
  id, name, type: 'SERIES', projectType: 'SERIES', budget, gross: 0, streamingRevenue: 0, soundtrackRevenue: 0, imdbRating: rating,
  platformProductionFunding: funded,
  projectDetails: { type: 'SERIES', genre: 'DRAMA', estimatedBudget: budget, hiddenStats: { ownedStreamingOriginal: true, platformProductionFundingApplied: funded } },
});
const film = (id: string, name: string, budget: number, gross: number, rating: number) => ({
  id, name, type: 'MOVIE', projectType: 'MOVIE', budget, gross, streamingRevenue: 0, soundtrackRevenue: 0, imdbRating: rating,
  projectDetails: { type: 'MOVIE', genre: 'THRILLER', estimatedBudget: budget, hiddenStats: {} },
});

const ribbon = { label: 'FOR EMPIRE+', color: '#e11d74', onColor: '#ffffff' };
const longRibbon = { label: 'FOR ZEDBURY PLUS ORIGINALS', color: '#f7d046', onColor: '#0a0a0a' };

const CASES: Array<{ id: string; caption: string; project: any; ribbon?: typeof ribbon }> = [
  { id: 'own-full', caption: 'Your Original, paid in full', project: own('o1', 'Glass Harbor', 40_000_000, 40_000_000, 7.8), ribbon },
  { id: 'own-short', caption: 'Your Original, paid 90%', project: own('o2', 'Night Ferry', 40_000_000, 36_000_000, 6.9), ribbon },
  { id: 'own-long', caption: 'Your Original, long service name', project: own('o3', 'Salt Line', 25_000_000, 25_000_000, 8.4), ribbon: longRibbon },
  { id: 'film-flop', caption: 'A film that lost money', project: film('f1', 'Cold Orbit', 50_000_000, 20_000_000, 5.2) },
  { id: 'film-average', caption: 'A film that earned a bit more than its cost', project: film('f2', 'Paper Crown', 50_000_000, 60_000_000, 6.8) },
  { id: 'film-hit', caption: 'A film at 2.4x its cost', project: film('f3', 'Red Harbor', 50_000_000, 120_000_000, 7.9) },
  { id: 'film-blockbuster', caption: 'A film at 6x its cost', project: film('f4', 'Kingfall', 50_000_000, 300_000_000, 8.6) },
  { id: 'ai-credit', caption: 'Made for another service (commission credit)', project: { ...film('c1', 'Harbor Lights', 30_000_000, 0, 7.1), isPlatformCommissionCredit: true, producerFee: 3_000_000 } },
];

function Fixture() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: 16, color: '#d4d4d8', fontFamily: 'system-ui, sans-serif' }}>
      {CASES.map(item => (
        <div key={item.id} data-case={item.id} style={{ width: 150 }}>
          <div style={{ fontSize: 10, lineHeight: 1.3, marginBottom: 6, minHeight: 26, color: '#a1a1aa' }}>{item.caption}</div>
          <ArchiveProjectCard project={item.project} ribbon={item.ribbon} onClick={() => undefined} />
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
