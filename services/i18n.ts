import { GameLanguage, Player } from '../types';
import { enTranslations } from './localization/locales/en';
import { ptBRTranslations } from './localization/locales/pt-BR';

type TranslationVars = Record<string, string | number>;
export type TranslationKey = string;

export type GameLanguageStatus = 'AVAILABLE' | 'IN_PROGRESS';

export const SUPPORTED_LANGUAGES: Array<{
    id: GameLanguage;
    label: string;
    nativeLabel: string;
    status: GameLanguageStatus;
    coverageLabel: string;
    coverageSubtext: string;
}> = [
    {
        id: 'en',
        label: 'English',
        nativeLabel: 'English',
        status: 'AVAILABLE',
        coverageLabel: 'Source language',
        coverageSubtext: 'Source and fallback text.'
    },
    {
        id: 'pt-BR',
        label: 'Portuguese (Brazil)',
        nativeLabel: 'Português (Brasil)',
        status: 'IN_PROGRESS',
        coverageLabel: 'Interface principal traduzida',
        coverageSubtext: 'Menus ativos; histórias em progresso.'
    }
];

const SUPPORTED_LANGUAGE_IDS = new Set<GameLanguage>(SUPPORTED_LANGUAGES.map(language => language.id));

export const isSupportedGameLanguage = (language: unknown): language is GameLanguage => {
    return typeof language === 'string' && SUPPORTED_LANGUAGE_IDS.has(language as GameLanguage);
};

const translations: Record<GameLanguage, Record<TranslationKey, string>> = {
    en: enTranslations,
    'pt-BR': ptBRTranslations
};

export const getPlayerLanguage = (player?: Pick<Player, 'settings'> | null): GameLanguage => {
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
