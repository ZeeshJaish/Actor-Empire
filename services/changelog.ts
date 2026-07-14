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

const legacyChangelogEntry = (
  version: string,
  title: string,
  type: ChangelogUpdateType,
  summary: string,
  items: string[],
): ChangelogEntry => ({
  version,
  title,
  type,
  releaseLabel: 'Legacy notes',
  summary,
  sections: [
    {
      heading: 'Known Focus',
      items,
    },
  ],
});

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
  legacyChangelogEntry(
    '1.0.18',
    'World Polish & Native Stability',
    'MINOR',
    'Legacy notes from the release commit: world systems, guide polish, localization groundwork, and native stability moved forward here.',
    [
      'Expanded production events, market trends, genre catalog support, and world/news reactions.',
      'Improved Development Lab, Greenlight, Guide, Home, mobile apps, and startup/native stability.',
      'Added localization groundwork and audit coverage for universe flow and release safety.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.17',
    'Production Events & Guide Polish',
    'PATCH',
    'Backfilled legacy note for the bridge update before 1.0.18, focused on making production and help surfaces clearer.',
    [
      'Improved production event handling and release-flow messaging.',
      'Expanded guide coverage for complex production-house systems.',
      'Continued save, event, and mobile shell stability work.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.16',
    'Social Apps & Creator Systems',
    'MINOR',
    'Legacy notes from visible history: social apps, creator systems, imported talent data, and media handling expanded around this period.',
    [
      'Expanded Instagram, YouTube, X, Forbes, messages, and creator-related weekly systems.',
      'Added larger talent data support and improved NPC/social feed behavior.',
      'Improved release and referral hooks feeding social and creator gameplay.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.15',
    'Luxe Dating & Life Events',
    'MINOR',
    'Legacy notes from the release commit: Luxe, dating, life events, premium balance, and relationship feedback got a major pass.',
    [
      'Expanded Luxe and dating flows with better relationship, chemistry, and social outcomes.',
      'Improved life events, home feedback, premium balance, and week-to-week event handling.',
      'Updated IMDb, greenlight, release, and project dashboard feedback.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.14',
    'Sequel And Premium Stabilization',
    'PATCH',
    'Legacy notes from the stabilization commit between 1.0.13 and 1.0.15.',
    [
      'Improved sequel flow and production-house continuation handling.',
      'Hardened premium purchase and native update paths.',
      'Stabilized game-loop, award, business, and universe interactions.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.13',
    'Family Legacy & Finance',
    'MINOR',
    'Legacy notes from the release commit: family, legacy, loan, death, and native tracking systems expanded here.',
    [
      'Added deeper family and pregnancy logic, child legacy handoff, and death-screen improvements.',
      'Expanded bank/loan systems and business finance pressure.',
      'Added native tracking-permission support and improved premium/ad handling.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.12',
    'Native Release Prep',
    'PATCH',
    'Backfilled legacy note for native release preparation work before the 1.0.13 systems update.',
    [
      'Improved iOS and Android shell readiness, launch assets, and store-facing configuration.',
      'Prepared premium, ad, and device-specific systems for broader testing.',
      'Polished guide and startup behavior for mobile players.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.11',
    'Production Flow Stabilization',
    'PATCH',
    'Legacy notes from the stabilization commit: production flow, premium/native updates, and sequel safety were the focus.',
    [
      'Stabilized Greenlight, project phase progression, and production-house release handling.',
      'Improved premium purchase paths and native plugin support.',
      'Fixed sequel and universe edge cases before the larger family update.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.10',
    'Mobile Store Foundation',
    'PATCH',
    'Backfilled legacy note for the step between first native shell work and later production-flow stabilization.',
    [
      'Improved mobile app structure, settings support, and save handling.',
      'Prepared store, premium, and ad surfaces for production use.',
      'Smoothed early mobile navigation and startup recovery paths.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.9',
    'Native Mobile Shell',
    'MINOR',
    'Legacy notes from the native setup commit: Capacitor Android/iOS projects, app icons, splash screens, premium, and guide updates landed here.',
    [
      'Added native Android and iOS project structure with launch assets and app metadata.',
      'Expanded premium logic, IAP service support, and ad integration basics.',
      'Improved guide, production, box office, store, and startup mobile behavior.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.8',
    'Guide And Balance Pass',
    'PATCH',
    'Backfilled legacy note for early balance and help-system work before native release prep.',
    [
      'Improved guide explanations for career, studio, and production decisions.',
      'Balanced weekly events, business outcomes, and player feedback.',
      'Reduced confusing early-game transitions and save edge cases.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.7',
    'World Events And News',
    'PATCH',
    'Backfilled legacy note for early world-reaction, news, and social-event expansion.',
    [
      'Expanded news, life events, public reaction, and social-event outcomes.',
      'Improved home feed and mobile news surfaces.',
      'Added more variety to weekly event and fame/reputation feedback.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.6',
    'Business Dashboard Growth',
    'MINOR',
    'Backfilled legacy note for the early business and production-house management expansion.',
    [
      'Expanded business dashboards, production-house screens, facilities, and management surfaces.',
      'Improved Greenlight, release, and project dashboard flow.',
      'Added more studio/business stats and player-facing finance feedback.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.5',
    'Phone Apps Expansion',
    'MINOR',
    'Backfilled legacy note for the early mobile-phone suite expansion.',
    [
      'Expanded phone apps like IMDb, Forbes, Stocks, Messages, X, YouTube, Instagram, and dating surfaces.',
      'Improved app navigation and in-game information access.',
      'Added more project, social, and money feedback through phone screens.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.4',
    'Streaming And Box Office',
    'PATCH',
    'Backfilled legacy note for early release-results and streaming outcome work.',
    [
      'Improved streaming logic, box-office feedback, IMDb pages, and release outcomes.',
      'Added stronger project detail and post-release history surfaces.',
      'Balanced studio, fame, money, and audience-result feedback.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.3',
    'Career Progression',
    'PATCH',
    'Backfilled legacy note for early acting career, casting, training, and role generation work.',
    [
      'Improved auditions, roles, applications, commitments, and career XP loops.',
      'Expanded training, stats, genre fit, and casting feedback.',
      'Improved weekly progression and career-page clarity.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.2',
    'Lifestyle And Assets',
    'PATCH',
    'Backfilled legacy note for early lifestyle, assets, and business support.',
    [
      'Expanded lifestyle assets, purchases, business options, and personal money flow.',
      'Improved social, dating, and lifestyle interactions.',
      'Added more player-choice feedback outside the acting career loop.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.1',
    'First Stability Patch',
    'PATCH',
    'Backfilled legacy note for the first stability and quality-of-life pass after the foundation build.',
    [
      'Improved save/load behavior, week processing, and early-game screen flow.',
      'Smoothed role, project, social, and business calculations.',
      'Fixed first-wave UI and state bugs from the foundation build.',
    ],
  ),
  legacyChangelogEntry(
    '1.0.0',
    'First Public Foundation',
    'MAJOR',
    'Backfilled first-version note: the base Actor Empire loop with career, auditions, fame, lifestyle, phone apps, production, and world simulation.',
    [
      'Launched the core actor career loop with auditions, jobs, skills, fame, reputation, health, and weekly progression.',
      'Included early social, dating, lifestyle, business, news, stocks, streaming, and phone-app systems.',
      'Established production-house, Greenlight, release, IMDb, awards, universe, and world-simulation foundations.',
    ],
  ),
];

export const getLatestChangelogEntry = () => CHANGELOG_ENTRIES[0];

export const getChangelogTypeLabel = (type: ChangelogUpdateType) => {
  if (type === 'MAJOR') return 'Major Update';
  if (type === 'MINOR') return 'Minor Update';
  return 'Patch Update';
};
