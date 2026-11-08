import { GameLanguage, Player } from '../types';
import { enTranslations } from './localization/locales/en';
import { ptBRTranslations } from './localization/locales/pt-BR';
import { frTranslations } from './localization/locales/fr';
import { esTranslations } from './localization/locales/es';
import { trTranslations } from './localization/locales/tr';
import { deTranslations } from './localization/locales/de';

type TranslationVars = Record<string, string | number>;
export type TranslationKey = string;

export type GameLanguageStatus = 'AVAILABLE' | 'IN_PROGRESS';

export const SUPPORTED_LANGUAGES: Array<{
    id: GameLanguage;
    flagEmoji: string;
    flagCode: string;
    label: string;
    nativeLabel: string;
    status: GameLanguageStatus;
    coverageLabel: string;
    coverageSubtext: string;
}> = [
    {
        id: 'en',
        flagEmoji: '🇺🇸',
        flagCode: 'US',
        label: 'English',
        nativeLabel: 'English',
        status: 'AVAILABLE',
        coverageLabel: 'Source',
        coverageSubtext: 'Original text and fallback.'
    },
    {
        id: 'pt-BR',
        flagEmoji: '🇧🇷',
        flagCode: 'BR',
        label: 'Portuguese (Brazil)',
        nativeLabel: 'Português (Brasil)',
        status: 'IN_PROGRESS',
        coverageLabel: 'Interface',
        coverageSubtext: 'Menus translated. Story text in progress.'
    },
    {
        id: 'fr',
        flagEmoji: '🇫🇷',
        flagCode: 'FR',
        label: 'French',
        nativeLabel: 'Français',
        status: 'IN_PROGRESS',
        coverageLabel: 'Draft',
        coverageSubtext: 'Selectable draft. Translation polish in progress.'
    },
    {
        id: 'es',
        flagEmoji: '🇪🇸',
        flagCode: 'ES',
        label: 'Spanish',
        nativeLabel: 'Español',
        status: 'IN_PROGRESS',
        coverageLabel: 'Draft',
        coverageSubtext: 'Selectable draft. Translation polish in progress.'
    },
    {
        id: 'tr',
        flagEmoji: '🇹🇷',
        flagCode: 'TR',
        label: 'Turkish',
        nativeLabel: 'Türkçe',
        status: 'IN_PROGRESS',
        coverageLabel: 'Beta',
        coverageSubtext: 'Selectable beta. Translation polish in progress.'
    },
    {
        id: 'de',
        flagEmoji: '🇩🇪',
        flagCode: 'DE',
        label: 'German',
        nativeLabel: 'Deutsch',
        status: 'IN_PROGRESS',
        coverageLabel: 'Beta',
        coverageSubtext: 'Selectable beta. Translation polish in progress.'
    }
];

const SUPPORTED_LANGUAGE_IDS = new Set<GameLanguage>(SUPPORTED_LANGUAGES.map(language => language.id));

export const isSupportedGameLanguage = (language: unknown): language is GameLanguage => {
    return typeof language === 'string' && SUPPORTED_LANGUAGE_IDS.has(language as GameLanguage);
};

const translations: Record<GameLanguage, Record<TranslationKey, string>> = {
    en: enTranslations,
    'pt-BR': ptBRTranslations,
    fr: frTranslations,
    es: esTranslations,
    tr: trTranslations,
    de: deTranslations
};

/** How much of a language is really translated: the share of English lines whose text differs in that language.
 *  Untranslated lines hold the English text, so a thin translation reads as mostly English. */
const AUTO_LANGUAGE_MIN_TRANSLATED = 0.8;
const translatedShareCache = new Map<GameLanguage, number>();
export const getTranslatedShare = (language: GameLanguage): number => {
    if (language === 'en') return 1;
    const cached = translatedShareCache.get(language);
    if (cached !== undefined) return cached;
    const english = translations.en;
    const local = translations[language] || {};
    let lines = 0;
    let translated = 0;
    for (const key of Object.keys(english)) {
        const source = english[key];
        if (typeof source !== 'string' || !/[A-Za-z]{3}/.test(source)) continue;
        lines += 1;
        const value = local[key];
        if (typeof value === 'string' && value !== source) translated += 1;
    }
    const share = lines > 0 ? translated / lines : 0;
    translatedShareCache.set(language, share);
    return share;
};

/** AE-024: a new career speaks the phone's language when the game really has it, else English. "Has it" means at least
 *  80% of its lines are translated (on 2026-11-08: Portuguese 95%; French 42%, Spanish 11%, German and Turkish 8%), so
 *  a thin translation never gives a mostly-English mix, and a language joins by itself once it is translated. The
 *  phone's preference order decides: English first means English. iOS reports the phone's language to the game only for
 *  languages listed in Info.plist (CFBundleLocalizations). Players can still pick any language in Settings. */
export const detectDeviceGameLanguage = (): GameLanguage => {
    if (typeof navigator === 'undefined') return 'en';
    const preferred = [...(Array.isArray(navigator.languages) ? navigator.languages : []), navigator.language]
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
    for (const tag of preferred) {
        const base = tag.toLowerCase().split(/[-_]/)[0];
        if (base === 'en') return 'en';
        const candidate: GameLanguage | null = base === 'pt' ? 'pt-BR'
            : base === 'es' || base === 'fr' || base === 'de' || base === 'tr' ? base
                : null;
        if (candidate && getTranslatedShare(candidate) >= AUTO_LANGUAGE_MIN_TRANSLATED) return candidate;
    }
    return 'en';
};

export const getPlayerLanguage = (player?: Partial<Pick<Player, 'settings'>> | null): GameLanguage => {
    return isSupportedGameLanguage(player?.settings?.language) ? player.settings.language : 'en';
};

export const t = (language: GameLanguage, key: TranslationKey, vars: TranslationVars = {}) => {
    const activeLanguage = isSupportedGameLanguage(language) ? language : 'en';
    const template = translations[activeLanguage]?.[key] || translations.en[key] || key;
    return Object.entries(vars).reduce(
        (text, [name, value]) => text.split('{' + name + '}').join(String(value)),
        template
    );
};
