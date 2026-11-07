/**
 * EMPIRE+ v2 — THE APP
 *
 * Not a preview in a device frame: the actual app a subscriber gets, full
 * screen. No operator data lives here at all — this screen is for feeling what
 * you built, not studying it. The studying happens in the Title Dossier.
 *
 * It is where earlier decisions finally come due:
 *   · the ident you paid for in the wizard plays before every Original
 *   · the servers you built decide whether it plays in 4K or buffers
 *   · the storefront you chose decides how the home screen is laid out: each of the 13 front pages its own home,
 *     as the wizard previews it (#114, StreamingViewerHomes.tsx)
 *   · the plans you built (#48): the app can be seen as each plan's viewers
 *     see it, and a plan with ads sits through its ad breaks in the player
 *   · the incidents you leave open (#58): "We're fixing an issue" on the home
 *     screen, titles that stall while streams are down or slow, and a Download
 *     button that pauses while Downloads is broken
 *   · Smart AI and Profiles and family (#63): "Who's watching?" with a Kids
 *     profile, Because you watched rows, AI channels, and Autoplay's
 *     next-episode card, each where the tree or the plan has it
 *   · it opens like the service (#115): the ident the service paid for, with its
 *     sound and its length, then "Who's watching?" with a profile for each screen
 *     the plan has (Kids as the plan allows), then the home
 */
import css from './presentation/screens/ViewerApp/ViewerApp.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';
import { getStreamingStorefrontRuntimeMode } from '../../services/streamingStorefront';
import { ViewerHomeLeadView, streamingViewerHome, streamingViewerHomeRows, streamingViewerLeadTitles } from './StreamingViewerHomes';
import { StreamingIdentPlayer, type StreamingIdentSurface } from './StreamingIdentPlayer';
import { ViewerArt } from './ViewerArt';
import { streamingViewerAdBreaks } from '../../services/streamingViewerQuality';
import type { StreamingViewerPersonal, StreamingViewerPlan, StreamingViewerQuality, StreamingViewerResolution } from '../../services/streamingViewerQuality';
import { streamingViewerDownloadState, type StreamingViewerDownloadState, type StreamingViewerOutage } from '../../services/streamingViewerOutage';
import { formatGenreLabel } from '../../services/genreCatalog';
import { playStreamingIdentPreview, stopStreamingIdentPreview, type StreamingIdentPreviewId } from '../../services/streamingIdentAudio';
import type { StreamingIdentPackageId, StreamingPricingPlanColorId } from '../../types';

/* ============================================================
   MODEL
   ============================================================ */
export interface AppTitle {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED' | 'OWNED';
  format: string;
  genre: string;
  hue: number;
  logline: string;
  /** #238: the title's one rating */
  rating?: number | null;
  progress?: number;
  leavingInWeeks?: number;
  rank?: number;
  newThisWeek?: boolean;
  episodes?: { n: number; title: string; mins: number }[];
}

export interface AppState {
  live: boolean;
  layoutId: string;
  titles: AppTitle[];
  watchingNow: number;
  /** what the Network page says the service can actually do */
  network: { peakLoad: number; tier: 'SD' | 'HD' | '4K'; latencyMs: number };
  /** the tech tree as a subscriber meets it: badges, the player's quality menu, "Now in 4K" */
  quality?: StreamingViewerQuality;
  /** the plans as a viewer meets them (#48): the plan picker, each plan's view of the app, its ad breaks */
  plans?: StreamingViewerPlan[];
  /** the plan the app opens on: the one most households chose */
  currentPlanId?: string | null;
  /** an open incident viewers would notice (#58): the home screen's banner, stalls, paused downloads */
  outage?: StreamingViewerOutage | null;
  /** Phase 4 (#63): Because you watched rows (Smart AI) and "Who's watching?" (Profiles and screens) */
  personal?: StreamingViewerPersonal | null;
  /** #115: the ident the service paid for, which opens the app; missing, the app opens on its home as before */
  opening?: StreamingViewerOpening | null;
}

/** #115: the opening ident — its sound, its length and the kit it came from (the kit sets its flourish) */
export interface StreamingViewerOpening {
  sound: StreamingIdentPreviewId;
  seconds: number;
  /** STANDARD, FULL, CINEMATIC, GENRE, ADAPTIVE, LIVING */
  packageId: string;
  customAudio?: { dataUrl: string } | null;
}

type Screen = 'OPEN' | 'WHO' | 'BROWSE' | 'TITLE';
type Phase = 'AD' | 'IDENT' | 'SURFACE' | 'PLAYING' | 'BUFFERING';
/** #124: how a title was started: its trailer, or a live AI channel; null for the title itself */
export type PlayMode = 'TRAILER' | 'LIVE' | null;
/** #124: the kit's place before a title — its trailer's, a live channel's or a new title's premiere — or none (no kit,
    Just the ident, or a title carried on by Autoplay) */
export const streamingViewerKitSurface = (
  kit: string | null | undefined, mode: PlayMode, t: Pick<AppTitle, 'newThisWeek'>, continued = false,
): StreamingIdentSurface | null => {
  if (!kit || kit === 'STANDARD') return null;
  if (mode === 'TRAILER') return 'TRAILER';
  if (mode === 'LIVE') return 'LIVE';
  return t.newThisWeek && !continued ? 'PREMIERE' : null;
};
/** #124: the kit's places in the app, as a viewer would name them */
const SURFACE_NAME: Record<StreamingIdentSurface, string> = {
  IDENT: 'Ident', END: 'Up next', TRAILER: 'Official trailer', KIDS: 'Kids', LIVE: 'Live now', PREMIERE: 'World premiere',
};
/** why the plan picker opened: to see another plan, a picture the viewer's plan lacks, no ads, or downloads (#58) */
type PickerReason = { want?: StreamingViewerResolution; noAds?: true; downloads?: true };
type DownloadState = StreamingViewerDownloadState;
const hasDownloads = (plan: StreamingViewerPlan | null) => Boolean(plan?.features.includes('Downloads'));
/* "Who's watching?" (#63): the household's profiles, and the Kids profile where the plan includes it */
type Profile = { id: string; name: string; hue: number };
const PROFILES: Profile[] = [
  { id: 'YOU', name: 'You', hue: 205 }, { id: 'ALEX', name: 'Alex', hue: 18 }, { id: 'MIA', name: 'Mia', hue: 150 },
  { id: 'SAM', name: 'Sam', hue: 275 }, { id: 'RAVI', name: 'Ravi', hue: 95 }, { id: 'NOOR', name: 'Noor', hue: 330 },
];
const KIDS: Profile = { id: 'KIDS', name: 'Kids', hue: 40 };
/** #115: the household's profiles, one for each screen the plan has at once (two at least, six at most, three when the
    plan does not say), as Profiles and screens sells them; Kids is added where the plan includes Kids profiles */
export const streamingViewerProfiles = (plan: StreamingViewerPlan | null): Profile[] => {
  const screens = Math.max(0, ...(plan?.features ?? []).map(feature => Number(/^(\d+) screens? at once$/.exec(feature)?.[1] ?? 0)));
  return PROFILES.slice(0, screens ? Math.min(6, Math.max(2, screens)) : 3);
};
/* what the Kids profile shows: the genres made for children and families */
const KIDS_GENRES = new Set(['ANIMATION', 'ADVENTURE', 'COMEDY', 'FANTASY', 'MUSICAL', 'SPORTS']);
/* an AI channel (#63): always on, playing a title of its genre */
type Channel = { name: string; title: AppTitle; at: number };
export type ViewerRow = { id: string; label: string; lead?: string; items: AppTitle[]; channels?: Channel[] };

const count = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

const REACTIONS = [
  'this is unreal', 'ok episode 4 destroyed me', 'binged the whole thing',
  'the score though', 'who else is rewatching', 'best thing on here',
  'no spoilers please', 'still thinking about that ending',
];

/* the colours plans wear in the plans table (PlanBuilder.tsx), so a plan looks the same here */
const PLAN_COLOUR: Record<StreamingPricingPlanColorId, string> = {
  emerald: '#34d399', ocean: '#38bdf8', teal: '#2dd4bf', rose: '#fb7185', magenta: '#e879f9', graphite: '#94a3b8',
};
const planColour = (plan: StreamingViewerPlan | null) => (plan?.colorId ? PLAN_COLOUR[plan.colorId] : undefined);
const colourVars = (plan: StreamingViewerPlan | null) => {
  const colour = planColour(plan);
  return colour ? { ['--epx-va-pc' as string]: colour } as React.CSSProperties : undefined;
};

/* ============================================================
   THE HOME SCREEN'S ROWS — pure, so the audits read what the app shows
   ============================================================ */
/** what a Kids profile sees (#63): the titles made for children and families, with a Top 10 of
    their own (in the order everyone watches them) */
export const streamingViewerKidsTitles = (titles: AppTitle[]): AppTitle[] => {
  const kids = titles.filter(t => KIDS_GENRES.has(t.genre.toUpperCase()));
  const chart = kids.filter(t => t.rank).sort((a, b) => a.rank! - b.rank!).map(t => t.id);
  return kids.map(t => (t.rank ? { ...t, rank: chart.indexOf(t.id) + 1 } : t));
};

/** the home screen's rows in order; Because you watched and AI channels (#63) where they run */
export const streamingViewerRows = (titles: AppTitle[], options: {
  layoutMode: ReturnType<typeof getStreamingStorefrontRuntimeMode>;
  brandName: string;
  /** Smart AI's Because you watched (or a step above it) is owned */
  because: boolean;
  /** the plan the app is seen as has AI channels */
  channels: boolean;
  /** the profile watching: each builds from its own title */
  profile: string | null;
}): ViewerRow[] => {
  const { layoutMode, brandName, profile } = options;
  const out: ViewerRow[] = [];
  const chart = titles.filter(t => t.rank).sort((a, b) => a.rank! - b.rank!);
  const resume = titles.filter(t => t.progress !== undefined);
  const originals = titles.filter(t => t.kind === 'ORIGINAL');
  const fresh = titles.filter(t => t.newThisWeek);
  const leaving = titles.filter(t => t.leavingInWeeks !== undefined)
    .sort((a, b) => a.leavingInWeeks! - b.leavingInWeeks!);
  /* what this profile watched: each profile its own title */
  const slot = Math.max(0, PROFILES.findIndex(item => item.id === profile));
  const watched = resume.length ? resume : chart;
  const seed = watched.length ? watched[slot % watched.length] : undefined;
  /* Because you watched: titles like it first, then the rest */
  const because = options.because && seed
    ? [...titles.filter(t => t.id !== seed.id && t.genre === seed.genre), ...titles.filter(t => t.id !== seed.id && t.genre !== seed.genre)].slice(0, 8)
    : [];
  /* AI channels: always on, built from the viewer's taste, the genre they watched first */
  const genres = [...new Set([...(seed ? [seed.genre] : []), ...titles.map(t => t.genre)])].slice(0, 3);
  const channels: Channel[] = options.channels ? genres.map((genre, index) => {
    const pool = titles.filter(t => t.genre === genre);
    const title = pool[(index + slot) % pool.length];
    return { name: `${formatGenreLabel(genre)} 24/7`, title, at: 12 + (title.hue * 7 + index * 23) % 76 };
  }) : [];
  if (layoutMode === 'RESUME' && resume.length) out.push({ id: 'r', label: 'Continue Watching', items: resume });
  if (chart.length) out.push({ id: 't', label: `Top 10 on ${brandName || 'EMPIRE+'}`, items: chart });
  if (layoutMode !== 'RESUME' && resume.length) out.push({ id: 'r', label: 'Continue Watching', items: resume });
  if (channels.length) out.push({ id: 'c', label: 'Your AI channels', items: [], channels });
  if (because.length) out.push({ id: 'b', lead: 'Because you watched', label: seed!.title, items: because });
  if (originals.length) out.push({ id: 'o', label: `${brandName || 'EMPIRE+'} Originals`, items: originals });
  if (fresh.length) out.push({ id: 'n', label: 'New This Week', items: fresh });
  if (leaving.length) out.push({ id: 'l', label: 'Leaving Soon', items: leaving });
  return out;
};

/* ============================================================
   THE APP
   ============================================================ */
export const ViewerApp: React.FC<{
  brand: Brand;
  state: AppState;
  onBack: () => void;
}> = ({ brand, state, onBack }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tf = typeFace(brand);
  /* "Who's watching?" first, where the service has profiles (#63) */
  /* #115: the opening ident first, where the service is live and has one */
  const afterOpening: Screen = state.personal?.profiles ? 'WHO' : 'BROWSE';
  const [screen, setScreen] = useState<Screen>(state.live && state.opening ? 'OPEN' : afterOpening);
  const [open, setOpen] = useState<AppTitle | null>(null);
  const [playing, setPlaying] = useState<AppTitle | null>(null);
  /* the episode playing, and whether Autoplay started it (#63) */
  const [episode, setEpisode] = useState({ n: 0, next: false });
  /* #124 (Zeesh: "baaki 5 bhi app mein laga do"): a kit above Just the ident dresses five more places — Up next, the
     trailer, Kids, a live channel and a premiere — with the same film the app opens on (StreamingIdentPlayer) */
  const kit = state.live && state.opening && state.opening.packageId && state.opening.packageId !== 'STANDARD' ? state.opening : null;
  const [mode, setMode] = useState<PlayMode>(null);
  const [bumper, setBumper] = useState<{ surface: StreamingIdentSurface; then: () => void } | null>(null);
  const play = (t: AppTitle, n = 0, how: PlayMode = null) => { setEpisode({ n, next: false }); setMode(how); setPlaying(t); };
  const playNext = useCallback(() => setEpisode(current => ({ n: current.n + 1, next: true })), []);
  const layoutMode = getStreamingStorefrontRuntimeMode(state.layoutId);
  /* the plan the app is seen as (#48): the most chosen one, until another is picked. Seeing the
     app as a plan changes nothing for the service's real subscribers. */
  const plans = state.plans ?? [];
  const [viewAs, setViewAs] = useState<string | null>(state.currentPlanId ?? null);
  const [picker, setPicker] = useState<PickerReason | null>(null);
  const viewPlan = plans.find(plan => plan.id === viewAs) ?? plans.find(plan => plan.id === state.currentPlanId) ?? null;
  const quality = viewPlan?.quality ?? state.quality;
  /* the cheapest plan without ads: what an ad break offers instead */
  const adFree = plans.filter(plan => plan.adLevel === 'NONE').sort((left, right) => left.monthly - right.monthly)[0] ?? null;
  /* "Basic with ads · with ads" says it twice */
  const adSuffix = viewPlan && viewPlan.adLevel !== 'NONE' && !/\bads?\b/i.test(viewPlan.name) ? ` · ${viewPlan.ads.toLowerCase()}` : '';
  /* the Download button (#58): only where some plan sells downloads */
  const downloads: DownloadState | null = streamingViewerDownloadState(viewPlan, plans, state.outage);

  /* Phase 4 (#63): Because you watched and "Who's watching?" from the tree; Kids profiles, AI
     channels and Autoplay where the plan the app is seen as includes them (#62) */
  const personal = state.personal ?? null;
  const kidsOn = Boolean(viewPlan?.features.includes('Kids profiles'));
  const channelsOn = Boolean(viewPlan?.features.includes('AI channels'));
  const autoplayOn = Boolean(viewPlan?.features.includes('Autoplay'));
  const [profile, setProfile] = useState<string | null>(null);
  const kids = profile === 'KIDS' && kidsOn;
  const household = streamingViewerProfiles(viewPlan);
  const who = kids ? KIDS : household.find(item => item.id === profile) ?? household[0];
  /* the Kids profile shows only titles for children and families */
  const titles = useMemo(() => (kids ? streamingViewerKidsTitles(state.titles) : state.titles), [kids, state.titles]);
  const rows = useMemo(() => streamingViewerRows(titles, {
    layoutMode, brandName: brand.name, because: Boolean(personal?.because), channels: channelsOn, profile,
  }), [titles, layoutMode, brand.name, personal, channelsOn, profile]);

  /* #114: the home of the front page the service chose — Cinema's hero here, every other front page's lead from
     StreamingViewerHomes, and the rows its lead leaves room for */
  const home = streamingViewerHome(state.layoutId);
  const homeRows = streamingViewerHomeRows(home, rows);
  const hero = titles.find(t => t.rank === 1) ?? titles[0];
  const showHero = home.lead === 'HERO' && !!hero;

  const openTitle = (t: AppTitle) => { setOpen(t); setScreen('TITLE'); };

  return (
    <div className={css.va} data-epx-root data-layout={state.layoutId} data-home-lead={home.lead} data-kids={kids ? '' : undefined} style={brandVars(brand, {
      ['--epx-va-line' as string]: 'var(--line, rgba(255,255,255,.09))',
    } as React.CSSProperties)}>
      {/* the only operator control on the whole screen */}
      {!playing && screen !== 'OPEN' && !bumper && (
        <button className={css.exitpill} onClick={() => screen === 'TITLE' ? setScreen('BROWSE') : onBack()}>
          {screen === 'TITLE' ? '‹ Back' : '✕ Exit app'}
        </button>
      )}

      {screen === 'OPEN' && state.live && state.opening ? (
        <OpeningIdent brand={brand} opening={state.opening} next={streamingViewerLeadTitles(state.titles)[0] ?? null} onDone={() => setScreen(afterOpening)} />
      ) : !state.live ? (
        <div className={css.prelaunch}>
          <span className={css.plmark}><Mark brand={brand} /></span>
          <b>{brand.name || 'UNNAMED'}</b>
          <p>Nobody can reach this yet. The app goes live the day you launch.</p>
        </div>
      ) : screen === 'WHO' ? (
        <WhoIsWatching brand={brand} profiles={household} kids={kidsOn} current={profile}
          onPick={id => {
            setProfile(id);
            /* #124: Kids opens on the kit's Kids ident */
            if (id === KIDS.id && kit) setBumper({ surface: 'KIDS', then: () => setScreen('BROWSE') });
            else setScreen('BROWSE');
          }} />
      ) : screen === 'BROWSE' ? (
        <div className={css.ascroll}>
          <div className={css.topbar2}>
            {/* #116: the real logo as the lockup sets it (a wordmark is the name alone) */}
            {brand.lockupId !== 'WORDMARK' && <span className={css.tmark}><Mark brand={brand} /></span>}
            <b style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing }}>
              {brand.name || 'UNNAMED'}
            </b>
            {kids ? (
              <div className={css.tnav}><span className={css.kidspill}>Kids</span></div>
            ) : (
              <div className={css.tnav}><span>Series</span><span>Films</span><span>My List</span></div>
            )}
            {/* the profile watching (#63), in its plan's ring: the way back to "Who's watching?" */}
            {personal?.profiles ? (
              <button type="button" className={cx(css.tav, css.tavwho, kids && css.tavkids)}
                style={{ ...colourVars(viewPlan), ['--epx-va-h' as string]: `${who.hue}` } as React.CSSProperties}
                aria-label={`Watching as ${who.name}. Switch profile`} onClick={() => setScreen('WHO')}>{kids ? '' : who.name[0]}</button>
            ) : /* the account: its plan, and the way to another (#48) */ viewPlan ? (
              <button type="button" className={css.tav} style={colourVars(viewPlan)}
                aria-label={`Your plan: ${viewPlan.name}. Change plan`} onClick={() => setPicker({})} />
            ) : <i className={css.tav} />}
          </div>

          {/* the Kids profile with nothing for kids yet */}
          {kids && !titles.length && (
            <div className={css.kidsempty}>
              <b>Nothing here yet</b>
              <span>Shows and films for kids will appear here.</span>
            </div>
          )}

          {showHero && hero && (
            <button className={css.bighero} style={{ ['--epx-va-h' as string]: `${hero.hue}` }} onClick={() => openTitle(hero)}>
              <span className={css.hghost} style={{ fontFamily: tf.stack }}>{hero.title}</span>
              <div className={css.hbody}>
                {hero.kind === 'ORIGINAL' && (
                  <span className={css.otag}><i><Mark brand={brand} /></i>ORIGINAL</span>
                )}
                <b style={{ fontFamily: tf.stack }}>{hero.title}</b>
                <span className={css.hmeta}>{hero.rating ? `★ ${hero.rating.toFixed(1)} · ` : ''}{hero.genre} · {hero.format}</span>
                <QualityBadges badges={quality?.badges} />
                <div className={css.hacts}>
                  <span className={css.pbtn} onClick={e => { e.stopPropagation(); play(hero); }}>
                    <i className={css.tri} />Play
                  </span>
                  <span className={css.lbtn}>+ My List</span>
                </div>
              </div>
            </button>
          )}

          {/* an open incident viewers would notice (#58): first under the hero, which tucks itself beneath the bar above */}
          {state.outage && (
            <div className={cx(css.outage, state.outage.headline.startsWith('A fix') && css.outagefix)} role="status">
              <i className={css.outagemark} aria-hidden="true">!</i>
              <span><b>{state.outage.headline}</b>{state.outage.line}</span>
            </div>
          )}

          {/* which plan the app is seen as (#48): under the hero, which tucks itself beneath the bar above */}
          {viewPlan && plans.length > 1 && (
            <button type="button" className={css.asplan} style={colourVars(viewPlan)} onClick={() => setPicker({})}>
              <i className={css.asdot} />
              <span>Watching as <b>{viewPlan.name}</b>{adSuffix}</span>
              <em>Change ›</em>
            </button>
          )}

          {/* a new resolution, for the two weeks after it arrives; on a plan without it, the plan that has it */}
          {quality?.nowIn && (quality.nowInOn ? (
            <button type="button" className={cx(css.nowin, css.nowinup)} onClick={() => setPicker({ want: quality.nowInOn!.picture })}>
              <i className={css.nowinmark}><Mark brand={brand} /></i>
              <b>{quality.nowIn}</b>
              <span>on {quality.nowInOn.plan}</span>
              <em>›</em>
            </button>
          ) : (
            <div className={css.nowin} role="status">
              <i className={css.nowinmark}><Mark brand={brand} /></i>
              <b>{quality.nowIn}</b>
              {quality.planName && <span>on {quality.planName}</span>}
            </div>
          ))}

          <ViewerHomeLeadView lead={home.lead} titles={titles} brand={brand} tf={tf} onOpen={openTitle} onPlay={play} />

          {homeRows.map(r => r.channels ? (
            /* AI channels (#63): always on; a tap joins the channel */
            <div className={css.arow} key={r.id}>
              <div className={css.arowhead}>{r.label}</div>
              <div className={css.arail}>
                {r.channels.map(ch => (
                  <button type="button" className={css.chcard} key={ch.name} style={{ ['--epx-va-h' as string]: `${ch.title.hue}` }}
                    aria-label={`${ch.name}, live: ${ch.title.title}`} onClick={() => play(ch.title, 0, 'LIVE')}>
                    <span className={css.chlive}><i className={css.dot} />LIVE</span>
                    <b className={css.chname} style={{ fontFamily: tf.stack }}>{ch.name}</b>
                    <span className={css.chnow}>Now: <b>{ch.title.title}</b></span>
                    <span className={css.chbar}><i style={{ width: `${ch.at}%` }} /></span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={css.arow} key={r.id}>
              <div className={css.arowhead}>{r.lead && <span className={css.arowlead}>{r.lead} </span>}{r.label}</div>
              <div className={css.arail}>
                {r.items.map(t => {
                  /* the title's picture (ViewerArt): its gradient, its ghost, the caption */
                  const card = (
                    <button className={css.acard} key={`${r.id}-${t.id}`} aria-label={r.id === 't' && t.rank ? `${t.rank}. ${t.title}` : t.title}
                      style={{ ['--epx-va-h' as string]: `${t.hue}` }} onClick={() => openTitle(t)}>
                      <ViewerArt t={t} brand={brand} badge={t.leavingInWeeks === undefined} />
                      {t.leavingInWeeks !== undefined && (
                        <span className={css.cleave}>{t.leavingInWeeks <= 1 ? 'Last week' : `${t.leavingInWeeks} weeks left`}</span>
                      )}
                      {t.progress !== undefined && <div className={css.cprog}><i style={{ width: `${t.progress * 100}%` }} /></div>}
                    </button>
                  );
                  /* #143: the Top 10 row draws the big number beside each poster, as real apps do */
                  return r.id === 't' && t.rank ? (
                    <div className={css.t10slot} key={`${r.id}-${t.id}`} data-two={t.rank >= 10 ? '' : undefined}>
                      <span className={css.t10big} aria-hidden="true" style={{ fontFamily: tf.stack }}>{t.rank}</span>
                      {card}
                    </div>
                  ) : card;
                })}
              </div>
            </div>
          ))}

          <div className={css.livebar}><i className={css.dot} />{count(state.watchingNow)} watching right now</div>
          <div className={css.append}>{brand.name || 'EMPIRE+'} · {kids ? `${titles.length} for kids` : `${state.titles.length} titles in your region`}</div>
        </div>
      ) : open ? (
        <TitlePage brand={brand} t={open} watching={state.watchingNow} badges={quality?.badges}
          downloads={downloads} onDownloadsPlan={() => setPicker({ downloads: true })}
          onPlay={n => play(open, n)} onTrailer={() => play(open, 0, 'TRAILER')} onOpen={openTitle}
          related={titles.filter(x => x.id !== open.id).slice(0, 6)} />
      ) : null}

      {/* a new plan starts the title again, the way that plan's viewers would see it */}
      {playing && (
        <Player key={`${playing.id}:${episode.n}:${viewPlan?.id ?? 'none'}`} brand={brand} t={playing} network={state.network} quality={quality} outage={state.outage ?? null}
          episode={episode.n} continued={episode.next} autoplay={autoplayOn && mode === null}
          kit={kit?.packageId ?? null} sound={kit?.sound ?? 'silent'} mode={mode}
          onNext={playNext}
          adSpotsPerHour={viewPlan?.adSpotsPerHour ?? 0}
          adFree={adFree && adFree.id !== viewPlan?.id ? adFree : null}
          paused={Boolean(picker)}
          onUpgrade={reason => setPicker(reason)}
          onExit={() => setPlaying(null)} />
      )}

      {/* #124: a kit's place that is not the player's (Kids), over the app until it ends or is skipped */}
      {bumper && kit && (
        <KitBumper brand={brand} kit={kit.packageId} sound={kit.sound} surface={bumper.surface}
          onDone={() => { const then = bumper.then; setBumper(null); then(); }} />
      )}

      {picker && plans.length > 0 && (
        <PlanPicker brand={brand} plans={plans} current={viewPlan?.id ?? null} reason={picker}
          onPick={id => { setViewAs(id); setPicker(null); }} onClose={() => setPicker(null)} />
      )}
    </div>
  );
};

/* ============================================================
   THE OPENING IDENT (#115) — the service's own sting, with its sound and its length
   ============================================================ */
/* Plan §18.5, 4: "the ident the player paid for plays, with its sound and its length", then "Who's watching?", then
   the home. The kit sets the flourish (Cinematic letterboxes it, the bigger kits sweep light across it); the bar along
   the foot is its length. A tap or Skip ends it, and its sound with it. */
/* #124: one of the kit's places, full screen for a moment: its film (the kit's surface), its sound, Skip */
const KitBumper: React.FC<{ brand: Brand; kit: string; sound: string; surface: StreamingIdentSurface; onDone: () => void }> = ({
  brand, kit, sound, surface, onDone,
}) => {
  const done = useRef(false);
  const then = useRef(onDone);
  then.current = onDone;
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    stopStreamingIdentPreview();
    then.current();
  }, []);
  useEffect(() => {
    void playStreamingIdentPreview(sound as StreamingIdentPreviewId).catch(() => undefined);
    const timer = window.setTimeout(finish, KIT_SURFACE_MS);
    return () => window.clearTimeout(timer);
  }, [sound, finish]);
  return (
    <div className={css.bumper} role="button" tabIndex={0} aria-label={`${SURFACE_NAME[surface]}. Tap to skip`} onClick={finish}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') finish(); }}>
      <StreamingIdentPlayer brand={brand} kit={kit as StreamingIdentPackageId} sound={sound} seconds={KIT_SURFACE_MS / 1000} surface={surface} />
      <span className={css.brun} aria-hidden="true"><i /></span>
      <button type="button" className={css.skip} onClick={event => { event.stopPropagation(); finish(); }}>SKIP ›</button>
    </div>
  );
};
/** how long a kit's place plays before the title or the screen it leads to */
const KIT_SURFACE_MS = 2600;

/* #119: the scene is the kit's own (`StreamingIdentPlayer`, the brand studio previews the same one); the opening adds
   its length along the foot, Skip, and the sound, played as the app opens */
const OpeningIdent: React.FC<{ brand: Brand; opening: StreamingViewerOpening; next: AppTitle | null; onDone: () => void }> = ({ brand, opening, next, onDone }) => {
  const seconds = Math.max(2, Math.min(14, opening.seconds || 3));
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    stopStreamingIdentPreview();
    onDone();
  }, [onDone]);
  useEffect(() => {
    void playStreamingIdentPreview(opening.sound, opening.customAudio ?? null).catch(() => undefined);
    const timer = window.setTimeout(finish, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [opening.sound, opening.customAudio, seconds, finish]);
  return (
    <div className={cx(css.ident, css.opening)} data-ident-kit={opening.packageId} role="button" tabIndex={0}
      aria-label={`${brand.name || 'EMPIRE+'} ident. Tap to skip`} onClick={finish}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') finish(); }}
      style={{ ['--epx-va-ident-s' as string]: `${seconds}s` } as React.CSSProperties}>
      <StreamingIdentPlayer brand={brand} kit={(opening.packageId || 'STANDARD') as StreamingIdentPackageId} sound={opening.sound} seconds={seconds}
        next={next ? { title: next.title, hue: next.hue } : null} />
      <span className={css.irun} aria-hidden="true"><i /></span>
      <button type="button" className={css.skip} onClick={event => { event.stopPropagation(); finish(); }}>SKIP ›</button>
    </div>
  );
};

/* ============================================================
   WHO'S WATCHING? (#63) — the household's profiles, and Kids where the plan has it
   ============================================================ */
/* a profile's face: two eyes and a smile */
const Face: React.FC = () => (
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="13.5" cy="16" r="2.7" fill="currentColor" /><circle cx="26.5" cy="16" r="2.7" fill="currentColor" />
    <path d="M11 24.5q9 8 18 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

const WhoIsWatching: React.FC<{
  brand: Brand;
  /** the household's profiles (#115: one a screen the plan has) */
  profiles: Profile[];
  /** the plan the app is seen as includes Kids profiles */
  kids: boolean;
  current: string | null;
  onPick: (id: string) => void;
}> = ({ brand, profiles, kids, current, onPick }) => {
  const tf = typeFace(brand);
  return (
    <div className={css.who}>
      <span className={css.whomark}><Mark brand={brand} /></span>
      <h1 style={{ fontFamily: tf.stack }}>Who’s watching?</h1>
      <div className={css.wholist}>
        {[...profiles, ...(kids ? [KIDS] : [])].map(item => (
          <button type="button" key={item.id} className={cx(css.whocard, item.id === KIDS.id && css.whokids, item.id === current && css.whoon)}
            style={{ ['--epx-va-h' as string]: `${item.hue}` }} aria-pressed={item.id === current} onClick={() => onPick(item.id)}>
            <span className={css.whoav}><Face /></span>
            <b>{item.name}</b>
          </button>
        ))}
      </div>
      {kids && <p className={css.whonote}>Kids sees only shows and films made for children and families.</p>}
    </div>
  );
};

/* ============================================================
   THE PLAN PICKER (#48) — the real plans, as a viewer meets them
   ============================================================ */
const PlanPicker: React.FC<{
  brand: Brand;
  plans: StreamingViewerPlan[];
  current: string | null;
  /** what the viewer reached for: a picture their plan lacks, or no ads; the plans that have it are marked */
  reason: PickerReason;
  onPick: (id: string) => void;
  onClose: () => void;
}> = ({ brand, plans, current, reason, onPick, onClose }) => {
  const tf = typeFace(brand);
  const { want, noAds, downloads } = reason;
  const focus = Boolean(want || noAds || downloads);
  const has = (plan: StreamingViewerPlan) => (want
    ? RESOLUTIONS.indexOf(plan.quality.planMax) >= RESOLUTIONS.indexOf(want)
    : downloads ? hasDownloads(plan) : Boolean(noAds && plan.adLevel === 'NONE'));
  const title = want ? `Watch in ${want}` : noAds ? 'Watch without ads' : downloads ? 'Download to watch offline' : 'Choose your plan';
  const lead = want ? `${want} is on the plans marked below.` : noAds ? 'The plans marked below have no ads.'
    : downloads ? 'Downloads are on the plans marked below.' : 'See the app the way each plan’s viewers see it.';
  return (
    <div className={css.picker} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className={css.pkveil} aria-label="Close" onClick={onClose} />
      <div className={css.pksheet}>
        <div className={css.pkhead}>
          <span className={css.pkmark}><Mark brand={brand} /></span>
          <b style={{ fontFamily: tf.stack }}>{title}</b>
          <button type="button" className={css.pkclose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={css.pksub}>{lead} Previewing a plan changes nothing for your subscribers.</p>
        <div className={cx(css.pklist, focus && css.pkfocus)}>
          {plans.map(plan => {
            const on = plan.id === current;
            const marked = has(plan);
            return (
              <button type="button" key={plan.id} className={cx(css.pkcard, on && css.pkon, marked && css.pkwant)}
                style={colourVars(plan)} aria-pressed={on} onClick={() => onPick(plan.id)}>
                <span className={css.pktop}>
                  <b>{plan.name}</b>
                  {on ? <em>Watching as</em> : marked ? <em>{want ? `Has ${want}` : downloads ? 'Downloads' : 'No ads'}</em> : null}
                </span>
                <span className={css.pkprice}>
                  <strong>{plan.price}</strong>
                  <i>{plan.picture}</i>
                </span>
                <span className={css.pkfeat}>
                  {plan.features.map(feature => <span key={feature}>{feature}</span>)}
                  <span className={plan.adLevel === 'NONE' ? css.pknoads : css.pkads}>{plan.ads}</span>
                </span>
                {plan.qualityNotSet && <small>Its own quality is not set yet, so its viewers watch what your plans' viewers watch.</small>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   TITLE PAGE
   ============================================================ */
/* what the title streams in on this plan: "4K", "HDR", "Spatial audio" */
const QualityBadges: React.FC<{ badges?: string[] }> = ({ badges }) => (badges && badges.length ? (
  <span className={css.qbadges}>{badges.map(badge => <i key={badge}>{badge}</i>)}</span>
) : null);

/* the download mark: an arrow into a tray */
const DownloadMark: React.FC = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0-3-3m3 3 3-3M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const TitlePage: React.FC<{
  brand: Brand; t: AppTitle; watching: number; badges?: string[];
  /** the Download button (#58); null where no plan sells downloads */
  downloads?: DownloadState | null;
  onDownloadsPlan?: () => void;
  /** plays the title, from its first episode or the one tapped */
  onPlay: (episode?: number) => void; onOpen: (t: AppTitle) => void; related: AppTitle[];
  /** #124: plays its trailer (the kit's trailer ident first, where the service has one) */
  onTrailer?: () => void;
}> = ({ brand, t, watching, badges, downloads = null, onDownloadsPlan, onPlay, onTrailer, onOpen, related }) => {
  const tf = typeFace(brand);
  const [react, setReact] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const iv = window.setInterval(() => setReact(r => (r + 1) % REACTIONS.length), 2600);
    return () => window.clearInterval(iv);
  }, []);

  return (
    <div className={css.tpage}>
      <div className={css.tart} style={{ ['--epx-va-h' as string]: `${t.hue}` }}>
        <span className={css.tghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
      </div>
      <div className={css.tbody}>
        {t.kind === 'ORIGINAL' && <span className={css.otag}><i><Mark brand={brand} /></i>ORIGINAL</span>}
        <h1 style={{ fontFamily: tf.stack }}>{t.title}</h1>
        <div className={css.tmeta2}>{t.rating ? `★ ${t.rating.toFixed(1)} · ` : ''}{t.genre} · {t.format}{t.episodes ? ` · ${t.episodes.length} episodes` : ''}</div>
        <QualityBadges badges={badges} />
        <p className={css.tlog}>{t.logline}</p>

        <button className={css.playbig} onClick={() => onPlay()}><i className={css.tri} />Play</button>
        <div className={css.trow2}>
          {onTrailer && <button type="button" className={css.tchip} onClick={onTrailer}><i className={css.tri} />Trailer</button>}
          <span className={css.tchip}>+ My List</span>
          {/* downloads (#58): on the viewer's plan, paused by an incident, or on another plan */}
          {downloads === 'ON' && (
            <button type="button" className={cx(css.tchip, css.dl, saved && css.dlsaved)} aria-pressed={saved} onClick={() => setSaved(true)}>
              <DownloadMark />{saved ? 'Downloaded' : 'Download'}
            </button>
          )}
          {downloads === 'PAUSED' && (
            <span className={cx(css.tchip, css.dl, css.dloff)} role="status"><DownloadMark />Paused</span>
          )}
          {downloads === 'PLAN' && (
            <button type="button" className={cx(css.tchip, css.dl, css.dlplan)} onClick={onDownloadsPlan}>
              <DownloadMark />Download
            </button>
          )}
          <span className={css.tchip}>Rate</span>
          <span className={css.tchip}>Share</span>
        </div>
        {downloads === 'PAUSED' && <div className={css.dlnote}>Downloads are paused while we fix an issue. Streaming works as usual.</div>}

        {t.leavingInWeeks !== undefined && (
          <div className={css.tleave}>
            Leaving in {t.leavingInWeeks} week{t.leavingInWeeks === 1 ? '' : 's'} — watch it before it goes.
          </div>
        )}

        <div className={css.tlive}><i className={css.dot} />{count(watching)} watching · “{REACTIONS[react]}”</div>

        {t.episodes && (
          <div className={css.eps}>
            <div className={css.epshead}>Episodes</div>
            {t.episodes.map(e => (
              <button className={css.ep} key={e.n} onClick={() => onPlay(e.n - 1)}>
                <span className={css.epn}>{e.n}</span>
                <div className={css.epid}><b>{e.title}</b><span>{e.mins}m</span></div>
                <i className={css.eptri} />
              </button>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div className={css.more}>
            <div className={css.epshead}>More Like This</div>
            <div className={css.mgrid}>
              {related.map(r => (
                <button className={css.mcard} key={r.id} style={{ ['--epx-va-h' as string]: `${r.hue}` }} aria-label={r.title}
                  onClick={() => onOpen(r)}>
                  <ViewerArt t={r} brand={brand} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={css.tfootspace} />
      </div>
    </div>
  );
};

/* ============================================================
   THE PLAYER — where the ident, the servers and the plan's ads come due
   ============================================================ */
const RESOLUTIONS: StreamingViewerResolution[] = ['480p', '720p', '1080p', '4K', '8K', '12K', '16K', '24K'];
const lower = (left: StreamingViewerResolution, right: StreamingViewerResolution) => (
  RESOLUTIONS.indexOf(left) <= RESOLUTIONS.indexOf(right) ? left : right
);

/* made-up advertisers for the ad breaks (#48) */
const ADVERTISERS: Array<{ name: string; line: string; hue: number }> = [
  { name: 'LUMEN COLA', line: 'Taste the light', hue: 8 },
  { name: 'KESTREL MOTORS', line: 'Built for the long road', hue: 212 },
  { name: 'PIXELWAVE', line: 'The phone that sees in the dark', hue: 268 },
  { name: 'ORBIT INSURANCE', line: 'Cover for wherever you land', hue: 168 },
  { name: 'HARVEST & CO.', line: 'Breakfast, the slow way', hue: 38 },
];
/* a 30-second spot plays in this many milliseconds: the player is a taste of a title, not the film */
const AD_SPOT_MS = 3600;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const Player: React.FC<{
  brand: Brand; t: AppTitle;
  network: AppState['network'];
  quality?: StreamingViewerQuality;
  /** an open incident (#58): when streams are down or slow, the title stalls once */
  outage?: StreamingViewerOutage | null;
  /** 30-second ad spots an hour on the plan the app is seen as (0: no ads) */
  adSpotsPerHour: number;
  /** the cheapest plan without ads, which an ad break offers */
  adFree: StreamingViewerPlan | null;
  /** the plan picker is open over the player: playback and ads wait */
  paused: boolean;
  /** the episode playing (from 0), whether Autoplay started it (no ident then), and whether the
      plan has Autoplay: the next episode starts on its own after a short count (#63) */
  episode?: number;
  continued?: boolean;
  autoplay?: boolean;
  onNext?: () => void;
  /** #124: the kit the service paid for (its places dress the player) and its sound; how the title was started */
  kit?: string | null;
  sound?: string;
  mode?: PlayMode;
  onUpgrade: (reason: PickerReason) => void;
  onExit: () => void;
}> = ({ brand, t, network, quality: picture, outage = null, adSpotsPerHour, adFree, paused, episode = 0, continued = false, autoplay = false, kit = null, sound = 'silent', mode = null, onNext, onUpgrade, onExit }) => {
  const c = brandColor(brand);
  const tf = typeFace(brand);
  /* #124: the kit's place before the title: the trailer's, a live channel's, or a new title's premiere */
  const surface = streamingViewerKitSurface(kit, mode, t, continued);
  const runsIdent = brand.identMode === 'full' && t.kind === 'ORIGINAL' && !continued && !surface && mode !== 'TRAILER';
  /* Autoplay (#63): the episode after this one, where the plan has it */
  const nextEp = autoplay && onNext ? t.episodes?.[episode + 1] ?? null : null;
  const [upNext, setUpNext] = useState<number | null>(null);
  const [cancelled, setCancelled] = useState(false);
  /* the plan's ad breaks: one before the title, mid-rolls through it */
  const breaks = useMemo(() => (mode === 'TRAILER' ? [] : streamingViewerAdBreaks(adSpotsPerHour)), [adSpotsPerHour, mode]);
  const [breakIndex, setBreakIndex] = useState(0);
  /* seconds left in the ad break that is playing */
  const [adLeft, setAdLeft] = useState((breaks[0]?.spots ?? 1) * 30);
  const [phase, setPhase] = useState<Phase>(breaks.length ? 'AD' : surface ? 'SURFACE' : runsIdent ? 'IDENT' : 'PLAYING');
  const [canSkip, setCanSkip] = useState(false);
  const [pos, setPos] = useState(0);
  /* What plays: the viewer's plan sets the best picture, the network may hold it lower, and a
     stall drops it to 480p for the rest of the session. The menu lets the viewer pick lower. */
  const networkCap: StreamingViewerResolution = network.tier === '4K' ? '24K' : network.tier === 'HD' ? '1080p' : '480p';
  const planMax: StreamingViewerResolution = picture?.planMax ?? (network.tier === '4K' ? '4K' : network.tier === 'HD' ? '1080p' : '480p');
  const auto = lower(planMax, networkCap);
  const [choice, setChoice] = useState<'AUTO' | StreamingViewerResolution>('AUTO');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropped, setDropped] = useState(false);
  const effective: StreamingViewerResolution = dropped ? '480p' : choice === 'AUTO' ? auto : lower(choice, networkCap);
  const rank = RESOLUTIONS.indexOf(effective);
  const label = rank >= RESOLUTIONS.indexOf('4K') && picture?.badges.includes('HDR') ? `${effective} HDR` : effective;
  const tone = rank >= RESOLUTIONS.indexOf('4K') ? css.q4k : rank >= RESOLUTIONS.indexOf('720p') ? css.qhd : css.qsd;
  const [stalled, setStalled] = useState(false);
  const timers = useRef<number[]>([]);

  /* the break playing: its spots, which one is on, and who is advertising */
  const adBreak = breaks[breakIndex];
  const breakSeconds = (adBreak?.spots ?? 1) * 30;
  const spotIndex = Math.min((adBreak?.spots ?? 1) - 1, Math.floor((breakSeconds - adLeft) / 30));
  const advertiser = ADVERTISERS[(t.hue + breakIndex * 3 + spotIndex) % ADVERTISERS.length];

  /* the servers decide whether this plays cleanly, and so does an incident nobody has fixed yet (#58) */
  const outageStall = Boolean(outage?.stall);
  const willStall = network.peakLoad >= 85 || network.latencyMs > 120 || outageStall;

  /* the ident runs once; a skip, or an ad break after it, is never cut short by its timer */
  useEffect(() => {
    if (phase !== 'IDENT') return;
    timers.current.push(window.setTimeout(() => setCanSkip(true), 1200));
    timers.current.push(window.setTimeout(() => setPhase(current => current === 'IDENT' ? 'PLAYING' : current), brand.identLen * 1000));
  }, [phase, brand.identLen]);

  /* #124: the kit's place plays for a moment, with its sound; Skip comes after a beat */
  useEffect(() => {
    if (phase !== 'SURFACE') return;
    void playStreamingIdentPreview(sound as StreamingIdentPreviewId).catch(() => undefined);
    timers.current.push(window.setTimeout(() => setCanSkip(true), 800));
    timers.current.push(window.setTimeout(() => setPhase(current => current === 'SURFACE' ? 'PLAYING' : current), KIT_SURFACE_MS));
  }, [phase, sound]);

  /* an ad break counts its seconds down (waiting while the plan picker is open) */
  useEffect(() => {
    if (phase !== 'AD' || paused) return;
    const iv = window.setInterval(() => setAdLeft(left => Math.max(0, left - 1)), AD_SPOT_MS / 30);
    return () => window.clearInterval(iv);
  }, [phase, paused]);

  /* then the title runs: the ident first, after the break before it */
  useEffect(() => {
    if (phase !== 'AD' || adLeft > 0) return;
    setBreakIndex(breakIndex + 1);
    setAdLeft((breaks[breakIndex + 1]?.spots ?? 1) * 30);
    setPhase(breakIndex === 0 && surface ? 'SURFACE' : breakIndex === 0 && runsIdent ? 'IDENT' : 'PLAYING');
  }, [phase, adLeft, breakIndex, breaks, runsIdent, surface]);

  /* a mid-roll when playback reaches the next break */
  useEffect(() => {
    if (phase !== 'PLAYING' || breakIndex >= breaks.length || pos < breaks[breakIndex].at) return;
    setMenuOpen(false);
    setPhase('AD');
  }, [pos, phase, breakIndex, breaks]);

  useEffect(() => {
    if (phase !== 'PLAYING' || paused) return;
    const iv = window.setInterval(() => setPos(p => Math.min(100, p + 0.7)), 90);
    return () => window.clearInterval(iv);
  }, [phase, paused]);

  /* one stall partway in, if the infrastructure cannot carry it */
  useEffect(() => {
    if (phase !== 'PLAYING' || !willStall || stalled || pos < 28) return;
    setStalled(true);
    setPhase('BUFFERING');
    setDropped(true);
    timers.current.push(window.setTimeout(() => setPhase(current => current === 'BUFFERING' ? 'PLAYING' : current), 2400));
  }, [pos, phase, willStall, stalled]);

  /* Autoplay (#63): at the end of an episode, a five-second count, then the next one */
  useEffect(() => {
    if (!nextEp || cancelled || phase !== 'PLAYING' || pos < 100 || upNext !== null) return;
    setMenuOpen(false);
    setUpNext(5);
  }, [nextEp, cancelled, phase, pos, upNext]);
  useEffect(() => {
    if (upNext === null || paused) return;
    const id = window.setTimeout(() => (upNext <= 1 ? onNext?.() : setUpNext(upNext - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [upNext, paused, onNext]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  return (
    <div className={css.player}>
      {phase === 'AD' && adBreak ? (
        <div className={css.adbreak} style={{ ['--epx-va-h' as string]: `${advertiser.hue}` }}
          role="status" aria-label={`Ad break: ${adLeft} seconds left`}>
          <span className={css.adtag}>
            <i>Ad</i>{adBreak.spots > 1 ? `${spotIndex + 1} of ${adBreak.spots} · ` : ''}{clock(adLeft)}
          </span>
          <div className={css.adbody} key={`${breakIndex}:${spotIndex}`}>
            <b>{advertiser.name}</b>
            <span>{advertiser.line}</span>
          </div>
          <div className={css.adfoot}>
            <span>{t.title} {breakIndex === 0 ? 'starts' : 'continues'} after {adBreak.spots > 1 ? 'these ads' : 'this ad'}</span>
            {adFree && (
              <button type="button" className={css.adfree} style={colourVars(adFree)} onClick={() => onUpgrade({ noAds: true })}>
                Watch without ads on {adFree.name} · {adFree.price} ›
              </button>
            )}
          </div>
          <div className={css.adbar}><i style={{ width: `${(breakSeconds - adLeft) / breakSeconds * 100}%` }} /></div>
        </div>
      ) : phase === 'SURFACE' && surface ? (
        /* #124: the kit's trailer, live or premiere ident before the title */
        <div className={css.kitsurface} role="status" aria-label={SURFACE_NAME[surface]}>
          <StreamingIdentPlayer brand={brand} kit={kit as StreamingIdentPackageId} sound={sound} seconds={KIT_SURFACE_MS / 1000} surface={surface}
            next={{ title: t.title, hue: t.hue }} />
          {canSkip && <button className={css.skip} onClick={() => setPhase('PLAYING')}>SKIP ›</button>}
        </div>
      ) : phase === 'IDENT' ? (
        <div className={css.ident}>
          <span className={css.imark}><Mark brand={brand} /></span>
          <div className={css.iname} style={{ fontFamily: tf.stack }}>{brand.name || 'EMPIRE+'}</div>
          <div className={css.iwave}>
            {Array.from({ length: 15 }).map((_, n) => {
              const env = 0.34 + 0.66 * Math.sin((Math.PI * (n + 0.5)) / 15);
              return <i key={n} style={{
                ['--epx-va-m' as string]: env.toFixed(3),
                animationDelay: `${((n * 7) % 5) * 0.09}s`, background: c,
              }} />;
            })}
          </div>
          {/* people skip idents. that is the friction you were warned about */}
          {canSkip && <button className={css.skip} onClick={() => setPhase('PLAYING')}>SKIP ›</button>}
        </div>
      ) : (
        <>
          <div className={css.pic} style={{ ['--epx-va-h' as string]: `${t.hue}` }}>
            <span className={css.picghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
            {brand.identMode === 'badge' && <span className={css.wmk}><Mark brand={brand} /></span>}
          </div>

          {phase === 'BUFFERING' && (
            <div className={css.buffer}>
              <i className={css.spin} />
              <b>Buffering…</b>
              <span>
                {outageStall ? outage!.line
                  : network.latencyMs > 120
                    ? `This region is ${network.latencyMs}ms from your nearest data centre`
                    : `Peak load is at ${network.peakLoad}%`}
              </span>
            </div>
          )}

          <div className={css.pctl2}>
            {/* the plan's mid-rolls, marked where they fall, as the apps mark them */}
            <div className={css.pscrub2}>
              <i style={{ width: `${pos}%` }} />
              {breaks.slice(1).map(item => <b key={item.at} className={css.admark} style={{ left: `${item.at}%` }} />)}
            </div>
            <div className={css.prow2}>
              <b style={{ fontFamily: tf.stack }}>
                {mode === 'LIVE' && <span className={css.plive}><i className={css.dot} />LIVE </span>}
                {t.title}
                {mode === 'TRAILER' ? <span className={css.pep}> · Official trailer</span>
                  : t.episodes && t.episodes.length > 1 && <span className={css.pep}> · E{episode + 1}</span>}
              </b>
              <button type="button" className={cx(css.qual, tone)} aria-expanded={menuOpen} aria-label={`Quality: ${label}. Change quality`}
                onClick={() => setMenuOpen(open => !open)}>{label}</button>
            </div>
          </div>

          {/* #124: the kit's end card behind the count to the next episode */}
          {upNext !== null && nextEp && kit && (
            <div className={css.unbg} aria-hidden="true">
              <StreamingIdentPlayer brand={brand} kit={kit as StreamingIdentPackageId} sound="silent" seconds={5} surface="END" next={{ title: nextEp.title, hue: t.hue }} />
            </div>
          )}
          {/* Autoplay (#63): the next episode, counting down; Cancel stays on this one */}
          {upNext !== null && nextEp && (
            <div className={css.upnext} role="status" aria-label={`Next episode in ${upNext} seconds`}>
              <span className={css.unring} style={{ ['--epx-va-p' as string]: `${(5 - upNext) / 5}` }}><b>{upNext}</b></span>
              <span className={css.unbody}><small>Next episode</small><b>{nextEp.n}. {nextEp.title}</b></span>
              <span className={css.unacts}>
                <button type="button" className={css.unplay} onClick={() => onNext?.()}><i className={css.tri} />Play now</button>
                <button type="button" className={css.uncancel} onClick={() => { setCancelled(true); setUpNext(null); }}>Cancel</button>
              </span>
            </div>
          )}

          {/* the quality menu: what this plan streams; a dearer plan's picture is greyed and opens the plans */}
          {menuOpen && (
            <div className={css.qmenu} role="menu" aria-label="Quality">
              <b>Quality</b>
              <button type="button" role="menuitemradio" aria-checked={choice === 'AUTO'} className={cx(css.qopt, choice === 'AUTO' && css.qon)}
                onClick={() => { setChoice('AUTO'); setMenuOpen(false); }}>
                <span>Auto</span><small>{auto}</small>
              </button>
              {(picture?.menu ?? []).map(option => option.state === 'AVAILABLE' ? (
                <button type="button" role="menuitemradio" key={option.label} aria-checked={choice === option.label}
                  className={cx(css.qopt, choice === option.label && css.qon)}
                  onClick={() => { setChoice(option.label); setMenuOpen(false); }}>
                  <span>{option.label}</span>
                  {RESOLUTIONS.indexOf(option.label) > RESOLUTIONS.indexOf(networkCap) && <small>Network-limited</small>}
                </button>
              ) : (
                <button type="button" role="menuitem" key={option.label} className={cx(css.qopt, css.qlocked)}
                  onClick={() => { setMenuOpen(false); onUpgrade({ want: option.label }); }}>
                  <span>{option.label}</span><small>Upgrade plan ›</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <button className={css.pexit} onClick={onExit}>✕</button>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/ViewerApp/ViewerApp.module.css */
