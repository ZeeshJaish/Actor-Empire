export const loadCriticalHomeScreen = () => (
  import('../views/HomePage').then(module => ({ default: module.HomePage }))
);

export const loadCreationScreen = () => (
  import('../views/CreationMenu').then(module => ({ default: module.CreationMenu }))
);

export const loadCareerScreen = () => (
  import('../views/CareerPage').then(module => ({ default: module.CareerPage }))
);

export const loadImproveScreen = () => (
  import('../views/ImprovePage').then(module => ({ default: module.ImprovePage }))
);

export const loadSocialScreen = () => (
  import('../views/SocialPage').then(module => ({ default: module.SocialPage }))
);

export type GameScreens = {
  HomePage: typeof import('../views/HomePage').HomePage;
  CareerPage: typeof import('../views/CareerPage').CareerPage;
  CreationMenu: typeof import('../views/CreationMenu').CreationMenu;
  DeathScreen: typeof import('../views/DeathScreen').DeathScreen;
  RedCarpetEvent: typeof import('../views/RedCarpetEvent').RedCarpetEvent;
  PressConferenceEvent: typeof import('../views/PressConferenceEvent').PressConferenceEvent;
  ImprovePage: typeof import('../views/ImprovePage').ImprovePage;
  SocialPage: typeof import('../views/SocialPage').SocialPage;
  LifestylePage: typeof import('../views/LifestylePage').LifestylePage;
  MobilePage: typeof import('../views/mobile/MobilePage').MobilePage;
  SettingsPage: typeof import('../views/SettingsPage').SettingsPage;
  StorePage: typeof import('../views/StorePage').StorePage;
};

let readyScreens: GameScreens | null = null;
let screenLoad: Promise<GameScreens> | null = null;

export const getReadyGameScreens = (): GameScreens => {
  if (!readyScreens) throw new Error('Game screens were requested before startup readiness.');
  return readyScreens;
};

export const loadAllGameScreens = (): Promise<GameScreens> => {
  if (readyScreens) return Promise.resolve(readyScreens);
  if (screenLoad) return screenLoad;

  screenLoad = Promise.all([
    import('../views/HomePage'),
    import('../views/CareerPage'),
    import('../views/CreationMenu'),
    import('../views/DeathScreen'),
    import('../views/RedCarpetEvent'),
    import('../views/PressConferenceEvent'),
    import('../views/ImprovePage'),
    import('../views/SocialPage'),
    import('../views/LifestylePage'),
    import('../views/mobile/MobilePage'),
    import('../views/SettingsPage'),
    import('../views/StorePage'),
  ]).then(([
    home, career, creation, death, redCarpet, pressConference, improve, social,
    lifestyle, mobile, settings, store,
  ]) => {
    readyScreens = {
      HomePage: home.HomePage,
      CareerPage: career.CareerPage,
      CreationMenu: creation.CreationMenu,
      DeathScreen: death.DeathScreen,
      RedCarpetEvent: redCarpet.RedCarpetEvent,
      PressConferenceEvent: pressConference.PressConferenceEvent,
      ImprovePage: improve.ImprovePage,
      SocialPage: social.SocialPage,
      LifestylePage: lifestyle.LifestylePage,
      MobilePage: mobile.MobilePage,
      SettingsPage: settings.SettingsPage,
      StorePage: store.StorePage,
    };
    return readyScreens;
  }).catch(error => {
    screenLoad = null;
    throw error;
  });

  return screenLoad;
};
