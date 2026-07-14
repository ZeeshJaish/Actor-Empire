export type ChangelogUpdateType = 'MAJOR' | 'MINOR' | 'PATCH';

export interface ChangelogSection {
  heading: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  title: string;
  type: ChangelogUpdateType;
  releaseLabel: string;
  summary: string;
  sections: ChangelogSection[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '1.0.22',
    title: 'Living World & Stability',
    type: 'MINOR',
    releaseLabel: 'July 2026',
    summary: 'A player-report cleanup update focused on late-game studios, sequels, saves, social systems, health, business capacity, and mobile stability.',
    sections: [
      {
        heading: 'Studio Ownership',
        items: [
          'Studio buyout signing now shows requirement checks for energy, funding, accepted deals, and blocker reasons.',
          'Public-stock control acquisitions persist ownership and keep Forbes, stock listings, and studio group state in sync.',
          'Studio selling added ask price, walk-away floor, terms, staggered offers, counters, signing, cleanup, and royalty collections.',
          'Merged, sold, or bundled studios now clean up debt, catalog ownership, name rights, subsidiary state, Forbes, and stock visibility more consistently.',
          'Subsidiary studios auto-run closer to the greenlight and release flow, with active and past slate tiles like the main production house.',
        ],
      },
      {
        heading: 'Films, Series, Awards',
        items: [
          'Sequel and season decisions are less stuck, support later seasons, and include news around surprise renewals or cancellations.',
          'Box office and IMDb outcomes vary more naturally by quality, budget, audience, marketing, risk, and genre fit.',
          'Episode ratings group seasons more reliably, and longer seasons can show beyond the first twelve episodes.',
          'Awards no longer keep rewarding the same film for years, and release-age records are preserved per project.',
        ],
      },
      {
        heading: 'Career, Health, Family',
        items: [
          'Health alerts are less frustrating, with minor team-covered conditions handled in the background when support exists.',
          'Legacy inheritance keeps production-house projects as normal franchises while supporting parent and child continuity.',
          'Retired-universe characters are separated from normal character creation while still allowing intentional legacy callbacks.',
          'Luxe dating has a clearer official-relationship path after successful dates.',
        ],
      },
      {
        heading: 'Mobile, Saves, Social',
        items: [
          'Save export and import is safer and compacts bulky history instead of throwing away career history.',
          'Week advance waits for the compacted save write to reduce rollback and restart cases.',
          'Purchases restore across save slots, and trips improve selected friend or family relationships.',
          'X now includes an Industry information feed with Pop Base-style, box-office, awards, studio, and streaming accounts.',
        ],
      },
      {
        heading: 'Quality of Life',
        items: [
          'Business service capacity scales more logically with locations, staff, and seats.',
          'Activities screen lag was reduced on mobile by cutting repeated heavy rendering work.',
          'Production-house rehearsal weeks now follow the total project calendar instead of resetting at phase changes.',
          'Agent offers last longer and higher-tier agents bring slightly stronger roles without shortening the weekly loop.',
        ],
      },
    ],
  },
  {
    version: '1.0.21',
    title: 'Studio Empire',
    type: 'MAJOR',
    releaseLabel: 'July 2026',
    summary: 'A major expansion that pushed Actor Empire into fuller entertainment management with studios, rights, franchises, universes, richer releases, and migration support.',
    sections: [
      {
        heading: 'Studio Empire',
        items: [
          'Buy studios, build a studio group, and grow from actor into owner.',
          'Studio acquisitions include seller replies, rival interest, signing, debt pressure, and ownership transfer.',
          'Subsidiary operations, mandates, decisions, and production handoffs make owned studios feel alive.',
        ],
      },
      {
        heading: 'Rights And Releases',
        items: [
          'Discover rights, investigate IP, negotiate offers, and turn properties into projects.',
          'Greenlight, marketing, distribution, and release planning gained clearer decisions.',
          'Box-office history, records, weekly charts, regions, and cinema chains make releases easier to track.',
        ],
      },
      {
        heading: 'Career And World',
        items: [
          'Award night, Forbes, IMDb, YouTube, X, messages, and phone apps got richer feedback.',
          'Owned IP, franchises, cinematic universes, celebrity life events, health, aging, mortality, and death systems expanded.',
          'A new in-game tutorial and partial localization work improved onboarding.',
        ],
      },
      {
        heading: 'Migration Hotfixes',
        items: [
          'Save import and export migration was added for players moving between builds and stores.',
          'Acquisition signing got blocker popups and clearer requirements.',
          'Age minimum moved to 15, with more old-save protection and stability fixes.',
        ],
      },
    ],
  },
  {
    version: '1.0.20',
    title: 'Release Systems Polish',
    type: 'MINOR',
    releaseLabel: 'Legacy notes',
    summary: 'Best-effort legacy notes from available repo context: release flow, box-office depth, social feedback, and stability polish before the Studio Empire update.',
    sections: [
      {
        heading: 'Release Flow',
        items: [
          'Production-house release planning, streaming paths, marketing feedback, and box-office tracking were expanded.',
          'IMDb and box-office screens gained clearer project outcome surfaces.',
          'Save and event stability continued improving ahead of the major studio update.',
        ],
      },
    ],
  },
  {
    version: '1.0.19',
    title: 'Production House Foundation',
    type: 'MINOR',
    releaseLabel: 'Legacy notes',
    summary: 'Best-effort legacy notes from player-report and migration context: production-house projects, greenlight flow, stock and Forbes systems, and mobile support were active here.',
    sections: [
      {
        heading: 'Core Systems',
        items: [
          'Production-house greenlight, project phases, social apps, phone apps, Forbes, and stocks were part of active gameplay.',
          'Player reports from this build informed later fixes around stocks, sequels, save migration, and crashes.',
        ],
      },
    ],
  },
  {
    version: '1.0.18',
    title: 'Career Core',
    type: 'PATCH',
    releaseLabel: 'Legacy notes',
    summary: 'Best-effort legacy notes: early career loop, casting, social apps, lifestyle, and stability work before the larger studio expansions.',
    sections: [
      {
        heading: 'Foundation',
        items: [
          'Career progression, auditions, lifestyle, phone apps, and early production systems formed the base loop.',
          'Later updates built studio ownership, rights, universes, and migration support on top of this foundation.',
        ],
      },
    ],
  },
];

export const getLatestChangelogEntry = () => CHANGELOG_ENTRIES[0];

export const getChangelogTypeLabel = (type: ChangelogUpdateType) => {
  if (type === 'MAJOR') return 'Major Update';
  if (type === 'MINOR') return 'Minor Update';
  return 'Patch Update';
};
