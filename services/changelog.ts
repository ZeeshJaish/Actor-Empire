export type ChangelogUpdateType = 'MAJOR' | 'MINOR' | 'PATCH';

export interface ChangelogSection {
  heading: string;
  items: string[];
}

export type ChangelogHighlightIcon = 'STREAMING' | 'GLOBE' | 'TROPHY' | 'BOARDROOM' | 'SPARKLES' | 'FILM' | 'NEWS' | 'FIX';

/** A headline feature, shown as a tile in the update popup (2026-11-09). */
export interface ChangelogHighlight {
  icon: ChangelogHighlightIcon;
  title: string;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  title: string;
  type: ChangelogUpdateType;
  releaseLabel: string;
  summary: string;
  sections: ChangelogSection[];
  /** headline features: tiles in the popup, a list in Settings */
  highlights?: ChangelogHighlight[];
  /** one short line under the highlights */
  note?: string;
}

const changelogEntry = (
  version: string,
  title: string,
  type: ChangelogUpdateType,
  releaseLabel: string,
  summary: string,
  sections: ChangelogSection[],
  highlights?: ChangelogHighlight[],
  note?: string,
): ChangelogEntry => ({
  version,
  title,
  type,
  releaseLabel,
  summary,
  sections,
  ...(highlights ? { highlights } : {}),
  ...(note ? { note } : {}),
});

const patchEntry = (version: string, title = 'Patch & Stability'): ChangelogEntry => changelogEntry(
  version,
  title,
  'PATCH',
  'Patch update',
  'A maintenance update focused on bug fixes, balance cleanup, UI polish, and stability improvements.',
  [
    {
      heading: 'Patch Focus',
      items: [
        'Fixed reported bugs and edge cases from live saves.',
        'Improved stability, week processing, and screen recovery behavior.',
        'Balanced gameplay numbers and cleaned up small UI issues.',
      ],
    },
  ],
);

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  /* 1.0.28 (2026-11-13): the second hotfix from players' reports (Discord, Telegram, X, DMs) plus Week Ahead, the faster
     late-game week. Player-facing only; it repeats how streaming unlocks for players updating from 1.0.25 or 1.0.26. */
  changelogEntry(
    '1.0.28',
    'Faster Weeks & Fixes',
    'PATCH',
    'November 2026',
    'Much faster weeks on big careers, and the fixes you asked for. New here? Streaming unlocks at $150M, 65 Fame and 55 Reputation, in Lifestyle.',
    [
      {
        heading: 'Faster and steadier',
        items: [
          'Weeks on big careers are much faster: the next week is prepared while you play.',
          'Choosing an option in a life event no longer crashes big careers.',
          'The campaign list no longer crashes while you scroll through the ad types.',
          'Fewer freezes while you browse the Content Market and plan a release.',
          'A week no longer jumps back on screen a minute after you play it.',
        ],
      },
      {
        heading: 'Streaming fixes',
        items: [
          '"Clear the markets" no longer stays open when every market is cleared: a filed market you took off the plan now shows on Clearance, and you can drop it.',
          'Approved markets can be dropped before you commission.',
          'Suggest network no longer gets stuck, and its Generate button is never hidden behind the bar.',
          'Executives trained before launch now level up on time.',
          'The back button in Enter new markets is no longer under the status bar.',
          'Tiny countries like Vatican City show their real coverage instead of 0%.',
          'Clearer hints for the rehearsal and for technical debt.',
        ],
      },
      {
        heading: 'Saves and events',
        items: [
          'Send to dev: send a save to the developer from the save slots, even one that cannot open.',
          'If a save cannot open, the message now says which holding is the problem.',
          'The Private Performance offer is now in line with your fame.',
        ],
      },
    ],
    [
      { icon: 'SPARKLES', title: 'Faster weeks', text: 'Big careers move to the next week much faster.' },
      { icon: 'FIX', title: 'No more crashes', text: 'Life events and the campaign list stay steady.' },
      { icon: 'STREAMING', title: 'Launch your service', text: 'Clear the markets, Suggest network and training fixed.' },
      { icon: 'FILM', title: 'Send to dev', text: 'Send us any save, even one that will not open.' },
    ],
    'Thank you for every report. Keep them coming.',
  ),
  /* 1.0.27 (2026-11-11): the hotfix from the first players' reports on 1.0.26, player-facing only. The summary also says
     how streaming unlocks, for players who update straight from 1.0.25 and see this entry first. */
  changelogEntry(
    '1.0.27',
    'Streaming Update Fixes',
    'PATCH',
    'November 2026',
    'Fixes for the Streaming Update, from your reports. New here? Streaming unlocks at $150M, 65 Fame and 55 Reputation, in Lifestyle.',
    [
      {
        heading: 'Streaming fixes',
        items: [
          'Plan and lock your opening in Content › Slate. The old planner is gone.',
          'The launch blueprint completes once your launch is defined.',
          'Market clearance: see when a declined market can file again, drop a stuck country before you commission, and file or pay for every market in one tap.',
          'The Pay button on clearance requests works again, and stuck saves are repaired.',
          'Commission checks everything before the cutscene and tells you what to fix. Nothing is charged if it cannot go ahead.',
          'The launch campaign shows where your money goes, with Add capital and Open without a campaign.',
          "Rights notices open your service's Rights tab instead of a black screen.",
        ],
      },
      {
        heading: 'Films and saves',
        items: [
          'Older careers no longer stop with "Week was not applied".',
          'After a cinema run, the campaign, festivals and calendar scroll again, and the bid room no longer freezes the game.',
          'Pick cinema regions with a tap on the map or the new region buttons.',
          'Faster location maps in Greenlight and Commission.',
          'Campaign pictures no longer go black while you scroll.',
          'Faster late-game weeks, and fewer freezes after taps on big careers.',
          'Fixes for older phones: see-through cards and blank buttons.',
        ],
      },
    ],
    [
      { icon: 'STREAMING', title: 'Open your service', text: 'Slate, clearances, Pay and Commission work again.' },
      { icon: 'FIX', title: 'Old saves play again', text: 'Weeks no longer stop on older careers.' },
      { icon: 'FILM', title: 'Release films smoothly', text: 'Tap cinema regions, scroll the campaign, no frozen bid room.' },
      { icon: 'SPARKLES', title: 'Faster and smoother', text: 'Quicker late-game weeks and lighter maps.' },
    ],
    'Thank you for every report. Keep them coming.',
  ),
  /* 1.0.26: everything since 1.0.25 (App Store 6 Aug 2026, Play 27 Jul 2026; GitHub 907e0271..HEAD), player-facing only */
  changelogEntry(
    '1.0.26',
    'The Streaming Update',
    'MAJOR',
    'November 2026',
    'Build your own streaming empire. It unlocks at $150M, 65 Fame and 55 Reputation, in Lifestyle.',
    [
      {
        heading: 'Also new',
        items: [
          'A shared cinema market: your films fight every other release for the same audiences.',
          'More varied scripts, genres and movie titles.',
          'Livelier News, X and YouTube: critics with their own voices, a new critic called Red Exclusive, and far fewer repeated headlines.',
          'Believable follower, subscriber and view counts on Instagram, X and YouTube.',
          'A new director to work with: James Wilson.',
          'A redesigned Store, with the optional Streaming+ Pack.',
          'Ads now wait for natural breaks and never cover a decision.',
          'Smoother late-game weeks and faster saves.',
        ],
      },
      {
        heading: 'Fixes',
        items: [
          'Studio and company values now follow real earnings, and stock prices follow real results.',
          'Emmy and Golden Globe nominations work again.',
          'Dating partners keep their gender, so couples can start a family again.',
          "Your studio's own series are no longer cancelled at random.",
          'Fixed the hidden Begin Career button and the stuck "ad playing" screen.',
          'Screens stay clear of the notch and the home bar on modern phones.',
          'Better start-up and many stability fixes.',
        ],
      },
    ],
    [
      { icon: 'STREAMING', title: 'Your own streaming service', text: 'Name it, design its app, and set your plans and prices.' },
      { icon: 'GLOBE', title: 'Launch worldwide', text: 'Pick countries, wire servers in 194 cities, go live on launch night.' },
      { icon: 'TROPHY', title: 'Fight for the Top 10', text: 'Originals, licensing auctions, ad campaigns and rival platforms.' },
      { icon: 'BOARDROOM', title: 'Run the boardroom', text: 'Hire your team, raise money from investors and grow your value.' },
    ],
    'Streaming is brand new and still being finished. More is on the way.',
  ),
  changelogEntry(
    '1.0.25',
    'Living Productions & Fairer Competition',
    'MINOR',
    'July 2026',
    'A production-world update with deeper Greenlight choices, rotating crews, tougher awards, clearer project feedback, and more reliable long-career play.',
    [
      {
        heading: 'Living Productions',
        items: [
          'Greenlight now lets you plan background casts with a responsive live set preview, real costs, day players, and specialist performers.',
          'Background performers can build careers over time and return in larger roles, creating new long-term stories across your projects.',
          'Crew markets now refresh every three weeks with a wider rotating pool of cinematographers, composers, line producers, and VFX supervisors.',
        ],
      },
      {
        heading: 'Awards & World Competition',
        items: [
          'Player projects now face stronger competition from world films and music releases during nominations and award voting.',
          'Eligibility rules reduce repeat nominations and stop the same project from winning the same awards year after year.',
          'Award outcomes now respond more clearly to quality, popularity, prestige, campaign strength, and category fit.',
        ],
      },
      {
        heading: 'Project Feedback & Stability',
        items: [
          'Project performance feedback now gives a clearer breakdown of what helped or hurt each role and release.',
          'Improved release continuity, long-career world activity, save migrations, and reported gameplay edge cases.',
          'Refined mobile layouts and Greenlight interactions for clearer, more reliable production planning.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.24',
    'Studio Continuity & Reliability',
    'PATCH',
    'July 2026',
    'A player-report update focused on dependable studio ownership, real season continuations, clearer deals, and safer long-career play.',
    [
      {
        heading: 'Series & Continuations',
        items: [
          'Renewed player-made series now receive a real linked next-season package in the Studio Vault.',
          'Renewal messages take you directly to the next season when it is ready to plan, instead of promising a continuation that cannot be started.',
          'Improved sequel, returning-talent, and continuation handoffs across studio projects.',
        ],
      },
      {
        heading: 'Subsidiary Studios',
        items: [
          'Independent subsidiary studios now manage their slates, releases, and quiet periods more reliably.',
          'Studio archives now present theatrical, streaming, and soundtrack performance more accurately after release.',
          'Improved active and past slate continuity so studio projects stay visible in the right place.',
        ],
      },
      {
        heading: 'Acquisitions & Ownership',
        items: [
          'Improved acquisition, bidding, board-decision, and signing flow reliability.',
          'Forbes and Studio Group now keep ownership, merged studios, and independent subsidiaries in sync more consistently.',
          'Expired, rejected, and completed deal messages now lead to the correct current state instead of reopening outdated actions.',
          'Acquisition news and social reactions now better reflect the studios, people, and rivals involved in your deal.',
        ],
      },
      {
        heading: 'Stability & Mobile Play',
        items: [
          'Improved week progression safeguards, save recovery, and long-career reliability.',
          'Improved startup and large-save handling to reduce interrupted sessions and black-screen recovery cases.',
          'Fixed additional mobile interaction, message-routing, and screen-state edge cases.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.23',
    'Studio Flow & Performance',
    'MINOR',
    'July 2026',
    'A focused quality update for smoother studio production, clearer release feedback, richer save-slot details, and more reliable mobile play.',
    [
      {
        heading: 'Studio Production',
        items: [
          'Improved production-location rendering and interaction reliability across mobile devices.',
          'Studio releases now respond more naturally to creative workload, release timing, and audience interest.',
          'Refined release and streaming feedback so outcomes feel clearer and more varied.',
        ],
      },
      {
        heading: 'Save & Career',
        items: [
          'Save slots now show total time played alongside your career age and fame.',
          'Improved save and startup reliability for long-running careers.',
        ],
      },
      {
        heading: 'Polish & Stability',
        items: [
          'Improved mobile screen rendering and interaction consistency.',
          'Fixed reported edge cases across production, releases, and studio management.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.22',
    'Living World & Stability',
    'MINOR',
    'July 2026',
    'A player-report cleanup update focused on late-game studios, sequels, saves, social systems, health, business capacity, and mobile stability.',
    [
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
        heading: 'Quality Of Life',
        items: [
          'Business service capacity scales more logically with locations, staff, and seats.',
          'Activities screen lag was reduced on mobile by cutting repeated heavy rendering work.',
          'Production-house rehearsal weeks now follow the total project calendar instead of resetting at phase changes.',
          'Agent offers last longer and higher-tier agents bring slightly stronger roles without shortening the weekly loop.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.21',
    'Studio Empire',
    'MAJOR',
    'Major update',
    'A major expansion that pushed Actor Empire into fuller entertainment management with studios, rights, franchises, universes, richer releases, and migration support.',
    [
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
  ),
  patchEntry('1.0.20'),
  patchEntry('1.0.19'),
  changelogEntry(
    '1.0.18',
    'Long-Save Stability',
    'PATCH',
    'Patch update',
    'A stability update focused on the major issues reported after 1.0.17 and improving long-save performance.',
    [
      {
        heading: 'Fixes And Improvements',
        items: [
          'Fixed runaway streaming numbers so views now rise and fall more realistically.',
          'Improved streaming bid wars, sequel offers, and next-season funding flow.',
          'Greenlight now properly shows pending returning talent negotiations.',
          'Fixed pregnancy logic issues in relationships and dating systems.',
          'Improved long-career save stability and reduced mobile lag/performance issues.',
          'Fixed UI overflow and decimal bugs across festivals, Forbes, IMDb, and career screens.',
          'Added more protection around events, weekly processing, universe saves, and recovery flows.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.17',
    'Studio Depth & Script Systems',
    'MAJOR',
    'Major update',
    'One of the biggest depth updates yet, focused on studio gameplay, scripting, franchises, quality of life, and overall polish.',
    [
      {
        heading: 'What Is New',
        items: [
          'Added much deeper Production House and script development systems.',
          'Improved project flow and filmography browsing.',
          'Added new genres and project types including Biopic, Documentary, Sports, Musical, Animation, Anime, and more.',
          'Improved franchise and cinematic universe systems with better sequel and crossover handling.',
          'Added new free lifestyle items including houses, vehicles, and wardrobe.',
          'Improved loan systems with clearer repayment and payoff flow.',
          'Refreshed the in-game Guide with better explanations across career, finance, studio, and universes.',
          'Added major bug fixes and stability improvements across production, streaming, social systems, awards, and saves.',
          'Started language support behind the scenes, with full rollout planned for the next update.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.16',
    'Creator Systems & iOS Purchases',
    'MINOR',
    'Minor update',
    'This update rolled out earlier than planned to fix iOS in-app purchases in the App Store version, with creator-system features included from the upcoming social update.',
    [
      {
        heading: 'Included',
        items: [
          'Fixed iOS in-app purchases in the App Store version.',
          'Added the YouTube creator system.',
          'Added video uploads and channel growth.',
          'Added custom thumbnail uploads.',
          'Added YouTube Studio progression.',
          'Added monetization, creator events, and brand/collab opportunities.',
          'Added video watch pages with likes, dislikes, and comments.',
          'Expanded global talent and creator mod packs.',
          'Added bug fixes and UI improvements.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.15',
    'Dating, Romance & Social Depth',
    'MINOR',
    'Minor update',
    'A relationship and social update with sequel fixes, deeper dating systems, improved Luxe/Tinder flow, and more life drama.',
    [
      {
        heading: 'What Changed',
        items: [
          'Fixed sequel, renewal, and returning cast/crew progression issues.',
          'Improved streaming release timing and follow-up project flow.',
          'Added clearer IMDb project outcomes like returning, written off, and killed off.',
          'Upgraded Tinder with deeper chat, casual, intimacy, and energy systems.',
          'Upgraded Luxe with cleaner UX, more relationship depth, and drama events.',
          'Added more jealousy, scandal, breakup, and romance fallout events.',
          'Improved Connections with better family/relationship organization.',
          'Added avatar changing from the player profile.',
          'Expanded premium collections with more items, lifestyle actions, buzz, and flavor.',
          'Fixed business hiring refresh/filter issues.',
          'Added in-game bug reporting.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.14',
    'Sequel Greenlight Fix',
    'PATCH',
    'Patch update',
    'A focused patch for sequel greenlight and family negotiation issues.',
    [
      {
        heading: 'Fixes',
        items: [
          'Fixed sequel greenlight black screen issues.',
          'Fixed family negotiation issues.',
          'Added supporting stability cleanup around family and sequel flows.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.13',
    'Loans, Family & Legacy',
    'PATCH',
    'Patch update',
    'A patch update adding personal loans, family consequences, legacy handoff, and several production-house fixes.',
    [
      {
        heading: 'What Changed',
        items: [
          'Added personal loans with credit score and repayment mechanics.',
          'Added baby naming and deeper family/divorce consequences.',
          'Added a new life summary and legacy handoff screen on death.',
          'Fixed sequel negotiation issues for returning cast and crew.',
          'Improved streaming bids, Production House finance clarity, and universe tracking.',
          'Fixed awards, vehicle selection, and several UI/navigation issues.',
          'Added festival week info and more stability improvements.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.12',
    'UI Fixes & Streaming Bids',
    'PATCH',
    'Patch update',
    'A focused patch for UI issues and streaming bid balance.',
    [
      {
        heading: 'Fixes',
        items: [
          'Fixed reported UI issues.',
          'Balanced streaming bids.',
          'Added supporting patch fixes and stability improvements.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.11',
    'Production House Recovery',
    'PATCH',
    'Patch update',
    'A patch focused on Production House reliability, save recovery, sequel flow, and UI fixes.',
    [
      {
        heading: 'Fixes And Improvements',
        items: [
          'Fixed several Production House and studio flow issues.',
          'Improved save recovery for players hitting black screen or recovery mode.',
          'Fixed multiple week-processing failures that could stop progress.',
          'Fixed sequel projects getting stuck on returning talent negotiations.',
          'Improved sequel and returning-talent flow so contracted returning cast no longer blocks greenlight incorrectly.',
          'Fixed studio finance issues where inject or withdraw could fail silently.',
          'Fixed IMDb and awards inconsistencies, including incorrect role displays on studio-produced projects.',
          'Improved universe creation and universe-related stability.',
          'Fixed multiple UI issues on certain devices where buttons or actions could be cut off.',
          'Rebalanced business valuation and closed fast-money exploit paths.',
          'Expanded the in-game Guide app with a better handbook and FAQ.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.10',
    'Stability & Exploit Cleanup',
    'PATCH',
    'Patch update',
    'A stability, bug-fix, and exploit-cleanup update.',
    [
      {
        heading: 'Patch Focus',
        items: [
          'Fixed several production house issues, including black screen/save recovery problems.',
          'Fixed sequel projects getting stuck on returning talent negotiations pending.',
          'Fixed studio finance issues where inject/withdraw could appear to do nothing.',
          'Added safer handling for rare Processing Week hangs.',
          'Fixed awards and IMDb inconsistencies, including false supporting-role nominations.',
          'Improved awards flow and nominee handling for cleaner results.',
          'Closed business exploits around fashion profits, instant valuation spikes, and quick studio flip value.',
          'Reworked valuation behavior so businesses grow in value more realistically over time.',
          'Upgraded the in-game Guide app with a better handbook and FAQ.',
        ],
      },
    ],
  ),
  patchEntry('1.0.9'),
  changelogEntry(
    '1.0.8',
    'Black Screen & Fame Fix',
    'PATCH',
    'Patch update',
    'A focused patch for black screen issues and fame balancing.',
    [
      {
        heading: 'Fixes',
        items: [
          'Fixed the black screen issue.',
          'Softened fame decay so fame drops more fairly over time.',
          'Added supporting stability cleanup for affected saves.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.7',
    'Depth, Balance & Long-Term Gameplay',
    'MAJOR',
    'Android live',
    'One of the biggest updates so far, focused on depth, balance, and long-term gameplay.',
    [
      {
        heading: 'What Is New',
        items: [
          'Added multi-save system with save slots for parallel playthroughs.',
          'Migrated old saves into the new save-slot system.',
          'Massively expanded world content including news, events, gossip, and social feed.',
          'Rebalanced business systems so service businesses are stable and product businesses require active strategy.',
          'Strengthened the impact of cast, director, and script on movie performance.',
          'Improved production house and movie systems.',
          'Reworked streaming versus theatrical release logic.',
          'Upgraded the Box Office app with cleaner UI and better tracking.',
          'Added annual taxes for better late-game balance.',
          'Improved the energy system so unused energy carries forward.',
          'Rebalanced ads and rewards for less exploit and more fairness.',
          'Improved mobile optimization for iOS and Android support.',
          'Added general UI polish and stability improvements.',
        ],
      },
    ],
  ),
  patchEntry('1.0.6'),
  changelogEntry(
    '1.0.5',
    'Stability & Gameplay Upgrade',
    'MINOR',
    'Minor update',
    'A stability and gameplay upgrade with guide support, business improvements, lifestyle items, and UI polish.',
    [
      {
        heading: 'What Changed',
        items: [
          'Fixed ad reward issue so players now correctly receive wellbeing rewards.',
          'Added in-game Guide App to help new players understand mechanics.',
          'Improved business logic, including service-based businesses.',
          'Enhanced Forbes app experience.',
          'Added more lifestyle items.',
          'Fixed award show bugs.',
          'Fixed gender assignment bug for female characters.',
          'Added UI improvements across multiple screens.',
          'Added performance optimizations and stability improvements.',
          'Added minor bug fixes and balancing tweaks.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.4',
    'Award Season Overhaul',
    'MINOR',
    'Minor update',
    'A film and TV awards overhaul with smarter eligibility, dynamic ceremonies, new titles, and iOS ad fixes.',
    [
      {
        heading: 'Award Season Overhaul',
        items: [
          'Replaced the Tony Awards with the BAFTA Film Awards in Week 4 to better fit the film/TV focus.',
          'Fixed eligibility logic so movies compete for Oscars/BAFTAs and TV shows compete for Emmys.',
          'Fixed gender category bugs where male actors could win Best Actress or female actors could win Best Actor.',
          'Fixed repetitive hardcoded award cutscenes so ceremonies now reflect actual projects and actors from the save file.',
        ],
      },
      {
        heading: 'Quality Of Life & Content',
        items: [
          'Added a Skip Ceremony button to the Red Carpet event.',
          'Expanded the script generation engine with new word banks for more varied movie and TV titles.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Fixed visual glitches in the Award Show presentation.',
          'Added general performance improvements.',
          'Fixed ads for iOS.',
        ],
      },
    ],
  ),
  changelogEntry(
    '1.0.3',
    'Storage & Business Fix',
    'PATCH',
    'Patch update',
    'A focused patch for storage and business-tab issues.',
    [
      {
        heading: 'Fixes',
        items: [
          'Fixed the storage issue.',
          'Fixed the business tab.',
          'Added supporting stability cleanup.',
        ],
      },
    ],
  ),
  patchEntry('1.0.2'),
  patchEntry('1.0.1', 'Launch Stability Patch'),
  changelogEntry(
    '1.0.0',
    'First Public Foundation',
    'MAJOR',
    'Major update',
    'The first Actor Empire foundation build with the core career, lifestyle, production, and phone-app loop.',
    [
      {
        heading: 'Foundation',
        items: [
          'Launched the core actor career loop with auditions, jobs, skills, fame, reputation, health, and weekly progression.',
          'Included early social, dating, lifestyle, business, news, stocks, streaming, and phone-app systems.',
          'Established production-house, Greenlight, release, IMDb, awards, universe, and world-simulation foundations.',
        ],
      },
    ],
  ),
];

export const getLatestChangelogEntry = () => CHANGELOG_ENTRIES[0];

export const getChangelogTypeLabel = (type: ChangelogUpdateType) => {
  if (type === 'MAJOR') return 'Major Update';
  if (type === 'MINOR') return 'Minor Update';
  return 'Patch Update';
};
