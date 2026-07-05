
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Twitter, Send, Star, Globe, LogOut, Coffee, Bug, Puzzle, Lock, CheckCircle2, Users, ChevronRight, Sparkles, SlidersHorizontal, ShieldCheck, Gauge, Database, Copy, Smartphone, MessageCircle, LifeBuoy, Bell } from 'lucide-react';
import { GameLanguage, Player } from '../types';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { createGlobalActorPackNPCs, getGlobalActorPackDescription, getGlobalActorPackLabel, GLOBAL_ACTOR_PACKS } from '../services/npcLogic';
import { getGlobalCreatorCountForPack } from '../services/youtubeLogic';
import { getPlayerLanguage, SUPPORTED_LANGUAGES, t } from '../services/i18n';
import { addBreadcrumb, enableManualPushNotifications, getFirebaseAuthStatus, getFirebasePushStatus, markTraceAction, onFirebaseAuthStatusChanged, onFirebasePushStatusChanged, submitPlayerIssueReport, trackGameEvent } from '../services/firebaseService';

interface SettingsPageProps {
  player: Player;
  onUpdatePlayer: (updater: (player: Player) => Player) => void;
  onBack: () => void;
  onMainMenu: () => void;
}

type SettingsMode = 'SETTINGS' | 'PERFORMANCE' | 'GAMEPLAY' | 'LANGUAGE' | 'SUPPORT' | 'COMMUNITY' | 'MODS' | 'EXTERNAL_ACTORS';
type SettingsIcon = React.ComponentType<{ size?: number; className?: string }>;

const ISSUE_CATEGORIES = [
  { id: 'CRASH_RESTART', labelKey: 'settings.issue.crashRestart', hintKey: 'settings.issue.crashRestartHint' },
  { id: 'GREENLIGHT_PRODUCTION', labelKey: 'settings.issue.greenlight', hintKey: 'settings.issue.greenlightHint' },
  { id: 'SAVE_LOAD', labelKey: 'settings.issue.saveLoad', hintKey: 'settings.issue.saveLoadHint' },
  { id: 'PROFILE', labelKey: 'settings.issue.profile', hintKey: 'settings.issue.profileHint' },
  { id: 'AWARDS', labelKey: 'settings.issue.awards', hintKey: 'settings.issue.awardsHint' },
  { id: 'LAG_UI', labelKey: 'settings.issue.lagUi', hintKey: 'settings.issue.lagUiHint' },
  { id: 'OTHER', labelKey: 'settings.issue.other', hintKey: 'settings.issue.otherHint' },
];

const SUPPORT_DEVICE_ID_KEY = 'actorEmpire.supportDeviceId.v1';
const SUPPORT_EMAIL = 'support.empirestudioz@gmail.com';

const createSupportDeviceId = () => {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `ae_${randomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
};

const getSupportDeviceId = () => {
  try {
    const storedId = localStorage.getItem(SUPPORT_DEVICE_ID_KEY);
    if (storedId) return storedId;
    const nextId = createSupportDeviceId();
    localStorage.setItem(SUPPORT_DEVICE_ID_KEY, nextId);
    return nextId;
  } catch {
    return createSupportDeviceId();
  }
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ player, onUpdatePlayer, onBack, onMainMenu }) => {
  const [mode, setMode] = useState<SettingsMode>('SETTINGS');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState(ISSUE_CATEGORIES[0].id);
  const [reportDetails, setReportDetails] = useState('');
  const [sentIssueId, setSentIssueId] = useState<string | null>(null);
  const [supportNotice, setSupportNotice] = useState<string | null>(null);
  const [supportDeviceId] = useState(getSupportDeviceId);
  const [authStatus, setAuthStatus] = useState(getFirebaseAuthStatus);
  const [pushStatus, setPushStatus] = useState(getFirebasePushStatus);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const language = getPlayerLanguage(player);
  const selectedLanguageOption = SUPPORTED_LANGUAGES.find(option => option.id === language);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const smoothModeEnabled = player.settings?.smoothMode === true;
  const firebaseAuthUserId = authStatus.userId;
  const playerIdForSupport = player.id && player.id !== 'player' ? player.id : supportDeviceId;
  const shortPlayerId = playerIdForSupport.slice(-8).toUpperCase();
  const shortAuthId = firebaseAuthUserId ? firebaseAuthUserId.slice(-8).toUpperCase() : null;
  const authSetupPending = authStatus.state === 'failed'
    && Boolean(authStatus.error?.includes('CONFIGURATION_NOT_FOUND') || authStatus.error?.includes('OPERATION_NOT_ALLOWED'));
  const supportIdentityLabel = authStatus.state === 'ready' && firebaseAuthUserId
    ? tr('settings.supportIdentity.linked')
    : authStatus.state === 'starting'
      ? tr('settings.supportIdentity.settingUp')
      : authStatus.state === 'web_skipped'
        ? tr('settings.supportIdentity.deviceOnly')
        : authStatus.state === 'failed'
          ? tr('settings.supportIdentity.local')
          : tr('settings.supportIdentity.local');
  const supportIdentitySubtext = authStatus.state === 'ready' && shortAuthId
    ? tr('settings.supportIdentity.firebaseId', { id: shortAuthId })
    : authStatus.state === 'starting'
      ? tr('settings.supportIdentity.anonymousStarting')
      : authStatus.state === 'web_skipped'
        ? tr('settings.supportIdentity.nativeStarts')
        : tr('settings.supportIdentity.playerId', { id: shortPlayerId });
  const lastIssueReportId = typeof player.flags?.lastIssueReportId === 'string' ? player.flags.lastIssueReportId : null;
  const enabledPackIds = Array.isArray(player.flags?.enabledGlobalActorPacks)
    ? player.flags.enabledGlobalActorPacks as string[]
    : [];
  const selectedIssueCategory = ISSUE_CATEGORIES.find(category => category.id === reportCategory) || ISSUE_CATEGORIES[0];
  const selectedIssueCategoryLabel = tr(selectedIssueCategory.labelKey);
  const pushStatusLabel = pushStatus.state === 'ready'
    ? tr('settings.push.on')
    : pushStatus.state === 'denied'
      ? tr('settings.push.blocked')
      : pushStatus.state === 'prompting'
        ? tr('settings.push.asking')
        : pushStatus.state === 'web_skipped'
          ? tr('settings.push.native')
          : tr('settings.push.off');
  const pushStatusSubtext = pushStatus.state === 'ready'
    ? tr('settings.push.readySub')
    : pushStatus.state === 'denied'
      ? tr('settings.push.deniedSub')
      : pushStatus.state === 'failed'
        ? tr('settings.push.failedSub')
        : pushStatus.state === 'web_skipped'
          ? tr('settings.push.nativeSub')
          : tr('settings.push.offSub');

  useEffect(() => {
    return onFirebaseAuthStatusChanged(setAuthStatus);
  }, []);

  useEffect(() => {
    return onFirebasePushStatusChanged(setPushStatus);
  }, []);

  useEffect(() => {
    if (pushStatus.state === 'ready' && supportNotice?.startsWith('Notification setup')) {
      setSupportNotice(tr('settings.support.notice.notificationsEnabled'));
    }
  }, [pushStatus.state, supportNotice]);

  useEffect(() => {
    trackGameEvent('settings_viewed', {
      auth_mode: firebaseAuthUserId ? 'anonymous' : 'local_guest',
      has_auth_uid: Boolean(firebaseAuthUserId),
      auth_state: authStatus.state,
      enabled_actor_packs: enabledPackIds.length,
    });
    addBreadcrumb('Settings viewed', {
      auth_mode: firebaseAuthUserId ? 'anonymous' : 'local_guest',
      auth_state: authStatus.state,
      player_id: shortPlayerId,
    });
  }, []);

  useEffect(() => {
    if (mode !== 'SUPPORT') return;
    trackGameEvent('settings_auth_status_seen', {
      auth_state: authStatus.state,
      has_auth_uid: Boolean(firebaseAuthUserId),
      source: 'settings_support',
    });
    addBreadcrumb('Support identity status seen', {
      auth_state: authStatus.state,
      has_auth_uid: Boolean(firebaseAuthUserId),
    });
  }, [mode, authStatus.state, firebaseAuthUserId]);

  useEffect(() => {
    if (!isReportOpen || typeof document === 'undefined') return;
    markTraceAction('issue_report_opened', {
      last_screen: 'Settings',
      flow: 'in_app_support',
      save_slot: player.flags?.lastLoadedSlot || '',
    });
    addBreadcrumb('Issue report opened', {
      category: reportCategory,
      age: player.age,
      week: player.currentWeek,
    });

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [isReportOpen]);

  const handleToggleSmoothMode = () => {
    onUpdatePlayer(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        smoothMode: prev.settings?.smoothMode !== true,
      },
    }));
  };

  const handleChangeLanguage = (nextLanguage: GameLanguage) => {
    if (nextLanguage === language) return;
    onUpdatePlayer(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: nextLanguage,
      },
    }));
  };

  const getLanguageCoverageLabel = (optionId: GameLanguage, isSelected: boolean) => {
    if (isSelected) return tr('settings.defaultLanguage');
    return optionId === 'en' ? tr('settings.languageSource') : tr('settings.languageInterface');
  };

  const getLanguageCoverageSubtext = (optionId: GameLanguage) => (
    optionId === 'en' ? tr('settings.languageSourceSub') : tr('settings.languageInterfaceSub')
  );

  const handleSubmitIssueReport = () => {
    markTraceAction('issue_report_send_tapped', {
      last_screen: 'Settings',
      flow: 'in_app_support',
      save_slot: player.flags?.lastLoadedSlot || '',
    });
    const issueId = submitPlayerIssueReport(player, {
      category: reportCategory,
      details: reportDetails,
      currentPage: 'SETTINGS',
      currentScreen: 'Settings',
      extra: {
        report_source: 'settings',
        device_platform: Capacitor.getPlatform(),
      },
    });

    setSentIssueId(issueId);
    setReportDetails('');
    onUpdatePlayer(prev => ({
      ...prev,
      flags: {
        ...prev.flags,
        lastIssueReportId: issueId,
        lastIssueReportCategory: reportCategory,
      },
      logs: [
        {
          week: prev.currentWeek,
          year: prev.age,
          message: tr('settings.support.issueReportLog', { id: issueId }),
          type: 'neutral'
        },
        ...prev.logs
      ].slice(0, 50)
    }));
  };

  const handleCopyPlayerId = async () => {
    trackGameEvent('debug_id_copy_tapped', {
      source: 'settings_support',
      has_auth_uid: Boolean(firebaseAuthUserId),
    });
    const debugId = `Player:${playerIdForSupport}${firebaseAuthUserId ? ` | Firebase:${firebaseAuthUserId}` : ''}`;
    const visibleDebugId = firebaseAuthUserId
      ? `Player ${shortPlayerId} · Firebase ${shortAuthId}`
      : `Player ${shortPlayerId}`;
    try {
      await navigator.clipboard?.writeText(debugId);
      setSupportNotice(tr('settings.support.notice.debugCopied'));
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = debugId;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setSupportNotice(tr('settings.support.notice.debugCopied'));
      } catch {
        setSupportNotice(tr('settings.support.notice.debugId', { id: visibleDebugId }));
      }
    }
  };

  const handleEnablePush = async () => {
    if (isEnablingPush) return;
    setIsEnablingPush(true);
    setSupportNotice(null);
    const status = await enableManualPushNotifications();
    setIsEnablingPush(false);

    if (status.state === 'ready') {
      setSupportNotice(tr('settings.support.notice.notificationsEnabled'));
    } else if (status.state === 'denied') {
      setSupportNotice(tr('settings.support.notice.notificationsBlocked'));
    } else if (status.state === 'checking') {
      setSupportNotice(tr('settings.support.notice.notificationsChecking'));
    } else if (status.state === 'web_skipped') {
      setSupportNotice(tr('settings.support.notice.notificationsNative'));
    } else {
      setSupportNotice(status.error ? tr('settings.support.notice.notificationsFailedWithError', { error: status.error }) : tr('settings.support.notice.notificationsFailed'));
    }
  };

  const handleEmailReportAttachment = () => {
    if (!sentIssueId) return;
    trackGameEvent('issue_report_email_attachment_tapped', {
      issue_id: sentIssueId,
      category: reportCategory,
      has_auth_uid: Boolean(firebaseAuthUserId),
    });
    addBreadcrumb('Issue report email attachment tapped', {
      issue_id: sentIssueId,
      category: reportCategory,
    });

    const subject = tr('settings.support.emailSubject', { category: selectedIssueCategoryLabel, id: sentIssueId });
    const body = [
      tr('settings.support.emailAttachPrompt'),
      '',
      tr('settings.support.emailReportId', { id: sentIssueId }),
      tr('settings.support.emailIssueCategory', { category: selectedIssueCategoryLabel }),
      tr('settings.support.emailPlayerId', { id: playerIdForSupport }),
      tr('settings.support.emailFirebaseUid', { id: firebaseAuthUserId || tr('settings.support.notReady') }),
      tr('settings.support.emailAppVersion', { version: APP_DISPLAY_VERSION }),
      tr('settings.support.emailPlatform', { platform: Capacitor.getPlatform() }),
      tr('settings.support.emailAgeWeek', { age: player.age, week: player.currentWeek }),
      tr('settings.support.emailSaveSlot', { slot: player.flags?.lastLoadedSlot || tr('settings.support.unknown') }),
      '',
      tr('settings.support.emailExtraNotes'),
    ].join('\n');

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const renderSubpageHeader = (eyebrow: string, title: string, backTarget: SettingsMode = 'SETTINGS') => (
    <div className="flex items-center gap-4">
      <button onClick={() => setMode(backTarget)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} className="text-white"/>
      </button>
      <div>
        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.28em]">{eyebrow}</div>
        <h2 className="text-3xl font-bold text-white">{title}</h2>
      </div>
    </div>
  );

  const SettingsRow = ({
    icon: Icon,
    title,
    subtitle,
    value,
    onClick,
    tone = 'neutral',
  }: {
    icon: SettingsIcon;
    title: string;
    subtitle: string;
    value?: string;
    onClick: () => void;
    tone?: 'neutral' | 'performance' | 'support' | 'community' | 'danger';
  }) => {
    const tones = {
      neutral: 'bg-zinc-800 text-zinc-300',
      performance: 'bg-sky-500/15 text-sky-300',
      support: 'bg-rose-500/15 text-rose-300',
      community: 'bg-blue-500/15 text-blue-300',
      danger: 'bg-rose-500/10 text-rose-300',
    };

    return (
      <button
        onClick={onClick}
        className="w-full rounded-2xl border border-white/5 bg-zinc-900/55 px-4 py-4 text-left hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
            <Icon size={21}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white">{title}</div>
            <div className="text-xs text-zinc-500 mt-1 truncate">{subtitle}</div>
          </div>
          {value && <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-zinc-500">{value}</div>}
          <ChevronRight size={18} className="text-zinc-600 shrink-0"/>
        </div>
      </button>
    );
  };

  const enableActorPack = (packId: string) => {
    if (enabledPackIds.includes(packId)) return;

    onUpdatePlayer(prev => {
      const currentPackIds = Array.isArray(prev.flags?.enabledGlobalActorPacks)
        ? prev.flags.enabledGlobalActorPacks as string[]
        : [];
      if (currentPackIds.includes(packId)) return prev;

      const packNPCs = createGlobalActorPackNPCs(packId);
      const pack = GLOBAL_ACTOR_PACKS.find(entry => entry.id === packId);
      const packLabel = pack ? getGlobalActorPackLabel(pack, language) : t(language, 'services.npc.globalActorPack.label', { country: 'Global' });
      const existingExtraNPCs = Array.isArray(prev.flags?.extraNPCs) ? prev.flags.extraNPCs : [];
      const existingIds = new Set([
        ...existingExtraNPCs.map((npc: any) => npc.id),
        ...existingExtraNPCs.map((npc: any) => npc.name)
      ]);
      const newNPCs = packNPCs.filter(npc => !existingIds.has(npc.id) && !existingIds.has(npc.name));

      return {
        ...prev,
        flags: {
          ...prev.flags,
          enabledGlobalActorPacks: [...currentPackIds, packId],
          extraNPCs: [...existingExtraNPCs, ...newNPCs],
          modHistory: [
            ...(Array.isArray(prev.flags?.modHistory) ? prev.flags.modHistory : []),
            {
              id: `mod_${packId}_${Date.now()}`,
              type: 'GLOBAL_ACTOR_PACK',
              packId,
              enabledAtAge: prev.age,
              enabledAtWeek: prev.currentWeek
            }
          ]
        },
        logs: [
          {
            week: prev.currentWeek,
            year: prev.age,
            message: t(language, 'settings.globalActorPack.enabledLog', { packLabel }),
            type: 'positive'
          },
          ...prev.logs
        ].slice(0, 50)
      };
    });
  };

  if (mode === 'PERFORMANCE') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        {renderSubpageHeader(tr('settings.display'), tr('settings.performance'))}

        <div className="glass-card p-5 rounded-3xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{tr('settings.visualMode')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {tr('settings.visualModeSub')}
              </p>
            </div>
            <div className={`shrink-0 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${smoothModeEnabled ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-zinc-900 text-zinc-400 border border-white/10'}`}>
              {tr(smoothModeEnabled ? 'settings.smooth' : 'settings.full')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSmoothMode}
            className={`w-full rounded-3xl border p-4 text-left transition-all ${smoothModeEnabled ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-800'}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${smoothModeEnabled ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
                  <Gauge size={22} />
                </div>
                <div>
                  <div className="font-black text-white">{tr('settings.smoothMode')}</div>
                  <div className="mt-1 text-xs leading-relaxed text-zinc-500">{tr('settings.smoothModeSub')}</div>
                </div>
              </div>
              <div className={`h-8 w-14 rounded-full p-1 transition-colors ${smoothModeEnabled ? 'bg-emerald-400' : 'bg-zinc-800'}`}>
                <div className={`h-6 w-6 rounded-full bg-white transition-transform ${smoothModeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'GAMEPLAY') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        {renderSubpageHeader(tr('settings.careerRules'), tr('settings.gameplay'))}

        <div className="space-y-3">
          <button
            onClick={() => setMode('LANGUAGE')}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/55 rounded-2xl hover:bg-zinc-800/80 transition-colors border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg text-zinc-300"><Globe size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{tr('settings.language')}</div>
                <div className="text-xs text-zinc-400">{selectedLanguageOption ? `${selectedLanguageOption.flagEmoji} ${selectedLanguageOption.nativeLabel}` : language}</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-500"/>
          </button>
          <button
            onClick={() => setMode('MODS')}
            className="w-full flex items-center justify-between p-4 bg-amber-500/10 rounded-2xl hover:bg-amber-500/15 transition-colors border border-amber-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-black"><Puzzle size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{tr('settings.modPacks')}</div>
                <div className="text-xs text-zinc-400">{tr('settings.activePacks', { count: enabledPackIds.length })}</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-500"/>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'LANGUAGE') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        {renderSubpageHeader(tr('settings.languageMenu'), tr('settings.language'), 'GAMEPLAY')}

        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300">
              <Globe size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white">{tr('settings.languageChooseTitle')}</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{tr('settings.languagePhaseNote')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {SUPPORTED_LANGUAGES.map(option => {
            const isSelected = option.id === language;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleChangeLanguage(option.id)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${isSelected ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-white/5 bg-zinc-900/55 hover:bg-zinc-800/80'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-3xl shadow-inner ${isSelected ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-white/10 bg-black/20'}`}
                      aria-hidden="true"
                    >
                      {option.flagEmoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-black leading-tight text-white">{option.nativeLabel}</div>
                      <div className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-zinc-500">{option.label}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${isSelected ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/20 text-zinc-400'}`}>
                          {getLanguageCoverageLabel(option.id, isSelected)}
                        </span>
                        <span className="text-xs leading-snug text-zinc-400">{getLanguageCoverageSubtext(option.id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-black/20 text-zinc-600'}`}>
                    {isSelected && <CheckCircle2 size={17} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'SUPPORT') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        {renderSubpageHeader(tr('settings.help'), tr('settings.support'))}

        <div className="glass-card p-5 rounded-3xl space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Database size={16}/>
                <span className="text-[10px] font-black uppercase tracking-widest">{tr('settings.support.save')}</span>
              </div>
              <div className="mt-3 font-black text-white">{tr('settings.support.onDevice')}</div>
              <div className="mt-1 text-xs text-zinc-500">{tr('settings.support.playerShortId', { id: shortPlayerId })}</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={16}/>
                <span className="text-[10px] font-black uppercase tracking-widest">{tr('settings.support.supportId')}</span>
              </div>
              <div className="mt-3 font-black text-white">{supportIdentityLabel}</div>
              <div className="mt-1 text-xs text-zinc-500">{supportIdentitySubtext}</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Smartphone size={16}/>
                <span className="text-[10px] font-black uppercase tracking-widest">{tr('settings.support.build')}</span>
              </div>
              <div className="mt-3 font-black text-white">v{APP_DISPLAY_VERSION}</div>
              <div className="mt-1 text-xs text-zinc-500">{Capacitor.getPlatform()}</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Bug size={16}/>
                <span className="text-[10px] font-black uppercase tracking-widest">{tr('settings.support.reports')}</span>
              </div>
              <div className="mt-3 font-black text-white">{tr('settings.support.ready')}</div>
              <div className="mt-1 text-xs text-zinc-500">{tr('settings.support.crashesContext')}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-100">
            {tr('settings.support.localProgressNote')}
          </div>

          {supportNotice && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200">
              {supportNotice}
            </div>
          )}

          {authSetupPending && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-100">
              {tr('settings.support.identityPending')}
            </div>
          )}

          {authStatus.state === 'failed' && authStatus.error && !authSetupPending && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-100">
              {tr('settings.support.identityFailed')}
            </div>
          )}

          {lastIssueReportId && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
              <span className="font-black uppercase tracking-widest text-rose-300">{tr('settings.support.lastReport')}</span>
              <span className="ml-2 font-mono">{lastIssueReportId}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleEnablePush}
            disabled={isEnablingPush || pushStatus.state === 'ready'}
            className="w-full flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl hover:bg-emerald-500/15 transition-colors border border-emerald-500/20 disabled:opacity-80 disabled:hover:bg-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-300"><Bell size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{pushStatus.state === 'ready' ? tr('settings.push.notificationsEnabled') : tr('settings.push.enableUpdates')}</div>
                <div className="text-xs text-zinc-400">{isEnablingPush ? tr('settings.push.openingPrompt') : pushStatusSubtext}</div>
              </div>
            </div>
            <div className="text-[10px] bg-emerald-500/15 px-2 py-1 rounded text-emerald-300 font-bold uppercase">{pushStatusLabel}</div>
          </button>

          <button
            onClick={() => {
              setSentIssueId(null);
              setIsReportOpen(true);
            }}
            className="w-full flex items-center justify-between p-4 bg-rose-500/10 rounded-2xl hover:bg-rose-500/15 transition-colors border border-rose-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 rounded-lg text-white"><Bug size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{tr('settings.support.reportIssue')}</div>
                <div className="text-xs text-zinc-400">{tr('settings.support.reportIssueSub')}</div>
              </div>
            </div>
            <div className="text-[10px] bg-rose-500/15 px-2 py-1 rounded text-rose-300 font-bold uppercase">Firebase</div>
          </button>

          <button onClick={handleCopyPlayerId} className="w-full flex items-center justify-between p-4 bg-zinc-900/55 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg text-zinc-300"><Copy size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{tr('settings.support.copyDebugId')}</div>
                <div className="text-xs text-zinc-500">{tr('settings.support.copyDebugIdSub')}</div>
              </div>
            </div>
          </button>

        </div>

        {isReportOpen && (
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] overscroll-none">
            <div
              className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl"
              onWheel={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-300">{tr('settings.support.bugHunter')}</div>
                  <h3 className="text-2xl font-black text-white mt-1">{tr('settings.support.reportIssue')}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{tr('settings.support.reportModalSub')}</p>
                </div>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="w-11 h-11 rounded-2xl bg-zinc-900 text-zinc-400 flex items-center justify-center hover:bg-zinc-800"
                >
                  <ArrowLeft size={18}/>
                </button>
              </div>

              <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+8rem)] space-y-5">
                {sentIssueId ? (
                  <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center">
                        <ShieldCheck size={22}/>
                      </div>
                      <div>
                        <div className="font-black text-white">{tr('settings.support.reportSent')}</div>
                        <div className="text-xs text-emerald-200 font-mono mt-1">{sentIssueId}</div>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-4">
                      {tr('settings.support.reportSentSub')}
                    </p>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{tr('settings.support.screenshotsVideo')}</div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        {tr('settings.support.screenshotsVideoSub')}
                      </p>
                      <button
                        onClick={handleEmailReportAttachment}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-zinc-900 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-800"
                      >
                        {tr('settings.support.emailScreenshot')}
                      </button>
                    </div>
                    <button
                      onClick={() => setIsReportOpen(false)}
                      className="mt-4 w-full rounded-2xl bg-white text-black py-4 font-black uppercase tracking-widest"
                    >
                      {tr('common.close')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {ISSUE_CATEGORIES.map(category => {
                        const isActive = reportCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            onClick={() => setReportCategory(category.id)}
                            className={`rounded-2xl border p-3 text-left transition-all ${isActive ? 'border-rose-400 bg-rose-500/15' : 'border-white/5 bg-zinc-900/70 hover:bg-zinc-900'}`}
                          >
                            <div className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-rose-200' : 'text-zinc-300'}`}>
                              {tr(category.labelKey)}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1 leading-snug">{tr(category.hintKey)}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{tr('settings.support.whatHappened')}</label>
                      <textarea
                        value={reportDetails}
                        onChange={(event) => setReportDetails(event.target.value)}
                        maxLength={500}
                        placeholder={tr('settings.support.reportPlaceholder')}
                        className="mt-2 w-full min-h-32 rounded-3xl border border-white/10 bg-black p-4 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-rose-400 resize-none"
                      />
                      <div className="text-right text-[10px] text-zinc-600 mt-1">{reportDetails.length}/500</div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-zinc-900/70 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{tr('settings.support.autoAttached')}</div>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                        <div>
                          <div className="text-zinc-500 uppercase font-black">{tr('settings.support.version')}</div>
                          <div className="text-white font-mono mt-1">{APP_DISPLAY_VERSION}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 uppercase font-black">{tr('settings.support.platform')}</div>
                          <div className="text-white font-mono mt-1">{Capacitor.getPlatform()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 uppercase font-black">{tr('settings.support.ageWeek')}</div>
                          <div className="text-white font-mono mt-1">{player.age} / {player.currentWeek}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 uppercase font-black">{tr('settings.support.pending')}</div>
                          <div className="text-white font-mono mt-1">{tr('settings.support.pendingEvents', { count: player.pendingEvents?.length || 0 })}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitIssueReport}
                      className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 text-white py-4 font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                    >
                      {tr('settings.support.sendReport')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'COMMUNITY') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        {renderSubpageHeader('Links', 'Community')}

        <div className="space-y-3">
          <a href="https://x.com/ActorEmpire" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-zinc-900/55 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-lg text-white"><Twitter size={20}/></div>
              <div>
                <div className="font-bold text-white">{tr('settings.followX')}</div>
                <div className="text-xs text-zinc-500">@ActorEmpire</div>
              </div>
            </div>
          </a>

          <a href="https://t.me/actorempire" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-zinc-900/55 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white"><Send size={20}/></div>
              <div>
                <div className="font-bold text-white">{tr('settings.joinTelegram')}</div>
                <div className="text-xs text-zinc-500">{tr('settings.telegramSub')}</div>
              </div>
            </div>
          </a>

          <a href="https://apps.apple.com/us/app/actor-empire/id6757667257" target="_blank" rel="noreferrer" className="w-full flex items-center justify-between p-4 bg-zinc-900/55 rounded-2xl hover:bg-zinc-800 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-black"><Star size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-white">{tr('settings.rateUs')}</div>
                <div className="text-xs text-zinc-500">{tr('settings.rateUsSub')}</div>
              </div>
            </div>
          </a>

          <a href="https://buymeacoffee.com/actorempire" target="_blank" rel="noreferrer" className="w-full flex items-center justify-between p-4 bg-[#FFDD00] rounded-2xl hover:opacity-90 transition-all border border-black/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-lg text-[#FFDD00]"><Coffee size={20}/></div>
              <div className="text-left">
                <div className="font-bold text-black">{tr('settings.supportDev')}</div>
                <div className="text-xs text-black/60">{tr('settings.buyCoffee')}</div>
              </div>
            </div>
          </a>
        </div>
      </div>
    );
  }

  if (mode === 'MODS') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('GAMEPLAY')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-white"/>
          </button>
          <div>
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-[0.28em]">{tr('settings.optionalContent')}</div>
            <h2 className="text-3xl font-bold text-white">{tr('settings.mods')}</h2>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setMode('EXTERNAL_ACTORS')}
            className="w-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-left hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shrink-0">
                <Users size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white">{tr('settings.externalTalent')}</div>
                <div className="text-xs text-zinc-400 mt-1">{tr('settings.externalTalentSub')}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-500/15 px-2 py-1 rounded text-amber-300 font-bold uppercase">{enabledPackIds.length} {tr('common.active')}</span>
                <ChevronRight size={18} className="text-zinc-500"/>
              </div>
            </div>
          </button>

          <div className="w-full rounded-3xl border border-white/5 bg-zinc-900/40 p-5 opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                <Sparkles size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-zinc-300">{tr('settings.creatorPacks')}</div>
                <div className="text-xs text-zinc-500 mt-1">{tr('settings.creatorPacksSub')}</div>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-bold uppercase">{tr('common.later')}</span>
            </div>
          </div>

          <div className="w-full rounded-3xl border border-white/5 bg-zinc-900/40 p-5 opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                <SlidersHorizontal size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-zinc-300">{tr('settings.gameplayRules')}</div>
                <div className="text-xs text-zinc-500 mt-1">{tr('settings.gameplayRulesSub')}</div>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-bold uppercase">{tr('common.later')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'EXTERNAL_ACTORS') {
    return (
      <div className="space-y-5 pb-24 pt-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('MODS')} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} className="text-white"/>
          </button>
          <div>
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-[0.28em]">{tr('settings.mods')}</div>
            <h2 className="text-3xl font-bold text-white">{tr('settings.externalTalent')}</h2>
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-amber-500 text-black"><Lock size={18}/></div>
            <div>
              <div className="font-black text-white">{tr('settings.saveLockedPacks')}</div>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                {tr('settings.saveLockedPacksSub')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">{tr('settings.availableCountryPacks')}</h3>
          {GLOBAL_ACTOR_PACKS.map(pack => {
            const isEnabled = enabledPackIds.includes(pack.id);
            const creatorCount = getGlobalCreatorCountForPack(pack.id);
            return (
              <div key={pack.id} className={`rounded-3xl border p-4 transition-all ${isEnabled ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-zinc-900/50 border-white/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isEnabled ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-amber-400'}`}>
                    {isEnabled ? <CheckCircle2 size={20}/> : <Users size={20}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-white truncate">{getGlobalActorPackLabel(pack, language)}</div>
                      <div className="text-[10px] text-zinc-400 font-black uppercase whitespace-nowrap">
                        {pack.actorCount} talent · {creatorCount} creators
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      {getGlobalActorPackDescription(pack, language)}
                    </p>
                    <button
                      onClick={() => enableActorPack(pack.id)}
                      disabled={isEnabled}
                      className={`mt-3 w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEnabled ? 'bg-emerald-500/15 text-emerald-300 cursor-default' : 'bg-white text-black hover:bg-amber-300'}`}
                    >
                      {isEnabled ? tr('settings.enabledForSave') : tr('settings.enablePack')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 pt-4">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} className="text-white"/>
        </button>
        <div>
          <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.28em]">{tr('settings.controlCenter')}</div>
          <h2 className="text-3xl font-bold text-white">{tr('settings.title')}</h2>
        </div>
      </div>

      <div className="glass-card p-3 rounded-3xl space-y-2">
        <SettingsRow
          icon={Gauge}
          title={tr('settings.performance')}
          subtitle={tr(smoothModeEnabled ? 'settings.performanceSubSmooth' : 'settings.performanceSubFull')}
          value={tr(smoothModeEnabled ? 'settings.smooth' : 'settings.full')}
          tone="performance"
          onClick={() => setMode('PERFORMANCE')}
        />
        <SettingsRow
          icon={Puzzle}
          title={tr('settings.gameplay')}
          subtitle={tr('settings.gameplaySub', { count: enabledPackIds.length })}
          value={tr('settings.activeShort', { count: enabledPackIds.length })}
          onClick={() => setMode('GAMEPLAY')}
        />
        <SettingsRow
          icon={LifeBuoy}
          title={tr('settings.support')}
          subtitle={tr('settings.supportSub')}
          value={`v${APP_DISPLAY_VERSION}`}
          tone="support"
          onClick={() => setMode('SUPPORT')}
        />
        <SettingsRow
          icon={MessageCircle}
          title={tr('settings.community')}
          subtitle={tr('settings.communitySub')}
          tone="community"
          onClick={() => setMode('COMMUNITY')}
        />
      </div>

      <button
        onClick={onMainMenu}
        className="w-full flex items-center justify-between p-4 bg-zinc-900/45 rounded-2xl hover:bg-rose-900/20 hover:border-rose-900/50 transition-all border border-white/5 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-rose-500 group-hover:bg-rose-500/10 transition-colors"><LogOut size={20}/></div>
          <div className="text-left">
            <div className="font-bold text-white">{tr('settings.mainMenu')}</div>
            <div className="text-xs text-zinc-500">{tr('settings.mainMenuSub')}</div>
          </div>
        </div>
      </button>

      <div className="text-center text-xs text-zinc-600 font-mono mt-8">
        v{APP_DISPLAY_VERSION}
      </div>
    </div>
  );
};
