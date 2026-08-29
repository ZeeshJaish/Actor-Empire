(function () {
  const categories = {
    core: { label: 'Core loop', short: 'CORE', color: '#f5c451', description: 'Navigation, time, energy, state, and persistence.' },
    career: { label: 'Actor career', short: 'ACT', color: '#f08a5d', description: 'Auditions, skills, roles, production work, and reputation.' },
    production: { label: 'Production', short: 'PROD', color: '#e56b9f', description: 'Development, greenlight, filmmaking, release, and awards.' },
    studio: { label: 'Studio empire', short: 'HQ', color: '#9b83f3', description: 'Owned production, rights, companies, control, and capital.' },
    streaming: { label: 'EMPIRE+', short: 'E+', color: '#42c7c7', description: 'Owned streaming platform from founding through legacy.' },
    social: { label: 'Media & social', short: 'MEDIA', color: '#55a7f3', description: 'Phone apps, audience, press, news, and personal brand.' },
    life: { label: 'Life & legacy', short: 'LIFE', color: '#77c66e', description: 'Relationships, health, family, assets, and bloodline.' },
    economy: { label: 'Money & markets', short: 'FIN', color: '#b7d455', description: 'Cash flow, loans, businesses, stocks, and monetization.' },
    world: { label: 'Living world', short: 'WORLD', color: '#cc8cff', description: 'Studios, NPC careers, franchises, rivals, and consequences.' },
    platform: { label: 'Platform layer', short: 'SYS', color: '#8b98a7', description: 'Storage, migration, analytics, native purchases, and safety.' }
  };

  const zones = [
    { id: 'experience', label: 'PLAYER EXPERIENCE', x: 40, y: 60, width: 720, height: 1420 },
    { id: 'simulation', label: 'GAME SIMULATION', x: 800, y: 60, width: 880, height: 1420 },
    { id: 'empire', label: 'EMPIRE SYSTEMS', x: 1720, y: 60, width: 820, height: 1420 }
  ];

  const nodes = [
    {
      id: 'start-menu', code: 'AE-01', title: 'Start & Save Slots', category: 'core', layer: 'player', x: 110, y: 120,
      summary: 'Boots the game safely, lists three careers without loading full saves, then routes into creation or an existing life.',
      how: ['Read lightweight save summaries on startup.', 'Create a new career or hydrate the selected slot.', 'Run migration and entitlement repair before entering play.'],
      inputs: ['IndexedDB save keys', 'Local summary mirror', 'Premium entitlements'], outputs: ['Selected Player state', 'Current save slot', 'START_MENU → CREATION/PLAYING'],
      state: ['gameStatus', 'saveSlotSummaries', 'currentSlot'], files: ['App.tsx', 'views/StartMenu.tsx', 'services/storage.ts', 'services/saveMigration.ts'], tags: ['boot', 'career', 'slot', 'load']
    },
    {
      id: 'creation', code: 'AE-02', title: 'Create Your Star', category: 'core', layer: 'player', x: 110, y: 300,
      summary: 'Builds the playable actor identity and initializes the first week of the career.',
      how: ['Choose core identity and appearance.', 'Create a complete Player object from the canonical initial state.', 'Persist slot and enter the Home page.'],
      inputs: ['Player choices', 'INITIAL_PLAYER defaults'], outputs: ['Identity', 'Starting stats', 'First playable week'],
      state: ['name', 'gender', 'avatar', 'stats'], files: ['views/CreationMenu.tsx', 'components/CreateStarScreen.tsx', 'types.ts', 'services/profileBuilder.ts'], tags: ['avatar', 'identity', 'new game']
    },
    {
      id: 'home', code: 'AE-03', title: 'Home & Career Pulse', category: 'core', layer: 'player', x: 110, y: 500,
      summary: 'The player dashboard: current condition, headline progress, active commitments, warnings, QA entry points, and Next Week.',
      how: ['Summarize the current Player snapshot.', 'Surface urgent events, active work, and progression.', 'Send navigation or advance-week actions back to App.'],
      inputs: ['Player snapshot', 'Active events', 'Commitments'], outputs: ['Page navigation', 'Player edits', 'Next Week request'],
      state: ['money', 'energy', 'stats', 'commitments', 'logs'], files: ['views/HomePage.tsx', 'App.tsx', 'components/BottomNav.tsx'], tags: ['dashboard', 'next week', 'overview']
    },
    {
      id: 'navigation', code: 'AE-04', title: 'Page Navigation', category: 'core', layer: 'code', x: 110, y: 690,
      summary: 'Routes the six primary mobile tabs plus Settings and Store through one Page enum owned by App.',
      how: ['BottomNav emits a Page value.', 'App renders exactly one matching page.', 'Deep links carry context into Lifestyle or Mobile sub-apps.'],
      inputs: ['Page enum', 'Deep-link targets'], outputs: ['Active page', 'Initial subview context'],
      state: ['activePage', 'lifestyleInitialView', 'initialMobileAppMode'], files: ['types.ts', 'App.tsx', 'components/BottomNav.tsx'], tags: ['route', 'tab', 'screen']
    },
    {
      id: 'career-page', code: 'AE-05', title: 'Career Desk', category: 'career', layer: 'player', x: 110, y: 880,
      summary: 'Shows work in progress and lets the actor rehearse, prepare, perform, and manage jobs.',
      how: ['Read commitments and production phases.', 'Spend weekly energy on role preparation or production focus.', 'Feed performance progress into the weekly resolution.'],
      inputs: ['Commitments', 'Energy', 'Actor skills'], outputs: ['Preparation', 'Performance', 'Project focus'],
      state: ['commitments', 'energy', 'playerProductionFocus'], files: ['views/CareerPage.tsx', 'services/roleLogic.ts', 'hooks/useGameActions.ts'], tags: ['acting', 'job', 'rehearse', 'performance']
    },
    {
      id: 'improve', code: 'AE-06', title: 'Training & Improvement', category: 'career', layer: 'player', x: 110, y: 1060,
      summary: 'Turns money, energy, and time into acting, writing, directing, body, looks, and wellness growth.',
      how: ['Choose an immediate action or longer commitment.', 'Validate cash and energy.', 'Apply gains now or during future weekly ticks.'],
      inputs: ['Money', 'Energy', 'Training offers'], outputs: ['Skills', 'Health/body/looks', 'Commitments'],
      state: ['stats.skills', 'writerStats', 'directorStats', 'commitments'], files: ['views/ImprovePage.tsx', 'services/roleLogic.ts', 'services/premiumLogic.ts'], tags: ['skills', 'class', 'gym', 'energy']
    },
    {
      id: 'social-page', code: 'AE-07', title: 'Relationships', category: 'life', layer: 'player', x: 110, y: 1240,
      summary: 'Manages closeness, romance, family ties, social events, favors, conflict, and legacy continuation.',
      how: ['Select a relationship and interaction.', 'Apply closeness, cost, cooldown, or event changes.', 'Weekly simulation creates consequences and new moments.'],
      inputs: ['Relationships', 'Energy', 'Life events'], outputs: ['Closeness', 'Pregnancy/family flags', 'Social events'],
      state: ['relationships', 'activePregnancy', 'bloodline'], files: ['views/SocialPage.tsx', 'services/familyLogic.ts', 'services/datingLogic.ts', 'services/socialEvents.ts'], tags: ['dating', 'family', 'friends', 'children']
    },
    {
      id: 'lifestyle-hub', code: 'AE-08', title: 'Lifestyle Hub', category: 'life', layer: 'player', x: 360, y: 120,
      summary: 'Gateway to assets, activities, companies, the production house, EMPIRE+, and future cinema ownership.',
      how: ['Choose a lifestyle branch.', 'Keep the branch inside a focused subview.', 'Return to the shared Lifestyle hub or main game.'],
      inputs: ['Owned assets', 'Businesses', 'Unlock flags'], outputs: ['Subview route', 'Deep-link handoff'],
      state: ['view', 'businesses', 'assets'], files: ['views/LifestylePage.tsx', 'views/lifestyle/LifestyleAssets.tsx', 'views/lifestyle/LifestyleActivities.tsx'], tags: ['assets', 'business', 'streaming']
    },
    {
      id: 'mobile-hub', code: 'AE-09', title: 'In-Game Phone', category: 'social', layer: 'player', x: 360, y: 330,
      summary: 'Hosts the game’s connected apps: casting, messages, social media, news, finance, companies, markets, dating, and guide.',
      how: ['Open an app from the phone grid.', 'Read and mutate the same Player state as the main game.', 'Deep-link opportunities into production, rights, or markets.'],
      inputs: ['Player state', 'Inbox', 'World feeds'], outputs: ['Offers/actions', 'Cross-app navigation', 'Player updates'],
      state: ['appMode', 'inbox', 'instagram', 'x', 'youtube'], files: ['views/mobile/MobilePage.tsx', 'App.tsx'], tags: ['phone', 'apps', 'messages', 'feed']
    },
    {
      id: 'store-settings', code: 'AE-10', title: 'Store & Settings', category: 'platform', layer: 'player', x: 360, y: 550,
      summary: 'Controls language, smooth mode, save transfer, rewarded energy, premium assets, no-ads, and purchase restoration.',
      how: ['Request a setting, export/import, ad, or product.', 'Use platform services for the external action.', 'Write entitlements and repaired energy back to Player.'],
      inputs: ['Settings', 'Product catalog', 'Purchase updates'], outputs: ['Entitlements', 'Energy', 'Save archive'],
      state: ['settings', 'flags.premiumEntitlements', 'energy'], files: ['views/SettingsPage.tsx', 'views/StorePage.tsx', 'services/iapService.ts', 'services/premiumLogic.ts'], tags: ['iap', 'ads', 'language', 'export']
    },
    {
      id: 'player-state', code: 'AE-11', title: 'Canonical Player State', category: 'core', layer: 'code', x: 610, y: 720,
      summary: 'The central contract connecting every page and simulation: identity, stats, work, releases, social life, money, world, studio, and streaming.',
      how: ['UI reads one Player snapshot.', 'Actions return or produce the next Player.', 'Autosave compacts and persists the state after changes.'],
      inputs: ['UI actions', 'Weekly processors', 'Migration'], outputs: ['Every rendered system', 'Persistence snapshot', 'Telemetry context'],
      state: ['Player', 'WorldState', 'OwnedStreamingPlatformState'], files: ['types.ts', 'App.tsx'], tags: ['state', 'model', 'source of truth']
    },
    {
      id: 'weekly-loop', code: 'AE-12', title: 'Next Week Engine', category: 'core', layer: 'code', x: 850, y: 690,
      summary: 'The heartbeat of Actor Empire. One advance coordinates career, productions, releases, world events, money, relationships, studios, and EMPIRE+.',
      how: ['Lock the week and snapshot current state.', 'Process staged systems and scheduled events.', 'Return the next Player, show outcomes, then autosave.'],
      inputs: ['Player snapshot', 'Random/events', 'Locked CEO plan'], outputs: ['Week +1', 'Resolved events', 'Updated world/economy'],
      state: ['currentWeek', 'pendingEvents', 'logs', 'flags'], files: ['services/gameLoop.ts', 'App.tsx', 'services/streamingWeeklyLoop.ts'], tags: ['week', 'simulation', 'tick', 'heartbeat']
    },
    {
      id: 'energy', code: 'AE-13', title: 'Energy Economy', category: 'core', layer: 'code', x: 850, y: 120,
      summary: 'Constrains high-value actions and resets the weekly action budget while preserving premium recovery paths.',
      how: ['Actions check a defined energy cost.', 'Successful actions spend from the shared pool.', 'Next Week resets the budget after commitments are synchronized.'],
      inputs: ['Action cost', 'Current/max energy'], outputs: ['Action permission', 'Weekly energy reset'],
      state: ['energy.current', 'energy.max'], files: ['services/premiumLogic.ts', 'services/energyCosts.ts', 'services/gameLoop.ts'], tags: ['action points', 'cost', 'reset']
    },
    {
      id: 'auditions', code: 'AE-14', title: 'Casting & Auditions', category: 'career', layer: 'code', x: 850, y: 300,
      summary: 'Generates accessible roles, evaluates applications, handles breakthrough invites, and determines audition outcomes against rivals.',
      how: ['Generate weekly opportunities from talent, fame, representation, and market.', 'Player applies and may prepare.', 'Casting evaluation resolves into rejection, callback, or commitment.'],
      inputs: ['Talent', 'Fame', 'Agent', 'Market demand'], outputs: ['Applications', 'Commitments', 'Career feedback'],
      state: ['weeklyOpportunities', 'applications', 'commitments'], files: ['services/roleLogic.ts', 'views/mobile/CastLinkApp.tsx', 'services/roleMarketDemand.ts'], tags: ['casting', 'role', 'agent', 'breakthrough']
    },
    {
      id: 'production-calendar', code: 'AE-15', title: 'Production Calendar', category: 'career', layer: 'code', x: 850, y: 500,
      summary: 'Moves acting and owned projects through preparation, production, post, press, and release phases.',
      how: ['Normalize a phase calendar for each commitment.', 'Advance phase time during the weekly tick.', 'Surface crises, director decisions, press, and completion.'],
      inputs: ['Commitment', 'Project type', 'Weekly progress'], outputs: ['Phase changes', 'Events', 'Completed project'],
      state: ['commitments[].phase', 'productionCalendar'], files: ['services/productionCalendar.ts', 'services/productionService.ts', 'views/CareerPage.tsx'], tags: ['pre-production', 'shoot', 'post']
    },
    {
      id: 'release-engine', code: 'AE-16', title: 'Release & Box Office', category: 'production', layer: 'code', x: 850, y: 900,
      summary: 'Turns completed work into theatrical, streaming, ratings, revenue, reviews, media narratives, and future potential.',
      how: ['Build release quality and audience reception.', 'Calculate weekly theatrical or licensing performance.', 'Close the run into history and create sequel/renewal potential.'],
      inputs: ['Project quality', 'Marketing', 'Cast', 'Market demand'], outputs: ['Gross/revenue', 'IMDb/reviews', 'Fame/reputation'],
      state: ['activeReleases', 'pastProjects', 'finance.history'], files: ['services/roleLogic.ts', 'services/theatricalRunLogic.ts', 'services/distributionRevenue.ts', 'views/mobile/BoxOfficeApp.tsx'], tags: ['theatrical', 'imdb', 'revenue', 'reviews']
    },
    {
      id: 'awards', code: 'AE-17', title: 'Awards Season', category: 'production', layer: 'code', x: 850, y: 1100,
      summary: 'Builds eligible ballots from the player and world, resolves ceremonies, and writes wins, losses, gossip, and industry history.',
      how: ['Check releases against the award calendar.', 'Generate nominations and a world-inclusive ballot.', 'Resolve winners and play the ceremony flow.'],
      inputs: ['Eligible releases', 'Performance', 'Campaign strength'], outputs: ['Awards', 'Fame', 'Award history/news'],
      state: ['awards', 'world.awardHistory', 'pendingEvent'], files: ['services/awardLogic.ts', 'views/AwardNightFlow.tsx', 'services/newsLogic.ts'], tags: ['oscar', 'nomination', 'ceremony']
    },
    {
      id: 'continuations', code: 'AE-18', title: 'Sequels & Renewals', category: 'production', layer: 'code', x: 850, y: 1290,
      summary: 'Carries successful movies, series, franchises, and actor relationships into consequential follow-up projects.',
      how: ['Evaluate future potential and release performance.', 'Generate continuation terms or a studio greenlight decision.', 'Create the follow-up script and returning cast status.'],
      inputs: ['Future potential', 'Original performance', 'Character status'], outputs: ['Sequel/renewal offer', 'Continuation script'],
      state: ['futurePotential', 'sequelDecisionMade', 'continuation history'], files: ['services/sequelFlow.ts', 'services/releaseContinuationLogic.ts', 'services/continuationReturnLogic.ts'], tags: ['franchise', 'renewal', 'return']
    },
    {
      id: 'development-lab', code: 'AE-19', title: 'Development Lab', category: 'production', layer: 'player', x: 1190, y: 120,
      summary: 'Creates and develops owned scripts, original IP, universes, characters, premises, and market-ready projects.',
      how: ['Acquire, write, or create a script and story DNA.', 'Develop package quality, rights, characters, and market fit.', 'Send a ready script into Greenlight.'],
      inputs: ['Scripts', 'Rights', 'Writer/director skill', 'Market trends'], outputs: ['Developed project', 'Universe slate', 'Greenlight candidate'],
      state: ['business.studio.scripts', 'original IP', 'universes'], files: ['views/lifestyle/business/DevelopmentLab.tsx', 'services/studioOriginalIp.ts', 'services/universeLogic.ts', 'services/characterIdentityLogic.ts'], tags: ['script', 'ip', 'universe', 'story']
    },
    {
      id: 'greenlight', code: 'AE-20', title: 'Greenlight Pipeline', category: 'production', layer: 'player', x: 1190, y: 330,
      summary: 'Packages a production through script, director, cast, crew, equipment, location, financing, setup, confirmation, and buzz.',
      how: ['Choose creative package and negotiate talent.', 'Balance budget, funding, risk, energy, and schedule.', 'Create the owned production commitment.'],
      inputs: ['Developed script', 'Talent markets', 'Cash/investors'], outputs: ['Production commitment', 'Budget plan', 'Cast/crew'],
      state: ['greenlight draft', 'business.studio.activeProductions'], files: ['views/lifestyle/business/GreenlightWizard.tsx', 'views/lifestyle/business/components/GreenlightScriptStep.tsx', 'views/lifestyle/business/components/GreenlightCrewStep.tsx', 'services/projectFundingEconomics.ts'], tags: ['cast', 'crew', 'budget', 'director']
    },
    {
      id: 'marketing', code: 'AE-21', title: 'Marketing & Release Strategy', category: 'production', layer: 'code', x: 1190, y: 540,
      summary: 'Positions a title, allocates channels and timing, builds buzz, and later measures whether campaign promises matched reality.',
      how: ['Choose campaign position, audience, channels, and spend.', 'Build awareness across the production calendar.', 'Compare forecast against post-release reality.'],
      inputs: ['Title identity', 'Audience', 'Budget', 'Timeline'], outputs: ['Buzz', 'Demand', 'Campaign narrative'],
      state: ['marketingStrategy', 'promotionalBuzz', 'campaign history'], files: ['services/marketingStrategy.ts', 'services/releaseTiming.ts', 'services/marketingReality.ts'], tags: ['campaign', 'buzz', 'audience']
    },
    {
      id: 'production-house', code: 'AE-22', title: 'Production House', category: 'studio', layer: 'player', x: 1190, y: 760,
      summary: 'The owned-studio operating surface connecting development, production, releases, talent, companies, and strategic expansion.',
      how: ['Found or unlock the studio business.', 'Manage the development slate and active productions.', 'Turn release results into valuation, reputation, and new strategic options.'],
      inputs: ['Business state', 'Cash', 'Scripts', 'Talent roster'], outputs: ['Owned films/series', 'Studio valuation', 'Strategic unlocks'],
      state: ['businesses[].studio', 'studio', 'studioMemory'], files: ['views/lifestyle/business/ProductionHouseGame.tsx', 'services/businessLogic.ts', 'services/studioProductionEconomy.ts'], tags: ['studio', 'owned production', 'hq']
    },
    {
      id: 'rights-market', code: 'AE-23', title: 'Rights Deal Room', category: 'studio', layer: 'player', x: 1190, y: 970,
      summary: 'Scouts, investigates, tracks, negotiates, and acquires story rights that feed the studio and streaming catalog.',
      how: ['Refresh or scout market opportunities.', 'Pay for investigation to expose risk and leverage.', 'Negotiate terms and convert ownership into usable IP.'],
      inputs: ['Cash', 'Market cycle', 'Studio context'], outputs: ['Owned rights', 'Negotiation events', 'Development inputs'],
      state: ['rightsMarket', 'ownedRights', 'investigations'], files: ['views/lifestyle/business/components/RightsDealRoom.tsx', 'services/rightsMarket.ts', 'services/rightsNegotiation.ts'], tags: ['rights', 'license', 'scouting']
    },
    {
      id: 'studio-control', code: 'AE-24', title: 'Studios, Groups & Subsidiaries', category: 'studio', layer: 'code', x: 1190, y: 1170,
      summary: 'Supports minority stakes, control acquisitions, autonomous subsidiaries, studio groups, rebrands, mandates, sales, and royalties.',
      how: ['Discover a studio through Forbes and markets.', 'Buy influence or control using cash, equity, or debt.', 'Operate it directly, through mandates, or as a subsidiary.'],
      inputs: ['Company position', 'Capital', 'Studio market'], outputs: ['Ownership', 'Subsidiary projects', 'Group valuation'],
      state: ['studioOwnership', 'subsidiaries', 'studioGroup'], files: ['services/studioOwnership.ts', 'services/studioAcquisition.ts', 'services/subsidiaryOperations.ts', 'services/studioGroup.ts'], tags: ['acquisition', 'subsidiary', 'ownership']
    },
    {
      id: 'businesses-assets', code: 'AE-25', title: 'Businesses & Assets', category: 'economy', layer: 'player', x: 1190, y: 1360,
      summary: 'Runs service and product businesses while properties, vehicles, lifestyle activities, and real estate affect cash and life quality.',
      how: ['Buy, configure, or create an asset/business.', 'Operate capacity, staff, pricing, stock, rent, and promotion.', 'Resolve weekly costs, traffic, revenue, value, and memories.'],
      inputs: ['Cash', 'Catalogs', 'Staff', 'Demand'], outputs: ['Revenue/expense', 'Valuation', 'Lifestyle effects'],
      state: ['businesses', 'assets', 'assetStates', 'lifestyleActivities'], files: ['services/businessLogic.ts', 'services/lifestyleLogic.ts', 'services/realEstateLogic.ts', 'views/lifestyle/LifestyleBusiness.tsx'], tags: ['property', 'vehicle', 'company', 'rent']
    },
    {
      id: 'finance', code: 'AE-26', title: 'Finance, Loans & Debt', category: 'economy', layer: 'code', x: 1500, y: 120,
      summary: 'Records the cash ledger, taxes, salaries, loans, credit health, investments, sponsorships, and debt countdowns.',
      how: ['Every economic action writes a transaction or obligation.', 'Weekly processing collects income and pays costs.', 'Debt and credit state create warnings, penalties, or failure pressure.'],
      inputs: ['Revenue', 'Expenses', 'Loan terms'], outputs: ['Money', 'Finance history', 'Credit/debt status'],
      state: ['money', 'finance.history', 'finance.loans', 'finance.credit'], files: ['services/gameLoop.ts', 'services/loanLogic.ts', 'views/mobile/BankApp.tsx', 'services/acquisitionDebt.ts'], tags: ['cash', 'tax', 'credit', 'loan']
    },
    {
      id: 'stocks', code: 'AE-27', title: 'Stocks & Shareholder Power', category: 'economy', layer: 'player', x: 1500, y: 330,
      summary: 'Lets the player trade entertainment companies, collect dividends, vote, build stakes, and trigger takeover or control events.',
      how: ['Initialize and reprice the entertainment market weekly.', 'Trade shares through the phone.', 'Resolve votes, control thresholds, takeovers, and retaliation.'],
      inputs: ['Cash', 'Company performance', 'Market events'], outputs: ['Portfolio value', 'Dividends', 'Control/influence'],
      state: ['stocks', 'portfolio', 'shareholderVotes', 'stockTakeovers'], files: ['services/stockLogic.ts', 'services/shareholderVoting.ts', 'services/stockTakeover.ts', 'views/mobile/StocksApp.tsx'], tags: ['market', 'shares', 'dividend', 'vote']
    },
    {
      id: 'news-media', code: 'AE-28', title: 'News, Press & Public Image', category: 'social', layer: 'code', x: 1500, y: 540,
      summary: 'Translates game events into headlines, feeds, reviews, press questions, reputation shifts, and audience reaction.',
      how: ['Systems emit meaningful outcomes.', 'Narrative services turn them into news and reactions.', 'Phone apps and events let the player observe or respond.'],
      inputs: ['Releases', 'Relationships', 'World events'], outputs: ['News', 'Feeds', 'Heat/reputation'],
      state: ['news', 'logs', 'heat', 'pendingEvent'], files: ['services/newsLogic.ts', 'services/releaseMediaNarrative.ts', 'views/mobile/NewsApp.tsx', 'views/PressConferenceEvent.tsx'], tags: ['headline', 'press', 'reputation', 'heat']
    },
    {
      id: 'creator-platforms', code: 'AE-29', title: 'Instagram, X & YouTube', category: 'social', layer: 'player', x: 1500, y: 750,
      summary: 'Three distinct creator economies build reach, authenticity, controversy, sponsorships, collaborations, memberships, and audience trust.',
      how: ['Publish or respond through a phone app.', 'Calculate platform-specific reach and feedback.', 'Weekly processors deliver offers, income, risks, and growth.'],
      inputs: ['Content choices', 'Fame', 'Project activity'], outputs: ['Followers/subscribers', 'Deals', 'Public-image shifts'],
      state: ['instagram', 'x', 'youtube', 'activeSponsorships'], files: ['services/instagramLogic.ts', 'services/xLogic.ts', 'services/youtubeLogic.ts', 'views/mobile/YoutubeApp.tsx'], tags: ['social media', 'followers', 'brand deal']
    },
    {
      id: 'team-talent', code: 'AE-30', title: 'Representation & Talent Network', category: 'career', layer: 'code', x: 1500, y: 950,
      summary: 'Agents, managers, trainers, stylists, therapists, publicists, wellness staff, cast, crew, and studio talent shape opportunity and execution.',
      how: ['Generate or refresh the relevant talent market.', 'Hire, negotiate, or maintain a relationship.', 'Apply access, skill, cost, chemistry, and instability effects.'],
      inputs: ['Money', 'Fame', 'Relationships', 'Market pools'], outputs: ['Opportunity access', 'Project quality', 'Weekly fees'],
      state: ['team', 'relationships', 'studio.talentRoster'], files: ['services/teamLogic.ts', 'services/talentService.ts', 'services/crewMarket.ts', 'views/mobile/TeamApp.tsx'], tags: ['agent', 'manager', 'crew', 'roster']
    },
    {
      id: 'family-health', code: 'AE-31', title: 'Family, Health & Mortality', category: 'life', layer: 'code', x: 1500, y: 1160,
      summary: 'Runs pregnancy, children, breakups, divorce, obligations, health conditions, aging, death, inheritance, and playable heirs.',
      how: ['Weekly life processors evaluate relationships, age, and health.', 'Events ask the player to respond to consequences.', 'Death closes a life or transfers the empire to an eligible child.'],
      inputs: ['Age', 'Health', 'Relationships', 'Bloodline'], outputs: ['Family events', 'Medical state', 'Death/legacy transition'],
      state: ['activePregnancy', 'bloodline', 'activeHealthConditions', 'flags'], files: ['services/familyLogic.ts', 'services/healthConditions.ts', 'services/legacyLogic.ts', 'views/DeathScreen.tsx'], tags: ['pregnancy', 'divorce', 'death', 'heir']
    },
    {
      id: 'world-sim', code: 'AE-32', title: 'Living Industry World', category: 'world', layer: 'code', x: 1500, y: 1360,
      summary: 'Advances rival studios, platforms, industry projects, NPC careers, franchises, festivals, trends, acquisitions, and world reactions.',
      how: ['Advance world actors and companies each week.', 'Generate industry projects, news, rival moves, and market signals.', 'Let the player’s projects alter the shared world in return.'],
      inputs: ['WorldState', 'Player outcomes', 'Calendar'], outputs: ['Projects', 'Trends', 'Rival behavior', 'News'],
      state: ['world.projects', 'world.studios', 'world.platforms', 'world.universes'], files: ['services/worldLogic.ts', 'services/worldReactions.ts', 'services/npcLogic.ts', 'services/universeLogic.ts'], tags: ['npc', 'rivals', 'hollywood', 'universe']
    },
    {
      id: 'streaming-gate', code: 'AE-33', title: 'EMPIRE+ Access', category: 'streaming', layer: 'player', x: 1760, y: 120,
      summary: 'Evaluates whether the player can enter the owned-streaming journey, explains blockers, and routes founded platforms into HQ.',
      how: ['Check studio, career, capital, and progression requirements.', 'Show a locked roadmap or founding journey.', 'Route an incorporated company into the active HQ.'],
      inputs: ['Eligibility signals', 'Owned platform lifecycle'], outputs: ['Locked explanation', 'Founding/HQ route'],
      state: ['ownedStreamingPlatform.lifecycle', 'eligibility'], files: ['components/StreamingLockedScreen.tsx', 'services/streamingEligibility.ts', 'services/streamingAccessPolicy.ts'], tags: ['unlock', 'platform', 'gate']
    },
    {
      id: 'streaming-founding', code: 'AE-34', title: 'Found EMPIRE+', category: 'streaming', layer: 'player', x: 1760, y: 310,
      summary: 'Creates the company identity, brand promise, logo, sound, palette, legal structure, and initial capital before incorporation.',
      how: ['Choose the brand and strategic promise.', 'Validate founding choices and financing.', 'Incorporate the owned streaming platform into Player state.'],
      inputs: ['Brand choices', 'Player/studio identity', 'Capital'], outputs: ['Owned platform state', 'Founding cinematic', 'Lifecycle transition'],
      state: ['foundingDraft', 'brand', 'finance', 'lifecycle'], files: ['components/StreamingFoundingJourney.tsx', 'components/StreamingFoundingWizard.tsx', 'services/streamingFounding.ts', 'services/ownedStreamingPlatform.ts'], tags: ['incorporate', 'brand', 'logo']
    },
    {
      id: 'streaming-infra', code: 'AE-35', title: 'Infrastructure Network', category: 'streaming', layer: 'player', x: 1760, y: 500,
      summary: 'Builds physical facilities, rooms, racks, duties, backbone capacity, research, load tests, construction, launch rehearsal, and live operations.',
      how: ['Select markets and commission facilities.', 'Design rack workloads within power, cooling, and capacity limits.', 'Research, construct, rehearse, launch, and operate the network.'],
      inputs: ['Capital', 'Target markets', 'Capacity design', 'Research'], outputs: ['Facilities', 'Delivery capacity', 'Reliability incidents'],
      state: ['infrastructure', 'facilities', 'rackGroups', 'operations'], files: ['components/streaming-transplant/StreamingBuildoutExperience.tsx', 'components/StreamingInfrastructureChronicle.tsx', 'services/streamingInfrastructure.ts', 'services/streamingFacilities.ts', 'services/streamingRackGroups.ts'], tags: ['data center', 'rack', 'capacity', 'phase 1-10']
    },
    {
      id: 'streaming-hq', code: 'AE-36', title: 'Streaming Platform HQ', category: 'streaming', layer: 'player', x: 1760, y: 710,
      summary: 'The operating shell connecting the CEO brief, audience, catalog, originals, rights, finance, product, technology, rivals, crises, and legacy.',
      how: ['Read lifecycle and latest weekly operating snapshot.', 'Open a specialized desk and make bounded decisions.', 'Return to HQ where the next week resolves the full company.'],
      inputs: ['Owned platform state', 'Weekly brief', 'Cinematic queue'], outputs: ['Desk routes', 'CEO decisions', 'Acknowledgements'],
      state: ['hq', 'weeklyDecisions', 'cinematicQueue'], files: ['components/StreamingPlatformHQ.tsx', 'services/streamingHq.ts', 'components/StreamingWeeklyCeoLoop.tsx'], tags: ['ceo', 'dashboard', 'operating system']
    },
    {
      id: 'streaming-content', code: 'AE-37', title: 'Catalog, Rights & Originals', category: 'streaming', layer: 'code', x: 1760, y: 920,
      summary: 'Combines licensed catalog, owned studio titles, rights exchange, acquisitions, original commissioning, production delivery, and title analytics.',
      how: ['Acquire or identify a title for the platform.', 'License, commission, or send an original into Production House.', 'Launch it into the catalog and learn from audience performance.'],
      inputs: ['Rights', 'Owned releases', 'Content budget', 'Audience demand'], outputs: ['Catalog entries', 'Originals slate', 'Title performance'],
      state: ['catalog', 'rightsDeals', 'originals', 'titleAnalytics'], files: ['services/streamingCatalog.ts', 'services/streamingRightsMarketplace.ts', 'services/streamingOriginals.ts', 'components/StreamingOriginalsStudio.tsx'], tags: ['catalogue', 'license', 'original']
    },
    {
      id: 'streaming-audience', code: 'AE-38', title: 'Audience & Market', category: 'streaming', layer: 'code', x: 1760, y: 1120,
      summary: 'Models subscribers, churn, acquisition, pricing, ad tiers, regions, bundles, promotion, brand, trust, market share, and viewer experience.',
      how: ['Set a market-facing plan.', 'Forecast demand against product, brand, catalog, price, and capacity.', 'Weekly resolution moves subscribers, revenue, churn, trust, and share.'],
      inputs: ['Catalog strength', 'Price/tier', 'Brand', 'Infrastructure'], outputs: ['Subscribers', 'Churn', 'ARPU', 'Market share'],
      state: ['audience', 'market', 'promotion', 'viewerExperience'], files: ['services/streamingAudienceMarket.ts', 'services/streamingEconomy.ts', 'services/streamingPromotion.ts', 'components/StreamingAnalyticsCenter.tsx'], tags: ['subscriber', 'churn', 'pricing', 'ads']
    },
    {
      id: 'streaming-product', code: 'AE-39', title: 'Product & Technology', category: 'streaming', layer: 'code', x: 1760, y: 1320,
      summary: 'Runs product lines, research, technology campus, viewer features, executive development, resilience, and long-term platform capabilities.',
      how: ['Fund research or a product initiative.', 'Build capability over time through campus and teams.', 'Convert delivered technology into audience, efficiency, or reliability gains.'],
      inputs: ['Research capital', 'Leadership', 'Campus capacity'], outputs: ['Product features', 'Tech capability', 'Operational modifiers'],
      state: ['productSuite', 'technologyCampus', 'research'], files: ['services/streamingProductSuite.ts', 'services/streamingTechnologyCampus.ts', 'components/StreamingProductLab.tsx', 'components/StreamingTechnologyCampus.tsx'], tags: ['product', 'research', 'technology']
    },
    {
      id: 'streaming-finance', code: 'AE-40', title: 'Streaming Capital & Governance', category: 'streaming', layer: 'code', x: 2130, y: 120,
      summary: 'Controls runway, financing, loans, equity, investors, executives, board motions, acquisitions, and the tension between ownership and growth.',
      how: ['Read runway and strategic capital need.', 'Choose debt, equity, partner, or internal funding.', 'Resolve ownership, board, leadership, and future obligations.'],
      inputs: ['Cash flow', 'Valuation', 'Growth plan'], outputs: ['Capital', 'Dilution/debt', 'Governance changes'],
      state: ['finance', 'equityHolders', 'board', 'executives'], files: ['services/streamingFinancing.ts', 'services/streamingLeadershipGovernance.ts', 'services/streamingCompany.ts'], tags: ['funding', 'equity', 'board', 'runway']
    },
    {
      id: 'streaming-rivals', code: 'AE-41', title: 'Rivals, Crises & Security', category: 'streaming', layer: 'code', x: 2130, y: 330,
      summary: 'Creates competitive moves, global platform wars, incidents, cyber/operational crises, regulator pressure, awards, and strategic response.',
      how: ['Competitive world and infrastructure generate pressure.', 'Incident Command presents a timed strategic choice.', 'Resolution changes trust, reliability, finances, rivals, or oversight.'],
      inputs: ['Market position', 'Infrastructure risk', 'Rival state'], outputs: ['Crisis records', 'Competitive shifts', 'Trust/financial impact'],
      state: ['rivalMoves', 'crises', 'incidents', 'oversightCases'], files: ['services/streamingCompetitiveWorld.ts', 'services/streamingCrisisSecurity.ts', 'components/StreamingIncidentCommand.tsx', 'components/StreamingPlatformWars.tsx'], tags: ['crisis', 'security', 'competition']
    },
    {
      id: 'streaming-week', code: 'AE-42', title: 'EMPIRE+ Weekly CEO Loop', category: 'streaming', layer: 'code', x: 2130, y: 550,
      summary: 'Locks the CEO plan, processes the whole streaming company exactly once per week, and produces a report for acknowledgement.',
      how: ['Review CEO brief and lock one weekly posture.', 'GameLoop calls the owned-platform processor.', 'Report the resolved audience, finance, content, risk, and milestone changes.'],
      inputs: ['Locked CEO plan', 'Owned platform state', 'Player week'], outputs: ['Weekly snapshot', 'CEO report', 'Milestones/cinematics'],
      state: ['weeklyPlans', 'weeklyHistory', 'processedWeekKeys'], files: ['services/streamingWeeklyLoop.ts', 'services/ownedStreamingPlatform.ts', 'components/StreamingWeeklyCeoLoop.tsx'], tags: ['weekly plan', 'report', 'idempotent']
    },
    {
      id: 'streaming-legacy', code: 'AE-43', title: 'Streaming Legacy', category: 'streaming', layer: 'player', x: 2130, y: 760,
      summary: 'Preserves the platform across eras, milestones, founder death, heir handoff, governance changes, closed eras, and chronicle views.',
      how: ['Record meaningful company facts and milestones.', 'Compact history into a readable chronicle.', 'Transfer ownership and operating continuity to an eligible heir.'],
      inputs: ['Lifecycle history', 'Founder/bloodline', 'Milestones'], outputs: ['Chronicle', 'Heir ownership', 'Legacy montage'],
      state: ['milestones', 'closedEras', 'legacyMontages', 'ownership'], files: ['services/streamingLegacy.ts', 'components/StreamingLegacyOffice.tsx', 'components/StreamingInfrastructureChronicle.tsx'], tags: ['heir', 'chronicle', 'history']
    },
    {
      id: 'persistence', code: 'AE-44', title: 'Autosave & Persistence', category: 'platform', layer: 'code', x: 2130, y: 970,
      summary: 'Debounces player changes, compacts heavy state, externalizes poster media, writes IndexedDB, and maintains lightweight slot summaries.',
      how: ['Observe changed Player state while playing.', 'Compact, externalize media, and build a summary.', 'Write the full slot to IndexedDB and the summary mirror locally.'],
      inputs: ['Player state', 'Current slot', 'Poster media'], outputs: ['Durable save', 'Slot summary', 'Recovery data'],
      state: ['actorEmpireSave_n', 'save summary', 'media records'], files: ['App.tsx', 'services/storage.ts', 'services/saveCompaction.ts', 'services/customPosterMedia.ts'], tags: ['indexeddb', 'autosave', 'compact']
    },
    {
      id: 'migration', code: 'AE-45', title: 'Save Migration & Transfer', category: 'platform', layer: 'code', x: 2130, y: 1150,
      summary: 'Normalizes older saves into the current schema, grants eligible care packages, and signs archives for device transfer.',
      how: ['Load raw save data only after selection.', 'Migrate nested systems and repair required defaults.', 'Optionally export or replace saves through a signed archive.'],
      inputs: ['Legacy/current save', 'Migration version'], outputs: ['Canonical Player', 'Transfer archive', 'Care package'],
      state: ['flags.saveMigrationVersion', 'archive metadata'], files: ['services/saveMigration.ts', 'services/saveTransfer.ts', 'services/migrationCarePackage.ts'], tags: ['legacy save', 'import', 'export', 'repair']
    },
    {
      id: 'telemetry', code: 'AE-46', title: 'Telemetry & Recovery', category: 'platform', layer: 'code', x: 2130, y: 1330,
      summary: 'Tracks screens, actions, crashes, performance, interrupted weeks, and non-fatal failures without becoming gameplay truth.',
      how: ['Set current screen and contextual breadcrumbs.', 'Mark critical flow stages and performance traces.', 'Recover interrupted processing or show a safe error boundary.'],
      inputs: ['Screen/action context', 'Errors', 'Week stages'], outputs: ['Analytics events', 'Crash evidence', 'Recovery UX'],
      state: ['trace context', 'breadcrumbs', 'safe boot key'], files: ['services/firebaseService.ts', 'App.tsx'], tags: ['crash', 'analytics', 'trace', 'safe boot']
    },
    {
      id: 'native-commerce', code: 'AE-47', title: 'Native Commerce & Ads', category: 'platform', layer: 'code', x: 2380, y: 1050,
      summary: 'Bridges rewarded ads and iOS/Android purchases into verified, idempotent player entitlements and recovery receipts.',
      how: ['Begin an ad or store transaction.', 'Verify/restore the platform result and deduplicate transaction IDs.', 'Grant energy, no-ads, or premium ownership and persist it.'],
      inputs: ['Native store result', 'Ad callback', 'Product ID'], outputs: ['Premium entitlement', 'Energy reward', 'No-ads state'],
      state: ['processed transaction IDs', 'pending reward receipt'], files: ['services/iapService.ts', 'services/androidPurchaseVerifier.ts', 'services/adLogic.ts', 'services/rewardedAdRecovery.ts'], tags: ['purchase', 'admob', 'receipt']
    }
  ];

  const edge = (from, to, label, type = 'flow') => ({ from, to, label, type });
  const edges = [
    edge('start-menu', 'creation', 'new career'), edge('start-menu', 'migration', 'load existing', 'data'), edge('creation', 'player-state', 'initialize', 'data'),
    edge('player-state', 'home', 'renders', 'data'), edge('home', 'navigation', 'open page'), edge('navigation', 'career-page', 'Career'), edge('navigation', 'improve', 'Improve'),
    edge('navigation', 'social-page', 'Social'), edge('navigation', 'lifestyle-hub', 'Lifestyle'), edge('navigation', 'mobile-hub', 'Mobile'), edge('navigation', 'store-settings', 'Store / Settings'),
    edge('home', 'weekly-loop', 'Next Week'), edge('weekly-loop', 'player-state', 'next state', 'data'), edge('player-state', 'persistence', 'autosave', 'data'),
    edge('persistence', 'start-menu', 'slot summaries', 'data'), edge('migration', 'player-state', 'canonical state', 'data'), edge('store-settings', 'migration', 'import/export', 'data'),
    edge('store-settings', 'native-commerce', 'purchase / ad'), edge('native-commerce', 'player-state', 'grant entitlement', 'data'), edge('player-state', 'telemetry', 'context', 'data'),
    edge('telemetry', 'start-menu', 'safe recovery', 'affects'), edge('energy', 'career-page', 'action budget', 'affects'), edge('energy', 'improve', 'action budget', 'affects'),
    edge('weekly-loop', 'energy', 'weekly reset', 'affects'), edge('career-page', 'production-calendar', 'work actions'), edge('auditions', 'career-page', 'new commitment'),
    edge('mobile-hub', 'auditions', 'CastLink'), edge('team-talent', 'auditions', 'access modifier', 'affects'), edge('improve', 'auditions', 'skill modifier', 'affects'),
    edge('production-calendar', 'release-engine', 'project completes'), edge('release-engine', 'awards', 'eligible release'), edge('release-engine', 'continuations', 'future potential'),
    edge('release-engine', 'player-state', 'career results', 'data'), edge('awards', 'news-media', 'ceremony story'), edge('continuations', 'production-calendar', 'follow-up job'),
    edge('lifestyle-hub', 'businesses-assets', 'business / assets'), edge('lifestyle-hub', 'production-house', 'production house'), edge('lifestyle-hub', 'streaming-gate', 'streaming platform'),
    edge('production-house', 'development-lab', 'develop'), edge('development-lab', 'greenlight', 'ready script'), edge('rights-market', 'development-lab', 'owned IP'),
    edge('greenlight', 'production-calendar', 'owned production'), edge('marketing', 'release-engine', 'demand modifier', 'affects'), edge('greenlight', 'marketing', 'campaign setup'),
    edge('release-engine', 'production-house', 'studio outcome', 'data'), edge('production-house', 'rights-market', 'deal room'), edge('production-house', 'studio-control', 'expand empire'),
    edge('studio-control', 'world-sim', 'industry ownership', 'affects'), edge('businesses-assets', 'finance', 'weekly cash flow'), edge('production-house', 'finance', 'budgets / revenue'),
    edge('finance', 'player-state', 'money & ledger', 'data'), edge('mobile-hub', 'stocks', 'Stocks / Forbes'), edge('stocks', 'finance', 'trades / dividends'),
    edge('stocks', 'studio-control', 'control stake'), edge('world-sim', 'stocks', 'repricing', 'affects'), edge('weekly-loop', 'world-sim', 'advance world'),
    edge('weekly-loop', 'finance', 'settle obligations'), edge('weekly-loop', 'family-health', 'advance life'), edge('weekly-loop', 'news-media', 'publish outcomes'),
    edge('weekly-loop', 'creator-platforms', 'process channels'), edge('weekly-loop', 'team-talent', 'refresh / fees'), edge('weekly-loop', 'businesses-assets', 'operate'),
    edge('social-page', 'family-health', 'relationship choices'), edge('family-health', 'player-state', 'life changes', 'data'), edge('family-health', 'streaming-legacy', 'heir handoff'),
    edge('mobile-hub', 'creator-platforms', 'social apps'), edge('creator-platforms', 'news-media', 'public reaction'), edge('news-media', 'auditions', 'reputation', 'affects'),
    edge('team-talent', 'greenlight', 'cast / crew'), edge('world-sim', 'auditions', 'industry roles'), edge('world-sim', 'awards', 'world ballot'), edge('world-sim', 'news-media', 'industry news'),
    edge('streaming-gate', 'streaming-founding', 'eligible'), edge('streaming-founding', 'streaming-infra', 'build company'), edge('streaming-infra', 'streaming-hq', 'launch ready'),
    edge('streaming-hq', 'streaming-content', 'content desk'), edge('streaming-hq', 'streaming-audience', 'audience desk'), edge('streaming-hq', 'streaming-product', 'product desk'),
    edge('streaming-hq', 'streaming-finance', 'capital desk'), edge('streaming-hq', 'streaming-rivals', 'incident command'), edge('streaming-hq', 'streaming-week', 'CEO plan'),
    edge('streaming-content', 'production-house', 'original production'), edge('rights-market', 'streaming-content', 'license / rights'), edge('release-engine', 'streaming-content', 'owned titles'),
    edge('streaming-content', 'streaming-audience', 'catalog strength', 'affects'), edge('streaming-product', 'streaming-audience', 'viewer experience', 'affects'), edge('streaming-infra', 'streaming-audience', 'delivery quality', 'affects'),
    edge('streaming-finance', 'streaming-product', 'funds'), edge('streaming-finance', 'streaming-infra', 'funds'), edge('streaming-audience', 'streaming-finance', 'revenue / valuation'),
    edge('streaming-rivals', 'streaming-audience', 'market pressure', 'affects'), edge('streaming-infra', 'streaming-rivals', 'incident risk', 'affects'), edge('world-sim', 'streaming-rivals', 'competitive world'),
    edge('streaming-week', 'weekly-loop', 'platform processor'), edge('streaming-week', 'streaming-content', 'weekly resolution', 'affects'), edge('streaming-week', 'streaming-audience', 'weekly resolution', 'affects'),
    edge('streaming-week', 'streaming-finance', 'weekly resolution', 'affects'), edge('streaming-week', 'streaming-rivals', 'weekly resolution', 'affects'), edge('streaming-week', 'streaming-legacy', 'record milestone'),
    edge('streaming-legacy', 'persistence', 'compact history', 'data'), edge('streaming-hq', 'player-state', 'owned platform', 'data'), edge('player-state', 'streaming-gate', 'eligibility + lifecycle', 'data')
  ];

  const journeys = [
    { id: 'first-week', title: 'Start a new career', subtitle: 'Boot → identity → home → first week', color: '#f5c451', nodes: ['start-menu', 'creation', 'player-state', 'home', 'weekly-loop', 'persistence'] },
    { id: 'actor-breakthrough', title: 'Land a breakthrough role', subtitle: 'Train → representation → audition → release', color: '#f08a5d', nodes: ['improve', 'team-talent', 'auditions', 'career-page', 'production-calendar', 'release-engine', 'news-media'] },
    { id: 'make-movie', title: 'Make your own movie', subtitle: 'Rights/script → greenlight → market → release', color: '#e56b9f', nodes: ['production-house', 'rights-market', 'development-lab', 'greenlight', 'production-calendar', 'marketing', 'release-engine', 'awards', 'continuations'] },
    { id: 'studio-empire', title: 'Build a studio empire', subtitle: 'Production house → capital → control → group', color: '#9b83f3', nodes: ['production-house', 'finance', 'stocks', 'studio-control', 'world-sim'] },
    { id: 'launch-streaming', title: 'Launch EMPIRE+', subtitle: 'Unlock → found → build → launch → operate', color: '#42c7c7', nodes: ['streaming-gate', 'streaming-founding', 'streaming-infra', 'streaming-hq', 'streaming-content', 'streaming-audience', 'streaming-week', 'weekly-loop'] },
    { id: 'streaming-original', title: 'Release an EMPIRE+ Original', subtitle: 'Commission → produce → deliver → learn', color: '#42c7c7', nodes: ['streaming-hq', 'streaming-content', 'production-house', 'development-lab', 'greenlight', 'production-calendar', 'release-engine', 'streaming-content', 'streaming-audience'] },
    { id: 'bloodline', title: 'Continue the legacy', subtitle: 'Family → death → heir → preserved empire', color: '#77c66e', nodes: ['social-page', 'family-health', 'streaming-legacy', 'player-state', 'persistence'] }
  ];

  window.BLUEPRINT_DATA = { categories, zones, nodes, edges, journeys };
})();
