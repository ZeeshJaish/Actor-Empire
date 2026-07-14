import React, { useMemo } from 'react';
import { Player, PendingEvent, ClothingItem, Vehicle, Award } from '../types';
import { CLOTHING_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG } from '../services/lifestyleLogic';
import { determineWinners, generateSeasonWinners, AwardResolvedWinner, Nomination, sanitizeAwardHistoryEntries, sanitizeAwardRecords } from '../services/awardLogic';
import { NPC_DATABASE } from '../services/npcLogic';
import {
  AwardNightConfig,
  AwardNightFlow,
  AwardNomineeDisplay,
  AwardNightResult,
  AwardPressResult,
  FillerCategory,
  PlayerAwardCategory,
  PressQuestion,
  VehicleType,
  WardrobeItem
} from './AwardNightFlow';

interface RedCarpetEventProps {
  player: Player;
  event: PendingEvent;
  onComplete: (updatedPlayer: Player) => void;
}

const upsertAwardRecord = (awards: Award[], nextAward: Award): Award[] => {
  const existingIndex = awards.findIndex(award =>
    award.type === nextAward.type &&
    award.category === nextAward.category &&
    award.projectId === nextAward.projectId
  );

  if (existingIndex === -1) return [...awards, nextAward];

  return awards.map((award, index) =>
    index === existingIndex
      ? award.year === nextAward.year
        ? { ...award, ...nextAward, id: award.id, outcome: nextAward.outcome === 'WON' ? 'WON' : award.outcome }
        : award
      : award
  );
};

const isMusicAwardCategory = (category: string) => (
  /song|score|soundtrack|trailer|music video/i.test(category)
);

const musicNpcId = (artistId: string) => `music_npc_${artistId}`;

const boostMusicAwardPeople = (player: Player, project: any, category: string): Player => {
  const credits = project?.musicPlan?.credits || project?.projectDetails?.musicPlan?.credits || [];
  if (!credits.length) return player;
  const matchingCredits = credits.filter((credit: any) => {
    if (/score/i.test(category)) return /score|orchestra|classical|film/i.test(`${credit.genre} ${credit.songTitle}`);
    if (/music video/i.test(category)) return credit.role === 'MUSIC_VIDEO_TIE_IN';
    if (/song/i.test(category)) return ['LEAD_SINGLE', 'END_CREDIT_SONG', 'TRAILER_ANTHEM'].includes(credit.role);
    if (/soundtrack/i.test(category)) return ['SOUNDTRACK_EP', 'PROMO_ALBUM'].includes(credit.role);
    if (/trailer/i.test(category)) return credit.role === 'TRAILER_ANTHEM';
    return false;
  });
  const creditsToBoost = matchingCredits.length ? matchingCredits : credits.slice(0, 1);
  const boostIds = new Set(creditsToBoost.map((credit: any) => credit.artistId));
  const boostNpc = (npc: any) => {
    const matches = Array.from(boostIds).some(artistId => npc.id === artistId || npc.id === musicNpcId(String(artistId)));
    if (!matches) return npc;
    return {
      ...npc,
      netWorth: Math.round((npc.netWorth || 0) + 450_000),
      followers: Math.round((npc.followers || 0) + 85_000),
      stats: {
        ...(npc.stats || {}),
        fame: Math.min(100, (npc.stats?.fame || 45) + 2.5)
      }
    };
  };
  NPC_DATABASE.forEach((npc: any, index) => {
    const updated = boostNpc(npc);
    if (updated !== npc) NPC_DATABASE[index] = updated;
  });
  return {
    ...player,
    flags: {
      ...(player.flags || {}),
      extraNPCs: Array.isArray(player.flags?.extraNPCs)
        ? player.flags.extraNPCs.map(boostNpc)
        : []
    }
  };
};

const getNomineeDisplayName = (nomination: Nomination, playerName: string) => (
  nomination.nomineeName || (nomination.isPlayer ? playerName : nomination.project.name)
);

const isProjectAwardCategory = (category: string): boolean => {
  const isPersonCategory = category.includes('Actor') || category.includes('Actress') || category.includes('Director');
  return /Picture|Series|Musical|Film/.test(category) && !isPersonCategory;
};

const toAwardNomineeDisplay = (nomination: Nomination, playerName: string): AwardNomineeDisplay => {
  if (isProjectAwardCategory(nomination.category)) {
    return {
      name: nomination.project.name,
      project: nomination.nomineeName && nomination.nomineeName !== nomination.project.name ? nomination.nomineeName : undefined,
      isPlayer: nomination.isPlayer
    };
  }
  return {
    name: getNomineeDisplayName(nomination, playerName),
    project: nomination.project.name,
    isPlayer: nomination.isPlayer
  };
};

const nomineeDisplayName = (nominee: AwardNomineeDisplay): string => (
  typeof nominee === 'string' ? nominee : nominee.name
);

const buildFallbackOpponentNames = (category: string, playerName: string): string[] => {
  const isActress = category.includes('Actress');
  const isActor = category.includes('Actor') && !category.includes('Actress');
  const isDirector = category.includes('Director');
  const isProjectAward = (category.includes('Picture') || category.includes('Series') || category.includes('Musical') || category.includes('Film')) && !isActor && !isActress && !isDirector;

  if (isProjectAward) return ['Midnight Echo', 'Glass Kingdom', 'Neon Harbor'];
  if (isDirector) return ['Ava Laurent', 'Marcus Vale', 'Elena Cross'];

  const pool = NPC_DATABASE
    .filter(npc => {
      if (isActress) return npc.gender === 'FEMALE';
      if (isActor) return npc.gender === 'MALE';
      return true;
    })
    .map(npc => npc.name)
    .filter(name => !!name && name !== playerName);

  const uniqueNames = Array.from(new Set(pool));
  return uniqueNames.slice(0, 3).length > 0 ? uniqueNames.slice(0, 3) : ['Alex Mercer', 'Jordan Vale', 'Taylor Quinn'];
};

const toWardrobeItem = (item: ClothingItem): WardrobeItem => ({
  n: item.name,
  s: Math.max(1, Math.round((item.auditionBonus || 0.2) * 10)),
  sub: `${item.style} · +${Math.round((item.auditionBonus || 0) * 10)} Style`
});

const getAwardNightVehicleType = (vehicle: Vehicle): VehicleType => {
  if (vehicle.vehicleType === 'Motorcycle') return 'BIKE';
  if (vehicle.vehicleType === 'Aircraft') return 'HELI';
  if (vehicle.vehicleType === 'Boat') return 'YACHT';
  const name = vehicle.name.toLowerCase();
  if (/suv|g-wagon|wagon|range rover|cullinan|escalade|defender/.test(name)) return 'SUV';
  if (
    vehicle.price >= 500_000 ||
    /ferrari|bugatti|koenigsegg|pagani|porsche|zonda|chiron|jesko|supercar|gt coupe|roadster/.test(name)
  ) {
    return 'SUPERCAR';
  }
  return 'CAR';
};

const toRideItem = (vehicle: Vehicle): WardrobeItem => ({
  n: vehicle.name,
  s: 0,
  sub: `${vehicle.vehicleType} · +${vehicle.reputationBonus || 0} Rep`,
  vt: getAwardNightVehicleType(vehicle)
});

const buildWardrobe = (player: Player): AwardNightConfig['wardrobe'] => {
  const wardrobe: AwardNightConfig['wardrobe'] = {
    OUTFIT: [],
    TOP: [],
    BOTTOM: [],
    SHOES: [],
    WATCH: [],
    EYEWEAR: [],
    BAG: [],
    JEWELRY: [],
    RIDE: [{ n: 'Taxi / Limo Service', s: 0, sub: 'Default option', vt: 'LIMO' }]
  };
  const seenClothes = new Set<string>();
  player.assets
    .map(id => CLOTHING_CATALOG.find(item => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item))
    .forEach(item => {
      if (seenClothes.has(item.id)) return;
      seenClothes.add(item.id);
      const slot = item.category === 'ACCESSORY' ? item.subCategory : item.category;
      if (slot && wardrobe[slot]) wardrobe[slot].push(toWardrobeItem(item));
    });

  const vehicleCatalog = [...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG];
  const seenVehicles = new Set<string>();
  player.assets
    .map(id => player.customItems.find(item => item.id === id) || vehicleCatalog.find(vehicle => vehicle.id === id))
    .filter((vehicle): vehicle is Vehicle => Boolean(vehicle))
    .forEach(vehicle => {
      if (seenVehicles.has(vehicle.id)) return;
      seenVehicles.add(vehicle.id);
      wardrobe.RIDE.push(toRideItem(vehicle));
    });

  return wardrobe;
};

const getCareerContext = (player: Player) => {
  const completed = player.pastProjects || [];
  const bestProject = [...completed]
    .filter(project => project.imdbRating || project.rating)
    .sort((a: any, b: any) => (b.imdbRating || b.rating || 0) - (a.imdbRating || a.rating || 0))[0];
  const wins = (player.awards || []).filter(award => award.outcome === 'WON').length;
  const nominations = (player.awards || []).length;
  const fame = player.stats?.fame || 0;
  const reputation = player.stats?.reputation || 0;
  return {
    credits: completed.length + (player.activeReleases?.length || 0),
    bestProjectName: bestProject?.name,
    wins,
    nominations,
    profile: fame >= 75 ? 'an A-list spotlight' : fame >= 45 ? 'a rising-star spotlight' : 'a breakout spotlight',
    reputationLine: reputation >= 70 ? 'with a reputation for careful role choices' : reputation <= 35 ? 'while trying to reset the industry conversation' : 'with the industry watching the next step'
  };
};

const getNomineeText = (nominee?: AwardNomineeDisplay) => (
  typeof nominee === 'string'
    ? { name: nominee, project: '' }
    : { name: nominee?.name || 'another nominee', project: nominee?.project || '' }
);

const buildPremierePressQuestions = (player: Player, event: PendingEvent): PressQuestion[] => {
  const context = getCareerContext(player);
  const knownFor = context.bestProjectName ? ` after ${context.bestProjectName}` : '';
  return [
    {
      outlet: 'Red Carpet Live',
      name: 'Sarah Jenkins · Entertainment Desk',
      mug: 'TV',
      q: `${event.title} is getting the full carpet treatment${knownFor}. What did you want people to feel before the first scene even starts?`,
      opts: [
        { t: 'That this one has a heartbeat. The scale is big, but the feeling matters more.', s: 'HUMBLE', fx: '+2 Rep +2 Buzz', consequences: { reputation: 2, buzz: 2 } },
        { t: 'I want them to know we came to own the weekend.', s: 'BOLD', fx: '+2 Fame +4 Buzz', consequences: { fame: 2, buzz: 4 } },
        { t: 'Honestly, I want the internet arguing about it before midnight.', s: 'RISKY', fx: '+6 Buzz or backfire', consequences: { buzz: 6, followers: 15000 } }
      ]
    },
    {
      outlet: 'CineWire',
      name: 'Priya Nair · Industry Desk',
      mug: 'PR',
      q: `You have ${context.credits} screen credit${context.credits === 1 ? '' : 's'} now. Does this premiere feel like a new chapter?`,
      opts: [
        { t: 'Every project teaches you something. This one taught me to lead with more trust.', s: 'HUMBLE', fx: '+3 Rep', consequences: { reputation: 3 } },
        { t: 'Yes. I feel ready for bigger rooms and bigger risks.', s: 'BOLD', fx: '+2 Fame +2 Rep', consequences: { fame: 2, reputation: 2 } },
        { t: 'New chapter? Maybe a new book.', s: 'RISKY', fx: '+Followers +Buzz', consequences: { followers: 22000, buzz: 2 } }
      ]
    }
  ];
};

const buildAwardPressQuestions = (
  player: Player,
  event: PendingEvent,
  primary: PlayerAwardCategory
): PressQuestion[] => {
  const context = getCareerContext(player);
  const rival = getNomineeText(primary.rivals[0]);
  const rivalLine = rival.project ? `${rival.name} for ${rival.project}` : rival.name;
  const priorAwardsLine = context.wins > 0
    ? `You already have ${context.wins} career win${context.wins === 1 ? '' : 's'}`
    : context.nominations > 1
      ? `You have ${context.nominations} career nomination${context.nominations === 1 ? '' : 's'}`
      : 'This is one of your biggest industry nights';
  return [
    {
      outlet: 'Red Carpet Live',
      name: 'Sarah Jenkins · Entertainment Desk',
      mug: 'TV',
      q: `${primary.movie} put you in the ${primary.cat} race at ${event.title}. What part of that performance are you proudest of?`,
      opts: [
        { t: 'The quiet scenes. They look simple, but they ask the most from you.', s: 'HUMBLE', fx: '+3 Rep +1 Buzz', consequences: { reputation: 3, buzz: 1 } },
        { t: 'I gave that role everything. If people felt it, that is the win already.', s: 'BOLD', fx: '+2 Fame +3 Buzz', consequences: { fame: 2, buzz: 3 } },
        { t: 'The part where everyone realized I was not playing around this year.', s: 'RISKY', fx: '+5 Buzz +Followers', consequences: { buzz: 5, followers: 18000 } }
      ]
    },
    {
      outlet: 'Hollywood Now',
      name: 'Marcus Vane · Awards Desk',
      mug: 'HN',
      q: `A lot of voters are comparing your work with ${rivalLine}. How do you see that matchup?`,
      opts: [
        { t: 'That is great company. The category is stronger because everyone showed up.', s: 'HUMBLE', fx: '+3 Rep', consequences: { reputation: 3 } },
        { t: 'I respect the field, but I came here believing in my film.', s: 'SAFE', fx: '+1 Fame +1 Rep', consequences: { fame: 1, reputation: 1 } },
        { t: 'Comparisons are for tomorrow. Tonight, I want the envelope.', s: 'RISKY', fx: '+3 Fame +Buzz', consequences: { fame: 3, buzz: 2 } }
      ]
    },
    {
      outlet: 'CineWire',
      name: 'Priya Nair · Awards Analyst',
      mug: 'PR',
      q: `${priorAwardsLine}, ${context.reputationLine}. If your name is called, who does that moment belong to?`,
      opts: [
        { t: 'The crew first. They carried the hard days no one sees.', s: 'HUMBLE', fx: '+4 Rep', consequences: { reputation: 4 } },
        { t: 'My team, my family, and everyone who kept betting on the work.', s: 'SAFE', fx: '+2 Rep +Followers', consequences: { reputation: 2, followers: 12000 } },
        { t: 'Everyone who said this moment was too soon.', s: 'RISKY', fx: '+4 Fame +Buzz', consequences: { fame: 4, buzz: 2 } }
      ]
    }
  ];
};

const getResolvedWinnerEntry = (
  category: string,
  fullBallot: Record<string, Nomination[]> | undefined,
  currentResults: { won: boolean; nomination: Nomination }[]
): Nomination | null => {
  const nominees = fullBallot?.[category];
  if (nominees?.length) return [...nominees].sort((a, b) => b.score - a.score)[0];
  const result = currentResults.find(item => item.nomination.category === category);
  return result?.won ? result.nomination : null;
};

const isPlayerResolvedWinner = (
  result: { won: boolean; nomination: Nomination },
  fullBallot: Record<string, Nomination[]> | undefined,
  currentResults: { won: boolean; nomination: Nomination }[]
): boolean => Boolean(getResolvedWinnerEntry(result.nomination.category, fullBallot, currentResults)?.isPlayer || result.won);

const buildFillers = (
  fullBallot: Record<string, Nomination[]> | undefined,
  playerCategories: Set<string>,
  playerName: string
): { fillers: FillerCategory[]; closing: FillerCategory } => {
  const fallbackClosing = {
    cat: 'Best Motion Picture',
    noms: ['The Cheat Code', 'Glass Kingdom', 'Neon Harbor', 'Past Lives'],
    winner: 'Glass Kingdom'
  };
  if (!fullBallot) return {
    fillers: [
      { cat: 'Best Cinematography', noms: ['Midnight Echo', 'Glass Kingdom', 'Neon Harbor'], winner: 'Glass Kingdom' },
      { cat: 'Best Original Screenplay', noms: ['Paper Cities', 'Silent Room', 'The Last Stand'], winner: 'Paper Cities' }
    ],
    closing: fallbackClosing
  };

  const otherCategories = Object.keys(fullBallot).filter(category => !playerCategories.has(category));
  const toFiller = (category: string): FillerCategory => {
    const nominees = fullBallot[category] || [];
    const winner = [...nominees].sort((a, b) => b.score - a.score)[0] || nominees[0];
    return {
      cat: category,
      noms: nominees.slice(0, 4).map(nomination => toAwardNomineeDisplay(nomination, playerName)),
      winner: winner ? toAwardNomineeDisplay(winner, playerName) : 'Industry Favorite'
    };
  };

  const fillers = otherCategories.slice(0, 2).map(toFiller);
  const closingCategory = otherCategories.find(category => /picture|film|series/i.test(category)) || otherCategories[2];
  return {
    fillers: fillers.length ? fillers : [fallbackClosing],
    closing: closingCategory ? toFiller(closingCategory) : fallbackClosing
  };
};

const buildAwardNightConfig = (
  player: Player,
  event: PendingEvent,
  currentResults: { won: boolean; nomination: Nomination }[]
): Partial<AwardNightConfig> => {
  if (event.type === 'PREMIERE') {
    const context = getCareerContext(player);
    return {
      mode: 'RED_CARPET',
      playerName: player.name,
      avatarUrl: player.avatar,
      showName: event.title,
      showEdition: 'Premiere Night · Tonight',
      venue: 'Empire Premiere Hall',
      city: 'Los Angeles',
      headlineGood: 'PREMIERE MAKES NOISE',
      headlineBad: 'QUIET PREMIERE NIGHT',
      playerMovie: event.title,
      playerCategory: 'Premiere Spotlight',
      playerWins: false,
      playerRivals: ['The Critics', 'The Press', 'The Audience'],
      playerCategories: [{ cat: 'Premiere Spotlight', movie: event.title, rivals: ['The Critics', 'The Press', 'The Audience'], won: false }],
      ceremonyFillers: [{ cat: 'Tonight at the Premiere', noms: ['Arrival', 'Press Wall', 'Audience Buzz'], winner: 'Audience Buzz' }],
      ceremonyClosing: { cat: 'Opening Night Reaction', noms: ['Strong Buzz', 'Mixed Room', 'Quiet Exit'], winner: 'Strong Buzz' },
      pressQuestions: buildPremierePressQuestions(player, event),
      summaryKicker: 'Red Carpet Complete',
      summaryTitle: 'Premiere Highlights',
      summaryLine: `${player.name} turned ${event.title} into a full red-carpet press moment.`,
      summaryCardTitle: 'Promo Carpet Moments',
      newspaperLead: `${player.name} arrived for ${event.title} with cameras tracking ${context.profile} ${context.reputationLine}.`,
      newspaperAngle: `${player.name} turned the carpet into a launchpad for ${event.title}, with reporters pressing for clues about the performance and the pressure behind it.`,
      newspaperClosing: context.bestProjectName
        ? `After ${context.bestProjectName}, insiders say this premiere could decide how big the next chapter gets.`
        : 'Insiders say the night could turn a promising screen name into a full industry conversation.',
      completeLabel: 'Leave Premiere & Save',
      wardrobe: buildWardrobe(player)
    };
  }

  const nominations = (event.data?.nominations || []) as Nomination[];
  const fullBallot = event.data?.fullBallot as Record<string, Nomination[]> | undefined;
  const playerCategories = currentResults.map<PlayerAwardCategory>(result => {
    const ballot = fullBallot?.[result.nomination.category] || [];
    const rivals = ballot
      .filter(nomination => !nomination.isPlayer)
      .map(nomination => toAwardNomineeDisplay(nomination, player.name))
      .filter(nominee => !!nomineeDisplayName(nominee));
    const fallbackRivals = buildFallbackOpponentNames(result.nomination.category, player.name);
    return {
      cat: result.nomination.category,
      movie: result.nomination.project.name,
      rivals: (rivals.length ? rivals : fallbackRivals).slice(0, 3),
      won: isPlayerResolvedWinner(result, fullBallot, currentResults)
    };
  });
  const primary = playerCategories.find(category => category.won) || playerCategories[0] || {
    cat: 'Best Actor',
    movie: nominations[0]?.project.name || event.title,
    rivals: buildFallbackOpponentNames('Best Actor', player.name),
    won: false
  };
  const { fillers, closing } = buildFillers(fullBallot, new Set(playerCategories.map(category => category.cat)), player.name);
  const context = getCareerContext(player);
  const primaryRival = getNomineeText(primary.rivals[0]);
  const rivalLine = primaryRival.project ? `${primaryRival.name} for ${primaryRival.project}` : primaryRival.name;

  return {
    mode: 'AWARDS',
    playerName: player.name,
    avatarUrl: player.avatar,
    showName: event.title,
    showEdition: `${event.data?.awardYear || player.age} Ceremony · Tonight`,
    venue: 'Dolby Grand Theatre',
    city: 'Los Angeles',
    headlineGood: 'A STAR IS CROWNED',
    headlineBad: 'STYLE MISSES THE MARK',
    playerMovie: primary.movie,
    playerCategory: primary.cat,
    playerWins: primary.won,
    playerRivals: primary.rivals,
    playerCategories,
    ceremonyFillers: fillers,
    ceremonyClosing: closing,
    pressQuestions: buildAwardPressQuestions(player, event, primary),
    newspaperLead: `${player.name} arrived at ${event.title} with ${primary.movie} sitting inside the ${primary.cat} race.`,
    newspaperAngle: `${player.name} carried ${context.profile} into a category where ${rivalLine} is also drawing heavy chatter.`,
    newspaperClosing: context.wins > 0
      ? `With ${context.wins} career win${context.wins === 1 ? '' : 's'} already in the story, tonight could add another chapter.`
      : `For an actor ${context.reputationLine}, tonight could be the room that changes the billing forever.`,
    wardrobe: buildWardrobe(player)
  };
};

const buildCeremonyResolvedWinners = (
  player: Player,
  currentResults: { won: boolean; nomination: Nomination }[],
  fullBallot?: Record<string, Nomination[]>
): AwardResolvedWinner[] => {
  if (fullBallot) {
    return Object.entries(fullBallot).flatMap(([category, nominees]) => {
      const winnerEntry = [...nominees].sort((a, b) => b.score - a.score)[0];
      if (!winnerEntry) return [];
      return [{
        category,
        winnerName: getNomineeDisplayName(winnerEntry, player.name),
        projectName: winnerEntry.project.name,
        isPlayer: winnerEntry.isPlayer
      }];
    });
  }
  return currentResults.map(result => {
    const winnerEntry = result.won ? result.nomination : null;
    return {
      category: result.nomination.category,
      winnerName: winnerEntry ? getNomineeDisplayName(winnerEntry, player.name) : buildFallbackOpponentNames(result.nomination.category, player.name)[0],
      projectName: winnerEntry?.project.name || result.nomination.project.name,
      isPlayer: Boolean(winnerEntry?.isPlayer)
    };
  });
};

const applyPressResult = (player: Player, pressResult?: AwardPressResult): Player => {
  if (!pressResult) return player;
  return {
    ...player,
    stats: {
      ...player.stats,
      fame: Math.max(0, Math.min(100, player.stats.fame + (pressResult.statsDelta.fame || 0))),
      reputation: Math.max(0, Math.min(100, player.stats.reputation + (pressResult.statsDelta.reputation || 0))),
      followers: Math.max(0, (player.stats.followers || 0) + (pressResult.statsDelta.followers || 0))
    }
  };
};

export const RedCarpetEvent: React.FC<RedCarpetEventProps> = ({ player, event, onComplete }) => {
  const nominations = useMemo(() => (event.data?.nominations || []) as Nomination[], [event.data?.nominations]);
  const fullBallot = event.data?.fullBallot as Record<string, Nomination[]> | undefined;
  const currentResults = useMemo(() => (
    event.type === 'AWARD_CEREMONY' ? determineWinners(nominations, fullBallot) : []
  ), [event.type, nominations, fullBallot]);
  const config = useMemo(() => buildAwardNightConfig(player, event, currentResults), [player, event, currentResults]);
  const ceremonyResolvedWinners = useMemo(
    () => buildCeremonyResolvedWinners(player, currentResults, fullBallot),
    [player, currentResults, fullBallot]
  );

  const handleComplete = (result: AwardNightResult) => {
    let updatedPlayer = applyPressResult({ ...player }, result.pressResult);

    if (event.type === 'PREMIERE' && event.data?.projectId) {
      const commitmentIndex = updatedPlayer.commitments.findIndex(commitment => commitment.id === event.data.projectId);
      if (commitmentIndex !== -1) {
        const commitments = [...updatedPlayer.commitments];
        const commitment = commitments[commitmentIndex];
        commitments[commitmentIndex] = {
          ...commitment,
          projectDetails: commitment.projectDetails ? {
            ...commitment.projectDetails,
            hiddenStats: {
              ...commitment.projectDetails.hiddenStats,
              redCarpetHype: (result.pressResult?.buzzDelta || 0) + Math.round(result.styleScore / 20)
            }
          } : commitment.projectDetails
        };
        updatedPlayer.commitments = commitments;
      }
      updatedPlayer.news = [{
        id: `news_premiere_${Date.now()}`,
        headline: `${player.name} makes a premiere-night splash for ${event.title}.`,
        subtext: 'Cameras, press rooms, and early audience buzz shaped the opening-night narrative.',
        category: 'YOU' as any,
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'MEDIUM' as any
      }, ...updatedPlayer.news];
      updatedPlayer.stats = {
        ...updatedPlayer.stats,
        fame: Math.min(100, updatedPlayer.stats.fame + 2),
        followers: updatedPlayer.stats.followers + 10000
      };
    }

    if (event.type === 'AWARD_CEREMONY') {
      const pastProjectsUpdate = [...player.pastProjects];
      const winNewsItems: any[] = [];
      let updatedAwards = [...updatedPlayer.awards];
      const awardYear = event.data?.awardYear || player.age;

      currentResults.forEach(res => {
        const playerWon = isPlayerResolvedWinner(res, fullBallot, currentResults);
        const awardEntry: Award = {
          id: `award_${Date.now()}_${Math.random()}`,
          name: event.title,
          category: res.nomination.category,
          year: awardYear,
          outcome: playerWon ? 'WON' : 'NOMINATED',
          projectId: res.nomination.project.id,
          projectName: res.nomination.project.name,
          type: event.data.awardDef.type
        };
        updatedAwards = upsertAwardRecord(updatedAwards, awardEntry);

        const projIndex = pastProjectsUpdate.findIndex(project => project.id === res.nomination.project.id);
        if (projIndex >= 0) {
          const project = pastProjectsUpdate[projIndex];
          pastProjectsUpdate[projIndex] = {
            ...project,
            awards: sanitizeAwardRecords(upsertAwardRecord((project.awards || []) as Award[], awardEntry)) as any
          };
        }

        if (playerWon) {
          const musicCategory = isMusicAwardCategory(res.nomination.category);
          const wonProject = pastProjectsUpdate.find(project => project.id === res.nomination.project.id)
            || updatedPlayer.activeReleases.find(release => release.id === res.nomination.project.id);
          updatedPlayer.stats = {
            ...updatedPlayer.stats,
            fame: Math.min(100, updatedPlayer.stats.fame + (musicCategory ? 2 : 5)),
            reputation: Math.min(100, updatedPlayer.stats.reputation + (musicCategory ? 3 : 2)),
            followers: updatedPlayer.stats.followers + (musicCategory ? 25000 : 50000)
          };
          if (musicCategory && wonProject) updatedPlayer = boostMusicAwardPeople(updatedPlayer, wonProject, res.nomination.category);
          winNewsItems.push({
            id: `news_win_${Date.now()}`,
            headline: `${res.nomination.project.name} wins ${res.nomination.category} at ${event.title}!`,
            category: 'TOP_STORY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH'
          });
        }
      });

      updatedPlayer.awards = sanitizeAwardRecords(updatedAwards);
      updatedPlayer.pastProjects = pastProjectsUpdate.map(project => ({
        ...project,
        awards: sanitizeAwardRecords((project.awards || []) as Award[]) as any
      }));
      const awardType = event.data?.awardDef?.type;
      if (['GOLDEN_GLOBE', 'BAFTA', 'OSCAR', 'EMMY'].includes(awardType)) {
        const historyEntry = generateSeasonWinners(updatedPlayer, awardType, awardYear, ceremonyResolvedWinners);
        updatedPlayer.world = {
          ...updatedPlayer.world,
          awardHistory: sanitizeAwardHistoryEntries([
            ...(updatedPlayer.world.awardHistory || []).filter(entry => !(entry.type === awardType && entry.year === awardYear)),
            historyEntry
          ])
        };
      }
      if (winNewsItems.length === 1) {
        updatedPlayer.news = [winNewsItems[0], ...updatedPlayer.news];
      } else if (winNewsItems.length > 1) {
        const categories = winNewsItems.map(item => item.headline.match(/ wins (.+) at /)?.[1]).filter(Boolean);
        updatedPlayer.news = [{
          id: `news_multi_win_${Date.now()}`,
          headline: `${player.name} wins ${winNewsItems.length} awards at ${event.title}: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? ' and more' : ''}!`,
          category: 'TOP_STORY',
          week: player.currentWeek,
          year: player.age,
          impactLevel: 'HIGH'
        }, ...updatedPlayer.news];
      }
    }

    updatedPlayer.pendingEvent = null;
    onComplete(updatedPlayer);
  };

  return <AwardNightFlow config={config} onComplete={handleComplete} />;
};
