import {
    BUILTIN_CHARACTER_ALIASES,
    BUILTIN_PERSON_ALIASES,
    BUILTIN_PERSON_IDENTITIES,
    BUILTIN_PROJECT_ALIASES,
} from './fictionalNameCatalog';

export const BUILTIN_NAME_VERSION = 1;
const own = <T>(record: Readonly<Record<string, T>>, name: string): T | undefined =>
    Object.prototype.hasOwnProperty.call(record, name) ? record[name] : undefined;
const key = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const reverse = (entries: Readonly<Record<string, string>>) => new Map(
    Object.entries(entries).flatMap(([canonical, display]) => [[key(canonical), canonical], [key(display), canonical]]),
);
const people = reverse(BUILTIN_PERSON_ALIASES);
const projects = reverse(BUILTIN_PROJECT_ALIASES);
const characters = reverse(BUILTIN_CHARACTER_ALIASES);

export const canonicalPersonName = (name: string) => people.get(key(name)) || name;
export const fictionalPersonName = (name: string) => own(BUILTIN_PERSON_ALIASES, canonicalPersonName(name)) || name;
export const canonicalProjectTitle = (title: string): string => {
    const direct = projects.get(key(title));
    if (direct) return direct;
    const season = title.match(/^(.*?)(:\s*Season\s+\d+|\s+\(Series\))$/i);
    return season ? canonicalProjectTitle(season[1]) + season[2] : title;
};
export const fictionalProjectTitle = (title: string): string => {
    const canonical = canonicalProjectTitle(title);
    const direct = own(BUILTIN_PROJECT_ALIASES, canonical);
    if (direct) return direct;
    const season = title.match(/^(.*?)(:\s*Season\s+\d+|\s+\(Series\))$/i);
    return season ? fictionalProjectTitle(season[1]) + season[2] : title;
};
export const canonicalCharacterName = (name: string) => characters.get(key(name)) || name;
export const fictionalCharacterName = (name: string) => own(BUILTIN_CHARACTER_ALIASES, canonicalCharacterName(name)) || name;
export const isBuiltinPersonId = (id: unknown): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(BUILTIN_PERSON_IDENTITIES, id);
export const builtinPersonNameForId = (id: string) => fictionalPersonName(own(BUILTIN_PERSON_IDENTITIES, id) || '');
const handleSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const fictionalHandle = (canonicalName: string, oldHandle: string): string => {
    const name = fictionalPersonName(canonicalName);
    if (name === canonicalName) return oldHandle;
    const original = handleSlug(canonicalName);
    const current = handleSlug(oldHandle);
    if (!current.startsWith(original)) return oldHandle;
    const suffix = current.slice(original.length);
    // Only regenerate issued automatic handles; retain custom edits and meaningful name digits.
    if (suffix && !/^\d+$/.test(suffix)) return oldHandle;
    return '@' + handleSlug(name) + suffix;
};

/** Applies only to issued built-ins. External/installed pack IDs and custom edits are preserved. */
export const projectBuiltinPerson = <T extends { id: string; name: string; handle?: string }>(person: T): T => {
    const canonical = own(BUILTIN_PERSON_IDENTITIES, person.id);
    if (!canonical || (person.name !== canonical && person.name !== fictionalPersonName(canonical))) return person;
    const name = fictionalPersonName(canonical);
    const handle = person.handle ? fictionalHandle(canonical, person.handle) : person.handle;
    if (name === person.name && handle === person.handle) return person;
    return { ...person, name, ...(person.handle ? { handle } : {}) };
};

const textPairs: Record<string, string> = {
    ...Object.fromEntries(Object.entries(BUILTIN_PERSON_ALIASES).filter(([name]) => name.includes(' ') || name.length >= 7)),
    ...Object.fromEntries(Object.entries(BUILTIN_PROJECT_ALIASES).filter(([title]) => title.length >= 8)),
    ...BUILTIN_CHARACTER_ALIASES,
};
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const textPattern = new RegExp(
    '(^|[^\\p{L}\\p{N}])(' + Object.keys(textPairs).sort((a, b) => b.length - a.length).map(escape).join('|') + ')(?![\\p{L}\\p{N}])', 'gu',
);
/** Only for built-in narrative templates, never player text or imported pack content. */
export const fictionalBuiltinText = (text: string) => text.replace(textPattern, (_match, prefix: string, name: string) => prefix + (own(textPairs, name) || name));
