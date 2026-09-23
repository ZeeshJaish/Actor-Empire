export type ClaudeIntegrationTag = 'STYLE' | 'LOGIC' | 'DATA' | 'DEP' | 'ASSET';
export type ClaudeIntegrationDisposition = 'PORT' | 'REIMPLEMENT' | 'SUPERSEDED' | 'REJECTED_WITH_APPROVAL';

export interface ClaudeIndexedSource {
  sourcePath: string;
  sourceEntries: string[];
  tags: ClaudeIntegrationTag[];
}

export interface ClaudeIntegrationDecision {
  disposition: ClaudeIntegrationDisposition;
  targetPaths: string[];
  reason: string;
  approvalRecord?: string;
  approvalGate?: '#77-#79';
}

export interface ClaudeIntegrationManifestEntry extends ClaudeIndexedSource, ClaudeIntegrationDecision {}

const RELEASE_AUDITS = {
  manifest: ['audit:claude-frontend-integration-manifest'],
  presentation: [
    'audit:claude-frontend-phase5-ui',
    'audit:streaming-claude-ui-accessibility',
    'audit:streaming-claude-ui-responsive',
    'audit:streaming-design-system',
  ],
  foundation: [
    'audit:streaming-canonical-foundation-phase1',
    'audit:streaming-facility-foundation-phase1',
  ],
  network: [
    'audit:streaming-phase2-engines',
    'audit:streaming-network-catalogues-phase2',
    'audit:streaming-region-placer',
    'audit:streaming-regional-plan-migration',
    'audit:streaming-build-phase4-ui',
    'audit:streaming-build-lab-career-parity',
    'audit:streaming-build-test-autosave-gates',
    'audit:streaming-network-launch-connection-phase4',
    'audit:streaming-regional-network-lifecycle',
  ],
  launch: [
    'audit:streaming-road-to-opening-phase3',
    'audit:streaming-launch-research-locks',
    'audit:streaming-launch-marketing-ui',
    'audit:streaming-launch-marketing-lifecycle',
    'audit:streaming-linked-budget-sheets',
    'audit:streaming-pricing-world',
    'audit:streaming-opening-programme',
    'audit:streaming-opening-programme-ui',
  ],
  content: [
    'audit:streaming-content-desk-consolidation',
    'audit:content-market-cm1',
    'audit:content-market-cm2',
    'audit:content-market-cm3',
    'audit:content-market-cm4',
    'audit:streaming-hq-phase4',
  ],
  infrastructure: [
    'audit:streaming-infrastructure-phase5',
    'audit:streaming-infrastructure-operations-phase9',
    'audit:streaming-infrastructure-finale-phase10',
    'audit:streaming-research-integration-phase7',
    'audit:streaming-campus-construction-phase8',
    'audit:streaming-technology-campus-phase17',
  ],
  lifecycle: [
    'audit:streaming-weekly-loop-phase10',
    'audit:streaming-launch-phase8',
    'audit:streaming-regional-network-lifecycle',
  ],
  world: [
    'audit:streaming-global-localization',
    'audit:world-population-we1',
    'audit:world-streaming-we4',
    'audit:world-streaming-we5',
    'audit:world-streaming-we6',
    'audit:world-streaming-we7',
    'audit:world-economy-we8-release',
  ],
  lifestyle: ['audit:lifestyle-assets-ui'],
  identity: ['audit:actor-empire-intro-flow', 'audit:profile-avatar-migration'],
} as const;

type ReleaseAudit = typeof RELEASE_AUDITS[keyof typeof RELEASE_AUDITS][number];

const uniqueAudits = (audits: readonly ReleaseAudit[]): ReleaseAudit[] => [...new Set(audits)];

const deriveAffectedAudits = (
  source: ClaudeIndexedSource,
  decision: ClaudeIntegrationDecision,
): ReleaseAudit[] => {
  const joinedPath = [source.sourcePath, ...decision.targetPaths].join(' ').toLowerCase();
  const audits: ReleaseAudit[] = [...RELEASE_AUDITS.manifest];
  const include = (group: readonly ReleaseAudit[]) => audits.push(...group);

  if (source.tags.includes('STYLE') || /components|styles|\.tsx|\.html/.test(joinedPath)) {
    include(RELEASE_AUDITS.presentation);
  }
  if (/app\.tsx|types\.ts|canonical|ownedstreamingplatform/.test(joinedPath)) {
    include(RELEASE_AUDITS.foundation);
    include(RELEASE_AUDITS.lifecycle);
  }
  if (/build|network|server|rack|siteplace|tenure|cloud|facility|placer|worldmap|geography/.test(joinedPath)) {
    include(RELEASE_AUDITS.network);
  }
  if (/launch|pricing|ident|storefront|blueprint|opening|money|budget/.test(joinedPath)) {
    include(RELEASE_AUDITS.launch);
  }
  if (/contentmarket|content-market|platformhq|content-desk|catalog/.test(joinedPath)) {
    include(RELEASE_AUDITS.content);
  }
  if (/infrastructure|research|technology|campus|fibre/.test(joinedPath)) {
    include(RELEASE_AUDITS.infrastructure);
  }
  if (/weekly|construction|openingprogramme|launchprogram/.test(joinedPath)) {
    include(RELEASE_AUDITS.lifecycle);
  }
  if (/worldeconomy|worldpopulation|populationcluster|geography|localization/.test(joinedPath)) {
    include(RELEASE_AUDITS.world);
  }
  if (/lifestyle|realestate|dealer|tenure/.test(joinedPath)) {
    include(RELEASE_AUDITS.lifestyle);
  }
  if (/zedbury|intro|avatar|index\.html/.test(joinedPath)) {
    include(RELEASE_AUDITS.identity);
  }

  if (audits.length === RELEASE_AUDITS.manifest.length) include(RELEASE_AUDITS.foundation);
  return uniqueAudits(audits);
};

export interface ClaudeIntegrationManifestEntryWithAudits extends ClaudeIntegrationManifestEntry {
  affectedAudits: ReleaseAudit[];
}

export const CLAUDE_SOURCE_RECORD = {
  workspace: '/Users/zeesh/Vibe code/ae frontend',
  branch: 'claude/frontend-work',
  head: '5d02219409409d9ef3554228c69aa375d748ca29',
  workingTreeSha256: '606f037fbf53dd120d69b1bf815075b3c05199e3bb25719e347a31546cdaac93',
  codexBriefSha256: '0615bce13f2f5877dc1b0c26883b312e5364e9524a9e528c96e8714951cec21e',
  changesSha256: 'ea3486cfb2aeba99af218ca3a811575d1c1325825fdd1181cf23c7dc585dce32',
  changelogLastEntry: '#125',
  changelogLines: 9595,
  statusLines: 80,
  untrackedFiles: 18,
  pressFiles: 18,
  pressSha256: 'bc2cb7972229c9571c4a6e33fa3739191db3a2014353e5cc672ca8823fab49e7',
  expectedUniquePaths: 137,
} as const;

export const CLAUDE_FRONTEND_INDEXED_SOURCES: ClaudeIndexedSource[] = [
  { sourcePath: "App.tsx", sourceEntries: ["#1","#3"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "assets/zedbury.ts", sourceEntries: ["#1"], tags: ["ASSET"] },
  { sourcePath: "components/streaming-transplant/createCanonicalStreamingPresentation.ts", sourceEntries: ["#87","#90","#102"], tags: ["LOGIC"] },
  { sourcePath: "components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css", sourceEntries: ["#41","#42","#43","#44","#45","#46","#47"], tags: ["STYLE"] },
  { sourcePath: "components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDesk.module.css", sourceEntries: ["#87"], tags: ["STYLE"] },
  { sourcePath: "components/streaming-transplant/StreamingBuildoutExperience.tsx", sourceEntries: ["#41","#42","#43","#44","#45","#46","#47"], tags: ["STYLE"] },
  { sourcePath: "components/streaming-transplant/StreamingBuildWizardExperience.tsx", sourceEntries: ["#64","#73","#100","#101","#103","#106"], tags: ["LOGIC"] },
  { sourcePath: "components/streaming-transplant/StreamingNetworkExperience.tsx", sourceEntries: ["#87","#102"], tags: ["STYLE"] },
  { sourcePath: "components/streaming-transplant/streamingNetworkMap.ts", sourceEntries: ["#73"], tags: ["LOGIC"] },
  { sourcePath: "components/StreamingContentMarket.tsx", sourceEntries: ["#13","#14"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/StreamingDefineLaunchExperience.tsx", sourceEntries: ["#8"], tags: ["LOGIC"] },
  { sourcePath: "components/StreamingFoundingJourney.tsx", sourceEntries: ["#2"], tags: ["LOGIC"] },
  { sourcePath: "components/StreamingPlatformHQ.tsx", sourceEntries: ["#13"], tags: ["LOGIC"] },
  { sourcePath: "components/StreamingTechnologyCampus.tsx", sourceEntries: ["#26","#81","#82"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/BuildMetricSheet.tsx", sourceEntries: ["#105"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/BuildWizard.tsx", sourceEntries: ["#27","#30","#32","#34","#35","#48","#50","#51","#52","#53","#54","#55","#66","#67","#71","#72","#103","#27–#72","#84","#99","#50–#55"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/CityScene.tsx", sourceEntries: ["#72","#73","#105","#103"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/CloudRing.tsx", sourceEntries: ["#100"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/motion.ts", sourceEntries: ["#107"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/NetworkAtlas.tsx", sourceEntries: ["#76f","#77","#85","#88","#99","#100","#103","#106","#107","#108","#109","#110","#111","#112","#113","#114","#115","#117","#118"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/NetworkMap.tsx", sourceEntries: ["#36","#73"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/NetworkMapBox.tsx", sourceEntries: ["#76f","#84","#85","#98","#100","#103","#106","#107","#115","#120"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/NetworkPage.tsx", sourceEntries: ["#76f","#77","#80","#83","#84","#85","#86","#88","#89","#90","#92","#93","#96","#97","#98","#99","#100","#101","#103"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/NetworkParts.tsx", sourceEntries: ["#31","#32","#35","#105","#103","#35–#41","#101"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/NightBand.tsx", sourceEntries: ["#72"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/RackWall.tsx", sourceEntries: ["#105"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/RegionBoard.tsx", sourceEntries: ["#103","#104","#106","#107","#108","#109","#111","#114","#115","#116","#119"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/ResourceMetric.tsx", sourceEntries: ["#105"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/RoomCard.tsx", sourceEntries: ["#76f","#78","#89","#90","#91","#92","#93","#94","#95","#96","#100","#105","#103"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/RoomComposer.tsx", sourceEntries: ["#31","#32","#105","#103"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/ServerFill.tsx", sourceEntries: ["#99","#100","#103"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/SpecMeters.tsx", sourceEntries: ["#27","#29","#105","#103"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/StageLaunch.tsx", sourceEntries: ["#35","#48","#49","#106"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/StageMoney.tsx", sourceEntries: ["#33","#48–#55","#66","#71","#101","#105","#120","#121"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/StageNetwork.tsx", sourceEntries: ["#24","#25","#26","#27","#28","#29","#30","#31","#32","#35","#36","#67","#68","#69","#70","#71","#72","#73","#101","#103","#80","#83"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/StageServers.tsx", sourceEntries: ["#99","#100","#103"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/build/StageTest.tsx", sourceEntries: ["#37","#38","#39","#40","#41","#102","#106","#37–#41","#86","#90","#123"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/studioFinanceMap.ts", sourceEntries: ["#73"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/components/build/TeamPlanningCinematic.tsx", sourceEntries: ["#28","#29","#30","#31","#32"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/build/WorldMap.tsx", sourceEntries: ["#73"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/components/cine/CommissionCut.tsx", sourceEntries: ["#106"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/kit.tsx", sourceEntries: ["#27","#29","#31","#33","#34","#50","#51","#52","#53","#54","#55","#56","#60","#61","#66"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/launch/LaunchWizard.tsx", sourceEntries: ["#27","#52","#53","#54","#55","#56","#62","#6","#7"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/launch/ResearchLockMark.tsx", sourceEntries: ["#5"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/launch/StepBlueprint.tsx", sourceEntries: ["#65"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/launch/StepIdent.tsx", sourceEntries: ["#8","#9","#10"], tags: ["LOGIC","STYLE"] },
  { sourcePath: "components/studio-finance/components/launch/StepMarkets.tsx", sourceEntries: ["#55"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/components/launch/StepPricing.tsx", sourceEntries: ["#15","#16","#56","#57","#58","#59","#60","#61","#62","#63","#64"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/components/launch/StepStorefront.tsx", sourceEntries: ["#5","#6","#10","#11","#12"], tags: ["STYLE","LOGIC"] },
  { sourcePath: "components/studio-finance/finance/build.ts", sourceEntries: ["#32","#35","#78","#80","#83","#86","#98","#99","#105","#100","#101","#102","#103","#106","#108","#114","#119"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/finance/buildPlanner.ts", sourceEntries: ["#31","#72","#101","#99"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/finance/format.ts", sourceEntries: ["#89"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/finance/launch.ts", sourceEntries: ["#52","#53","#54","#55","#56","#62","#64"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/finance/placer.ts", sourceEntries: ["#103","#104","#106","#108","#109","#110","#111","#112","#114","#119"], tags: ["LOGIC"] },
  { sourcePath: "components/studio-finance/styles/build.css", sourceEntries: ["#23","#24","#25","#26","#27","#28","#29","#30","#31","#32","#33","#34","#35","#36","#37","#38","#39","#40","#41","#48","#49","#50","#51","#52","#72","#101","#105","#120","#121","#123","#124"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/cine.css", sourceEntries: ["#27","#28"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/kit.css", sourceEntries: ["#27","#29","#31","#33","#50","#51","#52","#53","#54","#55","#56","#60","#61","#66","#122"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/launch.css", sourceEntries: ["#4","#5","#6","#15","#16","#27","#52","#53","#55","#56","#57","#58","#59","#60","#61","#62","#63","#65"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/network.css", sourceEntries: ["#76f","#77","#80","#81","#82","#85","#86","#87","#88","#89","#90","#91","#92","#93","#94","#96","#97","#98","#99","#100","#103","#104","#105","#106","#107","#108","#109","#111","#112","#113","#114","#117","#119"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/studio-finance.css", sourceEntries: ["#16","#27"], tags: ["STYLE"] },
  { sourcePath: "components/studio-finance/styles/tokens.css", sourceEntries: ["#27"], tags: ["STYLE"] },
  { sourcePath: "components/ZedburyStudiosIntro.tsx", sourceEntries: ["#1","#3"], tags: ["STYLE"] },
  { sourcePath: "content-market-exact/ContentMarket.module.css", sourceEntries: ["#14"], tags: ["STYLE"] },
  { sourcePath: "content-market-exact/ExactContentMarket.tsx", sourceEntries: ["#14"], tags: ["STYLE"] },
  { sourcePath: "index.html", sourceEntries: ["#65"], tags: ["STYLE"] },
  { sourcePath: "lab/buildLabData.ts", sourceEntries: ["#76f"], tags: ["LOGIC"] },
  { sourcePath: "lab/lab.tsx", sourceEntries: ["#113","#123","#124","#125"], tags: ["LOGIC"] },
  { sourcePath: "lab/labQuery.ts", sourceEntries: ["#125"], tags: ["LOGIC"] },
  { sourcePath: "lab/rehearsalLab.tsx", sourceEntries: ["#125"], tags: ["LOGIC"] },
  { sourcePath: "rehearsal-lab.html", sourceEntries: ["#125"], tags: ["LOGIC"] },
  { sourcePath: "package.json", sourceEntries: ["#85","#100–#103","#103","#125"], tags: [] },
  { sourcePath: "public/assets/streaming/rooms/README.md", sourceEntries: ["#90","#91","#92","#93","#94","#105","#103"], tags: ["ASSET"] },
  { sourcePath: "scripts/_places.ts", sourceEntries: ["#80"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-map4-studio-finance-map.tsx", sourceEntries: ["#73"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-profile-avatar-migration.ts", sourceEntries: ["#82"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-assisted-build-planner-ui.ts", sourceEntries: ["#25","#26","#27","#28","#29","#30","#31","#32","#34","#35","#36","#52","#53","#54","#55","#73","#99"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-assisted-build-planner.ts", sourceEntries: ["#31"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-assisted-build-state-ui.tsx", sourceEntries: ["#26","#27","#29","#30","#31","#35","#36","#68","#72","#86"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-build-city-template.tsx", sourceEntries: ["#35","#36","#105"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-build-map-readout.tsx", sourceEntries: ["#84","#85","#107"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-build-night-band.tsx", sourceEntries: ["#72"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-build-plans-scale.tsx", sourceEntries: ["#31","#32","#35","#36","#105","#106"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-build-test-autosave-gates.tsx", sourceEntries: ["#34","#41","#42","#43","#44","#45","#46","#47","#48","#49","#50","#51","#52","#53","#54","#55","#56","#106","#99"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-cloud-ring.tsx", sourceEntries: ["#100","#105"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-facility-marketplace-phase3.ts", sourceEntries: ["#80","#83"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-founding-phase3.ts", sourceEntries: ["#2"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-infrastructure-resource-ui.tsx", sourceEntries: ["#29","#35","#36","#37","#38","#39","#40","#41","#35–#41","#90","#105"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-launch-marketing-ui.tsx", sourceEntries: ["#33","#121"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-launch-research-locks.tsx", sourceEntries: ["#5","#6","#7","#52","#53","#54","#55","#56","#57","#58","#59","#60","#61","#62","#63","#64","#65"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-launch-surface-browser.cjs", sourceEntries: ["#52"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-linked-budget-sheets.tsx", sourceEntries: ["#35"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-money-crossover.tsx", sourceEntries: ["#101"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-network-signals.tsx", sourceEntries: ["#102","#106"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-pricing-world-integration.tsx", sourceEntries: ["#64"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-region-placer.tsx", sourceEntries: ["#103","#104","#106","#108","#109","#110","#111","#114","#117"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-road-to-opening-phase3.ts", sourceEntries: ["#8"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-room-card-data.tsx", sourceEntries: ["#95","#105"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-room-limits.ts", sourceEntries: ["#98","#99"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-team-planning-cinematic.tsx", sourceEntries: ["#28","#29","#30","#31","#32"], tags: ["LOGIC"] },
  { sourcePath: "scripts/audit-streaming-viewer-forecast-phase6.ts", sourceEntries: ["#51"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/build-wizard-chrome.html", sourceEntries: ["#51","#52","#71"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/build-wizard-chrome.tsx", sourceEntries: ["#51","#52","#71"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/network-flow.html", sourceEntries: ["#72"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/network-flow.tsx", sourceEntries: ["#72","#76f","#86","#102"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/streaming-build-money.html", sourceEntries: ["#65"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/streaming-launch-surface.html", sourceEntries: ["#65"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/streaming-launch-surface.tsx", sourceEntries: ["#52","#53"], tags: ["LOGIC"] },
  { sourcePath: "scripts/fixtures/streaming-opening-programme.html", sourceEntries: ["#65"], tags: ["LOGIC"] },
  { sourcePath: "scripts/generate-population-clusters.ts", sourceEntries: ["#85"], tags: ["LOGIC"] },
  { sourcePath: "services/ownedStreamingPlatform.ts", sourceEntries: ["#81"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/realEstateDealers.ts", sourceEntries: ["#83"], tags: ["LOGIC"] },
  { sourcePath: "services/realEstateLogic.ts", sourceEntries: ["#83"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingCanonicalState.ts", sourceEntries: ["#64"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/streamingFacilities.ts", sourceEntries: ["#80","#83","#98"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/streamingFacilityMarketplace.ts", sourceEntries: ["#80","#83"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingFibreLadder.ts", sourceEntries: ["#81"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingLaunch.ts", sourceEntries: ["#8"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/streamingLaunchProgram.ts", sourceEntries: ["#8"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/streamingNetworkReach.ts", sourceEntries: ["#77","#85","#100","#102","#106"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingNetworkSignals.ts", sourceEntries: ["#102"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingPricingEconomy.ts", sourceEntries: ["#64"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingResearchCore.ts", sourceEntries: ["#81"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingResearchLifecycle.ts", sourceEntries: ["#81"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingRoomArt.ts", sourceEntries: ["#90","#91","#92","#93","#94","#105","#103"], tags: ["ASSET","LOGIC"] },
  { sourcePath: "services/streamingServerSites.ts", sourceEntries: ["#85","#106","#109","#111","#113","#115","#116"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingServiceHealth.ts", sourceEntries: ["#86","#90","#102"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingSitePlaces.ts", sourceEntries: ["#80","#100"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingTenure.ts", sourceEntries: ["#83"], tags: ["LOGIC"] },
  { sourcePath: "services/streamingWeeklyLoop.ts", sourceEntries: ["#81"], tags: ["LOGIC","DATA"] },
  { sourcePath: "services/worldEconomy/worldCountryGeography.generated.ts", sourceEntries: ["#79"], tags: ["LOGIC"] },
  { sourcePath: "services/worldEconomy/worldPopulationClusters.generated.ts", sourceEntries: ["#85"], tags: ["LOGIC"] },
  { sourcePath: "services/worldEconomy/worldStreamingOffers.ts", sourceEntries: ["#64"], tags: ["LOGIC"] },
  { sourcePath: "services/worldPopulationClusters.ts", sourceEntries: ["#85"], tags: ["LOGIC"] },
  { sourcePath: "styles/streaming-technology-campus.css", sourceEntries: ["#82"], tags: ["STYLE"] },
  { sourcePath: "styles/zedbury-intro.css", sourceEntries: ["#1"], tags: ["STYLE"] },
  { sourcePath: "types.ts", sourceEntries: ["#64","#103","#80","#81","#83"], tags: ["LOGIC","DATA"] },
  { sourcePath: "views/lifestyle/LifestyleAssets.tsx", sourceEntries: ["#83"], tags: ["LOGIC","STYLE"] },
];

export const CLAUDE_FRONTEND_INTEGRATION_DECISIONS: Record<string, ClaudeIntegrationDecision> = {
  "App.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["App.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "assets/zedbury.ts": { disposition: 'PORT', targetPaths: ["assets/zedbury.ts"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/streaming-transplant/createCanonicalStreamingPresentation.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/streaming-transplant/createCanonicalStreamingPresentation.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css": { disposition: 'PORT', targetPaths: ["components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDesk.module.css": { disposition: 'PORT', targetPaths: ["components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDesk.module.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/streaming-transplant/StreamingBuildoutExperience.tsx": { disposition: 'PORT', targetPaths: ["components/streaming-transplant/StreamingBuildoutExperience.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/streaming-transplant/StreamingBuildWizardExperience.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/streaming-transplant/StreamingBuildWizardExperience.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/streaming-transplant/StreamingNetworkExperience.tsx": { disposition: 'PORT', targetPaths: ["components/streaming-transplant/StreamingNetworkExperience.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/streaming-transplant/streamingNetworkMap.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/streaming-transplant/streamingNetworkMap.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/StreamingContentMarket.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/StreamingContentMarket.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/StreamingDefineLaunchExperience.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/StreamingDefineLaunchExperience.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/StreamingFoundingJourney.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/StreamingFoundingJourney.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/StreamingPlatformHQ.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/StreamingPlatformHQ.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/StreamingTechnologyCampus.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/StreamingTechnologyCampus.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/BuildMetricSheet.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/BuildWizard.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/BuildWizard.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/CityScene.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/NetworkAtlas.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/NetworkAtlas.tsx." },
  "components/studio-finance/components/build/CloudRing.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/motion.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/motion.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/NetworkAtlas.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/NetworkAtlas.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI.", approvalGate: '#77-#79' },
  "components/studio-finance/components/build/NetworkMap.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/NetworkAtlas.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/NetworkAtlas.tsx." },
  "components/studio-finance/components/build/NetworkMapBox.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/build/NetworkMapBox.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/build/NetworkPage.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx.", approvalGate: '#77-#79' },
  "components/studio-finance/components/build/NetworkParts.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx","components/studio-finance/components/build/StageMoney.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx, components/studio-finance/components/build/StageMoney.tsx." },
  "components/studio-finance/components/build/NightBand.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/BuildWizard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/BuildWizard.tsx." },
  "components/studio-finance/components/build/RackWall.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/RegionBoard.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/ResourceMetric.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/RoomCard.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx.", approvalGate: '#77-#79' },
  "components/studio-finance/components/build/RoomComposer.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/ServerFill.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/SpecMeters.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/StageLaunch.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/build/StageLaunch.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/build/StageMoney.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/StageMoney.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/StageNetwork.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/StageNetwork.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/StageServers.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "components/studio-finance/components/build/StageTest.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/StageTest.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/studioFinanceMap.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/studioFinanceMap.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/build/TeamPlanningCinematic.tsx": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/BuildWizard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/BuildWizard.tsx." },
  "components/studio-finance/components/build/WorldMap.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/build/WorldMap.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/cine/CommissionCut.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/cine/CommissionCut.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/kit.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/kit.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/launch/LaunchWizard.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/launch/LaunchWizard.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/launch/ResearchLockMark.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/launch/ResearchLockMark.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/launch/StepBlueprint.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/launch/StepBlueprint.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/launch/StepIdent.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/launch/StepIdent.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/launch/StepMarkets.tsx": { disposition: 'PORT', targetPaths: ["components/studio-finance/components/launch/StepMarkets.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/components/launch/StepPricing.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/launch/StepPricing.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/components/launch/StepStorefront.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/components/launch/StepStorefront.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/finance/build.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/finance/build.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI.", approvalGate: '#77-#79' },
  "components/studio-finance/finance/buildPlanner.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/finance/buildPlanner.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/finance/format.ts": { disposition: 'PORT', targetPaths: ["components/studio-finance/finance/format.ts"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/finance/launch.ts": { disposition: 'REIMPLEMENT', targetPaths: ["components/studio-finance/finance/launch.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/finance/placer.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingRegionalNetworkPlan.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "components/studio-finance/styles/build.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/build.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/styles/cine.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/cine.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/styles/kit.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/kit.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/styles/launch.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/launch.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/styles/network.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/network.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable.", approvalGate: '#77-#79' },
  "components/studio-finance/styles/studio-finance.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/studio-finance.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/studio-finance/styles/tokens.css": { disposition: 'PORT', targetPaths: ["components/studio-finance/styles/tokens.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "components/ZedburyStudiosIntro.tsx": { disposition: 'PORT', targetPaths: ["components/ZedburyStudiosIntro.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "content-market-exact/ContentMarket.module.css": { disposition: 'PORT', targetPaths: ["content-market-exact/ContentMarket.module.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "content-market-exact/ExactContentMarket.tsx": { disposition: 'PORT', targetPaths: ["content-market-exact/ExactContentMarket.tsx"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "index.html": { disposition: 'PORT', targetPaths: ["index.html"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "lab/buildLabData.ts": { disposition: 'REIMPLEMENT', targetPaths: ["lab/buildLabData.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "lab/lab.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["lab/lab.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "lab/labQuery.ts": { disposition: 'REIMPLEMENT', targetPaths: ["lab/labQuery.ts"], reason: "Dev harness parsing must use the target Build draft and market contracts." },
  "lab/rehearsalLab.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["lab/rehearsalLab.tsx"], reason: "Dev-only rehearsal access must assemble canonical target selections rather than shipping a parallel gameplay path." },
  "rehearsal-lab.html": { disposition: 'REIMPLEMENT', targetPaths: ["rehearsal-lab.html"], reason: "Dev-only entry point for the target rehearsal harness." },
  "package.json": { disposition: 'REIMPLEMENT', targetPaths: ["package.json"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "public/assets/streaming/rooms/README.md": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "scripts/_places.ts": { disposition: 'SUPERSEDED', targetPaths: ["services/streamingSitePlaces.ts"], reason: "Final Claude source is deleted or superseded; final responsibility moved to services/streamingSitePlaces.ts." },
  "scripts/audit-map4-studio-finance-map.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-map4-studio-finance-map.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-profile-avatar-migration.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-profile-avatar-migration.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-assisted-build-planner-ui.ts": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-lab-career-parity.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-build-lab-career-parity.tsx." },
  "scripts/audit-streaming-assisted-build-planner.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-assisted-build-planner.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-assisted-build-state-ui.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-lab-career-parity.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-build-lab-career-parity.tsx." },
  "scripts/audit-streaming-build-city-template.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-region-placer.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-region-placer.tsx." },
  "scripts/audit-streaming-build-map-readout.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-phase4-ui.tsx"], reason: "The canonical Phase 4 UI audit replaces the Claude-local map readout fixture and checks the region-first production map." },
  "scripts/audit-streaming-build-night-band.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-lab-career-parity.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-build-lab-career-parity.tsx." },
  "scripts/audit-streaming-build-plans-scale.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-phase4-ui.tsx"], reason: "The canonical Phase 4 UI audit covers the final four-stage scalable Build surface." },
  "scripts/audit-streaming-build-test-autosave-gates.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-build-test-autosave-gates.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-cloud-ring.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-phase2-engines.ts"], reason: "Canonical provider capacity and quote coverage replace the Claude-local cloud-ring audit." },
  "scripts/audit-streaming-facility-marketplace-phase3.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-facility-marketplace-phase3.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-founding-phase3.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-founding-phase3.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-infrastructure-resource-ui.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-phase4-ui.tsx"], reason: "The Phase 4 production UI contract replaces the retired room-resource fixture." },
  "scripts/audit-streaming-launch-marketing-ui.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-launch-marketing-ui.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-launch-research-locks.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-launch-research-locks.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-launch-surface-browser.cjs": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-launch-surface-browser.cjs"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-linked-budget-sheets.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-linked-budget-sheets.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-money-crossover.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-phase2-engines.ts"], reason: "Canonical quote and construction assertions replace the local Money crossover calculation." },
  "scripts/audit-streaming-network-signals.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-lab-career-parity.tsx"], reason: "Lab/career parity now checks the production network signals across the canonical bridge." },
  "scripts/audit-streaming-pricing-world-integration.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-pricing-world-integration.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-region-placer.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-region-placer.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-road-to-opening-phase3.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-road-to-opening-phase3.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/audit-streaming-room-card-data.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-region-placer.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-region-placer.tsx." },
  "scripts/audit-streaming-room-limits.ts": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-network-catalogues-phase2.ts"], reason: "Canonical site, tier, provider and facility catalogue constraints replace the Claude-local room limit audit." },
  "scripts/audit-streaming-team-planning-cinematic.tsx": { disposition: 'SUPERSEDED', targetPaths: ["scripts/audit-streaming-build-lab-career-parity.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to scripts/audit-streaming-build-lab-career-parity.tsx." },
  "scripts/audit-streaming-viewer-forecast-phase6.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/audit-streaming-viewer-forecast-phase6.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/fixtures/build-wizard-chrome.html": { disposition: 'SUPERSEDED', targetPaths: ["lab.html"], reason: "The canonical Build lab supersedes the older chrome-only fixture." },
  "scripts/fixtures/build-wizard-chrome.tsx": { disposition: 'SUPERSEDED', targetPaths: ["lab/lab.tsx"], reason: "The canonical Build lab supersedes the older chrome-only fixture." },
  "scripts/fixtures/network-flow.html": { disposition: 'SUPERSEDED', targetPaths: ["lab.html"], reason: "The canonical Build lab is the maintained network-flow entry point." },
  "scripts/fixtures/network-flow.tsx": { disposition: 'SUPERSEDED', targetPaths: ["lab/lab.tsx"], reason: "The canonical Build lab uses the production region engine rather than a second fixture flow." },
  "scripts/fixtures/streaming-build-money.html": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/fixtures/streaming-build-money.html"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/fixtures/streaming-launch-surface.html": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/fixtures/streaming-launch-surface.html"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/fixtures/streaming-launch-surface.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/fixtures/streaming-launch-surface.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/fixtures/streaming-opening-programme.html": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/fixtures/streaming-opening-programme.html"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "scripts/generate-population-clusters.ts": { disposition: 'REIMPLEMENT', targetPaths: ["scripts/generate-population-clusters.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/ownedStreamingPlatform.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/ownedStreamingPlatform.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/realEstateDealers.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/realEstateDealers.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/realEstateLogic.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/realEstateLogic.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingCanonicalState.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingCanonicalState.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingFacilities.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingFacilities.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingFacilityMarketplace.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingFacilityMarketplace.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingFibreLadder.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingFibreLadder.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingLaunch.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingLaunch.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingLaunchProgram.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingLaunchProgram.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingNetworkReach.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingNetworkCoverage.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI.", approvalGate: '#77-#79' },
  "services/streamingNetworkSignals.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingNetworkCoverage.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingPricingEconomy.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingPricingEconomy.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingResearchCore.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingResearchCore.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingResearchLifecycle.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingResearchLifecycle.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingRoomArt.ts": { disposition: 'SUPERSEDED', targetPaths: ["components/studio-finance/components/build/RegionBoard.tsx"], reason: "Final Claude source is deleted or superseded; final responsibility moved to components/studio-finance/components/build/RegionBoard.tsx." },
  "services/streamingServerSites.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingServerSites.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingServiceHealth.ts": { disposition: 'SUPERSEDED', targetPaths: ["services/streamingNetworkSignals.ts"], reason: "Final Claude source is deleted or superseded; final responsibility moved to services/streamingNetworkSignals.ts." },
  "services/streamingSitePlaces.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingSitePlaces.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingTenure.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingTenure.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/streamingWeeklyLoop.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/streamingWeeklyLoop.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/worldEconomy/worldCountryGeography.generated.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/worldEconomy/worldCountryGeography.generated.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI.", approvalGate: '#77-#79' },
  "services/worldEconomy/worldPopulationClusters.generated.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/worldEconomy/worldPopulationClusters.generated.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/worldEconomy/worldStreamingOffers.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/worldEconomy/worldStreamingOffers.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "services/worldPopulationClusters.ts": { disposition: 'REIMPLEMENT', targetPaths: ["services/worldPopulationClusters.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "styles/streaming-technology-campus.css": { disposition: 'PORT', targetPaths: ["styles/streaming-technology-campus.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "styles/zedbury-intro.css": { disposition: 'PORT', targetPaths: ["styles/zedbury-intro.css"], reason: "Final Claude presentation path; port the final source after canonical contracts are stable." },
  "types.ts": { disposition: 'REIMPLEMENT', targetPaths: ["types.ts"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
  "views/lifestyle/LifestyleAssets.tsx": { disposition: 'REIMPLEMENT', targetPaths: ["views/lifestyle/LifestyleAssets.tsx"], reason: "Logic or data path; reimplement against authoritative Actor Empire services before accepting the final UI." },
};

export const CLAUDE_FRONTEND_INTEGRATION_MANIFEST: ClaudeIntegrationManifestEntryWithAudits[] =
  CLAUDE_FRONTEND_INDEXED_SOURCES.map(source => {
    const decision = CLAUDE_FRONTEND_INTEGRATION_DECISIONS[source.sourcePath];
    return {
      ...source,
      ...decision,
      affectedAudits: deriveAffectedAudits(source, decision),
    };
  });
