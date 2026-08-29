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
